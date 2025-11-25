import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/[“”]/g, '"')
      .replace(/[\u0000-\u001F]+/g, ' ')
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
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

    // --- iPadOS 26 Styles ---
    const iosInput = "w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF] transition-all resize-none";
    const iosCard = "bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm";
    const iosBtnPrimary = "px-6 py-3 bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2 justify-center";
    const iosBtnSecondary = "px-6 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95";
    const iosLabel = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1";

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
     * --- UPGRADED GENERATION LOGIC WITH CONTEXT AWARENESS ---
     */
    const generateUlpSection = async (type, context, maxRetries = 3) => {
      let prompt;
      const iCan = context.language === 'Filipino' ? 'Kaya kong...' : 'I can...';
      const isFilipino = context.language === 'Filipino';

      // --- CONTEXT AWARENESS INJECTION ---
      const contextInjection = context.previousContent ? `
      **CONTINUITY CONTEXT (CRITICAL):**
      You are building upon previously generated sections.
      - Ensure flow and progression.
      - **Do NOT repeat** activities or assessments from the content below.
      - Reference prior concepts where applicable.
      
      --- PREVIOUSLY GENERATED CONTENT ---
      ${context.previousContent}
      --- END PREVIOUS CONTENT ---
      ` : "";

      const commonRules = `
    **ROLE:** Expert Curriculum Developer for DepEd Philippines / PEAC.
    **INPUTS:**
    - Standards: ${context.contentStandard} / ${context.performanceStandard}
    - Content: ${context.sourceLessonTitles}
    - Language: ${context.language}

    ${contextInjection}

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
    // DO NOT MODIFY STYLING AS REQUESTED
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

    // --- Main Generation Handler (SEQUENTIAL FOR CONTEXT) ---
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

            // --- STAGE 2: Sequential Generation (Context Aware) ---
            setProgress(30);
            setProgressLabel('Step 2/3: Developing academic content...');

            const sharedContext = {
                contentStandard: inputs.contentStandard,
                performanceStandard: inputs.performanceStandard,
                sourceLessonTitles: sourceInfo.lessonTitles.join('\n'),
                language: selectedLanguage,
            };

            // Prepare queue
            const sectionsQueue = [
                { type: 'explore' },
                ...outline.firmUp.map(item => ({ type: 'firmUp', ...item })),
                ...outline.deepen.map(item => ({ type: 'deepen', ...item })),
                ...outline.transfer.map(item => ({ type: 'transfer', ...item })),
                { type: 'synthesis' },
                { type: 'performanceTask' },
                { type: 'values' },
            ];

            const componentResults = [];
            let accumulatedContextString = ""; // Stores summary of previous parts

            for (let i = 0; i < sectionsQueue.length; i++) {
                const currentSection = sectionsQueue[i];
                
                // Update progress visualization
                const currentProgress = 30 + Math.floor((i / sectionsQueue.length) * 60);
                setProgress(currentProgress);
                setProgressLabel(`Developing: ${currentSection.type} (${i+1}/${sectionsQueue.length})`);

                // Generate with Context
                const result = await generateUlpSection(currentSection.type, { 
                    ...sharedContext, 
                    ...currentSection,
                    previousContent: accumulatedContextString // Pass context
                });

                if (result) {
                    componentResults.push(result);
                    
                    // Add summary to context for next iteration
                    // We stringify the result to give the AI full visibility of what it just created
                    // Truncate if too long to save tokens, but usually ULP sections are concise enough
                    accumulatedContextString += `\n[Completed ${currentSection.type}]: ${JSON.stringify(result)}\n`;
                }
                
                // Small delay to respect rate limits
                await new Promise(r => setTimeout(r, 1000));
            }

            // --- STAGE 3: Assembly ---
            setProgress(95);
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
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4 sm:p-6">
                <Dialog.Panel className="relative flex flex-col w-full max-w-6xl max-h-[90vh] rounded-[2rem] bg-white dark:bg-[#1C1C1E] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all transform">
                    
                    {/* Loading Overlay */}
                    {(isGenerating || isSaving) && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 space-y-6">
                            {isGenerating ? <ProgressIndicator progress={progress} /> : <Spinner />}
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{isGenerating ? 'Generating Plan' : 'Saving...'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isGenerating ? progressLabel : 'Writing to database'}</p>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-[#007AFF]">
                                <DocumentTextIcon className="h-8 w-8" />
                            </div>
                            <div>
                                <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ULP Generator</Dialog.Title>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">DepEd / PEAC Aligned Curriculum Builder</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            disabled={isSaving || isGenerating} 
                            className="p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-[#1C1C1E]">
                        {!previewData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                {/* Left Col */}
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-3 mb-5 flex items-center gap-2">
                                            1. Authoritative Inputs
                                        </h3>
                                        <div className="space-y-5">
                                            <div>
                                                <label className={iosLabel}>Content Standard</label>
                                                <textarea name="contentStandard" value={inputs.contentStandard} onChange={handleInputChange} className={iosInput} rows={3} placeholder="The learner demonstrates understanding of..." />
                                            </div>
                                            <div>
                                                <label className={iosLabel}>Performance Standard</label>
                                                <textarea name="performanceStandard" value={inputs.performanceStandard} onChange={handleInputChange} className={iosInput} rows={3} placeholder="The learner is able to..." />
                                            </div>
                                            <div>
                                                <label className={iosLabel}>Learning Competencies</label>
                                                <textarea name="learningCompetencies" value={inputs.learningCompetencies} onChange={handleInputChange} className={iosInput} rows={4} placeholder="Paste competencies here..." />
                                            </div>
                                            <div>
                                                <label className={iosLabel}>Language</label>
                                                <div className="relative">
                                                    <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className={`${iosInput} appearance-none`}>
                                                        <option>English</option>
                                                        <option>Filipino</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right Col */}
                                <div className="space-y-8">
                                    <section className="h-full flex flex-col">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-3 mb-5 flex items-center gap-2">
                                            2. Source Content
                                        </h3>
                                        <div className={`${iosCard} flex-1 overflow-hidden flex flex-col`}>
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
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Unit Learning Plan</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mt-2">{sourceInfo.title}</p>
                                </div>
                                <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm overflow-x-auto">
                                    {previewData.generated_lessons.map((lesson, index) => (
                                        <div key={index} className="prose prose-slate dark:prose-invert max-w-none">
                                            {/* Using the untouched HTML assembler output */}
                                            <div dangerouslySetInnerHTML={{ __html: lesson.pages[0].content }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 px-8 py-6 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] flex justify-end gap-3 z-20">
                        {previewData ? (
                            <>
                                <button onClick={() => setPreviewData(null)} disabled={isSaving} className={iosBtnSecondary}>Back to Edit</button>
                                <button onClick={handleSave} disabled={isSaving} className={iosBtnPrimary}>Accept & Save</button>
                            </>
                        ) : (
                            <button 
                                onClick={handleGenerate} 
                                disabled={isGenerating || !selectedUnitIds.size} 
                                className={iosBtnPrimary}
                            >
                                <SparklesIcon className="w-5 h-5" />
                                {isGenerating ? 'Generating...' : 'Generate ULP'}
                            </button>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}