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
  arrayUnion,
  orderBy,
  limit,
  getDoc,
  deleteField 
} from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';

import useQuizGamification from '../hooks/useQuizGamification';
import { REWARDS_CONFIG, XP_FOR_LESSON } from '../config/gameConfig'; 

import StudentDashboardUI from './StudentDashboardUI';
import JoinClassModal from '../components/student/JoinClassModal';
import ViewQuizModal from '../components/teacher/ViewQuizModal';
import StudentViewLessonModal from '../components/student/StudentViewLessonModal';
import Spinner from '../components/common/Spinner';

const StudentDashboard = () => {
  const { userProfile, logout, loading: authLoading, setUserProfile, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  const { handleGamificationUpdate } = useQuizGamification();

  const location = useLocation();
  const navigate = useNavigate();

  // Helper to get the active view key from the URL pathname
  const getActiveViewFromPath = (pathname) => {
    const pathSegment = pathname.substring('/student'.length).split('/')[1]; 
    switch (pathSegment) {
      case 'lounge':
        return 'lounge';
      case 'lessons':
        return 'lessons';
      case 'quizzes':
        return 'quizzes';
      case 'rewards':
        return 'rewards';
      case 'profile':
        return 'profile';
      default:
        return 'classes';
    }
  };

  const view = getActiveViewFromPath(location.pathname); 

  // --- NEW: State for notifications ---
  const [hasNewLessons, setHasNewLessons] = useState(false);
  const [hasNewQuizzes, setHasNewQuizzes] = useState(false);

  // --- MODIFIED: handleViewChange ---
  const handleViewChange = async (newView) => {
    const newTimestamp = new Date();
    let updateData = {};

    // Check if we need to clear a notification
    if (newView === 'lessons' && hasNewLessons) {
      setHasNewLessons(false); // Clear locally
      updateData.lessonsLastSeen = newTimestamp; // Prepare Firestore update
      setUserProfile(prev => ({ ...prev, lessonsLastSeen: newTimestamp })); // Update local profile
    }
    if (newView === 'quizzes' && hasNewQuizzes) {
      setHasNewQuizzes(false); // Clear locally
      updateData.quizzesLastSeen = newTimestamp; // Prepare Firestore update
      setUserProfile(prev => ({ ...prev, quizzesLastSeen: newTimestamp })); // Update local profile
    }

    // Update Firestore in the background (1 write)
    if (Object.keys(updateData).length > 0 && userProfile?.id) {
      try {
        const userRef = doc(db, 'users', userProfile.id);
        await updateDoc(userRef, updateData);
      } catch (err) {
        console.error("Failed to update lastSeen timestamp:", err);
        // Note: We don't re-set the badge. It's cleared locally.
      }
    }

    // Navigate
    if (newView === 'classes' || newView === 'default') {
      navigate('/student');
    } else {
      navigate(`/student/${newView}`);
    }
    setIsSidebarOpen(false); 
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

  // (Maintenance task effect remains unchanged)
  const taskPerformed = useRef(false);
  useEffect(() => {
    if (userProfile && !taskPerformed.current) {
      console.log('Running user profile maintenance tasks...');
      taskPerformed.current = true;
      const userRef = doc(db, 'users', userProfile.id);
      const updateData = {};
      let needsUpdate = false;
      if (userProfile.hasOwnProperty('selectedBorder')) {
        updateData.selectedBorder = deleteField();
        needsUpdate = true;
      }
      if (userProfile.hasOwnProperty('selectedBackground')) {
        updateData.selectedBackground = deleteField();
        needsUpdate = true;
      }
      const currentLevel = userProfile.level || 1;
      for (const [rewardId, config] of Object.entries(REWARDS_CONFIG)) {
        if (config.type === 'feature' && currentLevel >= config.level) {
          switch (rewardId) {
            case 'feat_profile_picture':
              if (!userProfile.canUploadProfilePic) updateData.canUploadProfilePic = true;
              break;
            case 'feat_cover_photo':
              if (!userProfile.canUploadCover) updateData.canUploadCover = true;
              break;
            case 'canSetBio':
              if (!userProfile.canSetBio) updateData.canSetBio = true;
              break;
            case 'feat_update_info':
              if (!userProfile.canUpdateInfo) updateData.canUpdateInfo = true;
              break;
            case 'feat_create_post':
              if (!userProfile.canCreatePost) updateData.canCreatePost = true;
              break;
            case 'feat_reactions':
              if (!userProfile.canReact) updateData.canReact = true;
              break;
            case 'feat_profile_privacy':
              if (!userProfile.canSetPrivacy) updateData.canSetPrivacy = true;
              break;
            case 'feat_visit_profiles':
              if (!userProfile.canVisitProfiles) updateData.canVisitProfiles = true;
              break;
            case 'feat_photo_1':
              if (!userProfile.featuredPhotosSlots || userProfile.featuredPhotosSlots < 1) updateData.featuredPhotosSlots = 1;
              break;
            case 'feat_photo_2':
              if (!userProfile.featuredPhotosSlots || userProfile.featuredPhotosSlots < 2) updateData.featuredPhotosSlots = 2;
              break;
            case 'feat_photo_3':
              if (!userProfile.featuredPhotosSlots || userProfile.featuredPhotosSlots < 3) updateData.featuredPhotosSlots = 3;
              break;
            default:
              break;
          }
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log('Applying profile updates:', updateData);
        updateDoc(userRef, updateData)
        .then(() => {
          console.log('Profile maintenance complete. Refreshing profile...');
          refreshUserProfile();
        })
        .catch((err) => {
          console.error('Failed to update profile:', err);
          taskPerformed.current = false; 
        });
      } else {
        console.log('No profile maintenance needed.');
      }
    }
  }, [userProfile, refreshUserProfile]);

  // (Listen for classes remains unchanged)
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

  // (Fetch units remains unchanged)
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

  // (fetchPosts remains unchanged)
  const fetchPosts = useCallback(async () => {
    if (authLoading || !userProfile?.id || myClasses.length === 0) {
      return []; 
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
            isRecipient = targetAudience !== 'specific';
          }
          if (isRecipient) allPosts.push(post);
        });
      });
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
    return allPosts;
  }, [authLoading, userProfile?.id, myClasses]);

  // (fetchContent remains unchanged)
  const fetchContent = useCallback(async (isBackgroundSync = false) => {
    if (authLoading || !userProfile?.id) {
      if (!isBackgroundSync) setIsFetchingContent(false);
      return;
    }
    
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
        (post.quizzes || []).map(quiz => ({ 
          ...quiz, 
          className: post.className, 
          classId: post.classId, 
          postId: post.id, 
          postTitle: post.title, 
          postCreatedAt: post.createdAt, // This is the post's creation time
          availableFrom: post.availableFrom, 
          availableUntil: post.availableUntil, 
          settings: post.quizSettings 
        }))
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
        const relevantSubs = subs.filter(s => s.postId === q.postId);
        return { ...q, attemptsTaken: relevantSubs.length };
      });
      
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

  // (Initial content load effect remains unchanged)
  useEffect(() => {
    if (!authLoading && !isFetchingClasses) {
      if (isFirstContentLoad.current) {
        fetchContent(false); 
        isFirstContentLoad.current = false;
      }
    }
  }, [authLoading, isFetchingClasses, myClasses, fetchContent]);

  // (Real-time listener effect remains unchanged)
  useEffect(() => {
    if (authLoading || !userProfile?.id || myClasses.length === 0 || isFirstContentLoad.current) {
      return;
    }
    
    const shouldAutoSync = view === 'lessons' || view === 'quizzes' || view === 'classes' || view === 'lounge';
    if (!shouldAutoSync) {
        return;
    }

    console.log('Attaching real-time content listeners...');
    
    const listeners = myClasses.map(c => {
      const postsQuery = query(collection(db, `classes/${c.id}/posts`));
      
      const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        console.log(`Post update detected in class ${c.id}, refreshing all content...`);
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
    
  }, [authLoading, userProfile?.id, myClasses, fetchContent, isFirstContentLoad, view]); 

  
  // --- MODIFIED: Effect to check for new content ---
  useEffect(() => {
    if (!userProfile || (lessons.length === 0 && allQuizzes.length === 0)) {
      return; // Wait for user and content
    }

    // --- Check for New Lessons ---
    if (lessons.length > 0) {
      // --- FIX START: Handle both Timestamp and JS Date ---
      let userLessonSeen = null;
      if (userProfile.lessonsLastSeen) {
        userLessonSeen = userProfile.lessonsLastSeen.toDate 
            ? userProfile.lessonsLastSeen.toDate() // It's a Firestore Timestamp
            : userProfile.lessonsLastSeen;        // It's a JS Date
      }
      // --- FIX END ---
      
      // Find the newest lesson timestamp
      const maxLessonDate = lessons.reduce((maxDate, lesson) => {
        const lessonDate = lesson.createdAt?.toDate();
        return lessonDate > maxDate ? lessonDate : maxDate;
      }, new Date(0));

      if (!userLessonSeen || maxLessonDate > userLessonSeen) {
        // Only set to true if not already on the lessons tab
        if (view !== 'lessons') {
          setHasNewLessons(true);
        }
      }
    }

    // --- Check for New Quizzes ---
    if (allQuizzes.length > 0) {
      // --- FIX START: Handle both Timestamp and JS Date ---
      let userQuizSeen = null;
      if (userProfile.quizzesLastSeen) {
          userQuizSeen = userProfile.quizzesLastSeen.toDate
            ? userProfile.quizzesLastSeen.toDate() // It's a Firestore Timestamp
            : userProfile.quizzesLastSeen;        // It's a JS Date
      }
      // --- FIX END ---
      
      // Find the newest quiz timestamp
      const maxQuizDate = allQuizzes.reduce((maxDate, quiz) => {
        const quizDate = quiz.postCreatedAt?.toDate();
        return quizDate > maxDate ? quizDate : maxDate;
      }, new Date(0));
      
      if (!userQuizSeen || maxQuizDate > userQuizSeen) {
         // Only set to true if not already on the quizzes tab
        if (view !== 'quizzes') {
          setHasNewQuizzes(true);
        }
      }
    }
  // We run this when content changes, or when the user profile updates (e.g., on login)
  }, [lessons, allQuizzes, userProfile, view]); 


  // (Categorize quizzes effect remains unchanged)
  useEffect(() => {
    const categorizeQuizzes = () => {
      const now = new Date();
      const categorized = { active: [], completed: [], overdue: [] };
      allQuizzes.forEach(quizItem => {
        const maxAttempts = quizItem.settings?.maxAttempts ?? 3;
        const isExam = maxAttempts === 1;
        const attemptsTaken = quizItem.attemptsTaken ?? 0;
        const isCompleted = attemptsTaken >= maxAttempts;
        
        const availableFromDate = quizItem.availableFrom?.toDate ? quizItem.availableFrom.toDate() : (quizItem.availableFrom instanceof Date ? quizItem.availableFrom : null);
        const availableUntilDate = quizItem.availableUntil?.toDate ? quizItem.availableUntil.toDate() : (quizItem.availableUntil instanceof Date ? quizItem.availableUntil : null);

        const isScheduled = availableFromDate && availableFromDate > now;
        const isOverdue = availableUntilDate && now > availableUntilDate;

        if (isCompleted) {
          categorized.completed.push({ ...quizItem, status: 'completed', isExam });
          return;
        }
        
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

  // (All handlers: handleTakeQuizClick, handleQuizClose, handleQuizSubmit, handleLessonComplete... remain unchanged)
  const handleTakeQuizClick = async (quiz) => {
    if (!quiz.postId || !quiz.classId) {
      showToast("Error: Missing quiz information.", "error");
      return;
    }
    try {
      const postRef = doc(db, `classes/${quiz.classId}/posts`, quiz.postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        showToast("Error: This quiz is no longer available.", "error");
        fetchContent(false);
        return;
      }
      const postData = postSnap.data();
      const quizWithFreshSettings = {
        ...quiz, 
        settings: postData.quizSettings, 
        availableFrom: postData.availableFrom, 
        availableUntil: postData.availableUntil 
      };
      setQuizToTake(quizWithFreshSettings);
    } catch (err) {
      console.error("Error fetching fresh quiz settings:", err);
      showToast("Could not load quiz. Please check your connection and try again.", "error");
    }
  };
  const handleQuizClose = () => setQuizToTake(null);
  const handleQuizSubmit = () => {
    fetchContent(false); 
    setQuizToTake(null);
  };
  const handleLessonComplete = async (progress) => {
    if (!progress?.isFinished || !userProfile?.id || !progress?.lessonId) return;
    const completedLessons = userProfile.completedLessons || [];
    if (completedLessons.includes(progress.lessonId)) {
      showToast('Lesson already completed.', 'info');
      return;
    }
    try {
      await handleGamificationUpdate({
          xpGained: XP_FOR_LESSON,
          userProfile,
          refreshUserProfile,
          showToast,
          finalScore: 0, 
          totalPoints: 0,
          attemptsTaken: 0 
      });
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, {
          completedLessons: arrayUnion(progress.lessonId)
      });
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


  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neumorphic-base dark:bg-neumorphic-base-dark">
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
		    fetchContent={() => fetchContent(false)} 
        
        // --- NEW: Pass notification state to the UI ---
        hasNewLessons={hasNewLessons}
        hasNewQuizzes={hasNewQuizzes}
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
        isTeacherView={userProfile?.role === 'teacher' || userProfile?.role ==='admin'}
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