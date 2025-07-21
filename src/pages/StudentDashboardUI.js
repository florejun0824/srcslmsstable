import React from 'react';
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
} from '@heroicons/react/24/solid';

import ProfilePage from './ProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';

// --- Redesigned Sidebar ---
const SidebarContent = ({ view, handleViewChange, sidebarNavItems, userProfile, logout }) => {
    return (
        <div className="h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-12 px-2">
                    <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-12 h-12 rounded-full shadow-lg" />
                    <div>
                        <span className="font-extrabold text-xl text-slate-800">SRCS</span>
                        <p className="text-xs text-slate-500">Student Portal</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-3">
                    {sidebarNavItems.map(item => {
                        const isActive = view === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-md font-semibold transition-all duration-300 ease-in-out transform hover:scale-105
                                    ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                 <Button onClick={logout} variant="light" className="w-full justify-center p-3 rounded-lg text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors" icon={ArrowLeftOnRectangleIcon}>
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
}) => {
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

    const renderView = () => {
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
                     <div className="space-y-8">
                         <div>
                            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{getGreeting()}, {userProfile?.firstName || 'Student'}!</h1>
                            <p className="mt-2 text-lg text-slate-500">Here's what's happening today. Let's make it a great one.</p>
                         </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                            </div>
                            
                            <div className="lg:col-span-1 space-y-6">
                               <StudentQuizzesTab classes={myClasses} userProfile={userProfile} isModule={true}/>
                               <StudentPerformanceTab userProfile={userProfile} classes={myClasses} isModule={true}/>
                            </div>
                        </div>
                    </div>
                );
            case 'quizzes':
                return <StudentQuizzesTab classes={myClasses} userProfile={userProfile} />;
            case 'performance':
                return <StudentPerformanceTab userProfile={userProfile} classes={myClasses} />;
            case 'profile':
                return <ProfilePage />;
        }
    };

    return (
        <div className="min-h-screen font-sans bg-slate-50 text-slate-900 selection:bg-indigo-500/30">
            {/* Background Aurora */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-1/4 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-3xl animate-blob"></div>
                <div className="absolute top-1/2 -right-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10 h-full md:flex">
                {/* Desktop Sidebar */}
                <aside className="w-80 flex-shrink-0 hidden md:block bg-white/60 backdrop-blur-xl p-6 border-r border-slate-200">
                    <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} userProfile={userProfile} logout={logout}/>
                </aside>

                {/* Mobile Sidebar */}
                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-80 h-full bg-white/95 backdrop-blur-lg shadow-xl p-6">
                        <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} userProfile={userProfile} logout={logout}/>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                     <header className="p-6 flex items-center justify-between md:justify-end">
                        <button className="md:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
                            <Bars3Icon className="h-8 w-8" />
                        </button>
                         <Button
                            onClick={() => setJoinClassModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold border-none rounded-lg shadow-sm"
                            icon={PlusCircleIcon}
                        >
                            Join Class
                        </Button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-6 pt-0 pb-24">
                        {renderView()}
                    </main>
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg flex justify-around md:hidden border-t border-slate-200/80 shadow-t-lg z-40">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => handleViewChange(item.view)}
                            className={`flex-1 flex flex-col items-center justify-center py-2.5 text-center transition-colors duration-200
                                ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <item.icon className={`h-6 w-6`} />
                            <span className={`text-xs mt-1 font-semibold`}>{item.text}</span>
                        </button>
                    )
                })}
            </footer>
        </div>
    );
};

export default StudentDashboardUI;