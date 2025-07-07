// src/components/teacher/ClassOverviewModal.js
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal'; // Assuming your custom Modal component
import AnnouncementViewModal from '../common/AnnouncementViewModal'; // New Import!
import QuizScoresModal from './QuizScoresModal';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where, // Make sure 'where' is imported
    getDocs,
    orderBy,
    documentId,
    updateDoc,
    doc,
    deleteDoc,
    Timestamp // Ensure Timestamp is imported for date handling if needed for comparison, serverTimestamp is for saving
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
    PlusCircleIcon
} from '@heroicons/react/24/outline';
import CreateClassAnnouncementForm from './CreateClassAnnouncementForm'; // Re-import with correct path
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

    // Fetch Class Announcements (CRITICAL: Query changed to 'where("classId", "==", classData.id)')
    const fetchClassAnnouncements = useCallback(async () => {
        if (!classData?.id) {
            console.warn("ClassOverviewModal: classData ID is missing, skipping announcement fetch.");
            setAnnouncements([]);
            return;
        }
        setLoading(true);
        try {
            // CRITICAL: Querying 'studentAnnouncements' collection with direct string equality
            const announcementsQuery = query(
                collection(db, "studentAnnouncements"),
                where("classId", "==", classData.id), // <-- CRITICAL CHANGE: Querying 'classId' string field
                orderBy("createdAt", "desc")
            );
            console.log("ClassOverviewModal: Attempting to fetch announcements from 'studentAnnouncements' for classId (string):", classData.id);

            const announcementsSnap = await getDocs(announcementsQuery);
            const fetchedAnnouncements = announcementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAnnouncements(fetchedAnnouncements);
            console.log("ClassOverviewModal: Fetched announcements result:", fetchedAnnouncements);
            console.log("ClassOverviewModal: Number of fetched announcements:", fetchedAnnouncements.length);

        } catch (error) {
            console.error("ClassOverviewModal: Error fetching announcements:", error);
            showToast("Failed to load announcements.", "error");
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    }, [classData, showToast]);

    // Fetch Lessons and Quizzes (no changes here)
    const fetchLessonsAndQuizzes = useCallback(async () => {
        if (!classData?.id) return;
        try {
            const postsQuery = query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'desc'));
            const postsSnapshot = await getDocs(postsQuery);

            const allPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSharedContentPosts(allPosts);

            const lessonIds = new Set();
            const quizIds = new Set();

            allPosts.forEach(post => {
                post.lessonIds?.forEach(id => lessonIds.add(id));
                post.quizIds?.forEach(id => quizIds.add(id));
            });

            if (lessonIds.size > 0) {
                const q = query(collection(db, 'lessons'), where(documentId(), 'in', Array.from(lessonIds)));
                const snap = await getDocs(q);
                setLessons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        } catch (error) {
            console.error("Error fetching lessons/quizzes:", error);
            showToast("Failed to load class content.", "error");
        }
    }, [classData, showToast]);

    useEffect(() => {
        if (!isOpen || !classData?.id) return;
        setLoading(true);
        Promise.all([fetchClassAnnouncements(), fetchLessonsAndQuizzes()])
            .finally(() => setLoading(false));

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
        };
    }, [isOpen, classData, fetchClassAnnouncements, fetchLessonsAndQuizzes]);

    const handleUnlockQuiz = async (quizId, studentId) => {
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

    // Handle Delete Announcement (CRITICAL: Targets 'studentAnnouncements' with correct ID)
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'studentAnnouncements', id)); // Target 'studentAnnouncements'
            showToast("Announcement deleted.", "success");
            fetchClassAnnouncements();
        } catch (error) {
            console.error("Error deleting announcement:", error);
            showToast("Failed to delete announcement.", "error");
        }
    };

    // Handle Edit Announcement Save (CRITICAL: Targets 'studentAnnouncements' with correct ID)
    const handleEditSave = async (id) => {
        try {
            const trimmed = editContent.trim();
            if (!trimmed) return showToast("Content cannot be empty.", "error");

            await updateDoc(doc(db, 'studentAnnouncements', id), { // Target 'studentAnnouncements'
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
        relative p-5 rounded-xl border transition-all duration-300
        flex items-center justify-between
    `;
    const cardHoverClasses = `
        hover:shadow-xl hover:scale-[1.005]
    `;

    const renderContent = () => {
        if (loading) return <div className="text-center py-8 text-gray-500 text-lg">Loading class content...</div>;

        if (activeTab === 'lessons') {
            const lessonPosts = sharedContentPosts.filter(p => p.lessonIds?.length > 0);
            return (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {lessonPosts.length > 0 ? (
                        lessonPosts.map(post => {
                            const lessonDetails = lessons.find(l => post.lessonIds.includes(l.id));
                            if (!lessonDetails) return null;

                            return (
                                <div key={post.id} className={`${baseCardClasses} bg-gradient-to-br from-white to-blue-50 border-blue-100 shadow-lg ${cardHoverClasses}`}>
                                    <div>
                                        <p
                                            className="font-bold text-gray-800 text-lg cursor-pointer hover:text-blue-600 transition-colors"
                                            onClick={() => setViewLessonData(lessonDetails)}
                                        >
                                            {lessonDetails.title}
                                        </p>
                                        <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                                            <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
                                            <span>
                                                {post.availableFrom?.toDate().toLocaleString()}
                                                {post.availableUntil ? ` to ${post.availableUntil.toDate().toLocaleString()}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 flex-shrink-0">
                                        <Button
                                            size="sm"
                                            icon={PencilSquareIcon}
                                            onClick={() => handleEditDatesClick(post)}
                                            className="ml-4 bg-blue-500 hover:bg-blue-600 text-white"
                                            title="Edit Availability Dates"
                                        >
                                            Edit Dates
                                        </Button>
                                        <button
                                            onClick={() => handleDeleteSharedContentPost(post.id)}
                                            className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                            title="Unshare Lesson Post"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center py-8 text-gray-500">No lessons have been shared with this class yet.</p>
                    )}
                </div>
            );
        }

        if (activeTab === 'quizzes') {
            const quizPosts = sharedContentPosts.filter(p => p.quizIds?.length > 0);
            return (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {quizPosts.length > 0 ? (
                        quizPosts.map(post => {
                            const quizDetails = quizzes.find(q => post.quizIds.includes(q.id));
                            if (!quizDetails) return null;

                            return (
                                <div key={post.id} className={`${baseCardClasses} bg-gradient-to-br from-white to-purple-50 border-purple-100 shadow-lg ${cardHoverClasses}`}>
                                    <div>
                                        <p
                                            className="font-bold text-gray-800 text-lg cursor-pointer hover:text-purple-600 transition-colors"
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
                                        <Button
                                            size="sm"
                                            icon={PencilSquareIcon}
                                            onClick={() => handleEditDatesClick(post)}
                                            className="ml-4 bg-purple-500 hover:bg-purple-600 text-white"
                                            title="Edit Availability Dates"
                                        >
                                            Edit Dates
                                        </Button>
                                        <button
                                            onClick={() => handleDeleteSharedContentPost(post.id)}
                                            className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                            title="Unshare Quiz Post"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center py-8 text-gray-500">No quizzes have been shared with this class yet.</p>
                    )}
                </div>
            );
        }

        if (activeTab === 'scores') {
            const handleViewQuizScores = (quiz) => {
                setSelectedQuizForScores(quiz);
                setScoresDetailModalOpen(true);
            };

            return (
                <div>
                    <div className="flex justify-end mb-6">
                        <Button
                            onClick={() => setIsReportModalOpen(true)}
                            disabled={!quizzes.length}
                            icon={AcademicCapIcon}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                        >
                            Generate Report
                        </Button>
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {quizzes.length > 0 ? (
                            quizzes.map(quiz => (
                                <div
                                    key={quiz.id}
                                    className={`${baseCardClasses} bg-gradient-to-br from-white to-teal-50 border-teal-100 shadow-lg cursor-pointer ${cardHoverClasses}`}
                                    onClick={() => handleViewQuizScores(quiz)}
                                >
                                    <p className="font-bold text-teal-700 text-lg">{quiz.title}</p>
                                    <p className="text-sm text-gray-600 mt-1">Click to view detailed scores</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-gray-500">No quizzes have been shared with this class yet to view scores.</p>
                        )}
                    </div>
                </div>
            );
        }

        if (activeTab === 'students') {
            return (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {(classData?.students && classData.students.length > 0) ? (
                        classData.students.map(student => (
                            <div key={student.id} className={`${baseCardClasses} bg-gradient-to-br from-white to-gray-50 border-gray-100 shadow-lg ${cardHoverClasses}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                                        {student.firstName ? student.firstName.charAt(0).toUpperCase() : ''}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-lg">{student.firstName} {student.lastName}</p>
                                        <p className="text-sm text-gray-500">Student ID: {student.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveStudent(classData.id, student.id)}
                                    className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                    title={`Remove ${student.firstName}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">This class has no students enrolled yet.</p>
                    )}
                </div>
            );
        }

        // Default to announcements tab
        return (
            <div>
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
                    <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg shadow-inner">
                        <CreateClassAnnouncementForm
                            classId={classData.id}
                            onAnnouncementPosted={async () => {
                                await fetchClassAnnouncements();
                                setShowAddForm(false);
                            }}
                        />
                    </div>
                )}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                                onChangeEdit={(e) => setEditContent(e.target.value)}
                                onSaveEdit={() => handleEditSave(post.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onClick={() => setSelectedAnnouncement(post)}
                            />
                        ))
                    ) : (
                        <p className="text-center text-gray-500 mt-6">No announcements for this class yet.</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={classData?.name || 'Class Overview'} size="4xl" className="md:w-[75vw]">
                <div className="flex flex-col md:flex-row bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden shadow-xl">
                    <nav className="flex-shrink-0 bg-gray-100 p-4 space-y-2 md:w-56 border-r border-gray-200 flex md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar">
                        <button onClick={() => setActiveTab('announcements')} className={getTabClasses('announcements')}>
                            <MegaphoneIcon className="h-5 w-5" /> Announcements
                        </button>
                        <button onClick={() => setActiveTab('lessons')} className={getTabClasses('lessons')}>
                            <BookOpenIcon className="h-5 w-5" /> Lessons
                        </button>
                        <button onClick={() => setActiveTab('quizzes')} className={getTabClasses('quizzes')}>
                            <AcademicCapIcon className="h-5 w-5" /> Quizzes
                        </button>
                        <button onClick={() => setActiveTab('scores')} className={getTabClasses('scores')}>
                            <AcademicCapIcon className="h-5 w-5" /> Scores
                        </button>
                        <button onClick={() => setActiveTab('students')} className={getTabClasses('students')}>
                            <UsersIcon className="h-5 w-5" /> Students ({classData?.students?.length || 0})
                        </button>
                    </nav>

                    <div className="flex-1 p-6 bg-transparent">
                        {renderContent()}
                    </div>
                </div>
            </Modal>

            <GenerateReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                classData={classData}
                availableQuizzes={quizzes}
                quizScores={quizScores}
            />
            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />

            <ViewQuizModal
                isOpen={!!viewQuizData}
                onClose={() => setViewQuizData(null)}
                quiz={viewQuizData}
                userProfile={userProfile}
                classId={classData?.id}
            />

            <EditAvailabilityModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                post={postToEdit}
                classId={classData?.id}
                onUpdate={fetchLessonsAndQuizzes}
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
                />
            )}

            <AnnouncementViewModal
                isOpen={!!selectedAnnouncement}
                onClose={() => setSelectedAnnouncement(null)}
                announcement={selectedAnnouncement}
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
        ? post.createdAt.toDate().toLocaleDateString()
        : (post.createdAt instanceof Date ? post.createdAt.toLocaleDateString() : 'N/A');

    return (
        <div
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg shadow-md border border-blue-200
                       hover:shadow-lg hover:scale-[1.005] transition-all duration-300 overflow-hidden cursor-pointer flex items-center justify-between"
            onClick={!isEditing ? onClick : undefined}
        >
            {isEditing ? (
                <div className="w-full flex flex-col gap-2">
                    <textarea
                        className="w-full border border-blue-300 p-2 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/80 backdrop-blur-sm"
                        rows={3}
                        value={editContent}
                        onChange={onChangeEdit}
                        placeholder="Edit your announcement here..."
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} className="border-gray-300 text-gray-700 hover:bg-gray-200">Cancel</Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); onSaveEdit(); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">Save</Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="font-semibold text-gray-800 text-base truncate">
                            <MegaphoneIcon className="h-4 w-4 inline-block mr-2 text-blue-600" />
                            {post.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Posted by {post.teacherName || 'Unknown'} on {formattedDate}
                        </p>
                    </div>
                    {isOwn && (
                        <div className="flex space-x-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                title="Edit Announcement"
                                className="p-2 rounded-full text-blue-600 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                title="Delete Announcement"
                                className="p-2 rounded-full text-red-600 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ClassOverviewModal;