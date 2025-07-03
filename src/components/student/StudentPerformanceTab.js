import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { Card, Title, BarChart, Subtitle } from '@tremor/react';

// --- MODIFIED: Component now accepts 'classes' prop ---
const StudentPerformanceTab = ({ userProfile, classes }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userProfile?.id || classes.length === 0) {
            setLoading(false);
            setSubmissions([]);
            return;
        }

        // Create an array of the student's current class IDs
        const currentClassIds = classes.map(c => c.id);

        // --- MODIFIED: Query now filters by current class IDs ---
        // This query fetches submissions only for the student AND only from classes they are currently in.
        const submissionsQuery = query(
            collection(db, "quizSubmissions"),
            where("studentId", "==", userProfile.id),
            where("classId", "in", currentClassIds), // This ensures we only get scores from current classes
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

    }, [userProfile, classes]); // Add 'classes' to the dependency array

    if (loading) {
        return <Spinner />;
    }

    // Format data for the chart
    const chartData = submissions.map(sub => ({
        name: sub.quizTitle,
        "Score (%)": (sub.score / sub.totalItems) * 100,
    })).reverse();

    return (
        <div>
            <Title>My Performance</Title>
            <Subtitle>A summary of your quiz results from your current classes.</Subtitle>

            {submissions.length > 0 ? (
                <>
                    <Card className="mt-6">
                        <Title>Quiz Scores Overview</Title>
                        <BarChart
                            className="mt-6"
                            data={chartData}
                            index="name"
                            categories={["Score (%)"]}
                            colors={["blue"]}
                            yAxisWidth={48}
                            valueFormatter={(number) => `${Intl.NumberFormat('us').format(number).toString()}%`}
                        />
                    </Card>

                    <Card className="mt-6">
                        <Title>Score History</Title>
                        <div className="overflow-x-auto mt-4">
                            <table className="min-w-full text-sm text-left text-gray-700">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Quiz Title</th>
                                        <th className="px-6 py-3">Score</th>
                                        <th className="px-6 py-3">Percentage</th>
                                        <th className="px-6 py-3">Date Taken</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(sub => (
                                        <tr key={sub.id} className="bg-white border-b hover:bg-gray-50">
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
                </>
            ) : (
                <div className="mt-6 text-center text-gray-500">
                    <p>You have not completed any quizzes yet. Your performance data will appear here once you do.</p>
                </div>
            )}
        </div>
    );
};

export default StudentPerformanceTab;