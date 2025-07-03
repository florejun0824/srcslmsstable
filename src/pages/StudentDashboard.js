import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  BookOpenIcon,
  ChartBarIcon,
  AcademicCapIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

import ProfilePage from './ProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import StudentLessonsTab from '../components/student/StudentLessonsTab';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';
import SidebarButton from '../components/common/SidebarButton';
import JoinClassModal from '../components/student/JoinClassModal';

const StudentDashboard = () => {
    const { userProfile, logout, loading } = useAuth();
    const [view, setView] = useState('lessons'); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isJoinClassModalOpen, setJoinClassModalOpen] = useState(false);
    const [myClasses, setMyClasses] = useState([]);
    const [isFetchingClasses, setIsFetchingClasses] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);

    useEffect(() => {
        if (!userProfile?.id) {
            setIsFetchingClasses(false);
            return;
        };
		 console.log("DEBUG: Checking permissions for student ID:", userProfile.id);
        setIsFetchingClasses(true);
        const classesQuery = query(
            collection(db, "classes"),
            where("studentIds", "array-contains", userProfile.id)
        );
        const unsubscribe = onSnapshot(classesQuery, (snapshot) => {
            const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyClasses(classesData);
            setIsFetchingClasses(false);
        }, (error) => {
            console.error("Error fetching student classes:", error);
            setIsFetchingClasses(false);
        });
        return () => unsubscribe();
    }, [userProfile]);
    
    useEffect(() => {
        if (view !== 'classes') {
            setSelectedClass(null);
        }
    }, [view]);

    const renderView = () => {
        const contentWrapperClasses = "bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-lg";
        if (isFetchingClasses && view !== 'profile') {
            return <Spinner />;
        }
        if (selectedClass) {
            return <StudentClassDetailView selectedClass={selectedClass} onBack={() => setSelectedClass(null)} />;
        }
        switch (view) {
            case 'lessons':
                return <StudentLessonsTab classes={myClasses} />;
			case 'quizzes':
			    return <StudentQuizzesTab classes={myClasses} userProfile={userProfile} />;
			case 'performance': 
			    return <div className={contentWrapperClasses}><StudentPerformanceTab userProfile={userProfile} classes={myClasses} /></div>;
            case 'classes': 
                return (
                    <div>
                        <div className="mb-6 flex justify-end">
                            <button onClick={() => setJoinClassModalOpen(true)} className="btn-primary flex items-center"><PlusCircleIcon className="w-5 h-5 mr-2" /> Join a Class</button>
                        </div>
                        <div className={contentWrapperClasses}>
                            <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                        </div>
                    </div>
                );
            case 'profile': 
                return <ProfilePage />;
            default: 
                return <StudentLessonsTab classes={myClasses} />;
        }
    };
    
    const handleViewChange = (newView) => {
        setView(newView);
        setIsSidebarOpen(false);
    };

    const sidebarNavItems = [
        { view: 'lessons', text: 'Lessons', icon: BookOpenIcon },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardDocumentListIcon },
        { view: 'performance', text: 'Performance', icon: ChartBarIcon },
        { view: 'classes', text: 'My Classes', icon: AcademicCapIcon },
        { view: 'profile', text: 'Profile', icon: UserIcon },
    ];

    const SidebarContent = () => (
        <div className="bg-white/90 h-full p-4">
            <div className="flex items-center gap-2 mb-6 px-2">
                <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-9 h-9 rounded-full" />
                <span className="font-bold text-lg">SRCS Portal</span>
            </div>
            <div className="bg-white/60 p-4 rounded-xl">
                {sidebarNavItems.map(item => (
                    <SidebarButton 
                        key={item.view}
                        icon={<item.icon className="w-6 h-6"/>} 
                        text={item.text} 
                        onClick={() => handleViewChange(item.view)} 
                        isActive={view === item.view && !selectedClass}
                    />
                ))}
            </div>
        </div>
    );
    
    if (loading) return <Spinner />;

    return (
        <div className="min-h-screen font-sans bg-slate-100">
            <div className="md:flex h-screen">
                <aside className="w-64 flex-shrink-0 hidden md:block shadow-lg">
                    <SidebarContent />
                </aside>
                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-64 h-full">
                        <SidebarContent />
                    </div>
                </div>

                {/* --- THIS IS THE FIX --- */}
                {/* By adding 'relative z-10', we lift this content area above any potential invisible overlays */}
                <div className="flex-1 flex flex-col relative z-10">
                    <header className="bg-white/70 backdrop-blur-lg shadow-sm p-3 flex items-center justify-between sticky top-0 z-40 border-b border-white/20">
                        <button className="md:hidden p-2 rounded-full" onClick={() => setIsSidebarOpen(true)}>
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <div className="flex-1 md:hidden"></div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="flex items-center space-x-2">
                                <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" />
                                <span className="text-slate-900 font-semibold hidden sm:inline">Welcome, {userProfile?.firstName || ''}</span>
                            </div>
                            <button onClick={logout} className="p-2 rounded-full text-red-700 hover:bg-red-500/10" title="Logout">
                                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </header>
                    
                    <main className="p-4 lg:p-6" style={{ paddingBottom: '80px' }}>
                        {renderView()}
                    </main>
                </div>
            </div>
            
            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm flex justify-around md:hidden border-t border-gray-200/80 z-50">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view && !selectedClass;
                    return (
                        <button 
                            key={item.view} 
                            onClick={() => handleViewChange(item.view)} 
                            className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 text-center transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-xs mt-1">{item.text}</span>
                        </button>
                    )
                })}
            </footer>

            <JoinClassModal 
                isOpen={isJoinClassModalOpen}
                onClose={() => setJoinClassModalOpen(false)}
            />
        </div>
    );
};

export default StudentDashboard;