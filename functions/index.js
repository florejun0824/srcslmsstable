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

/**
 * This function triggers automatically when a user is deleted from
 * Firebase Authentication and cleans up their associated data in Firestore.
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;
  const db = admin.firestore();

  console.log(`User ${userId} is being deleted. Cleaning up Firestore data...`);

  try {
    // 1. Delete the user's profile from the 'users' collection.
    await db.collection('users').doc(userId).delete();
    console.log(`Successfully deleted profile for user ${userId}.`);

    // 2. OPTIONAL: Delete the student from any classes they were in.
    const enrollmentsQuery = db.collection('enrollments').where('studentId', '==', userId);
    const snapshot = await enrollmentsQuery.get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        console.log(`Deleting enrollment record: ${doc.id}`);
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    
    console.log(`Cleanup complete for user ${userId}.`);

  } catch (error) {
    console.error(`Error cleaning up data for user ${userId}`, error);
  }
});


// --- NEW FUNCTIONS FOR ADMIN DASHBOARD FEATURES ---

/**
 * Updates a user's role ONLY in the Firestore database.
 * Can only be called by an existing admin.
 */
exports.updateUserRole = functions.https.onCall(async (data, context) => {
    // Security Check: Ensure the caller is an admin
    if (context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can change user roles.');
    }

    const { userId, newRole } = data;
    if (!userId || !newRole) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a userId and newRole.');
    }

    try {
        // As requested, this only updates the display role in Firestore.
        // This does NOT change the user's actual security permissions.
        await admin.firestore().collection('users').doc(userId).update({ role: newRole });

        return { success: true, message: `Successfully updated display role for user ${userId} to ${newRole}.` };
    } catch (error) {
        console.error("Error updating user role:", error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating the user role.');
    }
});

/**
 * Disables/enables a user in Firebase Auth and sets a restriction flag in Firestore.
 * Can only be called by an existing admin.
 */
exports.setUserRestrictionStatus = functions.https.onCall(async (data, context) => {
    // Security Check: Ensure the caller is an admin
    if (context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can restrict accounts.');
    }

    const { userId, shouldRestrict } = data;
    if (!userId || typeof shouldRestrict !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a userId and a boolean restriction status.');
    }

    try {
        // 1. Disable/enable the user in Firebase Authentication to block/allow login
        await admin.auth().updateUser(userId, { disabled: shouldRestrict });

        // 2. Set the restriction flag in the user's Firestore document for display
        await admin.firestore().collection('users').doc(userId).update({ isRestricted: shouldRestrict });

        const action = shouldRestrict ? 'restricted' : 'unrestricted';
        return { success: true, message: `Successfully ${action} user ${userId}.` };
    } catch (error) {
        console.error("Error setting user restriction status:", error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating the user restriction status.');
    }
});
