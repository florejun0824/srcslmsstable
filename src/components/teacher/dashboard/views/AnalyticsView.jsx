// AnalyticsView.jsx
import React, { useState, useEffect, useMemo } from "react";
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

// PDF export imports
import pdfMake from "pdfmake/build/pdfmake.min";
import "pdfmake/build/vfs_fonts";
import htmlToPdfmake from "html-to-pdfmake";
import { marked } from "marked";

// --- MONET STYLE HELPER ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay) return null;

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
            return {
                ...styles,
                container: `${baseGlass} bg-[#0f172a]/80 border-emerald-500/20 shadow-emerald-900/10`,
                card: "bg-[#0f172a]/60 border-emerald-500/20",
                buttonPrimary: "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-emerald-900/20",
                buttonSecondary: "bg-emerald-900/40 text-emerald-100 border-emerald-500/30 hover:bg-emerald-800/50",
                activeTab: "bg-emerald-600 text-white shadow-md",
                accentColor: "text-emerald-400"
            };
        case 'valentines':
            return {
                ...styles,
                container: `${baseGlass} bg-[#2c0b0e]/80 border-rose-500/20 shadow-rose-900/10`,
                card: "bg-[#2c0b0e]/60 border-rose-500/20",
                buttonPrimary: "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-rose-900/20",
                buttonSecondary: "bg-rose-900/40 text-rose-100 border-rose-500/30 hover:bg-rose-800/50",
                activeTab: "bg-rose-600 text-white shadow-md",
                accentColor: "text-rose-400"
            };
        case 'graduation':
            return {
                ...styles,
                container: `${baseGlass} bg-[#1a1400]/80 border-amber-500/20 shadow-amber-900/10`,
                card: "bg-[#1a1400]/60 border-amber-500/20",
                buttonPrimary: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-amber-900/20",
                buttonSecondary: "bg-amber-900/40 text-amber-100 border-amber-500/30 hover:bg-amber-800/50",
                activeTab: "bg-amber-600 text-white shadow-md",
                accentColor: "text-amber-400"
            };
        case 'rainy':
            return {
                ...styles,
                container: `${baseGlass} bg-[#061816]/80 border-teal-500/20 shadow-teal-900/10`,
                card: "bg-[#061816]/60 border-teal-500/20",
                buttonPrimary: "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-teal-900/20",
                buttonSecondary: "bg-teal-900/40 text-teal-100 border-teal-500/30 hover:bg-teal-800/50",
                activeTab: "bg-teal-600 text-white shadow-md",
                accentColor: "text-teal-400"
            };
        case 'cyberpunk':
            return {
                ...styles,
                container: `${baseGlass} bg-[#180a20]/80 border-fuchsia-500/20 shadow-fuchsia-900/10`,
                card: "bg-[#180a20]/60 border-fuchsia-500/20",
                buttonPrimary: "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-fuchsia-900/20",
                buttonSecondary: "bg-fuchsia-900/40 text-fuchsia-100 border-fuchsia-500/30 hover:bg-fuchsia-800/50",
                activeTab: "bg-fuchsia-600 text-white shadow-md",
                accentColor: "text-fuchsia-400"
            };
        case 'spring':
            return {
                ...styles,
                container: `${baseGlass} bg-[#1f0f15]/80 border-pink-500/20 shadow-pink-900/10`,
                card: "bg-[#1f0f15]/60 border-pink-500/20",
                buttonPrimary: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-900/20",
                buttonSecondary: "bg-pink-900/40 text-pink-100 border-pink-500/30 hover:bg-pink-800/50",
                activeTab: "bg-pink-500 text-white shadow-md",
                accentColor: "text-pink-400"
            };
        case 'space':
            return {
                ...styles,
                container: `${baseGlass} bg-[#020617]/80 border-indigo-500/20 shadow-indigo-900/10`,
                card: "bg-[#020617]/60 border-indigo-500/20",
                buttonPrimary: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-900/20",
                buttonSecondary: "bg-indigo-900/40 text-indigo-100 border-indigo-500/30 hover:bg-indigo-800/50",
                activeTab: "bg-indigo-600 text-white shadow-md",
                accentColor: "text-indigo-400"
            };
        default:
            return null;
    }
};

// --- OPTIMIZED DESIGN SYSTEM ---

// 1. Layout & Backgrounds
const commonContainerClasses = "relative h-full w-full p-4 sm:p-6 font-sans overflow-hidden selection:bg-blue-500/30";

// 2. Typography
const headingStyle = "font-display font-bold tracking-tight";
const subHeadingStyle = "font-bold tracking-wide uppercase text-[0.65rem] letter-spacing-1";

// 3. Dropdowns
const dropdownContainer = "relative z-[60]";
const dropdownItem = "block w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors duration-200";
const activeDropdownItem = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold';
const inactiveDropdownItem = 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5';

// 4. Buttons (Base)
const baseButtonStyles = `
    relative font-semibold rounded-full transition-all duration-200 
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
`;

// 5. Side Panel Buttons
const panelButton = `
    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm group relative overflow-hidden
`;
const activePanelButton = 'text-white bg-[#007AFF] shadow-md';
const inactivePanelButton = 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200';

// --- SKELETAL COMPONENTS ---

const SkeletonPulse = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />
);

const StudentsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`p-5 border-l-4 border-transparent h-32 flex flex-col justify-between bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm`}>
                <div className="flex items-center gap-4">
                    <SkeletonPulse className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <SkeletonPulse className="h-4 w-3/4" />
                        <SkeletonPulse className="h-3 w-1/2" />
                    </div>
                </div>
                <SkeletonPulse className="h-6 w-24 rounded-md self-start" />
            </div>
        ))}
    </div>
);

const TableSkeleton = () => (
    <div className={`overflow-hidden bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm`}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex gap-4">
             <SkeletonPulse className="h-4 w-32" />
             <SkeletonPulse className="h-4 w-20" />
        </div>
        <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between px-2">
                    <SkeletonPulse className="h-4 w-1/2" />
                    <div className="flex gap-4">
                         <SkeletonPulse className="h-6 w-12 rounded-full" />
                         <SkeletonPulse className="h-6 w-16 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const RecommendationsSkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className={`h-16 flex items-center px-6 gap-4 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm`}>
                 <SkeletonPulse className="h-4 w-1/3" />
                 <div className="flex-1" />
                 <SkeletonPulse className="h-8 w-8 rounded-full" />
                 <SkeletonPulse className="h-8 w-8 rounded-full" />
            </div>
        ))}
    </div>
);

// (Utility functions)
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
const fetchUnitsInBatches = async (unitIds) => {
  if (!unitIds || unitIds.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < unitIds.length; i += 30) chunks.push(unitIds.slice(i, i + 30));
  const fetchPromises = chunks.map((chunk) => getDocs(query(collection(db, "units"), where("__name__", "in", chunk))));
  const snapshots = await Promise.all(fetchPromises);
  const unitsMap = {};
  snapshots.forEach((snap) => snap.docs.forEach((d) => (unitsMap[d.id] = d.data().title)));
  return unitsMap;
};
const fetchLessonsInBatches = async (lessonIds) => {
  if (!lessonIds || lessonIds.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < lessonIds.length; i += 30) chunks.push(lessonIds.slice(i, i + 30));
  const fetchPromises = chunks.map((chunk) => getDocs(query(collection(db, "lessons"), where("__name__", "in", chunk))));
  const snapshots = await Promise.all(fetchPromises);
  const lessonsMap = {};
  snapshots.forEach((snap) => snap.docs.forEach((d) => (lessonsMap[d.id] = { id: d.id, ...d.data() })));
  return lessonsMap;
};

const AnalyticsView = ({ activeClasses }) => {
  // --- State ---
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

  const selectedClass = activeClasses.find((c) => c.id === selectedClassId);
  
  // Theme Integration
  const { activeOverlay } = useTheme();
  const monet = getMonetStyles(activeOverlay);

  // Dynamic Styles based on Monet or Default
  const containerClasses = monet 
        ? `relative z-10 h-full flex flex-col rounded-[2rem] overflow-hidden ${monet.container}`
        : "relative z-10 h-full flex flex-col bg-white dark:bg-[#1A1D24] rounded-[2rem] shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all duration-300";

  const headerClasses = monet
        ? "flex items-center justify-between p-6 sm:px-8 border-b border-white/10 z-20 sticky top-0"
        : "flex items-center justify-between p-6 sm:px-8 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#1A1D24]/95 z-20 sticky top-0";

  const sidebarClasses = monet
        ? "w-full md:w-72 lg:w-80 flex flex-col border-r border-white/10 p-4 sm:p-6 gap-6 overflow-y-auto z-20 custom-scrollbar"
        : "w-full md:w-72 lg:w-80 flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1A1D24] p-4 sm:p-6 gap-6 overflow-y-auto z-20 custom-scrollbar";

  const dropdownBtnClass = monet
        ? `w-full flex justify-between items-center px-4 py-3 rounded-xl shadow-sm transition-all text-sm font-medium ${monet.buttonSecondary} border-transparent`
        : `w-full flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-slate-700 dark:text-slate-200 font-medium text-sm`;

  const dropdownListClass = monet
        ? `absolute top-full left-0 mt-2 w-full rounded-xl shadow-xl z-[70] overflow-hidden p-1 max-h-60 overflow-y-auto custom-scrollbar ${monet.dropdown}`
        : `absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#252525] rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 z-[70] overflow-hidden p-1 max-h-60 overflow-y-auto custom-scrollbar`;

  const cardClass = monet
        ? `rounded-2xl border shadow-sm ${monet.card}`
        : `bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm`;

  // --- Effects ---
  useEffect(() => {
    const loadClassQuizzes = async () => {
      if (!selectedClass) {
        setQuizzesInClass([]);
        setUnitsMap({});
        setLessonsMap({});
        setAtRiskByQuarter({}); 
        setItemAnalysisData(null); 
        setSelectedQuizId(""); 
        return;
      }
      setIsLoading(true);

      setAtRiskByQuarter({});
      setItemAnalysisData(null);
      setSelectedQuizId("");
      setAnalysisResult(null);
      setGeneratedRemediation(null);

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
        quizzesData = quizzesData.map((q) => ({
          ...q,
          unitDisplayName: q.unitId ? unitsFetched[q.unitId] || "Uncategorized" : "Uncategorized",
          lessonTitle: q.lessonId ? lessonsFetched[q.lessonId]?.title || "" : "",
        }));
        setUnitsMap(unitsFetched);
        setLessonsMap(lessonsFetched);
        setQuizzesInClass(quizzesData);
      } catch (err) {
        console.error("Error loading class quizzes:", err);
        setQuizzesInClass([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadClassQuizzes();
  }, [selectedClassId, activeClasses, selectedClass]); 

  useEffect(() => {
    const loadAtRiskData = async () => {
      if (analysisType !== "students" || !selectedClassId || !selectedClass?.students || !quizzesInClass) {
        setAtRiskByQuarter({});
        return;
      }
      setIsLoading(true);
      try {
        const quarterGroups = { 1: [], 2: [], 3: [], 4: [] };
        const allSubsQ = query(collection(db, "quizSubmissions"), where("classId", "==", selectedClassId));
        const allSubsSnap = await getDocs(allSubsQ);
        const subsByStudent = {};
        allSubsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (!data.studentId) return;
          if (!subsByStudent[data.studentId]) subsByStudent[data.studentId] = [];
          subsByStudent[data.studentId].push(data);
        });
        for (const student of selectedClass.students) {
          const studentName = student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.name || student.id || "Unnamed Student";
          const studentId = student.id || student.userId || student.uid;
          if (!studentId) continue;
          const studentSubmissions = subsByStudent[studentId] || [];
          const firstAttemptsPerQuiz = {};
          studentSubmissions.forEach((data) => {
            const submittedAt = data.submittedAt?.seconds ? data.submittedAt.seconds : new Date(data.submittedAt).getTime() / 1000;
            if (!firstAttemptsPerQuiz[data.quizId] || submittedAt < firstAttemptsPerQuiz[data.quizId].submittedAt) {
              firstAttemptsPerQuiz[data.quizId] = { ...data, submittedAt };
            }
          });
          const quarterScores = { 1: [], 2: [], 3: [], 4: [] };
          Object.values(firstAttemptsPerQuiz).forEach((attempt) => {
            const quiz = quizzesInClass.find((q) => q.id === attempt.quizId);
            const quarter = attempt.quarter || quiz?.quarter;
            if (quarter && [1, 2, 3, 4].includes(quarter)) {
              const percent = attempt.totalItems > 0 ? (attempt.score / attempt.totalItems) * 100 : 0;
              quarterScores[quarter].push(percent);
            }
          });
          Object.keys(quarterScores).forEach((q) => {
            const scores = quarterScores[q];
            if (scores.length > 0) {
              const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
              if (avg < 75) quarterGroups[q].push({ id: studentId, name: studentName, reasons: [`Quarter ${q}: Avg ${avg.toFixed(0)}%`] });
            }
          });
        }
        setAtRiskByQuarter(quarterGroups);
      } catch (err) {
        console.error("Error loading at-risk data:", err);
        setAtRiskByQuarter({});
      } finally {
        setIsLoading(false);
      }
    };
    loadAtRiskData();
  }, [analysisType, selectedClassId, selectedClass, quizzesInClass]); 

  useEffect(() => {
    const analyzeQuizData = async () => {
      if (!selectedQuizId) {
        setItemAnalysisData(null);
        setLessonData(null);
        return;
      }
      setIsLoading(true);
      setAnalysisResult(null);
      setGeneratedRemediation(null);
      const subsQ = query(collection(db, "quizSubmissions"), where("quizId", "==", selectedQuizId), where("classId", "==", selectedClassId));
      const subsSnap = await getDocs(subsQ);
      const submissions = subsSnap.docs.map((d) => d.data());
      if (submissions.length === 0) {
        setItemAnalysisData([]);
        setIsLoading(false);
        return;
      }
      const firstAttempts = {};
      submissions.forEach((sub) => {
        const submittedAt = sub.submittedAt?.seconds ? sub.submittedAt.seconds : new Date(sub.submittedAt).getTime() / 1000;
        if (!firstAttempts[sub.studentId] || submittedAt < firstAttempts[sub.studentId].submittedAt) {
          firstAttempts[sub.studentId] = { ...sub, submittedAt };
        }
      });
      const uniqueSubmissions = Object.values(firstAttempts);
      const questionAnalysis = {};
      uniqueSubmissions.forEach((submission) => {
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
      const quizDoc = quizzesInClass.find((q) => q.id === selectedQuizId);
      if (quizDoc?.lessonId) {
        try {
          const lessonRef = doc(db, "lessons", quizDoc.lessonId);
          const lessonSnap = await getDoc(lessonRef);
          if (lessonSnap.exists()) setLessonData({ id: lessonSnap.id, ...lessonSnap.data() });
          else setLessonData(null);
        } catch (err) {
          setLessonData(null);
        }
      } else {
        setLessonData(null);
      }
      setIsLoading(false);
    };
    analyzeQuizData();
  }, [selectedQuizId, selectedClassId, quizzesInClass]);

  useEffect(() => {
    const loadSavedRecs = async () => {
      if (!selectedClassId) {
        setSavedRecs([]);
        return;
      }
      const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId));
      const snap = await getDocs(q);
      setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadSavedRecs();
  }, [selectedClassId, isSaving]);

  // --- AI Logic ---
  const generateAnalysisReport = async () => {
    if (!itemAnalysisData) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setGeneratedRemediation(null);
    let rawAiResponse = "";
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
      rawAiResponse = await callGeminiWithLimitCheck(prompt);
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
      if (!analysisResult?.recommendation_action) {
          alert("Error: No analysis result found.");
          return;
      }

      if (!lessonData) {
          alert("Cannot generate remediation plan because this Quiz is not linked to a Lesson content in the database. Please ensure the Quiz has a valid 'lessonId'.");
          return;
      }

      const action = analysisResult.recommendation_action;
      if (action === "NONE") { 
          alert("No remediation needed."); 
          return; 
      }

      const weakItems = itemAnalysisData.filter((i) => {
          const percent = i.total > 0 ? (i.correct / i.total) * 100 : 0;
          return percent < 75;
      });

      if (weakItems.length === 0) {
          const sortedItems = [...itemAnalysisData].sort((a, b) => {
              const perA = a.total > 0 ? (a.correct / a.total) : 0;
              const perB = b.total > 0 ? (b.correct / b.total) : 0;
              return perA - perB;
          });
        
          if(sortedItems.length > 0) {
               console.warn("No items < 75%, utilizing lowest scoring items for remediation context.");
               weakItems.push(...sortedItems.slice(0, 3));
          } else {
               alert("No item analysis data available to base remediation on."); 
               return; 
          }
      }

      setIsGeneratingRemediation(true);
    
      try {
          const lessonLanguage = lessonData?.language || "original language";
          const pages = lessonData?.pages || [];
          const lessonText = pages.length > 0 
              ? pages.map((p) => `${p.title ? p.title + "\n" : ""}${p.content || ""}`).join("\n\n")
              : lessonData.content || "No lesson content found.";

          const weakTopicsString = weakItems.map((item) => `- ${item.question} (Diff: ${item.difficulty})`).join("\n");
        
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
        
          const jsonString = rawAiResponse.substring(firstBracket, lastBracket + 1);
        
          setGeneratedRemediation(JSON.parse(jsonString));
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

  const exportRecToPDF = async (recDoc) => {
    if (!recDoc) return;
    setExportingPdfId(recDoc.id);
    try {
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
        if(content.length > 0) content.push({text: '', pageBreak: 'before'});
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
            if (phase.activity.materials_needed && phase.activity.materials_needed.length > 0) {
              lessonContent.push({ text: 'Materials Needed:', style: 'bold', margin: [0, 5, 0, 2] });
              lessonContent.push({ ul: phase.activity.materials_needed });
            }
          }
        });
        if(lesson.notes_for_teachers){
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
      const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId));
      const snap = await getDocs(q);
      setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsPreviewModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
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

  const openViewModal = (recDoc) => { setViewingRec(recDoc); setViewModalOpen(true); };
  const openEditModal = (recDoc) => { setEditingRec(recDoc); setEditModalOpen(true); };

  const quarterOptions = [
    { value: "", label: "-- Select Quarter --" },
    { value: "1", label: "Quarter 1" },
    { value: "2", label: "Quarter 2" },
    { value: "3", label: "Quarter 3" },
    { value: "4", label: "Quarter 4" },
  ];

  return (
    <div className={commonContainerClasses}>
      {/* NO AuroraBackground */}
      
      <div className={containerClasses}>
        {/* Header Bar */}
        <div className={headerClasses}>
            <div className="flex flex-col">
                <h1 className={`${headingStyle} text-2xl sm:text-3xl ${monet ? monet.textMain : 'text-slate-900 dark:text-white'}`}>Analytics Center</h1>
                <span className={`text-xs mt-1 font-medium tracking-wide ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>Real-time Performance & Insights</span>
            </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* --- SIDEBAR --- */}
            <div className={sidebarClasses}>
                
                {/* Class Selector */}
                <div className={dropdownContainer}>
                  <div className={`${subHeadingStyle} mb-2 ml-1 ${monet ? monet.textSub : 'text-slate-400 dark:text-slate-500'}`}>Select Class</div>
                  <button 
                      onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} 
                      className={dropdownBtnClass}
                  >
                      <span className="truncate">{selectedClass ? selectedClass.name : "Choose Class"}</span>
                      <IconChevronDown className={`w-4 h-4 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''} ${monet ? 'text-white/50' : 'text-slate-400'}`} />
                  </button>
                  <AnimatePresence>
                    {isClassDropdownOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className={dropdownListClass}
                        >
                            <button onClick={() => { setSelectedClassId(""); setIsClassDropdownOpen(false); }} className={`${dropdownItem} ${!selectedClassId ? (monet ? monet.dropdownItemActive : activeDropdownItem) : (monet ? monet.dropdownItemInactive : inactiveDropdownItem)}`}>None</button>
                            {activeClasses.map((cls) => (
                                <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setSelectedQuizId(""); setIsClassDropdownOpen(false); }} className={`${dropdownItem} ${selectedClassId === cls.id ? (monet ? monet.dropdownItemActive : activeDropdownItem) : (monet ? monet.dropdownItemInactive : inactiveDropdownItem)}`}>
                                    {cls.name}
                                </button>
                            ))}
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-col gap-2">
                    <div className={`${subHeadingStyle} mb-1 ml-1 ${monet ? monet.textSub : 'text-slate-400 dark:text-slate-500'}`}>Analysis Tools</div>
                    
                    <button onClick={() => setAnalysisType("students")} className={`${panelButton} ${analysisType === "students" ? (monet ? monet.activeTab : activePanelButton) : (monet ? monet.inactiveTab : inactivePanelButton)}`}>
                        <IconAlertTriangle size={20} className={analysisType === "students" ? "text-white" : (monet ? "text-white/60" : "text-amber-500")} />
                        <span>At-Risk Students</span>
                    </button>
                    <button onClick={() => setAnalysisType("quizzes")} className={`${panelButton} ${analysisType === "quizzes" ? (monet ? monet.activeTab : activePanelButton) : (monet ? monet.inactiveTab : inactivePanelButton)}`}>
                        <IconChartBar size={20} className={analysisType === "quizzes" ? "text-white" : (monet ? "text-white/60" : "text-purple-500")} />
                        <span>Quiz Analysis</span>
                    </button>
                    <button onClick={() => setAnalysisType("recommendations")} className={`${panelButton} ${analysisType === "recommendations" ? (monet ? monet.activeTab : activePanelButton) : (monet ? monet.inactiveTab : inactivePanelButton)}`}>
                        <IconBrain size={20} className={analysisType === "recommendations" ? "text-white" : (monet ? "text-white/60" : "text-emerald-500")} />
                        <span>Recommendations</span>
                    </button>
                </div>

                {/* Contextual Sidebar Content */}
                <div className="flex-1 space-y-4 pr-2">
                    {analysisType === "students" && selectedClassId && (
                        <div className={dropdownContainer}>
                             <div className={`${subHeadingStyle} mb-2 ml-1 ${monet ? monet.textSub : 'text-slate-400 dark:text-slate-500'}`}>Quarter Filter</div>
                             <button onClick={() => setIsQuarterDropdownOpen(!isQuarterDropdownOpen)} className={dropdownBtnClass}>
                                <span>{(quarterOptions.find(q => q.value === selectedQuarter) || quarterOptions[0]).label}</span>
                                <IconChevronDown className={`w-4 h-4 transition-transform ${isQuarterDropdownOpen ? 'rotate-180' : ''} ${monet ? 'text-white/50' : 'opacity-50'}`} />
                             </button>
                             <AnimatePresence>
                                {isQuarterDropdownOpen && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }} className={dropdownListClass}>
                                        {quarterOptions.map((opt) => (
                                            <button key={opt.value} onClick={() => { setSelectedQuarter(opt.value); setIsQuarterDropdownOpen(false); }} className={`${dropdownItem} ${selectedQuarter === opt.value ? (monet ? monet.dropdownItemActive : activeDropdownItem) : (monet ? monet.dropdownItemInactive : inactiveDropdownItem)}`}>
                                                {opt.label}
                                            </button>
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
                                    <button onClick={() => setOpenUnit(openUnit === unitName ? null : unitName)} className={`flex items-center justify-between w-full py-2 px-2 text-xs font-bold uppercase tracking-wide transition-colors ${monet ? 'text-white/60 hover:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-blue-500'}`}>
                                        {unitName}
                                        <IconChevronDown size={14} className={`transition-transform ${openUnit === unitName ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {openUnit === unitName && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`overflow-hidden ml-2 space-y-1 border-l pl-2 ${monet ? 'border-white/10' : 'border-slate-200 dark:border-slate-700'}`}>
                                                {quizzesInClass.filter((q) => (q.unitDisplayName || "Uncategorized") === unitName).sort((a, b) => a.title.localeCompare(b.title)).map((q) => (
                                                    <button key={q.id} onClick={() => setSelectedQuizId(q.id)} className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-all ${selectedQuizId === q.id ? (monet ? `bg-white/20 text-white font-semibold` : 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-900/20 dark:text-blue-300') : (monet ? 'text-white/70 hover:bg-white/5' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5')}`}>
                                                        {q.title}
                                                    </button>
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
                    <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm rounded-[2rem] ${monet ? 'bg-black/40 text-white' : 'bg-white/80 dark:bg-[#1A1D24]/80'}`}>
                        <Spinner size="xl" />
                        <span className={`mt-4 font-medium animate-pulse ${monet ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                            {isGeneratingRemediation ? "Designing Personalized Remediation..." : "Analyzing..."}
                        </span>
                    </div>
                )}

                {!selectedClassId && (
                    <div className={`h-full flex flex-col items-center justify-center text-center opacity-60 ${monet ? 'text-white' : ''}`}>
                         <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 ${monet ? 'bg-white/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                            <IconAnalyze size={48} className={monet ? "text-white/50" : "text-slate-400"} />
                         </div>
                         <h2 className={`text-xl font-bold ${monet ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>No Class Selected</h2>
                         <p className={`${monet ? 'text-white/60' : 'text-slate-500'} mt-2 max-w-xs`}>Select a class from the sidebar to begin analyzing student performance.</p>
                    </div>
                )}

                {selectedClassId && analysisType === "students" && (
                    <div className="space-y-8">
                        <div className="flex items-baseline justify-between">
                            <h2 className={`text-2xl font-bold tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-white'}`}>At-Risk Students</h2>
                            <span className={`text-sm font-medium ${monet ? monet.textSub : 'text-slate-500'}`}>Threshold: &lt; 75% Avg</span>
                        </div>
                        
                        {isLoading ? (
                            <StudentsSkeleton />
                        ) : selectedQuarter ? (
                            atRiskByQuarter[selectedQuarter]?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {atRiskByQuarter[selectedQuarter].map((st) => (
                                        <motion.div whileHover={{ y: -2 }} key={st.id} className={`${cardClass} p-5 border-l-4 border-l-red-500 hover:shadow-md transition-all`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${monet ? 'bg-red-500/20 text-red-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                                                    <IconAlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <h3 className={`font-bold text-base ${monet ? monet.textMain : 'text-slate-800 dark:text-slate-100'}`}>{st.name}</h3>
                                                    <div className="mt-2 space-y-1">
                                                        {st.reasons.map((r, i) => (
                                                            <span key={i} className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${monet ? 'bg-red-500/20 text-red-200' : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300'}`}>
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`${cardClass} p-12 flex flex-col items-center justify-center text-center`}>
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${monet ? 'bg-emerald-500/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                                        <IconCheck size={32} className={monet ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"} />
                                    </div>
                                    <h3 className={`text-lg font-bold ${monet ? monet.textMain : 'text-slate-800 dark:text-white'}`}>All Clear!</h3>
                                    <p className={`${monet ? monet.textSub : 'text-slate-500'} mt-1`}>No students are flagged as at-risk for this quarter.</p>
                                </div>
                            )
                        ) : (
                            <div className={`${cardClass} p-8 text-center opacity-70 ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>Please select a quarter to view analysis.</div>
                        )}
                    </div>
                )}

                {selectedClassId && analysisType === "quizzes" && (
                    <div className="space-y-6">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                             <h2 className={`text-2xl font-bold tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-white'}`}>Item Analysis</h2>
                             {selectedQuizId && itemAnalysisData && !isLoading && (
                                 <div className="flex gap-2">
                                     <button onClick={exportItemAnalysisToCSV} className={`${baseButtonStyles} px-5 py-2.5 text-sm ${monet ? monet.buttonSecondary : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-slate-700'}`}><IconDownload size={16} /> CSV</button>
                                     <button onClick={generateAnalysisReport} disabled={isAnalyzing} className={`${baseButtonStyles} px-5 py-2.5 text-sm ${monet ? monet.buttonPrimary : 'text-white bg-[#007AFF] hover:bg-[#0062cc] shadow-sm'}`}>
                                         <IconAnalyze size={18} /> AI Analysis
                                     </button>
                                 </div>
                             )}
                         </div>

                         {isLoading ? (
                             <TableSkeleton />
                         ) : selectedQuizId && itemAnalysisData && itemAnalysisData.length > 0 ? (
                             <div className={`${cardClass} overflow-hidden`}>
                                 <table className="w-full text-sm text-left">
                                     <thead className={`text-xs font-bold uppercase ${monet ? monet.tableHeader : 'text-slate-500 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-700'}`}>
                                         <tr>
                                             <th className="px-6 py-4">Question</th>
                                             <th className="px-6 py-4 text-center">Performance</th>
                                             <th className="px-6 py-4 text-right">Mastery</th>
                                         </tr>
                                     </thead>
                                     <tbody className={`divide-y ${monet ? 'divide-white/5' : 'divide-slate-100 dark:divide-white/5'}`}>
                                         {itemAnalysisData.map((item, i) => {
                                             const percent = parseInt(item.difficulty, 10);
                                             const isMastered = percent >= 75;
                                             return (
                                                 <React.Fragment key={i}>
                                                     <tr className={`${monet ? monet.tableRow : 'hover:bg-slate-50 dark:hover:bg-white/5'} transition-colors`}>
                                                         <td className={`px-6 py-4 font-medium max-w-md ${monet ? monet.textMain : 'text-slate-700 dark:text-slate-200'}`}>
                                                             <div className="line-clamp-2">{item.type === "matching-type" ? "Matching Question" : item.question}</div>
                                                             {item.type === "matching-type" && (
                                                                 <button onClick={() => setExpandedRows(p => ({...p, [i]: !p[i]}))} className={`text-xs hover:underline mt-1 font-medium ${monet ? monet.accentColor : 'text-blue-500'}`}>
                                                                     {expandedRows[i] ? "Hide Breakdown" : "View Breakdown"}
                                                                 </button>
                                                             )}
                                                         </td>
                                                         <td className="px-6 py-4 text-center">
                                                             <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${monet ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
                                                                {item.correct} / {item.total}
                                                             </div>
                                                         </td>
                                                         <td className="px-6 py-4 text-right">
                                                             <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${
                                                                 isMastered 
                                                                 ? (monet ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border-emerald-200 dark:border-emerald-800") 
                                                                 : (monet ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-red-50 dark:bg-red-900/20 text-red-700 border-red-200 dark:border-red-800")
                                                             }`}>
                                                                 {item.difficulty}
                                                             </span>
                                                         </td>
                                                     </tr>
                                                     {item.type === "matching-type" && expandedRows[i] && (
                                                         <tr className={monet ? "bg-white/5" : "bg-slate-50/50 dark:bg-black/20"}>
                                                             <td colSpan={3} className="px-6 py-4">
                                                                 <div className="grid gap-2">
                                                                     {item.breakdown.map((p, idx) => (
                                                                         <div key={idx} className={`flex items-center justify-between text-xs p-2 rounded border ${monet ? 'bg-white/5 border-white/10' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-slate-700'}`}>
                                                                             <span className={monet ? monet.textSub : "text-slate-600 dark:text-slate-400"}>{p.promptText}</span>
                                                                             <div className="flex items-center gap-2">
                                                                                <span className={p.isCorrect ? (monet ? "text-emerald-400" : "text-emerald-600") : (monet ? "text-red-400" : "text-red-500")}>{p.studentChoice || "No Answer"}</span>
                                                                                <span className={monet ? "text-white/40" : "text-slate-300"}>→</span>
                                                                                <span className={`font-bold ${monet ? monet.textMain : "text-slate-700 dark:text-slate-300"}`}>{p.correctChoice}</span>
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
                         ) : (
                             <div className={`${cardClass} p-12 text-center opacity-60 ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>Select a quiz to analyze items.</div>
                         )}
                    </div>
                )}

                {selectedClassId && analysisType === "recommendations" && (
                    <div className="space-y-6">
                        <h2 className={`text-2xl font-bold tracking-tight ${monet ? monet.textMain : 'text-slate-800 dark:text-white'}`}>Saved Recommendations</h2>
                        {isLoading ? (
                            <RecommendationsSkeleton />
                        ) : Object.keys(groupedSavedRecs).length === 0 ? (
                            <div className={`${cardClass} p-12 flex flex-col items-center text-center`}>
                                <IconBookmarks size={48} className={`mb-4 ${monet ? 'text-white/30' : 'text-slate-300'}`} />
                                <p className={monet ? monet.textSub : "text-slate-500"}>No AI recommendations generated yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.keys(groupedSavedRecs).sort(customUnitSort).map((unitTitle) => (
                                    <div key={unitTitle} className={`${cardClass} overflow-hidden`}>
                                        <button onClick={() => setOpenRecsUnit(openRecsUnit === unitTitle ? null : unitTitle)} className={`w-full flex justify-between items-center px-6 py-4 border-b transition-colors ${monet ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                                            <span className={`font-bold text-sm ${monet ? monet.textMain : 'text-slate-700 dark:text-slate-200'}`}>{unitTitle}</span>
                                            <IconChevronDown className={`transition-transform ${openRecsUnit === unitTitle ? "rotate-180" : ""} ${monet ? 'text-white/50' : ''}`} size={16} />
                                        </button>
                                        <AnimatePresence>
                                            {openRecsUnit === unitTitle && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                    <div className="p-2 space-y-2">
                                                        {groupedSavedRecs[unitTitle].map((recDoc) => (
                                                            <div key={recDoc.id} className={`group flex items-center justify-between p-3 rounded-xl transition-all border border-transparent ${monet ? 'hover:bg-white/5 hover:border-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                                                                <div onClick={() => openViewModal(recDoc)} className="flex-1 cursor-pointer">
                                                                    <h4 className={`font-bold text-sm ${monet ? monet.textMain : 'text-slate-800 dark:text-white'}`}>{recDoc.lessonTitle || "Remediation Plan"}</h4>
                                                                    <span className={`text-xs ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>{recDoc.createdAt?.toDate().toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => exportRecToPDF(recDoc)} className={`${baseButtonStyles} p-2.5 rounded-full border ${monet ? monet.buttonSecondary : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700'}`} disabled={exportingPdfId === recDoc.id}>
                                                                        {exportingPdfId === recDoc.id ? <Spinner size="xs"/> : <IconFileExport size={16} />}
                                                                    </button>
                                                                    <button onClick={() => openEditModal(recDoc)} className={`${baseButtonStyles} p-2.5 rounded-full border ${monet ? monet.buttonSecondary : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700'}`}><IconEdit size={16} /></button>
                                                                    <button onClick={() => deleteRecommendation(recDoc)} className={`${baseButtonStyles} p-2.5 rounded-full border ${monet ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30' : 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}><IconTrash size={16} /></button>
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

      {/* Global Styles for Scroll */}
      <style>{`
        .font-display { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 10px; }
      `}</style>

      {/* Modals */}
      <AnalysisReportModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} analysisResult={analysisResult} onGenerate={generateRemediationPlan} isLoading={isGeneratingRemediation} />
      <RemediationPreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} remediationData={generatedRemediation} onSave={() => saveRecommendationToFirestore(analysisResult, generatedRemediation)} isSaving={isSaving} />
      <ViewRecommendationModal isOpen={viewModalOpen} onClose={() => { setViewModalOpen(false); setViewingRec(null); }} recDoc={viewingRec} />
      <EditRecommendationModal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingRec(null); }} recDoc={editingRec} onSaveSuccess={async () => {
         if (selectedClassId) {
             const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId));
             const snap = await getDocs(q);
             setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
         }
         setEditModalOpen(false); setEditingRec(null);
      }} />
    </div>
  );
};

export default AnalyticsView;