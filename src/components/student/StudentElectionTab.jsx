// src/components/student/StudentElectionTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle,
    CaretRight,
    CaretLeft,
    ChartBar,
    Lightning,
    Trophy,
    CalendarBlank,
    Users,
    Clock,
    ShieldCheck,
    Archive,
    ArrowCounterClockwise,
    IdentificationCard,
    WarningCircle,
    Check,
    PencilSimple,
    ArrowDown
} from '@phosphor-icons/react';
import { electionService } from '../../services/electionService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

import Lottie from 'lottie-react';
import countingAnimation from '../../assets/data.json';

// --- CUSTOM HOOK ---
const useWindowSizeCustom = () => {
    const [size, setSize] = useState([0, 0]);
    useEffect(() => {
        const updateSize = () => setSize([window.innerWidth, window.innerHeight]);
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    return { width: size[0], height: size[1] };
};

// --- HELPER: Read Cloud Function Data safely ---
const getVotes = (election, posTitle, candId, candName) => {
    if (!election) return 0;
    // 1. Cloud Function format (Finalized)
    // Supports both ID and Name lookup for server transparency
    if (election.finalResults) {
        if (election.finalResults[candId] !== undefined) return election.finalResults[candId];
        if (election.finalResults[candName] !== undefined) return election.finalResults[candName];
    }
    
    // 2. Legacy / Live format
    const legacy = election.results || election.tally || election.liveResults || {};
    if (legacy[posTitle]) {
        if (legacy[posTitle][candName] !== undefined) return legacy[posTitle][candName];
        if (legacy[posTitle][candId] !== undefined) return legacy[posTitle][candId];
    }
    return 0;
};

// ==========================================
// RESULT ELECTION CARD (VERCEL STYLE)
// ==========================================
const ElectionResultCard = ({ election }) => {
    const [expandedPositions, setExpandedPositions] = useState({});
    
    // Cloud function compatibility
    const totalVotes = election.totalVotesCast || election.totalVotes || 0;
    const isTieBreaker = election.isTieBreaker;
    const isCalculating = election.status === 'calculating';
    const isCompleted = election.status === 'completed' || election.status === 'archived';

    const togglePosition = (posTitle) => {
        setExpandedPositions(prev => ({ ...prev, [posTitle]: !prev[posTitle] }));
    };

    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-full">
            
            {/* Result Header */}
            <div className="bg-slate-50/50 dark:bg-[#151515] p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {isCalculating ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shrink-0">
                                <ArrowCounterClockwise weight="bold" size={12} className="animate-spin" />
                                Consolidating
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                                <CheckCircle weight="fill" size={12} />
                                Official Result
                            </span>
                        )}
                        
                        {isTieBreaker && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
                                <Lightning weight="fill" size={12} /> Tie-Breaker
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight break-words">
                        {election.title}
                    </h3>
                </div>
                
                <div className="shrink-0 flex items-center gap-3 bg-white dark:bg-[#1a1a1a] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full sm:w-auto">
                    <Users weight="duotone" size={20} className="text-slate-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Turnout</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-none font-mono truncate">{totalVotes.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Proclaimed Winners Grid */}
            <div className="p-4 sm:p-6">
                {isCalculating ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 w-full">
                        <div className="w-32 h-32 opacity-50 mb-4 mix-blend-luminosity"><Lottie animationData={countingAnimation} loop={true} /></div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 animate-pulse text-center">Finalizing official tallies...</p>
                    </div>
                ) : (
                    <>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Trophy weight="fill" className="text-amber-500 shrink-0" size={16} /> Proclaimed Winners
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {election.positions?.map((pos) => {
                                let posTotal = 0;
                                const sortedCandidates = pos.candidates.map(cand => {
                                    const votes = getVotes(election, pos.title, cand.id, cand.name);
                                    posTotal += votes;
                                    return { ...cand, votes };
                                }).sort((a, b) => b.votes - a.votes);

                                const isExpanded = expandedPositions[pos.title];
                                const visibleCandidates = isExpanded ? sortedCandidates : sortedCandidates.slice(0, 3);
                                const hiddenCount = sortedCandidates.length - 3;

                                return (
                                    <div key={pos.title} className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 min-w-0">
                                        <div className="flex justify-between items-start mb-4 gap-2">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate min-w-0">
                                                {pos.title}
                                            </span>
                                            <span className="text-[9px] font-bold bg-white dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 uppercase shrink-0">
                                                {pos.targetType === 'grade' ? `G${pos.targetGrade}` : 'All'}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {visibleCandidates.map((cand, idx) => {
                                                const isWinner = idx === 0 && cand.votes > 0;
                                                const isTied = isWinner && sortedCandidates.length > 1 && sortedCandidates[0].votes === sortedCandidates[1].votes;
                                                const winPercent = posTotal > 0 ? ((cand.votes / posTotal) * 100).toFixed(1) : 0;

                                                return (
                                                    <div key={cand.name} className="relative min-w-0">
                                                        <div className="flex items-end justify-between mb-1.5 gap-2">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className={`text-sm font-bold truncate ${isWinner ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                    {cand.name}
                                                                </span>
                                                                {isWinner && !isTied && <CheckCircle weight="fill" className="text-emerald-500 w-3.5 h-3.5 shrink-0" />}
                                                                {isTied && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded uppercase shrink-0">Tie</span>}
                                                            </div>
                                                            <div className="flex items-baseline gap-2 shrink-0">
                                                                <span className={`text-xs font-mono font-bold ${isWinner ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{cand.votes}</span>
                                                                <span className="text-[10px] font-mono text-slate-400 w-8 text-right shrink-0">{winPercent}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                            <motion.div 
                                                                initial={{ width: 0 }} whileInView={{ width: `${winPercent}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: "easeOut" }}
                                                                className={`h-full rounded-full ${isWinner ? (isTied ? 'bg-amber-500' : 'bg-slate-900 dark:bg-white') : 'bg-slate-400 dark:bg-slate-600'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {sortedCandidates.length > 3 && (
                                            <button onClick={() => togglePosition(pos.title)} className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1 w-full transition-colors outline-none">
                                                {isExpanded ? 'Show Less' : `Show ${hiddenCount} More`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

// ==========================================
// VOTING WIZARD (VERCEL STYLE)
// ==========================================
const VotingWizard = ({ election, user, onBack, onSuccess }) => {
    const { showToast } = useToast();
    const { width, height } = useWindowSizeCustom();
    const [viewState, setViewState] = useState('loading');
    const [ballot, setBallot] = useState({});
    const [currentStep, setCurrentStep] = useState(0);
    const [isReviewing, setIsReviewing] = useState(false);
    const [direction, setDirection] = useState(0);
    const [countdownText, setCountdownText] = useState('');

    const eligiblePositions = useMemo(() => {
        return election.positions.filter(pos => {
            if (!pos.targetType || pos.targetType === 'school') return true;
            return String(pos.targetGrade) === String(user?.gradeLevel);
        });
    }, [election.positions, user?.gradeLevel]);

    useEffect(() => {
        const check = async () => {
            const voted = await electionService.checkIfVoted(election.id, user.id);
            const now = new Date();
            const start = new Date(election.startDate);
            if (voted) setViewState('voted');
            else if (now < start) setViewState('countdown');
            else setViewState('voting');
        };
        check();
    }, [election.id, election.startDate, user.id]);

    useEffect(() => {
        if (viewState !== 'countdown') return;
        const startMs = new Date(election.startDate).getTime();
        const tick = () => {
            const diff = startMs - Date.now();
            if (diff <= 0) {
                setViewState('voting');
                return;
            }
            const days = Math.floor(diff / 86400000);
            const hrs = Math.floor((diff % 86400000) / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setCountdownText(days > 0 ? `${days}d ${hrs}h ${mins}m ${secs}s` : hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [viewState, election.startDate]);

    const handleSelect = (candName) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const posTitle = eligiblePositions[currentStep].title;
        setBallot(prev => ({ ...prev, [posTitle]: candName }));
    };

    const handleNext = () => {
        if (currentStep < eligiblePositions.length - 1) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        } else {
            setDirection(1);
            setIsReviewing(true);
        }
    };

    const handleBackStep = () => {
        setDirection(-1);
        if (isReviewing) setIsReviewing(false);
        else if (currentStep > 0) setCurrentStep(prev => prev - 1);
        else onBack();
    };

    const handleSubmit = async () => {
        setViewState('casting');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        try {
            await Promise.all([
                new Promise(r => setTimeout(r, 2000)),
                electionService.submitVote(election.id, user.id, ballot)
            ]);
            setViewState('voted');
            if (onSuccess) onSuccess();
        } catch (err) {
            setViewState('voting');
            setIsReviewing(true);
            showToast('Error casting vote. Please try again.', 'error');
        }
    };

    if (viewState === 'loading') return <div className="flex justify-center items-center h-[50vh] w-full"><div className="w-8 h-8 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" /></div>;

    if (viewState === 'voted') return (
        <div className="relative h-full w-full flex flex-col items-center justify-center text-center p-6 pb-24 min-h-[500px] bg-white dark:bg-[#0A0A0A] rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={300} gravity={0.15} colors={['#000', '#333', '#666', '#fff', '#e2e8f0']} />
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="w-20 h-20 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shrink-0">
                <Check weight="bold" className="w-10 h-10 text-white dark:text-slate-900" />
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 break-words">Vote Cast.</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 px-4">Your ballot has been securely verified and recorded.</p>
            <button onClick={onBack} className="px-8 py-3.5 rounded-xl bg-slate-100 dark:bg-[#111] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-[0.98] outline-none">
                Return to Elections
            </button>
        </div>
    );

    if (viewState === 'countdown') return (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 pb-24 text-center bg-white dark:bg-[#0A0A0A] rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#111] rounded-2xl flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-800 shrink-0">
                <Clock weight="duotone" className="w-8 h-8 text-slate-900 dark:text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3 break-words">Polls Open Soon</h2>
            <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-[#111] px-4 sm:px-6 py-3 rounded-xl tabular-nums tracking-widest border border-slate-200 dark:border-slate-800 break-words max-w-full">
                {countdownText || '...'}
            </div>
            <button onClick={onBack} className="mt-8 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors outline-none">Go Back</button>
        </div>
    );

    if (viewState === 'casting') return (
        <div className="flex flex-col items-center justify-center h-full w-full min-h-[500px] bg-white dark:bg-[#0A0A0A] rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800 pb-24">
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="mb-6 shrink-0">
                <ArrowDown weight="bold" className="w-8 h-8 text-slate-400" />
            </motion.div>
            <div className="w-48 max-w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6 mx-4">
                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2 }} className="h-full bg-slate-900 dark:bg-white rounded-full" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest animate-pulse px-4 text-center break-words">Encrypting Ballot...</p>
        </div>
    );

    const currentPos = eligiblePositions[currentStep];
    const isSelected = !!ballot[currentPos?.title];

    return (
        <div className="h-full w-full flex flex-col relative max-h-[100dvh] md:max-h-[85vh] bg-[#FAFAFA] dark:bg-[#0A0A0A] md:rounded-2xl overflow-hidden shadow-2xl border-x-0 border-y-0 md:border md:border-slate-200 dark:md:border-slate-800">
            {/* TOP BAR */}
            <div className="flex flex-col items-center z-10 px-4 sm:px-6 pt-safe-top bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center w-full justify-between py-4">
                    <button onClick={handleBackStep} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 outline-none shrink-0">
                        <CaretLeft weight="bold" className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate px-2 min-w-0">
                        {isReviewing ? 'Final Review' : `Step ${currentStep + 1} of ${eligiblePositions.length}`}
                    </span>
                    <div className="w-9 shrink-0" />
                </div>
                {!isReviewing && (
                    <div className="flex gap-1 w-full max-w-sm h-1 mb-4">
                        {eligiblePositions.map((_, idx) => (
                            <div key={idx} className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div initial={false} animate={{ width: idx <= currentStep ? '100%' : '0%', backgroundColor: idx <= currentStep ? (idx === currentStep ? 'var(--tw-prose-body)' : 'var(--tw-prose-lead)') : 'transparent' }} className={`h-full rounded-full ${idx <= currentStep ? (idx === currentStep ? 'bg-slate-900 dark:bg-white' : 'bg-slate-400 dark:bg-slate-600') : ''}`} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CONTENT */}
            {/* Increased bottom padding specifically for scrolling over the elevated bottom button */}
            <div className="flex-1 relative overflow-hidden flex flex-col w-full">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    {isReviewing ? (
                        <motion.div key="review" custom={direction} initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction < 0 ? '100%' : '-100%', opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="absolute inset-0 w-full px-4 sm:px-6 py-6 overflow-y-auto custom-scrollbar pb-48 md:pb-32">
                            <div className="max-w-md mx-auto w-full">
                                <h2 className="text-2xl font-black mb-1 text-slate-900 dark:text-white tracking-tight break-words">Review Ballot</h2>
                                <p className="text-sm text-slate-500 mb-6 font-medium break-words">Verify your selections before casting.</p>
                                
                                <div className="space-y-3">
                                    {eligiblePositions.map((pos, idx) => (
                                        <div key={idx} onClick={() => { setDirection(-1); setCurrentStep(idx); setIsReviewing(false); }} className="p-4 bg-white dark:bg-[#111] rounded-xl flex justify-between items-center cursor-pointer hover:border-slate-400 transition-all border border-slate-200 dark:border-slate-800 shadow-sm group min-w-0">
                                            <div className="min-w-0 pr-4">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{pos.title}</p>
                                                {ballot[pos.title] ? (
                                                    <p className="font-bold text-slate-900 dark:text-white text-base truncate">{ballot[pos.title]}</p>
                                                ) : (
                                                    <p className="font-bold text-rose-500 text-sm flex items-center gap-1 shrink-0"><WarningCircle weight="bold" /> Abstain</p>
                                                )}
                                            </div>
                                            <PencilSimple weight="bold" className="w-5 h-5 text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key={currentStep} custom={direction} initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction < 0 ? '100%' : '-100%', opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="absolute inset-0 w-full px-4 sm:px-6 py-6 flex flex-col">
                            <div className="text-center mb-6 shrink-0 max-w-md mx-auto w-full">
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 break-words">{currentPos?.title}</h2>
                                <p className="text-sm font-medium text-slate-500">Select one candidate</p>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-48 md:pb-32 max-w-md mx-auto w-full px-1">
                                {currentPos?.candidates.map(cand => {
                                    const active = ballot[currentPos.title] === cand.name;
                                    return (
                                        <button key={cand.name} onClick={() => handleSelect(cand.name)} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 border-2 text-left outline-none min-w-0 ${active ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-md transform scale-[1.02]' : 'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'}`}>
                                            <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center font-bold text-lg transition-colors ${active ? 'bg-white/20 dark:bg-black/10 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                {cand.name.charAt(0)}
                                            </div>
                                            <span className={`font-bold flex-grow text-base sm:text-lg tracking-tight break-words min-w-0 ${active ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>{cand.name}</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-white dark:border-slate-900' : 'border-slate-300 dark:border-slate-700'}`}>
                                                {active && <div className="w-2.5 h-2.5 bg-white dark:bg-slate-900 rounded-full" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM ACTION - Elevated for mobile docks */}
            <div className="absolute bottom-0 w-full p-4 sm:p-6 pb-[90px] md:pb-6 bg-gradient-to-t from-[#FAFAFA] dark:from-[#0A0A0A] via-[#FAFAFA] dark:via-[#0A0A0A] to-transparent z-20 pointer-events-none">
                <div className="max-w-md mx-auto w-full pointer-events-auto">
                    <button onClick={isReviewing ? handleSubmit : handleNext} disabled={!isReviewing && !isSelected} className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 outline-none ${(!isReviewing && !isSelected) ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl active:scale-[0.98]'}`}>
                        {isReviewing ? 'Cast Ballot Securely' : 'Continue'}
                        {!isReviewing && <CaretRight weight="bold" className="w-5 h-5 shrink-0" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// MAIN TAB COMPONENT
// ==========================================
export default function StudentElectionTab() {
    const { userProfile, currentUser } = useAuth();
    const user = userProfile || currentUser;
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState('vote');
    const [selectedElection, setSelectedElection] = useState(null);
    const [allElections, setAllElections] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchElections = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'elections'), orderBy('endDate', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const filteredData = data.filter(e => {
                if (user?.schoolId && e.schoolId && e.schoolId !== user.schoolId) return false;
                if (e.positions && e.positions.length > 0) {
                    const hasEligiblePosition = e.positions.some(pos => {
                        if (!pos.targetType || pos.targetType === 'school') return true;
                        return String(pos.targetGrade) === String(user?.gradeLevel);
                    });
                    if (!hasEligiblePosition) return false;
                }
                return true;
            });

            const nowMs = Date.now();
            for (const e of filteredData) {
                if (e.status === 'active' && e.endDate) {
                    if (nowMs >= new Date(e.endDate).getTime()) {
                        const freshSnap = await getDoc(doc(db, 'elections', e.id));
                        const freshData = freshSnap.data();
                        if (freshData?.status === 'active') {
                            const tally = freshData.tally || {};
                            const revealTime = new Date(Date.now() + 5 * 60 * 1000);
                            await updateDoc(doc(db, 'elections', e.id), {
                                resultsPending: true, revealTime, status: 'calculating', results: tally, totalVotes: freshData.totalVotes || 0
                            });
                            e.status = 'calculating';
                        }
                    }
                }
            }
            setAllElections(filteredData);
        } catch (error) {
            console.error("Error fetching elections:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchElections();
    }, [user?.schoolId, user?.gradeLevel]);

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { activeList, resultsList } = useMemo(() => {
        const active = [];
        const results = [];
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;

        allElections.forEach(e => {
            const endDate = new Date(e.endDate);
            const isTimeUp = now > endDate;
            const isWithin24Hours = (now.getTime() - endDate.getTime()) < twentyFourHoursMs;

            if (e.status === 'completed' || e.status === 'archived' || e.status === 'calculating') {
                if (isWithin24Hours || !isTimeUp || e.status === 'archived') results.push(e);
            } else if (e.status === 'active' || e.status === 'scheduled') {
                if (isTimeUp) {
                    if (isWithin24Hours) results.push(e);
                } else {
                    active.push(e);
                }
            }
        });
        results.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        active.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        return { activeList: active, resultsList: results };
    }, [allElections, now]);

    if (selectedElection) {
        return (
            <div className="fixed inset-0 z-[200] bg-[#FAFAFA] dark:bg-[#0A0A0A] overflow-hidden flex items-center justify-center p-0 md:p-6 w-full">
                <div className="relative z-10 h-full w-full max-w-2xl mx-auto">
                    <VotingWizard
                        election={selectedElection}
                        user={user}
                        onBack={() => setSelectedElection(null)}
                        onSuccess={() => {
                            setActiveTab('results');
                            showToast("Vote submitted successfully!", "success");
                            setSelectedElection(null);
                        }}
                    />
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'vote', label: 'Active', icon: Lightning, count: activeList.length },
        { id: 'results', label: 'Results', icon: Archive, count: 0 }
    ];

    return (
        <div className="w-full min-h-[80vh] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-slate-900 dark:text-white pb-[100px] font-sans selection:bg-slate-200 dark:selection:bg-slate-800 overflow-x-hidden">
            {/* Header & Animated Tab Switcher */}
            <div className="sticky top-0 z-40 bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 pt-6 pb-4 px-4 md:px-6 w-full">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 w-full">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1 break-words">
                            Elections Center
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium break-words">
                            Cast your vote and view official canvassing returns.
                        </p>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-[#111] p-1 rounded-xl border border-slate-200 dark:border-slate-800 relative w-full md:w-auto shrink-0 overflow-x-auto custom-scrollbar">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex-1 md:w-28 py-2.5 text-xs font-bold tracking-wide transition-colors z-10 uppercase outline-none rounded-lg min-w-[100px] ${activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                {activeTab === tab.id && (
                                    <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-white dark:bg-[#222] rounded-lg shadow-sm border border-slate-200 dark:border-slate-700" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                )}
                                <span className="relative z-20 flex items-center justify-center gap-1.5 whitespace-nowrap">
                                    <tab.icon weight={activeTab === tab.id ? "bold" : "regular"} size={16} />
                                    {tab.label}
                                    {tab.count > 0 && <span className="ml-1 w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8 w-full">
                {loading ? (
                    <div className="flex justify-center items-center py-20 w-full"><ArrowCounterClockwise className="w-8 h-8 animate-spin text-slate-300" /></div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'vote' ? (
                            <motion.div key="vote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                {activeList.length === 0 ? (
                                    <div className="col-span-full flex flex-col items-center justify-center text-center py-20 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-[#111]/50 w-full">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-800 shrink-0">
                                            <Archive weight="duotone" className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1 break-words">No Open Ballots</h3>
                                        <p className="text-sm text-slate-500 max-w-sm px-2 break-words">There are no active elections for your grade level at the moment.</p>
                                    </div>
                                ) : activeList.map(election => (
                                    <div key={election.id} onClick={() => setSelectedElection(election)} className="group relative bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 cursor-pointer flex flex-col h-full min-w-0 w-full">
                                        <div className={`h-1.5 w-full shrink-0 ${election.isTieBreaker ? 'bg-indigo-500' : 'bg-slate-900 dark:bg-white'}`} />
                                        <div className="p-5 flex-1 flex flex-col min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0 whitespace-nowrap">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" /> Live
                                                </span>
                                                {election.isTieBreaker && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shrink-0 whitespace-nowrap">
                                                        Tie-Breaker
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1 line-clamp-2 break-words">{election.title}</h3>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6 flex flex-wrap items-center gap-1.5 min-w-0">
                                                <IdentificationCard weight="bold" className="shrink-0" /> <span className="truncate">{election.organization}</span>
                                            </p>
                                            
                                            <div className="mt-auto pt-4 shrink-0">
                                                <button className="w-full bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 font-bold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 outline-none">
                                                    Cast Ballot <CaretRight weight="bold" className="shrink-0" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 w-full">
                                {resultsList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center py-20 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-[#111]/50 w-full">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-800 shrink-0">
                                            <ChartBar weight="duotone" className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1 break-words">No Results Yet</h3>
                                        <p className="text-sm text-slate-500 max-w-sm px-2 break-words">Completed election tallies will appear here.</p>
                                    </div>
                                ) : resultsList.map(election => <ElectionResultCard key={election.id} election={election} />)}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}