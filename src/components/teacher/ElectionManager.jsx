// src/components/teacher/ElectionManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Archive, IdentificationCard, ChartBar
} from '@phosphor-icons/react';
import { doc, updateDoc, collection, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { electionService } from '../../services/electionService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// Import Components
import ElectionCard from './elections/cards/ElectionCard';
import CreateElectionForm from './elections/forms/CreateElectionForm';
import LiveCanvassing from './elections/views/LiveCanvassing';
import ConfirmationModal from './elections/modals/ConfirmationModal';
import ResultSummaryModal from './elections/modals/ResultSummaryModal';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
};

export default function ElectionManager() {
    const { user } = useAuth();
    const { showToast } = useToast();

    // --- STATE MANAGEMENT ---
    const [elections, setElections] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [activeTab, setActiveTab] = useState('active');
    const [selectedElectionId, setSelectedElectionId] = useState(null);
    const [summaryElection, setSummaryElection] = useState(null);
    // Added isLoading to the modal state object
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, data: null, isLoading: false });
    const [editingId, setEditingId] = useState(null);
    const [formStep, setFormStep] = useState(1);

    const [formData, setFormData] = useState({
        title: '', organization: '', startDate: '', endDate: '',
        targetType: 'school', targetGrade: '11', visibility: 'private', positions: []
    });


    // --- EFFECTS ---
    useEffect(() => {
        if (user?.id) {
            const unsub = electionService.getTeacherElections(user, setElections);
            return () => unsub();
        }
    }, [user]);

    // --- MEMOIZED DATA ---
    const { activeElections, archivedElections } = useMemo(() => {
        const now = new Date().getTime();
        const active = [];
        const archived = [];
        elections.forEach(e => {
            // Hide old parent elections that have a tie breaker
            if (e.hasTie && e.tieBreakerId) return;

            const endDate = new Date(e.endDate).getTime();
            const isExpired24h = now > endDate + (24 * 60 * 60 * 1000);

            if (isExpired24h) archived.push(e); else active.push(e);
        });
        return { activeElections: active, archivedElections: archived };
    }, [elections]);

    const displayedElections = activeTab === 'active' ? activeElections : archivedElections;
    const selectedElection = useMemo(() => elections.find(e => e.id === selectedElectionId), [elections, selectedElectionId]);

    // --- HANDLERS ---
    const initiateCountdown = (election) => { setConfirmModal({ isOpen: true, type: 'countdown', title: 'Start Official Count?', message: 'This locks voting and starts the 5-min timer.', actionLabel: 'Start Timer', data: election, isLoading: false }); };

    const executeCountdown = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true })); // Trigger Spinner
        const election = confirmModal.data;
        try {
            const revealTime = new Date(Date.now() + 5 * 60 * 1000);
            const electionRef = doc(db, 'elections', election.id);
            await updateDoc(electionRef, { resultsPending: true, revealTime, status: 'calculating' });
            showToast("Countdown started.", "success");
        } catch (err) {
            showToast("Failed.", "error");
        }
        setConfirmModal({ isOpen: false, type: null, data: null, isLoading: false });
    };

    const initiateFinalize = (election) => { setConfirmModal({ isOpen: true, type: 'finalize', title: 'Proclaim Winners?', message: 'This ends the election and publishes results.', actionLabel: 'Proclaim', data: election, isLoading: false }); };

    const executeFinalize = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true })); // Trigger Spinner
        const election = confirmModal.data;
        try {
            const electionRef = doc(db, 'elections', election.id);
            const electionSnap = await getDoc(electionRef);
            const electionData = electionSnap.data();
            let tally = electionData?.tally || electionData?.liveResults;
            let totalVotesCast = electionData?.totalVotes || 0;

            if (!tally || Object.keys(tally).length === 0) {
                const votesRef = collection(db, 'elections', election.id, 'votes');
                const votesSnap = await getDocs(votesRef);
                tally = {};
                totalVotesCast = 0;
                if (election.positions) {
                    election.positions.forEach(pos => {
                        tally[pos.title] = {};
                        pos.candidates.forEach(cand => tally[pos.title][cand.name] = 0);
                    });
                }
                votesSnap.forEach(docSnapshot => {
                    const data = docSnapshot.data();
                    const ballot = data.votes || data;
                    if (ballot && typeof ballot === 'object') {
                        let hasVote = false;
                        Object.entries(ballot).forEach(([posTitle, candName]) => {
                            if (['studentId', 'votedAt', 'votes'].includes(posTitle)) return;
                            if (!tally[posTitle]) tally[posTitle] = {};
                            if (tally[posTitle][candName] === undefined) tally[posTitle][candName] = 0;
                            tally[posTitle][candName]++;
                            hasVote = true;
                        });
                        if (hasVote) totalVotesCast++;
                    }
                });
            }

            const fullElection = { ...election, ...electionData, tally, positions: electionData?.positions || election.positions };
            const { hasTie, tiedPositions } = electionService.detectTies(fullElection);

            await updateDoc(electionRef, {
                status: 'completed',
                results: tally,
                totalVotes: totalVotesCast,
                resultsPending: false,
                resultsPosted: true,
                updatedAt: serverTimestamp()
            });

            if (hasTie) {
                const tieBreakerId = await electionService.createTieBreakerElection(
                    { id: election.id, ...electionData, tally },
                    tiedPositions
                );
                const posNames = tiedPositions.map(tp => tp.title).join(', ');
                showToast(`Tie detected in ${posNames}! Tie-breaker election created.`, "info");
            } else {
                showToast("Finalized!", "success");
            }
        } catch (err) {
            console.error("Finalize failed:", err);
            showToast("Failed.", "error");
        }
        setConfirmModal({ isOpen: false, type: null, data: null, isLoading: false });
    };

    const initiateDelete = (e, id) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'delete', title: 'Delete?', message: 'Are you sure you want to delete this card? This is an Irreversible action.', actionLabel: 'Proceed', isDestructive: true, data: id, isLoading: false }); };

    const executeDelete = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true })); // Trigger Spinner
        try {
            await electionService.deleteElection(confirmModal.data);
            showToast("Deleted.", "success");
        } catch (err) {
            showToast("Failed.", "error");
        }
        setConfirmModal({ isOpen: false, type: null, data: null, isLoading: false });
    };

    const resetForm = () => { setFormData({ title: '', organization: '', startDate: '', endDate: '', targetType: 'school', targetGrade: '11', visibility: 'private', positions: [] }); setFormStep(1); setEditingId(null); setViewMode('list'); };
    const startCreate = () => { resetForm(); setViewMode('create'); };

    const startEdit = (e) => {
        const fmt = (d) => { if (!d) return ''; const dt = new Date(d); dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()); return dt.toISOString().slice(0, 16); };
        setFormData({ title: e.title, organization: e.organization, startDate: fmt(e.startDate), endDate: fmt(e.endDate), targetType: e.targetType || 'school', targetGrade: e.targetGrade || '11', visibility: e.visibility || 'private', positions: e.positions || [] });
        setEditingId(e.id); setViewMode('create');
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.startDate) return showToast("Required fields missing", "error");
        try {
            const payload = { ...formData, startDate: new Date(formData.startDate).toISOString(), endDate: new Date(formData.endDate).toISOString(), status: 'active', schoolId: user.schoolId || 'srcs_main', createdBy: user.id };
            if (editingId) { await electionService.updateElection(editingId, payload); showToast('Updated!', 'success'); }
            else { await electionService.createElection(payload); showToast('Scheduled!', 'success'); }
            resetForm();
        } catch (err) { showToast('Failed.', 'error'); }
    };

    const handleAddPosition = () => setFormData(p => ({ ...p, positions: [...p.positions, { id: Date.now(), title: '', candidates: [{ id: Date.now() + 1, name: '' }] }] }));
    const updatePosition = (i, f, v) => { const n = [...formData.positions]; n[i][f] = v; setFormData({ ...formData, positions: n }); };
    const addCandidate = (i) => { const n = [...formData.positions]; n[i].candidates.push({ id: Date.now(), name: '' }); setFormData({ ...formData, positions: n }); };
    const updateCandidate = (pi, ci, v) => { const n = [...formData.positions]; n[pi].candidates[ci].name = v; setFormData({ ...formData, positions: n }); };
    const removeCandidate = (pi, ci) => { const n = [...formData.positions]; n[pi].candidates.splice(ci, 1); setFormData({ ...formData, positions: n }); };
    const removePosition = (i) => { const n = [...formData.positions]; n.splice(i, 1); setFormData({ ...formData, positions: n }); };

    if (selectedElection) return <LiveCanvassing election={selectedElection} onBack={() => setSelectedElectionId(null)} />;
    if (viewMode === 'create') return <CreateElectionForm formData={formData} setFormData={setFormData} formStep={formStep} setFormStep={setFormStep} editingId={editingId} onCancel={resetForm} onSubmit={handleSubmit} updatePosition={updatePosition} addCandidate={addCandidate} updateCandidate={updateCandidate} removeCandidate={removeCandidate} removePosition={removePosition} handleAddPosition={handleAddPosition} />;

    const tabs = [
        { key: 'active', label: 'Active', icon: ChartBar, count: activeElections.length },
        { key: 'archived', label: 'Archived', icon: Archive, count: archivedElections.length },
    ];

	return (
	        <div className="relative min-h-screen pb-32">
	            {/* === STICKY FLOATING HEADER === */}
	            <div className="sticky top-0 z-30 mx-3 md:mx-6 mb-4 mt-2">
	                <div className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-3 md:px-6 md:py-5 rounded-2xl md:rounded-[2rem] shadow-lg shadow-slate-200/20 dark:shadow-none">
	                    <div className="max-w-7xl mx-auto">
	                        <div className="flex flex-row items-center justify-between gap-3 md:gap-6">

	                            {/* TABS - Spans remaining width on mobile */}
	                            <div className="flex-1 flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl md:rounded-full">
	                                {tabs.map((tab) => {
	                                    const isActive = activeTab === tab.key;
	                                    const TabIcon = tab.icon;
	                                    return (
	                                        <button
	                                            key={tab.key}
	                                            onClick={() => setActiveTab(tab.key)}
	                                            className={`
	                                                flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 md:px-6 md:py-2.5 rounded-lg md:rounded-full text-[11px] md:text-xs font-bold uppercase tracking-wide transition-all
	                                                ${isActive
	                                                    ? 'text-white bg-blue-600 shadow-md'
	                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
	                                                }
	                                            `}
	                                        >
	                                            <TabIcon weight={isActive ? "fill" : "regular"} size={16} />
	                                            <span>{tab.label}</span>
	                                            {/* Hide count on very small mobile screens to save space */}
	                                            <span className="opacity-60 text-[10px] hidden sm:inline">({tab.count})</span>
	                                        </button>
	                                    );
	                                })}
	                            </div>

	                            {/* NEW ELECTION BUTTON - Perfect square on mobile, expands on md+ */}
	                            <button
	                                onClick={startCreate}
	                                className="shrink-0 flex items-center justify-center w-11 h-11 md:w-auto md:h-auto md:pl-4 md:pr-5 md:py-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-xl active:scale-95 transition-all text-sm font-bold"
	                            >
	                                <Plus weight="bold" size={20} />
	                                <span className="hidden md:inline ml-2">New Election</span>
	                            </button>
	                        </div>
	                    </div>
	                </div>
	            </div>

	            <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6 pt-1">
	                {/* === MAIN CONTENT CONTAINER === */}
	                {/* Reduced padding and border radius for mobile */}
	                <div className="bg-white/40 dark:bg-slate-950/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 lg:p-10 shadow-xl overflow-hidden min-h-[60vh]">

	                    {/* CONTENT GRID */}
	                    <motion.div
	                        variants={containerVariants}
	                        initial="hidden"
	                        animate="visible"
	                        key={activeTab}
	                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8"
	                    >
	                        <AnimatePresence mode="popLayout">
	                            {displayedElections.map((election) => {
	                                const canModify = user?.role === 'admin' || election.createdBy === user?.id;
	                                return (
	                                    <ElectionCard
	                                        key={election.id}
	                                        election={election}
	                                        isArchived={activeTab === 'archived'}
	                                        canModify={canModify}
	                                        onClick={() => {
	                                            if (election.hasTie && election.tieBreakerId) {
	                                                showToast("This election has a Tie-Breaker. Please view the Tie-Breaker card for full results.", "info");
	                                            } else {
	                                                setSelectedElectionId(election.id);
	                                            }
	                                        }}
	                                        onEdit={() => startEdit(election)}
	                                        onDelete={(e) => initiateDelete(e, election.id)}
	                                        onStartCountdown={(e) => { e.stopPropagation(); initiateCountdown(election); }}
	                                        onFinalize={() => initiateFinalize(election)}
	                                        onViewSummary={(e) => {
	                                            e.stopPropagation();
	                                            if (election.hasTie && election.tieBreakerId) {
	                                                showToast("This election has a Tie-Breaker. Please view the Tie-Breaker card for full results.", "info");
	                                            } else {
	                                                setSummaryElection(election);
	                                            }
	                                        }}
	                                    />
	                                );
	                            })}
	                        </AnimatePresence>
	                    </motion.div>

	                    {displayedElections.length === 0 && (
	                        <motion.div
	                            initial={{ opacity: 0, y: 20 }}
	                            animate={{ opacity: 1, y: 0 }}
	                            className="flex flex-col items-center justify-center py-24 text-center"
	                        >
	                            <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-100 dark:bg-white/5 rounded-2xl md:rounded-3xl border border-slate-200/50 dark:border-white/10 flex items-center justify-center mb-6 shadow-sm">
	                                {activeTab === 'active' ? (
	                                    <IdentificationCard weight="duotone" className="w-10 h-10 md:w-12 md:h-12 text-slate-300" />
	                                ) : (
	                                    <Archive weight="duotone" className="w-10 h-10 md:w-12 md:h-12 text-slate-300" />
	                                )}
	                            </div>
	                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2">
	                                {activeTab === 'active' ? 'No Active Elections' : 'Archive is Empty'}
	                            </h3>
	                            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm max-w-sm mx-auto leading-relaxed px-4">
	                                {activeTab === 'active'
	                                    ? "Start building democracy in your classroom by creating your first election campaign."
	                                    : "Completed elections will automatically move here 24 hours after they end."}
	                            </p>
	                            {activeTab === 'active' && (
	                                <button
	                                    onClick={startCreate}
	                                    className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.97]"
	                                >
	                                    Create First Election
	                                </button>
	                            )}
	                        </motion.div>
	                    )}
	                </div>
	            </div>

	            {/* === MODALS === */}
	            <ConfirmationModal
	                isOpen={confirmModal.isOpen}
	                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
	                type={confirmModal.type}
	                title={confirmModal.title}
	                message={confirmModal.message}
	                actionLabel={confirmModal.actionLabel}
	                isDestructive={confirmModal.isDestructive}
	                isLoading={confirmModal.isLoading}
	                onConfirm={confirmModal.type === 'countdown' ? executeCountdown : confirmModal.type === 'finalize' ? executeFinalize : confirmModal.type === 'delete' ? executeDelete : () => { }}
	            />

	            <ResultSummaryModal
	                election={summaryElection}
	                isOpen={!!summaryElection}
	                onClose={() => setSummaryElection(null)}
	            />
	        </div>
	    );
}