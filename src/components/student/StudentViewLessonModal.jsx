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
} from '@heroicons/react/24/solid';
import LessonPage from '../teacher/LessonPage';
import ContentRenderer from '../teacher/ContentRenderer';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

// --- PDF EXPORT IMPORTS ---
import htmlToPdfmake from 'html-to-pdfmake';
import { marked } from 'marked';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts;

// NATIVE FIX: Import Capacitor plugins for native functionality
import { Capacitor } from '@capacitor/core'; // --- MODIFIED ---
import { Filesystem, Directory, Encoding }from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';


// NATIVE FIX: Helper to check if running in a native app (Capacitor)
const isNativePlatform = () => Capacitor.isNativePlatform();

// NATIVE FIX: Helper to convert a blob to base64 for native saving
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      // Return only the base64 part
      const dataUrl = reader.result.toString();
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) {
        reject(new Error("Failed to convert blob to base64."));
      } else {
        resolve(base64Data);
      }
    };
    reader.readAsDataURL(blob);
  });
};

// NATIVE FIX: Our new native save function
const nativeSave = async (blob, fileName, mimeType, showToast) => {
  if (!isNativePlatform()) {
    console.error("nativeSave called on web platform.");
    return;
  }
  
  // --- ✅ MODIFICATION: Using Directory.Documents ---
  // This is the recommended directory for user-generated files on modern Android
  // and often has fewer permission issues than Downloads or External root.
  const directory = Directory.Documents; 

  try {
    // --- START PERMISSION CHECK ---
    let permStatus = await Filesystem.checkPermissions();
	if (permStatus.publicStorage !== 'granted') {
	  permStatus = await Filesystem.requestPermissions();
	}

	// If permission is *still* not granted, show error and stop
	if (permStatus.publicStorage !== 'granted') {
      showToast("Storage permission is required to save files.", "error");
	  console.error("Storage permission not granted.");
      return; // Stop if permission is denied
    }
    // --- END PERMISSION CHECK ---

    const base64Data = await blobToBase64(blob);
    
    // Write the file to the user's Documents directory
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: directory, // --- MODIFIED ---
      recursive: true // Still include this just in case
    });

    showToast(`File saved to Documents folder.`, 'info'); // --- MODIFIED ---

    // Now, use FileOpener to open the file with the native OS
    await FileOpener.open({
      filePath: result.uri,
      contentType: mimeType,
    });
  } catch (error) {
    console.error('Unable to save or open file', error);
    showToast(`Error saving file: ${error.message || 'Unknown error'}`, 'error');
  }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { ease: "easeOut", duration: 0.2 } },
    exit: { opacity: 0, scale: 0.98, transition: { ease: "easeIn", duration: 0.15 } },
};

const pageTransitionVariants = {
    hidden: { opacity: 0, x: 15 },
    visible: { opacity: 1, x: 0, transition: { ease: "easeOut", duration: 0.25 } },
    exit: { opacity: 0, x: -15, transition: { ease: "easeIn", duration: 0.2 } },
};

const objectivesContainerVariants = {
    visible: { transition: { staggerChildren: 0.07 } },
};

const objectiveItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } },
};


// Font Loading Functions
async function loadFontToVfs(name, url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
  pdfMake.vfs[name] = base64;
}

let dejaVuLoaded = false;
async function registerDejaVuFonts() {
  if (dejaVuLoaded) return;
  
  // Use relative paths for fonts. 
  // This works on both localhost and the deployed server (Netlify),
  // assuming the /fonts folder is in your /public directory.
  try {
    await loadFontToVfs("DejaVuSans.ttf", "/fonts/DejaVuSans.ttf");
    await loadFontToVfs("DejaVuSans-Bold.ttf", "/fonts/DejaVuSans-Bold.ttf");
    await loadFontToVfs("DejaVuSans-Oblique.ttf", "/fonts/DejaVuSans-Oblique.ttf");
    await loadFontToVfs("DejaVuSans-BoldOblique.ttf", "/fonts/DejaVuSans-BoldOblique.ttf");

    pdfMake.fonts = {
      DejaVu: {
        normal: "DejaVuSans.ttf",
        bold: "DejaVuSans-Bold.ttf",
        italics: "DejaVuSans-Oblique.ttf",
        bolditalics: "DejaVuSans-BoldOblique.ttf",
      },
    };

    dejaVuLoaded = true;
  } catch (error) {
    console.error("Failed to load custom fonts:", error);
    // You might want to show a toast error here if loading fails
  }
}

// ✅ CORRECTED: Helper function to process special text characters
const processLatex = (text) => {
    if (!text) return '';
    let processedText = text;

    // Replace custom LaTeX-like commands with unicode characters
    processedText = processedText.replace(/\\degree/g, '°');
    processedText = processedText.replace(/\\angle/g, '∠');

    // ✅ ADDED: Handle \vec{...} command for vectors
    // This finds \vec{...} and applies a combining arrow over each character inside.
    processedText = processedText.replace(/\\vec\{(.*?)\}/g, (match, content) => {
        return content.split('').map(char => char + '\u20D7').join('');
    });

    // Strip out LaTeX math delimiters.
    processedText = processedText.replace(/\$\$(.*?)\$\$/g, '$1');
    processedText = processedText.replace(/\$(.*?)\$/g, '$1');

    return processedText;
};


export default function ViewLessonModal({ isOpen, onClose, lesson, onUpdate, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const { showToast } = useToast();
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [exportingLessonId, setExportingLessonId] = useState(null); // State for PDF export
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    useEffect(() => { if (isOpen) { setCurrentPage(0); if (contentRef.current) contentRef.current.scrollTop = 0; } }, [isOpen]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin sa Pagkatuto" : "Learning Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    const pageData = pages[currentPage];

    const goToNextPage = useCallback(() => { if (currentPage < totalPages - 1) { setCurrentPage(prev => prev + 1); if (contentRef.current) contentRef.current.scrollTop = 0; } }, [currentPage, totalPages]);
    const goToPreviousPage = useCallback(() => { if (currentPage > 0) { setCurrentPage(prev => prev + 1); if (contentRef.current) contentRef.current.scrollTop = 0; } }, [currentPage]);

    useEffect(() => { const handleKeyDown = (e) => { if (!isOpen) return; if (e.key === 'ArrowRight') goToNextPage(); else if (e.key === 'ArrowLeft') goToPreviousPage(); }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [isOpen, goToNextPage, goToPreviousPage]);

    const handleFinalizeDiagram = async (finalizedContent) => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        showToast("Finalizing diagram...", "info");
        try {
            const updatedPages = currentLesson.pages.map((page, index) => index === currentPage ? { ...page, type: 'diagram', content: finalizedContent } : page );
            const updatedLesson = { ...currentLesson, pages: updatedPages };
            setCurrentLesson(updatedLesson);
            await updateDoc(doc(db, 'lessons', currentLesson.id), { pages: updatedPages });
            showToast("Diagram saved successfully!", "success");
            if (onUpdate) onUpdate(updatedLesson);
        } catch (error) {
            console.error("Error finalizing diagram:", error);
            showToast("Failed to save the finalized diagram.", "error");
            setCurrentLesson(lesson);
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleRevertDiagramToEditable = async () => {
        showToast("Loading editor...", "info");
        try {
            const updatedPages = currentLesson.pages.map((page, index) => index === currentPage ? { ...page, type: 'diagram-data' } : page );
            const updatedLesson = { ...currentLesson, pages: updatedPages };
            setCurrentLesson(updatedLesson);
            await updateDoc(doc(db, 'lessons', currentLesson.id), { pages: updatedPages });
            if (onUpdate) onUpdate(updatedLesson);
        } catch (error) {
            console.error("Error reverting diagram:", error);
            showToast("Could not re-edit the diagram.", "error");
        }
    };

    // --- PDF EXPORT FUNCTION ---
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
	            default: {
	                fontSize: 11,
	                lineHeight: 1.5,
	                color: '#333333',
	                alignment: 'justify'
	            }
	        };
	        const lessonTitleToExport = lessonToExport.lessonTitle || lessonToExport.title;
			const sanitizedFileName = (lessonTitleToExport.replace(/[\\/:"*?<>|]+/g, '_') || 'lesson') + '.pdf';
	        const subjectTitle = "SRCS Learning Portal"; // Generic fallback
	        let lessonContent = [];

	        for (const page of lessonToExport.pages) {
	            const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
	            if (cleanTitle) {
	                lessonContent.push({ text: cleanTitle, style: 'pageTitle' });
	            }

	            let contentString = typeof page.content === 'string' ? page.content : '';
                
                // ✅ FIX 1: Process raw text before parsing markdown
                contentString = processLatex(contentString);

	            let html = marked.parse(contentString);

                // ✅ FIX 2: Clean up blockquote HTML for proper rendering
                html = html
                    .replace(/<blockquote>\s*<p>/g, '<blockquote>')
                    .replace(/<\/p>\s*<\/blockquote>/g, '</blockquote>');

	            const convertedContent = htmlToPdfmake(html, { defaultStyles: pdfStyles.default });
	            lessonContent.push(convertedContent);
	        }

	        const docDefinition = {
	            pageSize: "A4",
	            pageMargins: [72, 100, 72, 100],
	            header: {
	                margin: [0, 20, 0, 0],
	                stack: [{ image: "headerImg", width: 450, alignment: "center" }]
	            },
	            footer: {
	                margin: [0, 0, 0, 20],
	                stack: [{ image: "footerImg", width: 450, alignment: "center" }]
	            },
                defaultStyle: {
                    font: 'DejaVu',
                    ...pdfStyles.default,
                },
	            styles: pdfStyles,
	            content: [
	                {
	                    stack: [
	                        { text: lessonTitleToExport, style: "coverTitle" },
	                        { text: subjectTitle, style: "coverSub" }
	                    ],
	                    alignment: "center",
	                    margin: [0, 200, 0, 0],
	                    pageBreak: "after"
	                },
	                ...lessonContent
	            ],
	            images: {
	 		        headerImg: "https://i.ibb.co/xt5CY6GY/header-port.png",
	 		        footerImg: "https://i.ibb.co/kgrMBfDr/Footer.png"
	            }
	        };

            // NATIVE FIX: Use getBlob for native, download for web
	        const pdfDoc = pdfMake.createPdf(docDefinition);
            if (isNativePlatform()) {
                pdfDoc.getBlob(async (blob) => {
                    await nativeSave(blob, sanitizedFileName, 'application/pdf', showToast);
                    setExportingLessonId(null);
                });
            } else {
				pdfDoc.download(sanitizedFileName, () => {
				    setExportingLessonId(null);
				});
            }

	    } catch (error) {
	        console.error("Failed to export PDF:", error);
	        showToast("An error occurred while creating the PDF.", "error");
	        setExportingLessonId(null);
	    }
	};

    if (!isOpen || !currentLesson) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-50 flex items-center justify-center font-sans ${className}`}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 bg-black/20" aria-hidden="true" />
            <Dialog.Panel as={motion.div} variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-neumorphic-base rounded-2xl shadow-neumorphic w-full max-w-5xl z-10 flex flex-col h-full md:h-[90vh] md:max-h-[700px] overflow-hidden">
                <div className="w-full bg-neumorphic-base h-1.5 flex-shrink-0 shadow-neumorphic-flat-inset">
                    <div className="bg-red-600 h-1.5 transition-all duration-500 ease-out rounded-r-full" style={{ width: `${progressPercentage}%` }} />
                </div>
                <header className="flex justify-between items-center p-4 sm:p-5 bg-neumorphic-base flex-shrink-0 z-10 border-b border-neumorphic-shadow-dark/10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Dialog.Title className="text-lg sm:text-xl font-bold text-tremor-content-strong truncate">{lessonTitle}</Dialog.Title>
                        
                        {currentLesson.studyGuideUrl ? (
                            <a 
                                href={currentLesson.studyGuideUrl} 
                                download 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-full shadow-neumorphic active:shadow-neumorphic-inset transition-shadow duration-150 ease-out whitespace-nowrap"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">Study Guide</span>
                            </a>
                        ) : (
                            <button
                                onClick={() => handleExportLessonPdf(currentLesson)}
                                disabled={!!exportingLessonId}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-full shadow-neumorphic active:shadow-neumorphic-inset transition-shadow duration-150 ease-out whitespace-nowR.Ap disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">
                                    {exportingLessonId ? 'Exporting...' : 'Download Lesson'}
                                </span>
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-600 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset hover:text-slate-800 transition-all duration-150 ease-out flex-shrink-0 ml-4" aria-label="Close lesson"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar bg-neumorphic-base flex flex-col items-center p-4 sm:p-8">
                    <div className="w-full max-w-3xl flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div key={currentPage} variants={pageTransitionVariants} initial="hidden" animate="visible" exit="exit" className="w-full min-h-full bg-neumorphic-base rounded-xl shadow-neumorphic p-6 sm:p-8">
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div variants={objectivesContainerVariants} initial="hidden" animate="visible" className="mb-8 p-5 bg-neumorphic-base rounded-xl shadow-neumorphic-inset">
                                        <h3 className="flex items-center gap-3 text-lg font-bold text-tremor-content-strong mb-4"><ListBulletIcon className="h-6 w-6 text-red-600" />{objectivesLabel}</h3>
                                        <ul className="space-y-3 text-base text-slate-700">{objectives.map((objective, index) => (<motion.li key={index} variants={objectiveItemVariants} className="flex items-start gap-3"><CheckCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" /><div className="flex-1"><ContentRenderer text={objective} /></div></motion.li>))}</ul>
                                    </motion.div>
                                )}
                                {pageData ? (
                                    <LessonPage
                                        ref={lessonPageRef}
                                        page={pageData}
                                        isEditable={false}
                                        onFinalizeDiagram={handleFinalizeDiagram}
                                        onRevertDiagram={handleRevertDiagramToEditable}
                                        isFinalizing={isFinalizing}
                                    />
                                ) : (
                                    currentPage === 0 && objectives.length > 0 ? null : ( <div className="flex flex-col items-center justify-center text-center text-slate-500 h-full py-12"><QuestionMarkCircleIcon className="w-16 h-16 text-slate-300 mb-4" /><p className="text-lg font-medium">No content for this page.</p></div>)
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
                <footer className="grid grid-cols-3 items-center p-4 bg-neumorphic-base border-t border-neumorphic-shadow-dark/10 flex-shrink-0 z-10">
                    <div className="flex items-center gap-4 justify-start">
                        <button onClick={goToPreviousPage} disabled={currentPage === 0} className="p-3 rounded-full text-slate-600 bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-out" aria-label="Previous page"><ArrowLeftIcon className="h-5 w-5" /></button>
                        <span className="text-sm font-semibold text-tremor-content whitespace-nowrap">{totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'No Pages'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                        {/* Intentionally empty for layout */}
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={currentPage < totalPages - 1 ? goToNextPage : onClose}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 rounded-full font-semibold transition-shadow duration-150 ease-out bg-neumorphic-base shadow-neumorphic active:shadow-neumorphic-inset
                                ${currentPage < totalPages - 1 ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                            `}
                            aria-label={currentPage < totalPages - 1 ? "Next page" : "Finish lesson"}
                        >
                            <span className="hidden sm:inline">
                                {currentPage < totalPages - 1 ? 'Next' : 'Finish'}
                            </span>
                            {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </footer>
            </Dialog.Panel>
        </Dialog>
    );
}