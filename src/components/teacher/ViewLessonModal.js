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

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
    };

    const goToPreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 0));
    };

    // ✅ **MODIFIED LOGIC**
    // Determine the label. Prioritize the 'language' field.
    // Fall back to checking the title for the word "Aralin" for older lessons.
    const objectivesLabel = (lesson.language === 'Filipino' || (lesson.title && lesson.title.includes("Aralin"))) 
        ? "Mga Layunin" 
        : "Objectives";

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

                <div className="overflow-y-auto flex-grow px-6 pb-6 modern-scrollbar">
                    {currentPage === 0 && objectives.length > 0 && (
                        <div className="mb-6 p-4 bg-indigo-50 border-l-4 border-indigo-300 rounded-r-lg">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-indigo-800 mb-2">
                                <ListBulletIcon className="h-6 w-6" />
                                {objectivesLabel} {/* ✅ Use the dynamic label here */}
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-indigo-700">
                                {objectives.map((objective, index) => (
                                    <li key={index}>{objective}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {pageData ? (
                        <LessonPage page={pageData} />
                    ) : (
                        currentPage === 0 && objectives.length > 0 ? null : <p className="text-slate-500">This lesson has no content pages.</p>
                    )}
                </div>

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
                        {totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}`: 'Page 0 of 0'}
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