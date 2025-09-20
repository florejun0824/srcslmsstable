import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { sanitizeLessonsJson } from './sanitizeLessonText';

import { Dialog } from '@headlessui/react';
import { ArrowUturnLeftIcon, DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, SparklesIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import LessonPage from './LessonPage';
import mammoth from 'mammoth';
import { marked } from 'marked'; // ADDED: Import the missing 'marked' library

// PDF processing setup
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Helper to chunk large text for processing
const chunkText = (text, chunkSize = 8000) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
};


export default function AiLessonGenerator({ onClose, onBack, unitId, subjectId }) {
    const { showToast } = useToast();
    const [file, setFile] = useState(null);
    const [previewLessons, setPreviewLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);
    
    const [subjectContext, setSubjectContext] = useState(null);
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());
    const [existingLessonCount, setExistingLessonCount] = useState(0);

    useEffect(() => {
        if (subjectId) {
            const fetchFullSubjectContext = async () => {
                try {
                    const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    const unitsData = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    setSubjectContext({ units: unitsData, lessons: lessonsData });
                } catch (error) {
                    console.error("Error fetching subject context:", error);
                    setError("Could not scan existing subject content.");
                }
            };
            fetchFullSubjectContext();
        }
    }, [subjectId]);

    useEffect(() => {
        if (unitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [unitId]);

    const scaffoldInfo = useMemo(() => {
        if (scaffoldLessonIds.size === 0 || !subjectContext) return { summary: '' };
        const relevantScaffoldLessons = subjectContext.lessons.filter(lesson => scaffoldLessonIds.has(lesson.id));
        const summary = relevantScaffoldLessons.map(lesson => {
            const pageContentSample = lesson.pages.map(p => p.content).join(' ').substring(0, 200);
            return `- Lesson Title: "${lesson.title}"\n  - Key Concepts/Activities Summary: ${pageContentSample}...`;
        }).join('\n');
        return { summary };
    }, [scaffoldLessonIds, subjectContext]);

    const handleToggleUnitExpansion = (unitId) => {
        const newSet = new Set(expandedScaffoldUnits);
        if (newSet.has(unitId)) newSet.delete(unitId);
        else newSet.add(unitId);
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
    
    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
            setPreviewLessons([]);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreviewLessons([]);
    };

    const extractTextFromFile = async (fileToProcess) => {
        if (fileToProcess.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item) => item.str).join(' ') + '\n';
            }
            return text;
        } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await fileToProcess.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } else if (fileToProcess.type === 'text/plain') {
            return await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }
    };

    const handleGenerateLesson = async () => {
        if (!file) {
            setError('Please upload a file first.');
            return;
        }
        setIsProcessing(true);
        setError('');
        setPreviewLessons([]);

        try {
            setProgressMessage('Step 1 of 3: Reading and extracting text...');
            let extractedText = await extractTextFromFile(file);
            extractedText = extractedText.replace(/₱/g, 'PHP ');

            setProgressMessage('Step 2 of 3: Processing document with AI...');
            const textChunks = chunkText(extractedText);
            const processingPromises = textChunks.map((chunk) => {
                const chunkPrompt = `Paraphrase and rewrite the following text to be clear, concise, and original, while preserving its educational meaning. Use Markdown for formatting. Do not add titles, just return the processed text. RAW TEXT: ${chunk}`;
                return callGeminiWithLimitCheck(chunkPrompt);
            });
            const processedChunks = await Promise.all(processingPromises);
            const combinedText = processedChunks.join('\n\n');
            
            setProgressMessage('Step 3 of 3: Structuring final lessons...');

            let existingSubjectContextString = "No other lessons exist yet.";
            if (subjectContext && subjectContext.lessons.length > 0) {
                existingSubjectContextString = subjectContext.units
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(unit => {
                        const lessonsInUnit = subjectContext.lessons
                            .filter(lesson => lesson.unitId === unit.id)
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map(lesson => `  - Lesson: ${lesson.title}`)
                            .join('\n');
                        return `Unit: ${unit.title}\n${lessonsInUnit}`;
                    }).join('\n\n');
            }

            const scaffoldingInstruction = `
            **PRIMARY ANALYSIS TASK (NON-NEGOTIABLE):** Before generating anything, you MUST act as a curriculum continuity expert. Your most critical task is to meticulously analyze all the provided context below to prevent any topical repetition.

            ---
            ### CONTEXT: PREVIOUSLY COVERED MATERIAL
            This section contains all topics from lessons that already exist. You are strictly forbidden from re-teaching these specific concepts.

            **1. User-Selected Prerequisite Lessons:**
            ${scaffoldInfo.summary || "No specific prerequisite lessons were selected."}

            **2. Other Lessons Existing in this Subject:**
            ${existingSubjectContextString}
            ---

            ### YOUR GENERATION RULES (ABSOLUTE)
            1.  **DO NOT REPEAT:** You are strictly forbidden from creating a lesson, activity, or assessment question that covers the same learning objectives or keywords mentioned in the context above.
            2.  **IDENTIFY THE GAP:** Your new lesson(s) must address a logical "next step" or a knowledge gap that is not covered by the existing material. The new lessons MUST start from Lesson number ${existingLessonCount + 1}.
            3.  **BUILD A BRIDGE:** If appropriate, your introduction should briefly reference a concept from a prerequisite lesson to create a smooth transition, but it must immediately move into new material.
            `;
            
            const finalPrompt = `
            You are an expert curriculum designer and bestselling textbook author. 
            ${scaffoldingInstruction}

            Take the processed text and structure it into a **unit with lessons**, following the NON-NEGOTIABLE textbook chapter sequence.

            =============================
            STRICT LESSON STRUCTURE
            =============================
            1. **Unit Overview** - ONLY contains:  
                  • Overview of the unit (short, 1–2 paragraphs).  
                  • Learning Targets (clear bullet points).  
                - Nothing else.  
                - IMPORTANT: The Unit Overview MUST NEVER be numbered. Do not call it Lesson 0 or Lesson 1. Always exactly "Unit Overview".
            2. **Learning Objectives** - For every lesson, you MUST populate the \`learningObjectives\` array in the JSON with specific, measurable, and student-friendly objectives.  
                - CRITICAL: You MUST NOT create a separate page titled "Learning Objectives"; the array is the only place they should appear.
            3. **Engaging Introduction** - MUST NOT use "Engaging Introduction" as the page title.  
                - Instead, give it a **thematic, captivating subheader title** (e.g., "Why Water Shapes Our World", "The Hidden Power of Atoms").  
                - Content must hook attention with a story, real-world example, or surprising fact.  
                - Tone: engaging, inspiring, but scholarly.  
                - Always exactly one page.
            4. **Introductory Activity ("Let's Get Started")** - A short warm-up activity.  
                - Interactive but simple (e.g., quick brainstorm, matching, or short scenario).  
                - The \`title\` MUST be exactly "Let's Get Started".
            5. **Core Content Sections** - DO NOT limit to a single page.  
                - Break into **multiple subpages**, each with its own unique \`title\` (a subheader).  
                - Example subpage titles:  
                  • "The Early Stages of the Water Cycle"  
                  • "Evaporation and Condensation"  
                  • "Precipitation and Collection"  
                - Each subpage must:  
                  • Have a clear, meaningful title.  
                  • Contain detail-rich explanations with examples, analogies, or visuals.  
                - Flow must be logical across subpages.  
                - This is the body of the textbook chapter.
            6. **Check for Understanding ("Check for Understanding")** - One short formative activity with 3–4 concept questions or problems.  
                - Reinforces key knowledge.  
                - The \`title\` MUST be exactly "Check for Understanding".
            7. **Summary ("Lesson Summary")** - Concise recap of the most important points.  
                - Bullet points or short narrative.  
                - The \`title\` MUST be exactly "Lesson Summary".
            8. **Conclusion ("Wrap Up")** - Motivational, inspiring closure.  
                - Ties lesson back to the big picture.  
                - The \`title\` MUST be exactly "Wrap Up".
            9. **Assessment ("End of Lesson Assessment")** - 8–10 questions total.  
                - Mix of multiple-choice, short-answer, and application questions.  
                - Questions must align with learning objectives.  
                - The first page's \`title\` MUST be "End of Lesson Assessment".
            10. **Answer Key ("Answer Key")** - Provide clear answers to all assessment questions.  
                 - Use the same numbering order as the assessment.  
                 - The \`title\` MUST be exactly "Answer Key".
            11. **References ("References")** - The absolute last page.  
                 - Academic-style reference list.  
                 - Includes both the uploaded file (if applicable) and additional credible references.  
                 - The \`title\` MUST be exactly "References".

            =============================
            STYLE & OUTPUT RULES
            =============================
            - Lesson Titles: MUST NOT copy directly from the source file.  
              • Always rephrase into **original, student-friendly, engaging titles**.  
            - Table of Contents Handling:  
              • If the source text includes a clear "Table of Contents", the lesson/page structure MUST follow the order of topics listed there.  
              • If the source text does NOT include a TOC, generate exactly ONE lesson, following the full textbook structure above.
            
            **CRITICAL QUOTE ESCAPING (NON-NEGOTIABLE):**
            - Any double quotes (") used inside a string value (like in "content" or "title") MUST be escaped with a backslash (\\").
            - **CORRECT EXAMPLE:** \`"content": "He said, \\"This is the correct way.\\""\`
            - **INCORRECT EXAMPLE:** \`"content": "He said, "This is the incorrect way.""\`

            **CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
            - You MUST use LaTeX for all mathematical equations, variables, and chemical formulas.
            - For INLINE formulas, use single dollar signs: $H_2O$.
            - For BLOCK formulas, use double dollar signs: $$E = mc^2$$
            - CRITICAL LATEX ESCAPING IN JSON: Every backslash \`\\\` in LaTeX MUST be escaped with a second backslash. So, \`\\\` becomes \`\\\\\`.
            - For angle measurements, you MUST use the \`\\degree\` command, like so: $90\\\\degree$.

            **5. Diagrams and Figures**
            - If a diagram/figure is detected, you may recreate it as a clean SVG.
            - **CRITICAL SVG ESCAPING:** Inside the \`htmlContent\` string for SVGs, all double quotes (\`"\`) MUST be escaped with a backslash (\`\\\\"\`).

            - Persona: authoritative professor + bestselling author.  
            - Writing style: detail-rich, interactive, narrative-driven.  

            **CRITICAL STYLE RULE:** You MUST use **pure Markdown only**. You MUST NOT use any raw HTML tags like \`<div>\`, \`<span>\`, or \`<h3>\`. The renderer will handle all styling.
              • For **headings**, use Markdown hashes (e.g., \`### Complementary Angles\`).
              • For **key terms**, you MUST make them bold with asterisks (e.g., \`**complementary**\`).
              • For **callouts, notes, or tips**, you MUST use Markdown blockquotes (\`>\`).
              • For **inline code, technical terms, or short quoted phrases**, you MUST use Markdown's backticks (\`\`). Do NOT use double quotes for this purpose.
                - **CORRECT:** The Latin phrase is \`per centum\`.
                - **INCORRECT:** The Latin phrase is "per centum".
              • **Example for a Tip:**
                \`> **Tip:** To find the complement of any given angle, subtract its measure from $90\\degree$.\`

            =============================
            JSON OUTPUT FORMAT
            =============================
            {
              "lessons": [
                {
                  "lessonTitle": "Unit Overview",
                  "pages": [
                    { "title": "Overview", "content": "..." },
                    { "title": "Learning Targets", "content": "..." }
                  ]
                },
                {
                  "lessonTitle": "Lesson ${existingLessonCount + 1}: How Plants Turn Sunlight into Food",
                  "learningObjectives": [
                    "Explain how photosynthesis works",
                    "Identify the role of chlorophyll in the process"
                  ],
                  "pages": [
                    { "title": "Why Plants Are Nature's Solar Panels", "content": "Engaging intro..." },
                    { "title": "Let's Get Started", "content": "..." },
                    { "title": "Capturing Sunlight", "content": "..." },
                    { "title": "Making Glucose", "content": "..." },
                    { "title": "Check for Understanding", "content": "..." },
                    { "title": "Lesson Summary", "content": "..." },
                    { "title": "Wrap Up", "content": "..." },
                    { "title": "End of Lesson Assessment", "content": "..." },
                    { "title": "Answer Key", "content": "..." },
                    { "title": "References", "content": "..." }
                  ]
                }
              ]
            }

            =============================
            TEXT TO PROCESS
            =============================
            ${combinedText}
            `;

            const aiResponse = await callGeminiWithLimitCheck(finalPrompt);
            const lessonsArray = sanitizeLessonsJson(aiResponse);

            let lessonCounter = existingLessonCount + 1;
            const numberedLessons = lessonsArray.map((lesson) => {
                if (lesson.lessonTitle.toLowerCase().includes('unit overview')) {
                    return { ...lesson, lessonTitle: 'Unit Overview' };
                }
                const baseTitle = lesson.lessonTitle.replace(/^Lesson\s*\d*:\s*/i, '');
                const newTitle = `Lesson ${lessonCounter}: ${baseTitle}`;
                lessonCounter++;
                return { ...lesson, lessonTitle: newTitle };
            });

            setPreviewLessons(numberedLessons);
            setSelectedLessonIndex(0);
            setSelectedPageIndex(0);

        } catch (err) {
            console.error('Lesson generation error:', err);
            setError(err.message.includes('overloaded')
                ? 'The AI service is currently busy. Please try again in a moment.'
                : 'The AI returned an invalid response. Please try regenerating.'
            );
        } finally {
            setIsProcessing(false);
            setProgressMessage('');
        }
    };
    
    const handleSaveLesson = async () => {
        if (previewLessons.length === 0 || !unitId || !subjectId) {
            setError('Cannot save without generated lessons and unit context.');
            return;
        }
        setSaving(true);
        try {
            const savePromises = previewLessons.map((lesson, index) =>
                addDoc(collection(db, 'lessons'), {
                    title: lesson.lessonTitle,
                    unitId,
                    subjectId,
                    pages: lesson.pages,
                    objectives: lesson.learningObjectives || [],
                    contentType: "studentLesson",
                    createdAt: serverTimestamp(),
                    order: existingLessonCount + index,
                })
            );
            await Promise.all(savePromises);
            showToast(`${previewLessons.length} lesson(s) saved successfully!`, 'success');
            onClose();
        } catch (err) {
            console.error('Error saving lessons: ', err);
            setError('Failed to save one or more lessons.');
        } finally {
            setSaving(false);
        }
    };

    const selectedLesson = previewLessons[selectedLessonIndex];
    const selectedPage = selectedLesson?.pages[selectedPageIndex];

    const objectivesAsMarkdown = useMemo(() => {
        if (!selectedLesson?.learningObjectives?.length) return null;
        return selectedLesson.learningObjectives.map(obj => `* ${obj}`).join('\n');
    }, [selectedLesson]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 pb-4 border-b border-neumorphic-shadow-dark/20">
                <div className="flex justify-between items-center mb-2">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800">Generate with AI</Dialog.Title>
                    <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 rounded-lg hover:shadow-neumorphic-inset">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        Back
                    </button>
                </div>
                 <p className="text-slate-500">
                    Upload a document and AI will structure it into a full unit.
                </p>
            </div>

            <div className="flex-grow pt-4 overflow-hidden flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                    {isProcessing ? (
                        <div className="w-full flex-grow flex flex-col items-center justify-center p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                            <Spinner/>
                            <p className="text-sm font-semibold text-slate-700 mt-4">{progressMessage}</p>
                        </div>
                    ) : (
                        !file ? (
                            <label htmlFor="file-upload" className="relative flex-grow block w-full rounded-2xl p-8 text-center cursor-pointer transition-shadow duration-300 bg-neumorphic-base shadow-neumorphic-inset hover:shadow-neumorphic">
                                <div className="flex flex-col items-center justify-center h-full">
                                    <DocumentArrowUpIcon className="mx-auto h-16 w-16 text-slate-400" />
                                    <span className="mt-4 block text-sm font-semibold text-slate-700">
                                        Click to upload or drag & drop
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500">
                                        PDF, DOCX, or TXT
                                    </span>
                                </div>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="relative w-full flex-grow rounded-2xl p-4 shadow-neumorphic flex flex-col justify-center">
                                <div className="flex items-center gap-4">
                                    <DocumentTextIcon className="h-12 w-12 text-sky-600 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="truncate font-semibold text-slate-800">{file.name}</p>
                                        <p className="text-sm text-slate-500">{Math.round(file.size / 1024)} KB</p>
                                    </div>
                                </div>
                                <button onClick={removeFile} className="absolute top-3 right-3 p-1.5 rounded-full hover:shadow-neumorphic-inset transition-colors">
                                    <XMarkIcon className="h-5 w-5 text-slate-500" />
                                </button>
                            </div>
                        )
                    )}

                    <div className="space-y-2">
                        <h3 className="text-base font-semibold text-slate-700">Scaffolding (Optional)</h3>
                        <div className="bg-neumorphic-base p-3 rounded-xl max-h-[18rem] overflow-y-auto shadow-neumorphic-inset">
                            <p className="text-xs text-slate-500 mb-3">Explicitly select lessons for the AI to build upon.</p>
                            {subjectContext && subjectContext.units.length > 0 ? (
                                subjectContext.units.slice().sort((a,b) => (a.order || 0) - (b.order || 0)).map(unit => {
                                    const lessonsInUnit = subjectContext.lessons.filter(lesson => lesson.unitId === unit.id);
                                    if (lessonsInUnit.length === 0) return null;
                                    const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                    const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                    const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                    const isExpanded = expandedScaffoldUnits.has(unit.id);
                                    return (
                                        <div key={unit.id} className="pt-2 first:pt-0">
                                            <div className="flex items-center p-2 rounded-md">
                                                <button onClick={() => handleToggleUnitExpansion(unit.id)} className="p-1"><ChevronRightIcon className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button>
                                                <input type="checkbox" id={`scaffold-unit-${unit.id}`} checked={isAllSelected} ref={el => { if(el) el.indeterminate = isPartiallySelected; }} onChange={() => handleUnitCheckboxChange(lessonsInUnit)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 ml-2" />
                                                <label htmlFor={`scaffold-unit-${unit.id}`} className="ml-2 flex-1 text-sm font-semibold text-slate-700 cursor-pointer">{unit.title}</label>
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
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-slate-800">
                                                                {lesson.title}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (<p className="text-sm text-slate-400">Scanning subject content...</p>)}
                        </div>
                    </div>

                    <button onClick={handleGenerateLesson} disabled={!file || isProcessing} className="w-full flex items-center justify-center font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl py-3 mt-auto shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-60">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {previewLessons.length > 0 ? 'Regenerate Lessons' : 'Generate Lessons'}
                    </button>
                </div>
                
                <div className="w-full md:w-2/3 flex flex-col bg-neumorphic-base rounded-2xl p-3 shadow-neumorphic-inset overflow-hidden">
                    {previewLessons.length > 0 ? (
                        <div className="flex-grow flex flex-col md:flex-row gap-3 overflow-hidden">
                            <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col">
                                <h4 className="p-2 text-sm font-semibold text-slate-600">Generated Lessons</h4>
                                <div className="flex-grow overflow-y-auto pr-1 space-y-1.5">
                                    {previewLessons.map((lesson, index) => (
                                        <button key={index} onClick={() => { setSelectedLessonIndex(index); setSelectedPageIndex(0); }} className={`w-full text-left p-3 rounded-xl transition-all duration-300 ${selectedLessonIndex === index ? 'bg-white shadow-neumorphic ring-2 ring-sky-300' : 'bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset'}`}>
                                            <span className="font-semibold text-slate-800">{lesson.lessonTitle}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div className="w-full md:w-2/3 flex-grow bg-neumorphic-base rounded-xl flex flex-col overflow-hidden shadow-neumorphic min-h-0">
                                {selectedLesson && (
                                  <>
                                    <div className="flex-shrink-0 p-4 border-b border-neumorphic-shadow-dark/20">
                                      <h3 className="text-lg font-bold text-slate-900 truncate">{selectedLesson.lessonTitle}</h3>
                                      {objectivesAsMarkdown && ( <div className="my-2 p-3 bg-sky-50 border-l-4 border-sky-300 rounded-r-lg">
                                          <p className="font-semibold mb-1 text-sky-900">Learning Objectives</p>
                                          <div className="prose prose-sm max-w-none prose-sky text-sky-800">
                                            <LessonPage page={{ content: objectivesAsMarkdown }} isEditable={false} />
                                          </div>
                                        </div>)}
                                      <div className="flex space-x-2 mt-2 -mb-2 pb-2 overflow-x-auto">
                                        {selectedLesson.pages.map((page, index) => (
                                          <button
                                            key={index}
                                            onClick={() => setSelectedPageIndex(index)}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedPageIndex === index ? "bg-sky-600 text-white shadow-neumorphic" : "bg-neumorphic-base text-slate-600 shadow-neumorphic hover:shadow-neumorphic-inset"}`}
                                          >{page.title}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex-grow min-h-0 overflow-y-auto p-6">
                                      <div className="prose max-w-none prose-slate">
                                        {selectedPage ? <LessonPage page={selectedPage} isEditable={false} /> : <p>Select a page to view its content.</p>}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                        </div>
                    ) : (
                        <div className="m-auto text-center">
                            <DocumentTextIcon className="mx-auto h-16 w-16 text-slate-300" />
                            <p className="mt-2 text-sm font-semibold text-slate-500">AI-Generated Preview</p>
                            <p className="mt-1 text-xs text-slate-400">Your unit lessons will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-neumorphic-shadow-dark/20">
                {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                <button className="px-4 py-2 bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset" onClick={onClose}>Cancel</button>
                <button onClick={handleSaveLesson} disabled={saving || previewLessons.length === 0 || isProcessing} className="px-4 py-2 font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset disabled:opacity-60">
                    {saving ? 'Saving...' : `Save ${previewLessons.length} Lesson(s)`}
                </button>
            </div>
        </div>
    );
}