// src/components/teacher/QuizScoresModal.jsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import {
    AcademicCapIcon,
    ChartBarIcon,
    UsersIcon,
    LockClosedIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronDownIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    SparklesIcon,
    PencilSquareIcon,
    ClockIcon,
    DocumentChartBarIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import { ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { gradeEssayWithAI } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- macOS 26 Component: Glass Stat Card ---
const StatCard = ({ icon: Icon, title, value, color }) => {
    const colorMap = {
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
        teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    };

    return (
        <div className="group relative flex-1 overflow-hidden rounded-[24px] border border-white/40 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner ${colorMap[color] || colorMap.blue}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
};

// --- macOS 26 Component: Status Pill ---
const StatusPill = ({ status }) => {
    const statusConfig = {
        'graded': { icon: CheckCircleIcon, style: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20', text: 'Graded' },
        'pending_ai_grading': { icon: SparklesIcon, style: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 animate-pulse', text: 'AI Grading' },
        'pending_review': { icon: PencilSquareIcon, style: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20', text: 'Needs Review' },
        'grading_failed': { icon: XCircleIcon, style: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20', text: 'AI Failed' },
        'Locked': { icon: LockClosedIcon, style: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20', text: 'Locked' },
        'Not Started': { icon: ClockOutlineIcon, style: 'bg-slate-200/50 text-slate-500 border-slate-200/50', text: 'Pending' },
    };

    const config = statusConfig[status] || statusConfig['Not Started'];
    const Icon = config.icon;

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${config.style}`}>
            <Icon className="w-3.5 h-3.5" />
            {config.text}
        </div>
    );
};

// --- macOS 26 Component: Score Badge ---
const ScoreBadge = ({ score, totalItems, isLate }) => {
    let bgClass = 'bg-slate-100 dark:bg-white/5 text-slate-500';
    
    if (score !== null && score !== undefined && totalItems > 0) {
        const percentage = (score / totalItems) * 100;
        if (percentage >= 90) bgClass = 'bg-green-500/10 text-green-700 dark:text-green-400';
        else if (percentage >= 70) bgClass = 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
        else bgClass = 'bg-red-500/10 text-red-700 dark:text-red-400';
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`px-2.5 py-1 rounded-[10px] text-sm font-bold ${bgClass}`}>
                {score ?? '-'} <span className="opacity-50 text-[10px]">/ {totalItems}</span>
            </div>
            {isLate && <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">LATE</span>}
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

    // --- NEW: Local State for Real-Time Updates ---
    const [localQuizScores, setLocalQuizScores] = useState(quizScores || []);

    // Sync local state when props change (from DB updates), but only if we aren't actively bulk grading to avoid jitter
    useEffect(() => {
        if (!isBulkGrading) {
            setLocalQuizScores(quizScores || []);
        }
    }, [quizScores, isBulkGrading]);

    const maxAttempts = quiz?.settings?.maxAttempts ?? 3;

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

    // Process Student Data
    const processedStudentData = useMemo(() => {
        if (!classData?.students || !quiz?.id || !quiz?.postId) return [];

        const availableUntilDate = quiz?.availableUntil?.toDate ? quiz.availableUntil.toDate() : new Date(quiz.availableUntil);

        let allStudents = classData.students.map(student => {
            // Use localQuizScores instead of prop quizScores for real-time reflection
            const studentAttempts = localQuizScores.filter(s => 
                s.studentId === student.id && 
                s.quizId === quiz.id &&
                s.postId === quiz.postId
            ).sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

            const isLocked = quizLocks.some(l => l.studentId === student.id && l.quizId === quiz.id && l.postId === quiz.postId);

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

        // Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            allStudents = allStudents.filter(s => 
                s.firstName.toLowerCase().includes(lowerTerm) || 
                s.lastName.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort
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

        return allStudents;
    }, [classData?.students, localQuizScores, quizLocks, quiz, sortConfig, maxAttempts, searchTerm]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Stats
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

    // --- BULK GRADING LOGIC (FIXED & REAL-TIME) ---
    const handleBulkGradeEssays = async () => {
        if (!classData?.id || !quiz?.id) return;

        setIsBulkGrading(true);
        showToast("Starting AI grading sequence...", "info");
        
        let pendingSubmissions = [];
        try {
            const submissionsRef = collection(db, 'quizSubmissions');
            const q = query(submissionsRef,
                where('classId', '==', classData.id),
                where('quizId', '==', quiz.id),
                where('hasPendingEssays', '==', true)
            );
            const snapshot = await getDocs(q);
            pendingSubmissions = snapshot.docs;

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
                            await delay(2000); // Rate limit buffer
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

                    // 1. Update Firestore
                    await updateDoc(doc(db, 'quizSubmissions', submissionId), {
                        answers: updatedAnswers,
                        score: Math.round(newTotalScore),
                        status: finalStatus,
                        hasPendingEssays: hasStillPending
                    });

                    // 2. REAL-TIME UPDATE: Update local state immediately
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
        <Modal isOpen={isOpen} onClose={onClose} size="screen" showCloseButton={false} containerClassName="bg-transparent p-0 sm:p-4 flex items-center justify-center">
            {/* Main Glass Container */}
            <div className="relative w-full h-full sm:h-[90vh] max-w-7xl bg-white/80 dark:bg-[#0F1115]/80 backdrop-blur-[40px] sm:rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/5 flex flex-col overflow-hidden">
                
                {/* --- Header --- */}
                <div className="flex-shrink-0 px-6 py-6 sm:px-10 sm:py-8 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {quiz?.title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4" /> Performance Overview
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="p-3 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                        <StatCard icon={UsersIcon} title="Completion" value={`${completedCount}/${totalStudents}`} color="blue" />
                        <StatCard icon={AcademicCapIcon} title="Avg. Score" value={`${averageScorePercent.toFixed(0)}%`} color="teal" />
                        <StatCard icon={SparklesIcon} title="Highest" value={`${highestScorePercent.toFixed(0)}%`} color="purple" />
                    </div>
                </div>

                {/* --- Controls --- */}
                <div className="flex-shrink-0 px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/20 dark:bg-black/20 backdrop-blur-md">
                    <div className="relative w-full sm:w-72 group">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search students..." 
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/40 focus:border-blue-500/30 outline-none transition-all placeholder:text-slate-400 dark:text-white shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleBulkGradeEssays}
                            disabled={!hasPendingEssaysForThisQuiz || isBulkGrading}
                            className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]
                                ${isBulkGrading 
                                    ? 'bg-slate-100 text-slate-400 cursor-wait' 
                                    : hasPendingEssaysForThisQuiz 
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25' 
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {isBulkGrading ? <ClockOutlineIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                            {isBulkGrading ? 'AI Grading...' : 'Auto-Grade Essays'}
                        </button>

                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl font-bold text-sm bg-white dark:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20 flex items-center justify-center gap-2 transition-all"
                        >
                            <DocumentChartBarIcon className="w-5 h-5 text-blue-500" />
                            Report
                        </button>
                    </div>
                </div>

                {/* --- Table --- */}
                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 sm:p-10">
                    <div className="bg-white/40 dark:bg-white/5 rounded-[32px] border border-white/50 dark:border-white/5 overflow-hidden shadow-sm">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white/50 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5 text-xs font-bold uppercase tracking-widest text-slate-400 sticky top-0 backdrop-blur-xl z-10">
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
                        <div className="divide-y divide-slate-200/50 dark:divide-white/5">
                            {processedStudentData.map(student => (
                                <div key={student.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                                    
                                    {/* Name */}
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                                            {student.firstName?.[0]}{student.lastName?.[0]}
                                        </div>
                                        <div className="truncate">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.lastName}, {student.firstName}</p>
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
                                                    <div className="h-1 w-4 bg-slate-200 dark:bg-white/10 rounded-full mx-auto"/>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 flex justify-end">
                                        {student.isLocked ? (
                                            <button 
                                                onClick={() => onUnlockQuiz && onUnlockQuiz(quiz.id, student.id)}
                                                className="px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors"
                                            >
                                                Unlock
                                            </button>
                                        ) : (
                                            <div className="w-8"/>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {processedStudentData.length === 0 && (
                                <div className="p-12 text-center text-slate-400">
                                    No students found matching your filters.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default QuizScoresModal;