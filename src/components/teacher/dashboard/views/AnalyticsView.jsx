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

import Spinner from "../../../common/Spinner"; // Kept only for AI processing state
import AnalysisReportModal from "../modals/AnalysisReportModal";
import RemediationPreviewModal from "../modals/RemediationPreviewModal";
import ViewRecommendationModal from "../modals/ViewRecommendationModal";
import EditRecommendationModal from "../modals/EditRecommendationModal";
import { callGeminiWithLimitCheck } from "../../../../services/aiService";
import { motion, AnimatePresence } from 'framer-motion';

// PDF export imports
import pdfMake from "pdfmake/build/pdfmake.min";
import "pdfmake/build/vfs_fonts";
import htmlToPdfmake from "html-to-pdfmake";
import { marked } from "marked";

// --- START: MACOS 26 DESIGN SYSTEM CONSTANTS ---

// 1. Layout & Backgrounds
const commonContainerClasses = "relative h-full w-full p-4 sm:p-6 font-sans overflow-hidden bg-[#F5F7FA] dark:bg-[#050505]";
const windowContainerClasses = "relative z-10 h-full flex flex-col bg-white/60 dark:bg-[#121212]/60 backdrop-blur-[50px] rounded-[2.5rem] shadow-2xl shadow-slate-400/20 dark:shadow-black/80 ring-1 ring-white/40 dark:ring-white/5 overflow-hidden transition-all duration-500";

// 2. Typography
const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

// 3. Buttons (Neumorphic / Glass)
const baseButtonStyles = `
    relative font-semibold rounded-full transition-all duration-300 
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed
`;

const primaryButton = `
    ${baseButtonStyles} px-5 py-2.5 text-sm text-white 
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
    ${baseButtonStyles} p-2.5 text-slate-500 dark:text-slate-400 
    bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/15 
    hover:text-blue-600 dark:hover:text-blue-400
    backdrop-blur-md rounded-full border border-white/20 shadow-sm
`;

const destructiveIconButton = `
    ${baseButtonStyles} p-2.5 text-red-500/80 hover:text-red-600 
    bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30
    rounded-full border border-red-200/50 dark:border-red-500/20 shadow-sm
`;

// 4. Side Panel / Tabs
const panelButton = `
    w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 font-medium text-sm group relative overflow-hidden
`;
const activePanelButton = 'text-white bg-blue-600 shadow-lg shadow-blue-500/25';
const inactivePanelButton = 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'; 

// 5. Cards & Surfaces
const cardSurface = "bg-white/40 dark:bg-[#1F2229]/40 backdrop-blur-xl rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300";

// 6. Dropdowns
const dropdownContainer = "relative z-[60]"; 
const dropdownButton = `
    w-full flex justify-between items-center px-4 py-3 rounded-2xl
    bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/5
    backdrop-blur-md shadow-sm hover:bg-white/70 dark:hover:bg-white/10 transition-all
    text-slate-700 dark:text-slate-200 font-medium text-sm
`;
const dropdownList = `
    absolute top-full left-0 mt-2 w-full 
    bg-white/90 dark:bg-[#1A1D24]/95 backdrop-blur-[40px] 
    rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-[70] overflow-hidden p-1.5 max-h-60 overflow-y-auto custom-scrollbar
`;
const dropdownItem = "block w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors duration-200";
const activeDropdownItem = 'bg-blue-500 text-white shadow-md shadow-blue-500/20';
const inactiveDropdownItem = 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10';

// Aurora Background
const AuroraBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[100px] animate-blob" />
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000" />
    </div>
);

// --- SKELETAL COMPONENTS ---

const SkeletonPulse = ({ className }) => (
    <div className={`animate-pulse bg-slate-200/60 dark:bg-white/5 rounded-lg ${className}`} />
);

const StudentsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`${cardSurface} p-5 border-l-4 border-transparent h-32 flex flex-col justify-between`}>
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
    <div className={`${cardSurface} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-white/10 flex gap-4">
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
            <div key={i} className={`${cardSurface} h-16 flex items-center px-6 gap-4`}>
                 <SkeletonPulse className="h-4 w-1/3" />
                 <div className="flex-1" />
                 <SkeletonPulse className="h-8 w-8 rounded-full" />
                 <SkeletonPulse className="h-8 w-8 rounded-full" />
            </div>
        ))}
    </div>
);

// --- END: SKELETAL COMPONENTS ---

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
    if (!analysisResult?.recommendation_action || !lessonData) return;
    const action = analysisResult.recommendation_action;
    if (action === "NONE") { alert("No remediation needed."); return; }
    const weakItems = itemAnalysisData.filter((i) => {
      const percent = i.total > 0 ? (i.correct / i.total) * 100 : 0;
      return percent < 75;
    });
    if (weakItems.length === 0) { alert("No weak items found."); return; }
    setIsGeneratingRemediation(true);
    try {
      const lessonLanguage = lessonData?.language || "original language";
      const lessonText = (lessonData?.pages || []).map((p) => `${p.title ? p.title + "\n" : ""}${p.content || ""}`).join("\n\n");
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
      const jsonString = rawAiResponse.substring(firstBracket, lastBracket + 1);
      setGeneratedRemediation(JSON.parse(jsonString));
      setIsAnalysisModalOpen(false);
      setIsPreviewModalOpen(true);
    } catch (err) {
      console.error("Remediation Error", err);
      alert("Error generating remediation.");
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
      <AuroraBackground />
      
      <div className={windowContainerClasses}>
        {/* Header Bar */}
        <div className="flex items-center justify-between p-6 sm:px-8 border-b border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-lg z-20">
            <div className="flex flex-col">
                <h1 className={`${headingStyle} text-2xl sm:text-3xl`}>Analytics Center</h1>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium tracking-wide">Real-time Performance & Insights</span>
            </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* --- SIDEBAR --- */}
            <div className="w-full md:w-72 lg:w-80 flex flex-col border-r border-white/20 dark:border-white/5 bg-white/30 dark:bg-black/20 backdrop-blur-xl p-4 sm:p-6 gap-6 overflow-y-auto z-20 custom-scrollbar">
                
                {/* Class Selector */}
                <div className={dropdownContainer}>
                  <div className={subHeadingStyle + " mb-2 ml-1"}>Select Class</div>
                  <button 
                      onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} 
                      className={dropdownButton}
                  >
                      <span className="truncate">{selectedClass ? selectedClass.name : "Choose Class"}</span>
                      <IconChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isClassDropdownOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className={dropdownList}
                        >
                            <button onClick={() => { setSelectedClassId(""); setIsClassDropdownOpen(false); }} className={`${dropdownItem} ${!selectedClassId ? activeDropdownItem : inactiveDropdownItem}`}>None</button>
                            {activeClasses.map((cls) => (
                                <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setSelectedQuizId(""); setIsClassDropdownOpen(false); }} className={`${dropdownItem} ${selectedClassId === cls.id ? activeDropdownItem : inactiveDropdownItem}`}>
                                    {cls.name}
                                </button>
                            ))}
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-col gap-2">
                    <div className={subHeadingStyle + " mb-1 ml-1"}>Analysis Tools</div>
                    <button onClick={() => setAnalysisType("students")} className={`${panelButton} ${analysisType === "students" ? activePanelButton : inactivePanelButton}`}>
                        <IconAlertTriangle size={20} className={analysisType === "students" ? "text-white" : "text-amber-500"} />
                        <span>At-Risk Students</span>
                        {analysisType === "students" && <motion.div layoutId="active-pill" className="absolute inset-0 bg-white/10 rounded-2xl" />}
                    </button>
                    <button onClick={() => setAnalysisType("quizzes")} className={`${panelButton} ${analysisType === "quizzes" ? activePanelButton : inactivePanelButton}`}>
                        <IconChartBar size={20} className={analysisType === "quizzes" ? "text-white" : "text-purple-500"} />
                        <span>Quiz Analysis</span>
                    </button>
                    <button onClick={() => setAnalysisType("recommendations")} className={`${panelButton} ${analysisType === "recommendations" ? activePanelButton : inactivePanelButton}`}>
                        <IconBrain size={20} className={analysisType === "recommendations" ? "text-white" : "text-emerald-500"} />
                        <span>Recommendations</span>
                    </button>
                </div>

                {/* Contextual Sidebar Content (Filters/Lists) */}
                {/* Removed 'overflow-y-auto' and 'min-h-0' so the popup isn't clipped */}
<div className="flex-1 space-y-4 pr-2">
				{analysisType === "students" && selectedClassId && (
				    <div className={dropdownContainer}>
				         <div className={subHeadingStyle + " mb-2 ml-1"}>Quarter Filter</div>
				         <button 
				            onClick={() => setIsQuarterDropdownOpen(!isQuarterDropdownOpen)} 
				            className={dropdownButton}
				         >
				            <span>{(quarterOptions.find(q => q.value === selectedQuarter) || quarterOptions[0]).label}</span>
				            {/* Rotate chevron to point up when open */}
				            <IconChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isQuarterDropdownOpen ? 'rotate-180' : ''}`} />
				         </button>
         
				         <AnimatePresence>
				            {isQuarterDropdownOpen && (
				                <motion.div
				                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
				                    animate={{ opacity: 1, y: 0, scale: 1 }}
				                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
				                    transition={{ duration: 0.2 }}
				                    // 'bottom-full' pushes it UP. 'mb-2' adds space between button and popup.
				                    className={`
				                        absolute bottom-full left-0 mb-2 w-full 
				                        bg-white/90 dark:bg-[#1A1D24]/95 backdrop-blur-[40px] 
				                        rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 
				                        z-[100] overflow-hidden p-1.5 max-h-60 overflow-y-auto custom-scrollbar
				                    `}
				                >
				                    {quarterOptions.map((opt) => (
				                        <button 
				                            key={opt.value} 
				                            onClick={() => { setSelectedQuarter(opt.value); setIsQuarterDropdownOpen(false); }} 
				                            className={`${dropdownItem} ${selectedQuarter === opt.value ? activeDropdownItem : inactiveDropdownItem}`}
				                        >
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
                             <div className={subHeadingStyle + " mb-3 ml-1"}>Available Quizzes</div>
                             {Object.keys(quizzesInClass.reduce((acc, quiz) => {
                                const unitName = quiz.unitDisplayName || "Uncategorized";
                                if (!acc[unitName]) acc[unitName] = [];
                                acc[unitName].push(quiz);
                                return acc;
                             }, {})).sort(customUnitSort).map((unitName) => (
                                <div key={unitName} className="mb-2">
                                    <button onClick={() => setOpenUnit(openUnit === unitName ? null : unitName)} className="flex items-center justify-between w-full py-2 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-blue-500 transition-colors">
                                        {unitName}
                                        <IconChevronDown size={14} className={`transition-transform ${openUnit === unitName ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {openUnit === unitName && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden ml-2 space-y-1 border-l border-slate-200 dark:border-white/10 pl-2">
                                                {quizzesInClass.filter((q) => (q.unitDisplayName || "Uncategorized") === unitName).sort((a, b) => a.title.localeCompare(b.title)).map((q) => (
                                                    <button key={q.id} onClick={() => setSelectedQuizId(q.id)} className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-all ${selectedQuizId === q.id ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
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
                className="flex-1 p-6 sm:p-10 overflow-y-auto custom-scrollbar bg-gradient-to-br from-white/40 via-white/20 to-transparent dark:from-white/5 dark:to-transparent relative"
            >
                {/* AI Processing Overlay (Still useful for generation blocking) */}
                {(isAnalyzing || isGeneratingRemediation) && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-[2.5rem]">
                        <Spinner size="xl" />
                        <span className="mt-4 font-medium text-slate-600 dark:text-slate-300 animate-pulse">
                            {isGeneratingRemediation ? "Designing Personalized Remediation..." : "Analyzing..."}
                        </span>
                    </div>
                )}

                {/* Empty State */}
                {!selectedClassId && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                         <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-6 shadow-inner">
                            <IconAnalyze size={48} className="text-slate-400" />
                         </div>
                         <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Class Selected</h2>
                         <p className="text-slate-500 mt-2 max-w-xs">Select a class from the sidebar to begin analyzing student performance.</p>
                    </div>
                )}

                {/* CONTENT: At Risk */}
                {selectedClassId && analysisType === "students" && (
                    <div className="space-y-8">
                        <div className="flex items-baseline justify-between">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">At-Risk Students</h2>
                            <span className="text-sm font-medium text-slate-500">Threshold: &lt; 75% Avg</span>
                        </div>
                        
                        {isLoading ? (
                            <StudentsSkeleton />
                        ) : selectedQuarter ? (
                            atRiskByQuarter[selectedQuarter]?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {atRiskByQuarter[selectedQuarter].map((st) => (
                                        <motion.div whileHover={{ y: -5 }} key={st.id} className={`${cardSurface} p-5 border-l-4 border-l-red-500`}>
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                                                    <IconAlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{st.name}</h3>
                                                    <div className="mt-2 space-y-1">
                                                        {st.reasons.map((r, i) => (
                                                            <span key={i} className="inline-block px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-medium">
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
                                <div className={`${cardSurface} p-12 flex flex-col items-center justify-center text-center`}>
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                                        <IconCheck size={32} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">All Clear!</h3>
                                    <p className="text-slate-500 mt-1">No students are flagged as at-risk for this quarter.</p>
                                </div>
                            )
                        ) : (
                            <div className={`${cardSurface} p-8 text-center opacity-70`}>Please select a quarter to view analysis.</div>
                        )}
                    </div>
                )}

                {/* CONTENT: Quiz Analysis */}
                {selectedClassId && analysisType === "quizzes" && (
                    <div className="space-y-6">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                             <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Item Analysis</h2>
                             {selectedQuizId && itemAnalysisData && !isLoading && (
                                 <div className="flex gap-2">
                                     <button onClick={exportItemAnalysisToCSV} className={secondaryButton}><IconDownload size={16} /> CSV</button>
                                     <button onClick={generateAnalysisReport} disabled={isAnalyzing} className={primaryButton}>
                                         <IconAnalyze size={18} /> AI Analysis
                                     </button>
                                 </div>
                             )}
                         </div>

                         {isLoading ? (
                             <TableSkeleton />
                         ) : selectedQuizId && itemAnalysisData && itemAnalysisData.length > 0 ? (
                             <div className={`${cardSurface} overflow-hidden`}>
                                 <table className="w-full text-sm text-left">
                                     <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50/50 dark:bg-white/5 border-b border-white/10">
                                         <tr>
                                             <th className="px-6 py-4">Question</th>
                                             <th className="px-6 py-4 text-center">Performance</th>
                                             <th className="px-6 py-4 text-right">Mastery</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                         {itemAnalysisData.map((item, i) => {
                                             const percent = parseInt(item.difficulty, 10);
                                             const isMastered = percent >= 75;
                                             return (
                                                 <React.Fragment key={i}>
                                                     <tr className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                                                         <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 max-w-md">
                                                             <div className="line-clamp-2">{item.type === "matching-type" ? "Matching Question" : item.question}</div>
                                                             {item.type === "matching-type" && (
                                                                 <button onClick={() => setExpandedRows(p => ({...p, [i]: !p[i]}))} className="text-xs text-blue-500 hover:underline mt-1 font-medium">
                                                                     {expandedRows[i] ? "Hide Breakdown" : "View Breakdown"}
                                                                 </button>
                                                             )}
                                                         </td>
                                                         <td className="px-6 py-4 text-center">
                                                             <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                                {item.correct} / {item.total}
                                                             </div>
                                                         </td>
                                                         <td className="px-6 py-4 text-right">
                                                             <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${isMastered ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 border-red-200 dark:border-red-800"}`}>
                                                                 {item.difficulty}
                                                             </span>
                                                         </td>
                                                     </tr>
                                                     {item.type === "matching-type" && expandedRows[i] && (
                                                         <tr className="bg-slate-50/50 dark:bg-black/20">
                                                             <td colSpan={3} className="px-6 py-4">
                                                                 <div className="grid gap-2">
                                                                     {item.breakdown.map((p, idx) => (
                                                                         <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-white/40 dark:bg-white/5 border border-white/10">
                                                                             <span className="text-slate-600 dark:text-slate-400">{p.promptText}</span>
                                                                             <div className="flex items-center gap-2">
                                                                                <span className={p.isCorrect ? "text-emerald-600" : "text-red-500"}>{p.studentChoice || "No Answer"}</span>
                                                                                <span className="text-slate-300">→</span>
                                                                                <span className="font-bold text-slate-700 dark:text-slate-300">{p.correctChoice}</span>
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
                             <div className={`${cardSurface} p-12 text-center opacity-60`}>Select a quiz to analyze items.</div>
                         )}
                    </div>
                )}

                {/* CONTENT: Recommendations */}
                {selectedClassId && analysisType === "recommendations" && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Saved Recommendations</h2>
                        {isLoading ? (
                            <RecommendationsSkeleton />
                        ) : Object.keys(groupedSavedRecs).length === 0 ? (
                            <div className={`${cardSurface} p-12 flex flex-col items-center text-center`}>
                                <IconBookmarks size={48} className="text-slate-300 mb-4" />
                                <p className="text-slate-500">No AI recommendations generated yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.keys(groupedSavedRecs).sort(customUnitSort).map((unitTitle) => (
                                    <div key={unitTitle} className={`${cardSurface} overflow-hidden`}>
                                        <button onClick={() => setOpenRecsUnit(openRecsUnit === unitTitle ? null : unitTitle)} className="w-full flex justify-between items-center px-6 py-4 bg-slate-50/30 dark:bg-white/5 border-b border-white/10 hover:bg-slate-50/80 transition-colors">
                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{unitTitle}</span>
                                            <IconChevronDown className={`transition-transform ${openRecsUnit === unitTitle ? "rotate-180" : ""}`} size={16} />
                                        </button>
                                        <AnimatePresence>
                                            {openRecsUnit === unitTitle && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                    <div className="p-2 space-y-2">
                                                        {groupedSavedRecs[unitTitle].map((recDoc) => (
                                                            <div key={recDoc.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-all border border-transparent hover:border-white/20">
                                                                <div onClick={() => openViewModal(recDoc)} className="flex-1 cursor-pointer">
                                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{recDoc.lessonTitle || "Remediation Plan"}</h4>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{recDoc.createdAt?.toDate().toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => exportRecToPDF(recDoc)} className={iconButton} disabled={exportingPdfId === recDoc.id}>
                                                                        {exportingPdfId === recDoc.id ? <Spinner size="xs"/> : <IconFileExport size={16} />}
                                                                    </button>
                                                                    <button onClick={() => openEditModal(recDoc)} className={iconButton}><IconEdit size={16} /></button>
                                                                    <button onClick={() => deleteRecommendation(recDoc)} className={destructiveIconButton}><IconTrash size={16} /></button>
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

      {/* Global Styles for Animation & Scroll */}
      <style>{`
        .font-display { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 10px; }
        .animate-blob { animation: blob 10s infinite; }
        @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
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