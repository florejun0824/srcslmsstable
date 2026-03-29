// src/components/teacher/ElectionManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Archive, IdentificationCard, ChartBar, MagnifyingGlass,
    FunnelSimple, Lightning, Trophy, Confetti
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
        transition: { staggerChildren: 0.07, delayChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } }
};

// --- STAT PILL ---
const StatPill = ({ icon: Icon, label, value, color }) => (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${color}`}>
        <Icon weight="fill" size={14} className="opacity-80" />
        <span className="tabular-nums">{value}</span>
        <span className="hidden sm:inline font-medium opacity-70">{label}</span>
    </div>
);

export default function ElectionManager() {
    const { user } = useAuth();
    const { showToast } = useToast();

    // --- STATE ---
    const [elections, setElections] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [activeTab, setActiveTab] = useState('active');
    const [selectedElectionId, setSelectedElectionId] = useState(null);
    const [summaryElection, setSummaryElection] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, data: null, isLoading: false });
    const [editingId, setEditingId] = useState(null);
    const [formStep, setFormStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');

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
            if (e.hasTie && e.tieBreakerId) return;
            const endDate = new Date(e.endDate).getTime();
            const isExpired24h = now > endDate + (24 * 60 * 60 * 1000);
            if (isExpired24h) archived.push(e); else active.push(e);
        });
        return { activeElections: active, archivedElections: archived };
    }, [elections]);

    const displayedElections = useMemo(() => {
        const base = activeTab === 'active' ? activeElections : archivedElections;
        if (!searchQuery.trim()) return base;
        const q = searchQuery.toLowerCase();
        return base.filter(e =>
            e.title?.toLowerCase().includes(q) ||
            e.organization?.toLowerCase().includes(q)
        );
    }, [activeTab, activeElections, archivedElections, searchQuery]);

    const selectedElection = useMemo(() => elections.find(e => e.id === selectedElectionId), [elections, selectedElectionId]);

    // --- HANDLERS ---
    const initiateCountdown = (election) => { setConfirmModal({ isOpen: true, type: 'countdown', title: 'Start Official Count?', message: 'This locks voting and starts the 5-min timer.', actionLabel: 'Start Timer', data: election, isLoading: false }); };

    const executeCountdown = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
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
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
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
                await electionService.createTieBreakerElection(
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

    const initiateDelete = (e, id) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'delete', title: 'Delete?', message: 'Are you sure you want to delete this? This is irreversible.', actionLabel: 'Proceed', isDestructive: true, data: id, isLoading: false }); };

    const executeDelete = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
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
        { key: 'active', label: 'Active', icon: Lightning, count: activeElections.length },
        { key: 'archived', label: 'Archived', icon: Archive, count: archivedElections.length },
    ];

    const liveCount = activeElections.filter(e => e.status === 'active' && new Date() < new Date(e.endDate)).length;

    return (
        <div className="relative min-h-screen pb-32 font-sans">

            {/* === STICKY HEADER AND CONTROLS === */}
            <div className="sticky top-0 md:top-4 z-30 bg-slate-50/90 dark:bg-slate-900/95 backdrop-blur-xl border-b md:border border-slate-200/80 dark:border-slate-800/80 rounded-b-3xl md:rounded-[2.5rem] mx-0 md:mx-6 mb-6 shadow-sm overflow-hidden transition-all">
                <div className="px-4 md:px-6 pt-5 md:pt-6">
                    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 opacity-80 mb-1">
                                <Confetti weight="fill" size={16} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">
                                    Election Manager
                                </span>
                                <span className="hidden xl:inline text-[13px] font-medium text-slate-500 dark:text-slate-400 ml-1">
                                    — Schedule, manage, and tally school elections.
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                Campus Elections
                            </h1>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed xl:hidden">
                                Schedule, manage, and tally school elections seamlessly across your institution.
                            </p>
                        </div>

                        {/* Stat Pills & CTA */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <StatPill
                                    icon={Lightning}
                                    label="Live"
                                    value={liveCount}
                                    color="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                />
                                <StatPill
                                    icon={ChartBar}
                                    label="Active"
                                    value={activeElections.length}
                                    color="bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400"
                                />
                                <StatPill
                                    icon={Archive}
                                    label="Archived"
                                    value={archivedElections.length}
                                    color="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hidden sm:flex"
                                />
                            </div>
                            <button
                                onClick={startCreate}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 md:px-6 md:py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-all focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-800 active:scale-95 shadow-sm"
                            >
                                <Plus weight="bold" size={18} />
                                New Election
                            </button>
                        </div>
                    </div>
                </div>

                {/* CONTROLS TOOLBAR */}
                <div className="mx-4 md:mx-6 mt-4 md:mt-5 pt-4 md:pt-5 pb-5 md:pb-6 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Tab switcher */}
                        <div className="flex bg-slate-100/80 dark:bg-slate-900/50 p-1.5 rounded-xl flex-1 sm:max-w-[320px] ring-1 ring-slate-200/50 dark:ring-slate-800">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.key;
                                const TabIcon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 relative z-10 ${
                                            isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeElectionTab"
                                                className="absolute inset-0 rounded-lg shadow-sm bg-white dark:bg-slate-800 ring-1 ring-slate-200/50 dark:ring-slate-700/50"
                                                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-1.5">
                                            <TabIcon weight={isActive ? "fill" : "regular"} size={16} />
                                            <span>{tab.label}</span>
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                                                isActive ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
    
                        {/* Search */}
                        <div className="relative flex-1 sm:max-w-[280px]">
                            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} weight="bold" />
                            <input
                                type="text"
                                placeholder="Search elections..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* === MAIN CONTENT === */}
            <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    >
                        {displayedElections.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                                <AnimatePresence mode="popLayout">
                                    {displayedElections.map((election) => {
                                        const canModify = user?.role === 'admin' || election.createdBy === user?.id;
                                        return (
                                            <motion.div key={election.id} variants={itemVariants} layout>
                                                <ElectionCard
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
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <motion.div
                                variants={itemVariants}
                                className="flex flex-col items-center justify-center py-20 sm:py-28 text-center"
                            >
                                {/* Icon */}
                                <div className="relative mb-6">
                                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center ${
                                        activeTab === 'active'
                                            ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20'
                                            : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700'
                                    }`}>
                                        {activeTab === 'active' ? (
                                            <IdentificationCard weight="duotone" className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400" />
                                        ) : (
                                            <Archive weight="duotone" className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                                        )}
                                    </div>
                                    {searchQuery.trim() && (
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                                            <FunnelSimple size={12} weight="bold" className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-2">
                                    {searchQuery.trim()
                                        ? `No results for "${searchQuery.trim()}"`
                                        : activeTab === 'active' ? 'No Active Elections' : 'Archive is Empty'}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
                                    {searchQuery.trim()
                                        ? 'Try adjusting your search term.'
                                        : activeTab === 'active'
                                            ? 'Start building democracy in your classroom by creating your first election.'
                                            : 'Completed elections automatically move here 24 hours after they end.'}
                                </p>
                                {activeTab === 'active' && !searchQuery.trim() && (
                                    <button
                                        onClick={startCreate}
                                        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.97]"
                                    >
                                        <Plus weight="bold" size={16} />
                                        Create First Election
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
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