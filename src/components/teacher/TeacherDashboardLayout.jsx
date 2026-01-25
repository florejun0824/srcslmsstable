// src/components/teacher/TeacherDashboardLayout.jsx
import React, { useState, Suspense, lazy, Fragment, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { CSSTransition } from 'react-transition-group'; 
import { Menu, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react'; 

// --- ICON LIBRARY: PHOSPHOR ICONS ---
import { 
    House,              // Home
    ChalkboardTeacher,  // Classes
    Books,              // Subjects/Library
    Student,            // Students
    Coffee,             // Lounge
    ChartPieSlice,      // Analytics
    UserCircle,         // Profile
    Gear,               // Admin/Settings
    SignOut,            // Logout
    Palette,            // Theme
    MagnifyingGlass,    // Search
    Command,            // Cmd Key
    CaretRight,         // Chevron
    X,                  // Close
    SquaresFour,        // Mobile Menu
    Robot,              // AI Icon
    WarningCircle       // Error
} from '@phosphor-icons/react';

// SERVICES
import { getDocs, query, collection, where, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

// ASSETS
import robotAnimation from '../../assets/robot.json'; 

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

// LAZY-LOADED MODALS
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
const ShareMultipleLessonsModal = lazy(() => import('./ShareMultipleLessonsModal'));
const DeleteConfirmationModal = lazy(() => import('./DeleteConfirmationModal'));
const EditSubjectModal = lazy(() => import('./EditSubjectModal'));
const DeleteSubjectModal = lazy(() => import('./DeleteSubjectModal'));
// Command Palette
const CommandPalette = lazy(() => import('./CommandPalette'));

// --- CONFIGURATION ---
const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS Digital Ecosystem', logo: '/logo.png' },
    'hras_sipalay': { name: 'HRA LMS', logo: '/logos/hra.png' },
    'kcc_kabankalan': { name: 'KCC LMS', logo: '/logos/kcc.png' },
    'icad_dancalan': { name: 'ICA LMS', logo: '/logos/ica.png' },
    'mchs_magballo': { name: 'MCHS LMS', logo: '/logos/mchs.png' },
    'ichs_ilog': { name: 'ICHS LMS', logo: '/logos/ichs.png' }
};

const getSchoolBranding = (schoolId) => SCHOOL_BRANDING[schoolId] || SCHOOL_BRANDING['srcs_main'];

// --- STYLES ---
const styles = `
  ::-webkit-scrollbar { width: 0px; height: 0px; }
  .mac-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
  .mac-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .mac-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 100px; }
  .dark .mac-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); }
  
  /* Smooth Width Transition for Sidebar */
  .sidebar-transition {
    transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1.0);
    will-change: width;
  }
  
  /* Performance Optimized Glass */
  .glass-panel {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }
  .dark .glass-panel {
    background: rgba(28, 28, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
  }
`;

// --- SKELETON ---
const DashboardSkeleton = memo(() => (
    <div className="w-full h-full p-8 space-y-8 animate-pulse">
        <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]"></div>
            ))}
        </div>
    </div>
));

// --- COMPONENT: Premium Phosphor Icon with Radar Indicator ---
const AestheticIcon = memo(({ Icon, isActive }) => {
    return (
        <div className="relative flex items-center justify-center w-10 h-10">
            
            {/* 1. Stronger Background Glow */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="navGlow"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 rounded-xl"
                        style={{ 
                            backgroundColor: 'var(--monet-primary)', 
                            opacity: 0.2, // Increased opacity for better visibility
                            boxShadow: '0 0 15px rgba(var(--monet-primary-rgb), 0.15)' // Soft ambient light
                        }}
                    />
                )}
            </AnimatePresence>

            {/* 2. The "Radar" Beacon Indicator */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-1.5 right-1.5 z-20 flex h-2.5 w-2.5"
                    >
                        {/* The Ripple Ring (Ping Animation) */}
                        <span 
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                            style={{ backgroundColor: 'var(--monet-primary)' }}
                        />
                        
                        {/* The Solid Core */}
                        <span 
                            className="relative inline-flex rounded-full h-2.5 w-2.5" 
                            style={{ 
                                backgroundColor: 'var(--monet-primary)',
                                boxShadow: '0 0 6px var(--monet-primary)' // Neon Core
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. The Icon */}
            <Icon
                size={24}
                weight={isActive ? "fill" : "regular"} // "Fill" weight is bolder than "Duotone"
                className={`relative z-10 transition-all duration-300 ${isActive ? 'scale-105' : 'scale-100 opacity-60 group-hover:opacity-100'}`}
                style={{ 
                    color: isActive ? 'var(--monet-primary)' : 'currentColor',
                    filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                }}
            />
        </div>
    );
});

// --- COMPONENT: Themed & Lightweight Sidebar ---
const AestheticSidebar = memo(({ navItems, activeView, handleViewChange, branding, showTutorial, onTutorialComplete }) => {
    return (
        <div
            className="hidden lg:flex flex-col h-full sidebar-transition w-[88px] hover:w-[260px] group relative z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-white/5"
            style={{
                // FIXED: Monet Theming Restored
                // We use the theme's surface color but force 60% opacity for the glass look.
                // Assuming --monet-surface is an RGB or hex value. If it's a variable, we set background-color with opacity.
                backgroundColor: 'rgba(var(--monet-surface-rgb, 15, 23, 42), 0.50)', // Fallback to slate-900 if var missing
                
                // NO BLUR filter to save CPU usage
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
            }}
        >
            {/* Branding Section */}
            <div className="h-24 flex items-center px-5 overflow-hidden whitespace-nowrap shrink-0">
                <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 z-20 transition-all duration-300 group-hover:scale-105 bg-white/10 border border-white/10"
                >
                    <img src={branding.logo} alt="Logo" className="w-7 h-7 object-contain drop-shadow-md" />
                </div>
                
                <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 flex flex-col">
                    <h1 className="font-bold text-sm text-slate-800 dark:text-white leading-none tracking-tight">{branding.name}</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60" style={{ color: 'var(--monet-primary)' }}>Teacher OS</span>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col gap-2 px-3 py-4 overflow-y-auto mac-scrollbar overflow-x-hidden">
                {navItems.map((item) => {
                    const isActive = activeView === item.view;
                    return (
                        <NavLink
                            key={item.view}
                            to={item.view === 'home' ? '/dashboard' : `/dashboard/${item.view}`}
                            end={item.view === 'home'}
                            onClick={() => handleViewChange(item.view)}
                            className="relative flex items-center h-14 rounded-2xl group/item cursor-pointer overflow-hidden transition-all duration-200"
                        >
                            {/* Icon Wrapper */}
                            <div className="min-w-[4rem] h-full flex justify-center items-center z-10">
                                <AestheticIcon Icon={item.icon} isActive={isActive} />
                            </div>
                            
                            {/* Text Label */}
                            <div className="flex-1 flex items-center pr-4 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                <span 
                                    className={`text-[13px] font-semibold tracking-wide transition-colors ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    {item.text}
                                </span>
                            </div>

                            {/* Active Indicator Strip (Left) */}
                            {isActive && (
                                <motion.div 
                                    layoutId="activeStrip"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                                    style={{ backgroundColor: 'var(--monet-primary)' }}
                                />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/5 shrink-0">
                <Menu as="div" className="relative">
                    <Menu.Button 
                        onClick={onTutorialComplete}
                        className={`
                            flex items-center w-full h-14 rounded-2xl 
                            hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/btn outline-none
                            ${showTutorial ? 'ring-1 ring-indigo-500' : ''}
                        `}
                    >
                         <div className="min-w-[4rem] flex justify-center items-center">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 group-hover/btn:text-slate-800 dark:group-hover/btn:text-white transition-colors">
                                <Palette size={24} weight="duotone" />
                            </div>
                         </div>
                         <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
                             <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                                 Theming
                             </span>
                         </div>
                    </Menu.Button>
                    
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 scale-95"
                        enterTo="opacity-100 translate-y-0 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 scale-100"
                        leaveTo="opacity-0 translate-y-2 scale-95"
                    >
                        <Menu.Items className="absolute bottom-full left-4 mb-2 w-64 p-3 origin-bottom-left rounded-3xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 shadow-2xl focus:outline-none z-[60]">
                           <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10 mb-3">
                               <span 
                                   className="text-xs font-bold uppercase tracking-widest"
                                   style={{ color: 'var(--monet-primary)' }}
                                >
                                   Appearance
                                </span>
                           </div>
                           <ThemeToggle />
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </div>
    );
});

// --- UPDATED TOP BAR ---
const TopContextBar = memo(({ userProfile, activeView, onLogout, handleOpenChat, isAiThinking, courses, activeClasses, onNavigate }) => {
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [searchResults, setSearchResults] = useState({ courses: [], classes: [] });
    const searchInputRef = useRef(null);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val === '') {
            setTimeout(() => { if (searchInputRef.current) searchInputRef.current.blur(); setIsFocused(false); }, 100); 
        }
        if (val.trim()) {
            const lowerQuery = val.toLowerCase();
            const filteredCourses = courses?.filter(c => c.title.toLowerCase().includes(lowerQuery)) || [];
            const filteredClasses = activeClasses?.filter(c => c.name.toLowerCase().includes(lowerQuery)) || [];
            setSearchResults({ courses: filteredCourses, classes: filteredClasses });
        } else {
            setSearchResults({ courses: [], classes: [] });
        }
    };

    const handleResultClick = (type, item) => {
        setSearchQuery('');
        setIsFocused(false);
        onNavigate(type, item);
    };

    const titles = {
        home: 'Dashboard Overview',
        lounge: 'Faculty Lounge',
        studentManagement: 'Student Directory',
        classes: 'Active Classes',
        courses: 'Subject Library',
        analytics: 'Performance Data',
        profile: 'My Profile',
        admin: 'System Admin'
    };

    return (
        <header className="h-24 px-8 flex items-center justify-between flex-shrink-0 z-40 bg-transparent pointer-events-none">
            {/* Breadcrumb / Title */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                key={activeView}
                className={`flex flex-col justify-center h-full transition-all duration-500 pointer-events-auto ${isFocused ? 'opacity-20 blur-sm scale-95' : 'opacity-100 blur-0 scale-100'}`}
            >
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <span className="opacity-70">Workspace</span>
                    <CaretRight size={12} weight="bold" />
                    <span style={{ color: 'var(--monet-primary)' }}>{activeView}</span>
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight drop-shadow-sm">
                    {titles[activeView] || 'Teacher Workspace'}
                </h2>
            </motion.div>

            {/* Right Actions */}
            <div className="flex items-center gap-5 pointer-events-auto">
                
                {/* Search Bar */}
                <div className="relative z-50">
                    <div 
                        className={`
                            group flex items-center gap-3 h-12 px-5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                            backdrop-blur-xl border
                            ${isFocused 
                                ? 'w-[480px] bg-white/90 dark:bg-black/80 shadow-2xl border-white/20 ring-1 ring-white/10' 
                                : 'w-72 bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 hover:w-[300px] border-white/10 hover:border-white/20 shadow-sm'
                            }
                        `}
                    >
                        <MagnifyingGlass 
                            size={20} 
                            weight="bold"
                            className={`transition-colors duration-300 ${isFocused ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`} 
                        />
                        
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setTimeout(() => !searchQuery && setIsFocused(false), 200)}
                            placeholder={isFocused ? "Search subjects, classes, or students..." : "Search..."}
                            className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-500/60 dark:placeholder:text-slate-400/60 transition-all" 
                        />

                        {/* Keyboard Shortcut Badge */}
                        <div className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold transition-all duration-300
                            ${isFocused 
                                ? 'opacity-0 translate-x-4 pointer-events-none' 
                                : 'opacity-100 translate-x-0 bg-white/20 dark:bg-white/5 border-white/10 text-slate-500 dark:text-slate-400'
                            }
                        `}>
                            <Command size={12} weight="bold" /> 
                            <span>K</span>
                        </div>

                        {/* Clear Button */}
                        {isFocused && searchQuery && (
                            <button 
                                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }} 
                                className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-400 transition-colors animate-in fade-in zoom-in"
                            >
                                <X size={14} weight="bold" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown Results */}
                    <AnimatePresence>
                        {isFocused && searchQuery && (
                            <motion.div
                                initial={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(4px)" }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(4px)" }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="absolute top-16 right-0 w-[480px] rounded-[24px] overflow-hidden border border-white/20 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] backdrop-blur-2xl bg-white/80 dark:bg-[#121212]/80"
                            >
                                {searchResults.courses.length === 0 && searchResults.classes.length === 0 ? (
                                    <div className="p-12 flex flex-col items-center text-center text-slate-400">
                                        <MagnifyingGlass size={32} weight="duotone" className="mb-3 opacity-20" />
                                        <p className="text-sm font-medium">No matches found</p>
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-1">
                                        {searchResults.courses.length > 0 && (
                                            <div className="mb-2">
                                                <div className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Books size={14} weight="fill" /> Subjects
                                                </div>
                                                {searchResults.courses.map(course => (
                                                    <button key={course.id} onClick={() => handleResultClick('courses', course)} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                                                            <Books size={20} weight="duotone" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{course.title}</div>
                                                            <div className="text-[11px] font-medium text-slate-500 truncate opacity-80">{course.category}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.classes.length > 0 && (
                                            <div>
                                                <div className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                    <ChalkboardTeacher size={14} weight="fill" /> Classes
                                                </div>
                                                {searchResults.classes.map(cls => (
                                                    <button key={cls.id} onClick={() => handleResultClick('classes', cls)} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                                                            <ChalkboardTeacher size={20} weight="duotone" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{cls.name}</div>
                                                            <div className="text-[11px] font-medium text-slate-500 truncate opacity-80">{cls.schedule || 'No schedule'}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* AI Trigger */}
                <button 
                    onClick={handleOpenChat}
                    className="group relative flex items-center gap-3 h-12 pl-3 pr-5 rounded-full text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_24px_-8px_rgba(79,70,229,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
                    style={{ backgroundColor: 'var(--monet-primary)' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-2">
                        {isAiThinking ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <div className="w-8 h-8 flex items-center justify-center">
                                <Lottie animationData={robotAnimation} loop={true} className="w-full h-full scale-125" />
                            </div>
                        )}
                        <span className="text-sm font-bold tracking-wide">Ask AI</span>
                    </div>
                </button>

                <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1" />
                <ProfileDropdown userProfile={userProfile} onLogout={onLogout} size="desktop" />
            </div>
        </header>
    );
});

// --- SUB-COMPONENT: Profile Dropdown ---
const ProfileDropdown = memo(({ userProfile, onLogout, size = 'desktop' }) => {
    return (
        <Menu as="div" className="relative z-50">
            <Menu.Button 
                className="relative flex items-center justify-center w-12 h-12 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-2 transition-all outline-none" 
                style={{ '--tw-ring-color': 'var(--monet-primary)' }}
            >
                {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="full" className="w-full h-full text-xs" />
                )}
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-full" />
            </Menu.Button>
            
            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-2"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
                <Menu.Items className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                    <div className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userProfile?.firstName} {userProfile?.lastName}</p>
                        <p className="text-xs text-slate-500 truncate">{userProfile?.email}</p>
                    </div>
                    <div className="py-1">
                         <Menu.Item>
                            {({ active }) => (
                                <NavLink to="/dashboard/profile" className={`${active ? 'bg-slate-50 dark:bg-white/5' : ''} flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 font-medium`}>
                                    <UserCircle size={18} weight="duotone" /> My Profile
                                </NavLink>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onLogout} className={`${active ? 'bg-red-50 dark:bg-red-900/10 text-red-600' : 'text-slate-700 dark:text-slate-300'} flex w-full items-center gap-2 px-4 py-2 text-sm font-medium`}>
                                    <SignOut size={18} weight="duotone" /> Sign Out
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
});

// --- SUB-COMPONENT: Mobile Theme Button ---
const MobileThemeButton = memo(() => {
    return (
        <Menu as="div" className="relative z-50">
            <Menu.Button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/95 dark:bg-white/10 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 hover:bg-white dark:hover:bg-white/20 transition-all outline-none">
                <Palette size={20} weight="duotone" className="text-slate-600 dark:text-slate-200" />
            </Menu.Button>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-2"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
                <Menu.Items className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none p-2 z-[60]">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Theme Options</span>
                    </div>
                    <ThemeToggle />
                </Menu.Items>
            </Transition>
        </Menu>
    );
});

// --- MAIN LAYOUT COMPONENT ---
const TeacherDashboardLayout = (props) => {
    const {
        user, userProfile, loading, authLoading, error, activeView, handleViewChange, logout,
        isAiGenerating, setIsAiGenerating, isChatOpen, setIsChatOpen, messages, isAiThinking, handleAskAiWrapper, isAiHubOpen, setIsAiHubOpen,
        activeSubject, activeUnit, onSetActiveUnit, reloadKey, isDeleteModalOpen, setIsDeleteModalOpen, handleConfirmDelete, deleteTarget, handleInitiateDelete, handleCreateUnit, courses, activeClasses, handleUpdateClass, isLoungeLoading, loungePosts, loungeUsersMap, fetchLoungePosts, loungePostUtils,
        ...rest
    } = props;

    // STATE
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] = useState(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAmbienceTutorial, setShowAmbienceTutorial] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    
    const { showToast } = useToast();
    const { monetTheme } = useTheme(); 
    const navigate = useNavigate();
    
    const branding = useMemo(() => getSchoolBranding(userProfile?.schoolId), [userProfile?.schoolId]);

    // KEYBOARD SHORTCUT
    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandPaletteOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // TUTORIAL
    useEffect(() => {
        if (activeView === 'home' && !loading) {
            const hasSeenTutorial = localStorage.getItem('hasSeenAmbienceTutorial');
            if (!hasSeenTutorial) {
                const timer = setTimeout(() => { setShowAmbienceTutorial(true); }, 2000); 
                return () => clearTimeout(timer);
            }
        } else { setShowAmbienceTutorial(false); }
    }, [activeView, loading]);

    const handleTutorialComplete = useCallback(() => {
        setShowAmbienceTutorial(false);
        localStorage.setItem('hasSeenAmbienceTutorial', 'true');
    }, []);

    // HANDLERS
    const handleLogoutClick = useCallback(() => setIsLogoutModalOpen(true), []);
    const confirmLogout = useCallback(() => { setIsLogoutModalOpen(false); logout(); }, [logout]);
    const cancelLogout = useCallback(() => setIsLogoutModalOpen(false), []);
    const handleCloseChat = useCallback(() => setIsChatOpen(false), [setIsChatOpen]);
    const handleOpenChat = useCallback(() => setIsChatOpen(true), [setIsChatOpen]);
    const handleCloseAiHub = useCallback(() => setIsAiHubOpen(false), [setIsAiHubOpen]);
    const handleClosePasswordModal = useCallback(() => setChangePasswordModalOpen(false), []);
    
    const handleSearchNavigation = useCallback((type, item) => {
        if (type === 'courses' && item) {
            const url = `/dashboard/courses/teacher/${encodeURIComponent(item.category)}/${item.id}`;
            navigate(url);
        } else if (type === 'classes' && item) {
            navigate('/dashboard/classes');
        } else {
            handleViewChange(type);
        }
    }, [navigate, handleViewChange]);

    const commandActions = useMemo(() => ({
        createClass: () => rest.setCreateClassModalOpen(true),
        createSubject: () => rest.setCreateCourseModalOpen(true),
        openAiHub: () => setIsAiHubOpen(true),
        openLounge: () => handleViewChange('lounge'),
        openProfile: () => handleViewChange('profile'),
        viewArchived: () => rest.setIsArchivedModalOpen(true),
        logout: handleLogoutClick
    }), [rest.setCreateClassModalOpen, rest.setCreateCourseModalOpen, setIsAiHubOpen, handleViewChange, handleLogoutClick, rest.setIsArchivedModalOpen]);

    const handleRenameCategory = useCallback(async (newName) => {
        const oldName = categoryToEdit?.name;
        if (!oldName || !newName || oldName === newName) { setIsEditCategoryModalOpen(false); return; }
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
        } catch (error) { console.error('Error renaming category:', error); showToast('Failed to rename category.', 'error'); } 
        finally { setIsEditCategoryModalOpen(false); }
    }, [categoryToEdit, showToast]);

    const handleEditCategory = useCallback((category) => { setCategoryToEdit(category); setIsEditCategoryModalOpen(true); }, []);
    
    const courseCategories = useMemo(() => 
        [...new Set(courses.map((c) => c.category).filter(Boolean))].map((name) => ({ id: name, name: name }))
    , [courses]);

    const handleAddSubjectWithCategory = useCallback((categoryName) => { 
        setPreselectedCategoryForCourseModal(categoryName); 
        rest.setCreateCourseModalOpen(true); 
    }, [rest.setCreateCourseModalOpen]);

    const handleStartOnlineClass = useCallback(async (classId, meetingCode, meetLink) => {
        try {
            const classRef = doc(db, 'classes', classId);
            await updateDoc(classRef, { videoConference: { isLive: true, meetingCode: meetingCode, platform: 'GOOGLE_MEET', startTime: new Date().toISOString() } });
            showToast(`Class ${meetingCode} is now live! Opening Google Meet...`, 'success');
            window.open(meetLink, '_blank');
        } catch (error) { console.error("Error starting online class:", error); showToast('Failed to start the online class due to a system error.', 'error'); }
    }, [showToast]);

    const handleEndOnlineClass = useCallback(async (classId) => {
        try {
            const classRef = doc(db, 'classes', classId);
            await updateDoc(classRef, { 'videoConference.isLive': false, 'videoConference.meetingCode': null, 'videoConference.startTime': null });
            showToast('Online class successfully ended.', 'info');
        } catch (error) { console.error("Error ending online class:", error); showToast('Failed to end the online class.', 'error'); }
    }, [showToast]);
    
    // NAVIGATION ITEMS (Updated with Phosphor Icons)
    const navItems = useMemo(() => {
        const items = [
            { view: 'home', text: 'Dashboard', icon: House },
            { view: 'lounge', text: 'Lounge', icon: Coffee },
            { view: 'studentManagement', text: 'Students', icon: Student },
            { view: 'classes', text: 'Classes', icon: ChalkboardTeacher },
            { view: 'courses', text: 'Library', icon: Books },
            { view: 'analytics', text: 'Reports', icon: ChartPieSlice },
            { view: 'profile', text: 'Profile', icon: UserCircle },
        ];
        if (userProfile?.role === 'admin') items.push({ view: 'admin', text: 'System', icon: Gear });
        return items;
    }, [userProfile?.role]);

    // RENDER CONTENT
    const renderMainContent = () => {
        if (loading || authLoading) return <DashboardSkeleton />;
        if (error) {
            return (
                <div className="glass-panel border-l-4 border-red-500 text-red-800 dark:text-red-200 p-6 rounded-2xl m-4">
                    <div className="flex items-start gap-3"><WarningCircle size={24} weight="fill" className="text-red-500" /><div><strong className="block text-lg font-bold">System Notification</strong><span className="text-sm opacity-80">{error}</span></div></div>
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
            className="h-screen flex bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 overflow-hidden"
            style={monetTheme.variables}
        >
            <style>{styles}</style>
            
            {/* Background */}
            <div className="noise-bg opacity-30 dark:opacity-10 pointer-events-none"></div>
            <UniversalBackground />

            {/* 1. Left Vertical Rail (Themed & Frosted) */}
            <AestheticSidebar 
                navItems={navItems} 
                activeView={activeView} 
                handleViewChange={handleViewChange} 
                branding={branding} 
                showTutorial={showAmbienceTutorial}
                onTutorialComplete={handleTutorialComplete}
            />

            {/* 2. Main Workspace */}
            <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
                
                {/* Desktop Top Bar */}
                <div className="hidden lg:block">
                    <TopContextBar 
                        userProfile={userProfile}
                        activeView={activeView}
                        onLogout={handleLogoutClick}
                        handleOpenChat={handleOpenChat}
                        isAiThinking={isAiThinking}
                        courses={courses}
                        activeClasses={activeClasses}
                        onNavigate={handleSearchNavigation}
                    />
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-0 lg:px-8 lg:pb-8 scroll-smooth" id="main-scroll-container">
                    {/* Top Spacer for Mobile Header */}
                    <div className="lg:hidden h-24"></div> 
                    
                    <Suspense fallback={<DashboardSkeleton />}>
                        {renderMainContent()}
                    </Suspense>

                    <div className="h-40 lg:hidden"></div>
                </main>
            </div>


            {/* --- MOBILE ELEMENTS (Optimized Icons) --- */}
            
            {/* Mobile Header */}
            <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-2 pb-2 lg:hidden">
                <motion.div 
                    initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    style={monetTheme.glassStyle}
                    className="glass-panel relative flex items-center justify-between px-5 py-3 rounded-[1.5rem] shadow-lg bg-white/95 dark:bg-[#1C1C1E]/95"
                >
                    <div className="flex items-center gap-2">
                        <img src={branding.logo} alt="Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-lg text-slate-800 dark:text-white">{branding.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <MobileThemeButton />
                        <ProfileDropdown userProfile={userProfile} onLogout={handleLogoutClick} size="mobile" />
                    </div>
                </motion.div>
            </div>

            {/* EXPANDED Mobile Dock */}
            <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[49] lg:hidden pointer-events-none">
                 <motion.div 
                    initial={{ y: 100 }} animate={{ y: 0 }}
                    style={monetTheme.glassStyle}
                    className="glass-panel pointer-events-auto px-6 py-4 rounded-[2.5rem] flex items-center gap-6 shadow-2xl bg-white dark:bg-[#1C1C1E] border border-white/20"
                 >
                     <NavLink 
                        to="/dashboard" 
                        onClick={() => handleViewChange('home')} 
                        className="transition-transform active:scale-95"
                    >
                        <AestheticIcon Icon={House} isActive={activeView === 'home'} />
                    </NavLink>
                     
                     <NavLink 
                        to="/dashboard/courses" 
                        onClick={() => handleViewChange('courses')} 
                        className="transition-transform active:scale-95"
                    >
                        <AestheticIcon Icon={Books} isActive={activeView === 'courses'} />
                     </NavLink>

                     <NavLink 
                        to="/dashboard/classes" 
                        onClick={() => handleViewChange('classes')} 
                        className="transition-transform active:scale-95"
                    >
                        <AestheticIcon Icon={ChalkboardTeacher} isActive={activeView === 'classes'} />
                     </NavLink>

                     <NavLink 
                        to="/dashboard/lounge" 
                        onClick={() => handleViewChange('lounge')} 
                        className="transition-transform active:scale-95"
                    >
                        <AestheticIcon Icon={Coffee} isActive={activeView === 'lounge'} />
                     </NavLink>

                     {/* Menu Toggle */}
                     <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        className={`
                            relative flex items-center justify-center w-[46px] h-[46px] rounded-[18px] 
                            transition-all duration-300 shadow-md
                            ${isMobileMenuOpen ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}
                        `}
                    >
                        {isMobileMenuOpen ? <X size={22} /> : <SquaresFour size={22} />}
                     </button>
                 </motion.div>
            </div>

            {/* Mobile Full Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        className="fixed bottom-24 left-4 right-4 z-40 glass-panel rounded-[2.5rem] p-6 lg:hidden shadow-2xl bg-white dark:bg-[#1C1C1E]"
                    >
                        <div className="grid grid-cols-4 gap-4">
                            {navItems.filter(i => !['home','classes', 'courses', 'lounge'].includes(i.view)).map(item => (
                                <button key={item.view} onClick={() => { handleViewChange(item.view); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-2">
                                    <AestheticIcon Icon={item.icon} isActive={activeView === item.view} />
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{item.text}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* --- MODALS & OVERLAYS --- */}
            <Suspense fallback={null}>
                <div className="lg:hidden">
                    {!isChatOpen && activeView === 'home' && (
                        <div className="fixed bottom-28 right-4 z-40">
                             <AnimatedRobot onClick={handleOpenChat} />
                        </div>
                    )}
                </div>

                <Suspense fallback={null}>
                    {isCommandPaletteOpen && (
                        <CommandPalette 
                            isOpen={isCommandPaletteOpen} 
                            onClose={() => setIsCommandPaletteOpen(false)}
                            courses={courses}
                            classes={activeClasses}
                            actions={commandActions}
                            onNavigate={handleSearchNavigation} 
                        />
                    )}
                </Suspense>

                {isAiHubOpen && <AiGenerationHub isOpen={isAiHubOpen} onClose={handleCloseAiHub} subjectId={activeSubject?.id} unitId={activeUnit?.id} />}
                {isChatOpen && <ChatDialog isOpen={isChatOpen} onClose={handleCloseChat} messages={messages} onSendMessage={handleAskAiWrapper} isAiThinking={isAiThinking} userFirstName={userProfile?.firstName} />}
                
                {rest.isArchivedModalOpen && <ArchivedClassesModal isOpen={rest.isArchivedModalOpen} onClose={() => rest.setIsArchivedModalOpen(false)} archivedClasses={rest.archivedClasses} onUnarchive={rest.handleUnarchiveClass} onDelete={props.handleDeleteClass} />}
                {rest.isEditProfileModalOpen && <EditProfileModal isOpen={rest.isEditProfileModalOpen} onClose={() => rest.setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={rest.handleUpdateProfile} setChangePasswordModalOpen={setChangePasswordModalOpen} />}
                <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={handleClosePasswordModal} onSubmit={rest.handleChangePassword} />
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 z-0 bg-[#020617]/80 backdrop-blur-md transition-opacity" 
                        onClick={cancelLogout}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-[#0f172a] transform transition-all">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(220,38,38,0.15),_transparent_70%)] pointer-events-none" />
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
                        <div className="relative z-20 p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.2)] group">
                                <div className="relative z-10 text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)] transition-transform duration-500 group-hover:scale-110">
                                    <SignOut size={32} weight="duotone" />
                                </div>
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-red-500/20 pointer-events-none" />
                            </div>
                            <h2 className="text-2xl font-medium text-white mb-2 tracking-tight drop-shadow-md">
                                System Sign Out
                            </h2>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed font-light">
                                You are terminating your active session.<br/>
                                <span className="text-red-400/80">Unsaved data may be lost in the void.</span>
                            </p>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={confirmLogout} 
                                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-widest uppercase bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] border border-red-500/50 transition-all active:scale-95 cursor-pointer relative z-30"
                                >
                                    Confirm Termination
                                </button>
                                <button 
                                    onClick={cancelLogout} 
                                    className="w-full py-3.5 rounded-xl font-bold text-slate-400 hover:text-white text-sm tracking-widest uppercase hover:bg-white/5 border border-transparent hover:border-white/10 transition-all active:scale-95 cursor-pointer relative z-30"
                                >
                                    Abort
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
};

export default memo(TeacherDashboardLayout);