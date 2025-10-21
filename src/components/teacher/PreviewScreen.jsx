import React, { useState } from 'react'; // FIX: Imported useState
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import LessonPage from './LessonPage';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';

export default function PreviewScreen({ subject, unit, generationResult, onBackToEdit, onClose, onBackToGeneration }) {
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
                    // FIX: Using lessonTitle consistent with generation prompt
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
    
    // Reusable neumorphic button styles
    const btnBase = "inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 focus:ring-sky-500";
    const btnExtruded = `bg-slate-200 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]`;
    const btnDisabled = "disabled:text-slate-400 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]";

    return (
        <div className="flex flex-col h-full bg-slate-200 rounded-2xl">
            <header className="flex-shrink-0 p-6 text-center">
                <Dialog.Title as="h2" className="text-xl font-bold text-slate-800">
                    Preview & Save Learning Guide
                </Dialog.Title>
                <p className="text-sm text-slate-500 mt-1">
                    Review the AI-generated lessons below. You can save them or go back to regenerate.
                </p>
            </header>

            <main className="flex-grow flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-700 mb-3 px-1">Generated Lessons</h3>
                    <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-2">
                        {isValidPreview ? (
                            lessonsToPreview.map((lesson, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => setSelectedLessonIndex(index)}
                                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${selectedLessonIndex === index ? 'shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] ring-2 ring-sky-500/80' : 'bg-slate-200 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff]'}`}
                                >
                                    {/* FIX: Using lessonTitle consistent with generation prompt */}
                                    <p className="font-semibold text-slate-800 truncate">{lesson.lessonTitle}</p>
                                    <p className="text-xs text-slate-500">{lesson.pages?.length || 0} pages</p>
                                </button>
                            ))
                        ) : (
                            <div className="text-center text-slate-500 pt-10">
                                <p>No lessons were generated.</p>
                                {generationResult.failedLessonNumber && <p className="text-sm mt-2">Generation failed at Lesson {generationResult.failedLessonNumber}.</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-2/3 bg-slate-200 rounded-xl shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] overflow-y-auto">
                    {selectedLesson ? (
                        <div className="p-6 prose prose-slate max-w-none">
                            {selectedLesson.pages.map((page, index) => (
                                <div key={index} className="mb-8 pb-8 border-b border-slate-300/70 last:border-b-0">
                                     {/* FIX: Using page.title consistent with generation prompt */}
                                     {page.title && <h3 className="font-bold text-lg mb-2">{page.title}</h3>}
                                     <LessonPage page={page} isEditable={false} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            <p>Select a lesson from the left to preview its content.</p>
                        </div>
                    )}
                </div>
            </main>
            
            <footer className="flex-shrink-0 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button 
                    onClick={onBackToEdit} 
                    disabled={isSaving} 
                    className={`${btnBase} ${btnExtruded} text-slate-700 ${btnDisabled}`}
                >
                    Back to Edit
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {generationResult.failedLessonNumber && (
                        <button 
                            onClick={() => onBackToGeneration(generationResult.failedLessonNumber)} 
                            className={`${btnBase} bg-amber-400 text-amber-900 font-semibold shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]`}
                        >
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Retry from Lesson {generationResult.failedLessonNumber}
                        </button>
                    )}
                    <button 
                        onClick={handleSave} 
                        className={`${btnBase} ${btnExtruded} text-sky-600 font-semibold ${btnDisabled}`}
                        disabled={!isValidPreview || isSaving}
                    >
                        {isSaving ? 'Saving...' : `Accept & Save ${lessonsToPreview.length} Lesson(s)`}
                    </button>
                </div>
            </footer>
        </div>
    );
}