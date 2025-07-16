import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, LockClosedIcon, ShieldExclamationIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import Spinner from '../common/Spinner';
import ContentRenderer from './ContentRenderer';
// ✅ ADDED: Imports for mobile app security
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
    const [finalScore, setFinalScore] = useState(null);
    const [latestSubmission, setLatestSubmission] = useState(null);
    const [attemptsTaken, setAttemptsTaken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [warnings, setWarnings] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const hasSubmitted = useRef(false);
    const [questionResult, setQuestionResult] = useState(null);
    const [tempScore, setTempScore] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);

    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}`;

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
        if (!classId || hasSubmitted.current) { return; }
        
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
        
        setFinalScore(correctCount);
        
        localStorage.removeItem(warningKey);
        localStorage.removeItem(shuffleKey);

        try {
            const submissionRef = doc(collection(db, 'quizSubmissions'));
            await setDoc(submissionRef, {
                quizId: quiz.id, quizTitle: quiz.title, studentId: userProfile.id,
                studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId,
                score: correctCount, totalItems: shuffledQuestions.length, attemptNumber: attemptsTaken + 1,
                submittedAt: serverTimestamp(), status: 'completed',
            });
            await fetchQuizStatus();
        } catch (error) {
            console.error("Error saving submission:", error);
        }
    }, [classId, hasSubmitted, shuffledQuestions, userAnswers, quiz, userProfile, attemptsTaken, warningKey, shuffleKey]);

    // ✅ ADDED: Mobile App security listener
    useEffect(() => {
        if (isOpen && Capacitor.isNativePlatform() && finalScore === null && !isLocked) {
            const listener = App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) {
                    console.log("App is inactive, submitting quiz.");
                    handleSubmit();
                }
            });
            return () => {
                listener.remove();
            };
        }
    }, [isOpen, finalScore, isLocked, handleSubmit]);

    useEffect(() => {
        const handleFocusLoss = () => {
            if (!isOpen || hasSubmitted.current || isLocked || !classId || finalScore !== null) {
                return;
            }
            issueWarning();
        };
        window.addEventListener('blur', handleFocusLoss);
        return () => window.removeEventListener('blur', handleFocusLoss);
    }, [isOpen, isLocked, finalScore, classId, issueWarning]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isOpen && classId && !isLocked && finalScore === null && !hasSubmitted.current) {
                event.preventDefault();
                event.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isOpen, classId, isLocked, finalScore]);

    useEffect(() => {
        if (isOpen) {
            setCurrentQ(0);
            setUserAnswers({});
            setFinalScore(null);
            setQuestionResult(null);
            setTempScore(0);
            hasSubmitted.current = false;
            
            if (classId) {
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
            } else {
                setShuffledQuestions(quiz.questions || []);
            }
            fetchQuizStatus();
        }
    }, [isOpen, classId, quiz?.questions, warningKey, shuffleKey]);


    const fetchQuizStatus = useCallback(async () => {
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
        const submissions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        submissions.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        setLatestSubmission(submissions[0] || null);
        setAttemptsTaken(submissions.length);
        setLoading(false);
    }, [quiz, userProfile, classId]);


    if (!quiz) return null;

    const totalQuestions = shuffledQuestions.length;
    const hasAttemptsLeft = classId ? attemptsTaken < 3 : true;

    const handleAnswer = (answer) => {
        if (questionResult) return;
        setUserAnswers({ ...userAnswers, [currentQ]: answer });
        const question = shuffledQuestions[currentQ];
        let isCorrect = false;

        if (question.type === 'multiple-choice') isCorrect = (answer === question.correctAnswerIndex);
        else if (question.type === 'true-false') isCorrect = (answer === question.correctAnswer);
        else if (question.type === 'identification') {
            const formattedUserAnswer = String(answer || '').toLowerCase().trim();
            const formattedCorrectAnswer = String(question.correctAnswer || '').toLowerCase().trim();
            isCorrect = (formattedUserAnswer === formattedCorrectAnswer);
        }

        if (isCorrect) {
            setTempScore(prev => prev + 1);
            setQuestionResult('correct');
        } else {
            setQuestionResult('incorrect');
        }
    };

    const handleNextQuestion = () => {
        if (currentQ < totalQuestions - 1) {
            setQuestionResult(null);
            setCurrentQ(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };
    
    const handleClose = () => {
        if (isOpen && classId && !isLocked && finalScore === null && !hasSubmitted.current) {
            issueWarning();
        }
        onClose();
    };

    // All render functions...
    const renderQuestion = () => {
        const question = shuffledQuestions[currentQ];
        if (!question) return null;

        return (
            <div>
                <div className="font-medium mb-4"><ContentRenderer text={question.text} /></div>
                
                {question.type === 'multiple-choice' && (
                    <div className="space-y-3">
                        {question.options?.map((option, idx) => (
                            <div key={idx} onClick={() => handleAnswer(idx)} className="w-full p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-50">
                                <ContentRenderer text={option.text} />
                            </div>
                        ))}
                    </div>
                )}
                {question.type === 'true-false' && (
                     <div className="space-y-3">
                        <div onClick={() => handleAnswer(true)} className="w-full p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-50">True</div>
                        <div onClick={() => handleAnswer(false)} className="w-full p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-50">False</div>
                    </div>
                )}
                {question.type === 'identification' && (
                    <form onSubmit={(e) => { e.preventDefault(); handleAnswer(userAnswers[currentQ] || ''); }}>
                        <TextInput placeholder="Type your answer" value={userAnswers[currentQ] || ''} onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })} />
                        <Button type="submit" className="mt-4 w-full">Submit Answer</Button>
                    </form>
                )}
            </div>
        );
    };

    const renderQuestionResult = () => {
        const question = shuffledQuestions[currentQ];
        const isCorrect = questionResult === 'correct';
    
        return (
            <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <div className="flex items-center gap-2">
                    {isCorrect ? <CheckCircleIcon className="h-6 w-6 text-green-500" /> : <XCircleIcon className="h-6 w-6 text-red-500" />}
                    <Title className={isCorrect ? 'text-green-700' : 'text-red-700'}>{isCorrect ? "Correct!" : "Incorrect"}</Title>
                </div>
                
                {!isCorrect && (
                    <p className="mt-2 text-red-700 text-sm">
                        Correct Answer: <span className="font-semibold">
                            {question.type === 'multiple-choice' ? question.options[question.correctAnswerIndex]?.text : String(question.correctAnswer)}
                        </span>
                    </p>
                )}
                
                {question.explanation && (
                    <div className="mt-3 pt-3 border-t">
                        <div className="flex items-start">
                            <InformationCircleIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-700"><ContentRenderer text={question.explanation} /></div>
                        </div>
                    </div>
                )}

                <Button onClick={handleNextQuestion} className="mt-4 w-full">
                    {currentQ < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
            </div>
        );
    };

    const renderResults = () => (
        <div className="text-center p-6">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <Title className="text-2xl font-bold">Quiz Submitted!</Title>
            <p className="text-lg mt-2">You scored <strong>{finalScore}</strong> out of <strong>{totalQuestions}</strong></p>
            {3 - (attemptsTaken) > 0 ? (
                <p className="text-md mt-4 text-gray-700">You have <strong>{3 - attemptsTaken}</strong> attempt(s) left.</p>
            ) : (
                <p className="text-md mt-4 text-red-600 font-semibold">You have used all 3 attempts.</p>
            )}
        </div>
    );

    const renderNoAttemptsLeftView = () => (
        <div className="text-center p-8">
            <LockClosedIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <Title>No Attempts Remaining</Title>
            <p className="text-lg mt-2 text-gray-600">You have used all 3 of your attempts for this quiz.</p>
            <p className="text-2xl font-bold mt-4">Your last score was {latestSubmission?.score} out of {latestSubmission?.totalItems}</p>
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

    const renderContent = () => {
        if (loading) return <Spinner />;
        if (isLocked) return renderSystemLockedView();

        if (!classId && !loading) {
            const currentQuestionData = shuffledQuestions[currentQ];
            return (
                <div className="flex flex-col h-full">
                    <div className="flex-grow overflow-y-auto">
                        <p className="text-center text-sm text-blue-600 bg-blue-50 p-2 rounded-md mb-4">This is a teacher preview.</p>
                        {currentQuestionData ? (
                                <div className="mb-4 p-4 border rounded-lg">
                                    <div className="font-semibold flex items-start">
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
                            <p>This quiz has no questions.</p>
                        )}
                    </div>
                     <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t">
                        <Button icon={ArrowLeftIcon} onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0}>Previous</Button>
                        <span className="text-sm font-medium text-gray-600">Question {currentQ + 1} of {totalQuestions}</span>
                        <Button icon={ArrowRightIcon} iconPosition="right" onClick={() => setCurrentQ(prev => Math.min(totalQuestions - 1, prev + 1))} disabled={currentQ === totalQuestions - 1}>Next</Button>
                    </div>
                </div>
            );
        }
        
        if (!hasAttemptsLeft) return renderNoAttemptsLeftView();
        if (finalScore !== null) return renderResults();
        if (totalQuestions === 0) return <p className="text-center text-gray-500">This quiz has no questions.</p>;
        
        if (questionResult) {
            return renderQuestionResult();
        } else {
            return renderQuestion();
        }
    }

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                <div className="flex justify-between items-start">
                    <Title className="mb-4">{quiz.title}</Title>
                    {classId && !isLocked && hasAttemptsLeft && finalScore === null && (
                        <div className="flex items-center gap-2 text-yellow-600 bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full">
                            <ShieldExclamationIcon className="w-5 h-5"/>
                            <span className="text-sm font-medium">Warnings: {warnings} / 3</span>
                        </div>
                    )}
                </div>
                <div className="min-h-[250px]">
                    {renderContent()}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="primary" onClick={handleClose}>Close</Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}