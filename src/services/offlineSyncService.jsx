import localforage from 'localforage';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { triggerToast } from '../contexts/ToastContext';

const SUBMISSION_OUTBOX_KEY = 'quiz-submission-outbox';

const CRITICAL_FIELDS = ['studentId', 'quizId', 'classId', 'answers', 'postId'];

const cleanObject = (obj, parentKey = '') => {
  const missingFields = [];

  // --- BUG FIX: Protect Date objects from being destroyed ---
  if (obj instanceof Date) {
    return { cleaned: obj, missing: missingFields };
  }
  
  // --- BUG FIX: Protect Firebase Timestamps just in case ---
  if (obj && typeof obj.toDate === 'function') {
    return { cleaned: obj.toDate(), missing: missingFields };
  }

  if (Array.isArray(obj)) {
    const cleanedArray = obj.map((item, idx) => {
      const { cleaned, missing } = cleanObject(item, `${parentKey}[${idx}]`);
      missingFields.push(...missing);
      return cleaned;
    });
    return { cleaned: cleanedArray, missing: missingFields };
  } else if (obj !== null && typeof obj === 'object') {
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
  return { cleaned: obj === undefined ? null : obj, missing: missingFields };
};

export const queueQuizSubmission = async (submissionData) => {
  try {
    const outbox = await localforage.getItem(SUBMISSION_OUTBOX_KEY) || [];
    
    const dataToQueue = {
      ...submissionData,
      queuedAt: new Date().toISOString(), 
    };

    outbox.push(dataToQueue);
    await localforage.setItem(SUBMISSION_OUTBOX_KEY, outbox);
  } catch (error) {
    console.error("Offline Sync: Failed to queue submission", error);
    throw error;
  }
};

export const syncOfflineSubmissions = async () => {
  if (!navigator.onLine) {
    return { success: false, reason: 'offline' };
  }

  let outbox = [];
  try {
    outbox = await localforage.getItem(SUBMISSION_OUTBOX_KEY) || [];
  } catch (error) {
    return { success: false, reason: 'read_error' };
  }

  if (outbox.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  const batch = writeBatch(db);
  let syncedCount = 0;
  const totalMissing = [];
  const skippedSubmissions = []; 

  outbox.forEach(submission => {
    let missingCritical = false;
    CRITICAL_FIELDS.forEach(field => {
      if (submission[field] === undefined || submission[field] === null) {
        missingCritical = true;
      }
    });

    if (missingCritical) {
      skippedSubmissions.push(submission);
      return; 
    }

    const { cleaned, missing } = cleanObject(submission);
    
    if (missing.length > 0) {
       totalMissing.push(...missing);
    }

    // --- BUG FIX: Add strict fallback in case date is still corrupted ---
    if (!cleaned.submittedAt) {
      cleaned.submittedAt = serverTimestamp();
    } else {
        const parsedDate = new Date(cleaned.submittedAt);
        if (isNaN(parsedDate.getTime())) {
            cleaned.submittedAt = serverTimestamp(); // Fallback if invalid
        } else {
            cleaned.submittedAt = parsedDate;
        }
    }

    const submissionId = `${submission.studentId}-${submission.quizId}-${new Date(submission.queuedAt).getTime()}`;
    const submissionRef = doc(db, 'quizSubmissions', submissionId);

    batch.set(submissionRef, cleaned);
    syncedCount++;
  });

  try {
    await batch.commit();
    
    if (skippedSubmissions.length > 0) {
      await localforage.setItem(SUBMISSION_OUTBOX_KEY, skippedSubmissions);
    } else {
      await localforage.removeItem(SUBMISSION_OUTBOX_KEY);
    }
    
    triggerToast(`Synced ${syncedCount} submissions.`, "success");
    return { success: true, syncedCount: syncedCount, skippedCount: skippedSubmissions.length };
  } catch (error) {
    console.error("Sync: Failed to sync submissions:", error);
    triggerToast("❌ Sync failed. Please try again later.", "error");
    return { success: false, reason: 'batch_error', error };
  }
};