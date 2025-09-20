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
import { doc, updateDoc, setDoc, serverTimestamp  } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

async function markLessonCompleted() {
  if (!studentId || !currentLesson?.id) {
    console.error("Missing studentId or lessonId for progress update");
    return;
  }

  const progressRef = doc(db, "lessonProgress", `${studentId}_${currentLesson.id}`);

  await setDoc(progressRef, {
    studentId,
    lessonId: currentLesson.id,
    classId: currentLesson.classId,
    unitId: currentLesson.unitId,
    completed: true,
    completedAt: new Date(),
    pagesRead: currentLesson.pages?.length || 0,
    totalPages: currentLesson.pages?.length || 0,
    overdue: false
  }, { merge: true });
}

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

const objectivesContainerVariants = { visible: { transition: { staggerChildren: 0.07 } } };
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
        if (isOpen) setCurrentPage(0);
    }, [lesson, isOpen]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin sa Pagkatuto" : "Learning Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

	const markAsCompleted = async (studentId) => {
	    try {
	        const progressRef = doc(db, "lessonProgress", `${studentId}_${currentLesson.id}`);

	        await setDoc(progressRef, {
	            studentId,
	            lessonId: currentLesson.id,
	            classId: currentLesson.classId || null,
	            unitId: currentLesson.unitId || null,
	            pagesRead: currentLesson.pages?.length || 0,
	            totalPages: currentLesson.pages?.length || 0,
	            completed: true,
	            completedAt: serverTimestamp()
	        }, { merge: true });

	        showToast("Lesson marked as completed!", "success");

	        // 🔑 Notify parent (LessonsByUnitView) so it moves tab immediately
	        if (onUpdate) onUpdate({ ...currentLesson, completed: true });
	    } catch (error) {
	        console.error("Error marking lesson as completed:", error);
	        showToast("Failed to mark lesson as completed.", "error");
	    }
	};

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
                index === pageIndex ? { ...page, content: finalizedContent } : page
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
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-50 flex items-center justify-center font-sans ${className}`}>
            {/* Darkened overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/40"
                aria-hidden="true"
            />

            <Dialog.Panel
                as={motion.div}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative bg-neumorphic-base rounded-2xl shadow-neumorphic w-full max-w-5xl z-10 flex flex-col h-full md:h-[90vh] md:max-h-[700px] overflow-hidden"
            >
                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-1.5 flex-shrink-0 rounded-full shadow-inner">
                    <div className="bg-red-600 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                </div>

                {/* Neumorphic Header */}
                <header className="flex justify-between items-center p-4 sm:p-5 bg-neumorphic-base shadow-neumorphic-inset flex-shrink-0 z-10 rounded-t-2xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Dialog.Title className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                            {lessonTitle}
                        </Dialog.Title>
                        {currentLesson.studyGuideUrl && (
                            <a
                                href={currentLesson.studyGuideUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={markAsCompleted} // ✅ Mark as completed when study guide is downloaded
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 
                                           bg-neumorphic-base rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                                <span className="hidden sm:inline">Study Guide</span>
                            </a>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset text-slate-600 hover:text-red-600 transition-all"
                        aria-label="Close lesson"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Lesson Pages */}
                <main ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar bg-neumorphic-base p-4 sm:p-8">
                    <div className="w-full max-w-3xl mx-auto flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div
                                key={currentPage}
                                variants={pageTransitionVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-full min-h-full bg-neumorphic-base rounded-xl shadow-neumorphic-inset p-6 sm:p-8"
                            >
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div
                                        variants={objectivesContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="mb-8 p-5 bg-neumorphic-base shadow-neumorphic-inset rounded-xl"
                                    >
                                        <h3 className="flex items-center gap-3 text-lg font-bold text-slate-800 mb-4">
                                            <ListBulletIcon className="h-6 w-6 text-red-600" />
                                            {objectivesLabel}
                                        </h3>
                                        <ul className="space-y-3 text-base text-slate-700">
                                            {objectives.map((objective, index) => (
                                                <motion.li key={index} variants={objectiveItemVariants} className="flex items-start gap-3">
                                                    <CheckCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                                                    <div className="flex-1">
                                                      {typeof objective === 'string' ? objective : 'Complex objective'}
                                                    </div>
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
                
                {/* Neumorphic Footer */}
                <footer className="flex justify-between items-center p-4 bg-neumorphic-base shadow-neumorphic-inset flex-shrink-0 z-10 rounded-b-2xl">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 0}
                            className="p-3 rounded-full bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            aria-label="Previous page"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <div className="hidden md:flex items-center gap-2">
                            <button onClick={() => scrollContent(-200)} className="p-3 rounded-full bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset text-slate-600 transition-all" aria-label="Scroll up">
                                <ChevronUpIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => scrollContent(200)} className="p-3 rounded-full bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset text-slate-600 transition-all" aria-label="Scroll down">
                                <ChevronDownIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <span className="text-sm font-semibold text-slate-600">
                        {totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'No Pages'}
                    </span>

                    <button
                        onClick={async () => {
                            if (currentPage < totalPages - 1) {
                                goToNextPage();
                            } else {
                                await markAsCompleted(); // ✅ Mark as completed when finishing last page
                                onClose();
                            }
                        }}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 rounded-full text-white font-semibold transition-all shadow-md active:scale-95
                            ${currentPage < totalPages - 1 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                        `}
                        aria-label={currentPage < totalPages - 1 ? "Next page" : "Finish lesson"}
                    >
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
