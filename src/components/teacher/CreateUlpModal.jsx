import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ProgressIndicator from '../common/ProgressIndicator';
import SourceContentSelector from '../../hooks/SourceContentSelector';
import { marked } from 'marked';

// --- CONSTANTS ---
const PH_GRADE_LEVELS = [
    "Kindergarten",
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9", "Grade 10",
    "Grade 11 (Senior High)", "Grade 12 (Senior High)"
];

const SRCS_VALUES_CONTEXT = `
**SRCS CORE VALUES (San Ramon Catholic School):**
1. **Pro-God:** Recognizing God in ourselves/others; striving to manifest God's will.
2. **Pro-Life:** Affirming the essential dignity of each human being (Imago Dei).
3. **Pro-Environment:** Stewardship of creation; caring for the environment.
4. **Pro-Nation:** Social awareness; concern for community/nation building.
5. **Self-Discipline and Leadership:** Countering impulses; maintaining focus; future leadership.
6. **Self-worth and Integrity:** Reverence for oneself; adhering to moral/ethical principles.
7. **Fairness and Gender Sensitivity:** Respect/fairness for all; inclusivity; compassion.
8. **Excellence:** Holistic approach (physical, intellectual, spiritual); becoming the best version of oneself.
`;

// --- Helper Functions ---

const extractJson = (text) => {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    return null;
};

// --- UPDATED PARSER: Handles Math/LaTeX JSON issues ---
const tryParseJson = (jsonString) => {
  try {
    if (!jsonString) return null;
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("Standard JSON.parse failed. Attempting to fix math/syntax.", error);
    if (typeof jsonString !== 'string') return null;
    
    // 1. Basic Markdown cleanup
    let sanitizedString = jsonString
      .replace(/```json|```/g, '')
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":') // Fix unquoted keys
      .replace(/[“”]/g, '"') // Fix smart quotes
      .replace(/[\u0000-\u001F]+/g, ' '); // Remove control chars

    // 2. MATH FIX: Fix single backslashes in LaTeX that break JSON
    // Logic: Find a backslash that is NOT followed by a valid JSON escape char (" \ / b f n r t u)
    // Example: Turns "\frac" into "\\frac" so JSON.parse accepts it
    sanitizedString = sanitizedString.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

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

    // --- Styles ---
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
    
    // State Defaults
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [selectedGradeLevel, setSelectedGradeLevel] = useState('Grade 7'); 
    
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

    const ulpSchemas = {
      explore: ["type", "lessonsList", "unitOverview", "hookedActivities", "mapOfConceptualChange", "essentialQuestions"],
      firmUp: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity", "supportDiscussion", "assessment", "templates", "valuesIntegration"],
      deepen: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity", "supportDiscussion", "assessment", "templates", "valuesIntegration"],
      transfer: ["type", "code", "competency", "learningTargets", "successIndicators", "inPersonActivity", "onlineActivity", "supportDiscussion", "valuesIntegration"],
      synthesis: ["type", "summary"],
      performanceTask: ["type", "graspsTask", "rubric"],
    };

    const validateUlpJson = (type, jsonObj) => {
      const requiredKeys = ulpSchemas[type];
      if (!requiredKeys) return true;
      const missing = requiredKeys.filter(key => !(key in jsonObj));
      if (missing.length > 0) throw new Error(`Invalid JSON for '${type}'. Missing keys: ${missing.join(", ")}`);
      return true;
    };

    const generateUlpSection = async (type, context, maxRetries = 3) => {
      let prompt;
      const iCan = context.language === 'Filipino' ? 'Kaya kong...' : 'I can...';

      // --- SCAFFOLDING CONTEXT ---
      const contextInjection = context.previousContent ? `
      **SCAFFOLDING CONTEXT (CRITICAL):**
      You are writing the NEXT lesson in a sequence.
      - **Reinforce:** Explicitly reference concepts from the previous lesson to build connection.
      - **Scaffold:** Ensure the complexity increases from the previous content.
      
      --- PREVIOUS CONTENT SUMMARY ---
      ${context.previousContent}
      --- END PREVIOUS CONTENT ---
      ` : "";

      const verbosityRules = `
      **CRITICAL CONTENT RULES (MUST FOLLOW):**
      1. **BE EXTREMELY DETAILED:** Do not just summarize. Write out the actual content.
      2. **MARKDOWN FORMATTING:** You MUST use valid Markdown. 
         - For bold text use **text**.
         - For numbered lists use 1. (space) text.
      3. **CREATE THE MATERIALS:** If an activity uses "Scenario Cards" or "Worksheets", YOU MUST WRITE THE CONTENT of those cards/worksheets in the instruction text.
      `;

      const valuesRule = `
      **SRCS VALUES INTEGRATION (REQUIRED):**
      ${SRCS_VALUES_CONTEXT}
      **INSTRUCTION:** Select **ONE** specific value. Write a **seamless, conversational 'Small Talk' or 'Teacher's Connection' paragraph** (3-4 sentences). 
      - DO NOT just define the value. 
      - Speak as if you are the teacher transitioning the class, connecting the activity they just did to the SRCS Core Value and a real-world application.
      - Make it flow naturally.
      **OUTPUT FIELD:** "valuesIntegration": { "value": "Name", "integration": "Conversational paragraph..." }
      `;

      // --- UPDATED COMMON RULES ---
      const commonRules = `
      **ROLE:** You are a Master Curriculum Developer for San Ramon Catholic School (SRCS). 
      
      **INPUTS:**
      - Standards: ${context.contentStandard} / ${context.performanceStandard}
      - Content Source: ${context.sourceLessonTitles}
      - Language: ${context.language}
      - **GRADE LEVEL:** ${context.gradeLevel} (Philippines K-12 Context)

      ${contextInjection}
      ${verbosityRules}
      ${valuesRule}

      **GRADE LEVEL & TONE INSTRUCTIONS (CRITICAL):**
      1. **Cognitive Level:** Write content appropriate for **${context.gradeLevel}**.
      2. **TONE CONSTRAINT (NEGATIVE):** **DO NOT** use phrases like "Grade 10 learners..." or "As a Grade 7 student...". Just present the content directly and professionally.
      3. **Content Depth:** For "Hook Activities", do not just describe the activity. **WRITE THE ACTUAL CONTENT** (e.g., The specific moral dilemma text, the specific questions to ask).

      **HEADER & ACTIVITY NAMING:**
      - **GENERIC SECTION HEADERS:** Use simple titles (e.g., "Key Definitions", not "Key Definitions for Grade 10").
      - **ACTIVITY TITLES:** ALL Activities must have a specific, bold title formatted as: **Activity [N]: [Creative Name]** (e.g., **Activity 1: The Great Debate**)

      **MATH & SCIENCE FORMATTING:**
      1. **Use LaTeX:** For all formulas ($...$).
      2. **JSON ESCAPING:** Double-escape backslashes (e.g., $\\\\frac{1}{2}$).

      **STRICT TABLE RULE (CRITICAL - READ CAREFULLY):**
      1. **NO MARKDOWN TABLES:** Do not use pipes (|).
      2. **USE HTML TABLES:** Use <table class='inner-table'>...</table>.
      3. **NO MARKDOWN INSIDE HTML:** **DO NOT** use asterisks (**) for bolding inside the HTML table. It will not render.
         - **CORRECT:** <td><strong>Seeking Wealth</strong></td>
         - **WRONG:** <td>**Seeking Wealth**</td>

      **TECHNICAL RULES:**
      1. **OUTPUT:** Valid JSON object ONLY.
      2. **ESCAPING:** Escape double quotes inside strings (\\").
      3. **FORMATTING:** Use \\n for line breaks inside text, but keep HTML tags clean.
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
                  "unitOverview": "2 paragraphs welcome/summary tailored to ${context.gradeLevel}.",
                  "hookedActivities": [
                    {
                        "title": "Activity 1: [Creative Name]",
                        "content": "THE ACTUAL CONTENT/SCRIPT. (e.g., 'Read this scenario to the class: You find a wallet...')",
                        "instructions": "Step-by-step teacher instructions."
                    },
                    {
                        "title": "Activity 2: [Creative Name]",
                        "content": "THE ACTUAL CONTENT/SCRIPT.",
                        "instructions": "Step-by-step teacher instructions."
                    }
                  ],
                  "mapOfConceptualChange": "Instructions for diagnostic activity.",
                  "essentialQuestions": ["EQ1", "EQ2", "EQ3"]
                  }
                  `;
                break;

              case 'firmUp':
                prompt = `
                  ${commonRules}
                  **TASK:** Generate "Firm-Up" (Acquisition) for: "${context.competency}" (${context.code}).
                  **FOCUS:** Acquisition of facts and skills appropriate for ${context.gradeLevel}.
            
                  **JSON STRUCTURE:**
                  {
                  "type": "firmUp",
                  "code": "${context.code}",
                  "competency": "${context.competency}",
                  "learningTargets": ["${iCan} define...", "${iCan} identify..."],
                  "successIndicators": ["3 distinct bullet points."],
                  "inPersonActivity": { 
                      "instructions": "**Activity 1: [Creative Name]**\\n\\n1. [Step 1]...\\n\\n**CONTENT FOR WORKSHEET:**\\n<table class='inner-table'><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td><strong>Item 1</strong></td><td>Detail 1</td></tr></tbody></table>", 
                      "materials": "List." 
                  },
                  "onlineActivity": { "instructions": "Digital equivalent.", "materials": "Tools..." },
                  "supportDiscussion": "**Checking for Understanding:**\\n1. [Q1]...\\n\\n**In-Depth Discussion:**\\n[Paragraphs]",
                  "assessment": { "type": "Quiz", "content": "Matching or Multiple Choice. Use <table class='inner-table'> for matching columns." },
                  "templates": "Content for 'Key Definitions' or similar. Title MUST be simple (e.g., 'Key Definitions').",
                  "valuesIntegration": { "value": "Value Name", "integration": "Conversational connection." }
                  }
                  `;
                break;

              case 'deepen':
                prompt = `
                  ${commonRules}
                  **TASK:** Generate "Deepen" (Meaning-Making) for: "${context.competency}" (${context.code}).
                  **CRITICAL:** Generate specific "Scenario Cards" or "Case Studies" using HTML TABLES. Ensure scenarios are relatable to a ${context.gradeLevel} student.
            
                  **JSON STRUCTURE:**
                  {
                  "type": "deepen",
                  "code": "${context.code}",
                  "competency": "${context.competency}",
                  "learningTargets": ["${iCan} analyze...", "${iCan} justify..."],
                  "successIndicators": ["3 distinct indicators."],
                  "inPersonActivity": { 
                      "instructions": "**Activity 2: [Creative Name]**\\n\\nInstructions:\\n1. [Step]...\\n\\n**SCENARIO CARDS:**\\n<table class='inner-table'><thead><tr><th style='width:30%'>Card</th><th>Scenario</th></tr></thead><tbody><tr><td><strong>Card 1</strong></td><td>[Text]</td></tr></tbody></table>", 
                      "materials": "List." 
                  },
                  "onlineActivity": { "instructions": "Instructions.", "materials": "Links..." },
                  "supportDiscussion": "**Detailed Summarization:**\\n[Text]\\n\\n**In-Depth Elaboration:**\\n* [Question 1]",
                  "assessment": { "type": "Case Analysis", "content": "Instructions." },
                  "templates": "Worksheet structure. Keep titles GENERIC.",
                  "valuesIntegration": { "value": "Value Name", "integration": "Connection." }
                  }
                  `;
                break;

              case 'transfer':
                prompt = `
                  ${commonRules}
                  **TASK:** Generate "Transfer" (Application) for: "${context.competency}" (${context.code}).
            
                  **JSON STRUCTURE:**
                  {
                  "type": "transfer",
                  "code": "${context.code}",
                  "competency": "${context.competency}",
                  "learningTargets": ["${iCan} apply...", "${iCan} prepare..."],
                  "successIndicators": ["3 indicators."],
                  "inPersonActivity": { 
                      "instructions": "**Activity 3: [Creative Name]**\\n\\nInstructions:\\n1. [Step]...\\n\\n**SELF-DIAGNOSIS WORKSHEET:**\\n<table class='inner-table'><thead><tr><th>Section</th><th>Prompt</th><th>Analysis</th></tr></thead><tbody><tr><td><strong>1. Limitation</strong></td><td>Describe...</td><td></td></tr></tbody></table>", 
                      "materials": "List." 
                  },
                  "onlineActivity": { "instructions": "Digital equivalent.", "materials": "Tools..." },
                  "supportDiscussion": "**Core Principles:**\\n[Text]\\n\\n**Practical Application:**\\n[Text]",
                  "valuesIntegration": { "value": "Value Name", "integration": "Connection." }
                  }
                  `;
                break;

              case 'synthesis':
                prompt = `
                  ${commonRules}
                  **TASK:** Final Synthesis.
                  **JSON STRUCTURE:** { "type": "synthesis", "summary": "3 Paragraphs summarizing the journey suitable for ${context.gradeLevel} reading level." }
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
                      "goal": "Goal.", "role": "Role.", "audience": "Audience.", 
                      "situation": "Situation.", "product": "Product.", "standards": "Standards."
                  },
                  "rubric": "Generate the Rubric strictly as an HTML TABLE string: <table class='inner-table'><thead><tr><th>Criteria</th><th>Description</th><th>Points</th></tr></thead><tbody><tr><td><strong>Content</strong></td><td>Desc...</td><td>20</td></tr></tbody></table>"
                  }
                  `;
                break;
        
              default: return Promise.resolve(null);
            }

      let retries = 0;
      while (retries < maxRetries) {
        try {
          const jsonString = await callGeminiWithLimitCheck(prompt, { maxOutputTokens: 8192 }); 
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

    // --- HTML Assembler ---
    const assembleUlpFromComponents = (components) => {
            let tbody = '';

            marked.setOptions({
                breaks: true,
                gfm: true,
            });

            // Helper: Handle AI returning Objects/Arrays
            const formatAIContent = (content) => {
                if (!content) return '';
                if (typeof content === 'string') return content;
                
                // Handle Arrays (Hooks, Rubrics, etc.)
                if (Array.isArray(content)) {
                    return content.map(item => {
                        // Simple string array
                        if (typeof item === 'string') return `• ${item}`;
                        
                        // Rubric Object
                        if (item.criteria && item.description) {
                             return `<tr><td><strong>${item.criteria}</strong></td><td>${item.description}</td><td>${item.points}</td></tr>`;
                        }
                        
                        // Activity/Hook Object (Title + Content + Instructions)
                        const title = item.title || item.name || 'Activity';
                        const body = item.content || item.description || ''; 
                        const steps = item.instructions || '';
                        
                        // Render with Markdown support for the body content
                        return `### ${title}\n\n${body ? `> ${body}\n\n` : ''}${steps}`;
                    }).join('\n\n');
                }
                
                if (typeof content === 'object') {
                    if (content.instructions) {
                        return `${content.instructions}\n\n${content.materials ? `**Materials:** ${content.materials}` : ''}`;
                    }
                    return Object.values(content).filter(v => typeof v === 'string').join('\n\n');
                }
                return String(content);
            };

            const esc = (text) => (text == null ? '' : String(text)).replace(/</g, '&lt;').replace(/>/g, '&gt;');

            const renderMd = (input) => {
                let text = typeof input === 'string' ? input : formatAIContent(input);
                if (!text) return '';
                text = text.replace(/\r\n/g, '\n');
                try {
                    return marked.parse(text);
                } catch (e) {
                    console.error("Markdown parsing error:", e);
                    return text;
                }
            };

            const renderInlineMd = (text) => {
                if (!text) return '';
                const html = renderMd(text);
                return html.replace(/^<p>|<\/p>\n?$/g, ''); 
            };

            // ... [EXPLORE SECTION] ...
            const explore = components.find(c => c.type === 'explore');
            if (explore) {
                const unitOverview = formatAIContent(explore.unitOverview);
                const mapOfConceptualChange = formatAIContent(explore.mapOfConceptualChange);
                const hookedActivities = formatAIContent(explore.hookedActivities);

                tbody += `
                <tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>EXPLORE</td></tr>
                <tr><td colspan='2' style='padding: 10px; border: 1px solid black; vertical-align: top;'>
                    <strong>Unit Overview:</strong><br/>${renderMd(unitOverview)}<br/><br/>
                    <strong>Essential Questions:</strong><ul>${(explore.essentialQuestions || []).map(q => `<li>${renderInlineMd(q)}</li>`).join('')}</ul>
                    <strong>Map of Conceptual Change:</strong><br/>${renderMd(mapOfConceptualChange)}<br/><br/>
                    <strong>Hook Activities:</strong><br/>${renderMd(hookedActivities)}
                </td></tr>`;
            }

            // ... [renderCompetencyRow] ...
            const renderCompetencyRow = (item) => {
                const inPersonInstructions = formatAIContent(item.inPersonActivity?.instructions);
                const onlineInstructions = formatAIContent(item.onlineActivity?.instructions);
                const processing = formatAIContent(item.supportDiscussion);

                const learningFocus = `
                    <strong>${esc(item.code)}</strong><br/>
                    ${esc(item.competency)}<br/><br/>
                    <strong>Learning Targets:</strong><ul>${(item.learningTargets || []).map(t => `<li>${renderInlineMd(t)}</li>`).join('')}</ul>
                    <strong>Success Indicators:</strong><ul>${(item.successIndicators || []).map(i => `<li>${renderInlineMd(i)}</li>`).join('')}</ul>`;
            
                const learningExperience = `
                    <strong>In-Person Activity:</strong><br/>${renderMd(inPersonInstructions)}<br/>
                    <div style="margin-top: 8px; font-style: italic;">
                        <strong>Materials:</strong> 
                        <div style="display:inline-block; vertical-align:top;">${renderMd(item.inPersonActivity?.materials)}</div>
                    </div><br/>
                
                    <strong>Online Activity:</strong><br/>${renderMd(onlineInstructions)}<br/><br/>
                
                    ${processing ? `<strong>Processing/Discussion:</strong><br/>${renderMd(processing)}<br/><br/>` : ''}
                
                    ${item.valuesIntegration ? `<div style='margin-top: 15px; padding: 15px; background-color: #f0fdf4 !important; color: #14532d !important; border-left: 4px solid #16a34a; border-radius: 6px;'>
                        <strong style="display:block; margin-bottom:5px; font-size:1.1em;">🌿 SRCS Values Connection: ${esc(item.valuesIntegration.value)}</strong>
                        <span style="font-style:italic; line-height:1.6;">${renderMd(item.valuesIntegration.integration)}</span>
                    </div><br/>` : ''}
                
                    ${item.assessment ? `<strong>Assessment (${esc(item.assessment.type)}):</strong><br/>${renderMd(item.assessment.content)}` : ''}
                    ${item.templates ? `<br/><strong>Templates/Resources:</strong><br/>${renderMd(item.templates)}` : ''}`;

                return `<tr>
                    <td style='width: 35%; padding: 10px; border: 1px solid black; vertical-align: top;'>${learningFocus}</td>
                    <td style='width: 65%; padding: 10px; border: 1px solid black; vertical-align: top;'>${learningExperience}</td>
                </tr>`;
            };

            // ... [FIRM UP, DEEPEN, TRANSFER] ...
            const firmUpItems = components.filter(c => c.type === 'firmUp').sort((a,b) => a.code.localeCompare(b.code));
            if (firmUpItems.length > 0) {
                tbody += `<tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>FIRM-UP (ACQUISITION)</td></tr>`;
                firmUpItems.forEach(item => tbody += renderCompetencyRow(item));
            }

            const deepenItems = components.filter(c => c.type === 'deepen').sort((a,b) => a.code.localeCompare(b.code));
            if (deepenItems.length > 0) {
                tbody += `<tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>DEEPEN (MEANING-MAKING)</td></tr>`;
                deepenItems.forEach(item => tbody += renderCompetencyRow(item));
            }

            const transferItems = components.filter(c => c.type === 'transfer').sort((a,b) => a.code.localeCompare(b.code));
            if (transferItems.length > 0) {
                tbody += `<tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>TRANSFER (APPLICATION)</td></tr>`;
                transferItems.forEach(item => tbody += renderCompetencyRow(item));
            }

            // ... [SYNTHESIS] ...
            const synthesis = components.find(c => c.type === 'synthesis');
            if (synthesis) {
                tbody += `
                <tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>FINAL SYNTHESIS</td></tr>
                <tr><td colspan='2' style='padding: 10px; border: 1px solid black;'>${renderMd(synthesis.summary)}</td></tr>`;
            }

            // ... [PERFORMANCE TASK] ...
            const performanceTask = components.find(c => c.type === 'performanceTask');
            if (performanceTask) {
                const { graspsTask, rubric } = performanceTask;
                let rubricHtml = '';
                if (typeof rubric === 'string' && rubric.includes('<table')) {
                    rubricHtml = rubric;
                } else if (Array.isArray(rubric)) {
                     rubricHtml = `<table class='inner-table'><thead><tr><th>Criteria</th><th>Description</th><th>Points</th></tr></thead><tbody>
                     ${rubric.map(r => `<tr><td><strong>${esc(r.criteria)}</strong></td><td>${renderInlineMd(r.description)}</td><td>${esc(String(r.points))}</td></tr>`).join('')}
                     </tbody></table>`;
                }

                tbody += `
                <tr><td colspan='2' style='background-color: #f0f0f0; font-weight: bold; padding: 10px; border: 1px solid black;'>PERFORMANCE TASK (GRASPS)</td></tr>
                <tr><td colspan='2' style='padding: 10px; border: 1px solid black;'>
                    <p><strong>Goal:</strong> ${esc(graspsTask?.goal)}</p>
                    <p><strong>Role:</strong> ${esc(graspsTask?.role)}</p>
                    <p><strong>Audience:</strong> ${esc(graspsTask?.audience)}</p>
                    <p><strong>Situation:</strong> ${renderMd(graspsTask?.situation)}</p>
                    <p><strong>Product:</strong> ${esc(graspsTask?.product)}</p>
                    <p><strong>Standards:</strong> ${esc(graspsTask?.standards)}</p>
                    <hr/>
                    <strong>Rubric:</strong><br/>
                    ${rubricHtml}
                </td></tr>`;
            }
        
            // --- UPDATED CSS ---
            const globalStyle = `
            <style>
                /* Main Structure */
                table.main-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 1em; }
                table.main-table th, table.main-table td { 
                    word-wrap: break-word; 
                    overflow-wrap: break-word; 
                    word-break: break-word; /* Prevents overflow */
                    hyphens: auto;          /* Smoother wrapping */
                    border: 1px solid black; 
                    padding: 8px; 
                    vertical-align: top; 
                }
            
                /* Inner Table Structure */
                td table { 
                    width: 100% !important; 
                    table-layout: fixed !important; 
                    word-wrap: break-word !important;
                    border-collapse: collapse !important; 
                    margin: 15px 0 !important; 
                    border: 1px solid #666 !important; 
                }
                td table th, td table td { 
                    border: 1px solid #999 !important; 
                    padding: 8px !important; 
                    background-color: #fff !important;
                    color: #000 !important;
                    vertical-align: middle !important;
                }
                td table th {
                    background-color: #f3f4f6 !important; 
                    font-weight: bold !important;
                    text-align: left !important;
                }

                /* MATH & EQUATION DISPLAY FIXES */
                table.main-table td { line-height: 1.6 !important; }
                
                table.inner-table td, 
                table.main-table td {
                    padding-top: 10px !important;
                    padding-bottom: 10px !important;
                }

                .katex, .MathJax { font-size: 1.1em !important; }

                /* Styles specifically for 'inner-table' class */
                .inner-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    table-layout: fixed !important;
                    margin: 12px 0 !important;
                    border: 1px solid #666 !important;
                }
                .inner-table th, .inner-table td {
                    border: 1px solid #999 !important;
                    padding: 8px !important;
                    background: white !important;
                    vertical-align: middle !important;
                    color: #000 !important;
                }
                .inner-table th {
                    background: #f3f4f6 !important;
                    font-weight: bold !important;
                }

                ul, ol { margin-top: 0; margin-bottom: 8px; padding-left: 20px; }
                li { margin-bottom: 4px; }
                p { margin-top: 0; margin-bottom: 10px; }
                img { max-width: 100%; height: auto; }
                * { box-sizing: border-box; }
            </style>`;

            return `${globalStyle}
            <table class='main-table' style='width: 100%; table-layout: fixed; word-wrap: break-word; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; border: 1px solid black;'>
                <thead><tr>
                    <th style='border: 1px solid black; background-color: #d0d0d0; padding: 10px; text-align: left; width: 35%;'>Learning Focus</th>
                    <th style='border: 1px solid black; background-color: #d0d0d0; padding: 10px; text-align: left; width: 65%;'>Learning Experience</th>
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
                
                **CRITICAL CODING REQUIREMENT:**
                Assign codes STRICTLY as follows:
                - For Firm-Up items use: A1, A2, A3...
                - For Deepen items use: M1, M2, M3...
                - For Transfer items use: T1, T2, T3...

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
            setProgressLabel('Step 2/3: Developing comprehensive content...');

            const sharedContext = {
                contentStandard: inputs.contentStandard,
                performanceStandard: inputs.performanceStandard,
                sourceLessonTitles: sourceInfo.lessonTitles.join('\n'),
                language: selectedLanguage,
                gradeLevel: selectedGradeLevel, // PASS GRADE LEVEL TO GENERATOR
            };

            const sectionsQueue = [
                { type: 'explore' },
                ...outline.firmUp.map(item => ({ type: 'firmUp', ...item })),
                ...outline.deepen.map(item => ({ type: 'deepen', ...item })),
                ...outline.transfer.map(item => ({ type: 'transfer', ...item })),
                { type: 'synthesis' },
                { type: 'performanceTask' },
            ];

            const componentResults = [];
            let accumulatedContextString = ""; 

            for (let i = 0; i < sectionsQueue.length; i++) {
                const currentSection = sectionsQueue[i];
                
                const currentProgress = 30 + Math.floor((i / sectionsQueue.length) * 60);
                setProgress(currentProgress);
                setProgressLabel(`Developing: ${currentSection.type} (${i+1}/${sectionsQueue.length})`);

                const result = await generateUlpSection(currentSection.type, { 
                    ...sharedContext, 
                    ...currentSection,
                    previousContent: accumulatedContextString 
                });

                if (result) {
                    componentResults.push(result);
                    accumulatedContextString += `\n[Completed ${currentSection.type}]: ${JSON.stringify(result)}\n`;
                }
                
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
                    
                    {(isGenerating || isSaving) && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 space-y-6">
                            {isGenerating ? <ProgressIndicator progress={progress} /> : <Spinner />}
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{isGenerating ? 'Generating Plan' : 'Saving...'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isGenerating ? progressLabel : 'Writing to database'}</p>
                            </div>
                        </div>
                    )}

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

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-[#1C1C1E]">
                        {!previewData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
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
                                            <div className="grid grid-cols-2 gap-4">
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
                                                <div>
                                                    <label className={iosLabel}>Grade Level</label>
                                                    <div className="relative">
                                                        <select value={selectedGradeLevel} onChange={(e) => setSelectedGradeLevel(e.target.value)} className={`${iosInput} appearance-none`}>
                                                            {PH_GRADE_LEVELS.map((grade) => (
                                                                <option key={grade} value={grade}>{grade}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

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
                                            <div dangerouslySetInnerHTML={{ __html: lesson.pages[0].content }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

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