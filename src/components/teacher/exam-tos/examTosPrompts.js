// --- AI PROMPT BUILDERS ---

export const getTosPlannerPrompt = (guideData) => {
    const {
        learningCompetencies,
        language,
        totalHours,
        totalConfiguredItems,
        formattedTestStructure,
        selectedCourse,
        selectedLessons,
        gradeLevel
    } = guideData;

    const examTitle = `Periodical Exam for ${selectedCourse?.title || 'Subject'}`;
    const subject = selectedCourse?.title || 'Not Specified';
    // Use the explicit gradeLevel from the picker
    const gradeLevelText = gradeLevel || selectedCourse?.gradeLevel || 'Not Specified';
    const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');

    return `
    # Role: Expert Educational Assessment Planner (DepEd K-12 Standards)
    You are a Master Teacher and Subject Matter Expert in the Philippines. I have uploaded lesson materials. Your task is to generate a comprehensive **Table of Specifications (TOS)** in JSON format based *strictly* on these materials. Do NOT generate exam questions.

    **STRICT INPUT PARAMETERS:**
    * **Subject:** ${subject}
    * **Grade Level:** ${gradeLevelText}
    * **Language:** ${language}
    * **Total Items:** ${totalConfiguredItems}
    * **Total Hours:** ${totalHours || 'Not specified'}
    * **Test Structure:** ${formattedTestStructure}
    * **Lesson Titles:** "${combinedLessonTitles}"
    * **Learning Competencies:** \`\`\`${learningCompetencies}\`\`\`

    **PRIMARY DIRECTIVE: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT.**
    ---
    **OUTPUT JSON STRUCTURE (Strict):**
    {
        "examTitle": "${examTitle}",
        "tos": {
            "header": { "examTitle": "${examTitle}", "subject": "${subject}", "gradeLevel": "${gradeLevelText}" },
            "competencyBreakdown": [
                { "competency": "...", "noOfHours": 0, "weightPercentage": "...", "noOfItems": 0, "easyItems": { "count": 0, "itemNumbers": "..." }, "averageItems": { "count": 0, "itemNumbers": "..." }, "difficultItems": { "count": 0, "itemNumbers": "..." } }
            ],
            "totalRow": { "hours": "...", "weightPercentage": "...", "noOfItems": 0 }
        }
    }
    ---
    
    ### PART 1: TABLE OF SPECIFICATIONS (TOS) RULES
    **Logic & Math Constraints:**
    1.  **Distribution:** Distribute the ${totalConfiguredItems} Total Items strictly:
        * **Easy (Knowledge):** 60%
        * **Average (Comprehension/Understanding):** 30%
        * **Difficult (Application/Thinking):** 10%
    2.  **Calculations:** Calculate the "noOfItems" per competency based on the "weightPercentage" (derived from hours spent). Use the **Largest Remainder Method** to ensure the total equals ${totalConfiguredItems} exactly.
    3.  **Placement:** Ensure every question number from 1 to ${totalConfiguredItems} is accounted for exactly once. 'itemNumbers' strings MUST include the specific numbers (e.g. "1-5", "6-8"). Place an essay's entire item number range in the 'difficultItems' column.
    `;
};

export const getExamComponentPrompt = (guideData, generatedTos, testType, previousQuestionsSummary) => {
    const { language, combinedContent, gradeLevel } = guideData;
    const { type, numItems, range } = testType;

    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    const isSingleQuestionType = normalizedType.includes('essay') || normalizedType.includes('solving');
    const tosContext = JSON.stringify(generatedTos, null, 2);

    // CRITICAL: Define the required structure based on the TYPE
    let requiredJsonStructure = `
    "question": "...", 
    "correctAnswer": "...",
    "explanation": "Direct statement of fact. (e.g. 'Photosynthesis occurs in chloroplasts.')"
    `;

    if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
        requiredJsonStructure += `,
    "options": ["Option A", "Option B", "Option C", "Option D"]`;
    } else if (normalizedType === 'solving') {
        requiredJsonStructure += `,
    "solution": "Step-by-step calculation."`;
    } else if (normalizedType === 'essay') {
        requiredJsonStructure += `,
    "rubric": [{"criteria": "...", "points": 0}]`;
    }


    return `
    # Role: Expert Educational Assessment Planner (DepEd K-12 Standards)
    You are a Master Teacher and Subject Matter Expert in the Philippines. I have uploaded lesson materials. Your task is to generate a comprehensive **Periodical Exam** and a **Detailed Answer Key with Explanations** based *strictly* on these materials.

    **PRIMARY DIRECTIVE: RESPONSE MUST BE A SINGLE VALID JSON OBJECT.**
    ---
    **OUTPUT JSON STRUCTURE (Strict):**
    {
        "questions": [
            { 
                "questionNumber": 1, 
                "type": "${normalizedType}", 
                "instruction": "...", 
                ${requiredJsonStructure}
            }
        ]
    }
    ---
    **INPUT DATA:**
    - **Grade Level:** ${gradeLevel}
    - **Language:** ${language}
    - **Source Material:** \`\`\`${combinedContent}\`\`\`
    
    **TASK:**
    - Type: **${type}**
    - Count: **${numItems}** items.
    - Range: **${range}**

    ### PART 2: THE EXAM QUESTIONS (The "San Ramon" Standard)
    **General Constraints (STRICT & NON-NEGOTIABLE):**
    1.  **Language Consistency (STRICT):**
        * Adhere strictly to the **${language}** language.
        * **NO Taglish:** Do not mix English and Filipino unless a specific term has no translation.
        * **If Filipino:** Use formal academic Filipino (e.g., use "Tama/Mali" instead of "True/False", "Piliin" instead of "Choose").
        * **If English:** Use standard academic English.
    2.  **Tone & Phrasing (CRITICAL):**
        * **NO META-REFERENCES:** You are strictly **FORBIDDEN** from using phrases like "According to the lesson," "In the text," "As mentioned in the module," or "The author states."
        * **BAD EXAMPLE:** *According to the lesson 'The Divine Overture,' what is described as the primordial impulse?*
        * **GOOD EXAMPLE:** *What is described as the primordial impulse of God?*
        * **RULE:** State facts as absolute, objective truths. Write as if you are the authority on the subject.
    3.  **Philippine Context (Non-Negotiable):**
        * **Currency:** Always use **PHP** or **Pesos** for money problems.
        * **Names:** Use Filipino names (e.g., Juan, Maria, Cruz, Reyes).
        * **Settings:** Use local scenarios (e.g., sari-sari store, barangay hall, jeepney commute, local elections) where applicable.

    **Specific Rules per Test Type:**
    
    **I. Multiple Choice & Analogy & Interpretive**
    * **Format:** Provide exactly four options in the "options" array.
    * **Choice Mechanics & Length (CRITICAL):**
        * **Uniformity:** All four options must have an equal or near-equal word count. Ensure the grammatical structure and level of detail are consistent across all choices to prevent obvious outliers.
        * **Anti-Bias Rule:** The correct answer MUST NOT consistently be the longest or shortest option. It must blend in seamlessly.
    * **Choice Arrangement:**
        * **Short Choices (1-2 words):** Arrange single words or short phrases in strict **alphabetical order**.
        * **Longer Choices (3 or more words):** Arrange the options in a **"pyramid style"** (ordered shortest-to-longest or longest-to-shortest).
    * **Strict Randomization Guardrail:** The correct answers must be randomly and evenly scattered across the options indices. If pyramid arrangement forces predictable patterns, break the rule to keep correct answers randomized.

    **II. True/False (Alternative Response)**
    * **Format:** Single, declarative sentences. **NO questions.** Balance True/False 50/50 for this batch.

    **III. Identification**
    * **Format:** Group all items. Generate a single \`choicesBox\` array/string with answers + 2-3 distractors.

    **IV. Matching Type**
    * **Logic:** Column B must have more options than Column A to prevent elimination guessing. Return a single object with \`prompts\`, \`options\`, and \`correctPairs\`.

    **V. Essay**
    * **Format:** Provide a \`rubric\` array with criteria and points.

    ### PART 4: EXPLANATIONS & RATIONALE
    **Instructions:**
    For every single question generated, provide a brief explanation.
    * **Direct Explanation Only:** Do **NOT** refer to the source material. Do not say "The PDF says..." or "The lesson stated...".
    * **Method:** Provide the explanation as a standalone fact or a direct discussion of the concept.
    * **Bad Example:** "False. The lesson states that global warming is caused by greenhouse gases."
    * **Good Example:** "False. Global warming is primarily caused by the accumulation of greenhouse gases in the atmosphere, not by the depletion of the ozone layer."

    **NON-NEGOTIABLE REPETITION RULE:**
    - DO NOT REPEAT THE CONCEPT OR PHRASING of any question listed here:
    \`\`\`
    ${previousQuestionsSummary || "None"}
    \`\`\`
    `;
};
