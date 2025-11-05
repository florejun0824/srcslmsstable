import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon, DocumentArrowDownIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase'; // Adjust path if needed
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext'; // Adjust path if needed
import { handleExportPdf as exportPdfUtil } from './quiz/quizUtils'; // Adjust path if needed
import QuizContent from './quiz/QuizContent';
import QuizWarningModal from '../../components/common/QuizWarningModal'; // Adjust path if needed

import useQuizState from '../../hooks/useQuizState'; // Adjust path if needed
import Watermark from '../quiz/Watermark'; // Adjust path if needed
import TimerDisplay from '../quiz/TimerDisplay'; // Adjust path if needed

const QuizContext = createContext(null);
export const useQuiz = () => useContext(QuizContext);

export default function ViewQuizModal({ isOpen, onClose, onComplete, quiz, userProfile, classId, isTeacherView = false, postId }) {

    const quizState = useQuizState({
        isOpen,
        quiz,
        userProfile,
        classId,
        isTeacherView,
        onComplete,
		postId
    });

    const [showWarningModal, setShowWarningModal] = useState(false);
    const { showToast } = useToast();

    // --- MODIFIED: Show warning modal immediately on infraction ---
    useEffect(() => {
        // If an infraction is active AND the warning modal isn't already shown...
        if (quizState.isInfractionActive && !showWarningModal) {
            setShowWarningModal(true); // ...show the warning modal.
        }
        // Dependency is now isInfractionActive
    }, [quizState.isInfractionActive, showWarningModal]);
    // --- END MODIFIED ---


    // handleClose remains the same - it acts as a backup trigger if needed
    const handleClose = () => {
        // --- MODIFIED: Reset infraction state if user closes warning manually before action ---
        // Although handleStay/handleLeave should handle this, it's safer here too.
        if (showWarningModal) {
             quizState.setIsInfractionActive(false);
        }
        // --- END MODIFIED ---

        // --- ⬇⬇⬇ THIS IS THE FIX FROM LAST TIME (KEEPING IT) ⬇⬇⬇ ---
        const antiCheatEnabled = (quiz?.settings?.enabled ?? false) && (quiz?.settings?.lockOnLeave ?? false);

        // Check quizState for quiz progress
        if (isOpen && classId && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !isTeacherView && antiCheatEnabled && quizState.isAvailable) {
            setShowWarningModal(true); // Trigger warning if trying to close while in progress
        } else {
            onClose(); // Close modal directly if no warning needed or if locked
        }
    };

    // --- MODIFIED: handleStayInQuiz resets infraction state ---
    const handleStayInQuiz = () => {
        setShowWarningModal(false);
        // Reset the infraction state *unless* the quiz is already locked
        if (!quizState.isLocked) {
             quizState.setIsInfractionActive(false);
        }

        // If the quiz is locked, "Acknowledge" (onStay) should
        // close the main modal, not just the warning modal.
        if (quizState.isLocked) {
            onClose();
        }
    };
    // --- END MODIFIED ---

    // handleLeaveQuiz remains the same
    const handleLeaveQuiz = async () => {
        await quizState.issueWarning('general'); // Use the handler from the hook
        setShowWarningModal(false);
        quizState.setIsInfractionActive(false);
        onClose();
    };

    // PDF Export (unchanged)
    const handleExportPdf = () => {
        exportPdfUtil(quiz, showToast);
    };

    // Keydown handler (unchanged)
    const handleKeyDown = useCallback((event) => {
        if (quizState.score !== null || quizState.isLocked || quizState.showReview || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        
        const currentQuestion = quizState.shuffledQuestions[quizState.currentQ];
        const currentQuestionType = currentQuestion?.type;
        const canNavigate = quizState.currentQuestionAttempted || currentQuestionType === 'essay';

        if (event.key === 'ArrowRight') {
            if (isTeacherView) {
                if (quizState.currentQ < quizState.shuffledQuestions.length - 1) quizState.setCurrentQ(prev => prev + 1);
            } else if (canNavigate) {
                quizState.handleNextQuestion();
            }
        } else if (event.key === 'ArrowLeft') {
            if (quiz?.settings?.preventBackNavigation && !isTeacherView) {
                quizState.showToast("Going back to previous questions is disabled for this quiz.", "warning");
                return;
            }
            if (quizState.currentQ > 0) {
                quizState.setCurrentQuestionAttempted(false);
                quizState.setQuestionResult(null);
                quizState.setMatchingResult(null);
                quizState.setCurrentQ(prev => prev - 1);
                quizState.setQuestionStartTime(Date.now());
            }
        }
    }, [
        quizState.score, quizState.isLocked, quizState.showReview, isTeacherView, 
        quizState.currentQ, quizState.shuffledQuestions, quizState.currentQuestionAttempted, 
        quizState.handleNextQuestion, quiz?.settings?.preventBackNavigation, quizState.showToast,
        quizState.setCurrentQ, quizState.setCurrentQuestionAttempted, quizState.setQuestionResult,
        quizState.setMatchingResult, quizState.setQuestionStartTime
    ]);

    // Keydown Listener (unchanged)
    useEffect(() => {
        if (isOpen) { window.addEventListener('keydown', handleKeyDown); }
        else { window.removeEventListener('keydown', handleKeyDown); }
        return () => { window.removeEventListener('keydown', handleKeyDown); };
    }, [isOpen, handleKeyDown]);

    // Quiz Theming Logic (unchanged)
    const getQuizThemeClass = () => {
        const cosmeticsEnabled = userProfile?.cosmeticsEnabled ?? true;
        const selectedBorder = userProfile?.selectedBorder;
        if (!cosmeticsEnabled || !selectedBorder || selectedBorder === 'none') return '';
        const themeMap = {
            'border_basic': 'theme-border-basic',
            'border_animated': 'theme-border-animated',
            'border_advanced_animated': 'theme-border-advanced',
            'border_elite_animated': 'theme-border-elite',
            'border_legendary_animated': 'theme-border-legendary',
        };
        return themeMap[selectedBorder] || '';
    };
    const quizThemeClass = getQuizThemeClass();

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onClose={handleClose} static={true} className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
                
                {/* --- MODIFIED: Added dark theme --- */}
                <DialogPanel className={`quiz-container relative flex flex-col w-full max-w-lg md:max-w-3xl rounded-3xl bg-neumorphic-base shadow-neumorphic max-h-[95vh] sm:max-h-[90vh] overflow-hidden ${quizThemeClass} dark:bg-neumorphic-base-dark dark:shadow-lg`}>
                    
                    <Watermark
                        userProfile={userProfile}
                        quizSettings={quiz?.settings}
                        isTeacherView={isTeacherView}
                    />
                    
                    {/* Header */}
                    {/* --- MODIFIED: Added dark theme --- */}
                    <div className="relative z-20 flex-shrink-0 p-4 pb-3 border-b border-slate-300/50 dark:border-slate-700">
                        {/* --- MODIFIED: Added dark theme --- */}
                        <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base text-slate-500 shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark dark:hover:text-slate-200" aria-label="Close Quiz">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div className="flex-1">
                                {/* --- MODIFIED: Added dark theme --- */}
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight pr-8 sm:pr-0 dark:text-slate-100">{quiz?.title || "Quiz"}</h2>
                                {isTeacherView && (
                                    /* --- MODIFIED: Added dark theme --- */
                                    <button onClick={handleExportPdf} className="flex items-center gap-1 mt-2 px-3 py-1 rounded-lg bg-neumorphic-base text-blue-600 text-xs font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-blue-800 dark:bg-neumorphic-base-dark dark:text-blue-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark dark:hover:text-blue-300">
                                        <DocumentArrowDownIcon className="h-4 w-4"/> Export PDF
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row items-end sm:items-center gap-2 self-end sm:self-center mt-2 sm:mt-0">
                                
                                <TimerDisplay
                                    timeRemaining={quizState.timeRemaining}
                                    quizSettings={quiz?.settings}
                                    isTeacherView={isTeacherView}
                                    loading={quizState.loading}
                                    isLocked={quizState.isLocked}
                                    isAvailable={quizState.isAvailable}
                                    score={quizState.score}
                                    hasSubmitted={quizState.hasSubmitted}
                                />

                                {/* --- ⬇⬇⬇ START OF FIX ⬇⬇⬇ --- */}
                                {/* This condition now checks quiz.settings.enabled FIRST.
                                    The warning counter will now only show if anti-cheat is
                                    globally enabled AND lockOnLeave is enabled.
                                */}
                                {!isTeacherView && classId && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && (quiz?.settings?.enabled ?? false) && (quiz?.settings?.lockOnLeave ?? false) && quizState.isAvailable && (
                                    /* --- MODIFIED: Added dark theme --- */
                                    <div className="flex items-center gap-1 bg-neumorphic-base text-amber-800 px-3 py-1 rounded-full shadow-neumorphic-inset flex-shrink-0 dark:bg-neumorphic-base-dark dark:text-amber-300 dark:shadow-neumorphic-inset-dark" title="Anti-cheat warnings">
                                        <ShieldExclamationIcon className="w-4 h-4 text-amber-600 dark:text-amber-500"/>
                                        <span className="text-xs font-semibold">{quizState.warnings} / {quizState.MAX_WARNINGS}</span>
                                    </div>
                                )}
                                {/* --- ⬆⬆⬆ END OF FIX ⬆⬆⬆ --- */}

                            </div>
                        </div>
                        {isTeacherView && (
                            /* --- MODIFIED: Added dark theme --- */
                            <p className="text-center text-xs font-semibold text-blue-800 bg-blue-500/10 p-2 rounded-lg mt-3 shadow-neumorphic-inset dark:text-blue-200 dark:bg-blue-500/20 dark:shadow-neumorphic-inset-dark">
                                Teacher Preview - Answers shown, anti-cheat disabled.
                            </p>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="relative z-20 flex-grow overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar">
                        <QuizContext.Provider value={quizState}>
                            <QuizContent />
                        </QuizContext.Provider>
                    </div>

                    {/* Footer */}
                    {/* --- MODIFIED: Added dark theme --- */}
                    <div className="relative z-20 flex-shrink-0 p-4 pt-3 border-t border-slate-300/50 dark:border-slate-700">
                        {(!isTeacherView && quizState.isAvailable && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !quizState.questionResult && !quizState.matchingResult) && (
                            (quizState.currentQuestionAttempted || (quizState.shuffledQuestions[quizState.currentQ]?.type === 'essay' && quizState.userAnswers[quizState.currentQ]?.trim())) ? (
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div className="text-center sm:text-left flex-shrink-0">
                                        {/* --- MODIFIED: Added dark theme --- */}
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                            {quizState.renderQuestionNumber()} ({quizState.shuffledQuestions[quizState.currentQ]?.points || 0} pts)
                                            <span className="hidden sm:inline"> / {quizState.questionNumbering.totalItems} Total Points</span>
                                        </span>
                                        {/* --- MODIFIED: Added dark theme --- */}
                                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Attempt {quizState.attemptsTaken + 1} of {quizState.maxAttempts}</span>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {!(quiz?.settings?.preventBackNavigation) && quizState.currentQ > 0 && (
                                            <button
                                                onClick={() => {
                                                    quizState.setCurrentQuestionAttempted(false);
                                                    quizState.setQuestionResult(null);
                                                    quizState.setMatchingResult(null);
                                                    quizState.setCurrentQ(prev => prev - 1);
                                                    quizState.setQuestionStartTime(Date.now());
                                                }}
                                                /* --- MODIFIED: Added dark theme --- */
                                                className="flex items-center justify-center gap-1 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neumorphic-base text-slate-600 font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
                                                aria-label="Previous Question"
                                            >
                                                <ArrowLeftIcon className="h-5 w-5"/> Back
                                            </button>
                                        )}
                                        {quizState.currentQ < quizState.shuffledQuestions.length - 1 ? (
                                            <button
                                                onClick={quizState.handleNextQuestion}
                                                disabled={quizState.shuffledQuestions[quizState.currentQ]?.type === 'essay' && !quizState.userAnswers[quizState.currentQ]?.trim()}
                                                /* --- MODIFIED: Added dark theme --- */
                                                className="flex items-center justify-center gap-1 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all disabled:opacity-50 disabled:text-slate-400 disabled:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:text-blue-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark dark:disabled:text-slate-500 dark:disabled:shadow-neumorphic-inset-dark"
                                                aria-label="Next Question"
                                            >
                                                Next <ArrowRightIcon className="h-5 w-5"/>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={quizState.handleSubmit}
                                                disabled={quizState.shuffledQuestions[quizState.currentQ]?.type === 'essay' && !quizState.userAnswers[quizState.currentQ]?.trim()}
                                                /* --- MODIFIED: Added dark theme --- */
                                                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all disabled:opacity-50 disabled:text-slate-400 disabled:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:text-green-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark dark:disabled:text-slate-500 dark:disabled:shadow-neumorphic-inset-dark"
                                                aria-label="Submit Quiz"
                                            >
                                                Submit Quiz
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : null
                        )}

                        {isTeacherView && quizState.shuffledQuestions.length > 0 && (
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={() => {
                                        quizState.setCurrentQ(prev => Math.max(0, prev - 1));
                                        quizState.setQuestionStartTime(Date.now());
                                    }}
                                    disabled={quizState.currentQ === 0}
                                    /* --- MODIFIED: Added dark theme --- */
                                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-neumorphic-base text-slate-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset disabled:opacity-50 transition-all dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
                                    aria-label="Previous Question"
                                >
                                    <ArrowLeftIcon className="h-5 w-5"/>Previous
                                </button>
                                {/* --- MODIFIED: Added dark theme --- */}
                                <span className="text-xs text-center font-medium text-slate-600 dark:text-slate-400">
                                    {quizState.renderQuestionNumber()} ({quizState.shuffledQuestions[quizState.currentQ]?.points || 0} pts)
                                    <br/>(Item {quizState.currentQ + 1} of {quizState.shuffledQuestions.length})
                                </span>
                                <button
                                    onClick={() => {
                                        quizState.setCurrentQ(prev => Math.min(quizState.shuffledQuestions.length - 1, prev + 1));
                                        quizState.setQuestionStartTime(Date.now());
                                    }}
                                    disabled={quizState.currentQ === quizState.shuffledQuestions.length - 1}
                                    /* --- MODIFIED: Added dark theme --- */
                                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-neumorphic-base text-slate-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset disabled:opacity-50 transition-all dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
                                    aria-label="Next Question"
                                >
                                    Next<ArrowRightIcon className="h-5 w-5"/>
                                </button>
                            </div>
                        )}
                    </div>
                </DialogPanel>
            </Dialog>
            
            <QuizWarningModal
                isOpen={showWarningModal}
                warnings={quizState.warnings}
                maxWarnings={quizState.MAX_WARNINGS}
                onStay={handleStayInQuiz}
                onLeave={handleLeaveQuiz}
                isLocked={quizState.isLocked}
            />
        </>
    );
}