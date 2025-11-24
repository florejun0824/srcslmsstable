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

// --- MOBILE RESTRICTION OVERLAY ---
const MobileRestricted = ({ onClose }) => (
    <div className="fixed inset-0 z-[300] bg-[#f5f5f7] dark:bg-[#000000] flex flex-col items-center justify-center p-8 text-center md:hidden animate-in fade-in duration-300">
        <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-[#1c1c1e] shadow-2xl flex items-center justify-center mb-8 border border-black/5 dark:border-white/10">
            <ComputerDesktopIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Desktop Experience</h3>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium mb-8">
            This AI workspace is optimized for larger screens. Please switch to a tablet or desktop device for the full experience.
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
            <a 
                href="https://srcslms.netlify.app"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-[18px] bg-[#007AFF] text-white font-bold text-[15px] shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                Open Desktop Version
            </a>
            <button 
                onClick={onClose}
                className="w-full py-3.5 rounded-[18px] bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white font-bold text-[15px] shadow-sm border border-black/5 dark:border-white/10 active:scale-95 transition-all"
            >
                Close
            </button>
        </div>
    </div>
);

/**
 * 🧩 AIToolButton Component (iPadOS Style)
 */
const AIToolButton = ({ title, description, icon: Icon, iconColor, onClick, disabled, badge }) => {
    // 🎨 iPadOS Gradient Maps
    const gradientMap = {
        'bg-blue-500': 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/30',
        'bg-purple-500': 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-500/30',
        'bg-teal-500': 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-500/30',
        'bg-amber-500': 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30',
    };
    
    // Default fallback
    const iconBg = gradientMap[iconColor] || 'bg-gradient-to-br from-slate-400 to-slate-600';

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onClick();
            }}
            disabled={disabled}
            className={`group relative p-5 rounded-[24px] text-left h-full flex flex-col transition-all duration-300 border
                ${disabled
                    ? 'bg-white/20 dark:bg-white/5 border-transparent opacity-50 cursor-not-allowed'
                    : 'bg-white/40 dark:bg-[#1c1c1e]/40 hover:bg-white/60 dark:hover:bg-[#2c2c2e]/60 border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl backdrop-blur-md active:scale-[0.98]'
                }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-lg ${iconBg} text-white`}>
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                {badge && (
                    <span className="text-[10px] font-bold px-2 py-1 bg-white/50 dark:bg-white/10 text-slate-900 dark:text-white rounded-full border border-black/5 dark:border-white/10 backdrop-blur-sm">
                        {badge}
                    </span>
                )}
            </div>

            <div className="mt-auto">
                <h3 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight leading-snug mb-1">
                    {title}
                </h3>
                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Hover Indicator */}
            {!disabled && (
                <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-0 translate-x-2">
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                        <ArrowRightIcon className="w-4 h-4 text-slate-900 dark:text-white stroke-[2.5]" />
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

    // Active modal selection logic (unchanged)
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
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    onClick={handleCloseAll}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-[#e5e5e5]/40 dark:bg-black/60 backdrop-blur-xl transition-opacity" />

                    {/* Mobile Restriction Layer (Visible < md) */}
                    <MobileRestricted onClose={handleCloseAll} />

                    {/* Desktop/Tablet Content Container (Visible >= md) */}
                    <div
                        className="hidden md:flex flex-col relative w-full max-w-5xl bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/40 dark:border-white/5 p-8 animate-in zoom-in-95 duration-300 ring-1 ring-black/5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <SparklesIcon className="w-7 h-7 text-white stroke-[2]" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">AI Studio</h2>
                                    <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        Select a generative tool to begin
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleCloseAll}
                                className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-90"
                            >
                                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 stroke-[2.5]" />
                            </button>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:h-[320px]">
                            {generatorOptions.map((option) => (
                                <div key={option.title} className="col-span-1 h-full">
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