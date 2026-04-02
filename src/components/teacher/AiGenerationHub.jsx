// src/components/teacher/AiGenerationHub.jsx
import React, { useState, useEffect, useCallback, memo, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import CreateLearningGuideModal from './CreateLearningGuideModal';
import CreateUlpModal from './CreateUlpModal';
import CreateAtgModal from './CreateAtgModal';
import CreateExamAndTosModal from './CreateExamAndTosModal';
import {
    DocumentTextIcon,
    AcademicCapIcon,
    ChartBarIcon,
    CpuChipIcon,
    SparklesIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

const GlassCard = memo(({ title, description, icon: Icon, gradient, index, onClick }) => (
    <motion.button
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...SPRING, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={{ willChange: 'transform, opacity' }}
        className="relative group w-full p-4 sm:p-6 text-left rounded-[24px] md:rounded-[32px] overflow-hidden 
                   border border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-xl
                   transition-all duration-300 focus:outline-none
                   bg-white dark:bg-slate-900/95 md:bg-white/80 md:dark:bg-slate-900/80 md:backdrop-blur-2xl 
                   flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0"
    >
        {/* Ambient Glows - Desktop only to save mobile GPU */}
        <div className={`hidden md:block absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
        <div className={`hidden md:block absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 bg-gradient-to-br ${gradient}`} />

        {/* Floating Icon Orb */}
        <div className={`relative z-10 w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-[16px] sm:rounded-[22px] sm:mb-6 flex items-center justify-center
                        bg-slate-50 dark:bg-slate-800 shadow-inner border border-white dark:border-white/5
                        group-hover:rotate-6 transition-transform duration-500`}>
            <div className={`absolute inset-0 rounded-[16px] sm:rounded-[22px] opacity-10 bg-gradient-to-br ${gradient}`} />
            <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-800 dark:text-white stroke-[2]" />
        </div>

        {/* Text Details */}
        <div className="relative z-10 flex-1">
            <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 sm:mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {title}
            </h3>
            <p className="text-[11px] sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                {description}
            </p>
        </div>

        {/* Premium Shine Effect - Desktop only */}
        <div className="hidden md:block absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
    </motion.button>
));


export default function AiGenerationHub({ isOpen, onClose, unitId, subjectId }) {
    const [activeGenerator, setActiveGenerator] = useState(null);

    useEffect(() => {
        if (!isOpen) setActiveGenerator(null);
    }, [isOpen]);

    const generatorOptions = [
        {
            id: 'lesson',
            title: 'Lesson Guide',
            description: 'Craft detailed lesson plans tailored to objectives.',
            icon: DocumentTextIcon,
            gradient: 'from-blue-400 to-indigo-500',
            action: () => setActiveGenerator('lesson'),
        },
        {
            id: 'ulp',
            title: 'Unit Plan',
            description: 'Structure comprehensive ULPs with alignment.',
            icon: ChartBarIcon,
            gradient: 'from-sky-400 to-cyan-500',
            action: () => setActiveGenerator('ulp'),
        },
        {
            id: 'atg',
            title: 'Adaptive Teaching',
            description: 'Generate guides for diverse student learners.',
            icon: CpuChipIcon,
            gradient: 'from-emerald-400 to-teal-500',
            action: () => setActiveGenerator('atg'),
        },
        {
            id: 'exam',
            title: 'Exam & TOS',
            description: 'Synthesize balanced assessments and spec tables.',
            icon: AcademicCapIcon,
            gradient: 'from-amber-400 to-orange-500',
            action: () => setActiveGenerator('exam'),
        },
    ];

    const renderActiveModal = useCallback(() => {
        const commonProps = { isOpen: true, onClose: () => setActiveGenerator(null), unitId, subjectId };
        switch (activeGenerator) {
            case 'lesson': return <CreateLearningGuideModal {...commonProps} />;
            case 'ulp': return <CreateUlpModal {...commonProps} />;
            case 'atg': return <CreateAtgModal {...commonProps} />;
            case 'exam': return <CreateExamAndTosModal {...commonProps} />;
            default: return null;
        }
    }, [activeGenerator, unitId, subjectId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {!activeGenerator && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
                    {/* Immersive Backdrop - Reduced blur on mobile for performance */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 md:backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={SPRING}
                        style={{ willChange: 'transform, opacity' }}
                        className="relative w-full max-w-4xl flex flex-col md:flex-row rounded-[32px] md:rounded-[40px] overflow-hidden bg-white dark:bg-slate-950 shadow-2xl border border-white/20 dark:border-white/5"
                    >
                        {/* Premium Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-all z-50 active:scale-90"
                        >
                            <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {/* LEFT PANEL: Branding & Context (Dark vibrant glass) */}
                        <div className="relative w-full md:w-2/5 p-6 md:p-10 flex flex-col justify-between overflow-hidden bg-slate-900 shrink-0">
                            {/* Animated Background Gradients - Locked to Desktop */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-900/40" />
                            <div className="hidden md:block absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                            <div className="hidden md:block absolute bottom-0 left-0 w-[300px] h-[300px] bg-teal-500/10 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

                            <div className="relative z-10 pr-10 md:pr-0">
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                                    className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-5 md:mb-8 shadow-2xl"
                                >
                                    <SparklesIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-300" />
                                </motion.div>
                                <motion.h2
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                                    className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-2 md:mb-4 leading-tight"
                                >
                                    AI Studio <br className="hidden md:block" />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">Creator</span>
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                                    className="text-slate-400 font-bold text-xs md:text-sm leading-relaxed max-w-[280px]"
                                >
                                    Select a specialized generator to leverage our high-fidelity teaching models.
                                </motion.p>
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className="relative z-10 hidden md:flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 w-fit backdrop-blur-sm"
                            >
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">System Core Online</span>
                            </motion.div>
                        </div>

                        {/* RIGHT PANEL: Generator Cards */}
                        <div className="relative w-full md:w-3/5 p-4 sm:p-8 md:p-10 bg-slate-50 dark:bg-slate-900 flex flex-col">
                            <div className="flex-1 mt-0 md:mt-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                                    {generatorOptions.map((opt, idx) => (
                                        <GlassCard
                                            key={opt.id}
                                            {...opt}
                                            onClick={opt.action}
                                            index={idx}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Active Sub-Modal */}
            {activeGenerator && (
                <div className="relative z-[200]">
                    {renderActiveModal()}
                </div>
            )}
        </AnimatePresence>
    );
}