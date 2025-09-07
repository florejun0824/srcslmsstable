import React, { useState, useRef, useEffect } from 'react';
import { Title, Text, Button } from '@tremor/react';
import {
    AcademicCapIcon,
    ClipboardDocumentCheckIcon,
    ChartBarIcon,
    UserGroupIcon,
    UserIcon,
    PlusCircleIcon,
    Bars3Icon,
    ArrowLeftOnRectangleIcon,
    BookOpenIcon,
    UserCircleIcon,
    CalendarDaysIcon,
    ArrowRightIcon,
    SparklesIcon,
    RocketLaunchIcon,

    Squares2X2Icon,
} from '@heroicons/react/24/solid';

import StudentProfilePage from './StudentProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import StudentLessonsTab from '../components/student/StudentLessonsTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';
import SessionConflictModal from '../components/common/SessionConflictModal';
import { useAuth } from '../contexts/AuthContext';

// --- Sidebar ---
const SidebarContent = ({ view, handleViewChange, sidebarNavItems, logout }) => {
    return (
        <div className="h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-4 mb-12 px-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30 flex items-center justify-center transition-transform duration-300 ease-out transform hover:scale-105">
                         <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-12 h-12 rounded-lg" loading="lazy" decoding="async" />
                    </div>
                    <div>
                        <span className="font-extrabold text-xl text-slate-800">SRCS Portal</span>
                        <p className="text-sm text-slate-500">Student Dashboard</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-2">
                    {sidebarNavItems.map(item => {
                        const isActive = view === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-md font-semibold transition-all duration-200 ease-in-out
                                    ${isActive
                                        ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                                        : 'text-slate-600 hover:bg-red-500/10 hover:text-red-700'
                                    }`}
                            >
                                <item.icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span>{item.text}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>
            <div className="p-2">
                 <Button onClick={logout} variant="light" className="w-full justify-start p-3 rounded-xl text-slate-600 hover:bg-red-100 hover:text-red-700 font-semibold transition-colors group" icon={ArrowLeftOnRectangleIcon}>
                    <span className="ml-2">Logout</span>
                </Button>
            </div>
        </div>
    );
};

// --- Main UI Component ---
const StudentDashboardUI = ({
    userProfile, logout, view, isSidebarOpen, setIsSidebarOpen, handleViewChange,
    setJoinClassModalOpen, selectedClass, setSelectedClass, myClasses, isFetchingContent,
    authLoading, lessons, units, isFetchingUnits, setLessonToView, quizzes,
    activeQuizTab, setActiveQuizTab, handleTakeQuizClick
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const { isSessionConflictModalOpen, sessionConflictMessage, setIsSessionConflictModalOpen, performLogout } = useAuth();

    const sidebarNavItems = [
        { view: 'classes', text: 'Dashboard', icon: Squares2X2Icon },
        { view: 'lessons', text: 'Lessons', icon: BookOpenIcon },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardDocumentCheckIcon },
        { view: 'performance', text: 'Performance', icon: ChartBarIcon },
    ];
    
    const desktopSidebarNavItems = [
        ...sidebarNavItems,
        { view: 'profile', text: 'Profile', icon: UserIcon },
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleMobileViewChange = (newView) => {
        handleViewChange(newView);
        setIsSidebarOpen(false);
    }

    const handleProfileClick = () => {
        handleViewChange('profile');
        setIsProfileMenuOpen(false);
    };

    const handleLogoutClick = () => {
        logout();
        setIsProfileMenuOpen(false);
    };

    const renderView = () => {
        if (authLoading || (isFetchingContent && view !== 'profile') || (isFetchingUnits && view === 'lessons')) {
            return (
                <div className="flex justify-center items-center h-full pt-16">
                    <Spinner />
                </div>
            );
        }

        if (selectedClass) {
            return <StudentClassDetailView selectedClass={selectedClass} onBack={() => setSelectedClass(null)} />;
        }

        switch (view) {
            case 'classes':
            case 'default':
                return (
                     <div className="space-y-8">
                         <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">{getGreeting()}, {userProfile?.firstName || 'Student'}!</h1>
                            <p className="mt-2 text-base sm:text-lg text-slate-500 max-w-2xl">Welcome back. Let's dive into today's learning journey.</p>
                         </div>

                        <div className="bg-white/60 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/50 shadow-lg">
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <SparklesIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-500"/>
                                My Classes
                            </h2>
                            <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                        </div>
                    </div>
                );
            case 'lessons':
                return (
                    <StudentLessonsTab
                        lessons={lessons}
                        units={units}
                        isFetchingUnits={isFetchingUnits}
                        setLessonToView={setLessonToView}
                        isFetchingContent={isFetchingContent}
                    />
                );
            case 'quizzes':
                return <StudentQuizzesTab
                            classes={myClasses}
                            userProfile={userProfile}
                        />;
            case 'performance':
                return <StudentPerformanceTab userProfile={userProfile} classes={myClasses} />;
            case 'profile':
                return <StudentProfilePage authLoading={authLoading} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen font-sans bg-slate-50 text-slate-900 selection:bg-red-500/30">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-100/50 via-rose-50/50 to-transparent"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-red-100/50 via-rose-50/30 to-transparent"></div>
            </div>

            <div className="relative z-10 h-full md:flex">
                <aside className="w-72 flex-shrink-0 hidden md:block bg-white/70 backdrop-blur-2xl p-6 border-r border-slate-900/10 shadow-lg">
                    <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={desktopSidebarNavItems} logout={logout}/>
                </aside>

                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-80 h-full bg-white/80 backdrop-blur-2xl shadow-xl p-6 border-r border-slate-900/10">
                        <SidebarContent view={view} handleViewChange={handleMobileViewChange} sidebarNavItems={desktopSidebarNavItems} logout={logout}/>
                    </div>
                </div>


                <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
                     <header className="p-4 sm:p-6 flex items-center justify-between bg-white/70 backdrop-blur-2xl border-b border-slate-900/10 sticky top-0 z-20 shadow-sm">
                        <button className="md:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
                            <Bars3Icon className="h-7 w-7" />
                        </button>
                        <div className="flex items-center gap-4 ml-auto relative">
                             <Button
                                onClick={() => setJoinClassModalOpen(true)}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold border-none rounded-xl shadow-md shadow-red-600/30 hover:shadow-lg hover:shadow-red-600/40 transition-all duration-300 ease-in-out transform hover:scale-[1.03] py-2.5 px-5"
                                icon={PlusCircleIcon}
                            >
                                Join Class
                            </Button>

                            {userProfile && (
                                <div ref={profileMenuRef}>
                                    <button
                                        className="w-11 h-11 relative rounded-full overflow-hidden border-2 border-white hover:border-red-500/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-100 flex-shrink-0 flex items-center justify-center transform hover:scale-[1.05]"
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    >
                                        {userProfile.photoURL ? (
                                            <img src={userProfile.photoURL} alt="User Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserInitialsAvatar
                                                user={userProfile}
                                                className="w-full h-full text-base bg-red-100 text-red-700 flex items-center justify-center"
                                            />
                                        )}
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    </button>

                                    {isProfileMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-56 bg-white/80 backdrop-blur-2xl rounded-xl shadow-lg py-2 z-30 border border-slate-900/10 transform origin-top-right animate-scale-in">
                                            <button
                                                onClick={handleProfileClick}
                                                className="block w-full text-left px-4 py-2.5 text-slate-700 hover:bg-red-500/10 hover:text-red-700 transition-colors duration-200 font-medium flex items-center gap-3"
                                            >
                                                <UserIcon className="h-5 w-5" /> Profile
                                            </button>
                                            <button
                                                onClick={handleLogoutClick}
                                                className="block w-full text-left px-4 py-2.5 text-slate-700 hover:bg-red-500/10 hover:text-red-700 transition-colors duration-200 font-medium flex items-center gap-3"
                                            >
                                                <ArrowLeftOnRectangleIcon className="h-5 w-5" /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-6">
                        {renderView()}
                    </main>
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl flex justify-around md:hidden border-t border-slate-900/10 z-40 shadow-md">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => handleViewChange(item.view)}
                            className={`flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 text-center transition-colors duration-200 group ${isActive ? 'text-red-600' : 'text-slate-500 hover:text-red-600'}`}
                        >
                            <div className={`relative w-14 h-8 flex items-center justify-center`}>
                                <span className={`absolute top-0 left-0 w-full h-full rounded-full transition-opacity duration-200 ${isActive ? 'bg-red-100 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:bg-slate-200/60'}`}></span>
                                <item.icon className={`h-6 w-6 z-10`} />
                            </div>
                            <span className={`text-xs mt-0.5 font-semibold z-10`}>{item.text}</span>
                        </button>
                    )
                })}
            </footer>

            <SessionConflictModal
                isOpen={isSessionConflictModalOpen}
                message={sessionConflictMessage}
                onClose={performLogout}
            />
        </div>
    );
};

export default StudentDashboardUI;