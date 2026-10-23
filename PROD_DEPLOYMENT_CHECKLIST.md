# Ace Digital OS: Production Deployment Checklist

This document outlines the exact step-by-step actions required to deploy the Ace Digital company portals to production under the custom domain `acedigital.cc` and prepare the system for iOS App Store and Google Play Store submission.

---

## 🔗 Direct Dashboard Links

* **Firebase Console**: [console.firebase.google.com/project/ace-digital-os](https://console.firebase.google.com/project/ace-digital-os)
* **Render Dashboard**: [dashboard.render.com](https://dashboard.render.com)
* **Expo Developer Dashboard**: [expo.dev](https://expo.dev)
* **Google Play Console**: [play.google.com/console](https://play.google.com/console)
* **Apple Developer Portal**: [developer.apple.com/account](https://developer.apple.com/account)
* **App Store Connect**: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---

## 1. Domain Configuration

`acedigital.cc` is the public marketing website. Leave its apex and `www` records alone. The employee app uses the subdomain `app.acedigital.cc` on Firebase Hosting site `ace-digital-app`.

### A. Employee app (Firebase Hosting site `ace-digital-app`)
1. Create the site once: `npx firebase-tools@latest hosting:sites:create ace-digital-app --project ace-digital-os`
2. Deploy: `pnpm run deploy:hosting:render`
3. In **Firebase Console** -> **Hosting** -> site **ace-digital-app** -> **Add custom domain** -> `app.acedigital.cc`.
4. Add the DNS records Firebase shows. For this subdomain that is usually a TXT record to prove you own the domain, then a **CNAME** for host `app` pointing at `ace-digital-app.web.app`. Use the values Firebase prints if they differ.

### B. Backend API (Render)
1. Go to the **Render Dashboard**, select your `ace-digital-api` Web Service.
2. Click **Settings** -> **Custom Domains** -> **Add Custom Domain**.
3. Enter `api.acedigital.cc` only if you want the API on that name. The SPA is already built to call `https://ace-digital-api.onrender.com`.
4. Render will ask for a **CNAME** from `api` to `ace-digital-api.onrender.com`.

### DNS to add for the employee app

| Type | Host/Name | Value/Points To | Purpose |
|---|---|---|---|
| **TXT** | *(what Firebase shows)* | *(copy from Firebase)* | Prove you own `acedigital.cc` for the `app` host |
| **CNAME** | `app` | `ace-digital-app.web.app` | Employee app. Do not change the apex `@` record |
| **CNAME** | `api` | `ace-digital-api.onrender.com` | Optional API hostname |

---

## 2. Environment Variables & Credentials Update

### A. Render API Server Configuration
In the **Render Dashboard**, select your `api-server` service, click **Environment** -> **Add Environment Variable**, and populate/update the following values:

| Variable Name | Production Value / Instruction |
|---|---|
| `NODE_ENV` | `production` |
| `USE_FIRESTORE` | `true` |
| `FIREBASE_PROJECT_ID` | `ace-digital-os` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Go to Firebase Console -> Project Settings -> Service Accounts -> Click **Generate New Private Key**. Copy the entire JSON content, convert it into a single-line string, and paste it here. |
| `JWT_SECRET` | Generate a strong 32+ character random string (e.g., run `openssl rand -base64 32` in your local terminal). |
| `REDIS_URL` | Enter the connection string for your production Redis server (needed for message workers and chat queues). |
| `CORS_ORIGINS` | `https://app.acedigital.cc,https://ace-digital-app.web.app,https://ace-digital-app.firebaseapp.com` |
| `EMAIL_FROM` | `Ace Digital <no-reply@acedigital.cc>` |
| `RESEND_API_KEY` | Your production Resend API Key (used to email ID cards and payslips to employees). |
| `GEMINI_API_KEY` | Your Google Gemini API Key (used for the Ace AI assistant). |

---

## 3. Deep Linking Verification Updates

Before publishing, you must replace the placeholders in the verification files with your actual credentials:

### A. iOS Universal Links (`apple-app-site-association`)
In [apple-app-site-association](file:///Users/kavin/Documents/GitHub/Ace%20Digital/artifacts/ace-digital-os/public/.well-known/apple-app-site-association):
1. Locate the `"appID": "8W3G58M9Y8.cc.acedigital.app"` entry.
2. Replace `8W3G58M9Y8` with your actual **Apple Developer Team ID** (found in your Apple Developer account under Membership Details).

### B. Android App Links (`assetlinks.json`)
In [assetlinks.json](file:///Users/kavin/Documents/GitHub/Ace%20Digital/artifacts/ace-digital-os/public/.well-known/assetlinks.json):
1. You must get the SHA-256 signature of your release key.
2. **If using EAS build**: Run this command in the `artifacts/ace-digital-mobile` directory:
   ```bash
   eas credentials
   ```
   Select `Android` -> `production` -> Copy the **SHA-256 fingerprint**.
3. **If using Google Play App Signing**: Go to Google Play Console -> select your app -> **Setup** -> **App Integrity** -> Copy the **SHA-256 certificate fingerprint** from the App Signing Certificate section.
4. Replace `YOUR_SHA256_FINGERPRINT_PLACEHOLDER` inside `assetlinks.json` with this fingerprint.

---

## 4. Run the Production Deployment

Once environment variables and verification placeholders are updated, push the latest files to live:

### A. Deploy Web Portal & Firebase Functions
Run the following script command from the root folder to compile the web app with custom headers, copy assets, and deploy to Firebase:
```bash
pnpm run deploy:production
```

### B. Create an App Reviewer Test Account
App Store reviewers (Apple and Google) **will reject your app** if you do not provide a working test account.
1. Run the RBAC seeding script locally targeting your production Firestore instance:
   ```bash
   CONFIRM_RESET=ace-digital-os USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os pnpm --filter @workspace/scripts run seed:rbac-dev
   ```
   *Note: Ensure you have authenticated using the Firebase CLI (`firebase login`) and have owner rights on the project.*
2. Write down the reviewer credentials (e.g., `reviewer@acedigital.cc` / `ReviewerPassword@123`) and submit them under the **App Review Information** fields in App Store Connect and Google Play Console.

---

## 5. Build and Submit Mobile App

In the `artifacts/ace-digital-mobile` directory, run the EAS commands to compile release builds:

### iOS (App Store Connect / TestFlight)
1. Initialize iOS build credentials and trigger compile:
   ```bash
   eas build --platform ios --profile production
   ```
2. Once the build completes, submit it directly to App Store Connect:
   ```bash
   eas submit --platform ios
   ```

### Android (Google Play Console / Internal Testing)
1. Trigger Android compilation:
   ```bash
   eas build --platform android --profile production
   ```
2. Submit the generated AAB bundle to the Google Play Store console:
   ```bash
   eas submit --platform android
   ```
