/* eslint-disable no-undef */
/**
 * FCM background handler — separate from the Vite PWA Workbox service worker.
 * Firebase Messaging looks for this file at /firebase-messaging-sw.js by default.
 */
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAN2QCws2eizQX9PTyTftLClB3WMauxG3c",
  authDomain: "ace-digital-os.firebaseapp.com",
  projectId: "ace-digital-os",
  storageBucket: "ace-digital-os.firebasestorage.app",
  messagingSenderId: "468590312757",
  appId: "1:468590312757:web:90d5fa23bd3cb78e68e07c",
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
