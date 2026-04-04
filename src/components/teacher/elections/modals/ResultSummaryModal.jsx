import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CaretLeft, SealCheck, ChartBar, Table, TrendUp,
    Printer, Buildings, GraduationCap, ClockCounterClockwise
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
        'bg-indigo-600 text-white', 'bg-emerald-600 text-white',
        'bg-violet-600 text-white', 'bg-amber-600 text-white',
        'bg-rose-600 text-white', 'bg-cyan-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Helper to reliably extract votes handling BOTH new flat Cloud Functions and old nested live tally
const getVotes = (sourceElection, liveTallyObj, posTitle, candId, candName) => {
    // 1. Cloud Function format (Finalized)
    // Check both ID and Name because server now uses name-based results for robustness
    if (sourceElection?.finalResults) {
        if (sourceElection.finalResults[candId] !== undefined) return sourceElection.finalResults[candId];
        if (sourceElection.finalResults[candName] !== undefined) return sourceElection.finalResults[candName];
    }
    
    // 2. Real-time Live Tally format (Ongoing)
    if (liveTallyObj && liveTallyObj[posTitle] && liveTallyObj[posTitle][candName] !== undefined) {
        return liveTallyObj[posTitle][candName];
    }
    // 3. Old Client-Side fallback
    const legacy = sourceElection?.results || sourceElection?.tally || sourceElection?.liveResults || {};
    if (legacy[posTitle]) {
        if (legacy[posTitle][candName] !== undefined) return legacy[posTitle][candName];
        if (legacy[posTitle][candId] !== undefined) return legacy[posTitle][candId];
    }
    return 0;
};

const ResultSummaryModal = ({ election, onBack }) => {
    if (!election) return null;
    const [liveTally, setLiveTally] = useState(election.results || election.tally || {});
    const [totalVotesCast, setTotalVotesCast] = useState(election.totalVotesCast || election.totalVotes || 0);
    const [isGenerating, setIsGenerating] = useState(false);
    const { monetTheme } = useTheme();

    const [parentElection, setParentElection] = useState(election.isTieBreaker && election.parentData ? election.parentData : null);

    useEffect(() => {
        if (!election?.id || election.status === 'completed' || election.status === 'archived') return;
        
        // Only fetch live real-time updates if the election is still actively running
        const unsub = electionService.getLiveResults(election.id, (data) => {
            setLiveTally(data.tally);
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

    // --- DATA SORTING ENGINE (Splits & Restores Original Hierarchy) ---
    const { finalPositions, archivePositions } = useMemo(() => {
        if (!election) return { finalPositions: [], archivePositions: [] };

        const processPosition = (pos, sourceElection, liveDataObj, isInherited, isTieBreakerPos) => {
            let posTotal = 0;
            const candidatesWithVotes = pos.candidates.map(cand => {
                const votes = getVotes(sourceElection, liveDataObj, pos.title, cand.id, cand.name);
                posTotal += votes;
                return { ...cand, votes };
            }).sort((a, b) => b.votes - a.votes);
            return { ...pos, candidates: candidatesWithVotes, posTotal, isInherited, isTieBreakerPos };
        };

        const finalArr = [];
        const archiveArr = [];

        // Identify definitive order from parent if possible, so Round 2 stays in its "correct" spot
        const baseElection = parentElection || election;
        const masterOrder = baseElection.positions?.map(p => p.title) || [];
        const getOrderIndex = (title) => {
            const idx = masterOrder.indexOf(title);
            return idx === -1 ? 999 : idx; 
        };

        if (election.isTieBreaker && parentElection) {
            // 1. Process parent election positions
            const liveParentTally = parentElection.results || parentElection.tally || parentElection.finalResults || {};
            (parentElection.positions || []).forEach(pos => {
                const processed = processPosition(pos, parentElection, liveParentTally, true, false);
                
                // Determine if this position ended in a tie on the parent round
                const isTiedOnParent = (parentElection.hasTie === true) && (
                    (parentElection.tiedPositions && parentElection.tiedPositions.includes(pos.title)) ||
                    (processed.candidates.length > 1 && processed.candidates[0].votes > 0 && processed.candidates[0].votes === processed.candidates[1].votes)
                );

                if (isTiedOnParent) {
                    archiveArr.push(processed); // Send tied Round 1 to bottom archive
                } else {
                    processed.isInherited = false; // Resolved winner, show at top normally
                    finalArr.push(processed);
                }
            });

            // 2. Process current tie-breaker positions (Round 2/3) and add to the top list
            (election.positions || []).forEach(pos => {
                finalArr.push(processPosition(pos, election, liveTally, false, true));
            });
        } else {
            // Normal election display
            (election.positions || []).forEach(pos => {
                finalArr.push(processPosition(pos, election, liveTally, false, false));
            });
        }

        // Sort both by original form hierarchy
        finalArr.sort((a, b) => getOrderIndex(a.title) - getOrderIndex(b.title));
        archiveArr.sort((a, b) => getOrderIndex(a.title) - getOrderIndex(b.title));

        return { finalPositions: finalArr, archivePositions: archiveArr };
    }, [election, parentElection, liveTally]);


// --- STUNNING CORPORATE A4 PDF GENERATOR ---
    const generateReport = async () => {
        setIsGenerating(true);

        try {
            const buildCorporateTable = (pos, titlePrefix = '', isArchive = false) => {
                const topVote = pos.candidates[0]?.votes || 0;
                const isTied = pos.candidates.length > 1 && pos.candidates[0].votes > 0 && pos.candidates[0].votes === pos.candidates[1].votes;

                const rows = pos.candidates.map((c, i) => {
                    const pct = pos.posTotal === 0 ? 0 : (c.votes / pos.posTotal) * 100;
                    const pctStr = pct.toFixed(1);
                    const isWinner = i === 0 && c.votes > 0 && !isTied && !isArchive;
                    const isThisTied = isTied && c.votes === topVote && c.votes > 0;

                    return `
                        <tr class="${isWinner ? 'winner-row' : ''}">
                            <td class="col-rank">
                                <span class="rank-badge ${isWinner || isThisTied ? 'winner' : ''}">
                                    ${isWinner || isThisTied ? '★' : i + 1}
                                </span>
                            </td>
                            <td class="col-cand">
                                ${c.name}
                                ${isWinner ? '<span class="status-badge elected">Elected</span>' : ''}
                                ${isThisTied ? '<span class="status-badge tied">Tied</span>' : ''}
                            </td>
                            <td class="col-bar">
                                <div class="bar-bg">
                                    <div class="bar-fill ${isWinner || isThisTied ? 'winner' : ''}" style="width: ${pct}%;"></div>
                                </div>
                            </td>
                            <td class="col-pct">${pctStr}%</td>
                            <td class="col-votes">${c.votes.toLocaleString()}</td>
                        </tr>
                    `;
                }).join('');

                return `
                    <div class="position-block ${isArchive ? 'archive-section' : ''}">
                        <div class="pos-title-bar">
                            <h4>${titlePrefix}${pos.title} ${isArchive ? '<span style="font-weight:normal; font-style:italic; color:#94a3b8; text-transform:none;">— Original Tie</span>' : ''}</h4>
                            <span class="pos-scope">${pos.posTotal.toLocaleString()} Valid Votes</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th class="col-rank">Rank</th>
                                    <th class="col-cand">Candidate</th>
                                    <th class="col-bar" colspan="2">Vote Share</th>
                                    <th class="col-votes">Votes</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            };

            // Build Sections dynamically using the pre-sorted engine data
            let positionSections = finalPositions.map(pos => {
                const prefix = pos.isTieBreakerPos ? 'Round 2 (Resolved): ' : '';
                return buildCorporateTable(pos, prefix, false);
            }).join('');

            if (archivePositions.length > 0) {
                positionSections += `
                    <div class="archive-divider">
                        <span>Round 1 Archive (Original Ties)</span>
                    </div>`;
                positionSections += archivePositions.map(pos => {
                    return buildCorporateTable(pos, 'Round 1: ', true);
                }).join('');
            }

            // Extract Winners for the Highlight Grid
            const winnersList = finalPositions.map(pos => {
                const topVote = pos.candidates[0]?.votes || 0;
                const isTied = pos.candidates.length > 1 && pos.candidates[0].votes > 0 && pos.candidates[0].votes === pos.candidates[1].votes;
                
                if (!isTied && topVote > 0) {
                    return `
                        <div class="winner-card">
                            <div class="w-pos">${pos.title} • ${pos.targetType === 'grade' ? `G${pos.targetGrade}` : 'All'}</div>
                            <div class="w-name">${pos.candidates[0].name}</div>
                            <div class="w-votes">${topVote.toLocaleString()} votes</div>
                        </div>
                    `;
                }
                return null;
            }).filter(Boolean);

            const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            const baseElection = parentElection || election;
            const totalBallots = baseElection.totalVotesCast || baseElection.totalVotes || totalVotesCast || 0;

            const html = `<!DOCTYPE html>
            <html>
            <head>
                <title>Official Return — ${election.title}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    @page { margin: 0; size: A4 portrait; }
                    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; line-height: 1.5; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
                    .page-container { padding: 0; margin: 0; width: 100%; }
                    
                    /* Header Banner */
                    .header-banner { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; padding: 40px 50px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #f59e0b; }
                    .header-content h1 { font-size: 22pt; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px; text-transform: uppercase; }
                    .header-content p { margin: 0; color: #a5b4fc; font-size: 11pt; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }
                    .header-badge { background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); text-align: center; }
                    .header-badge span { display: block; font-size: 8pt; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
                    .header-badge strong { font-size: 12pt; color: white; font-family: monospace; }

                    .content-wrapper { padding: 40px 50px; }

                    /* Metrics Grid */
                    .metrics-row { display: flex; gap: 20px; margin-bottom: 35px; }
                    .metric-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; border-top: 4px solid #6366f1; }
                    .metric-card.gold { border-top-color: #f59e0b; background: #fffbeb; border-color: #fde68a; }
                    .metric-label { font-size: 9pt; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 5px; }
                    .metric-value { font-size: 20pt; font-weight: 800; color: #0f172a; font-family: monospace; }

                    /* Proclaimed Winners */
                    .winners-section { margin-bottom: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .winners-header { background: #f8fafc; padding: 15px 25px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; }
                    .winners-header h3 { margin: 0; font-size: 13pt; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                    .winners-grid { display: flex; flex-wrap: wrap; padding: 20px 25px; gap: 15px; }
                    .winner-card { flex: 1; min-width: 200px; background: linear-gradient(to bottom right, #ffffff, #faf5ff); border: 1px solid #e9d5ff; border-radius: 10px; padding: 15px 20px; position: relative; overflow: hidden; }
                    .winner-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #a855f7; }
                    .w-pos { font-size: 8pt; color: #7e22ce; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                    .w-name { font-size: 14pt; font-weight: 800; color: #1e293b; line-height: 1.2; margin-bottom: 8px; }
                    .w-votes { display: inline-block; background: #f3e8ff; color: #6b21a8; font-size: 10pt; font-weight: 700; padding: 4px 10px; border-radius: 99px; }

                    /* Position Tables */
                    .position-block { margin-bottom: 35px; page-break-inside: avoid; }
                    .pos-title-bar { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; }
                    .pos-title-bar h4 { margin: 0; font-size: 13pt; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
                    .pos-scope { font-size: 9pt; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                    
                    table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
                    th { background: #f8fafc; padding: 12px 15px; text-align: left; font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; }
                    td { padding: 12px 15px; font-size: 11pt; border-bottom: 1px solid #f1f5f9; background: #ffffff; vertical-align: middle; }
                    tr:last-child td { border-bottom: none; }
                    
                    .col-rank { width: 50px; text-align: center; }
                    .rank-badge { display: inline-flex; justify-content: center; align-items: center; width: 26px; height: 26px; border-radius: 6px; background: #f1f5f9; color: #64748b; font-weight: 700; font-size: 10pt; }
                    .rank-badge.winner { background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3); }
                    
                    .col-cand { font-weight: 600; color: #1e293b; }
                    .col-votes { text-align: right; font-weight: 800; color: #0f172a; font-family: monospace; font-size: 13pt; width: 90px; }
                    
                    .col-bar { width: 120px; padding-right: 0; }
                    .bar-bg { width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
                    .bar-fill { height: 100%; background: #6366f1; border-radius: 3px; }
                    .bar-fill.winner { background: #f59e0b; }
                    
                    .col-pct { width: 50px; text-align: right; font-weight: 700; color: #64748b; font-size: 9pt; padding-left: 8px; }

                    .winner-row td { background: #fffbeb; }
                    .status-badge { font-size: 7pt; padding: 3px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-left: 8px; vertical-align: middle; }
                    .status-badge.elected { background: #10b981; color: white; }
                    .status-badge.tied { background: #f59e0b; color: white; }

                    .archive-divider { margin: 50px 0 30px; text-align: center; border-top: 2px dashed #cbd5e1; position: relative; }
                    .archive-divider span { background: white; padding: 0 20px; position: relative; top: -10px; font-weight: 800; color: #94a3b8; font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; }
                    .archive-section { opacity: 0.7; filter: grayscale(100%); }

                    /* Signatures */
                    .signatures { margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid; padding: 0 20px; }
                    .sig-box { width: 40%; text-align: center; }
                    .sig-line { border-bottom: 1px solid #94a3b8; height: 50px; margin-bottom: 10px; }
                    .sig-name { font-weight: 800; color: #0f172a; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; }
                    .sig-title { font-size: 9pt; color: #64748b; font-weight: 600; margin-top: 2px; }

                    /* Footer */
                    .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="page-container">
                    
                    <div class="header-banner">
                        <div class="header-content">
                            <h1>Official Election Return</h1>
                            <p>${election.organization || 'Electoral Board'}</p>
                        </div>
                        <div class="header-badge">
                            <span>Status</span>
                            <strong>CERTIFIED</strong>
                        </div>
                    </div>

                    <div class="content-wrapper">
                        <div class="metrics-row">
                            <div class="metric-card gold">
                                <div class="metric-label">Total Ballots Cast</div>
                                <div class="metric-value">${totalBallots.toLocaleString()}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Positions Contested</div>
                                <div class="metric-value">${baseElection.positions.length}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Date Generated</div>
                                <div class="metric-value" style="font-size: 14pt; line-height: 1.4; font-family: 'Inter', sans-serif;">${reportDate}</div>
                            </div>
                        </div>

                        ${winnersList.length > 0 ? `
                        <div class="winners-section">
                            <div class="winners-header">
                                <h3 style="margin:0;">🏆 Proclaimed Winners Summary</h3>
                            </div>
                            <div class="winners-grid">${winnersList.join('')}</div>
                        </div>
                        ` : ''}
                        
                        ${positionSections}
                        
                        <div class="signatures">
                            <div class="sig-box">
                                <div class="sig-line"></div>
                                <div class="sig-name">System Administrator</div>
                                <div class="sig-title">Prepared By / Canvasser</div>
                            </div>
                            <div class="sig-box">
                                <div class="sig-line"></div>
                                <div class="sig-name">Electoral Board</div>
                                <div class="sig-title">Certified Correct By</div>
                            </div>
                        </div>

                        <div class="footer">
                            Document Generated Securely via Automated Canvassing System • ID: ${election.id}
                        </div>
                    </div>
                </div>
            </body>
            </html>`;

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

            const filename = `OFFICIAL_RETURN_${election.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            const html2pdfLib = await loadHtml2Pdf();
            
            // Note: Removed margin from config because CSS @page and .page-container handle it better
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
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
        <div className="w-full font-sans text-slate-900 dark:text-white pb-32" style={monetTheme?.variables || {}}>
            <div className="max-w-7xl mx-auto relative">

                {/* === STICKY HEADER === */}
                <div className="sticky top-0 z-40 mx-3 md:mx-6 mb-4 mt-2">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-3 md:px-6 md:py-4 rounded-2xl shadow-lg shadow-slate-200/30 dark:shadow-none">
                        <div className="flex items-center justify-between gap-2 md:gap-4">
                            {/* Back + Title */}
                            <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0">
                                <button
                                    onClick={onBack}
                                    className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors active:scale-95"
                                >
                                    <CaretLeft weight="bold" size={20} />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <SealCheck weight="fill" size={13} className="text-indigo-500 shrink-0" />
                                        <p className="text-[10px] md:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate">
                                            {election.title}
                                        </p>
                                    </div>
                                    <h1 className="text-sm md:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                                        Official Canvassing
                                    </h1>
                                </div>
                            </div>

                            {/* Right actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                {(election.status === 'completed' || election.status === 'archived') && (
                                    <button
                                        onClick={generateReport}
                                        disabled={isGenerating}
                                        className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-white text-xs font-bold transition-all active:scale-95 ${
                                            isGenerating
                                                ? 'bg-slate-800 cursor-wait'
                                                : 'bg-slate-900 shadow-md hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
                                        }`}
                                    >
                                        {isGenerating
                                            ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                            : <Printer weight="bold" size={16} />
                                        }
                                        <span className="hidden sm:inline">{isGenerating ? 'Preparing...' : 'Print Return'}</span>
                                    </button>
                                )}

                                <div className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest ${
                                    (election.status === 'completed' || election.status === 'archived')
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                                }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                        (election.status === 'completed' || election.status === 'archived') ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                                    }`} />
                                    <span>{(election.status === 'completed' || election.status === 'archived') ? 'Finalized' : 'Live'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === MAIN BODY === */}
                <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6">
                    <div className="space-y-4 md:space-y-6">

                        {/* METRICS GRID */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricCard label="Total Ballots" value={totalVotesCast.toLocaleString()} icon={Table} colorTheme="emerald" />
                            <MetricCard label="Positions" value={election.positions.length} icon={ChartBar} colorTheme="purple" />
                            <div className="col-span-2 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/10 border border-indigo-100 dark:border-indigo-800/50 p-4 md:p-5 rounded-xl flex items-center justify-between relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Electorate Scope</div>
                                    <div className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <Buildings size={17} weight="duotone" className="text-indigo-400" />
                                        Position-Specific Eligibility
                                    </div>
                                </div>
                                <TrendUp size={40} className="text-indigo-300 dark:text-indigo-600 opacity-30 absolute -right-2 -bottom-2" />
                            </div>
                        </div>

                        {/* TALLY CARDS (FINAL POSITIONS) */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5 pb-6">
                            {finalPositions.map(pos => (
                                <OfficialTallyCard
                                    key={`final-${pos.title}`}
                                    title={pos.title}
                                    candidates={pos.candidates}
                                    totalVotes={pos.posTotal}
                                    isTieBreakerPos={pos.isTieBreakerPos}
                                    isInherited={pos.isInherited} 
                                    targetType={pos.targetType}
                                    targetGrade={pos.targetGrade}
                                />
                            ))}
                        </div>

                        {/* TALLY CARDS (ROUND 1 ARCHIVE) */}
                        {archivePositions.length > 0 && (
                            <div className="mt-4 md:mt-8 pt-6 md:pt-8 border-t border-dashed border-slate-300 dark:border-slate-700 pb-12">
                                <div className="flex items-center gap-2 mb-6 text-slate-500 dark:text-slate-400">
                                    <ClockCounterClockwise size={18} weight="bold" />
                                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-widest">
                                        Round 1 Archive (Original Ties)
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300">
                                    {archivePositions.map(pos => (
                                        <OfficialTallyCard
                                            key={`archive-${pos.title}`}
                                            title={pos.title}
                                            candidates={pos.candidates}
                                            totalVotes={pos.posTotal}
                                            isTieBreakerPos={false}
                                            isInherited={true}
                                            targetType={pos.targetType}
                                            targetGrade={pos.targetGrade}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, icon: Icon, colorTheme }) => {
    const themes = {
        emerald: {
            bg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/15 dark:to-green-900/10 border-emerald-100 dark:border-emerald-800/50',
            text: 'text-emerald-700 dark:text-emerald-400',
            icon: 'text-emerald-500 dark:text-emerald-400'
        },
        purple: {
            bg: 'bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/15 dark:to-indigo-900/10 border-violet-100 dark:border-violet-800/50',
            text: 'text-violet-700 dark:text-violet-400',
            icon: 'text-violet-500 dark:text-violet-400'
        }
    };
    const theme = themes[colorTheme] || { bg: 'bg-slate-50 border-slate-100 dark:border-slate-700', text: 'text-slate-600', icon: 'text-slate-400' };
    return (
        <div className={`${theme.bg} border p-4 md:p-5 rounded-xl flex items-center justify-between relative overflow-hidden`}>
            <div className="relative z-10">
                <div className={`text-[10px] font-black uppercase tracking-widest ${theme.text} mb-1 opacity-80`}>{label}</div>
                <div className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tabular-nums">{value}</div>
            </div>
            <Icon size={36} weight="duotone" className={`${theme.icon} opacity-25 absolute -right-2 -bottom-2`} />
        </div>
    );
};

const OfficialTallyCard = ({ title, candidates, totalVotes, isTieBreakerPos, isInherited, targetType, targetGrade }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative shadow-sm hover:shadow-md dark:shadow-none transition-shadow">
            {isTieBreakerPos && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl z-20 tracking-wider">Round 2</div>}
            {isInherited && <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl z-20 tracking-wider">Round 1</div>}

            {/* Card Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-800/40 px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 truncate">{title}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            {targetType === 'grade' ? (
                                <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                                    <GraduationCap weight="fill" size={10} /> Grade {targetGrade} Only
                                </span>
                            ) : (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                    <Buildings weight="fill" size={10} /> School Wide
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums">
                        {totalVotes.toLocaleString()} votes
                    </div>
                </div>
            </div>

            {/* Candidate Rows */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800/80">
                {(() => {
                    const maxVotes = candidates.length > 0 ? candidates[0].votes : 0;
                    const tiedCandidatesCount = candidates.filter(c => c.votes === maxVotes).length;

                    return candidates.map((cand, idx) => {
                        const votes = cand.votes;
                        const percent = totalVotes === 0 ? 0 : ((votes / totalVotes) * 100).toFixed(1);
                        const isTop = votes > 0 && votes === maxVotes;
                        const isTied = isTop && tiedCandidatesCount > 1;
                        
                        // If it's an inherited archive card, we don't declare a "Leader/Elected" since it failed
                        const isLeading = isTop && !isTied && !isInherited; 

                        return (
                            <div key={cand.id} className={`px-4 sm:px-5 py-3.5 transition-colors ${(isLeading || (isTied && !isInherited)) ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''}`}>
                                <div className="flex items-center gap-3">
                                    {/* Rank badge */}
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                        (isLeading || (isTied && !isInherited))
                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-400/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        {(isLeading || (isTied && !isInherited)) ? '★' : idx + 1}
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${stringToColor(cand.name)}`}>
                                        {getInitials(cand.name)}
                                    </div>

                                    {/* Name + bar */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="min-w-0">
                                                <span className={`text-xs sm:text-sm font-bold truncate block ${
                                                    (isLeading || (isTied && !isInherited)) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'
                                                }`}>{cand.name}</span>
                                                {(isLeading || (isTied && !isInherited)) && (
                                                    <span className={`text-[9px] font-black ${isTied ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-500 dark:text-indigo-400'} uppercase flex items-center gap-0.5`}>
                                                        <SealCheck weight="fill" size={10} /> {isTied ? 'Tied' : 'Leading'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-1.5 shrink-0">
                                                <span className={`font-mono font-black text-sm sm:text-base ${
                                                    (isLeading || (isTied && !isInherited)) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'
                                                }`}>{votes.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{percent}%</span>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent}%` }}
                                                transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.05 }}
                                                className={`h-full rounded-full ${
                                                    (isLeading || (isTied && !isInherited))
                                                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                                                        : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
};

export default ResultSummaryModal;