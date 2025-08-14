import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, LockClosedIcon, InformationCircleIcon, ClipboardDocumentListIcon, ShieldExclamationIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
    getDoc,
    updateDoc // Added updateDoc for warnings directly
} from 'firebase/firestore';
import Spinner from '../common/Spinner';
import ContentRenderer from './ContentRenderer';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import QuizWarningModal from '../../components/common/QuizWarningModal'; // NEW: Import the warning modal

// Fisher-Yates Shuffle Algorithm
const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array];
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
};


export default function ViewQuizModal({ isOpen, onClose, quiz, userProfile, classId, isTeacherView = false }) {
    const [currentQ, setCurrentQ] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(null); // Changed from finalScore to score for consistency with previous iterations
    const [latestSubmission, setLatestSubmission] = useState(null);
    const [attemptsTaken, setAttemptsTaken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);

    // --- Security State ---
    const [warnings, setWarnings] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const hasSubmitted = useRef(false);
    const [showWarningModal, setShowWarningModal] = useState(false); // State for warning modal visibility
    const MAX_WARNINGS = 3; // Define max warnings

    // --- Feedback State ---
    const [questionResult, setQuestionResult] = useState(null); // 'correct' | 'incorrect' | null
    const [currentQuestionAttempted, setCurrentQuestionAttempted] = useState(false); // Tracks if current question has been answered

    // --- Security Keys ---
    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}`;

    // --- Security Functions ---
    const issueWarning = useCallback(async () => {
        console.log("issueWarning called. Current state:", { isLocked, score, showReview, warnings, isTeacherView });
        if (isTeacherView) {
            console.log("Issue warning prevented: isTeacherView is true.");
            return;
        }
        // Prevent warning if already locked, submitted, or in review mode
        if (isLocked || score !== null || showReview) {
            console.log("issueWarning prevented: Quiz is locked, submitted, or in review.");
            return;
        }

        const newWarningCount = warnings + 1;
        setWarnings(newWarningCount);
        localStorage.setItem(warningKey, newWarningCount.toString());
        console.log(`Warning count updated to: ${newWarningCount}. Stored in localStorage.`);

        if (newWarningCount >= MAX_WARNINGS) {
            console.log("Max warnings reached. Locking quiz...");
            const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
            await setDoc(lockRef, {
                quizId: quiz.id, studentId: userProfile.id,
                studentName: `${userProfile.firstName} ${userProfile.lastName}`,
                classId: classId, lockedAt: serverTimestamp(),
                reason: 'Too many unauthorized attempts to navigate away'
            });
            setIsLocked(true);
            setShowWarningModal(true); // Show modal for lockout
            console.log("Quiz locked in Firestore and warning modal set to open (lockout).");
        } else {
            setShowWarningModal(true); // Show warning modal
            console.log("Warning modal set to open (standard warning).");
        }
    }, [warnings, warningKey, quiz, userProfile, classId, isLocked, score, showReview, isTeacherView]);


    const handleSubmit = useCallback(async () => {
        console.log("handleSubmit called. Current state:", { hasSubmitted: hasSubmitted.current, score, isLocked });
        if (hasSubmitted.current || score !== null || isLocked) {
            console.log("Submission prevented: Quiz already submitted, scored, or locked.");
            return; // Prevent submission if locked
        }
        hasSubmitted.current = true;

        let correctCount = 0;
        shuffledQuestions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            if (q.type === 'multiple-choice' && userAnswer === q.correctAnswerIndex) correctCount++;
            else if (q.type === 'identification' || q.type === 'exactAnswer') {
                const formattedUserAnswer = String(userAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                const formattedCorrectAnswer = String(q.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ""); // Clean correct answer too
                if (formattedUserAnswer === formattedCorrectAnswer) correctCount++;
            }
        });

        setScore(correctCount); // Use setScore here
        console.log(`Quiz scored: ${correctCount}/${shuffledQuestions.length}`);

        // Clear security keys from storage upon successful submission
        localStorage.removeItem(warningKey);
        localStorage.removeItem(shuffleKey);
        setWarnings(0); // Reset warnings to 0
        console.log("Security keys cleared from localStorage. Warnings reset.");

        try {
            const submissionRef = doc(collection(db, 'quizSubmissions'));
            await setDoc(submissionRef, {
                quizId: quiz.id, quizTitle: quiz.title, studentId: userProfile.id,
                studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId,
                score: correctCount, totalItems: shuffledQuestions.length, attemptNumber: attemptsTaken + 1,
                submittedAt: serverTimestamp(),
            });
            console.log("Submission saved to Firestore.");
            await fetchSubmission(); // Refresh submission data
        } catch (error) {
            console.error("Error saving submission:", error);
            // Optionally, show a toast here for submission save failure
        }
    }, [userAnswers, score, shuffledQuestions, quiz, userProfile, classId, attemptsTaken, warningKey, shuffleKey, isLocked]);


    // --- Security Hooks (Conditional based on isTeacherView) ---
    useEffect(() => { // Mobile App State Change (Capacitor)
        let listener;
        if (isOpen && Capacitor.isNativePlatform() && score === null && !isLocked && !isTeacherView) { // ONLY for student view
            console.log("Setting up Capacitor appStateChange listener.");
            listener = App.addListener('appStateChange', ({ isActive }) => {
                console.log("App state changed. isActive:", isActive);
                if (!isActive) { // App goes to background
                    issueWarning();
                }
            });
        }
        return () => {
            if (listener) {
                console.log("Removing Capacitor appStateChange listener.");
                listener.remove();
            }
        };
    }, [isOpen, score, isLocked, issueWarning, isTeacherView]);

    useEffect(() => { // Loosing Tab Focus (Blur)
        const handleFocusLoss = () => {
            console.log("Window blur detected. Current state:", { isOpen, hasSubmitted: hasSubmitted.current, isLocked, classId, score, showReview, isTeacherView });
            // Only issue warning if quiz is open, not submitted, not locked, and not in review mode AND NOT teacher view
            if (!isOpen || hasSubmitted.current || isLocked || !classId || score !== null || showReview || isTeacherView) {
                console.log("Blur warning prevented by conditions or isTeacherView.");
                return;
            }
            issueWarning();
        };
        window.addEventListener('blur', handleFocusLoss);
        console.log("Added window blur listener.");
        return () => {
            window.removeEventListener('blur', handleFocusLoss);
            console.log("Removed window blur listener.");
        };
    }, [isOpen, isLocked, score, classId, issueWarning, showReview, isTeacherView]);

    useEffect(() => { // Page Refresh/Close (beforeunload)
        const handleBeforeUnload = (event) => {
            console.log("Beforeunload event detected. Current state:", { isOpen, classId, isLocked, score, hasSubmitted: hasSubmitted.current, isTeacherView });
            if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView) { // ONLY for student view
                // For modern browsers, this message might not be displayed to the user
                // but prevents the tab from closing immediately without confirmation.
                event.preventDefault();
                event.returnValue = 'You are attempting to leave the quiz. This will result in a warning.';
                // Issue warning on close attempt (though user still has option to close)
                issueWarning();
                console.log("Beforeunload: quiz conditions met for warning. Preventing default close.");
                return ''; // Required for some browsers to show the prompt
            }
            console.log("Beforeunload: conditions not met for warning or quiz submitted/locked/isTeacherView.");
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        console.log("Added window beforeunload listener.");
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            console.log("Removed window beforeunload listener.");
        };
    }, [isOpen, classId, isLocked, score, issueWarning, isTeacherView]);


    const fetchSubmission = useCallback(async () => {
        console.log("fetchSubmission called for quiz:", quiz?.id, "user:", userProfile?.id);
        if (!quiz?.id || !userProfile?.id || !classId) {
            setLoading(false);
            console.log("fetchSubmission stopped: Missing quiz, user, or class ID.");
            return;
        }
        setLoading(true);

        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
        const lockSnap = await getDoc(lockRef);
        if (lockSnap.exists()) {
            setIsLocked(true);
            console.log("Quiz found locked in Firestore.");
        } else {
            setIsLocked(false);
        }

        const submissionsRef = collection(db, 'quizSubmissions');
        const q = query(submissionsRef, where("quizId", "==", quiz.id), where("studentId", "==", userProfile.id), where("classId", "==", classId));
        const querySnapshot = await getDocs(q);
        const submissions = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        submissions.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        
        setLatestSubmission(submissions[0] || null);
        setAttemptsTaken(submissions.length);
        setLoading(false);
        console.log(`Fetched ${submissions.length} submissions. Latest:`, submissions[0]);
    }, [quiz, userProfile, classId]);

    useEffect(() => {
        console.log("ViewQuizModal useEffect [isOpen] triggered. isOpen:", isOpen);
        if (isOpen) {
            // Reset quiz state
            setCurrentQ(0);
            setUserAnswers({});
            setScore(null); // Use setScore here
            setShowReview(false);
            hasSubmitted.current = false;
            setQuestionResult(null); // Reset feedback state
            setCurrentQuestionAttempted(false); // Reset attempt state
            
            // Security features and shuffling only for student view
            if (!isTeacherView) {
                // Initialize security features
                const savedWarnings = localStorage.getItem(warningKey);
                const initialWarnings = savedWarnings ? parseInt(savedWarnings, 10) : 0;
                setWarnings(initialWarnings);
                console.log("Initial warnings from localStorage (student view):", initialWarnings);
                
                // Check if quiz is already locked from a previous session
                const checkLockStatus = async () => {
                    const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                    const lockSnap = await getDoc(lockRef);
                    if (lockSnap.exists() || initialWarnings >= MAX_WARNINGS) {
                        setIsLocked(true);
                        console.log("Quiz initialized as LOCKED based on Firestore or saved warnings (student view).");
                    } else {
                        setIsLocked(false);
                        console.log("Quiz initialized as UNLOCKED (student view).");
                    }
                };
                checkLockStatus();

                const savedShuffle = localStorage.getItem(shuffleKey);
                // Ensure shuffled questions match current quiz questions length to prevent re-shuffling on re-open if quiz content changed
                if (savedShuffle && JSON.parse(savedShuffle).length === (quiz.questions || []).length) {
                    const parsedShuffled = JSON.parse(savedShuffle);
                    setShuffledQuestions(parsedShuffled);
                    console.log("Loaded shuffled questions from localStorage (student view).");
                    console.log("Checking loaded shuffled questions for explanations:", parsedShuffled.map(q => q.explanation ? '✅' : '❌'));

                } else {
                    const newShuffled = shuffleArray(quiz.questions || []);
                    setShuffledQuestions(newShuffled);
                    localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
                    console.log("Generated and saved new shuffled questions (student view).");
                    console.log("Checking newly shuffled questions for explanations:", newShuffled.map(q => q.explanation ? '✅' : '❌'));
                }
            } else { // Teacher view: no warnings, no lock, no shuffling
                setWarnings(0);
                setIsLocked(false);
                setShuffledQuestions(quiz.questions || []); // Teachers see questions in original order
                console.log("Teacher view: Warnings/Lock disabled, questions in original order. Explanations should be present if in quiz.questions:", (quiz.questions || []).map(q => q.explanation ? '✅' : '❌'));
            }
            
            fetchSubmission();
        } else {
            // Cleanup when modal closes (e.g., if user clicks outside after warning, or submits)
            setShowWarningModal(false); // Ensure warning modal is closed when main quiz modal closes
            console.log("ViewQuizModal is closing. Resetting warning modal state.");
        }
    }, [isOpen, quiz, warningKey, shuffleKey, fetchSubmission, userProfile, isTeacherView]);


    const totalQuestions = shuffledQuestions.length;
    // For students, hasAttemptsLeft considers MAX_WARNINGS for attempts. For teachers, it's always true.
    const hasAttemptsLeft = isTeacherView ? true : attemptsTaken < MAX_WARNINGS; 

    // MODIFIED: handleAnswer for immediate feedback
    const handleAnswer = (answer) => {
        if (isTeacherView || currentQuestionAttempted) return; // Prevent answering if teacher or already answered

        const currentQuestion = shuffledQuestions[currentQ];
        setUserAnswers({ ...userAnswers, [currentQ]: answer });
        setCurrentQuestionAttempted(true); // Mark current question as attempted

        let isCorrect = false;
        if (currentQuestion.type === 'multiple-choice') {
            isCorrect = (answer === currentQuestion.correctAnswerIndex);
        } else if (currentQuestion.type === 'true-false') {
            isCorrect = (answer === currentQuestion.correctAnswer);
        } else if (currentQuestion.type === 'identification' || currentQuestion.type === 'exactAnswer') {
            const formattedUserAnswer = String(answer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
            const formattedCorrectAnswer = String(currentQuestion.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
            isCorrect = (formattedUserAnswer === formattedCorrectAnswer);
        }
        
        setQuestionResult(isCorrect ? 'correct' : 'incorrect');
        console.log(`Question ${currentQ+1} answered. Result: ${isCorrect ? 'Correct' : 'Incorrect'}. Explanation: ${currentQuestion.explanation || 'No explanation'}`);
    };


    const handleNextQuestion = () => {
        setCurrentQuestionAttempted(false); // Reset for next question
        setQuestionResult(null); // Clear feedback for next question
        if (currentQ < totalQuestions - 1) {
            setCurrentQ(prev => prev + 1);
        } else {
            handleSubmit(); // Submit quiz if it's the last question
        }
    };

    const handleClose = () => {
        console.log("handleClose (main quiz modal close button) called. Current state:", { isOpen, classId, isLocked, score, hasSubmitted: hasSubmitted.current, isTeacherView });
        // Only trigger warning modal if quiz is active and not yet submitted/locked AND NOT teacher view
        if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView) {
            setShowWarningModal(true);
            console.log("handleClose: Triggering warning modal.");
        } else {
            // If already submitted, locked, no active quiz, OR it's teacher view, just close
            console.log("handleClose: Conditions not met for warning (or isTeacherView). Closing quiz modal.");
            onClose();
        }
    };

    const handleStayInQuiz = () => {
        console.log("handleStayInQuiz called. Closing warning modal.");
        setShowWarningModal(false);
        // Do nothing else, user stays in the quiz
    };

    const handleLeaveQuiz = () => {
        console.log("handleLeaveQuiz called. Issuing warning and closing quiz modal.");
        issueWarning(); // This will increment warning and potentially lock
        setShowWarningModal(false); // Close the warning modal
        onClose(); // Proceed to close the quiz modal
    };


    // --- Render Functions ---

    const renderQuestion = () => {
        const question = shuffledQuestions[currentQ];
        if(!question) return null;

        // Determine if inputs should be disabled (after answer or if teacher view)
        const isDisabled = currentQuestionAttempted || isTeacherView;

        return (
            <div>
                <div className="font-medium text-lg text-slate-800 mb-4">
                    <ContentRenderer text={question.question || question.text} />
                </div>
                {question.type === 'multiple-choice' ? (
                    <div className="space-y-3">
                        {question.options.map((option, idx) => (
                            <label key={idx} className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200
                                ${isDisabled ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 hover:bg-blue-50 cursor-pointer'}`}>
                                <input type="radio" name={`question-${currentQ}`} checked={userAnswers[currentQ] === idx} onChange={() => handleAnswer(idx)} disabled={isDisabled}
                                    className="form-radio h-5 w-5 text-blue-600 border-blue-300 focus:ring-blue-500" />
                                <span className="text-base text-slate-700"><ContentRenderer text={option.text || option} /></span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <>
                        <TextInput placeholder="Type your answer" value={userAnswers[currentQ] || ''} onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })} disabled={isDisabled}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" />
                        {!isDisabled && (question.type === 'identification' || question.type === 'exactAnswer') && (
                            <Button onClick={() => handleAnswer(userAnswers[currentQ] || '')} className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-300">Submit Answer</Button>
                        )}
                    </>
                )}
            </div>
        );
    };

    // NEW: Function to render feedback and explanation after answering - VISUALLY ENHANCED
    const renderQuestionFeedback = () => {
        const question = shuffledQuestions[currentQ];
        if (!question) return null;

        const isCorrect = questionResult === 'correct';
        const userAnswerText = question.type === 'multiple-choice'
            ? (question.options[userAnswers[currentQ]]?.text ?? 'No Answer')
            : (userAnswers[currentQ] || 'No answer');
        const correctAnswerText = question.type === 'multiple-choice'
            ? question.options[question.correctAnswerIndex]?.text
            : question.correctAnswer;

        return (
            <div className={`p-6 rounded-2xl border-l-4 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} shadow-lg transition-all duration-300`}>
                <div className="flex items-center gap-3 mb-4">
                    {isCorrect ? <CheckCircleIcon className="h-8 w-8 text-green-600" /> : <XCircleIcon className="h-8 w-8 text-red-600" />}
                    <Title className={`text-2xl font-extrabold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {isCorrect ? "Correct Answer!" : "Incorrect Answer"}
                    </Title>
                </div>

                <div className="text-sm text-gray-700 space-y-2">
                    <p><span className="font-semibold text-gray-800">Your Answer:</span> <ContentRenderer text={userAnswerText} /></p>
                    {!isCorrect && (
                        <p><span className="font-semibold text-gray-800">Correct Answer:</span> <ContentRenderer text={correctAnswerText} /></p>
                    )}
                </div>

                {question.explanation && (
                    <div className="mt-5 pt-5 border-t border-gray-300">
                        <div className="flex items-start gap-3">
                            <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-blue-700 mb-1">Explanation:</h4>
                                <div className="text-sm text-gray-700"><ContentRenderer text={question.explanation} /></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    const renderResults = () => (
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-5 animate-scale-in" />
            <Title className="text-3xl font-extrabold text-gray-900 mb-2">Quiz Submitted!</Title>
            <p className="text-xl mt-2 text-gray-700">You scored <strong className="text-green-600 text-3xl">{score}</strong> out of <strong className="text-gray-900 text-3xl">{totalQuestions}</strong></p>
            { (3 - (attemptsTaken)) > 0 ? (
                <p className="text-lg mt-4 text-gray-600">You have <strong>{3 - attemptsTaken}</strong> attempt(s) left.</p>
            ) : (
                <p className="text-lg mt-4 text-red-600 font-semibold">You have used all 3 attempts.</p>
            )}
            <Button icon={ClipboardDocumentListIcon} onClick={() => setShowReview(true)} className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-300">
                Review Your Answers
            </Button>
        </div>
    );

    const renderReview = () => {
        console.log("renderReview called. Checking explanations for all shuffled questions:", shuffledQuestions.map(q => q.explanation ? '✅' : '❌'));
        return (
            <div>
                <Title className="text-2xl font-extrabold text-gray-900 mb-5">Review Your Answers</Title>
                <div className="space-y-6 mt-4 max-h-[400px] overflow-y-auto pr-2">
                    {shuffledQuestions.map((q, index) => {
                        const userAnswer = userAnswers[index];
                        let isCorrect = false;
                        if (q.type === 'multiple-choice') isCorrect = userAnswer === q.correctAnswerIndex;
                        else if (q.type === 'identification' || q.type === 'exactAnswer') {
                            const formattedUserAnswer = String(userAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                            const formattedCorrectAnswer = String(q.correctAnswer || '').toLowerCase().trim();
                            isCorrect = formattedUserAnswer === formattedCorrectAnswer;
                        }

                        return (
                            <div key={index} className={`p-5 rounded-xl border-l-4 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} shadow-sm`}>
                                <div className="font-bold text-lg text-slate-800 mb-2 flex items-start">
                                    {isCorrect ? <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" /> : <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />}
                                    <ContentRenderer text={q.question || q.text} />
                                </div>
                                <p className="text-sm text-gray-700">Your answer: <span className="font-semibold">{q.type === 'multiple-choice' ? (q.options[userAnswer]?.text ?? 'No Answer') : (userAnswer || 'No answer')}</span></p>
                                {!isCorrect && <p className="text-sm text-gray-700">Correct answer: <span className="font-semibold">{q.type === 'multiple-choice' ? q.options[q.correctAnswerIndex]?.text : q.correctAnswer}</span></p>}
                                {q.explanation && (
                                    <div className="mt-3 pt-3 border-t border-gray-300">
                                        <div className="flex items-start gap-2">
                                            <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            <div className="text-sm text-gray-700"><ContentRenderer text={q.explanation} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <Button onClick={() => setShowReview(false)} className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-300">Back to Score</Button>
            </div>
        );
    };
    
    const renderSystemLockedView = () => (
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <LockClosedIcon className="h-20 w-20 text-gray-700 mx-auto mb-5 animate-bounce-slow" />
            <Title className="text-3xl font-extrabold text-gray-900 mb-2">Quiz Locked</Title>
            <p className="text-lg mt-2 text-gray-600">This quiz has been locked due to multiple warnings.</p>
            <p className="text-md mt-1 text-gray-600">Please contact your teacher to have it unlocked.</p>
        </div>
    );

    const renderNoAttemptsLeftView = () => (
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <LockClosedIcon className="h-20 w-20 text-red-500 mx-auto mb-5 animate-bounce-slow" />
            <Title className="text-3xl font-extrabold text-gray-900 mb-2">No Attempts Remaining</Title>
            <p className="text-lg mt-2 text-gray-600">You have used all {MAX_WARNINGS} of your attempts for this quiz.</p>
            {latestSubmission && <p className="text-2xl font-bold mt-4">Your last score was <strong className="text-red-600">{latestSubmission.score}</strong> out of <strong className="text-gray-900">{latestSubmission.totalItems}</strong></p>}
            <Button icon={ClipboardDocumentListIcon} onClick={() => setShowReview(true)} className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-300">
                Review Your Answers
            </Button>
        </div>
    );
    

    const renderContent = () => {
        if (loading) return <Spinner />;
        if (isTeacherView) return renderTeacherPreview(); // Teachers always see preview
        if (isLocked) return renderSystemLockedView(); // Locked view for students

        // Student View Logic
        if (!hasAttemptsLeft) return renderNoAttemptsLeftView(); // No attempts left for students
        if (score !== null) return showReview ? renderReview() : renderResults(); // Student submitted
        
        // Immediate feedback after answering a question
        if (questionResult) return renderQuestionFeedback();

        return renderQuestion(); // Student taking quiz, no answer clicked yet
    }

    // Teacher Preview specific render function
    const renderTeacherPreview = () => {
        const currentQuestionData = shuffledQuestions[currentQ];
        return (
            <div className="flex flex-col h-full">
                <div className="flex-grow overflow-y-auto">
                    {currentQuestionData ? (
                            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                                <div className="font-semibold flex items-start text-lg">
                                    <span>{currentQ + 1}.&nbsp;</span>
                                    <ContentRenderer text={currentQuestionData.text} />
                                </div>
                                
                                <div className="mt-4 space-y-2">
                                    {currentQuestionData.type === 'multiple-choice' && currentQuestionData.options?.map((option, idx) => (
                                        <div key={idx} className={`flex items-center p-2 rounded-md text-sm ${option.isCorrect ? 'bg-green-100 text-green-800 font-semibold ring-1 ring-green-300' : 'bg-gray-100'}`}>
                                            {option.isCorrect && <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />}
                                            <ContentRenderer text={option.text} />
                                        </div>
                                    ))}
                                    {currentQuestionData.type === 'true-false' && (
                                        <>
                                            <div className={`flex items-center p-2 rounded-md text-sm ${currentQuestionData.correctAnswer === true ? 'bg-green-100 text-green-800 font-semibold ring-1 ring-green-300' : 'bg-gray-100'}`}>
                                                {currentQuestionData.correctAnswer === true && <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />}
                                                True
                                            </div>
                                            <div className={`flex items-center p-2 rounded-md text-sm ${currentQuestionData.correctAnswer === false ? 'bg-green-100 text-green-800 font-semibold ring-1 ring-green-300' : 'bg-gray-100'}`}>
                                                {currentQuestionData.correctAnswer === false && <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />}
                                                False
                                            </div>
                                        </>
                                    )}
                                    {currentQuestionData.type === 'identification' && (
                                        <div className="flex items-center p-2 rounded-md text-sm bg-green-100 text-green-800 font-semibold ring-1 ring-green-300">
                                            <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
                                            Correct Answer: <ContentRenderer text={currentQuestionData.correctAnswer} />
                                        </div>
                                    )}
                                </div>
                                
                                {currentQuestionData.explanation && (
                                    <div className="mt-4 pt-3 border-t">
                                        <div className="flex items-start">
                                            <InformationCircleIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-gray-700">
                                                <ContentRenderer text={currentQuestionData.explanation} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                    ) : (
                        <p className="text-center text-gray-500">This quiz has no questions.</p>
                    )}
                </div>
                 <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t">
                    <Button icon={ArrowLeftIcon} onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0}>Previous</Button>
                    <span className="text-sm font-medium text-gray-600">Question {currentQ + 1} of {totalQuestions}</span>
                    <Button icon={ArrowRightIcon} iconPosition="right" onClick={() => setCurrentQ(prev => Math.min(totalQuestions - 1, prev + 1))} disabled={currentQ === totalQuestions - 1}>Next</Button>
                </div>
            </div>
        );
    };


    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
                <DialogPanel className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-white to-gray-50 p-8 shadow-2xl border border-gray-100 transition-all duration-300 transform scale-100 opacity-100">
                    <div className="flex justify-between items-start mb-6">
                        <Title className="text-3xl font-extrabold text-gray-900 leading-tight">{quiz?.title}</Title>
                        {/* Show warnings only if it's a student view AND not locked/submitted */}
                        {!isTeacherView && classId && !isLocked && score === null && (
                            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full border border-yellow-200 shadow-sm animate-pulse-subtle">
                                <ShieldExclamationIcon className="w-5 h-5 text-yellow-600"/>
                                <span className="text-sm font-semibold">Warnings: {warnings} / {MAX_WARNINGS}</span>
                            </div>
                        )}
                    </div>
                    {/* Added a distinct banner for teacher view */}
                    {isTeacherView && (
                        <p className="teacher-preview-banner text-center text-sm font-semibold text-blue-700 bg-blue-100 p-2 rounded-md mb-6 border border-blue-200 shadow-sm">
                            Teacher Preview - Anti-cheating features are disabled.
                        </p>
                    )}
                    <div className="min-h-[250px] mb-6">
                        {renderContent()}
                    </div>
                    {/* Controls for students - only show if not locked, not submitted, and not teacher view */}
                    {hasAttemptsLeft && score === null && !isLocked && !isTeacherView && currentQuestionAttempted && (
                        <div className="flex-shrink-0 flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
                            <Button
                                icon={ArrowLeftIcon}
                                onClick={() => setCurrentQ(currentQ - 1)}
                                disabled={currentQ === 0}
                                className="bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-xl hover:bg-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                Previous
                            </Button>
                            <div className="text-center">
                                <span className="text-base font-medium text-gray-600">{`Question ${currentQ + 1} of ${totalQuestions}`}</span>
                                <span className="block text-xs text-gray-500 mt-1">Attempt {attemptsTaken + 1} of {MAX_WARNINGS}</span>
                            </div>
                            {currentQ < totalQuestions - 1 ? (
                                <Button
                                    icon={ArrowRightIcon}
                                    iconPosition="right"
                                    onClick={handleNextQuestion}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    className="bg-gradient-to-r from-green-600 to-teal-700 text-white font-bold py-2.5 px-5 rounded-xl hover:from-green-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                    Submit Quiz
                                </Button>
                            )}
                        </div>
                    )}
                    {/* General close button - behavior depends on context */}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="secondary"
                            onClick={handleClose}
                            className="bg-red-500 text-white font-semibold py-2.5 px-5 rounded-xl hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            Close
                        </Button>
                    </div>
                </DialogPanel>
            </Dialog>

            <QuizWarningModal
                isOpen={showWarningModal}
                warnings={warnings}
                maxWarnings={MAX_WARNINGS}
                onStay={handleStayInQuiz}
                onLeave={handleLeaveQuiz}
                isLocked={isLocked} // Pass the locked status
            />
        </>
    );
}
