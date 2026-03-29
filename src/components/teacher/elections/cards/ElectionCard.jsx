import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    IdentificationCard, Users, Clock, Lightning, Trophy,
    PencilSimple, Trash, GraduationCap, Buildings, Printer,
    CaretRight, ChartBar, LockKey, Eye, CalendarBlank,
    ArrowRight, SealCheck
} from '@phosphor-icons/react';
import CountdownTimer from '../shared/CountdownTimer';

// --- STATUS CONFIG ---
const getStatusConfig = (status, isExpired, isArchived) => {
    if (isArchived) return {
        label: 'Archived', gradient: 'from-slate-400 to-slate-500',
        gradientBg: 'from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/80',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400', icon: LockKey, pulse: false
    };
    if (status === 'completed') return {
        label: 'Completed', gradient: 'from-indigo-500 to-violet-600',
        gradientBg: 'from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/10',
        badge: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        dot: 'bg-indigo-500', icon: Trophy, pulse: false
    };
    if (status === 'calculating') return {
        label: 'Tallying', gradient: 'from-amber-400 to-orange-500',
        gradientBg: 'from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10',
        badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500', icon: ChartBar, pulse: true
    };
    if (status === 'active' && isExpired) return {
        label: 'Action Needed', gradient: 'from-rose-500 to-pink-600',
        gradientBg: 'from-rose-50 to-pink-50 dark:from-rose-900/10 dark:to-pink-900/10',
        badge: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500', icon: Clock, pulse: true
    };
    return {
        label: 'Live', gradient: 'from-emerald-500 to-green-500',
        gradientBg: 'from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10',
        badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500', icon: Lightning, pulse: true
    };
};

const ElectionCard = React.forwardRef(({ election, onClick, onEdit, onDelete, onStartCountdown, onFinalize, onViewSummary, isArchived, canModify }, ref) => {
    const now = new Date();
    const endDate = new Date(election.endDate);
    const startDate = new Date(election.startDate);
    const isExpired = now > endDate;
    const isActive = election.status === 'active';
    const isCalculating = election.status === 'calculating';
    const isCompleted = election.status === 'completed';

    const [canFinalize, setCanFinalize] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        if (!election.revealTime || !isCalculating) return;
        const checkTimer = () => {
            const revealMs = election.revealTime?.toMillis ? election.revealTime.toMillis() : new Date(election.revealTime).getTime();
            if (Date.now() >= revealMs) setCanFinalize(true);
        };
        const interval = setInterval(checkTimer, 1000);
        checkTimer();
        return () => clearInterval(interval);
    }, [election.revealTime, isCalculating]);

    const handleFinalizeClick = async (e) => {
        e.stopPropagation();
        setIsFinalizing(true);
        try { await onFinalize(); } finally { setIsFinalizing(false); }
    };

    const statusConfig = getStatusConfig(election.status, isExpired, isArchived);
    const StatusIcon = statusConfig.icon;
    const targetLabel = election.targetType === 'grade' ? `Grade ${election.targetGrade}` : 'Campus Wide';

    // Format dates
    const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <motion.div
            ref={ref}
            layout
            onClick={onClick}
            whileHover={election.hasTie ? undefined : { y: -3, transition: { duration: 0.2 } }}
            whileTap={election.hasTie ? undefined : { scale: 0.99 }}
            className={`group relative flex flex-col w-full h-full bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden transition-shadow duration-300 selection:bg-transparent
                ${election.hasTie
                    ? 'opacity-70 cursor-not-allowed filter grayscale-[0.25] border-slate-200 dark:border-slate-800'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60 cursor-pointer'
                }
            `}
        >
            {/* --- GRADIENT HEADER STRIP --- */}
            <div className={`relative h-24 sm:h-28 bg-gradient-to-br ${statusConfig.gradientBg} px-5 pt-4 pb-3 flex flex-col justify-between border-b border-slate-100 dark:border-slate-800/80 overflow-hidden`}>
                {/* Decorative circle */}
                <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full bg-gradient-to-br ${statusConfig.gradient} opacity-[0.07]`} />
                <div className={`absolute -bottom-4 right-8 w-16 h-16 rounded-full bg-gradient-to-br ${statusConfig.gradient} opacity-[0.05]`} />

                {/* Status + Target row */}
                <div className="flex items-center justify-between gap-2 relative z-10">
                    {/* Status badge */}
                    <div className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-bold tracking-wide ${statusConfig.badge}`}>
                        <span className="relative flex h-1.5 w-1.5">
                            {statusConfig.pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />}
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusConfig.dot}`} />
                        </span>
                        <StatusIcon weight="fill" size={12} />
                        <span>{statusConfig.label}</span>
                    </div>

                    {/* Target chip */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/80 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {election.targetType === 'grade'
                            ? <GraduationCap weight="duotone" className="text-violet-500" size={12} />
                            : <Buildings weight="duotone" className="text-emerald-500" size={12} />
                        }
                        {targetLabel}
                    </div>
                </div>

                {/* Title block */}
                <div className="relative z-10">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white leading-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {election.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <IdentificationCard weight="duotone" size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-400 font-medium truncate">{election.organization}</span>
                    </div>
                </div>
            </div>

            {/* --- BODY --- */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4">

                {/* Metrics row */}
                <div className="grid grid-cols-2 gap-2.5">
                    {/* Votes */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Users weight="fill" className="text-indigo-500" size={12} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Votes Cast</span>
                        </div>
                        <div className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                            {(election.totalVotes || 0).toLocaleString()}
                        </div>
                    </div>

                    {/* End date */}
                    <div className={`rounded-xl p-3 border ${
                        isExpired && !isCompleted
                            ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60'
                    }`}>
                        <div className={`flex items-center gap-1.5 mb-1 ${isExpired && !isCompleted ? 'text-rose-500' : 'text-slate-400'}`}>
                            <Clock weight="fill" size={12} className={isExpired && !isCompleted ? 'text-rose-500' : 'text-emerald-500'} />
                            <span className="text-[9px] font-black uppercase tracking-wider">{isExpired ? 'Ended' : 'Ends'}</span>
                        </div>
                        <div className={`text-sm font-bold ${isExpired && !isCompleted ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {fmtTime(election.endDate)}
                        </div>
                    </div>
                </div>

                {/* Date range */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                    <CalendarBlank size={14} weight="duotone" className="text-slate-400 shrink-0" />
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium min-w-0 overflow-hidden">
                        <span className="truncate">{fmtDate(election.startDate)}</span>
                        <ArrowRight size={10} weight="bold" className="shrink-0 text-slate-300" />
                        <span className="truncate">{fmtDate(election.endDate)}</span>
                    </div>
                </div>

                {/* Positions count */}
                {election.positions?.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {election.positions.slice(0, 3).map((pos, i) => (
                            <span
                                key={i}
                                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/40 truncate max-w-[120px]"
                            >
                                {pos.title}
                            </span>
                        ))}
                        {election.positions.length > 3 && (
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-bold">
                                +{election.positions.length - 3} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* --- ACTION BAR --- */}
            <div
                className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Tie-breaker overlay */}
                {election.hasTie && election.tieBreakerId && (
                    <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex items-center justify-center rounded-b-2xl">
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/50 uppercase tracking-wider flex items-center gap-1.5">
                            <Lightning weight="fill" size={12} />
                            Tie-Breaker Active
                        </span>
                    </div>
                )}

                {isArchived ? (
                    <div className="flex gap-2 h-11">
                        <button
                            onClick={onViewSummary}
                            className={`${canModify ? 'flex-1' : 'w-full'} h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all`}
                        >
                            <Printer weight="duotone" size={16} />
                            View Report
                            <CaretRight weight="bold" size={12} />
                        </button>
                        {canModify && (
                            <button
                                onClick={onDelete}
                                aria-label="Delete Archived Election"
                                className="w-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800 transition-colors active:scale-[0.95]"
                            >
                                <Trash weight="duotone" size={17} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2 h-11">
                        {canModify ? (
                            <>
                                {isActive && isExpired ? (
                                    <button
                                        onClick={onStartCountdown}
                                        className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <Lightning weight="fill" size={16} className="animate-pulse" />
                                        Start Official Count
                                    </button>
                                ) : isCalculating ? (
                                    <button
                                        onClick={handleFinalizeClick}
                                        disabled={!canFinalize || isFinalizing}
                                        className={`flex-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all relative overflow-hidden active:scale-[0.98]
                                            ${isFinalizing
                                                ? 'bg-emerald-700 text-white cursor-wait opacity-80'
                                                : canFinalize
                                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        {!canFinalize && !isFinalizing && (
                                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        )}
                                        {isFinalizing ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Finalizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                {canFinalize ? <Trophy weight="fill" size={16} /> : <ChartBar weight="duotone" size={16} className="animate-pulse" />}
                                                <span>{canFinalize ? 'Proclaim Winners' : 'Calculating...'}</span>
                                                {!canFinalize && (
                                                    <div className="bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-lg text-[10px] font-mono">
                                                        <CountdownTimer revealTime={election.revealTime} onComplete={() => setCanFinalize(true)} />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>
                                ) : isCompleted ? (
                                    <button
                                        onClick={onViewSummary}
                                        className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                    >
                                        <SealCheck weight="fill" size={16} />
                                        View Results
                                    </button>
                                ) : (
                                    <button
                                        onClick={onEdit}
                                        className="flex-1 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 active:scale-[0.98]"
                                    >
                                        <PencilSimple weight="duotone" size={16} />
                                        Edit
                                    </button>
                                )}

                                {!isCalculating && !isCompleted && (
                                    <button
                                        onClick={onDelete}
                                        aria-label="Delete Election"
                                        className="w-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800 transition-colors active:scale-[0.95]"
                                    >
                                        <Trash weight="duotone" size={17} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                                <Eye weight="duotone" size={16} />
                                View Only
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
});

export default ElectionCard;