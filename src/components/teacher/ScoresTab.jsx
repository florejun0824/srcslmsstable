// src/components/teacher/ScoresTab.jsx

import React, { useState, useEffect } from 'react';
import { ChartBarIcon, ChevronDownIcon, DocumentChartBarIcon, PencilSquareIcon, CalendarDaysIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/solid';

const ScoresTab = ({
    units,
    quizScores, // This prop is crucial for receiving real-time updates
    sharedContentPosts, // This is the new source of truth
    setIsReportModalOpen,
    setSelectedQuizForScores,
    setScoresDetailModalOpen,
}) => {
    
    // (All state, hooks, and helper functions remain unchanged)
    const [collapsedPosts, setCollapsedPosts] = useState(new Set());
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());

    const togglePostCollapse = (postId) => {
        setCollapsedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });
    };

    const toggleUnitCollapse = (postId, unitDisplayName) => {
        const unitKey = `${postId}_${unitDisplayName}`;
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitKey)) newSet.delete(unitKey);
            else newSet.add(unitKey);
            return newSet;
        });
    };

    useEffect(() => {
        const newCollapsedPosts = new Set();
        const newCollapsedUnits = new Set();
        
        sharedContentPosts.forEach(post => {
            const postQuizzes = (post.quizzes || []);
            if (postQuizzes.length > 0) {
                newCollapsedPosts.add(post.id);
                postQuizzes.forEach(quiz => {
                    const unitDisplayName = units[quiz.unitId] || 'Uncategorized';
                    newCollapsedUnits.add(`${post.id}_${unitDisplayName}`);
                });
            }
        });
        
        setCollapsedPosts(newCollapsedPosts);
        setCollapsedUnits(newCollapsedUnits);
    }, [sharedContentPosts, units]);


    const customUnitSort = (a, b) => {
        // ... (no changes in this function)
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        const numA = parseInt(a.match(/\d+/)?.[0], 10);
        const numB = parseInt(b.match(/\d+/)?.[0], 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.localeCompare(b);
    };

    const quizzesByPostAndUnit = sharedContentPosts.reduce((acc, post) => {
        // ... (no changes in this logic)
        const postQuizzes = (post.quizzes || []);
        if (postQuizzes.length === 0) return acc;

        if (!acc[post.id]) {
            acc[post.id] = {
                post: post,
                units: {} 
            };
        }

        postQuizzes.forEach(quizDetails => {
            const unitDisplayName = units[quizDetails.unitId] || 'Uncategorized';
            if (!acc[post.id].units[unitDisplayName]) {
                acc[post.id].units[unitDisplayName] = [];
            }
            acc[post.id].units[unitDisplayName].push(quizDetails);
        });
        return acc;
    }, {});

    const postEntries = Object.values(quizzesByPostAndUnit).sort((a, b) => 
        (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0) 
    );

    const getQuizStats = (quizId) => {
        // ... (no changes in this function)
        const relevantScores = quizScores.filter(score => score.quizId === quizId);
        const uniqueStudents = new Set(relevantScores.map(s => s.studentId));
        return {
            submissions: relevantScores.length,
            studentsWhoTook: uniqueStudents.size
        };
    };

    const handleViewScores = (quiz, post) => {
        // ... (no changes in this function)
        setSelectedQuizForScores({ 
            ...quiz, 
            availableUntil: post.availableUntil,
            settings: post.quizSettings,
postId: post.id,       // <-- ADD THIS LINE
            classId: post.classId  // <-- ADD THIS LINE 
        });
        setScoresDetailModalOpen(true);
    };
    
    const allQuizzes = sharedContentPosts.flatMap(p => p.quizzes || []);

    return (
        // MODIFIED: Reduced mobile spacing
        <div className="space-y-4 sm:space-y-6">
            {allQuizzes.length === 0 ? (
                // --- MODIFIED: Added dark mode classes ---
                <div className="text-center p-6 sm:p-12 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark mt-4">
                    <ChartBarIcon className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200">No Quizzes with Scores</p>
                    <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">Scores for shared quizzes will appear here once students complete them.</p>
                </div>
            ) : (
                postEntries.map(({ post, units: unitsInPost }) => {
                    const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                    const isPostCollapsed = collapsedPosts.has(post.id);

                    return (
                        // --- MODIFIED: Added dark mode classes ---
                        <div key={post.id} className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
                            <button 
                                // MODIFIED: Reduced mobile padding
                                className="w-full text-left p-3 sm:p-4 group"
                                onClick={() => togglePostCollapse(post.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        {/* --- MODIFIED: Added dark mode classes --- */}
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg sm:text-xl group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">{post.title}</h3>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-3">
                                            {/* --- MODIFIED: Added dark mode classes --- */}
                                            <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3 text-slate-400 dark:text-slate-500" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                            {post.availableUntil && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3 text-slate-400 dark:text-slate-500" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                            {(() => {
                                                let targetText = "Target: All Students";
                                                if (post.targetAudience === 'all') targetText = "Target: All Students";
                                                else if (post.targetAudience === 'specific') targetText = `Target: ${post.targetStudentIds?.length || 0} Student(s)`;
                                                return <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3 text-slate-400 dark:text-slate-500" />{targetText}</span>;
                                            })()}
                                        </div>
                                    </div>
                                    {/* --- MODIFIED: Added dark mode classes --- */}
                                    <div className="flex-shrink-0 flex items-center gap-2 pl-2 sm:pl-4">
                                        <ChevronDownIcon className={`h-6 w-6 text-slate-500 dark:text-slate-400 transition-transform ${isPostCollapsed ? '' : 'rotate-180'}`} />
                                    </div>
                                </div>
                            </button>
                            
                            {!isPostCollapsed && (
                                // MODIFIED: Reduced mobile padding
                                <div className="space-y-3 px-2 sm:px-4 pb-3 sm:pb-4">
                                    {sortedUnitKeys.map(unitDisplayName => {
                                        const quizzesInUnit = unitsInPost[unitDisplayName];
                                        const unitKey = `${post.id}_${unitDisplayName}`;
                                        const isUnitCollapsed = collapsedUnits.has(unitKey);

                                        return (
                                            // --- MODIFIED: Added dark mode classes ---
                                            <div key={unitKey} className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                                                <button 
                                                    // MODIFIED: Reduced mobile padding and font size
                                                    className="flex items-center justify-between w-full p-3 sm:p-4 font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-100 group" 
                                                    onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}
                                                >
                                                    <span className="group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">{unitDisplayName}</span>
                                                    <ChevronDownIcon className={`h-6 w-6 text-slate-500 dark:text-slate-400 transition-transform ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                </button>

                                                {!isUnitCollapsed && (
                                                    <div className="px-2 pb-2">
                                                        {quizzesInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(quiz => {
                                                            const stats = getQuizStats(quiz.id);
                                                            return (
                                                                // --- MODIFIED: Added dark mode hover class ---
                                                                <div key={quiz.id} className="flex items-center justify-between gap-2 sm:gap-4 py-3 px-2 sm:px-4 transition-shadow rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                                                    <div className="flex-1 min-w-0">
                                                                        {/* --- MODIFIED: Added dark mode classes --- */}
                                                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">{quiz.title}</p>
                                                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                                                                            {stats.studentsWhoTook} Student(s) took this quiz ({stats.submissions} total submissions)
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleViewScores(quiz, post)}
                                                                        // --- MODIFIED: Added dark mode classes ---
                                                                        className="flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                                                                    >
                                                                        <span className="hidden sm:inline">View Scores</span>
                                                                        <span className="sm:hidden">Scores</span>
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default ScoresTab;