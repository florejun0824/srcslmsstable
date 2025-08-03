import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, where, documentId, Timestamp } from 'firebase/firestore';
import ViewQuizModal from '../teacher/ViewQuizModal';
import Spinner from '../common/Spinner';
import { AcademicCapIcon, ClockIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const StudentQuizzesTab = ({ classes, userProfile, isModule = false }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [quizFilter, setQuizFilter] = useState('active');

    const getQuizStatus = (quizEntry, userSubmissionsMap) => {
        const now = Timestamp.now();
        const hasSubmitted = userSubmissionsMap.has(`${quizEntry.id}-${quizEntry.classId}`);
        if (hasSubmitted) return 'completed';

        const availableUntil = quizEntry.availableUntil;
        if (availableUntil && availableUntil.seconds < now.seconds) return 'overdue';

        return 'active';
    };

    const fetchSharedQuizzes = useCallback(async () => {
        if (!classes || classes.length === 0 || !userProfile?.id) {
            setLoading(false);
            setQuizzes([]);
            return;
        }
        setLoading(true);

        try {
            const quizToContextMap = new Map();
            const studentQuizSubmissions = new Map();

            const submissionsQuery = query(collection(db, 'quizSubmissions'), where('studentId', '==', userProfile.id));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            submissionsSnapshot.forEach(doc => {
                const subData = doc.data();
                studentQuizSubmissions.set(`${subData.quizId}-${subData.classId}`, true);
            });

            const postPromises = classes.map(c =>
                getDocs(query(collection(db, `classes/${c.id}/posts`)))
                    .then(snapshot => ({ snapshot, classId: c.id, className: c.name }))
            );
            const classPostSnapshots = await Promise.all(postPromises);

            classPostSnapshots.forEach(({ snapshot, classId, className }) => {
                snapshot.forEach(doc => {
                    const postData = doc.data();
                    if (Array.isArray(postData.quizIds)) {
                        postData.quizIds.forEach(quizId => {
                            if (!quizToContextMap.has(quizId)) {
                                quizToContextMap.set(quizId, { quizData: null, posts: [] });
                            }
                            quizToContextMap.get(quizId).posts.push({
                                postId: doc.id,
                                classId: classId,
                                className: className,
                                availableFrom: postData.availableFrom,
                                availableUntil: postData.availableUntil
                            });
                        });
                    }
                });
            });

            const uniqueQuizIds = Array.from(quizToContextMap.keys());

            if (uniqueQuizIds.length > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                quizzesSnapshot.forEach(doc => {
                    if (quizToContextMap.has(doc.id)) {
                        quizToContextMap.get(doc.id).quizData = { id: doc.id, ...doc.data() };
                    }
                });

                const finalList = [];
                quizToContextMap.forEach((value) => {
                    if (value.quizData) {
                        value.posts.forEach(postContext => {
                            const quizWithContext = {
                                ...value.quizData,
                                uniqueId: `${value.quizData.id}-${postContext.classId}-${postContext.postId}`,
                                context: `(for ${postContext.className})`,
                                classId: postContext.classId,
                                availableFrom: postContext.availableFrom,
                                availableUntil: postContext.availableUntil,
                                attemptsTaken: 0,
                            };
                            quizWithContext.status = getQuizStatus(quizWithContext, studentQuizSubmissions);
                            finalList.push(quizWithContext);
                        });
                    }
                });
                setQuizzes(finalList);
            } else {
                setQuizzes([]);
            }
        } catch (error) {
            console.error("Error fetching shared quizzes:", error);
        } finally {
            setLoading(false);
        }
    }, [classes, userProfile]);
    
    useEffect(() => {
        fetchSharedQuizzes();
    }, [fetchSharedQuizzes]);

    const filteredQuizzes = quizzes.filter(quiz => quiz.status === quizFilter);
    const activeQuizzes = quizzes.filter(quiz => quiz.status === 'active');

    // Updated tab classes for a pill/segmented look with icons
    const getTabClasses = (tabName) => `
        flex items-center gap-2 px-5 py-2 font-semibold text-sm rounded-full transition-all duration-300 shadow-sm
        ${quizFilter === tabName
            ? 'bg-indigo-700 text-white shadow-lg'
            : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700'
        }
    `;

    if (loading && !isModule) return <div className="flex justify-center p-10"><Spinner /></div>;

    const EmptyState = ({icon: Icon, text, subtext}) => (
        <div className="text-center py-16 px-6 bg-slate-50 rounded-xl">
            <Icon className="h-16 w-16 mx-auto text-slate-300" />
            <p className="mt-6 text-xl font-semibold text-slate-500">{text}</p>
            <p className="mt-2 text-md text-slate-400">{subtext}</p>
        </div>
    );
    
    if (isModule) {
        return (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-full flex flex-col">
                <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Upcoming Quizzes</h2>
                {loading ? <div className="flex-1 flex items-center justify-center"><Spinner/></div> :
                <div className="flex-1 space-y-4 overflow-y-auto">
                    {activeQuizzes.length > 0 ? (
                        activeQuizzes.slice(0, 3).map(quiz => (
                            <QuizListItem key={quiz.uniqueId} quiz={quiz} onClick={() => setViewQuizData(quiz)} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-green-50/70 rounded-xl">
                             <CheckCircleIcon className="h-14 w-14 mx-auto text-green-500" />
                             <p className="mt-4 text-xl font-bold text-slate-700">All caught up!</p>
                             <p className="mt-2 text-md text-slate-500">No active quizzes right now.</p>
                        </div>
                    )}
                </div>
                }
            </div>
        );
    }
    
    return (
        <>
            <div className="bg-white/60 p-8 rounded-3xl border border-slate-200/80 backdrop-blur-xl max-w-5xl mx-auto shadow-lg">
                <div className="flex items-center gap-5 mb-8">
                    <ClipboardDocumentCheckIcon className="h-10 w-10 text-indigo-700" />
                    <h1 className="text-4xl font-extrabold text-slate-900">My Quizzes</h1>
                </div>

                <nav className="flex flex-wrap gap-4 mb-8 p-3 bg-slate-100 rounded-2xl shadow-inner">
                    <button onClick={() => setQuizFilter('active')} className={getTabClasses('active')}>
                        <AcademicCapIcon className="h-5 w-5" /> Active
                    </button>
                    <button onClick={() => setQuizFilter('completed')} className={getTabClasses('completed')}>
                        <CheckCircleIcon className="h-5 w-5" /> Completed
                    </button>
                    <button onClick={() => setQuizFilter('overdue')} className={getTabClasses('overdue')}>
                        <ExclamationTriangleIcon className="h-5 w-5" /> Overdue
                    </button>
                </nav>

                <div className="space-y-5 min-h-[300px]"> {/* Added min-height for consistent layout */}
                    {filteredQuizzes.length > 0 ? (
                        filteredQuizzes.map(quiz => (
                            <QuizListItem key={quiz.uniqueId} quiz={quiz} onClick={() => setViewQuizData(quiz)} />
                        ))
                    ) : (
                        <EmptyState 
                            icon={quizFilter === 'active' ? CheckCircleIcon : ExclamationTriangleIcon}
                            text={`No ${quizFilter} quizzes.`}
                            subtext={quizFilter === 'active' ? "You're all caught up and ready for new challenges!" : "No items to display in this category."}
                        />
                    )}
                </div>
            </div>

            <ViewQuizModal
                isOpen={!!viewQuizData}
                onClose={() => setViewQuizData(null)}
                quiz={viewQuizData}
                userProfile={userProfile}
                classId={viewQuizData?.classId}
            />
        </>
    );
};

const QuizListItem = ({ quiz, onClick }) => {
    const statusStyles = {
        active: { border: "border-sky-500", iconBg: "bg-sky-100", iconColor: "text-sky-600", icon: AcademicCapIcon },
        completed: { border: "border-green-500", iconBg: "bg-green-100", iconColor: "text-green-600", icon: CheckCircleIcon },
        overdue: { border: "border-red-500", iconBg: "bg-red-100", iconColor: "text-red-600", icon: ClockIcon },
    };
    const { border, iconBg, iconColor, icon: Icon } = statusStyles[quiz.status];

    return (
         <div
            onClick={onClick}
            className={`group relative p-5 rounded-2xl bg-white hover:bg-slate-50 border-l-4 ${border} transition-all duration-200 cursor-pointer flex items-center space-x-5 shadow-md hover:shadow-lg transform hover:-translate-y-1`}
        >
            <div className={`p-2 rounded-full ${iconBg}`}>
                <Icon className={`h-7 w-7 flex-shrink-0 ${iconColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{quiz.title}</h2>
                <p className="text-sm text-slate-600 font-medium mt-0.5">{quiz.context}</p>
            </div>

            {quiz.availableUntil && (
                <div className={`text-sm flex items-center self-start flex-shrink-0 ml-auto pl-4 border-l border-slate-200 ${quiz.status === 'overdue' ? 'text-red-700 font-bold' : 'text-slate-500'}`}>
                    <ClockIcon className="h-5 w-5 mr-2" />
                    <span>Due: {quiz.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
            )}
        </div>
    );
};

export default StudentQuizzesTab;