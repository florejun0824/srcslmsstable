// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * This is a secure Cloud Function that creates multiple users.
 * It is called from the Admin Dashboard.
 */
exports.createMultipleUsers = functions.https.onCall(async (data, context) => {
  // Check if the user making the request is an admin.
  // This is our security check.
  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only administrators can create new users.",
    );
  }

  const usersToCreate = data.users;
  if (!usersToCreate || !Array.isArray(usersToCreate)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with an array of users.",
    );
  }

  const createdUsers = [];
  const errors = [];

  // Loop through each user object sent from the admin panel
  for (const userRecord of usersToCreate) {
    const {email, password, firstName, lastName, role, gradeLevel} = userRecord;

    try {
      // 1. Create the user in Firebase Authentication
      const userAuthRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: `${firstName} ${lastName}`,
      });

      // 2. Set the custom role claim for security rules
      await admin.auth().setCustomUserClaims(userAuthRecord.uid, {role: role});

      // 3. Create the user document in Firestore with the SAME ID
      const userDocRef = admin.firestore().collection("users").doc(userAuthRecord.uid);
      await userDocRef.set({
        firstName,
        lastName,
        email,
        role,
        gradeLevel: gradeLevel || null, // Add grade level if it exists
        // DO NOT store the password here
      });

      createdUsers.push({email: userAuthRecord.email, status: "success"});
    } catch (error) {
      console.error(`Failed to create user ${email}:`, error);
      errors.push({email: email, status: "error", message: error.message});
    }
  }

  return {
    message: "User creation process completed.",
    createdCount: createdUsers.length,
    errorCount: errors.length,
    errors: errors,
  };
});