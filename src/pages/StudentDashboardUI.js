import React from 'react';
import { Card, Text, Button, Title } from '@tremor/react';
// --- Using a consistent, modern icon set from Lucide ---
import {
    LogOut,
    Menu,
    PlusCircle,
    Clock,
    CheckCircle,
    AlertTriangle,
    BookCopy,
    ClipboardCheck,
    BarChart3,
    Users,
    User,
} from 'lucide-react';
import ProfilePage from './ProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';

// --- UI Component: Loading Spinner (Light Theme) ---
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-24">
        <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
            <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
            <path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </path>
        </svg>
    </div>
);

// --- Color themes for Lesson Cards ---
const cardThemes = [
    { text: 'text-blue-600', bg: 'bg-blue-100', border: 'hover:border-blue-300' },
    { text: 'text-green-600', bg: 'bg-green-100', border: 'hover:border-green-300' },
    { text: 'text-purple-600', bg: 'bg-purple-100', border: 'hover:border-purple-300' },
    { text: 'text-amber-600', bg: 'bg-amber-100', border: 'hover:border-amber-300' },
];

// --- UI Component: Lesson Card (Light Theme) ---
export const LessonCard = ({ lesson, onSelect, index }) => {
    const theme = cardThemes[index % cardThemes.length];

    return (
        <div
            onClick={() => onSelect(lesson)}
            className={`group relative p-5 rounded-xl bg-white border border-gray-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer ${theme.border}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className={`${theme.bg} p-3 rounded-lg`}>
                        <BookCopy size={24} className={theme.text} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">{lesson.title}</p>
                        <p className="text-sm text-gray-500">{lesson.className}</p>
                    </div>
                </div>
                <Button onClick={(e) => { e.stopPropagation(); onSelect(lesson); }} variant="light" className="text-gray-600 hover:text-gray-900">View</Button>
            </div>
        </div>
    );
};

// --- UI Component: Quiz Card (Light Theme) ---
export const QuizCard = ({ quiz, onTakeQuiz, status }) => {
    let buttonText = `Take Quiz (${quiz.attemptsTaken}/3)`;
    if (status === 'completed') buttonText = 'View Submissions';
    else if (status === 'overdue') buttonText = 'Take Quiz (Late)';

    const getStatusInfo = () => {
        switch (status) {
            case 'completed': return { icon: <CheckCircle size={18} />, buttonClass: 'btn-success' };
            case 'overdue': return { icon: <AlertTriangle size={18} />, buttonClass: 'btn-danger' };
            default: return { icon: <ClipboardCheck size={18} />, buttonClass: 'btn-primary' };
        }
    };

    const { icon, buttonClass } = getStatusInfo();
    
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
                <p className="font-semibold text-gray-800">{quiz.title}</p>
                <p className="text-sm text-gray-500">{quiz.className}</p>
                {quiz.deadline && (
                    <p className={`text-xs mt-2 flex items-center ${status === 'overdue' && status !== 'completed' ? 'text-red-600' : 'text-gray-500'}`}>
                        <Clock size={14} className="mr-1.5" />
                        Due: {quiz.deadline.toLocaleString()}
                    </p>
                )}
            </div>
            <button
                onClick={() => onTakeQuiz(quiz)}
                className={`${buttonClass} flex items-center justify-center w-full sm:w-auto text-sm px-4 py-2 font-semibold`}
            >
                {icon}
                <span className="ml-2">{buttonText}</span>
            </button>
        </div>
    );
}

// --- UI Component: Sidebar (Light Theme) ---
// It now receives sidebarNavItems as a prop
const SidebarContent = ({ view, handleViewChange, sidebarNavItems }) => {
    return (
        <div className="h-full flex flex-col p-3">
            <div className="flex items-center gap-3 mb-8 px-2 pt-2">
                <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-9 h-9" />
                <span className="font-bold text-xl text-gray-800">SRCS Portal</span>
            </div>
            <nav className="flex flex-col gap-1">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view;
                    return (
                        <button 
                            key={item.view}
                            onClick={() => handleViewChange(item.view)} 
                            className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? `${item.bg} ${item.color}` : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                        >
                            <item.icon size={20} className={isActive ? item.color : 'text-gray-400'} />
                            <span>{item.text}</span>
                        </button>
                    )
                })}
            </nav>
        </div>
    );
};

// --- Main UI Component (Light Theme) ---
const StudentDashboardUI = ({
    userProfile, logout, view, isSidebarOpen, setIsSidebarOpen, handleViewChange,
    setJoinClassModalOpen, selectedClass, setSelectedClass, myClasses, isFetchingContent,
    lessons, setLessonToView, quizzes, activeQuizTab, setActiveQuizTab, handleTakeQuizClick
}) => {
    
    // --- THIS IS THE FIX ---
    // The navigation items are now defined in the parent component
    const sidebarNavItems = [
        { view: 'lessons', text: 'Lessons', icon: BookCopy, color: 'text-blue-600', bg: 'bg-blue-50' },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardCheck, color: 'text-green-600', bg: 'bg-green-50' },
        { view: 'performance', text: 'Performance', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
        { view: 'classes', text: 'My Classes', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        { view: 'profile', text: 'Profile', icon: User, color: 'text-gray-600', bg: 'bg-gray-100' },
    ];

    const renderView = () => {
        if (isFetchingContent && view !== 'profile' && !selectedClass) { return <LoadingSpinner />; }
        if (selectedClass) { return <StudentClassDetailView selectedClass={selectedClass} onBack={() => setSelectedClass(null)} />; }
        
        switch (view) {
            case 'lessons':
                return (
                    <div>
                        <Title className="text-3xl font-bold text-gray-800 mb-2">My Lessons</Title>
                        <Text className="mb-8">Here are the study guides and materials assigned to you.</Text>
                        <div className="space-y-4">
                            {lessons.length > 0 ? lessons.map((lesson, index) => (
                                <LessonCard key={lesson.postId} lesson={lesson} onSelect={setLessonToView} index={index} />
                            )) : 
                            <div className="text-center py-16 bg-gray-100 rounded-lg border border-dashed border-gray-300">
                                <Text className="text-gray-500">No lessons have been assigned to you yet.</Text>
                            </div>
                            }
                        </div>
                    </div>
                );
            case 'quizzes':
                return (
                    <div>
                        <Title className="text-3xl font-bold text-gray-800 mb-2">My Quizzes</Title>
                        <Text className="mb-8">Complete your quizzes to test your knowledge.</Text>
                        <div className="border-b border-gray-200 mb-6">
                            <nav className="flex space-x-6 -mb-px">
                                <button onClick={() => setActiveQuizTab('active')} className={`pb-3 font-medium text-sm transition-colors ${activeQuizTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Active</button>
                                <button onClick={() => setActiveQuizTab('completed')} className={`pb-3 font-medium text-sm transition-colors ${activeQuizTab === 'completed' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Completed</button>
                                <button onClick={() => setActiveQuizTab('overdue')} className={`pb-3 font-medium text-sm transition-colors ${activeQuizTab === 'overdue' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Overdue</button>
                            </nav>
                        </div>
                        <div className="space-y-4">
                            {quizzes[activeQuizTab].length > 0 ? quizzes[activeQuizTab].map(quiz => (
                                <QuizCard 
                                    key={quiz.postId} 
                                    quiz={quiz} 
                                    onTakeQuiz={handleTakeQuizClick}
                                    status={activeQuizTab} 
                                />
                            )) : <div className="text-center py-16 bg-gray-100 rounded-lg border border-dashed border-gray-300"><Text className="text-gray-500">No quizzes in this category.</Text></div>}
                        </div>
                    </div>
                );
            case 'performance': 
                return <StudentPerformanceTab userProfile={userProfile} classes={myClasses} />;
            case 'classes': 
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <Title className="text-3xl font-bold text-gray-800 mb-2">My Classes</Title>
                                <Text>Manage your class enrollments.</Text>
                            </div>
                            <Button onClick={() => setJoinClassModalOpen(true)} icon={PlusCircle}>Join a Class</Button>
                        </div>
                        <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                    </div>
                );
            case 'profile': 
                return <ProfilePage />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen font-sans bg-gray-100 text-gray-800">
            <div className="md:flex h-screen">
                {/* Desktop Sidebar */}
                <aside className="w-64 flex-shrink-0 hidden md:block bg-white border-r border-gray-200">
                    <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} />
                </aside>
                {/* Mobile Sidebar */}
                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-64 h-full bg-white">
                        <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} />
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <header className="bg-white/80 backdrop-blur-lg p-4 flex items-center justify-between sticky top-0 z-40 border-b border-gray-200">
                        <button className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100" onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
                        <div className="flex-1 md:hidden"></div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" />
                                <span className="text-gray-800 font-semibold hidden sm:inline">Welcome, {userProfile?.firstName || ''}</span>
                            </div>
                            <button onClick={logout} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors" title="Logout">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </header>
                    
                    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                        {renderView()}
                    </main>
                </div>
            </div>
            
            {/* Mobile Bottom Nav */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm flex justify-around md:hidden border-t border-gray-200 z-50">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view;
                    return (
                        <button 
                            key={item.view} 
                            onClick={() => handleViewChange(item.view)} 
                            className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 text-center transition-colors duration-200 ${isActive ? item.color : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <item.icon size={20} className={isActive ? item.color : 'text-gray-400'} />
                            <span className="text-xs mt-1">{item.text}</span>
                        </button>
                    )
                })}
            </footer>
        </div>
    );
};

export default StudentDashboardUI;
