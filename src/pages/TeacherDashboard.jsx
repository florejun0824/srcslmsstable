import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  addDoc, serverTimestamp, collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDocs, writeBatch,
  runTransaction, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { callGeminiWithLimitCheck } from '../services/aiService';
import { createPresentationFromData } from '../services/googleSlidesService';
import TeacherDashboardLayout from '../components/teacher/TeacherDashboardLayout';
import GlobalAiSpinner from '../components/common/GlobalAiSpinner';

// Lazy load modals to improve initial page load performance
const PresentationPreviewModal = lazy(() => import('../components/teacher/PresentationPreviewModal'));
const BetaWarningModal = lazy(() => import('../components/teacher/BetaWarningModal'));
const ViewLessonModal = lazy(() => import('../components/teacher/ViewLessonModal'));
const AnalyticsView = lazy(() => import('../components/teacher/dashboard/views/AnalyticsView'));


const TeacherDashboard = () => {
  const { user, userProfile, logout, firestoreService, refreshUserProfile } = useAuth();
  const { showToast } = useToast();

  // --- State Variables ---
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseCategories, setCourseCategories] = useState([]);
  const [teacherAnnouncements, setTeacherAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('home');
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

    // --- useEffect Hooks ---
    useEffect(() => {
        if (userProfile && messages.length === 0) {
            setMessages([{ sender: 'ai', text: `Hello, ${userProfile?.firstName}! I'm your AI assistant. How can I help you today?` }]);
        }
    }, [userProfile, messages.length]);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        const teacherId = user.uid || user.id;
        if (!teacherId) { setLoading(false); setError("User ID not found."); return; }

        const realTimeQueries = [
            { query: query(collection(db, "subjectCategories"), orderBy("name")), setter: setCourseCategories },
            { query: query(collection(db, "classes"), where("teacherId", "==", teacherId)), setter: setClasses },
            { query: query(collection(db, "teacherAnnouncements"), orderBy("createdAt", "desc")), setter: setTeacherAnnouncements },
        ];

        const unsubscribers = realTimeQueries.map(({ query, setter }) =>
            onSnapshot(query, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(data);
            }, (err) => {
                console.error("Firestore snapshot error:", err);
                setError("Failed to load dashboard data in real-time.");
            })
        );

        const fetchGlobalData = async () => {
            try {
                const coursesQuery = query(collection(db, "courses"));
                const coursesSnapshot = await getDocs(coursesQuery);
                const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCourses(coursesData);
            } catch (err) {
                console.error("Firestore getDocs error:", err);
                setError("Failed to load courses data.");
            } finally {
                setLoading(false);
            }
        };

        fetchGlobalData();

        return () => { unsubscribers.forEach(unsub => unsub()); };
    }, [user]);

    useEffect(() => {
        if (activeView === 'studentManagement') {
            setIsImportViewLoading(true);
            const fetchAllClassesForImport = async () => {
                try {
                    const q = query(collection(db, "classes"), orderBy("name"));
                    const querySnapshot = await getDocs(q);
                    const allClassesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAllLmsClasses(allClassesData);
                } catch (err) {
                    console.error("Error fetching all classes:", err);
                    showToast("Failed to load class list.", "error");
                } finally {
                    setIsImportViewLoading(false);
                }
            };

            fetchAllClassesForImport();
        }
    }, [activeView, showToast]);

    // --- Handler Functions ---
    const handleCreateUnit = async (unitData) => {
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
    };

    const handleDeleteUnit = async (unitId, subjectId) => {
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
    };

	const handleCreateAnnouncement = async ({ content, audience, classId, className, photoURL, caption }) => {
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
	};

    const handleAskAi = async (userMessage) => {
        if (!userMessage.trim()) return;
        const newMessages = [...messages, { sender: 'user', text: userMessage }];
        setMessages(newMessages);
        setIsAiThinking(true);
        const conversationHistory = newMessages.map(msg => `${msg.sender === 'user' ? 'user' : 'model'}: ${msg.text}`).join('\n');
        const lmsKnowledge = `You are an AI assistant for a Learning Management System (LMS) named SRCS Learning Portal, used by teachers. The developer is Florejun Flores. When asked about the LMS, refer to this knowledge. Otherwise, act as a general helpful AI. Knowledge Base: Teachers can manage classes (create, edit, archive, delete), organize content into courses/subjects and then units/lessons, generate quizzes, lessons, and Google Slides presentations with AI, post announcements to students or other teachers, manage students in classes (including importing from other classes), and edit their own profile/password.`;
        const prompt = `${lmsKnowledge}\n\n${conversationHistory}`;
        try {
            const aiResponseText = await callGeminiWithLimitCheck(prompt);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: "I seem to be having trouble connecting. My apologies. Please try again in a moment." }]);
            if (error.message === 'LIMIT_REACHED') { showToast("The AI Assistant has reached its monthly usage limit.", "info"); }
            else { showToast("The AI Assistant could not respond. Please try again.", "error"); console.error("AI Chat Error:", error); }
        } finally { setIsAiThinking(false); }
    };

    const handleRemoveStudentFromClass = async (classId, studentId) => {
        if (!window.confirm("Are you sure you want to remove this student from the class?")) { return; }
        try {
            const classRef = doc(db, "classes", classId);
            const classDoc = classes.find(c => c.id === classId);
            if (!classDoc || !classDoc.students) { throw new Error("Class or student list not found."); }
            const studentToRemove = classDoc.students.find(s => s.id === studentId);
            if (!studentToRemove) { throw new Error("Student not found in the class list."); }
            await updateDoc(classRef, { students: arrayRemove(studentToRemove) });
            showToast("Student removed successfully.", "success");
        } catch (error) { console.error("Error removing student:", error); showToast("Failed to remove student. Please try again.", "error"); }
    };

	const handleGenerateQuizForLesson = async (lesson, unitId, subjectId) => {
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
	};

    const handleInitiatePresentationGeneration = (lessonIds, lessonsData, unitsData) => {
        if (!lessonIds || lessonIds.length === 0) { showToast("Please select one or more lessons to include in the presentation.", "warning"); return; }
        const hideWarning = localStorage.getItem('hidePresentationBetaWarning');
        setLessonsToProcessForPPT({ ids: lessonIds, data: lessonsData, units: unitsData });
        if (hideWarning === 'true') { handleGeneratePresentationPreview(lessonIds, lessonsData, unitsData); }
        else { setIsBetaWarningModalOpen(true); }
    };

    const handleConfirmBetaWarning = (neverShowAgain) => {
        if (neverShowAgain) { localStorage.setItem('hidePresentationBetaWarning', 'true'); }
        setIsBetaWarningModalOpen(false);
        const { ids, data, units } = lessonsToProcessForPPT;
        handleGeneratePresentationPreview(ids, data, units);
    };

    const handleGeneratePresentationPreview = async (lessonIds, lessonsData, unitsData) => {
        if (!activeSubject) { showToast("No active subject selected. This is required for folder creation.", "warning"); return; }
        setIsAiGenerating(true);
        showToast("Gathering content and generating preview...", "info");
        try {
            const selectedLessonsData = lessonsData.filter(l => lessonIds.includes(l.id));
            if (selectedLessonsData.length === 0) { throw new Error("No lesson data found for the selected IDs."); }
            const allLessonContent = selectedLessonsData.map(lesson => { if (!lesson.pages || lesson.pages.length === 0) { return ''; } const validPages = lesson.pages.filter(page => page.content && page.content.trim() !== ''); if (validPages.length === 0) { return ''; } const pageText = validPages.map(page => `Page Title: ${page.title}\n${page.content.trim()}`).join('\n\n'); return `Lesson: ${lesson.title}\n${pageText}`; }).filter(entry => entry.trim() !== '').join('\n\n---\n\n');
            if (!allLessonContent || allLessonContent.trim().length === 0) { throw new Error("Selected lessons contain no usable content to generate slides."); }
			const presentationPrompt = `
			You are a master educator and presentation designer. 
			Your task is to generate a structured presentation preview from lesson content.

			⚠️ IMPORTANT: 
			- Respond ONLY with a single valid JSON object.
			- Do NOT include explanations, notes, markdown fences, or extra text.
			- Follow the exact schema below.

			SCHEMA:
			{
			  "slides": [
			    {
			      "title": "string - short, engaging slide title",
			      "body": "string - main content of the slide, concise but clear",
			      "notes": {
			        "talkingPoints": "string - bullet points the teacher can say",
			        "interactiveElement": "string - suggested activity, question, or visual",
			        "slideTiming": "string - recommended time in minutes"
			      }
			    }
			  ]
			}

			LESSON CONTENT TO PROCESS:
			---
			${allLessonContent}
			`;
            
            const aiResponseText = await callGeminiWithLimitCheck(presentationPrompt);
            const jsonText = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || aiResponseText;
            const parsedData = JSON.parse(jsonText);
            if (!parsedData.slides || !Array.isArray(parsedData.slides)) { throw new Error("AI response did not contain a valid 'slides' array."); }
            setPresentationPreviewData({ ...parsedData, lessonIds, lessonsData, unitsData });
            setPresentationPreviewModalOpen(true);
        } catch (error) { console.error("Presentation Preview Generation Error:", error); showToast(`Preview Error: ${error.message}`, "error"); }
        finally { setIsAiGenerating(false); }
    };

    const handleCreatePresentation = async () => {
        if (!presentationPreviewData) { showToast("No preview data available to create a presentation.", "error"); return; }
        setIsSavingPresentation(true);
        try {
            const { slides, lessonIds, lessonsData, unitsData } = presentationPreviewData;
            const firstLesson = lessonsData.find(l => l.id === lessonIds[0]); if (!firstLesson) throw new Error("First lesson not found.");
            const unit = unitsData.find(u => u.id === firstLesson.unitId); if (!unit) throw new Error("Associated unit not found.");
            const subjectName = activeSubject?.title || "Untitled Subject";
            const unitName = unit.name || "Untitled Unit";
            const sourceTitle = lessonIds.length > 1 ? `${unitName} Summary` : firstLesson.title;
            const presentationTitle = `Presentation for: ${sourceTitle}`;
            const cleanedSlides = slides.map(slide => ({ ...slide, body: slide.body.split('\n').map(line => line.trim()).join('\n'), notes: slide.notes || {} }));
            const presentationUrl = await createPresentationFromData(cleanedSlides, presentationTitle, subjectName, unitName);
            window.open(presentationUrl, '_blank');
            showToast("Presentation created! You can now copy the notes.", "success");
        } catch (error) { console.error("Presentation Creation Error:", error); showToast(`Creation Error: ${error.message}`, "error"); }
        finally { setIsSavingPresentation(false); }
    };

    const handleInitiateDelete = (type, id, name, subjectId = null) => {
        setDeleteTarget({ type, id, name, subjectId });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) {
            showToast("An error occurred. No item selected for deletion.", "error");
            return;
        }
        const { type, id, name, subjectId } = deleteTarget;
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
                    quizzesSnapshot.forEach(quizDoc => batch.delete(doc(db, 'quizzes', quizDoc.id)));
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
            } else if (type === 'lesson' || type === 'quiz') {
                findAndQueueClassUpdates(subjectId);
                batch.delete(doc(db, type === 'lesson' ? 'lessons' : 'quizzes', id));
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
    };

    const handleUpdateLesson = (updatedLesson) => {
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
    };

    const handleViewChange = (view) => {
        if (activeView === view) { setReloadKey(prevKey => prevKey + 1); }
        else { setActiveView(view); setSelectedCategory(null); setIsSidebarOpen(false); }
    };
    
    const handleCategoryClick = (categoryName) => { setSelectedCategory(categoryName); };
    const handleBackToCategoryList = () => { setSelectedCategory(null); };
    const handleOpenEditClassModal = (classData) => { setClassToEdit(classData); setEditClassModalOpen(true); };
    const handleEditCategory = (category) => { setCategoryToEdit(category); setEditCategoryModalOpen(true); };

    const handleUpdateProfile = async (newData) => {
        try {
            await firestoreService.updateUserProfile(user.uid || user.id, newData);
            await refreshUserProfile();
            showToast('Profile updated successfully!', 'success');
            setEditProfileModalOpen(false);
        } catch (err) { showToast('Failed to update profile.', 'error'); console.error(err); }
    };

    const handleChangePassword = async (newPassword) => {
        try {
            await firestoreService.updateUserPassword(user.uid || user.id, newPassword);
            showToast('Password changed successfully!', 'success');
            setChangePasswordModalOpen(false);
        } catch (err) { showToast('Failed to change password.', 'error'); console.error(err); }
    };

    const handleArchiveClass = async (classId) => {
        if (window.confirm("Are you sure you want to archive this class?")) {
            try { await firestoreService.updateClassArchiveStatus(classId, true); showToast("Class archived.", "success"); }
            catch (error) { showToast("Failed to archive class.", "error"); }
        }
    };
	const handleUpdateClass = async (classId, newData) => {
	    try {
	        const classRef = doc(db, "classes", classId);
	        await updateDoc(classRef, newData);
	        showToast("Class updated successfully!", "success");
	        setEditClassModalOpen(false); // Close the modal after a successful update
	    } catch (error) {
	        console.error("Error updating class:", error);
	        showToast("Failed to update class.", "error");
	    }
	};

    const handleUnarchiveClass = async (classId) => {
        try { await firestoreService.updateClassArchiveStatus(classId, false); showToast("Class restored.", "success"); }
        catch (error) { showToast("Failed to restore class.", "error"); }
    };

    const handleDeleteClass = async (classId, isArchivedView = false) => {
        if (window.confirm("PERMANENTLY DELETE? This cannot be undone.")) {
            try { await firestoreService.deleteClass(classId); showToast("Class permanently deleted.", "success"); if (isArchivedView) setIsArchivedModalOpen(false); }
            catch (error) { showToast("Failed to delete class.", "error"); }
        }
    };

    const handleStartEditAnn = (post) => { setEditingAnnId(post.id); setEditingAnnText(post.content); };
    const handleUpdateTeacherAnn = async () => {
        if (!editingAnnText.trim()) return showToast("Announcement cannot be empty.", "error");
        try { await updateDoc(doc(db, 'teacherAnnouncements', editingAnnId), { content: editingAnnText }); showToast("Announcement updated.", "success"); setEditingAnnId(null); }
        catch (error) { showToast("Failed to update announcement.", "error"); }
    };

	const handleDeleteTeacherAnn = async (id) => {
	    if (window.confirm("Delete this announcement?")) {
	        try {
	            await deleteDoc(doc(db, 'teacherAnnouncements', id));
            
	            // ADD THIS LINE:
	            setTeacherAnnouncements(prevAnnouncements => 
	                prevAnnouncements.filter(announcement => announcement.id !== id)
	            );

	            showToast("Announcement deleted.", "success");
	        } catch (error) {
	            console.error("Error deleting announcement:", error);
	            showToast("Failed to delete announcement.", "error");
	        }
	    }
	};

    const handleTogglePinAnnouncement = async (announcementId, currentStatus) => {
        if (userProfile?.role !== 'admin') { showToast("Permission denied.", "error"); return; }
        try { await updateDoc(doc(db, 'teacherAnnouncements', announcementId), { isPinned: !currentStatus }); showToast(`Announcement ${!currentStatus ? 'pinned' : 'unpinned'}.`, "success"); }
        catch (error) { console.error("Error toggling pin:", error); showToast("Failed to update pin status.", "error"); }
    };

    const handleToggleStudentForImport = (studentId) => {
        setStudentsToImport(prev => { const newSet = new Set(prev); if (newSet.has(studentId)) { newSet.delete(studentId); } else { newSet.add(studentId); } return newSet; });
    };

    const handleSelectAllStudents = () => {
        if (!selectedClassForImport?.students) return;
        const studentIdsInSelectedClass = selectedClassForImport.students.map(s => s.id);
        if (studentIdsInSelectedClass.length > 0 && studentIdsInSelectedClass.every(id => studentsToImport.has(id))) { setStudentsToImport(new Set()); }
        else { setStudentsToImport(new Set(studentIdsInSelectedClass)); }
    };

    const handleImportStudents = async () => {
        if (!importTargetClassId) return showToast("Please select a target class.", "error");
        if (studentsToImport.size === 0) return showToast("Please select students to import.", "error");
        setIsImporting(true);
        try {
            const studentsToAdd = selectedClassForImport.students.filter(s => studentsToImport.has(s.id));
            await updateDoc(doc(db, "classes", importTargetClassId), { students: arrayUnion(...studentsToAdd) });
            showToast(`${studentsToImport.size} student(s) imported successfully!`, 'success');
            setStudentsToImport(new Set()); setSelectedClassForImport(null); setImportClassSearchTerm(''); setImportTargetClassId('');
        } catch (err) { console.error("Error importing students:", err); showToast("An error occurred during import.", "error"); }
        finally { setIsImporting(false); }
    };

    const handleBackToClassSelection = () => { setSelectedClassForImport(null); setStudentsToImport(new Set()); setImportTargetClassId(''); };
    const handleOpenEditSubject = (subject) => { setSubjectToActOn(subject); setEditSubjectModalOpen(true); };
    const handleOpenDeleteSubject = (subject) => { setSubjectToActOn(subject); setDeleteSubjectModalOpen(true); };
    const handleAskAiWrapper = (message) => { handleAskAi(message); if (!aiConversationStarted) setAiConversationStarted(true); };

    const filteredLmsClasses = useMemo(() => {
        if (!importClassSearchTerm) return allLmsClasses;
        return allLmsClasses.filter(c => c.name.toLowerCase().includes(importClassSearchTerm.toLowerCase()));
    }, [allLmsClasses, importClassSearchTerm]);

    const activeClasses = classes.filter(c => !c.isArchived);
    const archivedClasses = classes.filter(c => c.isArchived);

    return (
        <>
            {isAiGenerating && <GlobalAiSpinner message="AI is generating content... Please wait." />}
            
            <TeacherDashboardLayout
                handleCreateUnit={handleCreateUnit}
                user={user}
                userProfile={userProfile}
                loading={loading}
                error={error}
                activeView={activeView}
                handleViewChange={handleViewChange}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                logout={logout}
                showToast={showToast}
                activeClasses={activeClasses}
                archivedClasses={archivedClasses}
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
                handleArchiveClass={handleArchiveClass}
                handleDeleteClass={handleDeleteClass}
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
                handleInitiateDelete={handleInitiateDelete}
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
            />

            <Suspense fallback={<GlobalAiSpinner message="Loading..." />}>
                {viewLessonModalOpen && selectedLesson && (
                    <ViewLessonModal 
                        isOpen={viewLessonModalOpen} 
                        onClose={() => setViewLessonModalOpen(false)} 
                        lesson={selectedLesson} 
                        onUpdate={handleUpdateLesson} 
						userRole={user?.role} // ✅ FIX: Pass the user's role to the modal
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
        </>
    );
};

export default TeacherDashboard;