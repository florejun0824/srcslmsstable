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
    BookOpenIcon, // Added for class card example
    UserCircleIcon, // Added for teacher icon in class card example
    CalendarDaysIcon, // Added for schedule icon in class card example
    ArrowRightIcon, // Added for 'View Details' button in class card example
} from '@heroicons/react/24/solid';

import ProfilePage from './ProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab'; // This component will need internal updates
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';

// Placeholder for an enhanced class card, for demonstration purposes.
// This structure is what you should aim for *inside* your StudentClassesTab component.
const EnhancedClassCardExample = ({ className, grade, teacher, onSelect }) => {
    return (
        <div
            className="relative bg-white rounded-3xl p-7 shadow-xl border border-slate-100 cursor-pointer
                       transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-2xl group"
            onClick={onSelect} // Simulate selection
        >
            <div className="flex items-start justify-between mb-4">
                <BookOpenIcon className="h-10 w-10 text-red-500/80 group-hover:text-red-600 transition-colors duration-300" />
                {/* Optional: Add a status badge here, e.g., "Active", "Upcoming" */}
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

            {/* A subtle line or separator */}
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
                                        ? 'bg-gradient-to-br from-red-800 to-red-950 text-white shadow-lg shadow-red-800/40' // Maroon gradient
                                        : 'text-slate-500 hover:bg-red-100/50 hover:text-red-700 hover:translate-x-1' // Adjusted hover for maroon
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
                     <div className="space-y-10"> {/* Increased overall spacing */}
                         {/* Hero Section - Cleaned up */}
                         <div>
                            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">{getGreeting()}, {userProfile?.firstName || 'Student'}!</h1>
                            <p className="mt-3 text-xl text-slate-600 max-w-2xl">Welcome back! Let's make it a great day of learning.</p>
                            {/* Previous widgets and cards removed for a cleaner UI */}
                         </div>

                        {/* Main Content Sections */}
                        <div className="space-y-10"> {/* New space-y for major sections */}
                            {/* My Classes Section - Overall UI Revamp Focus */}
                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 transition-all duration-300 hover:shadow-2xl">
                                <h2 className="text-3xl font-bold text-slate-800 mb-6">My Classes</h2>
                                {/*
                                    To achieve the enhanced visuals for 'My Classes', you MUST update
                                    the internal rendering of your `StudentClassesTab` component.

                                    Refer to the `EnhancedClassCardExample` component above for
                                    a conceptual implementation of a single, visually enhanced class card.
                                    You should adapt that structure for each class entry rendered
                                    within your `StudentClassesTab` component's mapping function.

                                    Key aspects to apply inside StudentClassesTab:
                                    - Each class card should be a distinct, well-designed block.
                                    - Use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`
                                      *inside* `StudentClassesTab` to display the cards responsively.
                                    - Apply modern card styling: rounded corners, soft shadows, clear hover effects.
                                    - Ensure prominent typography for class name, clear teacher info, and engaging icons.
                                    - Provide a clear call-to-action (e.g., 'View Details' button/link).
                                */}
                                <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                            </div>
                            
                            {/* Quizzes & Performance Sections entirely removed from Dashboard overview as requested */}
                        </div>
                    </div>
                );
            case 'quizzes':
                // User explicitly removed from dashboard overview but still accessible via sidebar
                return <StudentQuizzesTab classes={myClasses} userProfile={userProfile} />;
            case 'performance':
                // User explicitly removed from dashboard overview but still accessible via sidebar
                return <StudentPerformanceTab userProfile={userProfile} classes={myClasses} />;
            case 'profile':
                return <ProfilePage />;
        }
    };

    return (
        <div className="min-h-screen font-sans bg-slate-50 text-slate-900 selection:bg-red-500/30"> {/* Adjusted selection color */}
            {/* Background Aurora */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-1/4 left-0 w-[500px] h-[500px] bg-red-500/10 rounded-full filter blur-3xl animate-blob"></div> {/* Maroonish blob */}
                <div className="absolute top-1/2 -right-1/4 w-[400px] h-[400px] bg-red-400/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div> {/* Lighter maroonish blob */}
                <div className="absolute -bottom-1/4 left-1/4 w-[450px] h-[450px] bg-rose-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div> {/* Another maroonish blob */}
            </div>
            
            <div className="relative z-10 h-full md:flex">
                {/* Desktop Sidebar */}
                <aside className="w-80 flex-shrink-0 hidden md:block bg-white/70 backdrop-blur-lg p-6 border-r border-slate-200 shadow-inner-r"> {/* Adjusted background and added inner shadow */}
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
                     <header className="p-6 flex items-center justify-between md:justify-end bg-white/70 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20"> {/* Sticky header */}
                        <button className="md:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
                            <Bars3Icon className="h-8 w-8" />
                        </button>
                         <Button
                            onClick={() => setJoinClassModalOpen(true)}
                            className="bg-gradient-to-br from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white font-semibold border-none rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 py-3 px-5" // Maroon gradient button
                            icon={PlusCircleIcon}
                        >
                            Join Class
                        </Button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-8 pt-4 pb-24"> {/* Adjusted padding */}
                        {renderView()}
                    </main>
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg flex justify-around md:hidden border-t border-slate-200/80 shadow-t-xl z-40"> {/* Adjusted background and shadow */}
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
        </div>
    );
};

export default StudentDashboardUI;