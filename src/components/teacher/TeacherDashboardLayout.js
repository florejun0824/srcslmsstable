import React, { useState, useEffect } from 'react';
import {
    FaHouse, FaUserGroup, FaBook, FaBookOpen, FaUser, FaShieldHalved, FaArrowRightFromBracket
} from 'react-icons/fa6';
import { Bars3Icon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
// ✅ FIXED: Added 'query' and 'collection' to the import list
import { getDocs, writeBatch, doc, where, query, collection } from 'firebase/firestore'; 
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

// Import child components
import Spinner from '../common/Spinner';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import AdminDashboard from '../../pages/AdminDashboard';
import AiGenerationHub from './AiGenerationHub';
import ChatDialog from './ChatDialog';
import AnimatedRobot from './dashboard/widgets/AnimatedRobot';
import HomeView from './dashboard/views/HomeView';
import ClassesView from './dashboard/views/ClassesView';
import CoursesView from './dashboard/views/CoursesView';
import StudentManagementView from './dashboard/views/StudentManagementView';
import ProfileView from './dashboard/views/ProfileView';

// Import all modals
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

// Helper component for the AI loading overlay
const GlobalAiSpinner = ({ isGenerating, text }) => {
    if (!isGenerating) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex flex-col justify-center items-center backdrop-blur-md">
            <Spinner />
            <p className="text-white text-lg mt-4 font-semibold">{text || "AI is working its magic..."}</p>
        </div>
    );
};

// Main Layout Component
const TeacherDashboardLayout = (props) => {
    const {
        user, userProfile, loading, error, activeView, handleViewChange, logout,
        isAiGenerating,
        setIsAiGenerating,
        isChatOpen, setIsChatOpen, messages, isAiThinking, handleAskAiWrapper,
        isAiHubOpen, setIsAiHubOpen, activeSubject,
        activeUnit, onSetActiveUnit, setViewLessonModalOpen,
        reloadKey,
        // Deletion props
        isDeleteModalOpen, setIsDeleteModalOpen, handleConfirmDelete, deleteTarget, handleInitiateDelete,
        
        // ADDED: Destructure the new function and courses from props
        handleCreateUnit,
        courses,

        ...rest
    } = props;
    
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const { showToast } = useToast();
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] = useState(null);
    
    // --- Core Logic for Category and Course Management ---
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
    
    // --- Navigation Items ---
    const navItems = [
        { view: 'home', text: 'Home', icon: FaHouse, color: 'text-orange-500' },
        { view: 'studentManagement', text: 'Students', icon: FaUserGroup, color: 'text-blue-500' },
        { view: 'classes', text: 'Classes', icon: FaBookOpen, color: 'text-green-500' },
        { view: 'courses', text: 'Subjects', icon: FaBook, color: 'text-purple-500' },
        { view: 'profile', text: 'Profile', icon: FaUser, color: 'text-pink-500' },
    ];
    if (userProfile?.role === 'admin') {
        navItems.push({ view: 'admin', text: 'Admin', icon: FaShieldHalved, color: 'text-gray-500' });
    }
    
    // --- Main Content Renderer ---
    const renderMainContent = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        if (error) {
            return (
                <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded-lg shadow-md m-4">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 mt-1 text-red-600" />
                        <div><strong className="block">An error occurred</strong><span>{error}</span></div>
                    </div>
                </div>
            );
        }
        switch (activeView) {
            case 'home': return <HomeView key={`${reloadKey}-home`} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
            case 'classes': return <ClassesView key={`${reloadKey}-classes`} {...rest} />;
            case 'courses': return <CoursesView key={`${reloadKey}-courses`} {...rest} userProfile={userProfile} activeSubject={activeSubject} isAiGenerating={isAiGenerating} setIsAiHubOpen={setIsAiHubOpen} activeUnit={activeUnit} onSetActiveUnit={onSetActiveUnit} courses={courses} courseCategories={courseCategories} handleEditCategory={handleEditCategory} onAddSubjectClick={handleAddSubjectWithCategory} handleInitiateDelete={handleInitiateDelete} />;
            case 'studentManagement': return <StudentManagementView key={`${reloadKey}-sm`} {...rest} />;
            case 'profile': return <ProfileView key={`${reloadKey}-profile`} user={user} userProfile={userProfile} logout={logout} {...rest} />;
            case 'admin': return <div key={`${reloadKey}-admin`} className="p-4 sm:p-6 text-gray-800"><AdminDashboard /></div>;
            default: return <HomeView key={`${reloadKey}-default`} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
        }
    };

    return (
        <>
            <style>{`
                .view-fade-enter { opacity: 0; transform: scale(0.98) translateY(10px); }
                .view-fade-enter-active { opacity: 1; transform: scale(1) translateY(0); transition: opacity 300ms, transform 300ms; }
                .view-fade-exit { opacity: 1; transform: scale(1) translateY(0); }
                .view-fade-exit-active { opacity: 0; transform: scale(0.98) translateY(-10px); transition: opacity 300ms, transform 300ms; }
                .animated-robot-enter { opacity: 0; transform: scale(0.5) translateY(50px); }
                .animated-robot-enter-active { opacity: 1; transform: scale(1) translateY(0); transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1); }
                .animated-robot-exit { opacity: 1; transform: scale(1) translateY(0); }
                .animated-robot-exit-active { opacity: 0; transform: scale(0.5) translateY(50px); transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1); }
            `}</style>
            
            <div className="min-h-screen flex flex-col bg-slate-100 font-sans antialiased text-gray-800">
                {/* --- HEADER --- */}
                <header className="sticky top-0 z-50 p-3 bg-white/75 backdrop-blur-xl border-b border-slate-900/10">
                    <div className="mx-auto max-w-screen-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-10 h-10 rounded-full" />
                            <span className="hidden md:block font-bold text-xl text-gray-800">SRCS Learning Portal</span>
                        </div>
                        
                        <nav className="hidden lg:flex items-center justify-center gap-2 p-1 bg-slate-200/70 rounded-full">
                            {navItems.map(item => (
                                <button key={item.view} onClick={() => handleViewChange(item.view)} className={`group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 text-sm font-semibold ${activeView === item.view ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                                    <item.icon className={`h-5 w-5 transition-colors ${activeView === item.view ? item.color : 'text-gray-500 group-hover:text-gray-800'}`} />
                                    {item.text}
                                </button>
                            ))}
                        </nav>

                        <div className="flex items-center gap-2">
                            <div onClick={() => handleViewChange('profile')} className="flex items-center gap-2 cursor-pointer p-1 rounded-full transition-colors hover:bg-slate-200/80" title="View Profile">
                                <div className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-slate-200">
                                    {userProfile?.photoURL ? (<img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />) : (<UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" />)}
                                </div>
                                <span className="hidden lg:block font-medium text-gray-700 pr-2">{userProfile?.firstName || 'Profile'}</span>
                            </div>
                            <button onClick={logout} className="p-2.5 rounded-full hover:bg-red-500/10 text-red-600 transition-colors" title="Logout">
                                <FaArrowRightFromBracket className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* --- MAIN CONTENT AREA --- */}
                <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
                    <SwitchTransition mode="out-in">
                        <CSSTransition key={activeView} timeout={300} classNames="view-fade">
                            <div className="h-full w-full">
                                {renderMainContent()}
                            </div>
                        </CSSTransition>
                    </SwitchTransition>
                </main>
            </div>
            
            {/* --- FLOATING UI & MODALS --- */}
            <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} subjectId={activeSubject?.id} unitId={activeUnit?.id} />
            <CSSTransition in={!isChatOpen} timeout={300} classNames="animated-robot" unmountOnExit><AnimatedRobot onClick={() => setIsChatOpen(true)} /></CSSTransition>
            <ChatDialog isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} messages={messages} onSendMessage={handleAskAiWrapper} isAiThinking={isAiThinking} userFirstName={userProfile?.firstName} />
            <GlobalAiSpinner isGenerating={isAiGenerating} text="Crafting content..." />
            
            {/* --- All Modals Rendered Here --- */}
            <ArchivedClassesModal isOpen={rest.isArchivedModalOpen} onClose={() => rest.setIsArchivedModalOpen(false)} archivedClasses={rest.archivedClasses} onUnarchive={rest.handleUnarchiveClass} onDelete={(classId) => rest.handleDeleteClass(classId, true)} />
            <EditProfileModal isOpen={rest.isEditProfileModalOpen} onClose={() => rest.setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={rest.handleUpdateProfile} />
            <ChangePasswordModal isOpen={rest.isChangePasswordModalOpen} onClose={() => rest.setChangePasswordModalOpen(false)} onSubmit={rest.handleChangePassword} />
            <CreateCategoryModal isOpen={rest.isCreateCategoryModalOpen} onClose={() => rest.setCreateCategoryModalOpen(false)} teacherId={user?.uid || user?.id} />
            
            {/* ✅ FIXED: Corrected the typo from 'categoryToedit' to 'categoryToEdit' */}
            {categoryToEdit && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setIsEditCategoryModalOpen(false)} categoryName={categoryToEdit.name} onSave={handleRenameCategory} />}

            <CreateClassModal isOpen={rest.isCreateClassModalOpen} onClose={() => rest.setCreateClassModalOpen(false)} teacherId={user?.uid || user?.id} />
            <CreateCourseModal isOpen={rest.isCreateCourseModalOpen} onClose={() => { rest.setCreateCourseModalOpen(false); setPreselectedCategoryForCourseModal(null); }} teacherId={user?.uid || user?.id} courseCategories={courseCategories} preselectedCategory={preselectedCategoryForCourseModal} />
            <ClassOverviewModal isOpen={rest.classOverviewModal.isOpen} onClose={() => rest.setClassOverviewModal({ isOpen: false, data: null })} classData={rest.classOverviewModal.data} courses={courses} onRemoveStudent={rest.handleRemoveStudentFromClass} />
            <EditClassModal isOpen={rest.isEditClassModalOpen} onClose={() => rest.setEditClassModalOpen(false)} classData={rest.classToEdit} />
            <AddUnitModal isOpen={rest.isAddUnitModalOpen} onClose={() => rest.setAddUnitModalOpen(false)} subjectId={activeSubject?.id} onCreateUnit={handleCreateUnit} />
            {rest.selectedUnit && <EditUnitModal isOpen={rest.editUnitModalOpen} onClose={() => rest.setEditUnitModalOpen(false)} unit={rest.selectedUnit} />}
            {rest.selectedUnit && <AddLessonModal isOpen={rest.addLessonModalOpen} onClose={() => rest.setAddLessonModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} setIsAiGenerating={setIsAiGenerating} />}
            {rest.selectedUnit && <AddQuizModal isOpen={rest.addQuizModalOpen} onClose={() => rest.setAddQuizModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
            {rest.selectedUnit && <DeleteUnitModal isOpen={rest.deleteUnitModalOpen} onClose={() => rest.setDeleteUnitModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
            {rest.selectedLesson && <EditLessonModal isOpen={rest.editLessonModalOpen} onClose={() => rest.setEditLessonModalOpen(false)} lesson={rest.selectedLesson} />}
            {rest.selectedLesson && <ViewLessonModal isOpen={rest.viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={rest.selectedLesson} />}
            {activeSubject && (<ShareMultipleLessonsModal isOpen={rest.isShareContentModalOpen} onClose={() => rest.setShareContentModalOpen(false)} subject={activeSubject} />)}
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} deletingItemType={deleteTarget?.type} />
            <EditSubjectModal isOpen={rest.isEditSubjectModalOpen} onClose={() => rest.setEditSubjectModalOpen(false)} subject={rest.subjectToActOn} />
            <DeleteSubjectModal isOpen={rest.isDeleteSubjectModalOpen} onClose={() => rest.setDeleteSubjectModalOpen(false)} subject={rest.subjectToActOn} />

            {/* --- MOBILE FOOTER --- */}
            <footer className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
                <div className="mx-auto max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-900/10 p-2 flex justify-around items-center">
                    {navItems.map(item => {
                        const isActive = activeView === item.view;
                        return (
                            <button key={item.view} onClick={() => handleViewChange(item.view)} className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-100/70' : 'hover:bg-slate-100'}`}>
                                <item.icon className={`h-6 w-6 mb-0.5 transition-all ${isActive ? item.color : 'text-gray-500'}`} />
                                <span className={`text-xs font-semibold transition-colors ${isActive ? 'text-indigo-700' : 'text-gray-600'}`}>{item.text}</span>
                            </button>
                        );
                    })}
                </div>
            </footer>
        </>
    );
};

export default TeacherDashboardLayout;