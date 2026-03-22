// src/components/student/StudentElectionTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckBadgeIcon,
    HandRaisedIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    PencilSquareIcon,
    DocumentArrowDownIcon,
    ChartBarIcon,
    StarIcon,
    ArrowPathIcon,
    SignalIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentCheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ShieldCheckIcon,
    ClockIcon,
    InformationCircleIcon,
    AcademicCapIcon,
    BuildingLibraryIcon
} from '@heroicons/react/24/solid';
import { electionService } from '../../services/electionService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

import Lottie from 'lottie-react';
import countingAnimation from '../../assets/data.json';

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

// --- SUB-COMPONENT: RESULT CARD ---
const ElectionResultCard = ({ election }) => {
    const [tally, setTally] = useState({});
    const [totalProcessed, setTotalProcessed] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedPositions, setExpandedPositions] = useState({});

    const isCalculating = election.status === 'calculating';
    const isActive = election.status === 'active';
    const isCompleted = election.status === 'completed';

    const togglePosition = (posId) => {
        setExpandedPositions(prev => ({ ...prev, [posId]: !prev[posId] }));
    };

    useEffect(() => {
        setIsLoading(true);
        const tallySource = election.results || election.liveResults;

        if (tallySource && Object.keys(tallySource).length > 0) {
            setTally(tallySource);
            setTotalProcessed(election.totalVotes || 0);
        } else {
            const initialTally = {};
            election.positions?.forEach(pos => {
                initialTally[pos.title] = {};
                pos.candidates.forEach(cand => {
                    initialTally[pos.title][cand.name] = 0;
                });
            });
            setTally(initialTally);
            setTotalProcessed(election.totalVotes || 0);
        }
        setIsLive(election.status === 'active');
        setIsLoading(false);
    }, [election]);

    const formatLastUpdated = (timestamp) => {
        if (!timestamp) return 'Just now';
        const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
        if (secondsAgo < 60) return `${secondsAgo}s ago`;
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const hasResultsData = tally && Object.keys(tally).length > 0;

    return (
        <motion.div
            layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-5 shadow-sm border mb-4 overflow-hidden relative transition-colors duration-500
                ${isCalculating
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/30'
                    : isLive
                        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}
            `}
        >
            <div className="relative z-10 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {isCalculating ? (
                                <span className="flex items-center gap-1 bg-amber-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                    <ArrowPathIcon className="w-3 h-3 animate-spin" /> Consolidating
                                </span>
                            ) : isActive ? (
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 bg-orange-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                        <SignalIcon className="w-3 h-3" /> Live
                                    </span>
                                    <span className="text-[9px] font-semibold text-orange-500/60 dark:text-orange-400/60 uppercase">
                                        Updated {formatLastUpdated(election.lastLiveUpdate)}
                                    </span>
                                </div>
                            ) : (
                                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                    <CheckBadgeIcon className="w-3 h-3" /> Official Results
                                </span>
                            )}
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <BuildingLibraryIcon className="w-3 h-3" /> Multi-Target Ballot
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                            {election.title}
                        </h2>
                        <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-2">
                            <span>{election.organization}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                            <span className="tabular-nums">{totalProcessed.toLocaleString()} Votes Cast</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 relative z-10">
                {isCalculating ? (
                    <div className="flex flex-col items-center justify-center py-6 min-h-[200px]">
                        <div className="w-32 h-32 md:w-48 md:h-48 opacity-80">
                            <Lottie animationData={countingAnimation} loop={true} />
                        </div>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse mt-4">Counting ballots...</p>
                    </div>
                ) : !hasResultsData ? (
                    <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <span className="font-medium">{isLoading ? 'Fetching data...' : 'Waiting for results...'}</span>
                    </div>
                ) : (
                    election.positions?.map((pos) => {
                        const votes = tally[pos.title] || {};
                        const candidates = pos.candidates.map(c => ({
                            name: c.name,
                            count: votes[c.name] || 0
                        })).sort((a, b) => b.count - a.count);

                        const maxVotes = Math.max(...candidates.map(c => c.count), 1);
                        const isExpanded = expandedPositions[pos.id];
                        const visibleCandidates = isExpanded ? candidates : candidates.slice(0, 3);
                        const hiddenCount = candidates.length - 3;

                        return (
                            <div key={pos.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wide">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`}></span>
                                        {pos.title}
                                    </h3>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-400 uppercase border border-slate-100 dark:border-slate-700">
                                        {pos.targetType === 'grade' ? `Grade ${pos.targetGrade}` : 'School Wide'}
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {visibleCandidates.map((cand, idx) => {
                                        const isLeader = idx === 0 && cand.count > 0;
                                        const percent = Math.round((cand.count / maxVotes) * 100);

                                        return (
                                            <div key={idx} className="relative group">
                                                <div className="flex justify-between text-[11px] font-bold mb-1 z-10 relative">
                                                    <span className={`flex items-center gap-1.5 truncate max-w-[75%] ${isLeader ? (isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400') : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {isLeader && isCompleted && <StarIcon className="w-3 h-3 text-amber-500" />}
                                                        {cand.name}
                                                    </span>
                                                    <span className="text-slate-900 dark:text-white tabular-nums bg-white dark:bg-slate-900 px-1.5 rounded-md border border-slate-100 dark:border-slate-700">{cand.count}</span>
                                                </div>
                                                <div className="h-2 w-full bg-white dark:bg-slate-900 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${percent}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${isLeader
                                                            ? (isCompleted ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-orange-400 to-amber-400')
                                                            : 'bg-slate-200 dark:bg-slate-600'
                                                            }`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {candidates.length > 3 && (
                                    <button
                                        onClick={() => togglePosition(pos.id)}
                                        className="w-full py-2 mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-all"
                                    >
                                        {isExpanded ? <>Show Less <ChevronUpIcon className="w-3 h-3" /></> : <>Show {hiddenCount} More <ChevronDownIcon className="w-3 h-3" /></>}
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
};

// --- SUB-COMPONENT: VOTING WIZARD ---
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

    if (viewState === 'loading') return <div className="flex justify-center items-center h-[50vh]"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

    if (viewState === 'voted') return (
        <div className="relative h-full flex flex-col items-center justify-center text-center p-6 min-h-[500px] bg-white dark:bg-slate-900 rounded-[2rem]">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25">
                <CheckBadgeIcon className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Vote Cast!</h1>
            <p className="text-slate-500 font-medium mb-8">Your voice has been heard.</p>
            <button onClick={onBack} className="px-8 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.97]">Return to Elections</button>
        </div>
    );

    if (viewState === 'countdown') return (
        <div className="flex flex-col items-center justify-center h-full p-10 text-center bg-white dark:bg-slate-900 rounded-[2rem]">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-800">
                <ClockIcon className="w-10 h-10 text-indigo-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Polls Open Soon</h2>
            <div className="font-mono text-2xl font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-6 py-3 rounded-xl tabular-nums tracking-wider border border-indigo-100 dark:border-indigo-800">
                {countdownText || '...'}
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">Opens {new Date(election.startDate).toLocaleString()}</p>
            <button onClick={onBack} className="mt-8 text-sm font-bold text-indigo-600 hover:underline">Go Back</button>
        </div>
    );

    if (viewState === 'casting') return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white dark:bg-slate-900 rounded-[2rem]">
            <div className="relative mb-8">
                <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2 }} className="h-full bg-indigo-600 rounded-full" />
                </div>
                <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 flex justify-center -top-12">
                    <DocumentArrowDownIcon className="w-10 h-10 text-indigo-500" />
                </motion.div>
            </div>
            <p className="text-sm font-bold text-slate-500 animate-pulse">Encrypting & Submitting Ballot...</p>
        </div>
    );

    const currentPos = eligiblePositions[currentStep];
    const isSelected = !!ballot[currentPos?.title];

    return (
        <div className="h-full flex flex-col relative max-h-[85vh] md:max-h-[90vh] bg-white dark:bg-slate-900 md:rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            {/* TOP BAR */}
            <div className="flex flex-col items-center z-10 px-6 pt-6 flex-shrink-0 bg-white dark:bg-slate-900 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center w-full justify-between mb-4">
                    <button onClick={handleBackStep} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {isReviewing ? 'Final Review' : `Position ${currentStep + 1} of ${eligiblePositions.length}`}
                    </span>
                    <div className="w-9" />
                </div>
                {!isReviewing && (
                    <div className="flex gap-1.5 w-full max-w-[240px] h-1.5">
                        {eligiblePositions.map((_, idx) => (
                            <div key={idx} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        width: idx <= currentStep ? '100%' : '0%',
                                        backgroundColor: idx <= currentStep ? (idx === currentStep ? '#4f46e5' : '#c7d2fe') : 'transparent'
                                    }}
                                    className="h-full rounded-full"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CONTENT */}
            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950/50">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    {isReviewing ? (
                        <motion.div
                            key="review"
                            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: direction < 0 ? '100%' : '-100%', opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute inset-0 px-4 py-4 overflow-y-auto custom-scrollbar pb-24"
                        >
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">Summary</h2>
                                <p className="text-sm text-slate-500 mb-6">Review your choices before submitting.</p>
                                <div className="space-y-3">
                                    {eligiblePositions.map((pos, idx) => (
                                        <div key={idx} onClick={() => { setDirection(-1); setCurrentStep(idx); setIsReviewing(false); }} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center cursor-pointer hover:ring-2 ring-indigo-500/50 transition-all group border border-slate-100 dark:border-slate-700">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{pos.title}</p>
                                                <p className="font-bold text-slate-900 dark:text-white text-lg">{ballot[pos.title]}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors shadow-sm border border-slate-100 dark:border-slate-700">
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: direction < 0 ? '100%' : '-100%', opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute inset-0 px-4 py-4 flex flex-col"
                        >
                            <div className="text-center mb-6 flex-shrink-0">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{currentPos?.title}</h2>
                                <p className="text-sm font-medium text-slate-500">Who is your choice?</p>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-24 px-1 max-w-md mx-auto w-full">
                                {currentPos?.candidates.map(cand => {
                                    const active = ballot[currentPos.title] === cand.name;
                                    return (
                                        <button
                                            key={cand.name}
                                            onClick={() => handleSelect(cand.name)}
                                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 border-2 active:scale-[0.97] group ${active ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-lg transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-600'}`}>
                                                {cand.name.charAt(0)}
                                            </div>
                                            <span className={`font-bold flex-grow text-left text-lg ${active ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{cand.name}</span>
                                            {active && <div className="bg-white/20 p-1.5 rounded-full"><CheckBadgeIcon className="w-6 h-6 text-white" /></div>}
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM ACTION */}
            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 absolute bottom-0 w-full z-20">
                <button
                    onClick={isReviewing ? handleSubmit : handleNext}
                    disabled={!isReviewing && !isSelected}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
                        ${(!isReviewing && !isSelected) ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-[0.98]'}
                    `}
                >
                    {isReviewing ? 'Submit Ballot' : 'Next Position'}
                    {isReviewing ? <HandRaisedIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
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

            if (e.status === 'completed' || e.status === 'calculating') {
                if (isWithin24Hours || !isTimeUp) results.push(e);
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
            <div className="fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center p-0 md:p-6">
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

    if (loading) return <div className="flex justify-center items-center py-32 text-slate-400"><ArrowPathIcon className="w-8 h-8 animate-spin opacity-50" /></div>;

    const tabs = [
        { id: 'vote', label: 'Cast Vote', icon: HandRaisedIcon, count: activeList.length },
        { id: 'results', label: 'Results', icon: ChartBarIcon, count: 0 }
    ];

    return (
        <div className="max-w-4xl mx-auto px-3 md:px-4 pb-32 min-h-[60vh] font-sans">
            {/* TAB HEADER */}
            <div className="flex justify-center mb-6 sticky top-0 z-20 pt-3 pb-3 -mx-3 px-3">
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 flex shadow-sm w-full max-w-md relative">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative z-10
                            ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeStudentTab"
                                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/25"
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-rose-500 text-white shadow-sm'}`}>{tab.count}</span>}
                            </span>
                        </button>
                    ))}
                </div>
                <button onClick={fetchElections} className="ml-2 w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-95 shadow-sm">
                    <ArrowPathIcon className="w-4 h-4" />
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'vote' ? (
                    <motion.div key="vote-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeList.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center text-center py-24">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-800">
                                    <ClipboardDocumentCheckIcon className="w-10 h-10 text-indigo-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Ballots Open</h3>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">There are no active elections for your grade level at the moment.</p>
                            </div>
                        ) : activeList.map(election => (
                            <div key={election.id} onClick={() => setSelectedElection(election)} className="group bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-800 hover:scale-[1.01] transition-all relative overflow-hidden flex flex-col h-full">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-500"><CheckBadgeIcon className="w-32 h-32" /></div>
                                <div className="relative z-10 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>Open Ballot
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-slate-100 dark:border-slate-700">Multi-Position</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 leading-tight">{election.title}</h3>
                                    <p className="text-slate-500 font-semibold text-xs uppercase tracking-wide mb-6">{election.organization}</p>
                                </div>
                                <button className="w-full py-4 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 dark:text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2 relative z-10 border border-slate-100 dark:border-slate-700 group-hover:border-indigo-600">Tap to Vote <ChevronRightIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div key="results-list" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                        {resultsList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-24">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                                    <ChartBarIcon className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Results Yet</h3>
                                <p className="text-sm text-slate-500 mt-2">Completed election tallies will appear here.</p>
                            </div>
                        ) : resultsList.map(election => <ElectionResultCard key={election.id} election={election} />)}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}