import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { FaExclamationTriangle, FaChartBar, FaClock } from 'react-icons/fa';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AnalyticsView = ({ classes, userProfile }) => {
    const [selectedClassId, setSelectedClassId] = useState('');
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState('');
    const [quizHotspots, setQuizHotspots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // When a class is selected, find its quizzes
    useEffect(() => {
        if (!selectedClassId) {
            setQuizzes([]);
            setSelectedQuizId('');
            setQuizHotspots([]);
            return;
        };

        const fetchQuizzes = async () => {
            // Quizzes are a subcollection of a class
            const quizzesRef = collection(db, 'classes', selectedClassId, 'quizzes');
            const q = query(quizzesRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const classQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuizzes(classQuizzes);
            // Reset quiz selection if the new class has no quizzes
            if (classQuizzes.length > 0) {
                setSelectedQuizId(classQuizzes[0].id); // Auto-select the first quiz
            } else {
                setSelectedQuizId('');
            }
        };

        fetchQuizzes();
    }, [selectedClassId]);

    // When a quiz is selected, fetch its hotspot data
    useEffect(() => {
        const fetchHotspots = async () => {
            if (!selectedQuizId) {
                setQuizHotspots([]);
                return;
            };
            setLoading(true);
            setError('');
            try {
                // Analytics are a subcollection of a specific quiz
                const hotspotsRef = collection(db, `quizzes/${selectedQuizId}/analytics`);
                const q = query(hotspotsRef, orderBy('incorrectCount', 'desc'), limit(5));
                const querySnapshot = await getDocs(q);
                const hotspots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuizHotspots(hotspots);
            } catch (err) {
                setError('Could not load quiz analytics data.');
                console.error(err);
            }
            setLoading(false);
        };

        fetchHotspots();
    }, [selectedQuizId]);

    const chartData = {
        labels: quizHotspots.map(h => `${h.questionText ? h.questionText.substring(0, 30) : 'Question'}...`),
        datasets: [{
            label: '# of Incorrect Answers',
            data: quizHotspots.map(h => h.incorrectCount),
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
        }],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Most Frequently Missed Questions' },
        },
        indexAxis: 'y', // Makes the bar chart horizontal for better readability of labels
    };

    return (
        <div className="p-4 sm:p-6 bg-zinc-50 rounded-lg min-h-screen">
            <h1 className="text-3xl font-bold text-zinc-800 mb-6">Analytics & Insights</h1>

            {/* Class Selector */}
            <div className="mb-6 max-w-md">
                <label htmlFor="classSelector" className="block text-sm font-medium text-zinc-700 mb-1">Select a Class to Analyze</label>
                <select
                    id="classSelector"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full p-2 border border-zinc-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">-- Choose a Class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
            </div>

            {!selectedClassId && (
                <div className="text-center py-16">
                    <FaChartBar className="mx-auto text-5xl text-zinc-300" />
                    <p className="mt-4 text-zinc-500">Please select a class to view its analytics.</p>
                </div>
            )}

            {selectedClassId && (
                <div className="space-y-8">
                    {/* At-Risk Students Section */}
                    <div className="p-6 bg-white rounded-xl shadow-md border border-zinc-200">
                        <h2 className="text-xl font-semibold text-zinc-800 flex items-center"><FaExclamationTriangle className="mr-3 text-yellow-500" />At-Risk Students</h2>
                        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                            <p className="font-bold">Feature Coming Soon!</p>
                            <p>This area will soon highlight students who may need extra attention based on their quiz performance and engagement time.</p>
                        </div>
                    </div>
                    
                    {/* Lesson Engagement Section */}
                    <div className="p-6 bg-white rounded-xl shadow-md border border-zinc-200">
                        <h2 className="text-xl font-semibold text-zinc-800 flex items-center"><FaClock className="mr-3 text-blue-500" />Lesson Engagement</h2>
                         <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
                            <p className="font-bold">Feature Coming Soon!</p>
                            <p>This area will show the average time your students spend on each lesson, helping you identify engaging or challenging topics.</p>
                        </div>
                    </div>

                    {/* Quiz Hotspots Section */}
                    <div className="p-6 bg-white rounded-xl shadow-md border border-zinc-200">
                        <h2 className="text-xl font-semibold text-zinc-800 flex items-center"><FaChartBar className="mr-3 text-red-500" />Quiz Hotspots</h2>
                        {quizzes.length > 0 ? (
                             <div className="mt-4 max-w-md">
                                <label htmlFor="quizSelector" className="block text-sm font-medium text-zinc-700 mb-1">Select a Quiz</label>
                                <select
                                    id="quizSelector"
                                    value={selectedQuizId}
                                    onChange={(e) => setSelectedQuizId(e.target.value)}
                                    className="w-full p-2 border border-zinc-300 rounded-md shadow-sm"
                                >
                                    {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                                </select>
                            </div>
                        ) : (
                            <p className="mt-4 text-zinc-500">This class doesn't have any quizzes to analyze yet.</p>
                        )}
                       
                        <div className="mt-4">
                            {loading && <p className="text-zinc-500">Loading analytics...</p>}
                            {error && <p className="text-red-500">{error}</p>}
                            {!loading && !error && quizHotspots.length > 0 && <Bar options={chartOptions} data={chartData} />}
                            {!loading && !error && quizHotspots.length === 0 && selectedQuizId && <p className="mt-4 text-zinc-500">No submission data is available for this quiz yet.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsView;