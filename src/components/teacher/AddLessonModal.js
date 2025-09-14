// src/components/teacher/AddLessonModal.js

import React, { useState, useCallback } from 'react';
import { db, storage } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import mammoth from 'mammoth';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import LessonPage from './LessonPage';

// ✅ Use legacy PDF.js build
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdfjs/pdf.worker.min.js`;

// ... (keep all helper functions as they are) ...
const chunkText = (text, chunkSize = 8000) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
};

const sanitizeLessonsJson = (aiResponse) => {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in AI response.");
    let parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
      throw new Error('JSON response does not contain a "lessons" array.');
    }

    return parsed.lessons.map((lesson, lessonIdx) => ({
      lessonTitle:
        typeof lesson.lessonTitle === "string" && lesson.lessonTitle.length > 0
          ? lesson.lessonTitle
          : `Untitled Lesson ${lessonIdx + 1}`,
      learningObjectives: Array.isArray(lesson.learningObjectives)
        ? lesson.learningObjectives.filter((obj) => typeof obj === "string")
        : [],
      pages: Array.isArray(lesson.pages)
        ? lesson.pages.map((p, pageIdx) => {
            const baseTitle =
              typeof p.title === "string" && p.title.length > 0
                ? p.title
                : `Page ${pageIdx + 1}`;

            if (p.type === "diagram-data") {
              if (typeof p.content === "object") {
                return {
                  title: baseTitle,
                  type: "diagram-data",
                  content: {
                    htmlContent:
                      typeof p.content.htmlContent === "string"
                        ? p.content.htmlContent
                        : undefined,
                    generatedImageUrl:
                      typeof p.content.generatedImageUrl === "string"
                        ? p.content.generatedImageUrl
                        : undefined,
                    labels: Array.isArray(p.content.labels)
                      ? p.content.labels
                      : [],
                  },
                };
              } else if (typeof p.content === "string") {
                return {
                  title: baseTitle,
                  type: "text",
                  content: p.content,
                };
              }
            }
            return {
              title: baseTitle,
              content: typeof p.content === "string" ? p.content : "",
              type: p.type || "text",
            };
          })
        : [],
    }));
  } catch (err) {
    console.error("sanitizeLessonsJson failed:", err);
    return [
      {
        lessonTitle: "Error Parsing Response",
        pages: [
          {
            title: "Parsing Error",
            content:
              "⚠️ The AI response could not be parsed properly. Please check the AI model or regenerate.",
          },
        ],
      },
    ];
  }
};

const renderAndUploadDiagram = async (pageOrSvg, unitId) => {
  if (typeof pageOrSvg === 'string' && pageOrSvg.trim().startsWith('<svg')) {
    return {
      type: 'diagram-data',
      content: {
        htmlContent: pageOrSvg,
        labels: []
      }
    };
  }
  if (pageOrSvg?.getViewport) {
    const viewport = pageOrSvg.getViewport({ scale: 1.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await pageOrSvg.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          try {
            const storagePath = `diagrams/${unitId}/${Date.now()}.webp`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            resolve({
              type: 'diagram-data',
              content: {
                generatedImageUrl: url,
                labels: []
              }
            });
          } catch (err) {
            reject(err);
          }
        },
        'image/webp',
        0.7
      );
    });
  }

  throw new Error('renderAndUploadDiagram: Unsupported input type');
};

export default function AddLessonModal({ isOpen, onClose, unitId, subjectId }) {
  const [file, setFile] = useState(null);
  const [previewLessons, setPreviewLessons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

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
    } else if (
      fileToProcess.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
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
        const extractedText = await extractTextFromFile(file);

        setProgressMessage('Step 2 of 3: Processing document with AI...');
        const textChunks = chunkText(extractedText);
        const processingPromises = textChunks.map((chunk) => {
          const chunkPrompt = `Paraphrase and rewrite the following text to be clear, concise, and original, while preserving its educational meaning. Use Markdown for formatting. Do not add titles, just return the processed text. RAW TEXT: ${chunk}`;
          return callGeminiWithLimitCheck(chunkPrompt);
        });
        const processedChunks = await Promise.all(processingPromises);
        const combinedText = processedChunks.join('\n\n');

        setProgressMessage('Step 3 of 3: Structuring final lessons...');
        const finalPrompt = `
     You are an expert curriculum designer and bestselling textbook author. 
     Take the processed text and structure it into a **unit with lessons**, following the NON-NEGOTIABLE textbook chapter sequence.

     =============================
     STRICT LESSON STRUCTURE
     =============================
     1. **Unit Overview** - ONLY contains:  
          • Overview of the unit (short, 1–2 paragraphs).  
          • Learning Targets (clear bullet points).  
        - Nothing else.  
        - IMPORTANT: The Unit Overview MUST NEVER be numbered. Do not call it Lesson 0 or Lesson 1. Always exactly "Unit Overview".
     2. **Learning Objectives** - MUST be the first page of every lesson.  
        - Use the "learningObjectives" array in JSON.  
        - Objectives must be: specific, measurable, and student-friendly.
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
           "lessonTitle": "Lesson 1: How Plants Turn Sunlight into Food",
           "learningObjectives": [
             "Explain how photosynthesis works",
             "Identify the role of chlorophyll in the process"
           ],
           "pages": [
             { "title": "Learning Objectives", "content": "..." },
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

        // ✅ Numbering logic: skip Unit Overview
        let lessonCounter = 1;
        const numberedLessons = lessonsArray.map((lesson) => {
          if (lesson.lessonTitle.toLowerCase().includes('unit overview')) {
            return { ...lesson, lessonTitle: 'Unit Overview' };
          }
          const newTitle = `Lesson ${lessonCounter}: ${lesson.lessonTitle.replace(
            /^Lesson\s*\d+:\s*/i,
            ''
          )}`;
          lessonCounter++;
          return { ...lesson, lessonTitle: newTitle };
        });

        setPreviewLessons(numberedLessons);
        setSelectedLessonIndex(0);
        setSelectedPageIndex(0);
      } catch (err) {
        console.error('Lesson generation error:', err);
        setError(err.message || 'Failed to generate lessons. Please try again.');
      } finally {
        setIsProcessing(false);
        setProgressMessage('');
      }
    };

  // ... (keep the rest of the component, handleSaveLesson, handleClose, and the JSX, as they are) ...
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
          createdAt: serverTimestamp(),
          order: index,
        })
      );
      await Promise.all(savePromises);
      handleClose();
    } catch (err) {
      console.error('Error saving lessons: ', err);
      setError('Failed to save one or more lessons.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    setFile(null);
    setPreviewLessons([]);
    setError('');
    setIsProcessing(false);
    setSaving(false);
    setProgressMessage('');
    onClose();
  }, [onClose]);

  const selectedLesson = previewLessons[selectedLessonIndex];
  const selectedPage = selectedLesson?.pages[selectedPageIndex];

  return (
    <Dialog open={isOpen} onClose={handleClose} static={true} className="z-50">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="w-full max-w-6xl rounded-2xl bg-white p-8 shadow-2xl">
          <Title className="text-2xl font-bold text-slate-800">
            Create Unit Lessons From File
          </Title>
          <p className="mt-1 text-slate-500">
            Upload a single document (PDF, DOCX, TXT) and AI will structure it
            into a full unit.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* --- Left Column: Upload & Generate --- */}
            <div className="flex flex-col space-y-6">
              {!file ? (
                <label
                  htmlFor="file-upload"
                  className="relative block w-full h-48 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-slate-400 cursor-pointer transition-colors"
                >
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                  <span className="mt-2 block text-sm font-semibold text-slate-700">
                    Click to upload or drag and drop
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    PDF, DOCX, or TXT
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="relative w-full rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="h-10 w-10 text-blue-600 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="truncate font-semibold text-slate-800">
                        {file.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {Math.round(file.size / 1024)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-slate-500" />
                  </button>
                </div>
              )}
              <div className="mt-auto">
                {isProcessing ? (
                  <div className="w-full text-center p-4 rounded-lg bg-slate-100">
                    <p className="text-sm font-medium text-slate-700">
                      {progressMessage}
                    </p>
                    <div className="mt-3 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateLesson}
                    disabled={!file || isProcessing}
                    size="xl"
                    className="w-full"
                    icon={SparklesIcon}
                  >
                    {previewLessons.length > 0
                      ? 'Regenerate Lessons'
                      : 'Generate Lessons'}
                  </Button>
                )}
              </div>
            </div>

            {/* --- Right Column: Enhanced Preview --- */}
            <div className="h-[550px] rounded-xl border border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
              {previewLessons.length > 0 ? (
                <div className="grid grid-cols-12 h-full">
                  <div className="col-span-4 bg-white border-r border-slate-200 overflow-y-auto">
                    <h4 className="p-3 text-xs font-bold uppercase text-slate-500 tracking-wider sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                      Generated Lessons
                    </h4>
                    <nav className="p-2 space-y-1">
                      {previewLessons.map((lesson, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedLessonIndex(index);
                            setSelectedPageIndex(0);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${
                            selectedLessonIndex === index
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold inline-flex items-center justify-center ${
                              selectedLessonIndex === index
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {lesson.lessonTitle
                              .toLowerCase()
                              .includes('unit overview')
                              ? '✓'
                              : index}
                          </span>
                          <span className="truncate">{lesson.lessonTitle}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                  <div className="col-span-8 flex flex-col h-full">
                    {selectedLesson && (
                      <>
                        <div className="p-4 border-b border-slate-200 flex-shrink-0">
                          <h3 className="text-lg font-bold text-slate-900 truncate">
                            {selectedLesson.lessonTitle}
                          </h3>
                          <div className="flex space-x-2 mt-2 overflow-x-auto pb-2">
                            {selectedLesson.pages.map((page, index) => (
                              <button
                                key={index}
                                onClick={() => setSelectedPageIndex(index)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                  selectedPageIndex === index
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                {page.title}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-6 overflow-y-auto bg-white flex-grow">
                          {selectedPage ? (
                            <LessonPage page={selectedPage} isEditable={false} />
                          ) : (
                            <p>Select a page to view its content.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="m-auto text-center">
                  <DocumentTextIcon className="mx-auto h-16 w-16 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    AI-Generated Preview
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Your unit lessons will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm mt-4 text-center">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-8">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveLesson}
              loading={saving}
              disabled={
                saving || previewLessons.length === 0 || isProcessing
              }
              icon={CheckCircleIcon}
            >
              {saving
                ? 'Saving...'
                : `Save ${previewLessons.length} Lessons`}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}