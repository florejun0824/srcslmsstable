// src/services/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager,
    doc, 
    setDoc 
} from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

// ----------------------
// 🚨 ENV CHECK
// ----------------------
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error(
    "CRITICAL ERROR: Firebase API Key is not defined. Please check your .env file."
  );
}

// ----------------------
// 🔥 FIREBASE CONFIG
// ----------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ----------------------
// 🚀 INITIALIZE FIREBASE
// ----------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ----------------------
// 💾 DATABASE (WITH OFFLINE PERSISTENCE)
// ----------------------
// Replaces getFirestore(app) to enable robust offline support
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        // This tabManager allows multiple tabs to share the same offline database
        // without crashing or blocking each other.
        tabManager: persistentMultipleTabManager()
    })
});

const storage = getStorage(app);
const functions = getFunctions(app);

// ----------------------
// 🛠️ CONNECT FUNCTIONS EMULATOR (LOCAL)
// ----------------------
if (window.location.hostname === "localhost") {
  console.log("Hybrid Mode: LIVE Auth/Firestore, LOCAL Functions emulator.");
  // Uncomment the line below if you are running the emulator locally
  // connectFunctionsEmulator(functions, "localhost", 5001);
}

// ----------------------
// ⚡ HELPERS
// ----------------------
export const updateLesson = async (lesson) => {
  if (!lesson?.id) throw new Error("Lesson ID is required to update");
  const lessonRef = doc(db, "lessons", lesson.id);
  await setDoc(lessonRef, lesson, { merge: true });
};

export const addLesson = async (lesson) => {
  if (!lesson?.id) throw new Error("Lesson ID is required to add");
  const lessonRef = doc(db, "lessons", lesson.id);
  await setDoc(lessonRef, lesson);
};

// ----------------------
// 📦 EXPORT SERVICES
// ----------------------
export { db, auth, storage, functions, app };