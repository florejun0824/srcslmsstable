import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid';
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

    // Anti-cheating useEffect
    useEffect(() => {
        const handleFocusLoss = async () => {
            if (!isOpen || hasSubmitted.current || isLocked || !classId || finalScore !== null) {
                return;
            }
            const newWarningCount = warnings + 1;
            setWarnings(newWarningCount);
            if (newWarningCount >= 3) {
                alert("Warning 3: Your quiz has been locked due to multiple warnings. Please contact your teacher.");
                const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                await setDoc(lockRef, {
                    quizId: quiz.id, studentId: userProfile.id,
                    studentName: `${userProfile.firstName} ${userProfile.lastName}`,
                    classId: classId, lockedAt: serverTimestamp(),
                });
                setIsLocked(true);
            } else {
                alert(`Warning ${newWarningCount}: Navigating away from the quiz is not allowed.`);
            }
        };
        window.addEventListener('blur', handleFocusLoss);
        return () => window.removeEventListener('blur', handleFocusLoss);
    }, [isOpen, warnings, isLocked, quiz, userProfile, classId, finalScore]);

    const fetchQuizStatus = useCallback(async () => {
        if (!quiz?.id || !userProfile?.id) { setLoading(false); return; }
        if (classId) {
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
        } else {
            setLoading(false);
        }
    }, [quiz, userProfile, classId]);

    useEffect(() => {
        if (isOpen) {
            setCurrentQ(0);
            setUserAnswers({});
            setFinalScore(null);
            setQuestionResult(null);
            setTempScore(0);
            setWarnings(0);
            setIsLocked(false);
            hasSubmitted.current = false;
            fetchQuizStatus();
        }
    }, [isOpen, fetchQuizStatus]);

    if (!quiz) return null;

    const questions = quiz.questions || [];
    const totalQuestions = questions.length;
    const hasAttemptsLeft = classId ? attemptsTaken < 3 : true;

    const handleAnswer = (answer) => {
        if (questionResult) return; 

        setUserAnswers({ ...userAnswers, [currentQ]: answer });
        const question = questions[currentQ];
        let isCorrect = false;

        if (question.type === 'multiple-choice') {
            isCorrect = (answer === question.correctAnswerIndex);
        } else if (question.type === 'true-false') {
            isCorrect = (answer === question.correctAnswer);
        } else if (question.type === 'identification') {
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

    const handleSubmit = async () => {
        if (!classId) { alert("This is a preview only."); return; }
        if (hasSubmitted.current) return;
        hasSubmitted.current = true;
        if (!hasAttemptsLeft) { alert("You have used all 3 attempts."); return; }
        
        setFinalScore(tempScore);

        try {
            const submissionRef = doc(collection(db, 'quizSubmissions'));
            await setDoc(submissionRef, {
                quizId: quiz.id, quizTitle: quiz.title, studentId: userProfile.id,
                studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId,
                score: tempScore, totalItems: totalQuestions, attemptNumber: attemptsTaken + 1,
                submittedAt: serverTimestamp(), status: 'completed',
            });
            await fetchQuizStatus();
        } catch (error) {
            console.error("Error saving submission:", error);
        }
    };

    const renderQuestion = () => {
        const question = questions[currentQ];
        if (!question) return null;

        return (
            <div>
                <p className="font-medium mb-4">{question.text}</p>
                
                {question.type === 'multiple-choice' && (
                    <div className="space-y-3">
                        {question.options?.map((option, idx) => (
                            <div key={idx} onClick={() => handleAnswer(idx)} className="w-full p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-50">
                                {option}
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
        const question = questions[currentQ];
        const isCorrect = questionResult === 'correct';

        return (
            <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <div className="flex items-center gap-2">
                    {isCorrect ? <CheckCircleIcon className="h-6 w-6 text-green-500" /> : <XCircleIcon className="h-6 w-6 text-red-500" />}
                    <Title className={isCorrect ? 'text-green-700' : 'text-red-700'}>{isCorrect ? "Correct!" : "Incorrect"}</Title>
                </div>
                <p className="mt-2 text-gray-700 text-sm">{question.explanation}</p>
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
            const currentQuestionData = questions[currentQ];
            return (
                <div className="flex flex-col h-full">
                    <div className="flex-grow overflow-y-auto">
                        <p className="text-center text-sm text-blue-600 bg-blue-50 p-2 rounded-md mb-4">This is a teacher preview.</p>
                        {currentQuestionData ? (
                             <div className="mb-4 p-4 border rounded-lg">
                                <p className="font-semibold">{currentQ + 1}. {currentQuestionData.text}</p>
                                
                                <div className="mt-4 space-y-2">
                                    {currentQuestionData.type === 'multiple-choice' && currentQuestionData.options?.map((option, idx) => (
                                        <div key={idx} className={`flex items-center p-2 rounded-md text-sm ${idx === currentQuestionData.correctAnswerIndex ? 'bg-green-100 text-green-800 font-semibold ring-1 ring-green-300' : 'bg-gray-100'}`}>
                                            {idx === currentQuestionData.correctAnswerIndex && <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />}
                                            {option}
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
                                    {/* ✅ CORRECTION: Displays the correct answer for identification questions */}
                                    {currentQuestionData.type === 'identification' && (
                                        <div className="flex items-center p-2 rounded-md text-sm bg-green-100 text-green-800 font-semibold ring-1 ring-green-300">
                                            <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
                                            Correct Answer: {currentQuestionData.correctAnswer}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-4 pt-2 border-t text-sm text-gray-600">
                                    <p><strong>Explanation:</strong> {currentQuestionData.explanation || 'No explanation provided.'}</p>
                                </div>
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
        <Dialog open={isOpen} onClose={onClose} static={true} className="z-[100]">
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
                    <Button variant="primary" onClick={onClose}>Close</Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}
