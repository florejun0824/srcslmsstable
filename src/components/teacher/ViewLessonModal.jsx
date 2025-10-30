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

const modalVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { ease: "easeOut", duration: 0.2 } },
    exit: { opacity: 0, scale: 0.98, transition: { ease: "easeIn", duration: 0.15 } },
};

const pageTransitionVariants = {
    hidden: { opacity: 0, x: 15 },
    visible: { opacity: 1, x: 0, transition: { ease: "easeOut", duration: 0.25 } },
    exit: { opacity: 0, x: -15, transition: { ease: "easeIn", duration: 0.2 } },
};

const objectivesContainerVariants = {
    visible: { transition: { staggerChildren: 0.07 } },
};

const objectiveItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } },
};

export default function ViewLessonModal({ isOpen, onClose, lesson, onUpdate, className }) {
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

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-50 flex items-center justify-center font-sans ${className}`}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 bg-black/20" aria-hidden="true" />
            
            <Dialog.Panel as={motion.div} variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-neumorphic-base rounded-2xl shadow-neumorphic w-full max-w-5xl z-10 flex flex-col h-full md:h-[90vh] md:max-h-[700px] overflow-hidden">
                
                <div className="w-full bg-neumorphic-base h-1.5 flex-shrink-0 shadow-neumorphic-flat-inset">
                    <div className="bg-red-600 h-1.5 transition-all duration-500 ease-out rounded-r-full" style={{ width: `${progressPercentage}%` }} />
                </div>

                <header className="flex justify-between items-center p-4 sm:p-5 bg-neumorphic-base flex-shrink-0 z-10 border-b border-neumorphic-shadow-dark/10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Dialog.Title className="text-base sm:text-xl font-bold text-tremor-content-strong truncate">{lessonTitle}</Dialog.Title>
                        {currentLesson.studyGuideUrl && (
                            <a href={currentLesson.studyGuideUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-full shadow-neumorphic active:shadow-neumorphic-inset transition-shadow duration-150 ease-out whitespace-nowrap">
                                <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">Study Guide</span>
                            </a>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full text-slate-600 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset hover:text-slate-800 transition-all duration-150 ease-out flex-shrink-0 ml-4" aria-label="Close lesson">
                        <XMarkIcon className="w-5 h-5 sm:w-6 h-6" />
                    </button>
                </header>
                
                <main ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar bg-neumorphic-base flex flex-col items-center p-4 sm:p-8">
                    <div className="w-full max-w-3xl flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div key={currentPage} variants={pageTransitionVariants} initial="hidden" animate="visible" exit="exit" className="w-full min-h-full bg-neumorphic-base rounded-xl shadow-neumorphic p-4 sm:p-8">
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div variants={objectivesContainerVariants} initial="hidden" animate="visible" className="mb-6 sm:mb-8 p-4 sm:p-5 bg-neumorphic-base rounded-xl shadow-neumorphic-inset">
                                        <h3 className="flex items-center gap-3 text-base sm:text-lg font-bold text-tremor-content-strong mb-4">
                                            <ListBulletIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                                            {objectivesLabel}
                                        </h3>
                                        {/* --- MODIFIED: Font size changed from text-sm sm:text-base --- */}
                                        <ul className="space-y-3 text-xs sm:text-sm text-slate-700">{objectives.map((objective, index) => (
                                            <motion.li key={index} variants={objectiveItemVariants} className="flex items-start gap-3">
                                                <CheckCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                                                <div className="flex-1"><ContentRenderer text={objective} /></div>
                                            </motion.li>
                                        ))}</ul>
                                    </motion.div>
                                )}
                                {pageData ? (
                                    // --- MODIFIED: Font size changed from text-sm sm:text-base ---
                                    <div className="text-sm">
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
                                        <div className="flex flex-col items-center justify-center text-center text-slate-500 h-full py-12">
                                            <QuestionMarkCircleIcon className="w-16 h-16 text-slate-300 mb-4" />
                                            <p className="text-lg font-medium">No content for this page.</p>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
                
                <footer className="grid grid-cols-3 items-center p-3 sm:p-4 bg-neumorphic-base border-t border-neumorphic-shadow-dark/10 flex-shrink-0 z-10">
                    <div className="flex items-center gap-2 sm:gap-4 justify-start">
                        <button onClick={goToPreviousPage} disabled={currentPage === 0} className="p-2 sm:p-3 rounded-full text-slate-600 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-out" aria-label="Previous page">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <span className="text-xs sm:text-sm font-semibold text-tremor-content whitespace-nowrap">{totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'No Pages'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                        {pageData?.type === 'diagram-data' && (
                            <>
                                <button onClick={() => lessonPageRef.current?.addImage()} className="p-2 sm:p-2.5 rounded-full text-slate-600 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset transition-all duration-150 ease-out" title="Add Image"><PhotoIcon className="h-5 w-5" /></button>
                                <button onClick={() => lessonPageRef.current?.addLabel()} className="p-2 sm:p-2.5 rounded-full text-slate-600 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset transition-all duration-150 ease-out" title="Add Label"><CursorArrowRaysIcon className="h-5 w-5" /></button>
                                <button onClick={() => lessonPageRef.current?.finalizeDiagram()} className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-slate-700 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset transition-all duration-150 ease-out" disabled={isFinalizing}>
                                    <LockClosedIcon className={`h-5 w-5 ${isFinalizing ? "animate-spin" : ""}`} />
                                    {isFinalizing ? "..." : "Finalize"}
                                </button>
                            </>
                        )}
                        {pageData?.type === 'diagram' && (
                            <button onClick={handleRevertDiagramToEditable} className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-slate-700 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset transition-all duration-1G0 ease-out">
                                <PencilSquareIcon className="h-5 w-5" />
                                Re-edit
                            </button>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={currentPage < totalPages - 1 ? goToNextPage : onClose}
                            className={`flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-semibold transition-shadow duration-150 ease-out bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset
                                ${currentPage < totalPages - 1 ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                            `}
                            aria-label={currentPage < totalPages - 1 ? "Next page" : "Finish lesson"}
                        >
                            {/* --- MODIFIED: Text size responsive --- */}
                            <span className="text-sm sm:text-base">
                                {currentPage < totalPages - 1 ? 'Next' : 'Finish'}
                            </span>
                            {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </footer>
            </Dialog.Panel>
        </Dialog>
    );
}