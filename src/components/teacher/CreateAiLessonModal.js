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
        const sanitizedString = jsonString.replace(/,\s*([}\]])/g, '$1');
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
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', selectedSubjectId));
            const unsub = onSnapshot(unitsQuery, (snapshot) => {
                const fetchedUnits = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                fetchedUnits.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
                setUnitsForSubject(fetchedUnits);
            });
            return () => unsub();
        } else {
            setUnitsForSubject([]);
        }
    }, [selectedSubjectId]);
    
    useEffect(() => {
        if (selectedSubjectId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', selectedSubjectId));
            const unsub = onSnapshot(lessonsQuery, (snapshot) => {
                const fetchedLessons = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                fetchedLessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

    // --- AI Prompt Generation (Fully Patched and Unabridged) ---
	// REPLACE your existing generateFinalPrompt function with this one.
	// --- AI Prompt Generation (Corrected) ---
	const generateFinalPrompt = (generationTarget, sourceTitle, structuredContent, format) => {
		// These rules are common and can be defined once.
		const strictJsonRules = `
		**CRITICAL JSON FORMATTING RULES:**
		1. Your entire response MUST be a single, valid JSON object.
		2. All property keys (e.g., "generated_lessons") MUST be in double quotes.
		3. All double quotes (") inside JSON string values MUST be escaped with a backslash (\\").
		4. Every object in a JSON array must be followed by a comma, except for the very last one.`;

		switch (generationTarget) {
			case 'teacherGuide':
				return `Your primary task is to return a single, valid JSON object. You will take the provided ULP analysis and format it into a single, comprehensive HTML table.
				${strictJsonRules}
				**Source ULP Analysis:**
				---
				${structuredContent}
				---
				**CRITICAL HTML TABLE INSTRUCTIONS:**
				1.  **Generate a Complete HTML Table:** The "content" value must be a single string containing a complete and valid HTML table, starting with \`<table ...>\` and ending with \`</table>\`.
				2.  **Colorful Headers:** Use a \`<thead>\` and a styled \`<tr>\` for the main headers and styled subheading rows for Explore, Firm-Up, Deepen, and Transfer.
				3.  **Explore Section Content:** For the 'Explore' section, create a separate row (\`<tr>\`) for each of the following: Topic, Content Standard, Performance Standard, and Essential Questions. For each row, the content MUST be placed in a single cell that spans both columns (\`<td colspan='2'>...\</td>\`). For the 'Topic' row, begin the content with an unordered list (\`<ul>\`) of the lesson titles, followed by the unit overview.
				4.  **TRANSFER Section Rule:** For the Transfer row (e.g., T1), the structure MUST be as follows:
					a. **First Column (Learning Focus):** Contains the 'T' competency code, the full Learning Competency, the Learning Target(s), and the Success Indicator(s).
					b. **Second Column (Learning Process):** Contains ONLY the detailed GRASPS Performance Task and its standards/rubric.
				5.  **Final Synthesis Row:** After the last 'DEEPEN' content row, insert the 'Final Synthesis' content from the analysis. This row should also span both columns (\`<td colspan='2'>...\</td>\`).
				6.  **Firm-Up & Deepen Rows:** For EACH Firm-Up (A) and Deepen (M) competency code in the analysis, generate one complete table row. The first column contains the Learning Focus (Competency, Target, Indicators). The second column contains the Learning Process (Activities, Discussion, Assessment).
				7.  **HTML Rules:** All tag attributes MUST use single quotes (e.g., \`style='...'\`).
				8.  **Styling:** Add \`style='page-break-inside: avoid;'\` to every content \`<tr>\`. Add \`style='width: 100%; border-collapse: collapse;'\` to the main \`<table>\` tag.
				**FINAL JSON OUTPUT STRUCTURE:**
				{"generated_lessons": [{"lessonTitle": "Unit Learning Plan: ${sourceTitle}", "pages": [{"title": "PEAC Unit Learning Plan", "content": "<table...>...</table>"}]}]}`;

			case 'peacAtg':
				return `Your primary task is to return a single, valid JSON object. You will take the provided ATG content and format it into a single, comprehensive HTML table.
				${strictJsonRules}
				**Pre-Generated ATG Content:**
				---
				${structuredContent}
				---
				**CRITICAL HTML TABLE INSTRUCTIONS:**
				1.  **JSON Structure:** Your response MUST be a single JSON object. The "content" key must contain a single string with the complete HTML table.
				2.  **Table Headers:** Start the table with a \`<thead>\` and a styled \`<tr>\` for the headers: "ATG Component" and "Details".
				3.  **Row Generation:** Create a table row (\`<tr>\`) for each of the 10 ATG sections found in the provided content.
				4.  **Two-Column Layout:** The first column contains the bolded section title (e.g., \`<b>1. Prerequisite...</b>\`). The second column contains that section's content.
				5.  **Content Formatting:** Use HTML unordered lists (\`<ul>\`) for any bullet points in the source text.
				6.  **HTML Rules & Styling:** Use single quotes for attributes. Add \`style='page-break-inside: avoid;'\` to every content \`<tr>\`.
				**FINAL JSON OUTPUT STRUCTURE:**
				{"generated_lessons": [{"lessonTitle": "Adaptive Teaching Guide: ${sourceTitle}", "pages": [{"title": "PEAC Adaptive Teaching Guide", "content": "<table...>...</table>"}]}]}`;
		
			// The 'studentLesson' case has been removed because this logic is correctly handled
			// in the 'handleGenerate' function, which is where 'subjectName' is defined.

			default:
				console.error(`Unknown generationTarget: ${generationTarget}`);
				return ''; // Return an empty string to prevent an error
		}
	};

    // --- Main Generation Logic (Fully Patched and Unabridged) ---
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

				if (isRegeneration) {
					const existingJsonString = JSON.stringify(previewData, null, 2);
					finalPrompt = `You are a highly precise JSON editing bot. Your task is to modify the provided JSON data based on this instruction: "${regenerationNote}". Return ONLY the complete, updated JSON object.`;
			
				} else if (generationTarget === 'studentLesson') {
					if (!content || !learningCompetencies) {
						throw new Error("Please complete all required fields for a student lesson.");
					}

					const currentSubject = allSubjects.find(subject => subject.id === subjectId);
					const subjectName = currentSubject ? currentSubject.title : 'General Studies';
					const baseInfo = `**Topic:** "${content}"\n**Content Standard:** "${contentStandard}"\n**Learning Competencies:** "${learningCompetencies}"\n**Performance Standard:** "${performanceStandard}"`;
				
					let formatSpecificInstructions = '';
					switch (formData.format) {
						case 'AMT Model':
							formatSpecificInstructions = `
							**Lesson Structure (AMT Model):** You MUST structure the lesson pages in this order:
							1.  **Acquisition Pages:** Deliver the core knowledge, facts, and concepts clearly. Use simple language and examples.
							2.  **Meaning-making Pages:** Create interactive activities. Ask critical thinking questions, provide a case study for analysis, or create a compare/contrast task.
							3.  **Transfer Page:** Design one final, practical task where the student must apply their knowledge to a new, real-world scenario.`;
							break;
						case '5E Model':
							formatSpecificInstructions = `
							**Lesson Structure (5E Model):** You MUST structure the lesson pages to follow the 5Es:
							1.  **Engage:** Start with a hook—a fascinating question, a surprising fact, or a short story to capture interest.
							2.  **Explore:** Design an activity for students to investigate the topic themselves.
							3.  **Explain:** Clearly present the main concepts, definitions, and explanations.
							4.  **Elaborate:** Create a task that lets students apply their learning to a new situation.
							5.  **Evaluate:** Conclude with a quiz or performance task to assess learning.`;
							break;
						case '4As Model':
							formatSpecificInstructions = `
							**Lesson Structure (4As Model):** You MUST structure the lesson pages to follow the 4As:
							1.  **Activity:** Begin with a concrete, hands-on activity.
							2.  **Analysis:** Guide the student with questions about the activity they just completed.
							3.  **Abstraction:** Formally present the core concepts, connecting them to the activity.
							4.  **Application:** Provide a final task where the student uses their new knowledge to solve a problem.`;
							break;
						case 'Gradual Release':
							formatSpecificInstructions = `
							**Lesson Structure (Gradual Release):** You MUST structure the lesson to show a shift in responsibility:
							1.  **I Do (Focused Instruction):** Begin by demonstrating and explaining the skill or concept clearly.
							2.  **We Do (Guided Practice):** Create an activity where students practice with significant support and scaffolding.
							3.  **You Do (Independent Practice):** Conclude with a task that students must complete on their own.`;
							break;
						default: // Standard Lecture
							formatSpecificInstructions = `
							**Lesson Structure (Standard Format):**
							1.  **Introduction:** Briefly introduce the topic and its importance.
							2.  **Content Presentation:** Break the main topic into smaller, logical sub-topics.
							3.  **Summary:** Conclude by summarizing the key takeaways of the lesson.`;
							break;
					}

					// --- UPDATED PROMPT WITH NEW RULES ---
					finalPrompt = `You are an expert instructional designer creating a student-friendly lesson for the subject: **${subjectName}**.
	${baseInfo}
	**Number of Lessons:** ${lessonCount}
	**Pages Per Lesson:** ${pagesPerLesson}
	**Format:** "${formData.format}"
	---
	### **CRITICAL INSTRUCTIONS**
	---

	1.  **Language Purity (!!!):** All generated content, including page titles and body text, MUST be in **pure Filipino**. Do not mix English words or phrases into the content, unless it is a proper noun or technical term that has no direct translation.

	2.  **Do Not Expose The Framework (!!!):** The terms for the instructional model (like "Acquisition", "Meaning-making", "Engage", "Explore", "Activity", "Analysis", etc.) are for YOUR guidance only. **DO NOT** write these words in the student-facing content. Do not use headings like "Scenario 1" or "Part 1". The lesson flow should feel natural, not like a technical checklist.

	3.  **Main Goal:** Your primary task is to generate a lesson that strictly follows the **conceptual flow** of the **${formData.format}** structure.

	4.  **Format-Specific Structure:**
		${formatSpecificInstructions}

	5.  **Lesson Flow & Required Pages:** You must structure the lesson's pages in this exact sequence:
		a.  The VERY FIRST page MUST have the title "Mga Layunin" and contain 3-5 clear, measurable goals in Filipino.
		b.  Next are the main content pages, following the chosen format's structure.
		c.  The second to last page MUST have the exact title "Values Integration".
		d.  The FINAL page MUST have the exact title "References". References should be valid and actual.

	6.  **Tone & Content Quality:**
		-   **Tone:** Write in a simple, engaging, conversational, and student-friendly manner, using Filipino.
		-   **Content:** Every page's "content" field MUST be detailed and substantive.

	7.  **Titles:**
		-   **Lesson Titles:** Each "lessonTitle" must be catchy and start with "Aralin #:", numbering from ${existingLessonCount + 1}.
		-   **Page Titles:** Apart from the required pages, page titles should be engaging and describe the topic of that page in Filipino (e.g., "Ang Siklo ng Tubig"), not generic labels.

	8.  **JSON Output:** Your entire response MUST be a single valid JSON object.
		{"generated_lessons": [{"lessonTitle": "...", "pages": [{"title": "...", "content": "..."}] }] }`;

				} else {
					let sourceContent = '';
					let sourceTitle = '';
				
					if (scope === 'byUnit') {
						if (selectedUnitIds.size === 0) throw new Error("Please select at least one unit.");
						const unitDetails = Array.from(selectedUnitIds).map(id => unitsForSubject.find(u => u.id === id)).filter(Boolean);
						unitDetails.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
						sourceTitle = unitDetails.map(u => u.title).join(' & ');
						const allLessonTitles = [];
						const allLessonContents = [];
						for (const unit of unitDetails) {
							const lessonsInUnit = lessonsForUnit.filter(l => l.unitId === unit.id);
							lessonsInUnit.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
							lessonsInUnit.forEach(l => {
								allLessonTitles.push(l.title);
								allLessonContents.push(l.pages.map(p => p.content).join('\n'));
							});
						}
						const lessonList = allLessonTitles.map(title => `- ${title}`).join('\n');
						sourceContent = `Lessons included in this unit:\n${lessonList}\n\n---\n\n${allLessonContents.join('\n\n---\n\n')}`;
					} else { 
						if (!selectedLessonId) throw new Error("Please select a lesson.");
						const lesson = lessonsForUnit.find(l => l.id === selectedLessonId);
						if (!lesson) throw new Error("Selected lesson could not be found.");
						sourceTitle = lesson.title;
						sourceContent = `Lessons included in this unit:\n- ${lesson.title}\n\n---\n\n${lesson.pages.map(p => p.content).join('\n\n')}`;
					}

					let analysisText = '';
					if (generationTarget === 'teacherGuide') {
						showToast("Step 1/2: Analyzing for ULP...", "info");
						const ulpAnalysisPrompt = `You are a curriculum designer. Your **non-negotiable task** is to create a detailed analysis for a Unit Learning Plan. You **MUST** build the entire plan using the **exact** Content Standard, Performance Standard, and Learning Competencies provided below. They are the absolute source of truth.

						**CRITICAL RULE OF PRIMACY:** The 'Content Standard', 'Performance Standard', and 'Learning Competencies' provided in the 'Authoritative Inputs' section below are **non-negotiable**. If the 'Source Content' contains different or conflicting information, you **MUST IGNORE IT** and adhere **strictly** to the provided standards and competencies. Do not invent your own.

						**Authoritative Inputs (Non-Negotiable):**
						- Content Standard: ${contentStandard}
						- Performance Standard: ${performanceStandard}
						- Learning Competencies: ${learningCompetencies}
						- Source Content (For context and lesson ideas only): ${sourceContent}

						**CRITICAL ANALYSIS INSTRUCTIONS:**
						1.  **Essential Questions:** Formulate 2-5 thought-provoking Essential Questions that align directly with the provided Content and Performance Standards.
						2.  **Learning Plan Breakdown:** Using ONLY the competencies listed in the 'Learning Competencies' input above, classify each one based on the following definitions and assign a unique code (A1, M1, T1, etc.).
							* **Acquisition (Code A#):** Foundational knowledge (facts, concepts, skills). e.g., "Describe...", "Identify...".
							* **Meaning-Making (Code M#):** Understanding the 'why' and 'how'. Students analyze, compare, justify. e.g., "Compare...", "Analyze...".
							* **Transfer (Code T#):** Applying knowledge to a new, real-world situation. e.g., "Design a solution...".
							For each competency, you MUST provide:
							* **Learning Target:** At least two "I can..." statements.
							* **Success Indicators:** 2-3 specific, observable indicators.
							* **In-Person & Online Activities:** Design a scaffolded activity and its online alternative. Provide detailed, step-by-step instructions and a list of materials in bullet form.
							* **C-E-R Requirement:** At least one "Deepen (M)" activity MUST be a C-E-R (Claim-Evidence-Reasoning) task.
							* **Support Discussion:** For Firm-Up (A), questions to check understanding. For Deepen (M), in-depth elaboration.
							* **Formative Assessment:** A specific assessment strategy.
						3.  **Final Synthesis:** A summary that connects all key points and prepares students for the Transfer task.
						4.  **Performance Task (T1):** For the final Transfer competency, design a detailed GRASPS Performance Task that directly assesses the provided Performance Standard.`;
						analysisText = await callGeminiWithLimitCheck(ulpAnalysisPrompt);
						if (analysisText.toLowerCase().includes("i cannot")) throw new Error("AI failed during ULP analysis.");
						showToast("Step 2/2: Formatting ULP...", "info");

					} else if (generationTarget === 'peacAtg') {
						showToast("Step 1/2: Generating authentic PEAC ATG content...", "info");
						const atgAnalysisPrompt = `
					You are an expert Instructional Designer specializing in the Philippines' Private Education Assistance Committee (PEAC) Adaptive Teaching Guide (ATG) framework. Your task is to generate a complete and detailed ATG based on the provided source lesson or topic. The ATG must be student-centered, assessment-driven, and adaptable for different learning modalities (in-person, online, and hybrid). Adhere strictly to the 10-section structure and detailed instructions below, using precise PEAC terminology. Your output MUST be plain text, structured with clear headings for each of the 10 sections.

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
					}

					finalPrompt = generateFinalPrompt(generationTarget, sourceTitle, analysisText, format);
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

				setPreviewData(finalData);

			} catch (err) {
				console.error("Error during generation:", err);
				const errorMessage = err.message;
				showToast(errorMessage, "error");
				setPreviewData({ error: true, message: errorMessage });
			} finally {
				setIsGenerating(false);
			}
		}, 500);
	};

    // --- Save Handler (Patched) ---
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
                                <option value="studentLesson">Lesson for Students</option>
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
                                        <SelectorGroup title="Source Lesson" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} options={lessonsForUnit.filter(l => unitsForSubject.some(u => u.id === l.unitId))} placeholder="Select a Source Lesson" disabled={!selectedSubjectId} />
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
                                            {Array.isArray(lesson.pages) && lesson.pages.map((page, pageIndex) => <LessonPage key={pageIndex} page={page} />)}
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