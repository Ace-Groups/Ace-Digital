# Mobile App (Expo) Setup and Guide

This document describes how to configure, run, and build the React Native mobile application using Expo.

---

## 1. Local Development Setup

The mobile app is located in `artifacts/ace-digital-mobile` and built using Expo SDK 54.

### Prerequisites
- Node.js (v18+)
- `pnpm` installed globally
- Expo Go app installed on your physical device (iOS/Android), or an active simulator.

### Running the App
1. Open your terminal in the workspace root.
2. Run the Metro bundler:
   ```bash
   pnpm --filter @workspace/ace-digital-mobile run start
   ```
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android) to load the project.

---

## 2. Environment Variables

The app loads environment configuration from `artifacts/ace-digital-mobile/.env`. You must define the API server endpoint:

```ini
# Points to local dev machine (e.g. using local IP or localhost)
EXPO_PUBLIC_API_URL=http://localhost:8080

# OR points to the production server on Render
# EXPO_PUBLIC_API_URL=https://ace-digital-api.onrender.com
```

*Note: On physical devices, do not use `localhost` or `127.0.0.1`. Instead, use your machine's local network IP address (e.g. `http://192.168.1.100:8080`).*

---

## 3. Metro Configuration & CORS

Because Expo runs Metro on port `8081`, the API server's CORS configuration must permit requests from port `8081` to avoid network errors:

- **Local Server**: Local environment automatically allows all CORS requests.
- **Production Server**: Ensure `CORS_ORIGINS` includes `http://localhost:8081` (or your local IP) if debugging against the live Render server.

---

## 4. Query Client Caching & Synchronization

The mobile app uses `@tanstack/react-query` to cache server responses and ensure sub-second UI updates:

- **Key Structures**:
  - `['channel', id]`: Fetches metadata for specific channels.
  - `['channel-messages', id]`: Fetches messages logs.
- **Pull-To-Refresh**:
  All primary screens (`index.tsx`, `tasks.tsx`, `projects.tsx`, `chat.tsx`, and `[id].tsx`) use a `manualRefreshing` state wrapper to handle pull-to-refresh. This prevents refresh spinners from hanging.
- **Socket Updates**:
  When the device is connected to the API WebSocket server, polling is disabled. Updates are pushed live via `message:new` and `message:persisted` socket handlers, updating the query cache directly and scrolling the FlatList to the bottom.
