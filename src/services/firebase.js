// src/services/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, doc, setDoc } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

// This check ensures your .env file is being loaded correctly.
if (!process.env.REACT_APP_FIREBASE_API_KEY) {
  throw new Error("CRITICAL ERROR: Firebase API Key is not defined. Please check your .env file.");
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: "srcs-log-book.firebasestorage.app", // Your hardcoded bucket
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// These services will connect to your LIVE Firebase project in the cloud
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize the Functions service
const functions = getFunctions(app);

// ✅ FIX: This block now connects ONLY the Functions service to your local emulator
// when you are running the app on localhost. Auth and Firestore will use the live services.
if (window.location.hostname === "localhost") {
  console.log("Hybrid Mode: Connecting to LIVE Auth/Firestore and LOCAL Functions emulator.");
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// ----------------------
// 📌 Helper: Update Lesson
// ----------------------
export const updateLesson = async (lesson) => {
  if (!lesson?.id) throw new Error("Lesson ID is required to update");

  const lessonRef = doc(db, "lessons", lesson.id);
  await setDoc(lessonRef, lesson, { merge: true });
};

// Export all services for your application to use
export { db, auth, storage, functions, app };
