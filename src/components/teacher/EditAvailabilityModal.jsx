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
    ShieldCheckIcon,
    ClockIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';

// --- DESIGN SYSTEM CONSTANTS (Premium & GPU Lite) ---
// Using optimized box-shadows and solid colors to prevent expensive backdrop-filter calculations
const solidPanel = "bg-white dark:bg-[#16181D] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] rounded-2xl transition-all";

// Inputs have minimum touch heights (h-12) for mobile webview standards
const solidInput = "w-full h-11 sm:h-12 bg-slate-50/50 dark:bg-[#0B0D12] border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-sm";
const textAreaInput = "w-full bg-slate-50/50 dark:bg-[#0B0D12] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-sm resize-none";

const primaryBtn = "px-6 h-11 sm:h-12 rounded-xl font-bold text-sm text-white shadow-lg shadow-indigo-500/25 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 border border-indigo-400/20 active:scale-[0.98] transform-gpu transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2";
const secondaryBtn = "px-6 h-11 sm:h-12 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1E2128] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transform-gpu transition-all duration-200 disabled:opacity-50 whitespace-nowrap flex items-center justify-center";
const deleteBtn = "px-6 h-11 sm:h-12 rounded-xl font-bold text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-900/30 active:scale-[0.98] transform-gpu transition-all duration-200 disabled:opacity-50 whitespace-nowrap flex items-center justify-center";

// --- MEMOIZED SUB-COMPONENTS ---

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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
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
                            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                                    <button
                                        key={`h-${h}`}
                                        onClick={() => setHour12(h)}
                                        className={`py-2 rounded-xl text-sm font-medium transition-colors ${hour12 === h ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#27272a] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {String(h).padStart(2, '0')}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
                                {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                                    <button
                                        key={`m-${m}`}
                                        onClick={() => setMinute(m)}
                                        className={`py-2 rounded-xl text-sm font-medium transition-colors ${minute === m ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#27272a] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {String(m).padStart(2, '0')}
                                    </button>
                                ))}
                            </div>

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
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            Set Time
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

const ToggleSwitch = React.memo(({ label, enabled, onChange, disabled = false }) => (
    <label className={`flex items-center justify-between group py-1 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mr-3 select-none">{label}</span>
        <div className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={onChange} disabled={disabled} />
            <div className={`w-12 h-6 rounded-full transition-colors duration-300 ease-in-out border ${
                enabled 
                ? 'bg-indigo-600 border-indigo-600' 
                : 'bg-slate-200 dark:bg-[#2A2E37] border-slate-300 dark:border-[#333842]'
            }`}></div>
            {/* transform-gpu ensures smooth animation on low-end devices */}
            <div className={`absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full shadow-md ring-0 transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                enabled ? 'translate-x-6' : 'translate-x-0'
            }`}></div>
        </div>
    </label>
));

const NeumorphicCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    
    return (
        <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 group">
            <input type="checkbox" ref={ref} checked={checked} {...props} className="sr-only" />
            <div className={`w-full h-full rounded-md sm:rounded-lg border transform-gpu transition-all duration-200 flex items-center justify-center ${
                checked 
                ? 'bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-500/30 group-hover:bg-indigo-500' 
                : 'bg-slate-50 dark:bg-[#16181D] border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
            }`}>
                <CheckIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white transform-gpu transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
            </div>
        </div>
    );
});

const EmptyState = React.memo(({ icon: Icon, text, subtext }) => (
    <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-full flex flex-col justify-center items-center bg-slate-50/50 dark:bg-[#0B0D12]">
        <div className="w-16 h-16 rounded-full bg-white dark:bg-[#16181D] shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
            <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-base font-bold text-slate-900 dark:text-white">{text}</p>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-[250px] leading-relaxed">{subtext}</p>
    </div>
));

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

// --- MAIN COMPONENT ---

const EditAvailabilityModal = ({ isOpen, onClose, post, classId, onUpdate, classData }) => {
    const { showToast } = useToast();
    
    // Form State
    const [availableFrom, setAvailableFrom] = useState(new Date());
    const [availableUntil, setAvailableUntil] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [quizSettings, setQuizSettings] = useState(defaultQuizSettings);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [mobileTab, setMobileTab] = useState('general'); 

    // Selection State
    const [tempRecipientIds, setTempRecipientIds] = useState(new Set()); 
    const [originalRecipientIds, setOriginalRecipientIds] = useState(new Set());

    // --- COMPUTED DATA ---

    const allStudents = useMemo(() => {
        const students = classData?.students || []; 
        return students.map(s => {
            const displayName = `${s.lastName || ''}, ${s.firstName || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || s.id;
            const searchName = `${s.firstName || ''} ${s.lastName || ''} ${s.displayName || ''}`.toLowerCase();
            return { ...s, displayName, searchName };
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [classData?.students]);

    const hasQuizzes = useMemo(() => (post?.quizzes || []).length > 0, [post?.quizzes]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return allStudents;
        const lowerSearch = searchTerm.toLowerCase();
        return allStudents.filter(s => s.searchName.includes(lowerSearch));
    }, [allStudents, searchTerm]);

    const isAllSelectedInClass = allStudents.length > 0 && tempRecipientIds.size === allStudents.length;
    const isPartiallySelected = tempRecipientIds.size > 0 && !isAllSelectedInClass;

    const mobileTabs = useMemo(() => [
        { id: 'general', name: 'General', icon: Cog6ToothIcon },
        { id: 'recipients', name: `Recipients (${tempRecipientIds.size})`, icon: UsersIcon },
        { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    ], [tempRecipientIds.size]);

    // --- EFFECTS ---

    useEffect(() => {
        if (isOpen && post) {
            setPostTitle(post.title || '');
            setPostContent(post.content || '');
            setAvailableFrom(post.availableFrom?.toDate() || new Date());
            setAvailableUntil(post.availableUntil?.toDate() || new Date());
            
            const loadedSettings = post.quizSettings || {};
            setQuizSettings({ ...defaultQuizSettings, ...loadedSettings });

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
        }
    }, [isOpen, post?.id, allStudents]);

    // --- DATE & TIME HANDLERS ---

    const handleDateChange = useCallback((date, field) => {
        if (field === 'from') {
            setAvailableFrom(prevDate => {
                const newDate = new Date(prevDate || new Date());
                if (date) newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                return newDate;
            });
        } else if (field === 'until') {
            if (date === null) {
                setAvailableUntil(null);
                return;
            }
            setAvailableUntil(prevDate => {
                const newDate = new Date(prevDate || new Date());
                if (date) newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                return newDate;
            });
        }
    }, []);

    const handleCustomTimeUpdate = useCallback((newDateObj, field) => {
        if (field === 'from') setAvailableFrom(newDateObj);
        if (field === 'until') setAvailableUntil(newDateObj);
    }, []);

    // --- HANDLERS ---

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
        setTempRecipientIds(prevSet => {
            const allSelected = prevSet.size === allStudentIds.length;
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
    }, [allStudents, originalRecipientIds]);
    
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
                availableUntil: availableUntil ? Timestamp.fromDate(availableUntil) : null,
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

            if (quizIds.length > 0) {
                const locksQuery = query(collection(db, 'quizLocks'), where('quizId', 'in', quizIds), where('classId', '==', classId));
                const locksSnapshot = await getDocs(locksQuery);
                locksSnapshot.forEach(lockDoc => batch.delete(lockDoc.ref));
            }

            if (quizIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < quizIds.length; i += 30) chunks.push(quizIds.slice(i, i + 30));
                
                const snapshotPromises = chunks.map(chunk => 
                    getDocs(query(collection(db, 'quizSubmissions'), where('quizId', 'in', chunk), where('classId', '==', classId)))
                );
                
                const snapshots = await Promise.all(snapshotPromises);
                snapshots.forEach(snap => {
                    snap.forEach(doc => batch.delete(doc.ref));
                });
            }

            batch.delete(postRef);
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            await batch.commit();

            if (lessonIds.length > 0 && classData?.students && classData.students.length > 0) {
                const cleanupBatch = writeBatch(db);
                let cleanupNeeded = false;
                
                const studentIds = classData.students.map(s => s.id);
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
                } catch (err) { console.error("Error cleaning student progress:", err); }
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="" 
            size="7xl" 
            roundedClass="rounded-2xl sm:rounded-[2rem]"
            containerClassName="h-[100dvh] sm:h-full p-0 sm:p-6 bg-slate-900/60 dark:bg-black/60 flex items-end sm:items-center justify-center"
            contentClassName="p-0 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
            showCloseButton={true}
        >
            <div className="p-4 sm:p-8 bg-[#F8FAFC] dark:bg-[#0A0C10] h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh] flex flex-col mx-auto w-full rounded-t-3xl sm:rounded-[2.5rem] shadow-2xl border-t sm:border border-white/50 dark:border-white/10 overflow-hidden relative">
                
                {/* Mobile Handle */}
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

                {/* Header */}
                <header className="mb-5 sm:mb-8 flex-shrink-0 flex flex-col">
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Activity Settings
                    </h1>
                    <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {postTitle || 'Untitled Activity'}
                    </p>
                </header>

                {/* Mobile Tabs */}
                <nav className="lg:hidden flex-shrink-0 flex items-center gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl overflow-x-auto mb-6 scrollbar-hide border border-slate-200 dark:border-slate-800">
                    {mobileTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMobileTab(tab.id)}
                            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 h-10 rounded-lg font-bold text-xs uppercase tracking-wide transition-all duration-200 ${
                                mobileTab === tab.id
                                    ? 'bg-white dark:bg-[#1E2128] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </nav>
                
                {/* Main Content Grid */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 min-h-0 pb-4">

                    {/* --- COLUMN 1: General Settings --- */}
                    <div className={`
                        ${mobileTab === 'general' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-5
                    `}>
                        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-shrink-0 pl-1">
                            Basic Info
                        </h2>
                        
                        <div className="flex-1 flex flex-col space-y-5 overflow-y-auto custom-scrollbar min-h-0 pr-1">
                            <div className={solidPanel + " p-5 space-y-5"}> 
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Title</label>
                                    <input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} className={solidInput} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Instructions</label>
                                    <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="Add context for your students..." rows={4} className={textAreaInput} />
                                </div>
                            </div>

                            <div className={solidPanel + " p-5 space-y-6"}>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Start Date & Time</label>
                                    <div className="flex gap-3">
                                        <div className="w-3/5 relative">
                                            <DatePicker
                                                selected={availableFrom}
                                                onChange={(date) => handleDateChange(date, 'from')}
                                                dateFormat="MMM d, yyyy"
                                                className={`${solidInput} text-center`}
                                                popperPlacement="bottom-start"
                                                wrapperClassName="w-full"
                                            />
                                        </div>
                                        <div className="w-2/5">
                                            <CustomTimePicker 
                                                selectedDate={availableFrom} 
                                                onChange={(date) => handleCustomTimeUpdate(date, 'from')} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">Due Date & Time (Optional)</label>
                                    <div className="flex gap-3">
                                        <div className="w-3/5 relative">
                                            <DatePicker
                                                selected={availableUntil}
                                                onChange={(date) => handleDateChange(date, 'until')}
                                                dateFormat="MMM d, yyyy"
                                                className={`${solidInput} text-center`}
                                                isClearable={true}
                                                placeholderText="No end date"
                                                popperPlacement="bottom-start"
                                                wrapperClassName="w-full"
                                            />
                                        </div>
                                        <div className="w-2/5">
                                            <CustomTimePicker 
                                                selectedDate={availableUntil} 
                                                onChange={(date) => handleCustomTimeUpdate(date, 'until')} 
                                                disabled={availableUntil === null}
                                            />
                                        </div>
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
                        <div className="flex justify-between items-center mb-1">
                            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Recipients</h2>
                            <span className="text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-500/20">
                                {classData?.name || 'Class Roster'}
                            </span>
                        </div>
                        
                        <div className="relative flex-shrink-0">
                            <input type="text" placeholder="Filter students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${solidInput} pl-11`} />
                            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className={`${solidPanel} flex-1 overflow-hidden flex flex-col min-h-0`} style={{ contentVisibility: 'auto' }}>
                            <header onClick={handleToggleAllStudents} className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex-shrink-0">
                                <NeumorphicCheckbox checked={isAllSelectedInClass} indeterminate={isPartiallySelected} onChange={handleToggleAllStudents} aria-label="Select all students" />
                                <label className="font-bold text-sm text-slate-800 dark:text-slate-200 flex-grow cursor-pointer select-none">Select All Students</label>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-center min-w-[3.5rem] border border-slate-200 dark:border-slate-700">
                                    {tempRecipientIds.size} / {allStudents.length}
                                </span>
                            </header>

                            <ul className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                    const isSelected = tempRecipientIds.has(student.id);
                                    const isDisabled = originalRecipientIds.has(student.id);
                                    return (
                                        <li key={student.id} onClick={() => handleToggleStudent(student.id)} className={`flex items-center gap-4 p-3 rounded-xl transition-all mb-1 ${isDisabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-50 grayscale' : isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 cursor-pointer border border-indigo-200/50 dark:border-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent'}`}>
                                            <NeumorphicCheckbox checked={isSelected} readOnly disabled={isDisabled} />
                                            <span className={`text-sm font-semibold flex-grow select-none ${isSelected ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{student.displayName}</span>
                                        </li>
                                    );
                                }) : (
                                    <li className="p-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                                        <UserGroupIcon className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No students found.</p>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* --- COLUMN 3: Security Settings --- */}
                    <div className={`
                        ${mobileTab === 'security' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0 gap-5
                    `}>
                        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-shrink-0 pl-1">Anti-Cheating</h2>
                        
                        {hasQuizzes ? (
                            <div className={`${solidPanel} flex-1 p-5 overflow-y-auto custom-scrollbar min-h-0`}>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0B0D12] rounded-xl border border-slate-200 dark:border-slate-800">
                                        <label className="font-bold text-sm text-slate-800 dark:text-slate-200">Maximum Attempts</label>
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
                                            className={`${solidInput} w-16 text-center !px-2 font-bold text-indigo-600 dark:text-indigo-400`} 
                                        />
                                    </div>

                                    <div className="bg-slate-50/50 dark:bg-[#0B0D12]/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-800/50">
                                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                            <ToggleSwitch label="Enable Security Features" enabled={quizSettings.enabled} onChange={() => handleQuizSettingsChange('enabled', !quizSettings.enabled)} />
                                        </div>
                                        
                                        <div className={`space-y-1.5 transition-all duration-300 transform-gpu ${quizSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                                            {[
                                                { key: 'shuffleQuestions', label: 'Shuffle Questions' },
                                                { key: 'lockOnLeave', label: 'Lock on Tab Switch' },
                                                { key: 'preventScreenCapture', label: 'Block Screenshots' },
                                                { key: 'detectDevTools', label: 'Detect DevTools' },
                                                { key: 'warnOnPaste', label: 'Warn on Paste' },
                                                { key: 'preventBackNavigation', label: 'No Back Navigation' },
                                            ].map((toggle) => (
                                                <div key={toggle.key} className="py-2">
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
                <footer className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-800/80 mt-2 gap-4">
                    <button onClick={handleDelete} className={`${deleteBtn} w-full sm:w-auto order-2 sm:order-1`} disabled={isSubmitting}>
                        Delete Activity
                    </button>
                    
                    <div className="flex flex-row justify-end w-full sm:w-auto gap-3 sm:gap-4 order-1 sm:order-2">
                        <button onClick={onClose} className={`${secondaryBtn} flex-1 sm:flex-none`} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button onClick={handleUpdate} className={`${primaryBtn} flex-1 sm:flex-none`} disabled={isSubmitting || tempRecipientIds.size === 0 || !postTitle.trim()}>
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;