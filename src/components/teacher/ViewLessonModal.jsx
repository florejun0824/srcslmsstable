import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ListBulletIcon,
    ArrowDownTrayIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon,
    PencilSquareIcon,
    LockClosedIcon,
    PhotoIcon,
    CursorArrowRaysIcon
} from '@heroicons/react/24/solid';
import LessonPage from './LessonPage'; 
import ContentRenderer from './ContentRenderer';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

// ... (Keep existing animations: modalVariants, pageTransitionVariants, etc.) ...
const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", bounce: 0.3, duration: 0.5 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.3 } },
};

const pageTransitionVariants = {
    hidden: { opacity: 0, x: 20, filter: "blur(5px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { ease: "circOut", duration: 0.4 } },
    exit: { opacity: 0, x: -20, filter: "blur(5px)", transition: { ease: "circIn", duration: 0.3 } },
};

const objectivesContainerVariants = {
    visible: { transition: { staggerChildren: 0.08 } },
};

const objectiveItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 120, damping: 15 } },
};

export default function ViewLessonModal({ isOpen, onClose, lesson, onUpdate, className }) {
    // ... (Keep existing state and logic hooks) ...
    const [currentPage, setCurrentPage] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const { showToast } = useToast();
    const [isFinalizing, setIsFinalizing] = useState(false);
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    useEffect(() => { if (isOpen) { setCurrentPage(0); if (contentRef.current) contentRef.current.scrollTop = 0; } }, [isOpen]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin sa Pagkatuto" : "Learning Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    const pageData = pages[currentPage];

    const goToNextPage = useCallback(() => { if (currentPage < totalPages - 1) { setCurrentPage(prev => prev + 1); if (contentRef.current) contentRef.current.scrollTop = 0; } }, [currentPage, totalPages]);
    const goToPreviousPage = useCallback(() => { if (currentPage > 0) { setCurrentPage(prev => prev - 1); if (contentRef.current) contentRef.current.scrollTop = 0; } }, [currentPage]);

    useEffect(() => { const handleKeyDown = (e) => { if (!isOpen) return; if (e.key === 'ArrowRight') goToNextPage(); else if (e.key === 'ArrowLeft') goToPreviousPage(); }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [isOpen, goToNextPage, goToPreviousPage]);

    // ... (Keep handleFinalizeDiagram and handleRevertDiagramToEditable) ...
    const handleFinalizeDiagram = async (finalizedContent) => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        showToast("Finalizing diagram...", "info");
        try {
            const updatedPages = currentLesson.pages.map((page, index) => index === currentPage ? { ...page, type: 'diagram', content: finalizedContent } : page );
            const updatedLesson = { ...currentLesson, pages: updatedPages };
            setCurrentLesson(updatedLesson);
            await updateDoc(doc(db, 'lessons', currentLesson.id), { pages: updatedPages });
            showToast("Diagram saved successfully!", "success");
            if (onUpdate) onUpdate(updatedLesson);
        } catch (error) {
            console.error("Error finalizing diagram:", error);
            showToast("Failed to save the finalized diagram.", "error");
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
            showToast("Could not re-edit the diagram.", "error");
        }
    };

    if (!isOpen || !currentLesson) return null;

    // --- DESIGN CONSTANTS ---
    const glassPanel = "bg-white/80 dark:bg-[#1a1d24]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl";
    const actionBtn = "p-2.5 rounded-full transition-all active:scale-95 shadow-sm border border-transparent hover:border-white/20 dark:hover:border-white/10";
    
    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-50 flex items-center justify-center font-sans ${className}`}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" aria-hidden="true" />
            
            <Dialog.Panel as={motion.div} variants={modalVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-6xl h-[95vh] md:h-[85vh] flex flex-col overflow-hidden rounded-[2.5rem] ${glassPanel}`}>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100/50 dark:bg-white/5 flex-shrink-0">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    />
                </div>

                {/* Header */}
                <header className="flex justify-between items-center px-8 py-5 border-b border-slate-200/50 dark:border-white/5 flex-shrink-0 bg-white/40 dark:bg-white/5">
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <Dialog.Title className="text-2xl font-bold text-slate-900 dark:text-white truncate tracking-tight">
                            {lessonTitle}
                        </Dialog.Title>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}` : 'Empty Lesson'}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {currentLesson.studyGuideUrl && (
                            <a href={currentLesson.studyGuideUrl} download target="_blank" rel="noopener noreferrer" 
                                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Download Guide
                            </a>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-all">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                
                {/* Content Area - CHANGED: Removed pb-36, reduced to pb-10 */}
                <main ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center p-6 md:p-10 pb-10 relative">
                    <div className="w-full max-w-4xl flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div key={currentPage} variants={pageTransitionVariants} initial="hidden" animate="visible" exit="exit" className="w-full min-h-full">
                                
                                {/* Objectives Card */}
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div 
                                        variants={objectivesContainerVariants} 
                                        initial="hidden" 
                                        animate="visible" 
                                        className="mb-10 p-8 rounded-3xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-100/50 dark:border-white/5 shadow-sm"
                                    >
                                        <h3 className="flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-white mb-6">
                                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                                <ListBulletIcon className="h-5 w-5" />
                                            </div>
                                            {objectivesLabel}
                                        </h3>
                                        <ul className="grid gap-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                            {objectives.map((objective, index) => (
                                                <motion.li key={index} variants={objectiveItemVariants} className="flex items-start gap-4">
                                                    <CheckCircleIcon className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5 drop-shadow-sm" />
                                                    <div className="flex-1"><ContentRenderer text={objective} /></div>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}

                                {/* Main Page Content */}
                                {pageData ? (
                                    <div className="prose dark:prose-invert max-w-none">
                                        {pageData.title && (
                                            <motion.h1 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2, duration: 0.4 }}
                                                className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight leading-tight"
                                            >
                                                {pageData.title}
                                            </motion.h1>
                                        )}
                                        
                                        <LessonPage
                                            ref={lessonPageRef}
                                            page={pageData}
                                            isEditable={true}
                                            onFinalizeDiagram={handleFinalizeDiagram}
                                            onRevertDiagram={handleRevertDiagramToEditable}
                                            isFinalizing={isFinalizing}
                                        />
                                    </div>
                                ) : (
                                    currentPage === 0 && objectives.length > 0 ? null : ( 
                                        <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 h-64">
                                            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-4">
                                                <QuestionMarkCircleIcon className="w-10 h-10 opacity-50" />
                                            </div>
                                            <p className="text-lg font-medium">This page is empty.</p>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
                
                {/* Footer Navigation - CHANGED: Now a static flex footer, no longer absolute */}
                <footer className="flex-shrink-0 py-5 px-6 border-t border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-white/5 flex justify-center items-center z-10">
                    <div className="flex items-center gap-4 p-2 pl-3 pr-3 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-black/50 border border-white/20 dark:border-white/10 ring-1 ring-black/5">
                        
                        {/* Prev Button */}
                        <button 
                            onClick={goToPreviousPage} 
                            disabled={currentPage === 0} 
                            className={`${actionBtn} ${currentPage === 0 ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>

                        {/* Diagram Tools */}
                        {pageData?.type === 'diagram-data' && (
                            <div className="flex items-center gap-1 px-2 border-x border-slate-200 dark:border-white/10 mx-1">
                                <button onClick={() => lessonPageRef.current?.addImage()} className={`${actionBtn} text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title="Add Image">
                                    <PhotoIcon className="h-5 w-5" />
                                </button>
                                <button onClick={() => lessonPageRef.current?.addLabel()} className={`${actionBtn} text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20`} title="Add Label">
                                    <CursorArrowRaysIcon className="h-5 w-5" />
                                </button>
                                <button onClick={() => lessonPageRef.current?.finalizeDiagram()} disabled={isFinalizing} className={`${actionBtn} text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`} title="Save">
                                    <LockClosedIcon className={`h-5 w-5 ${isFinalizing ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        )}
                        
                        {pageData?.type === 'diagram' && (
                            <div className="px-2 border-x border-slate-200 dark:border-white/10 mx-1">
                                <button onClick={handleRevertDiagramToEditable} className={`${actionBtn} text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20`} title="Edit">
                                    <PencilSquareIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}

                        {/* Next / Finish Button */}
                        <button
                            onClick={currentPage < totalPages - 1 ? goToNextPage : onClose}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            <span>{currentPage < totalPages - 1 ? 'Next' : 'Finish'}</span>
                            {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </footer>

            </Dialog.Panel>
        </Dialog>
    );
}