// src/components/teacher/ClassOverviewModal.jsx

import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import QuizScoresModal from './QuizScoresModal';
import ScoresTab from './ScoresTab';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    documentId,
    updateDoc,
    doc,
    deleteDoc,
    onSnapshot,
    getDocs,
    getDoc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import {
    TrashIcon,
    CalendarDaysIcon,
    UsersIcon, 
    PlusCircleIcon,
    ChevronDownIcon,
    XMarkIcon,
    ClockIcon,
    DocumentChartBarIcon,
    ChatBubbleBottomCenterTextIcon,
    PlayCircleIcon,
    ClipboardDocumentListIcon,
    PresentationChartLineIcon,
    UserGroupIcon,
    Cog6ToothIcon,
    CheckIcon
} from '@heroicons/react/24/solid';
import CreateClassAnnouncementForm from './CreateClassAnnouncementForm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ViewLessonModal from './ViewLessonModal';
import ViewQuizModal from './ViewQuizModal';
import GenerateReportModal from './GenerateReportModal';
import EditAvailabilityModal from './EditAvailabilityModal';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPER: OPTIMIZED STATIC AURORA BACKGROUND ---
const AuroraBackground = memo(() => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#0f1115]">
        <div className="absolute inset-0 opacity-60 dark:opacity-30"
             style={{
                 backgroundImage: `
                    radial-gradient(at 0% 0%, rgba(147, 197, 253, 0.4) 0px, transparent 50%),
                    radial-gradient(at 100% 100%, rgba(192, 132, 252, 0.3) 0px, transparent 50%)
                 `
             }}
        />
    </div>
));

// --- HELPER: SKELETON LOADERS ---
const SkeletonAnnouncement = memo(() => (
    <div className="bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-sm p-6 rounded-[24px] border border-white/20 dark:border-white/5 shadow-sm animate-pulse mb-4">
        <div className="space-y-3 w-full">
            <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/2"></div>
        </div>
    </div>
));

const SkeletonPostGroup = memo(() => (
    <div className="bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-sm rounded-[24px] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden mb-6 animate-pulse">
        <div className="p-5 border-b border-white/10">
            <div className="h-6 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/3 mb-2"></div>
        </div>
        <div className="p-4 space-y-3">
            <div className="h-12 bg-slate-200/50 dark:bg-slate-700/30 rounded-xl w-full"></div>
            <div className="h-12 bg-slate-200/50 dark:bg-slate-700/30 rounded-xl w-full"></div>
        </div>
    </div>
));

// --- REUSABLE COMPONENTS ---

const ListItem = memo(({ children, isChecked, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${isChecked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
    >
        {children}
    </div>
));

// Updated EmptyState to fill height
const EmptyState = memo(({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 bg-white/40 dark:bg-[#1A1D24]/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700"
    >
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-sm">
            <Icon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{text}</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">{subtext}</p>
    </motion.div>
));

const PostGroupItem = memo(({ post, unitsInPost, unitsMap, expandedPosts, togglePostExpand, expandedUnits, toggleUnitExpand, selectedSet, toggleSelection, handleEditDatesClick, handleDeleteContentFromPost, onViewContent, type }) => {
    
    // Sort logic
    const sortedUnitKeys = useMemo(() => {
        const customUnitSort = (a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            const numA = parseInt(a.match(/\d+/)?.[0], 10);
            const numB = parseInt(b.match(/\d+/)?.[0], 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            if (!isNaN(numA)) return -1;
            if (!isNaN(numB)) return 1;
            return a.localeCompare(b);
        };
        return Object.keys(unitsInPost).sort(customUnitSort);
    }, [unitsInPost]);

    // Check if expanded (Default is false/collapsed)
    const isPostExpanded = expandedPosts.has(post.id);

    return (
        <div className="bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/5 shadow-sm overflow-hidden mb-4 sm:mb-6">
            <button 
                className="w-full text-left p-3 sm:p-5 group"
                onClick={() => togglePostExpand(post.id)}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-xl group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors truncate tracking-tight">{post.title}</h3>
                        <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 sm:gap-3 pl-2 sm:pl-4">
                        <div 
                            onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                        </div>
                        {/* Rotate arrow if expanded */}
                        <div className={`p-1 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${isPostExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                        </div>
                    </div>
                </div>
            </button>
            
            {/* Only render if expanded */}
            {isPostExpanded && (
                <div className="space-y-3 sm:space-y-4 px-3 sm:px-4 pb-3 sm:pb-5 animate-fadeIn">
                    {sortedUnitKeys.map(unitDisplayName => {
                        const itemsInUnit = unitsInPost[unitDisplayName];
                        const unitKey = `${post.id}_${unitDisplayName}`;
                        
                        const isUnitExpanded = expandedUnits.has(unitKey);
                        
                        const itemIds = itemsInUnit.map(i => i.id);
                        const isAllSelected = itemIds.length > 0 && itemIds.every(id => selectedSet.has(id));

                        return (
                            <div key={unitKey} className="bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitExpand(post.id, unitDisplayName)}>
                                        <h4 className="font-bold text-xs sm:text-base text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors truncate">{unitDisplayName}</h4>
                                        <ChevronDownIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    <div 
                                        className="flex items-center justify-end gap-2 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0 select-none group"
                                        onClick={() => toggleSelection('batch', null, itemIds, isAllSelected)}
                                    >
                                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isAllSelected ? 'bg-[#007AFF] border-[#007AFF]' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-[#007AFF]'}`}>
                                            <CheckIcon className={`w-3 h-3 text-white stroke-[3] transition-transform duration-200 ${isAllSelected ? 'scale-100' : 'scale-0'}`} />
                                        </div>
                                        <span className="text-[11px] sm:text-[13px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Select All</span>
                                    </div>
                                </div>
                                
                                {isUnitExpanded && (
                                    <div className="divide-y divide-slate-200 dark:divide-slate-700 animate-fadeIn">
                                        {itemsInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(itemDetails => {
                                            const isChecked = selectedSet.has(itemDetails.id);
                                            return (
                                                <ListItem key={itemDetails.id} isChecked={isChecked}>
                                                    <div className="p-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSelection('single', itemDetails.id); }}>
                                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${isChecked ? 'bg-[#007AFF] border-[#007AFF] shadow-sm scale-105' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#007AFF] hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                            <CheckIcon className={`w-3.5 h-3.5 text-white stroke-[3] transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0" onClick={() => onViewContent(itemDetails, post)}>
                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base cursor-pointer hover:text-[#007AFF] transition-colors truncate">{itemDetails.title}</p>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, itemDetails.id, type); }} className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                        <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                </ListItem>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

// --- MAIN MODAL COMPONENT ---

const ClassOverviewModal = ({ isOpen, onClose, classData, onRemoveStudent }) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('announcements');
    
    // Data States
    const [quizScores, setQuizScores] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [sharedContentPosts, setSharedContentPosts] = useState([]);
    const [units, setUnits] = useState({});
    const [freshStudentData, setFreshStudentData] = useState([]);
    const [quizLocks, setQuizLocks] = useState([]);

    // Loading & Lazy Flags
    const [loadingScores, setLoadingScores] = useState(true); 
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [postsRequested, setPostsRequested] = useState(false);
    const [scoresRequested, setScoresRequested] = useState(false);
    const [studentsRequested, setStudentsRequested] = useState(false);

    // Modal & UI States
    const [showAddForm, setShowAddForm] = useState(false);
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [postToEdit, setPostToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isScoresDetailModalOpen, setScoresDetailModalOpen] = useState(false);
    const [selectedQuizForScores, setSelectedQuizForScores] = useState(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    
    // Using Expanded sets ensures they start empty -> Default Collapsed
    const [expandedPosts, setExpandedPosts] = useState(new Set());
    const [expandedUnits, setExpandedUnits] = useState(new Set());
    
    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: () => {}, confirmText: 'Delete', confirmColor: 'red' });

    // --- EFFECT: Reset on Close ---
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setActiveTab('announcements');
                setShowAddForm(false); setViewLessonData(null); setViewQuizData(null);
                setAnnouncements([]); setSharedContentPosts([]); setQuizScores([]); setQuizLocks([]);
                setEditingId(null); setEditContent(''); setPostToEdit(null); setIsEditModalOpen(false);
                setIsReportModalOpen(false); setScoresDetailModalOpen(false); setSelectedQuizForScores(null);
                setSelectedAnnouncement(null); setUnits({}); 
                setExpandedPosts(new Set()); setExpandedUnits(new Set()); // Reset expansions
                setSelectedLessons(new Set()); setSelectedQuizzes(new Set());
                setFreshStudentData([]);
                setPostsRequested(false); setScoresRequested(false); setStudentsRequested(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // --- EFFECT: Lazy Load Triggers ---
    useEffect(() => {
        if (isOpen) {
            if (['lessons', 'quizzes', 'scores'].includes(activeTab)) setPostsRequested(true);
            if (activeTab === 'scores') setScoresRequested(true);
            if (activeTab === 'students') setStudentsRequested(true);
        }
    }, [activeTab, isOpen]);

    // --- DATA LISTENERS ---
    const fetchDocsInBatches = async (collectionName, ids) => {
        if (!ids || ids.length === 0) return [];
        const chunks = [];
        for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
        const snapshots = await Promise.all(chunks.map(chunk => getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk)))));
        return snapshots.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    // 1. Announcements
    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        setLoadingAnnouncements(true);
        const unsub = onSnapshot(query(collection(db, "studentAnnouncements"), where("classId", "==", classData.id), orderBy("createdAt", "desc")), (snap) => {
            setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingAnnouncements(false);
        });
        return () => unsub();
    }, [isOpen, classData?.id]);

    // 2. Posts & Units
    useEffect(() => {
        if (!isOpen || !classData?.id || !postsRequested) return;
        setLoadingPosts(true);
        const unsub = onSnapshot(query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'asc')), async (snap) => {
            const allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSharedContentPosts(allPosts);
            
            const allUnitIds = new Set(allPosts.flatMap(p => [...(p.lessons || []).map(l => l.unitId), ...(p.quizzes || []).map(q => q.unitId)]).filter(Boolean));
            if (allUnitIds.size > 0) {
                const fetchedUnits = await fetchDocsInBatches('units', Array.from(allUnitIds));
                const map = {}; fetchedUnits.forEach(u => map[u.id] = u.title);
                setUnits(map);
            }
            setLoadingPosts(false);
        });
        return () => unsub();
    }, [isOpen, classData?.id, postsRequested]);

    // 3. Students
    useEffect(() => {
        if (!isOpen || !studentsRequested || freshStudentData.length > 0) return;
        const loadStudents = async () => {
            setLoadingStudents(true);
            if (classData?.students?.length) {
                const s = await fetchDocsInBatches('users', classData.students.map(s => s.id));
                setFreshStudentData(s.sort((a,b) => (a.lastName || '').localeCompare(b.lastName || '')));
            }
            setLoadingStudents(false);
        };
        loadStudents();
    }, [isOpen, studentsRequested, classData?.students]);

    // 4. Scores
    useEffect(() => {
        if (!isOpen || !classData?.id || !scoresRequested) return;
        const unsub = onSnapshot(query(collection(db, 'quizSubmissions'), where("classId", "==", classData.id)), (snap) => {
            setQuizScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingScores(false);
        });
        return () => unsub();
    }, [isOpen, classData?.id, scoresRequested]);


    // --- HANDLERS ---
    const togglePostExpand = useCallback((id) => setExpandedPosts(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }), []);
    const toggleUnitExpand = useCallback((pid, uname) => { const k = `${pid}_${uname}`; setExpandedUnits(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s; }); }, []);
    
    // Generic Selection Handler
    const handleToggleSelection = useCallback((type, mode, idOrIds, isAllSelected) => {
        const setFunction = type === 'lesson' ? setSelectedLessons : setSelectedQuizzes;
        setFunction(prev => {
            const newSet = new Set(prev);
            if (mode === 'single') {
                newSet.has(idOrIds) ? newSet.delete(idOrIds) : newSet.add(idOrIds);
            } else {
                idOrIds.forEach(id => isAllSelected ? newSet.delete(id) : newSet.add(id));
            }
            return newSet;
        });
    }, []);

    const handleDeleteSelected = (type) => {
        const set = type === 'lesson' ? selectedLessons : selectedQuizzes;
        if(set.size === 0) return;
        setConfirmModal({
            isOpen: true,
            message: `Delete ${set.size} selected ${type}(s)?`,
            confirmText: 'Delete',
            confirmColor: 'red',
            onConfirm: () => executeDeleteSelected(type, set)
        });
    };

    const executeDeleteSelected = async (contentType, selectedSet) => {
        if (!classData?.id || selectedSet.size === 0) return;
        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';

        try {
            const batch = writeBatch(db);
            const classRef = doc(db, 'classes', classData.id);
            const removedQuizIds = new Set();

            for (const post of sharedContentPosts) {
                const currentContent = post[fieldToUpdate] || [];
                if (currentContent.length === 0) continue;

                const contentToKeep = currentContent.filter((item) => {
                    const isSelected = selectedSet.has(item.id); 
                    if (isSelected && contentType === 'quiz') removedQuizIds.add(item.id);
                    return !isSelected;
                });

                if (contentToKeep.length < currentContent.length) {
                    const postRef = doc(db, 'classes', classData.id, 'posts', post.id);
                    batch.update(postRef, { [fieldToUpdate]: contentToKeep });
                }
            }

            if (contentType === 'quiz' && removedQuizIds.size > 0) {
                const quizIdArray = Array.from(removedQuizIds);
                const MAX_IN_CLAUSE = 30;
                for (let i = 0; i < quizIdArray.length; i += MAX_IN_CLAUSE) {
                    const chunk = quizIdArray.slice(i, i + MAX_IN_CLAUSE);
                    if (chunk.length === 0) continue;

                    const submissionsQuery = query(collection(db, 'quizSubmissions'), where('quizId', 'in', chunk), where('classId', '==', classData.id));
                    const submissionsSnapshot = await getDocs(submissionsQuery);
                    submissionsSnapshot.forEach(doc => batch.delete(doc.ref));

                    const locksQuery = query(collection(db, 'quizLocks'), where('quizId', 'in', chunk), where('classId', '==', classData.id));
                    const locksSnapshot = await getDocs(locksQuery);
                    locksSnapshot.forEach(doc => batch.delete(doc.ref));
                }
            }

            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            await batch.commit();

            if (contentType === 'lesson') {
                const deletedLessonIds = Array.from(selectedSet);
                const studentIds = (classData.students || []).map((s) => s.id);
                const cleanupBatch = writeBatch(db);

                try {
                    for (const studentId of studentIds) {
                        const userRef = doc(db, 'users', studentId);
                        const userSnap = await getDoc(userRef);
                        if (!userSnap.exists()) continue;
                        const userData = userSnap.data();
                        const completed = userData.completedLessons || [];
                        const hasDeletedLesson = completed.some((id) => deletedLessonIds.includes(id));
                        if (hasDeletedLesson) {
                            const updatedCompleted = completed.filter((id) => !deletedLessonIds.includes(id));
                            cleanupBatch.update(userRef, { completedLessons: updatedCompleted });
                        }
                    }
                    await cleanupBatch.commit();
                    showToast(`${selectedSet.size} ${contentType}(s) and associated student records cleaned.`, 'success');
                } catch (err) {
                    console.error('Error cleaning up completedLessons (batch):', err);
                    showToast('Cleanup failed partially.', 'error');
                }
                setSelectedLessons(new Set());
            } else {
                showToast(`${selectedSet.size} ${contentType}(s) removed.`, 'success');
                setSelectedQuizzes(new Set());
            }
        } catch (error) {
            console.error(`Error unsharing selected ${contentType}s:`, error);
            showToast(`Failed to unshare selected ${contentType}s.`, 'error');
        }
    };

    const handleDeleteContentFromPost = (postId, contentIdToRemove, contentType) => {
        if (!classData?.id) return;
        setConfirmModal({
            isOpen: true,
            message: `Are you sure you want to remove this ${contentType}?`,
            confirmText: 'Delete',
            confirmColor: 'red',
            onConfirm: () => executeDeleteContentFromPost(postId, contentIdToRemove, contentType)
        });
    };

    const executeDeleteContentFromPost = async (postId, contentIdToRemove, contentType) => {
        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, 'classes', classData.id, 'posts', postId);
            const classRef = doc(db, 'classes', classData.id);

            const postToUpdate = sharedContentPosts.find(p => p.id === postId);
            if (!postToUpdate) return;

            const currentContent = postToUpdate[fieldToUpdate] || [];
            const updatedContent = currentContent.filter(item => item.id !== contentIdToRemove);

            batch.update(postRef, { [fieldToUpdate]: updatedContent });
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });

            if (contentType === 'quiz') {
                const submissionsQuery = query(collection(db, 'quizSubmissions'), where('quizId', '==', contentIdToRemove), where('classId', '==', classData.id));
                const submissionsSnapshot = await getDocs(submissionsQuery);
                submissionsSnapshot.forEach(doc => batch.delete(doc.ref));

                const locksQuery = query(collection(db, 'quizLocks'), where('quizId', '==', contentIdToRemove), where('classId', '==', classData.id));
                const locksSnapshot = await getDocs(locksQuery);
                locksSnapshot.forEach(doc => batch.delete(doc.ref));
            }

            await batch.commit();

            if (contentType === 'lesson') {
                const deletedLessonIds = [contentIdToRemove];
                const studentIds = (classData.students || []).map(s => s.id);
                const cleanupBatch = writeBatch(db);
                for (const studentId of studentIds) {
                    const userRef = doc(db, 'users', studentId);
                    const userSnap = await getDoc(userRef);
                    if (!userSnap.exists()) continue;
                    const userData = userSnap.data();
                    const completed = userData.completedLessons || [];
                    if (completed.some(id => deletedLessonIds.includes(id))) {
                        cleanupBatch.update(userRef, { completedLessons: completed.filter(id => !deletedLessonIds.includes(id)) });
                    }
                }
                await cleanupBatch.commit();
            }
            showToast(`${contentType} removed successfully.`, 'success');
        } catch (error) {
            console.error(`Error unsharing ${contentType}:`, error);
            showToast(`Failed to remove ${contentType}.`, 'error');
        }
    };

    const handleUnlockQuiz = (quizId, studentId) => {
        setConfirmModal({
            isOpen: true,
            message: "Unlock this quiz attempt?",
            confirmText: 'Unlock',
            confirmColor: 'blue',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'quizLocks', `${quizId}_${studentId}`));
                    showToast("Quiz unlocked.", "success");
                } catch (error) { showToast("Failed to unlock.", "error"); }
            }
        });
    };

    const handleEditDatesClick = (post) => { setPostToEdit(post); setIsEditModalOpen(true); };
    
    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            message: "Delete this announcement?",
            confirmText: 'Delete',
            confirmColor: 'red',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'studentAnnouncements', id));
                    showToast("Deleted.", "success");
                } catch (e) { showToast("Failed to delete.", "error"); }
            }
        });
    };

    const handleEditSave = async (id) => {
        const trimmed = editContent.trim();
        if (!trimmed) return showToast("Content empty.", "error");
        try {
            await updateDoc(doc(db, 'studentAnnouncements', id), { content: trimmed });
            setEditingId(null); setEditContent('');
            showToast("Updated.", "success");
        } catch (e) { showToast("Failed to update.", "error"); }
    };

    // --- MEMOIZED DATA PROCESSING ---
    const organizedContent = useMemo(() => {
        if (!sharedContentPosts.length) return { lessons: [], quizzes: [] };
        
        const process = (key) => sharedContentPosts.reduce((acc, post) => {
            const items = post[key] || [];
            if (items.length === 0) return acc;
            if (!acc[post.id]) acc[post.id] = { post, units: {} };
            items.forEach(item => {
                const uName = units[item.unitId] || 'Uncategorized';
                if (!acc[post.id].units[uName]) acc[post.id].units[uName] = [];
                acc[post.id].units[uName].push(item);
            });
            return acc;
        }, {});

        const sortByDate = (obj) => Object.values(obj).sort((a,b) => (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0));

        return {
            lessons: sortByDate(process('lessons')),
            quizzes: sortByDate(process('quizzes'))
        };
    }, [sharedContentPosts, units]);

    // --- RENDER CONTENT SWITCH ---
    const renderTabContent = () => {
        switch (activeTab) {
            case 'lessons':
                if (loadingPosts) return <div className="space-y-4"><SkeletonPostGroup /><SkeletonPostGroup /></div>;
                if (organizedContent.lessons.length === 0) return <EmptyState icon={PlayCircleIcon} text="No lessons shared" subtext="Start sharing lessons from the Lessons Library tab." />;
                return organizedContent.lessons.map(({ post, units: unitsInPost }) => (
                    <PostGroupItem 
                        key={post.id} 
                        post={post} 
                        unitsInPost={unitsInPost} 
                        unitsMap={units}
                        expandedPosts={expandedPosts}
                        togglePostExpand={togglePostExpand}
                        expandedUnits={expandedUnits}
                        toggleUnitExpand={toggleUnitExpand}
                        selectedSet={selectedLessons}
                        toggleSelection={(m, id, ids, all) => handleToggleSelection('lesson', m, id || ids, all)}
                        handleEditDatesClick={handleEditDatesClick}
                        handleDeleteContentFromPost={handleDeleteContentFromPost}
                        onViewContent={setViewLessonData}
                        type="lesson"
                    />
                ));

            case 'quizzes':
                if (loadingPosts) return <div className="space-y-4"><SkeletonPostGroup /></div>;
                if (organizedContent.quizzes.length === 0) return <EmptyState icon={ClipboardDocumentListIcon} text="No quizzes shared" subtext="Share quizzes from the Quizzes Library tab." />;
                return organizedContent.quizzes.map(({ post, units: unitsInPost }) => (
                    <PostGroupItem 
                        key={post.id} 
                        post={post} 
                        unitsInPost={unitsInPost} 
                        unitsMap={units}
                        expandedPosts={expandedPosts}
                        togglePostExpand={togglePostExpand}
                        expandedUnits={expandedUnits}
                        toggleUnitExpand={toggleUnitExpand}
                        selectedSet={selectedQuizzes}
                        toggleSelection={(m, id, ids, all) => handleToggleSelection('quiz', m, id || ids, all)}
                        handleEditDatesClick={handleEditDatesClick}
                        handleDeleteContentFromPost={handleDeleteContentFromPost}
                        onViewContent={(quiz) => setViewQuizData({...quiz, settings: post.quizSettings})}
                        type="quiz"
                    />
                ));
            
            case 'students':
                if (loadingStudents) return <div className="space-y-4 animate-pulse"><div className="h-16 bg-slate-200 rounded-xl"></div></div>;
                if (freshStudentData.length === 0) return <EmptyState icon={UserGroupIcon} text="No students enrolled" subtext="Share the class code with your students to get them enrolled." />;
                return (
                    <div className="bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm rounded-3xl border border-white/5 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {freshStudentData.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <UserInitialsAvatar user={student} size="w-10 h-10" />
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{student.lastName}, {student.firstName}</p>
                                            <p className="text-xs text-slate-500">ID: {student.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => onRemoveStudent(classData.id, student)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'scores':
                return loadingScores ? <div className="animate-pulse h-40 bg-slate-200 rounded-xl"/> : (
                    <ScoresTab 
                        quizzes={sharedContentPosts.flatMap(p => p.quizzes || [])} 
                        units={units}
                        sharedContentPosts={sharedContentPosts}
                        quizScores={quizScores}
                        setIsReportModalOpen={setIsReportModalOpen}
                        setSelectedQuizForScores={setSelectedQuizForScores}
                        setScoresDetailModalOpen={setScoresDetailModalOpen}
                        collapsedUnits={expandedUnits} // Re-using expandedUnits set logic
                        toggleUnitCollapse={toggleUnitExpand}
                    />
                );

            default: // Announcements
                return (
                    <div className="flex flex-col h-full">
                        {showAddForm && <div className="mb-6"><CreateClassAnnouncementForm classId={classData.id} onAnnouncementPosted={() => setShowAddForm(false)} /></div>}
                        <div className="space-y-5">
                            {loadingAnnouncements ? <SkeletonAnnouncement /> : announcements.length > 0 ? announcements.map(post => (
                                <AnnouncementListItem 
                                    key={post.id} post={post} isOwn={userProfile?.id === post.teacherId}
                                    onEdit={() => { setEditingId(post.id); setEditContent(post.content); }}
                                    onDelete={() => handleDelete(post.id)}
                                    isEditing={editingId === post.id} editContent={editContent}
                                    onChangeEdit={(e) => setEditContent(e.target.value)}
                                    onSaveEdit={() => handleEditSave(post.id)}
                                    onCancelEdit={() => setEditingId(null)}
                                    onClick={() => setSelectedAnnouncement(post)}
                                />
                            )) : <EmptyState icon={ChatBubbleBottomCenterTextIcon} text="No announcements yet" subtext="Post important updates for your students here." />}
                        </div>
                    </div>
                );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="screen" roundedClass="rounded-none sm:rounded-3xl" containerClassName="h-full sm:p-4 bg-black/50 backdrop-blur-sm" contentClassName="p-0 w-full h-full" showCloseButton={false}>
            {/* Main Container - enforcing fixed height and flex column layout */}
            <div className="relative w-full h-full sm:h-[85vh] bg-[#f8fafc] dark:bg-black overflow-hidden flex flex-col rounded-none sm:rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10">
                <AuroraBackground />
                
                {/* Fixed Header Section (Flex-none prevents shrinking) */}
                <div className="relative z-20 flex-none bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{classData?.name}</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{classData?.classCode}</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    {/* Fixed Tabs */}
                    <div className="flex gap-2 mt-6 overflow-x-auto pb-2 custom-scrollbar">
                        {[
                            { id: 'announcements', name: 'Notices', icon: ChatBubbleBottomCenterTextIcon },
                            { id: 'lessons', name: 'Lessons', icon: PlayCircleIcon },
                            { id: 'quizzes', name: 'Quizzes', icon: ClipboardDocumentListIcon },
                            { id: 'scores', name: 'Scores', icon: PresentationChartLineIcon },
                            { id: 'students', name: 'Students', icon: UserGroupIcon }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Scrollable Content Area - flex-1 ensures it fills available space */}
                <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="min-h-full" // Ensure content div stretches
                        >
                            {renderTabContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Auxiliary Modals */}
            <GenerateReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} classData={classData} availableQuizzes={sharedContentPosts.flatMap(p => p.quizzes || [])} quizScores={quizScores} units={units} sharedContentPosts={sharedContentPosts} className="z-[120]"/>
            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} className="z-[120]" />
            <ViewQuizModal isOpen={!!viewQuizData} onClose={() => setViewQuizData(null)} quiz={viewQuizData} userProfile={userProfile} classId={classData?.id} isTeacherView={true} className="z-[120]" />
            <EditAvailabilityModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} post={postToEdit} classId={classData?.id} onUpdate={() => {}} classData={classData} className="z-[120]" />
            {selectedQuizForScores && (<QuizScoresModal isOpen={isScoresDetailModalOpen} onClose={() => setScoresDetailModalOpen(false)} quiz={selectedQuizForScores} classData={classData} quizScores={quizScores} setQuizScores={setQuizScores} quizLocks={quizLocks} onUnlockQuiz={handleUnlockQuiz} setIsReportModalOpen={setIsReportModalOpen} className="z-[120]" />)}
            <AnnouncementViewModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} className="z-[120]" />
            
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title="Confirmation"
                size="sm"
                className="z-[200]" 
                contentClassName="p-0"
                roundedClass="rounded-[28px]"
                containerClassName="bg-black/50 backdrop-blur-sm"
            >
                <div className="p-6 bg-white dark:bg-[#1A1D24] rounded-[28px]">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                        <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">Are you sure?</h3>
                    <p className="text-center text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">{confirmModal.message}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                confirmModal.onConfirm();
                                setConfirmModal(prev => ({ ...prev, isOpen: false })); 
                            }}
                            className={`py-3 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-95 ${confirmModal.confirmColor === 'red' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30'}`}
                        >
                            {confirmModal.confirmText}
                        </button>
                    </div>
                </div>
            </Modal>
        </Modal>
    );
};

// Extracted Announcement Item
const AnnouncementListItem = memo(({ post, isOwn, onEdit, onDelete, isEditing, editContent, onChangeEdit, onSaveEdit, onCancelEdit, onClick }) => {
    return (
        <div onClick={!isEditing ? onClick : undefined} className="group relative bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm p-5 rounded-3xl border border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer">
            {isEditing ? (
                <div className="space-y-3">
                    <textarea className="w-full p-4 rounded-xl bg-slate-50 dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 dark:text-white" rows={3} value={editContent} onChange={onChangeEdit} onClick={e => e.stopPropagation()} autoFocus />
                    <div className="flex justify-end gap-2">
                        <button onClick={(e) => {e.stopPropagation(); onCancelEdit()}} className="px-4 py-2 rounded-full text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">Cancel</button>
                        <button onClick={(e) => {e.stopPropagation(); onSaveEdit()}} className="px-4 py-2 rounded-full text-sm font-bold bg-[#007AFF] text-white">Save</button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <p className="text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        <p className="text-xs font-bold text-slate-400 mt-3">{post.teacherName} • {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Just now'}</p>
                    </div>
                    {isOwn && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => {e.stopPropagation(); onEdit()}} className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"><Cog6ToothIcon className="w-4 h-4"/></button>
                            <button onClick={(e) => {e.stopPropagation(); onDelete()}} className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default ClassOverviewModal;