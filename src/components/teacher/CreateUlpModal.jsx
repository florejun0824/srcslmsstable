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

// Helper function to extract JSON
const extractJson = (text) => {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
    }
    return null;
};

// A more robust JSON parsing function
const tryParseJson = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("Standard JSON.parse failed. Attempting to fix.", error);

    let sanitizedString = jsonString
      // remove markdown fences
      .replace(/```json|```/g, '')
      // remove trailing commas before } or ]
      .replace(/,\s*([}\]])/g, '$1')
      // ensure property names are wrapped in quotes
      .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
      // replace smart quotes with straight quotes
      .replace(/[“”]/g, '"')
      // escape raw newlines/tabs inside strings
      .replace(/[\u0000-\u001F]+/g, ' ')
      // fix unescaped backslashes
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
      // trim extra whitespace
      .trim();

    try {
      return JSON.parse(sanitizedString);
    } catch (finalError) {
      console.error("Failed to parse JSON even after sanitization.", finalError);
      console.debug("Sanitized JSON string:", sanitizedString.slice(0, 500)); // print first 500 chars for debugging
      throw new Error("Invalid JSON format received from AI.");
    }
  }
};


export default function CreateUlpModal({ isOpen, onClose, unitId: initialUnitId, subjectId }) {
    const { showToast } = useToast();

    // --- MODIFIED: Removed inline style objects ---

    // --- Neumorphic style constants (Tailwind) ---
    const neuInput = "w-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-lg py-2.5 px-4 text-slate-700 dark:text-slate-100 shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:shadow-neumorphic-inset-dark focus:outline-none focus:ring-2 focus:ring-sky-500 transition border-2 border-slate-200 dark:border-neumorphic-base-dark focus:border-slate-300 dark:focus:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500";
    const neuCard = "bg-slate-200 dark:bg-neumorphic-base-dark p-4 rounded-xl shadow-[6px_6px_12px_#bdc1c6,-6px_-6px_12px_#ffffff] dark:shadow-lg";
    const neuInsetCard = "bg-slate-200 dark:bg-neumorphic-base-dark p-4 rounded-xl shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:shadow-neumorphic-inset-dark";
    const neuButton = "px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-neumorphic-base-dark shadow-[5px_5px_10px_#bdc1c6,-5px_-5px_10px_#ffffff] dark:shadow-lg hover:shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:hover:shadow-neumorphic-inset-dark active:shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff] dark:active:shadow-neumorphic-inset-dark disabled:text-slate-400 dark:disabled:text-slate-600 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:shadow-neumorphic-inset-dark transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-neumorphic-base-dark";
    const neuButtonPrimary = "px-8 py-3 bg-slate-200 font-semibold text-sky-600 dark:text-sky-400 rounded-xl shadow-[5px_5px_10px_#bdc1c6,-5px_-5px_10px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-lg hover:shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:hover:shadow-neumorphic-inset-dark active:shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff] dark:active:shadow-neumorphic-inset-dark disabled:text-slate-400 dark:disabled:text-slate-600 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:shadow-neumorphic-inset-dark transition-shadow duration-200";
    const neuHeaderIcon = "p-3 rounded-xl text-zinc-700 dark:text-zinc-300 bg-slate-200 dark:bg-neumorphic-base-dark shadow-[4px_4px_10px_#bdc1c6,-4px_-4px_10px_#ffffff] dark:shadow-lg inline-flex items-center justify-center";
    
    // --- All state declarations remain the same ---
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

    // --- All data fetching hooks and memos remain unchanged ---
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

    const scaffoldInfo = useMemo(() => {
        if (scaffoldLessonIds.size === 0) return { summary: '', error: null };
        const relevantScaffoldLessons = lessonsForUnit.filter(lesson => scaffoldLessonIds.has(lesson.id));
        if (relevantScaffoldLessons.length === 0) return { summary: '', error: 'Could not find selected scaffold lessons.' };
        const summary = relevantScaffoldLessons.map(lesson => {
            const pageContentSample = lesson.pages.map(p => p.content).join(' ').substring(0, 200);
            return `- Lesson Title: "${lesson.title}"\n  - Key Concepts/Activities Summary: ${pageContentSample}...`;
        }).join('\n');
        return { summary, error: null };
    }, [scaffoldLessonIds, lessonsForUnit]);

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

	// Schema definitions
	const ulpSchemas = {
	  explore: ["type", "lessonsList", "unitOverview", "hookedActivities", "mapOfConceptualChange", "essentialQuestions"],
	  firmUp: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity", "supportDiscussion", "assessment", "templates"],
	  deepen: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity", "supportDiscussion", "assessment", "templates"],
	  transfer: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity"],
	  synthesis: ["type", "summary"],
	  performanceTask: ["type", "graspsTask", "rubric"],
	  values: ["type", "values"],
	};

	// Schema validator
	const validateUlpJson = (type, jsonObj) => {
	  const requiredKeys = ulpSchemas[type];
	  if (!requiredKeys) return true;

	  const missing = requiredKeys.filter(key => !(key in jsonObj));
	  if (missing.length > 0) {
	    throw new Error(`Invalid JSON for '${type}'. Missing keys: ${missing.join(", ")}`);
	  }
	  return true;
	};

	const generateUlpSection = async (type, context, maxRetries = 3) => {
	  let prompt;
	  const iCan = context.language === 'Filipino' ? 'Kaya kong...' : 'I can...';

	  const commonRules = `
	Authoritative Inputs:
	- Content Standard: ${context.contentStandard}
	- Performance Standard: ${context.performanceStandard}
	- Source Lesson Titles: ${context.sourceLessonTitles}
	- Language: ${context.language}

	Rules:
	1. Respond ONLY with a valid JSON object.
	2. Do not include any explanation, commentary, or markdown formatting.
	3. Do not use HTML, Markdown, or any formatting tags inside string values. Use plain text only.
	4. All generated text inside the JSON MUST be in ${context.language}.
	5. Create NEW and ORIGINAL activities. Do not directly reference the source content.
	6. Escape all quotes inside string values.
	7. Replace any newlines or tabs inside string values with spaces.
	`;

	  switch (type) {
	    case 'explore':
	      prompt = `
	${commonRules}
	Generate the "Explore Stage" of a ULP.

	JSON Structure:
	{
	  "type": "explore",
	  "lessonsList": "A bulleted or numbered list of the exact source lesson titles provided.",
	  "unitOverview": "An engaging and catchy overview of the unit's purpose.",
	  "hookedActivities": "Detailed instructions for 1-2 engaging activities to capture student interest.",
	  "mapOfConceptualChange": "Detailed instructions for an activity for students to map their knowledge (e.g., K-W-L chart).",
	  "essentialQuestions": ["An array of 2-5 thought-provoking Essential Questions."]
	}
	`;
	      break;

	    case 'firmUp':
	      prompt = `
	${commonRules}
	Generate the "Firm-Up (Acquisition)" section for the competency: "${context.competency}" (Code: ${context.code}).

	JSON Structure:
	{
	  "type": "firmUp",
	  "code": "${context.code}",
	  "competency": "${context.competency}",
	  "learningTargets": ["A '${iCan}' statement.", "Another '${iCan}' statement."],
	  "successIndicators": ["A specific, observable indicator.", "Another indicator."],
	  "inPersonActivity": { "instructions": "Detailed plain-text instructions...", "materials": "List of materials in plain text..." },
	  "onlineActivity": { "instructions": "Detailed plain-text instructions...", "materials": "List of materials in plain text..." },
	  "supportDiscussion": "Questions to check for understanding and an in-depth discussion, written in plain text.",
	  "assessment": { "type": "Multiple Choice | Fill in the blank | Matching Type | Enumeration | Alternative Response | Hands-on operation | Labeling", "content": "The full assessment content in plain text..." },
	  "templates": "Provide full content for any templates/cards mentioned in materials. If none, use an empty string."
	}
	`;
	      break;

	    case 'deepen':
	      prompt = `
	${commonRules}
	Generate the "Deepen (Meaning-Making)" section for the competency: "${context.competency}" (Code: ${context.code}). 
	At least one activity MUST be a C-E-R task.

	JSON Structure:
	{
	  "type": "deepen",
	  "code": "${context.code}",
	  "competency": "${context.competency}",
	  "learningTargets": ["A '${iCan}' statement.", "Another '${iCan}' statement."],
	  "successIndicators": ["A specific, observable indicator.", "Another indicator."],
	  "inPersonActivity": { "instructions": "Detailed plain-text instructions for a meaning-making activity...", "materials": "List of materials in plain text..." },
	  "onlineActivity": { "instructions": "Detailed plain-text instructions for an online alternative...", "materials": "List of materials in plain text..." },
	  "supportDiscussion": "A detailed summarization of key concepts, plus in-depth elaboration and probing questions, written in plain text.",
	  "assessment": { "type": "Short Paragraph | Essay | Critique Writing | Concept Mapping | Journal Writing", "content": "The full assessment content in plain text..." },
	  "templates": "Provide full content for any templates/cards mentioned in materials. If none, use an empty string."
	}
	`;
	      break;

	    case 'transfer':
	      prompt = `
	${commonRules}
	Generate the "Transfer (Application)" section for the competency: "${context.competency}" (Code: ${context.code}).

	JSON Structure:
	{
	  "type": "transfer",
	  "code": "${context.code}",
	  "competency": "${context.competency}",
	  "learningTargets": ["A '${iCan}' statement.", "Another '${iCan}' statement."],
	  "successIndicators": ["A specific, observable indicator.", "Another indicator."],
	  "inPersonActivity": { "instructions": "Detailed plain-text instructions for a transfer activity...", "materials": "List of materials in plain text..." },
	  "onlineActivity": { "instructions": "Detailed plain-text instructions for an online alternative...", "materials": "List of materials in plain text..." }
	}
	`;
	      break;

	    case 'synthesis':
	      prompt = `
	${commonRules}
	Generate the "Final Synthesis" for a ULP.

	JSON Structure:
	{
	  "type": "synthesis",
	  "summary": "The full text of the synthesis in plain text."
	}
	`;
	      break;

	    case 'performanceTask':
	      prompt = `
	${commonRules}
	Generate a detailed GRASPS "Unit Performance Task" based on the overall unit Performance Standard. 
	Include a comprehensive scoring rubric worth 50 Points.

	JSON Structure:
	{
	  "type": "performanceTask",
	  "graspsTask": {
	    "goal": "Plain text only",
	    "role": "Plain text only",
	    "audience": "Plain text only",
	    "situation": "Plain text only",
	    "product": "Plain text only",
	    "standards": "Plain text only"
	  },
	  "rubric": [
	    { "criteria": "Criteria 1 name in plain text", "description": "Description of the criteria in plain text", "points": "Point value (e.g., 10)" },
	    { "criteria": "Criteria 2 name in plain text", "description": "Description of the criteria in plain text", "points": "Point value (e.g., 15)" }
	  ]
	}
	`;
	      break;

	    case 'values':
	      prompt = `
	${commonRules}
	Analyze the provided standards and infer 2-4 key values (e.g., integrity, stewardship, critical thinking).

	JSON Structure:
	{
	  "type": "values",
	  "values": [
	    { "name": "Value Name 1", "description": "A short, engaging overview in ${context.language} explaining how it is reflected in the unit, plain text only." },
	    { "name": "Value Name 2", "description": "Another short overview in plain text only." }
	  ]
	}
	`;
	      break;

	    default:
	      return Promise.resolve(null);
	  }

	  let retries = 0;
	  while (retries < maxRetries) {
	    try {
	      const jsonString = await callGeminiWithLimitCheck(prompt, { maxOutputTokens: 4096 });
	      const parsedJson = tryParseJson(extractJson(jsonString));
	      if (!parsedJson) throw new Error(`Failed to generate valid JSON for section: ${type}`);

	      // Validate against schema
	      validateUlpJson(type, parsedJson);

	      return parsedJson;
	    } catch (error) {
	      console.error(`Attempt ${retries + 1} for '${type}' failed.`, error);
	      retries++;
	      const backoffDelay = Math.pow(2, retries) * 1000 + (Math.random() * 500);
	      await new Promise(res => setTimeout(res, backoffDelay));
	    }
	  }
	  throw new Error(`Failed to generate section '${type}' after ${maxRetries} retries.`);
	};

    // --- NEW: Helper function to assemble the final HTML from components ---
    const assembleUlpFromComponents = (components) => {
        let tbody = '';
        const esc = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const nl2br = (text) => esc(text || '').replace(/\n/g, '<br/>');

        const explore = components.find(c => c.type === 'explore');
        if (explore) {
            tbody += `<tr><td colspan='2' style='background-color: #374151; color: white; font-weight: bold; padding: 10px;'>EXPLORE STAGE</td></tr>`;
            tbody += `<tr><td colspan='2' style='padding: 10px; border: 1px solid #E2E8F0;'>
                <h4>Lessons List</h4><div>${nl2br(explore.lessonsList)}</div>
                <h4>Unit Overview</h4><p>${nl2br(explore.unitOverview)}</p>
                <h4>Hooked Activities</h4><div>${nl2br(explore.hookedActivities)}</div>
                <h4>Map of Conceptual Change</h4><div>${nl2br(explore.mapOfConceptualChange)}</div>
                <h4>Essential Questions</h4><ul>${(explore.essentialQuestions || []).map(q => `<li>${esc(q)}</li>`).join('')}</ul>
            </td></tr>`;
        }

        const renderCompetencyRow = (item) => {
            const learningFocus = `
                <p><b>${esc(item.code)}:</b> ${esc(item.competency)}</p>
                <b>Learning Targets:</b><ul>${(item.learningTargets || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
                <b>Success Indicators:</b><ul>${(item.successIndicators || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
            
            const learningProcess = `
                <b>In-Person Activity:</b><p>${nl2br(item.inPersonActivity?.instructions)}</p><em>Materials: ${esc(item.inPersonActivity?.materials)}</em>
                <br/><br/>
                <b>Online Activity:</b><p>${nl2br(item.onlineActivity?.instructions)}</p><em>Materials: ${esc(item.onlineActivity?.materials)}</em>
                ${item.supportDiscussion ? `<br/><br/><b>Support Discussion:</b><p>${nl2br(item.supportDiscussion)}</p>` : ''}
                ${item.assessment ? `<br/><br/><b>End-of-Lesson Assessment (${esc(item.assessment.type)}):</b><p>${nl2br(item.assessment.content)}</p>`: ''}
                ${item.templates ? `<br/><br/><b>Activity Materials & Templates:</b><div style="white-space: pre-wrap; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">${esc(item.templates)}</div>` : ''}`;

            return `<tr>
                <td style='padding: 10px; border-bottom: 1px solid #E2E8F0; vertical-align: top;'>${learningFocus}</td>
                <td style='padding: 10px; border-bottom: 1px solid #E2E8F0; vertical-align: top;'>${learningProcess}</td>
            </tr>`;
        }

        const firmUpItems = components.filter(c => c.type === 'firmUp').sort((a,b) => a.code.localeCompare(b.code));
        if (firmUpItems.length > 0) {
            tbody += `<tr><td colspan='2' style='background: linear-gradient(to right, #6366f1, #8b5cf6); color: white; padding: 10px; font-weight: bold;'>FIRM-UP (ACQUISITION)</td></tr>`;
            firmUpItems.forEach(item => tbody += renderCompetencyRow(item));
        }

        const deepenItems = components.filter(c => c.type === 'deepen').sort((a,b) => a.code.localeCompare(b.code));
        if (deepenItems.length > 0) {
            tbody += `<tr><td colspan='2' style='background: linear-gradient(to right, #10b981, #2dd4bf); color: white; padding: 10px; font-weight: bold;'>DEEPEN (MEANING-MAKING)</td></tr>`;
            deepenItems.forEach(item => tbody += renderCompetencyRow(item));
        }

        const synthesis = components.find(c => c.type === 'synthesis');
        if (synthesis) {
            tbody += `<tr><td colspan='2' style='background: #4B5563; color: white; padding: 10px; font-weight: bold;'>FINAL SYNTHESIS</td></tr>`;
            tbody += `<tr><td colspan='2' style='padding: 10px; border-bottom: 1px solid #E2E8F0;'>${nl2br(synthesis.summary)}</td></tr>`;
        }
        
        const transferItems = components.filter(c => c.type === 'transfer').sort((a,b) => a.code.localeCompare(b.code));
        if (transferItems.length > 0) {
            tbody += `<tr><td colspan="2" style="background: linear-gradient(to right, #f97316, #fbbf24); color: white; padding: 10px; font-weight: bold;">TRANSFER</td></tr>`;
            transferItems.forEach(item => tbody += renderCompetencyRow(item));
        }
        
        const performanceTask = components.find(c => c.type === 'performanceTask');
        if (performanceTask) {
            const { graspsTask, rubric } = performanceTask;
            const graspsHtml = graspsTask ? `
                <p><strong>Goal:</strong> ${esc(graspsTask.goal)}</p>
                <p><strong>Role:</strong> ${esc(graspsTask.role)}</p>
                <p><strong>Audience:</strong> ${esc(graspsTask.audience)}</p>
                <p><strong>Situation:</strong> ${esc(graspsTask.situation)}</p>
                <p><strong>Product:</strong> ${esc(graspsTask.product)}</p>
                <p><strong>Standards:</strong> ${esc(graspsTask.standards)}</p>
            ` : '';
            const rubricHtml = rubric ? `
                <h4 style="margin-top: 16px;">Scoring Rubric (50 Points)</h4>
                <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                    <thead style="background-color: #f3f4f6;"><tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Criteria</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Points</th>
                    </tr></thead>
                    <tbody>${rubric.map(r => `<tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${esc(r.criteria)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${esc(r.description)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${esc(String(r.points))}</td>
                    </tr>`).join('')}</tbody>
                </table>
            ` : '';
            tbody += `<tr><td colspan="2" style="background-color: #111827; color: white; font-weight: bold; padding: 10px; text-align: center;">UNIT PERFORMANCE TASK</td></tr>`;
            tbody += `<tr><td colspan="2" style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${graspsHtml}${rubricHtml}</td></tr>`;
        }

        const values = components.find(c => c.type === 'values');
        if (values && values.values) {
            const valuesHtml = values.values.map(v => `<h4>${esc(v.name)}</h4><p>${nl2br(v.description)}</p>`).join('');
            tbody += `<tr><td colspan='2' style='background-color: #dbeafe; color: #1e40af; font-weight: bold; padding: 10px;'>VALUES INTEGRATION</td></tr>`;
            tbody += `<tr><td colspan='2' style='padding: 10px;'>${valuesHtml}</td></tr>`;
        }

        return `<table style='width: 100%; border-collapse: collapse;'>
            <thead><tr>
                <th style='background-color: #4A5568; color: white; padding: 12px; text-align: left;'>Learning Focus</th>
                <th style='background-color: #4A5568; color: white; padding: 12px; text-align: left;'>Learning Process</th>
            </tr></thead>
            <tbody>${tbody}</tbody>
        </table>`;
    };

    // --- REFACTORED: The main `handleGenerate` function ---
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
            // --- STAGE 1: Generate the ULP Outline ---
            setProgress(10);
            setProgressLabel('Step 1/3: Creating ULP outline...');

            const outlinePrompt = `
                You are an instructional design assistant. Your task is to analyze the following learning competencies and classify them into Firm-Up (Acquisition), Deepen (Meaning-Making), and Transfer).
                
                - **Content Standard:** ${inputs.contentStandard}
                - **Performance Standard:** ${inputs.performanceStandard}
                - **Learning Competencies:**
                    ${inputs.learningCompetencies}
                
                Based on the competencies, generate a JSON object with the following structure. Do NOT include any other text or markdown.
                
                {
                  "firmUp": [
                    {"code": "A1", "competency": "Full text of the first acquisition competency..."},
                    {"code": "A2", "competency": "Full text of the second acquisition competency..."}
                  ],
                  "deepen": [
                    {"code": "M1", "competency": "Full text of the first meaning-making competency..."}
                  ],
                  "transfer": [
                    {"code": "T1", "competency": "Full text of the first transfer competency..."}
                  ]
                }
            `;
            const outlineJsonText = await callGeminiWithLimitCheck(outlinePrompt, { maxOutputTokens: 2048 });
            const outline = tryParseJson(extractJson(outlineJsonText));
            if (!outline || !outline.firmUp || !outline.deepen || !outline.transfer) {
                throw new Error("AI failed to generate a valid ULP outline.");
            }

            // --- STAGE 2: Generate All ULP Components in a controlled, batched parallel process ---
            setProgress(30);
            setProgressLabel('Step 2/3: Generating ULP sections...');

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
            const BATCH_SIZE = 3; // Number of parallel requests at a time
            const DELAY_MS = 1500; // Delay between batches in milliseconds

            for (let i = 0; i < sectionsToGenerate.length; i += BATCH_SIZE) {
                const batch = sectionsToGenerate.slice(i, i + BATCH_SIZE);
                const promises = batch.map(section => 
                    generateUlpSection(section.type, { ...sharedContext, ...section })
                );

                const results = await Promise.all(promises);
                componentResults.push(...results.filter(Boolean));

                // Wait before starting the next batch
                if (i + BATCH_SIZE < sectionsToGenerate.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }

            // --- STAGE 3: Assemble the Final Document ---
            setProgress(90);
            setProgressLabel('Step 3/3: Assembling final document...');

            const finalHtml = assembleUlpFromComponents(componentResults);

            const finalJsonObject = {
                generated_lessons: [{
                    lessonTitle: `Unit Learning Plan: ${sourceInfo.title}`,
                    learningObjectives: [],
                    pages: [{
                        title: "PEAC Unit Learning Plan",
                        content: finalHtml
                    }]
                }]
            };
            setPreviewData(finalJsonObject);
            setProgress(100);

        } catch (err) {
            console.error("Error during parallel generation:", err);
            showToast(err.message || "An unknown error occurred during generation.", "error");
        } finally {
            setIsGenerating(false);
            setProgress(0);
            setProgressLabel('');
        }
    };

    // --- handleSave function remains unchanged ---
    const handleSave = async () => {
        if (!previewData || !Array.isArray(previewData.generated_lessons)) { showToast("Cannot save: Invalid lesson data.", "error"); return; }
        if (!initialUnitId || !subjectId) { showToast("Could not save: Destination unit or subject is missing.", "error"); return; }
        setIsSaving(true);
        const batch = writeBatch(db);
        previewData.generated_lessons.forEach((lesson, index) => {
            const newLessonRef = doc(collection(db, 'lessons'));
            batch.set(newLessonRef, {
                title: lesson.lessonTitle, pages: lesson.pages || [], objectives: lesson.learningObjectives || [],
                unitId: initialUnitId, subjectId: subjectId, contentType: "studentLesson",
                createdAt: serverTimestamp(), order: existingLessonCount + index,
            });
        });
        try {
            await batch.commit();
            showToast(`${previewData.generated_lessons.length} item(s) saved successfully!`, "success");
            onClose();
        } catch (err) {
            console.error("Save error:", err); showToast("Failed to save lessons.", "error");
        } finally { setIsSaving(false); }
    };
    
    // --- MODIFIED: The entire JSX return block is now using Tailwind classes ---
    return (
        <Dialog open={isOpen} onClose={!isSaving && !isGenerating ? onClose : () => {}} className="relative z-[110]">
            {/* --- MODIFIED: Dark theme backdrop --- */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/80" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                {/* --- MODIFIED: Dark theme panel --- */}
                <Dialog.Panel className="relative p-6 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col bg-slate-200 dark:bg-neumorphic-base-dark shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] dark:shadow-lg border border-slate-300/50 dark:border-slate-700/50">
                    {(isGenerating || isSaving) && (
                        // --- MODIFIED: Dark theme loading overlay ---
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm dark:bg-neumorphic-base-dark/80 flex flex-col justify-center items-center z-50 rounded-2xl space-y-3">
                            {isGenerating ? <ProgressIndicator progress={progress} /> : <Spinner />}
                            <p className="text-zinc-600 dark:text-slate-300">{isGenerating ? progressLabel : 'Saving...'}</p>
                        </div>
                    )}
                    
                    {/* --- MODIFIED: Dark theme header --- */}
                    <div className="flex justify-between items-start mb-6 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={neuHeaderIcon} aria-hidden="true">
                                <DocumentChartBarIcon className="h-8 w-8 text-zinc-700 dark:text-zinc-300" />
                            </div>
                            <div>
                                <Dialog.Title className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-slate-100">AI PEAC ULP Generator</Dialog.Title>
                                <p className="text-sm text-zinc-500 dark:text-slate-400">Create a ULP that aligns with PEAC standards.</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isSaving || isGenerating}
                            className={`${neuButton} !p-2 !rounded-full`} // Use ! to override base padding
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                        {!previewData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    {/* --- MODIFIED: Dark theme text --- */}
                                    <h3 className="font-bold text-lg text-zinc-700 dark:text-slate-300 border-b border-zinc-200 dark:border-slate-700 pb-2">Generation Options</h3>
                                    <div>
                                        {/* --- MODIFIED: Dark theme text --- */}
                                        <label htmlFor="generationTarget" className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Document to Generate</label>
                                        <select
                                            name="generationTarget"
                                            value={generationTarget}
                                            onChange={(e) => setGenerationTarget(e.target.value)}
                                            className={`${neuInput} appearance-none`}
                                        >
                                            <option value="teacherGuide">PEAC Unit Learning Plan (ULP)</option>
                                            <option value="studentLesson">Student Learning Guide</option>
                                            <option value="peacAtg">Adaptive Teaching Guide (ATG)</option>
                                        </select>
                                    </div>
                                    <div>
                                        {/* --- MODIFIED: Dark theme text --- */}
                                        <label htmlFor="language" className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Output Language</label>
                                        <div className="relative">
                                            <select
                                                id="language"
                                                value={selectedLanguage}
                                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                                className={`${neuInput} pl-10 appearance-none`}
                                            >
                                                <option>English</option><option>Filipino</option>
                                            </select>
                                            <LanguageIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                                        </div>
                                    </div>
                                    {/* --- MODIFIED: Dark theme text --- */}
                                    <h3 className="font-bold text-lg text-zinc-700 dark:text-slate-300 border-b border-zinc-200 dark:border-slate-700 pt-2 pb-2">Authoritative Inputs</h3>
                                    <div>
                                        {/* --- MODIFIED: Dark theme text --- */}
                                        <label htmlFor="contentStandard" className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Content Standard</label>
                                        <textarea
                                            id="contentStandard"
                                            name="contentStandard"
                                            value={inputs.contentStandard}
                                            onChange={handleInputChange}
                                            className={neuInput}
                                            rows={3}
                                            style={{ minHeight: 72 }}
                                        />
                                    </div>
                                    <div>
                                        {/* --- MODIFIED: Dark theme text --- */}
                                        <label htmlFor="performanceStandard" className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Performance Standard</label>
                                        <textarea
                                            id="performanceStandard"
                                            name="performanceStandard"
                                            value={inputs.performanceStandard}
                                            onChange={handleInputChange}
                                            className={neuInput}
                                            rows={3}
                                            style={{ minHeight: 72 }}
                                        />
                                    </div>
                                    <div>
                                        {/* --- MODIFIED: Dark theme text --- */}
                                        <label htmlFor="learningCompetencies" className="block text-sm font-medium text-zinc-600 dark:text-slate-300 mb-1.5">Learning Competencies</label>
                                        <textarea
                                            id="learningCompetencies"
                                            name="learningCompetencies"
                                            placeholder="One competency per line..."
                                            value={inputs.learningCompetencies}
                                            onChange={handleInputChange}
                                            className={neuInput}
                                            rows={4}
                                            style={{ minHeight: 96 }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                     {/* --- MODIFIED: Dark theme text --- */}
                                     <h3 className="font-bold text-lg text-zinc-700 dark:text-slate-300 border-b border-zinc-200 dark:border-slate-700 pb-2">Source Content</h3>
                                    <div className={neuCard}>
                                        <SourceContentSelector
                                            selectedSubjectId={selectedSubjectId}
                                            handleSubjectChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedUnitIds(new Set()); setScaffoldLessonIds(new Set()); }}
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
                                    {/* --- MODIFIED: Collapsible and Selectable Scaffold Section --- */}
                                    {/* --- MODIFIED: Dark theme text --- */}
                                    <h3 className="font-bold text-lg text-zinc-700 dark:text-slate-300 border-b border-zinc-200 dark:border-slate-700 pt-2 pb-2">Scaffolding (Optional)</h3>
                                    <div className={`${neuInsetCard} max-h-[256px] overflow-y-auto`}>
                                        {/* --- MODIFIED: Dark theme text --- */}
                                        <p className="text-xs text-zinc-500 dark:text-slate-400 mb-3">Select previous lessons to build upon. Default view is collapsed.</p>
                                        {unitsForSubject.length > 0 ? (
                                            unitsForSubject.map(unit => {
                                                const lessonsInUnit = lessonsForUnit.filter(lesson => lesson.unitId === unit.id);
                                                if (lessonsInUnit.length === 0) return null;

                                                const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                                const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                                const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                                const isExpanded = expandedScaffoldUnits.has(unit.id);

                                                return (
                                                    <div key={unit.id} className="pt-2 first:pt-0">
                                                        {/* --- MODIFIED: Dark theme card --- */}
                                                        <div className="flex items-center p-2 rounded-lg bg-slate-200 dark:bg-neumorphic-base-dark shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] dark:shadow-lg transition-shadow">
                                                            <button onClick={() => handleToggleUnitExpansion(unit.id)} className="p-1">
                                                                {/* --- MODIFIED: Dark theme icon --- */}
                                                                <ChevronRightIcon className={`h-4 w-4 text-zinc-500 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                            </button>
                                                            <input
                                                                type="checkbox"
                                                                id={`scaffold-unit-${unit.id}`}
                                                                checked={isAllSelected}
                                                                ref={el => { if(el) el.indeterminate = isPartiallySelected; }}
                                                                onChange={() => handleUnitCheckboxChange(lessonsInUnit)}
                                                                // --- MODIFIED: Dark theme checkbox ---
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2 dark:bg-slate-800 dark:border-slate-600"
                                                            />
                                                            {/* --- MODIFIED: Dark theme text --- */}
                                                            <label htmlFor={`scaffold-unit-${unit.id}`} className="ml-2 flex-1 text-sm font-semibold text-zinc-700 dark:text-slate-100 cursor-pointer">
                                                                {unit.title}
                                                            </label>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="pl-6 pt-2 space-y-2">
                                                                {lessonsInUnit.map(lesson => (
                                                                    <div key={lesson.id} className="flex items-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`scaffold-lesson-${lesson.id}`}
                                                                            checked={scaffoldLessonIds.has(lesson.id)}
                                                                            onChange={() => {
                                                                                const newSet = new Set(scaffoldLessonIds);
                                                                                if (newSet.has(lesson.id)) newSet.delete(lesson.id);
                                                                                else newSet.add(lesson.id);
                                                                                setScaffoldLessonIds(newSet);
                                                                            }}
                                                                            // --- MODIFIED: Dark theme checkbox ---
                                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
                                                                        />
                                                                        {/* --- MODIFIED: Dark theme text --- */}
                                                                        <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-zinc-800 dark:text-slate-300">
                                                                            {lesson.title}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            // --- MODIFIED: Dark theme text ---
                                            <p className="text-sm text-zinc-400 dark:text-slate-500">Select a subject to see available lessons for scaffolding.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* --- MODIFIED: Dark theme text --- */}
                                <h2 className="text-xl font-bold text-zinc-800 dark:text-slate-100">Preview</h2>
                                {/* --- MODIFIED: Dark theme preview bg --- */}
                                <div className="max-h-[65vh] overflow-y-auto border border-zinc-200 dark:border-slate-700 rounded-lg p-4 bg-zinc-100 dark:bg-slate-900/50">
                                    {previewData?.generated_lessons?.[0] ? (
                                        previewData.generated_lessons.map((lesson, index) => (
                                            <div key={index}>
                                                {/* --- MODIFIED: Dark theme sticky header --- */}
                                                <h3 className="font-bold text-lg sticky top-0 bg-zinc-100/80 dark:bg-slate-900/80 backdrop-blur-sm py-2 dark:text-slate-100">{lesson.lessonTitle}</h3>
                                                {/* --- MODIFIED: Dark theme prose --- */}
                                                <div className="prose prose-slate dark:prose-invert max-w-none">
                                                    {Array.isArray(lesson.pages) && lesson.pages.map((page, pageIndex) => <LessonPage key={`${index}-${pageIndex}`} page={page} />)}
                                                </div>
                                            </div>
                                        ))
                                    ) : ( <p className="dark:text-slate-300">Could not load preview. The AI may have returned an invalid format.</p> )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- MODIFIED: Dark theme footer --- */}
                    <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-zinc-200/80 dark:border-slate-700/50 mt-6">
                        {previewData ? (
                            <>
                                <button
                                    onClick={() => setPreviewData(null)}
                                    disabled={isSaving || isGenerating}
                                    className={`${neuButton} w-full sm:w-auto`}
                                >
                                    Back to Edit
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isGenerating}
                                    className={`${neuButtonPrimary} w-full sm:w-auto`}
                                >
                                    {isSaving ? 'Saving...' : 'Accept & Save'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !selectedUnitIds.size}
                                className={`${neuButtonPrimary} ml-auto w-full sm:w-auto`}
                            >
                                {isGenerating ? 'Generating...' : 'Generate Content'}
                            </button>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}