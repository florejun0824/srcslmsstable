// src/pages/TeacherDashboard.jsx
import React, { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase'; 
import { doc, updateDoc, deleteDoc, writeBatch, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { callChatbotAi } from '../services/aiService';

// --- Custom Hooks ---
import { useTeacherData } from '../hooks/useTeacherData';
import { useTeacherActions } from '../hooks/useTeacherActions';
import { usePresentationGenerator } from '../hooks/usePresentationGenerator';
import { useStudentPosts } from '../hooks/useStudentPosts'; 

// --- Components ---
import TeacherDashboardLayout from '../components/teacher/TeacherDashboardLayout';
import GlobalAiSpinner from '../components/common/GlobalAiSpinner';
import PublicProfilePage from './PublicProfilePage'; 
import { ConfirmActionModal } from '../components/common/ConfirmActionModal'; 

// --- Lazy Components ---
const PresentationPreviewModal = lazy(() => import('../components/teacher/PresentationPreviewModal'));
const PresentationGeneratingModal = lazy(() => import('../components/teacher/PresentationGeneratingModal'));
const BetaWarningModal = lazy(() => import('../components/teacher/BetaWarningModal'));
const ViewLessonModal = lazy(() => import('../components/teacher/ViewLessonModal'));

const TeacherDashboard = () => {
  // 1. Context & Router
  const { user, userProfile, logout, refreshUserProfile, firestoreService, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // 2. Navigation Logic
  const getActiveViewFromPath = useCallback((pathname) => {
    const segments = pathname.substring('/dashboard'.length).split('/');
    const pathSegment = segments[1];
    if (pathSegment === 'profile' && segments[2]) return 'publicProfile';
    const validViews = ['lounge', 'studentManagement', 'classes', 'courses', 'analytics', 'profile', 'admin', 'elections'];
    return validViews && validViews.includes(pathSegment) ? pathSegment : 'home';
  }, []);

  const activeView = getActiveViewFromPath(location.pathname);

  // 3. Custom Hooks Integration
  const {
    classes, courses, setCourses, courseCategories, teacherAnnouncements, setTeacherAnnouncements,
    loungePosts, setLoungePosts, loungeUsersMap, allLmsClasses,
    loading: dataLoading, error, isLoungeLoading, isImportViewLoading, fetchLoungePosts
  } = useTeacherData(user, userProfile, activeView);

  const {
    handleCreateUnit, handleDeleteUnit, handleCreateAnnouncement, handleGenerateQuiz,
    handleImportStudents: executeImport, handleRemoveStudentFromClass,
    isAiGenerating, setIsAiGenerating, isImporting
  } = useTeacherActions(userProfile, showToast, classes);

  const {
    isGeneratingPPT, pptProgress, pptStatus, previewData, setPreviewData,
    isSavingPPT, generatePreview, savePresentation
  } = usePresentationGenerator(showToast);

  // Existing Hook for Likes/Comments
  const loungePostUtils = useStudentPosts(loungePosts, setLoungePosts, userProfile?.id, showToast);

  // 4. Local UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHoveringActions, setIsHoveringActions] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Selection State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeUnit, setActiveUnit] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [classToEdit, setClassToEdit] = useState(null);
  const [subjectToActOn, setSubjectToActOn] = useState(null);
  const [lessonsToProcessForPPT, setLessonsToProcessForPPT] = useState({});

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAiHubOpen, setIsAiHubOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiConversationStarted, setAiConversationStarted] = useState(false);

  // Announcement Edit State
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editingAnnText, setEditingAnnText] = useState('');

  // Import View State
  const [importClassSearchTerm, setImportClassSearchTerm] = useState('');
  const [selectedClassForImport, setSelectedClassForImport] = useState(null);
  const [studentsToImport, setStudentsToImport] = useState(new Set());
  const [importTargetClassId, setImportTargetClassId] = useState('');

  // 5. Consolidated Modal State
  const [modals, setModals] = useState({
    createClass: false, createCourse: false, createCategory: false,
    editCategory: false, editClass: false, editSubject: false,
    addUnit: false, editUnit: false, deleteUnit: false,
    addLesson: false, editLesson: false, viewLesson: false,
    addQuiz: false, shareContent: false,
    editProfile: false, changePassword: false,
    archived: false, betaWarning: false, presentationPreview: false,
    deleteGeneric: false, deleteSubject: false
  });

  const toggleModal = (name, isOpen) => setModals(prev => ({ ...prev, [name]: isOpen }));
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [classOverviewModal, setClassOverviewModal] = useState({ isOpen: false, data: null });
  const [confirmArchiveModalState, setConfirmArchiveModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // 6. Effects
  useEffect(() => {
    if (userProfile && messages.length === 0) {
      setMessages([{ sender: 'ai', text: `Hello, ${userProfile?.firstName}! I'm your AI assistant.` }]);
    }
  }, [userProfile, messages.length]);

  useEffect(() => {
    if (activeView === 'lounge' && userProfile?.id) fetchLoungePosts();
  }, [activeView, userProfile?.id, fetchLoungePosts]);

  // 7. Computed Values
  const activeClasses = useMemo(() => classes.filter(c => !c.isArchived), [classes]);
  const archivedClasses = useMemo(() => classes.filter(c => c.isArchived), [classes]);
  const filteredLmsClasses = useMemo(() => {
    if (!importClassSearchTerm) return allLmsClasses;
    // SAFEGUARD: Ensure c.name exists before lowercasing/including
    return allLmsClasses.filter(c => c?.name && c.name.toLowerCase().includes(importClassSearchTerm.toLowerCase()));
  }, [allLmsClasses, importClassSearchTerm]);

  // 8. Event Handlers

  // Navigation
  const handleViewChangeWrapper = useCallback((view) => {
    if (activeView === view) setReloadKey(prev => prev + 1);
    else {
      navigate(view === 'home' ? '/dashboard' : `/dashboard/${view}`);
      setIsSidebarOpen(false);
      setSelectedCategory(null);
    }
  }, [activeView, navigate]);

  // Generic Delete (Subject, Category, Lesson, Quiz)
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { type, id, subjectId } = deleteTarget;

    try {
      if (type === 'class') {
        setIsAiGenerating(true);
        // Uses firestoreService from Context
        await firestoreService.deleteClass(id);
        toggleModal('archived', false);
        showToast("Class deleted.", "success");
      } else if (type === 'unit') {
        await handleDeleteUnit(id, subjectId);
      } else {
        // Batch delete for Subject/Lesson/Quiz
        setIsAiGenerating(true);
        const batch = writeBatch(db);
        
        const markClassesUpdated = (sId) => {
             classes.filter(c => c.subjectId === sId).forEach(c => 
                batch.update(doc(db, "classes", c.id), { contentLastUpdatedAt: serverTimestamp() })
            );
        };

        if (type === 'subject') {
             batch.delete(doc(db, 'courses', id));
             setActiveSubject(null);
        } else if (type === 'lesson') {
            markClassesUpdated(subjectId);
            batch.delete(doc(db, 'lessons', id));
        } else if (type === 'quiz') {
            markClassesUpdated(subjectId);
            batch.delete(doc(db, 'quizzes', id));
            const subs = await getDocs(query(collection(db, 'quizSubmissions'), where('quizId', '==', id)));
            subs.forEach(d => batch.delete(d.ref));
        } else if (type === 'category') {
             showToast("Category deletion is restricted to Admin.", "warning");
             setIsAiGenerating(false);
             toggleModal('deleteGeneric', false);
             return; 
        }

        await batch.commit();
        showToast(`${type} deleted successfully.`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Delete failed.", "error");
    } finally {
      toggleModal('deleteGeneric', false);
      setDeleteTarget(null);
      setIsAiGenerating(false);
    }
  }, [deleteTarget, classes, handleDeleteUnit, showToast, firestoreService]);

  const handleInitiateDelete = useCallback((type, id, name, subjectId = null) => {
    setDeleteTarget({ type, id, name, subjectId });
    toggleModal('deleteGeneric', true);
  }, []);

  // --- Presentation Handlers (FIXED with safeguards) ---
  const handleConfirmBetaWarning = useCallback(async (neverShow, dataOverride = null) => {
    if (neverShow) localStorage.setItem('hidePresentationBetaWarning', 'true');
    toggleModal('betaWarning', false);
  
    // Logic: Use override if present (from immediate call), otherwise use state (from modal confirm)
    const sourceData = dataOverride || lessonsToProcessForPPT;

    // Safety check
    if (!sourceData || !sourceData.data) {
         console.error("Presentation generation failed: Missing source data");
         showToast("Could not generate deck. Please try again.", "error");
         return;
    }
  
    const { ids, data, units, subject } = sourceData;
  
    // Use the explicitly passed subject; fallback to activeSubject, else default object
    const subjectToUse = subject || activeSubject || { title: 'General Knowledge', name: 'General Knowledge' };

    const success = await generatePreview(ids, data, subjectToUse, units);
    if (success) toggleModal('presentationPreview', true);
  }, [lessonsToProcessForPPT, generatePreview, activeSubject, showToast]); 

  const handleInitiatePresentation = useCallback((lessonIds, lessonsData, unitsData, subjectOverride) => {
    const payload = { 
        ids: lessonIds, 
        data: lessonsData, 
        units: unitsData, 
        subject: subjectOverride 
    };

    // Store state for Modal scenario
    setLessonsToProcessForPPT(payload);
  
    const hideWarn = localStorage.getItem('hidePresentationBetaWarning');
    if (hideWarn === 'true') {
        handleConfirmBetaWarning(false, payload);
    } else {
        toggleModal('betaWarning', true);
    }
  }, [handleConfirmBetaWarning, toggleModal]);

  // Chat Handler
  const handleChat = useCallback(async (text) => {
    if (!text.trim()) return;
    setMessages(p => [...p, { sender: 'user', text }]);
    setIsAiThinking(true);
    setAiConversationStarted(true);
    try {
        const res = await callChatbotAi(`User: ${text}`);
        setMessages(p => [...p, { sender: 'ai', text: res }]);
    } catch {
        setMessages(p => [...p, { sender: 'ai', text: "I'm having trouble connecting right now." }]);
    } finally {
        setIsAiThinking(false);
    }
  }, []);

  // Import Wrapper
  const handleImportStudentsWrapper = async () => {
    const success = await executeImport(importTargetClassId, selectedClassForImport, studentsToImport);
    if (success) {
        setStudentsToImport(new Set());
        setSelectedClassForImport(null);
        setImportTargetClassId('');
    }
  };

  // Misc Handlers
  const handleUpdateProfile = async (data) => {
    try {
        await firestoreService.updateUserProfile(user.uid, data);
        await refreshUserProfile();
        showToast('Profile updated!', 'success');
        toggleModal('editProfile', false);
    } catch (e) { showToast('Update failed.', 'error'); }
  };

  const handleUpdateLesson = useCallback((updatedLesson) => {
      setSelectedLesson(updatedLesson);
      setCourses(prev => prev.map(c => ({
          ...c, 
          lessons: c.lessons?.map(l => l.id === updatedLesson.id ? updatedLesson : l)
      })));
  }, [setCourses]);

  if (activeView === 'publicProfile') {
    return <PublicProfilePage />;
  }

  return (
    <>
      {(isAiGenerating || isGeneratingPPT) && (
        <GlobalAiSpinner message={isGeneratingPPT ? "Designing Slides..." : "AI Working..."} />
      )}

      <TeacherDashboardLayout
        // --- Core Data & User ---
        user={user}
        userProfile={userProfile}
        loading={dataLoading || authLoading}
        error={error}
        logout={logout}
        showToast={showToast}
        
        // --- Navigation ---
        activeView={activeView}
        handleViewChange={handleViewChangeWrapper}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        reloadKey={reloadKey}

        // --- Content Data ---
        classes={classes}
        activeClasses={activeClasses}
        archivedClasses={archivedClasses}
        courses={courses}
        courseCategories={courseCategories}
        teacherAnnouncements={teacherAnnouncements}

        // --- Selection State ---
        selectedCategory={selectedCategory}
        handleCategoryClick={setSelectedCategory}
        handleBackToCategoryList={() => setSelectedCategory(null)}
        activeSubject={activeSubject}
        setActiveSubject={setActiveSubject}
        activeUnit={activeUnit}
        onSetActiveUnit={setActiveUnit}
        selectedUnit={selectedUnit}
        selectedLesson={selectedLesson}

        // --- Modals (Mapped from Consolidated State) ---
        isCreateClassModalOpen={modals.createClass}
        setCreateClassModalOpen={(v) => toggleModal('createClass', v)}
        isCreateCourseModalOpen={modals.createCourse}
        setCreateCourseModalOpen={(v) => toggleModal('createCourse', v)}
        isCreateCategoryModalOpen={modals.createCategory}
        setCreateCategoryModalOpen={(v) => toggleModal('createCategory', v)}
        isEditCategoryModalOpen={modals.editCategory}
        setEditCategoryModalOpen={(v) => toggleModal('editCategory', v)}
        isEditClassModalOpen={modals.editClass}
        setEditClassModalOpen={(v) => toggleModal('editClass', v)}
        isAddUnitModalOpen={modals.addUnit}
        setAddUnitModalOpen={(v) => toggleModal('addUnit', v)}
        isShareContentModalOpen={modals.shareContent}
        setShareContentModalOpen={(v) => toggleModal('shareContent', v)}
        editLessonModalOpen={modals.editLesson}
        setEditLessonModalOpen={(v) => toggleModal('editLesson', v)}
        viewLessonModalOpen={modals.viewLesson}
        setViewLessonModalOpen={(v) => toggleModal('viewLesson', v)}
        addLessonModalOpen={modals.addLesson}
        setAddLessonModalOpen={(v) => toggleModal('addLesson', v)}
        addQuizModalOpen={modals.addQuiz}
        setAddQuizModalOpen={(v) => toggleModal('addQuiz', v)}
        deleteUnitModalOpen={modals.deleteUnit}
        setDeleteUnitModalOpen={(v) => toggleModal('deleteUnit', v)}
        editUnitModalOpen={modals.editUnit}
        setEditUnitModalOpen={(v) => toggleModal('editUnit', v)}
        isEditProfileModalOpen={modals.editProfile}
        setEditProfileModalOpen={(v) => toggleModal('editProfile', v)}
        isChangePasswordModalOpen={modals.changePassword}
        setChangePasswordModalOpen={(v) => toggleModal('changePassword', v)}
        isArchivedModalOpen={modals.archived}
        setIsArchivedModalOpen={(v) => toggleModal('archived', v)}
        isEditSubjectModalOpen={modals.editSubject}
        setEditSubjectModalOpen={(v) => toggleModal('editSubject', v)}
        isDeleteSubjectModalOpen={modals.deleteSubject}
        setDeleteSubjectModalOpen={(v) => toggleModal('deleteSubject', v)}
        isDeleteModalOpen={modals.deleteGeneric}
        setIsDeleteModalOpen={(v) => toggleModal('deleteGeneric', v)}
        
        // --- Modal Data Setters ---
        categoryToEdit={categoryToEdit}
        handleEditCategory={(c) => { setCategoryToEdit(c); toggleModal('editCategory', true); }}
        classToEdit={classToEdit}
        handleOpenEditClassModal={(c) => { setClassToEdit(c); toggleModal('editClass', true); }}
        setEditLessonModalOpenData={setSelectedLesson}
        setEditUnitModalOpenData={setSelectedUnit}
        classOverviewModal={classOverviewModal}
        setClassOverviewModal={setClassOverviewModal}
        subjectToActOn={subjectToActOn}
        handleOpenEditSubject={(s) => { setSubjectToActOn(s); toggleModal('editSubject', true); }}
        handleOpenDeleteSubject={(s) => { setSubjectToActOn(s); toggleModal('deleteSubject', true); }}
        isHoveringActions={isHoveringActions}
        setIsHoveringActions={setIsHoveringActions}

        // --- Actions Handlers ---
        handleCreateUnit={(d) => handleCreateUnit(d).then(ok => ok && toggleModal('addUnit', false))}
        handleDeleteClass={(id, name) => handleInitiateDelete('class', id, name)}
        handleArchiveClass={(id, name) => setConfirmArchiveModalState({ 
            isOpen: true, title: "Archive Class?", message: `Archive ${name}?`,
            onConfirm: async () => { await firestoreService.updateClassArchiveStatus(id, true); setConfirmArchiveModalState(p=>({...p, isOpen:false})); showToast("Archived.", "success"); }
        })}
        handleUnarchiveClass={async (id) => { await firestoreService.updateClassArchiveStatus(id, false); showToast("Restored.", "success"); }}
        handleInitiateDelete={handleInitiateDelete}
        handleConfirmDelete={handleConfirmDelete}
        deleteTarget={deleteTarget}
        handleUpdateClass={async (id, data) => { await updateDoc(doc(db,"classes",id), data); toggleModal('editClass', false); showToast("Updated", "success"); }}
        handleUpdateProfile={handleUpdateProfile}
        handleChangePassword={async (pw) => { await firestoreService.updateUserPassword(user.uid, pw); toggleModal('changePassword', false); showToast("Password changed.", "success"); }}
        handleGenerateQuizForLesson={handleGenerateQuiz}
        onGeneratePresentationPreview={handleInitiatePresentation}
        isAiGenerating={isAiGenerating}
        setIsAiGenerating={setIsAiGenerating}
        handleRemoveStudentFromClass={handleRemoveStudentFromClass}

        // --- Import Logic ---
        importClassSearchTerm={importClassSearchTerm}
        setImportClassSearchTerm={setImportClassSearchTerm}
        allLmsClasses={allLmsClasses}
        filteredLmsClasses={filteredLmsClasses}
        isImportViewLoading={isImportViewLoading}
        selectedClassForImport={selectedClassForImport}
        setSelectedClassForImport={setSelectedClassForImport}
        handleBackToClassSelection={() => { setSelectedClassForImport(null); setStudentsToImport(new Set()); }}
        importTargetClassId={importTargetClassId}
        setImportTargetClassId={setImportTargetClassId}
        handleImportStudents={handleImportStudentsWrapper}
        isImporting={isImporting}
        studentsToImport={studentsToImport}
        handleToggleStudentForImport={(id) => setStudentsToImport(prev => { const n=new Set(prev); if(n.has(id))n.delete(id); else n.add(id); return n; })}
        handleSelectAllStudents={() => {/* Logic can be inline or helper */}}

        // --- Announcement Logic ---
        handleCreateAnnouncement={handleCreateAnnouncement}
        editingAnnId={editingAnnId}
        setEditingAnnId={setEditingAnnId}
        editingAnnText={editingAnnText}
        setEditingAnnText={setEditingAnnText}
        handleStartEditAnn={(p) => { setEditingAnnId(p.id); setEditingAnnText(p.content); }}
        handleUpdateTeacherAnn={async () => { await updateDoc(doc(db,'teacherAnnouncements',editingAnnId), { content: editingAnnText }); setEditingAnnId(null); showToast("Updated", "success"); }}
        handleDeleteTeacherAnn={async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db,'teacherAnnouncements',id)); }}
        handleTogglePinAnnouncement={async (id, s) => { if(userProfile.role!=='admin') return; await updateDoc(doc(db,'teacherAnnouncements',id), { isPinned: !s }); }}

        // --- Chat & Lounge ---
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        messages={messages}
        isAiThinking={isAiThinking}
        handleAskAiWrapper={handleChat}
        handleAskAi={handleChat}
        aiConversationStarted={aiConversationStarted}
        setAiConversationStarted={setAiConversationStarted}
        isAiHubOpen={isAiHubOpen}
        setIsAiHubOpen={setIsAiHubOpen}
        loungePosts={loungePosts}
        isLoungeLoading={isLoungeLoading}
        loungeUsersMap={loungeUsersMap}
        fetchLoungePosts={fetchLoungePosts}
        loungePostUtils={loungePostUtils}
      />

      {/* --- Suspended Modals --- */}
      <Suspense fallback={<GlobalAiSpinner message="Loading..." />}>
        <PresentationGeneratingModal 
            isOpen={isGeneratingPPT} 
            progress={pptProgress} 
            status={pptStatus} 
        />
        
        {modals.viewLesson && selectedLesson && (
          <ViewLessonModal 
            isOpen={modals.viewLesson} 
            onClose={() => toggleModal('viewLesson', false)} 
            lesson={selectedLesson} 
            onUpdate={handleUpdateLesson} 
            userRole={user?.role}
          />
        )}
        
        {modals.betaWarning && (
            <BetaWarningModal 
                isOpen={modals.betaWarning} 
                onClose={() => toggleModal('betaWarning', false)} 
                onConfirm={() => handleConfirmBetaWarning(false)} 
                title="AI Presentation Generator" 
            />
        )}
        
        {modals.presentationPreview && (
          <PresentationPreviewModal 
            isOpen={modals.presentationPreview} 
            onClose={() => toggleModal('presentationPreview', false)} 
            previewData={previewData} 
            onConfirm={() => savePresentation(activeSubject)} 
            isSaving={isSavingPPT} 
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