import React, { useState, useEffect, useCallback, createContext, useContext, memo, useMemo } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    XMarkIcon, 
    DocumentArrowDownIcon, 
    ShieldExclamationIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon // Added for the internal warning UI
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext'; 
import { useTheme } from '../../contexts/ThemeContext';
import { handleExportPdf as exportPdfUtil } from './quiz/quizUtils'; 
import QuizContent from './quiz/QuizContent';

// --- IMPORTS ---
import QuizNotAvailable from './quiz/QuizNotAvailable';
import QuizLockedView from './quiz/QuizLockedView';

import useQuizState from '../../hooks/useQuizState'; 
import Watermark from '../quiz/Watermark'; 
import TimerDisplay from '../quiz/TimerDisplay'; 

const QuizContext = createContext(null);
export const useQuiz = () => useContext(QuizContext);

// --- ONE UI 8.5 STYLE ENGINE ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    switch (activeOverlay) {
        case 'christmas': return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30' };
        case 'valentines': return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/30' };
        case 'graduation': return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30' };
        case 'rainy': return { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/30' };
        case 'cyberpunk': return { text: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', border: 'border-fuchsia-200 dark:border-fuchsia-800', gradient: 'from-fuchsia-500 to-purple-600', shadow: 'shadow-fuchsia-500/30' };
        case 'space': return { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', gradient: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-500/30' };
        default: return null;
    }
};

// --- ANIMATION VARIANTS ---
const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
        opacity: 1, scale: 1, y: 0, 
        transition: { type: "spring", damping: 25, stiffness: 300, mass: 0.5 } 
    },
    exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.15 } },
};

const questionVariants = {
    initial: (direction) => ({ opacity: 0, x: direction > 0 ? 50 : -50 }),
    animate: { opacity: 1, x: 0 },
    exit: (direction) => ({ opacity: 0, x: direction > 0 ? -50 : 50 })
};

// --- INTERNAL WARNING OVERLAY (Replaces External Modal to Fix Z-Index/Focus Issues) ---
const InternalWarningOverlay = ({ onStay, onLeave, warnings, maxWarnings, isLocked }) => (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/10 transform transition-all scale-100">
            <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isLocked ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    {isLocked ? <ShieldExclamationIcon className="w-8 h-8" /> : <ExclamationTriangleIcon className="w-8 h-8" />}
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {isLocked ? "Quiz Locked" : "Warning Issued"}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                    {isLocked 
                        ? "This quiz has been locked due to suspicious activity. Please contact your teacher."
                        : `You are attempting to leave the quiz area. This will be recorded as a warning (${warnings + 1}/${maxWarnings}).`
                    }
                </p>
                
                <div className="flex gap-3 w-full">
                    {!isLocked && (
                        <button 
                            onClick={onStay}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Stay
                        </button>
                    )}
                    <button 
                        onClick={onLeave}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${isLocked ? 'bg-slate-700 w-full' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'}`}
                    >
                        {isLocked ? "Close Quiz" : "Leave Anyway"}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// --- MEMOIZED HEADER ---
const QuizHeaderStatic = memo(({ title, isTeacherView, onExportPdf, onClose, quizState, classId, quiz, monet }) => {
    const showAntiCheat = !isTeacherView && classId && !quizState.isLocked && quizState.score === null && 
                          !quizState.hasSubmitted && (quiz?.settings?.enabled ?? false) && 
                          (quiz?.settings?.lockOnLeave ?? false) && quizState.isAvailable;

    const iconBtn = `w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 shadow-sm border border-transparent`;

    return (
        <div className="relative z-20 flex justify-between items-center px-6 py-4 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 flex-shrink-0">
            <div className="flex flex-col gap-0.5 max-w-[60%]">
                <h2 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white line-clamp-1">
                    {title || "Quiz"}
                </h2>
                {isTeacherView && (
                    <button onClick={onExportPdf} className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${monet ? monet.text : 'text-blue-600 dark:text-blue-400'}`}>
                        <DocumentArrowDownIcon className="h-3 w-3"/> <span>PDF</span>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                {showAntiCheat && (
                    <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full">
                        <ShieldExclamationIcon className="w-4 h-4"/>
                        <span className="text-xs font-bold tabular-nums">{quizState.warnings}/{quizState.MAX_WARNINGS}</span>
                    </div>
                )}

                <div className={`px-3 py-1.5 rounded-xl border ${monet ? `${monet.bg} ${monet.border}` : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
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

                <button 
                    onClick={onClose} 
                    className={`${iconBtn} bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30`}
                >
                    <XMarkIcon className="h-5 w-5 stroke-2" />
                </button>
            </div>
        </div>
    );
});

// --- MEMOIZED FOOTER ---
const QuizFooterStudent = memo(({ quizState, preventBack, onBack, onNext, onSubmit, currentQType, currentAnswer, monet }) => {
    const isEssayEmpty = currentQType === 'essay' && !currentAnswer?.trim();
    
    const primaryBtnClass = monet
        ? `flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-[1.5rem] bg-gradient-to-r ${monet.gradient} text-white font-bold text-[14px] shadow-lg ${monet.shadow} hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none`
        : `flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-[1.5rem] bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[14px] shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none`;

    const tonalBtnClass = monet 
        ? `flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-[1.5rem] ${monet.bg} ${monet.text} border ${monet.border} font-bold text-[14px] hover:opacity-80 active:scale-95 transition-all`
        : `flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-[1.5rem] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-[14px] hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 transition-all`;

    const totalQuestions = quizState.shuffledQuestions.length || 1;
    const progressPercent = Math.round(((quizState.currentQ + 1) / totalQuestions) * 100);

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-5xl mx-auto w-full">
            <div className="flex flex-col items-center sm:items-start">
                <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                        Question {quizState.renderQuestionNumber()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${monet ? `${monet.bg} ${monet.text}` : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                        {quizState.shuffledQuestions[quizState.currentQ]?.points || 0} PTS
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${monet ? `bg-gradient-to-r ${monet.gradient}` : 'bg-blue-500'}`} 
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {progressPercent}%
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
                {!preventBack && quizState.currentQ > 0 && (
                    <button onClick={onBack} className={tonalBtnClass}>
                        <ChevronLeftIcon className="h-4 w-4 stroke-2"/> Back
                    </button>
                )}

                {quizState.currentQ < quizState.shuffledQuestions.length - 1 ? (
                    <button onClick={onNext} disabled={isEssayEmpty} className={primaryBtnClass}>
                        Next <ChevronRightIcon className="h-4 w-4 stroke-2"/>
                    </button>
                ) : (
                    <button onClick={onSubmit} disabled={isEssayEmpty} className={primaryBtnClass}>
                        Submit <CheckCircleIcon className="h-4 w-4 stroke-2"/>
                    </button>
                )}
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---
export default function ViewQuizModal({ isOpen, onClose, onComplete, quiz, userProfile, classId, isTeacherView = false, postId }) {
    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);
    
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
    const [direction, setDirection] = useState(0); 

    useEffect(() => {
        if (quizState.isInfractionActive && !showWarningModal) setShowWarningModal(true); 
    }, [quizState.isInfractionActive, showWarningModal]);

    const handleExportPdf = useCallback(() => {
        exportPdfUtil(quiz, showToast);
    }, [quiz, showToast]);

    const handleClose = useCallback(() => {
        if (showWarningModal) quizState.setIsInfractionActive(false);
        const antiCheatEnabled = (quiz?.settings?.enabled ?? false) && (quiz?.settings?.lockOnLeave ?? false);
        
        if (isOpen && classId && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !isTeacherView && antiCheatEnabled && quizState.isAvailable) {
            setShowWarningModal(true); 
        } else {
            onClose(); 
        }
    }, [showWarningModal, isOpen, classId, quizState, isTeacherView, quiz, onClose]);

    const navigateNext = useCallback(() => {
        setDirection(1);
        quizState.handleNextQuestion();
    }, [quizState]);

    const navigateBack = useCallback(() => {
        setDirection(-1);
        quizState.setCurrentQuestionAttempted(false);
        quizState.setQuestionResult(null);
        quizState.setMatchingResult(null);
        quizState.setCurrentQ(prev => prev - 1);
        quizState.setQuestionStartTime(Date.now());
    }, [quizState]);

    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

    const handleDragEnd = (e, { offset, velocity }) => {
        if (quizState.score !== null || quizState.isLocked) return;
        const swipe = swipePower(offset.x, velocity.x);
        const currentQuestionType = quizState.shuffledQuestions[quizState.currentQ]?.type;
        const canNavigate = quizState.currentQuestionAttempted || currentQuestionType === 'essay';

        if (swipe < -swipeConfidenceThreshold && canNavigate) {
            if (quizState.currentQ < quizState.shuffledQuestions.length - 1) navigateNext();
        } else if (swipe > swipeConfidenceThreshold) {
            if (!quiz?.settings?.preventBackNavigation && quizState.currentQ > 0) navigateBack();
        }
    };

    const handleKeyDown = useCallback((event) => {
        if (quizState.score !== null || quizState.isLocked || quizState.showReview || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        const currentQuestion = quizState.shuffledQuestions[quizState.currentQ];
        const canNavigate = quizState.currentQuestionAttempted || currentQuestion?.type === 'essay';

        if (event.key === 'ArrowRight') {
            if (isTeacherView) {
                if (quizState.currentQ < quizState.shuffledQuestions.length - 1) {
                    setDirection(1);
                    quizState.setCurrentQ(prev => prev + 1);
                }
            } else if (canNavigate) navigateNext();
        } else if (event.key === 'ArrowLeft') {
            if (quiz?.settings?.preventBackNavigation && !isTeacherView) return;
            if (quizState.currentQ > 0) {
                if (isTeacherView) {
                    setDirection(-1);
                    quizState.setCurrentQ(prev => prev - 1);
                } else navigateBack();
            }
        }
    }, [quizState, isTeacherView, quiz?.settings?.preventBackNavigation, navigateNext, navigateBack]);

    useEffect(() => {
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        else window.removeEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    const renderQuizBody = () => {
        if (quizState.loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>; 
        if (!isTeacherView && !quizState.isAvailable) return <QuizNotAvailable />;
        if (quizState.isLocked) return <QuizLockedView />;
        return <QuizContent />;
    };

    if (!isOpen) return null;

    // View Logic
    const showStudentFooter = (!isTeacherView && quizState.isAvailable && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !quizState.questionResult && !quizState.matchingResult);
    const canShowStudentControls = (quizState.currentQuestionAttempted || (quizState.shuffledQuestions[quizState.currentQ]?.type === 'essay' && quizState.userAnswers[quizState.currentQ]?.trim()));
    const currentQType = quizState.shuffledQuestions[quizState.currentQ]?.type;
    const currentAnswer = quizState.userAnswers[quizState.currentQ];

    return (
        <Dialog open={isOpen} onClose={handleClose} className="fixed inset-0 z-[10000] flex items-center justify-center font-sans">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-md will-change-opacity" 
                aria-hidden="true" 
            />
            
            <DialogPanel 
                as={motion.div}
                variants={modalVariants}
                initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-4xl h-[95vh] md:h-[90vh] flex flex-col rounded-[2.5rem] bg-[#F9F9F9] dark:bg-[#101010] shadow-2xl border border-white/40 dark:border-white/10 transform-gpu will-change-transform overflow-hidden"
            >
                <div className="absolute inset-0 pointer-events-none z-0 opacity-50">
                    <Watermark userProfile={userProfile} quizSettings={quiz?.settings} isTeacherView={isTeacherView} />
                </div>
                
                <QuizHeaderStatic 
                    title={quiz?.title}
                    isTeacherView={isTeacherView}
                    onExportPdf={handleExportPdf}
                    onClose={handleClose}
                    quizState={quizState}
                    classId={classId}
                    quiz={quiz}
                    monet={monet}
                />

                <main className="flex-1 overflow-y-auto custom-scrollbar relative p-4 sm:p-6 md:p-8">
                    <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
                        <AnimatePresence mode='wait' custom={direction}>
                            <motion.div
                                key={quizState.currentQ}
                                custom={direction}
                                variants={questionVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="flex-1 touch-pan-y"
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.1}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] shadow-sm border border-white/50 dark:border-white/5 p-6 md:p-8 min-h-[50vh]">
                                    <QuizContext.Provider value={quizState}>
                                        {renderQuizBody()}
                                    </QuizContext.Provider>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                <footer className="relative z-20 flex-shrink-0 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 p-4 sm:px-6">
                    {showStudentFooter && canShowStudentControls && (
                        <QuizFooterStudent 
                            quizState={quizState}
                            preventBack={quiz?.settings?.preventBackNavigation}
                            onBack={navigateBack}
                            onNext={navigateNext}
                            onSubmit={quizState.handleSubmit}
                            currentQType={currentQType}
                            currentAnswer={currentAnswer}
                            monet={monet}
                        />
                    )}

                    {isTeacherView && quizState.shuffledQuestions.length > 0 && (
                        <div className="flex justify-between items-center max-w-3xl mx-auto">
                            <button
                                onClick={() => { setDirection(-1); quizState.setCurrentQ(prev => Math.max(0, prev - 1)); }}
                                disabled={quizState.currentQ === 0}
                                className="flex items-center gap-1 px-5 py-2.5 rounded-[1rem] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30"
                            >
                                <ChevronLeftIcon className="h-4 w-4"/> Prev
                            </button>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {quizState.currentQ + 1} / {quizState.shuffledQuestions.length}
                            </span>
                            <button
                                onClick={() => { setDirection(1); quizState.setCurrentQ(prev => Math.min(quizState.shuffledQuestions.length - 1, prev + 1)); }}
                                disabled={quizState.currentQ === quizState.shuffledQuestions.length - 1}
                                className="flex items-center gap-1 px-5 py-2.5 rounded-[1rem] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30"
                            >
                                Next <ChevronRightIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    )}
                </footer>
                
                {/* --- INLINED WARNING OVERLAY --- */}
                {/* Because this is inside the DialogPanel, it shares the same Focus Context. */}
                {/* Z-Index 100 ensures it sits on top of all quiz content (Z-0) */}
                {showWarningModal && (
                    <InternalWarningOverlay
                        warnings={quizState.warnings}
                        maxWarnings={quizState.MAX_WARNINGS}
                        onStay={() => { setShowWarningModal(false); if (!quizState.isLocked) quizState.setIsInfractionActive(false); if (quizState.isLocked) onClose(); }}
                        onLeave={async () => { await quizState.issueWarning('general'); setShowWarningModal(false); quizState.setIsInfractionActive(false); onClose(); }}
                        isLocked={quizState.isLocked}
                    />
                )}
            </DialogPanel>
        </Dialog>
    );
}