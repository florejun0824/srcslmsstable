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
} from '@heroicons/react/24/solid';

import StudentProfilePage from './StudentProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';
import SessionConflictModal from '../components/common/SessionConflictModal'; // NEW: Import the session conflict modal
import { useAuth } from '../contexts/AuthContext'; // NEW: Import useAuth to access modal state

// Placeholder for an enhanced class card, for demonstration purposes.
const EnhancedClassCardExample = ({ className, grade, teacher, onSelect }) => {
    return (
        <div
            className="relative bg-white rounded-3xl p-7 shadow-xl border border-slate-100 cursor-pointer
                       transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-2xl group"
            onClick={onSelect}
        >
            <div className="flex items-start justify-between mb-4">
                <BookOpenIcon className="h-10 w-10 text-red-500/80 group-hover:text-red-600 transition-colors duration-300" />
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                    Active
                </span>
            </div>

            <h3 className="text-2xl font-extrabold text-slate-800 mb-2 leading-tight">
                {className}
            </h3>

            <p className="text-md text-slate-600 mb-3 flex items-center gap-2">
                <AcademicCapIcon className="h-5 w-5 text-slate-400" />
                {grade}
            </p>

            <p className="text-md text-slate-600 flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5 text-slate-400" />
                Teacher: {teacher}
            </p>

            <div className="border-t border-slate-100 my-5"></div>

            <button
                className="flex items-center text-red-700 hover:text-red-800 font-semibold text-lg
                           transition-all duration-300 group-hover:translate-x-1"
                onClick={onSelect}
            >
                View Details
                <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:ml-3 transition-all duration-300" />
            </button>
        </div>
    );
};

// --- Redesigned Sidebar ---
const SidebarContent = ({ view, handleViewChange, sidebarNavItems, userProfile, logout }) => {
    return (
        <div className="h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-12 px-2">
                    <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-14 h-14 rounded-full shadow-lg transition-all duration-300 ease-out transform hover:scale-105" />
                    <div>
                        <span className="font-extrabold text-2xl text-slate-800">SRCS</span>
                        <p className="text-sm text-slate-600">Student Portal</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-3">
                    {sidebarNavItems.map(item => {
                        const isActive = view === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-lg font-semibold transition-all duration-300 ease-in-out transform
                                    ${isActive
                                        ? 'bg-gradient-to-br from-red-800 to-red-950 text-white shadow-lg shadow-red-800/40'
                                        : 'text-slate-500 hover:bg-red-100/50 hover:text-red-700 hover:translate-x-1'
                                    }`}
                            >
                                <item.icon className={`h-6 w-6`} />
                                <span>{item.text}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>
            <div className="p-2">
                 <Button onClick={logout} variant="light" className="w-full justify-center p-3.5 rounded-xl text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 hover:border-red-300 font-semibold transition-colors shadow-sm hover:shadow-md" icon={ArrowLeftOnRectangleIcon}>
                    Logout
                </Button>
            </div>
        </div>
    );
};

// --- Main UI Component ---
const StudentDashboardUI = ({
    userProfile, logout, view, isSidebarOpen, setIsSidebarOpen, handleViewChange,
    setJoinClassModalOpen, selectedClass, setSelectedClass, myClasses, isFetchingContent,
    authLoading // Added authLoading prop
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);

    // NEW: Access session conflict modal state from AuthContext
    const { isSessionConflictModalOpen, sessionConflictMessage, setIsSessionConflictModalOpen, performLogout } = useAuth();


    const sidebarNavItems = [
        { view: 'classes', text: 'Dashboard', icon: UserGroupIcon },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardDocumentCheckIcon },
        { view: 'performance', text: 'Performance', icon: ChartBarIcon },
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
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleProfileClick = () => {
        handleViewChange('profile');
        setIsProfileMenuOpen(false);
    };

    const handleLogoutClick = () => {
        logout();
        setIsProfileMenuOpen(false);
    };

    const renderView = () => {
        if (authLoading) {
            return (
                <div className="flex justify-center items-center py-24">
                    <Spinner />
                </div>
            );
        }

        if (isFetchingContent && !selectedClass && view !== 'profile') {
            return (
                <div className="flex justify-center items-center py-24">
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
                     <div className="space-y-10">
                         <div>
                            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">{getGreeting()}, {userProfile?.firstName || 'Student'}!</h1>
                            <p className="mt-3 text-xl text-slate-600 max-w-2xl">Welcome back! Let's make it a great day of learning.</p>
                         </div>

                        <div className="space-y-10">
                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 transition-all duration-300 hover:shadow-2xl">
                                <h2 className="text-3xl font-bold text-slate-800 mb-6">My Classes</h2>
                                <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                            </div>
                        </div>
                    </div>
                );
            case 'quizzes':
                return <StudentQuizzesTab classes={myClasses} userProfile={userProfile} />;
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
                <div className="absolute -top-1/4 left-0 w-[500px] h-[500px] bg-red-500/10 rounded-full filter blur-3xl animate-blob"></div>
                <div className="absolute top-1/2 -right-1/4 w-[400px] h-[400px] bg-red-400/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-1/4 left-1/4 w-[450px] h-[450px] bg-rose-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 h-full md:flex">
                <aside className="w-80 flex-shrink-0 hidden md:block bg-white/70 backdrop-blur-lg p-6 border-r border-slate-200 shadow-inner-r">
                    <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} userProfile={userProfile} logout={logout}/>
                </aside>

                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-80 h-full bg-white/95 backdrop-blur-lg shadow-xl p-6">
                        <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} userProfile={userProfile} logout={logout}/>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                     <header className="p-6 flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20">
                        {/* Mobile sidebar toggle button on the far left */}
                        <button className="md:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
                            <Bars3Icon className="h-8 w-8" />
                        </button>
                        {/* Content for the right side: Join Class button and Profile Menu */}
                        <div className="flex items-center gap-4 ml-auto relative"> {/* Added ml-auto to push to right */}
                             <Button
                                onClick={() => setJoinClassModalOpen(true)}
                                className="bg-gradient-to-br from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white font-semibold border-none rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 py-3 px-5"
                                icon={PlusCircleIcon}
                            >
                                Join Class
                            </Button>

                            {/* Profile Picture and Dropdown */}
                            {userProfile && ( // Only show if userProfile is available
                                <div ref={profileMenuRef}>
                                    <button
                                        className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-300 hover:border-red-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex-shrink-0 flex items-center justify-center" // Added flex for centering content
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                        aria-expanded={isProfileMenuOpen}
                                        aria-haspopup="true"
                                    >
                                        {userProfile.photoURL ? (
                                            <img src={userProfile.photoURL} alt="User Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            // --- IMPORTANT CHANGE: Refined UserInitialsAvatar styling for header ---
                                            <UserInitialsAvatar
                                                user={userProfile}
                                                className="w-full h-full text-base bg-red-100 text-red-700 flex items-center justify-center" // Ensure it takes full size of parent and text is centered
                                            />
                                        )}
                                    </button>

                                    {isProfileMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-30 border border-slate-100 transform origin-top-right animate-scale-in">
                                            <button
                                                onClick={handleProfileClick}
                                                className="block w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-red-700 transition-colors duration-200 font-medium flex items-center gap-3"
                                            >
                                                <UserIcon className="h-5 w-5" /> Profile
                                            </button>
                                            <button
                                                onClick={handleLogoutClick}
                                                className="block w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-red-700 transition-colors duration-200 font-medium flex items-center gap-3"
                                            >
                                                <ArrowLeftOnRectangleIcon className="h-5 w-5" /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-8 pt-4 pb-24">
                        {renderView()}
                    </main>
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg flex justify-around md:hidden border-t border-slate-200/80 shadow-t-xl z-40">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => handleViewChange(item.view)}
                            className={`flex-1 flex flex-col items-center justify-center py-3 text-center transition-colors duration-200 ${isActive ? 'text-red-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <item.icon className={`h-6 w-6`} />
                            <span className={`text-xs mt-1 font-semibold`}>{item.text}</span>
                        </button>
                    )
                })}
            </footer>

            {/* NEW: Session Conflict Warning Modal */}
            <SessionConflictModal
                isOpen={isSessionConflictModalOpen}
                message={sessionConflictMessage}
                onClose={performLogout} // Acknowledge and logout
            />
        </div>
    );
};

export default StudentDashboardUI;
