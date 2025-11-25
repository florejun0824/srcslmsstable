// src/components/teacher/QuizScoresModal.jsx

import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal';
import {
    AcademicCapIcon,
    ChartBarIcon,
    UsersIcon,
    LockClosedIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    SparklesIcon,
    PencilSquareIcon,
    ClockIcon,
    DocumentChartBarIcon,
    MagnifyingGlassIcon,
    TrashIcon
} from '@heroicons/react/24/solid';
import { ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { gradeEssayWithAI } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- OPTIMIZED: Solid Stat Card ---
const StatCard = ({ icon: Icon, title, value, color }) => {
    const colorMap = {
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
        teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    };

    return (
        <div className="group relative min-w-[140px] flex-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-sm ${colorMap[color] || colorMap.blue}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">{title}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
};

// --- OPTIMIZED: Status Pill ---
const StatusPill = ({ status }) => {
    const statusConfig = {
        'graded': { icon: CheckCircleIcon, style: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900/30', text: 'Graded' },
        'pending_ai_grading': { icon: SparklesIcon, style: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 animate-pulse', text: 'AI Grading' },
        'pending_review': { icon: PencilSquareIcon, style: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-900/30', text: 'Needs Review' },
        'grading_failed': { icon: XCircleIcon, style: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900/30', text: 'AI Failed' },
        'Locked': { icon: LockClosedIcon, style: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700', text: 'Locked' },
        'Not Started': { icon: ClockOutlineIcon, style: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700', text: 'Pending' },
    };

    const config = statusConfig[status] || statusConfig['Not Started'];
    const Icon = config.icon;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide border ${config.style} whitespace-nowrap`}>
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {config.text}
        </div>
    );
};

// --- OPTIMIZED: Score Badge ---
const ScoreBadge = ({ score, totalItems, isLate }) => {
    let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
    
    if (score !== null && score !== undefined && totalItems > 0) {
        const percentage = (score / totalItems) * 100;
        if (percentage >= 90) bgClass = 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
        else if (percentage >= 70) bgClass = 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
        else bgClass = 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`px-2.5 py-1 rounded-lg text-xs sm:text-sm font-bold ${bgClass} whitespace-nowrap`}>
                {score ?? '-'} <span className="opacity-60 text-[10px]">/ {totalItems}</span>
            </div>
            {isLate && <span className="text-[9px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-800">LATE</span>}
        </div>
    );
};

const QuizScoresModal = ({ 
    isOpen, 
    onClose, 
    quiz, 
    classData, 
    quizScores, 
    quizLocks, 
    onUnlockQuiz, 
    setIsReportModalOpen
}) => {
    const { showToast } = useToast();
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [isBulkGrading, setIsBulkGrading] = useState(false);
    const [hasPendingEssaysForThisQuiz, setHasPendingEssaysForThisQuiz] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [localQuizScores, setLocalQuizScores] = useState(quizScores || []);
    
    // PERFORMANCE: Add state for processed data to avoid heavy calculation on render
    const [processedData, setProcessedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(true);

    // LOCAL STATE for Optimistic Updates
    const [optimisticUnlocked, setOptimisticUnlocked] = useState(new Set());
    const [localConfirmModal, setLocalConfirmModal] = useState({ isOpen: false, quizId: null, studentId: null });

    useEffect(() => {
        if (!isBulkGrading) {
            setLocalQuizScores(quizScores || []);
        }
    }, [quizScores, isBulkGrading]);

    // Check for pending essays
    useEffect(() => {
        if (quiz?.id && localQuizScores) {
            const pending = localQuizScores.some(score =>
                score.quizId === quiz.id &&
                (score.hasPendingEssays === true || score.status === 'pending_ai_grading')
            );
            setHasPendingEssaysForThisQuiz(pending);
        }
    }, [localQuizScores, quiz?.id]);

    // --- OPTIMIZED DATA PROCESSING (Runs asynchronously) ---
    useEffect(() => {
        setIsProcessing(true);
        const timer = setTimeout(() => {
            if (!classData?.students || !quiz?.id || !quiz?.postId) {
                setProcessedData([]);
                setIsProcessing(false);
                return;
            }

            const maxAttempts = quiz?.settings?.maxAttempts ?? 3;
            const availableUntilDate = quiz?.availableUntil?.toDate ? quiz.availableUntil.toDate() : new Date(quiz.availableUntil);

            let allStudents = classData.students.map(student => {
                const studentAttempts = localQuizScores.filter(s => 
                    s.studentId === student.id && 
                    s.quizId === quiz.id &&
                    s.postId === quiz.postId
                ).sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

                const isActuallyLocked = quizLocks.some(l => l.studentId === student.id && l.quizId === quiz.id && l.postId === quiz.postId);
                const isLocked = isActuallyLocked && !optimisticUnlocked.has(student.id);

                let status = 'Not Started';
                let highestScoreAttempt = null;

                if (studentAttempts.length > 0) {
                    highestScoreAttempt = studentAttempts.reduce((maxAttempt, currentAttempt) => {
                        const maxScore = maxAttempt?.score ?? -1;
                        const currentScore = currentAttempt?.score ?? -1;
                        return (currentScore >= maxScore ? currentAttempt : maxAttempt);
                    }, { score: -1 });

                    if (!highestScoreAttempt || highestScoreAttempt.score === -1) {
                        highestScoreAttempt = studentAttempts[studentAttempts.length - 1];
                    }
                    status = studentAttempts[studentAttempts.length - 1].status || 'graded';
                } else if (isLocked) {
                    status = 'Locked';
                }

                const attemptsDisplay = Array(maxAttempts).fill(null);
                studentAttempts.slice(0, maxAttempts).forEach((attempt, index) => {
                    const getJsDate = (timestamp) => {
                        if (!timestamp) return null;
                        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
                        if (timestamp instanceof Date) return timestamp;
                        try {
                            const date = new Date(timestamp);
                            if (!isNaN(date.getTime())) return date;
                        } catch (e) {}
                        return null;
                    };

                    const submissionDate = getJsDate(attempt.submittedAt);
                    const isLate = !!(availableUntilDate && submissionDate && submissionDate > availableUntilDate);
                    attemptsDisplay[index] = { ...attempt, isLate };
                });

                const totalPossible = highestScoreAttempt?.totalItems ?? (quiz?.questions?.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 0);

                return {
                    ...student,
                    status,
                    highestScore: highestScoreAttempt ? (highestScoreAttempt.score ?? -1) : -1,
                    totalItems: totalPossible,
                    attemptsDisplay,
                    isLocked
                };
            });

            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                allStudents = allStudents.filter(s => 
                    s.firstName.toLowerCase().includes(lowerTerm) || 
                    s.lastName.toLowerCase().includes(lowerTerm)
                );
            }

            allStudents.sort((a, b) => {
                const direction = sortConfig.direction === 'ascending' ? 1 : -1;
                if (sortConfig.key === 'name') {
                    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`) * direction;
                } else if (sortConfig.key === 'status') {
                    return a.status.localeCompare(b.status) * direction;
                } else if (sortConfig.key === 'score') {
                    return (a.highestScore - b.highestScore) * direction;
                }
                return 0;
            });

            setProcessedData(allStudents);
            setIsProcessing(false);
        }, 50);

        return () => clearTimeout(timer);
    }, [classData?.students, localQuizScores, quizLocks, quiz, sortConfig, searchTerm, optimisticUnlocked]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const { averageScorePercent, completedCount, highestScorePercent, totalStudents } = useMemo(() => {
        const relevantSubmissions = localQuizScores.filter(s => s.quizId === quiz?.id);
        const uniqueStudentIds = [...new Set(relevantSubmissions.map(s => s.studentId))];
        const totalPoints = quiz?.questions?.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 0;

        const studentHighestScores = uniqueStudentIds.map(studentId => {
            const attempts = relevantSubmissions.filter(s => s.studentId === studentId);
            return Math.max(0, ...attempts.map(a => a.score ?? 0));
        });

        const avgScore = studentHighestScores.length > 0
            ? studentHighestScores.reduce((acc, s) => acc + s, 0) / studentHighestScores.length
            : 0;
        
        return {
            averageScorePercent: totalPoints > 0 ? (avgScore / totalPoints) * 100 : 0,
            completedCount: uniqueStudentIds.length,
            highestScorePercent: totalPoints > 0 ? (Math.max(...studentHighestScores, 0) / totalPoints) * 100 : 0,
            totalStudents: classData?.students?.length || 0
        };
    }, [localQuizScores, quiz, classData]);

    const initiateUnlock = (quizId, studentId) => {
        setLocalConfirmModal({ isOpen: true, quizId, studentId });
    };

    const handleConfirmUnlock = async () => {
        const { quizId, studentId } = localConfirmModal;
        
        // 1. Optimistic Update
        setOptimisticUnlocked(prev => new Set(prev).add(studentId));
        
        // 2. Close Modal
        setLocalConfirmModal({ isOpen: false, quizId: null, studentId: null });

        // 3. Execute DB Op
        if (onUnlockQuiz) {
            await onUnlockQuiz(quizId, studentId);
        }
    };

    const handleBulkGradeEssays = async () => {
        if (!classData?.id || !quiz?.id) return;
        setIsBulkGrading(true);
        showToast("Starting AI grading sequence...", "info");
        
        try {
            const submissionsRef = collection(db, 'quizSubmissions');
            const q = query(submissionsRef,
                where('classId', '==', classData.id),
                where('quizId', '==', quiz.id),
                where('hasPendingEssays', '==', true)
            );
            const snapshot = await getDocs(q);
            const pendingSubmissions = snapshot.docs;

            if (pendingSubmissions.length === 0) {
                showToast("No pending essays found.", "success");
                setHasPendingEssaysForThisQuiz(false);
                setIsBulkGrading(false);
                return;
            }

            let limitReached = false;

            for (const docSnap of pendingSubmissions) {
                if (limitReached) break;
                const submissionId = docSnap.id;
                const submissionData = docSnap.data();
                let updatedAnswers = JSON.parse(JSON.stringify(submissionData.answers || []));
                let needsUpdate = false;

                for (let i = 0; i < updatedAnswers.length; i++) {
                    if (updatedAnswers[i].questionType === 'essay' && updatedAnswers[i].status === 'pending_ai_grading') {
                        try {
                            await delay(2000); 
                            const gradingResult = await gradeEssayWithAI(
                                updatedAnswers[i].questionText,
                                updatedAnswers[i].rubric,
                                updatedAnswers[i].selectedAnswer
                            );
                            updatedAnswers[i].aiGradingResult = gradingResult;
                            updatedAnswers[i].score = gradingResult.totalScore;
                            updatedAnswers[i].status = 'graded';
                            needsUpdate = true;
                        } catch (error) {
                            console.error("AI Error:", error);
                            updatedAnswers[i].status = 'grading_failed';
                            if (error.message?.includes("limit")) {
                                limitReached = true;
                                showToast("AI Limit Reached. Pausing.", "error");
                                break;
                            }
                        }
                    }
                }

                if (needsUpdate || (submissionData.hasPendingEssays && !limitReached)) {
                    const newTotalScore = updatedAnswers.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
                    const hasStillPending = updatedAnswers.some(a => a.status === 'pending_ai_grading');
                    const finalStatus = updatedAnswers.some(a => a.status === 'grading_failed') ? 'pending_review' : (hasStillPending ? 'pending_ai_grading' : 'graded');

                    await updateDoc(doc(db, 'quizSubmissions', submissionId), {
                        answers: updatedAnswers,
                        score: Math.round(newTotalScore),
                        status: finalStatus,
                        hasPendingEssays: hasStillPending
                    });

                    setLocalQuizScores(prevScores => prevScores.map(score => {
                        if (score.id === submissionId) {
                            return {
                                ...score,
                                answers: updatedAnswers,
                                score: Math.round(newTotalScore),
                                status: finalStatus,
                                hasPendingEssays: hasStillPending
                            };
                        }
                        return score;
                    }));
                }
            }
            showToast("Batch grading cycle complete.", "success");
        } catch (error) {
            console.error(error);
            showToast("Error during bulk grading.", "error");
        } finally {
            setIsBulkGrading(false);
        }
    };

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                size="screen" 
                showCloseButton={false} 
                containerClassName="bg-transparent p-0 sm:p-4 flex items-center justify-center"
            >
                <div className="relative w-full h-full sm:h-[90vh] max-w-7xl bg-white dark:bg-[#1A1D24] sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    
                    {/* Header */}
                    <div className="flex-shrink-0 px-4 py-4 sm:px-8 sm:py-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex justify-between items-start sm:items-center w-full">
                                <div>
                                    <h2 className="text-lg sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">
                                        {quiz?.title}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-xs sm:text-sm flex items-center gap-2">
                                        <ChartBarIcon className="w-4 h-4" /> Performance Overview
                                    </p>
                                </div>
                                <button onClick={onClose} className="p-2 sm:p-2.5 ml-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="mt-6 flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                            <StatCard icon={UsersIcon} title="Completion" value={`${completedCount}/${totalStudents}`} color="blue" />
                            <StatCard icon={AcademicCapIcon} title="Avg. Score" value={`${averageScorePercent.toFixed(0)}%`} color="teal" />
                            <StatCard icon={SparklesIcon} title="Highest" value={`${highestScorePercent.toFixed(0)}%`} color="purple" />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex-shrink-0 px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative w-full sm:w-72 group">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search students..." 
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 dark:text-white shadow-sm text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleBulkGradeEssays}
                                disabled={!hasPendingEssaysForThisQuiz || isBulkGrading}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]
                                    ${isBulkGrading 
                                        ? 'bg-slate-100 text-slate-400 cursor-wait' 
                                        : hasPendingEssaysForThisQuiz 
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md' 
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {isBulkGrading ? <ClockOutlineIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                                {isBulkGrading ? 'Grading...' : 'Auto-Grade'}
                            </button>

                            <button
                                onClick={() => setIsReportModalOpen(true)}
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                                <DocumentChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                Report
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-0 sm:p-8 bg-slate-50 dark:bg-slate-900">
                        {isProcessing ? (
                            <div className="flex items-center justify-center h-64">
                                <Spinner size="lg" />
                            </div>
                        ) : (
                            <div className="sm:rounded-2xl border-y sm:border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm bg-white dark:bg-[#1A1D24]">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] sm:min-w-full">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                                            <div className="col-span-4 cursor-pointer hover:text-blue-500 flex items-center gap-1" onClick={() => requestSort('name')}>
                                                Student {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />)}
                                            </div>
                                            <div className="col-span-3 cursor-pointer hover:text-blue-500 flex items-center gap-1" onClick={() => requestSort('status')}>
                                                Status {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />)}
                                            </div>
                                            <div className="col-span-3 text-center">Attempts</div>
                                            <div className="col-span-2 text-right">Actions</div>
                                        </div>

                                        {/* Table Body */}
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {processedData.map(student => (
                                                <div key={student.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    {/* Name */}
                                                    <div className="col-span-4 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 border border-blue-200 dark:border-blue-800/50">
                                                            {student.firstName?.[0]}{student.lastName?.[0]}
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                                                                {student.lastName}, {student.firstName}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Status */}
                                                    <div className="col-span-3">
                                                        <StatusPill status={student.status} />
                                                    </div>

                                                    {/* Attempts */}
                                                    <div className="col-span-3 flex items-center justify-center gap-2">
                                                        {student.attemptsDisplay.map((attempt, idx) => (
                                                            <div key={idx} className="w-12">
                                                                {attempt ? (
                                                                    <ScoreBadge 
                                                                        score={attempt.score} 
                                                                        totalItems={attempt.totalItems} 
                                                                        isLate={attempt.isLate} 
                                                                    />
                                                                ) : (
                                                                    <div className="h-1.5 w-4 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto"/>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="col-span-2 flex justify-end">
                                                        {student.isLocked ? (
                                                            <button 
                                                                onClick={() => initiateUnlock(quiz.id, student.id)}
                                                                className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 text-red-600 text-xs font-bold border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
                                                            >
                                                                Unlock
                                                            </button>
                                                        ) : (
                                                            <div className="w-8"/>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {processedData.length === 0 && (
                                                <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                                                    No students found matching your filters.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* --- Internal Confirmation Modal for Unlock --- */}
            <Modal
                isOpen={localConfirmModal.isOpen}
                onClose={() => setLocalConfirmModal({ isOpen: false, quizId: null, studentId: null })}
                title="Confirm Unlock"
                size="sm"
                showCloseButton={false}
                // FIX: Added high z-index to ensure it appears above the parent modal
                className="z-[9999]" 
                containerClassName="bg-black/50 flex items-center justify-center p-4"
                contentClassName="bg-white dark:bg-[#1A1D24] p-0 rounded-[24px] shadow-xl overflow-hidden"
            >
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                        <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unlock Quiz?</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Are you sure you want to unlock this quiz?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setLocalConfirmModal({ isOpen: false, quizId: null, studentId: null })}
                            className="py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmUnlock}
                            className="py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                        >
                            Unlock
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default QuizScoresModal;