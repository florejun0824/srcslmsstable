// src/components/teacher/EditClassModal.jsx
import React, { useState, Fragment, useMemo, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useToast } from '../../contexts/ToastContext';

// --- VISUAL ASSETS ---
import { 
    IconSchool, 
    IconSection, 
    IconVideo, 
    IconChevronDown, 
    IconCheck, 
    IconBook, 
    IconChalkboard,
    IconX,
    IconSearch,
} from '@tabler/icons-react';

// --- MOONLIGHT OS: UNIQUE INTERFACE KIT ---

// Input: "Void Cutout" - Deep, inset, with a bioluminescent focus ring
const inputStyle = `
    w-full bg-[#050b14] border border-white/5 rounded-2xl
    px-5 py-4 pl-12 text-white placeholder-slate-600 
    shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]
    focus:outline-none focus:border-indigo-500/50 focus:bg-[#0a1120] 
    focus:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_20px_rgba(99,102,241,0.15)]
    transition-all duration-300 ease-out text-sm font-medium tracking-wide
`;

// Label: "Holographic Text" - Faint, uppercase, technical
const labelStyle = "block text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] mb-2 ml-4 drop-shadow-sm";

// Icon Wrapper: Glowing connector
const inputIconWrapper = "absolute left-4 top-[2.8rem] text-slate-600 transition-all duration-300 group-focus-within:text-indigo-400 group-focus-within:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]";

// Dropdown Base: Floating dark matter
const dropdownBase = `
    relative mt-0 rounded-2xl border border-white/5 bg-[#050b14] 
    cursor-pointer select-none transition-all duration-300
    shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]
    hover:border-white/10 hover:bg-[#0a1120] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]
`;

// Dropdown List: Glass panel
const dropdownList = `
    absolute top-full left-0 right-0 mt-2 
    bg-[#0a1120]/95 backdrop-blur-2xl border border-white/10 
    rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] 
    max-h-60 overflow-y-auto z-50 p-1.5 
    animate-in fade-in zoom-in-95 duration-200 origin-top
`;

// Button: "Photon Accelerator" - Unique glow and interaction
const primaryButtonStyles = `
    group relative w-full py-4 rounded-2xl overflow-hidden
    bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 background-animate
    text-white font-bold text-sm uppercase tracking-[0.15em]
    shadow-[0_0_30px_rgba(79,70,229,0.25)] 
    border border-white/10
    hover:shadow-[0_0_50px_rgba(124,58,237,0.5)] hover:border-white/20
    active:scale-[0.98] transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
`;

const EditClassModal = ({ isOpen, onClose, classData, onUpdate, courses = [] }) => {
    const { showToast } = useToast();
    
    // Form State
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [meetLink, setMeetLink] = useState('');
    
    // Search & UI State
    const [subjectSearch, setSubjectSearch] = useState('');
    const [isGradeOpen, setIsGradeOpen] = useState(false);
    const [isSubjectOpen, setIsSubjectOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    // Initialize
    useEffect(() => {
        if (isOpen && classData) {
            setClassName(classData.name || '');
            setSection(classData.section || '');
            setSubjectId(classData.subjectId || '');
            setGradeLevel(classData.gradeLevel || 'Grade 7');
            setMeetLink(classData.meetLink || '');
            setSubjectSearch('');
            setIsSubmitting(false);
        }
    }, [isOpen, classData]);

    // --- SORTING LOGIC: ALPHANUMERIC ---
    const sortedFilteredCourses = useMemo(() => {
        let result = courses;
        
        // 1. Filter
        if (subjectSearch.trim()) {
            const query = subjectSearch.toLowerCase();
            result = courses.filter(course => 
                course.title.toLowerCase().includes(query)
            );
        }

        // 2. Sort (Alphanumeric: "Math 1" -> "Math 2" -> "Math 10")
        return [...result].sort((a, b) => 
            a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [courses, subjectSearch]);

    // Reset search on close
    useEffect(() => {
        if (!isSubjectOpen) {
            setTimeout(() => setSubjectSearch(''), 300);
        }
    }, [isSubjectOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!className || !subjectId || !gradeLevel) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        let finalMeetLink = meetLink.trim();
        if (finalMeetLink && !finalMeetLink.startsWith("https://meet.google.com/")) {
            showToast("Please enter a valid Google Meet URL", "warning");
            return;
        }

        setIsSubmitting(true);

        try {
            const selectedCourse = courses.find(c => c.id === subjectId);
            await onUpdate(classData.id, {
                name: className,
                section: section || 'A',
                subjectId,
                subjectName: selectedCourse?.title || 'Unknown Subject',
                gradeLevel,
                meetLink: finalMeetLink,
            });
            showToast('Class updated successfully!', 'success');
            onClose();
        } catch (error) {
            console.error('Error updating class:', error);
            showToast(`Failed to update class: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !classData) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
                {/* Backdrop: Starry Void */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-[cubic-bezier(0.19,1,0.22,1)] duration-500"
                            enterFrom="opacity-0 scale-95 translate-y-10"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-10"
                        >
                            {/* Main Panel: Obsidian Monolith */}
                            <Dialog.Panel className="w-full max-w-md md:max-w-2xl transform overflow-visible rounded-[32px] bg-[#0c1221] p-8 md:p-10 text-left align-middle shadow-2xl transition-all border border-white/5 relative ring-1 ring-white/5">
                                
                                {/* Ambient Light Effects */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <Dialog.Title as="h3" className="text-2xl font-medium text-white tracking-tight leading-none mb-1">
                                                Edit Class Details
                                            </Dialog.Title>
                                            <p className="text-xs text-slate-500 font-medium tracking-wide">
                                                ID: <span className="font-mono text-slate-400">{classData.id.slice(0,8)}...</span>
                                            </p>
                                        </div>
                                        <button 
                                            onClick={onClose}
                                            className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90"
                                        >
                                            <IconX size={20} strokeWidth={2} />
                                        </button>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        
                                        {/* Class Name */}
                                        <div className="relative group">
                                            <label htmlFor="className" className={labelStyle}>Class Name</label>
                                            <IconChalkboard size={20} className={inputIconWrapper} />
                                            <input
                                                type="text"
                                                id="className"
                                                value={className}
                                                onChange={(e) => setClassName(e.target.value)}
                                                placeholder="e.g. Science 7 - Einstein"
                                                className={inputStyle}
                                                required 
                                            />
                                        </div>

                                        {/* Section */}
                                        <div className="relative group">
                                            <label htmlFor="section" className={labelStyle}>Section Name</label>
                                            <IconSection size={20} className={inputIconWrapper} />
                                            <input
                                                type="text"
                                                id="section"
                                                value={section}
                                                onChange={(e) => setSection(e.target.value)}
                                                placeholder="e.g. Einstein"
                                                className={inputStyle}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Grade Level */}
                                            <div className="relative group">
                                                <label className={labelStyle}>Grade Level</label>
                                                <IconSchool size={20} className={inputIconWrapper} />
                                                <div 
                                                    className={dropdownBase}
                                                    onClick={() => { setIsGradeOpen(!isGradeOpen); setIsSubjectOpen(false); }}
                                                >
                                                    <div className="flex items-center justify-between p-4 pl-12 h-[54px]">
                                                        <span className="text-slate-200 font-bold text-sm tracking-wide">{gradeLevel}</span>
                                                        <IconChevronDown size={18} className={`text-slate-600 transition-transform duration-300 ${isGradeOpen ? 'rotate-180 text-white' : ''}`} />
                                                    </div>
                                                    
                                                    {isGradeOpen && (
                                                        <div className={dropdownList}>
                                                            {gradeLevels.map((grade) => (
                                                                <div 
                                                                    key={grade} 
                                                                    className="p-3 rounded-xl hover:bg-white/5 hover:text-white cursor-pointer text-sm font-medium text-slate-400 flex items-center justify-between transition-all"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setGradeLevel(grade);
                                                                        setIsGradeOpen(false);
                                                                    }}
                                                                >
                                                                    {grade}
                                                                    {gradeLevel === grade && <IconCheck size={16} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Subject */}
                                            <div className="relative group">
                                                <label className={labelStyle}>Subject</label>
                                                <IconBook size={20} className={inputIconWrapper} />
                                                <div 
                                                    className={dropdownBase}
                                                    onClick={() => { setIsSubjectOpen(!isSubjectOpen); setIsGradeOpen(false); }}
                                                >
                                                    <div className="flex items-center justify-between p-4 pl-12 h-[54px]">
                                                        <span className={`font-bold text-sm tracking-wide ${subjectId ? 'text-slate-200' : 'text-slate-500'} truncate`}>
                                                            {subjectId ? courses.find(c => c.id === subjectId)?.title : 'Select Subject'}
                                                        </span>
                                                        <IconChevronDown size={18} className={`text-slate-600 transition-transform duration-300 ${isSubjectOpen ? 'rotate-180 text-white' : ''}`} />
                                                    </div>
                                                    
                                                    {isSubjectOpen && (
                                                        <div className={dropdownList}>
                                                            {/* Search Bar */}
                                                            <div 
                                                                className="sticky top-0 z-10 px-1 pb-2 bg-[#0a1120] border-b border-white/5 mb-1"
                                                                onClick={(e) => e.stopPropagation()} 
                                                            >
                                                                <div className="relative">
                                                                    <IconSearch size={14} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
                                                                    <input 
                                                                        type="text"
                                                                        autoFocus
                                                                        placeholder="Filter subjects..."
                                                                        value={subjectSearch}
                                                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/30 focus:bg-white/10 transition-colors placeholder-slate-600"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* List */}
                                                            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                                {sortedFilteredCourses.length > 0 ? (
                                                                    sortedFilteredCourses.map((course) => (
                                                                        <div 
                                                                            key={course.id} 
                                                                            className="p-3 rounded-xl hover:bg-white/5 hover:text-white cursor-pointer text-sm font-medium text-slate-400 flex items-center justify-between transition-all group/item"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSubjectId(course.id);
                                                                                setIsSubjectOpen(false);
                                                                            }}
                                                                        >
                                                                            <span className="truncate pr-2">{course.title}</span>
                                                                            {subjectId === course.id && <IconCheck size={16} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)] flex-shrink-0" />}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-4 text-center">
                                                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No matches</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meet Link */}
                                        <div className="relative group">
                                            <label htmlFor="meetLink" className={labelStyle}>Google Meet Link</label>
                                            <IconVideo size={20} className={inputIconWrapper} />
                                            <input
                                                type="url"
                                                id="meetLink"
                                                value={meetLink}
                                                onChange={(e) => setMeetLink(e.target.value)}
                                                placeholder="https://meet.google.com/..."
                                                className={inputStyle}
                                            />
                                        </div>

                                        <div className="pt-6">
                                            <button type="submit" disabled={isSubmitting} className={primaryButtonStyles}>
                                                <div className="relative z-10 flex items-center justify-center gap-3">
                                                    {isSubmitting ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            <span>Syncing Data...</span>
                                                        </>
                                                    ) : (
                                                        <span>Save Configuration</span>
                                                    )}
                                                </div>
                                                
                                                {/* Photon Beam Animation */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                                                
                                                {/* Bottom Glow */}
                                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20" />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default EditClassModal;