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

const AIToolButton = ({ title, description, icon: Icon, iconColor, onClick, disabled, badge }) => {
    // Helper to convert bg-color to text-color
    const textColor = iconColor.replace('bg-', 'text-');

    // MODIFIED: Helper to convert bg-color to a subtle gradient
    const gradientMap = {
        'bg-blue-500': 'bg-gradient-to-br from-white to-blue-50',
        'bg-purple-500': 'bg-gradient-to-br from-white to-purple-50',
        'bg-teal-500': 'bg-gradient-to-br from-white to-teal-50',
        'bg-amber-500': 'bg-gradient-to-br from-white to-amber-50',
    };
    const gradientClass = gradientMap[iconColor] || 'bg-neumorphic-base';


    return (
        <button
            onClick={onClick}
            disabled={disabled}
            // MODIFIED: Replaced `bg-neumorphic-base` with the new `gradientClass`
            className={`group relative p-4 rounded-2xl text-left h-full flex flex-col transition-shadow duration-300
                ${disabled
                    ? 'bg-slate-50 shadow-neumorphic-inset opacity-60 cursor-not-allowed'
                    : `${gradientClass} shadow-neumorphic hover:shadow-neumorphic-inset`
                }`}
        >
            <div className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center bg-neumorphic-base shadow-neumorphic-inset`}>
                <Icon className={`w-7 h-7 ${textColor}`} />
            </div>
            
            <div className="flex items-center">
                 <h3 className="text-base font-bold text-slate-800">{title}</h3>
                 {badge && (
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            
            <p className="text-xs text-slate-600 mt-1 flex-grow">{description}</p>
            
            <div className="mt-4 text-xs font-semibold text-slate-500 flex items-center justify-end">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {disabled ? 'Requires Unit' : 'Select'}
                </span>
                <ArrowRightIcon className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
            </div>
        </button>
    );
};


export default function AiGenerationHub({ isOpen, onClose, subjectId, unitId }) {
    const [view, setView] = useState('menu');

    useEffect(() => {
        if (!isOpen) {
            // Add a slight delay to allow for exit animations if any
            setTimeout(() => setView('menu'), 300);
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
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                    onClick={handleCloseAll}
                >
                    <div
                        className="bg-neumorphic-base p-6 sm:p-8 rounded-2xl shadow-neumorphic w-full max-w-3xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neumorphic-base shadow-neumorphic-inset flex-shrink-0" />
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h2 className="text-2xl font-bold text-slate-800">Choose an AI Tool</h2>
                            <button onClick={handleCloseAll} className="p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">
                                <XMarkIcon className="w-5 h-5 text-slate-600" />
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