import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon, DocumentArrowDownIcon, ShieldExclamationIcon, ClockIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase'; 
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext'; 
import { handleExportPdf as exportPdfUtil } from './quiz/quizUtils'; 
import QuizContent from './quiz/QuizContent';
import QuizWarningModal from '../../components/common/QuizWarningModal'; 

import useQuizState from '../../hooks/useQuizState'; 
import Watermark from '../quiz/Watermark'; 
import TimerDisplay from '../quiz/TimerDisplay'; 

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
        if (quizState.isInfractionActive && !showWarningModal) {
            setShowWarningModal(true); 
        }
    }, [quizState.isInfractionActive, showWarningModal]);

    const handleClose = () => {
        if (showWarningModal) {
             quizState.setIsInfractionActive(false);
        }

        const antiCheatEnabled = (quiz?.settings?.enabled ?? false) && (quiz?.settings?.lockOnLeave ?? false);

        if (isOpen && classId && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !isTeacherView && antiCheatEnabled && quizState.isAvailable) {
            setShowWarningModal(true); 
        } else {
            onClose(); 
        }
    };

    const handleStayInQuiz = () => {
        setShowWarningModal(false);
        if (!quizState.isLocked) {
             quizState.setIsInfractionActive(false);
        }

        if (quizState.isLocked) {
            onClose();
        }
    };

    const handleLeaveQuiz = async () => {
        await quizState.issueWarning('general'); 
        setShowWarningModal(false);
        quizState.setIsInfractionActive(false);
        onClose();
    };

    const handleExportPdf = () => {
        exportPdfUtil(quiz, showToast);
    };

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

    useEffect(() => {
        if (isOpen) { window.addEventListener('keydown', handleKeyDown); }
        else { window.removeEventListener('keydown', handleKeyDown); }
        return () => { window.removeEventListener('keydown', handleKeyDown); };
    }, [isOpen, handleKeyDown]);

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
            <Dialog open={isOpen} onClose={handleClose} static={true} className="fixed inset-0 z-[100] flex items-center justify-center font-sans">
                {/* Immersive Backdrop */}
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" aria-hidden="true" />
                
                {/* Main Container: Glass Sheet */}
                <DialogPanel className={`
                    quiz-container relative flex flex-col w-full max-w-4xl h-[100dvh] md:h-[92vh] 
                    bg-[#F3F4F6] dark:bg-[#0F172A] 
                    md:rounded-[32px] shadow-2xl overflow-hidden 
                    border-0 md:border border-white/20 dark:border-white/10
                    ${quizThemeClass}
                `}>
                    
                    {/* Watermark Layer */}
                    <div className="absolute inset-0 pointer-events-none z-0 opacity-50">
                        <Watermark
                            userProfile={userProfile}
                            quizSettings={quiz?.settings}
                            isTeacherView={isTeacherView}
                        />
                    </div>
                    
                    {/* --- HEADER --- */}
                    <header className="relative z-20 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 transition-colors">
                        <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4">
                            
                            {/* Left: Title & Export */}
                            <div className="flex flex-col min-w-0 pr-4">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate tracking-tight leading-tight">
                                    {quiz?.title || "Quiz"}
                                </h2>
                                
                                {/* Teacher Export Button */}
                                {isTeacherView && (
                                    <button 
                                        onClick={handleExportPdf} 
                                        className="flex items-center gap-1.5 mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                    >
                                        <DocumentArrowDownIcon className="h-3.5 w-3.5"/> 
                                        <span>Export PDF</span>
                                    </button>
                                )}
                            </div>

                            {/* Right: Timer, Anti-Cheat, Close */}
                            <div className="flex items-center gap-3">
                                
                                {/* Warning Indicator (Conditionally Rendered) */}
                                {!isTeacherView && classId && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && (quiz?.settings?.enabled ?? false) && (quiz?.settings?.lockOnLeave ?? false) && quizState.isAvailable && (
                                    <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full shadow-sm animate-pulse-slow" title="Anti-cheat warnings">
                                        <ShieldExclamationIcon className="w-4 h-4"/>
                                        <span className="text-xs font-bold tabular-nums">{quizState.warnings}/{quizState.MAX_WARNINGS}</span>
                                    </div>
                                )}

                                {/* Timer Display Wrapper */}
                                <div className="bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
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
                                </div>

                                {/* Close Button */}
                                <button 
                                    onClick={handleClose} 
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-all duration-200 shadow-sm" 
                                    aria-label="Close Quiz"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Teacher Warning Banner */}
                        {isTeacherView && (
                            <div className="w-full bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30 py-1.5 px-4 text-center">
                                <p className="text-[10px] sm:text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                    Teacher Preview Mode • Answers Visible • Anti-Cheat Inactive
                                </p>
                            </div>
                        )}
                    </header>

                    {/* --- CONTENT AREA --- */}
                    <div className="relative z-20 flex-grow overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-black/20">
                        <div className="max-w-3xl mx-auto w-full px-4 py-6 sm:px-6 sm:py-8">
                            {/* White Paper Card Effect */}
                            <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white/50 dark:border-white/5 p-1 sm:p-2">
                                <QuizContext.Provider value={quizState}>
                                    <QuizContent />
                                </QuizContext.Provider>
                            </div>
                        </div>
                    </div>

                    {/* --- FOOTER --- */}
                    <footer className="relative z-20 flex-shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/60 dark:border-white/5 p-4 sm:px-6">
                        {(!isTeacherView && quizState.isAvailable && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !quizState.questionResult && !quizState.matchingResult) && (
                            (quizState.currentQuestionAttempted || (quizState.shuffledQuestions[quizState.currentQ]?.type === 'essay' && quizState.userAnswers[quizState.currentQ]?.trim())) ? (
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-5xl mx-auto">
                                    
                                    {/* Question Info */}
                                    <div className="flex flex-col items-center sm:items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                Question {quizState.renderQuestionNumber()}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {quizState.shuffledQuestions[quizState.currentQ]?.points || 0} PTS
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                            Attempt {quizState.attemptsTaken + 1} of {quizState.maxAttempts}
                                        </span>
                                    </div>

                                    {/* Navigation Controls */}
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        {!(quiz?.settings?.preventBackNavigation) && quizState.currentQ > 0 && (
                                            <button
                                                onClick={() => {
                                                    quizState.setCurrentQuestionAttempted(false);
                                                    quizState.setQuestionResult(null);
                                                    quizState.setMatchingResult(null);
                                                    quizState.setCurrentQ(prev => prev - 1);
                                                    quizState.setQuestionStartTime(Date.now());
                                                }}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
                                                aria-label="Previous Question"
                                            >
                                                <ArrowLeftIcon className="h-4 w-4"/> Back
                                            </button>
                                        )}

                                        {quizState.currentQ < quizState.shuffledQuestions.length - 1 ? (
                                            <button
                                                onClick={quizState.handleNextQuestion}
                                                disabled={quizState.shuffledQuestions[quizState.currentQ]?.type === 'essay' && !quizState.userAnswers[quizState.currentQ]?.trim()}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                                aria-label="Next Question"
                                            >
                                                Next <ArrowRightIcon className="h-4 w-4"/>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={quizState.handleSubmit}
                                                disabled={quizState.shuffledQuestions[quizState.currentQ]?.type === 'essay' && !quizState.userAnswers[quizState.currentQ]?.trim()}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                                aria-label="Submit Quiz"
                                            >
                                                Submit Quiz
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : null
                        )}

                        {/* Teacher Navigation Controls */}
                        {isTeacherView && quizState.shuffledQuestions.length > 0 && (
                            <div className="flex justify-between items-center max-w-3xl mx-auto">
                                <button
                                    onClick={() => {
                                        quizState.setCurrentQ(prev => Math.max(0, prev - 1));
                                        quizState.setQuestionStartTime(Date.now());
                                    }}
                                    disabled={quizState.currentQ === 0}
                                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
                                >
                                    <ArrowLeftIcon className="h-3.5 w-3.5"/> Prev
                                </button>

                                <div className="text-center">
                                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                                        Item {quizState.currentQ + 1} <span className="text-slate-400 dark:text-slate-600">/</span> {quizState.shuffledQuestions.length}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        {quizState.shuffledQuestions[quizState.currentQ]?.points || 0} Points
                                    </span>
                                </div>

                                <button
                                    onClick={() => {
                                        quizState.setCurrentQ(prev => Math.min(quizState.shuffledQuestions.length - 1, prev + 1));
                                        quizState.setQuestionStartTime(Date.now());
                                    }}
                                    disabled={quizState.currentQ === quizState.shuffledQuestions.length - 1}
                                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
                                >
                                    Next <ArrowRightIcon className="h-3.5 w-3.5"/>
                                </button>
                            </div>
                        )}
                    </footer>
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