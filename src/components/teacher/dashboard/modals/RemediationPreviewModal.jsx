import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconX, 
  IconAlertTriangle, 
  IconBook, 
  IconCheck, 
  IconRefresh, 
  IconDeviceFloppy,
  IconList,
  IconClock,
  IconBulb
} from '@tabler/icons-react';
import Spinner from '../../../common/Spinner';

// --- MACOS 26 DESIGN SYSTEM CONSTANTS ---

const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

const windowContainerClasses = "relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] rounded-[2rem] shadow-2xl shadow-black/20 dark:shadow-black/50 ring-1 ring-white/40 dark:ring-white/5 overflow-hidden";
const cardSurface = "bg-white/40 dark:bg-[#1F2229]/40 backdrop-blur-xl rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-sm";

// Button Styles
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
    hover:bg-slate-100 dark:hover:bg-white/10 rounded-full border border-transparent hover:border-white/20
`;

// --- COMPONENT ---

const RemediationPreviewModal = ({ isOpen, onClose, remediationData, onSave, isSaving }) => {
  const lesson = remediationData?.remediation_lessons?.[0];
  const action = remediationData?.recommendation_action || 'UNKNOWN';

  // Badge Styles (Glassy)
  const getBadgeStyle = (type) => {
    switch (type) {
      case 'NONE':
        return { style: 'bg-emerald-50/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-800', icon: <IconCheck size={14} />, label: 'No Action' };
      case 'REVIEW':
        return { style: 'bg-yellow-50/50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/10 dark:text-yellow-400 dark:border-yellow-800', icon: <IconBook size={14} />, label: 'Review' };
      case 'PARTIAL_RETEACH':
        return { style: 'bg-orange-50/50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-800', icon: <IconRefresh size={14} />, label: 'Partial Reteach' };
      case 'FULL_RETEACH':
        return { style: 'bg-red-50/50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-800', icon: <IconAlertTriangle size={14} />, label: 'Full Reteach' };
      default:
        return { style: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10', icon: <IconAlertTriangle size={14} />, label: 'Unknown' };
    }
  };

  const badgeProps = getBadgeStyle(action);

  return (
    <AnimatePresence>
      {isOpen && remediationData && (
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
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className={`${headingStyle} text-lg`}>Remediation Plan</h2>
                            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${badgeProps.style}`}>
                                {badgeProps.icon}
                                <span>{badgeProps.label}</span>
                            </div>
                        </div>
                        <p className={subHeadingStyle}>Generated Content Preview</p>
                    </div>
                    <button onClick={onClose} className={closeIconButton}>
                        <IconX size={20} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    {remediationData.error ? (
                        <div className="p-6 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                            <IconAlertTriangle className="mx-auto mb-2" />
                            <p className="font-bold">Generation Error</p>
                            <p className="text-sm opacity-80">{remediationData.error}</p>
                        </div>
                    ) : (
                        <>
                            {/* Weak Topics Section */}
                            {remediationData.weak_topics && (
                                <div className={cardSurface + " p-5"}>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                                        <IconAlertTriangle size={16} className="text-amber-500" />
                                        Target Areas
                                    </h4>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {remediationData.weak_topics.map((t, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-white/5 p-2 rounded-lg border border-white/10">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                                <span className="leading-snug">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Lesson Plan Section */}
                            {lesson && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`${headingStyle} text-xl`}>{lesson.topic}</h3>
                                        {lesson.time_allotment && (
                                            <span className="text-xs font-bold px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800">
                                                {lesson.time_allotment}
                                            </span>
                                        )}
                                    </div>

                                    {/* Objectives */}
                                    <div className="bg-slate-50/50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200/50 dark:border-white/10">
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <IconList size={14} /> Objectives
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {lesson.objectives?.map((obj, i) => (
                                                <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-md bg-white dark:bg-black/20 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-sm">
                                                    {obj}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Phases */}
                                    <div className="space-y-4 pt-2">
                                        {(lesson.lesson_plan || []).map((phase, index) => (
                                            <div key={index} className={cardSurface + " overflow-hidden group"}>
                                                <div className="px-5 py-3 border-b border-white/10 bg-white/20 dark:bg-white/5 flex justify-between items-center">
                                                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                                                        {phase.phase}
                                                    </span>
                                                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-white/40 dark:bg-black/20 px-2 py-0.5 rounded">
                                                        <IconClock size={12} /> {phase.time}
                                                    </span>
                                                </div>
                                                
                                                <div className="p-5 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Instructions</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                            {phase.teacher_instructions}
                                                        </p>
                                                    </div>

                                                    {phase.activity && (
                                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-800/30">
                                                            <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300">
                                                                <IconBulb size={16} />
                                                                <span className="font-bold text-sm">{phase.activity.title}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                                                                {phase.activity.instructions}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md flex justify-end gap-3">
                    <button onClick={onClose} className={secondaryButton}>
                        Discard
                    </button>
                    <button onClick={onSave} disabled={isSaving || remediationData.error} className={primaryButton}>
                        {isSaving ? (
                            <>
                                <Spinner size="sm" className="text-white" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <IconDeviceFloppy size={18} />
                                <span>Save Plan</span>
                            </>
                        )}
                    </button>
                </div>

            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RemediationPreviewModal;