import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { WEB_URL } from "../config/api";
import { isVendorApp } from "../config/appMode";

let isChecking = false;

/**
 * Initializes and manages Over-The-Air (OTA) updates for the Vendor/Partner app.
 * Runs in the background without blocking UI rendering or user interaction.
 */
export async function initVendorOtaUpdates() {
  if (!Capacitor.isNativePlatform() || !isVendorApp) return;

  try {
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

    // 1. Notify native plugin that current bundle loaded successfully (prevents rollback)
    await CapacitorUpdater.notifyAppReady().catch(() => {});

    // 2. Initial background check for new updates
    await checkForUpdates(CapacitorUpdater);

    // 3. Check for updates on app resume (when vendor switches back to the app)
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        checkForUpdates(CapacitorUpdater).catch(() => {});
      }
    });
  } catch (err) {
    console.warn("[OTA] Initialization note:", err.message);
  }
}

async function checkForUpdates(CapacitorUpdater) {
  if (isChecking) return;
  isChecking = true;

  try {
    // Check currently active bundle version
    let currentVersion = "builtin";
    try {
      const current = await CapacitorUpdater.current();
      if (current?.bundle?.version) {
        currentVersion = current.bundle.version;
      }
    } catch {}

    // Check with server endpoint for latest available bundle
    const response = await fetch(`${WEB_URL}/api/ota-vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version_name: currentVersion,
        version_build: "1.2",
      }),
      cache: "no-store",
    }).catch(() => null);

    if (!response || !response.ok) return;

    const data = await response.json().catch(() => null);
    if (!data || data.kind === "up_to_date") {
      return;
    }

    if (data.url && data.version && data.version !== currentVersion) {
      console.log(`[OTA] New bundle found (${data.version}). Downloading in background...`);

      // Download and extract zip silently
      const bundle = await CapacitorUpdater.download({
        url: data.url,
        version: data.version,
        checksum: data.checksum,
      });

      if (bundle && bundle.id) {
        console.log(`[OTA] Bundle ${data.version} downloaded successfully. Queued for next app launch/resume.`);
        // Set this bundle to activate on next app restart or background transition
        await CapacitorUpdater.next({ id: bundle.id }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("[OTA] Background update check notice:", err.message);
  } finally {
    isChecking = false;
  }
}
