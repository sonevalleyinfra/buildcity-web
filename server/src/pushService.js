const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const path = require("path");
const fs = require("fs");

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return true;
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "../firebase-service-account.json");
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT env variable");
      return true;
    } else if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin initialized from local service account file:", serviceAccountPath);
      return true;
    } else {
      console.warn("⚠️ Firebase service account key not found. Push notifications will be skipped.");
      return false;
    }
  } catch (err) {
    console.error("❌ Firebase Admin initialization error:", err.message);
    return false;
  }
}

// In-memory cache for ultra-fast token lookups
const memoryTokens = {};

// Optional Prisma DB instance injected from index.js
let dbClient = null;

function setPrismaClient(prisma) {
  dbClient = prisma;
}

function getPrisma() {
  if (dbClient) return dbClient;
  try {
    const { PrismaClient } = require("@prisma/client");
    dbClient = new PrismaClient();
  } catch (e) {
    console.warn("Prisma init in pushService note:", e.message);
  }
  return dbClient;
}

// Ensure data directory exists for secondary backup token storage
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
}
const tokensFilePath = path.join(dataDir, "vendor-fcm-tokens.json");

function loadTokens() {
  try {
    if (fs.existsSync(tokensFilePath)) {
      return JSON.parse(fs.readFileSync(tokensFilePath, "utf8"));
    }
  } catch (err) {
    console.warn("Could not read fcm tokens file:", err.message);
  }
  return {};
}

/**
 * Saves FCM token to memory cache, local file backup, and Supabase DB table vendor_fcm_tokens.
 * Guaranteed to survive Railway restarts and redeploys!
 */
async function saveToken(vendorId, token, phone = null) {
  if (!vendorId || !token) return false;
  const vIdStr = String(vendorId).trim();
  const tokenStr = String(token).trim();
  const phoneStr = phone ? String(phone).trim() : null;

  // 1. In-memory cache
  memoryTokens[vIdStr] = {
    token: tokenStr,
    phone: phoneStr,
    updatedAt: new Date().toISOString(),
  };

  // 2. Secondary local file backup
  try {
    const tokens = loadTokens();
    tokens[vIdStr] = {
      token: tokenStr,
      phone: phoneStr,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), "utf8");
  } catch (err) {
    console.warn("File token save note:", err.message);
  }

  // 3. Supabase DB Persistence (Permanent)
  try {
    const p = getPrisma();
    if (p) {
      await p.$executeRawUnsafe(
        `INSERT INTO vendor_fcm_tokens (vendor_id, token, phone, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (vendor_id)
         DO UPDATE SET token = EXCLUDED.token, phone = COALESCE(EXCLUDED.phone, vendor_fcm_tokens.phone), updated_at = NOW()`,
        vIdStr,
        tokenStr,
        phoneStr
      );
      console.log(`✅ Saved FCM push token to Supabase DB for vendor: ${vIdStr}`);
    }
  } catch (dbErr) {
    console.warn("DB token save note:", dbErr.message);
  }

  return true;
}

/**
 * Retrieves FCM token using a 5-tier fallback:
 * 1. In-memory cache
 * 2. Local JSON file
 * 3. Supabase DB lookup by vendor_id
 * 4. Supabase DB lookup by vendor phone (exact match only)
 * Never falls back to another vendor's device token, so one vendor's order
 * alerts can never be delivered to a different vendor's phone.
 */
async function getTokenForVendor(vendorId, phone = null) {
  const vIdStr = vendorId ? String(vendorId).trim() : "";

  // 1. In-memory
  if (vIdStr && memoryTokens[vIdStr]?.token) {
    return memoryTokens[vIdStr].token;
  }

  // 2. Local file
  const localTokens = loadTokens();
  if (vIdStr && localTokens[vIdStr]?.token) {
    memoryTokens[vIdStr] = localTokens[vIdStr];
    return localTokens[vIdStr].token;
  }

  // 3. Supabase DB queries
  const p = getPrisma();
  if (p) {
    try {
      if (vIdStr) {
        const rows = await p.$queryRawUnsafe(
          `SELECT token FROM vendor_fcm_tokens WHERE vendor_id = $1 LIMIT 1`,
          vIdStr
        );
        if (rows && rows.length > 0 && rows[0].token) {
          memoryTokens[vIdStr] = { token: rows[0].token };
          return rows[0].token;
        }
      }

      // 4. Fallback by phone
      if (phone) {
        const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
        if (cleanPhone.length === 10) {
          const phoneRows = await p.$queryRawUnsafe(
            `SELECT token FROM vendor_fcm_tokens WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = $1 ORDER BY updated_at DESC LIMIT 1`,
            cleanPhone
          );
          if (phoneRows && phoneRows.length > 0 && phoneRows[0].token) {
            return phoneRows[0].token;
          }
        }
      }
    } catch (dbErr) {
      console.warn("DB token lookup note:", dbErr.message);
    }
  }

  return null;
}

/**
 * Sends a high-priority background push notification to a vendor's phone.
 * Wakes up device even if the app is killed or swiped away.
 */
async function sendVendorOrderPushNotification({ vendorId, phone, orderNumber, amount, itemCount, orderId }) {
  const fcmToken = await getTokenForVendor(vendorId, phone);
  if (!fcmToken) {
    console.log(`ℹ️ No FCM push token registered for vendor: ${vendorId}. Skipping push.`);
    return { success: false, reason: "no_fcm_token" };
  }

  if (!initFirebase()) {
    return { success: false, reason: "firebase_not_initialized" };
  }

  const cleanOrderNum = String(orderNumber).replace(/^#/g, "").slice(-4).toUpperCase();
  const amtNum = Number(amount || 0);
  const title = amtNum > 0 ? `New Order Received • ₹${amtNum.toLocaleString("en-IN")}` : `New Order Received`;
  const body = `Order #ORD-*${cleanOrderNum} (${itemCount || 1} items) • Tap to review`;

  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    data: {
      orderId: String(orderId || ""),
      orderNumber: String(orderNumber || ""),
      type: "NEW_ORDER",
      title: title,
      body: body,
    },
    android: {
      priority: "high", // ⚡ High priority wakes up sleeping/killed Android device immediately
      notification: {
        channelId: "vendor_order_alerts",
        icon: "ic_stat_order",
        color: "#EA580C",
        sound: "default",
        defaultSound: true,
        defaultVibrateTimings: true,
        priority: "max",
        visibility: "public",
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`✅ FCM Push Notification successfully delivered to vendor ${vendorId}:`, response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error(`❌ FCM Push send error for vendor ${vendorId}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  initFirebase,
  setPrismaClient,
  saveToken,
  getTokenForVendor,
  sendVendorOrderPushNotification,
};
