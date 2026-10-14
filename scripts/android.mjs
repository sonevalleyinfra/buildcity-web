#!/usr/bin/env node
// Prepare the Android project for one of the two Play Store apps, then build the bundle in Android Studio
// or with Gradle (the command is printed at the end).
//
//   npm run android:customer             BuildCity (com.buildcity.app): bundled storefront + over-the-air updates
//   npm run android:partner              BuildCity Partner (com.buildcity.vendor): opens the live site at /vendor/login
//   npm run android:partner -- --bundled BuildCity Partner with the vendor app bundled instead (no live site)
//
// Both apps share android/app/src/main/assets, so run this before every Gradle build of an app.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const LIVE_URL = "https://www.buildcity.in";
// The partner app opens the partner login; signed-in partners are sent straight on to their dashboard
const PARTNER_START_URL = `${LIVE_URL}/vendor/login`;
const PARTNER_UA_MARKER = "BuildCityPartner"; // keep in sync with src/config/appMode.js

const APPS = {
  customer: {
    viteArgs: "",
    gradleTask: "bundleCustomerRelease",
    output: "android/app/build/outputs/bundle/customerRelease/app-customer-release.aab",
    config: () => ({
      appId: "com.buildcity.app",
      appName: "BuildCity",
    }),
  },
  partner: {
    viteArgs: "--mode vendor",
    gradleTask: "bundlePartnerRelease",
    output: "android/app/build/outputs/bundle/partnerRelease/app-partner-release.aab",
    config: ({ bundled }) => ({
      appId: "com.buildcity.vendor",
      appName: "BuildCity Partner",
      // Lets the live site recognise the partner app and render the vendor UI (src/config/appMode.js)
      appendUserAgent: PARTNER_UA_MARKER,
      ...(bundled
        ? {}
        : {
            server: {
              // Every deploy of main is live in the app on its next launch, no Play Store release needed
              url: PARTNER_START_URL,
              allowNavigation: ["www.buildcity.in", "buildcity.in"],
              // Bundled page shown when the site can't be reached (public/offline.html)
              errorPath: "offline.html",
            },
          }),
      plugins: {
        CapacitorUpdater: {
          autoUpdate: true,
          updateUrl: "https://www.buildcity.in/api/ota-vendor",
          statsUrl: "",
          channelUrl: "",
          appReadyTimeout: 10000,
          autoDeleteFailed: true,
          autoDeletePrevious: true,
          resetWhenUpdate: false, // PRESERVES localStorage across OTA updates!
        },
      },
    }),
  },
};

const app = process.argv[2];
const bundled = !process.argv.includes("--live");
if (!APPS[app]) {
  console.error("Usage: node scripts/android.mjs <customer|partner> [--bundled]");
  process.exit(1);
}
const target = APPS[app];

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const merge = (base, extra) => {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    out[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
};

// 1. Build the web app for this app (partner uses .env.vendor → VITE_APP_MODE=vendor)
run(`npx vite build ${target.viteArgs}`.trim());

// 2. Copy it into the Android project and refresh native plugin wiring
run("npx cap sync android");

// 3. Point the copied Capacitor config at this app (the root capacitor.config.json stays the customer default)
const assetConfigPath = "android/app/src/main/assets/capacitor.config.json";
const baseConfig = JSON.parse(readFileSync(assetConfigPath, "utf8"));
const appConfig = merge(baseConfig, target.config({ bundled }));
if (app === "customer" && appConfig.plugins?.CapacitorUpdater) {
  delete appConfig.plugins.CapacitorUpdater;
}
writeFileSync(assetConfigPath, JSON.stringify(appConfig, null, 2) + "\n");

console.log(`
✔ Android project ready for ${app}${app === "partner" ? (bundled ? " (bundled vendor app)" : ` (live: ${PARTNER_START_URL})`) : ""}.

Next:
  1. Bump versionCode / versionName for "${app}" in android/app/build.gradle if this build goes to the Play Store.
  2. cd android && ./gradlew ${target.gradleTask}
     (or Android Studio → Build Variants → ${app}Release → Build → Generate Signed App Bundle)
  3. Upload ${target.output} to the Play Console.
`);
