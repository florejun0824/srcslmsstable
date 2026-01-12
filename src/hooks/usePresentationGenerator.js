// src/hooks/usePresentationGenerator.js
import { useState, useCallback } from 'react';
import { callGeminiWithLimitCheck } from '../services/aiService';
import { createPresentationFromData } from '../services/googleSlidesService';

// Helper to format notes for the final slide creation
// UPDATED: Handles both object (AI generated) and string (User edited) formats
const formatNotesToString = (notesInput) => {
    // If the user has edited the notes in the WYSIWYG editor, they come back as a string.
    if (typeof notesInput === 'string') {
        return notesInput;
    }

    if (!notesInput || typeof notesInput !== 'object') {
        return "No speaker notes available.";
    }

    const { talkingPoints, interactiveElement, slideTiming } = notesInput;

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

    // Target the first selected lesson
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
        
        // LOGIC: Determine if this is the final text chunk
        const isLastBatch = (i === validPages.length - 1);

        // --- CONTEXT MEMORY ---
        // Pass ALL previous titles to ensure the AI knows what has been covered.
        const existingTitles = accumulatedSlides
            .map(s => s.title)
            .filter(t => t) 
            .join(" | "); 
        
        setPptStatus(`Analyzing section ${currentStep} of ${totalSteps}...`);
        setPptProgress(Math.round((currentStep / totalSteps) * 90));

        const prompt = `
            SYSTEM: You are a JSON-only API. You are NOT a chatbot.
            INSTRUCTION: Convert the educational content below into a Google Slides JSON structure.

            **GLOBAL CONTEXT (DO NOT IGNORE):**
            You are processing Part ${currentStep} of ${totalSteps} of a single lesson.
            
            **MEMORY (ALREADY CREATED SLIDES):**
            [ ${existingTitles} ]

            **STRICT DUPLICATE & CONTINUATION LOGIC:** Check the "MEMORY" list above.
            1. **If the topic is NEW:** Create a standard slide.
            2. **If the topic EXISTS but the text has NEW DETAILS:** You MUST create a continuation slide. 
               - **Title Format:** Use "${"{Topic} (Continued)"}" or "${"{Topic}: Key Details"}" to distinguish it.
               - **Content:** Do NOT repeat the definition. Focus purely on the new deep details.
            3. **If the text is merely a summary/repetition:** SKIP IT completely.

            STRICT BEHAVIORAL CONSTRAINTS:
            1. Output ONLY valid JSON starting with '{' and ending with '}'.
            2. NO MARKDOWN formatting.
            3. **NO META-REFERENCES** (e.g., "According to the text").

            ROLE:
            You are an **Expert devoted Catholic Elementary School Teacher**. You value **Clarity and Precision**.

            **1. SLIDE BODY (The "What" - Natural & Engaging):**
            - **FORMAT:** Use a **Natural Paragraph** structure. 
            - **Rule:** Only use bullet points if you are listing 3 or more distinct steps or items. Otherwise, use flowing sentences.
            - **Content:** Start with the core concept/definition (keep technical terms), then immediately explain the "How" or "Why" in the next sentence.
            - **Constraint:** **MAXIMUM 60 WORDS** per slide body. Keep it punchy but deep.
            - **Tone:** Educational but accessible. Avoid dry, robotic definitions.
            - **Example:**
              "Deliberation is the systematic exploration of all possible options before we act. By researching facts and weighing the pros and cons, we ensure our choices are not impulsive. This process allows our intellect to map out the best path forward."

            **2. TALKING POINTS (The "Script" - Relatable & Filipino):**
            - **Target Audience:** A 10-year-old student.
            - **Style:** "Let's break this down..." (Conversational but educational).
            - **Local Context:** INTEGRATE A PHILIPPINE SCENARIO (e.g., Family dynamics, School life, Filipino values like 'utang na loob', 'respeto').
            - **Goal:** Use the talking point to explain the "Slide Body" in a story format.

            **3. CONTENT TYPE DETECTION & FORMATTING RULES:**

            * **TYPE A: GENERAL LESSON:**
                - Follow the "Slide Body" rules above. **Prioritize Natural Flow.**

           
* **TYPE C: ASSESSMENT / QUIZ (STRICT TRIGGER):**
                - **TRIGGER:** Only generate if you see explicit headers: "End-of-Lesson Assessment", "Summative Test", or "Quiz".
                - **NEGATIVE CONSTRAINT:** IGNORE "Reflection Questions", "Guide Questions", "Points to Ponder". These are NOT quizzes.
                - **Constraint:** Max 2 questions per slide.
                - **Title:** "End of Lesson Assessment" (Number the parts if needed, e.g., Part 1).
                - **FORMAT:** Questions MUST be in Multiple Choice format.
                - **STRICT OUTPUT FORMAT:**
                  1. [Question Text Here?]
                  a. [Option A]
                  b. [Option B]
                  c. [Option C]
                  d. [Option D]

            * **TYPE D: ANSWER KEY:**
                - **CONDITION:** MUST generate immediately after Type C slides.

            * **TYPE E: REFERENCES:**
                - **CONDITION:** ONLY if "IS FINAL BATCH" is "true". Only generate if you see explicit headers: "References", or "Reference".
				- **Rule:** Copy in Verbatim the list of the References that was used.

            **REQUIRED JSON SCHEMA:**
            {
              "slides": [
                {
                  "title": "Deliberation: The Process",
                  "body": "Deliberation is the systematic exploration of all possible choices. We identify every option available to us and carefully weigh the advantages and disadvantages. This critical step ensures we verify our facts before making a firm commitment.",
                  "notes": { 
                    "talkingPoints": "Let's imagine you are planning a surprise party for your Lola. You don't just buy the first cake you see! You check the price, you ask if she likes chocolate or ube, and you check if the shop delivers. That detailed checking? That is Deliberation.", 
                    "slideTiming": "3 mins" 
                  }
                }
              ]
            }

            **INPUT DATA CONTEXT:**
            - CURRENT BATCH: ${currentStep} of ${totalSteps}
            - IS FINAL BATCH: ${isLastBatch}
            
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
        showToast("Generation complete! Review your slides.", "success");

        setPreviewData({ 
            slides: accumulatedSlides, 
            lessonIds, 
            lessonsData, 
            unitsData 
        });
        
        setIsGeneratingPPT(false);
        setPptProgress(0);
    }, 800);

    return true; 
  }, [showToast]);

  // --- Logic: Send JSON to Google Slides API ---
  // UPDATED: Now accepts 'editedSlides' to support WYSIWYG editing
  const savePresentation = useCallback(async (activeSubject, editedSlides = null) => {
    if (!previewData) { 
        showToast("No preview data available.", "error"); 
        return; 
    }

    setIsSavingPPT(true);

    try {
        const { lessonIds, lessonsData, unitsData } = previewData;
        
        // Use edited slides if available, otherwise fallback to original AI generation
        const finalSlides = editedSlides || previewData.slides;

        // Determine Titles
        const firstLesson = lessonsData.find(l => l.id === lessonIds[0]); 
        const unit = firstLesson ? unitsData.find(u => u.id === firstLesson.unitId) : null;

        const subjectName = activeSubject?.title ? String(activeSubject.title) : "General Subject";
        const unitName = unit?.name ? String(unit.name) : "General Unit";
        const sourceTitle = firstLesson?.title || "Untitled Lesson";
        
        const presentationTitle = `Presentation: ${sourceTitle}`;

        // Clean Data for Service
        const cleanedSlides = finalSlides.map((slide, index) => {
            let bodyText = "";
            
            // Handle body text normalizations
            if (typeof slide.body === 'string') {
                bodyText = slide.body;
            } else if (Array.isArray(slide.body)) {
                bodyText = slide.body.join('\n');
            } else if (slide.body) {
                bodyText = String(slide.body);
            }

            let titleText = slide.title ? String(slide.title) : `Slide ${index + 1}`;

            return { 
                ...slide, 
                title: titleText,
                body: bodyText.split('\n').map(line => line.trim()).join('\n'), 
                // Format notes (handles both strings from editor and objects from AI)
                notes: formatNotesToString(slide.notes) 
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