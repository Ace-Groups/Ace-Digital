import { createFirestoreStore } from "../../lib/db/src/store/firestore";
import { DEFAULT_SIGNATURE_DATA_URL } from "../../artifacts/api-server/src/lib/credentials/default-signature";

const store = createFirestoreStore();
const db = store.db;

async function main() {
  const docRef = db.collection("org_credential_settings").doc("default");
  const doc = await docRef.get();

  const orgPatch = {
    verifyBaseUrl: "https://acedigital.cc",
    defaultIdCardSignatoryUserId: 1,
    defaultCertificateSignatoryUserId: 1,
    updatedAt: new Date().toISOString()
  };

  if (doc.exists) {
    console.log("Current Firestore settings:", doc.data());
    await docRef.update(orgPatch);
    console.log("Successfully updated default settings in Firestore.");
  } else {
    console.log("org_credential_settings default doc not found in Firestore. Creating it now...");
    await docRef.set({
      ...orgPatch,
      createdAt: new Date().toISOString()
    });
    console.log("Successfully created default settings in Firestore.");
  }

  // Seed default signatory profile for user ID 1 (Kavin Balaji)
  const sigRef = db.collection("signatory_profiles").doc("1");
  await sigRef.set({
    userId: 1,
    documentDesignation: "Managing Director",
    signatureDataUrl: DEFAULT_SIGNATURE_DATA_URL,
    enabled: true,
    updatedAt: new Date().toISOString()
  });
  console.log("Successfully seeded signatory profile for user 1 (Kavin Balaji) in Firestore.");
}

main().catch((err) => {
  console.error("Error updating settings:", err);
  process.exit(1);
});
