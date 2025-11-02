import React, { useState } from 'react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import LessonPage from './LessonPage';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';

// --- START OF CHANGES ---
// Accepted guideData as a prop
export default function PreviewScreen({ subject, unit, guideData, generationResult, onBackToEdit, onClose, onBackToGeneration }) {
// --- END OF CHANGES ---

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
    
    // --- MODIFIED: Reusable neumorphic button styles with dark mode ---
    const btnBase = "inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-neumorphic-base-dark focus:ring-sky-500";
    const btnExtruded = `bg-slate-200 dark:bg-neumorphic-base-dark shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:shadow-lg hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] dark:hover:shadow-neumorphic-inset-dark active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:active:shadow-neumorphic-inset-dark`;
    const btnDisabled = "disabled:text-slate-400 dark:disabled:text-slate-600 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:shadow-neumorphic-inset-dark";
    // ------------------------------------------------------------

    return (
        // --- MODIFIED: Main container with dark mode ---
        <div className="flex flex-col h-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-2xl">
            {/* --- MODIFIED: Header with dark mode text --- */}
            <header className="flex-shrink-0 p-6 text-center">
                <Dialog.Title as="h2" className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Preview & Save Learning Guide
                </Dialog.Title>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Review the AI-generated lessons below. You can save them or go back to regenerate.
                </p>
            </header>

            <main className="flex-grow flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col">
                    {/* --- MODIFIED: Dark mode text --- */}
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100 mb-3 px-1">Generated Lessons</h3>
                    {/* --- MODIFIED: Dark mode scrollbar --- */}
                    <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-2">
                        {isValidPreview ? (
                            lessonsToPreview.map((lesson, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => setSelectedLessonIndex(index)}
                                    // --- MODIFIED: Neumorphic button with dark mode for selected/unselected states ---
                                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${selectedLessonIndex === index ? 'shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:shadow-neumorphic-inset-dark ring-2 ring-sky-500/80' : 'bg-slate-200 dark:bg-neumorphic-base-dark shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:shadow-lg hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] dark:hover:shadow-neumorphic-inset-dark'}`}
                                >
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{lesson.lessonTitle}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{lesson.pages?.length || 0} pages</p>
                                </button>
                            ))
                        ) : (
                            // --- MODIFIED: Dark mode text ---
                            <div className="text-center text-slate-500 dark:text-slate-400 pt-10">
                                <p>No lessons were generated.</p>
                                {generationResult.failedLessonNumber && <p className="text-sm mt-2">Generation failed at Lesson {generationResult.failedLessonNumber}.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MODIFIED: Inset preview pane with dark mode --- */}
                <div className="w-full md:w-2/3 bg-slate-200 dark:bg-neumorphic-base-dark rounded-xl shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:shadow-neumorphic-inset-dark overflow-y-auto">
                    {selectedLesson ? (
                        // --- MODIFIED: Prose dark mode ---
                        <div className="p-6 prose prose-slate dark:prose-invert max-w-none">
                            {selectedLesson.pages.map((page, index) => (
                                // --- MODIFIED: Dark mode border ---
                                <div key={index} className="mb-8 pb-8 border-b border-slate-300/70 dark:border-slate-700/50 last:border-b-0">
                                     {/* FIX: Using page.title consistent with generation prompt */}
                                     {page.title && <h3 className="font-bold text-lg mb-2">{page.title}</h3>}
                                     <LessonPage page={page} isEditable={false} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        // --- MODIFIED: Dark mode text ---
                        <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                            <p>Select a lesson from the left to preview its content.</p>
                        </div>
                    )}
                </div>
            </main>
            
            <footer className="flex-shrink-0 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button 
                    onClick={onBackToEdit} 
                    disabled={isSaving} 
                    // --- MODIFIED: Dark mode text and button styles ---
                    className={`${btnBase} ${btnExtruded} text-slate-700 dark:text-slate-300 ${btnDisabled}`}
                >
                    Back to Edit
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {generationResult.failedLessonNumber && (
                        <button 
                            onClick={() => onBackToGeneration(generationResult.failedLessonNumber)} 
                            // --- MODIFIED: Dark mode for amber button ---
                            className={`${btnBase} bg-amber-400 dark:bg-amber-500 text-amber-900 font-semibold shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:shadow-lg hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] dark:hover:shadow-neumorphic-inset-dark active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:active:shadow-neumorphic-inset-dark`}
                        >
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Retry from Lesson {generationResult.failedLessonNumber}
                        </button>
                    )}
                    <button 
                        onClick={handleSave} 
                        // --- MODIFIED: Dark mode text and button styles ---
                        className={`${btnBase} ${btnExtruded} text-sky-600 dark:text-sky-400 font-semibold ${btnDisabled}`}
                        disabled={!isValidPreview || isSaving}
                    >
                        {isSaving ? 'Saving...' : `Accept & Save ${lessonsToPreview.length} Lesson(s)`}
                    </button>
                </div>
            </footer>
        </div>
    );
}