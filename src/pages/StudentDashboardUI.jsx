// src/pages/StudentDashboardUI.jsx
import React, { useState, useRef, useEffect, useMemo, Fragment, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Transition, Dialog } from '@headlessui/react';
import {
    ClipboardDocumentCheckIcon,
    UserIcon,
    PowerIcon,
    BookOpenIcon,
    GiftIcon,
    InboxIcon,
    RocketLaunchIcon, 
    TrophyIcon,
    StarIcon,
    SparklesIcon,
    VideoCameraIcon,
    FireIcon,
    PlusCircleIcon,
    HomeIcon, 
    RectangleGroupIcon,
	HandRaisedIcon,
    AcademicCapIcon
} from '@heroicons/react/24/solid';
import { IconPalette } from '@tabler/icons-react';
import { ShieldCheck, Share2, CheckCircle2, Check } from 'lucide-react';

// Sub-Pages & Components
import StudentProfilePage from './StudentProfilePage';
import RewardsPage from '../components/student/RewardsPage';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import StudentLessonsTab from '../components/student/StudentLessonsTab';
import LoungeView from '../components/student/LoungeView';

// Common Components
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import SessionConflictModal from '../components/common/SessionConflictModal';
import InstallPWA from '../components/common/InstallPWA';
import UniversalBackground from '../components/common/UniversalBackground';
import ThemeToggle from '../components/common/ThemeToggle';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import StudentElectionTab from '../components/student/StudentElectionTab';

// --- CONSTANTS ---
const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS', logo: '/logo.png' },
    'hras_sipalay': { name: 'HRA', logo: '/logos/hra.png' },
    'kcc_kabankalan': { name: 'KCC', logo: '/logos/kcc.png' },
    'icad_dancalan': { name: 'ICA', logo: '/logos/ica.png' },
    'mchs_magballo': { name: 'MCHS', logo: '/logos/mchs.png' },
    'ichs_ilog': { name: 'ICHS', logo: '/logos/ichs.png' }
};

const SCHOOL_NAMES = {
    'srcs_main': 'San Ramon Catholic School',
    'hras_sipalay': 'Holy Rosary Academy',
    'kcc_kabankalan': 'Kabankalan Catholic College',
    'icad_dancalan': 'Immaculate Conception Academy',
    'mchs_magballo': 'Magballo Catholic High School',
    'ichs_ilog': 'Ilog Catholic High School'
};

const BADGE_MAP = {
  'first_quiz': { icon: RocketLaunchIcon, title: 'First Quiz' },
  'perfect_score': { icon: TrophyIcon, title: 'Perfect Score' },
  'badge_scholar': { icon: AcademicCapIcon, title: 'Scholar' },
  'badge_master': { icon: StarIcon, title: 'Master' },
  'badge_legend': { icon: SparklesIcon, title: 'Legend' },
};

const QUOTES = [
    "Small steps add up.", "Every challenge helps you grow.",
    "Effort shapes tomorrow.", "Progress, not perfection.",
    "Keep learning.", "Create your future.",
    "Dream big. Work hard.", "Slow progress is progress.",
];

const INSPIRATIONAL_PHRASES = [
    "Ready to shape your future?",
    "Unlock your potential today.",
    "Let's turn curiosity into knowledge.",
    "Your journey continues here.",
    "Make today a masterpiece."
];

// --- UTILITIES ---
const getSchoolBranding = (schoolId) => SCHOOL_BRANDING[schoolId] || SCHOOL_BRANDING['srcs_main'];
const getFullSchoolName = (schoolId) => SCHOOL_NAMES[schoolId] || 'Your School';

const getClassTheme = (subject) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('math') || s.includes('algebra')) return { accent: 'text-blue-500', dot: 'bg-blue-500', gradient: 'from-blue-500/10 to-blue-600/10', border: 'border-blue-200 dark:border-blue-800' };
    if (s.includes('science') || s.includes('bio')) return { accent: 'text-emerald-500', dot: 'bg-emerald-500', gradient: 'from-emerald-500/10 to-emerald-600/10', border: 'border-emerald-200 dark:border-emerald-800' };
    if (s.includes('history')) return { accent: 'text-orange-500', dot: 'bg-orange-500', gradient: 'from-orange-500/10 to-orange-600/10', border: 'border-orange-200 dark:border-orange-800' };
    if (s.includes('english')) return { accent: 'text-violet-500', dot: 'bg-violet-500', gradient: 'from-violet-500/10 to-violet-600/10', border: 'border-violet-200 dark:border-violet-800' };
    if (s.includes('art')) return { accent: 'text-pink-500', dot: 'bg-pink-500', gradient: 'from-pink-500/10 to-pink-600/10', border: 'border-pink-200 dark:border-pink-800' };
    return { accent: 'text-slate-500', dot: 'bg-slate-500', gradient: 'from-slate-500/10 to-slate-600/10', border: 'border-slate-200 dark:border-slate-700' };
};

const getMonetStyle = (activeOverlay) => {
    switch(activeOverlay) {
        case 'christmas': return { accent: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' };
        case 'valentines': return { accent: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' };
        case 'graduation': return { accent: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' };
        case 'rainy': return { accent: 'text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
        case 'cyberpunk': return { accent: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20' };
        default: return { accent: 'text-blue-500', bg: 'bg-white dark:bg-slate-800' };
    }
};

const scrollbarStyles = `
  ::-webkit-scrollbar { width: 0px; height: 0px; }
  .app-scroll-container::-webkit-scrollbar { width: 6px; height: 6px; }
  .app-scroll-container::-webkit-scrollbar-track { background: transparent; }
  .app-scroll-container::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 100px; }
  .dark .app-scroll-container::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); }
`;

// --- ANIMATION VARIANTS ---
const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

// --- ONEUI CARD ---
const OneUICard = memo(({ children, className = "", onClick }) => (
    <motion.div 
        variants={itemVariants}
        onClick={onClick}
        whileTap={onClick ? { scale: 0.97 } : {}}
        className={`
            relative overflow-hidden
            bg-white dark:bg-slate-900 
            border border-slate-100 dark:border-slate-800
            shadow-sm hover:shadow-lg dark:shadow-none
            transition-all duration-300
            rounded-[2.2rem]
            ${onClick ? 'cursor-pointer touch-manipulation' : ''}
            ${className}
        `}
    >
        {children}
    </motion.div>
));
OneUICard.displayName = 'OneUICard';

// --- SUB-COMPONENTS ---

const DailyQuote = memo(() => {
  const [quote, setQuote] = useState("");
  useEffect(() => {
      const index = new Date().getDate() % QUOTES.length;
      setQuote(QUOTES[index]);
  }, []);
  
  return (
    <motion.div
      key={quote} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold italic opacity-80"
    > “{quote}” </motion.div>
  );
});

const ThemeDropdown = memo(({ size = 'desktop' }) => {
  const buttonSize = size === 'desktop' ? 'w-12 h-12' : 'w-10 h-10';
  const iconSize = size === 'desktop' ? 22 : 18;

  return (
    <Menu as="div" className="relative z-50 flex-shrink-0">
      <Menu.Button className={`flex items-center justify-center ${buttonSize} rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-transform active:scale-90 text-slate-600 dark:text-slate-300`}>
        <IconPalette size={iconSize} stroke={1.5} />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-150" leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-95 translate-y-2"
      >
        <Menu.Items className="absolute right-0 mt-3 w-72 origin-top-right focus:outline-none z-[60]">
           <div className="relative"><ThemeToggle /></div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
});

const EmptyState = memo(({ icon: Icon, title, message, actionText, onActionClick }) => (
    <OneUICard className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
        <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
             <Icon className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 max-w-[250px] mx-auto mb-6 leading-relaxed">{message}</p>
        {onActionClick && (
            <button onClick={onActionClick} className="px-6 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-lg active:scale-95 transition-transform">
                {actionText}
            </button>
        )}
    </OneUICard>
));

const DashboardSkeleton = () => (
    <div className="space-y-6 p-4 animate-pulse max-w-[1920px] mx-auto">
        <div className="h-56 w-full bg-slate-200 dark:bg-slate-800 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-44 w-full bg-slate-200 dark:bg-slate-800 rounded-[2.2rem]"></div>)}
        </div>
    </div>
);

// --- DASHBOARD HOME VIEW ---
const DashboardHome = memo(({ userProfile, myClasses, setSelectedClass, handleViewChange, monetStyle }) => {
    
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const inspirationalPhrase = useMemo(() => {
        const index = new Date().getDate() % INSPIRATIONAL_PHRASES.length;
        return INSPIRATIONAL_PHRASES[index];
    }, []);

    const genericBadges = useMemo(() => 
        (userProfile?.genericBadges || []).slice(-3).reverse(), 
    [userProfile?.genericBadges]);

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6 px-4 sm:px-6 pb-36 max-w-[1920px] mx-auto w-full pt-4"
        >
            {/* 1. HERO SECTION */}
            <OneUICard className="p-6 sm:p-8 min-h-[220px] flex flex-col justify-between group">
                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none`}></div>
                
                <div className="relative z-10">
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                        {greeting}, <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            {userProfile?.firstName}
                        </span>
                    </h1>
                    <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                        {inspirationalPhrase}
                    </p>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-4 mt-6">
                    <div className="px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                         <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-500">
                            <FireIcon className="w-3.5 h-3.5" />
                         </div>
                         <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {userProfile?.loginStreak || 0} Day Streak
                         </span>
                    </div>
                    <div className="hidden sm:block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                    <DailyQuote />
                </div>
            </OneUICard>

            {/* 2. ACHIEVEMENTS SECTION (Horizontal Scroll) */}
            <OneUICard className="p-6">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"> 
                        <StarIcon className="h-5 w-5 text-yellow-500" /> Achievements
                    </h2>
                    <button onClick={() => handleViewChange('profile')} className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        View All
                    </button>
                </div>
                
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {genericBadges.length > 0 ? (
                        genericBadges.map((badgeKey, idx) => {
                            const badge = BADGE_MAP[badgeKey];
                            if (!badge) return null;
                            const { icon: Icon, title } = badge;
                            return (
                                <div
                                    key={`${badgeKey}-${idx}`}
                                    className="flex-shrink-0 flex flex-col items-center gap-2 w-20 group cursor-pointer"
                                >
                                    <div className="h-16 w-16 rounded-[1.2rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-amber-500 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                                        <Icon className="h-8 w-8 drop-shadow-sm" />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 text-center line-clamp-1 w-full">{title}</span>
                                </div>
                            );
                        })
                    ) : (
                         <div className="w-full py-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[1.5rem]">
                            <p className="text-sm font-bold text-slate-400">No badges yet</p>
                            <p className="text-[10px] text-slate-300 dark:text-slate-500">Keep learning to unlock!</p>
                         </div>
                    )}
                </div>
            </OneUICard>

            {/* 3. CLASSES GRID (With Restored Buttons) */}
            <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 px-2 flex items-center gap-2">
                    My Classes
                </h2>
                
                {(!myClasses || myClasses.length === 0) ? (
                    <EmptyState icon={InboxIcon} title="No Classes" message="Join a class to get started." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {myClasses.map((classItem, idx) => {
                            const isLive = classItem.videoConference?.isLive || false;
                            const meetLink = classItem.meetLink || null;
                            const canJoin = isLive && meetLink;
                            const theme = getClassTheme(classItem.subject);
                            const teacherName = classItem.teacherName || classItem.teacher?.displayName || 'Teacher';

                            return (
                                <OneUICard
                                    key={classItem.id || idx}
                                    className={`group flex flex-col justify-between p-5 border-l-4 ${theme.border} bg-gradient-to-br ${theme.gradient}`}
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <span className="px-2.5 py-1 rounded-md bg-white/60 dark:bg-black/20 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 backdrop-blur-sm">
                                            {classItem.section || 'Class'}
                                        </span>
                                        {isLive && (
                                            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm animate-pulse">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">
                                            {classItem.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <UserIcon className="w-3.5 h-3.5" />
                                            {teacherName}
                                        </div>
                                    </div>

                                    {/* Footer Actions (Restored & Redesigned) */}
                                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                                        <button 
                                            onClick={() => setSelectedClass(classItem)} 
                                            className="flex-1 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (canJoin) window.open(meetLink, '_blank'); 
                                            }}
                                            disabled={!canJoin}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${canJoin ? 'bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600 active:scale-95' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-400 cursor-not-allowed'}`}
                                        >
                                            <VideoCameraIcon className="w-3.5 h-3.5" />
                                            {canJoin ? 'Join' : 'Offline'}
                                        </button>
                                    </div>
                                </OneUICard>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
});


// --- MAIN STUDENT UI COMPONENT ---
const StudentDashboardUI = ({
    userProfile, logout, view, isSidebarOpen, setIsSidebarOpen, handleViewChange,
    setJoinClassModalOpen, selectedClass, setSelectedClass, myClasses,
    isFetching, lessons, units, setLessonToView, quizzes,
    handleTakeQuizClick, fetchContent, hasNewLessons, hasNewQuizzes,
    isLoungeLoading, loungePosts, loungeUsersMap, fetchLoungePosts, loungePostUtils,
    upNextTask 
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const profileMenuRef = useRef(null);
    const { isSessionConflictModalOpen, sessionConflictMessage, performLogout } = useAuth();
    
    // Ensure Branding Fallback
    const branding = useMemo(() => {
        const schoolId = userProfile?.schoolId || 'srcs_main';
        return SCHOOL_BRANDING[schoolId] || SCHOOL_BRANDING['srcs_main'];
    }, [userProfile?.schoolId]);

    const { activeOverlay } = useTheme();
    const monetStyle = useMemo(() => getMonetStyle(activeOverlay), [activeOverlay]);

    // Welcome Modal Logic
    useEffect(() => {
        if (userProfile?.id) {
            const hasOptedOut = localStorage.getItem(`welcome_opt_out_${userProfile.id}`);
            const hasSeenSession = sessionStorage.getItem(`welcome_seen_session_${userProfile.id}`);
            if (!hasOptedOut && !hasSeenSession) {
                setIsWelcomeModalOpen(true);
            }
        }
    }, [userProfile?.id]);

    const handleCloseWelcome = useCallback(() => {
        if (userProfile?.id) {
            sessionStorage.setItem(`welcome_seen_session_${userProfile.id}`, 'true');
            if (dontShowAgain) {
                localStorage.setItem(`welcome_opt_out_${userProfile.id}`, 'true');
            }
        }
        setIsWelcomeModalOpen(false);
    }, [userProfile?.id, dontShowAgain]);

    useEffect(() => {
        if (selectedClass && view !== 'classes') setSelectedClass(null);
    }, [view, selectedClass, setSelectedClass]);

    // Click Outside Profile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const renderView = useCallback(() => {
        if (selectedClass) {
            return (
                <div className="pb-32 w-full animate-fade-in-up px-4 sm:px-6 pt-4">
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
                return <DashboardHome userProfile={userProfile} myClasses={myClasses} setSelectedClass={setSelectedClass} handleViewChange={handleViewChange} monetStyle={monetStyle} />;
            case 'lounge':
                return <LoungeView isPostsLoading={isLoungeLoading} publicPosts={loungePosts} usersMap={loungeUsersMap} fetchPublicPosts={fetchLoungePosts} {...loungePostUtils} />;
            case 'lessons':
                return <div className="relative pt-4">{allLessonsEmpty && !isFetching ? <EmptyState icon={BookOpenIcon} title="No Lessons" message="Check back soon!" actionText="Refresh" onActionClick={fetchContent} /> : <StudentLessonsTab lessons={lessons} units={units} setLessonToView={setLessonToView} isFetchingContent={isFetching} onRefreshLessons={fetchContent} />}</div>;
			case 'elections':
			                return <div className="pt-4"><StudentElectionTab /></div>;
            case 'quizzes':
                return <div className="pt-4">{allQuizzesEmpty && !isFetching ? <EmptyState icon={ClipboardDocumentCheckIcon} title="No Quizzes" message="You're all caught up." /> : <StudentQuizzesTab quizzes={quizzes} units={units} handleTakeQuizClick={handleTakeQuizClick} isFetchingContent={isFetching} userProfile={userProfile} onRefresh={fetchContent} />}</div>;
            case 'rewards':
                return <div className="pt-4"><RewardsPage /></div>;
            case 'profile':
                return <div className="pt-4"><StudentProfilePage /></div>;
            default:
                return null;
        }
    }, [selectedClass, view, userProfile, myClasses, monetStyle, isLoungeLoading, loungePosts, loungeUsersMap, fetchLoungePosts, loungePostUtils, lessons, units, isFetching, fetchContent, quizzes, handleTakeQuizClick, setSelectedClass, handleViewChange, setLessonToView]);

    const sidebarNavItems = useMemo(() => [
        { view: 'classes', text: 'Home', icon: HomeIcon }, 
        { view: 'lounge', text: 'Lounge', icon: RocketLaunchIcon }, 
        { view: 'lessons', text: 'Lessons', icon: BookOpenIcon },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardDocumentCheckIcon },
		{ view: 'elections', text: 'Elections', icon: HandRaisedIcon },
        { view: 'rewards', text: 'Rewards', icon: GiftIcon },
        { view: 'profile', text: 'Profile', icon: UserIcon }
    ], []);

    const hasUnclaimedRewards = useMemo(() => {
        const unlocked = userProfile?.unlockedRewards || [];
        const claimed = userProfile?.claimedRewards || [];
        return unlocked.some(rewardId => !claimed.includes(rewardId));
    }, [userProfile?.unlockedRewards, userProfile?.claimedRewards]);

    return (
        <div className="h-screen w-full font-sans bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col transition-colors duration-500">
            <style>{scrollbarStyles}</style>
            
            <UniversalBackground />

            {/* HEADER: Floating Island */}
            <header className="flex-none z-50 relative px-4 pt-4 pb-2">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl mx-auto max-w-[1920px] rounded-[2rem] px-5 py-3 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    
                    {/* Brand - Restored Prominence */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1.5 shadow-sm">
                            <img src={branding.logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <span className="font-black text-lg tracking-tight block leading-none text-slate-900 dark:text-white">
                                {branding.name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Student Portal
                            </span>
                        </div>
                    </div>

                    {/* Desktop Nav (Pills) */}
                    <nav className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
                        <div className="flex items-center gap-1 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-slate-200/50 dark:border-slate-700/50">
                            {sidebarNavItems.map((item) => {
                                const isActive = item.view === 'classes' ? (view === 'classes' || view === 'default') : view === item.view;
                                const showDot = (item.view === 'lessons' && hasNewLessons) || (item.view === 'quizzes' && hasNewQuizzes) || (item.view === 'rewards' && hasUnclaimedRewards);

                                return (
                                    <button
                                        key={item.view}
                                        onClick={() => handleViewChange(item.view)}
                                        className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 ease-out
                                            ${isActive 
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' 
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span className="text-xs font-bold">{item.text}</span>
                                        {showDot && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3">
                        <ThemeDropdown size="mobile" />
                        <InstallPWA />
                        
                        {/* Join Button */}
                        <button 
                            onClick={() => setJoinClassModalOpen(true)} 
                            className="hidden sm:flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full py-2.5 px-5 text-xs shadow-lg active:scale-95 transition-transform"
                        >
                            <PlusCircleIcon className="h-4 w-4" /> 
                            <span>Join Class</span>
                        </button>

                        {/* Profile Toggle */}
                        {userProfile && (
                            <div ref={profileMenuRef} className="relative">
                                <button className="w-11 h-11 relative rounded-full ring-2 ring-white dark:ring-slate-800 shadow-md active:scale-95 transition-transform" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                                    <UserInitialsAvatar user={userProfile} size="full" borderType={userProfile?.selectedBorder} effectsEnabled={userProfile?.cosmeticsEnabled} className="w-full h-full text-[10px]" />
                                </button>
                                <AnimatePresence>
                                    {isProfileMenuOpen && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute right-0 mt-4 w-60 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-2 z-50 border border-slate-100 dark:border-slate-800 origin-top-right"
                                        >
                                            <div className="px-4 py-3 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem]">
                                                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{userProfile.firstName} {userProfile.lastName}</p>
                                                <p className="text-[10px] font-medium text-slate-500 truncate">{userProfile.email}</p>
                                            </div>
                                            <button onClick={() => { handleViewChange('profile'); setIsProfileMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-[1.2rem] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold flex items-center gap-3"> <UserIcon className="h-4 w-4" /> My Profile </button>
                                            <button onClick={() => setIsLogoutModalOpen(true)} className="w-full text-left px-4 py-3 rounded-[1.2rem] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold flex items-center gap-3"> <PowerIcon className="h-4 w-4" /> Sign Out </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* SCROLLABLE CONTENT */}
            <main className="flex-1 relative z-0 w-full flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                    {isFetching ? (
                        <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full overflow-y-auto app-scroll-container">
                            <DashboardSkeleton />
                        </motion.div>
                    ) : (
                        <motion.div
                            key={view + (selectedClass ? '-detail' : '')}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }}    
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}  
                            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }} // Elegant ease
                            className="w-full h-full flex flex-col overflow-y-auto app-scroll-container scroll-smooth"
                        >
                            {renderView()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* MOBILE DOCK (Floating Island) */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 lg:hidden pointer-events-none">
                <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-slate-800 shadow-2xl rounded-full px-2 py-2 flex items-center gap-1 max-w-[95%] sm:max-w-md">
                    {sidebarNavItems.map(item => { 
                         const isActive = item.view === 'classes' ? (view === 'classes' || view === 'default') : view === item.view;
                         const showDot = (item.view === 'lessons' && hasNewLessons) || (item.view === 'quizzes' && hasNewQuizzes) || (item.view === 'rewards' && hasUnclaimedRewards);

                        return (
                            <button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                className={`relative p-3 rounded-full transition-all duration-300 active:scale-90
                                    ${isActive 
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <item.icon className="h-6 w-6" />
                                {showDot && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* LOGOUT MODAL */}
            <AnimatePresence>
                {isLogoutModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center border border-slate-100 dark:border-slate-800"
                        >
                            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 mx-auto mb-4 flex items-center justify-center">
                                <PowerIcon className="h-7 w-7" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Sign Out</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to end your session?</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => { setIsLogoutModalOpen(false); logout(); }} className="w-full py-3.5 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-sm shadow-lg shadow-red-500/20">Yes, Log Out</button>
                                <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-sm">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* WELCOME MODAL */}
            <Transition appear show={isWelcomeModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => {}}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                        leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-md" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300" enterFrom="opacity-0 scale-95 translate-y-8" enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-95 translate-y-8"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2.8rem] bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border border-white/20 relative">
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 mb-6 p-4">
                                        <img src={branding.logo} alt="School Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <Dialog.Title as="h3" className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">
                                        Welcome back,<br/><span className="text-blue-600 dark:text-blue-400">{userProfile?.firstName}!</span>
                                    </Dialog.Title>
                                    <div className="mt-2 text-center mb-8">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{getFullSchoolName(userProfile?.schoolId)}</p>
                                    </div>
                                    
                                    <div className="mt-8">
                                        <div className="flex items-center justify-center gap-2.5 mb-5 cursor-pointer group" onClick={() => setDontShowAgain(!dontShowAgain)}>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${dontShowAgain ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-slate-300'}`}>
                                                <Check className={`w-3.5 h-3.5 text-white transition-opacity ${dontShowAgain ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 select-none">Don't show this again</span>
                                        </div>
                                        <button type="button" className="w-full inline-flex justify-center items-center gap-2 rounded-[1.5rem] bg-slate-900 dark:bg-white px-4 py-4 text-sm font-bold text-white dark:text-slate-900 active:scale-95 transition-transform" onClick={handleCloseWelcome}>
                                            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
                                            Continue
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <SessionConflictModal isOpen={isSessionConflictModalOpen} message={sessionConflictMessage} onClose={performLogout} />
        </div>
    );
};

export default React.memo(StudentDashboardUI);