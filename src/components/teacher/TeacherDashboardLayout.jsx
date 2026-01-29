// src/components/teacher/TeacherDashboardLayout.jsx
import React, { useState, Suspense, lazy, Fragment, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { CSSTransition } from 'react-transition-group'; 
// FIXED: Consolidated import - removed duplicates
import { Menu, Transition, Dialog, Portal } from '@headlessui/react'; 
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react'; 

// --- ICON LIBRARY: PHOSPHOR ICONS ---
import { 
    House,              
    ChalkboardTeacher,  
    Books,              
    Student,            
    Coffee,             
    ChartPieSlice,      
    UserCircle,         
    Gear,               
    SignOut,            
    Palette,            
    MagnifyingGlass,    
    Command,            
    CaretRight,         
    X,                  
    SquaresFour,        
    Robot,              
    WarningCircle,      
    CheckSquareOffset,  
    Lightning,
    Sparkle,        
    LightningSlash  
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
const ElectionManager = lazy(() => import('./ElectionManager')); 

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
const CommandPalette = lazy(() => import('./CommandPalette'));

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
  
  .sidebar-transition {
    transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.0), background-color 0.3s ease;
    will-change: width, transform;
  }
  
  .neural-glass {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 
        0 10px 40px -10px rgba(0,0,0,0.05),
        0 0 0 1px rgba(255,255,255,0.3) inset;
  }
  .dark .neural-glass {
    background: rgba(18, 18, 21, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 
        0 20px 50px -12px rgba(0,0,0,0.5),
        0 0 0 1px rgba(255,255,255,0.05) inset;
  }

  .dock-item-active {
     box-shadow: 0 0 20px rgba(var(--monet-primary-rgb), 0.4);
  }
`;

// --- SKELETON ---
const DashboardSkeleton = memo(() => (
    <div className="w-full h-full p-8 space-y-8 animate-pulse">
        <div className="w-full h-48 bg-slate-200 dark:bg-slate-800/50 rounded-[2rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800/50 rounded-[1.5rem]"></div>
            ))}
        </div>
    </div>
));

// --- COMPONENT: Neural Icon with "Alive" Pulse ---
const AestheticIcon = memo(({ Icon, isActive }) => {
    return (
        <div className="relative flex items-center justify-center w-12 h-12">
            <AnimatePresence>
                {isActive && (
                    <>
                        <motion.div
                            layoutId="activeGlow"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[var(--monet-primary)]/20 to-[var(--monet-primary)]/5"
                        />
                        <motion.div
                            initial={{ scale: 0.8, opacity: 1 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 rounded-2xl bg-[var(--monet-primary)]/20 z-0"
                        />
                    </>
                )}
            </AnimatePresence>
            <Icon
                size={24}
                weight={isActive ? "fill" : "duotone"} 
                className={`relative z-10 transition-all duration-500 ${isActive ? 'text-[var(--monet-primary)] scale-110 drop-shadow-md' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 scale-100'}`}
            />
            {isActive && (
                 <motion.div 
                    layoutId="activeDot"
                    className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--monet-primary)] shadow-[0_0_8px_var(--monet-primary)] z-20"
                 />
            )}
        </div>
    );
});

// --- COMPONENT: The Floating Glass Rail ---
const AestheticSidebar = memo(({ navItems, activeView, handleViewChange, branding, showTutorial, onTutorialComplete, onThemeSelect }) => {
    return (
        <div className="hidden lg:block relative h-[calc(100vh-32px)] my-4 ml-4 w-[88px] shrink-0 z-50">
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-0 left-0 bottom-0 flex flex-col w-full hover:w-[260px] rounded-[32px] sidebar-transition group overflow-hidden neural-glass"
            >
                <div className="h-28 flex items-center px-6 overflow-hidden whitespace-nowrap shrink-0 relative">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 z-20 transition-all duration-300 bg-gradient-to-br from-white/20 to-transparent border border-white/10 shadow-lg">
                        <img src={branding.logo} alt="Logo" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="ml-4 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out delay-75 flex flex-col justify-center">
                        <h1 className="font-bold text-base text-slate-800 dark:text-white leading-tight tracking-tight">{branding.name}</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Version 10.2</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 flex flex-col gap-3 px-4 py-2 overflow-y-auto mac-scrollbar overflow-x-hidden">
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
                                <div className="min-w-[3.5rem] h-full flex justify-center items-center z-10">
                                    <AestheticIcon Icon={item.icon} isActive={isActive} />
                                </div>
                                <div className="flex-1 flex items-center pr-4 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                    <span className={`text-[14px] font-medium tracking-wide transition-colors ${isActive ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {item.text}
                                    </span>
                                </div>
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeStrip"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[var(--monet-primary)] shadow-[0_0_12px_var(--monet-primary)]"
                                    />
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 shrink-0 pb-6">
                    <Menu as="div" className="relative">
                        <Menu.Button 
                            onClick={onTutorialComplete}
                            className={`flex items-center w-full h-14 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/btn outline-none ${showTutorial ? 'ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]' : ''}`}
                        >
                             <div className="min-w-[3.5rem] flex justify-center items-center">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 group-hover/btn:text-slate-800 dark:group-hover/btn:text-white transition-colors bg-white/5 border border-white/5">
                                    <Palette size={20} weight="duotone" />
                                </div>
                             </div>
                             <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
                                 <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                                     Appearance
                                 </span>
                             </div>
                        </Menu.Button>
                        
                        {/* PORTAL ADDED HERE TO FIX OVERFLOW */}
                        <Portal>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-200"
                                enterFrom="opacity-0 translate-y-4 scale-95"
                                enterTo="opacity-100 translate-y-0 scale-100"
                                leave="transition ease-in duration-150"
                                leaveFrom="opacity-100 translate-y-0 scale-100"
                                leaveTo="opacity-0 translate-y-4 scale-95"
                            >
					<Menu.Items className="fixed bottom-24 left-24 w-64 p-4 origin-bottom-left rounded-[24px] bg-white/80 dark:bg-[#0f1012]/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] focus:outline-none z-[9999]">
					    <div className="flex items-center justify-between mb-4 px-1">
					        {/* CHANGED: Uses slate-500 for light mode and slate-400 for dark mode */}
					        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
					            Workspace Theme
					        </span>
					        {/* CHANGED: Icon color updated to match text for visibility */}
					        <Lightning size={14} weight="fill" className="text-slate-400 dark:text-slate-300" />
					    </div>
					    <ThemeToggle onRequestThemeChange={onThemeSelect} />
					</Menu.Items>
                            </Transition>
                        </Portal>
                    </Menu>
                </div>
            </motion.div>
        </div>
    );
});

// --- TOP BAR ---
const TopContextBar = memo(({ userProfile, activeView, onLogout, handleOpenChat, isAiThinking, courses, activeClasses, onNavigate }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const searchResults = useMemo(() => {
        if (!debouncedQuery.trim()) return { courses: [], classes: [] };
        const lowerQuery = debouncedQuery.toLowerCase();
        return {
            courses: courses?.filter(c => c.title.toLowerCase().includes(lowerQuery)) || [],
            classes: activeClasses?.filter(c => c.name.toLowerCase().includes(lowerQuery)) || []
        };
    }, [debouncedQuery, courses, activeClasses]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val === '') {
            setTimeout(() => { if (searchInputRef.current) searchInputRef.current.blur(); setIsFocused(false); }, 100); 
        }
    };

    const handleResultClick = (type, item) => {
        setSearchQuery('');
        setDebouncedQuery('');
        setIsFocused(false);
        onNavigate(type, item);
    };

    const titles = {
        home: 'Dashboard',
        lounge: 'Faculty Neural Lounge',
        studentManagement: 'Student Directory',
        classes: 'Live Classrooms',
        courses: 'Knowledge Library',
        analytics: 'Data Intelligence',
        elections: 'Election Command',
        profile: 'User Identity',
        admin: 'System Core'
    };

    return (
        <header className="h-28 px-8 flex items-center justify-between flex-shrink-0 z-40 bg-transparent pointer-events-none mt-2">
            <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                key={activeView}
                className={`flex flex-col justify-center h-full transition-all duration-500 pointer-events-auto ${isFocused ? 'opacity-20 blur-sm scale-95' : 'opacity-100 blur-0 scale-100'}`}
            >
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1.5">
                    <span className="opacity-50">System</span>
                    <CaretRight size={10} weight="bold" />
                    <span className="text-[var(--monet-primary)] drop-shadow-[0_0_8px_rgba(var(--monet-primary-rgb),0.5)]">{activeView}</span>
                </div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-500 tracking-tight drop-shadow-sm">
                    {titles[activeView] || 'Teacher Workspace'}
                </h2>
            </motion.div>

            <div className="flex items-center gap-6 pointer-events-auto">
                <div className="relative z-50">
                    <div className={`group flex items-center gap-3 h-12 px-5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] backdrop-blur-xl border ${isFocused ? 'w-[520px] bg-white/90 dark:bg-black/70 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] border-white/20 ring-1 ring-white/10' : 'w-64 bg-white/30 dark:bg-black/45 hover:bg-white/50 dark:hover:bg-white/10 hover:w-[280px] border-transparent hover:border-white/10 shadow-sm'}`}>
                        <MagnifyingGlass size={18} weight="bold" className={`transition-colors duration-300 ${isFocused ? 'text-[var(--monet-primary)]' : 'text-slate-500 dark:text-slate-400'}`} />
                        <input ref={searchInputRef} type="text" value={searchQuery} onChange={handleSearchChange} onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => !searchQuery && setIsFocused(false), 200)} placeholder={isFocused ? "Search across the neural network..." : "Search..."} className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-500/60 dark:placeholder:text-slate-400/60 transition-all" />
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold transition-all duration-300 ${isFocused ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0 bg-white/20 dark:bg-white/5 border-white/10 text-slate-500 dark:text-slate-400'}`}>
                            <Command size={10} weight="bold" /> <span>K</span>
                        </div>
                        {isFocused && searchQuery && (
                            <button onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }} className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-400 transition-colors animate-in fade-in zoom-in">
                                <X size={14} weight="bold" />
                            </button>
                        )}
                    </div>
                    <AnimatePresence>
                        {isFocused && searchQuery && (
                            <motion.div initial={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(8px)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="absolute top-16 right-0 w-[520px] rounded-[32px] overflow-hidden border border-white/20 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl bg-white/80 dark:bg-[#0a0a0c]/80">
                                {searchResults.courses.length === 0 && searchResults.classes.length === 0 ? (
                                    <div className="p-12 flex flex-col items-center text-center text-slate-400">
                                        <MagnifyingGlass size={48} weight="duotone" className="mb-4 opacity-20" />
                                        <p className="text-sm font-medium">Signal lost. No matches found.</p>
                                    </div>
                                ) : (
                                    <div className="p-3 space-y-2">
                                        {searchResults.courses.length > 0 && (
                                            <div className="mb-2">
                                                <div className="px-5 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Books size={14} weight="fill" /> Library Nodes
                                                </div>
                                                {searchResults.courses.map(course => (
                                                    <button key={course.id} onClick={() => handleResultClick('courses', course)} className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors group text-left border border-transparent hover:border-white/10">
                                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
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
                                                <div className="px-5 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                    <ChalkboardTeacher size={14} weight="fill" /> Active Feeds
                                                </div>
                                                {searchResults.classes.map(cls => (
                                                    <button key={cls.id} onClick={() => handleResultClick('classes', cls)} className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors group text-left border border-transparent hover:border-white/10">
                                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
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
                <button onClick={handleOpenChat} className="group relative flex items-center gap-3 h-12 pl-3 pr-5 rounded-full text-white shadow-[0_0_30px_-5px_var(--monet-primary)] hover:shadow-[0_0_50px_-10px_var(--monet-primary)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden" style={{ backgroundColor: 'var(--monet-primary)' }}>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="relative z-10 flex items-center gap-2">
                        {isAiThinking ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <div className="w-8 h-8 flex items-center justify-center">
                                <Lottie animationData={robotAnimation} loop={true} className="w-full h-full scale-125" />
                            </div>
                        )}
                        <span className="text-sm font-bold tracking-wide text-white drop-shadow-md">Ask AI</span>
                    </div>
                </button>
                <div className="w-px h-8 bg-slate-200 dark:bg-black/40 mx-1" />
                <ProfileDropdown userProfile={userProfile} onLogout={onLogout} size="desktop" />
            </div>
        </header>
    );
});

// --- SUB-COMPONENT: Profile Dropdown ---
const ProfileDropdown = memo(({ userProfile, onLogout, size = 'desktop' }) => {
    return (
        <Menu as="div" className="relative z-50">
            <Menu.Button className="relative flex items-center justify-center w-12 h-12 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-2 transition-all outline-none group" style={{ '--tw-ring-color': 'var(--monet-primary)' }}>
                {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="full" className="w-full h-full text-xs" />
                )}
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-full group-hover:ring-transparent transition-all" />
            </Menu.Button>
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="transform opacity-0 scale-95 translate-y-2" enterTo="transform opacity-100 scale-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="transform opacity-100 scale-100 translate-y-0" leaveTo="transform opacity-0 scale-95 translate-y-2">
                <Menu.Items className="absolute right-0 mt-4 w-72 origin-top-right rounded-[28px] bg-white/90 dark:bg-[#121214]/90 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10 focus:outline-none divide-y divide-slate-100/50 dark:divide-white/5 overflow-hidden">
                    <div className="px-6 py-5 bg-gradient-to-b from-slate-50/50 dark:from-white/5 to-transparent">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{userProfile?.firstName} {userProfile?.lastName}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{userProfile?.email}</p>
                        <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--monet-primary)]/10 text-[var(--monet-primary)] text-[10px] font-bold uppercase tracking-wider">
                            {userProfile?.role || 'Instructor'}
                        </div>
                    </div>
                    <div className="p-2">
                         <Menu.Item>
                            {({ active }) => (
                                <NavLink to="/dashboard/profile" className={`${active ? 'bg-slate-50 dark:bg-white/5' : ''} flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors`}>
                                    <UserCircle size={20} weight="duotone" /> My Profile
                                </NavLink>
                            )}
                        </Menu.Item>
                    </div>
                    <div className="p-2">
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onLogout} className={`${active ? 'bg-red-50 dark:bg-red-900/10 text-red-600' : 'text-slate-700 dark:text-slate-300'} flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors`}>
                                    <SignOut size={20} weight="duotone" /> Disconnect
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
const MobileThemeButton = memo(({ onThemeSelect }) => {
    return (
        <Menu as="div" className="relative z-50">
            <Menu.Button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md overflow-hidden ring-1 ring-white/20 hover:bg-white/20 transition-all outline-none">
                <Palette size={20} weight="duotone" className="text-slate-800 dark:text-white" />
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
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appearance</span>
                    </div>
                    <ThemeToggle onRequestThemeChange={onThemeSelect} />
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

    // --- STATE ---
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] = useState(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAmbienceTutorial, setShowAmbienceTutorial] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    
    // THEME SELECTION STATE (Lifted Up)
    const [pendingTheme, setPendingTheme] = useState(null);

    const { showToast } = useToast();
    const { monetTheme, setActiveOverlay, setThemeMode } = useTheme(); 
    const navigate = useNavigate();
    
    const branding = useMemo(() => getSchoolBranding(userProfile?.schoolId), [userProfile?.schoolId]);

    // --- HANDLERS ---
    
    // Theme Handlers
    const handleThemeSelectionRequest = useCallback((themeName) => {
        setPendingTheme(themeName);
    }, []);

    const confirmTheme = useCallback((mode) => {
        if (pendingTheme) {
            setActiveOverlay(pendingTheme);
            setThemeMode(mode);
            setPendingTheme(null);
        }
    }, [pendingTheme, setActiveOverlay, setThemeMode]);


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
    
    // NAVIGATION ITEMS 
    const navItems = useMemo(() => {
        const items = [
            { view: 'home', text: 'Dashboard', icon: House },
            { view: 'lounge', text: 'Lounge', icon: Coffee },
            { view: 'studentManagement', text: 'Students', icon: Student },
            { view: 'classes', text: 'Classes', icon: ChalkboardTeacher },
            { view: 'courses', text: 'Library', icon: Books },
            { view: 'analytics', text: 'Reports', icon: ChartPieSlice },
            { view: 'elections', text: 'Elections', icon: CheckSquareOffset },
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
            case 'elections': return <div key={`${reloadKey}-elections`} className="p-6"><ElectionManager /></div>;
            case 'profile': return <ProfileView key={`${reloadKey}-profile`} user={user} userProfile={userProfile} logout={logout} {...rest} />;
            case 'analytics': return <AnalyticsView key={`${reloadKey}-analytics`} activeClasses={activeClasses} courses={courses} />;
            case 'admin': return <div key={`${reloadKey}-admin`} className="p-4 sm:p-6 text-slate-900 dark:text-slate-100"><AdminDashboard /></div>;
            default: return <HomeView key={`${reloadKey}-default`} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
        }
    };

    return (
        <div 
            className="h-screen flex bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 overflow-hidden relative"
            style={monetTheme.variables}
        >
            <style>{styles}</style>
            
            {/* Background - The Neural Mesh */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_rgba(var(--monet-primary-rgb),0.05),_transparent_50%)]" />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(var(--monet-secondary-rgb),0.05),_transparent_50%)]" />
            </div>

            <UniversalBackground />

            {/* 1. Left Vertical Rail (Floating Glass) */}
            <AestheticSidebar 
                navItems={navItems} 
                activeView={activeView} 
                handleViewChange={handleViewChange} 
                branding={branding} 
                showTutorial={showAmbienceTutorial}
                onTutorialComplete={handleTutorialComplete}
                onThemeSelect={handleThemeSelectionRequest} 
            />

            {/* 2. Main Workspace */}
            <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
                
                {/* Desktop Top Bar (Cinematic) */}
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
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-0 lg:px-8 lg:pb-8 lg:mt-4 scroll-smooth" id="main-scroll-container">
                    <div className="lg:hidden h-24"></div> 
                    
                    <Suspense fallback={<DashboardSkeleton />}>
                        {renderMainContent()}
                    </Suspense>

                    <div className="h-40 lg:hidden"></div>
                </main>
            </div>


            {/* --- MOBILE ELEMENTS --- */}
            
            <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-3 pb-2 lg:hidden">
                <motion.div 
                    initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="neural-glass relative flex items-center justify-between px-5 py-3 rounded-[2rem] shadow-lg"
                >
                    <div className="flex items-center gap-3">
                        <img src={branding.logo} alt="Logo" className="w-7 h-7 object-contain" />
                        <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">{branding.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <MobileThemeButton onThemeSelect={handleThemeSelectionRequest} />
                        <ProfileDropdown userProfile={userProfile} onLogout={handleLogoutClick} size="mobile" />
                    </div>
                </motion.div>
            </div>

            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-[49] lg:hidden pointer-events-none">
                 <motion.div 
                    initial={{ y: 100, scale: 0.8 }} 
                    animate={{ y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="neural-glass pointer-events-auto px-6 py-3 rounded-full flex items-center gap-6 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-white/90 dark:bg-[#1C1C1E]/90 border border-white/20"
                 >
                     <NavLink 
                        to="/dashboard" 
                        onClick={() => handleViewChange('home')} 
                        className="relative p-2 rounded-full transition-transform active:scale-90"
                    >
                        <House size={24} weight={activeView === 'home' ? 'fill' : 'duotone'} className={activeView === 'home' ? 'text-[var(--monet-primary)]' : 'text-slate-500'} />
                        {activeView === 'home' && <motion.div layoutId="mobileDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--monet-primary)] rounded-full" />}
                    </NavLink>
                     
                     <NavLink 
                        to="/dashboard/courses" 
                        onClick={() => handleViewChange('courses')} 
                        className="relative p-2 rounded-full transition-transform active:scale-90"
                    >
                        <Books size={24} weight={activeView === 'courses' ? 'fill' : 'duotone'} className={activeView === 'courses' ? 'text-[var(--monet-primary)]' : 'text-slate-500'} />
                        {activeView === 'courses' && <motion.div layoutId="mobileDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--monet-primary)] rounded-full" />}
                    </NavLink>

                     <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        className={`
                            relative flex items-center justify-center w-12 h-12 rounded-full 
                            transition-all duration-300 shadow-lg -mt-6 border-4 border-slate-50 dark:border-[#0f1012]
                            ${isMobileMenuOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-[var(--monet-primary)] text-white'}
                        `}
                    >
                        {isMobileMenuOpen ? <X size={24} weight="bold" /> : <SquaresFour size={24} weight="fill" />}
                     </button>

                     <NavLink 
                        to="/dashboard/classes" 
                        onClick={() => handleViewChange('classes')} 
                        className="relative p-2 rounded-full transition-transform active:scale-90"
                    >
                        <ChalkboardTeacher size={24} weight={activeView === 'classes' ? 'fill' : 'duotone'} className={activeView === 'classes' ? 'text-[var(--monet-primary)]' : 'text-slate-500'} />
                        {activeView === 'classes' && <motion.div layoutId="mobileDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--monet-primary)] rounded-full" />}
                    </NavLink>

                     <NavLink 
                        to="/dashboard/lounge" 
                        onClick={() => handleViewChange('lounge')} 
                        className="relative p-2 rounded-full transition-transform active:scale-90"
                    >
                        <Coffee size={24} weight={activeView === 'lounge' ? 'fill' : 'duotone'} className={activeView === 'lounge' ? 'text-[var(--monet-primary)]' : 'text-slate-500'} />
                        {activeView === 'lounge' && <motion.div layoutId="mobileDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--monet-primary)] rounded-full" />}
                    </NavLink>
                 </motion.div>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 100 }}
                        className="fixed bottom-28 left-4 right-4 z-40 neural-glass rounded-[2rem] p-6 lg:hidden shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] bg-white/95 dark:bg-[#1C1C1E]/95"
                    >
                        <div className="grid grid-cols-4 gap-6">
                            {navItems.filter(i => !['home','classes', 'courses', 'lounge'].includes(i.view)).map(item => (
                                <button key={item.view} onClick={() => { handleViewChange(item.view); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-2 group">
                                    <div className={`p-3 rounded-2xl transition-colors ${activeView === item.view ? 'bg-[var(--monet-primary)]/10 text-[var(--monet-primary)]' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                                        <item.icon size={28} weight="duotone" />
                                    </div>
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

            {/* --- THEME SELECTION MODAL (MOVED HERE) --- */}
            <Transition show={!!pendingTheme} as={Fragment}>
                <Dialog as="div" className="relative z-[9999]" onClose={() => setPendingTheme(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95 translate-y-4"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-4"
                            >
                                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-[2rem] bg-[#0f111a] border border-white/10 p-6 text-left align-middle shadow-2xl transition-all relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] pointer-events-none" />
                                    
                                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-2 flex items-center gap-2">
                                        <Sparkle size={18} weight="fill" className="text-yellow-400" />
                                        Choose Experience
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-slate-400">
                                            How would you like to experience this theme?
                                        </p>
                                    </div>

                                    <div className="mt-6 flex flex-col gap-3">
                                        <button
                                            type="button"
                                            className="relative group w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 border border-white/10 flex items-center justify-between hover:scale-[1.02] transition-all overflow-hidden"
                                            onClick={() => confirmTheme('full')}
                                        >
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex flex-col items-start relative z-10">
                                                <span className="text-sm font-bold text-white uppercase tracking-wider">Full Experience</span>
                                                <span className="text-[10px] text-indigo-100 opacity-80">With animations & particles</span>
                                            </div>
                                            <Sparkle size={20} weight="fill" className="text-yellow-300 animate-pulse relative z-10" />
                                        </button>

                                        <button
                                            type="button"
                                            className="relative group w-full p-4 rounded-2xl bg-[#1e2230] border border-white/5 flex items-center justify-between hover:bg-[#252a3b] transition-all"
                                            onClick={() => confirmTheme('lite')}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="text-sm font-bold text-white uppercase tracking-wider">Lite Mode</span>
                                                <span className="text-[10px] text-slate-400">Colors only (Performance)</span>
                                            </div>
                                            <LightningSlash size={20} className="text-slate-500" />
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <CSSTransition in={isLogoutModalOpen} timeout={400} classNames="logout-modal" unmountOnExit>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 z-0 bg-[#020617]/80 backdrop-blur-md transition-opacity" onClick={cancelLogout} />
                    <div className="relative z-10 w-full max-w-sm rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-[#0f172a] transform transition-all">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(220,38,38,0.15),_transparent_70%)] pointer-events-none" />
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
                        <div className="relative z-20 p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 mx-auto mb-6 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)] group">
                                <div className="relative z-10 text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)] transition-transform duration-500 group-hover:scale-110">
                                    <SignOut size={32} weight="duotone" />
                                </div>
                                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-red-500/20 pointer-events-none animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight drop-shadow-md">
                                Terminate Session?
                            </h2>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed font-light">
                                You are about to disconnect from the Neural Workspace.<br/>
                                <span className="text-red-400/80 font-medium">Unsaved progress will be lost.</span>
                            </p>
                            <div className="flex flex-col gap-3">
                                <button onClick={confirmLogout} className="w-full py-4 rounded-2xl font-bold text-white text-sm tracking-widest uppercase bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-[0_10px_30px_-10px_rgba(220,38,38,0.6)] transition-all active:scale-95 cursor-pointer relative z-30">
                                    Confirm Disconnect
                                </button>
                                <button onClick={cancelLogout} className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:text-white text-sm tracking-widest uppercase hover:bg-white/5 border border-transparent hover:border-white/10 transition-all active:scale-95 cursor-pointer relative z-30">
                                    Cancel
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