// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Updated imports for new persistence method
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
// 白 ENV CHECK
// ----------------------
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error(
    "CRITICAL ERROR: Firebase API Key is not defined. Please check your .env file."
  );
}

// ----------------------
// 肌 FIREBASE CONFIG
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
// 伯 INITIALIZE FIREBASE
// ----------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// FIX: Replaced deprecated getFirestore(app) + enableIndexedDbPersistence()
// with initializeFirestore() + the new localCache settings.
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        // This manages persistence across multiple tabs, replacing the need 
        // for manual error handling on "failed-precondition"
        tabManager: persistentMultipleTabManager()
    })
});

const storage = getStorage(app);
const functions = getFunctions(app);

// The old enableIndexedDbPersistence() block has been removed as persistence
// is now configured during initialization above.

// ----------------------
// 笞｡ CONNECT FUNCTIONS EMULATOR (LOCAL)
// ----------------------
if (window.location.hostname === "localhost") {
  console.log("Hybrid Mode: LIVE Auth/Firestore, LOCAL Functions emulator.");
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// ----------------------
// 東 HELPERS
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
// 売 EXPORT SERVICES
// ----------------------
export { db, auth, storage, functions, app };