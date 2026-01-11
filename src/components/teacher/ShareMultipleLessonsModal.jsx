import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase'; 
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import Modal from '../common/Modal';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';
import ContentSelectionModal from './ContentSelectionModal';
import ClassStudentSelectionModal from './ClassStudentSelectionModal';

// --- NEW DESIGN SYSTEM CONSTANTS (Solid, Performance Optimized) ---
const solidPanel = "bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 transition-all";
const solidInput = "w-full bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-sm";

const primaryBtn = "w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
const secondaryBtn = "w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-[#3a3a3c] border border-transparent active:scale-[0.98] transition-all duration-200 disabled:opacity-50";

const selectButtonStyle = "flex w-full items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-[#3a3a3c] transition-all text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed";

// --- COMPONENTS ---

const CustomSingleSelect = React.memo(({ options, selectedValue, onSelectionChange, isOpen, onToggle, placeholder = "Select...", disabled = false }) => {
    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

    const renderOptions = () => {
        return options.map(({ value, label }) => (
            <li 
                key={value} 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    onSelectionChange(value); 
                    onToggle(); 
                }} 
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors duration-150 border-b border-slate-100 dark:border-slate-800 last:border-0
                    ${selectedValue === value 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-[#2c2c2e]'
                    }`}
            >
                <span className={`text-sm font-semibold ${selectedValue === value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {label}
                </span>
                {selectedValue === value && <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            </li>
        ));
    };

    return (
        <div className="relative">
            <button type="button" onClick={onToggle} disabled={disabled} className={selectButtonStyle}>
                <span className={`block truncate text-sm font-semibold ${selectedValue === null ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                    {selectedLabel}
                </span>
                <ChevronUpDownIcon className={`h-5 w-5 text-slate-400 dark:text-slate-500 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Solid Popover */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onToggle}>
                    <div 
                        className="w-full max-w-xs bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div className="bg-slate-50 dark:bg-[#252525] border-b border-slate-100 dark:border-slate-800 p-3 text-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Select Option
                            </span>
                        </div>
                        <ul className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {renderOptions()}
                        </ul>
                        <div className="p-3 bg-slate-50 dark:bg-[#252525] border-t border-slate-100 dark:border-slate-800">
                            <button 
                                onClick={onToggle}
                                className="w-full py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333] transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// Optimized Toggle Switch (iOS Style) - MEMOIZED
const ToggleSwitch = React.memo(({ label, enabled, onChange, disabled = false }) => (
    <label className={`flex items-center justify-between group py-1 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
        <div className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={enabled} onChange={onChange} disabled={disabled} />
            <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 
                bg-slate-200 dark:bg-slate-700 peer-checked:bg-blue-600 transition-colors duration-300 ease-in-out`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] 
                ${enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </label>
));


const getInitialDateWithZeroSeconds = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
};

export default function ShareMultipleLessonsModal({ isOpen, onClose, subject }) {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [rawLessons, setRawLessons] = useState([]);
    const [rawQuizzes, setRawQuizzes] = useState([]);
    const [units, setUnits] = useState([]);
    
    const [selectionMap, setSelectionMap] = useState(new Map());

    const [selectedLessons, setSelectedLessons] = useState([]);
    const [selectedQuizzes, setSelectedQuizzes] = useState([]);
    const [availableFrom, setAvailableFrom] = useState(getInitialDateWithZeroSeconds());
    const [availableUntil, setAvailableUntil] = useState(null);
    const [selectedQuarter, setSelectedQuarter] = useState(null);
    const [sendAsExam, setSendAsExam] = useState(false);
    
    const [postTitle, setPostTitle] = useState('');
    const [postComment, setPostComment] = useState('');

    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    
    const [quizSettings, setQuizSettings] = useState({
        enabled: false,
        shuffleQuestions: true,
        lockOnLeave: true,
        preventScreenCapture: true,
        detectDevTools: true,
        warnOnPaste: true,
        preventBackNavigation: true,
    });

    const [loading, setLoading] = useState(false);
    const [contentLoading, setContentLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);

    const isExamPossible = selectedQuizzes.length > 0 && selectedLessons.length === 0;
    const isAssignment = selectedLessons.length > 0;

    useEffect(() => {
        if (!isExamPossible) {
            setSendAsExam(false);
        }
    }, [isExamPossible]);

    useEffect(() => {
        const fetchPrerequisites = async () => {
            if (!isOpen || !user?.id || !subject?.id) return;

            setPostTitle(`New materials for ${subject.title}`);
            setPostComment('');

            setContentLoading(true);
            setError('');
            try {
                const classesRef = collection(db, 'classes');
                const q = query(classesRef, where('teacherId', '==', user.id));
                const classesSnapshot = await getDocs(q);
                setClasses(classesSnapshot.docs.map(doc => ({ 
                    value: doc.id, 
                    label: `${doc.data().name} (${doc.data().gradeLevel} - ${doc.data().section})`,
                    studentCount: doc.data().studentIds?.length || 0 
                })));

                const [unitsSnapshot, lessonsSnapshot, quizzesSnapshot] = await Promise.all([
                    getDocs(query(collection(db, 'units'), where('subjectId', '==', subject.id))),
                    getDocs(query(collection(db, 'lessons'), where('subjectId', '==', subject.id))),
                    getDocs(query(collection(db, 'quizzes'), where('subjectId', '==', subject.id)))
                ]);

                setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })));
                
                setRawLessons(lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title })));
                setRawQuizzes(quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title })));

            } catch (err) {
                console.error("Error fetching prerequisites: ", err);
                setError("Failed to load required data.");
            } finally {
                setContentLoading(false);
            }
        };
        fetchPrerequisites();
    }, [isOpen, user, subject]);
    
    const allLessons = useMemo(() => {
        const grouped = {};
        units.forEach(unit => {
            const items = rawLessons.filter(lesson => lesson.unitId === unit.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            if (items.length > 0) grouped[unit.title] = items;
        });
        const uncategorized = rawLessons.filter(lesson => !lesson.unitId || !units.some(u => u.id === lesson.unitId));
        if (uncategorized.length > 0) grouped['Uncategorized'] = uncategorized;
        return grouped;
    }, [rawLessons, units]);

    const allQuizzes = useMemo(() => {
        const grouped = {};
        units.forEach(unit => {
            const items = rawQuizzes.filter(quiz => quiz.unitId === unit.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            if (items.length > 0) grouped[unit.title] = items;
        });
        const uncategorized = rawQuizzes.filter(quiz => !quiz.unitId || !units.some(u => u.id === quiz.unitId));
        if (uncategorized.length > 0) grouped['Uncategorized'] = uncategorized;
        return grouped;
    }, [rawQuizzes, units]);

    // MEMOIZED OPTIONS
    const quarterOptions = useMemo(() => [
        { value: 1, label: 'Quarter 1' },
        { value: 2, label: 'Quarter 2' },
        { value: 3, label: 'Quarter 3' },
        { value: 4, label: 'Quarter 4' },
    ], []);

    const formatTime = (date) => {
        if (!date) return '';
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // OPTIMIZED HANDLER
    const handleDateChange = useCallback((date, field) => {
        if (field === 'from') {
            setAvailableFrom(prevDate => {
                const newDate = new Date(prevDate || new Date());
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                return newDate;
            });
        } else if (field === 'until') {
            if (date === null) {
                setAvailableUntil(null);
                return;
            }
            setAvailableUntil(prevDate => {
                const newDate = new Date(prevDate || new Date());
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                return newDate;
            });
        }
    }, []);

    // OPTIMIZED HANDLER
    const handleTimeChange = useCallback((e, field) => {
        const [hours, minutes] = e.target.value.split(':');
        if (!hours || !minutes) return;

        if (field === 'from') {
            setAvailableFrom(prevDate => {
                const newDate = new Date(prevDate || new Date());
                newDate.setHours(parseInt(hours, 10));
                newDate.setMinutes(parseInt(minutes, 10));
                return newDate;
            });
        } else if (field === 'until') {
            setAvailableUntil(prevDate => {
                const newDate = new Date(prevDate || new Date());
                newDate.setHours(parseInt(hours, 10));
                newDate.setMinutes(parseInt(minutes, 10));
                return newDate;
            });
        }
    }, []);

    const handleToggleDropdown = useCallback((dropdownName) => {
        setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
    }, []);

    const handleClassSelectionConfirm = useCallback((newSelectionMap) => {
        setSelectionMap(newSelectionMap);
        setIsClassModalOpen(false);
    }, []);
    
    // OPTIMIZED HANDLER
    const handleQuizSettingsChange = useCallback((field, value) => {
        setQuizSettings(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleClose = useCallback(() => {
        setPostTitle('');
        setPostComment('');
        setSelectionMap(new Map());
        setSelectedLessons([]); 
        setSelectedQuizzes([]);
        setAvailableFrom(getInitialDateWithZeroSeconds()); 
        setAvailableUntil(null); setSelectedQuarter(null);
        setError(''); setSuccess(''); setRawLessons([]); setRawQuizzes([]);
        setActiveDropdown(null);
        setSendAsExam(false);
        setIsClassModalOpen(false);
        setIsLessonModalOpen(false);
        setIsQuizModalOpen(false);
        
        setQuizSettings({ 
            enabled: false, 
            shuffleQuestions: true, 
            lockOnLeave: true, 
            preventScreenCapture: true, 
            detectDevTools: true,
            warnOnPaste: true,
            preventBackNavigation: true,
        });

        onClose();
    }, [onClose]);

    const handleShare = async () => {
        if (!postTitle.trim()) {
            setError("Please enter a title for the post.");
            return;
        }
        if (!selectedQuarter) {
            setError("Please select a quarter before sharing.");
            return;
        }
        if (selectionMap.size === 0 || (selectedLessons.length === 0 && selectedQuizzes.length === 0)) {
            setError("Please select at least one class, at least one student, and one piece of content.");
            return;
        }
        if (!availableFrom) {
            setError("Please set a valid 'Available From' date and time.");
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const batch = writeBatch(db);

            const lessonsToPost = rawLessons
                .filter(l => selectedLessons.includes(l.id))
                .map(l => ({ ...l, quarter: selectedQuarter }));

            const quizzesToPost = rawQuizzes
                .filter(q => selectedQuizzes.includes(q.id))
                .map(q => ({ ...q, quarter: selectedQuarter }));

            const firstLesson = lessonsToPost[0];
            const firstQuiz = quizzesToPost[0];
            const postUnitId = firstLesson?.unitId || firstQuiz?.unitId || null;

            const contentParts = [];
            if (lessonsToPost.length > 0) contentParts.push(`${lessonsToPost.length} lesson(s)`);
            if (quizzesToPost.length > 0) contentParts.push(`${quizzesToPost.length} quiz(zes)`);

            const generatedContent = `The following are now available: ${contentParts.join(' and ')}.`;

            const maxAttempts = (isExamPossible && sendAsExam) ? 1 : 3;
            
            let settingsToSave;
            if (quizSettings.enabled) {
                settingsToSave = { ...quizSettings, maxAttempts };
            } else {
                settingsToSave = {
                    enabled: false,
                    shuffleQuestions: false,
                    lockOnLeave: false,
                    preventScreenCapture: false,
                    detectDevTools: false,
                    warnOnPaste: false,
                    preventBackNavigation: false,
                    maxAttempts
                };
            }

            let totalClassesShared = 0;
            for (const [classId, studentSet] of selectionMap.entries()) {
                
                const targetStudentIds = Array.from(studentSet);

                if (targetStudentIds.length === 0) {
                    continue;
                }
                
                totalClassesShared++;
                const newPostRef = doc(collection(db, `classes/${classId}/posts`));
                
                batch.set(newPostRef, {
                    title: postTitle,
                    content: postComment.trim() ? postComment : generatedContent,
                    author: user.displayName || 'Teacher',
                    createdAt: serverTimestamp(),
                    subjectId: subject.id,
                    availableFrom: Timestamp.fromDate(availableFrom),
                    availableUntil: availableUntil ? Timestamp.fromDate(availableUntil) : null,
                    quarter: selectedQuarter,
                    unitId: postUnitId,
                    lessons: lessonsToPost,
                    quizzes: quizzesToPost,
                    quizSettings: settingsToSave,
                    targetAudience: "specific", 
                    targetStudentIds: targetStudentIds, 
                });

                const classRef = doc(db, "classes", classId);
                batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            }
            
            if (totalClassesShared === 0) {
                 setError("No students were selected. Please select at least one student from a class.");
                 setLoading(false);
                 return;
            }

            await batch.commit();
            setSuccess(`Successfully shared materials to ${totalClassesShared} class(es).`);
            setTimeout(handleClose, 2000);
        } catch (err)
        {
            console.error("Error sharing content: ", err);
            setError("An error occurred while sharing. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;
    
    // MEMOIZED LABEL CALCULATION
    const classButtonText = useMemo(() => {
        if (selectionMap.size === 0) return "Select Classes & Students";
        
        let totalStudents = 0;
        selectionMap.forEach(studentSet => {
            totalStudents += studentSet.size;
        });

        if (totalStudents === 0) return "Select Classes & Students";
        
        return `${totalStudents} Student(s) in ${selectionMap.size} Class(es) Selected`;
    }, [selectionMap]);
    
    // Adjusted styles for date inputs to match new solid inputs
    const datePickerClasses = solidInput;
    const timeInputClasses = `${solidInput} text-center`;

    return (
        <React.Fragment>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title="Share Content"
                description={`Share materials from "${subject.title}" to your classes.`}
                size="screen"
                // Removed heavy blur classes, added solid background for mobile performance
                roundedClass="rounded-none sm:rounded-[2rem] bg-[#f8f9fa] dark:bg-[#000000] border-none shadow-none sm:shadow-2xl"
                containerClassName="h-full sm:p-4 bg-[#f8f9fa] dark:bg-[#000000]"
                contentClassName="!p-0 h-full"
            >
                <div className="relative h-full flex flex-col bg-[#f8f9fa] dark:bg-[#000000]">
                    <main className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 pb-24">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            
                            {/* --- COLUMN 1: Details & Recipients --- */}
                            <div className="space-y-4 sm:space-y-6">
                                <section className={solidPanel}>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">1. Post Details</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Title</label>
                                            <input
                                                type="text"
                                                value={postTitle}
                                                onChange={(e) => setPostTitle(e.target.value)}
                                                className={solidInput}
                                                placeholder="e.g., Unit 1 Review"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Comment (Optional)</label>
                                            <textarea
                                                rows={3}
                                                value={postComment}
                                                onChange={(e) => setPostComment(e.target.value)}
                                                className={solidInput + " resize-none"}
                                                placeholder="Add context..."
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className={solidPanel}>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">2. Share With</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsClassModalOpen(true)}
                                        disabled={contentLoading}
                                        className={selectButtonStyle}
                                    >
                                        <span className="block truncate text-sm font-semibold">
                                            {classButtonText}
                                        </span>
                                        <ChevronUpDownIcon className="h-5 w-5 text-slate-400" />
                                    </button>
                                </section>
                            </div>
                            
                            {/* --- COLUMN 2: Settings & Scheduling --- */}
                            <div className="space-y-4 sm:space-y-6">
                                <section className={solidPanel}>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">3. Availability</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Start Date</label>
                                            <div className="flex gap-3">
                                                <div className="w-2/3">
                                                    <DatePicker
                                                        selected={availableFrom}
                                                        onChange={(date) => handleDateChange(date, 'from')}
                                                        dateFormat="MMM d, yyyy"
                                                        className={datePickerClasses}
                                                        popperPlacement="bottom-start"
                                                        wrapperClassName="w-full"
                                                    />
                                                </div>
                                                <input
                                                    type="time"
                                                    value={formatTime(availableFrom)}
                                                    onChange={(e) => handleTimeChange(e, 'from')}
                                                    className={`${timeInputClasses} w-1/3`}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">End Date (Optional)</label>
                                            <div className="flex gap-3">
                                                <div className="w-2/3">
                                                    <DatePicker
                                                        selected={availableUntil}
                                                        onChange={(date) => handleDateChange(date, 'until')}
                                                        dateFormat="MMM d, yyyy"
                                                        className={datePickerClasses}
                                                        isClearable={true}
                                                        placeholderText="No end date"
                                                        popperPlacement="bottom-start"
                                                        wrapperClassName="w-full"
                                                    />
                                                </div>
                                                <input
                                                    type="time"
                                                    value={formatTime(availableUntil)}
                                                    onChange={(e) => handleTimeChange(e, 'until')}
                                                    className={`${timeInputClasses} w-1/3`}
                                                    disabled={availableUntil === null}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className={solidPanel}>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">4. Post Type</h3>
                                    <div className='space-y-2'>
                                        {isAssignment && (
                                            <ToggleSwitch
                                                label="Send as Assignment"
                                                enabled={true}
                                                onChange={() => { }}
                                                disabled={true}
                                            />
                                        )}
                                        {isExamPossible && (
                                            <ToggleSwitch
                                                label="Send as Exam (1 Attempt)"
                                                enabled={sendAsExam}
                                                onChange={() => setSendAsExam(!sendAsExam)}
                                            />
                                        )}
                                        {!isAssignment && !isExamPossible && (
                                            <p className="text-sm text-center text-slate-400 dark:text-slate-500 pt-2 italic font-medium">Select lessons or quizzes to see options.</p>
                                        )}
                                    </div>
                                </section>

                                <section className={solidPanel}>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">5. Quarter</h3>
                                    <CustomSingleSelect
                                        options={quarterOptions}
                                        selectedValue={selectedQuarter}
                                        onSelectionChange={setSelectedQuarter}
                                        isOpen={activeDropdown === 'quarter'}
                                        onToggle={() => handleToggleDropdown('quarter')}
                                        placeholder="-- Select Quarter --"
                                    />
                                </section>
                            </div>

                            {/* --- COLUMN 3: Content & Security --- */}
                            <div className="space-y-4 sm:space-y-6">
                                <section className={solidPanel}>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">6. Content</h3>
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsLessonModalOpen(true)}
                                            disabled={contentLoading}
                                            className={selectButtonStyle}
                                        >
                                            <span className="block truncate text-sm font-semibold">
                                                {selectedLessons.length > 0 ? `${selectedLessons.length} Lessons Selected` : `Select Lessons`}
                                            </span>
                                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsQuizModalOpen(true)}
                                            disabled={contentLoading}
                                            className={selectButtonStyle}
                                        >
                                            <span className="block truncate text-sm font-semibold">
                                                {selectedQuizzes.length > 0 ? `${selectedQuizzes.length} Quizzes Selected` : `Select Quizzes`}
                                            </span>
                                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400" />
                                        </button>
                                    </div>
                                </section>
                                
                                <section className={solidPanel}>
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">7. Security</h3>
                                    <div className="space-y-3">
                                        <ToggleSwitch
                                            label="Enable Anti-Cheating Features"
                                            enabled={quizSettings.enabled}
                                            onChange={() => handleQuizSettingsChange('enabled', !quizSettings.enabled)}
                                        />
                                        {quizSettings.enabled && (
                                            <div className="pl-4 pt-4 mt-4 border-t border-slate-100 dark:border-white/10 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                                <ToggleSwitch
                                                    label="Shuffle Questions"
                                                    enabled={quizSettings.shuffleQuestions}
                                                    onChange={() => handleQuizSettingsChange('shuffleQuestions', !quizSettings.shuffleQuestions)}
                                                />
                                                <ToggleSwitch
                                                    label="Lock on Leaving Quiz Tab/App"
                                                    enabled={quizSettings.lockOnLeave}
                                                    onChange={() => handleQuizSettingsChange('lockOnLeave', !quizSettings.lockOnLeave)}
                                                />
                                                <ToggleSwitch
                                                    label="Prevent Screen Recording"
                                                    enabled={quizSettings.preventScreenCapture}
                                                    onChange={() => handleQuizSettingsChange('preventScreenCapture', !quizSettings.preventScreenCapture)}
                                                />
                                                <ToggleSwitch
                                                    label="Detect Developer Tools"
                                                    enabled={quizSettings.detectDevTools}
                                                    onChange={() => handleQuizSettingsChange('detectDevTools', !quizSettings.detectDevTools)}
                                                />
                                                <ToggleSwitch
                                                    label="Issue Warning on Paste"
                                                    enabled={quizSettings.warnOnPaste}
                                                    onChange={() => handleQuizSettingsChange('warnOnPaste', !quizSettings.warnOnPaste)}
                                                />
                                                <ToggleSwitch
                                                    label="Prevent Going Back"
                                                    enabled={quizSettings.preventBackNavigation}
                                                    onChange={() => handleQuizSettingsChange('preventBackNavigation', !quizSettings.preventBackNavigation)}
                                                />
                                            </div>
                                            )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </main>

                    {/* Footer - Fixed at bottom for easy access on mobile */}
                    <footer className="flex-shrink-0 py-4 px-4 sm:py-6 sm:px-8 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#121212] z-20">
                        {error && (<div className="text-center text-red-600 dark:text-red-400 text-sm font-medium mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">{error}</div>)}
                        {success && (<div className="text-center text-green-600 dark:text-green-400 text-sm font-medium mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">{success}</div>)}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
                            <button type="button" onClick={handleClose} disabled={loading} className={secondaryBtn}>Cancel</button>
                            <button onClick={handleShare} disabled={loading || contentLoading || thingsToShareCount === 0 || selectionMap.size === 0} className={primaryBtn}>
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sharing...
                                    </span>
                                ) : `Share ${thingsToShareCount > 0 ? `${thingsToShareCount} Item(s)` : ''}`}
                            </button>
                        </div>
                    </footer>
                </div>
            </Modal>
            
            <ClassStudentSelectionModal
                isOpen={isClassModalOpen}
                onClose={() => setIsClassModalOpen(false)}
                onConfirm={handleClassSelectionConfirm}
                allClasses={classes}
                currentSelectionMap={selectionMap}
                db={db}
            />
            <ContentSelectionModal
                isOpen={isLessonModalOpen}
                onClose={() => setIsLessonModalOpen(false)}
                onConfirm={(selection) => {
                    setSelectedLessons(selection);
                }}
                title="Select Lessons"
                options={allLessons}
                currentSelection={selectedLessons}
            />
            <ContentSelectionModal
                isOpen={isQuizModalOpen}
                onClose={() => setIsQuizModalOpen(false)}
                onConfirm={(selection) => {
                    setSelectedQuizzes(selection);
                }}
                title="Select Quizzes"
                options={allQuizzes}
                currentSelection={selectedQuizzes}
            />
        </React.Fragment>
    );
}