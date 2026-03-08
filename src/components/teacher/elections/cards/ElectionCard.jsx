import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    IdentificationCard, Users, Clock, Lightning, Trophy,
    PencilSimple, Trash, GraduationCap, Buildings, Printer,
    CaretRight, ChartBar, LockKey, Eye
} from '@phosphor-icons/react';
import CountdownTimer from '../shared/CountdownTimer';

// --- ANIMATION VARIANTS ---
const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    hover: { y: -3, transition: { duration: 0.25, ease: "easeOut" } }
};

// --- HELPER CONFIGS ---
const getStatusConfig = (status, isExpired, isArchived) => {
    if (isArchived) return { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', icon: LockKey, pulse: false };
    if (status === 'completed') return { label: 'Completed', bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500', icon: Trophy, pulse: false };
    if (status === 'calculating') return { label: 'Tallying', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', icon: ChartBar, pulse: true };
    if (status === 'active' && isExpired) return { label: 'Action Required', bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', icon: Clock, pulse: true };
    return { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', icon: Lightning, pulse: true };
};

const ElectionCard = React.forwardRef(({ election, onClick, onEdit, onDelete, onStartCountdown, onFinalize, onViewSummary, isArchived, canModify }, ref) => {
    const now = new Date();
    const endDate = new Date(election.endDate);
    const isExpired = now > endDate;
    const isActive = election.status === 'active';
    const isCalculating = election.status === 'calculating';

    const [canFinalize, setCanFinalize] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false); // <-- Added loading state

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

    // Wrapper to handle the async spinner state
    const handleFinalizeClick = async (e) => {
        e.stopPropagation(); // <-- Catch the click event here
        setIsFinalizing(true);
        try {
            await onFinalize(); // <-- Remove 'election' from here
        } finally {
            setIsFinalizing(false);
        }
    };

    const statusConfig = getStatusConfig(election.status, isExpired, isArchived);
    const targetLabel = election.targetType === 'grade' ? `Grade ${election.targetGrade}` : 'Campus Wide';

    return (
        <motion.div
            ref={ref}
            variants={cardVariants}
            initial="hidden" animate="visible" exit="exit"
            whileHover={election.hasTie ? undefined : "hover"}
            layout
            onClick={onClick}
            className={`group relative flex flex-col w-full h-full bg-white dark:bg-[#1e293b] rounded-[20px] border border-slate-200/60 dark:border-white/10 transition-all duration-300 overflow-hidden selection:bg-transparent
                ${election.hasTie ? 'opacity-70 cursor-not-allowed filter grayscale-[0.2]' : 'hover:shadow-lg cursor-pointer'}
            `}
        >
            {/* --- MAIN CONTENT AREA --- */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col">

                {/* 1. HEADER ROW: Status + Target chips */}
                <div className="flex justify-between items-start gap-3 mb-5">
                    <div className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text}`}>
                        <span className="relative flex h-2 w-2">
                            {statusConfig.pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dot}`} />
                        </span>
                        {statusConfig.label}
                    </div>

                    <div className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {election.targetType === 'grade'
                            ? <GraduationCap weight="duotone" className="text-indigo-500" size={14} />
                            : <Buildings weight="duotone" className="text-blue-500" size={14} />
                        }
                        {targetLabel}
                    </div>
                </div>

                {/* 2. TEXT CONTENT */}
                <div className="mb-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {election.title}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                        <IdentificationCard weight="duotone" size={16} />
                        <span className="truncate">{election.organization}</span>
                    </div>
                </div>

                {/* 3. METRICS WIDGETS */}
                <div className="mt-auto grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Users weight="fill" className="text-blue-600 opacity-70" />
                            Votes
                        </div>
                        <div className="text-xl font-bold text-slate-700 dark:text-slate-200 tabular-nums tracking-tight">
                            {election.totalVotes?.toLocaleString() || 0}
                        </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex flex-col justify-center
                        ${isExpired && election.status !== 'completed' ? 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-white/5'}
                    `}>
                        <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5
                            ${isExpired && election.status !== 'completed' ? 'text-rose-500' : 'text-slate-400'}
                        `}>
                            <Clock weight="fill" className={isExpired ? "text-rose-500" : "text-emerald-500 opacity-70"} />
                            {isExpired ? 'Ended' : 'Ends'}
                        </div>
                        <div className={`text-base font-semibold truncate
                             ${isExpired && election.status !== 'completed' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}
                        `}>
                            {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="p-4 border-t border-slate-100 relative"
                onClick={e => e.stopPropagation()}
            >
                {election.hasTie && election.tieBreakerId && (
                    <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-200 shadow-sm uppercase tracking-wider">
                            Tie-Breaker Active
                        </span>
                    </div>
                )}
                {isArchived ? (
                    <div className="flex gap-2.5 h-11">
                        <button
                            onClick={onViewSummary}
                            className={`${canModify ? 'flex-1' : 'w-full'} h-11 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2.5 group/btn active:scale-[0.98]`}
                        >
                            <Printer weight="duotone" size={18} />
                            View Report
                            <CaretRight weight="bold" className="opacity-50 group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        {canModify && (
                            <button
                                onClick={onDelete}
                                aria-label="Delete Archived Election"
                                className="w-11 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors active:scale-[0.95]"
                            >
                                <Trash weight="duotone" size={18} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2.5 h-11">
                        {canModify ? (
                            <>
                                {isActive && isExpired ? (
                                    <button
                                        onClick={onStartCountdown}
                                        className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <Lightning weight="fill" size={18} className="animate-pulse" />
                                        Start Count
                                    </button>
                                ) : isCalculating ? (
                                    <button
                                        onClick={handleFinalizeClick}
                                        disabled={!canFinalize || isFinalizing}
                                        className={`flex-1 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition-all relative overflow-hidden active:scale-[0.98]
                                            ${isFinalizing
                                                ? 'bg-emerald-700 text-white cursor-wait opacity-80'
                                                : canFinalize
                                                    ? 'bg-emerald-600 text-white shadow-md hover:shadow-lg'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
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
                                                {canFinalize ? <Trophy weight="fill" size={18} /> : <ChartBar weight="duotone" size={18} className="animate-pulse" />}
                                                <span>{canFinalize ? 'Finalize' : 'Calculating...'}</span>

                                                {!canFinalize && (
                                                    <div className="hidden sm:flex bg-black/5 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                                        <CountdownTimer revealTime={election.revealTime} onComplete={() => setCanFinalize(true)} />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={election.status === 'completed' ? undefined : onEdit}
                                        disabled={election.status === 'completed'}
                                        className={`flex-1 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all
                                            ${election.status === 'completed'
                                                ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                                                : 'bg-slate-100 border border-slate-200/50 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-transparent active:scale-[0.98]'
                                            }`}
                                    >
                                        <PencilSimple weight="duotone" size={18} className={election.status === 'completed' ? 'opacity-50' : ''} />
                                        Edit
                                    </button>
                                )}

                                {!isCalculating && (
                                    <button
                                        onClick={onDelete}
                                        aria-label="Delete Election"
                                        className="w-11 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors active:scale-[0.95]"
                                    >
                                        <Trash weight="duotone" size={18} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 rounded-full bg-slate-50 border border-slate-100 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                                <Eye weight="duotone" size={18} />
                                Viewing as Guest
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
});

export default ElectionCard;