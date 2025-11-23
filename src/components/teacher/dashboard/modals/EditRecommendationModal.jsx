import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconX,
  IconPlus,
  IconTrash,
  IconGripVertical,
  IconClock,
  IconTarget,
  IconDeviceFloppy,
  IconBold,
  IconItalic,
  IconList,
  IconQuote,
  IconArrowBackUp
} from "@tabler/icons-react";
import Spinner from "../../../common/Spinner";

// --- MACOS 26 DESIGN SYSTEM CONSTANTS ---

const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

const windowContainerClasses = "relative w-full max-w-5xl h-full md:h-[90vh] flex flex-col bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] rounded-[2rem] shadow-2xl shadow-black/20 dark:shadow-black/50 ring-1 ring-white/40 dark:ring-white/5 overflow-hidden";
const cardSurface = "bg-white/40 dark:bg-[#1F2229]/40 backdrop-blur-xl rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-sm";

const inputStyles = "w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-400";

// Buttons
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

const iconButton = `
    ${baseButtonStyles} p-2 text-slate-500 dark:text-slate-400 
    hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg
`;

const editorToolbarButton = `
    p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors
`;

// --- COMPONENT ---

const EditRecommendationModal = ({ isOpen, onClose, recDoc, onSaveSuccess }) => {
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const dragSrc = useRef(null);

  useEffect(() => {
    if (isOpen && recDoc) {
      setDraft(JSON.parse(JSON.stringify(recDoc.recommendations || {})));
    } else {
      setDraft(null);
    }
  }, [isOpen, recDoc]);

  // Editor Actions
  const exec = (command) => document.execCommand(command, false, null);
  const wrapBlockquote = () => document.execCommand("formatBlock", false, "blockquote");

  // State Updates
  const updateLessonField = (lessonIndex, field, value) => {
    setDraft((d) => ({
      ...d,
      remediation_lessons: d.remediation_lessons.map((lesson, i) =>
        i === lessonIndex ? { ...lesson, [field]: value } : lesson
      ),
    }));
  };

  const addPhase = (lessonIndex) => {
    setDraft((d) => {
      const lessons = [...(d.remediation_lessons || [])];
      const lesson = { ...lessons[lessonIndex] };
      lesson.lesson_plan = [
        ...(lesson.lesson_plan || []),
        {
          phase: "New Phase",
          time: "5 mins",
          teacher_instructions: "Start writing instructions here...",
        },
      ];
      lessons[lessonIndex] = lesson;
      return { ...d, remediation_lessons: lessons };
    });
  };

  const removePhase = (lessonIndex, phaseIndex) => {
    setDraft((d) => {
      const lessons = [...d.remediation_lessons];
      const lesson = { ...lessons[lessonIndex] };
      lesson.lesson_plan = lesson.lesson_plan.filter((_, i) => i !== phaseIndex);
      lessons[lessonIndex] = lesson;
      return { ...d, remediation_lessons: lessons };
    });
  };

  const addRemediationLesson = () => {
    setDraft((d) => ({
      ...d,
      remediation_lessons: [
        ...(d.remediation_lessons || []),
        {
          topic: "New Lesson Topic",
          objectives: [],
          time_allotment: "30 minutes",
          lesson_plan: [],
          notes_for_teachers: "Notes for the teacher...",
        },
      ],
    }));
  };

  const saveEditedRecommendation = async () => {
    if (!recDoc || !draft) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, "recommendations", recDoc.id);
      await updateDoc(docRef, { recommendations: draft });
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error("saveEditedRecommendation error", err);
      alert("Failed to save edits.");
    } finally {
        setIsSaving(false);
    }
  };

  // Drag & Drop
  const onDragStart = (e, lessonIndex, phaseIndex) => {
    dragSrc.current = { lessonIndex, phaseIndex };
    e.dataTransfer.effectAllowed = "move";
    // Make the drag ghost cleaner
    e.dataTransfer.setDragImage(e.target, 0, 0); 
  };

  const onDrop = (e, lessonIndex, phaseIndex) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (!src || src.lessonIndex !== lessonIndex) return;

    setDraft((d) => {
      const lessons = [...d.remediation_lessons];
      const lesson = { ...lessons[lessonIndex] };
      const plan = [...(lesson.lesson_plan || [])];
      const [moved] = plan.splice(src.phaseIndex, 1);
      plan.splice(phaseIndex, 0, moved);
      lesson.lesson_plan = plan;
      lessons[lessonIndex] = lesson;
      return { ...d, remediation_lessons: lessons };
    });
    dragSrc.current = null;
  };

  const onDragOver = (e) => e.preventDefault();

  const setPhaseField = (lessonIdx, phaseIdx, field, html) => {
    setDraft((d) => {
      const lessons = [...d.remediation_lessons];
      const lesson = { ...lessons[lessonIdx] };
      const plan = [...lesson.lesson_plan];
      plan[phaseIdx] = { ...plan[phaseIdx], [field]: html };
      lesson.lesson_plan = plan;
      lessons[lessonIdx] = lesson;
      return { ...d, remediation_lessons: lessons };
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                        <h2 className={`${headingStyle} text-lg`}>Edit Recommendation</h2>
                        <p className={subHeadingStyle}>{recDoc?.lessonTitle} • {recDoc?.unitTitle}</p>
                    </div>
                    <button onClick={onClose} className={iconButton}>
                        <IconX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {!draft ? (
                        <div className="h-full flex items-center justify-center">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                        <>
                            {/* Toolbar / Actions */}
                            <div className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                    Customize the remediation plan below.
                                </p>
                                <button
                                    onClick={addRemediationLesson}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <IconPlus size={16} /> Add Lesson
                                </button>
                            </div>

                            {/* Lesson List */}
                            <div className="space-y-8">
                                {(draft.remediation_lessons || []).map((lesson, li) => (
                                    <div key={li} className={cardSurface + " p-6 relative group"}>
                                        {/* Remove Lesson Button */}
                                        <button
                                            onClick={() => setDraft((d) => ({ ...d, remediation_lessons: d.remediation_lessons.filter((_, i) => i !== li) }))}
                                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Remove Lesson"
                                        >
                                            <IconTrash size={18} />
                                        </button>

                                        {/* Lesson Header Fields */}
                                        <div className="space-y-4 mb-6 pr-10">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Lesson Topic</label>
                                                <input
                                                    value={lesson.topic || ""}
                                                    onChange={(e) => updateLessonField(li, "topic", e.target.value)}
                                                    className={`${inputStyles} font-bold text-lg`}
                                                    placeholder="Enter topic..."
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                        <IconTarget size={14} /> Objectives (Separate with |)
                                                    </label>
                                                    <input
                                                        value={(lesson.objectives || []).join(" | ")}
                                                        onChange={(e) => updateLessonField(li, "objectives", e.target.value.split("|").map((s) => s.trim()).filter(Boolean))}
                                                        className={inputStyles}
                                                        placeholder="e.g. Understand basic concepts | Apply knowledge"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                        <IconClock size={14} /> Time
                                                    </label>
                                                    <input
                                                        value={lesson.time_allotment || ""}
                                                        onChange={(e) => updateLessonField(li, "time_allotment", e.target.value)}
                                                        className={inputStyles}
                                                        placeholder="e.g. 45 minutes"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lesson Plan Phases */}
                                        <div className="bg-slate-50/50 dark:bg-black/20 rounded-2xl p-4 border border-slate-200/50 dark:border-white/5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2">
                                                    <IconList size={16} /> Lesson Phases
                                                </h4>
                                                <button
                                                    onClick={() => addPhase(li)}
                                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                >
                                                    <IconPlus size={14} /> Add Phase
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {(lesson.lesson_plan || []).map((phase, pi) => (
                                                    <div
                                                        key={pi}
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e, li, pi)}
                                                        onDrop={(e) => onDrop(e, li, pi)}
                                                        onDragOver={onDragOver}
                                                        className="bg-white dark:bg-[#1A1D24] rounded-xl border border-slate-200 dark:border-white/10 p-4 shadow-sm group/phase hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {/* Drag Handle */}
                                                            <div className="mt-2 text-slate-300 dark:text-slate-600 cursor-move hover:text-slate-500">
                                                                <IconGripVertical size={18} />
                                                            </div>

                                                            <div className="flex-1 space-y-3">
                                                                <div className="flex gap-3">
                                                                    <div className="flex-1">
                                                                        <input
                                                                            value={phase.phase || ""}
                                                                            onChange={(e) => setPhaseField(li, pi, "phase", e.target.value)}
                                                                            className={`${inputStyles} py-1.5 px-3 text-sm font-semibold`}
                                                                            placeholder="Phase Name (e.g. Introduction)"
                                                                        />
                                                                    </div>
                                                                    <div className="w-24 sm:w-32">
                                                                        <input
                                                                            value={phase.time || ""}
                                                                            onChange={(e) => setPhaseField(li, pi, "time", e.target.value)}
                                                                            className={`${inputStyles} py-1.5 px-3 text-xs`}
                                                                            placeholder="Time"
                                                                        />
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => removePhase(li, pi)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <IconTrash size={16} />
                                                                    </button>
                                                                </div>

                                                                {/* Rich Text Editor Area */}
                                                                <div className="border-t border-slate-100 dark:border-white/5 pt-2">
                                                                    <div className="flex items-center gap-1 mb-2">
                                                                        <button onClick={() => exec("bold")} className={editorToolbarButton} title="Bold"><IconBold size={14}/></button>
                                                                        <button onClick={() => exec("italic")} className={editorToolbarButton} title="Italic"><IconItalic size={14}/></button>
                                                                        <button onClick={() => wrapBlockquote()} className={editorToolbarButton} title="Quote"><IconQuote size={14}/></button>
                                                                        <button onClick={() => exec("insertUnorderedList")} className={editorToolbarButton} title="List"><IconList size={14}/></button>
                                                                        <button onClick={() => exec("undo")} className={editorToolbarButton} title="Undo"><IconArrowBackUp size={14}/></button>
                                                                    </div>
                                                                    <div
                                                                        contentEditable
                                                                        suppressContentEditableWarning
                                                                        className="min-h-[80px] text-sm text-slate-600 dark:text-slate-300 leading-relaxed outline-none prose prose-sm dark:prose-invert max-w-none"
                                                                        onBlur={(e) => setPhaseField(li, pi, "teacher_instructions", e.currentTarget.innerHTML)}
                                                                        dangerouslySetInnerHTML={{ __html: phase.teacher_instructions || "" }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Teacher Notes */}
                                        <div className="mt-4">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Notes for Teachers</label>
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                className={`min-h-[80px] ${inputStyles} h-auto`}
                                                onBlur={(e) => updateLessonField(li, "notes_for_teachers", e.currentTarget.innerHTML)}
                                                dangerouslySetInnerHTML={{ __html: lesson.notes_for_teachers || "" }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md flex justify-end gap-3">
                    <button onClick={onClose} className={secondaryButton}>
                        Cancel
                    </button>
                    <button 
                        onClick={saveEditedRecommendation} 
                        disabled={isSaving}
                        className={primaryButton}
                    >
                        {isSaving ? (
                            <>
                                <Spinner size="sm" className="text-white" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <IconDeviceFloppy size={18} />
                                <span>Save Changes</span>
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

export default EditRecommendationModal;