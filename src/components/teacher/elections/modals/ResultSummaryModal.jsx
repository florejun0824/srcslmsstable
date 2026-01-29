import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChartPieSlice, X, Printer } from '@phosphor-icons/react';

const ResultSummaryModal = ({ election, isOpen, onClose }) => {
    if (!isOpen || !election) return null;

    const handlePrint = () => {
        const printContent = document.getElementById('printable-area').innerHTML;
        const originalContents = document.body.innerHTML;
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); 
    };

    const results = election.results || {};
    const totalVotes = election.totalVotes || 0;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
            <motion.div 
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-[2rem] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <ChartPieSlice className="text-purple-500" weight="fill" /> Election Summary
                    </h2>
                    <button onClick={onClose} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm"><X weight="bold" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8" id="printable-area">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-black">{election.title}</h1>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{election.organization}</p>
                        <p className="text-xs text-gray-400 mt-2">Official Election Return • {new Date(election.endDate).toLocaleDateString()}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-gray-50 rounded-xl text-center border">
                            <div className="text-xs font-bold text-gray-400 uppercase">Total Votes</div>
                            <div className="text-2xl font-black text-black">{totalVotes}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl text-center border">
                            <div className="text-xs font-bold text-gray-400 uppercase">Positions</div>
                            <div className="text-2xl font-black text-black">{election.positions?.length || 0}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl text-center border">
                            <div className="text-xs font-bold text-gray-400 uppercase">Audience</div>
                            <div className="text-sm font-bold text-black pt-1.5">{election.targetType === 'grade' ? `Grade ${election.targetGrade}` : 'All Students'}</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {election.positions?.map(pos => {
                             const posResults = results[pos.title] || {};
                             const candidates = pos.candidates.sort((a,b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));
                             return (
                                 <div key={pos.id} className="mb-6 break-inside-avoid">
                                     <h3 className="text-sm font-black text-white bg-black px-3 py-1.5 inline-block rounded uppercase tracking-wide mb-3">{pos.title}</h3>
                                     <table className="w-full text-sm">
                                         <thead>
                                             <tr className="border-b-2 border-gray-200">
                                                 <th className="text-left py-2 text-gray-500 font-bold uppercase text-xs">Candidate</th>
                                                 <th className="text-right py-2 text-gray-500 font-bold uppercase text-xs">Votes</th>
                                                 <th className="text-right py-2 text-gray-500 font-bold uppercase text-xs">%</th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {candidates.map((cand, idx) => {
                                                 const votes = posResults[cand.name] || 0;
                                                 const percent = totalVotes === 0 ? 0 : ((votes / totalVotes) * 100).toFixed(1);
                                                 return (
                                                     <tr key={cand.id} className={`border-b border-gray-100 ${idx === 0 ? 'font-bold bg-yellow-50/50' : ''}`}>
                                                         <td className="py-2.5 text-black flex items-center gap-2">
                                                             {idx === 0 && <span>🏆</span>} {cand.name}
                                                         </td>
                                                         <td className="py-2.5 text-right text-black">{votes}</td>
                                                         <td className="py-2.5 text-right text-gray-600">{percent}%</td>
                                                     </tr>
                                                 )
                                             })}
                                         </tbody>
                                     </table>
                                 </div>
                             )
                        })}
                    </div>
                    
                    <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                        <span>Generated via SRCS Digital Ecosystem</span>
                        <span>{new Date().toLocaleString()}</span>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Close</button>
                    <button onClick={handlePrint} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition">
                        <Printer weight="fill" className="w-4 h-4" /> Print / Save PDF
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ResultSummaryModal;