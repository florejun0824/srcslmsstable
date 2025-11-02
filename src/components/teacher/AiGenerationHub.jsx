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
} from '@heroicons/react/24/outline';

/**
 * 🧩 AIToolButton Component
 * - Responsive neumorphic tile for AI generation tools.
 * - Supports dark mode and click propagation protection.
 */
const AIToolButton = ({ title, description, icon: Icon, iconColor, onClick, disabled, badge }) => {
    const textColor = iconColor.replace('bg-', 'text-');

    // 🎨 Gradient map for subtle dark/light backgrounds
    const gradientMap = {
        'bg-blue-500': 'bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/40',
        'bg-purple-500': 'bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/40',
        'bg-teal-500': 'bg-gradient-to-br from-white to-teal-50 dark:from-slate-800 dark:to-teal-900/40',
        'bg-amber-500': 'bg-gradient-to-br from-white to-amber-50 dark:from-slate-800 dark:to-amber-900/40',
    };
    const gradientClass = gradientMap[iconColor] || 'bg-neumorphic-base dark:bg-neumorphic-base-dark';

    return (
        <button
            onClick={(e) => {
                e.stopPropagation(); // ✅ Prevent backdrop click
                if (!disabled) onClick();
            }}
            disabled={disabled}
            className={`group relative p-4 rounded-2xl text-left h-full flex flex-col transition-all duration-300
                ${
                    disabled
                        ? 'bg-slate-50 dark:bg-slate-800/40 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark opacity-60 cursor-not-allowed'
                        : `${gradientClass} shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark`
                }`}
        >
            <div className="mb-4 w-12 h-12 rounded-xl flex items-center justify-center bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                <Icon className={`w-7 h-7 ${textColor}`} />
            </div>

            <div className="flex items-center">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                {badge && (
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 bg-sky-100 dark:bg-sky-800 text-sky-700 dark:text-sky-300 rounded-full">
                        {badge}
                    </span>
                )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex-grow">{description}</p>

            <div className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-end">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {disabled ? 'Requires Unit' : 'Select'}
                </span>
                <ArrowRightIcon className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
            </div>
        </button>
    );
};

/**
 * 🧠 AiGenerationHub Component
 * - Modal hub for selecting which AI tool to generate.
 * - Supports dark mode and layered modals.
 */
export default function AiGenerationHub({ isOpen, onClose, subjectId, unitId }) {
    const [view, setView] = useState('menu');

    useEffect(() => {
        if (!isOpen) {
            // reset after animation fade-out
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
            description: "Generate student-facing lessons from a topic.",
            icon: AcademicCapIcon,
            iconColor: "bg-blue-500",
            action: () => setView('guide'),
            disabled: !unitId
        },
        {
            title: "PEAC ULP",
            description: "Create a comprehensive Unit Learning Plan.",
            icon: DocumentChartBarIcon,
            iconColor: "bg-purple-500",
            action: () => setView('ulp'),
            disabled: !unitId
        },
        {
            title: "PEAC ATG",
            description: "Produce a detailed Adaptive Teaching Guide.",
            icon: DocumentTextIcon,
            iconColor: "bg-teal-500",
            action: () => setView('atg'),
            disabled: !unitId
        },
        {
            title: "Exam & TOS Generator",
            description: "Build an exam with a Table of Specifications.",
            icon: PencilSquareIcon,
            iconColor: "bg-amber-500",
            action: () => setView('exam'),
            disabled: !unitId,
            badge: "BETA"
        }
    ];

    if (!isOpen) return null;

    // Active modal selection
    let ActiveGeneratorModal = null;
    if (view === 'guide') {
        ActiveGeneratorModal = (
            <div className="z-[200]">
                <CreateLearningGuideModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />
            </div>
        );
    } else if (view === 'ulp') {
        ActiveGeneratorModal = (
            <div className="z-[200]">
                <CreateUlpModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />
            </div>
        );
    } else if (view === 'atg') {
        ActiveGeneratorModal = (
            <div className="z-[200]">
                <CreateAtgModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />
            </div>
        );
    } else if (view === 'exam') {
        ActiveGeneratorModal = (
            <div className="z-[200]">
                <CreateExamAndTosModal isOpen={true} onClose={handleCloseAll} subjectId={subjectId} unitId={unitId} />
            </div>
        );
    }

    return (
        <>
            {view === 'menu' && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 dark:bg-black/60 backdrop-blur-sm"
                    onClick={handleCloseAll}
                >
                    <div
                        className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 sm:p-8 rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark w-full max-w-3xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark flex-shrink-0" />
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Choose an AI Tool</h2>
                            <button
                                onClick={handleCloseAll}
                                className="p-2 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto -mr-2 pr-2">
                            {generatorOptions.map((option) => (
                                <AIToolButton
                                    key={option.title}
                                    title={option.title}
                                    description={option.description}
                                    icon={option.icon}
                                    iconColor={option.iconColor}
                                    onClick={option.action}
                                    disabled={option.disabled}
                                    badge={option.badge}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {ActiveGeneratorModal}
        </>
    );
}
