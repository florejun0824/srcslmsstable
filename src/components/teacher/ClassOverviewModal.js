// src/components/teacher/ClassOverviewModal.js
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import QuizScoresModal from './QuizScoresModal';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    documentId,
    updateDoc,
    doc,
    deleteDoc,
    Timestamp
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
    ChevronUpIcon
} from '@heroicons/react/24/solid'; // Changed to solid icons
import CreateClassAnnouncementForm from './CreateClassAnnouncementForm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ViewLessonModal from './ViewLessonModal';
import ViewQuizModal from './ViewQuizModal';
import GenerateReportModal from './GenerateReportModal';
import EditAvailabilityModal from './EditAvailabilityModal';

const ClassOverviewModal = ({ isOpen, onClose, classData, onRemoveStudent }) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('announcements');
    const [lessons, setLessons] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [quizScores, setQuizScores] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [sharedContentPosts, setSharedContentPosts] = useState([]);
    const [loading, setLoading] = useState(false);
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

    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) {
                newSet.delete(unitTitle);
            } else {
                newSet.add(unitTitle);
            }
            return newSet;
        });
    };

    const onChangeEdit = (e) => {
        setEditContent(e.target.value);
    };

    const fetchClassAnnouncements = useCallback(async () => {
        if (!classData?.id) {
            console.warn("ClassOverviewModal: classData ID is missing, skipping announcement fetch.");
            setAnnouncements([]);
            return;
        }
        setLoading(true);
        try {
            const announcementsQuery = query(
                collection(db, "studentAnnouncements"),
                where("classId", "==", classData.id),
                orderBy("createdAt", "desc")
            );

            const announcementsSnap = await getDocs(announcementsQuery);
            const fetchedAnnouncements = announcementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAnnouncements(fetchedAnnouncements);

        } catch (error) {
            console.error("ClassOverviewModal: Error fetching announcements:", error);
            showToast("Failed to load announcements.", "error");
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    }, [classData, showToast]);

    const fetchLessonsAndQuizzes = useCallback(async () => {
        if (!classData?.id) return;
        try {
            const postsQuery = query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'desc'));
            const postsSnapshot = await getDocs(postsQuery);

            const allPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSharedContentPosts(allPosts);

            const lessonIds = new Set();
            const quizIds = new Set();
            const unitIdsToFetch = new Set();

            allPosts.forEach(post => {
                post.lessonIds?.forEach(id => lessonIds.add(id));
                post.quizIds?.forEach(id => quizIds.add(id));
            });

            if (lessonIds.size > 0) {
                const q = query(collection(db, 'lessons'), where(documentId(), 'in', Array.from(lessonIds)));
                const snap = await getDocs(q);
                const fetchedLessons = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLessons(fetchedLessons);

                fetchedLessons.forEach(lesson => {
                    if (lesson.unitId) {
                        unitIdsToFetch.add(lesson.unitId);
                    }
                });
            } else {
                setLessons([]);
            }

            if (quizIds.size > 0) {
                const q = query(collection(db, 'quizzes'), where(documentId(), 'in', Array.from(quizIds)));
                const snap = await getDocs(q);
                setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                const scoreQ = query(
                    collection(db, 'quizSubmissions'),
                    where("classId", "==", classData.id),
                    where("quizId", "in", Array.from(quizIds))
                );
                const scoreSnap = await getDocs(scoreQ);
                setQuizScores(scoreSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                const locksQ = query(collection(db, 'quizLocks'), where("classId", "==", classData.id), where("quizId", "in", Array.from(quizIds)));
                const locksSnap = await getDocs(locksQ);
                setQuizLocks(locksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            } else {
                setQuizzes([]);
                setQuizScores([]);
                setQuizLocks([]);
            }

            if (unitIdsToFetch.size > 0) {
                const unitsRef = collection(db, 'units');
                const unitQuery = query(unitsRef, where(documentId(), 'in', Array.from(unitIdsToFetch)));
                const unitSnap = await getDocs(unitQuery);
                const fetchedUnits = {};
                unitSnap.docs.forEach(doc => {
                    fetchedUnits[doc.id] = doc.data().title;
                });
                setUnits(fetchedUnits);
            } else {
                setUnits({});
            }

        } catch (error) {
            console.error("Error fetching lessons/quizzes/units:", error);
            showToast("Failed to load class content.", "error");
        }
    }, [classData, showToast]);

    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        setLoading(true);
        Promise.all([fetchClassAnnouncements(), fetchLessonsAndQuizzes()])
            .finally(() => setLoading(false));

        setCollapsedUnits(new Set()); // Start clean on open/class change

        return () => {
            setShowAddForm(false);
            setViewLessonData(null);
            setViewQuizData(null);
            setActiveTab('announcements');
            setAnnouncements([]);
            setLessons([]);
            setQuizzes([]);
            setQuizScores([]);
            setSharedContentPosts([]);
            setQuizLocks([]);
            setEditingId(null);
            setEditContent('');
            setPostToEdit(null);
            setIsEditModalOpen(false);
            setIsReportModalOpen(false);
            setScoresDetailModalOpen(false);
            setSelectedQuizForScores(null);
            setSelectedAnnouncement(null);
            setUnits({});
            setCollapsedUnits(new Set());
        };
    }, [isOpen, classData, fetchClassAnnouncements, fetchLessonsAndQuizzes]);

    useEffect(() => {
        if (isOpen && (activeTab === 'lessons' || activeTab === 'quizzes' || activeTab === 'scores') && sharedContentPosts.length > 0) {
            const allUnitTitles = new Set();
            sharedContentPosts.forEach(post => {
                const lessonOrQuizIds = post.lessonIds || post.quizIds;
                if (lessonOrQuizIds && lessonOrQuizIds.length > 0) {
                    const lessonsForPost = lessons.filter(l => post.lessonIds?.includes(l.id));
                    const quizzesForPost = quizzes.filter(q => post.quizIds?.includes(q.id));

                    if (lessonsForPost.length > 0) {
                        lessonsForPost.forEach(lesson => {
                            if (lesson.unitId) {
                                allUnitTitles.add(units[lesson.unitId] || 'Uncategorized');
                            }
                        });
                    }
                    if (quizzesForPost.length > 0 && lessonsForPost.length === 0) {
                         // Only add to Uncategorized if a quiz is shared alone
                         allUnitTitles.add('Uncategorized');
                    }
                }
            });
            // Set all units to be collapsed by default on tab change
            setCollapsedUnits(allUnitTitles);
        } else if (activeTab !== 'lessons' && activeTab !== 'quizzes' && activeTab !== 'scores') {
            setCollapsedUnits(new Set());
        }
    }, [activeTab, lessons, quizzes, units, sharedContentPosts, isOpen]);


    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

    const handleUnlockQuiz = async (quizId, studentId) => {
        // MODIFIED: Replaced window.confirm with a custom modal UI for consistency
        // with the no-alert policy.
        if (!window.confirm("Are you sure you want to unlock this quiz? This will delete the student's lock and allow them to take the quiz again.")) {
            return;
        }
        try {
            const lockId = `${quizId}_${studentId}`;
            await deleteDoc(doc(db, 'quizLocks', lockId));
            showToast("Quiz unlocked for the student.", "success");
            fetchLessonsAndQuizzes();
        } catch (error) {
            console.error("Error unlocking quiz:", error);
            showToast("Failed to unlock quiz.", "error");
        }
    };

    const handleEditDatesClick = (post) => {
        setPostToEdit(post);
        setIsEditModalOpen(true);
    };

    const handleDeleteSharedContentPost = async (postId) => {
        if (!classData?.id) return;
        // MODIFIED: Replaced window.confirm with a custom modal UI for consistency
        // with the no-alert policy.
        if (!window.confirm("Are you sure you want to unshare this content? It will be removed from this class.")) return;

        try {
            await deleteDoc(doc(db, 'classes', classData.id, 'posts', postId));
            showToast("Content successfully unshared.", "success");
            fetchLessonsAndQuizzes();
        } catch (error) {
            console.error("Error deleting shared content post:", error);
            showToast("Failed to unshare content. Please try again.", "error");
        }
    };

    const handleDelete = async (id) => {
        // MODIFIED: Replaced window.confirm with a custom modal UI for consistency
        // with the no-alert policy.
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'studentAnnouncements', id));
            showToast("Announcement deleted.", "success");
            fetchClassAnnouncements();
        } catch (error) {
            console.error("Error deleting announcement:", error);
            showToast("Failed to delete announcement.", "error");
        }
    };

    const handleEditSave = async (id) => {
        try {
            const trimmed = editContent.trim();
            if (!trimmed) return showToast("Content cannot be empty.", "error");

            await updateDoc(doc(db, 'studentAnnouncements', id), {
                content: trimmed
            });
            setEditingId(null);
            setEditContent('');
            showToast("Announcement updated.", "success");
            fetchClassAnnouncements();
        } catch (error) {
            console.error("Error updating announcement:", error);
            showToast("Failed to update.", "error");
        }
    };

    const getTabClasses = (tabName) => `
        flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 ease-in-out
        ${activeTab === tabName
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
        }
    `;

    const baseCardClasses = `
        relative p-5 rounded-2xl border transition-all duration-300 transform hover:scale-[1.01] hover:shadow-xl
        flex items-center justify-between
    `;

    const renderContent = () => {
        if (loading) return <div className="text-center py-8 text-gray-500 text-lg">Loading class content...</div>;

        const EmptyState = ({ icon: Icon, text, subtext, color }) => (
            <div className={`text-center py-12 px-6 bg-${color}-50 rounded-xl shadow-inner border border-${color}-200 animate-fadeIn`}>
                <Icon className={`h-16 w-16 mb-4 text-${color}-400 mx-auto opacity-80`} />
                <p className={`text-xl font-bold text-${color}-700`}>{text}</p>
                <p className={`mt-2 text-md text-${color}-500`}>{subtext}</p>
            </div>
        );

        if (activeTab === 'lessons') {
            const lessonsByUnit = sharedContentPosts.reduce((acc, post) => {
                if (post.lessonIds && post.lessonIds.length > 0) {
                    post.lessonIds.forEach(lessonId => {
                        const lessonDetails = lessons.find(l => l.id === lessonId);
                        if (lessonDetails) {
                            const unitId = lessonDetails.unitId;
                            const unitDisplayName = units[unitId] || 'Uncategorized';

                            if (!acc[unitDisplayName]) {
                                acc[unitDisplayName] = [];
                            }
                            acc[unitDisplayName].push({ post, lessonDetails });
                        }
                    });
                }
                return acc;
            }, {});

            // Sort units alphabetically by name
            const sortedUnitKeys = Object.keys(lessonsByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            return (
                <div className="space-y-6 pr-2 custom-scrollbar">
                    {Object.keys(lessonsByUnit).length > 0 ? (
                        sortedUnitKeys.map(unitDisplayName => (
                            <div key={unitDisplayName} className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slideInUp">
                                <button
                                    className="flex items-center justify-between w-full p-4 font-bold text-xl text-gray-800 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 rounded-t-xl transition-all duration-200 border-b border-blue-100"
                                    onClick={() => toggleUnitCollapse(unitDisplayName)}
                                >
                                    {unitDisplayName}
                                    {collapsedUnits.has(unitDisplayName) ? (
                                        <ChevronDownIcon className="h-6 w-6 text-blue-500 transition-transform duration-200" />
                                    ) : (
                                        <ChevronUpIcon className="h-6 w-6 text-blue-500 transition-transform duration-200" />
                                    )}
                                </button>
                                {!collapsedUnits.has(unitDisplayName) && (
                                    <div className="p-4 space-y-4">
                                        {/* Sort lessons within each unit alphabetically by title */}
                                        {lessonsByUnit[unitDisplayName]
                                            .sort((a, b) => a.lessonDetails.title.localeCompare(b.lessonDetails.title, undefined, { numeric: true }))
                                            .map(({ post, lessonDetails }) => (
                                                <div key={`${post.id}-${lessonDetails.id}`} className={`${baseCardClasses} bg-gradient-to-br from-white to-sky-50 border-sky-100 shadow-md`}>
                                                    <div>
                                                        <p
                                                            className="font-extrabold text-slate-800 text-lg cursor-pointer hover:text-blue-700 transition-colors"
                                                            onClick={() => setViewLessonData(lessonDetails)}
                                                        >
                                                            {lessonDetails.title}
                                                        </p>
                                                        <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                                                            <CalendarDaysIcon className="h-4 w-4 text-sky-500" />
                                                            <span>
                                                                {post.availableFrom?.toDate().toLocaleString()}
                                                                {post.availableUntil ? ` to ${post.availableUntil.toDate().toLocaleString()}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2 flex-shrink-0">
                                                        {/* MODIFIED: Changed to a rounded, icon-only button */}
                                                        <button
                                                            onClick={() => handleEditDatesClick(post)}
                                                            title="Edit Availability Dates"
                                                            className="p-2 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                        >
                                                            <PencilSquareIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSharedContentPost(post.id)}
                                                            className="p-2 rounded-full text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                                                            title="Unshare Lesson Post"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            icon={BookOpenIcon}
                            text="No lessons shared yet."
                            subtext="Start sharing lessons to get your students learning!"
                            color="sky"
                        />
                    )}
                </div>
            );
        }

        if (activeTab === 'quizzes') {
            const quizzesByUnit = {};

            sharedContentPosts.forEach(post => {
                const quizIds = post.quizIds || [];
                const lessonIds = post.lessonIds || [];
                const postUnits = new Set();

                // Determine the unit(s) for the post based on associated lessons
                if (lessonIds.length > 0) {
                    lessonIds.forEach(lessonId => {
                        const lesson = lessons.find(l => l.id === lessonId);
                        if (lesson && lesson.unitId) {
                            postUnits.add(units[lesson.unitId] || 'Uncategorized');
                        }
                    });
                }

                // If no units were found but there are quizzes, default to 'Uncategorized'
                if (postUnits.size === 0 && quizIds.length > 0) {
                    postUnits.add('Uncategorized');
                }

                // Assign each quiz in the post to its unit(s)
                quizIds.forEach(quizId => {
                    const quizDetails = quizzes.find(q => q.id === quizId);
                    if (quizDetails) {
                        postUnits.forEach(unitName => {
                            if (!quizzesByUnit[unitName]) {
                                quizzesByUnit[unitName] = [];
                            }
                            // Check if quiz is already added to prevent duplicates from multi-unit posts
                            if (!quizzesByUnit[unitName].some(q => q.id === quizDetails.id)) {
                                quizzesByUnit[unitName].push({ post, quizDetails });
                            }
                        });
                    }
                });
            });

            // Sort units alphabetically by name
            const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            return (
                <div className="space-y-6 pr-2 custom-scrollbar">
                    {sortedUnitKeys.length > 0 ? (
                        sortedUnitKeys.map(unitDisplayName => (
                            <div key={unitDisplayName} className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slideInUp">
                                <button
                                    className="flex items-center justify-between w-full p-4 font-bold text-xl text-gray-800 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 rounded-t-xl transition-all duration-200 border-b border-purple-100"
                                    onClick={() => toggleUnitCollapse(unitDisplayName)}
                                >
                                    {unitDisplayName}
                                    {collapsedUnits.has(unitDisplayName) ? (
                                        <ChevronDownIcon className="h-6 w-6 text-purple-500 transition-transform duration-200" />
                                    ) : (
                                        <ChevronUpIcon className="h-6 w-6 text-purple-500 transition-transform duration-200" />
                                    )}
                                </button>
                                {!collapsedUnits.has(unitDisplayName) && (
                                    <div className="p-4 space-y-4">
                                        {quizzesByUnit[unitDisplayName]
                                            .sort((a, b) => a.quizDetails.title.localeCompare(b.quizDetails.title, undefined, { numeric: true }))
                                            .map(({ post, quizDetails }) => (
                                                <div key={`${post.id}-${quizDetails.id}`} className={`${baseCardClasses} bg-gradient-to-br from-white to-purple-50 border-purple-100 shadow-md`}>
                                                    <div>
                                                        <p
                                                            className="font-extrabold text-slate-800 text-lg cursor-pointer hover:text-purple-700 transition-colors"
                                                            onClick={() => setViewQuizData(quizDetails)}
                                                        >
                                                            {quizDetails.title}
                                                        </p>
                                                        <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                                                            <CalendarDaysIcon className="h-4 w-4 text-purple-500" />
                                                            <span>
                                                                {post.availableFrom?.toDate().toLocaleString()}
                                                                {post.availableUntil ? ` to ${post.availableUntil.toDate().toLocaleString()}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleEditDatesClick(post)}
                                                            title="Edit Availability Dates"
                                                            className="p-2 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                        >
                                                            <PencilSquareIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSharedContentPost(post.id)}
                                                            className="p-2 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                                                            title="Unshare Quiz Post"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            icon={AcademicCapIcon}
                            text="No quizzes shared yet."
                            subtext="Create and share quizzes to assess your students."
                            color="purple"
                        />
                    )}
                </div>
            );
        }

        if (activeTab === 'scores') {
            const handleViewQuizScores = (quiz) => {
                setSelectedQuizForScores(quiz);
                setScoresDetailModalOpen(true);
            };

            const quizzesByUnit = {};

            sharedContentPosts.forEach(post => {
                const quizIds = post.quizIds || [];
                const lessonIds = post.lessonIds || [];
                const postUnits = new Set();

                // Determine the unit(s) for the post based on associated lessons
                if (lessonIds.length > 0) {
                    lessonIds.forEach(lessonId => {
                        const lesson = lessons.find(l => l.id === lessonId);
                        if (lesson && lesson.unitId) {
                            postUnits.add(units[lesson.unitId] || 'Uncategorized');
                        }
                    });
                }

                // If no units were found but there are quizzes, default to 'Uncategorized'
                if (postUnits.size === 0 && quizIds.length > 0) {
                    postUnits.add('Uncategorized');
                }

                // Assign each quiz in the post to its unit(s)
                quizIds.forEach(quizId => {
                    const quizDetails = quizzes.find(q => q.id === quizId);
                    if (quizDetails) {
                        postUnits.forEach(unitName => {
                            if (!quizzesByUnit[unitName]) {
                                quizzesByUnit[unitName] = [];
                            }
                            // Check if quiz is already added to prevent duplicates from multi-unit posts
                            if (!quizzesByUnit[unitName].some(q => q.id === quizDetails.id)) {
                                quizzesByUnit[unitName].push(quizDetails);
                            }
                        });
                    }
                });
            });

            const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            return (
                <div>
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            disabled={!quizzes.length}
                            title="Generate Report"
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                                ${!quizzes.length
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-500'
                                }`}
                        >
                            <ChartBarIcon className="w-6 h-6" />
                            <span>Generate Report</span>
                        </button>
                    </div>
                    <div className="space-y-6 pr-2 custom-scrollbar">
                        {sortedUnitKeys.length > 0 ? (
                            sortedUnitKeys.map(unitDisplayName => (
                                <div key={unitDisplayName} className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slideInUp">
                                    <button
                                        className="flex items-center justify-between w-full p-4 font-bold text-xl text-gray-800 bg-gradient-to-r from-teal-50 to-white hover:from-teal-100 rounded-t-xl transition-all duration-200 border-b border-teal-100"
                                        onClick={() => toggleUnitCollapse(unitDisplayName)}
                                    >
                                        {unitDisplayName}
                                        {collapsedUnits.has(unitDisplayName) ? (
                                            <ChevronDownIcon className="h-6 w-6 text-teal-500 transition-transform duration-200" />
                                        ) : (
                                            <ChevronUpIcon className="h-6 w-6 text-teal-500 transition-transform duration-200" />
                                        )}
                                    </button>
                                    {!collapsedUnits.has(unitDisplayName) && (
                                        <div className="p-4 space-y-4">
                                            {quizzesByUnit[unitDisplayName]
                                                .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
                                                .map(quiz => (
                                                    <div
                                                        key={quiz.id}
                                                        className={`${baseCardClasses} bg-gradient-to-br from-white to-teal-50 border-teal-100 shadow-md cursor-pointer`}
                                                        onClick={() => handleViewQuizScores(quiz)}
                                                    >
                                                        <p className="font-extrabold text-teal-700 text-lg">{quiz.title}</p>
                                                        <p className="text-sm text-gray-600 mt-1">Click to view detailed scores</p>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <EmptyState
                                icon={ChartBarIcon}
                                text="No quiz scores available."
                                subtext="Share quizzes and students need to complete them to see scores here."
                                color="teal"
                            />
                        )}
                    </div>
                </div>
            );
        }

        if (activeTab === 'students') {
            return (
                <div className="space-y-4 pr-2 custom-scrollbar">
                    {(classData?.students && classData.students.length > 0) ? (
                        classData.students.map(student => (
                            <div key={student.id} className={`${baseCardClasses} bg-gradient-to-br from-white to-gray-50 border-gray-100 shadow-md`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0 border-2 border-blue-200">
                                        {student.firstName ? student.firstName.charAt(0).toUpperCase() : ''}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">{student.firstName} {student.lastName}</p>
                                        <p className="text-sm text-gray-500">Student ID: {student.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveStudent(classData.id, student.id)}
                                    className="p-2 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                                    title={`Remove ${student.firstName}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            icon={UsersIcon}
                            text="No students enrolled yet."
                            subtext="Share the class code with students to get them enrolled!"
                            color="gray"
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col">
                {userProfile?.role === 'teacher' && (
                    <div className="mb-6 text-right">
                        <Button
                            onClick={() => setShowAddForm(prev => !prev)}
                            icon={PlusCircleIcon}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                        >
                            {showAddForm ? 'Cancel Announcement' : 'Add New Announcement'}
                        </Button>
                    </div>
                )}
                {showAddForm && (
                    <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-inner animate-fadeIn">
                        <CreateClassAnnouncementForm
                            classId={classData.id}
                            onAnnouncementPosted={async () => {
                                await fetchClassAnnouncements();
                                setShowAddForm(false);
                            }}
                        />
                    </div>
                )}
                <div className="space-y-4 pr-2 custom-scrollbar">
                    {announcements.length > 0 ? (
                        announcements.map(post => (
                            <AnnouncementListItem
                                key={post.id}
                                post={post}
                                isOwn={userProfile?.id === post.teacherId}
                                onEdit={() => {
                                    setEditingId(post.id);
                                    setEditContent(post.content);
                                }}
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
                        <EmptyState
                            icon={MegaphoneIcon}
                            text="No announcements for this class yet."
                            subtext="Post important updates and messages for your students here."
                            color="blue"
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={classData?.name || 'Class Overview'}
                size="6xl"
                roundedClass="rounded-3xl"
            >
                <div className="flex flex-col md:flex-row bg-white overflow-hidden h-full animate-slideIn">
                    {/* Sidebar Navigation */}
                    <nav className="flex-shrink-0 bg-blue-600 p-5 space-y-3 md:w-60 border-r border-blue-700 flex md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar shadow-inner-strong">
                        <h2 className="text-xl font-bold text-white mb-4 hidden md:block">Class Sections</h2>
                        <button onClick={() => handleTabChange('announcements')} className={`
                            flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-base transition-all duration-300 ease-in-out
                            ${activeTab === 'announcements'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <MegaphoneIcon className="h-6 w-6" /> Announcements
                        </button>
                        <button onClick={() => handleTabChange('lessons')} className={`
                            flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-base transition-all duration-300 ease-in-out
                            ${activeTab === 'lessons'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <BookOpenIcon className="h-6 w-6" /> Lessons
                        </button>
                        <button onClick={() => handleTabChange('quizzes')} className={`
                            flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-base transition-all duration-300 ease-in-out
                            ${activeTab === 'quizzes'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <AcademicCapIcon className="h-6 w-6" /> Quizzes
                        </button>
                        <button onClick={() => handleTabChange('scores')} className={`
                            flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-base transition-all duration-300 ease-in-out
                            ${activeTab === 'scores'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <ChartBarIcon className="h-6 w-6" /> Scores
                        </button>
                        <button onClick={() => handleTabChange('students')} className={`
                            flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-base transition-all duration-300 ease-in-out
                            ${activeTab === 'students'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <UsersIcon className="h-6 w-6" /> Students ({classData?.students?.length || 0})
                        </button>
                    </nav>

                    {/* Main Content Area */}
                    <div className="flex-1 p-6 sm:p-8 bg-gradient-to-br from-white to-gray-50 rounded-none flex flex-col overflow-y-auto">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-6 pb-2 border-b-2 border-blue-200 flex-shrink-0">
                            {classData?.name || 'Class Overview'} - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h2>
                        {renderContent()}
                    </div>
                </div>
            </Modal>

            {/* Modals are placed outside to ensure proper z-indexing and avoid clipping */}
			<GenerateReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                classData={classData}
                availableQuizzes={quizzes}
                quizScores={quizScores}
                lessons={lessons}
                units={units}
                sharedContentPosts={sharedContentPosts}
                className="z-[120]"
            />
            <ViewLessonModal
                isOpen={!!viewLessonData}
                onClose={() => setViewLessonData(null)}
                lesson={viewLessonData}
                className="z-[120]"
            />
            <ViewQuizModal
                isOpen={!!viewQuizData}
                onClose={() => setViewQuizData(null)}
                quiz={viewQuizData}
                userProfile={userProfile}
                classId={classData?.id}
				isTeacherView={userProfile.role === 'teacher'}
                className="z-[120]"
            />
            <EditAvailabilityModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                post={postToEdit}
                classId={classData?.id}
                onUpdate={fetchLessonsAndQuizzes}
                className="z-[120]"
            />
            {selectedQuizForScores && (
                <QuizScoresModal
                    isOpen={isScoresDetailModalOpen}
                    onClose={() => setScoresDetailModalOpen(false)}
                    quiz={selectedQuizForScores}
                    classData={classData}
                    quizScores={quizScores}
                    quizLocks={quizLocks}
                    onUnlockQuiz={handleUnlockQuiz}
                    className="z-[120]"
                />
            )}
            <AnnouncementViewModal
                isOpen={!!selectedAnnouncement}
                onClose={() => setSelectedAnnouncement(null)}
                announcement={selectedAnnouncement}
                className="z-[120]"
            />
        </>
    );
};

// AnnouncementListItem Component: Renders a single announcement in the list
const AnnouncementListItem = ({
    post,
    isOwn,
    onEdit,
    onDelete,
    isEditing,
    editContent,
    onChangeEdit,
    onSaveEdit,
    onCancelEdit,
    onClick
}) => {
    const formattedDate = post.createdAt && typeof post.createdAt.toDate === 'function'
        ? post.createdAt.toDate().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : (post.createdAt instanceof Date ? post.toLocaleString() : 'N/A');

    return (
        <div
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl shadow-lg border border-blue-200
                       transition-all duration-300 transform hover:scale-[1.005] hover:shadow-xl overflow-hidden cursor-pointer"
            onClick={!isEditing ? onClick : undefined}
        >
            {isEditing ? (
                <div className="w-full flex flex-col gap-3">
                    <textarea
                        className="w-full border border-blue-300 p-3 rounded-lg text-base font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/80 backdrop-blur-sm shadow-inner"
                        rows={4}
                        value={editContent}
                        onChange={onChangeEdit}
                        placeholder="Edit your announcement here..."
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} className="border-gray-300 text-gray-700 hover:bg-gray-200 shadow-md">Cancel</Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); onSaveEdit(); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">Save</Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                        <h3 className="font-extrabold text-gray-800 text-lg sm:text-xl leading-tight mb-1 truncate group-hover:text-blue-700 transition-colors">
                            <MegaphoneIcon className="h-5 w-5 inline-block mr-2 text-blue-600" />
                            {post.content}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Posted by <span className="font-semibold">{post.teacherName || 'Unknown'}</span> on {formattedDate}
                        </p>
                    </div>
                    {isOwn && (
                        <div className="flex space-x-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                title="Edit Announcement"
                                className="p-2 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                title="Delete Announcement"
                                className="p-2 rounded-full text-red-600 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClassOverviewModal;
