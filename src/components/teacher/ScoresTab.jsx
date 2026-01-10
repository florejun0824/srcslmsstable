// src/components/teacher/ScoresTab.jsx

import React, { useState, useMemo, memo } from 'react';
import { 
    ChartBarIcon, 
    ChevronDownIcon, 
    CalendarDaysIcon, 
    ClockIcon, 
    UsersIcon, 
    LockClosedIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/solid';

const ScoresTab = ({
    units = {},
    quizScores = [], // Array of all submissions
    sharedContentPosts = [], // Array of shared posts containing quizzes
    setIsReportModalOpen,
    setSelectedQuizForScores,
    setScoresDetailModalOpen,
}) => {
    // --- STATE: Default to Collapsed (Expanded Sets start empty) ---
    const [expandedPosts, setExpandedPosts] = useState(new Set());
    const [expandedUnits, setExpandedUnits] = useState(new Set());

    // --- OPTIMIZATION 1: High-Performance Stat Calculation ---
    // Transforms the flat list of scores into a fast lookup map: { [quizId]: { submissions: 5, avg: 85, ... } }
    const quizStatsMap = useMemo(() => {
        const stats = {};
        
        if (!quizScores || quizScores.length === 0) return stats;

        quizScores.forEach(submission => {
            const qId = submission.quizId;
            if (!stats[qId]) {
                stats[qId] = { 
                    count: 0, 
                    uniqueStudents: new Set(),
                    totalScore: 0
                };
            }
            stats[qId].count += 1;
            stats[qId].uniqueStudents.add(submission.studentId);
            stats[qId].totalScore += (submission.score || 0);
        });

        return stats;
    }, [quizScores]);

    // --- OPTIMIZATION 2: Data Grouping & Sorting ---
    const sortedPostEntries = useMemo(() => {
        if (!sharedContentPosts) return [];

        const grouped = sharedContentPosts.reduce((acc, post) => {
            const postQuizzes = post.quizzes || [];
            if (postQuizzes.length === 0) return acc;

            // Group quizzes by Unit
            const unitsInPost = {};
            postQuizzes.forEach(quiz => {
                const unitName = units[quiz.unitId] || 'Uncategorized';
                if (!unitsInPost[unitName]) unitsInPost[unitName] = [];
                unitsInPost[unitName].push(quiz);
            });

            acc.push({
                post,
                units: unitsInPost,
                // Sort helper: Use creation time or current time if missing
                timestamp: post.createdAt?.seconds || Date.now()
            });
            return acc;
        }, []);

        // Sort: Newest posts first
        return grouped.sort((a, b) => b.timestamp - a.timestamp);
    }, [sharedContentPosts, units]);

    // --- HANDLERS ---
    const togglePost = (postId) => {
        setExpandedPosts(prev => {
            const next = new Set(prev);
            if (next.has(postId)) next.delete(postId);
            else next.add(postId);
            return next;
        });
    };

    const toggleUnit = (uniqueKey) => {
        setExpandedUnits(prev => {
            const next = new Set(prev);
            if (next.has(uniqueKey)) next.delete(uniqueKey);
            else next.add(uniqueKey);
            return next;
        });
    };

    const handleViewScores = (quiz, post) => {
        setSelectedQuizForScores({ 
            ...quiz, 
            availableUntil: post.availableUntil,
            settings: post.quizSettings || {},
            postId: post.id,
            classId: post.classId
        });
        setScoresDetailModalOpen(true);
    };

    // Helper for sorting units (e.g. Unit 1, Unit 2, Unit 10)
    const customUnitSort = (a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    };

    // --- EMPTY STATE ---
    if (sortedPostEntries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 mt-8 bg-white dark:bg-[#1A1D24] rounded-[26px] border border-slate-200 dark:border-white/5 text-center shadow-sm">
                <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6">
                    <ChartBarIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Quizzes Found</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">
                    Quizzes shared with your classes will appear here.
                </p>
            </div>
        );
    }

    // --- MAIN RENDER ---
    return (
        <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {sortedPostEntries.map(({ post, units: unitsInPost }) => {
                const isExpanded = expandedPosts.has(post.id);
                const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                
                // Date Processing
                const fromDate = post.availableFrom?.toDate ? post.availableFrom.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A';
                
                let untilDateLabel = null;
                let isExpired = false;
                
                if (post.availableUntil) {
                    const untilDate = post.availableUntil.toDate ? post.availableUntil.toDate() : new Date(post.availableUntil);
                    untilDateLabel = untilDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    isExpired = new Date() > untilDate;
                }

                // Logic: Locked if manually locked OR expired
                const isLocked = post.quizSettings?.isLocked || isExpired;

                return (
                    <div key={post.id} className="group bg-white dark:bg-[#1c1c1e] rounded-[26px] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                        
                        {/* POST HEADER (Click to Expand) */}
                        <button 
                            onClick={() => togglePost(post.id)}
                            className="w-full text-left p-5 focus:outline-none bg-white/50 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-[17px] text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {post.title}
                                        </h3>
                                        {isLocked && (
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                                                <LockClosedIcon className="w-3 h-3" /> Locked
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata Badges */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge icon={CalendarDaysIcon} color="teal" text={`From: ${fromDate}`} />
                                        {untilDateLabel && <Badge icon={ClockIcon} color={isExpired ? "red" : "amber"} text={`Until: ${untilDateLabel}`} />}
                                        <Badge icon={UsersIcon} color="indigo" text={post.targetAudience === 'specific' ? `${post.targetStudentIds?.length || 0} Students` : "All Students"} />
                                    </div>
                                </div>

                                {/* Expand/Collapse Icon */}
                                <div className={`p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-blue-50 dark:bg-blue-900/20 text-blue-500' : ''}`}>
                                    <ChevronDownIcon className="w-5 h-5" />
                                </div>
                            </div>
                        </button>

                        {/* EXPANDED CONTENT (Units & Quizzes) */}
                        {isExpanded && (
                            <div className="px-3 pb-3 sm:px-5 sm:pb-5 space-y-3 bg-slate-50/50 dark:bg-black/20 border-t border-black/5 dark:border-white/5 pt-4">
                                {sortedUnitKeys.map(unitName => {
                                    const unitKey = `${post.id}_${unitName}`;
                                    const isUnitExpanded = expandedUnits.has(unitKey);
                                    const quizzes = unitsInPost[unitName].sort((a, b) => (a.order || 0) - (b.order || 0));

                                    return (
                                        <div key={unitKey} className="bg-white dark:bg-[#151515] rounded-[20px] border border-slate-200/60 dark:border-white/5 overflow-hidden shadow-sm">
                                            
                                            {/* UNIT HEADER */}
                                            <button 
                                                onClick={() => toggleUnit(unitKey)}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{unitName}</span>
                                                <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isUnitExpanded ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* QUIZ LIST */}
                                            {isUnitExpanded && (
                                                <div className="divide-y divide-slate-100 dark:divide-white/5 border-t border-slate-100 dark:border-white/5">
                                                    {quizzes.map(quiz => {
                                                        // Get stats from our optimized map
                                                        const stats = quizStatsMap[quiz.id] || { count: 0, uniqueStudents: new Set() };
                                                        const studentCount = stats.uniqueStudents.size;
                                                        
                                                        return (
                                                            <div key={quiz.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                                <div>
                                                                    <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">{quiz.title}</p>
                                                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <UsersIcon className="w-3.5 h-3.5 opacity-70" />
                                                                            {studentCount} Student{studentCount !== 1 ? 's' : ''} Taken
                                                                        </span>
                                                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                        <span className="flex items-center gap-1.5">
                                                                            <ChartBarIcon className="w-3.5 h-3.5 opacity-70" />
                                                                            {stats.count} Submissions
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <button
                                                                    onClick={() => handleViewScores(quiz, post)}
                                                                    className="px-5 py-2.5 rounded-[14px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95 w-full sm:w-auto text-center shadow-sm"
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
            })}
        </div>
    );
};

// --- HELPER COMPONENT FOR BADGES ---
const Badge = ({ icon: Icon, color, text }) => {
    const colors = {
        teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-800/30',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/30',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/30',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800/30',
    };
    
    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border text-[10px] font-bold ${colors[color] || colors.teal}`}>
            <Icon className="w-3.5 h-3.5 opacity-80" />
            <span className="whitespace-nowrap">{text}</span>
        </div>
    );
};

// Wrapping in memo prevents unnecessary re-renders from parent updates if props are identical
export default memo(ScoresTab);