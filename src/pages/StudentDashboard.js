import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, documentId } from 'firebase/firestore';
import { Card, Flex, Text, Button, Title } from '@tremor/react';
import {
  BookOpenIcon,
  ChartBarIcon,
  AcademicCapIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
    BookOpenIcon as BookOpenIconSolid,
    ChartBarIcon as ChartBarIconSolid,
    AcademicCapIcon as AcademicCapIconSolid,
    UserIcon as UserIconSolid,
    ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
} from '@heroicons/react/24/solid';
import ProfilePage from './ProfilePage';
import StudentClassesTab from '../components/student/StudentClassesTab';
import StudentPerformanceTab from '../components/student/StudentPerformanceTab';
import StudentClassDetailView from '../components/student/StudentClassDetailView';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import Spinner from '../components/common/Spinner';
import SidebarButton from '../components/common/SidebarButton';
import JoinClassModal from '../components/student/JoinClassModal';
import ViewQuizModal from '../components/teacher/ViewQuizModal';
import ViewLessonModal from '../components/student/ViewLessonModal';

const LessonCard = ({ lesson, onSelect }) => (
    <Card 
        onClick={() => onSelect(lesson)}
        className="group relative p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
    >
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-10 group-hover:opacity-20 transition-all duration-300"></div>
        <div className="absolute bottom-0 left-0 w-32 h-2 bg-gradient-to-r from-sky-400 to-cyan-400 opacity-20 group-hover:opacity-40 rounded-full transition-all duration-300"></div>
        <div className="relative z-10">
            <Flex>
                <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-3 rounded-xl shadow-md">
                        <BookOpenIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <Text className="text-base font-bold text-tremor-content-strong group-hover:text-blue-600 transition-colors">{lesson.title}</Text>
                        <Text>{lesson.className}</Text>
                    </div>
                </div>
                <Button onClick={(e) => { e.stopPropagation(); onSelect(lesson); }} variant="light">View</Button>
            </Flex>
        </div>
    </Card>
);

const QuizCard = ({ quiz, onTakeQuiz, status }) => {
    const isCompleted = status === 'completed';
    let buttonText = `Take Quiz (${quiz.attemptsTaken}/3)`;
    if (status === 'completed') {
        buttonText = 'View Submissions';
    } else if (status === 'overdue') {
        // MODIFIED: Update button text for overdue quizzes
        buttonText = 'Take Quiz (Late)';
    }

    const getIcon = () => {
        switch (status) {
            case 'completed': return <CheckCircleIcon className="w-5 h-5 mr-2" />;
            case 'overdue': return <ExclamationTriangleIcon className="w-5 h-5 mr-2" />;
            default: return <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />;
        }
    };
    const getButtonClass = () => {
        switch (status) {
            case 'completed': return 'btn-success';
            // MODIFIED: Make the overdue button a clickable red button
            case 'overdue': return 'btn-danger';
            default: return 'btn-primary';
        }
    };
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <p className="font-bold text-gray-800">{quiz.title}</p>
                <p className="text-sm text-gray-500">{quiz.className}</p>
                {quiz.deadline && (
                    <p className={`text-xs mt-1 flex items-center ${status === 'overdue' && !isCompleted ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        <ClockIcon className="w-4 h-4 mr-1.5" />
                        Due: {quiz.deadline.toLocaleString()}
                    </p>
                )}
            </div>
            <button
                onClick={() => onTakeQuiz(quiz)}
                // MODIFIED: The disabled property is removed to make the button clickable
                className={`${getButtonClass()} flex items-center justify-center w-full sm:w-auto`}
            >
                {getIcon()}
                {buttonText}
            </button>
        </div>
    );
}

const StudentDashboard = () => {
    const { userProfile, logout, loading } = useAuth();
    const [view, setView] = useState('lessons'); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isJoinClassModalOpen, setJoinClassModalOpen] = useState(false);
    const [myClasses, setMyClasses] = useState([]);
    const [isFetchingClasses, setIsFetchingClasses] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [quizzes, setQuizzes] = useState({ active: [], completed: [], overdue: [] });
    const [lessons, setLessons] = useState([]);
    const [isFetchingContent, setIsFetchingContent] = useState(true);
    const [activeQuizTab, setActiveQuizTab] = useState('active');
    const [quizToTake, setQuizToTake] = useState(null);
    const [lessonToView, setLessonToView] = useState(null);

    useEffect(() => {
        if (!userProfile?.id) { setIsFetchingClasses(false); return; }
        setIsFetchingClasses(true);
        const classesQuery = query(collection(db, "classes"), where("studentIds", "array-contains", userProfile.id));
        const unsubscribe = onSnapshot(classesQuery, (snapshot) => {
            const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyClasses(classesData);
            setIsFetchingClasses(false);
        }, (error) => { console.error("Error fetching student classes:", error); setIsFetchingClasses(false); });
        return () => unsubscribe();
    }, [userProfile]);

    const fetchContent = useCallback(async () => {
        if (!userProfile?.id || myClasses.length === 0) { setIsFetchingContent(false); return; }
        setIsFetchingContent(true);
        
        try {
            const submissionsQuery = query(collection(db, "quizSubmissions"), where("studentId", "==", userProfile.id));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            const submissionsByQuizId = new Map();
            submissionsSnapshot.forEach(doc => {
                const sub = doc.data();
                const attempts = submissionsByQuizId.get(sub.quizId) || [];
                submissionsByQuizId.set(sub.quizId, [...attempts, sub]);
            });

            const allPostsPromises = myClasses.map(c => getDocs(query(collection(db, `classes/${c.id}/posts`))));
            const allPostsSnapshots = await Promise.all(allPostsPromises);

            const latestPostByQuizId = new Map();
            const latestPostByLessonId = new Map();

            allPostsSnapshots.forEach((postsSnapshot, index) => {
                const currentClass = myClasses[index];
                postsSnapshot.forEach(doc => {
                    const post = { id: doc.id, classId: currentClass.id, className: currentClass.name, ...doc.data() };
                    if (post.quizIds) {
                        post.quizIds.forEach(quizId => {
                            const existingPost = latestPostByQuizId.get(quizId);
                            if (!existingPost || post.createdAt.toMillis() > existingPost.createdAt.toMillis()) {
                                latestPostByQuizId.set(quizId, post);
                            }
                        });
                    }
                    if (post.lessonIds) {
                        post.lessonIds.forEach(lessonId => {
                            const existingPost = latestPostByLessonId.get(lessonId);
                             if (!existingPost || post.createdAt.toMillis() > existingPost.createdAt.toMillis()) {
                                latestPostByLessonId.set(lessonId, post);
                            }
                        });
                    }
                });
            });
            
            const uniqueQuizIds = Array.from(latestPostByQuizId.keys());
            if (uniqueQuizIds.length > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                const quizzesDetails = new Map(quizzesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
                const now = new Date();
                const categorizedQuizzes = { active: [], completed: [], overdue: [] };
                
                for (const [quizId, post] of latestPostByQuizId.entries()) {
                    const quizDetail = quizzesDetails.get(quizId);
                    if (!quizDetail) continue;

                    const submissions = submissionsByQuizId.get(quizId) || [];
                    const deadline = post.availableUntil?.toDate();
                    
                    const isCompleted = submissions.length >= 3;
                    const isOverdue = deadline && now > deadline;

                    const quizItem = { ...quizDetail, className: post.className, classId: post.classId, postId: post.id, deadline, attemptsTaken: submissions.length };

                    if (isCompleted) {
                        categorizedQuizzes.completed.push(quizItem);
                    } else if (isOverdue) {
                        categorizedQuizzes.overdue.push(quizItem);
                    } else {
                        categorizedQuizzes.active.push(quizItem);
                    }
                }
                setQuizzes(categorizedQuizzes);
            } else { setQuizzes({ active: [], completed: [], overdue: [] }); }

            const uniqueLessonIds = Array.from(latestPostByLessonId.keys());
            if (uniqueLessonIds.length > 0) {
                 const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', uniqueLessonIds));
                 const lessonsSnapshot = await getDocs(lessonsQuery);
                 const lessonsDetails = new Map(lessonsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
                 const categorizedLessons = [];
                 for (const [lessonId, post] of latestPostByLessonId.entries()) {
                    const lessonDetail = lessonsDetails.get(lessonId);
                    if(!lessonDetail) continue;
                    categorizedLessons.push({ ...lessonDetail, className: post.className, postId: post.id });
                 }
                 setLessons(categorizedLessons);
            } else { setLessons([]); }
        } catch (error) { console.error("Error fetching content:", error); } 
        finally { setIsFetchingContent(false); }
    }, [userProfile, myClasses]);
    
    useEffect(() => {
        if (!isFetchingClasses && myClasses.length >= 0) { fetchContent(); }
    }, [myClasses, isFetchingClasses, fetchContent]);

    useEffect(() => { if (view !== 'classes') { setSelectedClass(null); } }, [view]);
    
    const handleViewChange = (newView) => { setView(newView); setIsSidebarOpen(false); };

    // MODIFIED: New handler to show a warning for overdue quizzes
    const handleTakeQuizClick = (quiz) => {
        if (activeQuizTab === 'overdue') {
            const proceed = window.confirm("Late submission will be reflected on your teacher's end. Do you want to continue?");
            if (proceed) {
                setQuizToTake(quiz);
            }
        } else {
            setQuizToTake(quiz);
        }
    };

    const renderView = () => {
        const contentWrapperClasses = "bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-lg";

        if ((isFetchingClasses || loading) && view !== 'profile') { return <Spinner />; }
        if (selectedClass) { return <StudentClassDetailView selectedClass={selectedClass} onBack={() => setSelectedClass(null)} />; }
        switch (view) {
            case 'lessons':
                return (
                    <div>
                        <Title>My Lessons</Title>
                        <Text className="mb-6">Here are the study guides and materials assigned to you.</Text>
                         {isFetchingContent ? <Spinner /> : (
                            <div className="space-y-4">
                                {lessons.length > 0 ? lessons.map(lesson => (
                                    <LessonCard key={lesson.postId} lesson={lesson} onSelect={setLessonToView} />
                                )) : 
                                <Card className="py-10">
                                    <Text className="text-center text-gray-500">No lessons have been assigned to you yet.</Text>
                                </Card>
                                }
                            </div>
                         )}
                    </div>
                );
			case 'quizzes':
                return (
                    <div className={contentWrapperClasses}>
                        <h1 className="text-2xl font-bold text-gray-800 mb-4">My Quizzes</h1>
                        <div className="border-b border-gray-200 mb-4">
                            <nav className="flex space-x-4 -mb-px">
                                <button onClick={() => setActiveQuizTab('active')} className={`flex items-center gap-2 px-3 py-2 font-medium text-sm rounded-t-lg ${activeQuizTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <ClipboardDocumentListIcon className="w-5 h-5"/> Active
                                </button>
                                <button onClick={() => setActiveQuizTab('completed')} className={`flex items-center gap-2 px-3 py-2 font-medium text-sm rounded-t-lg ${activeQuizTab === 'completed' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <CheckCircleIcon className="w-5 h-5"/> Completed
                                </button>
                                <button onClick={() => setActiveQuizTab('overdue')} className={`flex items-center gap-2 px-3 py-2 font-medium text-sm rounded-t-lg ${activeQuizTab === 'overdue' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <ExclamationTriangleIcon className="w-5 h-5"/> Overdue
                                </button>
                            </nav>
                        </div>
                        {isFetchingContent ? <Spinner /> : (
                            <div className="space-y-3">
                                {quizzes[activeQuizTab].length > 0 ? quizzes[activeQuizTab].map(quiz => (
                                    <QuizCard 
                                        key={quiz.postId} 
                                        quiz={quiz} 
                                        onTakeQuiz={handleTakeQuizClick} // MODIFIED: Use the new handler
                                        status={activeQuizTab} 
                                    />
                                )) : <p className="text-center py-8 text-gray-500">No quizzes in this category.</p>}
                            </div>
                        )}
                    </div>
                );
			case 'performance': 
			    return <div className={contentWrapperClasses}><StudentPerformanceTab userProfile={userProfile} classes={myClasses} /></div>;
            case 'classes': 
                return (
                    <div>
                        <div className="mb-6 flex justify-end">
                            <Button onClick={() => setJoinClassModalOpen(true)} icon={PlusCircleIcon}>Join a Class</Button>
                        </div>
                        <div className={contentWrapperClasses}>
                            <StudentClassesTab classes={myClasses} onClassSelect={setSelectedClass} />
                        </div>
                    </div>
                );
            case 'profile': 
                return <ProfilePage />;
            default:
                return (
                    <div>
                        <Title>My Lessons</Title>
                        <Text className="mb-6">Here are the study guides and materials assigned to you.</Text>
                         {isFetchingContent ? <Spinner /> : (
                            <div className="space-y-4">
                                {lessons.length > 0 ? lessons.map(lesson => (
                                    <LessonCard key={lesson.postId} lesson={lesson} onSelect={setLessonToView} />
                                )) : 
                                <Card className="py-10">
                                    <Text className="text-center text-gray-500">No lessons have been assigned to you yet.</Text>
                                </Card>
                                }
                            </div>
                         )}
                    </div>
                );
        }
    };
    
    const sidebarNavItems = [
        { view: 'lessons', text: 'Lessons', outlineIcon: BookOpenIcon, solidIcon: BookOpenIconSolid },
        { view: 'quizzes', text: 'Quizzes', outlineIcon: ClipboardDocumentListIcon, solidIcon: ClipboardDocumentListIconSolid },
        { view: 'performance', text: 'Performance', outlineIcon: ChartBarIcon, solidIcon: ChartBarIconSolid },
        { view: 'classes', text: 'My Classes', outlineIcon: AcademicCapIcon, solidIcon: AcademicCapIconSolid },
        { view: 'profile', text: 'Profile', outlineIcon: UserIcon, solidIcon: UserIconSolid },
    ];

    const SidebarContent = () => (
        <div className="bg-white/90 h-full p-4">
            <div className="flex items-center gap-2 mb-6 px-2">
                <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-9 h-9 rounded-full" />
                <span className="font-bold text-lg">SRCS Portal</span>
            </div>
            <div className="bg-white/60 p-4 rounded-xl">
                {sidebarNavItems.map(item => {
                    const isActive = view === item.view && !selectedClass;
                    const Icon = isActive ? item.solidIcon : item.outlineIcon;
                    return (
                        <SidebarButton 
                            key={item.view}
                            icon={<Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : ''}`}/>} 
                            text={item.text} 
                            onClick={() => handleViewChange(item.view)} 
                            isActive={isActive}
                        />
                    )
                })}
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

                <div className="flex-1 flex flex-col relative z-10">
                    <header className="bg-white/70 backdrop-blur-lg shadow-sm p-3 flex items-center justify-between sticky top-0 z-40 border-b border-white/20">
                        <button className="md:hidden p-2 rounded-full" onClick={() => setIsSidebarOpen(true)}><Bars3Icon className="h-6 w-6" /></button>
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
                    const Icon = isActive ? item.solidIcon : item.outlineIcon;
                    return (
                        <button 
                            key={item.view} 
                            onClick={() => handleViewChange(item.view)} 
                            className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 text-center transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs mt-1">{item.text}</span>
                        </button>
                    )
                })}
            </footer>

            <JoinClassModal isOpen={isJoinClassModalOpen} onClose={() => setJoinClassModalOpen(false)} />
            
            <ViewQuizModal
                isOpen={!!quizToTake}
                onClose={() => {
                    setQuizToTake(null);
                    fetchContent();
                }}
                quiz={quizToTake}
                userProfile={userProfile}
                classId={quizToTake?.classId}
            />
            <ViewLessonModal
                isOpen={!!lessonToView}
                onClose={() => setLessonToView(null)}
                lesson={lessonToView}
            />
        </div>
    );
};

export default StudentDashboard;