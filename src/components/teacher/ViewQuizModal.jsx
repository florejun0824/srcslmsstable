import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, LockClosedIcon, InformationCircleIcon, ShieldExclamationIcon, XCircleIcon, XMarkIcon, DocumentArrowDownIcon, ClockIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import ContentRenderer from './ContentRenderer';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import QuizWarningModal from '../../components/common/QuizWarningModal';
import localforage from 'localforage';
import { queueQuizSubmission, syncOfflineSubmissions } from '../../services/offlineSyncService';
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import AntiCheatPlugin from '../../plugins/AntiCheatPlugin';

// --- MODIFICATION: Added Filesystem and FileOpener imports ---
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
// ---------------------------------------------

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
    const [score, setScore] = useState(null);
    const [latestSubmission, setLatestSubmission] = useState(null);
    const [attemptsTaken, setAttemptsTaken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);
    const [warnings, setWarnings] = useState(0);
    const [devToolWarnings, setDevToolWarnings] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const hasSubmitted = useRef(false);
    const justSubmitted = useRef(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const MAX_WARNINGS = 3; // For anti-cheat feature
    const [questionResult, setQuestionResult] = useState(null);
    const [currentQuestionAttempted, setCurrentQuestionAttempted] = useState(false);
    const [matchingResult, setMatchingResult] = useState(null);
    const [questionNumbering, setQuestionNumbering] = useState({ starts: [], totalItems: 0 });
    const [isAvailable, setIsAvailable] = useState(false);
    const [availabilityMessage, setAvailabilityMessage] = useState('');
    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}`;
    const devToolWarningKey = `devToolWarnings_${quiz?.id}_${userProfile?.id}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}`;
    const { showToast } = useToast();

    // --- MODIFICATION: ADDED INFRACTION STATE ---
    const [isInfractionActive, setIsInfractionActive] = useState(false);
    // ------------------------------------------

    // MODIFICATION: Dynamically get maxAttempts from quiz settings, with a fallback to 3
    const maxAttempts = quiz?.settings?.maxAttempts ?? 3;

    useEffect(() => {
        if (shuffledQuestions.length > 0) {
            let currentItemNumber = 1;
            const starts = [];
            shuffledQuestions.forEach(q => {
                starts.push(currentItemNumber);
                const itemCount = q.type === 'matching-type' ? (q.prompts?.length || 1) : 1;
                currentItemNumber += itemCount;
            });
            const totalItems = currentItemNumber - 1;
            setQuestionNumbering({ starts, totalItems });
        }
    }, [shuffledQuestions]);

    const issueWarning = useCallback(async (type = 'general') => {
        if (isTeacherView || isLocked || score !== null || showReview) return;

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
                }
                showToast(`Developer tools warning ${newDevToolWarningCount} of ${MAX_WARNINGS}.`, "warning");
            } else {
                if (!(quiz?.settings?.lockOnLeave ?? false)) return;
                const newWarningCount = warnings + 1;
                setWarnings(newWarningCount);
                localStorage.setItem(warningKey, newWarningCount.toString());

                if (newWarningCount >= MAX_WARNINGS) {
                    setIsLocked(true);
                    setShowWarningModal(true);
                    if (navigator.onLine) {
                        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                        await setDoc(lockRef, { quizId: quiz.id, studentId: userProfile.id, studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId, lockedAt: serverTimestamp(), reason: 'Too many unauthorized attempts to navigate away' });
                    }
                } else {
                    setShowWarningModal(true);
                }
            }
        } catch (error) {
            console.error("Failed to issue warning:", error);
            showToast("Could not process warning. Please proceed.", "error");
        }
    }, [warnings, devToolWarnings, warningKey, devToolWarningKey, quiz, userProfile, classId, isLocked, score, showReview, isTeacherView, showToast]);

	const handleSubmit = useCallback(async () => {
	    if (hasSubmitted.current || score !== null || isLocked) return;
	    hasSubmitted.current = true;
	    justSubmitted.current = true;

	    let correctCount = 0;
	    const detailedAnswers = [];

	    shuffledQuestions.forEach((q, index) => {
	        const userAnswer = userAnswers[index];

	        if (q.type === "multiple-choice") {
	            const correctAnswer = q.options?.[q.correctAnswerIndex]?.text ?? null;
	            const selectedAnswer = q.options?.[userAnswer]?.text ?? null;
	            const isCorrect = selectedAnswer === correctAnswer;
	            if (isCorrect) correctCount++;

	            detailedAnswers.push({
	                questionType: q.type,
	                questionText: q.text || q.question,
	                selectedAnswer,
	                correctAnswer,
	                isCorrect,
	                difficulty: q.difficulty ?? null,
	                explanation: q.explanation ?? null
	            });

	        } else if (q.type === "identification" || q.type === "exactAnswer") {
	            const formattedUserAnswer = String(userAnswer || "")
	                .toLowerCase()
	                .trim()
	                .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            const formattedCorrectAnswer = String(q.correctAnswer || "")
	                .toLowerCase()
	                .trim()
	                .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            const isCorrect = formattedUserAnswer === formattedCorrectAnswer;
	            if (isCorrect) correctCount++;

	            detailedAnswers.push({
	                questionType: q.type,
	                questionText: q.text || q.question,
	                selectedAnswer: userAnswer || null,
	                correctAnswer: q.correctAnswer ?? null,
	                isCorrect,
	                difficulty: q.difficulty ?? null,
	                explanation: q.explanation ?? null
	            });

	        } else if (q.type === "true-false") {
	            const isCorrect = userAnswer === q.correctAnswer;
	            if (isCorrect) correctCount++;

	            detailedAnswers.push({
	                questionType: q.type,
	                questionText: q.text || q.question,
	                selectedAnswer: userAnswer === undefined ? null : String(userAnswer),
	                correctAnswer: q.correctAnswer !== undefined ? String(q.correctAnswer) : null,
	                isCorrect,
	                difficulty: q.difficulty ?? null,
	                explanation: q.explanation ?? null
	            });

	        } else if (q.type === "matching-type") {
	            const userPairs = userAnswer || {};
	            const reviewPrompts = [];
	            let correctPairsCount = 0;

	            q.prompts.forEach(prompt => {
	                const isPairCorrect =
	                    userPairs[prompt.id] && userPairs[prompt.id] === q.correctPairs[prompt.id];
	                if (isPairCorrect) {
	                    correctCount++;
	                    correctPairsCount++;
	                }
	                reviewPrompts.push({
	                    ...prompt,
	                    userAnswerId: userPairs[prompt.id] || null,
	                    userAnswerText:
	                        q.options.find(opt => opt.id === userPairs[prompt.id])?.text || "Not Answered",
	                    correctAnswerId: q.correctPairs[prompt.id],
	                    correctAnswerText:
	                        q.options.find(opt => opt.id === q.correctPairs[prompt.id])?.text || null
	                });
	            });

	            detailedAnswers.push({
	                questionType: q.type,
	                questionText: q.text || q.question,
	                prompts: reviewPrompts,
	                correctAnswer: q.correctPairs ?? null,
	                studentAnswer: userPairs,
	                isCorrect: correctPairsCount === q.prompts.length,
	                difficulty: q.difficulty ?? null,
	                explanation: q.explanation ?? null
	            });
	        }
	    });

	    setScore(correctCount);
	    localStorage.removeItem(warningKey);
        localStorage.removeItem(devToolWarningKey);
	    localStorage.removeItem(shuffleKey);
	    setWarnings(0);
        setDevToolWarnings(0);
        // --- MODIFICATION: RESET INFRACTION STATE ---
        setIsInfractionActive(false);
        // ------------------------------------------

	    try {
	        const submissionData = {
	            quizId: quiz.id,
	            quizTitle: quiz.title,
	            classId: classId,
	            studentId: userProfile.id,
	            studentName: `${userProfile.firstName} ${userProfile.lastName}`,
	            answers: detailedAnswers,
	            score: correctCount,
	            totalItems: questionNumbering.totalItems,
	            attemptNumber: attemptsTaken + 1,
	            submittedAt: serverTimestamp(),
	            quarter: quiz.quarter || null
	        };

	        await queueQuizSubmission(submissionData);
	        if (navigator.onLine) {
	            syncOfflineSubmissions();
	        }
	        setLatestSubmission({ ...submissionData });
	        setAttemptsTaken(prev => prev + 1);
	        showToast(
	            navigator.onLine
	                ? "Quiz submitted successfully!"
	                : "📡 Quiz saved. It will sync when you’re back online.",
	            "success"
	        );
	        if (onComplete) {
	            onComplete();
	        }
	    } catch (error) {
	        console.error("Error queuing submission:", error);
	        showToast("❌ Could not save your quiz. Please try again.", "error");
	    }
	}, [
	    userAnswers,
	    score,
	    shuffledQuestions,
	    quiz,
	    userProfile,
	    classId,
	    attemptsTaken,
	    warningKey,
        devToolWarningKey,
	    shuffleKey,
	    isLocked,
	    showToast,
	    onComplete,
	    questionNumbering.totalItems
	]);
    
    const fetchSubmission = useCallback(async () => {
        if (!quiz?.id || !userProfile?.id || !classId) { setLoading(false); return; }
        setLoading(true);
        try {
            let isDbLocked = false; let dbSubmissions = []; let localWarningCount = 0;
            const savedWarnings = localStorage.getItem(warningKey);
            const savedDevToolWarnings = localStorage.getItem(devToolWarningKey);
            if (savedWarnings) { localWarningCount = parseInt(savedWarnings, 10); }
            if (navigator.onLine) {
                const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                const lockSnap = await getDoc(lockRef);
                isDbLocked = lockSnap.exists();
                if (!isDbLocked && (localWarningCount >= MAX_WARNINGS || (savedDevToolWarnings && parseInt(savedDevToolWarnings, 10) >= MAX_WARNINGS))) {
                    localStorage.removeItem(warningKey);
                    localStorage.removeItem(devToolWarningKey);
                    setWarnings(0);
                    setDevToolWarnings(0);
                    localWarningCount = 0;
                    showToast("Your teacher has unlocked this quiz for you.", "info");
                }
                const submissionsRef = collection(db, 'quizSubmissions');
                const q = query(submissionsRef, where("quizId", "==", quiz.id), where("studentId", "==", userProfile.id), where("classId", "==", classId));
                const querySnapshot = await getDocs(q);
                dbSubmissions = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                dbSubmissions.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
            }
            const isLocallyLocked = localWarningCount >= MAX_WARNINGS;
            setIsLocked(isDbLocked || isLocallyLocked);
            const offlineSubmissions = await localforage.getItem("quiz-submission-outbox") || [];
            const myOfflineAttempts = offlineSubmissions.filter(sub => sub.quizId === quiz.id && sub.studentId === userProfile.id && sub.classId === classId);
            const dbSubmissionIds = new Set(dbSubmissions.map(s => s.id));
            const uniqueOfflineAttempts = myOfflineAttempts.filter(s => !dbSubmissionIds.has(s.id));
            const totalAttempts = dbSubmissions.length + uniqueOfflineAttempts.length;
            setAttemptsTaken(totalAttempts); setLatestSubmission(dbSubmissions[0] || null);
        } catch (error) { console.error("Error fetching submission data:", error); showToast("❌ Could not load quiz data. Working with local data.", "error"); const savedWarnings = localStorage.getItem(warningKey); setIsLocked(savedWarnings ? parseInt(savedWarnings, 10) >= MAX_WARNINGS : false);
        } finally { setLoading(false); }
    }, [quiz, userProfile, classId, warningKey, showToast]);

    // --- MODIFICATION: UPDATED APP STATE LISTENER ---
    useEffect(() => {
        let listener;
        if (isOpen && Capacitor.isNativePlatform() && !isTeacherView && (quiz?.settings?.lockOnLeave ?? false)) {
            listener = App.addListener('appStateChange', ({ isActive }) => { 
                setIsInfractionActive(!isActive); // Set infraction state
                if (!isActive) { 
                    issueWarning(); // Issue one immediate warning
                }
            });
        }
        return () => { listener?.remove(); };
    }, [isOpen, issueWarning, isTeacherView, quiz?.settings?.lockOnLeave]);
    // --- END OF MODIFICATION ---
	
	// --- DETECT CHAT HEADS, OVERLAYS, OR SWITCHING APPS (UNIFIED ANTI-CHEAT) ---
	useEffect(() => {
	  if (!Capacitor.isNativePlatform() || isTeacherView) return;

	  // ✅ 1. AntiCheatPlugin native signals
	  const leaveListener = AntiCheatPlugin.addListener("userLeftHint", () => {
	    console.log("🛑 Chat head or overlay detected (plugin)");
	    if (isOpen && (quiz?.settings?.lockOnLeave ?? false) && !isLocked && score === null) {
	      issueWarning();
	    }
	  });

	  const pauseListener = AntiCheatPlugin.addListener("appPaused", () => {
	    console.log("🟠 App paused (plugin)");
	    if (isOpen && (quiz?.settings?.lockOnLeave ?? false)) {
	      issueWarning();
	    }
	  });

	  const resumeListener = AntiCheatPlugin.addListener("appResumed", () => {
	    console.log("🟢 App resumed (plugin)");
	  });

	  // ✅ 2. AppStateChange (most reliable — catches overlays, backgrounding, PiP)
	  const appListener = App.addListener("appStateChange", ({ isActive }) => {
	    if (!isActive) {
	      console.log("🚨 App moved to background / overlay detected (App listener)");
	      if (isOpen && (quiz?.settings?.lockOnLeave ?? false) && !isLocked && score === null) {
	        issueWarning();
	      }
	    }
	  });

	  // ✅ 3. Native bridge fallback (for MainActivity triggerWindowJSEvent)
	  const handleNativeFocusChange = (event) => {
	    const data = event.detail || event.data || "";
	    if (typeof data === "string" && data.includes('"hasFocus": false')) {
	      console.log("⚠️ Overlay or chat head detected (native bridge)");
	      if (isOpen && (quiz?.settings?.lockOnLeave ?? false) && !isLocked && score === null) {
	        issueWarning();
	      }
	    }
	  };

	  window.addEventListener("windowFocusChanged", handleNativeFocusChange);
	  window.addEventListener("userLeftHint", handleNativeFocusChange);

	  return () => {
	    leaveListener.remove();
	    pauseListener.remove();
	    resumeListener.remove();
	    appListener.remove();
	    window.removeEventListener("windowFocusChanged", handleNativeFocusChange);
	    window.removeEventListener("userLeftHint", handleNativeFocusChange);
	  };
	}, [isOpen, quiz?.settings?.lockOnLeave, isLocked, score, issueWarning, isTeacherView]);
	// --- END OF UNIFIED ANTI-CHEAT ---
	
	// --- STRICT OVERLAY DETECTION (INSTANT REACTION) ---
	useEffect(() => {
	  if (!Capacitor.isNativePlatform() || isTeacherView) return;

	  const handleOverlayDetected = (event) => {
	    console.log("🚨 Overlay (chat head / bubble) detected instantly!");
	    if (
	      isOpen &&
	      (quiz?.settings?.lockOnLeave ?? false) &&
	      !isLocked &&
	      score === null
	    ) {
	      issueWarning();
	    }
	  };

	  window.addEventListener("overlayDetected", handleOverlayDetected);

	  return () => {
	    window.removeEventListener("overlayDetected", handleOverlayDetected);
	  };
	}, [isOpen, quiz?.settings?.lockOnLeave, isLocked, score, issueWarning, isTeacherView]);
	// --- END OF STRICT OVERLAY DETECTION ---
	
	

    // --- MODIFICATION: UPDATED NATIVE FOCUS LISTENER ---
	// ✅ Listen to native overlay events from MainActivity.java
	useEffect(() => {
	  const handleNativeFocusChange = (event) => {
	    const dataString = event.detail || event.data;
	    if (typeof dataString !== 'string') return;

	    const canIssueWarning =
	      isOpen &&
	      !hasSubmitted.current &&
	      !isLocked &&
	      classId &&
	      score === null &&
	      !isTeacherView &&
	      (quiz?.settings?.lockOnLeave ?? false);

	    if (dataString.includes('"hasFocus": false') || dataString.includes('"reason": "userLeftHint"')) {
	      console.log("⚠️ Focus lost or user left hint detected from native side");
	      if (canIssueWarning) {
	        setIsInfractionActive(true);
	        issueWarning();
	      }
	    } else if (dataString.includes('"hasFocus": true')) {
	      setIsInfractionActive(false);
	    }
	  };

	  // Listen to BOTH native JS events
	  if (Capacitor.isNativePlatform() && (quiz?.settings?.lockOnLeave ?? false)) {
	    window.addEventListener("windowFocusChanged", handleNativeFocusChange);
	    window.addEventListener("userLeftHint", handleNativeFocusChange); // ✅ NEW
	  }

	  return () => {
	    if (Capacitor.isNativePlatform()) {
	      window.removeEventListener("windowFocusChanged", handleNativeFocusChange);
	      window.removeEventListener("userLeftHint", handleNativeFocusChange);
	    }
	  };
	}, [isOpen, hasSubmitted, isLocked, classId, score, isTeacherView, quiz?.settings?.lockOnLeave, issueWarning]);

    // --- END OF MODIFICATION ---

    // --- MODIFICATION: UPDATED WEB BLUR/FOCUS LISTENERS ---
    useEffect(() => {
        const canIssueWarning = () => {
            return isOpen &&
                !hasSubmitted.current &&
                !isLocked &&
                classId &&
                score === null &&
                !showReview &&
                !isTeacherView &&
                (quiz?.settings?.lockOnLeave ?? false);
        };
        
        const handleFocusLoss = () => { 
            if (canIssueWarning()) {
                setIsInfractionActive(true);
                issueWarning(); 
            }
        };

        const handleFocusGain = () => {
            setIsInfractionActive(false);
        };

        window.addEventListener('blur', handleFocusLoss);
        window.addEventListener('focus', handleFocusGain); // Add this
        
        return () => {
            window.removeEventListener('blur', handleFocusLoss);
            window.removeEventListener('focus', handleFocusGain); // Add this
        };
    }, [isOpen, isLocked, score, classId, issueWarning, showReview, isTeacherView, quiz?.settings?.lockOnLeave, hasSubmitted]);
    // --- END OF MODIFICATION ---

    // --- MODIFICATION: ADDED CONTINUOUS WARNING TIMER ---
    useEffect(() => {
        let warningInterval = null;

        // Conditions under which warnings are active
        const canIssueWarning = isOpen &&
            !isTeacherView &&
            !isLocked &&
            score === null &&
            !hasSubmitted.current &&
            (quiz?.settings?.lockOnLeave ?? false);

        // If an infraction is currently active AND warnings are possible
        if (isInfractionActive && canIssueWarning) {
            // Start a timer to repeatedly issue warnings
            warningInterval = setInterval(() => {
                // issueWarning() already checks for lock/score status,
                // so it's safe to call repeatedly.
                console.log("Continuous warning timer fired...");
                issueWarning();
            }, 5000); // Every 5 seconds
        }

        // Cleanup function: This runs when dependencies change OR component unmounts
        return () => {
            if (warningInterval) {
                clearInterval(warningInterval);
            }
        };

    }, [
        isInfractionActive, // The main trigger
        isOpen,             // All other conditions
        isTeacherView,
        isLocked,
        score,
        hasSubmitted,
        quiz?.settings?.lockOnLeave,
        issueWarning        // The function itself (which is a useCallback)
    ]);
    // --- END OF MODIFICATION ---

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView && (quiz?.settings?.lockOnLeave ?? false)) {
                event.preventDefault(); event.returnValue = 'You are attempting to leave the quiz. This will result in a warning.'; issueWarning(); return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, classId, isLocked, score, issueWarning, isTeacherView, quiz?.settings?.lockOnLeave]);

    useEffect(() => {
        if (isOpen) {
            if (justSubmitted.current) { justSubmitted.current = false; return; }
            setCurrentQ(0); setUserAnswers({}); setScore(null); setShowReview(false); hasSubmitted.current = false; setQuestionResult(null); setCurrentQuestionAttempted(false); setMatchingResult(null);
            
            // --- MODIFICATION: RESET INFRACTION STATE ---
            setIsInfractionActive(false);
            // ------------------------------------------

            setLoading(true);

            if (isTeacherView) {
                setIsAvailable(true);
            } else {
                const now = new Date();
                const from = quiz?.availableFrom?.toDate();
                const until = quiz?.availableUntil?.toDate();

                if (from && from > now) {
                    setIsAvailable(false);
                    setAvailabilityMessage(`This quiz will be available on ${from.toLocaleString()}.`);
                    setLoading(false);
                    return;
                }
                if (until && until <= now) {
                    setIsAvailable(false);
                    setAvailabilityMessage('This quiz has expired and is no longer available.');
                    setLoading(false);
                    return;
                }
                setIsAvailable(true);
            }

            if (!isTeacherView) {
                const savedWarnings = localStorage.getItem(warningKey);
                const initialWarnings = savedWarnings ? parseInt(savedWarnings, 10) : 0;
                setWarnings(initialWarnings);

                const savedDevToolWarnings = localStorage.getItem(devToolWarningKey);
                const initialDevToolWarnings = savedDevToolWarnings ? parseInt(savedDevToolWarnings, 10) : 0;
                setDevToolWarnings(initialDevToolWarnings);

                fetchSubmission();

                const shouldShuffle = quiz?.settings?.shuffleQuestions ?? false;
                try {
                    if (shouldShuffle) {
                        const savedShuffle = localStorage.getItem(shuffleKey);
                        if (savedShuffle && JSON.parse(savedShuffle).length === (quiz.questions || []).length) {
                            setShuffledQuestions(JSON.parse(savedShuffle));
                        } else { 
                            const newShuffled = shuffleArray(quiz.questions || []); 
                            setShuffledQuestions(newShuffled); 
                            localStorage.setItem(shuffleKey, JSON.stringify(newShuffled)); 
                        }
                    } else {
                        setShuffledQuestions(quiz.questions || []);
                        localStorage.removeItem(shuffleKey);
                    }
                } catch (e) { 
                    console.error("Error handling shuffled questions from localStorage", e);
                    const newShuffled = shuffleArray(quiz.questions || []);
                    setShuffledQuestions(newShuffled);
                }
            } else { 
                setWarnings(0); 
                setIsLocked(false); 
                setShuffledQuestions(quiz.questions || []); 
                setLoading(false); 
            }
        } else { 
            setShowWarningModal(false);
            // --- MODIFICATION: RESET INFRACTION STATE ---
            setIsInfractionActive(false);
            // ------------------------------------------ 
        }
    }, [isOpen, quiz, isTeacherView, warningKey, devToolWarningKey, shuffleKey, fetchSubmission]);
    
// --- MODIFICATION: Updated this function to add explanations and FileOpener ---
	const handleExportPdf = async () => {
	        if (!quiz?.questions) {
	            showToast("No quiz data to export.", "warning");
	            return;
	        }

	        try {
	            // 1. Generate the PDF document in memory
	            const doc = new jsPDF();
	            const quizBody = [];
	            const answerKey = [];

	            quiz.questions.forEach((q, i) => {
	                let questionContent = q.question || q.text;
	                let correctAnswerText = '';
	                if (q.type === 'multiple-choice' && q.options) {
	                    const optionsText = q.options.map((opt, idx) => `  ${String.fromCharCode(97 + idx)}. ${opt.text || opt}`).join('\n');
	                    questionContent += `\n${optionsText}`;
	                    const correctOption = q.options.find(opt => opt.isCorrect);
	                    if (correctOption) { correctAnswerText = correctOption.text || correctOption; } 
	                    else if (q.correctAnswerIndex !== undefined) { const correctOpt = q.options[q.correctAnswerIndex]; correctAnswerText = correctOpt?.text || correctOpt || 'N/A'; } 
	                    else { correctAnswerText = 'N/A'; }
	                } else { correctAnswerText = String(q.correctAnswer); }

	                if (q.explanation) {
	                    questionContent += `\n\nExplanation: ${q.explanation}`;
	                }

	                quizBody.push([i + 1, questionContent]);
	                answerKey.push([i + 1, correctAnswerText]);
	            });

	            doc.setFontSize(18);
	            doc.text(quiz.title, 14, 22);
	            autoTable(doc, { head: [['#', 'Question']], body: quizBody, startY: 30, theme: 'grid', headStyles: { fillColor: [41, 128, 185], textColor: 255 }, });
	            doc.addPage();
	            doc.setFontSize(18);
	            doc.text('Answer Key', 14, 22);
	            autoTable(doc, { head: [['#', 'Correct Answer']], body: answerKey, startY: 30, theme: 'striped', headStyles: { fillColor: [22, 160, 133], textColor: 255 }, });
            
				const quizTitleToExport = quiz.title || 'quiz';
							const sanitizedFileName = quizTitleToExport.replace(/[\\/:"*?<>|]+/g, '_') + '.pdf';

				            if (Capacitor.isNativePlatform()) {
				                // --- NATIVE MOBILE (ANDROID/IOS) ---
                
				                // --- START PERMISSION CHECK ---
				                let permStatus = await Filesystem.checkPermissions();
								if (permStatus.publicStorage !== 'granted') {
								  permStatus = await Filesystem.requestPermissions();
								}

								if (permStatus.publicStorage !== 'granted') {
				                  showToast("Storage permission is required to save files.", "error");
								  console.error("Storage permission not granted.");
				                    return; 
				                }
				                // --- END PERMISSION CHECK ---

				                const base64Data = doc.output('datauristring').split(',')[1];

				                // --- ✅ MODIFICATION START ---
				                // Using Directory.Documents as it's often more reliable on modern Android
				                const directory = Directory.Documents; 
				                const filePath = sanitizedFileName; // Save directly in the Documents folder

								const result = await Filesystem.writeFile({
								    path: filePath, // Use new path
								    data: base64Data,
								    directory: directory, // Use new directory
									recursive: true // Keep this for safety
								});
				                // --- ✅ MODIFICATION END ---

				                // 4. Show a toast
				                showToast("File saved to Documents folder.", "info"); // --- MODIFIED ---

				                // 5. OPEN THE FILE
				                await FileOpener.open({
				                    filePath: result.uri,
				                    contentType: 'application/pdf',
				                });

				            } else {
				                // --- WEB BROWSER ---
				                doc.save(sanitizedFileName);
				                showToast("Quiz exported as PDF.", "success");
				            }
        
				        } catch (error) {
				            console.error("Error exporting PDF:", error);
				            showToast(`Failed to export PDF: ${error.message}`, "error");
				        }
				    };
    // --- END OF MODIFICATION ---

    const totalQuestions = shuffledQuestions.length;
    // MODIFICATION: Use dynamic maxAttempts for this check
    const hasAttemptsLeft = isTeacherView ? true : attemptsTaken < maxAttempts;

    const handleAnswer = (answer, questionType) => {
        if (isTeacherView || (currentQuestionAttempted && questionType !== 'matching-type')) return;
        setUserAnswers({ ...userAnswers, [currentQ]: answer });
        if (questionType !== 'matching-type') {
            const currentQuestion = shuffledQuestions[currentQ];
            setCurrentQuestionAttempted(true);
            let isCorrect = false;
            if (currentQuestion.type === 'multiple-choice') { isCorrect = (answer === currentQuestion.correctAnswerIndex); } 
            else if (currentQuestion.type === 'true-false') { isCorrect = (answer === currentQuestion.correctAnswer); } 
            else if (currentQuestion.type === 'identification' || currentQuestion.type === 'exactAnswer') {
                const formattedUserAnswer = String(answer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                const formattedCorrectAnswer = String(currentQuestion.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                isCorrect = (formattedUserAnswer === formattedCorrectAnswer);
            }
            setQuestionResult(isCorrect ? 'correct' : 'incorrect');
        }
    };

    const handleNextQuestion = () => {
        setCurrentQuestionAttempted(false);
        setQuestionResult(null);
        setMatchingResult(null);
        if (currentQ < totalQuestions - 1) {
            setCurrentQ(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };
    
    const handleReviewLastAttempt = () => { setShowReview(true); };
    
    const handleClose = () => { 
        // --- MODIFICATION: RESET INFRACTION STATE ---
        setIsInfractionActive(false);
        // ------------------------------------------
        const antiCheatEnabled = quiz?.settings?.lockOnLeave ?? false;
        if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView && antiCheatEnabled) { 
            setShowWarningModal(true); 
        } else { 
            onClose(); 
        } 
    };
    const handleStayInQuiz = () => setShowWarningModal(false);
    const handleLeaveQuiz = async () => { 
        await issueWarning(); 
        setShowWarningModal(false); 
        // --- MODIFICATION: RESET INFRACTION STATE ---
        setIsInfractionActive(false);
        // ------------------------------------------
        onClose(); 
    };

    const handleKeyDown = useCallback((event) => {
        if (score !== null || isLocked || showReview || document.activeElement.tagName === 'INPUT' || (shuffledQuestions[currentQ]?.type === 'matching-type')) return;
        if (event.key === 'ArrowRight') {
            if (isTeacherView) {
                if (currentQ < totalQuestions - 1) setCurrentQ(prev => prev + 1);
            } else {
                if (currentQuestionAttempted) handleNextQuestion();
            }
        } else if (event.key === 'ArrowLeft') {
             if (currentQ > 0) {
                setQuestionResult(null); 
                setCurrentQ(prev => prev - 1);
            }
        }
    }, [score, isLocked, showReview, isTeacherView, currentQ, totalQuestions, shuffledQuestions, currentQuestionAttempted, handleNextQuestion]);

    useEffect(() => {
        if (isOpen) { window.addEventListener('keydown', handleKeyDown); }
        return () => { window.removeEventListener('keydown', handleKeyDown); };
    }, [isOpen, handleKeyDown]);

    useEffect(() => {
        const setPrivacyScreen = async () => {
            if (Capacitor.isNativePlatform()) {
                if (isOpen && quiz?.settings?.preventScreenCapture && !isTeacherView) {
                    await PrivacyScreen.enable();
                } else {
                    await PrivacyScreen.disable();
                }
            }
        };

        setPrivacyScreen();

        return () => {
            if (Capacitor.isNativePlatform()) {
                PrivacyScreen.disable();
            }
        };
    }, [isOpen, quiz, isTeacherView]);

    useEffect(() => {
        if (isTeacherView || !isOpen || score !== null || isLocked) return;

        const handleCopyPaste = (e) => {
            e.preventDefault();
            showToast("Copying and pasting is disabled during the quiz.", "warning");
            issueWarning();
        };

        let intervalId;
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        if (!isMobile && (quiz?.settings?.detectDevTools ?? false)) {
            const devToolsCheck = () => {
                const widthThreshold = window.outerWidth - window.innerWidth > 160;
                const heightThreshold = window.outerHeight - window.innerHeight > 160;
                if (widthThreshold || heightThreshold) {
                    issueWarning('devTools');
                }
            };
            intervalId = setInterval(devToolsCheck, 1000);
        }

        const quizRoot = document.querySelector('.quiz-container');
        if (quizRoot) {
            quizRoot.addEventListener('copy', handleCopyPaste);
            quizRoot.addEventListener('paste', handleCopyPaste);
            quizRoot.addEventListener('cut', handleCopyPaste);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (quizRoot) {
                quizRoot.removeEventListener('copy', handleCopyPaste);
                quizRoot.removeEventListener('paste', handleCopyPaste);
                quizRoot.removeEventListener('cut', handleCopyPaste);
            }
        };
    }, [isOpen, isTeacherView, score, isLocked, issueWarning, showToast, quiz?.settings?.detectDevTools]);

    const handleConfirmMatchingAnswer = () => {
        const question = shuffledQuestions[currentQ];
        const currentMatches = userAnswers[currentQ] || {};
        let correctPairsCount = 0;
        
        question.prompts.forEach(prompt => {
            if (currentMatches[prompt.id] && currentMatches[prompt.id] === question.correctPairs[prompt.id]) {
                correctPairsCount++;
            }
        });

        setMatchingResult({ correct: correctPairsCount, total: question.prompts.length });
        setCurrentQuestionAttempted(true);
    };

    const renderQuestionNumber = () => {
        const question = shuffledQuestions[currentQ];
        if (!question || questionNumbering.starts.length === 0) return null;

        const startNumber = questionNumbering.starts[currentQ];
        const itemCount = question.type === 'matching-type' ? (question.prompts?.length || 1) : 1;
        const endNumber = startNumber + itemCount - 1;

        if (itemCount === 1) {
            return `Question ${startNumber}`;
        } else {
            return `Questions ${startNumber}-${endNumber}`;
        }
    };

    const renderQuestion = () => {
        const question = shuffledQuestions[currentQ];
        if(!question) return null;
        const isDisabled = currentQuestionAttempted || isTeacherView;

        if (question.type === 'matching-type') {
            const currentMatches = userAnswers[currentQ] || {};
            const matchedOptionIds = Object.values(currentMatches);
            const allPromptsMatched = question.prompts.length > 0 && question.prompts.length === Object.keys(currentMatches).length;
    
            const DraggableOption = ({ id, text }) => {
                const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
                const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 } : undefined;
                return (
                    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-2 bg-neumorphic-base shadow-neumorphic rounded-lg cursor-grab active:cursor-grabbing text-slate-700 text-sm">
                        {text}
                    </div>
                );
            };
    
            const DroppablePrompt = ({ id, text, matchedOption, onDrop }) => {
                const { isOver, setNodeRef } = useDroppable({ id });
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-neumorphic-base shadow-neumorphic-inset rounded-lg text-slate-800 font-medium text-sm">{text}</div>
                        <div ref={setNodeRef} onClick={() => onDrop(id)} className={`flex-1 h-12 p-1 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${isOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300'}`}>
                            {matchedOption ? <div className="p-1 bg-slate-200 shadow-inner rounded-md w-full text-center text-slate-800 cursor-pointer text-sm">{matchedOption.text}</div> : <span className="text-xs text-slate-400">Drop here</span>}
                        </div>
                    </div>
                );
            };
    
            const handleDragEnd = (event) => {
                const { active, over } = event;
                if (over && active.id !== over.id) {
                    const newMatches = { ...currentMatches };
                    const existingMatchKey = Object.keys(newMatches).find(key => newMatches[key] === active.id);
                    if (existingMatchKey) delete newMatches[existingMatchKey];
                    newMatches[over.id] = active.id;
                    handleAnswer(newMatches, 'matching-type');
                }
            };
    
            const unmatchItem = (promptId) => {
                if (currentQuestionAttempted) return;
                const newMatches = { ...currentMatches };
                delete newMatches[promptId];
                handleAnswer(newMatches, 'matching-type');
            };
    
            return (
                <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                    <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                        <ContentRenderer text={question.text || question.question} />
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-2/3 space-y-2">
                            {question.prompts.map(prompt => {
                                const matchedOptionId = currentMatches[prompt.id];
                                const matchedOption = question.options.find(opt => opt.id === matchedOptionId);
                                return <DroppablePrompt key={prompt.id} id={prompt.id} text={prompt.text} matchedOption={matchedOption} onDrop={unmatchItem} />;
                            })}
                        </div>
                        <div className="w-full md:w-1/3 space-y-2 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl">
                            <p className="text-center text-xs text-slate-500 font-semibold mb-2">DRAGGABLE OPTIONS</p>
                            {question.options
                                .filter(opt => !matchedOptionIds.includes(opt.id))
                                .map(option => <DraggableOption key={option.id} id={option.id} text={option.text} />)}
                        </div>
                    </div>
                    {allPromptsMatched && !currentQuestionAttempted && (
                        <div className="mt-4 text-center">
                            <button onClick={handleConfirmMatchingAnswer} className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                Confirm Answer
                            </button>
                        </div>
                    )}
                    {matchingResult && (
                        <div className="mt-4 p-3 text-center font-semibold text-lg rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                            You correctly matched <span className="text-green-600">{matchingResult.correct}</span> out of <span className="text-slate-800">{matchingResult.total}</span> items.
                        </div>
                    )}
                </DndContext>
            );
        }

        if (question.type === 'true-false') {
            const trueLabel = quiz.language === 'Filipino' ? 'Tama' : 'True';
            const falseLabel = quiz.language === 'Filipino' ? 'Mali' : 'False';
            const options = [{ label: trueLabel, value: true }, { label: falseLabel, value: false }];

            return (
                <div>
                    <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                        <ContentRenderer text={question.text || question.question} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {options.map((option) => (
                            <button key={option.label} onClick={() => handleAnswer(option.value, 'true-false')} disabled={isDisabled} className={`w-full p-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-neumorphic-base ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'} ${userAnswers[currentQ] === option.value ? 'shadow-neumorphic-inset text-blue-700' : 'shadow-neumorphic text-slate-700'}`}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )
        }

        return (
            <div>
                <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                    <ContentRenderer text={question.text || question.question} />
                </div>
                {question.type === 'multiple-choice' ? (
                    <div className="space-y-2">
                        {question.options.map((option, idx) => (
                            <label key={idx} className={`relative flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 bg-neumorphic-base ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'} ${userAnswers[currentQ] === idx ? 'shadow-neumorphic-inset' : 'shadow-neumorphic'}`}>
                                <input type="radio" name={`question-${currentQ}`} checked={userAnswers[currentQ] === idx} onChange={() => handleAnswer(idx, 'multiple-choice')} disabled={isDisabled} className="sr-only" />
                                <span className="text-sm text-slate-700"><ContentRenderer text={option.text || option} /></span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <>
                        <input placeholder="Type your answer" value={userAnswers[currentQ] || ''} onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })} disabled={isDisabled} className="w-full p-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset focus:outline-none text-slate-800 disabled:opacity-70" />
                        {!isDisabled && (question.type === 'identification' || question.type === 'exactAnswer') && (
                            <button onClick={() => handleAnswer(userAnswers[currentQ] || '', 'identification')} className="mt-4 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                Submit Answer
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderQuestionFeedback = () => {
        const question = shuffledQuestions[currentQ];
        if (!question) return null;
        const isCorrect = questionResult === 'correct';
        
        const booleanToString = (boolValue) => {
            if (quiz.language !== 'Filipino') return String(boolValue);
            return boolValue ? 'Tama' : 'Mali';
        };

        const userAnswerText = question.type === 'multiple-choice' 
            ? (question.options[userAnswers[currentQ]]?.text ?? 'No Answer') 
            : question.type === 'true-false' 
            ? booleanToString(userAnswers[currentQ])
            : (userAnswers[currentQ] || 'No answer');
            
        const correctAnswerText = question.type === 'multiple-choice' 
            ? question.options[question.correctAnswerIndex]?.text 
            : question.type === 'true-false'
            ? booleanToString(question.correctAnswer)
            : question.correctAnswer;

        return (
            <div className={`p-4 sm:p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic`}>
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <div className={`p-2 sm:p-3 rounded-full bg-neumorphic-base ${isCorrect ? 'shadow-neumorphic' : 'shadow-neumorphic-inset'}`}>
                        {isCorrect ? <CheckCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" /> : <XCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" />}
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-extrabold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? "Correct!" : "Incorrect"}</h3>
                </div>
                <div className="text-sm sm:text-base text-slate-700 space-y-2 bg-neumorphic-base p-3 sm:p-4 rounded-2xl shadow-neumorphic-inset">
                    <p><span className="font-semibold text-slate-800">Your Answer:</span> <ContentRenderer text={userAnswerText} /></p>
                    {!isCorrect && (<p><span className="font-semibold text-slate-800">Correct Answer:</span> <ContentRenderer text={correctAnswerText} /></p>)}
                </div>
                {question.explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-300">
                        <div className="flex items-start gap-3">
                            <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-700 mb-1">Explanation</h4>
                                <div className="text-sm sm:text-base text-slate-700"><ContentRenderer text={question.explanation} /></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderResults = () => (
        <div className="text-center p-4 sm:p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-3 sm:p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-4">
                <CheckCircleIcon className="h-14 w-14 sm:h-20 sm:w-20 text-green-500" />
            </div>
            <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-2">Quiz Submitted!</h3>
            <p className="text-base sm:text-xl mt-2 text-slate-700">You scored <strong className="text-green-600 text-xl sm:text-3xl">{score}</strong> out of <strong className="text-slate-900 text-xl sm:text-3xl">{questionNumbering.totalItems}</strong></p>
            {/* MODIFICATION: Use dynamic maxAttempts for results text */}
            {(maxAttempts - attemptsTaken) > 0 ? (
                <p className="text-sm sm:text-lg mt-4 text-slate-600">You have <strong>{maxAttempts - attemptsTaken}</strong> attempt(s) left.</p>
            ) : (
                <p className="text-sm sm:text-lg mt-4 text-red-600 font-semibold">You have used all {maxAttempts} attempts.</p>
            )}
            <button onClick={() => setShowReview(true)} className="mt-8 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                Review Your Answers
            </button>
        </div>
    );

    const renderReview = () => {
        const answersToReview = latestSubmission?.answers || [];
        const reviewNumbering = (() => {
            let currentItemNumber = 1;
            const starts = [];
            answersToReview.forEach(answer => {
                starts.push(currentItemNumber);
                const itemCount = answer.questionType === 'matching-type' ? (answer.prompts?.length || 1) : 1;
                currentItemNumber += itemCount;
            });
            return { starts };
        })();
        const displayBoolean = (boolString) => {
            if (quiz.language !== 'Filipino') return boolString;
            if (boolString === 'true') return 'Tama';
            if (boolString === 'false') return 'Mali';
            return boolString;
        };

        return (
            <div>
                <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-4">Review Your Answers</h3>
                <div className="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 bg-neumorphic-base p-2 rounded-2xl shadow-neumorphic-inset">
                    {answersToReview.map((answer, index) => {
                        const startNum = reviewNumbering.starts[index];
                        const itemCount = answer.questionType === 'matching-type' ? (answer.prompts?.length || 1) : 1;
                        const endNum = startNum + itemCount - 1;
                        const numLabel = itemCount > 1 ? `Items ${startNum}-${endNum}` : `Item ${startNum}`;

                        return (
                            <div key={index} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-neumorphic-base shadow-neumorphic border-l-4 ${answer.isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                                <p className="text-xs font-bold text-slate-500 mb-2">{numLabel}</p>
                                <div className="font-bold text-base sm:text-lg text-slate-800 mb-3 flex items-start">
                                    <span className="mr-2 pt-1">{answer.isCorrect ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : <XCircleIcon className="h-5 w-5 text-red-600" />}</span>
                                    <ContentRenderer text={answer.questionText} />
                                </div>
                                <div className="text-sm space-y-1 pl-7">
                                    {answer.questionType === 'matching-type' ? (
                                        answer.prompts.map(p => {
                                            const isPairCorrect = p.userAnswerId === p.correctAnswerId;
                                            return (
                                                <div key={p.id} className="flex items-center text-slate-700">
                                                    {isPairCorrect ? <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0"/> : <XCircleIcon className="h-4 w-4 mr-2 text-red-500 flex-shrink-0"/>}
                                                    <span className="font-medium">{p.text}:</span>
                                                    <span className="mx-1">You matched "{p.userAnswerText}".</span>
                                                    {!isPairCorrect && <span className="font-semibold">(Correct: "{p.correctAnswerText}")</span>}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <>
                                            <p className="text-slate-700">Your answer: <span className="font-semibold">{displayBoolean(String(answer.selectedAnswer))}</span></p>
                                            {!answer.isCorrect && <p className="text-slate-700">Correct answer: <span className="font-semibold">{displayBoolean(String(answer.correctAnswer))}</span></p>}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => setShowReview(false)} className="mt-6 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">Back to Score</button>
            </div>
        );
    };
    
    const renderNotAvailable = () => (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <ClockIcon className="h-20 w-20 text-slate-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Quiz Not Available</h3>
            <p className="text-lg mt-2 text-slate-600">{availabilityMessage}</p>
        </div>
    );
    
    const renderSystemLockedView = () => (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <LockClosedIcon className="h-20 w-20 text-slate-700" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Quiz Locked</h3>
            <p className="text-lg mt-2 text-slate-60m0">This quiz has been locked due to multiple warnings.</p>
            <p className="text-md mt-1 text-slate-600">Please contact your teacher to have it unlocked.</p>
        </div>
    );
    
    const renderNoAttemptsLeftView = () => (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <LockClosedIcon className="h-20 w-20 text-red-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">No Attempts Remaining</h3>
            {/* MODIFICATION: Use dynamic maxAttempts here */}
            <p className="text-lg mt-2 text-slate-600">You have used all {maxAttempts} of your attempts for this quiz.</p>
            {latestSubmission && <p className="text-2xl font-bold mt-4">Your last score was <strong className="text-red-600">{latestSubmission.score}</strong> out of <strong className="text-slate-900">{latestSubmission.totalItems}</strong></p>}
            <button onClick={handleReviewLastAttempt} className="mt-8 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                Review Last Attempt
            </button>
        </div>
    );
    
    const renderTeacherPreview = () => {
        const q = shuffledQuestions[currentQ];
        return (
            <>{q ? (<div className="p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                <div className="font-semibold flex items-start text-lg text-slate-800">
                    <span className="text-slate-500 mr-2">{renderQuestionNumber()}.</span>
                    <ContentRenderer text={q.text || q.question} />
                </div>
                <div className="mt-4 space-y-2">
                    {q.type === 'multiple-choice' && q.options?.map((option, idx) => (<div key={idx} className={`flex items-center p-3 rounded-lg text-sm ${idx === q.correctAnswerIndex ? 'bg-green-500/15 text-green-900 font-semibold' : 'bg-slate-500/10'}`}>{idx === q.correctAnswerIndex && <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />}<ContentRenderer text={option.text} /></div>))}
                    {q.type === 'identification' && (<div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold"><CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />Correct Answer: <ContentRenderer text={q.correctAnswer} /></div>)}
                    {q.type === 'true-false' && (<div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold"><CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />Correct Answer: {quiz.language === 'Filipino' ? (q.correctAnswer ? 'Tama' : 'Mali') : String(q.correctAnswer)}</div>)}
                    {q.type === 'matching-type' && (
                        q.prompts.map(prompt => {
                            const correctOption = q.options.find(opt => opt.id === q.correctPairs[prompt.id]);
                            return (<div key={prompt.id} className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900">
                                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                                <span className="font-semibold">{prompt.text}</span> <span className="mx-2">→</span> <span>{correctOption?.text}</span>
                            </div>);
                        })
                    )}
                </div>
                {q.explanation && (<div className="mt-4 pt-4 border-t border-slate-300"><div className="flex items-start gap-2"><InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" /><div className="text-sm text-slate-700"><ContentRenderer text={q.explanation} /></div></div></div>)}
            </div>) : (<p className="text-center text-slate-500">This quiz has no questions.</p>)}</>
        );
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        if (!isAvailable && !isTeacherView) return renderNotAvailable();
        if (isTeacherView) return renderTeacherPreview();
        if (isLocked) return renderSystemLockedView();
        if (!hasAttemptsLeft) return showReview ? renderReview() : renderNoAttemptsLeftView();
        if (score !== null) return showReview ? renderReview() : renderResults();
        if (questionResult) return renderQuestionFeedback();
        return renderQuestion();
    }

    if (!isOpen) return null;

    const Watermark = () => {
        if (isTeacherView || !userProfile || !quiz?.settings?.preventScreenCapture) return null;
        const fullName = `${userProfile.firstName} ${userProfile.lastName}`;
        const watermarkText = Array(20).fill(fullName).join(' ');
        return (
            <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-[200%] h-[200%] text-black/5 text-2xl font-bold whitespace-nowrap transform -rotate-45">
                    {watermarkText} {watermarkText} {watermarkText}
                </div>
            </div>
        );
    };

    return (
        <>
            <Dialog open={isOpen} onClose={handleClose} static={true} className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <DialogPanel className="quiz-container relative flex flex-col w-full max-w-lg md:max-w-3xl rounded-3xl bg-neumorphic-base shadow-neumorphic max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                    <Watermark />
                    <div className="relative z-20 flex-shrink-0 p-4 pb-3">
                        <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base text-slate-500 shadow-neumorphic active:shadow-neumorphic-inset transition-all" aria-label="Close">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div className="flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight pr-8 sm:pr-0">{quiz?.title}</h2>
                                {isTeacherView && (
                                    <button onClick={handleExportPdf} className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-xl bg-neumorphic-base text-blue-700 text-sm font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                        <DocumentArrowDownIcon className="h-4 w-4"/> Export as PDF
                                    </button>
                                )}
                            </div>
                            {!isTeacherView && classId && !isLocked && score === null && (quiz?.settings?.lockOnLeave ?? false) && isAvailable && (
                                <div className="flex items-center gap-2 bg-neumorphic-base text-amber-800 px-3 py-1.5 rounded-full shadow-neumorphic-inset flex-shrink-0 self-start sm:self-center">
                                    <ShieldExclamationIcon className="w-5 h-5 text-amber-600"/>
                                    <span className="text-xs sm:text-sm font-semibold">Warnings: {warnings} / {MAX_WARNINGS}</span>
                                </div>
                            )}
                        </div>
                        {isTeacherView && (
                            <p className="text-center text-xs font-semibold text-blue-800 bg-neumorphic-base p-2 rounded-xl mt-3 shadow-neumorphic-inset">
                                Teacher Preview - Anti-cheating features are disabled.
                            </p>
                        )}
                    </div>
                    
                    <div className="relative z-20 flex-grow overflow-y-auto px-4 sm:px-6 custom-scrollbar">
                        {renderContent()}
                    </div>

                    <div className="relative z-20 flex-shrink-0 p-4 pt-3">
                        {(hasAttemptsLeft && score === null && !isLocked && !isTeacherView && currentQuestionAttempted) && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-300/80">
                                <div className="text-center sm:text-left">
                                    <span className="text-sm font-medium text-slate-600">
                                        {renderQuestionNumber()} of {questionNumbering.totalItems} Items
                                    </span>
                                    {/* MODIFICATION: Use dynamic maxAttempts for attempt counter */}
                                    <span className="block text-xs text-slate-500 mt-1">Attempt {attemptsTaken + 1} of {maxAttempts}</span>
                                </div>
                                {currentQ < totalQuestions - 1 ? (
                                    <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                        Next <ArrowRightIcon className="h-5 w-5"/>
                                    </button>
                                ) : (
                                    <button onClick={handleSubmit} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                        Submit Quiz
                                    </button>
                                )}
                            </div>
                        )}

                        {isTeacherView && totalQuestions > 0 && (
                            <div className="flex justify-between items-center pt-3 border-t border-slate-300">
                                <button onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neumorphic-base text-slate-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset disabled:opacity-50 transition-all">
                                    <ArrowLeftIcon className="h-5 w-5"/>Previous
                                </button>
                                <span className="text-xs text-center font-medium text-slate-600">
                                    {renderQuestionNumber()}
                                    <br/>(Block {currentQ + 1} of {totalQuestions})
                                </span>
                                <button onClick={() => setCurrentQ(prev => Math.min(totalQuestions - 1, prev + 1))} disabled={currentQ === totalQuestions - 1} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neumorphic-base text-slate-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset disabled:opacity-50 transition-all">
                                    Next<ArrowRightIcon className="h-5 w-5"/>
                                </button>
                            </div>
                        )}
                    </div>
                </DialogPanel>
            </Dialog>
            <QuizWarningModal isOpen={showWarningModal} warnings={warnings} maxWarnings={MAX_WARNINGS} onStay={handleStayInQuiz} onLeave={handleLeaveQuiz} isLocked={isLocked}/>
        </>
    );
}