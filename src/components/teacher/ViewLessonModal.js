// src/components/teacher/ViewLessonModal.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ListBulletIcon,
    ArrowDownTrayIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/solid';
import LessonPage from './LessonPage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

// --- MODIFICATION: Simpler, faster, and smoother animation variants ---
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

    useEffect(() => {
        setCurrentLesson(lesson);
        if (isOpen) {
            setCurrentPage(0);
        }
    }, [lesson, isOpen]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin sa Pagkatuto" : "Learning Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

    const goToNextPage = useCallback(() => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
            if (contentRef.current) contentRef.current.scrollTop = 0;
        }
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
            if (contentRef.current) contentRef.current.scrollTop = 0;
        }
    }, [currentPage]);

    const scrollContent = useCallback((amount) => {
        if (contentRef.current) {
            contentRef.current.scrollBy({ top: amount, behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') goToNextPage();
            else if (e.key === 'ArrowLeft') goToPreviousPage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goToNextPage, goToPreviousPage]);

    const handleFinalizeDiagram = async (pageIndex, finalizedContent) => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        showToast("Finalizing diagram...", "info");

        try {
            const updatedPages = currentLesson.pages.map((page, index) =>
                index === pageIndex ? { ...page, content: JSON.stringify(finalizedContent) } : page
            );
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

    if (!isOpen || !currentLesson) return null;

    const pageData = pages[currentPage];

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                aria-hidden="true"
            />

            <Dialog.Panel
                as={motion.div}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                // --- MODIFICATION: Fixed height on desktop, full screen on mobile ---
                className="relative bg-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl z-10 flex flex-col h-full md:h-[90vh] md:max-h-[700px] overflow-hidden ring-1 ring-black/10"
            >
                <div className="w-full bg-slate-200 h-1.5 flex-shrink-0">
                    <div className="bg-indigo-600 h-1.5 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                </div>

                <header className="flex justify-between items-center p-4 sm:p-5 border-b border-black/10 bg-white/70 backdrop-blur-xl flex-shrink-0 z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Dialog.Title className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                            {lessonTitle}
                        </Dialog.Title>
                        {currentLesson.studyGuideUrl && (
                            <a
                                href={currentLesson.studyGuideUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-200/70 rounded-full hover:bg-slate-300/80 transition-colors whitespace-nowrap"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                {/* --- MODIFICATION: Mobile friendly text hiding --- */}
                                <span className="hidden sm:inline">Study Guide</span>
                            </a>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-500 bg-slate-200/70 hover:bg-slate-300/80 hover:text-slate-700 transition-colors flex-shrink-0 ml-4"
                        aria-label="Close lesson"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar bg-slate-100 flex flex-col items-center p-4 sm:p-8">
                    <div className="w-full max-w-3xl flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div
                                key={currentPage}
                                variants={pageTransitionVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-full min-h-full bg-white rounded-xl shadow-lg p-6 sm:p-8"
                            >
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div
                                        variants={objectivesContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="mb-8 p-5 bg-slate-100 rounded-xl"
                                    >
                                        <h3 className="flex items-center gap-3 text-lg font-bold text-slate-800 mb-4">
                                            <ListBulletIcon className="h-6 w-6 text-indigo-600" />
                                            {objectivesLabel}
                                        </h3>
                                        <ul className="space-y-3 text-base text-slate-700">
                                            {objectives.map((objective, index) => (
                                                <motion.li key={index} variants={objectiveItemVariants} className="flex items-start gap-3">
                                                    <CheckCircleIcon className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-1" />
                                                    <span>{objective}</span>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                                
                                {pageData ? (
                                    <LessonPage
                                        page={pageData}
                                        isEditable={true}
                                        onFinalizeDiagram={(finalizedContent) => handleFinalizeDiagram(currentPage, finalizedContent)}
                                        isFinalizing={isFinalizing}
                                    />
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

                <footer className="flex justify-between items-center p-4 bg-white/70 backdrop-blur-xl border-t border-black/10 flex-shrink-0 z-10">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 0}
                            className="p-3 rounded-full text-slate-600 bg-slate-200/70 hover:bg-slate-300/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        {/* --- MODIFICATION: Scroll buttons hidden on mobile --- */}
                        <div className="hidden md:flex items-center gap-2">
                            <button onClick={() => scrollContent(-200)} className="p-3 rounded-full text-slate-600 bg-slate-200/70 hover:bg-slate-300/80 transition-colors" aria-label="Scroll up">
                                <ChevronUpIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => scrollContent(200)} className="p-3 rounded-full text-slate-600 bg-slate-200/70 hover:bg-slate-300/80 transition-colors" aria-label="Scroll down">
                                <ChevronDownIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <span className="text-sm font-semibold text-slate-600">
                        {totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'No Pages'}
                    </span>

                    <button
                        onClick={currentPage < totalPages - 1 ? goToNextPage : onClose}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 rounded-full text-white font-semibold transition-all shadow-md active:scale-95
                            ${currentPage < totalPages - 1 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}
                        `}
                        aria-label={currentPage < totalPages - 1 ? "Next page" : "Finish lesson"}
                    >
                         {/* --- MODIFICATION: Mobile friendly text hiding --- */}
                        <span className="hidden sm:inline">
                            {currentPage < totalPages - 1 ? 'Next' : 'Finish'}
                        </span>
                        {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                    </button>
                </footer>
            </Dialog.Panel>
        </Dialog>
    );
}