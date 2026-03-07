// src/components/admin/AdminMonitoringView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    ChartLineUp,
    Clock,
    BookOpenText,
    Exam,
    Megaphone,
    VideoCamera,
    CaretDown,
    UserCircle,
    Desktop,
    Users
} from '@phosphor-icons/react';
import { getMultipleUsersWeeklyStats, computeAverages, formatDuration } from '../../services/sessionTrackingService';
import { motion, AnimatePresence } from 'framer-motion';

const AdminMonitoringView = ({ teachers = [] }) => {
    const [teacherStats, setTeacherStats] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [expandedTeacher, setExpandedTeacher] = useState(null);

    // Fetch stats for all teachers
    useEffect(() => {
        if (teachers.length === 0) {
            setIsLoading(false);
            return;
        }

        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const teacherIds = teachers.map(t => t.id);
                const stats = await getMultipleUsersWeeklyStats(teacherIds, 4);
                setTeacherStats(stats);
            } catch (err) {
                console.error('Failed to fetch teacher stats:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [teachers]);

    // Compute summary for each teacher
    const teacherSummaries = useMemo(() => {
        return teachers.map(teacher => {
            const stats = teacherStats.get(teacher.id) || [];
            const latestWeek = stats[0] || {};
            const averages = computeAverages(stats);

            return {
                ...teacher,
                stats,
                latestWeek,
                averages,
                totalLessons: stats.reduce((sum, w) => sum + (w.lessonPosted || 0), 0),
                totalQuizzes: stats.reduce((sum, w) => sum + (w.quizSent || 0), 0),
                totalAnnouncements: stats.reduce((sum, w) => sum + (w.announcementPosted || 0), 0),
                totalOnlineClasses: stats.reduce((sum, w) => sum + (w.onlineClassDone || 0), 0),
            };
        });
    }, [teachers, teacherStats]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="w-10 h-10 border-4 border-slate-200 dark:border-white/10 border-t-[var(--monet-primary)] rounded-full animate-spin" />
            </div>
        );
    }

    if (teachers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-200 dark:ring-white/10">
                    <Users size={36} weight="duotone" className="text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">No Instructor Feeds Live</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-sm">Data streams from registered teachers in your network will appear here automatically.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">

            {/* MD3 Header Title */}
            <div className="px-1 flex flex-col mb-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Network Activity</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Real-time performance metrics and engagement tracking for your teaching staff.</p>
            </div>

            {/* Top Level Summary Stats - MD3 Elevated Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <SummaryCard
                    icon={ChartLineUp}
                    label="Avg Logins/Wk"
                    value={
                        teacherSummaries.length > 0
                            ? (teacherSummaries.reduce((s, t) => s + t.averages.avgLoginsPerWeek, 0) / teacherSummaries.length).toFixed(1)
                            : '0'
                    }
                    sub="System Average"
                    colorClass="text-blue-600 dark:text-blue-400"
                    bgClass="bg-blue-50 dark:bg-blue-500/10"
                />
                <SummaryCard
                    icon={Desktop}
                    label="Screen Time"
                    value={
                        teacherSummaries.length > 0
                            ? formatDuration(teacherSummaries.reduce((s, t) => s + t.averages.avgScreenTimePerWeek, 0) / teacherSummaries.length)
                            : '0m'
                    }
                    sub="System Average"
                    colorClass="text-sky-600 dark:text-sky-400"
                    bgClass="bg-sky-50 dark:bg-sky-500/10"
                />
                <SummaryCard
                    icon={BookOpenText}
                    label="Lessons Added"
                    value={teacherSummaries.reduce((s, t) => s + t.totalLessons, 0)}
                    sub="Global (Last 4 Weeks)"
                    colorClass="text-emerald-600 dark:text-emerald-400"
                    bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <SummaryCard
                    icon={Exam}
                    label="Quizzes Sent"
                    value={teacherSummaries.reduce((s, t) => s + t.totalQuizzes, 0)}
                    sub="Global (Last 4 Weeks)"
                    colorClass="text-amber-600 dark:text-amber-400"
                    bgClass="bg-amber-50 dark:bg-amber-500/10"
                />
            </div>

            {/* Teacher List */}
            <div className="flex flex-col gap-3">
                <div className="px-2 pb-1">
                    <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Instructor Telemetry</h2>
                </div>
                {teacherSummaries.map(teacher => {
                    const isExpanded = expandedTeacher === teacher.id;

                    return (
                        <div key={teacher.id} className="neural-glass rounded-[24px] border border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white/70 dark:bg-[#121214]/70">
                            {/* Teacher Header Row (Clickable) */}
                            <button
                                onClick={() => setExpandedTeacher(isExpanded ? null : teacher.id)}
                                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors text-left focus:outline-none"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner">
                                    {teacher.photoURL ? (
                                        <img src={teacher.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircle size={24} weight="duotone" className="text-slate-400" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                        {teacher.firstName} {teacher.lastName}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5 opacity-80">
                                        <span className="text-xs font-medium text-slate-500">
                                            {teacher.averages.avgLoginsPerWeek} Logins/wk
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        <span className="text-xs font-medium text-slate-500">
                                            {formatDuration(teacher.averages.avgScreenTimePerWeek)} Screen Time
                                        </span>
                                    </div>
                                </div>

                                {/* Mini Badges for Desktop */}
                                <div className="hidden lg:flex items-center gap-2 mr-4">
                                    <MiniBadge icon={BookOpenText} value={teacher.totalLessons} label="Lessons" />
                                    <MiniBadge icon={Exam} value={teacher.totalQuizzes} label="Quizzes" />
                                    <MiniBadge icon={Megaphone} value={teacher.totalAnnouncements} label="Announcements" />
                                    <MiniBadge icon={VideoCamera} value={teacher.totalOnlineClasses} label="Live Classes" />
                                </div>

                                <div className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-[var(--monet-primary)]/10 text-[var(--monet-primary)]' : 'text-slate-500'}`}>
                                    <CaretDown size={14} weight="bold" />
                                </div>
                            </button>

                            {/* Expandable Details Area */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20"
                                    >
                                        <div className="p-5 space-y-6">

                                            {/* Mobile Badges (Shown when expanded on small screens) */}
                                            <div className="flex lg:hidden items-center gap-2 flex-wrap pb-2 border-b border-slate-200/50 dark:border-white/5">
                                                <MiniBadge icon={BookOpenText} value={teacher.totalLessons} label="Lessons" />
                                                <MiniBadge icon={Exam} value={teacher.totalQuizzes} label="Quizzes" />
                                                <MiniBadge icon={Megaphone} value={teacher.totalAnnouncements} label="Announcements" />
                                                <MiniBadge icon={VideoCamera} value={teacher.totalOnlineClasses} label="Live Classes" />
                                            </div>

                                            {/* MD3 Tonal Metric Cards */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <DetailMetric icon={ChartLineUp} label="Avg Logins" value={teacher.averages.avgLoginsPerWeek} color="text-blue-600 dark:text-blue-400" />
                                                <DetailMetric icon={Desktop} label="Avg Time" value={formatDuration(teacher.averages.avgScreenTimePerWeek)} color="text-sky-600 dark:text-sky-400" />
                                                <DetailMetric icon={BookOpenText} label="Total Lessons" value={teacher.totalLessons} color="text-emerald-600 dark:text-emerald-400" />
                                                <DetailMetric icon={Exam} label="Total Quizzes" value={teacher.totalQuizzes} color="text-amber-600 dark:text-amber-400" />
                                            </div>

                                            {/* Weekly Breakdown Table Structure */}
                                            {teacher.stats.length > 0 ? (
                                                <div className="mt-4">
                                                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Weekly Pulse Data</h4>
                                                    <div className="space-y-2">
                                                        {teacher.stats.map((week, idx) => (
                                                            <div key={week.weekKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/50 dark:border-transparent shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-black/40 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                                        W{idx + 1}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[80px]">
                                                                        {week.weekKey}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide text-xs font-medium text-slate-600 dark:text-slate-400">
                                                                    <div className="flex items-center gap-1.5 min-w-[80px]">
                                                                        <ChartLineUp size={14} className="text-blue-400" />
                                                                        {week.loginCount || 0} logins
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 min-w-[90px]">
                                                                        <Clock size={14} className="text-sky-400" />
                                                                        {formatDuration(week.totalScreenTimeMs)}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 min-w-[80px]">
                                                                        <BookOpenText size={14} className="text-emerald-400" />
                                                                        {week.lessonPosted || 0} lessons
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 min-w-[80px]">
                                                                        <Exam size={14} className="text-amber-400" />
                                                                        {week.quizSent || 0} quizzes
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-8 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                                                    <p className="text-sm font-medium text-slate-500">No weekly data recorded yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Sub-components (MD3 Styled) ---

const SummaryCard = ({ icon: Icon, label, value, sub, colorClass, bgClass }) => (
    <div className="neural-glass bg-white/80 dark:bg-[#1A1C23]/80 rounded-[24px] p-5 lg:p-6 border border-slate-200/50 dark:border-white/5 shadow-sm relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${bgClass}`} />
        <div className="relative z-10 flex flex-col h-full justify-between gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bgClass} ${colorClass}`}>
                <Icon size={20} weight="duotone" />
            </div>
            <div>
                <p className="text-[28px] font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1 shadow-sm mix-blend-luminosity">
                    {value}
                </p>
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    {label}
                </h4>
                {sub && <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
            </div>
        </div>
    </div>
);

const MiniBadge = ({ icon: Icon, value, label }) => (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5" title={label}>
        <Icon size={14} weight="duotone" className="text-slate-500 dark:text-slate-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
    </div>
);

const DetailMetric = ({ icon: Icon, label, value, color }) => (
    <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-[#1A1C23] border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-2">
            <Icon size={16} weight="duotone" className={color} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-lg font-black text-slate-900 dark:text-white truncate">{value}</p>
    </div>
);

export default AdminMonitoringView;

