import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import Spinner from '../../common/Spinner'; 
import ContentRenderer from '../ContentRenderer'; 
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';

/**
 * Renders the UI for the current active question (Essay, Matching, MC, TF, ID).
 */
export default function QuizQuestion() {
    // Get all necessary state and handlers from context
    const {
        currentQ,
        shuffledQuestions,
        userAnswers,
        isTeacherView,
        currentQuestionAttempted,
        handleAnswer,
        setUserAnswers,
        handleConfirmMatchingAnswer,
        quiz,
        matchingResult,
    } = useQuiz();

    const question = shuffledQuestions[currentQ];

    if (!question) {
        return <div className="flex justify-center items-center p-12"><Spinner /></div>;
    }

    // Determine if input should be disabled
    const isAutoGraded = ['multiple-choice', 'true-false', 'identification', 'exactAnswer', 'matching-type'].includes(question.type);
    const isDisabled = isTeacherView || (isAutoGraded && currentQuestionAttempted && question.type !== 'matching-type');
    const isMatchingDisabled = isTeacherView || (question.type === 'matching-type' && currentQuestionAttempted);

    // --- Essay UI ---
    if (question.type === 'essay') {
        return (
            <div className="space-y-6">
                {/* Prompt Card */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
                    <div className="prose prose-slate prose-lg dark:prose-invert leading-relaxed">
                        <ContentRenderer text={question.text || question.question || "Essay Prompt Missing"} />
                    </div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 mt-3 uppercase tracking-wider">
                        ({question.points || 0} points)
                    </span>
                </div>

                {/* Rubric */}
                {(question.rubric && question.rubric.length > 0) && (
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2 uppercase tracking-wide">Grading Rubric</p>
                        <ul className="space-y-1.5">
                            {question.rubric.map(item => (
                                <li key={item.id || item.criteria} className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                                    <span>{item.criteria || "Unnamed Criterion"}</span>
                                    <span className="font-mono font-semibold">{item.points || 0} pts</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Text Area */}
                <textarea
                    placeholder="Type your answer here..."
                    value={userAnswers[currentQ] || ''}
                    onChange={e => handleAnswer(e.target.value, 'essay')}
                    disabled={isTeacherView}
                    className="w-full h-64 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-inner resize-none transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base leading-relaxed"
                    aria-label={`Answer for essay question ${currentQ + 1}`}
                />
            </div>
        );
    }

    // --- Matching Type UI ---
    if (question.type === 'matching-type') {
        const currentMatches = userAnswers[currentQ] || {};
        const matchedOptionIds = Object.values(currentMatches);
         const prompts = question.prompts || [];
         const options = question.options || [];
        const allPromptsMatched = prompts.length > 0 && prompts.every(p => currentMatches[p.id]);

        // Draggable Option Component
        const DraggableOption = ({ id, text }) => {
            const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `option-${id}` });
            const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 } : undefined;
            return (
                <div
                    ref={setNodeRef}
                    style={style}
                    {...listeners}
                    {...attributes}
                    className={`
                        p-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-grab active:cursor-grabbing touch-none select-none
                        ${isDragging 
                            ? 'bg-blue-600 text-white shadow-xl scale-105 ring-2 ring-blue-300 z-50' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                        }
                        ${isMatchingDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    aria-disabled={isMatchingDisabled}
                >
                    {text || "Option Text Missing"}
                </div>
            );
        };

        // Droppable Prompt Component
        const DroppablePrompt = ({ id, text, matchedOption, onDrop }) => {
            const { isOver, setNodeRef } = useDroppable({ id: `prompt-${id}` });
            return (
                <div className="flex items-stretch gap-3 mb-3">
                    {/* Prompt Text */}
                    <div className="flex-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm flex items-center font-medium">
                        {text || "Prompt Text Missing"}
                    </div>
                    
                    {/* Drop Zone */}
                    <div
                        ref={setNodeRef}
                        onClick={() => !isMatchingDisabled && onDrop(id)}
                        className={`
                            flex-1 min-h-[3.5rem] p-1.5 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center relative
                            ${isOver 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
                            }
                            ${isMatchingDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-500'}
                        `}
                    >
                        {matchedOption ? (
                            <div className="w-full h-full flex items-center justify-center p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 rounded-lg text-sm font-semibold shadow-sm">
                                {matchedOption.text || "Matched Option Missing"}
                            </div>
                        ) : (
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide pointer-events-none">Drop Here</span>
                        )}
                    </div>
                </div>
            );
        };

        const handleDragEnd = (event) => {
             if (isMatchingDisabled) return;
            const { active, over } = event;
            if (over && active?.id.startsWith('option-') && over?.id.startsWith('prompt-')) {
                const optionId = active.id.replace('option-', '');
                const promptId = over.id.replace('prompt-', '');
                const newMatches = { ...currentMatches };
                const existingMatchKey = Object.keys(newMatches).find(key => newMatches[key] === optionId);
                if (existingMatchKey) delete newMatches[existingMatchKey];
                newMatches[promptId] = optionId;
                handleAnswer(newMatches, 'matching-type');
            }
        };

        const unmatchItem = (promptId) => {
            if (isMatchingDisabled) return;
            const newMatches = { ...currentMatches };
            delete newMatches[promptId];
            handleAnswer(newMatches, 'matching-type');
        };

        return (
            <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                {/* Instruction */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm mb-6">
                    <div className="text-base text-slate-800 dark:text-slate-200 font-medium">
                        <ContentRenderer text={question.text || question.question || "Matching Instructions Missing"} />
                    </div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wider">
                        ({question.points || 0} points total)
                    </span>
                </div>

                {/* Columns */}
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Prompts (Droppable) */}
                    <div className="w-full md:w-2/3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Prompts</h4>
                        <div className="space-y-2">
                            {prompts.map((prompt, index) => {
                                const matchedOptionId = currentMatches[prompt.id];
                                const matchedOption = options.find(opt => opt.id === matchedOptionId);
                                return <DroppablePrompt key={prompt.id || index} id={prompt.id} text={prompt.text} matchedOption={matchedOption} onDrop={unmatchItem} />;
                            })}
                        </div>
                    </div>
                    
                    {/* Options (Draggable) */}
                    <div className="w-full md:w-1/3">
                        <div className="sticky top-4 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Options Pool</p>
                            <div className="space-y-2 min-h-[200px]">
                                {options
                                    .filter(opt => !matchedOptionIds.includes(opt.id))
                                    .map((option, index) => <DraggableOption key={option.id || index} id={option.id} text={option.text} />)}
                                
                                {options.filter(opt => !matchedOptionIds.includes(opt.id)).length === 0 && (
                                    <div className="text-center text-sm text-slate-400 italic py-8">All options used</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Confirm Button */}
                {!isMatchingDisabled && allPromptsMatched && (
                    <div className="mt-8 text-center">
                        <button
                            onClick={handleConfirmMatchingAnswer}
                            className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all"
                        >
                            Confirm Matches
                        </button>
                    </div>
                )}

                {/* Feedback after Confirm */}
                {matchingResult && (
                    <div className="mt-6 p-4 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                        <p className="text-lg font-medium text-emerald-900 dark:text-emerald-100">
                            You correctly matched <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xl mx-1">{matchingResult.correct}</span> 
                            out of <span className="font-bold">{matchingResult.total}</span> items.
                        </p>
                        {question.explanation && (
                             <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800/50 text-sm text-emerald-800 dark:text-emerald-200">
                                <span className="font-bold uppercase text-xs opacity-70 mr-2">Explanation:</span> 
                                <ContentRenderer text={question.explanation}/>
                             </div>
                        )}
                    </div>
                )}
            </DndContext>
        );
    }

    // --- True/False UI ---
    if (question.type === 'true-false') {
        const trueLabel = quiz.language === 'Filipino' ? 'Tama' : 'True';
        const falseLabel = quiz.language === 'Filipino' ? 'Mali' : 'False';
        const options = [{ label: trueLabel, value: true }, { label: falseLabel, value: false }];
        return (
            <div className="max-w-2xl mx-auto space-y-8 py-4">
                {/* Question Card */}
                <div className="text-center space-y-4">
                    <div className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-relaxed">
                        <ContentRenderer text={question.text || question.question || "True/False Statement Missing"} />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {question.points || 0} Points
                    </span>
                </div>

                {/* Big TF Buttons */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    {options.map((option) => {
                        const isSelected = userAnswers[currentQ] === option.value;
                        return (
                            <button
                                key={option.label}
                                onClick={() => handleAnswer(option.value, 'true-false')}
                                disabled={isDisabled}
                                className={`
                                    relative h-32 sm:h-40 rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-300 flex flex-col items-center justify-center gap-2 border-2
                                    ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1 hover:shadow-xl active:scale-95 cursor-pointer'}
                                    ${isSelected 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500'
                                    }
                                `}
                                aria-pressed={isSelected}
                            >
                                <span>{option.label}</span>
                                {isSelected && (
                                    <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- Identification UI ---
    if (question.type === 'identification') {
        return (
            <div className="space-y-6 max-w-3xl mx-auto">
                {/* Choices Box */}
                {question.choicesBox && question.choicesBox.length > 0 && (
                    <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 text-center">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Word Bank</h4>
                        <div className="flex flex-wrap justify-center gap-2">
                            {question.choicesBox.map((choice, i) => (
                                <span key={i} className="px-3 py-1.5 bg-white dark:bg-indigo-900/50 rounded-lg text-indigo-900 dark:text-indigo-100 text-sm font-medium shadow-sm border border-indigo-100 dark:border-white/5">
                                    {choice}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Question Text */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
                    <div className="text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        <ContentRenderer text={question.text || question.question || "Question Text Missing"} />
                    </div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 mt-3 uppercase tracking-wider">
                        ({question.points || 0} points)
                    </span>
                </div>

                {/* Answer Input */}
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Type your answer exactly..."
                        value={userAnswers[currentQ] || ''}
                        onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })}
                        disabled={isDisabled}
                        className="w-full p-4 pl-5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-lg focus:ring-0 focus:border-blue-500 transition-all shadow-sm group-hover:shadow-md disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-black/40"
                        aria-label={`Answer for identification question ${currentQ + 1}`}
                    />
                </div>
                
                {/* Submit Button */}
                {!isDisabled && (
                    <button
                        onClick={() => handleAnswer(userAnswers[currentQ] || '', 'identification')}
                        className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all"
                    >
                        Submit Answer
                    </button>
                )}
            </div>
        );
    }

    // --- Multiple Choice UI (Fallback) ---
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Question Text */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
                <div className="text-lg sm:text-xl font-medium text-slate-900 dark:text-white leading-relaxed">
                    <ContentRenderer text={question.text || question.question || "Question Text Missing"} />
                </div>
                <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 mt-3 uppercase tracking-wider">
                    ({question.points || 0} points)
                </span>
            </div>

            {/* Options Grid */}
            <div className="grid gap-3">
                {(question.options || []).map((option, idx) => {
                    const isSelected = userAnswers[currentQ] === idx;
                    return (
                        <label 
                            key={idx} 
                            className={`
                                relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                                ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'}
                                ${isSelected 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 z-10' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }
                            `}
                        >
                            <input
                                type="radio"
                                name={`question-${currentQ}`}
                                value={idx}
                                checked={isSelected}
                                onChange={() => handleAnswer(idx, 'multiple-choice')}
                                disabled={isDisabled}
                                className="absolute opacity-0 w-0 h-0"
                                aria-label={`Option ${idx + 1}`}
                            />
                            
                            {/* Custom Radio Circle */}
                            <div className={`
                                flex-shrink-0 w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors
                                ${isSelected 
                                    ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500' 
                                    : 'border-slate-300 dark:border-slate-500 group-hover:border-blue-400'
                                }
                            `}>
                                <div className={`w-2 h-2 rounded-full bg-white transform transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} />
                            </div>

                            {/* Option Text */}
                            <span className={`text-base ${isSelected ? 'font-semibold text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                <ContentRenderer text={option.text || option || `Option ${idx + 1} Missing`} />
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}