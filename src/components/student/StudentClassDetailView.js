import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where, documentId } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import ViewLessonModal from '../student/ViewLessonModal';
import ViewQuizModal from '../teacher/ViewQuizModal';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import { useAuth } from '../../contexts/AuthContext';
import { MegaphoneIcon, BookOpenIcon, AcademicCapIcon, ArrowLeftIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

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
            const annQuery = query(collection(db, "studentAnnouncements"), where("classId", "==", selectedClass.id), orderBy("createdAt", "desc"));
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
            if (uniqueLessonIds.length > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', uniqueLessonIds));
                const lessonsSnap = await getDocs(lessonsQuery);
                const fetchedLessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                fetchedLessons.sort((a, b) => {
                    const orderA = a.order ?? Infinity;
                    const orderB = b.order ?? Infinity;
                    if (orderA !== orderB) return orderA - orderB;
                    const numA = parseInt(a.title.match(/\d+/)?.[0] || 0, 10);
                    const numB = parseInt(b.title.match(/\d+/)?.[0] || 0, 10);
                    return numA - numB;
                });
                setLessons(fetchedLessons);
            } else { setLessons([]); }

            const uniqueQuizIds = Array.from(quizIdSet);
            if (uniqueQuizIds.length > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                const quizzesSnap = await getDocs(quizzesQuery);
                setQuizzes(quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else { setQuizzes([]); }
        } catch (error) {
            console.error("Failed to fetch class details:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getTabClasses = (tabName) => `
        flex items-center gap-2 px-3 py-2 font-semibold text-xs sm:text-sm rounded-lg transition-all duration-300 ease-in-out
        ${activeTab === tabName ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'}
    `;
    
    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

        switch(activeTab) {
            case 'lessons':
                return lessons.length > 0 ? (
                    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                        {lessons.map(lesson => (
                            <LessonListItemForStudent key={lesson.id} lesson={lesson} onClick={() => setViewLessonData(lesson)} />
                        ))}
                    </div>
                ) : (
                    // ✅ FIXED: Smaller text for empty state messages
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <BookOpenIcon className="h-12 w-12 mb-3 text-gray-300 mx-auto" />
                        <p className="text-base font-medium text-gray-500">No lessons are available yet.</p>
                        <p className="text-xs mt-1 text-gray-400">Your teacher will post lessons here.</p>
                    </div>
                );
            case 'quizzes':
                 return quizzes.length > 0 ? (
                    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                        {quizzes.map(quiz => (
                            <QuizListItemForStudent key={quiz.id} quiz={quiz} onClick={() => setViewQuizData(quiz)} />
                        ))}
                    </div>
                ) : (
                    // ✅ FIXED: Smaller text for empty state messages
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <AcademicCapIcon className="h-12 w-12 mb-3 text-gray-300 mx-auto" />
                        <p className="text-base font-medium text-gray-500">No quizzes are available yet.</p>
                        <p className="text-xs mt-1 text-gray-400">Check back later for quizzes.</p>
                    </div>
                );
            case 'announcements':
            default:
                return announcements.length > 0 ? (
                    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                        {announcements.map(announcement => (
                            <AnnouncementListItemForStudent key={announcement.id} announcement={announcement} onClick={() => setSelectedAnnouncement(announcement)} />
                        ))}
                    </div>
                ) : (
                    // ✅ FIXED: Smaller text for empty state messages
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <MegaphoneIcon className="h-12 w-12 mb-3 text-gray-300 mx-auto" />
                        <p className="text-base font-medium text-gray-500">No announcements for this class.</p>
                        <p className="text-xs mt-1 text-gray-400">Important updates will appear here.</p>
                    </div>
                );
        }
    };

    return (
        <>
            {/* ✅ FIXED: Reduced padding for smaller screens */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/30 p-4 sm:p-5 rounded-2xl shadow-xl max-w-4xl mx-auto">
                <button
                    onClick={onBack}
                    // ✅ FIXED: Smaller font size for back button
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-3 font-semibold text-xs sm:text-sm"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to All Classes
                </button>
                {/* ✅ FIXED: Smaller, adaptive font sizes for titles */}
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">{selectedClass.name}</h1>
                <p className="text-sm sm:text-base text-gray-500 mb-4">{selectedClass.gradeLevel} - {selectedClass.section}</p>
                
                <div className="border-b border-gray-200 mb-4">
                    <div className="overflow-x-auto pb-2 -mb-2">
                        <nav className="flex space-x-2" style={{ minWidth: 'max-content' }}>
                            <button onClick={() => setActiveTab('announcements')} className={getTabClasses('announcements')}>
                                <MegaphoneIcon className="h-4 w-4" />
                                <span className="whitespace-nowrap">Announcements</span>
                            </button>
                            <button onClick={() => setActiveTab('lessons')} className={getTabClasses('lessons')}>
                                <BookOpenIcon className="h-4 w-4" />
                                <span className="whitespace-nowrap">Lessons</span>
                            </button>
                            <button onClick={() => setActiveTab('quizzes')} className={getTabClasses('quizzes')}>
                                <AcademicCapIcon className="h-4 w-4" />
                                <span className="whitespace-nowrap">Quizzes</span>
                            </button>
                        </nav>
                    </div>
                </div>
                <div className="py-2">{renderContent()}</div>
            </div>

            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />
            <ViewQuizModal isOpen={!!viewQuizData} onClose={() => setViewQuizData(null)} quiz={viewQuizData} userProfile={userProfile} classId={selectedClass.id} />
            <AnnouncementViewModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} />
        </>
    );
};

// Sub-components for list items
const LessonListItemForStudent = ({ lesson, onClick }) => (
    // ✅ FIXED: Reduced padding for list items
    <div className="group relative bg-gradient-to-br from-white to-sky-50 p-3 sm:p-4 rounded-xl shadow-md border border-sky-200 hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer flex items-center space-x-3 sm:space-x-4" onClick={onClick}>
        <div className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-sky-100 group-hover:bg-sky-200 transition-colors"><SparklesIcon className="h-5 w-5 text-sky-600" /></div>
        <div className="flex-1 min-w-0">
            {/* ✅ FIXED: Smaller, adaptive font size for titles */}
            <h3 className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-blue-800 transition-colors truncate">{lesson.title}</h3>
            {lesson.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1 sm:line-clamp-2">{lesson.description}</p>}
        </div>
        <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors"><ArrowRightIcon className="h-5 w-5" /></div>
    </div>
);
const QuizListItemForStudent = ({ quiz, onClick }) => (
    // ✅ FIXED: Reduced padding for list items
    <div className="group relative bg-gradient-to-br from-white to-purple-50 p-3 sm:p-4 rounded-xl shadow-md border border-purple-200 hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer flex items-center space-x-3 sm:space-x-4" onClick={onClick}>
        <div className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors"><AcademicCapIcon className="h-5 w-5 text-purple-600" /></div>
        <div className="flex-1 min-w-0">
            {/* ✅ FIXED: Smaller, adaptive font size for titles */}
            <h3 className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-purple-800 transition-colors truncate">{quiz.title}</h3>
            {quiz.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1 sm:line-clamp-2">{quiz.description}</p>}
        </div>
        <div className="flex-shrink-0 text-gray-400 group-hover:text-purple-500 transition-colors"><ArrowRightIcon className="h-5 w-5" /></div>
    </div>
);
const AnnouncementListItemForStudent = ({ announcement, onClick }) => {
    const formattedDate = announcement.createdAt?.toDate ? announcement.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    return (
        // ✅ FIXED: Reduced padding for list items
        <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-xl shadow-md border border-blue-200 hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer flex items-center space-x-3 sm:space-x-4" onClick={onClick}>
            <div className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors"><MegaphoneIcon className="h-5 w-5 text-blue-600" /></div>
            <div className="flex-1 min-w-0">
                 {/* ✅ FIXED: Smaller, adaptive font size for titles */}
                <h3 className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-blue-800 transition-colors line-clamp-2">{announcement.content}</h3>
                <p className="text-xs text-gray-500 mt-1">Posted on {formattedDate}</p>
            </div>
            <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors"><ArrowRightIcon className="h-5 w-5" /></div>
        </div>
    );
};

export default StudentClassDetailView;