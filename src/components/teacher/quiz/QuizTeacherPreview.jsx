// src/components/teacher/dashboard/widgets/QuizTeacherPreview.jsx
import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer'; 
import { CheckCircleIcon, InformationCircleIcon, ListBulletIcon, KeyIcon } from '@heroicons/react/24/solid';

/**
 * macOS 26 Design Overhaul - Cleaner Layout
 * Removes "Q1" badge and "Question X" title for a more direct view.
 */
export default function QuizTeacherPreview() {
    const { 
        shuffledQuestions, 
        currentQ, 
        quiz 
    } = useQuiz();

    const q = shuffledQuestions[currentQ];

    // --- Shared Styles ---
    const GlassCard = ({ children, className = "" }) => (
        <div className={`relative p-6 sm:p-8 rounded-[32px] 
            bg-white/60 dark:bg-black/40 
            backdrop-blur-2xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            transition-all duration-500 ease-out ${className}`}>
            {children}
        </div>
    );

    const AnswerKeyContainer = ({ children, title = "Correct Answer" }) => (
        <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/10 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
                <KeyIcon className="h-4 w-4" />
                {title}
            </div>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );

    if (!q) {
        return (
            <GlassCard>
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                    <ListBulletIcon className="h-12 w-12 mb-3 opacity-20" />
                    <p className="font-medium">This quiz currently has no questions.</p>
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard>
            {/* --- Question Header (Cleaner) --- */}
            <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                    {/* Question Text as main header */}
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug flex-1">
                        <ContentRenderer text={q.text || q.question || "Question Text Missing"} />
                    </div>
                    
                    {/* Points Pill */}
                    <div className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20 uppercase tracking-wide mt-1">
                        {q.points || 0} Point{(q.points || 0) !== 1 && 's'}
                    </div>
                </div>
            </div>

            {/* --- Answer Display Section --- */}
            <div className="pl-0"> 
                
                {/* Multiple Choice Options */}
                {q.type === 'multiple-choice' && (
                    <div className="space-y-3">
                        {(q.options || []).map((option, idx) => {
                            const isCorrect = idx === q.correctAnswerIndex;
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex items-center p-4 rounded-2xl border transition-all duration-300 ${
                                        isCorrect 
                                        ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-500/30 shadow-sm' 
                                        : 'bg-white/40 dark:bg-white/5 border-transparent hover:bg-white/60 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <div className={`h-6 w-6 mr-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        isCorrect 
                                        ? 'border-green-500 bg-green-500 text-white' 
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}>
                                        {isCorrect && <CheckCircleIcon className="h-4 w-4" />}
                                    </div>
                                    <div className={`font-medium text-sm sm:text-base ${isCorrect ? 'text-green-800 dark:text-green-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                        <ContentRenderer text={option.text || option || `Option ${idx+1} Missing`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Identification Answer */}
                {q.type === 'identification' && (
                    <AnswerKeyContainer>
                        <div className="p-4 rounded-2xl bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-100 font-bold text-lg flex items-center gap-3 shadow-sm">
                            <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            <ContentRenderer text={q.correctAnswer || 'N/A'} />
                        </div>
                    </AnswerKeyContainer>
                )}

                {/* True/False Answer */}
                {q.type === 'true-false' && (
                    <AnswerKeyContainer>
                        <div className="flex gap-3">
                            {[true, false].map((val) => {
                                const isCorrect = q.correctAnswer === val;
                                return (
                                    <div key={String(val)} className={`flex-1 p-5 rounded-2xl border text-center font-bold transition-all ${
                                        isCorrect 
                                        ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 shadow-sm ring-1 ring-green-500/20' 
                                        : 'bg-slate-50/50 dark:bg-white/5 border-transparent text-slate-400 dark:text-slate-600'
                                    }`}>
                                        <div className="text-lg mb-1">
                                            {quiz.language === 'Filipino' ? (val ? 'Tama' : 'Mali') : (val ? 'True' : 'False')}
                                        </div>
                                        {isCorrect && (
                                            <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                                                <CheckCircleIcon className="h-3 w-3" /> Correct
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </AnswerKeyContainer>
                )}

                {/* Matching Pairs */}
                {q.type === 'matching-type' && (
                    <AnswerKeyContainer title="Correct Matches">
                        <div className="grid gap-3">
                            {(q.prompts || []).map(prompt => {
                                const correctOption = (q.options || []).find(opt => q.correctPairs && opt.id === q.correctPairs[prompt.id]);
                                return (
                                    <div key={prompt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 px-1">{prompt.text}</span>
                                        
                                        <div className="hidden sm:block flex-1 mx-4 border-b border-slate-200 dark:border-white/10 border-dashed h-0"></div>
                                        
                                        <div className="flex items-center gap-2 mt-2 sm:mt-0 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-lg text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/20 shadow-sm">
                                            <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <span className="font-bold text-sm">
                                                {correctOption?.text || 'Missing Option'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </AnswerKeyContainer>
                )}

                {/* Essay Rubric */}
                {q.type === 'essay' && (
                    <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/10">
                        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                            <ListBulletIcon className="h-4 w-4" /> Grading Rubric
                        </div>
                        <div className="bg-slate-50/50 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase bg-slate-100/50 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5">
                                    <tr>
                                        <th className="px-6 py-3">Criteria</th>
                                        <th className="px-6 py-3 text-right">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {(q.rubric || []).map(item => (
                                        <tr key={item.id || item.criteria} className="group hover:bg-blue-50/30 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{item.criteria}</td>
                                            <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">{item.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Explanation Dropdown */}
                {q.explanation && (
                    <div className="mt-6 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/20 flex gap-4 text-sm shadow-sm">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-500 h-fit">
                            <InformationCircleIcon className="h-5 w-5" />
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">
                            <span className="block font-bold text-amber-700 dark:text-amber-500 mb-1 text-xs uppercase tracking-wide">
                                Teacher's Explanation
                            </span>
                            <ContentRenderer text={q.explanation} />
                        </div>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}