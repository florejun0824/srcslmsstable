import React, { useState, useEffect } from 'react';
import {
    HomeIcon, AcademicCapIcon, BookOpenIcon, UserIcon, ShieldCheckIcon, Bars3Icon,
    ArrowLeftOnRectangleIcon, ExclamationTriangleIcon, UserGroupIcon 
} from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, writeBatch, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

import Spinner from '../common/Spinner';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import SidebarButton from '../common/SidebarButton';
import AdminDashboard from '../../pages/AdminDashboard';
import AiGenerationHub from './AiGenerationHub';
import ChatDialog from './ChatDialog';
import AnimatedRobot from './dashboard/widgets/AnimatedRobot';

import HomeView from './dashboard/views/HomeView';
import ClassesView from './dashboard/views/ClassesView';
import CoursesView from './dashboard/views/CoursesView';
import StudentManagementView from './dashboard/views/StudentManagementView';
import ProfileView from './dashboard/views/ProfileView';

import ArchivedClassesModal from './ArchivedClassesModal';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';
import CreateCategoryModal from './CreateCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import CreateClassModal from './CreateClassModal';
import CreateCourseModal from './CreateCourseModal'; 
import ClassOverviewModal from './ClassOverviewModal';
import EditClassModal from '../common/EditClassModal';
import AddUnitModal from './AddUnitModal';
import EditUnitModal from './EditUnitModal';
import AddLessonModal from './AddLessonModal';
import AddQuizModal from './AddQuizModal';
import DeleteUnitModal from './DeleteUnitModal';
import EditLessonModal from './EditLessonModal';
import ViewLessonModal from './ViewLessonModal';
import ShareMultipleLessonsModal from './ShareMultipleLessonsModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import EditSubjectModal from './EditSubjectModal';
import DeleteSubjectModal from './DeleteSubjectModal';


const GlobalAiSpinner = ({ isGenerating, text }) => {
    if (!isGenerating) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex flex-col justify-center items-center">
            <Spinner />
            <p className="text-white text-lg mt-4">{text || "AI is working its magic..."}</p>
        </div>
    );
};


const TeacherDashboardLayout = (props) => {
    const {
        user, userProfile, loading, error, activeView, handleViewChange, isSidebarOpen, setIsSidebarOpen, logout,
        isAiGenerating,
        setIsAiGenerating,
        isChatOpen, setIsChatOpen, messages, isAiThinking, handleAskAi, userFirstName,
        aiConversationStarted, handleAskAiWrapper, isAiHubOpen, setIsAiHubOpen, activeSubject,
        activeUnit, onSetActiveUnit, setViewLessonModalOpen,
        // ❌ REMOVED: Incorrect prop name was here
        ...rest
    } = props;

    const [courses, setCourses] = useState(rest.courses || []);
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const { showToast } = useToast();
    
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleInitiateDelete = (type, id, name) => {
        setDeleteTarget({ type, id, name });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;

        const { type, name } = deleteTarget;

		if (type === 'category') {
		    const coursesInCategoryQuery = query(collection(db, 'courses'), where('category', '==', name));
		    const querySnapshot = await getDocs(coursesInCategoryQuery);

		    if (querySnapshot.empty) {
		        showToast(`Category "${name}" is already empty. No subjects to delete.`, "info");
		    } else {
		        const batch = writeBatch(db);
		        querySnapshot.forEach(docSnapshot => {
		            batch.delete(doc(db, 'courses', docSnapshot.id));
		        });
		        await batch.commit();
		        showToast(`Successfully deleted category "${name}" and all its subjects.`, "success");
		    }
		} else if (type === 'lesson') {
		    await deleteDoc(doc(db, 'lessons', deleteTarget.id));
		    showToast(`Lesson "${name}" was successfully deleted.`, "success");

		} else {
		    console.log(`Deletion logic for type "${type}" needs to be implemented.`);
		    showToast(`Deletion for "${type}" is not yet implemented.`, "warning");
		}

        setIsAiGenerating(true); 

        try {
            if (type === 'category') {
                const coursesInCategoryQuery = query(collection(db, 'courses'), where('category', '==', name));
                const querySnapshot = await getDocs(coursesInCategoryQuery);

                if (querySnapshot.empty) {
                    showToast(`Category "${name}" is already empty. No subjects to delete.`, "info");
                } else {
                    const batch = writeBatch(db);
                    querySnapshot.forEach(docSnapshot => {
                        batch.delete(doc(db, 'courses', docSnapshot.id));
                    });

                    await batch.commit();
                    showToast(`Successfully deleted category "${name}" and all its subjects.`, "success");
                }
            } else {
                console.log(`Deletion logic for type "${type}" needs to be implemented.`);
                showToast(`Deletion for "${type}" is not yet implemented.`, "warning");
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            showToast(`Failed to delete ${type}. Please try again.`, "error");
        } finally {
            setIsAiGenerating(false); 
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };

    useEffect(() => {
        const q = query(collection(db, 'courses'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(coursesData);
            console.log("Course data updated in real-time.");
        });

        return () => unsubscribe();
    }, []);


    const handleRenameCategory = async (newName) => {
        const oldName = categoryToEdit?.name;

        if (!oldName || !newName || oldName === newName) {
            setIsEditCategoryModalOpen(false);
            return;
        }

        const subjectsQuery = query(collection(db, 'courses'), where('category', '==', oldName));
        
        try {
            const querySnapshot = await getDocs(subjectsQuery);
            const batch = writeBatch(db);
            querySnapshot.forEach((document) => {
                const subjectRef = doc(db, 'courses', document.id);
                batch.update(subjectRef, { category: newName });
            });
            await batch.commit();
            showToast("Category renamed successfully!", "success");
        } catch (error) {
            console.error("Error renaming category:", error);
            showToast("Failed to rename category.", "error");
        } finally {
            setIsEditCategoryModalOpen(false);
        }
    };

    const handleEditCategory = (category) => {
        setCategoryToEdit(category);
        setIsEditCategoryModalOpen(true);
    };

    const courseCategories = [...new Set(courses.map(c => c.category).filter(Boolean))]
        .map(name => ({ id: name, name: name }));


    const handleAddSubjectWithCategory = (categoryName) => {
        setPreselectedCategoryForCourseModal(categoryName);
        rest.setCreateCourseModalOpen(true); 
    };

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

        switch (activeView) {
            case 'home':
                return <HomeView userProfile={userProfile} {...rest} />;
            case 'classes':
                return <ClassesView {...rest} />;
            case 'courses':
                return <CoursesView 
                            {...rest}
                            userProfile={userProfile} 
                            activeSubject={activeSubject} 
                            isAiGenerating={isAiGenerating} 
                            setIsAiHubOpen={setIsAiHubOpen} 
                            activeUnit={activeUnit} 
                            onSetActiveUnit={onSetActiveUnit}
                            courses={courses}
                            courseCategories={courseCategories}
                            handleEditCategory={handleEditCategory}
                            onAddSubjectClick={handleAddSubjectWithCategory} 
                            handleInitiateDelete={handleInitiateDelete}
                            // ❌ REMOVED: Incorrect prop was passed here
                        />;
            case 'studentManagement':
                return <StudentManagementView {...rest} />;
            case 'profile':
                return <ProfileView user={user} userProfile={userProfile} logout={logout} {...rest} />;
            case 'admin':
                return <div className="bg-white/70 backdrop-blur-md border border-white/30 p-4 sm:p-6 rounded-xl shadow"><AdminDashboard /></div>;
            default:
                return <HomeView userProfile={userProfile} {...rest} />;
        }
    };

    const SidebarContent = () => (
        <div className="p-4 h-full shadow-lg rounded-r-2xl bg-white/30 backdrop-blur-lg border border-white/20">
            <div className="flex items-center gap-2 mb-8 px-2">
                <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-10 h-10 rounded-full shadow-md" />
                <span className="font-bold text-xl text-gray-900">SRCS LMS</span>
            </div>
            <nav className="space-y-2">
                <SidebarButton icon={<HomeIcon className="h-6 w-6" />} text="Home" onClick={() => handleViewChange('home')} isActive={activeView === 'home'} />
                <SidebarButton icon={<UserGroupIcon className="h-6 w-6" />} text="Students" onClick={() => handleViewChange('studentManagement')} isActive={activeView === 'studentManagement'} />
                <SidebarButton icon={<AcademicCapIcon className="h-6 w-6" />} text="Classes" onClick={() => handleViewChange('classes')} isActive={activeView === 'classes'} />
                <SidebarButton icon={<BookOpenIcon className="h-6 w-6" />} text="Subjects" onClick={() => handleViewChange('courses')} isActive={activeView === 'courses' || rest.selectedCategory} />
                <SidebarButton icon={<UserIcon className="h-6 w-6" />} text="Profile" onClick={() => handleViewChange('profile')} isActive={activeView === 'profile'} />
                {userProfile?.role === 'admin' && (<SidebarButton icon={<ShieldCheckIcon className="h-6 w-6" />} text="Admin Console" onClick={() => handleViewChange('admin')} isActive={activeView === 'admin'} />)}
            </nav>
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-blue-100">
            
            <div className="md:flex flex-1">
                <aside className="w-64 flex-shrink-0 hidden md:block">
                    <SidebarContent />
                </aside>
                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-64 h-full"><SidebarContent /></div>
                </div>
                
                <div className="flex-1 flex flex-col">
                    <nav className="bg-white/90 backdrop-blur-md p-3 flex justify-between items-center sticky top-0 z-40 border-b border-white/30 shadow-lg">
                        <button className="md:hidden p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors" onClick={() => setIsSidebarOpen(true)}>
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-4 px-2">
                            <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                                <div onClick={() => handleViewChange('profile')} className="flex items-center gap-2 cursor-pointer transition-colors hover:text-primary-600" title="View Profile">
                                    <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" />
                                    <span className="hidden sm:block font-medium text-gray-700">{userProfile?.firstName || 'Profile'}</span>
                                </div>
                                <button onClick={logout} className="flex items-center p-2.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-700 transition-colors" title="Logout">
                                    <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                    </nav>
                    <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                        {renderMainContent()}
                    </main>
                </div>
            </div>
            
            <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} subjectId={activeSubject?.id} unitId={activeUnit?.id} />
            
            {activeView === 'home' && (
                <>
                    <AnimatedRobot onClick={() => setIsChatOpen(true)} />
                    <ChatDialog 
                        isOpen={isChatOpen} 
                        onClose={() => {
                            setIsChatOpen(false);
                            rest.setAiConversationStarted(false);
                        }} 
                        messages={messages} 
                        onSendMessage={handleAskAiWrapper} 
                        isAiThinking={isAiThinking}
                        userFirstName={userProfile?.firstName} 
                    />
                </>
            )}

            <GlobalAiSpinner isGenerating={isAiGenerating} text="Crafting content..." />

            <ArchivedClassesModal isOpen={rest.isArchivedModalOpen} onClose={() => rest.setIsArchivedModalOpen(false)} archivedClasses={rest.archivedClasses} onUnarchive={rest.handleUnarchiveClass} onDelete={(classId) => rest.handleDeleteClass(classId, true)} />
            <EditProfileModal isOpen={rest.isEditProfileModalOpen} onClose={() => rest.setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={rest.handleUpdateProfile} />
            <ChangePasswordModal isOpen={rest.isChangePasswordModalOpen} onClose={() => rest.setChangePasswordModalOpen(false)} onSubmit={rest.handleChangePassword} />
            <CreateCategoryModal 
                isOpen={rest.isCreateCategoryModalOpen} 
                onClose={() => rest.setCreateCategoryModalOpen(false)} 
                teacherId={user?.uid || user?.id} 
            />
            
            {categoryToEdit && (
                <EditCategoryModal 
                    isOpen={isEditCategoryModalOpen} 
                    onClose={() => setIsEditCategoryModalOpen(false)} 
                    categoryName={categoryToEdit.name} 
                    onSave={handleRenameCategory} 
                />
            )}

            <CreateClassModal isOpen={rest.isCreateClassModalOpen} onClose={() => rest.setCreateClassModalOpen(false)} teacherId={user?.uid || user?.id} />
            <CreateCourseModal 
                isOpen={rest.isCreateCourseModalOpen} 
                onClose={() => {
                    rest.setCreateCourseModalOpen(false);
                    setPreselectedCategoryForCourseModal(null); 
                }} 
                teacherId={user?.uid || user?.id} 
                courseCategories={courseCategories}
                preselectedCategory={preselectedCategoryForCourseModal}
            />
            <ClassOverviewModal isOpen={rest.classOverviewModal.isOpen} onClose={() => rest.setClassOverviewModal({ isOpen: false, data: null })} classData={rest.classOverviewModal.data} courses={courses} onRemoveStudent={rest.handleRemoveStudentFromClass} />
            <EditClassModal isOpen={rest.isEditClassModalOpen} onClose={() => rest.setEditClassModalOpen(false)} classData={rest.classToEdit} />
            <AddUnitModal isOpen={rest.isAddUnitModalOpen} onClose={() => rest.setAddUnitModalOpen(false)} subjectId={activeSubject?.id} />
            {rest.selectedUnit && <EditUnitModal isOpen={rest.editUnitModalOpen} onClose={() => rest.setEditUnitModalOpen(false)} unit={rest.selectedUnit} />}
            {rest.selectedUnit && <AddLessonModal isOpen={rest.addLessonModalOpen} onClose={() => rest.setAddLessonModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} setIsAiGenerating={setIsAiGenerating} />}
            {rest.selectedUnit && <AddQuizModal isOpen={rest.addQuizModalOpen} onClose={() => rest.setAddQuizModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
            {rest.selectedUnit && <DeleteUnitModal isOpen={rest.deleteUnitModalOpen} onClose={() => rest.setDeleteUnitModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
            {rest.selectedLesson && <EditLessonModal isOpen={rest.editLessonModalOpen} onClose={() => rest.setEditLessonModalOpen(false)} lesson={rest.selectedLesson} />}
            {rest.selectedLesson && <ViewLessonModal isOpen={rest.viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={rest.selectedLesson} />}
            {activeSubject && (<ShareMultipleLessonsModal isOpen={rest.isShareContentModalOpen} onClose={() => rest.setShareContentModalOpen(false)} subject={activeSubject} />)}
            
            <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={handleConfirmDelete} 
                deletingItemType={deleteTarget?.type} 
            />

            <EditSubjectModal isOpen={rest.isEditSubjectModalOpen} onClose={() => rest.setEditSubjectModalOpen(false)} subject={rest.subjectToActOn} />
            <DeleteSubjectModal isOpen={rest.isDeleteSubjectModalOpen} onClose={() => rest.setDeleteSubjectModalOpen(false)} subject={rest.subjectToActOn} />
            
            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md flex justify-around md:hidden border-t border-gray-200 shadow-sm z-50">
                {bottomNavItems.map(item => {
                    const isActive = activeView === item.view;
                    return (
                        <button key={item.view} onClick={() => handleViewChange(item.view)} className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 text-center transition-colors duration-200 ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-primary-500'}`}>
                            <item.icon className="h-5 w-5" />
                            <span className="text-xs mt-1">{item.text}</span>
                        </button>
                    );
                })}
            </footer>
        </div>
    );
};

export default TeacherDashboardLayout;