// src/hooks/usePresentationGenerator.js
import { useState, useCallback } from 'react';
import { callGeminiWithLimitCheck } from '../services/aiService';
import { createPresentationFromData } from '../services/googleSlidesService';

// Helper to format notes for the final slide creation
const formatNotesToString = (notesObject) => {
    if (!notesObject || typeof notesObject !== 'object') {
        return "No speaker notes available.";
    }
    const { talkingPoints, interactiveElement, slideTiming } = notesObject;
    let formattedString = `[TALKING POINTS]\n${talkingPoints || 'N/A'}\n\n`;
    formattedString += `[INTERACTIVE ELEMENT]\n${interactiveElement || 'N/A'}\n\n`;
    formattedString += `[SUGGESTED TIMING: ${slideTiming || 'N/A'}]`;
    return formattedString;
};

export const usePresentationGenerator = (showToast) => {
  // --- State ---
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [pptProgress, setPptProgress] = useState(0);
  const [pptStatus, setPptStatus] = useState("Initializing...");
  const [previewData, setPreviewData] = useState(null);
  const [isSavingPPT, setIsSavingPPT] = useState(false);

  // --- Logic: Generate JSON Preview from Lesson Content ---
  // FIXED: Default lessonsData to [] to prevent 'filter of undefined' errors
  const generatePreview = useCallback(async (lessonIds, lessonsData = [], activeSubject, unitsData) => {
    // 1. Validation
    if (!activeSubject) { 
        showToast("No active subject selected.", "warning"); 
        return false; 
    }

    if (!Array.isArray(lessonsData)) {
         showToast("Invalid lesson data.", "error");
         return false;
    }

    const selectedLessons = lessonsData.filter(l => lessonIds.includes(l.id));
    if (selectedLessons.length === 0) {
        showToast("No lesson found.", "error");
        return false;
    }

    // Target the first selected lesson (currently UI restricts to 1 usually, but logic supports arrays)
    const targetLesson = selectedLessons[0];
    const validPages = (targetLesson.pages || []).filter(p => p.content && p.content.trim().length > 0);

    if (validPages.length === 0) {
        showToast("This lesson has no content to generate slides from.", "error");
        return false;
    }

    // 2. Initialization
    setIsGeneratingPPT(true);
    setPptProgress(5);
    setPptStatus("Initializing AI Model...");

    // Start with Master Title Slide
    let accumulatedSlides = [
        {
            title: targetLesson.title,
            body: `Subject: ${activeSubject.title}`,
            notes: { talkingPoints: "Introduction to the lesson topic.", interactiveElement: "N/A", slideTiming: "1 min" }
        }
    ];

    // 3. Process Pages Sequentially
    for (let i = 0; i < validPages.length; i++) {
        const page = validPages[i];
        const currentStep = i + 1;
        const totalSteps = validPages.length;
        
        setPptStatus(`Analyzing section ${currentStep} of ${totalSteps}...`);
        setPptProgress(Math.round((currentStep / totalSteps) * 90));

        // The "Expert Educational Synthesizer" Prompt
        const prompt = `
		    SYSTEM: You are a JSON-only API. You are NOT a chatbot.
		    INSTRUCTION: Convert the educational content below into a Google Slides JSON structure.

		    STRICT BEHAVIORAL CONSTRAINTS:
		    1. Output ONLY valid JSON.
		    2. Start immediately with '{' and end with '}'.
		    3. NO MARKDOWN formatting outside the JSON string.

		    ROLE & MINDSET:
		    You are an **Expert Educational Synthesizer**.
		    **GOAL:** Create slides that are academically accurate but easy to digest.
		    **PRIORITY:** Mix **Exact Terminology** with **Simple Explanations**.

		    **CRITICAL: CONTENT PROCESSING LOGIC (STRICT)**
    
		    1. **DEFINITIONS (KEEP EXACT):**
		       - When introducing a key term (e.g., "The Object", "Intention", "Circumstances"), you must use the **exact definition** provided in the source text. 
		       - Do not paraphrase the formal definition.

		    2. **EXPLANATIONS (SIMPLIFY):**
		       - After the definition, you must **paraphrase the explanation** into simple, conversational English.
		       - Use the "Feynman Technique": Explain it as if teaching a student who is hearing it for the first time.
		       - Address the student directly ("This means that when you...").

		    3. **SCENARIO HANDLING:**
		       - **IF** the source text contains a story/scenario: Use it to open the slide.
		       - **IF NO** scenario exists: Go straight to the Term/Concept. **DO NOT invent scenarios.**

		    4. **FORMATTING:**
		       - **No Labels:** Do NOT use bold headers like "**Definition**:" or "**Analysis**:" in the body.
		       - **Flow:** Write the exact definition first. Add a paragraph break (\\n\\n). Write the simplified explanation next.

		    **CRITICAL: SPEAKER NOTES (THE TEACHER'S CHEAT SHEET)**
		    - The speaker notes must provide the "Deep Dive" for the teacher.
		    - If the slide text is simplified, the Notes should contain the **original, complex context** or historical background (e.g., Greek vs. Christian logic) so the teacher can answer advanced questions.

		    **REQUIRED JSON SCHEMA:**
		    {
		      "slides": [
		        {
		          "title": "Slide Title (e.g., 'The Object of the Act')",
		          "body": "The Object of the Act is the primary indicator of whether an action is good or evil, determined by the inherent nature of the action itself. [Exact definition from text] \\n\\nIn simpler terms, look at the action itself before judging the motive. For example, stealing is 'objectively' wrong, even if you did it to help a friend. The 'what' matters before the 'why'. [Simplified explanation]", 
		          "tableData": {
		              "headers": [],
		              "rows": []
		          },
		          "notes": { 
		            "talkingPoints": "TEACHER CONTEXT: Emphasize that 'The Object' is independent of the person. In Aquinas's view, some acts (malum in se) are evil regardless of intention.", 
		            "interactiveElement": "Ask: Can a good intention ever make a bad action right?", 
		            "slideTiming": "3 mins" 
		          }
		        }
		      ]
		    }

		    **CONTENT TO PROCESS:**
		    ${page.content}
		`;

        try {
            const aiResponseText = await callGeminiWithLimitCheck(prompt);
            
            // --- Robust Parsing Logic ---
            let jsonText = aiResponseText;
            const firstBrace = aiResponseText.indexOf('{');
            const lastBrace = aiResponseText.lastIndexOf('}');
        
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonText = aiResponseText.substring(firstBrace, lastBrace + 1);
            }

            const parsed = JSON.parse(jsonText);

            if (parsed.slides && Array.isArray(parsed.slides)) {
                accumulatedSlides = [...accumulatedSlides, ...parsed.slides];
            }
        } catch (err) {
            console.error(`Error processing slide chunk ${i + 1}:`, err);
            // We continue loop even if one chunk fails, to salvage the rest of the presentation
        }
    }

    if (accumulatedSlides.length <= 1) {
        showToast("Failed to generate slides. Please check lesson content.", "error");
        setIsGeneratingPPT(false);
        setPptProgress(0);
        return false;
    }

    // 4. Finalize
    setPptStatus("Finalizing layout...");
    setPptProgress(100);

    // Artificial delay for UX smoothing
    setTimeout(() => {
        showToast("Presentation generation complete!", "success");

        setPreviewData({ 
            slides: accumulatedSlides, 
            lessonIds, 
            lessonsData, 
            unitsData 
        });
        
        setIsGeneratingPPT(false);
        setPptProgress(0);
    }, 800);

    return true; // Signal success
  }, [showToast]);

  // --- Logic: Send JSON to Google Slides API ---
  const savePresentation = useCallback(async (activeSubject) => {
    if (!previewData) { 
        showToast("No preview data available.", "error"); 
        return; 
    }

    setIsSavingPPT(true);

    try {
        const { slides, lessonIds, lessonsData, unitsData } = previewData;

        // Determine Titles
        const firstLesson = lessonsData.find(l => l.id === lessonIds[0]); 
        const unit = firstLesson ? unitsData.find(u => u.id === firstLesson.unitId) : null;

        const subjectName = activeSubject?.title ? String(activeSubject.title) : "General Subject";
        const unitName = unit?.name ? String(unit.name) : "General Unit";
        const sourceTitle = firstLesson?.title || "Untitled Lesson";
        
        const presentationTitle = `Presentation: ${sourceTitle}`;

        // Clean Data for Service
        const cleanedSlides = slides.map((slide, index) => {
            let bodyText = "";
            if (typeof slide.body === 'string') bodyText = slide.body;
            else if (Array.isArray(slide.body)) bodyText = slide.body.join('\n');
            else if (slide.body) bodyText = String(slide.body);

            let titleText = slide.title ? String(slide.title) : `Slide ${index + 1}`;

            return { 
                ...slide, 
                title: titleText,
                body: bodyText.split('\n').map(line => line.trim()).join('\n'), 
                notes: formatNotesToString(slide.notes || {}) 
            };
        });

        // Call Service
        const presentationUrl = await createPresentationFromData(
            cleanedSlides, 
            presentationTitle, 
            subjectName, 
            unitName
        );

        window.open(presentationUrl, '_blank');
        showToast("Presentation created successfully!", "success");

    } catch (error) { 
        console.error("Presentation Creation Error:", error); 
        showToast(`Creation Error: ${error.message}`, "error"); 
    } finally { 
        setIsSavingPPT(false); 
    }
  }, [previewData, showToast]);

  return {
    isGeneratingPPT,
    pptProgress,
    pptStatus,
    previewData,
    setPreviewData,
    isSavingPPT,
    generatePreview,
    savePresentation
  };
};