import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { API_BASE_URL } from "../config/api";
import { playOrderAlertChime, triggerOrderVibration } from "./orderAlertSound";

let isRegistered = false;

/**
 * Initializes and registers FCM Push Notifications for the logged-in vendor.
 * Works even when the app is completely killed or swiped away.
 */
export async function initVendorPushNotifications(vendorId) {
  if (!Capacitor.isNativePlatform() || !vendorId) return;
  if (isRegistered) return;

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

      // 2. Attach listeners FIRST before calling register()
      await PushNotifications.addListener("registration", async (token) => {
        if (!token?.value) return;
        console.log("📱 FCM Registration Token obtained:", token.value.substring(0, 15) + "...");
        try {
          await fetch(`${API_BASE_URL}/api/v1/vendor/fcm-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendorId, token: token.value }),
          });
          console.log(`✅ FCM token synced with backend for vendor: ${vendorId}`);
        } catch (err) {
          console.warn("FCM token sync note:", err.message);
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("FCM registration error note:", err.error);
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("🔔 Push Notification received:", notification.title);
        playOrderAlertChime();
        triggerOrderVibration();
        window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("👉 Push notification clicked:", action.notification.data);
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
