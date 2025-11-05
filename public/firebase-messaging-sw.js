// public/firebase-messaging-sw.js

// Import and initialize the Firebase SDK
importScripts("https.www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwzXvo1MhL8Uj9UlhhMu4_LPB013SW2ig",
  authDomain: "srcs-log-book.firebaseapp.com",
  projectId: "srcs-log-book",
  storageBucket: "srcs-log-book.firebasestorage.app",
  messagingSenderId: "1016390403599",
  appId: "1:1016390403599:web:303b35a99b0f2260a2057a",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

/**
 * Handle background messages.
 * This function will be called when the app is in the background or closed.
 */
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message: ",
    payload
  );

  // Customize the notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192.webp", // Make sure you have a 'logo192.png' in your 'public' folder
    vibrate: [250], // Vibrate for 250ms
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});