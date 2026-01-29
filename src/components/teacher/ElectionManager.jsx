// src/components/teacher/ElectionManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Archive, IdentificationCard, MagnifyingGlass, ChartBar 
} from '@phosphor-icons/react';
import { doc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'; 
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
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, data: null });
  const [editingId, setEditingId] = useState(null);
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({ 
    title: '', organization: '', startDate: '', endDate: '', 
    targetType: 'school', targetGrade: '11', positions: [] 
  });
  const [searchQuery, setSearchQuery] = useState('');

  // --- EFFECTS ---
  useEffect(() => {
    if (user?.id) {
      const unsub = electionService.getTeacherElections(user.id, setElections);
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
  const initiateCountdown = (election) => { setConfirmModal({ isOpen: true, type: 'countdown', title: 'Start Official Count?', message: 'This locks voting and starts the 5-min timer.', actionLabel: 'Start Timer', data: election }); };
  const executeCountdown = async () => { const election = confirmModal.data; try { const revealTime = new Date(Date.now() + 5 * 60 * 1000); const electionRef = doc(db, 'elections', election.id); await updateDoc(electionRef, { resultsPending: true, revealTime, status: 'calculating' }); showToast("Countdown started.", "success"); } catch (err) { showToast("Failed.", "error"); } setConfirmModal({ isOpen: false, type: null, data: null }); };
  
  const initiateFinalize = (election) => { setConfirmModal({ isOpen: true, type: 'finalize', title: 'Proclaim Winners?', message: 'This ends the election and publishes results.', actionLabel: 'Proclaim', data: election }); };
  const executeFinalize = async () => { const election = confirmModal.data; try { const votesRef = collection(db, 'elections', election.id, 'votes'); const votesSnap = await getDocs(votesRef); const tally = {}; let totalVotesCast = 0; if (election.positions) { election.positions.forEach(pos => { tally[pos.title] = {}; pos.candidates.forEach(cand => tally[pos.title][cand.name] = 0); }); } votesSnap.forEach(docSnapshot => { const data = docSnapshot.data(); const ballot = data.votes || data; if (ballot && typeof ballot === 'object') { let hasVote = false; Object.entries(ballot).forEach(([posTitle, candName]) => { if (['studentId', 'votedAt', 'votes'].includes(posTitle)) return; if (!tally[posTitle]) tally[posTitle] = {}; if (tally[posTitle][candName] === undefined) tally[posTitle][candName] = 0; tally[posTitle][candName]++; hasVote = true; }); if (hasVote) totalVotesCast++; } }); const electionRef = doc(db, 'elections', election.id); await updateDoc(electionRef, { status: 'completed', results: tally, totalVotes: totalVotesCast, resultsPending: false, resultsPosted: true, updatedAt: serverTimestamp() }); showToast("Finalized!", "success"); } catch (err) { showToast("Failed.", "error"); } setConfirmModal({ isOpen: false, type: null, data: null }); };

  const initiateDelete = (e, id) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'delete', title: 'Delete?', message: 'Irreversible action.', actionLabel: 'Delete', isDestructive: true, data: id }); };
  const executeDelete = async () => { try { await electionService.deleteElection(confirmModal.data); showToast("Deleted.", "success"); } catch (err) { showToast("Failed.", "error"); } setConfirmModal({ isOpen: false, type: null, data: null }); };

  const resetForm = () => { setFormData({ title: '', organization: '', startDate: '', endDate: '', targetType: 'school', targetGrade: '11', positions: [] }); setFormStep(1); setEditingId(null); setViewMode('list'); };
  const startCreate = () => { resetForm(); setViewMode('create'); };
  const startEdit = (e) => { 
      const fmt = (d) => { if (!d) return ''; const dt = new Date(d); dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()); return dt.toISOString().slice(0, 16); };
      setFormData({ title: e.title, organization: e.organization, startDate: fmt(e.startDate), endDate: fmt(e.endDate), targetType: e.targetType || 'school', targetGrade: e.targetGrade || '11', positions: e.positions || [] });
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
  
  // Helpers
  const handleAddPosition = () => setFormData(p => ({ ...p, positions: [...p.positions, { id: Date.now(), title: '', candidates: [{ id: Date.now()+1, name: '' }] }] }));
  const updatePosition = (i, f, v) => { const n = [...formData.positions]; n[i][f] = v; setFormData({ ...formData, positions: n }); };
  const addCandidate = (i) => { const n = [...formData.positions]; n[i].candidates.push({ id: Date.now(), name: '' }); setFormData({ ...formData, positions: n }); };
  const updateCandidate = (pi, ci, v) => { const n = [...formData.positions]; n[pi].candidates[ci].name = v; setFormData({ ...formData, positions: n }); };
  const removeCandidate = (pi, ci) => { const n = [...formData.positions]; n[pi].candidates.splice(ci, 1); setFormData({ ...formData, positions: n }); };
  const removePosition = (i) => { const n = [...formData.positions]; n.splice(i, 1); setFormData({ ...formData, positions: n }); };

  // --- CONDITIONAL RENDERS ---
  if (selectedElection) return <LiveCanvassing election={selectedElection} onBack={() => setSelectedElectionId(null)} />;
  if (viewMode === 'create') return <CreateElectionForm formData={formData} setFormData={setFormData} formStep={formStep} setFormStep={setFormStep} editingId={editingId} onCancel={resetForm} onSubmit={handleSubmit} updatePosition={updatePosition} addCandidate={addCandidate} updateCandidate={updateCandidate} removeCandidate={removeCandidate} removePosition={removePosition} handleAddPosition={handleAddPosition} />;

  // --- MAIN RENDER ---
  return (
    // FIX: Added -mt-8 to pull content up and close the gap on mobile
    <div className="relative min-h-screen pb-40 -mt-8 md:mt-0">
      
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
        
        {/* --- STICKY HEADER & TABS --- */}
        {/* FIX: Changed top-24 to top-20 and rounded-b to rounded-[2.5rem] for full pill shape */}
        <div className="sticky top-20 md:top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 pt-4 pb-6 bg-slate-50/95 dark:bg-[#0f1012]/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 shadow-sm rounded-[2.5rem] transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                {/* Title & Search */}
                <div className="flex-1">
                    <div className="flex items-center justify-between md:justify-start gap-4 mb-3">
                         <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            Elections
                        </h1>
                        
                        {/* Mobile Add Button (Circular Action) */}
                        <button 
                            onClick={startCreate} 
                            className="md:hidden w-11 h-11 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/25 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus weight="bold" size={20} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group max-w-md">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search campaigns..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Segmented Tab Control */}
                <div className="flex p-1.5 bg-slate-200/50 dark:bg-white/5 backdrop-blur-md rounded-2xl md:w-auto w-full">
                    {['active', 'archived'].map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)} 
                                className={`
                                    relative flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors z-10
                                    ${isActive ? 'text-slate-800 dark:text-black' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                                `}
                            >
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white shadow-sm dark:shadow-none rounded-xl z-[-1]"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="flex items-center justify-center gap-2">
                                    {tab === 'active' ? <ChartBar weight={isActive ? "fill" : "regular"} /> : <Archive weight={isActive ? "fill" : "regular"} />}
                                    {tab}
                                    <span className="ml-1 opacity-60 text-[10px]">
                                        ({tab === 'active' ? activeElections.length : archivedElections.length})
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* --- GRID CONTENT --- */}
        <div className="pt-6">
            <motion.div 
                variants={containerVariants} 
                initial="hidden" 
                animate="visible" 
                key={activeTab}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
                <AnimatePresence mode="popLayout">
                    {displayedElections.map((election) => (
                    <ElectionCard 
                        key={election.id} 
                        election={election} 
                        isArchived={activeTab === 'archived'} 
                        onClick={() => setSelectedElectionId(election.id)} 
                        onEdit={() => startEdit(election)} 
                        onDelete={(e) => initiateDelete(e, election.id)} 
                        onStartCountdown={(e) => { e.stopPropagation(); initiateCountdown(election); }} 
                        onFinalize={(e) => { e.stopPropagation(); initiateFinalize(election); }} 
                        onViewSummary={(e) => { e.stopPropagation(); setSummaryElection(election); }} 
                    />
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Empty State */}
            {displayedElections.length === 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                >
                    <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                        {activeTab === 'active' ? (
                            <IdentificationCard weight="duotone" className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                        ) : (
                            <Archive weight="duotone" className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                        )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {activeTab === 'active' ? 'No Active Elections' : 'Archive is Empty'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
                        {activeTab === 'active' 
                            ? "Get started by creating a new election campaign for your students." 
                            : "Elections will appear here 24 hours after they end."}
                    </p>
                    {activeTab === 'active' && (
                        <button onClick={startCreate} className="mt-6 text-blue-600 font-bold text-sm hover:underline">
                            Create First Election
                        </button>
                    )}
                </motion.div>
            )}
        </div>
      </div>

      {/* --- FLOATING ACTION BUTTON (Desktop Only) --- */}
      <motion.button 
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }}
        onClick={startCreate} 
        className="hidden md:flex fixed bottom-8 right-8 z-50 group items-center gap-3 pl-4 pr-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-2xl transition-all"
      >
        <div className="bg-white/20 dark:bg-black/10 p-2 rounded-full">
             <Plus weight="bold" className="w-5 h-5" />
        </div>
        <span className="font-bold tracking-wide">New Election</span>
        
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 dark:ring-black/10 group-hover:scale-105 transition-transform" />
      </motion.button>

      {/* --- MODALS --- */}
      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        type={confirmModal.type} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        actionLabel={confirmModal.actionLabel} 
        isDestructive={confirmModal.isDestructive} 
        onConfirm={confirmModal.type === 'countdown' ? executeCountdown : confirmModal.type === 'finalize' ? executeFinalize : confirmModal.type === 'delete' ? executeDelete : () => {}} 
      />
      
      <ResultSummaryModal 
        election={summaryElection} 
        isOpen={!!summaryElection} 
        onClose={() => setSummaryElection(null)} 
      />
    </div>
  );
}