// src/components/teacher/dashboard/views/components/ViewLessonModal.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    QueueListIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon,
    PencilSquareIcon,
    LockClosedIcon,
    PhotoIcon,
    TagIcon,
    Square2StackIcon,
    ListBulletIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage'; 
import ContentRenderer from './ContentRenderer';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

// --- ANIMATION VARIANTS ---
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
};

const windowVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { 
        opacity: 1, scale: 1, y: 0, 
        transition: { type: "spring", damping: 30, stiffness: 350, mass: 0.5 } 
    },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};

// --- MEMOIZED PAGE COMPONENT ---
const VerticalLessonItem = memo(({ page, index }) => (
    <div className="relative group mb-12 select-text">
        <div className="flex items-center gap-4 mb-4 opacity-30 select-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Page {index + 1}</span>
            <div className="h-px flex-1 bg-slate-300 dark:bg-white/20"></div>
        </div>
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none select-text cursor-text">
            {page.title && (
                <h2 className="text-2xl font-bold mb-4 tracking-tight text-slate-900 dark:text-white">{page.title}</h2>
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
    
    const { showToast } = useToast();
    const [isFinalizing, setIsFinalizing] = useState(false);
    
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    
    useEffect(() => { 
        if (isOpen) { 
            setCurrentPage(0); 
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
            setCurrentPage(prev => prev + 1); 
            scrollToTop();
        } 
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => { 
        if (currentPage > 0) { 
            setCurrentPage(prev => prev - 1); 
            scrollToTop();
        } 
    }, [currentPage]);

    // Keyboard & Gestures
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
    // Optimization: Solid backgrounds for main container (reduces GPU blur cost)
    const windowStyle = "bg-[#F5F5F7] dark:bg-[#1E1E1E] md:rounded-2xl shadow-2xl overflow-hidden";
    // Optimization: Only blur the small header area
    const glassHeader = "bg-white/85 dark:bg-[#2C2C2E]/85 backdrop-blur-md border-b border-black/5 dark:border-white/5 supports-[backdrop-filter]:bg-white/60";
    
    const toolbarBtn = "p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30 active:scale-95";
    const segmentedBase = "flex p-0.5 rounded-lg bg-slate-200/50 dark:bg-black/20";
    const segmentedOption = (active) => `
        px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-1.5
        ${active 
            ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
    `;

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-[5000] flex items-center justify-center font-sans ${className}`}>
            {/* Simple dark overlay - NO BLUR here to save performance */}
            <motion.div 
                variants={backdropVariants}
                initial="hidden" animate="visible" exit="exit"
                className="fixed inset-0 bg-black/40"
                aria-hidden="true" 
                onClick={onClose}
            />
            
            {/* Modal Window */}
            <Dialog.Panel 
                as={motion.div} 
                variants={windowVariants} 
                initial="hidden" animate="visible" exit="exit"
                className={`relative w-full h-[100dvh] md:h-[85vh] md:max-w-5xl flex flex-col ${windowStyle}`}
            >
                {/* --- HEADER (Sticky) --- */}
                <header className={`relative flex-shrink-0 h-14 px-4 flex items-center justify-between select-none z-20 ${glassHeader}`}>
                    
                    {/* Left: Window Controls */}
                    <div className="flex items-center gap-4">
                        {/* Traffic Lights - Large touch targets for mobile */}
                        <div className="flex gap-2 group items-center">
                            <button onClick={onClose} className="w-8 h-8 md:w-3 md:h-3 rounded-full md:bg-[#FF5F57] md:border md:border-[#E0443E] flex items-center justify-center -ml-2 md:ml-0 hover:bg-slate-200 md:hover:bg-[#FF5F57] transition-colors">
                                {/* Mobile: Close Icon, Desktop: Hover Icon */}
                                <XMarkIcon className="w-5 h-5 md:w-2 md:h-2 text-slate-500 md:text-black/50 md:opacity-0 group-hover:opacity-100 block" />
                            </button>
                            <div className="hidden md:block w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]" />
                            <div className="hidden md:block w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]" />
                        </div>

                        {/* Desktop Navigation (Hidden on Mobile) */}
                        {readingMode === 'horizontal' && (
                            <div className="hidden md:flex items-center gap-1 ml-4 bg-slate-100/50 dark:bg-white/5 rounded-lg p-0.5 border border-black/5 dark:border-white/5">
                                <button onClick={goToPreviousPage} disabled={currentPage === 0} className={toolbarBtn}>
                                    <ChevronLeftIcon className="w-4 h-4 stroke-[2.5]" />
                                </button>
                                <button onClick={goToNextPage} disabled={currentPage === totalPages - 1} className={toolbarBtn}>
                                    <ChevronRightIcon className="w-4 h-4 stroke-[2.5]" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Center: Title */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center max-w-[150px] sm:max-w-md w-full">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate w-full text-center">
                            {lessonTitle}
                        </h2>
                    </div>

                    {/* Right: View Mode */}
                    <div className={segmentedBase}>
                        <button onClick={() => setReadingMode('horizontal')} className={segmentedOption(readingMode === 'horizontal')}>
                            <Square2StackIcon className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Slide</span>
                        </button>
                        <button onClick={() => setReadingMode('vertical')} className={segmentedOption(readingMode === 'vertical')}>
                             <ListBulletIcon className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Scroll</span>
                        </button>
                    </div>
                </header>
                
                {/* --- MAIN CONTENT --- */}
                <main 
                    ref={contentRef} 
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 md:p-12 relative bg-transparent scroll-smooth"
                >
                    <div className="max-w-3xl mx-auto min-h-full pb-24 md:pb-20"> 
                        
                        {readingMode === 'horizontal' ? (
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={currentPage}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }} // Faster transition for mobile feel
                                    className="w-full min-h-full"
                                >
                                    {/* Objectives */}
                                    {currentPage === 0 && objectives.length > 0 && (
                                        <div className="mb-8 p-5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 select-text shadow-sm">
                                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 select-none">
                                                <QueueListIcon className="h-4 w-4" />
                                                Objectives
                                            </h3>
                                            <ul className="space-y-3">
                                                {objectives.map((objective, index) => (
                                                    <li key={index} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                                                        <CheckCircleSolid className="h-5 w-5 flex-shrink-0 text-blue-500 mt-0.5 select-none" />
                                                        <span className="selection:bg-blue-100 dark:selection:bg-blue-900/50"><ContentRenderer text={objective} /></span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {pageData ? (
                                        <div className="prose prose-lg dark:prose-invert max-w-none select-text cursor-text">
                                            {pageData.title && (
                                                <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight leading-tight">
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
                                        <div className="flex flex-col items-center justify-center opacity-40 h-64 select-none">
                                            <QuestionMarkCircleIcon className="w-12 h-12 stroke-1 mb-2" />
                                            <p className="font-medium">Empty Page</p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            /* Vertical Mode */
                            <div className="space-y-12 select-text cursor-text">
                                {objectives.length > 0 && (
                                    <div className="p-5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2 select-none">
                                            <QueueListIcon className="w-4 h-4" /> Objectives
                                        </h3>
                                        <ul className="space-y-2">
                                            {objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                                                    <CheckCircleSolid className="h-5 w-5 flex-shrink-0 text-blue-500 select-none" />
                                                    <span><ContentRenderer text={objective} /></span>
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

                {/* --- BOTTOM BAR (Mobile Nav & Actions) --- */}
                {/* Fixed bottom bar for mobile ergonomics - uses light blur */}
                <div className={`absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-black/5 dark:border-white/5 z-20 flex justify-between items-center ${glassHeader}`}>
                    
                    {/* Navigation (Mobile Only for Slide Mode) */}
                    {readingMode === 'horizontal' ? (
                        <div className="flex items-center gap-2 w-full justify-between md:justify-center relative">
                            {/* Prev Button */}
                            <button 
                                onClick={goToPreviousPage} 
                                disabled={currentPage === 0}
                                className="flex flex-col items-center gap-1 min-w-[3rem] text-slate-500 disabled:opacity-30 active:scale-95 transition-transform"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                                <span className="text-[10px] font-medium md:hidden">Back</span>
                            </button>

                            {/* Page Indicator */}
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-700 dark:text-white">
                                    {currentPage + 1} / {totalPages}
                                </span>
                            </div>

                            {/* Next/Finish Button */}
                            {currentPage < totalPages - 1 ? (
                                <button 
                                    onClick={goToNextPage}
                                    className="flex flex-col items-center gap-1 min-w-[3rem] text-blue-600 dark:text-blue-400 active:scale-95 transition-transform"
                                >
                                    <ChevronRightIcon className="w-6 h-6" />
                                    <span className="text-[10px] font-medium md:hidden">Next</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={onClose}
                                    className="flex flex-col items-center gap-1 min-w-[3rem] text-emerald-600 dark:text-emerald-400 active:scale-95 transition-transform"
                                >
                                    <CheckCircleSolid className="w-6 h-6" />
                                    <span className="text-[10px] font-medium md:hidden">Done</span>
                                </button>
                            )}
                        </div>
                    ) : (
                         <div className="w-full flex justify-center">
                            <button onClick={onClose} className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-full text-sm font-bold shadow-lg active:scale-95 transition-transform">
                                Close Lesson
                            </button>
                        </div>
                    )}

                    {/* Diagram Actions Context Menu (Floating above bottom bar) */}
                    {readingMode === 'horizontal' && pageData?.type?.includes('diagram') && (
                         <div className="absolute bottom-full left-0 right-0 mb-4 flex justify-center pointer-events-none">
                            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/95 dark:bg-[#3A3A3C]/95 border border-black/10 dark:border-white/10 shadow-xl pointer-events-auto scale-90 sm:scale-100">
                                {pageData?.type === 'diagram-data' && (
                                    <>
                                        <button onClick={() => lessonPageRef.current?.addImage()} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" title="Add Image">
                                            <PhotoIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                        </button>
                                        <button onClick={() => lessonPageRef.current?.addLabel()} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" title="Add Label">
                                            <TagIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                        </button>
                                        <div className="w-px h-5 bg-slate-300 dark:bg-white/20 mx-1"></div>
                                        <button onClick={() => lessonPageRef.current?.finalizeDiagram()} disabled={isFinalizing} className="px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                                            <LockClosedIcon className={`h-3.5 w-3.5 ${isFinalizing ? "animate-spin" : ""}`} /> Save
                                        </button>
                                    </>
                                )}
                                {pageData?.type === 'diagram' && (
                                    <button onClick={handleRevertDiagramToEditable} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold">
                                        <PencilSquareIcon className="h-3.5 w-3.5" /> Edit
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}