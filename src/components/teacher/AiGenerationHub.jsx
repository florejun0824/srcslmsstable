// src/components/lessons/AiGenerationHub.jsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import CreateLearningGuideModal from './CreateLearningGuideModal';
import CreateUlpModal from './CreateUlpModal';
import CreateAtgModal from './CreateAtgModal';
import CreateExamAndTosModal from './CreateExamAndTosModal';
import {
    SparklesIcon,
    XMarkIcon,
    ArrowRightIcon,
    DocumentTextIcon,
    AcademicCapIcon,
    ChartBarIcon,
    CpuChipIcon,
    MoonIcon
} from '@heroicons/react/24/solid';

// --- MOONLIGHT OS STYLES ---
const MOONLIGHT_STYLES = `
    @keyframes moon-float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
    }
    @keyframes star-twinkle {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
    }
    @keyframes beam-scan {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    .moon-bg {
        background: radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 100%);
    }
    
    .moon-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(12px); 
        -webkit-backdrop-filter: blur(12px);
    }

    /* The "Moonlight" Rim Light Effect */
    .moon-card:hover {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 0 30px rgba(148, 163, 184, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
    }
    
    .moon-text-glow {
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    }
    
    .moon-beam {
        position: absolute;
        top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
        opacity: 0.3;
    }
`;

// --- MOONLIGHT CARD COMPONENT ---
const MoonlightCard = ({ title, description, icon: Icon, onClick, badge, index }) => {
    return (
        <button
            onClick={onClick}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`
                group relative w-full h-full flex flex-col p-6 text-left
                rounded-[24px] transition-all duration-500 ease-out
                moon-card overflow-hidden
                animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards
            `}
        >
            {/* Top Beam Light */}
            <div className="moon-beam group-hover:opacity-100 transition-opacity duration-500" />

            {/* Header */}
            <div className="relative z-10 flex justify-between items-start w-full mb-6">
                <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center
                    bg-white/5 border border-white/10 
                    text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)]
                    group-hover:text-white group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]
                    transition-all duration-500 group-hover:scale-110
                `}>
                    <Icon className="w-6 h-6" />
                </div>
                
                {badge && (
                    <span className={`
                        px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                        bg-indigo-500/10 border border-indigo-400/20 text-indigo-300
                        shadow-lg
                    `}>
                        {badge}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1">
                <h3 className="text-xl font-medium tracking-wide text-white mb-2 group-hover:moon-text-glow transition-all">
                    {title}
                </h3>
                <p className="text-sm font-light text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">
                    {description}
                </p>
            </div>

            {/* Action Footer */}
            <div className="relative z-10 mt-8 flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-300 transition-colors">
                    Initialize
                </span>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                    <ArrowRightIcon className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
                </div>
            </div>
        </button>
    );
};

export default function AiGenerationHub({ isOpen, onClose, unitId, subjectId }) {
    const [activeGenerator, setActiveGenerator] = useState(null);

    // Lock Scroll & Inject Styles
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (!document.getElementById('moonlight-styles')) {
                const style = document.createElement('style');
                style.id = 'moonlight-styles';
                style.innerHTML = MOONLIGHT_STYLES;
                document.head.appendChild(style);
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const generatorOptions = [
        {
            title: "Lesson Guide",
            description: "Craft detailed lesson plans tailored to curriculum standards.",
            icon: DocumentTextIcon,
            action: () => setActiveGenerator('lesson'),
            badge: "Essentials",
        },
        {
            title: "Unit Learning Plan",
            description: "Structure comprehensive Unit Learning Plans (ULP) effortlessly.",
            icon: ChartBarIcon,
            action: () => setActiveGenerator('ulp'),
            badge: "Structure",
        },
        {
            title: "Adaptive Teaching Guide",
            description: "Generate non-linear teaching guides for diverse learners.",
            icon: CpuChipIcon,
            action: () => setActiveGenerator('atg'),
        },
        {
            title: "Exam & TOS",
            description: "Synthesize balanced assessments and specification tables.",
            icon: AcademicCapIcon,
            action: () => setActiveGenerator('exam'),
            badge: "New",
        }
    ];

    if (!isOpen) return null;

    const renderActiveModal = () => {
        const commonProps = { isOpen: true, onClose: () => setActiveGenerator(null), unitId, subjectId };
        switch (activeGenerator) {
            case 'lesson': return <CreateLearningGuideModal {...commonProps} />;
            case 'ulp': return <CreateUlpModal {...commonProps} />;
            case 'atg': return <CreateAtgModal {...commonProps} />;
            case 'exam': return <CreateExamAndTosModal {...commonProps} />;
            default: return null;
        }
    };

    return (
        <>
            {!activeGenerator && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    
                    {/* --- BACKGROUND (Night Sky) --- */}
                    <div 
                        className="fixed inset-0 bg-[#020617]/90 backdrop-blur-sm transition-opacity duration-500"
                        onClick={onClose}
                    />

                    {/* --- MAIN CONTAINER (The Monolith) --- */}
                    <div className={`
                        relative w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden
                        rounded-[32px] shadow-2xl ring-1 ring-white/10
                        moon-bg animate-in zoom-in-95 duration-500 ease-out
                    `}>
                        
                        {/* Decorative: Ambient Glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[100px] pointer-events-none rounded-full" />

                        {/* --- HEADER --- */}
                        <div className="relative z-10 flex-shrink-0 px-8 pt-10 pb-6 flex items-start justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-white/5 border border-white/10 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                                    <MoonIcon className="w-3 h-3 text-indigo-300" />
                                    <span>Moonlight OS</span>
                                </div>
                                <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-white mb-2">
                                    Creation <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Hub.</span>
                                </h2>
                                <p className="text-sm sm:text-base font-light text-slate-400 max-w-md">
                                    Select an intelligence module to begin generating content.
                                </p>
                            </div>
                            
                            <button 
                                onClick={onClose}
                                className="group p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                            >
                                <XMarkIcon className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* --- CONTENT GRID --- */}
                        <div className="relative z-10 flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {generatorOptions.map((option, idx) => (
                                    <div key={option.title} className="h-[240px]">
                                        <MoonlightCard
                                            index={idx}
                                            title={option.title}
                                            description={option.description}
                                            icon={option.icon}
                                            onClick={option.action}
                                            badge={option.badge}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- FOOTER STATUS --- */}
                        <div className="relative z-10 py-4 text-center border-t border-white/5 bg-[#020617]/50 backdrop-blur-md">
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                                    AI Core Online
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nested Active Generator */}
            {activeGenerator && (
                <div className="relative z-[200]">
                    {renderActiveModal()}
                </div>
            )}
        </>
    );
}