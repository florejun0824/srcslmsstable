// src/StudentDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, documentId } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';

import StudentDashboardUI from './StudentDashboardUI';
// ... (other imports are unchanged) ...
import JoinClassModal from '../components/student/JoinClassModal';
import ViewQuizModal from '../components/teacher/ViewQuizModal';
import ViewLessonModal from '../components/student/ViewLessonModal';
import Spinner from '../components/common/Spinner';

const StudentDashboard = () => {
    // ... (state and auth setup is unchanged) ...
    const { userProfile, logout, loading: authLoading } = useAuth();
    const [view, setView] = useState('classes');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isJoinClassModalOpen, setJoinClassModalOpen] = useState(false);
    const [myClasses, setMyClasses] = useState([]);
    const [isFetchingClasses, setIsFetchingClasses] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [allQuizzes, setAllQuizzes] = useState([]); // Holds all quizzes before categorization
    const [quizzes, setQuizzes] = useState({ active: [], completed: [], overdue: [] }); // For UI
    const [lessons, setLessons] = useState([]);
    const [units, setUnits] = useState([]);
    const [isFetchingUnits, setIsFetchingUnits] = useState(true);
    const [isFetchingContent, setIsFetchingContent] = useState(true);
    const [quizToTake, setQuizToTake] = useState(null);
    const [lessonToView, setLessonToView] = useState(null);
    const { showToast } = useToast();

    // ... (useEffect for classes is unchanged) ...
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

    // ... (useEffect for units is unchanged) ...
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
                
                const studentId = userProfile.id; // Get student ID once

                classPostResults.forEach(result => {
                    result.snapshot.forEach(doc => {
                        const post = {
                            id: doc.id,
                            ...doc.data(),
                            className: result.className,
                            classId: result.classId,
                        };

                        // --- CRITICAL FILTERING LOGIC ---
                        const targetAudience = post.targetAudience;
                        const targetStudentIds = post.targetStudentIds || [];
                        
                        let isRecipient = false;

                        // Because the teacher app is now explicitly saving the IDs (targetAudience: "specific")
                        // we must strictly check if the student's ID is in that list.
                        if (targetAudience === 'specific') {
                            isRecipient = targetStudentIds.includes(studentId);
                        } else {
                            // If targetAudience is not 'specific' (e.g., old post or "all"), 
                            // and the targetStudentIds array is empty (meaning everyone), 
                            // assume the student is included. This is the fallback for old/non-specific posts.
                            // NOTE: If targetAudience is undefined or "all", we assume inclusion.
                            isRecipient = targetAudience !== 'specific' && targetStudentIds.length === 0;
                            
                            // This part ensures that if a post is missing the new fields, it still shows up
                            if (!targetAudience && !post.lessons && !post.quizzes) {
                                // If it's a generic announcement (no content), show it.
                                isRecipient = true;
                            }
                        }

                        if (isRecipient) {
                            allPosts.push(post);
                        }
                        // --- END CRITICAL FILTERING LOGIC ---
                    });
                });
            }

            const allLessonsFromPosts = allPosts.flatMap(post =>
                (post.lessons || []).map(lesson => ({ ...lesson, className: post.className, classId: post.classId, postId: post.id }))
            );
            
            const allQuizzesFromPosts = allPosts.flatMap(post =>
                (post.quizzes || []).map(quiz => ({
                    ...quiz,
                    className: post.className,
                    classId: post.classId,
                    postId: post.id,
                    availableFrom: post.availableFrom,
                    availableUntil: post.availableUntil,
                    settings: post.quizSettings
                }))
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

            const quizzesWithDetails = allQuizzesFromPosts.map(quiz => {
                const submissions = submissionsByQuizId.get(quiz.id) || [];
                return { ...quiz, attemptsTaken: submissions.length };
            });

		    setAllQuizzes(quizzesWithDetails);
		    setLessons(allLessonsFromPosts);

		} catch (error) {
		    console.error("Error fetching content:", error);
		    setLessons([]);
		    setAllQuizzes([]);
		} finally {
		    setIsFetchingContent(false);
		}
	}, [userProfile, myClasses, authLoading]);

    // ... (useEffect for categorizing quizzes is unchanged) ...
    useEffect(() => {
        const categorizeQuizzes = () => {
            const now = new Date();
            const categorized = { active: [], completed: [], overdue: [] };

            allQuizzes.forEach(quizItem => {
                // MODIFICATION: Get maxAttempts and determine if it's an exam
                const maxAttempts = quizItem.settings?.maxAttempts ?? 3;
                const isExam = maxAttempts === 1;
                const isCompleted = quizItem.attemptsTaken >= maxAttempts;

                if (isCompleted) {
                    categorized.completed.push({ ...quizItem, status: 'completed', isExam });
                    return;
                }

                const availableFromDate = quizItem.availableFrom?.toDate();
                const availableUntilDate = quizItem.availableUntil?.toDate();
                
                const isScheduled = availableFromDate && availableFromDate > now;
                const isOverdue = availableUntilDate && now > availableUntilDate;

                // MODIFICATION: Add isExam flag to all categories
                if (isOverdue) {
                    categorized.overdue.push({ ...quizItem, status: 'overdue', isExam });
                } else if (isScheduled) {
                    categorized.active.push({ ...quizItem, status: 'scheduled', isExam });
                } else {
                    categorized.active.push({ ...quizItem, status: 'active', isExam });
                }
            });
            setQuizzes(categorized);
        };

        categorizeQuizzes();
        const intervalId = setInterval(categorizeQuizzes, 30000);
        return () => clearInterval(intervalId);
    }, [allQuizzes]);
    
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
		setQuizToTake(quiz);
	};
    
	const handleQuizSubmit = () => {
		if (!quizToTake) return;
        fetchContent();
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