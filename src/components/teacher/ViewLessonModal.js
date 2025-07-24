// src/components/teacher/ViewLessonModal.js

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
// NEW: Added framer-motion for animations
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon, ListBulletIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage';

// --- NEW: Animation variants for page transitions ---
const pageVariants = {
  hidden: (direction) => ({
    opacity: 0,
    x: direction > 0 ? '100%' : '-100%',
  }),
  visible: {
    opacity: 1,
    x: '0%',
    transition: { type: 'spring', stiffness: 40, damping: 15 },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction < 0 ? '100%' : '-100%',
    transition: { type: 'tween', ease: 'easeInOut', duration: 0.4 },
  }),
};

// --- NEW: Animation variants for staggering objectives ---
const objectivesContainerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const objectiveItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ViewLessonModal({ isOpen, onClose, lesson }) {
    const [currentPage, setCurrentPage] = useState(0);
    // NEW: State to track animation direction for page slides
    const [direction, setDirection] = useState(1);

    const pages = lesson?.pages || [];
    const objectives = lesson?.objectives || [];
    const totalPages = pages.length;

    // --- REFRESHED: Improved logic for language detection ---
    const objectivesLabel = lesson?.language === 'Filipino' ? "Mga Layunin" : "Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    
    // --- NEW: Keyboard navigation ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') {
                goToNextPage();
            } else if (e.key === 'ArrowLeft') {
                goToPreviousPage();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentPage, totalPages]); // Re-bind if state changes

    useEffect(() => {
        if (isOpen) {
            setCurrentPage(0);
        }
    }, [isOpen]);

    if (!isOpen || !lesson) {
        return null;
    }

    const goToNextPage = () => {
        if (currentPage < totalPages - 1) {
            setDirection(1); // Set direction for "forward" animation
            setCurrentPage(currentPage + 1);
        }
    };
    const goToPreviousPage = () => {
        if (currentPage > 0) {
            setDirection(-1); // Set direction for "backward" animation
            setCurrentPage(currentPage - 1);
        }
    };

    const pageData = pages[currentPage];

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              aria-hidden="true"
            />
            
            <Dialog.Panel as={motion.div} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl z-10 flex flex-col max-h-[95vh] h-[95vh] overflow-hidden"
            >
                {/* --- REFRESHED: Thicker progress bar --- */}
                <div className="w-full bg-slate-200 h-2 flex-shrink-0">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-r-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                </div>

                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Dialog.Title className="text-lg sm:text-xl font-bold text-slate-800 truncate">{lesson.title}</Dialog.Title>
                        {lesson.studyGuideUrl && (
                             <a href={lesson.studyGuideUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap">
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Download Guide</span>
                            </a>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors flex-shrink-0 ml-4">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* --- REFRESHED: Main content area with animations --- */}
                <div className="flex-grow overflow-y-auto modern-scrollbar relative">
                    <AnimatePresence initial={false} custom={direction}>
                        <motion.div
                            key={currentPage} // This key is crucial for AnimatePresence
                            custom={direction}
                            variants={pageVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="p-4 sm:p-6 w-full h-full"
                        >
                            {/* --- REFRESHED: Staggered animation for objectives --- */}
                            {currentPage === 0 && objectives.length > 0 && (
                                <motion.div
                                    variants={objectivesContainerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="mb-6 p-4 bg-indigo-50/70 border-l-4 border-indigo-300 rounded-r-lg"
                                >
                                    <h3 className="flex items-center gap-2.5 text-lg font-bold text-indigo-800 mb-3">
                                        <ListBulletIcon className="h-6 w-6" />
                                        {objectivesLabel}
                                    </h3>
                                    <ul className="space-y-2 text-base text-indigo-800/90">
                                        {objectives.map((objective, index) => (
                                            <motion.li key={index} variants={objectiveItemVariants} className="flex items-start gap-3">
                                                <span className="text-indigo-400 mt-1.5">&#9679;</span>
                                                <span>{objective}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}
                            {pageData ? (
                                <LessonPage page={pageData} />
                            ) : (
                                currentPage === 0 && objectives.length > 0 ? null : <p className="text-slate-500">This lesson has no content pages.</p>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* --- REFRESHED: Cleaner and more responsive footer --- */}
                <div className="flex justify-between items-center p-3 sm:p-4 bg-slate-100/80 backdrop-blur-sm border-t border-slate-200/80 flex-shrink-0">
                    <button onClick={goToPreviousPage} disabled={currentPage === 0} className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full sm:rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-all">
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span className="hidden sm:inline sm:ml-2 text-sm font-semibold">Previous</span>
                    </button>
                    <span className="text-sm font-medium text-slate-500">
                        {totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}`: 'No Pages'}
                    </span>
                     <button
                        onClick={currentPage < totalPages - 1 ? goToNextPage : onClose}
                        className={`flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full sm:rounded-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${currentPage < totalPages - 1 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        <span className="hidden sm:inline sm:mr-2 text-sm font-semibold">
                          {currentPage < totalPages - 1 ? 'Next' : 'Finish'}
                        </span>
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}