import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, documentId } from 'firebase/firestore';

// Import the UI component and the generic Spinner
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
    // REMOVED: courses state
    const [units, setUnits] = useState([]); // NEW: State for units
    const [isFetchingUnits, setIsFetchingUnits] = useState(true); // NEW: State for fetching units
    const [isFetchingContent, setIsFetchingContent] = useState(true);
    const [activeQuizTab, setActiveQuizTab] = useState('active');
    const [quizToTake, setQuizToTake] = useState(null);
    const [lessonToView, setLessonToView] = useState(null);

    // Fetch the classes the student is enrolled in
    useEffect(() => {
        if (authLoading) return;

        if (!userProfile?.id) {
            setIsFetchingClasses(false);
            return;
        }
        setIsFetchingClasses(true);
        const classesQuery = query(collection(db, "classes"), where("studentIds", "array-contains", userProfile.id));
        const unsubscribe = onSnapshot(classesQuery, (snapshot) => {
            const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyClasses(classesData);
            setIsFetchingClasses(false);
        }, (error) => {
            console.error("Error fetching student classes:", error);
            setIsFetchingClasses(false);
        });
        return () => unsubscribe();
    }, [userProfile, authLoading]);

    // NEW: Fetch all units once
    useEffect(() => {
        const fetchUnits = async () => {
            try {
                setIsFetchingUnits(true);
                const q = query(collection(db, 'units'));
                const querySnapshot = await getDocs(q);
                const fetchedUnits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUnits(fetchedUnits);
                console.log("Fetched Units:", fetchedUnits);
            } catch (error) {
                console.error("Error fetching units:", error);
            } finally {
                setIsFetchingUnits(false);
            }
        };
        fetchUnits();
    }, []);


    // Fetch lessons or quizzes based on the current view
    const fetchContent = useCallback(async (currentView) => {
        if (authLoading) return;

        if (!userProfile?.id) {
            setIsFetchingContent(false);
            return;
        }
        setIsFetchingContent(true);

        setLessons([]);
        setQuizzes({ active: [], completed: [], overdue: [] });

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
                    if (post.quizIds) {
                        post.quizIds.forEach(quizId => {
                            const existingPost = latestPostByQuizId.get(quizId);
                            if (!existingPost || (post.createdAt && existingPost.createdAt && post.createdAt.toMillis() > existingPost.createdAt.toMillis())) {
                                latestPostByQuizId.set(quizId, post);
                            }
                        });
                    }
                    if (post.lessonIds) {
                        post.lessonIds.forEach(lessonId => {
                            const existingPost = latestPostByLessonId.get(lessonId);
                            if (!existingPost || (post.createdAt && existingPost.createdAt && post.createdAt.toMillis() > existingPost.createdAt.toMillis())) {
                                latestPostByLessonId.set(lessonId, post);
                            }
                        });
                    }
                });
            });

            if (currentView === 'quizzes') {
                const submissionsQuery = query(collection(db, "quizSubmissions"), where("studentId", "==", userProfile.id));
                const submissionsSnapshot = await getDocs(submissionsQuery);
                const submissionsByQuizId = new Map();
                submissionsSnapshot.forEach(doc => {
                    const sub = doc.data();
                    const attempts = submissionsByQuizId.get(sub.quizId) || [];
                    submissionsByQuizId.set(sub.quizId, [...attempts, sub]);
                });

                const uniqueQuizIds = Array.from(latestPostByQuizId.keys());
                if (uniqueQuizIds.length > 0) {
                    const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                    const quizzesSnapshot = await getDocs(quizzesQuery);
                    const quizzesDetails = new Map(quizzesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
                    const now = new Date();
                    const categorizedQuizzes = { active: [], completed: [], overdue: [] };

                    for (const [quizId, post] of latestPostByQuizId.entries()) {
                        const quizDetail = quizzesDetails.get(quizId);
                        if (!quizDetail) continue;

                        const submissions = submissionsByQuizId.get(quizId) || [];
                        const deadline = post.availableUntil?.toDate();
                        const isCompleted = submissions.length >= 3;
                        const isOverdue = deadline && now > deadline;

                        const quizItem = { ...quizDetail, className: post.className, classId: post.classId, postId: post.id, deadline, attemptsTaken: submissions.length };

                        if (isCompleted) {
                            categorizedQuizzes.completed.push(quizItem);
                        } else if (isOverdue) {
                            categorizedQuizzes.overdue.push(quizItem);
                        } else {
                            categorizedQuizzes.active.push(quizItem);
                        }
                    }
                    setQuizzes(categorizedQuizzes);
                }
            }

            if (currentView === 'lessons' || view === 'classes') {
                const uniqueLessonIds = Array.from(latestPostByLessonId.keys());
                if (uniqueLessonIds.length > 0) {
                    const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', uniqueLessonIds));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsDetails = new Map(lessonsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
                    const allLessons = [];
                    for (const [lessonId, post] of latestPostByLessonId.entries()) {
                        const lessonDetail = lessonsDetails.get(lessonId);
                        if (lessonDetail) {
                            allLessons.push({ ...lessonDetail, className: post.className, classId: post.classId, postId: post.id });
                        }
                    }

                    allLessons.sort((a, b) => {
                        const orderA = a.order ?? Infinity;
                        const orderB = b.order ?? Infinity;
                        if (orderA !== orderB) {
                            return orderA - orderB;
                        }

                        const numA = parseInt(a.title.match(/\d+/)?.[0] || 0, 10);
                        const numB = parseInt(b.title.match(/\d+/)?.[0] || 0, 10);
                        return numA - numB;
                    });

                    setLessons(allLessons);
                    console.log("Fetched Lessons (with className for grouping):", allLessons);
                } else {
                    setLessons([]);
                }
            }
        } catch (error) {
            console.error("Error fetching content:", error);
        } finally {
            setIsFetchingContent(false);
        }
    }, [userProfile, myClasses, authLoading, view]);

    // Re-fetch content when the view changes or classes are fetched/updated
    useEffect(() => {
        if (!authLoading && !isFetchingClasses && myClasses.length >= 0) {
            fetchContent(view);
        }
    }, [myClasses, isFetchingClasses, fetchContent, view, authLoading]);

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
        const showConfirmModal = (message, onConfirm) => {
            console.log(message);
            // Replace window.confirm with a custom modal for better UI/UX
            const userConfirmed = window.confirm(message); // Temporary: replace with custom modal
            if (userConfirmed) {
                onConfirm();
            }
        };

        if (activeQuizTab === 'overdue') {
            showConfirmModal("Late submission will be reflected on your teacher's end. Do you want to continue?", () => {
                setQuizToTake(quiz);
            });
        } else {
            setQuizToTake(quiz);
        }
    };

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner />
            </div>
        );
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
                isFetchingContent={isFetchingContent || isFetchingClasses}
                lessons={lessons}
                units={units} // NEW: Pass units
                isFetchingUnits={isFetchingUnits} // NEW: Pass isFetchingUnits
                setLessonToView={setLessonToView}
                quizzes={quizzes}
                activeQuizTab={activeQuizTab}
                setActiveQuizTab={setActiveQuizTab}
                handleTakeQuizClick={handleTakeQuizClick}
                authLoading={authLoading}
            />

            {/* Modals */}
            <JoinClassModal isOpen={isJoinClassModalOpen} onClose={() => setJoinClassModalOpen(false)} />

            <ViewQuizModal
                isOpen={!!quizToTake}
                onClose={() => {
                    setQuizToTake(null);
                    fetchContent(view);
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
