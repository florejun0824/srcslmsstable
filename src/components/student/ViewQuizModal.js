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
} from 'firebase/firestore';
import Spinner from '../common/Spinner';
import ContentRenderer from './ContentRenderer';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

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

    // --- Security Keys ---
    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}`;

    // --- Security Functions ---
    const issueWarning = useCallback(async () => {
        const newWarningCount = warnings + 1;
        setWarnings(newWarningCount);
        localStorage.setItem(warningKey, newWarningCount.toString());

        if (newWarningCount >= 3) {
            const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
            await setDoc(lockRef, {
                quizId: quiz.id, studentId: userProfile.id,
                studentName: `${userProfile.firstName} ${userProfile.lastName}`,
                classId: classId, lockedAt: serverTimestamp(),
            });
            setIsLocked(true);
        } else {
            alert(`Warning ${newWarningCount}: Navigating away or closing the quiz is not allowed.`);
        }
    }, [warnings, warningKey, quiz, userProfile, classId]);

    const handleSubmit = useCallback(async () => {
        if (hasSubmitted.current || score !== null) return;
        hasSubmitted.current = true;

        let correctCount = 0;
        shuffledQuestions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            if (q.type === 'multiple-choice' && userAnswer === q.correctAnswerIndex) correctCount++;
            else if (q.type === 'identification' || q.type === 'exactAnswer') {
                const formattedUserAnswer = String(userAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                const formattedCorrectAnswer = String(q.correctAnswer || '').toLowerCase().trim();
                if (formattedUserAnswer === formattedCorrectAnswer) correctCount++;
            }
        });

        setScore(correctCount);

        // Clear security keys from storage upon successful submission
        localStorage.removeItem(warningKey);
        localStorage.removeItem(shuffleKey);

        try {
            const submissionRef = doc(collection(db, 'quizSubmissions'));
            await setDoc(submissionRef, {
                quizId: quiz.id, quizTitle: quiz.title, studentId: userProfile.id,
                studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId,
                score: correctCount, totalItems: shuffledQuestions.length, attemptNumber: attemptsTaken + 1,
                submittedAt: serverTimestamp(),
            });
            await fetchSubmission(); // Refresh submission data
        } catch (error) {
            console.error("Error saving submission:", error);
        }
    }, [userAnswers, score, shuffledQuestions, quiz, userProfile, classId, attemptsTaken, warningKey, shuffleKey]);

    // --- Security Hooks ---
    useEffect(() => { // Mobile App State Change
        if (isOpen && Capacitor.isNativePlatform() && score === null && !isLocked) {
            const listener = App.addListener('appStateChange', ({ isActive }) => {
                // ✅ CHANGED: Instead of submitting, it now issues a warning.
                if (!isActive) {
                    issueWarning();
                }
            });
            return () => { listener.remove(); };
        }
    }, [isOpen, score, isLocked, issueWarning]); // ✅ ADDED: Dependency updated to issueWarning

    useEffect(() => { // Loosing Tab Focus (Blur)
        const handleFocusLoss = () => {
            if (!isOpen || hasSubmitted.current || isLocked || !classId || score !== null) return;
            issueWarning();
        };
        window.addEventListener('blur', handleFocusLoss);
        return () => window.removeEventListener('blur', handleFocusLoss);
    }, [isOpen, isLocked, score, classId, issueWarning]);

    useEffect(() => { // Page Refresh/Close
        const handleBeforeUnload = (event) => {
            if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current) {
                event.preventDefault();
                event.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, classId, isLocked, score]);


    const fetchSubmission = useCallback(async () => {
        if (!quiz?.id || !userProfile?.id || !classId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
        const lockSnap = await getDoc(lockRef);
        if (lockSnap.exists()) setIsLocked(true);

        const submissionsRef = collection(db, 'quizSubmissions');
        const q = query(submissionsRef, where("quizId", "==", quiz.id), where("studentId", "==", userProfile.id), where("classId", "==", classId));
        const querySnapshot = await getDocs(q);
        const submissions = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        submissions.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        
        setLatestSubmission(submissions[0] || null);
        setAttemptsTaken(submissions.length);
        setLoading(false);
    }, [quiz, userProfile, classId]);

    useEffect(() => {
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
            if (initialWarnings >= 3) setIsLocked(true);

            const savedShuffle = localStorage.getItem(shuffleKey);
            if (savedShuffle) {
                setShuffledQuestions(JSON.parse(savedShuffle));
            } else {
                const newShuffled = shuffleArray(quiz.questions || []);
                setShuffledQuestions(newShuffled);
                localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
            }
            
            fetchSubmission();
        }
    }, [isOpen, quiz, warningKey, shuffleKey, fetchSubmission]);

    const totalQuestions = shuffledQuestions.length;
    const hasAttemptsLeft = attemptsTaken < 3;

    const handleClose = () => {
        if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current) {
            issueWarning();
        }
        onClose();
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
                            <div className="text-sm space-y-1">
                                <p>Your answer: <span className="font-semibold">{q.type === 'multiple-choice' ? (q.options[userAnswer]?.text ?? 'No Answer') : (userAnswer || 'No answer')}</span></p>
                                {!isCorrect && <p>Correct answer: <span className="font-semibold">{q.type === 'multiple-choice' ? q.options[q.correctAnswerIndex]?.text : q.correctAnswer}</span></p>}
                            </div>
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
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                <div className="flex justify-between items-start">
                    <Title className="mb-4">{quiz?.title}</Title>
                    {classId && !isLocked && hasAttemptsLeft && score === null && (
                        <div className="flex items-center gap-2 text-yellow-600 bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full">
                            <ShieldExclamationIcon className="w-5 h-5"/>
                            <span className="text-sm font-medium">Warnings: {warnings} / 3</span>
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
    );
}