#!/usr/bin/env bash
# Deploy the Express API to Cloud Run. Owner-run only.
# Refuses to deploy until ACE_DEPLOY_CLOUD_RUN=1 is set, so a plain pnpm script
# cannot change the live project by accident.
#
# Region asia-south1 (Mumbai) is Tier 1 and is a Firebase Hosting → Cloud Run
# rewrite region. Billing is request-based (--cpu-throttling). Min instances stay 0.
set -euo pipefail

if [[ "${ACE_DEPLOY_CLOUD_RUN:-}" != "1" ]]; then
  echo "Refusing to deploy. Read docs/DEPLOY_CLOUD_RUN.md, then run:" >&2
  echo "  ACE_DEPLOY_CLOUD_RUN=1 pnpm run deploy:cloud-run" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${GOOGLE_CLOUD_PROJECT:-ace-digital-int-12345}"
REGION="asia-south1"
SERVICE="ace-digital-api"
SA_NAME="ace-digital-api"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

if ! gcloud secrets describe JWT_SECRET --project="${PROJECT}" >/dev/null 2>&1; then
  echo "Secret Manager secret JWT_SECRET is missing in ${PROJECT}." >&2
  echo "Create it before deploying (value is not printed). If Firebase Functions" >&2
  echo "already stores JWT_SECRET, reuse that same value so existing logins work:" >&2
  echo "  firebase functions:secrets:access JWT_SECRET --project ${PROJECT} | \\" >&2
  echo "    gcloud secrets create JWT_SECRET --project=${PROJECT} --data-file=- --replication-policy=automatic" >&2
  echo "Or, for a brand-new secret:" >&2
  echo "  openssl rand -base64 48 | gcloud secrets create JWT_SECRET --project=${PROJECT} --data-file=- --replication-policy=automatic" >&2
  exit 1
fi

echo "Enabling Cloud Run, Cloud Build, Artifact Registry, and Secret Manager APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT}"

if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --project="${PROJECT}" \
    --display-name="Ace Digital API Cloud Run"
fi

RUNTIME_ROLES=(
  roles/datastore.user
  roles/storage.objectAdmin
  roles/firebaseauth.admin
  roles/firebasedatabase.admin
)
for role in "${RUNTIME_ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${role}" \
    --condition=None \
    --quiet >/dev/null
done

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --quiet >/dev/null

grant_secret() {
  local name="$1"
  gcloud secrets add-iam-policy-binding "${name}" \
    --project="${PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
}

SECRETS="JWT_SECRET=JWT_SECRET:latest"
grant_secret JWT_SECRET

OPTIONAL_SECRETS=(
  RESEND_API_KEY
  GEMINI_API_KEY
  GEMINI_API_KEY_FALLBACK
  OPENROUTER_API_KEY
  FIREBASE_WEB_PUSH_VAPID_KEY
  CREDENTIAL_HMAC_SECRET
)
for name in "${OPTIONAL_SECRETS[@]}"; do
  if gcloud secrets describe "${name}" --project="${PROJECT}" >/dev/null 2>&1; then
    grant_secret "${name}"
    SECRETS="${SECRETS},${name}=${name}:latest"
    echo "Mounting secret ${name}"
  else
    echo "Optional secret ${name} not found — skipping"
  fi
done

# Custom delimiter so CORS origins can contain commas.
ENV_VARS="^::^NODE_ENV=production"
ENV_VARS+="::USE_FIRESTORE=true"
ENV_VARS+="::GCLOUD_PROJECT=${PROJECT}"
ENV_VARS+="::FIREBASE_PROJECT_ID=${PROJECT}"
ENV_VARS+="::GOOGLE_CLOUD_PROJECT=${PROJECT}"
ENV_VARS+="::APP_URL=https://app.acedigital.cc"
ENV_VARS+="::APP_LOGIN_URL=https://app.acedigital.cc/login"
ENV_VARS+="::API_PUBLIC_URL=https://app.acedigital.cc"
ENV_VARS+="::FIREBASE_STORAGE_BUCKET=${PROJECT}.firebasestorage.app"
ENV_VARS+="::FIREBASE_DATABASE_URL=https://${PROJECT}-default-rtdb.asia-southeast1.firebasedatabase.app"
ENV_VARS+="::GEMINI_MODEL=gemini-2.0-flash"
ENV_VARS+="::EMAIL_FROM=Ace Digital <no-reply@acedigital.cc>"
ENV_VARS+="::CORS_ORIGINS=https://app.acedigital.cc,https://${PROJECT}.web.app,https://${PROJECT}.firebaseapp.com"

echo "Deploying ${SERVICE} in ${REGION} (min instances 0, request-based billing)..."
gcloud run deploy "${SERVICE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --source="${ROOT}" \
  --service-account="${SA_EMAIL}" \
  --min-instances=0 \
  --max-instances=2 \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=80 \
  --timeout=300 \
  --port=8080 \
  --cpu-throttling \
  --cpu-boost \
  --allow-unauthenticated \
  --set-env-vars="${ENV_VARS}" \
  --set-secrets="${SECRETS}"

echo ""
echo "Cloud Run service is up. Deploy Hosting only after this service exists:"
echo "  pnpm run deploy:hosting"
echo "Hosting rewrites /api/** to ${SERVICE} in ${REGION}."
echo "If the container is OOM-killed on startup, redeploy with --memory=1Gi."
