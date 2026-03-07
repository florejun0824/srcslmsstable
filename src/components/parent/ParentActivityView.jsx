// src/components/parent/ParentActivityView.jsx
import React, { useMemo } from 'react';
import {
    BookOpenIcon,
    PencilSquareIcon,
    UserGroupIcon,
    ClockIcon,
    SparklesIcon,
} from '@heroicons/react/24/solid';

const formatDateShort = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

const ACTIVITY_TYPES = {
    quiz: {
        icon: PencilSquareIcon,
        color: 'bg-[#EADDFF] dark:bg-[#4A4458] text-[#6750A4] dark:text-[#D0BCFF]',
        label: 'Quiz Submitted',
    },
    lesson: {
        icon: BookOpenIcon,
        color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        label: 'Lesson Completed',
    },
    class: {
        icon: UserGroupIcon,
        color: 'bg-[#D3E4FD] dark:bg-[#004A77]/30 text-[#0061A4] dark:text-[#9ECAFF]',
        label: 'Enrolled in Class',
    },
};

const ParentActivityView = ({ activityData }) => {
    const timeline = useMemo(() => {
        if (!activityData) return [];

        const events = [];

        // Quiz submissions
        (activityData.quizSubmissions || []).forEach(sub => {
            const date = sub.submittedAt?.toDate
                ? sub.submittedAt.toDate()
                : sub.createdAt?.toDate
                    ? sub.createdAt.toDate()
                    : new Date(sub.submittedAt || sub.createdAt || 0);
            events.push({
                type: 'quiz',
                title: sub.quizTitle || 'Quiz',
                detail: sub.totalItems ? `Score: ${sub.score}/${sub.totalItems}` : null,
                date,
                raw: sub,
            });
        });

        // Classes joined
        (activityData.classes || []).forEach(cls => {
            const date = cls.createdAt?.toDate
                ? cls.createdAt.toDate()
                : new Date(cls.createdAt || 0);
            events.push({
                type: 'class',
                title: cls.name || 'Class',
                detail: cls.teacherName ? `Teacher: ${cls.teacherName}` : null,
                date,
                raw: cls,
            });
        });

        // Sort by date, newest first
        events.sort((a, b) => b.date - a.date);
        return events;
    }, [activityData]);

    if (!activityData || timeline.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-[#E7E0EC] dark:bg-[#49454F] flex items-center justify-center mb-6">
                    <ClockIcon className="w-10 h-10 text-[#79747E] dark:text-[#CAC4D0]" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">No Activity Yet</h3>
                <p className="mt-2 text-sm text-[#49454F] dark:text-[#CAC4D0] max-w-sm">
                    Your child's activity will appear here as they interact with lessons and quizzes.
                </p>
            </div>
        );
    }

    const completedLessonsCount = (activityData.completedLessons || []).length;
    const submittedQuizzesCount = (activityData.quizSubmissions || []).length;

    // Calculate pending counts
    const unopenedLessonsCount = Math.max(0, (activityData.totalAssignedLessons || 0) - completedLessonsCount);
    // Note: submittedQuizzesCount might include multiple attempts for the same quiz or deleted quizzes. 
    // We do a simple subtraction here, assuming totalAssignedQuizzes is the baseline. 
    // For a more robust calculation, compare unique quiz IDs.
    const uniqueSubmittedQuizIds = new Set((activityData.quizSubmissions || []).map(q => q.quizId)).size;
    const unansweredQuizzesCount = Math.max(0, (activityData.totalAssignedQuizzes || 0) - uniqueSubmittedQuizIds);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* MD3 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl sm:rounded-[20px] p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <BookOpenIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Completed Lessons</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">
                        {completedLessonsCount}
                    </p>
                </div>
                <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl sm:rounded-[20px] p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <BookOpenIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Unopened Lessons</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">
                        {unopenedLessonsCount}
                    </p>
                </div>
                <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl sm:rounded-[20px] p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <PencilSquareIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6750A4] dark:text-[#D0BCFF]" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Submitted Quizzes</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">
                        {submittedQuizzesCount}
                    </p>
                </div>
                <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl sm:rounded-[20px] p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <PencilSquareIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Unanswered Quizzes</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">
                        {unansweredQuizzesCount}
                    </p>
                </div>
            </div>

            {/* MD3 Timeline */}
            <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-[24px] sm:rounded-[28px] border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-black/[0.04] dark:border-white/[0.06]">
                    <h3 className="font-semibold text-[#1D1B20] dark:text-[#E6E0E9] text-sm flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-[#79747E]" />
                        Recent Activity
                    </h3>
                </div>

                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                    {timeline.slice(0, 50).map((event, idx) => {
                        const config = ACTIVITY_TYPES[event.type];
                        const Icon = config.icon;

                        return (
                            <div key={idx} className="px-4 sm:px-6 py-3.5 flex items-center gap-3 sm:gap-4 hover:bg-[#F7F2FA] dark:hover:bg-[#2B2930] transition-colors">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] sm:rounded-[14px] flex items-center justify-center flex-shrink-0 ${config.color}`}>
                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#1D1B20] dark:text-[#E6E0E9] text-sm truncate">
                                        {event.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">{config.label}</span>
                                        {event.detail && (
                                            <>
                                                <span className="text-[#CAC4D0] dark:text-[#49454F]">•</span>
                                                <span className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] font-medium">{event.detail}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[10px] text-[#79747E] font-medium flex-shrink-0">
                                    {formatDateShort(event.date)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div >
    );
};

export default ParentActivityView;
