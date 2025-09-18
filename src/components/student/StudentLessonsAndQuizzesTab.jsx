import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import StudentLessonDetailModal from './StudentLessonDetailModal';
import QuizInterface from './QuizInterface';

const StudentLessonsAndQuizzesTab = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('active');
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewedLessons, setViewedLessons] = useState(new Set());
    const [quizSubmissions, setQuizSubmissions] = useState(new Map());
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [isLessonDetailOpen, setLessonDetailOpen] = useState(false);
    const [selectedLessonForDetail, setSelectedLessonForDetail] = useState(null);

    const fetchAllContent = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const classesQuery = query(collection(db, "classes"), where("students", "array-contains", user.id));
            const classesSnapshot = await getDocs(classesQuery);
            const enrolledClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (enrolledClasses.length === 0) {
                setLoading(false);
                return;
            }

            const coursesSnapshot = await getDocs(collection(db, "courses"));
            const coursesMap = new Map(coursesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));

            const viewRecordsQuery = query(collection(db, "viewRecords"), where("studentId", "==", user.id));
            const viewRecordsSnap = await getDocs(viewRecordsQuery);
            const viewedLessonIds = new Set(viewRecordsSnap.docs.map(doc => doc.data().lessonId));
            setViewedLessons(viewedLessonIds);

            const submissionsQuery = query(collection(db, "submissions"), where("studentId", "==", user.id));
            const submissionsSnap = await getDocs(submissionsQuery);
            const submissionsMap = new Map();
            submissionsSnap.docs.forEach(doc => {
                const sub = doc.data();
                const existing = submissionsMap.get(sub.quizId) || [];
                submissionsMap.set(sub.quizId, [...existing, sub]);
            });
            setQuizSubmissions(submissionsMap);

            let tempItems = [];
            const now = new Date();
            enrolledClasses.forEach(c => {
                const courseAccess = c.courseAccess || {};
                for (const courseId in courseAccess) {
                    const course = coursesMap.get(courseId);
                    if (!course) continue;
                    for (const unitId in courseAccess[courseId].units) {
                        const unit = course.units.find(u => u.id === unitId);
                        if (!unit) continue;
                        for (const lessonId in courseAccess[courseId].units[unitId].lessons) {
                            const lessonAccess = courseAccess[courseId].units[unitId].lessons[lessonId];
                            const lesson = unit.lessons.find(l => l.id === lessonId);
                            if (!lesson) continue;
                            
                            const deadline = lessonAccess.availableUntil.toDate();
                            const isOverdue = now > deadline;
                            
                            tempItems.push({ type: 'lesson', ...lesson, courseId: course.id, classId: c.id, className: c.name, courseTitle: course.title, unitTitle: unit.title, deadline, isOverdue });
                            
                            lesson.quizzes?.forEach(quiz => {
                                if (lessonAccess.quizzes?.includes(quiz.id)) {
                                    tempItems.push({ type: 'quiz', ...quiz, courseId: course.id, lessonId: lesson.id, unitId: unit.id, lessonTitle: lesson.title, className: c.name, courseTitle: course.title, deadline, isOverdue });
                                }
                            });
                        }
                    }
                }
            });
            setAllItems(tempItems);
        } catch (error) {
            console.error("Failed to fetch content:", error);
            showToast("Could not load assignments.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchAllContent();
    }, [fetchAllContent]);

    const handleLessonClick = async (lesson) => {
        const recordId = `${user.id}_${lesson.id}`;
        const recordRef = doc(db, "viewRecords", recordId);
        await setDoc(recordRef, { studentId: user.id, classId: lesson.classId, courseId: lesson.courseId, lessonId: lesson.id, viewedAt: new Date() });
        
        setSelectedLessonForDetail(lesson);
        setLessonDetailOpen(true);
        setViewedLessons(prev => new Set(prev).add(lesson.id));
    };

    const handleQuizSubmit = async (answers, isLate) => {
        try {
            const quiz = activeQuiz;
            let score = 0;
            quiz.questions.forEach((q, index) => {
                if (q.correctOption === answers[index]) score++;
            });
            const totalQuestions = quiz.questions.length;
            const percentage = (score / totalQuestions) * 100;
            
            const submissionData = {
                studentId: user.id,
                courseId: quiz.courseId,
                quizId: quiz.id,
                answers,
                score,
                totalQuestions,
                percentage,
                submittedAt: new Date(),
                submissionType: isLate ? 'late' : 'on-time'
            };

            await addDoc(collection(db, "submissions"), submissionData);
            showToast(`Quiz submitted! Score: ${score}/${totalQuestions}`);
            
            // Refresh all content to get the latest submission status
            fetchAllContent();
            setActiveQuiz(null);
        } catch (error) {
            showToast(error.message, 'error');
            setActiveQuiz(null);
        }
    };

    const getAttemptsCount = (quizId) => quizSubmissions.get(quizId)?.length || 0;

    const isCompleted = (item) => {
        if (item.type === 'lesson') {
            return viewedLessons.has(item.id);
        }
        if (item.type === 'quiz') {
            return getAttemptsCount(item.id) >= 3;
        }
        return false;
    };

    const activeItems = allItems.filter(item => !isCompleted(item) && !item.isOverdue);
    const completedItems = allItems.filter(item => isCompleted(item));
    const overdueItems = allItems.filter(item => !isCompleted(item) && item.isOverdue);

    if (loading) return <Spinner />;

    if (activeQuiz) {
        return <QuizInterface quiz={activeQuiz} onSubmit={handleQuizSubmit} onBack={() => setActiveQuiz(null)} />
    }

    const renderItems = (items) => {
        if (items.length === 0) {
            return <div className="text-gray-600 text-center py-8 bg-white/60 backdrop-blur-md rounded-lg shadow-md border border-white/30">No items in this category.</div>;
        }
        return items.map((item, index) => {
            const attempts = item.type === 'quiz' ? getAttemptsCount(item.id) : 0;
            const maxAttemptsReached = attempts >= 3;

            return (
                <div key={`${item.id}-${index}`} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md mb-4 border border-white/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`font-bold text-lg ${item.type === 'quiz' ? 'text-purple-700' : 'text-blue-700'}`}>{item.title}</p>
                            <p className="text-sm text-gray-600">{item.courseTitle} / {item.unitTitle || item.lessonTitle}</p>
                            <p className="text-xs text-gray-500">Class: {item.className}</p>
                        </div>
                        {item.type === 'lesson' ? (
                            <button onClick={() => handleLessonClick(item)} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm shadow hover:bg-blue-600 transition">View</button>
                        ) : (
                            <button 
                                onClick={() => setActiveQuiz({...item, isLate: item.isOverdue})} 
                                className={`px-4 py-2 rounded-lg text-sm shadow transition ${maxAttemptsReached ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-purple-500 text-white hover:bg-purple-600'}`}
                                disabled={maxAttemptsReached}
                            >
                                {maxAttemptsReached ? 'Completed' : 'Take Quiz'} ({attempts}/3)
                            </button>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">Due: {item.deadline.toLocaleString()}</div>
                </div>
            );
        });
    };

    return (
        <div>
            <div className="flex border-b border-gray-200 mb-4 bg-white/60 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden p-1">
                <button onClick={() => setActiveTab('active')} className={`py-2 px-4 flex-1 text-center font-semibold rounded-lg transition-colors ${activeTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Active</button>
                <button onClick={() => setActiveTab('completed')} className={`py-2 px-4 flex-1 text-center font-semibold rounded-lg transition-colors ${activeTab === 'completed' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Completed</button>
                <button onClick={() => setActiveTab('overdue')} className={`py-2 px-4 flex-1 text-center font-semibold rounded-lg transition-colors ${activeTab === 'overdue' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Overdue</button>
            </div>
            
            <div>
                {activeTab === 'active' && renderItems(activeItems)}
                {activeTab === 'completed' && renderItems(completedItems)}
                {activeTab === 'overdue' && renderItems(overdueItems)}
            </div>

            {isLessonDetailOpen && (
                <StudentLessonDetailModal 
                    isOpen={isLessonDetailOpen} 
                    onClose={() => setLessonDetailOpen(false)} 
                    lesson={selectedLessonForDetail} 
                    onTakeQuiz={(quiz) => {
                        setActiveQuiz({...quiz, isLate: selectedLessonForDetail.isOverdue, courseId: selectedLessonForDetail.courseId});
                        setLessonDetailOpen(false)
                    }} 
                    hasTakenQuiz={(quizId) => getAttemptsCount(quizId) >= 3} 
                    getAttemptsCount={getAttemptsCount}
                />
            )}
        </div>
    );
};

export default StudentLessonsAndQuizzesTab;