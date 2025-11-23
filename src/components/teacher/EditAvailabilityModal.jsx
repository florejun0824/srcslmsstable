import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../../services/firebase';
import { doc, updateDoc, Timestamp, collection, query, where, getDocs, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
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

// --- DESIGN SYSTEM CONSTANTS (New) ---
const glassPanel = "bg-white/60 dark:bg-[#1a1d24]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-lg rounded-2xl transition-all";
const glassInput = "w-full bg-white/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";
const primaryBtn = "px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-500/30 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-blue-400/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtn = "px-6 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/20 dark:border-white/5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50";
const deleteBtn = "px-6 py-3 rounded-xl font-bold text-sm text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50";

// --- (Refined Checkbox - Logic Unchanged, Style Updated) ---
const NeumorphicCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    
    return (
        <div className="relative w-5 h-5 flex-shrink-0">
            <input 
                type="checkbox" 
                ref={ref} 
                checked={checked} 
                {...props} 
                className="sr-only peer" 
            />
            {/* Replaced neumorphic style with glass style */}
            <span className={`w-full h-full rounded-md border flex items-center justify-center transition-all duration-200 ${
                checked 
                ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30' 
                : 'bg-white/50 dark:bg-white/5 border-slate-300 dark:border-slate-600 hover:border-blue-400'
            }`}>
                <CheckIcon className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
            </span>
        </div>
    );
});

// --- (Refined ToggleSwitch - Logic Unchanged, Style Updated) ---
const ToggleSwitch = ({ label, enabled, onChange, disabled = false }) => (
    <label className={`flex items-center justify-between group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <span className="font-medium text-sm text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={onChange} disabled={disabled} />
            <div className={`block w-12 h-7 rounded-full transition-all duration-300 ${
                enabled 
                ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                : 'bg-slate-200 dark:bg-slate-700 inner-shadow'
            }`}></div>
            <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-5' : ''}`}></div>
        </div>
    </label>
);

// --- (Default settings object remains unchanged) ---
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

// --- (Refined Empty State - Logic Unchanged) ---
const EmptyState = ({ icon: Icon, text, subtext }) => (
    <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl h-full flex flex-col justify-center items-center opacity-70">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{text}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
);


// --- Component starts here ---

const EditAvailabilityModal = ({ isOpen, onClose, post, classId, onUpdate, classData }) => {
    // (All state and hooks remain unchanged)
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


    const allStudents = useMemo(() => {
        const students = classData?.students || []; 
        return students.map(s => {
            const displayName = `${s.lastName || ''}, ${s.firstName || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || s.id;
            const searchName = `${s.firstName || ''} ${s.lastName || ''} ${s.displayName || ''}`.toLowerCase();
            return { ...s, displayName: displayName, searchName: searchName };
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [classData]);

    const postUnitId = useMemo(() => {
        if (post?.lessons && post.lessons.length > 0) return post.lessons[0].unitId;
        if (post?.quizzes && post.quizzes.length > 0) return post.quizzes[0].unitId;
        return post?.unitId; 
    }, [post]);

    const hasQuizzes = useMemo(() => (post?.quizzes || []).length > 0, [post]);

    useEffect(() => {
        if (post) {
            setPostTitle(post.title || '');
            setPostContent(post.content || '');
            setAvailableFrom(post.availableFrom?.toDate() || new Date());
            setAvailableUntil(post.availableUntil?.toDate() || new Date());
            
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
    }, [post, allStudents]); 

    // (All helper functions and handlers remain unchanged)
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
        const unselectedOriginals = Array.from(originalRecipientIds).filter(id => !tempRecipientIds.has(id));
        if (unselectedOriginals.length > 0) { showToast("Cannot unselect a student who already received the post.", "error"); return; }
        
        const finalQuizSettings = { ...quizSettings };
        const finalAttempts = parseInt(finalQuizSettings.maxAttempts, 10);
        
        if (isNaN(finalAttempts) || finalAttempts < 1) {
            finalQuizSettings.maxAttempts = 1; 
        } else if (finalAttempts > 10) {
            finalQuizSettings.maxAttempts = 10; 
        } else {
            finalQuizSettings.maxAttempts = finalAttempts; 
        }

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
        if (!window.confirm("Are you sure? This will permanently delete the post and all associated student submissions. This cannot be undone.")) return;
        if (!post?.id || !classId) { showToast("Cannot delete. Missing required information.", "error"); return; }
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, `classes/${classId}/posts`, post.id);
            const classRef = doc(db, "classes", classId);
            
            const quizIds = post.quizzes?.map(q => q.id) || [];
            const lessonIds = post.lessons?.map(l => l.id) || [];

            if (quizIds.length > 0) {
                const locksQuery = query(collection(db, 'quizLocks'), where('quizId', 'in', quizIds), where('classId', '==', classId));
                const locksSnapshot = await getDocs(locksQuery);
                locksSnapshot.forEach(lockDoc => { batch.delete(lockDoc.ref); });
            }

            if (quizIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < quizIds.length; i += 30) {
                    chunks.push(quizIds.slice(i, i + 30));
                }
                for (const chunk of chunks) {
                    const submissionsQuery = query(
                        collection(db, 'quizSubmissions'),
                        where('quizId', 'in', chunk),
                        where('classId', '==', classId)
                    );
                    const submissionsSnapshot = await getDocs(submissionsQuery);
                    submissionsSnapshot.forEach(submissionDoc => {
                        batch.delete(submissionDoc.ref);
                    });
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
                        const hasDeletedLesson = completed.some(id => lessonIds.includes(id));

                        if (hasDeletedLesson) {
                            cleanupNeeded = true;
                            const updatedCompleted = completed.filter(id => !lessonIds.includes(id));
                            cleanupBatch.update(userRef, { completedLessons: updatedCompleted });
                        }
                    }
                    if (cleanupNeeded) {
                        await cleanupBatch.commit();
                    }
                } catch (err) {
                    console.error('Error cleaning up student completedLessons:', err);
                    showToast("Post deleted, but failed to clean up student progress records.", "warning");
                }
            }

            showToast("Post and all associated data deleted successfully!", "success");
            onUpdate({ id: post.id, isDeleted: true });
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            showToast("Failed to delete the post.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };
    const filteredStudents = useMemo(() => {
        if (!searchTerm) return allStudents;
        const lowerSearch = searchTerm.toLowerCase();
        return allStudents.filter(s => s.searchName.includes(lowerSearch));
    }, [allStudents, searchTerm]);
    const isAllSelectedInClass = allStudents.length > 0 && tempRecipientIds.size === allStudents.length;
    const isPartiallySelected = tempRecipientIds.size > 0 && !isAllSelectedInClass;

    const mobileTabs = [
        { id: 'general', name: 'General', icon: Cog6ToothIcon },
        { id: 'recipients', name: `Recipients (${tempRecipientIds.size}/${allStudents.length})`, icon: UsersIcon },
        { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="" 
            size="7xl" 
            roundedClass="rounded-[2rem]"
            // Updated container/content styles for glassmorphism
            containerClassName="h-full p-2 sm:p-6 bg-slate-900/40 backdrop-blur-md"
            contentClassName="p-0"
            showCloseButton={true}
        >
            <div className="p-4 sm:p-6 md:p-8 bg-white/90 dark:bg-[#121212]/95 h-[90vh] max-h-[90vh] flex flex-col mx-auto w-full rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/5">
                
                {/* Header */}
                <header className="mb-6 flex-shrink-0 border-b border-slate-200/60 dark:border-white/5 pb-4">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Activity Settings
                    </h1>
                    <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {postTitle || 'Untitled Activity'}
                    </p>
                </header>

                {/* Mobile Tabs (Updated to Pills) */}
                <nav className="lg:hidden flex-shrink-0 flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl overflow-x-auto mb-4">
                    {mobileTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMobileTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-200 ${
                                mobileTab === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </nav>
                
                {/* Main Content Grid */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">

                    {/* --- COLUMN 1: General Settings --- */}
                    <div className={`
                        ${mobileTab === 'general' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-6
                    `}>
                        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-shrink-0">
                            Basic Info
                        </h2>
                        
                        <div className="flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar min-h-0 pr-2">
                            <div className={glassPanel + " p-6 space-y-5"}> 
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Title</label>
                                    <input
                                        type="text"
                                        value={postTitle}
                                        onChange={(e) => setPostTitle(e.target.value)}
                                        className={glassInput}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Instructions (Optional)</label>
                                    <textarea
                                        value={postContent}
                                        onChange={(e) => setPostContent(e.target.value)}
                                        placeholder="Add context for your students..."
                                        rows={4}
                                        className={glassInput + " resize-none"}
                                    />
                                </div>
                            </div>

                            <div className={glassPanel + " p-6 space-y-5"}>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Start Date</label>
                                    <div className="flex gap-3">
                                        <div className="w-2/3">
                                            <DatePicker
                                                selected={availableFrom}
                                                onChange={(date) => handleDateChange(date, 'from')}
                                                dateFormat="MMM d, yyyy"
                                                className={glassInput}
                                            />
                                        </div>
                                        <input
                                            type="time"
                                            value={formatTime(availableFrom)}
                                            onChange={(e) => handleTimeChange(e, 'from')}
                                            className={`${glassInput} w-1/3 text-center`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Due Date</label>
                                    <div className="flex gap-3">
                                        <div className="w-2/3">
                                            <DatePicker
                                                selected={availableUntil}
                                                onChange={(date) => handleDateChange(date, 'until')}
                                                dateFormat="MMM d, yyyy"
                                                className={glassInput}
                                            />
                                        </div>
                                        <input
                                            type="time"
                                            value={formatTime(availableUntil)}
                                            onChange={(e) => handleTimeChange(e, 'until')}
                                            className={`${glassInput} w-1/3 text-center`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- COLUMN 2: Recipients --- */}
                    <div className={`
                        ${mobileTab === 'recipients' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-4
                    `}>
                        <div className="flex justify-between items-end mb-2">
                            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Recipients
                            </h2>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                {classData?.name || 'Class Roster'}
                            </span>
                        </div>
                        
                        <div className="relative flex-shrink-0">
                            <input
                                type="text"
                                placeholder="Filter students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`${glassInput} pl-10`}
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className={`${glassPanel} flex-1 overflow-hidden flex flex-col min-h-0`}>
                            <header 
                                onClick={handleToggleAllStudents}
                                className="flex items-center gap-3 p-4 border-b border-slate-200/50 dark:border-white/5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                            >
                                <NeumorphicCheckbox
                                    checked={isAllSelectedInClass}
                                    indeterminate={isPartiallySelected}
                                    onChange={handleToggleAllStudents}
                                    aria-label="Select all students"
                                />
                                <label className="font-bold text-sm text-slate-700 dark:text-slate-200 flex-grow cursor-pointer select-none">
                                    Select All
                                </label>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-center min-w-[3rem]">
                                    {tempRecipientIds.size} / {allStudents.length}
                                </span>
                            </header>

                            <ul className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                    const studentName = student.displayName; 
                                    const isSelected = tempRecipientIds.has(student.id);
                                    const isDisabled = originalRecipientIds.has(student.id);
                                    return (
                                        <li
                                            key={student.id}
                                            onClick={() => handleToggleStudent(student.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl transition-all mb-1 ${
                                                isDisabled ? 'bg-slate-50 dark:bg-white/5 cursor-not-allowed opacity-60 grayscale' : 
                                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer'
                                            }`}
                                        >
                                            <NeumorphicCheckbox checked={isSelected} readOnly disabled={isDisabled} />
                                            <span className={`text-sm font-medium flex-grow select-none ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {studentName}
                                            </span>
                                        </li>
                                    );
                                }) : (
                                    <li className="p-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                                        <UserGroupIcon className="w-10 h-10 mb-3 opacity-50" />
                                        <p className="text-sm font-medium">No students found.</p>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* --- COLUMN 3: Security Settings --- */}
                    <div className={`
                        ${mobileTab === 'security' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-6
                    `}>
                        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-shrink-0">
                            Anti-Cheating
                        </h2>
                        
                        {hasQuizzes ? (
                            <div className={`${glassPanel} flex-1 p-6 overflow-y-auto custom-scrollbar min-h-0`}>
                                <div className="space-y-6">
                                    
                                    {/* Max Attempts */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                                        <label className="font-bold text-sm text-slate-700 dark:text-slate-200">Max Attempts</label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={quizSettings.maxAttempts}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^[0-9]+$/.test(val)) {
                                                    handleQuizSettingsChange('maxAttempts', val === '' ? '' : parseInt(val, 10));
                                                }
                                            }}
                                            onBlur={() => {
                                                const currentVal = parseInt(quizSettings.maxAttempts, 10);
                                                if (isNaN(currentVal) || currentVal < 1) {
                                                    handleQuizSettingsChange('maxAttempts', 1); 
                                                } else if (currentVal > 10) {
                                                    handleQuizSettingsChange('maxAttempts', 10); 
                                                } else {
                                                    handleQuizSettingsChange('maxAttempts', currentVal);
                                                }
                                            }}
                                            className={`${glassInput} w-16 text-center !p-2`}
                                        />
                                    </div>

                                    {/* Toggles Group */}
                                    <div>
                                        <div className="mb-4">
                                            <ToggleSwitch
                                                label="Enable Security Features"
                                                enabled={quizSettings.enabled}
                                                onChange={() => handleQuizSettingsChange('enabled', !quizSettings.enabled)}
                                            />
                                        </div>
                                        
                                        <div className={`space-y-1 pl-4 border-l-2 border-slate-200 dark:border-white/10 transition-all duration-300 ${quizSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                                            {[
                                                { key: 'shuffleQuestions', label: 'Shuffle Questions' },
                                                { key: 'lockOnLeave', label: 'Lock on Tab Switch' },
                                                { key: 'preventScreenCapture', label: 'Block Screenshots' },
                                                { key: 'detectDevTools', label: 'Detect DevTools' },
                                                { key: 'warnOnPaste', label: 'Warn on Paste' },
                                                { key: 'preventBackNavigation', label: 'No Back Navigation' },
                                            ].map((toggle) => (
                                                <div key={toggle.key} className="py-3">
                                                    <ToggleSwitch
                                                        label={toggle.label}
                                                        enabled={quizSettings[toggle.key]}
                                                        onChange={() => handleQuizSettingsChange(toggle.key, !quizSettings[toggle.key])}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={ShieldExclamationIcon}
                                text="No Quizzes Found"
                                subtext="Security settings are only available when a quiz is attached to this activity."
                            />
                        )}
                    </div>
                </main>
                
                {/* Footer */}
                <footer className="flex-shrink-0 flex flex-wrap justify-between items-center pt-6 border-t border-slate-200/60 dark:border-white/5 mt-2 gap-4">
                    <button
                        onClick={handleDelete}
                        className={deleteBtn}
                        disabled={isSubmitting}
                    >
                        Delete Activity
                    </button>
                    
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className={secondaryBtn} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button onClick={handleUpdate} className={primaryBtn} disabled={isSubmitting || tempRecipientIds.size === 0 || !postTitle.trim()}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </span>
                            ) : 'Save Changes'}
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;