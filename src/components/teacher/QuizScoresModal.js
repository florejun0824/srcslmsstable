import React from 'react';
import Modal from '../common/Modal';
import { KeyIcon } from '@heroicons/react/24/outline';

const QuizScoresModal = ({ isOpen, onClose, quiz, classData, quizScores, quizLocks, onUnlockQuiz }) => {
    if (!isOpen || !quiz) return null;

    const scores = quizScores.filter(s => s.quizId === quiz.id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Scores for: ${quiz.title}`} size="4xl">
            {/* This div makes the modal content scrollable */}
            <div className="max-h-[70vh] overflow-y-auto pr-2">
                <table className="min-w-full bg-white border rounded-lg">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600">Student Name</th>
                            <th className="p-3 text-center text-sm font-semibold text-gray-600">Attempt 1</th>
                            <th className="p-3 text-center text-sm font-semibold text-gray-600">Attempt 2</th>
                            <th className="p-3 text-center text-sm font-semibold text-gray-600">Attempt 3</th>
                            <th className="p-3 text-center text-sm font-semibold text-gray-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classData?.students?.map(student => {
                            const studentAttempts = scores.filter(a => a.studentId === student.id);
                            const isLocked = quizLocks.some(lock => lock.studentId === student.id && lock.quizId === quiz.id);

                            return (
                                <tr key={student.id} className="border-t hover:bg-gray-50">
                                    <td className="p-3">{student.firstName} {student.lastName}</td>
                                    {[1, 2, 3].map(attemptNum => {
                                        const attempt = studentAttempts.find(a => a.attemptNumber === attemptNum);
                                        return (
                                            <td key={attemptNum} className="p-3 text-center">
                                                {attempt ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span>{`${attempt.score}/${attempt.totalItems}`}</span>
                                                        {attempt.isLate && (
                                                            <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">LATE</span>
                                                        )}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-center">
                                        {isLocked && (
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-xs font-bold text-white bg-gray-700 px-2 py-1 rounded-full">LOCKED</span>
                                                <button onClick={() => onUnlockQuiz(quiz.id, student.id)} className="p-1 text-gray-400 hover:text-blue-600" title="Unlock Quiz">
                                                    <KeyIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default QuizScoresModal;