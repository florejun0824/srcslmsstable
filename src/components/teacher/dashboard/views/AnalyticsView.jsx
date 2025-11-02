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
  const [expandedRows, setExpandedRows] = useState({});
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false); 
  const [isQuarterDropdownOpen, setIsQuarterDropdownOpen] = useState(false);
  

  const selectedClass = activeClasses.find((c) => c.id === selectedClassId);

  // --- REFACTORED: Effect 1 ---
  // Loads ONLY the quiz list, units, and lessons for the selected class.
  // This is fast and populates the "Quiz Item Analysis" dropdown.
  useEffect(() => {
    const loadClassQuizzes = async () => {
      if (!selectedClass) {
        setQuizzesInClass([]);
        setUnitsMap({});
        setLessonsMap({});
        setAtRiskByQuarter({}); // Clear dependent data
        setItemAnalysisData(null); // Clear dependent data
        setSelectedQuizId(""); // Clear dependent data
        return;
      }
      setIsLoading(true);

      // Clear all dependent data on class change
      setAtRiskByQuarter({});
      setItemAnalysisData(null);
      setSelectedQuizId("");
      setAnalysisResult(null);
      setGeneratedRemediation(null);

      try {
        let quizzesData = [];
        if (selectedClass.subjectId) {
          const q = query(
            collection(db, "quizzes"),
            where("subjectId", "==", selectedClass.subjectId)
          );
          const snap = await getDocs(q);
          quizzesData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        const unitIds = [
          ...new Set(quizzesData.map((q) => q.unitId).filter(Boolean)),
        ];
        const lessonIds = [
          ...new Set(quizzesData.map((q) => q.lessonId).filter(Boolean)),
        ];
        const [unitsFetched, lessonsFetched] = await Promise.all([
          fetchUnitsInBatches(unitIds),
          fetchLessonsInBatches(lessonIds),
        ]);

        quizzesData = quizzesData.map((q) => ({
          ...q,
          unitDisplayName: q.unitId
            ? unitsFetched[q.unitId] || "Uncategorized"
            : "Uncategorized",
          lessonTitle: q.lessonId ? lessonsFetched[q.lessonId]?.title || "" : "",
        }));

        setUnitsMap(unitsFetched);
        setLessonsMap(lessonsFetched);
        setQuizzesInClass(quizzesData);
      } catch (err) {
        console.error("Error loading class quizzes:", err);
        setQuizzesInClass([]);
        setUnitsMap({});
        setLessonsMap({});
      } finally {
        setIsLoading(false);
      }
    };

    loadClassQuizzes();
  }, [selectedClassId, activeClasses, selectedClass]); // Added selectedClass dependency

  // --- REFACTORED: Effect 2 ---
  // Loads the expensive "At-Risk Student" data ONLY when the tab is active.
  // Uses an efficient single query instead of an N+1 loop.
  useEffect(() => {
    const loadAtRiskData = async () => {
      // Guard: Only run if this tab is active and we have the necessary data
      if (analysisType !== "students" || !selectedClassId || !selectedClass?.students || !quizzesInClass) {
        setAtRiskByQuarter({}); // Ensure it's clear if we bail
        return;
      }

      setIsLoading(true);
      try {
        const quarterGroups = { 1: [], 2: [], 3: [], 4: [] };

        // --- OPTIMIZATION: N+1 Query Fix ---
        // 1. Fetch ALL submissions for the class in ONE query
        const allSubsQ = query(
          collection(db, "quizSubmissions"),
          where("classId", "==", selectedClassId)
        );
        const allSubsSnap = await getDocs(allSubsQ);

        // 2. Group submissions by studentId in-memory
        const subsByStudent = {};
        allSubsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (!data.studentId) return; // Skip subs without studentId
          if (!subsByStudent[data.studentId]) {
            subsByStudent[data.studentId] = [];
          }
          subsByStudent[data.studentId].push(data);
        });
        // --- End of Optimization ---

        // 3. Process each student's submissions (now from memory)
        for (const student of selectedClass.students) {
          const studentName =
            student.firstName && student.lastName
              ? `${student.firstName} ${student.lastName}`
              : student.name || student.id || "Unnamed Student";
          const studentId = student.id || student.userId || student.uid;
          if (!studentId) continue;

          // Get this student's submissions from our in-memory map
          const studentSubmissions = subsByStudent[studentId] || [];

          const firstAttemptsPerQuiz = {};
          studentSubmissions.forEach((data) => {
            const submittedAt = data.submittedAt?.seconds
              ? data.submittedAt.seconds
              : new Date(data.submittedAt).getTime() / 1000;
            if (
              !firstAttemptsPerQuiz[data.quizId] ||
              submittedAt < firstAttemptsPerQuiz[data.quizId].submittedAt
            ) {
              firstAttemptsPerQuiz[data.quizId] = { ...data, submittedAt };
            }
          });

          const quarterScores = { 1: [], 2: [], 3: [], 4: [] };
          Object.values(firstAttemptsPerQuiz).forEach((attempt) => {
            // Find the quiz data (already loaded in the first effect)
            const quiz = quizzesInClass.find((q) => q.id === attempt.quizId);
            const quarter = attempt.quarter || quiz?.quarter;
            if (quarter && [1, 2, 3, 4].includes(quarter)) {
              const percent =
                attempt.totalItems > 0
                  ? (attempt.score / attempt.totalItems) * 100
                  : 0;
              quarterScores[quarter].push(percent);
            }
          });

          Object.keys(quarterScores).forEach((q) => {
            const scores = quarterScores[q];
            if (scores.length > 0) {
              const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
              if (avg < 75)
                quarterGroups[q].push({
                  id: studentId,
                  name: studentName,
                  reasons: [`Quarter ${q}: Avg ${avg.toFixed(0)}%`],
                });
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
  }, [analysisType, selectedClassId, selectedClass, quizzesInClass]); // Dependencies for this specific task


  // (This effect is unchanged, it was already efficient)
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

      const subsQ = query(
        collection(db, "quizSubmissions"),
        where("quizId", "==", selectedQuizId),
        where("classId", "==", selectedClassId)
      );
      const subsSnap = await getDocs(subsQ);
      const submissions = subsSnap.docs.map((d) => d.data());

      if (submissions.length === 0) {
        setItemAnalysisData([]);
        setIsLoading(false);
        return;
      }

      // ✅ keep only first attempts
      const firstAttempts = {};
      submissions.forEach((sub) => {
        const submittedAt = sub.submittedAt?.seconds
          ? sub.submittedAt.seconds
          : new Date(sub.submittedAt).getTime() / 1000;
        if (
          !firstAttempts[sub.studentId] ||
          submittedAt < firstAttempts[sub.studentId].submittedAt
        ) {
          firstAttempts[sub.studentId] = { ...sub, submittedAt };
        }
      });
      const uniqueSubmissions = Object.values(firstAttempts);

      // --- Analyze answers ---
      const questionAnalysis = {};
      uniqueSubmissions.forEach((submission) => {
        (submission.answers || []).forEach((answer) => {
          if (!answer || !answer.questionText) return;

          // Initialize
          if (!questionAnalysis[answer.questionText]) {
            questionAnalysis[answer.questionText] = {
              correct: 0,
              total: 0,
              type: answer.questionType || "multiple-choice",
              breakdown: [],
            };
          }
          const qData = questionAnalysis[answer.questionText];

		  if (answer.questionType === "matching-type") {
		    const prompts = answer.prompts || [];

		    // Count each prompt pair
		    prompts.forEach((p) => {
		      const studentChoice = p.userAnswerText || null;
		      const correctChoice = p.correctAnswerText || null;
		      const isPairCorrect =
		        p.userAnswerId && p.userAnswerId === p.correctAnswerId;

		      if (isPairCorrect) qData.correct++;
		      qData.total++;

		      qData.breakdown.push({
		        promptId: p.id || p.promptId,
		        promptText: p.text || p.promptText || "",
		        studentChoice,
		        correctChoice,
		        isCorrect: isPairCorrect,
		      });
		    });
		  } else {
		    // non-matching → count once
		    qData.total++;
		    if (answer.isCorrect) qData.correct++;
		  }

        });
      });

      // --- Summarize results ---
      const results = Object.keys(questionAnalysis).map((question) => {
        const { correct, total, type, breakdown } = questionAnalysis[question];
        return {
          question,
          correct,
          total,
          difficulty:
            total > 0 ? ((correct / total) * 100).toFixed(0) + "%" : "N/A",
          type,
          breakdown: type === "matching-type" ? breakdown : undefined,
        };
      });

      setItemAnalysisData(results);

      // --- Load lesson details ---
      const quizDoc = quizzesInClass.find((q) => q.id === selectedQuizId);
      if (quizDoc?.lessonId) {
        try {
          const lessonRef = doc(db, "lessons", quizDoc.lessonId);
          const lessonSnap = await getDoc(lessonRef);
          if (lessonSnap.exists()) {
            setLessonData({ id: lessonSnap.id, ...lessonSnap.data() });
          } else {
            setLessonData(null);
          }
        } catch (err) {
          console.error("Error fetching lesson:", err);
          setLessonData(null);
        }
      } else {
        setLessonData(null);
      }

      setIsLoading(false);
    };

    analyzeQuizData();
  }, [selectedQuizId, selectedClassId, quizzesInClass]);

  // (This effect is unchanged, it was already efficient)
  useEffect(() => {
    const loadSavedRecs = async () => {
      if (!selectedClassId) {
        setSavedRecs([]);
        return;
      }
      const q = query(
        collection(db, "recommendations"),
        where("classId", "==", selectedClassId)
      );
      const snap = await getDocs(q);
      setSavedRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    loadSavedRecs();
  }, [selectedClassId, isSaving]);
 

  // --- Generate Narrative Analysis ---
  // (All remaining functions are unchanged as they are user-triggered and not part of the initial load)
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

        2. **Actionable Recommendation:** Based on your analysis, provide a clear, single recommendation by following these **strict rules** tied to the computed general average of student performance:

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

    // 🧩 NEW: Guard clause for missing lessonData
    if (!lessonData) {
      alert("Lesson data is missing. Please ensure the selected quiz is linked to a lesson before generating remediation.");
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
	const lessonText = (lessonData?.pages || [])
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
        alert("The monthly limit for AI recommendations has been. Please contact support.");
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

  // (exportRecToPDF remains unchanged)
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

  // (saveRecommendationToFirestore remains unchanged)
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
  
  // (deleteRecommendation remains unchanged)
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

  // (groupedSavedRecs useMemo remains unchanged)
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

  // (Modal open handlers remain unchanged)
  const openViewModal = (recDoc) => { setViewingRec(recDoc); setViewModalOpen(true); };
  const openEditModal = (recDoc) => { setEditingRec(recDoc); setEditModalOpen(true); };

  const quarterOptions = [
    { value: "", label: "-- Select Quarter --" },
    { value: "1", label: "Quarter 1" },
    { value: "2", label: "Quarter 2" },
    { value: "3", label: "Quarter 3" },
    { value: "4", label: "Quarter 4" },
  ];

  // (Return/JSX is unchanged, as the logic changes were in the effects)
  return (
    // --- MODIFIED: Added dark theme base ---
    <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto dark:bg-neumorphic-base-dark">
      <div className="md:col-span-2">
	{(isLoading || isGeneratingRemediation) && (
	  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
	    <Spinner size="lg" />
	  </div>
	)}
      {/* --- MODIFIED: Added dark theme text --- */}
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-6">Class Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
          {/* --- MODIFICATION START --- */}
          <div className="mb-4">
            {/* --- MODIFIED: Added dark theme text --- */}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select a Class to Analyze</label>
            {/* --- MODIFIED: Added dark theme styles --- */}
            <div className="border rounded-lg bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg dark:border-slate-700">
              <button 
                onClick={() => setIsClassDropdownOpen(prev => !prev)} 
                // --- MODIFIED: Added dark theme text/hover ---
                className="w-full flex justify-between items-center px-4 py-3 font-semibold text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-400"
              >
                <span className="text-base">
                  {selectedClass ? selectedClass.name : "-- Choose a Class --"}
                </span>
                <IconChevronDown className={`h-5 w-5 transition-transform ${isClassDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {isClassDropdownOpen && (
                <div className="pl-4 pr-2 pb-2 space-y-1 overflow-y-auto max-h-60">
                  {/* "Choose a Class" option */}
                  <button 
                    onClick={() => {
                      setSelectedClassId("");
                      setSelectedQuizId(""); // Clear dependent state
                      setIsClassDropdownOpen(false); // Close dropdown
                    }}
                    // --- MODIFIED: Added dark theme active/hover/text ---
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedClassId === "" ? "bg-sky-100 text-sky-700 font-semibold dark:bg-sky-500/20 dark:text-sky-400" : "hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-200"}`}
                  >
                    -- Choose a Class --
                  </button>
                  {/* Map over the active classes */}
                  {activeClasses.map((cls) => (
                    <button 
                      key={cls.id} 
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setSelectedQuizId(""); // Clear dependent state
                        setIsClassDropdownOpen(false); // Close dropdown
                      }}
                      // --- MODIFIED: Added dark theme active/hover/text ---
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedClassId === cls.id ? "bg-sky-100 text-sky-700 font-semibold dark:bg-sky-500/20 dark:text-sky-400" : "hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-200"}`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* --- MODIFICATION END --- */}

          <div className="flex flex-col gap-2">
            {/* --- MODIFIED: Added dark theme styles for all 3 buttons --- */}
            <button onClick={() => setAnalysisType("students")} className={`px-4 py-2 rounded-xl transition-all shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg ${analysisType === "students" ? "bg-neumorphic-base shadow-neumorphic-inset text-sky-700 font-bold dark:shadow-neumorphic-inset-dark dark:text-sky-400" : "bg-neumorphic-base text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"}`}>At-Risk Students</button>
            <button onClick={() => setAnalysisType("quizzes")} className={`px-4 py-2 rounded-xl transition-all shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg ${analysisType === "quizzes" ? "bg-neumorphic-base shadow-neumorphic-inset text-sky-700 font-bold dark:shadow-neumorphic-inset-dark dark:text-sky-400" : "bg-neumorphic-base text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"}`}>Quiz Item Analysis</button>
            <button onClick={() => setAnalysisType("recommendations")} className={`px-4 py-2 rounded-xl transition-all shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg ${analysisType === "recommendations" ? "bg-neumorphic-base shadow-neumorphic-inset text-sky-700 font-bold dark:shadow-neumorphic-inset-dark dark:text-sky-400" : "bg-neumorphic-base text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"}`}>Recommendations & Remediations</button>
          </div>
          
          {/* --- MODIFICATION START --- */}
          {analysisType === "students" && (
            <div className="mt-4">
              {/* --- MODIFIED: Added dark theme styles --- */}
              <div className="border rounded-lg bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg dark:border-slate-700">
                <button 
                  onClick={() => setIsQuarterDropdownOpen(prev => !prev)} 
                  // --- MODIFIED: Added dark theme text/hover ---
                  className="w-full flex justify-between items-center px-4 py-3 font-semibold text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-400"
                >
                  <span className="text-base">
                    {(quarterOptions.find(q => q.value === selectedQuarter) || quarterOptions[0]).label}
                  </span>
                  <IconChevronDown className={`h-5 w-5 transition-transform ${isQuarterDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isQuarterDropdownOpen && (
                  <div className="pl-4 pr-2 pb-2 space-y-1 overflow-y-auto max-h-60">
                    {quarterOptions.map((opt) => (
                      <button 
                        key={opt.value} 
                        onClick={() => {
                          setSelectedQuarter(opt.value);
                          setIsQuarterDropdownOpen(false); // Close dropdown
                        }}
                        // --- MODIFIED: Added dark theme active/hover/text ---
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedQuarter === opt.value ? "bg-sky-100 text-sky-700 font-semibold dark:bg-sky-500/20 dark:text-sky-400" : "hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-200"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* --- MODIFICATION END --- */}

          {analysisType === "quizzes" && (
            <div className="space-y-2 mt-4">
              {Object.keys(quizzesInClass.reduce((acc, quiz) => {
                const unitName = quiz.unitDisplayName || "Uncategorized";
                if (!acc[unitName]) acc[unitName] = [];
                acc[unitName].push(quiz);
                return acc;
              }, {})).sort(customUnitSort).map((unitName) => (
                // --- MODIFIED: Added dark theme styles ---
                <div key={unitName} className="border rounded-lg bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg dark:border-slate-700">
                  {/* --- MODIFIED: Added dark theme text/hover --- */}
                  <button onClick={() => setOpenUnit(openUnit === unitName ? null : unitName)} className="w-full flex justify-between items-center px-4 py-2 font-semibold text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-400">
                    <span>{unitName}</span>
                    <IconChevronDown className={`h-5 w-5 transition-transform ${openUnit === unitName ? "rotate-180" : ""}`} />
                  </button>
                  {openUnit === unitName && (
                    <div className="pl-4 pr-2 pb-2 space-y-1 overflow-y-auto max-h-60">
                      {quizzesInClass.filter((q) => (q.unitDisplayName || "Uncategorized") === unitName).sort((a, b) => a.title.localeCompare(b.title)).map((q) => (
                        // --- MODIFIED: Added dark theme active/hover/text ---
                        <button key={q.id} onClick={() => setSelectedQuizId(q.id)} className={`block w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedQuizId === q.id ? "bg-sky-100 text-sky-700 font-semibold dark:bg-sky-500/20 dark:text-sky-400" : "hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-200"}`}>
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

          {analysisType === "students" && ( // Show this content only when not loading
        
                <div>
                  {selectedQuarter ? (
                    atRiskByQuarter[selectedQuarter]?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {atRiskByQuarter[selectedQuarter].map((st) => (
                          // --- MODIFIED: Added dark theme card styles ---
                          <div key={st.id} className="p-4 bg-neumorphic-base rounded-2xl shadow-neumorphic border-l-4 border-amber-500 dark:bg-neumorphic-base-dark dark:shadow-lg dark:border-amber-400">
                            {/* --- MODIFIED: Added dark theme icon/text --- */}
                            <div className="flex items-center gap-3"><IconAlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" /><h3 className="font-bold text-slate-800 dark:text-slate-100">{st.name}</h3></div>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <ul className="mt-2 ml-9 text-sm text-slate-600 dark:text-slate-400 list-disc list-inside">{st.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // --- MODIFIED: Added dark theme text ---
                      <p className="text-slate-500 dark:text-slate-400 text-sm ml-2">No at-risk students found for this quarter.</p>
                    )
                  ) : (
                    // --- MODIFIED: Added dark theme text ---
                    selectedClassId && <p className="text-slate-500 dark:text-slate-400 text-sm ml-2">Please select a quarter to view at-risk students.</p>
                  )}
                </div>
              )}
              {analysisType === "quizzes" && (
                <div>
                  {/* --- MODIFIED: Added dark theme text --- */}
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Quiz Item Analysis</h2>
                  {selectedQuizId && itemAnalysisData && itemAnalysisData.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* --- MODIFIED: Added dark theme button styles --- */}
                        <button onClick={exportItemAnalysisToCSV} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400 flex items-center gap-2 text-sm">
                            <IconDownload size={16} /><span>Download Analysis</span>
                        </button>
                        {/* --- MODIFIED: Added dark theme button styles --- */}
                        <button onClick={generateAnalysisReport} disabled={isAnalyzing} className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400 dark:disabled:opacity-50 flex items-center gap-2 text-sm">
                          {isAnalyzing && <Spinner size="sm" />}
                          {isAnalyzing ? "Analyzing..." : "Analyze Performance"}
                        </button>
                      </div>
                      {/* --- MODIFIED: Added dark theme text --- */}
                      <div className="text-sm text-slate-500 dark:text-slate-400">Weak threshold: &lt; 75% mastery</div>
                    </div>
                  )}
                  {selectedQuizId && itemAnalysisData && itemAnalysisData.length > 0 ? (
                    // --- MODIFIED: Added dark theme table container ---
                    <div className="overflow-x-auto bg-neumorphic-base rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg mb-6">
                      <table className="w-full text-sm text-left">
                        {/* --- MODIFIED: Added dark theme table head --- */}
                        <thead className="text-xs text-slate-700 uppercase bg-neumorphic-base shadow-neumorphic-inset dark:text-slate-300 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark"><tr><th className="px-6 py-3">Question</th><th className="px-6 py-3 text-center">Correct / Total</th><th className="px-6 py-3 text-right">Mastery Level</th></tr></thead>
					<tbody>
					  {itemAnalysisData.map((item, i) => {
					    const isExpanded = expandedRows[i] || false;

					    return (
					      <React.Fragment key={i}>
                            {/* --- MODIFIED: Added dark theme table row border --- */}
					        <tr className="border-t border-slate-200 dark:border-t dark:border-slate-700">
                              {/* --- MODIFIED: Added dark theme text --- */}
					          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
					            <div className="flex items-center justify-between">
						<span>
						  {item.type === "matching-type"
						    ? "Matching Type Part"
						    : item.question}
						</span>
					              
					              {item.type === "matching-type" && item.breakdown && (
                                    // --- MODIFIED: Added dark theme text ---
					                <button
					                  onClick={() =>
					                    setExpandedRows((prev) => ({
					                      ...prev,
					                      [i]: !prev[i],
					                    }))
					                  }
					                  className="ml-3 text-xs text-sky-600 hover:underline focus:outline-none dark:text-sky-400"
					                >
					                  {isExpanded ? "Hide Details" : "View Details"}
					                </button>
					              )}
					            </div>
					          </td>
					          <td className="px-6 py-4 text-center">
					            {item.correct} / {item.total}
					          </td>
					          <td className="px-6 py-4 font-bold text-right">{item.difficulty}</td>
					        </tr>

					        {/* 🔹 Expandable breakdown row */}
							{item.type === "matching-type" && item.breakdown && isExpanded && (
                              // --- MODIFIED: Added dark theme expanded row ---
							  <tr className="border-t border-slate-100 bg-slate-50 dark:border-t dark:border-slate-700 dark:bg-slate-800">
							    <td colSpan={3} className="px-6 py-4">
                                  {/* --- MODIFIED: Added dark theme text --- */}
							      <div className="text-sm text-slate-700 dark:text-slate-300">
							        <strong>Matching Breakdown:</strong>
							        <ul className="ml-4 mt-2 space-y-1 list-disc">
							          {item.breakdown.map((pair, idx) => (
                                        // --- MODIFIED: Added dark theme text colors ---
							            <li
							              key={idx}
							              className={pair.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
							            >
							              <span className="font-medium">Prompt:</span>{" "}
							              {pair.promptText || `#${pair.promptId}`} <br />
							              <span className="ml-2">
							                Student → {pair.studentChoice || "No Answer"}
							              </span>
							              ,{" "}
							              <span className="ml-2">
							                Correct → {pair.correctChoice}
							              </span>
							            </li>
							          ))}
							        </ul>
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
                    // --- MODIFIED: Added dark theme text ---
                    selectedQuizId ? <p className="text-center text-slate-500 dark:text-slate-400 mt-8">No submissions found for this quiz.</p> : (selectedClassId && <p className="text-center text-slate-500 dark:text-slate-400 mt-8">Select a quiz from the list to see its item analysis.</p>)
                  )}
                </div>
              )}
              {analysisType === "recommendations" && (
                <div>
                  {/* --- MODIFIED: Added dark theme text --- */}
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Saved Recommendations</h2>
                  <div className="space-y-3">
                    {/* --- MODIFIED: Added dark theme text --- */}
                    {Object.keys(groupedSavedRecs).length === 0 && <p className="text-slate-500 dark:text-slate-400 text-sm">No saved recommendations yet for this class.</p>}
                    {Object.keys(groupedSavedRecs).sort(customUnitSort).map((unitTitle) => (
                      // --- MODIFIED: Added dark theme card ---
                      <div key={unitTitle} className="border rounded-lg bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg dark:border-slate-700">
                        {/* --- MODIFIED: Added dark theme button text/hover --- */}
                        <button onClick={() => setOpenRecsUnit(openRecsUnit === unitTitle ? null : unitTitle)} className="w-full flex justify-between items-center px-4 py-2 font-semibold text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-400">
                          <span>{unitTitle}</span>
                          <IconChevronDown className={`h-5 w-5 transition-transform ${openRecsUnit === unitTitle ? "rotate-180" : ""}`} />
                        </button>
                        {openRecsUnit === unitTitle && (
                          <div className="pl-4 pr-2 pb-3 space-y-2 overflow-y-auto max-h-60">
                            {groupedSavedRecs[unitTitle].map((recDoc) => (
                              // --- MODIFIED: Added dark theme inner card ---
                              <div key={recDoc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                                <button onClick={() => openViewModal(recDoc)} className="text-left flex-1">
                                  {/* --- MODIFIED: Added dark theme text --- */}
                                  <div className="font-medium text-slate-800 dark:text-slate-100">{recDoc.lessonTitle || "Unnamed Lesson"} Remediation</div>
                                  {/* --- MODIFIED: Added dark theme text --- */}
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{recDoc.createdAt?.toDate ? recDoc.createdAt.toDate().toLocaleString() : ""}</div>
                                </button>
                                <div className="flex items-center gap-1">
                                  {/* --- MODIFIED: Added dark theme button styles --- */}
                                  <button title="Export PDF" onClick={() => exportRecToPDF(recDoc)} disabled={exportingPdfId === recDoc.id} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:opacity-50">
                                    {exportingPdfId === recDoc.id ? <Spinner size="sm" /> : <IconFileExport size={16} />}
                                  </button>
                                  {/* --- MODIFIED: Added dark theme button styles --- */}
                                  <button title="Edit" onClick={() => openEditModal(recDoc)} className="p-2 rounded-full hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"><IconEdit size={16} /></button>
                                  {/* --- MODIFIED: Added dark theme button styles --- */}
                                  <button title="Delete" onClick={() => deleteRecommendation(recDoc)} className="p-2 rounded-full hover:bg-slate-100 text-red-600 dark:text-red-400 dark:hover:bg-slate-700"><IconTrash size={16} /></button>
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
        </div>
      </div>
            
      {!selectedClassId && !isLoading && ( // Only show placeholder if not loading
        <div className="text-center mt-16">
          {/* --- MODIFIED: Added dark theme icon/text --- */}
          <IconAnalyze size={48} className="mx-auto text-slate-400 dark:text-slate-500" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Please select a class to view its analytics.</p>
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