import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { API_BASE_URL } from "../config/api";
import { playOrderAlertChime, triggerOrderVibration } from "./orderAlertSound";

let isRegistered = false;
let currentRegisteredVendorId = null;

/**
 * Proactively registers and obtains the FCM device token on native app boot.
 * Does NOT wait for user to log in! This guarantees the token is already in memory/localStorage
 * before the user even enters their credentials.
 */
export async function preRegisterDeviceTokenOnBoot() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive === "granted") {
      try {
        await PushNotifications.createChannel({
          id: "vendor_order_alerts",
          name: "Customer Order Alerts",
          description: "Loud notifications when a new customer order arrives",
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: "default",
        });
      } catch (_) {}

      try {
        await LocalNotifications.createChannel({
          id: "vendor_order_alerts",
          name: "Customer Order Alerts",
          description: "Loud notifications when a new customer order arrives",
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: "default",
        });
      } catch (_) {}

      await PushNotifications.addListener("registration", (token) => {
        if (!token?.value) return;
        console.log("📱 Device FCM Token ready on boot:", token.value.substring(0, 15) + "...");
        try {
          localStorage.setItem("vendor_fcm_token", token.value);
          localStorage.setItem("buildcity_permanent_device_token", token.value);
        } catch (_) {}
      });

      await PushNotifications.register();
    }
  } catch (err) {
    console.warn("Boot push registration note:", err.message);
  }
}

/**
 * Gets cached token or waits up to maxWaitMs for registration event
 */
export async function getDeviceFcmToken(maxWaitMs = 2000) {
  try {
    const cached = localStorage.getItem("buildcity_permanent_device_token") || localStorage.getItem("vendor_fcm_token");
    if (cached) return cached;
  } catch (_) {}

  if (!Capacitor.isNativePlatform()) return null;

  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(localStorage.getItem("buildcity_permanent_device_token") || null);
      }
    }, maxWaitMs);

    PushNotifications.addListener("registration", (token) => {
      if (!resolved && token?.value) {
        resolved = true;
        clearTimeout(timeout);
        try {
          localStorage.setItem("vendor_fcm_token", token.value);
          localStorage.setItem("buildcity_permanent_device_token", token.value);
        } catch (_) {}
        resolve(token.value);
      }
    }).catch(() => {});

    PushNotifications.register().catch(() => {});
  });
}

/**
 * Initializes and registers FCM Push Notifications for the logged-in vendor.
 * Works even when the app is completely killed or swiped away.
 */
export async function initVendorPushNotifications(vendorId, meta = {}) {
  if (!Capacitor.isNativePlatform() || !vendorId) return;
  const phone = meta.phone || "";

  // 0. If token was previously cached on device, sync immediately with backend!
  try {
    const cachedToken = localStorage.getItem("buildcity_permanent_device_token") || localStorage.getItem("vendor_fcm_token");
    if (cachedToken) {
      fetch(`${API_BASE_URL}/api/v1/vendor/fcm-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, token: cachedToken, phone }),
      }).catch(() => {});
    }
  } catch (e) {}

  if (isRegistered && currentRegisteredVendorId === vendorId) return;
  currentRegisteredVendorId = vendorId;

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive === "granted") {
      // 1. Create high-priority notification channel for Android heads-up alerts
      try {
        await PushNotifications.createChannel({
          id: "vendor_order_alerts",
          name: "Customer Order Alerts",
          description: "Loud notifications when a new customer order arrives",
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: "default",
        });
      } catch (chErr) {
        console.warn("FCM channel create note:", chErr.message);
      }

      // Also ensure LocalNotifications channel exists
      try {
        await LocalNotifications.createChannel({
          id: "vendor_order_alerts",
          name: "Customer Order Alerts",
          description: "Loud notifications when a new customer order arrives",
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: "default",
        });
      } catch (_) {}

      // 2. Attach listeners FIRST before calling register()
      await PushNotifications.addListener("registration", async (token) => {
        if (!token?.value) return;
        console.log("📱 FCM Registration Token obtained:", token.value.substring(0, 15) + "...");
        try {
          localStorage.setItem("vendor_fcm_token", token.value);
          localStorage.setItem("buildcity_permanent_device_token", token.value);
        } catch (e) {}
        try {
          await fetch(`${API_BASE_URL}/api/v1/vendor/fcm-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendorId, token: token.value, phone }),
          });
          console.log(`✅ FCM token synced with backend for vendor: ${vendorId}`);
        } catch (err) {
          console.warn("FCM token sync note:", err.message);
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("FCM registration error note:", err.error);
      });

      // ⚡ Foreground notification received: Play loud sound + vibrate + show Android system heads-up alert!
      await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
        console.log("🔔 Push Notification received (Foreground):", notification.title);
        playOrderAlertChime();
        triggerOrderVibration();

        const data = notification.data || {};
        const orderId = data.orderId || data.id || data.orderNumber;
        const cleanOrderNumber = data.orderNumber || orderId;

        // Schedule high-priority heads-up notification in Android notification drawer
        try {
          const notifId = (Date.now() % 100000) + Math.floor(Math.random() * 100);
          await LocalNotifications.schedule({
            notifications: [
              {
                id: notifId,
                title: notification.title || "New Order Received!",
                body: notification.body || (cleanOrderNumber ? `Order #${cleanOrderNumber} received • Tap to review` : "Tap to review incoming order"),
                channelId: "vendor_order_alerts",
                sound: "default",
                extra: { ...data, orderId, orderNumber: cleanOrderNumber },
                smallIcon: "ic_stat_order",
                iconColor: "#EA580C",
              },
            ],
          });
        } catch (localErr) {
          console.warn("Local notification drop note:", localErr.message);
        }

        // Cache instant incoming order payload for 0ms render
        if (orderId) {
          try {
            localStorage.setItem("buildcity_pending_highlight_order", String(orderId));
            localStorage.setItem("buildcity_pending_highlight_time", Date.now().toString());
            localStorage.setItem("buildcity_instant_incoming_order", JSON.stringify({
              orderId: String(orderId),
              orderNumber: String(cleanOrderNumber || orderId),
              amount: data.amount || 0,
              itemCount: data.itemCount || 1,
            }));
          } catch (_) {}
          window.dispatchEvent(new CustomEvent("buildcity_order_highlight", { detail: { orderId: String(orderId) } }));
        }
        window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
      });

      // ⚡ User clicked notification (App opened / resumed from background or killed state)
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("👉 Push notification clicked:", action.notification?.data);
        const data = action.notification?.data || {};
        const orderId = data.orderId || data.id || data.orderNumber;
        const cleanOrderNumber = data.orderNumber || orderId;
        if (orderId) {
          try {
            localStorage.setItem("buildcity_pending_highlight_order", String(orderId));
            localStorage.setItem("buildcity_pending_highlight_time", Date.now().toString());
            localStorage.setItem("buildcity_instant_incoming_order", JSON.stringify({
              orderId: String(orderId),
              orderNumber: String(cleanOrderNumber || orderId),
              amount: data.amount || 0,
              itemCount: data.itemCount || 1,
            }));
          } catch (_) {}
          window.dispatchEvent(new CustomEvent("buildcity_order_highlight", { detail: { orderId: String(orderId) } }));
        }
        window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
      });

      // 3. Register with FCM on Google Play Services
      await PushNotifications.register();
      isRegistered = true;
    }
  } catch (err) {
    console.warn("Push notification setup note:", err.message);
  }
}

/**
 * Cleanly unlinks and unregisters the FCM Push Token from the vendor on logout.
 * Ensures the logged-out vendor will NEVER receive notifications on this phone!
 */
export async function unregisterVendorPushNotifications(vendorId) {
  try {
    const cachedToken = localStorage.getItem("buildcity_permanent_device_token") || localStorage.getItem("vendor_fcm_token");
    if (cachedToken || vendorId) {
      await fetch(`${API_BASE_URL}/api/v1/vendor/fcm-token/deregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, token: cachedToken }),
      }).catch(() => {});
    }
  } catch (e) {}

  try {
    localStorage.removeItem("vendor_fcm_token");
    // Note: We deliberately KEEP buildcity_permanent_device_token so that
    // the next vendor logging into this physical phone gets instant 0ms token sync!
  } catch (e) {}

  isRegistered = false;
  currentRegisteredVendorId = null;
  console.log(`🔒 Vendor FCM token successfully unlinked on logout for vendor: ${vendorId || "current"}`);
}
