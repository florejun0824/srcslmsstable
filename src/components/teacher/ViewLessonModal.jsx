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

// --- COLOROS 15 AQUAMORPHIC STYLES ---
const getAquamorphicStyle = (activeOverlay) => {
    if (!activeOverlay) return null;
    
    switch (activeOverlay) {
        case 'christmas': return { background: 'rgba(10, 25, 47, 0.85)', accent: 'text-emerald-400', border: 'border-emerald-500/20', fill: 'bg-emerald-500/10' }; 
        case 'valentines': return { background: 'rgba(40, 10, 20, 0.85)', accent: 'text-rose-400', border: 'border-rose-500/20', fill: 'bg-rose-500/10' }; 
        case 'graduation': return { background: 'rgba(30, 25, 5, 0.85)', accent: 'text-amber-400', border: 'border-amber-500/20', fill: 'bg-amber-500/10' }; 
        case 'rainy': return { background: 'rgba(10, 25, 25, 0.85)', accent: 'text-teal-400', border: 'border-teal-500/20', fill: 'bg-teal-500/10' }; 
        case 'cyberpunk': return { background: 'rgba(25, 5, 35, 0.85)', accent: 'text-fuchsia-400', border: 'border-fuchsia-500/20', fill: 'bg-fuchsia-500/10' }; 
        case 'spring': return { background: 'rgba(35, 10, 20, 0.85)', accent: 'text-pink-400', border: 'border-pink-500/20', fill: 'bg-pink-500/10' }; 
        case 'space': return { background: 'rgba(5, 5, 20, 0.85)', accent: 'text-indigo-400', border: 'border-indigo-500/20', fill: 'bg-indigo-500/10' };
        default: return null;
    }
};

// --- ANIMATION VARIANTS ---
const modalVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 40, borderRadius: "40px" },
    visible: { 
        opacity: 1, scale: 1, y: 0, borderRadius: "32px",
        transition: { type: "spring", damping: 20, stiffness: 300, mass: 0.8 } 
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.25, ease: "anticipate" } },
};

const pageTransitionVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
    visible: { 
        opacity: 1, y: 0, filter: "blur(0px)",
        transition: { type: "spring", stiffness: 200, damping: 20 }
    },
    exit: { opacity: 0, y: -20, filter: "blur(5px)", transition: { duration: 0.15 } },
};

const navMenuVariants = {
    hidden: { opacity: 0, y: -15, scale: 0.9, transformOrigin: "top left" },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } }
};

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

    const aquaStyle = getAquamorphicStyle(activeOverlay);

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

    // Navigation
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

    // --- COLOROS 15 DESIGN TOKENS ---
    const containerClass = aquaStyle 
        ? `relative w-full max-w-6xl h-[100dvh] md:h-[90vh] flex flex-col overflow-hidden md:rounded-[32px] backdrop-blur-3xl shadow-2xl transition-colors duration-500`
        : `relative w-full max-w-6xl h-[100dvh] md:h-[90vh] flex flex-col overflow-hidden md:rounded-[32px] bg-[#F5F7FA]/90 dark:bg-[#000000]/90 backdrop-blur-3xl shadow-2xl transition-colors duration-500`;

    const containerStyle = aquaStyle 
        ? { background: aquaStyle.background, border: `1px solid ${aquaStyle.border.replace('border-', '')}` }
        : {};

    // ✅ UPDATED: Added py-5 for more breather, items-start to allow text wrapping without centering issues
    const headerClass = aquaStyle
        ? `relative z-20 flex justify-between items-start px-6 py-6 mx-4 mt-4 rounded-[24px] bg-white/10 border border-white/10 backdrop-blur-md shadow-sm overflow-hidden`
        : `relative z-20 flex justify-between items-start px-6 py-6 mx-4 mt-4 rounded-[24px] bg-white/60 dark:bg-[#1C1C1E]/60 border border-white/40 dark:border-white/5 backdrop-blur-md shadow-sm overflow-hidden`;

    const capsuleBtn = `
        flex items-center justify-center gap-2 px-4 py-2.5 rounded-[20px] 
        transition-all duration-300 active:scale-90 hover:scale-105
        font-bold text-xs tracking-wide shadow-sm
    `;

    const tonalBtn = aquaStyle
        ? `${capsuleBtn} bg-white/10 text-white hover:bg-white/20 border border-white/10`
        : `${capsuleBtn} bg-white dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#3A3A3C] border border-slate-200 dark:border-white/5`;

    const primaryBtn = aquaStyle
        ? `${capsuleBtn} bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/10`
        : `${capsuleBtn} bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-lg shadow-slate-900/20`;

    return (
        <Dialog open={isOpen} onClose={onClose} className={`fixed inset-0 z-[100] flex items-center justify-center font-sans ${className}`}>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-xl transition-all duration-500" 
                aria-hidden="true" 
            />
            
            <Dialog.Panel 
                as={motion.div} 
                variants={modalVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit"
                style={containerStyle}
                className={containerClass}
            >
                
                <header className={headerClass}>
                    
                    {/* Progress Fill Layer (Horizontal Mode Only) */}
                    {readingMode === 'horizontal' && (
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                            className={`absolute inset-y-0 left-0 z-0 ${aquaStyle ? aquaStyle.fill : 'bg-slate-200/50 dark:bg-white/10'}`}
                        />
                    )}

                    {/* ✅ UPDATED: flex-1 min-w-0, removed 'truncate' to allow wrapping, increased gap-1.5 */}
                    <div className="relative z-10 flex flex-col justify-center gap-1.5 overflow-hidden flex-1 min-w-0 mr-4 self-center">
                        <Dialog.Title className={`text-xl font-bold tracking-tight leading-tight line-clamp-2 ${aquaStyle ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {lessonTitle}
                        </Dialog.Title>
                        
                        {readingMode === 'horizontal' ? (
                            <button 
                                onClick={() => setIsPageNavOpen(!isPageNavOpen)}
                                className={`group flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${aquaStyle ? 'text-white/70 hover:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
                            >
                                <span>{totalPages > 0 ? `Page ${currentPage + 1} of ${totalPages}` : 'Empty'}</span>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isPageNavOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />
                            </button>
                        ) : (
                            <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${aquaStyle ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
                                <BookOpenIcon className="w-3 h-3" />
                                <span>Continuous Scroll</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Controls */}
                    <div className="relative z-10 flex items-center gap-2 sm:gap-3 flex-shrink-0 self-center">
                        <button
                            onClick={() => setReadingMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                            className={tonalBtn}
                            title={readingMode === 'horizontal' ? "Switch to Scroll Mode" : "Switch to Page Mode"}
                        >
                            {readingMode === 'horizontal' ? <ArrowsUpDownIcon className="w-4 h-4" /> : <ArrowsRightLeftIcon className="w-4 h-4" />}
                            <span className="hidden sm:inline">{readingMode === 'horizontal' ? 'Scroll' : 'Pages'}</span>
                        </button>

                        <div className={`h-6 w-px mx-1 ${aquaStyle ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`} />

                        <button onClick={onClose} className={`p-2.5 rounded-full transition-all active:scale-90 ${aquaStyle ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white dark:bg-[#2C2C2E] text-slate-500 hover:bg-slate-100 dark:hover:bg-[#3A3A3C] shadow-sm'}`}>
                            <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    </div>

                    {/* Page Navigation Dropdown */}
                    <AnimatePresence>
                        {isPageNavOpen && readingMode === 'horizontal' && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-20 bg-transparent" 
                                    onClick={() => setIsPageNavOpen(false)}
                                />
                                <motion.div 
                                    variants={navMenuVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className={`absolute top-full left-0 mt-4 w-72 p-4 rounded-[28px] shadow-2xl z-30 ring-1 ring-black/5 ${aquaStyle ? 'bg-[#0f172a]/90 backdrop-blur-xl border border-white/10' : 'bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/40 dark:border-white/5'}`}
                                >
                                    <div className={`flex items-center justify-between mb-3 px-1 ${aquaStyle ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                        <span className="text-xs font-bold uppercase tracking-widest">Jump to</span>
                                        <Squares2X2Icon className="w-4 h-4" />
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                        {pages.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => jumpToPage(idx)}
                                                className={`aspect-square flex items-center justify-center rounded-[14px] text-sm font-bold transition-all ${
                                                    currentPage === idx
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                                    : (aquaStyle ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10')
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
                
                {/* Content Container (Fluid Layout) */}
                <main 
                    ref={contentRef} 
                    className={`flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center p-4 sm:p-6 md:p-8 pb-32 sm:pb-24 relative ${aquaStyle ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
                >
                    <div className="w-full max-w-4xl flex-grow">
                        
                        {/* --- MODE: HORIZONTAL (Paged) --- */}
                        {readingMode === 'horizontal' ? (
                            <AnimatePresence initial={false} mode="wait">
                                <motion.div key={currentPage} variants={pageTransitionVariants} initial="hidden" animate="visible" exit="exit" className="w-full min-h-full">
                                    {currentPage === 0 && objectives.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                            className={`mb-8 p-6 sm:p-8 rounded-[28px] border shadow-sm ${aquaStyle ? 'bg-white/10 border-white/20' : 'bg-white dark:bg-[#1E212B] border-slate-100 dark:border-white/5'}`}
                                        >
                                            <h3 className="flex items-center gap-3 text-lg font-bold mb-4">
                                                <div className={`p-2 rounded-[14px] ${aquaStyle ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300'}`}>
                                                    <QueueListIcon className="h-5 w-5 stroke-2" />
                                                </div>
                                                {objectivesLabel}
                                            </h3>
                                            <ul className={`grid gap-3 font-medium leading-relaxed opacity-90 text-sm sm:text-base`}>
                                                {objectives.map((objective, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <CheckCircleSolid className={`h-5 w-5 flex-shrink-0 mt-0.5 ${aquaStyle ? 'text-white' : 'text-blue-500'}`} />
                                                        <div className="flex-1"><ContentRenderer text={objective} /></div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    )}

                                    {pageData ? (
                                        <div className={`
                                            prose prose-lg dark:prose-invert max-w-none text-justify [&_p]:indent-8 
                                            ${aquaStyle ? 'prose-headings:text-white prose-p:text-white/90 prose-strong:text-white prose-li:text-white/90' : ''}
                                        `}>
                                            {pageData.title && (
                                                <motion.h1 
                                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                                                    className="text-3xl sm:text-4xl font-black mb-8 tracking-tighter leading-tight indent-0"
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
                                            <div className="flex flex-col items-center justify-center text-center opacity-50 h-64">
                                                <QuestionMarkCircleIcon className="w-16 h-16 stroke-1 mb-4" />
                                                <p className="text-lg font-medium">This page is empty.</p>
                                            </div>
                                        )
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            /* --- MODE: VERTICAL (Wattpad Style) --- */
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-16 pb-24">
                                {objectives.length > 0 && (
                                    <div className={`p-6 sm:p-8 rounded-[32px] border ${aquaStyle ? 'bg-white/10 border-white/20' : 'bg-white dark:bg-[#1E212B] border-slate-100 dark:border-white/5'}`}>
                                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <QueueListIcon className="w-6 h-6" /> {objectivesLabel}
                                        </h3>
                                        <ul className="grid gap-3 opacity-90">
                                            {objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <CheckCircleSolid className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1"><ContentRenderer text={objective} /></div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {pages.map((pData, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className="flex items-center gap-4 mb-8 opacity-60">
                                            <span className="text-xs font-black uppercase tracking-widest">Page {idx + 1}</span>
                                            <div className={`h-px flex-1 ${aquaStyle ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                                        </div>

                                        <div className={`prose prose-lg dark:prose-invert max-w-none text-justify [&_p]:indent-8 ${aquaStyle ? 'prose-headings:text-white prose-p:text-white/90 prose-strong:text-white' : ''}`}>
                                            {pData.title && (
                                                <h2 className="text-3xl font-black mb-6 tracking-tighter indent-0">{pData.title}</h2>
                                            )}
                                            <LessonPage page={pData} isEditable={false} />
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-center py-8">
                                    <div className="px-6 py-2 rounded-full bg-black/5 dark:bg-white/10 text-xs font-bold uppercase tracking-widest opacity-60">
                                        End of Lesson
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </main>
                
                {/* Floating Footer Navigation */}
                <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        className={`
                            flex items-center gap-2 p-2 rounded-full shadow-2xl backdrop-blur-2xl ring-1 ring-black/5
                            ${aquaStyle ? 'bg-white/20 border border-white/20' : 'bg-white/80 dark:bg-[#2C2C2E]/80 border border-white/60 dark:border-white/10'}
                        `}
                    >
                        {readingMode === 'horizontal' ? (
                            <>
                                <button onClick={goToPreviousPage} disabled={currentPage === 0} className={tonalBtn}>
                                    <ArrowLeftIcon className="h-5 w-5" />
                                </button>

                                {pageData?.type === 'diagram-data' && (
                                    <div className="flex items-center gap-1 px-1 border-x border-black/5 dark:border-white/10 mx-1">
                                        <button onClick={() => lessonPageRef.current?.addImage()} className={tonalBtn} title="Add Image"><PhotoIcon className="h-5 w-5" /></button>
                                        <button onClick={() => lessonPageRef.current?.addLabel()} className={tonalBtn} title="Add Label"><TagIcon className="h-5 w-5" /></button>
                                        <button onClick={() => lessonPageRef.current?.finalizeDiagram()} disabled={isFinalizing} className={`${tonalBtn} text-emerald-600 dark:text-emerald-400`} title="Save">
                                            <LockClosedIcon className={`h-5 w-5 ${isFinalizing ? "animate-spin" : ""}`} />
                                        </button>
                                    </div>
                                )}
                                
                                {pageData?.type === 'diagram' && (
                                     <div className="flex items-center gap-1 px-1 border-x border-black/5 dark:border-white/10 mx-1">
                                        <button onClick={handleRevertDiagramToEditable} className={`${tonalBtn} text-amber-600 dark:text-amber-400`} title="Edit">
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}

                                <button onClick={currentPage < totalPages - 1 ? goToNextPage : onClose} className={primaryBtn}>
                                    <span className="px-2">{currentPage < totalPages - 1 ? 'Next' : 'Finish'}</span>
                                    {currentPage < totalPages - 1 ? <ArrowRightIcon className="h-5 w-5" /> : <CheckCircleSolid className="h-5 w-5" />}
                                </button>
                            </>
                        ) : (
                            <button onClick={onClose} className={primaryBtn}>
                                <CheckCircleSolid className="h-5 w-5" />
                                <span className="px-4">Finish Reading</span>
                            </button>
                        )}
                    </motion.div>
                </footer>

            </Dialog.Panel>
        </Dialog>
    );
}