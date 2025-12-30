// src/pages/TeacherDashboard.jsx
import React, { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, DEFAULT_SCHOOL_ID } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  addDoc, serverTimestamp, collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDocs, writeBatch,
  runTransaction, documentId
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { callGeminiWithLimitCheck, callChatbotAi } from '../services/aiService';
import { createPresentationFromData } from '../services/googleSlidesService';
import TeacherDashboardLayout from '../components/teacher/TeacherDashboardLayout';
import GlobalAiSpinner from '../components/common/GlobalAiSpinner';
import PublicProfilePage from './PublicProfilePage'; 

import { ConfirmActionModal } from './AdminDashboard'; 

import { useStudentPosts } from '../hooks/useStudentPosts'; 

const PresentationPreviewModal = lazy(() => import('../components/teacher/PresentationPreviewModal'));
const BetaWarningModal = lazy(() => import('../components/teacher/BetaWarningModal'));
const ViewLessonModal = lazy(() => import('../components/teacher/ViewLessonModal'));

// Helper function to format the notes object into a readable string
const formatNotesToString = (notesObject) => {
    if (!notesObject || typeof notesObject !== 'object') {
        return "No speaker notes available.";
    }
    const { talkingPoints, interactiveElement, slideTiming } = notesObject;
    let formattedString = `[TALKING POINTS]\n${talkingPoints || 'N/A'}\n\n`;
    formattedString += `[INTERACTIVE ELEMENT]\n${interactiveElement || 'N/A'}\n\n`;
    formattedString += `[SUGGESTED TIMING: ${slideTiming || 'N/A'}]`;
    return formattedString;
};

const TeacherDashboard = () => {
  const { user, userProfile, logout, firestoreService, refreshUserProfile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveViewFromPath = useCallback((pathname) => {
    const pathSegment = pathname.substring('/dashboard'.length).split('/')[1]; 
    if (pathSegment === 'profile' && pathname.substring('/dashboard'.length).split('/')[2]) {
        return 'publicProfile';
    }
    switch (pathSegment) {
      case 'lounge': return 'lounge';
      case 'studentManagement': return 'studentManagement';
      case 'classes': return 'classes';
      case 'courses': return 'courses';
      case 'analytics': return 'analytics';
      case 'profile': return 'profile';
      case 'admin': return 'admin';
      default: return 'home'; 
    }
  }, []);

  const activeView = getActiveViewFromPath(location.pathname);

  const handleViewChange = useCallback((view) => {
    if (view === 'home') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${view}`);
    }
    setIsSidebarOpen(false);
  }, [navigate]);

  // State
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseCategories, setCourseCategories] = useState([]);
  const [teacherAnnouncements, setTeacherAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeUnit, setActiveUnit] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [classToEdit, setClassToEdit] = useState(null);
  const [classOverviewModal, setClassOverviewModal] = useState({ isOpen: false, data: null });
  const [isCreateClassModalOpen, setCreateClassModalOpen] = useState(false);
  const [isCreateCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [isCreateCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setEditCategoryModalOpen] = useState(false);
  const [isEditClassModalOpen, setEditClassModalOpen] = useState(false);
  const [isAddUnitModalOpen, setAddUnitModalOpen] = useState(false);
  const [isShareContentModalOpen, setShareContentModalOpen] = useState(false);
  const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
  const [viewLessonModalOpen, setViewLessonModalOpen] = useState(false);
  const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
  const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
  const [deleteUnitModalOpen, setDeleteUnitModalOpen] = useState(false);
  const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [isHoveringActions, setIsHoveringActions] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editingAnnText, setEditingAnnText] = useState('');
  const [importClassSearchTerm, setImportClassSearchTerm] = useState('');
  const [allLmsClasses, setAllLmsClasses] = useState([]);
  const [selectedClassForImport, setSelectedClassForImport] = useState(null);
  const [studentsToImport, setStudentsToImport] = useState(new Set());
  const [importTargetClassId, setImportTargetClassId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isImportViewLoading, setIsImportViewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [subjectToActOn, setSubjectToActOn] = useState(null);
  const [isEditSubjectModalOpen, setEditSubjectModalOpen] = useState(false);
  const [isDeleteSubjectModalOpen, setDeleteSubjectModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiHubOpen, setIsAiHubOpen] = useState(false);
  const [aiConversationStarted, setAiConversationStarted] = useState(false);
  const [presentationPreviewData, setPresentationPreviewData] = useState(null);
  const [isPresentationPreviewModalOpen, setPresentationPreviewModalOpen] = useState(false);
  const [isSavingPresentation, setIsSavingPresentation] = useState(false);
  const [isBetaWarningModalOpen, setIsBetaWarningModalOpen] = useState(false);
  const [lessonsToProcessForPPT, setLessonsToProcessForPPT] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [confirmArchiveModalState, setConfirmArchiveModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Lounge State
  const [loungePosts, setLoungePosts] = useState([]);
  const [isLoungeLoading, setIsLoungeLoading] = useState(true);
  const [loungeUsersMap, setLoungeUsersMap] = useState({});
  const [hasLoungeFetched, setHasLoungeFetched] = useState(false); 

  const loungePostUtils = useStudentPosts(loungePosts, setLoungePosts, userProfile?.id, showToast);

  useEffect(() => {
    if (userProfile?.id) {
        setLoungeUsersMap(prev => ({
            ...prev,
            [userProfile.id]: userProfile
        }));
    }
  }, [userProfile]);

  const fetchMissingLoungeUsers = useCallback(async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter(id => !!id))];
    if (uniqueIds.length === 0) return;
    
    let usersToFetch = [];
    setLoungeUsersMap(prevMap => {
        usersToFetch = uniqueIds.filter(id => !prevMap[id]);
        return prevMap;
    });

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
        console.error("Error fetching users:", err);
    }
  }, []);

  // ✅ FIXED: LOUNGE FETCH WITH LEGACY HANDLING
  const fetchLoungePosts = useCallback(async () => {
    if (!userProfile?.id || !userProfile?.schoolId) return;
    
    setIsLoungeLoading(true);
    
    try {
      // 1. Fetch posts WITHOUT strict school filtering in query
      const postsQuery = query(
        collection(db, 'studentPosts'),
        where('audience', '==', 'Public'),
        // REMOVED STRICT FILTER: where('schoolId', '==', userProfile.schoolId), 
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(postsQuery); 
      
      // 2. Filter Client-Side (Legacy Support)
      const userSchoolId = userProfile.schoolId || 'srcs_main';
      
      const posts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => {
            const postSchool = post.schoolId || 'srcs_main'; // Fallback for legacy
            return postSchool === userSchoolId;
        });

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
  }, [userProfile, showToast, fetchMissingLoungeUsers]);


    useEffect(() => {
        if (userProfile && messages.length === 0) {
            setMessages([{ sender: 'ai', text: `Hello, ${userProfile?.firstName}! I'm your AI assistant. How can I help you today?` }]);
        }
    }, [userProfile, messages.length]);

    // ✅ FIXED: MAIN DATA FETCH WITH LEGACY HANDLING
    useEffect(() => {
        if (!user || !userProfile) {
            if (!user) setLoading(false);
            return;
        }

        setLoading(true);
        const teacherId = user.uid || user.id;
        const schoolId = userProfile.schoolId || DEFAULT_SCHOOL_ID;

        // 1. Classes: Fetches by TeacherID (Implicitly handles Legacy because teacher ID is constant)
        const classesQuery = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        
        // 2. Courses: Shared Content (No School Filter needed usually, or same legacy logic)
        const coursesQuery = query(collection(db, "courses")); 

        // 3. Announcements: REMOVED STRICT FILTER
        // We fetch sorted announcements and filter in the callback
        const announcementsQuery = query(
            collection(db, "teacherAnnouncements"), 
            // where("schoolId", "==", schoolId), <-- REMOVED
            orderBy("createdAt", "desc")
        );

        const unsubClasses = onSnapshot(classesQuery, snapshot => {
            setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, err => {
            console.error("Firestore (classes) error:", err);
            setError("Failed to load class data.");
        });

        const unsubCourses = onSnapshot(coursesQuery, snapshot => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, err => {
            console.error("Firestore (courses) error:", err);
            setError("Failed to load course data.");
        });

        // 4. Client-Side Filtering for Announcements & Categories
        const otherQueries = [
            { query: query(collection(db, "subjectCategories"), orderBy("name")), setter: setCourseCategories },
            { 
                query: announcementsQuery, 
                setter: (data) => {
                    // FILTER LEGACY ANNOUNCEMENTS
                    const filtered = data.filter(ann => {
                        const annSchool = ann.schoolId || 'srcs_main';
                        return annSchool === schoolId;
                    });
                    setTeacherAnnouncements(filtered);
                } 
            },
        ];

        const otherUnsubs = otherQueries.map(({ query, setter }) =>
            onSnapshot(query, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Check if setter expects raw data or if we wrapped it
                if (setter.name === 'setCourseCategories') setter(data); // Categories usually global
                else setter(data); // This calls our custom filter wrapper above
            }, (err) => {
                console.error("Firestore snapshot error:", err);
            })
        );
        
        Promise.all([
            getDocs(classesQuery),
            getDocs(coursesQuery),
            getDocs(announcementsQuery)
        ]).then(() => {
            setLoading(false);
        }).catch(err => {
            console.error("Error during initial data fetch:", err);
            setLoading(false); 
        });

        return () => {
            unsubClasses();
            unsubCourses();
            otherUnsubs.forEach(unsub => unsub());
        };
    }, [user, userProfile]); 

    // ✅ FIXED: IMPORT CLASSES LIST WITH LEGACY HANDLING
    useEffect(() => {
        if (activeView === 'studentManagement' && userProfile?.schoolId) {
            setIsImportViewLoading(true);
            const fetchAllClassesForImport = async () => {
                try {
                    // Fetch ALL classes sorted by name (Remove strict schoolId filter)
                    const q = query(
                        collection(db, "classes"), 
                        // where("schoolId", "==", userProfile.schoolId), <-- REMOVED
                        orderBy("name")
                    );
                    const querySnapshot = await getDocs(q);
                    const allRawClasses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    // Filter Client-Side for Legacy Support
                    const userSchoolId = userProfile.schoolId || 'srcs_main';
                    const filteredClasses = allRawClasses.filter(cls => {
                        const clsSchool = cls.schoolId || 'srcs_main';
                        return clsSchool === userSchoolId;
                    });

                    setAllLmsClasses(filteredClasses);
                } catch (err) {
                    console.error("Error fetching all classes:", err);
                    showToast("Failed to load class list.", "error");
                } finally {
                    setIsImportViewLoading(false);
                }
            };

            fetchAllClassesForImport();
        }
    }, [activeView, showToast, userProfile]);

    useEffect(() => {
      if (activeView === 'lounge' && !hasLoungeFetched && userProfile?.id) {
          fetchLoungePosts();
      }
      if (activeView !== 'lounge') {
          setHasLoungeFetched(false);
      }
    }, [activeView, hasLoungeFetched, userProfile, fetchLoungePosts]);


    const handleCreateUnit = useCallback(async (unitData) => {
        if (!unitData || !unitData.subjectId) {
            showToast("Missing data to create the unit.", "error");
            return;
        }
        const courseRef = doc(db, "courses", unitData.subjectId);
        const newUnitRef = doc(collection(db, "units"));

        try {
            await runTransaction(db, async (transaction) => {
                const courseDoc = await transaction.get(courseRef);
                if (!courseDoc.exists()) {
                    throw new Error("Parent course document does not exist!");
                }
                const newUnitCount = (courseDoc.data().unitCount || 0) + 1;
                transaction.update(courseRef, { unitCount: newUnitCount });
                transaction.set(newUnitRef, unitData);
            });
            showToast("Unit created successfully!", "success");
            setAddUnitModalOpen(false);
        } catch (e) {
            console.error("Unit creation transaction failed: ", e);
            showToast("Failed to create unit.", "error");
        }
    }, [showToast]);

    const handleDeleteUnit = useCallback(async (unitId, subjectId) => {
        if (!unitId || !subjectId) {
            showToast("Missing data to delete the unit.", "error");
            return;
        }
        const courseRef = doc(db, "courses", subjectId);
        const unitRef = doc(db, "units", unitId);
        const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
        const quizzesQuery = query(collection(db, 'quizzes'), where('unitId', '==', unitId));

        try {
            await runTransaction(db, async (transaction) => {
                const courseDoc = await transaction.get(courseRef);
                if (courseDoc.exists()) {
                    const newUnitCount = Math.max(0, (courseDoc.data().unitCount || 0) - 1);
                    transaction.update(courseRef, { unitCount: newUnitCount });
                }

                const lessonsSnapshot = await getDocs(lessonsQuery);
                lessonsSnapshot.forEach(lessonDoc => transaction.delete(lessonDoc.ref));

                const quizzesSnapshot = await getDocs(quizzesQuery);
                quizzesSnapshot.forEach(quizDoc => transaction.delete(quizDoc.ref));

                transaction.delete(unitRef);
            });
            
            const batch = writeBatch(db);
            const relatedClasses = classes.filter(c => c.subjectId === subjectId);
            relatedClasses.forEach(c => {
                const classRef = doc(db, "classes", c.id);
                batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            });
            await batch.commit();
            
            showToast("Unit and its content deleted successfully!", "success");
        } catch (e) {
            console.error("Unit deletion transaction failed: ", e);
            showToast("Failed to delete unit.", "error");
        }
    }, [classes, showToast]);

    // ✅ ANNOUNCEMENT CREATION: Tags with School ID
	const handleCreateAnnouncement = useCallback(async ({ content, audience, classId, className, photoURL, caption }) => {
	    if (!content.trim() && !photoURL?.trim()) { 
	        showToast("Announcement must have content or a photo.", "error"); 
	        return; 
	    }

	    const collectionName = audience === 'teachers' ? 'teacherAnnouncements' : 'studentAnnouncements';
	    const announcementData = {
	        content,
	        teacherId: userProfile?.id,
	        teacherName: `${userProfile?.firstName} ${userProfile?.lastName}`,
	        createdAt: serverTimestamp(),
	        photoURL: photoURL || null,
	        caption: caption || null,
	        isPinned: false,
            schoolId: userProfile?.schoolId || DEFAULT_SCHOOL_ID // <-- Added School ID
	    };

	    if (audience === 'students') {
	        if (!classId) { 
	            showToast("Please select a class for the student announcement.", "error"); 
	            return; 
	        }
	        announcementData.classId = classId;
	        announcementData.className = className;
	    }

	    try {
	        await addDoc(collection(db, collectionName), announcementData);
	        if (audience === 'students' && classId) {
	            await updateDoc(doc(db, "classes", classId), {
	                contentLastUpdatedAt: serverTimestamp()
	            });
	        }
	        showToast("Announcement posted successfully!", "success");
	    } catch (error) {
	        console.error("Error posting announcement:", error);
            showToast("Failed to post announcement.", "error");
	    }
	}, [userProfile, showToast]);

    const handleAskAi = useCallback(async (userMessage) => {
        if (!userMessage.trim()) return;
        const newMessages = [...messages, { sender: 'user', text: userMessage }];
        setMessages(newMessages);
        setIsAiThinking(true);
        const conversationHistory = newMessages.map(msg => `${msg.sender === 'user' ? 'user' : 'model'}: ${msg.text}`).join('\n');
        const lmsKnowledge = `You are an AI assistant for a Learning Management System (LMS) named SRCS Learning Portal...`;
        const prompt = `${lmsKnowledge}\n\n${conversationHistory}`;
        try {
           const aiResponseText = await callChatbotAi(prompt);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: "I seem to be having trouble connecting." }]);
            if (error.message === 'LIMIT_REACHED') { showToast("The AI Assistant has reached its monthly usage limit.", "info"); }
            else { console.error("AI Chat Error:", error); }
        } finally { setIsAiThinking(false); }
    }, [messages, showToast]);

	const handleRemoveStudentFromClass = useCallback(async (classId, student) => {
	    if (!window.confirm(`Are you sure you want to remove ${student.firstName} ${student.lastName} from the class?`)) { 
	        return; 
	    }
    
	    try {
	        const classRef = doc(db, "classes", classId);
	        const classDoc = classes.find(c => c.id === classId);
	        const studentObjectToRemove = classDoc.students.find(s => s.id === student.id);
	        const studentIdToRemove = student.id;

	        if (!studentObjectToRemove) {
	            console.warn("Student object not found in 'students' array.");
	        }

	        await updateDoc(classRef, { 
	            students: arrayRemove(studentObjectToRemove),
	            studentIds: arrayRemove(studentIdToRemove)
	        });
        
	        showToast("Student removed successfully.", "success");
	    } catch (error) { 
	        console.error("Error removing student:", error); 
	        showToast("Failed to remove student. Please try again.", "error"); 
	    }
	}, [classes, showToast]);

	const handleGenerateQuizForLesson = useCallback(async (lesson, unitId, subjectId) => {
	    if (isAiGenerating) return;
	    setIsAiGenerating(true);
	    showToast("AI is generating your quiz... This may take a moment.", "info");

	    const lessonContent = lesson.pages.map(page => 
	        `Page Title: ${page.title}\n\n${page.content}`
	    ).join('\n\n---\n\n');

	    const prompt = `Based on the following lesson content, generate a 10-question multiple-choice quiz...`; 

	    try {
	        const aiResponseText = await callGeminiWithLimitCheck(prompt);
	        const generatedQuiz = JSON.parse(aiResponseText);
	        await addDoc(collection(db, 'quizzes'), {
	            title: generatedQuiz.title,
	            questions: generatedQuiz.questions,
	            unitId: unitId,
	            subjectId: subjectId,
	            createdAt: serverTimestamp(),
	        });

	        if (subjectId) {
                const batch = writeBatch(db);
	            const relatedClasses = classes.filter(c => c.subjectId === subjectId);
                relatedClasses.forEach(c => {
                    const classRef = doc(db, "classes", c.id);
                    batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
                });
                await batch.commit();
	        }

	        showToast("AI has successfully generated and saved the new quiz!", "success");
	    } catch (error) {
	        console.error("Error generating quiz:", error);
	        showToast("Failed to generate quiz.", "error");
	    } finally {
	        setIsAiGenerating(false);
	    }
	}, [isAiGenerating, classes, showToast]);

    const handleInitiatePresentationGeneration = useCallback((lessonIds, lessonsData, unitsData) => {
        if (!lessonIds || lessonIds.length === 0) { showToast("Please select one or more lessons to include in the presentation.", "warning"); return; }
        const hideWarning = localStorage.getItem('hidePresentationBetaWarning');
        setLessonsToProcessForPPT({ ids: lessonIds, data: lessonsData, units: unitsData });
        if (hideWarning === 'true') { 
             setIsBetaWarningModalOpen(true); 
        }
        else { setIsBetaWarningModalOpen(true); }
    }, [showToast]);

	const handleGeneratePresentationPreview = useCallback(async (lessonIds, lessonsData, unitsData) => {
	        if (!activeSubject) { 
	            showToast("No active subject selected.", "warning"); 
	            return; 
	        }
        
	        const selectedLessons = lessonsData.filter(l => lessonIds.includes(l.id));
	        if (selectedLessons.length === 0) {
	            showToast("No lesson found.", "error");
	            return;
	        }
        
	        const targetLesson = selectedLessons[0];
	        const validPages = (targetLesson.pages || []).filter(p => p.content && p.content.trim().length > 0);
        
	        if (validPages.length === 0) {
	            showToast("This lesson has no content.", "error");
	            return;
	        }

	        setIsAiGenerating(true);
        
	        let accumulatedSlides = [
	            {
	                title: targetLesson.title,
	                body: `Subject: ${activeSubject.title}`,
	                notes: { talkingPoints: "Introduction to the lesson topic.", interactiveElement: "N/A", slideTiming: "1 min" }
	            }
	        ];

	        for (let i = 0; i < validPages.length; i++) {
	            const page = validPages[i];
	            showToast(`Generating slides for section ${i + 1} of ${validPages.length}...`, "info");

	            const prompt = `You are an expert Educational Content Developer... (Prompt truncated for brevity) ... ${page.content}`;
	            try {
	                const aiResponseText = await callGeminiWithLimitCheck(prompt);
	                const jsonText = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || aiResponseText;
	                const parsed = JSON.parse(jsonText);

	                if (parsed.slides && Array.isArray(parsed.slides)) {
	                    accumulatedSlides = [...accumulatedSlides, ...parsed.slides];
	                }
	            } catch (err) {
	                console.error(`Error on part ${i + 1}:`, err);
	                showToast(`Skipped section ${i + 1} due to an error.`, "warning");
	            }
	        }

	        if (accumulatedSlides.length <= 1) {
	            showToast("Failed to generate slides. Please check lesson content.", "error");
	            setIsAiGenerating(false);
	            return;
	        }

	        showToast("Presentation generation complete!", "success");

	        setPresentationPreviewData({ 
	            slides: accumulatedSlides, 
	            lessonIds, 
	            lessonsData, 
	            unitsData 
	        });
        
	        setPresentationPreviewModalOpen(true);
	        setIsAiGenerating(false); 
	    }, [activeSubject, showToast]);

    const handleConfirmBetaWarning = useCallback((neverShowAgain) => {
        if (neverShowAgain) { localStorage.setItem('hidePresentationBetaWarning', 'true'); }
        setIsBetaWarningModalOpen(false);
        const { ids, data, units } = lessonsToProcessForPPT;
        handleGeneratePresentationPreview(ids, data, units);
    }, [lessonsToProcessForPPT, handleGeneratePresentationPreview]);

		const handleCreatePresentation = useCallback(async () => {
		        if (!presentationPreviewData) { 
		            showToast("No preview data available.", "error"); 
		            return; 
		        }
        
		        setIsSavingPresentation(true);
        
		        try {
		            const { slides, lessonIds, lessonsData, unitsData } = presentationPreviewData;
            
		            const firstLesson = lessonsData.find(l => l.id === lessonIds[0]); 
		            const unit = firstLesson ? unitsData.find(u => u.id === firstLesson.unitId) : null;
            
		            const subjectName = activeSubject?.title ? String(activeSubject.title) : "General Subject";
		            const unitName = unit?.name ? String(unit.name) : "General Unit";
            
		            let sourceTitle = "Untitled Lesson";
		            if (lessonIds.length > 1) {
		                sourceTitle = `${unitName} Summary`;
		            } else if (firstLesson?.title) {
		                sourceTitle = firstLesson.title;
		            }
		            const presentationTitle = `Presentation: ${sourceTitle}`;

		            const cleanedSlides = slides.map((slide, index) => {
		                let bodyText = "";
		                if (typeof slide.body === 'string') bodyText = slide.body;
		                else if (Array.isArray(slide.body)) bodyText = slide.body.join('\n');
		                else if (slide.body) bodyText = String(slide.body);

		                let titleText = slide.title ? String(slide.title) : `Slide ${index + 1}`;

		                return { 
		                    ...slide, 
		                    title: titleText,
		                    body: bodyText.split('\n').map(line => line.trim()).join('\n'), 
		                    notes: formatNotesToString(slide.notes || {}) 
		                };
		            });

		            const presentationUrl = await createPresentationFromData(
		                cleanedSlides, 
		                presentationTitle, 
		                subjectName, 
		                unitName
		            );
            
		            window.open(presentationUrl, '_blank');
		            showToast("Presentation created successfully!", "success");

		        } catch (error) { 
		            console.error("Presentation Creation Error:", error); 
		            showToast(`Creation Error: ${error.message}`, "error"); 
		        }
		        finally { 
		            setIsSavingPresentation(false); 
		        }
		    }, [presentationPreviewData, activeSubject, showToast]);

    const handleInitiateDelete = useCallback((type, id, name, subjectId = null) => {
        setDeleteTarget({ type, id, name, subjectId });
        setIsDeleteModalOpen(true);
    }, []);
    
    const handleArchiveClass = useCallback(async (classId) => {
        try { 
            await firestoreService.updateClassArchiveStatus(classId, true); 
            showToast("Class archived.", "success"); 
        }
        catch (error) { showToast("Failed to archive class.", "error"); }
    }, [firestoreService, showToast]);

    const handleInitiateArchive = useCallback((classId, className) => {
        setConfirmArchiveModalState({
            isOpen: true,
            title: "Archive Class?",
            message: `Are you sure you want to archive "${className}"? Students will no longer see it, but you can restore it later.`,
            onConfirm: () => handleArchiveClass(classId)
        });
    }, [handleArchiveClass]);

    async function deleteQuizAndSubmissions(batch, quizId) {
        const submissionsQuery = query(
            collection(db, 'quizSubmissions'),
            where('quizId', '==', quizId)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        submissionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        batch.delete(doc(db, 'quizzes', quizId));
    }

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) {
            showToast("An error occurred. No item selected for deletion.", "error");
            return;
        }
        const { type, id, name, subjectId } = deleteTarget;

        if (type === 'class') {
            setIsAiGenerating(true); 
            try {
                await firestoreService.deleteClass(id); 
                showToast("Class permanently deleted.", "success");
                setIsArchivedModalOpen(false); 
            } catch (error) {
                showToast("Failed to delete class.", "error");
            } finally {
                setIsAiGenerating(false);
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
            }
            return;
        }

        if (type === 'unit') {
            await handleDeleteUnit(id, subjectId);
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
            return;
        }

        setIsAiGenerating(true); 
        try {
            const batch = writeBatch(db);
            const classesToUpdate = new Set();

            const findAndQueueClassUpdates = (subjectId) => {
                classes.forEach(c => {
                    if (c.subjectId === subjectId) {
                        classesToUpdate.add(c.id);
                    }
                });
            };

            const deleteSubjectContent = async (subjectId) => {
                findAndQueueClassUpdates(subjectId);
                const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));
                const unitsSnapshot = await getDocs(unitsQuery);
                for (const unitDoc of unitsSnapshot.docs) {
                    const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitDoc.id));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    lessonsSnapshot.forEach(lessonDoc => batch.delete(doc(db, 'lessons', lessonDoc.id)));
                    
                    const quizzesQuery = query(collection(db, 'quizzes'), where('unitId', '==', unitDoc.id));
                    const quizzesSnapshot = await getDocs(quizzesQuery);
                    for (const quizDoc of quizzesSnapshot.docs) {
                        await deleteQuizAndSubmissions(batch, quizDoc.id);
                    }
                    
                    batch.delete(doc(db, 'units', unitDoc.id));
                }
            };

            if (type === 'category') {
                const coursesInCategoryQuery = query(collection(db, 'courses'), where('category', '==', name));
                const coursesSnapshot = await getDocs(coursesInCategoryQuery);
                for (const courseDoc of coursesSnapshot.docs) {
                    await deleteSubjectContent(courseDoc.id);
                    batch.delete(doc(db, 'courses', courseDoc.id));
                }
            } else if (type === 'subject') {
                await deleteSubjectContent(id);
                batch.delete(doc(db, 'courses', id));
                setActiveSubject(null);
            } else if (type === 'quiz') {
                findAndQueueClassUpdates(subjectId);
                await deleteQuizAndSubmissions(batch, id);
            } else if (type === 'lesson') {
                findAndQueueClassUpdates(subjectId);
                batch.delete(doc(db, 'lessons', id));
            } else {
                 showToast(`Deletion for type "${type}" is not implemented.`, "warning");
            }
            
            classesToUpdate.forEach(classId => {
                const classRef = doc(db, "classes", classId);
                batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            });

            await batch.commit();
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`, "success");
            
        } catch (error) { 
            console.error(`Error deleting ${type}:`, error); 
            showToast(`An error occurred. Could not delete the ${type}.`, "error"); 
        } finally { 
            setIsDeleteModalOpen(false); 
            setDeleteTarget(null); 
            setIsAiGenerating(false);
        }
    }, [deleteTarget, classes, firestoreService, handleDeleteUnit, showToast]);

    const handleUpdateLesson = useCallback((updatedLesson) => {
        setSelectedLesson(updatedLesson);
        setCourses(prevCourses =>
            prevCourses.map(course => ({
                ...course,
                lessons: course.lessons?.map(lesson => 
                    lesson.id === updatedLesson.id ? updatedLesson : lesson
                )
            }))
        );
        const fetchCourses = async () => {
            try {
                const coursesQuery = query(collection(db, "courses"));
                const coursesSnapshot = await getDocs(coursesQuery);
                const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCourses(coursesData);
            } catch (err) {
                console.error("Firestore getDocs error during courses update:", err);
            }
        };
        fetchCourses();
        setReloadKey(prevKey => prevKey + 1);
    }, []);
    
    const handleViewChangeWrapper = useCallback((view) => {
        if (activeView === view) { 
            setReloadKey(prevKey => prevKey + 1); 
        }
        else { 
            handleViewChange(view); 
            setSelectedCategory(null);
        }
    }, [activeView, handleViewChange]);
    
    const handleCategoryClick = useCallback((categoryName) => { setSelectedCategory(categoryName); }, []);
    const handleBackToCategoryList = useCallback(() => { setSelectedCategory(null); }, []);
    const handleOpenEditClassModal = useCallback((classData) => { setClassToEdit(classData); setEditClassModalOpen(true); }, []);
    const handleEditCategory = useCallback((category) => { setCategoryToEdit(category); setEditCategoryModalOpen(true); }, []);

    const handleUpdateProfile = useCallback(async (newData) => {
        try {
            await firestoreService.updateUserProfile(user.uid || user.id, newData);
            await refreshUserProfile();
            showToast('Profile updated successfully!', 'success');
            setEditProfileModalOpen(false);
        } catch (err) { showToast('Failed to update profile.', 'error'); console.error(err); }
    }, [user, firestoreService, refreshUserProfile, showToast]);

    const handleChangePassword = useCallback(async (newPassword) => {
        try {
            await firestoreService.updateUserPassword(user.uid || user.id, newPassword);
            showToast('Password changed successfully!', 'success');
            setChangePasswordModalOpen(false);
        } catch (err) { showToast('Failed to change password.', 'error'); console.error(err); }
    }, [user, firestoreService, showToast]);

	const handleUpdateClass = useCallback(async (classId, newData) => {
	    try {
	        const classRef = doc(db, "classes", classId);
	        await updateDoc(classRef, newData);
	        showToast("Class updated successfully!", "success");
	        setEditClassModalOpen(false);
	    } catch (error) {
	        console.error("Error updating class:", error);
	        showToast("Failed to update class.", "error");
	    }
	}, [showToast]);

    const handleUnarchiveClass = useCallback(async (classId) => {
        try { await firestoreService.updateClassArchiveStatus(classId, false); showToast("Class restored.", "success"); }
        catch (error) { showToast("Failed to restore class.", "error"); }
    }, [firestoreService, showToast]);

    const handleDeleteClass = useCallback(async (classId, isArchivedView = false) => {
        const classToDel = classes.find(c => c.id === classId);
        handleInitiateDelete('class', classId, classToDel?.name || 'this class');
    }, [classes, handleInitiateDelete]);

    const handleStartEditAnn = useCallback((post) => { setEditingAnnId(post.id); setEditingAnnText(post.content); }, []);
    const handleUpdateTeacherAnn = useCallback(async () => {
        if (!editingAnnText.trim()) return showToast("Announcement cannot be empty.", "error");
        try { await updateDoc(doc(db, 'teacherAnnouncements', editingAnnId), { content: editingAnnText }); showToast("Announcement updated.", "success"); setEditingAnnId(null); }
        catch (error) { showToast("Failed to update announcement.", "error"); }
    }, [editingAnnText, editingAnnId, showToast]);

	const handleDeleteTeacherAnn = useCallback(async (id) => {
	    if (window.confirm("Delete this announcement?")) {
	        try {
	            await deleteDoc(doc(db, 'teacherAnnouncements', id));
	            setTeacherAnnouncements(prevAnnouncements => 
	                prevAnnouncements.filter(announcement => announcement.id !== id)
	            );
	            showToast("Announcement deleted.", "success");
	        } catch (error) {
	            console.error("Error deleting announcement:", error);
	            showToast("Failed to delete announcement.", "error");
	        }
	    }
	}, [showToast]);

    const handleTogglePinAnnouncement = useCallback(async (announcementId, currentStatus) => {
        if (userProfile?.role !== 'admin') { showToast("Permission denied.", "error"); return; }
        try { await updateDoc(doc(db, 'teacherAnnouncements', announcementId), { isPinned: !currentStatus }); showToast(`Announcement ${!currentStatus ? 'pinned' : 'unpinned'}.`, "success"); }
        catch (error) { console.error("Error toggling pin:", error); showToast("Failed to update pin status.", "error"); }
    }, [userProfile, showToast]);

    const handleToggleStudentForImport = useCallback((studentId) => {
        setStudentsToImport(prev => { const newSet = new Set(prev); if (newSet.has(studentId)) { newSet.delete(studentId); } else { newSet.add(studentId); } return newSet; });
    }, []);

    const handleSelectAllStudents = useCallback(() => {
        if (!selectedClassForImport?.students) return;
        const studentIdsInSelectedClass = selectedClassForImport.students.map(s => s.id);
        if (studentIdsInSelectedClass.length > 0 && studentIdsInSelectedClass.every(id => studentsToImport.has(id))) { setStudentsToImport(new Set()); }
        else { setStudentsToImport(new Set(studentIdsInSelectedClass)); }
    }, [selectedClassForImport, studentsToImport]);

	const handleImportStudents = useCallback(async () => {
	    if (!importTargetClassId) return showToast("Please select a target class.", "error");
	    if (studentsToImport.size === 0) return showToast("Please select students to import.", "error");
	    setIsImporting(true);
	    try {
	        const studentObjectsToAdd = selectedClassForImport.students.filter(s => studentsToImport.has(s.id));
	        const studentIdsToAdd = studentObjectsToAdd.map(student => student.id);
	        const targetClassRef = doc(db, "classes", importTargetClassId);
	        await updateDoc(targetClassRef, { 
	            students: arrayUnion(...studentObjectsToAdd),
	            studentIds: arrayUnion(...studentIdsToAdd)
	        });

	        showToast(`${studentsToImport.size} student(s) imported successfully!`, 'success');
	        setStudentsToImport(new Set()); 
	        setSelectedClassForImport(null); 
	        setImportClassSearchTerm(''); 
	        setImportTargetClassId('');
	    } catch (err) { 
	        console.error("Error importing students:", err); 
	        showToast("An error occurred during import.", "error"); 
	    } finally { 
	        setIsImporting(false); 
	    }
	}, [importTargetClassId, studentsToImport, selectedClassForImport, showToast]);

    const handleBackToClassSelection = useCallback(() => { setSelectedClassForImport(null); setStudentsToImport(new Set()); setImportTargetClassId(''); }, []);
    const handleOpenEditSubject = useCallback((subject) => { setSubjectToActOn(subject); setEditSubjectModalOpen(true); }, []);
    const handleOpenDeleteSubject = useCallback((subject) => { setSubjectToActOn(subject); setDeleteSubjectModalOpen(true); }, []);
    const handleAskAiWrapper = useCallback((message) => { handleAskAi(message); if (!aiConversationStarted) setAiConversationStarted(true); }, [handleAskAi, aiConversationStarted]);

    const filteredLmsClasses = useMemo(() => {
        if (!importClassSearchTerm) return allLmsClasses;
        return allLmsClasses.filter(c => c.name.toLowerCase().includes(importClassSearchTerm.toLowerCase()));
    }, [allLmsClasses, importClassSearchTerm]);

    const activeClasses = useMemo(() => classes.filter(c => !c.isArchived), [classes]);
    const archivedClasses = useMemo(() => classes.filter(c => c.isArchived), [classes]);

    if (activeView === 'publicProfile') {
      return <PublicProfilePage />;
    }

    return (
        <>
            {isAiGenerating && <GlobalAiSpinner message="AI is generating content... Please wait." />}
            
            <TeacherDashboardLayout
                handleCreateUnit={handleCreateUnit}
                user={user}
                userProfile={userProfile}
                loading={loading}
                authLoading={authLoading}
                error={error}
                activeView={activeView}
                handleViewChange={handleViewChangeWrapper}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                logout={logout}
                showToast={showToast}
                activeClasses={activeClasses}
                archivedClasses={archivedClasses}
                handleArchiveClass={handleInitiateArchive} 
                handleDeleteClass={handleDeleteClass} 
                handleInitiateDelete={handleInitiateDelete} 
                courses={courses}
                courseCategories={courseCategories}
                teacherAnnouncements={teacherAnnouncements}
                selectedCategory={selectedCategory}
                handleCategoryClick={handleCategoryClick}
                handleBackToCategoryList={handleBackToCategoryList}
                activeSubject={activeSubject}
                setActiveSubject={setActiveSubject}
                activeUnit={activeUnit}
                onSetActiveUnit={setActiveUnit}
                handleOpenEditClassModal={handleOpenEditClassModal}
                isHoveringActions={isHoveringActions}
                setIsHoveringActions={setIsHoveringActions}
                setClassOverviewModal={setClassOverviewModal}
                setIsArchivedModalOpen={setIsArchivedModalOpen}
                setCreateClassModalOpen={setCreateClassModalOpen}
                setCreateCategoryModalOpen={setCreateCategoryModalOpen}
                setCreateCourseModalOpen={setCreateCourseModalOpen}
                handleEditCategory={handleEditCategory}
                handleOpenEditSubject={handleOpenEditSubject}
                handleOpenDeleteSubject={handleOpenDeleteSubject}
                setShareContentModalOpen={setShareContentModalOpen}
                handleGenerateQuizForLesson={handleGenerateQuizForLesson}
                onGeneratePresentationPreview={handleInitiatePresentationGeneration}
                isAiGenerating={isAiGenerating}
                setIsAiGenerating={setIsAiGenerating}
                setEditProfileModalOpen={setEditProfileModalOpen}
                setChangePasswordModalOpen={setChangePasswordModalOpen}
                editingAnnId={editingAnnId}
                editingAnnText={editingAnnText}
                setEditingAnnText={setEditingAnnText}
                handleStartEditAnn={handleStartEditAnn}
                handleUpdateTeacherAnn={handleUpdateTeacherAnn}
                setEditingAnnId={setEditingAnnId}
                handleDeleteTeacherAnn={handleDeleteTeacherAnn}
                handleTogglePinAnnouncement={handleTogglePinAnnouncement}
                importClassSearchTerm={importClassSearchTerm}
                setImportClassSearchTerm={setImportClassSearchTerm}
                allLmsClasses={allLmsClasses}
                filteredLmsClasses={filteredLmsClasses}
                isImportViewLoading={isImportViewLoading}
                selectedClassForImport={selectedClassForImport}
                setSelectedClassForImport={setSelectedClassForImport}
                handleBackToClassSelection={handleBackToClassSelection}
                importTargetClassId={importTargetClassId}
                setImportTargetClassId={setImportTargetClassId}
                handleImportStudents={handleImportStudents}
                isImporting={isImporting}
                studentsToImport={studentsToImport}
                handleToggleStudentForImport={handleToggleStudentForImport}
                handleSelectAllStudents={handleSelectAllStudents}
                isArchivedModalOpen={isArchivedModalOpen}
                handleUnarchiveClass={handleUnarchiveClass}
                isEditProfileModalOpen={isEditProfileModalOpen}
                handleUpdateProfile={handleUpdateProfile}
                isChangePasswordModalOpen={isChangePasswordModalOpen}
                handleChangePassword={handleChangePassword}
                isCreateCategoryModalOpen={isCreateCategoryModalOpen}
                isEditCategoryModalOpen={isEditCategoryModalOpen}
                setEditCategoryModalOpen={setEditCategoryModalOpen}
                categoryToEdit={categoryToEdit}
                isCreateClassModalOpen={isCreateClassModalOpen}
                isCreateCourseModalOpen={isCreateCourseModalOpen}
                classOverviewModal={classOverviewModal}
                isEditClassModalOpen={isEditClassModalOpen}
                setEditClassModalOpen={setEditClassModalOpen}
                classToEdit={classToEdit}
                isAddUnitModalOpen={isAddUnitModalOpen}
                setAddUnitModalOpen={setAddUnitModalOpen}
                editUnitModalOpen={editUnitModalOpen}
                setEditUnitModalOpen={setEditUnitModalOpen}
                selectedUnit={selectedUnit}
                addLessonModalOpen={addLessonModalOpen}
                setAddLessonModalOpen={setAddLessonModalOpen}
                addQuizModalOpen={addQuizModalOpen}
                setAddQuizModalOpen={setAddQuizModalOpen}
                deleteUnitModalOpen={deleteUnitModalOpen}
                setDeleteUnitModalOpen={setDeleteUnitModalOpen}
                editLessonModalOpen={editLessonModalOpen}
                setEditLessonModalOpen={setEditLessonModalOpen}
                selectedLesson={selectedLesson}
                viewLessonModalOpen={viewLessonModalOpen}
                setViewLessonModalOpen={setViewLessonModalOpen}
                isShareContentModalOpen={isShareContentModalOpen}
                isDeleteModalOpen={isDeleteModalOpen}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                handleConfirmDelete={handleConfirmDelete}
                deleteTarget={deleteTarget}
                isEditSubjectModalOpen={isEditSubjectModalOpen}
                setEditSubjectModalOpen={setEditSubjectModalOpen}
                subjectToActOn={subjectToActOn}
                isDeleteSubjectModalOpen={isDeleteSubjectModalOpen}
                setDeleteSubjectModalOpen={setDeleteSubjectModalOpen}
                handleCreateAnnouncement={handleCreateAnnouncement}
                isChatOpen={isChatOpen}
                setIsChatOpen={setIsChatOpen}
                messages={messages}
                isAiThinking={isAiThinking}
                handleAskAi={handleAskAi}
                handleAskAiWrapper={handleAskAiWrapper}
                aiConversationStarted={aiConversationStarted}
                setAiConversationStarted={setAiConversationStarted}
                handleRemoveStudentFromClass={handleRemoveStudentFromClass}
                isAiHubOpen={isAiHubOpen}
                setIsAiHubOpen={setIsAiHubOpen}
				handleUpdateClass={handleUpdateClass}
                reloadKey={reloadKey}

                isLoungeLoading={isLoungeLoading}
                loungePosts={loungePosts}
                loungeUsersMap={loungeUsersMap}
                fetchLoungePosts={fetchLoungePosts} 
                loungePostUtils={loungePostUtils} 
            />

            <Suspense fallback={<GlobalAiSpinner message="Loading..." />}>
                {viewLessonModalOpen && selectedLesson && (
                    <ViewLessonModal 
                        isOpen={viewLessonModalOpen} 
                        onClose={() => setViewLessonModalOpen(false)} 
                        lesson={selectedLesson} 
                        onUpdate={handleUpdateLesson} 
						userRole={user?.role}
                    />
                )}
                {isBetaWarningModalOpen && (
                    <BetaWarningModal 
                        isOpen={isBetaWarningModalOpen} 
                        onClose={() => setIsBetaWarningModalOpen(false)} 
                        onConfirm={handleConfirmBetaWarning} 
                        title="AI Presentation Generator" 
                    />
                )}
                {isPresentationPreviewModalOpen && (
                    <PresentationPreviewModal 
                        isOpen={isPresentationPreviewModalOpen} 
                        onClose={() => setPresentationPreviewModalOpen(false)} 
                        previewData={presentationPreviewData} 
                        onConfirm={handleCreatePresentation} 
                        isSaving={isSavingPresentation} 
                    />
                )}
            </Suspense>

            <ConfirmActionModal
                isOpen={confirmArchiveModalState.isOpen}
                onClose={() => setConfirmArchiveModalState({ ...confirmArchiveModalState, isOpen: false })}
                onConfirm={confirmArchiveModalState.onConfirm}
                title={confirmArchiveModalState.title}
                message={confirmArchiveModalState.message}
                confirmText="Archive"
                variant="warning"
            />
        </>
    );
};

export default TeacherDashboard;