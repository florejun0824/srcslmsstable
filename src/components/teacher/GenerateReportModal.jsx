import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Dialog, DialogPanel } from '@tremor/react';
import { useToast } from '../../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DocumentChartBarIcon,
    XMarkIcon,
    FunnelIcon,
    CheckIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

// --- ANIMATION VARIANTS ---
const dropIn = {
    hidden: { y: "100%", opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.4, type: "spring", bounce: 0.1 },
    },
    exit: { y: "100%", opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } },
};

const accordionVariant = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: "auto", opacity: 1, transition: { duration: 0.2 } },
    exit: { height: 0, opacity: 0, transition: { duration: 0.2 } }
};

// --- HELPER: KEY GENERATOR ---
const getInstanceKey = (postId, quizId) => `${postId}|${quizId}`;

// --- MEMOIZED UI COMPONENTS ---

const QuizItem = memo(({ quiz, postId, isSelected, onToggle }) => (
    <div 
        onClick={() => onToggle(postId, quiz.id)}
        className="flex items-center gap-4 pl-12 pr-4 py-3 md:py-3.5 hover:bg-zinc-100 dark:hover:bg-zinc-700/30 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors cursor-pointer"
    >
        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-[2px] transition-colors ${
            isSelected 
                ? 'bg-indigo-600 border-indigo-600' 
                : 'bg-transparent border-zinc-400 dark:border-zinc-500'
        }`}>
            {isSelected && <CheckIcon className="w-4 h-4 text-white stroke-[3]" />}
        </div>
        <span className={`text-sm md:text-base font-medium truncate select-none ${
            isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-700 dark:text-zinc-300'
        }`}>
            {quiz.title}
        </span>
    </div>
));

const SelectAllButton = memo(({ isAllSelected, onClick }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors flex-shrink-0 active:scale-95 ${
            isAllSelected 
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300' 
                : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
        }`}
    >
        {isAllSelected ? 'Deselect All' : 'Select All'}
    </button>
));

// --- MAIN COMPONENT ---

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

    const hasInitializedRef = useRef(false);

    // Safe fallbacks
    const students = useMemo(() => classData?.students || [], [classData]);
    const quizzes = useMemo(() => availableQuizzes || [], [availableQuizzes]);
    const scores = useMemo(() => quizScores || [], [quizScores]);
    const unitMap = useMemo(() => units || {}, [units]);
    const posts = useMemo(() => sharedContentPosts || [], [sharedContentPosts]);

    // --- 1. OPTIMIZATION: Memoized Data Transformation ---
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

    // --- 2. DEFAULT COLLAPSED EFFECT ---
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
                        newCollapsedUnits.add(`${post.id}_${unitDisplayName}`); // Default to collapsed
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
            {/* Reduced Blurring Overlay */}
            <div className="fixed inset-0 bg-black/60 transition-opacity z-[100]" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-end sm:items-center justify-center sm:p-4 md:p-6 z-[100]">
                <DialogPanel as={motion.div}
                    variants={dropIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    // Modal Container: rounded on all corners, fills desktop screen
                    className="w-full h-[95dvh] sm:h-[96vh] sm:max-w-[96vw] lg:max-w-[1400px] bg-zinc-50 dark:bg-[#111318] rounded-[32px] sm:rounded-[36px] flex flex-col overflow-hidden shadow-2xl"
                >
                    {/* GLOBAL HEADER */}
                    <header className="flex items-center justify-between px-6 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6 bg-transparent z-20 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shadow-sm">
                                <DocumentChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                    Generate Class Report
                                </h3>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    {quizzes.length} Quizzes Available
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleClose} 
                            className="p-3 rounded-full bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 transition-colors text-zinc-600 dark:text-zinc-300 active:scale-95"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </header>

                    {/* TWO-COLUMN DESKTOP LAYOUT / STACKED MOBILE */}
                    <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 min-h-0 pt-0 sm:pt-0 lg:pt-0">
                        
                        {/* Mobile Sort Options (only visible on mobile) */}
                        <div className="lg:hidden bg-white dark:bg-[#1A1D24] rounded-[24px] p-4 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <FunnelIcon className="w-4 h-4 text-zinc-500" />
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Sort Students By</h4>
                            </div>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                                {['gender-lastName', 'gender-firstName'].map((option) => (
                                    <button 
                                        key={option}
                                        onClick={() => setSortOption(option)}
                                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                                            sortOption === option 
                                                ? 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:border-indigo-800 dark:text-indigo-200' 
                                                : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800/30 dark:border-zinc-700 dark:text-zinc-400'
                                        }`}
                                    >
                                        {option === 'gender-lastName' ? 'Gender, Last Name' : 'Gender, First Name'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* LEFT: SELECTION LIST (Deeply rounded inner container) */}
                        <div className="flex-1 bg-white dark:bg-[#1A1D24] rounded-[24px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 lg:min-h-0">
                            <div className="flex-1 overflow-y-auto hide-scrollbar">
                                {quizzes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
                                            <DocumentChartBarIcon className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No quizzes found</h3>
                                        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">Quizzes shared in this class will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
                                        {postEntries.map(({ post, units: unitsInPost }) => {
                                            const isPostCollapsed = collapsedPosts.has(post.id);
                                            const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                                            const sentDate = post.createdAt?.toDate() ? post.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
                                            
                                            // Calc Post Selection State
                                            const allQuizIdsInPost = sortedUnitKeys.flatMap(unitKey => unitsInPost[unitKey].map(q => q.id));
                                            const allInstanceKeysInPost = allQuizIdsInPost.map(qId => getInstanceKey(post.id, qId));
                                            const allSelectedInPost = allInstanceKeysInPost.length > 0 && allInstanceKeysInPost.every(key => selectedInstances.has(key));

                                            return (
                                                <div key={post.id} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-[24px] overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50">
                                                    
                                                    {/* Post Header with Explicit Select All Button */}
                                                    <div 
                                                        className="px-4 py-3 sm:px-5 sm:py-4 bg-zinc-100/80 dark:bg-zinc-800/80 flex items-center justify-between cursor-pointer hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-colors"
                                                        onClick={() => togglePostCollapse(post.id)}
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className={`p-1.5 rounded-full transition-transform duration-300 flex-shrink-0 ${isPostCollapsed ? 'bg-transparent -rotate-90' : 'bg-zinc-200 dark:bg-zinc-700 rotate-0'}`}>
                                                                <ChevronDownIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <h4 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight truncate">{post.title}</h4>
                                                                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Shared on {sentDate}</p>
                                                            </div>
                                                        </div>
                                                        <SelectAllButton 
                                                            isAllSelected={allSelectedInPost} 
                                                            onClick={() => handleBulkSelection(post.id, allQuizIdsInPost)} 
                                                        />
                                                    </div>
                                                    
                                                    {/* Units inside Post */}
                                                    <AnimatePresence initial={false}>
                                                        {!isPostCollapsed && (
                                                            <motion.div
                                                                variants={accordionVariant}
                                                                initial="hidden"
                                                                animate="visible"
                                                                exit="exit"
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="pb-2">
                                                                    {sortedUnitKeys.map(unitDisplayName => {
                                                                        const quizzesInUnit = unitsInPost[unitDisplayName] || [];
                                                                        const quizIdsInUnit = quizzesInUnit.map(q => q.id);
                                                                        
                                                                        const unitInstanceKeys = quizIdsInUnit.map(qId => getInstanceKey(post.id, qId));
                                                                        const allSelected = unitInstanceKeys.length > 0 && unitInstanceKeys.every(k => selectedInstances.has(k));
                                                                        const unitKey = `${post.id}_${unitDisplayName}`;
                                                                        const isUnitCollapsed = collapsedUnits.has(unitKey);

                                                                        return (
                                                                            <div key={unitDisplayName} className="flex flex-col border-t border-zinc-200/50 dark:border-zinc-700/50 mt-2 pt-2 first:border-0 first:mt-0 first:pt-0">
                                                                                
                                                                                {/* Unit Header with Explicit Select All Button */}
                                                                                <div 
                                                                                    className="flex items-center justify-between pl-10 pr-4 sm:pr-5 py-2 sm:py-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                                    onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}
                                                                                >
                                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                        <ChevronDownIcon className={`w-4 h-4 text-zinc-400 transition-transform duration-300 flex-shrink-0 ${isUnitCollapsed ? '-rotate-90' : ''}`} />
                                                                                        <span className="text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider select-none truncate">
                                                                                            {unitDisplayName}
                                                                                        </span>
                                                                                    </div>
                                                                                    <SelectAllButton 
                                                                                        isAllSelected={allSelected} 
                                                                                        onClick={() => handleBulkSelection(post.id, quizIdsInUnit)} 
                                                                                    />
                                                                                </div>

                                                                                {/* Quizzes inside Unit */}
                                                                                <AnimatePresence initial={false}>
                                                                                    {!isUnitCollapsed && (
                                                                                        <motion.div
                                                                                            variants={accordionVariant}
                                                                                            initial="hidden"
                                                                                            animate="visible"
                                                                                            exit="exit"
                                                                                            className="overflow-hidden"
                                                                                        >
                                                                                            <div className="divide-y divide-zinc-200/50 dark:divide-zinc-700/50">
                                                                                                {quizzesInUnit.sort((a,b) => a.title.localeCompare(b.title)).map(quiz => (
                                                                                                    <QuizItem 
                                                                                                        key={quiz.id}
                                                                                                        quiz={quiz}
                                                                                                        postId={post.id}
                                                                                                        isSelected={selectedInstances.has(getInstanceKey(post.id, quiz.id))}
                                                                                                        onToggle={handleInstanceSelection}
                                                                                                    />
                                                                                                ))}
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: OPTIONS & SUMMARY (Desktop Only, Rounded inner containers) */}
                        <div className="hidden lg:flex w-[380px] xl:w-[420px] flex-shrink-0 flex-col gap-6 overflow-y-auto hide-scrollbar min-h-0">
                            
                            {/* Summary Card */}
                            <div className="bg-white dark:bg-[#1A1D24] rounded-[32px] p-8 flex flex-col items-center text-center shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-800/30">
                                    <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{selectedInstances.size}</span>
                                </div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Quizzes Selected</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-base mt-2 leading-relaxed">
                                    {selectedInstances.size > 0 ? 'Ready to generate a comprehensive Excel report.' : 'Select quizzes from the list to begin.'}
                                </p>
                            </div>

                            {/* Sort Options */}
                            <div className="bg-white dark:bg-[#1A1D24] rounded-[32px] p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="flex items-center gap-2 mb-5">
                                    <FunnelIcon className="w-5 h-5 text-zinc-500" />
                                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Sort Students By</h4>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {['gender-lastName', 'gender-firstName'].map((option) => (
                                        <button 
                                            key={option}
                                            onClick={() => setSortOption(option)}
                                            className={`w-full py-4 px-5 rounded-[20px] text-sm font-medium transition-colors text-left flex items-center justify-between border ${
                                                sortOption === option 
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-900/20 dark:border-indigo-800/50 dark:text-indigo-100' 
                                                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
                                            }`}
                                        >
                                            {option === 'gender-lastName' ? 'Gender, then Last Name' : 'Gender, then First Name'}
                                            {sortOption === option && <CheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* GLOBAL FIXED BOTTOM ACTION BAR */}
                    <footer className="flex-shrink-0 bg-white dark:bg-[#1A1D24] border-t border-zinc-200/50 dark:border-zinc-800/50 px-4 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-none">
                        
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-100 dark:border-indigo-800/50">
                                {selectedInstances.size}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Quizzes Selected</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ready for Excel Export</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button onClick={handleClose} className="flex-1 sm:flex-none px-6 py-3.5 sm:py-3 rounded-full font-semibold text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 transition-colors active:scale-95">
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={selectedInstances.size === 0 || isGenerating}
                                className={`flex-1 sm:flex-none px-8 py-3.5 sm:py-3 rounded-full font-bold text-sm text-white transition-all active:scale-95 flex justify-center items-center gap-2
                                    ${selectedInstances.size === 0 || isGenerating
                                        ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}
                            >
                                {isGenerating && <div className="w-4 h-4 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />}
                                <span>{isGenerating ? 'Exporting...' : 'Generate Report'}</span>
                            </button>
                        </div>
                    </footer>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

// --- UTILITIES & EXCEL LOGIC (100% UNTOUCHED) ---

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