import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../../services/firebase';
import { doc, Timestamp, collection, query, where, getDocs, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { 
    MagnifyingGlassIcon, 
    CheckIcon, 
    UserGroupIcon, 
    ShieldExclamationIcon,
    Cog6ToothIcon,
    UsersIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/solid';

// --- DESIGN SYSTEM CONSTANTS (Optimized & Enhanced) ---
const solidPanel = "bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl sm:rounded-2xl transition-all";

// Inputs: Clean, solid, accessible
const solidInput = "w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm";

// Buttons: Enhanced Gradients & Tactile Feel
const primaryBtn = "px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 border-t border-white/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2";
const secondaryBtn = "px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50 whitespace-nowrap";
const deleteBtn = "px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 whitespace-nowrap";

// --- ENHANCED TOGGLE SWITCH ---
const ToggleSwitch = ({ label, enabled, onChange, disabled = false }) => (
    <label className={`flex items-center justify-between group ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <span className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mr-3 select-none">{label}</span>
        <div className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={onChange} disabled={disabled} />
            {/* Track */}
            <div className={`w-11 h-6 rounded-full transition-colors duration-300 ease-in-out border ${
                enabled 
                ? 'bg-indigo-600 border-indigo-600' 
                : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
            }`}></div>
            {/* Thumb */}
            <div className={`absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full shadow-md ring-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                enabled ? 'translate-x-5' : 'translate-x-0'
            }`}></div>
        </div>
    </label>
);

// --- REFINED CHECKBOX ---
const NeumorphicCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    
    return (
        <div className="relative w-5 h-5 flex-shrink-0 group">
            <input type="checkbox" ref={ref} checked={checked} {...props} className="sr-only" />
            <div className={`w-full h-full rounded-md border transition-all duration-200 flex items-center justify-center ${
                checked 
                ? 'bg-indigo-600 border-indigo-600 shadow-sm group-hover:bg-indigo-700' 
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
            }`}>
                <CheckIcon className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
            </div>
        </div>
    );
});

const defaultQuizSettings = {
    enabled: false,
    shuffleQuestions: false,
    lockOnLeave: false,
    preventScreenCapture: false,
    detectDevTools: false,
    warnOnPaste: false,
    preventBackNavigation: false,
    maxAttempts: 3, 
};

// --- EMPTY STATE ---
const EmptyState = ({ icon: Icon, text, subtext }) => (
    <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-full flex flex-col justify-center items-center bg-slate-50/50 dark:bg-[#15171a]">
        <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-3 border border-slate-100 dark:border-slate-700">
            <Icon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{text}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
);


const EditAvailabilityModal = ({ isOpen, onClose, post, classId, onUpdate, classData }) => {
    const { showToast } = useToast();
    const [availableFrom, setAvailableFrom] = useState(new Date());
    const [availableUntil, setAvailableUntil] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [tempRecipientIds, setTempRecipientIds] = useState(new Set()); 
    const [originalRecipientIds, setOriginalRecipientIds] = useState(new Set());
    
    const [quizSettings, setQuizSettings] = useState(defaultQuizSettings);
    const [mobileTab, setMobileTab] = useState('general'); 

    // Optimized Memo: Process students only when classData changes
    const allStudents = useMemo(() => {
        const students = classData?.students || []; 
        return students.map(s => {
            const displayName = `${s.lastName || ''}, ${s.firstName || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || s.id;
            const searchName = `${s.firstName || ''} ${s.lastName || ''} ${s.displayName || ''}`.toLowerCase();
            return { ...s, displayName, searchName };
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [classData?.students]); // Depend specifically on students array

    const hasQuizzes = useMemo(() => (post?.quizzes || []).length > 0, [post?.quizzes]);

    // Optimized Effect: Initialize state only when post ID changes or modal opens
    useEffect(() => {
        if (isOpen && post) {
            setPostTitle(post.title || '');
            setPostContent(post.content || '');
            setAvailableFrom(post.availableFrom?.toDate() || new Date());
            setAvailableUntil(post.availableUntil?.toDate() || new Date());
            
            // PERFORMANCE: Calculate these sets inside the effect to avoid heavy render on mount
            const initialIds = new Set();
            const originalIds = new Set();
            const allCurrentStudentIds = new Set(allStudents.map(s => s.id));
            
            if (post.targetAudience === 'all') {
                allCurrentStudentIds.forEach(id => { initialIds.add(id); originalIds.add(id); });
            } else if (post.targetAudience === 'specific' && post.targetStudentIds) {
                post.targetStudentIds.forEach(id => {
                    if (allCurrentStudentIds.has(id)) { initialIds.add(id); originalIds.add(id); }
                });
            } else {
                 allCurrentStudentIds.forEach(id => { initialIds.add(id); originalIds.add(id); });
            }
            
            setTempRecipientIds(initialIds);
            setOriginalRecipientIds(originalIds);
            
            const loadedSettings = post.quizSettings || {};
            setQuizSettings({ ...defaultQuizSettings, ...loadedSettings });
        }
    }, [isOpen, post?.id]); // Reduced dependencies to avoid re-runs

    const handleDateChange = (date, field) => {
        const setter = field === 'from' ? setAvailableFrom : setAvailableUntil;
        const currentDate = field === 'from' ? availableFrom : availableUntil;
        setter(prevDate => {
            const newDate = new Date(currentDate || new Date());
            newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
            return newDate;
        });
    };
    const handleTimeChange = (e, field) => {
        const setter = field === 'from' ? setAvailableFrom : setAvailableUntil;
        const [hours, minutes] = e.target.value.split(':');
        setter(prevDate => {
            const newDate = new Date(prevDate || new Date());
            newDate.setHours(parseInt(hours, 10));
            newDate.setMinutes(parseInt(minutes, 10));
            return newDate;
        });
    };
    const handleToggleStudent = useCallback((studentId) => {
        if (originalRecipientIds.has(studentId)) {
            showToast("A student who already received the post cannot be unselected.", "info");
            return;
        }
        setTempRecipientIds(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(studentId)) newSet.delete(studentId);
            else newSet.add(studentId);
            return newSet;
        });
    }, [originalRecipientIds, showToast]);
    
    const handleToggleAllStudents = useCallback(() => {
        const allStudentIds = allStudents.map(s => s.id);
        const allSelected = tempRecipientIds.size === allStudentIds.length;
        setTempRecipientIds(prevSet => {
            const newSet = new Set(prevSet);
            if (allSelected) {
                allStudentIds.forEach(id => {
                    if (!originalRecipientIds.has(id)) newSet.delete(id);
                });
            } else {
                allStudentIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    }, [allStudents, tempRecipientIds.size, originalRecipientIds]);
    
    const handleQuizSettingsChange = useCallback((field, value) => {
        setQuizSettings(prev => ({ ...prev, [field]: value }));
    }, []);
    
    const handleUpdate = async () => {
        if (!post?.id || !classId) { showToast("Missing information to update dates.", "error"); return; }
        if (!postTitle.trim()) { showToast("Title cannot be empty.", "error"); return; }

        const recipientIdsArray = Array.from(tempRecipientIds);
        if (recipientIdsArray.length === 0) { showToast("You must select at least one student.", "error"); return; }
        
        const finalQuizSettings = { ...quizSettings };
        const finalAttempts = parseInt(finalQuizSettings.maxAttempts, 10);
        if (isNaN(finalAttempts) || finalAttempts < 1) finalQuizSettings.maxAttempts = 1; 
        else if (finalAttempts > 10) finalQuizSettings.maxAttempts = 10; 
        else finalQuizSettings.maxAttempts = finalAttempts; 

        setQuizSettings(finalQuizSettings);
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const classRef = doc(db, "classes", classId);
            const isAllStudentsSelected = recipientIdsArray.length === allStudents.length;
            
            const updatePayload = {
                title: postTitle,
                content: postContent,
                availableFrom: Timestamp.fromDate(availableFrom),
                availableUntil: Timestamp.fromDate(availableUntil),
                targetAudience: isAllStudentsSelected ? 'all' : 'specific',
                targetStudentIds: isAllStudentsSelected ? [] : recipientIdsArray, 
                quizSettings: finalQuizSettings, 
            };

            const postRef = doc(db, `classes/${classId}/posts`, post.id);
            batch.update(postRef, updatePayload);
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            await batch.commit();
            
            showToast("Activity settings updated successfully!", "success");
            onUpdate({ id: post.id, ...updatePayload }); 
            onClose();
        } catch (error) {
            console.error("Error updating settings:", error);
            showToast("Failed to update activity settings.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (!window.confirm("Are you sure? This will permanently delete the post and all associated student submissions.")) return;
        if (!post?.id || !classId) { showToast("Cannot delete. Missing required information.", "error"); return; }
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, `classes/${classId}/posts`, post.id);
            const classRef = doc(db, "classes", classId);
            const quizIds = post.quizzes?.map(q => q.id) || [];
            const lessonIds = post.lessons?.map(l => l.id) || [];

            // ... (Deletion Logic Retained) ...
            // Note: Logic kept exactly as requested, just shortened visual space here for brevity in response
            if (quizIds.length > 0) {
                const locksQuery = query(collection(db, 'quizLocks'), where('quizId', 'in', quizIds), where('classId', '==', classId));
                const locksSnapshot = await getDocs(locksQuery);
                locksSnapshot.forEach(lockDoc => { batch.delete(lockDoc.ref); });
            }
            if (quizIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < quizIds.length; i += 30) chunks.push(quizIds.slice(i, i + 30));
                for (const chunk of chunks) {
                    const submissionsQuery = query(collection(db, 'quizSubmissions'), where('quizId', 'in', chunk), where('classId', '==', classId));
                    const submissionsSnapshot = await getDocs(submissionsQuery);
                    submissionsSnapshot.forEach(submissionDoc => { batch.delete(submissionDoc.ref); });
                }
            }
            batch.delete(postRef);
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            await batch.commit();

            if (lessonIds.length > 0 && classData?.students && classData.students.length > 0) {
                const studentIds = classData.students.map(s => s.id);
                const cleanupBatch = writeBatch(db);
                let cleanupNeeded = false;
                try {
                    for (const studentId of studentIds) {
                        const userRef = doc(db, 'users', studentId);
                        const userSnap = await getDoc(userRef);
                        if (!userSnap.exists()) continue;
                        const userData = userSnap.data();
                        const completed = userData.completedLessons || [];
                        if (completed.some(id => lessonIds.includes(id))) {
                            cleanupNeeded = true;
                            cleanupBatch.update(userRef, { completedLessons: completed.filter(id => !lessonIds.includes(id)) });
                        }
                    }
                    if (cleanupNeeded) await cleanupBatch.commit();
                } catch (err) { console.error(err); }
            }

            showToast("Post deleted successfully!", "success");
            onUpdate({ id: post.id, isDeleted: true });
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            showToast("Failed to delete the post.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (date) => date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
    
    const filteredStudents = useMemo(() => {
        if (!searchTerm) return allStudents;
        const lowerSearch = searchTerm.toLowerCase();
        return allStudents.filter(s => s.searchName.includes(lowerSearch));
    }, [allStudents, searchTerm]);
    
    const isAllSelectedInClass = allStudents.length > 0 && tempRecipientIds.size === allStudents.length;
    const isPartiallySelected = tempRecipientIds.size > 0 && !isAllSelectedInClass;

    const mobileTabs = [
        { id: 'general', name: 'General', icon: Cog6ToothIcon },
        { id: 'recipients', name: `Recipients (${tempRecipientIds.size})`, icon: UsersIcon },
        { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="" 
            size="7xl" 
            roundedClass="rounded-xl sm:rounded-[2rem]"
            containerClassName="h-full p-2 sm:p-6 bg-black/50 flex items-center justify-center"
            contentClassName="p-0"
            showCloseButton={true}
        >
            <div className="p-4 sm:p-8 bg-[#f8fafc] dark:bg-[#0F1115] h-full sm:h-[90vh] max-h-full sm:max-h-[90vh] flex flex-col mx-auto w-full rounded-xl sm:rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden">
                
                {/* Header */}
                <header className="mb-4 sm:mb-6 flex-shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
                    <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Activity Settings
                    </h1>
                    <p className="text-xs sm:text-base font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">
                        {postTitle || 'Untitled Activity'}
                    </p>
                </header>

                {/* Mobile Tabs */}
                <nav className="lg:hidden flex-shrink-0 flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-slate-900 rounded-lg overflow-x-auto mb-4 scrollbar-hide">
                    {mobileTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMobileTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wide transition-all duration-200 ${
                                mobileTab === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </nav>
                
                {/* Main Content Grid */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 min-h-0">

                    {/* --- COLUMN 1: General Settings --- */}
                    <div className={`
                        ${mobileTab === 'general' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-4 sm:gap-6
                    `}>
                        <h2 className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-shrink-0">
                            Basic Info
                        </h2>
                        
                        <div className="flex-1 flex flex-col space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar min-h-0 pr-1 sm:pr-2">
                            <div className={solidPanel + " p-4 sm:p-6 space-y-4 sm:space-y-5"}> 
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Title</label>
                                    <input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} className={solidInput} />
                                </div>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Instructions</label>
                                    <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="Add context for your students..." rows={4} className={solidInput + " resize-none"} />
                                </div>
                            </div>

                            <div className={solidPanel + " p-4 sm:p-6 space-y-4 sm:space-y-5"}>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Start Date</label>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <div className="w-full sm:w-2/3">
                                            <DatePicker selected={availableFrom} onChange={(date) => handleDateChange(date, 'from')} dateFormat="MMM d, yyyy" className={solidInput} wrapperClassName="w-full" />
                                        </div>
                                        <input type="time" value={formatTime(availableFrom)} onChange={(e) => handleTimeChange(e, 'from')} className={`${solidInput} w-full sm:w-1/3 text-center`} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Due Date</label>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <div className="w-full sm:w-2/3">
                                            <DatePicker selected={availableUntil} onChange={(date) => handleDateChange(date, 'until')} dateFormat="MMM d, yyyy" className={solidInput} wrapperClassName="w-full" />
                                        </div>
                                        <input type="time" value={formatTime(availableUntil)} onChange={(e) => handleTimeChange(e, 'until')} className={`${solidInput} w-full sm:w-1/3 text-center`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- COLUMN 2: Recipients --- */}
                    <div className={`
                        ${mobileTab === 'recipients' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-3 sm:gap-4
                    `}>
                        <div className="flex justify-between items-end mb-1 sm:mb-2">
                            <h2 className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recipients</h2>
                            <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 sm:py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
                                {classData?.name || 'Class Roster'}
                            </span>
                        </div>
                        
                        <div className="relative flex-shrink-0">
                            <input type="text" placeholder="Filter students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${solidInput} pl-9 sm:pl-10`} />
                            <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className={`${solidPanel} flex-1 overflow-hidden flex flex-col min-h-0`} style={{ contentVisibility: 'auto' }}>
                            <header onClick={handleToggleAllStudents} className="flex items-center gap-3 p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
                                <NeumorphicCheckbox checked={isAllSelectedInClass} indeterminate={isPartiallySelected} onChange={handleToggleAllStudents} aria-label="Select all students" />
                                <label className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex-grow cursor-pointer select-none">Select All</label>
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-center min-w-[3rem]">{tempRecipientIds.size} / {allStudents.length}</span>
                            </header>

                            <ul className="flex-1 overflow-y-auto custom-scrollbar p-1.5 sm:p-2">
                                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                    const studentName = student.displayName; 
                                    const isSelected = tempRecipientIds.has(student.id);
                                    const isDisabled = originalRecipientIds.has(student.id);
                                    return (
                                        <li key={student.id} onClick={() => handleToggleStudent(student.id)} className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all mb-1 ${isDisabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-60 grayscale' : isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 cursor-pointer border border-indigo-100 dark:border-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border border-transparent'}`}>
                                            <NeumorphicCheckbox checked={isSelected} readOnly disabled={isDisabled} />
                                            <span className={`text-xs sm:text-sm font-medium flex-grow select-none ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{studentName}</span>
                                        </li>
                                    );
                                }) : (
                                    <li className="p-8 sm:p-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                                        <UserGroupIcon className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 opacity-50" />
                                        <p className="text-xs sm:text-sm font-medium">No students found.</p>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* --- COLUMN 3: Security Settings --- */}
                    <div className={`
                        ${mobileTab === 'security' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-4 sm:gap-6
                    `}>
                        <h2 className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-shrink-0">Anti-Cheating</h2>
                        
                        {hasQuizzes ? (
                            <div className={`${solidPanel} flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar min-h-0`}>
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <label className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200">Max Attempts</label>
                                        <input type="tel" inputMode="numeric" pattern="[0-9]*" value={quizSettings.maxAttempts} onChange={(e) => { const val = e.target.value; if (val === '' || /^[0-9]+$/.test(val)) { handleQuizSettingsChange('maxAttempts', val === '' ? '' : parseInt(val, 10)); } }} onBlur={() => { const currentVal = parseInt(quizSettings.maxAttempts, 10); if (isNaN(currentVal) || currentVal < 1) { handleQuizSettingsChange('maxAttempts', 1); } else if (currentVal > 10) { handleQuizSettingsChange('maxAttempts', 10); } else { handleQuizSettingsChange('maxAttempts', currentVal); } }} className={`${solidInput} w-14 sm:w-16 text-center !p-1.5 sm:!p-2`} />
                                    </div>

                                    <div>
                                        <div className="mb-3 sm:mb-4">
                                            <ToggleSwitch label="Enable Security Features" enabled={quizSettings.enabled} onChange={() => handleQuizSettingsChange('enabled', !quizSettings.enabled)} />
                                        </div>
                                        
                                        <div className={`space-y-0.5 sm:space-y-1 pl-3 sm:pl-4 border-l-2 border-slate-200 dark:border-slate-800 transition-all duration-300 ${quizSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                                            {[
                                                { key: 'shuffleQuestions', label: 'Shuffle Questions' },
                                                { key: 'lockOnLeave', label: 'Lock on Tab Switch' },
                                                { key: 'preventScreenCapture', label: 'Block Screenshots' },
                                                { key: 'detectDevTools', label: 'Detect DevTools' },
                                                { key: 'warnOnPaste', label: 'Warn on Paste' },
                                                { key: 'preventBackNavigation', label: 'No Back Navigation' },
                                            ].map((toggle) => (
                                                <div key={toggle.key} className="py-2 sm:py-3">
                                                    <ToggleSwitch label={toggle.label} enabled={quizSettings[toggle.key]} onChange={() => handleQuizSettingsChange(toggle.key, !quizSettings[toggle.key])} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <EmptyState icon={ShieldExclamationIcon} text="No Quizzes Found" subtext="Security settings are only available when a quiz is attached to this activity." />
                        )}
                    </div>
                </main>
                
                {/* Footer */}
                <footer className="flex-shrink-0 flex flex-wrap justify-between items-center pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-800 mt-2 gap-3 sm:gap-4">
                    <button onClick={handleDelete} className={deleteBtn} disabled={isSubmitting}>Delete</button>
                    
                    <div className="flex justify-end gap-2 sm:gap-3 ml-auto">
                        <button onClick={onClose} className={secondaryBtn} disabled={isSubmitting}>Cancel</button>
                        <button onClick={handleUpdate} className={primaryBtn} disabled={isSubmitting || tempRecipientIds.size === 0 || !postTitle.trim()}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Saving...
                                </span>
                            ) : 'Save'}
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;