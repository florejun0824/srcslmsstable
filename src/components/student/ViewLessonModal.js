import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, Text } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, CloudArrowDownIcon } from '@heroicons/react/24/solid';
import ContentRenderer from '../teacher/ContentRenderer'; // Adjust path if necessary

export default function ViewLessonModal({ isOpen, onClose, lesson }) {
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    // Reset to the first page whenever a new lesson is opened
    setCurrentPage(0);
  }, [lesson]);

  if (!lesson) return null;

  const totalPages = lesson.pages?.length || 0;
  const hasPages = totalPages > 0;
  const currentPageData = hasPages ? lesson.pages[currentPage] : null;

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // This function opens the linked study guide in a new browser tab
  const openStudyGuide = () => {
    if (lesson.studyGuideUrl) {
        window.open(lesson.studyGuideUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} static={true} className="z-[100]">
      <DialogPanel className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl flex flex-col" style={{ height: '90vh' }}>
        <Title className="mb-2">{lesson.title}</Title>

        {/* --- THIS IS THE FIX --- */}
        {/* The button is now green, smaller, and aligned to the right. */}
        {lesson.studyGuideUrl && (
            <div className="flex justify-end my-2">
                <button 
                    onClick={openStudyGuide}
                    className="
                        flex items-center justify-center gap-2 
                        px-5 py-2.5
                        font-semibold text-white 
                        bg-gradient-to-r from-green-500 to-emerald-600 
                        rounded-lg 
                        shadow-md 
                        hover:from-green-600 hover:to-emerald-700 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
                        transition-all duration-300 transform hover:scale-105
                    "
                >
                    <CloudArrowDownIcon className="w-5 h-5" />
                    Study Guide
                </button>
            </div>
        )}
        
        {/* The main content area with a smaller font size */}
        <div className="flex-grow overflow-y-auto pr-2 border-t border-gray-200 pt-4">
          {currentPageData ? (
             // MODIFIED: Changed prose-lg to prose for a smaller font
            <div className="prose max-w-none">
              {currentPageData.title && (
                <h2 className="text-xl font-semibold mb-2">{currentPageData.title}</h2>
              )}
              <ContentRenderer text={currentPageData.content} />
            </div>
          ) : (
            <p className="text-gray-500">This lesson does not have any content yet.</p>
          )}
        </div>

        {/* The pagination controls remain the same */}
        <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t">
          <Button 
            icon={ArrowLeftIcon} 
            onClick={goToPrevPage} 
            disabled={currentPage === 0}
            variant="secondary"
          >
            Previous
          </Button>

          {hasPages && (
            <span className="text-sm font-medium text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
          )}

          <Button 
            icon={ArrowRightIcon} 
            iconPosition="right"
            onClick={goToNextPage} 
            disabled={currentPage >= totalPages - 1}
            variant="secondary"
          >
            Next
          </Button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}