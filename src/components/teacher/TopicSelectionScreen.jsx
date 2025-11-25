import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Dialog } from '@headlessui/react';
import { AcademicCapIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';

// --- REUSABLE STYLES ---
const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF] transition-all";
const labelClass = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1";
const sectionTitleClass = "text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2 mb-4 flex items-center gap-2 sticky top-0 bg-white dark:bg-[#1C1C1E] z-10 pt-2";

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
        <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] rounded-[2rem] overflow-hidden">
            
            {/* --- HEADER --- */}
            <header className="flex-shrink-0 px-8 py-6 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-[#007AFF]">
                        <AcademicCapIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <Dialog.Title as="h2" className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Learning Guide Generator
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                            Design new content for <span className="text-gray-800 dark:text-gray-200">{unit?.title || 'this unit'}</span>
                        </p>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT (Fixed Height, No Scroll on Parent) --- */}
            <main className="flex-1 overflow-hidden p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    
                    {/* LEFT COLUMN: INPUTS (Scrollable Pane) */}
                    <div className="lg:col-span-7 h-full overflow-hidden">
                        <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-8">
                            
                            {/* Core Content Section */}
                            <section>
                                <h3 className={sectionTitleClass}>1. Core Content</h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className={labelClass}>Main Content / Topic <span className="text-red-500">*</span></label>
                                        <textarea 
                                            placeholder="e.g., The Photosynthesis Process" 
                                            name="content" 
                                            value={formData.content} 
                                            onChange={handleChange} 
                                            className={`${inputClass} min-h-[80px] resize-none`} 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Learning Competencies <span className="text-red-500">*</span></label>
                                        <textarea 
                                            placeholder="e.g., Describe the process of photosynthesis..." 
                                            name="learningCompetencies" 
                                            value={formData.learningCompetencies} 
                                            onChange={handleChange} 
                                            className={`${inputClass} min-h-[100px] resize-none`} 
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className={labelClass}>Content Standard</label>
                                            <textarea name="contentStandard" value={formData.contentStandard} onChange={handleChange} className={`${inputClass} min-h-[60px]`} rows={2} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Performance Standard</label>
                                            <textarea name="performanceStandard" value={formData.performanceStandard} onChange={handleChange} className={`${inputClass} min-h-[60px]`} rows={2} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Settings Section */}
                            <section>
                                <h3 className={sectionTitleClass}>2. Settings</h3>
                                <div className="grid grid-cols-3 gap-5">
                                    <div>
                                        <label className={labelClass}>Language</label>
                                        <div className="relative">
                                            <select name="language" value={formData.language} onChange={handleChange} className={`${inputClass} appearance-none`}>
                                                <option>English</option><option>Filipino</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Grade Level</label>
                                        <div className="relative">
                                            <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className={`${inputClass} appearance-none`}>
                                                {[7, 8, 9, 10, 11, 12].map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Lesson Count</label>
                                        <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className={inputClass} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SCAFFOLDING (Scrollable Pane) */}
                    <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
                        <h3 className={sectionTitleClass}>
                            3. Scaffolding 
                            <span className="ml-auto text-xs font-normal text-gray-500 normal-case bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">Optional</span>
                        </h3>
                        
                        <div className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col min-h-0">
                            <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-100/50 dark:bg-white/5 flex-shrink-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Select existing lessons for the AI to build upon. This prevents repetition and creates a cohesive unit flow.
                                </p>
                            </div>
                            
                            {/* SCROLLABLE LIST AREA */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
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
                                            <div key={unitItem.id} className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1C1C1E] mb-2 last:mb-0">
                                                {/* Unit Header */}
                                                <div className="flex items-center p-3 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                                    <button type="button" onClick={() => handleToggleUnitExpansion(unitItem.id)} className="p-1 mr-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                                                        <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </button>
                                                    
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            ref={el => { if(el) el.indeterminate = isPartiallySelected; }}
                                                            onChange={() => handleUnitCheckboxChange(lessonsInUnit)}
                                                            className="h-4 w-4 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF] dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                                                        />
                                                    </div>
                                                    
                                                    <span 
                                                        onClick={() => handleToggleUnitExpansion(unitItem.id)} 
                                                        className="ml-3 text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer select-none flex-1"
                                                    >
                                                        {unitItem.title}
                                                    </span>
                                                    
                                                    {selectedCount > 0 && (
                                                        <span className="text-xs font-bold text-[#007AFF] bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                                            {selectedCount}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Lesson List */}
                                                {isExpanded && (
                                                    <div className="border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] py-1">
                                                        {lessonsInUnit.map(lesson => {
                                                            const isSelected = scaffoldLessonIds.has(lesson.id);
                                                            return (
                                                                <div 
                                                                    key={lesson.id} 
                                                                    onClick={() => {
                                                                        const newSet = new Set(scaffoldLessonIds);
                                                                        if (newSet.has(lesson.id)) newSet.delete(lesson.id);
                                                                        else newSet.add(lesson.id);
                                                                        setScaffoldLessonIds(newSet);
                                                                    }}
                                                                    className={`flex items-center py-2 px-3 ml-8 mr-2 my-1 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => {}} // Handled by parent div
                                                                        className="h-4 w-4 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF] dark:border-gray-600 dark:bg-gray-700 pointer-events-none"
                                                                    />
                                                                    <span className={`ml-3 text-sm ${isSelected ? 'text-[#007AFF] font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                        {lesson.title}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <span className="text-xs">Loading content...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- FOOTER --- */}
            <footer className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] z-20">
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        disabled={!formData.content.trim() || !formData.learningCompetencies.trim()}
                        className="px-8 py-3.5 bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center gap-2 transform active:scale-95"
                    >
                        {/* Sparkles Icon inline for better tree shaking compatibility */}
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                        </svg>
                        Generate Learning Guide
                    </button>
                </div>
            </footer>
        </form>
    );
}