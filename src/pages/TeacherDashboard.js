import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addDoc, serverTimestamp, collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { callGeminiWithLimitCheck } from '../services/aiService';
import { createPresentationFromData } from '../services/googleSlidesService';
import TeacherDashboardLayout from '../components/teacher/TeacherDashboardLayout';
import PresentationPreviewModal from '../components/teacher/PresentationPreviewModal';
import BetaWarningModal from '../components/teacher/BetaWarningModal'; // ✅ ADDED: Import the BetaWarningModal

const LMS_KNOWLEDGE_BASE = `
  System Features Overview:
  - Course & Subject Management: Teachers can create subject categories (e.g., "Math", "Science") and then create specific courses/subjects within those categories (e.g., "Algebra 1"). Courses are made up of units.
  - Unit & Lesson Management: Within each course, teachers can create units. Inside units, they can create multi-page lessons and quizzes.
  - AI-Powered Content Generation: Teachers can use AI to generate lessons and quizzes.
    - AI Lesson Generator: Creates a lesson plan based on a topic.
    - AI Quiz Generator: Creates a 10-question multiple-choice quiz from a lesson's content.
  - Class Management: Teachers can create classes, each with a unique class code for student enrollment. They can archive and delete classes. Students can be removed from a class roster via the Class Overview modal.
  - Student Management: Teachers can view a list of all classes in the LMS and import students from any class into one of their own classes.
  - Announcements: Teachers can post announcements for all other teachers, or create announcements for specific classes they teach.
  - Profile Management: Teachers can edit their profile information and change their password.
  - Admin Console: Users with the 'admin' role have access to a special Admin Console for system-wide management.
`;

const TeacherDashboard = () => {
    const { user, userProfile, logout, firestoreService, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [classes, setClasses] = useState([]);
    const [courses, setCourses] = useState([]);
    const [courseCategories, setCourseCategories] = useState([]);
    const [teacherAnnouncements, setTeacherAnnouncements] = useState([]);
    const [allUnits, setAllUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    
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

    // ✅ ADDED: State for the new Beta Warning Modal flow
    const [isBetaWarningModalOpen, setIsBetaWarningModalOpen] = useState(false);
    const [lessonsToProcessForPPT, setLessonsToProcessForPPT] = useState([]);


    useEffect(() => {
        if (userProfile && messages.length === 0) {
            setMessages([
                { sender: 'ai', text: `Hello, ${userProfile?.firstName}! I'm Lumina, your AI assistant. How can I help you navigate the SRCS LMS today?` }
            ]);
        }
    }, [userProfile, messages.length]);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        const teacherId = user.uid || user.id;
        if (!teacherId) { setLoading(false); setError("User ID not found."); return; }
        const queries = [
            { query: query(collection(db, "subjectCategories"), orderBy("name")), setter: setCourseCategories },
            { query: query(collection(db, "classes"), where("teacherId", "==", teacherId)), setter: setClasses },
            { query: query(collection(db, "courses")), setter: setCourses },
            { query: query(collection(db, "teacherAnnouncements"), orderBy("createdAt", "desc")), setter: setTeacherAnnouncements },
            { query: query(collection(db, "units"), orderBy("createdAt")), setter: setAllUnits },
            { query: query(collection(db, "lessons"), orderBy("createdAt")), setter: setAllLessons },
        ];
        const unsubscribers = queries.map(({ query, setter }) =>
            onSnapshot(query, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(data);
            }, (err) => { console.error("Firestore snapshot error:", err); setError("Failed to load dashboard data in real-time."); })
        );
        const categoriesQuery = query(collection(db, "subjectCategories"));
        const unsubLoader = onSnapshot(categoriesQuery, () => { setLoading(false); unsubLoader(); });
        return () => { unsubscribers.forEach(unsub => unsub()); unsubLoader(); };
    }, [user]);

    useEffect(() => {
        if (activeView === 'studentManagement') {
            setIsImportViewLoading(true);
            const q = query(collection(db, "classes"), orderBy("name"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const allClassesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllLmsClasses(allClassesData);
                setIsImportViewLoading(false);
            }, (err) => { console.error("Error fetching all classes:", err); showToast("Failed to load class list.", "error"); setIsImportViewLoading(false); });
            return () => unsubscribe();
        }
    }, [activeView, showToast]);

    const handleCreateAnnouncement = async ({ content, audience, classId, className }) => {
        if (!content.trim()) { showToast("Announcement content cannot be empty.", "error"); return; }
        const collectionName = audience === 'teachers' ? 'teacherAnnouncements' : 'studentAnnouncements';
        const announcementData = { content, teacherId: userProfile?.id, teacherName: `${userProfile?.firstName} ${userProfile?.lastName}`, createdAt: serverTimestamp() };
        if (audience === 'students') {
            if (!classId) { showToast("Please select a class for the student announcement.", "error"); return; }
            announcementData.classId = classId;
            announcementData.className = className;
        }
        try { await addDoc(collection(db, collectionName), announcementData); showToast("Announcement posted successfully!", "success"); }
        catch (error) { console.error("Error posting announcement:", error); showToast("Failed to post announcement.", "error"); }
    };

    const handleAskAi = async (userMessage) => {
        if (!userMessage.trim()) return;
        const newMessages = [...messages, { sender: 'user', text: userMessage }];
        setMessages(newMessages);
        setIsAiThinking(true);
        const conversationHistory = newMessages.map(msg => `${msg.sender === 'user' ? 'Teacher' : 'Lumina'}: ${msg.text}`).join('\n');
        const prompt = `You are Lumina, an expert AI assistant for a teacher using the SRCS Learning Management System. Your personality is helpful, friendly, and knowledgeable. Use the following information about the LMS to answer the teacher's questions accurately.\n---\nLMS KNOWLEDGE BASE:\n${LMS_KNOWLEDGE_BASE}\n---\nBelow is the current conversation history. Use it to understand the context of the new question.\n---\nCONVERSATION HISTORY:\n${conversationHistory}\n---\nNow, please provide a concise and helpful answer to the Teacher's latest message.`;
        try {
            const aiResponseText = await callGeminiWithLimitCheck(prompt);
            const newAiMessage = { sender: 'ai', text: aiResponseText };
            setMessages(prev => [...prev, newAiMessage]);
        } catch (error) {
            const errorMessage = { sender: 'ai', text: "I seem to be having trouble connecting. My apologies. Please try again in a moment." };
            setMessages(prev => [...prev, errorMessage]);
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
        const lessonContent = lesson.pages.map(page => `Page Title: ${page.title}\n\n${page.content}`).join('\n\n---\n\n');
        const prompt = `Based on the following lesson content, generate a 10-question multiple-choice quiz. The quiz title should be: "Quiz for: ${lesson.title}". The output must be a single, valid JSON object. The JSON object must have two keys: "title" (a string) and "questions" (an array of objects). Each object in the "questions" array must have these exact keys: "text", "options" (an array of 4 strings), and "correctAnswerIndex" (a number from 0 to 3). LESSON CONTENT:\n---\n${lessonContent}`;
        try {
            const aiResponseText = await callGeminiWithLimitCheck(prompt);
            const generatedQuiz = JSON.parse(aiResponseText);
            await addDoc(collection(db, 'quizzes'), { title: generatedQuiz.title, questions: generatedQuiz.questions, unitId: unitId, subjectId: subjectId, createdAt: serverTimestamp(), });
            showToast("AI has successfully generated and saved the new quiz!", "success");
        } catch (error) {
            if (error.message === 'LIMIT_REACHED') { showToast("The AI Assistant has reached its monthly usage limit.", "info"); }
            else { showToast("The AI Assistant could not generate a quiz. Please try again.", "error"); console.error("AI Generation Error:", error); }
        } finally { setIsAiGenerating(false); }
    };

    // ✅ ADDED: This function now just opens the warning modal
    const handleInitiatePresentationGeneration = (lessonIds) => {
        if (!lessonIds || lessonIds.length === 0) {
            showToast("Please select one or more lessons to include in the presentation.", "warning");
            return;
        }
        setLessonsToProcessForPPT(lessonIds);
        setIsBetaWarningModalOpen(true);
    };

    // ✅ MODIFIED: This function is now the confirmation action. It uses `lessonsToProcessForPPT` from state.
	const handleGeneratePresentationPreview = async () => {
        const lessonIds = lessonsToProcessForPPT; // Use lesson IDs from state

	    if (!activeSubject) {
	        showToast("No active subject selected. This is required for folder creation.", "warning");
	        return;
	    }

	    setIsAiGenerating(true);
	    showToast("Gathering content and generating preview...", "info");

	    try {
	        const selectedLessonsData = allLessons.filter(l => lessonIds.includes(l.id));

	        if (selectedLessonsData.length === 0) {
	            throw new Error("No lesson data found for the selected IDs.");
	        }

	        const allLessonContent = selectedLessonsData
	            .map(lesson => {
	                if (!lesson.pages || lesson.pages.length === 0) {
	                    console.warn(`[SKIPPED] Lesson "${lesson.title}" has no pages.`);
	                    return '';
	                }

	                const validPages = lesson.pages.filter(
	                    page => page.content && page.content.trim() !== ''
	                );

	                if (validPages.length === 0) {
	                    console.warn(`[SKIPPED] Lesson "${lesson.title}" has no valid content.`);
	                    return '';
	                }

	                const pageText = validPages
	                    .map(page => `Page Title: ${page.title}\n${page.content.trim()}`)
	                    .join('\n\n');

	                return `Lesson: ${lesson.title}\n${pageText}`;
	            })
	            .filter(entry => entry.trim() !== '')
	            .join('\n\n---\n\n');

	        if (!allLessonContent || allLessonContent.trim().length === 0) {
	            throw new Error("Selected lessons contain no usable content to generate slides.");
	        }

			const presentationPrompt = `You are a master educator and curriculum designer. Your goal is to transform the provided lesson text into a masterfully structured and highly effective educational presentation.

			**CRITICAL INSTRUCTIONS:**
			1.  **JSON Output:** Your response MUST be a single, valid JSON object with a key "slides" which is an array of objects.
			2.  **Slide Object Structure:** Each slide object MUST have three string keys: "title", "body", and "notes".
			3.  **One Idea Per Slide:** This is the most important rule.
			    - Be extremely aggressive in splitting content. A single paragraph from the source may need to become 2-3 slides.
			    - If you see a concept and an example for it, they MUST be on separate slides.
			    - Never put more than one key concept, definition, or major point on a single slide. Avoid slides with titles like "Concept (Part 2)".
			4.  **Body Formatting Rules:**
			    - Use well-written paragraphs by default for all explanations and discussions.
			    - ONLY use bullet points when the source text provides an explicit list (e.g., components, steps, features, pros/cons).
			    - When using bullet points, start each item with "- ".
			    - Never mix paragraphs and bullet points in the same slide body.
			5.  **No Markdown:** The output text in "title", "body", and "notes" fields MUST be plain text. Do NOT include any markdown like ** or *.
			6.  **Speaker Notes:** The "notes" field for each slide MUST include a section labeled "Essential Questions:" containing 1-2 thought-provoking questions for the teacher to ask students.
			7.  **Specific Slides:**
			    - The first slide's title should be the overall presentation title.
			    - The second slide's title must be "Learning Objectives", with the body containing a bulleted list of 3-5 objectives.

			**LESSON CONTENT TO PROCESS:**
			---
			${allLessonContent}`;

	        const aiResponseText = await callGeminiWithLimitCheck(presentationPrompt);

	        const jsonText = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || aiResponseText;
	        const parsedData = JSON.parse(jsonText);

	        if (!parsedData.slides || !Array.isArray(parsedData.slides)) {
	            throw new Error("AI response did not contain a valid 'slides' array.");
	        }

	        setPresentationPreviewData({ ...parsedData, lessonIds });
	        setPresentationPreviewModalOpen(true);

	    } catch (error) {
	        console.error("Presentation Preview Generation Error:", error);
	        showToast(`Preview Error: ${error.message}`, "error");
	    } finally {
	        setIsAiGenerating(false);
	    }
	};

	const handleCreatePresentation = async () => {
	  if (!presentationPreviewData) {
	    showToast("No preview data available to create a presentation.", "error");
	    return;
	  }

	  setIsSavingPresentation(true);
	  try {
	    const { slides, lessonIds } = presentationPreviewData;

	    const firstLesson = allLessons.find(l => l.id === lessonIds[0]);
	    if (!firstLesson) throw new Error("First lesson not found.");

	    const unit = allUnits.find(u => u.id === firstLesson.unitId);
	    if (!unit) throw new Error("Associated unit not found.");

	    const subjectName = activeSubject?.title || "Untitled Subject";
	    const unitName = unit.name || "Untitled Unit";

	    const sourceTitle = lessonIds.length > 1
	      ? `${unitName} Summary`
	      : firstLesson.title;

	    const presentationTitle = `Presentation for: ${sourceTitle}`;

	    const cleanedSlides = slides.map(slide => ({
	      ...slide,
	      body: slide.body
	        .split('\n')
	        .map(line => line.trim())
	        .join('\n'),
	      notes: slide.notes?.trim() || ''
	    }));

	    const presentationUrl = await createPresentationFromData(
	      cleanedSlides,
	      presentationTitle,
	      subjectName,
	      unitName
	    );

	    window.open(presentationUrl, '_blank');

	    // ✅ MODIFIED: Changed the toast message for clarity
	    showToast("Presentation created! You can now copy the notes.", "success");
    
	    // ✅ MODIFIED: This line is removed to keep the modal open
	    // setPresentationPreviewModalOpen(false); 

	  } catch (error) {
	    console.error("Presentation Creation Error:", error);
	    showToast(`Creation Error: ${error.message}`, "error");
	  } finally {
	    setIsSavingPresentation(false);
	  }
	};

    const handleInitiateDelete = (type, id, unitId, subjectId) => { setDeleteTarget({ type, id, unitId, subjectId }); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async (confirmationText) => {
        if (confirmationText !== 'srcsadmin') { showToast("Incorrect confirmation text entered.", "error"); return; }
        if (!deleteTarget) { showToast("An error occurred. Please try again.", "error"); return; }
        try {
            const { type, id } = deleteTarget;
            const collectionName = type === 'lesson' ? 'lessons' : 'quizzes';
            const itemRef = doc(db, collectionName, id);
            await deleteDoc(itemRef);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`, "success");
        } catch (error) { console.error("Error during deletion:", error); showToast("An error occurred. Could not delete the item.", "error"); }
        finally { setIsDeleteModalOpen(false); setDeleteTarget(null); }
    };
    
    const filteredLmsClasses = useMemo(() => {
        if (!importClassSearchTerm) return allLmsClasses;
        return allLmsClasses.filter(c => c.name.toLowerCase().includes(importClassSearchTerm.toLowerCase()));
    }, [allLmsClasses, importClassSearchTerm]);
    
    const activeClasses = classes.filter(c => !c.isArchived);
    const archivedClasses = classes.filter(c => c.isArchived);
    const handleViewChange = (view) => { setActiveView(view); setSelectedCategory(null); setIsSidebarOpen(false); };
    const handleCategoryClick = (categoryName) => { setSelectedCategory(categoryName); };
    const handleBackToCategoryList = () => { setSelectedCategory(null); };
    const handleOpenEditClassModal = (classData) => { setClassToEdit(classData); setEditClassModalOpen(true); };
    const handleEditCategory = (category) => { setCategoryToEdit(category); setEditCategoryModalOpen(true); };
    
    const handleUpdateProfile = async (newData) => {
        try {
            const userId = user.uid || user.id;
            await firestoreService.updateUserProfile(userId, newData);
            await refreshUserProfile();
            showToast('Profile updated successfully!', 'success');
            setEditProfileModalOpen(false);
        } catch (err) { showToast('Failed to update profile.', 'error'); console.error(err); }
    };

    const handleChangePassword = async (newPassword) => {
        try {
            const userId = user.uid || user.id;
            await firestoreService.updateUserPassword(userId, newPassword);
            showToast('Password changed successfully!', 'success');
            setChangePasswordModalOpen(false);
        } catch (err) { showToast('Failed to change password.', 'error'); console.error(err); }
    };
    
    const handleArchiveClass = async (classId) => {
        if (window.confirm("Are you sure you want to archive this class? It will be hidden from the main view.")) {
            try { await firestoreService.updateClassArchiveStatus(classId, true); showToast("Class archived successfully.", "success"); }
            catch (error) { showToast("Failed to archive class.", "error"); }
        }
    };
    
    const handleUnarchiveClass = async (classId) => {
        try { await firestoreService.updateClassArchiveStatus(classId, false); showToast("Class restored successfully.", "success"); }
        catch (error) { showToast("Failed to restore class.", "error"); }
    };
    
    const handleDeleteClass = async (classId, isArchivedView = false) => {
        if (window.confirm("Are you sure you want to permanently delete this class? This action cannot be undone.")) {
            try {
                await firestoreService.deleteClass(classId);
                showToast("Class permanently deleted.", "success");
                if (isArchivedView) setIsArchivedModalOpen(false);
            } catch (error) { showToast("Failed to delete class.", "error"); }
        }
    };

    const handleStartEditAnn = (post) => { setEditingAnnId(post.id); setEditingAnnText(post.content); };
    const handleUpdateTeacherAnn = async () => {
        if (!editingAnnText.trim()) return showToast("Announcement cannot be empty.", "error");
        try {
            await updateDoc(doc(db, 'teacherAnnouncements', editingAnnId), { content: editingAnnText });
            showToast("Announcement updated.", "success");
            setEditingAnnId(null);
        } catch (error) { showToast("Failed to update announcement.", "error"); }
    };
    
    const handleDeleteTeacherAnn = async (id) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            await deleteDoc(doc(db, 'teacherAnnouncements', id));
            showToast("Announcement deleted.", "success");
        }
    };

    const handleToggleStudentForImport = (studentId) => {
        setStudentsToImport(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) { newSet.delete(studentId); }
            else { newSet.add(studentId); }
            return newSet;
        });
    };
    
    const handleSelectAllStudents = () => {
        if (!selectedClassForImport?.students) return;
        const studentIdsInSelectedClass = selectedClassForImport.students.map(s => s.id);
        const allCurrentlySelected = studentIdsInSelectedClass.length > 0 && studentIdsInSelectedClass.every(id => studentsToImport.has(id));
        if (allCurrentlySelected) { setStudentsToImport(new Set()); }
        else { setStudentsToImport(new Set(studentIdsInSelectedClass)); }
    };
    
    const handleImportStudents = async () => {
        if (!importTargetClassId) return showToast("Please select a class to import students into.", "error");
        if (studentsToImport.size === 0) return showToast("Please select at least one student to import.", "error");
        setIsImporting(true);
        try {
            const studentsToAdd = selectedClassForImport.students.filter(s => studentsToImport.has(s.id));
            await updateDoc(doc(db, "classes", importTargetClassId), { students: arrayUnion(...studentsToAdd) });
            showToast(`${studentsToImport.size} student(s) imported successfully!`, 'success');
            setStudentsToImport(new Set());
            setSelectedClassForImport(null);
            setImportClassSearchTerm('');
            setImportTargetClassId('');
        } catch (err) { console.error("Error importing students:", err); showToast("An error occurred during the import.", "error"); }
        finally { setIsImporting(false); }
    };
    
    const handleBackToClassSelection = () => { setSelectedClassForImport(null); setStudentsToImport(new Set()); setImportTargetClassId(''); };
    const handleOpenEditSubject = (subject) => { setSubjectToActOn(subject); setEditSubjectModalOpen(true); };
    const handleOpenDeleteSubject = (subject) => { setSubjectToActOn(subject); setDeleteSubjectModalOpen(true); };
    const handleAskAiWrapper = (message) => {
        handleAskAi(message);
        if (!aiConversationStarted) {
            setAiConversationStarted(true);
        }
    };

    return (
        <>
            <TeacherDashboardLayout
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
                onGeneratePresentationPreview={handleInitiatePresentationGeneration} // ✅ MODIFIED: Pass the new initiator function
                isAiGenerating={isAiGenerating}
                setEditProfileModalOpen={setEditProfileModalOpen}
                setChangePasswordModalOpen={setChangePasswordModalOpen}
                editingAnnId={editingAnnId}
                editingAnnText={editingAnnText}
                setEditingAnnText={setEditingAnnText}
                handleStartEditAnn={handleStartEditAnn}
                handleUpdateTeacherAnn={handleUpdateTeacherAnn}
                setEditingAnnId={setEditingAnnId}
                handleDeleteTeacherAnn={handleDeleteTeacherAnn}
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
                setIsAiGenerating={setIsAiGenerating}
                isAiHubOpen={isAiHubOpen}
                setIsAiHubOpen={setIsAiHubOpen}
            />
            {/* ✅ ADDED: Render the BetaWarningModal */}
            <BetaWarningModal
                isOpen={isBetaWarningModalOpen}
                onClose={() => setIsBetaWarningModalOpen(false)}
                onConfirm={() => {
                    setIsBetaWarningModalOpen(false);
                    handleGeneratePresentationPreview();
                }}
            />
			<PresentationPreviewModal
			    isOpen={isPresentationPreviewModalOpen}
			    onClose={() => setPresentationPreviewModalOpen(false)}
			    previewData={presentationPreviewData}
			    onConfirm={handleCreatePresentation}
			    isSaving={isSavingPresentation}
			/>
        </>
    );
};

export default TeacherDashboard;