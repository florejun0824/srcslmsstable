// functions/index.js

const admin = require("firebase-admin");
admin.initializeApp();

// --- v2-first, v1 fallback setup with console warnings ---
let onCall, onUserDeleted;

// HTTPS Callable
try {
  ({ onCall } = require("firebase-functions/v2/https"));
} catch {
  const functions = require("firebase-functions");
  onCall = functions.https.onCall;
  console.warn("[FALLBACK] Using v1 https.onCall – consider upgrading firebase-functions for v2.");
}

// Auth Trigger (onUserDeleted)
try {
  ({ onUserDeleted } = require("firebase-functions/v2/auth"));
} catch {
  console.warn("[FALLBACK] Using v1 auth.user().onDelete – consider upgrading firebase-functions for v2.");
  const auth = require("firebase-functions/v1/auth");
  onUserDeleted = (handler) => auth.user().onDelete(handler);
}

/**
 * Secure Cloud Function that creates multiple users.
 * Called from the Admin Dashboard.
 */
exports.createMultipleUsers = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  if (!context || context.token.role !== "admin") {
    throw new Error("permission-denied: Only administrators can create new users.");
  }

  const usersToCreate = data.users;
  if (!usersToCreate || !Array.isArray(usersToCreate)) {
    throw new Error("invalid-argument: Must provide an array of users.");
  }

  const createdUsers = [];
  const errors = [];

  for (const userRecord of usersToCreate) {
    const { email, password, firstName, lastName, role, gradeLevel } = userRecord;

    try {
      const userAuthRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });

      await admin.auth().setCustomUserClaims(userAuthRecord.uid, { role });

      await admin.firestore().collection("users").doc(userAuthRecord.uid).set({
        firstName,
        lastName,
        email,
        role,
        gradeLevel: gradeLevel || null,
      });

      createdUsers.push({ email: userAuthRecord.email, status: "success" });
    } catch (error) {
      console.error(`Failed to create user ${email}:`, error);
      errors.push({ email, status: "error", message: error.message });
    }
  }

  return {
    message: "User creation completed.",
    createdCount: createdUsers.length,
    errorCount: errors.length,
    errors,
  };
});

/**
 * Trigger when a user is deleted from Firebase Authentication.
 * Cleans up their associated data in Firestore.
 */
exports.onUserDeleted = onUserDeleted(async (eventOrUser) => {
  // v2 passes event with .uid, v1 passes user with .uid
  const userId = eventOrUser.uid;
  const db = admin.firestore();

  console.log(`User ${userId} is being deleted. Cleaning up Firestore data...`);

  try {
    await db.collection("users").doc(userId).delete();

    const enrollmentsQuery = db.collection("enrollments").where("studentId", "==", userId);
    const snapshot = await enrollmentsQuery.get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    console.log(`Cleanup complete for user ${userId}.`);
  } catch (error) {
    console.error(`Error cleaning up data for user ${userId}`, error);
  }
});

/**
 * Updates a user's role in Firestore (display only).
 */
exports.updateUserRole = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  if (!context || context.token.role !== "admin") {
    throw new Error("permission-denied: Only admins can change roles.");
  }

  const { userId, newRole } = data;
  if (!userId || !newRole) {
    throw new Error("invalid-argument: Must provide userId and newRole.");
  }

  try {
    await admin.firestore().collection("users").doc(userId).update({ role: newRole });
    return { success: true, message: `Updated role for user ${userId} to ${newRole}` };
  } catch (error) {
    console.error("Error updating role:", error);
    throw new Error("internal: Failed to update role.");
  }
});

/**
 * Restrict/unrestrict a user in Auth and Firestore.
 */
exports.setUserRestrictionStatus = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  if (!context || context.token.role !== "admin") {
    throw new Error("permission-denied: Only admins can restrict accounts.");
  }

  const { userId, shouldRestrict } = data;
  if (!userId || typeof shouldRestrict !== "boolean") {
    throw new Error("invalid-argument: Must provide userId and boolean shouldRestrict.");
  }

  try {
    await admin.auth().updateUser(userId, { disabled: shouldRestrict });
    await admin.firestore().collection("users").doc(userId).update({ isRestricted: shouldRestrict });

    const action = shouldRestrict ? "restricted" : "unrestricted";
    return { success: true, message: `User ${userId} has been ${action}.` };
  } catch (error) {
    console.error("Error updating restriction:", error);
    throw new Error("internal: Failed to update restriction status.");
  }
});

// ✅ REMOVED: The getOfflinePacketForClass function has been removed.