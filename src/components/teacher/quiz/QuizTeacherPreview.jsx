import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer'; // Adjust path if needed
import { CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

/**
 * Renders the teacher's preview of a quiz question, showing the correct answer.
 * Replaces the old renderTeacherPreview() function.
 */
export default function QuizTeacherPreview() {
    // Get all necessary state and handlers from context
    const { 
        shuffledQuestions, 
        currentQ, 
        renderQuestionNumber, 
        quiz 
    } = useQuiz();

    const q = shuffledQuestions[currentQ];

    return (
        <>{q ? (
            <div className="p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                {/* Question Text & Number */}
                <div className="font-semibold flex items-start text-lg text-slate-800 mb-1">
                    <span className="text-slate-500 mr-2 flex-shrink-0">{renderQuestionNumber()}.</span>
                    <ContentRenderer text={q.text || q.question || "Question Text Missing"} />
                </div>
                 {/* Points */}
                 <p className="text-xs text-slate-500 mb-3 ml-6">({q.points || 0} points)</p>

                {/* Answer/Rubric Display Section */}
                <div className="mt-4 space-y-2 pl-6">
                    {/* MC Options */}
                    {q.type === 'multiple-choice' && (q.options || []).map((option, idx) => (
                        <div key={idx} className={`flex items-center p-3 rounded-lg text-sm ${idx === q.correctAnswerIndex ? 'bg-green-500/15 text-green-900 font-semibold' : 'bg-slate-200/60 text-slate-700'}`}>
                            {idx === q.correctAnswerIndex && <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />}
                            {idx !== q.correctAnswerIndex && <span className="h-5 w-5 mr-2 flex-shrink-0"></span>}
                            <ContentRenderer text={option.text || option || `Option ${idx+1} Missing`} />
                        </div>
                    ))}
                    {/* ID Answer */}
                    {q.type === 'identification' && (
                        <div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold">
                            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />Correct Answer: <ContentRenderer text={q.correctAnswer || 'N/A'} />
                        </div>
                    )}
                    {/* TF Answer */}
                    {q.type === 'true-false' && (
                        <div className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900 font-semibold">
                            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />Correct Answer: {quiz.language === 'Filipino' ? (q.correctAnswer ? 'Tama' : 'Mali') : String(q.correctAnswer)}
                        </div>
                    )}
                    {/* Matching Pairs */}
                    {q.type === 'matching-type' && (q.prompts || []).map(prompt => {
                        const correctOption = (q.options || []).find(opt => q.correctPairs && opt.id === q.correctPairs[prompt.id]);
                        return (
                            <div key={prompt.id} className="flex items-center p-3 rounded-lg text-sm bg-green-500/15 text-green-900">
                                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                                <span className="font-semibold">{prompt.text || 'Prompt Missing'}</span> <span className="mx-2">→</span> <span>{correctOption?.text || 'Correct Option Missing'}</span>
                            </div>
                        );
                    })}
                     {/* Essay Rubric */}
                    {q.type === 'essay' && (
                        <div className="p-3 rounded-lg bg-blue-500/15 text-blue-900">
                            <p className="font-semibold text-sm mb-2">Essay Rubric</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {(q.rubric || []).map(item => (
                                    <li key={item.id || item.criteria}>{item.criteria || 'Criteria Missing'}: {item.points || 0} pts</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {/* Explanation */}
                {q.explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-300/80 pl-6">
                        <div className="flex items-start gap-2">
                            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-slate-700"><ContentRenderer text={q.explanation} /></div>
                        </div>
                    </div>
                )}
            </div>)
            : (<p className="text-center text-slate-500 p-8">This quiz currently has no questions.</p>)}</>
        );
}