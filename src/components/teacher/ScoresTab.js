// src/components/teacher/ScoresTab.js
import React from 'react';
import { ChartBarIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

// REFINED: Reusable EmptyState component with better styling
const EmptyState = ({ icon: Icon, text, subtext, color }) => (
    <div className={`text-center p-8 bg-${color}-50 rounded-2xl shadow-inner border border-${color}-200 animate-fadeIn`}>
        <Icon className={`h-16 w-16 mb-4 text-${color}-400 mx-auto opacity-80`} />
        <p className={`text-xl font-bold text-${color}-700`}>{text}</p>
        <p className={`mt-2 text-sm text-${color}-500`}>{subtext}</p>
    </div>
);

// REFINED: Standardized card styles for a cleaner look
const baseCardClasses = `
    relative p-4 rounded-xl border transition-all duration-300 transform hover:scale-[1.005] hover:shadow-lg
    flex items-center justify-between gap-4
`;

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

    // Logic to group quizzes by their unit, identical to the original component.
    const quizzesByUnit = {};
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

    const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return (
        <div>
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    disabled={!quizzes.length}
                    title="Generate Report"
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-base transition-all duration-300 shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${!quizzes.length
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-500'
                        }`}
                >
                    <ChartBarIcon className="w-5 h-5" />
                    <span>Generate Report</span>
                </button>
            </div>
            <div className="space-y-6 pr-2 custom-scrollbar">
                {sortedUnitKeys.length > 0 ? (
                    sortedUnitKeys.map(unitDisplayName => (
                        <div key={unitDisplayName} className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slideInUp">
                            <button
                                className="flex items-center justify-between w-full p-4 font-bold text-lg text-gray-800 bg-gradient-to-r from-teal-50 to-white hover:from-teal-100 rounded-t-xl transition-all duration-200 border-b border-teal-100"
                                onClick={() => toggleUnitCollapse(unitDisplayName)}
                            >
                                {unitDisplayName}
                                {collapsedUnits.has(unitDisplayName) ? (
                                    <ChevronDownIcon className="h-6 w-6 text-teal-500 transition-transform duration-200" />
                                ) : (
                                    <ChevronUpIcon className="h-6 w-6 text-teal-500 transition-transform duration-200" />
                                )}
                            </button>
                            {!collapsedUnits.has(unitDisplayName) && (
                                <div className="p-4 space-y-4">
                                    {quizzesByUnit[unitDisplayName]
                                        .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
                                        .map(quiz => (
                                            <div
                                                key={quiz.id}
                                                className={`${baseCardClasses} bg-gradient-to-br from-white to-teal-50 border-teal-100 cursor-pointer`}
                                                onClick={() => handleViewQuizScores(quiz)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-teal-700 text-lg truncate">{quiz.title}</p>
                                                    <p className="text-sm text-gray-600 mt-1">Click to view detailed scores</p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <ChartBarIcon className="w-5 h-5 text-teal-500" />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <EmptyState
                        icon={ChartBarIcon}
                        text="No quiz scores available."
                        subtext="Share quizzes and students need to complete them to see scores here."
                        color="teal"
                    />
                )}
            </div>
        </div>
    );
};

export default ScoresTab;