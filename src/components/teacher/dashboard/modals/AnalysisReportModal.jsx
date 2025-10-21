// src/components/teacher/dashboard/modals/AnalysisReportModal.jsx
import React from 'react';
import { IconX } from '@tabler/icons-react';
import Spinner from '../../../common/Spinner';

const AnalysisReportModal = ({ isOpen, onClose, analysisResult, onGenerate, isLoading }) => {
    if (!isOpen || !analysisResult) return null;

    const { narrative_report, recommendation_action } = analysisResult;

    // 🔧 Updated to include all cases
    const needsRemediation =
        recommendation_action === 'FULL_RETEACH' ||
        recommendation_action === 'PARTIAL_RETEACH' ||
        recommendation_action === 'REVIEW';

    const actionText = {
        FULL_RETEACH: "A full reteaching of the lesson is recommended to address foundational gaps in understanding.",
        PARTIAL_RETEACH: "A partial reteach is recommended, focusing only on the specific subtopics where students struggled.",
        REVIEW: "A targeted review or formative assessment is recommended to reinforce specific concepts.",
        NONE: "The students have demonstrated strong mastery of the material. No remedial action is needed at this time."
    };

    const recommendationStyles = {
        FULL_RETEACH: 'border-red-500 text-red-800 bg-red-50',
        PARTIAL_RETEACH: 'border-orange-500 text-orange-800 bg-orange-50',
        REVIEW: 'border-yellow-500 text-yellow-800 bg-yellow-50',
        NONE: 'border-green-500 text-green-800 bg-green-50'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
            <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic w-full max-w-2xl max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-4 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Performance Analysis Report</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg text-slate-600 bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4 border-t border-b border-slate-300/50">
                    
                    {/* Narrative Report */}
                    <div className="p-4 bg-neumorphic-base rounded-lg shadow-neumorphic-inset">
                        <p className="text-slate-700 whitespace-pre-wrap">{narrative_report}</p>
                    </div>

                    {/* Recommendation Section */}
                    {recommendation_action && (
                        <div
                            className={`p-4 rounded-lg font-medium text-sm border-l-4 shadow-sm ${recommendationStyles[recommendation_action]}`}
                        >
                            <strong className="font-bold">Recommendation: </strong>
                            {actionText[recommendation_action]}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-neumorphic-base flex justify-end gap-3 flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 rounded-lg bg-neumorphic-base shadow-neumorphic text-slate-700 hover:shadow-neumorphic-inset active:shadow-neumorphic-inset text-sm font-semibold transition-shadow"
                    >
                        Close
                    </button>

                    {/* Show Generate Remediation button if needed */}
                    {needsRemediation && (
                        <button 
                            onClick={onGenerate} 
                            disabled={isLoading} 
                            className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold transition-all"
                        >
                            {isLoading && <Spinner size="sm" />}
                            {isLoading ? "Generating..." : "Generate Remediation Plan"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisReportModal;
