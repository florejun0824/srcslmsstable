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
    PencilSquareIcon
} from '@heroicons/react/24/outline';

// ✅ MODIFIED: Added 'badge' prop
const GradientCardButton = ({ title, description, icon: Icon, gradient, onClick, disabled, badge }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group relative text-white p-4 sm:p-6 rounded-2xl shadow-lg text-left h-full flex flex-col bg-gradient-to-br ${gradient} ${
            disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'transform hover:scale-105 transition-transform duration-300'
        }`}
    >
        <div className="mb-4">
            <Icon className="w-10 h-10 sm:w-12 sm:w-12" />
        </div>
        <div className="flex items-center">
             <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
             {/* ✅ MODIFIED: Render the badge if it exists */}
             {badge && (
                <span className="ml-2 text-xs font-bold px-2 py-1 bg-white/20 rounded-full">
                    {badge}
                </span>
            )}
        </div>
        <p className="text-xs sm:text-sm text-white/80 mt-2 flex-grow">{description}</p>
        <div className="mt-4 text-xs sm:text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
            disabled: !unitId
        },
        {
            title: "PEAC ULP",
            description: "Create a comprehensive Unit Learning Plan based on your standards and competencies.",
            icon: DocumentChartBarIcon,
            gradient: "from-purple-500 to-violet-600",
            action: () => setView('ulp'),
            disabled: !unitId
        },
        {
            title: "PEAC ATG",
            description: "Produce a detailed Adaptive Teaching Guide from existing lesson content.",
            icon: DocumentTextIcon,
            gradient: "from-teal-500 to-cyan-600",
            action: () => setView('atg'),
            disabled: !unitId
        },
        {
            title: "Exam & TOS Generator",
            description: "Create a complete exam with a Table of Specifications based on your lesson content.",
            icon: PencilSquareIcon,
            gradient: "from-amber-500 to-orange-600",
            action: () => setView('exam'),
            disabled: !unitId,
            // ✅ MODIFIED: Added a badge property
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
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={handleCloseAll}
                >
                    <div
                        className="bg-gray-100 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Choose an AI Tool</h2>
                            <button onClick={handleCloseAll} className="p-2 rounded-full text-gray-400 hover:bg-gray-200">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 overflow-y-auto -mr-2 pr-2">
                            {generatorOptions.map((option) => (
                                <GradientCardButton
                                    key={option.title}
                                    title={option.title}
                                    description={option.description}
                                    icon={option.icon}
                                    gradient={option.gradient}
                                    onClick={option.action}
                                    disabled={option.disabled}
                                    // ✅ MODIFIED: Added the new badge prop
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