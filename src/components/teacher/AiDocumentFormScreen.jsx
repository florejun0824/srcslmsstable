import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { getAllSubjects } from '../../services/firestoreService';
import { Dialog } from '@headlessui/react';
import { ArrowUturnLeftIcon, DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, SparklesIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const initialFormData = {
    file: null,
    language: 'English',
    gradeLevel: 'Grade 9',
    learningCompetencies: '',
    contentStandard: '',
    performanceStandard: '',
    selectedSubject: null,
    scaffoldLessonIds: new Set(),
};

export default function AiDocumentFormScreen({ unitId, subjectId, initialData, onSubmit, onBackToSelect }) {
    const { showToast } = useToast();
    
    // Use initialData if available (for "Back to Edit"), else use default
    const [formData, setFormData] = useState(initialData || initialFormData);
    const [error, setError] = useState('');
    
    const [subjectContext, setSubjectContext] = useState(null);
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());
    const [existingLessonCount, setExistingLessonCount] = useState(0);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const subs = await getAllSubjects();
                setSubjects(subs);
            } catch (error) {
                showToast('Could not fetch subjects.', 'error');
            }
        };
        fetchSubjects();
    }, [showToast]);

    useEffect(() => {
        if (subjectId) {
            const fetchFullSubjectContext = async () => {
                try {
                    const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    const unitsData = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    setSubjectContext({ units: unitsData, lessons: lessonsData });
                } catch (error) {
                    console.error("Error fetching subject context:", error);
                    setError("Could not scan existing subject content.");
                }
            };
            fetchFullSubjectContext();
        }
    }, [subjectId]);

    useEffect(() => {
        if (unitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [unitId]);

    const scaffoldInfo = useMemo(() => {
        if (formData.scaffoldLessonIds.size === 0 || !subjectContext) return { summary: '' };
        const relevantScaffoldLessons = subjectContext.lessons.filter(lesson => formData.scaffoldLessonIds.has(lesson.id));
        
        const summary = relevantScaffoldLessons.map(lesson => {
            const objectivesSummary = (lesson.objectives && lesson.objectives.length > 0)
                ? `\n  - Objectives: ${lesson.objectives.join('; ')}`
                : '';
            return `- Lesson Title: "${lesson.title}"${objectivesSummary}`;
        }).join('\n');
        
        return { summary };
    }, [formData.scaffoldLessonIds, subjectContext]);


    const handleToggleUnitExpansion = (unitId) => {
        const newSet = new Set(expandedScaffoldUnits);
        if (newSet.has(unitId)) newSet.delete(unitId);
        else newSet.add(unitId);
        setExpandedScaffoldUnits(newSet);
    };

    const handleUnitCheckboxChange = (lessonsInUnit) => {
        const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
        const currentlySelectedInUnit = lessonIdsInUnit.filter(id => formData.scaffoldLessonIds.has(id));
        const newSet = new Set(formData.scaffoldLessonIds);
        if (currentlySelectedInUnit.length === lessonIdsInUnit.length) {
            lessonIdsInUnit.forEach(id => newSet.delete(id));
        } else {
            lessonIdsInUnit.forEach(id => newSet.add(id));
        }
        setFormData(prev => ({ ...prev, scaffoldLessonIds: newSet }));
    };
    
    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFormData(prev => ({ ...prev, file: e.target.files[0] }));
            setError('');
        }
    };

    const removeFile = () => {
        setFormData(prev => ({ ...prev, file: null }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.file) {
            setError('Please upload a file first.');
            showToast('Please upload a file first.', 'warning');
            return;
        }
        if (!formData.selectedSubject) {
            setError('Please select a subject.');
            showToast('Please select a subject.', 'warning');
            return;
        }
        
        // Pass all data up to the parent
        const subjectName = subjects.find(s => s.id === formData.selectedSubject)?.title || 'this subject';
        
        onSubmit({
            ...formData,
            scaffoldInfo,
            existingLessonCount,
            subjectName,
            // Pass the plain set data for serialization if needed, though the Set object is fine
            scaffoldLessonIds: formData.scaffoldLessonIds, 
        });
    };

    const gradeLevels = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
    const formInputStyle = "block w-full rounded-lg border-transparent bg-neumorphic-base shadow-neumorphic-inset focus:border-sky-500 focus:ring-sky-500 text-sm";

    return (
        <form className="flex flex-col h-full" onSubmit={handleSubmit}>
            <header className="flex-shrink-0 pb-4 border-b border-neumorphic-shadow-dark/20">
                <div className="flex justify-between items-center mb-2">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800">Generate with AI</Dialog.Title>
                    <button type="button" onClick={onBackToSelect} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 rounded-lg hover:shadow-neumorphic-inset">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        Back
                    </button>
                </div>
                 <p className="text-slate-500">
                    Upload a document and AI will structure it into a full unit.
                </p>
            </header>

            <main className="flex-grow pt-4 overflow-hidden flex flex-col md:flex-row gap-6">
                {/* Left Column: File + Scaffolding */}
                <div className="w-full md:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                    {!formData.file ? (
                        <label htmlFor="file-upload" className="relative block w-full rounded-2xl p-8 text-center cursor-pointer transition-shadow duration-300 bg-neumorphic-base shadow-neumorphic-inset hover:shadow-neumorphic h-48 flex flex-col items-center justify-center">
                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <span className="mt-4 block text-sm font-semibold text-slate-700">
                                Click to upload or drag & drop
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                                PDF, DOCX, or TXT
                            </span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <div className="relative w-full rounded-2xl p-4 shadow-neumorphic flex items-center h-48">
                            <DocumentTextIcon className="h-12 w-12 text-sky-600 flex-shrink-0" />
                            <div className="ml-4 overflow-hidden">
                                <p className="truncate font-semibold text-slate-800">{formData.file.name}</p>
                                <p className="text-sm text-slate-500">{Math.round(formData.file.size / 1024)} KB</p>
                            </div>
                            <button type="button" onClick={removeFile} className="absolute top-3 right-3 p-1.5 rounded-full hover:shadow-neumorphic-inset transition-colors">
                                <XMarkIcon className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <h3 className="text-base font-semibold text-slate-700">Scaffolding (Optional)</h3>
                        <div className="bg-neumorphic-base p-3 rounded-xl max-h-[24rem] overflow-y-auto shadow-neumorphic-inset">
                            <p className="text-xs text-slate-500 mb-3">Explicitly select lessons for the AI to build upon.</p>
                            {subjectContext && subjectContext.units.length > 0 ? (
                                subjectContext.units
                                    .slice()
                                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
                                    .map(unit => {
                                    const lessonsInUnit = subjectContext.lessons.filter(lesson => lesson.unitId === unit.id);
                                    if (lessonsInUnit.length === 0) return null;
                                    const selectedCount = lessonsInUnit.filter(l => formData.scaffoldLessonIds.has(l.id)).length;
                                    const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                    const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                    const isExpanded = expandedScaffoldUnits.has(unit.id);
                                    return (
                                        <div key={unit.id} className="pt-2 first:pt-0">
                                            <div className="flex items-center p-2 rounded-md">
                                                <button type="button" onClick={() => handleToggleUnitExpansion(unit.id)} className="p-1"><ChevronRightIcon className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button>
                                                <input type="checkbox" id={`scaffold-unit-${unit.id}`} checked={isAllSelected} ref={el => { if(el) el.indeterminate = isPartiallySelected; }} onChange={() => handleUnitCheckboxChange(lessonsInUnit)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 ml-2" />
                                                <label htmlFor={`scaffold-unit-${unit.id}`} className="ml-2 flex-1 text-sm font-semibold text-slate-700 cursor-pointer">{unit.title}</label>
                                            </div>
                                            {isExpanded && (
                                                <div className="pl-6 pt-2 space-y-2">
                                                    {lessonsInUnit.map(lesson => (
                                                        <div key={lesson.id} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={`scaffold-lesson-${lesson.id}`}
                                                                checked={formData.scaffoldLessonIds.has(lesson.id)}
                                                                onChange={() => {
                                                                    const newSet = new Set(formData.scaffoldLessonIds);
                                                                    if (newSet.has(lesson.id)) newSet.delete(lesson.id);
                                                                    else newSet.add(lesson.id);
                                                                    setFormData(prev => ({ ...prev, scaffoldLessonIds: newSet }));
                                                                }}
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-slate-800">
                                                                {lesson.title}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (<p className="text-sm text-slate-400">Scanning subject content...</p>)}
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings */}
                <div className="w-full md:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="language" className="block text-sm font-semibold text-slate-700 mb-1">Language</label>
                            <select id="language" name="language" value={formData.language} onChange={handleChange} className={formInputStyle}>
                                <option>English</option>
                                <option>Filipino</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="gradeLevel" className="block text-sm font-semibold text-slate-700 mb-1">Grade Level</label>
                            <select id="gradeLevel" name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className={formInputStyle}>
                                {gradeLevels.map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="selectedSubject" className="block text-sm font-semibold text-slate-700 mb-1">Subject*</label>
                        <select id="selectedSubject" name="selectedSubject" value={formData.selectedSubject || ''} onChange={handleChange} className={formInputStyle} required>
                            <option value="" disabled>Select a subject</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>{subject.title}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label htmlFor="learningCompetencies" className="block text-sm font-semibold text-slate-700 mb-1">Learning Competencies (Master List)</label>
                        <textarea
                            id="learningCompetencies"
                            name="learningCompetencies"
                            value={formData.learningCompetencies}
                            onChange={handleChange}
                            className={formInputStyle}
                            rows={4}
                            placeholder="e.g., Describe the process of photosynthesis..."
                        />
                    </div>

                    <div>
                        <label htmlFor="contentStandard" className="block text-sm font-semibold text-slate-700 mb-1">Content Standard (Optional)</label>
                        <textarea
                            id="contentStandard"
                            name="contentStandard"
                            value={formData.contentStandard}
                            onChange={handleChange}
                            className={formInputStyle}
                            rows={3}
                            placeholder="e.g., The learners demonstrate an understanding of..."
                        />
                    </div>

                    <div>
                        <label htmlFor="performanceStandard" className="block text-sm font-semibold text-slate-700 mb-1">Performance Standard (Optional)</label>
                        <textarea
                            id="performanceStandard"
                            name="performanceStandard"
                            value={formData.performanceStandard}
                            onChange={handleChange}
                            className={formInputStyle}
                            rows={3}
                            placeholder="e.g., The learners shall be able to..."
                        />
                    </div>
                </div>
            </main>

            <footer className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-neumorphic-shadow-dark/20">
                {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                <button type="submit" disabled={!formData.file || !formData.selectedSubject} className="w-full md:w-auto flex items-center justify-center font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl py-3 px-6 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-60">
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Generate Lessons
                </button>
            </footer>
        </form>
    );
}