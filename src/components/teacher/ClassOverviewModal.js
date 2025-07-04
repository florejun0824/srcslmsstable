import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
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
    deleteDoc
} from 'firebase/firestore';
import { Button } from '@tremor/react';
import { PencilSquareIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline';
import CreateClassAnnouncementForm from './CreateClassAnnouncementForm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ViewLessonModal from './ViewLessonModal';
import ViewQuizModal from './ViewQuizModal';
import GenerateReportModal from './GenerateReportModal';
import EditAvailabilityModal from './EditAvailabilityModal';

const ClassOverviewModal = ({ isOpen, onClose, classData }) => {
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

    const fetchClassAnnouncements = useCallback(async () => {
        if (!classData?.id) return;
        try {
            const announcementsQuery = query(
                collection(db, "classAnnouncements"),
                where("classIds", "array-contains", classData.id),
                orderBy("createdAt", "desc")
            );
            const announcementsSnap = await getDocs(announcementsQuery);
            setAnnouncements(announcementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching announcements:", error);
        }
    }, [classData]);

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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'classAnnouncements', id));
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

            await updateDoc(doc(db, 'classAnnouncements', id), {
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

    const renderContent = () => {
        if (loading) return <div className="text-center py-8">Loading class content...</div>;

        if (activeTab === 'lessons') {
            const lessonPosts = sharedContentPosts.filter(p => p.lessonIds?.length > 0);
            return lessonPosts.length > 0 ? (
                <ul className="space-y-3">
                    {lessonPosts.map(post => {
                        const lessonDetails = lessons.find(l => post.lessonIds.includes(l.id));
                        return (
                            <li key={post.id} className="p-4 bg-gray-50 rounded-lg border flex justify-between items-center">
                                <div>
                                    <p className="font-semibold cursor-pointer hover:text-blue-600" onClick={() => setViewLessonData(lessonDetails)}>
                                        {lessonDetails?.title || 'Loading lesson...'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Available from {post.availableFrom?.toDate().toLocaleString()} to {post.availableUntil?.toDate().toLocaleString()}
                                    </p>
                                </div>
                                <Button size="xs" icon={PencilSquareIcon} onClick={() => handleEditDatesClick(post)}>
                                    Edit Dates
                                </Button>
                            </li>
                        )
                    })}
                </ul>
            ) : <p className="text-center py-8 text-gray-500">No lessons have been shared with this class yet.</p>;
        }

        if (activeTab === 'quizzes') {
            const quizPosts = sharedContentPosts.filter(p => p.quizIds?.length > 0);
            return quizPosts.length > 0 ? (
                <ul className="space-y-3">
                    {quizPosts.map(post => {
                         const quizDetails = quizzes.find(q => post.quizIds.includes(q.id));
                         return (
                            <li key={post.id} className="p-4 bg-gray-50 rounded-lg border flex justify-between items-center">
                                <div>
                                    <p className="font-semibold cursor-pointer hover:text-blue-600" onClick={() => setViewQuizData(quizDetails)}>
                                        {quizDetails?.title || 'Loading quiz...'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Available from {post.availableFrom?.toDate().toLocaleString()} to {post.availableUntil?.toDate().toLocaleString()}
                                    </p>
                                </div>
                                <Button size="xs" icon={PencilSquareIcon} onClick={() => handleEditDatesClick(post)}>
                                    Edit Dates
                                </Button>
                            </li>
                         )
                    })}
                </ul>
            ) : <p className="text-center py-8 text-gray-500">No quizzes have been shared with this class yet.</p>;
        }

        if (activeTab === 'scores') {
            return (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => setIsReportModalOpen(true)} disabled={!quizzes.length}>
                            Generate Report
                        </Button>
                    </div>
                    <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2">
                        {quizzes.length > 0 ? (
                            quizzes.map(quiz => {
                                const scores = quizScores.filter(s => s.quizId === quiz.id);
                                return (
                                    <div key={quiz.id} className="mb-8">
                                        <h3 className="font-bold text-lg mb-2 sticky top-0 bg-white py-2">{quiz.title}</h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white border rounded-lg">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="p-3 text-left text-sm font-semibold text-gray-600">Student Name</th>
                                                        <th className="p-3 text-center text-sm font-semibold text-gray-600">Attempt 1</th>
                                                        <th className="p-3 text-center text-sm font-semibold text-gray-600">Attempt 2</th>
                                                        <th className="p-3 text-center text-sm font-semibold text-gray-600">Attempt 3</th>
                                                        <th className="p-3 text-center text-sm font-semibold text-gray-600">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {classData?.students?.map(student => {
                                                        const studentAttempts = scores.filter(a => a.studentId === student.id);
                                                        const isLocked = quizLocks.some(lock => lock.studentId === student.id && lock.quizId === quiz.id);
                                                        
                                                        return (
                                                            <tr key={student.id} className="border-t hover:bg-gray-50">
                                                                <td className="p-3">{student.firstName} {student.lastName}</td>
                                                                {[1, 2, 3].map(attemptNum => {
                                                                    const attempt = studentAttempts.find(a => a.attemptNumber === attemptNum);
                                                                    return (
                                                                        <td key={attemptNum} className="p-3 text-center">
                                                                            {attempt ? (
                                                                                <div className="flex items-center justify-center gap-2">
                                                                                    <span>{`${attempt.score}/${attempt.totalItems}`}</span>
                                                                                    {attempt.isLate && (
                                                                                        <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                                                                                            LATE
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : '—'}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="p-3 text-center">
                                                                    {isLocked && (
                                                                         <div className="flex items-center justify-center gap-2">
                                                                            <span className="text-xs font-bold text-white bg-gray-700 px-2 py-1 rounded-full">
                                                                                LOCKED
                                                                            </span>
                                                                            <button onClick={() => handleUnlockQuiz(quiz.id, student.id)} className="p-1 text-gray-400 hover:text-blue-600" title="Unlock Quiz">
                                                                                <KeyIcon className="w-4 h-4"/>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })
                        ) : <p className="text-center py-8 text-gray-500">No quiz scores available.</p>}
                    </div>
                </div>
            );
        }

        return (
            <div>
                {userProfile?.role === 'teacher' && (
                    <div className="mb-4">
                        <Button onClick={() => setShowAddForm(prev => !prev)}>
                            {showAddForm ? 'Cancel' : 'Add Announcement'}
                        </Button>
                    </div>
                )}
                {showAddForm && (
                    <CreateClassAnnouncementForm
                        classId={classData.id}
                        teacherProfile={userProfile}
                        onSuccess={async () => {
                            await fetchClassAnnouncements();
                            setShowAddForm(false);
                        }}
                    />
                )}
                <ul className="space-y-4 mt-4">
                    {announcements.map(post => (
                        <CollapsibleAnnouncement
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
                        />
                    ))}
                    {!announcements.length && (
                        <p className="text-center text-gray-500 mt-6">No announcements for this class.</p>
                    )}
                </ul>
            </div>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={classData?.name || 'Class Overview'}>
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-4" aria-label="Tabs">
                        {['announcements', 'lessons', 'quizzes', 'scores'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-2 font-medium text-sm rounded-t-lg capitalize ${
                                    activeTab === tab
                                        ? 'border-b-2 border-blue-500 text-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="py-6">{renderContent()}</div>
            </Modal>

            <GenerateReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                classData={classData}
                availableQuizzes={quizzes}
                quizScores={quizScores}
            />
            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />
            
            {/* --- THIS IS THE FIX --- */}
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
        </>
    );
};

const CollapsibleAnnouncement = ({
    post,
    isOwn,
    onEdit,
    onDelete,
    isEditing,
    editContent,
    onChangeEdit,
    onSaveEdit,
    onCancelEdit
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <li className="group relative p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
            {isEditing ? (
                <>
                    <textarea
                        className="w-full border p-2 rounded-md text-sm"
                        rows={4}
                        value={editContent}
                        onChange={onChangeEdit}
                    />
                    <div className="flex gap-2 mt-2">
                        <Button size="xs" onClick={onSaveEdit}>Save</Button>
                        <Button size="xs" variant="light" onClick={onCancelEdit}>Cancel</Button>
                    </div>
                </>
            ) : (
                <>
                    <div
                        className={`text-gray-800 text-sm whitespace-pre-wrap transition-all duration-300 ${
                            isExpanded ? '' : 'line-clamp-3'
                        }`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {post.content}
                    </div>
                    <div className="text-sm text-gray-500 mt-2 flex justify-between items-center">
                        <span>— {post.teacherName}</span>
                        <span>{post.createdAt?.toDate?.().toLocaleString?.() || ''}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-blue-500 mt-2">
                        <button onClick={() => setIsExpanded(prev => !prev)} className="hover:underline">
                            {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                    </div>
                    {isOwn && (
                        <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={onEdit} title="Edit">
                                <PencilSquareIcon className="w-5 h-5 text-blue-500 hover:text-blue-700" />
                            </button>
                            <button onClick={onDelete} title="Delete">
                                <TrashIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </li>
    );
};

export default ClassOverviewModal;