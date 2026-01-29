import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  CaretLeft, 
  SealCheck, 
  ChartBar, 
  Table,
  Circle,
  TrendUp
} from '@phosphor-icons/react';
import { electionService } from '../../../../services/electionService';
import { useTheme } from '../../../../contexts/ThemeContext';

// --- UTILS ---
const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const stringToColor = (str) => {
    const colors = [
        'bg-blue-600 text-white',
        'bg-emerald-600 text-white',
        'bg-violet-600 text-white',
        'bg-amber-600 text-white',
        'bg-rose-600 text-white',
        'bg-cyan-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const LiveCanvassing = ({ election, onBack }) => {
  const [results, setResults] = useState(election.results || {});
  const { monetTheme } = useTheme();

  useEffect(() => {
    if (election.status === 'completed' && election.results) {
        setResults(election.results);
        return;
    }
    const unsub = electionService.getLiveResults(election.id, (allVotes) => {
      const tally = {};
      election.positions.forEach(pos => {
        tally[pos.title] = {};
        pos.candidates.forEach(cand => tally[pos.title][cand.name] = 0);
      });
      allVotes.forEach(voteMap => {
        Object.entries(voteMap).forEach(([posTitle, candidateName]) => {
            if (tally[posTitle]?.[candidateName] !== undefined) tally[posTitle][candidateName]++;
        });
      });
      setResults(tally);
    });
    return () => unsub();
  }, [election]);

  const totalVotesCast = useMemo(() => {
    if (!election.positions.length) return 0;
    const firstPos = election.positions[0].title;
    const posResults = results[firstPos] || {};
    return Object.values(posResults).reduce((a, b) => a + b, 0);
  }, [results, election]);

  return (
    // CHANGE 1: Removed 'bg-slate-50 dark:bg-[#0B0C10]' and 'min-h-screen'
    // This removes the "black border" by making the container transparent
    <div 
        className="w-full font-sans text-slate-900 dark:text-slate-100"
        style={monetTheme.variables} 
    >
       
       {/* CHANGE 2: Kept the rounded card, but now it floats over the dashboard background */}
       <div className="max-w-7xl mx-auto bg-white dark:bg-[#15161C] rounded-[32px] shadow-xl overflow-hidden min-h-[85vh] border border-slate-200 dark:border-white/5 relative">
          
          <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--monet-primary)] opacity-80" />

          {/* --- HEADER --- */}
          <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#15161C]/90 backdrop-blur-md border-b border-slate-100 dark:border-white/5 px-6 py-5">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <button 
                      onClick={onBack} 
                      className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[var(--monet-primary)] transition-colors"
                    >
                       <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:bg-[var(--monet-primary)] group-hover:text-white group-hover:border-[var(--monet-primary)] transition-all">
                          <CaretLeft weight="bold" size={18} />
                       </div>
                       <div className="hidden sm:flex flex-col items-start">
                           <span className="uppercase tracking-wider text-[10px] opacity-60">Back to</span>
                           <span className="leading-none">Elections</span>
                       </div>
                    </button>
                    
                    <div className="h-10 w-px bg-slate-200 dark:bg-white/10 mx-2" />

                    <div>
                       <h1 className="text-xl font-black uppercase tracking-tight leading-none text-slate-900 dark:text-white">
                          Official Canvassing
                       </h1>
                       <p className="text-xs font-bold text-[var(--monet-primary)] mt-1 uppercase tracking-widest flex items-center gap-2">
                          <SealCheck weight="fill" />
                          {election.title}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-center gap-6">
                     <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/5">
                            <div className={`w-2 h-2 rounded-full ${election.status === 'completed' ? 'bg-slate-500' : 'bg-red-500 animate-pulse'}`} />
                            <span className={`text-xs font-bold uppercase tracking-widest ${election.status === 'completed' ? 'text-slate-500' : 'text-red-500'}`}>
                                {election.status === 'completed' ? 'Finalized' : 'Live Tally'}
                            </span>
                        </div>
                     </div>
                 </div>
              </div>
          </header>

          {/* --- CONTENT --- */}
          <main className="px-4 md:px-8 py-8 space-y-8">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <MetricCard 
                    label="Total Returns" 
                    value={totalVotesCast.toLocaleString()} 
                    icon={Table} 
                 />
                 <MetricCard 
                    label="Positions" 
                    value={election.positions.length} 
                    icon={ChartBar} 
                 />
                 <div className="col-span-2 bg-[var(--monet-primary)]/5 border border-[var(--monet-primary)]/20 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden group">
                     <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--monet-primary)] mb-1 opacity-80">Target Electorate</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white">
                            {election.targetType === 'grade' ? `Grade ${election.targetGrade} Students` : 'Entire Student Body'}
                        </div>
                     </div>
                     <SealCheck size={48} weight="duotone" className="text-[var(--monet-primary)] opacity-20 absolute -right-4 -bottom-4 rotate-12 group-hover:scale-110 transition-transform" />
                 </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-12">
                 {election.positions.map((pos) => {
                    const posResults = results[pos.title] || {};
                    const totalVotes = Object.values(posResults).reduce((a, b) => a + b, 0);
                    const candidates = pos.candidates.sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));

                    return (
                       <OfficialTallyCard 
                          key={pos.id} 
                          title={pos.title} 
                          candidates={candidates} 
                          posResults={posResults} 
                          totalVotes={totalVotes}
                       />
                    );
                 })}
              </div>

          </main>
       </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon }) => (
    <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between">
        <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">
                {value}
            </div>
        </div>
        <div className="text-slate-300 dark:text-white/10">
            <Icon size={32} weight="duotone" />
        </div>
    </div>
);

const OfficialTallyCard = ({ title, candidates, posResults, totalVotes }) => {
    return (
        <div className="bg-white dark:bg-[#1A1C24] border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="relative bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5 px-6 py-5 flex justify-between items-center overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--monet-primary)]" />
                <div className="pl-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                        {title}
                    </h3>
                </div>
                <div className="text-[10px] font-mono font-medium text-slate-400 bg-white dark:bg-white/5 px-2 py-1 rounded border border-slate-200 dark:border-white/5">
                    <span className="text-slate-900 dark:text-white font-bold">{totalVotes}</span> VOTES
                </div>
            </div>

            <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-50/80 dark:bg-black/20 border-b border-slate-100 dark:border-white/5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-6 pl-2">Candidate</div>
                <div className="col-span-5 text-right">Count</div>
            </div>

            <div className="p-0">
                <LayoutGroup>
                    <AnimatePresence>
                        {candidates.map((cand, idx) => {
                            const votes = posResults[cand.name] || 0;
                            const percent = totalVotes === 0 ? 0 : ((votes / totalVotes) * 100).toFixed(1);
                            const isWinner = idx === 0 && votes > 0;
                            const isRunnerUp = idx === 1;

                            return (
                                <motion.div 
                                    layout
                                    key={cand.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                    className={`
                                        relative grid grid-cols-12 items-center px-6 py-4 border-b border-slate-100 dark:border-white/[0.03] last:border-0
                                        ${isWinner ? 'bg-[var(--monet-primary)]/5' : 'bg-transparent'}
                                    `}
                                >
                                    <div className="col-span-1 flex justify-center">
                                        <div className={`
                                            w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors duration-500
                                            ${isWinner ? 'bg-[var(--monet-primary)] text-white shadow-md' : 
                                              isRunnerUp ? 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300' : 
                                              'text-slate-400'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                    </div>

                                    <div className="col-span-6 pl-4 flex items-center gap-3 relative z-10">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm ${stringToColor(cand.name)}`}>
                                            {getInitials(cand.name)}
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-bold leading-tight ${isWinner ? 'text-[var(--monet-primary)]' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {cand.name}
                                            </h4>
                                            {isWinner && (
                                                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--monet-primary)] mt-0.5 opacity-80">
                                                    <SealCheck weight="fill" /> Leading
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-5 relative flex flex-col items-end justify-center">
                                        <div className="flex items-baseline gap-2 mb-1.5 relative z-10">
                                            <span className={`font-mono font-bold text-sm ${isWinner ? 'text-[var(--monet-primary)]' : 'text-slate-900 dark:text-slate-100'}`}>
                                                {votes.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 w-8 text-right">
                                                {percent}%
                                            </span>
                                        </div>
                                        
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className={`h-full rounded-full ${isWinner ? 'bg-[var(--monet-primary)]' : 'bg-slate-400 dark:bg-slate-500'}`}
                                            />
                                        </div>
                                    </div>

                                    {isWinner && (
                                        <div 
                                            className="absolute inset-0 opacity-10 pointer-events-none"
                                            style={{ background: 'linear-gradient(90deg, transparent, var(--monet-primary))' }}
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </LayoutGroup>
                
                {candidates.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs uppercase tracking-wider">
                        No Data Received
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveCanvassing;