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
import { uploadImageBlob } from '../../services/storageService';

// --- A more fluid and modern animation for page transitions ---
const slideAndFadeVariants = {
    hidden: (direction) => ({
        opacity: 0,
        x: direction > 0 ? '30%' : '-30%',
        scale: 0.95,
    }),
    visible: {
        opacity: 1,
        x: '0%',
        scale: 1,
        transition: { type: 'spring', duration: 0.9, bounce: 0.2 },
    },
    exit: (direction) => ({
        opacity: 0,
        x: direction < 0 ? '30%' : '-30%',
        scale: 0.95,
        transition: { type: 'spring', duration: 0.8, bounce: 0 },
    }),
};


// --- Animation variants for staggering objectives ---
const objectivesContainerVariants = {
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const objectiveItemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } },
};

export default function ViewLessonModal({ isOpen, onClose, lesson, onUpdate, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [direction, setDirection] = useState(1);
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
            setDirection(1);
            setCurrentPage(prev => prev + 1);
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        }
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => {
        if (currentPage > 0) {
            setDirection(-1);
            setCurrentPage(prev => prev - 1);
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
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
            if (e.key === 'ArrowRight') {
                goToNextPage();
            } else if (e.key === 'ArrowLeft') {
                goToPreviousPage();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                scrollContent(-150);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                scrollContent(150);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goToNextPage, goToPreviousPage, scrollContent]);

    const handleFinalizeDiagram = async (pageIndex, finalizedContent) => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        showToast("Finalizing diagram...", "info");

        try {
            let contentToSave = { ...finalizedContent };

            const updatedPages = currentLesson.pages.map((page, index) =>
                index === pageIndex ? { ...page, content: JSON.stringify(contentToSave) } : page
            );

            const updatedLesson = { ...currentLesson, pages: updatedPages };
            setCurrentLesson(updatedLesson);

            const lessonRef = doc(db, 'lessons', currentLesson.id);
            await updateDoc(lessonRef, {
                pages: updatedPages
            });

            showToast("Diagram finalized and saved successfully!", "success");
            if (onUpdate) {
                onUpdate(updatedLesson);
            }
        } catch (error) {
            console.error("Error finalizing diagram:", error);
            showToast("Failed to save the finalized diagram.", "error");
            setCurrentLesson(lesson);
        } finally {
            setIsFinalizing(false);
        }
    };

    if (!isOpen || !currentLesson) {
        return null;
    }

    const pageData = pages[currentPage];

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
                aria-hidden="true"
            />

            {/* Modal Panel - Modern, clean design */}
            <Dialog.Panel
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="relative bg-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl z-10 flex flex-col max-h-[95vh] h-[95vh] overflow-hidden border border-slate-300/50"
            >
                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-2 flex-shrink-0 rounded-t-3xl overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                </div>

                {/* Header - with "Glassmorphism" effect */}
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-900/10 bg-white/70 backdrop-blur-xl flex-shrink-0 z-10">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Dialog.Title className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                            {lessonTitle}
                        </Dialog.Title>
                        {currentLesson.studyGuideUrl && (
                            <a
                                href={currentLesson.studyGuideUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap group"
                            >
                                <ArrowDownTrayIcon className="h-5 w-5 group-hover:animate-bounce-y" />
                                <span className="hidden sm:inline">Download Study Guide</span>
                            </a>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors flex-shrink-0 ml-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Close lesson"
                    >
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </div>

                {/* Content Area */}
                <div ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar bg-slate-100 flex flex-col justify-start items-center p-6 sm:p-8">
                    <div className="w-full max-w-3xl flex-grow">
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={currentPage}
                                custom={direction}
                                variants={slideAndFadeVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-full min-h-full bg-white rounded-2xl shadow-lg p-6 sm:p-8"
                            >
                                {/* Learning Objectives Section */}
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div
                                        variants={objectivesContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="mb-8 p-6 bg-indigo-50 border-l-4 border-indigo-400 rounded-xl shadow-inner"
                                    >
                                        <h3 className="flex items-center gap-3 text-xl font-bold text-indigo-800 mb-4">
                                            <ListBulletIcon className="h-7 w-7 text-indigo-600" />
                                            {objectivesLabel}
                                        </h3>
                                        <ul className="space-y-3 text-base text-indigo-900">
                                            {objectives.map((objective, index) => (
                                                <motion.li key={index} variants={objectiveItemVariants} className="flex items-start gap-3">
                                                    <span className="text-indigo-500 flex-shrink-0 mt-1">&#11044;</span>
                                                    <span>{objective}</span>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                                {/* Lesson Page Content */}
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
                                            <p className="text-lg font-medium">No content available for this page.</p>
                                            {currentPage === 0 && <p className="text-sm mt-2">Check the lesson's objectives or add content.</p>}
                                        </div>
                                    )
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Navigation and Controls - with "Glassmorphism" effect */}
                <div className="flex justify-between items-center p-4 sm:p-5 bg-white/70 backdrop-blur-xl border-t border-slate-900/10 flex-shrink-0 z-10">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 0}
                            className="flex items-center justify-center p-2 rounded-full text-slate-600 bg-slate-200 shadow-sm hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Previous page"
                        >
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div className="hidden sm:flex items-center space-x-1">
                            <button
                                onClick={() => scrollContent(-200)}
                                className="p-2 rounded-full text-slate-600 bg-slate-200 shadow-sm hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Scroll up"
                            >
                                <ChevronUpIcon className="h-6 w-6" />
                            </button>
                            <button
                                onClick={() => scrollContent(200)}
                                className="p-2 rounded-full text-slate-600 bg-slate-200 shadow-sm hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Scroll down"
                            >
                                <ChevronDownIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <span className="text-base font-semibold text-slate-700">
                        {totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}` : 'No Pages'}
                    </span>

                    <button
                        onClick={currentPage < totalPages - 1 ? goToNextPage : onClose}
                        className={`flex items-center justify-center px-4 py-2 rounded-full text-white font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                            ${currentPage < totalPages - 1 ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:ring-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 focus:ring-emerald-500'}
                        `}
                        aria-label={currentPage < totalPages - 1 ? "Next page" : "Finish lesson"}
                    >
                        <span className="mr-2 hidden sm:inline">
                            {currentPage < totalPages - 1 ? 'Next Page' : 'Finish'}
                        </span>
                        {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-6 w-6" /> : <CheckCircleIcon className="h-6 w-6" />}
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}