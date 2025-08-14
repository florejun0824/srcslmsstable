import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where, documentId } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import ViewLessonModal from '../student/ViewLessonModal';
import ViewQuizModal from '../teacher/ViewQuizModal'; // Keep import as it's used for the modal itself
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import { useAuth } from '../../contexts/AuthContext';
import { MegaphoneIcon, BookOpenIcon, AcademicCapIcon, ArrowLeftIcon, SparklesIcon, ArrowRightIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'; // AcademicCapIcon for quizzes is no longer needed for tab, but keep for list item if used elsewhere

const StudentClassDetailView = ({ selectedClass, onBack }) => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('announcements');
    const [announcements, setAnnouncements] = useState([]);
    const [lessonsByUnit, setLessonsByUnit] = useState({});
    // const [quizzesByUnit, setQuizzesByUnit] = useState({}); // REMOVED: No longer needed for this view
    const [loading, setLoading] = useState(true);
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null); // Keep for passing quiz data to modal
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [collapsedUnits, setCollapsedUnits] = useState(new Set()); // State to manage collapsed units

    // Function to toggle unit collapse
    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) {
                newSet.delete(unitTitle);
            } else {
                newSet.add(unitTitle);
            }
            return newSet;
        });
    };

    const fetchData = useCallback(async () => {
        if (!selectedClass?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const annQuery = query(collection(db, "studentAnnouncements"), where("classId", "==", selectedClass.id), orderBy("createdAt", "desc"));
            const annSnap = await getDocs(annQuery);
            setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const postsQuery = query(collection(db, `classes/${selectedClass.id}/posts`), orderBy('createdAt', 'desc'));
            const postsSnap = await getDocs(postsQuery);

            const lessonIdSet = new Set();
            // const quizIdSet = new Set(); // REMOVED
            // const quizPostContexts = new Map(); // REMOVED

            postsSnap.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };
                if (Array.isArray(post.lessonIds)) post.lessonIds.forEach(id => lessonIdSet.add(id));
                // REMOVED quiz-related post parsing
                // if (Array.isArray(post.quizIds)) {
                //     post.quizIds.forEach(id => {
                //         quizIdSet.add(id);
                //         if (!quizPostContexts.has(id)) {
                //              quizPostContexts.set(id, { availableUntil: post.availableUntil });
                //         }
                //     });
                // }
            });

            // --- Fetch Lessons and Group by Unit ---
            let fetchedLessons = [];
            if (lessonIdSet.size > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', Array.from(lessonIdSet)));
                const lessonsSnap = await getDocs(lessonsQuery);
                fetchedLessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                fetchedLessons.sort((a, b) => {
                    const orderA = a.order ?? Infinity;
                    const orderB = b.order ?? Infinity;
                    if (orderA !== orderB) return orderA - orderB;
                    const numA = parseInt(a.title.match(/\d+/)?.[0] || 0, 10);
                    const numB = parseInt(b.title.match(/\d+/)?.[0] || 0, 10);
                    return numA - numB;
                });
            }

            // --- REMOVED: Fetch Quizzes and Group by Unit ---
            // let fetchedQuizzes = [];
            // if (quizIdSet.size > 0) {
            //     const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', Array.from(quizIdSet)));
            //     const quizzesSnap = await getDocs(quizzesQuery);
            //     fetchedQuizzes = quizzesSnap.docs.map(d => {
            //         const quizData = { id: d.id, ...d.data() };
            //         const postContext = quizPostContexts.get(quizData.id);
            //         return { ...quizData, availableUntil: postContext?.availableUntil };
            //     });
            // }

            // Collect all unique unit IDs from both lessons (and previously quizzes)
            const uniqueUnitIds = new Set([
                ...fetchedLessons.map(lesson => lesson.unitId).filter(Boolean),
                // ...fetchedQuizzes.map(quiz => quiz.unitId).filter(Boolean) // REMOVED
            ]);
            
            const unitsMap = new Map();
            if (uniqueUnitIds.size > 0) {
                const unitsQuery = query(collection(db, 'units'), where(documentId(), 'in', Array.from(uniqueUnitIds)));
                const unitsSnap = await getDocs(unitsQuery);
                unitsSnap.forEach(doc => unitsMap.set(doc.id, doc.data().title));
            }

            const groupedLessons = {};
            fetchedLessons.forEach(lesson => {
                const unitTitle = unitsMap.get(lesson.unitId) || 'Uncategorized';
                if (!groupedLessons[unitTitle]) {
                    groupedLessons[unitTitle] = [];
                }
                groupedLessons[unitTitle].push(lesson);
            });
            setLessonsByUnit(groupedLessons);

            // REMOVED: Quiz grouping
            // const groupedQuizzes = {};
            // fetchedQuizzes.forEach(quiz => {
            //     const unitTitle = unitsMap.get(quiz.unitId) || 'Uncategorized'; // Assuming quizzes also have unitId
            //     if (!groupedQuizzes[unitTitle]) {
            //         groupedQuizzes[unitTitle] = [];
            //     }
            //     groupedQuizzes[unitTitle].push(quiz);
            // });
            // setQuizzesByUnit(groupedQuizzes);

            // Initialize all units as collapsed by default (only for lessons now)
            const allUnitTitles = new Set(Object.keys(groupedLessons)); // Only lessons contribute to units here
            setCollapsedUnits(allUnitTitles);

        } catch (error) {
            console.error("Failed to fetch class details:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Updated tab classes for a pill/segmented look
    const getTabClasses = (tabName) => `
        flex items-center justify-center flex-1 gap-2 px-4 py-2 font-semibold text-sm rounded-lg transition-all duration-300 ease-in-out
        ${activeTab === tabName ? 'bg-blue-700 text-white shadow-md' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}
    `;
    
    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

        // Enhanced EmptyState component
        const EmptyState = ({ icon: Icon, text, subtext, color }) => (
            <div className={`text-center py-12 px-4 bg-${color}-50/50 rounded-xl shadow-inner border border-${color}-200`}>
                <Icon className={`h-16 w-16 mb-4 text-${color}-300 mx-auto`} />
                <p className={`text-xl font-semibold text-${color}-600`}>{text}</p>
                <p className={`mt-2 text-md text-${color}-400`}>{subtext}</p>
            </div>
        );

        switch(activeTab) {
            case 'lessons':
                const lessonUnitTitles = Object.keys(lessonsByUnit).sort();
                return lessonUnitTitles.length > 0 ? (
                    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                        {lessonUnitTitles.map(unitTitle => (
                            <div key={unitTitle} className="bg-white rounded-xl shadow-sm border border-slate-100">
                                <button 
                                    className="flex items-center justify-between w-full p-4 font-bold text-lg text-slate-800 hover:bg-slate-50 rounded-t-xl transition-colors"
                                    onClick={() => toggleUnitCollapse(unitTitle)}
                                >
                                    {unitTitle}
                                    {collapsedUnits.has(unitTitle) ? (
                                        <ChevronDownIcon className="h-6 w-6 text-slate-500" />
                                    ) : (
                                        <ChevronUpIcon className="h-6 w-6 text-slate-500" />
                                    )}
                                </button>
                                {!collapsedUnits.has(unitTitle) && (
                                    <div className="p-4 space-y-4 border-t border-slate-100">
                                        {lessonsByUnit[unitTitle].map(lesson => (
                                            <LessonListItemForStudent key={lesson.id} lesson={lesson} onClick={() => setViewLessonData(lesson)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState 
                        icon={BookOpenIcon}
                        text="No lessons are available yet."
                        subtext="Your teacher will post lessons here."
                        color="sky"
                    />
                );
            case 'announcements':
            default:
                return announcements.length > 0 ? (
                    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                        {announcements.map(announcement => (
                            <AnnouncementListItemForStudent key={announcement.id} announcement={announcement} onClick={() => setSelectedAnnouncement(announcement)} />
                        ))}
                    </div>
                ) : (
                    <EmptyState 
                        icon={MegaphoneIcon}
                        text="No announcements for this class."
                        subtext="Important updates will appear here."
                        color="blue"
                    />
                );
        }
    };

    return (
        <>
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-4xl mx-auto">
                <button
                    onClick={onBack}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-5 font-semibold text-sm group"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" /> Back to All Classes
                </button>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">{selectedClass.name}</h1>
                <p className="text-base sm:text-lg text-slate-600 mb-6">{selectedClass.gradeLevel} - {selectedClass.section}</p>
                
                <div className="bg-slate-100 rounded-xl flex items-center justify-around mb-6 p-2">
                    <nav className="flex flex-1 space-x-2">
                        <button onClick={() => setActiveTab('announcements')} className={getTabClasses('announcements')}>
                            <MegaphoneIcon className="h-5 w-5" />
                            <span className="whitespace-nowrap">Announcements</span>
                        </button>
                        <button onClick={() => setActiveTab('lessons')} className={getTabClasses('lessons')}>
                            <BookOpenIcon className="h-5 w-5" />
                            <span className="whitespace-nowrap">Lessons</span>
                        </button>
                        {/* REMOVED: Quizzes Tab
                        <button onClick={() => setActiveTab('quizzes')} className={getTabClasses('quizzes')}>
                            <AcademicCapIcon className="h-5 w-5" />
                            <span className="whitespace-nowrap">Quizzes</span>
                        </button>
                        */}
                    </nav>
                </div>
                <div className="py-4">{renderContent()}</div>
            </div>

            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />
            {/* The ViewQuizModal component itself is still used, but triggered from StudentQuizzesTab directly now */}
            <ViewQuizModal isOpen={!!viewQuizData} onClose={() => setViewQuizData(null)} quiz={viewQuizData} userProfile={userProfile} classId={selectedClass.id} />
            <AnnouncementViewModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} />
        </>
    );
};

// Sub-components for list items
const LessonListItemForStudent = ({ lesson, onClick }) => (
    <div className="group relative p-4 sm:p-5 rounded-2xl bg-white hover:bg-sky-50 shadow-md border border-sky-200 transition-all duration-300 cursor-pointer flex items-center space-x-4 sm:space-x-5 hover:shadow-lg hover:scale-[1.005]" onClick={onClick}>
        <div className="flex-shrink-0 p-2.5 sm:p-3 rounded-full bg-sky-100 group-hover:bg-sky-200 transition-colors">
            <SparklesIcon className="h-6 w-6 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2">{lesson.title}</h3>
            {lesson.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{lesson.description}</p>}
        </div>
        <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors">
            <ArrowRightIcon className="h-5 w-5" />
        </div>
    </div>
);

// QuizListItemForStudent is no longer rendered by this component, but keeping it here for reference
// in case it's used elsewhere or you decide to re-add quizzes in a different context.
const QuizListItemForStudent = ({ quiz, onClick }) => {
    const formattedDueDate = quiz.availableUntil?.toDate ? quiz.availableUntil.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    return (
        <div className="group relative p-4 sm:p-5 rounded-2xl bg-white hover:bg-purple-50 shadow-md border border-purple-200 transition-all duration-300 cursor-pointer flex items-center space-x-4 sm:space-x-5 hover:shadow-lg hover:scale-[1.005]" onClick={onClick}>
            <div className="flex-shrink-0 p-2.5 sm:p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                <AcademicCapIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-purple-800 transition-colors line-clamp-2">{quiz.title}</h3>
                {quiz.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{quiz.description}</p>}
                {quiz.availableUntil && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1 text-slate-400" /> Due: {formattedDueDate}
                    </p>
                )}
            </div>
            <div className="flex-shrink-0 text-slate-400 group-hover:text-purple-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

const AnnouncementListItemForStudent = ({ announcement, onClick }) => {
    const formattedDate = announcement.createdAt?.toDate ? announcement.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    return (
        <div className="group relative p-4 sm:p-5 rounded-2xl bg-white hover:bg-blue-50 shadow-md border border-blue-200 transition-all duration-300 cursor-pointer flex items-center space-x-4 sm:space-x-5 hover:shadow-lg hover:scale-[1.005]" onClick={onClick}>
            <div className="flex-shrink-0 p-2.5 sm:p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <MegaphoneIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-blue-800 transition-colors line-clamp-2">{announcement.content}</h3>
                <p className="text-sm text-slate-500 mt-1">Posted on {formattedDate}</p>
            </div>
            <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

export default StudentClassDetailView;
