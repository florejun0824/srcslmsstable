// src/components/teacher/StudentViewLessonModal.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    QueueListIcon,
    ArrowDownTrayIcon,
    QuestionMarkCircleIcon,
    DocumentArrowDownIcon,
    CloudArrowDownIcon,
    CloudIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import LessonPage from '../teacher/LessonPage';
import ContentRenderer from '../teacher/ContentRenderer';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

// --- CENTRALIZED EXPORT SERVICE ---
import { generatePdf } from '../../services/exportService';

// --- OFFLINE CONTENT SERVICE ---
import { saveLessonOffline, removeOfflineLesson, isLessonCachedOffline } from '../../services/offlineContentService';

// --- ANDROID 17 STYLE ENGINE ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    switch (activeOverlay) {
        case 'christmas': return { text: 'text-emerald-900 dark:text-emerald-50', bg: 'bg-emerald-100 dark:bg-emerald-900/40', gradient: 'bg-emerald-600 dark:bg-emerald-500' };
        case 'valentines': return { text: 'text-rose-900 dark:text-rose-50', bg: 'bg-rose-100 dark:bg-rose-900/40', gradient: 'bg-rose-600 dark:bg-rose-500' };
        case 'graduation': return { text: 'text-amber-900 dark:text-amber-50', bg: 'bg-amber-100 dark:bg-amber-900/40', gradient: 'bg-amber-600 dark:bg-amber-500' };
        case 'rainy': return { text: 'text-cyan-900 dark:text-cyan-50', bg: 'bg-cyan-100 dark:bg-cyan-900/40', gradient: 'bg-cyan-600 dark:bg-cyan-500' };
        case 'cyberpunk': return { text: 'text-fuchsia-900 dark:text-fuchsia-50', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', gradient: 'bg-fuchsia-600 dark:bg-fuchsia-500' };
        case 'space': return { text: 'text-indigo-900 dark:text-indigo-50', bg: 'bg-indigo-100 dark:bg-indigo-900/40', gradient: 'bg-indigo-600 dark:bg-indigo-500' };
        default: return null;
    }
};

// --- PERFORMANCE OPTIMIZED ANIMATIONS ---
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
};

const windowVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "tween", ease: "easeOut", duration: 0.25 } },
    exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.15, ease: "easeIn" } },
};

const pageVariants = {
    initial: (direction) => ({ opacity: 0, x: direction > 0 ? 30 : -30 }),
    animate: { opacity: 1, x: 0, transition: { type: "tween", ease: "circOut", duration: 0.3 } },
    exit: (direction) => ({ opacity: 0, x: direction > 0 ? -30 : 30, transition: { duration: 0.2 } })
};

export default function StudentViewLessonModal({ isOpen, onClose, onComplete, lesson, userId, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [direction, setDirection] = useState(1);
    const [maxPageReached, setMaxPageReached] = useState(0);
    const [xpAwarded, setXpAwarded] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [showPageJumper, setShowPageJumper] = useState(false);
    const [isCachedOffline, setIsCachedOffline] = useState(false);
    const [isSavingOffline, setIsSavingOffline] = useState(false);

    const { showToast } = useToast();
    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

    const contentRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);

    useEffect(() => {
        if (isOpen) {
            setCurrentPage(0);
            setMaxPageReached(0);
            setXpAwarded(false);
            setShowPageJumper(false);
            if (contentRef.current) contentRef.current.scrollTop = 0;
        }
    }, [isOpen]);

    // Check offline cache status
    useEffect(() => {
        if (isOpen && currentLesson?.id) {
            isLessonCachedOffline(currentLesson.id).then(setIsCachedOffline);
        }
    }, [isOpen, currentLesson?.id]);

    useEffect(() => {
        if (currentPage > maxPageReached) setMaxPageReached(currentPage);
    }, [currentPage, maxPageReached]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin" : "Objectives";
    const pageData = pages[currentPage];

    const scrollToTop = () => { if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: 'smooth' }); };

    const goToNextPage = useCallback(() => {
        if (currentPage < totalPages - 1) {
            setDirection(1);
            setCurrentPage(p => p + 1);
            setShowPageJumper(false);
            scrollToTop();
        }
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => {
        if (currentPage > 0) {
            setDirection(-1);
            setCurrentPage(p => p - 1);
            setShowPageJumper(false);
            scrollToTop();
        }
    }, [currentPage]);

    const jumpToPage = (index) => {
        if (index === currentPage) return;
        setDirection(index > currentPage ? 1 : -1);
        setCurrentPage(index);
        setShowPageJumper(false);
        scrollToTop();
    };

    const handleFinishLesson = async () => {
        if (xpAwarded) {
            handleClose();
            return;
        }
        if (!onComplete || totalPages === 0 || currentPage < totalPages - 1) return;
        try {
            await onComplete({ pagesRead: maxPageReached + 1, totalPages, isFinished: true, lessonId: currentLesson?.id || null });
            setXpAwarded(true);
            showToast("Lesson finished! XP Awarded.", "success");
        } catch (error) {
            showToast("Failed to finalize lesson progress.", "error");
        }
    };

    const handleClose = () => {
        if (!xpAwarded && onComplete && totalPages > 0) {
            onComplete({ pagesRead: maxPageReached + 1, totalPages, isFinished: currentPage === totalPages - 1, lessonId: currentLesson?.id || null });
        }
        onClose();
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') goToNextPage();
            else if (e.key === 'ArrowLeft') goToPreviousPage();
            else if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goToNextPage, goToPreviousPage, handleClose]);

    // --- DELEGATE PDF EXPORT TO exportService.js ---
    const handleExport = async () => {
        if (currentLesson.studyGuideUrl) {
            window.open(currentLesson.studyGuideUrl, '_blank');
            return;
        }

        if (exportingLessonId) return;
        setExportingLessonId(currentLesson.id);

        try {
            // Passing null for subject as it might not be fully available in this scope, 
            // exportService handles fallback gracefully.
            await generatePdf(currentLesson, { title: "SRCS Learning Portal" }, showToast);
        } catch (error) {
            console.error("Export Failed:", error);
            showToast("Failed to export PDF.", "error");
        } finally {
            setExportingLessonId(null);
        }
    };

    // --- OFFLINE SAVE/REMOVE ---
    const handleToggleOffline = async () => {
        if (!currentLesson) return;
        setIsSavingOffline(true);
        try {
            if (isCachedOffline) {
                await removeOfflineLesson(currentLesson.id);
                setIsCachedOffline(false);
                showToast('Removed from offline storage.', 'success');
            } else {
                await saveLessonOffline({
                    ...currentLesson,
                    className: className || '',
                });
                setIsCachedOffline(true);
                showToast('Lesson saved for offline reading!', 'success');
            }
        } catch (err) {
            showToast('Failed to update offline storage.', 'error');
        } finally {
            setIsSavingOffline(false);
        }
    };

    if (!isOpen || !currentLesson) return null;

    return (
        <Dialog open={isOpen} onClose={handleClose} className={`fixed inset-0 z-[5000] flex items-center justify-center font-sans md:p-6 ${className}`}>
            <motion.div
                variants={backdropVariants}
                initial="hidden" animate="visible" exit="exit"
                className="fixed inset-0 bg-black/60 will-change-opacity"
                aria-hidden="true"
            />

            <DialogPanel
                as={motion.div}
                variants={windowVariants}
                initial="hidden" animate="visible" exit="exit"
                className="relative w-full h-[100dvh] md:h-[90dvh] md:max-w-5xl flex flex-col md:rounded-[3rem] bg-[#FAF9F6] dark:bg-[#121212] shadow-2xl transform-gpu will-change-transform overflow-hidden"
            >
                {/* --- HEADER --- */}
                <header className="relative z-20 flex justify-between items-center px-4 sm:px-6 py-4 md:py-5 bg-[#FAF9F6] dark:bg-[#121212] border-b border-black/5 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-center w-[60px] sm:w-[100px]">
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-all active:scale-95"
                        >
                            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                        </button>
                    </div>

                    <div className="flex-1 flex justify-center px-2">
                        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50 truncate text-center max-w-[200px] sm:max-w-none">
                            {lessonTitle}
                        </h2>
                    </div>

                    <div className="flex items-center justify-end gap-2 w-auto sm:w-[160px]">
                        {/* Save Offline Button */}
                        <button
                            onClick={handleToggleOffline}
                            disabled={isSavingOffline}
                            className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${isCachedOffline
                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                }`}
                            title={isCachedOffline ? 'Remove from offline' : 'Save for offline'}
                        >
                            {isCachedOffline ? <CloudArrowDownIcon className="h-3.5 w-3.5" /> : <CloudIcon className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isCachedOffline ? 'Saved' : 'Offline'}</span>
                        </button>
                        {/* Export PDF Button */}
                        <button
                            onClick={handleExport}
                            disabled={!!exportingLessonId}
                            className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${monet ? `${monet.bg} ${monet.text}` : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}
                            title={currentLesson.studyGuideUrl ? "Download Study Guide" : "Export as PDF"}
                        >
                            {exportingLessonId ? (
                                <ArrowDownTrayIcon className="h-3.5 w-3.5 animate-bounce" />
                            ) : currentLesson.studyGuideUrl ? (
                                <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                            ) : (
                                <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">
                                {exportingLessonId ? 'Saving...' : currentLesson.studyGuideUrl ? 'Guide' : 'PDF'}
                            </span>
                        </button>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <main ref={contentRef} className="flex-1 overflow-y-auto custom-scrollbar relative bg-transparent scroll-smooth p-4 sm:p-6 md:p-8">
                    {/* ENHANCED PADDING for Mobile Dock Clearance */}
                    <div className="max-w-4xl mx-auto w-full min-h-full pb-44 md:pb-32">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentPage}
                                custom={direction}
                                variants={pageVariants}
                                initial="initial" animate="animate" exit="exit"
                                className="w-full min-h-full flex flex-col"
                            >
                                {/* Objectives (Page 1) */}
                                {currentPage === 0 && objectives.length > 0 && (
                                    <div className="mb-8 p-6 md:p-8 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 border border-transparent dark:border-blue-500/10 select-text">
                                        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-300 mb-4 select-none">
                                            <QueueListIcon className="h-5 w-5" />
                                            {objectivesLabel}
                                        </h3>
                                        <ul className="space-y-4">
                                            {objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-3 text-base text-blue-950 dark:text-blue-100/80">
                                                    <CheckCircleSolid className="h-6 w-6 flex-shrink-0 text-blue-500 mt-0.5 select-none" />
                                                    <span className="leading-relaxed"><ContentRenderer text={objective} /></span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Page Content */}
                                {pageData ? (
                                    <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none select-text cursor-text bg-white dark:bg-[#1C1C1E] p-6 md:p-10 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-black/[0.03] dark:border-white/5 flex-1">
                                        {pageData.title && (
                                            <h1 className="text-2xl md:text-4xl font-semibold mb-8 text-slate-900 dark:text-white tracking-tight leading-tight">
                                                {pageData.title}
                                            </h1>
                                        )}
                                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                                            <LessonPage page={pageData} isEditable={false} isFinalizing={false} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-40 h-64 select-none bg-white dark:bg-[#1C1C1E] rounded-[2.5rem]">
                                        <QuestionMarkCircleIcon className="w-16 h-16 stroke-1 mb-3 text-slate-400" />
                                        <p className="font-medium text-lg">Empty Page</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                {/* --- FLOATING BOTTOM ACTION BAR (Material You Dock) --- */}
                <div className="absolute bottom-3 sm:bottom-6 md:bottom-8 left-0 right-0 px-2 sm:px-4 flex flex-col items-center z-30 pointer-events-none">

                    {/* Material You Page Skipper */}
                    <AnimatePresence>
                        {showPageJumper && (
                            <motion.div
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ type: "tween", duration: 0.2 }}
                                className="mb-4 w-full max-w-[95%] sm:max-w-sm pointer-events-auto"
                            >
                                <div className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-2xl p-2 rounded-[2rem] shadow-xl border border-black/5 dark:border-white/10 flex items-center overflow-x-auto custom-scrollbar no-scrollbar">
                                    <div className="flex items-center gap-2 px-2 py-1">
                                        {pages.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => jumpToPage(idx)}
                                                className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-sm font-bold transition-all relative ${currentPage === idx
                                                        ? 'bg-blue-600 text-white shadow-md scale-110'
                                                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95'
                                                    }`}
                                            >
                                                {idx + 1}
                                                {idx <= maxPageReached && currentPage !== idx && (
                                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-[#2C2C2E]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Navigation Dock */}
                    <div className="w-full max-w-[340px] sm:max-w-md bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-3xl border border-black/5 dark:border-white/10 p-2 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] pointer-events-auto flex items-center justify-between">

                        {/* Back Button */}
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 0}
                            className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-90 transition-all"
                        >
                            <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                        </button>

                        {/* Center Indicator / Jumper Toggle */}
                        <div className="flex-1 flex justify-center px-1 sm:px-2">
                            <button
                                onClick={() => setShowPageJumper(!showPageJumper)}
                                className="flex items-center gap-1 sm:gap-1.5 px-3 py-2.5 sm:px-4 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                            >
                                <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-wide">
                                    {currentPage + 1} <span className="text-slate-400 font-medium mx-0.5">/</span> {totalPages}
                                </span>
                                <ChevronUpIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 transition-transform duration-300 ${showPageJumper ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Next / Finish Button */}
                        {currentPage < totalPages - 1 ? (
                            <button
                                onClick={goToNextPage}
                                className={`flex items-center justify-center gap-1.5 px-5 sm:px-6 h-12 sm:h-14 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all ${monet ? `${monet.gradient} text-white` : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                <span>Next</span>
                                <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-2" />
                            </button>
                        ) : (
                            <button
                                onClick={xpAwarded ? handleClose : handleFinishLesson}
                                className={`flex items-center justify-center gap-1.5 px-4 sm:px-6 h-12 sm:h-14 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all ${xpAwarded ? 'bg-slate-800 dark:bg-white dark:text-black text-white hover:bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                            >
                                <span>{xpAwarded ? 'Done' : 'Finish'}</span>
                                {xpAwarded ? <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-2" /> : <CheckCircleSolid className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                        )}
                    </div>
                </div>
            </DialogPanel>
        </Dialog>
    );
}