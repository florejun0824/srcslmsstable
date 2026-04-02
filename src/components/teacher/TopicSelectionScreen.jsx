import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import { 
    AcademicCapIcon, 
    ChevronRightIcon, 
    CheckIcon, 
    SparklesIcon,
    ChevronUpDownIcon,
    GlobeAltIcon,
    StarIcon,
    ListBulletIcon,
    QueueListIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';

// --- PREMIUM CONFIG ---
const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];
const LANGUAGES = ['English', 'Filipino'];

const labelClass = "flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1";
const sectionTitleClass = "text-sm font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-3";

export default function TopicSelectionScreen({ subject, unit, initialData, onSubmit }) {
    const { showToast } = useToast();
    const [formData, setFormData] = useState(initialData);
    const [subjectName, setSubjectName] = useState('');
    const [subjectContext, setSubjectContext] = useState(null);
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());

    useEffect(() => {
        if (subject?.id) {
            const fetchContext = async () => {
                try {
                    setSubjectName(subject.title || 'this subject');
                    const [uSnap, lSnap] = await Promise.all([
                        getDocs(query(collection(db, 'units'), where('subjectId', '==', subject.id))),
                        getDocs(query(collection(db, 'lessons'), where('subjectId', '==', subject.id)))
                    ]);
                    setSubjectContext({ 
                        units: uSnap.docs.map(d => ({ id: d.id, ...d.data() })), 
                        lessons: lSnap.docs.map(d => ({ id: d.id, ...d.data() })) 
                    });
                } catch (e) { showToast("Library scan failed.", "error"); }
            };
            fetchContext();
        }
    }, [subject, showToast]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'lessonCount' ? Math.max(1, Number(value)) : value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.content.trim() || !formData.learningCompetencies.trim()) {
            showToast("Required fields missing.", "warning");
            return;
        }
        onSubmit({ ...formData, scaffoldedLessons: Array.from(scaffoldLessonIds), subjectName });
    };

    const handleUnitCheckboxChange = (lessonsInUnit) => {
        const ids = lessonsInUnit.map(l => l.id);
        const newSet = new Set(scaffoldLessonIds);
        const allInUnitSelected = ids.every(id => newSet.has(id));
        ids.forEach(id => allInUnitSelected ? newSet.delete(id) : newSet.add(id));
        setScaffoldLessonIds(newSet);
    };

    // --- SHARED UI COMPONENTS ---
    const CircularCheckbox = ({ checked, indeterminate, onChange }) => (
        <div className="relative flex items-center justify-center w-6 h-6">
            <input type="checkbox" className="peer absolute inset-0 z-10 cursor-pointer opacity-0" checked={checked} onChange={onChange} ref={el => { if(el) el.indeterminate = indeterminate; }} />
            <div className={`w-5 h-5 rounded-full border-[2px] transition-all duration-300 flex items-center justify-center ${checked || indeterminate ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                {checked && <CheckIconSolid className="w-3.5 h-3.5 text-white animate-in zoom-in duration-200" />}
                {indeterminate && !checked && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-[32px] md:rounded-[40px] overflow-hidden selection:bg-indigo-500/30">
            
            {/* --- HEADER --- */}
            <header className="flex-shrink-0 px-6 py-5 border-b border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <AcademicCapIcon className="h-7 w-7 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                        <Dialog.Title as="h2" className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 truncate">
                            Learning Guide
                        </Dialog.Title>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                            Module Creator • {unit?.title || 'Active Unit'}
                        </p>
                    </div>
                </div>
            </header>

            {/* --- SCROLLABLE BODY --- */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 md:space-y-12">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    
                    {/* LEFT: FORM INPUTS */}
                    <div className="lg:col-span-7 space-y-10">
                        
                        {/* 1. Core Objectives */}
                        <section>
                            <h3 className={sectionTitleClass}>
                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                Core Objectives
                            </h3>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}><ListBulletIcon className="w-3.5 h-3.5" /> Main Topic / Content</label>
                                    <textarea 
                                        name="content" value={formData.content} onChange={handleChange} required
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-[22px] text-[15px] font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner min-h-[100px] resize-none"
                                        placeholder="e.g., Photosynthesis and Cell Energy" 
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}><QueueListIcon className="w-3.5 h-3.5" /> Learning Competencies</label>
                                    <textarea 
                                        name="learningCompetencies" value={formData.learningCompetencies} onChange={handleChange} required
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-[22px] text-[15px] font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner min-h-[120px] resize-none"
                                        placeholder="State specific target competencies..." 
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 2. Parameters */}
                        <section>
                            <h3 className={sectionTitleClass}>
                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                Model Parameters
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {/* Language Segmented Control */}
                                <div className="col-span-2 sm:col-span-1">
                                    <label className={labelClass}><GlobeAltIcon className="w-3.5 h-3.5" /> Language</label>
                                    <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-[18px] shadow-inner relative h-[52px]">
                                        <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-[14px] shadow-sm transition-all duration-300" style={{ transform: formData.language === 'Filipino' ? 'translateX(100%)' : 'translateX(0)' }} />
                                        {LANGUAGES.map(l => (
                                            <button key={l} type="button" onClick={() => handleSelectChange('language', l)} className={`flex-1 relative z-10 text-xs font-black transition-colors ${formData.language === l ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>{l}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Grade Level Headless UI Dropdown */}
                                <div className="col-span-1">
                                    <label className={labelClass}><StarIcon className="w-3.5 h-3.5" /> Grade</label>
                                    <Listbox value={formData.gradeLevel} onChange={val => handleSelectChange('gradeLevel', val)}>
                                        <div className="relative">
                                            <Listbox.Button className="relative w-full h-[52px] pl-4 pr-10 text-left bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-[18px] text-sm font-black text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner">
                                                <span className="block truncate">Grade {formData.gradeLevel}</span>
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3"><ChevronUpDownIcon className="h-5 w-5 text-slate-400" /></span>
                                            </Listbox.Button>
                                            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-[20px] bg-white dark:bg-slate-800 py-2 text-base shadow-2xl z-50 border border-slate-100 dark:border-slate-700">
                                                    {GRADE_LEVELS.map(g => (
                                                        <Listbox.Option key={g} value={g} className={({ active }) => `relative cursor-pointer py-3.5 pl-10 pr-4 transition-colors ${active ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {({ selected }) => <><span className={`block truncate ${selected ? 'font-black' : 'font-bold'}`}>Grade {g}</span>{selected && <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600"><CheckIcon className="h-5 w-5 stroke-[3]" /></span>}</>}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Transition>
                                        </div>
                                    </Listbox>
                                </div>

                                {/* Lesson Count */}
                                <div className="col-span-1">
                                    <label className={labelClass}>Lessons</label>
                                    <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className="w-full h-[52px] px-4 bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-[18px] text-sm font-black text-slate-900 dark:text-white shadow-inner focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: SCAFFOLDING (WebView Safe) */}
                    <div className="lg:col-span-5 flex flex-col min-h-[400px]">
                        <h3 className={sectionTitleClass}>
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                            Scaffolding <span className="ml-auto text-[10px] bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">Optional</span>
                        </h3>
                        
                        <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-[28px] md:rounded-[32px] border border-slate-200/60 dark:border-white/5 flex flex-col overflow-hidden shadow-sm">
                            <div className="p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                <p className="text-[12px] font-bold text-slate-500 leading-relaxed">
                                    Select existing lessons to help the AI maintain context and prevent redundancy.
                                </p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {subjectContext ? (
                                    subjectContext.units.map(unitItem => {
                                        const lessonsInUnit = subjectContext.lessons.filter(l => l.unitId === unitItem.id);
                                        if (lessonsInUnit.length === 0) return null;
                                        
                                        const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                        const isExpanded = expandedScaffoldUnits.has(unitItem.id);

                                        return (
                                            <div key={unitItem.id} className="rounded-[20px] bg-slate-50 dark:bg-white/5 border border-transparent dark:border-white/5 overflow-hidden transition-all">
                                                <div className="flex items-center px-4 py-3.5 cursor-pointer active:bg-slate-100 dark:active:bg-white/10" onClick={() => {
                                                    const newSet = new Set(expandedScaffoldUnits);
                                                    isExpanded ? newSet.delete(unitItem.id) : newSet.add(unitItem.id);
                                                    setExpandedScaffoldUnits(newSet);
                                                }}>
                                                    <CircularCheckbox checked={selectedCount > 0 && selectedCount === lessonsInUnit.length} indeterminate={selectedCount > 0 && selectedCount < lessonsInUnit.length} onChange={() => handleUnitCheckboxChange(lessonsInUnit)} />
                                                    <div className="flex-1 ml-4 min-w-0 pr-2">
                                                        <h4 className="text-[13px] font-black text-slate-800 dark:text-slate-200 truncate">{unitItem.title}</h4>
                                                        {selectedCount > 0 && !isExpanded && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{selectedCount} Selected</span>}
                                                    </div>
                                                    <ChevronRightIcon className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={3} />
                                                </div>

                                                {isExpanded && (
                                                    <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                                        {lessonsInUnit.map(lesson => {
                                                            const isSelected = scaffoldLessonIds.has(lesson.id);
                                                            return (
                                                                <div key={lesson.id} onClick={() => {
                                                                    const newSet = new Set(scaffoldLessonIds);
                                                                    isSelected ? newSet.delete(lesson.id) : newSet.add(lesson.id);
                                                                    setScaffoldLessonIds(newSet);
                                                                }} className={`flex items-center py-2.5 px-3 rounded-[14px] cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/10' : 'bg-white dark:bg-slate-800/50'}`}>
                                                                    <CircularCheckbox checked={isSelected} onChange={() => {}} />
                                                                    <span className={`ml-3 text-[12px] font-bold truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>{lesson.title}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 opacity-40">
                                        <div className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Scanning Library...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- FOOTER --- */}
            <footer className="flex-shrink-0 px-6 py-5 border-t border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        disabled={!formData.content.trim() || !formData.learningCompetencies.trim()}
                        className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-[20px] shadow-xl shadow-indigo-500/20 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-3 active:scale-[0.96]"
                    >
                        <SparklesIcon className="w-5 h-5 stroke-[2.5]" />
                        Generate Module
                    </button>
                </div>
            </footer>
        </form>
    );
}