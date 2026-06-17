# Firebase Project Configuration

This document outlines the setup, collections structure, custom authentication flow, indexes, and storage security rules for Firebase inside the Ace Digital workspace.

---

## 1. Firebase Project Setup

To set up Firebase for this project, create a Firebase project in the Console (e.g. `ace-digital-os`) and follow these steps:

1. **Enable Cloud Firestore**: Start in production mode and choose a location (e.g. `asia-southeast1`).
2. **Enable Firebase Auth**: Go to authentication providers and enable it (used for Custom Token signIn).
3. **Enable Firebase Storage**: Enable cloud storage to host user avatars and chat attachments.
4. **Generate Service Account Private Key**:
   - Go to Project Settings -> Service Accounts.
   - Click **Generate New Private Key** and save the JSON file.
   - Stringify this JSON file as a single-line value to set as `FIREBASE_SERVICE_ACCOUNT_JSON` on your API server.

---

## 2. Custom Authentication Flow

Rather than using Firebase Auth providers directly on the client, Ace Digital routes auth through the API server to maintain a single source of truth (PostgreSQL or Firestore):

```
Client (Auth Screen) ---> API Server (/v1/auth/login)
                                |
                   Verifies Postgres/Firestore password
                                |
                   Generates custom signed JWT token
                                |
Client <------------------------+
   |
   +---> API Server (/v1/auth/firebase-custom-token)
                  |
         Generates signed Firebase Custom Token (using Admin SDK)
                  |
Client <----------+
   |
Client (signInWithCustomToken) ---> Firebase Auth Server
```

Once logged in, the client's Firebase SDK carries out Firestore real-time reads and Storage uploads securely.

---

## 3. Firestore Collections Schema

The Firestore database uses the following collections schema (mapped in `lib/db/src/store/firestore.ts`):

### `users`
Documents are keyed by User ID (`String(id)`).
- `id`: `number`
- `fullName`: `string`
- `email`: `string`
- `role`: `string`
- `avatarUrl`: `string | null`

### `channels`
Documents are keyed by Channel ID.
- `id`: `number`
- `name`: `string`
- `type`: `"TEAM" | "ANNOUNCEMENT" | "DM"`
- `messageCount`: `number`
- `lastPostAt`: `string` (ISO timestamp)

### `channels/{channelId}/messages` (Real-time Chat Path)
Subcollection inside each channel document. Messages are keyed by Message ID.
- `channelId`: `number`
- `senderId`: `number`
- `senderName`: `string | null`
- `senderAvatar`: `string | null`
- `body`: `string`
- `messageKind`: `"text" | "poll" | "event" | "system"`
- `metadata`: `map` (votes, RSVPs, etc.)
- `attachments`: `array` (urls, filenames, sizes, types)
- `createdAt`: `string` (ISO timestamp)

### `messages` (Flat Index)
Duplicates messages at the root collection level for quick query indexing and search.

---

## 4. Firestore Index Requirements

Firestore queries require compound indexes to fetch messages sorted by date. Deploy the following configuration in your `firebase/firestore.indexes.json` or configure them in the console:

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "parentMessageId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 5. Storage Security Rules

Configure the following security rules in Firebase Storage to allow authenticated users to upload files and download attachments:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow read/write if the request includes a valid Auth UID (Custom Token authenticated)
      allow read, write: if request.auth != null;
    }
  }
}
```
