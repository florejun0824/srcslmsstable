import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
    CaretLeft,
    SealCheck,
    ChartBar,
    Table,
    TrendUp,
    Printer,
    Buildings,
    GraduationCap
} from '@phosphor-icons/react';
import { electionService } from '../../../../services/electionService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// --- UTILS ---
const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const stringToColor = (str) => {
    const colors = [
        'bg-blue-600 text-white',
        'bg-emerald-600 text-white',
        'bg-indigo-600 text-white',
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
    const [totalVotesCast, setTotalVotesCast] = useState(election.totalVotes || 0);
    const [isGenerating, setIsGenerating] = useState(false);
    const { monetTheme } = useTheme();

    const [parentElection, setParentElection] = useState(election.isTieBreaker && election.parentData ? election.parentData : null);

    useEffect(() => {
        if (!election?.id) return;
        const unsub = electionService.getLiveResults(election.id, (data) => {
            setResults(data.tally);
            setTotalVotesCast(data.totalVotes);
        });
        return () => unsub();
    }, [election]);

    useEffect(() => {
        const fetchParentFallback = async () => {
            if (election.isTieBreaker && !election.parentData && election.parentElectionId) {
                try {
                    const snap = await getDoc(doc(db, 'elections', election.parentElectionId));
                    if (snap.exists()) {
                        setParentElection({ id: snap.id, ...snap.data() });
                    }
                } catch (err) {
                    console.error("Error fetching parent election:", err);
                }
            }
        };
        fetchParentFallback();
    }, [election]);

    // --- REPORT GENERATOR ---
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

	return (
	        <div className="w-full font-sans text-slate-900 pb-32" style={monetTheme?.variables || {}}>
	            <div className="max-w-7xl mx-auto rounded-none lg:rounded-[28px] relative">
	                <div className="sticky top-[2px] z-40 mx-3 md:mx-6 mb-4 mt-2">
	                    <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-3 md:px-6 md:py-5 rounded-2xl md:rounded-[2rem] shadow-lg">
	                        <div className="max-w-7xl mx-auto flex items-center justify-between">
	                            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
	                                <button onClick={onBack} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors">
	                                    <CaretLeft weight="bold" size={20} />
	                                </button>
	                                <div className="min-w-0">
	                                    <h1 className="text-sm md:text-xl font-bold text-slate-900 dark:text-white truncate">Official Canvassing</h1>
	                                    <p className="text-[10px] md:text-xs font-bold text-blue-600 flex items-center gap-1 uppercase tracking-wider truncate">
	                                        <SealCheck weight="fill" size={14} /> {election.title}
	                                    </p>
	                                </div>
	                            </div>
	                            <div className="flex items-center gap-2 shrink-0">
	                                {election.status === 'completed' && (
	                                    <button onClick={generateReport} disabled={isGenerating} className={`flex items-center px-4 py-2 rounded-xl text-white text-xs font-bold ${isGenerating ? 'bg-blue-400' : 'bg-blue-600 shadow-md active:scale-95'}`}>
	                                        {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Printer weight="fill" size={18} />}
	                                        <span className="hidden md:inline ml-2">{isGenerating ? 'Preparing...' : 'Report'}</span>
	                                    </button>
	                                )}
	                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${election.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
	                                    <div className={`w-1.5 h-1.5 rounded-full ${election.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
	                                    <span>{election.status === 'completed' ? 'Finalized' : 'Live'}</span>
	                                </div>
	                            </div>
	                        </div>
	                    </div>
	                </div>

	                <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6 pt-1">
	                    <div className="bg-white/40 dark:bg-slate-950/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-8 shadow-xl min-h-[70vh]">
	                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
	                            <MetricCard label="Total Returns" value={totalVotesCast.toLocaleString()} icon={Table} colorTheme="emerald" />
	                            <MetricCard label="Positions" value={election.positions.length} icon={ChartBar} colorTheme="purple" />
	                            <div className="col-span-2 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden">
	                                <div className="relative z-10">
	                                    <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Electorate Type</div>
	                                    <div className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                            <Buildings size={18} /> Position-Specific Eligibility
                                        </div>
	                                </div>
	                                <TrendUp size={40} className="text-amber-500 opacity-10 absolute -right-2 -bottom-2" />
	                            </div>
	                        </div>

	                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 pb-12">
	                            {election.positions.map((pos) => (
	                                <OfficialTallyCard
	                                    key={pos.title}
	                                    title={pos.title}
	                                    candidates={pos.candidates.sort((a, b) => (results[pos.title]?.[b.name] || 0) - (results[pos.title]?.[a.name] || 0))}
	                                    posResults={results[pos.title] || {}}
	                                    totalVotes={Object.values(results[pos.title] || {}).reduce((a, b) => a + b, 0)}
	                                    isTieBreakerPos={election.isTieBreaker}
	                                    tieBreakerStatus={election.status}
                                        targetType={pos.targetType}
                                        targetGrade={pos.targetGrade}
	                                />
	                            ))}
	                            {parentElection && parentElection.positions.map((pos) => (
                                    <OfficialTallyCard
                                        key={`parent-${pos.title}`}
                                        title={pos.title}
                                        candidates={pos.candidates.sort((a, b) => ((parentElection.results || {})[pos.title]?.[b.name] || 0) - ((parentElection.results || {})[pos.title]?.[a.name] || 0))}
                                        posResults={(parentElection.results || parentElection.tally || {})[pos.title] || {}}
                                        totalVotes={Object.values((parentElection.results || parentElection.tally || {})[pos.title] || {}).reduce((a, b) => a + b, 0)}
                                        isInherited={true}
                                        isTiedPosition={election.tiedPositions?.includes(pos.title)}
                                        targetType={pos.targetType}
                                        targetGrade={pos.targetGrade}
                                    />
                                ))}
	                        </div>
	                    </div>
	                </div>
	            </div>
	        </div>
	    );
	};

	const MetricCard = ({ label, value, icon: Icon, colorTheme }) => {
	    const themes = {
	        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20', text: 'text-emerald-600', icon: 'text-emerald-500' },
	        purple: { bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20', text: 'text-purple-600', icon: 'text-purple-500' }
	    };
	    const theme = themes[colorTheme] || { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'text-slate-400' };
	    return (
	        <div className={`${theme.bg} border p-4 md:p-5 rounded-2xl flex items-center justify-between`}>
	            <div>
	                <div className={`text-[10px] font-bold uppercase tracking-widest ${theme.text} mb-1 opacity-80`}>{label}</div>
	                <div className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{value}</div>
	            </div>
	            <Icon size={32} weight="duotone" className={`${theme.icon} opacity-50`} />
	        </div>
	    );
	};

	const OfficialTallyCard = ({ title, candidates, posResults, totalVotes, isTieBreakerPos, isInherited, tieBreakerStatus, isTiedPosition, targetType, targetGrade }) => {
	    return (
	        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden relative group">
	            {isTieBreakerPos && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold uppercase px-3 py-1 rounded-bl-xl z-20">Round 2</div>}
	            {isInherited && <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-800 text-[9px] font-bold uppercase px-3 py-1 rounded-bl-xl z-20">Round 1</div>}

	            <div className="bg-slate-50 dark:bg-white/5 px-4 py-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
	                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{title}</h3>
                        <div className="text-[9px] font-bold text-slate-400 bg-white dark:bg-black/20 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">{totalVotes} VOTES</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {targetType === 'grade' ? (
                            <span className="text-[9px] font-bold text-indigo-600 flex items-center gap-1 uppercase bg-indigo-50 px-2 py-0.5 rounded-full"><GraduationCap weight="fill" /> Grade {targetGrade} Only</span>
                        ) : (
                            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase bg-emerald-50 px-2 py-0.5 rounded-full"><Buildings weight="fill" /> School Wide</span>
                        )}
                    </div>
	            </div>

	            <div className="grid grid-cols-12 px-4 py-2 border-b border-slate-100 dark:border-white/5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
	                <div className="col-span-1 text-center">#</div>
	                <div className="col-span-7 pl-2">Candidate</div>
	                <div className="col-span-4 text-right">Count</div>
	            </div>

	            <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {candidates.map((cand, idx) => {
                        const votes = posResults[cand.name] || 0;
                        const percent = totalVotes === 0 ? 0 : ((votes / totalVotes) * 100).toFixed(1);
                        const isLeading = idx === 0 && votes > 0;

                        return (
                            <div key={cand.id} className={`grid grid-cols-12 items-center px-4 py-4 ${isLeading ? 'bg-blue-600/[0.03]' : ''}`}>
                                <div className="col-span-1 flex justify-center text-xs font-bold text-slate-400">{idx + 1}</div>
                                <div className="col-span-7 pl-2 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${stringToColor(cand.name)}`}>{getInitials(cand.name)}</div>
                                    <div className="truncate">
                                        <div className={`text-xs font-bold truncate ${isLeading ? 'text-blue-600' : 'text-slate-700 dark:text-slate-200'}`}>{cand.name}</div>
                                        {isLeading && <div className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-0.5">Leading <SealCheck weight="fill" /></div>}
                                    </div>
                                </div>
                                <div className="col-span-4 flex flex-col items-end">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`font-mono font-bold text-sm ${isLeading ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>{votes.toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{percent}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full mt-1 overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={`h-full ${isLeading ? 'bg-blue-600' : 'bg-slate-300'}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
	            </div>
	        </div>
	    );
	};

export default LiveCanvassing;