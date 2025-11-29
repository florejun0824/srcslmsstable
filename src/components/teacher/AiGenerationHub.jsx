import React, { useState, useEffect } from 'react';
import CreateLearningGuideModal from './CreateLearningGuideModal';
import CreateUlpModal from './CreateUlpModal';
import CreateAtgModal from './CreateAtgModal';
import CreateExamAndTosModal from './CreateExamAndTosModal';
import {
    DocumentTextIcon,
    DocumentChartBarIcon,
    AcademicCapIcon,
    XMarkIcon,
    PencilSquareIcon,
    ArrowRightIcon,
    SparklesIcon,
    ComputerDesktopIcon
} from '@heroicons/react/24/outline';

// --- MOBILE RESTRICTION OVERLAY (Refined) ---
const MobileRestricted = ({ onClose }) => (
    <div className="fixed inset-0 z-[300] bg-[#f2f2f7]/90 dark:bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center md:hidden animate-in fade-in duration-300">
        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-slate-100 to-white dark:from-[#1c1c1e] dark:to-[#2c2c2e] shadow-2xl flex items-center justify-center mb-8 border border-white/50 dark:border-white/10 ring-1 ring-black/5">
            <ComputerDesktopIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 mb-3 tracking-tight">
            Desktop Experience
        </h3>
        <p className="text-[15px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium mb-8">
            The AI Studio is optimized for larger canvases. Please switch to a tablet or desktop for the full magical experience.
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
            <a 
                href="https://srcslms.netlify.app"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-4 rounded-[20px] bg-[#007AFF] text-white font-semibold text-[15px] shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:brightness-110"
            >
                Open Desktop Version
            </a>
            <button 
                onClick={onClose}
                className="w-full py-4 rounded-[20px] bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white font-semibold text-[15px] shadow-sm border border-black/5 dark:border-white/10 active:scale-[0.98] transition-all hover:bg-slate-50 dark:hover:bg-[#2c2c2e]"
            >
                Dismiss
            </button>
        </div>
    </div>
);

/**
 * 🍬 AIToolButton Component (Candy/Glass Style)
 */
const AIToolButton = ({ title, description, icon: Icon, iconColor, onClick, disabled, badge }) => {
    // 🎨 Vibrant Candy Gradients
    const gradientMap = {
        'bg-blue-500': {
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            icon: 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-500/40',
            text: 'text-blue-600 dark:text-blue-300',
            border: 'group-hover:border-blue-500/30'
        },
        'bg-purple-500': {
            bg: 'bg-purple-50 dark:bg-purple-500/10',
            icon: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-purple-500/40',
            text: 'text-purple-600 dark:text-purple-300',
            border: 'group-hover:border-purple-500/30'
        },
        'bg-teal-500': {
            bg: 'bg-teal-50 dark:bg-teal-500/10',
            icon: 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-teal-500/40',
            text: 'text-teal-600 dark:text-teal-300',
            border: 'group-hover:border-teal-500/30'
        },
        'bg-amber-500': {
            bg: 'bg-orange-50 dark:bg-orange-500/10',
            icon: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/40',
            text: 'text-orange-600 dark:text-orange-300',
            border: 'group-hover:border-orange-500/30'
        },
    };
    
    const theme = gradientMap[iconColor] || gradientMap['bg-blue-500'];

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onClick();
            }}
            disabled={disabled}
            className={`group relative p-6 rounded-[32px] text-left h-full flex flex-col transition-all duration-500 ease-out border
                ${disabled
                    ? 'bg-slate-50/50 dark:bg-white/5 border-transparent opacity-40 cursor-not-allowed grayscale'
                    : `bg-white/60 dark:bg-[#1c1c1e]/60 hover:bg-white/80 dark:hover:bg-[#2c2c2e]/80 border-white/40 dark:border-white/5 ${theme.border} shadow-xl hover:shadow-2xl hover:shadow-black/5 backdrop-blur-xl hover:-translate-y-1 active:scale-[0.98]`
                }`}
        >
            {/* Inner Glow Gradient */}
            <div className={`absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/40 to-transparent dark:from-white/5`} />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center shadow-lg ${theme.icon} text-white ring-4 ring-white/50 dark:ring-white/5 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                    <Icon className="w-7 h-7 stroke-[2.5]" />
                </div>
                {badge && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-orange-600 dark:text-orange-300 border border-orange-200/50 dark:border-orange-500/20 shadow-sm">
                        {badge}
                    </span>
                )}
            </div>

            <div className="mt-auto relative z-10">
                <h3 className="text-[19px] font-bold text-slate-800 dark:text-white tracking-tight leading-snug mb-1.5 group-hover:text-black dark:group-hover:text-white transition-colors">
                    {title}
                </h3>
                <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {description}
                </p>
            </div>

            {/* Hover Action Icon */}
            {!disabled && (
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                        <ArrowRightIcon className="w-4 h-4 text-slate-900 dark:text-white stroke-[3]" />
                    </div>
                </div>
            )}
        </button>
    );
};

/**
 * 🧠 AiGenerationHub Component
 */
export default function AiGenerationHub({ isOpen, onClose, subjectId, unitId }) {
    const [view, setView] = useState('menu');

    useEffect(() => {
        if (!isOpen) {
            const timeout = setTimeout(() => setView('menu'), 300);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    const handleCloseAll = () => {
        setView('menu');
        onClose();
    };

    const generatorOptions = [
        {
            title: "Learning Guide",
            description: "Generate student-facing lessons.",
            icon: AcademicCapIcon,
            iconColor: "bg-blue-500",
            action: () => setView('guide'),
            disabled: !unitId
        },
        {
            title: "PEAC ULP",
            description: "Comprehensive Unit Learning Plan.",
            icon: DocumentChartBarIcon,
            iconColor: "bg-purple-500",
            action: () => setView('ulp'),
            disabled: !unitId
        },
        {
            title: "PEAC ATG",
            description: "Detailed Adaptive Teaching Guide.",
            icon: DocumentTextIcon,
            iconColor: "bg-teal-500",
            action: () => setView('atg'),
            disabled: !unitId
        },
        {
            title: "Exam & TOS",
            description: "Exam with Table of Specifications.",
            icon: PencilSquareIcon,
            iconColor: "bg-amber-500",
            action: () => setView('exam'),
            disabled: !unitId,
            badge: "BETA"
        }
    ];

    if (!isOpen) return null;

    // Active modal selection logic
    let ActiveGeneratorModal = null;
    if (view === 'guide') {
        ActiveGeneratorModal = <CreateLearningGuideModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />;
    } else if (view === 'ulp') {
        ActiveGeneratorModal = <CreateUlpModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />;
    } else if (view === 'atg') {
        ActiveGeneratorModal = <CreateAtgModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />;
    } else if (view === 'exam') {
        ActiveGeneratorModal = <CreateExamAndTosModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />;
    }

    return (
        <>
            {view === 'menu' && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden"
                    onClick={handleCloseAll}
                >
                    {/* Deep Blur Backdrop with colored aura */}
                    <div className="absolute inset-0 bg-[#e0e0e0]/40 dark:bg-black/60 backdrop-blur-3xl transition-opacity duration-500" />
                    
                    {/* Atmospheric Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

                    {/* Mobile Restriction Layer (Visible < md) */}
                    <MobileRestricted onClose={handleCloseAll} />

                    {/* Desktop/Tablet Content Container (Visible >= md) */}
                    <div
                        className="hidden md:flex flex-col relative w-full max-w-6xl bg-white/75 dark:bg-[#161618]/75 backdrop-blur-[40px] rounded-[40px] shadow-2xl border border-white/50 dark:border-white/10 p-10 animate-in zoom-in-95 duration-300 ring-1 ring-black/5 dark:ring-white/5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-10">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-4 ring-white/50 dark:ring-white/10">
                                    <SparklesIcon className="w-8 h-8 text-white stroke-[2]" />
                                </div>
                                <div>
                                    <h2 className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                        AI Studio
                                    </h2>
                                    <p className="text-[16px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        Generative tools to accelerate your workflow.
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleCloseAll}
                                className="group p-3 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-90 border border-transparent hover:border-black/5 dark:hover:border-white/10"
                            >
                                <XMarkIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors stroke-[2.5]" />
                            </button>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            {generatorOptions.map((option) => (
                                <div key={option.title} className="col-span-1 min-h-[260px]">
                                    <AIToolButton
                                        title={option.title}
                                        description={option.description}
                                        icon={option.icon}
                                        iconColor={option.iconColor}
                                        onClick={option.action}
                                        disabled={option.disabled}
                                        badge={option.badge}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Layered Modals */}
            {ActiveGeneratorModal && (
                <div className="relative z-[250]">
                     {ActiveGeneratorModal}
                </div>
            )}
        </>
    );
}