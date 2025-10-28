import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import Spinner from '../../common/Spinner'; // Adjust path if needed
import ContentRenderer from '../ContentRenderer'; // Adjust path if needed
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';

/**
 * Renders the UI for the current active question (Essay, Matching, MC, TF, ID).
 * Replaces the old renderQuestion() function.
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
        return <div className="text-center p-8"><Spinner /></div>;
    }

    // Determine if input should be disabled
    const isAutoGraded = ['multiple-choice', 'true-false', 'identification', 'exactAnswer', 'matching-type'].includes(question.type);
    const isDisabled = isTeacherView || (isAutoGraded && currentQuestionAttempted && question.type !== 'matching-type');
    const isMatchingDisabled = isTeacherView || (question.type === 'matching-type' && currentQuestionAttempted);

    // --- Essay UI ---
    if (question.type === 'essay') {
        // ... (No changes to this part)
        return (
            <div>
                {/* Prompt */}
                <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                    <ContentRenderer text={question.text || question.question || "Essay Prompt Missing"} />
                    <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points)</span>
                </div>
                {/* Rubric */}
                {(question.rubric && question.rubric.length > 0) && (
                    <div className="mb-4 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl">
                        <p className="text-sm font-bold text-slate-700 mb-2">Rubric</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                            {question.rubric.map(item => (
                                <li key={item.id || item.criteria}>
                                    <span className="font-semibold">{item.criteria || "Unnamed Criterion"}</span>: {item.points || 0} pts
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
                    className="w-full h-48 p-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
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
                    // --- MODIFIED: Added 'touch-none' and 'select-none' ---
                    className={`p-2 bg-neumorphic-base rounded-lg text-slate-700 text-sm transition-shadow ${isMatchingDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-grab active:cursor-grabbing shadow-neumorphic active:shadow-neumorphic-inset'} ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''} touch-none select-none`}
                    // --- END MODIFICATION ---
                    aria-disabled={isMatchingDisabled}
                >
                    {text || "Option Text Missing"}
                </div>
            );
        };

        // Droppable Prompt Component
        // ... (No changes to this part)
        const DroppablePrompt = ({ id, text, matchedOption, onDrop }) => {
            const { isOver, setNodeRef } = useDroppable({ id: `prompt-${id}` });
            return (
                <div className="flex items-center gap-2">
                    {/* Prompt Text */}
                    <div className="flex-1 p-2 bg-neumorphic-base shadow-neumorphic-inset rounded-lg text-slate-800 font-medium text-sm min-h-[3rem] flex items-center">
                        {text || "Prompt Text Missing"}
                    </div>
                    {/* Drop Zone */}
                    <div
                        ref={setNodeRef}
                        onClick={() => !isMatchingDisabled && onDrop(id)}
                        className={`flex-1 h-12 p-1 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${isOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300'} ${isMatchingDisabled ? 'cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
                        aria-label={`Drop area for prompt: ${text}`}
                    >
                        {matchedOption ? (
                            <div className={`p-1 bg-slate-200 shadow-inner rounded-md w-full text-center text-slate-800 text-sm ${!isMatchingDisabled ? 'cursor-pointer' : ''}`}>
                                {matchedOption.text || "Matched Option Missing"}
                            </div>
                            ) : (
                            <span className="text-xs text-slate-400">{isMatchingDisabled ? 'Unanswered' : 'Drop here'}</span>
                            )
                        }
                    </div>
                </div>
            );
        };

        // Drag End Handler
        // ... (No changes to this part)
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

        // Unmatch Handler
        // ... (No changes to this part)
        const unmatchItem = (promptId) => {
            if (isMatchingDisabled) return;
            const newMatches = { ...currentMatches };
            delete newMatches[promptId];
            handleAnswer(newMatches, 'matching-type');
        };

        // ... (No changes to the rest of the file)
        return (
            <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                {/* Instruction */}
                <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                    <ContentRenderer text={question.text || question.question || "Matching Instructions Missing"} />
                    <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points total)</span>
                </div>
                {/* Columns */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Prompts (Droppable) */}
                    <div className="w-full md:w-2/3 space-y-2">
                        {prompts.map((prompt, index) => {
                            const matchedOptionId = currentMatches[prompt.id];
                            const matchedOption = options.find(opt => opt.id === matchedOptionId);
                            return <DroppablePrompt key={prompt.id || index} id={prompt.id} text={prompt.text} matchedOption={matchedOption} onDrop={unmatchItem} />;
                        })}
                    </div>
                    {/* Options (Draggable) */}
                    <div className="w-full md:w-1/3 space-y-2 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl">
                        <p className="text-center text-xs text-slate-500 font-semibold mb-2">DRAGGABLE OPTIONS</p>
                        {options
                            .filter(opt => !matchedOptionIds.includes(opt.id))
                            .map((option, index) => <DraggableOption key={option.id || index} id={option.id} text={option.text} />)}
                    </div>
                </div>
                {/* Confirm Button */}
                {!isMatchingDisabled && allPromptsMatched && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={handleConfirmMatchingAnswer}
                            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all"
                        >
                            Confirm Answer
                        </button>
                    </div>
                )}
                {/* Feedback after Confirm (This was in the original renderQuestion, so it stays) */}
                {matchingResult && (
                    <div className="mt-4 p-3 text-center font-semibold text-lg rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                        You correctly matched <span className="text-green-600">{matchingResult.correct}</span> out of <span className="text-slate-800">{matchingResult.total}</span> items.
                        {question.explanation && (
                             <p className="text-xs italic mt-2 text-slate-600">Explanation: <ContentRenderer text={question.explanation}/></p>
                        )}
                    </div>
                )}
            </DndContext>
        );
    }

    // --- True/False UI ---
    if (question.type === 'true-false') {
        // ... (No changes to this part)
        const trueLabel = quiz.language === 'Filipino' ? 'Tama' : 'True';
        const falseLabel = quiz.language === 'Filipino' ? 'Mali' : 'False';
        const options = [{ label: trueLabel, value: true }, { label: falseLabel, value: false }];
        return (
            <div>
                {/* Question Text */}
                <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                    <ContentRenderer text={question.text || question.question || "True/False Statement Missing"} />
                    <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points)</span>
                </div>
                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    {options.map((option) => (
                        <button
                            key={option.label}
                            onClick={() => handleAnswer(option.value, 'true-false')}
                            disabled={isDisabled}
                            className={`w-full p-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-neumorphic-base ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'} ${userAnswers[currentQ] === option.value ? 'shadow-neumorphic-inset text-blue-700' : 'shadow-neumorphic text-slate-700'}`}
                            aria-pressed={userAnswers[currentQ] === option.value}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // --- Multiple Choice & Identification UI (Fallback) ---
    // ... (No changes to this part)
    return (
        <div>
            {/* Question Text */}
            <div className="font-semibold text-base mb-4 bg-neumorphic-base p-3 rounded-2xl shadow-neumorphic-inset">
                <ContentRenderer text={question.text || question.question || "Question Text Missing"} />
                <span className="block text-xs text-slate-500 mt-1">({question.points || 0} points)</span>
            </div>

            {/* Options (MC) or Input (ID) */}
            {question.type === 'multiple-choice' ? (
                <div className="space-y-2">
                    {(question.options || []).map((option, idx) => (
                        <label key={idx} className={`relative flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 bg-neumorphic-base ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:shadow-neumorphic-inset'} ${userAnswers[currentQ] === idx ? 'shadow-neumorphic-inset' : 'shadow-neumorphic'}`}>
                            <input
                                type="radio"
                                name={`question-${currentQ}`}
                                value={idx}
                                checked={userAnswers[currentQ] === idx}
                                onChange={() => handleAnswer(idx, 'multiple-choice')}
                                disabled={isDisabled}
                                className="absolute opacity-0 w-0 h-0 peer"
                                aria-label={`Option ${idx + 1}`}
                            />
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-400 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-neumorphic-base flex items-center justify-center transition-colors ${userAnswers[currentQ] === idx ? 'bg-blue-600 border-blue-600' : 'bg-neumorphic-inset'}`} aria-hidden="true">
                                 {userAnswers[currentQ] === idx && <span className="w-2 h-2 rounded-full bg-white"></span>}
                            </span>
                            <span className="text-sm text-slate-700"><ContentRenderer text={option.text || option || `Option ${idx + 1} Missing`} /></span>
                        </label>
                    ))}
                </div>
            ) : ( // Identification or ExactAnswer
                <>
                    <input
                        type="text"
                        placeholder="Type your answer"
                        value={userAnswers[currentQ] || ''}
                        onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })}
                        disabled={isDisabled}
                        className="w-full p-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
                        aria-label={`Answer for identification question ${currentQ + 1}`}
                    />
                    {!isDisabled && (
                        <button
                            onClick={() => handleAnswer(userAnswers[currentQ] || '', 'identification')}
                            className="mt-4 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all"
                        >
                            Submit Answer
                        </button>
                    )}
                </>
            )}
        </div>
    );
}