// EditRecommendationModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../services/firebase";
import { IconX, IconPlus, IconTrash, IconChevronUp, IconChevronDown } from "@tabler/icons-react";

const NeumorphicButton = ({ children, onClick, className = "", ...props }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg bg-neumorphic-base text-slate-700 shadow-neumorphic transition-all duration-150 ease-in-out hover:shadow-neumorphic-inset active:shadow-neumorphic-inset ${className}`}
    {...props}
  >
    {children}
  </button>
);

const EditRecommendationModal = ({ isOpen, onClose, recDoc, onSaveSuccess }) => {
  const [draft, setDraft] = useState(null);
  const dragSrc = useRef(null);

  useEffect(() => {
    if (isOpen && recDoc) {
      setDraft(JSON.parse(JSON.stringify(recDoc.recommendations || {})));
    } else {
      setDraft(null);
    }
  }, [isOpen, recDoc]);

  if (!isOpen) return null;

  const exec = (command) => document.execCommand(command, false, null);
  const wrapBlockquote = () => document.execCommand("formatBlock", false, "blockquote");

  const updateLessonField = (lessonIndex, field, value) => {
    setDraft(d => ({
      ...d,
      remediation_lessons: d.remediation_lessons.map((lesson, i) =>
        i === lessonIndex ? { ...lesson, [field]: value } : lesson
      ),
    }));
  };

  const addPhase = (lessonIndex) => {
    setDraft(d => {
      const lessons = [...(d.remediation_lessons || [])];
      const lesson = { ...lessons[lessonIndex] };
      lesson.lesson_plan = [...(lesson.lesson_plan || []), {
        phase: "New Phase",
        time: "5 minutes",
        teacher_instructions: "<blockquote><p><i>Start with a question...</i></p></blockquote>",
      }];
      lessons[lessonIndex] = lesson;
      return { ...d, remediation_lessons: lessons };
    });
  };

  const removePhase = (lessonIndex, phaseIndex) => {
    setDraft(d => {
      const lessons = [...d.remediation_lessons];
      const lesson = { ...lessons[lessonIndex] };
      lesson.lesson_plan = lesson.lesson_plan.filter((_, i) => i !== phaseIndex);
      lessons[lessonIndex] = lesson;
      return { ...d, remediation_lessons: lessons };
    });
  };

  const onDragStart = (e, lessonIndex, phaseIndex) => {
    dragSrc.current = { lessonIndex, phaseIndex };
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e, lessonIndex, phaseIndex) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (!src || src.lessonIndex !== lessonIndex) return;

    setDraft(d => {
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
    setDraft(d => {
      const lessons = [...d.remediation_lessons];
      const lesson = { ...lessons[lessonIdx] };
      const plan = [...lesson.lesson_plan];
      plan[phaseIdx] = { ...plan[phaseIdx], [field]: html };
      lesson.lesson_plan = plan;
      lessons[lessonIdx] = lesson;
      return { ...d, remediation_lessons: lessons };
    });
  };

  const saveEditedRecommendation = async () => {
    if (!recDoc || !draft) return;
    try {
      const docRef = doc(db, "recommendations", recDoc.id);
      await updateDoc(docRef, { recommendations: draft });
      if (onSaveSuccess) onSaveSuccess();
      alert("Saved edits.");
      onClose();
    } catch (err) {
      console.error("saveEditedRecommendation error", err);
      alert("Failed to save edits.");
    }
  };

  const addRemediationLesson = () => {
    setDraft(d => ({
      ...d,
      remediation_lessons: [...(d.remediation_lessons || []), {
        topic: "New Topic",
        objectives: ["Objective 1"],
        time_allotment: "30 minutes",
        lesson_plan: [],
        notes_for_teachers: "<blockquote><p><i>A reminder for teachers...</i></p></blockquote>",
      }]
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-neumorphic-base rounded-2xl shadow-neumorphic p-6 z-50 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Edit Recommendation — {recDoc?.lessonTitle}</h3>
            <p className="text-sm text-slate-500">{recDoc?.unitTitle}</p>
          </div>
          <NeumorphicButton onClick={onClose}><IconX /></NeumorphicButton>
        </div>

        {!draft ? <div className="text-center p-10">Loading...</div> : (
          <div className="space-y-6">
            <div className="flex justify-between items-center p-3 bg-neumorphic-base rounded-lg shadow-neumorphic-inset">
              <p className="text-sm text-slate-600">Edit remediation lessons below. Use the toolbar for formatting.</p>
              <NeumorphicButton onClick={addRemediationLesson} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700">
                <IconPlus size={16} /> Add Lesson
              </NeumorphicButton>
            </div>

            {(draft.remediation_lessons || []).map((lesson, li) => (
              <div key={li} className="p-4 rounded-xl bg-neumorphic-base shadow-neumorphic space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <input value={lesson.topic || ""} onChange={(e) => updateLessonField(li, "topic", e.target.value)} className="text-lg font-semibold bg-neumorphic-base shadow-neumorphic-inset rounded-lg p-2 w-full" />
                  <NeumorphicButton onClick={() => setDraft(d => ({...d, remediation_lessons: d.remediation_lessons.filter((_, i) => i !== li)}))} className="text-red-600"><IconTrash /></NeumorphicButton>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Objectives (separate with "|")</label>
                  <input value={(lesson.objectives || []).join(" | ")} onChange={(e) => updateLessonField(li, "objectives", e.target.value.split("|").map(s => s.trim()).filter(Boolean))} className="w-full p-2 mt-1 rounded-lg bg-neumorphic-base shadow-neumorphic-inset" />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Time Allotment</label>
                  <input value={lesson.time_allotment || ""} onChange={(e) => updateLessonField(li, "time_allotment", e.target.value)} className="w-full p-2 mt-1 rounded-lg bg-neumorphic-base shadow-neumorphic-inset" />
                </div>

                <div className="p-4 rounded-lg bg-neumorphic-base shadow-neumorphic-inset">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-slate-800">Lesson Plan (Phases)</h4>
                    <NeumorphicButton onClick={() => addPhase(li)} className="flex items-center gap-2 px-3 py-1 text-sm text-sky-700"><IconPlus size={14} /> Add Phase</NeumorphicButton>
                  </div>
                  <div className="space-y-4">
                    {(lesson.lesson_plan || []).map((phase, pi) => (
                      <div key={pi} draggable onDragStart={(e) => onDragStart(e, li, pi)} onDrop={(e) => onDrop(e, li, pi)} onDragOver={onDragOver} className="p-4 bg-neumorphic-base rounded-lg shadow-neumorphic cursor-move">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <input value={phase.phase || ""} onChange={e => setPhaseField(li, pi, "phase", e.target.value)} placeholder="Phase Name" className="p-2 rounded-lg bg-neumorphic-base shadow-neumorphic-inset w-full" />
                            <input value={phase.time || ""} onChange={e => setPhaseField(li, pi, "time", e.target.value)} placeholder="Time" className="p-2 rounded-lg bg-neumorphic-base shadow-neumorphic-inset w-48" />
                          </div>
                          <div className="flex items-center gap-1">
                             <NeumorphicButton onClick={() => { /* move up logic */ }}><IconChevronUp /></NeumorphicButton>
                             <NeumorphicButton onClick={() => { /* move down logic */ }}><IconChevronDown /></NeumorphicButton>
                             <NeumorphicButton onClick={() => removePhase(li, pi)} className="text-red-600"><IconTrash /></NeumorphicButton>
                          </div>
                        </div>
                        <div className="mt-4 p-2 bg-neumorphic-base rounded-lg shadow-neumorphic-inset">
                          <div className="flex items-center gap-2 p-2">
                            <NeumorphicButton onClick={() => exec("bold")} className="font-bold">B</NeumorphicButton>
                            <NeumorphicButton onClick={() => exec("italic")} className="italic">I</NeumorphicButton>
                            <NeumorphicButton onClick={() => wrapBlockquote()}>❝</NeumorphicButton>
                            <NeumorphicButton onClick={() => exec("insertUnorderedList")}>• List</NeumorphicButton>
                            <NeumorphicButton onClick={() => exec("undo")}>↺</NeumorphicButton>
                          </div>
                          <div className="mt-2">
                            <div className="text-sm font-medium text-slate-700 mb-1">Teacher Instructions</div>
                            <div contentEditable suppressContentEditableWarning className="min-h-[100px] p-3 rounded-lg bg-neumorphic-base shadow-neumorphic-inset prose" onBlur={(e) => setPhaseField(li, pi, "teacher_instructions", e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: phase.teacher_instructions || "" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                 <div>
                  <label className="text-sm font-medium text-slate-700">Notes for Teachers</label>
                  <div contentEditable suppressContentEditableWarning className="min-h-[100px] p-3 mt-1 rounded-lg bg-neumorphic-base shadow-neumorphic-inset prose" onBlur={(e) => updateLessonField(li, "notes_for_teachers", e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: lesson.notes_for_teachers || "" }} />
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-4 mt-6">
              <NeumorphicButton onClick={onClose} className="px-6 py-2 font-semibold">Cancel</NeumorphicButton>
              <button onClick={saveEditedRecommendation} className="px-6 py-2 font-semibold bg-amber-600 text-white rounded-lg shadow-neumorphic transition-all duration-150 ease-in-out hover:shadow-neumorphic-inset">Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditRecommendationModal;