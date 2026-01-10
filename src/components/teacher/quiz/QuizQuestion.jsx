import React, { useState, useRef, useMemo, memo } from 'react';
import { useQuiz } from '../ViewQuizModal';
import { useTheme } from '../../contexts/ThemeContext';
import Spinner from '../../common/Spinner'; 
import ContentRenderer from '../ContentRenderer'; 
import { 
    DndContext, 
    useDraggable, 
    useDroppable, 
    closestCenter,
    DragOverlay,
    TouchSensor,
    MouseSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { 
    MagnifyingGlassPlusIcon, 
    MagnifyingGlassMinusIcon, 
    ArrowsPointingOutIcon,
    ListBulletIcon,
    PhotoIcon,
    CheckCircleIcon as CheckIconOutline
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

// --- VIEW SWITCHING IMPORTS ---
import QuizQuestionFeedback from './QuizQuestionFeedback';
import QuizResultsView from './QuizResultsView';
import QuizReviewView from './QuizReviewView';
import QuizLockedView from './QuizLockedView';

// --- MONET STYLE HELPER ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    switch (activeOverlay) {
        case 'christmas': return { 
            bg: 'bg-emerald-50 dark:bg-emerald-900/10', 
            border: 'border-emerald-200 dark:border-emerald-800', 
            text: 'text-emerald-700 dark:text-emerald-400',
            accent: 'bg-emerald-600',
            ring: 'focus:ring-emerald-500/30',
            selected: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500'
        };
        case 'valentines': return { 
            bg: 'bg-rose-50 dark:bg-rose-900/10', 
            border: 'border-rose-200 dark:border-rose-800', 
            text: 'text-rose-700 dark:text-rose-400',
            accent: 'bg-rose-600',
            ring: 'focus:ring-rose-500/30',
            selected: 'bg-rose-100 dark:bg-rose-900/30 border-rose-500'
        };
        case 'cyberpunk': return { 
            bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/10', 
            border: 'border-fuchsia-200 dark:border-fuchsia-800', 
            text: 'text-fuchsia-700 dark:text-fuchsia-400',
            accent: 'bg-fuchsia-600',
            ring: 'focus:ring-fuchsia-500/30',
            selected: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 border-fuchsia-500'
        };
        // Add defaults for others to map to Blue
        default: return null; 
    }
};

// --- SUB-COMPONENTS (Memoized for Performance) ---

const DraggableOption = memo(({ id, text, isMatched, isDisabled, monet }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ 
        id: `option-${id}`,
        data: { text, type: 'option' },
        disabled: isDisabled
    });
    
    if (isMatched) return null; 

    // Dynamic Styles
    const baseStyle = "p-3.5 rounded-[16px] text-[14px] font-medium transition-all duration-200 cursor-grab active:cursor-grabbing touch-none select-none shadow-sm border";
    const themeStyle = monet 
        ? `bg-white dark:bg-[#252525] border-transparent dark:border-white/10 text-slate-700 dark:text-slate-200 hover:${monet.border}`
        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300";

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`${baseStyle} ${isDragging ? 'opacity-30 scale-95' : `${themeStyle} hover:shadow-md`}`}
        >
            <ContentRenderer text={text || "Option"} />
        </div>
    );
});

const DroppablePrompt = memo(({ id, text, matchedOption, onDropRemove, isFinished, monet }) => {
    const { isOver, setNodeRef } = useDroppable({ id: `prompt-${id}` });

    // Dynamic Styles
    const activeBorder = monet ? monet.border.split(' ')[0] : 'border-blue-500';
    const activeBg = monet ? monet.bg : 'bg-blue-50 dark:bg-blue-900/20';
    
    return (
        <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-4">
            <div className="flex-1 p-4 bg-white dark:bg-[#1E1E1E] rounded-[20px] border border-black/5 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm flex items-center font-medium shadow-sm">
                <ContentRenderer text={text || "Prompt"} />
            </div>
            
            <div
                ref={setNodeRef}
                onClick={() => !isFinished && matchedOption && onDropRemove(id)}
                className={`
                    flex-1 min-h-[3.5rem] p-2 rounded-[20px] border-2 border-dashed transition-all duration-200 flex items-center justify-center relative
                    ${isOver 
                        ? `${activeBorder} ${activeBg} scale-[1.01]` 
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20'
                    }
                    ${matchedOption ? `border-solid bg-white dark:bg-[#252525] shadow-sm ${monet ? monet.border : 'border-blue-200'}` : ''}
                    ${!isFinished && matchedOption ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 group' : ''}
                `}
            >
                {matchedOption ? (
                    <div className="w-full h-full flex items-center justify-center text-center">
                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">
                            <ContentRenderer text={matchedOption.text} />
                        </span>
                        {!isFinished && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <XCircleIcon className="w-6 h-6 text-red-500 bg-white dark:bg-[#252525] rounded-full" />
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide pointer-events-none">Drop Answer Here</span>
                )}
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---

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
        questionResult,
        score,
        showReview,
        isLocked
    } = useQuiz();

    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

    // Sensors for better touch handling (Prevent scroll while dragging)
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const [activeLabelIndex, setActiveLabelIndex] = useState(null);
    const [imageScale, setImageScale] = useState(1);
    const [activeDragId, setActiveDragId] = useState(null);
    const imageContainerRef = useRef(null);

    // --- VIEW ROUTING ---
    if (isLocked) return <QuizLockedView />;
    if (score !== null) return showReview ? <QuizReviewView /> : <QuizResultsView />;
    if (questionResult || matchingResult) return <QuizQuestionFeedback />;

    const question = shuffledQuestions[currentQ];
    if (!question) return <div className="flex justify-center items-center h-full min-h-[300px]"><Spinner /></div>;

    const isAutoGraded = ['multiple-choice', 'true-false', 'identification', 'exactAnswer', 'matching-type', 'image-labeling'].includes(question.type);
    const isDisabled = isTeacherView || (isAutoGraded && currentQuestionAttempted && question.type !== 'matching-type');

    // --- HANDLERS ---
    
    // Image Labeling
    const handleLabelInput = (partIndex, value) => {
        const currentAnswers = userAnswers[currentQ] || {};
        setUserAnswers(prev => ({ ...prev, [currentQ]: { ...currentAnswers, [partIndex]: value } }));
    };

    const handleZoom = (dir) => setImageScale(prev => Math.min(Math.max(1, dir === 'in' ? prev + 0.25 : prev - 0.25), 4));
    
    const scrollToInput = (index) => {
        setActiveLabelIndex(index);
        document.getElementById(`label-input-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Matching
    const currentMatches = userAnswers[currentQ] || {};
    const prompts = question.prompts || [];
    const options = question.options || [];
    const matchedOptionIds = Object.values(currentMatches);
    const allPromptsMatched = prompts.length > 0 && prompts.every(p => currentMatches[p.id]);

    const handleDragEnd = (event) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (isTeacherView || matchingResult || !over) return;

        if (active.id.startsWith('option-') && over.id.startsWith('prompt-')) {
            const optionId = active.id.replace('option-', '');
            const promptId = over.id.replace('prompt-', '');
            const newMatches = { ...currentMatches };
            
            // Remove previous match if this option was used elsewhere (1-to-1 mapping usually preferred)
            const existingKey = Object.keys(newMatches).find(key => newMatches[key] === optionId);
            if (existingKey) delete newMatches[existingKey];
            
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

    // --- RENDERERS ---

    // 1. ESSAY
    if (question.type === 'essay') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`p-6 sm:p-8 rounded-[32px] border shadow-sm ${monet ? `bg-white dark:bg-[#1E1E1E] ${monet.border}` : 'bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-white/5'}`}>
                    <div className="prose prose-lg prose-slate dark:prose-invert max-w-none leading-relaxed">
                        <ContentRenderer text={question.text || question.question || "Essay Prompt Missing"} />
                    </div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 mt-6 uppercase tracking-wider">
                        Maximum Score: {question.points || 0} points
                    </span>
                </div>

                {(question.rubric?.length > 0) && (
                    <div className={`p-5 rounded-[24px] border ${monet ? `${monet.bg} ${monet.border}` : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                        <p className={`text-xs font-bold mb-3 uppercase tracking-wide flex items-center gap-2 ${monet ? monet.text : 'text-slate-500'}`}>
                            <ListBulletIcon className="w-4 h-4" /> Grading Criteria
                        </p>
                        <ul className="space-y-2">
                            {question.rubric.map((item, idx) => (
                                <li key={idx} className="flex justify-between items-center text-sm p-3 rounded-[16px] bg-white dark:bg-black/20 shadow-sm border border-black/5">
                                    <span className="font-medium text-slate-700 dark:text-slate-200"><ContentRenderer text={item.criteria} /></span>
                                    <span className={`font-mono font-bold px-2 py-1 rounded-md text-xs ${monet ? `${monet.bg} ${monet.text}` : 'bg-slate-100 text-slate-600'}`}>{item.points} pts</span>
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
                        disabled={isTeacherView} 
                        className={`
                            w-full h-80 p-6 rounded-[24px] bg-white dark:bg-[#1A1D24] border text-base leading-relaxed resize-none transition-all
                            ${monet ? `focus:ring-2 ${monet.ring} focus:border-transparent` : 'focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 border-slate-200'}
                            dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-inner
                        `}
                    />
                    {!isTeacherView && (
                        <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-300 dark:text-slate-600 pointer-events-none">
                            {userAnswers[currentQ]?.length || 0} chars
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. MATCHING TYPE
    if (question.type === 'matching-type') {
        return (
            <DndContext sensors={sensors} onDragStart={({active}) => setActiveDragId(active.id)} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                    
                    {/* MOBILE: Sticky Header Options */}
                    <div className="lg:hidden sticky top-0 z-30 -mx-4 px-4 py-2 bg-[#F3F4F6]/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-black/5">
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {options.filter(opt => !matchedOptionIds.includes(opt.id)).map(opt => (
                                <div key={opt.id} className="min-w-[150px] snap-center">
                                    <DraggableOption id={opt.id} text={opt.text} isDisabled={isTeacherView} monet={monet} />
                                </div>
                            ))}
                            {options.filter(opt => !matchedOptionIds.includes(opt.id)).length === 0 && (
                                <span className="text-xs text-slate-400 italic w-full text-center py-2">All options placed</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-[24px] border border-white/40 dark:border-white/5 shadow-sm">
                        <div className="text-lg text-slate-900 dark:text-white font-medium">
                            <ContentRenderer text={question.text || "Match the items correctly."} />
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Prompts Column */}
                        <div className="w-full lg:w-2/3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Prompts</h4>
                            <div className="space-y-2">
                                {prompts.map((prompt) => (
                                    <DroppablePrompt 
                                        key={prompt.id} 
                                        id={prompt.id} 
                                        text={prompt.text} 
                                        matchedOption={options.find(opt => opt.id === currentMatches[prompt.id])} 
                                        onDropRemove={handleUnmatch} 
                                        isFinished={!!matchingResult}
                                        monet={monet}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        {/* Desktop Options Column (Sticky) */}
                        <div className="hidden lg:block w-1/3">
                            <div className="sticky top-4 bg-slate-100/50 dark:bg-white/5 backdrop-blur-lg p-5 rounded-[24px] border border-black/5 dark:border-white/5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Drag Options</h4>
                                <div className="flex flex-col gap-2.5 min-h-[150px]">
                                    {options
                                        .filter(opt => !matchedOptionIds.includes(opt.id))
                                        .map((option) => <DraggableOption key={option.id} id={option.id} text={option.text} isDisabled={isTeacherView} monet={monet} />)}
                                    
                                    {options.filter(opt => !matchedOptionIds.includes(opt.id)).length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm italic">
                                            <CheckCircleIcon className={`w-8 h-8 mb-2 ${monet ? monet.text : 'text-green-500'}`} />
                                            All items placed
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isTeacherView && !matchingResult && allPromptsMatched && (
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleConfirmMatchingAnswer}
                                className={`px-10 py-3.5 rounded-full font-bold shadow-lg text-white hover:scale-105 active:scale-95 transition-all ${monet ? monet.accent : 'bg-[#007AFF]'}`}
                            >
                                Confirm Matches
                            </button>
                        </div>
                    )}
                </div>

                <DragOverlay>
                    {activeDragId ? (
                        <div className={`p-4 rounded-[16px] text-white shadow-2xl scale-105 font-bold text-sm border-2 ${monet ? `${monet.accent} border-white` : 'bg-blue-600 border-blue-400'}`}>
                            <ContentRenderer text={options.find(o => `option-${o.id}` === activeDragId)?.text || "Option"} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        );
    }

    // 3. IMAGE LABELING
    if (question.type === 'image-labeling') {
        const parts = question.parts || [];
        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-[24px] border border-white/40 dark:border-white/5 shadow-sm flex items-start gap-4">
                    <div className={`p-3 rounded-2xl shrink-0 ${monet ? monet.bg + ' ' + monet.text : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                        <PhotoIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-lg text-slate-900 dark:text-white font-medium leading-snug">
                            <ContentRenderer text={question.text || "Identify the labelled parts."} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Viewer */}
                    <div className="w-full lg:w-2/3 bg-slate-100 dark:bg-[#151515] rounded-[24px] overflow-hidden border border-black/5 dark:border-white/5 relative group shadow-inner">
                        <div 
                            ref={imageContainerRef}
                            className="w-full h-[350px] sm:h-[500px] overflow-auto custom-scrollbar flex items-center justify-center"
                            style={{ backgroundImage: 'radial-gradient(#cbd5e1 20%, transparent 20%)', backgroundSize: '20px 20px', backgroundColor: 'transparent' }}
                        >
                            <div className="relative transition-transform duration-200 ease-out" style={{ transform: `scale(${imageScale})` }}>
                                <img src={question.image} alt="Diagram" className="max-w-full h-auto select-none pointer-events-none rounded-lg" />
                                {parts.map((part, idx) => {
                                    const hasAnswer = !!(userAnswers[currentQ]?.[idx]);
                                    const isActive = activeLabelIndex === idx;
                                    return (
                                        <button
                                            key={part.id}
                                            onClick={(e) => { e.stopPropagation(); scrollToInput(idx); }}
                                            className={`
                                                absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center rounded-full font-bold text-sm shadow-md border-2 transition-all
                                                ${isActive ? 'bg-white text-black border-black z-20 scale-125' : hasAnswer ? 'bg-green-500 border-white text-white' : 'bg-slate-800 border-white text-white'}
                                            `}
                                            style={{ left: `${part.x}%`, top: `${part.y}%` }}
                                        >
                                            {part.number}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Zoom Controls */}
                        <div className="absolute bottom-4 right-4 flex gap-1 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-full p-1 border border-black/5 shadow-lg">
                            <button onClick={() => handleZoom('out')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-300"><MagnifyingGlassMinusIcon className="w-5 h-5"/></button>
                            <button onClick={() => setImageScale(1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-300"><ArrowsPointingOutIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleZoom('in')} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-300"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-3 h-[300px] lg:h-[500px] overflow-y-auto custom-scrollbar">
                        {parts.map((part, idx) => (
                            <div 
                                key={part.id} 
                                id={`label-input-${idx}`}
                                onClick={() => setActiveLabelIndex(idx)}
                                className={`
                                    flex items-center gap-3 p-4 rounded-[20px] border-2 transition-all cursor-text
                                    ${activeLabelIndex === idx 
                                        ? (monet ? `${monet.bg} ${monet.border} ${monet.ring}` : 'bg-blue-50 border-blue-500') 
                                        : 'bg-white dark:bg-[#1E1E1E] border-transparent'
                                    }
                                `}
                            >
                                <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">{part.number}</span>
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={userAnswers[currentQ]?.[idx] || ''}
                                        onChange={(e) => handleLabelInput(idx, e.target.value)}
                                        onFocus={() => setActiveLabelIndex(idx)}
                                        disabled={isDisabled}
                                        placeholder="Type answer..."
                                        className="w-full bg-transparent border-none p-0 text-slate-900 dark:text-white font-semibold text-base focus:ring-0 placeholder-slate-400"
                                    />
                                </div>
                                {userAnswers[currentQ]?.[idx] && <CheckIconOutline className="w-5 h-5 text-green-500" />}
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
            <div className="bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-xl p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-xl relative overflow-hidden">
                {monet && <div className={`absolute top-0 left-0 w-full h-1.5 opacity-70 ${monet.accent.replace('bg-', 'bg-gradient-to-r from-transparent via-')}`} />}
                
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
                                relative flex items-center p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-200 group
                                ${isDisabled ? 'cursor-not-allowed opacity-60' : 'active:scale-[0.99]'}
                                ${isSelected 
                                    ? (monet ? `${monet.selected} shadow-lg` : 'bg-blue-50 border-blue-500') 
                                    : 'bg-white dark:bg-[#1E1E1E] border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                }
                            `}
                        >
                            <input type="radio" name={`q-${currentQ}`} value={idx} checked={isSelected} onChange={() => handleAnswer(idx, 'multiple-choice')} disabled={isDisabled} className="hidden" />
                            
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-5 flex items-center justify-center transition-all ${isSelected ? (monet ? `border-current ${monet.text}` : 'border-blue-600 bg-blue-600 text-white') : 'border-slate-300'}`}>
                                {isSelected && <div className={`w-3 h-3 rounded-full ${monet ? 'bg-current' : 'bg-white'}`} />}
                            </div>

                            <span className={`text-lg font-medium ${isSelected ? (monet ? monet.text : 'text-blue-900 dark:text-blue-100') : 'text-slate-700 dark:text-slate-300'}`}>
                                <ContentRenderer text={option.text || option || `Option ${idx + 1}`} />
                            </span>
                        </label>
                    );
                })}

                {question.type === 'true-false' && (
                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        {[{ label: (quiz.language === 'Filipino' ? 'Tama' : 'True'), value: true }, { label: (quiz.language === 'Filipino' ? 'Mali' : 'False'), value: false }].map((opt) => {
                            const isSelected = userAnswers[currentQ] === opt.value;
                            return (
                                <button
                                    key={opt.label}
                                    onClick={() => handleAnswer(opt.value, 'true-false')}
                                    disabled={isDisabled}
                                    className={`
                                        h-32 rounded-[28px] text-2xl font-bold transition-all duration-300 border-2
                                        ${isSelected 
                                            ? (monet ? `${monet.selected} shadow-lg scale-[1.02]` : 'bg-blue-600 border-blue-600 text-white') 
                                            : 'bg-white dark:bg-[#1E1E1E] border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
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
                    <div className="relative mt-4">
                         <input
                            type="text"
                            placeholder="Type your answer..."
                            value={userAnswers[currentQ] || ''}
                            onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })}
                            disabled={isDisabled}
                            className={`
                                w-full p-6 rounded-[28px] bg-white dark:bg-[#1E1E1E] border-2 text-xl text-slate-900 dark:text-white placeholder-slate-400 shadow-lg transition-all
                                ${monet ? `focus:border-transparent ${monet.ring} focus:ring-4` : 'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 border-transparent'}
                            `}
                        />
                        {!isDisabled && (
                            <button 
                                onClick={() => handleAnswer(userAnswers[currentQ] || '', 'identification')}
                                className={`absolute right-3 top-3 bottom-3 px-6 font-bold rounded-[20px] transition-all shadow-md active:scale-95 text-white ${monet ? monet.accent : 'bg-blue-600 hover:bg-blue-700'}`}
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