import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where, documentId } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import ViewLessonModal from '../teacher/ViewLessonModal';
import ViewQuizModal from '../teacher/ViewQuizModal';
import { useAuth } from '../../contexts/AuthContext';

const StudentClassDetailView = ({ selectedClass, onBack }) => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('announcements');
    const [announcements, setAnnouncements] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null);

    const fetchData = useCallback(async () => {
        if (!selectedClass) return;
        setLoading(true);
        try {
            // Fetch Announcements for this specific class
            const annQuery = query(collection(db, "classAnnouncements"), where("classIds", "array-contains", selectedClass.id), orderBy("createdAt", "desc"));
            const annSnap = await getDocs(annQuery);
            setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Fetch Lessons & Quizzes from the class's "posts" subcollection
            const postsQuery = query(collection(db, `classes/${selectedClass.id}/posts`), orderBy('createdAt', 'desc'));
            const postsSnap = await getDocs(postsQuery);
            
            const lessonIdSet = new Set();
            const quizIdSet = new Set();
            postsSnap.forEach(doc => {
                const post = doc.data();
                if (post.lessonIds) post.lessonIds.forEach(id => lessonIdSet.add(id));
                if (post.quizIds) post.quizIds.forEach(id => quizIdSet.add(id));
            });

            const uniqueLessonIds = Array.from(lessonIdSet);
            const uniqueQuizIds = Array.from(quizIdSet);

            // Get lesson details
            if (uniqueLessonIds.length > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', uniqueLessonIds));
                const lessonsSnap = await getDocs(lessonsQuery);
                setLessons(lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                setLessons([]);
            }

            // Get quiz details
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
    }, [fetchData]);

    const renderContent = () => {
        if (loading) return <Spinner />;
        switch(activeTab) {
            case 'lessons':
                return lessons.length > 0 ? (
                    <ul className="space-y-3">{lessons.map(lesson => (<li key={lesson.id} onClick={() => setViewLessonData(lesson)} className="p-4 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors">{lesson.title}</li>))}</ul>
                ) : <p className="text-center p-8 text-gray-500">No lessons are available for this class yet.</p>;
            case 'quizzes':
                return quizzes.length > 0 ? (
                    <ul className="space-y-3">{quizzes.map(quiz => (<li key={quiz.id} onClick={() => setViewQuizData(quiz)} className="p-4 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors">{quiz.title}</li>))}</ul>
                ) : <p className="text-center p-8 text-gray-500">No quizzes are available for this class yet.</p>;
            case 'announcements':
            default:
                return announcements.length > 0 ? (
                     <div className="space-y-4">{announcements.map(post => (<div key={post.id} className="p-4 bg-white/80 rounded-lg shadow-sm border"><p className="whitespace-pre-wrap">{post.content}</p><div className="text-xs text-gray-400 mt-3 pt-2 border-t flex justify-between"><span>From: {post.teacherName}</span><span>{new Date(post.createdAt?.toDate()).toLocaleString()}</span></div></div>))}</div>
                ) : <p className="text-center p-8 text-gray-500">No announcements for this class.</p>;
        }
    }

    return (
        <>
            <div className="bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-lg">
                <button onClick={onBack} className="btn-secondary mb-4">← Back to All Classes</button>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{selectedClass.name}</h1>
                <p className="text-gray-600 mb-6">{selectedClass.gradeLevel} - {selectedClass.section}</p>
                
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-4 -mb-px">
                        <button onClick={() => setActiveTab('announcements')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'announcements' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Announcements</button>
                        <button onClick={() => setActiveTab('lessons')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'lessons' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Lessons</button>
                        <button onClick={() => setActiveTab('quizzes')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'quizzes' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Quizzes</button>
                    </nav>
                </div>
                <div className="py-6">
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
        </>
    );
};

export default StudentClassDetailView;