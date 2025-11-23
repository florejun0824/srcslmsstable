// src/components/teacher/StudentViewLessonModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    QueueListIcon,
    ArrowDownTrayIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    Squares2X2Icon,
    BookOpenIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import LessonPage from '../teacher/LessonPage';
import ContentRenderer from '../teacher/ContentRenderer';
import { useToast } from '../../contexts/ToastContext';

// --- PDF & NATIVE IMPORTS ---
import htmlToPdfmake from 'html-to-pdfmake';
import { marked } from 'marked';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

pdfMake.vfs = pdfFonts;

// --- HELPERS ---
const isNativePlatform = () => Capacitor.isNativePlatform();

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result.toString();
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) reject(new Error("Failed to convert blob to base64."));
      else resolve(base64Data);
    };
    reader.readAsDataURL(blob);
  });
};

// --- YOUR CUSTOM IMAGE FETCHER ---
const fetchImageAsBase64 = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error loading image:", url, error);
        return null; 
    }
};

const nativeSave = async (blob, fileName, mimeType, showToast) => {
  if (!isNativePlatform()) return;
  const directory = Directory.Data; 
  try {
    const base64Data = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: directory,
      recursive: true
    });
    showToast(`Opening PDF...`, 'info');
    await FileOpener.open({ filePath: result.uri, contentType: mimeType });
  } catch (error) {
    console.error('Unable to save or open file', error);
    showToast(`Error saving file: ${error.message}`, 'error');
  }
};

// --- FONT LOADING ---
async function loadFontToVfs(name, url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
  pdfMake.vfs[name] = base64;
}

let dejaVuLoaded = false;
async function registerDejaVuFonts() {
  if (dejaVuLoaded) return;
  try {
    await loadFontToVfs("DejaVuSans.ttf", "/fonts/DejaVuSans.ttf");
    await loadFontToVfs("DejaVuSans-Bold.ttf", "/fonts/DejaVuSans-Bold.ttf");
    await loadFontToVfs("DejaVuSans-Oblique.ttf", "/fonts/DejaVuSans-Oblique.ttf");
    await loadFontToVfs("DejaVuSans-BoldOblique.ttf", "/fonts/DejaVuSans-BoldOblique.ttf");
    pdfMake.fonts = {
      DejaVu: { normal: "DejaVuSans.ttf", bold: "DejaVuSans-Bold.ttf", italics: "DejaVuSans-Oblique.ttf", bolditalics: "DejaVuSans-BoldObliques.ttf" },
    };
    dejaVuLoaded = true;
  } catch (error) { console.error("Failed to load fonts:", error); }
}

const processLatex = (text) => {
    if (!text) return '';
    let p = text.replace(/\\degree/g, '°').replace(/\\angle/g, '∠');
    p = p.replace(/\\vec\{(.*?)\}/g, (m, c) => c.split('').map(char => char + '\u20D7').join(''));
    return p.replace(/\$\$(.*?)\$\$/g, '$1').replace(/\$(.*?)\$/g, '$1');
};

// --- ANIMATION VARIANTS ---
const modalVariants = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", bounce: 0.2, duration: 0.5 } },
    exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.3 } },
};

const pageTransitionVariants = {
    hidden: { opacity: 0, x: 10, filter: "blur(4px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { ease: "circOut", duration: 0.3 } },
    exit: { opacity: 0, x: -10, filter: "blur(4px)", transition: { ease: "circIn", duration: 0.2 } },
};

const navMenuVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
    exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }
};

function StudentViewLessonModal({ isOpen, onClose, onComplete, lesson, userId, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [maxPageReached, setMaxPageReached] = useState(0);
    const [xpAwarded, setXpAwarded] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isPageNavOpen, setIsPageNavOpen] = useState(false);
    
    const { showToast } = useToast();
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    
    useEffect(() => { 
        if (isOpen) { 
            setCurrentPage(0); 
            setMaxPageReached(0); 
            setXpAwarded(false);
            setIsPageNavOpen(false);
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [isOpen]);

    useEffect(() => { 
        if (currentPage > maxPageReached) setMaxPageReached(currentPage); 
    }, [currentPage, maxPageReached]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin" : "Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    const pageData = pages[currentPage];

    const scrollToTop = () => { if(contentRef.current) contentRef.current.scrollTop = 0; };

    const goToNextPage = useCallback(() => { 
        if (currentPage < totalPages - 1) { 
            setCurrentPage(p => p + 1); 
            scrollToTop();
        } 
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => { 
        if (currentPage > 0) { 
            setCurrentPage(p => p - 1); 
            scrollToTop();
        } 
    }, [currentPage]);

    const jumpToPage = (index) => {
        setCurrentPage(index);
        setIsPageNavOpen(false);
        scrollToTop();
    };

    const handleFinishLesson = async () => {
        if (xpAwarded || !onComplete || totalPages === 0 || currentPage < totalPages - 1) return;
        try {
            await onComplete({ pagesRead: maxPageReached + 1, totalPages, isFinished: true, lessonId: currentLesson?.id || null });
            setXpAwarded(true); 
        } catch (error) { showToast("Failed to finalize lesson progress.", "error"); }
    };

    const handleClose = () => {
        if (!xpAwarded && onComplete && totalPages > 0) {
            onComplete({ pagesRead: maxPageReached + 1, totalPages, isFinished: currentPage === totalPages - 1, lessonId: currentLesson?.id || null });
        }
        onClose();
    };

    useEffect(() => { 
        const handleKeyDown = (e) => { 
            if (!isOpen) return; 
            if (e.key === 'ArrowRight') goToNextPage(); 
            else if (e.key === 'ArrowLeft') goToPreviousPage(); 
            else if (e.key === 'Escape') {
                if(isPageNavOpen) setIsPageNavOpen(false);
                else handleClose();
            }
        }; 
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); 
    }, [isOpen, goToNextPage, goToPreviousPage, handleClose, isPageNavOpen]);

	const handleExportLessonPdf = async (lessonToExport) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lessonToExport.id);
	    showToast("Preparing PDF...", "info");
	    try {
            await registerDejaVuFonts();
            
            // --- INTEGRATED YOUR CODE HERE ---
            const headerBase64 = await fetchImageAsBase64("/header-port.png");
            const footerBase64 = await fetchImageAsBase64("/Footer.png");
            // --------------------------------

	        const pdfStyles = {
	            coverTitle: { fontSize: 32, bold: true, margin: [0, 0, 0, 15] },
	            coverSub: { fontSize: 18, italics: true, color: '#555555' },
	            pageTitle: { fontSize: 20, bold: true, color: '#005a9c', margin: [0, 20, 0, 8] },
	            blockquote: { margin: [20, 5, 20, 5], italics: true, color: '#4a4a4a' },
	            default: { fontSize: 11, lineHeight: 1.5, color: '#333333', alignment: 'justify' }
	        };
			const lessonTitleToExport = lessonToExport.lessonTitle || lessonToExport.title || 'Untitled Lesson';
	        let safeTitle = lessonTitleToExport.replace(/[^a-zA-Z0-9.-_]/g, '_').substring(0, 200);
			const sanitizedFileName = (safeTitle || 'lesson') + '.pdf';
	        let lessonContent = [];

	        for (const page of lessonToExport.pages) {
	            const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
	            if (cleanTitle) lessonContent.push({ text: cleanTitle, style: 'pageTitle' });
	            let html = marked.parse(processLatex(typeof page.content === 'string' ? page.content : ''));
                html = html.replace(/<blockquote>\s*<p>/g, '<blockquote>').replace(/<\/p>\s*<\/blockquote>/g, '</blockquote>');
	            lessonContent.push(htmlToPdfmake(html, { defaultStyles: pdfStyles.default }));
	        }

	        const docDefinition = {
	            pageSize: "A4", pageMargins: [72, 100, 72, 100],
	            header: { margin: [0, 20, 0, 0], stack: [{ image: "headerImg", width: 450, alignment: "center" }] },
	            footer: { margin: [0, 0, 0, 20], stack: [{ image: "footerImg", width: 450, alignment: "center" }] },
                defaultStyle: { font: 'DejaVu', ...pdfStyles.default },
	            styles: pdfStyles,
	            content: [
	                { stack: [{ text: lessonTitleToExport, style: "coverTitle" }, { text: "SRCS Learning Portal", style: "coverSub" }], alignment: "center", margin: [0, 200, 0, 0], pageBreak: "after" },
	                ...lessonContent
	            ],
	            images: { 
                    headerImg: headerBase64, 
                    footerImg: footerBase64 
                }
	        };

	        const pdfDoc = pdfMake.createPdf(docDefinition);
            if (isNativePlatform()) {
                pdfDoc.getBlob(async (blob) => { await nativeSave(blob, sanitizedFileName, 'application/pdf', showToast); setExportingLessonId(null); });
            } else {
				pdfDoc.download(sanitizedFileName, () => { setExportingLessonId(null); });
            }
	    } catch (error) { console.error("Failed to export PDF:", error); showToast("Error creating PDF.", "error"); setExportingLessonId(null); }
	};

    if (!isOpen || !currentLesson) return null;

    // --- DESIGN CONSTANTS ---
    const glassPanel = "bg-white/90 dark:bg-[#121212]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl";
    
    return (
        <Dialog open={isOpen} onClose={handleClose} className={`fixed inset-0 z-[9999] flex items-center justify-center font-sans ${className}`}>
            {/* Immersive Blur Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" 
            />
            
            {/* Modal Window */}
            <Dialog.Panel as={motion.div} variants={modalVariants} initial="hidden" animate="visible" exit="exit" 
                className={`relative w-full max-w-6xl h-[100dvh] md:h-[90vh] flex flex-col overflow-hidden md:rounded-[2.5rem] ${glassPanel}`}
            >
                
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100/10 z-20">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
                    />
                </div>

                {/* --- HEADER --- */}
                <header className="relative z-20 flex justify-between items-center px-4 py-3 sm:px-8 sm:py-5 border-b border-slate-200/50 dark:border-white/5 flex-shrink-0 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        <Dialog.Title className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate tracking-tight">
                            {lessonTitle}
                        </Dialog.Title>
                        
                        {/* JUMP TO PAGE TRIGGER */}
                        <button 
                            onClick={() => setIsPageNavOpen(!isPageNavOpen)}
                            className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit"
                        >
                            <span>{totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'Empty'}</span>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isPageNavOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Export Button */}
                        <button
                            onClick={() => currentLesson.studyGuideUrl ? window.open(currentLesson.studyGuideUrl, '_blank') : handleExportLessonPdf(currentLesson)}
                            disabled={!!exportingLessonId}
                            className="
                                flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl 
                                text-[10px] sm:text-xs font-bold transition-all duration-200
                                text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 
                                hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-500/30
                                disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
                            "
                            title={currentLesson.studyGuideUrl ? "Download Study Guide" : "Export as PDF"}
                        >
                            <ArrowDownTrayIcon className={`w-4 h-4 sm:w-4 sm:h-4 stroke-2 ${exportingLessonId ? 'animate-bounce' : ''}`} />
                            <span className="hidden sm:inline font-bold uppercase tracking-wider">
                                {currentLesson.studyGuideUrl ? 'Guide' : (exportingLessonId ? 'Saving...' : 'PDF')}
                            </span>
                        </button>

                        {/* Close Button */}
                        <button onClick={handleClose} className="p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all">
                            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                        </button>
                    </div>

                    {/* JUMP TO PAGE DROPDOWN OVERLAY */}
                    <AnimatePresence>
                        {isPageNavOpen && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-10 bg-black/10 backdrop-blur-[1px]" 
                                    onClick={() => setIsPageNavOpen(false)}
                                />
                                <motion.div 
                                    variants={navMenuVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="absolute top-full left-4 sm:left-8 mt-2 w-64 p-3 rounded-2xl bg-white/90 dark:bg-[#1a1d24]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl z-20"
                                >
                                    <div className="flex items-center gap-2 mb-2 px-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        <Squares2X2Icon className="w-3 h-3" />
                                        Jump to page
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                        {pages.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => jumpToPage(idx)}
                                                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                                                    currentPage === idx
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </header>
                
                {/* --- CONTENT --- */}
                <main ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center p-4 sm:p-6 md:p-10 pb-20 sm:pb-10 relative bg-[#f8f9fa] dark:bg-transparent">
                    <div className="w-full max-w-4xl flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div 
                                key={currentPage} 
                                variants={pageTransitionVariants} 
                                initial="hidden" 
                                animate="visible" 
                                exit="exit" 
                                className="w-full min-h-full"
                            >
                                {/* Objectives Card */}
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm"
                                    >
                                        <h3 className="flex items-center gap-3 text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">
                                            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                                                <QueueListIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                                            </div>
                                            {objectivesLabel}
                                        </h3>
                                        <ul className="grid gap-3 sm:gap-4 text-xs sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                            {objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-3 sm:gap-4">
                                                    <CheckCircleSolid className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1"><ContentRenderer text={objective} /></div>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}

                                {/* Lesson Content - Justified & Indented */}
                                {pageData ? (
                                    <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-justify [&_p]:indent-8">
                                        {pageData.title && (
                                            <motion.h1 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 sm:mb-8 tracking-tight leading-tight text-left indent-0"
                                            >
                                                {pageData.title}
                                            </motion.h1>
                                        )}
                                        
                                        <LessonPage
                                            ref={lessonPageRef}
                                            page={pageData}
                                            isEditable={false} 
                                            isFinalizing={false} 
                                        />
                                    </article>
                                ) : (
                                    currentPage === 0 && objectives.length > 0 ? null : ( 
                                        <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 h-64">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                                <QuestionMarkCircleIcon className="w-8 h-8 sm:w-10 sm:w-10 opacity-50 stroke-1" />
                                            </div>
                                            <p className="text-sm sm:text-lg font-medium">This page is empty.</p>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
                
                {/* --- FOOTER CONTROL DECK --- */}
                <footer className="absolute bottom-0 left-0 right-0 sm:static flex-shrink-0 py-4 sm:py-5 px-6 border-t border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl flex justify-center items-center z-20">
                    <div className="flex items-center gap-2 sm:gap-4 p-1.5 sm:p-2 pl-2 sm:pl-3 pr-2 sm:pr-3 bg-white dark:bg-white/5 backdrop-blur-xl rounded-full shadow-lg border border-slate-100 dark:border-white/10">
                        
                        {/* Previous */}
                        <button 
                            onClick={goToPreviousPage} 
                            disabled={currentPage === 0} 
                            className="p-2 sm:p-2.5 rounded-full transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                        </button>

                        {/* Divider */}
                        <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

                        {/* Next / Finish */}
                        <button
                            onClick={currentPage < totalPages - 1 ? goToNextPage : handleFinishLesson}
                            className={`
                                flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm text-white shadow-md transition-all active:scale-95
                                ${currentPage < totalPages - 1 
                                    ? 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:scale-105' 
                                    : xpAwarded 
                                        ? 'bg-green-500 hover:bg-green-600' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }
                                ${totalPages === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <span>{currentPage < totalPages - 1 ? 'Next' : xpAwarded ? 'Done' : 'Finish'}</span>
                            {currentPage < totalPages - 1 
                                ? <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4 stroke-2" /> 
                                : xpAwarded ? <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 stroke-2" /> : <CheckCircleSolid className="h-3 w-3 sm:h-4 sm:w-4" />
                            }
                        </button>
                    </div>
                </footer>
            </Dialog.Panel>
        </Dialog>
    );
}
export default React.memo(StudentViewLessonModal);