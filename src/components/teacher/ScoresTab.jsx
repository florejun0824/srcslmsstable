// src/components/teacher/ScoresTab.jsx

import React, { useState, useEffect } from 'react';
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
        <div className="space-y-6">
            {allQuizzes.length === 0 ? (
                // --- EMPTY STATE ---
                <div className="text-center p-10 sm:p-14 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/5 mt-6 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-5">
                        <ChartBarIcon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">No Quizzes with Scores</p>
                    <p className="mt-2 text-base text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Scores for shared quizzes will appear here once students complete them.</p>
                </div>
            ) : (
                postEntries.map(({ post, units: unitsInPost }) => {
                    const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                    const isPostCollapsed = collapsedPosts.has(post.id);

                    return (
                        // --- POST CONTAINER (Glass Card) ---
                        <div key={post.id} className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
                            <button 
                                className="w-full text-left p-5 group"
                                onClick={() => togglePostCollapse(post.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-xl group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors truncate tracking-tight">{post.title}</h3>
                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-4">
                                            <span className="flex items-center gap-1.5"><CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                            {post.availableUntil && <span className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5 text-slate-400" />Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>}
                                            {(() => {
                                                let targetText = "All Students";
                                                if (post.targetAudience === 'specific') targetText = `${post.targetStudentIds?.length || 0} Student(s)`;
                                                return <span className="flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5 text-slate-400" />Target: {targetText}</span>;
                                            })()}
                                        </div>
                                    </div>
                                    <div className={`p-1 rounded-full bg-slate-100 dark:bg-white/10 transition-transform duration-300 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                        <ChevronDownIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                    </div>
                                </div>
                            </button>
                            
                            {!isPostCollapsed && (
                                <div className="space-y-4 px-4 pb-5">
                                    {sortedUnitKeys.map(unitDisplayName => {
                                        const quizzesInUnit = unitsInPost[unitDisplayName];
                                        const unitKey = `${post.id}_${unitDisplayName}`;
                                        const isUnitCollapsed = collapsedUnits.has(unitKey);

                                        return (
                                            // --- UNIT GROUP (Inset Grouped List) ---
                                            <div key={unitKey} className="bg-white/50 dark:bg-black/20 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                                                <button 
                                                    className="flex items-center justify-between w-full px-4 py-3 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 group" 
                                                    onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}
                                                >
                                                    <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors truncate">{unitDisplayName}</span>
                                                    <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitCollapsed ? '' : 'rotate-180'}`} />
                                                </button>

                                                {!isUnitCollapsed && (
                                                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                                                        {quizzesInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(quiz => {
                                                            const stats = getQuizStats(quiz.id);
                                                            return (
                                                                <div key={quiz.id} className="flex items-center justify-between gap-4 py-3 px-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold text-slate-900 dark:text-white text-base truncate">{quiz.title}</p>
                                                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                                                            {stats.studentsWhoTook} Student(s) took this quiz • {stats.submissions} Submissions
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleViewScores(quiz, post)}
                                                                        className="flex-shrink-0 px-4 py-1.5 text-[13px] font-semibold text-slate-700 dark:text-white bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-white/20 transition-all active:scale-95"
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

export default ScoresTab;