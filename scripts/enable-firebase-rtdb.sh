#!/usr/bin/env bash
# Creates the default Firebase Realtime Database instance (one-time per project).
# Requires: firebase CLI logged in with Owner/Editor on ace-digital-os.
set -euo pipefail

PROJECT="${FIREBASE_PROJECT:-ace-digital-os}"
LOCATION="${RTDB_LOCATION:-asia-southeast1}"

echo "Enabling Realtime Database for project: ${PROJECT}"
echo "Region: ${LOCATION}"
echo ""
echo "If the CLI cannot create the first instance, open:"
echo "  https://console.firebase.google.com/project/${PROJECT}/database"
echo "  → Create Database → ${LOCATION} → Start in locked mode"
echo ""

if firebase database:instances:create default --location "${LOCATION}" --project "${PROJECT}"; then
  echo "RTDB instance created."
  firebase deploy --only database --project "${PROJECT}"
  echo "Done. databaseURL:"
  if [[ "${LOCATION}" == "us-central1" ]]; then
    echo "  https://${PROJECT}-default-rtdb.firebaseio.com"
  else
    echo "  https://${PROJECT}-default-rtdb.${LOCATION}.firebasedatabase.app"
  fi
else
  echo "Create the instance in the Firebase Console, then run:"
  echo "  firebase deploy --only database --project ${PROJECT}"
  exit 1
fi
