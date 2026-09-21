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
      // 1. Register with FCM on Google Play Services
      await PushNotifications.register();
      isRegistered = true;

      // 2. Received device token from Firebase -> send to backend API
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

      // 3. Error listener
      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("FCM registration error note:", err.error);
      });

      // 4. Foreground push received -> play chime & vibration
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("🔔 Foreground Push Notification received:", notification.title);
        playOrderAlertChime();
        triggerOrderVibration();
        // Refresh orders immediately
        window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
      });

      // 5. Notification tapped by user -> navigate to orders tab
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("👉 Push notification clicked:", action.notification.data);
        window.dispatchEvent(new CustomEvent("buildcity_orders_updated"));
      });
    }
  } catch (err) {
    console.warn("Push notification setup note:", err.message);
  }
}
