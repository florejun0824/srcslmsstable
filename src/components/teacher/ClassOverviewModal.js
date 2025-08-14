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
    getDocs, // Keep for initial announcement fetch if not changing to onSnapshot
    orderBy,
    documentId,
    updateDoc,
    doc,
    deleteDoc,
    Timestamp,
    arrayRemove,
    onSnapshot // NEW: Import onSnapshot
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
} from '@heroicons/react/24/solid';
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
    const [loading, setLoading] = useState(true); // Set to true initially for all data
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
    const [collapsedUnits, setCollapsedUnits] = useState(new Set()); // FIXED: Use useState for collapsedUnits

    // NEW: Loading flags for each data stream
    const [isAnnouncementsLoaded, setIsAnnouncementsLoaded] = useState(false);
    const [isUnitsLoaded, setIsUnitsLoaded] = useState(false);
    const [isPostsLoaded, setIsPostsLoaded] = useState(false);
    const [isLessonsLoaded, setIsLessonsLoaded] = useState(false);
    const [isQuizzesLoaded, setIsQuizzesLoaded] = useState(false);
    const [isScoresLoaded, setIsScoresLoaded] = useState(false);
    const [isLocksLoaded, setIsLocksLoaded] = useState(false);


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

    // Use onSnapshot for announcements as well for real-time updates
    const setupRealtimeAnnouncements = useCallback(() => {
        if (!classData?.id) {
            setAnnouncements([]);
            setIsAnnouncementsLoaded(true); // Mark as loaded even if no ID
            return () => {}; // Return empty unsubscribe
        }
        const announcementsQuery = query(
            collection(db, "studentAnnouncements"),
            where("classId", "==", classData.id),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
            const fetchedAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAnnouncements(fetchedAnnouncements);
            setIsAnnouncementsLoaded(true); // Mark as loaded after first snapshot
        }, (error) => {
            console.error("ClassOverviewModal: Error listening to announcements:", error);
            showToast("Failed to load announcements in real-time.", "error");
            setIsAnnouncementsLoaded(true); // Mark as loaded even on error to unblock overall loading
        });
        return unsubscribe;
    }, [classData, showToast]);


    // Refactored to use onSnapshot for real-time updates
    const setupRealtimeContentListeners = useCallback(() => {
        if (!classData?.id) {
            setSharedContentPosts([]);
            setLessons([]);
            setQuizzes([]);
            setQuizScores([]);
            setQuizLocks([]);
            setUnits({});
            setIsUnitsLoaded(true);
            setIsPostsLoaded(true);
            setIsLessonsLoaded(true);
            setIsQuizzesLoaded(true);
            setIsScoresLoaded(true);
            setIsLocksLoaded(true);
            return () => {}; // Return empty unsubscribe
        }

        const unsubscribes = [];
        let currentFetchedUnits = {}; // Local variable for units

        // 1. Listen for Units (needed for Lessons and Quizzes)
        const unitsQuery = query(collection(db, 'units'));
        unsubscribes.push(onSnapshot(unitsQuery, (snapshot) => {
            const fetchedUnits = {};
            snapshot.docs.forEach(doc => {
                fetchedUnits[doc.id] = doc.data().title;
            });
            currentFetchedUnits = fetchedUnits; // Update local copy
            setUnits(fetchedUnits);
            setIsUnitsLoaded(true);
        }, (error) => {
            console.error("Error listening to units:", error);
            showToast("Failed to load units in real-time.", "error");
            setIsUnitsLoaded(true);
        }));

        // 2. Listen for Shared Content Posts
        const postsQuery = query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'desc'));
        unsubscribes.push(onSnapshot(postsQuery, (snapshot) => {
            const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSharedContentPosts(allPosts);
            setIsPostsLoaded(true);

            // Dynamically set up listeners for lessons/quizzes based on what's in posts
            const lessonIdsInPosts = new Set();
            const quizIdsInPosts = new Set();
            allPosts.forEach(post => {
                post.lessonIds?.forEach(id => lessonIdsInPosts.add(id));
                post.quizIds?.forEach(id => quizIdsInPosts.add(id));
            });

            // 3. Listen for Lessons
            if (lessonIdsInPosts.size > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', Array.from(lessonIdsInPosts)));
                unsubscribes.push(onSnapshot(lessonsQuery, (lessonSnap) => {
                    const fetchedLessons = lessonSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setLessons(fetchedLessons);
                    setIsLessonsLoaded(true);
                }, (error) => {
                    console.error("Error listening to lessons:", error);
                    showToast("Failed to load lessons in real-time.", "error");
                    setIsLessonsLoaded(true);
                }));
            } else {
                setLessons([]);
                setIsLessonsLoaded(true); // Mark as loaded if no lessons to fetch
            }

            // 4. Listen for Quizzes
            if (quizIdsInPosts.size > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', Array.from(quizIdsInPosts)));
                unsubscribes.push(onSnapshot(quizzesQuery, (quizSnap) => {
                    const fetchedQuizzes = quizSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setQuizzes(fetchedQuizzes);
                    setIsQuizzesLoaded(true);
                }, (error) => {
                    console.error("Error listening to quizzes:", error);
                    showToast("Failed to load quizzes in real-time.", "error");
                    setIsQuizzesLoaded(true);
                }));

                // 5. Listen for Quiz Submissions
                const scoreQ = query(
                    collection(db, 'quizSubmissions'),
                    where("classId", "==", classData.id),
                    where("quizId", "in", Array.from(quizIdsInPosts))
                );
                unsubscribes.push(onSnapshot(scoreQ, (scoreSnap) => {
                    setQuizScores(scoreSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setIsScoresLoaded(true);
                }, (error) => {
                    console.error("Error listening to quiz submissions:", error);
                    showToast("Failed to load quiz scores in real-time.", "error");
                    setIsScoresLoaded(true);
                }));

                // 6. Listen for Quiz Locks
                const locksQ = query(collection(db, 'quizLocks'), where("classId", "==", classData.id), where("quizId", "in", Array.from(quizIdsInPosts)));
                unsubscribes.push(onSnapshot(locksQ, (locksSnap) => {
                    setQuizLocks(locksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setIsLocksLoaded(true);
                }, (error) => {
                    console.error("Error listening to quiz locks:", error);
                    showToast("Failed to load quiz locks in real-time.", "error");
                    setIsLocksLoaded(true);
                }));

            } else {
                setQuizzes([]);
                setIsQuizzesLoaded(true);
                setQuizScores([]);
                setIsScoresLoaded(true);
                setQuizLocks([]);
                setIsLocksLoaded(true);
            }
        }, (error) => {
            console.error("Error listening to shared content posts:", error);
            showToast("Failed to load shared content in real-time.", "error");
            setIsPostsLoaded(true); // Mark posts as loaded even on error
            setIsLessonsLoaded(true); // Also mark children as loaded if posts failed
            setIsQuizzesLoaded(true);
            setIsScoresLoaded(true);
            setIsLocksLoaded(true);
        }));

        return () => unsubscribes.forEach(unsub => unsub());
    }, [classData, showToast]);


    // Effect to manage overall loading state
    useEffect(() => {
        if (
            isAnnouncementsLoaded &&
            isUnitsLoaded &&
            isPostsLoaded &&
            isLessonsLoaded &&
            isQuizzesLoaded &&
            isScoresLoaded &&
            isLocksLoaded
        ) {
            setLoading(false);
            console.log("ClassOverviewModal: All data streams initialized.");
        } else {
            setLoading(true); // Keep loading if not all flags are true
        }
    }, [isAnnouncementsLoaded, isUnitsLoaded, isPostsLoaded, isLessonsLoaded, isQuizzesLoaded, isScoresLoaded, isLocksLoaded]);

    // Effect to setup listeners and cleanup
    useEffect(() => {
        if (!isOpen) { // Reset all states when modal closes
            console.log("ClassOverviewModal is closed. Resetting all states.");
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
            setLoading(true); // Reset loading for next open
            
            // Reset loading flags for next opening
            setIsAnnouncementsLoaded(false);
            setIsUnitsLoaded(false);
            setIsPostsLoaded(false);
            setIsLessonsLoaded(false);
            setIsQuizzesLoaded(false);
            setIsScoresLoaded(false);
            setIsLocksLoaded(false);
            return;
        }

        if (isOpen && classData?.id) {
            // Set up real-time listeners and collect their unsubscribe functions
            const unsubscribeAnnouncements = setupRealtimeAnnouncements();
            const unsubscribeContent = setupRealtimeContentListeners();

            // Cleanup function for when the modal closes or dependencies change
            return () => {
                console.log("ClassOverviewModal cleanup: Unsubscribing all listeners.");
                unsubscribeAnnouncements();
                unsubscribeContent();
            };
        }
    }, [isOpen, classData, setupRealtimeAnnouncements, setupRealtimeContentListeners]);


    // Effect to update collapsed units based on current data after data changes
    useEffect(() => {
        if (isOpen && (activeTab === 'lessons' || activeTab === 'quizzes' || activeTab === 'scores')) {
            const allUnitTitles = new Set();
            sharedContentPosts.forEach(post => {
                // For lessons
                post.lessonIds?.forEach(lessonId => {
                    const lesson = lessons.find(l => l.id === lessonId);
                    if (lesson && lesson.unitId) {
                        allUnitTitles.add(units[lesson.unitId] || 'Uncategorized');
                    }
                });
                // For quizzes
                post.quizIds?.forEach(quizId => {
                    const quiz = quizzes.find(q => q.id === quizId);
                    if (quiz && quiz.unitId) { // Prioritize quiz's own unitId
                        allUnitTitles.add(units[quiz.unitId] || 'Uncategorized');
                    } else if (post.lessonIds && post.lessonIds.length > 0) {
                        // Fallback to unit of lessons in the same post if quiz itself has no unitId
                        const lessonUnitTitlesInPost = new Set();
                        post.lessonIds.forEach(lessonId => {
                            const lesson = lessons.find(l => l.id === lessonId);
                            if (lesson && lesson.unitId && units[lesson.unitId]) {
                                lessonUnitTitlesInPost.add(units[lesson.unitId]);
                            }
                        });
                        if (lessonUnitTitlesInPost.size === 1) {
                            allUnitTitles.add(Array.from(lessonUnitTitlesInPost)[0]);
                        } else if (lessonUnitTitlesInPost.size > 1) {
                            allUnitTitles.add('Uncategorized'); // If lessons in post are from multiple units
                        }
                    } else {
                        allUnitTitles.add('Uncategorized'); // If no unitId on quiz and no lessons in post
                    }
                });
            });
            // Set all units to be collapsed by default on tab change, or when data updates
            // Only update if there are actual units, otherwise leave as is.
            if (allUnitTitles.size > 0) {
                setCollapsedUnits(allUnitTitles);
            }
        } else if (activeTab !== 'lessons' && activeTab !== 'quizzes' && activeTab !== 'scores') {
            setCollapsedUnits(new Set()); // Clear collapsed units for other tabs
        }
    }, [activeTab, lessons, quizzes, units, sharedContentPosts, isOpen]);


    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

    const handleUnlockQuiz = async (quizId, studentId) => {
        if (!window.confirm("Are you sure you want to unlock this quiz? This will delete the student's lock and allow them to take the quiz again.")) {
            return;
        }
        try {
            const lockId = `${quizId}_${studentId}`;
            await deleteDoc(doc(db, 'quizLocks', lockId));
            showToast("Quiz unlocked for the student.", "success");
            // onSnapshot will handle UI update
        } catch (error) {
            console.error("Error unlocking quiz:", error);
            showToast("Failed to unlock quiz.", "error");
        }
    };

    const handleEditDatesClick = (post) => {
        setPostToEdit(post);
        setIsEditModalOpen(true);
    };

    const handleDeleteContentFromPost = async (postId, contentIdToRemove, contentType) => {
        if (!classData?.id) {
            showToast("Class ID is missing.", "error");
            return;
        }

        const postRef = doc(db, 'classes', classData.id, 'posts', postId);
        
        const currentPost = sharedContentPosts.find(p => p.id === postId);

        if (!currentPost) {
            showToast("Error: Post not found.", "error");
            return;
        }

        let confirmationMessage = "";
        let fieldToUpdate = "";
        let remainingContentIds = [];

        if (contentType === 'quiz') {
            remainingContentIds = (currentPost.quizIds || []).filter(id => id !== contentIdToRemove);
            fieldToUpdate = "quizIds";
            confirmationMessage = "Are you sure you want to unshare this specific quiz from this post?";
        } else if (contentType === 'lesson') {
            remainingContentIds = (currentPost.lessonIds || []).filter(id => id !== contentIdToRemove);
            fieldToUpdate = "lessonIds";
            confirmationMessage = "Are you sure you want to unshare this specific lesson from this post?";
        } else {
            showToast("Invalid content type for deletion.", "error");
            return;
        }

        const hasOtherQuizzes = (contentType === 'quiz' ? remainingContentIds.length > 0 : (currentPost.quizIds && currentPost.quizIds.length > 0));
        const hasOtherLessons = (contentType === 'lesson' ? remainingContentIds.length > 0 : (currentPost.lessonIds && currentPost.lessonIds.length > 0));
        
        if (!hasOtherQuizzes && !hasOtherLessons) {
            confirmationMessage += " This is the only content left in this post, so the post will be completely removed.";
        } else {
             confirmationMessage += " Other content in this post will remain shared.";
        }

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        try {
            if (!hasOtherQuizzes && !hasOtherLessons) {
                await deleteDoc(postRef);
                showToast(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} unshared and post removed.`, "success");
            } else {
                await updateDoc(postRef, {
                    [fieldToUpdate]: arrayRemove(contentIdToRemove)
                });
                showToast(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} successfully unshared.`, "success");
            }
            // onSnapshot will handle UI update
        } catch (error) {
            console.error(`Error deleting ${contentType} from post:`, error);
            showToast(`Failed to unshare ${contentType}. Please try again.`, "error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'studentAnnouncements', id));
            showToast("Announcement deleted.", "success");
            // onSnapshot will handle UI update
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
            // onSnapshot will handle UI update
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

    // MODIFIED: Reduced default padding for a more compact card
    const baseCardClasses = `
        relative p-3 rounded-xl border transition-all duration-300 transform hover:scale-[1.005] hover:shadow-md
        flex items-center justify-between
    `;

    const renderContent = () => {
        if (loading) return <div className="text-center py-8 text-gray-500 text-lg">Loading class content...</div>;

        const EmptyState = ({ icon: Icon, text, subtext, color }) => (
            <div className={`text-center py-8 px-4 bg-${color}-50 rounded-xl shadow-inner border border-${color}-200 animate-fadeIn text-sm`}> {/* Reduced padding, smaller text */}
                <Icon className={`h-12 w-12 mb-3 text-${color}-400 mx-auto opacity-80`} /> {/* Smaller icon */}
                <p className={`text-lg font-bold text-${color}-700`}>{text}</p> {/* Smaller text */}
                <p className={`mt-1 text-sm text-${color}-500`}>{subtext}</p> {/* Smaller text */}
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
                <div className="space-y-4 pr-2 custom-scrollbar"> {/* Reduced space-y */}
                    {Object.keys(lessonsByUnit).length > 0 ? (
                        sortedUnitKeys.map(unitDisplayName => (
                            <div key={unitDisplayName} className="bg-white rounded-lg shadow-md border border-gray-100 animate-slideInUp"> {/* Smaller rounded, shadow */}
                                <button
                                    className="flex items-center justify-between w-full p-3 font-bold text-base text-gray-800 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 rounded-t-lg transition-all duration-200 border-b border-blue-100" // Reduced padding, smaller text
                                    onClick={() => toggleUnitCollapse(unitDisplayName)}
                                >
                                    {unitDisplayName}
                                    {collapsedUnits.has(unitDisplayName) ? (
                                        <ChevronDownIcon className="h-5 w-5 text-blue-500 transition-transform duration-200" /> // Smaller icon
                                    ) : (
                                        <ChevronUpIcon className="h-5 w-5 text-blue-500 transition-transform duration-200" /> // Smaller icon
                                    )}
                                </button>
                                {!collapsedUnits.has(unitDisplayName) && (
                                    <div className="p-3 space-y-3"> {/* Reduced padding/spacing */}
                                        {/* Sort lessons within each unit alphabetically by title */}
                                        {lessonsByUnit[unitDisplayName]
                                            .sort((a, b) => a.lessonDetails.title.localeCompare(b.lessonDetails.title, undefined, { numeric: true }))
                                            .map(({ post, lessonDetails }) => (
                                                <div key={`${post.id}-${lessonDetails.id}`} className={`${baseCardClasses} bg-gradient-to-br from-white to-sky-50 border-sky-100 shadow-sm`}> {/* Smaller shadow */}
                                                    <div className="flex-1 min-w-0 pr-2"> {/* Added flex-1 and pr-2 */}
                                                        <p
                                                            className="font-semibold text-slate-800 text-base cursor-pointer hover:text-blue-700 transition-colors truncate" // Reduced font size, semibold, truncate
                                                            onClick={() => setViewLessonData(lessonDetails)}
                                                        >
                                                            {lessonDetails.title}
                                                        </p>
                                                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-1"> {/* Smaller text, reduced gap */}
                                                            <CalendarDaysIcon className="h-3.5 w-3.5 text-sky-500" /> {/* Smaller icon */}
                                                            <span>
                                                                {post.availableFrom?.toDate().toLocaleString()}
                                                                {post.availableUntil ? ` to ${post.availableUntil.toDate().toLocaleString()}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-1 flex-shrink-0"> {/* Reduced space-x */}
                                                        <button
                                                            onClick={() => handleEditDatesClick(post)}
                                                            title="Edit Availability Dates"
                                                            className="p-1.5 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" // Reduced padding
                                                        >
                                                            <PencilSquareIcon className="w-4 h-4" /> {/* Smaller icon */}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, lessonDetails.id, 'lesson'); }}
                                                            className="p-1.5 rounded-full text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm" // Reduced padding
                                                            title="Unshare Lesson Post"
                                                        >
                                                            <TrashIcon className="w-4 h-4" /> {/* Smaller icon */}
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
                
                quizIds.forEach(quizId => {
                    const quizDetails = quizzes.find(q => q.id === quizId);
                    if (quizDetails) {
                        let unitDisplayName = 'Uncategorized'; // Default

                        // PRIORITY 1: Use quiz's own unitId if available and mapped
                        if (quizDetails.unitId && units[quizDetails.unitId]) {
                            unitDisplayName = units[quizDetails.unitId];
                        } else if (post.lessonIds && post.lessonIds.length > 0) {
                            // PRIORITY 2: Fallback to unit of lessons in the same post
                            const lessonUnitTitlesInPost = new Set();
                            post.lessonIds.forEach(lessonId => {
                                const lesson = lessons.find(l => l.id === lessonId);
                                if (lesson && lesson.unitId && units[lesson.unitId]) {
                                    lessonUnitTitlesInPost.add(units[lesson.unitId]);
                                }
                            });
                            // If lessons in the post are all from one unit, use that
                            if (lessonUnitTitlesInPost.size === 1) {
                                unitDisplayName = Array.from(lessonUnitTitlesInPost)[0];
                            } else if (lessonUnitTitlesInPost.size > 1) {
                                // If lessons in the post are from multiple units, default to Uncategorized for clarity
                                unitDisplayName = 'Uncategorized';
                            }
                            // If no lesson units, it remains 'Uncategorized' by default
                        }

                        if (!quizzesByUnit[unitDisplayName]) {
                            quizzesByUnit[unitDisplayName] = [];
                        }
                        // Ensure we don't add duplicates (especially if a quiz appears in multiple posts)
                        if (!quizzesByUnit[unitDisplayName].some(item => item.quizDetails.id === quizDetails.id && item.post.id === post.id)) {
                            quizzesByUnit[unitDisplayName].push({ post, quizDetails });
                        }
                    }
                });
            });

            // Sort units alphabetically by name
            const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            return (
                <div className="space-y-4 pr-2 custom-scrollbar"> {/* Reduced space-y */}
                    {sortedUnitKeys.length > 0 ? (
                        sortedUnitKeys.map(unitDisplayName => (
                            <div key={unitDisplayName} className="bg-white rounded-lg shadow-md border border-gray-100 animate-slideInUp"> {/* Smaller rounded, shadow */}
                                <button
                                    className="flex items-center justify-between w-full p-3 font-bold text-base text-gray-800 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 rounded-t-lg transition-all duration-200 border-b border-purple-100" // Reduced padding, smaller text
                                    onClick={() => toggleUnitCollapse(unitDisplayName)}
                                >
                                    {unitDisplayName}
                                    {collapsedUnits.has(unitDisplayName) ? (
                                        <ChevronDownIcon className="h-5 w-5 text-purple-500 transition-transform duration-200" />
                                    ) : (
                                        <ChevronUpIcon className="h-5 w-5 text-purple-500 transition-transform duration-200" />
                                    )}
                                </button>
                                {!collapsedUnits.has(unitDisplayName) && (
                                    <div className="p-3 space-y-3"> {/* Reduced padding/spacing */}
                                        {quizzesByUnit[unitDisplayName]
                                            .sort((a, b) => a.quizDetails.title.localeCompare(b.quizDetails.title, undefined, { numeric: true }))
                                            .map(({ post, quizDetails }) => (
                                                <div key={`${post.id}-${quizDetails.id}`} className={`${baseCardClasses} bg-gradient-to-br from-white to-purple-50 border-purple-100 shadow-sm`}> {/* Smaller shadow */}
                                                    <div className="flex-1 min-w-0 pr-2"> {/* Added flex-1 and pr-2 */}
                                                        <p
                                                            className="font-semibold text-slate-800 text-base cursor-pointer hover:text-purple-700 transition-colors truncate" // Reduced font size, semibold, truncate
                                                            onClick={() => setViewQuizData(quizDetails)}
                                                        >
                                                            {quizDetails.title}
                                                        </p>
                                                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-1"> {/* Smaller text, reduced gap */}
                                                            <CalendarDaysIcon className="h-3.5 w-3.5 text-purple-500" /> {/* Smaller icon */}
                                                            <span>
                                                                {post.availableFrom?.toDate().toLocaleString()}
                                                                {post.availableUntil ? ` to ${post.availableUntil.toDate().toLocaleString()}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-1 flex-shrink-0"> {/* Reduced space-x */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }}
                                                            title="Edit Availability Dates"
                                                            className="p-1.5 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" // Reduced padding
                                                        >
                                                            <PencilSquareIcon className="w-4 h-4" /> {/* Smaller icon */}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, quizDetails.id, 'quiz'); }}
                                                            className="p-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm" // Reduced padding
                                                            title="Unshare Quiz"
                                                        >
                                                            <TrashIcon className="w-4 h-4" /> {/* Smaller icon */}
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
                
                quizIds.forEach(quizId => {
                    const quizDetails = quizzes.find(q => q.id === quizId);
                    if (quizDetails) {
                        let unitDisplayName = 'Uncategorized'; // Default

                        // PRIORITY 1: Use quiz's own unitId if available and mapped
                        if (quizDetails.unitId && units[quizDetails.unitId]) {
                            unitDisplayName = units[quizDetails.unitId];
                        } else if (post.lessonIds && post.lessonIds.length > 0) {
                            // PRIORITY 2: Fallback to unit of lessons in the same post
                            const lessonUnitTitlesInPost = new Set();
                            post.lessonIds.forEach(lessonId => {
                                const lesson = lessons.find(l => l.id === lessonId);
                                if (lesson && lesson.unitId && units[lesson.unitId]) {
                                    lessonUnitTitlesInPost.add(units[lesson.unitId]);
                                }
                            });
                            if (lessonUnitTitlesInPost.size === 1) {
                                unitDisplayName = Array.from(lessonUnitTitlesInPost)[0];
                            } else if (lessonUnitTitlesInPost.size > 1) {
                                unitDisplayName = 'Uncategorized';
                            }
                        }

                        if (!quizzesByUnit[unitDisplayName]) {
                            quizzesByUnit[unitDisplayName] = [];
                        }
                        if (!quizzesByUnit[unitDisplayName].some(q => q.id === quizDetails.id)) {
                            quizzesByUnit[unitDisplayName].push(quizDetails);
                        }
                    }
                });
            });

            const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            return (
                <div>
                    <div className="flex justify-end mb-4"> {/* Reduced mb */}
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            disabled={!quizzes.length}
                            title="Generate Report"
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                                ${!quizzes.length
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-500'
                                }`}
                        >
                            <ChartBarIcon className="w-5 h-5" /> {/* Smaller icon */}
                            <span>Generate Report</span>
                        </button>
                    </div>
                    <div className="space-y-4 pr-2 custom-scrollbar"> {/* Reduced space-y */}
                        {sortedUnitKeys.length > 0 ? (
                            sortedUnitKeys.map(unitDisplayName => (
                                <div key={unitDisplayName} className="bg-white rounded-lg shadow-md border border-gray-100 animate-slideInUp"> {/* Smaller rounded, shadow */}
                                    <button
                                        className="flex items-center justify-between w-full p-3 font-bold text-base text-gray-800 bg-gradient-to-r from-teal-50 to-white hover:from-teal-100 rounded-t-lg transition-all duration-200 border-b border-teal-100" // Reduced padding, smaller text
                                        onClick={() => toggleUnitCollapse(unitDisplayName)}
                                    >
                                        {unitDisplayName}
                                        {collapsedUnits.has(unitDisplayName) ? (
                                            <ChevronDownIcon className="h-5 w-5 text-teal-500 transition-transform duration-200" />
                                        ) : (
                                            <ChevronUpIcon className="h-5 w-5 text-teal-500 transition-transform duration-200" />
                                        )}
                                    </button>
                                    {!collapsedUnits.has(unitDisplayName) && (
                                        <div className="p-3 space-y-3"> {/* Reduced padding/spacing */}
                                            {quizzesByUnit[unitDisplayName]
                                                .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
                                                .map(quiz => (
                                                    <div
                                                        key={quiz.id}
                                                        className={`${baseCardClasses} bg-gradient-to-br from-white to-teal-50 border-teal-100 shadow-sm cursor-pointer`} // Smaller shadow
                                                        onClick={() => handleViewQuizScores(quiz)}
                                                    >
                                                        <div className="flex-1 min-w-0 pr-2"> {/* Added flex-1 and pr-2 */}
                                                            <p className="font-semibold text-teal-700 text-base truncate">{quiz.title}</p> {/* Reduced font size, semibold, truncate */}
                                                            <p className="text-xs text-gray-600 mt-0.5">Click to view detailed scores</p> {/* Smaller text, reduced mt */}
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            <ChartBarIcon className="w-4 h-4 text-teal-500" /> {/* Smaller icon */}
                                                        </div>
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
                <div className="space-y-3 pr-2 custom-scrollbar"> {/* Reduced space-y */}
                    {(classData?.students && classData.students.length > 0) ? (
                        classData.students.map(student => (
                            <div key={student.id} className={`${baseCardClasses} bg-gradient-to-br from-white to-gray-50 border-gray-100 shadow-sm`}> {/* Smaller shadow */}
                                <div className="flex items-center gap-3"> {/* Reduced gap */}
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0 border-2 border-blue-200"> {/* Smaller size, text */}
                                        {student.firstName ? student.firstName.charAt(0).toUpperCase() : ''}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-base">{student.firstName} {student.lastName}</p> {/* Reduced font size */}
                                        <p className="text-xs text-gray-500">Student ID: {student.id}</p> {/* Smaller text */}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveStudent(classData.id, student.id)}
                                    className="p-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm" // Reduced padding
                                    title={`Remove ${student.firstName}`}
                                >
                                    <TrashIcon className="w-4 h-4" /> {/* Smaller icon */}
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
                    <div className="mb-4 text-right"> {/* Reduced mb */}
                        <Button
                            onClick={() => setShowAddForm(prev => !prev)}
                            icon={PlusCircleIcon}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all px-4 py-2 text-sm" // Reduced padding, smaller text
                        >
                            {showAddForm ? 'Cancel Announcement' : 'Add New Announcement'}
                        </Button>
                    </div>
                )}
                {showAddForm && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-inner animate-fadeIn"> {/* Reduced padding/mb */}
                        <CreateClassAnnouncementForm
                            classId={classData.id}
                            onAnnouncementPosted={async () => {
                                // No explicit call to setupRealtimeAnnouncements needed here,
                                // the onSnapshot listener will handle the update
                                setShowAddForm(false);
                            }}
                        />
                    </div>
                )}
                <div className="space-y-3 pr-2 custom-scrollbar"> {/* Reduced space-y */}
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
                className="max-h-[95vh]" // MODIFIED: Added max-h for increased vertical height
            >
                <div className="flex flex-col md:flex-row bg-white overflow-hidden h-full animate-slideIn">
                    {/* Sidebar Navigation */}
                    <nav className="flex-shrink-0 bg-blue-600 p-4 space-y-2 md:w-56 border-r border-blue-700 flex md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar shadow-inner-strong"> {/* Reduced padding/width/spacing */}
                        <h2 className="text-lg font-bold text-white mb-3 hidden md:block">Class Sections</h2> {/* Smaller text, reduced mb */}
                        <button onClick={() => handleTabChange('announcements')} className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ease-in-out
                            ${activeTab === 'announcements'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <MegaphoneIcon className="h-5 w-5" /> Announcements
                        </button>
                        <button onClick={() => handleTabChange('lessons')} className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ease-in-out
                            ${activeTab === 'lessons'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <BookOpenIcon className="h-5 w-5" /> Lessons
                        </button>
                        <button onClick={() => handleTabChange('quizzes')} className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ease-in-out
                            ${activeTab === 'quizzes'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <AcademicCapIcon className="h-5 w-5" /> Quizzes
                        </button>
                        <button onClick={() => handleTabChange('scores')} className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ease-in-out
                            ${activeTab === 'scores'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <ChartBarIcon className="h-5 w-5" /> Scores
                        </button>
                        <button onClick={() => handleTabChange('students')} className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ease-in-out
                            ${activeTab === 'students'
                                ? 'bg-blue-700 text-white shadow-lg transform translate-x-1 border border-blue-800'
                                : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                            }
                        `}>
                            <UsersIcon className="h-5 w-5" /> Students ({classData?.students?.length || 0})
                        </button>
                    </nav>

                    {/* Main Content Area */}
                    <div className="flex-1 p-5 sm:p-6 bg-gradient-to-br from-white to-gray-50 rounded-none flex flex-col overflow-y-auto"> {/* Reduced padding */}
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-5 pb-2 border-b-2 border-blue-200 flex-shrink-0"> {/* Smaller text, reduced mb */}
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
                onUpdate={() => { /* Real-time listeners will handle update, no explicit fetch needed here */ }}
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
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl shadow-md border border-blue-200
                       transition-all duration-300 transform hover:scale-[1.005] hover:shadow-lg overflow-hidden cursor-pointer" // Reduced padding, shadow
            onClick={!isEditing ? onClick : undefined}
        >
            {isEditing ? (
                <div className="w-full flex flex-col gap-2"> {/* Reduced gap */}
                    <textarea
                        className="w-full border border-blue-300 p-2.5 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/80 backdrop-blur-sm shadow-inner" // Reduced padding/text size
                        rows={3} // Reduced rows
                        value={editContent}
                        onChange={onChangeEdit}
                        placeholder="Edit your announcement here..."
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end gap-1.5"> {/* Reduced gap */}
                        <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} className="border-gray-300 text-gray-700 hover:bg-gray-200 shadow-sm">Cancel</Button> {/* Smaller button */}
                        <Button size="xs" onClick={(e) => { e.stopPropagation(); onSaveEdit(); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Save</Button> {/* Smaller button */}
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-3"> {/* Reduced pr */}
                        <h3 className="font-semibold text-gray-800 text-base leading-tight mb-0.5 truncate group-hover:text-blue-700 transition-colors"> {/* Reduced font size, reduced mb, truncate */}
                            <MegaphoneIcon className="h-4 w-4 inline-block mr-1.5 text-blue-600" /> {/* Smaller icon, reduced mr */}
                            {post.content}
                        </h3>
                        <p className="text-xs text-gray-600"> {/* Smaller text */}
                            Posted by <span className="font-medium">{post.teacherName || 'Unknown'}</span> on {formattedDate}
                        </p>
                    </div>
                    {isOwn && (
                        <div className="flex space-x-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"> {/* Reduced space-x */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                title="Edit Announcement"
                                className="p-1 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" // Reduced padding
                            >
                                <PencilSquareIcon className="w-4 h-4" /> {/* Smaller icon */}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                title="Delete Announcement"
                                className="p-1 rounded-full text-red-600 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm" // Reduced padding
                            >
                                <TrashIcon className="w-4 h-4" /> {/* Smaller icon */}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClassOverviewModal;
