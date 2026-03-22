import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const loadingPhrases = [
    "Calibrating the assessment matrix…",
    "Aligning competencies to Bloom's Taxonomy…",
    "Cross-referencing with DepEd standards…",
    "Balancing difficulty distribution…",
    "Structuring cognitive levels…",
    "Generating item analysis framework…",
    "Applying the Largest Remainder Method…",
    "Randomizing answer placements…",
    "Validating question uniqueness…",
    "Polishing the final output…",
];

const spinnerCSS = `
@keyframes exam-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
@keyframes exam-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
}
.exam-spinner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2.5px solid rgba(99, 102, 241, 0.2);
    border-top-color: #818cf8;
    animation: exam-spin 0.8s infinite linear;
}
.step-pulse {
    animation: exam-pulse 2s infinite ease-in-out;
}
`;

export default function ExamGenerationOverlay({ isVisible, isSaving, generationSteps, currentStepIndex, onCancel }) {
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    useEffect(() => {
        if (!isVisible) {
            setPhraseIndex(0);
            setShowCancelConfirm(false);
            return;
        }
        const interval = setInterval(() => {
            setPhraseIndex(prev => (prev + 1) % loadingPhrases.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    const totalSteps = generationSteps.length;
    const completedSteps = generationSteps.filter(s => s.status === 'done').length;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const handleCancelClick = () => {
        if (showCancelConfirm) {
            onCancel();
            setShowCancelConfirm(false);
        } else {
            setShowCancelConfirm(true);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-none lg:rounded-[28px] overflow-hidden">
            <style>{spinnerCSS}</style>

            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Content Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-md mx-4 rounded-[28px] overflow-hidden
                           bg-[#1a1a2e]/95 backdrop-blur-2xl
                           shadow-2xl shadow-indigo-900/30
                           ring-1 ring-white/10"
            >
                {/* Top Progress Bar */}
                <div className="h-1 w-full bg-white/5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </div>

                <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">
                                {isSaving ? 'Saving Exam…' : 'Generating Exam'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                {isSaving ? 'Writing to database' : `Step ${Math.min(currentStepIndex + 1, totalSteps)} of ${totalSteps}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                {progressPercent}%
                            </p>
                        </div>
                    </div>

                    {/* Steps Timeline */}
                    {!isSaving && (
                        <div className="space-y-1 mb-6 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                            {generationSteps.map((step, index) => {
                                const isDone = step.status === 'done';
                                const isActive = step.status === 'active';
                                const isPending = step.status === 'pending';

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                                            isActive ? 'bg-indigo-500/10 ring-1 ring-indigo-500/20' : ''
                                        }`}
                                    >
                                        {/* Step Indicator */}
                                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                            {isDone && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 500 }}
                                                >
                                                    <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                                                </motion.div>
                                            )}
                                            {isActive && <div className="exam-spinner" />}
                                            {isPending && (
                                                <div className="w-2 h-2 rounded-full bg-slate-600" />
                                            )}
                                        </div>

                                        {/* Step Label */}
                                        <p className={`text-sm font-medium flex-1 transition-colors duration-300 ${
                                            isDone ? 'text-slate-500 line-through decoration-slate-600' :
                                            isActive ? 'text-white' :
                                            'text-slate-600'
                                        }`}>
                                            {step.label}
                                        </p>

                                        {/* Step Badge */}
                                        {isDone && (
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Done</span>
                                        )}
                                        {isActive && (
                                            <span className="step-pulse text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Live</span>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Saving State */}
                    {isSaving && (
                        <div className="flex flex-col items-center py-8">
                            <div className="exam-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                            <p className="mt-4 text-sm text-slate-300 font-medium">Writing to database…</p>
                        </div>
                    )}

                    {/* Rotating Message */}
                    {!isSaving && (
                        <div className="h-8 flex items-center justify-center mb-5">
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={phraseIndex}
                                    initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                                    transition={{ duration: 0.3 }}
                                    className="text-xs text-slate-500 font-medium text-center italic"
                                >
                                    {loadingPhrases[phraseIndex]}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Cancel Button */}
                    {!isSaving && (
                        <motion.button
                            onClick={handleCancelClick}
                            whileTap={{ scale: 0.97 }}
                            className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                                ${showCancelConfirm
                                    ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/25'
                                    : 'bg-white/5 text-slate-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-slate-300'
                                }`}
                        >
                            <XMarkIcon className="w-4 h-4" />
                            {showCancelConfirm ? 'Tap again to confirm cancel' : 'Cancel Generation'}
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
