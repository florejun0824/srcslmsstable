import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon, BookOpenIcon, ChevronDownIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
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

    // --- REFINED DESIGN TOKENS (Fixed Sizes & Layout) ---
    const ui = {
        card: "bg-[#F2F4F8] dark:bg-[#121212] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", 
        surface: "bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/5",
        
        // Compact Inputs
        inputWrapper: "group relative bg-[#F7F9FC] dark:bg-[#2C2C2C] rounded-xl transition-all duration-300 focus-within:bg-white dark:focus-within:bg-[#3A3A3A] focus-within:ring-2 focus-within:ring-blue-500/20 border border-transparent focus-within:border-blue-500/50",
        input: "w-full bg-transparent border-none px-4 pt-6 pb-2 text-sm text-gray-900 dark:text-white placeholder-transparent focus:ring-0 focus:outline-none transition-all resize-none",
        floatingLabel: "absolute left-4 top-3 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest transition-all group-focus-within:text-blue-500 group-focus-within:top-1.5",
        
        // Sized Buttons
        btnPrimary: "relative px-8 py-3 bg-[#007AFF] hover:bg-[#0062cc] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
        btnSecondary: "px-6 py-3 bg-white dark:bg-[#2C2C2C] text-gray-700 dark:text-white font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3A] transition-all active:scale-95 border border-gray-200 dark:border-white/10",
        
        select: "w-full bg-[#F7F9FC] dark:bg-[#2C2C2C] border-none rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500/50 cursor-pointer appearance-none",
        
        header: "bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 px-6 py-4 flex items-center justify-between flex-none z-10",
        footer: "bg-white dark:bg-[#121212] border-t border-gray-200/50 dark:border-white/5 px-6 py-4 flex items-center justify-end gap-3 flex-none z-10",
        sectionTitle: "text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 ml-1",
    };

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

    // --- FULL AI LOGIC & PROMPTS (Restored) ---
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
	      **SCAFFOLDING CONTEXT:**
	      You are writing the NEXT stage in the learning sequence.
	      - **The Golden Thread:** This activity MUST unveil a concept needed for the Unit Performance Task: "${context.performanceStandard}".
	      - **Connect Concepts:** Build upon the previous concepts naturally.
	      - **STRICT CONSTRAINT:** DO NOT cite "Lesson 1" or "The previous lesson". Discuss the *concepts* directly as if flowing continuously.
      
	      --- PREVIOUS CONCEPT SUMMARY ---
	      ${context.previousContent}
	      --- END SUMMARY ---
	      ` : "";

	      const verbosityRules = `
	      **CRITICAL CONTENT RULES (MUST FOLLOW):**
	      1. **SOURCE ADHERENCE:** All content must be based on the provided "Content Source".
	      2. **BE EXTREMELY DETAILED:** Do not just summarize. Write out the actual content.
	      3. **MARKDOWN FORMATTING:** You MUST use valid Markdown. 
	         - For bold text use **text**.
	         - For numbered lists use 1. (space) text.
	      4. **CREATE THE MATERIALS:** If an activity uses "Scenario Cards", "Mock Social Media Posts", or "Data Sets", YOU MUST WRITE THE ACTUAL CONTENT of those materials in the instruction text.
	      `;

	      // --- VALUES INTEGRATION (RESTORED TO PERFECT STATE) ---
	      const valuesRule = `
	      **SRCS VALUES INTEGRATION (REAL-WORLD CONNECTION):**
	      ${SRCS_VALUES_CONTEXT}
	      **INSTRUCTION:** This is the PRIMARY section for Real-World Context.
	      - **TASK:** Select ONE value. Write a narrative paragraph connecting the *academic concept* to *student realities/society*.
	      - **TONE:** Natural, conversational, and inspiring.
	      - **OUTPUT FIELD:** "valuesIntegration": { "value": "Name", "integration": "A natural paragraph connecting the Concept -> Value -> Real World Application." }
	      `;

	      // --- COMMON RULES ---
	      const commonRules = `
	      **ROLE:** You are a Master Curriculum Developer for San Ramon Catholic School (SRCS). 
      
	      **INPUTS:**
	      - Standards: ${context.contentStandard} / ${context.performanceStandard}
	      - Content Source: ${context.sourceLessonTitles}
	      - Language: ${context.language}
	      - **GRADE LEVEL:** ${context.gradeLevel} (Philippines K-12 Context)

	      **SCAFFOLDING STRATEGY (THE THROUGH-LINE):**
	      - **Goal:** Every activity must act as a stepping stone (scaffold) toward the Performance Task.
	      - **Execution:** Unveil the concept *gradually*. Firm-Up introduces the facts; Deepen analyzes the meaning; Transfer applies it.

	      **ZERO PRIOR KNOWLEDGE ASSUMPTION:**
	      - **The Requirement:** You MUST generate **"Stimulus Materials"** (e.g., a short reading, a data table, a definition card, or a specific case study) INSIDE the activity instructions. Students will analyze THIS material to discover the concept.

	      **TEACHING STYLE (NATURAL NARRATIVE & NUANCE):**
	      - **In "Support Discussion":**
	        1. **NO BULLETED DEFINITIONS:** Do NOT create a list of terms (e.g., "Intellect: Definition...").
	        2. **Conversational Flow:** Write a cohesive paragraph. State the term, then **immediately** follow it with a simple analogy or "real talk" elaboration in the same sentence or the next.
	           - *Bad:* "Intellect: The power to think. Free Will: The power to choose."
	           - *Good:* "The Intellect is like a flashlight that helps us see the Truth, but seeing isn't enough; we also need the Free Will, which acts as the steering wheel, allowing us to choose the Good path we just spotted."
	        3. **Detail Rich:** Be comprehensive but accessible.

	      **STRICT LANGUAGE CONTROL:**
	      1. **NO TAGLISH:** Do not mix English and Filipino. Use the selected language strictly.
      
	      **CONTEXTUALIZATION:**
	      1. **Implicit Localization:** Use Philippine settings naturally.
	      2. **Currency:** PHP / Pesos.

	      **NEGATIVE CONSTRAINTS:**
	      1. **NO META-REFERENCES:** NEVER say "In Lesson 2".
	      2. **NO FLUFF:** Avoid robotic phrases like "It is imperative to note...".

	      ${contextInjection}
	      ${verbosityRules}
	      ${valuesRule}

	      **HEADER & ACTIVITY NAMING:**
	      - **ACTIVITY TITLES:** **Activity [N]: [Creative/Catchy Name]**

	      **MATH & SCIENCE FORMATTING:**
	      1. **Use LaTeX:** For all formulas ($...$).
	      2. **JSON ESCAPING:** Double-escape backslashes (e.g., $\\\\frac{1}{2}$).

	      **STRICT TABLE RULE:**
	      1. **NO MARKDOWN TABLES:** Do not use pipes (|).
	      2. **USE HTML TABLES:** Use <table class='inner-table'>...</table>.
	      3. **HTML FORMATTING (REQUIRED):** - **Use <strong>text</strong>** for bolding.

	      **TECHNICAL RULES:**
	      1. **OUTPUT:** Valid JSON object ONLY.
	      2. **ESCAPING:** Escape double quotes inside strings (\\").
	      3. **FORMATTING:** Use \\n for line breaks inside standard JSON text strings.
	  
		  **SYSTEM INSTRUCTION:** DO NOT output your thinking process. Output ONLY raw, valid JSON.
	      `;
      
	      switch (type) {
	              case 'explore':
	                prompt = `
	                  ${commonRules}
	                  **TASK:** Generate "Explore" (Diagnosis/Hook).
	                  **JSON STRUCTURE:**
	                  {
	                  "type": "explore",
	                  "lessonsList": "Bulleted list of topics covered.",
	                  "unitOverview": "2 paragraphs welcome/summary tailored to ${context.gradeLevel}. Focus on the 'Big Idea'.",
	                  "hookedActivities": [
	                    {
	                        "title": "Activity 1: [Catchy Name]",
	                        "content": "THE ACTUAL CONTENT/SCRIPT. Ensure this hooks the student's interest using a **Mystery** or **Relatable Dilemma**. **Must be self-contained.**",
	                        "instructions": "Step-by-step instructions including how to present the stimulus."
	                    },
	                    {
	                        "title": "Activity 2: [Catchy Name]",
	                        "content": "THE ACTUAL CONTENT/SCRIPT.",
	                        "instructions": "Step-by-step instructions."
	                    }
	                  ],
	                  "mapOfConceptualChange": "Instructions for diagnostic activity (e.g., 'Before this unit, I thought...').",
	                  "essentialQuestions": ["EQ1", "EQ2", "EQ3"]
	                  }
	                  `;
	                break;

	              case 'firmUp':
	                prompt = `
	                  ${commonRules}
	                  **TASK:** Generate "Firm-Up" (Acquisition) for: "${context.competency}" (${context.code}).
                  
	                  **ALIGNMENT GUIDE (ACQUISITION):**
	                  - **Target Competencies:** List, Select, Name, Operate, Enumerate, Sequence, Identify, Compute, Define, Differentiate, State, Locate, Solve, Describe, Compare, Copy, Classify, Point, Report.
	                  - **Recommended Activities:** Frayer Model, Venn Diagram, 2-Column Comparison, Table Vocabulary Exercise, Pictionary, Labeling Exercise, Sequencing/Flow Chart, Sorting/Classifying, Hands-on Modelling, Demo.
	                  - **Assessment Types:** Multiple Choice, Fill in the blank, Matching Type, Enumeration, Alternative Response (True/False), Hands-on Operation, Labeling.

	                  **JSON STRUCTURE:**
	                  {
	                  "type": "firmUp",
	                  "code": "${context.code}",
	                  "competency": "${context.competency}",
	                  "learningTargets": ["${iCan} define...", "${iCan} identify..."],
	                  "successIndicators": ["3 distinct bullet points."],
	                  "inPersonActivity": { 
	                      "instructions": "**Activity 1: [Select from Recommended Activities]**\\n\\n1. [Step 1]...\\n\\n**STIMULUS MATERIAL (REQUIRED):**\\n(Provide the exact text excerpt, data table, definition card, or image description here).\\n\\n**WORKSHEET CONTENT:**\\n<table class='inner-table'><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td><strong>Item 1</strong></td><td>Detail 1</td></tr></tbody></table>", 
	                      "materials": "List." 
	                  },
	                  "onlineActivity": { "instructions": "Digital equivalent (e.g., Drag and Drop, Online Quiz).", "materials": "Tools..." },
	                  "supportDiscussion": "**Checking for Understanding:**\\n1. [Question 1]\\n2. [Question 2]\\n\\n**In-Depth Discussion:**\\n[Write a **DETAIL RICH** narrative. DO NOT LIST TERMS. Weave the definitions and their nuances into a cohesive story or lecture. Connect the terms to the examples from the activity. **DO NOT cite the source explicitly.**]",
	                  "assessment": { "type": "[Select ONE from Assessment Types above]", "content": "Generate the specific content/questions. Use <table class='inner-table'> for columns if needed." },
	                  "templates": "Content for 'Key Definitions' or similar. Title MUST be simple (e.g., 'Key Definitions').",
	                  "valuesIntegration": { "value": "Value Name", "integration": "Natural narrative connecting the concept -> value -> real world." }
	                  }
	                  `;
	                break;

	              case 'deepen':
	                prompt = `
	                  ${commonRules}
	                  **TASK:** Generate "Deepen" (Meaning-Making) for: "${context.competency}" (${context.code}).
                  
	                  **ALIGNMENT GUIDE (MAKE MEANING):**
	                  - **Target Competencies:** Analyze, Explain, Elaborate, Discuss, Justify, Prove, Reflect, Persuade, Defend, Predict, Generalize, Formulate, Model, Synthesize.
	                  - **Recommended Activities:** Close Reading, 5E Inquiry-based Learning, Issue Investigation, Experimentation, Situation Analysis, Text Analysis, Picture/Video Analysis, Problem Analysis, Debate, Jigsaw Puzzle, Predict-Observe-Explain, Data Retrieval Chart Analysis, Writing Generalizations/Conclusions.
	                  - **Assessment Types:** Short Paragraph, Essay, Critique Writing, Concept Mapping, Journal Writing.

	                  **JSON STRUCTURE:**
	                  {
	                  "type": "deepen",
	                  "code": "${context.code}",
	                  "competency": "${context.competency}",
	                  "learningTargets": ["${iCan} analyze...", "${iCan} justify..."],
	                  "successIndicators": ["3 distinct indicators."],
	                  "inPersonActivity": { 
	                      "instructions": "**Activity 2: [Select from Recommended Activities]**\\n\\nInstructions:\\n1. [Step]...\\n\\n**STIMULUS MATERIALS / ROLES (Detailed):**\\n(Provide the specific roles, conflict details, or simulation rules here).\\n\\n<table class='inner-table'><thead><tr><th style='width:30%'>Role/Element</th><th>Description</th></tr></thead><tbody><tr><td><strong>Role 1</strong></td><td>[Detailed Instructions]</td></tr></tbody></table>", 
	                      "materials": "List." 
	                  },
	                  "onlineActivity": { "instructions": "Instructions.", "materials": "Links..." },
	                  "supportDiscussion": "**Detailed Summarization:**\\n[Provide a rich, flowing summary of the key concepts.]\\n\\n**In-Depth Elaboration:**\\n[Elaborate on the nuances. DO NOT BULLET. Discuss the 'Why' and 'How' in a natural, teacher-like voice.]\\n\\n**Probing Questions:**\\n1. [Question 1]",
	                  "assessment": { "type": "[Select ONE from Assessment Types above]", "content": "Generate the specific prompt or instructions." },
	                  "templates": "Worksheet structure. Keep titles GENERIC.",
	                  "valuesIntegration": { "value": "Value Name", "integration": "Natural narrative connecting the concept -> value -> real world." }
	                  }
	                  `;
	                break;

	              case 'transfer':
	                prompt = `
	                  ${commonRules}
	                  **TASK:** Generate "Transfer" (Application) for: "${context.competency}" (${context.code}).
                  
	                  **ALIGNMENT GUIDE (TRANSFER):**
	                  - **Target Competencies:** Show, Demonstrate, Improve, Design, Create, Invent, Simulate, Plan, Revise, Convert, Compose, Recommend, Formulate, Model, Synthesize, Reflect.
	                  - **Recommended Activities:** Scaffold for Transfer (Guided case studies, practice activities), Project Exercises (Designing a marketing plan, creating a public awareness campaign, etc.).
	                  - **Assessment Types:** Performance Task, Portfolio. (Note: The activity itself is the assessment here).

	                  **JSON STRUCTURE:**
	                  {
	                  "type": "transfer",
	                  "code": "${context.code}",
	                  "competency": "${context.competency}",
	                  "learningTargets": ["${iCan} apply...", "${iCan} prepare..."],
	                  "successIndicators": ["3 indicators."],
	                  "inPersonActivity": { 
	                      "instructions": "**Activity 3: [Select from Recommended Activities]**\\n\\nInstructions:\\n1. [Step]...\\n\\n**SELF-DIAGNOSIS / PLANNING WORKSHEET:**\\n<table class='inner-table'><thead><tr><th>Section</th><th>Prompt</th><th>Analysis</th></tr></thead><tbody><tr><td><strong>1. Diagnosis</strong></td><td>Describe...</td><td></td></tr></tbody></table>", 
	                      "materials": "List." 
	                  },
	                  "onlineActivity": { "instructions": "Digital equivalent.", "materials": "Tools..." },
	                  "supportDiscussion": "[Summarize the key principles. Keep it punchy and direct. **DO NOT** use headers.]",
	                  "practicalApplication": "[A separate paragraph detailing a specific 'How-To' or 'Virtue Practice' for daily life. Start with: 'Practical Application: ...']",
	                  "valuesIntegration": { "value": "Value Name", "integration": "Natural narrative connecting the concept -> value -> real world." }
	                  }
	                  `;
	                break;

	              case 'synthesis':
	                prompt = `
	                  ${commonRules}
	                  **TASK:** Final Synthesis.
	                  **JSON STRUCTURE:** { "type": "synthesis", "summary": "3 Paragraphs summarizing the journey. Focus on the transformation of the student's understanding. Do not cite lesson numbers." }
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
	                      "situation": "Situation (Must be a specific, realistic scenario in a Philippine setting).", "product": "Product.", "standards": "Standards."
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
    // --- HTML Assembler (Full Logic) ---
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
                    <p><strong>Goal:</strong> ${renderInlineMd(graspsTask?.goal)}</p>
                    <p><strong>Role:</strong> ${renderInlineMd(graspsTask?.role)}</p>
                    <p><strong>Audience:</strong> ${renderInlineMd(graspsTask?.audience)}</p>
                    <p><strong>Situation:</strong> ${renderMd(graspsTask?.situation)}</p>
                    <p><strong>Product:</strong> ${renderInlineMd(graspsTask?.product)}</p>
                    <p><strong>Standards:</strong> ${renderInlineMd(graspsTask?.standards)}</p>
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
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog onClose={!isSaving && !isGenerating ? onClose : () => {}} className="relative z-[110]">
                {/* Backdrop */}
                <Transition.Child
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 backdrop-blur-none"
                    enterTo="opacity-100 backdrop-blur-xl"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 backdrop-blur-xl"
                    leaveTo="opacity-0 backdrop-blur-none"
                >
                    <div className="fixed inset-0 bg-black/40 transition-all" aria-hidden="true" />
                </Transition.Child>

                <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                    <Transition.Child
                        enter="ease-[cubic-bezier(0.19,1,0.22,1)] duration-500"
                        enterFrom="opacity-0 scale-90 translate-y-20"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-90 translate-y-20"
                    >
                        <Dialog.Panel className={`w-[95vw] md:w-[90vw] max-w-6xl h-[85vh] ${ui.card}`}>
                            
                            {/* --- LOADING OVERLAY --- */}
                            {(isGenerating || isSaving) && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-[60] flex flex-col justify-center items-center">
                                    <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-3xl shadow-2xl flex flex-col items-center">
                                        <div className="scale-125 mb-6"><ProgressIndicator progress={progress} /></div>
                                        <h3 className="text-xl font-bold mt-4 animate-pulse">{isGenerating ? 'Drafting Blueprint' : 'Saving'}</h3>
                                        <p className="text-gray-500 mt-2 text-sm">{isGenerating ? progressLabel : 'Writing to database...'}</p>
                                    </div>
                                </div>
                            )}

                            {/* --- HEADER (Fixed) --- */}
                            <div className={ui.header}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <BookOpenIcon className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <Dialog.Title className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                            Unit <span className="text-blue-500">Learning Plan</span>
                                        </Dialog.Title>
                                        <p className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">PEAC / DepEd Compliant</p>
                                    </div>
                                </div>
                                <button onClick={onClose} disabled={isSaving || isGenerating} className="group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
                                    <XMarkIcon className="h-6 w-6 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                                </button>
                            </div>

                            {/* --- BODY (Scrollable) --- */}
                            <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar bg-white/50 dark:bg-[#121212]/50">
                                {!previewData ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                                        
                                        {/* LEFT COLUMN: INPUTS */}
                                        <div className="lg:col-span-7 space-y-6">
                                            <section>
                                                <h3 className={ui.sectionTitle}>1. Framework Targets</h3>
                                                <div className="space-y-4">
                                                    {/* Compact Content Standard */}
                                                    <div className={ui.inputWrapper}>
                                                        <textarea 
                                                            name="contentStandard" 
                                                            value={inputs.contentStandard} 
                                                            onChange={handleInputChange} 
                                                            className={ui.input} 
                                                            rows={2} // Reduced rows
                                                            placeholder=" " 
                                                        />
                                                        <label className={ui.floatingLabel}>Content Standard</label>
                                                    </div>

                                                    {/* Compact Performance Standard */}
                                                    <div className={ui.inputWrapper}>
                                                        <textarea 
                                                            name="performanceStandard" 
                                                            value={inputs.performanceStandard} 
                                                            onChange={handleInputChange} 
                                                            className={ui.input} 
                                                            rows={2} // Reduced rows
                                                            placeholder=" " 
                                                        />
                                                        <label className={ui.floatingLabel}>Performance Standard</label>
                                                    </div>

                                                    {/* Learning Competencies */}
                                                    <div className={ui.inputWrapper}>
                                                        <textarea 
                                                            name="learningCompetencies" 
                                                            value={inputs.learningCompetencies} 
                                                            onChange={handleInputChange} 
                                                            className={ui.input} 
                                                            rows={3} // Reduced from 5 to 3
                                                            placeholder=" " 
                                                        />
                                                        <label className={ui.floatingLabel}>Learning Competencies</label>
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className={ui.sectionTitle}>2. Contextualization</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="relative group">
                                                        <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className={ui.select}>
                                                            <option>English</option>
                                                            <option>Filipino</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDownIcon className="w-4 h-4" /></div>
                                                    </div>
                                                    <div className="relative group">
                                                        <select value={selectedGradeLevel} onChange={(e) => setSelectedGradeLevel(e.target.value)} className={ui.select}>
                                                            {PH_GRADE_LEVELS.map((grade) => (
                                                                <option key={grade} value={grade}>{grade}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDownIcon className="w-4 h-4" /></div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {/* RIGHT COLUMN: SOURCE SELECTOR */}
                                        <div className="lg:col-span-5 flex flex-col">
                                            <h3 className={ui.sectionTitle}>3. Source Material</h3>
                                            <div className={`${ui.surface} flex-1 min-h-[300px] border border-gray-100 dark:border-white/5 flex flex-col`}>
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
                                    <div className="max-w-5xl mx-auto animate-fadeIn pb-10">
                                        <div className="text-center mb-8">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-bold text-xs mb-3">
                                                <CheckCircleIcon className="w-4 h-4" /> Generation Complete
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Unit Learning Plan</h2>
                                            <p className="text-gray-500 mt-1">{sourceInfo.title}</p>
                                        </div>
                                        
                                        <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-8 shadow-sm border border-gray-100 dark:border-white/5 overflow-x-auto">
                                            {previewData.generated_lessons.map((lesson, index) => (
                                                <div key={index} className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                                    <div dangerouslySetInnerHTML={{ __html: lesson.pages[0].content }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- FOOTER (Fixed) --- */}
                            <div className={ui.footer}>
                                {previewData ? (
                                    <>
                                        <button onClick={() => setPreviewData(null)} disabled={isSaving} className={ui.btnSecondary}>
                                            Back to Edit
                                        </button>
                                        <button onClick={handleSave} disabled={isSaving} className={ui.btnPrimary}>
                                            Accept & Save
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={handleGenerate} 
                                        disabled={isGenerating || !selectedUnitIds.size} 
                                        className={ui.btnPrimary}
                                    >
                                        {isGenerating ? 'Generating...' : (
                                            <>
                                                <SparklesIcon className="w-4 h-4" />
                                                Generate Smart Plan
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}