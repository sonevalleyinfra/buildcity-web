import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { formatShortId } from "./formatId";

// AudioContext singleton for zero-latency alert sounds
let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Ensure audio context is ready on first user touch / click
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
}

/**
 * Plays a loud, pleasant e-commerce alert chime (Swiggy / Zomato order alert tone)
 * 4-tone ascending harmonics with warm bell envelope
 */
export function playOrderAlertChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Chord / Arpeggio frequencies (A5 -> D6 -> F#6 -> A6)
    const tones = [
      { freq: 880, start: 0.0, dur: 0.28 },
      { freq: 1174.66, start: 0.12, dur: 0.32 },
      { freq: 1479.98, start: 0.24, dur: 0.35 },
      { freq: 1760, start: 0.36, dur: 0.65 },
    ];

    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      // Bell envelope (instant attack, smooth exponential decay)
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.4, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });

    // Add a secondary harmonic for warm rich presence
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(587.33, now); // D5
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn("Audio chime playback note:", err.message);
  }
}

/**
 * Vibrates device in urgent pattern (e.g. 300ms buzz, 150ms pause, 300ms buzz, 150ms pause, 500ms buzz)
 */
export function triggerOrderVibration() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([300, 150, 300, 150, 500]);
    }
  } catch {}
}

let notificationChannelCreated = false;

/**
 * Initializes notification channel on Android
 */
export async function initNotificationChannel() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (!notificationChannelCreated) {
      await LocalNotifications.createChannel({
        id: "vendor_order_alerts",
        name: "Customer Order Alerts",
        description: "Loud notifications when a new customer order arrives",
        importance: 5, // High priority heads-up notification
        visibility: 1,
        vibration: true,
      });
      notificationChannelCreated = true;
    }
  } catch (err) {
    console.warn("Init notification channel note:", err.message);
  }
}

/**
 * Requests notification permission from user on Android 13+ or web
 */
export async function requestOrderNotificationPermission() {
  try {
    if (Capacitor.isNativePlatform()) {
      await initNotificationChannel();
      const perm = await LocalNotifications.requestPermissions();
      return perm?.display === "granted";
    } else if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const res = await Notification.requestPermission();
        return res === "granted";
      }
      return Notification.permission === "granted";
    }
  } catch (err) {
    console.warn("Permission request note:", err.message);
  }
  return false;
}

/**
 * Dispatches complete incoming order alert:
 * 1. Loud chime sound
 * 2. Mobile vibration
 * 3. Native Android notification bar drop / Browser notification
 */
export async function notifyVendorNewOrder(order) {
  if (!order) return;

  const cleanOrderNum = formatShortId(order.id || order.orderNumber, "ORD");
  const amount = Number(order.totalAmount || order.total || order.vendorItemsTotal || 0);
  const itemCount = Array.isArray(order.items) ? order.items.length : 1;
  const itemsText = itemCount > 1 ? `${itemCount} items` : "1 item";

  const title = amount > 0
    ? `New Order Received • ₹${amount.toLocaleString("en-IN")}`
    : `New Order Received`;
  const body = `Order ${cleanOrderNum} (${itemsText}) • Tap to review`;

  // 1. Play chime sound
  playOrderAlertChime();

  // 2. Vibrate phone
  triggerOrderVibration();

  // 3. Native Android Notification
  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();
      const notifId = (Date.now() % 100000) + Math.floor(Math.random() * 100);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title,
            body: body,
            channelId: "vendor_order_alerts",
            sound: "default",
            extra: { orderId: order.id, orderNumber: cleanOrderNum },
            smallIcon: "ic_stat_order",
            iconColor: "#EA580C",
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
    } catch (err) {
      console.warn("Capacitor local notification note:", err.message);
    }
  } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    } catch {}
  }
}

// Listen for native notification clicks to auto-scroll & highlight order
if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
  LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const orderId = action.notification?.extra?.orderId;
    if (orderId) {
      window.dispatchEvent(new CustomEvent("buildcity_order_highlight", { detail: { orderId } }));
    }
  }).catch(() => {});
}
