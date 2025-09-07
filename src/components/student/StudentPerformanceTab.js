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
        if (!userProfile?.id || !Array.isArray(classes)) { // Added check for classes being an array
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
            console.error("Error fetching quiz submissions: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile, classes]);

    const calculateOverallMetrics = () => {
        if (submissions.length === 0) {
            return { totalQuizzes: 0, averagePercentage: '0.0', bestScorePercentage: '0.0' };
        }
        
        const totalQuizzes = submissions.length;
        const totalScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
        const totalPossibleScore = submissions.reduce((sum, sub) => sum + (sub.totalItems || 0), 0);

        const averagePercentage = totalPossibleScore > 0
            ? ((totalScore / totalPossibleScore) * 100).toFixed(1)
            : '0.0';

        const bestScorePercentage = Math.max(...submissions.map(sub =>
            sub.totalItems > 0 ? (sub.score / sub.totalItems) * 100 : 0
        )).toFixed(1);

        return { totalQuizzes, averagePercentage, bestScorePercentage };
    };

    const { totalQuizzes, averagePercentage, bestScorePercentage } = calculateOverallMetrics();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh] p-6 rounded-2xl">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-0 md:p-4 lg:p-6 min-h-full">
            <Card className="max-w-full mx-auto p-4 sm:p-6 shadow-lg rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50">
                <Title className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2">Performance Dashboard</Title>
                <Subtitle className="text-base sm:text-lg text-slate-600 mb-8">An overview of your quiz performance.</Subtitle>

                {/* Performance Metrics Summary - Redesigned as iOS-style Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
                    <Card className="p-5 bg-white shadow-md rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-lg"><ChartBarIcon className="h-6 w-6 text-red-600" /></div>
                            <Text className="text-base font-semibold text-slate-600">Total Quizzes</Text>
                        </div>
                        <Metric className="text-4xl font-bold text-slate-800 text-left">{totalQuizzes}</Metric>
                    </Card>

                    <Card className="p-5 bg-white shadow-md rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                        <div className="flex items-center gap-3">
                            <div className="bg-teal-100 p-2 rounded-lg"><CheckCircleIcon className="h-6 w-6 text-teal-600" /></div>
                            <Text className="text-base font-semibold text-slate-600">Average Score</Text>
                        </div>
                        <Metric className="text-4xl font-bold text-slate-800 text-left">{averagePercentage}<span className="text-2xl text-slate-500">%</span></Metric>
                    </Card>

                    <Card className="p-5 bg-white shadow-md rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg"><TrophyIcon className="h-6 w-6 text-amber-600" /></div>
                            <Text className="text-base font-semibold text-slate-600">Highest Score</Text>
                        </div>
                        <Metric className="text-4xl font-bold text-slate-800 text-left">{bestScorePercentage}<span className="text-2xl text-slate-500">%</span></Metric>
                    </Card>
                </div>

                {/* Recent Quiz Submissions - Now fully responsive */}
                {submissions.length > 0 ? (
                    <div className="mt-10 bg-white/70 backdrop-blur-lg shadow-md rounded-xl p-4 md:p-6 border border-gray-100">
                        <Title className="text-2xl font-bold text-slate-800 mb-4">Recent Submissions</Title>
                        
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="min-w-full">
                                <thead >
                                    <tr>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quiz Title</th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Percentage</th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted On</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {submissions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 font-medium text-gray-900">{sub.quizTitle}</td>
                                            <td className="px-4 py-4 text-gray-700">{`${sub.score} / ${sub.totalItems}`}</td>
                                            <td className="px-4 py-4 font-semibold text-gray-800">{((sub.score / sub.totalItems) * 100).toFixed(0)}%</td>
                                            <td className="px-4 py-4 text-gray-600">{sub.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="space-y-3 md:hidden">
                            {submissions.map(sub => (
                                <div key={sub.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
                                    <p className="font-bold text-gray-800 truncate">{sub.quizTitle}</p>
                                    <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
                                        <div>
                                            <p className="font-semibold text-gray-700">{((sub.score / sub.totalItems) * 100).toFixed(0)}%</p>
                                            <p className="text-gray-500">{`${sub.score} / ${sub.totalItems}`}</p>
                                        </div>
                                        <p className="text-gray-500">{sub.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-12 bg-black/5 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center shadow-inner mt-10">
                        <AcademicCapIcon className="h-16 w-16 text-gray-300 mb-6" />
                        <p className="text-xl sm:text-2xl text-gray-700 font-bold mb-2">No quiz submissions yet!</p>
                        <p className="text-base text-gray-500 max-w-md">Complete some quizzes to see your performance data here.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default StudentPerformanceTab;