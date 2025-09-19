import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Dialog } from '@headlessui/react';
import { AcademicCapIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';

export default function TopicSelectionScreen({ subject, unit, initialData, onSubmit }) {
    const { showToast } = useToast();
    const [formData, setFormData] = useState(initialData);
    const [subjectName, setSubjectName] = useState('');
    const [subjectContext, setSubjectContext] = useState(null);
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());

    useEffect(() => {
        if (subject?.id) {
            const fetchFullSubjectContext = async () => {
                try {
                    setSubjectName(subject.title || 'this subject');

                    const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subject.id));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    const unitsData = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    setSubjectContext({ units: unitsData, lessons: lessonsData });
                } catch (error) {
                    console.error("Error fetching subject context:", error);
                    showToast("Could not scan existing subject content.", "error");
                }
            };
            fetchFullSubjectContext();
        }
    }, [subject, showToast]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'lessonCount' ? Math.max(1, Number(value)) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const scaffoldedLessons = useMemo(() => {
        if (!subjectContext) return [];
        return subjectContext.lessons.filter(lesson => scaffoldLessonIds.has(lesson.id));
    }, [scaffoldLessonIds, subjectContext]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.content.trim() || !formData.learningCompetencies.trim()) {
            showToast("Please provide the Main Content/Topic and Learning Competencies.", "warning");
            return;
        }
        onSubmit({ ...formData, scaffoldedLessons, subjectName });
    };

    const handleToggleUnitExpansion = (unitId) => {
        const newSet = new Set(expandedScaffoldUnits);
        if (newSet.has(unitId)) newSet.delete(unitId);
        else newSet.add(unitId);
        setExpandedScaffoldUnits(newSet);
    };

    const handleUnitCheckboxChange = (lessonsInUnit) => {
        const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
        const currentlySelectedInUnit = lessonIdsInUnit.filter(id => scaffoldLessonIds.has(id));
        const newSet = new Set(scaffoldLessonIds);

        if (currentlySelectedInUnit.length === lessonIdsInUnit.length) {
            lessonIdsInUnit.forEach(id => newSet.delete(id));
        } else {
            lessonIdsInUnit.forEach(id => newSet.add(id));
        }
        setScaffoldLessonIds(newSet);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <header className="flex-shrink-0 p-6 border-b border-zinc-200/80">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-3 rounded-xl text-white shadow-lg flex-shrink-0">
                        <AcademicCapIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <Dialog.Title as="h2" className="text-xl sm:text-2xl font-bold text-zinc-900">AI Learning Guide Generator</Dialog.Title>
                        <p className="text-sm text-zinc-500">Create new student-facing lessons from scratch for {unit?.title || 'this unit'}.</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto py-5 px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pb-2">1. Core Content</h3>
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Main Content / Topic*</label>
                            <textarea placeholder="e.g., The Photosynthesis Process" name="content" value={formData.content} onChange={handleChange} className="form-input-ios" rows={3} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Learning Competencies*</label>
                            <textarea placeholder="e.g., Describe the process of photosynthesis..." name="learningCompetencies" value={formData.learningCompetencies} onChange={handleChange} className="form-input-ios" rows={4} required/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Content Standard <span className="text-zinc-400">(Optional)</span></label>
                            <textarea name="contentStandard" value={formData.contentStandard} onChange={handleChange} className="form-input-ios" rows={2} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Performance Standard <span className="text-zinc-400">(Optional)</span></label>
                            <textarea name="performanceStandard" value={formData.performanceStandard} onChange={handleChange} className="form-input-ios" rows={2} />
                        </div>
                        <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pt-2 pb-2">2. Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Language</label>
                                <select name="language" value={formData.language} onChange={handleChange} className="form-input-ios">
                                    <option>English</option><option>Filipino</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Grade Level</label>
                                <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className="form-input-ios">
                                    {[7, 8, 9, 10, 11, 12].map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Number of Lessons to Generate</label>
                            <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className="form-input-ios" />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pb-2">3. Scaffolding (Optional)</h3>
                        <div className="bg-white/50 p-4 rounded-xl h-full max-h-[29rem] overflow-y-auto">
                            <p className="text-xs text-zinc-500 mb-3">Explicitly select lessons for the AI to build upon to avoid repetition.</p>
                            {subjectContext ? (
                                subjectContext.units
                                    .slice()
                                    .sort((a, b) => {
                                        const getUnitNumber = (title) => title ? parseInt(title.match(/\d+/)?.[0] || '999', 10) : 999;
                                        return getUnitNumber(a.title) - getUnitNumber(b.title);
                                    })
                                    .map(unit => {
                                    const lessonsInUnit = subjectContext.lessons.filter(lesson => lesson.unitId === unit.id);
                                    if (lessonsInUnit.length === 0) return null;
                                    const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                    const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                    const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                    const isExpanded = expandedScaffoldUnits.has(unit.id);
                                    return (
                                        <div key={unit.id} className="pt-2 first:pt-0">
                                            <div className="flex items-center bg-zinc-100 p-2 rounded-md">
                                                <button type="button" onClick={() => handleToggleUnitExpansion(unit.id)} className="p-1">
                                                    <ChevronRightIcon className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                                <input
                                                    type="checkbox"
                                                    id={`scaffold-unit-${unit.id}`}
                                                    checked={isAllSelected}
                                                    ref={el => { if(el) el.indeterminate = isPartiallySelected; }}
                                                    onChange={() => handleUnitCheckboxChange(lessonsInUnit)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                                                />
                                                <label htmlFor={`scaffold-unit-${unit.id}`} className="ml-2 flex-1 text-sm font-semibold text-zinc-700 cursor-pointer">
                                                    {unit.title}
                                                </label>
                                            </div>

                                            {isExpanded && (
                                                <div className="pl-6 pt-2 space-y-2">
                                                    {lessonsInUnit.map(lesson => (
                                                        <div key={lesson.id} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={`scaffold-lesson-${lesson.id}`}
                                                                checked={scaffoldLessonIds.has(lesson.id)}
                                                                onChange={() => {
                                                                    const newSet = new Set(scaffoldLessonIds);
                                                                    if (newSet.has(lesson.id)) newSet.delete(lesson.id);
                                                                    else newSet.add(lesson.id);
                                                                    setScaffoldLessonIds(newSet);
                                                                }}
                                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-zinc-800">
                                                                {lesson.title}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-zinc-400 text-center py-4">Loading subject content...</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="flex-shrink-0 pt-4 mt-auto px-6 pb-6 border-t border-zinc-200/80">
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        className="btn-primary-ios w-full sm:w-auto"
                        disabled={!formData.content.trim() || !formData.learningCompetencies.trim()}
                    >
                        Generate Learning Guide
                    </button>
                </div>
            </footer>
        </form>
    );
}