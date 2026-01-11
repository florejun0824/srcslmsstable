import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogPanel } from '@tremor/react';
import { useToast } from '../../contexts/ToastContext';
import { motion } from 'framer-motion';
import {
    DocumentChartBarIcon,
    XMarkIcon,
    ChevronDownIcon,
    FunnelIcon,
    CheckIcon
} from '@heroicons/react/24/outline';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

// --- ANIMATION VARIANTS ---
const dropIn = {
    hidden: { y: 20, opacity: 0, scale: 0.98, filter: "blur(4px)" },
    visible: {
        y: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: 0.4, type: "spring", bounce: 0.3 },
    },
    exit: { y: 20, opacity: 0, scale: 0.98, filter: "blur(4px)", transition: { duration: 0.2 } },
};

// --- HELPER: KEY GENERATOR (Moved outside to avoid recreation) ---
const getInstanceKey = (postId, quizId) => `${postId}|${quizId}`;

export default function GenerateReportModal({
    isOpen,
    onClose,
    classData,
    availableQuizzes,
    quizScores,
    lessons,
    units,
    sharedContentPosts,
    className
}) {
    const { showToast } = useToast();
    
    // --- STATE ---
    const [selectedInstances, setSelectedInstances] = useState(new Set());
    const [sortOption, setSortOption] = useState('gender-lastName');
    const [collapsedPosts, setCollapsedPosts] = useState(new Set());
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());
    const [isGenerating, setIsGenerating] = useState(false);

    // Refs for initialization tracking
    const hasInitializedRef = useRef(false);

    // Safe fallbacks
    const students = useMemo(() => classData?.students || [], [classData]);
    const quizzes = useMemo(() => availableQuizzes || [], [availableQuizzes]);
    const scores = useMemo(() => quizScores || [], [quizScores]);
    const unitMap = useMemo(() => units || {}, [units]);
    const posts = useMemo(() => sharedContentPosts || [], [sharedContentPosts]);

    // --- 1. OPTIMIZATION: Memoized Data Transformation ---
    // This prevents recalculating the entire tree on every checkbox click.
    const { postEntries } = useMemo(() => {
        if (!isOpen) return { postEntries: [] };

        const quizzesByPostAndUnit = posts.reduce((acc, post) => {
            const postQuizzes = (post.quizzes || []);
            if (postQuizzes.length === 0) return acc;
            
            if (!acc[post.id]) acc[post.id] = { post: post, units: {} };
            
            postQuizzes.forEach(quizDetails => {
                const unitDisplayName = unitMap[quizDetails.unitId] || 'Uncategorized';
                if (!acc[post.id].units[unitDisplayName]) acc[post.id].units[unitDisplayName] = [];
                acc[post.id].units[unitDisplayName].push({ id: quizDetails.id, title: quizDetails.title });
            });
            return acc;
        }, {});

        const sortedEntries = Object.values(quizzesByPostAndUnit).sort((a, b) => 
            (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0)
        );

        return { postEntries: sortedEntries };
    }, [posts, unitMap, isOpen]);

    // --- 2. OPTIMIZATION: Stable Effects ---
    // Only runs when modal opens or data first loads, not on every minor update.
    useEffect(() => {
        if (isOpen && !hasInitializedRef.current && posts.length > 0) {
            const newCollapsedPosts = new Set();
            const newCollapsedUnits = new Set();
            
            posts.forEach(post => {
                const postQuizzes = (post.quizzes || []);
                if (postQuizzes.length > 0) {
                    newCollapsedPosts.add(post.id); // Default to collapsed
                    postQuizzes.forEach(quiz => {
                        const unitDisplayName = unitMap[quiz.unitId] || 'Uncategorized';
                        newCollapsedUnits.add(`${post.id}_${unitDisplayName}`);
                    });
                }
            });
            
            setCollapsedPosts(newCollapsedPosts);
            setCollapsedUnits(newCollapsedUnits);
            hasInitializedRef.current = true;
        } else if (!isOpen) {
            hasInitializedRef.current = false;
        }
    }, [isOpen, posts, unitMap]);

    // --- 3. HANDLERS ---
    
    const handleInstanceSelection = useCallback((postId, quizId) => {
        const key = getInstanceKey(postId, quizId);
        setSelectedInstances(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    }, []);

    const handleBulkSelection = useCallback((postId, quizIdsInGroup) => {
        // Pre-calculate keys to avoid mapping inside the setter if possible, 
        // but here we need 'prev' state so we map inside or pass data.
        const keys = quizIdsInGroup.map(qId => getInstanceKey(postId, qId));
        
        setSelectedInstances(prev => {
            const allSelected = keys.every(key => prev.has(key));
            const newSet = new Set(prev);
            if (allSelected) {
                keys.forEach(k => newSet.delete(k));
            } else {
                keys.forEach(k => newSet.add(k));
            }
            return newSet;
        });
    }, []);

    const togglePostCollapse = useCallback((postId) => {
        setCollapsedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });
    }, []);

    const toggleUnitCollapse = useCallback((postId, unitDisplayName) => {
        const unitKey = `${postId}_${unitDisplayName}`;
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitKey)) newSet.delete(unitKey);
            else newSet.add(unitKey);
            return newSet;
        });
    }, []);

    const handleClose = () => {
        setSelectedInstances(new Set()); 
        setSortOption('gender-lastName');
        setCollapsedPosts(new Set());
        setCollapsedUnits(new Set());
        hasInitializedRef.current = false;
        onClose();
    };

    const handleGenerate = async () => {
        if (selectedInstances.size === 0) {
            return showToast("Please select at least one quiz.", "error");
        }

        setIsGenerating(true);

        // Dynamically import helper to keep bundle small
        let XLSX;
        try {
            XLSX = await import('xlsx-js-style');
        } catch (error) {
            showToast("Failed to load report generator.", "error");
            setIsGenerating(false);
            return;
        }

        try {
            await generateClassReportExcel({
                XLSX,
                selectedInstances,
                quizzes,
                posts,
                students,
                scores,
                classData,
                sortOption
            });
            
            showToast("Report generated successfully.", "success");
            handleClose();
        } catch (error) {
            console.error("Report Error:", error);
            showToast(`Error: ${error.message}`, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className={className}>
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md transition-opacity" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-end sm:items-center justify-center sm:p-4">
                <DialogPanel as={motion.div}
                    variants={dropIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full h-[100dvh] sm:h-[85vh] sm:max-w-5xl bg-[#fbfbfd] dark:bg-[#1c1c1e] sm:rounded-[28px] flex flex-col overflow-hidden shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:ring-white/10"
                >
                    {/* HEADER */}
                    <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-10 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
                                <DocumentChartBarIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">
                                    Generate Report
                                </h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-tight">Select data to export</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleClose} 
                            className="p-2 rounded-full bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 transition-all text-slate-500 dark:text-slate-400 active:scale-95"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </header>

                    {/* BODY */}
                    <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden p-4 sm:p-6 md:p-8">
                        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 h-full">
                            
                            {/* LEFT COLUMN: SELECTION LIST */}
                            <div className="flex-1 lg:col-span-7 flex flex-col bg-white dark:bg-[#2c2c2e]/50 rounded-[20px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm overflow-hidden min-h-0">
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 backdrop-blur-sm z-10">
                                    <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                        Select Quizzes
                                    </label>
                                    <span className="px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-300">
                                        {quizzes.length} Available
                                    </span>
                                </div>
                                
                                {quizzes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                                            <DocumentChartBarIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No quizzes found</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                                        {postEntries.map(({ post, units: unitsInPost }) => {
                                            const isPostCollapsed = collapsedPosts.has(post.id);
                                            const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                                            const sentDate = post.createdAt?.toDate() ? post.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A';
                                            
                                            // Optimization: Calculate selection state
                                            const allQuizIdsInPost = sortedUnitKeys.flatMap(unitKey => unitsInPost[unitKey].map(q => q.id));
                                            const allInstanceKeysInPost = allQuizIdsInPost.map(qId => getInstanceKey(post.id, qId));
                                            const allSelectedInPost = allInstanceKeysInPost.length > 0 && allInstanceKeysInPost.every(key => selectedInstances.has(key));
                                            const someSelectedInPost = !allSelectedInPost && allInstanceKeysInPost.some(key => selectedInstances.has(key));

                                            return (
                                                <div key={post.id} className="bg-white dark:bg-[#1c1c1e] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden transition-all">
                                                    {/* Post Header */}
                                                    <div 
                                                        className="flex items-center gap-3 p-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                                        onClick={() => togglePostCollapse(post.id)}
                                                    >
                                                        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center pl-1">
                                                             <div 
                                                                className={`w-5 h-5 rounded-[6px] flex items-center justify-center transition-all duration-200 border ${
                                                                    allSelectedInPost || someSelectedInPost 
                                                                    ? 'bg-[#007AFF] border-[#007AFF]' 
                                                                    : 'bg-white dark:bg-white/5 border-slate-300 dark:border-slate-600 group-hover:border-[#007AFF]/50'
                                                                }`}
                                                                onClick={() => handleBulkSelection(post.id, allQuizIdsInPost)}
                                                             >
                                                                {allSelectedInPost && <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                                                {someSelectedInPost && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                                             </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-[13px] text-slate-900 dark:text-white truncate leading-tight">{post.title}</h4>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{sentDate}</p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 transition-transform duration-300 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Units & Quizzes */}
                                                    {!isPostCollapsed && (
                                                        <div className="pl-11 pr-3 pb-3 pt-0 space-y-2">
                                                            <div className="h-px w-full bg-slate-100 dark:bg-white/5 mb-2" />
                                                            {sortedUnitKeys.map(unitDisplayName => {
                                                                const quizzesInUnit = unitsInPost[unitDisplayName] || [];
                                                                const quizIdsInUnit = quizzesInUnit.map(q => q.id);
                                                                const unitInstanceKeys = quizIdsInUnit.map(qId => getInstanceKey(post.id, qId));
                                                                const allSelected = unitInstanceKeys.length > 0 && unitInstanceKeys.every(k => selectedInstances.has(k));
                                                                const someSelected = !allSelected && unitInstanceKeys.some(k => selectedInstances.has(k));
                                                                const unitKey = `${post.id}_${unitDisplayName}`;
                                                                const isUnitCollapsed = collapsedUnits.has(unitKey);

                                                                return (
                                                                    <div key={unitKey}>
                                                                        <div className="flex items-center gap-2 py-1 group/unit cursor-pointer" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                                             <div 
                                                                                className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-all duration-200 border ${
                                                                                    allSelected || someSelected
                                                                                    ? 'bg-[#007AFF] border-[#007AFF]' 
                                                                                    : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover/unit:border-[#007AFF]/50'
                                                                                }`}
                                                                                onClick={(e) => { e.stopPropagation(); handleBulkSelection(post.id, quizIdsInUnit); }}
                                                                             >
                                                                                {allSelected && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                                                                                {someSelected && <div className="w-2 h-0.5 bg-white rounded-full" />}
                                                                             </div>
                                                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate group-hover/unit:text-[#007AFF] transition-colors select-none">{unitDisplayName}</span>
                                                                        </div>
                                                                        
                                                                        {!isUnitCollapsed && (
                                                                            <div className="mt-1 space-y-1 pl-2 ml-2 border-l border-slate-200 dark:border-white/10">
                                                                                {quizzesInUnit.sort((a,b) => a.title.localeCompare(b.title)).map(quiz => {
                                                                                    const instanceKey = getInstanceKey(post.id, quiz.id);
                                                                                    const isSelected = selectedInstances.has(instanceKey);

                                                                                    return (
                                                                                        <div 
                                                                                            key={quiz.id} 
                                                                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 group/item ${isSelected ? 'bg-[#007AFF]/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                                                                            onClick={() => handleInstanceSelection(post.id, quiz.id)}
                                                                                        >
                                                                                            <div className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-200 border ${
                                                                                                isSelected 
                                                                                                ? 'bg-[#007AFF] border-[#007AFF]' 
                                                                                                : 'bg-white dark:bg-white/5 border-slate-300 dark:border-slate-600 group-hover/item:border-[#007AFF]/50'
                                                                                            }`}>
                                                                                                {isSelected && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                                                                                            </div>
                                                                                            <span className={`text-[13px] font-medium truncate select-none ${isSelected ? 'text-[#007AFF]' : 'text-slate-700 dark:text-slate-300'}`}>{quiz.title}</span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            {/* RIGHT COLUMN: OPTIONS */}
                            <div className="flex-shrink-0 lg:col-span-5 flex flex-col gap-4 lg:gap-6">
                                {/* Sorting Card */}
                                <div className="bg-white dark:bg-[#2c2c2e]/50 rounded-[20px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm p-4 lg:p-5">
                                    <div className="flex items-center gap-2 mb-3 lg:mb-4">
                                        <FunnelIcon className="w-4 h-4 text-slate-400" />
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Sort Order</h4>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-black/40 p-1 rounded-xl flex relative z-0 ring-1 ring-black/5 dark:ring-white/5">
                                        {['gender-lastName', 'gender-firstName'].map((option) => (
                                            <button 
                                                key={option}
                                                onClick={() => setSortOption(option)}
                                                className="relative flex-1 py-2 text-[13px] font-semibold rounded-[10px] z-10 transition-colors duration-200 focus:outline-none text-center"
                                            >
                                                {sortOption === option && (
                                                    <motion.div layoutId="segment" className="absolute inset-0 bg-white dark:bg-[#636366] shadow-sm rounded-[10px] -z-10 ring-1 ring-black/5" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                                                )}
                                                <span className={sortOption === option ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400'}>
                                                    {option === 'gender-lastName' ? 'Gender, Last Name' : 'Gender, First Name'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selection Summary */}
                                <div className="hidden sm:flex flex-1 bg-gradient-to-b from-white to-slate-50 dark:from-[#2c2c2e]/50 dark:to-[#1c1c1e]/50 rounded-[20px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm p-6 flex-col justify-center items-center text-center min-h-[160px]">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 ring-4 ring-white dark:ring-[#2c2c2e]">
                                        <span className="text-2xl font-bold text-white tracking-tight font-mono">{selectedInstances.size}</span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Items Selected</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed max-w-[220px]">
                                        {selectedInstances.size > 0 ? 'Ready to generate comprehensive excel report.' : 'Select quizzes from the list to begin.'}
                                    </p>
                                </div>
                                
                                {/* Mobile Compact Summary */}
                                <div className="flex sm:hidden items-center justify-between px-5 py-3 bg-white dark:bg-[#2c2c2e]/50 rounded-[16px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                                            <span className="text-xs font-bold text-white">{selectedInstances.size}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">Items Selected</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        {selectedInstances.size > 0 ? 'Ready' : 'Select'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl flex-shrink-0">
                         <div className="flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                             <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight">
                                Output: Excel (.xlsx)
                            </span>
                         </div>
                        
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button 
                                onClick={handleClose} 
                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-full font-semibold text-[13px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={selectedInstances.size === 0 || isGenerating}
                                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-full font-semibold text-[13px] text-white shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2
                                    ${selectedInstances.size === 0 || isGenerating
                                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none opacity-70'
                                        : 'bg-[#007AFF] hover:bg-[#0062CC] shadow-blue-500/30 hover:shadow-blue-500/40'}`}
                            >
                                {isGenerating && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {isGenerating ? 'Exporting...' : 'Generate Report'}
                            </button>
                        </div>
                    </footer>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

// --- UTILITIES (Moved out to optimize main component render) ---

const customUnitSort = (a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    const numA = parseInt(a.match(/\d+/)?.[0], 10);
    const numB = parseInt(b.match(/\d+/)?.[0], 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return a.localeCompare(b);
};

// --- STATIC STYLES FOR EXCEL (Moved out to prevent garbage collection churn) ---
const BORDER_COLOR = { rgb: "B7B7B7" };
const COMMON_BORDER = {
    top: { style: "thin", color: BORDER_COLOR },
    bottom: { style: "thin", color: BORDER_COLOR },
    left: { style: "thin", color: BORDER_COLOR },
    right: { style: "thin", color: BORDER_COLOR },
};

const STYLES = {
    default: { alignment: { vertical: 'center', horizontal: 'center', wrapText: false }, font: { sz: 12, name: 'Calibri', color: { rgb: "333333" } }, border: COMMON_BORDER },
    leftAlign: { alignment: { vertical: 'center', horizontal: 'left', indent: 1 }, font: { sz: 12, name: 'Calibri', color: { rgb: "333333" } }, border: COMMON_BORDER },
    topHeader: { font: { bold: true, sz: 24, name: 'Calibri', color: { rgb: "1F4E78" } }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "FFFFFF" } } },
    subHeader: { font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: "44546A" } }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "FFFFFF" } }, border: { bottom: { style: "thick", color: { rgb: "1F4E78" } } } },
    sectionTitle: { font: { bold: true, sz: 14, name: 'Calibri', color: { rgb: "FFFFFF" } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 }, fill: { fgColor: { rgb: "44546A" } }, border: COMMON_BORDER },
    tableHeader: { font: { bold: true, sz: 12, name: 'Calibri', color: { rgb: "FFFFFF" } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, fill: { fgColor: { rgb: "1F4E78" } }, border: COMMON_BORDER },
    subTableHeader: { font: { sz: 10, name: 'Calibri', italic: true, color: { rgb: "000000" } }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "D9E1F2" } }, border: COMMON_BORDER },
    grandTotal: { font: { bold: true, sz: 12, name: 'Calibri', color: { rgb: "000000" } }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "E7E6E6" } }, border: { top: { style: "thin", color: BORDER_COLOR }, bottom: { style: "double", color: { rgb: "000000" } }, left: { style: "thin", color: BORDER_COLOR }, right: { style: "thin", color: BORDER_COLOR } } },
    studentName: { alignment: { vertical: 'center', horizontal: 'left', indent: 1 }, font: { sz: 12, name: 'Calibri', bold: true, color: { rgb: "333333" } }, border: COMMON_BORDER, fill: { fgColor: { rgb: "F2F2F2" } } },
    boldScore: { alignment: { vertical: 'center', horizontal: 'center' }, font: { sz: 12, name: 'Calibri', bold: true }, border: COMMON_BORDER }
};

// --- EXCEL GENERATOR FUNCTION (Isolated Logic) ---
const generateClassReportExcel = async ({ XLSX, selectedInstances, quizzes, posts, students, scores, classData, sortOption }) => {
    const selectedKeys = Array.from(selectedInstances);
    const selectedPairs = selectedKeys.map(k => {
        const [pId, qId] = k.split('|');
        return { postId: pId, quizId: qId };
    });

    const uniqueQuizIds = [...new Set(selectedPairs.map(p => p.quizId))];
    const uniqueQuizMap = new Map();
    quizzes.forEach(q => {
        if (uniqueQuizIds.includes(q.id)) {
            if (!uniqueQuizMap.has(q.id)) uniqueQuizMap.set(q.id, q);
        }
    });
    const selectedQuizzes = Array.from(uniqueQuizMap.values());

    const uniquePostIds = [...new Set(selectedPairs.map(p => p.postId))];
    const relevantPosts = posts.filter(p => uniquePostIds.includes(p.id));

    let sortedStudents = [...students];
    sortedStudents.sort((a, b) => {
        const aGender = a.gender || 'Ungrouped';
        const bGender = b.gender || 'Ungrouped';
        const genderOrder = { 'Male': 1, 'Female': 2, 'Ungrouped': 3 };

        if (genderOrder[aGender] !== genderOrder[bGender]) return genderOrder[aGender] - genderOrder[bGender];
        if (sortOption === 'gender-firstName') return (a.firstName || '').localeCompare(b.firstName || '');
        return (a.lastName || '').localeCompare(b.lastName || '');
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([[]]);
    worksheet['!ref'] = 'A1';
    let rowIndex = 0;
    const rowHeights = [];

    const addCell = (row, col, value, style) => {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        worksheet[cellAddress] = { v: value, s: style };
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        range.s.r = Math.min(range.s.r, row);
        range.s.c = Math.min(range.s.c, col);
        range.e.r = Math.max(range.e.r, row);
        range.e.c = Math.max(range.e.c, col);
        worksheet['!ref'] = XLSX.utils.encode_range(range);
    };

    const addRowData = (dataArray, height = 25) => {
        rowHeights[rowIndex] = { hpt: height };
        dataArray.forEach((value, colIndex) => addCell(rowIndex, colIndex, value, STYLES.default));
        rowIndex++;
    };

    const addMergedCell = (startRow, startCol, endRow, endCol, text, style) => {
        worksheet['!merges'] = worksheet['!merges'] || [];
        worksheet['!merges'].push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } });
        addCell(startRow, startCol, text, style);
    };

    // --- REPORT CONSTRUCTION ---
    addRowData([], 15);
    addMergedCell(rowIndex, 0, rowIndex, 12, "San Ramon Catholic School, Inc.", STYLES.topHeader);
    rowHeights[rowIndex] = { hpt: 40 }; rowIndex++;

    addMergedCell(rowIndex, 0, rowIndex, 12, `${classData.name || 'N/A'} - Quiz Report`, STYLES.subHeader);
    rowHeights[rowIndex] = { hpt: 30 }; rowIndex++;

    addRowData([], 15);
    addMergedCell(rowIndex, 0, rowIndex, 12, "Basic Information", STYLES.sectionTitle);
    rowHeights[rowIndex] = { hpt: 25 }; rowIndex++;

    let minDate = null, maxDate = null;
    relevantPosts.forEach(post => {
        if (post.availableFrom?.toDate) {
            const d = post.availableFrom.toDate();
            if (!minDate || d < minDate) minDate = d;
        }
        if (post.availableUntil?.toDate) {
            const d = post.availableUntil.toDate();
            if (!maxDate || d > maxDate) maxDate = d;
        }
    });
    
    let dateRange = 'No specific date range';
    if (minDate && maxDate) dateRange = `${minDate.toLocaleDateString()} – ${maxDate.toLocaleDateString()}`;
    else if (minDate) dateRange = `From ${minDate.toLocaleDateString()}`;

    addCell(rowIndex, 0, `Class: ${classData.name}`, STYLES.leftAlign);
    worksheet['!merges'].push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 3 } });
    rowIndex++;

    addCell(rowIndex, 0, `Reporting Period: ${dateRange}`, STYLES.leftAlign);
    worksheet['!merges'].push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 3 } });
    rowIndex++;

    addRowData([], 20);
    addMergedCell(rowIndex, 0, rowIndex, 6, "Topic Statistics", STYLES.sectionTitle);
    rowIndex++;

    const topicHeaders = ["Quiz Name", "Course", "Avg First Attempt", "Avg Highest Score", "Questions", "Max Score", "Completed By"];
    rowHeights[rowIndex] = { hpt: 30 };
    topicHeaders.forEach((h, i) => addCell(rowIndex, i, h, STYLES.tableHeader));
    rowIndex++;

    let grandTotalQuestions = 0;
    selectedQuizzes.forEach(quiz => {
        const subs = scores.filter(s => s.quizId === quiz.id);
        const firsts = subs.filter(s => s.attemptNumber === 1);
        
        const sumFirst = firsts.reduce((a, b) => a + b.score, 0);
        const sumFirstTotal = firsts.reduce((a, b) => a + b.totalItems, 0);
        const avgFirst = sumFirstTotal > 0 ? `${((sumFirst / sumFirstTotal) * 100).toFixed(2)}%` : '0.00%';

        const distinctHighest = Object.values(subs.reduce((acc, sub) => {
            if (!acc[sub.studentId] || sub.score > acc[sub.studentId].score) acc[sub.studentId] = sub;
            return acc;
        }, {}));

        const sumHigh = distinctHighest.reduce((a, b) => a + b.score, 0);
        const sumHighTotal = distinctHighest.reduce((a, b) => a + b.totalItems, 0);
        const avgHigh = sumHighTotal > 0 ? `${((sumHigh / sumHighTotal) * 100).toFixed(2)}%` : '0.00%';
        
        const qCount = quiz.questions?.length || 0;
        grandTotalQuestions += qCount;

        const row = [quiz.title, quiz.courseName || 'N/A', avgFirst, avgHigh, qCount, qCount, new Set(subs.map(s => s.studentId)).size];
        rowHeights[rowIndex] = { hpt: 25 };
        row.forEach((v, i) => addCell(rowIndex, i, v, (i < 2) ? STYLES.leftAlign : STYLES.default));
        rowIndex++;
    });

    // Totals Row
    addCell(rowIndex, 0, "GRAND TOTAL", STYLES.grandTotal);
    worksheet['!merges'].push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 3 } });
    [1,2,3,6].forEach(c => addCell(rowIndex, c, "", STYLES.grandTotal));
    addCell(rowIndex, 4, grandTotalQuestions, STYLES.grandTotal);
    addCell(rowIndex, 5, grandTotalQuestions, STYLES.grandTotal);
    rowIndex++;

    addRowData([], 25);

    // Student Header Construction
    const headerStart = rowIndex;
    addMergedCell(headerStart, 0, headerStart + 1, 0, "Learner's Name", STYLES.tableHeader);
    addMergedCell(headerStart, 1, headerStart + 1, 1, "Status", STYLES.tableHeader);

    let col = 2;
    selectedQuizzes.forEach(quiz => {
        addMergedCell(headerStart, col, headerStart, col + 3, quiz.title, STYLES.tableHeader);
        col += 4;
    });
    addMergedCell(headerStart, col, headerStart + 1, col, "Total First Attempt", STYLES.tableHeader);
    addMergedCell(headerStart, col + 1, headerStart + 1, col + 1, "Total Highest", STYLES.tableHeader);
    
    rowIndex += 2;
    rowHeights[rowIndex-1] = { hpt: 30 };
    
    // Sub-headers
    let subHeaders = ["", ""];
    selectedQuizzes.forEach(() => subHeaders.push("First Attempt", "% Score", "Highest", "% Score"));
    subHeaders.push("", "");
    subHeaders.forEach((v, c) => { if(v) addCell(rowIndex - 1, c, v, STYLES.subTableHeader); });

    // Student Rows
    let lastGender = null;
    sortedStudents.forEach(student => {
        const gender = student.gender || 'Ungrouped';
        if (sortOption.startsWith('gender') && gender !== lastGender) {
            lastGender = gender;
            addMergedCell(rowIndex, 0, rowIndex, (2 + selectedQuizzes.length * 4 + 2) - 1, `Gender: ${gender}`, STYLES.sectionTitle);
            rowHeights[rowIndex] = { hpt: 25 };
            rowIndex++;
        }

        const hasCompleted = scores.some(s => s.studentId === student.id && uniqueQuizIds.includes(s.quizId));
        const row = [`${student.lastName}, ${student.firstName}`, hasCompleted ? '✓' : ''];
        
        let totalFirst = 0;
        let totalHigh = 0;

        selectedQuizzes.forEach(quiz => {
            const subs = scores.filter(s => s.studentId === student.id && s.quizId === quiz.id);
            const first = subs.find(s => s.attemptNumber === 1);
            const high = subs.reduce((h, c) => (!h || c.score > h.score) ? c : h, null);

            row.push(
                first ? first.score : '-', 
                first ? `${((first.score/first.totalItems)*100).toFixed(2)}%` : '-',
                high ? high.score : '-',
                high ? `${((high.score/high.totalItems)*100).toFixed(2)}%` : '-'
            );

            if (first) totalFirst += first.score;
            if (high) totalHigh += high.score;
        });

        row.push(totalFirst, totalHigh);
        
        rowHeights[rowIndex] = { hpt: 25 };
        row.forEach((v, i) => {
            let s = STYLES.default;
            if (i === 0) s = STYLES.studentName;
            else if (i === row.length - 2) s = STYLES.boldScore;
            addCell(rowIndex, i, v, s);
        });
        rowIndex++;
    });

    worksheet['!rows'] = rowHeights;
    worksheet['!cols'] = [{ wch: 35 }, { wch: 8 }, ...Array(selectedQuizzes.length * 4).fill({ wch: 16 }), { wch: 20 }, { wch: 20 }];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Scores Report");
    const fileName = `${classData.name || 'Class'} - Quiz Report.xlsx`;

    // File Save Logic
    if (Capacitor.isNativePlatform()) {
        let perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') perm = await Filesystem.requestPermissions();
        if (perm.publicStorage !== 'granted') throw new Error("Storage permission required");

        const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const res = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents,
            recursive: true
        });
        await FileOpener.open({ filePath: res.uri, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } else {
        XLSX.writeFile(workbook, fileName);
    }
};