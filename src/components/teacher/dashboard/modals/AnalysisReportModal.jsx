// src/components/teacher/dashboard/modals/AnalysisReportModal.jsx
import React from 'react';
import { IconX } from '@tabler/icons-react';
import Spinner from '../../../common/Spinner';

const AnalysisReportModal = ({ isOpen, onClose, analysisResult, onGenerate, isLoading }) => {
  if (!isOpen || !analysisResult) return null;

  const { narrative_report, recommendation_action } = analysisResult;

  const needsRemediation =
    recommendation_action === 'FULL_RETEACH' ||
    recommendation_action === 'PARTIAL_RETEACH' ||
    recommendation_action === 'REVIEW';

  const actionText = {
    FULL_RETEACH:
      'A full reteaching of the lesson is recommended to address foundational gaps in understanding.',
    PARTIAL_RETEACH:
      'A partial reteach is recommended, focusing only on the specific subtopics where students struggled.',
    REVIEW:
      'A targeted review or formative assessment is recommended to reinforce specific concepts.',
    NONE:
      'The students have demonstrated strong mastery of the material. No remedial action is needed at this time.',
  };

  const recommendationStyles = {
    FULL_RETEACH:
      'border-red-500 text-red-800 bg-red-50 dark:border-red-600 dark:text-red-200 dark:bg-red-900/30',
    PARTIAL_RETEACH:
      'border-orange-500 text-orange-800 bg-orange-50 dark:border-orange-600 dark:text-orange-200 dark:bg-orange-900/30',
    REVIEW:
      'border-yellow-500 text-yellow-800 bg-yellow-50 dark:border-yellow-500 dark:text-yellow-100 dark:bg-yellow-900/30',
    NONE:
      'border-green-500 text-green-800 bg-green-50 dark:border-green-600 dark:text-green-200 dark:bg-green-900/30',
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark w-full max-w-2xl max-h-[90vh] flex flex-col transition-colors duration-300">
        {/* Header */}
        <div className="p-4 flex justify-between items-center flex-shrink-0 border-b border-slate-200/60 dark:border-slate-700/60">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Performance Analysis Report
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-all hover:shadow-neumorphic-inset hover:text-slate-800 dark:hover:text-slate-100 dark:hover:shadow-neumorphic-inset-dark active:scale-[0.97]"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 border-t border-b border-slate-300/50 dark:border-slate-700/50">
          {/* Narrative Report */}
          <div className="p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-lg shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark transition-colors">
            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {narrative_report}
            </p>
          </div>

          {/* Recommendation Section */}
          {recommendation_action && (
            <div
              className={`p-4 rounded-lg font-medium text-sm border-l-4 shadow-sm transition-colors ${recommendationStyles[recommendation_action]}`}
            >
              <strong className="font-bold">Recommendation: </strong>
              {actionText[recommendation_action]}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark flex justify-end gap-3 flex-shrink-0 border-t border-slate-200/60 dark:border-slate-700/60">
          {/* Close Button — now with subtle glow */}
          <button
            onClick={onClose}
            className="relative px-4 py-2 rounded-lg text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark
                       shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       font-semibold text-sm transition-all duration-300 ease-in-out
                       hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
          >
            <span className="relative z-10">Close</span>
            <div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 
                         dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 opacity-0 hover:opacity-10 transition-opacity duration-500"
            ></div>
          </button>

          {/* Generate Button */}
          {needsRemediation && (
            <button
              onClick={onGenerate}
              disabled={isLoading}
              className={`
                relative px-4 py-2 text-sm font-semibold text-white rounded-lg overflow-hidden
                transition-all duration-500 ease-in-out
                shadow-md hover:scale-[1.03] active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {/* Animated gradient glow layer */}
			<div
			  className={`
			    absolute inset-0 rounded-lg bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500
			    dark:from-sky-500 dark:via-blue-600 dark:to-indigo-600
			    transition-opacity duration-500 animate-gradient-x
			    ${isLoading ? "opacity-60" : "opacity-90 hover:opacity-100 active:opacity-100"}
			  `}
			></div>
             

			<span className="relative z-10">
			  {isLoading ? 'Generating...' : 'Generate Remediation Plan'}
			</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisReportModal;
