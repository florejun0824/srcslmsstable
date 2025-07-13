import React, { useState, useEffect } from 'react';
import CreateLearningGuideModal from './CreateLearningGuideModal';
import CreateUlpModal from './CreateUlpModal';
import CreateAtgModal from './CreateAtgModal';
import {
    DocumentTextIcon,
    DocumentChartBarIcon,
    AcademicCapIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const GradientCardButton = ({ title, description, icon: Icon, gradient, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group relative text-white p-6 rounded-2xl shadow-lg text-left h-full flex flex-col bg-gradient-to-br ${gradient} ${
            disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'transform hover:scale-105 transition-transform duration-300'
        }`}
    >
        <div className="mb-4">
            <Icon className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-white/80 mt-2 flex-grow">{description}</p>
        <div className="mt-4 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {disabled ? 'Requires a Unit' : 'Select →'}
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
            description: "Generate student-facing lessons from a topic, including diagrams and activities.",
            icon: AcademicCapIcon,
            gradient: "from-blue-500 to-indigo-600",
            action: () => setView('guide'),
            disabled: !unitId // This button is disabled if no unitId is passed.
        },
        {
            title: "PEAC ULP",
            description: "Create a comprehensive Unit Learning Plan based on your standards and competencies.",
            icon: DocumentChartBarIcon,
            gradient: "from-purple-500 to-violet-600",
            action: () => setView('ulp'),
            disabled: !unitId // This button is also disabled if no unitId is passed.
        },
        {
            title: "PEAC ATG",
            description: "Produce a detailed Adaptive Teaching Guide from existing lesson content.",
            icon: DocumentTextIcon,
            gradient: "from-teal-500 to-cyan-600",
            action: () => setView('atg'),
            disabled: !unitId // This button is also disabled if no unitId is passed.
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
    }

    return (
        <>
            {view === 'menu' && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={handleCloseAll}
                >
                    <div
                        className="bg-gray-100 p-8 rounded-2xl shadow-2xl w-full max-w-4xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Choose an AI Tool</h2>
                            <button onClick={handleCloseAll} className="p-2 rounded-full text-gray-400 hover:bg-gray-200">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {generatorOptions.map((option) => (
                                <GradientCardButton
                                    key={option.title}
                                    title={option.title}
                                    description={option.description}
                                    icon={option.icon}
                                    gradient={option.gradient}
                                    onClick={option.action}
                                    disabled={option.disabled}
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