// functions/index.js

const admin = require("firebase-admin");
admin.initializeApp();

// --- v2-first, v1 fallback setup with console warnings ---
let onCall, onUserDeleted, HttpsError; 
let onDocumentCreated; // <-- ADDED for new trigger

// HTTPS Callable
try {
  const { https } = require("firebase-functions/v2");
  onCall = https.onCall;
  HttpsError = https.HttpsError;
} catch {
  const functions = require("firebase-functions");
  onCall = functions.https.onCall;
  HttpsError = functions.https.HttpsError;
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

// --- ADDED: Firestore Trigger (onDocumentCreated) ---
try {
    ({ onDocumentCreated } = require("firebase-functions/v2/firestore"));
} catch {
    console.warn("[FALLBACK] Using v1 firestore.document().onCreate – consider upgrading firebase-functions for v2.");
    const firestore = require("firebase-functions/v1/firestore");
    onDocumentCreated = (path, handler) => firestore.document(path).onCreate(handler);
}
// --- END ADDITION ---


/**
 * Secure Cloud Function that creates multiple users.
 * (This function is unchanged)
 */
exports.createMultipleUsers = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  // MODIFIED: Use HttpsError for v2/v1 compatibility
  if (!context || context.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can create new users.");
  }

  const usersToCreate = data.users;
  if (!usersToCreate || !Array.isArray(usersToCreate)) {
    throw new HttpsError("invalid-argument", "Must provide an array of users.");
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
 * (This function is unchanged)
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
 * (This function is unchanged)
 */
exports.updateUserRole = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  if (!context || context.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can change roles.");
  }

  const { userId, newRole } = data;
  if (!userId || !newRole) {
    throw new HttpsError("invalid-argument", "Must provide userId and newRole.");
  }

  try {
    await admin.firestore().collection("users").doc(userId).update({ role: newRole });
    return { success: true, message: `Updated role for user ${userId} to ${newRole}` };
  } catch (error) {
    console.error("Error updating role:", error);
    throw new HttpsError("internal", "Failed to update role.");
  }
});

/**
 * Restrict/unrestrict a user in Auth and Firestore.
 * (This function is unchanged)
 */
exports.setUserRestrictionStatus = onCall(async (request) => {
  const context = request.auth;
  const data = request.data;

  if (!context || context.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can restrict accounts.");
  }

  const { userId, shouldRestrict } = data;
  if (!userId || typeof shouldRestrict !== "boolean") {
    throw new HttpsError("invalid-argument", "Must provide userId and boolean shouldRestrict.");
  }

  try {
    await admin.auth().updateUser(userId, { disabled: shouldRestrict });
    await admin.firestore().collection("users").doc(userId).update({ isRestricted: shouldRestrict });

    const action = shouldRestrict ? "restricted" : "unrestricted";
    return { success: true, message: `User ${userId} has been ${action}.` };
  } catch (error) {
    console.error("Error updating restriction:", error);
    throw new HttpsError("internal", "Failed to update restriction status.");
  }
});

// --- ✅ 1. NEW FUNCTION (Teacher-Triggered) ✅ ---

/**
 * Called by a teacher to start a class.
 * Sets the class to 'live' and sends push notifications to students.
 */
exports.startOnlineClass = onCall(async (request) => {
    const data = request.data;
    const { classId, meetLink } = data; // Data from the teacher's app
    const context = request.auth;       // The teacher's auth context
    const db = admin.firestore();

    // 1. Security Check
    if (!context) {
        throw new HttpsError("unauthenticated", "You must be logged in to start a class.");
    }
    const teacherId = context.uid;

    if (!classId || !meetLink) {
        throw new HttpsError("invalid-argument", "Must provide a 'classId' and 'meetLink'.");
    }

    try {
        const classRef = db.collection("classes").doc(classId);
        const classDoc = await classRef.get();
        const classData = classDoc.data();

        // Security Check 2: Ensure the person starting the class is the teacher
        if (classData.teacherId !== teacherId) {
            throw new HttpsError("permission-denied", "You are not the teacher of this class.");
        }

        // 2. Update the class to be "live"
        await classRef.update({
            "videoConference.isLive": true,
            "meetLink": meetLink
        });

        // 3. Get the list of students
        const studentIds = classData.studentIds || [];
        const className = classData.name;

        if (studentIds.length === 0) {
            return { message: "Class started, but no students to notify." };
        }

        // 4. Get the notification tokens for all students
        const tokens = await getTokensForUsers(studentIds);

        if (tokens.length === 0) {
            return { message: "Class started, but no students have notification tokens." };
        }

        // 5. Create the notification message
        const message = {
            notification: {
                title: `Class is starting! 🚀`,
                body: `Your teacher has started the class "${className}". Tap to join!`
            },
            android: { notification: { vibrate: "250ms" } },
            apns: { payload: { aps: { sound: "default" } } },
            tokens: tokens
        };

        // 6. Send the notifications
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} 'class started' messages`);

        return { message: `Successfully notified ${response.successCount} students.` };

    } catch (error) {
        console.error("Error starting online class:", error);
        throw new HttpsError("internal", "An error occurred: " + error.message);
    }
});


// --- ✅ 2. NEW FUNCTION (Automatic Trigger) ✅ ---

/**
 * Runs automatically when a new post is created in any class.
 * Sends notifications to students about new lessons or quizzes.
 */
exports.onNewPostNotify = onDocumentCreated("classes/{classId}/posts/{postId}", async (event) => {
    const postData = event.data.data();
    const classId = event.params.classId;
    const db = admin.firestore();

    const hasNewLessons = postData.lessons && postData.lessons.length > 0;
    const hasNewQuizzes = postData.quizzes && postData.quizzes.length > 0;

    // 1. If the post is empty or just text, do nothing
    if (!hasNewLessons && !hasNewQuizzes) {
        console.log("New post has no lessons or quizzes. No notification sent.");
        return null;
    }

    try {
        // 2. Get the class data
        const classDoc = await db.collection("classes").doc(classId).get();
        const classData = classDoc.data();
        const className = classData.name;
        const studentIds = classData.studentIds || [];

        if (studentIds.length === 0) {
            console.log("Post created, but class has no students.");
            return null;
        }

        // 3. Determine the notification message
        let title = "";
        let body = "";

        if (hasNewQuizzes && hasNewLessons) {
            title = `New materials in ${className}!`;
            body = "Your teacher just posted new lessons AND quizzes.";
        } else if (hasNewQuizzes) {
            title = `New Quiz in ${className}!`;
            body = `A new quiz "${postData.quizzes[0].title}" is now available.`;
        } else {
            title = `New Lesson in ${className}!`;
            body = `A new lesson "${postData.lessons[0].title}" is now available.`;
        }

        // 4. Get student tokens
        const tokens = await getTokensForUsers(studentIds);
        if (tokens.length === 0) {
            console.log("Post created, but no students have notification tokens.");
            return null;
        }

        // 5. Create and send the message
        const message = {
            notification: { title, body },
            android: { notification: { vibrate: "250ms" } },
            apns: { payload: { aps: { sound: "default" } } },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} 'new post' messages`);
        return response;

    } catch (error) {
        console.error("Error sending new post notification:", error);
        return null;
    }
});


/**
 * Helper function to get FCM tokens for a list of user IDs.
 */
const getTokensForUsers = async (userIds) => {
    const db = admin.firestore();
    const userRef = db.collection("users");
    const tokens = [];
    
    // Loop over userIds in chunks of 30 (Firestore 'in' query limit)
    for (let i = 0; i < userIds.length; i += 30) {
        const chunk = userIds.slice(i, i + 30);
        const usersSnap = await userRef.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        
        usersSnap.forEach(doc => {
            const fcmToken = doc.data().fcmToken; // Get the token
            if (fcmToken) {
                tokens.push(fcmToken);
            }
        });
    }
    return tokens;
};