import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChartPieSlice, X, Printer as PrinterIcon, 
    GraduationCap, Buildings, FilePdf, CheckCircle,
    CalendarBlank, Users, IdentificationCard, ShieldCheck
} from '@phosphor-icons/react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Helper for UI candidate colors
const getCandidateColor = (index) => {
    const colors = [
        'bg-blue-600 text-white',
        'bg-purple-600 text-white',
        'bg-emerald-600 text-white',
        'bg-amber-600 text-white',
        'bg-rose-600 text-white',
        'bg-indigo-600 text-white',
        'bg-cyan-600 text-white',
        'bg-orange-600 text-white',
    ];
    return colors[index % colors.length];
};

const ResultSummaryModal = ({ election, isOpen, onClose }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [parentElection, setParentElection] = useState(election?.isTieBreaker && election?.parentData ? election.parentData : null);

    const results = election?.results || election?.tally || election?.liveResults || {};

    useEffect(() => {
        const fetchParentFallback = async () => {
            if (isOpen && election?.isTieBreaker && !election?.parentData && election?.parentElectionId) {
                try {
                    const snap = await getDoc(doc(db, 'elections', election.parentElectionId));
                    if (snap.exists()) setParentElection({ id: snap.id, ...snap.data() });
                } catch (err) { console.error("Error fetching parent:", err); }
            } else if (!isOpen) {
                setParentElection(null);
            }
        };
        fetchParentFallback();
    }, [election, isOpen]);

    if (!isOpen || !election) return null;

    // --- PDF GENERATION ENGINE (Matched to LiveCanvassing) ---
    const generateReport = async () => {
        setIsGenerating(true);
        const avatarColors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#4f46e5'];

        try {
            let tbData = null;
            if (election.tieBreakerId) {
                const tbSnap = await getDoc(doc(db, 'elections', election.tieBreakerId));
                if (tbSnap.exists()) tbData = tbSnap.data();
            }

            let parentData = null;
            if (election.isTieBreaker) {
                if (election.parentData) {
                    parentData = election.parentData;
                } else if (election.parentElectionId) {
                    const parentSnap = await getDoc(doc(db, 'elections', election.parentElectionId));
                    if (parentSnap.exists()) parentData = parentSnap.data();
                }
            }

            const baseElection = parentData ? parentData : election;
            const baseResults = parentData ? (parentData.results || parentData.tally || parentData.liveResults || {}) : results;
            const actualTbData = parentData ? election : tbData;

            // 2. Helper to build a position's HTML table
            const buildPositionTable = (pos, tallyData, titlePrefix = '') => {
                const posTitle = pos.title;
                const posResults = tallyData[posTitle] || {};
                const totalPosVotes = Object.values(posResults).reduce((a, b) => a + b, 0);
                const sorted = pos.candidates
                    .map(c => ({ name: c.name, votes: posResults[c.name] || 0 }))
                    .sort((a, b) => b.votes - a.votes);

                const targetLabel = pos.targetType === 'grade' ? `GRADE ${pos.targetGrade}` : 'SCHOOL WIDE';

                const rows = sorted.map((c, i) => {
                    const pct = totalPosVotes === 0 ? 0 : ((c.votes / totalPosVotes) * 100);
                    const pctStr = pct.toFixed(1);
                    const isWinner = i === 0 && c.votes > 0 && (!actualTbData || !baseElection.tiedPositions?.includes(posTitle) || titlePrefix.includes('Round 2'));
                    const avatarBg = isWinner ? 'linear-gradient(135deg,#f59e0b,#d97706)' : avatarColors[(i) % avatarColors.length];

                    return `<tr style="${isWinner ? 'background:linear-gradient(90deg,#fffbeb,#ffffff);' : ''}">
                        <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;text-align:center;width:44px;">
                            ${isWinner
                            ? '<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 2px 6px rgba(217,119,6,0.3);">★</div>'
                            : `<span style="color:#cbd5e1;font-weight:700;font-size:12px;">${i + 1}</span>`
                        }
                        </td>
                        <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:34px;height:34px;border-radius:10px;background:${avatarBg};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.name.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style="font-weight:${isWinner ? '700' : '500'};color:#0f172a;font-size:13px;line-height:1.3;">${c.name}</div>
                                    ${isWinner ? '<div style="font-size:9px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1.5px;margin-top:2px;">🏆 Elected</div>' : ''}
                                </div>
                            </div>
                        </td>
                        <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;text-align:center;width:70px;">
                            <div style="font-family:'SF Mono','Menlo',Consolas,monospace;font-weight:700;font-size:15px;color:${isWinner ? '#b45309' : '#0f172a'};">${c.votes}</div>
                        </td>
                        <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;width:200px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="flex:1;height:8px;background:#f1f5f9;border-radius:99px;overflow:hidden;">
                                    <div style="width:${pctStr}%;height:100%;border-radius:99px;background:${isWinner ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#3b82f6,#60a5fa)'};"></div>
                                </div>
                                <span style="font-family:'SF Mono','Menlo',Consolas,monospace;font-size:11px;font-weight:700;color:${isWinner ? '#b45309' : '#64748b'};min-width:40px;text-align:right;">${pctStr}%</span>
                            </div>
                        </td>
                    </tr>`;
                }).join('');

                return `
                    <div style="margin-bottom:32px;page-break-inside:avoid;">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0f172a;">
                            <div style="flex:1;">
                                <h3 style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0f172a;margin:0;">${titlePrefix}${posTitle}</h3>
                                <div style="font-size:9px;font-weight:700;color:#94a3b8;margin-top:2px;">ELIGIBILITY: ${targetLabel}</div>
                            </div>
                            <div style="font-size:10px;font-weight:700;color:#64748b;background:#f1f5f9;padding:4px 14px;border-radius:99px;">${totalPosVotes} votes</div>
                        </div>
                        <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                            <thead>
                                <tr style="background:linear-gradient(90deg,#f8fafc,#f1f5f9);">
                                    <th style="padding:11px 16px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;border-bottom:2px solid #e2e8f0;width:44px;">Rank</th>
                                    <th style="padding:11px 16px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;border-bottom:2px solid #e2e8f0;">Candidate</th>
                                    <th style="padding:11px 16px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;border-bottom:2px solid #e2e8f0;width:70px;">Votes</th>
                                    <th style="padding:11px 16px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;border-bottom:2px solid #e2e8f0;width:200px;">Vote Share</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`;
            };

            let positionSections = '';
            baseElection.positions.forEach(pos => {
                const isTiedPosition = baseElection.tiedPositions?.includes(pos.title);
                const prefix1 = (isTiedPosition && actualTbData) ? 'Round 1: ' : '';
                positionSections += buildPositionTable(pos, baseResults, prefix1);

                if (actualTbData && isTiedPosition) {
                    const tbPos = actualTbData.positions.find(p => p.title === pos.title);
                    if (tbPos) {
                        const tbTally = actualTbData.tally || actualTbData.results || actualTbData.liveResults || {};
                        positionSections += buildPositionTable(tbPos, tbTally, '⚡ Round 2 (Tie-Breaker): ');
                    }
                }
            });

            // --- Winners summary ---
            const winnersList = baseElection.positions.map(pos => {
                let posResults = baseResults[pos.title] || {};
                let isTiedPosition = false;

                if (actualTbData && baseElection.tiedPositions?.includes(pos.title)) {
                    isTiedPosition = true;
                    posResults = actualTbData.tally?.[pos.title] || actualTbData.results?.[pos.title] || actualTbData.liveResults?.[pos.title] || {};
                }

                const sorted = pos.candidates
                    .map(c => ({ name: c.name, votes: posResults[c.name] || 0 }))
                    .sort((a, b) => b.votes - a.votes);
                const winner = sorted[0];

                return winner && winner.votes > 0 ? {
                    position: pos.title,
                    name: winner.name,
                    votes: winner.votes,
                    isTieBreaker: isTiedPosition,
                    target: pos.targetType === 'grade' ? `G${pos.targetGrade}` : 'All'
                } : null;
            }).filter(Boolean);

            const winnersSection = winnersList.length > 0 ? `
            <div style="margin-bottom:36px;page-break-inside:avoid;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <div style="font-size:22px;">🏆</div>
                    <h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:0;">Proclaimed Winners</h2>
                </div>
                <div style="background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 50%,#fff7ed 100%);border:1px solid #fde68a;border-radius:16px;padding:20px 24px;display:flex;flex-wrap:wrap;gap:12px;">
                    ${winnersList.map(w => `
                        <div style="flex:1;min-width:170px;background:#ffffff;border-radius:12px;padding:16px 18px;border:1px solid #fde68a;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#92400e;margin-bottom:6px;">${w.position}</div>
                                <div style="font-size:8px;font-weight:800;color:#64748b;background:#f1f5f9;padding:3px 8px;border-radius:99px;">${w.target}</div>
                            </div>
                            <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2;">${w.name}</div>
                            <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
                                <div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:8px;">✓</div>
                                <span style="font-family:'SF Mono','Menlo',Consolas,monospace;font-size:11px;color:#92400e;font-weight:600;">${w.votes} votes</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

            const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const startDate = election.startDate ? new Date(election.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const endDate = election.endDate ? new Date(election.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

            const html = `<!DOCTYPE html><html><head><title>Election Report — ${election.title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                @page { margin: 16mm; size: A4; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; }
                @media screen { body { padding: 40px; background: #f1f5f9; } .report-container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 20px; box-shadow: 0 12px 48px rgba(0,0,0,0.06); overflow: hidden; } }
            </style>
            </head><body><div class="report-container">
            <div style="background:#0f172a;padding:40px 44px;color:#fff;">
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:4px;color:#64748b;margin-bottom:12px;">Official Election Report</div>
                <h1 style="font-size:30px;font-weight:900;letter-spacing:-0.5px;">${election.title}</h1>
                <div style="font-size:13px;color:#94a3b8;margin-top:4px;">${election.organization}</div>
            </div>
            <div style="padding:32px 44px;">
                <div style="display:flex;gap:12px;margin-bottom:28px;">
                    <div style="flex:1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:20px;text-align:center;">
                        <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#0284c7;font-weight:700;">Total Ballots</div>
                        <div style="font-family:monospace;font-size:34px;font-weight:900;">${baseElection.totalVotes || totalVotesCast}</div>
                    </div>
                    <div style="flex:1;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:14px;padding:20px;text-align:center;">
                        <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;font-weight:700;">Positions</div>
                        <div style="font-family:monospace;font-size:34px;font-weight:900;">${baseElection.positions.length}</div>
                    </div>
                </div>
                ${winnersSection}
                ${positionSections}
            </div></div></body></html>`;

            const loadHtml2Pdf = () => {
                return new Promise((resolve, reject) => {
                    if (window.html2pdf) return resolve(window.html2pdf);
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
                    script.onload = () => resolve(window.html2pdf);
                    script.onerror = () => reject(new Error('Failed to load html2pdf'));
                    document.head.appendChild(script);
                });
            };

            const filename = `${election.title.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`;
            const html2pdfLib = await loadHtml2Pdf();
            const opt = {
                margin: 10,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const isNative = Capacitor.isNativePlatform();
            if (isNative) {
                const pdfBase64 = await html2pdfLib().set(opt).from(html).outputPdf('datauristring');
                const base64Data = pdfBase64.split(',')[1];
                await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Documents
                });
                alert(`Report saved to Documents as ${filename}`);
            } else {
                await html2pdfLib().set(opt).from(html).save();
            }
        } catch (err) {
            console.error(err);
            alert("Error saving report.");
        } finally {
            setIsGenerating(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                className="bg-white dark:bg-[#1c1b1f] w-full sm:max-w-3xl max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#1c1b1f]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                            <ChartPieSlice weight="fill" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Election Summary</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Official Canvassing Record</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors">
                        <X weight="bold" size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-slate-50/50 dark:bg-black/20">
                    
                    {/* Main Stats Card */}
                    <div className="bg-white dark:bg-[#252429] p-8 rounded-[32px] border border-slate-200/60 dark:border-white/5 shadow-sm text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600" />
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{election.title}</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">{election.organization}</p>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100">
                                <Users size={20} weight="duotone" className="mx-auto mb-2 text-blue-600" />
                                <div className="text-[9px] font-black text-slate-400 uppercase">Ballots</div>
                                <div className="text-xl font-black">{election.totalVotes?.toLocaleString() || 0}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100">
                                <IdentificationCard size={20} weight="duotone" className="mx-auto mb-2 text-indigo-600" />
                                <div className="text-[9px] font-black text-slate-400 uppercase">Positions</div>
                                <div className="text-xl font-black">{election.positions?.length || 0}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100">
                                <CalendarBlank size={20} weight="duotone" className="mx-auto mb-2 text-emerald-600" />
                                <div className="text-[9px] font-black text-slate-400 uppercase">Date</div>
                                <div className="text-[11px] font-black mt-1">{new Date(election.endDate).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Positions Grid */}
                    <div className="space-y-10">
                        {election.positions?.map(pos => {
                            const posResults = results[pos.title] || {};
                            const posTotal = Object.values(posResults).reduce((a, b) => a + b, 0);
                            const candidates = [...pos.candidates].sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));

                            return (
                                <div key={pos.title} className="bg-white dark:bg-[#252429] rounded-3xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                        <h3 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">{pos.title}</h3>
                                        {pos.targetType === 'grade' ? (
                                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">GRADE {pos.targetGrade}</span>
                                        ) : (
                                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md">SCHOOL WIDE</span>
                                        )}
                                    </div>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <th className="px-6 py-4">Candidate</th>
                                                <th className="px-6 py-4 text-right">Votes</th>
                                                <th className="px-6 py-4 text-right">%</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                            {candidates.map((cand, idx) => {
                                                const votes = posResults[cand.name] || 0;
                                                const percent = posTotal === 0 ? 0 : ((votes / posTotal) * 100).toFixed(1);
                                                return (
                                                    <tr key={cand.name} className={idx === 0 && votes > 0 ? 'bg-blue-600/[0.03]' : ''}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${getCandidateColor(idx)}`}>
                                                                    {cand.name.charAt(0)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cand.name}</span>
                                                                    {idx === 0 && votes > 0 && <span className="text-[8px] font-black text-blue-600 uppercase flex items-center gap-0.5"><ShieldCheck weight="fill" /> Leading</span>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold">{votes.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">{percent}%</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })}

                        {/* Round 1 History */}
                        {parentElection && (
                            <div className="space-y-6 opacity-60 grayscale-[0.5] transition-all hover:opacity-100 hover:grayscale-0">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Round 1 Archive</span>
                                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                                </div>
                                {parentElection.positions?.map(pos => {
                                    const parentRes = parentElection.results || parentElection.tally || {};
                                    const posResults = parentRes[pos.title] || {};
                                    const candidates = [...pos.candidates].sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));

                                    return (
                                        <div key={`parent-${pos.title}`} className="bg-white dark:bg-[#252429] rounded-3xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                                            <div className="px-6 py-3 bg-slate-100 dark:bg-white/5">
                                                <h4 className="text-[11px] font-black text-slate-500 uppercase">{pos.title}</h4>
                                            </div>
                                            <table className="w-full text-[12px]">
                                                <tbody>
                                                    {candidates.map((cand, idx) => (
                                                        <tr key={cand.name} className="border-t border-slate-50 dark:border-white/5">
                                                            <td className="px-6 py-3 flex items-center gap-3">
                                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black ${getCandidateColor(idx)} opacity-50`}>
                                                                    {cand.name.charAt(0)}
                                                                </div>
                                                                <span className="text-slate-600 dark:text-slate-400 font-bold">{cand.name}</span>
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono text-slate-400">{posResults[cand.name]?.toLocaleString() || 0}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-white/5 flex gap-4 bg-white dark:bg-[#1c1b1f]">
                    <button onClick={onClose} className="flex-1 py-4 font-black text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                        Dismiss
                    </button>
                    <button 
                        onClick={generateReport} 
                        disabled={isGenerating}
                        className="flex-[2] py-4 bg-blue-600 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FilePdf weight="fill" size={20} />}
                        {isGenerating ? 'GENERATING PDF...' : 'EXPORT OFFICIAL RETURN'}
                    </button>
                </div>
            </motion.div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ResultSummaryModal;