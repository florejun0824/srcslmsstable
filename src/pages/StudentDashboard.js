import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, documentId } from 'firebase/firestore';
import localforage from 'localforage';
import { syncOfflineSubmissions } from '../services/offlineSyncService';
import { useToast } from '../contexts/ToastContext';
import StudentDashboardUI from './StudentDashboardUI';
import JoinClassModal from '../components/student/JoinClassModal';
import ViewQuizModal from '../components/teacher/ViewQuizModal';
import ViewLessonModal from '../components/student/ViewLessonModal';
import Spinner from '../components/common/Spinner';

const StudentDashboard = () => {
    const { userProfile, logout, loading: authLoading } = useAuth();
    const [view, setView] = useState('classes');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isJoinClassModalOpen, setJoinClassModalOpen] = useState(false);
    const [myClasses, setMyClasses] = useState([]);
    const [isFetchingClasses, setIsFetchingClasses] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [quizzes, setQuizzes] = useState({ active: [], completed: [], overdue: [] });
    const [lessons, setLessons] = useState([]);
    const [units, setUnits] = useState([]);
    const [isFetchingUnits, setIsFetchingUnits] = useState(true);
    const [isFetchingContent, setIsFetchingContent] = useState(true);
    const [quizToTake, setQuizToTake] = useState(null);
    const [lessonToView, setLessonToView] = useState(null);
    const { showToast } = useToast();

    // Fetches student's classes (logic unchanged)
    useEffect(() => {
        if (authLoading || !userProfile?.id) {
            setIsFetchingClasses(false);
            return;
        }
        setIsFetchingClasses(true);
        const classesQuery = query(collection(db, "classes"), where("studentIds", "array-contains", userProfile.id));
        const unsubscribe = onSnapshot(classesQuery, async (snapshot) => {
            const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (classesData.length > 0) {
                const teacherIds = [...new Set(classesData.map(c => c.teacherId).filter(id => id))];
                if (teacherIds.length > 0) {
                    try {
                        const teachersQuery = query(collection(db, "users"), where(documentId(), "in", teacherIds));
                        const teachersSnapshot = await getDocs(teachersQuery);
                        const teacherNamesMap = {};
                        teachersSnapshot.forEach(doc => {
                            const teacherData = doc.data();
                            teacherNamesMap[doc.id] = `${teacherData.firstName} ${teacherData.lastName}`;
                        });
                        const augmentedClasses = classesData.map(c => ({
                            ...c,
                            teacherName: teacherNamesMap[c.teacherId] || 'N/A'
                        }));
                        setMyClasses(augmentedClasses);
                    } catch (error) {
                        console.error("Error fetching teacher names:", error);
                        setMyClasses(classesData);
                    }
                } else {
                    setMyClasses(classesData);
                }
            } else {
                setMyClasses([]);
            }
            setIsFetchingClasses(false);
        }, (error) => {
            console.error("Error fetching student classes:", error);
            setIsFetchingClasses(false);
        });
        return () => unsubscribe();
    }, [userProfile, authLoading]);

    // Fetches all units once (logic unchanged)
    useEffect(() => {
        const fetchUnits = async () => {
            try {
                setIsFetchingUnits(true);
                const q = query(collection(db, 'units'));
                const querySnapshot = await getDocs(q);
                const fetchedUnits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUnits(fetchedUnits);
            } catch (error) {
                console.error("Error fetching units:", error);
            } finally {
                setIsFetchingUnits(false);
            }
        };
        fetchUnits();
    }, []);
    
    // Download packet function (logic unchanged)
    const handleDownloadPacket = async (classId) => {
        showToast("Starting download... This may take a moment.", "info");
        try {
            const postsQuery = query(collection(db, `classes/${classId}/posts`));
            const postsSnapshot = await getDocs(postsQuery);
            const posts = postsSnapshot.docs.map(doc => doc.data());
            const lessonIds = [...new Set(posts.flatMap(p => p.lessonIds || []))];
            const quizIds = [...new Set(posts.flatMap(p => p.quizIds || []))];
            let lessonsData = [];
            let quizzesData = [];
            if (lessonIds.length > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', lessonIds));
                const lessonsSnapshot = await getDocs(lessonsQuery);
                lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            if (quizIds.length > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', quizIds));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                quizzesData = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            await localforage.setItem(`offline-lessons-${classId}`, lessonsData);
            await localforage.setItem(`offline-quizzes-${classId}`, quizzesData);
            showToast(`✅ Class content downloaded for offline use!`, "success");
        } catch (error) {
            console.error("Failed to download offline packet:", error);
            showToast("❌ Download failed. Please check your connection.", "error");
        }
    };
    
    // --- MODIFICATION: Fetch logic now fetches ALL content at once ---
    const fetchContent = useCallback(async () => {
        if (authLoading || !userProfile?.id) {
            setIsFetchingContent(false);
            return;
        }
        setIsFetchingContent(true);

        // Offline Path
        if (!navigator.onLine) {
            showToast("📶 You are offline. Showing downloaded content.", "info");
            try {
                let allOfflineLessons = [];
                let allOfflineQuizzes = { active: [], completed: [], overdue: [] };

                for (const c of myClasses) {
                    const classLessons = await localforage.getItem(`offline-lessons-${c.id}`) || [];
                    const classQuizzes = await localforage.getItem(`offline-quizzes-${c.id}`) || [];
                    allOfflineLessons.push(...classLessons.map(l => ({ ...l, className: c.name, classId: c.id })));
                    allOfflineQuizzes.active.push(...classQuizzes.map(q => ({ ...q, className: c.name, classId: c.id, status: 'active', attemptsTaken: 'N/A' })));
                }
                setLessons(allOfflineLessons);
                setQuizzes(allOfflineQuizzes);
            } catch (error) {
                console.error("Error loading offline content:", error);
                setLessons([]);
                setQuizzes({ active: [], completed: [], overdue: [] });
            } finally {
                setIsFetchingContent(false);
            }
            return;
        }
        
        // Online Path - Fetches both lessons and quizzes regardless of the current tab
        try {
            let allPostsSnapshots = [];
            if (myClasses.length > 0) {
                const allPostsPromises = myClasses.map(c => getDocs(query(collection(db, `classes/${c.id}/posts`))));
                allPostsSnapshots = await Promise.all(allPostsPromises);
            }

            const latestPostByQuizId = new Map();
            const latestPostByLessonId = new Map();

            allPostsSnapshots.forEach((postsSnapshot, index) => {
                const currentClass = myClasses[index];
                postsSnapshot.forEach(doc => {
                    const post = { id: doc.id, classId: currentClass.id, className: currentClass.name, ...doc.data() };
                    if (post.quizIds) post.quizIds.forEach(quizId => latestPostByQuizId.set(quizId, post));
                    if (post.lessonIds) post.lessonIds.forEach(lessonId => latestPostByLessonId.set(lessonId, post));
                });
            });

            // Fetch Quizzes logic
            const submissionsQuery = query(collection(db, "quizSubmissions"), where("studentId", "==", userProfile.id));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            const submissionsByQuizId = new Map();
            submissionsSnapshot.forEach(doc => {
                const sub = doc.data();
                const attempts = submissionsByQuizId.get(sub.quizId) || [];
                submissionsByQuizId.set(sub.quizId, [...attempts, sub]);
            });

            const uniqueQuizIds = Array.from(latestPostByQuizId.keys());
            let newCategorizedQuizzes = { active: [], completed: [], overdue: [] };
            if (uniqueQuizIds.length > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                const quizzesDetails = new Map(quizzesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
                const now = new Date();
                for (const [quizId, post] of latestPostByQuizId.entries()) {
                    const quizDetail = quizzesDetails.get(quizId);
                    if (!quizDetail) continue;
                    const submissions = submissionsByQuizId.get(quizId) || [];
                    const deadline = post.availableUntil?.toDate();
                    const isCompleted = submissions.length >= 3;
                    const isOverdue = deadline && now > deadline;
                    const quizItem = { ...quizDetail, className: post.className, classId: post.classId, postId: post.id, deadline, attemptsTaken: submissions.length };
                    if (isCompleted) newCategorizedQuizzes.completed.push(quizItem);
                    else if (isOverdue) newCategorizedQuizzes.overdue.push(quizItem);
                    else newCategorizedQuizzes.active.push(quizItem);
                }
            }
            setQuizzes(newCategorizedQuizzes);

            // Fetch Lessons logic
            const uniqueLessonIds = Array.from(latestPostByLessonId.keys());
            let newAllLessons = [];
            if (uniqueLessonIds.length > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', uniqueLessonIds));
                const lessonsSnapshot = await getDocs(lessonsQuery);
                const lessonsDetails = new Map(lessonsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
                for (const [lessonId, post] of latestPostByLessonId.entries()) {
                    const lessonDetail = lessonsDetails.get(lessonId);
                    if (lessonDetail) newAllLessons.push({ ...lessonDetail, className: post.className, classId: post.classId, postId: post.id });
                }
                newAllLessons.sort((a, b) => {
                    const orderA = a.order ?? Infinity;
                    const orderB = b.order ?? Infinity;
                    if (orderA !== orderB) return orderA - orderB;
                    const numA = parseInt(a.title.match(/\d+/)?.[0] || 0, 10);
                    const numB = parseInt(b.title.match(/\d+/)?.[0] || 0, 10);
                    return numA - numB;
                });
            }
            setLessons(newAllLessons);

        } catch (error) {
            console.error("Error fetching content:", error);
            setLessons([]);
            setQuizzes({ active: [], completed: [], overdue: [] });
        } finally {
            setIsFetchingContent(false);
        }
    }, [userProfile, myClasses, authLoading, showToast]);
    
    // Sync logic
    useEffect(() => {
        const attemptSync = () => {
            syncOfflineSubmissions().then(result => {
                if (result.syncedCount > 0) {
                    showToast(`🔄 Synced ${result.syncedCount} pending submission(s).`, "success");
                    fetchContent();
                }
            });
        };
        if (navigator.onLine) attemptSync();
        window.addEventListener('online', attemptSync);
        return () => window.removeEventListener('online', attemptSync);
    }, [fetchContent, showToast]);

    // --- MODIFICATION: This useEffect no longer depends on `view`. It runs once when classes are ready. ---
    useEffect(() => {
        if (!authLoading && !isFetchingClasses && myClasses.length >= 0) {
            fetchContent();
        }
    }, [myClasses, isFetchingClasses, authLoading, fetchContent]);

    useEffect(() => {
        if (view !== 'classes') {
            setSelectedClass(null);
        }
    }, [view]);

    const handleViewChange = (newView) => {
        setView(newView);
        setIsSidebarOpen(false);
    };

    const handleTakeQuizClick = (quiz) => {
        // --- MODIFICATION: Simplified logic for overdue quizzes ---
        const now = new Date();
        const isOverdue = quiz.deadline && now > quiz.deadline;
        if (isOverdue && !window.confirm("This is a late submission and your teacher will be notified. Continue?")) {
            return;
        }
        setQuizToTake(quiz);
    };

    if (authLoading) {
        return ( <div className="flex h-screen items-center justify-center bg-slate-50"> <Spinner /> </div> );
    }

    return (
        <>
            <StudentDashboardUI
                userProfile={userProfile}
                logout={logout}
                view={view}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                handleViewChange={handleViewChange}
                setJoinClassModalOpen={setJoinClassModalOpen}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                myClasses={myClasses}
                // --- MODIFICATION: Pass a single combined fetching state to the UI ---
                isFetching={isFetchingContent || isFetchingClasses || isFetchingUnits}
                lessons={lessons}
                units={units}
                setLessonToView={setLessonToView}
                quizzes={quizzes}
                handleTakeQuizClick={handleTakeQuizClick}
                handleDownloadPacket={handleDownloadPacket}
            />

            <JoinClassModal isOpen={isJoinClassModalOpen} onClose={() => setJoinClassModalOpen(false)} />

            <ViewQuizModal
                isOpen={!!quizToTake}
                onClose={() => {
                    setQuizToTake(null);
                    fetchContent(); // Re-fetch content after a quiz is taken
                }}
                quiz={quizToTake}
                userProfile={userProfile}
                classId={quizToTake?.classId}
            />
            <ViewLessonModal
                isOpen={!!lessonToView}
                onClose={() => setLessonToView(null)}
                lesson={lessonToView}
            />
        </>
    );
};

export default StudentDashboard;