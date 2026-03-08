import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
    CaretLeft,
    SealCheck,
    ChartBar,
    Table,
    Circle,
    TrendUp,
    Printer
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

    // Use embedded parent data for tie-breakers if available, otherwise we'll fetch
    const [parentElection, setParentElection] = useState(election.isTieBreaker && election.parentData ? election.parentData : null);

    useEffect(() => {
        if (!election?.id) return;
        const unsub = electionService.getLiveResults(election.id, (data) => {
            setResults(data.tally);
            setTotalVotesCast(data.totalVotes);
        });
        return () => unsub();
    }, [election]);

    // Fallback fetch for older tie-breakers that don't have parentData embedded
    useEffect(() => {
        const fetchParentFallback = async () => {
            // Only fetch if it's a tie breaker, doesn't have embedded data, but has a parent ID reference
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
        // Color palette for candidate avatars
        const avatarColors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#4f46e5'];

        try {
            // 1. Fetch Tie-Breaker data if it exists (for backward compatibility if run from older parents)
            let tbData = null;
            if (election.tieBreakerId) {
                const tbSnap = await getDoc(doc(db, 'elections', election.tieBreakerId));
                if (tbSnap.exists()) tbData = tbSnap.data();
            }

            // 1.5 Fetch Parent data if this IS a tie-breaker election
            let parentData = null;
            if (election.isTieBreaker) {
                if (election.parentData) {
                    parentData = election.parentData;
                } else if (election.parentElectionId) {
                    // Fallback for older tie-breaker documents that didn't embed parentData
                    const parentSnap = await getDoc(doc(db, 'elections', election.parentElectionId));
                    if (parentSnap.exists()) parentData = parentSnap.data();
                }
            }

            const baseElection = parentData ? parentData : election;
            const baseResults = parentData ? (parentData.results || parentData.tally || parentData.liveResults || {}) : results;
            const actualTbData = parentData ? election : tbData;

            // 2. Helper to build a position's HTML table
            const buildPositionTable = (posTitle, candidates, tallyData, titlePrefix = '') => {
                const posResults = tallyData[posTitle] || {};
                const totalPosVotes = Object.values(posResults).reduce((a, b) => a + b, 0);
                const sorted = candidates
                    .map(c => ({ name: c.name, votes: posResults[c.name] || 0 }))
                    .sort((a, b) => b.votes - a.votes);

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
                                <div style="width:34px;height:34px;border-radius:10px;background:${typeof avatarBg === 'string' && avatarBg.startsWith('linear') ? avatarBg : avatarBg};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;${isWinner ? 'box-shadow:0 2px 8px rgba(245,158,11,0.25);' : ''}">${c.name.charAt(0).toUpperCase()}</div>
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
                            <h3 style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0f172a;margin:0;flex:1;">${titlePrefix} ${posTitle}</h3>
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

            // 3. Build position sections
            let positionSections = '';
            baseElection.positions.forEach(pos => {
                const isTiedPosition = baseElection.tiedPositions?.includes(pos.title);
                const prefix1 = (isTiedPosition && actualTbData) ? 'Round 1: ' : '';
                positionSections += buildPositionTable(pos.title, pos.candidates, baseResults, prefix1);

                // If this position was tied and we have actualTbData, show Round 2
                if (actualTbData && isTiedPosition) {
                    const tbPos = actualTbData.positions.find(p => p.title === pos.title);
                    if (tbPos) {
                        const tbTally = actualTbData.tally || actualTbData.results || actualTbData.liveResults || {};
                        positionSections += buildPositionTable(pos.title, tbPos.candidates, tbTally, '⚡ Round 2 (Tie-Breaker): ');
                    }
                }
            });

            // --- Winners summary ---
            const winnersList = baseElection.positions.map(pos => {
                let posResults = baseResults[pos.title] || {};
                let isTiedPosition = false;

                if (actualTbData && baseElection.tiedPositions?.includes(pos.title)) {
                    // Use tie-breaker results for this position
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
                    isTieBreaker: isTiedPosition
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
                                ${w.isTieBreaker ? `<div style="font-size:8px;font-weight:800;color:#d97706;background:#fef3c7;padding:3px 8px;border-radius:99px;border:1px solid #fde68a;">⚡ TIE-BREAKER</div>` : ''}
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

            const targetLabel = election.targetType === 'grade' ? `Grade ${election.targetGrade} Students` : 'Entire Student Body';
            const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const startDate = election.startDate ? new Date(election.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const endDate = election.endDate ? new Date(election.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

            const html = `<!DOCTYPE html>
<html><head><title>Election Report — ${election.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
    @page { margin: 16mm; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: #1e293b; line-height: 1.6; background: #fff; }
    @media print { .no-print { display: none !important; } }
    @media screen {
        body { padding: 40px; background: #f1f5f9; }
        .report-container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.06); padding: 0; overflow: hidden; }
    }
</style>
</head><body>
<div class="report-container">

    <!-- ===== HEADER ===== -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%);padding:40px 44px 36px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;right:0;width:220px;height:220px;background:linear-gradient(135deg,rgba(59,130,246,0.12),transparent);border-radius:0 0 0 220px;"></div>
        <div style="position:absolute;bottom:-2px;left:0;right:0;height:4px;background:linear-gradient(90deg,#3b82f6,#06b6d4,#8b5cf6);"></div>
        <div style="position:relative;z-index:1;">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:4px;color:#64748b;margin-bottom:12px;">Official Election Report</div>
            <h1 style="font-size:30px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;margin-bottom:6px;">${election.title}</h1>
            <div style="font-size:13px;color:#94a3b8;font-weight:500;">${election.organization}</div>
            <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap;">
                <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 14px;border-radius:99px;font-size:10px;font-weight:700;${election.status === 'completed' ? 'background:rgba(34,197,94,0.15);color:#4ade80;' : 'background:rgba(251,146,60,0.15);color:#fb923c;'}">${election.status === 'completed' ? '● Finalized' : '● In Progress'}</span>
                <span style="display:inline-flex;align-items:center;padding:5px 14px;border-radius:99px;font-size:10px;font-weight:600;background:rgba(255,255,255,0.08);color:#cbd5e1;">${targetLabel}</span>
            </div>
        </div>
    </div>

    <!-- ===== BODY ===== -->
    <div style="padding:32px 44px 44px;">

    <!-- Stats Row -->
    <div style="display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:14px;padding:20px;text-align:center;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#0284c7;font-weight:700;margin-bottom:8px;">Total Ballots</div>
            <div style="font-family:'SF Mono','Menlo',Consolas,monospace;font-size:34px;font-weight:900;color:#0c4a6e;letter-spacing:-1px;">${baseElection.totalVotes || totalVotesCast}</div>
        </div>
        <div style="flex:1;min-width:120px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #c4b5fd;border-radius:14px;padding:20px;text-align:center;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;font-weight:700;margin-bottom:8px;">Positions</div>
            <div style="font-family:'SF Mono','Menlo',Consolas,monospace;font-size:34px;font-weight:900;color:#3b0764;letter-spacing:-1px;">${baseElection.positions.length}</div>
        </div>
        <div style="flex:1;min-width:120px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #86efac;border-radius:14px;padding:20px;text-align:center;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#059669;font-weight:700;margin-bottom:8px;">Candidates</div>
            <div style="font-family:'SF Mono','Menlo',Consolas,monospace;font-size:34px;font-weight:900;color:#064e3b;letter-spacing:-1px;">${baseElection.positions.reduce((sum, p) => sum + p.candidates.length, 0)}</div>
        </div>
    </div>

    <!-- Date Cards -->
    <div style="display:flex;gap:12px;margin-bottom:36px;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#16a34a,#22c55e);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(22,163,74,0.2);"><span style="font-size:18px;filter:grayscale(0);">🟢</span></div>
            <div>
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#15803d;font-weight:700;">Voting Opened</div>
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${startDate}</div>
            </div>
        </div>
        <div style="flex:1;min-width:200px;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#dc2626,#ef4444);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(220,38,38,0.2);"><span style="font-size:18px;filter:grayscale(0);">🔴</span></div>
            <div>
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#b91c1c;font-weight:700;">Voting Closed</div>
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${endDate}</div>
            </div>
        </div>
    </div>

    ${winnersSection}

    <!-- Detailed Results -->
    <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
            <div style="font-size:20px;">📊</div>
            <h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:0;">Detailed Results by Position</h2>
        </div>
        ${positionSections}
    </div>

    <!-- Certification -->
    <div style="margin-top:44px;page-break-inside:avoid;border:2px solid #e2e8f0;border-radius:16px;padding:30px 32px;">
        <h3 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#0f172a;margin-bottom:8px;">Certification</h3>
        <p style="font-size:12px;color:#64748b;margin-bottom:28px;line-height:1.7;">We, the undersigned, do hereby certify that the above results are a true and accurate record of the official canvassing conducted for <strong style="color:#0f172a;">${election.title}</strong> under <strong style="color:#0f172a;">${election.organization}</strong>.</p>
        <div style="display:flex;gap:36px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;">
                <div style="border-bottom:2px solid #0f172a;margin-bottom:8px;padding-bottom:44px;"></div>
                <div style="font-size:11px;font-weight:700;color:#0f172a;">Election Committee Chair</div>
                <div style="font-size:9px;color:#94a3b8;margin-top:2px;">Signature over printed name</div>
            </div>
            <div style="flex:1;min-width:200px;">
                <div style="border-bottom:2px solid #0f172a;margin-bottom:8px;padding-bottom:44px;"></div>
                <div style="font-size:11px;font-weight:700;color:#0f172a;">Adviser / Administrator</div>
                <div style="font-size:9px;color:#94a3b8;margin-top:2px;">Signature over printed name</div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;">
        <div>
            <div style="font-size:11px;font-weight:700;color:#0f172a;">SRCS Digital Ecosystem</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">This document was electronically generated. Unauthorized alteration is prohibited.</div>
        </div>
        <div style="text-align:right;">
            <div style="font-family:'SF Mono','Menlo',Consolas,monospace;font-size:11px;font-weight:600;color:#0f172a;">${reportDate}</div>
            <div style="font-family:'SF Mono','Menlo',Consolas,monospace;font-size:10px;color:#94a3b8;">${reportTime}</div>
        </div>
    </div>

    <div style="margin-top:16px;padding:12px 18px;background:linear-gradient(90deg,#f8fafc,#f1f5f9);border-radius:10px;border:1px solid #e2e8f0;">
        <p style="font-size:9px;color:#94a3b8;margin:0;text-align:center;letter-spacing:0.5px;">CONFIDENTIAL — This election report is intended solely for authorized personnel of ${election.organization}. Redistribution or modification without permission is strictly prohibited.</p>
    </div>

    </div>
</div>
</body></html>`;

            // --- Direct PDF export via html2pdf.js ---
            // --- Direct PDF export via html2pdf.js ---
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

            // Execution logic (No need to wrap this in another exportPdf function)
            const filename = `${election.title.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`;

            // Load html2pdf dynamically
            const html2pdfLib = await loadHtml2Pdf();

            // Configure PDF output settings
            const opt = {
                margin: 10,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Check if the app is running as a compiled APK (Android/iOS)
            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                // 📱 NATIVE (APK): Generate base64 and save directly to device storage
                const pdfBase64 = await html2pdfLib().set(opt).from(html).outputPdf('datauristring');

                // Strip the data URI prefix (e.g., "data:application/pdf;base64,")
                const base64Data = pdfBase64.split(',')[1];

                // Write the file to the Android Documents folder
                await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Documents
                });

                alert(`Official report successfully saved to your Documents folder as ${filename}`);
            } else {
                // 💻 DESKTOP/WEB: Trigger standard browser download
                await html2pdfLib().set(opt).from(html).save();
            }

        } catch (err) {
            console.error('Failed to generate or save PDF:', err);
            alert("An error occurred while saving the election report.");
        } finally {
            setIsGenerating(false);
        }
    }; // <-- THIS closes the generateReport function properly!

	return (
	        <div
	            className="w-full font-sans text-slate-900 pb-32"
	            style={monetTheme?.variables || {}}
	        >
	            <div className="max-w-7xl mx-auto rounded-none lg:rounded-[28px] relative">

	                {/* === STICKY FLOATING HEADER === */}
	                <div className="sticky top-[2px] z-40 mx-3 md:mx-6 mb-4 mt-2">
	                    <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-3 md:px-6 md:py-5 rounded-2xl md:rounded-[2rem] shadow-lg shadow-slate-200/20 dark:shadow-none">
	                        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-3 md:gap-6">
                            
	                            {/* Title & Back Button */}
	                            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
	                                <button
	                                    onClick={onBack}
	                                    className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
	                                >
	                                    <CaretLeft weight="bold" size={20} />
	                                </button>

	                                <div className="min-w-0">
	                                    <h1 className="text-sm md:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
	                                        Official Canvassing
	                                    </h1>
	                                    <p className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 md:gap-1.5 uppercase tracking-wider truncate">
	                                        <SealCheck weight="fill" size={14} className="shrink-0" />
	                                        <span className="truncate">{election.title}</span>
	                                    </p>
	                                </div>
	                            </div>

	                            {/* Action Buttons */}
	                            <div className="flex items-center gap-2 shrink-0">
	                                {election.status === 'completed' && (
	                                    <button
	                                        onClick={generateReport}
	                                        disabled={isGenerating}
	                                        className={`flex items-center justify-center w-9 h-9 md:w-auto md:h-auto md:px-5 md:py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all
	                                        ${isGenerating
	                                                ? 'bg-blue-600/70 cursor-wait'
	                                                : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:shadow-blue-500/25 active:scale-[0.97]'
	                                            }`}
	                                    >
	                                        {isGenerating ? (
	                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
	                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
	                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
	                                            </svg>
	                                        ) : (
	                                            <Printer weight="fill" size={18} />
	                                        )}
	                                        <span className="hidden md:inline ml-2">{isGenerating ? 'Preparing...' : 'Generate Report'}</span>
	                                    </button>
	                                )}

	                                {/* Status Chip - Tighter on mobile */}
	                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-full border text-[9px] md:text-[10px] font-bold uppercase tracking-widest
	                             ${election.status === 'completed'
	                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
	                                        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
	                                    }`}
	                                >
	                                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 ${election.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
	                                    <span className="hidden sm:inline">
	                                        {election.status === 'completed' ? 'Finalized' : 'Live'}
	                                    </span>
	                                </div>
	                            </div>
	                        </div>
	                    </div>
	                </div>

	                {/* === MAIN CONTENT CONTAINER === */}
	                <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6 pt-1">
	                    <div className="bg-white/40 dark:bg-slate-950/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-8 lg:p-10 shadow-xl overflow-hidden min-h-[70vh]">

	                        {/* Metric Cards */}
	                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
	                            <MetricCard label="Total Returns" value={totalVotesCast.toLocaleString()} icon={Table} colorTheme="emerald" />
	                            <MetricCard label="Positions" value={election.positions.length} icon={ChartBar} colorTheme="purple" />
	                            <div className="col-span-2 bg-amber-50/50 dark:bg-[#2d2417] border border-amber-100 dark:border-amber-500/20 p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex items-center justify-between relative overflow-hidden">
	                                <div className="relative z-10">
	                                    <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1 opacity-80">Target Electorate</div>
	                                    <div className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
	                                        {election.targetType === 'grade' ? `Grade ${election.targetGrade} Students` : 'Entire Student Body'}
	                                    </div>
	                                </div>
	                                <SealCheck size={40} weight="duotone" className="text-amber-500 opacity-20 absolute -right-3 -bottom-3 rotate-12" />
	                            </div>
	                        </div>

	                        {/* Tally Cards */}
	                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 pb-8 md:pb-12">
	                            {election.positions.map((pos) => {
	                                const posResults = results[pos.title] || {};
	                                const totalVotes = Object.values(posResults).reduce((a, b) => a + b, 0);
	                                const candidates = pos.candidates.sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));

	                                return (
	                                    <OfficialTallyCard
	                                        key={pos.title}
	                                        title={pos.title}
	                                        candidates={candidates}
	                                        posResults={posResults}
	                                        totalVotes={totalVotes}
	                                        isTieBreakerPos={election.isTieBreaker}
	                                        tieBreakerStatus={election.status}
	                                    />
	                                );
	                            })}

	                            {parentElection && parentElection.positions
	                                .map((pos) => {
	                                    const parentResultsObj = parentElection.results || parentElection.tally || parentElection.liveResults || {};
	                                    const posResults = parentResultsObj[pos.title] || {};
	                                    const totalVotes = Object.values(posResults).reduce((a, b) => a + b, 0);
	                                    const candidates = pos.candidates.sort((a, b) => (posResults[b.name] || 0) - (posResults[a.name] || 0));

	                                    return (
	                                        <OfficialTallyCard
	                                            key={`parent-${pos.title}`}
	                                            title={pos.title}
	                                            candidates={candidates}
	                                            posResults={posResults}
	                                            totalVotes={totalVotes}
	                                            isInherited={true}
	                                            isTiedPosition={election.tiedPositions?.includes(pos.title)}
	                                        />
	                                    );
	                                })}
	                        </div>
	                    </div>
	                </div>
	            </div>
	        </div>
	    );
	};

	// --- M3 METRIC CARD ---
	const MetricCard = ({ label, value, icon: Icon, colorTheme }) => {
	    const themes = {
	        emerald: { bg: 'bg-emerald-50 dark:bg-[#132a24] border-emerald-100 dark:border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
	        purple: { bg: 'bg-purple-50 dark:bg-[#251b3d] border-purple-100 dark:border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500' },
	        default: { bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200/50 dark:border-white/10', text: 'text-slate-400 dark:text-slate-500', icon: 'text-slate-200 dark:text-slate-700' }
	    };
	    const theme = themes[colorTheme] || themes.default;

	    return (
	        <div className={`${theme.bg} border p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex items-center justify-between`}>
	            <div>
	                <div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${theme.text} mb-1 opacity-80`}>{label}</div>
	                <div className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tabular-nums">
	                    {value}
	                </div>
	            </div>
	            <div className={`${theme.icon} hidden sm:block`}>
	                <Icon size={32} weight="duotone" />
	            </div>
	        </div>
	    );
	};

	// --- M3 TALLY CARD ---
	const OfficialTallyCard = ({ title, candidates, posResults, totalVotes, isTieBreakerPos, isInherited, tieBreakerStatus, isTiedPosition }) => {
	    return (
	        <div className="bg-white dark:bg-[#1e293b] border border-slate-200/50 dark:border-white/10 rounded-2xl md:rounded-[20px] overflow-hidden hover:shadow-md transition-shadow relative">
            
	            {/* Badges for Tie-Breaker Context - Scaled down for mobile */}
	            {isTieBreakerPos && (
	                <div className="absolute top-0 right-0 z-10">
	                    <div className={`${tieBreakerStatus === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'} text-white text-[8px] md:text-[9px] font-bold uppercase tracking-wider px-2 md:px-3 py-1 rounded-bl-lg md:rounded-bl-xl shadow-sm`}>
	                        {tieBreakerStatus === 'completed' ? 'Round 2 Final' : 'Round 2 Live'}
	                    </div>
	                </div>
	            )}
	            {isInherited && (
	                <div className="absolute top-0 right-0 z-10">
	                    <div className={`${isTiedPosition ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'} border-l border-b border-white dark:border-slate-800 text-[8px] md:text-[9px] font-bold uppercase tracking-wider px-2 md:px-3 py-1 rounded-bl-lg md:rounded-bl-xl shadow-sm`}>
	                        {isTiedPosition ? 'Round 1 (Tied)' : 'Round 1 Final'}
	                    </div>
	                </div>
	            )}

	            {/* M3 Header */}
	            <div className={`bg-slate-50 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center ${isTieBreakerPos ? 'pr-20' : isInherited ? 'pr-24' : ''}`}>
	                <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
	                    {title}
	                </h3>
	                <div className="text-[9px] md:text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-black/20 px-2.5 py-0.5 md:py-1 rounded-full border border-slate-200/50 dark:border-white/5">
	                    <span className="text-slate-900 dark:text-white">{totalVotes}</span> votes
	                </div>
	            </div>

	            {/* Table Header - Adjusted Grid Proportions */}
	            <div className="grid grid-cols-12 px-3 md:px-6 py-2 border-b border-slate-100 dark:border-white/5 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
	                <div className="col-span-1 text-center">#</div>
	                <div className="col-span-7 pl-2">Candidate</div>
	                <div className="col-span-4 text-right">Count</div>
	            </div>

	            {/* Table Rows */}
	            <div>
	                <LayoutGroup>
	                    <AnimatePresence>
	                        {candidates.map((cand, idx) => {
	                            const votes = posResults[cand.name] || 0;
	                            const percent = totalVotes === 0 ? 0 : ((votes / totalVotes) * 100).toFixed(1);

	                            const maxVotes = candidates.length > 0 ? (posResults[candidates[0].name] || 0) : 0;
	                            const hasMaxVotes = votes === maxVotes && votes > 0;
	                            const isTied = hasMaxVotes && candidates.filter(c => (posResults[c.name] || 0) === maxVotes).length > 1;

	                            const isWinner = hasMaxVotes && !isTied;
	                            const isTopResult = hasMaxVotes;
	                            const isRunnerUp = idx === 1 && !hasMaxVotes;

	                            return (
	                                <motion.div
	                                    layout
	                                    key={cand.id}
	                                    initial={{ opacity: 0 }}
	                                    animate={{ opacity: 1 }}
	                                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
	                                    className={`
	                                        relative grid grid-cols-12 items-center px-2 md:px-6 py-3 md:py-4 border-b border-slate-100 dark:border-white/5 last:border-0
	                                        ${isTopResult ? (isTied ? 'bg-amber-600/[0.04]' : 'bg-blue-600/[0.04]') : 'bg-transparent'}
	                                    `}
	                                >
	                                    {/* Rank */}
	                                    <div className="col-span-1 flex justify-center">
	                                        <div className={`
	                                            w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-colors
	                                            ${isTopResult ? (isTied ? 'bg-amber-500 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm') :
	                                                isRunnerUp ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400' :
	                                                    'text-slate-400 dark:text-slate-600'}
	                                        `}>
	                                            {idx + 1}
	                                        </div>
	                                    </div>

	                                    {/* Candidate Info - Expanded to col-span-7 so names don't squish */}
	                                    <div className="col-span-7 pl-2 md:pl-3 flex items-center gap-2 md:gap-3 relative z-10 min-w-0">
	                                        <div className={`shrink-0 w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-[9px] md:text-[10px] font-black ${stringToColor(cand.name)}`}>
	                                            {getInitials(cand.name)}
	                                        </div>
	                                        <div className="min-w-0">
	                                            <h4 className={`text-xs md:text-sm font-bold leading-tight truncate ${isTopResult ? (isTied ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400') : 'text-slate-700 dark:text-slate-200'}`}>
	                                                {cand.name}
	                                            </h4>
	                                            {isWinner && (
	                                                <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-0.5 opacity-80">
	                                                    <SealCheck weight="fill" size={10} className="md:w-3 md:h-3" /> Leading
	                                                </div>
	                                            )}
	                                            {isTied && (
	                                                <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mt-0.5 opacity-80">
	                                                    <SealCheck weight="fill" size={10} className="md:w-3 md:h-3" /> Tied
	                                                </div>
	                                            )}
	                                        </div>
	                                    </div>

	                                    {/* Count & Progress Bar - Reduced to col-span-4 */}
	                                    <div className="col-span-4 relative flex flex-col items-end justify-center pl-1">
	                                        <div className="flex items-baseline gap-1 md:gap-2 mb-1 md:mb-1.5 relative z-10">
	                                            <span className={`font-mono font-bold text-xs md:text-sm tabular-nums ${isTopResult ? (isTied ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400') : 'text-slate-900 dark:text-white'}`}>
	                                                {votes.toLocaleString()}
	                                            </span>
	                                            <span className="text-[8px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 w-6 md:w-8 text-right tabular-nums">
	                                                {percent}%
	                                            </span>
	                                        </div>

	                                        <div className="w-full h-1.5 md:h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
	                                            <motion.div
	                                                initial={{ width: 0 }}
	                                                animate={{ width: `${percent}%` }}
	                                                transition={{ duration: 0.8, ease: "easeOut" }}
	                                                className={`h-full rounded-full ${isTopResult ? (isTied ? 'bg-amber-500' : 'bg-blue-600') : 'bg-slate-300 dark:bg-white/10'}`}
	                                            />
	                                        </div>
	                                    </div>
	                                </motion.div>
	                            );
	                        })}
	                    </AnimatePresence>
	                </LayoutGroup>

	                {candidates.length === 0 && (
	                    <div className="py-6 md:py-8 text-center text-slate-400 dark:text-slate-600 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
	                        No Data Received
	                    </div>
	                )}
	            </div>
	        </div>
	    );
	};

	export default LiveCanvassing;