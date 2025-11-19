import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon, DocumentChartBarIcon, LanguageIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';
import ProgressIndicator from '../common/ProgressIndicator';
import SourceContentSelector from '../../hooks/SourceContentSelector';

// --- Helper Functions ---

const extractJson = (text) => {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    return null;
};

const tryParseJson = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("Standard JSON.parse failed. Attempting to fix.", error);
    let sanitizedString = jsonString
      .replace(/```json|```/g, '')
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":') // Quote keys
      .replace(/[“”]/g, '"') // Smart quotes
      .replace(/[\u0000-\u001F]+/g, ' ') // Clean control chars
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\') // Fix backslashes
      .trim();
    try {
      return JSON.parse(sanitizedString);
    } catch (finalError) {
      console.error("Failed to parse JSON even after sanitization.", finalError);
      throw new Error("Invalid JSON format received from AI.");
    }
  }
};

export default function CreateUlpModal({ isOpen, onClose, unitId: initialUnitId, subjectId }) {
    const { showToast } = useToast();

    // --- Neumorphic Styles ---
    const neuInput = "w-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-lg py-2.5 px-4 text-slate-700 dark:text-slate-100 shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:shadow-neumorphic-inset-dark focus:outline-none focus:ring-2 focus:ring-sky-500 transition border-2 border-slate-200 dark:border-neumorphic-base-dark focus:border-slate-300 dark:focus:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500";
    const neuCard = "bg-slate-200 dark:bg-neumorphic-base-dark p-4 rounded-xl shadow-[6px_6px_12px_#bdc1c6,-6px_-6px_12px_#ffffff] dark:shadow-lg";
    const neuInsetCard = "bg-slate-200 dark:bg-neumorphic-base-dark p-4 rounded-xl shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:shadow-neumorphic-inset-dark";
    const neuButton = "px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-neumorphic-base-dark shadow-[5px_5px_10px_#bdc1c6,-5px_-5px_10px_#ffffff] dark:shadow-lg hover:shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:hover:shadow-neumorphic-inset-dark active:shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff] dark:active:shadow-neumorphic-inset-dark disabled:text-slate-400 dark:disabled:text-slate-600 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:shadow-neumorphic-inset-dark transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-neumorphic-base-dark";
    const neuButtonPrimary = "px-8 py-3 bg-slate-200 font-semibold text-sky-600 dark:text-sky-400 rounded-xl shadow-[5px_5px_10px_#bdc1c6,-5px_-5px_10px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-lg hover:shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:hover:shadow-neumorphic-inset-dark active:shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff] dark:active:shadow-neumorphic-inset-dark disabled:text-slate-400 dark:disabled:text-slate-600 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:shadow-neumorphic-inset-dark transition-shadow duration-200";
    const neuHeaderIcon = "p-3 rounded-xl text-zinc-700 dark:text-zinc-300 bg-slate-200 dark:bg-neumorphic-base-dark shadow-[4px_4px_10px_#bdc1c6,-4px_-4px_10px_#ffffff] dark:shadow-lg inline-flex items-center justify-center";
    
    // --- State ---
    const [inputs, setInputs] = useState({
        contentStandard: '',
        performanceStandard: '',
        learningCompetencies: '',
    });
    const [generationTarget, setGenerationTarget] = useState('teacherGuide');
    const [allSubjects, setAllSubjects] = useState([]);
    const [unitsForSubject, setUnitsForSubject] = useState([]);
    const [lessonsForUnit, setLessonsForUnit] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
    const [selectedUnitIds, setSelectedUnitIds] = useState(new Set(initialUnitId ? [initialUnitId] : []));
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [existingLessonCount, setExistingLessonCount] = useState(0);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

    // --- Data Fetching ---
    useEffect(() => {
        if (!isOpen) return;
        setIsLoadingSubjects(true);
        const subjectsQuery = query(collection(db, 'courses'), orderBy('title'));
        const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
            const allFetchedSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const uniqueCategories = [...new Set(allFetchedSubjects.map(subject => subject.category).filter(Boolean))];
            const learnerCategoryNames = uniqueCategories.filter(name => !name.toLowerCase().includes("teach"));
            const learnerSubjects = allFetchedSubjects.filter(subject => subject.category && learnerCategoryNames.includes(subject.category));
            setAllSubjects(learnerSubjects);
            setIsLoadingSubjects(false);
        }, (error) => {
            console.error("Error fetching subjects:", error);
            showToast("Error fetching subjects.", "error");
            setIsLoadingSubjects(false);
        });
        return () => unsubscribe();
    }, [isOpen, showToast]);

    useEffect(() => {
        if (selectedSubjectId) {
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', selectedSubjectId), orderBy('order'));
            const unsub = onSnapshot(unitsQuery, (snapshot) => setUnitsForSubject(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
            return () => unsub();
        } else {
            setUnitsForSubject([]);
        }
    }, [selectedSubjectId]);
    
    useEffect(() => {
        if (selectedSubjectId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', selectedSubjectId), orderBy('order'));
            const unsub = onSnapshot(lessonsQuery, (snapshot) => setLessonsForUnit(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
            return () => unsub();
        } else {
            setLessonsForUnit([]);
        }
    }, [selectedSubjectId]);

    useEffect(() => {
        if (isOpen && initialUnitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', initialUnitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => setExistingLessonCount(snapshot.size));
            return () => unsubscribe();
        }
    }, [isOpen, initialUnitId]);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
    }, []);

    // --- Memoized Source Info ---
    const sourceInfo = useMemo(() => {
        if (selectedUnitIds.size === 0) return { title: '', content: '', lessonTitles: [], error: "Please select at least one source unit." };
        const unitDetails = Array.from(selectedUnitIds).map(id => unitsForSubject.find(u => u.id === id)).filter(Boolean);
        const title = unitDetails.map(u => u.title).join(' & ');
        let formattedLessonList = [];
        unitDetails.forEach(unit => {
            formattedLessonList.push(`Unit: ${unit.title}`);
            const relevantLessons = lessonsForUnit.filter(lesson => lesson.unitId === unit.id);
            relevantLessons.forEach(lesson => formattedLessonList.push(`- ${lesson.title}`));
        });
        const relevantLessons = lessonsForUnit.filter(lesson => selectedUnitIds.has(lesson.unitId));
        const lessonTitles = formattedLessonList;
        const content = relevantLessons.map(l => l.pages.map(p => p.content).join('\n')).join('\n\n---\n\n');
        if (!content && generationTarget === 'teacherGuide') return { title, content: '', lessonTitles, error: `The selected unit(s) '${title}' appear to have no lesson content.`};
        return { title, content, lessonTitles, error: null };
    }, [selectedUnitIds, unitsForSubject, lessonsForUnit, generationTarget]);

    const handleToggleUnitExpansion = (unitId) => {
        const newSet = new Set(expandedScaffoldUnits);
        if (newSet.has(unitId)) newSet.delete(unitId); else newSet.add(unitId);
        setExpandedScaffoldUnits(newSet);
    };
    
    const handleUnitCheckboxChange = (lessonsInUnit) => {
        const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
        const currentlySelectedInUnit = lessonIdsInUnit.filter(id => scaffoldLessonIds.has(id));
        const newSet = new Set(scaffoldLessonIds);
        if (currentlySelectedInUnit.length === lessonIdsInUnit.length) {
            lessonIdsInUnit.forEach(id => newSet.delete(id));
        } else {
            lessonIdsInUnit.forEach(id => newSet.add(id));
        }
        setScaffoldLessonIds(newSet);
    };

    // --- Schema Definitions ---
    const ulpSchemas = {
      explore: ["type", "lessonsList", "unitOverview", "hookedActivities", "mapOfConceptualChange", "essentialQuestions"],
      firmUp: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity", "supportDiscussion", "assessment", "templates"],
      deepen: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity", "supportDiscussion", "assessment", "templates"],
      transfer: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity"],
      synthesis: ["type", "summary"],
      performanceTask: ["type", "graspsTask", "rubric"],
      values: ["type", "values"],
    };

    const validateUlpJson = (type, jsonObj) => {
      const requiredKeys = ulpSchemas[type];
      if (!requiredKeys) return true;
      const missing = requiredKeys.filter(key => !(key in jsonObj));
      if (missing.length > 0) throw new Error(`Invalid JSON for '${type}'. Missing keys: ${missing.join(", ")}`);
      return true;
    };

    /**
     * --- UPGRADED GENERATION LOGIC (Restored & Safe) ---
     * Pedagogically aligned with PEAC / DepEd standards AND technically safe.
     */
    const generateUlpSection = async (type, context, maxRetries = 3) => {
      let prompt;
      const iCan = context.language === 'Filipino' ? 'Kaya kong...' : 'I can...';
      const isFilipino = context.language === 'Filipino';

      const commonRules = `
    **ROLE:** Expert Curriculum Developer for DepEd Philippines / PEAC.
    **INPUTS:**
    - Standards: ${context.contentStandard} / ${context.performanceStandard}
    - Content: ${context.sourceLessonTitles}
    - Language: ${context.language}

    **CRITICAL TECHNICAL RULES (NON-NEGOTIABLE):**
    1. **OUTPUT:** Respond ONLY with a valid JSON object. No markdown fences (\`\`\`), no commentary.
    2. **ESCAPING:** You MUST escape all double quotes inside string values (e.g., \\").
    3. **NO NEWLINES:** Do not put real line breaks or tabs inside string values. Use \\n for line breaks.
    4. **FORMATTING:** Use plain text only inside strings. No HTML tags.
    
    **PEDAGOGICAL RULES:**
    1. **FRAMEWORK:** Strictly follow the PEAC "Understanding by Design" (UbD) framework.
    2. **LANGUAGE:** ${isFilipino ? "Formal Filipino (Academic)." : "Academic English."}
    `;

      switch (type) {
        case 'explore':
          prompt = `
    ${commonRules}
    **TASK:** Generate "Explore" (Diagnosis/Hook).
    **JSON STRUCTURE:**
    {
      "type": "explore",
      "lessonsList": "Bulleted list of lessons.",
      "unitOverview": "Academic summary of the unit.",
      "hookedActivities": "Engaging hook activity instructions.",
      "mapOfConceptualChange": "Diagnostic activity (e.g., KWL, IRF).",
      "essentialQuestions": ["EQ1", "EQ2"]
    }
    `;
          break;

        case 'firmUp':
          prompt = `
    ${commonRules}
    **TASK:** Generate "Firm-Up" (Acquisition) for: "${context.competency}" (${context.code}).
    **JSON STRUCTURE:**
    {
      "type": "firmUp",
      "code": "${context.code}",
      "competency": "${context.competency}",
      "learningTargets": ["${iCan} define...", "${iCan} identify..."],
      "successIndicators": ["Indicators..."],
      "inPersonActivity": { "instructions": "Step-by-step instructions...", "materials": "List..." },
      "onlineActivity": { "instructions": "Online alternative...", "materials": "Tools..." },
      "supportDiscussion": "Processing questions.",
      "assessment": { "type": "Quiz", "content": "Assessment content..." },
      "templates": "Flashcard/worksheet content."
    }
    `;
          break;

        case 'deepen':
          prompt = `
    ${commonRules}
    **TASK:** Generate "Deepen" (Meaning-Making) for: "${context.competency}" (${context.code}).
    **CRITICAL:** Must use **Guided Generalization** (C-E-R or Concept Map) to derive the Essential Understanding.
    **JSON STRUCTURE:**
    {
      "type": "deepen",
      "code": "${context.code}",
      "competency": "${context.competency}",
      "learningTargets": ["${iCan} explain...", "${iCan} justify..."],
      "successIndicators": ["Indicators..."],
      "inPersonActivity": { "instructions": "Guided Generalization activity...", "materials": "Worksheets..." },
      "onlineActivity": { "instructions": "Online collaboration...", "materials": "Links..." },
      "supportDiscussion": "Probing questions (Why/How?).",
      "assessment": { "type": "Reflection", "content": "Reflection prompt..." },
      "templates": "Graphic organizer content."
    }
    `;
          break;

        case 'transfer':
          prompt = `
    ${commonRules}
    **TASK:** Generate "Transfer" (Application) for: "${context.competency}" (${context.code}).
    **GOAL:** Scaffold for Performance Task (GRASPS). Focus on 21st Century Skills.
    **JSON STRUCTURE:**
    {
      "type": "transfer",
      "code": "${context.code}",
      "competency": "${context.competency}",
      "learningTargets": ["${iCan} apply...", "${iCan} create..."],
      "successIndicators": ["Indicators..."],
      "inPersonActivity": { "instructions": "Mini-performance task...", "materials": "Rubrics..." },
      "onlineActivity": { "instructions": "Digital creation task...", "materials": "Tools..." }
    }
    `;
          break;

        case 'synthesis':
          prompt = `
    ${commonRules}
    **TASK:** Final Synthesis.
    **JSON STRUCTURE:** { "type": "synthesis", "summary": "Closure statement summarizing the Essential Understanding." }
    `;
          break;

        case 'performanceTask':
          prompt = `
    ${commonRules}
    **TASK:** Unit Performance Task (GRASPS).
    **JSON STRUCTURE:**
    {
      "type": "performanceTask",
      "graspsTask": {
        "goal": "...", "role": "...", "audience": "...", "situation": "...", "product": "...", "standards": "..."
      },
      "rubric": [
        { "criteria": "Content", "description": "...", "points": "20" },
        { "criteria": "Creativity", "description": "...", "points": "15" },
        { "criteria": "Presentation", "description": "...", "points": "15" }
      ]
    }
    `;
          break;

        case 'values':
          prompt = `
    ${commonRules}
    **TASK:** Integrate DepEd Core Values (Maka-Diyos, Maka-tao, Makakalikasan, Makabansa).
    **JSON STRUCTURE:**
    {
      "type": "values",
      "values": [
        { "name": "Maka-Diyos", "description": "..." },
        { "name": "Makakalikasan", "description": "..." }
      ]
    }
    `;
          break;

        default: return Promise.resolve(null);
      }

      let retries = 0;
      while (retries < maxRetries) {
        try {
          const jsonString = await callGeminiWithLimitCheck(prompt, { maxOutputTokens: 4096 });
          const parsedJson = tryParseJson(extractJson(jsonString));
          if (!parsedJson) throw new Error(`Failed to generate valid JSON for section: ${type}`);
          validateUlpJson(type, parsedJson);
          return parsedJson;
        } catch (error) {
          console.error(`Attempt ${retries + 1} for '${type}' failed.`, error);
          retries++;
          await new Promise(res => setTimeout(res, 1500));
        }
      }
      throw new Error(`Failed to generate section '${type}' after ${maxRetries} retries.`);
    };

    // --- HTML Assembler (Strict PEAC Table Format) ---
    const assembleUlpFromComponents = (components) => {
        let tbody = '';
        const esc = (text) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        const nl2br = (text) => esc(text || '').replace(/\n/g, '<br/>');

        // --- 1. EXPLORE ---
        const explore = components.find(c => c.type === 'explore');
        if (explore) {
            tbody += `
            <tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>EXPLORE</td></tr>
            <tr><td colspan='2' style='padding: 10px; border: 1px solid black; vertical-align: top;'>
                <strong>Unit Overview:</strong> ${nl2br(explore.unitOverview)}<br/><br/>
                <strong>Essential Questions:</strong><ul>${(explore.essentialQuestions || []).map(q => `<li>${esc(q)}</li>`).join('')}</ul>
                <strong>Map of Conceptual Change:</strong> ${nl2br(explore.mapOfConceptualChange)}<br/><br/>
                <strong>Hook Activity:</strong> ${nl2br(explore.hookedActivities)}
            </td></tr>`;
        }

        // --- Helper for Competency Rows ---
        const renderCompetencyRow = (item, stageName) => {
            const learningFocus = `
                <strong>${stageName} - ${esc(item.code)}</strong><br/>
                ${esc(item.competency)}<br/><br/>
                <strong>Learning Targets:</strong><ul>${(item.learningTargets || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
                <strong>Success Indicators:</strong><ul>${(item.successIndicators || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
            
            const learningExperience = `
                <strong>Activity:</strong><br/>${nl2br(item.inPersonActivity?.instructions)}<br/>
                <em>Materials: ${esc(item.inPersonActivity?.materials)}</em><br/><br/>
                ${item.supportDiscussion ? `<strong>Processing/Discussion:</strong><br/>${nl2br(item.supportDiscussion)}<br/><br/>` : ''}
                ${item.assessment ? `<strong>Assessment (${esc(item.assessment.type)}):</strong><br/>${nl2br(item.assessment.content)}` : ''}`;

            return `<tr>
                <td style='width: 40%; padding: 10px; border: 1px solid black; vertical-align: top;'>${learningFocus}</td>
                <td style='width: 60%; padding: 10px; border: 1px solid black; vertical-align: top;'>${learningExperience}</td>
            </tr>`;
        };

        // --- 2. FIRM-UP ---
        const firmUpItems = components.filter(c => c.type === 'firmUp').sort((a,b) => a.code.localeCompare(b.code));
        if (firmUpItems.length > 0) {
            tbody += `<tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>FIRM-UP (ACQUISITION)</td></tr>`;
            firmUpItems.forEach(item => tbody += renderCompetencyRow(item, 'Acquisition'));
        }

        // --- 3. DEEPEN ---
        const deepenItems = components.filter(c => c.type === 'deepen').sort((a,b) => a.code.localeCompare(b.code));
        if (deepenItems.length > 0) {
            tbody += `<tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>DEEPEN (MEANING-MAKING)</td></tr>`;
            deepenItems.forEach(item => tbody += renderCompetencyRow(item, 'Meaning-Making'));
        }

        // --- 4. TRANSFER ---
        const transferItems = components.filter(c => c.type === 'transfer').sort((a,b) => a.code.localeCompare(b.code));
        if (transferItems.length > 0) {
            tbody += `<tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>TRANSFER (APPLICATION)</td></tr>`;
            transferItems.forEach(item => tbody += renderCompetencyRow(item, 'Transfer'));
        }

        // --- 5. PERFORMANCE TASK ---
        const performanceTask = components.find(c => c.type === 'performanceTask');
        if (performanceTask) {
            const { graspsTask, rubric } = performanceTask;
            tbody += `
            <tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>PERFORMANCE TASK (GRASPS)</td></tr>
            <tr><td colspan='2' style='padding: 10px; border: 1px solid black;'>
                <p><strong>Goal:</strong> ${esc(graspsTask?.goal)}</p>
                <p><strong>Role:</strong> ${esc(graspsTask?.role)}</p>
                <p><strong>Audience:</strong> ${esc(graspsTask?.audience)}</p>
                <p><strong>Situation:</strong> ${esc(graspsTask?.situation)}</p>
                <p><strong>Product:</strong> ${esc(graspsTask?.product)}</p>
                <p><strong>Standards:</strong> ${esc(graspsTask?.standards)}</p>
                <hr/>
                <strong>Rubric:</strong>
                <ul>${(rubric || []).map(r => `<li><strong>${esc(r.criteria)} (${esc(String(r.points))}pts):</strong> ${esc(r.description)}</li>`).join('')}</ul>
            </td></tr>`;
        }

        // --- 6. VALUES ---
        const values = components.find(c => c.type === 'values');
        if (values && values.values) {
            const valuesHtml = values.values.map(v => `<strong>${esc(v.name)}:</strong> ${esc(v.description)}`).join('<br/>');
            tbody += `
            <tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>VALUES INTEGRATION</td></tr>
            <tr><td colspan='2' style='padding: 10px; border: 1px solid black;'>${valuesHtml}</td></tr>`;
        }

        return `<table style='width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; border: 1px solid black;'>
            <thead><tr>
                <th style='border: 1px solid black; background-color: #d0d0d0; padding: 10px; text-align: left;'>Learning Focus</th>
                <th style='border: 1px solid black; background-color: #d0d0d0; padding: 10px; text-align: left;'>Learning Experience</th>
            </tr></thead>
            <tbody>${tbody}</tbody>
        </table>`;
    };

    // --- Main Generation Handler ---
    const handleGenerate = async () => {
        if (generationTarget === 'teacherGuide') {
            if (!inputs.contentStandard || !inputs.performanceStandard || !inputs.learningCompetencies) {
                showToast("Please fill in all standard and competency fields.", "error"); return;
            }
            if (sourceInfo.error) { showToast(sourceInfo.error, "error"); return; }
            if (!sourceInfo.content) { showToast("No source content found for the selected scope.", "error"); return; }
        }
        setIsGenerating(true);
        setPreviewData(null);

        try {
            // --- STAGE 1: Outline ---
            setProgress(10);
            setProgressLabel('Step 1/3: Structuring competencies...');

            const outlinePrompt = `
                Act as a Curriculum Mapper. Analyze these Learning Competencies and group them into the 3 stages of the PEAC/DepEd framework:
                1. **Firm-Up** (Acquisition of facts/skills)
                2. **Deepen** (Making meaning/understanding)
                3. **Transfer** (Transfer of learning)
                
                **INPUTS:**
                - Content Standard: ${inputs.contentStandard}
                - Performance Standard: ${inputs.performanceStandard}
                - Competencies: ${inputs.learningCompetencies}
                
                **OUTPUT JSON:**
                {
                  "firmUp": [{"code": "A1", "competency": "..."}],
                  "deepen": [{"code": "M1", "competency": "..."}],
                  "transfer": [{"code": "T1", "competency": "..."}]
                }
            `;
            const outlineJsonText = await callGeminiWithLimitCheck(outlinePrompt, { maxOutputTokens: 2048 });
            const outline = tryParseJson(extractJson(outlineJsonText));

            if (!outline || !outline.firmUp) throw new Error("Failed to map competencies.");

            // --- STAGE 2: Parallel Generation ---
            setProgress(30);
            setProgressLabel('Step 2/3: Developing academic content...');

            const sharedContext = {
                contentStandard: inputs.contentStandard,
                performanceStandard: inputs.performanceStandard,
                sourceLessonTitles: sourceInfo.lessonTitles.join('\n'),
                language: selectedLanguage,
            };

            const sectionsToGenerate = [
                { type: 'explore' },
                ...outline.firmUp.map(item => ({ type: 'firmUp', ...item })),
                ...outline.deepen.map(item => ({ type: 'deepen', ...item })),
                ...outline.transfer.map(item => ({ type: 'transfer', ...item })),
                { type: 'synthesis' },
                { type: 'performanceTask' },
                { type: 'values' },
            ];

            const componentResults = [];
            const BATCH_SIZE = 3;
            for (let i = 0; i < sectionsToGenerate.length; i += BATCH_SIZE) {
                const batch = sectionsToGenerate.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(batch.map(section => generateUlpSection(section.type, { ...sharedContext, ...section })));
                componentResults.push(...results.filter(Boolean));
                if (i + BATCH_SIZE < sectionsToGenerate.length) await new Promise(r => setTimeout(r, 1500));
            }

            // --- STAGE 3: Assembly ---
            setProgress(90);
            setProgressLabel('Step 3/3: Finalizing document...');
            
            const finalHtml = assembleUlpFromComponents(componentResults);

            setPreviewData({
                generated_lessons: [{
                    lessonTitle: `ULP: ${sourceInfo.title}`,
                    learningObjectives: [],
                    pages: [{ title: "Unit Learning Plan", content: finalHtml }]
                }]
            });
            setProgress(100);

        } catch (err) {
            console.error("Generation Error:", err);
            showToast(err.message || "An error occurred.", "error");
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    const handleSave = async () => {
        if (!previewData || !previewData.generated_lessons) return;
        setIsSaving(true);
        const batch = writeBatch(db);
        previewData.generated_lessons.forEach((lesson, index) => {
            const newLessonRef = doc(collection(db, 'lessons'));
            batch.set(newLessonRef, {
                title: lesson.lessonTitle, pages: lesson.pages, objectives: [],
                unitId: initialUnitId, subjectId: subjectId, contentType: "teacherGuide",
                createdAt: serverTimestamp(), order: existingLessonCount + index,
            });
        });
        await batch.commit();
        showToast("ULP saved successfully!", "success");
        setIsSaving(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={!isSaving && !isGenerating ? onClose : () => {}} className="relative z-[110]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/80" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <Dialog.Panel className="relative p-6 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col bg-slate-200 dark:bg-neumorphic-base-dark shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] dark:shadow-lg border border-slate-300/50 dark:border-slate-700/50">
                    {(isGenerating || isSaving) && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm dark:bg-neumorphic-base-dark/80 flex flex-col justify-center items-center z-50 rounded-2xl space-y-3">
                            {isGenerating ? <ProgressIndicator progress={progress} /> : <Spinner />}
                            <p className="text-zinc-600 dark:text-slate-300">{isGenerating ? progressLabel : 'Saving...'}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-6 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={neuHeaderIcon}><DocumentChartBarIcon className="h-8 w-8 text-zinc-700 dark:text-zinc-300" /></div>
                            <div>
                                <Dialog.Title className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-slate-100">PEAC / DepEd ULP Generator</Dialog.Title>
                                <p className="text-sm text-zinc-500 dark:text-slate-400">Create academically aligned Unit Learning Plans.</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSaving || isGenerating} className={`${neuButton} !p-2 !rounded-full`}><XMarkIcon className="h-5 w-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                        {!previewData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-zinc-700 dark:text-slate-300 border-b border-zinc-200 dark:border-slate-700 pb-2">Authoritative Inputs</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Content Standard</label>
                                        <textarea name="contentStandard" value={inputs.contentStandard} onChange={handleInputChange} className={neuInput} rows={3} placeholder="The learner demonstrates understanding of..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Performance Standard</label>
                                        <textarea name="performanceStandard" value={inputs.performanceStandard} onChange={handleInputChange} className={neuInput} rows={3} placeholder="The learner is able to..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Learning Competencies</label>
                                        <textarea name="learningCompetencies" value={inputs.learningCompetencies} onChange={handleInputChange} className={neuInput} rows={4} placeholder="Paste competencies here..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Language</label>
                                        <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className={`${neuInput} appearance-none`}><option>English</option><option>Filipino</option></select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-zinc-700 dark:text-slate-300 border-b border-zinc-200 dark:border-slate-700 pb-2">Source Content</h3>
                                    <div className={neuCard}>
                                        <SourceContentSelector
                                            selectedSubjectId={selectedSubjectId}
                                            handleSubjectChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedUnitIds(new Set()); }}
                                            allSubjects={allSubjects}
                                            selectedUnitIds={selectedUnitIds}
                                            handleUnitSelectionChange={(id) => {
                                                const newSet = new Set(selectedUnitIds);
                                                if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                                                setSelectedUnitIds(newSet);
                                            }}
                                            unitsForSubject={unitsForSubject}
                                            loading={isLoadingSubjects}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-zinc-800 dark:text-slate-100">Preview</h2>
                                <div className="max-h-[65vh] overflow-y-auto border border-zinc-200 dark:border-slate-700 rounded-lg p-4 bg-zinc-100 dark:bg-slate-900/50">
                                    {previewData.generated_lessons.map((lesson, index) => (
                                        <div key={index} className="prose prose-slate dark:prose-invert max-w-none">
                                            <div dangerouslySetInnerHTML={{ __html: lesson.pages[0].content }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-zinc-200/80 dark:border-slate-700/50 mt-6">
                        {previewData ? (
                            <>
                                <button onClick={() => setPreviewData(null)} disabled={isSaving} className={`${neuButton} w-full sm:w-auto`}>Back to Edit</button>
                                <button onClick={handleSave} disabled={isSaving} className={`${neuButtonPrimary} w-full sm:w-auto`}>{isSaving ? 'Saving...' : 'Accept & Save'}</button>
                            </>
                        ) : (
                            <button onClick={handleGenerate} disabled={isGenerating || !selectedUnitIds.size} className={`${neuButtonPrimary} ml-auto w-full sm:w-auto`}>{isGenerating ? 'Generating...' : 'Generate ULP'}</button>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}