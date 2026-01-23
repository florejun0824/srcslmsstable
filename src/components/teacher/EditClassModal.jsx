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
    IconPencil
} from '@tabler/icons-react';

// --- PREMIUM ONE UI 8.5 STYLES (Matching CreateClassModal) ---

// Inputs: Solid, deep, slightly inset feel
const inputStyle = "w-full bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-white/5 rounded-[1.25rem] px-5 py-4 pl-12 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base font-medium shadow-inner dark:shadow-none";

// Labels: Small, caps, high legibility
const labelStyle = "block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 ml-2";

// Icons: Positioned perfectly inside the input
const inputIconWrapper = "absolute left-4 top-[2.85rem] text-slate-400 dark:text-slate-500 pointer-events-none";

// Dropdowns: Floating surfaces
const dropdownBase = "relative mt-0 rounded-[1.25rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#09090b] cursor-pointer select-none transition-all hover:bg-slate-100 dark:hover:bg-white/5 hover:border-blue-300 dark:hover:border-blue-500/30";
const dropdownHeader = "flex items-center justify-between p-4 pl-12 h-[58px]"; 
const dropdownList = "absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border border-slate-100 dark:border-white/10 rounded-[1.5rem] shadow-2xl max-h-60 overflow-y-auto z-50 p-2 animate-in fade-in zoom-in-95 duration-200 origin-top overflow-hidden";
const dropdownItem = "p-3 rounded-[1rem] hover:bg-blue-50 dark:hover:bg-blue-600/20 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between transition-all";

// Button: Vibrant gradient, pill shape
const primaryButtonStyles = "w-full py-4 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed";

const EditClassModal = ({ isOpen, onClose, classData, onUpdate, courses = [] }) => {
    const { showToast } = useToast();
    
    // Form State
    const [className, setClassName] = useState('');
    const [section, setSection] = useState(''); // Added Section State
    const [subjectId, setSubjectId] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [meetLink, setMeetLink] = useState('');
    
    // Search & UI State
    const [subjectSearch, setSubjectSearch] = useState('');
    const [isGradeOpen, setIsGradeOpen] = useState(false);
    const [isSubjectOpen, setIsSubjectOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen && classData) {
            setClassName(classData.name || '');
            setSection(classData.section || ''); // Initialize Section
            setSubjectId(classData.subjectId || '');
            setGradeLevel(classData.gradeLevel || 'Grade 7');
            setMeetLink(classData.meetLink || '');
            setSubjectSearch('');
            setIsSubmitting(false);
        }
    }, [isOpen, classData]);

    // Filter courses based on search
    const filteredCourses = useMemo(() => {
        if (!subjectSearch.trim()) return courses;
        return courses.filter(course => 
            course.title.toLowerCase().includes(subjectSearch.toLowerCase())
        );
    }, [courses, subjectSearch]);

    // Clear search when dropdown closes
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
            showToast("Please enter a valid Google Meet URL (https://meet.google.com/...)", "warning");
            return;
        }

        setIsSubmitting(true);

        try {
            const selectedCourse = courses.find(c => c.id === subjectId);
            
            await onUpdate(classData.id, {
                name: className,
                section: section || 'A', // Update Section
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
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-200/40 dark:bg-black/60 backdrop-blur-md transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-[cubic-bezier(0.19,1,0.22,1)] duration-500"
                            enterFrom="opacity-0 scale-90 translate-y-12"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-90 translate-y-12"
                        >
                            <Dialog.Panel className="w-full max-w-md md:max-w-2xl transform overflow-visible rounded-[2.5rem] bg-white dark:bg-[#151518] p-8 md:p-10 text-left align-middle shadow-2xl shadow-slate-300/50 dark:shadow-black/50 transition-all border border-white/50 dark:border-white/5 ring-1 ring-black/5">
                                
                                {/* Header */}
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <Dialog.Title as="h3" className="text-3xl font-[850] text-slate-900 dark:text-white tracking-tight leading-none">
                                            Edit Class
                                        </Dialog.Title>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            Update details for <span className="text-slate-800 dark:text-white font-bold">{classData.name}</span>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={onClose}
                                        className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-90"
                                    >
                                        <IconX size={22} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    
                                    {/* 1. Class Name Input */}
                                    <div className="relative group">
                                        <label htmlFor="className" className={labelStyle}>
                                            Class Name <span className="text-blue-500">*</span>
                                        </label>
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

                                    {/* 2. Section Input (ADDED) */}
                                    <div className="relative group">
                                        <label htmlFor="section" className={labelStyle}>
                                            Section
                                        </label>
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* 3. Grade Level Dropdown */}
                                        <div className="relative">
                                            <label className={labelStyle}>Grade Level <span className="text-blue-500">*</span></label>
                                            <IconSchool size={20} className={inputIconWrapper} />
                                            <div 
                                                className={dropdownBase}
                                                onClick={() => { setIsGradeOpen(!isGradeOpen); setIsSubjectOpen(false); }}
                                            >
                                                <div className={dropdownHeader}>
                                                    <span className="text-slate-700 dark:text-slate-200 font-bold">{gradeLevel}</span>
                                                    <IconChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isGradeOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                                
                                                {isGradeOpen && (
                                                    <div className={dropdownList}>
                                                        {gradeLevels.map((grade) => (
                                                            <div 
                                                                key={grade} 
                                                                className={dropdownItem}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setGradeLevel(grade);
                                                                    setIsGradeOpen(false);
                                                                }}
                                                            >
                                                                {grade}
                                                                {gradeLevel === grade && <IconCheck size={18} className="text-blue-500" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 4. Subject Selection Dropdown (WITH SEARCH) */}
                                        <div className="relative">
                                            <label className={labelStyle}>Subject <span className="text-blue-500">*</span></label>
                                            <IconBook size={20} className={inputIconWrapper} />
                                            <div 
                                                className={dropdownBase}
                                                onClick={() => { setIsSubjectOpen(!isSubjectOpen); setIsGradeOpen(false); }}
                                            >
                                                <div className={dropdownHeader}>
                                                    <span className={`font-bold ${subjectId ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'} truncate`}>
                                                        {subjectId ? courses.find(c => c.id === subjectId)?.title : 'Select Subject'}
                                                    </span>
                                                    <IconChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isSubjectOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                                
                                                {isSubjectOpen && (
                                                    <div className={dropdownList}>
                                                        {/* --- SEARCH BAR (Sticky) --- */}
                                                        <div 
                                                            className="sticky top-0 z-10 px-1 pb-2 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 mb-1"
                                                            onClick={(e) => e.stopPropagation()} 
                                                        >
                                                            <div className="relative">
                                                                <IconSearch size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                                                                <input 
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder="Search subjects..."
                                                                    value={subjectSearch}
                                                                    onChange={(e) => setSubjectSearch(e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[0.8rem] py-2 pl-9 pr-3 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-400"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* --- FILTERED LIST --- */}
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {filteredCourses.length > 0 ? (
                                                                filteredCourses.map((course) => (
                                                                    <div 
                                                                        key={course.id} 
                                                                        className={dropdownItem}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSubjectId(course.id);
                                                                            setIsSubjectOpen(false);
                                                                        }}
                                                                    >
                                                                        <span className="truncate pr-2">{course.title}</span>
                                                                        {subjectId === course.id && <IconCheck size={18} className="text-blue-500 flex-shrink-0" />}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center">
                                                                    <p className="text-xs font-bold text-slate-400">No subjects found.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. Google Meet Link */}
                                    <div className="relative group">
                                        <label htmlFor="meetLink" className={labelStyle}>
                                            Google Meet Link
                                        </label>
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

                                    <div className="pt-8">
                                        <button type="submit" disabled={isSubmitting} className={primaryButtonStyles}>
                                            {isSubmitting ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Saving Changes...</span>
                                                </div>
                                            ) : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default EditClassModal;