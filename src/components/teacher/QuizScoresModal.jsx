import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal';
import {
    AcademicCapIcon,
    ChartBarIcon,
    UsersIcon,
    LockClosedIcon,
    CheckCircleIcon,
    XCircleIcon,
    SparklesIcon,
    PencilSquareIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    DocumentChartBarIcon // <--- Restored Import
} from '@heroicons/react/24/solid';
import { ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { gradeEssayWithAI } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import Spinner from '../common/Spinner';

// --- MONET STYLE HELPER ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    switch (activeOverlay) {
        case 'christmas': return { 
            bg: 'bg-emerald-50 dark:bg-emerald-900/10', 
            border: 'border-emerald-200 dark:border-emerald-800', 
            text: 'text-emerald-700 dark:text-emerald-400',
            accent: 'bg-emerald-600',
            lightAccent: 'bg-emerald-100 dark:bg-emerald-900/30',
            badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
        };
        case 'valentines': return { 
            bg: 'bg-rose-50 dark:bg-rose-900/10', 
            border: 'border-rose-200 dark:border-rose-800', 
            text: 'text-rose-700 dark:text-rose-400',
            accent: 'bg-rose-600',
            lightAccent: 'bg-rose-100 dark:bg-rose-900/30',
            badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
        };
        case 'cyberpunk': return { 
            bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/10', 
            border: 'border-fuchsia-200 dark:border-fuchsia-800', 
            text: 'text-fuchsia-700 dark:text-fuchsia-400',
            accent: 'bg-fuchsia-600',
            lightAccent: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
            badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200'
        };
        default: return null;
    }
};

// --- SUB-COMPONENTS ---

const StatCard = ({ icon: Icon, title, value, color, monet }) => {
    const colorStyles = monet ? {
        text: monet.text,
        bg: monet.bg,
        border: monet.border
    } : {
        blue: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        teal: { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
        purple: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    }[color] || { text: 'text-slate-600', bg: 'bg-slate-50' };

    return (
        <div className={`group relative min-w-[140px] flex-1 overflow-hidden rounded-[24px] border bg-white dark:bg-[#1E1E1E] shadow-sm p-5 flex flex-col items-start gap-3 ${monet ? monet.border : 'border-slate-200 dark:border-white/10'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${colorStyles.bg} ${colorStyles.text}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
};

const StatusPill = ({ status, monet }) => {
    const statusConfig = {
        'graded': { icon: CheckCircleIcon, style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', text: 'Graded' },
        'pending_ai_grading': { icon: SparklesIcon, style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse', text: 'AI Grading' },
        'pending_review': { icon: PencilSquareIcon, style: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', text: 'To Review' },
        'grading_failed': { icon: ExclamationTriangleIcon, style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', text: 'Failed' },
        'Locked': { icon: LockClosedIcon, style: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', text: 'Locked' },
        'Not Started': { icon: ClockOutlineIcon, style: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500', text: 'Pending' },
    };

    const config = statusConfig[status] || statusConfig['Not Started'];
    const Icon = config.icon;
    const style = (monet && (status === 'graded')) ? monet.badge : config.style;

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${style}`}>
            <Icon className="w-3.5 h-3.5" />
            {config.text}
        </div>
    );
};

// --- MAIN COMPONENT ---

const QuizScoresModal = ({ 
    isOpen, 
    onClose, 
    quiz, 
    classData, 
    onUnlockQuiz, 
    setIsReportModalOpen 
}) => {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

    // --- LOCAL STATE ---
    const [fetchedScores, setFetchedScores] = useState([]);
    const [fetchedLocks, setFetchedLocks] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isBulkGrading, setIsBulkGrading] = useState(false);

    // --- REAL-TIME DATA FETCHING ---
    useEffect(() => {
        if (!isOpen || !quiz?.id || !classData?.id) return;

        setIsLoadingData(true);

        const qScores = query(
            collection(db, 'quizSubmissions'), 
            where('quizId', '==', quiz.id),
            where('classId', '==', classData.id)
        );

        const unsubScores = onSnapshot(qScores, (snapshot) => {
            const scoresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFetchedScores(scoresData);
            setIsLoadingData(false);
        }, (err) => {
            console.error("Error fetching scores:", err);
            setIsLoadingData(false);
        });

        const qLocks = query(
            collection(db, 'quizLocks'),
            where('quizId', '==', quiz.id)
        );

        const unsubLocks = onSnapshot(qLocks, (snapshot) => {
            const locksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFetchedLocks(locksData);
        }, (err) => {
            console.error("Error fetching locks:", err);
        });

        return () => {
            unsubScores();
            unsubLocks();
        };
    }, [isOpen, quiz?.id, classData?.id]);

    // --- PROCESSING DATA ---
    const { processedStudents, summaryStats, hasPendingEssays, hasFailedEssays } = useMemo(() => {
        if (!classData?.students) return { processedStudents: [], summaryStats: {}, hasPendingEssays: false, hasFailedEssays: false };

        const maxAttempts = quiz?.settings?.maxAttempts ?? 1;
        
        let pending = false;
        let failed = false;

        const students = classData.students.map(student => {
            const myScores = fetchedScores.filter(s => s.studentId === student.id)
                .sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

            const lockRecord = fetchedLocks.find(l => l.studentId === student.id);
            const isLocked = !!lockRecord;

            let status = 'Not Started';
            let bestScore = null;

            if (myScores.length > 0) {
                const latest = myScores[myScores.length - 1];
                status = latest.status || 'graded';
                
                if (latest.status === 'pending_ai_grading' || latest.hasPendingEssays) pending = true;
                if (latest.answers?.some(a => a.status === 'grading_failed')) failed = true;

                const bestAttempt = myScores.reduce((max, curr) => (curr.score ?? -1) >= (max.score ?? -1) ? curr : max, { score: -1 });
                bestScore = bestAttempt.score;
            } else if (isLocked) {
                status = 'Locked';
            }

            return {
                ...student,
                attempts: myScores,
                bestScore,
                status,
                isLocked,
                lockId: lockRecord?.id 
            };
        });

        const filtered = searchTerm 
            ? students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
            : students;

        const attemptedCount = students.filter(s => s.attempts.length > 0).length;
        const validScores = students.filter(s => s.bestScore !== null).map(s => s.bestScore);
        const avgScore = validScores.length ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
        const highestScore = validScores.length ? Math.max(...validScores) : 0;
        
        const totalPoints = quiz?.questions?.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 1;

        return {
            processedStudents: filtered,
            hasPendingEssays: pending,
            hasFailedEssays: failed,
            summaryStats: {
                attempted: attemptedCount,
                totalStudents: students.length,
                avg: (avgScore / totalPoints) * 100,
                high: (highestScore / totalPoints) * 100
            }
        };
    }, [classData, fetchedScores, fetchedLocks, quiz, searchTerm]);

    // --- ACTIONS ---

    const handleUnlock = async (lockId) => {
        if (!lockId) return;
        try {
            await deleteDoc(doc(db, 'quizLocks', lockId));
            showToast("Quiz unlocked successfully.", "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to unlock.", "error");
        }
    };

    const handleBulkGrade = async () => {
        if (isBulkGrading) return;
        setIsBulkGrading(true);
        showToast("Starting Auto-Grading...", "info");

        try {
            // Find all pending submissions
            const pendingSubmissions = fetchedScores.filter(s => 
                s.hasPendingEssays || s.status === 'pending_ai_grading' || s.answers?.some(a => a.status === 'grading_failed')
            );

            if (pendingSubmissions.length === 0) {
                showToast("No essays need grading.", "success");
                setIsBulkGrading(false);
                return;
            }

            for (const sub of pendingSubmissions) {
                let updatedAnswers = [...(sub.answers || [])];
                let changed = false;

                for (let i = 0; i < updatedAnswers.length; i++) {
                    const ans = updatedAnswers[i];
                    if (ans.questionType === 'essay' && (ans.status === 'pending_ai_grading' || ans.status === 'grading_failed')) {
                        try {
                            // Call AI Service
                            const result = await gradeEssayWithAI(ans.questionText, ans.rubric, ans.selectedAnswer);
                            updatedAnswers[i] = { ...ans, aiGradingResult: result, score: result.totalScore, status: 'graded' };
                            changed = true;
                        } catch (err) {
                            console.error(err);
                            updatedAnswers[i].status = 'grading_failed';
                        }
                    }
                }

                if (changed) {
                    const newScore = updatedAnswers.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
                    const newStatus = updatedAnswers.some(a => a.status === 'grading_failed') ? 'pending_review' : 'graded';
                    
                    await updateDoc(doc(db, 'quizSubmissions', sub.id), {
                        answers: updatedAnswers,
                        score: Math.round(newScore),
                        status: newStatus,
                        hasPendingEssays: false
                    });
                }
            }
            showToast("Auto-Grading Complete!", "success");
        } catch (error) {
            console.error(error);
            showToast("Auto-Grading failed.", "error");
        } finally {
            setIsBulkGrading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="screen" showCloseButton={false} containerClassName="bg-transparent p-0 sm:p-4 flex items-center justify-center">
            <div className="relative w-full h-full sm:h-[90vh] max-w-7xl bg-[#F9F9F9] dark:bg-[#101010] sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/5 flex flex-col overflow-hidden font-sans">
                
                {/* --- HEADER --- */}
                <div className="flex-shrink-0 px-6 py-6 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#1E1E1E]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{quiz?.title}</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4" /> Performance Overview
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-red-100 hover:text-red-500 dark:hover:bg-white/10 transition-colors">
                            <XCircleIcon className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <StatCard icon={UsersIcon} title="Submitted" value={`${summaryStats.attempted}/${summaryStats.totalStudents}`} color="blue" monet={monet} />
                        <StatCard icon={AcademicCapIcon} title="Average" value={`${summaryStats.avg.toFixed(0)}%`} color="teal" monet={monet} />
                        <StatCard icon={SparklesIcon} title="Highest" value={`${summaryStats.high.toFixed(0)}%`} color="purple" monet={monet} />
                    </div>
                </div>

                {/* --- TOOLBAR --- */}
                <div className="flex-shrink-0 px-6 py-4 flex flex-col sm:flex-row gap-4 bg-white/50 dark:bg-[#151515] border-b border-slate-200 dark:border-white/5 backdrop-blur-md">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Search students..." 
                            className="w-full pl-11 pr-4 py-3 rounded-[18px] bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        {/* Auto-Grade Button */}
                        <button 
                            onClick={handleBulkGrade}
                            disabled={isBulkGrading || (!hasPendingEssays && !hasFailedEssays)}
                            className={`px-6 py-3 rounded-[18px] font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 
                                ${monet ? `${monet.lightAccent} ${monet.text}` : 'bg-white dark:bg-[#1E1E1E] text-slate-700 dark:text-slate-200'}`}
                        >
                            {isBulkGrading ? <Spinner size="sm" /> : <SparklesIcon className="w-5 h-5" />}
                            {hasFailedEssays ? 'Retry Failed' : 'Auto-Grade'}
                        </button>

                        {/* RESTORED: Report Button */}
                        <button 
                            onClick={() => setIsReportModalOpen(true)}
                            className="px-6 py-3 rounded-[18px] font-bold text-sm bg-white dark:bg-[#1E1E1E] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                        >
                            <DocumentChartBarIcon className="w-5 h-5 text-blue-500" /> Report
                        </button>
                    </div>
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-black/20 p-4 sm:p-6">
                    {isLoadingData ? (
                        <div className="h-full flex items-center justify-center"><Spinner /></div>
                    ) : (
                        <div className="space-y-4">
                            {/* Desktop Header */}
                            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                <div className="col-span-4">Student</div>
                                <div className="col-span-2 text-center">Status</div>
                                <div className="col-span-4 text-center">Attempts</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>

                            {/* List */}
                            {processedStudents.map(student => (
                                <div key={student.id} className="group bg-white dark:bg-[#1E1E1E] rounded-[24px] border border-slate-200 dark:border-white/5 shadow-sm p-4 sm:px-6 sm:py-4 transition-all hover:shadow-md">
                                    <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center">
                                        
                                        {/* Name */}
                                        <div className="col-span-4 flex items-center gap-4 w-full">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${monet ? monet.lightAccent + ' ' + monet.text : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                                                {student.firstName[0]}{student.lastName[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white truncate">{student.lastName}, {student.firstName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{student.email}</p>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2 w-full sm:w-auto flex justify-between sm:justify-center items-center">
                                            <span className="sm:hidden text-xs font-bold text-slate-400 uppercase">Status:</span>
                                            <StatusPill status={student.status} monet={monet} />
                                        </div>

                                        {/* Attempts */}
                                        <div className="col-span-4 w-full flex justify-center gap-2">
                                            {Array.from({ length: quiz?.settings?.maxAttempts || 3 }).map((_, idx) => {
                                                const attempt = student.attempts[idx];
                                                let bgClass = 'bg-slate-50 dark:bg-black/20 text-slate-300 border-dashed border-slate-200 dark:border-white/5';
                                                
                                                if (attempt) {
                                                    const scorePercent = (attempt.score / (attempt.totalItems || 1)) * 100;
                                                    if (scorePercent >= 90) bgClass = 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400';
                                                    else if (scorePercent >= 70) bgClass = 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400';
                                                    else bgClass = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400';
                                                }

                                                return (
                                                    <div key={idx} className={`w-full sm:w-12 h-9 rounded-[10px] flex items-center justify-center text-xs font-bold border ${bgClass}`}>
                                                        {attempt ? attempt.score : '-'}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-2 w-full flex justify-end">
                                            {student.isLocked ? (
                                                <button 
                                                    onClick={() => handleUnlock(student.lockId)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-[14px] bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs transition-colors w-full sm:w-auto justify-center"
                                                >
                                                    <LockClosedIcon className="w-3.5 h-3.5" /> Unlock
                                                </button>
                                            ) : (
                                                <div className="text-xs text-slate-400 font-medium px-2">—</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default QuizScoresModal;