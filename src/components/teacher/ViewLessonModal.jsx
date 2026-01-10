// src/components/teacher/dashboard/views/components/ViewLessonModal.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    QueueListIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon,
    PencilSquareIcon,
    LockClosedIcon,
    PhotoIcon,
    TagIcon,
    ChevronDownIcon,
    Squares2X2Icon,
    ArrowsRightLeftIcon,
    ArrowsUpDownIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage'; 
import ContentRenderer from './ContentRenderer';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

// --- ONE UI 8.5 MONET STYLES ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    switch (activeOverlay) {
        case 'christmas': return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' };
        case 'valentines': return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' };
        case 'graduation': return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' };
        case 'rainy': return { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' };
        case 'cyberpunk': return { text: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', border: 'border-fuchsia-200 dark:border-fuchsia-800' };
        case 'spring': return { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' };
        case 'space': return { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' };
        default: return null;
    }
};

// --- ANIMATION VARIANTS ---
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 30 },
    visible: { 
        opacity: 1, scale: 1, y: 0, 
        transition: { type: "spring", damping: 30, stiffness: 350, mass: 0.5 } 
    },
    exit: { opacity: 0, scale: 0.98, y: 15, transition: { duration: 0.15 } },
};

// --- OPTIMIZATION: Memoized Vertical Page Item ---
// Prevents every page from re-rendering when you click a button in the header
const VerticalLessonItem = memo(({ page, index, titleStyle }) => (
    <div className="relative group">
        <div className="flex items-center gap-4 mb-6 opacity-40">
            <span className="text-[10px] font-black uppercase tracking-widest">Page {index + 1}</span>
            <div className="h-px flex-1 bg-slate-300 dark:bg-white/20"></div>
        </div>
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            {page.title && (
                <h2 className={`text-2xl font-black mb-4 tracking-tight ${titleStyle}`}>{page.title}</h2>
            )}
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                <LessonPage page={page} isEditable={false} />
            </div>
        </div>
    </div>
));

export default function ViewLessonModal({ isOpen, onClose, lesson, onUpdate, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [readingMode, setReadingMode] = useState('horizontal'); 
    
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); 
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isPageNavOpen, setIsPageNavOpen] = useState(false);
    
    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    
    useEffect(() => { 
        if (isOpen) { 
            setCurrentPage(0); 
            setIsPageNavOpen(false);
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [isOpen]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = useMemo(() => currentLesson?.pages || [], [currentLesson]);
    const objectives = useMemo(() => currentLesson?.learningObjectives || currentLesson?.objectives || [], [currentLesson]);
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin" : "Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    
    const pageData = useMemo(() => pages[currentPage], [pages, currentPage]);

    const scrollToTop = () => {
        if (contentRef.current) {
            contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Navigation
    const goToNextPage = useCallback(() => { 
        if (currentPage < totalPages - 1) { 
            setCurrentPage(prev => prev + 1); 
            scrollToTop();
        } 
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => { 
        if (currentPage > 0) { 
            setCurrentPage(prev => prev - 1); 
            scrollToTop();
        } 
    }, [currentPage]);

    const jumpToPage = (index) => {
        setCurrentPage(index);
        setIsPageNavOpen(false);
        scrollToTop();
    };

    // Keyboard & Swipe Logic
    useEffect(() => { 
        const handleKeyDown = (e) => { 
            if (!isOpen) return; 
            if (readingMode === 'horizontal') {
                if (e.key === 'ArrowRight') goToNextPage(); 
                else if (e.key === 'ArrowLeft') goToPreviousPage(); 
            }
            if (e.key === 'Escape') {
                if(isPageNavOpen) setIsPageNavOpen(false);
                else onClose();
            }
        }; 
        window.addEventListener('keydown', handleKeyDown); 
        return () => window.removeEventListener('keydown', handleKeyDown); 
    }, [isOpen, goToNextPage, goToPreviousPage, onClose, isPageNavOpen, readingMode]);

    // SWIPE HANDLER
    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset, velocity) => {
        return Math.abs(offset) * velocity;
    };

    const handleDragEnd = (e, { offset, velocity }) => {
        const swipe = swipePower(offset.x, velocity.x);
        if (swipe < -swipeConfidenceThreshold) {
            goToNextPage();
        } else if (swipe > swipeConfidenceThreshold) {
            goToPreviousPage();
        }
    };

    // Handlers
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

    // --- STYLES ---
    const capsuleBtn = `
        flex items-center justify-center gap-2 px-5 py-2.5 rounded-[1.5rem] 
        transition-all duration-200 active:scale-95 hover:scale-[1.02]
        font-bold text-[13px] tracking-wide shadow-sm
    `;

    const tonalBtn = monet
        ? `${capsuleBtn} ${monet.bg} ${monet.text} hover:opacity-80 border ${monet.border}`
        : `${capsuleBtn} bg-slate-100 dark:bg-[#3A3A3C] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#48484A] border border-transparent`;

    const primaryBtn = monet
        ? `${capsuleBtn} bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg`
        : `${capsuleBtn} bg-[#007AFF] hover:bg-[#0062cc] text-white shadow-lg shadow-blue-500/30`;

    const iconBtn = `
        w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90
        shadow-sm border border-transparent
    `;

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-[5000] flex items-center justify-center font-sans ${className}`}>
            <motion.div 
                variants={backdropVariants}
                initial="hidden" animate="visible" exit="exit"
                className="fixed inset-0 bg-black/40 backdrop-blur-md will-change-opacity" 
                aria-hidden="true" 
                onClick={onClose}
            />
            
            <Dialog.Panel 
                as={motion.div} 
                variants={modalVariants} 
                initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-6xl h-[95vh] md:h-[90vh] flex flex-col rounded-[2.5rem] bg-[#F9F9F9] dark:bg-[#101010] shadow-2xl border border-white/40 dark:border-white/10 transform-gpu will-change-transform"
                style={{ overflow: 'visible' }}
            >
                <div className="flex flex-col h-full w-full overflow-hidden rounded-[2.5rem]">
                    
                    {/* --- HEADER --- */}
                    <header className="relative z-20 flex justify-between items-center px-6 py-4 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 flex-shrink-0">
                        {readingMode === 'horizontal' && (
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.5, ease: "circOut" }}
                                className={`absolute bottom-0 left-0 h-[2px] z-30 ${monet ? 'bg-current ' + monet.text : 'bg-[#007AFF]'}`}
                            />
                        )}

                        <div className="flex flex-col gap-0.5 relative">
                            <h2 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white line-clamp-1 max-w-md">
                                {lessonTitle}
                            </h2>
                            
                            {readingMode === 'horizontal' ? (
                                <div className="relative inline-block">
                                    <button 
                                        onClick={() => setIsPageNavOpen(!isPageNavOpen)}
                                        className={`group flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${monet ? monet.text : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
                                    >
                                        <span>{totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}` : 'Empty'}</span>
                                        <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${isPageNavOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isPageNavOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsPageNavOpen(false)} />
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="absolute top-full left-0 mt-3 w-64 p-4 rounded-[1.5rem] bg-white/95 dark:bg-[#2C2C2E]/95 shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-black/50 border border-black/5 dark:border-white/10 z-50 backdrop-blur-xl"
                                                >
                                                    <div className="flex items-center justify-between mb-3 px-1 text-slate-400">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Jump to Page</span>
                                                        <Squares2X2Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                                        {pages.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => jumpToPage(idx)}
                                                                className={`aspect-square flex items-center justify-center rounded-[12px] text-xs font-bold transition-all ${
                                                                    currentPage === idx
                                                                    ? (monet ? `bg-slate-900 text-white dark:bg-white dark:text-black` : 'bg-[#007AFF] text-white shadow-md')
                                                                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'
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
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <BookOpenIcon className="w-3 h-3" />
                                    <span>Scroll Mode</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setReadingMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                                className={`${iconBtn} bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20`}
                                title={readingMode === 'horizontal' ? "Switch to Scroll Mode" : "Switch to Page Mode"}
                            >
                                {readingMode === 'horizontal' ? <ArrowsUpDownIcon className="w-5 h-5 stroke-[2]" /> : <ArrowsRightLeftIcon className="w-5 h-5 stroke-[2]" />}
                            </button>

                            <button 
                                onClick={onClose} 
                                className={`${iconBtn} bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400`}
                            >
                                <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                            </button>
                        </div>
                    </header>
                    
                    {/* --- MAIN CONTENT --- */}
                    <main 
                        ref={contentRef} 
                        className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 relative transform-gpu bg-[#F9F9F9] dark:bg-[#101010]"
                    >
                        <div className="max-w-3xl mx-auto min-h-full pb-10"> 
                            
                            {/* --- HORIZONTAL MODE (Swipeable) --- */}
                            {readingMode === 'horizontal' ? (
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        key={currentPage}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        
                                        // SWIPE GESTURES ADDED HERE
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.1}
                                        onDragEnd={handleDragEnd}
                                        className="w-full min-h-full touch-pan-y"
                                    >
                                        {/* Objectives (Only on Page 0) */}
                                        {currentPage === 0 && objectives.length > 0 && (
                                            <div className={`mb-8 p-6 rounded-[2rem] border ${monet ? `${monet.bg} ${monet.border}` : 'bg-white dark:bg-[#1E1E1E] border-slate-100 dark:border-white/5'} shadow-sm`}>
                                                <h3 className="flex items-center gap-3 text-[15px] font-bold mb-4 text-slate-900 dark:text-white">
                                                    <div className={`p-2 rounded-xl ${monet ? 'bg-white/50 text-current' : 'bg-slate-100 dark:bg-white/10 text-blue-500'}`}>
                                                        <QueueListIcon className="h-5 w-5" />
                                                    </div>
                                                    {objectivesLabel}
                                                </h3>
                                                <ul className="space-y-3">
                                                    {objectives.map((objective, index) => (
                                                        <li key={index} className="flex items-start gap-3 text-[14px] font-medium text-slate-700 dark:text-slate-300">
                                                            <CheckCircleSolid className={`h-5 w-5 flex-shrink-0 mt-0.5 ${monet ? 'opacity-80' : 'text-blue-500'}`} />
                                                            <span><ContentRenderer text={objective} /></span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {pageData ? (
                                            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                                                {pageData.title && (
                                                    <h1 className="text-2xl sm:text-3xl font-black mb-6 tracking-tight text-slate-900 dark:text-white">
                                                        {pageData.title}
                                                    </h1>
                                                )}
                                                <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    <LessonPage
                                                        ref={lessonPageRef}
                                                        page={pageData}
                                                        isEditable={true}
                                                        onFinalizeDiagram={handleFinalizeDiagram}
                                                        onRevertDiagram={handleRevertDiagramToEditable}
                                                        isFinalizing={isFinalizing}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            currentPage === 0 && objectives.length > 0 ? null : ( 
                                                <div className="flex flex-col items-center justify-center text-center opacity-40 h-64">
                                                    <QuestionMarkCircleIcon className="w-16 h-16 stroke-1 mb-4" />
                                                    <p className="text-base font-bold">Empty Page</p>
                                                </div>
                                            )
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                /* --- VERTICAL MODE (Memoized List) --- */
                                <div className="space-y-16">
                                    {objectives.length > 0 && (
                                        <div className={`p-6 rounded-[2rem] border ${monet ? `${monet.bg} ${monet.border}` : 'bg-white dark:bg-[#1E1E1E] border-slate-100 dark:border-white/5'} shadow-sm`}>
                                            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                                <QueueListIcon className="w-5 h-5" /> {objectivesLabel}
                                            </h3>
                                            <ul className="space-y-3">
                                                {objectives.map((objective, index) => (
                                                    <li key={index} className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        <CheckCircleSolid className={`h-5 w-5 flex-shrink-0 ${monet ? 'opacity-80' : 'text-blue-500'}`} />
                                                        <span><ContentRenderer text={objective} /></span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {pages.map((pData, idx) => (
                                        <VerticalLessonItem 
                                            key={idx} 
                                            page={pData} 
                                            index={idx} 
                                            titleStyle="text-slate-900 dark:text-white"
                                        />
                                    ))}

                                    <div className="flex justify-center pt-8">
                                        <div className="px-5 py-2 rounded-full bg-slate-100 dark:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            End of Lesson
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                    
                    {/* --- FOOTER --- */}
                    <footer className="flex-shrink-0 px-6 py-4 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 z-20 flex justify-center items-center">
                        <div className="flex items-center gap-3">
                            {readingMode === 'horizontal' ? (
                                <>
                                    <button 
                                        onClick={goToPreviousPage} 
                                        disabled={currentPage === 0} 
                                        className={`${tonalBtn} disabled:opacity-30`}
                                    >
                                        <ArrowLeftIcon className="h-4 w-4 stroke-[2.5]" />
                                        <span className="hidden sm:inline">Back</span>
                                    </button>

                                    {pageData?.type === 'diagram-data' && (
                                        <div className="flex items-center gap-2 px-2 mx-1">
                                            <button onClick={() => lessonPageRef.current?.addImage()} className={`${iconBtn} bg-slate-100 dark:bg-white/5`} title="Add Image"><PhotoIcon className="h-5 w-5" /></button>
                                            <button onClick={() => lessonPageRef.current?.addLabel()} className={`${iconBtn} bg-slate-100 dark:bg-white/5`} title="Add Label"><TagIcon className="h-5 w-5" /></button>
                                            <button onClick={() => lessonPageRef.current?.finalizeDiagram()} disabled={isFinalizing} className={`${iconBtn} bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400`} title="Save">
                                                <LockClosedIcon className={`h-5 w-5 ${isFinalizing ? "animate-spin" : ""}`} />
                                            </button>
                                        </div>
                                    )}
                                    
                                    {pageData?.type === 'diagram' && (
                                         <div className="flex items-center gap-2 px-2 mx-1">
                                            <button onClick={handleRevertDiagramToEditable} className={`${iconBtn} bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400`} title="Edit">
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}

                                    <button onClick={currentPage < totalPages - 1 ? goToNextPage : onClose} className={primaryBtn}>
                                        <span className="px-1">{currentPage < totalPages - 1 ? 'Next' : 'Finish'}</span>
                                        {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-4 w-4 stroke-2" /> : <CheckCircleSolid className="h-4 w-4" />}
                                    </button>
                                </>
                            ) : (
                                <button onClick={onClose} className={primaryBtn}>
                                    <CheckCircleSolid className="h-4 w-4" />
                                    <span className="px-2">Finish Reading</span>
                                </button>
                            )}
                        </div>
                    </footer>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}