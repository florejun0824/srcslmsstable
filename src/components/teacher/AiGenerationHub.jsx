// src/components/lessons/AiGenerationHub.jsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
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
    ComputerDesktopIcon,
    BeakerIcon,
    ClipboardDocumentCheckIcon,
    BookOpenIcon
} from '@heroicons/react/24/solid'; // Switched to solid for richer One UI look

// --- ONE UI 8.5 MONET ENGINE ---
const getMonetPalette = (overlay) => {
    // Default "Brand" Palette (Samsung Blue-ish)
    const base = {
        bg: "bg-white dark:bg-[#121212]",
        modalBg: "bg-[#F7F9FC] dark:bg-[#1E1E1E]",
        accent: "bg-blue-600",
        accentGradient: "from-blue-500 to-indigo-600",
        accentLight: "bg-blue-50 dark:bg-blue-900/20",
        textPrimary: "text-slate-900 dark:text-white",
        textSecondary: "text-slate-500 dark:text-slate-400",
        textAccent: "text-blue-600 dark:text-blue-400",
        border: "border-slate-200 dark:border-slate-700",
        iconContainer: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
        ring: "focus:ring-blue-500",
        hoverShadow: "hover:shadow-blue-500/10"
    };

    switch (overlay) {
        case 'christmas':
            return {
                ...base,
                modalBg: "bg-[#F0FDF4] dark:bg-[#0a1f12]",
                accent: "bg-emerald-600",
                accentGradient: "from-emerald-500 to-green-600",
                accentLight: "bg-emerald-50 dark:bg-emerald-900/20",
                textAccent: "text-emerald-700 dark:text-emerald-400",
                iconContainer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
                ring: "focus:ring-emerald-500",
                hoverShadow: "hover:shadow-emerald-500/10"
            };
        case 'valentines':
            return {
                ...base,
                modalBg: "bg-[#FFF1F2] dark:bg-[#2a0a10]",
                accent: "bg-rose-600",
                accentGradient: "from-rose-500 to-pink-600",
                accentLight: "bg-rose-50 dark:bg-rose-900/20",
                textAccent: "text-rose-700 dark:text-rose-400",
                iconContainer: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
                ring: "focus:ring-rose-500",
                hoverShadow: "hover:shadow-rose-500/10"
            };
        case 'graduation':
            return {
                ...base,
                modalBg: "bg-[#FFFBEB] dark:bg-[#1f1a0a]",
                accent: "bg-amber-500",
                accentGradient: "from-amber-400 to-orange-500",
                accentLight: "bg-amber-50 dark:bg-amber-900/20",
                textAccent: "text-amber-700 dark:text-amber-400",
                iconContainer: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                ring: "focus:ring-amber-500",
                hoverShadow: "hover:shadow-amber-500/10"
            };
        case 'rainy':
            return {
                ...base,
                modalBg: "bg-[#F0F9FF] dark:bg-[#0a1a2a]",
                accent: "bg-cyan-600",
                accentGradient: "from-cyan-500 to-blue-600",
                accentLight: "bg-cyan-50 dark:bg-cyan-900/20",
                textAccent: "text-cyan-700 dark:text-cyan-400",
                iconContainer: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
                ring: "focus:ring-cyan-500",
                hoverShadow: "hover:shadow-cyan-500/10"
            };
        default:
            return base;
    }
};

// --- ONE UI CARD COMPONENT ---
const AIToolCard = ({ title, description, icon: Icon, onClick, disabled, badge, monet }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                group relative w-full h-full flex flex-col p-6 text-left
                rounded-[32px] border transition-all duration-300 ease-out
                ${disabled ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-1.5'}
                bg-white dark:bg-[#252525] 
                ${monet.border}
                shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none
                ${monet.hoverShadow} hover:shadow-2xl
            `}
        >
            {/* Header: Icon & Badge */}
            <div className="flex justify-between items-start w-full mb-5">
                <div className={`
                    w-16 h-16 rounded-[22px] flex items-center justify-center
                    bg-gradient-to-br ${monet.accentGradient}
                    text-white shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3
                `}>
                    <Icon className="w-8 h-8" />
                </div>
                
                {badge && (
                    <span className={`
                        px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                        ${monet.accentLight} ${monet.textAccent}
                    `}>
                        {badge}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
                <h3 className={`text-xl font-bold mb-2 tracking-tight ${monet.textPrimary}`}>
                    {title}
                </h3>
                <p className={`text-sm font-medium leading-relaxed ${monet.textSecondary}`}>
                    {description}
                </p>
            </div>

            {/* Footer Action */}
            <div className={`mt-6 flex items-center text-xs font-bold uppercase tracking-widest transition-colors ${monet.textAccent} group-hover:opacity-80`}>
                <span>Launch Tool</span>
                <ArrowRightIcon className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
        </button>
    );
};

export default function AiGenerationHub({ isOpen, onClose, unitId, subjectId }) {
    const [activeGenerator, setActiveGenerator] = useState(null);
    const { activeOverlay } = useTheme();
    
    // Get Dynamic One UI Theme
    const monet = getMonetPalette(activeOverlay);

    // --- ENHANCED OPTIONS CONFIGURATION ---
    const generatorOptions = [
        {
            title: "Learning Guide",
            description: "Generate comprehensive, pedagogically sound lesson plans aligned with K-12 standards instantly.",
            icon: BookOpenIcon,
            action: () => setActiveGenerator('lesson'),
            badge: "Most Popular",
        },
        {
            title: "Unit Learning Plan",
            description: "Structure entire learning units (ULP) with cohesive objectives, firm-up activities, and transfer tasks.",
            icon: DocumentChartBarIcon, // Represents structure/planning
            action: () => setActiveGenerator('ulp'),
            badge: "Strategic",
        },
        {
            title: "Adaptive Teaching Guide",
            description: "Create personalized ATG guides that adapt instruction for diverse learner needs and prerequisites.",
            icon: AcademicCapIcon, // Represents teaching mastery
            action: () => setActiveGenerator('atg'),
        },
        {
            title: "Assessment Suite",
            description: "Automatically construct balanced Exams and Tables of Specifications (TOS) based on your lessons.",
            icon: ClipboardDocumentCheckIcon, // Represents checking/testing
            action: () => setActiveGenerator('exam'),
            badge: "High Value",
        }
    ];

    if (!isOpen) return null;

    // --- RENDER ACTIVE MODAL ---
    const renderActiveModal = () => {
        const commonProps = {
            isOpen: true,
            onClose: () => setActiveGenerator(null),
            unitId,
            subjectId
        };

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
            {/* Main Hub Modal */}
            {!activeGenerator && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Glassmorphic Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl transition-opacity duration-300"
                        onClick={onClose}
                    />

                    {/* One UI Container */}
                    <div className={`
                        relative w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col
                        rounded-[40px] shadow-2xl ring-1 ring-white/10
                        ${monet.modalBg} animate-in fade-in zoom-in-95 duration-300
                    `}>
                        
                        {/* Header Section */}
                        <div className="flex-shrink-0 px-8 pt-10 pb-6 flex items-start justify-between">
                            <div className="max-w-2xl">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${monet.accentLight} ${monet.textAccent}`}>
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>AI Assistant Suite 8.5</span>
                                </div>
                                <h2 className={`text-4xl font-black tracking-tighter mb-3 ${monet.textPrimary}`}>
                                    What would you like to create?
                                </h2>
                                <p className={`text-lg font-medium ${monet.textSecondary}`}>
                                    Select a tool below to generate high-fidelity academic content tailored to your curriculum.
                                </p>
                            </div>
                            
                            <button 
                                onClick={onClose}
                                className={`
                                    p-3 rounded-full transition-all duration-200
                                    hover:bg-slate-200 dark:hover:bg-white/10
                                    ${monet.textSecondary}
                                `}
                            >
                                <XMarkIcon className="w-8 h-8" />
                            </button>
                        </div>

                        {/* Scrollable Grid Area */}
                        <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                {generatorOptions.map((option) => (
                                    <div key={option.title} className="h-full min-h-[240px]">
                                        <AIToolCard
                                            title={option.title}
                                            description={option.description}
                                            icon={option.icon}
                                            onClick={option.action}
                                            badge={option.badge}
                                            monet={monet}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer / Branding */}
                        <div className={`
                            px-8 py-4 text-center border-t 
                            ${monet.border} bg-white/50 dark:bg-black/10 backdrop-blur-md
                        `}>
                            <p className={`text-xs font-bold uppercase tracking-widest opacity-40 ${monet.textSecondary}`}>
                                SRCS LMS • ALL RIGHTS RESERVED
                            </p>
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