// src/pages/StudentDashboardUI.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardDocumentCheckIcon,
    UserIcon,
    PlusCircleIcon,
    PowerIcon,
    BookOpenIcon,
    Squares2X2Icon,
    GiftIcon,
    ClockIcon,
    PresentationChartLineIcon,
    AcademicCapIcon,
    InboxIcon,
    ChevronRightIcon,
RocketLaunchIcon,
    TrophyIcon,
    StarIcon,
    SparklesIcon
} from '@heroicons/react/24/solid';
import StudentProfilePage from './StudentProfilePage';
import RewardsPage from '../components/student/RewardsPage';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import StudentLessonsTab from '../components/student/StudentLessonsTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';
import SessionConflictModal from '../components/common/SessionConflictModal';
import InstallPWA from '../components/common/InstallPWA';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';

// --- ADDED IMPORT ---
import ThemeToggle from '../components/common/ThemeToggle';
// --- END ADDED IMPORT ---

const BADGE_MAP = {
  'first_quiz': { icon: RocketLaunchIcon, title: 'First Quiz' },
  'perfect_score': { icon: TrophyIcon, title: 'Perfect Score' },
  'badge_scholar': { icon: AcademicCapIcon, title: 'Scholar' },
  'badge_master': { icon: StarIcon, title: 'Master' },
  'badge_legend': { icon: SparklesIcon, title: 'Legend' },
};

const XPProgressRing = ({ xp = 0, level = 1 }) => {
  const currentLevel = Math.max(1, level || 1);
  const currentXP = Math.max(0, xp || 0);
  const xpForCurrentLevel = ((currentLevel - 1) * currentLevel / 2) * 500;
  const xpForNextLevel = (currentLevel * (currentLevel + 1) / 2) * 500;
  const xpInThisLevel = Math.max(0, currentXP - xpForCurrentLevel);
  const xpNeededForThisLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
  const percent = Math.min(100, (xpInThisLevel / xpNeededForThisLevel) * 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-[90px] h-[90px] sm:w-[110px] sm:h-[110px]">
      <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        {/* --- MODIFIED: Themed circle color --- */}
        <circle cx="50" cy="50" r={radius} stroke="#E5E7EB" strokeWidth="6" fill="none" className="dark:stroke-slate-700" />
        <motion.circle
          cx="50" cy="50" r={radius} stroke="url(#xpGradient)" strokeWidth="6" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }}
          // --- MODIFIED: Added dark mode drop-shadow filter ---
          style={{ filter: "drop-shadow(0 0 3px rgba(96,165,250,0.6)) drop-shadow(0 0 5px rgba(37,99,235,0.4))" }}
        />
      </svg>
      {/* --- MODIFIED: Themed text --- */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center scale-[0.85] sm:scale-100">
        <span className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none">Lvl</span>
        <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent leading-none">{currentLevel}</span>
        <span className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 leading-none mt-0.5">{currentXP} XP</span>
      </div>
    </div>
  );
};

const DailyQuote = ({ compact = false }) => {
  const quotes = [
    "Small steps each day add up to big results.", "Every challenge is a chance to grow.",
    "Your effort today shapes your tomorrow.", "Progress, not perfection.",
    "Keep learning — your potential is endless.", "The best way to predict the future is to create it.",
    "Dream big. Work hard. Stay humble.", "Even slow progress is progress.",
    "Learning never exhausts the mind. — Leonardo da Vinci", "You are doing better than you think.",
    "Consistency compounds over time.", "Curiosity drives mastery.",
  ];
  const [quote, setQuote] = useState("");
  const today = new Date();
  const index = today.getDate() % quotes.length;
  useEffect(() => { setQuote(quotes[index]); }, [index]);
  return (
    <motion.div
      key={quote} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      // --- MODIFIED: Themed text ---
      className={`text-slate-600 dark:text-slate-300 ${compact ? "text-sm" : "text-base"} italic leading-snug`}
    > “{quote}” </motion.div>
  );
};

const SidebarContent = ({ sidebarNavItems, onLogoutClick, hasUnclaimedRewards }) => {
    return (
        <div className="h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-4 mb-12 px-2">
                    {/* --- MODIFIED: Themed logo container --- */}
                    <div className="w-14 h-14 rounded-2xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-center transition-transform duration-300 ease-out hover:scale-105">
                        <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-12 h-12 rounded-lg" loading="lazy" decoding="async" />
                    </div>
                    <div>
                        {/* --- MODIFIED: Themed text --- */}
                        <span className="font-extrabold text-xl text-slate-800 dark:text-slate-100">SRCS LMS</span>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Student Dashboard</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-2">
                    {sidebarNavItems.map(item => {
                        const showNotification = item.view === 'rewards' && hasUnclaimedRewards;
                        return (
                            <NavLink
                                key={item.view}
                                to={item.view === 'classes' ? '/student' : `/student/${item.view}`}
                                end={item.view === 'classes'}
                                className={({ isActive }) =>
                                    `relative flex items-center gap-4 px-4 py-3 rounded-xl text-md font-semibold transition-all duration-200 ease-in-out
                                    ${isActive
                                        ? 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400'
                                        : 'text-slate-600 dark:text-slate-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* --- MODIFIED: Themed icon colors --- */}
                                        <item.icon className={`h-6 w-6 ${isActive ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                        <span>{item.text}</span>
                                        {showNotification && (
                                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>
            </div>
            <div className="p-2">
                <button
                    onClick={onLogoutClick}
                    // --- MODIFIED: Themed button ---
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-all duration-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark group"
                >
                    <PowerIcon className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                    <span className="ml-1">Logout</span>
                </button>
            </div>
        </div>
    );
};

// --- FIX: Changed props from {text, subtext} to {title, message} ---
const EmptyState = ({ icon: Icon, title, message, actionText, onActionClick }) => (
    // --- MODIFIED: Themed EmptyState ---
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark max-w-lg mx-auto mt-10">
        <Icon className="h-16 w-16 text-slate-400 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6">{message}</p>
        {onActionClick && (
            <button onClick={onActionClick} className="flex items-center justify-center gap-2 bg-neumorphic-base dark:bg-neumorphic-base-dark text-red-600 dark:text-red-400 font-semibold border-none rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all duration-300 ease-in-out transform hover:scale-[1.03] py-2.5 px-4">
                {actionText}
            </button>
        )}
    </div>
);

const DashboardHome = ({ userProfile, myClasses, setSelectedClass, handleViewChange }) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };
    const computedLevelFallback = useMemo(() => {
        const xp = Math.max(0, userProfile?.xp || 0);
        const approx = Math.floor((Math.sqrt(1 + 8 * (xp / 500)) + 1) / 2);
        return Math.max(1, approx);
    }, [userProfile?.xp]);
    const currentLevel = userProfile?.level || computedLevelFallback;
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

    return (
        <div className="space-y-4">
            {/* --- MODIFIED: Themed Greeting Card --- */}
            <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark p-4 sm:p-6 flex flex-col gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate">{getGreeting()}, {userProfile?.firstName || 'Student'}!</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Keep going — you're doing great. Tap a class to continue learning.</p>
              </div>
              <div className="flex flex-row items-center justify-between sm:justify-between gap-2 sm:gap-6">
                <div className="flex-shrink-0 relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
                  <XPProgressRing xp={userProfile?.xp || 0} level={currentLevel} />
                </div>
                <div className="flex-1 text-right">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
                    // --- MODIFIED: Themed Quote Box ---
                    className="relative inline-block bg-neumorphic-base dark:bg-slate-700/50 border border-blue-200 dark:border-blue-700/50 shadow-[0_3px_8px_rgba(0,0,0,0.08)] rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-sm text-slate-700 dark:text-slate-200 italic font-medium max-w-[70%] sm:max-w-[240px] float-right backdrop-blur-sm"
                  > <span className="absolute -top-2 -left-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm"> ✨ </span> <DailyQuote compact /> </motion.div>
                </div>
              </div>
            </div>
            {/* --- MODIFIED: Themed Achievements Card --- */}
            <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-3 rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"> <AcademicCapIcon className="h-4 w-4 text-red-500 dark:text-red-400" /> Recent Achievements </h2>
                    <button onClick={() => handleViewChange('profile')} className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"> View all </button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 px-1">
			{genericBadges.length > 0 ? (
			                        genericBadges.map((badgeKey, idx) => {
			                            const badge = BADGE_MAP[badgeKey];
			                            // Fallback for any badges not in the map
			                            if (!badge) {
			                                return (
			                                     <motion.div
			                                        key={`${badgeKey}-${idx}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: idx * 0.06 }}
			                                        className="min-w-[120px] flex-shrink-0 bg-neumorphic-base dark:bg-neumorphic-base-dark p-3 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark"
			                                    >
			                                        <div className="flex items-center gap-3">
			                                            <div className="bg-slate-100 dark:bg-slate-700 h-12 w-12 rounded-lg flex items-center justify-center"> <span className="text-lg">⭐</span> </div>
			                                            <div className="min-w-0">
			                                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{badgeKey}</div>
			                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Unlocked</div>
			                                            </div>
			                                        </div>
			                                    </motion.div>
			                                );
			                            }
                            
			                            // Destructure the icon component and title
			                            const { icon: Icon, title } = badge;
			                            return (
			                                <motion.div
			                                    key={`${badgeKey}-${idx}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: idx * 0.06 }}
			                                    className="min-w-[120px] flex-shrink-0 bg-neumorphic-base dark:bg-neumorphic-base-dark p-3 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
			                                    title={title}
			                                >
			                                    <div className="flex items-center gap-3">
			                                        {/* This is the updated part */}
			                                        <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
			                                            <Icon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
			                                        </div>
			                                        {/* This part is the same */}
			                                        <div className="min-w-0">
			                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</div>
			                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Unlocked</div>
			                                        </div>
			                                    </div>
			                                </motion.div>
			                            );
			                        })
                    ) : (
                        <div className="min-w-[160px] flex-shrink-0 bg-neumorphic-base dark:bg-neumorphic-base-dark p-3 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center"> <AcademicCapIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" /> </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">No achievements yet</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Start learning to unlock badges</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* --- MODIFIED: Themed My Classes Card --- */}
            <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-3 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"> <Squares2X2Icon className="h-5 w-5 text-slate-700 dark:text-slate-300" /> My Classes </h2>
                     <AcademicCapIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 hidden sm:block" />
                </div>
                {(!myClasses || myClasses.length === 0) ? (
                    <EmptyState icon={InboxIcon} title="No Classes Yet" message="You haven't joined any classes. Click 'Join Class' in the header to get started." />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {myClasses.map((classItem, idx) => (
                            <motion.button
                                key={classItem.id || idx} onClick={() => setSelectedClass(classItem)} whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}
                                // --- MODIFIED: Themed Class Button ---
                                className="relative w-full text-left bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl p-3 sm:p-4 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all duration-200"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center shadow-inner flex-shrink-0"> <BookOpenIcon className="h-5 w-5 text-white" /> </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate flex-1 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                                                {classItem.name}
                                            </h3> <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 truncate">{classItem.description || 'No description'}</p>
                                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                            <span className="text-[12px] text-slate-400 dark:text-slate-500">Taught by <span className="text-slate-700 dark:text-slate-300 font-medium">{getTeacherName(classItem)}</span></span>
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full text-[11px]">{classItem.subject}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
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
    handleTakeQuizClick, fetchContent, handleDownloadPacket
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const { isSessionConflictModalOpen, sessionConflictMessage, setIsSessionConflictModalOpen, performLogout } = useAuth();
	const { showToast } = useToast();

    // --- FIX: useEffect to clear selectedClass when tab changes ---
    useEffect(() => {
        // If selectedClass is active and the URL view is NOT the home view ('classes'),
        // clear the selected class state to allow the router view to render.
        if (selectedClass && view !== 'classes') {
            setSelectedClass(null);
        }
    }, [view, selectedClass, setSelectedClass]);
    // --- END FIX ---

    const sidebarNavItems = [
        { view: 'classes', text: 'Dashboard', icon: Squares2X2Icon },
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            return <StudentClassDetailView selectedClass={selectedClass} onBack={() => setSelectedClass(null)} setLessonToView={setLessonToView} />;
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
                  />
                );
            case 'lessons':
                return (
                  <div className="relative">
                    {allLessonsEmpty && !isFetching ? (
                      <EmptyState icon={BookOpenIcon} title="No Lessons Found" message="Your teacher hasn't posted any lessons yet. Check back soon!" actionText={isFetching ? "Checking..." : "Check for New Lessons"} onActionClick={fetchContent} />
                    ) : (
                      <StudentLessonsTab lessons={lessons} units={units} setLessonToView={setLessonToView} isFetchingContent={isFetching} onRefreshLessons={fetchContent} />
                    )}
                    <button onClick={fetchContent} disabled={isFetching} className="fixed bottom-24 right-5 z-50 sm:hidden flex items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg w-14 h-14 active:scale-[0.95] transition-transform duration-200 ease-in-out">
                      <BookOpenIcon className={`h-6 w-6 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                );
            case 'quizzes':
                if (allQuizzesEmpty && !isFetching) {
                    return <EmptyState icon={ClipboardDocumentCheckIcon} title="No Quizzes Found" message="You have no active or completed quizzes at the moment." />;
                }
                return <StudentQuizzesTab quizzes={quizzes} units={units} handleTakeQuizClick={handleTakeQuizClick} isFetchingContent={isFetching} userProfile={userProfile} />;
            case 'rewards':
                return <RewardsPage />;
            case 'profile':
                return <StudentProfilePage />;
            default:
                return null;
        }
    };

    return (
        // --- MODIFIED: Main container is themed ---
        <div className="min-h-screen font-sans bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-900 dark:text-slate-100 selection:bg-red-500/30">
            <div className="relative z-10 h-full md:flex">
                {/* --- MODIFIED: Sidebar is themed --- */}
                <aside className="w-72 flex-shrink-0 hidden md:block bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 rounded-r-3xl shadow-neumorphic dark:shadow-neumorphic-dark">
                    <SidebarContent
                        sidebarNavItems={desktopSidebarNavItems}
                        onLogoutClick={handleLogoutClick}
                        hasUnclaimedRewards={hasUnclaimedRewards}
                    />
                </aside>

                <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
                    {/* --- FIX: Added md:justify-end to align buttons right on desktop --- */}
                    <header className="p-4 sm:p-6 flex items-center justify-between md:justify-end bg-neumorphic-base dark:bg-neumorphic-base-dark sticky top-0 z-20 shadow-neumorphic dark:shadow-neumorphic-dark rounded-b-3xl">
                      {/* --- FIX: Added md:hidden to hide logo/text on desktop --- */}
                      <div className="flex items-center gap-3 md:hidden">
                        {/* --- MODIFIED: Themed logo container --- */}
                        <div className="w-12 h-12 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-center flex-shrink-0">
                          <img
                            src="https://i.ibb.co/XfJ8scGX/1.png"
                            alt="SRCS Logo"
                            className="w-10 h-10 rounded-full"
                          />
                        </div>
                        {/* --- MODIFIED: Themed text --- */}
                        <span className="font-extrabold text-lg sm:text-xl text-slate-800 dark:text-slate-100">
                          <span className="sm:hidden">SRCS LMS</span>
                          <span className="hidden sm:inline">SRCS LMS</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4 relative">
                            <ThemeToggle />
                        <InstallPWA />
                        {/* --- MODIFIED: Themed Join Class Button --- */}
                        <button onClick={() => setJoinClassModalOpen(true)} className="flex items-center justify-center gap-2 bg-neumorphic-base dark:bg-neumorphic-base-dark text-red-600 dark:text-red-400 font-semibold border-none rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all duration-300 ease-in-out transform hover:scale-[1.03] py-2.5 px-4">
                          <PlusCircleIcon className="h-5 w-5" /> <span>Join Class</span>
                        </button>
                        {userProfile && (
                          <div ref={profileMenuRef}>
                            <button className="w-11 h-11 relative rounded-full border-2 border-white dark:border-slate-800 hover:border-red-500/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0 flex items-center justify-center transform hover:scale-[1.05] shadow-neumorphic dark:shadow-neumorphic-dark" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                              <UserInitialsAvatar user={userProfile} size="full" borderType={userProfile?.selectedBorder || 'none'} effectsEnabled={userProfile?.cosmeticsEnabled ?? true} className="w-full h-full text-base" />
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                            </button>
                            {isProfileMenuOpen && (
                              <div className="absolute right-0 mt-3 w-56 bg-neumorphic-base dark:bg-slate-800 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark py-2 z-30 border border-slate-200 dark:border-slate-700 transform origin-top-right animate-scale-in">
                                <button onClick={handleProfileClick} className="block w-full text-left px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors duration-200 font-medium flex items-center gap-3"> <UserIcon className="h-5 w-5" /> Profile </button>
                                <button onClick={handleLogoutClick} className="block w-full text-left px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors duration-200 font-medium flex items-center gap-3"> <PowerIcon className="h-5 w-5" /> Logout </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-6 relative">
                        <AnimatePresence>
                            {isFetching && (
                                <motion.div
                                    key="loading-overlay"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    // --- MODIFIED: Themed overlay background ---
                                    className="absolute inset-0 bg-neumorphic-base/80 dark:bg-neumorphic-base-dark/80 flex items-center justify-center z-20"
                                >
                                    <Spinner />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {!isFetching && renderView()}
                        </motion.div>
                    </main>
                </div>
            </div>

            {/* --- MODIFIED: Footer is themed --- */}
            <footer className="fixed bottom-0 left-0 right-0 bg-neumorphic-base dark:bg-neumorphic-base-dark flex justify-around md:hidden z-40 shadow-neumorphic dark:shadow-neumorphic-dark rounded-t-3xl">
                {sidebarNavItems.map(item => {
                    const showNotification = item.view === 'rewards' && hasUnclaimedRewards;
                    return (
                        <NavLink
                            key={item.view}
                            to={item.view === 'classes' ? '/student' : `/student/${item.view}`}
                            end={item.view === 'classes'}
                            className={({ isActive }) =>
                                // --- MODIFIED: Themed text colors ---
                                `relative flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 text-center transition-colors duration-200 group ${isActive ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative w-14 h-8 flex items-center justify-center">
                                        {/* --- MODFIED: Themed active background --- */}
                                        <span className={`absolute top-0 left-0 w-full h-full rounded-full transition-opacity duration-200 ${isActive ? 'bg-red-100 dark:bg-red-900/30 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:bg-slate-200/60 dark:group-hover:bg-slate-700/60'}`}></span>
                                        <item.icon className="h-6 w-6 z-10" />
                                    </div>
                                    <span className="text-xs mt-0.5 font-semibold z-10">{item.text}</span>
                                    {showNotification && (
                                        <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </footer>

            <AnimatePresence>
                {isLogoutModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            // --- MODIFIED: Themed Logout Modal ---
                            className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark p-6 w-80 text-center"
                        >
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Confirm Logout</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to logout?</p>
                            <div className="flex justify-between gap-4">
                                <button
                                    onClick={() => setIsLogoutModalOpen(false)}
                                    // --- MODIFIED: Themed Cancel Button ---
                                    className="flex-1 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setIsLogoutModalOpen(false);
                                        logout();
                                    }}
                                    className="flex-1 py-2 rounded-xl font-semibold text-red-600 bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition"
                                >
                                    Logout
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