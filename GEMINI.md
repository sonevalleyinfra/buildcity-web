# BuildCity Project Memory & Guidelines

This document preserves critical knowledge, build workflows, credentials references, and architecture rules for all AI assistants working on BuildCity.

---

## 1. Project Overview & Multi-App Architecture
BuildCity is a dual-app architecture sharing one React + Vite codebase:
- **Customer Storefront App**:
  - Package ID: `com.buildcity.app`
  - Name: `BuildCity`
  - Splash screen: Dark `#0A192F`, centered roof logo (`/buildcity-roof-logo.png`), Title `BuildCity` (no subtitle, no square card).
- **Partner / Vendor App**:
  - Package ID: `com.buildcity.vendor`
  - Name: `BuildCity Partner`
  - Subtitle: `Partner`
  - Opens partner dashboard/login with `BuildCityPartner` User-Agent marker.

---

## 2. Release & Android Build Instructions
Android project uses Capacitor 8 with custom flavor dimensions (`customer` and `partner`).

### Release Signing Config
- **Keystore File**: `android/app/buildcity-release.keystore`
- **Alias**: `buildcity`
- **Password**: `buildcity123`
- **Rule**: Never delete or replace this keystore; Google Play Console rejects updates signed with a different key.

### Play Store Versioning Rule
- Before generating a release for Google Play Console, always bump `versionCode` (and `versionName`) in `android/app/build.gradle` under `productFlavors.customer` or `productFlavors.partner`.
- Play Store strictly rejects any upload with a duplicate or lower `versionCode`.

### Customer Build Commands
```bash
# 1. Build web & sync Capacitor
npm run android:customer

# 2. Build AAB (for Play Store) and APK (for direct install)
cd android
./gradlew.bat bundleCustomerRelease assembleCustomerRelease

# 3. Output files:
# AAB: android/app/build/outputs/bundle/customerRelease/app-customer-release.aab
# APK: android/app/build/outputs/apk/customer/release/app-customer-release.apk
# Release archive: release-artifacts/
```

### Partner Build Commands
```bash
# 1. Build partner bundle
npm run android:partner

# 2. Build AAB and APK
cd android
./gradlew.bat bundlePartnerRelease assemblePartnerRelease
```

---

## 3. Deployment & Domain Topology
- **Production Site**: `https://www.buildcity.in` (Vercel tracks `production` branch).
- **Staging Site**: `https://staging.buildcity.in` (Vercel tracks `main` branch).
- **API Backend**: Express server on Node.js (`server/src/index.js`), port 5000 in dev.
- **Vite Dev Server**: `http://localhost:5173`.

---

## 4. Notifications & Push Token Management
- **FCM Server Key**: Service Account JSON loaded in `server/src/pushService.js`.
- **Token Cleanup**: On logout or account switch, customer token is deregistered via `POST /api/v1/notifications/device-token/deregister` to prevent ghost notifications.
- **Audio Chimes**: Web chimes (`/sounds/notification.mp3`) trigger for real-time customer order events.

---

## 5. Coding & Git Discipline
- Preserve all existing comments and documentation integrity.
- Verify production build passes before committing (`npm run build`).
- Do not commit release binaries (`.apk`, `.aab`) into git (they belong in `release-artifacts/` which is ignored).
