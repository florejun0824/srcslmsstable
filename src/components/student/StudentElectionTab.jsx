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
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../services/firebase';

// --- LOTTIE IMPORTS ---
import Lottie from 'lottie-react';
import countingAnimation from '../../assets/data.json'; // Ensure this path is correct in your project

// --- HELPERS ---
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

    // Status Helpers
    const isCalculating = election.status === 'calculating';
    const isActive = election.status === 'active';
    const isCompleted = election.status === 'completed';

    const togglePosition = (posId) => {
        setExpandedPositions(prev => ({ ...prev, [posId]: !prev[posId] }));
    };

    useEffect(() => {
        setIsLoading(true);
        // Pull from 'results' (final) or 'liveResults' (periodic summary)
        const tallySource = election.results || election.liveResults;
    
        if (tallySource && Object.keys(tallySource).length > 0) {
            setTally(tallySource);
            setTotalProcessed(election.totalVotes || 0);
        } else {
            // Initial zero state
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
            className={`backdrop-blur-xl rounded-[2rem] p-5 shadow-sm border mb-4 overflow-hidden relative transition-colors duration-500
                ${isCalculating 
                    ? 'bg-yellow-50/80 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-500/30'
                    : isLive
                    ? 'bg-orange-50/80 dark:bg-orange-900/10 border-orange-200 dark:border-orange-500/30' 
                    : 'bg-white/80 dark:bg-[#1C1C1E]/90 border-slate-200 dark:border-slate-800'}
            `}
        >
			<div className="relative z-10 mb-4 border-b border-black/5 dark:border-white/5 pb-3">
			    <div className="flex justify-between items-start gap-3">
			        <div className="flex-1 min-w-0">
			            <div className="flex flex-wrap items-center gap-2 mb-1.5">
			                {isCalculating ? (
			                    <span className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest animate-pulse">
			                        <ArrowPathIcon className="w-3 h-3 animate-spin" /> Consolidating
			                    </span>
			                ) : isActive ? (
			                    <div className="flex items-center gap-2">
			                        <span className="flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest animate-pulse">
			                            <SignalIcon className="w-3 h-3" /> Live
			                        </span>
			                        <span className="text-[9px] font-bold text-orange-600/60 dark:text-orange-400/60 uppercase tracking-tighter">
			                            Updated {formatLastUpdated(election.lastLiveUpdate)}
			                        </span>
			                    </div>
			                ) : (
			                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
			                        <CheckBadgeIcon className="w-3 h-3"/> Official Results
			                    </span>
			                )}
                            {/* Target Badge */}
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                {election.targetType === 'grade' 
                                    ? <><AcademicCapIcon className="w-3 h-3"/> Grade {election.targetGrade}</> 
                                    : <><BuildingLibraryIcon className="w-3 h-3"/> School Wide</>}
                            </span>
			            </div>
			            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
			                {election.title}
			            </h2>
                        <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                            <span>{election.organization}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{totalProcessed.toLocaleString()} Votes Cast</span>
                        </div>
			        </div>
			    </div>
			</div>

            {isCompleted && (
                <div className="mb-6 relative z-10 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 flex items-start gap-3">
                    <InformationCircleIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-0.5">Limited Availability</p>
                        <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 leading-relaxed">Results are available for 24 hours.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 relative z-10">
                {isCalculating ? (
                    <div className="flex flex-col items-center justify-center py-6 min-h-[200px]">
                        <div className="w-32 h-32 md:w-48 md:h-48 opacity-80">
                            <Lottie animationData={countingAnimation} loop={true} />
                        </div>
                        <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 animate-pulse mt-4">Counting ballots...</p>
                    </div>
                ) : !hasResultsData ? (
                    <div className="text-center py-12 text-slate-400 text-sm bg-white/50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
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
                            <div key={pos.id} className="bg-white/50 dark:bg-white/5 p-4 rounded-2xl border border-white/50 dark:border-white/5">
                                <h3 className="font-black text-slate-700 dark:text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wide mb-3">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-orange-400 animate-pulse'}`}></span>
                                    {pos.title}
                                </h3>
                                
                                <div className="space-y-2.5">
                                    {visibleCandidates.map((cand, idx) => {
                                        const isLeader = idx === 0 && cand.count > 0;
                                        const percent = Math.round((cand.count / maxVotes) * 100);

                                        return (
                                            <div key={idx} className="relative group">
                                                <div className="flex justify-between text-[11px] font-bold mb-1 z-10 relative">
                                                    <span className={`flex items-center gap-1.5 truncate max-w-[75%] ${isLeader ? (isCompleted ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400') : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {isLeader && isCompleted && <StarIcon className="w-3 h-3 text-yellow-500" />} 
                                                        {cand.name}
                                                    </span>
                                                    <span className="text-slate-900 dark:text-white tabular-nums bg-white dark:bg-white/10 px-1.5 rounded-md">{cand.count}</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${percent}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className={`h-full rounded-full shadow-sm ${
                                                            isLeader 
                                                                ? (isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-orange-400 to-amber-400') 
                                                                : 'bg-slate-300 dark:bg-slate-600'
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
                                        className="w-full py-2 mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        {isExpanded ? (
                                            <>Show Less <ChevronUpIcon className="w-3 h-3" /></>
                                        ) : (
                                            <>Show {hiddenCount} More <ChevronDownIcon className="w-3 h-3" /></>
                                        )}
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
    }, [election, user.id]);

    const handleSelect = (candName) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const posTitle = election.positions[currentStep].title;
        setBallot(prev => ({ ...prev, [posTitle]: candName }));
    };

    const handleNext = () => {
        if (currentStep < election.positions.length - 1) {
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
                new Promise(r => setTimeout(r, 2000)), // Simulate minimal encryption delay
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

    if (viewState === 'loading') return <div className="flex justify-center items-center h-[50vh]"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
    
    if (viewState === 'voted') return (
        <div className="relative h-full flex flex-col items-center justify-center text-center p-6 min-h-[500px] bg-white dark:bg-slate-900 rounded-[3rem]">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={300} />
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
                <CheckBadgeIcon className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Vote Cast!</h1>
            <p className="text-slate-500 font-medium mb-8">Your voice has been heard.</p>
            <button onClick={onBack} className="px-8 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold text-sm hover:scale-105 transition-transform">Return to Elections</button>
        </div>
    );

    if (viewState === 'countdown') return (
        <div className="flex flex-col items-center justify-center h-full p-10 text-center bg-white dark:bg-slate-900 rounded-[3rem]">
            <ClockIcon className="w-16 h-16 text-slate-300 mb-6" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Polls Open Soon</h2>
            <p className="font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">{new Date(election.startDate).toLocaleString()}</p>
            <button onClick={onBack} className="mt-8 text-sm font-bold text-blue-500 hover:underline">Go Back</button>
        </div>
    );

    if (viewState === 'casting') return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white dark:bg-slate-900 rounded-[3rem]">
            <div className="relative mb-8">
                <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2 }}
                        className="h-full bg-blue-500 rounded-full"
                    />
                </div>
                <motion.div 
                    initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="absolute inset-0 flex justify-center -top-12"
                >
                    <DocumentArrowDownIcon className="w-10 h-10 text-blue-500" />
                </motion.div>
            </div>
            <p className="text-sm font-bold text-slate-500 animate-pulse">Encrypting & Submitting Ballot...</p>
        </div>
    );

    const positions = election.positions;
    const currentPos = positions[currentStep];
    const isSelected = !!ballot[currentPos.title];

    return (
        <div className="h-full flex flex-col relative max-h-[85vh] md:max-h-[90vh] bg-white dark:bg-slate-900 md:rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex flex-col items-center mb-2 z-10 px-6 pt-6 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm pb-4 border-b border-slate-50 dark:border-white/5">
                <div className="flex items-center w-full justify-between mb-4">
                    <button onClick={handleBackStep} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-50 dark:bg-white/5 rounded-full">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {isReviewing ? 'Final Review' : `Position ${currentStep + 1} of ${positions.length}`}
                    </span>
                    <div className="w-9" /> 
                </div>
                {!isReviewing && (
                    <div className="flex gap-1.5 w-full max-w-[240px] h-1.5">
                        {positions.map((_, idx) => (
                            <div key={idx} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={false}
                                    animate={{ 
                                        width: idx <= currentStep ? '100%' : '0%',
                                        backgroundColor: idx <= currentStep ? (idx === currentStep ? '#3b82f6' : '#cbd5e1') : 'transparent'
                                    }}
                                    className="h-full"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/50 dark:bg-black/20">
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
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                                <h2 className="text-2xl font-black mb-1 text-slate-900 dark:text-white">Summary</h2>
                                <p className="text-sm text-slate-500 mb-6">Review your choices before submitting.</p>
                                <div className="space-y-3">
                                    {positions.map((pos, idx) => (
                                        <div key={idx} onClick={() => { setDirection(-1); setCurrentStep(idx); setIsReviewing(false); }} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex justify-between items-center cursor-pointer hover:ring-2 ring-blue-500/50 transition-all group">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{pos.title}</p>
                                                <p className="font-bold text-slate-900 dark:text-white text-lg">{ballot[pos.title]}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors shadow-sm">
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
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{currentPos.title}</h2>
                                <p className="text-sm font-medium text-slate-500">Who is your choice?</p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-24 px-1 max-w-md mx-auto w-full">
                                {currentPos.candidates.map(cand => {
                                    const active = ballot[currentPos.title] === cand.name;
                                    return (
                                        <button
                                            key={cand.name}
                                            onClick={() => handleSelect(cand.name)}
                                            className={`w-full p-4 rounded-[1.5rem] flex items-center gap-4 transition-all duration-200 border-2 active:scale-95 group ${active ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-lg transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'}`}>
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

            {/* Footer Action */}
            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-white/5 absolute bottom-0 w-full z-20">
                <button 
                    onClick={isReviewing ? handleSubmit : handleNext}
                    disabled={!isReviewing && !isSelected}
                    className={`w-full py-4 rounded-[1.2rem] font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2
                        ${(!isReviewing && !isSelected) 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98]'}
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
  // Ensure we prioritize userProfile for grade/school data
  const user = userProfile || currentUser;
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('vote'); 
  const [selectedElection, setSelectedElection] = useState(null); 
  const [allElections, setAllElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
        collection(db, 'elections'), 
        orderBy('endDate', 'desc'), 
        limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // --- 1. FILTER LOGIC IMPLEMENTED HERE ---
        const filteredData = data.filter(e => {
            // A. School Filter
            // If user has a schoolId, verify matches election. If election has no schoolId, assume global/test.
            if (user?.schoolId && e.schoolId && e.schoolId !== user.schoolId) {
                return false;
            }

            // B. Grade Filter (New Feature)
            if (e.targetType === 'grade') {
                const userGrade = user?.gradeLevel;
                // Strict check: if user has no grade, hide grade-specific elections to be safe
                if (!userGrade) return false; 
                // String comparison to handle "11" vs 11
                if (String(e.targetGrade) !== String(userGrade)) {
                    return false;
                }
            }

            return true;
        });

        setAllElections(filteredData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching elections:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.schoolId, user?.gradeLevel]);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  const { activeList, resultsList } = useMemo(() => {
      const active = [];
      const results = [];

      allElections.forEach(e => {
          const endDate = new Date(e.endDate);
          const isTimeUp = now > endDate;
          
          if (e.status === 'completed' || e.status === 'calculating') {
              results.push(e);
          } else if (e.status === 'active') {
              if (isTimeUp) {
                  results.push(e); 
              } else {
                  active.push(e);
              }
          }
      });

      // Sort results by most recent first
      results.sort((a,b) => new Date(b.endDate) - new Date(a.endDate));
      // Sort active by ending soonest
      active.sort((a,b) => new Date(a.endDate) - new Date(b.endDate));

      return { activeList: active, resultsList: results };
  }, [allElections, now]);

  if (selectedElection) {
      return (
        <div className="fixed inset-0 z-[200] bg-[#F2F2F7] dark:bg-black overflow-hidden flex items-center justify-center p-0 md:p-6">
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

  if (loading) {
      return (
          <div className="flex justify-center items-center py-32 text-slate-400">
              <ArrowPathIcon className="w-8 h-8 animate-spin opacity-50" />
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32 min-h-[60vh] font-sans">
        {/* Tab Switcher */}
        <div className="flex justify-center mb-6 sticky top-0 z-20 pt-4 pb-4 -mx-4 px-4 bg-slate-50/95 dark:bg-black/95 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-[1.2rem] border border-slate-200 dark:border-slate-800 flex shadow-sm w-full max-w-md relative">
                {[
                    { id: 'vote', label: 'Cast Vote', icon: HandRaisedIcon, count: activeList.length },
                    { id: 'results', label: 'Results', icon: ChartBarIcon, count: 0 }
                ].map((tab) => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative z-10
                            ${activeTab === tab.id 
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-red-500 text-white shadow-sm'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>

        <AnimatePresence mode="wait">
            {activeTab === 'vote' ? (
                <motion.div 
                    key="vote-list"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {activeList.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center text-center py-24 opacity-60">
                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <ClipboardDocumentCheckIcon className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">No Ballots Open</h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">There are no active elections for your grade level at the moment.</p>
                        </div>
                    ) : (
                        activeList.map(election => (
                            <div 
                                key={election.id}
                                onClick={() => setSelectedElection(election)}
                                className="group bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col h-full"
                            >
                                {/* Background Decor */}
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-500">
                                    <CheckBadgeIcon className="w-32 h-32" />
                                </div>

                                <div className="relative z-10 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                            Open Ballot
                                        </span>
                                        {/* Grade Badge */}
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                            {election.targetType === 'grade' ? <><AcademicCapIcon className="w-3 h-3"/> Grade {election.targetGrade}</> : <><BuildingLibraryIcon className="w-3 h-3"/> School Wide</>}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 leading-tight">{election.title}</h3>
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wide mb-6">{election.organization}</p>
                                </div>

                                <button className="w-full py-4 rounded-[1.2rem] bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-600 dark:text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2 relative z-10">
                                    Tap to Vote <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key="results-list"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                >
                    {resultsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-24 opacity-60">
                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <ChartBarIcon className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">No Results Yet</h3>
                            <p className="text-sm text-slate-500 mt-2">Completed election tallies will appear here.</p>
                        </div>
                    ) : (
                        resultsList.map(election => (
                            <ElectionResultCard key={election.id} election={election} />
                        ))
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}