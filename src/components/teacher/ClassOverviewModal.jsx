import React, { useState, useEffect, memo, useMemo } from 'react';
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
    Cog6ToothIcon
} from '@heroicons/react/24/solid';
import CreateClassAnnouncementForm from './CreateClassAnnouncementForm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ViewLessonModal from './ViewLessonModal';
import ViewQuizModal from './ViewQuizModal';
import GenerateReportModal from './GenerateReportModal';
import EditAvailabilityModal from './EditAvailabilityModal';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
// Spinner import removed (replaced by skeletons)
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
const SkeletonAnnouncement = () => (
    <div className="bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-sm p-6 rounded-[24px] border border-white/20 dark:border-white/5 shadow-sm animate-pulse">
        <div className="flex justify-between items-start gap-4">
            <div className="space-y-3 w-full">
                <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/2"></div>
                <div className="flex gap-2 mt-2">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
);

const SkeletonPostGroup = () => (
    <div className="bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-sm rounded-[24px] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden mb-6 animate-pulse">
        <div className="p-5 border-b border-white/10">
            <div className="h-6 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/3 mb-2"></div>
            <div className="flex gap-3">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
            </div>
        </div>
        <div className="p-4 space-y-3">
            <div className="h-12 bg-slate-200/50 dark:bg-slate-700/30 rounded-xl w-full"></div>
            <div className="h-12 bg-slate-200/50 dark:bg-slate-700/30 rounded-xl w-full"></div>
        </div>
    </div>
);

const SkeletonStudentRow = () => (
    <div className="flex items-center justify-between p-4 animate-pulse border-b border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
            <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
            </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
    </div>
);

const SkeletonScores = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-700/50 rounded-xl w-full mb-6"></div>
        {[1,2,3,4].map(i => (
             <div key={i} className="bg-white/40 dark:bg-slate-800/40 rounded-xl p-4 h-16 w-full"></div>
        ))}
    </div>
);

const fetchDocsInBatches = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 30) {
        chunks.push(ids.slice(i, i + 30));
    }
    const fetchPromises = chunks.map(chunk =>
        getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk)))
    );
    const snapshots = await Promise.all(fetchPromises);
    return snapshots.flatMap(snapshot => snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
};

const ClassOverviewModal = ({ isOpen, onClose, classData, onRemoveStudent }) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('announcements');
    const [quizScores, setQuizScores] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [sharedContentPosts, setSharedContentPosts] = useState([]);
    
    // Loading States
    const [loadingScores, setLoadingScores] = useState(true); // Renamed from loading
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [postToEdit, setPostToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [quizLocks, setQuizLocks] = useState([]);
    const [isScoresDetailModalOpen, setScoresDetailModalOpen] = useState(false);
    const [selectedQuizForScores, setSelectedQuizForScores] = useState(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [units, setUnits] = useState({});
    const [collapsedPosts, setCollapsedPosts] = useState(new Set());
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());
    const [classQuizIds, setClassQuizIds] = useState([]);
    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());

    const [freshStudentData, setFreshStudentData] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        onConfirm: () => {},
        confirmText: 'Delete',
        confirmColor: 'red',
    });

    useEffect(() => {
        if (isOpen && classData?.id) {
            setActiveTab('announcements');
            setShowAddForm(false);
        } else if (!isOpen) {
            setShowAddForm(false); setViewLessonData(null); setViewQuizData(null); setActiveTab('announcements');
            setAnnouncements([]); setSharedContentPosts([]); setQuizScores([]); setQuizLocks([]);
            setEditingId(null); setEditContent(''); setPostToEdit(null); setIsEditModalOpen(false);
            setIsReportModalOpen(false); setScoresDetailModalOpen(false); setSelectedQuizForScores(null);
            setSelectedAnnouncement(null); setUnits({}); 
            setCollapsedPosts(new Set());
            setCollapsedUnits(new Set());
            setClassQuizIds([]);
            setSelectedLessons(new Set());
            setSelectedQuizzes(new Set());
            setFreshStudentData([]);
            setLoadingStudents(false);
            setLoadingAnnouncements(true);
            setLoadingPosts(true);
            setLoadingScores(true);
        }
    }, [isOpen, classData?.id]);

    const studentIdsHash = useMemo(() => {
        if (!classData?.students) return '';
        return classData.students.map(s => s.id).sort().join(',');
    }, [classData?.students]);

    useEffect(() => {
        const fetchFreshStudentData = async () => {
            if (activeTab !== 'students') return;
            
            if (!classData?.students || classData.students.length === 0) {
                setFreshStudentData([]); 
                return;
            }

            setLoadingStudents(true);
            try {
                const studentIds = classData.students.map(s => s.id);
                if (studentIds.length > 0) {
                    const students = await fetchDocsInBatches('users', studentIds);
                    const sortedStudents = students.sort((a, b) => 
                        (a.lastName || '').localeCompare(b.lastName || '')
                    );
                    setFreshStudentData(sortedStudents);
                } else {
                    setFreshStudentData([]);
                }
            } catch (err) {
                console.error("Error fetching fresh student data:", err);
                showToast("Could not load updated student list.", "error");
                setFreshStudentData(classData.students.sort((a,b) => (a.lastName || '').localeCompare(b.lastName || '')));
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchFreshStudentData();
    }, [activeTab, studentIdsHash, showToast]); 

    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        
        setLoadingAnnouncements(true);
        let active = true;
        const annQuery = query(collection(db, "studentAnnouncements"), where("classId", "==", classData.id), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(annQuery, (snapshot) => {
            if (!active) return;
            setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingAnnouncements(false);
        }, (error) => {
            console.error("Error listening to announcements:", error);
            if(active) setLoadingAnnouncements(false);
        });

        return () => { active = false; unsub(); };
    }, [isOpen, classData?.id]);

    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        
        setLoadingPosts(true);
        let active = true;
        const postsQuery = query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(postsQuery, async (snapshot) => {
            if (!active) return;
            const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSharedContentPosts(allPosts);

            const allUnitIds = new Set(allPosts.flatMap(post => [...(post.lessons || []).map(l => l.unitId), ...(post.quizzes || []).map(q => q.unitId)]).filter(Boolean));
            if (allUnitIds.size > 0) {
                const fetchedUnits = await fetchDocsInBatches('units', Array.from(allUnitIds));
                const unitsMap = {};
                fetchedUnits.forEach(unit => { unitsMap[unit.id] = unit.title; });
                if (active) setUnits(unitsMap);
            } else {
                if (active) setUnits({});
            }

            const quizIds = Array.from(new Set(allPosts.flatMap(p => (p.quizzes || []).map(q => q.id))));
            if (active) setClassQuizIds(quizIds);
            
            setLoadingPosts(false);

        }, (error) => {
            console.error("Error listening to posts:", error);
            if(active) setLoadingPosts(false);
        });

        return () => { active = false; unsub(); };
    }, [isOpen, classData?.id]);

    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        setLoadingScores(true);
        let active = true;
        const scoresQuery = query(collection(db, 'quizSubmissions'), where("classId", "==", classData.id));
        const unsub = onSnapshot(scoresQuery, (snapshot) => {
            if (!active) return;
            setQuizScores(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingScores(false);
        }, (error) => {
            console.error("Error listening to quiz scores:", error);
            if (active) setLoadingScores(false);
        });

        return () => { active = false; unsub(); };
    }, [isOpen, classData?.id]);

    useEffect(() => {
        if (!isOpen || !classData?.id) {
             setQuizLocks([]); 
             return;
        }

        setQuizLocks(prevLocks => prevLocks.filter(lock => classQuizIds.includes(lock.quizId)));

        if (classQuizIds.length === 0) {
            setQuizLocks([]); 
            return;
        }

        const MAX_IN_CLAUSE = 30;
        const quizIdChunks = [];
        for (let i = 0; i < classQuizIds.length; i += MAX_IN_CLAUSE) {
            quizIdChunks.push(classQuizIds.slice(i, i + MAX_IN_CLAUSE));
        }

        const unsubscribers = quizIdChunks.map(chunk => {
            if (chunk.length === 0) return () => {};
            const locksQuery = query(
                collection(db, 'quizLocks'),
                where("classId", "==", classData.id),
                where("quizId", "in", chunk)
            );
            return onSnapshot(locksQuery, (locksSnap) => {
                setQuizLocks(prevLocks => {
                    const locksFromThisChunk = locksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    const otherLocks = prevLocks.filter(lock => !chunk.includes(lock.quizId));
                    return [...otherLocks, ...locksFromThisChunk];
                });
            }, (error) => {
                console.error("Error listening to quiz locks chunk:", error);
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [isOpen, classData?.id, classQuizIds]);

    const togglePostCollapse = (postId) => {
        setCollapsedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });
    };

    const toggleUnitCollapse = (postId, unitDisplayName) => {
        const unitKey = `${postId}_${unitDisplayName}`;
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitKey)) newSet.delete(unitKey);
            else newSet.add(unitKey);
            return newSet;
        });
    };
    
    const onChangeEdit = (e) => setEditContent(e.target.value);

    useEffect(() => {
        if (isOpen && classData?.id && (activeTab === 'lessons' || activeTab === 'quizzes')) {
            const newCollapsedPosts = new Set();
            const newCollapsedUnits = new Set();
            
            sharedContentPosts.forEach(post => {
                if (activeTab === 'lessons' && (post.lessons || []).length > 0) {
                    newCollapsedPosts.add(post.id);
                    (post.lessons || []).forEach(lesson => {
                        const unitDisplayName = units[lesson.unitId] || 'Uncategorized';
                        newCollapsedUnits.add(`${post.id}_${unitDisplayName}`);
                    });
                } else if (activeTab === 'quizzes' && (post.quizzes || []).length > 0) {
                    newCollapsedPosts.add(post.id);
                    (post.quizzes || []).forEach(quiz => {
                        const unitDisplayName = units[quiz.unitId] || 'Uncategorized';
                        newCollapsedUnits.add(`${post.id}_${unitDisplayName}`);
                    });
                }
            });
            
            setCollapsedPosts(newCollapsedPosts);
            setCollapsedUnits(newCollapsedUnits);
        } else if (activeTab === 'scores') {
            const allUnitTitles = new Set();
            sharedContentPosts.forEach(post => {
               (post.quizzes || []).forEach(quiz => {
                   const unitDisplayName = units[quiz.unitId] || 'Uncategorized';
                   allUnitTitles.add(unitDisplayName);
               });
           });
           setCollapsedUnits(allUnitTitles);
           setCollapsedPosts(new Set());
        } else {
            setCollapsedPosts(new Set());
            setCollapsedUnits(new Set());
        }
    }, [activeTab, sharedContentPosts, units, isOpen, classData?.id]);

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        setSelectedLessons(new Set());
        setSelectedQuizzes(new Set());
    };

    const handleToggleSelection = (contentType, contentId) => {
        const set = contentType === 'lesson' ? setSelectedLessons : setSelectedQuizzes;
        set(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(contentId)) {
                newSet.delete(contentId);
            } else {
                newSet.add(contentId);
            }
            return newSet;
        });
    };

	const handleDeleteSelected = (contentType) => {
        const selectedSet = new Set(contentType === 'lesson' ? selectedLessons : selectedQuizzes);

	    if (selectedSet.size === 0) return;

	    const confirmMessage =
	        contentType === 'quiz'
	            ? `Are you sure you want to unshare these ${selectedSet.size} quizzes? This will also delete all student submissions and quiz locks for these quizzes in this class.`
	            : `Are you sure you want to unshare these ${selectedSet.size} lessons?`;

	    setConfirmModal({
            isOpen: true,
            message: confirmMessage,
            confirmText: 'Delete',
            confirmColor: 'red',
            onConfirm: () => executeDeleteSelected(contentType, selectedSet) 
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
	                if (isSelected && contentType === 'quiz') {
	                    removedQuizIds.add(item.id);
	                }
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

	                const submissionsQuery = query(
	                    collection(db, 'quizSubmissions'),
	                    where('quizId', 'in', chunk),
	                    where('classId', '==', classData.id)
	                );
	                const submissionsSnapshot = await getDocs(submissionsQuery);
	                submissionsSnapshot.forEach((submissionDoc) => {
	                    batch.delete(submissionDoc.ref);
	                });

                    const locksQuery = query(
                        collection(db, 'quizLocks'),
                        where('quizId', 'in', chunk),
                        where('classId', '==', classData.id)
                    );
                    const locksSnapshot = await getDocs(locksQuery);
                    locksSnapshot.forEach((lockDoc) => {
	                    batch.delete(lockDoc.ref);
	                });
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
	                    const hasDeletedLesson = completed.some((id) =>
	                        deletedLessonIds.includes(id)
	                    );

	                    if (hasDeletedLesson) {
	                        const updatedCompleted = completed.filter(
	                            (id) => !deletedLessonIds.includes(id)
	                        );
	                        cleanupBatch.update(userRef, { completedLessons: updatedCompleted });
	                    }
	                }

	                await cleanupBatch.commit();
	                showToast(
	                    `${selectedSet.size} ${contentType}(s) and associated student records cleaned.`,
	                    'success'
	                );
	            } catch (err) {
	                console.error('Error cleaning up completedLessons (batch):', err);
	                showToast(
	                    `${selectedSet.size} ${contentType}(s) removed, but cleanup failed: ${err.message}`,
	                    'error'
	                );
	            }
	            setSelectedLessons(new Set());
	        } else {
	            showToast(
	                `${selectedSet.size} ${contentType}(s) and associated data removed.`,
	                'success'
	            );
	            setSelectedQuizzes(new Set());
	        }
	    } catch (error) {
	        console.error(`Error unsharing selected ${contentType}s:`, error);
	        showToast(
	            `Failed to unshare selected ${contentType}s. Error: ${error.message}`,
	            'error'
	        );
	    }
	};

    const handleUnlockQuiz = (quizId, studentId) => {
        setConfirmModal({
            isOpen: true,
            message: "Are you sure you want to unlock this quiz?",
            confirmText: 'Unlock',
            confirmColor: 'blue',
            onConfirm: () => executeUnlockQuiz(quizId, studentId)
        });
    };

    const executeUnlockQuiz = async (quizId, studentId) => {
        try {
            await deleteDoc(doc(db, 'quizLocks', `${quizId}_${studentId}`));
            showToast("Quiz unlocked.", "success");
        } catch (error) {
            showToast("Failed to unlock quiz.", "error");
        }
    };

    const handleEditDatesClick = (post) => {
        setPostToEdit(post);
        setIsEditModalOpen(true);
    };

	const handleDeleteContentFromPost = (postId, contentIdToRemove, contentType) => {
	    if (!classData?.id) return;

	    const confirmMessage =
	        contentType === 'quiz'
	            ? `Are you sure you want to unshare this quiz? This will also delete all student submissions and quiz locks for this quiz in this class.`
	            : `Are you sure you want to unshare this lesson?`;

	    setConfirmModal({
            isOpen: true,
            message: confirmMessage,
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
	        if (!postToUpdate) throw new Error('Post not found');

	        const currentContent = postToUpdate[fieldToUpdate] || [];
	        const updatedContent = currentContent.filter(item => item.id !== contentIdToRemove);

	        batch.update(postRef, { [fieldToUpdate]: updatedContent });
	        batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });

	        if (contentType === 'quiz') {
	            const submissionsQuery = query(
	                collection(db, 'quizSubmissions'),
	                where('quizId', '==', contentIdToRemove),
	                where('classId', '==', classData.id)
	            );
	            const submissionsSnapshot = await getDocs(submissionsQuery);
	            submissionsSnapshot.forEach(submissionDoc => {
	                batch.delete(submissionDoc.ref);
	            });

                const locksQuery = query(
                    collection(db, 'quizLocks'),
                    where('quizId', '==', contentIdToRemove),
                    where('classId', '==', classData.id)
                );
                const locksSnapshot = await getDocs(locksQuery);
                locksSnapshot.forEach(lockDoc => {
                    batch.delete(lockDoc.ref);
                });
	        }

	        await batch.commit();

	        if (contentType === 'lesson') {
	            const deletedLessonIds = [contentIdToRemove];
	            const studentIds = (classData.students || []).map(s => s.id);
	            const cleanupBatch = writeBatch(db);

	            try {
	                for (const studentId of studentIds) {
	                    const userRef = doc(db, 'users', studentId);
	                    const userSnap = await getDoc(userRef);
	                    if (!userSnap.exists()) continue;

	                    const userData = userSnap.data();
	                    const completed = userData.completedLessons || [];
	                    const hasDeletedLesson = completed.some(id => deletedLessonIds.includes(id));

	                    if (hasDeletedLesson) {
	                        const updatedCompleted = completed.filter(id => !deletedLessonIds.includes(id));
	                        cleanupBatch.update(userRef, { completedLessons: updatedCompleted });
	                    }
	                }

	                await cleanupBatch.commit();
	                showToast(
	                    `Lesson and associated data removed (and cleaned from student progress).`,
	                    'success'
	                );
	            } catch (err) {
	                console.error('Error cleaning up completedLessons (batch):', err);
	                showToast(
	                    `Lesson removed but cleanup of student records failed: ${err.message}`,
	                    'error'
	                );
	            }
	        } else {
	            showToast(
	                `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} and associated data removed.`,
	                'success'
	            );
	        }
	    } catch (error) {
	        console.error(`Error unsharing ${contentType}:`, error);
	        showToast(`Failed to unshare ${contentType}. Error: ${error.message}`, 'error');
	    }
	};


    const handleDeleteUnitContent = async (unitDisplayName, contentType) => {
        console.warn("handleDeleteUnitContent is deprecated with the new layout.");
    };


    const handlePostUpdate = (updateInfo) => {
        if (updateInfo.isDeleted) {
            setSharedContentPosts(prevPosts => prevPosts.filter(p => p.id !== updateInfo.id));
        } else if (updateInfo.isMassUpdate) {
             console.log("Mass update triggered, waiting for snapshot listener to refresh data.");
        }
        else {
            setSharedContentPosts(prevPosts =>
                prevPosts.map(p => p.id === updateInfo.id ? { ...p, ...updateInfo } : p)
            );
        }
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            message: "Are you sure you want to delete this announcement?",
            confirmText: 'Delete',
            confirmColor: 'red',
            onConfirm: () => executeDeleteAnnouncement(id)
        });
    };

    const executeDeleteAnnouncement = async (id) => {
        try {
            await deleteDoc(doc(db, 'studentAnnouncements', id));
            showToast("Announcement deleted.", "success");
        } catch (error) {
            showToast("Failed to delete announcement.", "error");
        }
    };

    const handleEditSave = async (id) => {
        const trimmedContent = editContent.trim();
        if (!trimmedContent) return showToast("Content cannot be empty.", "error");
        try {
            await updateDoc(doc(db, 'studentAnnouncements', id), { content: trimmedContent });
            setEditingId(null);
            setEditContent('');
            showToast("Announcement updated.", "success");
        } catch (error)
        {
            showToast("Failed to update.", "error");
        }
    };

    
    const renderContent = () => {
        const EmptyState = ({ icon: Icon, text, subtext }) => (
            <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="text-center p-8 sm:p-14 bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/5 mt-4 sm:mt-6 flex flex-col items-center justify-center shadow-lg"
            >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 sm:mb-5 shadow-inner">
                    <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{text}</p>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{subtext}</p>
            </motion.div>
        );
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
        const ListItem = ({ children, isChecked }) => (
            <div className={`flex items-center justify-between gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${isChecked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {children}
            </div>
        );
        
        const PostGroup = ({ children }) => (
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
                className="bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/5 shadow-sm overflow-hidden mb-4 sm:mb-6"
            >
                {children}
            </motion.div>
        );

        if (activeTab === 'lessons') {
            if (loadingPosts) {
                return (
                    <div className="space-y-6 pb-8">
                        <SkeletonPostGroup />
                        <SkeletonPostGroup />
                    </div>
                );
            }
            const lessonsByPostAndUnit = sharedContentPosts.reduce((acc, post) => {
                const postLessons = (post.lessons || []);
                if (postLessons.length === 0) return acc;
                if (!acc[post.id]) {
                    acc[post.id] = { post: post, units: {} };
                }
                postLessons.forEach(lessonDetails => {
                    const unitDisplayName = units[lessonDetails.unitId] || 'Uncategorized';
                    if (!acc[post.id].units[unitDisplayName]) {
                        acc[post.id].units[unitDisplayName] = [];
                    }
                    acc[post.id].units[unitDisplayName].push(lessonDetails);
                });
                return acc;
            }, {});
            
            const postEntries = Object.values(lessonsByPostAndUnit).sort((a, b) => 
                (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0)
            );
            
            const selectedSet = selectedLessons;

            return (
                <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-8">
                    {postEntries.length > 0 ? postEntries.map(({ post, units: unitsInPost }) => {
                        
                        const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                        const isPostCollapsed = collapsedPosts.has(post.id);

                        return (
                            <PostGroup key={post.id}>
                                <button 
                                    className="w-full text-left p-3 sm:p-5 group"
                                    onClick={() => togglePostCollapse(post.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-xl group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors truncate tracking-tight">{post.title}</h3>
                                            <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1">
                                                <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                {(() => {
                                                    let targetText = "All Students";
                                                    if (post.targetAudience === 'specific') targetText = `${post.targetStudentIds?.length || 0} Student(s)`;
                                                    return <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />Target: {targetText}</span>;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-3 pl-2 sm:pl-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                                                title="Edit Availability" 
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                                            >
                                                <Cog6ToothIcon className="w-5 h-5" />
                                            </button>
                                            
                                            <div className={`p-1 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                                <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                
                                {!isPostCollapsed && (
                                    <div className="space-y-3 sm:space-y-4 px-3 sm:px-4 pb-3 sm:pb-5">
                                        {sortedUnitKeys.map(unitDisplayName => {
                                            const lessonsInUnit = unitsInPost[unitDisplayName];
                                            const unitKey = `${post.id}_${unitDisplayName}`;
                                            const isUnitCollapsed = collapsedUnits.has(unitKey);
                                            
                                            const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
                                            const isAllSelected = lessonIdsInUnit.length > 0 && lessonIdsInUnit.every(id => selectedSet.has(id));

                                            return (
                                                <div key={unitKey} className="bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                                        <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                            <h4 className="font-bold text-xs sm:text-base text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors truncate">{unitDisplayName}</h4>
                                                            <ChevronDownIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                        </button>
                                                        <label className="flex items-center justify-end gap-2 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0 select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF]"
                                                                checked={isAllSelected}
                                                                onChange={() => {
                                                                    const set = setSelectedLessons;
                                                                    set(prevSet => {
                                                                        const newSet = new Set(prevSet);
                                                                        if (isAllSelected) lessonIdsInUnit.forEach(id => newSet.delete(id));
                                                                        else lessonIdsInUnit.forEach(id => newSet.add(id));
                                                                        return newSet;
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-[11px] sm:text-[13px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Select All</span>
                                                        </label>
                                                    </div>
                                                    
                                                    {!isUnitCollapsed && (
                                                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                                            {lessonsInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(lessonDetails => {
                                                                const isChecked = selectedSet.has(lessonDetails.id);
                                                                return (
                                                                    <ListItem key={lessonDetails.id} isChecked={isChecked}>
                                                                        <label className="p-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-4 w-4 sm:h-5 sm:w-5 rounded-[6px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF] transition-all"
                                                                                checked={isChecked}
                                                                                onChange={() => handleToggleSelection('lesson', lessonDetails.id)}
                                                                            />
                                                                        </label>
                                                                        <div className="flex-1 min-w-0" onClick={() => setViewLessonData(lessonDetails)}>
                                                                            <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base cursor-pointer hover:text-[#007AFF] transition-colors truncate">{lessonDetails.title}</p>
                                                                        </div>
                                                                        <div className="flex space-x-1 flex-shrink-0">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, lessonDetails.id, 'lesson'); }} className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Unshare Lesson"><TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                                                        </div>
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
                            </PostGroup>
                        );
                    }) : <EmptyState icon={PlayCircleIcon} text="No lessons shared yet" subtext="Share lessons with your class to get started." />}
                </div>
            );
        }
        
        if (activeTab === 'quizzes') {
            if (loadingPosts) {
                return (
                    <div className="space-y-6 pb-8">
                        <SkeletonPostGroup />
                        <SkeletonPostGroup />
                    </div>
                );
            }
            const quizzesByPostAndUnit = sharedContentPosts.reduce((acc, post) => {
                const postQuizzes = (post.quizzes || []);
                if (postQuizzes.length === 0) return acc;
                if (!acc[post.id]) {
                    acc[post.id] = { post: post, units: {} };
                }
                postQuizzes.forEach(quizDetails => {
                    const unitDisplayName = units[quizDetails.unitId] || 'Uncategorized';
                    if (!acc[post.id].units[unitDisplayName]) {
                        acc[post.id].units[unitDisplayName] = [];
                    }
                    acc[post.id].units[unitDisplayName].push(quizDetails);
                });
                return acc;
            }, {});
            
            const postEntries = Object.values(quizzesByPostAndUnit).sort((a, b) => 
                (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0)
            );

            const selectedSet = selectedQuizzes;

            return (
                <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-8">
                    {postEntries.length > 0 ? postEntries.map(({ post, units: unitsInPost }) => {
                        
                        const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                        const isPostCollapsed = collapsedPosts.has(post.id);

                        return (
                            <PostGroup key={post.id}>
                                <button 
                                    className="w-full text-left p-3 sm:p-5 group"
                                    onClick={() => togglePostCollapse(post.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-xl group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors truncate tracking-tight">{post.title}</h3>
                                            <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1">
                                                <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                {(() => {
                                                    let targetText = "All Students";
                                                    if (post.targetAudience === 'specific') targetText = `${post.targetStudentIds?.length || 0} Student(s)`;
                                                    return <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />Target: {targetText}</span>;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-3 pl-2 sm:pl-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                                                title="Edit Availability" 
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                                            >
                                                <Cog6ToothIcon className="w-5 h-5" />
                                            </button>
                                            <div className={`p-1 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                                <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                
                                {!isPostCollapsed && (
                                    <div className="space-y-3 sm:space-y-4 px-3 sm:px-4 pb-3 sm:pb-5">
                                        {sortedUnitKeys.map(unitDisplayName => {
                                            const quizzesInUnit = unitsInPost[unitDisplayName];
                                            const unitKey = `${post.id}_${unitDisplayName}`;
                                            const isUnitCollapsed = collapsedUnits.has(unitKey);

                                            const quizIdsInUnit = quizzesInUnit.map(q => q.id);
                                            const isAllSelected = quizIdsInUnit.length > 0 && quizIdsInUnit.every(id => selectedSet.has(id));

                                            return (
                                                <div key={unitKey} className="bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                                        <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                            <h4 className="font-bold text-xs sm:text-base text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors truncate">{unitDisplayName}</h4>
                                                            <ChevronDownIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                        </button>
                                                        <label className="flex items-center justify-end gap-2 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0 select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF]"
                                                                checked={isAllSelected}
                                                                onChange={() => {
                                                                    const set = setSelectedQuizzes;
                                                                    set(prevSet => {
                                                                        const newSet = new Set(prevSet);
                                                                        if (isAllSelected) quizIdsInUnit.forEach(id => newSet.delete(id));
                                                                        else quizIdsInUnit.forEach(id => newSet.add(id));
                                                                        return newSet;
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-[11px] sm:text-[13px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Select All</span>
                                                        </label>
                                                    </div>
                                                    
                                                    {!isUnitCollapsed && (
                                                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                                            {quizzesInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(quizDetails => {
                                                                const isChecked = selectedSet.has(quizDetails.id);
                                                                return (
                                                                    <ListItem key={quizDetails.id} isChecked={isChecked}>
                                                                        <label className="p-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-4 w-4 sm:h-5 sm:w-5 rounded-[6px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF] transition-all"
                                                                                checked={isChecked}
                                                                                onChange={() => handleToggleSelection('quiz', quizDetails.id)}
                                                                            />
                                                                        </label>
                                                                        <div
                                                                            className="flex-1 min-w-0"
                                                                            onClick={() => setViewQuizData({
                                                                                ...quizDetails,
                                                                                settings: post.quizSettings,
                                                                                availableFrom: post.availableFrom,
                                                                                availableUntil: post.availableUntil
                                                                            })}
                                                                        >
                                                                            <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate">
                                                                                {quizDetails.title}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex space-x-1 flex-shrink-0">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, quizDetails.id, 'quiz'); }} className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Unshare Quiz"><TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                                                        </div>
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
                            </PostGroup>
                        );
                    }) : <EmptyState icon={ClipboardDocumentListIcon} text="No quizzes shared yet" subtext="Share quizzes with your class to get started." />}
                </div>
            );
        }
        if (activeTab === 'scores') {
            if (loadingScores) {
                return (
                    <div className="pb-8">
                         <SkeletonScores />
                    </div>
                );
            }
            const allQuizzesFromPosts = sharedContentPosts.flatMap(p => p.quizzes || []);
            const allLessonsFromPosts = sharedContentPosts.flatMap(p => p.lessons || []);
            
            return (
                 <div className="pb-28 sm:pb-8">
                    <ScoresTab
                        quizzes={allQuizzesFromPosts}
                        units={units}
                        sharedContentPosts={sharedContentPosts}
                        lessons={allLessonsFromPosts}
                        quizScores={quizScores}
                        setIsReportModalOpen={setIsReportModalOpen}
                        setSelectedQuizForScores={setSelectedQuizForScores}
                        setScoresDetailModalOpen={setScoresDetailModalOpen}
                        collapsedUnits={collapsedUnits}
                        toggleUnitCollapse={toggleUnitCollapse}
                    />
                 </div>
            );
        }
        if (activeTab === 'students') {
            if (loadingStudents) {
                return (
                    <div className="space-y-4 pb-8">
                        <SkeletonStudentRow />
                        <SkeletonStudentRow />
                        <SkeletonStudentRow />
                    </div>
                );
            }

            return (
                 <div className="space-y-3 pb-28 sm:pb-8">
                    {(freshStudentData.length > 0) ? (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                            className="bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/5 shadow-sm overflow-hidden"
                        >
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {freshStudentData.map(student => (
                                    <div key={student.id} className="flex items-center justify-between gap-3 sm:gap-4 py-3 sm:py-4 px-4 sm:px-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-sm">
                                                <UserInitialsAvatar user={student} size="full" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{student.lastName || '[N/A]'}, {student.firstName || '[N/A]'}</p>
                                                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">ID: {student.id}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => onRemoveStudent(classData.id, student)} className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={`Remove ${student.firstName}`}>
                                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : <EmptyState icon={UserGroupIcon} text="No students enrolled" subtext="Share the class code to get students enrolled." />}
                </div>
            );
        }
        
        return (
            <div className="flex flex-col pb-28 sm:pb-8">
                {showAddForm && (<div className="mb-6 flex-shrink-0"><CreateClassAnnouncementForm classId={classData.id} onAnnouncementPosted={() => setShowAddForm(false)} /></div>)}
                <div className="space-y-4 sm:space-y-5 flex-grow">
                    {loadingAnnouncements ? (
                         <>
                            <SkeletonAnnouncement />
                            <SkeletonAnnouncement />
                         </>
                    ) : announcements.length > 0 ? (
                        announcements.map(post => (
                            <AnnouncementListItem 
                                key={post.id} 
                                post={post} 
                                isOwn={userProfile?.id === post.teacherId} 
                                onEdit={() => { setEditingId(post.id); setEditContent(post.content); }} 
                                onDelete={() => handleDelete(post.id)} 
                                isEditing={editingId === post.id} 
                                editContent={editContent} 
                                onChangeEdit={onChangeEdit} 
                                onSaveEdit={() => handleEditSave(post.id)} 
                                onCancelEdit={() => setEditingId(null)} 
                                onClick={() => setSelectedAnnouncement(post)} 
                            />
                        ))
                    ) : (
                        <EmptyState icon={ChatBubbleBottomCenterTextIcon} text="No announcements yet" subtext="Post important updates for your students here." />
                    )}
                </div>
            </div>
        );
    };

    const tabs = [
        { id: 'announcements', name: 'Notices', icon: ChatBubbleBottomCenterTextIcon },
        { id: 'lessons', name: 'Lessons', icon: PlayCircleIcon },
        { id: 'quizzes', name: 'Quizzes', icon: ClipboardDocumentListIcon },
        { id: 'scores', name: 'Scores', icon: PresentationChartLineIcon },
        { id: 'students', name: 'Students', icon: UserGroupIcon, count: classData?.students?.length || 0 }
    ];

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title=""
                size="screen" 
                roundedClass="rounded-none sm:rounded-3xl"
                containerClassName="h-full p-0 sm:p-4 bg-black/50 flex items-center justify-center backdrop-blur-sm"
                contentClassName="p-0 w-full h-full flex items-center justify-center pointer-events-none" 
                showCloseButton={false}
            >
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-auto relative w-full max-w-7xl h-[100dvh] sm:h-[85vh] bg-[#f8fafc] dark:bg-black overflow-hidden flex flex-col mx-auto rounded-none sm:rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10"
                >
                    <AuroraBackground />
                    
                    <div className="relative z-20 flex-shrink-0 bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
                        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-30">
                             <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors text-slate-600 dark:text-slate-300">
                                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        <div className="px-4 pt-4 sm:px-8 sm:pt-8 pb-3 sm:pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6 pr-10">
                                <div>
                                    <h1 className="text-xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">{classData?.name || 'Class Details'}</h1>
                                    <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 mt-1 sm:mt-2">
                                        <p className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 sm:gap-2">
                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] sm:text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Grade</span>
                                            {classData?.gradeLevel}
                                        </p>
                                        
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] sm:text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Owner</span>
                                            <div className="flex items-center gap-1">
                                                <UserInitialsAvatar user={userProfile} size="w-4 h-4 sm:w-5 sm:h-5" />
                                                <span>{userProfile?.displayName}</span>
                                            </div>
                                        </div>
                                        
                                        <p className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 sm:gap-2">
                                             <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] sm:text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Code</span>
                                            <span className="font-mono font-bold text-[#007AFF] tracking-wider">{classData?.classCode}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:flex justify-center w-full">
                                <div className="flex items-center p-1.5 bg-slate-100/80 dark:bg-black/40 backdrop-blur-xl rounded-full border border-white/40 dark:border-white/5 shadow-inner">
                                    {tabs.map(tab => {
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => handleTabChange(tab.id)}
                                                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-colors z-10 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeTabPill"
                                                        className="absolute inset-0 bg-white dark:bg-slate-700 rounded-full shadow-sm"
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                        style={{ zIndex: -1 }}
                                                    />
                                                )}
                                                <tab.icon className={`h-4 w-4 ${isActive ? 'text-[#007AFF] dark:text-white' : ''}`} />
                                                <span className="text-xs font-bold">{tab.name}</span>
                                                {tab.count !== undefined && <span className="opacity-60 text-[10px] ml-0.5">({tab.count})</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 min-h-[50px] sm:min-h-[60px]">
                         <div className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
                         </div>
                         <div className="flex items-center gap-2 sm:gap-3 ml-auto w-full sm:w-auto justify-end">
                                {activeTab === 'lessons' && selectedLessons.size > 0 && (
                                    <button 
                                        onClick={() => handleDeleteSelected('lesson')} 
                                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-full shadow-lg shadow-red-500/30 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span>Delete Selected ({selectedLessons.size})</span>
                                    </button>
                                )}
                                {activeTab === 'quizzes' && selectedQuizzes.size > 0 && (
                                    <button 
                                        onClick={() => handleDeleteSelected('quiz')} 
                                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-full shadow-lg shadow-red-500/30 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span>Delete Selected ({selectedQuizzes.size})</span>
                                    </button>
                                )}

                                {activeTab === 'scores' && (
                                    <button
                                        onClick={() => setIsReportModalOpen(true)}
                                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg shadow-blue-500/25 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <DocumentChartBarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>Generate Report</span>
                                    </button>
                                )}

                                {activeTab === 'announcements' && userProfile?.role === 'teacher' && (
                                    <button 
                                        onClick={() => setShowAddForm(prev => !prev)} 
                                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg shadow-blue-500/25 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <PlusCircleIcon className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
                                        <span>{showAddForm ? 'Cancel' : 'New Post'}</span>
                                    </button>
                                )}
                            </div>
                    </div>

                    <div className="relative z-0 flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 overscroll-contain">
                         <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                {renderContent()}
                            </motion.div>
                         </AnimatePresence>
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50 sm:hidden pointer-events-none">
                        <motion.div 
                            layout
                            className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 px-2 py-2 rounded-full flex items-center justify-between w-[90%] max-w-sm gap-1.5 shadow-2xl"
                        >
                             {tabs.map(tab => {
                                 const isActive = activeTab === tab.id;
                                 return (
                                     <motion.button
                                         key={tab.id}
                                         onClick={() => handleTabChange(tab.id)}
                                         layout
                                         className={`relative group flex items-center justify-center gap-1.5 p-2 rounded-full transition-colors outline-none overflow-hidden ${
                                            isActive 
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex-[3]' 
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/10 flex-1'
                                         }`}
                                     >
                                         <motion.div layout className="relative flex-shrink-0">
                                            <tab.icon className={`h-5 w-5 ${isActive ? 'scale-105' : 'opacity-80'}`} />
                                            
                                            {tab.count > 0 && !isActive && (
                                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white dark:border-slate-800"></span>
                                                </span>
                                            )}
                                         </motion.div>
                                         
                                         <AnimatePresence>
                                            {isActive && (
                                                <motion.span 
                                                    initial={{ opacity: 0, width: 0 }} 
                                                    animate={{ opacity: 1, width: "auto" }} 
                                                    exit={{ opacity: 0, width: 0 }} 
                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                    className="text-[9px] font-bold tracking-wide whitespace-nowrap overflow-hidden"
                                                >
                                                    {tab.name}
                                                </motion.span>
                                            )}
                                         </AnimatePresence>
                                     </motion.button>
                                 )
                             })}
                        </motion.div>
                    </div>
                </motion.div>
            </Modal>

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

			 <GenerateReportModal
			   isOpen={isReportModalOpen}
			   onClose={() => setIsReportModalOpen(false)}
			   classData={classData}
			   availableQuizzes={sharedContentPosts.flatMap(p => p.quizzes || [])}
			   quizScores={quizScores}
			   units={units}
			   sharedContentPosts={sharedContentPosts}
			   className="z-[120]"
			 />

            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} className="z-[120]" />
            <ViewQuizModal isOpen={!!viewQuizData} onClose={() => setViewQuizData(null)} quiz={viewQuizData} userProfile={userProfile} classId={classData?.id} isTeacherView={userProfile.role === 'teacher' || userProfile.role === 'admin'} className="z-[120]" />
            <EditAvailabilityModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} post={postToEdit} classId={classData?.id} onUpdate={handlePostUpdate} classData={classData} className="z-[120]" />
            {selectedQuizForScores && (<QuizScoresModal isOpen={isScoresDetailModalOpen} onClose={() => setScoresDetailModalOpen(false)} quiz={selectedQuizForScores} classData={classData} quizScores={quizScores} setQuizScores={setQuizScores} quizLocks={quizLocks} onUnlockQuiz={handleUnlockQuiz} setIsReportModalOpen={setIsReportModalOpen} className="z-[120]" />)}
            <AnnouncementViewModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} className="z-[120]" />
        </>
    );
};

const AnnouncementListItem = ({ post, isOwn, onEdit, onDelete, isEditing, editContent, onChangeEdit, onSaveEdit, onCancelEdit, onClick }) => {
    const formattedDate = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '...';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={!isEditing ? onClick : undefined}
        >
            {isEditing ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                    <textarea 
                        className="w-full border-none p-3 sm:p-4 rounded-xl text-sm sm:text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-[#007AFF]/20 bg-slate-50 dark:bg-black/20 resize-none" 
                        rows={3} 
                        value={editContent} 
                        onChange={onChangeEdit} 
                        onClick={(e) => e.stopPropagation()} 
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 sm:gap-3">
                        <button 
                            className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm rounded-full font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors" 
                            onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                        >
                            Cancel
                        </button>
                        <button 
                            className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm rounded-full font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] shadow-lg shadow-blue-500/30 transition-all active:scale-95" 
                            onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-white text-base sm:text-lg leading-relaxed group-hover:text-[#007AFF] transition-colors line-clamp-3">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2 sm:mt-3 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{post.teacherName}</span>
                            <span>•</span>
                            <span>{formattedDate}</span>
                        </div>
                    </div>
                    {isOwn && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit" className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"><Cog6ToothIcon className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                    </div>}
                </div>
            )}
        </motion.div>
    );
};

export default ClassOverviewModal;