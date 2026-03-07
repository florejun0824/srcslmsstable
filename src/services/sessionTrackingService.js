// src/services/sessionTrackingService.js
// Tracks student login counts, screentime, quiz time, and lesson time
// Uses one Firestore document per student per ISO week for minimal R/W

import { db } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, increment, serverTimestamp } from 'firebase/firestore';

// ============================================================
// HELPERS
// ============================================================

/** Returns ISO week key like "2026-W09" */
const getWeekKey = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

/** Session storage keys */
const SESSION_START_KEY = 'srcs_session_start';
const SESSION_USER_KEY = 'srcs_session_user';
const HEARTBEAT_KEY = 'srcs_last_heartbeat';

// ============================================================
// CORE TRACKING FUNCTIONS
// ============================================================

/**
 * Called on successful student login.
 * - Increments weekly login count (1 Firestore write)
 * - Stores session start time in sessionStorage (0 writes)
 */
export const recordLogin = async (userId) => {
    if (!userId) return;

    try {
        const weekKey = getWeekKey();
        const statsRef = doc(db, 'users', userId, 'weeklyStats', weekKey);

        // Atomic increment — creates doc if it doesn't exist
        await setDoc(statsRef, {
            loginCount: increment(1),
            lastUpdated: serverTimestamp(),
        }, { merge: true });

        // Store session start in sessionStorage (survives page refreshes, cleared on tab close)
        sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
        sessionStorage.setItem(SESSION_USER_KEY, userId);

        console.log(`[SessionTracking] Login recorded for ${userId}, week ${weekKey}`);
    } catch (err) {
        console.warn('[SessionTracking] Failed to record login:', err);
    }
};

/**
 * Flushes accumulated screen time to Firestore.
 * Called on logout, page unload, and periodic heartbeat.
 * Uses sessionStorage to track time since last flush.
 */
export const flushSessionTime = async (userId) => {
    if (!userId) return;

    const sessionStart = sessionStorage.getItem(SESSION_START_KEY);
    const lastHeartbeat = sessionStorage.getItem(HEARTBEAT_KEY);
    if (!sessionStart) return;

    const now = Date.now();
    const lastCheckpoint = lastHeartbeat ? parseInt(lastHeartbeat, 10) : parseInt(sessionStart, 10);
    const elapsedMs = now - lastCheckpoint;

    // Only write if at least 10 seconds have passed (avoid spam)
    if (elapsedMs < 10000) return;

    try {
        const weekKey = getWeekKey();
        const statsRef = doc(db, 'users', userId, 'weeklyStats', weekKey);

        await setDoc(statsRef, {
            totalScreenTimeMs: increment(elapsedMs),
            lastUpdated: serverTimestamp(),
        }, { merge: true });

        // Update heartbeat checkpoint
        sessionStorage.setItem(HEARTBEAT_KEY, now.toString());

        console.log(`[SessionTracking] Flushed ${Math.round(elapsedMs / 1000)}s for ${userId}`);
    } catch (err) {
        console.warn('[SessionTracking] Failed to flush session time:', err);
    }
};

/**
 * Records time spent on a specific activity type (quiz or lesson).
 * Called when closing a quiz/lesson modal with elapsed time.
 */
export const recordActivityTime = async (userId, activityType, durationMs) => {
    if (!userId || !durationMs || durationMs < 1000) return;

    try {
        const weekKey = getWeekKey();
        const statsRef = doc(db, 'users', userId, 'weeklyStats', weekKey);

        const field = activityType === 'quiz' ? 'quizTimeMs' : 'lessonTimeMs';

        await setDoc(statsRef, {
            [field]: increment(durationMs),
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        console.warn(`[SessionTracking] Failed to record ${activityType} time:`, err);
    }
};

/**
 * Clears session tracking data from sessionStorage.
 * Called on logout.
 */
export const clearSession = () => {
    sessionStorage.removeItem(SESSION_START_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(HEARTBEAT_KEY);
};

// ============================================================
// HEARTBEAT (periodic flush every 5 minutes)
// ============================================================

let heartbeatInterval = null;

export const startHeartbeat = (userId) => {
    stopHeartbeat(); // Clear any existing
    heartbeatInterval = setInterval(() => {
        flushSessionTime(userId);
    }, 5 * 60 * 1000); // Every 5 minutes
};

export const stopHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
};

// ============================================================
// READING STATS (for Parent Portal)
// ============================================================

/**
 * Fetches the last N weeks of stats for a student.
 * Returns array of { weekKey, loginCount, totalScreenTimeMs, quizTimeMs, lessonTimeMs }
 * Maximum reads: `weeks` documents (default 4)
 */
export const getWeeklyStats = async (studentId, weeks = 4) => {
    if (!studentId) return [];

    try {
        const statsRef = collection(db, 'users', studentId, 'weeklyStats');
        const q = query(statsRef, orderBy('lastUpdated', 'desc'), limit(weeks));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(d => ({
            weekKey: d.id,
            loginCount: d.data().loginCount || 0,
            totalScreenTimeMs: d.data().totalScreenTimeMs || 0,
            quizTimeMs: d.data().quizTimeMs || 0,
            lessonTimeMs: d.data().lessonTimeMs || 0,
        }));
    } catch (err) {
        console.warn('[SessionTracking] Failed to fetch weekly stats:', err);
        return [];
    }
};

/**
 * Computes averages from weekly stats for parent portal display.
 */
export const computeAverages = (weeklyStats) => {
    if (!weeklyStats || weeklyStats.length === 0) {
        return { avgLoginsPerWeek: 0, avgScreenTimePerWeek: 0, avgQuizTimePerWeek: 0, avgLessonTimePerWeek: 0 };
    }

    const count = weeklyStats.length;
    const totals = weeklyStats.reduce((acc, w) => ({
        logins: acc.logins + w.loginCount,
        screen: acc.screen + w.totalScreenTimeMs,
        quiz: acc.quiz + w.quizTimeMs,
        lesson: acc.lesson + w.lessonTimeMs,
    }), { logins: 0, screen: 0, quiz: 0, lesson: 0 });

    return {
        avgLoginsPerWeek: Math.round(totals.logins / count * 10) / 10,
        avgScreenTimePerWeek: totals.screen / count,
        avgQuizTimePerWeek: totals.quiz / count,
        avgLessonTimePerWeek: totals.lesson / count,
    };
};

/**
 * Formats milliseconds to human-readable string like "2h 15m" or "45m"
 */
export const formatDuration = (ms) => {
    if (!ms || ms < 0) return '0m';
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 1) return '<1m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
};

// ============================================================
// TEACHER ACTIVITY TRACKING (for Admin Monitoring)
// ============================================================

/**
 * Records a teacher action (lesson posted, quiz sent, announcement, online class).
 * Called from teacher-facing components.
 * @param {string} teacherId
 * @param {'lessonPosted'|'quizSent'|'announcementPosted'|'onlineClassDone'} actionType
 */
export const recordTeacherAction = async (teacherId, actionType) => {
    if (!teacherId || !actionType) return;

    try {
        const weekKey = getWeekKey();
        const statsRef = doc(db, 'users', teacherId, 'weeklyStats', weekKey);

        await setDoc(statsRef, {
            [actionType]: increment(1),
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        console.warn(`[SessionTracking] Failed to record teacher action ${actionType}:`, err);
    }
};

/**
 * Fetches weekly stats for multiple users at once.
 * Used by AdminMonitoringView to display all teacher/student stats.
 * Returns a Map of userId -> weeklyStats[]
 */
export const getMultipleUsersWeeklyStats = async (userIds, weeks = 4) => {
    if (!userIds || userIds.length === 0) return new Map();

    const results = new Map();

    // Process in parallel but cap concurrent reads
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const promises = batch.map(async (userId) => {
            const stats = await getWeeklyStats(userId, weeks);
            return { userId, stats };
        });

        const batchResults = await Promise.all(promises);
        batchResults.forEach(({ userId, stats }) => {
            results.set(userId, stats);
        });
    }

    return results;
};
