// src/components/teacher/ScoresTab.jsx

import React from 'react';
import { ChartBarIcon, ChevronDownIcon, DocumentChartBarIcon } from '@heroicons/react/24/solid';

const ScoresTab = ({
    quizzes,
    units,
    quizScores, // This prop is crucial for receiving real-time updates
    sharedContentPosts, // <-- FIX: Added this prop
    setIsReportModalOpen,
    setSelectedQuizForScores,
    setScoresDetailModalOpen,
    collapsedUnits,
    toggleUnitCollapse,
}) => {
    const customUnitSort = (a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0], 10);
        const numB = parseInt(b.match(/\d+/)?.[0], 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.localeCompare(b);
    };

    const quizzesByUnit = quizzes.reduce((acc, quiz) => {
        const unitName = units[quiz.unitId] || 'Uncategorized';
        if (!acc[unitName]) acc[unitName] = [];
        acc[unitName].push(quiz);
        return acc;
    }, {});

    const sortedUnitKeys = Object.keys(quizzesByUnit).sort(customUnitSort);

    const getQuizStats = (quizId) => {
        const relevantScores = quizScores.filter(score => score.quizId === quizId);
        const uniqueStudents = new Set(relevantScores.map(s => s.studentId));
        return {
            submissions: relevantScores.length,
            studentsWhoTook: uniqueStudents.size
        };
    };

    const handleViewScores = (quiz) => {
        // <-- FIX: Find the post to get the 'availableUntil' date -->
        const post = sharedContentPosts.find(p => p.quizzes?.some(q => q.id === quiz.id));
        const availableUntil = post?.availableUntil;
        // <-- FIX: Pass 'availableUntil' along with the quiz data -->
        setSelectedQuizForScores({ ...quiz, availableUntil });
        setScoresDetailModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 font-semibold rounded-xl shadow-neumorphic transition-shadow duration-200 hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                >
                    <DocumentChartBarIcon className="h-5 w-5" />
                    Generate Report
                </button>
            </div>

            {quizzes.length === 0 ? (
                <div className="text-center p-12 bg-neumorphic-base rounded-2xl shadow-neumorphic-inset mt-4">
                    <ChartBarIcon className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
                    <p className="text-xl font-semibold text-slate-700">No Quizzes with Scores</p>
                    <p className="mt-2 text-base text-slate-500">Scores for shared quizzes will appear here once students complete them.</p>
                </div>
            ) : (
                sortedUnitKeys.map(unitName => (
                    <div key={unitName} className="bg-neumorphic-base rounded-2xl shadow-neumorphic">
                        <button className="flex items-center justify-between w-full p-4 font-semibold text-xl text-slate-800" onClick={() => toggleUnitCollapse(unitName)}>
                            <span>{unitName}</span>
                            <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${!collapsedUnits.has(unitName) ? 'rotate-180' : ''}`} />
                        </button>
                        {!collapsedUnits.has(unitName) && (
                            <div className="px-2 pb-2">
                                {quizzesByUnit[unitName].map(quiz => {
                                    const stats = getQuizStats(quiz.id);
                                    return (
                                        <div key={quiz.id} className="flex items-center justify-between gap-4 py-3 px-4 transition-shadow rounded-xl hover:shadow-neumorphic-inset">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 text-lg truncate">{quiz.title}</p>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {stats.studentsWhoTook} Student(s) took this quiz ({stats.submissions} total submissions)
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleViewScores(quiz)}
                                                className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                                            >
                                                View Scores
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default ScoresTab;