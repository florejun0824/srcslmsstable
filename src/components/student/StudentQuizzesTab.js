// src/components/student/StudentQuizzesTab.js
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, where, documentId, Timestamp } from 'firebase/firestore';
import ViewQuizModal from '../teacher/ViewQuizModal';
import Spinner from '../common/Spinner';
import { AcademicCapIcon, BookOpenIcon, InformationCircleIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'; // Add CheckCircleIcon

const StudentQuizzesTab = ({ classes, userProfile }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [quizFilter, setQuizFilter] = useState('active'); // 'active', 'completed', or 'overdue'

    // Function to determine if a quiz is active, overdue, or completed
    const getQuizStatus = (quizEntry, userSubmissionsMap) => {
        const now = Timestamp.now();
        const availableFrom = quizEntry.availableFrom;
        const availableUntil = quizEntry.availableUntil;

        // Check if the student has completed this specific quiz (identified by quizId-classId for uniqueness)
        const hasSubmitted = userSubmissionsMap.has(`${quizEntry.id}-${quizEntry.classId}`);

        if (hasSubmitted) {
            return 'completed';
        }

        // Check if the quiz is active
        const isAvailableNow = (!availableFrom || availableFrom.seconds <= now.seconds) &&
                               (!availableUntil || availableUntil.seconds >= now.seconds);

        if (isAvailableNow) {
            return 'active';
        }

        // If not active and not completed, it's overdue (assuming a deadline was set)
        // Or if availableUntil is in the past
        if (availableUntil && availableUntil.seconds < now.seconds) {
            return 'overdue';
        }

        // Default to active if no dates or not yet available (future quiz)
        // You might want a 'pending' or 'upcoming' status if availableFrom is in the future
        return 'active'; // Default to active if no specific conditions met
    };

    const fetchSharedQuizzes = useCallback(async () => {
        if (!classes || classes.length === 0) {
            setLoading(false);
            setQuizzes([]);
            return;
        }
        setLoading(true);

        try {
            const quizToContextMap = new Map(); // Stores quizData and associated posts (with their dates)
            const studentQuizSubmissions = new Map(); // To store student's submissions: Map<"quizId-classId", true>

            // Fetch student's quiz submissions first
            if (userProfile?.id) { // Ensure userProfile and id exist
                const submissionsQuery = query(
                    collection(db, 'quizSubmissions'),
                    where('studentId', '==', userProfile.id),
                    // You might want to filter by a 'status' field in submissions, e.g., 'submitted'
                    // where('status', '==', 'submitted')
                );
                const submissionsSnapshot = await getDocs(submissionsQuery);
                submissionsSnapshot.forEach(doc => {
                    const submissionData = doc.data();
                    // Use a combined key (quizId-classId) if a quiz can be submitted multiple times for different classes
                    studentQuizSubmissions.set(`${submissionData.quizId}-${submissionData.classId}`, true);
                });
            }

            const postPromises = classes.map(c =>
                getDocs(query(collection(db, `classes/${c.id}/posts`)))
                    .then(snapshot => ({ snapshot, classId: c.id, className: c.name }))
            );
            const classPostSnapshots = await Promise.all(postPromises);

            classPostSnapshots.forEach(({ snapshot, classId, className }) => {
                snapshot.forEach(doc => {
                    const postData = doc.data();
                    if (Array.isArray(postData.quizIds) && postData.quizIds.length > 0) {
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
                                // Add other relevant post data if needed (e.g., attempts allowed for the post)
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
                    quizToContextMap.get(doc.id).quizData = { id: doc.id, ...doc.data() };
                });

                const finalList = [];
                quizToContextMap.forEach(value => {
                    if (value.quizData && value.posts.length > 0) {
                        value.posts.forEach(postContext => {
                            const quizWithContext = {
                                ...value.quizData,
                                uniqueId: `${value.quizData.id}-${postContext.classId}-${postContext.postId}`,
                                context: `(for ${postContext.className})`,
                                classId: postContext.classId,
                                availableFrom: postContext.availableFrom,
                                availableUntil: postContext.availableUntil,
                                // Attempts taken would typically come from a specific submission record,
                                // or if you track it directly on the quiz object for the student.
                                // For simplicity, we'll assume a default or fetch if needed by ViewQuizModal.
                                attemptsTaken: 0, // Placeholder, populate from submissions if available
                            };
                            // Determine the status here using the submission map
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
    }, [classes, userProfile]); // Added userProfile to dependency array

    useEffect(() => {
        fetchSharedQuizzes();
        return () => {
            setQuizzes([]);
            setViewQuizData(null);
            setQuizFilter('active');
        };
    }, [fetchSharedQuizzes]);

    // Filter quizzes based on the current quizFilter state
    const filteredQuizzes = quizzes.filter(quiz => {
        // Now, we filter based on the 'status' property calculated for each quiz
        return quiz.status === quizFilter;
    });

const getTabClasses = (tabName) => `
    flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 ease-in-out
    ${quizFilter === tabName
        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' // Changed line
        : 'text-gray-700 hover:bg-gray-100 hover:text-orange-600' // Adjusted hover text color for consistency
    }
`;

    if (loading) return <Spinner />;

    return (
        <>
            <div className="bg-white/90 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-xl max-w-4xl mx-auto my-8">
                <h1 className="text-3xl font-extrabold text-gray-800 mb-6 flex items-center">
                    <AcademicCapIcon className="h-8 w-8 text-purple-600 mr-3" />
                    My Quizzes
                </h1>

                <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-4">
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
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredQuizzes.length > 0 ? (
                        filteredQuizzes.map(quiz => (
                            <div
                                key={quiz.uniqueId}
                                onClick={() => setViewQuizData(quiz)}
                                // Apply styling based on the quiz's actual status
                                className={`group relative p-5 rounded-xl border
                                           ${quiz.status === 'active' ? 'border-blue-200 bg-gradient-to-br from-white to-blue-50' :
                                             quiz.status === 'completed' ? 'border-green-200 bg-gradient-to-br from-white to-green-50' :
                                             'border-red-200 bg-gradient-to-br from-white to-red-50 opacity-80'}
                                           shadow-md hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer
                                           flex items-center space-x-4`}
                            >
                                <div className="flex-shrink-0">
                                    {quiz.status === 'active' && <AcademicCapIcon className="h-8 w-8 text-blue-600 group-hover:text-blue-700 transition-colors" />}
                                    {quiz.status === 'completed' && <CheckCircleIcon className="h-8 w-8 text-green-600 group-hover:text-green-700 transition-colors" />}
                                    {quiz.status === 'overdue' && <ClockIcon className="h-8 w-8 text-red-500 group-hover:text-red-600 transition-colors" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className={`text-lg font-bold
                                        ${quiz.status === 'active' ? 'text-gray-800 group-hover:text-blue-800' :
                                          quiz.status === 'completed' ? 'text-gray-800 group-hover:text-green-800' :
                                          'text-gray-700 group-hover:text-red-800'} transition-colors`}>
                                        {quiz.title}
                                        <span className="ml-2 text-sm text-gray-500 font-normal">{quiz.context}</span>
                                    </h2>
                                    {quiz.description && (
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                            {quiz.description}
                                        </p>
                                    )}
                                    {/* Display date information for clarity */}
                                    {(quiz.availableFrom || quiz.availableUntil) && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {quiz.availableFrom && `Available from: ${quiz.availableFrom.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} `}
                                            {quiz.availableUntil && `Until: ${quiz.availableUntil.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                        </p>
                                    )}
                                    {/* Additional status info for completed/overdue */}
                                    {quiz.status === 'completed' && (
                                        <p className="text-xs text-green-600 mt-1 flex items-center">
                                            <CheckCircleIcon className="h-4 w-4 mr-1" /> Submitted
                                        </p>
                                    )}
                                    {quiz.status === 'overdue' && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center">
                                            <ClockIcon className="h-4 w-4 mr-1" /> Deadline passed
                                        </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0">
                                    <InformationCircleIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                            <BookOpenIcon className="h-16 w-16 mb-4 text-gray-300" />
                            <p className="text-lg font-medium">
                                {quizFilter === 'active' ? "No active quizzes at the moment." :
                                 quizFilter === 'completed' ? "No completed quizzes found." :
                                 "No overdue quizzes found."}
                            </p>
                            <p className="text-sm mt-2">
                                {quizFilter === 'active' ? "Check back later or contact your teacher." :
                                 quizFilter === 'completed' ? "You haven't submitted any quizzes yet." :
                                 "You have no quizzes that have passed their deadline."}
                            </p>
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

export default StudentQuizzesTab;