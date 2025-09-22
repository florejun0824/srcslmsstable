import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, LockClosedIcon, InformationCircleIcon, ClipboardDocumentListIcon, ShieldExclamationIcon, XCircleIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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

// Helper functions and hooks remain unchanged...
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

export default function ViewQuizModal({ isOpen, onClose, onComplete, quiz, userProfile, classId, isTeacherView = false }) {
    // All state and logic hooks remain unchanged...
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

    // All handler functions (issueWarning, etc.) remain unchanged...
	const issueWarning = useCallback(async () => {
        if (isTeacherView || isLocked || score !== null || showReview) return;
        try {
            const newWarningCount = warnings + 1;
            setWarnings(newWarningCount);
            localStorage.setItem(warningKey, newWarningCount.toString());
            if (newWarningCount >= MAX_WARNINGS) {
                setIsLocked(true); setShowWarningModal(true);
                if (navigator.onLine) {
                    const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                    await setDoc(lockRef, { quizId: quiz.id, studentId: userProfile.id, studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId, lockedAt: serverTimestamp(), reason: 'Too many unauthorized attempts to navigate away' });
                }
            } else { setShowWarningModal(true); }
        } catch (error) { console.error("Failed to issue warning:", error); showToast("Could not process warning. Please proceed.", "error"); }
    }, [warnings, warningKey, quiz, userProfile, classId, isLocked, score, showReview, isTeacherView, showToast]);

    // MODIFIED FUNCTION
	const handleSubmit = useCallback(async () => {
	    if (hasSubmitted.current || score !== null || isLocked) return;
	    hasSubmitted.current = true; justSubmitted.current = true;
	    
        let correctCount = 0;
	    shuffledQuestions.forEach((q, index) => {
	        const userAnswer = userAnswers[index];
	        if (q.type === 'multiple-choice' && userAnswer === q.correctAnswerIndex) correctCount++;
	        else if (q.type === 'identification' || q.type === 'exactAnswer') {
	            const formattedUserAnswer = String(userAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            const formattedCorrectAnswer = String(q.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
	            if (formattedUserAnswer === formattedCorrectAnswer) correctCount++;
	        } else if (q.type === 'true-false' && userAnswer === q.correctAnswer) { correctCount++; }
	    });

        // --- START OF ADDED CODE ---
        // Create a detailed array of answers for analytics
        const detailedAnswers = shuffledQuestions.map((question, index) => {
            const userAnswerIndex = userAnswers[index];
            
            let selectedAnswerText = 'Not Answered';
            let correctAnswerText = '';
            let isCorrect = false;

            if (question.type === 'multiple-choice') {
                correctAnswerText = question.options[question.correctAnswerIndex]?.text || 'N/A';
                if (userAnswerIndex !== undefined && userAnswerIndex !== null) {
                    selectedAnswerText = question.options[userAnswerIndex]?.text || 'Invalid Option';
                    isCorrect = userAnswerIndex === question.correctAnswerIndex;
                }
            } else if (question.type === 'identification' || question.type === 'exactAnswer') {
                correctAnswerText = question.correctAnswer;
                 if (userAnswerIndex !== undefined && userAnswerIndex !== null) {
                    selectedAnswerText = userAnswerIndex;
                    const formattedUserAnswer = String(userAnswerIndex || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                    const formattedCorrectAnswer = String(question.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                    isCorrect = formattedUserAnswer === formattedCorrectAnswer;
                }
            } else if (question.type === 'true-false') {
                correctAnswerText = String(question.correctAnswer);
                if (userAnswerIndex !== undefined && userAnswerIndex !== null) {
                    selectedAnswerText = String(userAnswerIndex);
                    isCorrect = userAnswerIndex === question.correctAnswer;
                }
            }

            return {
                questionText: question.question || question.text,
                selectedAnswer: selectedAnswerText,
                correctAnswer: correctAnswerText,
                isCorrect: isCorrect
            };
        });
        // --- END OF ADDED CODE ---

	    setScore(correctCount); localStorage.removeItem(warningKey); localStorage.removeItem(shuffleKey); setWarnings(0);
	    try {
            // --- MODIFIED SUBMISSION DATA ---
			const submissionData = { 
			    quizId: quiz.id,
			    quizTitle: quiz.title,
			    classId: classId,
			    studentId: userProfile.id,
			    studentName: `${userProfile.firstName} ${userProfile.lastName}`,
			    answers: detailedAnswers,
			    score: correctCount,
			    totalItems: shuffledQuestions.length,
			    attemptNumber: attemptsTaken + 1,
			    submittedAt: serverTimestamp(),
			    quarter: quiz.quarter || null   // <-- NEW FIELD
			};
	        
            // The queueQuizSubmission function now correctly receives the detailed answers
	        await queueQuizSubmission(submissionData); 
	        setLatestSubmission({ ...submissionData }); setAttemptsTaken(prev => prev + 1);
	        showToast(navigator.onLine ? "✅ Quiz submitted successfully!" : "📡 Quiz saved. It will sync when you’re back online.", "success");
            if (navigator.onLine) { syncOfflineSubmissions(); }
            if (onComplete) { onComplete(); } else { onClose(); }
	    } catch (error) { console.error("Error queuing submission:", error); showToast("❌ Could not save your quiz. Please try again.", "error"); }
	}, [userAnswers, score, shuffledQuestions, quiz, userProfile, classId, attemptsTaken, warningKey, shuffleKey, isLocked, showToast, onClose, onComplete]);
    
    const fetchSubmission = useCallback(async () => {
        if (!quiz?.id || !userProfile?.id || !classId) { setLoading(false); return; }
        setLoading(true);
        try {
            let isDbLocked = false; let dbSubmissions = []; let localWarningCount = 0;
            const savedWarnings = localStorage.getItem(warningKey);
            if (savedWarnings) { localWarningCount = parseInt(savedWarnings, 10); }
            if (navigator.onLine) {
                const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
                const lockSnap = await getDoc(lockRef);
                isDbLocked = lockSnap.exists();
                if (!isDbLocked && localWarningCount >= MAX_WARNINGS) { localStorage.removeItem(warningKey); setWarnings(0); localWarningCount = 0; showToast("Your teacher has unlocked this quiz for you.", "info"); }
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
    
    // All other useEffect hooks remain unchanged...
    useEffect(() => {
        let listener;
        if (isOpen && Capacitor.isNativePlatform() && score === null && !isLocked && !isTeacherView) {
            listener = App.addListener('appStateChange', ({ isActive }) => { if (!isActive) { issueWarning(); } });
        }
        return () => { listener?.remove(); };
    }, [isOpen, score, isLocked, issueWarning, isTeacherView]);
    useEffect(() => {
        const handleFocusLoss = () => { if (!isOpen || hasSubmitted.current || isLocked || !classId || score !== null || showReview || isTeacherView) { return; } issueWarning(); };
        window.addEventListener('blur', handleFocusLoss);
        return () => window.removeEventListener('blur', handleFocusLoss);
    }, [isOpen, isLocked, score, classId, issueWarning, showReview, isTeacherView]);
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView) {
                event.preventDefault(); event.returnValue = 'You are attempting to leave the quiz. This will result in a warning.'; issueWarning(); return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, classId, isLocked, score, issueWarning, isTeacherView]);
    useEffect(() => {
        if (isOpen) {
            if (justSubmitted.current) { justSubmitted.current = false; return; }
            setCurrentQ(0); setUserAnswers({}); setScore(null); setShowReview(false); hasSubmitted.current = false; setQuestionResult(null); setCurrentQuestionAttempted(false);
            if (!isTeacherView) {
                const savedWarnings = localStorage.getItem(warningKey);
                const initialWarnings = savedWarnings ? parseInt(savedWarnings, 10) : 0;
                setWarnings(initialWarnings);
                fetchSubmission();
                try {
                    const savedShuffle = localStorage.getItem(shuffleKey);
                    if (savedShuffle && JSON.parse(savedShuffle).length === (quiz.questions || []).length) {
                        setShuffledQuestions(JSON.parse(savedShuffle));
                    } else { const newShuffled = shuffleArray(quiz.questions || []); setShuffledQuestions(newShuffled); localStorage.setItem(shuffleKey, JSON.stringify(newShuffled)); }
                } catch (e) { console.error("Error handling shuffled questions from localStorage", e); const newShuffled = shuffleArray(quiz.questions || []); setShuffledQuestions(newShuffled); }
            } else { setWarnings(0); setIsLocked(false); setShuffledQuestions(quiz.questions || []); setLoading(false); }
        } else { setShowWarningModal(false); }
    }, [isOpen, quiz, warningKey, shuffleKey, fetchSubmission, isTeacherView]);
    
    // PDF export logic remains unchanged...
    const handleExportPdf = () => {
        if (!quiz?.questions) { showToast("No quiz data to export.", "warning"); return; }
        const doc = new jsPDF(); const quizBody = []; const answerKey = [];
        quiz.questions.forEach((q, i) => {
            let questionContent = q.question || q.text; let correctAnswerText = '';
            if (q.type === 'multiple-choice' && q.options) {
                const optionsText = q.options.map((opt, idx) => `  ${String.fromCharCode(97 + idx)}. ${opt.text || opt}`).join('\n');
                questionContent += `\n${optionsText}`;
                const correctOption = q.options.find(opt => opt.isCorrect);
                if (correctOption) { correctAnswerText = correctOption.text || correctOption; } 
                else if (q.correctAnswerIndex !== undefined) { const correctOpt = q.options[q.correctAnswerIndex]; correctAnswerText = correctOpt?.text || correctOpt || 'N/A'; } 
                else { correctAnswerText = 'N/A'; }
            } else { correctAnswerText = String(q.correctAnswer); }
            quizBody.push([i + 1, questionContent]); answerKey.push([i + 1, correctAnswerText]);
        });
        doc.setFontSize(18); doc.text(quiz.title, 14, 22);
        autoTable(doc, { head: [['#', 'Question']], body: quizBody, startY: 30, theme: 'grid', headStyles: { fillColor: [41, 128, 185], textColor: 255 }, });
        doc.addPage(); doc.setFontSize(18); doc.text('Answer Key', 14, 22);
        autoTable(doc, { head: [['#', 'Correct Answer']], body: answerKey, startY: 30, theme: 'striped', headStyles: { fillColor: [22, 160, 133], textColor: 255 }, });
        doc.save(`${quiz.title}.pdf`); showToast("Quiz exported as PDF.", "success");
    };

    // Other handlers remain unchanged...
    const totalQuestions = shuffledQuestions.length;
    const hasAttemptsLeft = isTeacherView ? true : attemptsTaken < MAX_WARNINGS;
    const handleAnswer = (answer) => {
        if (isTeacherView || currentQuestionAttempted) return;
        const currentQuestion = shuffledQuestions[currentQ]; setUserAnswers({ ...userAnswers, [currentQ]: answer }); setCurrentQuestionAttempted(true); let isCorrect = false;
        if (currentQuestion.type === 'multiple-choice') { isCorrect = (answer === currentQuestion.correctAnswerIndex); } 
        else if (currentQuestion.type === 'true-false') { isCorrect = (answer === currentQuestion.correctAnswer); } 
        else if (currentQuestion.type === 'identification' || currentQuestion.type === 'exactAnswer') {
            const formattedUserAnswer = String(answer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
            const formattedCorrectAnswer = String(currentQuestion.correctAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
            isCorrect = (formattedUserAnswer === formattedCorrectAnswer);
        }
        setQuestionResult(isCorrect ? 'correct' : 'incorrect');
    };
    const handleNextQuestion = () => {
        setCurrentQuestionAttempted(false); setQuestionResult(null);
        if (currentQ < totalQuestions - 1) { setCurrentQ(prev => prev + 1); } 
        else { handleSubmit(); }
    };
    const handleReviewLastAttempt = () => { 
        // This part needs adjustment if you want to review old format submissions
        if (latestSubmission && latestSubmission.answers) { 
            // For now, this will not work as expected with the new `detailedAnswers` format.
            // You would need to map the detailed answers back to a simple index format to display them.
            // This is a more complex UI change, so we'll leave the submission logic update for now.
            // setUserAnswers(latestSubmission.answers); 
        } 
        setShowReview(true); 
    };
    const handleClose = () => { if (isOpen && classId && !isLocked && score === null && !hasSubmitted.current && !isTeacherView) { setShowWarningModal(true); } else { onClose(); } };
    const handleStayInQuiz = () => setShowWarningModal(false);
    const handleLeaveQuiz = async () => { await issueWarning(); setShowWarningModal(false); onClose(); };

    // --- NEW: HANDLER FOR KEYBOARD NAVIGATION ---
    const handleKeyDown = useCallback((event) => {
        // Disable keyboard nav if quiz is finished, locked, in review, or if typing in an input
        if (score !== null || isLocked || showReview || document.activeElement.tagName === 'INPUT') {
            return;
        }

        // Right Arrow: Go to the next question
        if (event.key === 'ArrowRight') {
            if (isTeacherView) {
                if (currentQ < totalQuestions - 1) setCurrentQ(prev => prev + 1);
            } else {
                // Student can only advance after answering the current question
                if (currentQuestionAttempted) handleNextQuestion();
            }
        }
        // Left Arrow: Go to the previous question
        else if (event.key === 'ArrowLeft') {
             if (currentQ > 0) {
                // When going back, reset feedback card for the question being left
                setQuestionResult(null); 
                setCurrentQ(prev => prev - 1);
            }
        }
    }, [score, isLocked, showReview, isTeacherView, currentQ, totalQuestions, currentQuestionAttempted, handleNextQuestion]);

    // --- NEW: EFFECT TO ADD/REMOVE KEYBOARD LISTENER ---
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);


    // All render functions remain the same...
    const renderQuestion = () => {
        const question = shuffledQuestions[currentQ];
        if(!question) return null;
        const isDisabled = currentQuestionAttempted || isTeacherView;
        return (
            <div>
                <div className="font-semibold text-lg sm:text-xl text-slate-800 mb-6 bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic-inset">
                    <ContentRenderer text={question.question || question.text} />
                </div>
                {question.type === 'multiple-choice' ? (
                    <div className="space-y-3">
                        {question.options.map((option, idx) => (
                            <label key={idx} className={`relative flex items-center space-x-4 p-3 sm:p-4 rounded-2xl transition-all duration-200 bg-neumorphic-base
                                ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'}
                                ${userAnswers[currentQ] === idx ? 'shadow-neumorphic-inset' : 'shadow-neumorphic'}`}>
                                <input type="radio" name={`question-${currentQ}`} checked={userAnswers[currentQ] === idx} onChange={() => handleAnswer(idx)} disabled={isDisabled} className="sr-only" />
                                <span className="text-sm sm:text-base text-slate-700"><ContentRenderer text={option.text || option} /></span>
                            </label>
                        ))}
                    </div>
                ) : question.type === 'true-false' ? (
                    <div className="grid grid-cols-2 gap-4">
                        {[true, false].map((value) => (
                            <button key={String(value)} onClick={() => handleAnswer(value)} disabled={isDisabled}
                                className={`w-full p-3 sm:p-4 rounded-2xl text-base font-semibold transition-all duration-200 bg-neumorphic-base
                                    ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'}
                                    ${userAnswers[currentQ] === value ? 'shadow-neumorphic-inset text-primary-700' : 'shadow-neumorphic text-slate-700'}`}>
                                {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        <input placeholder="Type your answer" value={userAnswers[currentQ] || ''} onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })} disabled={isDisabled}
                            className="w-full p-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset focus:outline-none text-slate-800 disabled:opacity-70" />
                        {!isDisabled && (question.type === 'identification' || question.type === 'exactAnswer') && (
                            <button onClick={() => handleAnswer(userAnswers[currentQ] || '')} className="mt-4 w-full py-3 rounded-2xl bg-neumorphic-base text-primary-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
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
        const userAnswerText = question.type === 'multiple-choice' ? (question.options[userAnswers[currentQ]]?.text ?? 'No Answer') : (userAnswers[currentQ] || 'No answer');
        const correctAnswerText = question.type === 'multiple-choice' ? question.options[question.correctAnswerIndex]?.text : question.correctAnswer;
        return (
            <div className={`p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic`}>
                <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-full bg-neumorphic-base ${isCorrect ? 'shadow-neumorphic' : 'shadow-neumorphic-inset'}`}>
                        {isCorrect ? <CheckCircleIcon className="h-8 w-8 text-green-600" /> : <XCircleIcon className="h-8 w-8 text-red-600" />}
                    </div>
                    <h3 className={`text-2xl font-extrabold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? "Correct!" : "Incorrect"}</h3>
                </div>
                <div className="text-base text-slate-700 space-y-2 bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic-inset">
                    <p><span className="font-semibold text-slate-800">Your Answer:</span> <ContentRenderer text={userAnswerText} /></p>
                    {!isCorrect && (<p><span className="font-semibold text-slate-800">Correct Answer:</span> <ContentRenderer text={correctAnswerText} /></p>)}
                </div>
                {question.explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-300">
                        <div className="flex items-start gap-3">
                            <InformationCircleIcon className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-primary-700 mb-1">Explanation</h4>
                                <div className="text-base text-slate-700"><ContentRenderer text={question.explanation} /></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    const renderResults = () => (
        <div className="text-center p-4 sm:p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-4">
                <CheckCircleIcon className="h-16 w-16 sm:h-20 sm:w-20 text-green-500" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Quiz Submitted!</h3>
            <p className="text-lg sm:text-xl mt-2 text-slate-700">You scored <strong className="text-green-600 text-2xl sm:text-3xl">{score}</strong> out of <strong className="text-slate-900 text-2xl sm:text-3xl">{totalQuestions}</strong></p>
            {(quiz.maxAttempts - attemptsTaken) > 0 ? (
                <p className="text-base sm:text-lg mt-4 text-slate-600">You have <strong>{quiz.maxAttempts - attemptsTaken}</strong> attempt(s) left.</p>
            ) : (
                <p className="text-base sm:text-lg mt-4 text-red-600 font-semibold">You have used all {quiz.maxAttempts} attempts.</p>
            )}
            <button onClick={() => setShowReview(true)} className="mt-8 w-full py-3 rounded-2xl bg-neumorphic-base text-primary-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                Review Your Answers
            </button>
        </div>
    );
    const renderReview = () => {
        // NOTE: This review function now uses the `latestSubmission` data directly
        const answersToReview = latestSubmission?.answers || [];
        return (
        <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4">Review Your Answers</h3>
            <div className="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 bg-neumorphic-base p-2 rounded-2xl shadow-neumorphic-inset">
                {answersToReview.map((answer, index) => (
                    <div key={index} className={`p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic border-l-4 ${answer.isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                        <div className="font-bold text-lg text-slate-800 mb-3 flex items-start">
                            <span className="mr-2 pt-1">{answer.isCorrect ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : <XCircleIcon className="h-5 w-5 text-red-600" />}</span>
                            <ContentRenderer text={answer.questionText} />
                        </div>
                        <div className="text-sm space-y-1 pl-7">
                            <p className="text-slate-700">Your answer: <span className="font-semibold">{answer.selectedAnswer}</span></p>
                            {!answer.isCorrect && <p className="text-slate-700">Correct answer: <span className="font-semibold">{answer.correctAnswer}</span></p>}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowReview(false)} className="mt-6 w-full py-3 rounded-2xl bg-neumorphic-base text-primary-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">Back to Score</button>
        </div>
        )
    };
    const renderSystemLockedView = () => (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <LockClosedIcon className="h-20 w-20 text-slate-700" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Quiz Locked</h3>
            <p className="text-lg mt-2 text-slate-600">This quiz has been locked due to multiple warnings.</p>
            <p className="text-md mt-1 text-slate-600">Please contact your teacher to have it unlocked.</p>
        </div>
    );
    const renderNoAttemptsLeftView = () => (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <LockClosedIcon className="h-20 w-20 text-red-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">No Attempts Remaining</h3>
            <p className="text-lg mt-2 text-slate-600">You have used all {MAX_WARNINGS} of your attempts for this quiz.</p>
            {latestSubmission && <p className="text-2xl font-bold mt-4">Your last score was <strong className="text-red-600">{latestSubmission.score}</strong> out of <strong className="text-slate-900">{latestSubmission.totalItems}</strong></p>}
            <button onClick={handleReviewLastAttempt} className="mt-8 w-full py-3 rounded-2xl bg-neumorphic-base text-primary-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                Review Last Attempt
            </button>
        </div>
    );
    const renderTeacherPreview = () => {
        const currentQuestionData = shuffledQuestions[currentQ];
        return (
            <>
                {currentQuestionData ? (
                    <div className="p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                        <div className="font-semibold flex items-start text-lg text-slate-800">
                            <span className="text-slate-500 mr-2">{currentQ + 1}.</span>
                            <ContentRenderer text={currentQuestionData.text || currentQuestionData.question} />
                        </div>
                        <div className="mt-4 space-y-2">
                            {currentQuestionData.type === 'multiple-choice' && currentQuestionData.options?.map((option, idx) => (
                                <div key={idx} className={`flex items-center p-3 rounded-lg text-sm ${idx === currentQuestionData.correctAnswerIndex ? 'bg-green-500/15 text-green-900 font-semibold' : 'bg-slate-500/10'}`}>
                                    {idx === currentQuestionData.correctAnswerIndex && <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />}
                                    <ContentRenderer text={option.text} />
                                </div>
                            ))}
                            {(currentQuestionData.type === 'identification' || currentQuestionData.type === 'exactAnswer') && (
                                <div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold">
                                    <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                                    Correct Answer: <ContentRenderer text={currentQuestionData.correctAnswer} />
                                </div>
                            )}
                             {currentQuestionData.type === 'true-false' && (
                                <div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold">
                                    <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                                    Correct Answer: {String(currentQuestionData.correctAnswer)}
                                </div>
                            )}
                        </div>
                        {currentQuestionData.explanation && (
                            <div className="mt-4 pt-4 border-t border-slate-300">
                                <div className="flex items-start gap-2">
                                    <InformationCircleIcon className="h-5 w-5 text-primary-500 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-slate-700"><ContentRenderer text={currentQuestionData.explanation} /></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : ( <p className="text-center text-slate-500">This quiz has no questions.</p> )}
            </>
        );
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
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
            <Dialog open={isOpen} onClose={handleClose} static={true} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

                <DialogPanel className="relative flex flex-col w-full max-w-lg md:max-w-2xl rounded-3xl bg-neumorphic-base shadow-neumorphic max-h-[90vh]">
                    
                    {/* --- HEADER --- */}
                    <div className="flex-shrink-0 p-4 sm:p-6 pb-4">
                        <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base text-slate-500 shadow-neumorphic active:shadow-neumorphic-inset transition-all z-10" aria-label="Close">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight pr-8 sm:pr-0">{quiz?.title}</h2>
                                {isTeacherView && (
                                    <button onClick={handleExportPdf} className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-neumorphic-base text-primary-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                        <DocumentArrowDownIcon className="h-5 w-5"/> Export as PDF
                                    </button>
                                )}
                            </div>
                            {!isTeacherView && classId && !isLocked && score === null && (
                                <div className="flex items-center gap-2 bg-neumorphic-base text-amber-800 px-3 py-1.5 rounded-full shadow-neumorphic-inset flex-shrink-0 self-start sm:self-center">
                                    <ShieldExclamationIcon className="w-5 h-5 text-amber-600"/>
                                    <span className="text-sm font-semibold">Warnings: {warnings} / {MAX_WARNINGS}</span>
                                </div>
                            )}
                        </div>
                        {isTeacherView && (
                            <p className="text-center text-sm font-semibold text-primary-800 bg-neumorphic-base p-3 rounded-xl mt-4 shadow-neumorphic-inset">
                                Teacher Preview - Anti-cheating features are disabled.
                            </p>
                        )}
                    </div>
                    
                    {/* --- CONTENT (Scrollable) --- */}
                    <div className="flex-grow overflow-y-auto px-4 sm:px-6 custom-scrollbar">
                        {renderContent()}
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="flex-shrink-0 p-4 sm:p-6 pt-4">
                        {/* Student Footer */}
                        {hasAttemptsLeft && score === null && !isLocked && !isTeacherView && currentQuestionAttempted && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-300/80">
                                <div className="text-center sm:text-left">
                                    <span className="text-base font-medium text-slate-600">{`Question ${currentQ + 1} of ${totalQuestions}`}</span>
                                    <span className="block text-xs text-slate-500 mt-1">Attempt {attemptsTaken + 1} of {MAX_WARNINGS}</span>
                                </div>
                                {currentQ < totalQuestions - 1 ? (
                                    <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-2xl bg-neumorphic-base text-primary-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                        Next <ArrowRightIcon className="h-5 w-5"/>
                                    </button>
                                ) : (
                                    <button onClick={handleSubmit} className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                        Submit Quiz
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Teacher Preview Footer */}
                        {isTeacherView && totalQuestions > 0 && (
                            <div className="flex justify-between items-center pt-4 border-t border-slate-300">
                                <button onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neumorphic-base text-slate-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset disabled:opacity-50 transition-all">
                                    <ArrowLeftIcon className="h-5 w-5"/>Previous
                                </button>
                                <span className="text-sm font-medium text-slate-600">Question {currentQ + 1} of {totalQuestions}</span>
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