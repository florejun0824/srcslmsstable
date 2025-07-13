import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage'; // 👈 1. Import the corrected LessonPage component

export default function ViewLessonModal({ isOpen, onClose, lesson }) {
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentPage(0);
        }
    }, [isOpen, lesson]);

    if (!isOpen || !lesson || !lesson.pages || lesson.pages.length === 0) {
        return null;
    }

    const totalPages = lesson.pages.length;
    const pageData = lesson.pages[currentPage];

    const progressPercentage = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
    };

    const goToPreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 0));
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" />
            
            <Dialog.Panel className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl z-10 flex flex-col max-h-[95vh] overflow-hidden">
                
                <div className="w-full bg-slate-200 h-1.5">
                    <div
                        className="bg-indigo-600 h-1.5 rounded-r-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                <div className="flex justify-between items-center p-6 flex-shrink-0">
                    <Dialog.Title className="text-2xl font-bold text-slate-800">{lesson.title}</Dialog.Title>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* --- 👇 2. Replace the old rendering logic with our component --- */}
                <div className="overflow-y-auto flex-grow px-6 pb-6 modern-scrollbar">
                    {pageData && (
                        <LessonPage page={pageData} />
                    )}
                </div>
                {/* --- End of changed block --- */}

                <div className="flex justify-between items-center p-5 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 flex-shrink-0">
                    <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        Previous
                    </button>

                    <span className="text-sm font-medium text-slate-500">
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    
                    {currentPage < totalPages - 1 ? (
                        <button
                            onClick={goToNextPage}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            Next
                            <ArrowRightIcon className="h-5 w-5" />
                        </button>
                    ) : (
                        <button 
                            onClick={onClose} 
                            className="inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                        >
                            Finish
                        </button>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}