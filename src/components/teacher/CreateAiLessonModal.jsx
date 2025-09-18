import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

// Helper function to extract JSON from a potentially conversational string
const extractJson = (text) => {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("AI response did not contain a valid JSON object.");
    }
    return text.substring(firstBrace, lastBrace + 1);
};

// A more robust JSON parsing function to handle minor AI errors like trailing commas.
const tryParseJson = (jsonString) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn("Standard JSON.parse failed. Attempting to fix and re-parse.", error);
        // Attempt to fix trailing commas
        let sanitizedString = jsonString.replace(/,\s*([}\]])/g, '$1');
         sanitizedString = sanitizedString.replace(/,\s*}(?=\s*$)/, '}');
        try {
            return JSON.parse(sanitizedString);
        } catch (finalError) {
            console.error("Failed to parse JSON even after sanitization.", finalError);
            throw error;
        }
    }
};


export default function CreateAiLessonModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        generationTarget: 'studentLesson',
        format: '5Es',
        scope: 'byUnit',
    });
    
    const [content, setContent] = useState('');
    const [lessonCount, setLessonCount] = useState(1);
    const [pagesPerLesson, setPagesPerLesson] = useState(5);
    
    const [contentStandard, setContentStandard] = useState('');
    const [performanceStandard, setPerformanceStandard] = useState('');
    const [learningCompetencies, setLearningCompetencies] = useState('');

    const [allSubjects, setAllSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [unitsForSubject, setUnitsForSubject] = useState([]);
    const [selectedUnitIds, setSelectedUnitIds] = useState(new Set());
    
    const [lessonsForUnit, setLessonsForUnit] = useState([]);
    const [selectedLessonId, setSelectedLessonId] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [existingLessonCount, setExistingLessonCount] = useState(0);
    const [extraInstruction, setExtraInstruction] = useState('');
    const debounceTimerRef = useRef(null);

    // --- Data Fetching Hooks (No changes) ---
    useEffect(() => {
        if (isOpen) {
            const subjectsQuery = query(collection(db, 'courses'), orderBy('title'));
            const unsub = onSnapshot(subjectsQuery, (snapshot) => {
                setAllSubjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedSubjectId) {
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', selectedSubjectId), orderBy('order'));
            const unsub = onSnapshot(unitsQuery, (snapshot) => {
                const fetchedUnits = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setUnitsForSubject(fetchedUnits);
            });
            return () => unsub();
        } else {
            setUnitsForSubject([]);
        }
    }, [selectedSubjectId]);
    
    useEffect(() => {
        if (selectedSubjectId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', selectedSubjectId), orderBy('order'));
            const unsub = onSnapshot(lessonsQuery, (snapshot) => {
                const fetchedLessons = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setLessonsForUnit(fetchedLessons);
            });
            return () => unsub();
        } else {
            setLessonsForUnit([]);
        }
    }, [selectedSubjectId]);

    useEffect(() => {
        if (isOpen && unitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [isOpen, unitId]);
    
    useEffect(() => {
        return () => clearTimeout(debounceTimerRef.current);
    }, []);

    // --- UI Handlers (No changes) ---
    const handleUnitSelectionChange = (unitId) => {
        setSelectedUnitIds(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(unitId)) newSet.delete(unitId);
            else newSet.add(unitId);
            return newSet;
        });
    };
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'scope') {
            setSelectedUnitIds(new Set());
            setSelectedLessonId('');
        }
    };

    // --- Main Generation Logic ---
    const handleGenerate = (regenerationNote = '') => {
        clearTimeout(debounceTimerRef.current);
        setIsGenerating(true);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                const isRegeneration = !!regenerationNote && !!previewData;
                if (!isRegeneration) setPreviewData(null);
                showToast(isRegeneration ? "Regenerating content..." : "Generating content...", "info");

                let finalPrompt;
                const { generationTarget, format, scope } = formData;

                const languageInstruction = `
                **Primary Language Directive (Zero-Tolerance Policy):**
                1.  Your most important task is to **automatically detect the primary language** from the provided 'Authoritative Inputs' and 'Source Content'.
                2.  You **MUST** generate the **entire response** (all headings, content, analysis, and instructional terms) in that **SAME language**. Do not mix languages. This is a non-negotiable, critical instruction.
                3.  **Filipino Translation Dictionary:** If the detected language is Filipino, you **MUST** use the following translations for all common instructional terms. Do not use the English term.
                    - "I can..." -> "Kaya kong..."
                    - "Activity" -> "Gawain"
                    - "Assessment" -> "Pagtataya"
                    - "Materials" -> "Mga Kagamitan"
                    - "Discussion" -> "Talakayan"
                    - "Goal" -> "Layunin"
                    - "Role" -> "Gampanin"
                    - "Audience" -> "Manonood"
                    - "Situation" -> "Sitwasyon"
                    - "Product" -> "Produkto" or "Awtput"
                    - "Standards" -> "Pamantayan"
                    - "Explore" -> "Tuklasin"
                    - "Firm-Up" -> "Linangin"
                    - "Deepen" -> "Palalimin"
                    - "Transfer" -> "Ilipat"`;

		const studentLessonInstructions = `
		    **CRITICAL JSON FORMATTING RULES (NON-NEGOTIABLE):**
		    1.  **Entire response MUST be a single JSON object.**
		    2.  **Escape all double quotes (") and backslashes (\\) inside string values.**
		    3.  **No Trailing Commas.**

		    **OTHER CRITICAL INSTRUCTIONS:**
		    4.  **Intelligent Diagram Generation (Data, Not SVG):** Your primary task is to analyze the lesson's content. If the topic involves a process, cycle, or hierarchy that needs a visual aid, you MUST provide the data for a diagram.
		        * **Page Type:** Set the page "type" to **"diagram-data"**.
		        * **Diagram Format:** The "content" for this page MUST be a string containing valid **Mermaid.js syntax**. Do NOT generate SVG code.
		        * **Example Mermaid Syntax for a Flowchart:**
		            "graph TD;
		                A[Start] --> B{Is it complex?};
		                B -->|Yes| C[Use Mermaid.js];
		                B -->|No| D[Simple Text];
		                C --> E[End];
		                D --> E[End];"
		        * **If no diagram is needed, the page "type" should be "text".**

		    ${languageInstruction}
		    6.  **Instructional Model Integrity:** Follow the conceptual flow of the **${format}** structure, but DO NOT write framework terms in the student-facing content.
		    7.  **Lesson Flow:** Structure the pages as: Objectives, Main Content (including diagram data if needed), Values Integration, and References.`;


                if (isRegeneration) {
                    const existingJsonString = JSON.stringify(previewData, null, 2);
                    finalPrompt = `You are a JSON editing expert. Your task is to modify the following JSON data based on this user instruction: "${regenerationNote}".
                    **EXISTING JSON TO MODIFY:**
                    ---
                    ${existingJsonString}
                    ---
                    When you provide the updated JSON, you MUST adhere to all of the following original rules that were used to create it.
                    ${studentLessonInstructions}
                    Return ONLY the complete, updated, and valid JSON object.`;

                } else if (generationTarget === 'studentLesson') {
                    if (!content || !learningCompetencies) {
                        throw new Error("Please complete all required fields for a student lesson.");
                    }
                    const currentSubject = allSubjects.find(s => s.id === subjectId);
                    const subjectName = currentSubject ? currentSubject.title : 'General Studies';

                    const escapedContent = content.replace(/"/g, '\\"');
                    const escapedContentStandard = contentStandard.replace(/"/g, '\\"');
                    const escapedLearningCompetencies = learningCompetencies.replace(/"/g, '\\"');
                    const escapedPerformanceStandard = performanceStandard.replace(/"/g, '\\"');
                    
                    const baseInfo = `**Topic:** "${escapedContent}"\n**Content Standard:** "${escapedContentStandard}"\n**Learning Competencies:** "${escapedLearningCompetencies}"\n**Performance Standard:** "${escapedPerformanceStandard}"`;

                    finalPrompt = `You are an expert instructional designer and vector artist creating student-friendly lessons for the subject: **${subjectName}**.
                    **Core Content Information:**
                    ---
                    ${baseInfo}
                    ---
                    **Lesson Details:**
                    - **Number of Lessons:** ${lessonCount}
                    - **Pages Per Lesson:** ${pagesPerLesson}
                    - **Format:** "${format}"
                    
                    ${studentLessonInstructions}

                    **Final Output Structure:**
                    {"generated_lessons": [{"lessonTitle": "Lesson Title", "learningObjectives": ["Objective 1", "Objective 2"], "pages": [{"title": "Page Title", "content": "Page content...", "type": "text|diagram"}, ... ]}, ... ]}`;

                } else { 
                    let sourceContent = '';
                    let sourceTitle = '';
                    let allLessonTitles = [];
                    
                    if (scope === 'byUnit') {
                        if (selectedUnitIds.size === 0) throw new Error("Please select at least one unit.");
                        const unitDetails = Array.from(selectedUnitIds).map(id => unitsForSubject.find(u => u.id === id)).filter(Boolean);
                        sourceTitle = unitDetails.map(u => u.title).join(' & ');
                        const allLessonContents = [];
                        for (const unit of unitDetails) {
                            const lessonsInUnit = lessonsForUnit.filter(l => l.unitId === unit.id);
                            lessonsInUnit.forEach(l => {
                                allLessonTitles.push(l.title);
                                allLessonContents.push(l.pages.map(p => p.content).join('\n'));
                            });
                        }
                        sourceContent = allLessonContents.join('\n\n---\n\n');
                    } else { // byLesson
                        if (!selectedLessonId) throw new Error("Please select a lesson.");
                        const lesson = lessonsForUnit.find(l => l.id === selectedLessonId);
                        if (!lesson) throw new Error("Selected lesson could not be found.");
                        sourceTitle = lesson.title;
                        allLessonTitles.push(lesson.title);
                        sourceContent = lesson.pages.map(p => p.content).join('\n\n');
                    }
                    
                    let analysisText = '';
                    if (generationTarget === 'teacherGuide') {
                        showToast("Step 1/2: Analyzing for ULP...", "info");
                        const ulpAnalysisPrompt = `**Persona:** You are a data processor and curriculum designer.
                        ${languageInstruction}
                        Your **non-negotiable task** is to create a detailed analysis for a Unit Learning Plan using the **exact** standards and competencies provided.
						**Authoritative Inputs (Non-Negotiable):**
						- Content Standard: ${contentStandard}
						- Performance Standard: ${performanceStandard}
						- Learning Competencies: ${learningCompetencies}
						- Source Content (This is provided ONLY for your background understanding of the lesson's themes): ${sourceContent}
						**CRITICAL ANALYSIS INSTRUCTIONS:**
						1.  **Essential Questions:** Formulate 2-5 thought-provoking Essential Questions that align directly with the provided Content and Performance Standards.
						2.	**Hooked Activities:** Design a brief, engaging activity to capture student interest.
						3.	**Map of Conceptual Change:** Design an activity for students to map their prior knowledge (e.g., K-W-L chart, etc.) and revisit it later.
                   	 	2.  **Learning Plan Breakdown:** Using ONLY the competencies listed in the 'Learning Competencies' input above, classify each one based on the following definitions and assign a unique code (A1, M1, T1, etc.).
                        * **Acquisition (Code A#):** Foundational knowledge (facts, concepts, skills). e.g., "Describe...", "Identify...".
                        * **Meaning-Making (Code M#):** Understanding the 'why' and 'how'. Students analyze, compare, justify. e.g., "Compare...", "Analyze...".
                        * **Transfer (Code T#):** Applying knowledge to a new, real-world situation. e.g., "Design a solution...".
                        For each competency, you MUST provide:
                        * **Learning Target:** At least two "I can..." statements.
                        * **Success Indicators:** 2-3 specific, observable indicators.
                        * **In-Person & Online Activities:** Design a scaffolded activity and its online alternative. Provide detailed, step-by-step instructions and a list of materials in bullet form.
                        * **C-E-R Requirement:** At least one "Deepen (M)" activity MUST be a C-E-R (Claim-Evidence-Reasoning) task.
                        * **Support Discussion:** For Firm-Up (A), questions to check understanding. For Meaning-Making (M) competencies, this MUST be a thorough and detailed discussion that elaborates on concepts, asks probing questions, and clarifies potential misconceptions to strengthen student learning.
                        * **Formative Assessment:** A specific assessment strategy.
                  	  	3.  **Final Synthesis:** A summary that connects all key points and prepares students for the Transfer task.
                  	  	4.  **Performance Task (T1):** For the final Transfer competency, design a detailed GRASPS Performance Task that directly assesses the provided Performance Standard.`;
                        
                        analysisText = await callGeminiWithLimitCheck(ulpAnalysisPrompt);
                        if (analysisText.toLowerCase().includes("i cannot")) throw new Error("AI failed during ULP analysis.");
                        
                        showToast("Step 2/2: Formatting ULP...", "info");

                        const lessonListHtml = allLessonTitles.length > 0
                            ? `<ul>${allLessonTitles.map(title => `<li>${title}</li>`).join('')}</ul>`
                            : '';
                        
                        // *** FIX: Added highly specific instructions for column content in the ULP table ***
                        finalPrompt = `Your primary task is to return a single, valid JSON object by formatting the provided ULP analysis into a comprehensive HTML table.
                        **CRITICAL JSON FORMATTING RULES:** Your entire response MUST be a single, valid JSON object. Escape all quotes inside string values.
                        **Source ULP Analysis:**
                        ---
                        ${analysisText}
                        ---
                        **CRITICAL HTML TABLE INSTRUCTIONS:**
                        1.  The "content" value must be a single string containing a complete \`<table>...</table>\`.
                        2.  **Explore Section:** After the 'EXPLORE' sub-header, create a row for the Unit Overview. Its content MUST begin with the following HTML list of lesson titles: ${lessonListHtml}, followed by the engaging overview of the unit. After the Lessons and Unit Overview should be the Essential Questions, followed by Hooked Activities, and lastly is the Map of Conceptual Change Activity for Students’ Prior/New  Knowledge.
                        3.  **Content Conversion:** Convert Markdown from the analysis (like **bold**) into clean HTML (<b>bold</b>, <ul>, etc.).
                        4.  **Row Generation for Competencies (NON-NEGOTIABLE):** For each competency (A1, M1, T1, etc.) found in the analysis, you MUST generate one complete table row (\`<tr>\`). This row will contain two cells (\`<td>\`):
                            * **First \`<td>\` (Learning Focus):** This cell **MUST** contain the following items, in this order:
                                * The competency code (e.g., A1) and the full Learning Competency text.
                                * The "Learning Target(s)" section.
                                * The "Success Indicator(s)" section.
                            * **Second \`<td>\` (Learning Process):** This cell **MUST** contain all the remaining parts for that competency:
                                * The "In-Person & Online Activities" section.
                                * The "Support Discussion" section.
                                * The "Formative Assessment" section.
                                * If it is a Transfer (T) competency, this cell also contains the full GRASPS task and its rubric.
                        **FINAL JSON OUTPUT STRUCTURE:**
                        {"generated_lessons": [{"lessonTitle": "Unit Learning Plan: ${sourceTitle}", "pages": [{"title": "PEAC Unit Learning Plan", "content": "<table...>...</table>"}]}]}`;

                    } else if (generationTarget === 'peacAtg') {
                        showToast("Step 1/2: Generating PEAC ATG content...", "info");
                        const atgAnalysisPrompt = `**Persona:** You are an expert Instructional Designer specializing in the Philippines' PEAC Adaptive Teaching Guide (ATG) framework.
                        ${languageInstruction}
                        Your task is to generate a complete and detailed ATG based on the provided source lesson. Adhere strictly to the 10-section structure below.
					    **Source Lesson Content:**
					    ---
					    ${sourceContent}
					    ---
						**GUIDE SECTIONS (Generate detailed and specific content for each of the following 10 sections):**

						**Part 1: PLANNING**

						**1. Prerequisite Content-Knowledge and Skills:**
						Based on the source lesson, identify the essential concepts, vocabulary, and skills students MUST have mastered in previous grade levels or lessons to access this new material.
						- Present this as a bulleted list.
						- For each item, provide a brief (1-sentence) justification explaining *why* it is a prerequisite for the current lesson.

						**2. Prerequisite Assessment:**
						Design a short, practical diagnostic tool to verify student mastery of the prerequisites listed in Section 1.
						- Create 5-10 targeted questions. You can use a mix of formats (e.g., Multiple Choice, Identification, a simple task).
						- If using Multiple Choice, provide four distinct options (A, B, C, D) for each item.
						- Provide a clear **Answer Key**, and for each question, include a brief explanation of what a correct answer demonstrates.

						**3. Pre-lesson Remediation Activities:**
						Create a targeted remediation plan for students who do not pass the Prerequisite Assessment. This plan must directly address the gaps identified in Section 2.
						- **For Online/Asynchronous Modality:** Provide a specific, high-quality online resource (e.g., a link to a specific Khan Academy video, a PhET simulation, or a practice quiz) that targets a key prerequisite skill. Describe the resource and what students should do with it.
						- **For In-person/Synchronous Modality:** Describe a concise, teacher-facilitated activity (e.g., a 10-minute mini-lesson using a whiteboard, a quick think-pair-share activity with guided questions, or a focused worksheet).

						**Part 2: INSTRUCTION AND ASSESSMENT**

						**4. Introduction:**
						Craft a compelling introduction to motivate students and set clear expectations.
						- **Hook (Mental Primer):** Start with an engaging hook: a provocative question, a surprising statistic, a short, relevant anecdote, or a brief, interesting video clip.
						- **Connecting to the Performance Task:** Briefly state how the upcoming lesson will equip students with the skills needed for the final performance task (mentioned in Section 10).
						- **Learning Targets:** Clearly articulate the lesson's goals as specific, student-centered "I can..." statements. These should be unpacked from the curriculum standards. (e.g., "I can identify the three main causes of the water cycle.").

						**5. Student's Experiential Learning (The Lesson Proper):**
						This is the core of the lesson. Based on the source content, break down the lesson into **2-3 logical "Content Chunks."** For **EACH CHUNK**, you must provide the following structured sequence:
						- **A. Teacher Input / Student Activity:** Detail the learning experience. What will the teacher present, or what will the students *do*? (e.g., "Students will watch a 3-minute video on...", "Teacher will conduct a brief demonstration of..."). Specify materials needed.
						- **B. Formative Question(s):** Immediately following the activity, pose 1-2 specific questions to check for understanding of **that specific chunk**.
						- **C. Expected Student Response:** Provide and include the ideal answer(s) to the formative questions. This helps the teacher know what to listen for.
						- **D. Discussion:** Provide in-depth elaboration and explanation of the key concepts of the lessons or topics to strengthen student experiential learning.

						**6. Synthesis:**
						Design a powerful concluding activity that requires students to consolidate the learning from all the "chunks" in Section 5.
						- **Synthesis Question/Prompt:** Write a single, higher-order thinking question that forces students to connect the concepts from all chunks.
						- **Reinforcement Activity:** Design a tangible activity where students answer the synthesis question. Examples: creating a concept map, completing a graphic organizer, or writing an "exit ticket" summary. Describe the activity and the expected output.

						**7. Assessment of Student's Learning (Post-Lesson Assessment):**
						Create a formative assessment to measure how well students met the Learning Targets from Section 4.
						- Design a 5-10 item quiz that is directly aligned with the learning targets and the content chunks.
						- Use a variety of question types (e.g., multiple choice, short answer, problem-solving).
						- Provide a detailed **Answer Key with explanations** for each item. Format this in a clear table.

						**8. Post-Lesson Remediation Activity:**
						Design a specific plan for students who scored poorly on the assessment in Section 7.
						- This activity must be targeted, addressing the most common errors or misconceptions revealed by the assessment data.
						- Describe a specific, focused activity (e.g., a targeted worksheet, re-watching a specific part of a video, a one-on-one conference) that directly reinforces the weak areas. Provide both an online and an in-person option.

						**9. Post-Lesson Enrichment Activity:**
						For students who have mastered the content, design a challenging and engaging activity that extends their learning. This should not be "more of the same work."
						- The activity must encourage higher-level thinking (e.g., application, analysis, evaluation, creation).
						- **Examples:** Propose a solution to a more complex problem, research a related topic of interest, or design a creative project.

						**Part 3: SUMMATIVE ASSESSMENT**

						**10. Final Unit Performance Task (GRASPS Format):**
						Design a meaningful, authentic summative performance task using the GRASPS model. This task should allow students to apply the knowledge and skills from this lesson in a real-world context.
						- **Goal:** What is the main objective of the task?
						- **Role:** What role does the student assume?
						- **Audience:** Who is the target audience for their work?
						- **Situation:** What is the real-world context or scenario?
						- **Product:** What will the student create?
						- **Standards:** How will the product be judged?
						- **Scoring Rubric:** Following the GRASPS, create a detailed scoring rubric for the performance task. The rubric must have at least **three criteria** for success and at least **three proficiency levels** (e.g., Beginning, Developing, Accomplished) with clear descriptors for each level.`;
                        
                        analysisText = await callGeminiWithLimitCheck(atgAnalysisPrompt);
                        if (analysisText.toLowerCase().includes("i cannot")) throw new Error("AI failed during ATG content generation.");
                        
                        showToast("Step 2/2: Formatting ATG...", "info");
                        finalPrompt = `Your primary task is to return a single, valid JSON object by formatting the provided ATG content into a comprehensive HTML table.
                        **CRITICAL JSON FORMATTING RULES:** Your entire response MUST be a single, valid JSON object. Escape all quotes inside string values.
                        **Pre-Generated ATG Content:**
                        ---
                        ${analysisText}
                        ---
                        **CRITICAL HTML TABLE INSTRUCTIONS:**
                        1.  Create a two-column HTML table ("ATG Component", "Details").
                        2.  Create one row (\`<tr>\`) for each of the 10 ATG sections.
                        3.  Convert bullet points to HTML lists (\`<ul>\`).
                        **FINAL JSON OUTPUT STRUCTURE:**
                        {"generated_lessons": [{"lessonTitle": "Adaptive Teaching Guide: ${sourceTitle}", "pages": [{"title": "PEAC Adaptive Teaching Guide", "content": "<table...>...</table>"}]}]}`;
                    }
                }
                
                if (!finalPrompt) {
                    throw new Error("Could not generate a valid prompt. Please check your inputs.");
                }

                const aiText = await callGeminiWithLimitCheck(finalPrompt);
                const jsonText = extractJson(aiText);
                const parsedResponse = tryParseJson(jsonText);

                let finalData;
                if (parsedResponse.generated_lessons) {
                    finalData = parsedResponse;
                } else if (parsedResponse.lessonTitle && parsedResponse.pages) {
                    finalData = { generated_lessons: [parsedResponse] };
                } else {
                    throw new Error("Received an unknown JSON structure from the AI.");
                }

                finalData.generated_lessons.forEach(lesson => {
                    if (lesson.pages && Array.isArray(lesson.pages)) {
                        lesson.pages.forEach(page => {
                            if (!page.type) {
                                page.type = 'text';
                            }
                        });
                    }
                });


                setPreviewData(finalData);

            } catch (err) {
                console.error("Error during generation:", err);
                let errorMessage = "An unknown error occurred.";
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else if (err && typeof err.message === 'string') {
                    errorMessage = err.message;
                } else if (typeof err === 'string') {
                    errorMessage = err;
                }
                showToast(errorMessage, "error");
                setPreviewData({ error: true, message: errorMessage });
            } finally {
                setIsGenerating(false);
            }
        }, 500);
    };

    // --- Save Handler ---
    const handleSave = async () => {
        if (!previewData || !Array.isArray(previewData.generated_lessons)) {
            showToast("Cannot save: Invalid lesson data.", "error");
            return;
        }
        const destinationSubjectId = selectedSubjectId || subjectId;
        if (!unitId || !destinationSubjectId) {
            showToast("Could not save: Destination unit or subject is missing.", "error");
            return;
        }
        const batch = writeBatch(db);
        previewData.generated_lessons.forEach((lesson, index) => {
            const newLessonRef = doc(collection(db, 'lessons'));
            batch.set(newLessonRef, {
                title: lesson.lessonTitle,
                pages: lesson.pages,
                objectives: lesson.learningObjectives || [],
                unitId: unitId,
                subjectId: destinationSubjectId,
                contentType: formData.generationTarget,
                createdAt: serverTimestamp(),
                order: existingLessonCount + index,
            });
        });
        try {
            await batch.commit();
            showToast(`${previewData.generated_lessons.length} item(s) saved successfully!`, "success");
            onClose();
        } catch (err) {
            console.error("Save error:", err);
            showToast("Failed to save lessons.", "error");
        }
    };

    const resetState = () => {
        setFormData({ generationTarget: 'studentLesson', format: '5Es', scope: 'byUnit' });
        setContent(''); setLessonCount(1); setPagesPerLesson(5);
        setContentStandard(''); setPerformanceStandard(''); setLearningCompetencies('');
        setSelectedSubjectId(''); setUnitsForSubject([]); setSelectedUnitIds(new Set());
        setLessonsForUnit([]); setSelectedLessonId('');
        setPreviewData(null); setExistingLessonCount(0);
        setExtraInstruction('');
    };

    const SelectorGroup = ({ title, value, onChange, options, disabled = false, placeholder }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{title}:</label>
            <select value={value} onChange={onChange} className="w-full p-2 border rounded-md" disabled={!options.length || disabled}>
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt.id} value={opt.id}>{opt.title}</option>)}
            </select>
        </div>
    );

    const isValidPreview = previewData && !previewData.error && Array.isArray(previewData.generated_lessons);

    return (
        <Dialog open={isOpen} onClose={() => { onClose(); resetState(); }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-30 z-[99]" />
            <Dialog.Panel className="relative bg-white p-6 rounded-lg shadow-lg z-[101] overflow-y-auto sm:max-w-3xl sm:mx-auto sm:max-h-[90vh] w-full">
                {isGenerating && <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50"><Spinner /></div>}
                <button type="button" className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-200" onClick={() => { onClose(); resetState(); }}>
                    <XMarkIcon className="h-6 w-6 text-gray-600" />
                </button>
                <Dialog.Title className="text-xl font-bold mb-4 pr-12">AI Lesson Planner</Dialog.Title>

                {!previewData ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Document to Generate:</label>
                            <select name="generationTarget" value={formData.generationTarget} onChange={handleChange} className="w-full p-2 border rounded-md">
                                <option value="studentLesson">Learning Guide for Students</option>
                                <option value="teacherGuide">PEAC Unit Learning Plan (ULP)</option>
                                <option value="peacAtg">Adaptive Teaching Guide (ATG)</option>
                            </select>
                        </div>
                        
                        {formData.generationTarget === 'studentLesson' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Lesson Format:</label>
                                    <select name="format" value={formData.format} onChange={handleChange} className="w-full p-2 border rounded-md">
                                        <option value="5Es">5Es</option>
                                        <option value="4As">4As</option>
                                        <option value="3Is">3Is</option>
                                        <option value="AMT Model">AMT</option>
                                        <option value="Gradual Release">Gradual Release</option>
                                        <option value="Lecture">Standard Lecture</option>
                                    </select>
                                </div>
                                <textarea placeholder="Main Content / Topic..." value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border rounded" rows={4} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Number of Lessons:</label>
                                        <input type="number" min="1" max="10" value={lessonCount} onChange={(e) => setLessonCount(Number(e.target.value))} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Pages per Lesson:</label>
                                        <input type="number" min="1" max="50" value={pagesPerLesson} onChange={(e) => setPagesPerLesson(Number(e.target.value))} className="w-full p-2 border rounded" />
                                    </div>
                                </div>
                                <textarea placeholder="Learning Competencies" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                                <textarea placeholder="Content Standard (Optional)" value={contentStandard} onChange={(e) => setContentStandard(e.target.value)} className="w-full p-2 border rounded" rows={2} />
                                <textarea placeholder="Performance Standard (Optional)" value={performanceStandard} onChange={(e) => setPerformanceStandard(e.target.value)} className="w-full p-2 border rounded" rows={2} />
                            </>
                        )}

                        {(formData.generationTarget === 'teacherGuide' || formData.generationTarget === 'peacAtg') && (
                            <>
                                <textarea placeholder="Content Standard" value={contentStandard} onChange={(e) => setContentStandard(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                                <textarea placeholder="Performance Standard" value={performanceStandard} onChange={(e) => setPerformanceStandard(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                                <textarea placeholder="Learning Competencies" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                                
                                <div className="p-4 border-l-4 border-indigo-500 bg-indigo-50 rounded-r-lg space-y-4">
                                    <p className="text-sm font-semibold">Select Source Content</p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Generate From:</label>
                                        <div className="flex gap-4 mt-1">
                                            <label className="flex items-center gap-2"><input type="radio" name="scope" value="byLesson" checked={formData.scope === 'byLesson'} onChange={handleChange} /> A Single Lesson</label>
                                            <label className="flex items-center gap-2"><input type="radio" name="scope" value="byUnit" checked={formData.scope === 'byUnit'} onChange={handleChange} /> One or More Units</label>
                                        </div>
                                    </div>
                                    
                                    <SelectorGroup title="Source Subject" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedLessonId(''); setSelectedUnitIds(new Set()); }} options={allSubjects} placeholder="Select a Source Subject" />
                                    
                                    {formData.scope === 'byUnit' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Select Units:</label>
                                            <div className="mt-2 border rounded-md max-h-32 overflow-y-auto p-2 space-y-1">
                                                {unitsForSubject.map(unit => (
                                                    <label key={unit.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer">
                                                        <input type="checkbox" checked={selectedUnitIds.has(unit.id)} onChange={() => handleUnitSelectionChange(unit.id)} />
                                                        {unit.title}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <SelectorGroup title="Source Lesson" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} options={lessonsForUnit} placeholder="Select a Source Lesson" disabled={!selectedSubjectId} />
                                    )}
                                </div>
                            </>
                        )}

                        <div className="flex justify-end pt-4">
                            <button onClick={() => handleGenerate()} disabled={isGenerating} className="btn-primary">
                                {isGenerating ? 'Generating...' : 'Generate Document'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {isValidPreview ? (
                            <>
                                <h2 className="text-lg font-semibold">Preview: Generated Content</h2>
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto border rounded-lg p-4">
                                    {previewData.generated_lessons.map((lesson, index) => (
                                        <div key={index}>
                                            <h3 className="font-bold text-lg sticky top-0 bg-white py-2">{lesson.lessonTitle}</h3>
                                            {Array.isArray(lesson.pages) && lesson.pages.map((page, pageIndex) => <LessonPage key={`${index}-${pageIndex}`} page={page} />)}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-4 text-center bg-red-50 text-red-700 border border-red-200 rounded-lg">
                                <h3 className="font-bold">Error Generating Content</h3>
                                <p className="text-sm">The AI response was not in the expected format. Please try adjusting your inputs or generating again.</p>
                                {previewData?.message && <p className="text-xs mt-2 italic">Details: {previewData.message}</p>}
                            </div>
                        )}
                        {isValidPreview && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium mb-1">Request Changes (Optional)</label>
                                <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="e.g., Make the introduction shorter, add another activity..." className="w-full border p-2 rounded-md" rows={2} />
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-4">
                            <button onClick={() => setPreviewData(null)} disabled={isGenerating} className="btn-secondary">Back to Edit</button>
                            <div className="flex gap-3">
                                {isValidPreview && <button onClick={() => handleGenerate(extraInstruction)} disabled={isGenerating} className="btn-secondary">{isGenerating ? 'Regenerating...' : 'Regenerate'}</button>}
                                {isValidPreview && <button onClick={handleSave} className="btn-primary">Accept & Save</button>}
                            </div>
                        </div>
                    </div>
                )}
            </Dialog.Panel>
        </Dialog>
    );
}