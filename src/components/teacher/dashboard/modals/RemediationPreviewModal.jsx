// src/components/teacher/dashboard/modals/RemediationPreviewModal.jsx
import React from 'react';
import { IconX, IconAlertTriangle, IconBook, IconCheck, IconRefresh } from '@tabler/icons-react';
import Spinner from '../../../common/Spinner';

const RemediationPreviewModal = ({ isOpen, onClose, remediationData, onSave, isSaving }) => {
  if (!isOpen || !remediationData) return null;

  const lesson = remediationData.remediation_lessons?.[0];
  const action = remediationData.recommendation_action || 'UNKNOWN';

  // 🎖 Badge color themes (light + dark)
  const badgeClasses = {
    NONE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200',
    PARTIAL_RETEACH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    FULL_RETEACH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    UNKNOWN: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  // 🪶 Badge Renderer
  const getBadge = () => {
    const className = `inline-flex items-center px-3 py-1 rounded-full font-semibold text-sm shadow-sm gap-1 ${badgeClasses[action] || badgeClasses.UNKNOWN}`;
    switch (action) {
      case 'NONE':
        return <div className={className}><IconCheck size={16} /> No Remediation Needed</div>;
      case 'REVIEW':
        return <div className={className}><IconBook size={16} /> Review Activity</div>;
      case 'PARTIAL_RETEACH':
        return <div className={className}><IconRefresh size={16} /> Partial Reteach</div>;
      case 'FULL_RETEACH':
        return <div className={className}><IconAlertTriangle size={16} /> Full Reteach</div>;
      default:
        return <div className={className}>Unknown Recommendation</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark w-full max-w-3xl max-h-[90vh] flex flex-col transition-colors duration-300">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center flex-shrink-0 border-b border-slate-200/60 dark:border-slate-700/60">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            Generated Remediation Plan
            {getBadge()}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-neumorphic-base dark:bg-neumorphic-base-dark
                       shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       transition-all duration-300 active:scale-[0.97]"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 border-t border-b border-slate-300/50 dark:border-slate-700/50">
          {remediationData.error ? (
            <p className="text-red-600 dark:text-red-300 text-sm font-semibold">
              Error: {remediationData.error}
            </p>
          ) : (
            <>
              {remediationData.weak_topics && (
                <div className="p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-lg shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-100 mb-2">
                    Identified Weak Topics
                  </h4>
                  <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 text-sm space-y-1">
                    {remediationData.weak_topics.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {lesson && (
                <div className="p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-lg shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark space-y-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-100 mb-2">
                    Remediation Lesson: {lesson.topic}
                  </h4>
                  <p className="text-sm pb-2">
                    <strong className="text-slate-600 dark:text-slate-300">Objectives:</strong>{' '}
                    {lesson.objectives?.join(' • ')}
                  </p>

                  {(lesson.lesson_plan || []).map((phase, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white/70 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm-floating-xs transition-colors"
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-100">
                        {phase.phase} ({phase.time})
                      </p>
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {phase.teacher_instructions}
                      </div>
                      {phase.activity && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                            {phase.activity.title}
                          </p>
                          <div className="prose prose-xs dark:prose-invert max-w-none mt-1 text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                            {phase.activity.instructions}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark flex justify-end gap-3 flex-shrink-0 border-t border-slate-200/60 dark:border-slate-700/60">
          {/* Close Button with glow */}
          <button
            onClick={onClose}
            className="relative px-4 py-2 rounded-lg text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark
                       shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       font-semibold text-sm transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
          >
            <span className="relative z-10">Close</span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 
                            dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 opacity-0 hover:opacity-10 transition-opacity duration-500" />
          </button>

          {/* Save Button with gradient animation */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="relative px-4 py-2 text-sm font-semibold text-white rounded-lg overflow-hidden
                       transition-all duration-500 ease-in-out shadow-md hover:scale-[1.03] active:scale-[0.98]
                       focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 
                            dark:from-sky-500 dark:via-blue-600 dark:to-indigo-600 opacity-90 hover:opacity-100
                            transition-opacity duration-500 animate-gradient-x" />
            <span className="relative z-10 flex items-center gap-2">
              {isSaving && <Spinner size="sm" />}
              {isSaving ? 'Saving...' : 'Save Recommendation'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemediationPreviewModal;
