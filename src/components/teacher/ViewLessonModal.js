import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon, ListBulletIcon } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage';

export default function ViewLessonModal({ isOpen, onClose, lesson }) {
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentPage(0);
        }
    }, [isOpen, lesson]);

    if (!isOpen || !lesson) {
        return null;
    }

    const pages = lesson.pages || [];
    const objectives = lesson.objectives || [];
    const totalPages = pages.length;
    const pageData = pages[currentPage];
    const progressPercentage = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;
    const objectivesLabel = (lesson.language === 'Filipino' || (lesson.title && lesson.title.includes("Aralin")))
        ? "Mga Layunin"
        : "Objectives";

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
    };
    const goToPreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 0));
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" />
            
            <Dialog.Panel className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl z-10 flex flex-col max-h-[95vh] overflow-hidden">
                <div className="w-full bg-slate-200 h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-r-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                </div>
                {/* Responsive padding and font size for the header */}
                <div className="flex justify-between items-center p-4 sm:p-6 flex-shrink-0">
                    {/* Adjusted text size for responsiveness */}
                    <Dialog.Title className="text-lg sm:text-2xl font-bold text-slate-800 pr-4">{lesson.title}</Dialog.Title>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors flex-shrink-0">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                {/* Responsive padding for content area */}
                <div className="overflow-y-auto flex-grow px-4 sm:px-6 pb-4 sm:pb-6 modern-scrollbar">
                    {currentPage === 0 && objectives.length > 0 && (
                        <div className="mb-6 p-3 sm:p-4 bg-indigo-50 border-l-4 border-indigo-300 rounded-r-lg">
                            {/* Adjusted heading and icon size for responsiveness */}
                            <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-indigo-800 mb-2">
                                <ListBulletIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                                {objectivesLabel}
                            </h3>
                            {/* Smaller font size for objectives list */}
                            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-indigo-700">
                                {objectives.map((objective, index) => (
                                    <li key={index}>{objective}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {pageData ? (
                        <LessonPage page={pageData} />
                    ) : (
                        currentPage === 0 && objectives.length > 0 ? null : <p className="text-slate-500 text-sm sm:text-base">This lesson has no content pages.</p>
                    )}
                </div>
                {/* Responsive padding and font/button sizes in the footer */}
                <div className="flex justify-between items-center p-3 sm:p-5 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 flex-shrink-0">
                    <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 0}
                        // Adjusted padding, text size, and icon size for responsiveness
                        className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                        <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline">Previous</span> {/* Hide "Previous" text on small screens */}
                        <span className="sm:hidden">Prev</span> {/* Show "Prev" text on small screens */}
                    </button>
                    <span className="text-xs sm:text-sm font-medium text-slate-500 flex-shrink-0 mx-2"> {/* Added flex-shrink-0 and mx-2 */}
                        {totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}`: 'Page 0 of 0'}
                    </span>
                    {currentPage < totalPages - 1 ? (
                        <button
                            onClick={goToNextPage}
                            // Adjusted padding, text size, and icon size for responsiveness
                            className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                            <span className="hidden sm:inline">Next</span> {/* Hide "Next" text on small screens */}
                            <span className="sm:hidden">Next</span> {/* Show "Next" text on small screens */}
                            <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    ) : (
                        <button 
                            onClick={onClose} 
                            // Adjusted padding and text size for responsiveness
                            className="inline-flex items-center px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                            Finish
                        </button>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}
