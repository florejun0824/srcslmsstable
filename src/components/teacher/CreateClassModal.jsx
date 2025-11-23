import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase'; 
import { collection, addDoc } from 'firebase/firestore';
import Modal from '../common/Modal';

// --- VISUAL ASSETS ---
import { 
    IconSchool, 
    IconSection, 
    IconVideo, 
    IconChevronDown, 
    IconCheck, 
    IconBook, 
    IconChalkboard
} from '@tabler/icons-react';

// --- DESIGN SYSTEM CONSTANTS ---
const glassInput = "w-full bg-slate-50/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-4 pl-12 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-base";
const labelStyle = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1";
const inputIconWrapper = "absolute left-4 top-[3.2rem] text-slate-400 dark:text-slate-500 pointer-events-none";

const dropdownBase = "relative mt-0 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 cursor-pointer select-none transition-all hover:bg-white/60 dark:hover:bg-white/5";
const dropdownMenu = "absolute z-50 mt-2 w-full bg-white/90 dark:bg-[#1a1d24]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/60 dark:border-white/10 overflow-hidden max-h-64 overflow-y-auto ring-1 ring-black/5";
const dropdownItem = "px-5 py-4 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-300 flex justify-between items-center transition-colors cursor-pointer";

const primaryButtonStyles = `
    w-full py-4 text-base font-bold text-white rounded-xl 
    bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
    shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)]
    border border-blue-400/20 active:scale-[0.98] transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
`;

const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const CreateClassModal = ({ isOpen, onClose, teacherId, courses }) => {
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 7');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [meetLink, setMeetLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const { showToast } = useToast();

    const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!className.trim() || !section.trim() || !gradeLevel) {
            showToast("Please fill out all fields.", "error");
            return;
        }

        setIsSubmitting(true);
        let finalMeetLink = meetLink.trim(); 

        try {
            if (!finalMeetLink) {
                showToast("A persistent Google Meet link is required.", "error");
                setIsSubmitting(false);
                return;
            }
            
            if (!finalMeetLink.startsWith("https://meet.google.com/")) {
                showToast("Please enter a valid Google Meet URL", "warning");
                setIsSubmitting(false);
                return;
            }

            const newClassCode = generateClassCode();
            await addDoc(collection(db, "classes"), {
                name: className,
                section: section,
                gradeLevel: gradeLevel,
                teacherId: teacherId,
                students: [],
                classCode: newClassCode,
                isArchived: false,
                subjectId: selectedSubjectId,
                meetLink: finalMeetLink,
            });
            
            showToast(`Class created successfully! Code: ${newClassCode}`, 'success');
            onClose(); 
            
            setClassName('');
            setSection('');
            setSelectedSubjectId('');
            setMeetLink('');
            setGradeLevel('Grade 7'); 

        } catch (error) {
            console.error("Error creating class: ", error);
            showToast(`Failed to create class: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Class"
            // [FIX 1] Use a valid key from Modal.jsx sizeClasses. '4xl' is approx double 'md'.
            size="4xl"
            
            // [FIX 2] Use !important to override the hardcoded 'bg-neumorphic-base' in Modal.jsx
            // This applies your glass style to the main container.
            roundedClass="rounded-[2.5rem] !bg-white/90 dark:!bg-[#18181b]/95 !backdrop-blur-2xl !border !border-white/20 dark:!border-white/5 !shadow-2xl"
            
            // [FIX 3] Remove default padding from Modal.jsx so we can control it in the form
            contentClassName="!p-0"
        >
            <form onSubmit={handleSubmit} className="space-y-10 relative p-8 md:p-12">
                
                {/* Row 1: Name & Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="relative group">
                        <label htmlFor="className" className={labelStyle}>Class Name</label>
                        <IconSchool size={20} className={inputIconWrapper} />
                        <input
                            type="text"
                            id="className"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            placeholder="e.g. English Literature"
                            className={glassInput}
                            required
                        />
                    </div>

                    <div className="relative group">
                        <label htmlFor="section" className={labelStyle}>Section</label>
                        <IconSection size={20} className={inputIconWrapper} />
                        <input
                            type="text"
                            id="section"
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            placeholder="e.g. A - Morning Session"
                            className={glassInput}
                            required
                        />
                    </div>
                </div>

                {/* Row 2: Grade & Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Grade Level Dropdown */}
                    <div className="relative">
                        <label className={labelStyle}>Grade Level</label>
                        <div
                            className={dropdownBase}
                            onClick={() => {
                                setGradeDropdownOpen(!gradeDropdownOpen);
                                setSubjectDropdownOpen(false);
                            }}
                        >
                            <div className="flex items-center justify-between px-5 py-4 text-slate-800 dark:text-slate-100">
                                <div className="flex items-center gap-4">
                                    <IconBook size={20} className="text-slate-400 dark:text-slate-500" />
                                    <span className="text-base font-medium">{gradeLevel}</span>
                                </div>
                                <IconChevronDown size={20} className={`text-slate-400 transition-transform ${gradeDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {gradeDropdownOpen && (
                                <ul className={dropdownMenu}>
                                    {gradeLevels.map((level) => (
                                        <li
                                            key={level}
                                            className={dropdownItem}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGradeLevel(level);
                                                setGradeDropdownOpen(false);
                                            }}
                                        >
                                            {level}
                                            {gradeLevel === level && <IconCheck size={20} className="text-blue-500" />}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Subject Dropdown */}
                    <div className="relative">
                        <label className={labelStyle}>Assign Subject</label>
                        <div
                            className={dropdownBase}
                            onClick={() => {
                                setSubjectDropdownOpen(!subjectDropdownOpen);
                                setGradeDropdownOpen(false);
                            }}
                        >
                            <div className="flex items-center justify-between px-5 py-4 text-slate-800 dark:text-slate-100">
                                <div className="flex items-center gap-4">
                                    <IconChalkboard size={20} className="text-slate-400 dark:text-slate-500" />
                                    <span className="text-base font-medium truncate max-w-[220px]">
                                        {selectedSubjectId
                                            ? courses.find((c) => c.id === selectedSubjectId)?.title
                                            : 'No Subject'}
                                    </span>
                                </div>
                                <IconChevronDown size={20} className={`text-slate-400 transition-transform ${subjectDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {subjectDropdownOpen && (
                                <ul className={dropdownMenu}>
                                    <li
                                        className={dropdownItem}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSubjectId('');
                                            setSubjectDropdownOpen(false);
                                        }}
                                    >
                                        <span className="opacity-70">No Subject Assigned</span>
                                        {!selectedSubjectId && <IconCheck size={20} className="text-blue-500" />}
                                    </li>
                                    {courses
                                        .sort((a, b) => a.title.localeCompare(b.title))
                                        .map((course) => (
                                            <li
                                                key={course.id}
                                                className={dropdownItem}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSubjectId(course.id);
                                                    setSubjectDropdownOpen(false);
                                                }}
                                            >
                                                {course.title}
                                                {selectedSubjectId === course.id && <IconCheck size={20} className="text-blue-500" />}
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Meet Link Row - Full Width */}
                <div className="relative group pt-2">
                    <label htmlFor="meetLink" className={labelStyle}>
                        Google Meet Link <span className="text-red-500">*</span>
                    </label>
                    <IconVideo size={20} className={inputIconWrapper} />
                    <input
                        type="url"
                        id="meetLink"
                        value={meetLink}
                        onChange={(e) => setMeetLink(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className={glassInput}
                        required 
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
        </Modal>
    );
};

export default CreateClassModal;