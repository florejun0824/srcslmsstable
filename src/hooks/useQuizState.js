import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/firebase'; 
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext'; 
import { useAuth } from '../contexts/AuthContext'; 
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import localforage from 'localforage';
import { queueQuizSubmission, syncOfflineSubmissions } from '../services/offlineSyncService'; 
import { shuffleArray } from '../components/teacher/quiz/quizUtils'; 

import useQuizAntiCheat from './useQuizAntiCheat';
import useQuizGamification from './useQuizGamification';
import { XP_PER_QUIZ_QUESTION } from '../config/gameConfig';

export default function useQuizState({ isOpen, quiz, userProfile, classId, isTeacherView = false, onComplete, postId }) {
    // --- All State Hooks ---
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
    const [questionResult, setQuestionResult] = useState(null);
    const [currentQuestionAttempted, setCurrentQuestionAttempted] = useState(false);
    const [matchingResult, setMatchingResult] = useState(null);
    const [questionNumbering, setQuestionNumbering] = useState({ starts: [], totalItems: 0 });
    const [isAvailable, setIsAvailable] = useState(false);
    const [availabilityMessage, setAvailabilityMessage] = useState('');
    const [isInfractionActive, setIsInfractionActive] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [submissionToReview, setSubmissionToReview] = useState(null);

    // --- GAMIFICATION STATE ---
    const [answerStreak, setAnswerStreak] = useState(0);
    const [questionStartTime, setQuestionStartTime] = useState(null);
    const [xpGained, setXPGained] = useState(0);

    const { showToast } = useToast();
    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const { refreshUserProfile } = useAuth();
    const { handleGamificationUpdate } = useQuizGamification();

    const MAX_WARNINGS = 3;
    
    // --- CRITICAL FIX: SCOPE KEYS TO POST ID ---
    // We allow undefined postId for backward compatibility, but prefer it present
    const safePostId = postId || 'global'; 
    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}_${safePostId}`;
    const devToolWarningKey = `devToolWarnings_${quiz?.id}_${userProfile?.id}_${safePostId}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}_${safePostId}`;
    
    const maxAttempts = quiz?.settings?.maxAttempts ?? 3;

    // Calculate question numbering and total possible points
    useEffect(() => {
        if (shuffledQuestions.length > 0) {
            let currentItemNumber = 1;
            const starts = [];
            let totalPossiblePoints = 0;
            shuffledQuestions.forEach(q => {
                starts.push(currentItemNumber);
                const pointsValue = Number(q.points) || 1;
                currentItemNumber += pointsValue;
                totalPossiblePoints += pointsValue;
            });
            setQuestionNumbering({ starts, totalItems: totalPossiblePoints });
        }
    }, [shuffledQuestions]);

    // Function to issue warnings (anti-cheat)
    const issueWarning = useCallback(async (type = 'general') => {
        if (isTeacherView || isLocked || score !== null || showReview || hasSubmitted.current) return;

        const isAntiCheatEnabled = quiz?.settings?.enabled ?? false;
        const lockOnLeave = isAntiCheatEnabled && (quiz?.settings?.lockOnLeave ?? false);
        const detectDevTools = isAntiCheatEnabled && (quiz?.settings?.detectDevTools ?? false);
        const warnOnPaste = isAntiCheatEnabled && (quiz?.settings?.warnOnPaste ?? false);

        // --- CRITICAL FIX: SCOPE LOCK ID TO POST ID ---
        const lockDocId = `${quiz.id}_${userProfile.id}_${safePostId}`;

        try {
            if (type === 'devTools') {
                if (!detectDevTools) return;
                const newDevToolWarningCount = devToolWarnings + 1;
                setDevToolWarnings(newDevToolWarningCount);
                localStorage.setItem(devToolWarningKey, newDevToolWarningCount.toString());

                if (newDevToolWarningCount >= MAX_WARNINGS) {
                    setIsLocked(true);
                    if (navigator.onLine) {
                        const lockRef = doc(db, 'quizLocks', lockDocId); // Updated ID
                        await setDoc(lockRef, { 
                            quizId: quiz.id, 
                            studentId: userProfile.id, 
                            studentName: `${userProfile.firstName} ${userProfile.lastName}`, 
                            classId: classId, 
                            postId: postId,
                            lockedAt: serverTimestamp(), 
                            reason: 'Developer tools opened too many times' 
                        });
                    }
                    showToastRef.current(`Quiz Locked: Developer tools warning limit reached.`, "error", 5000);
                } else {
                    showToastRef.current(`Developer tools warning ${newDevToolWarningCount} of ${MAX_WARNINGS}.`, "warning");
                }

            } else if (type === 'paste') {
                if (!warnOnPaste) return;
                const newWarningCount = warnings + 1;
                setWarnings(newWarningCount);
                localStorage.setItem(warningKey, newWarningCount.toString());

                if (newWarningCount >= MAX_WARNINGS) {
                    setIsLocked(true);
                    if (navigator.onLine) {
                        const lockRef = doc(db, 'quizLocks', lockDocId); // Updated ID
                        await setDoc(lockRef, { 
                            quizId: quiz.id, 
                            studentId: userProfile.id, 
                            studentName: `${userProfile.firstName} ${userProfile.lastName}`, 
                            classId: classId, 
                            postId: postId,
                            lockedAt: serverTimestamp(), 
                            reason: 'Pasting content too many times' 
                        });
                    }
                }

            } else if (type === 'general') {
                if (!lockOnLeave) return;
                const newWarningCount = warnings + 1;
                setWarnings(newWarningCount);
                localStorage.setItem(warningKey, newWarningCount.toString());

                if (newWarningCount >= MAX_WARNINGS) {
                    setIsLocked(true);
                    if (navigator.onLine) {
                        const lockRef = doc(db, 'quizLocks', lockDocId); // Updated ID
                        await setDoc(lockRef, { 
                            quizId: quiz.id, 
                            studentId: userProfile.id, 
                            studentName: `${userProfile.firstName} ${userProfile.lastName}`, 
                            classId: classId, 
                            postId: postId,
                            lockedAt: serverTimestamp(), 
                            reason: 'Too many unauthorized attempts to navigate away' 
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Failed to issue warning or update lock status:", error);
            showToastRef.current("Could not process warning. Please proceed with caution.", "error");
        }
    }, [warnings, devToolWarnings, warningKey, devToolWarningKey, quiz, userProfile, classId, postId, safePostId, isLocked, score, showReview, isTeacherView, hasSubmitted]);

    // handleSubmit
    const handleSubmit = useCallback(async () => {
        if (hasSubmitted.current || score !== null || isLocked) return;
        hasSubmitted.current = true;
        justSubmitted.current = true;

        let calculatedScore = 0;
        const detailedAnswers = [];
        let containsEssays = false;

        // --- Grading loop ---
        shuffledQuestions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            const points = Number(q.points) || 1;

            if (q.type === "multiple-choice") {
                const correctOption = q.options?.[q.correctAnswerIndex];
                const correctAnswer = (correctOption?.text || correctOption) ?? null;
                const selectedOption = q.options?.[userAnswer];
                const selectedAnswer = (selectedOption?.text || selectedOption) ?? null;
                const isCorrect = selectedAnswer !== null && selectedAnswer === correctAnswer;
                const itemScore = isCorrect ? points : 0;
                if (isCorrect) calculatedScore += points;
                detailedAnswers.push({
                    questionType: q.type, questionText: q.text || q.question, selectedAnswer, correctAnswer, isCorrect,
                    points: points, score: itemScore, status: 'graded',
                    difficulty: q.difficulty ?? null, explanation: q.explanation ?? null
                });
            } else if (q.type === "identification" || q.type === "exactAnswer") {
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
                const isCorrect = userAnswer === q.correctAnswer;
                const itemScore = isCorrect ? points : 0;
                if (isCorrect) calculatedScore += points;
                detailedAnswers.push({
                    questionType: q.type, questionText: q.text || q.question, selectedAnswer: userAnswer === undefined ? null : String(userAnswer), correctAnswer: q.correctAnswer !== undefined ? String(q.correctAnswer) : null, isCorrect,
                    points: points, score: itemScore, status: 'graded',
                    difficulty: q.difficulty ?? null, explanation: q.explanation ?? null
                });
            } else if (q.type === "matching-type") {
                const userPairs = userAnswer || {};
                const reviewPrompts = [];
                let correctPairsCount = 0;
                let scoreForThisQuestion = 0;
                const numPrompts = q.prompts?.length || 0;
                const pointsPerItem = numPrompts > 0 ? (points / numPrompts) : 0;

                (q.prompts || []).forEach(prompt => {
                    const isPairCorrect = userPairs[prompt.id] && q.correctPairs && userPairs[prompt.id] === q.correctPairs[prompt.id];
                    if (isPairCorrect) {
                        scoreForThisQuestion += pointsPerItem;
                        correctPairsCount++;
                    }
                    reviewPrompts.push({
                        id: prompt.id, text: prompt.text,
                        userAnswerId: userPairs[prompt.id] || null,
                        userAnswerText: q.options?.find(opt => opt.id === userPairs[prompt.id])?.text || "Not Answered",
                        correctAnswerId: q.correctPairs?.[prompt.id] || null,
                        correctAnswerText: q.options?.find(opt => opt.id === q.correctPairs?.[prompt.id])?.text || null
                    });
                });
                if (numPrompts > 0 && correctPairsCount === numPrompts) { scoreForThisQuestion = points; }
                else { scoreForThisQuestion = Math.round(scoreForThisQuestion * 100) / 100; }
                calculatedScore += scoreForThisQuestion;
                detailedAnswers.push({
                    questionType: q.type, questionText: q.text || q.question, prompts: reviewPrompts,
                    isCorrect: (numPrompts > 0 && correctPairsCount === numPrompts),
                    points: points, score: scoreForThisQuestion, status: 'graded',
                    correctCount: correctPairsCount,
                    difficulty: q.difficulty ?? null, explanation: q.explanation ?? null
                });
            } else if (q.type === "essay") {
                containsEssays = true;
                const essayAnswer = userAnswer || "";
                detailedAnswers.push({
                    questionType: q.type,
                    questionText: q.text || q.question,
                    selectedAnswer: essayAnswer,
                    correctAnswer: null,
                    rubric: q.rubric || [],
                    isCorrect: null,
                    points: points,
                    score: 0,
                    aiGradingResult: null,
                    status: 'pending_ai_grading',
                    difficulty: q.difficulty ?? null,
                    explanation: q.explanation ?? null
                });
            }
        });
        // --- End Grading Loop ---

        const finalScore = Math.round(calculatedScore);
        setScore(finalScore);

        const xpGainedCalc = finalScore * XP_PER_QUIZ_QUESTION;
        setXPGained(xpGainedCalc);

        localStorage.removeItem(warningKey);
        localStorage.removeItem(devToolWarningKey);
        localStorage.removeItem(shuffleKey);
        setWarnings(0);
        setDevToolWarnings(0);
        setIsInfractionActive(false);
        setAnswerStreak(0);

        try {
            const submissionData = {
				postId: postId,
                quizId: quiz.id,
                quizTitle: quiz.title,
                classId: classId,
                studentId: userProfile.id,
                studentName: `${userProfile.firstName} ${userProfile.lastName}`,
                answers: detailedAnswers,
                score: finalScore,
                status: containsEssays ? 'pending_ai_grading' : 'graded',
                hasPendingEssays: containsEssays,
                totalItems: questionNumbering.totalItems,
                attemptNumber: attemptsTaken + 1,
                submittedAt: new Date(),
                quarter: quiz.quarter || null,
                xpGained: xpGainedCalc,
            };

            await queueQuizSubmission(submissionData);

            if (navigator.onLine) {
                await syncOfflineSubmissions();

                await handleGamificationUpdate({
                    xpGained: xpGainedCalc,
                    userProfile,
                    refreshUserProfile,
                    showToast: showToastRef.current,
                    finalScore: finalScore,
                    totalPoints: questionNumbering.totalItems,
                    attemptsTaken: attemptsTaken
                });
            }

            setLatestSubmission({ ...submissionData });
            setAttemptsTaken(prev => prev + 1);
            showToastRef.current(
                navigator.onLine
                    ? (containsEssays ? "Quiz submitted! Essays pending teacher review." : "Quiz submitted successfully!")
                    : "📡 Quiz saved offline. Will sync and essays will be reviewed when online.",
                containsEssays ? "info" : "success",
                containsEssays ? 5000 : 3000
            );
            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            console.error("Error queuing submission:", error);
            showToastRef.current("❌ Could not save your quiz submission locally. Please try again.", "error");
            hasSubmitted.current = false;
            justSubmitted.current = false;
            setXPGained(0);
        }
    }, [
        userAnswers, score, shuffledQuestions, quiz, userProfile, classId, postId, attemptsTaken,
        warningKey, devToolWarningKey, shuffleKey, isLocked, onComplete, questionNumbering.totalItems,
        refreshUserProfile, handleGamificationUpdate
    ]);

    // handleStartNewAttempt
    const handleStartNewAttempt = useCallback(() => {
        setCurrentQ(0);
        setUserAnswers({});
        setScore(null); 
        setShowReview(false);
        setSubmissionToReview(null);
        hasSubmitted.current = false; 
        setLatestSubmission(null);
        setQuestionResult(null);
        setCurrentQuestionAttempted(false);
        setMatchingResult(null);
        setIsInfractionActive(false);
        setAnswerStreak(0); 
        setQuestionStartTime(Date.now()); 
        setXPGained(0); 

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
        setShuffledQuestions(newShuffledQuestions);
        
        const now = new Date();
        const until = quiz?.availableUntil?.toDate();
        const isExam = quiz?.settings?.maxAttempts === 1;
        if (!isExam && until && until < now) {
            showToastRef.current("This quiz is overdue. Your submission will be marked as late.", "warning", 4000);
        }
        
    }, [quiz, shuffleKey]);

    // Countdown Timer Logic
    useEffect(() => {
        const isExam = quiz?.settings?.maxAttempts === 1;
        const hasEndDate = quiz?.availableUntil;
        const canRunTimer = isOpen && !isTeacherView && !loading && isAvailable && !isLocked && score === null && !hasSubmitted.current && isExam && hasEndDate;

        if (!canRunTimer) {
            setTimeRemaining(null);
            return;
        }

        let interval = null;
        const updateRemainingTime = () => {
            const endTime = quiz.availableUntil.toDate().getTime();
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeRemaining(remainingSeconds);
            if (remainingSeconds <= 0) {
                if (!hasSubmitted.current) {
                    showToastRef.current("Time's up! Submitting your quiz automatically...", "warning", 4000);
                    handleSubmit();
                }
                if (interval) clearInterval(interval);
                return false;
            }
            return true;
        };

        if (updateRemainingTime()) {
            interval = setInterval(updateRemainingTime, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [
        isOpen, isTeacherView, loading, isAvailable, isLocked, score, hasSubmitted,
        quiz?.settings?.maxAttempts, quiz?.availableUntil,
        handleSubmit
    ]);

    // --- MODIFIED: Main setup useEffect ---
    useEffect(() => {
        if (!isOpen) {
            setIsInfractionActive(false);
            return;
        }

        if (justSubmitted.current) {
            justSubmitted.current = false;
            setLoading(false);
            return;
        }

        setCurrentQ(0);
        setUserAnswers({});
        setShowReview(false);
        setQuestionResult(null);
        setCurrentQuestionAttempted(false);
        setMatchingResult(null);
        setIsInfractionActive(false);
        setLoading(true); 
        setAnswerStreak(0);
        setQuestionStartTime(Date.now());
        setXPGained(0);
        
        if (!isTeacherView) {
            const now = new Date();
            const from = quiz?.availableFrom?.toDate();
            const until = quiz?.availableUntil?.toDate();
            const isExam = quiz?.settings?.maxAttempts === 1;

            if (from && from > now) {
                setIsAvailable(false); setAvailabilityMessage(`This quiz will be available on ${from.toLocaleString()}.`); setLoading(false); return;
            }

            if (until && until < now) {
                if (isExam) {
                    setIsAvailable(false);
                    setAvailabilityMessage('This exam has expired and is no longer available.');
                    setLoading(false);
                    return;
                }
            }
        }
        setIsAvailable(true);

        const setupQuiz = async () => {
            
            const fetchSubmission = async () => {
                if (!quiz?.id || !userProfile?.id || !classId || !postId || isTeacherView) {
                    setScore(null);
                    setLatestSubmission(null);
                    setAttemptsTaken(0);
                    setAllSubmissions([]);
                    hasSubmitted.current = false;
                    return null;
                }
                try {
                    let isDbLocked = false;
                    let dbSubmissions = [];
                    let localWarningCount = parseInt(localStorage.getItem(warningKey) || '0', 10);
                    let localDevToolWarningCount = parseInt(localStorage.getItem(devToolWarningKey) || '0', 10);

                    if (navigator.onLine) {
                        // --- CRITICAL FIX: Check for Post-Specific Lock Doc ---
                        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}_${safePostId}`);
                        const lockSnap = await getDoc(lockRef);
                        isDbLocked = lockSnap.exists();

                        if (!isDbLocked && (localWarningCount >= MAX_WARNINGS || localDevToolWarningCount >= MAX_WARNINGS)) {
                            localStorage.removeItem(warningKey);
                            localStorage.removeItem(devToolWarningKey);
                            setWarnings(0);
                            setDevToolWarnings(0);
                            localWarningCount = 0;
                            showToastRef.current("Your teacher may have unlocked this quiz.", "info");
                        }

                        const submissionsRef = collection(db, 'quizSubmissions');
                        const q = query(submissionsRef,
                            where("postId", "==", postId),
                            where("studentId", "==", userProfile.id),
                            where("quizId", "==", quiz.id) 
                        );

                        const querySnapshot = await getDocs(q);
                        dbSubmissions = querySnapshot.docs.map(d => ({ id: d.id, ...d.data(), submittedAt: d.data().submittedAt?.toDate ? d.data().submittedAt.toDate() : d.data().submittedAt }));
                        dbSubmissions.sort((a, b) => (new Date(b.submittedAt).getTime() || 0) - (new Date(a.submittedAt).getTime() || 0));
                    }

                    const isLocallyLocked = localWarningCount >= MAX_WARNINGS || localDevToolWarningCount >= MAX_WARNINGS;
                    setIsLocked(isDbLocked || isLocallyLocked);

                    const offlineSubmissions = await localforage.getItem("quiz-submission-outbox") || [];
					const myOfflineAttempts = offlineSubmissions.filter(sub =>
					                        sub.postId === postId && 
                                            sub.studentId === userProfile.id &&
                                            sub.quizId === quiz.id 
                    );

                    if (navigator.onLine && myOfflineAttempts.length > 0) {
                        try {
                            console.log(`Syncing ${myOfflineAttempts.length} offline submission(s) for this quiz...`);
                            showToastRef.current("📡 Syncing offline submissions...", "info", 2000);
                            
                            await syncOfflineSubmissions(); 
                            
                            console.log("Sync complete. Triggering dashboard refresh.");
                            showToastRef.current("✅ Offline submissions synced!", "success", 2000);

                            if (onComplete) {
                                onComplete();
                            }
                            return 'synced'; 

                        } catch (syncError) {
                            console.error("Failed to sync offline submissions:", syncError);
                            showToastRef.current("❌ Failed to sync offline submissions. Showing local data.", "warning");
                        }
                    }

                    const dbSubmissionIds = new Set(dbSubmissions.map(s => s.submissionId));
                    const uniqueOfflineAttempts = myOfflineAttempts.filter(s => !dbSubmissionIds.has(s.submissionId));

                    const allAttempts = [...dbSubmissions, ...uniqueOfflineAttempts];
                    allAttempts.sort((a, b) => (new Date(b.submittedAt).getTime() || 0) - (new Date(a.submittedAt).getTime() || 0));

                    setAttemptsTaken(allAttempts.length);
                    setLatestSubmission(allAttempts[0] || null);
                    setAllSubmissions(allAttempts);

                    const latest = allAttempts[0] || null;
                    if (latest && (latest.status === 'graded' || latest.status === 'pending_review' || latest.status === 'pending_ai_grading') && allAttempts.length < maxAttempts && allAttempts.length > 0) {
                        setScore(latest.score);
                        hasSubmitted.current = true;
                    } else {
                        setScore(null);
                        hasSubmitted.current = false;
                    }
                    return latest; 
                } catch (error) {
                    console.error("Error fetching submission data:", error);
                    showToastRef.current("❌ Could not load past submission data. Proceeding with caution.", "warning");
                    const localWarnings = parseInt(localStorage.getItem(warningKey) || '0', 10);
                    const localDevWarnings = parseInt(localStorage.getItem(devToolWarningKey) || '0', 10);
                    setIsLocked(localWarnings >= MAX_WARNINGS || localDevWarnings >= MAX_WARNINGS);
                    setAttemptsTaken(0);
                    setLatestSubmission(null);
                    setAllSubmissions([]);
                    setScore(null);
                    hasSubmitted.current = false;
                    return null; 
                } 
            };
            // --- End of inner fetchSubmission ---

            let initialShuffledQuestions = [];
            if (!isTeacherView) {
                const savedWarnings = localStorage.getItem(warningKey);
                setWarnings(savedWarnings ? parseInt(savedWarnings, 10) : 0);
                const savedDevToolWarnings = localStorage.getItem(devToolWarningKey);
                setDevToolWarnings(savedDevToolWarnings ? parseInt(savedDevToolWarnings, 10) : 0);

                const latestSub = await fetchSubmission();

                if (latestSub === 'synced') {
                    setLoading(false);
                    return;
                }

                const now = new Date();
                const until = quiz?.availableUntil?.toDate();
                const isExam = quiz?.settings?.maxAttempts === 1;
                
                if (!isExam && until && until < now && latestSub === null) { 
                    showToastRef.current("This quiz is overdue. Your submission will be marked as late.", "warning", 4000);
                }

                const shouldShuffle = quiz?.settings?.shuffleQuestions ?? false;
                const baseQuestions = quiz.questions || [];
                try {
                    if (shouldShuffle) {
                        const savedShuffleOrder = localStorage.getItem(shuffleKey);
                        if (savedShuffleOrder && latestSub === null) { 
                            const parsedOrder = JSON.parse(savedShuffleOrder);
                            if (Array.isArray(parsedOrder) && parsedOrder.length === baseQuestions.length) {
                                initialShuffledQuestions = parsedOrder;
                                console.log("Using shuffle order from localStorage.");
                            } else {
                                console.log("Shuffle order mismatch, reshuffling.");
                                const newShuffled = shuffleArray(baseQuestions);
                                initialShuffledQuestions = newShuffled;
                                localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
                            }
                        } else {
                            const newShuffled = shuffleArray(baseQuestions);
                            initialShuffledQuestions = newShuffled;
                            if(latestSub === null) { 
                                localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
                                console.log("Shuffled questions and saved order.");
                            } else {
                                console.log("Loaded previous submission, not saving new shuffle.");
                            }
                        }
                    } else {
                        initialShuffledQuestions = baseQuestions;
                        localStorage.removeItem(shuffleKey);
                    }
                } catch (e) {
                    console.error("Error handling question shuffling:", e);
                    initialShuffledQuestions = shuffleArray(baseQuestions);
                }
            } else {
                setWarnings(0);
                setDevToolWarnings(0);
                setIsLocked(false);
                initialShuffledQuestions = quiz.questions || [];
            }
            
            setShuffledQuestions(initialShuffledQuestions);
            setLoading(false);
        };

        setupQuiz();

    }, [
        isOpen, quiz, isTeacherView, warningKey, devToolWarningKey, shuffleKey,
        userProfile?.id, classId, postId, safePostId, maxAttempts, onComplete
    ]);


    // handleAnswer
    const handleAnswer = (answer, questionType) => {
        if (isTeacherView || (currentQuestionAttempted && questionType !== 'matching-type' && questionType !== 'essay')) {
            return;
        }
        setUserAnswers({ ...userAnswers, [currentQ]: answer });

        if (questionType !== 'matching-type' && questionType !== 'essay') {
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

            if (isCorrect) {
                setAnswerStreak(prevStreak => prevStreak + 1);
            } else {
                setAnswerStreak(0); // Reset streak
            }

            if (Capacitor.isNativePlatform()) {
                if (isCorrect) {
                    Haptics.impact({ style: ImpactStyle.Light });
                } else {
                    Haptics.notification({ type: NotificationType.Error });
                }
            }
        } else if (questionType === 'essay') {
            if (!currentQuestionAttempted && String(answer || '').trim() !== '') {
                setCurrentQuestionAttempted(true);
                if (Capacitor.isNativePlatform()) {
                    Haptics.impact({ style: ImpactStyle.Medium });
                }
            }
        }
    };

    // handleNextQuestion
    const handleNextQuestion = () => {
        setCurrentQuestionAttempted(false);
        setQuestionResult(null);
        setMatchingResult(null);
        if (currentQ < shuffledQuestions.length - 1) {
            setCurrentQ(prev => prev + 1);
        } else {
            handleSubmit();
        }
        setQuestionStartTime(Date.now()); // Set timer for next question
    };

    // handleConfirmMatchingAnswer
    const handleConfirmMatchingAnswer = () => {
        const question = shuffledQuestions[currentQ];
        if (!question || question.type !== 'matching-type' || !question.prompts || !question.correctPairs) return;
        const currentMatches = userAnswers[currentQ] || {};
        let correctPairsCount = 0;
        question.prompts.forEach(prompt => {
            if (currentMatches[prompt.id] && currentMatches[prompt.id] === question.correctPairs[prompt.id]) {
                correctPairsCount++;
            }
        });
        setMatchingResult({ correct: correctPairsCount, total: question.prompts.length });
        setCurrentQuestionAttempted(true);

        if (Capacitor.isNativePlatform()) {
            if (correctPairsCount === question.prompts.length) {
                Haptics.notification({ type: NotificationType.Success });
            } else if (correctPairsCount > 0) {
                Haptics.impact({ style: ImpactStyle.Light });
            } else {
                Haptics.notification({ type: NotificationType.Error });
            }
        }
    };

    // renderQuestionNumber
    const renderQuestionNumber = () => {
        const question = shuffledQuestions[currentQ];
        if (!question || !questionNumbering.starts || questionNumbering.starts.length <= currentQ) {
            return `Question ${currentQ + 1}`;
        }
        const startNumber = questionNumbering.starts[currentQ];
        const pointsValue = Number(question.points) || 1;
        const endNumber = startNumber + Math.max(0, pointsValue - 1);
        if (pointsValue <= 1) {
            return `Question ${startNumber}`;
        } else {
            return `Questions ${startNumber}-${endNumber}`;
        }
    };

    // --- CALL ANTI-CHEAT HOOK ---
    useQuizAntiCheat({
        isOpen,
        isTeacherView,
        quizSettings: quiz?.settings,
        isLocked,
        score,
        hasSubmitted: hasSubmitted.current,
        isInfractionActive,
        setIsInfractionActive,
        issueWarning,
        showToast: showToastRef.current
    });
    // --- END ANTI-CHEAT HOOK ---

    // Return the "Context Value" object
    return {
        // State
        currentQ,
        userAnswers,
        score,
        latestSubmission,
        attemptsTaken,
        loading,
        showReview,
        isLocked,
        shuffledQuestions,
        hasSubmitted: hasSubmitted.current,
        questionResult,
        currentQuestionAttempted,
        matchingResult,
        questionNumbering,
        isAvailable,
        availabilityMessage,
        timeRemaining,
        allSubmissions,
        submissionToReview,
        quiz,
        userProfile,
        classId,
        isTeacherView,
        maxAttempts,
        warnings, 
        isInfractionActive, 

        // --- GAMIFICATION CONTEXT ---
        answerStreak,
        questionStartTime,
        xpGained,
        setAnswerStreak,
        setQuestionStartTime,

        // State Setters
        setCurrentQ,
        setUserAnswers,
        setScore,
        setLatestSubmission,
        setAttemptsTaken,
        setLoading,
        setShowReview,
        setIsLocked,
        setShuffledQuestions,
        setQuestionResult,
        setCurrentQuestionAttempted,
        setMatchingResult,
        setAllSubmissions,
        setSubmissionToReview,
        setIsInfractionActive,

        // Handlers
        handleAnswer,
        handleSubmit,
        handleNextQuestion,
        handleStartNewAttempt,
        handleConfirmMatchingAnswer,
        renderQuestionNumber,
        issueWarning, 
        showToast: showToastRef.current,

        // Constants
        MAX_WARNINGS,
    };
}