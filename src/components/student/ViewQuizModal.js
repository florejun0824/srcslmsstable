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


export default function ViewQuizModal({ isOpen, onClose, quiz, userProfile, classId }) {
    const [currentQ, setCurrentQ] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [latestSubmission, setLatestSubmission] = useState(null);
    const [attemptsTaken, setAttemptsTaken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);

    // --- Security State ---
    const [warnings, setWarnings] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const hasSubmitted = useRef(false);
    const [showWarningModal, setShowWarningModal] = useState(false); // NEW: State for warning modal visibility
    const MAX_WARNINGS = 3; // Define max warnings

    // --- Security Keys ---
    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}`;

    // --- Security Functions ---
    const issueWarning = useCallback(async () => {
        console.log("issueWarning called. Current state:", { isLocked, score, showReview, warnings });
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
    }, [warnings, warningKey, quiz, userProfile, classId, isLocked, score, showReview]);

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

        setScore(correctCount);
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

    // --- Security Hooks ---
    useEffect(() => { // Mobile App State Change (Capacitor)
        let listener;
        if (isOpen && Capacitor.isNativePlatform() && score === null && !isLocked) {
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
    }, [isOpen, score, isLocked, issueWarning]);

    useEffect(() => { // Loosing Tab Focus (Blur)
        const handleFocusLoss = () => {
            console.log("Window blur detected. Current state:", { isOpen, hasSubmitted: hasSubmitted.current, isLocked, classId, score, showReview });
            // Only issue warning if quiz is open, not submitted, not locked, and not in review mode
            if (!isOpen || hasSubmitted.current || isLocked || !classId || score !== null || showReview) {
                console.log("Blur warning prevented by conditions.");
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
    }, [isOpen, isLocked, score, classId, issueWarning, showReview]);

    useEffect(() => { // Page Refresh/Close (beforeunload)
        const handleBeforeUnload = (event) => {
            console.log("Beforeunload event detected. Current state:", { isOpen, classId, isLocked, score, hasSubmitted: hasSubmitted.current });
            if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current) {
                // For modern browsers, this message might not be displayed to the user
                // but prevents the tab from closing immediately without confirmation.
                event.preventDefault();
                event.returnValue = 'You are attempting to leave the quiz. This will result in a warning.';
                // Issue warning on close attempt (though user still has option to close)
                issueWarning();
                console.log("Beforeunload: quiz conditions met for warning. Preventing default close.");
                return ''; // Required for some browsers to show the prompt
            }
            console.log("Beforeunload: conditions not met for warning or quiz submitted/locked.");
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        console.log("Added window beforeunload listener.");
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            console.log("Removed window beforeunload listener.");
        };
    }, [isOpen, classId, isLocked, score, issueWarning]);


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
            setScore(null);
            setShowReview(false);
            hasSubmitted.current = false;
            
            // Initialize security features
            const savedWarnings = localStorage.getItem(warningKey);
            const initialWarnings = savedWarnings ? parseInt(savedWarnings, 10) : 0;
            setWarnings(initialWarnings);
            console.log("Initial warnings from localStorage:", initialWarnings);
            
            // Check if quiz is already locked from a previous session
            const checkLockStatus = async () => {
                const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                const lockSnap = await getDoc(lockRef);
                if (lockSnap.exists() || initialWarnings >= MAX_WARNINGS) {
                    setIsLocked(true);
                    console.log("Quiz initialized as LOCKED based on Firestore or saved warnings.");
                } else {
                    setIsLocked(false);
                    console.log("Quiz initialized as UNLOCKED.");
                }
            };
            checkLockStatus();

            const savedShuffle = localStorage.getItem(shuffleKey);
            // Ensure shuffled questions match current quiz questions length to prevent re-shuffling on re-open if quiz content changed
            if (savedShuffle && JSON.parse(savedShuffle).length === (quiz.questions || []).length) {
                setShuffledQuestions(JSON.parse(savedShuffle));
                console.log("Loaded shuffled questions from localStorage.");
            } else {
                const newShuffled = shuffleArray(quiz.questions || []);
                setShuffledQuestions(newShuffled);
                localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
                console.log("Generated and saved new shuffled questions.");
            }
            
            fetchSubmission();
        } else {
            // Cleanup when modal closes (e.g., if user clicks outside after warning, or submits)
            setShowWarningModal(false); // Ensure warning modal is closed when main quiz modal closes
            console.log("ViewQuizModal is closing. Resetting warning modal state.");
        }
    }, [isOpen, quiz, warningKey, shuffleKey, fetchSubmission, userProfile]);


    const totalQuestions = shuffledQuestions.length;
    const hasAttemptsLeft = attemptsTaken < MAX_WARNINGS; // Assuming 3 attempts total for a normal quiz

    const handleClose = () => {
        console.log("handleClose (main quiz modal close button) called. Current state:", { isOpen, classId, isLocked, score, hasSubmitted: hasSubmitted.current });
        // Only trigger warning modal if quiz is active and not yet submitted/locked
        if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current) {
            setShowWarningModal(true);
            console.log("handleClose: Triggering warning modal.");
        } else {
            // If already submitted, locked, or no active quiz, just close
            console.log("handleClose: Conditions not met for warning. Closing quiz modal.");
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
        return (
            <div>
                <div className="font-medium mb-2">
                    <ContentRenderer text={question.question || question.text} />
                </div>
                {question.type === 'multiple-choice' ? (
                    <div className="space-y-2">
                        {question.options.map((option, idx) => (
                            <label key={idx} className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                                <input type="radio" name={`question-${currentQ}`} checked={userAnswers[currentQ] === idx} onChange={() => setUserAnswers({ ...userAnswers, [currentQ]: idx })} />
                                <span><ContentRenderer text={option.text || option} /></span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <TextInput placeholder="Type your answer" value={userAnswers[currentQ] || ''} onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })} />
                )}
            </div>
        );
    };

    const renderResults = () => (
        <div className="text-center p-6">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <Title className="text-2xl font-bold">Quiz Submitted!</Title>
            <p className="text-lg mt-2">You scored <strong>{score}</strong> out of <strong>{totalQuestions}</strong></p>
            { (3 - (attemptsTaken)) > 0 ? (
                <p className="text-md mt-4 text-gray-700">You have <strong>{3 - attemptsTaken}</strong> attempt(s) left.</p>
            ) : (
                <p className="text-md mt-4 text-red-600 font-semibold">You have used all your attempts.</p>
            )}
            <Button icon={ClipboardDocumentListIcon} onClick={() => setShowReview(true)} className="mt-6">
                Review Answers
            </Button>
        </div>
    );

    const renderReview = () => (
        <div>
            <Title>Review Your Answers</Title>
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
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                            <div className="font-bold mb-2"><ContentRenderer text={q.question || q.text} /></div>
                            <p className="text-sm">Your answer: <span className="font-semibold">{q.type === 'multiple-choice' ? (q.options[userAnswer]?.text ?? 'No Answer') : (userAnswer || 'No answer')}</span></p>
                            {!isCorrect && <p className="text-sm">Correct answer: <span className="font-semibold">{q.type === 'multiple-choice' ? q.options[q.correctAnswerIndex]?.text : q.correctAnswer}</span></p>}
                            {q.explanation && (
                                <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="flex items-start">
                                        <InformationCircleIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-gray-700"><ContentRenderer text={q.explanation} /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <Button onClick={() => setShowReview(false)} className="mt-4">Back to Score</Button>
        </div>
    );
    
    const renderSystemLockedView = () => (
        <div className="text-center p-8">
            <LockClosedIcon className="h-16 w-16 text-gray-700 mx-auto mb-4" />
            <Title>Quiz Locked</Title>
            <p className="text-lg mt-2 text-gray-600">This quiz has been locked due to multiple warnings.</p>
            <p className="text-md mt-1 text-gray-600">Please contact your teacher to have it unlocked.</p>
        </div>
    );

    const renderNoAttemptsLeftView = () => (
        <div className="text-center p-8">
            <LockClosedIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <Title>No Attempts Remaining</Title>
            <p className="text-lg mt-2 text-gray-600">You have used all 3 of your attempts for this quiz.</p>
            {latestSubmission && <p className="text-2xl font-bold mt-4">Your last score was {latestSubmission.score} out of {latestSubmission.totalItems}</p>}
        </div>
    );
    

    const renderContent = () => {
        if (loading) return <Spinner />;
        if (isLocked) return renderSystemLockedView();
        if (!hasAttemptsLeft && !isLocked) return renderNoAttemptsLeftView();
        if (score !== null) return showReview ? renderReview() : renderResults();
        return renderQuestion();
    }

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
                <DialogPanel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                    <div className="flex justify-between items-start">
                        <Title className="mb-4">{quiz?.title}</Title>
                        {classId && !isLocked && hasAttemptsLeft && score === null && (
                            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full">
                                <ShieldExclamationIcon className="w-5 h-5"/>
                                <span className="text-sm font-medium">Warnings: {warnings} / {MAX_WARNINGS}</span>
                            </div>
                        )}
                    </div>
                    <div className="min-h-[250px]">
                        {renderContent()}
                    </div>
                    {hasAttemptsLeft && score === null && !isLocked &&(
                        <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t">
                            <Button icon={ArrowLeftIcon} onClick={() => setCurrentQ(currentQ - 1)} disabled={currentQ === 0}>Previous</Button>
                            <div className="text-center">
                                <span className="text-sm font-medium text-gray-600">{`Question ${currentQ + 1} of ${totalQuestions}`}</span>
                                <span className="block text-xs text-gray-500">Attempt {attemptsTaken + 1} of 3</span>
                            </div>
                            {currentQ < totalQuestions - 1 ? (
                                <Button icon={ArrowRightIcon} iconPosition="right" onClick={() => setCurrentQ(currentQ + 1)}>Next</Button>
                            ) : (
                                <Button onClick={handleSubmit}>Submit Quiz</Button>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="primary" onClick={handleClose}>Close</Button>
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
