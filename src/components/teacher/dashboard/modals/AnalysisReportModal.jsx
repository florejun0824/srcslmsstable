import React from 'react';
import { IconX, IconAnalyze, IconAlertTriangle, IconCheck, IconBrain } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from '../../../common/Spinner';

// --- MACOS 26 DESIGN SYSTEM CONSTANTS (Matched to AnalyticsView) ---

// 1. Typography
const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

// 2. Buttons
const baseButtonStyles = `
    relative font-semibold rounded-full transition-all duration-300 
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed
`;

const primaryButton = `
    ${baseButtonStyles} px-6 py-2.5 text-sm text-white 
    bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
    shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)]
    border border-blue-400/20
`;

const secondaryButton = `
    ${baseButtonStyles} px-5 py-2.5 text-sm text-slate-700 dark:text-slate-200 
    bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 
    backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md
`;

const closeIconButton = `
    ${baseButtonStyles} p-2 text-slate-500 dark:text-slate-400 
    hover:bg-slate-100 dark:hover:bg-white/10 rounded-full
`;

// 3. Surfaces
const windowContainerClasses = "relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] rounded-[2rem] shadow-2xl shadow-black/20 dark:shadow-black/50 ring-1 ring-white/40 dark:ring-white/5 overflow-hidden";
const cardSurface = "bg-white/40 dark:bg-[#1F2229]/40 backdrop-blur-xl rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-sm";

// --- COMPONENT ---

const AnalysisReportModal = ({ isOpen, onClose, analysisResult, onGenerate, isLoading }) => {
  const { narrative_report, recommendation_action } = analysisResult || {};

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

  // Mapped styles to match the glass theme (softer colors, borders)
  const getRecommendationStyles = (type) => {
    switch(type) {
        case 'FULL_RETEACH': 
            return {
                container: 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
                icon: <IconAlertTriangle size={20} className="text-red-500" />
            };
        case 'PARTIAL_RETEACH':
            return {
                container: 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
                icon: <IconAlertTriangle size={20} className="text-orange-500" />
            };
        case 'REVIEW':
            return {
                container: 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-100',
                icon: <IconBrain size={20} className="text-yellow-500" />
            };
        default: // NONE
            return {
                container: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
                icon: <IconCheck size={20} className="text-emerald-500" />
            };
    }
  };

  const recStyles = getRecommendationStyles(recommendation_action);

  return (
    <AnimatePresence>
      {isOpen && analysisResult && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Window */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className={windowContainerClasses}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                            <IconAnalyze size={20} />
                        </div>
                        <div>
                            <h2 className={`${headingStyle} text-lg`}>Performance Analysis</h2>
                            <p className={subHeadingStyle}>AI-Powered Insights</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={closeIconButton}>
                        <IconX size={20} />
                    </button>
                </div>

                {/* Content - Custom Scrollbar */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    
                    {/* Narrative Section */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                             Analysis Report
                        </h3>
                        <div className={`${cardSurface} p-5`}>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                {narrative_report}
                            </p>
                        </div>
                    </div>

                    {/* Recommendation Section */}
                    {recommendation_action && (
                         <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Action Plan</h3>
                            <div className={`p-5 rounded-2xl border flex gap-4 ${recStyles.container}`}>
                                <div className="shrink-0 pt-0.5">
                                    {recStyles.icon}
                                </div>
                                <div>
                                    <strong className="block font-bold text-sm mb-1 uppercase tracking-wide opacity-80">
                                        {recommendation_action.replace('_', ' ')}
                                    </strong>
                                    <p className="text-sm leading-relaxed opacity-90">
                                        {actionText[recommendation_action]}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md flex justify-end gap-3">
                    <button onClick={onClose} className={secondaryButton}>
                        Close
                    </button>

                    {needsRemediation && (
                        <button
                            onClick={onGenerate}
                            disabled={isLoading}
                            className={primaryButton}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="sm" className="text-white" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <IconBrain size={18} />
                                    <span>Generate Remediation</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AnalysisReportModal;