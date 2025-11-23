import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardDocumentCheckIcon,
    UserIcon,
    PowerIcon,
    BookOpenIcon,
    Squares2X2Icon,
    GiftIcon,
    AcademicCapIcon,
    InboxIcon,
    ChevronRightIcon,
    RocketLaunchIcon, 
    TrophyIcon,
    StarIcon,
    SparklesIcon,
    VideoCameraIcon,
    QuestionMarkCircleIcon,
    FireIcon,
    ClockIcon,
    PlusCircleIcon,
    SunIcon,
    MoonIcon,
    HomeIcon, 
    RectangleGroupIcon,
    // Subject Icons
    CalculatorIcon, 
    BeakerIcon, 
    GlobeAmericasIcon, 
    LanguageIcon, 
    PaintBrushIcon, 
    MusicalNoteIcon, 
    ComputerDesktopIcon, 
    EllipsisHorizontalCircleIcon
} from '@heroicons/react/24/solid';
import StudentProfilePage from './StudentProfilePage';
import RewardsPage from '../components/student/RewardsPage';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import StudentLessonsTab from '../components/student/StudentLessonsTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import SessionConflictModal from '../components/common/SessionConflictModal';
import InstallPWA from '../components/common/InstallPWA';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';

import ThemeToggle from '../components/common/ThemeToggle';
import LoungeView from '../components/student/LoungeView';

// --- CUSTOM CSS: MAC OS 26 SCROLLBARS & UTILS ---
const scrollbarStyles = `
  /* Global Scrollbar Styling - Ultra Thin & Floating */
  ::-webkit-scrollbar {
    width: 0px; 
    height: 0px;
  }
  
  /* Apply to the specific scroll container in the dashboard */
  .app-scroll-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .app-scroll-container::-webkit-scrollbar-track {
    background: transparent; 
  }
  .app-scroll-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1); 
    border-radius: 100px;
  }
  .dark .app-scroll-container::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1); 
  }

  /* Glass Morphism Utilities - Enhanced for Dark Mode */
  .glass-panel {
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(25px) saturate(180%);
    -webkit-backdrop-filter: blur(25px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
  }
  .dark .glass-panel {
    background: rgba(30, 41, 59, 0.70);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  }
  
  /* macOS 26 Dock - Dynamic Width */
  .macos-dock {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(30px) saturate(200%);
    -webkit-backdrop-filter: blur(30px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-top: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.15),
        inset 0 0 0 1px rgba(255, 255, 255, 0.2);
    transition: width 0.3s ease;
  }
  .dark .macos-dock {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 
        0 30px 60px -15px rgba(0, 0, 0, 0.6),
        inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  /* Mesh Gradient Background Animation */
  @keyframes meshMove {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .mesh-bg {
    background: radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), 
                radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.15) 0px, transparent 50%), 
                radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%), 
                radial-gradient(at 0% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%);
    background-size: 150% 150%;
  }
`;

// --- HELPER: Advanced Class Theming (Subtle Gradients) ---
const getClassTheme = (subject) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('math') || s.includes('algebra')) return {
        accent: 'text-blue-500 dark:text-blue-400',
        dot: 'bg-blue-500',
        gradient: 'bg-gradient-to-br from-blue-50/80 via-white/40 to-transparent dark:from-blue-900/30 dark:via-slate-800/60 dark:to-slate-900',
        border: 'border-blue-100/60 dark:border-blue-500/20'
    };
    if (s.includes('science') || s.includes('bio') || s.includes('chem')) return {
        accent: 'text-emerald-500 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        gradient: 'bg-gradient-to-br from-emerald-50/80 via-white/40 to-transparent dark:from-emerald-900/30 dark:via-slate-800/60 dark:to-slate-900',
        border: 'border-emerald-100/60 dark:border-emerald-500/20'
    };
    if (s.includes('history') || s.includes('social')) return {
        accent: 'text-orange-500 dark:text-orange-400',
        dot: 'bg-orange-500',
        gradient: 'bg-gradient-to-br from-orange-50/80 via-white/40 to-transparent dark:from-orange-900/30 dark:via-slate-800/60 dark:to-slate-900',
        border: 'border-orange-100/60 dark:border-orange-500/20'
    };
    if (s.includes('english') || s.includes('lit')) return {
        accent: 'text-violet-500 dark:text-violet-400',
        dot: 'bg-violet-500',
        gradient: 'bg-gradient-to-br from-violet-50/80 via-white/40 to-transparent dark:from-violet-900/30 dark:via-slate-800/60 dark:to-slate-900',
        border: 'border-violet-100/60 dark:border-violet-500/20'
    };
    if (s.includes('art')) return {
        accent: 'text-pink-500 dark:text-pink-400',
        dot: 'bg-pink-500',
        gradient: 'bg-gradient-to-br from-pink-50/80 via-white/40 to-transparent dark:from-pink-900/30 dark:via-slate-800/60 dark:to-slate-900',
        border: 'border-pink-100/60 dark:border-pink-500/20'
    };
    
    return {
        accent: 'text-slate-500 dark:text-slate-400',
        dot: 'bg-slate-500',
        gradient: 'bg-gradient-to-br from-slate-100/80 via-white/40 to-transparent dark:from-slate-800/40 dark:via-slate-800/60 dark:to-slate-900',
        border: 'border-slate-200/60 dark:border-slate-700/30'
    };
};

// --- COMPONENT: Dashboard Skeleton Loader ---
const DashboardSkeleton = () => (
    <div className="space-y-6 p-4 animate-pulse max-w-[1920px] mx-auto">
        <div className="h-48 w-full bg-slate-200/50 dark:bg-slate-700/30 rounded-[2rem]"></div>
        <div className="space-y-4">
            <div className="h-4 w-32 bg-slate-200/50 dark:bg-slate-700/30 rounded-full"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-40 w-full bg-slate-200/50 dark:bg-slate-700/30 rounded-[2rem]"></div>
                ))}
            </div>
        </div>
    </div>
);


// --- (BADGE_MAP, XPProgressRing, DailyQuote) ---
const BADGE_MAP = {
  'first_quiz': { icon: RocketLaunchIcon, title: 'First Quiz' },
  'perfect_score': { icon: TrophyIcon, title: 'Perfect Score' },
  'badge_scholar': { icon: AcademicCapIcon, title: 'Scholar' },
  'badge_master': { icon: StarIcon, title: 'Master' },
  'badge_legend': { icon: SparklesIcon, title: 'Legend' },
};

const XPProgressRing = ({ xp = 0, level = 1, size = "small" }) => {
  const currentLevel = Math.max(1, level || 1);
  const currentXP = Math.max(0, xp || 0);
  const percent = Math.min(100, (currentXP / ((currentLevel) * 500)) * 100); 
  
  const radius = size === "small" ? 28 : 36; 
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const boxSize = size === "small" ? 70 : 80;

  return (
    <div className={`relative flex items-center justify-center`} style={{ width: boxSize, height: boxSize }}>
      <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" fill="none" className="text-slate-400 dark:text-slate-600" />
        <motion.circle
          cx="50" cy="50" r={radius} stroke="url(#xpGradient)" strokeWidth="6" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-none font-bold tracking-wider opacity-80">LVL</span>
        <span className={`font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-700 to-slate-900 dark:from-white dark:to-slate-300 leading-tight ${size === 'small' ? 'text-xl' : 'text-2xl'}`}>{currentLevel}</span>
      </div>
    </div>
  );
};

const DailyQuote = ({ compact = false }) => {
  const quotes = [
    "Small steps add up.", "Every challenge helps you grow.",
    "Effort shapes tomorrow.", "Progress, not perfection.",
    "Keep learning.", "Create your future.",
    "Dream big. Work hard.", "Slow progress is progress.",
  ];
  const [quote, setQuote] = useState("");
  const today = new Date();
  const index = today.getDate() % quotes.length;
  useEffect(() => { setQuote(quotes[index]); }, [index, quotes]);
  return (
    <motion.div
      key={quote} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className={`text-slate-500 dark:text-slate-400 text-[10px] font-medium italic leading-snug opacity-90`}
    > “{quote}” </motion.div>
  );
};


// --- EmptyState (Glassy) ---
const EmptyState = ({ icon: Icon, title, message, actionText, onActionClick }) => (
    <div className="glass-panel flex flex-col items-center justify-center text-center p-8 rounded-[2rem] max-w-sm mx-auto mt-8 backdrop-blur-xl">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4 shadow-inner">
             <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-[90%] mx-auto">{message}</p>
        {onActionClick && (
            <button onClick={onActionClick} className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ease-out py-2.5 px-5 text-xs">
                {actionText}
            </button>
        )}
    </div>
);

// --- UPDATED DashboardHome (Wider Layout) ---
const DashboardHome = ({ userProfile, myClasses, setSelectedClass, handleViewChange, upNextTask }) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const genericBadges = (userProfile?.genericBadges || []).slice(-3).reverse();
    
    const getTeacherName = (classItem) => {
        if (!classItem) return 'Unknown';
        return (
            classItem.teacherName ||
            classItem.teacher?.displayName ||
            classItem.teacher?.name ||
            [classItem.teacher?.firstName, classItem.teacher?.lastName].filter(Boolean).join(' ') ||
            'Teacher'
        );
    };

    const getInspirationalPhrase = () => {
        const phrases = [
            "Ready to shape your future?",
            "Unlock your potential today.",
            "Let's turn curiosity into knowledge.",
            "Your journey continues here.",
            "Make today a masterpiece."
        ];
        const index = new Date().getDate() % phrases.length;
        return phrases[index];
    };

    return (
        <div className="space-y-8 p-6 pb-36 max-w-[1920px] mx-auto w-full">
            
            {/* --- 1. Hero Section (Full Width) --- */}
            <div className="w-full">
                {/* Dynamic Height: min-h-[180px] allows growth, h-auto enables flow */}
                <div className="w-full min-h-[180px] h-auto bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.3)] border border-white/60 dark:border-white/5 flex flex-col justify-between relative overflow-hidden group">
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] transition-transform group-hover:scale-105 duration-1000">
                         <AcademicCapIcon className="w-40 h-40 text-slate-900 dark:text-white" />
                    </div>
                    
                    <div className="relative z-10 mb-4">
                        {/* Responsive Text Size: text-2xl on mobile to prevent overflow */}
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight break-words">
                            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">{userProfile?.firstName}</span>
                        </h1>
                        {/* INSPIRATIONAL TEXT */}
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-2xl leading-relaxed">
                            {getInspirationalPhrase()}
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-3">
                        <div className="bg-orange-50 dark:bg-orange-500/10 px-4 py-2 rounded-full border border-orange-100 dark:border-orange-500/20 flex items-center gap-2">
                             <FireIcon className="w-4 h-4 text-orange-500" />
                             <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                                {userProfile?.loginStreak || 0} Day Streak
                             </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 2. Achievements Section (3D Token Style) --- */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"> 
                        <StarIcon className="h-5 w-5 text-yellow-500" /> 
                        Achievements
                    </h2>
                    <button onClick={() => handleViewChange('profile')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-full transition-colors">View All</button>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1">
                    {genericBadges.length > 0 ? (
                        genericBadges.map((badgeKey, idx) => {
                            const badge = BADGE_MAP[badgeKey];
                            if (!badge) return null;
                            const { icon: Icon, title } = badge;
                            return (
                                <motion.div
                                    key={`${badgeKey}-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.1 }}
                                    className="min-w-[90px] flex-shrink-0 flex flex-col items-center gap-2 group"
                                >
                                    {/* 3D Token Effect */}
                                    <div className="h-14 w-14 rounded-full bg-gradient-to-b from-amber-100 to-amber-300 dark:from-slate-700 dark:to-slate-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-[0_5px_15px_rgba(251,191,36,0.3)] dark:shadow-[0_5px_15px_rgba(0,0,0,0.5)] ring-2 ring-white dark:ring-slate-700 ring-opacity-50 group-hover:scale-110 transition-transform duration-300">
                                        <Icon className="h-7 w-7 drop-shadow-sm" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight text-center w-full line-clamp-1">{title}</span>
                                </motion.div>
                            );
                        })
                    ) : (
                         <div className="w-full text-center py-8 glass-panel rounded-[1.5rem] text-sm text-slate-400 font-medium">
                            Start your journey to earn badges!
                         </div>
                    )}
                </div>
            </div>

            {/* --- 3. Class Cards Grid (Wider Layout) --- */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 px-2 flex items-center gap-2">
                    <RectangleGroupIcon className="h-5 w-5 text-slate-400" /> My Classes
                </h2>
                
                {(!myClasses || myClasses.length === 0) ? (
                    <EmptyState icon={InboxIcon} title="No Classes" message="Join a class to get started." />
                ) : (
                    // EXPANDED GRID to XL-4 columns
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                        {myClasses.map((classItem, idx) => {
                            const isLive = classItem.videoConference?.isLive || false;
                            const meetLink = classItem.meetLink || null;
                            const canJoin = isLive && meetLink;
                            
                            const theme = getClassTheme(classItem.subject);
                            const teacherName = getTeacherName(classItem);

                            return (
                                <motion.div
                                    key={classItem.id || idx}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`relative group w-full h-full rounded-[2rem] overflow-hidden backdrop-blur-2xl transition-all duration-500 shadow-lg hover:shadow-2xl ${theme.gradient} ring-1 ring-white/60 dark:ring-white/10 border ${theme.border} border-opacity-40`}
                                >
                                    <div className="relative z-10 p-5 flex flex-col h-full justify-between">
                                        
                                        {/* Header */}
                                        <div className="flex justify-between items-center mb-4 gap-2">
                                            <div className={`flex-1 min-w-0 px-3 py-1.5 rounded-full bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/30 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider ${theme.accent} flex items-center gap-2 shadow-sm`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} flex-shrink-0`}></span>
                                                <UserIcon className="w-3 h-3 opacity-70 flex-shrink-0" />
                                                <span className="truncate">{teacherName}</span>
                                            </div>

                                            {canJoin ? (
                                                <div className="px-3 py-1.5 rounded-full bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-500/30 backdrop-blur-sm animate-pulse flex-shrink-0">
                                                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                                    LIVE
                                                </div>
                                            ) : (
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-60 px-1 flex-shrink-0">
                                                    Offline
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <button 
                                            onClick={() => setSelectedClass(classItem)}
                                            className="text-left focus:outline-none mb-5 group-hover:translate-x-1 transition-transform duration-300"
                                        >
                                            <h3 className={`text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1 line-clamp-2 tracking-tight`}>
                                                {classItem.name}
                                            </h3>
                                        </button>

                                        {/* Footer Actions */}
                                        <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100/50 dark:border-white/5">
                                            <button 
                                                onClick={() => setSelectedClass(classItem)}
                                                className="flex-1 py-2.5 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold backdrop-blur-md transition-all border border-white/40 dark:border-white/10 hover:scale-[1.02]"
                                            >
                                                View Class
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    if (canJoin) window.open(meetLink, '_blank');
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                disabled={!canJoin}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-md border border-transparent transition-all hover:scale-[1.02]
                                                    ${canJoin
                                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600' 
                                                        : 'bg-slate-100/40 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                                    }`}
                                            >
                                                <VideoCameraIcon className="h-3.5 w-3.5" />
                                                {canJoin ? 'Join Now' : 'Join'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};


const StudentDashboardUI = ({
    userProfile, logout, view, isSidebarOpen, setIsSidebarOpen, handleViewChange,
    setJoinClassModalOpen, selectedClass, setSelectedClass, myClasses,
    isFetching,
    lessons, units, setLessonToView, quizzes,
    handleTakeQuizClick, fetchContent,
    hasNewLessons, 
    hasNewQuizzes,
    isLoungeLoading, loungePosts, loungeUsersMap, fetchLoungePosts, loungePostUtils,
    upNextTask 
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const profileMenuRef = useRef(null);
    const themeMenuRef = useRef(null);
    
    const { isSessionConflictModalOpen, sessionConflictMessage, setIsSessionConflictModalOpen, performLogout } = useAuth();
	const { showToast } = useToast(); 

    useEffect(() => {
        if (selectedClass && view !== 'classes') {
            setSelectedClass(null);
        }
    }, [view, selectedClass, setSelectedClass]);

    const sidebarNavItems = [
        { view: 'classes', text: 'Home', icon: HomeIcon }, 
        { view: 'lounge', text: 'Lounge', icon: RocketLaunchIcon }, 
        { view: 'lessons', text: 'Lessons', icon: BookOpenIcon },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardDocumentCheckIcon },
        { view: 'rewards', text: 'Rewards', icon: GiftIcon },
        { view: 'profile', text: 'Profile', icon: UserIcon }
    ];
    
    const desktopSidebarNavItems = [...sidebarNavItems];

    const hasUnclaimedRewards = useMemo(() => {
        const unlocked = userProfile?.unlockedRewards || [];
        const claimed = userProfile?.claimedRewards || [];
        return unlocked.some(rewardId => !claimed.includes(rewardId));
    }, [userProfile]);

    // Click Outside Handler for Menus
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
            if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
                setIsThemeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Manual Theme Toggle Logic
    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        setIsThemeMenuOpen(false);
    };

    const handleProfileClick = () => {
        handleViewChange('profile');
        setIsProfileMenuOpen(false);
    };

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
        setIsProfileMenuOpen(false);
    };

    const renderView = () => {
        if (selectedClass) {
            return (
                <div className="p-4 sm:p-6 lg:p-8 pb-32 max-w-[1920px] mx-auto w-full animate-fade-in-up">
                    <StudentClassDetailView 
                        selectedClass={selectedClass} 
                        onBack={() => setSelectedClass(null)} 
                        setLessonToView={setLessonToView}
                        lessons={lessons}
                        units={units}
                        onContentUpdate={fetchContent}
                    />
                </div>
            );
        }
        const allQuizzesEmpty = (quizzes?.active?.length || 0) === 0 && (quizzes?.completed?.length || 0) === 0 && (quizzes?.overdue?.length || 0) === 0;
        const allLessonsEmpty = (lessons?.length || 0) === 0;

        switch (view) {
            case 'classes':
            case 'default':
                return (
                  <DashboardHome
                    userProfile={userProfile}
                    myClasses={myClasses}
                    setSelectedClass={setSelectedClass}
                    handleViewChange={handleViewChange}
                    upNextTask={upNextTask} 
                  />
                );
            case 'lounge':
                return (
                    <div className="max-w-7xl mx-auto pb-24 w-full">
                        <LoungeView 
                            isPostsLoading={isLoungeLoading}
                            publicPosts={loungePosts}
                            usersMap={loungeUsersMap}
                            fetchPublicPosts={fetchLoungePosts}
                            {...loungePostUtils}
                        />
                    </div>
                );
            case 'lessons':
                return (
                  <div className="relative p-4 sm:p-6 lg:p-8 pb-32 max-w-[1920px] mx-auto w-full">
                    {allLessonsEmpty && !isFetching ? (
                      <EmptyState icon={BookOpenIcon} title="No Lessons Found" message="Your teacher hasn't posted any lessons yet. Check back soon!" actionText={isFetching ? "Checking..." : "Check for New Lessons"} onActionClick={fetchContent} />
                    ) : (
                      <StudentLessonsTab lessons={lessons} units={units} setLessonToView={setLessonToView} isFetchingContent={isFetching} onRefreshLessons={fetchContent} />
                    )}
                  </div>
                );
            case 'quizzes':
                return (
                    <div className="p-4 sm:p-6 lg:p-8 pb-32 max-w-[1920px] mx-auto w-full">
                        {allQuizzesEmpty && !isFetching ? (
                            <EmptyState icon={ClipboardDocumentCheckIcon} title="No Quizzes Found" message="You have no active or completed quizzes at the moment." />
                        ) : (
                            <StudentQuizzesTab quizzes={quizzes} units={units} handleTakeQuizClick={handleTakeQuizClick} isFetchingContent={isFetching} userProfile={userProfile} />
                        )}
                    </div>
                );
            case 'rewards':
                return (
                    <div className="p-4 sm:p-6 lg:p-8 pb-32 max-w-[1920px] mx-auto w-full">
                        <RewardsPage />
                    </div>
                );
            case 'profile':
                return (
                    <div className="max-w-[1920px] mx-auto pb-24 w-full">
                        <StudentProfilePage />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        // MODIFIED: h-screen and overflow-hidden on root to lock window scroll
        <div className="h-screen w-full font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/30 overflow-hidden flex flex-col">
            {/* INJECT STYLES */}
            <style>{scrollbarStyles}</style>

            {/* --- Mesh Gradient Background --- */}
            <div className="fixed inset-0 z-0 mesh-bg pointer-events-none opacity-60 dark:opacity-30"></div>

            {/* --- UNIFIED HEADER (NOW RELATIVE FLEX ITEM) --- */}
            {/* MODIFIED: Removed 'fixed' and 'absolute'. Added 'flex-none z-50 relative'. */}
            <header className="flex-none z-50 relative px-4 pt-2 pb-2 transition-all duration-300">
                <div className="glass-panel mx-auto max-w-[1920px] rounded-[1.5rem] px-4 py-2.5 shadow-lg flex items-center justify-between relative">
                    
                    {/* 1. LEFT: Logo & Brand (ALWAYS VISIBLE) */}
                    <div className="flex items-center gap-3 flex-shrink-0 z-20">
                        <div className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-white/10 shadow-md flex items-center justify-center flex-shrink-0">
                            <img src="/logo.png" alt="SRCS" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="font-extrabold text-xl text-slate-800 dark:text-slate-100 tracking-tight block">SRCS</span>
                    </div>

                    {/* 2. CENTER: Desktop Navigation (Hidden on Mobile) */}
                    <nav className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-10">
                        <div className="flex items-center gap-1 p-1.5 bg-slate-100/80 dark:bg-black/40 backdrop-blur-xl rounded-full border border-white/40 dark:border-white/5 shadow-inner">
                            {desktopSidebarNavItems.map((item) => {
                                const isActive = item.view === 'classes' ? (view === 'classes' || view === 'default') : view === item.view;
                                const showDot = (item.view === 'lessons' && hasNewLessons) || (item.view === 'quizzes' && hasNewQuizzes) || (item.view === 'rewards' && hasUnclaimedRewards);

                                return (
                                    <button
                                        key={item.view}
                                        onClick={() => handleViewChange(item.view)}
                                        className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 ease-out
                                            ${isActive 
                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon className={`h-4 w-4 ${isActive ? 'text-blue-500' : ''}`} />
                                        <span className="text-xs font-bold">{item.text}</span>
                                        
                                        {/* Status Dot */}
                                        {showDot && (
                                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* 3. RIGHT: Actions (Theme, Join, Profile) */}
                    <div className="flex items-center gap-2 sm:gap-3 z-20">
                        
                        {/* Theme Toggle */}
                        <div ref={themeMenuRef} className="relative">
                            <button 
                                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                                className="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-300 border border-white/50 dark:border-white/10 shadow-sm"
                            >
                                {theme === 'dark' ? <MoonIcon className="h-5 w-5 text-blue-400" /> : <SunIcon className="h-5 w-5 text-orange-500" />}
                            </button>
                            <AnimatePresence>
                                {isThemeMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="absolute top-12 right-0 w-36 glass-panel rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col p-1.5 border border-white/50 dark:border-white/10"
                                    >
                                        <button onClick={() => toggleTheme('light')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-white/30 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"><SunIcon className="h-4 w-4" /> Light</button>
                                        <button onClick={() => toggleTheme('dark')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-white/30 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"><MoonIcon className="h-4 w-4" /> Dark</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <InstallPWA />
                        
                        <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/10 mx-1"></div>

                        {/* Join Class Button */}
                        <button 
                            onClick={() => setJoinClassModalOpen(true)} 
                            className="flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 py-1.5 px-3 sm:px-4 text-[10px] uppercase tracking-wide"
                        >
                            <PlusCircleIcon className="h-3.5 w-3.5 mr-1.5" /> 
                            <span className="hidden xs:inline">Join Class</span>
                            <span className="xs:hidden">Join</span>
                        </button>

                        {/* Profile Avatar */}
                        {userProfile && (
                            <div ref={profileMenuRef} className="relative">
                                <button className="w-9 h-9 relative rounded-full ring-2 ring-white dark:ring-slate-700 shadow-md overflow-hidden active:scale-95 transition-transform" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                                    <UserInitialsAvatar user={userProfile} size="full" borderType={userProfile?.selectedBorder || 'none'} effectsEnabled={userProfile?.cosmeticsEnabled ?? true} className="w-full h-full text-[10px]" />
                                </button>
                                <AnimatePresence>
                                    {isProfileMenuOpen && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute right-0 mt-3 w-56 glass-panel rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                                        >
                                            <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 mb-1">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{userProfile.firstName} {userProfile.lastName}</p>
                                                <p className="text-[10px] text-slate-500">{userProfile.email}</p>
                                            </div>
                                            <button onClick={handleProfileClick} className="w-full text-left px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-xs font-bold flex items-center gap-3"> <UserIcon className="h-4 w-4" /> My Profile </button>
                                            <button onClick={handleLogoutClick} className="w-full text-left px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold flex items-center gap-3"> <PowerIcon className="h-4 w-4" /> Sign Out </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* --- Main Content (App Shell Scroll Model) --- */}
            {/* MODIFIED: Removed pt-24. Added flex-1 and relative overflow-hidden */}
            <main className="flex-1 relative z-0 w-full flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                    {isFetching ? (
                        <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full overflow-y-auto app-scroll-container">
                            <DashboardSkeleton />
                        </motion.div>
                    ) : (
                        /* MODIFIED: The motion.div is now the scroll container. overflow-y-auto added here. */
                        <motion.div
                            key={view + (selectedClass ? '-detail' : '')}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }}    
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}  
                            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                            className="w-full h-full flex flex-col overflow-y-auto app-scroll-container scroll-smooth"
                        >
                            {renderView()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* --- Mobile Bottom Dock (Visible ONLY on Mobile/Tablet) --- */}
            {/* MODIFIED: Changed z-index to 40 to ensure it sits above the scroll container but below modals */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 lg:hidden pointer-events-none">
                <motion.div layout className="macos-dock pointer-events-auto px-2 py-2 rounded-full flex items-center justify-between w-[90%] max-w-sm sm:gap-3">
                    {sidebarNavItems.map(item => { 
                         const isActive = item.view === 'classes' ? (view === 'classes' || view === 'default') : view === item.view;
                         const showLessonDot = item.view === 'lessons' && hasNewLessons;
                         const showQuizDot = item.view === 'quizzes' && hasNewQuizzes;
                         const showRewardDot = item.view === 'rewards' && hasUnclaimedRewards;

                        return (
                            <motion.button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                layout
                                className={`relative group flex items-center justify-center gap-2 p-2 rounded-full transition-colors outline-none flex-1
                                    ${isActive 
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400' 
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/10'}`}
                            >
                                <motion.div className="relative" whileHover={{ y: -5, scale: 1.2 }} transition={{ type: "spring", stiffness: 300 }}>
                                    <item.icon className={`h-6 w-6 ${isActive ? 'scale-105' : 'opacity-80'}`} />
                                    {(showLessonDot || showQuizDot || showRewardDot) && (
                                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm z-10 animate-bounce"></span>
                                    )}
                                </motion.div>
                                {isActive && (
                                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="text-[10px] font-bold tracking-wide whitespace-nowrap overflow-hidden">
                                        {item.text}
                                    </motion.span>
                                )}
                            </motion.button>
                        )
                    })}
                </motion.div>
            </div>

            {/* --- Logout Modal --- */}
            <AnimatePresence>
                {isLogoutModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-panel rounded-[2rem] p-8 w-72 text-center shadow-2xl"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mx-auto mb-3 flex items-center justify-center shadow-inner">
                                <PowerIcon className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Sign Out</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">Are you sure you want to end your session?</p>
                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={() => {
                                        setIsLogoutModalOpen(false);
                                        logout();
                                    }}
                                    className="w-full py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all active:scale-95 text-xs"
                                >
                                    Yes, Log Out
                                </button>
                                <button
                                    onClick={() => setIsLogoutModalOpen(false)}
                                    className="w-full py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SessionConflictModal isOpen={isSessionConflictModalOpen} message={sessionConflictMessage} onClose={performLogout} />
        </div>
    );
};

export default StudentDashboardUI;