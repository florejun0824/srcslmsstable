import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { ChartBarIcon, AcademicCapIcon, TrophyIcon, DocumentTextIcon } from '@heroicons/react/24/solid';

// Helper function to determine score color based on percentage
const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
};

// A reusable stat card component for the top section
const StatCard = ({ icon: Icon, title, value, unit }) => (
    <div className="bg-neumorphic-base p-6 rounded-3xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neumorphic-base shadow-neumorphic rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-red-500" />
            </div>
            <div>
                <p className="text-slate-500 font-medium">{title}</p>
                <span className="text-3xl font-bold text-slate-800">{value}</span>
                {unit && <span className="text-xl font-semibold text-slate-800">{unit}</span>}
            </div>
        </div>
    </div>
);


const StudentPerformanceTab = ({ userProfile, classes }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const SUBMISSIONS_PER_PAGE = 10;

    useEffect(() => {
        if (!userProfile?.id || !Array.isArray(classes) || classes.length === 0) {
            setLoading(false);
            setHasMore(false);
            return;
        }

        const classIds = classes.map(c => c.id);
        const q = query(
            collection(db, "quizSubmissions"),
            where("studentId", "==", userProfile.id),
            where("classId", "in", classIds),
            orderBy("submittedAt", "desc"),
            limit(SUBMISSIONS_PER_PAGE)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const subsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(subsData);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === SUBMISSIONS_PER_PAGE);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching submissions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile, classes]);

    const loadMoreSubmissions = useCallback(async () => {
        if (!lastVisible || !userProfile?.id || !classes.length) return;
        setIsFetchingMore(true);

        const classIds = classes.map(c => c.id);
        const nextQuery = query(
            collection(db, "quizSubmissions"),
            where("studentId", "==", userProfile.id),
            where("classId", "in", classIds),
            orderBy("submittedAt", "desc"),
            startAfter(lastVisible),
            limit(SUBMISSIONS_PER_PAGE)
        );

        const snapshot = await getDocs(nextQuery);
        const newSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setSubmissions(prev => [...prev, ...newSubs]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === SUBMISSIONS_PER_PAGE);
        setIsFetchingMore(false);
    }, [lastVisible, userProfile, classes]);

    const { totalQuizzes, averagePercentage, bestScorePercentage } = useMemo(() => {
        if (submissions.length === 0) {
            return { totalQuizzes: 0, averagePercentage: '0.0', bestScorePercentage: '0.0' };
        }
        const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
        const totalPossible = submissions.reduce((sum, sub) => sum + sub.totalItems, 0);
        const avg = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : '0.0';
        const best = Math.max(...submissions.map(s => s.totalItems > 0 ? (s.score / s.totalItems) * 100 : 0)).toFixed(1);
        return { totalQuizzes: submissions.length, averagePercentage: avg, bestScorePercentage: best };
    }, [submissions]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Performance Overview</h1>
                <p className="mt-2 text-base text-slate-500 max-w-2xl">
                    Here's a summary of your quiz results and recent submissions.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={DocumentTextIcon} title="Total Quizzes Taken" value={totalQuizzes} />
                <StatCard icon={ChartBarIcon} title="Average Score" value={averagePercentage} unit="%" />
                <StatCard icon={TrophyIcon} title="Best Score" value={bestScorePercentage} unit="%" />
            </div>

            {/* Submissions List */}
            <div className="bg-neumorphic-base p-4 sm:p-6 rounded-3xl shadow-neumorphic">
                <h2 className="text-2xl font-bold text-slate-800 mb-5 flex items-center gap-3">
                    <AcademicCapIcon className="h-7 w-7 text-red-500" />
                    Recent Submissions
                </h2>

                {submissions.length > 0 ? (
                    <div className="space-y-4">
                        {submissions.map((sub) => {
                            const percentage = sub.totalItems > 0 ? (sub.score / sub.totalItems) * 100 : 0;
                            const scoreColor = getScoreColor(percentage);
                            return (
                                <div
                                    key={sub.id}
                                    className="bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic transition-all duration-300 hover:shadow-neumorphic-inset cursor-pointer"
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 text-lg">{sub.quizTitle}</p>
                                            <p className="text-sm text-slate-500">{sub.className}</p>
                                        </div>
                                        <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-6 mt-2 sm:mt-0">
                                            <p className={`text-xl font-bold ${scoreColor}`}>
                                                {sub.score}/{sub.totalItems}
                                                <span className="text-sm font-medium ml-1.5 opacity-80">({percentage.toFixed(0)}%)</span>
                                            </p>
                                            <p className="text-sm text-slate-500 font-medium text-right">
                                                {sub.submittedAt ? new Date(sub.submittedAt.seconds * 1000).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                }) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                         {hasMore && (
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={loadMoreSubmissions}
                                    disabled={isFetchingMore}
                                    className="bg-neumorphic-base font-semibold text-slate-700 px-6 py-3 rounded-xl shadow-neumorphic transition-all duration-300 ease-in-out hover:shadow-neumorphic-inset disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isFetchingMore ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 px-6 bg-neumorphic-base rounded-2xl shadow-neumorphic-inset">
                         <p className="text-slate-500">You haven't submitted any quizzes yet.</p>
                         <p className="text-slate-400 text-sm mt-1">Once you do, your results will appear here!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentPerformanceTab;