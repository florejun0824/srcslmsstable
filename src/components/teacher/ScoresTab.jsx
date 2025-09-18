// src/components/teacher/ScoresTab.js
import React from 'react';
import { ChartBarIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const ScoresTab = ({
    quizzes,
    units,
    sharedContentPosts,
    lessons,
    setIsReportModalOpen,
    setSelectedQuizForScores,
    setScoresDetailModalOpen,
    collapsedUnits,
    toggleUnitCollapse,
}) => {

    const handleViewQuizScores = (quiz) => {
        setSelectedQuizForScores(quiz);
        setScoresDetailModalOpen(true);
    };

    // CORE LOGIC: This complex logic for grouping quizzes by unit is 100% preserved.
    const quizzesByUnit = {};
    if (quizzes && units && sharedContentPosts && lessons) {
        sharedContentPosts.forEach(post => {
            const quizIds = post.quizIds || [];
            
            quizIds.forEach(quizId => {
                const quizDetails = quizzes.find(q => q.id === quizId);
                if (quizDetails) {
                    let unitDisplayName = 'Uncategorized'; // Default

                    if (quizDetails.unitId && units[quizDetails.unitId]) {
                        unitDisplayName = units[quizDetails.unitId];
                    } else if (post.lessonIds && post.lessonIds.length > 0) {
                        const lessonUnitTitlesInPost = new Set();
                        post.lessonIds.forEach(lessonId => {
                            const lesson = lessons.find(l => l.id === lessonId);
                            if (lesson && lesson.unitId && units[lesson.unitId]) {
                                lessonUnitTitlesInPost.add(units[lesson.unitId]);
                            }
                        });
                        if (lessonUnitTitlesInPost.size === 1) {
                            unitDisplayName = Array.from(lessonUnitTitlesInPost)[0];
                        } else if (lessonUnitTitlesInPost.size > 1) {
                            unitDisplayName = 'Uncategorized';
                        }
                    }

                    if (!quizzesByUnit[unitDisplayName]) {
                        quizzesByUnit[unitDisplayName] = [];
                    }
                    if (!quizzesByUnit[unitDisplayName].some(q => q.id === quizDetails.id)) {
                        quizzesByUnit[unitDisplayName].push(quizDetails);
                    }
                }
            });
        });
    }

    const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // A reusable EmptyState component styled for consistency.
    const EmptyState = ({ icon: Icon, text, subtext }) => (
        <div className="text-center p-12 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 animate-fadeIn mt-4">
            <Icon className="h-16 w-16 mb-4 text-gray-300 mx-auto" />
            <p className="text-xl font-semibold text-gray-700">{text}</p>
            <p className="mt-2 text-base text-gray-500">{subtext}</p>
        </div>
    );

    return (
        <div>
            {/* Refined "Generate Report" Button */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    disabled={!quizzes.length}
                    title="Generate Report"
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md active:scale-95
                        ${!quizzes.length
                        ? 'bg-gray-300 text-white cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                >
                    <ChartBarIcon className="w-5 h-5" />
                    <span>Generate Report</span>
                </button>
            </div>
            
            {/* Refined Collapsible List */}
            <div className="space-y-4">
                {sortedUnitKeys.length > 0 ? (
                    sortedUnitKeys.map(unitDisplayName => (
                        <div key={unitDisplayName} className="bg-white rounded-xl shadow-sm border border-gray-200/80 animate-fadeIn">
                            {/* Unit Header */}
                            <button
                                className="flex items-center justify-between w-full p-4 font-bold text-gray-800 hover:bg-slate-50 transition-colors rounded-t-xl"
                                onClick={() => toggleUnitCollapse(unitDisplayName)}
                            >
                                <span>{unitDisplayName}</span>
                                {collapsedUnits.has(unitDisplayName) ? (
                                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                ) : (
                                    <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                                )}
                            </button>
                            
                            {/* Quiz Items List */}
                            {!collapsedUnits.has(unitDisplayName) && (
                                <div className="px-2 pb-2 border-t border-gray-200/80">
                                    {quizzesByUnit[unitDisplayName]
                                        .sort((a, b) => a.title.localeCompare(b, undefined, { numeric: true }))
                                        .map(quiz => (
                                            <button
                                                key={quiz.id}
                                                className="w-full flex items-center justify-between gap-4 p-3 rounded-lg text-left hover:bg-slate-100/80 transition-colors"
                                                onClick={() => handleViewQuizScores(quiz)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-800 truncate">{quiz.title}</p>
                                                        <p className="text-sm text-gray-500">Click to view scores</p>
                                                    </div>
                                                </div>
                                                <ChevronRightIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <EmptyState
                        icon={ChartBarIcon}
                        text="No Quiz Scores Available"
                        subtext="Once students complete quizzes, their scores will appear here."
                    />
                )}
            </div>
        </div>
    );
};

export default ScoresTab;