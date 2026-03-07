import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer'; 
import { 
    CheckCircleIcon, 
    InformationCircleIcon, 
    ListBulletIcon, 
    KeyIcon,
    SparklesIcon
} from '@heroicons/react/24/solid';
import { ArrowRightIcon, PhotoIcon } from '@heroicons/react/24/outline';

/**
 * Android 17 Material You Design Overhaul
 * Features: Tonal Surfaces, Deep Radii, High-Contrast Text, Solid Color Fills
 */
export default function QuizTeacherPreview() {
    const { 
        shuffledQuestions, 
        currentQ, 
        quiz 
    } = useQuiz();

    const q = shuffledQuestions[currentQ];

    if (!q) return null;

    // --- Material You Shared Components ---
    const MaterialCard = ({ children, className = "" }) => (
        <div className={`relative p-6 sm:p-8 rounded-[32px] \n            bg-[#F0F4F8] dark:bg-[#1E1E1E] \n            text-[#1A1C1E] dark:text-[#E3E2E6]\n            transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${className}`}>\n            {children}\n        </div>
    );

    const AnswerTonalCard = ({ children, title = "Correct Answer", icon: Icon = KeyIcon }) => (
        <div className="mt-6 p-5 sm:p-6 bg-white dark:bg-[#2D3033] rounded-[28px] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2.5 mb-4 text-[12px] font-bold text-[#1B5E20] dark:text-[#A5D6A7] uppercase tracking-widest">
                <Icon className="h-5 w-5" />
                <span>{title}</span>
            </div>
            <div className="text-[15px] sm:text-[16px] font-semibold text-[#1A1C1E] dark:text-[#E3E2E6]">
                {children}
            </div>
        </div>
    );

    return (
        <MaterialCard>
            {/* Header Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#001C38] dark:text-[#D3E3FD] text-[12px] font-bold uppercase tracking-widest">
                    {q.type.replace('-', ' ')}
                </span>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#E1E6EB] dark:bg-[#44474A] text-[#1A1C1E] dark:text-[#E3E2E6] text-[12px] font-bold uppercase tracking-widest">
                    {q.points || 1} Pts
                </span>
            </div>

            {/* Question Content */}
            <div className="text-[18px] sm:text-[22px] font-medium leading-relaxed text-[#1A1C1E] dark:text-[#E3E2E6]">
                <ContentRenderer text={q.question || q.text || "No question text provided."} />
            </div>

            {/* Answer Display Section */}
            <div className="mt-8 space-y-4">
                
                {/* 1. Multiple Choice / Identification / Exact Answer */}
                {(q.type === 'multiple-choice' || q.type === 'identification' || q.type === 'exactAnswer') && (
                    <AnswerTonalCard icon={CheckCircleIcon}>
                        {q.type === 'multiple-choice' && typeof q.correctAnswerIndex !== 'undefined' 
                            ? <ContentRenderer text={q.options[q.correctAnswerIndex]?.text || q.options[q.correctAnswerIndex]} /> 
                            : <ContentRenderer text={String(q.correctAnswer)} />
                        }
                    </AnswerTonalCard>
                )}

                {/* 2. True / False */}
                {q.type === 'true-false' && (
                    <AnswerTonalCard icon={CheckCircleIcon}>
                        {String(q.correctAnswer).toUpperCase()}
                    </AnswerTonalCard>
                )}

                {/* 3. Matching Type */}
                {q.type === 'matching' && q.pairs && (
                    <AnswerTonalCard title="Correct Matches">
                        <div className="space-y-3 mt-2">
                            {q.pairs.map((pair, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-[#F0F4F8] dark:bg-[#1E1E1E]">
                                    <div className="flex-1 text-[14px] font-medium text-[#1A1C1E] dark:text-[#E3E2E6]">
                                        <ContentRenderer text={pair.premise} />
                                    </div>
                                    <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#2D3033] shadow-sm flex-shrink-0">
                                        <ArrowRightIcon className="w-4 h-4 text-[#74777F] dark:text-[#8E9099]" />
                                    </div>
                                    <div className="flex-1 text-[14px] font-bold text-[#005AC1] dark:text-[#A8C7FA]">
                                        <ContentRenderer text={pair.answer} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnswerTonalCard>
                )}

                {/* 4. Image Labeling */}
                {q.type === 'image-labeling' && q.parts && (
                    <AnswerTonalCard title="Diagram Labels" icon={PhotoIcon}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            {q.parts.map((part, i) => (
                                <div key={i} className="flex items-center gap-4 p-3.5 rounded-[20px] bg-[#F0F4F8] dark:bg-[#1E1E1E]">
                                    <div className="w-8 h-8 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#001C38] dark:text-[#D3E3FD] flex items-center justify-center text-[13px] font-bold flex-shrink-0">
                                        {part.number || i + 1}
                                    </div>
                                    <div className="text-[15px] font-semibold text-[#1A1C1E] dark:text-[#E3E2E6]">
                                        {part.answer}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnswerTonalCard>
                )}

                {/* 5. Essay / Rubric */}
                {q.type === 'essay' && q.rubric && (
                    <div className="mt-6 p-5 sm:p-6 bg-white dark:bg-[#2D3033] rounded-[28px] shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-[12px] font-bold text-[#005AC1] dark:text-[#A8C7FA] uppercase tracking-widest">
                            <SparklesIcon className="h-5 w-5" />
                            <span>Grading Rubric</span>
                        </div>
                        <div className="space-y-3">
                            {q.rubric.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-4 rounded-[20px] bg-[#F0F4F8] dark:bg-[#1E1E1E]">
                                    <span className="text-[14px] font-medium text-[#1A1C1E] dark:text-[#E3E2E6]">
                                        {item.criteria}
                                    </span>
                                    <span className="text-[14px] font-bold text-[#005AC1] dark:text-[#A8C7FA] bg-[#D3E3FD] dark:bg-[#004A77] px-3 py-1 rounded-full ml-4 flex-shrink-0">
                                        {item.points} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Teacher Explanation Card */}
                {q.explanation && (
                    <div className="mt-6 p-5 sm:p-6 rounded-[28px] bg-[#FFF8E1] dark:bg-[#4D4000] flex gap-4 text-sm transition-colors">
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-10 h-10 rounded-full bg-[#FFE082] dark:bg-[#5C4D00] flex items-center justify-center">
                                <InformationCircleIcon className="h-6 w-6 text-[#5C4D00] dark:text-[#FFE082]" />
                            </div>
                        </div>
                        <div className="text-[#5C4D00] dark:text-[#FFE082]">
                            <span className="block font-bold mb-1.5 text-[12px] uppercase tracking-widest opacity-80">
                                Teacher's Explanation
                            </span>
                            <div className="text-[14px] leading-relaxed font-medium">
                                <ContentRenderer text={q.explanation} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MaterialCard>
    );
}