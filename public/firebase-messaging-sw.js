// public/firebase-messaging-sw.js

// 1. Import the Firebase SDK (Compat Version)
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// 2. Your project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwzXvo1MhL8Uj9UlhhMu4_LPB013SW2ig",
  authDomain: "srcs-log-book.firebaseapp.com",
  projectId: "srcs-log-book",
  storageBucket: "srcs-log-book.firebasestorage.app",
  messagingSenderId: "1016390403599",
  appId: "1:1016390403599:web:303b35a99b0f2260a2057a",
};

// 3. Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/**
 * Handle background messages
 * This triggers when the app is not in the active tab.
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received: ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192.webp", 
    vibrate: [250],
    // Store the data (like meeting links) so it can be accessed on click
    data: {
      url: payload.data?.meetingLink || '/student',
      type: payload.data?.type
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification clicks
 * This opens the meeting link or dashboard when the student taps the alert.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open, otherwise open new
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes('srcs-log-book') && 'focus' in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});