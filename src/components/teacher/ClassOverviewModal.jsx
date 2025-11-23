import React, { useState, useEffect } from 'react';
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
    PencilSquareIcon,
    TrashIcon,
    CalendarDaysIcon,
    BookOpenIcon,
    AcademicCapIcon,
    UsersIcon,
    MegaphoneIcon,
    PlusCircleIcon,
    ChartBarIcon,
    ChevronDownIcon,
    XMarkIcon,
    ClockIcon,
    DocumentChartBarIcon
} from '@heroicons/react/24/solid';
import CreateClassAnnouncementForm from './CreateClassAnnouncementForm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ViewLessonModal from './ViewLessonModal';
import ViewQuizModal from './ViewQuizModal';
import GenerateReportModal from './GenerateReportModal';
import EditAvailabilityModal from './EditAvailabilityModal';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import Spinner from '../common/Spinner';

// --- HELPER: AURORA BACKGROUND ---
const AuroraBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/20 dark:bg-blue-500/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-400/20 dark:bg-purple-500/10 blur-[100px] animate-pulse delay-1000"></div>
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
    const [loading, setLoading] = useState(true);
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
        }
    }, [isOpen, classData?.id]);

    useEffect(() => {
        const fetchFreshStudentData = async () => {
            if (activeTab !== 'students' || !classData?.students || classData.students.length === 0) {
                setFreshStudentData([]); 
                return;
            }

            setLoadingStudents(true);
            try {
                const studentIds = classData.students.map(s => s.id);
                const students = await fetchDocsInBatches('users', studentIds);
                const sortedStudents = students.sort((a, b) => 
                    (a.lastName || '').localeCompare(b.lastName || '')
                );
                setFreshStudentData(sortedStudents);

            } catch (err) {
                console.error("Error fetching fresh student data:", err);
                showToast("Could not load updated student list.", "error");
                setFreshStudentData(classData.students.sort((a,b) => (a.lastName || '').localeCompare(b.lastName || '')));
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchFreshStudentData();
    }, [activeTab, classData?.students, showToast]);


    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        let active = true;
        const annQuery = query(collection(db, "studentAnnouncements"), where("classId", "==", classData.id), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(annQuery, (snapshot) => {
            if (!active) return;
            setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Error listening to announcements:", error));

        return () => { active = false; unsub(); };
    }, [isOpen, classData?.id]);

    useEffect(() => {
        if (!isOpen || !classData?.id) return;
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

        }, (error) => console.error("Error listening to posts:", error));

        return () => { active = false; unsub(); };
    }, [isOpen, classData?.id]);

    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        setLoading(true);
        let active = true;
        const scoresQuery = query(collection(db, 'quizSubmissions'), where("classId", "==", classData.id));
        const unsub = onSnapshot(scoresQuery, (snapshot) => {
            if (!active) return;
            setQuizScores(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error listening to quiz scores:", error);
            if (active) setLoading(false);
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
        if ((loading && activeTab !== 'announcements') || (loadingStudents && activeTab === 'students')) {
            return (
                <div className="flex justify-center items-center h-full min-h-[200px]">
                    <Spinner size="lg" />
                </div>
            );
        }

        const EmptyState = ({ icon: Icon, text, subtext }) => (
            <div className="text-center p-10 sm:p-14 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/5 mt-6 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-5">
                    <Icon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{text}</p>
                <p className="mt-2 text-base text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{subtext}</p>
            </div>
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
            <div className={`flex items-center justify-between gap-3 py-3 px-4 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 ${isChecked ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'hover:bg-slate-50/80 dark:hover:bg-white/5'}`}>
                {children}
            </div>
        );
        
        const PostGroup = ({ children }) => (
            <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden mb-6">
                {children}
            </div>
        );

        if (activeTab === 'lessons') {
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
                <div className="space-y-6 pb-8">
                    {postEntries.length > 0 ? postEntries.map(({ post, units: unitsInPost }) => {
                        
                        const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                        const isPostCollapsed = collapsedPosts.has(post.id);

                        return (
                            <PostGroup key={post.id}>
                                <button 
                                    className="w-full text-left p-5 group"
                                    onClick={() => togglePostCollapse(post.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xl group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors truncate tracking-tight">{post.title}</h3>
                                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-4">
                                                <span className="flex items-center gap-1.5"><CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                {(() => {
                                                    let targetText = "All Students";
                                                    if (post.targetAudience === 'specific') targetText = `${post.targetStudentIds?.length || 0} Student(s)`;
                                                    return <span className="flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5 text-slate-400" />Target: {targetText}</span>;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-3 pl-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                                                title="Edit Availability" 
                                                className="flex items-center gap-1.5 text-sm font-semibold text-[#007AFF] hover:text-[#0051A8] px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" /> <span className="hidden sm:inline">Manage</span>
                                            </button>
                                            <div className={`p-1 rounded-full bg-slate-100 dark:bg-white/10 transition-transform duration-300 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                                <ChevronDownIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                
                                {!isPostCollapsed && (
                                    <div className="space-y-4 px-4 pb-5">
                                        {sortedUnitKeys.map(unitDisplayName => {
                                            const lessonsInUnit = unitsInPost[unitDisplayName];
                                            const unitKey = `${post.id}_${unitDisplayName}`;
                                            const isUnitCollapsed = collapsedUnits.has(unitKey);
                                            
                                            const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
                                            const isAllSelected = lessonIdsInUnit.length > 0 && lessonIdsInUnit.every(id => selectedSet.has(id));

                                            return (
                                                <div key={unitKey} className="bg-white/50 dark:bg-black/20 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                                        <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                            <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors truncate">{unitDisplayName}</h4>
                                                            <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                        </button>
                                                        <label className="flex items-center justify-end gap-2.5 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0 select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded-[4px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF]"
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
                                                            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Select All</span>
                                                        </label>
                                                    </div>
                                                    
                                                    {!isUnitCollapsed && (
                                                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                                                            {lessonsInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(lessonDetails => {
                                                                const isChecked = selectedSet.has(lessonDetails.id);
                                                                return (
                                                                    <ListItem key={lessonDetails.id} isChecked={isChecked}>
                                                                        <label className="p-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-5 w-5 rounded-[6px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF] transition-all"
                                                                                checked={isChecked}
                                                                                onChange={() => handleToggleSelection('lesson', lessonDetails.id)}
                                                                            />
                                                                        </label>
                                                                        <div className="flex-1 min-w-0" onClick={() => setViewLessonData(lessonDetails)}>
                                                                            <p className="font-semibold text-slate-900 dark:text-white text-base cursor-pointer hover:text-[#007AFF] transition-colors truncate">{lessonDetails.title}</p>
                                                                        </div>
                                                                        <div className="flex space-x-1 flex-shrink-0">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, lessonDetails.id, 'lesson'); }} className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Unshare Lesson"><TrashIcon className="w-5 h-5" /></button>
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
                    }) : <EmptyState icon={BookOpenIcon} text="No lessons shared yet" subtext="Share lessons with your class to get started." />}
                </div>
            );
        }
        
        if (activeTab === 'quizzes') {
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
                <div className="space-y-6 pb-8">
                    {postEntries.length > 0 ? postEntries.map(({ post, units: unitsInPost }) => {
                        
                        const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                        const isPostCollapsed = collapsedPosts.has(post.id);

                        return (
                            <PostGroup key={post.id}>
                                <button 
                                    className="w-full text-left p-5 group"
                                    onClick={() => togglePostCollapse(post.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xl group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors truncate tracking-tight">{post.title}</h3>
                                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-4">
                                                <span className="flex items-center gap-1.5"><CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                {(() => {
                                                    let targetText = "All Students";
                                                    if (post.targetAudience === 'specific') targetText = `${post.targetStudentIds?.length || 0} Student(s)`;
                                                    return <span className="flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5 text-slate-400" />Target: {targetText}</span>;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-3 pl-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                                                title="Edit Availability" 
                                                className="flex items-center gap-1.5 text-sm font-semibold text-[#007AFF] hover:text-[#0051A8] px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" /> <span className="hidden sm:inline">Manage</span>
                                            </button>
                                            <div className={`p-1 rounded-full bg-slate-100 dark:bg-white/10 transition-transform duration-300 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                                <ChevronDownIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                
                                {!isPostCollapsed && (
                                    <div className="space-y-4 px-4 pb-5">
                                        {sortedUnitKeys.map(unitDisplayName => {
                                            const quizzesInUnit = unitsInPost[unitDisplayName];
                                            const unitKey = `${post.id}_${unitDisplayName}`;
                                            const isUnitCollapsed = collapsedUnits.has(unitKey);

                                            const quizIdsInUnit = quizzesInUnit.map(q => q.id);
                                            const isAllSelected = quizIdsInUnit.length > 0 && quizIdsInUnit.every(id => selectedSet.has(id));

                                            return (
                                                <div key={unitKey} className="bg-white/50 dark:bg-black/20 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                                        <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                            <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors truncate">{unitDisplayName}</h4>
                                                            <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                        </button>
                                                        <label className="flex items-center justify-end gap-2.5 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0 select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded-[4px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF]"
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
                                                            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Select All</span>
                                                        </label>
                                                    </div>
                                                    
                                                    {!isUnitCollapsed && (
                                                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                                                            {quizzesInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(quizDetails => {
                                                                const isChecked = selectedSet.has(quizDetails.id);
                                                                return (
                                                                    <ListItem key={quizDetails.id} isChecked={isChecked}>
                                                                        <label className="p-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-5 w-5 rounded-[6px] text-[#007AFF] border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-[#007AFF] transition-all"
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
                                                                            <p className="font-semibold text-slate-900 dark:text-white text-base cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate">
                                                                                {quizDetails.title}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex space-x-1 flex-shrink-0">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, quizDetails.id, 'quiz'); }} className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Unshare Quiz"><TrashIcon className="w-5 h-5" /></button>
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
                    }) : <EmptyState icon={AcademicCapIcon} text="No quizzes shared yet" subtext="Share quizzes with your class to get started." />}
                </div>
            );
        }
        if (activeTab === 'scores') {
            const allQuizzesFromPosts = sharedContentPosts.flatMap(p => p.quizzes || []);
            const allLessonsFromPosts = sharedContentPosts.flatMap(p => p.lessons || []);
            
            return (
                 <div className="pb-8">
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
                    <div className="flex justify-center items-center h-full min-h-[200px]">
                        <Spinner size="lg" />
                    </div>
                );
            }

            return (
                 <div className="space-y-3 pb-8">
                    {(freshStudentData.length > 0) ? (
                        <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {freshStudentData.map(student => (
                                    <div key={student.id} className="flex items-center justify-between gap-4 py-4 px-5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-white dark:ring-white/10 shadow-sm">
                                                <UserInitialsAvatar user={student} size="full" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-base">{student.lastName || '[N/A]'}, {student.firstName || '[N/A]'}</p>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">ID: {student.id}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => onRemoveStudent(classData.id, student)} className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={`Remove ${student.firstName}`}>
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState icon={UsersIcon} text="No students enrolled" subtext="Share the class code to get students enrolled." />}
                </div>
            );
        }
        
        return (
            <div className="flex flex-col pb-8">
                {showAddForm && (<div className="mb-6 flex-shrink-0"><CreateClassAnnouncementForm classId={classData.id} onAnnouncementPosted={() => setShowAddForm(false)} /></div>)}
                <div className="space-y-5 flex-grow">
                    {announcements.length > 0 ? announcements.map(post => (<AnnouncementListItem key={post.id} post={post} isOwn={userProfile?.id === post.teacherId} onEdit={() => { setEditingId(post.id); setEditContent(post.content); }} onDelete={() => handleDelete(post.id)} isEditing={editingId === post.id} editContent={editContent} onChangeEdit={onChangeEdit} onSaveEdit={() => handleEditSave(post.id)} onCancelEdit={() => setEditingId(null)} onClick={() => setSelectedAnnouncement(post)} />)) : <EmptyState icon={MegaphoneIcon} text="No announcements yet" subtext="Post important updates for your students here." />}
                </div>
            </div>
        );
    };


    const tabs = [
        { id: 'announcements', name: 'Announcements', icon: MegaphoneIcon },
        { id: 'lessons', name: 'Lessons', icon: BookOpenIcon },
        { id: 'quizzes', name: 'Quizzes', icon: AcademicCapIcon },
        { id: 'scores', name: 'Scores', icon: ChartBarIcon },
        { id: 'students', name: 'Students', icon: UsersIcon, count: classData?.students?.length || 0 }
    ];

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title=""
                size="screen" 
                roundedClass="rounded-none sm:rounded-3xl"
                containerClassName="h-full p-0 sm:p-4 bg-black/40 backdrop-blur-md flex items-center justify-center"
                contentClassName="p-0 w-full h-full flex items-center justify-center pointer-events-none" 
                showCloseButton={false}
            >
                {/* FIXED STRUCTURE WRAPPER:
                   - h-[100dvh] (Dynamic Viewport Height) ensures full height on mobile including browser bars.
                   - sm:h-[85vh] gives the "card" look on desktop.
                   - flex flex-col allows us to pin the header and scroll the rest.
                   - pointer-events-auto restores interaction.
                */}
                <div className="pointer-events-auto relative w-full max-w-7xl h-[100dvh] sm:h-[85vh] bg-[#f5f5f7] dark:bg-black overflow-hidden flex flex-col mx-auto rounded-none sm:rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10">
                    
                    <AuroraBackground />
                    
                    {/* --- FIXED HEADER SECTION --- */}
                    <div className="relative z-20 flex-shrink-0 bg-white/60 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5">
                        {/* Close Button */}
                        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
                             <button onClick={onClose} className="p-2 rounded-full bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 transition-colors text-slate-600 dark:text-slate-300 backdrop-blur-md">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Title & Meta Area (reduced padding on mobile) */}
                        <div className="px-5 pt-5 sm:px-8 sm:pt-8 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 pr-10">
                                <div>
                                    <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight drop-shadow-sm line-clamp-1">{classData?.name || 'Class Details'}</h1>
                                    <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 mt-2">
                                        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-white/10 text-[10px] sm:text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Grade</span>
                                            {classData?.gradeLevel}
                                        </p>
                                        
                                        <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-white/10 text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Owner</span>
                                            <div className="flex items-center gap-1.5">
                                                <UserInitialsAvatar user={userProfile} size="w-5 h-5" />
                                                <span>{userProfile?.displayName}</span>
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                             <span className="px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-white/10 text-[10px] sm:text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Code</span>
                                            <span className="font-mono font-bold text-[#007AFF] tracking-wider">{classData?.classCode}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SEGMENTED CONTROL TABS (Design Enhanced) 
                                - Uses a background container to look like a segmented control.
                                - Hides scrollbar but allows horizontal scroll on small screens.
                            */}
                            <div className="w-full overflow-hidden">
                                <div className="flex items-center p-1.5 bg-slate-200/50 dark:bg-black/20 backdrop-blur-md rounded-2xl overflow-x-auto no-scrollbar max-w-full sm:w-fit shadow-inner">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`
                                                relative flex-shrink-0 flex items-center gap-2 px-3 sm:px-5 py-2 rounded-xl font-semibold text-[13px] transition-all duration-300 ease-out
                                                ${activeTab === tab.id
                                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm scale-[1.02]'
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-white/5'}
                                            `}
                                        >
                                            <tab.icon className={`h-4 w-4 transition-colors ${activeTab === tab.id ? 'text-[#007AFF] dark:text-white' : ''}`} />
                                            <span className="whitespace-nowrap">{tab.name} {tab.count !== undefined && <span className="opacity-60 text-xs ml-0.5">({tab.count})</span>}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- FIXED TOOLBAR SECTION --- 
                        Stays docked below header, above content.
                    */}
                    <div className="relative z-10 flex-shrink-0 px-5 sm:px-6 py-3 bg-white/30 dark:bg-black/20 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-4 min-h-[60px]">
                         <div className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
                            {/* Placeholder for status text if needed */}
                         </div>
                         <div className="flex items-center gap-3 ml-auto w-full sm:w-auto justify-end">
                                {activeTab === 'lessons' && selectedLessons.size > 0 && (
                                    <button 
                                        onClick={() => handleDeleteSelected('lesson')} 
                                        className="flex items-center justify-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-red-500/30 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        <span>Delete Selected ({selectedLessons.size})</span>
                                    </button>
                                )}
                                {activeTab === 'quizzes' && selectedQuizzes.size > 0 && (
                                    <button 
                                        onClick={() => handleDeleteSelected('quiz')} 
                                        className="flex items-center justify-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-red-500/30 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        <span>Delete Selected ({selectedQuizzes.size})</span>
                                    </button>
                                )}

                                {activeTab === 'scores' && (
                                    <button
                                        onClick={() => setIsReportModalOpen(true)}
                                        className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-full shadow-lg shadow-blue-500/25 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <DocumentChartBarIcon className="h-4 w-4" />
                                        <span>Generate Report</span>
                                    </button>
                                )}

                                {activeTab === 'announcements' && userProfile?.role === 'teacher' && (
                                    <button 
                                        onClick={() => setShowAddForm(prev => !prev)} 
                                        className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-full shadow-lg shadow-blue-500/25 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        <PlusCircleIcon className={`h-5 w-5 transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
                                        <span>{showAddForm ? 'Cancel' : 'New Post'}</span>
                                    </button>
                                )}
                            </div>
                    </div>

                    {/* --- SCROLLABLE CONTENT AREA --- 
                        flex-1: Takes remaining vertical space.
                        overflow-y-auto: Enables internal scrolling.
                        overscroll-contain: Prevents parent body scroll.
                    */}
                    <div className="relative z-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 overscroll-contain">
                        {renderContent()}
                    </div>

                </div>
            </Modal>

            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title="Confirmation"
                size="sm"
                className="z-[200]" 
                contentClassName="p-0"
                roundedClass="rounded-[28px]"
                containerClassName="bg-black/40 backdrop-blur-md"
            >
                <div className="p-6 bg-white dark:bg-[#1c1c1e] rounded-[28px]">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                        <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">Are you sure?</h3>
                    <p className="text-center text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">{confirmModal.message}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
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
        <div className="group relative bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={!isEditing ? onClick : undefined}>
            {isEditing ? (
                <div className="flex flex-col gap-4">
                    <textarea 
                        className="w-full border-none p-4 rounded-xl text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-[#007AFF]/20 bg-white dark:bg-black/20 resize-none" 
                        rows={3} 
                        value={editContent} 
                        onChange={onChangeEdit} 
                        onClick={(e) => e.stopPropagation()} 
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            className="px-5 py-2 text-sm rounded-full font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors" 
                            onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                        >
                            Cancel
                        </button>
                        <button 
                            className="px-5 py-2 text-sm rounded-full font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] shadow-lg shadow-blue-500/30 transition-all active:scale-95" 
                            onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-white text-lg leading-relaxed group-hover:text-[#007AFF] transition-colors line-clamp-3">{post.content}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">{post.teacherName}</span>
                            <span>•</span>
                            <span>{formattedDate}</span>
                        </div>
                    </div>
                    {isOwn && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit" className="p-2 rounded-full text-slate-400 hover:text-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                    </div>}
                </div>
            )}
        </div>
    );
};


export default ClassOverviewModal;