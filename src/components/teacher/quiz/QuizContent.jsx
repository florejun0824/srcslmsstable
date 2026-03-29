import React, { useState, useRef, useMemo } from 'react';
import { useQuiz } from '../ViewQuizModal';
import { useTheme } from '../../../contexts/ThemeContext';
import Spinner from '../../common/Spinner'; 
import ContentRenderer from '../ContentRenderer'; 
import { 
    MagnifyingGlassPlusIcon, 
    MagnifyingGlassMinusIcon, 
    ArrowsPointingOutIcon,
    ListBulletIcon,
    PhotoIcon,
    ChevronDownIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckIconOutline } from '@heroicons/react/24/solid';

// --- VIEW SWITCHING IMPORTS ---
import QuizQuestionFeedback from './QuizQuestionFeedback';
import QuizResultsView from './QuizResultsView';
import QuizReviewView from './QuizReviewView';
import QuizLockedView from './QuizLockedView';

// --- MATERIAL YOU TONAL PALETTE HELPER ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    switch (activeOverlay) {
        case 'christmas': return { 
            bg: 'bg-[#E8F5E9] dark:bg-[#0D3020]', 
            text: 'text-[#1B5E20] dark:text-[#A5D6A7]',
            accent: 'bg-[#4CAF50] text-white',
            ring: 'focus:ring-[#81C784]',
            selected: 'bg-[#C8E6C9] dark:bg-[#1B5E20] text-[#1B5E20] dark:text-[#C8E6C9]'
        };
        case 'valentines': return { 
            bg: 'bg-[#FCE4EC] dark:bg-[#3E1123]', 
            text: 'text-[#880E4F] dark:text-[#F48FB1]',
            accent: 'bg-[#E91E63] text-white',
            ring: 'focus:ring-[#F06292]',
            selected: 'bg-[#F8BBD0] dark:bg-[#880E4F] text-[#880E4F] dark:text-[#F8BBD0]'
        };
        case 'cyberpunk': return { 
            bg: 'bg-[#F3E5F5] dark:bg-[#310A31]', 
            text: 'text-[#4A148C] dark:text-[#CE93D8]',
            accent: 'bg-[#9C27B0] text-white',
            ring: 'focus:ring-[#BA68C8]',
            selected: 'bg-[#E1BEE7] dark:bg-[#4A148C] text-[#4A148C] dark:text-[#E1BEE7]'
        };
        default: return null; 
    }
};

// --- MAIN COMPONENT ---

export default function QuizContent() {
    const {
        currentQ, shuffledQuestions, userAnswers, isTeacherView, currentQuestionAttempted,
        handleAnswer, setUserAnswers, handleConfirmMatchingAnswer, quiz, matchingResult,
        questionResult, score, showReview, isLocked
    } = useQuiz();

    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

    const [activeLabelIndex, setActiveLabelIndex] = useState(null);
    const [imageScale, setImageScale] = useState(1);
    const imageContainerRef = useRef(null);

    // Universal Matching State (Replaces DND entirely)
    const [expandedPrompt, setExpandedPrompt] = useState(null);

    // --- VIEW ROUTING ---
    if (isLocked) return <QuizLockedView />;
    if (score !== null) return showReview ? <QuizReviewView /> : <QuizResultsView />;
    if (questionResult || matchingResult) return <QuizQuestionFeedback />;

    const question = shuffledQuestions[currentQ];
    if (!question) return <div className="flex justify-center items-center h-full min-h-[300px]"><Spinner /></div>;

    const isAutoGraded = ['multiple-choice', 'true-false', 'identification', 'exactAnswer', 'matching-type', 'image-labeling'].includes(question.type);
    
    // Check if there is already a saved answer for this question
    const ans = userAnswers[currentQ];
    const isAnswerSaved = ans !== undefined && ans !== null && 
        (typeof ans === 'string' ? ans.trim() !== '' : 
        (Array.isArray(ans) ? ans.length > 0 : 
        (typeof ans === 'object' ? Object.keys(ans).length > 0 : true)));

    // Disabled if teacher, auto-graded taking current attempt, OR returned to an already answered question
    const isDisabled = isTeacherView || 
                       (isAutoGraded && currentQuestionAttempted && question.type !== 'matching-type') ||
                       (!isTeacherView && isAnswerSaved && !currentQuestionAttempted);

    // --- HANDLERS ---
    const handleLabelInput = (partIndex, value) => {
        const currentAnswers = userAnswers[currentQ] || {};
        setUserAnswers(prev => ({ ...prev, [currentQ]: { ...currentAnswers, [partIndex]: value } }));
    };
    const handleZoom = (dir) => setImageScale(prev => Math.min(Math.max(1, dir === 'in' ? prev + 0.25 : prev - 0.25), 4));
    const scrollToInput = (index) => {
        setActiveLabelIndex(index);
        document.getElementById(`label-input-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // --- RENDERERS ---

    if (question.type === 'essay') {
        return (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 max-w-3xl mx-auto pt-2">
                <div className={`p-6 sm:p-8 rounded-[32px] ${monet ? monet.bg : 'bg-[#F0F4F8] dark:bg-[#1E1E1E]'}`}>
                    <div className={`prose prose-sm sm:prose-base max-w-none leading-relaxed font-medium ${monet ? monet.text : 'text-[#1A1C1E] dark:text-[#E3E2E6]'}`}>
                        <ContentRenderer text={question.text || question.question || "Essay Prompt Missing"} />
                    </div>
                    <div className="mt-4">
                        <span className="text-[12px] font-bold text-[#74777F] dark:text-[#8E9099] uppercase tracking-wider">
                            Max Score: {question.points || 0} pts
                        </span>
                    </div>
                </div>

                <div className="relative group">
                    <textarea
                        placeholder="Compose your answer here..."
                        value={userAnswers[currentQ] || ''}
                        onChange={e => handleAnswer(e.target.value, 'essay')}
                        disabled={isDisabled} 
                        className={`
                            w-full h-56 sm:h-72 p-6 rounded-[32px] text-[15px] sm:text-[16px] leading-relaxed resize-none transition-all duration-300
                            bg-white dark:bg-[#2D3033] text-[#1A1C1E] dark:text-[#E3E2E6] placeholder-[#74777F] dark:placeholder-[#8E9099]
                            border-none outline-none ring-0
                            ${monet ? monet.ring : 'focus:ring-4 focus:ring-[#D3E3FD] dark:focus:ring-[#004A77]'}
                        `}
                    />
                </div>
            </div>
        );
    }

    if (question.type === 'matching-type') {
        const currentMatches = userAnswers[currentQ] || {};
        
        // Data Sanitization
        const safePrompts = (question.prompts || []).map((p, index) => ({
            id: String(p?.id ?? `prompt-${index}`),
            text: p?.text ?? (typeof p === 'string' ? p : `Prompt ${index + 1}`)
        }));

        const safeOptions = (question.options || []).map((o, index) => ({
            id: String(o?.id ?? (typeof o === 'string' ? o : `opt-${index}`)),
            text: o?.text ?? (typeof o === 'string' ? o : `Option ${index + 1}`)
        }));

        const matchedOptionIds = Object.values(currentMatches);
        const allPromptsMatched = safePrompts.length > 0 && safePrompts.every(p => currentMatches[p.id]);

        return (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-10 max-w-4xl mx-auto pt-2">
                
                <div className={`p-6 sm:p-8 rounded-[32px] ${monet ? monet.bg : 'bg-[#F0F4F8] dark:bg-[#1E1E1E]'}`}>
                    <div className={`text-[16px] sm:text-[20px] font-medium leading-relaxed ${monet ? monet.text : 'text-[#1A1C1E] dark:text-[#E3E2E6]'}`}>
                        <ContentRenderer text={question.text || "Tap a prompt to select its correct match."} />
                    </div>
                </div>

                {/* --- UNIVERSAL MATCHING UI (Mobile + Desktop) --- */}
                <div className="space-y-3">
                    {safePrompts.map((prompt) => {
                        const selectedOptionId = currentMatches[prompt.id];
                        const selectedOption = safeOptions.find(o => o.id === selectedOptionId);
                        const isExpanded = expandedPrompt === prompt.id;

                        return (
                        <div key={prompt.id} className={`rounded-[32px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] p-2 sm:p-3 ${
                            isExpanded ? 'bg-[#E1E6EB] dark:bg-[#3B3E42] shadow-sm' : 'bg-[#F0F4F8] dark:bg-[#1E1E1E]'
                        }`}>
                            
                            {/* Main Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                {/* Prompt Text */}
                                <div className={`flex-1 px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] font-medium leading-relaxed ${monet ? monet.text : 'text-[#1A1C1E] dark:text-[#E3E2E6]'}`}>
                                    <ContentRenderer text={prompt.text} />
                                </div>
                                
                                {/* Target Selector Button */}
                                <div className="w-full sm:w-[260px] md:w-[320px] shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            if (isDisabled || !!matchingResult) return;
                                            setExpandedPrompt(isExpanded ? null : prompt.id);
                                        }}
                                        disabled={isDisabled || !!matchingResult}
                                        className={`w-full flex items-center justify-between p-4 rounded-[24px] transition-all duration-300 active:scale-[0.98] ${
                                            selectedOption 
                                                ? (monet ? `${monet.selected}` : 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#001C38] dark:text-[#D3E3FD]') 
                                                : 'bg-white dark:bg-[#2D3033] text-[#74777F] dark:text-[#8E9099] shadow-sm'
                                        }`}
                                    >
                                        <div className={`text-[14px] font-semibold pr-4 text-left line-clamp-2`}>
                                            {selectedOption ? <ContentRenderer text={selectedOption.text} /> : "Tap to assign..."}
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 flex-shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${
                                            isExpanded ? 'rotate-180 text-blue-500' : 'opacity-70'
                                        }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Options Drawer (Chips) */}
                            <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className={`p-4 sm:p-5 rounded-[24px] ${monet ? 'bg-white/50 dark:bg-black/20' : 'bg-white dark:bg-[#2D3033]'}`}>
                                        <div className="flex flex-wrap gap-2.5">
                                            
                                            {selectedOption && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault(); e.stopPropagation();
                                                        const newMatches = { ...currentMatches };
                                                        delete newMatches[prompt.id];
                                                        handleAnswer(newMatches, 'matching-type');
                                                        setExpandedPrompt(null);
                                                    }}
                                                    className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#BA1A1A] dark:text-[#FFB4AB] bg-[#FFDAD6] dark:bg-[#93000A] transition-colors flex items-center gap-1"
                                                >
                                                    CLEAR
                                                </button>
                                            )}

                                            {safeOptions.map((opt) => {
                                                const isSelectedHere = currentMatches[prompt.id] === opt.id;
                                                const isSelectedElsewhere = matchedOptionIds.includes(opt.id) && !isSelectedHere;
                                                if (isSelectedElsewhere) return null; 

                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={(e) => {
                                                            e.preventDefault(); e.stopPropagation();
                                                            const newMatches = { ...currentMatches };
                                                            newMatches[prompt.id] = opt.id;
                                                            handleAnswer(newMatches, 'matching-type');
                                                            setExpandedPrompt(null);
                                                        }}
                                                        className={`px-5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-200 border border-transparent flex items-center gap-2 ${
                                                            isSelectedHere 
                                                                ? (monet ? `${monet.selected}` : 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#001C38] dark:text-[#D3E3FD]') 
                                                                : 'bg-[#F0F4F8] dark:bg-[#1E1E1E] hover:bg-[#D3E3FD]/30 dark:hover:bg-[#004A77]/30 text-[#1A1C1E] dark:text-[#E3E2E6]'
                                                        }`}
                                                    >
                                                        <ContentRenderer text={opt.text} />
                                                        {isSelectedHere && <CheckIcon className={`w-4 h-4`} />}
                                                    </button>
                                                );
                                            })}
                                            
                                            {safeOptions.filter(opt => !matchedOptionIds.includes(opt.id) || currentMatches[prompt.id] === opt.id).length === 0 && (
                                                <div className="w-full text-center py-2 text-[#74777F] dark:text-[#8E9099] text-[13px] font-medium">
                                                    All options matched.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>

                {!isDisabled && !matchingResult && allPromptsMatched && (
                    <div className="flex justify-center pt-6">
                        <button
                            onClick={handleConfirmMatchingAnswer}
                            className={`w-full sm:w-auto px-10 py-4 rounded-[32px] font-bold text-white hover:scale-[1.02] active:scale-[0.95] transition-all duration-300 text-[16px] ${monet ? monet.accent : 'bg-[#005AC1] hover:bg-[#004A77]'}`}
                        >
                            Submit Matches
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (question.type === 'image-labeling') {
        const parts = question.parts || [];
        return (
            <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 pt-2">
                <div className={`p-5 sm:p-6 rounded-[32px] flex items-start gap-4 ${monet ? monet.bg : 'bg-[#F0F4F8] dark:bg-[#1E1E1E]'}`}>
                    <div className={`hidden sm:flex p-3 rounded-[20px] shrink-0 ${monet ? monet.text : 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#005AC1] dark:text-[#D3E3FD]'}`}>
                        <PhotoIcon className="w-6 h-6" />
                    </div>
                    <div className={`text-[16px] sm:text-[20px] font-medium leading-relaxed ${monet ? monet.text : 'text-[#1A1C1E] dark:text-[#E3E2E6]'}`}>
                        <ContentRenderer text={question.text || "Identify the labelled parts."} />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                    <div className="w-full lg:w-2/3 bg-white dark:bg-[#2D3033] rounded-[32px] overflow-hidden relative group shadow-sm">
                        <div 
                            ref={imageContainerRef}
                            className="w-full h-[300px] sm:h-[400px] lg:h-[500px] overflow-auto custom-scrollbar flex items-center justify-center touch-pan-x touch-pan-y"
                            style={{ backgroundImage: 'radial-gradient(#cbd5e1 20%, transparent 20%)', backgroundSize: '20px 20px', backgroundColor: 'transparent' }}
                        >
                            <div className="relative transition-transform duration-200 ease-out" style={{ transform: `scale(${imageScale})` }}>
                                <img src={question.image} alt="Diagram" className="max-w-full h-auto select-none pointer-events-none rounded-2xl" />
                                {parts.map((part, idx) => {
                                    const hasAnswer = !!(userAnswers[currentQ]?.[idx]);
                                    const isActive = activeLabelIndex === idx;
                                    return (
                                        <button
                                            key={part.id}
                                            onClick={(e) => { e.stopPropagation(); scrollToInput(idx); }}
                                            className={`
                                                absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center rounded-full font-bold text-sm transition-all
                                                ${isActive ? 'bg-[#1A1C1E] text-white z-20 scale-125' : hasAnswer ? 'bg-[#4CAF50] text-white' : 'bg-white text-[#1A1C1E] border-2 border-[#1A1C1E]'}
                                            `}
                                            style={{ left: `${part.x}%`, top: `${part.y}%` }}
                                        >
                                            {part.number}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 flex gap-1 bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-md rounded-full p-1 shadow-sm border border-[#E1E6EB] dark:border-[#44474A]">
                            <button onClick={() => handleZoom('out')} className="p-3 sm:p-2 hover:bg-[#F0F4F8] dark:hover:bg-[#2D3033] rounded-full text-[#44474A] dark:text-[#C2C7CF]"><MagnifyingGlassMinusIcon className="w-5 h-5"/></button>
                            <button onClick={() => setImageScale(1)} className="p-3 sm:p-2 hover:bg-[#F0F4F8] dark:hover:bg-[#2D3033] rounded-full text-[#44474A] dark:text-[#C2C7CF]"><ArrowsPointingOutIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleZoom('in')} className="p-3 sm:p-2 hover:bg-[#F0F4F8] dark:hover:bg-[#2D3033] rounded-full text-[#44474A] dark:text-[#C2C7CF]"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                        </div>
                    </div>

                    <div className="w-full lg:w-1/3 flex flex-col gap-3 max-h-[400px] lg:h-[500px] overflow-y-auto custom-scrollbar pb-4 pr-1">
                        {parts.map((part, idx) => (
                            <div 
                                key={part.id} 
                                id={`label-input-${idx}`}
                                onClick={() => setActiveLabelIndex(idx)}
                                className={`
                                    flex items-center gap-3 p-4 rounded-[28px] transition-all cursor-text
                                    ${activeLabelIndex === idx 
                                        ? (monet ? `${monet.bg} ring-2 ${monet.ring}` : 'bg-[#D3E3FD] dark:bg-[#004A77] ring-2 ring-[#005AC1]') 
                                        : 'bg-white dark:bg-[#2D3033]'
                                    }
                                `}
                            >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${activeLabelIndex === idx ? 'bg-[#005AC1] text-white' : 'bg-[#E1E6EB] dark:bg-[#44474A] text-[#1A1C1E] dark:text-[#E3E2E6]'}`}>{part.number}</span>
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={userAnswers[currentQ]?.[idx] || ''}
                                        onChange={(e) => handleLabelInput(idx, e.target.value)}
                                        onFocus={() => setActiveLabelIndex(idx)}
                                        disabled={isDisabled}
                                        placeholder="Type answer..."
                                        className="w-full bg-transparent border-none p-0 text-[15px] text-[#1A1C1E] dark:text-[#E3E2E6] font-medium focus:ring-0 placeholder-[#74777F] dark:placeholder-[#8E9099]"
                                    />
                                </div>
                                {userAnswers[currentQ]?.[idx] && <CheckIconOutline className="w-5 h-5 text-[#4CAF50]" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- STANDARD QUESTIONS (Multiple Choice, T/F, Identification) ---
    // Question-type accent colors
    const typeAccent = {
        'multiple-choice': 'bg-blue-500',
        'true-false': 'bg-purple-500',
        'identification': 'bg-teal-500',
        'exactAnswer': 'bg-teal-500',
        'essay': 'bg-orange-400',
        'matching-type': 'bg-indigo-500',
        'image-labeling': 'bg-rose-500',
    }[question.type] || 'bg-slate-400';

    return (
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 py-2 sm:py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Tonal Question Card with accent bar */}
            <div className={`overflow-hidden rounded-[32px] ${monet ? monet.bg : 'bg-[#F0F4F8] dark:bg-[#1E1E1E]'}`}>
                <div className={`h-1.5 w-full ${monet ? monet.accent : typeAccent}`} />
                <div className="p-6 sm:p-10">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[12px] font-bold text-[#74777F] dark:text-[#8E9099] uppercase tracking-widest">
                            {question.points || 1} Point{question.points !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className={`text-[18px] sm:text-[22px] font-medium leading-relaxed ${monet ? monet.text : 'text-[#1A1C1E] dark:text-[#E3E2E6]'}`}>
                        <ContentRenderer text={question.text || question.question || "Question Text Missing"} />
                    </div>
                </div>
            </div>

            {/* Answers Grid */}
            <div className="grid gap-3 sm:gap-4 mt-2">
                
                {question.type === 'multiple-choice' && (question.options || []).map((option, idx) => {
                    const isSelected = userAnswers[currentQ] === idx;
                    const letter = ['A','B','C','D','E','F','G','H'][idx] ?? String(idx + 1);
                    return (
                        <label 
                            key={idx} 
                            className={`
                                group relative flex items-center p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                                ${isDisabled ? 'cursor-not-allowed opacity-70' : 'active:scale-[0.97] hover:-translate-y-0.5'}
                                ${isSelected 
                                    ? (monet ? `${monet.selected}` : 'bg-[#D3E3FD] dark:bg-[#004A77]') 
                                    : 'bg-white dark:bg-[#2D3033] hover:bg-[#E1E6EB] dark:hover:bg-[#3B3E42]'
                                }
                            `}
                        >
                            <input type="radio" name={`q-${currentQ}`} value={idx} checked={isSelected} onChange={() => handleAnswer(idx, 'multiple-choice')} disabled={isDisabled} className="hidden" />
                            
                            {/* Letter Badge */}
                            <div className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-[14px] mr-4 sm:mr-5 flex items-center justify-center text-[13px] sm:text-[14px] font-black transition-all duration-300 ${
                                isSelected 
                                    ? (monet ? `${monet.accent} text-white` : 'bg-[#005AC1] dark:bg-[#D3E3FD] text-white dark:text-[#001C38]') 
                                    : 'bg-[#E1E6EB] dark:bg-[#44474A] text-[#44474A] dark:text-[#C2C7CF] group-hover:bg-[#C7CDD3] dark:group-hover:bg-[#52575C]'
                            }`}>
                                {letter}
                            </div>

                            <span className={`text-[14px] sm:text-[16px] font-medium flex-1 leading-snug transition-colors duration-300 ${
                                isSelected ? (monet ? monet.text : 'text-[#001C38] dark:text-[#D3E3FD]') : 'text-[#1A1C1E] dark:text-[#E3E2E6]'
                            }`}>
                                <ContentRenderer text={option.text || option || `Option ${idx + 1}`} />
                            </span>
                        </label>
                    );
                })}

                {question.type === 'true-false' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {[{ label: (quiz.language === 'Filipino' ? 'Tama' : 'True'), value: true }, { label: (quiz.language === 'Filipino' ? 'Mali' : 'False'), value: false }].map((opt) => {
                            const isSelected = userAnswers[currentQ] === opt.value;
                            return (
                                <button
                                    key={opt.label}
                                    onClick={() => handleAnswer(opt.value, 'true-false')}
                                    disabled={isDisabled}
                                    className={`
                                        relative overflow-hidden h-20 sm:h-28 rounded-[32px] text-[18px] sm:text-[22px] font-bold transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                                        ${isDisabled ? 'cursor-not-allowed opacity-70' : 'active:scale-[0.96] hover:-translate-y-0.5'}
                                        ${isSelected 
                                            ? (monet ? `${monet.selected} scale-[1.02]` : 'bg-[#005AC1] dark:bg-[#D3E3FD] text-white dark:text-[#001C38] scale-[1.02]') 
                                            : 'bg-white dark:bg-[#2D3033] hover:bg-[#E1E6EB] dark:hover:bg-[#3B3E42] text-[#1A1C1E] dark:text-[#E3E2E6]'
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
                    <div className="relative mt-2 group">
                        <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={userAnswers[currentQ] || ''}
                            onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })}
                            disabled={isDisabled}
                            className={`
                                w-full p-5 sm:p-8 rounded-[32px] text-[16px] sm:text-[20px] font-medium transition-all duration-300
                                bg-white dark:bg-[#2D3033] text-[#1A1C1E] dark:text-[#E3E2E6] placeholder-[#74777F] dark:placeholder-[#8E9099]
                                border-2 border-transparent outline-none
                                ${monet ? `focus:border-transparent ${monet.ring} focus:ring-4` : 'focus:ring-4 focus:ring-[#D3E3FD] dark:focus:ring-[#004A77] focus:border-[#005AC1] dark:focus:border-[#D3E3FD]'}
                            `}
                        />
                        {!isDisabled && (
                            <button 
                                onClick={() => handleAnswer(userAnswers[currentQ] || '', 'identification')}
                                className={`absolute right-2.5 sm:right-3 top-2.5 sm:top-3 bottom-2.5 sm:bottom-3 px-5 sm:px-7 font-bold rounded-[24px] transition-all duration-300 active:scale-95 text-[14px] sm:text-[15px] text-white shadow-md ${monet ? monet.accent : 'bg-[#005AC1] hover:bg-[#004A77] dark:bg-[#D3E3FD] dark:text-[#001C38] dark:hover:bg-[#A8C7FA]'}`}
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