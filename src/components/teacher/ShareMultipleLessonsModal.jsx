import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase'; 
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import Modal from '../common/Modal';
import { 
    ChevronUpDownIcon, 
    CheckIcon,
    DocumentTextIcon,
    UsersIcon,
    CalendarDaysIcon,
    ShieldCheckIcon,
    ShareIcon,
    ClockIcon,
    QueueListIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';
import ContentSelectionModal from './ContentSelectionModal';
import ClassStudentSelectionModal from './ClassStudentSelectionModal';

// --- PREMIUM DESIGN SYSTEM CONSTANTS ---
// Removed 'overflow-hidden' so dropdowns and date pickers can visually break out of the card
const solidPanel = "bg-white dark:bg-[#18181b] border border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none rounded-[24px] p-5 sm:p-6 transition-all relative";
const solidInput = "w-full bg-slate-50 dark:bg-[#27272a] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-sm";

const primaryBtn = "w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2";
const secondaryBtn = "w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#3f3f46] border border-transparent active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center";

const selectButtonStyle = "flex w-full items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-[#27272a] border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-[#3f3f46] transition-all text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed group";

// --- COMPONENTS ---

const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
            <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</h3>
    </div>
);

// --- FULLY CUSTOM TIME PICKER FOR ANDROID WEBVIEW COMPATIBILITY ---
const CustomTimePicker = React.memo(({ selectedDate, onChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Derived state for the popover UI
    const currentHour24 = selectedDate ? selectedDate.getHours() : 0;
    const currentMinute = selectedDate ? selectedDate.getMinutes() : 0;
    
    const [period, setPeriod] = useState(currentHour24 >= 12 ? 'PM' : 'AM');
    const [hour12, setHour12] = useState(currentHour24 % 12 || 12);
    const [minute, setMinute] = useState(currentMinute);

    // Sync external date changes to internal state when opened
    useEffect(() => {
        if (isOpen && selectedDate) {
            const h = selectedDate.getHours();
            setPeriod(h >= 12 ? 'PM' : 'AM');
            setHour12(h % 12 || 12);
            setMinute(selectedDate.getMinutes());
        }
    }, [isOpen, selectedDate]);

    const formatDisplayTime = (date) => {
        if (!date) return '--:--';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleConfirm = (e) => {
        e.stopPropagation();
        const newDate = new Date(selectedDate || new Date());
        let newHour24 = hour12;
        if (period === 'PM' && hour12 < 12) newHour24 += 12;
        if (period === 'AM' && hour12 === 12) newHour24 = 0;
        
        newDate.setHours(newHour24, minute, 0, 0);
        onChange(newDate);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full">
            <button 
                type="button" 
                onClick={() => setIsOpen(true)} 
                disabled={disabled}
                className={`${solidInput} flex items-center justify-between !py-3.5`}
            >
                <span className={selectedDate ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                    {formatDisplayTime(selectedDate)}
                </span>
                <ClockIcon className="w-5 h-5 text-slate-400" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
                    <div 
                        className="w-full max-w-xs bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl border border-slate-100 dark:border-white/10 p-5 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-800 dark:text-white">Select Time</span>
                            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-6 h-48">
                            {/* Hours Column */}
                            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                                    <button
                                        key={`h-${h}`}
                                        onClick={() => setHour12(h)}
                                        className={`py-2 rounded-xl text-sm font-medium transition-colors ${hour12 === h ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-[#27272a] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {String(h).padStart(2, '0')}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Minutes Column (Intervals of 5 to keep UI clean, or full 0-59 if preferred. Using 5s for mobile ease) */}
                            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
                                {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                                    <button
                                        key={`m-${m}`}
                                        onClick={() => setMinute(m)}
                                        className={`py-2 rounded-xl text-sm font-medium transition-colors ${minute === m ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-[#27272a] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {String(m).padStart(2, '0')}
                                    </button>
                                ))}
                            </div>

                            {/* AM/PM Column */}
                            <div className="flex flex-col gap-2">
                                {['AM', 'PM'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${period === p ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-[#27272a] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleConfirm}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Set Time
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});


const CustomSingleSelect = React.memo(({ options, selectedValue, onSelectionChange, isOpen, onToggle, placeholder = "Select...", disabled = false }) => {
    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

    return (
        <div className="relative">
            <button type="button" onClick={onToggle} disabled={disabled} className={selectButtonStyle}>
                <span className={`block truncate text-sm font-semibold ${selectedValue === null ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {selectedLabel}
                </span>
                <ChevronUpDownIcon className={`h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onToggle}>
                    <div 
                        className="w-full max-w-xs bg-white dark:bg-[#18181b] rounded-[24px] shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div className="bg-slate-50 dark:bg-[#27272a] border-b border-slate-100 dark:border-white/5 p-4 text-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Select Option
                            </span>
                        </div>
                        <ul className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {options.map(({ value, label }) => (
                                <li 
                                    key={value} 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        onSelectionChange(value); 
                                        onToggle(); 
                                    }} 
                                    className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-colors duration-150
                                        ${selectedValue === value 
                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' 
                                            : 'hover:bg-slate-50 dark:hover:bg-[#27272a] text-slate-700 dark:text-slate-200'
                                        }`}
                                >
                                    <span className="text-sm font-semibold">{label}</span>
                                    {selectedValue === value && <CheckIcon className="h-5 w-5" />}
                                </li>
                            ))}
                        </ul>
                        <div className="p-3 bg-slate-50 dark:bg-[#27272a] border-t border-slate-100 dark:border-white/5">
                            <button 
                                onClick={onToggle}
                                className="w-full py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
    <label className={`flex items-center justify-between group py-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
        <div className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={enabled} onChange={onChange} disabled={disabled} />
            <div className={`w-12 h-7 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300/50 dark:peer-focus:ring-blue-800 
                bg-slate-200 dark:bg-slate-700 peer-checked:bg-blue-600 transition-colors duration-300 ease-in-out`}></div>
            <div className={`absolute left-[3px] top-[3px] bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] 
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

    const quarterOptions = useMemo(() => [
        { value: 1, label: 'Quarter 1' },
        { value: 2, label: 'Quarter 2' },
        { value: 3, label: 'Quarter 3' },
        { value: 4, label: 'Quarter 4' },
    ], []);

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

    // Time is now updated via full Date object passed from CustomTimePicker
    const handleCustomTimeUpdate = useCallback((newDateObj, field) => {
        if (field === 'from') setAvailableFrom(newDateObj);
        if (field === 'until') setAvailableUntil(newDateObj);
    }, []);

    const handleToggleDropdown = useCallback((dropdownName) => {
        setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
    }, []);

    const handleClassSelectionConfirm = useCallback((newSelectionMap) => {
        setSelectionMap(newSelectionMap);
        setIsClassModalOpen(false);
    }, []);
    
    const handleQuizSettingsChange = useCallback((field, value) => {
        setQuizSettings(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleClose = useCallback(() => {
        setPostTitle(''); setPostComment(''); setSelectionMap(new Map());
        setSelectedLessons([]); setSelectedQuizzes([]);
        setAvailableFrom(getInitialDateWithZeroSeconds()); setAvailableUntil(null); 
        setSelectedQuarter(null); setError(''); setSuccess(''); 
        setRawLessons([]); setRawQuizzes([]); setActiveDropdown(null);
        setSendAsExam(false); setIsClassModalOpen(false);
        setIsLessonModalOpen(false); setIsQuizModalOpen(false);
        setQuizSettings({ 
            enabled: false, shuffleQuestions: true, lockOnLeave: true, 
            preventScreenCapture: true, detectDevTools: true,
            warnOnPaste: true, preventBackNavigation: true,
        });
        onClose();
    }, [onClose]);

    const handleShare = async () => {
        if (!postTitle.trim()) return setError("Please enter a title for the post.");
        if (!selectedQuarter) return setError("Please select a quarter before sharing.");
        if (selectionMap.size === 0 || (selectedLessons.length === 0 && selectedQuizzes.length === 0)) return setError("Please select at least one class, at least one student, and one piece of content.");
        if (!availableFrom) return setError("Please set a valid 'Available From' date and time.");

        setLoading(true); setError(''); setSuccess('');
        try {
            const batch = writeBatch(db);
            const lessonsToPost = rawLessons.filter(l => selectedLessons.includes(l.id)).map(l => ({ ...l, quarter: selectedQuarter }));
            const quizzesToPost = rawQuizzes.filter(q => selectedQuizzes.includes(q.id)).map(q => ({ ...q, quarter: selectedQuarter }));

            const firstLesson = lessonsToPost[0];
            const firstQuiz = quizzesToPost[0];
            const postUnitId = firstLesson?.unitId || firstQuiz?.unitId || null;

            const contentParts = [];
            if (lessonsToPost.length > 0) contentParts.push(`${lessonsToPost.length} lesson(s)`);
            if (quizzesToPost.length > 0) contentParts.push(`${quizzesToPost.length} quiz(zes)`);

            const generatedContent = `The following are now available: ${contentParts.join(' and ')}.`;
            const maxAttempts = (isExamPossible && sendAsExam) ? 1 : 3;
            
            let settingsToSave = quizSettings.enabled 
                ? { ...quizSettings, maxAttempts }
                : { enabled: false, shuffleQuestions: false, lockOnLeave: false, preventScreenCapture: false, detectDevTools: false, warnOnPaste: false, preventBackNavigation: false, maxAttempts };

            let totalClassesShared = 0;
            for (const [classId, studentSet] of selectionMap.entries()) {
                const targetStudentIds = Array.from(studentSet);
                if (targetStudentIds.length === 0) continue;
                
                totalClassesShared++;
                const newPostRef = doc(collection(db, `classes/${classId}/posts`));
                
                batch.set(newPostRef, {
                    title: postTitle, content: postComment.trim() ? postComment : generatedContent,
                    author: user.displayName || 'Teacher', createdAt: serverTimestamp(),
                    subjectId: subject.id, availableFrom: Timestamp.fromDate(availableFrom),
                    availableUntil: availableUntil ? Timestamp.fromDate(availableUntil) : null,
                    quarter: selectedQuarter, unitId: postUnitId,
                    lessons: lessonsToPost, quizzes: quizzesToPost,
                    quizSettings: settingsToSave, targetAudience: "specific", targetStudentIds: targetStudentIds, 
                });

                const classRef = doc(db, "classes", classId);
                batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            }
            
            if (totalClassesShared === 0) {
                 setError("No students were selected.");
                 setLoading(false); return;
            }

            await batch.commit();
            setSuccess(`Successfully shared materials to ${totalClassesShared} class(es).`);
            setTimeout(handleClose, 2000);
        } catch (err) {
            console.error("Error sharing content: ", err);
            setError("An error occurred while sharing. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;
    
    const classButtonText = useMemo(() => {
        if (selectionMap.size === 0) return "Select Classes & Students";
        let totalStudents = 0;
        selectionMap.forEach(studentSet => totalStudents += studentSet.size);
        if (totalStudents === 0) return "Select Classes & Students";
        return `${totalStudents} Student(s) in ${selectionMap.size} Class(es)`;
    }, [selectionMap]);
    
    const datePickerClasses = solidInput;

    return (
        <React.Fragment>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title="Share Content"
                description={`Distribute materials from "${subject?.title || 'Subject'}" to your students.`}
                size="screen"
                roundedClass="rounded-none sm:rounded-[32px] bg-[#f8f9fa] dark:bg-[#09090b] border-none shadow-none sm:shadow-2xl"
                containerClassName="h-full sm:p-6 bg-[#f8f9fa] dark:bg-[#09090b]"
                contentClassName="!p-0 h-full"
            >
				{/* 1. Added max-h-[100dvh] and overflow-hidden to strictly bound the height */}
				    <div className="flex flex-col w-full h-full max-h-[100dvh] overflow-hidden bg-[#f8f9fa] dark:bg-[#09090b]">
        
				        {/* 2. Changed to flex-1 so it takes up exactly the remaining space and scrolls */}
				        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
				            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                            
                            {/* --- COLUMN 1: Details & Recipients --- */}
                            <div className="space-y-5 sm:space-y-6">
                                <section className={solidPanel}>
                                    <SectionHeader icon={DocumentTextIcon} title="Post Details" />
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">TITLE</label>
                                            <input
                                                type="text"
                                                value={postTitle}
                                                onChange={(e) => setPostTitle(e.target.value)}
                                                className={solidInput}
                                                placeholder="e.g., Unit 1 Review Materials"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">COMMENT (OPTIONAL)</label>
                                            <textarea
                                                rows={3}
                                                value={postComment}
                                                onChange={(e) => setPostComment(e.target.value)}
                                                className={solidInput + " resize-none"}
                                                placeholder="Add context or instructions..."
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className={solidPanel}>
                                    <SectionHeader icon={UsersIcon} title="Recipients" />
                                    <button
                                        type="button"
                                        onClick={() => setIsClassModalOpen(true)}
                                        disabled={contentLoading}
                                        className={selectButtonStyle}
                                    >
                                        <span className="block truncate text-sm font-semibold">
                                            {classButtonText}
                                        </span>
                                        <ChevronUpDownIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                                    </button>
                                </section>
                            </div>
                            
                            {/* --- COLUMN 2: Settings & Scheduling --- */}
                            <div className="space-y-5 sm:space-y-6">
                                <section className={solidPanel}>
                                    <SectionHeader icon={CalendarDaysIcon} title="Availability" />
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">START DATE & TIME</label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="w-full sm:w-3/5 relative">
                                                    <DatePicker
                                                        selected={availableFrom}
                                                        onChange={(date) => handleDateChange(date, 'from')}
                                                        dateFormat="MMM d, yyyy"
                                                        className={datePickerClasses}
                                                        popperPlacement="bottom-start"
                                                        wrapperClassName="w-full"
                                                    />
                                                </div>
                                                <div className="w-full sm:w-2/5">
                                                    <CustomTimePicker 
                                                        selectedDate={availableFrom} 
                                                        onChange={(date) => handleCustomTimeUpdate(date, 'from')} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">END DATE (OPTIONAL)</label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="w-full sm:w-3/5 relative">
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
                                                <div className="w-full sm:w-2/5">
                                                    <CustomTimePicker 
                                                        selectedDate={availableUntil} 
                                                        onChange={(date) => handleCustomTimeUpdate(date, 'until')} 
                                                        disabled={availableUntil === null}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className={solidPanel}>
                                    <SectionHeader icon={QueueListIcon} title="Post Type & Quarter" />
                                    <div className='space-y-4 mb-5'>
                                        {isAssignment && (
                                            <ToggleSwitch label="Send as Assignment" enabled={true} onChange={() => { }} disabled={true} />
                                        )}
                                        {isExamPossible && (
                                            <ToggleSwitch label="Send as Exam (1 Attempt)" enabled={sendAsExam} onChange={() => setSendAsExam(!sendAsExam)} />
                                        )}
                                        {!isAssignment && !isExamPossible && (
                                            <p className="text-sm text-center text-slate-400 dark:text-slate-500 py-3 bg-slate-50 dark:bg-[#27272a] rounded-xl italic font-medium">Select materials to view post options.</p>
                                        )}
                                    </div>
                                    <div className="pt-5 border-t border-slate-100 dark:border-white/5">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">QUARTER</label>
                                        <CustomSingleSelect
                                            options={quarterOptions}
                                            selectedValue={selectedQuarter}
                                            onSelectionChange={setSelectedQuarter}
                                            isOpen={activeDropdown === 'quarter'}
                                            onToggle={() => handleToggleDropdown('quarter')}
                                            placeholder="-- Select Quarter --"
                                        />
                                    </div>
                                </section>
                            </div>

                            {/* --- COLUMN 3: Content & Security --- */}
                            <div className="space-y-5 sm:space-y-6">
                                <section className={solidPanel}>
                                    <SectionHeader icon={DocumentTextIcon} title="Select Materials" />
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsLessonModalOpen(true)}
                                            disabled={contentLoading}
                                            className={selectButtonStyle}
                                        >
                                            <span className="block truncate text-sm font-semibold">
                                                {selectedLessons.length > 0 ? `${selectedLessons.length} Lessons Selected` : `Browse Lessons`}
                                            </span>
                                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsQuizModalOpen(true)}
                                            disabled={contentLoading}
                                            className={selectButtonStyle}
                                        >
                                            <span className="block truncate text-sm font-semibold">
                                                {selectedQuizzes.length > 0 ? `${selectedQuizzes.length} Quizzes Selected` : `Browse Quizzes`}
                                            </span>
                                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                                        </button>
                                    </div>
                                </section>
                                
                                <section className={solidPanel}>
                                    <SectionHeader icon={ShieldCheckIcon} title="Security Settings" />
                                    <div className="space-y-3">
                                        <ToggleSwitch
                                            label="Enable Anti-Cheating Suite"
                                            enabled={quizSettings.enabled}
                                            onChange={() => handleQuizSettingsChange('enabled', !quizSettings.enabled)}
                                        />
                                        {quizSettings.enabled && (
                                            <div className="pl-4 pt-4 mt-4 border-t border-slate-100 dark:border-white/5 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                                <ToggleSwitch label="Shuffle Questions" enabled={quizSettings.shuffleQuestions} onChange={() => handleQuizSettingsChange('shuffleQuestions', !quizSettings.shuffleQuestions)} />
                                                <ToggleSwitch label="Lock Tab / App Leave" enabled={quizSettings.lockOnLeave} onChange={() => handleQuizSettingsChange('lockOnLeave', !quizSettings.lockOnLeave)} />
                                                <ToggleSwitch label="Block Screen Recording" enabled={quizSettings.preventScreenCapture} onChange={() => handleQuizSettingsChange('preventScreenCapture', !quizSettings.preventScreenCapture)} />
                                                <ToggleSwitch label="Detect Dev Tools" enabled={quizSettings.detectDevTools} onChange={() => handleQuizSettingsChange('detectDevTools', !quizSettings.detectDevTools)} />
                                                <ToggleSwitch label="Warn on Paste" enabled={quizSettings.warnOnPaste} onChange={() => handleQuizSettingsChange('warnOnPaste', !quizSettings.warnOnPaste)} />
                                                <ToggleSwitch label="Prevent Back Button" enabled={quizSettings.preventBackNavigation} onChange={() => handleQuizSettingsChange('preventBackNavigation', !quizSettings.preventBackNavigation)} />
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </main>

                    {/* Footer - Floating/Fixed for mobile reachability */}
		<footer className="flex-shrink-0 w-full py-4 px-4 sm:py-5 sm:px-8 border-t border-slate-200/50 dark:border-white/10 bg-white dark:bg-[#18181b] z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] dark:shadow-none">
		            {error && (<div className="text-center text-red-600 dark:text-red-400 text-sm font-bold mb-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20">{error}</div>)}
		            {success && (<div className="text-center text-green-600 dark:text-green-400 text-sm font-bold mb-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-100 dark:border-green-500/20">{success}</div>)}
            
		            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 max-w-7xl mx-auto">
		                <button type="button" onClick={handleClose} disabled={loading} className={secondaryBtn}>
		                    Cancel
		                </button>
		                <button onClick={handleShare} disabled={loading || contentLoading || thingsToShareCount === 0 || selectionMap.size === 0} className={primaryBtn}>
		                    {loading ? (
		                        <>
		                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
		                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
		                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		                            </svg>
		                            Processing...
		                        </>
		                    ) : (
		                        <>
		                            <ShareIcon className="w-5 h-5" />
		                            {`Share ${thingsToShareCount > 0 ? `${thingsToShareCount} Item(s)` : ''}`}
		                        </>
		                    )}
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
                onConfirm={(selection) => setSelectedLessons(selection)}
                title="Select Lessons"
                options={allLessons}
                currentSelection={selectedLessons}
            />
            <ContentSelectionModal
                isOpen={isQuizModalOpen}
                onClose={() => setIsQuizModalOpen(false)}
                onConfirm={(selection) => setSelectedQuizzes(selection)}
                title="Select Quizzes"
                options={allQuizzes}
                currentSelection={selectedQuizzes}
            />
        </React.Fragment>
    );
}