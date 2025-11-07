import localforage from 'localforage';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { triggerToast } from '../contexts/ToastContext'; // ✅ global toast trigger

const SUBMISSION_OUTBOX_KEY = 'quiz-submission-outbox';

// --- MODIFIED: Added 'postId' ---
const CRITICAL_FIELDS = ['studentId', 'quizId', 'classId', 'answers', 'postId'];

// 🔹 Utility: recursively clean objects and track missing fields
const cleanObject = (obj, parentKey = '') => {
  const missingFields = [];

  if (Array.isArray(obj)) {
    const cleanedArray = obj.map((item, idx) => {
      const { cleaned, missing } = cleanObject(item, `${parentKey}[${idx}]`);
      missingFields.push(...missing);
      return cleaned;
    });
    return { cleaned: cleanedArray, missing: missingFields };
  } else if (obj && typeof obj === 'object') {
    const cleanedObj = {};
    Object.entries(obj).forEach(([k, v]) => {
      const keyPath = parentKey ? `${parentKey}.${k}` : k;
      if (v === undefined) {
        missingFields.push(keyPath);
        cleanedObj[k] = null;
      } else {
        const { cleaned, missing } = cleanObject(v, keyPath);
        cleanedObj[k] = cleaned;
        missingFields.push(...missing);
      }
    });
    return { cleaned: cleanedObj, missing: missingFields };
  }
  return { cleaned: obj === undefined ? null : obj, missing: obj === undefined ? [parentKey] : [] };
};

// 🔹 Check for missing critical fields
const hasCriticalFields = (submission) => {
  return CRITICAL_FIELDS.every(field => submission[field] !== undefined && submission[field] !== null);
};

/**
 * Adds a quiz submission to the offline outbox queue in IndexedDB.
 */
export const queueQuizSubmission = async (submissionData) => {
  const outbox = await localforage.getItem(SUBMISSION_OUTBOX_KEY) || [];

  const { cleaned, missing } = cleanObject({
    ...submissionData,
    queuedAt: new Date().toISOString()
  });

  if (!hasCriticalFields(cleaned)) {
    const missingCritical = CRITICAL_FIELDS.filter(f => !(cleaned[f]));
    console.error("❌ Submission rejected. Missing critical fields:", missingCritical, cleaned);
    triggerToast(`❌ Submission rejected. Missing critical fields: ${missingCritical.join(', ')}`, "error");
    return;
  }

  outbox.push(cleaned);
  await localforage.setItem(SUBMISSION_OUTBOX_KEY, outbox);

  if (missing.length > 0) {
    console.warn("⚠️ Missing optional fields in queued submission:", missing);
    triggerToast(`⚠️ Some optional fields were missing: ${missing.join(', ')}`, "warning");
  } else {
    console.log("Submission queued successfully.", cleaned);
    triggerToast("Submission queued successfully.", "success");
  }
};

/**
 * Syncs all pending quiz submissions from the outbox to Firestore.
 */
export const syncOfflineSubmissions = async () => {
  const outbox = await localforage.getItem(SUBMISSION_OUTBOX_KEY) || [];
  if (outbox.length === 0) {
    console.log("Sync: No offline submissions to sync.");
    return { success: true, syncedCount: 0 };
  }

  console.log(`Sync: Found ${outbox.length} submissions to sync.`);
  const batch = writeBatch(db);
  let totalMissing = [];
  
  // --- MODIFIED: Track skipped submissions to avoid data loss ---
  const skippedSubmissions = [];
  let syncedCount = 0;
  
  outbox.forEach(submission => {
    if (!hasCriticalFields(submission)) {
      const missingCritical = CRITICAL_FIELDS.filter(f => !submission[f]);
      console.error("❌ Skipping submission. Missing critical fields:", missingCritical, submission);
      skippedSubmissions.push(submission); // Keep it in the outbox
      return;
    }

    const { cleaned, missing } = cleanObject({
      ...submission,
      submittedAt: serverTimestamp()
    });
    delete cleaned.queuedAt;

    if (missing.length > 0) {
      console.warn("⚠️ Missing optional fields in submission:", missing);
      totalMissing.push(...missing);
    }

    const submissionId = `${submission.studentId}-${submission.quizId}-${new Date(submission.queuedAt).getTime()}`;
    const submissionRef = doc(db, 'quizSubmissions', submissionId);

    batch.set(submissionRef, cleaned);
    syncedCount++;
  });

  // --- END MODIFICATION ---

  try {
    await batch.commit();
    
    // --- MODIFIED: Save back only the skipped items, or clear if all succeeded ---
    if (skippedSubmissions.length > 0) {
      await localforage.setItem(SUBMISSION_OUTBOX_KEY, skippedSubmissions);
    } else {
      await localforage.removeItem(SUBMISSION_OUTBOX_KEY);
    }
    // --- END MODIFICATION ---
    
    console.log(`Sync: Successfully synced ${syncedCount} submissions.`);
    triggerToast(`Synced ${syncedCount} submissions.`, "success");

    if (totalMissing.length > 0) {
      triggerToast(`⚠️ Some submissions had missing optional fields: ${[...new Set(totalMissing)].join(', ')}`, "warning");
    }
    if (skippedSubmissions.length > 0) {
      triggerToast(`❌ ${skippedSubmissions.length} submission(s) skipped due to missing critical fields. They remain offline.`, "error");
    }

    return { success: true, syncedCount: syncedCount, skippedCount: skippedSubmissions.length };
  } catch (error) {
    console.error("Sync: Failed to sync submissions:", error);
    triggerToast("❌ Sync failed. Please try again later.", "error");
    // On batch commit failure, we don't modify the outbox, so all items are safe
    return { success: false, syncedCount: 0, error };
  }
};