// src/components/teacher/StudentViewLessonModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ListBulletIcon,
    ArrowDownTrayIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon,
    BookOpenIcon,
    DocumentTextIcon
} from '@heroicons/react/24/solid';
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

// --- NATIVE HELPERS ---
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
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

const contentVariants = {
    hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.2 } }
};

function StudentViewLessonModal({ isOpen, onClose, onComplete, lesson, userId, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [maxPageReached, setMaxPageReached] = useState(0);
    const [xpAwarded, setXpAwarded] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    
    // Page Navigation Input State
    const [pageInput, setPageInput] = useState("1");

    const { showToast } = useToast();
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    
    useEffect(() => { 
        if (isOpen) { 
            setCurrentPage(0); 
            setPageInput("1");
            setMaxPageReached(0); 
            setXpAwarded(false);
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [isOpen]);

    useEffect(() => { 
        if (currentPage > maxPageReached) setMaxPageReached(currentPage); 
        // Sync input display when page changes programmatically (e.g. Next/Prev buttons)
        setPageInput(String(currentPage + 1));
    }, [currentPage, maxPageReached]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin" : "Learning Objectives";
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

    // --- EDITABLE PAGE LOGIC (ROBUST FOR APK) ---
    const handlePageInputBlur = () => {
        let pageNum = parseInt(pageInput, 10);
        
        // Validation: If invalid or out of bounds, revert to current page
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
            setPageInput(String(currentPage + 1));
            return;
        }
        
        // Valid change
        setPageInput(String(pageNum));
        setCurrentPage(pageNum - 1);
        scrollToTop();
    };

    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission or weird APK behavior
            e.target.blur(); // Triggers handlePageInputBlur
        }
    };

    // --- Auto-select for easy typing on mobile ---
    const handleInputFocus = (e) => {
        e.target.select();
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
            // Only listen to arrows if we aren't focused on the input
            if (document.activeElement.tagName !== "INPUT") {
                if (e.key === 'ArrowRight') goToNextPage(); 
                else if (e.key === 'ArrowLeft') goToPreviousPage(); 
            }
        }; 
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); 
    }, [isOpen, goToNextPage, goToPreviousPage]);

	const handleExportLessonPdf = async (lessonToExport) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lessonToExport.id);
	    showToast("Preparing PDF...", "info");
	    try {
            await registerDejaVuFonts();
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
	            images: { headerImg: "https://i.ibb.co/xt5CY6GY/header-port.png", footerImg: "https://i.ibb.co/kgrMBfDr/Footer.png" }
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

    return (
        <Dialog open={isOpen} onClose={handleClose} className={`fixed inset-0 z-[9999] flex items-center justify-center font-sans ${className}`}>
            {/* Immersive Blur Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" aria-hidden="true" 
            />
            
            {/* Modal Window */}
            <Dialog.Panel as={motion.div} variants={modalVariants} initial="hidden" animate="visible" exit="exit" 
                className="
                    relative w-full max-w-6xl h-full md:h-[92vh] z-10 flex flex-col 
                    md:rounded-[28px] overflow-hidden
                    bg-white/95 dark:bg-[#0F172A]/95 
                    backdrop-blur-2xl
                    shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] dark:shadow-black/90
                    border-0 md:border border-white/40 dark:border-white/10
                    ring-1 ring-black/5
                "
            >
                
                {/* --- HEADER --- */}
                <header className="relative z-20 flex-shrink-0 bg-transparent border-b border-slate-200/80 dark:border-white/5">
                    {/* Laser Progress Line (Top Edge) */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-transparent">
                        <div className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.8)]" 
                             style={{ width: `${progressPercentage}%` }} />
                    </div>

                    <div className="flex justify-between items-center p-3 sm:p-4">
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 items-center justify-center shadow-sm border border-black/5 dark:border-white/10">
                                <BookOpenIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <Dialog.Title className="text-base font-bold text-slate-900 dark:text-white truncate tracking-tight">
                                    {lessonTitle}
                                </Dialog.Title>
                                <p className="hidden sm:block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                                    {totalPages} Pages
                                </p>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            {/* Export Button - Icon on Mobile, Text on Desktop */}
                            <button
                                onClick={() => currentLesson.studyGuideUrl ? window.open(currentLesson.studyGuideUrl, '_blank') : handleExportLessonPdf(currentLesson)}
                                disabled={!!exportingLessonId}
                                className="
                                    flex items-center justify-center gap-2 
                                    w-8 h-8 sm:w-auto sm:h-8 sm:px-3
                                    rounded-lg font-semibold text-xs transition-all duration-200
                                    bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 
                                    hover:bg-blue-50 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-300
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                "
                                title={currentLesson.studyGuideUrl ? "Download Study Guide" : "Export as PDF"}
                            >
                                <ArrowDownTrayIcon className={`w-4 h-4 ${exportingLessonId ? 'animate-bounce' : ''}`} />
                                <span className="hidden sm:inline font-bold">
                                    {currentLesson.studyGuideUrl ? 'Guide' : (exportingLessonId ? 'Saving...' : 'PDF')}
                                </span>
                            </button>

                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block"></div>

                            {/* Close Button */}
                            <button 
                                onClick={handleClose} 
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-colors duration-200"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </header>
                
                {/* --- CONTENT --- */}
                <main ref={contentRef} className="flex-grow overflow-y-auto bg-[#F5F5F7] dark:bg-[#0B0E14] relative">
                    {/* Subtle Mesh Background in Content Area */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
                         style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                    <div className="max-w-[900px] mx-auto min-h-full flex flex-col p-3 sm:p-6 md:p-8 relative z-10">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div 
                                key={currentPage} 
                                variants={contentVariants}
                                initial="hidden" 
                                animate="visible" 
                                exit="exit"
                                className="flex-grow flex flex-col"
                            >
                                {/* PAPER SHEET */}
                                <div className="
                                    flex-grow
                                    bg-white dark:bg-[#1A202C] 
                                    rounded-2xl sm:rounded-[20px] 
                                    shadow-xl shadow-slate-300/50 dark:shadow-black/50 
                                    border border-slate-200 dark:border-slate-700/50
                                    p-6 sm:p-10 md:p-14
                                    relative
                                ">
                                    {/* Objectives Card */}
                                    {currentPage === 0 && objectives.length > 0 && (
                                        <div className="mb-10 p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                                            <h3 className="flex items-center gap-2 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                                                <ListBulletIcon className="w-4 h-4" />
                                                {objectivesLabel}
                                            </h3>
                                            <ul className="space-y-3">
                                                {objectives.map((obj, i) => (
                                                    <motion.li 
                                                        key={i} 
                                                        initial={{ opacity: 0, x: -10 }} 
                                                        animate={{ opacity: 1, x: 0 }} 
                                                        transition={{ delay: i * 0.05 }}
                                                        className="flex items-start gap-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                        <span><ContentRenderer text={obj} /></span>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Lesson Content */}
                                    {pageData ? (
                                        <article className="
                                            prose prose-slate prose-lg dark:prose-invert max-w-none 
                                            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white
                                            prose-p:leading-loose prose-p:text-slate-600 dark:prose-p:text-slate-300
                                            prose-img:rounded-xl prose-img:shadow-lg
                                            prose-strong:text-slate-900 dark:prose-strong:text-white
                                            font-sans
                                        ">
                                            <LessonPage
                                                ref={lessonPageRef}
                                                page={pageData}
                                                isEditable={false} 
                                                isFinalizing={false} 
                                            />
                                        </article>
                                    ) : (
                                        currentPage === 0 && objectives.length > 0 ? null : ( 
                                            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                                                <QuestionMarkCircleIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                                                <p className="text-lg font-bold text-slate-400">Empty Page</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
                
                {/* --- FOOTER CONTROL DECK --- */}
                <footer className="flex-shrink-0 z-20 p-3 sm:p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-white/5">
                    <div className="flex items-center justify-between max-w-[900px] mx-auto w-full gap-4">
                        
                        {/* Previous */}
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={goToPreviousPage} 
                            disabled={currentPage === 0} 
                            className="
                                flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full font-bold text-sm transition-all
                                bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 
                                hover:bg-slate-200 dark:hover:bg-white/10 
                                disabled:opacity-30 disabled:hover:bg-slate-100 disabled:cursor-not-allowed
                            "
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span className="hidden xs:inline">Prev</span>
                        </motion.button>

                        {/* Editable Page Indicator (APK OPTIMIZED) */}
                        <div className="flex items-center justify-center gap-2 bg-slate-100/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden xs:inline">Page</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="1"
                                max={totalPages}
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                onBlur={handlePageInputBlur}
                                onKeyDown={handlePageInputKeyDown}
                                onFocus={handleInputFocus}
                                className="
                                    w-10 bg-transparent text-center font-bold text-sm sm:text-base text-slate-900 dark:text-white 
                                    border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:outline-none
                                    transition-colors p-0 appearance-none
                                "
                            />
                            <span className="text-sm text-slate-400 font-medium">/ {totalPages}</span>
                        </div>

                        {/* Next / Finish */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={currentPage < totalPages - 1 ? goToNextPage : xpAwarded ? handleClose : handleFinishLesson}
                            disabled={totalPages === 0}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-bold text-sm text-white shadow-lg transition-all
                                ${currentPage < totalPages - 1 
                                    ? 'bg-gradient-to-r from-slate-800 to-slate-900 dark:from-white dark:to-slate-200 dark:text-slate-900 hover:shadow-xl' 
                                    : xpAwarded 
                                        ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/30'
                                }
                                ${totalPages === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <span>{currentPage < totalPages - 1 ? 'Next' : xpAwarded ? 'Close' : 'Finish'}</span>
                            {currentPage < totalPages - 1 
                                ? <ArrowRightIcon className="h-4 w-4" /> 
                                : xpAwarded ? <XMarkIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />
                            }
                        </motion.button>
                    </div>
                </footer>
            </Dialog.Panel>
        </Dialog>
    );
}
export default React.memo(StudentViewLessonModal);