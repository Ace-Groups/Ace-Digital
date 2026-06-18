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

## 1. Domain Configuration for `acedigital.cc`

You need to configure DNS records in your domain registrar (e.g. GoDaddy, Cloudflare, Namecheap) to connect the Web Portal and the Backend API.

### A. Web Portal (Firebase Hosting)
1. Go to **Firebase Console** -> **Build** -> **Hosting**.
2. Click **Add Custom Domain** and enter `acedigital.cc` (and optionally `www.acedigital.cc`).
3. Firebase will ask you to verify ownership by adding a **TXT record** to your DNS settings. Copy the TXT hostname and value and add it in your registrar.
4. Once verified, Firebase will provide **A records** (typically two IP addresses like `199.36.158.100` and `199.36.158.105`). Add these as **A records** in your registrar pointing to the `@` (root) host.

### B. Backend API (Render)
1. Go to the **Render Dashboard**, select your `api-server` Web Service.
2. Click **Settings** -> Scroll down to **Custom Domains** -> click **Add Custom Domain**.
3. Enter `api.acedigital.cc`.
4. Render will ask you to add a **CNAME record** in your registrar pointing `api` to your Render service address (e.g., `ace-digital-api.onrender.com`). Add this record in your registrar.

### Summary of Required DNS Records in your Registrar:

| Type | Host/Name | Value/Points To | Purpose |
|---|---|---|---|
| **TXT** | `@` (or empty) | *[Copy from Firebase Hosting]* | Domain ownership verification |
| **A** | `@` (or empty) | `199.36.158.100` | Points `acedigital.cc` to Web Portal |
| **A** | `@` (or empty) | `199.36.158.105` | Points `acedigital.cc` to Web Portal (secondary IP) |
| **CNAME** | `www` | `ace-digital-os.web.app` | Redirects `www.acedigital.cc` to Web Portal |
| **CNAME** | `api` | `ace-digital-api.onrender.com` | Points `api.acedigital.cc` to Express API |

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
| `CORS_ORIGINS` | `https://acedigital.cc,https://www.acedigital.cc` (Allows the web app to query the API). |
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
