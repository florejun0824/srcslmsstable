import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    IdentificationCard, Users, Clock, Lightning, Trophy,
    PencilSimple, Trash, GraduationCap, Buildings, Printer,
    CaretRight, ChartBar, LockKey, Eye, CalendarBlank,
    ArrowRight, SealCheck
} from '@phosphor-icons/react';
import CountdownTimer from '../shared/CountdownTimer';

// --- ULTRA PREMIUM STATUS CONFIG ---
const getStatusConfig = (status, isExpired, isArchived) => {
    if (isArchived) return {
        label: 'Archived', 
        glow: 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-800',
        badgeText: 'text-slate-600 dark:text-slate-300',
        badgeBg: 'bg-slate-500/10 border-slate-500/20',
        dot: 'bg-slate-400', icon: LockKey, pulse: false
    };
    if (status === 'completed') return {
        label: 'Completed', 
        glow: 'from-violet-400 to-indigo-500 dark:from-violet-600 dark:to-indigo-900',
        badgeText: 'text-indigo-600 dark:text-indigo-300',
        badgeBg: 'bg-indigo-500/10 border-indigo-500/20',
        dot: 'bg-indigo-500', icon: Trophy, pulse: false
    };
    if (status === 'calculating') return {
        label: 'Tallying', 
        glow: 'from-amber-300 to-orange-500 dark:from-amber-600 dark:to-orange-900',
        badgeText: 'text-amber-700 dark:text-amber-400',
        badgeBg: 'bg-amber-500/10 border-amber-500/20',
        dot: 'bg-amber-500', icon: ChartBar, pulse: true
    };
    if (status === 'active' && isExpired) return {
        label: 'Action Needed', 
        glow: 'from-rose-400 to-pink-500 dark:from-rose-600 dark:to-pink-900',
        badgeText: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-500/10 border-rose-500/20',
        dot: 'bg-rose-500', icon: Clock, pulse: true
    };
    return {
        label: 'Live', 
        glow: 'from-emerald-300 to-teal-500 dark:from-emerald-600 dark:to-teal-900',
        badgeText: 'text-emerald-700 dark:text-emerald-400',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/20',
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

    const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <motion.div
            ref={ref}
            layout
            onClick={onClick}
            whileHover={election.hasTie ? undefined : { y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
            whileTap={election.hasTie ? undefined : { scale: 0.98 }}
            className={`group relative flex flex-col w-full h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[28px] md:rounded-[32px] overflow-hidden transition-all duration-500
                ${election.hasTie
                    ? 'opacity-70 cursor-not-allowed filter grayscale-[0.3] border border-slate-200 dark:border-slate-800'
                    : 'border border-white/80 dark:border-slate-700/50 hover:border-white dark:hover:border-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] cursor-pointer'
                }
            `}
        >
            {/* Ambient Status Glow Orb */}
            <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br ${statusConfig.glow} blur-[60px] opacity-40 mix-blend-multiply dark:mix-blend-screen transition-all duration-700 group-hover:scale-110 group-hover:opacity-60 pointer-events-none`} />

            {/* Tie-breaker overlay (Glassmorphism) */}
            {election.hasTie && election.tieBreakerId && (
                <div className="absolute inset-0 z-50 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center rounded-[28px] md:rounded-[32px] pointer-events-none">
                    <div className="bg-amber-100/90 dark:bg-amber-900/90 backdrop-blur-md text-amber-800 dark:text-amber-300 text-[10px] md:text-xs font-black px-4 py-2 rounded-full border border-amber-200 dark:border-amber-700/50 uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-amber-500/20">
                        <Lightning weight="fill" size={14} className="animate-pulse" />
                        Tie-Breaker Active
                    </div>
                </div>
            )}

            {/* --- TOP CONTENT --- */}
            <div className="relative z-10 p-4 md:p-6 flex-1 flex flex-col">
                
                {/* Badges Row */}
                <div className="flex items-center justify-between gap-2 mb-4 md:mb-5">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 md:py-1.5 rounded-full border backdrop-blur-md text-[10px] md:text-xs font-bold tracking-wide ${statusConfig.badgeBg} ${statusConfig.badgeText}`}>
                        <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                            {statusConfig.pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />}
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 ${statusConfig.dot}`} />
                        </span>
                        <StatusIcon weight="fill" size={14} />
                        <span>{statusConfig.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 md:py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {election.targetType === 'grade'
                            ? <GraduationCap weight="fill" className="text-violet-500" size={14} />
                            : <Buildings weight="fill" className="text-emerald-500" size={14} />
                        }
                        {targetLabel}
                    </div>
                </div>

                {/* Title & Organization */}
                <div className="mb-5 md:mb-6">
                    <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight line-clamp-2 mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {election.title}
                    </h3>
                    <div className="flex items-center gap-1.5 opacity-80">
                        <IdentificationCard weight="duotone" size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold truncate">{election.organization}</span>
                    </div>
                </div>

                {/* Neumorphic Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-5">
                    {/* Votes Box */}
                    <div className="bg-white/50 dark:bg-slate-800/40 rounded-[20px] md:rounded-[24px] p-3 md:p-4 border border-white dark:border-slate-700/50 shadow-inner">
                        <div className="flex items-center gap-1.5 mb-1 md:mb-2">
                            <Users weight="fill" className="text-indigo-500 w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Votes Cast</span>
                        </div>
                        <div className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                            {(election.totalVotes || 0).toLocaleString()}
                        </div>
                    </div>

                    {/* Deadline Box */}
                    <div className={`rounded-[20px] md:rounded-[24px] p-3 md:p-4 border shadow-inner ${
                        isExpired && !isCompleted
                            ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30'
                            : 'bg-white/50 dark:bg-slate-800/40 border-white dark:border-slate-700/50'
                    }`}>
                        <div className={`flex items-center gap-1.5 mb-1 md:mb-2 ${isExpired && !isCompleted ? 'text-rose-500' : 'text-slate-400'}`}>
                            <Clock weight="fill" className={`w-3 h-3 md:w-4 md:h-4 ${isExpired && !isCompleted ? 'text-rose-500' : 'text-emerald-500'}`} />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{isExpired ? 'Ended' : 'Ends'}</span>
                        </div>
                        <div className={`text-sm md:text-base font-extrabold tracking-tight ${isExpired && !isCompleted ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                            {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] md:text-xs text-slate-500 font-semibold mt-0.5">
                            {fmtTime(election.endDate)}
                        </div>
                    </div>
                </div>

                {/* Positions & Date Strip */}
                <div className="mt-auto space-y-3 md:space-y-4">
                    {/* Position Pills */}
                    {election.positions?.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {election.positions.slice(0, 3).map((pos, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1 md:py-1.5 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-full text-[10px] md:text-xs font-bold border border-slate-200/50 dark:border-slate-700/50 truncate max-w-[140px] shadow-sm"
                                >
                                    {pos.title}
                                </span>
                            ))}
                            {election.positions.length > 3 && (
                                <span className="px-3 py-1 md:py-1.5 bg-slate-50 dark:bg-slate-800/40 text-slate-400 rounded-full text-[10px] md:text-xs font-bold border border-slate-200/50 dark:border-slate-700/50">
                                    +{election.positions.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Clean Date Range */}
                    <div className="flex items-center gap-2 text-[10px] md:text-xs font-semibold text-slate-400">
                        <CalendarBlank size={14} weight="bold" />
                        <span>{fmtDate(election.startDate)}</span>
                        <ArrowRight size={12} weight="bold" className="text-slate-300 dark:text-slate-600" />
                        <span>{fmtDate(election.endDate)}</span>
                    </div>
                </div>
            </div>

            {/* --- ACTION FOOTER --- */}
            <div 
                className="relative z-10 p-4 md:p-6 pt-0 mt-2"
                onClick={e => e.stopPropagation()}
            >
                {isArchived ? (
                    <div className="flex gap-2 md:gap-3 h-12 md:h-14">
                        <button
                            onClick={onViewSummary}
                            className={`${canModify ? 'flex-1' : 'w-full'} rounded-[20px] bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs md:text-sm font-bold shadow-[0_8px_20px_rgba(99,102,241,0.25)] border-t border-white/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all`}
                        >
                            <Printer weight="fill" size={18} />
                            View Report
                            <CaretRight weight="bold" size={14} className="opacity-70" />
                        </button>
                        {canModify && (
                            <button
                                onClick={onDelete}
                                aria-label="Delete Archived Election"
                                className="w-12 md:w-14 flex items-center justify-center rounded-[20px] bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors active:scale-[0.95]"
                            >
                                <Trash weight="fill" size={20} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2 md:gap-3 h-12 md:h-14">
                        {canModify ? (
                            <>
                                {isActive && isExpired ? (
                                    <button
                                        onClick={onStartCountdown}
                                        className="flex-1 rounded-[20px] bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white text-xs md:text-sm font-bold shadow-[0_8px_20px_rgba(244,63,94,0.3)] border-t border-white/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <Lightning weight="fill" size={18} className="animate-pulse" />
                                        Start Official Count
                                    </button>
                                ) : isCalculating ? (
                                    <button
                                        onClick={handleFinalizeClick}
                                        disabled={!canFinalize || isFinalizing}
                                        className={`flex-1 rounded-[20px] text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all relative overflow-hidden active:scale-[0.98] border-t
                                            ${isFinalizing
                                                ? 'bg-emerald-700 text-white cursor-wait opacity-80 border-transparent'
                                                : canFinalize
                                                    ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] border-white/20'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-slate-200/50 dark:border-slate-700/50'
                                            }`}
                                    >
                                        {!canFinalize && !isFinalizing && (
                                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                                        )}
                                        {isFinalizing ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Finalizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                {canFinalize ? <Trophy weight="fill" size={18} /> : <ChartBar weight="fill" size={18} className="animate-pulse" />}
                                                <span>{canFinalize ? 'Proclaim Winners' : 'Calculating...'}</span>
                                                {!canFinalize && (
                                                    <div className="bg-slate-200/80 dark:bg-slate-700/80 px-2 py-1 rounded-md text-[10px] md:text-xs font-mono font-bold text-slate-600 dark:text-slate-300 ml-1">
                                                        <CountdownTimer revealTime={election.revealTime} onComplete={() => setCanFinalize(true)} />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>
                                ) : isCompleted ? (
                                    <button
                                        onClick={onViewSummary}
                                        className="flex-1 rounded-[20px] bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs md:text-sm font-bold shadow-[0_8px_20px_rgba(99,102,241,0.25)] border-t border-white/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                    >
                                        <SealCheck weight="fill" size={18} />
                                        View Results
                                    </button>
                                ) : (
                                    <button
                                        onClick={onEdit}
                                        className="flex-1 rounded-[20px] flex items-center justify-center gap-2 text-xs md:text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-[0.98]"
                                    >
                                        <PencilSimple weight="bold" size={18} />
                                        Edit Details
                                    </button>
                                )}

                                {!isCalculating && !isCompleted && (
                                    <button
                                        onClick={onDelete}
                                        aria-label="Delete Election"
                                        className="w-12 md:w-14 flex items-center justify-center rounded-[20px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors active:scale-[0.95]"
                                    >
                                        <Trash weight="fill" size={20} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 rounded-[20px] bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-xs md:text-sm font-bold flex items-center justify-center gap-2">
                                <Eye weight="fill" size={18} />
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