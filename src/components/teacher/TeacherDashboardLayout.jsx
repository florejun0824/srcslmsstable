// src/components/teacher/TeacherDashboardLayout.jsx
import React, { useState, Suspense, lazy, Fragment, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { CSSTransition } from 'react-transition-group'; 
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react'; 

// --- ICONS ---
import { 
    Home, Users, GraduationCap, BookOpen, UserCircle, Settings, 
    BarChart2, Rocket, Menu as MenuIcon, X, LayoutGrid, Palette, 
    LogOut, Power, ChevronDown, Sparkles, Search, Command, ChevronRight,
    MessageCircle, Bell, Calendar
} from 'lucide-react';

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
    'srcs_main': { name: 'SRCS LMS', logo: '/logo.png' },
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
  
  .noise-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.03;
    z-index: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(24px);
  }
  .dark .glass-panel {
    background: rgba(20, 20, 23, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(24px);
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

// --- NEW HELPER: Stunning Icon Wrapper ---
const StunningIcon = memo(({ Icon, isActive }) => {
    return (
        <div 
            className={`
                relative flex items-center justify-center w-[42px] h-[42px] rounded-[14px] 
                transition-all duration-300
                ${isActive ? 'shadow-lg scale-110' : 'hover:scale-105'}
            `}
            style={{
                // Active: Gradient from Primary to Secondary
                // Inactive: Subtle surface variant background
                background: isActive 
                    ? `linear-gradient(135deg, var(--monet-primary), var(--monet-secondary))`
                    : 'var(--monet-surface-variant)',
                boxShadow: isActive 
                    ? '0 8px 20px -6px var(--monet-primary-container)' 
                    : 'none'
            }}
        >
            <Icon 
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                    // Active: White icon for contrast
                    // Inactive: On-Surface color
                    color: isActive ? '#ffffff' : 'var(--monet-on-surface-variant)',
                    filter: isActive ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' : 'none'
                }}
                fill={isActive ? "currentColor" : "none"}
            />
        </div>
    );
});

// --- UPDATED SIDEBAR ---
const PrismSidebar = memo(({ navItems, activeView, handleViewChange, branding, showTutorial, onTutorialComplete }) => {
    return (
        <motion.div 
            initial={{ x: -100 }} animate={{ x: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden lg:flex flex-col h-full w-24 hover:w-72 transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group relative z-50 bg-white/80 dark:bg-[#0F0F11]/80 backdrop-blur-2xl border-r border-white/20 dark:border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
        >
            {/* Branding */}
            <div className="h-28 flex items-center justify-center group-hover:justify-start group-hover:px-7 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-white/10 flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200 dark:border-white/10 overflow-hidden">
                    <img src={branding.logo} alt="Logo" className="w-9 h-9 object-contain" />
                </div>
                <div className="ml-4 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500 delay-75 whitespace-nowrap">
                    <h1 className="font-bold text-xl text-slate-900 dark:text-white leading-none tracking-tight">{branding.name}</h1>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Teacher Workspace</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-3 px-4 pt-2 overflow-y-auto mac-scrollbar">
                {navItems.map((item) => {
                    const isActive = activeView === item.view;
                    return (
                        <NavLink
                            key={item.view}
                            to={item.view === 'home' ? '/dashboard' : `/dashboard/${item.view}`}
                            end={item.view === 'home'}
                            onClick={() => handleViewChange(item.view)}
                            className="relative flex items-center h-14 rounded-[20px] group/item outline-none overflow-hidden"
                        >
                            {/* Icon Container */}
                            <div className="min-w-[4rem] h-full flex justify-center items-center z-10">
                                <StunningIcon Icon={item.icon} isActive={isActive} />
                            </div>
                            
                            {/* Label */}
                            <span 
                                className={`text-[14px] font-semibold whitespace-nowrap transition-all duration-300 opacity-0 group-hover:opacity-100 delay-[50ms] z-10`}
                                style={{ 
                                    color: isActive ? 'var(--monet-primary)' : 'var(--monet-on-surface-variant)',
                                }}
                            >
                                {item.text}
                            </span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-5 border-t border-black/5 dark:border-white/5 relative">
                <Menu as="div" className="relative">
                    <Menu.Button 
                        onClick={onTutorialComplete}
                        className={`flex items-center w-full h-14 rounded-[20px] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group/btn outline-none ${showTutorial ? 'animate-pulse ring-2' : ''}`}
                        style={showTutorial ? { ringColor: 'var(--monet-primary)' } : {}}
                    >
                         <div className="min-w-[4rem] flex justify-center items-center">
                            <div className="w-[42px] h-[42px] rounded-[14px] bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 group-hover/btn:text-indigo-500 transition-colors">
                                <Palette size={20} />
                            </div>
                         </div>
                         <span className="ml-1 text-[13px] font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                             Change Theme
                         </span>
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
                        <Menu.Items className="absolute bottom-20 left-4 w-64 p-2 origin-bottom-left rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-[60]">
                           <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-2">
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Theme Options</span>
                           </div>
                           <ThemeToggle />
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </motion.div>
    );
});

// --- UPDATED TOP BAR (Solid Search) ---
const TopContextBar = memo(({ userProfile, activeView, onLogout, handleOpenChat, isAiThinking, courses, activeClasses, onNavigate }) => {
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [searchResults, setSearchResults] = useState({ courses: [], classes: [] });
    const searchInputRef = useRef(null);

    // Auto-Close Search
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        
        if (val === '') {
            setTimeout(() => {
               if (searchInputRef.current) searchInputRef.current.blur();
               setIsFocused(false);
            }, 100); 
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
        lounge: 'Student Lounge',
        studentManagement: 'Student Directory',
        classes: 'My Classes',
        courses: 'Course Library',
        analytics: 'Performance Analytics',
        profile: 'User Profile',
        admin: 'Admin Settings'
    };

    return (
        <header className="h-24 px-8 flex items-center justify-between flex-shrink-0 z-40 bg-transparent">
            {/* Breadcrumb / Title */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                key={activeView}
                className={`flex flex-col justify-center h-full transition-opacity duration-300 ${isFocused ? 'opacity-20' : 'opacity-100'}`}
            >
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <span>Teacher</span>
                    <ChevronRight size={10} />
                    <span>{activeView}</span>
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {titles[activeView] || 'Dashboard'}
                </h2>
            </motion.div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                
                {/* IMPROVED SEARCH BAR (Solid & Visible) */}
                <div className="relative z-50">
                    <div 
                        className={`
                            flex items-center gap-3 h-12 px-5 rounded-2xl transition-all duration-300 origin-right shadow-sm
                            ${isFocused 
                                ? 'w-[450px] bg-white dark:bg-[#1C1C1E] shadow-xl ring-2' 
                                : 'w-72 bg-white/90 dark:bg-[#1C1C1E]/90 hover:bg-white dark:hover:bg-[#252528]'
                            }
                        `}
                        // Monet Theming & Solid Borders
                        style={{
                            borderColor: 'var(--monet-outline)',
                            borderWidth: '1px',
                            ...(isFocused ? { borderColor: 'var(--monet-primary)', ringColor: 'var(--monet-primary)' } : {})
                        }}
                    >
                        <Search size={18} style={{ color: isFocused ? 'var(--monet-primary)' : 'var(--monet-on-surface-variant)' }} />
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setTimeout(() => !searchQuery && setIsFocused(false), 200)}
                            placeholder="Search subjects, classes..." 
                            className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400" 
                        />
                        {!isFocused && (
                            <kbd className="hidden xl:inline-flex items-center gap-1 px-2 py-1 ml-2 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                                <Command size={10} /> K
                            </kbd>
                        )}
                        {isFocused && searchQuery && (
                            <button onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                                <X size={14} className="text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* DROP DOWN RESULTS */}
                    <AnimatePresence>
                        {isFocused && searchQuery && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-14 right-0 w-[450px] bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden max-h-[60vh] overflow-y-auto"
                            >
                                {searchResults.courses.length === 0 && searchResults.classes.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">No results found</div>
                                ) : (
                                    <div className="py-2">
                                        {searchResults.courses.length > 0 && (
                                            <div className="px-2">
                                                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects</div>
                                                {searchResults.courses.map(course => (
                                                    <button key={course.id} onClick={() => handleResultClick('courses', course)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-colors group">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--monet-primary-container)', color: 'var(--monet-on-primary-container)' }}>
                                                            <BookOpen size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{course.title}</div>
                                                            <div className="text-[10px] text-slate-500">{course.category}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.classes.length > 0 && (
                                            <div className="px-2 mt-2">
                                                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classes</div>
                                                {searchResults.classes.map(cls => (
                                                    <button key={cls.id} onClick={() => handleResultClick('classes', cls)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-colors group">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--monet-secondary-container)', color: 'var(--monet-on-secondary-container)' }}>
                                                            <GraduationCap size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{cls.name}</div>
                                                            <div className="text-[10px] text-slate-500">{cls.schedule || 'No schedule'}</div>
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
                    className="group relative flex items-center gap-3 h-12 pl-3 pr-5 rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, var(--monet-primary) 0%, var(--monet-tertiary) 100%)' }}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {isAiThinking ? (
                        <div className="w-6 h-6 ml-1 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <div className="w-10 h-10 flex items-center justify-center -ml-1">
                            <Lottie animationData={robotAnimation} loop={true} className="w-full h-full" />
                        </div>
                    )}
                    <span className="text-sm font-bold">Ask AI</span>
                </button>

                <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-2" />
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
                                    <UserCircle size={16} /> My Profile
                                </NavLink>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onLogout} className={`${active ? 'bg-red-50 dark:bg-red-900/10 text-red-600' : 'text-slate-700 dark:text-slate-300'} flex w-full items-center gap-2 px-4 py-2 text-sm font-medium`}>
                                    <LogOut size={16} /> Sign Out
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
            <Menu.Button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/50 dark:bg-white/10 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-all outline-none">
                <Palette size={18} className="text-slate-600 dark:text-slate-200" />
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
    
    // Command Palette State (Lazy loaded to avoid circular dependencies if any)
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
    
    // NAVIGATION LOGIC (DEEP LINKING FIX)
    const handleSearchNavigation = useCallback((type, item) => {
        if (type === 'courses' && item) {
            // FIXED: Direct navigation to subject
            const url = `/dashboard/courses/teacher/${encodeURIComponent(item.category)}/${item.id}`;
            navigate(url);
        } else if (type === 'classes' && item) {
            navigate('/dashboard/classes');
        } else {
            handleViewChange(type);
        }
    }, [navigate, handleViewChange]);

    // Command Actions
    const commandActions = useMemo(() => ({
        createClass: () => rest.setCreateClassModalOpen(true),
        createSubject: () => rest.setCreateCourseModalOpen(true),
        openAiHub: () => setIsAiHubOpen(true),
        openLounge: () => handleViewChange('lounge'),
        openProfile: () => handleViewChange('profile'),
        viewArchived: () => rest.setIsArchivedModalOpen(true),
        logout: handleLogoutClick
    }), [rest.setCreateClassModalOpen, rest.setCreateCourseModalOpen, setIsAiHubOpen, handleViewChange, handleLogoutClick, rest.setIsArchivedModalOpen]);

    // ... (Existing Logic: Categories, Online Class)
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
    
    // NAVIGATION ITEMS
    const navItems = useMemo(() => {
        const items = [
            { view: 'home', text: 'Home', icon: Home },
            { view: 'lounge', text: 'Lounge', icon: Rocket },
            { view: 'studentManagement', text: 'Students', icon: Users },
            { view: 'classes', text: 'Classes', icon: GraduationCap },
            { view: 'courses', text: 'Subjects', icon: BookOpen },
            { view: 'analytics', text: 'Analytics', icon: BarChart2 },
            { view: 'profile', text: 'Profile', icon: UserCircle },
        ];
        if (userProfile?.role === 'admin') items.push({ view: 'admin', text: 'Admin', icon: Settings });
        return items;
    }, [userProfile?.role]);

    // RENDER CONTENT
    const renderMainContent = () => {
        if (loading || authLoading) return <DashboardSkeleton />;
        if (error) {
            return (
                <div className="glass-panel border-l-4 border-red-500 text-red-800 dark:text-red-200 p-6 rounded-2xl m-4">
                    <div className="flex items-start gap-3"><ExclamationTriangleIcon className="w-6 h-6 text-red-500" /><div><strong className="block text-lg font-bold">System Notification</strong><span className="text-sm opacity-80">{error}</span></div></div>
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

            {/* --- LAYOUT STRUCTURE (Prism Vision 1) --- */}
            
            {/* 1. Left Vertical Rail */}
            <PrismSidebar 
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
                    <div className="lg:hidden h-24"></div> 
                    <Suspense fallback={<DashboardSkeleton />}>
                        {renderMainContent()}
                    </Suspense>
                    <div className="h-24 lg:hidden"></div>
                </main>
            </div>


            {/* --- MOBILE ELEMENTS --- */}
            
            {/* Mobile Header */}
            <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-2 pb-2 lg:hidden">
                <motion.div 
                    initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    style={monetTheme.glassStyle}
                    className="glass-panel relative flex items-center justify-between px-5 py-3 rounded-[1.5rem] shadow-lg"
                >
                    {/* Fixed Mobile Branding */}
                    <div className="flex items-center gap-2">
                        <img src={branding.logo} alt="Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-lg text-slate-800 dark:text-white">{branding.name}</span>
                    </div>
                    
                    {/* Mobile Actions: Theme + Profile */}
                    <div className="flex items-center gap-3">
                        <MobileThemeButton />
                        <ProfileDropdown userProfile={userProfile} onLogout={handleLogoutClick} size="mobile" />
                    </div>
                </motion.div>
            </div>

            {/* EXPANDED Mobile Dock (5 items) */}
            <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[49] lg:hidden pointer-events-none">
                 <motion.div 
                    initial={{ y: 100 }} animate={{ y: 0 }}
                    style={monetTheme.glassStyle}
                    className="glass-panel pointer-events-auto px-4 py-3 rounded-[2rem] flex items-center gap-4 sm:gap-6 shadow-2xl bg-white/90 dark:bg-[#1C1C1E]/90"
                 >
                     {/* Home */}
                     <NavLink 
                        to="/dashboard" 
                        onClick={() => handleViewChange('home')} 
                        className="transition-transform active:scale-95"
                    >
                        <StunningIcon Icon={Home} isActive={activeView === 'home'} />
                     </NavLink>
                     
                     {/* Courses/Subjects */}
                     <NavLink 
                        to="/dashboard/courses" 
                        onClick={() => handleViewChange('courses')} 
                        className="transition-transform active:scale-95"
                    >
                        <StunningIcon Icon={BookOpen} isActive={activeView === 'courses'} />
                     </NavLink>

                     {/* Classes */}
                     <NavLink 
                        to="/dashboard/classes" 
                        onClick={() => handleViewChange('classes')} 
                        className="transition-transform active:scale-95"
                    >
                        <StunningIcon Icon={GraduationCap} isActive={activeView === 'classes'} />
                     </NavLink>

                     {/* Lounge */}
                     <NavLink 
                        to="/dashboard/lounge" 
                        onClick={() => handleViewChange('lounge')} 
                        className="transition-transform active:scale-95"
                    >
                        <StunningIcon Icon={Rocket} isActive={activeView === 'lounge'} />
                     </NavLink>

                     {/* Menu Toggle */}
                     <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        className={`
                            relative flex items-center justify-center w-[42px] h-[42px] rounded-[14px] 
                            transition-all duration-300
                            ${isMobileMenuOpen ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}
                        `}
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <LayoutGrid size={20} />}
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
                        className="fixed bottom-24 left-4 right-4 z-40 glass-panel rounded-[2rem] p-6 lg:hidden shadow-2xl bg-white dark:bg-[#1C1C1E]"
                    >
                        <div className="grid grid-cols-4 gap-4">
                            {navItems.filter(i => !['home','classes', 'courses', 'lounge'].includes(i.view)).map(item => (
                                <button key={item.view} onClick={() => { handleViewChange(item.view); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-2">
                                    <StunningIcon Icon={item.icon} isActive={activeView === item.view} />
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{item.text}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* --- MODALS & OVERLAYS --- */}
            <Suspense fallback={null}>
                {/* AI Chat Drawer (Desktop) & Robot (Mobile) */}
                <div className="lg:hidden">
                    {!isChatOpen && activeView === 'home' && (
                        <div className="fixed bottom-28 right-4 z-40">
                             <AnimatedRobot onClick={handleOpenChat} />
                        </div>
                    )}
                </div>

                {/* Command Palette */}
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
                
                {/* Other Modals... */}
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

            {/* Logout Modal */}
            <CSSTransition in={isLogoutModalOpen} timeout={400} classNames="logout-modal" unmountOnExit>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="glass-panel rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm text-center transform transition-all bg-white dark:bg-[#1A1D24]">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/50 text-red-500 mx-auto mb-5 flex items-center justify-center shadow-inner ring-4 ring-slate-100 dark:ring-white/5">
                            <Power size={28} strokeWidth={2} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Sign Out?</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">You are about to end your session.<br/>Are you sure you want to continue?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmLogout} className="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95 text-sm tracking-wide">Yes, Log Out</button>
                            <button onClick={cancelLogout} className="w-full py-3.5 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-sm tracking-wide">Cancel</button>
                        </div>
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
};

export default memo(TeacherDashboardLayout);