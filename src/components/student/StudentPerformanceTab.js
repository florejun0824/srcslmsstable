import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { Card, Title, Subtitle, Text, Metric } from '@tremor/react';
import { ChartBarIcon, AcademicCapIcon, CheckCircleIcon, TrophyIcon } from '@heroicons/react/24/outline'; // Re-imported icons

const StudentPerformanceTab = ({ userProfile, classes }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userProfile?.id || !Array.isArray(classes) || classes.length === 0) {
            setLoading(false);
            setSubmissions([]);
            return;
        }
        const currentClassIds = classes.map(c => c.id);
        if (currentClassIds.length === 0) {
            setLoading(false);
            setSubmissions([]);
            return;
        }
        const submissionsQuery = query(
            collection(db, "quizSubmissions"),
            where("studentId", "==", userProfile.id),
            where("classId", "in", currentClassIds), // Ensure quizzes are from user's current classes
            orderBy("submittedAt", "desc")
        );

        const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
            const subsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(subsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching quiz submissions: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile, classes]);

    const calculateOverallMetrics = () => {
        const totalQuizzes = submissions.length;
        const totalScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
        const totalPossibleScore = submissions.reduce((sum, sub) => sum + (sub.totalItems || 0), 0);

        const averagePercentage = totalPossibleScore > 0
            ? ((totalScore / totalPossibleScore) * 100).toFixed(1)
            : '0.0';

        let bestScorePercentage = 0;
        if (submissions.length > 0) {
            bestScorePercentage = Math.max(...submissions.map(sub =>
                sub.totalItems > 0 ? (sub.score / sub.totalItems) * 100 : 0
            )).toFixed(1);
        } else {
            bestScorePercentage = '0.0';
        }

        return {
            totalQuizzes,
            averagePercentage,
            bestScorePercentage
        };
    };

    const { totalQuizzes, averagePercentage, bestScorePercentage } = calculateOverallMetrics();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh] p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-gradient-to-br from-red-50 to-rose-50 min-h-full rounded-2xl">
            <Card className="max-w-full mx-auto p-4 sm:p-6 shadow-xl rounded-2xl bg-white/80 backdrop-blur-2xl border border-gray-100">
                <Title className="text-3xl font-extrabold text-slate-800 mb-2">Your Performance Dashboard</Title>
                <Subtitle className="text-lg text-slate-600 mb-8">A comprehensive overview of your quiz performance.</Subtitle>

                {/* Performance Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <Card className="flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-lg shadow-md rounded-xl border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200">
                        <ChartBarIcon className="h-10 w-10 text-red-600 mb-3" />
                        <Text className="text-base font-semibold text-slate-600 mb-1">Total Quizzes Attempted</Text>
                        <Metric className="text-4xl font-bold text-slate-800">{totalQuizzes}</Metric>
                    </Card>

                    <Card className="flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-lg shadow-md rounded-xl border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200">
                        <CheckCircleIcon className="h-10 w-10 text-teal-600 mb-3" />
                        <Text className="text-base font-semibold text-slate-600 mb-1">Average Score</Text>
                        <Metric className="text-4xl font-bold text-slate-800">{averagePercentage}%</Metric>
                    </Card>

                    <Card className="flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-lg shadow-md rounded-xl border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200">
                        <TrophyIcon className="h-10 w-10 text-amber-600 mb-3" />
                        <Text className="text-base font-semibold text-slate-600 mb-1">Highest Score</Text>
                        <Metric className="text-4xl font-bold text-slate-800">{bestScorePercentage}%</Metric>
                    </Card>
                </div>

                {/* Recent Quiz Submissions Table */}
                {submissions.length > 0 ? (
                    <div className="mt-10 bg-white/70 backdrop-blur-lg shadow-md rounded-xl p-4 md:p-6 border border-gray-100">
                        <Title className="text-2xl font-bold text-slate-800 mb-6 border-b pb-3 border-gray-200">Recent Quiz Submissions</Title>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-red-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">Quiz Title</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">Score</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">Percentage</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">Submitted On</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {submissions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-red-50/50 transition-colors duration-150 ease-in-out">
                                            <td className="px-4 py-3 sm:px-6 font-medium text-gray-900">{sub.quizTitle}</td>
                                            <td className="px-4 py-3 sm:px-6">{`${sub.score} / ${sub.totalItems}`}</td>
                                            <td className="px-4 py-3 sm:px-6 font-semibold">{((sub.score / sub.totalItems) * 100).toFixed(0)}%</td>
                                            <td className="px-4 py-3 sm:px-6 text-gray-600">{sub.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-12 bg-white/70 rounded-2xl border border-dashed border-red-200 flex flex-col items-center justify-center shadow-inner mt-10">
                        <AcademicCapIcon className="h-16 w-16 text-red-300 mb-6" />
                        <p className="text-xl sm:text-2xl text-red-700 font-bold mb-2">No quiz submissions yet!</p>
                        <p className="text-base text-gray-600 max-w-md">Complete some quizzes to see your performance data here and track your progress.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default StudentPerformanceTab;