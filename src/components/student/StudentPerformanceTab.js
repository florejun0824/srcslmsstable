import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { Card, Title, Subtitle, Text, Metric } from '@tremor/react';
import { ChartBarIcon, AcademicCapIcon, CheckCircleIcon, TrophyIcon } from '@heroicons/react/24/outline';

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
            where("classId", "in", currentClassIds),
            orderBy("submittedAt", "desc")
        );

        const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
            const subsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(subsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching performance data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile, classes]);

    if (loading) {
        return <div className="flex justify-center p-10"><Spinner /></div>;
    }

    const totalQuizzesCompleted = submissions.length;
    const averageScorePercentage = totalQuizzesCompleted > 0
        ? (submissions.reduce((sum, sub) => sum + (sub.score / sub.totalItems) * 100, 0) / totalQuizzesCompleted).toFixed(1)
        : 0;

    return (
        <Card className="max-w-full mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 bg-gradient-to-br from-white to-purple-50/50">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
                 {/* ✅ FIXED: Smaller icon */}
                <ChartBarIcon className="h-7 w-7 sm:h-8 sm:w-8 text-purple-600" />
                {/* ✅ FIXED: Title font size is now responsive */}
                <Title className="text-xl sm:text-2xl font-extrabold text-gray-800">My Performance</Title>
            </div>
             {/* ✅ FIXED: Smaller subtitle and margin */}
            <Subtitle className="text-sm text-gray-600 mb-6 max-w-2xl">
                A summary of your quiz results across all your enrolled classes.
            </Subtitle>

            {submissions.length > 0 ? (
                <div className="space-y-6">
                    <Card className="p-4 sm:p-6 rounded-2xl shadow-md border border-gray-100 bg-white">
                        <Title className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Overall Snapshot</Title>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                                <CheckCircleIcon className="h-8 w-8 text-blue-600 mb-2" />
                                <Text className="text-xs sm:text-sm text-blue-700 font-medium">Quizzes Completed</Text>
                                {/* ✅ FIXED: Metric font size is now responsive */}
                                <Metric className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{totalQuizzesCompleted}</Metric>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                                <TrophyIcon className="h-8 w-8 text-green-600 mb-2" />
                                <Text className="text-xs sm:text-sm text-green-700 font-medium">Average Score</Text>
                                {/* ✅ FIXED: Metric font size is now responsive */}
                                <Metric className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">{averageScorePercentage}%</Metric>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6 rounded-2xl shadow-md border border-gray-100 bg-white">
                        <Title className="text-base sm:text-lg font-semibold text-gray-800">Score History</Title>
                        <Subtitle className="text-sm text-gray-500 mt-1">Detailed breakdown of all your quiz attempts.</Subtitle>
                        <div className="overflow-x-auto mt-4 rounded-xl border border-gray-200">
                            <table className="min-w-full text-xs sm:text-sm text-left text-gray-700">
                                <thead className="bg-gray-100 text-xs text-gray-700 uppercase rounded-t-xl">
                                    <tr>
                                        {/* ✅ FIXED: Reduced table padding for mobile */}
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-bold whitespace-nowrap">Quiz Title</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-bold whitespace-nowrap">Score</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-bold whitespace-nowrap">Percentage</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-bold whitespace-nowrap">Date Taken</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(sub => (
                                        <tr key={sub.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                                            <td className="px-4 py-3 sm:px-6 font-medium text-gray-900">{sub.quizTitle}</td>
                                            <td className="px-4 py-3 sm:px-6">{`${sub.score} / ${sub.totalItems}`}</td>
                                            <td className="px-4 py-3 sm:px-6">{((sub.score / sub.totalItems) * 100).toFixed(0)}%</td>
                                            <td className="px-4 py-3 sm:px-6">{sub.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center shadow-inner">
                    <AcademicCapIcon className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-base sm:text-lg text-gray-500 font-semibold mb-1">No quiz submissions yet!</p>
                    <p className="text-sm text-gray-400">Complete some quizzes to see your performance data here.</p>
                </div>
            )}
        </Card>
    );
};

export default StudentPerformanceTab;