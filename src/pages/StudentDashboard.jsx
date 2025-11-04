// src/StudentDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  documentId,
  doc,
  updateDoc,
  // increment, // No longer needed for lessons
  arrayUnion,
  orderBy,
  limit
} from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';

// --- MODIFIED: Import hook and lesson XP constant ---
import useQuizGamification from '../hooks/useQuizGamification'; // Adjust path if needed
import { XP_FOR_LESSON } from '../config/gameConfig'; // Adjust path if needed

import StudentDashboardUI from './StudentDashboardUI';
import JoinClassModal from '../components/student/JoinClassModal';
import ViewQuizModal from '../components/teacher/ViewQuizModal';
import StudentViewLessonModal from '../components/student/StudentViewLessonModal';
import Spinner from '../components/common/Spinner';

const StudentDashboard = () => {
  const { userProfile, logout, loading: authLoading, setUserProfile } = useAuth();
  const { showToast } = useToast();
  // --- ADDED: Initialize the gamification hook ---
  const { handleGamificationUpdate } = useQuizGamification();

  const location = useLocation();
  const navigate = useNavigate();

  // Helper to get the active view key from the URL pathname
  const getActiveViewFromPath = (pathname) => {
    // pathname will be like "/student", "/student/lessons", etc.
    const pathSegment = pathname.substring('/student'.length).split('/')[1]; // Get part after /student/
    switch (pathSegment) {
      case 'lessons':
        return 'lessons';
      case 'quizzes':
        return 'quizzes';
      case 'rewards':
        return 'rewards';
      case 'profile':
        return 'profile';
      default:
        // Default to 'classes' for "/student" or "/student/" (student dashboard home)
        return 'classes';
    }
  };

  // Derive view from URL
  const view = getActiveViewFromPath(location.pathname);

  // Updated handler to navigate instead of setting state
  const handleViewChange = (newView) => {
    // 'classes' is the student home route
    if (newView === 'classes' || newView === 'default') {
      navigate('/student');
    } else {
      navigate(`/student/${newView}`);
    }
    setIsSidebarOpen(false); // Close sidebar on mobile nav
  };

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isJoinClassModalOpen, setJoinClassModalOpen] = useState(false);

  // data state
  const [myClasses, setMyClasses] = useState([]);
  const [isFetchingClasses, setIsFetchingClasses] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [quizzes, setQuizzes] = useState({ active: [], completed: [], overdue: [] });
  const [lessons, setLessons] = useState([]);
  const [units, setUnits] = useState([]);
  const [isFetchingUnits, setIsFetchingUnits] = useState(true);
  const [isFetchingContent, setIsFetchingContent] = useState(true);
  const [quizToTake, setQuizToTake] = useState(null);
  const [lessonToView, setLessonToView] = useState(null);
  const isFirstContentLoad = useRef(true);

  //
  // 1) Listen for classes
  //
  useEffect(() => {
    if (authLoading || !userProfile?.id) {
      setIsFetchingClasses(false);
      return;
    }
    setIsFetchingClasses(true);
    const classesQuery = query(
      collection(db, 'classes'),
      where('studentIds', 'array-contains', userProfile.id)
    );
    const unsubscribe = onSnapshot(
      classesQuery,
      async (snapshot) => {
        try {
          const classesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (classesData.length === 0) {
            setMyClasses([]);
            setIsFetchingClasses(false);
            return;
          }
          const teacherIds = [...new Set(classesData.map(c => c.teacherId).filter(Boolean))];
          if (teacherIds.length > 0) {
            const batch = teacherIds.slice(0, 30);
            const teachersQuery = query(collection(db, 'users'), where(documentId(), 'in', batch));
            const teachersSnapshot = await getDocs(teachersQuery);
            const teacherNamesMap = {};
            teachersSnapshot.forEach(td => {
              const tdata = td.data();
              teacherNamesMap[td.id] = `${tdata.firstName || ''} ${tdata.lastName || ''}`.trim();
            });
            const augmented = classesData.map(c => ({
              ...c,
              teacherName: teacherNamesMap[c.teacherId] || 'N/A'
            }));
            setMyClasses(augmented);
          } else {
            setMyClasses(classesData);
          }
        } catch (err) {
          console.error('Error processing classes snapshot:', err);
          setMyClasses([]);
        } finally {
          setIsFetchingClasses(false);
        }
      },
      (error) => {
        console.error('Error fetching classes:', error);
        setIsFetchingClasses(false);
      }
    );
    return () => unsubscribe();
  }, [authLoading, userProfile?.id]);

  //
  // 2) Fetch units once
  //
  useEffect(() => {
    const fetchUnits = async () => {
      setIsFetchingUnits(true);
      try {
        const q = query(collection(db, 'units'));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUnits(items);
      } catch (err) {
        console.error('Error fetching units:', err);
        setUnits([]);
      } finally {
        setIsFetchingUnits(false);
      }
    };
    fetchUnits();
  }, []);

  //
  // 3a) Extracted post-fetching logic
  //
  const fetchPosts = useCallback(async () => {
    if (authLoading || !userProfile?.id || myClasses.length === 0) {
      return []; // Return empty array if not ready
    }
    
    let allPosts = [];
    try {
      const postPromises = myClasses.map(c =>
        getDocs(query(collection(db, `classes/${c.id}/posts`))).then(snapshot => ({
          classId: c.id,
          className: c.name,
          snapshot
        }))
      );
      const results = await Promise.all(postPromises);
      const studentId = userProfile.id;
      
      results.forEach(res => {
        res.snapshot.forEach(docSnap => {
          const post = { id: docSnap.id, ...docSnap.data(), className: res.className, classId: res.classId };
          const targetAudience = post.targetAudience;
          const targetStudentIds = post.targetStudentIds || [];
          let isRecipient = false;
          if (targetAudience === 'specific') {
            isRecipient = targetStudentIds.includes(studentId);
          } else {
            isRecipient = targetAudience !== 'specific' && (targetStudentIds.length === 0 || !targetAudience);
          }
          if (isRecipient) allPosts.push(post);
        });
      });
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
    return allPosts;
  }, [authLoading, userProfile?.id, myClasses]);

  //
  // 3b) This function is no longer needed, as fetchContent will be used for real-time.
  //
  const fetchLessonsOnly = useCallback(async () => {
    try {
      const allPosts = await fetchPosts();
      const allLessonsFromPosts = allPosts.flatMap(post =>
        (post.lessons || []).map(lesson => ({ ...lesson, className: post.className, classId: post.classId, postId: post.id, createdAt: post.createdAt }))
      );
      setLessons(allLessonsFromPosts);
      console.log('Background lesson sync complete.');
    } catch (err)
 {
      console.error('Error in background lesson fetch:', err);
    }
  }, [fetchPosts]);

  //
  // 3c) Refactored fetchContent (for manual refresh AND real-time)
  //
  const fetchContent = useCallback(async (isBackgroundSync = false) => {
    if (authLoading || !userProfile?.id) {
      if (!isBackgroundSync) setIsFetchingContent(false);
      return;
    }
    
    // Only show spinner for manual/initial load, not background syncs
    if (!isBackgroundSync) {
      setIsFetchingContent(true);
    }

    try {
      const allPosts = await fetchPosts();

      // Process Lessons
      const allLessonsFromPosts = allPosts.flatMap(post =>
        (post.lessons || []).map(lesson => ({ ...lesson, className: post.className, classId: post.classId, postId: post.id, createdAt: post.createdAt }))
      );
      
      // Process Quizzes
      const allQuizzesFromPosts = allPosts.flatMap(post =>
        (post.quizzes || []).map(quiz => ({ ...quiz, className: post.className, classId: post.classId, postId: post.id, availableFrom: post.availableFrom, availableUntil: post.availableUntil, settings: post.quizSettings }))
      );

      // Fetch Submissions
      const quizIds = allQuizzesFromPosts.map(q => q.id).filter(Boolean);
      const submissionsByQuizId = new Map();
      if (quizIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < quizIds.length; i += 30) chunks.push(quizIds.slice(i, i + 30));
        const submissionPromises = chunks.map(chunk =>
          getDocs(query(collection(db, 'quizSubmissions'), where('studentId', '==', userProfile.id), where('quizId', 'in', chunk)))
        );
        const submissionSnapshots = await Promise.all(submissionPromises);
        submissionSnapshots.forEach(snap => {
          snap.forEach(d => {
            const sub = d.data();
            const arr = submissionsByQuizId.get(sub.quizId) || [];
            arr.push(sub);
            submissionsByQuizId.set(sub.quizId, arr);
          });
        });
      }
      
      // Combine Quizzes with Submissions
      const quizzesWithDetails = allQuizzesFromPosts.map(q => {
        const subs = submissionsByQuizId.get(q.id) || [];
        return { ...q, attemptsTaken: subs.length };
      });
      
      // Set all state at the end
      setLessons(allLessonsFromPosts);
      setAllQuizzes(quizzesWithDetails);
      if (isBackgroundSync) {
        console.log('Background content sync complete.');
      }

    } catch (err) {
      console.error('Error in fetchContent:', err);
      if (!isBackgroundSync) {
        showToast('Could not refresh content.', 'error');
      }
      setLessons([]);
      setAllQuizzes([]);
    } finally {
      if (!isBackgroundSync) {
        setIsFetchingContent(false);
      }
    }
  }, [authLoading, userProfile?.id, fetchPosts, showToast]);

  //
  // 4) initial content load
  //
  useEffect(() => {
    if (!authLoading && !isFetchingClasses) {
      if (isFirstContentLoad.current) {
        fetchContent(false); // false = this is NOT a background sync
        isFirstContentLoad.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isFetchingClasses, myClasses]);

  //
  // 5) Real-time listener for ALL content (Lessons AND Quizzes)
  //
  // --- ADDED: Re-enabled listener with performance gate ---
  useEffect(() => {
    if (authLoading || !userProfile?.id || myClasses.length === 0 || isFirstContentLoad.current) {
      return;
    }

    // --- Performance Gate: Only sync if the user is actively viewing content tabs ---
    const shouldAutoSync = view === 'lessons' || view === 'quizzes';
    if (!shouldAutoSync) {
        // console.log('Skipping real-time sync: User not on content tab.');
        return;
    }
    // --- END Performance Gate ---

    console.log('Attaching real-time content listeners...');
    
    const listeners = myClasses.map(c => {
      const postsQuery = query(collection(db, `classes/${c.id}/posts`));
      
      const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        console.log(`Post update detected in class ${c.id}, refreshing all content...`);
        // Call the main fetchContent function, but as a background sync
        fetchContent(true); 
      }, (error) => {
        console.error(`Listener error for class ${c.id}:`, error);
      });
      
      return unsubscribe;
    });

    return () => {
      console.log('Cleaning up content listeners...');
      listeners.forEach(unsubscribe => unsubscribe());
    };
    
  }, [authLoading, userProfile?.id, myClasses, fetchContent, isFirstContentLoad.current, view]); 
  // --- END ADDED LISTENER ---

  //
  // 6) This effect is NO LONGER NEEDED and has been removed.
  //
  // useEffect(() => {
  //   if (view === 'quizzes') {
  //     fetchContent();
  //   }
  // }, [view, fetchContent]);

  //
  // 7) categorize quizzes
  //
  useEffect(() => {
    const categorizeQuizzes = () => {
      const now = new Date();
      const categorized = { active: [], completed: [], overdue: [] };
      allQuizzes.forEach(quizItem => {
        const maxAttempts = quizItem.settings?.maxAttempts ?? 3;
        const isExam = maxAttempts === 1;
        const attemptsTaken = quizItem.attemptsTaken ?? 0;
        const isCompleted = attemptsTaken >= maxAttempts;
        if (isCompleted) {
          categorized.completed.push({ ...quizItem, status: 'completed', isExam });
          return;
        }
        const availableFromDate = quizItem.availableFrom?.toDate ? quizItem.availableFrom.toDate() : (quizItem.availableFrom instanceof Date ? quizItem.availableFrom : null);
        const availableUntilDate = quizItem.availableUntil?.toDate ? quizItem.availableUntil.toDate() : (quizItem.availableUntil instanceof Date ? quizItem.availableUntil : null);
        const isScheduled = availableFromDate && availableFromDate > now;
        const isOverdue = availableUntilDate && now > availableUntilDate;
        if (isOverdue) {
          categorized.overdue.push({ ...quizItem, status: 'overdue', isExam });
        } else if (isScheduled) {
          categorized.active.push({ ...quizItem, status: 'active', isExam });
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

  //
  // handlers: quiz open/close/submit
  //
  const handleTakeQuizClick = (quiz) => setQuizToTake(quiz);
  const handleQuizClose = () => setQuizToTake(null);
  const handleQuizSubmit = () => {
    fetchContent(false); // Manually fetch after submit
    setQuizToTake(null);
  };

  //
  // 8) handleLessonComplete
  //
  // --- REPLACED THIS ENTIRE FUNCTION ---
  const handleLessonComplete = async (progress) => {
    if (!progress?.isFinished || !userProfile?.id || !progress?.lessonId) return;

    const completedLessons = userProfile.completedLessons || [];
    if (completedLessons.includes(progress.lessonId)) {
      showToast('Lesson already completed.', 'info');
      return;
    }

    try {
      // --- 1. Call the unified gamification hook ---
      // We pass 0 for quiz-specific fields
      await handleGamificationUpdate({
          xpGained: XP_FOR_LESSON,
          userProfile,
          refreshUserProfile,
          showToast,
          finalScore: 0, 
          totalPoints: 0,
          attemptsTaken: 0 
      });

      // --- 2. Update the lesson-specific part ---
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, {
          completedLessons: arrayUnion(progress.lessonId)
      });

      // --- 3. Manually update local profile for 'completedLessons' ---
      // (refreshUserProfile() will get the rest of the new data)
      setUserProfile(prev => prev ? ({
          ...prev,
          completedLessons: [...(prev.completedLessons || []), progress.lessonId]
      }) : prev);

      showToast(`Lesson finished! You earned ${XP_FOR_LESSON} XP!`, 'success');

    } catch (err) {
      console.error('Error awarding lesson XP:', err);
      showToast('An error occurred while saving your progress.', 'error');
    }
  };
  // --- END OF REPLACED FUNCTION ---

  //
  // UI guard
  //
  if (authLoading) {
    return (
      // --- MODIFIED: Added dark mode classes ---
      <div className="flex h-screen items-center justify-center bg-neumorphic-base dark:bg-neumorphic-base-dark">
        <Spinner />
      </div>
    );
  }

  //
  // Render
  //
  return (
    <>
      <StudentDashboardUI
        userProfile={userProfile}
        logout={logout}
        view={view}
        handleViewChange={handleViewChange}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
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
		    fetchContent={() => fetchContent(false)} // Pass fetchContent for manual refresh
      />

      {/* Modals */}
      <JoinClassModal
        isOpen={isJoinClassModalOpen}
        onClose={() => setJoinClassModalOpen(false)}
      />

      <ViewQuizModal
        key={quizToTake ? `${quizToTake.id}-${quizToTake.attemptsTaken}` : 'no-quiz'}
        isOpen={!!quizToTake}
        onClose={handleQuizClose}
        onComplete={handleQuizSubmit}
        quiz={quizToTake}
        userProfile={userProfile}
        classId={quizToTake?.classId}
		postId={quizToTake?.postId}
      />

      <StudentViewLessonModal
        isOpen={!!lessonToView}
        onClose={() => setLessonToView(null)}
        lesson={lessonToView}
        onComplete={handleLessonComplete}
        userId={userProfile?.id}
      />
    </>
  );
};

export default StudentDashboard;