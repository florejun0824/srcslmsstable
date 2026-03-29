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

const getCandidateColor = (index) => {
    const colors = [
        'bg-indigo-600 text-white',
        'bg-violet-600 text-white',
        'bg-emerald-600 text-white',
        'bg-amber-600 text-white',
        'bg-rose-600 text-white',
        'bg-cyan-600 text-white',
        'bg-orange-600 text-white',
        'bg-pink-600 text-white',
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

    // --- PDF GENERATION ENGINE (unchanged logic) ---
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
                        <div style="font-family:monospace;font-size:34px;font-weight:900;">${baseElection.totalVotes || 0}</div>
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

    const totalVotesCast = election?.totalVotes || 0;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <motion.div
                initial={{ y: "100%", opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="bg-white dark:bg-slate-900 w-full sm:max-w-3xl max-h-[95dvh] sm:max-h-[90dvh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border border-slate-200/50 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                {/* === MODAL HEADER === */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 px-5 sm:px-7 pt-6 pb-5">
                    {/* Decorative circles */}
                    <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
                    <div className="absolute -bottom-6 right-20 w-24 h-24 bg-violet-400/10 rounded-full" />

                    <div className="relative flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                                    <ChartPieSlice weight="fill" size={18} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[3px]">Official Canvassing Record</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight line-clamp-2">{election.title}</h2>
                            <p className="text-indigo-300 text-sm font-medium mt-1 truncate">{election.organization}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
                        >
                            <X weight="bold" size={18} />
                        </button>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-2 sm:gap-3 mt-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10">
                            <Users weight="fill" size={14} className="text-indigo-200" />
                            <span className="text-white font-black tabular-nums text-sm">{election.totalVotes?.toLocaleString() || 0}</span>
                            <span className="text-indigo-300 text-[10px] font-bold">Ballots</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10">
                            <IdentificationCard weight="fill" size={14} className="text-indigo-200" />
                            <span className="text-white font-black tabular-nums text-sm">{election.positions?.length || 0}</span>
                            <span className="text-indigo-300 text-[10px] font-bold">Positions</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10">
                            <CalendarBlank weight="fill" size={14} className="text-indigo-200" />
                            <span className="text-white font-bold text-xs">{new Date(election.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* Winner Summary Cards */}
                    {election.positions?.length > 0 && (
                        <div className="px-5 sm:px-7 pt-5 pb-3">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                Positions Overview
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:gap-5">
                                {election.positions?.map(pos => {
                                    const posResults = results[pos.title] || {};
                                    const posTotal = Object.values(posResults).reduce((a, b) => a + b, 0);
                                    const candidates = [...pos.candidates].sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));
                                    const winner = candidates[0];
                                    const winnerVotes = winner ? (posResults[winner.name] || 0) : 0;
                                    const winnerPct = posTotal === 0 ? 0 : ((winnerVotes / posTotal) * 100).toFixed(1);

                                    return (
                                        <div key={pos.title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                            {/* Position header */}
                                            <div className="flex justify-between items-center px-4 sm:px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                                <h3 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">{pos.title}</h3>
                                                {pos.targetType === 'grade' ? (
                                                    <span className="text-[9px] font-black bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-lg border border-violet-100 dark:border-violet-800/40">Grade {pos.targetGrade}</span>
                                                ) : (
                                                    <span className="text-[9px] font-black bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800/40">School Wide</span>
                                                )}
                                            </div>

                                            {/* Candidate rows */}
                                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {candidates.map((cand, idx) => {
                                                    const votes = posResults[cand.name] || 0;
                                                    const percent = posTotal === 0 ? 0 : ((votes / posTotal) * 100).toFixed(1);
                                                    const isWinner = idx === 0 && votes > 0;
                                                    return (
                                                        <div key={cand.name} className={`px-4 sm:px-5 py-3.5 ${isWinner ? 'bg-amber-50/60 dark:bg-amber-900/5' : ''}`}>
                                                            <div className="flex items-center gap-3">
                                                                {/* Rank */}
                                                                <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                                                    isWinner
                                                                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                                }`}>{isWinner ? '★' : idx + 1}</div>
                                                                {/* Avatar */}
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${getCandidateColor(idx)}`}>
                                                                    {cand.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                {/* Info + bar */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                                        <div className="min-w-0">
                                                                            <span className={`text-sm font-bold block truncate ${
                                                                                isWinner ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'
                                                                            }`}>{cand.name}</span>
                                                                            {isWinner && (
                                                                                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                                                                    <ShieldCheck weight="fill" size={10} /> Winner
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-1 shrink-0">
                                                                            <span className={`font-mono font-black text-sm ${
                                                                                isWinner ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-white'
                                                                            }`}>{votes.toLocaleString()}</span>
                                                                            <span className="text-[10px] text-slate-400 font-bold">{percent}%</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${percent}%` }}
                                                                            transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                                                                            className={`h-full rounded-full ${
                                                                                isWinner
                                                                                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                                                                    : 'bg-slate-300 dark:bg-slate-600'
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Round 1 History */}
                                {parentElection && (
                                    <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-3 px-1">
                                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Round 1 Archive</span>
                                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                        </div>
                                        {parentElection.positions?.map(pos => {
                                            const parentRes = parentElection.results || parentElection.tally || {};
                                            const posResults = parentRes[pos.title] || {};
                                            const candidates = [...pos.candidates].sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));
                                            return (
                                                <div key={`parent-${pos.title}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{pos.title}</h4>
                                                    </div>
                                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {candidates.map((cand, idx) => (
                                                            <div key={cand.name} className="flex items-center gap-3 px-4 py-3">
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${getCandidateColor(idx)} opacity-60`}>
                                                                    {cand.name.charAt(0)}
                                                                </div>
                                                                <span className="flex-1 text-sm text-slate-600 dark:text-slate-400 font-medium">{cand.name}</span>
                                                                <span className="font-mono text-sm text-slate-500 font-bold tabular-nums">{posResults[cand.name]?.toLocaleString() || 0}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-[0.98] border border-slate-200 dark:border-slate-700"
                    >
                        Close
                    </button>
                    <button
                        onClick={generateReport}
                        disabled={isGenerating}
                        className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
                    >
                        {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FilePdf weight="fill" size={18} />}
                        {isGenerating ? 'Generating PDF...' : 'Export Official Return'}
                    </button>
                </div>
            </motion.div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ResultSummaryModal;