# Ace Digital OS: Production Deployment Checklist

This document outlines the exact step-by-step actions required to deploy the Ace Digital company portals to production under the custom domain `acedigital.cc` and prepare the system for iOS App Store and Google Play Store submission.

---

## 🔗 Direct Dashboard Links

* **Firebase Console**: [console.firebase.google.com/project/ace-digital-int-12345](https://console.firebase.google.com/project/ace-digital-int-12345)
* **Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com/run?project=ace-digital-int-12345)
* **Expo Developer Dashboard**: [expo.dev](https://expo.dev)
* **Google Play Console**: [play.google.com/console](https://play.google.com/console)
* **Apple Developer Portal**: [developer.apple.com/account](https://developer.apple.com/account)
* **App Store Connect**: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---

## 1. Domain Configuration

`acedigital.cc` is the public marketing website. Leave its apex and `www` records alone. The employee app uses the subdomain `app.acedigital.cc` on the default Firebase Hosting site `ace-digital-int-12345` in project `ace-digital-int-12345`.

### A. Employee app (default Hosting site `ace-digital-int-12345`)
1. Do not create a second site. `firebase.json` already sets `"site": "ace-digital-int-12345"`.
2. Deploy: `pnpm run deploy:hosting` (only after Cloud Run service `ace-digital-api` exists — see [docs/DEPLOY_CLOUD_RUN.md](docs/DEPLOY_CLOUD_RUN.md))
3. In **Firebase Console** -> **Hosting** -> site **ace-digital-int-12345** -> **Add custom domain** -> `app.acedigital.cc`.
4. Add the DNS records Firebase shows. For this subdomain that is usually a TXT record to prove you own the domain, then a **CNAME** for host `app` pointing at `ace-digital-int-12345.web.app`. Use the values Firebase prints if they differ.
5. On the empty Firestore, create the owner before login: `USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-int-12345 ADMIN_EMAIL='admin@acedigital.cc' ADMIN_PASSWORD='at-least-12-characters' pnpm --filter @workspace/scripts run bootstrap:owner`

### B. Backend API (Cloud Run)

The SPA calls same-origin `/api`. You do not need an `api.acedigital.cc` DNS record.

```bash
ACE_DEPLOY_CLOUD_RUN=1 pnpm run deploy:cloud-run
```

That sets min instances 0, max instances 2, region `asia-south1`, request-based billing, and mounts Secret Manager. Details and the cost estimate: [docs/DEPLOY_CLOUD_RUN.md](docs/DEPLOY_CLOUD_RUN.md) and [docs/PRODUCTION.md](docs/PRODUCTION.md).

### DNS to add for the employee app

| Type | Host/Name | Value/Points To | Purpose |
|---|---|---|---|
| **TXT** | *(what Firebase shows)* | *(copy from Firebase)* | Prove you own `acedigital.cc` for the `app` host |
| **CNAME** | `app` | `ace-digital-int-12345.web.app` | Employee app. Do not change the apex `@` record |

---

## 2. Environment Variables & Credentials Update

### A. Cloud Run API

`scripts/deploy-cloud-run.sh` sets these. Secrets are Secret Manager names, not values in git.

| Variable Name | Production Value / Instruction |
|---|---|
| `NODE_ENV` | `production` |
| `USE_FIRESTORE` | `true` |
| `FIREBASE_PROJECT_ID` | `ace-digital-int-12345` |
| `GOOGLE_CLOUD_PROJECT` | `ace-digital-int-12345` |
| `JWT_SECRET` | Secret Manager secret `JWT_SECRET` (mounted, not a plain env var). |
| `CORS_ORIGINS` | `https://app.acedigital.cc,https://ace-digital-int-12345.web.app,https://ace-digital-int-12345.firebaseapp.com` |
| `APP_URL` | `https://app.acedigital.cc` |
| `APP_LOGIN_URL` | `https://app.acedigital.cc/login` |
| `API_PUBLIC_URL` | `https://app.acedigital.cc` |
| `EMAIL_FROM` | `Ace Digital <no-reply@acedigital.cc>` |
| `RESEND_API_KEY` | Optional Secret Manager secret, for welcome and reset mail. |
| `GEMINI_API_KEY` | Optional Secret Manager secret, for Ace AI. |

Do not set `REDIS_URL` or `FIREBASE_SERVICE_ACCOUNT_JSON` on Cloud Run. Leave minimum instances at 0.

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

### A. Deploy the API, then the web app

Cloud Run first, then Hosting (the rewrite needs the service to exist):

```bash
ACE_DEPLOY_CLOUD_RUN=1 pnpm run deploy:cloud-run
pnpm run deploy:hosting
```

`pnpm run deploy:production` runs those two steps. It still refuses to deploy until `ACE_DEPLOY_CLOUD_RUN=1` is set. Push functions stay a separate Firebase deploy; see FIREBASE.md.

### B. Create an App Reviewer Test Account
App Store reviewers (Apple and Google) **will reject your app** if you do not provide a working test account.
1. Run the RBAC seeding script locally targeting your production Firestore instance:
   ```bash
   CONFIRM_RESET=ace-digital-int-12345 USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-int-12345 pnpm --filter @workspace/scripts run seed:rbac-dev
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
