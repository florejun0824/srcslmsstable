import React, { useState, Suspense, lazy, Fragment } from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import {
    IconHome,
    IconUsers,
    IconSchool,
    IconCategory,
    IconUserCircle,
    IconShieldCog,
    IconPower,
	IconChartBar,
	
} from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';

// FIREBASE & SERVICES
import { getDocs, writeBatch, doc, where, query, collection, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

// CORE COMPONENTS
import Spinner from '../common/Spinner';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import AnimatedRobot from './dashboard/widgets/AnimatedRobot';
import ThemeToggle from '../common/ThemeToggle';

// LAZY-LOADED VIEWS
const AdminDashboard = lazy(() => import('../../pages/AdminDashboard'));
const HomeView = lazy(() => import('./dashboard/views/HomeView'));
const ClassesView = lazy(() => import('./dashboard/views/ClassesView'));
const CoursesView = lazy(() => import('./dashboard/views/CoursesView'));
const StudentManagementView = lazy(() => import('./dashboard/views/StudentManagementView'));
const ProfileView = lazy(() => import('./dashboard/views/ProfileView'));
const AnalyticsView = lazy(() => import('./dashboard/views/AnalyticsView'));

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
const EditClassModal = lazy(() => import('./EditClassModal'));
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


// --- ProfileDropdown Component (Unchanged) ---
const ProfileDropdown = ({ userProfile, onLogout, size = 'desktop' }) => {
  const buttonSize = size === 'desktop' ? 'w-16 h-16' : 'w-9 h-9';
  const avatarSize = size === 'desktop' ? 'full' : 'sm';

  return (
    <Menu as="div" className="relative z-50 flex-shrink-0">
      <Menu.Button 
        className={`flex items-center justify-center ${buttonSize} rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
      >
        {userProfile?.photoURL ? (
          <img
            src={userProfile.photoURL}
            alt="Profile"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <UserInitialsAvatar
            firstName={userProfile?.firstName}
            lastName={userProfile?.lastName}
            id={userProfile?.id}
            size={avatarSize}
          />
        )}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-slate-200 dark:divide-slate-700 rounded-2xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark ring-1 ring-black ring-opacity-5 focus:outline-none p-2">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {userProfile?.firstName} {userProfile?.lastName}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {userProfile?.email}
            </p>
          </div>
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <NavLink
                  to="/dashboard/profile"
                  className={`${
                    active ? 'bg-slate-200 dark:bg-slate-700' : ''
                  } group flex w-full items-center rounded-lg p-3 text-sm font-medium text-slate-800 dark:text-slate-200`}
                >
                  <IconUserCircle className="mr-3 h-5 w-5 text-slate-500 dark:text-slate-400" />
                  Profile
                </NavLink>
              )}
            </Menu.Item>
          </div>
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onLogout}
                  className={`${
                    active ? 'bg-red-100 dark:bg-red-900/20' : ''
                  } group flex w-full items-center rounded-lg p-3 text-sm font-medium text-red-600 dark:text-red-400`}
                >
                  <IconPower className="mr-3 h-5 w-5" />
                  Logout
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};


// --- DESKTOP HEADER COMPONENT (Unchanged) ---
const DesktopHeader = ({ userProfile, setIsLogoutModalOpen }) => {
    const navItems = [
        { view: 'home', text: 'Home', icon: IconHome },
        { view: 'studentManagement', text: 'Students', icon: IconUsers },
        { view: 'classes', text: 'Classes', icon: IconSchool },
        { view: 'courses', text: 'Subjects', icon: IconCategory },
		{ view: 'analytics', icon: IconChartBar, text: 'Analytics' },
        { view: 'profile', text: 'Profile', icon: IconUserCircle },
    ];
    if (userProfile?.role === 'admin') {
        navItems.push({ view: 'admin', text: 'Admin', icon: IconShieldCog });
    }

    return (
        <div className="w-full flex items-center justify-between gap-6">
            {/* Left side: Logo + LMS Name */}
            <div className="flex items-center gap-4 flex-shrink-0">
                <div className="w-16 h-16 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-center">
                    <img
                        src="https://i.ibb.co/XfJ8scGX/1.png"
                        alt="Logo"
                        className="w-12 h-12 rounded-full"
                    />
                </div>
                <div className="p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark hidden xl:block">
                    <span className="font-extrabold text-2xl text-slate-900 dark:text-slate-100">
                        SRCS Learning Portal
                    </span>
                </div>
            </div>

            {/* Center: Navigation */}
            <nav className="w-full max-w-2xl p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark flex justify-center items-center gap-3">
                {navItems.map((item) => {
                    return (
                        <NavLink
                            key={item.view}
                            to={item.view === 'home' ? '/dashboard' : `/dashboard/${item.view}`}
                            end={item.view === 'home'} 
                            className={({ isActive }) => 
                                `group relative flex-1 flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
                                    isActive
                                        ? 'shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark'
                                        : 'hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark'
                                }`
                            }
                            aria-label={item.text}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon
                                        size={28}
                                        className={`transition-colors duration-200 ${
                                            isActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                                        }`}
                                    />
                                    <span
                                        className={`mt-0.5 text-sm font-semibold ${
                                            isActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                                        }`}
                                    >
                                        {item.text}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Right side: Profile Dropdown */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <ProfileDropdown 
                userProfile={userProfile}
                onLogout={() => setIsLogoutModalOpen(true)}
                size="desktop"
              />
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
		activeClasses,
		handleUpdateClass,
        ...rest
    } = props;

    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const { showToast } = useToast();
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] =
        useState(null);
    const [hoveredIconIndex, setHoveredIconIndex] = useState(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // ... (All handlers: handleRenameCategory, handleEditCategory, etc. remain unchanged) ...
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
			view: 'analytics',
			text: 'Analytics',
			icon: IconChartBar,
			gradient: 'from-teal-500 to-cyan-500',
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
	// FIREBASE IMPORTS CHECK:
	// Ensure 'updateDoc' is imported from 'firebase/firestore' along with 'doc' and 'db'.
	// import { getDocs, writeBatch, doc, where, query, collection, updateDoc } from 'firebase/firestore'; 

	const handleStartOnlineClass = async (classId, meetingCode, meetLink) => {
		    try {
		        // 1. Update Firestore: Mark the class as live
		        const classRef = doc(db, 'classes', classId);
		        await updateDoc(classRef, {
		            videoConference: {
		                isLive: true,
		                meetingCode: meetingCode,
		                platform: 'GOOGLE_MEET',
		                startTime: new Date().toISOString(),
		            },
		        });
        
		        // 2. Notify user and open the meeting
		        showToast(`Class ${meetingCode} is now live! Opening Google Meet...`, 'success');
		        window.open(meetLink, '_blank');

		    } catch (error) {
		        console.error("Error starting online class:", error);
		        showToast('Failed to start the online class due to a system error.', 'error');
		    }
		};
		const handleEndOnlineClass = async (classId) => {
		    try {
		        const classRef = doc(db, 'classes', classId);
		        // Clear the live status and meeting data
		        await updateDoc(classRef, {
		            'videoConference.isLive': false,
		            'videoConference.meetingCode': null,
		            'videoConference.startTime': null,
		        });
		        showToast('Online class successfully ended.', 'info');

		    } catch (error) {
		        console.error("Error ending online class:", error);
		        showToast('Failed to end the online class.', 'error');
		    }
		};

    const renderMainContent = () => {
        if (loading) return <LoadingFallback />;
        if (error) {
            return (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 text-red-800 dark:text-red-200 p-4 rounded-lg shadow-md m-4">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 mt-1 text-red-600 dark:text-red-400" />
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
						activeClasses={activeClasses} 
                        handleViewChange={handleViewChange}
                        {...rest}
                    />
                );
            
            // --- H E R E   I S   T H E   F I X ---
			case 'classes':
				
			    return (
                    <ClassesView 
                        key={`${reloadKey}-classes`} 
                        activeClasses={activeClasses} 
                        // We must explicitly pass the props down
                        handleArchiveClass={props.handleArchiveClass} 
                        handleDeleteClass={props.handleDeleteClass}
						handleStartOnlineClass={handleStartOnlineClass}
						handleEndOnlineClass={handleEndOnlineClass}
                        {...rest} 
                    />
                );
            // --- E N D   O F   F I X ---

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
						activeClasses={activeClasses}
                    />
                );
			case 'studentManagement':
			    return <StudentManagementView key={`${reloadKey}-sm`} courses={courses} activeClasses={activeClasses} {...rest} />;
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
			case 'analytics':
			            return (
			                <AnalyticsView
			                    key={`${reloadKey}-analytics`}
			                    activeClasses={activeClasses}
			                    courses={courses}
			                />
			            );
            case 'admin':
                return (
                    <div
                        key={`${reloadKey}-admin`}
                        className="p-4 sm:p-6 text-slate-900 dark:text-slate-100" 
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
                /* ... (all <style> tag content remains unchanged) ... */
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
            
            <div className="min-h-screen flex flex-col bg-neumorphic-base dark:bg-neumorphic-base-dark font-sans antialiased text-slate-900 dark:text-slate-100">
                {/* Mobile Header */}
                <header className="sticky top-0 z-40 p-2 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark lg:hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img
                                src="https://i.ibb.co/XfJ8scGX/1.png"
                                alt="Logo"
                                className="w-9 h-9 rounded-full"
                            />
                            <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                                SRCS LMS
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <ProfileDropdown 
                              userProfile={userProfile}
                              onLogout={() => setIsLogoutModalOpen(true)}
                              size="mobile"
                            />
                        </div>
                    </div>
                </header>

                {/* Desktop Header */}
                <div className="hidden lg:block sticky top-0 z-[10] bg-neumorphic-base dark:bg-neumorphic-base-dark px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 pb-4">
                    <div className="w-full max-w-screen-2xl mx-auto flex justify-between items-center">
                        <DesktopHeader
                            userProfile={userProfile}
                            setIsLogoutModalOpen={setIsLogoutModalOpen}
                        />
                        <ThemeToggle />
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
                    in={!isChatOpen && activeView === 'home'}
                    timeout={300}
                    classNames="animated-robot"
                    unmountOnExit
                >
                    <AnimatedRobot onClick={() => setIsChatOpen(true)} />
                </CSSTransition>

                {/* ... (All Modals remain here, they will be themed internally) ... */}
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
                        onDelete={props.handleDeleteClass} // <-- Pass down the correct prop
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
					courses={courses}
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
						courses={courses}
						onUpdate={handleUpdateClass}
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
                    <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark p-6 w-[90%] max-w-sm text-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                            Confirm Logout
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                            Are you sure you want to log out?
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="px-5 py-2 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark text-slate-600 dark:text-slate-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition"
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
            <footer className="sticky bottom-0 z-50 p-2 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark lg:hidden">
                <div className="flex justify-around items-center">
                    {navItems.map((item) => {
                        return (
                            <NavLink
                                key={item.view}
                                to={item.view === 'home' ? '/dashboard' : `/dashboard/${item.view}`}
                                end={item.view === 'home'}
                                className={({ isActive }) => 
                                    `flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-300 ${
                                        isActive
                                            ? 'shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark'
                                            : 'hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon
                                            className={`mb-0.5 transition-colors ${
                                                isActive
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-slate-500 dark:text-slate-400'
                                            }`}
                                            size={24}
                                        />
                                        <span
                                            className={`text-xs font-semibold transition-colors ${
                                                isActive
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {item.text}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </footer>
        </>
    );
};

export default TeacherDashboardLayout;