import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardDocumentCheckIcon,
    UserIcon,
    PlusCircleIcon,
    PowerIcon,
    BookOpenIcon,
    Squares2X2Icon,
    SparklesIcon,
    GiftIcon,
    // --- (Icons are unchanged) ---
    ClockIcon,
    PresentationChartLineIcon,
    AcademicCapIcon,
    InboxIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/solid';
import StudentProfilePage from './StudentProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import RewardsPage from '../components/student/RewardsPage';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import StudentLessonsTab from '../components/student/StudentLessonsTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';
import SessionConflictModal from '../components/common/SessionConflictModal';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

// --- (SidebarContent component is unchanged) ---
const SidebarContent = ({ view, handleViewChange, sidebarNavItems, onLogoutClick, hasUnclaimedRewards }) => {
    return (
        <div className="h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-4 mb-12 px-2">
                    <div className="w-14 h-14 rounded-2xl bg-neumorphic-base shadow-neumorphic flex items-center justify-center transition-transform duration-300 ease-out hover:scale-105">
                        <img
                            src="https://i.ibb.co/XfJ8scGX/1.png"
                            alt="SRCS Logo"
                            className="w-12 h-12 rounded-lg"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                    <div>
                        <span className="font-extrabold text-xl text-slate-800">SRCS Portal</span>
                        <p className="text-sm text-slate-500">Student Dashboard</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-2">
                    {sidebarNavItems.map(item => {
                        const isActive = view === item.view;
                        const showNotification = item.view === 'rewards' && hasUnclaimedRewards;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                className={`relative flex items-center gap-4 px-4 py-3 rounded-xl text-md font-semibold transition-all duration-200 ease-in-out
                                    ${isActive
                                        ? 'bg-neumorphic-base shadow-neumorphic-inset text-red-600'
                                        : 'text-slate-600 hover:shadow-neumorphic-inset'
                                    }`}
                            >
                                <item.icon className={`h-6 w-6 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
                                <span>{item.text}</span>
                                {showNotification && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                                )}
                            </button>
                        )
                    })}
                </nav>
            </div>
            <div className="p-2">
                <button
                    onClick={onLogoutClick}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:text-red-600 font-semibold transition-all duration-200 shadow-neumorphic hover:shadow-neumorphic-inset group"
                >
                    <PowerIcon className="h-6 w-6 text-slate-400 group-hover:text-red-600 transition-colors" />
                    <span className="ml-1">Logout</span>
                </button>
            </div>
        </div>
    );
};

// --- (EmptyState component is unchanged) ---
const EmptyState = ({ icon: Icon, title, message, actionText, onActionClick }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-neumorphic-base shadow-neumorphic-inset max-w-lg mx-auto mt-10">
        <Icon className="h-16 w-16 text-slate-400 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 mb-6">{message}</p>
        {onActionClick && (
            <button
                onClick={onActionClick}
                className="flex items-center justify-center gap-2 bg-neumorphic-base text-red-600 font-semibold border-none rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300 ease-in-out transform hover:scale-[1.03] py-2.5 px-4"
            >
                {actionText}
            </button>
        )}
    </div>
);


// --- (DashboardHome component is unchanged) ---
const DashboardHome = ({
    userProfile,
    myClasses,
    setSelectedClass,
    nextQuiz,
    latestLesson,
    hasUnclaimedRewards,
    handleViewChange,
    setLessonToView,
    handleTakeQuizClick,
    handleDownloadPacket,
}) => {

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="space-y-8">
            {/* --- 1. Greeting --- */}
            <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                    {getGreeting()}, {userProfile?.firstName || 'Student'}!
                </h1>
                <p className="mt-2 text-base sm:text-lg text-slate-500 max-w-2xl">
                    Welcome back. Let's dive into today's learning journey.
                </p>
            </div>

            {/* --- 2. "Up Next" Section --- */}
            {(nextQuiz || latestLesson || hasUnclaimedRewards) && (
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                        <SparklesIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" /> Up Next
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Card for Next Quiz */}
                        {nextQuiz && (
                            <button
                                onClick={() => handleTakeQuizClick(nextQuiz)}
                                className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300 text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm font-semibold text-red-600">
                                        <ClockIcon className="h-5 w-5" /> Quiz Due
                                    </span>
                                    <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mt-2 truncate">{nextQuiz.title}</h3>
                                <p className="text-sm text-slate-500">
                                    Due by: {format(nextQuiz.availableUntil.toDate(), 'MMM d, h:mm a')}
                                </p>
                            </button>
                        )}

                        {/* Card for Latest Lesson */}
                        {latestLesson && (
                            <button
                                onClick={() => setLessonToView(latestLesson)}
                                className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300 text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                                        <PresentationChartLineIcon className="h-5 w-5" /> New Lesson
                                    </span>
                                    <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mt-2 truncate">{latestLesson.title}</h3>
                                <p className="text-sm text-slate-500 truncate">
                                    In: {latestLesson.className}
                                </p>
                            </button>
                        )}

                        {/* Card for Unclaimed Rewards */}
                        {hasUnclaimedRewards && (
                            <button
                                onClick={() => handleViewChange('rewards')}
                                className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300 text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                                        <GiftIcon className="h-5 w-5" /> New Reward!
                                    </span>
                                    <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mt-2">You've unlocked a new reward!</h3>
                                <p className="text-sm text-slate-500">
                                    Go to the Rewards page to claim it.
                                </p>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- 3. "My Classes" Section --- */}
            <div className="bg-neumorphic-base p-4 sm:p-6 rounded-3xl shadow-neumorphic">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                    <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:w-8 text-slate-700" /> My Classes
                </h2>
                {myClasses.length === 0 ? (
                    <EmptyState
                        icon={InboxIcon}
                        title="No Classes Yet"
                        message="You haven't joined any classes. Click 'Join Class' in the header to get started."
                    />
                ) : (
                    <StudentClassesTab
                        classes={myClasses}
                        onClassSelect={setSelectedClass}
                        onDownloadPacket={handleDownloadPacket}
                    />
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
    handleTakeQuizClick, handleDownloadPacket
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const { isSessionConflictModalOpen, sessionConflictMessage, setIsSessionConflictModalOpen, performLogout } = useAuth();

    // --- MODIFICATION: Added Profile to the main sidebarNavItems array ---
    const sidebarNavItems = [
        { view: 'classes', text: 'Dashboard', icon: Squares2X2Icon },
        { view: 'lessons', text: 'Lessons', icon: BookOpenIcon },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardDocumentCheckIcon },
        { view: 'rewards', text: 'Rewards', icon: GiftIcon },
        { view: 'profile', text: 'Profile', icon: UserIcon } // <-- ADDED
    ];
    // --- END MODIFICATION ---

    // --- MODIFICATION: This can now just be a copy of the main array ---
    const desktopSidebarNavItems = [...sidebarNavItems];
    // --- END MODIFICATION ---

    // --- (hasUnclaimedRewards useMemo is unchanged) ---
    const hasUnclaimedRewards = useMemo(() => {
        const unlocked = userProfile?.unlockedRewards || [];
        const claimed = userProfile?.claimedRewards || [];
        return unlocked.some(rewardId => !claimed.includes(rewardId));
    }, [userProfile]);

    // --- (nextQuiz useMemo is unchanged) ---
    const nextQuiz = useMemo(() => {
        const now = new Date();
        return [...quizzes.active]
            .filter(q => q.availableUntil && q.availableUntil.toDate() > now)
            .sort((a, b) => a.availableUntil.toDate().getTime() - b.availableUntil.toDate().getTime())[0];
    }, [quizzes.active]);

    // --- (latestLesson useMemo is unchanged) ---
    const latestLesson = useMemo(() => {
        return [...lessons]
            .filter(l => l.createdAt)
            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0];
    }, [lessons]);

    // --- (getGreeting function is unchanged) ---
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // --- (useEffect for profile menu is unchanged) ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- (handleProfileClick is unchanged) ---
    const handleProfileClick = () => {
        handleViewChange('profile');
        setIsProfileMenuOpen(false);
    };

    // --- (handleLogoutClick is unchanged) ---
    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
        setIsProfileMenuOpen(false);
    };

    // --- (renderView function is unchanged) ---
    const renderView = () => {
        if (selectedClass) {
            return <StudentClassDetailView selectedClass={selectedClass} onBack={() => setSelectedClass(null)} setLessonToView={setLessonToView} />;
        }

        const allQuizzesEmpty = quizzes.active.length === 0 && quizzes.completed.length === 0 && quizzes.overdue.length === 0;
        const allLessonsEmpty = lessons.length === 0;

        switch (view) {
            case 'classes':
            case 'default':
                return (
                    <DashboardHome
                        userProfile={userProfile}
                        myClasses={myClasses}
                        setSelectedClass={setSelectedClass}
                        nextQuiz={nextQuiz}
                        latestLesson={latestLesson}
                        hasUnclaimedRewards={hasUnclaimedRewards}
                        handleViewChange={handleViewChange}
                        setLessonToView={setLessonToView}
                        handleTakeQuizClick={handleTakeQuizClick}
                        handleDownloadPacket={handleDownloadPacket}
                    />
                );
            case 'lessons':
                if (allLessonsEmpty && !isFetching) {
                    return <EmptyState
                        icon={BookOpenIcon}
                        title="No Lessons Found"
                        message="Your teacher hasn't posted any lessons yet. Check back soon!"
                    />;
                }
                return <StudentLessonsTab lessons={lessons} units={units} setLessonToView={setLessonToView} isFetchingContent={isFetching} />;
            case 'quizzes':
                if (allQuizzesEmpty && !isFetching) {
                    return <EmptyState
                        icon={ClipboardDocumentCheckIcon}
                        title="No Quizzes Found"
                        message="You have no active or completed quizzes at the moment."
                    />;
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
        <div className="min-h-screen font-sans bg-neumorphic-base text-slate-900 selection:bg-red-500/30">
            <div className="relative z-10 h-full md:flex">
                {/* Desktop Sidebar (unchanged) */}
                <aside className="w-72 flex-shrink-0 hidden md:block bg-neumorphic-base p-6 rounded-r-3xl shadow-neumorphic">
                    <SidebarContent
                        view={view}
                        handleViewChange={handleViewChange}
                        sidebarNavItems={desktopSidebarNavItems}
                        onLogoutClick={handleLogoutClick}
                        hasUnclaimedRewards={hasUnclaimedRewards}
                    />
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
                    {/* Header (unchanged) */}
                    <header className="p-4 sm:p-6 flex items-center justify-between bg-neumorphic-base sticky top-0 z-20 shadow-neumorphic rounded-b-3xl">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-neumorphic-base shadow-neumorphic flex items-center justify-center flex-shrink-0">
                                <img
                                    src="https://i.ibb.co/XfJ8scGX/1.png"
                                    alt="SRCS Logo"
                                    className="w-10 h-10 rounded-full"
                                />
                            </div>
                            <span className="font-extrabold text-lg sm:text-xl text-slate-800 hidden sm:block">
                                SRCS Portal
                            </span>
                        </div>
                        <div className="flex items-center gap-4 relative">
                            <button
                                onClick={() => setJoinClassModalOpen(true)}
                                className="flex items-center justify-center gap-2 bg-neumorphic-base text-red-600 font-semibold border-none rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300 ease-in-out transform hover:scale-[1.03] py-2.5 px-4"
                            >
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>Join Class</span>
                            </button>
                            {userProfile && (
                                <div ref={profileMenuRef}>
                                    <button
                                        className="w-11 h-11 relative rounded-full overflow-hidden border-2 border-white hover:border-red-500/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0 flex items-center justify-center transform hover:scale-[1.05] shadow-neumorphic"
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    >
                                        <UserInitialsAvatar
                                            user={userProfile}
                                            size="full"
                                            borderType={userProfile?.selectedBorder || 'none'}
                                            effectsEnabled={userProfile?.cosmeticsEnabled ?? true}
                                            className="w-full h-full text-base"
                                        />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    </button>
                                    {isProfileMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-56 bg-neumorphic-base rounded-xl shadow-neumorphic py-2 z-30 border border-slate-200 transform origin-top-right animate-scale-in">
                                            <button
                                                onClick={handleProfileClick}
                                                className="block w-full text-left px-4 py-2.5 text-slate-700 hover:shadow-neumorphic-inset transition-colors duration-200 font-medium flex items-center gap-3"
                                            >
                                                <UserIcon className="h-5 w-5" /> Profile
                                            </button>
                                            <button
                                                onClick={handleLogoutClick}
                                                className="block w-full text-left px-4 py-2.5 text-slate-700 hover:shadow-neumorphic-inset transition-colors duration-200 font-medium flex items-center gap-3"
                                            >
                                                <PowerIcon className="h-5 w-5" /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </header>

                    {/* Main area (unchanged) */}
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-6 relative">
                        <AnimatePresence>
                            {isFetching && (
                                <motion.div
                                    key="loading-overlay"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 bg-neumorphic-base/80 flex items-center justify-center z-20"
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

            {/* Mobile Footer (This will now automatically include 'Profile') */}
            <footer className="fixed bottom-0 left-0 right-0 bg-neumorphic-base flex justify-around md:hidden z-40 shadow-neumorphic rounded-t-3xl">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view;
                    const showNotification = item.view === 'rewards' && hasUnclaimedRewards;
                    return (
                        <button
                            key={item.view}
                            onClick={() => handleViewChange(item.view)}
                            className={`relative flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 text-center transition-colors duration-200 group ${isActive ? 'text-red-600' : 'text-slate-500 hover:text-red-600'}`}
                        >
                            <div className="relative w-14 h-8 flex items-center justify-center">
                                <span className={`absolute top-0 left-0 w-full h-full rounded-full transition-opacity duration-200 ${isActive ? 'bg-red-100 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:bg-slate-200/60'}`}></span>
                                <item.icon className="h-6 w-6 z-10" />
                            </div>
                            <span className="text-xs mt-0.5 font-semibold z-10">{item.text}</span>
                             {showNotification && (
                                <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </button>
                    )
                })}
            </footer>

            {/* Logout Confirmation Modal (Unchanged) */}
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
                            className="bg-neumorphic-base rounded-3xl shadow-neumorphic p-6 w-80 text-center"
                        >
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Confirm Logout</h2>
                            <p className="text-slate-500 mb-6">Are you sure you want to logout?</p>
                            <div className="flex justify-between gap-4">
                                <button
                                    onClick={() => setIsLogoutModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl font-semibold text-slate-600 bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition"
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

            {/* Session Conflict Modal (Unchanged) */}
            <SessionConflictModal isOpen={isSessionConflictModalOpen} message={sessionConflictMessage} onClose={performLogout} />
        </div>
    );
};

export default StudentDashboardUI;