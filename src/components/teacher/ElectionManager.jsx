// src/components/teacher/ElectionManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Archive, IdentificationCard, MagnifyingGlass, ChartBar
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
    const [searchQuery, setSearchQuery] = useState('');

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
            const endDate = new Date(e.endDate).getTime();
            const isExpired24h = now > endDate + (24 * 60 * 60 * 1000);

            const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.organization.toLowerCase().includes(searchQuery.toLowerCase());

            if (matchesSearch) {
                if (isExpired24h) archived.push(e); else active.push(e);
            }
        });
        return { activeElections: active, archivedElections: archived };
    }, [elections, searchQuery]);

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
        <div className="relative min-h-screen pb-40">
            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">

                {/* === M3 HEADER === */}
                <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 pt-4 pb-5 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 rounded-[2rem] shadow-sm transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center justify-between md:justify-start gap-4 mb-3">
                                <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
                                    Elections
                                </h1>
                                <button
                                    onClick={startCreate}
                                    className="md:hidden w-11 h-11 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
                                >
                                    <Plus weight="bold" size={20} />
                                </button>
                            </div>
                            <div className="relative group max-w-md">
                                <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search elections..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-transparent focus:border-blue-500 rounded-full text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200/50 md:border-none md:bg-slate-100 md:p-1 md:rounded-full">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.key;
                                const TabIcon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`
                                    relative flex-1 md:flex-none px-5 py-2.5 md:rounded-full text-xs font-semibold uppercase tracking-wider transition-colors
                                    ${isActive
                                                ? 'text-blue-600 md:text-white md:bg-blue-600 md:shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 md:hover:bg-slate-200/50'
                                            }
                                `}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full md:hidden"
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                        <span className="flex items-center justify-center gap-2">
                                            <TabIcon weight={isActive ? "fill" : "regular"} size={16} />
                                            {tab.label}
                                            <span className="opacity-60 text-[10px]">
                                                ({tab.count})
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="pt-6">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        key={activeTab}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
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
                            <div className="w-20 h-20 bg-slate-100 rounded-[20px] border border-slate-200/50 flex items-center justify-center mb-5">
                                {activeTab === 'active' ? (
                                    <IdentificationCard weight="duotone" className="w-10 h-10 text-slate-300" />
                                ) : (
                                    <Archive weight="duotone" className="w-10 h-10 text-slate-300" />
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                {activeTab === 'active' ? 'No Active Elections' : 'Archive is Empty'}
                            </h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                {activeTab === 'active'
                                    ? "Get started by creating a new election campaign for your students."
                                    : "Elections will appear here 24 hours after they end."}
                            </p>
                            {activeTab === 'active' && (
                                <button
                                    onClick={startCreate}
                                    className="mt-5 px-5 py-2.5 rounded-full text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors active:scale-[0.97]"
                                >
                                    Create First Election
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={startCreate}
                className="hidden md:flex fixed bottom-8 right-8 z-50 items-center gap-3 pl-5 pr-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_8px_40px_rgb(59,130,246,0.4)] transition-all"
            >
                <Plus weight="bold" className="w-5 h-5" />
                <span className="font-semibold tracking-wide">New Election</span>
            </motion.button>

            {/* === MODALS === */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                type={confirmModal.type}
                title={confirmModal.title}
                message={confirmModal.message}
                actionLabel={confirmModal.actionLabel}
                isDestructive={confirmModal.isDestructive}
                isLoading={confirmModal.isLoading} // <-- Passed the new state down here
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