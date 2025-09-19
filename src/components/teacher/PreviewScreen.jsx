import React, { useState, useMemo } from 'react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import LessonPage from './LessonPage';
import { ArrowPathIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';

export default function PreviewScreen({ subject, unit, guideData, generationResult, onBackToEdit, onClose }) {
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
            let order = 0; 

            lessonsToPreview.forEach((lesson) => {
                const newLessonRef = doc(collection(db, 'lessons'));
                batch.set(newLessonRef, {
                    title: lesson.lesson_title,
                    lessonTitle: lesson.lesson_title,
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

    return (
        <div className="flex flex-col h-full">
            <header className="flex-shrink-0 p-6 text-center border-b border-gray-200">
                <Dialog.Title as="h2" className="text-xl font-bold text-gray-900">
                    Preview & Save Learning Guide
                </Dialog.Title>
                <p className="text-sm text-gray-500 mt-1">
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
                                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${selectedLessonIndex === index ? 'bg-white shadow-md ring-2 ring-indigo-500/50' : 'bg-white/60 hover:bg-white/90 hover:shadow-sm'}`}
                                >
                                    <p className="font-semibold text-gray-800 truncate">{lesson.lesson_title}</p>
                                    <p className="text-xs text-gray-500">{lesson.pages?.length || 0} pages</p>
                                </button>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 pt-10">
                                <p>No lessons were generated.</p>
                                {generationResult.failedLessonNumber && <p className="text-sm mt-2">Generation failed at Lesson {generationResult.failedLessonNumber}.</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-2/3 bg-white rounded-xl border overflow-y-auto">
                    {selectedLesson ? (
                        <div className="p-6 prose max-w-none">
                            {selectedLesson.pages.map((page, index) => (
                                <div key={index} className="mb-8 pb-8 border-b last:border-b-0">
                                     <h3 className="font-bold text-lg mb-2">{page.page_title}</h3>
                                     <LessonPage page={page} isEditable={false} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Select a lesson from the left to preview its content.</p>
                        </div>
                    )}
                </div>
            </main>
            
            <footer className="flex-shrink-0 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button 
                    onClick={onBackToEdit} 
                    disabled={isSaving} 
                    className="btn-secondary-ios"
                >
                    Back to Edit
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {generationResult.failedLessonNumber && (
                        <button 
                            onClick={onBackToGeneration} 
                            className="btn-primary-ios flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600"
                        >
                            <ArrowPathIcon className="h-5 w-5" />
                            Retry from Lesson {generationResult.failedLessonNumber}
                        </button>
                    )}
                    <button 
                        onClick={handleSave} 
                        className="btn-primary-ios"
                        disabled={!isValidPreview || isSaving || !!generationResult.failedLessonNumber}
                    >
                        {isSaving ? 'Saving...' : `Accept & Save ${lessonsToPreview.length} Lesson(s)`}
                    </button>
                </div>
            </footer>
        </div>
    );
}