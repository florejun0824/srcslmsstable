import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, where, documentId, Timestamp } from 'firebase/firestore';
import ViewQuizModal from '../teacher/ViewQuizModal';
import Spinner from '../common/Spinner';
import { AcademicCapIcon, BookOpenIcon, InformationCircleIcon, ClockIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const StudentQuizzesTab = ({ classes, userProfile }) => {
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

    const getTabClasses = (tabName) => `
        px-3 py-1.5 font-semibold text-xs sm:text-sm rounded-full transition-all duration-200
        ${quizFilter === tabName
            ? 'bg-blue-600 text-white shadow'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
    `;

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    const statusInfo = {
        active: { icon: AcademicCapIcon, text: "No active quizzes right now.", subtext: "New quizzes from your teacher will appear here." },
        completed: { icon: CheckCircleIcon, text: "No completed quizzes.", subtext: "Quizzes you've submitted will be shown here." },
        overdue: { icon: ExclamationTriangleIcon, text: "No overdue quizzes.", subtext: "You're all caught up!" }
    };
    const EmptyStateIcon = statusInfo[quizFilter]?.icon || BookOpenIcon;

    return (
        <>
            {/* ✅ FIXED: Reduced padding and margin for smaller screens */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/30 p-4 sm:p-5 rounded-2xl shadow-xl max-w-4xl mx-auto my-6">
                <div className="flex items-center gap-3 mb-5">
                    {/* ✅ FIXED: Smaller icon size for mobile */}
                    <ClipboardDocumentCheckIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                    {/* ✅ FIXED: Title font size is now responsive */}
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">My Quizzes</h1>
                </div>

                <nav className="flex flex-wrap gap-2 sm:gap-3 mb-5">
                    <button onClick={() => setQuizFilter('active')} className={getTabClasses('active')}>
                        Active
                    </button>
                    <button onClick={() => setQuizFilter('completed')} className={getTabClasses('completed')}>
                        Completed
                    </button>
                    <button onClick={() => setQuizFilter('overdue')} className={getTabClasses('overdue')}>
                        Overdue
                    </button>
                </nav>

                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredQuizzes.length > 0 ? (
                        filteredQuizzes.map(quiz => (
                            <QuizListItem key={quiz.uniqueId} quiz={quiz} onClick={() => setViewQuizData(quiz)} />
                        ))
                    ) : (
                         // ✅ FIXED: Smaller padding and font sizes for empty state
                        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-gray-50/50 rounded-2xl border-dashed border-gray-200 border">
                            <EmptyStateIcon className="h-14 w-14 sm:h-16 sm:w-16 mb-4 text-gray-300" />
                            <p className="text-base sm:text-lg font-medium text-gray-500">{statusInfo[quizFilter].text}</p>
                            <p className="text-xs sm:text-sm mt-2 text-gray-400">{statusInfo[quizFilter].subtext}</p>
                        </div>
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
        active: { border: "border-blue-200", bg: "from-white to-blue-50", icon: AcademicCapIcon, iconColor: "text-blue-600", hoverColor: "group-hover:text-blue-800" },
        completed: { border: "border-green-200", bg: "from-white to-green-50", icon: CheckCircleIcon, iconColor: "text-green-600", hoverColor: "group-hover:text-green-800" },
        overdue: { border: "border-red-200", bg: "from-white to-red-50", icon: ClockIcon, iconColor: "text-red-500", hoverColor: "group-hover:text-red-800" },
    };
    const { border, bg, icon: Icon, iconColor, hoverColor } = statusStyles[quiz.status];

    return (
         <div
            onClick={onClick}
            // ✅ FIXED: Reduced padding and changed alignment for a more compact card
            className={`group relative p-4 rounded-xl border ${border} bg-gradient-to-br ${bg} shadow-md hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer flex flex-col justify-between h-full`}
        >
            <div className="flex items-start space-x-3">
                 <div className="flex-shrink-0 pt-1"><Icon className={`h-5 w-5 ${iconColor} transition-colors`} /></div>
                <div className="flex-1 min-w-0">
                    {/* ✅ FIXED: Quiz title is truncated if too long */}
                    <h2 className={`text-base font-bold text-gray-800 ${hoverColor} transition-colors truncate`}>
                        {quiz.title}
                    </h2>
                     {/* ✅ FIXED: Context text is smaller */}
                    <p className="text-xs text-gray-500 font-normal truncate">{quiz.context}</p>
                </div>
            </div>
            
            {/* ✅ FIXED: Due date is positioned at the bottom */}
            {quiz.availableUntil && (
                <div className={`text-xs mt-3 flex items-center self-end ${quiz.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    <ClockIcon className="h-3.5 w-3.5 mr-1.5" />
                    <span>Due: {quiz.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
            )}
        </div>
    );
};

export default StudentQuizzesTab;