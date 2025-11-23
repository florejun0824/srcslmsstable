import React, { useState, useRef } from 'react';
import { useQuiz } from '../ViewQuizModal';
import Spinner from '../../common/Spinner'; 
import ContentRenderer from '../ContentRenderer'; 
import { 
    DndContext, 
    useDraggable, 
    useDroppable, 
    closestCenter,
    DragOverlay,
    defaultDropAnimationSideEffects 
} from '@dnd-kit/core';
import { 
    MagnifyingGlassPlusIcon, 
    MagnifyingGlassMinusIcon, 
    ArrowsPointingOutIcon,
    ListBulletIcon,
    PhotoIcon 
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

// --- VIEW SWITCHING IMPORTS ---
import QuizQuestionFeedback from './QuizQuestionFeedback';
import QuizResultsView from './QuizResultsView';
import QuizReviewView from './QuizReviewView';
import QuizLockedView from './QuizLockedView';
import QuizNoAttemptsView from './QuizNoAttemptsView';

/**
 * QuizQuestion.jsx - The core question renderer for students.
 */
export default function QuizContent() {
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
        
        // New props from hook
        questionResult,
        score,
        showReview,
        isLocked,
        attemptsTaken,
        maxAttempts
    } = useQuiz();

    // --- STATE MANAGEMENT ---
    const [activeLabelIndex, setActiveLabelIndex] = useState(null);
    const [imageScale, setImageScale] = useState(1);
    const imageContainerRef = useRef(null);
    const [activeId, setActiveId] = useState(null); // For DragOverlay

    // =========================================================
    // VIEW SWITCHING LOGIC
    // =========================================================

    if (isLocked) return <QuizLockedView />;

    if (score !== null) {
        if (showReview) return <QuizReviewView />;
        return <QuizResultsView />;
    }

    if (questionResult || matchingResult) {
        return <QuizQuestionFeedback />;
    }

    // 5. Otherwise -> Render Question Input (Essay, Matching, MC, etc.)
    const question = shuffledQuestions[currentQ];

    if (!question) {
        return (
            <div className="flex justify-center items-center h-full min-h-[300px]">
                <Spinner />
            </div>
        );
    }

    const isAutoGraded = ['multiple-choice', 'true-false', 'identification', 'exactAnswer', 'matching-type', 'image-labeling'].includes(question.type);
    const isDisabled = isTeacherView || (isAutoGraded && currentQuestionAttempted && question.type !== 'matching-type');

    // --- IMAGE LABELING HELPERS ---
    const handleLabelInput = (partIndex, value) => {
        const currentAnswers = userAnswers[currentQ] || {};
        const newAnswers = { ...currentAnswers, [partIndex]: value };
        setUserAnswers(prev => ({
            ...prev,
            [currentQ]: newAnswers
        }));
    };

    const handleZoom = (direction) => {
        setImageScale(prev => {
            const newScale = direction === 'in' ? prev + 0.25 : prev - 0.25;
            return Math.min(Math.max(1, newScale), 4); 
        });
    };

    const handleResetZoom = () => setImageScale(1);

    const scrollToInput = (index) => {
        setActiveLabelIndex(index);
        const el = document.getElementById(`label-input-${index}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
        }
    };

    // --- MATCHING TYPE COMPONENTS ---
    const DraggableOption = ({ id, text, isMatched }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ 
            id: `option-${id}`,
            data: { text, type: 'option' },
            disabled: isTeacherView || (question.type === 'matching-type' && matchingResult)
        });
        
        if (isMatched) return null; 

        return (
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                className={`
                    p-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-grab active:cursor-grabbing touch-none select-none
                    ${isDragging 
                        ? 'opacity-30' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }
                `}
            >
                <ContentRenderer text={text || "Option"} />
            </div>
        );
    };

    const DroppablePrompt = ({ id, text, matchedOption, onDropRemove }) => {
        const { isOver, setNodeRef } = useDroppable({ id: `prompt-${id}` });
        const isFinished = !!matchingResult;

        return (
            <div className="flex items-stretch gap-3 mb-3">
                <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm flex items-center font-medium shadow-sm">
                    <ContentRenderer text={text || "Prompt"} />
                </div>
                
                <div
                    ref={setNodeRef}
                    onClick={() => !isFinished && matchedOption && onDropRemove(id)}
                    className={`
                        flex-1 min-h-[3.5rem] p-1.5 rounded-2xl border-2 border-dashed transition-all duration-200 flex items-center justify-center relative
                        ${isOver 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800' 
                            : 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
                        }
                        ${matchedOption ? 'border-solid border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900' : ''}
                        ${!isFinished && matchedOption ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 group' : ''}
                    `}
                >
                    {matchedOption ? (
                        <div className="w-full h-full flex items-center justify-center p-2 text-center">
                            <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-red-500 transition-colors">
                                <ContentRenderer text={matchedOption.text} />
                            </span>
                            {!isFinished && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <XCircleIcon className="w-6 h-6 text-red-500 bg-white dark:bg-slate-900 rounded-full" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide pointer-events-none">Drop Answer</span>
                    )}
                </div>
            </div>
        );
    };

    // --- MATCHING LOGIC ---
    const currentMatches = userAnswers[currentQ] || {};
    const prompts = question.prompts || [];
    const options = question.options || [];
    
    const handleDragStart = (event) => setActiveId(event.active.id);
    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        
        if (isTeacherView || matchingResult) return;

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
    
    const handleUnmatch = (promptId) => {
        if (isTeacherView || matchingResult) return;
        const newMatches = { ...currentMatches };
        delete newMatches[promptId];
        handleAnswer(newMatches, 'matching-type');
    };

    const allPromptsMatched = prompts.length > 0 && prompts.every(p => currentMatches[p.id]);

    // =========================================================================
    // RENDER QUESTIONS
    // =========================================================================

    // 1. ESSAY
    if (question.type === 'essay') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 sm:p-8 rounded-[24px] border border-white/40 dark:border-white/5 shadow-sm">
                    <div className="prose prose-lg prose-slate dark:prose-invert max-w-none leading-relaxed">
                        <ContentRenderer text={question.text || question.question || "Essay Prompt Missing"} />
                    </div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 mt-4 uppercase tracking-wider">
                        Maximum Score: {question.points || 0} points
                    </span>
                </div>

                {(question.rubric && question.rubric.length > 0) && (
                    <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-[20px] border border-blue-100 dark:border-blue-800/30">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                            <ListBulletIcon className="w-4 h-4" /> Grading Criteria
                        </p>
                        <ul className="space-y-2">
                            {question.rubric.map((item, idx) => (
                                <li key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                                    <span className="font-medium text-slate-700 dark:text-slate-200"><ContentRenderer text={item.criteria} /></span>
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-black/20 px-2 py-1 rounded-md">{item.points} pts</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="relative group">
                    <textarea
                        placeholder="Type your answer here..."
                        value={userAnswers[currentQ] || ''}
                        onChange={e => handleAnswer(e.target.value, 'essay')}
                        // FIX: Removed "|| currentQuestionAttempted" so typing isn't disabled
                        disabled={isTeacherView} 
                        className="w-full h-80 p-6 rounded-[24px] bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-inner resize-none transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base leading-relaxed"
                    />
                    {!isTeacherView && !currentQuestionAttempted && (
                        <div className="absolute bottom-4 right-4 text-xs text-slate-400 font-medium pointer-events-none">
                            {userAnswers[currentQ]?.length || 0} chars
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. MATCHING TYPE
    if (question.type === 'matching-type') {
        const matchedOptionIds = Object.values(currentMatches);
        return (
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-5 rounded-[24px] border border-white/40 dark:border-white/5 shadow-sm">
                        <div className="text-lg text-slate-900 dark:text-white font-medium">
                            <ContentRenderer text={question.text || "Match the items correctly."} />
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        <div className="w-full lg:w-2/3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Prompts</h4>
                            <div className="space-y-3">
                                {prompts.map((prompt) => {
                                    const matchedOptionId = currentMatches[prompt.id];
                                    const matchedOption = options.find(opt => opt.id === matchedOptionId);
                                    return <DroppablePrompt key={prompt.id} id={prompt.id} text={prompt.text} matchedOption={matchedOption} onDropRemove={handleUnmatch} />;
                                })}
                            </div>
                        </div>
                        
                        <div className="w-full lg:w-1/3">
                            <div className="lg:sticky lg:top-4 bg-slate-100/80 dark:bg-[#1A1D24]/80 backdrop-blur-lg p-5 rounded-[24px] border border-slate-200/50 dark:border-white/5 shadow-inner">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Drag Options</h4>
                                <div className="flex flex-col gap-2 min-h-[150px]">
                                    {options
                                        .filter(opt => !matchedOptionIds.includes(opt.id))
                                        .map((option) => <DraggableOption key={option.id} id={option.id} text={option.text} />)}
                                    
                                    {options.filter(opt => !matchedOptionIds.includes(opt.id)).length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm italic">
                                            <CheckCircleIcon className="w-8 h-8 mb-2 text-green-500/50" />
                                            All items placed
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isTeacherView && !matchingResult && allPromptsMatched && (
                        <div className="flex justify-center pt-6">
                            <button
                                onClick={handleConfirmMatchingAnswer}
                                className="px-10 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all text-lg"
                            >
                                Submit Matches
                            </button>
                        </div>
                    )}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="p-3 rounded-xl bg-blue-600 text-white shadow-2xl scale-105 font-medium text-sm border-2 border-blue-400 cursor-grabbing">
                            <ContentRenderer text={options.find(o => `option-${o.id}` === activeId)?.text || "Option"} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        );
    }

    // 3. IMAGE LABELING
    if (question.type === 'image-labeling') {
        const parts = question.parts || [];
        const currentAnswers = userAnswers[currentQ] || {};

        return (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-[24px] border border-white/40 dark:border-white/5 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                        <PhotoIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-lg text-slate-900 dark:text-white font-medium leading-snug">
                            <ContentRenderer text={question.text || "Identify the labelled parts in the diagram."} />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Click the numbered pins on the image or select the inputs below to answer.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="w-full lg:w-2/3 bg-black/5 dark:bg-black/40 rounded-[24px] overflow-hidden border border-slate-200 dark:border-white/10 relative group shadow-inner">
                        <div 
                            ref={imageContainerRef}
                            className="w-full h-[400px] sm:h-[500px] overflow-auto custom-scrollbar flex items-center justify-center bg-pattern"
                            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        >
                            <div className="relative transition-transform duration-200 ease-out" style={{ transform: `scale(${imageScale})`, transformOrigin: 'center' }}>
                                <img 
                                    src={question.image} 
                                    alt="Diagram" 
                                    className="max-w-full h-auto object-contain select-none pointer-events-none shadow-xl rounded-lg" 
                                />
                                {parts.map((part, idx) => {
                                    const hasAnswer = !!currentAnswers[idx];
                                    const isActive = activeLabelIndex === idx;
                                    return (
                                        <button
                                            key={part.id}
                                            onClick={(e) => { e.stopPropagation(); scrollToInput(idx); }}
                                            className={`
                                                absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center rounded-full font-bold text-sm shadow-lg border-2 transition-all duration-200
                                                ${isActive 
                                                    ? 'bg-[#007AFF] border-white text-white z-20 scale-125 ring-4 ring-blue-500/30' 
                                                    : hasAnswer 
                                                        ? 'bg-green-500 border-white text-white hover:scale-110' 
                                                        : 'bg-white dark:bg-slate-800 border-slate-300 text-slate-600 hover:scale-110'
                                                }
                                            `}
                                            style={{ left: `${part.x}%`, top: `${part.y}%` }}
                                            title={`Label Part ${part.number}`}
                                        >
                                            {part.number}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                            <div className="flex bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-full shadow-lg p-1 border border-black/5">
                                <button onClick={() => handleZoom('out')} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300"><MagnifyingGlassMinusIcon className="w-5 h-5" /></button>
                                <div className="w-px bg-slate-200 dark:bg-white/10 my-1"></div>
                                <button onClick={handleResetZoom} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300"><ArrowsPointingOutIcon className="w-5 h-5" /></button>
                                <div className="w-px bg-slate-200 dark:bg-white/10 my-1"></div>
                                <button onClick={() => handleZoom('in')} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300"><MagnifyingGlassPlusIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-1/3 flex flex-col gap-4 h-[400px] sm:h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {parts.map((part, idx) => (
                            <div 
                                key={part.id} 
                                id={`label-input-${idx}`}
                                className={`
                                    flex items-center gap-3 p-4 rounded-[20px] border-2 transition-all duration-200 group cursor-text
                                    ${activeLabelIndex === idx 
                                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 ring-2 ring-blue-500/20' 
                                        : 'bg-white dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                    }
                                `}
                                onClick={() => setActiveLabelIndex(idx)}
                            >
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-sm transition-colors
                                    ${activeLabelIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'}
                                `}>
                                    {part.number}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Part {part.number}</label>
                                    <input 
                                        type="text" 
                                        value={currentAnswers[idx] || ''}
                                        onChange={(e) => handleLabelInput(idx, e.target.value)}
                                        onFocus={() => setActiveLabelIndex(idx)}
                                        disabled={isDisabled}
                                        placeholder="Type answer..."
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-900 dark:text-white font-semibold text-lg placeholder-slate-300 dark:placeholder-slate-600"
                                    />
                                </div>
                                {currentAnswers[idx] && <CheckCircleIcon className="w-6 h-6 text-green-500 opacity-50" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 4. MULTIPLE CHOICE / TRUE FALSE / IDENTIFICATION
    return (
        <div className="max-w-3xl mx-auto space-y-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-xl p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-70"></div>
                
                <div className="flex justify-between items-start mb-6">
                     <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        {question.points || 1} Point{question.points !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white leading-relaxed">
                    <ContentRenderer text={question.text || question.question || "Question Text Missing"} />
                </div>
            </div>

            <div className="grid gap-4">
                {question.type === 'multiple-choice' && (question.options || []).map((option, idx) => {
                    const isSelected = userAnswers[currentQ] === idx;
                    return (
                        <label 
                            key={idx} 
                            className={`
                                relative flex items-center p-5 rounded-[20px] border-2 cursor-pointer transition-all duration-200 group
                                ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md hover:-translate-y-0.5'}
                                ${isSelected 
                                    ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 z-10 shadow-lg shadow-blue-500/10' 
                                    : 'bg-white dark:bg-[#1e1e1e] border-transparent dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-800'
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
                            
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-5 flex items-center justify-center transition-colors duration-300 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400'}`}>
                                <div className={`w-2.5 h-2.5 rounded-full bg-white transform transition-transform duration-300 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                            </div>

                            <span className={`text-lg ${isSelected ? 'font-semibold text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                <ContentRenderer text={option.text || option || `Option ${idx + 1}`} />
                            </span>
                        </label>
                    );
                })}

                {question.type === 'true-false' && (
                    <div className="grid grid-cols-2 gap-6">
                        {[{ label: (quiz.language === 'Filipino' ? 'Tama' : 'True'), value: true }, { label: (quiz.language === 'Filipino' ? 'Mali' : 'False'), value: false }].map((opt) => {
                            const isSelected = userAnswers[currentQ] === opt.value;
                            return (
                                <button
                                    key={opt.label}
                                    onClick={() => handleAnswer(opt.value, 'true-false')}
                                    disabled={isDisabled}
                                    className={`
                                        h-32 rounded-[24px] text-2xl font-bold transition-all duration-300 border-2
                                        ${isSelected 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/30 scale-[1.02]' 
                                            : 'bg-white dark:bg-[#1e1e1e] border-transparent hover:border-blue-200 dark:hover:border-blue-800 text-slate-600 dark:text-slate-300 hover:shadow-lg'
                                        }
                                    `}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {question.type === 'identification' && (
                    <div className="relative">
                         <input
                            type="text"
                            placeholder="Type your answer..."
                            value={userAnswers[currentQ] || ''}
                            onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })}
                            disabled={isDisabled}
                            className="w-full p-6 rounded-[24px] bg-white dark:bg-[#1e1e1e] border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 text-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 shadow-lg transition-all disabled:opacity-60"
                        />
                        {!isDisabled && (
                            <button 
                                onClick={() => handleAnswer(userAnswers[currentQ] || '', 'identification')}
                                className="absolute right-3 top-3 bottom-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-[18px] transition-colors shadow-md active:scale-95"
                            >
                                Submit
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}