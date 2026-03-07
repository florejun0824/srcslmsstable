// src/components/teacher/AiGenerationHub.jsx
import React, { useState, useEffect, useCallback, memo, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
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
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...SPRING, delay: index * 0.1 }}
        whileHover={{ scale: 1.03, y: -5 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className="relative group w-full p-5 sm:p-6 text-left rounded-[24px] md:rounded-[32px] overflow-hidden 
                   border border-white/40 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-blue-500/20
                   transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                   bg-white/80 backdrop-blur-3xl flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0"
    >
        {/* Animated Background Gradient */}
        <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
        <div className={`absolute -top-12 -right-12 sm:-top-24 sm:-right-24 w-32 h-32 sm:w-48 sm:h-48 rounded-full blur-[40px] sm:blur-[60px] opacity-40 group-hover:opacity-80 transition-opacity duration-700 bg-gradient-to-br ${gradient}`} />

        {/* Floating Icon Orb */}
        <div className="relative z-10 w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-[16px] sm:rounded-[20px] sm:mb-6 flex items-center justify-center
                        bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white
                        group-hover:rotate-6 transition-transform duration-500">
            <div className={`absolute inset-0 rounded-[16px] sm:rounded-[20px] opacity-20 bg-gradient-to-br ${gradient}`} />
            <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-800" strokeWidth={1.5} />
        </div>

        {/* Text Details */}
        <div className="relative z-10 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
                {title}
            </h3>
            <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 leading-relaxed line-clamp-2">
                {description}
            </p>
        </div>

        {/* Shine Effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
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
            description: 'Craft detailed lesson plans tailored to curriculum objectives.',
            icon: DocumentTextIcon,
            gradient: 'from-blue-400 to-indigo-500',
            action: () => setActiveGenerator('lesson'),
        },
        {
            id: 'ulp',
            title: 'Unit Learning Plan',
            description: 'Structure comprehensive ULPs with aligned competencies.',
            icon: ChartBarIcon,
            gradient: 'from-sky-400 to-cyan-500',
            action: () => setActiveGenerator('ulp'),
        },
        {
            id: 'atg',
            title: 'Adaptive Teaching',
            description: 'Generate non-linear teaching guides for diverse learners.',
            icon: CpuChipIcon,
            gradient: 'from-emerald-400 to-teal-500',
            action: () => setActiveGenerator('atg'),
        },
        {
            id: 'exam',
            title: 'Exam & TOS',
            description: 'Synthesize balanced assessments and Spec Tables instantly.',
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Immersive Blur Backdrop */}
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        className="fixed inset-0 bg-slate-900/30 back"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={SPRING}
                        className="relative w-full max-w-4xl min-h-[auto] md:min-h-[600px] flex flex-col md:flex-row rounded-[32px] md:rounded-[40px] overflow-hidden bg-white/40 shadow-2xl shadow-blue-900/20 border border-white/60"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
                    >
                        {/* Close Button - Moved here so it's always accessible at top right */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white/10 md:bg-white border border-white/20 md:border-slate-200 flex items-center justify-center text-white md:text-slate-500 hover:bg-white/20 md:hover:bg-red-50 hover:text-white md:hover:text-red-500 md:hover:border-red-100 shadow-sm transition-all z-50 backdrop-blur-md"
                        >
                            <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
                        </button>

                        {/* LEFT PANEL: Branding & Context (Dark vibrant glass) */}
                        <div className="relative w-full md:w-2/5 p-8 md:p-10 flex flex-col justify-between overflow-hidden bg-slate-900 shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-900/40" />
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-teal-500/10 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

                            <div className="relative z-10 pr-10 md:pr-0">
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                                    className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-6 md:mb-8 shadow-2xl"
                                >
                                    <SparklesIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-300" />
                                </motion.div>
                                <motion.h2
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                                    className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3 md:mb-4 leading-[1.1]"
                                >
                                    AI Studio <br className="hidden sm:block" />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300 space-x-2 sm:space-x-0">Creator</span>
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                                    className="text-slate-300/80 font-medium text-sm leading-relaxed max-w-full md:max-w-[280px] mb-4 md:mb-0"
                                >
                                    Supercharge your curriculum design. Select a module to harness our advanced teaching models.
                                </motion.p>
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                className="relative z-10 hidden md:flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 w-fit backdrop-blur-sm"
                            >
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-w w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[11px] font-bold tracking-widest text-slate-300 uppercase">Gemini 3.0 Active</span>
                            </motion.div>
                        </div>

                        {/* RIGHT PANEL: Generator Cards */}
                        <div className="relative w-full md:w-3/5 p-6 sm:p-8 md:p-10 bg-[#f8fafc]/80 backdrop-blur-3xl flex flex-col">
                            <div className="flex-1 mt-2 md:mt-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 h-full">
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