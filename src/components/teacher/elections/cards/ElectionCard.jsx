import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    IdentificationCard, Users, Clock, Lightning, Trophy, 
    PencilSimple, Trash, GraduationCap, Buildings, Printer,
    CaretRight, ChartBar, LockKey
} from '@phosphor-icons/react';
import CountdownTimer from '../shared/CountdownTimer';

// --- ANIMATION VARIANTS ---
const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        transition: { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 } 
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    hover: { y: -4, transition: { duration: 0.3, ease: "easeOut" } }
};

const buttonVariants = {
    tap: { scale: 0.95 },
    hover: { scale: 1.02 }
};

// --- HELPER CONFIGS ---
const getStatusConfig = (status, isExpired, isArchived) => {
    if (isArchived) return {
        color: 'slate',
        label: 'Archived',
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-500 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        icon: LockKey
    };
    if (status === 'completed') return {
        color: 'purple',
        label: 'Completed',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        icon: Trophy
    };
    if (status === 'calculating') return {
        color: 'amber',
        label: 'Tallying',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: ChartBar
    };
    if (status === 'active' && isExpired) return {
        color: 'rose',
        label: 'Action Required',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        text: 'text-rose-600 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        icon: Clock
    };
    return {
        color: 'emerald',
        label: 'Active',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: Lightning
    };
};

const ElectionCard = ({ election, onClick, onEdit, onDelete, onStartCountdown, onFinalize, onViewSummary, isArchived }) => {
    const now = new Date();
    const endDate = new Date(election.endDate);
    const isExpired = now > endDate;
    const isActive = election.status === 'active';
    const isCalculating = election.status === 'calculating';
    
    // Timer Logic
    const [canFinalize, setCanFinalize] = useState(false);

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

    const statusConfig = getStatusConfig(election.status, isExpired, isArchived);
    const StatusIcon = statusConfig.icon;
    const targetLabel = election.targetType === 'grade' ? `Grade ${election.targetGrade}` : 'Campus Wide';

    return (
        <motion.div 
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover="hover"
            layout
            onClick={onClick}
            className="group relative flex flex-col w-full h-full bg-white dark:bg-[#121214] rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm hover:shadow-xl dark:shadow-black/50 transition-all duration-300 overflow-hidden cursor-pointer selection:bg-transparent"
        >
            {/* --- DECORATIVE BACKGROUNDS --- */}
            {/* Top Gradient Glow */}
            <div className={`absolute top-0 inset-x-0 h-32 opacity-10 pointer-events-none bg-gradient-to-b from-${statusConfig.color}-500 to-transparent`} />
            
            {/* --- MAIN CONTENT AREA --- */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col relative z-10">
                
                {/* 1. HEADER ROW */}
                <div className="flex justify-between items-start gap-3 mb-5">
                    {/* Status Badge */}
                    <div className={`
                        pl-2 pr-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-2 shadow-sm
                        ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}
                    `}>
                        <span className="relative flex h-2 w-2">
                            {(isActive || isCalculating) && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current`} />
                            )}
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                        </span>
                        {statusConfig.label}
                    </div>

                    {/* Target Badge */}
                    <div className="pl-2 pr-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                        {election.targetType === 'grade' 
                            ? <GraduationCap weight="duotone" className="text-indigo-500" size={14} /> 
                            : <Buildings weight="duotone" className="text-blue-500" size={14} />
                        }
                        {targetLabel}
                    </div>
                </div>
                
                {/* 2. TEXT CONTENT */}
                <div className="mb-6 relative">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {election.title}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wide">
                        <IdentificationCard weight="duotone" size={16} className="text-slate-400" />
                        <span className="truncate">{election.organization}</span>
                    </div>
                </div>

                {/* 3. METRICS WIDGETS */}
                <div className="mt-auto grid grid-cols-2 gap-3">
                    {/* Vote Counter */}
                    <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10 transition-colors">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Users weight="fill" className="text-blue-400/80" /> 
                            Votes
                        </div>
                        <div className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-200 font-mono tracking-tight">
                            {election.totalVotes?.toLocaleString() || 0}
                        </div>
                    </div>

                    {/* Time Display */}
                    <div className={`p-3.5 rounded-2xl border transition-colors flex flex-col justify-center
                        ${isExpired && !election.status === 'completed'
                            ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' 
                            : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'
                        }
                    `}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5
                            ${isExpired && !election.status === 'completed' ? 'text-red-500' : 'text-slate-400'}
                        `}>
                            <Clock weight="fill" className={isExpired ? "text-red-500" : "text-emerald-400/80"} /> 
                            {isExpired ? 'Ended' : 'Ends'}
                        </div>
                        <div className={`text-sm sm:text-base font-bold truncate
                             ${isExpired && !election.status === 'completed' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}
                        `}>
                            {endDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                        </div>
                        <div className="text-[10px] text-slate-400/80 font-medium">
                            {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. ACTION FOOTER (Glassmorphism) */}
            <div 
                className="p-4 mt-2 bg-slate-50/80 dark:bg-[#18191b]/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 z-20" 
                onClick={e => e.stopPropagation()}
            >
                {isArchived ? (
                    <motion.button 
                        variants={buttonVariants}
                        whileTap="tap"
                        onClick={onViewSummary} 
                        className="w-full h-11 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2.5 group/btn"
                    >
                        <Printer weight="duotone" size={18} /> 
                        View Report
                        <CaretRight weight="bold" className="opacity-50 group-hover/btn:translate-x-1 transition-transform" />
                    </motion.button>
                ) : (
                    <div className="flex gap-3 h-11">
                        {/* Primary Action Button */}
                        {isActive && isExpired ? (
                            <motion.button 
                                variants={buttonVariants}
                                whileTap="tap"
                                onClick={onStartCountdown} 
                                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2"
                            >
                                <Lightning weight="fill" size={18} className="animate-pulse" /> 
                                Start Count
                            </motion.button>
                        ) : isCalculating ? (
                            <motion.button 
                                variants={buttonVariants}
                                whileTap={canFinalize ? "tap" : undefined}
                                onClick={onFinalize} 
                                disabled={!canFinalize}
                                className={`flex-1 rounded-xl text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-3 transition-all relative overflow-hidden isolate
                                    ${canFinalize 
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/30 ring-1 ring-emerald-400/50' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                {/* Loading Shimmer for calculating state */}
                                {!canFinalize && (
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-[-1]" />
                                )}
                                
                                <div className="flex items-center gap-2">
                                    {canFinalize ? <Trophy weight="fill" size={18} /> : <ChartBar weight="duotone" size={18} className="animate-pulse" />}
                                    <span>{canFinalize ? 'Finalize' : 'Calculating...'}</span>
                                </div>
                                
                                {!canFinalize && (
                                    <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                        <CountdownTimer revealTime={election.revealTime} onComplete={() => setCanFinalize(true)} />
                                    </div>
                                )}
                            </motion.button>
                        ) : (
                            <motion.button 
                                variants={buttonVariants}
                                whileTap="tap"
                                onClick={onEdit} 
                                className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <PencilSimple weight="duotone" size={18} /> 
                                Edit
                            </motion.button>
                        )}

                        {/* Delete Button (Secondary) */}
                        {!isCalculating && (
                            <motion.button 
                                variants={buttonVariants}
                                whileTap="tap"
                                onClick={onDelete} 
                                aria-label="Delete Election"
                                className="w-12 sm:w-14 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <Trash weight="duotone" size={20} />
                            </motion.button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ElectionCard;