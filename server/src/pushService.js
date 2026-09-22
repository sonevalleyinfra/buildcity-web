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

// Ensure data directory exists for persistent token storage
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

function saveToken(vendorId, token) {
  if (!vendorId || !token) return false;
  try {
    const tokens = loadTokens();
    tokens[String(vendorId)] = {
      token,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), "utf8");
    console.log(`✅ Saved FCM push token for vendor: ${vendorId}`);
    return true;
  } catch (err) {
    console.error("Failed to save FCM token:", err.message);
    return false;
  }
}

function getTokenForVendor(vendorId) {
  if (!vendorId) return null;
  const tokens = loadTokens();
  const entry = tokens[String(vendorId)];
  return entry ? entry.token : null;
}

/**
 * Sends a high-priority background push notification to a vendor's phone.
 * Wakes up device even if the app is killed or swiped away.
 */
async function sendVendorOrderPushNotification({ vendorId, orderNumber, amount, itemCount, orderId }) {
  const fcmToken = getTokenForVendor(vendorId);
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
  saveToken,
  getTokenForVendor,
  sendVendorOrderPushNotification,
};
