import React, { useState, useMemo } from 'react';
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
    ArrowDownIcon
} from '@heroicons/react/24/solid';
import { Button } from '@tremor/react';

const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className={`flex-1 bg-neumorphic-base p-4 rounded-xl shadow-neumorphic flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-neumorphic-base shadow-neumorphic-inset`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const ScoreBadge = ({ score, totalItems, isLate = false }) => {
    let colorClasses = 'bg-gray-100 text-gray-700';
    let displayScore = '—';

    if (score !== null && score !== undefined) {
        const percentage = (score / totalItems) * 100;
        if (percentage >= 90) colorClasses = 'bg-green-100 text-green-800';
        else if (percentage >= 70) colorClasses = 'bg-yellow-100 text-yellow-800';
        else colorClasses = 'bg-red-100 text-red-800';
        displayScore = `${score}/${totalItems}`;
    }

    return (
        <div className="flex items-center justify-center gap-2 flex-col">
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${colorClasses}`}>
                {displayScore}
            </span>
            {isLate && (
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">LATE</span>
            )}
        </div>
    );
};

const StatusPill = ({ status }) => {
    const statusConfig = {
        'Completed': { icon: CheckCircleIcon, color: 'green' },
        'Locked': { icon: LockClosedIcon, color: 'red' },
        'Not Started': { icon: XCircleIcon, color: 'gray' },
    };
    const { icon: Icon, color } = statusConfig[status] || statusConfig['Not Started'];

    return (
        <div className={`flex items-center gap-2 text-sm font-semibold text-${color}-700`}>
            <Icon className={`w-5 h-5 text-${color}-500`} />
            <span>{status}</span>
        </div>
    );
};

const QuizScoresModal = ({ isOpen, onClose, quiz, classData, quizScores, quizLocks, onUnlockQuiz }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    const processedStudentData = useMemo(() => {
        if (!classData?.students) return [];

        const allStudents = classData.students.map(student => {
            const studentAttempts = quizScores.filter(s => s.studentId === student.id && s.quizId === quiz.id);
            const isLocked = quizLocks.some(l => l.studentId === student.id && l.quizId === quiz.id);

            let status = 'Not Started';
            if (studentAttempts.length > 0) {
                status = 'Completed';
            } else if (isLocked) {
                status = 'Locked';
            }
            
            const highestScore = studentAttempts.length > 0 ? Math.max(...studentAttempts.map(a => a.score)) : -1;

            return { 
                ...student, 
                status, 
                highestScore,
                attempts: studentAttempts,
                isLocked
            };
        });

        allStudents.sort((a, b) => {
            let aValue, bValue;
            
            if (sortConfig.key === 'score') {
                aValue = a.highestScore;
                bValue = b.highestScore;
            } else if (sortConfig.key === 'name') {
                aValue = (a.firstName || '').toLowerCase();
                bValue = (b.firstName || '').toLowerCase();
            } else if (sortConfig.key === 'status') {
                const statusOrder = { 'Completed': 2, 'Locked': 1, 'Not Started': 0 };
                aValue = statusOrder[a.status];
                bValue = statusOrder[b.status];
            }
            
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return allStudents;
    }, [classData, quizScores, quizLocks, quiz, sortConfig]);
    
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronDownIcon className="w-4 h-4 text-slate-400 invisible group-hover:visible" />;
        return sortConfig.direction === 'ascending' 
            ? <ArrowUpIcon className="w-4 h-4 text-sky-600" /> 
            : <ArrowDownIcon className="w-4 h-4 text-sky-600" />;
    };

    const submissions = quizScores.filter(s => s.quizId === quiz?.id);
    const uniqueStudentsWithScores = [...new Set(submissions.map(s => s.studentId))];
    const highestScoresPerStudent = uniqueStudentsWithScores.map(studentId => {
        const studentAttempts = submissions.filter(s => s.studentId === studentId);
        return Math.max(...studentAttempts.map(a => a.score));
    });

    const averageScore = highestScoresPerStudent.length > 0 ? (highestScoresPerStudent.reduce((acc, s) => acc + s, 0) / highestScoresPerStudent.length) / quiz.questions.length * 100 : 0;
    const completedCount = uniqueStudentsWithScores.length;
    const highestScore = highestScoresPerStudent.length > 0 ? Math.max(...highestScoresPerStudent) / quiz.questions.length * 100 : 0;
    const totalStudents = classData?.students?.length || 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Scores for "${quiz?.title}"`} size="6xl">
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={UsersIcon} title="Completion Rate" value={`${completedCount} / ${totalStudents}`} color="blue" />
                    <StatCard icon={AcademicCapIcon} title="Average Score" value={`${averageScore.toFixed(1)}%`} color="teal" />
                    <StatCard icon={ChartBarIcon} title="Highest Score" value={`${highestScore.toFixed(1)}%`} color="purple" />
                </div>

                <div className="bg-neumorphic-base p-4 rounded-xl shadow-neumorphic">
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b-2 border-neumorphic-shadow-dark/30 text-left text-sm font-bold text-slate-600 rounded-t-xl">
                        <button onClick={() => requestSort('name')} className="col-span-4 group flex items-center gap-2"><span>Student Name</span> {getSortIcon('name')}</button>
                        <button onClick={() => requestSort('status')} className="col-span-3 group flex items-center gap-2"><span>Status</span> {getSortIcon('status')}</button>
                        <div className="col-span-3 grid grid-cols-3">
                            <span className="col-span-1 text-center">Attempt 1</span>
                            <span className="col-span-1 text-center">Attempt 2</span>
                            <span className="col-span-1 text-center">Attempt 3</span>
                        </div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="space-y-1 mt-2 max-h-[50vh] overflow-y-auto pr-2">
                        {processedStudentData.length > 0 ? (
                            processedStudentData.map(student => (
                                <div key={student.id} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg transition-shadow hover:shadow-neumorphic-inset">
                                    <div className="col-span-4 font-semibold text-slate-800">{student.firstName} {student.lastName}</div>
                                    <div className="col-span-3"><StatusPill status={student.status} /></div>
                                    <div className="col-span-3 grid grid-cols-3">
                                        {[1, 2, 3].map(attemptNum => {
                                            const attempt = student.attempts.find(a => a.attemptNumber === attemptNum);
                                            return (
                                                <div key={attemptNum} className="col-span-1 flex justify-center">
                                                    {attempt ? (
                                                        <ScoreBadge score={attempt.score} totalItems={attempt.totalItems} isLate={attempt.isLate} />
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">—</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        {student.isLocked && (
                                            <button
                                                onClick={() => onUnlockQuiz(quiz.id, student.id)}
                                                className="px-3 py-1 text-xs font-semibold text-red-600 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                                                title={`Unlock quiz for ${student.firstName}`}
                                            >
                                                Unlock
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">No students found in this class.</div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default QuizScoresModal;