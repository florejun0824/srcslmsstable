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

    // NOTE: Neumorphic styles are defined here for reusability.
    // --- MODIFIED: Added dark theme styles ---
    const formInputStyle = "w-full bg-slate-200 rounded-lg py-2.5 px-4 text-slate-700 shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-sky-500 transition border-2 border-slate-200 focus:border-slate-300 dark:bg-neumorphic-base-dark dark:text-slate-100 dark:shadow-neumorphic-inset-dark dark:placeholder:text-slate-500 dark:border-neumorphic-base-dark dark:focus:border-slate-700";

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
        // --- MODIFIED: Added dark theme background ---
        <form onSubmit={handleSubmit} className="flex flex-col h-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-2xl">
            <header className="flex-shrink-0 p-6">
                <div className="flex items-center gap-4">
                    {/* --- MODIFIED: Added dark theme styles --- */}
                    <div className="bg-slate-200 p-3 rounded-xl text-sky-600 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] flex-shrink-0 dark:bg-neumorphic-base-dark dark:text-sky-400 dark:shadow-lg">
                        <AcademicCapIcon className="h-7 w-7" />
                    </div>
                    <div>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <Dialog.Title as="h2" className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">AI Learning Guide Generator</Dialog.Title>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <p className="text-sm text-slate-500 dark:text-slate-400">Create new student-facing lessons from scratch for {unit?.title || 'this unit'}.</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto py-5 px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300 pb-2">1. Core Content</h3>
                        <div>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Main Content / Topic*</label>
                            <textarea placeholder="e.g., The Photosynthesis Process" name="content" value={formData.content} onChange={handleChange} className={formInputStyle} rows={3} required />
                        </div>
                        <div>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Learning Competencies*</label>
                            <textarea placeholder="e.g., Describe the process of photosynthesis..." name="learningCompetencies" value={formData.learningCompetencies} onChange={handleChange} className={formInputStyle} rows={4} required/>
                        </div>
                        <div>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Content Standard <span className="text-slate-400 dark:text-slate-500">(Optional)</span></label>
                            <textarea name="contentStandard" value={formData.contentStandard} onChange={handleChange} className={formInputStyle} rows={2} />
                        </div>
                        <div>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Performance Standard <span className="text-slate-400 dark:text-slate-500">(Optional)</span></label>
                            <textarea name="performanceStandard" value={formData.performanceStandard} onChange={handleChange} className={formInputStyle} rows={2} />
                        </div>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300 pt-2 pb-2">2. Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                {/* --- MODIFIED: Added dark theme text --- */}
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Language</label>
                                <select name="language" value={formData.language} onChange={handleChange} className={formInputStyle}>
                                    <option>English</option><option>Filipino</option>
                                </select>
                            </div>
                            <div>
                                {/* --- MODIFIED: Added dark theme text --- */}
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Grade Level</label>
                                <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className={formInputStyle}>
                                    {[7, 8, 9, 10, 11, 12].map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Number of Lessons to Generate</label>
                            <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className={formInputStyle} />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300 pb-2">3. Scaffolding (Optional)</h3>
                        {/* --- MODIFIED: Added dark theme styles --- */}
                        <div className="bg-slate-200 p-4 rounded-xl h-full max-h-[29rem] overflow-y-auto shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Explicitly select lessons for the AI to build upon to avoid repetition.</p>
                            {subjectContext ? (
                                subjectContext.units
                                    .slice()
                                    .sort((a, b) => {
                                        const getUnitNumber = (title) => title ? parseInt(title.match(/\d+/)?.[0] || '999', 10) : 999;
                                        return getUnitNumber(a.title) - getUnitNumber(b.title);
                                    })
                                    .map(unitItem => {
                                    const lessonsInUnit = subjectContext.lessons.filter(lesson => lesson.unitId === unitItem.id);
                                    if (lessonsInUnit.length === 0) return null;
                                    const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                    const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                    const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                    const isExpanded = expandedScaffoldUnits.has(unitItem.id);
                                    return (
                                        <div key={unitItem.id} className="pt-2 first:pt-0">
                                            {/* --- MODIFIED: Added dark theme styles --- */}
                                            <div className="flex items-center bg-slate-200 p-2 rounded-lg shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] transition-shadow dark:bg-neumorphic-base-dark dark:shadow-lg">
                                                <button type="button" onClick={() => handleToggleUnitExpansion(unitItem.id)} className="p-1">
                                                    {/* --- MODIFIED: Added dark theme icon --- */}
                                                    <ChevronRightIcon className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                                <input
                                                    type="checkbox"
                                                    id={`scaffold-unit-${unitItem.id}`}
                                                    checked={isAllSelected}
                                                    ref={el => { if(el) el.indeterminate = isPartiallySelected; }}
                                                    onChange={() => handleUnitCheckboxChange(lessonsInUnit)}
                                                    // --- MODIFIED: Added dark theme styles ---
                                                    className="h-4 w-4 rounded border-slate-400 text-sky-600 focus:ring-sky-500 ml-2 dark:border-slate-600 dark:bg-slate-800"
                                                />
                                                {/* --- MODIFIED: Added dark theme text --- */}
                                                <label htmlFor={`scaffold-unit-${unitItem.id}`} onClick={() => handleToggleUnitExpansion(unitItem.id)} className="ml-2 flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer">
                                                    {unitItem.title}
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
                                                                // --- MODIFIED: Added dark theme styles ---
                                                                className="h-4 w-4 rounded border-slate-400 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800"
                                                            />
                                                            {/* --- MODIFIED: Added dark theme text --- */}
                                                            <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
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
                                // --- MODIFIED: Added dark theme text ---
                                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Loading subject content...</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="flex-shrink-0 pt-4 mt-auto px-6 pb-6">
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        // --- MODIFIED: Added dark theme styles ---
                        className="w-full sm:w-auto px-8 py-3 bg-slate-200 font-semibold text-sky-600 rounded-xl shadow-[5px_5px_10px_#bdc1c6,-5px_-5px_10px_#ffffff] hover:shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] active:shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff] disabled:text-slate-400 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] transition-shadow duration-200
                                   dark:bg-neumorphic-base-dark dark:text-sky-400 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark dark:disabled:text-slate-600 dark:disabled:shadow-neumorphic-inset-dark"
                        disabled={!formData.content.trim() || !formData.learningCompetencies.trim()}
                    >
                        Generate Learning Guide
                    </button>
                </div>
            </footer>
        </form>
    );
}