import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Spinner from '../common/Spinner'; // Assuming Spinner is already well-styled
import { Card, Title, Subtitle, Text, Metric } from '@tremor/react'; // Import Metric for key stats
import { ChartBarIcon, AcademicCapIcon, CheckCircleIcon, TrophyIcon } from '@heroicons/react/24/outline'; // Import icons

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

        const submissionsQuery = query(
            collection(db, "quizSubmissions"),
            where("studentId", "==", userProfile.id),
            where("classId", "in", currentClassIds),
            orderBy("submittedAt", "desc")
        );

        const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
            const subsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSubmissions(subsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching performance data:", error);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [userProfile, classes]);

    if (loading) {
        return <Spinner />;
    }

    // --- Calculate Key Metrics ---
    const totalQuizzesCompleted = submissions.length;
    const averageScorePercentage = totalQuizzesCompleted > 0
        ? (submissions.reduce((sum, sub) => sum + (sub.score / sub.totalItems) * 100, 0) / totalQuizzesCompleted).toFixed(1) // ToFixed(1) for one decimal
        : 0;

    return (
        <Card className="max-w-full mx-auto p-6 rounded-3xl shadow-xl border border-gray-100 bg-gradient-to-br from-white to-purple-50/50">
            <div className="flex items-center gap-4 mb-4">
                <ChartBarIcon className="h-9 w-9 text-purple-600" />
                <Title className="text-3xl font-extrabold text-gray-800">My Performance</Title>
            </div>
            <Subtitle className="text-gray-600 mb-8 max-w-2xl">
                A comprehensive summary of your quiz results across all your enrolled classes.
            </Subtitle>

            {submissions.length > 0 ? (
                <div className="space-y-8">
                    {/* Key Performance Metrics */}
                    <Card className="p-6 rounded-2xl shadow-md border border-gray-100 bg-white">
                        <Title className="text-xl font-semibold text-gray-800 mb-4">Overall Performance Snapshot</Title>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                                <CheckCircleIcon className="h-10 w-10 text-blue-600 mb-2" />
                                <Text className="text-blue-700 font-medium">Quizzes Completed</Text>
                                <Metric className="text-4xl font-bold text-blue-900 mt-1">
                                    {totalQuizzesCompleted}
                                </Metric>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                                <TrophyIcon className="h-10 w-10 text-green-600 mb-2" />
                                <Text className="text-green-700 font-medium">Average Score</Text>
                                <Metric className="text-4xl font-bold text-green-900 mt-1">
                                    {averageScorePercentage}%
                                </Metric>
                            </div>
                            {/* You could add more metrics here, e.g., "Highest Score", "Recent Activity" etc. */}
                        </div>
                    </Card>

                    {/* Score History Table Card */}
                    <Card className="p-6 rounded-2xl shadow-md border border-gray-100 bg-white">
                        <Title className="text-xl font-semibold text-gray-800">Score History</Title>
                        <Subtitle className="text-gray-500 mt-2">Detailed breakdown of all your quiz attempts.</Subtitle>
                        <div className="overflow-x-auto mt-4 rounded-xl border border-gray-200">
                            <table className="min-w-full text-sm text-left text-gray-700">
                                <thead className="bg-gray-100 text-xs text-gray-700 uppercase rounded-t-xl">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 font-bold">Quiz Title</th>
                                        <th scope="col" className="px-6 py-3 font-bold">Score</th>
                                        <th scope="col" className="px-6 py-3 font-bold">Percentage</th>
                                        <th scope="col" className="px-6 py-3 font-bold">Date Taken</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(sub => (
                                        <tr key={sub.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                                            <td className="px-6 py-4 font-medium text-gray-900">{sub.quizTitle}</td>
                                            <td className="px-6 py-4">{`${sub.score} / ${sub.totalItems}`}</td>
                                            <td className="px-6 py-4">{((sub.score / sub.totalItems) * 100).toFixed(0)}%</td>
                                            <td className="px-6 py-4">{sub.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center shadow-inner">
                    <AcademicCapIcon className="h-16 w-16 text-gray-300 mb-6" />
                    <Text className="text-xl text-gray-500 font-semibold mb-2">
                        No quiz submissions yet!
                    </Text>
                    <Text className="text-md text-gray-400">
                        Complete some quizzes to see your performance data here.
                    </Text>
                </div>
            )}
        </Card>
    );
};

export default StudentPerformanceTab;