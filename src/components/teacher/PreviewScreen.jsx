import React, { useState, useEffect } from 'react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import LessonPage from './LessonPage';
import { 
    ArrowPathIcon, 
    CheckIcon, 
    ChevronRightIcon, 
    ArrowLeftIcon,
    SparklesIcon,
    DocumentCheckIcon,
    BookOpenIcon,
    RectangleStackIcon
} from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';

export default function PreviewScreen({ subject, unit, guideData, generationResult, onBackToEdit, onClose, onBackToGeneration }) {
    const { showToast } = useToast();
    const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    const isValidPreview = generationResult?.previewData && generationResult.previewData.generated_lessons?.length > 0;
    const lessonsToPreview = isValidPreview ? generationResult.previewData.generated_lessons : [];
    const selectedLesson = isValidPreview ? lessonsToPreview[selectedLessonIndex] : null;

    const handleSave = async () => {
        if (!isValidPreview) {
            showToast("There is no valid content to save.", "error");
            return;
        }
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            let order = unit.lessonCount || 0; 

            lessonsToPreview.forEach((lesson) => {
                const newLessonRef = doc(collection(db, 'lessons'));
                batch.set(newLessonRef, {
                    title: lesson.lessonTitle, 
                    lessonTitle: lesson.lessonTitle,
                    unitId: unit.id,
                    subjectId: subject.id,
                    pages: lesson.pages || [],
                    objectives: lesson.learningObjectives || [],
                    contentType: "studentLesson",
                    createdAt: serverTimestamp(),
                    order: order++,
                    isAiGenerated: true,
                    learningCompetencies: lesson.assignedCompetencies || [], 
                    contentStandard: guideData.contentStandard || '',
                    performanceStandard: guideData.performanceStandard || ''
                });
            });

            await batch.commit();
            showToast(`${lessonsToPreview.length} lesson(s) saved successfully!`, "success");
            onClose();
        } catch (error) {
            console.error("Error saving learning guide:", error);
            showToast("An error occurred while saving.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-[32px] md:rounded-[48px] overflow-hidden selection:bg-indigo-500/30">
            
            {/* === ULTRA PREMIUM STICKY HEADER === */}
            <header className="flex-shrink-0 px-5 py-4 md:px-8 md:py-6 border-b border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-[16px] md:rounded-[22px] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <SparklesIcon className="w-6 h-6 md:w-8 md:h-8 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                            <Dialog.Title as="h2" className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                Review Content
                            </Dialog.Title>
                            <p className="text-[11px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                                {lessonsToPreview.length} Modules • {subject?.title}
                            </p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Validated</span>
                    </div>
                </div>
            </header>

            {/* === MAIN CONTENT BODY === */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                
                {/* 1. LESSON SELECTOR (Horizontal on Mobile, Sidebar on Desktop) */}
                <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm z-20">
                    <div className="p-4 md:p-6 flex flex-col h-full">
                        <h3 className="hidden md:flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">
                            <RectangleStackIcon className="w-4 h-4" /> Generated Library
                        </h3>
                        
                        {/* Horizontal Scroll on Mobile / Vertical on Desktop */}
                        <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 no-scrollbar md:custom-scrollbar">
                            {lessonsToPreview.map((lesson, index) => {
                                const isSelected = selectedLessonIndex === index;
                                return (
                                    <button 
                                        key={index} 
                                        onClick={() => setSelectedLessonIndex(index)}
                                        style={{ willChange: 'transform' }}
                                        className={`shrink-0 md:w-full text-left px-4 py-3.5 md:px-5 md:py-4 rounded-[20px] md:rounded-[24px] border transition-all duration-300 active:scale-95 flex items-center justify-between min-w-[160px] md:min-w-0
                                            ${isSelected 
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-500/20' 
                                                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className={`text-[13px] md:text-[15px] font-black truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                {index + 1}. {lesson.lessonTitle}
                                            </p>
                                            <p className={`text-[10px] md:text-[11px] mt-1 font-bold uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                                                {lesson.pages?.length || 0} Pages
                                            </p>
                                        </div>
                                        {isSelected && <CheckIcon className="hidden md:block w-4 h-4 text-white/70 stroke-[3]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 2. DOCUMENT PREVIEW PANEL */}
                <div className="flex-1 bg-slate-100/50 dark:bg-black/20 overflow-y-auto custom-scrollbar p-3 md:p-8">
                    {selectedLesson ? (
                        <div 
                            style={{ willChange: 'transform, opacity' }}
                            className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[28px] md:rounded-[40px] shadow-sm border border-slate-200/60 dark:border-white/5 min-h-full p-6 md:p-14 animate-in fade-in slide-in-from-bottom-4 duration-500"
                        >
                            {/* Lesson Header */}
                            <div className="mb-10 pb-8 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                        Unit Module
                                    </span>
                                </div>
                                <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
                                    {selectedLesson.lessonTitle}
                                </h1>
                                <div className="flex flex-wrap gap-2">
                                    {selectedLesson.learningObjectives?.map((obj, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold shadow-inner">
                                            <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                            Objective {i + 1}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Lesson Body */}
                            <div className="prose prose-slate prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:leading-relaxed prose-p:font-medium prose-p:text-slate-600 dark:prose-p:text-slate-400">
                                {selectedLesson.pages.map((page, index) => (
                                    <div key={index} className="mb-16 last:mb-0">
                                         {page.title && (
                                             <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                                                 <div className="w-1.5 h-7 bg-indigo-600 rounded-full" />
                                                 {page.title}
                                             </h3>
                                         )}
                                         <div className="pl-4 md:pl-8 border-l-2 border-slate-100 dark:border-white/10 ml-0.5">
                                            <LessonPage page={page} isEditable={false} />
                                         </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <div className="w-16 h-16 rounded-[22px] bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-4">
                                <BookOpenIcon className="w-8 h-8" />
                            </div>
                            <p className="font-black text-sm uppercase tracking-widest">Select a Module</p>
                        </div>
                    )}
                    <div className="h-10 md:h-20" />
                </div>
            </main>
            
            {/* === ACTIONS FOOTER === */}
            <footer className="flex-shrink-0 px-5 py-4 md:px-8 md:py-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 z-30">
                <button 
                    onClick={onBackToEdit} 
                    disabled={isSaving} 
                    className="flex items-center gap-2 text-xs md:text-sm font-black text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95 uppercase tracking-widest"
                >
                    <ArrowLeftIcon className="w-4 h-4 stroke-[3]" />
                    Edit Setup
                </button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {generationResult.failedLessonNumber && (
                        <button 
                            onClick={() => onBackToGeneration(generationResult.failedLessonNumber)} 
                            className="flex items-center justify-center px-6 py-3 rounded-[18px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[11px] md:text-xs uppercase tracking-widest border border-amber-500/20 active:scale-95 transition-all"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-2 stroke-[3]" />
                            Retry from #{generationResult.failedLessonNumber}
                        </button>
                    )}
                    
                    <button 
                        onClick={handleSave} 
                        disabled={!isValidPreview || isSaving}
                        className={`group flex items-center justify-center gap-3 px-8 py-3.5 md:py-4 rounded-[22px] md:rounded-[24px] text-sm font-black text-white shadow-xl transition-all active:scale-[0.96]
                            ${(!isValidPreview || isSaving)
                                ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed shadow-none grayscale' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
                            }`}
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving Content...
                            </span>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5 stroke-[3]" />
                                Save {lessonsToPreview.length} Lessons
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
}