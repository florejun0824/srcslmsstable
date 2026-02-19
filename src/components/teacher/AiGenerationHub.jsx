// src/components/lessons/AiGenerationHub.jsx
import React, { useState, useEffect } from 'react';
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
    ChevronRightIcon
} from '@heroicons/react/24/solid';

// --- MACOS UI HELPERS ---

const MacTrafficLights = ({ onClose }) => (
    <div className="flex gap-2 group">
        {/* Close (Red) */}
        <button 
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] flex items-center justify-center hover:brightness-90 transition-all"
        >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4c0b0b]">✕</span>
        </button>
        {/* Minimize (Yellow) - Visual only for this context */}
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4c3e0b]">-</span>
        </div>
        {/* Expand (Green) - Visual only for this context */}
        <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#0b4c14]">＋</span>
        </div>
    </div>
);

const MacAppIcon = ({ icon: Icon, gradient }) => (
    <div className={`w-12 h-12 rounded-[14px] shadow-md flex items-center justify-center text-white ${gradient} ring-1 ring-black/5`}>
        <Icon className="w-6 h-6 drop-shadow-sm" />
    </div>
);

const MacListItem = ({ title, description, icon, gradient, onClick, delay }) => {
    return (
        <button
            onClick={onClick}
            style={{ animationDelay: `${delay}ms` }}
            className="group w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 
                       hover:bg-white/50 dark:hover:bg-white/10 active:scale-[0.98]
                       border border-transparent hover:border-black/5 dark:hover:border-white/10
                       animate-in slide-in-from-bottom-2 fade-in fill-mode-backwards"
        >
            <MacAppIcon icon={icon} gradient={gradient} />
            
            <div className="flex-1 text-left">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                    {title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                    {description}
                </p>
            </div>

            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100/50 dark:bg-gray-700/50 text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-colors">
                <ChevronRightIcon className="w-4 h-4" />
            </div>
        </button>
    );
};

export default function AiGenerationHub({ isOpen, onClose, unitId, subjectId }) {
    const [activeGenerator, setActiveGenerator] = useState(null);
    const { darkMode } = useTheme();

    // Lock Scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const generatorOptions = [
        {
            id: 'lesson',
            title: "Lesson Guide",
            description: "Craft detailed lesson plans tailored to curriculum standards.",
            icon: DocumentTextIcon,
            gradient: "bg-gradient-to-br from-blue-400 to-blue-600",
            action: () => setActiveGenerator('lesson'),
        },
        {
            id: 'ulp',
            title: "Unit Learning Plan",
            description: "Structure comprehensive Unit Learning Plans (ULP) effortlessly.",
            icon: ChartBarIcon,
            gradient: "bg-gradient-to-br from-purple-400 to-indigo-600",
            action: () => setActiveGenerator('ulp'),
        },
        {
            id: 'atg',
            title: "Adaptive Teaching",
            description: "Generate non-linear guides for diverse learners.",
            icon: CpuChipIcon,
            gradient: "bg-gradient-to-br from-emerald-400 to-teal-600",
            action: () => setActiveGenerator('atg'),
        },
        {
            id: 'exam',
            title: "Exam & TOS",
            description: "Synthesize balanced assessments and specification tables.",
            icon: AcademicCapIcon,
            gradient: "bg-gradient-to-br from-orange-400 to-pink-600",
            action: () => setActiveGenerator('exam'),
        }
    ];

    if (!isOpen) return null;

    // Helper to close internal modal and return to hub (or close everything)
    const handleCloseChild = () => {
        setActiveGenerator(null);
        // Optional: If you want closing the child to close the hub entirely, call onClose() here instead.
        // currently, it returns to the Hub menu.
    };

    const renderActiveModal = () => {
        const commonProps = { isOpen: true, onClose: handleCloseChild, unitId, subjectId };
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
            {/* LOGIC: 
               We only render the Hub Window if activeGenerator is NULL.
               This ensures the Hub is physically removed from the DOM when a tool is selected,
               guaranteeing it never covers the new modal.
            */}
            {!activeGenerator && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    
                    {/* Backdrop - macOS style uses a subtle dark overlay */}
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
                        onClick={onClose}
                    />

                    {/* macOS Window Container */}
                    <div className="
                        relative w-full max-w-2xl overflow-hidden
                        bg-white/80 dark:bg-[#1e1e1e]/80 
                        backdrop-blur-2xl saturate-150
                        rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10
                        animate-in zoom-in-95 duration-200 ease-out
                        flex flex-col max-h-[85vh]
                    ">
                        
                        {/* Window Title Bar (Draggable Area visual) */}
                        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                            <MacTrafficLights onClose={onClose} />
                            <div className="absolute left-0 right-0 text-center pointer-events-none">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide">
                                    Creation Studio
                                </span>
                            </div>
                            <div className="w-10" /> {/* Spacer for centering */}
                        </div>

                        {/* Content Area */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                            
                            {/* Header Text */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-[22px] bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-inner">
                                    <SparklesIcon className="w-8 h-8 text-gray-400 dark:text-gray-200" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    What would you like to create?
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Select an AI module to generate content for your curriculum.
                                </p>
                            </div>

                            {/* Grid of Tools */}
                            <div className="grid grid-cols-1 gap-3">
                                {generatorOptions.map((option, idx) => (
                                    <MacListItem 
                                        key={option.id}
                                        {...option}
                                        delay={idx * 50}
                                        onClick={option.action}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Status Bar / Footer */}
                        <div className="px-4 py-2 border-t border-gray-200/50 dark:border-white/10 bg-gray-50/30 dark:bg-white/5 flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 font-medium">
                                AI Model: Gemini 3.0 Pro
                            </span>
                            <span className="text-[10px] text-gray-400">
                                v2.4.0
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Modal Container */}
            {/* Since the Hub above is hidden when this is true, this modal takes full focus */}
            {activeGenerator && (
                <div className="relative z-[200]">
                    {renderActiveModal()}
                </div>
            )}
        </>
    );
}