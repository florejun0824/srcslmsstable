import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

// This is the same renderer from your CreateAiLessonModal to ensure consistent formatting.
const MarkdownRenderer = ({ text = '' }) => {
  // Split the text by the bold markdown pattern, keeping the delimiters
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <p className="text-sm whitespace-pre-line text-gray-700">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // If the part is bold, render it inside a <strong> tag
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        // Otherwise, render the text as is
        return part;
      })}
    </p>
  );
};

export default function ViewLessonModal({ isOpen, onClose, lesson }) {
  // ✅ NEW: State to track the current page index
  const [currentPage, setCurrentPage] = useState(0);

  // ✅ NEW: Reset to the first page whenever the modal is opened or the lesson changes.
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

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30" />
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl z-10 flex flex-col max-h-[90vh]">
        <Dialog.Title className="text-xl font-bold mb-4 border-b pb-2 flex-shrink-0">{lesson.title}</Dialog.Title>

        {/* ✅ CHANGED: This section now displays only one page at a time */}
        <div className="space-y-6 overflow-y-auto flex-grow">
          {pageData && (
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">{pageData.title}</h3>
              <MarkdownRenderer text={pageData.content} />
            </div>
          )}
        </div>

        {/* ✅ NEW: Navigation controls */}
        <div className="mt-6 flex justify-between items-center pt-4 border-t flex-shrink-0">
          <button 
            onClick={goToPreviousPage} 
            disabled={currentPage === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Previous
          </button>
          
          <span className="text-sm font-medium text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>

          {currentPage < totalPages - 1 ? (
            <button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages - 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={onClose} className="btn-primary">
              Finish
            </button>
          )}
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
