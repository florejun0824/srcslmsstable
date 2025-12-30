import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Dialog } from '@headlessui/react';
import { AcademicCapIcon, ChevronRightIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline'; // Added CheckIcon, SparklesIcon
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid'; // Solid icon for the checkmark
import { useToast } from '../../contexts/ToastContext';

// --- ONE UI 8.0 INSPIRED STYLES ---
// Inputs: Super rounded (rounded-2xl/3xl), softer background, clean focus states
const inputClass = "w-full px-5 py-3.5 bg-[#f2f2f7] dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-[#2c2c2e] border focus:border-[#007AFF] rounded-[1.5rem] text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#007AFF]/10 transition-all duration-300";
const labelClass = "block text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 ml-4";
const sectionTitleClass = "text-lg font-bold text-gray-900 dark:text-white pb-4 mb-2 flex items-center gap-2 sticky top-0 bg-white dark:bg-[#1C1C1E] z-10 pt-2";

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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.content.trim() || !formData.learningCompetencies.trim()) {
            showToast("Please provide the Main Content/Topic and Learning Competencies.", "warning");
            return;
        }
        onSubmit({ ...formData, scaffoldedLessons: [], subjectName }); // Note: Add logic to filter scaffoldedLessons if needed
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

    // --- CUSTOM ONE UI CIRCULAR CHECKBOX COMPONENT ---
    const CircularCheckbox = ({ checked, indeterminate, onChange }) => (
        <div className="relative flex items-center justify-center w-6 h-6">
            <input
                type="checkbox"
                className="peer appearance-none w-full h-full absolute inset-0 z-10 cursor-pointer opacity-0"
                checked={checked}
                onChange={onChange}
                ref={el => { if(el) el.indeterminate = indeterminate; }}
            />
            {/* Visual Circle */}
            <div className={`
                w-5 h-5 rounded-full border-[2px] transition-all duration-300 ease-out flex items-center justify-center
                ${checked || indeterminate 
                    ? 'bg-[#007AFF] border-[#007AFF] scale-110 shadow-sm shadow-blue-500/30' 
                    : 'bg-white dark:bg-transparent border-gray-300 dark:border-gray-500 hover:border-[#007AFF]'}
            `}>
                {checked && <CheckIconSolid className="w-3.5 h-3.5 text-white animate-in zoom-in duration-200" />}
                {indeterminate && !checked && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] overflow-hidden">
            
		{/* --- HEADER --- */}
		            <header className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] z-10">
		                <div className="flex items-center gap-3">
		                    <div className="w-11 h-11 rounded-[1rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center shadow-sm">
		                        <AcademicCapIcon className="h-6 w-6 text-[#007AFF]" strokeWidth={1.5} />
		                    </div>
		                    <div>
		                        <Dialog.Title as="h2" className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-1">
		                            Learning Guide
		                        </Dialog.Title>
		                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
		                            Create content for <span className="text-gray-900 dark:text-gray-200 font-semibold">{unit?.title || 'this unit'}</span>
		                        </p>
		                    </div>
		                </div>
		            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-hidden p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    
                    {/* LEFT COLUMN: INPUTS */}
                    <div className="lg:col-span-7 h-full overflow-hidden flex flex-col">
                        <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-10 pb-8">
                            
                            {/* Core Content Section */}
                            <section>
                                <h3 className={sectionTitleClass}>1. Core Content</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClass}>Main Content / Topic <span className="text-red-500">*</span></label>
                                        <textarea 
                                            placeholder="e.g., The Photosynthesis Process" 
                                            name="content" 
                                            value={formData.content} 
                                            onChange={handleChange} 
                                            className={`${inputClass} min-h-[100px] resize-none`} 
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
                                            className={`${inputClass} min-h-[120px] resize-none`} 
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Content Standard</label>
                                            <textarea name="contentStandard" value={formData.contentStandard} onChange={handleChange} className={`${inputClass} min-h-[80px]`} rows={2} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Performance Standard</label>
                                            <textarea name="performanceStandard" value={formData.performanceStandard} onChange={handleChange} className={`${inputClass} min-h-[80px]`} rows={2} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Settings Section */}
                            <section>
                                <h3 className={sectionTitleClass}>2. Settings</h3>
                                <div className="p-1"> {/* Padding for focus rings */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div>
                                            <label className={labelClass}>Language</label>
                                            <div className="relative group">
                                                <select name="language" value={formData.language} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10`}>
                                                    <option>English</option><option>Filipino</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Grade Level</label>
                                            <div className="relative group">
                                                <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10`}>
                                                    {[7, 8, 9, 10, 11, 12].map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Lessons</label>
                                            <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className={inputClass} />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SCAFFOLDING */}
                    <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
                        <h3 className={sectionTitleClass}>
                            3. Scaffolding 
                            <span className="ml-auto text-[11px] font-bold text-slate-500 tracking-wider bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full uppercase">Optional</span>
                        </h3>
                        
                        {/* One UI Card Container */}
                        <div className="flex-1 bg-[#F7F7F9] dark:bg-[#2C2C2E] rounded-[2rem] overflow-hidden flex flex-col min-h-0 border border-transparent dark:border-white/5">
                            
                            {/* Card Header */}
                            <div className="px-6 py-5 border-b border-gray-200/50 dark:border-white/5 flex-shrink-0">
                                <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Select existing lessons. The AI will analyze them to build connections and prevent repetition.
                                </p>
                            </div>
                            
                            {/* SCROLLABLE LIST */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
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
                                            <div key={unitItem.id} className="bg-white dark:bg-[#1C1C1E] rounded-[1.5rem] overflow-hidden shadow-sm shadow-black/5 transition-all duration-200">
                                                {/* Unit Row */}
                                                <div className="flex items-center px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                     onClick={() => handleToggleUnitExpansion(unitItem.id)}>
                                                    
                                                    {/* Custom Circular Checkbox */}
                                                    <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 pt-0.5">
                                                        <CircularCheckbox 
                                                            checked={isAllSelected}
                                                            indeterminate={isPartiallySelected}
                                                            onChange={() => handleUnitCheckboxChange(lessonsInUnit)}
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex-1 ml-4 min-w-0">
                                                        <h4 className="text-[14px] font-bold text-gray-800 dark:text-gray-200 truncate">
                                                            {unitItem.title}
                                                        </h4>
                                                        {selectedCount > 0 && !isExpanded && (
                                                            <p className="text-[11px] font-medium text-[#007AFF] mt-0.5">
                                                                {selectedCount} lessons selected
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-90 bg-gray-100 dark:bg-white/10' : ''}`}>
                                                        <ChevronRightIcon className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
                                                    </div>
                                                </div>

                                                {/* Expanded Lesson List */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-1 space-y-1">
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
                                                                    className={`group flex items-center py-2.5 px-3 rounded-[1rem] cursor-pointer transition-all duration-200 ${isSelected ? 'bg-blue-50/80 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                                >
                                                                    <CircularCheckbox checked={isSelected} onChange={() => {}} />
                                                                    
                                                                    <span className={`ml-3 text-[13px] font-medium truncate transition-colors ${isSelected ? 'text-[#007AFF]' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>
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
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 opacity-60">
                                        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-3"></div>
                                        <span className="text-xs font-medium uppercase tracking-wide">Loading Library...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

								{/* --- FOOTER --- */}
								            <footer className="flex-shrink-0 px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] z-30">
								                <div className="flex justify-end">
								                    <button 
								                        type="submit" 
								                        disabled={!formData.content.trim() || !formData.learningCompetencies.trim()}
								                        className="px-6 py-3 bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center gap-2 transform active:scale-[0.98] hover:-translate-y-0.5"
								                    >
								                        <SparklesIcon className="w-5 h-5 stroke-2" />
								                        Generate Learning Guide
								                    </button>
								                </div>
								            </footer>
        </form>
    );
}