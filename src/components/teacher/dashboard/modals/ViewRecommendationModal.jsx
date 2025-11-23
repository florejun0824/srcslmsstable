// src/components/teacher/dashboard/modals/ViewRecommendationModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconX,
  IconArrowLeft,
  IconArrowRight,
  IconListCheck,
  IconCheck,
  IconChartBar,
  IconNotes,
  IconClock
} from "@tabler/icons-react";
import { marked } from "marked";

// --- MACOS 26 DESIGN SYSTEM CONSTANTS ---

const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

const windowContainerClasses = "relative w-full max-w-4xl h-full md:h-[85vh] flex flex-col bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] rounded-[2rem] shadow-2xl shadow-black/20 dark:shadow-black/50 ring-1 ring-white/40 dark:ring-white/5 overflow-hidden transition-all duration-300";
const cardSurface = "bg-white/40 dark:bg-[#1F2229]/40 backdrop-blur-xl rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-sm";

const iconButton = `
    relative font-semibold rounded-full transition-all duration-300 
    flex items-center justify-center p-2.5 text-slate-500 dark:text-slate-400 
    bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/15 
    hover:text-blue-600 dark:hover:text-blue-400
    backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md
    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
    active:scale-95
`;

// --- ANIMATION VARIANTS ---

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", duration: 0.5, bounce: 0.3 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

const pageVariants = {
  hidden: { opacity: 0, x: 20, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { ease: "easeOut", duration: 0.3 } },
  exit: { opacity: 0, x: -20, filter: "blur(4px)", transition: { ease: "easeIn", duration: 0.2 } },
};

export default function ViewRecommendationModal({ isOpen, onClose, recDoc }) {
  const contentRef = useRef(null);

  const hasReport = !!recDoc?.narrative_report;
  const lessons = recDoc?.recommendations?.remediation_lessons || [];

  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentPage, setCurrentPage] = useState(hasReport ? -1 : 0);

  const lesson = lessons[currentLesson] || null;
  const phases = lesson?.lesson_plan || [];
  const totalPhases = phases.length;
  
  // Calculate progress purely based on phases for the current lesson
  const progressPercentage =
    currentPage >= 0 && totalPhases > 0 ? ((currentPage + 1) / totalPhases) * 100 : 0;

  const goNext = useCallback(() => {
    if (currentPage < totalPhases - 1) {
      setCurrentPage((p) => p + 1);
    } else if (currentLesson < lessons.length - 1) {
      setCurrentLesson((l) => l + 1);
      setCurrentPage(0);
    } else {
      onClose();
    }
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, totalPhases, currentLesson, lessons.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
    } else if (currentLesson > 0) {
      const prevLesson = lessons[currentLesson - 1];
      setCurrentLesson((l) => l - 1);
      setCurrentPage((prevLesson?.lesson_plan?.length || 1) - 1);
    } else if (currentPage === 0 && hasReport) {
      setCurrentPage(-1);
    }
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, currentLesson, lessons, hasReport]);

  useEffect(() => {
    if (isOpen) {
      setCurrentLesson(0);
      setCurrentPage(hasReport ? -1 : 0);
    }
  }, [isOpen, recDoc, hasReport]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, goNext, goPrev, onClose]);

  if (!isOpen || !recDoc) return null;

  const renderMarkdown = (htmlContent) => (
    <div
      className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed font-sans"
      dangerouslySetInnerHTML={{ __html: marked.parse(htmlContent || "") }}
    />
  );

  // Helper for recommendation badges
  const getBadgeStyle = (action) => {
    switch (action) {
        case "FULL_RETEACH": return "bg-red-500/10 text-red-600 border-red-500/20";
        case "PARTIAL_RETEACH": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
        case "REVIEW": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
        default: return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      <Dialog.Panel
        as={motion.div}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={windowContainerClasses}
      >
        {/* Header */}
        <header className="flex flex-col flex-shrink-0 bg-white/50 dark:bg-white/5 border-b border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-center p-6 pb-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        {currentPage === -1 ? <IconChartBar size={20} /> : <IconListCheck size={20} />}
                    </div>
                    <div>
                        <Dialog.Title className={`${headingStyle} text-xl`}>
                            {currentPage === -1
                            ? "Performance Report"
                            : lesson?.topic || recDoc.lessonTitle || "Remediation Plan"}
                        </Dialog.Title>
                        <p className={subHeadingStyle}>
                            {currentPage === -1 ? "AI Analysis" : `Phase ${currentPage + 1} of ${totalPhases} • ${lesson?.time_allotment || 'Remediation'}`}
                        </p>
                    </div>
                </div>

                <button onClick={onClose} className={iconButton}>
                    <IconX size={20} />
                </button>
            </div>

            {/* Progress Line */}
            <div className="w-full h-[2px] bg-slate-200/50 dark:bg-white/5">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ ease: "circOut", duration: 0.5 }}
                />
            </div>
        </header>

        {/* Scrollable Body */}
        <main
          ref={contentRef}
          className="flex-grow overflow-y-auto custom-scrollbar p-6 sm:p-8"
        >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentLesson}-${currentPage}`}
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* --- CONTENT: Report --- */}
                {currentPage === -1 && hasReport ? (
                  <div className="space-y-6">
                    {recDoc.recommendation_action && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Status:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${getBadgeStyle(recDoc.recommendation_action)}`}>
                                {recDoc.recommendation_action.replace("_", " ")}
                            </span>
                        </div>
                    )}
                    
                    <div className={`${cardSurface} p-6 sm:p-8`}>
                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Narrative Analysis</h3>
                        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed">
                            {recDoc.narrative_report}
                        </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* --- CONTENT: Objectives (First Slide Only) --- */}
                    {lesson?.objectives?.length > 0 && currentPage === 0 && (
                      <div className={`${cardSurface} p-6 border-l-4 border-l-blue-500`}>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wide">
                          <IconListCheck className="text-blue-500" size={18} />
                          Learning Objectives
                        </h3>
                        <ul className="grid gap-3">
                          {lesson.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                              <IconCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* --- CONTENT: Lesson Phase --- */}
                    {phases[currentPage] ? (
                      <div className={`${cardSurface} p-6 sm:p-8 space-y-6`}>
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                            <h4 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                                {phases[currentPage].phase}
                            </h4>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <IconClock size={14} />
                                {phases[currentPage].time}
                            </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                            <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">Teacher Instructions</h5>
                            {renderMarkdown(phases[currentPage].teacher_instructions)}
                          </div>
                        </div>

                        {phases[currentPage].activity && (
                          <div className="pt-2">
                             <h5 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white mb-3">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                Activity: {phases[currentPage].activity.title}
                             </h5>
                             <div className="pl-4 border-l-2 border-slate-200 dark:border-white/10 space-y-3">
                                {renderMarkdown(phases[currentPage].activity.instructions)}
                                
                                {phases[currentPage].activity.materials_needed?.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {phases[currentPage].activity.materials_needed.map((mat, m) => (
                                            <span key={m} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                                {mat}
                                            </span>
                                        ))}
                                    </div>
                                )}
                             </div>
                          </div>
                        )}

                        {lesson.notes_for_teachers && currentPage === phases.length - 1 && (
                          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-white/10">
                            <h5 className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-500 mb-3">
                                <IconNotes size={16} />
                                Teacher Notes
                            </h5>
                            <div className="text-sm italic text-slate-500 dark:text-slate-400">
                                {renderMarkdown(lesson.notes_for_teachers)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                        <IconChartBar size={48} className="mb-2" />
                        <p>No content available for this section.</p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="flex justify-between items-center p-5 border-t border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md">
          <button
            onClick={goPrev}
            disabled={currentLesson === 0 && currentPage === (hasReport ? -1 : 0)}
            className={iconButton}
          >
            <IconArrowLeft size={20} />
          </button>

          <span className="text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
            {currentPage === -1 ? "Overview" : `Step ${currentPage + 1}`}
          </span>

          <button
            onClick={goNext}
            className={iconButton}
          >
            <IconArrowRight size={20} />
          </button>
        </footer>
      </Dialog.Panel>
    </Dialog>
  );
}