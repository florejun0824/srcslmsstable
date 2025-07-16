import React from 'react';
import { Card, Text, Button, Title, Badge, List, ListItem } from '@tremor/react';
import {
    AcademicCapIcon,
    ClipboardDocumentCheckIcon,
    ChartBarIcon,
    UserGroupIcon,
    UserIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PlusCircleIcon,
    Bars3Icon,
    ArrowLeftOnRectangleIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
    CalculatorIcon,
    BeakerIcon,
    GlobeAltIcon,
    LanguageIcon,
    ComputerDesktopIcon,
    SwatchIcon,
} from '@heroicons/react/24/outline';

import ProfilePage from './ProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import StudentQuizzesTab from '../components/student/StudentQuizzesTab';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';

// --- UI Component: Loading Spinner ---
const LoadingSpinner = () => (
    <div className="flex flex-col justify-center items-center py-24 text-blue-500 rounded-xl">
        <svg className="animate-spin h-10 w-10 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <Text className="text-lg font-medium text-gray-600">Loading content...</Text>
    </div>
);

// ... (The rest of your components like getSubjectInfo, ClassLessonCard, etc. remain the same) ...
// --- Subject Category Definitions ---
const defaultSubjectCategories = {
    'Mathematics': { icon: CalculatorIcon, color: 'text-purple-600', bg: 'bg-purple-50', badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', badgeBorder: 'border-purple-200' },
    'Science': { icon: BeakerIcon, color: 'text-green-600', bg: 'bg-green-50', badgeBg: 'bg-green-100', badgeText: 'text-green-800', badgeBorder: 'border-green-200' },
    'History': { icon: GlobeAltIcon, color: 'text-orange-600', bg: 'bg-orange-50', badgeBg: 'bg-orange-100', badgeText: 'text-orange-800', badgeBorder: 'border-orange-200' },
    'English': { icon: LanguageIcon, color: 'text-red-600', bg: 'bg-red-50', badgeBg: 'bg-red-100', badgeText: 'text-red-800', badgeBorder: 'border-red-200' },
    'Computer Science': { icon: ComputerDesktopIcon, color: 'text-blue-600', bg: 'bg-blue-50', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', badgeBorder: 'border-blue-200' },
    'Arts': { icon: SwatchIcon, color: 'text-pink-600', bg: 'bg-pink-50', badgeBg: 'bg-pink-100', badgeText: 'text-pink-800', badgeBorder: 'border-pink-200' },
    'Uncategorized': { icon: AcademicCapIcon, color: 'text-gray-600', bg: 'bg-gray-50', badgeBg: 'bg-gray-100', badgeText: 'text-gray-800', badgeBorder: 'border-gray-200' },
};

// --- Helper: Get subject info based on course category ---
const getSubjectInfo = (courseCategory) => {
    return defaultSubjectCategories[courseCategory] || defaultSubjectCategories['Uncategorized'];
};

export const ClassLessonCard = ({ classData, onSelectClass }) => {
    const { icon: CategoryIcon, color } = getSubjectInfo(classData.category);

    return (
        <Card
            onClick={() => onSelectClass(classData)}
            className="flex flex-col items-center p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer text-center"
        >
            <CategoryIcon className={`h-12 w-12 mb-4 ${color}`} />
            <Text className="text-xl font-semibold text-gray-800">{classData.title}</Text>
            <Text className="text-sm text-gray-500 mt-1">{classData.category}</Text>
            {classData.description && (
                <Text className="text-xs text-gray-400 mt-2 line-clamp-2">{classData.description}</Text>
            )}
        </Card>
    );
};

export const LessonCard = ({ lesson, onSelect, coursesMap }) => {
    const lessonCourse = coursesMap[lesson.courseId] || { title: 'Uncategorized Course', category: 'Uncategorized' };
    const { icon: SubjectIcon, color, badgeBg, badgeText, badgeBorder } = getSubjectInfo(lessonCourse.category);

    return (
        <ListItem
            onClick={() => onSelect(lesson)}
            className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 ease-in-out"
        >
            <div className="flex items-center gap-3 text-left mb-2 md:mb-0">
                <SubjectIcon className={`h-6 w-6 ${color} flex-shrink-0`} />
                <div>
                    <Text className="text-lg font-semibold text-gray-800">{lesson.title}</Text>
                    {lessonCourse.title && (
                        <Badge className={`mt-1 mr-auto ${badgeBg} ${badgeText} ${badgeBorder} font-medium`} size="sm">
                            {lessonCourse.title}
                        </Badge>
                    )}
                </div>
            </div>
            <ChevronRightIcon className="h-6 w-6 text-gray-400 ml-auto md:ml-4 flex-shrink-0 group-hover:text-blue-500" />
        </ListItem>
    );
};

export const QuizCard = ({ quiz, onTakeQuiz, status }) => {
    let buttonText = `Take Quiz (${quiz.attemptsTaken || 0}/3)`;
    if (status === 'completed') buttonText = 'View Submissions';
    else if (status === 'overdue') buttonText = 'Take Quiz (Late)';

    const getStatusInfo = () => {
        switch (status) {
            case 'completed': return { icon: <CheckCircleIcon className="text-white h-5 w-5" />, buttonClass: 'bg-green-500 hover:bg-green-600', badgeColor: 'emerald' };
            case 'overdue': return { icon: <ExclamationTriangleIcon className="text-white h-5 w-5" />, buttonClass: 'bg-red-500 hover:bg-red-600', badgeColor: 'rose' };
            default: return { icon: <ClipboardDocumentCheckIcon className="text-white h-5 w-5" />, buttonClass: 'bg-blue-600 hover:bg-blue-700', badgeColor: 'blue' };
        }
    };

    const { icon, buttonClass, badgeColor } = getStatusInfo();

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    <Text className="font-semibold text-gray-800 text-lg">{quiz.title}</Text>
                    {quiz.availableUntil && (
                        <Badge color={badgeColor} size="xs" className="font-medium">
                            {status === 'completed' ? 'Completed' : status === 'overdue' ? 'Overdue' : 'Active'}
                        </Badge>
                    )}
                </div>
                <Text className="text-sm text-gray-500">{quiz.className || quiz.context?.replace('(for ', '').replace(')', '')}</Text>
                {quiz.availableUntil && (
                    <Text className={`text-xs mt-2 flex items-center ${status === 'overdue' ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                        <ClockIcon className="h-4 w-4 mr-1.5" />
                        Due: {quiz.availableUntil.toDate().toLocaleString()}
                    </Text>
                )}
            </div>
            <Button
                onClick={() => onTakeQuiz(quiz)}
                className={`${buttonClass} flex items-center justify-center w-full sm:w-auto text-sm px-5 py-2.5 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-white`}
                icon={icon}
            >
                {buttonText}
            </Button>
        </div>
    );
}

// --- UI Component: Sidebar ---
const SidebarContent = ({ view, handleViewChange, sidebarNavItems }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 mb-10 px-2 pt-2">
                <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-10 h-10 rounded-full" />
                <span className="font-extrabold text-xl text-gray-800">SRCS Portal</span>
            </div>
            <nav className="flex flex-col gap-2">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => handleViewChange(item.view)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-250
                                ${isActive
                                    ? `bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform translate-x-1`
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : item.color}`} />
                            <span>{item.text}</span>
                        </button>
                    )
                })}
            </nav>
        </div>
    );
};
// --- Main UI Component ---
const StudentDashboardUI = ({
    userProfile, logout, view, isSidebarOpen, setIsSidebarOpen, handleViewChange,
    setJoinClassModalOpen, selectedClass, setSelectedClass, myClasses, isFetchingContent,
}) => {
    const sidebarNavItems = [
        { view: 'classes', text: 'My Classes', icon: UserGroupIcon, color: 'text-amber-500', bg: 'bg-amber-100' },
        { view: 'quizzes', text: 'Quizzes', icon: ClipboardDocumentCheckIcon, color: 'text-green-500', bg: 'bg-green-100' },
        { view: 'performance', text: 'Performance', icon: ChartBarIcon, color: 'text-purple-500', bg: 'bg-purple-100' },
        { view: 'profile', text: 'Profile', icon: UserIcon, color: 'text-gray-500', bg: 'bg-gray-100' },
    ];

    const renderView = () => {
        if (isFetchingContent && !selectedClass && view !== 'profile') {
            return <LoadingSpinner />;
        }
        if (selectedClass) { return <StudentClassDetailView selectedClass={selectedClass} onBack={() => setSelectedClass(null)} />; }

        switch (view) {
            case 'classes':
            case 'default':
                return (
                     <Card className="max-w-full mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 bg-gradient-to-br from-white to-amber-50/50">
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                            <div className="flex items-center gap-3">
                                {/* ✅ FIXED: Smaller icon on mobile */}
                                <UserGroupIcon className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
                                {/* ✅ FIXED: Smaller, responsive title font size */}
                                <Title className="text-xl sm:text-2xl font-extrabold text-gray-800">My Classes</Title>
                            </div>
                            <Button
                                onClick={() => setJoinClassModalOpen(true)}
                                className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                icon={PlusCircleIcon}
                            >
                                Join Class
                            </Button>
                        </div>
                        {/* ✅ FIXED: Smaller, responsive description font size */}
                        <Text className="text-sm text-gray-600 mb-6 sm:mb-8 max-w-2xl">Manage your class enrollments and explore class-specific announcements, lessons, and assignments.</Text>
                        <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                    </Card>
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
        <div className="min-h-screen font-sans bg-gray-50 text-gray-800 md:p-4">
            <div className="h-full overflow-hidden bg-white rounded-none md:rounded-3xl shadow-lg md:flex md:gap-4">

                {/* Desktop Sidebar */}
                <aside className="w-72 flex-shrink-0 hidden md:block bg-white rounded-2xl p-4">
                    <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} />
                </aside>

                {/* Mobile Sidebar */}
                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-64 h-full bg-white shadow-xl rounded-r-3xl p-4">
                        <SidebarContent view={view} handleViewChange={handleViewChange} sidebarNavItems={sidebarNavItems} />
                    </div>
                </div>

                {/* Main Content Area (right panel) */}
                <div className="flex-1 flex flex-col bg-gray-50 rounded-none md:rounded-2xl overflow-hidden">
                    <header className="bg-white/90 backdrop-blur-xl p-4 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 shadow-sm md:rounded-t-2xl">
                        <button className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" onClick={() => setIsSidebarOpen(true)}>
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <div className="flex-1 md:hidden"></div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="md" />
                                <span className="text-gray-800 font-semibold hidden sm:inline">Hello, <span className="text-blue-600">{userProfile?.firstName || 'Student'}</span>!</span>
                            </div>
                            <Button onClick={logout} variant="light" className="p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Logout" icon={ArrowLeftOnRectangleIcon}>
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50 md:rounded-br-2xl">
                        {renderView()}
                    </main>
                </div>

                {/* Mobile Bottom Nav */}
                <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg flex justify-around md:hidden border-t border-gray-100 shadow-lg rounded-t-3xl">
                    {sidebarNavItems.map(item => {
                        const isActive = view === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleViewChange(item.view)}
                                className={`flex-1 flex flex-col items-center justify-center py-2 text-center transition-colors duration-200 rounded-xl
                                    ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <item.icon className={`h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className="text-xs mt-1 font-medium">{item.text}</span>
                            </button>
                        )
                    })}
                </footer>
                {/* Spacer to prevent content from being hidden by the bottom nav */}
                <div className="pb-16 md:pb-0"></div>
            </div>
        </div>
    );
};


export default StudentDashboardUI;