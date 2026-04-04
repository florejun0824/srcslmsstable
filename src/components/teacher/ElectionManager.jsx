// src/components/teacher/ElectionManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Archive, IdentificationCard, ChartBar, MagnifyingGlass,
    FunnelSimple, Lightning, Trophy, Confetti, X
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
import TiedInfoModal from './elections/modals/TiedInfoModal';

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

export default function ElectionManager() {
    const { user } = useAuth();
    const { showToast } = useToast();

    // --- STATE ---
    const [elections, setElections] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [activeTab, setActiveTab] = useState('active');
    const [selectedElectionId, setSelectedElectionId] = useState(null);
    const [summaryElection, setSummaryElection] = useState(null);
    const [tiedInfoElection, setTiedInfoElection] = useState(null);
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
        const active = [];
        const archived = [];
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        elections.forEach(e => {
            const endMs = e.endDate ? new Date(e.endDate).getTime() : 0;
            const isRecentlyCompleted = e.status === 'completed' && (now - endMs < TWENTY_FOUR_HOURS);

            // Tie-breakers move to archive immediately to avoid cluttering active view
            if (e.status === 'archived') {
                archived.push(e);
            } else if (e.status === 'completed') {
                if (isRecentlyCompleted) active.push(e);
                else archived.push(e);
            } else {
                active.push(e);
            }
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

    const initiateFinalize = (election) => { 
        setConfirmModal({ 
            isOpen: true, 
            type: 'finalize', 
            title: 'End Election Early?', 
            message: 'This ends voting immediately. The automated cloud system will canvass the results and post an announcement within 5 minutes.', 
            actionLabel: 'End Now', 
            data: election, 
            isLoading: false 
        }); 
    };

    const executeFinalize = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        const election = confirmModal.data;
        try {
            const electionRef = doc(db, 'elections', election.id);
            // Trigger the Cloud Function Cron Job by ending the election now
            await updateDoc(electionRef, {
                endDate: new Date().toISOString()
            });

            showToast("Election ended! Results are being processed...", "success");
        } catch (err) {
            console.error("Finalize failed:", err);
            showToast("Failed to end election.", "error");
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
    if (summaryElection) return <ResultSummaryModal election={summaryElection} onBack={() => setSummaryElection(null)} />;
    if (viewMode === 'create') return <CreateElectionForm formData={formData} setFormData={setFormData} formStep={formStep} setFormStep={setFormStep} editingId={editingId} onCancel={resetForm} onSubmit={handleSubmit} updatePosition={updatePosition} addCandidate={addCandidate} updateCandidate={updateCandidate} removeCandidate={removeCandidate} removePosition={removePosition} handleAddPosition={handleAddPosition} />;

    const tabs = [
        { key: 'active', label: 'Active', icon: Lightning, count: activeElections.length },
        { key: 'archived', label: 'Archived', icon: Archive, count: archivedElections.length },
    ];

    const liveCount = activeElections.filter(e => e.status === 'active' && new Date() < new Date(e.endDate)).length;

    return (
        /* Micro-margin on mobile (p-2) to allow rounded corners to show without wasting space */
        <div className="p-2 sm:p-4 md:p-6 min-h-[calc(100vh-6rem)] flex flex-col selection:bg-indigo-500/30 w-full">
            
            {/* === PREMIUM ROUNDED APP WINDOW === */}
            <div className="relative flex-1 w-full bg-slate-50 dark:bg-slate-950 font-sans rounded-[24px] sm:rounded-[40px] lg:rounded-[48px] border border-slate-200/60 dark:border-slate-800/50 shadow-sm sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] pb-32">
                
                {/* Dedicated Background Layer (Contains the aurora glows so they don't cause scroll overflow) */}
                <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/10 dark:bg-indigo-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-400/10 dark:bg-teal-900/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
                </div>

                {/* Main Content Area */}
                <div className="relative z-10 max-w-7xl mx-auto pt-1.5 md:pt-4">
                    
                    {/* === ULTRA PREMIUM COMMAND BAR (Sticky) === */}
                    <header className="sticky top-0 sm:top-2 md:top-4 z-50 px-0 sm:px-4 md:px-6 mb-4 md:mb-10 transition-all duration-300">
                        <div className="bg-white/98 dark:bg-slate-900/98 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[20px] sm:rounded-[32px] md:rounded-[40px] p-2 sm:p-3 transition-all duration-300">
                            <div className="flex flex-col xl:flex-row gap-2.5 md:gap-4 items-center justify-between">
                                
                                {/* TOP ROW (Mobile) / LEFT SIDE (Desktop): Title & Actions */}
                                <div className="flex items-center justify-between w-full xl:w-auto px-1">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-[14px] md:rounded-[20px] bg-indigo-500 text-white flex items-center justify-center shadow-inner shadow-white/20 shrink-0">
                                            <Trophy weight="fill" size={24} className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                                Elections
                                            </h1>
                                            {liveCount > 0 ? (
                                                <span className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                                    {liveCount} Live Now
                                                </span>
                                            ) : (
                                                <span className="mt-1 text-[9px] sm:text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Manager
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mobile New Button (Hidden on Desktop) */}
                                    <button 
                                        onClick={startCreate} 
                                        className="xl:hidden flex items-center justify-center w-10 h-10 rounded-[14px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg active:scale-95 transition-transform shrink-0"
                                    >
                                        <Plus weight="bold" size={20} />
                                    </button>
                                </div>

                                {/* CENTER: Segmented Tabs */}
                                <div className="w-full xl:w-auto flex bg-slate-100 dark:bg-slate-800/80 p-1 md:p-1.5 rounded-[16px] md:rounded-[28px] ring-1 ring-slate-200/50 dark:ring-slate-700/50 shadow-inner">
                                    {tabs.map((tab) => {
                                        const isActive = activeTab === tab.key;
                                        const TabIcon = tab.icon;
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 py-2 md:py-2.5 rounded-[12px] md:rounded-[24px] text-[11px] md:text-sm font-bold transition-all duration-300 relative z-10 ${
                                                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeElectionTab"
                                                        className="absolute inset-0 rounded-[12px] md:rounded-[24px] shadow-sm bg-white dark:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50"
                                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                    />
                                                )}
                                                <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
                                                    <TabIcon weight={isActive ? "fill" : "regular"} size={16} className="md:w-[18px] md:h-[18px]" />
                                                    <span>{tab.label}</span>
                                                    <span className={`px-1.5 md:px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-black tabular-nums transition-colors duration-300 ${
                                                        isActive ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200/50 dark:bg-slate-700 text-slate-400'
                                                    }`}>
                                                        {tab.count}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* RIGHT SIDE: Search & Desktop New Button */}
                                <div className="w-full xl:w-auto flex items-center gap-2 md:gap-3">
                                    {/* Search Bar */}
                                    <div className="relative flex-1 xl:w-64">
                                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-[18px] md:h-[18px]" weight="bold" />
                                        <input
                                            type="text"
                                            placeholder="Search elections..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2.5 md:py-3 text-xs md:text-sm font-semibold bg-slate-50 md:bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-[14px] md:rounded-[24px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-inner md:shadow-sm"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200/80 p-1 rounded-full transition-colors"
                                            >
                                                <X size={10} weight="bold" />
                                            </button>
                                        )}
                                    </div>
                                    {/* Desktop New Button */}
                                    <button 
                                        onClick={startCreate} 
                                        className="hidden xl:flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.12)] shrink-0"
                                    >
                                        <Plus weight="bold" size={18} />
                                        New Election
                                    </button>
                                </div>

                            </div>
                        </div>
                    </header>

                    {/* === MAIN CONTENT GRID === */}
                    <div className="px-1.5 sm:px-4 md:px-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            >
                                {displayedElections.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                                        <AnimatePresence mode="popLayout">
                                            {displayedElections.map((election) => {
                                                const canModify = user?.role === 'admin' || election.createdBy === user?.id;
                                                return (
                                                    <motion.div 
                                                        key={election.id} 
                                                        variants={itemVariants} 
                                                        layout 
                                                        style={{ willChange: "transform, opacity" }}
                                                    >
                                                        <ElectionCard
                                                            election={election}
                                                            isArchived={activeTab === 'archived'}
                                                            canModify={canModify}
                                                            onClick={() => {
                                                                if (election.hasTie && election.tieBreakerId) {
                                                                    setTiedInfoElection(election);
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
                                                                setSummaryElection(election);
                                                            }}
                                                        />
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    /* PREMIUM EMPTY STATE */
                                    <motion.div
                                        variants={itemVariants}
                                        className="flex flex-col items-center justify-center py-20 md:py-32 text-center"
                                    >
                                        <div className="relative mb-6 md:mb-8 group">
                                            <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/10 blur-2xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-700" />
                                            <div className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-[24px] sm:rounded-[28px] md:rounded-[40px] flex items-center justify-center md:backdrop-blur-xl shadow-xl border ${
                                                activeTab === 'active'
                                                    ? 'bg-white/90 dark:bg-slate-800/90 border-indigo-100 dark:border-indigo-500/20'
                                                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
                                            }`}>
                                                {activeTab === 'active' ? (
                                                    <IdentificationCard weight="duotone" className="w-10 h-10 md:w-16 md:h-16 text-indigo-500 dark:text-indigo-400" />
                                                ) : (
                                                    <Archive weight="duotone" className="w-10 h-10 md:w-16 md:h-16 text-slate-400 dark:text-slate-500" />
                                                )}
                                            </div>
                                            {searchQuery.trim() && (
                                                <div className="absolute -top-2 -right-2 w-7 h-7 md:w-10 md:h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-[3px] border-white dark:border-slate-950">
                                                    <FunnelSimple size={14} weight="bold" className="text-white md:w-5 md:h-5" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-2 md:mb-3 tracking-tight">
                                            {searchQuery.trim()
                                                ? `No results for "${searchQuery.trim()}"`
                                                : activeTab === 'active' ? 'No Active Elections' : 'Archive is Empty'}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm md:text-base max-w-[280px] sm:max-w-sm mx-auto leading-relaxed font-medium">
                                            {searchQuery.trim()
                                                ? 'Try adjusting your search term or exploring the other tab.'
                                                : activeTab === 'active'
                                                    ? 'Start building democracy in your classroom by creating your first election today.'
                                                    : 'Completed elections automatically move here once canvassed.'}
                                        </p>
                                        {activeTab === 'active' && !searchQuery.trim() && (
                                            <button
                                                onClick={startCreate}
                                                className="mt-6 md:mt-8 flex items-center gap-2 px-6 py-3.5 md:px-8 md:py-4 rounded-[20px] md:rounded-[24px] text-xs md:text-sm font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:scale-105 shadow-xl shadow-slate-900/20 dark:shadow-indigo-500/25 transition-all active:scale-[0.97]"
                                            >
                                                <Plus weight="bold" size={18} />
                                                Create First Election
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
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


            <TiedInfoModal 
                isOpen={!!tiedInfoElection}
                onClose={() => setTiedInfoElection(null)}
                election={tiedInfoElection}
                onViewSummary={() => setSummaryElection(tiedInfoElection)}
            />
        </div>
    );
}