import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, LockClosedIcon, InformationCircleIcon, ClipboardDocumentListIcon, ShieldExclamationIcon, XCircleIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import ContentRenderer from './ContentRenderer';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import QuizWarningModal from '../../components/common/QuizWarningModal';
import localforage from 'localforage';
import { queueQuizSubmission, syncOfflineSubmissions } from '../../services/offlineSyncService';

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

// ✅ FIX: Updated props to accept onComplete for submissions
export default function ViewQuizModal({ isOpen, onClose, onComplete, quiz, userProfile, classId, isTeacherView = false }) {
    const [currentQ, setCurrentQ] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [latestSubmission, setLatestSubmission] = useState(null);
    const [attemptsTaken, setAttemptsTaken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);
    const [warnings, setWarnings] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const hasSubmitted = useRef(false);
    const justSubmitted = useRef(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const MAX_WARNINGS = 3;
    const [questionResult, setQuestionResult] = useState(null);
    const [currentQuestionAttempted, setCurrentQuestionAttempted] = useState(false);
    const warningKey = `quizWarnings_${quiz?.id}_${userProfile?.id}`;
    const shuffleKey = `quizShuffle_${quiz?.id}_${userProfile?.id}`;
    const { showToast } = useToast();

    const issueWarning = useCallback(async () => {
        if (isTeacherView || isLocked || score !== null || showReview) {
            return;
        }
        try {
            const newWarningCount = warnings + 1;
            setWarnings(newWarningCount);
            localStorage.setItem(warningKey, newWarningCount.toString());

            if (newWarningCount >= MAX_WARNINGS) {
                setIsLocked(true);
                setShowWarningModal(true);
                
                if (navigator.onLine) {
                    const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                    await setDoc(lockRef, {
                        quizId: quiz.id, studentId: userProfile.id,
                        studentName: `${userProfile.firstName} ${userProfile.lastName}`,
                        classId: classId, lockedAt: serverTimestamp(),
                        reason: 'Too many unauthorized attempts to navigate away'
                    });
                }
            } else {
                setShowWarningModal(true);
            }
        } catch (error) {
            console.error("Failed to issue warning:", error);
            showToast("Could not process warning. Please proceed.", "error");
        }
    }, [warnings, warningKey, quiz, userProfile, classId, isLocked, score, showReview, isTeacherView, showToast]);

	const handleSubmit = useCallback(async () => {
	    if (hasSubmitted.current || score !== null || isLocked) {
	        return;
	    }
	    hasSubmitted.current = true;
        justSubmitted.current = true;

	    let correctCount = 0;
	    shuffledQuestions.forEach((q, index) => {
	        const userAnswer = userAnswers[index];
	        if (q.type === 'multiple-choice' && userAnswer === q.correctAnswerIndex) correctCount++;
	        else if (q.type === 'identification' || q.type === 'exactAnswer') {
	            const formattedUserAnswer = String(userAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            const formattedCorrectAnswer = String(q.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            if (formattedUserAnswer === formattedCorrectAnswer) correctCount++;
	        } else if (q.type === 'true-false' && userAnswer === q.correctAnswer) {
                correctCount++;
            }
	    });

	    setScore(correctCount);
	    localStorage.removeItem(warningKey);
	    localStorage.removeItem(shuffleKey);
	    setWarnings(0);

	    try {
	        const submissionData = {
	            quizId: quiz.id,
	            quizTitle: quiz.title,
	            classId: classId,
                studentId: userProfile.id,
	            studentName: `${userProfile.firstName} ${userProfile.lastName}`,
	            answers: userAnswers,
	            score: correctCount,
	            totalItems: shuffledQuestions.length,
	            attemptNumber: attemptsTaken + 1,
	        };
            
	        await queueQuizSubmission(submissionData);
            
            setLatestSubmission({ ...submissionData, submittedAt: new Date() });
            setAttemptsTaken(prev => prev + 1);

	        showToast(
	            navigator.onLine 
	                ? "✅ Quiz submitted successfully!" 
	                : "📡 Quiz saved. It will sync when you’re back online.",
	            "success"
	        );

            if (navigator.onLine) {
                syncOfflineSubmissions();
            }
            
            // ✅ FIX: Call the new onComplete prop for successful submissions.
            if (onComplete) {
                onComplete();
            } else {
                onClose(); // Fallback to original onClose if onComplete is not provided
            }

	    } catch (error) {
	        console.error("Error queuing submission:", error);
	        showToast("❌ Could not save your quiz. Please try again.", "error");
	    }
	}, [userAnswers, score, shuffledQuestions, quiz, userProfile, classId, attemptsTaken, warningKey, shuffleKey, isLocked, showToast, onClose, onComplete]);
    
    const fetchSubmission = useCallback(async () => {
        if (!quiz?.id || !userProfile?.id || !classId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            let isDbLocked = false;
            let dbSubmissions = [];
            let localWarningCount = 0;
            
            const savedWarnings = localStorage.getItem(warningKey);
            if (savedWarnings) {
                localWarningCount = parseInt(savedWarnings, 10);
            }

            if (navigator.onLine) {
                const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                const lockSnap = await getDoc(lockRef);
                isDbLocked = lockSnap.exists();
                
                if (!isDbLocked && localWarningCount >= MAX_WARNINGS) {
                    localStorage.removeItem(warningKey);
                    setWarnings(0);
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
            const myOfflineAttempts = offlineSubmissions.filter(
                sub => sub.quizId === quiz.id && sub.studentId === userProfile.id && sub.classId === classId
            );
            
            const dbSubmissionIds = new Set(dbSubmissions.map(s => s.id));
            const uniqueOfflineAttempts = myOfflineAttempts.filter(s => !dbSubmissionIds.has(s.id));
            
            const totalAttempts = dbSubmissions.length + uniqueOfflineAttempts.length;

            setAttemptsTaken(totalAttempts);
            setLatestSubmission(dbSubmissions[0] || null);

        } catch (error) {
            console.error("Error fetching submission data:", error);
            showToast("❌ Could not load quiz data. Working with local data.", "error");
            const savedWarnings = localStorage.getItem(warningKey);
            setIsLocked(savedWarnings ? parseInt(savedWarnings, 10) >= MAX_WARNINGS : false);
        } finally {
            setLoading(false);
        }
    }, [quiz, userProfile, classId, warningKey, showToast]);


    useEffect(() => {
        let listener;
        if (isOpen && Capacitor.isNativePlatform() && score === null && !isLocked && !isTeacherView) {
            listener = App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) {
                    issueWarning();
                }
            });
        }
        return () => {
            listener?.remove();
        };
    }, [isOpen, score, isLocked, issueWarning, isTeacherView]);

    useEffect(() => {
        const handleFocusLoss = () => {
            if (!isOpen || hasSubmitted.current || isLocked || !classId || score !== null || showReview || isTeacherView) {
                return;
            }
            issueWarning();
        };
        window.addEventListener('blur', handleFocusLoss);
        return () => window.removeEventListener('blur', handleFocusLoss);
    }, [isOpen, isLocked, score, classId, issueWarning, showReview, isTeacherView]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView) {
                event.preventDefault();
                event.returnValue = 'You are attempting to leave the quiz. This will result in a warning.';
                issueWarning();
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, classId, isLocked, score, issueWarning, isTeacherView]);
    
    useEffect(() => {
        if (isOpen) {
            if (justSubmitted.current) {
                justSubmitted.current = false;
                return;
            }

            setCurrentQ(0);
            setUserAnswers({});
            setScore(null);
            setShowReview(false);
            hasSubmitted.current = false;
            setQuestionResult(null);
            setCurrentQuestionAttempted(false);
            
            if (!isTeacherView) {
                const savedWarnings = localStorage.getItem(warningKey);
                const initialWarnings = savedWarnings ? parseInt(savedWarnings, 10) : 0;
                setWarnings(initialWarnings);
                
                fetchSubmission();

                try {
                    const savedShuffle = localStorage.getItem(shuffleKey);
                    if (savedShuffle && JSON.parse(savedShuffle).length === (quiz.questions || []).length) {
                        setShuffledQuestions(JSON.parse(savedShuffle));
                    } else {
                        const newShuffled = shuffleArray(quiz.questions || []);
                        setShuffledQuestions(newShuffled);
                        localStorage.setItem(shuffleKey, JSON.stringify(newShuffled));
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
        }
    }, [isOpen, quiz, warningKey, shuffleKey, fetchSubmission, isTeacherView]);

    const handleExportPdf = () => {
        if (!quiz?.questions) {
            showToast("No quiz data to export.", "warning");
            return;
        }

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
                if (correctOption) {
                    correctAnswerText = correctOption.text || correctOption;
                } else if (q.correctAnswerIndex !== undefined) {
                    const correctOpt = q.options[q.correctAnswerIndex];
                    correctAnswerText = correctOpt?.text || correctOpt || 'N/A';
                } else {
                    correctAnswerText = 'N/A';
                }
            } else { 
                correctAnswerText = String(q.correctAnswer);
            }
            
            quizBody.push([i + 1, questionContent]);
            answerKey.push([i + 1, correctAnswerText]);
        });

        doc.setFontSize(18);
        doc.text(quiz.title, 14, 22);
        autoTable(doc, {
            head: [['#', 'Question']], body: quizBody, startY: 30, theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        });
        doc.addPage();
        doc.setFontSize(18);
        doc.text('Answer Key', 14, 22);
        autoTable(doc, {
            head: [['#', 'Correct Answer']], body: answerKey, startY: 30, theme: 'striped',
            headStyles: { fillColor: [22, 160, 133], textColor: 255 },
        });
        doc.save(`${quiz.title}.pdf`);
        showToast("Quiz exported as PDF.", "success");
    };

    const totalQuestions = shuffledQuestions.length;
    const hasAttemptsLeft = isTeacherView ? true : attemptsTaken < MAX_WARNINGS;

    const handleAnswer = (answer) => {
        if (isTeacherView || currentQuestionAttempted) return;
        const currentQuestion = shuffledQuestions[currentQ];
        setUserAnswers({ ...userAnswers, [currentQ]: answer });
        setCurrentQuestionAttempted(true);
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
    };

    const handleNextQuestion = () => {
        setCurrentQuestionAttempted(false);
        setQuestionResult(null);
        if (currentQ < totalQuestions - 1) {
            setCurrentQ(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };
    
    const handleReviewLastAttempt = () => {
        if (latestSubmission && latestSubmission.answers) {
            setUserAnswers(latestSubmission.answers);
        }
        setShowReview(true);
    };

    const handleClose = () => {
        if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView) {
            setShowWarningModal(true);
        } else {
            onClose();
        }
    };
    
    const handleStayInQuiz = () => setShowWarningModal(false);

    // ✅ FIX: This now correctly calls onClose, which does NOT modify the quiz list state.
    const handleLeaveQuiz = async () => {
        await issueWarning();
        setShowWarningModal(false);
        onClose();
    };
    
	const renderQuestion = () => {
	        const question = shuffledQuestions[currentQ];
	        if(!question) return null;
	        const isDisabled = currentQuestionAttempted || isTeacherView;
	        return (
	            <div>
	                <div className="font-medium text-lg sm:text-xl text-slate-800 mb-4 sm:mb-6">
	                    <ContentRenderer text={question.question || question.text} />
	                </div>
	                {question.type === 'multiple-choice' ? (
	                    <div className="space-y-3">
	                        {question.options.map((option, idx) => (
	                            <label key={idx} className={`flex items-center space-x-4 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200
	                                ${isDisabled ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white/80 border-gray-200 hover:bg-blue-500/10 hover:border-blue-300 cursor-pointer'}`}>
	                                <input type="radio" name={`question-${currentQ}`} checked={userAnswers[currentQ] === idx} onChange={() => handleAnswer(idx)} disabled={isDisabled}
	                                    className="form-radio h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500" />
	                                <span className="text-sm sm:text-base text-slate-700"><ContentRenderer text={option.text || option} /></span>
	                            </label>
	                        ))}
	                    </div>
	                ) : question.type === 'true-false' ? (
	                    <div className="space-y-3">
	                        {[true, false].map((value) => (
	                            <button
	                                key={String(value)}
	                                onClick={() => handleAnswer(value)}
	                                disabled={isDisabled}
	                                className={`flex w-full items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-sm sm:text-base font-semibold
	                                    ${isDisabled
	                                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
	                                        : 'bg-white/80 border-gray-200 hover:bg-blue-500/10 hover:border-blue-300 cursor-pointer'
	                                    }
	                                    ${userAnswers[currentQ] === value ? 'bg-blue-500/20 border-blue-400' : ''}`
	                                }
	                            >
	                                {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
	                            </button>
	                        ))}
	                    </div>
	                ) : (
	                    <>
	                        <TextInput placeholder="Type your answer" value={userAnswers[currentQ] || ''} onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })} disabled={isDisabled}
	                            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-slate-100" />
	                        {!isDisabled && (question.type === 'identification' || question.type === 'exactAnswer') && (
	                            <Button onClick={() => handleAnswer(userAnswers[currentQ] || '')} className="mt-4 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300">Submit Answer</Button>
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
        const userAnswerText = question.type === 'multiple-choice'
            ? (question.options[userAnswers[currentQ]]?.text ?? 'No Answer')
            : (userAnswers[currentQ] || 'No answer');
        const correctAnswerText = question.type === 'multiple-choice'
            ? question.options[question.correctAnswerIndex]?.text
            : question.correctAnswer;
        return (
            <div className={`p-4 sm:p-6 rounded-2xl ${isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'} shadow-lg transition-all duration-300`}>
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    {isCorrect ? <CheckCircleIcon className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" /> : <XCircleIcon className="h-8 w-8 sm:h-10 sm:w-10 text-red-600" />}
                    <Title className={`text-xl sm:text-2xl font-extrabold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? "Correct!" : "Incorrect"}</Title>
                </div>
                <div className="text-sm sm:text-base text-gray-700 space-y-2">
                    <p><span className="font-semibold text-gray-800">Your Answer:</span> <ContentRenderer text={userAnswerText} /></p>
                    {!isCorrect && (<p><span className="font-semibold text-gray-800">Correct Answer:</span> <ContentRenderer text={correctAnswerText} /></p>)}
                </div>
                {question.explanation && (
                    <div className="mt-4 pt-4 border-t border-gray-400/30">
                        <div className="flex items-start gap-3">
                            <InformationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-700 mb-1">Explanation</h4>
                                <div className="text-sm sm:text-base text-gray-700"><ContentRenderer text={question.explanation} /></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderResults = () => (
        <div className="text-center p-4 sm:p-8 bg-white/80 rounded-2xl shadow-xl">
            <CheckCircleIcon className="h-16 w-16 sm:h-20 sm:w-20 text-green-500 mx-auto mb-4 animate-scale-in" />
            <Title className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">Quiz Submitted!</Title>
            <p className="text-lg sm:text-xl mt-2 text-gray-700">You scored <strong className="text-green-600 text-xl sm:text-2xl md:text-3xl">{score}</strong> out of <strong className="text-gray-900 text-xl sm:text-2xl md:text-3xl">{totalQuestions}</strong></p>
            { (3 - (attemptsTaken)) > 0 ? (
                <p className="text-base sm:text-lg mt-4 text-gray-600">You have <strong>{3 - attemptsTaken}</strong> attempt(s) left.</p>
            ) : (
                <p className="text-base sm:text-lg mt-4 text-red-600 font-semibold">You have used all 3 attempts.</p>
            )}
            <Button icon={ClipboardDocumentListIcon} onClick={() => setShowReview(true)} className="mt-6 sm:mt-8 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300">
                Review Your Answers
            </Button>
        </div>
    );

    const renderReview = () => (
        <div>
            <Title className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">Review Your Answers</Title>
            <div className="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 bg-black/5 p-2 rounded-2xl">
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
                        <div key={index} className={`p-3 sm:p-4 rounded-xl ${isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <div className="font-bold text-base sm:text-lg text-slate-800 mb-3 flex items-start">
                                <span className="mr-2 pt-1">{isCorrect ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : <XCircleIcon className="h-5 w-5 text-red-600" />}</span>
                                <ContentRenderer text={q.question || q.text} />
                            </div>
                            <div className="text-xs sm:text-sm space-y-1 pl-7">
                                <p className="text-gray-700">Your answer: <span className="font-semibold">{q.type === 'multiple-choice' ? (q.options[userAnswer]?.text ?? 'No Answer') : (userAnswer || 'No answer')}</span></p>
                                {!isCorrect && <p className="text-gray-700">Correct answer: <span className="font-semibold">{q.type === 'multiple-choice' ? q.options[q.correctAnswerIndex]?.text : q.correctAnswer}</span></p>}
                                {q.explanation && (
                                    <div className="mt-3 pt-3 border-t border-gray-400/30">
                                        <div className="flex items-start gap-2">
                                            <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            <div className="text-gray-700"><ContentRenderer text={q.explanation} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <Button onClick={() => setShowReview(false)} className="mt-6 w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300">Back to Score</Button>
        </div>
    );
    
    const renderSystemLockedView = () => (
        <div className="text-center p-4 sm:p-8 bg-white/80 rounded-2xl shadow-xl">
            <LockClosedIcon className="h-16 w-16 sm:h-20 sm:w-20 text-gray-700 mx-auto mb-5" />
            <Title className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">Quiz Locked</Title>
            <p className="text-base sm:text-lg mt-2 text-gray-600">This quiz has been locked due to multiple warnings.</p>
            <p className="text-sm sm:text-md mt-1 text-gray-600">Please contact your teacher to have it unlocked.</p>
        </div>
    );

    const renderNoAttemptsLeftView = () => (
        <div className="text-center p-4 sm:p-8 bg-white/80 rounded-2xl shadow-xl">
            <LockClosedIcon className="h-16 w-16 sm:h-20 sm:w-20 text-red-500 mx-auto mb-5" />
            <Title className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">No Attempts Remaining</Title>
            <p className="text-base sm:text-lg mt-2 text-gray-600">You have used all {MAX_WARNINGS} of your attempts for this quiz.</p>
            {latestSubmission && <p className="text-lg sm:text-xl md:text-2xl font-bold mt-4">Your last score was <strong className="text-red-600">{latestSubmission.score}</strong> out of <strong className="text-gray-900">{latestSubmission.totalItems}</strong></p>}
            <Button icon={ClipboardDocumentListIcon} onClick={handleReviewLastAttempt} className="mt-8 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300">
                Review Last Attempt
            </Button>
        </div>
    );

    const renderTeacherPreview = () => {
        const currentQuestionData = shuffledQuestions[currentQ];
        return (
            <div className="flex flex-col h-full">
                <div className="flex-grow overflow-y-auto pr-2">
                    {currentQuestionData ? (
                        <div className="p-4 rounded-2xl bg-black/5">
                            <div className="font-semibold flex items-start text-lg">
                                <span className="text-gray-500 mr-2">{currentQ + 1}.</span>
                                <ContentRenderer text={currentQuestionData.text} />
                            </div>
                            <div className="mt-4 space-y-2">
                                {currentQuestionData.type === 'multiple-choice' && currentQuestionData.options?.map((option, idx) => (
                                    <div key={idx} className={`flex items-center p-3 rounded-lg text-sm ${option.isCorrect ? 'bg-green-500/15 text-green-900 font-semibold' : 'bg-gray-500/10'}`}>
                                        {option.isCorrect && <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />}
                                        <ContentRenderer text={option.text} />
                                    </div>
                                ))}
                                {currentQuestionData.type === 'identification' && (
                                    <div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold">
                                        <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                                        Correct Answer: <ContentRenderer text={currentQuestionData.correctAnswer} />
                                    </div>
                                )}
                            </div>
                            {currentQuestionData.explanation && (
                                <div className="mt-4 pt-4 border-t border-gray-400/30">
                                    <div className="flex items-start gap-2">
                                        <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
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
                 <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t border-gray-400/20">
                    <Button icon={ArrowLeftIcon} onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0} className="font-semibold rounded-xl">Previous</Button>
                    <span className="text-sm font-medium text-gray-600">Question {currentQ + 1} of {totalQuestions}</span>
                    <Button icon={ArrowRightIcon} iconPosition="right" onClick={() => setCurrentQ(prev => Math.min(totalQuestions - 1, prev + 1))} disabled={currentQ === totalQuestions - 1} className="font-semibold rounded-xl">Next</Button>
                </div>
            </div>
        );
    };
    
    const renderContent = () => {
        if (loading) return <Spinner />;
        if (isTeacherView) return renderTeacherPreview();
        if (isLocked) return renderSystemLockedView();
        if (!hasAttemptsLeft) return showReview ? renderReview() : renderNoAttemptsLeftView();
        if (score !== null) return showReview ? renderReview() : renderResults();
        if (questionResult) return renderQuestionFeedback();
        return renderQuestion();
    }
    
    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
                <DialogPanel className="relative w-full max-w-lg md:max-w-2xl rounded-3xl bg-gray-50/80 backdrop-blur-2xl p-4 sm:p-6 md:p-8 shadow-2xl border border-white/50">
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full text-gray-500 hover:bg-gray-500/10 hover:text-gray-800 transition-colors z-10"
                        aria-label="Close" >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <div className="flex-1">
                            <Title className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight pr-8 sm:pr-0">{quiz?.title}</Title>
                            {isTeacherView && (
                                <Button 
                                    icon={DocumentArrowDownIcon} 
                                    variant="light" 
                                    onClick={handleExportPdf} 
                                    className="mt-3 -ml-2 sm:ml-0" >
                                    Export as PDF
                                </Button>
                            )}
                        </div>
                        {!isTeacherView && classId && !isLocked && score === null && (
                            <div className="flex items-center gap-2 bg-yellow-400/20 text-yellow-900 px-3 py-1.5 rounded-full border border-yellow-400/30 shadow-sm flex-shrink-0 self-start sm:self-center">
                                <ShieldExclamationIcon className="w-5 h-5 text-yellow-600"/>
                                <span className="text-xs sm:text-sm font-semibold">Warnings: {warnings} / {MAX_WARNINGS}</span>
                            </div>
                        )}
                    </div>
                    {isTeacherView && (
                        <p className="text-center text-sm font-semibold text-blue-800 bg-blue-500/15 p-2.5 rounded-xl mb-6 border border-blue-500/20 shadow-sm">
                            Teacher Preview - Anti-cheating features are disabled.
                        </p>
                    )}
                    <div className="min-h-[50vh] mb-6">
                        {renderContent()}
                    </div>
                    {hasAttemptsLeft && score === null && !isLocked && !isTeacherView && currentQuestionAttempted && (
                        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-6 border-t border-gray-400/20">
                            <div className="text-center">
                                <span className="text-sm sm:text-base font-medium text-gray-600">{`Question ${currentQ + 1} of ${totalQuestions}`}</span>
                                <span className="block text-xs text-gray-500 mt-1">Attempt {attemptsTaken + 1} of {MAX_WARNINGS}</span>
                            </div>
                            {currentQ < totalQuestions - 1 ? (
                                <Button
                                    icon={ArrowRightIcon}
                                    iconPosition="right"
                                    onClick={handleNextQuestion}
                                    className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300" >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    className="w-full sm:w-auto bg-green-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-green-700 shadow-md hover:shadow-lg transition-all duration-300" >
                                    Submit Quiz
                                </Button>
                            )}
                        </div>
                    )}
                </DialogPanel>
            </Dialog>
            <QuizWarningModal
                isOpen={showWarningModal}
                warnings={warnings}
                maxWarnings={MAX_WARNINGS}
                onStay={handleStayInQuiz}
                onLeave={handleLeaveQuiz}
                isLocked={isLocked}
            />
        </>
    );
}