import React, { useState } from 'react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import LessonPage from './LessonPage';
import { ArrowPathIcon, CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
            // Find the highest existing order number for lessons in this unit to append the new ones.
            // This is a simplified approach. A more robust solution might involve a Firestore query.
            let order = unit.lessonCount || 0; 

            lessonsToPreview.forEach((lesson) => {
                const newLessonRef = doc(collection(db, 'lessons'));
                batch.set(newLessonRef, {
                    // --- Existing Fields ---
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

                    // --- START OF CHANGES ---
                    // This now saves the specific 1-3 competencies assigned by the AI
                    learningCompetencies: lesson.assignedCompetencies || [], 
                    
                    // These are saved from the main form, as they apply to all lessons
                    contentStandard: guideData.contentStandard || '',
                    performanceStandard: guideData.performanceStandard || ''
                    // --- END OF CHANGES ---
                });
            });

            await batch.commit();
            showToast(`${lessonsToPreview.length} lesson(s) saved successfully!`, "success");
            onClose();
        } catch (error) {
            console.error("Error saving learning guide:", error);
            showToast("An error occurred while saving the lessons.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        // --- CONTAINER: macOS 26 Panel Style ---
        <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] rounded-[24px] overflow-hidden shadow-2xl ring-1 ring-black/5">
            
            {/* --- HEADER --- */}
            <header className="flex-shrink-0 px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-[#1e1e1e]/50 backdrop-blur-xl z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <Dialog.Title as="h2" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Review Generated Content
                        </Dialog.Title>
                        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {lessonsToPreview.length} lessons created for <span className="text-slate-800 dark:text-slate-200 font-semibold">{subject?.title}</span>
                        </p>
                    </div>
                    {/* Status Badge */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100/50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Ready for Review</span>
                    </div>
                </div>
            </header>

            {/* --- MAIN SPLIT VIEW --- */}
            <main className="flex-grow flex overflow-hidden">
                
                {/* --- SIDEBAR: Navigation --- */}
                <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#1e1e1e]">
                    <div className="p-4">
                        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
                            Generated Lessons
                        </h3>
                        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar pr-2">
                            {isValidPreview ? (
                                lessonsToPreview.map((lesson, index) => {
                                    const isSelected = selectedLessonIndex === index;
                                    return (
                                        <button 
                                            key={index} 
                                            onClick={() => setSelectedLessonIndex(index)}
                                            className={`group w-full text-left px-3 py-3 rounded-[12px] transition-all duration-200 flex items-center justify-between
                                                ${isSelected 
                                                    ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/20' 
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="min-w-0 pr-2">
                                                <p className={`text-[13px] font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                    {lesson.lessonTitle}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {lesson.pages?.length || 0} pages • {lesson.learningObjectives?.length || 0} objectives
                                                </p>
                                            </div>
                                            {isSelected && <ChevronRightIcon className="w-4 h-4 text-white/70" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center p-8 text-slate-400">
                                    <p className="text-sm">No content available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- CONTENT: Document Preview --- */}
                <div className="flex-grow bg-slate-100/50 dark:bg-black/20 flex flex-col relative overflow-hidden">
                    {selectedLesson ? (
                        <div className="flex-grow overflow-y-auto p-6 md:p-10 custom-scrollbar">
                            <div className="max-w-3xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-[16px] shadow-sm border border-slate-200 dark:border-white/5 min-h-[500px] p-8 md:p-12">
                                {/* Lesson Header in Preview */}
                                <div className="mb-8 pb-6 border-b border-slate-100 dark:border-white/5">
                                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                                        {selectedLesson.lessonTitle}
                                    </h1>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLesson.learningObjectives?.map((obj, i) => (
                                            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[11px] font-medium">
                                                Objective {i + 1}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="prose prose-slate prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed">
                                    {selectedLesson.pages.map((page, index) => (
                                        <div key={index} className="mb-12 last:mb-0">
                                             {page.title && (
                                                 <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                                     <span className="w-1.5 h-6 bg-[#007AFF] rounded-full inline-block"></span>
                                                     {page.title}
                                                 </h3>
                                             )}
                                             <div className="pl-4 border-l border-slate-200 dark:border-white/10 ml-0.5">
                                                <LessonPage page={page} isEditable={false} />
                                             </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="h-10" /> {/* Bottom spacer */}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                            <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-4">
                                <ArrowPathIcon className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="font-medium">Select a lesson to preview details</p>
                        </div>
                    )}
                </div>
            </main>
            
            {/* --- FOOTER: Actions --- */}
            <footer className="flex-shrink-0 p-5 bg-white dark:bg-[#1e1e1e] border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 z-20">
                <button 
                    onClick={onBackToEdit} 
                    disabled={isSaving} 
                    className="text-[13px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-4 py-2 transition-colors"
                >
                    ← Back to Configuration
                </button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {generationResult.failedLessonNumber && (
                        <button 
                            onClick={() => onBackToGeneration(generationResult.failedLessonNumber)} 
                            className="flex items-center justify-center px-5 py-2.5 rounded-[12px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold text-[13px] hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all active:scale-[0.98]"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-2 stroke-[2.5]" />
                            Retry from Lesson {generationResult.failedLessonNumber}
                        </button>
                    )}
                    
                    <button 
                        onClick={handleSave} 
                        disabled={!isValidPreview || isSaving}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-[14px] text-[13px] font-bold text-white shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]
                            ${(!isValidPreview || isSaving)
                                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none opacity-70' 
                                : 'bg-[#007AFF] hover:bg-[#0062CC]'
                            }`}
                    >
                        {isSaving ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <CheckIcon className="w-4 h-4 stroke-[3]" />
                                Accept & Save {lessonsToPreview.length} Lessons
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
}