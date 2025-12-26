// src/components/teacher/TeacherDashboardLayout.jsx
import React, { useState, Suspense, lazy, Fragment, useEffect, useRef, useLayoutEffect, memo, useMemo } from 'react';
import { CSSTransition } from 'react-transition-group'; 
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';

// --- NEW AESTHETIC ICONS (Lucide React) ---
import { 
    Home, 
    Users, 
    GraduationCap, // For Classes
    BookOpen,      // For Subjects
    UserCircle, 
    Settings,      // For Admin
    BarChart2,     // For Analytics
    Rocket,        // For Lounge
    Menu as MenuIcon,
    X,
    LayoutGrid,    // For Mobile Menu
    Palette,
    LogOut,
    Power
} from 'lucide-react';

import { NavLink } from 'react-router-dom';

// FIREBASE & SERVICES
import { getDocs, writeBatch, doc, where, query, collection, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

// CORE COMPONENTS
import AnimatedRobot from './dashboard/widgets/AnimatedRobot';
import UniversalBackground from '../common/UniversalBackground';
import ThemeToggle from '../common/ThemeToggle';
import UserInitialsAvatar from '../common/UserInitialsAvatar';

// LAZY-LOADED VIEWS
const AdminDashboard = lazy(() => import('../../pages/AdminDashboard'));
const HomeView = lazy(() => import('./dashboard/views/HomeView'));
const ClassesView = lazy(() => import('./dashboard/views/ClassesView'));
const CoursesView = lazy(() => import('./dashboard/views/CoursesView'));
const StudentManagementView = lazy(() => import('./dashboard/views/StudentManagementView'));
const ProfileView = lazy(() => import('./dashboard/views/ProfileView'));
const AnalyticsView = lazy(() => import('./dashboard/views/AnalyticsView'));
const LoungeView = lazy(() => import('../student/LoungeView'));

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

// 🏫 SCHOOL BRANDING CONFIGURATION
const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS LMS', logo: '/logo.png' }, // Default
    'hras_sipalay': { name: 'HRA LMS', logo: '/logos/hra.png' },
    'kcc_kabankalan': { name: 'KCC LMS', logo: '/logos/kcc.png' },
    'icad_dancalan': { name: 'ICA LMS', logo: '/logos/ica.png' },
    'mchs_magballo': { name: 'MCHS LMS', logo: '/logos/mchs.png' },
    'ichs_ilog': { name: 'ICHS LMS', logo: '/logos/ichs.png' }
};

const getSchoolBranding = (schoolId) => {
    return SCHOOL_BRANDING[schoolId] || SCHOOL_BRANDING['srcs_main'];
};

// --- CUSTOM CSS: OPTIMIZED FOR PERFORMANCE ---
const macOsStyles = `
  /* Global Scrollbar Styling */
  ::-webkit-scrollbar { width: 0px; height: 0px; }
  .mac-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
  .mac-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .mac-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 100px; }
  .dark .mac-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); }

  /* Glass Morphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.05),
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255,255,255,0.5);
    backdrop-filter: blur(12px);
  }
  .dark .glass-panel {
    background: rgba(26, 29, 36, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 10px 15px -3px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
  }
  
  /* macOS Dock */
  .macos-dock {
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(20px);
    transition: width 0.3s ease;
  }
  .dark .macos-dock {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6);
  }
`;

// --- SKELETAL LOADING STATE ---
const DashboardSkeleton = () => (
    <div className="w-full h-full p-6 space-y-8 animate-pulse">
        <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>
            ))}
        </div>
        <div className="space-y-4">
            <div className="w-48 h-8 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            {[1, 2, 3].map((i) => (
                <div key={i} className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>
            ))}
        </div>
    </div>
);

// --- ThemeDropdown Component ---
const ThemeDropdown = ({ size = 'desktop', showTutorial = false, onTutorialComplete }) => {
  const buttonSize = size === 'desktop' ? 'w-11 h-11' : 'w-9 h-9';
  const iconSize = size === 'desktop' ? 20 : 18;

  return (
    <div className="relative z-50 flex-shrink-0">
      <Menu as="div" className="relative">
        <Menu.Button
          className={`relative flex items-center justify-center ${buttonSize} rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 text-slate-600 dark:text-slate-300 ${showTutorial ? 'ring-4 ring-blue-500/50 z-50' : ''}`}
          title="Change Theme"
          onClick={() => {
             if (showTutorial && onTutorialComplete) onTutorialComplete();
          }}
        >
          <Palette size={iconSize} strokeWidth={1.5} />
          
          {showTutorial && (
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400/30"></span>
          )}
        </Menu.Button>

        <AnimatePresence>
            {showTutorial && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute right-0 mt-4 w-64 p-4 rounded-2xl bg-slate-800/90 border border-blue-500/30 shadow-2xl backdrop-blur-xl z-[60]"
                >
                    <div className="absolute -top-2 right-4 w-4 h-4 bg-slate-800 rotate-45 border-t border-l border-blue-500/30"></div>
                    <div className="relative z-10">
                        <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                           ✨ Set the Vibe
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed mb-3">
                            Customize your dashboard ambience! Switch between <strong>Christmas</strong>, <strong>Cyberpunk</strong>, <strong>Space</strong> and more.
                        </p>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(onTutorialComplete) onTutorialComplete();
                            }}
                            className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95 translate-y-2"
          enterTo="transform opacity-100 scale-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="transform opacity-100 scale-100 translate-y-0"
          leaveTo="transform opacity-0 scale-95 translate-y-2"
        >
          <Menu.Items className="absolute right-0 mt-2 w-72 origin-top-right focus:outline-none z-[60]">
             <div className="relative">
               <ThemeToggle />
             </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

// --- ProfileDropdown Component ---
const ProfileDropdown = ({ userProfile, onLogout, size = 'desktop' }) => {
  const buttonSize = size === 'desktop' ? 'w-11 h-11' : 'w-9 h-9';
  const avatarSize = size === 'desktop' ? 'full' : 'sm';

  return (
    <Menu as="div" className="relative z-50 flex-shrink-0">
      <Menu.Button 
        className={`flex items-center justify-center ${buttonSize} rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 focus:outline-none`}
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
            className="w-full h-full text-[10px] font-bold"
          />
        )}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-300"
        enterFrom="transform opacity-0 scale-90 translate-y-2"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-200"
        leaveFrom="transform opacity-100 scale-100 translate-y-0"
        leaveTo="transform opacity-0 scale-95 translate-y-2"
      >
        <Menu.Items className="absolute right-0 mt-3 w-64 origin-top-right rounded-[1.5rem] bg-white dark:bg-[#1A1D24] shadow-2xl ring-1 ring-black/5 border border-slate-200 dark:border-slate-700 focus:outline-none divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden z-[60]">
          <div className="px-5 py-4 bg-slate-50 dark:bg-black/20">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {userProfile?.firstName} {userProfile?.lastName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">
              {userProfile?.email}
            </p>
          </div>
          <div className="p-2 space-y-1">
            <Menu.Item>
              {({ active }) => (
                <NavLink
                  to="/dashboard/profile"
                  className={`${
                    active ? 'bg-slate-100 dark:bg-slate-800 shadow-sm' : 'hover:bg-transparent'
                  } group flex w-full items-center rounded-xl p-3 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all duration-200`}
                >
                  <UserCircle strokeWidth={2} className="mr-3 h-5 w-5 text-blue-500 dark:text-blue-400" />
                  Profile
                </NavLink>
              )}
            </Menu.Item>
          </div>
          <div className="p-2">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onLogout}
                  className={`${
                    active ? 'bg-red-50 dark:bg-red-900/20 shadow-sm' : 'hover:bg-transparent'
                  } group flex w-full items-center rounded-xl p-3 text-xs font-bold text-red-600 dark:text-red-400 transition-all duration-200`}
                >
                  <LogOut strokeWidth={2} className="mr-3 h-5 w-5" />
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


// --- DESKTOP HEADER (Monet Powered) ---
const DesktopHeader = ({ userProfile, setIsLogoutModalOpen, showTutorial, onTutorialComplete }) => {
    const { monetTheme } = useTheme();
    
    // 🏫 Get Dynamic Branding
    const branding = getSchoolBranding(userProfile?.schoolId);

    // UPDATED NAV ITEMS WITH LUCIDE ICONS
    const navItems = [
        { view: 'home', text: 'Home', icon: Home },
        { view: 'lounge', text: 'Lounge', icon: Rocket },
        { view: 'studentManagement', text: 'Students', icon: Users },
        { view: 'classes', text: 'Classes', icon: GraduationCap },
        { view: 'courses', text: 'Subjects', icon: BookOpen },
        { view: 'analytics', icon: BarChart2, text: 'Analytics' },
        { view: 'profile', text: 'Profile', icon: UserCircle },
    ];
    if (userProfile?.role === 'admin') {
        navItems.push({ view: 'admin', text: 'Admin', icon: Settings });
    }

    return (
        <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            // 2. APPLY ONLY THE GLASS STYLES (Variables are already on Root)
            style={monetTheme.glassStyle} 
            className="glass-panel mx-auto max-w-[1920px] rounded-[2rem] px-6 py-3 flex items-center justify-between relative w-full z-50 transform-gpu transition-all duration-500"
        >
            {/* Left: Logo */}
            <div className="flex items-center gap-4 flex-shrink-0 z-20 group cursor-default">
                <div className="w-11 h-11 rounded-[1.2rem] bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] flex items-center justify-center flex-shrink-0 border border-slate-200/60 dark:border-slate-700/60 transition-transform duration-500 group-hover:rotate-6 drop-shadow-md">
                    <img src={branding.logo} alt="Logo" className="w-7 h-7 object-contain drop-shadow-sm" />
                </div>
                <div className="hidden xl:block">
                    <span className="font-black text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight leading-tight block">
                        {branding.name}
                    </span>
                </div>
            </div>

            {/* Center: Candy Navigation */}
            <nav className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-10">
                <div className="flex items-center gap-1.5 p-2 bg-slate-100/50 dark:bg-black/20 rounded-full border border-white/50 dark:border-white/5 shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-md">
                    {navItems.map((item) => {
                        return (
                            <NavLink
                                key={item.view}
                                to={item.view === 'home' ? '/dashboard' : `/dashboard/${item.view}`}
                                end={item.view === 'home'} 
                                className="relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 group outline-none z-10"
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.div
                                                layoutId="desktopNavPill"
                                                className="absolute inset-0 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-black/40 border border-black/5 dark:border-white/10"
                                                // Use CSS variable for accent
                                                style={{ 
                                                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', 
                                                    backgroundColor: 'var(--monet-accent)' 
                                                }}
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-2">
                                            <item.icon
                                                strokeWidth={isActive ? 2.5 : 2}
                                                size={18}
                                                className={`transition-all duration-300 ${
                                                    isActive 
                                                    ? 'text-white drop-shadow-sm scale-105' 
                                                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                                }`}
                                            />
                                            <span className={`text-[11px] font-bold uppercase tracking-wide transition-all duration-300 ${
                                                isActive 
                                                ? 'text-white' 
                                                : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                            }`}>
                                                {item.text}
                                            </span>
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 flex-shrink-0 z-20">
                <ThemeDropdown 
                   size="desktop" 
                   showTutorial={showTutorial} 
                   onTutorialComplete={onTutorialComplete}
                />
                <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent mx-1"></div>
                <ProfileDropdown 
                    userProfile={userProfile}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    size="desktop"
                />
            </div>
        </motion.div>
    );
};


// Main Layout Component
const TeacherDashboardLayout = (props) => {
    const {
        user,
        userProfile,
        loading,
        authLoading,
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
        isLoungeLoading,
        loungePosts,
        loungeUsersMap,
        fetchLoungePosts,
        loungePostUtils,
        ...rest
    } = props;

    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const { showToast } = useToast();
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] = useState(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // --- TUTORIAL STATE ---
    const [showAmbienceTutorial, setShowAmbienceTutorial] = useState(false);
    const robotRef = useRef(null);
    
    // Inject Custom CSS
    useLayoutEffect(() => {
        const styleId = 'teacher-dashboard-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = macOsStyles;
            document.head.appendChild(style);
        }
    }, []);

    // Tutorial Logic
    useEffect(() => {
        if (activeView === 'home' && !loading) {
            const hasSeenTutorial = localStorage.getItem('hasSeenAmbienceTutorial');
            if (!hasSeenTutorial) {
                const timer = setTimeout(() => {
                    setShowAmbienceTutorial(true);
                }, 2000); 
                return () => clearTimeout(timer);
            }
        } else {
            setShowAmbienceTutorial(false);
        }
    }, [activeView, loading]);

    const handleTutorialComplete = () => {
        setShowAmbienceTutorial(false);
        localStorage.setItem('hasSeenAmbienceTutorial', 'true');
    };

    // --- MONET ENGINE INTEGRATION (via Context) ---
    const { monetTheme } = useTheme(); 
    
    // 🏫 Get Dynamic Branding for Mobile Header
    const branding = getSchoolBranding(userProfile?.schoolId);

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

    // UPDATED MOBILE DOCK ITEMS (Lucide)
    const bottomNavItems = [
        { view: 'home', text: 'Home', icon: Home },
        { view: 'classes', text: 'Classes', icon: GraduationCap },
        { view: 'courses', text: 'Subjects', icon: BookOpen },
        { view: 'profile', text: 'Profile', icon: UserCircle },
    ];

    // UPDATED ACTION MENU ITEMS (Lucide)
    const actionMenuItems = [
        { view: 'lounge', text: 'Lounge', icon: Rocket },
        { view: 'studentManagement', text: 'Students', icon: Users },
        { view: 'analytics', text: 'Analytics', icon: BarChart2 },
        ...(userProfile?.role === 'admin' ? [{ view: 'admin', text: 'Admin', icon: Settings }] : [])
    ];

    const handleStartOnlineClass = async (classId, meetingCode, meetLink) => {
            try {
                const classRef = doc(db, 'classes', classId);
                await updateDoc(classRef, {
                    videoConference: {
                        isLive: true,
                        meetingCode: meetingCode,
                        platform: 'GOOGLE_MEET',
                        startTime: new Date().toISOString(),
                    },
                });
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
        if (loading || authLoading) return <DashboardSkeleton />;

        if (error) {
            return (
                <div className="glass-panel border-l-4 border-red-500 text-red-800 dark:text-red-200 p-6 rounded-2xl m-4">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                        <div>
                            <strong className="block text-lg font-bold">System Notification</strong>
                            <span className="text-sm opacity-80">{error}</span>
                        </div>
                    </div>
                </div>
            );
        }
        switch (activeView) {
            case 'home': return <HomeView key={`${reloadKey}-home`} userProfile={userProfile} activeClasses={activeClasses} handleViewChange={handleViewChange} {...rest} />;
            case 'lounge': return <LoungeView key={`${reloadKey}-lounge`} isPostsLoading={isLoungeLoading} publicPosts={loungePosts} usersMap={loungeUsersMap} fetchPublicPosts={fetchLoungePosts} {...loungePostUtils} />;
            case 'classes': return <ClassesView key={`${reloadKey}-classes`} activeClasses={activeClasses} handleArchiveClass={props.handleArchiveClass} handleDeleteClass={props.handleDeleteClass} handleStartOnlineClass={handleStartOnlineClass} handleEndOnlineClass={handleEndOnlineClass} {...rest} />;
            case 'courses': return <CoursesView key={`${reloadKey}-courses`} {...rest} userProfile={userProfile} activeSubject={activeSubject} isAiGenerating={isAiGenerating} setIsAiGenerating={setIsAiGenerating} setIsAiHubOpen={setIsAiHubOpen} activeUnit={activeUnit} onSetActiveUnit={onSetActiveUnit} courses={courses} courseCategories={courseCategories} handleEditCategory={handleEditCategory} onAddSubjectClick={handleAddSubjectWithCategory} handleInitiateDelete={handleInitiateDelete} activeClasses={activeClasses} />;
            case 'studentManagement': return <StudentManagementView key={`${reloadKey}-sm`} courses={courses} activeClasses={activeClasses} {...rest} />;
            case 'profile': return <ProfileView key={`${reloadKey}-profile`} user={user} userProfile={userProfile} logout={logout} {...rest} />;
            case 'analytics': return <AnalyticsView key={`${reloadKey}-analytics`} activeClasses={activeClasses} courses={courses} />;
            case 'admin': return <div key={`${reloadKey}-admin`} className="p-4 sm:p-6 text-slate-900 dark:text-slate-100"><AdminDashboard /></div>;
            default: return <HomeView key={`${reloadKey}-default`} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
        }
    };

    return (
        <div 
            className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 pb-24 lg:pb-0 relative overflow-hidden"
            // --- FIX: INJECT VARIABLES AT THE ROOT LEVEL ---
            // This ensures `var(--monet-accent)` works everywhere, including Widgets
            style={monetTheme.variables}
        >
            <UniversalBackground />
            
            {/* MOBILE HEADER (Monet) */}
            <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-2 pb-2 lg:hidden">
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    // Apply ONLY glass styles
                    style={monetTheme.glassStyle}
                    className="glass-panel relative flex items-center justify-between px-5 py-3 rounded-[1.5rem] shadow-lg transform-gpu transition-all duration-500"
                >
                    <div className="flex items-center flex-shrink-0 z-20">
                            <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-tr from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-sm flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            <img src={branding.logo} alt="School Logo" className="w-6 h-6 object-contain" />
                            </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                            {branding.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 z-20">
                        <ThemeDropdown 
                           size="mobile" 
                           showTutorial={showAmbienceTutorial}
                           onTutorialComplete={handleTutorialComplete}
                        />
                        <ProfileDropdown userProfile={userProfile} onLogout={() => setIsLogoutModalOpen(true)} size="mobile" />
                    </div>
                </motion.div>
            </div>

            {/* DESKTOP HEADER */}
            <div className="hidden lg:block fixed top-0 left-0 right-0 z-[50] px-4 md:px-6 lg:px-8 pt-0 pb-2 w-full max-w-[1920px] mx-auto transition-all duration-300">
                <DesktopHeader 
                    userProfile={userProfile} 
                    setIsLogoutModalOpen={setIsLogoutModalOpen} 
                    showTutorial={showAmbienceTutorial}
                    onTutorialComplete={handleTutorialComplete}
                />
            </div>

            <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 pt-24 lg:pt-24 relative z-10">
                <div className="w-full h-full">
                    <Suspense fallback={<DashboardSkeleton />}>
                        {renderMainContent()}
                    </Suspense>
                </div>
            </main>

            {/* MOBILE DOCK (Monet) */}
            <div className="fixed bottom-1 left-0 right-0 flex justify-center z-[49] lg:hidden pointer-events-none">
                <motion.div 
                    initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 250, damping: 25, delay: 0.2 }} layout
                    // Apply ONLY glass styles
                    style={monetTheme.glassStyle}
                    className="macos-dock pointer-events-auto px-2 py-2 rounded-[2.5rem] flex items-center justify-between w-auto min-w-[90%] max-w-md sm:gap-2 shadow-2xl transform-gpu transition-all duration-500"
                >
                    {bottomNavItems.map(item => { 
                            const isActive = activeView === item.view;
                            return (
                            <motion.button key={item.view} onClick={() => { handleViewChange(item.view); setIsMobileMenuOpen(false); }} layout
                                className={`relative group flex items-center justify-center gap-2 p-2.5 rounded-full transition-colors outline-none flex-1 ${isActive ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/10'}`}
                            >
                                <motion.div className="relative" whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 300 }}>
                                    <item.icon strokeWidth={isActive ? 2.5 : 1.5} className={`h-6 w-6 ${isActive ? 'scale-105' : 'opacity-80'}`} />
                                </motion.div>
                                {isActive && (
                                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="text-[10px] font-bold tracking-wide whitespace-nowrap overflow-hidden">
                                        {item.text}
                                    </motion.span>
                                )}
                            </motion.button>
                        )
                    })}
                    <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1 flex-shrink-0"></div>
                    <motion.button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} layout className={`relative group flex items-center justify-center gap-2 p-2.5 rounded-full transition-all outline-none flex-shrink-0 ${isMobileMenuOpen ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/10'}`}>
                        <motion.div className="relative" whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 300 }}>
                            {isMobileMenuOpen ? <X strokeWidth={2.5} className="h-6 w-6" /> : <LayoutGrid strokeWidth={2} className="h-6 w-6" />}
                        </motion.div>
                    </motion.button>
                </motion.div>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 40 }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        className="fixed bottom-24 left-0 right-0 mx-auto w-[90%] max-w-xs z-[48] glass-panel rounded-[2.5rem] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transform-gpu"
                    >
                        <div className="grid grid-cols-3 gap-5">
                            {actionMenuItems.map((item, idx) => {
                                const isActive = activeView === item.view;
                                return (
                                    <motion.button
                                        key={item.view}
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, duration: 0.3 }}
                                        onClick={() => { handleViewChange(item.view); setIsMobileMenuOpen(false); }}
                                        className="flex flex-col items-center gap-2.5 group"
                                    >
                                        <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-sm transition-all duration-300 group-active:scale-95 ${isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                            <item.icon className="h-8 w-8" strokeWidth={isActive ? 2 : 1.5} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight tracking-wide">
                                            {item.text}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Suspense fallback={null}>
                <CSSTransition 
                    in={!isChatOpen && activeView === 'home'} 
                    timeout={400} 
                    classNames="animated-robot" 
                    unmountOnExit
                    nodeRef={robotRef}
                >
                    <div ref={robotRef} className="fixed bottom-40 right-4 z-[45] lg:bottom-8 lg:right-8">
                        <AnimatedRobot onClick={() => setIsChatOpen(true)} />
                    </div>
                </CSSTransition>

                {isAiHubOpen && <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} subjectId={activeSubject?.id} unitId={activeUnit?.id} />}
                {isChatOpen && <ChatDialog isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} messages={messages} onSendMessage={handleAskAiWrapper} isAiThinking={isAiThinking} userFirstName={userProfile?.firstName} />}
                {rest.isArchivedModalOpen && <ArchivedClassesModal isOpen={rest.isArchivedModalOpen} onClose={() => rest.setIsArchivedModalOpen(false)} archivedClasses={rest.archivedClasses} onUnarchive={rest.handleUnarchiveClass} onDelete={props.handleDeleteClass} />}
                {rest.isEditProfileModalOpen && <EditProfileModal isOpen={rest.isEditProfileModalOpen} onClose={() => rest.setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={rest.handleUpdateProfile} setChangePasswordModalOpen={setChangePasswordModalOpen} />}
                <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)} onSubmit={rest.handleChangePassword} />
                <CreateCategoryModal isOpen={rest.isCreateCategoryModalOpen} onClose={() => rest.setCreateCategoryModalOpen(false)} teacherId={user?.uid || user?.id} />
                {categoryToEdit && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setIsEditCategoryModalOpen(false)} categoryName={categoryToEdit.name} onSave={handleRenameCategory} />}
                <CreateClassModal isOpen={rest.isCreateClassModalOpen} onClose={() => rest.setCreateClassModalOpen(false)} teacherId={user?.uid || user?.id} courses={courses} />
                <CreateCourseModal isOpen={rest.isCreateCourseModalOpen} onClose={() => { rest.setCreateCourseModalOpen(false); setPreselectedCategoryForCourseModal(null); }} teacherId={user?.uid || user?.id} courseCategories={courseCategories} preselectedCategory={preselectedCategoryForCourseModal} />
                {rest.classOverviewModal.isOpen && <ClassOverviewModal isOpen={rest.classOverviewModal.isOpen} onClose={() => rest.setClassOverviewModal({ isOpen: false, data: null })} classData={rest.classOverviewModal.data} courses={courses} onRemoveStudent={rest.handleRemoveStudentFromClass} />}
                {rest.isEditClassModalOpen && <EditClassModal isOpen={rest.isEditClassModalOpen} onClose={() => rest.setEditClassModalOpen(false)} classData={rest.classToEdit} courses={courses} onUpdate={handleUpdateClass} />}
                {rest.isAddUnitModalOpen && <AddUnitModal isOpen={rest.isAddUnitModalOpen} onClose={() => rest.setAddUnitModalOpen(false)} subjectId={activeSubject?.id} onCreateUnit={handleCreateUnit} />}
                {rest.editUnitModalOpen && rest.selectedUnit && <EditUnitModal isOpen={rest.editUnitModalOpen} onClose={() => rest.setEditUnitModalOpen(false)} unit={rest.selectedUnit} />}
                {rest.addLessonModalOpen && rest.selectedUnit && <AddLessonModal isOpen={rest.addLessonModalOpen} onClose={() => rest.setAddLessonModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} setIsAiGenerating={props.setIsAiGenerating} />}
                {rest.addQuizModalOpen && rest.selectedUnit && <AddQuizModal isOpen={rest.addQuizModalOpen} onClose={() => rest.setAddQuizModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
                {rest.deleteUnitModalOpen && rest.selectedUnit && <DeleteUnitModal isOpen={rest.deleteUnitModalOpen} onClose={() => rest.setDeleteUnitModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
                {rest.editLessonModalOpen && rest.selectedLesson && <EditLessonModal isOpen={rest.editLessonModalOpen} onClose={() => rest.setEditLessonModalOpen(false)} lesson={rest.selectedLesson} />}
                {rest.isShareContentModalOpen && activeSubject && <ShareMultipleLessonsModal isOpen={rest.isShareContentModalOpen} onClose={() => rest.setShareContentModalOpen(false)} subject={activeSubject} />}
                {isDeleteModalOpen && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} deletingItemType={deleteTarget?.type} />}
                {rest.isEditSubjectModalOpen && <EditSubjectModal isOpen={rest.isEditSubjectModalOpen} onClose={() => rest.setEditSubjectModalOpen(false)} subject={rest.subjectToActOn} />}
                {rest.isDeleteSubjectModalOpen && <DeleteSubjectModal isOpen={rest.isDeleteSubjectModalOpen} onClose={() => rest.setDeleteSubjectModalOpen(false)} subject={rest.subjectToActOn} />}
            </Suspense>

            <CSSTransition in={isLogoutModalOpen} timeout={400} classNames="logout-modal" unmountOnExit>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="glass-panel rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm text-center transform transition-all bg-white dark:bg-[#1A1D24]">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/50 text-red-500 mx-auto mb-5 flex items-center justify-center shadow-inner ring-4 ring-slate-100 dark:ring-white/5">
                            <Power size={28} strokeWidth={2} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Sign Out?</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">You are about to end your session. <br/> Are you sure you want to continue?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { setIsLogoutModalOpen(false); logout(); }} className="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95 text-sm tracking-wide">Yes, Log Out</button>
                            <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-3.5 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-sm tracking-wide">Cancel</button>
                        </div>
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
};

export default React.memo(TeacherDashboardLayout);