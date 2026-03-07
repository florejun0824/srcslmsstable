// src/components/teacher/AddQuizModal.jsx
import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog, Transition, Portal } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SparklesIcon,
    DocumentPlusIcon,
    AcademicCapIcon,
    ChevronRightIcon,
    XMarkIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';

// Lazy load panels
const AiQuizGenerator = lazy(() => import('./AiQuizGenerator'));
const ManualQuizCreator = lazy(() => import('./ManualQuizCreator'));

const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

const CreatorOptionCard = ({ title, description, icon: Icon, gradient, onClick, index }) => (
    <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: index * 0.1 + 0.2 }}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="group relative w-full flex flex-col items-start p-6 rounded-[28px] bg-white border border-slate-200/60 shadow-lg shadow-slate-200/30 hover:shadow-2xl hover:border-transparent transition-all overflow-hidden text-left"
    >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${gradient}`} />

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br ${gradient} shadow-md group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
            <Icon className="w-7 h-7 text-white" strokeWidth={2} />
        </div>

        <h3 className="text-[17px] font-bold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors">
            {title}
        </h3>
        <p className="text-[13px] font-medium text-slate-500 leading-relaxed mb-4">
            {description}
        </p>

        <div className="mt-auto w-full flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-amber-500 transition-colors">
                Select
            </span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-amber-50 transition-colors`}>
                <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" strokeWidth={3} />
            </div>
        </div>
    </motion.button>
);

const AiLimitationWarning = ({ onConfirm, onCancel }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-md p-6 z-[150]"
    >
        <div className="bg-white max-w-sm w-full rounded-[32px] shadow-2xl border border-slate-100 p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-6">
                <ExclamationTriangleIcon className="w-8 h-8" strokeWidth={2} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">AI Quiz Beta</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                The AI Quiz Generator is currently in beta. It performs exceptionally well for multiple-choice and true/false, but occasionally misses on identification logic. Please review generations prior to deploying.
            </p>

            <div className="flex w-full gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-2xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold rounded-2xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
                >
                    I Understand
                </button>
            </div>
        </div>
    </motion.div>
);

const LoadingPanel = () => (
    <div className="flex h-full w-full items-center justify-center">
        <Spinner />
    </div>
);

export default function AddQuizModal({ isOpen, onClose, unitId, subjectId }) {
    const [creationMode, setCreationMode] = useState(null);
    const [showAiWarning, setShowAiWarning] = useState(false);

    const handleModeSelect = useCallback((mode) => {
        if (mode === 'ai') {
            setShowAiWarning(true);
        } else {
            setCreationMode(mode);
        }
    }, []);

    const confirmAiMode = useCallback(() => {
        setShowAiWarning(false);
        setCreationMode('ai');
    }, []);

    const handleClose = useCallback(() => {
        setTimeout(() => {
            setCreationMode(null);
            setShowAiWarning(false);
        }, 300);
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <Portal>
            <AnimatePresence>
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={SPRING}
                        className={`relative flex flex-col overflow-hidden bg-white/95 backdrop-blur-3xl shadow-2xl ring-1 ring-black/5 transform transition-all duration-500
                        ${creationMode ? 'w-full h-full max-w-none rounded-[32px]' : 'w-full max-w-2xl rounded-[32px] min-h-[500px]'}`}
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
                    >
                        {/* Header */}
                        <div className={`flex flex-none items-center justify-between px-6 py-4 z-50 transition-colors ${creationMode ? 'bg-white/80 border-b border-slate-100 backdrop-blur-md' : 'absolute top-0 right-0 w-full'}`}>
                            {creationMode ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                        <AcademicCapIcon className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 tracking-wide">
                                        {creationMode === 'ai' ? 'AI Assessment Generator' : 'Manual Quiz Builder'}
                                    </span>
                                </div>
                            ) : <div />}

                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all focus:outline-none"
                            >
                                <XMarkIcon className="w-6 h-6" strokeWidth={2} />
                            </button>
                        </div>

                        <div className="flex-1 w-full relative overflow-y-auto custom-scrollbar">
                            <Suspense fallback={<LoadingPanel />}>
                                {creationMode === 'ai' && (
                                    <AiQuizGenerator
                                        onClose={handleClose}
                                        onBack={() => setCreationMode(null)}
                                        unitId={unitId}
                                        subjectId={subjectId}
                                    />
                                )}

                                {creationMode === 'manual' && (
                                    <ManualQuizCreator
                                        onClose={handleClose}
                                        onBack={() => setCreationMode(null)}
                                        unitId={unitId}
                                        subjectId={subjectId}
                                    />
                                )}

                                {!creationMode && (
                                    <div className="absolute inset-0 flex flex-col md:flex-row pt-14">
                                        {/* Left branding */}
                                        <div className="w-full md:w-[40%] p-8 md:p-10 flex flex-col items-start justify-center text-left bg-gradient-to-br from-slate-50 to-white border-r border-slate-100">
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, ...SPRING }}
                                                className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-orange-500 to-red-500 shadow-xl shadow-orange-500/30 flex items-center justify-center mb-6"
                                            >
                                                <AcademicCapIcon className="w-10 h-10 text-white" />
                                            </motion.div>
                                            <motion.h2
                                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                                                className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-3"
                                            >
                                                New Assessment
                                            </motion.h2>
                                            <motion.p
                                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                                                className="text-sm font-medium text-slate-500 leading-relaxed"
                                            >
                                                Measure student understanding. Choose to construct manually or use our smart form generator.
                                            </motion.p>
                                        </div>

                                        {/* Right options */}
                                        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center bg-slate-50/50">
                                            <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto w-full relative">
                                                <CreatorOptionCard
                                                    index={0}
                                                    title="AI Quiz Wizard"
                                                    description="Automatically generate varying question types from provided rubrics and materials."
                                                    icon={SparklesIcon}
                                                    gradient="from-amber-500 to-orange-500"
                                                    onClick={() => handleModeSelect('ai')}
                                                />
                                                <CreatorOptionCard
                                                    index={1}
                                                    title="Manual Builder"
                                                    description="Construct specific question sets with complete control over answer keys."
                                                    icon={DocumentPlusIcon}
                                                    gradient="from-sky-500 to-blue-600"
                                                    onClick={() => handleModeSelect('manual')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <AnimatePresence>
                                    {showAiWarning && (
                                        <AiLimitationWarning
                                            onConfirm={confirmAiMode}
                                            onCancel={() => setShowAiWarning(false)}
                                        />
                                    )}
                                </AnimatePresence>
                            </Suspense>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        </Portal>
    );
}