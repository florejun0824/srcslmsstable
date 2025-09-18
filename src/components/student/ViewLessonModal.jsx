import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import ContentRenderer from '../teacher/ContentRenderer'; 

// --- Animation variants for page transitions ---
const pageVariants = {
  hidden: (direction) => ({
    opacity: 0,
    x: direction > 0 ? '100%' : '-100%',
  }),
  visible: {
    opacity: 1,
    x: '0%',
    transition: { 
      type: 'spring', 
      stiffness: 400, 
      damping: 40    
    },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction < 0 ? '100%' : '-100%',
    transition: { type: 'tween', ease: 'easeInOut', duration: 0.3 },
  }),
};

// Helper function to get embeddable video URLs
const getVideoEmbedUrl = (url) => {
    if (!url || typeof url !== 'string') return null;

    let videoId;
    // Removed double semicolon from youtubeRegex
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
        videoId = youtubeMatch[1];
        // Fixed: Using standard YouTube embed URL with correct template literal syntax
        return `https://www.youtube.com/embed/${videoId}`; 
    }

    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return url;
    }

    return null;
};

export default function ViewLessonModal({ isOpen, onClose, lesson }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0); 
  const [mediaLoading, setMediaLoading] = useState(true); 
  const scrollableContentRef = useRef(null); 

  const totalPages = lesson?.pages?.length || 0;

  // Effect to reset page when modal opens or lesson changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
      setDirection(0);
    }
    // mediaLoading is handled by the pageData-dependent useEffect below
  }, [isOpen, lesson]); 

  // --- NEW LOGIC FOR MEDIA LOADING STATE ---
  useEffect(() => {
    if (!lesson || !lesson.pages || lesson.pages.length === 0) {
      setMediaLoading(false); // No lesson or pages, so no media to load
      return;
    }

    const currentPageData = lesson.pages[currentPage];
    if (!currentPageData) {
      setMediaLoading(false); // No data for current page, so no media to load
      return;
    }

    let isMediaPage = false;

    // Check if the current page type suggests media content
    if (currentPageData.type === 'diagram-data') {
      try {
        const diagramContent = typeof currentPageData.content === 'string' ? JSON.parse(currentPageData.content) : currentPageData.content;
        if (diagramContent && diagramContent.generatedImageUrl) {
          isMediaPage = true;
        } else {
            // Diagram data present, but no valid image URL, so no media to load
            setMediaLoading(false);
            return;
        }
      } catch (e) {
        console.error("Error parsing diagram data:", e);
        // Error parsing diagram, so no media to load
        setMediaLoading(false);
        return;
      }
    } else if (currentPageData.type === 'video') {
      if (getVideoEmbedUrl(currentPageData.content)) {
        isMediaPage = true;
      } else {
          // Invalid video URL, so no media to load
          setMediaLoading(false);
          return;
      }
    } else if (currentPageData.type === 'text' && currentPageData.imageUrl) {
      // Text page with an associated image is also considered a media page
      isMediaPage = true;
    }

    // Set mediaLoading based on whether it's a media page
    if (isMediaPage) {
      // If it's a media page, assume loading true and let media elements turn it off
      setMediaLoading(true);
    } else {
      // If it's not a media page, turn off loading immediately
      setMediaLoading(false);
    }
  }, [lesson, currentPage]); // Dependencies: lesson, currentPage

  const goToNextPage = useCallback(() => {
    setDirection(1); 
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
    // mediaLoading will be reset by the useEffect depending on pageData
  }, [totalPages]); 

  const goToPreviousPage = useCallback(() => {
    setDirection(-1); 
    setCurrentPage((prev) => Math.max(prev - 1, 0));
    // mediaLoading will be reset by the useEffect depending on pageData
  }, []); 

  // Effect for keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return; 

      if (event.key === 'ArrowRight') {
        if (currentPage < totalPages - 1) {
          goToNextPage();
        } else if (currentPage === totalPages - 1) {
          onClose(); 
        }
      } else if (event.key === 'ArrowLeft') {
        if (currentPage > 0) {
          goToPreviousPage();
        }
      } else if (event.key === 'ArrowUp') {
        if (scrollableContentRef.current) {
          scrollableContentRef.current.scrollBy({ top: -100, behavior: 'smooth' }); 
        }
      } else if (event.key === 'ArrowDown') {
        if (scrollableContentRef.current) {
          scrollableContentRef.current.scrollBy({ top: 100, behavior: 'smooth' }); 
        }
      } else if (event.key === 'Escape') { 
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentPage, totalPages, goToNextPage, goToPreviousPage, onClose]);


  if (!isOpen || !lesson || !lesson.pages || lesson.pages.length === 0) {
    return null;
  }

  const pageData = lesson.pages[currentPage];
  const progressPercentage = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;


  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" />
      
      <Dialog.Panel className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl z-10 flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-1.5">
          <div
            className="bg-indigo-600 h-1.5 rounded-r-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <Dialog.Title className="text-2xl font-extrabold text-slate-800 line-clamp-1">{lesson.title}</Dialog.Title>

            {lesson.studyGuideUrl && (
              <a
                href={lesson.studyGuideUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download Guide
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-300 hover:text-slate-600 transition-colors duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content Area with Page Transitions */}
        <div 
          ref={scrollableContentRef} 
          // Added min-h-[70vh] to ensure a consistent minimum height for the content area
          className="overflow-y-auto flex-grow px-6 py-5 modern-scrollbar bg-slate-100 relative min-h-[70vh]"
        >
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentPage} 
              custom={direction}
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="prose max-w-none prose-slate bg-white p-6 rounded-xl shadow-lg min-h-full" 
            >
              {/* Custom Loading Indicator for ViewLessonModal */}
              {mediaLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-20 rounded-xl">
                  {/* Basic Tailwind CSS Spinner */}
                  <div className="w-12 h-12 border-4 border-t-4 border-indigo-500 border-solid rounded-full animate-spin border-t-transparent"></div>
                  <p className="mt-4 text-slate-700 font-semibold text-lg">Loading Media, Please Wait...</p>
                  <p className="text-sm text-slate-500">Content will appear shortly.</p>
                </div>
              )}

              {pageData && (() => {
                switch (pageData.type) {
                  case 'diagram-data':
                    try {
                      const diagramContent = typeof pageData.content === 'string' ? JSON.parse(pageData.content) : pageData.content;
                      if (diagramContent && diagramContent.generatedImageUrl) {
                        return (
                          <div className="my-5 flex justify-center items-center">
                            <img
                              src={diagramContent.generatedImageUrl}
                              alt={pageData.title || "Lesson Diagram"}
                              className={`max-w-full h-auto object-contain rounded-lg shadow-md border border-slate-200 ${mediaLoading ? 'hidden' : 'block'}`}
                              loading="lazy" 
                              onLoad={() => setMediaLoading(false)} 
                              onError={() => setMediaLoading(false)} 
                            />
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error("Error parsing diagram data in student ViewLessonModal:", e);
                      return <p className="text-red-500 text-center">Error loading diagram content.</p>;
                    }
                    return null; 
                  
                  case 'video':
                    const embedUrl = getVideoEmbedUrl(pageData.content);
                    const isDirectVideo = embedUrl && embedUrl.match(/\.(mp4|webm|ogg)$/i);
                    if (!embedUrl) {
                        return <p className="text-red-500 text-center">Invalid or unsupported video URL for this lesson.</p>;
                    }
                    return isDirectVideo ? (
                      <video 
                        controls 
                        className={`w-full rounded-lg shadow-md aspect-video bg-black ${mediaLoading ? 'hidden' : 'block'}`} 
                        loading="lazy"
                        onCanPlayThrough={() => setMediaLoading(false)} 
                        onError={() => setMediaLoading(false)}
                      >
                        <source src={embedUrl} type={`video/${embedUrl.split('.').pop()}`} />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className={`aspect-w-16 aspect-h-9 w-full ${mediaLoading ? 'hidden' : 'block'}`}> 
                        <iframe
                          className="w-full h-full rounded-lg shadow-md"
                          src={embedUrl}
                          title={pageData.title || 'Lesson Video'}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          loading="lazy" 
                          onLoad={() => setMediaLoading(false)}
                        ></iframe>
                      </div>
                    );

                  case 'text': 
                  default:
                    return (
                      <>
                        {pageData.imageUrl && ( 
                            <div className="my-5 flex justify-center items-center">
                              <img
                                src={pageData.imageUrl}
                                alt={pageData.title}
                                className={`max-w-full h-auto object-contain rounded-lg shadow-md border border-slate-200 ${mediaLoading ? 'hidden' : 'block'}`}
                                loading="lazy" 
                                onLoad={() => setMediaLoading(false)}
                                onError={() => setMediaLoading(false)}
                              />
                            </div>
                        )}
                        <ContentRenderer text={pageData.content} />
                      </>
                    );
                }
              })()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center p-5 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 flex-shrink-0">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-full shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Previous
          </button>

          <span className="text-sm font-medium text-slate-500 select-none">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          {currentPage < totalPages - 1 ? (
            <button
              onClick={goToNextPage}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-full shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all duration-200"
            >
              Next
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          ) : (
            <button 
              onClick={onClose} 
              className="inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-full shadow-sm hover:bg-green-700 transition-all duration-200"
            >
              Finish
            </button>
          )}
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}