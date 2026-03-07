// src/components/teacher/dashboard/views/components/ViewLessonModal.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    QueueListIcon,
    CheckCircleIcon,
    PencilSquareIcon,
    LockClosedIcon,
    PhotoIcon,
    TagIcon,
    Square2StackIcon,
    ListBulletIcon,
    QuestionMarkCircleIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage'; 
import ContentRenderer from './ContentRenderer';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

// --- PERFORMANCE OPTIMIZED ANIMATIONS ---
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
};

const windowVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
        opacity: 1, scale: 1, y: 0, 
        transition: { type: "tween", ease: "easeOut", duration: 0.25 } 
    },
    exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.15, ease: "easeIn" } },
};

const pageVariants = {
    initial: (direction) => ({ opacity: 0, x: direction > 0 ? 30 : -30 }),
    animate: { opacity: 1, x: 0, transition: { type: "tween", ease: "circOut", duration: 0.3 } },
    exit: (direction) => ({ opacity: 0, x: direction > 0 ? -30 : 30, transition: { duration: 0.2 } })
};

// --- MEMOIZED PAGE COMPONENT (Vertical Mode) ---
const VerticalLessonItem = memo(({ page, index }) => (
    <div className="relative group mb-16 select-text">
        <div className="flex items-center gap-4 mb-6 select-none">
            <span className="px-3 py-1 bg-slate-200/50 dark:bg-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                Page {index + 1}
            </span>
            <div className="h-0.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full"></div>
        </div>
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none select-text cursor-text bg-white dark:bg-[#1C1C1E] p-6 md:p-10 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-black/[0.03] dark:border-white/5">
            {page.title && (
                <h2 className="text-2xl md:text-3xl font-semibold mb-6 tracking-tight text-slate-900 dark:text-slate-50">{page.title}</h2>
            )}
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed selection:bg-blue-100 dark:selection:bg-blue-900/50">
                <LessonPage page={page} isEditable={false} />
            </div>
        </div>
    </div>
));

export default function ViewLessonModal({ isOpen, onClose, lesson, onUpdate, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [readingMode, setReadingMode] = useState('horizontal'); 
    const [direction, setDirection] = useState(1);
    const [showPageJumper, setShowPageJumper] = useState(false); 
    
    const { showToast } = useToast();
    const [isFinalizing, setIsFinalizing] = useState(false);
    
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    
    useEffect(() => { 
        if (isOpen) { 
            setCurrentPage(0); 
            setShowPageJumper(false);
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [isOpen]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = useMemo(() => currentLesson?.pages || [], [currentLesson]);
    const objectives = useMemo(() => currentLesson?.learningObjectives || currentLesson?.objectives || [], [currentLesson]);
    const totalPages = pages.length;
    const pageData = useMemo(() => pages[currentPage], [pages, currentPage]);

    const scrollToTop = () => {
        if (contentRef.current) {
            contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToNextPage = useCallback(() => { 
        if (currentPage < totalPages - 1) { 
            setDirection(1);
            setCurrentPage(prev => prev + 1); 
            setShowPageJumper(false); 
            scrollToTop();
        } 
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => { 
        if (currentPage > 0) { 
            setDirection(-1);
            setCurrentPage(prev => prev - 1); 
            setShowPageJumper(false); 
            scrollToTop();
        } 
    }, [currentPage]);

    const jumpToPage = useCallback((index) => {
        if (index === currentPage) return;
        setDirection(index > currentPage ? 1 : -1);
        setCurrentPage(index);
        setShowPageJumper(false);
        scrollToTop();
    }, [currentPage]);

    // Keyboard Navigation
    useEffect(() => { 
        const handleKeyDown = (e) => { 
            if (!isOpen) return; 
            if (readingMode === 'horizontal') {
                if (e.key === 'ArrowRight') goToNextPage(); 
                else if (e.key === 'ArrowLeft') goToPreviousPage(); 
            }
            if (e.key === 'Escape') onClose();
        }; 
        window.addEventListener('keydown', handleKeyDown); 
        return () => window.removeEventListener('keydown', handleKeyDown); 
    }, [isOpen, goToNextPage, goToPreviousPage, onClose, readingMode]);

    const handleFinalizeDiagram = async (finalizedContent) => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        showToast("Finalizing diagram...", "info");
        try {
            const updatedPages = currentLesson.pages.map((page, index) => index === currentPage ? { ...page, type: 'diagram', content: finalizedContent } : page );
            const updatedLesson = { ...currentLesson, pages: updatedPages };
            setCurrentLesson(updatedLesson);
            await updateDoc(doc(db, 'lessons', currentLesson.id), { pages: updatedPages });
            showToast("Saved successfully!", "success");
            if (onUpdate) onUpdate(updatedLesson);
        } catch (error) {
            console.error("Error finalizing diagram:", error);
            showToast("Failed to save.", "error");
            setCurrentLesson(lesson);
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleRevertDiagramToEditable = async () => {
        showToast("Loading editor...", "info");
        try {
            const updatedPages = currentLesson.pages.map((page, index) => index === currentPage ? { ...page, type: 'diagram-data' } : page );
            const updatedLesson = { ...currentLesson, pages: updatedPages };
            setCurrentLesson(updatedLesson);
            await updateDoc(doc(db, 'lessons', currentLesson.id), { pages: updatedPages });
            if (onUpdate) onUpdate(updatedLesson);
        } catch (error) {
            console.error("Error reverting diagram:", error);
            showToast("Could not re-edit.", "error");
        }
    };

    if (!isOpen || !currentLesson) return null;

    // --- STYLES ---
    // REMOVED: md:rounded-[3rem] to allow a seamless edge-to-edge experience
    const windowStyle = "bg-[#FAF9F6] dark:bg-[#121212] shadow-2xl overflow-hidden";
    const segmentedOption = (active) => `
        flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-200 active:scale-[0.98]
        ${active 
            ? 'bg-white dark:bg-[#2C2C2E] text-slate-900 dark:text-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-none' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'}
    `;

    return (
        // REMOVED: md:p-6 from the Dialog to prevent the backdrop gap
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-[5000] flex items-center justify-center font-sans ${className}`}>
            <motion.div 
                variants={backdropVariants}
                initial="hidden" animate="visible" exit="exit"
                className="fixed inset-0 bg-black/50 dark:bg-black/70 will-change-opacity"
                aria-hidden="true" 
                onClick={onClose}
            />
            
            <DialogPanel 
                as={motion.div} 
                variants={windowVariants} 
                initial="hidden" animate="visible" exit="exit"
                // REMOVED: md:h-[90dvh] and md:max-w-5xl to ensure 100% height and width
                className={`relative w-full h-[100dvh] flex flex-col transform-gpu will-change-transform ${windowStyle}`}
            >
                {/* --- HEADER --- */}
                <header className="relative flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 md:py-5 bg-[#FAF9F6] dark:bg-[#121212] border-b border-black/5 dark:border-white/5 select-none z-20">
                    
                    {/* Left: Close Button */}
                    <div className="flex items-center w-[60px] sm:w-[100px]">
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-all active:scale-95"
                        >
                            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                        </button>
                    </div>

                    {/* Center: Title */}
                    <div className="flex-1 flex justify-center px-2">
                        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50 truncate text-center max-w-[200px] sm:max-w-none">
                            {lessonTitle}
                        </h2>
                    </div>

                    {/* Right: View Mode Toggle */}
                    <div className="flex items-center justify-end w-[60px] sm:w-[100px] md:w-[200px]">
                        <div className="hidden md:flex bg-slate-200/50 dark:bg-black/20 p-1 rounded-full w-full max-w-[200px]">
                            <button onClick={() => setReadingMode('horizontal')} className={segmentedOption(readingMode === 'horizontal')}>
                                <Square2StackIcon className="w-4 h-4"/> Slide
                            </button>
                            <button onClick={() => setReadingMode('vertical')} className={segmentedOption(readingMode === 'vertical')}>
                                <ListBulletIcon className="w-4 h-4"/> Scroll
                            </button>
                        </div>
                        {/* Mobile view mode toggle (Icon only) */}
                        <button 
                            onClick={() => setReadingMode(readingMode === 'horizontal' ? 'vertical' : 'horizontal')}
                            className="md:hidden w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/10 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                        >
                            {readingMode === 'horizontal' ? <ListBulletIcon className="w-5 h-5"/> : <Square2StackIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                </header>
                
                {/* --- MAIN CONTENT --- */}
                <main 
                    ref={contentRef} 
                    className="flex-1 overflow-y-auto custom-scrollbar relative bg-transparent scroll-smooth p-4 sm:p-6 md:p-8"
                >
                    {/* CHANGED: max-w-4xl -> max-w-6xl to use the newly available desktop space better */}
                    <div className="max-w-6xl mx-auto min-h-full pb-48 md:pb-32"> 
                        
                        {readingMode === 'horizontal' ? (
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div 
                                    key={currentPage}
                                    custom={direction}
                                    variants={pageVariants}
                                    initial="initial" animate="animate" exit="exit"
                                    className="w-full min-h-full flex flex-col"
                                >
                                    {/* Objectives */}
                                    {currentPage === 0 && objectives.length > 0 && (
                                        <div className="mb-8 p-6 md:p-8 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 border border-transparent dark:border-blue-500/10 select-text">
                                            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-300 mb-4 select-none">
                                                <QueueListIcon className="h-5 w-5" />
                                                Learning Objectives
                                            </h3>
                                            <ul className="space-y-4">
                                                {objectives.map((objective, index) => (
                                                    <li key={index} className="flex items-start gap-3 text-base text-blue-950 dark:text-blue-100/80">
                                                        <CheckCircleSolid className="h-6 w-6 flex-shrink-0 text-blue-500 mt-0.5 select-none" />
                                                        <span className="selection:bg-blue-200 dark:selection:bg-blue-800 leading-relaxed">
                                                            <ContentRenderer text={objective} />
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {pageData ? (
                                        <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none select-text cursor-text bg-white dark:bg-[#1C1C1E] p-6 md:p-10 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-black/[0.03] dark:border-white/5 flex-1">
                                            {pageData.title && (
                                                <h1 className="text-2xl md:text-4xl font-semibold mb-8 text-slate-900 dark:text-white tracking-tight leading-tight">
                                                    {pageData.title}
                                                </h1>
                                            )}
                                            <div className="text-slate-800 dark:text-slate-200 leading-relaxed selection:bg-blue-100 dark:selection:bg-blue-900/50">
                                                <LessonPage
                                                    ref={lessonPageRef}
                                                    page={pageData}
                                                    isEditable={true}
                                                    onFinalizeDiagram={handleFinalizeDiagram}
                                                    onRevertDiagram={handleRevertDiagramToEditable}
                                                    isFinalizing={isFinalizing}
                                                />
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
                        ) : (
                            /* Vertical Mode */
                            <div className="space-y-8 select-text cursor-text pb-20">
                                {objectives.length > 0 && (
                                    <div className="p-6 md:p-8 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 mb-12">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2 select-none">
                                            <QueueListIcon className="w-5 h-5" /> Learning Objectives
                                        </h3>
                                        <ul className="space-y-4">
                                            {objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-3 text-base text-blue-950 dark:text-blue-100/80">
                                                    <CheckCircleSolid className="h-6 w-6 flex-shrink-0 text-blue-500 select-none" />
                                                    <span className="leading-relaxed"><ContentRenderer text={objective} /></span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {pages.map((pData, idx) => (
                                    <VerticalLessonItem key={idx} page={pData} index={idx} />
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* --- FLOATING BOTTOM ACTION BAR (Material You Dock) --- */}
                <div className="absolute bottom-6 md:bottom-8 left-0 right-0 px-4 flex flex-col items-center z-30 pointer-events-none">
                    
                    {/* Diagram Actions Context Menu */}
                    <AnimatePresence>
                        {readingMode === 'horizontal' && pageData?.type?.includes('diagram') && !showPageJumper && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="mb-4 flex items-center gap-2 p-2 rounded-full bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] pointer-events-auto"
                            >
                                {pageData?.type === 'diagram-data' && (
                                    <>
                                        <button onClick={() => lessonPageRef.current?.addImage()} className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Add Image">
                                            <PhotoIcon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                                        </button>
                                        <button onClick={() => lessonPageRef.current?.addLabel()} className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Add Label">
                                            <TagIcon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                                        </button>
                                        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
                                        <button onClick={() => lessonPageRef.current?.finalizeDiagram()} disabled={isFinalizing} className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all">
                                            <LockClosedIcon className={`h-4 w-4 ${isFinalizing ? "animate-spin" : ""}`} /> 
                                            <span className="hidden sm:inline">{isFinalizing ? "Saving..." : "Save Diagram"}</span>
                                            <span className="sm:hidden">{isFinalizing ? "Saving..." : "Save"}</span>
                                        </button>
                                    </>
                                )}
                                {pageData?.type === 'diagram' && (
                                    <button onClick={handleRevertDiagramToEditable} className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 text-sm font-bold active:scale-95 transition-all">
                                        <PencilSquareIcon className="h-4 w-4" /> Edit
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Page Skipper (Jumper) */}
                    <AnimatePresence>
                        {showPageJumper && readingMode === 'horizontal' && (
                            <motion.div
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ type: "tween", duration: 0.2 }}
                                className="mb-4 w-full max-w-sm pointer-events-auto"
                            >
                                <div className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-2xl p-2 rounded-[2rem] shadow-xl border border-black/5 dark:border-white/10 flex items-center overflow-x-auto custom-scrollbar no-scrollbar">
                                    <div className="flex items-center gap-2 px-2 py-1">
                                        {pages.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => jumpToPage(idx)}
                                                className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                                                    currentPage === idx 
                                                        ? 'bg-blue-600 text-white shadow-md scale-110' 
                                                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95'
                                                }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Navigation Dock */}
                    <div className="w-full max-w-[320px] md:max-w-md bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-3xl border border-black/5 dark:border-white/10 p-2 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] pointer-events-auto flex items-center justify-between">
                        {readingMode === 'horizontal' ? (
                            <>
                                <button 
                                    onClick={goToPreviousPage} 
                                    disabled={currentPage === 0}
                                    className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-90 transition-all"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                                </button>

                                <div className="flex-1 flex justify-center px-2">
                                    <button 
                                        onClick={() => setShowPageJumper(!showPageJumper)}
                                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                                    >
                                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-wide">
                                            {currentPage + 1} <span className="text-slate-400 font-medium mx-0.5">/</span> {totalPages}
                                        </span>
                                        <ChevronUpIcon className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${showPageJumper ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {currentPage < totalPages - 1 ? (
                                    <button 
                                        onClick={goToNextPage}
                                        className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 active:scale-90 transition-all"
                                    >
                                        <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={onClose}
                                        className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 active:scale-90 transition-all"
                                    >
                                        <CheckCircleSolid className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <button onClick={onClose} className="w-full flex justify-center items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-full text-base font-bold active:scale-[0.98] transition-all">
                                Close Lesson
                            </button>
                        )}
                    </div>
                </div>

            </DialogPanel>
        </Dialog>
    );
}