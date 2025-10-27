import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
// --- MODIFIED: Added PencilSquareIcon, ClockOutlineIcon ---
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, LockClosedIcon, InformationCircleIcon, ShieldExclamationIcon, XCircleIcon, XMarkIcon, DocumentArrowDownIcon, ClockIcon, PencilSquareIcon } from '@heroicons/react/24/solid';
import { ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline';
// --- END MODIFIED ---
import { db } from '../../services/firebase'; // Adjust path if needed
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../../contexts/ToastContext'; // Adjust path if needed
import Spinner from '../common/Spinner'; // Adjust path if needed
import ContentRenderer from './ContentRenderer'; // Adjust path if needed
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import QuizWarningModal from '../../components/common/QuizWarningModal'; // Adjust path if needed
import localforage from 'localforage';
import { queueQuizSubmission, syncOfflineSubmissions } from '../../services/offlineSyncService'; // Adjust path if needed
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import AntiCheatPlugin from '../../plugins/AntiCheatPlugin'; // Adjust path if needed

import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

// --- REMOVED: gradeEssayWithAI import ---

// Helper function to shuffle an array
const shuffleArray = (array) => {
    if (!array) return [];
    let currentIndex = array.length, randomIndex;
    const newArray = [...array];
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
};

export default function ViewQuizModal({ isOpen, onClose, onComplete, quiz, userProfile, classId, isTeacherView = false }) {
    const [currentQ, setCurrentQ] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(null); // Represents the *current* score (initially auto-graded)
    const [latestSubmission, setLatestSubmission] = useState(null); // Holds the full submission data
    const [attemptsTaken, setAttemptsTaken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);
    const [warnings, setWarnings] = useState(0);
    const [devToolWarnings, setDevToolWarnings] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const hasSubmitted = useRef(false);
    const justSubmitted = useRef(false); // Flag to prevent re-fetching immediately after submit
    const [showWarningModal, setShowWarningModal] = useState(false);
    const MAX_WARNINGS = 3;
    const [questionResult, setQuestionResult] = useState(null); // 'correct' or 'incorrect' for immediate feedback
    const [currentQuestionAttempted, setCurrentQuestionAttempted] = useState(false); // Used to enable 'Next' button
    const [matchingResult, setMatchingResult] = useState(null); // { correct: number, total: number }
    const [questionNumbering, setQuestionNumbering] = useState({ starts: [], totalItems: 0 }); // totalItems is max points
    const [isAvailable, setIsAvailable] = useState(false);
    const [availabilityMessage, setAvailabilityMessage] = useState('');
    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}`;
    const devToolWarningKey = `devToolWarnings_${quiz?.id}_${userProfile?.id}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}`;
    const { showToast } = useToast();
    const [isInfractionActive, setIsInfractionActive] = useState(false); // For anti-cheat
    const [timeRemaining, setTimeRemaining] = useState(null); // For timed quizzes
	const [allSubmissions, setAllSubmissions] = useState([]); //
	const [submissionToReview, setSubmissionToReview] = useState(null);

    // Get max attempts, default to 3
    const maxAttempts = quiz?.settings?.maxAttempts ?? 3;

    // Calculate question numbering and total possible points
    useEffect(() => {
        if (shuffledQuestions.length > 0) {
            let currentItemNumber = 1;
            const starts = [];
            let totalPossiblePoints = 0; // Use points for total
            shuffledQuestions.forEach(q => {
                starts.push(currentItemNumber);
                const pointsValue = Number(q.points) || 1; // Default to 1 point if missing/invalid
                currentItemNumber += pointsValue;
                totalPossiblePoints += pointsValue;
            });
            // totalItems now represents total possible points
            setQuestionNumbering({ starts, totalItems: totalPossiblePoints });
        }
    }, [shuffledQuestions]);

    // Function to issue warnings (anti-cheat)
    const issueWarning = useCallback(async (type = 'general') => {
        if (isTeacherView || isLocked || score !== null || showReview || hasSubmitted.current) return; // Don't issue warnings after submission

        try {
            if (type === 'devTools') {
                if (!(quiz?.settings?.detectDevTools ?? false)) return;
                const newDevToolWarningCount = devToolWarnings + 1;
                setDevToolWarnings(newDevToolWarningCount);
                localStorage.setItem(devToolWarningKey, newDevToolWarningCount.toString());

                if (newDevToolWarningCount >= MAX_WARNINGS) {
                    setIsLocked(true);
                    if (navigator.onLine) {
                        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                        await setDoc(lockRef, { quizId: quiz.id, studentId: userProfile.id, studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId, lockedAt: serverTimestamp(), reason: 'Developer tools opened too many times' });
                    }
                    showToast(`Quiz Locked: Developer tools warning limit reached.`, "error", 5000);
                } else {
                    showToast(`Developer tools warning ${newDevToolWarningCount} of ${MAX_WARNINGS}.`, "warning");
                }

            } else if (type === 'paste') {
                if (!(quiz?.settings?.warnOnPaste ?? false)) return;
                const newWarningCount = warnings + 1;
                setWarnings(newWarningCount);
                localStorage.setItem(warningKey, newWarningCount.toString());

                if (newWarningCount >= MAX_WARNINGS) {
                    setIsLocked(true);
                    setShowWarningModal(true); // Show modal confirming lock
                    if (navigator.onLine) {
                        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                        await setDoc(lockRef, { quizId: quiz.id, studentId: userProfile.id, studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId, lockedAt: serverTimestamp(), reason: 'Pasting content too many times' });
                    }
                } else {
                    setShowWarningModal(true); // Show warning modal
                }

            } else if (type === 'general') { // e.g., leaving tab/app
                if (!(quiz?.settings?.lockOnLeave ?? false)) return;
                const newWarningCount = warnings + 1;
                setWarnings(newWarningCount);
                localStorage.setItem(warningKey, newWarningCount.toString());

                if (newWarningCount >= MAX_WARNINGS) {
                    setIsLocked(true);
                    setShowWarningModal(true); // Show modal confirming lock
                    if (navigator.onLine) {
                        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                        await setDoc(lockRef, { quizId: quiz.id, studentId: userProfile.id, studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId, lockedAt: serverTimestamp(), reason: 'Too many unauthorized attempts to navigate away' });
                    }
                } else {
                    setShowWarningModal(true); // Show warning modal
                }
            }
        } catch (error) {
            console.error("Failed to issue warning or update lock status:", error);
            showToast("Could not process warning. Please proceed with caution.", "error");
        }
    }, [warnings, devToolWarnings, warningKey, devToolWarningKey, quiz, userProfile, classId, isLocked, score, showReview, isTeacherView, showToast, hasSubmitted]); // Added hasSubmitted

	// --- *** REVERTED: handleSubmit for Manual Teacher Trigger *** ---
	const handleSubmit = useCallback(async () => {
	    // Prevent multiple submissions or submitting if locked/already scored
        if (hasSubmitted.current || score !== null || isLocked) return;
	    hasSubmitted.current = true;
	    justSubmitted.current = true; // Flag to prevent immediate re-fetch issue

	    let calculatedScore = 0; // Score from auto-graded items only
	    const detailedAnswers = []; // Array to store processed answer details
        let containsEssays = false; // Flag if essays are present

	    // Iterate through each question in the shuffled order
        shuffledQuestions.forEach((q, index) => {
	        const userAnswer = userAnswers[index]; // Get the student's answer for this question
            const points = Number(q.points) || 1; // Get points for this question, default to 1

	        // --- Process Auto-graded Types ---
	        if (q.type === "multiple-choice") {
                const correctOption = q.options?.[q.correctAnswerIndex];
	            // Handle both {text:..} and string options
                const correctAnswer = (correctOption?.text || correctOption) ?? null;
                const selectedOption = q.options?.[userAnswer];
	            const selectedAnswer = (selectedOption?.text || selectedOption) ?? null;
	            const isCorrect = selectedAnswer !== null && selectedAnswer === correctAnswer;
	            const itemScore = isCorrect ? points : 0;
                if (isCorrect) calculatedScore += points; // Add to total if correct
	            // Store detailed answer object
                detailedAnswers.push({
                    questionType: q.type, questionText: q.text || q.question, selectedAnswer, correctAnswer, isCorrect,
                    points: points, score: itemScore, status: 'graded',
	                difficulty: q.difficulty ?? null, explanation: q.explanation ?? null
                 });
	        } else if (q.type === "identification" || q.type === "exactAnswer") {
	            // Format answers for case-insensitive and punctuation-insensitive comparison
                const formattedUserAnswer = String(userAnswer || "").toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            const formattedCorrectAnswer = String(q.correctAnswer || "").toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            const isCorrect = formattedUserAnswer === formattedCorrectAnswer;
                const itemScore = isCorrect ? points : 0;
	            if (isCorrect) calculatedScore += points;
	            detailedAnswers.push({
                    questionType: q.type, questionText: q.text || q.question, selectedAnswer: userAnswer || null, correctAnswer: q.correctAnswer ?? null, isCorrect,
                    points: points, score: itemScore, status: 'graded',
	                difficulty: q.difficulty ?? null, explanation: q.explanation ?? null
                });
	        } else if (q.type === "true-false") {
	            const isCorrect = userAnswer === q.correctAnswer; // Direct boolean comparison
                const itemScore = isCorrect ? points : 0;
	            if (isCorrect) calculatedScore += points;
	            detailedAnswers.push({
                    questionType: q.type, questionText: q.text || q.question, selectedAnswer: userAnswer === undefined ? null : String(userAnswer), correctAnswer: q.correctAnswer !== undefined ? String(q.correctAnswer) : null, isCorrect,
                    points: points, score: itemScore, status: 'graded',
	                difficulty: q.difficulty ?? null, explanation: q.explanation ?? null
                });
	        } else if (q.type === "matching-type") {
	            const userPairs = userAnswer || {}; // Student's { promptId: optionId } matches
                const reviewPrompts = []; // For storing detailed results for review
	            let correctPairsCount = 0;
                let scoreForThisQuestion = 0;
                const numPrompts = q.prompts?.length || 0;
                // Calculate points per correct match, handle potential division by zero
                const pointsPerItem = numPrompts > 0 ? (points / numPrompts) : 0;

	            // Evaluate each prompt
                (q.prompts || []).forEach(prompt => {
                    // Check if the student's match for this prompt is correct
	                const isPairCorrect = userPairs[prompt.id] && q.correctPairs && userPairs[prompt.id] === q.correctPairs[prompt.id];
	                if (isPairCorrect) {
	                    scoreForThisQuestion += pointsPerItem; // Add partial score
	                    correctPairsCount++;
	                }
	                // Store detailed info for review screen
                    reviewPrompts.push({
                        id: prompt.id, text: prompt.text,
	                    userAnswerId: userPairs[prompt.id] || null,
	                    userAnswerText: q.options?.find(opt => opt.id === userPairs[prompt.id])?.text || "Not Answered",
	                    correctAnswerId: q.correctPairs?.[prompt.id] || null,
	                    correctAnswerText: q.options?.find(opt => opt.id === q.correctPairs?.[prompt.id])?.text || null
                    });
	            });
                // Award full points if all correct, avoiding potential float issues
                if (numPrompts > 0 && correctPairsCount === numPrompts) { scoreForThisQuestion = points; }
                else { scoreForThisQuestion = Math.round(scoreForThisQuestion * 100) / 100; } // Round partial scores
                calculatedScore += scoreForThisQuestion; // Add this question's score to total
	            detailedAnswers.push({
                    questionType: q.type, questionText: q.text || q.question, prompts: reviewPrompts,
	                isCorrect: (numPrompts > 0 && correctPairsCount === numPrompts), // Overall correctness
                    points: points, score: scoreForThisQuestion, status: 'graded', // Store calculated score
                    correctCount: correctPairsCount, // Number of correct pairs
	                difficulty: q.difficulty ?? null, explanation: q.explanation ?? null
                });

            // --- Essay Handling for Manual/AI Trigger ---
	        } else if (q.type === "essay") {
                containsEssays = true; // Mark that essays exist
                const essayAnswer = userAnswer || ""; // Get student's text
                // Store essay answer details, mark as pending grading
                detailedAnswers.push({
	                questionType: q.type,
	                questionText: q.text || q.question,
	                selectedAnswer: essayAnswer, // Save the student's answer
	                correctAnswer: null, // No single "correct" answer
                    rubric: q.rubric || [], // Include the rubric for the teacher/AI
	                isCorrect: null, // To be determined by grader
                    points: points,
                    score: 0, // Initial score is 0
                    aiGradingResult: null, // Placeholder for potential future AI results
                    status: 'pending_ai_grading', // Mark as pending grading action
	                difficulty: q.difficulty ?? null,
	                explanation: q.explanation ?? null // Usually null for essays
	            });
                // DO NOT add essay points to calculatedScore yet
            }
	    });

        // No AI calls happen here on the student's side

        const finalScore = Math.round(calculatedScore); // Final score from auto-graded items
	    setScore(finalScore); // Update state to show score screen

	    // Clear local storage items used during the quiz attempt
	    localStorage.removeItem(warningKey);
        localStorage.removeItem(devToolWarningKey);
	    localStorage.removeItem(shuffleKey);
	    setWarnings(0); // Reset warnings count in state
        setDevToolWarnings(0);
        setIsInfractionActive(false); // Reset anti-cheat state

	    try {
	        // Prepare the complete submission data object
	        const submissionData = {
	            quizId: quiz.id,
	            quizTitle: quiz.title,
	            classId: classId,
	            studentId: userProfile.id,
	            studentName: `${userProfile.firstName} ${userProfile.lastName}`,
	            answers: detailedAnswers, // Includes essays marked as pending
	            score: finalScore, // Initial score (auto-graded part only)
                status: containsEssays ? 'pending_ai_grading' : 'graded', // Overall status depends on essays
                hasPendingEssays: containsEssays, // Flag for the teacher/backend process
	            totalItems: questionNumbering.totalItems, // Total *possible points*
	            attemptNumber: attemptsTaken + 1,
	            submittedAt: new Date(), // Use JS Date for offline/Firestore compatibility
	            quarter: quiz.quarter || null // Include quarter if available
	        };

	        await queueQuizSubmission(submissionData); // Save to local IndexedDB queue first
	        if (navigator.onLine) {
	            await syncOfflineSubmissions(); // Attempt to sync with Firestore immediately if online
	        }
	        setLatestSubmission({ ...submissionData }); // Update local state for immediate feedback/review
	        setAttemptsTaken(prev => prev + 1); // Increment attempt counter
	        // Show success/pending message
            showToast(
	            navigator.onLine
	                ? (containsEssays ? "Quiz submitted! Essays pending teacher review." : "Quiz submitted successfully!")
	                : "📡 Quiz saved offline. Will sync and essays will be reviewed when online.",
	            containsEssays ? "info" : "success",
                containsEssays ? 5000 : 3000 // Longer toast if essays pending
	        );
	        if (onComplete) {
	            onComplete(); // Notify parent component (e.g., to close lesson view)
	        }
	    } catch (error) {
	        console.error("Error queuing submission:", error);
	        showToast("❌ Could not save your quiz submission locally. Please try again.", "error");
            // Important: Revert submission state flags if saving failed
            hasSubmitted.current = false;
            justSubmitted.current = false;
            // Optionally revert score state if needed, though it might confuse user
            // setScore(null);
	    }
	}, [ // Dependencies for useCallback
	    userAnswers, score, shuffledQuestions, quiz, userProfile, classId, attemptsTaken,
	    warningKey, devToolWarningKey, shuffleKey, isLocked, showToast, onComplete, questionNumbering.totalItems
	]);
    // --- *** END OF REVERTED handleSubmit *** ---

	// --- MODIFICATION: Add function to reset state for a new attempt ---
	const handleStartNewAttempt = useCallback(() => {
	// Reset all quiz-taking state
	setCurrentQ(0);
	setUserAnswers({});
	setScore(null); // This is the key to exit the results screen
	setShowReview(false);
	setSubmissionToReview(null); // <-- MODIFICATION: Reset submission to review
	hasSubmitted.current = false;
	        setQuestionResult(null);
	        setCurrentQuestionTaskAttempted(false);
	        setMatchingResult(null);
	        setIsInfractionActive(false); 
        
	        // Clear old shuffle data and re-shuffle if needed
	        localStorage.removeItem(shuffleKey); 
	        const shouldShuffle = quiz?.settings?.shuffleQuestions ?? false;
	        const baseQuestions = quiz.questions || [];
        
	        let newShuffledQuestions;
	        if (shouldShuffle) {
	            newShuffledQuestions = shuffleArray(baseQuestions);
	localStorage.setItem(shuffleKey, JSON.stringify(newShuffledQuestions));
	} else {
	newShuffledQuestions = baseQuestions;
	}
	setShuffledQuestions(newShuffledQuestions); // Update state
      
	}, [quiz, shuffleKey]); // Dependencies
	// --- END MODIFICATION ---

// Fetch submission data and lock status
    const fetchSubmission = useCallback(async () => {
        if (!quiz?.id || !userProfile?.id || !classId || isTeacherView) { setLoading(false); return; } // Skip if teacher or missing IDs
        setLoading(true);
        try {
            let isDbLocked = false;
            let dbSubmissions = [];
            let localWarningCount = parseInt(localStorage.getItem(warningKey) || '0', 10);
            let localDevToolWarningCount = parseInt(localStorage.getItem(devToolWarningKey) || '0', 10);

            // Check online status and fetch from Firestore if online
            if (navigator.onLine) {
                // Check lock status in Firestore
                const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                const lockSnap = await getDoc(lockRef);
                isDbLocked = lockSnap.exists();

                // If not locked in DB but locked locally, maybe teacher unlocked it? Reset local.
                if (!isDbLocked && (localWarningCount >= MAX_WARNINGS || localDevToolWarningCount >= MAX_WARNINGS)) {
                    localStorage.removeItem(warningKey);
                    localStorage.removeItem(devToolWarningKey);
                    setWarnings(0);
                    setDevToolWarnings(0);
                    localWarningCount = 0; // Reset local counter
                    showToast("Your teacher may have unlocked this quiz.", "info");
                }

                // Fetch previous submissions from Firestore
                const submissionsRef = collection(db, 'quizSubmissions');
                const q = query(submissionsRef,
                    where("quizId", "==", quiz.id),
                    where("studentId", "==", userProfile.id),
                    where("classId", "==", classId)
                );
                const querySnapshot = await getDocs(q);
                dbSubmissions = querySnapshot.docs.map(d => ({ id: d.id, ...d.data(), submittedAt: d.data().submittedAt?.toDate ? d.data().submittedAt.toDate() : d.data().submittedAt })); // Convert Firestore Timestamps
                dbSubmissions.sort((a, b) => (new Date(b.submittedAt).getTime() || 0) - (new Date(a.submittedAt).getTime() || 0)); // Sort by date descending
            }

            // Check if locked based on DB status or local warning count
            const isLocallyLocked = localWarningCount >= MAX_WARNINGS || localDevToolWarningCount >= MAX_WARNINGS;
            setIsLocked(isDbLocked || isLocallyLocked);

            // Check offline submissions queue
            const offlineSubmissions = await localforage.getItem("quiz-submission-outbox") || [];
            const myOfflineAttempts = offlineSubmissions.filter(sub =>
                sub.quizId === quiz.id && sub.studentId === userProfile.id && sub.classId === classId
            );

            // Combine online and offline attempts, avoiding duplicates
            const dbSubmissionIds = new Set(dbSubmissions.map(s => s.submissionId)); // Use a unique ID if available, else Firestore ID
            const uniqueOfflineAttempts = myOfflineAttempts.filter(s => !dbSubmissionIds.has(s.submissionId)); // Assuming offline queue adds unique ID

            const allAttempts = [...dbSubmissions, ...uniqueOfflineAttempts];
            allAttempts.sort((a, b) => (new Date(b.submittedAt).getTime() || 0) - (new Date(a.submittedAt).getTime() || 0)); // Sort combined attempts

            setAttemptsTaken(allAttempts.length);
            setLatestSubmission(allAttempts[0] || null); // Set the most recent attempt
            setAllSubmissions(allAttempts); // <-- MODIFICATION: Store all attempts
            
			// --- MODIFICATION: Check for previous graded attempt ---
 const latest = allAttempts[0] || null;
// Check if:
// 1. A latest attempt exists.
 // 2. It has a 'graded' or 'pending' status (meaning it's complete).
// 3. The user still has attempts left.
if (latest && (latest.status === 'graded' || latest.status === 'pending_review' || latest.status === 'pending_ai_grading') && allAttempts.length < maxAttempts && allAttempts.length > 0) {
// Set the score state to the *previous* attempt's score.
// This will trigger renderContent() to show the results screen.
 setScore(latest.score); 
// Also set hasSubmitted to true to ensure we're in a "results" view
 hasSubmitted.current = true;
}
// --- END MODIFICATION ---


        } catch (error) {
            console.error("Error fetching submission data:", error);
            showToast("❌ Could not load past submission data. Proceeding with caution.", "warning");
            // Fallback: Check local lock status only
            const localWarnings = parseInt(localStorage.getItem(warningKey) || '0', 10);
            const localDevWarnings = parseInt(localStorage.getItem(devToolWarningKey) || '0', 10);
            setIsLocked(localWarnings >= MAX_WARNINGS || localDevWarnings >= MAX_WARNINGS);
            setAttemptsTaken(0); // Assume 0 if fetch failed
            setLatestSubmission(null);
            setAllSubmissions([]); // <-- MODIFICATION: Reset all attempts on error
            setScore(null);
            hasSubmitted.current = false;
        } finally {
            setLoading(false);
        }
    }, [quiz?.id, userProfile?.id, classId, isTeacherView, warningKey, devToolWarningKey, showToast, maxAttempts]); // <-- MODIFICATION: Added maxAttempts to dependency array

    // --- Anti-Cheat useEffect Hooks ---
    // App State Change Listener (Native)
    useEffect(() => {
        let listener;
        if (isOpen && Capacitor.isNativePlatform() && !isTeacherView && (quiz?.settings?.lockOnLeave ?? false) && !isLocked && !hasSubmitted.current) {
            listener = App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) {
                    setIsInfractionActive(true);
                    issueWarning('general');
                } else {
                     setIsInfractionActive(false);
                }
            });
        }
        return () => { listener?.remove(); };
    }, [isOpen, issueWarning, isTeacherView, quiz?.settings?.lockOnLeave, isLocked, hasSubmitted]);

	// Unified Anti-Cheat (Plugin, AppState, Native Bridge Fallback)
	useEffect(() => {
        // Only run if native and anti-cheat enabled
	    if (!Capacitor.isNativePlatform() || isTeacherView || !(quiz?.settings?.lockOnLeave ?? false)) return;

        const canWarn = () => isOpen && !isLocked && !hasSubmitted.current && (quiz?.settings?.lockOnLeave ?? false);

	    // Plugin Listeners
	    const leaveListener = AntiCheatPlugin.addListener("userLeftHint", () => { if (canWarn()) { console.log("Plugin: userLeftHint"); issueWarning('general'); }});
	    const pauseListener = AntiCheatPlugin.addListener("appPaused", () => { if (canWarn()) { console.log("Plugin: appPaused"); issueWarning('general'); }});
	    const resumeListener = AntiCheatPlugin.addListener("appResumed", () => { console.log("Plugin: appResumed"); setIsInfractionActive(false); });

	    // AppState Listener (redundant but good fallback)
	    const appListener = App.addListener("appStateChange", ({ isActive }) => {
            if (!isActive && canWarn()) { console.log("App Listener: Inactive"); issueWarning('general'); setIsInfractionActive(true); }
            else if (isActive) { setIsInfractionActive(false); }
	    });

	    // Native Bridge Fallback Listeners
	    const handleNativeFocusChange = (event) => {
            const data = event.detail || event.data || "";
            if (typeof data === "string" && data.includes('"hasFocus": false') && canWarn()) {
                console.log("Native Bridge: hasFocus false");
                issueWarning('general');
                setIsInfractionActive(true);
            } else if (typeof data === "string" && data.includes('"hasFocus": true')) {
                 setIsInfractionActive(false);
            }
	    };
        const handleNativeUserLeft = (event) => {
             const data = event.detail || event.data || "";
             if (typeof data === "string" && data.includes('"reason": "userLeftHint"') && canWarn()) {
                console.log("Native Bridge: userLeftHint");
                issueWarning('general');
                setIsInfractionActive(true);
             }
        }
	    window.addEventListener("windowFocusChanged", handleNativeFocusChange);
	    window.addEventListener("userLeftHint", handleNativeUserLeft); // Listen specifically for this too

	    // Cleanup
        return () => {
            leaveListener.remove();
            pauseListener.remove();
            resumeListener.remove();
            appListener.remove();
            window.removeEventListener("windowFocusChanged", handleNativeFocusChange);
            window.removeEventListener("userLeftHint", handleNativeUserLeft);
	    };
	}, [isOpen, quiz?.settings?.lockOnLeave, isLocked, score, issueWarning, isTeacherView, hasSubmitted]);

	// Strict Overlay Detection (Native Bridge)
	useEffect(() => {
	    if (!Capacitor.isNativePlatform() || isTeacherView || !(quiz?.settings?.lockOnLeave ?? false)) return;
        const canWarn = () => isOpen && !isLocked && !hasSubmitted.current && (quiz?.settings?.lockOnLeave ?? false);
	    const handleOverlayDetected = (event) => { if(canWarn()) { console.log("Native Bridge: overlayDetected"); issueWarning('general'); setIsInfractionActive(true);} };
	    window.addEventListener("overlayDetected", handleOverlayDetected);
	    return () => { window.removeEventListener("overlayDetected", handleOverlayDetected); };
	}, [isOpen, quiz?.settings?.lockOnLeave, isLocked, score, issueWarning, isTeacherView, hasSubmitted]);

    // Web Blur/Focus Listeners
    useEffect(() => {
        if (Capacitor.isNativePlatform() || isTeacherView || !(quiz?.settings?.lockOnLeave ?? false)) return; // Don't use on native or for teachers
        const canWarn = () => isOpen && !isLocked && !hasSubmitted.current && (quiz?.settings?.lockOnLeave ?? false);
        const handleFocusLoss = () => { if (canWarn()) { console.log("Web: blur"); issueWarning('general'); setIsInfractionActive(true); } };
        const handleFocusGain = () => { setIsInfractionActive(false); };
        window.addEventListener('blur', handleFocusLoss);
        window.addEventListener('focus', handleFocusGain);
        return () => {
            window.removeEventListener('blur', handleFocusLoss);
            window.removeEventListener('focus', handleFocusGain);
        };
    }, [isOpen, isLocked, score, classId, issueWarning, showReview, isTeacherView, quiz?.settings?.lockOnLeave, hasSubmitted]);

	// Visibility Change Listener (Web/Mobile Web)
	useEffect(() => {
	    if (Capacitor.isNativePlatform() || isTeacherView || !(quiz?.settings?.lockOnLeave ?? false)) return;
        const canWarn = () => isOpen && !isLocked && !hasSubmitted.current && (quiz?.settings?.lockOnLeave ?? false);
	    const handleVisibilityChange = () => {
            if (document.hidden && canWarn()) { console.log("Web: visibilitychange hidden"); issueWarning('general'); setIsInfractionActive(true); }
            else if (!document.hidden) { setIsInfractionActive(false); }
	    };
	    document.addEventListener("visibilitychange", handleVisibilityChange);
	    return () => { document.removeEventListener("visibilitychange", handleVisibilityChange); };
	}, [isOpen, isLocked, score, classId, issueWarning, showReview, isTeacherView, quiz?.settings?.lockOnLeave, hasSubmitted]);

    // Continuous Warning Timer (When Infraction Active)
    useEffect(() => {
        let warningInterval = null;
        const canIssueWarning = isOpen && !isTeacherView && !isLocked && !hasSubmitted.current && (quiz?.settings?.lockOnLeave ?? false);
        if (isInfractionActive && canIssueWarning) {
            console.log("Starting continuous warning interval...");
            warningInterval = setInterval(() => {
                console.log("Continuous warning timer fired...");
                issueWarning('general');
            }, 7000); // Issue warning every 7 seconds while infraction is active
        } else {
             if(warningInterval) console.log("Clearing continuous warning interval.");
        }
        return () => { if (warningInterval) clearInterval(warningInterval); };
    }, [isInfractionActive, isOpen, isTeacherView, isLocked, score, hasSubmitted, quiz?.settings?.lockOnLeave, issueWarning]);

    // Before Unload Listener (Web)
    useEffect(() => {
        if (Capacitor.isNativePlatform() || isTeacherView || !(quiz?.settings?.lockOnLeave ?? false)) return;
        const handleBeforeUnload = (event) => {
            if (isOpen && !isLocked && score === null && !hasSubmitted.current && (quiz?.settings?.lockOnLeave ?? false)) {
                issueWarning('general'); // Issue warning immediately on attempt
                event.preventDefault();
                event.returnValue = 'Leaving the quiz will result in a warning and may lock your quiz. Are you sure?'; // Standard browser prompt text
                return event.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, classId, isLocked, score, issueWarning, isTeacherView, quiz?.settings?.lockOnLeave, hasSubmitted]);

    // Countdown Timer Logic
    useEffect(() => {
        const isExam = quiz?.settings?.maxAttempts === 1; // Only time exams
        const hasEndDate = quiz?.availableUntil;
        // Conditions to run the timer
        const canRunTimer = isOpen && !isTeacherView && !loading && isAvailable && !isLocked && score === null && !hasSubmitted.current && isExam && hasEndDate;

        if (!canRunTimer) {
            setTimeRemaining(null); // Reset timer if conditions not met
            return;
        }

        let interval = null;
        // Function to update remaining time
        const updateRemainingTime = () => {
            const endTime = quiz.availableUntil.toDate().getTime();
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000)); // Ensure non-negative

            setTimeRemaining(remainingSeconds); // Update state

            if (remainingSeconds <= 0) {
                if (!hasSubmitted.current) { // Check ref again to prevent race condition
                    showToast("Time's up! Submitting your quiz automatically...", "warning", 4000);
                    handleSubmit(); // Auto-submit
                }
                if (interval) clearInterval(interval); // Stop timer
                return false; // Indicate timer should stop
            }
            return true; // Indicate timer should continue
        };

        // Initial check and start interval
        if (updateRemainingTime()) {
            interval = setInterval(updateRemainingTime, 1000);
        }

        // Cleanup interval on unmount or when conditions change
        return () => { if (interval) clearInterval(interval); };
    }, [ // Dependencies for timer logic
        isOpen, isTeacherView, loading, isAvailable, isLocked, score, hasSubmitted,
        quiz?.settings?.maxAttempts, quiz?.availableUntil,
        handleSubmit, showToast
    ]);

    // Main setup useEffect (loading data, checking availability, shuffle, warnings)
    useEffect(() => {
        if (isOpen) {
            // Prevent refetch if just submitted to avoid overwriting state
            if (justSubmitted.current) {
                justSubmitted.current = false;
                setLoading(false); // Assume state is up-to-date from handleSubmit
                return;
            }
            // Reset state for a new attempt or view
            setCurrentQ(0);
            setUserAnswers({});
            setScore(null); // Clear score state
            setShowReview(false);
            hasSubmitted.current = false; // Reset submitted flag
            setQuestionResult(null);
            setCurrentQuestionAttempted(false);
            setMatchingResult(null);
            setIsInfractionActive(false); // Reset anti-cheat state
            setLoading(true);

            // 1. Check Availability (only for students)
            if (!isTeacherView) {
                const now = new Date();
                const from = quiz?.availableFrom?.toDate();
                const until = quiz?.availableUntil?.toDate();
                if (from && from > now) {
                    setIsAvailable(false); setAvailabilityMessage(`This quiz will be available on ${from.toLocaleString()}.`); setLoading(false); return;
                }
                if (until && until < now) { // Use '<' to allow taking quiz exactly at expiry time if needed
                    setIsAvailable(false); setAvailabilityMessage('This quiz has expired and is no longer available.'); setLoading(false); return;
                }
            }
            setIsAvailable(true); // If checks pass or if it's teacher view

            // 2. Load Student-Specific Data (warnings, submissions, lock status)
            if (!isTeacherView) {
                // Load warnings from local storage
                const savedWarnings = localStorage.getItem(warningKey);
                setWarnings(savedWarnings ? parseInt(savedWarnings, 10) : 0);
                const savedDevToolWarnings = localStorage.getItem(devToolWarningKey);
                setDevToolWarnings(savedDevToolWarnings ? parseInt(savedDevToolWarnings, 10) : 0);

                // Fetch submission history and lock status (sets loading to false)
                fetchSubmission(); // This function now also updates score/hasSubmitted based on fetched data

                // 3. Handle Question Shuffling
                const shouldShuffle = quiz?.settings?.shuffleQuestions ?? false;
                const baseQuestions = quiz.questions || [];
                try {
                    if (shouldShuffle) {
                        const savedShuffleOrder = localStorage.getItem(shuffleKey);
                        if (savedShuffleOrder) {
                            const parsedOrder = JSON.parse(savedShuffleOrder);
                            // Basic validation: Check if counts match
                            if (Array.isArray(parsedOrder) && parsedOrder.length === baseQuestions.length) {
                                // TODO: Ideally, reorder based on IDs if questions have them.
                                // For now, assume the saved array is correct if counts match.
                                setShuffledQuestions(parsedOrder);
                                console.log("Using shuffle order from localStorage.");
                            } else {
                                // Mismatch, reshuffle
                                console.log("Shuffle order mismatch, reshuffling.");
                                const newShuffled = shuffleArray(baseQuestions);
                                setShuffledQuestions(newShuffled);
                                localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
                            }
                        } else {
                            // No saved order, shuffle now
                            const newShuffled = shuffleArray(baseQuestions);
                            setShuffledQuestions(newShuffled);
                            localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
                            console.log("Shuffled questions and saved order.");
                        }
                    } else {
                        // No shuffle needed
                        setShuffledQuestions(baseQuestions);
                        localStorage.removeItem(shuffleKey); // Clear any old shuffle order
                    }
                } catch (e) {
                    console.error("Error handling question shuffling:", e);
                    setShuffledQuestions(shuffleArray(baseQuestions)); // Fallback shuffle
                }
                // setLoading(false) is handled within fetchSubmission for student view
            } else {
                // Teacher View Setup
                setWarnings(0);
                setDevToolWarnings(0);
                setIsLocked(false);
                setShuffledQuestions(quiz.questions || []); // Use original order
                setLoading(false); // Teacher view doesn't fetch submissions here
            }
        } else {
            // Cleanup on modal close
            setShowWarningModal(false);
            setIsInfractionActive(false);
            // Consider if shuffleKey should be cleared on close or only when shuffle is disabled
        }
    }, [isOpen, quiz, isTeacherView, warningKey, devToolWarningKey, shuffleKey, fetchSubmission]); // Dependencies

    // --- PDF Export ---
	const handleExportPdf = async () => {
	    if (!quiz?.questions || quiz.questions.length === 0) {
	        showToast("No questions available to export.", "warning");
	        return;
	    }
	    try {
	        const doc = new jsPDF();
	        const quizBody = [];
	        const answerKey = [];
	        let itemCounter = 1; // Keep track of item numbers manually

	        quiz.questions.forEach((q, qIndex) => {
	            let questionContent = q.question || q.text || `Question ${qIndex + 1} Text Missing`;
	            let correctAnswerText = '';
                const points = Number(q.points) || 1;
                const currentItemLabel = points > 1 ? `${itemCounter}-${itemCounter + points - 1}` : `${itemCounter}`;

	            if (q.type === 'multiple-choice' && q.options) {
	                const optionsText = q.options.map((opt, idx) => `  ${String.fromCharCode(97 + idx)}. ${opt.text || opt}`).join('\n');
	                questionContent += `\n${optionsText}`;
	                // Find correct answer (works for both formats)
                    const correctOpt = q.options[q.correctAnswerIndex];
                    correctAnswerText = correctOpt?.text || correctOpt || 'N/A';
	            } else if (q.type === 'true-false') {
                     questionContent += quiz.language === 'Filipino' ? '\n  a. Tama\n  b. Mali' : '\n  a. True\n  b. False';
                     correctAnswerText = quiz.language === 'Filipino' ? (q.correctAnswer ? 'Tama' : 'Mali') : String(q.correctAnswer);
                } else if (q.type === 'matching-type') {
                     // Basic representation for PDF
                     questionContent += '\n(Match items in Column A with Column B)';
                     // Answer key needs expansion
                     correctAnswerText = (q.prompts || []).map((p, pIdx) => {
                         const correctOpt = (q.options || []).find(opt => q.correctPairs && opt.id === q.correctPairs[p.id]);
                         const optLetter = String.fromCharCode(97 + (q.options || []).findIndex(opt => opt.id === correctOpt?.id));
                         return `${itemCounter + pIdx}. ${optLetter}`;
                     }).join('; ');
                } else if (q.type === 'essay') {
                    correctAnswerText = '(Essay - Manual/AI Grade)'; // Indicate no single key
                    if(q.rubric && q.rubric.length > 0) {
                        questionContent += `\n\nRubric:\n${q.rubric.map(r => `  - ${r.criteria} (${r.points} pts)`).join('\n')}`;
                    }
                }
                 else { // Identification, ExactAnswer
                    correctAnswerText = String(q.correctAnswer ?? 'N/A');
                }

	            if (q.explanation && q.type !== 'essay') { // Don't typically add explanation to essay prompts in export
	                questionContent += `\n\nExplanation: ${q.explanation}`;
	            }

	            quizBody.push([currentItemLabel, questionContent]); // Use calculated label

                // Add to answer key (handle matching expansion)
                if (q.type === 'matching-type') {
                     (q.prompts || []).forEach((p, pIdx) => {
                         const correctOpt = (q.options || []).find(opt => q.correctPairs && opt.id === q.correctPairs[p.id]);
                         const optLetter = String.fromCharCode(97 + (q.options || []).findIndex(opt => opt.id === correctOpt?.id));
                         const optText = correctOpt?.text || 'N/A';
                         answerKey.push([itemCounter + pIdx, `${optLetter}. ${optText}`]);
                     });
                } else {
                     answerKey.push([currentItemLabel, correctAnswerText]);
                }

                itemCounter += points; // Increment by points for next item number
	        });

	        // Generate PDF
	        doc.setFontSize(18);
	        doc.text(quiz.title || "Quiz Export", 14, 22);
	        autoTable(doc, { head: [['#', 'Question / Prompt']], body: quizBody, startY: 30, theme: 'grid', headStyles: { fillColor: [41, 128, 185], textColor: 255 }, styles: { cellPadding: 2, fontSize: 10 } });
	        doc.addPage();
	        doc.setFontSize(18);
	        doc.text('Answer Key', 14, 22);
	        autoTable(doc, { head: [['#', 'Correct Answer / Match']], body: answerKey, startY: 30, theme: 'striped', headStyles: { fillColor: [22, 160, 133], textColor: 255 }, styles: { cellPadding: 2, fontSize: 10 } });

	        // Save/Open PDF
            const quizTitleToExport = quiz.title || 'quiz';
            const sanitizedFileName = quizTitleToExport.replace(/[\\/:"*?<>|]+/g, '_') + '.pdf';
            if (Capacitor.isNativePlatform()) {
                // --- Native Save/Open Logic ---
                let permStatus = await Filesystem.checkPermissions();
                if (permStatus.publicStorage !== 'granted') { permStatus = await Filesystem.requestPermissions(); }
                if (permStatus.publicStorage !== 'granted') { showToast("Storage permission needed.", "error"); return; }
                const base64Data = doc.output('datauristring').split(',')[1];
                const directory = Directory.Documents;
                const filePath = sanitizedFileName;
                const result = await Filesystem.writeFile({ path: filePath, data: base64Data, directory: directory, recursive: true });
                showToast("Saved to Documents.", "info");
                await FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' });
                // --- End Native ---
            } else {
                // --- Web Save Logic ---
                doc.save(sanitizedFileName);
                showToast("Quiz exported as PDF.", "success");
                // --- End Web ---
            }

	    } catch (error) {
	        console.error("Error exporting PDF:", error);
	        showToast(`Failed to export PDF: ${error.message}`, "error");
	    }
	};


    // --- Other Helper Functions ---
    const totalQuestions = shuffledQuestions.length; // Number of question *blocks*
    const hasAttemptsLeft = isTeacherView ? true : attemptsTaken < maxAttempts;


    // Handle user answering a question
    const handleAnswer = (answer, questionType) => {
         // Allow editing essays anytime before submission
        if (isTeacherView || (currentQuestionAttempted && questionType !== 'matching-type' && questionType !== 'essay')) {
            return; // Don't allow changing answers for auto-graded after attempt, unless it's an essay
        }

        setUserAnswers({ ...userAnswers, [currentQ]: answer });

        // Provide immediate feedback only for auto-graded types (not essays)
        if (questionType !== 'matching-type' && questionType !== 'essay') {
            const currentQuestion = shuffledQuestions[currentQ];
            setCurrentQuestionAttempted(true); // Mark as attempted to show feedback/enable Next
            let isCorrect = false;
            // Determine correctness based on type
            if (currentQuestion.type === 'multiple-choice') { isCorrect = (answer === currentQuestion.correctAnswerIndex); }
            else if (currentQuestion.type === 'true-false') { isCorrect = (answer === currentQuestion.correctAnswer); }
            else if (currentQuestion.type === 'identification' || currentQuestion.type === 'exactAnswer') {
                const formattedUserAnswer = String(answer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                const formattedCorrectAnswer = String(currentQuestion.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                isCorrect = (formattedUserAnswer === formattedCorrectAnswer);
            }
            setQuestionResult(isCorrect ? 'correct' : 'incorrect'); // Set state for feedback display
        } else if (questionType === 'essay') {
            // For essays, typing anything marks it as "attempted" for navigation purposes
             if (!currentQuestionAttempted && String(answer || '').trim() !== '') {
                  setCurrentQuestionAttempted(true);
             }
        }
        // Matching type confirmation is handled separately by handleConfirmMatchingAnswer
    };

    // Move to the next question or submit
    const handleNextQuestion = () => {
        // Reset feedback states for the next question
        setCurrentQuestionAttempted(false);
        setQuestionResult(null);
        setMatchingResult(null);
        if (currentQ < totalQuestions - 1) {
            setCurrentQ(prev => prev + 1); // Go to next question index
        } else {
            handleSubmit(); // Auto-submit after the last question
        }
    };

    // Handle closing the modal (check for anti-cheat warning)
    const handleClose = () => {
        setIsInfractionActive(false); // Reset infraction state on close attempt
        const antiCheatEnabled = quiz?.settings?.lockOnLeave ?? false;
        // Show warning modal if quiz is active, anti-cheat enabled, not locked, not submitted, and available
        if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView && antiCheatEnabled && isAvailable) {
            setShowWarningModal(true);
        } else {
            onClose(); // Close normally otherwise
        }
    };

    // User chooses to stay in the quiz from warning modal
    const handleStayInQuiz = () => { setShowWarningModal(false); };

    // User chooses to leave quiz from warning modal (issue warning first, then close)
    const handleLeaveQuiz = async () => {
        await issueWarning('general'); // Issue the warning
        setShowWarningModal(false);
        setIsInfractionActive(false); // Reset infraction state
        onClose(); // Then close the modal
    };

    // Handle keyboard navigation (Arrow keys)
    const handleKeyDown = useCallback((event) => {
         // Ignore if quiz done, locked, reviewing, or focus is on input/textarea
        if (score !== null || isLocked || showReview || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        const currentQuestion = shuffledQuestions[currentQ];
        const currentQuestionType = currentQuestion?.type;

        // Determine if navigation is allowed
        // Can navigate if attempted (auto-graded), or if it's an essay (allows moving after typing)
        const canNavigate = currentQuestionAttempted || currentQuestionType === 'essay';

        if (event.key === 'ArrowRight') {
            if (isTeacherView) { // Teacher can always navigate forward
                if (currentQ < totalQuestions - 1) setCurrentQ(prev => prev + 1);
            } else if (canNavigate) { // Student navigation allowed
                handleNextQuestion();
            }
        } else if (event.key === 'ArrowLeft') {
             // Prevent back navigation if setting enabled (student only)
             if (quiz?.settings?.preventBackNavigation && !isTeacherView) {
                showToast("Going back to previous questions is disabled for this quiz.", "warning");
                return;
             }
             // Allow back navigation (resetting feedback states)
             if (currentQ > 0) {
                setCurrentQuestionAttempted(false); // Reset attempted state when going back
                setQuestionResult(null);
                setMatchingResult(null);
                setCurrentQ(prev => prev - 1);
            }
        }
    }, [score, isLocked, showReview, isTeacherView, currentQ, totalQuestions, shuffledQuestions, currentQuestionAttempted, handleNextQuestion, quiz?.settings?.preventBackNavigation, showToast]); // Added showToast dependency

    // Add/Remove Keydown Listener based on modal visibility
    useEffect(() => {
        if (isOpen) { window.addEventListener('keydown', handleKeyDown); }
        else { window.removeEventListener('keydown', handleKeyDown); } // Ensure removal
        return () => { window.removeEventListener('keydown', handleKeyDown); };
    }, [isOpen, handleKeyDown]);

    // Enable/Disable Native Privacy Screen (Screenshot prevention)
    useEffect(() => {
        const setPrivacyScreen = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    if (isOpen && (quiz?.settings?.preventScreenCapture ?? false) && !isTeacherView && !hasSubmitted.current) {
                        await PrivacyScreen.enable();
                        console.log("Privacy screen enabled.");
                    } else {
                        await PrivacyScreen.disable();
                        console.log("Privacy screen disabled.");
                    }
                } catch(e) { console.error("Error toggling privacy screen", e); }
            }
        };
        setPrivacyScreen();
        // Disable on unmount/close
        return () => {
            if (Capacitor.isNativePlatform()) {
                 PrivacyScreen.disable().catch(e => console.error("Error disabling privacy screen on unmount", e));
            }
        };
    }, [isOpen, quiz?.settings?.preventScreenCapture, isTeacherView, hasSubmitted]); // Re-evaluate if submitted

    // Add/Remove Copy/Paste/Cut Listeners & DevTools Check Interval
    useEffect(() => {
        if (isTeacherView || !isOpen || score !== null || isLocked || hasSubmitted.current) return; // Don't run if teacher, closed, scored, locked, or submitted

        // Handler for copy/paste/cut events
        const handleClipboardAction = (e) => {
            e.preventDefault(); // Prevent the default action
            if (e.type === 'paste' && (quiz?.settings?.warnOnPaste ?? false)) {
                showToast("Pasting is disabled during the quiz.", "warning");
                issueWarning('paste'); // Issue specific paste warning
            } else if (e.type === 'copy' || e.type === 'cut') {
                showToast("Copying/Cutting is disabled during the quiz.", "warning");
                // Optionally issue a 'general' warning for copy/cut if desired
                // if (quiz?.settings?.lockOnLeave ?? false) issueWarning('general');
            }
        };

        // Interval timer for DevTools check (web only)
        let intervalId = null;
        const isMobile = Capacitor.isNativePlatform() || /Mobi|Android/i.test(navigator.userAgent);
        if (!isMobile && (quiz?.settings?.detectDevTools ?? false)) {
            const devToolsCheck = () => {
                const widthThreshold = window.outerWidth - window.innerWidth > 160;
                const heightThreshold = window.outerHeight - window.innerHeight > 160;
                // Check if dev tools seem open and issue warning
                if ((widthThreshold || heightThreshold) && !isLocked && score === null && !hasSubmitted.current) {
                    issueWarning('devTools');
                }
            };
            intervalId = setInterval(devToolsCheck, 1500); // Check every 1.5 seconds
        }

        // Attach listeners to the modal panel
        const quizPanel = document.querySelector('.quiz-container'); // Use a specific selector if possible
        if (quizPanel) {
            quizPanel.addEventListener('copy', handleClipboardAction);
            quizPanel.addEventListener('paste', handleClipboardAction);
            quizPanel.addEventListener('cut', handleClipboardAction);
        }

        // Cleanup function
        return () => {
            if (intervalId) clearInterval(intervalId); // Clear interval
            if (quizPanel) { // Remove listeners
                quizPanel.removeEventListener('copy', handleClipboardAction);
                quizPanel.removeEventListener('paste', handleClipboardAction);
                quizPanel.removeEventListener('cut', handleClipboardAction);
            }
        };
    }, [isOpen, isTeacherView, score, isLocked, hasSubmitted, issueWarning, showToast, quiz?.settings?.detectDevTools, quiz?.settings?.warnOnPaste]);


    // Confirm answer for Matching Type questions
    const handleConfirmMatchingAnswer = () => {
        const question = shuffledQuestions[currentQ];
        // Ensure it's a matching type question and prompts/correctPairs exist
        if (!question || question.type !== 'matching-type' || !question.prompts || !question.correctPairs) return;

        const currentMatches = userAnswers[currentQ] || {};
        let correctPairsCount = 0;
        // Count correct matches
        question.prompts.forEach(prompt => {
            if (currentMatches[prompt.id] && currentMatches[prompt.id] === question.correctPairs[prompt.id]) {
                correctPairsCount++;
            }
        });
        // Set result state to show feedback
        setMatchingResult({ correct: correctPairsCount, total: question.prompts.length });
        setCurrentQuestionAttempted(true); // Mark as attempted to enable 'Next'
    };
	
// --- Render question number string (e.g., "Question 1", "Questions 5-7") ---
    const renderQuestionNumber = () => {
        const question = shuffledQuestions[currentQ];
        // Ensure numbering data is ready and index is valid
        if (!question || !questionNumbering.starts || questionNumbering.starts.length <= currentQ) {
             // Fallback if numbering isn't ready yet
             return `Question ${currentQ + 1}`;
        }

        const startNumber = questionNumbering.starts[currentQ];
        const pointsValue = Number(question.points) || 1; // Default to 1 point
        // Calculate end number, ensuring it's at least the start number
        const endNumber = startNumber + Math.max(0, pointsValue - 1);

        if (pointsValue <= 1) {
            return `Question ${startNumber}`;
        } else {
            return `Questions ${startNumber}-${endNumber}`;
        }
    };

    // --- Render the current question's UI ---
    const renderQuestion = () => {
        const question = shuffledQuestions[currentQ];
        if(!question) return <div className="text-center p-8"><Spinner /></div>; // Show spinner if question data not ready

        // Determine if input should be disabled
        const isAutoGraded = ['multiple-choice', 'true-false', 'identification', 'exactAnswer', 'matching-type'].includes(question.type);
        // Disable auto-graded if attempted (unless matching type before confirm)
        // Essay is only disabled in teacher view
        const isDisabled = isTeacherView || (isAutoGraded && currentQuestionAttempted && question.type !== 'matching-type');
        // Matching type allows changes until confirmed, then disabled
        const isMatchingDisabled = isTeacherView || (question.type === 'matching-type' && currentQuestionAttempted);

        // --- Essay UI ---
        if (question.type === 'essay') {
            return (
                <div>
                    {/* Prompt */}
                    <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                        <ContentRenderer text={question.text || question.question || "Essay Prompt Missing"} />
                        <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points)</span>
                    </div>
                    {/* Rubric */}
                    {(question.rubric && question.rubric.length > 0) && (
                        <div className="mb-4 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl">
                            <p className="text-sm font-bold text-slate-700 mb-2">Rubric</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                                {question.rubric.map(item => (
                                    <li key={item.id || item.criteria}> {/* Use id or criteria as key */}
                                        <span className="font-semibold">{item.criteria || "Unnamed Criterion"}</span>: {item.points || 0} pts
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* Text Area */}
                    <textarea
                        placeholder="Type your answer here..."
                        value={userAnswers[currentQ] || ''}
                        onChange={e => handleAnswer(e.target.value, 'essay')}
                        disabled={isTeacherView} // Only disabled for teacher preview
                        className="w-full h-48 p-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
                        aria-label={`Answer for essay question ${currentQ + 1}`}
                    />
                    {/* No explicit save button needed, typing enables 'Next' */}
                </div>
            );
        }

        // --- Matching Type UI ---
        if (question.type === 'matching-type') {
            const currentMatches = userAnswers[currentQ] || {};
            const matchedOptionIds = Object.values(currentMatches);
             // Ensure prompts/options are arrays, provide defaults
             const prompts = question.prompts || [];
             const options = question.options || [];
            // Check if all prompts have been assigned an option
            const allPromptsMatched = prompts.length > 0 && prompts.every(p => currentMatches[p.id]);

            // Draggable Option Component
            const DraggableOption = ({ id, text }) => {
                const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `option-${id}` }); // Prefix ID
                const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 } : undefined;
                return (
                    <div
                        ref={setNodeRef}
                        style={style}
                        {...listeners}
                        {...attributes}
                        className={`p-2 bg-neumorphic-base rounded-lg text-slate-700 text-sm transition-shadow ${isMatchingDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-grab active:cursor-grabbing shadow-neumorphic active:shadow-neumorphic-inset'} ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
                        aria-disabled={isMatchingDisabled}
                    >
                        {text || "Option Text Missing"}
                    </div>
                );
            };

            // Droppable Prompt Component
            const DroppablePrompt = ({ id, text, matchedOption, onDrop }) => {
                const { isOver, setNodeRef } = useDroppable({ id: `prompt-${id}` }); // Prefix ID
                return (
                    <div className="flex items-center gap-2">
                        {/* Prompt Text */}
                        <div className="flex-1 p-2 bg-neumorphic-base shadow-neumorphic-inset rounded-lg text-slate-800 font-medium text-sm min-h-[3rem] flex items-center">
                            {text || "Prompt Text Missing"}
                        </div>
                        {/* Drop Zone */}
                        <div
                            ref={setNodeRef}
                            onClick={() => !isMatchingDisabled && onDrop(id)} // Allow unmatching by clicking
                            className={`flex-1 h-12 p-1 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${isOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300'} ${isMatchingDisabled ? 'cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
                            aria-label={`Drop area for prompt: ${text}`}
                        >
                            {matchedOption ? (
                                <div className={`p-1 bg-slate-200 shadow-inner rounded-md w-full text-center text-slate-800 text-sm ${!isMatchingDisabled ? 'cursor-pointer' : ''}`}>
                                    {matchedOption.text || "Matched Option Missing"}
                                </div>
                                ) : (
                                <span className="text-xs text-slate-400">{isMatchingDisabled ? 'Unanswered' : 'Drop here'}</span>
                                )
                            }
                        </div>
                    </div>
                );
            };

            // Drag End Handler
            const handleDragEnd = (event) => {
                 if (isMatchingDisabled) return; // Don't allow changes if confirmed/teacher
                const { active, over } = event;
                // Ensure dropping onto a prompt area from an option
                if (over && active?.id.startsWith('option-') && over?.id.startsWith('prompt-')) {
                    const optionId = active.id.replace('option-', '');
                    const promptId = over.id.replace('prompt-', '');
                    const newMatches = { ...currentMatches };
                    // Remove if this option was previously matched elsewhere
                    const existingMatchKey = Object.keys(newMatches).find(key => newMatches[key] === optionId);
                    if (existingMatchKey) delete newMatches[existingMatchKey];
                    // Assign new match
                    newMatches[promptId] = optionId;
                    handleAnswer(newMatches, 'matching-type'); // Update state
                }
            };

            // Unmatch Handler (Clicking on the dropped item)
            const unmatchItem = (promptId) => {
                if (isMatchingDisabled) return; // Don't allow changes if confirmed/teacher
                const newMatches = { ...currentMatches };
                delete newMatches[promptId];
                handleAnswer(newMatches, 'matching-type'); // Update state
            };

            return (
                <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                    {/* Instruction */}
                    <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                        <ContentRenderer text={question.text || question.question || "Matching Instructions Missing"} />
                        <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points total)</span>
                    </div>
                    {/* Columns */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Prompts (Droppable) */}
                        <div className="w-full md:w-2/3 space-y-2">
                            {prompts.map((prompt, index) => {
                                const matchedOptionId = currentMatches[prompt.id];
                                const matchedOption = options.find(opt => opt.id === matchedOptionId);
                                return <DroppablePrompt key={prompt.id || index} id={prompt.id} text={prompt.text} matchedOption={matchedOption} onDrop={unmatchItem} />;
                            })}
                        </div>
                        {/* Options (Draggable) */}
                        <div className="w-full md:w-1/3 space-y-2 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl">
                            <p className="text-center text-xs text-slate-500 font-semibold mb-2">DRAGGABLE OPTIONS</p>
                            {options
                                .filter(opt => !matchedOptionIds.includes(opt.id)) // Show only unmatched options
                                .map((option, index) => <DraggableOption key={option.id || index} id={option.id} text={option.text} />)}
                        </div>
                    </div>
                    {/* Confirm Button */}
                    {!isMatchingDisabled && allPromptsMatched && ( // Show only if not confirmed and all are matched
                        <div className="mt-4 text-center">
                            <button
                                onClick={handleConfirmMatchingAnswer}
                                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all"
                            >
                                Confirm Answer
                            </button>
                        </div>
                    )}
                    {/* Feedback after Confirm */}
                    {matchingResult && (
                        <div className="mt-4 p-3 text-center font-semibold text-lg rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                            You correctly matched <span className="text-green-600">{matchingResult.correct}</span> out of <span className="text-slate-800">{matchingResult.total}</span> items.
                            {question.explanation && (
                                 <p className="text-xs italic mt-2 text-slate-600">Explanation: <ContentRenderer text={question.explanation}/></p>
                            )}
                        </div>
                    )}
                </DndContext>
            );
        }

        // --- True/False UI ---
        if (question.type === 'true-false') {
            const trueLabel = quiz.language === 'Filipino' ? 'Tama' : 'True';
            const falseLabel = quiz.language === 'Filipino' ? 'Mali' : 'False';
            const options = [{ label: trueLabel, value: true }, { label: falseLabel, value: false }];
            return (
                <div>
                    {/* Question Text */}
                    <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                        <ContentRenderer text={question.text || question.question || "True/False Statement Missing"} />
                        <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points)</span>
                    </div>
                    {/* Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        {options.map((option) => (
                            <button
                                key={option.label}
                                onClick={() => handleAnswer(option.value, 'true-false')}
                                disabled={isDisabled} // Disable after attempt
                                className={`w-full p-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-neumorphic-base ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'} ${userAnswers[currentQ] === option.value ? 'shadow-neumorphic-inset text-blue-700' : 'shadow-neumorphic text-slate-700'}`}
                                aria-pressed={userAnswers[currentQ] === option.value}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        // --- Multiple Choice & Identification UI (Fallback) ---
        return (
            <div>
                {/* Question Text */}
                <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                    <ContentRenderer text={question.text || question.question || "Question Text Missing"} />
                    <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points)</span>
                </div>

                {/* Options (MC) or Input (ID) */}
                {question.type === 'multiple-choice' ? (
                    <div className="space-y-2">
                        {(question.options || []).map((option, idx) => (
                            <label key={idx} className={`relative flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 bg-neumorphic-base ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'} ${userAnswers[currentQ] === idx ? 'shadow-neumorphic-inset' : 'shadow-neumorphic'}`}>
                                <input
                                    type="radio"
                                    name={`question-${currentQ}`}
                                    value={idx} // Ensure value is set for controlled component logic
                                    checked={userAnswers[currentQ] === idx}
                                    onChange={() => handleAnswer(idx, 'multiple-choice')}
                                    disabled={isDisabled} // Disable after attempt
                                    className="absolute opacity-0 w-0 h-0 peer" // Visually hide but keep accessible
                                    aria-label={`Option ${idx + 1}`}
                                />
                                {/* Custom radio appearance */}
                                <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-400 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-neumorphic-base flex items-center justify-center transition-colors ${userAnswers[currentQ] === idx ? 'bg-blue-600 border-blue-600' : 'bg-neumorphic-inset'}`} aria-hidden="true">
                                     {userAnswers[currentQ] === idx && <span className="w-2 h-2 rounded-full bg-white"></span>}
                                </span>
                                {/* Option Text */}
                                <span className="text-sm text-slate-700"><ContentRenderer text={option.text || option || `Option ${idx + 1} Missing`} /></span>
                            </label>
                        ))}
                    </div>
                ) : ( // Identification or ExactAnswer
                    <>
                        <input
                            type="text"
                            placeholder="Type your answer"
                            value={userAnswers[currentQ] || ''}
                            onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })}
                            disabled={isDisabled} // Disable after attempt
                            className="w-full p-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
                            aria-label={`Answer for identification question ${currentQ + 1}`}
                        />
                        {/* Submit button for ID (appears before feedback) */}
                        {!isDisabled && (
                            <button
                                onClick={() => handleAnswer(userAnswers[currentQ] || '', 'identification')}
                                className="mt-4 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all"
                            >
                                Submit Answer
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    };


    // Render feedback after answering an auto-graded question (or saving essay)
    const renderQuestionFeedback = () => {
        const question = shuffledQuestions[currentQ];
        if (!question) return null; // No question data yet

        // --- Essay Saved Confirmation ---
        if (question.type === 'essay') {
             // Only show feedback if the question was marked 'attempted' (meaning saved)
             if (!currentQuestionAttempted) return null;
            return (
                <div className="p-4 sm:p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic">
                     <div className="flex items-center gap-3 sm:gap-4 mb-4">
                        <div className="p-2 sm:p-3 rounded-full bg-neumorphic-base shadow-neumorphic">
                            <CheckCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-blue-800">Answer Saved</h3>
                    </div>
                    <div className="text-sm sm:text-base text-slate-700 space-y-2 bg-neumorphic-base p-3 sm:p-4 rounded-2xl shadow-neumorphic-inset">
                        <p>Your essay answer has been saved. It will be reviewed by your teacher after you submit the quiz.</p>
                    </div>
                     {/* Button to proceed */}
                    <div className="mt-6">
                         {currentQ < totalQuestions - 1 ? (
                             <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                 Next <ArrowRightIcon className="h-5 w-5"/>
                             </button>
                         ) : (
                             <button onClick={handleSubmit} className="w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                 Submit Quiz
                             </button>
                         )}
                     </div>
                </div>
            );
        }

        // --- Matching Type Confirmed Feedback ---
        if (question.type === 'matching-type' && matchingResult) {
            return (
                 <div className="mt-4 p-4 sm:p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic">
                     {/* Header */}
                     <div className="flex items-center gap-3 sm:gap-4 mb-4">
                        <div className={`p-2 sm:p-3 rounded-full bg-neumorphic-base shadow-neumorphic`}>
                             <CheckCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                        </div>
                        <h3 className={`text-xl sm:text-2xl font-extrabold text-blue-800`}>Answer Confirmed</h3>
                    </div>
                    {/* Results */}
                    <div className="text-sm sm:text-base text-slate-700 space-y-2 bg-neumorphic-base p-3 sm:p-4 rounded-2xl shadow-neumorphic-inset">
                        <p className="font-semibold text-center">
                            You correctly matched {matchingResult.correct} out of {matchingResult.total} items.
                        </p>
                        {/* Display explanation if provided */}
                        {question.explanation && (
                             <div className="mt-3 pt-3 border-t border-slate-300/80 text-xs italic">
                                <span className='font-semibold not-italic'>Explanation:</span> <ContentRenderer text={question.explanation}/>
                             </div>
                        )}
                    </div>
                    {/* Button to proceed */}
                    <div className="mt-6">
                         {currentQ < totalQuestions - 1 ? (
                             <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                 Next <ArrowRightIcon className="h-5 w-5"/>
                             </button>
                         ) : (
                             <button onClick={handleSubmit} className="w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                 Submit Quiz
                             </button>
                         )}
                     </div>
                 </div>
            );
        }

        // --- Feedback for MC, TF, ID ---
        // Only render if questionResult is set (meaning attempted)
        if (!questionResult) return null;

        const isCorrect = questionResult === 'correct';
        const booleanToString = (val) => quiz.language === 'Filipino' ? (val ? 'Tama' : 'Mali') : String(val);
        let userAnswerText = 'No Answer';
        let correctAnswerText = 'N/A';

        // Get answer text based on type
        if (question.type === 'multiple-choice') {
            const userOpt = question.options?.[userAnswers[currentQ]];
            userAnswerText = userOpt?.text || userOpt || 'No Answer'; // Handle both formats
            const correctOpt = question.options?.[question.correctAnswerIndex];
            correctAnswerText = correctOpt?.text || correctOpt || 'N/A'; // Handle both formats
        } else if (question.type === 'true-false') {
            userAnswerText = booleanToString(userAnswers[currentQ]);
            correctAnswerText = booleanToString(question.correctAnswer);
        } else if (question.type === 'identification' || question.type === 'exactAnswer') {
            userAnswerText = userAnswers[currentQ] || 'No Answer';
            correctAnswerText = question.correctAnswer || 'N/A';
        }

        // Render Correct/Incorrect feedback UI
        return (
            <div className={`p-4 sm:p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic`}>
                {/* Icon and Title */}
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <div className={`p-2 sm:p-3 rounded-full bg-neumorphic-base ${isCorrect ? 'shadow-neumorphic' : 'shadow-neumorphic-inset'}`}>
                        {isCorrect ? <CheckCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" /> : <XCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" />}
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-extrabold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? "Correct!" : "Incorrect"}</h3>
                </div>
                {/* Answers */}
                <div className="text-sm sm:text-base text-slate-700 space-y-2 bg-neumorphic-base p-3 sm:p-4 rounded-2xl shadow-neumorphic-inset">
                    <p><span className="font-semibold text-slate-800">Your Answer:</span> <ContentRenderer text={String(userAnswerText)} /></p>
                    {!isCorrect && (<p><span className="font-semibold text-slate-800">Correct Answer:</span> <ContentRenderer text={String(correctAnswerText)} /></p>)}
                </div>
                {/* Explanation */}
                {question.explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-300/80">
                        <div className="flex items-start gap-3">
                            <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-700 mb-1">Explanation</h4>
                                <div className="text-sm sm:text-base text-slate-700"><ContentRenderer text={question.explanation} /></div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Button to proceed */}
                 <div className="mt-6">
                     {currentQ < totalQuestions - 1 ? (
                         <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                             Next <ArrowRightIcon className="h-5 w-5"/>
                         </button>
                     ) : (
                         <button onClick={handleSubmit} className="w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                             Submit Quiz
                         </button>
                     )}
                 </div>
            </div>
        );
    };


// --- Render the results screen after submission ---
    const renderResults = () => {
        // Use data from the latest submission attempt for consistency
        const submissionStatus = latestSubmission?.status;
        // Use score from latest submission if available, otherwise the current state score
        const finalScore = latestSubmission?.score ?? score ?? 0;
        const totalPossiblePoints = latestSubmission?.totalItems ?? questionNumbering.totalItems;

        // --- MODIFICATION: Sort submissions by attempt number, ascending ---
        const sortedSubmissions = [...allSubmissions].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));
        
        // --- *** FIXED ***: Calculate attempts left based on attemptsTaken state ---
        const attemptsLeft = maxAttempts - attemptsTaken;
        // --- *** END FIXED *** ---

        return (
            <div className="text-center p-4 sm:p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
                {/* Icon based on status */}
                <div className="mx-auto inline-block p-3 sm:p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-4">
                    {submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review'
                       ? <ClockOutlineIcon className="h-14 w-14 sm:h-20 sm:w-20 text-blue-500" />
                       : <CheckCircleIcon className="h-14 w-14 sm:h-20 sm:w-20 text-green-500" />
                    }
                </div>
                {/* Title */}
                <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                    {submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review'
                        ? "Submission Received!"
                        : "Quiz Submitted!"
                    }
                </h3>
                {/* Score Display */}
                 <p className="text-base sm:text-xl mt-2 text-slate-700">
                    Your current score is <strong className="text-green-600 text-xl sm:text-3xl">{finalScore}</strong> out of <strong className="text-slate-900 text-xl sm:text-3xl">{totalPossiblePoints}</strong>
                 </p>
                {/* Status Messages for Pending/Review */}
                {submissionStatus === 'pending_ai_grading' && (
                     <div className="mt-4 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl text-blue-800">
                        <ClockOutlineIcon className="h-6 w-6 mx-auto mb-2" />
                        <p className="font-semibold">Essays are pending teacher review/grading.</p>
                        <p className="text-sm">Your final score will be updated once graded.</p>
                    </div>
                )}
                 {submissionStatus === 'pending_review' && (
                     <div className="mt-4 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl text-orange-800">
                        <PencilSquareIcon className="h-6 w-6 mx-auto mb-2" />
                        <p className="font-semibold">Some items require manual teacher review.</p>
                        <p className="text-sm">Your score may be adjusted later.</p>
                    </div>
                )}
				{/* Attempts Left */}
                {/* --- *** FIXED ***: Use the 'attemptsLeft' variable --- */}
				{attemptsLeft > 0 ? (
				    <>
				        <p className="text-sm sm:text-lg mt-4 text-slate-600">You have <strong>{attemptsLeft}</strong> attempt(s) left.</p>
				        <button
				            onClick={handleStartNewAttempt}
				            className="mt-6 w-full py-3 rounded-2xl bg-green-600 text-white font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:bg-green-700"
				        >
				            Start New Attempt
				        </button>
				    </>
				 ) : (
				    <p className="text-sm sm:text-lg mt-4 text-red-600 font-semibold">You have used all {maxAttempts} attempts.</p>
				)}
                {/* --- *** END FIXED *** --- */}
                
                {/* --- MODIFICATION: Show review buttons for all attempts --- */}
                {sortedSubmissions.length > 0 && (
                    <div className="mt-4 w-full space-y-2 pt-4 border-t border-slate-300/50">
                        <p className="text-sm font-semibold text-slate-700">Review Past Attempts:</p>
                        {sortedSubmissions.map((sub) => (
                            <button
                                key={sub.id || sub.attemptNumber} // Use a unique key
                                onClick={() => {
                                    setSubmissionToReview(sub);
                                    setShowReview(true);
                                }}
                                className="w-full py-2.5 rounded-xl bg-neumorphic-base text-blue-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all text-sm"
                            >
                                Review Attempt {sub.attemptNumber}
                                {/* Show score for that attempt */}
                                <span className="ml-2 text-xs text-slate-500">
                                    ({sub.score ?? 0} / {sub.totalItems ?? '?'})
                                    {sub.status === 'pending_ai_grading' && " (Pending)"}
                                    {sub.status === 'pending_review' && " (Review)"}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {/* --- END MODIFICATION --- */}
            </div>
        );
    };


// --- Render the detailed review screen ---
    const renderReview = () => {
        // --- MODIFICATION: Use submissionToReview state ---
        const answersToReview = submissionToReview?.answers || [];
        if (answersToReview.length === 0 || !submissionToReview) {
             return <div className="p-4 text-center text-slate-600">No submission data available to review.</div>;
        }
        // --- END MODIFICATION ---

        // Calculate numbering based on the *reviewed* answers' points
        const reviewNumbering = (() => {
            let currentItemNumber = 1; const starts = []; let totalPoints = 0;
            answersToReview.forEach(answer => {
                starts.push(currentItemNumber);
                const pointsValue = Number(answer.points) || 1;
                currentItemNumber += pointsValue;
                totalPoints += pointsValue;
            });
            return { starts, totalPoints };
        })();
        // Helper to display True/False in correct language
        const displayBoolean = (val) => {
            const strVal = String(val).toLowerCase();
            if (quiz.language === 'Filipino') return strVal === 'true' ? 'Tama' : (strVal === 'false' ? 'Mali' : strVal);
            return strVal === 'true' ? 'True' : (strVal === 'false' ? 'False' : strVal);
        };

        return (
            <div>
                {/* --- MODIFICATION: Use submissionToReview state --- */}
                <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-4">Review Answers (Attempt {submissionToReview.attemptNumber})</h3>
                {/* Overall Score */}
                <p className="text-center font-semibold mb-4">
                    Overall Score: {submissionToReview.score ?? 0} / {reviewNumbering.totalPoints}
                     {submissionToReview.status === 'pending_ai_grading' && <span className="text-blue-600"> (Essays Pending)</span>}
                     {submissionToReview.status === 'pending_review' && <span className="text-orange-600"> (Manual Review Needed)</span>}
                </p>
                {/* --- END MODIFICATION --- */}

                {/* Scrollable Answer List */}
                <div className="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 bg-neumorphic-base p-2 rounded-2xl shadow-neumorphic-inset">
                    {answersToReview.map((answer, index) => {
                        // Calculate numbering label
                        const startNum = reviewNumbering.starts[index];
                        const pointsValue = Number(answer.points) || 1;
                        const endNum = startNum + pointsValue - 1;
                        const numLabel = pointsValue <= 1 ? `Item ${startNum}` : `Items ${startNum}-${endNum}`;

                        // Determine status visuals (border and icon)
                        let borderColor = 'border-gray-400';
                        let statusIcon = <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
                        // Use the score saved in the answer object, default to 0 if not graded yet
                        const itemScore = answer.score ?? 0;

                        if (answer.status === 'pending_ai_grading') {
                            borderColor = 'border-blue-400';
                            statusIcon = <ClockOutlineIcon className="h-5 w-5 text-blue-500" />;
                        } else if (answer.status === 'grading_failed' || answer.status === 'pending_review') {
                            borderColor = 'border-orange-500';
                            statusIcon = <PencilSquareIcon className="h-5 w-5 text-orange-500" />; // Icon for manual review needed
                        } else if (answer.status === 'graded') {
                             if (itemScore === answer.points) { borderColor = 'border-green-500'; statusIcon = <CheckCircleIcon className="h-5 w-5 text-green-600" />; }
                             else if (itemScore > 0) { borderColor = 'border-yellow-500'; statusIcon = <CheckCircleIcon className="h-5 w-5 text-yellow-600" />; } // Partial credit
                             else { borderColor = 'border-red-500'; statusIcon = <XCircleIcon className="h-5 w-5 text-red-600" />; } // 0 score
                        }

                        return (
                            <div key={index} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-neumorphic-base shadow-neumorphic border-l-4 ${borderColor}`}>
                                {/* Header: Item Number, Points, Status */}
                                <p className="text-xs font-bold text-slate-500 mb-2">
                                    {numLabel} ({answer.status === 'graded' || answer.status === 'pending_review' ? `${itemScore} / ` : ''}{answer.points} pts)
                                    {answer.status === 'pending_ai_grading' && <span className="ml-2 text-blue-600">(Pending Review)</span>}
                                    {(answer.status === 'grading_failed' || answer.status === 'pending_review') && <span className="ml-2 text-orange-600">(Manual Review Needed)</span>}
                                </p>
                                {/* Question Text */}
                                <div className="font-bold text-base sm:text-lg text-slate-800 mb-3 flex items-start">
                                    <span className="mr-2 pt-1 flex-shrink-0">{statusIcon}</span>
                                    <ContentRenderer text={answer.questionText || "Question text missing"} />
                                </div>
                                {/* Answer Details */}
                                <div className="text-sm space-y-1 pl-7">
                                    {/* Essay Review */}
                                    {answer.questionType === 'essay' ? (
                                        <div className="space-y-3">
                                            {/* Student Answer */}
                                            <div className="p-2 bg-neumorphic-base shadow-neumorphic-inset rounded-lg text-slate-700 italic">
                                                <p className='font-semibold not-italic text-slate-800 mb-1'>Your Answer:</p>
                                                <ContentRenderer text={answer.selectedAnswer || "(No answer provided)"} />
                                            </div>
                                            {/* AI/Manual Grade Info */}
                                            {answer.status === 'graded' && answer.aiGradingResult ? ( /* Display AI feedback if available */
                                                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30 text-green-900">
                                                    <p className="font-bold text-base mb-2">AI Score: {itemScore} / {answer.points} points</p>
                                                    {(answer.aiGradingResult.scores || []).map((crit, idx) => (
                                                         <div key={idx} className="mb-1">
                                                            <p className="font-semibold">{crit.criteria}: {crit.pointsAwarded} pts</p>
                                                            <p className="text-xs italic pl-2">Justification: {crit.justification}</p>
                                                        </div>
                                                    ))}
                                                    <p className="font-semibold mt-3">Overall Feedback:</p>
                                                    <p className="text-xs italic">{answer.aiGradingResult.overallFeedback}</p>
                                                </div>
                                            ) : (answer.status === 'grading_failed' || answer.status === 'pending_review') ? ( /* AI Failed/Manual Needed */
                                                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 text-orange-900">
                                                    <p className="font-semibold">Requires manual teacher review.</p>
                                                    {answer.aiGradingResult?.error && <p className="text-xs italic mt-1">AI Error: {answer.aiGradingResult.error}</p>}
                                                </div>
                                             ) : answer.status === 'pending_ai_grading' ? ( /* Pending */
                                                 <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 text-blue-900">
                                                    <p className="font-semibold">Pending review...</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    /* Matching Type Review */
                                    ) : answer.questionType === 'matching-type' ? (
                                        <>
                                            <p className="font-semibold text-slate-700">Your Score: {itemScore} / {answer.points} points ({answer.correctCount} / {answer.prompts?.length || 0} correct matches)</p>
                                            {(answer.prompts || []).map(p => {
                                                const isPairCorrect = p.userAnswerId === p.correctAnswerId;
                                                return (
                                                    <div key={p.id} className="flex items-center text-slate-700 text-xs mt-1">
                                                        {isPairCorrect ? <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500 flex-shrink-0"/> : <XCircleIcon className="h-4 w-4 mr-1 text-red-500 flex-shrink-0"/>}
                                                        <span className="font-medium">{p.text}:</span>
                                                        <span className="mx-1">Matched "{p.userAnswerText}".</span>
                                                        {!isPairCorrect && <span className="font-semibold">(Correct: "{p.correctAnswerText}")</span>}
                                                    </div>
                                                );
d                                            })}
                                            {/* Optionally show explanation */}
                                            {answer.explanation && <p className="text-xs italic mt-2 text-slate-600">Explanation: <ContentRenderer text={answer.explanation}/></p>}
                                        </>
                                    /* MC, TF, ID Review */
                                    ) : (
                                        <>
                                            <p className="text-slate-700">Your answer: <span className="font-semibold">{displayBoolean(String(answer.selectedAnswer ?? ''))}</span></p>
                                            {/* Show correct answer only if graded and incorrect */}
                                            {(answer.status === 'graded' || answer.status === 'pending_review') && !answer.isCorrect &&
                                                <p className="text-slate-700">Correct answer: <span className="font-semibold">{displayBoolean(String(answer.correctAnswer ?? ''))}</span></p>
                                            }
                                            {/* Show explanation if available and graded */}
                                             {(answer.status === 'graded' || answer.status === 'pending_review') && answer.explanation &&
                                                 <p className="text-xs italic mt-2 text-slate-600">Explanation: <ContentRenderer text={answer.explanation}/></p>
                                             }
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* --- MODIFICATION: Update Back button onClick --- */}
                <button 
                    onClick={() => {
                        setShowReview(false);
                        setSubmissionToReview(null); // Reset the review state
                    }} 
                    className="mt-6 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all"
                >
                    Back to Score
                </button>
                {/* --- END MODIFICATION --- */}
            </div>
        );
    };


    // Render "Quiz Not Available" message
    const renderNotAvailable = () => (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5"> <ClockIcon className="h-20 w-20 text-slate-500" /> </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Quiz Not Available</h3>
            <p className="text-lg mt-2 text-slate-600">{availabilityMessage}</p>
        </div>
    );

    // Render "Quiz Locked" message
    const renderSystemLockedView = () => (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5"> <LockClosedIcon className="h-20 w-20 text-slate-700" /> </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Quiz Locked</h3>
            <p className="text-lg mt-2 text-slate-600">This quiz has been locked due to multiple warnings.</p> {/* Corrected typo */}
            <p className="text-md mt-1 text-slate-600">Please contact your teacher to have it unlocked.</p>
        </div>
    );

// Render "No Attempts Left" message
    const renderNoAttemptsLeftView = () => {
        // Ensure latestSubmission is used if available
        const lastSub = latestSubmission;
        const lastScore = lastSub?.score ?? 0;
        const lastTotal = lastSub?.totalItems ?? questionNumbering.totalItems;
        const lastStatus = lastSub?.status;

        // --- MODIFICATION: Sort submissions by attempt number, ascending ---
        const sortedSubmissions = [...allSubmissions].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

        return (
            <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
                <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5"> <LockClosedIcon className="h-20 w-20 text-red-500" /> </div>
                <h3 className="text-3xl font-extrabold text-slate-900 mb-2">No Attempts Remaining</h3>
                <p className="text-lg mt-2 text-slate-600">You have used all {maxAttempts} of your attempts for this quiz.</p>
                {/* Display score and status from the last attempt */}
                {lastSub && (
                    <p className="text-2xl font-bold mt-4">
                        Your final score was <strong className={lastStatus === 'pending_ai_grading' || lastStatus === 'pending_review' ? "text-blue-600" : "text-red-600"}>{lastScore}</strong> out of <strong className="text-slate-900">{lastTotal}</strong>
                        {/* Add status indicators */}
                        {lastStatus === 'pending_ai_grading' && <span className="block text-sm text-blue-600">(Essays Pending Review)</span>}
                        {lastStatus === 'pending_review' && <span className="block text-sm text-orange-600">(Manual Review Needed)</span>}
                    </p>
                )}
                
                {/* --- MODIFICATION: Show review buttons for all attempts --- */}
                {sortedSubmissions.length > 0 && (
                    <div className="mt-8 w-full space-y-2 pt-4 border-t border-slate-300/50">
                        <p className="text-sm font-semibold text-slate-700">Review Your Attempts:</p>
                        {sortedSubmissions.map((sub) => (
                            <button
                                key={sub.id || sub.attemptNumber} // Use a unique key
                                onClick={() => {
                                    setSubmissionToReview(sub);
                                    setShowReview(true);
                                }}
                                className="w-full py-2.5 rounded-xl bg-neumorphic-base text-blue-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all text-sm"
                            >
                                Review Attempt {sub.attemptNumber}
                                {/* Show score for that attempt */}
                                <span className="ml-2 text-xs text-slate-500">
                                    ({sub.score ?? 0} / {sub.totalItems ?? '?'})
                                    {sub.status === 'pending_ai_grading' && " (Pending)"}
                                    {sub.status === 'pending_review' && " (Review)"}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {/* --- END MODIFICATION --- */}
            </div>
        );
    };

    // Render the teacher's preview of a question
    const renderTeacherPreview = () => {
        const q = shuffledQuestions[currentQ];
         return (
            // Outer container with neumorphic style
            <>{q ? (<div className="p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                {/* Question Text & Number */}
                <div className="font-semibold flex items-start text-lg text-slate-800 mb-1">
                    <span className="text-slate-500 mr-2 flex-shrink-0">{renderQuestionNumber()}.</span>
                    <ContentRenderer text={q.text || q.question || "Question Text Missing"} />
                </div>
                 {/* Points */}
                 <p className="text-xs text-slate-500 mb-3 ml-6">({q.points || 0} points)</p>

                {/* Answer/Rubric Display Section */}
                <div className="mt-4 space-y-2 pl-6">
                    {/* MC Options */}
                    {q.type === 'multiple-choice' && (q.options || []).map((option, idx) => (
                        <div key={idx} className={`flex items-center p-3 rounded-lg text-sm ${idx === q.correctAnswerIndex ? 'bg-green-500/15 text-green-900 font-semibold' : 'bg-slate-200/60 text-slate-700'}`}>
                            {/* Checkmark for correct answer */}
                            {idx === q.correctAnswerIndex && <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />}
                            {/* Dot or space for incorrect */}
                            {idx !== q.correctAnswerIndex && <span className="h-5 w-5 mr-2 flex-shrink-0"></span>}
                            <ContentRenderer text={option.text || option || `Option ${idx+1} Missing`} />
                        </div>
                    ))}
                    {/* ID Answer */}
                    {q.type === 'identification' && (
                        <div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold">
                            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />Correct Answer: <ContentRenderer text={q.correctAnswer || 'N/A'} />
                        </div>
                    )}
                    {/* TF Answer */}
                    {q.type === 'true-false' && (
                        <div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold">
                            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />Correct Answer: {quiz.language === 'Filipino' ? (q.correctAnswer ? 'Tama' : 'Mali') : String(q.correctAnswer)}
                        </div>
                    )}
                    {/* Matching Pairs */}
                    {q.type === 'matching-type' && (q.prompts || []).map(prompt => {
                        const correctOption = (q.options || []).find(opt => q.correctPairs && opt.id === q.correctPairs[prompt.id]);
                        return (
                            <div key={prompt.id} className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900">
                                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                                <span className="font-semibold">{prompt.text || 'Prompt Missing'}</span> <span className="mx-2">→</span> <span>{correctOption?.text || 'Correct Option Missing'}</span>
                            </div>
                        );
                    })}
                     {/* Essay Rubric */}
                    {q.type === 'essay' && (
                        <div className="p-3 rounded-lg bg-blue-500/15 text-blue-900">
                            <p className="font-semibold text-sm mb-2">Essay Rubric</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {(q.rubric || []).map(item => (
                                    <li key={item.id || item.criteria}>{item.criteria || 'Criteria Missing'}: {item.points || 0} pts</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {/* Explanation (if present) */}
                {q.explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-300/80 pl-6">
                        <div className="flex items-start gap-2">
                            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-slate-700"><ContentRenderer text={q.explanation} /></div>
                        </div>
                    </div>
                )}
            </div>)
            // Fallback if no question data
            : (<p className="text-center text-slate-500 p-8">This quiz currently has no questions.</p>)}</>
        );
    };


    // Determines which main view to render based on state
    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full p-8"><Spinner /></div>;
        if (!isAvailable && !isTeacherView) return renderNotAvailable();
        if (isTeacherView) return renderTeacherPreview();
        if (isLocked) return renderSystemLockedView();

        // Use latestSubmission data if available to check attempts/score/status
        const currentSub = latestSubmission;
        // --- MODIFICATION: Rely on 'attemptsTaken' state directly ---
        const currentAttempts = attemptsTaken;
        // --- MODIFICATION: 'currentScoreState' MUST come from the 'score' state, not 'latestSubmission' ---
        const currentScoreState = score;
        // --- REMOVED: This status check was causing the bug on reload ---
        // const currentStatus = currentSub?.status;

        // 1. Check if attempts are exhausted (based on loaded submission or current state)
        if (currentAttempts >= maxAttempts) {
            return showReview ? renderReview() : renderNoAttemptsLeftView();
        }

        // 2. Check if quiz has been submitted (score state is set OR loaded submission has a final status)
        // --- MODIFICATION: Simplify this check to only use current session state ---
        if (hasSubmitted.current || currentScoreState !== null) {
             return showReview ? renderReview() : renderResults();
        }
        // --- END MODIFICATION ---

// 3. Show immediate feedback if available (for auto-graded items, confirmed matching)
        if (questionResult || matchingResult) {
             return renderQuestionFeedback();
        }

        // 4. Otherwise, show the current question for answering
        return renderQuestion();
    };

    // --- Watermark Component ---
    const Watermark = () => {
        // Don't show for teachers or if screen capture prevention is off
        if (isTeacherView || !userProfile || !(quiz?.settings?.preventScreenCapture ?? false)) return null;
        const fullName = `${userProfile.firstName} ${userProfile.lastName}`;
        // Create repeating text pattern
        const watermarkText = Array(30).fill(fullName).join(' \u00A0 \u00A0 '); // Use non-breaking spaces for gaps
        return (
            <div aria-hidden="true" className="absolute inset-0 z-10 overflow-hidden pointer-events-none select-none">
                {/* Multiple rotated divs for better coverage */}
                <div className="absolute -top-1/4 -left-1/4 w-[200%] h-[200%] text-black/5 dark:text-white/5 text-xl font-bold whitespace-nowrap transform -rotate-[30deg] opacity-50">
                    {watermarkText} {watermarkText}
                </div>
                 <div className="absolute -top-1/4 -left-1/4 w-[200%] h-[200%] text-black/5 dark:text-white/5 text-xl font-bold whitespace-nowrap transform rotate-[45deg] opacity-50">
                    {watermarkText} {watermarkText}
                </div>
            </div>
        );
    };

    // --- Timer Display Component ---
    const TimerDisplay = () => {
        const isExam = quiz?.settings?.maxAttempts === 1; // Only time exams
        const hasEndDate = quiz?.availableUntil;
        // Conditions to show the timer
        // Don't show if timer value is null, not an exam, no end date, teacher, scored, loading, locked, unavailable, or submitted
        if (timeRemaining === null || !isExam || !hasEndDate || isTeacherView || score !== null || loading || isLocked || !isAvailable || hasSubmitted.current) {
            return null;
        }
        // Format time
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const isLowTime = timeRemaining <= 60; // Highlight when <= 1 minute

        return (
            <div className={`flex items-center gap-2 ${isLowTime ? 'bg-red-100 text-red-800' : 'bg-neumorphic-base text-slate-800'} px-3 py-1.5 rounded-full ${isLowTime ? 'shadow-inner' : 'shadow-neumorphic-inset'} flex-shrink-0 self-start sm:self-center`} role="timer" aria-live="polite">
                <ClockIcon className={`w-5 h-5 ${isLowTime ? 'text-red-600' : 'text-slate-600'}`}/>
                <span className="text-sm sm:text-base font-semibold tabular-nums">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
            </div>
        );
    };

    // --- Main Dialog JSX Structure ---
    if (!isOpen) return null; // Don't render anything if not open

    return (
        <>
            <Dialog open={isOpen} onClose={handleClose} static={true} className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
                {/* Panel */}
                <DialogPanel className="quiz-container relative flex flex-col w-full max-w-lg md:max-w-3xl rounded-3xl bg-neumorphic-base shadow-neumorphic max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                    {/* Watermark goes behind content */}
                    <Watermark />
                    {/* Header */}
                    <div className="relative z-20 flex-shrink-0 p-4 pb-3 border-b border-slate-300/50">
                        {/* Close Button */}
                        <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base text-slate-500 shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-slate-700" aria-label="Close Quiz">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                        {/* Title and Status Icons */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            {/* Left Side: Title & Export */}
                            <div className="flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight pr-8 sm:pr-0">{quiz?.title || "Quiz"}</h2>
                                {/* PDF Export Button for Teacher */}
                                {isTeacherView && (
                                    <button onClick={handleExportPdf} className="flex items-center gap-1 mt-2 px-3 py-1 rounded-lg bg-neumorphic-base text-blue-600 text-xs font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-blue-800">
                                        <DocumentArrowDownIcon className="h-4 w-4"/> Export PDF
                                    </button>
                                )}
                            </div>
                            {/* Right Side: Timer & Warnings */}
                            <div className="flex flex-col-reverse sm:flex-row items-end sm:items-center gap-2 self-end sm:self-center mt-2 sm:mt-0">
                                <TimerDisplay />
                                {/* Warning Counter */}
                                {!isTeacherView && classId && !isLocked && score === null && !hasSubmitted.current && (quiz?.settings?.lockOnLeave ?? false) && isAvailable && (
                                    <div className="flex items-center gap-1 bg-neumorphic-base text-amber-800 px-3 py-1 rounded-full shadow-neumorphic-inset flex-shrink-0" title="Anti-cheat warnings">
                                        <ShieldExclamationIcon className="w-4 h-4 text-amber-600"/>
                                        <span className="text-xs font-semibold">{warnings} / {MAX_WARNINGS}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Teacher Preview Banner */}
                        {isTeacherView && (
                            <p className="text-center text-xs font-semibold text-blue-800 bg-blue-500/10 p-2 rounded-lg mt-3 shadow-neumorphic-inset">
                                Teacher Preview - Answers shown, anti-cheat disabled.
                            </p>
                        )}
                    </div>

						{/* Content Area (Scrollable) */}
						                    <div className="relative z-20 flex-grow overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar">
						                        {renderContent()}
						                    </div>

						                    {/* Footer (Navigation / Submit) */}
						                    <div className="relative z-20 flex-shrink-0 p-4 pt-3 border-t border-slate-300/50">
						                        {/* --- Footer Logic for Student Quiz Taking --- */}
						                        {/* --- MODIFICATION: Added check to hide footer if feedback is active --- */}
						                        {(!isTeacherView && isAvailable && !isLocked && score === null && !hasSubmitted.current && !questionResult && !matchingResult) && (
						                        // --- END MODIFICATION ---
						                            // Determine if the Next/Submit button should be shown
						                            // Show if an answer has been input/selected/confirmed/saved for the current question
						                            (currentQuestionAttempted || (shuffledQuestions[currentQ]?.type === 'essay' && userAnswers[currentQ]?.trim())) ? (
						                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
						                                    {/* Info: Question Number & Attempts */}
						                                    <div className="text-center sm:text-left flex-shrink-0">
						                                        <span className="text-sm font-medium text-slate-600">
						                                            {renderQuestionNumber()} ({shuffledQuestions[currentQ]?.points || 0} pts)
						                                            <span className="hidden sm:inline"> / {questionNumbering.totalItems} Total Points</span>
						                                        </span>
						                                        <span className="block text-xs text-slate-500 mt-0.5">Attempt {attemptsTaken + 1} of {maxAttempts}</span>
						                                    </div>
						                                    {/* Action Buttons: Back, Next, Submit */}
						                                    <div className="flex gap-2 w-full sm:w-auto">
						                                         {/* Back Button (if enabled and not first question) */}
						                                         {!(quiz?.settings?.preventBackNavigation) && currentQ > 0 && (
						                                            <button
						                                                onClick={() => {
						                                                    // Reset feedback states when going back
						                                                    setCurrentQuestionAttempted(false);
						                                                    setQuestionResult(null);
						                                                    setMatchingResult(null);
						                                                    setCurrentQ(prev => prev - 1);
						                                                }}
						                                                className="flex items-center justify-center gap-1 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neumorphic-base text-slate-600 font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all"
						                                                aria-label="Previous Question"
						                                            >
						                                                <ArrowLeftIcon className="h-5 w-5"/> Back
						                                            </button>
						                                         )}
						                                        {/* Next / Submit Button */}
						                                        {currentQ < totalQuestions - 1 ? (
						                                            <button
						                                                onClick={handleNextQuestion}
						                                                // Disable Next for essay only if textarea is empty
						                                                disabled={shuffledQuestions[currentQ]?.type === 'essay' && !userAnswers[currentQ]?.trim()}
						                                                className="flex items-center justify-center gap-1 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all disabled:opacity-50 disabled:text-slate-400 disabled:shadow-neumorphic-inset"
						                                                aria-label="Next Question"
						                                            >
						                                                Next <ArrowRightIcon className="h-5 w-5"/>
						                                            </button>
						                                        ) : (
						                                            <button
						                                                onClick={handleSubmit}
						                                                // Disable Submit for essay only if textarea is empty
						                                                disabled={shuffledQuestions[currentQ]?.type === 'essay' && !userAnswers[currentQ]?.trim()}
						                                                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all disabled:opacity-50 disabled:text-slate-400 disabled:shadow-neumorphic-inset"
						                                                aria-label="Submit Quiz"
						                                            >
						                                                Submit Quiz
						                                            </button>
						                                        )}
						                                    </div>
						                                </div>
						                            ) : null // Don't show footer if question hasn't been attempted/confirmed/saved yet
						                        )}

						                        {/* Teacher Preview Footer */}
						                        {isTeacherView && totalQuestions > 0 && (
						                            <div className="flex justify-between items-center">
						                                <button onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-neumorphic-base text-slate-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset disabled:opacity-50 transition-all" aria-label="Previous Question">
						                                    <ArrowLeftIcon className="h-5 w-5"/>Previous
						                                </button>
						                                <span className="text-xs text-center font-medium text-slate-600">
						                                    {renderQuestionNumber()} ({shuffledQuestions[currentQ]?.points || 0} pts)
						                                    <br/>(Item {currentQ + 1} of {totalQuestions})
						                                </span>
						                                <button onClick={() => setCurrentQ(prev => Math.min(totalQuestions - 1, prev + 1))} disabled={currentQ === totalQuestions - 1} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-neumorphic-base text-slate-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset disabled:opacity-50 transition-all" aria-label="Next Question">
						                                    Next<ArrowRightIcon className="h-5 w-5"/>
						                                </button>
						                            </div>
						                        )}
						                    </div>
						                </DialogPanel>
						            </Dialog>
            {/* Warning Modal */}
            <QuizWarningModal isOpen={showWarningModal} warnings={warnings} maxWarnings={MAX_WARNINGS} onStay={handleStayInQuiz} onLeave={handleLeaveQuiz} isLocked={isLocked}/>
        </>
    );
}