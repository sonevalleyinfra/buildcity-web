const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const fs = require("fs");

let firebaseInitialized = false;

// Accepts raw JSON, JSON wrapped in quotes, JSON with backslash-escaped quotes
// (common when pasted into PaaS env UIs), or base64 of the JSON.
function parseServiceAccountEnv(raw) {
  let v = String(raw).trim();
  const candidates = [v];
  if (/^(["']).*\1$/s.test(v)) candidates.push(v.slice(1, -1).trim());
  const unescaped = candidates[candidates.length - 1].replace(/\\"/g, '"');
  candidates.push(unescaped);
  if (/^[A-Za-z0-9+/=\s]+$/.test(v)) candidates.push(Buffer.from(v, "base64").toString("utf8"));
  let lastErr;
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === "object") {
        if (typeof obj.private_key === "string") obj.private_key = obj.private_key.replace(/\\n/g, "\n");
        return obj;
      }
    } catch (e) {
      lastErr = lastErr || e;
    }
  }
  throw lastErr;
}

function initFirebase() {
  if (firebaseInitialized) return true;
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "../firebase-service-account.json");
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = parseServiceAccountEnv(process.env.FIREBASE_SERVICE_ACCOUNT);
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

let tableChecked = false;
async function ensureTokenTable(p) {
  if (tableChecked || !p) return;
  try {
    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS vendor_fcm_tokens (
        vendor_id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        phone TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS customer_fcm_tokens (
        user_id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        phone TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    tableChecked = true;
  } catch (e) {
    console.warn("Table ensure note:", e.message);
  }
}

// Ensure data directory exists for secondary backup token storage
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "../data");
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

  // 3. Supabase DB Persistence with vendor ID cross-linking
  try {
    const p = getPrisma();
    if (p) {
      await ensureTokenTable(p);
      // Find linked vendor record to save token for both vendor.id and vendor.userId
      const cleanPhone = (phoneStr || "").replace(/\D/g, "").slice(-10);
      const vRec = await p.vendor.findFirst({
        where: {
          OR: [
            { id: vIdStr },
            { userId: vIdStr },
            ...(cleanPhone.length >= 7 ? [{ phone: { contains: cleanPhone } }] : []),
          ],
        },
        select: { id: true, userId: true, phone: true },
      }).catch(() => null);

      const idsToSave = new Set([vIdStr]);
      if (vRec?.id) idsToSave.add(vRec.id);
      if (vRec?.userId) idsToSave.add(vRec.userId);

      const targetPhone = phoneStr || vRec?.phone || null;

      for (const saveId of idsToSave) {
        memoryTokens[saveId] = {
          token: tokenStr,
          phone: targetPhone,
          updatedAt: new Date().toISOString(),
        };

        await p.$executeRawUnsafe(
          `INSERT INTO vendor_fcm_tokens (vendor_id, token, phone, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (vendor_id)
           DO UPDATE SET token = EXCLUDED.token, phone = COALESCE(EXCLUDED.phone, vendor_fcm_tokens.phone), updated_at = NOW()`,
          saveId,
          tokenStr,
          targetPhone
        ).catch(() => null);
      }

      // ⚠️ IMPORTANT: If this physical device token was previously registered to ANY other vendor (e.g. Vendor A logged out or switched accounts on this phone),
      // delete that old mapping immediately so Vendor A will NEVER receive alerts on this device!
      await p.$executeRawUnsafe(
        `DELETE FROM vendor_fcm_tokens WHERE token = $1 AND vendor_id != ALL($2::text[])`,
        tokenStr,
        [...idsToSave]
      ).catch(() => null);

      // Clean memoryTokens & local file for old vendors that had this device token
      for (const [k, val] of Object.entries(memoryTokens)) {
        if (val?.token === tokenStr && !idsToSave.has(k)) {
          delete memoryTokens[k];
        }
      }
      try {
        const tokens = loadTokens();
        let changed = false;
        for (const [k, val] of Object.entries(tokens)) {
          if (val?.token === tokenStr && !idsToSave.has(k)) {
            delete tokens[k];
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), "utf8");
        }
      } catch (_) {}

      console.log(`✅ Saved FCM push token to Supabase DB for vendor: ${[...idsToSave].join(", ")}`);
    }
  } catch (dbErr) {
    console.warn("DB token save note:", dbErr.message);
  }

  return true;
}

/**
 * Removes / unregisters an FCM token when a vendor logs out.
 * Ensures the logged-out vendor will NEVER receive order alerts on this device!
 */
async function removeToken(vendorId, token = null) {
  const vIdStr = vendorId ? String(vendorId).trim() : "";
  const tokenStr = token ? String(token).trim() : "";

  // 1. In-memory cleanup
  if (vIdStr && memoryTokens[vIdStr]) {
    delete memoryTokens[vIdStr];
  }
  if (tokenStr) {
    for (const [k, val] of Object.entries(memoryTokens)) {
      if (val?.token === tokenStr) delete memoryTokens[k];
    }
  }

  // 2. Local file cleanup
  try {
    const tokens = loadTokens();
    let changed = false;
    if (vIdStr && tokens[vIdStr]) {
      delete tokens[vIdStr];
      changed = true;
    }
    if (tokenStr) {
      for (const [k, val] of Object.entries(tokens)) {
        if (val?.token === tokenStr) {
          delete tokens[k];
          changed = true;
        }
      }
    }
    if (changed) {
      fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("File token delete note:", err.message);
  }

  // 3. Database cleanup
  const p = getPrisma();
  if (p) {
    try {
      await ensureTokenTable(p);
      if (tokenStr) {
        await p.$executeRawUnsafe(`DELETE FROM vendor_fcm_tokens WHERE token = $1`, tokenStr).catch(() => null);
      }
      if (vIdStr) {
        await p.$executeRawUnsafe(`DELETE FROM vendor_fcm_tokens WHERE vendor_id = $1`, vIdStr).catch(() => null);
        const vRec = await p.vendor.findFirst({
          where: { OR: [{ id: vIdStr }, { userId: vIdStr }] },
          select: { id: true, userId: true },
        }).catch(() => null);
        if (vRec?.id) await p.$executeRawUnsafe(`DELETE FROM vendor_fcm_tokens WHERE vendor_id = $1`, vRec.id).catch(() => null);
        if (vRec?.userId) await p.$executeRawUnsafe(`DELETE FROM vendor_fcm_tokens WHERE vendor_id = $1`, vRec.userId).catch(() => null);
      }
      console.log(`✅ Successfully unlinked FCM push token on logout for vendor: ${vIdStr || tokenStr}`);
    } catch (dbErr) {
      console.warn("DB token delete note:", dbErr.message);
    }
  }

  return true;
}

/**
 * Retrieves FCM token strictly for the designated vendor.
 * NEVER falls back to other random vendors!
 */
async function getTokenForVendor(vendorId, phone = null) {
  const vIdStr = vendorId ? String(vendorId).trim() : "";
  const phoneStr = phone ? String(phone).trim() : null;

  // 1. Direct in-memory cache lookup
  if (vIdStr && memoryTokens[vIdStr]?.token) {
    return memoryTokens[vIdStr].token;
  }

  // 2. Direct local file lookup
  const localTokens = loadTokens();
  if (vIdStr && localTokens[vIdStr]?.token) {
    memoryTokens[vIdStr] = localTokens[vIdStr];
    return localTokens[vIdStr].token;
  }

  const p = getPrisma();
  if (p) {
    try {
      await ensureTokenTable(p);
      // 3. Direct DB lookup by vendor_id
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

      // 4. Resolve vendor record to check candidate IDs (vendor.id, vendor.userId) and vendor phone
      const cleanPhone = (phoneStr || "").replace(/\D/g, "").slice(-10);
      const vendorRecord = await p.vendor.findFirst({
        where: {
          OR: [
            ...(vIdStr ? [{ id: vIdStr }, { userId: vIdStr }] : []),
            ...(cleanPhone.length >= 7 ? [{ phone: { contains: cleanPhone } }] : []),
          ],
        },
        select: { id: true, userId: true, phone: true },
      }).catch(() => null);

      if (vendorRecord) {
        const candidateIds = [vendorRecord.id, vendorRecord.userId].filter(Boolean);
        const candidatePhone = (vendorRecord.phone || "").replace(/\D/g, "").slice(-10);

        // Check memory / local with linked IDs
        for (const cId of candidateIds) {
          if (memoryTokens[cId]?.token) return memoryTokens[cId].token;
          if (localTokens[cId]?.token) return localTokens[cId].token;
        }

        // Check DB for any linked candidateId
        for (const cId of candidateIds) {
          const linkedRows = await p.$queryRawUnsafe(
            `SELECT token FROM vendor_fcm_tokens WHERE vendor_id = $1 LIMIT 1`,
            cId
          );
          if (linkedRows && linkedRows.length > 0 && linkedRows[0].token) {
            memoryTokens[vIdStr] = { token: linkedRows[0].token };
            return linkedRows[0].token;
          }
        }

        // Check DB for vendor's registered phone
        if (candidatePhone.length >= 7) {
          const phoneRows = await p.$queryRawUnsafe(
            `SELECT token FROM vendor_fcm_tokens WHERE phone LIKE $1 LIMIT 1`,
            `%${candidatePhone}%`
          );
          if (phoneRows && phoneRows.length > 0 && phoneRows[0].token) {
            return phoneRows[0].token;
          }
        }
      }

      // 5. Fallback strictly by vendor phone passed in
      if (cleanPhone.length >= 7) {
        const phoneRows = await p.$queryRawUnsafe(
          `SELECT token FROM vendor_fcm_tokens WHERE phone LIKE $1 LIMIT 1`,
          `%${cleanPhone}%`
        );
        if (phoneRows && phoneRows.length > 0 && phoneRows[0].token) {
          return phoneRows[0].token;
        }
      }
    } catch (dbErr) {
      console.warn("DB token lookup note:", dbErr.message);
    }
  }

  // ⚠️ CRITICAL: Strictly return null if THIS specific vendor has no registered device.
  // NEVER send push to random vendors!
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
    const messaging = typeof admin.messaging === "function" ? admin.messaging() : getMessaging();
    const response = await messaging.send(message);
    console.log(`✅ FCM Push Notification successfully delivered to vendor ${vendorId}:`, response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error(`❌ FCM Push send error for vendor ${vendorId}:`, err.message);
    return { success: false, error: err.message };
  }
}

// In-memory cache for customer tokens
const customerMemoryTokens = {};

async function saveCustomerToken(userId, token, phone = null) {
  if (!userId || !token) return false;
  const uIdStr = String(userId).trim();
  const tokenStr = String(token).trim();
  const phoneStr = phone ? String(phone).trim() : null;

  // 1. Purge any other customer who previously had this device token from memory
  for (const [k, val] of Object.entries(customerMemoryTokens)) {
    if (val?.token === tokenStr && k !== uIdStr) {
      delete customerMemoryTokens[k];
    }
  }

  customerMemoryTokens[uIdStr] = {
    token: tokenStr,
    phone: phoneStr,
    updatedAt: new Date().toISOString(),
  };

  const p = getPrisma();
  if (p) {
    try {
      await ensureTokenTable(p);
      // 2. Save token for this current user
      await p.$executeRawUnsafe(
        `INSERT INTO customer_fcm_tokens (user_id, token, phone, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET token = EXCLUDED.token, phone = COALESCE(EXCLUDED.phone, customer_fcm_tokens.phone), updated_at = NOW()`,
        uIdStr,
        tokenStr,
        phoneStr
      ).catch(() => null);

      // 3. CRITICAL: Unlink this physical device token from ANY other customer account
      // (e.g. User A logged out or switched numbers on this phone)
      await p.$executeRawUnsafe(
        `DELETE FROM customer_fcm_tokens WHERE token = $1 AND user_id != $2`,
        tokenStr,
        uIdStr
      ).catch(() => null);

      console.log(`✅ Customer device FCM token bound exclusively to user: ${uIdStr}`);
    } catch (e) {
      console.warn("Save customer token note:", e.message);
    }
  }
  return true;
}

/**
 * Removes / unlinks customer FCM token when customer logs out.
 * Ensures signed-out customer NEVER receives notifications on this device!
 */
async function removeCustomerToken(userId, token = null) {
  const uIdStr = userId ? String(userId).trim() : "";
  const tokenStr = token ? String(token).trim() : "";

  // 1. Remove from in-memory cache
  if (uIdStr && customerMemoryTokens[uIdStr]) {
    delete customerMemoryTokens[uIdStr];
  }
  if (tokenStr) {
    for (const [k, val] of Object.entries(customerMemoryTokens)) {
      if (val?.token === tokenStr) {
        delete customerMemoryTokens[k];
      }
    }
  }

  // 2. Remove from database table customer_fcm_tokens
  const p = getPrisma();
  if (p) {
    try {
      await ensureTokenTable(p);
      if (uIdStr && tokenStr) {
        await p.$executeRawUnsafe(
          `DELETE FROM customer_fcm_tokens WHERE user_id = $1 OR token = $2`,
          uIdStr,
          tokenStr
        ).catch(() => null);
      } else if (uIdStr) {
        await p.$executeRawUnsafe(
          `DELETE FROM customer_fcm_tokens WHERE user_id = $1`,
          uIdStr
        ).catch(() => null);
      } else if (tokenStr) {
        await p.$executeRawUnsafe(
          `DELETE FROM customer_fcm_tokens WHERE token = $1`,
          tokenStr
        ).catch(() => null);
      }
      console.log(`🔒 Customer FCM push token completely removed for user: ${uIdStr || tokenStr}`);
    } catch (e) {
      console.warn("Remove customer token note:", e.message);
    }
  }
  return true;
}

async function getTokenForCustomer(userId, phone = null) {
  const uIdStr = userId ? String(userId).trim() : "";
  const phoneStr = phone ? String(phone).trim() : null;

  // If userId is provided, look up strictly for this logged-in user!
  if (uIdStr) {
    if (customerMemoryTokens[uIdStr]?.token) {
      return customerMemoryTokens[uIdStr].token;
    }
    const p = getPrisma();
    if (p) {
      try {
        await ensureTokenTable(p);
        const rows = await p.$queryRawUnsafe(
          `SELECT token FROM customer_fcm_tokens WHERE user_id = $1 LIMIT 1`,
          uIdStr
        );
        if (rows && rows.length > 0 && rows[0].token) {
          customerMemoryTokens[uIdStr] = { token: rows[0].token };
          return rows[0].token;
        }
      } catch (e) {
        console.warn("Get customer token note:", e.message);
      }
    }
    // If not found for this userId, it means this user is SIGNED OUT! Do not send push!
    return null;
  }

  // If userId was NOT provided (phone only), check phone strictly
  const cleanPhone = (phoneStr || "").replace(/\D/g, "").slice(-10);
  if (cleanPhone.length >= 7) {
    const p = getPrisma();
    if (p) {
      try {
        await ensureTokenTable(p);
        const phoneRows = await p.$queryRawUnsafe(
          `SELECT token FROM customer_fcm_tokens WHERE phone LIKE $1 LIMIT 1`,
          `%${cleanPhone}%`
        );
        if (phoneRows && phoneRows.length > 0 && phoneRows[0].token) {
          return phoneRows[0].token;
        }
      } catch (e) {}
    }
  }

  return null;
}

/**
 * Sends a high-priority background push notification to customer's phone on order status updates.
 * Wakes up device even if the app is killed or swiped away.
 */
async function sendCustomerOrderStatusPushNotification({ userId, phone, orderId, orderNumber, status, title, body }) {
  const fcmToken = await getTokenForCustomer(userId, phone);
  if (!fcmToken) {
    console.log(`ℹ️ No active FCM push token registered for customer: ${userId || phone} (user signed out or no device). Push skipped.`);
    return { success: false, reason: "no_fcm_token" };
  }

  if (!initFirebase()) {
    return { success: false, reason: "firebase_not_initialized" };
  }

  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    data: {
      orderId: String(orderId || ""),
      orderNumber: String(orderNumber || ""),
      type: "ORDER_STATUS_CHANGE",
      status: String(status || ""),
      title: String(title || ""),
      body: String(body || ""),
      link: `/orders/${orderId}`,
    },
    android: {
      priority: "high", // Wakes up killed / sleeping device
      notification: {
        channelId: "customer_order_updates",
        icon: "ic_stat_order",
        color: "#059669",
        sound: "default",
        defaultSound: true,
        defaultVibrateTimings: true,
        priority: "max",
        visibility: "public",
      },
    },
  };

  try {
    const messaging = typeof admin.messaging === "function" ? admin.messaging() : getMessaging();
    const response = await messaging.send(message);
    console.log(`✅ Customer Push Notification delivered for order ${orderNumber} (${status}):`, response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error(`❌ Customer Push send error for order ${orderNumber}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  initFirebase,
  setPrismaClient,
  saveToken,
  removeToken,
  getTokenForVendor,
  sendVendorOrderPushNotification,
  saveCustomerToken,
  removeCustomerToken,
  getTokenForCustomer,
  sendCustomerOrderStatusPushNotification,
};
