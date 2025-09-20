import React, { useState, Suspense, lazy } from 'react';

// --- LIBRARIES ---
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { IconHome, IconUsers, IconSchool, IconCategory, IconUserCircle, IconShieldCog, IconPower } from '@tabler/icons-react';

// --- FIREBASE & SERVICES ---
import { getDocs, writeBatch, doc, where, query, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';

// --- CONTEXTS ---
import { useToast } from '../../contexts/ToastContext';

// --- UI & ANIMATION ---
import { CSSTransition, SwitchTransition } from 'react-transition-group';

// --- CORE COMPONENTS (Always visible or small) ---
import Spinner from '../common/Spinner';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import AnimatedRobot from './dashboard/widgets/AnimatedRobot';
import ParticleBackground from './ParticleBackground'; // --- IMPORT THE NEW COMPONENT ---

// --- LAZY-LOADED VIEWS (Code-split for performance) ---
const AdminDashboard = lazy(() => import('../../pages/AdminDashboard'));
const HomeView = lazy(() => import('./dashboard/views/HomeView'));
const ClassesView = lazy(() => import('./dashboard/views/ClassesView'));
const CoursesView = lazy(() => import('./dashboard/views/CoursesView'));
const StudentManagementView = lazy(() => import('./dashboard/views/StudentManagementView'));
const ProfileView = lazy(() => import('./dashboard/views/ProfileView'));

// --- LAZY-LOADED UI (Dialogs) ---
const AiGenerationHub = lazy(() => import('./AiGenerationHub'));
const ChatDialog = lazy(() => import('./ChatDialog'));

// --- LAZY-LOADED UI (Modals) ---
const ArchivedClassesModal = lazy(() => import('./ArchivedClassesModal'));
const EditProfileModal = lazy(() => import('./EditProfileModal'));
const ChangePasswordModal = lazy(() => import('./ChangePasswordModal'));
const CreateCategoryModal = lazy(() => import('./CreateCategoryModal'));
const EditCategoryModal = lazy(() => import('./EditCategoryModal'));
const CreateClassModal = lazy(() => import('./CreateClassModal'));
const CreateCourseModal = lazy(() => import('./CreateCourseModal'));
const ClassOverviewModal = lazy(() => import('./ClassOverviewModal'));
const EditClassModal = lazy(() => import('../common/EditClassModal'));
const AddUnitModal = lazy(() => import('./AddUnitModal'));
const EditUnitModal = lazy(() => import('./EditUnitModal'));
const AddLessonModal = lazy(() => import('./AddLessonModal'));
const AddQuizModal = lazy(() => import('./AddQuizModal'));
const DeleteUnitModal = lazy(() => import('./DeleteUnitModal'));
const EditLessonModal = lazy(() => import('./EditLessonModal'));
const ViewLessonModal = lazy(() => import('./ViewLessonModal'));
const ShareMultipleLessonsModal = lazy(() => import('./ShareMultipleLessonsModal'));
const DeleteConfirmationModal = lazy(() => import('./DeleteConfirmationModal'));
const EditSubjectModal = lazy(() => import('./EditSubjectModal'));
const DeleteSubjectModal = lazy(() => import('./DeleteSubjectModal'));


// Helper component for loading states
const LoadingFallback = () => (
    <div className="w-full h-full flex justify-center items-center p-20">
        <Spinner />
    </div>
);

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
        isDeleteModalOpen, setIsDeleteModalOpen, handleConfirmDelete, deleteTarget, handleInitiateDelete,
        handleCreateUnit,
        courses,
        ...rest
    } = props;
    
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const { showToast } = useToast();
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] = useState(null);
    const [hoveredIconIndex, setHoveredIconIndex] = useState(null);

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

    const navItems = [
        { view: 'home', text: 'Home', icon: IconHome, gradient: 'from-rose-500 to-pink-500' },
        { view: 'studentManagement', text: 'Students', icon: IconUsers, gradient: 'from-sky-500 to-cyan-400' },
        { view: 'classes', text: 'Classes', icon: IconSchool, gradient: 'from-emerald-500 to-green-400' },
        { view: 'courses', text: 'Subjects', icon: IconCategory, gradient: 'from-violet-500 to-purple-500' },
        { view: 'profile', text: 'Profile', icon: IconUserCircle, gradient: 'from-amber-500 to-yellow-400' },
    ];
    if (userProfile?.role === 'admin') {
        navItems.push({ view: 'admin', text: 'Admin', icon: IconShieldCog, gradient: 'from-slate-500 to-slate-600' });
    }
    
    const getScale = (index) => {
        if (hoveredIconIndex === null) return 1;
        const distance = Math.abs(hoveredIconIndex - index);
        if (distance === 0) return 1.25;
        if (distance === 1) return 1.1;
        if (distance === 2) return 1.05;
        return 1;
    };
    
    const renderMainContent = () => {
        if (loading) return <LoadingFallback />;
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
            case 'home': 
                return <HomeView key={`${reloadKey}-home`} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
            case 'classes': 
                return <ClassesView key={`${reloadKey}-classes`} {...rest} />;
            case 'courses': 
                return (
                    <CoursesView 
                        key={`${reloadKey}-courses`} 
                        {...rest} 
                        userProfile={userProfile} 
                        activeSubject={activeSubject} 
                        isAiGenerating={isAiGenerating} 
                        setIsAiGenerating={setIsAiGenerating}
                        setIsAiHubOpen={setIsAiHubOpen} 
                        activeUnit={activeUnit} 
                        onSetActiveUnit={onSetActiveUnit} 
                        courses={courses} 
                        courseCategories={courseCategories} 
                        handleEditCategory={handleEditCategory} 
                        onAddSubjectClick={handleAddSubjectWithCategory} 
                        handleInitiateDelete={handleInitiateDelete} 
                    />
                );
            case 'studentManagement': 
                return <StudentManagementView key={`${reloadKey}-sm`} {...rest} />;
            case 'profile': 
                return <ProfileView key={`${reloadKey}-profile`} user={user} userProfile={userProfile} logout={logout} {...rest} />;
            case 'admin': 
                return <div key={`${reloadKey}-admin`} className="p-4 sm:p-6 text-gray-800"><AdminDashboard /></div>;
            default: 
                return <HomeView key={`${reloadKey}-default`} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
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
                
                <header className="sticky top-0 z-40 p-3 bg-white/75 backdrop-blur-xl border-b border-slate-900/10 lg:hidden">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-9 h-9 rounded-full" />
                            <span className="font-bold text-lg text-gray-800">SRCS Portal</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div onClick={() => handleViewChange('profile')} className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-slate-200">
                                {userProfile?.photoURL ? (<img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />) : (<UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" />)}
                            </div>
                             <button onClick={logout} className="p-2.5 rounded-full text-red-600" title="Logout">
                                <IconPower size={22} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
                    <SwitchTransition mode="out-in">
                        <CSSTransition key={activeView} timeout={300} classNames="view-fade">
                            <Suspense fallback={<LoadingFallback />}>
                                {renderMainContent()}
                            </Suspense>
                        </CSSTransition>
                    </SwitchTransition>
                </main>
            </div>
            
             <Suspense fallback={null}>
                <CSSTransition in={!isChatOpen} timeout={300} classNames="animated-robot" unmountOnExit>
                    <AnimatedRobot onClick={() => setIsChatOpen(true)} />
                </CSSTransition>
                {isAiHubOpen && <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} subjectId={activeSubject?.id} unitId={activeUnit?.id} />}
                {isChatOpen && <ChatDialog isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} messages={messages} onSendMessage={handleAskAiWrapper} isAiThinking={isAiThinking} userFirstName={userProfile?.firstName} />}
                {rest.isArchivedModalOpen && <ArchivedClassesModal isOpen={rest.isArchivedModalOpen} onClose={() => rest.setIsArchivedModalOpen(false)} archivedClasses={rest.archivedClasses} onUnarchive={rest.handleUnarchiveClass} onDelete={(classId) => rest.handleDeleteClass(classId, true)} />}
                {rest.isEditProfileModalOpen && <EditProfileModal isOpen={rest.isEditProfileModalOpen} onClose={() => rest.setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={rest.handleUpdateProfile} />}
                <ChangePasswordModal isOpen={rest.isChangePasswordModalOpen} onClose={() => rest.setChangePasswordModalOpen(false)} onSubmit={rest.handleChangePassword} />
                <CreateCategoryModal isOpen={rest.isCreateCategoryModalOpen} onClose={() => rest.setCreateCategoryModalOpen(false)} teacherId={user?.uid || user?.id} />
                {isEditCategoryModalOpen && categoryToEdit && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setIsEditCategoryModalOpen(false)} categoryName={categoryToEdit.name} onSave={handleRenameCategory} />}
                <CreateClassModal isOpen={rest.isCreateClassModalOpen} onClose={() => rest.setCreateClassModalOpen(false)} teacherId={user?.uid || user?.id} />
                <CreateCourseModal isOpen={rest.isCreateCourseModalOpen} onClose={() => { rest.setCreateCourseModalOpen(false); setPreselectedCategoryForCourseModal(null); }} teacherId={user?.uid || user?.id} courseCategories={courseCategories} preselectedCategory={preselectedCategoryForCourseModal} />
                {rest.classOverviewModal.isOpen && <ClassOverviewModal isOpen={rest.classOverviewModal.isOpen} onClose={() => rest.setClassOverviewModal({ isOpen: false, data: null })} classData={rest.classOverviewModal.data} courses={courses} onRemoveStudent={rest.handleRemoveStudentFromClass} />}
                {rest.isEditClassModalOpen && <EditClassModal isOpen={rest.isEditClassModalOpen} onClose={() => rest.setEditClassModalOpen(false)} classData={rest.classToEdit} />}
                {rest.isAddUnitModalOpen && <AddUnitModal isOpen={rest.isAddUnitModalOpen} onClose={() => rest.setAddUnitModalOpen(false)} subjectId={activeSubject?.id} onCreateUnit={handleCreateUnit} />}
                {rest.editUnitModalOpen && rest.selectedUnit && <EditUnitModal isOpen={rest.editUnitModalOpen} onClose={() => rest.setEditUnitModalOpen(false)} unit={rest.selectedUnit} />}
                {rest.addLessonModalOpen && rest.selectedUnit && (<AddLessonModal isOpen={rest.addLessonModalOpen} onClose={() => rest.setAddLessonModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} setIsAiGenerating={props.setIsAiGenerating}/>)}
                {rest.addQuizModalOpen && rest.selectedUnit && <AddQuizModal isOpen={rest.addQuizModalOpen} onClose={() => rest.setAddQuizModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
                {rest.deleteUnitModalOpen && rest.selectedUnit && <DeleteUnitModal isOpen={rest.deleteUnitModalOpen} onClose={() => rest.setDeleteUnitModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
                {rest.editLessonModalOpen && rest.selectedLesson && <EditLessonModal isOpen={rest.editLessonModalOpen} onClose={() => rest.setEditLessonModalOpen(false)} lesson={rest.selectedLesson} />}
                {rest.viewLessonModalOpen && rest.selectedLesson && <ViewLessonModal isOpen={rest.viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={rest.selectedLesson} />}
                {rest.isShareContentModalOpen && activeSubject && (<ShareMultipleLessonsModal isOpen={rest.isShareContentModalOpen} onClose={() => rest.setShareContentModalOpen(false)} subject={activeSubject} />)}
                {isDeleteModalOpen && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} deletingItemType={deleteTarget?.type} />}
                {rest.isEditSubjectModalOpen && <EditSubjectModal isOpen={rest.isEditSubjectModalOpen} onClose={() => rest.setEditSubjectModalOpen(false)} subject={rest.subjectToActOn} />}
                {rest.isDeleteSubjectModalOpen && <DeleteSubjectModal isOpen={rest.isDeleteSubjectModalOpen} onClose={() => rest.setDeleteSubjectModalOpen(false)} subject={rest.subjectToActOn} />}
            </Suspense>

            <div className="fixed bottom-4 left-0 right-0 z-50 hidden lg:flex justify-between items-end px-6 pointer-events-none">
                <div className="pointer-events-auto">
                    <div className="relative flex items-center gap-3 bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-white/20 p-3 overflow-hidden">
                        <ParticleBackground className="absolute inset-0 z-0" />
                        <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-10 h-10 rounded-full relative z-10" />
                        <span className="font-semibold text-lg text-slate-800 relative z-10">SRCS Learning Portal</span>
                    </div>
                </div>

                <nav onMouseLeave={() => setHoveredIconIndex(null)} className="flex items-end h-24 p-2 bg-black/10 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-white/20 pointer-events-auto">
                    {navItems.map((item, index) => {
                        const isActive = activeView === item.view;
                        return (
                             <motion.div
                                key={item.view}
                                onMouseEnter={() => setHoveredIconIndex(index)}
                                className="relative group flex flex-col items-center"
                                animate={{ scale: getScale(index) }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                                <span className="absolute bottom-full mb-3 w-max bg-slate-800 text-white text-xs font-semibold rounded-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none transform group-hover:scale-100 scale-90">
                                    {item.text}
                                </span>
                                <button
                                    onClick={() => handleViewChange(item.view)}
                                    className={`relative w-16 h-16 flex items-center justify-center rounded-[30%] bg-gradient-to-br ${item.gradient} shadow-lg transition-all duration-300 mx-1.5 ring-0 hover:brightness-110 ${isActive ? 'ring-2 ring-white/90' : ''}`}
                                    aria-label={item.text}
                                >
                                    <item.icon size={36} className="text-white/90" />
                                </button>
                            </motion.div>
                        );
                    })}
                </nav>

                <div className="pointer-events-auto">
                    <div className="flex items-center gap-2 bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-white/20 p-2">
                        <div onClick={() => handleViewChange('profile')} className="flex items-center gap-2 cursor-pointer p-1 rounded-xl transition-colors hover:bg-black/5">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-slate-200">
                                {userProfile?.photoURL ? (<img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />) : (<UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="md" />)}
                            </div>
                            <span className="font-semibold text-slate-800 pr-2">{userProfile?.firstName || 'Profile'}</span>
                        </div>
                        <button onClick={logout} className="p-3 rounded-xl hover:bg-red-500/80 text-red-500 hover:text-white transition-colors group" title="Logout">
                            <IconPower size={22} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90" />
                        </button>
                    </div>
                </div>
            </div>

            <footer className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
                 <div className="mx-auto max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-900/10 p-2 flex justify-around items-center">
                    {navItems.map(item => {
                        const isActive = activeView === item.view;
                        return (
                            <button key={item.view} onClick={() => handleViewChange(item.view)} className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-100/70' : 'hover:bg-slate-100'}`}>
                                <item.icon className={`mb-0.5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} size={24}/>
                                <span className={`text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>{item.text}</span>
                            </button>
                        );
                    })}
                </div>
            </footer>
        </>
    );
};

export default TeacherDashboardLayout;