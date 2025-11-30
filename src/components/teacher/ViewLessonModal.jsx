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
    PencilSquareIcon,
    LockClosedIcon,
    PhotoIcon,
    TagIcon,
    ChevronDownIcon,
    Squares2X2Icon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage'; 
import ContentRenderer from './ContentRenderer';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext'; // 1. Import Theme Context

// --- HELPER: MONET STYLE FOR MODALS ---
const getMonetModalStyle = (activeOverlay) => {
    if (activeOverlay === 'christmas') return { background: 'rgba(15, 23, 66, 0.95)', borderColor: 'rgba(100, 116, 139, 0.3)' }; 
    if (activeOverlay === 'valentines') return { background: 'rgba(60, 10, 20, 0.95)', borderColor: 'rgba(255, 100, 100, 0.2)' }; 
    if (activeOverlay === 'graduation') return { background: 'rgba(30, 25, 10, 0.95)', borderColor: 'rgba(255, 215, 0, 0.2)' }; 
    if (activeOverlay === 'rainy') return { background: 'rgba(20, 35, 20, 0.95)', borderColor: 'rgba(100, 150, 100, 0.2)' };
    if (activeOverlay === 'cyberpunk') return { background: 'rgba(35, 5, 45, 0.95)', borderColor: 'rgba(180, 0, 255, 0.2)' };
    if (activeOverlay === 'spring') return { background: 'rgba(50, 10, 20, 0.95)', borderColor: 'rgba(255, 150, 180, 0.2)' };
    if (activeOverlay === 'space') return { background: 'rgba(5, 5, 10, 0.95)', borderColor: 'rgba(100, 100, 255, 0.2)' };
    return null; 
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

export default function ViewLessonModal({ isOpen, onClose, lesson, onUpdate, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); // 2. Get active theme
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isPageNavOpen, setIsPageNavOpen] = useState(false);
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    // 3. Compute Monet Style
    const monetStyle = getMonetModalStyle(activeOverlay);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    useEffect(() => { 
        if (isOpen) { 
            setCurrentPage(0); 
            setIsPageNavOpen(false);
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [isOpen]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin" : "Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    const pageData = pages[currentPage];

    const goToNextPage = useCallback(() => { 
        if (currentPage < totalPages - 1) { 
            setCurrentPage(prev => prev + 1); 
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => { 
        if (currentPage > 0) { 
            setCurrentPage(prev => prev - 1); 
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [currentPage]);

    const jumpToPage = (index) => {
        setCurrentPage(index);
        setIsPageNavOpen(false);
        if (contentRef.current) contentRef.current.scrollTop = 0;
    };

    useEffect(() => { 
        const handleKeyDown = (e) => { 
            if (!isOpen) return; 
            if (e.key === 'ArrowRight') goToNextPage(); 
            else if (e.key === 'ArrowLeft') goToPreviousPage(); 
            else if (e.key === 'Escape') {
                if(isPageNavOpen) setIsPageNavOpen(false);
                else onClose();
            }
        }; 
        window.addEventListener('keydown', handleKeyDown); 
        return () => window.removeEventListener('keydown', handleKeyDown); 
    }, [isOpen, goToNextPage, goToPreviousPage, onClose, isPageNavOpen]);

    const handleFinalizeDiagram = async (finalizedContent) => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        showToast("Finalizing diagram...", "info");
        try {
            const updatedPages = currentLesson.pages.map((page, index) => index === currentPage ? { ...page, type: 'diagram', content: finalizedContent } : page );
            const updatedLesson = { ...currentLesson, pages: updatedPages };
            setCurrentLesson(updatedLesson);
            await updateDoc(doc(db, 'lessons', currentLesson.id), { pages: updatedPages });
            showToast("Saved successfully!", "success");
            if (onUpdate) onUpdate(updatedLesson);
        } catch (error) {
            console.error("Error finalizing diagram:", error);
            showToast("Failed to save.", "error");
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
            showToast("Could not re-edit.", "error");
        }
    };

    if (!isOpen || !currentLesson) return null;

    // --- DESIGN CONSTANTS ---
    // If monetStyle is active, we remove the default background so the style prop takes over
    const glassPanel = monetStyle 
        ? "backdrop-blur-2xl border border-white/20 shadow-2xl transition-colors duration-500"
        : "bg-white/90 dark:bg-[#121212]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl transition-colors duration-500";
        
    const actionBtn = "p-2 sm:p-2.5 rounded-full transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 bg-white/50 dark:bg-white/5";

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-[100] flex items-center justify-center font-sans ${className}`}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            
            <Dialog.Panel 
                as={motion.div} 
                variants={modalVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit"
                style={monetStyle || {}} // 4. Apply Monet Style
                className={`relative w-full max-w-6xl h-[100dvh] md:h-[90vh] flex flex-col overflow-hidden md:rounded-[2.5rem] ${glassPanel}`}
            >
                
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100/10 z-20">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    />
                </div>

                {/* Header */}
                <header className="relative z-10 flex justify-between items-center px-4 py-3 sm:px-8 sm:py-5 border-b border-slate-200/50 dark:border-white/5 flex-shrink-0 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        <Dialog.Title className={`text-lg sm:text-2xl font-bold truncate tracking-tight ${monetStyle ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {lessonTitle}
                        </Dialog.Title>
                        
                        {/* JUMP TO PAGE TRIGGER */}
                        <button 
                            onClick={() => setIsPageNavOpen(!isPageNavOpen)}
                            className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit ${monetStyle ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            <span>{totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'Empty'}</span>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isPageNavOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3">
                        {currentLesson.studyGuideUrl && (
                            <a href={currentLesson.studyGuideUrl} download target="_blank" rel="noopener noreferrer" 
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-500/30 transition-all">
                                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">Guide</span>
                            </a>
                        )}
                        <button onClick={onClose} className={`p-2 rounded-full transition-all ${monetStyle ? 'text-slate-300 hover:text-white hover:bg-white/20' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}>
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
                
                {/* Content Area */}
                {/* 5. Adjust content background - Make transparent if monetStyle is active to let tint show */}
                <main 
                    ref={contentRef} 
                    className={`flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center p-4 sm:p-6 md:p-10 pb-20 sm:pb-10 relative ${monetStyle ? 'bg-transparent text-white' : 'bg-[#f8f9fa] dark:bg-transparent'}`}
                >
                    <div className="w-full max-w-4xl flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div key={currentPage} variants={pageTransitionVariants} initial="hidden" animate="visible" exit="exit" className="w-full min-h-full">
                                
                                {/* Objectives Card */}
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        className={`mb-8 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border ${monetStyle ? 'bg-black/20 border-white/10 text-white' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                                    >
                                        <h3 className={`flex items-center gap-3 text-base sm:text-lg font-bold mb-4 sm:mb-6 ${monetStyle ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                                                <QueueListIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                                            </div>
                                            {objectivesLabel}
                                        </h3>
                                        <ul className={`grid gap-3 sm:gap-4 text-xs sm:text-base font-medium leading-relaxed ${monetStyle ? 'text-slate-200' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-3 sm:gap-4">
                                                    <CheckCircleSolid className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1"><ContentRenderer text={objective} /></div>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}

                                {/* Main Page Content with Justified Text and Indentation */}
                                {pageData ? (
                                    <div className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none text-justify [&_p]:indent-8 ${monetStyle ? 'prose-headings:text-white prose-p:text-slate-100 prose-strong:text-white' : ''}`}>
                                        {pageData.title && (
                                            <motion.h1 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className={`text-2xl sm:text-4xl font-black mb-4 sm:mb-8 tracking-tight leading-tight text-left indent-0 ${monetStyle ? 'text-white' : 'text-slate-900 dark:text-white'}`}
                                            >
                                                {pageData.title}
                                            </motion.h1>
                                        )}
                                        
                                        <LessonPage
                                            ref={lessonPageRef}
                                            page={pageData}
                                            isEditable={true}
                                            onFinalizeDiagram={handleFinalizeDiagram}
                                            onRevertDiagram={handleRevertDiagramToEditable}
                                            isFinalizing={isFinalizing}
                                        />
                                    </div>
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
                
                {/* Footer Navigation */}
                <footer className="absolute bottom-0 left-0 right-0 sm:static flex-shrink-0 py-4 sm:py-5 px-6 border-t border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl flex justify-center items-center z-20">
                    <div className="flex items-center gap-2 sm:gap-4 p-1.5 sm:p-2 pl-2 sm:pl-3 pr-2 sm:pr-3 bg-white dark:bg-white/5 backdrop-blur-xl rounded-full shadow-lg border border-slate-100 dark:border-white/10">
                        
                        {/* Prev Button */}
                        <button 
                            onClick={goToPreviousPage} 
                            disabled={currentPage === 0} 
                            className={`${actionBtn} ${currentPage === 0 ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                        >
                            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                        </button>

                        {/* Diagram Tools */}
                        {pageData?.type === 'diagram-data' && (
                            <>
                                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => lessonPageRef.current?.addImage()} className={`${actionBtn} text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20`} title="Add Image">
                                        <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                                    </button>
                                    <button onClick={() => lessonPageRef.current?.addLabel()} className={`${actionBtn} text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20`} title="Add Label">
                                        <TagIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                                    </button>
                                    <button onClick={() => lessonPageRef.current?.finalizeDiagram()} disabled={isFinalizing} className={`${actionBtn} text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`} title="Save">
                                        <LockClosedIcon className={`h-4 w-4 sm:h-5 sm:w-5 stroke-2 ${isFinalizing ? "animate-spin" : ""}`} />
                                    </button>
                                </div>
                                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                            </>
                        )}
                        
                        {pageData?.type === 'diagram' && (
                             <>
                                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                                <button onClick={handleRevertDiagramToEditable} className={`${actionBtn} text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20`} title="Edit">
                                    <PencilSquareIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                                </button>
                                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                            </>
                        )}

                        {/* Next / Finish Button */}
                        <button
                            onClick={currentPage < totalPages - 1 ? goToNextPage : onClose}
                            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
                        >
                            <span>{currentPage < totalPages - 1 ? 'Next' : 'Finish'}</span>
                            {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4 stroke-2" /> : <CheckCircleSolid className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </button>
                    </div>
                </footer>

            </Dialog.Panel>
        </Dialog>
    );
}