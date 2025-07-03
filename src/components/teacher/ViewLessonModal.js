import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

export default function ViewLessonModal({ isOpen, onClose, lesson }) {
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
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

  return (
    // --- FIX: Add a higher z-index to ensure it appears on top ---
    <Dialog open={isOpen} onClose={onClose} static={true} className="z-[100]">
      <DialogPanel className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl flex flex-col" style={{ height: '90vh' }}>
        <Title className="mb-2">{lesson.title}</Title>
        {lesson.studyGuideUrl && (
          <a 
            href={lesson.studyGuideUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline mb-4 block"
          >
            View Study Guide
          </a>
        )}
        
        <div className="flex-grow overflow-y-auto pr-2">
          {currentPageData ? (
            <div className="prose prose-lg max-w-none">
              {currentPageData.title && (
                <h2 className="text-xl font-semibold mb-2">{currentPageData.title}</h2>
              )}
              <div dangerouslySetInnerHTML={{ __html: currentPageData.content }} />
            </div>
          ) : (
            <p className="text-gray-500">This lesson does not have any content yet.</p>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t">
          <Button 
            icon={ArrowLeftIcon} 
            onClick={goToPrevPage} 
            disabled={currentPage === 0}
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