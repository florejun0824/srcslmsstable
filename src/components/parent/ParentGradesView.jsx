// src/components/parent/ParentGradesView.jsx
import React, { useMemo, useState } from 'react';
import {
    AcademicCapIcon,
    ChartBarIcon,
    TrophyIcon,
    ClockIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/solid';

const getScoreColor = (percentage) => {
    if (percentage >= 90) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' };
    if (percentage >= 75) return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', bar: 'bg-blue-500' };
    if (percentage >= 60) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' };
    return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' };
};

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return 'N/A';
    }
};

const ParentGradesView = ({ grades = [], classes = [] }) => {
    // Track which classes are expanded (collapsed by default)
    const [expandedClasses, setExpandedClasses] = useState({});

    const toggleClass = (classId) => {
        setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
    };

    // Group grades by classId
    const gradesByClass = useMemo(() => {
        const map = {};
        classes.forEach(c => {
            map[c.id] = { className: c.name || 'Unknown Class', grades: [] };
        });

        grades.forEach(sub => {
            const classId = sub.classId;
            if (!map[classId]) {
                map[classId] = { className: 'Other', grades: [] };
            }
            map[classId].grades.push(sub);
        });

        return Object.entries(map)
            .filter(([, data]) => data.grades.length > 0)
            .map(([classId, data]) => {
                // Sort by date (newest first)
                data.grades.sort((a, b) => {
                    const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt || 0);
                    const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt || 0);
                    return dateB - dateA;
                });

                // Calculate average
                const validGrades = data.grades.filter(g => typeof g.score === 'number' && typeof g.totalItems === 'number' && g.totalItems > 0);
                const avg = validGrades.length > 0
                    ? validGrades.reduce((sum, g) => sum + (g.score / g.totalItems) * 100, 0) / validGrades.length
                    : null;

                return { classId, ...data, average: avg };
            });
    }, [grades, classes]);

    // Overall stats
    const overallStats = useMemo(() => {
        const validGrades = grades.filter(g => typeof g.score === 'number' && typeof g.totalItems === 'number' && g.totalItems > 0);
        const totalQuizzes = grades.length;
        const overallAvg = validGrades.length > 0
            ? validGrades.reduce((sum, g) => sum + (g.score / g.totalItems) * 100, 0) / validGrades.length
            : null;
        const perfectScores = validGrades.filter(g => g.score === g.totalItems).length;

        return { totalQuizzes, overallAvg, perfectScores };
    }, [grades]);

    if (grades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-[#E7E0EC] dark:bg-[#49454F] flex items-center justify-center mb-6">
                    <ChartBarIcon className="w-10 h-10 text-[#79747E] dark:text-[#CAC4D0]" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">No Grades Yet</h3>
                <p className="mt-2 text-sm text-[#49454F] dark:text-[#CAC4D0] max-w-sm">
                    Your child hasn't submitted any quizzes yet. Grades will appear here once they do.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* MD3 Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl sm:rounded-[20px] p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ChartBarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6750A4] dark:text-[#D0BCFF]" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Quizzes</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">{overallStats.totalQuizzes}</p>
                </div>
                <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl sm:rounded-[20px] p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                        <AcademicCapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6750A4] dark:text-[#D0BCFF]" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Average</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">
                        {overallStats.overallAvg !== null ? `${Math.round(overallStats.overallAvg)}%` : '—'}
                    </p>
                </div>
                <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl sm:rounded-[20px] p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrophyIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Perfect</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">{overallStats.perfectScores}</p>
                </div>
            </div>

            {/* Grades by Class — Collapsed by default */}
            {gradesByClass.map(({ classId, className, grades: classGrades, average }) => {
                const isExpanded = expandedClasses[classId] || false;

                return (
                    <div key={classId} className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-[24px] sm:rounded-[28px] border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
                        {/* Class Header — Clickable to expand/collapse */}
                        <button
                            onClick={() => toggleClass(classId)}
                            className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-[#F7F2FA] dark:hover:bg-[#2B2930] transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[14px] bg-[#EADDFF] dark:bg-[#4A4458] flex items-center justify-center">
                                    <AcademicCapIcon className="w-5 h-5 text-[#6750A4] dark:text-[#D0BCFF]" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-[#1D1B20] dark:text-[#E6E0E9] text-sm">{className}</h3>
                                    <p className="text-[10px] text-[#79747E] font-medium mt-0.5">
                                        {classGrades.length} quiz{classGrades.length !== 1 ? 'zes' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {average !== null && (
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getScoreColor(average).bg} ${getScoreColor(average).text}`}>
                                        {Math.round(average)}%
                                    </span>
                                )}
                                <div className={`w-7 h-7 rounded-full bg-[#E7E0EC] dark:bg-[#49454F] flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDownIcon className="w-4 h-4 text-[#49454F] dark:text-[#CAC4D0]" />
                                </div>
                            </div>
                        </button>

                        {/* Grade Rows — Shown only when expanded */}
                        {isExpanded && (
                            <div className="border-t border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] animate-in fade-in slide-in-from-top-1 duration-200">
                                {classGrades.map((sub) => {
                                    const percentage = sub.totalItems > 0 ? Math.round((sub.score / sub.totalItems) * 100) : 0;
                                    const colors = getScoreColor(percentage);

                                    return (
                                        <div key={sub.id} className="px-4 sm:px-6 py-3.5 flex items-center gap-3 sm:gap-4 hover:bg-[#F7F2FA] dark:hover:bg-[#2B2930] transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-[#1D1B20] dark:text-[#E6E0E9] text-sm truncate">
                                                    {sub.quizTitle || sub.quizId || 'Quiz'}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <ClockIcon className="w-3 h-3 text-[#79747E]" />
                                                    <span className="text-[10px] text-[#79747E] font-medium">{formatDate(sub.submittedAt)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <p className="text-sm font-semibold text-[#49454F] dark:text-[#CAC4D0]">
                                                    {sub.score}/{sub.totalItems}
                                                </p>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold min-w-[44px] text-center ${colors.bg} ${colors.text}`}>
                                                    {percentage}%
                                                </span>
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
    );
};

export default ParentGradesView;
