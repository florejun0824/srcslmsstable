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
    ClockIcon
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
            setSelectedAnnouncement(null); setUnits({}); setCollapsedUnits(new Set());
            setClassQuizIds([]);
            setSelectedLessons(new Set());
            setSelectedQuizzes(new Set());
        }
    }, [isOpen, classData?.id]);

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
        const postsQuery = query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'desc'));
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
        if (!isOpen || !classData?.id || classQuizIds.length === 0) {
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

    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) newSet.delete(unitTitle);
            else newSet.add(unitTitle);
            return newSet;
        });
    };
    const onChangeEdit = (e) => setEditContent(e.target.value);

    useEffect(() => {
        if (isOpen && classData?.id && (activeTab === 'lessons' || activeTab === 'quizzes' || activeTab === 'scores')) {
            const allUnitTitles = new Set();
             sharedContentPosts.forEach(post => {
                (post.lessons || []).forEach(lesson => {
                    const unitDisplayName = units[lesson.unitId] || 'Uncategorized';
                    allUnitTitles.add(unitDisplayName);
                });
                (post.quizzes || []).forEach(quiz => {
                    const unitDisplayName = units[quiz.unitId] || 'Uncategorized';
                    allUnitTitles.add(unitDisplayName);
                });
            });
             if (Object.keys(units).length > 0 || sharedContentPosts.some(p => (p.lessons?.some(l => !l.unitId) || p.quizzes?.some(q => !q.unitId)))) {
                 if (allUnitTitles.size > 0) {
                    setCollapsedUnits(allUnitTitles);
                 } else {
                    setCollapsedUnits(new Set());
                 }
             }
        } else {
            setCollapsedUnits(new Set());
        }
    }, [activeTab, units, sharedContentPosts, isOpen, classData?.id]);

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

    const handleDeleteSelected = async (contentType) => {
        if (!classData?.id) return;

        const selectedSet = contentType === 'lesson' ? selectedLessons : selectedQuizzes;
        if (selectedSet.size === 0) return;

        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';
        const confirmMessage = contentType === 'quiz'
            ? `Are you sure you want to unshare these ${selectedSet.size} quizzes? This will also delete all student submissions for these quizzes in this class.`
            : `Are you sure you want to unshare these ${selectedSet.size} lessons?`;
        
        if (!window.confirm(confirmMessage)) return;

        try {
            const batch = writeBatch(db);
            const classRef = doc(db, "classes", classData.id);
            const removedQuizIds = new Set();
            
            for (const post of sharedContentPosts) {
                const currentContent = post[fieldToUpdate] || [];
                if (currentContent.length === 0) continue;

                const contentToKeep = currentContent.filter(item => {
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
                    submissionsSnapshot.forEach(submissionDoc => {
                        batch.delete(submissionDoc.ref);
                    });
                }
            }

            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });

            await batch.commit();

            showToast(`${selectedSet.size} ${contentType}(s) and associated data removed.`, "success");
            
            if (contentType === 'lesson') {
                setSelectedLessons(new Set());
            } else {
                setSelectedQuizzes(new Set());
            }

        } catch (error) {
            console.error(`Error unsharing selected ${contentType}s:`, error);
            showToast(`Failed to unshare selected ${contentType}s. Error: ${error.message}`, "error");
        }
    };

    const handleUnlockQuiz = async (quizId, studentId) => {
        if (!window.confirm("Are you sure you want to unlock this quiz?")) return;
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

    const handleDeleteContentFromPost = async (postId, contentIdToRemove, contentType) => {
        if (!classData?.id) return;
        const confirmMessage = contentType === 'quiz'
            ? `Are you sure you want to unshare this quiz? This will also delete all student submissions for this quiz in this class.`
            : `Are you sure you want to unshare this lesson?`;
        if (!window.confirm(confirmMessage)) return;

        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';

        try {
            const batch = writeBatch(db);
            const postRef = doc(db, 'classes', classData.id, 'posts', postId);
            const classRef = doc(db, "classes", classData.id);

            const postToUpdate = sharedContentPosts.find(p => p.id === postId);
            if (!postToUpdate) throw new Error("Post not found");

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
            }

            await batch.commit();

            showToast(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} and associated data removed.`, "success");
        } catch (error) {
            console.error(`Error unsharing ${contentType}:`, error);
            showToast(`Failed to unshare ${contentType}. Error: ${error.message}`, "error");
        }
    };

    const handleDeleteUnitContent = async (unitDisplayName, contentType) => {
        if (!classData?.id || !userProfile || userProfile.role !== 'teacher') return;

        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';
        const confirmMessage = contentType === 'quiz'
            ? `Are you sure you want to unshare ALL quizzes in the unit "${unitDisplayName}" from this class? This will also delete ALL student submissions for these quizzes in this class.`
            : `Are you sure you want to unshare ALL lessons in the unit "${unitDisplayName}" from this class?`;

        if (!window.confirm(confirmMessage)) return;

        const targetUnitId = unitDisplayName === 'Uncategorized'
            ? null
            : Object.keys(units).find(id => units[id] === unitDisplayName);
         if (targetUnitId === undefined && unitDisplayName !== 'Uncategorized') {
             console.error("Could not find unit ID for display name:", unitDisplayName);
             showToast("Error finding unit ID.", "error");
             return;
         }


        try {
            const batch = writeBatch(db);
            const classRef = doc(db, "classes", classData.id);
            const removedQuizIds = new Set();
            let contentRemoved = false;

            for (const post of sharedContentPosts) {
                const currentContent = post[fieldToUpdate] || [];
                if (currentContent.length === 0) continue;

                const contentToKeep = currentContent.filter(item => {
                    const itemUnitId = item.unitId || null;
                    const belongsToUnit = (targetUnitId === null && itemUnitId === null) ||
                                        (targetUnitId !== null && itemUnitId === targetUnitId);

                    if (belongsToUnit && contentType === 'quiz') {
                        removedQuizIds.add(item.id);
                    }
                    return !belongsToUnit;
                });

                if (contentToKeep.length < currentContent.length) {
                    contentRemoved = true;
                    const postRef = doc(db, 'classes', classData.id, 'posts', post.id);
                    batch.update(postRef, { [fieldToUpdate]: contentToKeep });
                }
            }

             if (!contentRemoved) {
                 showToast(`No ${contentType}s found in unit "${unitDisplayName}" to remove.`, "info");
                 return;
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
                     submissionsSnapshot.forEach(submissionDoc => {
                         batch.delete(submissionDoc.ref);
                     });
                 }
            }

            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });

            await batch.commit();

            showToast(`All ${contentType}s from unit "${unitDisplayName}" and associated data removed.`, "success");
        } catch (error) {
            console.error(`Error unsharing unit ${contentType}s:`, error);
            showToast(`Failed to unshare ${contentType}s for unit "${unitDisplayName}". Error: ${error.message}`, "error");
        }
    };


    const handlePostUpdate = (updateInfo) => {
        if (updateInfo.isDeleted) {
            setSharedContentPosts(prevPosts => prevPosts.filter(p => p.id !== updateInfo.id));
        } else {
            setSharedContentPosts(prevPosts =>
                prevPosts.map(p => p.id === updateInfo.id ? { ...p, ...updateInfo } : p)
            );
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
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
        } catch (error) {
            showToast("Failed to update.", "error");
        }
    };

    
    const renderContent = () => {
        if (loading && activeTab !== 'announcements') return <div className="text-center py-10 text-slate-500 text-lg">Loading...</div>;

        const EmptyState = ({ icon: Icon, text, subtext }) => (
            <div className="text-center p-12 bg-neumorphic-base rounded-2xl shadow-neumorphic-inset mt-4">
                <Icon className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
                <p className="text-xl font-semibold text-slate-700">{text}</p>
                <p className="mt-2 text-base text-slate-500">{subtext}</p>
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
        const ListItem = ({ children }) => (
            <div className="flex items-center justify-between gap-4 py-3 px-4 transition-shadow rounded-xl hover:shadow-neumorphic-inset">
                {children}
            </div>
        );
        
        const UnitGroup = ({ title, children }) => (
            <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic">
                <div className="flex items-center justify-between w-full p-4">
                    <button
                        className="flex-1 flex items-center justify-between text-left mr-2 group"
                        onClick={() => toggleUnitCollapse(title)}
                    >
                        <span className="font-semibold text-xl text-slate-800 group-hover:text-sky-600 transition-colors">{title}</span>
                        <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${!collapsedUnits.has(title) ? 'rotate-180' : ''}`} />
                    </button>
                </div>
                {!collapsedUnits.has(title) && <div className="px-2 pb-2">{children}</div>}
            </div>
        );

        if (activeTab === 'lessons') {
            const lessonsByUnit = sharedContentPosts.reduce((acc, post) => {
                (post.lessons || []).forEach(lessonDetails => {
                    const unitDisplayName = units[lessonDetails.unitId] || 'Uncategorized';
                    if (!acc[unitDisplayName]) acc[unitDisplayName] = [];
                    acc[unitDisplayName].push({ post, lessonDetails });
                });
                return acc;
            }, {});
            const sortedUnitKeys = Object.keys(lessonsByUnit).sort(customUnitSort);
            const selectedSet = selectedLessons;

            return (
                // FIX: Removed large h2 headers and ensured single scrolling container.
                <div className="space-y-6 pr-2 max-h-full overflow-y-auto custom-scrollbar">
                    {sortedUnitKeys.length > 0 ? sortedUnitKeys.map(unitDisplayName => {
                        
                        const lessonsInUnit = lessonsByUnit[unitDisplayName];
                        const lessonIdsInUnit = lessonsInUnit.map(l => l.lessonDetails.id);
                        const isAllSelected = lessonIdsInUnit.length > 0 && lessonIdsInUnit.every(id => selectedSet.has(id));

                        return (
                            <UnitGroup
                                key={unitDisplayName}
                                title={unitDisplayName}
                            >
                                <div className="px-4 pt-2 pb-3 border-b border-slate-200/80" onClick={(e) => e.stopPropagation()}>
                                    <label className="flex items-center gap-3 cursor-pointer w-fit">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded text-sky-600 border-slate-400 focus:ring-sky-500 focus:ring-2"
                                            checked={isAllSelected}
                                            onChange={() => {
                                                const set = setSelectedLessons;
                                                set(prevSet => {
                                                    const newSet = new Set(prevSet);
                                                    if (isAllSelected) {
                                                        lessonIdsInUnit.forEach(id => newSet.delete(id));
                                                    } else {
                                                        lessonIdsInUnit.forEach(id => newSet.add(id));
                                                    }
                                                    return newSet;
                                                });
                                            }}
                                        />
                                        <span className="font-semibold text-slate-700">Select All in this Unit</span>
                                    </label>
                                </div>

                                {lessonsInUnit.sort((a, b) => (a.lessonDetails.order || 0) - (b.lessonDetails.order || 0) || a.lessonDetails.title.localeCompare(b.lessonDetails.title)).map(({ post, lessonDetails }) => (
                                    <ListItem key={`${post.id}-${lessonDetails.id}`}>
                                        <label className="p-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded text-sky-600 border-slate-400 focus:ring-sky-500 focus:ring-2"
                                                checked={selectedSet.has(lessonDetails.id)}
                                                onChange={() => handleToggleSelection('lesson', lessonDetails.id)}
                                            />
                                        </label>
                                        <div className="flex-1 min-w-0" onClick={() => setViewLessonData(lessonDetails)}>
                                            <p className="font-bold text-slate-800 text-lg cursor-pointer hover:text-sky-600 transition-colors truncate">{lessonDetails.title}</p>
                                            
                                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                                                <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                
                                                {(() => {
                                                    let targetText = "Target: All Students";
                                                    if (post.targetAudience === 'all') {
                                                        targetText = "Target: All Students";
                                                    } else if (post.targetAudience === 'specific') {
                                                        targetText = `Target: ${post.targetStudentIds?.length || 0} Student(s)`;
                                                    }
                                                    return (
                                                        <span className="flex items-center gap-1">
                                                            <UsersIcon className="h-3 w-3 text-slate-400" />
                                                            {targetText}
                                                        </span>
                                                    );
                                                })()}
                                            </div>

                                        </div>
                                        <div className="flex space-x-1 flex-shrink-0">
                                            <button onClick={() => handleEditDatesClick(post)} title="Edit Availability" className="p-2 rounded-full text-slate-500 hover:shadow-neumorphic-inset"><PencilSquareIcon className="w-5 h-5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, lessonDetails.id, 'lesson'); }} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title="Unshare Lesson"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </ListItem>
                                ))}
                            </UnitGroup>
                        );
                    }) : <EmptyState icon={BookOpenIcon} text="No lessons shared yet" subtext="Share lessons with your class to get started." />}
                </div>
            );
        }
        
        if (activeTab === 'quizzes') {
             const quizzesByUnit = sharedContentPosts.reduce((acc, post) => {
                (post.quizzes || []).forEach(quizDetails => {
                    const unitDisplayName = units[quizDetails.unitId] || 'Uncategorized';
                    if (!acc[unitDisplayName]) acc[unitDisplayName] = [];
                    acc[unitDisplayName].push({ post, quizDetails });
                });
                return acc;
            }, {});
            const sortedUnitKeys = Object.keys(quizzesByUnit).sort(customUnitSort);
            const selectedSet = selectedQuizzes;

            return (
                // FIX: Removed large h2 headers and ensured single scrolling container.
                <div className="space-y-6 pr-2 max-h-full overflow-y-auto custom-scrollbar">
                    {sortedUnitKeys.length > 0 ? sortedUnitKeys.map(unitDisplayName => {
                        
                        const quizzesInUnit = quizzesByUnit[unitDisplayName];
                        const quizIdsInUnit = quizzesInUnit.map(q => q.quizDetails.id);
                        const isAllSelected = quizIdsInUnit.length > 0 && quizIdsInUnit.every(id => selectedSet.has(id));

                        return (
                            <UnitGroup
                                key={unitDisplayName}
                                title={unitDisplayName}
                            >
                                <div className="px-4 pt-2 pb-3 border-b border-slate-200/80" onClick={(e) => e.stopPropagation()}>
                                    <label className="flex items-center gap-3 cursor-pointer w-fit">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded text-sky-600 border-slate-400 focus:ring-sky-500 focus:ring-2"
                                            checked={isAllSelected}
                                            onChange={() => {
                                                const set = setSelectedQuizzes;
                                                set(prevSet => {
                                                    const newSet = new Set(prevSet);
                                                    if (isAllSelected) {
                                                        quizIdsInUnit.forEach(id => newSet.delete(id));
                                                    } else {
                                                        quizIdsInUnit.forEach(id => newSet.add(id));
                                                    }
                                                    return newSet;
                                                });
                                            }}
                                        />
                                        <span className="font-semibold text-slate-700">Select All in this Unit</span>
                                    </label>
                                </div>

                                {quizzesInUnit.sort((a, b) => (a.quizDetails.order || 0) - (b.quizDetails.order || 0) || a.quizDetails.title.localeCompare(b.quizDetails.title)).map(({ post, quizDetails }) => (
                                    <ListItem key={`${post.id}-${quizDetails.id}`}>
                                        <label className="p-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded text-sky-600 border-slate-400 focus:ring-sky-500 focus:ring-2"
                                                checked={selectedSet.has(quizDetails.id)}
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
                                            <p
                                                className="font-bold text-slate-800 text-lg cursor-pointer hover:text-purple-600 transition-colors truncate"
                                            >
                                                {quizDetails.title}
                                            </p>
                                            
                                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                                                <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                                {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                                
                                                {(() => {
                                                    let targetText = "Target: All Students";
                                                    if (post.targetAudience === 'all') {
                                                        targetText = "Target: All Students";
                                                    } else if (post.targetAudience === 'specific') {
                                                        targetText = `Target: ${post.targetStudentIds?.length || 0} Student(s)`;
                                                    }
                                                    return (
                                                        <span className="flex items-center gap-1">
                                                            <UsersIcon className="h-3 w-3 text-slate-400" />
                                                            {targetText}
                                                        </span>
                                                    );
                                                })()}
                                            </div>

                                        </div>
                                        <div className="flex space-x-1 flex-shrink-0">
                                            <button onClick={() => handleEditDatesClick(post)} title="Edit Availability" className="p-2 rounded-full text-slate-500 hover:shadow-neumorphic-inset"><PencilSquareIcon className="w-5 h-5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, quizDetails.id, 'quiz'); }} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title="Unshare Quiz"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </ListItem>
                                ))}
                            </UnitGroup>
                        );
                    }) : <EmptyState icon={AcademicCapIcon} text="No quizzes shared yet" subtext="Share quizzes with your class to get started." />}
                </div>
            );
        }
        if (activeTab === 'scores') {
            const allQuizzesFromPosts = sharedContentPosts.flatMap(p => p.quizzes || []);
            const allLessonsFromPosts = sharedContentPosts.flatMap(p => p.lessons || []);
            
            return (
                 <div className="pr-2 max-h-full overflow-y-auto custom-scrollbar">
                    {/* FIX: Removed large h2 headers */}
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
            
            return (
                 <div className="space-y-3 pr-2 max-h-full overflow-y-auto custom-scrollbar">
                    {/* FIX: Removed large h2 headers */}
                    {(classData?.students && classData.students.length > 0) ? (
                        <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic-inset p-1">
                            {classData.students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(student => (
                                <ListItem key={student.id}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex-shrink-0">
                                            <UserInitialsAvatar user={student} size="w-10 h-10" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{student.lastName}, {student.firstName}</p>
                                            <p className="text-sm text-slate-500">ID: {student.id}</p>
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
            <div className="flex flex-col pr-2 max-h-full overflow-y-auto custom-scrollbar">
                {/* FIX: Removed large h2 headers */}
                {showAddForm && (<div className="mb-6 flex-shrink-0"><CreateClassAnnouncementForm classId={classData.id} onAnnouncementPosted={() => setShowAddForm(false)} /></div>)}
                <div className="space-y-4 flex-grow">
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
                // FIX 2: Set size="screen" to maximize modal width
                size="screen" 
                roundedClass="rounded-2xl"
                // Adjusted containerClassName to center the modal content
                containerClassName="h-full p-4 bg-black/30 backdrop-blur-sm" 
                contentClassName="p-0"
                showCloseButton={true}
            >
                {/* FIX 3: Set FIXED INTERNAL HEIGHT and max width for clean layout */}
                <div className="p-4 md:p-8 bg-neumorphic-base h-[90vh] max-h-[95vh] flex flex-col mx-auto w-full max-w-7xl">
                    
                    {/* 1. Class Header (flex-shrink-0) */}
                    <div className="mb-6 p-4 bg-neumorphic-base rounded-2xl shadow-neumorphic flex-shrink-0">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{classData?.name || 'Class Details'}</h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                            <p className="text-base text-slate-600">
                                <span className="font-medium text-slate-500">Grade Level:</span>
                                <span className="font-semibold text-slate-700 ml-1.5">{classData?.gradeLevel}</span>
                            </p>
                            
                            <div className="flex items-center gap-1.5 text-base text-slate-600">
                                <span className="font-medium text-slate-500">Class Owner:</span>
                                <UserInitialsAvatar user={userProfile} size="w-6 h-6" />
                                <span className="font-semibold text-slate-700">{userProfile?.displayName}</span>
                            </div>
                            
                            <p className="text-base text-slate-600">
                                <span className="font-medium text-slate-500">Class Code:</span> 
                                <span className="font-bold text-sky-600 ml-1.5 tracking-wider">{classData?.classCode}</span>
                            </p>
                        </div>
                    </div>

                    {/* 2. Top tab bar (flex-shrink-0) */}
                    <nav className="flex-shrink-0 flex items-center gap-2 p-2 bg-neumorphic-base rounded-2xl shadow-neumorphic overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex-shrink-0 flex items-center gap-3 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
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

                    {/* 3. Main content area (flex-1 for expansion, min-h-0 for scrolling) */}
                    <main className="flex-1 bg-neumorphic-base rounded-2xl shadow-neumorphic flex flex-col min-h-0 mt-6">
                        <header className="px-8 pt-8 pb-4 flex-shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80">
                            {/* This is the main title now */}
                            
                            <div className="flex items-center gap-3">
                                {activeTab === 'lessons' && selectedLessons.size > 0 && (
                                    <Button 
                                        onClick={() => handleDeleteSelected('lesson')} 
                                        icon={TrashIcon} 
                                        color="red"
                                        className="font-semibold text-white bg-red-600 border-red-700 shadow-lg hover:bg-red-700"
                                    >
                                        Delete {selectedLessons.size} Selected
                                    </Button>
                                )}
                                {activeTab === 'quizzes' && selectedQuizzes.size > 0 && (
                                    <Button 
                                        onClick={() => handleDeleteSelected('quiz')} 
                                        icon={TrashIcon} 
                                        color="red"
                                        className="font-semibold text-white bg-red-600 border-red-700 shadow-lg hover:bg-red-700"
                                    >
                                        Delete {selectedQuizzes.size} Selected
                                    </Button>
                                )}

                                {activeTab === 'announcements' && userProfile?.role === 'teacher' && (
                                    <div>
                                        <Button onClick={() => setShowAddForm(prev => !prev)} icon={PlusCircleIcon} className="font-semibold text-white bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset border-none">{showAddForm ? 'Cancel' : 'New'}</Button>
                                    </div>
                                )}
                            </div>
                        </header>
                        
                        {/* Scrollable content container */}
                        <div className="flex-1 px-8 pb-8 custom-scrollbar min-h-0">
                            {renderContent()}
                        </div>
                    </main>

                </div>
            </Modal>

            {/* All the other modals remain outside */}
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

// ... (AnnouncementListItem component is unchanged) ...
const AnnouncementListItem = ({ post, isOwn, onEdit, onDelete, isEditing, editContent, onChangeEdit, onSaveEdit, onCancelEdit, onClick }) => {
    const formattedDate = post.createdAt?.toDate().toLocaleString() || 'N/A';
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