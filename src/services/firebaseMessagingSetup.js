// src/services/firebaseMessagingSetup.js

import { getMessaging, getToken } from "firebase/messaging";
import { app, db } from "./firebase"; // Import your main firebase app and db
import { doc, updateDoc } from "firebase/firestore";

// --- IMPORTANT ---
// You must create a 'firebase-messaging-sw.js' file
// in your 'public' folder for this to work in the background.
// (I will provide the code for that file after this one)

// Initialize messaging
const messaging = getMessaging(app);

/**
 * Requests permission to show notifications and saves the token.
 * @param {string} userId - The ID of the currently logged-in user.
 */
export const requestNotificationPermission = async (userId) => {
  if (!userId) {
    console.log("Cannot request permission, no user ID provided.");
    return;
  }

  console.log("Requesting notification permission...");

  try {
    // 1. Check current permission status
    if (Notification.permission === "granted") {
      console.log("Notification permission already granted.");
      await getAndSaveToken(userId);
      return;
    }

    // 2. If not denied, request permission
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        console.log("Notification permission granted!");
        await getAndSaveToken(userId);
      } else {
        console.log("Notification permission denied by user.");
      }
    } else {
      console.log("Notification permission is permanently denied. Cannot request.");
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
};

/**
 * Gets the unique FCM token and saves it to the user's Firestore doc.
 * @param {string} userId - The ID of the currently logged-in user.
 */
const getAndSaveToken = async (userId) => {
  if (!userId) return;

  try {
    // Get the VAPID key from your .env file
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("VITE_FIREBASE_VAPID_KEY is not set in .env file.");
      return;
    }

    // 2. Get the token
    const currentToken = await getToken(messaging, { vapidKey: vapidKey });

    if (currentToken) {
      console.log("FCM Token:", currentToken);
      
      // 3. Save the token to Firestore
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        fcmToken: currentToken
      });
      console.log("Token saved to user document.");

    } else {
      console.log("No registration token available. Request permission.");
    }
  } catch (error) {
    console.error("Error getting or saving FCM token:", error);
  }
};