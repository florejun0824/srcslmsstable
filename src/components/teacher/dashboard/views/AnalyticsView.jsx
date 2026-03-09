import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../../../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  limit // Added limit
} from "firebase/firestore";
import {
  IconAlertTriangle,
  IconAnalyze,
  IconChevronDown,
  IconFileExport,
  IconDownload,
  IconEdit,
  IconTrash,
  IconChartBar,
  IconBrain,
  IconBookmarks,
  IconCheck,
} from "@tabler/icons-react";

import Spinner from "../../../common/Spinner";
import AnalysisReportModal from "../modals/AnalysisReportModal";
import RemediationPreviewModal from "../modals/RemediationPreviewModal";
import ViewRecommendationModal from "../modals/ViewRecommendationModal";
import EditRecommendationModal from "../modals/EditRecommendationModal";
import { callGeminiWithLimitCheck } from "../../../../services/aiService";
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from "../../../../contexts/ThemeContext";
import { marked } from "marked";

// Note: PDF libraries removed from top-level import to reduce bundle size.
// They will be dynamically imported in the export function.

// --- MONET STYLE HELPER (Kept external to prevent recreation) ---
const getMonetStyles = (activeOverlay) => {
  if (!activeOverlay || activeOverlay === 'none') return null;

  const baseGlass = "backdrop-blur-xl border shadow-xl transition-all duration-300";

  const styles = {
    container: "",
    card: "",
    textMain: "text-white",
    textSub: "text-white/60",
    buttonPrimary: "",
    buttonSecondary: "",
    activeTab: "",
    inactiveTab: "text-white/60 hover:bg-white/10 hover:text-white",
    dropdown: "bg-[#1E212B]/95 border border-white/10",
    dropdownItemActive: "bg-white/10 text-white font-semibold",
    dropdownItemInactive: "text-white/70 hover:bg-white/5 hover:text-white",
    tableHeader: "bg-white/5 border-b border-white/10 text-white/60",
    tableRow: "hover:bg-white/5 border-white/5",
    accentColor: ""
  };

  switch (activeOverlay) {
    case 'christmas':
      return { ...styles, container: `${baseGlass} bg-[#0f172a]/80 border-emerald-500/20 shadow-emerald-900/10`, card: "bg-[#0f172a]/60 border-emerald-500/20", buttonPrimary: "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-emerald-900/20", buttonSecondary: "bg-emerald-900/40 text-emerald-100 border-emerald-500/30 hover:bg-emerald-800/50", activeTab: "bg-emerald-600 text-white shadow-md", accentColor: "text-emerald-400" };
    case 'valentines':
      return { ...styles, container: `${baseGlass} bg-[#2c0b0e]/80 border-rose-500/20 shadow-rose-900/10`, card: "bg-[#2c0b0e]/60 border-rose-500/20", buttonPrimary: "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-rose-900/20", buttonSecondary: "bg-rose-900/40 text-rose-100 border-rose-500/30 hover:bg-rose-800/50", activeTab: "bg-rose-600 text-white shadow-md", accentColor: "text-rose-400" };
    case 'graduation':
      return { ...styles, container: `${baseGlass} bg-[#1a1400]/80 border-amber-500/20 shadow-amber-900/10`, card: "bg-[#1a1400]/60 border-amber-500/20", buttonPrimary: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-amber-900/20", buttonSecondary: "bg-amber-900/40 text-amber-100 border-amber-500/30 hover:bg-amber-800/50", activeTab: "bg-amber-600 text-white shadow-md", accentColor: "text-amber-400" };
    case 'rainy':
      return { ...styles, container: `${baseGlass} bg-[#061816]/80 border-teal-500/20 shadow-teal-900/10`, card: "bg-[#061816]/60 border-teal-500/20", buttonPrimary: "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-teal-900/20", buttonSecondary: "bg-teal-900/40 text-teal-100 border-teal-500/30 hover:bg-teal-800/50", activeTab: "bg-teal-600 text-white shadow-md", accentColor: "text-teal-400" };
    case 'cyberpunk':
      return { ...styles, container: `${baseGlass} bg-[#180a20]/80 border-sky-500/20 shadow-sky-900/10`, card: "bg-[#180a20]/60 border-sky-500/20", buttonPrimary: "bg-gradient-to-r from-sky-600 to-sky-600 text-white shadow-sky-900/20", buttonSecondary: "bg-sky-900/40 text-sky-100 border-sky-500/30 hover:bg-sky-800/50", activeTab: "bg-sky-600 text-white shadow-md", accentColor: "text-sky-400" };
    case 'spring':
      return { ...styles, container: `${baseGlass} bg-[#1f0f15]/80 border-pink-500/20 shadow-pink-900/10`, card: "bg-[#1f0f15]/60 border-pink-500/20", buttonPrimary: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-900/20", buttonSecondary: "bg-pink-900/40 text-pink-100 border-pink-500/30 hover:bg-pink-800/50", activeTab: "bg-pink-500 text-white shadow-md", accentColor: "text-pink-400" };
    case 'space':
      return { ...styles, container: `${baseGlass} bg-[#020617]/80 border-indigo-500/20 shadow-indigo-900/10`, card: "bg-[#020617]/60 border-indigo-500/20", buttonPrimary: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-900/20", buttonSecondary: "bg-indigo-900/40 text-indigo-100 border-indigo-500/30 hover:bg-indigo-800/50", activeTab: "bg-indigo-600 text-white shadow-md", accentColor: "text-indigo-400" };
    default:
      return null;
  }
};

// --- STYLES CONSTANTS ---
const commonContainerClasses = "relative h-full w-full p-2 sm:p-4 md:p-6 font-sans overflow-hidden selection:bg-blue-500/30";
const headingStyle = "font-display font-bold tracking-tight";
const subHeadingStyle = "font-bold tracking-widest uppercase text-[0.65rem] letter-spacing-1";
const dropdownContainer = "relative z-[60] w-full";
const dropdownItem = "block w-full text-left px-4 py-3 sm:py-2.5 rounded-lg text-sm sm:text-[13px] transition-colors duration-200 mt-1 first:mt-0";
const activeDropdownItem = 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold';
const inactiveDropdownItem = 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5';

const baseButtonStyles = `
    relative font-semibold rounded-full transition-all duration-200 hover:-translate-y-0.5
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
`;

const panelButton = `
    flex items-center sm:w-full gap-2 sm:gap-3 px-4 py-3 sm:py-3.5 rounded-2xl transition-all duration-300 font-medium text-sm group relative overflow-hidden shrink-0 border border-transparent
`;
const activePanelButton = 'text-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20';
const inactivePanelButton = 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:border-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white';

// --- SKELETONS ---
const SkeletonPulse = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />;
const StudentsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="p-5 sm:p-6 h-36 flex flex-col justify-between bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <SkeletonPulse className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2"><SkeletonPulse className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700" /><SkeletonPulse className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800" /></div>
        </div>
        <SkeletonPulse className="h-6 w-24 rounded-full mt-4 bg-slate-100 dark:bg-slate-800" />
      </div>
    ))}
  </div>
);
const TableSkeleton = () => (
  <div className="overflow-hidden bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex gap-4"><SkeletonPulse className="h-4 w-32 bg-slate-200 dark:bg-slate-700" /><SkeletonPulse className="h-4 w-20 bg-slate-200 dark:bg-slate-700" /></div>
    <div className="p-4 space-y-4">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4"><SkeletonPulse className="h-4 w-full sm:w-1/2 bg-slate-100 dark:bg-slate-800" /><div className="flex gap-4"><SkeletonPulse className="h-6 w-12 rounded-full bg-slate-200 dark:bg-slate-700" /><SkeletonPulse className="h-6 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" /></div></div>)}</div>
  </div>
);
const RecommendationsSkeleton = () => (
  <div className="space-y-4 mt-6">{[1, 2, 3].map((i) => <div key={i} className="pt-4 pb-4 h-auto sm:h-20 flex flex-col sm:flex-row sm:items-center px-6 gap-4 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"><SkeletonPulse className="h-4 w-full sm:w-1/3 bg-slate-200 dark:bg-slate-700" /><div className="flex-1 hidden sm:block" /><div className="flex gap-2 self-end sm:self-auto"><SkeletonPulse className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" /><SkeletonPulse className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" /></div></div>)}</div>
);

// --- UTILS ---
const quote = (s = "") => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
const downloadFile = (content, mimeType, filename) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
const customUnitSort = (a, b) => {
  const numA = parseInt(a.match(/\d+/)?.[0], 10);
  const numB = parseInt(b.match(/\d+/)?.[0], 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  if (!isNaN(numA)) return -1;
  if (!isNaN(numB)) return 1;
  return a.localeCompare(b);
};

// --- DATA FETCHING ---
const fetchUnitsInBatches = async (unitIds) => {
  if (!unitIds || unitIds.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < unitIds.length; i += 30) chunks.push(unitIds.slice(i, i + 30));
  const snapshots = await Promise.all(chunks.map((chunk) => getDocs(query(collection(db, "units"), where("__name__", "in", chunk)))));
  const unitsMap = {};
  snapshots.forEach((snap) => snap.docs.forEach((d) => (unitsMap[d.id] = d.data().title)));
  return unitsMap;
};
const fetchLessonsInBatches = async (lessonIds) => {
  if (!lessonIds || lessonIds.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < lessonIds.length; i += 30) chunks.push(lessonIds.slice(i, i + 30));
  const snapshots = await Promise.all(chunks.map((chunk) => getDocs(query(collection(db, "lessons"), where("__name__", "in", chunk)))));
  const lessonsMap = {};
  snapshots.forEach((snap) => snap.docs.forEach((d) => (lessonsMap[d.id] = { id: d.id, ...d.data() })));
  return lessonsMap;
};

const AnalyticsView = ({ activeClasses }) => {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [quizzesInClass, setQuizzesInClass] = useState([]);
  const [unitsMap, setUnitsMap] = useState({});
  const [lessonsMap, setLessonsMap] = useState({});
  const [analysisType, setAnalysisType] = useState("students");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [atRiskByQuarter, setAtRiskByQuarter] = useState({});
  const [itemAnalysisData, setItemAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openUnit, setOpenUnit] = useState(null);
  const [openRecsUnit, setOpenRecsUnit] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [savedRecs, setSavedRecs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingRec, setViewingRec] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState(null);
  const [exportingPdfId, setExportingPdfId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [generatedRemediation, setGeneratedRemediation] = useState(null);
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isQuarterDropdownOpen, setIsQuarterDropdownOpen] = useState(false);

  const selectedClass = useMemo(() => activeClasses.find((c) => c.id === selectedClassId), [activeClasses, selectedClassId]);

  const { activeOverlay } = useTheme();
  // Optimization: Memoize Styles
  const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

  // --- STYLES (Memoized) ---
  const dynamicStyles = useMemo(() => ({
    container: monet ? `relative z-10 h-full flex flex-col rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden ${monet.container}` : "relative z-10 h-full flex flex-col bg-slate-50/50 dark:bg-[#0B1121] rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all duration-300",
    header: monet ? "flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:px-8 border-b border-white/10 z-20 shrink-0 gap-4" : "flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:px-8 border-b border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 shrink-0 gap-4",
    sidebar: monet ? "w-full sm:w-80 flex flex-col border-b sm:border-b-0 sm:border-r border-white/10 p-5 sm:p-6 gap-6 sm:overflow-y-auto z-20 sm:custom-scrollbar shrink-0" : "w-full sm:w-80 flex flex-col border-b sm:border-b-0 sm:border-r border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-5 sm:p-6 gap-6 sm:overflow-y-auto z-20 sm:custom-scrollbar shrink-0",
    dropdownBtn: monet ? `w-full flex justify-between items-center px-4 py-3 sm:py-3.5 rounded-2xl shadow-sm transition-all text-sm font-semibold ${monet.buttonSecondary} border-transparent` : `w-full flex justify-between items-center px-4 py-3 sm:py-3.5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-300 text-slate-800 dark:text-slate-100 font-semibold text-[13px] sm:text-sm`,
    dropdownList: monet ? `absolute top-full left-0 mt-2 w-full rounded-2xl shadow-xl z-[70] overflow-hidden p-2 max-h-64 sm:max-h-72 overflow-y-auto custom-scrollbar ${monet.dropdown}` : `absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-[70] overflow-hidden p-2 max-h-64 sm:max-h-72 overflow-y-auto custom-scrollbar`,
    card: monet ? `rounded-3xl border shadow-sm ${monet.card}` : `bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none`,
  }), [monet]);

  // --- Effects ---
  useEffect(() => {
    let isMounted = true;
    const loadClassQuizzes = async () => {
      if (!selectedClass) {
        if (isMounted) { setQuizzesInClass([]); setUnitsMap({}); setLessonsMap({}); setAtRiskByQuarter({}); setItemAnalysisData(null); setSelectedQuizId(""); }
        return;
      }
      setIsLoading(true);
      // Reset states
      if (isMounted) { setAtRiskByQuarter({}); setItemAnalysisData(null); setSelectedQuizId(""); setAnalysisResult(null); setGeneratedRemediation(null); }

      try {
        let quizzesData = [];
        if (selectedClass.subjectId) {
          const q = query(collection(db, "quizzes"), where("subjectId", "==", selectedClass.subjectId));
          const snap = await getDocs(q);
          quizzesData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
        const unitIds = [...new Set(quizzesData.map((q) => q.unitId).filter(Boolean))];
        const lessonIds = [...new Set(quizzesData.map((q) => q.lessonId).filter(Boolean))];
        const [unitsFetched, lessonsFetched] = await Promise.all([
          fetchUnitsInBatches(unitIds),
          fetchLessonsInBatches(lessonIds),
        ]);
        if (isMounted) {
          setUnitsMap(unitsFetched);
          setLessonsMap(lessonsFetched);
          setQuizzesInClass(quizzesData.map((q) => ({ ...q, unitDisplayName: q.unitId ? unitsFetched[q.unitId] || "Uncategorized" : "Uncategorized", lessonTitle: q.lessonId ? lessonsFetched[q.lessonId]?.title || "" : "" })));
        }
      } catch (err) {
        console.error("Error loading class quizzes:", err);
        if (isMounted) setQuizzesInClass([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadClassQuizzes();
    return () => { isMounted = false; };
  }, [selectedClassId, selectedClass]);

  // Optimized At-Risk Loader
  useEffect(() => {
    let isMounted = true;
    const loadAtRiskData = async () => {
      if (analysisType !== "students" || !selectedClassId || !selectedClass?.students || !quizzesInClass.length) {
        if (isMounted) setAtRiskByQuarter({});
        return;
      }
      setIsLoading(true);
      try {
        const quarterGroups = { 1: [], 2: [], 3: [], 4: [] };
        // Optimization: In production, this needs pagination or a backend aggregation.
        // For now, we query but awareness of read costs is important.
        const allSubsQ = query(collection(db, "quizSubmissions"), where("classId", "==", selectedClassId));
        const allSubsSnap = await getDocs(allSubsQ);

        if (!isMounted) return;

        const subsByStudent = {};
        allSubsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (!data.studentId) return;
          if (!subsByStudent[data.studentId]) subsByStudent[data.studentId] = [];
          subsByStudent[data.studentId].push(data);
        });

        // Loop optimization
        selectedClass.students.forEach(student => {
          const studentId = student.id || student.userId || student.uid;
          if (!studentId || !subsByStudent[studentId]) return;

          const studentName = student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.name || student.id || "Unnamed Student";

          // Fast calculate quarters
          const quarterScores = { 1: [], 2: [], 3: [], 4: [] };
          const processedQuizzes = new Set(); // To handle repeats if necessary, though best attempt logic is used below

          // Filter to best attempts only
          const bestAttempts = new Map();
          subsByStudent[studentId].forEach(sub => {
            const existing = bestAttempts.get(sub.quizId);
            if (!existing || (sub.score > existing.score)) {
              bestAttempts.set(sub.quizId, sub);
            }
          });

          bestAttempts.forEach(attempt => {
            const quiz = quizzesInClass.find(q => q.id === attempt.quizId);
            const quarter = attempt.quarter || quiz?.quarter;
            if (quarter && quarterScores[quarter]) {
              const percent = attempt.totalItems > 0 ? (attempt.score / attempt.totalItems) * 100 : 0;
              quarterScores[quarter].push(percent);
            }
          });

          Object.entries(quarterScores).forEach(([q, scores]) => {
            if (scores.length > 0) {
              const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
              if (avg < 75) quarterGroups[q].push({ id: studentId, name: studentName, reasons: [`Quarter ${q}: Avg ${avg.toFixed(0)}%`] });
            }
          });
        });

        setAtRiskByQuarter(quarterGroups);
      } catch (err) {
        console.error("Error loading at-risk data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadAtRiskData();
    return () => { isMounted = false; };
  }, [analysisType, selectedClassId, selectedClass, quizzesInClass]);

  useEffect(() => {
    let isMounted = true;
    const analyzeQuizData = async () => {
      if (!selectedQuizId) {
        if (isMounted) { setItemAnalysisData(null); setLessonData(null); }
        return;
      }
      setIsLoading(true);
      setAnalysisResult(null);
      setGeneratedRemediation(null);

      try {
        const subsQ = query(collection(db, "quizSubmissions"), where("quizId", "==", selectedQuizId), where("classId", "==", selectedClassId));
        const subsSnap = await getDocs(subsQ);
        if (!isMounted) return;

        const submissions = subsSnap.docs.map((d) => d.data());
        if (submissions.length === 0) {
          setItemAnalysisData([]);
          setIsLoading(false);
          return;
        }

        // Data Transformation Logic (Simplified)
        const firstAttempts = new Map();
        submissions.forEach((sub) => {
          const submittedAt = sub.submittedAt?.seconds ? sub.submittedAt.seconds : new Date(sub.submittedAt).getTime() / 1000;
          const existing = firstAttempts.get(sub.studentId);
          if (!existing || submittedAt < existing.submittedAt) {
            firstAttempts.set(sub.studentId, { ...sub, submittedAt });
          }
        });

        const questionAnalysis = {};
        firstAttempts.forEach((submission) => {
          (submission.answers || []).forEach((answer) => {
            if (!answer || !answer.questionText) return;
            if (!questionAnalysis[answer.questionText]) {
              questionAnalysis[answer.questionText] = { correct: 0, total: 0, type: answer.questionType || "multiple-choice", breakdown: [] };
            }
            const qData = questionAnalysis[answer.questionText];
            if (answer.questionType === "matching-type") {
              (answer.prompts || []).forEach((p) => {
                const isPairCorrect = p.userAnswerId && p.userAnswerId === p.correctAnswerId;
                if (isPairCorrect) qData.correct++;
                qData.total++;
                qData.breakdown.push({ promptId: p.id || p.promptId, promptText: p.text || p.promptText || "", studentChoice: p.userAnswerText || null, correctChoice: p.correctAnswerText || null, isCorrect: isPairCorrect });
              });
            } else {
              qData.total++;
              if (answer.isCorrect) qData.correct++;
            }
          });
        });

        const results = Object.keys(questionAnalysis).map((question) => {
          const { correct, total, type, breakdown } = questionAnalysis[question];
          return { question, correct, total, difficulty: total > 0 ? ((correct / total) * 100).toFixed(0) + "%" : "N/A", type, breakdown: type === "matching-type" ? breakdown : undefined };
        });

        setItemAnalysisData(results);

        // Fetch Lesson Data for Context
        const quizDoc = quizzesInClass.find((q) => q.id === selectedQuizId);
        if (quizDoc?.lessonId) {
          const lessonRef = doc(db, "lessons", quizDoc.lessonId);
          const lessonSnap = await getDoc(lessonRef);
          if (lessonSnap.exists()) setLessonData({ id: lessonSnap.id, ...lessonSnap.data() });
        }
      } catch (e) { console.error(e); }
      finally { if (isMounted) setIsLoading(false); }
    };
    analyzeQuizData();
    return () => { isMounted = false; };
  }, [selectedQuizId, selectedClassId, quizzesInClass]);

  useEffect(() => {
    let isMounted = true;
    const loadSavedRecs = async () => {
      if (!selectedClassId) { if (isMounted) setSavedRecs([]); return; }
      const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId));
      const snap = await getDocs(q);
      if (isMounted) setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadSavedRecs();
    return () => { isMounted = false; };
  }, [selectedClassId, isSaving]);

  // --- ACTIONS ---

  const generateAnalysisReport = async () => {
    if (!itemAnalysisData) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setGeneratedRemediation(null);
    try {
      const percentages = itemAnalysisData.map((i) => {
        const correct = i.correct || 0;
        const total = i.total || 0;
        return total > 0 ? (correct / total) * 100 : 0;
      });
      const generalAverage = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
      const lessonTitle = lessonData?.title || "Unnamed Lesson";
      const language = lessonData?.language || "English";
      const itemsSummary = itemAnalysisData.map((item) => `- "${item.question}" (${item.difficulty})`).join("\n");
      const prompt = `
        You are an expert data analyst. Analyze quiz data.
        Context: Class Subject: "${lessonTitle}", Avg: ${generalAverage.toFixed(2)}%
        Items: ${itemsSummary}
        Recommendation Rules:
        - Avg >= 80%: "NONE"
        - Avg 70-79%: "REVIEW"
        - Avg 60-69%: "PARTIAL_RETEACH"
        - Avg < 60%: "FULL_RETEACH"
        Output JSON: { "narrative_report": "string in ${language}", "recommendation_action": "string" }
      `;
      const rawAiResponse = await callGeminiWithLimitCheck(prompt);
      const firstBracket = rawAiResponse.indexOf("{");
      const lastBracket = rawAiResponse.lastIndexOf("}");
      const jsonString = rawAiResponse.substring(firstBracket, lastBracket + 1);
      setAnalysisResult(JSON.parse(jsonString));
      setIsAnalysisModalOpen(true);
    } catch (err) {
      console.error("Analysis Error", err);
      alert("Error analyzing data.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRemediationPlan = async () => {
    if (!analysisResult?.recommendation_action) { alert("Error: No analysis result found."); return; }
    if (!lessonData) { alert("Cannot generate remediation plan because this Quiz is not linked to a Lesson content in the database."); return; }

    const action = analysisResult.recommendation_action;
    if (action === "NONE") { alert("No remediation needed."); return; }

    const weakItems = itemAnalysisData.filter((i) => {
      const percent = i.total > 0 ? (i.correct / i.total) * 100 : 0;
      return percent < 75;
    });

    // Fallback if all items are good but average is low (edge case)
    const targetItems = weakItems.length > 0 ? weakItems : [...itemAnalysisData].sort((a, b) => {
      const perA = a.total > 0 ? (a.correct / a.total) : 0;
      const perB = b.total > 0 ? (b.correct / b.total) : 0;
      return perA - perB;
    }).slice(0, 3);

    setIsGeneratingRemediation(true);
    try {
      const lessonLanguage = lessonData?.language || "original language";
      const pages = lessonData?.pages || [];
      const lessonText = pages.length > 0 ? pages.map((p) => `${p.title ? p.title + "\n" : ""}${p.content || ""}`).join("\n\n") : lessonData.content || "No lesson content found.";
      const weakTopicsString = targetItems.map((item) => `- ${item.question} (Diff: ${item.difficulty})`).join("\n");

      let duration = "60 minutes";
      if (action === "REVIEW") duration = "20 minutes";
      else if (action === "PARTIAL_RETEACH") duration = "40 minutes";

      const prompt = `
          Create a remedial lesson plan.
          Original: "${lessonData?.title}"
          Text: ${lessonText.substring(0, 2000)}...
          Weak Areas: ${weakTopicsString}
          Type: ${action}
          Duration: ${duration}
          Language: ${lessonLanguage}
          Output JSON: { "weak_topics": ["str"], "remediation_lessons": [{ "topic": "str", "objectives": ["str"], "time_allotment": "str", "lesson_plan": [{"phase":"str", "time":"str", "teacher_instructions":"str", "activity": {"title":"str", "instructions":"str", "materials_needed":["str"]}}], "notes_for_teachers": "str" }] }
          `;

      const rawAiResponse = await callGeminiWithLimitCheck(prompt);
      const firstBracket = rawAiResponse.indexOf("{");
      const lastBracket = rawAiResponse.lastIndexOf("}");
      if (firstBracket === -1 || lastBracket === -1) throw new Error("Invalid AI Response format");
      setGeneratedRemediation(JSON.parse(rawAiResponse.substring(firstBracket, lastBracket + 1)));
      setIsAnalysisModalOpen(false);
      setIsPreviewModalOpen(true);
    } catch (err) {
      console.error("Remediation Error", err);
      alert("Error generating remediation: " + err.message);
    } finally {
      setIsGeneratingRemediation(false);
    }
  };

  const exportItemAnalysisToCSV = () => {
    if (!itemAnalysisData) return;
    const headers = ["Question", "Correct", "Total", "Difficulty (%)"];
    const rows = [headers.map(quote).join(",")];
    itemAnalysisData.forEach((item) => rows.push([item.question, item.correct, item.total, item.difficulty].map(quote).join(",")));
    downloadFile(rows.join("\n"), "text/csv", "analysis.csv");
  };

  // --- DYNAMIC PDF IMPORT ---
  const exportRecToPDF = async (recDoc) => {
    if (!recDoc) return;
    setExportingPdfId(recDoc.id);
    try {
      // DYNAMIC IMPORT FOR BUNDLE OPTIMIZATION
      const pdfMake = (await import("pdfmake/build/pdfmake.min")).default;
      const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;
      const htmlToPdfmake = (await import("html-to-pdfmake")).default;
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

      const lesson = recDoc.recommendations?.remediation_lessons?.[0];
      const pdfStyles = {
        pageTitle: { fontSize: 20, bold: true, color: '#005a9c', margin: [0, 15, 0, 8] },
        subheading: { fontSize: 12, bold: true, color: '#333', margin: [0, 10, 0, 4] },
        bold: { bold: true },
        blockquote: { italics: true, color: '#555', margin: [10, 5, 0, 5] },
        default: { fontSize: 10, lineHeight: 1.15, color: '#333333', alignment: 'justify' },
      };
      const convertMarkdown = (mdText = "") => {
        const html = marked.parse(mdText);
        return htmlToPdfmake(html, { defaultStyles: pdfStyles.default, styles: { blockquote: pdfStyles.blockquote } });
      };
      const lessonTitle = `${recDoc.lessonTitle || 'Remediation'} Plan`;
      let content = [];
      if (recDoc.narrative_report) {
        content.push({
          stack: [
            { text: 'Performance Analysis Report', style: 'pageTitle', alignment: 'left', margin: [0, 0, 0, 15] },
            ...recDoc.narrative_report.split('\n').filter(p => p.trim() !== '').map(p => ({ text: p, margin: [0, 0, 0, 8] }))
          ],
        });
      }
      if (lesson) {
        if (content.length > 0) content.push({ text: '', pageBreak: 'before' });
        let lessonContent = [];
        lessonContent.push({ text: lesson.topic, style: 'pageTitle' });
        lessonContent.push({ text: 'Objectives', style: 'subheading' });
        lessonContent.push({ ul: lesson.objectives || [] });
        lessonContent.push({ text: `Time Allotment: ${lesson.time_allotment}`, margin: [0, 5, 0, 10] });
        (lesson.lesson_plan || []).forEach(phase => {
          lessonContent.push({ text: `${phase.phase} (${phase.time})`, style: 'subheading' });
          lessonContent.push(convertMarkdown(phase.teacher_instructions));
          if (phase.activity) {
            lessonContent.push({ text: `Activity: ${phase.activity.title}`, style: 'bold', margin: [0, 8, 0, 2] });
            lessonContent.push(convertMarkdown(phase.activity.instructions));
            if (phase.activity.materials_needed?.length > 0) {
              lessonContent.push({ text: 'Materials Needed:', style: 'bold', margin: [0, 5, 0, 2] });
              lessonContent.push({ ul: phase.activity.materials_needed });
            }
          }
        });
        if (lesson.notes_for_teachers) {
          lessonContent.push({ text: 'Notes for Teachers', style: 'subheading' });
          lessonContent.push(convertMarkdown(lesson.notes_for_teachers));
        }
        content.push({ stack: lessonContent, alignment: 'justify' });
      }
      const docDefinition = {
        pageSize: "Folio",
        pageMargins: [72, 100, 72, 100],
        header: { margin: [0, 20, 0, 0], stack: [{ image: "headerImg", width: 450, alignment: "center" }] },
        footer: { margin: [0, 0, 0, 20], stack: [{ image: "footerImg", width: 450, alignment: "center" }] },
        defaultStyle: pdfStyles.default,
        styles: pdfStyles,
        content: content,
        images: {
          headerImg: "https://i.ibb.co/xt5CY6GY/header-port.png",
          footerImg: "https://i.ibb.co/kgrMBfDr/Footer.png"
        }
      };
      pdfMake.createPdf(docDefinition).download(`${lessonTitle}.pdf`, () => setExportingPdfId(null));
    } catch (error) {
      console.error(error);
      setExportingPdfId(null);
    }
  };

  const saveRecommendationToFirestore = async (analysis, remediation) => {
    if (!selectedClassId || !selectedQuizId) return;
    setIsSaving(true);
    try {
      const quizDoc = quizzesInClass.find((q) => q.id === selectedQuizId);
      await addDoc(collection(db, "recommendations"), {
        classId: selectedClassId,
        unitId: quizDoc?.unitId || null,
        lessonId: quizDoc?.lessonId || null,
        unitTitle: quizDoc?.unitId ? unitsMap[quizDoc.unitId] || "" : "",
        lessonTitle: lessonData?.title || quizDoc?.lessonTitle || "",
        quizId: selectedQuizId,
        narrative_report: analysis.narrative_report,
        recommendation_action: analysis.recommendation_action,
        recommendations: remediation,
        createdAt: serverTimestamp(),
      });
      // Re-fetch to update UI
      const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId));
      const snap = await getDocs(q);
      setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsPreviewModalOpen(false);
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const deleteRecommendation = async (recDoc) => {
    if (!recDoc || !confirm("Delete?")) return;
    await deleteDoc(doc(db, "recommendations", recDoc.id));
    setSavedRecs((prev) => prev.filter((r) => r.id !== recDoc.id));
  };

  const groupedSavedRecs = useMemo(() => {
    const map = {};
    (savedRecs || []).forEach((r) => {
      const unit = r.unitTitle || "Uncategorized";
      if (!map[unit]) map[unit] = [];
      map[unit].push(r);
    });
    Object.keys(map).forEach((u) => map[u].sort((a, b) => (a.lessonTitle || "").localeCompare(b.lessonTitle || "")));
    return map;
  }, [savedRecs]);

  const quarterOptions = [
    { value: "", label: "-- Select Quarter --" },
    { value: "1", label: "Quarter 1" },
    { value: "2", label: "Quarter 2" },
    { value: "3", label: "Quarter 3" },
    { value: "4", label: "Quarter 4" },
  ];

  return (
    <div className={commonContainerClasses}>
      <div className={dynamicStyles.container}>
        {/* Header Bar */}
        <div className={dynamicStyles.header}>
          <div className="flex flex-col">
            <h1 className={`${headingStyle} text-2xl sm:text-3xl ${monet ? monet.textMain : 'text-slate-900 dark:text-white'}`}>Analytics Center</h1>
            <span className={`text-xs mt-1 font-medium tracking-wide ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>Real-time Performance & Insights</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* --- SIDEBAR --- */}
          <div className={dynamicStyles.sidebar}>
            {/* Class Selector */}
            <div className={dropdownContainer}>
              <div className={`${subHeadingStyle} mb-2 ml-1 ${monet ? monet.textSub : 'text-slate-400 dark:text-slate-500'}`}>Select Class</div>
              <button onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} className={dynamicStyles.dropdownBtn}>
                <span className="truncate">{selectedClass ? selectedClass.name : "Choose Class"}</span>
                <IconChevronDown className={`w-4 h-4 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''} ${monet ? 'text-white/50' : 'text-slate-400 dark:text-slate-500'}`} />
              </button>
              <AnimatePresence>
                {isClassDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={dynamicStyles.dropdownList}>
                    <button onClick={() => { setSelectedClassId(""); setIsClassDropdownOpen(false); }} className={`${dropdownItem} ${!selectedClassId ? (monet ? monet.dropdownItemActive : activeDropdownItem) : (monet ? monet.dropdownItemInactive : inactiveDropdownItem)}`}>None</button>
                    {activeClasses.map((cls) => (
                      <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setSelectedQuizId(""); setIsClassDropdownOpen(false); }} className={`${dropdownItem} ${selectedClassId === cls.id ? (monet ? monet.dropdownItemActive : activeDropdownItem) : (monet ? monet.dropdownItemInactive : inactiveDropdownItem)}`}>{cls.name}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Tabs (Horizontal on Mobile, Vertical on Desktop) */}
            <div className="flex flex-col gap-2">
              <div className={`${subHeadingStyle} mb-1 ml-1 ${monet ? monet.textSub : 'text-slate-400 dark:text-slate-500'} hidden sm:block`}>Analysis Tools</div>
              <div className="flex flex-row sm:flex-col gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 -mx-5 px-5 sm:mx-0 sm:px-0">
                <button onClick={() => setAnalysisType("students")} className={`${panelButton} ${analysisType === "students" ? (monet ? monet.activeTab : activePanelButton) : (monet ? monet.inactiveTab : inactivePanelButton)}`}>
                  <IconAlertTriangle size={18} className={analysisType === "students" ? "text-white" : (monet ? "text-white/60" : "text-amber-500")} /> <span className="whitespace-nowrap">At-Risk Students</span>
                </button>
                <button onClick={() => setAnalysisType("quizzes")} className={`${panelButton} ${analysisType === "quizzes" ? (monet ? monet.activeTab : activePanelButton) : (monet ? monet.inactiveTab : inactivePanelButton)}`}>
                  <IconChartBar size={18} className={analysisType === "quizzes" ? "text-white" : (monet ? "text-white/60" : "text-sky-500")} /> <span className="whitespace-nowrap">Quiz Analysis</span>
                </button>
                <button onClick={() => setAnalysisType("recommendations")} className={`${panelButton} ${analysisType === "recommendations" ? (monet ? monet.activeTab : activePanelButton) : (monet ? monet.inactiveTab : inactivePanelButton)}`}>
                  <IconBrain size={18} className={analysisType === "recommendations" ? "text-white" : (monet ? "text-white/60" : "text-emerald-500")} /> <span className="whitespace-nowrap">Recommendations</span>
                </button>
              </div>
            </div>

            {/* Contextual Sidebar Content */}
            <div className="flex-1 flex flex-col gap-4 sm:pr-2">
              {analysisType === "students" && selectedClassId && (
                <div className={dropdownContainer}>
                  <div className={`${subHeadingStyle} mb-2 ml-1 ${monet ? monet.textSub : 'text-slate-400 dark:text-slate-500'}`}>Quarter Filter</div>
                  <button onClick={() => setIsQuarterDropdownOpen(!isQuarterDropdownOpen)} className={dynamicStyles.dropdownBtn}>
                    <span>{(quarterOptions.find(q => q.value === selectedQuarter) || quarterOptions[0]).label}</span>
                    <IconChevronDown className={`w-4 h-4 transition-transform ${isQuarterDropdownOpen ? 'rotate-180' : ''} ${monet ? 'text-white/50' : 'opacity-50'}`} />
                  </button>
                  <AnimatePresence>
                    {isQuarterDropdownOpen && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }} className={dynamicStyles.dropdownList}>
                        {quarterOptions.map((opt) => (
                          <button key={opt.value} onClick={() => { setSelectedQuarter(opt.value); setIsQuarterDropdownOpen(false); }} className={`${dropdownItem} ${selectedQuarter === opt.value ? (monet ? monet.dropdownItemActive : activeDropdownItem) : (monet ? monet.dropdownItemInactive : inactiveDropdownItem)}`}>{opt.label}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {analysisType === "quizzes" && selectedClassId && (
                <div className="space-y-1">
                  <div className={`${subHeadingStyle} mb-3 ml-1 ${monet ? monet.textSub : 'text-slate-400 dark:text-slate-500'}`}>Available Quizzes</div>
                  {Object.keys(quizzesInClass.reduce((acc, quiz) => {
                    const unitName = quiz.unitDisplayName || "Uncategorized";
                    if (!acc[unitName]) acc[unitName] = [];
                    acc[unitName].push(quiz);
                    return acc;
                  }, {})).sort(customUnitSort).map((unitName) => (
                    <div key={unitName} className="mb-2">
                      <button onClick={() => setOpenUnit(openUnit === unitName ? null : unitName)} className={`flex items-center justify-between w-full py-2 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wide transition-colors ${monet ? 'text-white/60 hover:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'}`}>
                        {unitName} <IconChevronDown size={14} className={`transition-transform ${openUnit === unitName ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {openUnit === unitName && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`overflow-hidden ml-2 space-y-1 border-l pl-2 ${monet ? 'border-white/10' : 'border-slate-200 dark:border-slate-800'}`}>
                            {quizzesInClass.filter((q) => (q.unitDisplayName || "Uncategorized") === unitName).sort((a, b) => a.title.localeCompare(b.title)).map((q) => (
                              <button key={q.id} onClick={() => setSelectedQuizId(q.id)} className={`text-[13px] sm:text-sm w-full text-left px-3 py-2.5 rounded-xl transition-all ${selectedQuizId === q.id ? (monet ? `bg-white/20 text-white font-semibold` : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold') : (monet ? 'text-white/70 hover:bg-white/5' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50')}`}>{q.title}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- MAIN CONTENT --- */}
          <motion.div
            key={analysisType}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 p-6 sm:p-10 overflow-y-auto custom-scrollbar relative"
          >
            {(isAnalyzing || isGeneratingRemediation) && (
              <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm rounded-[2rem] ${monet ? 'bg-black/40 text-white' : 'bg-white/80'}`}>
                <Spinner size="xl" />
                <span className={`mt-4 font-medium animate-pulse ${monet ? 'text-white' : 'text-slate-600'}`}>{isGeneratingRemediation ? "Designing Personalized Remediation..." : "Analyzing..."}</span>
              </div>
            )}

            {!selectedClassId && (
              <div className={`h-full flex flex-col items-center justify-center text-center opacity-60 ${monet ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 ${monet ? 'bg-white/10' : 'bg-slate-100 dark:bg-white/5'}`}><IconAnalyze size={48} className={monet ? "text-white/50" : "text-slate-400 dark:text-slate-500"} /></div>
                <h2 className={`text-xl font-bold ${monet ? 'text-white' : 'text-slate-700 dark:text-white'}`}>No Class Selected</h2>
                <p className={`${monet ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'} mt-2 max-w-xs`}>Select a class from the sidebar to begin analyzing student performance.</p>
              </div>
            )}

            {selectedClassId && analysisType === "students" && (
              <div className="space-y-6 sm:space-y-8 pb-10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-white font-display'}`}>At-Risk Students</h2>
                  <span className={`text-[13px] sm:text-sm font-semibold px-3 py-1 rounded-full ${monet ? 'bg-white/10 text-white/80' : 'bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>Threshold: &lt; 75% Avg</span>
                </div>

                {isLoading ? <StudentsSkeleton /> : selectedQuarter ? (
                  atRiskByQuarter[selectedQuarter]?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {atRiskByQuarter[selectedQuarter].map((st) => (
                        <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }} key={st.id} className={`${dynamicStyles.card} p-5 sm:p-6 relative overflow-hidden group`}>
                          {/* Top Red Glow Accent */}
                          <div className={`absolute top-0 left-0 right-0 h-1.5 ${monet ? 'bg-red-500/50' : 'bg-gradient-to-r from-red-500 to-rose-400'}`} />

                          <div className="flex items-start gap-4 sm:gap-5 relative z-10">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${monet ? 'bg-red-500/20 text-red-300' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                              <IconAlertTriangle size={24} stroke={2.5} />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <h3 className={`font-bold text-base block truncate ${monet ? monet.textMain : 'text-slate-800 dark:text-slate-100'}`} title={st.name}>{st.name}</h3>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {st.reasons.map((r, i) => <span key={i} className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${monet ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>{r}</span>)}
                              </div>
                            </div>
                          </div>

                          {/* Decorative Background Blob */}
                          <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${monet ? 'bg-red-500/10' : 'bg-red-500/5 dark:bg-red-500/10'}`} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${dynamicStyles.card} p-12 flex flex-col items-center justify-center text-center mt-8`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${monet ? 'bg-emerald-500/20 shadow-emerald-900/20' : 'bg-emerald-50 dark:bg-emerald-500/10 shadow-emerald-500/5'}`}>
                        <IconCheck size={40} stroke={2.5} className={monet ? "text-emerald-300" : "text-emerald-500 dark:text-emerald-400"} />
                      </div>
                      <h3 className={`text-xl font-bold font-display tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-slate-100'}`}>All Clear!</h3>
                      <p className={`${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'} mt-2 max-w-sm font-medium`}>Excellent work! No students are flagged as at-risk for this quarter.</p>
                    </motion.div>
                  )
                ) : <div className={`${dynamicStyles.card} p-12 text-center mt-8`}><span className={`font-semibold ${monet ? 'text-white/50' : 'text-slate-400 dark:text-slate-500'}`}>Please select a quarter from the sidebar to view analysis.</span></div>}
              </div>
            )}

            {selectedClassId && analysisType === "quizzes" && (
              <div className="space-y-6 sm:space-y-8 pb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-white font-display'}`}>Item Analysis</h2>
                  {selectedQuizId && itemAnalysisData && !isLoading && (
                    <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                      <button onClick={exportItemAnalysisToCSV} className={`${baseButtonStyles} px-5 py-2.5 sm:py-3 text-[13px] sm:text-sm ${monet ? monet.buttonSecondary : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <IconDownload size={18} /> CSV
                      </button>
                      <button onClick={generateAnalysisReport} disabled={isAnalyzing} className={`${baseButtonStyles} px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm ${monet ? monet.buttonPrimary : 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 border-0'}`}>
                        <IconAnalyze size={18} /> AI Analysis
                      </button>
                    </div>
                  )}
                </div>

                {isLoading ? <TableSkeleton /> : selectedQuizId && itemAnalysisData && itemAnalysisData.length > 0 ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${dynamicStyles.card} overflow-hidden`}>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-sm text-left whitespace-nowrap sm:whitespace-normal">
                        <thead className={`text-xs font-bold uppercase tracking-wider ${monet ? monet.tableHeader : 'text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800'}`}>
                          <tr>
                            <th className="px-6 py-5">Question Statement</th>
                            <th className="px-6 py-5 text-center">Class Performance</th>
                            <th className="px-6 py-5 text-right rounded-tr-3xl">Mastery Index</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${monet ? 'divide-white/5' : 'divide-slate-200/50 dark:divide-slate-800/50'}`}>
                          {itemAnalysisData.map((item, i) => {
                            const percent = parseInt(item.difficulty, 10);
                            return (
                              <React.Fragment key={i}>
                                <tr className={`${monet ? monet.tableRow : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'} transition-colors group`}>
                                  <td className={`px-6 py-4 font-semibold max-w-md ${monet ? monet.textMain : 'text-slate-800 dark:text-slate-200'}`}>
                                    <div className="line-clamp-2 leading-relaxed">{item.type === "matching-type" ? "Matching Question Cluster" : item.question}</div>
                                    {item.type === "matching-type" && (
                                      <button onClick={() => setExpandedRows(p => ({ ...p, [i]: !p[i] }))} className={`text-[11px] uppercase tracking-wider font-bold mt-2 hover:underline inline-flex items-center gap-1 ${monet ? monet.accentColor : 'text-blue-500 dark:text-blue-400'}`}>
                                        {expandedRows[i] ? "Hide Breakdown" : "View Breakdown"}
                                        <IconChevronDown size={14} className={`transition-transform ${expandedRows[i] ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold font-mono tracking-widest ${monet ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                                      {item.correct} / {item.total}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`inline-block px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider ${percent >= 75 ? (monet ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20") : (monet ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30" : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/20")}`}>
                                      {item.difficulty}
                                    </span>
                                  </td>
                                </tr>
                                {item.type === "matching-type" && expandedRows[i] && (
                                  <tr className={monet ? "bg-white/[0.02]" : "bg-slate-50/30 dark:bg-slate-800/20"}>
                                    <td colSpan={3} className="px-6 py-5 border-t border-slate-100 dark:border-slate-800/50">
                                      <div className="grid gap-3 max-w-2xl">
                                        {item.breakdown.map((p, idx) => (
                                          <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between text-xs p-3 rounded-xl border ${monet ? 'bg-white/5 border-white/10' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm gap-2 sm:gap-4'}`}>
                                            <span className={`font-medium ${monet ? monet.textSub : "text-slate-600 dark:text-slate-400"}`}>{p.promptText}</span>
                                            <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 min-w-max">
                                              <span className={`font-semibold ${p.isCorrect ? (monet ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-500") : (monet ? "text-rose-400" : "text-rose-600 dark:text-rose-500")}`}>{p.studentChoice || "No Answer"}</span>
                                              <span className={monet ? "text-white/30" : "text-slate-300 dark:text-slate-600"}>→</span>
                                              <span className={`font-bold ${monet ? monet.textMain : "text-slate-800 dark:text-slate-200"}`}>{p.correctChoice}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : <div className={`${dynamicStyles.card} p-12 text-center mt-8`}><span className={`font-semibold ${monet ? 'text-white/50' : 'text-slate-400 dark:text-slate-500'}`}>Select a quiz from the sidebar to analyze item performance.</span></div>}
              </div>
            )}

            {selectedClassId && analysisType === "recommendations" && (
              <div className="space-y-6 sm:space-y-8 pb-10">
                <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-white font-display'}`}>Saved Recommendations</h2>

                {isLoading ? <RecommendationsSkeleton /> : Object.keys(groupedSavedRecs).length === 0 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${dynamicStyles.card} p-12 flex flex-col items-center justify-center text-center mt-8`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${monet ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <IconBookmarks size={40} stroke={2} className={`${monet ? 'text-white/50' : 'text-slate-400 dark:text-slate-500'}`} />
                    </div>
                    <h3 className={`text-xl font-bold font-display tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-slate-100'}`}>No Recommendations</h3>
                    <p className={`${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'} mt-2 max-w-sm font-medium`}>Run an AI Analysis on a quiz to generate and save remediation strategies here.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {Object.keys(groupedSavedRecs).sort(customUnitSort).map((unitTitle) => (
                      <div key={unitTitle} className={`${dynamicStyles.card} overflow-hidden`}>
                        <button onClick={() => setOpenRecsUnit(openRecsUnit === unitTitle ? null : unitTitle)} className={`w-full flex justify-between items-center px-6 py-4 border-b transition-colors ${monet ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                          <span className={`font-bold text-sm sm:text-base tracking-wide ${monet ? monet.textMain : 'text-slate-800 dark:text-slate-200'}`}>{unitTitle}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${monet ? 'bg-white/10' : 'bg-white dark:bg-slate-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]'} ${openRecsUnit === unitTitle ? (monet ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600') : ''}`}>
                            <IconChevronDown className={`transition-transform duration-300 ${openRecsUnit === unitTitle ? "rotate-180" : ""} ${monet ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} size={18} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {openRecsUnit === unitTitle && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-white dark:bg-slate-950/30">
                              <div className="p-4 space-y-3">
                                {groupedSavedRecs[unitTitle].map((recDoc) => (
                                  <div key={recDoc.id} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl transition-all border ${monet ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 shadow-sm hover:shadow-md'}`}>
                                    <div onClick={() => { setViewingRec(recDoc); setViewModalOpen(true); }} className="flex-1 cursor-pointer mb-4 sm:mb-0">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${monet ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                          <IconBrain size={20} />
                                        </div>
                                        <div>
                                          <h4 className={`font-bold text-sm sm:text-base ${monet ? monet.textMain : 'text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'}`}>{recDoc.lessonTitle || "Remediation Plan"}</h4>
                                          <span className={`text-xs font-medium ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>Generated: {recDoc.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                                      <button onClick={() => exportRecToPDF(recDoc)} className={`${baseButtonStyles} p-2.5 rounded-full border ${monet ? monet.buttonSecondary : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700 shadow-sm'}`} disabled={exportingPdfId === recDoc.id} title="Export to PDF">
                                        {exportingPdfId === recDoc.id ? <Spinner size="xs" /> : <IconFileExport size={16} stroke={2} />}
                                      </button>
                                      <button onClick={() => { setEditingRec(recDoc); setEditModalOpen(true); }} className={`${baseButtonStyles} p-2.5 rounded-full border ${monet ? monet.buttonSecondary : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-amber-600 dark:hover:text-amber-400 border-slate-200 dark:border-slate-700 shadow-sm'}`} title="Edit Recommendation">
                                        <IconEdit size={16} stroke={2} />
                                      </button>
                                      <button onClick={() => deleteRecommendation(recDoc)} className={`${baseButtonStyles} p-2.5 rounded-full border ${monet ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/40' : 'text-red-500 dark:text-red-400 hover:text-red-700 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 shadow-sm'}`} title="Delete">
                                        <IconTrash size={16} stroke={2} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <style>{`.font-display { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; } .custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 10px; }`}</style>
      <AnalysisReportModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} analysisResult={analysisResult} onGenerate={generateRemediationPlan} isLoading={isGeneratingRemediation} />
      <RemediationPreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} remediationData={generatedRemediation} onSave={() => saveRecommendationToFirestore(analysisResult, generatedRemediation)} isSaving={isSaving} />
      <ViewRecommendationModal isOpen={viewModalOpen} onClose={() => { setViewModalOpen(false); setViewingRec(null); }} recDoc={viewingRec} />
      <EditRecommendationModal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingRec(null); }} recDoc={editingRec} onSaveSuccess={async () => { if (selectedClassId) { const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId)); const snap = await getDocs(q); setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); } setEditModalOpen(false); setEditingRec(null); }} />
    </div>
  );
};

export default AnalyticsView;