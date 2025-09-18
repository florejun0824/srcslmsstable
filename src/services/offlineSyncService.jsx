import localforage from 'localforage';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SUBMISSION_OUTBOX_KEY = 'quiz-submission-outbox';

/**
 * Adds a quiz submission to the offline outbox queue in IndexedDB.
 * @param {object} submissionData - The quiz submission data.
 */
export const queueQuizSubmission = async (submissionData) => {    
    const outbox = await localforage.getItem(SUBMISSION_OUTBOX_KEY) || [];
    // We add a client-side timestamp for reference, though Firestore's serverTimestamp is preferred
    outbox.push({ ...submissionData, queuedAt: new Date().toISOString() });
    await localforage.setItem(SUBMISSION_OUTBOX_KEY, outbox);
    console.log("Submission queued successfully.");
};

/**
 * Syncs all pending quiz submissions from the outbox to Firestore.
 * @returns {Promise<{success: boolean, syncedCount: number, error?: any}>}
 */
export const syncOfflineSubmissions = async () => {
    const outbox = await localforage.getItem(SUBMISSION_OUTBOX_KEY) || [];
    if (outbox.length === 0) {
        console.log("Sync: No offline submissions to sync.");
        return { success: true, syncedCount: 0 };
    }

    console.log(`Sync: Found ${outbox.length} submissions to sync.`);
    const batch = writeBatch(db);

    outbox.forEach(submission => {
        // Replace the client-side queuedAt with the actual server timestamp for Firestore
        const finalSubmissionData = { ...submission, submittedAt: serverTimestamp() };
        delete finalSubmissionData.queuedAt; // Clean up client-side timestamp
        
        // Create a unique ID to prevent duplicate submissions on multiple sync attempts
        const submissionId = `${submission.studentId}-${submission.quizId}-${new Date(submission.queuedAt).getTime()}`;
        const submissionRef = doc(db, 'quizSubmissions', submissionId);
        
        batch.set(submissionRef, finalSubmissionData);
    });

    try {
        await batch.commit();
        // IMPORTANT: Clear the outbox only after the batch commit is successful
        await localforage.removeItem(SUBMISSION_OUTBOX_KEY);
        console.log(`Sync: Successfully synced ${outbox.length} submissions.`);
        return { success: true, syncedCount: outbox.length };
    } catch (error) {
        console.error("Sync: Failed to sync submissions:", error);
        // Do not clear the outbox if the sync fails, so we can retry later
        return { success: false, syncedCount: 0, error };
    }
};