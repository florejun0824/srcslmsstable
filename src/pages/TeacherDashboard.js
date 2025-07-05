import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../services/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../services/aiService'; // Import the new AI service
import {
  HomeIcon, AcademicCapIcon, BookOpenIcon, UserIcon, ShieldCheckIcon, Bars3Icon,
  ArrowLeftOnRectangleIcon, MagnifyingGlassIcon, PlusCircleIcon,
  ExclamationTriangleIcon, UserGroupIcon, BeakerIcon, GlobeAltIcon, CalculatorIcon,
  PaintBrushIcon, ComputerDesktopIcon, CodeBracketIcon, MusicalNoteIcon,
  ClipboardDocumentListIcon, PencilSquareIcon, KeyIcon, EnvelopeIcon, IdentificationIcon,
  MegaphoneIcon, ArchiveBoxIcon, TrashIcon, ClipboardIcon,
  UserPlusIcon, ArrowUturnLeftIcon 
} from '@heroicons/react/24/outline';

import Spinner from '../components/common/Spinner';
import EditClassModal from '../components/common/EditClassModal';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import SidebarButton from '../components/common/SidebarButton';
import AdminDashboard from './AdminDashboard';
import CreateAnnouncement from '../components/teacher/CreateAnnouncement';
import ClassOverviewModal from '../components/teacher/ClassOverviewModal';
import CreateClassModal from '../components/teacher/CreateClassModal';
import CreateCourseModal from '../components/teacher/CreateCourseModal';
import CreateCategoryModal from '../components/teacher/CreateCategoryModal';
import EditCategoryModal from '../components/teacher/EditCategoryModal';
import UnitAccordion from '../components/teacher/UnitAccordion';
import AddUnitModal from '../components/teacher/AddUnitModal';
import ShareMultipleLessonsModal from '../components/teacher/ShareMultipleLessonsModal';
import EditLessonModal from '../components/teacher/EditLessonModal';
import ViewLessonModal from '../components/teacher/ViewLessonModal';
import AddQuizModal from '../components/teacher/AddQuizModal';
import DeleteUnitModal from '../components/teacher/DeleteUnitModal';
import EditUnitModal from '../components/teacher/EditUnitModal';
import AddLessonModal from '../components/teacher/AddLessonModal';
import EditProfileModal from '../components/teacher/EditProfileModal';
import ChangePasswordModal from '../components/teacher/ChangePasswordModal';
import ArchivedClassesModal from '../components/teacher/ArchivedClassesModal';
import DeleteConfirmationModal from '../components/teacher/DeleteConfirmationModal';

const TeacherDashboard = () => {
    const { user, userProfile, logout, firestoreService, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [classes, setClasses] = useState([]);
    const [courses, setCourses] = useState([]);
    const [courseCategories, setCourseCategories] = useState([]);
    const [teacherAnnouncements, setTeacherAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('home');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [activeSubject, setActiveSubject] = useState(null);
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

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        const teacherId = user.uid || user.id;
        if (!teacherId) { setLoading(false); setError("User ID not found."); return; }
        const queries = [
            { query: query(collection(db, "subjectCategories"), orderBy("name")), setter: setCourseCategories },
            { query: query(collection(db, "classes"), where("teacherId", "==", teacherId)), setter: setClasses },
            { query: query(collection(db, "courses")), setter: setCourses },
            { query: query(collection(db, "teacherAnnouncements"), orderBy("createdAt", "desc")), setter: setTeacherAnnouncements }
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

    useEffect(() => {
        if (selectedCategory) {
            const categoryCourses = courses.filter(c => c.category === selectedCategory);
            setActiveSubject(categoryCourses.length > 0 ? categoryCourses[0] : null);
        } else {
            setActiveSubject(null);
        }
    }, [selectedCategory, courses]);
    
    const handleGenerateQuizForLesson = async (lesson, unitId, subjectId) => {
        if (isAiGenerating) return;
        if (!window.confirm(`This will use the AI to generate a new quiz based on the lesson "${lesson.title}". Continue?`)) {
            return;
        }
        setIsAiGenerating(true);
        showToast("AI is generating your quiz... This may take a moment.", "info");
        const lessonContent = lesson.pages.map(page => `Page Title: ${page.title}\n\n${page.content}`).join('\n\n---\n\n');
        const prompt = `
            Based on the following lesson content, generate a 10-question multiple-choice quiz.
            The quiz title should be: "Quiz for: ${lesson.title}".
            The output must be a single, valid JSON object.
            The JSON object must have two keys: "title" (a string) and "questions" (an array of objects).
            Each object in the "questions" array must have these exact keys: "text", "options" (an array of 4 strings), and "correctAnswerIndex" (a number from 0 to 3).
            LESSON CONTENT:\n---\n${lessonContent}`;
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
            showToast("AI has successfully generated and saved the new quiz!", "success");
        } catch (error) {
            if (error.message === 'LIMIT_REACHED') {
                showToast("The AI Assistant has reached its monthly usage limit.", "info");
            } else {
                showToast("The AI Assistant could not generate a quiz. Please try again.", "error");
                console.error("AI Generation Error:", error);
            }
        } finally {
            setIsAiGenerating(false);
        }
    };

    const handleInitiateDelete = (type, id, unitId, subjectId) => {
        setDeleteTarget({ type, id, unitId, subjectId });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (confirmationText) => {
        if (confirmationText !== 'srcsadmin') {
            showToast("Incorrect confirmation text entered.", "error");
            return;
        }
        if (!deleteTarget) {
            showToast("An error occurred. Please try again.", "error");
            return;
        }
        try {
            const { type, id } = deleteTarget;
            const collectionName = type === 'lesson' ? 'lessons' : 'quizzes';
            const itemRef = doc(db, collectionName, id);
            await deleteDoc(itemRef);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`, "success");
        } catch (error) {
            console.error("Error during deletion:", error);
            showToast("An error occurred. Could not delete the item.", "error");
        } finally {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
        }
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
        } catch (err) { console.error("Error importing students:", err); showToast("An error occurred during the import.", "error");
        } finally { setIsImporting(false); }
    };
    const handleBackToClassSelection = () => { setSelectedClassForImport(null); setStudentsToImport(new Set()); setImportTargetClassId(''); };

    const renderMainContent = () => {
        if (loading) return <Spinner />;
        if (error) { 
            return (
                <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded-md shadow-md">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 mt-1" />
                        <div><strong className="block">An error occurred</strong><span>{error}</span></div>
                    </div>
                </div>
            );
        }

        const wrapper = "bg-white/70 backdrop-blur-md border border-white/30 p-4 sm:p-6 rounded-xl shadow";
        const classVisuals = [ { icon: AcademicCapIcon, color: 'from-orange-500 to-red-500' }, { icon: UserGroupIcon, color: 'from-blue-500 to-sky-500' }, { icon: ClipboardDocumentListIcon, color: 'from-yellow-500 to-amber-500' }, { icon: ShieldCheckIcon, color: 'from-green-500 to-lime-500' }, ];
        const subjectVisuals = [ { icon: BookOpenIcon, color: 'from-sky-500 to-indigo-500' }, { icon: CalculatorIcon, color: 'from-green-500 to-emerald-500' }, { icon: BeakerIcon, color: 'from-violet-500 to-purple-500' }, { icon: GlobeAltIcon, color: 'from-rose-500 to-pink-500' }, { icon: ComputerDesktopIcon, color: 'from-slate-600 to-slate-800' }, { icon: PaintBrushIcon, color: 'from-amber-500 to-orange-500' }, { icon: UserGroupIcon, color: 'from-teal-500 to-cyan-500' }, { icon: CodeBracketIcon, color: 'from-gray-700 to-gray-900' }, { icon: MusicalNoteIcon, color: 'from-fuchsia-500 to-purple-600' }, ];
        const gradientButtonStyle = "flex items-center justify-center px-4 py-2 font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed";

        if (activeView === 'admin') return <div className={wrapper}><AdminDashboard /></div>;
        
        switch (activeView) {
        case 'studentManagement': 
            if (selectedClassForImport) {
                return (
                    <div>
                        <div className="mb-6"><button onClick={handleBackToClassSelection} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 font-semibold"><ArrowUturnLeftIcon className="w-4 h-4" />Back to Class Selection</button><h1 className="text-3xl font-bold text-gray-800">Import Students</h1><p className="text-gray-500 mt-1">Import students from <span className="font-semibold text-gray-700">"{selectedClassForImport.name}"</span> into your class.</p></div>
                        <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
                            <div><h2 className="text-lg font-semibold text-gray-700 mb-2">1. Import To Your Class</h2><div className="flex flex-col md:flex-row items-start md:items-center gap-4"><select value={importTargetClassId} onChange={e => setImportTargetClassId(e.target.value)} className="w-full md:w-auto flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="">-- Choose one of your classes --</option>{activeClasses.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.gradeLevel} - {c.section})</option>))}</select><button onClick={handleImportStudents} disabled={!importTargetClassId || isImporting || studentsToImport.size === 0} className={`${gradientButtonStyle} w-full md:w-auto gap-2`}><UserPlusIcon className="w-5 h-5" />{isImporting ? 'Importing...' : `Import ${studentsToImport.size} Student(s)`}</button></div></div>
                            <div><h2 className="text-lg font-semibold text-gray-700 mb-2">2. Select Students</h2><div className="border rounded-lg max-h-80 overflow-y-auto"><div className="flex items-center gap-4 p-3 border-b bg-gray-50 sticky top-0 z-10"><input type="checkbox" onChange={handleSelectAllStudents} checked={(selectedClassForImport.students?.length || 0) > 0 && studentsToImport.size === selectedClassForImport.students.length} id="select-all-students" className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500" /><label htmlFor="select-all-students" className="font-semibold text-gray-800">Select All ({selectedClassForImport.students?.length || 0})</label></div>{(selectedClassForImport.students && selectedClassForImport.students.length > 0) ? selectedClassForImport.students.map(student => (<div key={student.id} onClick={() => handleToggleStudentForImport(student.id)} className={`flex items-center gap-4 p-3 border-b last:border-b-0 cursor-pointer transition-colors ${studentsToImport.has(student.id) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}><input type="checkbox" readOnly checked={studentsToImport.has(student.id)} className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500 pointer-events-none" /><UserInitialsAvatar firstName={student.firstName} lastName={student.lastName} /><div><p className="font-semibold text-gray-800">{student.firstName} {student.lastName}</p><p className="text-sm text-gray-500">{student.gradeLevel || 'N/A'}</p></div></div>)) : (<p className="p-4 text-center text-gray-500">This class has no students.</p>)}</div></div>
                        </div>
                    </div>
                );
            }
            return (
                <div>
                    <div className="mb-6"><h1 className="text-3xl font-bold text-gray-800">Browse Classes</h1><p className="text-gray-500 mt-1">Select a class below to import students from it.</p></div>
                    <div className="mb-6 sticky top-0 bg-slate-100 py-3 z-20"><div className="relative"><MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/><input type="text" placeholder={`Filter from ${allLmsClasses.length} classes...`} value={importClassSearchTerm} onChange={e => setImportClassSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div></div>
                    {isImportViewLoading ? <Spinner /> : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredLmsClasses.length > 0 ? filteredLmsClasses.map((c, index) => {const { icon: Icon, color } = classVisuals[index % classVisuals.length]; return (<div key={c.id} onClick={() => setSelectedClassForImport(c)} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"><div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all`}></div><div className="relative z-10 flex flex-col h-full"><div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4 self-start`}><Icon className="w-8 h-8" /></div><h2 className="text-xl font-bold text-gray-800 truncate mb-1">{c.name}</h2><p className="text-gray-500">{c.gradeLevel} - {c.section}</p><div className="mt-auto pt-4 border-t border-gray-100"><p className="text-xs text-gray-500">{c.students?.length || 0} student(s)</p></div></div></div>);}) : (<p className="col-span-full text-center text-gray-500 py-10">No classes match your search.</p>)}</div>)}
                </div>
            );
        case 'courses':
            if (selectedCategory) {
                const categoryCourses = courses.filter(c => c.category === selectedCategory);
                const handleSubjectChange = (e) => { const newActiveSubject = categoryCourses.find(c => c.id === e.target.value); setActiveSubject(newActiveSubject); };
                return (
                  <div className="w-full">
                      <div className="flex items-center gap-2 mb-4"><button onClick={handleBackToCategoryList} className="text-gray-700 p-2 rounded-full hover:bg-gray-200"><ArrowUturnLeftIcon className="w-5 h-5" /></button><select className="w-full p-3 border border-gray-300 rounded-lg bg-white text-base" value={activeSubject?.id || ''} onChange={handleSubjectChange} disabled={categoryCourses.length === 0}>{categoryCourses.map(course => ( <option key={course.id} value={course.id}>{course.title}</option> ))}</select></div>
                      {activeSubject ? (<div className={wrapper}><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"><h1 className="text-2xl font-bold text-gray-800">{activeSubject.title}</h1><div className="flex gap-2"><button onClick={() => setShareContentModalOpen(true)} className="btn-primary">Share Content</button><button onClick={() => setAddUnitModalOpen(true)} className="btn-secondary">Add Unit</button></div></div><div><UnitAccordion subject={activeSubject} onInitiateDelete={handleInitiateDelete} userProfile={userProfile} onGenerateQuiz={handleGenerateQuizForLesson} isAiGenerating={isAiGenerating}/></div></div>) : (<div className={wrapper}><h1 className="text-2xl font-bold text-gray-800">{selectedCategory}</h1><div className="text-center py-10"><p className="text-gray-500">There are no subjects in this category yet.</p></div></div>)}
                  </div>
                );
            }
            return (
                <div>
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"><div><h1 className="text-3xl font-bold text-gray-800">Subjects</h1><p className="text-gray-500 mt-1">Manage subject categories and create new subjects.</p></div><div className="flex flex-shrink-0 gap-2"><button onClick={() => setCreateCategoryModalOpen(true)} className={`${gradientButtonStyle} gap-2`}><PlusCircleIcon className="w-5 h-5" />New Category</button><button onClick={() => setCreateCourseModalOpen(true)} className="btn-primary flex items-center"><PlusCircleIcon className="w-5 h-5 mr-2" />New Subject</button></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{courseCategories.map((cat, index) => { const courseCount = courses.filter(c => c.category === cat.name).length; const { icon: Icon, color } = subjectVisuals[index % subjectVisuals.length]; return (<div key={cat.id} onClick={() => handleCategoryClick(cat.name)} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"><div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-20 group-hover:opacity-30 transition-all duration-300`}></div><div className="relative z-10"><div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div><h2 className="text-xl font-bold text-gray-800 truncate mb-1">{cat.name}</h2><p className="text-gray-500">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p><button onClick={(e) => { e.stopPropagation(); handleEditCategory(cat);}} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 bg-transparent opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-opacity" aria-label={`Edit category ${cat.name}`}><PencilSquareIcon className="w-5 h-5" /></button></div></div>);})}</div>
                </div>
            );
        case 'classes': 
            return (
                <div>
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"><div><h1 className="text-3xl font-bold text-gray-800">Classes</h1><p className="text-gray-500 mt-1">Select a class to view details or manage settings.</p></div><div className="flex flex-shrink-0 gap-2"><button onClick={() => setIsArchivedModalOpen(true)} className="btn-secondary">View Archived</button><button onClick={() => setCreateClassModalOpen(true)} className="btn-primary flex items-center"><PlusCircleIcon className="w-5 h-5 mr-2" />Create Class</button></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{activeClasses.length > 0 ? activeClasses.map((c, index) => { const { icon: Icon, color } = classVisuals[index % classVisuals.length]; return (<div key={c.id} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"><div onClick={() => { if (!isHoveringActions) setClassOverviewModal({ isOpen: true, data: c }); }} className="cursor-pointer flex-grow flex flex-col h-full"><div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all`}></div><div className="relative z-10"><div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div><h2 className="text-xl font-bold text-gray-800 truncate mb-1">{c.name}</h2><p className="text-gray-500">{c.gradeLevel} - {c.section}</p></div>{c.classCode && (<div className="mt-auto pt-4 border-t border-gray-100"><p className="text-xs text-gray-500 mb-1">Class Code</p><div className="flex items-center gap-2"><p className="font-mono text-lg tracking-widest text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{c.classCode}</p><button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.classCode); showToast("Class code copied!", "success"); }} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600" title="Copy code"><ClipboardIcon className="w-5 h-5" /></button></div></div>)}</div><div className="absolute top-0 right-0 p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onMouseEnter={() => setIsHoveringActions(true)} onMouseLeave={() => setIsHoveringActions(false)}><button onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-gray-700 shadow-md" title="Edit"><PencilSquareIcon className="w-5 h-5" /></button><button onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-gray-700 shadow-md" title="Archive"><ArchiveBoxIcon className="w-5 h-5" /></button><button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-red-600 shadow-md" title="Delete"><TrashIcon className="w-5 h-5" /></button></div></div>);}) : <p className="col-span-full text-center text-gray-500 py-10">No active classes created yet.</p>}</div>
                </div>
            );
        case 'profile': 
            return (
                <div className="max-w-4xl mx-auto"><div className="bg-white rounded-2xl shadow-lg overflow-hidden"><div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative"><div className="absolute -bottom-16 left-1/2 -translate-x-1/2"><UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} className="w-32 h-32 border-4 border-white shadow-lg" /></div></div><div className="text-center pt-20 pb-8 px-6"><h1 className="text-3xl font-bold text-gray-800">{userProfile?.firstName} {userProfile?.lastName}</h1><p className="text-md text-gray-500 capitalize">{userProfile?.role}</p></div><div className="border-t border-gray-200 p-6 space-y-6"><h3 className="text-lg font-semibold text-gray-700">User Information</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="flex items-center gap-3"><EnvelopeIcon className="w-6 h-6 text-gray-400" /> <span className="text-gray-700">{userProfile?.email}</span></div><div className="flex items-center gap-3"><IdentificationIcon className="w-6 h-6 text-gray-400" /> <span className="text-gray-700 text-xs">ID: {user?.uid || user?.id}</span></div></div></div><div className="border-t border-gray-200 p-6"><h3 className="text-lg font-semibold text-gray-700 mb-4">Actions</h3><div className="flex flex-col sm:flex-row gap-3"><button onClick={() => setEditProfileModalOpen(true)} className="btn-secondary flex-1 flex justify-center items-center gap-2"><PencilSquareIcon className="w-5 h-5" /> Edit Profile</button><button onClick={() => setChangePasswordModalOpen(true)} className="btn-secondary flex-1 flex justify-center items-center gap-2"><KeyIcon className="w-5 h-5" /> Change Password</button><button onClick={logout} className="btn-danger flex-1 flex justify-center items-center gap-2"><ArrowLeftOnRectangleIcon className="w-5 h-5" /> Logout</button></div></div></div></div>
            );
        case 'home':
        default:
            return (
            <div className="space-y-8">
                <div><h1 className="text-3xl font-bold text-gray-800">Welcome back, {userProfile?.firstName}!</h1><p className="text-gray-500 mt-1">Here's what's new.</p></div>
                <CreateAnnouncement teacherProfile={userProfile} classes={activeClasses} />
                <div><h2 className="text-xl font-bold text-gray-700 mb-4">Teacher Announcements</h2><div className="space-y-4 max-h-96 overflow-y-auto pr-2">{teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => { const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId; return (<div key={post.id} className="bg-white/80 p-4 rounded-lg shadow-sm border group relative">{editingAnnId === post.id ? (<><textarea className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" rows="3" value={editingAnnText} onChange={(e) => setEditingAnnText(e.target.value)} /><div className="flex justify-end gap-2 mt-2"><button className="btn-secondary" onClick={() => setEditingAnnId(null)}>Cancel</button><button className="btn-primary" onClick={handleUpdateTeacherAnn}>Save</button></div></>) : (<>{canModify && (<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleStartEditAnn(post)} className="p-1 hover:bg-gray-200 rounded-full" title="Edit"><PencilSquareIcon className="w-4 h-4 text-gray-600" /></button><button onClick={() => handleDeleteTeacherAnn(post.id)} className="p-1 hover:bg-gray-200 rounded-full" title="Delete"><TrashIcon className="w-4 h-4 text-red-500" /></button></div>)}<p className="text-gray-800 whitespace-pre-wrap pr-10">{post.content}</p><div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 flex justify-between"><span>From: {post.teacherName}</span><span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</span></div></>)}</div>)}) : (<p className="text-center text-gray-500 py-8">No general announcements for teachers yet.</p>)}</div></div>
            </div>
            );
        }
    };

    const SidebarContent = () => (
        <div className="bg-white/90 h-full p-4">
            <div className="flex items-center gap-2 mb-6 px-2"><img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-9 h-9 rounded-full" /><span className="font-bold text-lg">SRCS LMS</span></div>
            <div className="bg-white/60 p-4 rounded-xl">
                <SidebarButton icon={<HomeIcon className="h-6 w-6"/>} text="Home" onClick={() => handleViewChange('home')} isActive={activeView === 'home'} />
                <SidebarButton icon={<UserGroupIcon className="h-6 w-6"/>} text="Students" onClick={() => handleViewChange('studentManagement')} isActive={activeView === 'studentManagement'} />
                <SidebarButton icon={<AcademicCapIcon className="h-6 w-6"/>} text="Classes" onClick={() => handleViewChange('classes')} isActive={activeView === 'classes'} />
                <SidebarButton icon={<BookOpenIcon className="h-6 w-6"/>} text="Subjects" onClick={() => handleViewChange('courses')} isActive={activeView === 'courses' || selectedCategory} />
                <SidebarButton icon={<UserIcon className="h-6 w-6"/>} text="Profile" onClick={() => handleViewChange('profile')} isActive={activeView === 'profile'} />
                {userProfile?.role === 'admin' && (<SidebarButton icon={<ShieldCheckIcon className="h-6 w-6"/>} text="Admin Console" onClick={() => handleViewChange('admin')} isActive={activeView === 'admin'} />)}
            </div>
        </div>
    );

    const bottomNavItems = [
        { view: 'home', text: 'Home', icon: HomeIcon },
        { view: 'studentManagement', text: 'Students', icon: UserGroupIcon },
        { view: 'classes', text: 'Classes', icon: AcademicCapIcon },
        { view: 'courses', text: 'Subjects', icon: BookOpenIcon },
        { view: 'profile', text: 'Profile', icon: UserIcon },
    ];

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="md:flex h-screen">
                <aside className="w-64 flex-shrink-0 hidden md:block shadow-lg"><SidebarContent /></aside>
                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div><div className="relative w-64 h-full"><SidebarContent /></div></div>
                <div className="flex-1 flex flex-col">
                    <nav className="bg-white/70 backdrop-blur-md p-3 flex justify-between items-center sticky top-0 z-40 border-b border-white/30"><button className="md:hidden p-2 rounded-full" onClick={() => setIsSidebarOpen(true)}><Bars3Icon className="h-6 w-6" /></button><div className="flex-1"></div><div className="flex items-center gap-4"><button className="p-2 rounded-full text-gray-600 hover:bg-gray-100" title="Search"><MagnifyingGlassIcon className="h-5 w-5" /></button><div className="flex items-center gap-2 border-l border-gray-200 pl-4"><div onClick={() => handleViewChange('profile')} className="flex items-center gap-2 cursor-pointer" title="View Profile"><UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" /><span className="hidden sm:block font-medium text-gray-700 hover:text-blue-600">{userProfile?.firstName || 'Profile'}</span></div><button onClick={logout} className="flex items-center p-2 rounded-lg text-red-600 hover:bg-red-50" title="Logout"><ArrowLeftOnRectangleIcon className="h-5 w-5" /></button></div></div></nav>
                    <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-4">{renderMainContent()}</main>
                </div>
            </div>
            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm flex justify-around md:hidden border-t border-gray-200/80 z-50">{bottomNavItems.map(item => { const isActive = activeView === item.view; return (<button key={item.view} onClick={() => handleViewChange(item.view)} className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 text-center transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}><item.icon className="h-5 w-5" /><span className="text-xs mt-1">{item.text}</span></button>)})}</footer>
    
            <ArchivedClassesModal isOpen={isArchivedModalOpen} onClose={() => setIsArchivedModalOpen(false)} archivedClasses={archivedClasses} onUnarchive={handleUnarchiveClass} onDelete={(classId) => handleDeleteClass(classId, true)}/>
            <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={handleUpdateProfile}/>
            <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)} onSubmit={handleChangePassword}/>
            <CreateCategoryModal isOpen={isCreateCategoryModalOpen} onClose={() => setCreateCategoryModalOpen(false)} onCategoryCreated={() => {}} />
            {categoryToEdit && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setEditCategoryModalOpen(false)} category={categoryToEdit} onCategoryUpdated={() => {}} />}
            <CreateClassModal isOpen={isCreateClassModalOpen} onClose={() => setCreateClassModalOpen(false)} teacherId={user?.uid || user?.id} />
            <CreateCourseModal isOpen={isCreateCourseModalOpen} onClose={() => setCreateCourseModalOpen(false)} teacherId={user?.uid || user?.id} courseCategories={courseCategories} />
            <ClassOverviewModal isOpen={classOverviewModal.isOpen} onClose={() => setClassOverviewModal({ isOpen: false, data: null })} classData={classOverviewModal.data} courses={courses} />
            <EditClassModal isOpen={isEditClassModalOpen} onClose={() => setEditClassModalOpen(false)} classData={classToEdit} />
            <AddUnitModal isOpen={isAddUnitModalOpen} onClose={() => setAddUnitModalOpen(false)} subjectId={activeSubject?.id} />
            {selectedUnit && <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />}
            {selectedUnit && <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={activeSubject?.id} />}
            {selectedUnit && <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={activeSubject?.id} />}
            {selectedUnit && <DeleteUnitModal isOpen={deleteUnitModalOpen} onClose={() => setDeleteUnitModalOpen(false)} unitId={selectedUnit?.id} subjectId={activeSubject?.id} />}
            {selectedLesson && <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson} />}
            {selectedLesson && <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson} />}
            {activeSubject && (<ShareMultipleLessonsModal isOpen={isShareContentModalOpen} onClose={() => setShareContentModalOpen(false)} subject={activeSubject} />)}
        
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                deletingItemType={deleteTarget?.type}
            />
        </div>
    );
};

export default TeacherDashboard;