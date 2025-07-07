// src/components/student/StudentClassDetailView.js
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where, documentId, Timestamp } from 'firebase/firestore'; // Added Timestamp
import Spinner from '../common/Spinner';
import ViewLessonModal from '../teacher/ViewLessonModal';
import ViewQuizModal from '../teacher/ViewQuizModal';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import { useAuth } from '../../contexts/AuthContext'; // Reverted to original AuthContext path for consistency
import { MegaphoneIcon, BookOpenIcon, AcademicCapIcon, ArrowLeftIcon, SparklesIcon, FileTextIcon, PresentationChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline'; // Imported all necessary icons, including ArrowRightIcon

const StudentClassDetailView = ({ selectedClass, onBack }) => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('announcements');
    const [announcements, setAnnouncements] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    const fetchData = useCallback(async () => {
        if (!selectedClass?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const annQuery = query(
                collection(db, "studentAnnouncements"),
                where("classId", "==", selectedClass.id),
                orderBy("createdAt", "desc")
            );
            const annSnap = await getDocs(annQuery);
            setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const postsQuery = query(collection(db, `classes/${selectedClass.id}/posts`), orderBy('createdAt', 'desc'));
            const postsSnap = await getDocs(postsQuery);

            const lessonIdSet = new Set();
            const quizIdSet = new Set();
            postsSnap.forEach(doc => {
                const post = doc.data();
                if (Array.isArray(post.lessonIds)) post.lessonIds.forEach(id => lessonIdSet.add(id));
                if (Array.isArray(post.quizIds)) post.quizIds.forEach(id => quizIdSet.add(id));
            });

            const uniqueLessonIds = Array.from(lessonIdSet);
            const uniqueQuizIds = Array.from(quizIdSet);

            if (uniqueLessonIds.length > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', uniqueLessonIds));
                const lessonsSnap = await getDocs(lessonsQuery);
                setLessons(lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                setLessons([]);
            }

            if (uniqueQuizIds.length > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                const quizzesSnap = await getDocs(quizzesQuery);
                setQuizzes(quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                setQuizzes([]);
            }
        } catch (error) {
            console.error("Failed to fetch class details:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);

    useEffect(() => {
        fetchData();
        return () => {
            setAnnouncements([]);
            setLessons([]);
            setQuizzes([]);
            setSelectedAnnouncement(null);
            setViewLessonData(null);
            setViewQuizData(null);
            setActiveTab('announcements');
        };
    }, [fetchData]);

    const getTabClasses = (tabName) => `
        flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 ease-in-out
        ${activeTab === tabName
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
        }
    `;

    const renderContent = () => {
        if (loading) return <Spinner />;

        switch(activeTab) {
            case 'lessons':
                return lessons.length > 0 ? (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {lessons.map(lesson => (
                            <LessonListItemForStudent
                                key={lesson.id}
                                lesson={lesson}
                                onClick={() => setViewLessonData(lesson)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-100 rounded-lg border border-dashed border-gray-300">
                        <BookOpenIcon className="h-16 w-16 mb-4 text-gray-300 mx-auto" />
                        <p className="text-lg font-medium text-gray-500">No lessons are available for this class yet.</p>
                        <p className="text-sm mt-2 text-gray-400">Lessons will appear here once your teacher assigns them.</p>
                    </div>
                );

            case 'quizzes':
                return quizzes.length > 0 ? (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {quizzes.map(quiz => (
                            <QuizListItemForStudent
                                key={quiz.id}
                                quiz={quiz}
                                onClick={() => setViewQuizData(quiz)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-100 rounded-lg border border-dashed border-gray-300">
                        <AcademicCapIcon className="h-16 w-16 mb-4 text-gray-300 mx-auto" />
                        <p className="text-lg font-medium text-gray-500">No quizzes are available for this class yet.</p>
                        <p className="text-sm mt-2 text-gray-400">Quizzes will appear here once your teacher assigns them.</p>
                    </div>
                );

            case 'announcements':
            default:
                return announcements.length > 0 ? (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {announcements.map(announcement => (
                            <AnnouncementListItemForStudent
                                key={announcement.id}
                                announcement={announcement}
                                onClick={() => setSelectedAnnouncement(announcement)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-100 rounded-lg border border-dashed border-gray-300">
                        <MegaphoneIcon className="h-16 w-16 mb-4 text-gray-300 mx-auto" />
                        <p className="text-lg font-medium text-gray-500">No announcements for this class.</p>
                        <p className="text-sm mt-2 text-gray-400">Important class updates will be posted here.</p>
                    </div>
                );
        }
    };

    return (
        <>
            <div className="bg-white/90 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-xl max-w-4xl mx-auto my-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 font-semibold text-sm"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back to All Classes
                </button>
                <h1 className="text-3xl font-extrabold text-gray-800 mb-2">{selectedClass.name}</h1>
                <p className="text-lg text-gray-600 mb-6">{selectedClass.gradeLevel} - {selectedClass.section}</p>

                <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-6">
                        <button onClick={() => setActiveTab('announcements')} className={getTabClasses('announcements')}>
                            <MegaphoneIcon className="h-5 w-5" /> Announcements
                        </button>
                        <button onClick={() => setActiveTab('lessons')} className={getTabClasses('lessons')}>
                            <BookOpenIcon className="h-5 w-5" /> Lessons
                        </button>
                        <button onClick={() => setActiveTab('quizzes')} className={getTabClasses('quizzes')}>
                            <AcademicCapIcon className="h-5 w-5" /> Quizzes
                        </button>
                    </nav>
                </div>
                <div className="py-2">
                    {renderContent()}
                </div>
            </div>

            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />
            <ViewQuizModal
                isOpen={!!viewQuizData}
                onClose={() => setViewQuizData(null)}
                quiz={viewQuizData}
                userProfile={userProfile}
                classId={selectedClass.id}
            />
            <AnnouncementViewModal
                isOpen={!!selectedAnnouncement}
                onClose={() => setSelectedAnnouncement(null)}
                announcement={selectedAnnouncement}
            />
        </>
    );
};

export default StudentClassDetailView;

// New Component: LessonListItemForStudent
const LessonListItemForStudent = ({ lesson, onClick }) => {
    return (
        <div
            className="group relative bg-gradient-to-br from-white to-sky-50 p-5 rounded-xl shadow-md border border-sky-200
                       hover:shadow-lg hover:scale-[1.005] transition-all duration-300 overflow-hidden cursor-pointer
                       flex items-center space-x-4"
            onClick={onClick}
        >
            <div className="flex-shrink-0 p-3 rounded-full bg-sky-100 group-hover:bg-sky-200 transition-colors">
                <SparklesIcon className="h-6 w-6 text-sky-600 group-hover:text-sky-700 transition-colors" />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-800 transition-colors truncate">
                    {lesson.title}
                </h3>
                {lesson.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {lesson.description}
                    </p>
                )}
            </div>

            <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

// New Component: QuizListItemForStudent
const QuizListItemForStudent = ({ quiz, onClick }) => {
    return (
        <div
            className="group relative bg-gradient-to-br from-white to-purple-50 p-5 rounded-xl shadow-md border border-purple-200
                       hover:shadow-lg hover:scale-[1.005] transition-all duration-300 overflow-hidden cursor-pointer
                       flex items-center space-x-4"
            onClick={onClick}
        >
            <div className="flex-shrink-0 p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                <AcademicCapIcon className="h-6 w-6 text-purple-600 group-hover:text-purple-700 transition-colors" />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-800 transition-colors truncate">
                    {quiz.title}
                </h3>
                {quiz.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {quiz.description}
                    </p>
                )}
            </div>

            <div className="flex-shrink-0 text-gray-400 group-hover:text-purple-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};


// New Component: AnnouncementListItemForStudent
const AnnouncementListItemForStudent = ({ announcement, onClick }) => {
    const formattedDate = announcement.createdAt && typeof announcement.createdAt.toDate === 'function'
        ? announcement.createdAt.toDate().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
          })
        : (announcement.createdAt instanceof Date ? announcement.createdAt.toLocaleDateString() : 'N/A');

    return (
        <div
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl shadow-md border border-blue-200
                       hover:shadow-lg hover:scale-[1.005] transition-all duration-300 overflow-hidden cursor-pointer
                       flex items-center space-x-4"
            onClick={onClick}
        >
            <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <MegaphoneIcon className="h-6 w-6 text-blue-600 group-hover:text-blue-700 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-800 transition-colors truncate">
                    {announcement.content}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    Posted by {announcement.teacherName || 'Unknown'} on {formattedDate}
                </p>
            </div>
            <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};