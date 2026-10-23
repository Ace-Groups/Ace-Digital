/* eslint-disable no-undef */
/**
 * FCM background handler — separate from the Vite PWA Workbox service worker.
 * Firebase Messaging looks for this file at /firebase-messaging-sw.js by default.
 *
 * The web SDK config is project-specific and is not stored in git. The page
 * registers this worker with the config on the query string after a build
 * that set VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, and
 * VITE_FIREBASE_MESSAGING_SENDER_ID. Without those, this file does not
 * initialize Firebase.
 */
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
const apiKey = (params.get("apiKey") || "").trim();
const projectId = (params.get("projectId") || "").trim();
const appId = (params.get("appId") || "").trim();
const messagingSenderId = (params.get("messagingSenderId") || "").trim();

if (apiKey && projectId && appId && messagingSenderId) {
  firebase.initializeApp({
    apiKey,
    authDomain: (params.get("authDomain") || "").trim() || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      (params.get("storageBucket") || "").trim() || `${projectId}.firebasestorage.app`,
    messagingSenderId,
    appId,
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || "Ace Digital";
    const body = payload.notification?.body || payload.data?.body || "";
    const link = payload.data?.link || payload.data?.url || "/";

    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-48.png",
      data: { link },
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
      return undefined;
    }),
  );
});
