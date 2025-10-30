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

// --- (Reusable NeumorphicCheckbox component remains unchanged) ---
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
            <span className="w-full h-full bg-neumorphic-base rounded-md shadow-neumorphic-inset flex items-center justify-center transition-all peer-checked:bg-blue-500 peer-checked:shadow-neumorphic">
                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
        </div>
    );
});

// --- (Reusable ToggleSwitch component remains unchanged) ---
const ToggleSwitch = ({ label, enabled, onChange, disabled = false }) => (
    <label className={`flex items-center justify-between ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <span className="font-medium text-slate-800">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={onChange} disabled={disabled} />
            <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'translate-x-6' : ''}`}></div>
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

// --- (Empty State for 3rd Column remains unchanged) ---
const EmptyState = ({ icon: Icon, text, subtext }) => (
    <div className="text-center p-8 bg-neumorphic-base rounded-2xl shadow-neumorphic-inset h-full flex flex-col justify-center items-center">
        <Icon className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
        <p className="text-xl font-semibold text-slate-700">{text}</p>
        <p className="mt-2 text-base text-slate-500">{subtext}</p>
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
    
    // --- NEW STATE FOR MOBILE TABS ---
    const [mobileTab, setMobileTab] = useState('general'); // 'general', 'recipients', 'security'


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
                quizSettings: quizSettings,
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
            size="screen"
            roundedClass="rounded-2xl"
            containerClassName="h-full p-2 sm:p-4 bg-black/30 backdrop-blur-sm" // MODIFIED: p-4 to p-2 sm:p-4
            contentClassName="p-0"
            showCloseButton={true}
        >
            <div className="p-2 sm:p-4 md:p-6 bg-neumorphic-base h-[95vh] sm:h-[90vh] max-h-[95vh] flex flex-col mx-auto w-full max-w-7xl rounded-2xl"> {/* MODIFIED: Padding and height */}
                
                <header className="mb-4 p-3 sm:p-4 bg-neumorphic-base rounded-2xl shadow-neumorphic flex-shrink-0"> {/* MODIFIED: Padding */}
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Edit Activity Settings</h1> {/* MODIFIED: Text size */}
                    <p className="text-base sm:text-lg text-slate-600 mt-1 truncate"> {/* MODIFIED: Text size & added truncate */}
                        {postTitle || 'Untitled Activity'}
                    </p>
                </header>

                {/* --- NEW: MOBILE TAB NAVIGATION --- */}
                <nav className="lg:hidden flex-shrink-0 flex items-center gap-2 p-2 bg-neumorphic-base rounded-2xl shadow-neumorphic overflow-x-auto mb-4">
                    {mobileTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMobileTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                mobileTab === tab.id
                                    ? 'shadow-neumorphic-inset text-blue-600'
                                    : 'text-slate-700 hover:shadow-neumorphic-inset'
                            }`}
                        >
                            <tab.icon className="h-5 w-5" />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </nav>
                
                {/* --- MODIFIED: Main content area is now a grid, columns are conditionally hidden on mobile --- */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

                    {/* --- COLUMN 1: General Settings --- */}
                    {/* MODIFIED: Added conditional classes, removed overflow-y-auto, and added a scrolling wrapper inside */}
                    <div className={`
                        ${mobileTab === 'general' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0
                    `}>
                        <h2 className="text-xl font-bold text-slate-800 flex-shrink-0 mb-4">General Settings</h2>
                        
                        {/* This new wrapper handles scrolling for this column's content */}
                        <div className="flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar p-2 pr-4 min-h-0">
                            <div className="bg-neumorphic-base p-5 rounded-xl shadow-neumorphic space-y-4"> 
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={postTitle}
                                    onChange={(e) => setPostTitle(e.target.value)}
                                    className="w-full p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                                />
                                <label className="block text-sm font-medium text-slate-700 mb-1">Comments (Optional)</label>
                                <textarea
                                    value={postContent}
                                    onChange={(e) => setPostContent(e.target.value)}
                                    placeholder="Add an optional comment for your students..."
                                    rows={3}
                                    className="w-full p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 resize-none"
                                />
                            </div>

                            <div className="bg-neumorphic-base p-5 rounded-xl shadow-neumorphic space-y-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Period: Available From</label>
                                <div className="flex gap-2">
                                    <DatePicker
                                        selected={availableFrom}
                                        onChange={(date) => handleDateChange(date, 'from')}
                                        dateFormat="MMMM d, yyyy"
                                        className="w-2/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                                    />
                                    <input
                                        type="time"
                                        value={formatTime(availableFrom)}
                                        onChange={(e) => handleTimeChange(e, 'from')}
                                        className="w-1/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                                    />
                                </div>

                                <label className="block text-sm font-medium text-slate-700 mb-1">Available Until</label>
                                <div className="flex gap-2">
                                    <DatePicker
                                        selected={availableUntil}
                                        onChange={(date) => handleDateChange(date, 'until')}
                                        dateFormat="MMMM d, yyyy"
                                        className="w-2/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                                    />
                                    <input
                                        type="time"
                                        value={formatTime(availableUntil)}
                                        onChange={(e) => handleTimeChange(e, 'until')}
                                        className="w-1/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- COLUMN 2: Recipients --- */}
                    {/* MODIFIED: Added conditional classes, removed space-y-4, and added margins to children */}
                    <div className={`
                        ${mobileTab === 'recipients' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0
                    `}>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Recipients ({classData?.name || 'Class Roster'})</h2>
                        
                        <div className="relative flex-shrink-0 mb-4">
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-3 pl-10 bg-neumorphic-base shadow-neumorphic-inset rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        {/* This wrapper is now a flex-1 child of a flex-col parent, so it will fill space and allow its own child (the ul) to scroll */}
                        <div className="flex-1 bg-neumorphic-base rounded-xl shadow-neumorphic overflow-hidden flex flex-col min-h-0">
                            <header 
                                onClick={handleToggleAllStudents}
                                className="flex items-center gap-3 p-4 border-b border-black/10 cursor-pointer hover:bg-black/5 flex-shrink-0"
                            >
                                <NeumorphicCheckbox
                                    checked={isAllSelectedInClass}
                                    indeterminate={isPartiallySelected}
                                    onChange={handleToggleAllStudents}
                                    aria-label="Select all students"
                                />
                                <label className="font-semibold text-slate-800 flex-grow cursor-pointer select-none">
                                    Select all students
                                </label>
                                <span className="text-sm text-slate-500 font-normal">
                                    ({tempRecipientIds.size}/{allStudents.length})
                                </span>
                            </header>

                            <ul className="flex-1 overflow-y-auto custom-scrollbar">
                                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                    const studentName = student.displayName; 
                                    const isSelected = tempRecipientIds.has(student.id);
                                    const isDisabled = originalRecipientIds.has(student.id);
                                    return (
                                        <li
                                            key={student.id}
                                            onClick={() => handleToggleStudent(student.id)}
                                            className={`flex items-center gap-3 p-4 transition-colors border-t border-black/5 first:border-t-0 ${
                                                isDisabled ? 'bg-gray-100 cursor-default opacity-80' : 
                                                isSelected ? 'bg-blue-500/10 cursor-pointer' : 'hover:bg-black/5 cursor-pointer'
                                            }`}
                                        >
                                            <NeumorphicCheckbox checked={isSelected} readOnly disabled={isDisabled} />
                                            <span className="text-slate-800 flex-grow select-none">{studentName}</span>
                                            {isSelected && <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                                        </li>
                                    );
                                }) : (
                                    <li className="p-8 text-center text-slate-500">
                                        <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                        No students match your search.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* --- COLUMN 3: Security Settings --- */}
                    {/* MODIFIED: Added conditional classes, removed space-y-6, and added margin to h2 */}
                    <div className={`
                        ${mobileTab === 'security' ? 'flex' : 'hidden'} 
                        lg:flex flex-col min-h-0
                    `}>
                        <h2 className="text-xl font-bold text-slate-800 flex-shrink-0 mb-4">Quiz Security Settings</h2>
                        
                        {hasQuizzes ? (
                            // This wrapper will now correctly take up flex-1 space and allow its content to scroll
                            <div className="flex-1 bg-neumorphic-base p-5 rounded-xl shadow-neumorphic space-y-4 overflow-y-auto custom-scrollbar min-h-0 pr-4">
                                <div className="space-y-4">
                                    <ToggleSwitch
                                        label="Enable Anti-Cheating Features"
                                        enabled={quizSettings.enabled}
                                        onChange={() => handleQuizSettingsChange('enabled', !quizSettings.enabled)}
                                    />
                                    {quizSettings.enabled && (
                                        <div className="pl-4 pt-4 mt-4 border-t border-black/10 space-y-3">
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
                                                label="Prevent Screen Recording & Screenshots"
                                                enabled={quizSettings.preventScreenCapture}
                                                onChange={() => handleQuizSettingsChange('preventScreenCapture', !quizSettings.preventScreenCapture)}
                                            />
                                            <ToggleSwitch
                                                label="Detect Developer Tools (Desktop)"
                                                enabled={quizSettings.detectDevTools}
                                                onChange={() => handleQuizSettingsChange('detectDevTools', !quizSettings.detectDevTools)}
                                            />
                                            <ToggleSwitch
                                                label="Issue Warning on Paste"
                                                enabled={quizSettings.warnOnPaste}
                                                onChange={() => handleQuizSettingsChange('warnOnPaste', !quizSettings.warnOnPaste)}
                                            />
                                            <ToggleSwitch
                                                label="Prevent Going Back to Questions"
                                                enabled={quizSettings.preventBackNavigation}
                                                onChange={() => handleQuizSettingsChange('preventBackNavigation', !quizSettings.preventBackNavigation)}
                                            />
                                            
                                            <div className="flex items-center justify-between pt-2">
                                                <label className="font-medium text-slate-800">Max Attempts</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={quizSettings.maxAttempts}
                                                    onChange={(e) => handleQuizSettingsChange('maxAttempts', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                    className="w-20 p-2 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={ShieldExclamationIcon}
                                text="No Quiz Settings"
                                subtext="This post does not contain any quizzes. Security settings are only available for quizzes."
                            />
                        )}
                    </div>
                </main>
                {/* --- END MODIFICATION --- */}

                {/* --- Footer (Unchanged from last step) --- */}
                <footer className="flex-shrink-0 flex justify-between items-center pt-6 border-t border-black/10 mt-6">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-sm font-semibold text-red-600 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        Delete Post
                    </button>
                    
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button onClick={handleUpdate} className="px-4 py-2 text-sm font-semibold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50" disabled={isSubmitting || tempRecipientIds.size === 0 || !postTitle.trim()}>
                            {isSubmitting ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;