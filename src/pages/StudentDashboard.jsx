import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, documentId } from 'firebase/firestore';
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
                        const teachersQuery = query(collection(db, "users"), where(documentId(), "in", teacherIds.slice(0, 30)));
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
    
    const fetchContent = useCallback(async () => {
        if (authLoading || !userProfile?.id) {
            setIsFetchingContent(false);
            return;
        }
        setIsFetchingContent(true);
        
		try {
            let allPosts = [];
            if (myClasses.length > 0) {
                const postPromises = myClasses.map(c => 
                    getDocs(query(collection(db, `classes/${c.id}/posts`)))
                        .then(snapshot => ({
                            classId: c.id,
                            className: c.name,
                            snapshot
                        }))
                );
                const classPostResults = await Promise.all(postPromises);
                
                classPostResults.forEach(result => {
                    result.snapshot.forEach(doc => {
                        allPosts.push({
                            id: doc.id,
                            ...doc.data(),
                            className: result.className,
                            classId: result.classId,
                        });
                    });
                });
            }

            const allLessonsFromPosts = allPosts.flatMap(post =>
                (post.lessons || []).map(lesson => ({ ...lesson, className: post.className, classId: post.classId, postId: post.id }))
            );
            const allQuizzesFromPosts = allPosts.flatMap(post =>
                (post.quizzes || []).map(quiz => ({ ...quiz, className: post.className, classId: post.classId, postId: post.id, deadline: post.availableUntil?.toDate() }))
            );
            
		    const quizIds = allQuizzesFromPosts.map(q => q.id);
		    const submissionsByQuizId = new Map();
            
		    if (quizIds.length > 0) {
		        const chunks = [];
		        for (let i = 0; i < quizIds.length; i += 30) {
		            chunks.push(quizIds.slice(i, i + 30));
		        }
		        const submissionPromises = chunks.map(chunk =>
		            getDocs(query(collection(db, "quizSubmissions"), where("studentId", "==", userProfile.id), where("quizId", "in", chunk)))
		        );
		        const submissionSnapshots = await Promise.all(submissionPromises);
		        submissionSnapshots.forEach(snapshot => {
		            snapshot.forEach(doc => {
		                const sub = doc.data();
		                const attempts = submissionsByQuizId.get(sub.quizId) || [];
		                submissionsByQuizId.set(sub.quizId, [...attempts, sub]);
		            });
		        });
		    }

		    const categorizedQuizzes = { active: [], completed: [], overdue: [] };
		    const now = new Date();
		    allQuizzesFromPosts.forEach(quiz => {
		        const submissions = submissionsByQuizId.get(quiz.id) || [];
		        const isCompleted = submissions.length >= 3;
		        const isOverdue = quiz.deadline && now > quiz.deadline;
		        const quizItem = { ...quiz, attemptsTaken: submissions.length };

		        if (isCompleted) {
		            categorizedQuizzes.completed.push(quizItem);
		        } else if (isOverdue) {
		            categorizedQuizzes.overdue.push(quizItem);
		        } else {
		            categorizedQuizzes.active.push(quizItem);
		        }
		    });

		    setLessons(allLessonsFromPosts);
		    setQuizzes(categorizedQuizzes);

		} catch (error) {
		    console.error("Error fetching content:", error);
		    setLessons([]);
		    setQuizzes({ active: [], completed: [], overdue: [] });
		} finally {
		    setIsFetchingContent(false);
		}
	}, [userProfile, myClasses, authLoading]);
    
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
		const now = new Date();
		const isOverdue = quiz.deadline && now > quiz.deadline;
		if (isOverdue && !window.confirm("This is a late submission and your teacher will be notified. Continue?")) {
			return;
		}
		setQuizToTake(quiz);
	};
    
	const handleQuizSubmit = () => {
		if (!quizToTake) return;
		setQuizzes(prevQuizzes => {
			const newActive = prevQuizzes.active.filter(q => q.id !== quizToTake.id);
			const newOverdue = prevQuizzes.overdue.filter(q => q.id !== quizToTake.id);
			const newCompleted = [...prevQuizzes.completed.filter(q => q.id !== quizToTake.id)];
			const updatedQuiz = { ...quizToTake, attemptsTaken: quizToTake.attemptsTaken + 1 };

			if (updatedQuiz.attemptsTaken >= 3) {
				newCompleted.push(updatedQuiz);
			} else {
				newActive.push(updatedQuiz);
			}
			return { active: newActive, completed: newCompleted, overdue: newOverdue };
		});
		setQuizToTake(null);
	};
    
	const handleQuizClose = () => {
		setQuizToTake(null);
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
				isFetching={isFetchingContent || isFetchingClasses || isFetchingUnits}
				lessons={lessons}
				units={units}
				setLessonToView={setLessonToView}
				quizzes={quizzes}
				handleTakeQuizClick={handleTakeQuizClick}
			/>

			<JoinClassModal isOpen={isJoinClassModalOpen} onClose={() => setJoinClassModalOpen(false)} />

			<ViewQuizModal
				key={quizToTake ? `${quizToTake.id}-${quizToTake.attemptsTaken}` : 'no-quiz'}
				isOpen={!!quizToTake}
				onClose={handleQuizClose}
				onComplete={handleQuizSubmit}
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