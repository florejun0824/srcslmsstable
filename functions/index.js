// functions/index.js

// 1. Import v2 specific handlers
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore"); // <-- UPDATED to include onDocumentUpdated
const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler"); // <-- ADDED: For Cron jobs

const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore"); 
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

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
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
// DATE UTILITY: NORMALIZE FIRESTORE TIMESTAMPS VS ISO STRINGS
// ============================================================================
const toJSDate = (val) => {
    if (!val) return null;
    // Handle Firestore Timestamp (Client or Admin SDK)
    if (typeof val.toDate === 'function') return val.toDate();
    if (val._seconds !== undefined) return new Date(val._seconds * 1000);
    // Handle Date object or ISO String
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// ============================================================================
// AI API ENDPOINT (v2)
// ============================================================================
exports.openrouterApi = onRequest({
    cors: true,
    timeoutSeconds: 300,
    memory: "1GiB",
    secrets: ["OPENROUTER_API_KEY"] 
}, async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
        await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
    }

    try {
        const { prompt, model, maxOutputTokens } = req.body;
        if (!prompt) return res.status(400).json({ error: "Missing 'prompt'." });

        const apiKey = process.env.OPENROUTER_API_KEY;
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
                        if (content) res.write(content);
                    } catch (e) {}
                }
            }
        }
        res.end();
    } catch (error) {
        console.error("Function Error:", error);
        if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
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
                const classDoc = await db.collection("classes").doc(classId).get();
                if (!classDoc.exists) return res.status(404).json({ error: "Class not found" });
                const classData = classDoc.data();

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
                        data: { type: "online_class", classId: classId, meetingLink: meetingLink },
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
            data: { 
                type: hasNewQuizzes ? "new_quiz" : "new_lesson",
                classId: classId,
                meetingLink: hasNewQuizzes ? "/student/quizzes" : "/student/lessons" 
            },
            tokens
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
    return null;
});

// ============================================================================
// HIGH-CONCURRENCY QUIZ ANALYTICS TRIGGER (Fixed for Global Collection)
// ============================================================================
exports.onQuizSubmitted = onDocumentCreated("quizSubmissions/{submissionId}", async (event) => {
    const submissionData = event.data.data();
    const db = admin.firestore();
    const classId = submissionData.classId;
    const quizId = submissionData.quizId;
    const studentScore = submissionData.score || 0;

    if (!classId || !quizId) return null;

    const analyticsRef = db.doc(`classes/${classId}/quizzes/${quizId}/analytics/summary`);

    try {
        await analyticsRef.set({
            totalSubmissions: FieldValue.increment(1),
            totalScoreSum: FieldValue.increment(studentScore),
            lastSubmissionTime: FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Failed to update quiz analytics:", error);
    }
    return null;
});

// ============================================================================
// ============================================================================
// HELPER: CANVASS ELECTION LOGIC (Reusable for Cron & Trigger)
// ============================================================================
const processElectionCanvassing = async (db, electionId, electionData) => {
    console.log(`[CANVASSER] Processing election: ${electionData.title} (${electionId})`);

    try {
        const votesSnapshot = await db.collection("elections").doc(electionId).collection("votes").get();
        const results = {}; // flat map of candidateId -> votes
        const positionTally = {}; // position title -> { candidateId -> votes }

        votesSnapshot.forEach(voteDoc => {
            const data = voteDoc.data();
            const selections = data.selections || data.votes || {}; // Build fallback for schema flexibility
            Object.entries(selections).forEach(([posTitle, selectionValue]) => {
                // selectionValue is usually Candidate NAME in the current DB, but could be ID
                results[selectionValue] = (results[selectionValue] || 0) + 1;
                if (!positionTally[posTitle]) positionTally[posTitle] = {};
                positionTally[posTitle][selectionValue] = (positionTally[posTitle][selectionValue] || 0) + 1;
            });
        });

        // --- TIE DETECTION ---
        const tiedPositions = [];
        (electionData.positions || []).forEach(pos => {
            const posResults = positionTally[pos.title] || {};
            const candidatesWithVotes = pos.candidates.map(c => {
                // Look up votes by both ID and NAME to ensure compatibility
                const votes = posResults[c.id] || posResults[c.name] || 0;
                console.log(`[CANVASSER] Tally for ${pos.title} -> ${c.name}: ${votes} votes`);
                return { ...c, votes };
            }).sort((a, b) => b.votes - a.votes);

            if (candidatesWithVotes.length > 1) {
                const topVotes = candidatesWithVotes[0].votes;
                if (topVotes > 0 && topVotes === candidatesWithVotes[1].votes) {
                    const tiedCandidates = candidatesWithVotes.filter(c => c.votes === topVotes);
                    tiedPositions.push({
                        title: pos.title,
                        candidates: tiedCandidates,
                        targetType: pos.targetType || electionData.targetType || 'school'
                    });
                }
            }
        });

        const hasTie = tiedPositions.length > 0;
        let tieBreakerId = null;

        if (hasTie) {
            console.log(`[CANVASSER] Tie detected for ${electionData.title}. Creating NEXT ROUND tie-breaker...`);
            const tbEndTime = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3-hour window

            // Smart Title Generation
            let newTitle = `${electionData.title} — Tie-Breaker`;
            if (electionData.isTieBreaker) {
                const roundMatch = electionData.title.match(/\(Round (\d+)\)/);
                const nextRound = roundMatch ? parseInt(roundMatch[1]) + 1 : 2;
                const baseTitle = electionData.title.split(" — Tie-Breaker")[0];
                newTitle = `${baseTitle} — Tie-Breaker (Round ${nextRound})`;
            }

            const parentData = {
                // If the current election is already a tie-breaker, use its parent's original positions 
                // and original turnout so we don't lose the "President" or "VP" in later rounds.
                positions: electionData.parentData?.positions || electionData.positions,
                finalResults: { 
                    ...(electionData.parentData?.finalResults || {}), 
                    ...results 
                },
                totalVotesCast: electionData.parentData?.totalVotesCast || votesSnapshot.size,
                hasTie: true,
                tiedPositions: tiedPositions.map(tp => tp.title)
            };

            const tieBreakerData = {
                title: newTitle,
                organization: electionData.organization || "Election Commission",
                startDate: new Date().toISOString(),
                endDate: tbEndTime.toISOString(),
                positions: tiedPositions.map(tp => ({
                    title: tp.title,
                    candidates: tp.candidates.map(c => {
                        const { votes, ...rest } = c; // Remove temp vote count from the candidate object
                        return rest;
                    }),
                    targetType: tp.targetType
                })),
                targetType: electionData.targetType || 'school',
                schoolId: electionData.schoolId || 'global',
                createdBy: electionData.createdBy || 'system',
                visibility: electionData.visibility || 'public',
                status: 'active',
                isTieBreaker: true,
                parentElectionId: electionId,
                parentData: parentData,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const tbDoc = await db.collection("elections").add(tieBreakerData);
            tieBreakerId = tbDoc.id;
            console.log(`[CANVASSER] Successfully created round: ${newTitle} (${tieBreakerId})`);
        }

        // --- UPDATE ELECTION ---
        await db.collection("elections").doc(electionId).update({
            status: hasTie ? "archived" : "completed",
            finalResults: results,
            canvassedAt: admin.firestore.FieldValue.serverTimestamp(),
            totalVotesCast: votesSnapshot.size,
            hasTie: hasTie,
            tieBreakerId: tieBreakerId || null
        });

        // --- POST ANNOUNCEMENT ---
        await db.collection("studentPosts").add({
            title: hasTie ? `⚡ Tie-Breaker Round Active: ${electionData.title}` : `📊 Official Results: ${electionData.title}`,
            content: hasTie 
                ? `The election for ${electionData.title} ended in another tie. A new tie-breaker round has been scheduled for the tied positions.`
                : `The election has ended. Total votes cast: ${votesSnapshot.size}. View the full breakdown in the Elections tab.`,
            author: "Election System",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: "election_result",
            electionId: hasTie ? tieBreakerId : electionId,
            schoolId: electionData.schoolId || "global",
            isAnnouncement: true
        });

        console.log(`[CANVASSER] Successfully processed Round: ${electionData.title}`);
        return true;
    } catch (err) {
        console.error(`[CANVASSER] CRITICAL ERROR IN CANVASSING:`, err);
        return false;
    }
};

// ============================================================================
// AUTOMATED ELECTION CANVASSING & LIFE-CYCLE (Scheduled Fail-Safe)
// ============================================================================
exports.autoCanvassElections = onSchedule("every 5 minutes", async (event) => {
    const db = admin.firestore();
    const now = new Date();

    try {
        const snapshot = await db.collection("elections")
            .where("status", "in", ["active", "calculating"])
            .get();

        if (snapshot.empty) return null;

        for (const electionDoc of snapshot.docs) {
            const electionId = electionDoc.id;
            const electionData = electionDoc.data();

            const endDate = toJSDate(electionData.endDate);
            const revealTime = toJSDate(electionData.revealTime);

            // Case A: Active election reached its end date. Move to 'Calculating' (Start Countdown).
            if (electionData.status === "active" && endDate && (endDate <= now)) {
                console.log(`[AUTO-START] Beginning official count for: ${electionData.title}`);
                const finalRevealTime = new Date(now.getTime() + 5 * 60 * 1000); // 5-min cooldown
                
                await db.collection("elections").doc(electionId).update({
                    status: "calculating",
                    resultsPending: true,
                    revealTime: finalRevealTime.toISOString()
                });

                await db.collection("studentPosts").add({
                    title: `🗳️ Counting In Progress: ${electionData.title}`,
                    content: `Voting has ended. The election commission is now tallying the results officially. Results will be proclaimed in 5 minutes.`,
                    author: "Election System",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: "election_update",
                    electionId: electionId,
                    schoolId: electionData.schoolId || "global",
                    isAnnouncement: true
                });
                continue; 
            }

            // Case B: Calculating election reached its reveal time. Finalize.
            const isRevealPast = revealTime ? (revealTime <= now) : true;
            if (electionData.status === "calculating" && isRevealPast) {
                await processElectionCanvassing(db, electionId, electionData);
            }
        }
    } catch (error) {
        console.error("Scheduled Life-Cycle Error:", error);
    }
    return null;
});

// ============================================================================
// REACTIVE ELECTION CANVASSING (Immediate Trigger / Proclaim Winners Override)
// ============================================================================
exports.onElectionFinalized = onDocumentUpdated("elections/{electionId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Trigger Condition:
    // Only trigger IF status is 'active' or 'calculating' AND endDate has been set to a past time OR revealTime is past
    const now = new Date();
    const endDate = toJSDate(after.endDate);
    const revealTime = toJSDate(after.revealTime);

    const isAfterExpired = (endDate && endDate <= now) || (revealTime && revealTime <= now);
    const wasJustEnded = after.endDate !== before.endDate || after.status !== before.status;

    if ((after.status === "active" || after.status === "calculating") && isAfterExpired && wasJustEnded) {
        console.log(`[TRIGGER] Immediate canvassing triggered for: ${after.title}`);
        await processElectionCanvassing(admin.firestore(), event.params.electionId, after);
    }
    return null;
});

// ============================================================================
// NOTIFY STUDENTS WHEN ELECTION OPENS
// ============================================================================
exports.onElectionOpened = onDocumentUpdated("elections/{electionId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only trigger if the status JUST changed to 'active'
    if (before.status !== "active" && after.status === "active") {
        console.log(`Election ${after.title} is now ACTIVE. Preparing notifications...`);
        const db = admin.firestore();
        
        let studentsQuery = db.collection("users").where("role", "==", "student");
        if (after.targetType === "grade" && after.targetGrade) {
            studentsQuery = studentsQuery.where("gradeLevel", "==", String(after.targetGrade));
        }

        const studentsSnap = await studentsQuery.get();
        const studentIds = [];
        studentsSnap.forEach(doc => studentIds.push(doc.id));

        if (studentIds.length === 0) return null;
        const tokens = await getTokensForUsers(studentIds);
        if (tokens.length === 0) return null;

        const message = {
            notification: {
                title: "🗳️ Election Now Open!",
                body: `The election "${after.title}" is now officially open for voting. Cast your ballot now!`,
            },
            data: { type: "election_opened", electionId: event.params.electionId },
            tokens: tokens,
        };

        try {
            await admin.messaging().sendEachForMulticast(message);
        } catch (error) {
            console.error("Error sending election open notifications:", error);
        }
    }
    return null;
});
