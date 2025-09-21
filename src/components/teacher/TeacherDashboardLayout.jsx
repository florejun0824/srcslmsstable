import React, { useState, Suspense, lazy } from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
    IconHome,
    IconUsers,
    IconSchool,
    IconCategory,
    IconUserCircle,
    IconShieldCog,
    IconPower,
} from '@tabler/icons-react';

// FIREBASE & SERVICES
import { getDocs, writeBatch, doc, where, query, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

// CORE COMPONENTS
import Spinner from '../common/Spinner';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import AnimatedRobot from './dashboard/widgets/AnimatedRobot';

// LAZY-LOADED VIEWS
const AdminDashboard = lazy(() => import('../../pages/AdminDashboard'));
const HomeView = lazy(() => import('./dashboard/views/HomeView'));
const ClassesView = lazy(() => import('./dashboard/views/ClassesView'));
const CoursesView = lazy(() => import('./dashboard/views/CoursesView'));
const StudentManagementView = lazy(() => import('./dashboard/views/StudentManagementView'));
const ProfileView = lazy(() => import('./dashboard/views/ProfileView'));

// LAZY-LOADED UI (MODALS)
const AiGenerationHub = lazy(() => import('./AiGenerationHub'));
const ChatDialog = lazy(() => import('./ChatDialog'));
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

// --- DESKTOP HEADER COMPONENT ---
const DesktopHeader = ({ activeView, handleViewChange, userProfile, setIsLogoutModalOpen }) => {
    const navItems = [
        { view: 'home', text: 'Home', icon: IconHome },
        { view: 'studentManagement', text: 'Students', icon: IconUsers },
        { view: 'classes', text: 'Classes', icon: IconSchool },
        { view: 'courses', text: 'Subjects', icon: IconCategory },
        { view: 'profile', text: 'Profile', icon: IconUserCircle },
    ];
    if (userProfile?.role === 'admin') {
        navItems.push({ view: 'admin', text: 'Admin', icon: IconShieldCog });
    }

    return (
        <div className="w-full flex items-center justify-between gap-6">
            {/* Left side: Logo + LMS Name */}
            <div className="flex items-center gap-4 flex-shrink-0">
                <div className="w-16 h-16 bg-neumorphic-base rounded-full shadow-neumorphic flex items-center justify-center">
                    <img
                        src="https://i.ibb.co/XfJ8scGX/1.png"
                        alt="Logo"
                        className="w-12 h-12 rounded-full"
                    />
                </div>
                <div className="p-3 bg-neumorphic-base rounded-3xl shadow-neumorphic hidden xl:block">
                    <span className="font-extrabold text-2xl text-slate-800">
                        SRCS Learning Portal
                    </span>
                </div>
            </div>

            {/* Center: Navigation */}
            <nav className="w-full max-w-xl p-3 bg-neumorphic-base rounded-3xl shadow-neumorphic flex justify-center items-center gap-3">
                {navItems.map((item) => {
                    const isActive = activeView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => handleViewChange(item.view)}
                            className={`group relative flex-1 flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
                                isActive
                                    ? 'shadow-neumorphic-inset'
                                    : 'hover:shadow-neumorphic-inset active:shadow-neumorphic-inset'
                            }`}
                            aria-label={item.text}
                        >
                            <item.icon
                                size={30}
                                className={`transition-colors duration-200 ${
                                    isActive
                                        ? 'text-sky-600'
                                        : 'text-slate-500 group-hover:text-slate-700'
                                }`}
                            />
                            <span
                                className={`mt-1 text-sm font-semibold ${
                                    isActive
                                        ? 'text-sky-600'
                                        : 'text-slate-500 group-hover:text-slate-700'
                                }`}
                            >
                                {item.text}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Right side: Profile + Logout */}
            <div className="flex items-center gap-4 flex-shrink-0">
			{/* Desktop header avatar — use a single square wrapper, no padding */}
			<div
			  onClick={() => handleViewChange('profile')}
			  className="
			    w-16 h-16 rounded-full bg-neumorphic-base shadow-neumorphic
			    flex items-center justify-center overflow-hidden cursor-pointer
			    transition-shadow hover:shadow-neumorphic-inset"
			>
			  {userProfile?.photoURL ? (
			    <img
			      src={userProfile.photoURL}
			      alt="Profile"
			      className="w-full h-full object-cover rounded-full block"
			      style={{ display: 'block' }}
			    />
			  ) : (
			    <UserInitialsAvatar
			      firstName={userProfile?.firstName}
			      lastName={userProfile?.lastName}
			      id={userProfile?.id}
			      size="full"   // fills the parent square
			    />
			  )}
			</div>

                <div className="p-3 bg-neumorphic-base rounded-3xl shadow-neumorphic hidden xl:block">
                    <span className="font-semibold text-lg text-slate-700">
                        {userProfile?.firstName || 'Profile'}
                    </span>
                </div>
                <div className="w-16 h-16 bg-neumorphic-base rounded-full shadow-neumorphic flex items-center justify-center">
                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className="text-red-500 transition-transform hover:scale-110"
                        title="Logout"
                    >
                        <IconPower size={26} />
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- END OF HEADER COMPONENT ---

// Helper component for loading states
const LoadingFallback = () => (
    <div className="w-full h-full flex justify-center items-center p-20">
        <Spinner />
    </div>
);

// Main Layout Component
const TeacherDashboardLayout = (props) => {
    const {
        user,
        userProfile,
        loading,
        error,
        activeView,
        handleViewChange,
        logout,
        isAiGenerating,
        setIsAiGenerating,
        isChatOpen,
        setIsChatOpen,
        messages,
        isAiThinking,
        handleAskAiWrapper,
        isAiHubOpen,
        setIsAiHubOpen,
        activeSubject,
        activeUnit,
        onSetActiveUnit,
        setViewLessonModalOpen,
        reloadKey,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        handleConfirmDelete,
        deleteTarget,
        handleInitiateDelete,
        handleCreateUnit,
        courses,
        ...rest
    } = props;

    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const { showToast } = useToast();
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] =
        useState(null);
    const [hoveredIconIndex, setHoveredIconIndex] = useState(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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
            showToast('Category renamed successfully!', 'success');
        } catch (error) {
            console.error('Error renaming category:', error);
            showToast('Failed to rename category.', 'error');
        } finally {
            setIsEditCategoryModalOpen(false);
        }
    };

    const handleEditCategory = (category) => {
        setCategoryToEdit(category);
        setIsEditCategoryModalOpen(true);
    };

    const courseCategories = [
        ...new Set(courses.map((c) => c.category).filter(Boolean)),
    ].map((name) => ({ id: name, name: name }));

    const handleAddSubjectWithCategory = (categoryName) => {
        setPreselectedCategoryForCourseModal(categoryName);
        rest.setCreateCourseModalOpen(true);
    };

    const navItems = [
        {
            view: 'home',
            text: 'Home',
            icon: IconHome,
            gradient: 'from-rose-500 to-pink-500',
        },
        {
            view: 'studentManagement',
            text: 'Students',
            icon: IconUsers,
            gradient: 'from-sky-500 to-cyan-400',
        },
        {
            view: 'classes',
            text: 'Classes',
            icon: IconSchool,
            gradient: 'from-emerald-500 to-green-400',
        },
        {
            view: 'courses',
            text: 'Subjects',
            icon: IconCategory,
            gradient: 'from-violet-500 to-purple-500',
        },
        {
            view: 'profile',
            text: 'Profile',
            icon: IconUserCircle,
            gradient: 'from-amber-500 to-yellow-400',
        },
    ];
    if (userProfile?.role === 'admin') {
        navItems.push({
            view: 'admin',
            text: 'Admin',
            icon: IconShieldCog,
            gradient: 'from-slate-500 to-slate-600',
        });
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
                        <div>
                            <strong className="block">An error occurred</strong>
                            <span>{error}</span>
                        </div>
                    </div>
                </div>
            );
        }
        switch (activeView) {
            case 'home':
                return (
                    <HomeView
                        key={`${reloadKey}-home`}
                        userProfile={userProfile}
                        handleViewChange={handleViewChange}
                        {...rest}
                    />
                );
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
                return (
                    <ProfileView
                        key={`${reloadKey}-profile`}
                        user={user}
                        userProfile={userProfile}
                        logout={logout}
                        {...rest}
                    />
                );
            case 'admin':
                return (
                    <div
                        key={`${reloadKey}-admin`}
                        className="p-4 sm:p-6 text-gray-800"
                    >
                        <AdminDashboard />
                    </div>
                );
            default:
                return (
                    <HomeView
                        key={`${reloadKey}-default`}
                        userProfile={userProfile}
                        handleViewChange={handleViewChange}
                        {...rest}
                    />
                );
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

                .logout-modal-enter { opacity: 0; transform: scale(0.9); }
                .logout-modal-enter-active { opacity: 1; transform: scale(1); transition: opacity 300ms, transform 300ms; }
                .logout-modal-exit { opacity: 1; transform: scale(1); }
                .logout-modal-exit-active { opacity: 0; transform: scale(0.9); transition: opacity 300ms, transform 300ms; }
            `}</style>

            <div className="min-h-screen flex flex-col bg-neumorphic-base font-sans antialiased text-gray-800">
                {/* Mobile Header */}
                <header className="sticky top-0 z-40 p-2 bg-neumorphic-base shadow-neumorphic lg:hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img
                                src="https://i.ibb.co/XfJ8scGX/1.png"
                                alt="Logo"
                                className="w-9 h-9 rounded-full"
                            />
                            <span className="font-bold text-lg text-gray-800">
                                SRCS Portal
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
							  <div
							    onClick={() => handleViewChange('profile')}
							    className="p-1 rounded-full cursor-pointer hover:shadow-neumorphic-inset"
							  >
							    {userProfile?.photoURL ? (
							      <img
							        src={userProfile.photoURL}
							        alt="Profile"
							        className="w-9 h-9 object-cover rounded-full"
							      />
							    ) : (
							      <UserInitialsAvatar
							        firstName={userProfile?.firstName}
							        lastName={userProfile?.lastName}
							        size="sm"
							      />
							    )}
							  </div>
							  
					
                            
                            <button
                                onClick={() => setIsLogoutModalOpen(true)}
                                className="p-2.5 rounded-full text-red-500 hover:shadow-neumorphic-inset"
                                title="Logout"
                            >
                                <IconPower size={22} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Desktop Header */}
                <div className="hidden lg:block sticky top-0 z-30 bg-neumorphic-base px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 pb-4">
                    <div className="w-full max-w-screen-2xl mx-auto">
                        <DesktopHeader
                            activeView={activeView}
                            handleViewChange={handleViewChange}
                            userProfile={userProfile}
                            setIsLogoutModalOpen={setIsLogoutModalOpen}
                        />
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8">
                    <SwitchTransition mode="out-in">
                        <CSSTransition
                            key={activeView}
                            timeout={300}
                            classNames="view-fade"
                        >
                            <Suspense fallback={<LoadingFallback />}>
                                {renderMainContent()}
                            </Suspense>
                        </CSSTransition>
                    </SwitchTransition>
                </main>
            </div>

            {/* Floating Robot & Modals */}
            <Suspense fallback={null}>
                <CSSTransition
                    in={!isChatOpen}
                    timeout={300}
                    classNames="animated-robot"
                    unmountOnExit
                >
                    <AnimatedRobot onClick={() => setIsChatOpen(true)} />
                </CSSTransition>

                {isAiHubOpen && (
                    <AiGenerationHub
                        isOpen={isAiHubOpen}
                        onClose={() => setIsAiHubOpen(false)}
                        subjectId={activeSubject?.id}
                        unitId={activeUnit?.id}
                    />
                )}
                {isChatOpen && (
                    <ChatDialog
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        messages={messages}
                        onSendMessage={handleAskAiWrapper}
                        isAiThinking={isAiThinking}
                        userFirstName={userProfile?.firstName}
                    />
                )}
                {rest.isArchivedModalOpen && (
                    <ArchivedClassesModal
                        isOpen={rest.isArchivedModalOpen}
                        onClose={() => rest.setIsArchivedModalOpen(false)}
                        archivedClasses={rest.archivedClasses}
                        onUnarchive={rest.handleUnarchiveClass}
                        onDelete={(classId) => rest.handleDeleteClass(classId, true)}
                    />
                )}
                {rest.isEditProfileModalOpen && (
                    <EditProfileModal
                        isOpen={rest.isEditProfileModalOpen}
                        onClose={() => rest.setEditProfileModalOpen(false)}
                        userProfile={userProfile}
                        onUpdate={rest.handleUpdateProfile}
                    />
                )}
                <ChangePasswordModal
                    isOpen={rest.isChangePasswordModalOpen}
                    onClose={() => rest.setChangePasswordModalOpen(false)}
                    onSubmit={rest.handleChangePassword}
                />
                <CreateCategoryModal
                    isOpen={rest.isCreateCategoryModalOpen}
                    onClose={() => rest.setCreateCategoryModalOpen(false)}
                    teacherId={user?.uid || user?.id}
                />
                {isEditCategoryModalOpen && categoryToEdit && (
                    <EditCategoryModal
                        isOpen={isEditCategoryModalOpen}
                        onClose={() => setIsEditCategoryModalOpen(false)}
                        categoryName={categoryToEdit.name}
                        onSave={handleRenameCategory}
                    />
                )}
                <CreateClassModal
                    isOpen={rest.isCreateClassModalOpen}
                    onClose={() => rest.setCreateClassModalOpen(false)}
                    teacherId={user?.uid || user?.id}
                />
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
                {rest.classOverviewModal.isOpen && (
                    <ClassOverviewModal
                        isOpen={rest.classOverviewModal.isOpen}
                        onClose={() =>
                            rest.setClassOverviewModal({
                                isOpen: false,
                                data: null,
                            })
                        }
                        classData={rest.classOverviewModal.data}
                        courses={courses}
                        onRemoveStudent={rest.handleRemoveStudentFromClass}
                    />
                )}
                {rest.isEditClassModalOpen && (
                    <EditClassModal
                        isOpen={rest.isEditClassModalOpen}
                        onClose={() => rest.setEditClassModalOpen(false)}
                        classData={rest.classToEdit}
                    />
                )}
                {rest.isAddUnitModalOpen && (
                    <AddUnitModal
                        isOpen={rest.isAddUnitModalOpen}
                        onClose={() => rest.setAddUnitModalOpen(false)}
                        subjectId={activeSubject?.id}
                        onCreateUnit={handleCreateUnit}
                    />
                )}
                {rest.editUnitModalOpen && rest.selectedUnit && (
                    <EditUnitModal
                        isOpen={rest.editUnitModalOpen}
                        onClose={() => rest.setEditUnitModalOpen(false)}
                        unit={rest.selectedUnit}
                    />
                )}
                {rest.addLessonModalOpen && rest.selectedUnit && (
                    <AddLessonModal
                        isOpen={rest.addLessonModalOpen}
                        onClose={() => rest.setAddLessonModalOpen(false)}
                        unitId={rest.selectedUnit?.id}
                        subjectId={activeSubject?.id}
                        setIsAiGenerating={props.setIsAiGenerating}
                    />
                )}
                {rest.addQuizModalOpen && rest.selectedUnit && (
                    <AddQuizModal
                        isOpen={rest.addQuizModalOpen}
                        onClose={() => rest.setAddQuizModalOpen(false)}
                        unitId={rest.selectedUnit?.id}
                        subjectId={activeSubject?.id}
                    />
                )}
                {rest.deleteUnitModalOpen && rest.selectedUnit && (
                    <DeleteUnitModal
                        isOpen={rest.deleteUnitModalOpen}
                        onClose={() => rest.setDeleteUnitModalOpen(false)}
                        unitId={rest.selectedUnit?.id}
                        subjectId={activeSubject?.id}
                    />
                )}
                {rest.editLessonModalOpen && rest.selectedLesson && (
                    <EditLessonModal
                        isOpen={rest.editLessonModalOpen}
                        onClose={() => rest.setEditLessonModalOpen(false)}
                        lesson={rest.selectedLesson}
                    />
                )}
                
                {rest.isShareContentModalOpen && activeSubject && (
                    <ShareMultipleLessonsModal
                        isOpen={rest.isShareContentModalOpen}
                        onClose={() => rest.setShareContentModalOpen(false)}
                        subject={activeSubject}
                    />
                )}
                {isDeleteModalOpen && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={handleConfirmDelete}
                        deletingItemType={deleteTarget?.type}
                    />
                )}
                {rest.isEditSubjectModalOpen && (
                    <EditSubjectModal
                        isOpen={rest.isEditSubjectModalOpen}
                        onClose={() => rest.setEditSubjectModalOpen(false)}
                        subject={rest.subjectToActOn}
                    />
                )}
                {rest.isDeleteSubjectModalOpen && (
                    <DeleteSubjectModal
                        isOpen={rest.isDeleteSubjectModalOpen}
                        onClose={() => rest.setDeleteSubjectModalOpen(false)}
                        subject={rest.subjectToActOn}
                    />
                )}
            </Suspense>

            {/* Logout Confirmation Modal */}
            <CSSTransition
                in={isLogoutModalOpen}
                timeout={300}
                classNames="logout-modal"
                unmountOnExit
            >
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-neumorphic-base rounded-3xl shadow-neumorphic p-6 w-[90%] max-w-sm text-center">
                        <h2 className="text-xl font-bold text-slate-800 mb-3">
                            Confirm Logout
                        </h2>
                        <p className="text-sm text-slate-600 mb-6">
                            Are you sure you want to log out?
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="px-5 py-2 rounded-full bg-neumorphic-base shadow-neumorphic text-slate-700 hover:shadow-neumorphic-inset transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setIsLogoutModalOpen(false);
                                    logout();
                                }}
                                className="px-5 py-2 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </CSSTransition>

            {/* Mobile Footer Nav */}
            <footer className="sticky bottom-0 z-50 p-2 bg-neumorphic-base shadow-neumorphic lg:hidden">
                <div className="flex justify-around items-center">
                    {navItems.map((item) => {
                        const isActive = activeView === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-300 ${
                                    isActive
                                        ? 'shadow-neumorphic-inset'
                                        : 'hover:shadow-neumorphic-inset'
                                }`}
                            >
                                <item.icon
                                    className={`mb-0.5 transition-colors ${
                                        isActive
                                            ? 'text-sky-600'
                                            : 'text-gray-500'
                                    }`}
                                    size={24}
                                />
                                <span
                                    className={`text-xs font-semibold transition-colors ${
                                        isActive
                                            ? 'text-sky-600'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    {item.text}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </footer>
        </>
    );
};

export default TeacherDashboardLayout;
