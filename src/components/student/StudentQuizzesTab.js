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

    const getTabClasses = (tabName) => `
        px-4 py-2 font-semibold text-sm rounded-lg transition-all duration-200
        ${quizFilter === tabName
            ? 'bg-indigo-600 text-white shadow'
            : 'bg-white hover:bg-slate-100 text-slate-600'
        }
    `;

    if (loading && !isModule) return <div className="flex justify-center p-10"><Spinner /></div>;

    const EmptyState = ({icon: Icon, text, subtext}) => (
        <div className="text-center py-10 px-4 bg-slate-100 rounded-lg">
            <Icon className="h-12 w-12 mx-auto text-slate-400" />
            <p className="mt-4 text-md font-semibold text-slate-600">{text}</p>
            <p className="mt-1 text-sm text-slate-400">{subtext}</p>
        </div>
    );
    
    if (isModule) {
        return (
            <div className="bg-white/60 p-6 rounded-2xl border border-slate-200/80 backdrop-blur-xl h-full flex flex-col">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Upcoming Quizzes</h2>
                {loading ? <div className="flex-1 flex items-center justify-center"><Spinner/></div> :
                <div className="flex-1 space-y-3 overflow-y-auto">
                    {activeQuizzes.length > 0 ? (
                        activeQuizzes.slice(0, 3).map(quiz => (
                            <QuizListItem key={quiz.uniqueId} quiz={quiz} onClick={() => setViewQuizData(quiz)} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-slate-100/50 rounded-lg">
                             <CheckCircleIcon className="h-10 w-10 mx-auto text-green-500" />
                             <p className="mt-3 text-md font-semibold text-slate-600">All caught up!</p>
                             <p className="mt-1 text-xs text-slate-400">No active quizzes right now.</p>
                        </div>
                    )}
                </div>
                }
            </div>
        );
    }
    
    return (
        <>
            <div className="bg-white/60 p-6 rounded-2xl border border-slate-200/80 backdrop-blur-xl max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <ClipboardDocumentCheckIcon className="h-8 w-8 text-indigo-600" />
                    <h1 className="text-3xl font-bold text-slate-900">My Quizzes</h1>
                </div>

                <nav className="flex flex-wrap gap-3 mb-6 p-2 bg-slate-100 rounded-xl">
                    <button onClick={() => setQuizFilter('active')} className={getTabClasses('active')}>Active</button>
                    <button onClick={() => setQuizFilter('completed')} className={getTabClasses('completed')}>Completed</button>
                    <button onClick={() => setQuizFilter('overdue')} className={getTabClasses('overdue')}>Overdue</button>
                </nav>

                <div className="space-y-4">
                    {filteredQuizzes.length > 0 ? (
                        filteredQuizzes.map(quiz => (
                            <QuizListItem key={quiz.uniqueId} quiz={quiz} onClick={() => setViewQuizData(quiz)} />
                        ))
                    ) : (
                        <EmptyState 
                            icon={quizFilter === 'active' ? CheckCircleIcon : ExclamationTriangleIcon}
                            text={`No ${quizFilter} quizzes.`}
                            subtext={quizFilter === 'active' ? "You're all caught up!" : "Nothing to see here."}
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
        active: { border: "border-sky-500", icon: AcademicCapIcon, iconColor: "text-sky-600" },
        completed: { border: "border-green-500", icon: CheckCircleIcon, iconColor: "text-green-600" },
        overdue: { border: "border-red-500", icon: ClockIcon, iconColor: "text-red-600" },
    };
    const { border, icon: Icon, iconColor } = statusStyles[quiz.status];

    return (
         <div
            onClick={onClick}
            className={`group relative p-4 rounded-lg bg-white hover:bg-slate-50 border ${border} transition-all duration-200 cursor-pointer flex items-center space-x-4 shadow-sm`}
        >
            <Icon className={`h-6 w-6 flex-shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
                <h2 className="text-md font-semibold text-slate-800 truncate">{quiz.title}</h2>
                <p className="text-sm text-slate-500 font-normal truncate">{quiz.context}</p>
            </div>
            {quiz.availableUntil && (
                <div className={`text-sm flex items-center self-start ${quiz.status === 'overdue' ? 'text-red-600' : 'text-slate-500'}`}>
                    <ClockIcon className="h-4 w-4 mr-1.5" />
                    <span>Due: {quiz.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
            )}
        </div>
    );
};

export default StudentQuizzesTab;