// src/components/teacher/ScoresTab.jsx

import React, { useState, useEffect, memo } from 'react';
import { getWorker } from '../../workers/workerApi';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../services/firebase';         
import { 
    ChartBarIcon, 
    ChevronDownIcon, 
    CalendarDaysIcon, 
    ClockIcon, 
    UsersIcon, 
    LockClosedIcon,
    ExclamationCircleIcon,
    DocumentChartBarIcon
} from '@heroicons/react/24/solid';

const ScoresTab = ({
    units = {},
    quizScores = [], 
    sharedContentPosts = [],
    quizLocks = [],
    setIsReportModalOpen,
    setSelectedQuizForScores,
    setScoresDetailModalOpen,
}) => {
    // --- STATE ---
    const [expandedPosts, setExpandedPosts] = useState(new Set());
    const [expandedUnits, setExpandedUnits] = useState(new Set());

    // --- OPTIMIZATION 1: Real-time Cloud Analytics Fetching ---
    const [quizStatsMap, setQuizStatsMap] = useState({});
    
    // --- OPTIMIZATION 2: Data Grouping & Sorting (Worker) ---
    const [sortedPostEntries, setSortedPostEntries] = useState([]);
    useEffect(() => {
        if (!sharedContentPosts) {
            setSortedPostEntries([]);
            return;
        }
        let cancelled = false;
        const serializedPosts = sharedContentPosts.map(p => ({
            ...p,
            createdAt: p.createdAt ? { seconds: p.createdAt.seconds || (p.createdAt.toDate ? Math.floor(p.createdAt.toDate().getTime() / 1000) : Date.now() / 1000) } : null
        }));
        getWorker().groupPostsByUnit(serializedPosts, units).then(result => {
             if (!cancelled) setSortedPostEntries(result);
        });
        return () => { cancelled = true; };
    }, [sharedContentPosts, units]);

    // Listen to the Cloud Function's analytics documents ONLY for expanded units
    useEffect(() => {
        const unsubs = [];

        sortedPostEntries.forEach(({ post, units: unitsInPost }) => {
             const classId = post.classId;
             
             // SAFETY CHECK: Ensure classId exists before attempting to listen
             if (!classId) {
                 console.warn(`ScoresTab Notice: Missing classId on post "${post.title}". The stats listener cannot run for this item.`);
                 return; 
             }

             Object.keys(unitsInPost).forEach(unitName => {
                 const unitKey = `${post.id}_${unitName}`;
                 // Only attach listeners to units the teacher actually opened
                 if (expandedUnits.has(unitKey)) {
                     unitsInPost[unitName].forEach(quiz => {
                         const analyticsRef = doc(db, `classes/${classId}/quizzes/${quiz.id}/analytics/summary`);
                         const unsub = onSnapshot(analyticsRef, (docSnap) => {
                             if (docSnap.exists()) {
                                 const data = docSnap.data();
                                 setQuizStatsMap(prev => ({
                                     ...prev,
                                     [quiz.id]: {
                                         totalSubmissions: data.totalSubmissions || 0,
                                         averageScore: data.totalSubmissions > 0 
                                            ? (data.totalScoreSum / data.totalSubmissions) 
                                            : 0
                                     }
                                 }));
                             } else {
                                 // No submissions yet (or hasn't been backfilled)
                                 setQuizStatsMap(prev => ({
                                     ...prev,
                                     [quiz.id]: { totalSubmissions: 0, averageScore: 0 }
                                 }));
                             }
                         });
                         unsubs.push(unsub);
                     });
                 }
             });
        });

        // Cleanup listeners when units are collapsed or unmounted
        return () => unsubs.forEach(u => u());
    }, [sortedPostEntries, expandedUnits]);

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

    const handleOpenReport = (e) => {
        e.stopPropagation();
        setIsReportModalOpen(true);
    };

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
        <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ contentVisibility: 'auto' }}>
            
            <div className="flex justify-between items-center px-1 mb-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Performance Summary
                </h2>
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95"
                >
                    <DocumentChartBarIcon className="w-4 h-4 text-blue-500" />
                    Generate Report
                </button>
            </div>

            {sortedPostEntries.map(({ post, units: unitsInPost }) => {
                const isExpanded = expandedPosts.has(post.id);
                const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                const quizzesInPost = post.quizzes || [];
                
                const hasActiveLocks = quizzesInPost.some(q => quizLocks.some(lock => lock.quizId === q.id));
                
                // --- ROBUST DATE PARSING ---
                let isOverdue = false;
                let untilDateLabel = null;
                
                if (post.availableUntil) {
                    const parsedUntil = post.availableUntil.toDate 
                        ? post.availableUntil.toDate() 
                        : new Date(post.availableUntil.seconds ? post.availableUntil.seconds * 1000 : post.availableUntil);
                    
                    if (!isNaN(parsedUntil)) {
                        untilDateLabel = parsedUntil.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        isOverdue = new Date() > parsedUntil;
                    }
                }

                let fromDateLabel = 'N/A';
                if (post.availableFrom) {
                    const parsedFrom = post.availableFrom.toDate 
                        ? post.availableFrom.toDate() 
                        : new Date(post.availableFrom.seconds ? post.availableFrom.seconds * 1000 : post.availableFrom);
                        
                    if (!isNaN(parsedFrom)) {
                        fromDateLabel = parsedFrom.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    }
                }

                return (
                    <div key={post.id} className="group bg-white dark:bg-[#1c1c1e] rounded-[26px] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                        
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
                                        {hasActiveLocks ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                                                <LockClosedIcon className="w-3 h-3" /> Locked
                                            </div>
                                        ) : isOverdue ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                                <ExclamationCircleIcon className="w-3 h-3" /> Overdue
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge icon={CalendarDaysIcon} color="teal" text={`From: ${fromDateLabel}`} />
                                        {untilDateLabel && <Badge icon={ClockIcon} color={isOverdue ? "red" : "amber"} text={`Until: ${untilDateLabel}`} />}
                                        <Badge icon={UsersIcon} color="indigo" text={post.targetAudience === 'specific' ? `${post.targetStudentIds?.length || 0} Students` : "All Students"} />
                                    </div>
                                </div>
                                <div className={`p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-blue-50 dark:bg-blue-900/20 text-blue-500' : ''}`}>
                                    <ChevronDownIcon className="w-5 h-5" />
                                </div>
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="px-3 pb-3 sm:px-5 sm:pb-5 space-y-3 bg-slate-50/50 dark:bg-black/20 border-t border-black/5 dark:border-white/5 pt-4">
                                {sortedUnitKeys.map(unitName => {
                                    const unitKey = `${post.id}_${unitName}`;
                                    const isUnitExpanded = expandedUnits.has(unitKey);
                                    const quizzes = unitsInPost[unitName].sort((a, b) => (a.order || 0) - (b.order || 0));

                                    return (
                                        <div key={unitKey} className="bg-white dark:bg-[#151515] rounded-[20px] border border-slate-200/60 dark:border-white/5 overflow-hidden shadow-sm">
                                            <button 
                                                onClick={() => toggleUnit(unitKey)}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{unitName}</span>
                                                <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isUnitExpanded ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isUnitExpanded && (
                                                <div className="divide-y divide-slate-100 dark:divide-white/5 border-t border-slate-100 dark:border-white/5">
                                                    {quizzes.map(quiz => {
                                                        const stats = quizStatsMap[quiz.id] || { totalSubmissions: 0, averageScore: 0 };
                                                        
                                                        return (
                                                            <div key={quiz.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                                <div>
                                                                    <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">{quiz.title}</p>
                                                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                                        
                                                                        <span className="flex items-center gap-1.5">
                                                                            <ChartBarIcon className="w-3.5 h-3.5 opacity-70" />
                                                                            {stats.totalSubmissions} Submission{stats.totalSubmissions !== 1 ? 's' : ''}
                                                                        </span>

                                                                        {stats.totalSubmissions > 0 && (
                                                                            <>
                                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                                <span className="flex items-center gap-1.5">
                                                                                    <DocumentChartBarIcon className="w-3.5 h-3.5 opacity-70" />
                                                                                    Avg Score: {stats.averageScore.toFixed(1)}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex gap-2 w-full sm:w-auto">
                                                                    <button
                                                                        onClick={handleOpenReport}
                                                                        title="Generate Report for this Quiz"
                                                                        className="px-3 py-2.5 rounded-[14px] bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-white/10 transition-colors shadow-sm active:scale-95"
                                                                    >
                                                                        <DocumentChartBarIcon className="w-5 h-5" />
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleViewScores(quiz, post)}
                                                                        className="flex-1 px-5 py-2.5 rounded-[14px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95 text-center shadow-sm whitespace-nowrap"
                                                                    >
                                                                        View Scores
                                                                    </button>
                                                                </div>
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

export default memo(ScoresTab);