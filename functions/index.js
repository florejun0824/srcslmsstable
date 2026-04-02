// functions/index.js

// 1. Import v2 specific handlers
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Optional: Set global options like region (e.g., 'us-central1')
setGlobalOptions({ region: "us-central1" });

// ============================================================================
// CUSTOM AUTHENTICATION MIDDLEWARE
// ============================================================================
const validateCustomAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token." });
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const MY_SECRET_KEY = "SRCS-Secret-2026"; 
        if (token !== MY_SECRET_KEY) {
            return res.status(403).json({ error: "Forbidden: Invalid custom token." });
        }
        next();
    } catch (error) {
        return res.status(500).json({ error: "Internal Auth Error" });
    }
};

// ============================================================================
// HELPER: TOKEN FETCHER
// ============================================================================
const getTokensForUsers = async (userIds) => {
    const db = admin.firestore();
    const tokens = [];
    for (let i = 0; i < userIds.length; i += 30) {
        const chunk = userIds.slice(i, i + 30);
        const usersSnap = await db.collection("users").where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.fcmTokens) tokens.push(...data.fcmTokens);
            if (data.fcmToken && !tokens.includes(data.fcmToken)) tokens.push(data.fcmToken);
        });
    }
    return tokens;
};

// ============================================================================
// HTTPS ENDPOINTS (v2)
// ============================================================================

exports.startOnlineClass = onRequest((req, res) => {
    cors(req, res, () => {
        validateCustomAuth(req, res, async () => {
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
            try {
                const { classId, meetingLink, teacherName } = req.body;
                const db = admin.firestore();
                
                // Fetch class data first to get the classCode
                const classDoc = await db.collection("classes").doc(classId).get();
                if (!classDoc.exists) return res.status(404).json({ error: "Class not found" });
                const classData = classDoc.data();

                // Update the class document
                await db.collection("classes").doc(classId).update({
                    "videoConference.isLive": true,
                    "videoConference.meetingCode": classData.classCode || "LIVE",
                    "videoConference.platform": "GOOGLE_MEET",
                    "videoConference.startTime": new Date().toISOString(),
                    activeMeetingLink: meetingLink,
                    lastMeetingStartedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                const studentIds = classData.studentIds || [];
                const tokens = await getTokensForUsers(studentIds);

                if (tokens.length > 0) {
                    await admin.messaging().sendEachForMulticast({
                        notification: { 
                            title: `🔴 Live Class Started!`, 
                            body: `${teacherName || 'Teacher'} started a session for ${classData.name}.` 
                        },
                        data: { 
                            type: "online_class", 
                            classId: classId, 
                            meetingLink: meetingLink // Opens the Google Meet link directly
                        },
                        tokens
                    });
                }
                return res.status(200).json({ success: true });
            } catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    });
});

// Stubs for your other logic
exports.createMultipleUsers = onRequest((req, res) => cors(req, res, () => res.send("OK")));
exports.updateUserRole = onRequest((req, res) => cors(req, res, () => res.send("OK")));
exports.setUserRestrictionStatus = onRequest((req, res) => cors(req, res, () => res.send("OK")));

// ============================================================================
// BACKGROUND TRIGGER (v2)
// ============================================================================

exports.onNewPostNotify = onDocumentCreated("classes/{classId}/posts/{postId}", async (event) => {
    const postData = event.data.data();
    const classId = event.params.classId;
    const db = admin.firestore();

    const hasNewLessons = postData.lessons && postData.lessons.length > 0;
    const hasNewQuizzes = postData.quizzes && postData.quizzes.length > 0;

    if (!hasNewLessons && !hasNewQuizzes) return null;

    try {
        const classDoc = await db.collection("classes").doc(classId).get();
        const classData = classDoc.data();
        const studentIds = classData.studentIds || [];
        const tokens = await getTokensForUsers(studentIds);

        if (tokens.length === 0) return null;

        // Dynamic content message
        let title = "New Materials Posted";
        let body = `New content is available in ${classData.name}`;
        
        if (hasNewQuizzes && hasNewLessons) {
            title = `New materials in ${classData.name}!`;
            body = "Your teacher posted new lessons and quizzes.";
        } else if (hasNewQuizzes) {
            title = `New Quiz in ${classData.name}!`;
            body = `A new quiz "${postData.quizzes[0].title}" is available.`;
        } else if (hasNewLessons) {
            title = `New Lesson in ${classData.name}!`;
            body = `A new lesson "${postData.lessons[0].title}" is available.`;
        }

        await admin.messaging().sendEachForMulticast({
            notification: { title, body },
            // ADDED: Redirection data for the service worker
            data: { 
                type: hasNewQuizzes ? "new_quiz" : "new_lesson",
                classId: classId,
                // Redirect students to their specific tab based on content
                meetingLink: hasNewQuizzes ? "/student/quizzes" : "/student/lessons" 
            },
            tokens
        });
    } catch (error) {
        console.error("Error sending new post notification:", error);
    }
    return null;
});