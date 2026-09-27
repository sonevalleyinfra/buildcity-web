# How to release our Android apps (the easy guide)

## First, what are our apps?

We have **two** Android apps on the Google Play Store. They are built from the **same** folder (`android/`),
a bit like baking two different cakes from the same kitchen.

| App name              | Who uses it              | Its "ID" on the Play Store |
|-----------------------|--------------------------|----------------------------|
| **BuildCity**         | Customers who buy things | `com.buildcity.app`        |
| **BuildCity Partner** | Vendors who sell things  | `com.buildcity.vendor`     |

In the code, the customer app is called **`customer`** and the vendor app is called **`partner`**.
You will see these two words in all the commands below.

---

## Step 0: Do I even need a new release?

**Most of the time, NO!** 🎉

When you change a screen, a button, some text or a colour and push it to `main`, the apps pick it up
**by themselves**:

- **BuildCity Partner** is like a window that shows our website. Change the website, and the app shows the
  new version the next time someone opens it.
- **BuildCity** (customer) quietly downloads the new screens in the background and uses them the next time
  someone opens it. This is called an **over-the-air (OTA) update**.

You only need a new Play Store release when you change the **"phone parts"** of the app (called *native*
changes):

- ✅ You added or upgraded a Capacitor plugin (anything in `package.json` that starts with `@capacitor/`
  or `@capgo/`)
- ✅ You changed what the app is allowed to do on the phone (Android permissions, like camera or notifications)
- ✅ You changed the app icon or the app name
- ✅ You changed the Capacitor or Gradle setup files

If none of these are true, **stop here**. Just push to `main` and you are done.

---

## Before you start (one-time setup)

Make sure your computer has:

1. **Node.js** and the project installed. In the project folder, run:
   ```sh
   npm install
   ```
2. **Android Studio** installed (it also gives you Java, which the build needs).
3. The file **`android/app/google-services.json`**. It is **not** in the repo, so ask a teammate for it and put
   it in the `android/app/` folder. Without it, push notifications will not work. It must include
   **both** apps (`com.buildcity.app` and `com.buildcity.vendor`).
4. Access to the **Google Play Console** for our apps.

---

## Let's release! Step by step

Pick **one** app to release at a time. In the steps below, we use **`partner`** as the example.
For the customer app, just swap the word `partner` for `customer` (and `Partner` for `Customer`).

### Step 1: Give the app a new version number

Open the file `android/app/build.gradle`. Find the block for your app (`customer { ... }` or
`partner { ... }`). You will see two lines like this:

```gradle
versionCode 2
versionName "1.1"
```

Change them:

- **`versionCode`**: add 1 to it (for example, `2` becomes `3`). The Play Store **refuses** an upload if this
  number is not bigger than the last one you uploaded.
- **`versionName`**: this is the version people see, like `"1.1"`. Make it bigger too (for example, `"1.2"`).

Save the file.

### Step 2: Get the app ready

Open a terminal in the project folder and run:

```sh
npm run android:partner
```

(For the customer app: `npm run android:customer`.)

This does all the boring prep work for you: it builds the website part of the app and copies it into the
Android project.

> ⚠️ **Important:** Always run this right before building. Both apps share some files, so if you last
> prepared the *customer* app and now build the *partner* app without running this, you get a mixed-up app.

### Step 3: Build the app file

Still in the terminal, run:

```sh
cd android
./gradlew bundlePartnerRelease
```

(For the customer app: `./gradlew bundleCustomerRelease`.)

Wait until it says **BUILD SUCCESSFUL**. This can take a few minutes the first time.

<details>
<summary>Prefer clicking buttons? Use Android Studio instead</summary>

1. Open the `android/` folder in Android Studio.
2. Open the **Build Variants** panel (on the left side) and choose `partnerRelease` (or `customerRelease`).
3. From the top menu, click **Build → Generate Signed App Bundle**, and follow the steps.

</details>

### Step 4: Find your app file

Your finished app is a file that ends in **`.aab`**. You will find it here:

- Partner app: `android/app/build/outputs/bundle/partnerRelease/app-partner-release.aab`
- Customer app: `android/app/build/outputs/bundle/customerRelease/app-customer-release.aab`

### Step 5: Upload it to the Play Store

1. Go to the **Google Play Console** and open the **right** app (BuildCity *or* BuildCity Partner, be careful
   not to mix them up!).
2. Go to **Release**, pick a track (for example **Production**, or **Internal testing** to try it first)
   and click **Create new release**.
3. Drag your `.aab` file into the upload box.
4. Write a short note about what changed (the "release notes").
5. Click **Next**, check everything, and then **Save** and **Send for review** / **Start rollout**.

Google checks the app, which can take a few hours to a few days. After that, people get the update. 🚀

### Step 6 (customer app only, sometimes): Tell OTA about the new release

If your release **added or upgraded a plugin**, open `scripts/ota-bundle.mjs` and find this line:

```js
const MIN_NATIVE_VERSION = "1.1";
```

Change it to the new `versionName` you set in Step 1 (for example `"1.2"`), then commit and push.

**Why?** New screens might need the new plugin. This line tells older copies of the app (that don't have the
plugin yet) to **not** download those screens until they update from the Play Store. Otherwise, the old
app could break.

### Step 7: Save your work

Commit the version number change (and the `MIN_NATIVE_VERSION` change, if you made one) and push it, so the
next person starts from the right numbers.

---

## Quick checklist

- [ ] I really need a release (I changed a plugin, permission, icon/name, or setup)
- [ ] I bumped `versionCode` and `versionName` for the right app
- [ ] I ran `npm run android:<app>` right before building
- [ ] I ran `./gradlew bundle<App>Release` and it said BUILD SUCCESSFUL
- [ ] I uploaded the `.aab` to the **correct** app in the Play Console
- [ ] (Customer app, new plugin) I updated `MIN_NATIVE_VERSION`
- [ ] I committed and pushed my changes

---

## Want to know how it works? (for the curious)

### The Partner app: a window to the website

- When you run `npm run android:partner`, the script (`scripts/android.mjs`) tells the app to open
  `https://www.buildcity.in/vendor/login`. Vendors who are already logged in go straight to their dashboard.
- The app also adds a secret word, `BuildCityPartner`, to how it introduces itself to the website (the
  "user agent"). The file `src/config/appMode.js` spots that word and shows the vendor screens. That's how
  **one** website shows the shop in a normal browser but the vendor app inside the Partner app.
- **No internet?** The app shows a friendly offline page (`public/offline.html`) and reloads by itself when
  the internet comes back.
- **Need an app that works without the live website?** Run `npm run android:partner -- --bundled`. This packs
  the vendor screens inside the app instead. But then every change needs a new Play Store release.
- Vendors have to log in **one more time** after they move to the live-website version of the app,
  because their login is now saved on `www.buildcity.in`.

### The Customer app: over-the-air (OTA) updates

It uses a tool called `@capgo/capacitor-updater`. We host the updates ourselves on Vercel (no Capgo account
needed). Here is what happens, like a delivery service:

1. **Packing:** every time `main` is deployed, `npm run build` builds the website and then runs
   `scripts/ota-bundle.mjs`. This packs the screens into a zip file (`dist/ota/customer/<version>.zip`) and
   writes a label saying which zip is newest (`dist/ota/customer/latest.json`).
2. **Asking:** when someone opens the app (or comes back to it), the app asks our server
   (`/api/ota-customer`, the code is in `api/ota-customer.js`): "Is there anything new for me?"
3. **Delivering:** if yes, the app downloads the zip quietly in the background and uses it the **next** time
   the app is opened.
4. **Safety net:** when the new screens start, `src/main.jsx` says "I started fine!"
   (`CapacitorUpdater.notifyAppReady()`). If it doesn't say that within 10 seconds, the app goes back to the
   old screens, so a broken update can't break the app.
