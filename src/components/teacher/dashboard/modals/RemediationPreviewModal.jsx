// src/components/teacher/dashboard/modals/RemediationPreviewModal.jsx
import React from 'react';
import { IconX, IconAlertTriangle, IconBook, IconCheck, IconRefresh } from '@tabler/icons-react';
import Spinner from '../../../common/Spinner';

const RemediationPreviewModal = ({ isOpen, onClose, remediationData, onSave, isSaving }) => {
    if (!isOpen || !remediationData) return null;

    const lesson = remediationData.remediation_lessons?.[0];

    // ✅ Detect recommendation action
    const action = remediationData.recommendation_action || "UNKNOWN";

    // ✅ Badge styling based on action
    const getBadge = () => {
        switch (action) {
            case "NONE":
                return (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm shadow-sm gap-1">
                        <IconCheck size={16} /> No Remediation Needed
                    </div>
                );
            case "REVIEW":
                return (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm shadow-sm gap-1">
                        <IconBook size={16} /> Review Activity
                    </div>
                );
            case "PARTIAL_RETEACH":
                return (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm shadow-sm gap-1">
                        <IconRefresh size={16} /> Partial Reteach
                    </div>
                );
            case "FULL_RETEACH":
                return (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm shadow-sm gap-1">
                        <IconAlertTriangle size={16} /> Full Reteach
                    </div>
                );
            default:
                return (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-200 text-gray-700 font-semibold text-sm shadow-sm">
                        Unknown Recommendation
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
            <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic w-full max-w-3xl max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-4 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                        Generated Remediation Plan
                        {getBadge()}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg text-slate-600 bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4 border-t border-b border-slate-300/50">
                    {remediationData.error ? (
                        <p className="text-red-600 text-sm font-semibold">
                            Error: {remediationData.error}
                        </p>
                    ) : (
                        <>
                            {remediationData.weak_topics && (
                                <div className="p-4 bg-neumorphic-base rounded-lg shadow-neumorphic-inset">
                                    <h4 className="font-semibold text-slate-700 mb-2">
                                        Identified Weak Topics
                                    </h4>
                                    <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
                                        {remediationData.weak_topics.map((t, i) => (
                                            <li key={i}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {lesson && (
                                <div className="p-4 bg-neumorphic-base rounded-lg shadow-neumorphic-inset space-y-3">
                                    <h4 className="font-semibold text-slate-700 mb-2">
                                        Remediation Lesson: {lesson.topic}
                                    </h4>
                                    <p className="text-sm pb-2">
                                        <strong className="text-slate-600">Objectives:</strong>{" "}
                                        {lesson.objectives?.join(" • ")}
                                    </p>

                                    {(lesson.lesson_plan || []).map((phase, index) => (
                                        <div
                                            key={index}
                                            className="p-3 bg-white/70 rounded-md border border-slate-200 shadow-sm-floating-xs"
                                        >
                                            <p className="font-bold text-slate-800">
                                                {phase.phase} ({phase.time})
                                            </p>
                                            <div className="prose prose-sm max-w-none mt-1 text-slate-600 whitespace-pre-wrap">
                                                {phase.teacher_instructions}
                                            </div>
                                            {phase.activity && (
                                                <div className="mt-3 pt-3 border-t border-slate-200">
                                                    <p className="font-semibold text-sm">
                                                        {phase.activity.title}
                                                    </p>
                                                    <div className="prose prose-xs max-w-none mt-1 text-slate-500 whitespace-pre-wrap">
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
                <div className="p-4 bg-neumorphic-base flex justify-end gap-3 flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 rounded-lg bg-neumorphic-base shadow-neumorphic text-slate-700 hover:shadow-neumorphic-inset active:shadow-neumorphic-inset text-sm font-semibold transition-shadow"
                    >
                        Close
                    </button>
                    <button 
                        onClick={onSave} 
                        disabled={isSaving} 
                        className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold transition-all"
                    >
                        {isSaving && <Spinner size="sm" />}
                        {isSaving ? "Saving..." : "Save Recommendation"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RemediationPreviewModal;
