import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChartPieSlice, X, Printer as PrinterIcon } from '@phosphor-icons/react';
import { Printer } from '@capgo/capacitor-printer';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';

const ResultSummaryModal = ({ election, isOpen, onClose }) => {
    // Use embedded parent data for tie-breakers if available, otherwise we'll fetch
    const [parentElection, setParentElection] = useState(election?.isTieBreaker && election?.parentData ? election.parentData : null);

    useEffect(() => {
        const fetchParentFallback = async () => {
            if (isOpen && election?.isTieBreaker && !election?.parentData && election?.parentElectionId) {
                try {
                    const snap = await getDoc(doc(db, 'elections', election.parentElectionId));
                    if (snap.exists()) {
                        setParentElection({ id: snap.id, ...snap.data() });
                    }
                } catch (err) {
                    console.error("Error fetching parent election:", err);
                }
            } else if (!isOpen) {
                // Reset state when closed
                setParentElection(null);
            } else if (isOpen && election?.parentData) {
                // Set to embedded data if opened
                setParentElection(election.parentData);
            }
        };
        fetchParentFallback();
    }, [election, isOpen]);

    if (!isOpen || !election) return null;

    const handlePrint = async () => {
        const printContent = document.getElementById('printable-area').innerHTML;

        // Wrap the React HTML in a standard document for the Android Spooler
        const htmlString = `
	    <!DOCTYPE html>
	    <html>
	      <head>
	        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
	        <style>
	          body { font-family: sans-serif; color: #000; padding: 20px; }
	          .text-center { text-align: center; }
	          .font-bold { font-weight: bold; }
	          .text-2xl { font-size: 1.5rem; }
	          .text-sm { font-size: 0.875rem; }
	          .mb-8 { margin-bottom: 2rem; }
	          .border-b-2 { border-bottom: 2px solid #000; padding-bottom: 1rem; }
          
	          /* Table styling fallback */
	          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
	          th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
	          th { background-color: #f8fafc; text-transform: uppercase; font-size: 12px; color: #64748b; }
          
	          /* Hide irrelevant mobile UI elements from the print */
	          button, .bg-slate-300 { display: none !important; }
	        </style>
	      </head>
	      <body>
	        ${printContent}
	      </body>
	    </html>
	    `;

        try {
            await Printer.print({
                content: htmlString,
                name: `${election.title} - Official Return`
            });
        } catch (error) {
            console.log('Native printing failed, falling back to web print', error);
            window.print();
        }
    };

    const results = election.results || {};
    const totalVotes = election.totalVotes || 0;

    // We store the modal UI in a variable to pass it to the Portal
    const modalContent = (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col border border-slate-200/50 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* M3 Top App Bar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-slate-300 sm:hidden" />

                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <ChartPieSlice className="text-indigo-600" weight="fill" size={20} />
                    </div>
                    <h2 className="flex-1 text-lg font-semibold text-slate-900 truncate">Election Summary</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <X weight="bold" size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-8" id="printable-area">
                    {/* Print Header */}
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-2xl font-bold uppercase tracking-tight text-black">{election.title}</h1>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{election.organization}</p>
                        <p className="text-xs text-gray-400 mt-2">Official Election Return • {new Date(election.endDate).toLocaleDateString()}</p>
                    </div>

                    {/* M3 Stat Cards */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-[16px] text-center border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Votes</div>
                            <div className="text-2xl font-bold text-black mt-1">{totalVotes}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[16px] text-center border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Positions</div>
                            <div className="text-2xl font-bold text-black mt-1">{election.positions?.length || 0}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[16px] text-center border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Audience</div>
                            <div className="text-sm font-bold text-black mt-2">{election.targetType === 'grade' ? `Grade ${election.targetGrade}` : 'All Students'}</div>
                        </div>
                    </div>

                    {/* Results Tables */}
                    <div className="space-y-6">
                        {election.positions?.map(pos => {
                            const posResults = results[pos.title] || {};
                            const candidates = pos.candidates.sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));
                            return (
                                <div key={pos.title} className="mb-6 break-inside-avoid">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold uppercase tracking-wider mb-3">
                                        Round 2: {pos.title}
                                    </div>
                                    <div className="rounded-[16px] overflow-hidden border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase text-xs tracking-wide">Candidate</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-semibold uppercase text-xs tracking-wide">Votes</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-semibold uppercase text-xs tracking-wide">%</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {candidates.map((cand, idx) => {
                                                    const votes = posResults[cand.name] || 0;
                                                    const percent = totalVotes === 0 ? 0 : ((votes / totalVotes) * 100).toFixed(1);
                                                    return (
                                                        <tr key={cand.id || cand.name} className={`border-t border-slate-100 ${idx === 0 ? 'bg-amber-50/50' : ''}`}>
                                                            <td className="py-3 px-4 text-black flex items-center gap-2">
                                                                {idx === 0 && <span title="Leading / Winner">🏆</span>}
                                                                <span className={idx === 0 ? 'font-semibold' : ''}>{cand.name}</span>
                                                            </td>
                                                            <td className={`py-3 px-4 text-right ${idx === 0 ? 'font-bold text-black' : 'text-slate-700'}`}>{votes}</td>
                                                            <td className="py-3 px-4 text-right text-slate-500">{percent}%</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })}

                        {parentElection && parentElection.positions?.map(pos => {
                            const parentResults = parentElection.results || parentElection.tally || parentElection.liveResults || {};
                            const posResults = parentResults[pos.title] || {};
                            const parentTotalVotes = Object.values(posResults).reduce((a, b) => a + b, 0);
                            const candidates = pos.candidates.sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));

                            return (
                                <div key={`parent-${pos.title}`} className="mb-6 break-inside-avoid">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider mb-3">
                                        Round 1: {pos.title}
                                    </div>
                                    <div className="rounded-[16px] overflow-hidden border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase text-xs tracking-wide">Candidate</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-semibold uppercase text-xs tracking-wide">Votes</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-semibold uppercase text-xs tracking-wide">%</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {candidates.map((cand, idx) => {
                                                    const votes = posResults[cand.name] || 0;
                                                    const percent = parentTotalVotes === 0 ? 0 : ((votes / parentTotalVotes) * 100).toFixed(1);
                                                    return (
                                                        <tr key={cand.id || cand.name} className={`border-t border-slate-100 ${idx === 0 ? 'bg-amber-50/50' : ''}`}>
                                                            <td className="py-3 px-4 text-black flex items-center gap-2">
                                                                {idx === 0 && <span title="Leading / Winner">🏆</span>}
                                                                <span className={idx === 0 ? 'font-semibold' : ''}>{cand.name}</span>
                                                            </td>
                                                            <td className={`py-3 px-4 text-right ${idx === 0 ? 'font-bold text-black' : 'text-slate-700'}`}>{votes}</td>
                                                            <td className="py-3 px-4 text-right text-slate-500">{percent}%</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                        <span>Generated via SRCS Digital Ecosystem</span>
                        <span>{new Date().toLocaleString()}</span>
                    </div>
                </div>

                {/* M3 Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-3 rounded-full font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors active:scale-[0.98]"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-3 rounded-full bg-blue-600 text-white font-semibold text-sm shadow-md flex items-center gap-2 hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        <PrinterIcon weight="fill" className="w-4 h-4" /> Print / Save PDF
                    </button>
                </div>
            </motion.div>
        </div>
    );

    // This renders the modal directly into the body, bypassing all parent z-index issues
    return createPortal(modalContent, document.body);
};

export default ResultSummaryModal;