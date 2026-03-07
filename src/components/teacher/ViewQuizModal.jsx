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
    ExclamationTriangleIcon,
    PlayIcon,
    ChevronUpIcon,
    ArrowUturnLeftIcon // Added for the return-to-skipped button
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
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

// --- ANDROID 17 STYLE ENGINE ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    switch (activeOverlay) {
        case 'christmas': return { text: 'text-emerald-900 dark:text-emerald-50', bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-transparent', gradient: 'bg-emerald-600 dark:bg-emerald-500', shadow: 'shadow-emerald-500/20' };
        case 'valentines': return { text: 'text-rose-900 dark:text-rose-50', bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-transparent', gradient: 'bg-rose-600 dark:bg-rose-500', shadow: 'shadow-rose-500/20' };
        case 'graduation': return { text: 'text-amber-900 dark:text-amber-50', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-transparent', gradient: 'bg-amber-600 dark:bg-amber-500', shadow: 'shadow-amber-500/20' };
        case 'rainy': return { text: 'text-cyan-900 dark:text-cyan-50', bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-transparent', gradient: 'bg-cyan-600 dark:bg-cyan-500', shadow: 'shadow-cyan-500/20' };
        case 'cyberpunk': return { text: 'text-fuchsia-900 dark:text-fuchsia-50', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', border: 'border-transparent', gradient: 'bg-fuchsia-600 dark:bg-fuchsia-500', shadow: 'shadow-fuchsia-500/20' };
        case 'space': return { text: 'text-indigo-900 dark:text-indigo-50', bg: 'bg-indigo-100 dark:bg-indigo-900/40', border: 'border-transparent', gradient: 'bg-indigo-600 dark:bg-indigo-500', shadow: 'shadow-indigo-500/20' };
        default: return null;
    }
};

// --- PERFORMANCE OPTIMIZED ANIMATIONS ---
const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
        opacity: 1, scale: 1, y: 0, 
        transition: { type: "tween", ease: "easeOut", duration: 0.25 } 
    },
    exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.15, ease: "easeIn" } },
};

const questionVariants = {
    initial: (direction) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
    animate: { opacity: 1, x: 0, transition: { type: "tween", ease: "circOut", duration: 0.3 } },
    exit: (direction) => ({ opacity: 0, x: direction > 0 ? -40 : 40, transition: { duration: 0.2 } })
};

// --- INTERNAL WARNING OVERLAY ---
const InternalWarningOverlay = ({ onStay, onLeave, warnings, maxWarnings, isLocked }) => (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
        <div className="bg-[#FAF9F6] dark:bg-[#1C1C1E] rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-black/5 dark:border-white/5 transform transition-all scale-100">
            <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${isLocked ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {isLocked ? <ShieldExclamationIcon className="w-10 h-10" /> : <ExclamationTriangleIcon className="w-10 h-10" />}
                </div>
                
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 mb-3 tracking-tight">
                    {isLocked ? "Quiz Locked" : "Warning Issued"}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-sm">
                    {isLocked 
                        ? "This quiz has been locked due to suspicious activity. Please contact your teacher."
                        : `You are attempting to leave the quiz area. This will be recorded as a warning (${warnings + 1}/${maxWarnings}).`
                    }
                </p>
                
                <div className="flex flex-col gap-3 w-full">
                    <button 
                        onClick={onLeave}
                        className={`w-full py-4 rounded-full font-semibold text-white shadow-md transition-transform active:scale-[0.98] ${isLocked ? 'bg-slate-800 dark:bg-slate-700' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
                    >
                        {isLocked ? "Close Quiz" : "Leave Anyway"}
                    </button>
                    {!isLocked && (
                        <button 
                            onClick={onStay}
                            className="w-full py-4 rounded-full font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-[0.98]"
                        >
                            Stay Here
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// --- MEMOIZED HEADER ---
const QuizHeaderStatic = memo(({ title, isTeacherView, isMockupMode, toggleMockup, onExportPdf, onClose, quizState, classId, quiz, monet }) => {
    const effectiveIsTeacherView = isTeacherView && !isMockupMode;
    const showAntiCheat = !effectiveIsTeacherView && classId && !quizState.isLocked && quizState.score === null && 
                          !quizState.hasSubmitted && (quiz?.settings?.enabled ?? false) && 
                          (quiz?.settings?.lockOnLeave ?? false) && quizState.isAvailable;

    const iconBtn = `w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all active:scale-95`;

    return (
        <div className="relative z-20 flex justify-between items-center px-4 sm:px-6 py-4 md:py-5 bg-[#FAF9F6] dark:bg-[#121212] border-b border-black/5 dark:border-white/5 flex-shrink-0">
            <div className="flex flex-col gap-1 max-w-[40%] md:max-w-[50%]">
                <h2 className="text-base md:text-xl font-semibold tracking-tight text-slate-900 dark:text-white line-clamp-1">
                    {title || "Assessment"}
                </h2>
                <div className="flex items-center gap-2">
                    {isTeacherView && (
                        <button onClick={onExportPdf} className={`flex items-center w-fit gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${monet ? `${monet.bg} ${monet.text}` : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            <DocumentArrowDownIcon className="h-3.5 w-3.5"/> <span>PDF</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {isTeacherView && (
                    <button 
                        onClick={toggleMockup}
                        className={`hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${isMockupMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-slate-200/50 text-slate-600 dark:bg-white/10 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20'}`}
                    >
                        <PlayIcon className="h-4 w-4" />
                        {isMockupMode ? "Exit Mockup" : "Test Quiz"}
                    </button>
                )}

                {showAntiCheat && (
                    <div className="hidden sm:flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-4 py-2 rounded-full">
                        <ShieldExclamationIcon className="w-4 h-4"/>
                        <span className="text-xs font-bold tabular-nums tracking-wide">{quizState.warnings} / {quizState.MAX_WARNINGS}</span>
                    </div>
                )}

                <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full ${monet ? monet.bg : 'bg-slate-200/50 dark:bg-white/10'}`}>
                    <TimerDisplay
                        timeRemaining={quizState.timeRemaining}
                        quizSettings={quiz?.settings}
                        isTeacherView={effectiveIsTeacherView}
                        loading={quizState.loading}
                        isLocked={quizState.isLocked}
                        isAvailable={quizState.isAvailable}
                        score={quizState.score}
                        hasSubmitted={quizState.hasSubmitted}
                    />
                </div>

                <button 
                    onClick={onClose} 
                    className={`${iconBtn} bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20`}
                >
                    <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 stroke-2" />
                </button>
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---
export default function ViewQuizModal({ isOpen, onClose, onComplete, quiz, userProfile, classId, isTeacherView = false, postId }) {
    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);
    
    const [isMockupMode, setIsMockupMode] = useState(false);
    const effectiveIsTeacherView = isTeacherView && !isMockupMode;
    const [showQuestionJumper, setShowQuestionJumper] = useState(false);
    
    const quizState = useQuizState({
        isOpen,
        quiz,
        userProfile,
        classId,
        isTeacherView: effectiveIsTeacherView, 
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
        setIsMockupMode(false); 
        setShowQuestionJumper(false);
        if (showWarningModal) quizState.setIsInfractionActive(false);
        const antiCheatEnabled = (quiz?.settings?.enabled ?? false) && (quiz?.settings?.lockOnLeave ?? false);
        
        if (isOpen && classId && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !effectiveIsTeacherView && antiCheatEnabled && quizState.isAvailable) {
            setShowWarningModal(true); 
        } else {
            onClose(); 
        }
    }, [showWarningModal, isOpen, classId, quizState, effectiveIsTeacherView, quiz, onClose]);

    const navigateNext = useCallback(() => {
        setDirection(1);
        setShowQuestionJumper(false);
        quizState.handleNextQuestion();
    }, [quizState]);

    const navigateBack = useCallback(() => {
        setDirection(-1);
        setShowQuestionJumper(false);
        quizState.setCurrentQuestionAttempted(false);
        quizState.setQuestionResult(null);
        quizState.setMatchingResult(null);
        quizState.setCurrentQ(prev => prev - 1);
        quizState.setQuestionStartTime(Date.now());
    }, [quizState]);

    const jumpToQuestion = useCallback((index) => {
        if (index === quizState.currentQ) return;
        setDirection(index > quizState.currentQ ? 1 : -1);
        quizState.setCurrentQ(index);
        setShowQuestionJumper(false);
    }, [quizState]);

    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

    // Helper function to check if a specific question is answered
    const checkIsAnswered = useCallback((idx) => {
        const ans = quizState.userAnswers[idx];
        if (ans === undefined || ans === null) return false;
        if (typeof ans === 'string' && ans.trim() === '') return false;
        if (Array.isArray(ans) && ans.length === 0) return false;
        if (typeof ans === 'object' && Object.keys(ans).length === 0) return false;
        return true;
    }, [quizState.userAnswers]);

    const handleDragEnd = (e, { offset, velocity }) => {
        if (quizState.score !== null || quizState.isLocked) return;
        const swipe = swipePower(offset.x, velocity.x);
        
        // Prevent swiping back if teacher strictly prevents it
        const isPreventBack = !effectiveIsTeacherView && quiz?.settings?.preventBackNavigation;

        if (swipe < -swipeConfidenceThreshold) {
            if (quizState.currentQ < quizState.shuffledQuestions.length - 1) {
                 // Disallow swiping forward without answering ONLY if preventBack is true
                if (isPreventBack && !checkIsAnswered(quizState.currentQ)) return;
                navigateNext();
            }
        } else if (swipe > swipeConfidenceThreshold) {
            if (!isPreventBack && quizState.currentQ > 0) navigateBack();
        }
    };

    const handleKeyDown = useCallback((event) => {
        if (quizState.score !== null || quizState.isLocked || quizState.showReview || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        const isPreventBack = !effectiveIsTeacherView && quiz?.settings?.preventBackNavigation;

        if (event.key === 'ArrowRight') {
            if (quizState.currentQ < quizState.shuffledQuestions.length - 1) {
                // Disallow arrow forward without answering ONLY if preventBack is true
                if (isPreventBack && !checkIsAnswered(quizState.currentQ)) return;
                navigateNext();
            }
        } else if (event.key === 'ArrowLeft') {
            if (!isPreventBack && quizState.currentQ > 0) navigateBack();
        }
    }, [quizState, effectiveIsTeacherView, quiz?.settings?.preventBackNavigation, navigateNext, navigateBack, checkIsAnswered]);

    useEffect(() => {
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        else window.removeEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    const renderQuizBody = () => {
        if (quizState.loading) return <div className="flex h-full items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>; 
        if (!effectiveIsTeacherView && !quizState.isAvailable) return <QuizNotAvailable />;
        if (quizState.isLocked) return <QuizLockedView />;
        return <QuizContent />;
    };

    if (!isOpen) return null;

    // View Logic
    const showStudentFooter = (!effectiveIsTeacherView && quizState.isAvailable && !quizState.isLocked && quizState.score === null && !quizState.hasSubmitted && !quizState.questionResult && !quizState.matchingResult);
    const preventBack = quiz?.settings?.preventBackNavigation ?? false;
    const totalQuestions = quizState.shuffledQuestions.length || 1;

    const handleMockupSubmit = () => {
        showToast("Mockup complete! This test run was not saved to the database.", "success");
        setIsMockupMode(false);
        onClose();
    };

    const isDockVisible = showStudentFooter || (effectiveIsTeacherView && totalQuestions > 0);

    // Find the first unanswered question
    const firstUnansweredQ = (() => {
        for (let i = 0; i < totalQuestions; i++) {
            if (!checkIsAnswered(i)) return i;
        }
        return -1;
    })();
    const allAnswered = firstUnansweredQ === -1;

    return (
        <Dialog open={isOpen} onClose={handleClose} className="fixed inset-0 z-[10000] flex items-center justify-center font-sans md:p-6">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 will-change-opacity" 
                aria-hidden="true" 
            />
            
            <DialogPanel 
                as={motion.div}
                variants={modalVariants}
                initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-5xl h-[100dvh] md:h-[90dvh] flex flex-col md:rounded-[3rem] bg-[#FAF9F6] dark:bg-[#121212] shadow-2xl transform-gpu will-change-transform overflow-hidden"
            >
                <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                    <Watermark userProfile={userProfile} quizSettings={quiz?.settings} isTeacherView={effectiveIsTeacherView} />
                </div>
                
                <QuizHeaderStatic 
                    title={quiz?.title}
                    isTeacherView={isTeacherView} 
                    isMockupMode={isMockupMode}
                    toggleMockup={() => setIsMockupMode(!isMockupMode)}
                    onExportPdf={handleExportPdf}
                    onClose={handleClose}
                    quizState={quizState}
                    classId={classId}
                    quiz={quiz}
                    monet={monet}
                />

                <main className="flex-1 overflow-y-auto custom-scrollbar relative p-4 sm:p-6 md:p-8">
                    {/* ENHANCED PADDING: pb-44 gives plenty of clearance for the lower dock on mobile */}
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col pb-44 md:pb-32">
                        <AnimatePresence mode='wait' custom={direction}>
                            <motion.div
                                key={quizState.currentQ}
                                custom={direction}
                                variants={questionVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex-1 touch-pan-y will-change-transform"
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.02} 
                                onDragEnd={handleDragEnd}
                            >
                                <div className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] p-6 md:p-10 min-h-[50vh] border border-black/[0.05] dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
                                    <QuizContext.Provider value={quizState}>
                                        {renderQuizBody()}
                                    </QuizContext.Provider>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                {/* --- FLOATING BOTTOM ACTION BAR (Material You Dock) --- */}
                {isDockVisible && (
                    // MODIFIED MOBILE PADDING: Shifted to bottom-3 to reclaim vertical screen estate on phones
                    <div className="absolute bottom-3 sm:bottom-6 md:bottom-8 left-0 right-0 px-2 sm:px-4 flex flex-col items-center z-30 pointer-events-none">
                        
                        {/* Question Jumper */}
                        <AnimatePresence>
                            {showQuestionJumper && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ type: "tween", duration: 0.2 }}
                                    className="mb-4 w-full max-w-[95%] sm:max-w-sm pointer-events-auto"
                                >
                                    <div className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-2xl p-2 rounded-[2rem] shadow-xl border border-black/5 dark:border-white/10 flex items-center overflow-x-auto custom-scrollbar no-scrollbar">
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            {quizState.shuffledQuestions.map((_, idx) => {
                                                const isAttempted = checkIsAnswered(idx);
                                                
                                                // Prevent jumping logic: Only prevent if PreventBack is ON
                                                const preventBackward = !effectiveIsTeacherView && preventBack && idx < quizState.currentQ;
                                                // Prevent jumping forward if PreventBack is ON and current question is unanswered (to stop them getting stuck)
                                                const preventForwardIfStrict = !effectiveIsTeacherView && preventBack && !checkIsAnswered(quizState.currentQ) && idx > quizState.currentQ;
                                                
                                                const isDisabled = preventBackward || preventForwardIfStrict;

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => !isDisabled && jumpToQuestion(idx)}
                                                        disabled={isDisabled}
                                                        className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-sm font-bold transition-all relative ${
                                                            quizState.currentQ === idx 
                                                                ? (monet ? `${monet.gradient} text-white shadow-md scale-110` : 'bg-blue-600 text-white shadow-md scale-110')
                                                                : isDisabled 
                                                                    ? 'bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-600 opacity-50 cursor-not-allowed'
                                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95'
                                                        }`}
                                                    >
                                                        {idx + 1}
                                                        {isAttempted && quizState.currentQ !== idx && !isDisabled && (
                                                            <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#2C2C2E]" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Main Navigation Dock */}
                        <div className="w-full max-w-[340px] sm:max-w-md bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-3xl border border-black/5 dark:border-white/10 p-2 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] pointer-events-auto flex items-center justify-between">
                            
                            {/* Back Button */}
                            <button 
                                onClick={navigateBack}
                                disabled={(!effectiveIsTeacherView && preventBack) || quizState.currentQ === 0}
                                className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-90 transition-all"
                            >
                                <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                            </button>

                            {/* Center Indicator / Jumper Toggle */}
                            <div className="flex-1 flex justify-center px-1 sm:px-2">
                                <button 
                                    onClick={() => setShowQuestionJumper(!showQuestionJumper)}
                                    className="flex items-center gap-1 sm:gap-1.5 px-3 py-2.5 sm:px-4 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                                >
                                    <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-wide">
                                        {quizState.currentQ + 1} <span className="text-slate-400 font-medium mx-0.5">/</span> {totalQuestions}
                                    </span>
                                    <ChevronUpIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 transition-transform duration-300 ${showQuestionJumper ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {/* Next / Submit Button */}
                            {quizState.currentQ < totalQuestions - 1 ? (
                                <button 
                                    onClick={navigateNext}
                                    // Disabled only if Prevent Back is ON and the student hasn't answered (traps them otherwise)
                                    disabled={!effectiveIsTeacherView && preventBack && !checkIsAnswered(quizState.currentQ)}
                                    className={`flex items-center justify-center gap-1.5 px-5 sm:px-6 h-12 sm:h-14 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 ${monet ? `${monet.gradient} text-white` : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                    <span>Next</span>
                                    <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-2" />
                                </button>
                            ) : (
                                (!allAnswered && !effectiveIsTeacherView) ? (
                                    // Auto-Redirect Button to Skipped Questions
                                    <button 
                                        onClick={() => jumpToQuestion(firstUnansweredQ)}
                                        className={`flex items-center justify-center gap-1.5 px-4 sm:px-6 h-12 sm:h-14 rounded-full font-bold text-[13px] sm:text-sm shadow-md active:scale-95 transition-all ${monet ? `${monet.gradient} text-white` : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                                    >
                                        <span className="hidden sm:inline">Answer Skipped (Q{firstUnansweredQ + 1})</span>
                                        <span className="sm:hidden">To Q{firstUnansweredQ + 1}</span>
                                        <ArrowUturnLeftIcon className="w-4 h-4 sm:w-4 sm:h-4 stroke-2" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={isMockupMode ? handleMockupSubmit : quizState.handleSubmit}
                                        disabled={!effectiveIsTeacherView && !allAnswered} // Safety lock
                                        className={`flex items-center justify-center gap-1.5 px-4 sm:px-6 h-12 sm:h-14 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 ${monet ? `${monet.gradient} text-white` : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                    >
                                        <span>Submit</span>
                                        <CheckCircleSolid className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                )
                            )}

                        </div>
                    </div>
                )}
                
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