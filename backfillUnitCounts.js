// Load environment variables from the .env file
require('dotenv').config();

// Import the necessary Firebase functions
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, writeBatch } = require('firebase/firestore');

// ✅ FIXED: Use the variable names with the "REACT_APP_" prefix
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function backfill() {
  console.log("Starting backfill process...");

  const coursesRef = collection(db, 'courses');
  const unitsRef = collection(db, 'units');
  const coursesSnapshot = await getDocs(coursesRef);

  if (coursesSnapshot.empty) {
    console.log("No courses found. Exiting.");
    return;
  }

  const batch = writeBatch(db);
  let updates = 0;

  console.log(`Found ${coursesSnapshot.size} courses to process.`);

  // Loop through each course
  for (const courseDoc of coursesSnapshot.docs) {
    const courseId = courseDoc.id;
    const courseData = courseDoc.data();

    // Query to find all units for the current course
    const unitsQuery = query(unitsRef, where('subjectId', '==', courseId));
    const unitsSnapshot = await getDocs(unitsQuery);
    const actualUnitCount = unitsSnapshot.size;

    // If the count on record is different, or doesn't exist, update it
    if (courseData.unitCount !== actualUnitCount) {
      const courseDocRef = doc(db, 'courses', courseId);
      batch.update(courseDocRef, { unitCount: actualUnitCount });
      console.log(`Updating course "${courseData.title || 'Untitled'}" (${courseId}) with count: ${actualUnitCount}`);
      updates++;
    }
  }

  if (updates > 0) {
    await batch.commit();
    console.log(`\n✅ Successfully committed ${updates} updates to the database.`);
  } else {
    console.log("\nNo updates needed. All course unit counts are already correct.");
  }

  console.log("Backfill process complete!");
}

backfill().catch(console.error);