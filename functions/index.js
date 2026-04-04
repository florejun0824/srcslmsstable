// functions/index.js

// 1. Import v2 specific handlers
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore"); // <-- ADDED: Needed for atomic increments
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Optional: Set global options like region (e.g., 'us-central1')
setGlobalOptions({ region: "us-central1" });

// ============================================================================
// CUSTOM AUTHENTICATION MIDDLEWARE (Updated for Firebase Auth)
// ============================================================================
const validateCustomAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token." });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        // Verify the secure Firebase token instead of the hardcoded secret
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Optional: Attach the user info to the request if your other functions need it
        req.user = decodedToken; 
        
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(403).json({ error: "Forbidden: Invalid or expired token." });
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
// AI API ENDPOINT (v2) - MOVED FROM VERCEL
// ============================================================================
exports.openrouterApi = onRequest({
    cors: true,
    timeoutSeconds: 300, // 5 minutes for heavy generation
    memory: "1GiB",
    secrets: ["OPENROUTER_API_KEY"] 
}, async (req, res) => {
    // 1. Enforce POST requests only
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    // 2. Verify Firebase Authentication (Secures the endpoint!)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
        // This verifies the token your React app got after the custom login
        await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
    }

    // 3. Process the AI Request
    try {
        const { prompt, model, maxOutputTokens, tier } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "Missing 'prompt' in request body." });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        // Default to a known stable model if none is passed
        const selectedModel = model || "qwen/qwen-2.5-72b-instruct"; 

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://srcslms.vercel.app", 
                "X-Title": "LMS Teacher Assistant",
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
                stream: true,
                max_tokens: maxOutputTokens || 8192,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ error: `OpenRouter API Failed: ${errText}` });
        }

        // 4. Stream the Response Back to React
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                    const dataStr = trimmed.replace("data: ", "").trim();
                    if (dataStr === "[DONE]") continue;

                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            res.write(content); // Send chunk to client
                        }
                    } catch (e) {
                        // Ignore partial JSON parsing errors in the stream
                    }
                }
            }
        }
        
        res.end(); // Close the stream when finished

    } catch (error) {
        console.error("Function Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});


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
// BACKGROUND TRIGGERS (v2)
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

// ============================================================================
// HIGH-CONCURRENCY QUIZ ANALYTICS TRIGGER (Fixed for Global Collection)
// ============================================================================
exports.onQuizSubmitted = onDocumentCreated("quizSubmissions/{submissionId}", async (event) => {
    const submissionData = event.data.data();
    const db = admin.firestore();

    // 1. Extract the routing IDs directly from the submitted document
    const classId = submissionData.classId;
    const quizId = submissionData.quizId;
    const studentScore = submissionData.score || 0;

    // 2. Safety check to ensure we know where to put the stats
    if (!classId || !quizId) {
        console.error(`Submission ${event.params.submissionId} is missing classId or quizId. Cannot update stats.`);
        return null;
    }

    // 3. Update the specific quiz's analytics summary inside the class
    const analyticsRef = db.doc(`classes/${classId}/quizzes/${quizId}/analytics/summary`);

    try {
        await analyticsRef.set({
            totalSubmissions: FieldValue.increment(1),
            totalScoreSum: FieldValue.increment(studentScore),
            lastSubmissionTime: FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`✅ Analytics updated for Quiz ${quizId} in Class ${classId}`);
    } catch (error) {
        console.error("Failed to update quiz analytics:", error);
    }
    
    return null;
});