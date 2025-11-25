// src/components/teacher/ScoresTab.jsx

import React, { useState, useEffect, memo } from 'react';
import { ChartBarIcon, ChevronDownIcon, CalendarDaysIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/solid';

const ScoresTab = ({
    units,
    quizScores,
    sharedContentPosts,
    setIsReportModalOpen,
    setSelectedQuizForScores,
    setScoresDetailModalOpen,
}) => {
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
        const relevantScores = quizScores.filter(score => score.quizId === quizId);
        const uniqueStudents = new Set(relevantScores.map(s => s.studentId));
        return {
            submissions: relevantScores.length,
            studentsWhoTook: uniqueStudents.size
        };
    };

    const handleViewScores = (quiz, post) => {
        setSelectedQuizForScores({ 
            ...quiz, 
            availableUntil: post.availableUntil,
            settings: post.quizSettings,
            postId: post.id,
            classId: post.classId
        });
        setScoresDetailModalOpen(true);
    };
    
    const allQuizzes = sharedContentPosts.flatMap(p => p.quizzes || []);

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {allQuizzes.length === 0 ? (
                <div className="text-center p-8 sm:p-14 bg-white dark:bg-[#1A1D24] rounded-3xl border border-slate-200 dark:border-slate-700 mt-6 flex flex-col items-center justify-center shadow-sm">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 sm:mb-5">
                        <ChartBarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">No Quizzes with Scores</p>
                    <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Scores for shared quizzes will appear here once students complete them.</p>
                </div>
            ) : (
                postEntries.map(({ post, units: unitsInPost }) => {
                    const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                    const isPostCollapsed = collapsedPosts.has(post.id);

                    return (
                        <div key={post.id} className="bg-gradient-to-br from-white to-blue-50/30 dark:from-[#1A1D24] dark:to-[#1A1D24] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                            <button 
                                className="w-full text-left p-4 sm:p-6 group"
                                onClick={() => togglePostCollapse(post.id)}
                            >
                                <div className="flex justify-between items-start gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate tracking-tight">{post.title}</h3>
                                        
                                        {/* Metadata Row - Ultra Compact for Mobile */}
                                        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar w-full pb-1 mask-fade-right sm:gap-2 sm:mt-3">
                                            
                                            {/* From Date - Teal */}
                                            <div className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800/30 text-[9px] sm:text-xs sm:px-2.5 sm:py-1 sm:rounded-lg font-semibold">
                                                <CalendarDaysIcon className="h-3 w-3 opacity-80 sm:h-3.5 sm:w-3.5" />
                                                <span className="whitespace-nowrap">From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            
                                            {/* Until Date - Amber */}
                                            {post.availableUntil && (
                                                <div className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/30 text-[9px] sm:text-xs sm:px-2.5 sm:py-1 sm:rounded-lg font-semibold">
                                                    <ClockIcon className="h-3 w-3 opacity-80 sm:h-3.5 sm:w-3.5" />
                                                    <span className="whitespace-nowrap">Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            )}
                                            
                                            {/* Target - Indigo */}
                                            <div className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30 text-[9px] sm:text-xs sm:px-2.5 sm:py-1 sm:rounded-lg font-semibold">
                                                <UsersIcon className="h-3 w-3 opacity-80 sm:h-3.5 sm:w-3.5" />
                                                <span className="whitespace-nowrap">
                                                    {post.targetAudience === 'specific' 
                                                        ? `${post.targetStudentIds?.length || 0} Students` 
                                                        : "All Students"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={`p-1.5 sm:p-2 rounded-full bg-white/50 dark:bg-slate-800 text-slate-400 transition-transform duration-300 flex-shrink-0 border border-slate-100 dark:border-slate-700 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                        <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                </div>
                            </button>
                            
                            {!isPostCollapsed && (
                                <div className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
                                    {sortedUnitKeys.map(unitDisplayName => {
                                        const quizzesInUnit = unitsInPost[unitDisplayName];
                                        const unitKey = `${post.id}_${unitDisplayName}`;
                                        const isUnitCollapsed = collapsedUnits.has(unitKey);

                                        return (
                                            <div key={unitKey} className="bg-slate-50/80 dark:bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                                                <button 
                                                    className="flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50 group transition-colors hover:bg-slate-200/30 dark:hover:bg-slate-700/30" 
                                                    onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}
                                                >
                                                    <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{unitDisplayName}</span>
                                                    <ChevronDownIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                </button>

                                                {!isUnitCollapsed && (
                                                    <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                                                        {quizzesInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(quiz => {
                                                            const stats = getQuizStats(quiz.id);
                                                            return (
                                                                <div key={quiz.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-4 py-3 transition-colors hover:bg-white/60 dark:hover:bg-slate-800/60">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{quiz.title}</p>
                                                                        <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                                                                            <span className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{stats.studentsWhoTook} Taken</span>
                                                                            <span className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{stats.submissions} Subs</span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleViewScores(quiz, post)}
                                                                        className="flex items-center justify-center px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all active:scale-95 w-full sm:w-auto"
                                                                    >
                                                                        View Scores
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

export default memo(ScoresTab);