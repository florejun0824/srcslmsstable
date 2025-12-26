// src/components/teacher/CreateClassModal.jsx
import React, { useState, Fragment, useMemo } from 'react'; // ✅ Added useMemo
import { Dialog, Transition } from '@headlessui/react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth, DEFAULT_SCHOOL_ID } from '../../contexts/AuthContext';
import { db } from '../../services/firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- VISUAL ASSETS ---
import { 
    IconSchool, 
    IconSection, 
    IconVideo, 
    IconChevronDown, 
    IconCheck, 
    IconBook, 
    IconChalkboard,
    IconX 
} from '@tabler/icons-react';

// --- DESIGN SYSTEM CONSTANTS ---
const glassInput = "w-full bg-slate-50/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-4 pl-12 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-base";
const labelStyle = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1";
const inputIconWrapper = "absolute left-4 top-[3.2rem] text-slate-400 dark:text-slate-500 pointer-events-none";

const dropdownBase = "relative mt-0 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 cursor-pointer select-none transition-all hover:bg-slate-100/50 dark:hover:bg-white/5";
const dropdownHeader = "flex items-center justify-between p-4";
const dropdownList = "absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 p-1";
const dropdownItem = "p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors";

const primaryButtonStyles = "w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed";

const CreateClassModal = ({ isOpen, onClose, teacherId, courses = [] }) => {
    const { showToast } = useToast();
    const { userProfile } = useAuth();

    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 7');
    const [meetLink, setMeetLink] = useState('');
    
    // UI States
    const [isGradeOpen, setIsGradeOpen] = useState(false);
    const [isSubjectOpen, setIsSubjectOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    // ✅ SORT COURSES ALPHABETICALLY
    const sortedCourses = useMemo(() => {
        return [...courses].sort((a, b) => 
            a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [courses]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!className || !subjectId || !gradeLevel) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const selectedCourse = courses.find(c => c.id === subjectId);
            const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            const newClass = {
                name: className,
                section: section || 'A',
                subjectId,
                subjectName: selectedCourse?.title || 'Unknown Subject',
                gradeLevel,
                classCode,
                teacherId,
                schoolId: userProfile?.schoolId || DEFAULT_SCHOOL_ID, 
                meetLink: meetLink || '',
                students: [],
                studentIds: [],
                createdAt: serverTimestamp(),
                contentLastUpdatedAt: serverTimestamp(),
                isArchived: false,
                theme: 'blue'
            };

            await addDoc(collection(db, 'classes'), newClass);
            
            showToast('Class created successfully!', 'success');
            onClose();
            
            setClassName('');
            setSection('');
            setSubjectId('');
            setGradeLevel('Grade 7');
            setMeetLink('');

        } catch (error) {
            console.error('Error creating class:', error);
            showToast('Failed to create class. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            {/* Custom Width: md:max-w-2xl */}
                            <Dialog.Panel className="w-full max-w-md md:max-w-2xl transform overflow-hidden rounded-[2rem] bg-white dark:bg-[#1c1c1e] p-8 text-left align-middle shadow-2xl transition-all border border-white/20 dark:border-white/10 ring-1 ring-black/5">
                                
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <Dialog.Title as="h3" className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                                        Create New Class
                                    </Dialog.Title>
                                    <button 
                                        onClick={onClose}
                                        className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <IconX size={20} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    
                                    {/* 1. Class Name Input */}
                                    <div className="relative">
                                        <label htmlFor="className" className={labelStyle}>
                                            Class Name <span className="text-red-500">*</span>
                                        </label>
                                        <IconChalkboard size={20} className={inputIconWrapper} />
                                        <input
                                            type="text"
                                            id="className"
                                            value={className}
                                            onChange={(e) => setClassName(e.target.value)}
                                            placeholder="e.g. Science 7 - Einstein"
                                            className={glassInput}
                                            required 
                                            autoFocus
                                        />
                                    </div>

                                    {/* 2. Section Input */}
                                    <div className="relative">
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
                                            className={glassInput}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* 3. Grade Level Dropdown */}
                                        <div className="relative">
                                            <label className={labelStyle}>Grade Level <span className="text-red-500">*</span></label>
                                            <div 
                                                className={dropdownBase}
                                                onClick={() => setIsGradeOpen(!isGradeOpen)}
                                            >
                                                <div className={dropdownHeader}>
                                                    <div className="flex items-center gap-3">
                                                        <IconSchool size={20} className="text-slate-400" />
                                                        <span className="text-slate-700 dark:text-slate-200 font-medium">{gradeLevel}</span>
                                                    </div>
                                                    <IconChevronDown size={18} className={`text-slate-400 transition-transform ${isGradeOpen ? 'rotate-180' : ''}`} />
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
                                                                {gradeLevel === grade && <IconCheck size={16} className="text-blue-500" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 4. Subject Selection Dropdown */}
                                        <div className="relative">
                                            <label className={labelStyle}>Subject <span className="text-red-500">*</span></label>
                                            <div 
                                                className={dropdownBase}
                                                onClick={() => setIsSubjectOpen(!isSubjectOpen)}
                                            >
                                                <div className={dropdownHeader}>
                                                    <div className="flex items-center gap-3">
                                                        <IconBook size={20} className="text-slate-400" />
                                                        <span className={`font-medium ${subjectId ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'} truncate`}>
                                                            {subjectId ? courses.find(c => c.id === subjectId)?.title : 'Select Subject'}
                                                        </span>
                                                    </div>
                                                    <IconChevronDown size={18} className={`text-slate-400 transition-transform ${isSubjectOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                                
                                                {isSubjectOpen && (
                                                    <div className={dropdownList}>
                                                        {sortedCourses.length > 0 ? (
                                                            sortedCourses.map((course) => (
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
                                                                    {subjectId === course.id && <IconCheck size={16} className="text-blue-500 flex-shrink-0" />}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-4 text-center text-xs text-slate-400">
                                                                No subjects available.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. Google Meet Link */}
                                    <div className="relative">
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
                                            className={glassInput}
                                        />
                                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2 ml-1">
                                            Paste the persistent link for your recurring class sessions.
                                        </p>
                                    </div>

                                    <div className="pt-8">
                                        <button type="submit" disabled={isSubmitting} className={primaryButtonStyles}>
                                            {isSubmitting ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Creating...</span>
                                                </div>
                                            ) : 'Create Class'}
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

export default CreateClassModal;