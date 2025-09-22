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
  updateDoc,
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
} from "@tabler/icons-react";

import Spinner from "../../../common/Spinner";
import AnalysisReportModal from "../modals/AnalysisReportModal";
import RemediationPreviewModal from "../modals/RemediationPreviewModal";
import ViewRecommendationModal from "../modals/ViewRecommendationModal";
import EditRecommendationModal from "../modals/EditRecommendationModal";
import { callGeminiWithLimitCheck } from "../../../../services/aiService";

// PDF export imports
import pdfMake from "pdfmake/build/pdfmake.min";
import "pdfmake/build/vfs_fonts";
import htmlToPdfmake from "html-to-pdfmake";
import { marked } from "marked";

// (Utility functions like quote, downloadFile, customUnitSort, fetchUnitsInBatches, fetchLessonsInBatches, convertRecommendationToCSV remain unchanged)
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
const convertRecommendationToCSV = (rec, lessonTitle = "") => {
  if (!rec || !rec.remediation_lessons) return "";
  const headers = [ "Topic", "Objectives", "Time Allotment", "Phase", "Phase Time", "Teacher Instructions", "Activity Title", "Activity Instructions", "Materials Needed", "Notes for Teachers", "Source Lesson" ];
  const rows = [headers.map(quote).join(",")];
  rec.remediation_lessons.forEach((lesson) => {
    const objectives = (lesson.objectives || []).join(" | ");
    const notes = lesson.notes_for_teachers || "";
    const time = lesson.time_allotment || "";
    const plan = lesson.lesson_plan || [];
    if (plan.length > 0) {
      plan.forEach((phase) => {
        const row = [ lesson.topic || "", objectives, time, phase.phase || "", phase.time || "", phase.teacher_instructions || "", phase.activity?.title || "", phase.activity?.instructions || "", (phase.activity?.materials_needed || []).join(" | "), notes, lessonTitle || "" ].map(quote);
        rows.push(row.join(","));
      });
    } else {
      const row = [ lesson.topic || "", objectives, time, "", "", "", lesson.activity?.title || "", lesson.activity?.instructions || lesson.activity || "", (lesson.activity?.materials_needed || []).join(" | "), notes, lessonTitle || "" ].map(quote);
      rows.push(row.join(","));
    }
  });
  return rows.join("\n");
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

  const selectedClass = activeClasses.find((c) => c.id === selectedClassId);

  // (All existing useEffect hooks remain unchanged)
  useEffect(() => {
    const analyzeClassData = async () => {
      if (!selectedClass) {
        setQuizzesInClass([]); setUnitsMap({}); setLessonsMap({}); setAtRiskByQuarter({}); setItemAnalysisData(null); setSelectedQuizId("");
        return;
      }
      setIsLoading(true);
      let quizzesData = [];
      if (selectedClass.subjectId) {
        const q = query(collection(db, "quizzes"), where("subjectId", "==", selectedClass.subjectId));
        const snap = await getDocs(q);
        quizzesData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      const unitIds = [...new Set(quizzesData.map((q) => q.unitId).filter(Boolean))];
      const lessonIds = [...new Set(quizzesData.map((q) => q.lessonId).filter(Boolean))];
      const [unitsFetched, lessonsFetched] = await Promise.all([fetchUnitsInBatches(unitIds), fetchLessonsInBatches(lessonIds)]);
      quizzesData = quizzesData.map((q) => ({ ...q, unitDisplayName: q.unitId ? unitsFetched[q.unitId] || "Uncategorized" : "Uncategorized", lessonTitle: q.lessonId ? lessonsFetched[q.lessonId]?.title || "" : "" }));
      setUnitsMap(unitsFetched); setLessonsMap(lessonsFetched); setQuizzesInClass(quizzesData);
      const quarterGroups = { 1: [], 2: [], 3: [], 4: [] };
      if (selectedClass.students && selectedClass.students.length > 0) {
        for (const student of selectedClass.students) {
          const studentName = student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.name || student.id || "Unnamed Student";
          const studentId = student.id || student.userId || student.uid;
          if (!studentId) continue;
          const subsQ = query(collection(db, "quizSubmissions"), where("studentId", "==", studentId), where("classId", "==", selectedClassId));
          const subsSnap = await getDocs(subsQ);
          const firstAttemptsPerQuiz = {};
          subsSnap.docs.forEach((d) => {
            const data = d.data();
            const submittedAt = data.submittedAt?.seconds ? data.submittedAt.seconds : new Date(data.submittedAt).getTime() / 1000;
            if (!firstAttemptsPerQuiz[data.quizId] || submittedAt < firstAttemptsPerQuiz[data.quizId].submittedAt) {
              firstAttemptsPerQuiz[data.quizId] = { ...data, submittedAt };
            }
          });
          const quarterScores = { 1: [], 2: [], 3: [], 4: [] };
          Object.values(firstAttemptsPerQuiz).forEach((attempt) => {
            const quiz = quizzesData.find((q) => q.id === attempt.quizId);
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
      }
      setAtRiskByQuarter(quarterGroups);
      setIsLoading(false);
    };
    analyzeClassData();
  }, [selectedClassId, activeClasses]);
  useEffect(() => {
    const analyzeQuizData = async () => {
      if (!selectedQuizId) { setItemAnalysisData(null); setLessonData(null); return; }
      setIsLoading(true);
      setAnalysisResult(null);
      setGeneratedRemediation(null);

      const subsQ = query(collection(db, "quizSubmissions"), where("quizId", "==", selectedQuizId), where("classId", "==", selectedClassId));
      const subsSnap = await getDocs(subsQ);
      const submissions = subsSnap.docs.map((d) => d.data());
      if (submissions.length === 0) { setItemAnalysisData([]); setIsLoading(false); return; }
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
          if (answer && answer.questionText) {
            if (!questionAnalysis[answer.questionText]) questionAnalysis[answer.questionText] = { correct: 0, total: 0 };
            questionAnalysis[answer.questionText].total++;
            if (answer.isCorrect) questionAnalysis[answer.questionText].correct++;
          }
        });
      });
      const results = Object.keys(questionAnalysis).map((question) => {
        const { correct, total } = questionAnalysis[question];
        return { question, correct, total, difficulty: total > 0 ? ((correct / total) * 100).toFixed(0) + "%" : "N/A" };
      });
      setItemAnalysisData(results);
      const quizDoc = quizzesInClass.find((q) => q.id === selectedQuizId);
      if (quizDoc?.lessonId) {
        const lessonRef = doc(db, "lessons", quizDoc.lessonId);
        const lessonSnap = await getDoc(lessonRef);
        if (lessonSnap.exists()) setLessonData({ id: lessonSnap.id, ...lessonSnap.data() });
      } else { setLessonData(null); }
      setIsLoading(false);
    };
    analyzeQuizData();
  }, [selectedQuizId, selectedClassId, quizzesInClass]);
  useEffect(() => {
    const loadSavedRecs = async () => {
      if (!selectedClassId) { setSavedRecs([]); return; }
      const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId));
      const snap = await getDocs(q);
      setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadSavedRecs();
  }, [selectedClassId, isSaving]);

// --- Generate Narrative Analysis ---
  const generateAnalysisReport = async () => {
    if (!itemAnalysisData) {
      alert("No item analysis data to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setGeneratedRemediation(null);

    let rawAiResponse = "";

    try {
      // ✅ Calculate general average
      const percentages = itemAnalysisData.map((i) => {
        const correct = i.correct || 0;
        const total = i.total || 0;
        return total > 0 ? (correct / total) * 100 : 0;
      });
      const generalAverage =
        percentages.length > 0
          ? percentages.reduce((a, b) => a + b, 0) / percentages.length
          : 0;

      // ✅ Safe lesson title
      const lessonTitle = lessonData?.title || "Unnamed Lesson";
      const language = lessonData?.language || "English";

      // ✅ Build item analysis string separately
      const itemsSummary = itemAnalysisData
        .map((item) => `- "${item.question}" (${item.difficulty})`)
        .join("\n");

      const prompt = `
        You are an expert data analyst and educational consultant for teachers.
        Your task is to analyze quiz item analysis data and provide a professional narrative report with a clear recommendation.

        Context:
        - Class Subject: "${lessonTitle}"
        - General Average: ${generalAverage.toFixed(2)}%
        - Item Analysis Data (Question, Percentage Correct):
        ---
        ${itemsSummary}
        ---

        Strict Requirements:
        1. **Narrative Report:** Write a professional, concise narrative report summarizing the students' performance. 
           Start by acknowledging the overall performance. Then, identify specific concepts or skills where students 
           demonstrated mastery and where they struggled. The tone should be helpful and diagnostic, not just a list of data points.

        2. **Actionable Recommendation:** Based on your analysis, provide a clear, single recommendation by following these **strict rules** 
           tied to the computed general average of student performance:

           * "NONE": Select this if the general average is **80% or higher**. 
             In this case, mastery is considered high across all key concepts. 
             Acknowledge the students’ success and explicitly state that no remediation or intervention is necessary.

           * "REVIEW": Select this if the general average is **between 70% and 79%**. 
             This indicates that most students understand the lesson, but some misconceptions or gaps remain. 
             Recommend a **formative assessment or targeted review activity** to reinforce weaker areas 
             without needing a full reteach of the lesson.

           * "PARTIAL_RETEACH": Select this if the general average is **between 60% and 69%**. 
             This indicates significant gaps in understanding, but not across the entire lesson. 
             Recommend reteaching only the specific subtopics or skills that showed weakness, 
             while affirming what students already understand.

           * "FULL_RETEACH": Select this if the general average is **below 60%**. 
             This indicates widespread difficulty and lack of mastery in key concepts. 
             Recommend a **full reteach of the entire lesson**, as the majority of students did not grasp the material.

        3. **Language Adherence:** The ENTIRE output's textual content must be written in academically correct ${language}.

        4. **No Translation of Title:** Do NOT translate the 'Class Subject' title provided in the context. 
           Refer to it using its original name: "${lessonTitle}".

        5. **JSON Output Only:** Provide ONLY the raw JSON object as the response, without any surrounding text, explanations, or markdown formatting.

        Required JSON Structure:
        {
          "narrative_report": "<Your professional narrative analysis of the quiz results, written in ${language}>",
          "recommendation_action": "<'NONE' | 'REVIEW' | 'PARTIAL_RETEACH' | 'FULL_RETEACH'>"
        }
      `;

      rawAiResponse = await callGeminiWithLimitCheck(prompt);

      const firstBracket = rawAiResponse.indexOf("{");
      const lastBracket = rawAiResponse.lastIndexOf("}");
      if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("No valid JSON object found in the AI response.");
      }
      const jsonString = rawAiResponse.substring(firstBracket, lastBracket + 1);
      const parsedResponse = JSON.parse(jsonString);

      setAnalysisResult(parsedResponse);
      setIsAnalysisModalOpen(true);
    } catch (err) {
      console.error("generateAnalysisReport error", err);
      console.error("Problematic AI Response Text:", rawAiResponse);
      alert(
        "An error occurred while generating the analysis. The AI response was not valid JSON. Please check the console for details."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };
  
      

  const generateRemediationPlan = async () => {
    if (!analysisResult?.recommendation_action) {
      alert("No recommendation available. Please run analysis first.");
      return;
    }

    const action = analysisResult.recommendation_action;

    // ✅ Skip entirely if NONE
    if (action === "NONE") {
      alert("No remediation required. Students demonstrated sufficient mastery.");
      return;
    }

    // ✅ Gather weak items for REVIEW / PARTIAL / FULL
    const weakItems = itemAnalysisData.filter((i) => {
      const percent = i.total > 0 ? (i.correct / i.total) * 100 : 0;
      return percent < 75;
    });

    if (weakItems.length === 0) {
      alert("No weak items under the 75% threshold were found to generate a remediation plan.");
      return;
    }

    setIsGeneratingRemediation(true);
    setGeneratedRemediation(null);
    let rawAiResponse = "";

    try {
      const lessonLanguage = lessonData?.language || "the same language as the original lesson";
      const lessonText = (lessonData.pages || [])
        .map((p) => `${p.title ? p.title + "\n" : ""}${p.content || ""}`)
        .join("\n\n");
      const weakTopicsString = weakItems
        .map((item) => `- ${item.question} (Difficulty: ${item.difficulty})`)
        .join("\n");

      // ✅ Adjust duration and depth based on action
      let duration;
      let planDescription;
      switch (action) {
        case "REVIEW":
          duration = "15-20 minutes";
          planDescription =
            "Design a short, engaging formative review activity that reinforces key concepts. Focus on practice and clarification rather than reteaching.";
          break;
        case "PARTIAL_RETEACH":
          duration = "30-40 minutes";
          planDescription =
            "Design a mini-reteaching lesson that focuses only on the weakly mastered topics. Provide clear explanations, examples, and guided practice for those specific areas.";
          break;
        case "FULL_RETEACH":
        default:
          duration = "60 minutes";
          planDescription =
            "Design a full reteach lesson covering the entire lesson content, ensuring all concepts are reintroduced with clarity and student engagement.";
          break;
      }

      const prompt = `
        You are an expert instructional designer and master teacher. Your task is to create a highly effective and engaging remedial lesson plan.

        Context:
        - Original Lesson Content: "${lessonData?.title || "Unnamed Lesson"}"
        - Full Lesson Text: 
        ---
        ${lessonText}
        ---
        - Weakly Mastered Topics (based on a quiz):
        ---
        ${weakTopicsString}
        ---
        Recommendation Type: ${action}
        ---

        Strict Requirements:
        1. Lesson Duration: The lesson should last ${duration}. 
           ${planDescription}
        2. Language Adherence: The ENTIRE output's textual content (topics, objectives, instructions, etc.) must be written in academically correct ${lessonLanguage}.
        3. Pedagogical Approach: The lesson must be engaging, diagnostic, and interactive. It must contain specific discussion points and key concepts for the teacher to use, not just generic instructions.
        4. Focus: Directly address the weakly mastered topics listed above. Do NOT explicitly reference quiz question numbers.
        5. JSON Output Only: Provide ONLY the raw JSON object as the response, without any surrounding text, explanations, or markdown formatting.
      
        Required JSON Structure:
        {
          "weak_topics": ["<List of identified weak topics in ${lessonLanguage}>"],
          "remediation_lessons": [
            {
              "topic": "<Remedial lesson topic in ${lessonLanguage}>",
              "objectives": ["<3-4 clear, measurable objectives>"],
              "time_allotment": "${duration}",
              "lesson_plan": [
                { "phase": "Introduction", "time": "<minutes>", "teacher_instructions": "> *<Detailed teacher instructions>*", "activity": { "title": "<Activity title>", "instructions": "> *<Activity instructions>*", "materials_needed": ["<materials>"] } },
                { "phase": "Main Activity", "time": "<minutes>", "teacher_instructions": "> *<Detailed teacher instructions>*" },
                { "phase": "Practice", "time": "<minutes>", "teacher_instructions": "> *<Guided practice>*", "activity": { "title": "<Activity title>", "instructions": "> *<Practice activity>*", "materials_needed": ["<materials>"] } },
                { "phase": "Wrap-Up", "time": "<minutes>", "teacher_instructions": "> *<Closure instructions>*" }
              ],
              "notes_for_teachers": "> *<Additional notes for the teacher>*"
            }
          ]
        }
      `;

      rawAiResponse = await callGeminiWithLimitCheck(prompt);

      const firstBracket = rawAiResponse.indexOf("{");
      const lastBracket = rawAiResponse.lastIndexOf("}");
      if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("No valid JSON object found in the AI response.");
      }
      const jsonString = rawAiResponse.substring(firstBracket, lastBracket + 1);
      const parsedResponse = JSON.parse(jsonString);

      setGeneratedRemediation(parsedResponse);
      setIsAnalysisModalOpen(false);
      setIsPreviewModalOpen(true);
    } catch (err) {
      console.error("generateRemediationPlan error", err);
      console.error("Problematic AI Response Text:", rawAiResponse);
      if (err.message === "LIMIT_REACHED") {
        alert("The monthly limit for AI recommendations has been reached. Please contact support.");
      } else {
        alert("An error occurred while generating the remediation plan. The AI response was not valid JSON. Please check the console for details.");
      }
    } finally {
      setIsGeneratingRemediation(false);
    }
  };

  
  // (exportItemAnalysisToCSV remains unchanged)
  const exportItemAnalysisToCSV = () => {
    if (!itemAnalysisData) {
      alert("No item analysis data to export.");
      return;
    }
    const getRemarks = (difficulty) => {
      const percent = parseInt(difficulty.replace("%", ""), 10);
      if (isNaN(percent)) return "N/A";
      if (percent < 30) return "Critically low mastery. Requires urgent and thorough re-teaching of the foundational concept.";
      if (percent < 50) return "Low mastery. Students are struggling significantly. A targeted review and simplified examples are needed.";
      if (percent < 70) return "Moderate difficulty. Some students have misconceptions. Requires clarification and guided practice.";
      return "Well-mastered. Topic is understood by most students. A quick review should suffice if needed.";
    };
    const headers = ["Question", "Correct", "Total", "Difficulty (%)", "Remarks"];
    const rows = [headers.map(quote).join(",")];
    itemAnalysisData.forEach((item) => {
      const remark = getRemarks(item.difficulty);
      const row = [ item.question, item.correct, item.total, item.difficulty, remark ].map(quote);
      rows.push(row.join(","));
    });
    const csvContent = rows.join("\n");
    const quizTitle = quizzesInClass.find(q => q.id === selectedQuizId)?.title || 'item-analysis';
    const filename = `${quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.csv`;
    downloadFile(csvContent, "text/csv", filename);
  };

  const exportRecToPDF = async (recDoc) => {
    if (!recDoc) {
      alert("Recommendation data is missing.");
      return;
    }
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
      if (content.length === 0) throw new Error("No content available to generate PDF.");
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
      console.error("Failed to export PDF:", error);
      alert(`An error occurred while creating the PDF: ${error.message}`);
      setExportingPdfId(null);
    }
  };

  const saveRecommendationToFirestore = async (analysis, remediation) => {
    if (!selectedClassId || !selectedQuizId || !analysis || !remediation) {
      alert("Missing data to save recommendation.");
      return;
    }
    setIsSaving(true);

    try {
      const quizDoc = quizzesInClass.find((q) => q.id === selectedQuizId);

      const payload = {
        classId: selectedClassId,
        unitId: quizDoc?.unitId || null,
        lessonId: quizDoc?.lessonId || null,
        unitTitle: quizDoc?.unitId ? unitsMap[quizDoc.unitId] || "" : "",
        lessonTitle: lessonData?.title || quizDoc?.lessonTitle || "",
        quizId: selectedQuizId,
        narrative_report: analysis.narrative_report,
        recommendation_action: analysis.recommendation_action, // ✅ Save new field
        recommendations: remediation,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "recommendations"), payload);

      setAnalysisResult(null);
      setGeneratedRemediation(null);
      setIsPreviewModalOpen(false);

      // refresh saved recs
      const q = query(
        collection(db, "recommendations"),
        where("classId", "==", selectedClassId)
      );
      const snap = await getDocs(q);
      setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      alert("Saved recommendation successfully.");
    } catch (err) {
      console.error("saveRecommendationToFirestore error", err);
      alert("Failed to save recommendation.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const deleteRecommendation = async (recDoc) => {
    if (!recDoc || !confirm("Delete this saved recommendation? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "recommendations", recDoc.id));
      setSavedRecs((prev) => prev.filter((r) => r.id !== recDoc.id));
      alert("Deleted.");
    } catch (err) {
      console.error("deleteRecommendation error", err);
      alert("Failed to delete.");
    }
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

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Class Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select a Class to Analyze</label>
            <div className="relative">
              <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedQuizId(""); }} className="w-full p-3 pr-10 text-base rounded-xl bg-neumorphic-base shadow-neumorphic-inset focus:outline-none appearance-none">
                <option value="">-- Choose a Class --</option>
                {activeClasses.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
              <IconChevronDown className="h-5 w-5 text-slate-500 absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setAnalysisType("students")} className={`px-4 py-2 rounded-xl transition-all shadow-neumorphic ${analysisType === "students" ? "bg-neumorphic-base shadow-neumorphic-inset text-sky-700 font-bold" : "bg-neumorphic-base text-slate-600 hover:text-sky-600"}`}>At-Risk Students</button>
            <button onClick={() => setAnalysisType("quizzes")} className={`px-4 py-2 rounded-xl transition-all shadow-neumorphic ${analysisType === "quizzes" ? "bg-neumorphic-base shadow-neumorphic-inset text-sky-700 font-bold" : "bg-neumorphic-base text-slate-600 hover:text-sky-600"}`}>Quiz Item Analysis</button>
            <button onClick={() => setAnalysisType("recommendations")} className={`px-4 py-2 rounded-xl transition-all shadow-neumorphic ${analysisType === "recommendations" ? "bg-neumorphic-base shadow-neumorphic-inset text-sky-700 font-bold" : "bg-neumorphic-base text-slate-600 hover:text-sky-600"}`}>Recommendations & Remediations</button>
          </div>
          {analysisType === "students" && (
            <div className="mt-4">
              <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="w-full p-2 rounded-lg bg-neumorphic-base shadow-neumorphic-inset focus:outline-none text-sm">
                <option value="">-- Select Quarter --</option>
                <option value="1">Quarter 1</option><option value="2">Quarter 2</option><option value="3">Quarter 3</option><option value="4">Quarter 4</option>
              </select>
            </div>
          )}
          {analysisType === "quizzes" && (
            <div className="space-y-2 mt-4">
              {Object.keys(quizzesInClass.reduce((acc, quiz) => {
                const unitName = quiz.unitDisplayName || "Uncategorized";
                if (!acc[unitName]) acc[unitName] = [];
                acc[unitName].push(quiz);
                return acc;
              }, {})).sort(customUnitSort).map((unitName) => (
                <div key={unitName} className="border rounded-lg bg-neumorphic-base shadow-neumorphic">
                  <button onClick={() => setOpenUnit(openUnit === unitName ? null : unitName)} className="w-full flex justify-between items-center px-4 py-2 font-semibold text-slate-700 hover:text-sky-700">
                    <span>{unitName}</span>
                    <IconChevronDown className={`h-5 w-5 transition-transform ${openUnit === unitName ? "rotate-180" : ""}`} />
                  </button>
                  {openUnit === unitName && (
                    <div className="pl-4 pr-2 pb-2 space-y-1">
                      {quizzesInClass.filter((q) => (q.unitDisplayName || "Uncategorized") === unitName).sort((a, b) => a.title.localeCompare(b.title)).map((q) => (
                        <button key={q.id} onClick={() => setSelectedQuizId(q.id)} className={`block w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedQuizId === q.id ? "bg-sky-100 text-sky-700 font-semibold" : "hover:bg-slate-100 text-slate-700"}`}>
                          {q.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          {isLoading ? <div className="flex justify-center mt-12"><Spinner /></div> : (
            <>
              {analysisType === "students" && selectedQuarter && (
                <div>
                  {atRiskByQuarter[selectedQuarter]?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {atRiskByQuarter[selectedQuarter].map((st) => (
                        <div key={st.id} className="p-4 bg-neumorphic-base rounded-2xl shadow-neumorphic border-l-4 border-amber-500">
                          <div className="flex items-center gap-3"><IconAlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" /><h3 className="font-bold text-slate-800">{st.name}</h3></div>
                          <ul className="mt-2 ml-9 text-sm text-slate-600 list-disc list-inside">{st.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-slate-500 text-sm ml-2">No at-risk students in this quarter.</p>)}
                </div>
              )}
              {analysisType === "quizzes" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Quiz Item Analysis</h2>
                  {selectedQuizId && itemAnalysisData && itemAnalysisData.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button onClick={exportItemAnalysisToCSV} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm">
                            <IconDownload size={16} /><span>Download Analysis</span>
                        </button>
                        <button onClick={generateAnalysisReport} disabled={isAnalyzing} className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                          {isAnalyzing && <Spinner size="sm" />}
                          {isAnalyzing ? "Analyzing..." : "Analyze Performance"}
                        </button>
                      </div>
                      <div className="text-sm text-slate-500">Weak threshold: &lt; 75% mastery</div>
                    </div>
                  )}
                  {selectedQuizId && itemAnalysisData && itemAnalysisData.length > 0 ? (
                    <div className="overflow-x-auto bg-neumorphic-base rounded-2xl shadow-neumorphic mb-6">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 uppercase bg-neumorphic-base shadow-neumorphic-inset"><tr><th className="px-6 py-3">Question</th><th className="px-6 py-3 text-center">Correct / Total</th><th className="px-6 py-3 text-right">Mastery Level</th></tr></thead>
                        <tbody>
                          {itemAnalysisData.map((item, i) => (
                            <tr key={i} className="border-t border-slate-200">
                              <td className="px-6 py-4 font-medium text-slate-900">{item.question}</td>
                              <td className="px-6 py-4 text-center">{item.correct} / {item.total}</td>
                              <td className="px-6 py-4 font-bold text-right">{item.difficulty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (selectedQuizId ? <p className="text-center text-slate-500 mt-8">No submissions found for this quiz.</p> : null)}
                </div>
              )}
              {analysisType === "recommendations" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Saved Recommendations</h2>
                  <div className="space-y-3">
                    {Object.keys(groupedSavedRecs).length === 0 && <p className="text-slate-500 text-sm">No saved recommendations yet for this class.</p>}
                    {Object.keys(groupedSavedRecs).sort(customUnitSort).map((unitTitle) => (
                      <div key={unitTitle} className="border rounded-lg bg-neumorphic-base shadow-neumorphic">
                        <button onClick={() => setOpenRecsUnit(openRecsUnit === unitTitle ? null : unitTitle)} className="w-full flex justify-between items-center px-4 py-2 font-semibold text-slate-700 hover:text-sky-700">
                          <span>{unitTitle}</span>
                          <IconChevronDown className={`h-5 w-5 transition-transform ${openRecsUnit === unitTitle ? "rotate-180" : ""}`} />
                        </button>
                        {openRecsUnit === unitTitle && (
                          <div className="pl-4 pr-2 pb-3 space-y-2">
                            {groupedSavedRecs[unitTitle].map((recDoc) => (
                              <div key={recDoc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <button onClick={() => openViewModal(recDoc)} className="text-left flex-1">
                                  <div className="font-medium text-slate-800">{recDoc.lessonTitle || "Unnamed Lesson"} Remediation</div>
                                  <div className="text-xs text-slate-500">{recDoc.createdAt?.toDate ? recDoc.createdAt.toDate().toLocaleString() : ""}</div>
                                </button>
                                <div className="flex items-center gap-1">
                                  <button title="Export PDF" onClick={() => exportRecToPDF(recDoc)} disabled={exportingPdfId === recDoc.id} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50">
                                    {exportingPdfId === recDoc.id ? <Spinner size="sm" /> : <IconFileExport size={16} />}
                                  </button>
                                  <button title="Edit" onClick={() => openEditModal(recDoc)} className="p-2 rounded-full hover:bg-slate-100"><IconEdit size={16} /></button>
                                  <button title="Delete" onClick={() => deleteRecommendation(recDoc)} className="p-2 rounded-full hover:bg-slate-100 text-red-600"><IconTrash size={16} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {!selectedClassId && (
        <div className="text-center mt-16">
          <IconAnalyze size={48} className="mx-auto text-slate-400" />
          <p className="mt-4 text-slate-500">Please select a class to view its analytics.</p>
        </div>
      )}

      {/*-- Render All Modals --*/}
      <AnalysisReportModal
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
          analysisResult={analysisResult}
          onGenerate={generateRemediationPlan}
          isLoading={isGeneratingRemediation}
      />
      <RemediationPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          remediationData={generatedRemediation}
          onSave={() => saveRecommendationToFirestore(analysisResult, generatedRemediation)}
          isSaving={isSaving}
      />
      <ViewRecommendationModal 
        isOpen={viewModalOpen} 
        onClose={() => { setViewModalOpen(false); setViewingRec(null); }} 
        recDoc={viewingRec} 
      />
      <EditRecommendationModal 
        isOpen={editModalOpen} 
        onClose={() => { setEditModalOpen(false); setEditingRec(null); }} 
        recDoc={editingRec} 
        onSaveSuccess={() => {
          (async () => {
            if (!selectedClassId) return;
            const q = query(collection(db, "recommendations"), where("classId", "==", selectedClassId));
            const snap = await getDocs(q);
            setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setEditModalOpen(false); setEditingRec(null);
          })();
        }}
      />
    </div>
  );
};

export default AnalyticsView;