// src/components/teacher/dashboard/modals/ViewRecommendationModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ListBulletIcon,
  CheckCircleIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/solid";
import { marked } from "marked";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { ease: "easeOut", duration: 0.2 } },
  exit: { opacity: 0, scale: 0.98, transition: { ease: "easeIn", duration: 0.15 } },
};

const pageVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { ease: "easeOut", duration: 0.25 } },
  exit: { opacity: 0, x: -20, transition: { ease: "easeIn", duration: 0.2 } },
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
    contentRef.current?.scrollTo(0, 0);
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
    contentRef.current?.scrollTo(0, 0);
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
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, goNext, goPrev]);

  if (!isOpen || !recDoc) return null;

  const renderMarkdown = (htmlContent) => (
    <div
      className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-200"
      dangerouslySetInnerHTML={{ __html: marked.parse(htmlContent || "") }}
    />
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm"
      />

      <Dialog.Panel
        as={motion.div}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark
                   w-full max-w-4xl z-10 flex flex-col h-full md:h-[90vh] md:max-h-[700px] overflow-hidden transition-colors duration-300"
      >
        {/* Progress Bar */}
        <div className="w-full bg-neumorphic-base dark:bg-neumorphic-base-dark h-1.5 flex-shrink-0 shadow-neumorphic-flat-inset">
          <div
            className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 dark:from-sky-500 dark:via-blue-600 dark:to-indigo-600
                       h-1.5 transition-all duration-300 ease-out rounded-r-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Header */}
        <header className="flex justify-between items-center p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <Dialog.Title className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
            {currentPage === -1
              ? "Performance Analysis Report"
              : lesson?.topic || recDoc.lessonTitle || "Lesson Remediation"}
          </Dialog.Title>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-neumorphic-base dark:bg-neumorphic-base-dark
                       shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       transition-all duration-300 active:scale-[0.97]"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </header>

        {/* Body */}
        <main
          ref={contentRef}
          className="flex-grow overflow-y-auto p-6 bg-neumorphic-base dark:bg-neumorphic-base-dark transition-colors duration-300"
        >
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentLesson}-${currentPage}`}
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Report Page */}
                {currentPage === -1 && hasReport ? (
                  <div className="p-6 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark space-y-4">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                      <DocumentChartBarIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                      Analysis Summary
                    </h3>

                    {/* Recommendation Display */}
                    {recDoc.recommendation_action && (
                      <div
                        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm border border-slate-300 dark:border-slate-600
                                    bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300`}
                      >
                        Recommendation:
                        <span
                          className={`ml-2 px-2 py-0.5 rounded-full text-white ${
                            recDoc.recommendation_action === "NONE"
                              ? "bg-green-600"
                              : recDoc.recommendation_action === "REVIEW"
                              ? "bg-yellow-500"
                              : recDoc.recommendation_action === "PARTIAL_RETEACH"
                              ? "bg-orange-500"
                              : "bg-red-600"
                          }`}
                        >
                          {recDoc.recommendation_action.replace("_", " ")}
                        </span>
                      </div>
                    )}

                    <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap mt-4 text-slate-700 dark:text-slate-200">
                      {recDoc.narrative_report}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Learning Objectives */}
                    {lesson?.objectives?.length > 0 && currentPage === 0 && (
                      <div className="mb-6 p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
                          <ListBulletIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                          Learning Objectives
                        </h3>
                        <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                          {lesson.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircleIcon className="h-5 w-5 text-sky-500 dark:text-sky-400 mt-0.5 flex-shrink-0" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Lesson Phases */}
                    {phases[currentPage] ? (
                      <div className="p-6 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark space-y-4">
                        <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          {phases[currentPage].phase}{" "}
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            ({phases[currentPage].time})
                          </span>
                        </h4>

                        <div>
                          <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Teacher Instructions
                          </h5>
                          {renderMarkdown(phases[currentPage].teacher_instructions)}
                        </div>

                        {phases[currentPage].activity && (
                          <div>
                            <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Activity: {phases[currentPage].activity.title}
                            </h5>
                            {renderMarkdown(phases[currentPage].activity.instructions)}
                            {phases[currentPage].activity.materials_needed?.length > 0 && (
                              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                                <strong>Materials:</strong>{" "}
                                {phases[currentPage].activity.materials_needed.join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {lesson.notes_for_teachers && currentPage === phases.length - 1 && (
                          <div className="pt-4 mt-4 border-t border-slate-300 dark:border-slate-700">
                            <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Notes for Teachers
                            </h5>
                            {renderMarkdown(lesson.notes_for_teachers)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 text-center p-8">
                        No content for this phase.
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex justify-between items-center p-4 border-t border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={goPrev}
            disabled={currentLesson === 0 && currentPage === (hasReport ? -1 : 0)}
            className="relative p-3 rounded-lg text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark
                       shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>

          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {currentPage === -1 ? "Report" : `Phase ${currentPage + 1} of ${totalPhases}`}
          </span>

          <button
            onClick={goNext}
            className="relative p-3 rounded-lg text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark
                       shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       transition-all duration-300 active:scale-[0.98]"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </footer>
      </Dialog.Panel>
    </Dialog>
  );
}
