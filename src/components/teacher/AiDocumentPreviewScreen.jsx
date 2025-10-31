import React, { useState, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { Dialog } from '@headlessui/react';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage';

export default function AiDocumentPreviewScreen({ unitId, subjectId, formData, generationResult, onBackToEdit, onClose }) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(generationResult.failed ? generationResult.error : '');
    const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);

    const previewLessons = generationResult?.lessons || [];
    const selectedLesson = previewLessons[selectedLessonIndex];
    const selectedPage = selectedLesson?.pages[selectedPageIndex];

    const handleSaveLesson = async () => {
        if (previewLessons.length === 0 || !unitId || !subjectId) {
            setError('Cannot save without generated lessons and unit context.');
            showToast('Cannot save without generated lessons and unit context.', 'error');
            return;
        }
        setSaving(true);
        try {
            const savePromises = previewLessons.map((lesson, index) =>
                addDoc(collection(db, 'lessons'), {
                    title: lesson.lessonTitle,
                    unitId,
                    subjectId,
                    pages: lesson.pages,
                    objectives: lesson.learningObjectives || [],
                    contentType: "studentLesson",
                    createdAt: serverTimestamp(),
                    order: formData.existingLessonCount + index,
                    
                    // Add the new fields from the form
                    learningCompetencies: lesson.assignedCompetencies || [],
                    contentStandard: formData.contentStandard || '',
                    performanceStandard: formData.performanceStandard || ''
                })
            );
            await Promise.all(savePromises);
            showToast(`${previewLessons.length} lesson(s) saved successfully!`, 'success');
            onClose(); 
        } catch (err) {
            console.error('Error saving lessons: ', err);
            setError('Failed to save one or more lessons.');
            showToast('Failed to save one or more lessons.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const objectivesAsMarkdown = useMemo(() => {
        if (!selectedLesson?.learningObjectives?.length) return null;
        return selectedLesson.learningObjectives.map(obj => `* ${obj}`).join('\n');
    }, [selectedLesson]);

    return (
        <div className="flex flex-col h-full">
            <header className="flex-shrink-0 pb-4 border-b border-neumorphic-shadow-dark/20">
                <div className="flex justify-between items-center mb-2">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800">Preview & Save Lessons</Dialog.Title>
                    <button type="button" onClick={onBackToEdit} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 rounded-lg hover:shadow-neumorphic-inset">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        Back to Edit
                    </button>
                </div>
                 <p className="text-slate-500">
                    Review the AI-generated lessons. You can save them or go back to edit the form.
                </p>
            </header>

            <main className="flex-grow pt-4 overflow-hidden flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 flex flex-col bg-neumorphic-base rounded-2xl p-3 shadow-neumorphic-inset overflow-hidden">
                    <h4 className="p-2 text-sm font-semibold text-slate-600">Generated Lessons</h4>
                    <div className="flex-grow overflow-y-auto pr-1 space-y-1.5">
                        {previewLessons.length > 0 ? (
                            previewLessons.map((lesson, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => { setSelectedLessonIndex(index); setSelectedPageIndex(0); }} 
                                    className={`w-full text-left p-3 rounded-xl transition-all duration-300 ${selectedLessonIndex === index ? 'bg-white shadow-neumorphic ring-2 ring-sky-300' : 'bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset'}`}
                                >
                                    <span className="font-semibold text-slate-800">{lesson.lessonTitle}</span>
                                </button>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center p-4">No lessons to preview.</p>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-2/3 flex-grow bg-neumorphic-base rounded-xl flex flex-col overflow-hidden shadow-neumorphic min-h-0">
                    {selectedLesson ? (
                        <>
                            <div className="flex-shrink-0 p-4 border-b border-neumorphic-shadow-dark/20">
                                <h3 className="text-lg font-bold text-slate-900 truncate">{selectedLesson.lessonTitle}</h3>
                                {objectivesAsMarkdown && (
                                    <div className="my-2 p-3 bg-sky-50 border-l-4 border-sky-300 rounded-r-lg">
                                        <p className="font-semibold mb-1 text-sky-900">Learning Objectives</p>
                                        <div className="prose prose-sm max-w-none prose-sky text-sky-800">
                                            <LessonPage page={{ content: objectivesAsMarkdown }} isEditable={false} />
                                        </div>
                                    </div>
                                )}
                                <div className="flex space-x-2 mt-2 -mb-2 pb-2 overflow-x-auto">
                                    {selectedLesson.pages.map((page, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedPageIndex(index)}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedPageIndex === index ? "bg-sky-600 text-white shadow-neumorphic" : "bg-neumorphic-base text-slate-600 shadow-neumorphic hover:shadow-neumorphic-inset"}`}
                                        >{page.title}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-grow min-h-0 overflow-y-auto p-6">
                                <div className="prose max-w-none prose-slate">
                                    {selectedPage ? <LessonPage page={selectedPage} isEditable={false} /> : <p>Select a page to view its content.</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                         <div className="m-auto text-center">
                            <p className="mt-2 text-sm font-semibold text-slate-500">Select a lesson to preview</p>
                        </div>
                    )}
                </div>
            </main>

            <footer className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-neumorphic-shadow-dark/20">
                {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                <button type="button" className="px-4 py-2 bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset" onClick={onClose}>Cancel</button>
                <button 
                    type="button" 
                    onClick={handleSaveLesson} 
                    disabled={saving || previewLessons.length === 0} 
                    className="px-4 py-2 font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset disabled:opacity-60"
                >
                    {saving ? 'Saving...' : `Save ${previewLessons.length} Lesson(s)`}
                </button>
            </footer>
        </div>
    );
}