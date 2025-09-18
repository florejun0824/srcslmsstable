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
    ArrowRightIcon, // Added for the hover effect
} from '@heroicons/react/24/outline';

// ✅ REFACTORED: Renamed from GradientCardButton to AIToolButton and restyled
const AIToolButton = ({ title, description, icon: Icon, iconColor, onClick, disabled, badge }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group relative text-zinc-800 p-4 rounded-2xl text-left h-full flex flex-col transition-all duration-300
            ${disabled
                ? 'bg-zinc-200/50 opacity-60 cursor-not-allowed'
                // iOS Vibe: Light background with a subtle hover effect
                : 'bg-white/60 hover:bg-white/90 shadow-lg hover:shadow-xl'
            }`}
    >
        {/* iOS Vibe: Icon is the primary source of color, placed in a rounded square */}
        <div className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
            <Icon className="w-7 h-7 text-white" />
        </div>
        
        <div className="flex items-center">
             <h3 className="text-base font-bold">{title}</h3>
             {/* ✅ REFACTORED: Badge styled for a light background */}
             {badge && (
                <span className="ml-2 text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {badge}
                </span>
            )}
        </div>
        
        <p className="text-xs text-zinc-600 mt-1 flex-grow">{description}</p>
        
        {/* iOS Vibe: Subtle arrow appears on hover for a clear call to action */}
        <div className="mt-4 text-xs font-semibold text-zinc-500 flex items-center justify-end">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {disabled ? 'Requires Unit' : 'Select'}
            </span>
            <ArrowRightIcon className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
        </div>
    </button>
);


export default function AiGenerationHub({ isOpen, onClose, subjectId, unitId }) {
    const [view, setView] = useState('menu');

    useEffect(() => {
        if (!isOpen) {
            setView('menu');
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
            // ✅ REFACTORED: Replaced 'gradient' with 'iconColor'
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

    if (!isOpen) {
        return null;
    }

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
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
                    onClick={handleCloseAll}
                >
                    {/*
                      iOS Vibe Changes:
                      - Semi-transparent background with a heavy backdrop blur for a frosted glass effect.
                      - Border with transparency adds to the glass-like feel.
                      - Grabber handle at the top for a bottom-sheet aesthetic.
                    */}
                    <div
                        className="bg-zinc-50/80 backdrop-blur-xl border border-white/20 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 flex-shrink-0" />
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h2 className="text-2xl font-bold text-gray-800">Choose an AI Tool</h2>
                            <button onClick={handleCloseAll} className="p-1.5 rounded-full text-gray-500 bg-gray-200/80 hover:bg-gray-300/80">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto -mr-2 pr-2">
                            {generatorOptions.map((option) => (
                                <AIToolButton
                                    key={option.title}
                                    title={option.title}
                                    description={option.description}
                                    icon={option.icon}
                                    iconColor={option.iconColor} // ✅ REFACTORED Prop
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