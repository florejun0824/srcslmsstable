// src/pages/StudentDashboard.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import PublicProfilePage from './PublicProfilePage'; 
import { useStudentPosts } from '../hooks/useStudentPosts';
import StudentElectionTab from '../components/student/StudentElectionTab'; // Ensure imported

// Utility for debouncing real-time updates to prevent render trashing
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const StudentDashboard = () => {
  // --- AUTH & CONTEXT ---
  const { userProfile, logout, loading: authLoading, setUserProfile, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  
  // Stable ref for toast to use in async functions without adding dependencies
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const { handleGamificationUpdate } = useQuizGamification();
  const location = useLocation();
  const navigate = useNavigate();

  // --- ROUTING LOGIC ---
  const getActiveViewFromPath = (pathname) => {
    const pathSegment = pathname.substring('/student'.length).split('/')[1]; 

    if (pathSegment === 'profile' && pathname.substring('/student'.length).split('/')[2]) {
        return 'publicProfile';
    }

    switch (pathSegment) {
      case 'lounge': return 'lounge';
      case 'lessons': return 'lessons';
      case 'quizzes': return 'quizzes';
      case 'elections': return 'elections';
      case 'rewards': return 'rewards';
      case 'profile': return 'profile';
      default: return 'classes';
    }
  };

  const view = getActiveViewFromPath(location.pathname); 

  // --- STATE MANAGEMENT ---
  const [hasNewLessons, setHasNewLessons] = useState(false);
  const [hasNewQuizzes, setHasNewQuizzes] = useState(false);
  const [hasActiveElections, setHasActiveElections] = useState(false); // [NEW] Election Notification State
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isJoinClassModalOpen, setJoinClassModalOpen] = useState(false);
  
  // Data State
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  
  // Content State
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [quizzes, setQuizzes] = useState({ active: [], completed: [], overdue: [] });
  const [lessons, setLessons] = useState([]);
  const [units, setUnits] = useState([]);
  
  // Loading States
  const [isFetchingClasses, setIsFetchingClasses] = useState(true);
  const [isFetchingUnits, setIsFetchingUnits] = useState(true);
  const [isFetchingContent, setIsFetchingContent] = useState(true);
  
  // Active Interaction State
  const [quizToTake, setQuizToTake] = useState(null);
  const [lessonToView, setLessonToView] = useState(null);
  const isFirstContentLoad = useRef(true);

  // --- LOUNGE STATE ---
  const [loungePosts, setLoungePosts] = useState([]);
  const [isLoungeLoading, setIsLoungeLoading] = useState(true);
  const [loungeUsersMap, setLoungeUsersMap] = useState({});
  const [hasLoungeFetched, setHasLoungeFetched] = useState(false); 

  const loungePostUtils = useStudentPosts(loungePosts, setLoungePosts, userProfile?.id, showToast);
  
  // --- VIEW CHANGE HANDLER ---
  const handleViewChange = async (newView) => {
    const newTimestamp = new Date();
    let updateData = {};
    
    // Optimistic UI updates
    if (newView === 'lessons' && hasNewLessons) {
      setHasNewLessons(false); 
      updateData.lessonsLastSeen = newTimestamp; 
      setUserProfile(prev => ({ ...prev, lessonsLastSeen: newTimestamp })); 
    }
    if (newView === 'quizzes' && hasNewQuizzes) {
      setHasNewQuizzes(false); 
      updateData.quizzesLastSeen = newTimestamp; 
      setUserProfile(prev => ({ ...prev, quizzesLastSeen: newTimestamp })); 
    }
    // [NEW] Clear Election Notification
    if (newView === 'elections' && hasActiveElections) {
        // Optional: If you want to persist "last seen" for elections, you can add it here.
        // For now, we just keep the dot active if there is an active election, 
        // OR we can rely on userProfile.electionsLastSeen if implemented in backend.
    }

    // Background DB update
    if (Object.keys(updateData).length > 0 && userProfile?.id) {
      try {
        const userRef = doc(db, 'users', userProfile.id);
        updateDoc(userRef, updateData).catch(err => console.error("Failed to update lastSeen:", err));
      } catch (err) {
        console.error("Failed to update lastSeen timestamp:", err);
      }
    }

    if (newView === 'classes' || newView === 'default') {
      navigate('/student');
    } else {
      navigate(`/student/${newView}`);
    }
    setIsSidebarOpen(false); 
  };

  // --- [NEW] ELECTION NOTIFICATION LISTENER ---
  useEffect(() => {
    if (!userProfile?.id) return;

    // Listen only for ACTIVE elections to trigger the notification
    const q = query(
        collection(db, 'elections'), 
        where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const activeElections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter: Only show dot if the election applies to this student
        const relevantElections = activeElections.filter(e => {
            // 1. School Filter
            if (e.schoolId && userProfile.schoolId && e.schoolId !== userProfile.schoolId) {
                return false;
            }
            // 2. Grade Filter
            if (e.targetType === 'grade') {
                if (!userProfile.gradeLevel) return false; // Safety check
                if (String(e.targetGrade) !== String(userProfile.gradeLevel)) {
                    return false;
                }
            }
            return true;
        });

        setHasActiveElections(relevantElections.length > 0);
    }, (error) => {
        console.error("Error checking active elections:", error);
    });

    return () => unsubscribe();
  }, [userProfile?.schoolId, userProfile?.gradeLevel]);


  // --- PERMISSIONS / GAMIFICATION CHECK ---
  const checkAndApplyPermissions = useCallback(() => {
    if (!userProfile) return;

    const userRef = doc(db, 'users', userProfile.id);
    const updateData = {};
    let needsUpdate = false;

    // Cleanup old fields
    if (userProfile.hasOwnProperty('selectedBorder')) {
      updateData.selectedBorder = deleteField();
      needsUpdate = true;
    }
    if (userProfile.hasOwnProperty('selectedBackground')) {
      updateData.selectedBackground = deleteField();
      needsUpdate = true;
    }

    const currentLevel = userProfile.level || 1;

    // Iterate config to grant permissions
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
      updateDoc(userRef, updateData)
      .then(() => {
        refreshUserProfile();
      })
      .catch((err) => {
        console.error('Failed to update profile permissions:', err);
      });
    }
  }, [userProfile, refreshUserProfile]);

  const taskPerformed = useRef(false);
  useEffect(() => {
    if (userProfile && !taskPerformed.current) {
      taskPerformed.current = true;
      checkAndApplyPermissions();
    }
  }, [userProfile, checkAndApplyPermissions]);

  // --- LOUNGE USER MAPPING ---
  useEffect(() => {
    if (userProfile?.id) {
        setLoungeUsersMap(prev => {
            if (prev[userProfile.id]) return prev;
            return { ...prev, [userProfile.id]: userProfile };
        });
    }
  }, [userProfile]);

  // --- FETCH CLASSES ---
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
          
          // Batch fetch teacher details
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

  // --- FETCH UNITS ---
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

  // --- FETCH POSTS (OPTIMIZED) ---
  const fetchPosts = useCallback(async () => {
    if (authLoading || !userProfile?.id || myClasses.length === 0) {
      return []; 
    }
    
    let allPosts = [];
    try {
      const postPromises = myClasses.map(c =>
        getDocs(query(collection(db, `classes/${c.id}/posts`)))
          .then(snapshot => ({ status: 'fulfilled', classId: c.id, className: c.name, snapshot }))
          .catch(error => ({ status: 'rejected', classId: c.id, error }))
      );

      const results = await Promise.all(postPromises);
      const studentId = userProfile.id;
      
      results.forEach(res => {
        if (res.status === 'rejected') {
          console.warn(`Failed to fetch posts for class ${res.classId}`, res.error);
          return;
        }

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
      console.error("Critical error fetching posts:", err);
    }
    return allPosts;
  }, [authLoading, userProfile?.id, myClasses]);

  // --- LOUNGE: FETCH USERS ---
  const fetchMissingLoungeUsers = useCallback(async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter(id => !!id))];
    if (uniqueIds.length === 0) return;

    const usersToFetch = uniqueIds.filter(id => !loungeUsersMap[id]);
    if (usersToFetch.length === 0) return;
    
    try {
        for (let i = 0; i < usersToFetch.length; i += 30) {
            const chunk = usersToFetch.slice(i, i + 30);
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            const userSnap = await getDocs(usersQuery);
            const newUsers = {};
            userSnap.forEach(doc => {
                newUsers[doc.id] = doc.data();
            });
            setLoungeUsersMap(prev => ({ ...prev, ...newUsers }));
        }
    } catch (err) {
        console.error("Error fetching lounge users:", err);
    }
  }, [loungeUsersMap]); 

  // --- LOUNGE: FETCH POSTS ---
  const fetchLoungePosts = useCallback(async () => {
    if (!userProfile?.id || !userProfile?.schoolId) return;
    
    setIsLoungeLoading(true);
    
    try {
      const postsQuery = query(
        collection(db, 'studentPosts'),
        where('audience', '==', 'Public'),
        where('schoolId', '==', userProfile.schoolId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(postsQuery);
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLoungePosts(posts);

      const userIdsToFetch = new Set();
      posts.forEach(post => {
        userIdsToFetch.add(post.authorId);
        if (post.reactions) {
            Object.keys(post.reactions).forEach(userId => userIdsToFetch.add(userId));
        }
      });
      await fetchMissingLoungeUsers(Array.from(userIdsToFetch));

    } catch (error) {
      console.error("Error fetching public posts:", error);
      showToast("Could not load the Lounge feed.", "error");
    } finally {
      setIsLoungeLoading(false);
      setHasLoungeFetched(true); 
    }
  }, [userProfile?.id, userProfile?.schoolId, showToast, fetchMissingLoungeUsers]);

  const fetchContentRef = useRef();

  // --- MAIN CONTENT SYNC (LESSONS/QUIZZES) ---
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

      const allLessonsFromPosts = [];
      const allQuizzesFromPosts = [];

      for (const post of allPosts) {
        if (post.lessons && Array.isArray(post.lessons)) {
          post.lessons.forEach(lesson => {
            allLessonsFromPosts.push({ 
              ...lesson, 
              className: post.className, 
              classId: post.classId, 
              postId: post.id, 
              createdAt: post.createdAt 
            });
          });
        }
        if (post.quizzes && Array.isArray(post.quizzes)) {
          post.quizzes.forEach(quiz => {
            allQuizzesFromPosts.push({
              ...quiz, 
              className: post.className, 
              classId: post.classId, 
              postId: post.id, 
              postTitle: post.title, 
              postCreatedAt: post.createdAt,
              availableFrom: post.availableFrom, 
              availableUntil: post.availableUntil, 
              settings: post.quizSettings 
            });
          });
        }
      }

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
        showToastRef.current('Could not refresh content.', 'error'); 
      }
      setLessons([]);
      setAllQuizzes([]);
    } finally {
      if (!isBackgroundSync) {
        setIsFetchingContent(false);
      }
    }
  }, [authLoading, userProfile?.id, fetchPosts]); 

  // Keep ref up to date
  useEffect(() => {
    fetchContentRef.current = fetchContent;
  }, [fetchContent]);

  // --- INITIAL CONTENT LOAD ---
  useEffect(() => {
    if (!authLoading && !isFetchingClasses) {
      if (isFirstContentLoad.current) {
        fetchContent(false); 
        isFirstContentLoad.current = false;
      }
    }
  }, [authLoading, isFetchingClasses, myClasses, fetchContent]);

  // --- INITIAL LOUNGE LOAD ---
  useEffect(() => {
    if (view === 'lounge' && !hasLoungeFetched && userProfile?.id) {
        fetchLoungePosts();
    }
  }, [view, hasLoungeFetched, userProfile?.id, fetchLoungePosts]);

  // --- DEBOUNCED REAL-TIME LISTENERS ---
  useEffect(() => {
    if (authLoading || !userProfile?.id || myClasses.length === 0 || isFirstContentLoad.current) {
      return;
    }
    
    const shouldAutoSync = ['lessons', 'quizzes', 'classes', 'lounge'].includes(view);
    if (!shouldAutoSync) return;

    const debouncedRefresh = debounce(() => {
      if (fetchContentRef.current) fetchContentRef.current(true);
    }, 1000); 

    const listeners = myClasses.map(c => {
      const postsQuery = query(collection(db, `classes/${c.id}/posts`));
      
      const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        if (!snapshot.metadata.hasPendingWrites) {
            debouncedRefresh();
        }
      }, (error) => {
        console.error(`Listener error for class ${c.id}:`, error);
      });
      return unsubscribe;
    });

    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
    };
  }, [authLoading, userProfile?.id, myClasses, view]); 
  
  // --- NOTIFICATION DOTS CALCULATOR ---
  useEffect(() => {
    if (!userProfile || (lessons.length === 0 && allQuizzes.length === 0)) {
      return;
    }

    // Process Lessons
    if (lessons.length > 0) {
      let userLessonSeen = null;
      if (userProfile.lessonsLastSeen) {
        userLessonSeen = userProfile.lessonsLastSeen.toDate 
            ? userProfile.lessonsLastSeen.toDate()
            : userProfile.lessonsLastSeen;
      }
      const maxLessonDate = lessons.reduce((maxDate, lesson) => {
        const lessonDate = lesson.createdAt?.toDate ? lesson.createdAt.toDate() : new Date(0);
        return lessonDate > maxDate ? lessonDate : maxDate;
      }, new Date(0));

      if (!userLessonSeen || maxLessonDate > userLessonSeen) {
        if (view !== 'lessons') setHasNewLessons(true);
      }
    }

    // Process Quizzes
    if (allQuizzes.length > 0) {
      let userQuizSeen = null;
      if (userProfile.quizzesLastSeen) {
          userQuizSeen = userProfile.quizzesLastSeen.toDate
            ? userProfile.quizzesLastSeen.toDate()
            : userProfile.quizzesLastSeen;
      }
      const maxQuizDate = allQuizzes.reduce((maxDate, quiz) => {
        const quizDate = quiz.postCreatedAt?.toDate ? quiz.postCreatedAt.toDate() : new Date(0);
        return quizDate > maxDate ? quizDate : maxDate;
      }, new Date(0));

      if (!userQuizSeen || maxQuizDate > userQuizSeen) {
        if (view !== 'quizzes') setHasNewQuizzes(true);
      }
    }
  }, [lessons, allQuizzes, userProfile, view]); 

  // --- QUIZ CATEGORIZATION ---
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
        } else if (isOverdue) {
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
    const intervalId = setInterval(categorizeQuizzes, 30000); // Check every 30s
    return () => clearInterval(intervalId);
  }, [allQuizzes]);

  // --- UP NEXT TASK ---
  const upNextTask = useMemo(() => {
      // 1. Priority: Overdue Quizzes
      if (quizzes.overdue && quizzes.overdue.length > 0) {
        const urgent = quizzes.overdue[0];
        return {
           type: 'quiz',
           title: urgent.title || urgent.postTitle,
           dueDate: urgent.availableUntil?.toDate ? urgent.availableUntil.toDate() : new Date(),
           isOverdue: true
        };
      }

      // 2. Priority: Active Quizzes with Deadlines
      if (quizzes.active && quizzes.active.length > 0) {
         const activeWithDeadlines = quizzes.active.filter(q => q.availableUntil);
         
         // Sort by soonest deadline
         activeWithDeadlines.sort((a, b) => {
            const dateA = a.availableUntil?.toDate ? a.availableUntil.toDate() : new Date(a.availableUntil);
            const dateB = b.availableUntil?.toDate ? b.availableUntil.toDate() : new Date(b.availableUntil);
            return dateA - dateB;
         });
         
         if (activeWithDeadlines.length > 0) {
             const next = activeWithDeadlines[0];
             return {
                 type: 'quiz',
                 title: next.title || next.postTitle,
                 dueDate: next.availableUntil?.toDate ? next.availableUntil.toDate() : next.availableUntil,
                 id: next.id
             };
         }
         
         // 3. Fallback: Any Active Quiz
         const anyNext = quizzes.active[0];
         return {
             type: 'quiz',
             title: anyNext.title || anyNext.postTitle,
             dueDate: new Date(), 
             id: anyNext.id
         };
      }

      // 4. Priority: Recent Incomplete Lesson
      if (lessons && lessons.length > 0) {
          const completedIds = userProfile?.completedLessons || [];
          const incompleteLessons = lessons.filter(l => !completedIds.includes(l.id));
          
          if (incompleteLessons.length > 0) {
              // Sort by newest first
              incompleteLessons.sort((a, b) => {
                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                  return dateB - dateA;
              });
              
              const nextLesson = incompleteLessons[0];
              return {
                  type: 'lesson',
                  title: nextLesson.title,
                  dueDate: nextLesson.createdAt?.toDate ? nextLesson.createdAt.toDate() : new Date(),
                  id: nextLesson.id
              };
          }
      }
      return null;
  }, [quizzes, lessons, userProfile]);

  // --- INTERACTION HANDLERS ---
  const handleTakeQuizClick = useCallback(async (quiz) => {
    if (!quiz.postId || !quiz.classId) {
      showToastRef.current("Error: Missing quiz information.", "error"); 
      return;
    }
    try {
      const postRef = doc(db, `classes/${quiz.classId}/posts`, quiz.postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        showToastRef.current("Error: This quiz is no longer available.", "error"); 
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
      showToastRef.current("Could not load quiz. Please check your connection.", "error"); 
    }
  }, [fetchContent]);

  const handleQuizClose = useCallback(() => {
    setQuizToTake(null);
  }, []); 

  const handleQuizSubmit = useCallback(() => {
    fetchContent(false); 
    setQuizToTake(null);
  }, [fetchContent]);

  const handleLessonComplete = useCallback(async (progress) => {
    if (!progress?.isFinished || !userProfile?.id || !progress?.lessonId) return;
    
    const completedLessons = userProfile.completedLessons || [];
    if (completedLessons.includes(progress.lessonId)) {
      showToastRef.current('Lesson already completed.', 'info'); 
      return;
    }
    
    try {
      await handleGamificationUpdate({
          xpGained: XP_FOR_LESSON,
          userProfile,
          refreshUserProfile,
          showToast: showToastRef.current, 
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
      
      showToastRef.current(`Lesson finished! You earned ${XP_FOR_LESSON} XP!`, 'success'); 
    } catch (err) {
      console.error('Error awarding lesson XP:', err);
      showToastRef.current('An error occurred while saving your progress.', 'error'); 
    }
  }, [userProfile, refreshUserProfile, handleGamificationUpdate, setUserProfile]);


  // --- MAIN RENDER ---
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-black">
        <Spinner />
      </div>
    );
  }

  if (view === 'publicProfile') {
    return <PublicProfilePage />;
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
        hasNewLessons={hasNewLessons}
        hasNewQuizzes={hasNewQuizzes}
        hasActiveElections={hasActiveElections} // [NEW] Pass this prop
        upNextTask={upNextTask}
        // Lounge props
        isLoungeLoading={isLoungeLoading}
        loungePosts={loungePosts}
        loungeUsersMap={loungeUsersMap}
        fetchLoungePosts={fetchLoungePosts}
        loungePostUtils={loungePostUtils}
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