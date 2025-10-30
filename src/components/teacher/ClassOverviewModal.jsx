import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Timestamp,
    onSnapshot,
    getDocs,
	getDoc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { Button } from '@tremor/react';
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
    ChevronUpIcon,
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

const fetchDocsInBatches = async (collectionName, ids) => {
    // ... (no changes in this function)
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

const PostHeader = ({ post, onEditDates }) => (
    // ... (no changes in this component)
    <>
        <h3 className="font-bold text-slate-800 text-xl px-2 pt-1">{post.title}</h3>
        <div className="text-xs text-slate-500 px-2 pb-2 mb-2 border-b border-slate-200/80 flex flex-wrap gap-x-3">
            <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
            {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
            {(() => {
                let targetText = "Target: All Students";
                if (post.targetAudience === 'all') {
                    targetText = "Target: All Students";
                } else if (post.targetAudience === 'specific') {
                    targetText = `Target: ${post.targetStudentIds?.length || 0} Student(s)`;
                }
                return <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3 text-slate-400" />{targetText}</span>;
            })()}
            <button onClick={onEditDates} title="Edit Availability" className="flex items-center gap-1 text-sky-600 hover:underline">
                <PencilSquareIcon className="w-3 h-3" /> Edit
            </button>
        </div>
    </>
);


const ClassOverviewModal = ({ isOpen, onClose, classData, onRemoveStudent }) => {
    // ... (no changes in state or effects)
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
        }
    }, [isOpen, classData?.id]);

    useEffect(() => {
        // ... (no changes in this effect)
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
        // ... (no changes in this effect)
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
        // ... (no changes in this effect)
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
        // ... (no changes in this effect)
        if (!isOpen || !classData?.id) {
             setQuizLocks([]); // Clear locks if modal is closed or no class
             return;
        }

        // When classQuizIds changes (e.g., a quiz is deleted),
        // filter the local state to remove locks for quiz IDs that no longer exist.
        setQuizLocks(prevLocks => prevLocks.filter(lock => classQuizIds.includes(lock.quizId)));

        if (classQuizIds.length === 0) {
            setQuizLocks([]); // No quizzes, so no locks
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
                    // Get all locks NOT in this chunk
                    const otherLocks = prevLocks.filter(lock => !chunk.includes(lock.quizId));
                    // Return the combination
                    return [...otherLocks, ...locksFromThisChunk];
                });
            }, (error) => {
                console.error("Error listening to quiz locks chunk:", error);
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [isOpen, classData?.id, classQuizIds]);

    const togglePostCollapse = (postId) => {
        // ... (no changes in this function)
        setCollapsedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });
    };

    const toggleUnitCollapse = (postId, unitDisplayName) => {
        // ... (no changes in this function)
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
        // ... (no changes in this effect)
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
        // ... (no changes in this function)
        setActiveTab(tabName);
        setSelectedLessons(new Set());
        setSelectedQuizzes(new Set());
    };

    const handleToggleSelection = (contentType, contentId) => {
        // ... (no changes in this function)
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

	const handleDeleteSelected = async (contentType) => {
	    // ... (no changes in this function)
	    if (!classData?.id) return;

	    const selectedSet = contentType === 'lesson' ? selectedLessons : setSelectedQuizzes;
	    if (selectedSet.size === 0) return;

	    const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';
	    const confirmMessage =
	        contentType === 'quiz'
	            ? `Are you sure you want to unshare these ${selectedSet.size} quizzes? This will also delete all student submissions and quiz locks for these quizzes in this class.`
	            : `Are you sure you want to unshare these ${selectedSet.size} lessons?`;

	    if (!window.confirm(confirmMessage)) return;

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
	                const chunk = quizIdArray.slice(i, i + 30);
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

    const handleUnlockQuiz = async (quizId, studentId) => {
        // ... (no changes in this function)
        if (!window.confirm("Are you sure you want to unlock this quiz?")) return;
        try {
            await deleteDoc(doc(db, 'quizLocks', `${quizId}_${studentId}`));
            showToast("Quiz unlocked.", "success");
        } catch (error) {
            showToast("Failed to unlock quiz.", "error");
        }
    };
    const handleEditDatesClick = (post) => {
        // ... (no changes in this function)
        setPostToEdit(post);
        setIsEditModalOpen(true);
    };

	const handleDeleteContentFromPost = async (postId, contentIdToRemove, contentType) => {
	    // ... (no changes in this function)
	    if (!classData?.id) return;

	    const confirmMessage =
	        contentType === 'quiz'
	            ? `Are you sure you want to unshare this quiz? This will also delete all student submissions and quiz locks for this quiz in this class.`
	            : `Are you sure you want to unshare this lesson?`;

	    if (!window.confirm(confirmMessage)) return;

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
        // ... (no changes in this function)
        console.warn("handleDeleteUnitContent is deprecated with the new layout.");
    };


    const handlePostUpdate = (updateInfo) => {
        // ... (no changes in this function)
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

    const handleDelete = async (id) => {
        // ... (no changes in this function)
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'studentAnnouncements', id));
            showToast("Announcement deleted.", "success");
        } catch (error) {
            showToast("Failed to delete announcement.", "error");
        }
    };
    const handleEditSave = async (id) => {
        // ... (no changes in this function)
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
        if (loading && activeTab !== 'announcements') return <div className="text-center py-10 text-slate-500 text-lg">Loading...</div>;

        const EmptyState = ({ icon: Icon, text, subtext }) => (
            <div className="text-center p-8 sm:p-12 bg-neumorphic-base rounded-2xl shadow-neumorphic-inset mt-4">
                <Icon className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
                <p className="text-lg sm:text-xl font-semibold text-slate-700">{text}</p>
                <p className="mt-2 text-base text-slate-500">{subtext}</p>
            </div>
        );
        const customUnitSort = (a, b) => {
            // ... (no changes in this function)
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
            // --- MODIFICATION: Reduced vertical padding on mobile ---
            <div className={`flex items-center justify-between gap-2 sm:gap-4 py-2 px-2 sm:py-3 sm:px-4 rounded-xl transition-colors ${isChecked ? 'bg-sky-100/50' : 'hover:bg-slate-50/50'}`}>
                {children}
            </div>
        );
        
        const PostGroup = ({ children }) => (
            <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic">
                {children}
            </div>
        );

        if (activeTab === 'lessons') {
            const lessonsByPostAndUnit = sharedContentPosts.reduce((acc, post) => {
                // ... (no changes in this logic)
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
                <div className="space-y-6 pr-2 max-h-full overflow-y-auto custom-scrollbar">
                    {postEntries.length > 0 ? postEntries.map(({ post, units: unitsInPost }) => {
                        
                        const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                        const isPostCollapsed = collapsedPosts.has(post.id);

                        return (
                            <PostGroup key={post.id}>
                                <button 
                                    className="w-full text-left p-3 sm:p-4 group"
                                    onClick={() => togglePostCollapse(post.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 text-lg sm:text-xl group-hover:text-sky-600 transition-colors truncate">{post.title}</h3>
                                            <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-3">
                                                <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                {(() => {
                                                    let targetText = "Target: All Students";
                                                    if (post.targetAudience === 'all') targetText = "Target: All Students";
                                                    else if (post.targetAudience === 'specific') targetText = `Target: ${post.targetStudentIds?.length || 0} Student(s)`;
                                                    return <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3 text-slate-400" />{targetText}</span>;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2 pl-2 sm:pl-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                                                title="Edit Availability" 
                                                className="flex items-center gap-1 text-xs sm:text-sm text-sky-600 hover:underline p-1"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" /> <span className="hidden sm:inline">Manage</span>
                                            </button>
                                            <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${isPostCollapsed ? '' : 'rotate-180'}`} />
                                        </div>
                                    </div>
                                </button>
                                
                                {!isPostCollapsed && (
                                    <div className="space-y-3 px-2 sm:px-4 pb-4">
                                        {sortedUnitKeys.map(unitDisplayName => {
                                            const lessonsInUnit = unitsInPost[unitDisplayName];
                                            const unitKey = `${post.id}_${unitDisplayName}`;
                                            const isUnitCollapsed = collapsedUnits.has(unitKey);
                                            
                                            const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
                                            const isAllSelected = lessonIdsInUnit.length > 0 && lessonIdsInUnit.every(id => selectedSet.has(id));

                                            return (
                                                <div key={unitKey} className="bg-neumorphic-base rounded-xl shadow-neumorphic-inset">
                                                    {/* --- MODIFICATION: Reduced padding and gap for mobile --- */}
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-slate-200/80">
                                                        <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                            {/* --- MODIFICATION: Reduced font size for mobile --- */}
                                                            <h4 className="font-semibold text-sm sm:text-base text-slate-800 group-hover:text-sky-600 truncate">{unitDisplayName}</h4>
                                                            <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                        </button>
                                                        <label className="flex items-center justify-end gap-2 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded text-sky-600 border-slate-400 focus:ring-sky-500"
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
                                                            <span className="text-sm font-semibold text-slate-700">Select All</span>
                                                        </label>
                                                    </div>
                                                    
                                                    {!isUnitCollapsed && (
                                                        <div className="mt-1 px-2 pb-2">
                                                            {lessonsInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(lessonDetails => {
                                                                const isChecked = selectedSet.has(lessonDetails.id);
                                                                return (
                                                                    <ListItem key={lessonDetails.id} isChecked={isChecked}>
                                                                        {/* --- MODIFICATION: Reduced padding --- */}
                                                                        <label className="p-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-5 w-5 rounded text-sky-600 border-slate-400 focus:ring-sky-500 focus:ring-2"
                                                                                checked={isChecked}
                                                                                onChange={() => handleToggleSelection('lesson', lessonDetails.id)}
                                                                            />
                                                                        </label>
                                                                        <div className="flex-1 min-w-0" onClick={() => setViewLessonData(lessonDetails)}>
                                                                            {/* --- MODIFICATION: Reduced font size for mobile --- */}
                                                                            <p className="font-bold text-slate-800 text-sm sm:text-base cursor-pointer hover:text-sky-600 transition-colors truncate">{lessonDetails.title}</p>
                                                                        </div>
                                                                        <div className="flex space-x-1 flex-shrink-0">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, lessonDetails.id, 'lesson'); }} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title="Unshare Lesson"><TrashIcon className="w-5 h-5" /></button>
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
                // ... (no changes in this logic)
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
                <div className="space-y-6 pr-2 max-h-full overflow-y-auto custom-scrollbar">
                    {postEntries.length > 0 ? postEntries.map(({ post, units: unitsInPost }) => {
                        
                        const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                        const isPostCollapsed = collapsedPosts.has(post.id);

                        return (
                            <PostGroup key={post.id}>
                                <button 
                                    className="w-full text-left p-3 sm:p-4 group"
                                    onClick={() => togglePostCollapse(post.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 text-lg sm:text-xl group-hover:text-sky-600 transition-colors truncate">{post.title}</h3>
                                            <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-3">
                                                <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                {(() => {
                                                    let targetText = "Target: All Students";
                                                    if (post.targetAudience === 'all') targetText = "Target: All Students";
                                                    else if (post.targetAudience === 'specific') targetText = `Target: ${post.targetStudentIds?.length || 0} Student(s)`;
                                                    return <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3 text-slate-400" />{targetText}</span>;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2 pl-2 sm:pl-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                                                title="Edit Availability" 
                                                className="flex items-center gap-1 text-xs sm:text-sm text-sky-600 hover:underline p-1"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" /> <span className="hidden sm:inline">Manage</span>
                                            </button>
                                            <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${isPostCollapsed ? '' : 'rotate-180'}`} />
                                        </div>
                                    </div>
                                </button>
                                
                                {!isPostCollapsed && (
                                    <div className="space-y-3 px-2 sm:px-4 pb-4">
                                        {sortedUnitKeys.map(unitDisplayName => {
                                            const quizzesInUnit = unitsInPost[unitDisplayName];
                                            const unitKey = `${post.id}_${unitDisplayName}`;
                                            const isUnitCollapsed = collapsedUnits.has(unitKey);

                                            const quizIdsInUnit = quizzesInUnit.map(q => q.id);
                                            const isAllSelected = quizIdsInUnit.length > 0 && quizIdsInUnit.every(id => selectedSet.has(id));

                                            return (
                                                <div key={unitKey} className="bg-neumorphic-base rounded-xl shadow-neumorphic-inset">
                                                    {/* --- MODIFICATION: Reduced padding and gap for mobile --- */}
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-slate-200/80">
                                                        <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                            {/* --- MODIFICATION: Reduced font size for mobile --- */}
                                                            <h4 className="font-semibold text-sm sm:text-base text-slate-800 group-hover:text-sky-600 truncate">{unitDisplayName}</h4>
                                                            <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                        </button>
                                                        <label className="flex items-center justify-end gap-2 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded text-sky-600 border-slate-400 focus:ring-sky-500"
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
                                                            <span className="text-sm font-semibold text-slate-700">Select All</span>
                                                        </label>
                                                    </div>
                                                    
                                                    {!isUnitCollapsed && (
                                                        <div className="mt-1 px-2 pb-2">
                                                            {quizzesInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(quizDetails => {
                                                                const isChecked = selectedSet.has(quizDetails.id);
                                                                return (
                                                                    <ListItem key={quizDetails.id} isChecked={isChecked}>
                                                                        {/* --- MODIFICATION: Reduced padding --- */}
                                                                        <label className="p-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-5 w-5 rounded text-sky-600 border-slate-400 focus:ring-sky-500 focus:ring-2"
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
                                                                            {/* --- MODIFICATION: Reduced font size for mobile --- */}
                                                                            <p className="font-bold text-slate-800 text-sm sm:text-base cursor-pointer hover:text-purple-600 transition-colors truncate">
                                                                                {quizDetails.title}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex space-x-1 flex-shrink-0">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, quizDetails.id, 'quiz'); }} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title="Unshare Quiz"><TrashIcon className="w-5 h-5" /></button>
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
            // ... (no changes in this block)
            const allQuizzesFromPosts = sharedContentPosts.flatMap(p => p.quizzes || []);
            const allLessonsFromPosts = sharedContentPosts.flatMap(p => p.lessons || []);
            
            return (
                 <div className="pr-2 max-h-full overflow-y-auto custom-scrollbar">
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
            // ... (no changes in this block)
            return (
                 <div className="space-y-3 pr-2 max-h-full overflow-y-auto custom-scrollbar">
                    {(classData?.students && classData.students.length > 0) ? (
                        <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic-inset p-1">
                            {classData.students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(student => (
                                <ListItem key={student.id} isChecked={false}>
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <div className="w-10 h-10 rounded-full flex-shrink-0">
                                            <UserInitialsAvatar user={student} size="w-10 h-10" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm sm:text-base">{student.lastName}, {student.firstName}</p>
                                            <p className="text-xs sm:text-sm text-slate-500">ID: {student.id}</p>
                                        </div>
                                    </div>
                                    {onRemoveStudent && <button onClick={() => onRemoveStudent(classData.id, student)} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title={`Remove ${student.firstName}`}><TrashIcon className="w-5 h-5" /></button>}
                                </ListItem>
                            ))}
                        </div>
                    ) : <EmptyState icon={UsersIcon} text="No students enrolled" subtext="Share the class code to get students enrolled." />}
                </div>
            );
        }
        
        return (
            // ... (no changes in this block)
            <div className="flex flex-col pr-2 max-h-full overflow-y-auto custom-scrollbar">
                {showAddForm && (<div className="mb-6 flex-shrink-0"><CreateClassAnnouncementForm classId={classData.id} onAnnouncementPosted={() => setShowAddForm(false)} /></div>)}
                <div className="space-y-4 flex-grow">
                    {announcements.length > 0 ? announcements.map(post => (<AnnouncementListItem key={post.id} post={post} isOwn={userProfile?.id === post.teacherId} onEdit={() => { setEditingId(post.id); setEditContent(post.content); }} onDelete={() => handleDelete(post.id)} isEditing={editingId === post.id} editContent={editContent} onChangeEdit={onChangeEdit} onSaveEdit={() => handleEditSave(post.id)} onCancelEdit={() => setEditingId(null)} onClick={() => setSelectedAnnouncement(post)} />)) : <EmptyState icon={MegaphoneIcon} text="No announcements yet" subtext="Post important updates for your students here." />}
                </div>
            </div>
        );
    };


    const tabs = [
        // ... (no changes in tabs array)
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
                roundedClass="rounded-2xl"
                containerClassName="h-full p-2 sm:p-4 bg-black/30 backdrop-blur-sm"
                contentClassName="p-0"
                showCloseButton={true}
            >
                {/* ... (no changes in this section) ... */}
                <div className="p-2 sm:p-4 md:p-8 bg-neumorphic-base h-[95vh] sm:h-[90vh] max-h-[95vh] flex flex-col mx-auto w-full max-w-7xl">
                    
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-neumorphic-base rounded-2xl shadow-neumorphic flex-shrink-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{classData?.name || 'Class Details'}</h1>
                        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 mt-3">
                            <p className="text-sm sm:text-base text-slate-600">
                                <span className="font-medium text-slate-500">Grade Level:</span>
                                <span className="font-semibold text-slate-700 ml-1.5">{classData?.gradeLevel}</span>
                            </p>
                            
                            <div className="flex items-center gap-1.5 text-sm sm:text-base text-slate-600">
                                <span className="font-medium text-slate-500">Class Owner:</span>
                                <UserInitialsAvatar user={userProfile} size="w-6 h-6" />
                                <span className="font-semibold text-slate-700">{userProfile?.displayName}</span>
                            </div>
                            
                            <p className="text-sm sm:text-base text-slate-600">
                                <span className="font-medium text-slate-500">Class Code:</span> 
                                <span className="font-bold text-sky-600 ml-1.5 tracking-wider">{classData?.classCode}</span>
                            </p>
                        </div>
                    </div>

                    <nav className="flex-shrink-0 flex items-center gap-2 p-2 bg-neumorphic-base rounded-2xl shadow-neumorphic overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'shadow-neumorphic-inset text-sky-600'
                                        : 'text-slate-700 hover:shadow-neumorphic-inset'
                                }`}
                            >
                                <tab.icon className="h-5 w-5" />
                                <span>{tab.name} {tab.count !== undefined && `(${tab.count})`}</span>
                            </button>
                        ))}
                    </nav>

                    <main className="flex-1 bg-neumorphic-base rounded-2xl shadow-neumorphic flex flex-col min-h-0 mt-4 sm:mt-6">
                        <header className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-4 flex-shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80">
                            
                            <div className="flex items-center gap-3">
                                {activeTab === 'lessons' && selectedLessons.size > 0 && (
                                    <Button 
                                        onClick={() => handleDeleteSelected('lesson')} 
                                        icon={TrashIcon} 
                                        color="red"
                                        className="font-semibold text-white bg-red-600 border-red-700 shadow-lg hover:bg-red-700"
                                    >
                                        <span className="hidden sm:inline">Delete {selectedLessons.size} Selected</span>
                                        <span className="sm:hidden">Delete ({selectedLessons.size})</span>
                                    </Button>
                                )}
                                {activeTab === 'quizzes' && selectedQuizzes.size > 0 && (
                                    <Button 
                                        onClick={() => handleDeleteSelected('quiz')} 
                                        icon={TrashIcon} 
                                        color="red"
                                        className="font-semibold text-white bg-red-600 border-red-700 shadow-lg hover:bg-red-700"
                                    >
                                        <span className="hidden sm:inline">Delete {selectedQuizzes.size} Selected</span>
                                        <span className="sm:hidden">Delete ({selectedQuizzes.size})</span>
                                    </Button>
                                )}

                                {activeTab === 'scores' && (
                                    <button
                                        onClick={() => setIsReportModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-500 active:scale-95 transition-all duration-200"
                                    >
                                        <DocumentChartBarIcon className="h-5 w-5" />
                                        <span className="hidden sm:inline">Generate Report</span>
                                        <span className="sm:hidden">Report</span>
                                    </button>
                                )}

                                {activeTab === 'announcements' && userProfile?.role === 'teacher' && (
                                    <div>
                                        <Button onClick={() => setShowAddForm(prev => !prev)} icon={PlusCircleIcon} className="font-semibold text-white bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset border-none">{showAddForm ? 'Cancel' : 'New'}</Button>
                                    </div>
                                )}
                            </div>
                        </header>
                        
                        <div className="flex-1 p-4 sm:px-6 sm:pb-6 custom-scrollbar min-h-0">
                            {renderContent()}
                        </div>
                    </main>

                </div>
            </Modal>

			 <GenerateReportModal
			   /* ... (no changes in this component) ... */
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
    // ... (no changes in this component)
    const formattedDate = post.createdAt?.toDate().toLocaleString() || 'NA';
    return (
        <div className="group relative bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset cursor-pointer" onClick={!isEditing ? onClick : undefined}>
            {isEditing ? (
                <div className="flex flex-col gap-3">
                    <textarea className="w-full border-none p-2 rounded-lg text-base text-slate-800 focus:ring-0 bg-neumorphic-base shadow-neumorphic-inset" rows={3} value={editContent} onChange={onChangeEdit} onClick={(e) => e.stopPropagation()} />
                    <div className="flex justify-end gap-2">
                        <button className="px-4 py-1.5 text-sm rounded-full font-semibold bg-neumorphic-base text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                        <button className="px-4 py-1.5 text-sm rounded-full font-semibold bg-neumorphic-base text-sky-600 shadow-neumorphic hover:shadow-neumorphic-inset" onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}>Save</button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="font-semibold text-slate-800 text-base leading-snug group-hover:text-sky-600 transition-colors">{post.content}</p>
                        <p className="text-sm text-slate-500 mt-2">Posted by <span className="font-medium">{post.teacherName}</span> on {formattedDate}</p>
                    </div>
                    {isOwn && <div className="flex space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit" className="p-2 rounded-full text-slate-500 hover:shadow-neumorphic-inset"><PencilSquareIcon className="w-5 h-5" /></button><button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset"><TrashIcon className="w-5 h-5" /></button></div>}
                </div>
            )}
        </div>
    );
};


export default ClassOverviewModal;