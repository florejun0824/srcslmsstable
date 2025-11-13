import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, ClipboardDocumentListIcon, DocumentTextIcon, PuzzlePieceIcon, DocumentDuplicateIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { doc, collection, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import CourseSelector from './CourseSelector';
import LessonSelector from './LessonSelector';

// --- Neumorphic Style Helpers (Unchanged) ---
const inputBaseStyles = "block w-full text-sm bg-slate-200 dark:bg-neumorphic-base-dark rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:shadow-neumorphic-inset-dark focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-none dark:text-slate-100";
const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-neumorphic-base-dark";
const btnExtruded = `shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]
                   dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark`;
const btnDisabled = "disabled:opacity-60 disabled:text-slate-500 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:text-slate-600 dark:disabled:shadow-neumorphic-inset-dark";
// --------------------------------------------------

// A reusable input field component (Unchanged)
const FormInput = ({ label, id, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
        <input id={id} {...props} className={`${inputBaseStyles} px-4 py-2.5`} />
    </div>
);

// --- START: ORIGINAL HELPER FUNCTIONS (Unchanged and Restored) ---

// Helper function to calculate the number of items from a comma-separated range string
const calculateItemsForRange = (rangeString) => {
    if (!rangeString) return 0;
    const ranges = rangeString.split(',').map(r => r.trim());
    let totalItems = 0;
    for (const range of ranges) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
            totalItems += (end - start + 1);
        } else if (!isNaN(start)) {
            totalItems += 1;
        }
    }
    return totalItems;
};

// Helper function to extract a JSON object from a string
const extractJson = (text) => {
    let match = text.match(/```json\s*([\sS]*?)\s*```/);
    if (!match) match = text.match(/```([\sS]*?)```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    throw new Error("AI response did not contain a valid JSON object.");
};

// Helper function to parse JSON with some sanitization
const tryParseJson = (jsonString) => {
    try {
        const sanitizedString = jsonString.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        return JSON.parse(sanitizedString);
    } catch (e) {
        console.warn("Standard JSON.parse failed. Attempting to fix trailing commas.", e);
        const sanitizedWithCommas = jsonString.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(sanitizedWithCommas);
        } catch (finalError) {
            console.error("Sanitization failed. The error is likely in the generated JSON structure.", finalError);
            throw e;
        }
    }
};

// Helper function to round percentages and ensure they sum to 100
const roundPercentagesToSum100 = (breakdown) => {
    if (!breakdown || breakdown.length === 0) {
        return [];
    }
    const percentages = breakdown.map((item, index) => {
        const value = parseFloat(item.weightPercentage);
        return {
            originalIndex: index,
            value: value,
            floorValue: Math.floor(value),
            remainder: value - Math.floor(value),
        };
    });
    const sumOfFloors = percentages.reduce((sum, p) => sum + p.floorValue, 0);
    let remainderToDistribute = 100 - sumOfFloors;
    percentages.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remainderToDistribute; i++) {
        if (percentages[i]) {
           percentages[i].floorValue += 1;
        }
    }
    percentages.sort((a, b) => a.originalIndex - b.originalIndex);
    const updatedBreakdown = breakdown.map((item, index) => ({
        ...item,
        weightPercentage: `${percentages[index].floorValue}%`,
    }));
    return updatedBreakdown;
};

const translations = {
    'English': {
        'multiple_choice': 'Instructions: Choose the letter of the best answer.',
        'alternative_response': 'Instructions: Read and understand each statement. Write "True" if the statement is correct and "False" if it is incorrect.',
        'matching-type': 'Instructions: Match the items in Column A with the corresponding items in Column B.',
        'identification': 'Instructions: Identify the correct term for each statement from the choices in the box. Write your answer on the space provided.',
        'essay': 'Instructions: Answer the following question in a comprehensive essay.',
        'solving': 'Instructions: Solve the following problems. Show your complete solution.',
        'analogy': 'Instructions: Complete the following analogies by choosing the best answer.',
        'interpretive': 'Instructions: Read the passage below and answer the questions that follow.',
        'columnA': 'Column A',
        'columnB': 'Column B',
        'rubric': 'Scoring Rubric',
        'test_types': {
            'multiple_choice': 'Multiple Choice',
            'alternative_response': 'Alternative Response',
            'matching-type': 'Matching Type',
            'identification': 'Identification',
            'essay': 'Essay',
            'solving': 'Solving',
            'analogy': 'Analogy',
            'interpretive': 'Interpretive',
        }
    },
    'Filipino': {
        'multiple_choice': 'Panuto: Piliin ang titik ng pinakamahusay na sagot.',
        'alternative_response': 'Panuto: Basahin at unawain ang bawat pahayag. Isulat ang "Tama" kung ito ay totoo at "Mali" kung hindi.',
        'matching-type': 'Panuto: Itugma ang mga aytem sa Hanay A sa katumbas na mga aytem sa Hanay B.',
        'identification': 'Panuto: Tukuyin ang tamang termino para sa bawat pahayag mula sa mga pagpipilian sa kahon. Isulat ang iyong sagot sa nakalaang espasyo.',
        'essay': 'Panuto: Sagutin ang sumusunod na tanong sa isang komprehensibong sanaysay.',
        'solving': 'Panuto: Lutasin ang mga sumusunod na suliranin. Ipakita ang iyong kumpletong solusyon.',
        'analogy': 'Panuto: Kumpletuhin ang mga sumusunod na analohiya sa pamamagitan ng pagpili ng pinakamahusay na sagot.',
        'interpretive': 'Panuto: Basahin ang talata sa ibaba at sagutin ang mga sumusunod na tanong.',
        'columnA': 'Hanay A',
        'columnB': 'Hanay B',
        'rubric': 'Rubrik sa Pagmamarka',
        'test_types': {
            'multiple_choice': 'Maraming Pagpipilian',
            'alternative_response': 'Alternatibong Pagtugon',
            'matching-type': 'Pagtutugma',
            'identification': 'Pagtukoy',
            'essay': 'Sanaysay',
            'solving': 'Paglutas ng Suliranin',
            'analogy': 'Analohiya',
            'interpretive': 'Interpretibong Pagbasa',
        }
    }
};

const generateTosMarkdown = (tos) => {
    // --- START: MODIFICATION (Added check for competencyBreakdown) ---
    if (!tos || !Array.isArray(tos.competencyBreakdown)) return 'No Table of Specifications generated.';
    // --- END: MODIFICATION ---
    
    const header = tos.header;
    let markdown = `# ${header.examTitle}\n\n`;
    markdown += `**Subject:** ${header.subject}\n`;
    markdown += `**Grade Level:** ${header.gradeLevel}\n\n`;
    markdown += `### TABLE OF SPECIFICATIONS (TOS)\n\n`;
    const tableHeader = `| Objectives/Learning Competencies | No. of hours spent | Weight % | No. of Items | Easy (Knowledge) 60% | Average (Comprehension) 30% | Difficult (Application) 10% |\n`;
    const tableDivider = `|---|---|---|---|---|---|---|\n`;
    let tableBody = tos.competencyBreakdown.map(row =>
        `| ${row.competency} | ${row.noOfHours} | ${row.weightPercentage} | ${row.noOfItems} | ${row.easyItems.itemNumbers} | ${row.averageItems.itemNumbers} | ${row.difficultItems.itemNumbers} |`
    ).join('\n');
    const totalRow = `| **TOTAL** | **${tos.totalRow.hours}** | **${tos.totalRow.weightPercentage}** | **${tos.totalRow.noOfItems}** | | | |`;
    return markdown + tableHeader + tableDivider + tableBody + '\n' + totalRow;
};

const generateExamQuestionsMarkdown = (questions, language) => {
    if (!questions || questions.length === 0) return 'No exam questions generated.';
    const t = translations[language] || translations['English'];
    const groupedQuestions = questions.reduce((acc, q) => {
        const type = q.type || 'unknown';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(q);
        return acc;
    }, {});

    let markdown = '';
    let typeCounter = 0;
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    for (const type in groupedQuestions) {
        if (groupedQuestions.hasOwnProperty(type)) {
            const questionsOfType = groupedQuestions[type];
            const typeHeader = t.test_types[type] || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            markdown += `\n# ${romanNumerals[typeCounter]}. ${typeHeader}\n`;
            typeCounter++;
            if (type === 'interpretive' && questionsOfType[0].passage) {
                markdown += `${questionsOfType[0].instruction || t[type]}\n\n`;
                markdown += `> ${questionsOfType[0].passage.replace(/\n/g, '\n> ')}\n\n`;
            } else {
                 markdown += `${questionsOfType[0].instruction || t[type]}\n\n`;
            }
            if (type === 'identification') {
                const choices = questionsOfType[0]?.choicesBox;
                if (choices && choices.length > 0) {
                    const choicesMarkdown = choices.map(choice => `**${choice}**`).join(' &nbsp; &nbsp; • &nbsp; &nbsp; ');
                    markdown += `<div style="border: 1px solid #ccc; padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 15px;">\n${choicesMarkdown}\n</div>\n\n`;
                }
                questionsOfType.forEach(q => {
                    markdown += `${q.questionNumber}. ${q.question} \n   **Answer:** __________________\n\n`;
                });
            } else if (type === 'matching-type') {
                 markdown += `| ${t.columnA} | ${t.columnB} |\n`;
                 markdown += `|---|---|\n`;
                 const firstItem = questionsOfType[0];
                 const prompts = firstItem.prompts || [];
                 const options = firstItem.options || [];
                 const maxRows = Math.max(prompts.length, options.length);
                 for (let i = 0; i < maxRows; i++) {
                     const promptText = prompts[i] ? `${firstItem.questionNumber + i}. ${prompts[i].text}` : '';
                     const optionText = options[i] ? `${String.fromCharCode(97 + i)}. ${options[i].text}` : '';
                     markdown += `| ${promptText} | ${optionText} |\n`;
                 }
                 markdown += '\n';
            } else {
                questionsOfType.forEach(q => {
                    markdown += `${q.questionNumber}. ${q.question}\n`;
                    if (q.options) {
                        q.options.forEach((option, index) => {
                            const optionText = option.trim().replace(/^[a-zA-Z][.)]\s*/, '');
                            markdown += `   ${String.fromCharCode(97 + index)}. ${optionText}\n`;
                        });
                        markdown += `\n`;
                    // --- START: MODIFICATION (This is the fix) ---
                    // Instead of just "&& q.rubric", check if it's an array.
                    } else if (q.type === 'essay' && Array.isArray(q.rubric)) {
                    // --- END: MODIFICATION ---
                        markdown += `**${t.rubric}:**\n\n`;
                        q.rubric.forEach(item => {
                            markdown += `* ${item.criteria}: ${item.points} point${item.points > 1 ? 's' : ''}\n`;
                        });
                        markdown += `\n`;
                    }
                });
            }
        }
    }
    return markdown;
};

const generateAnswerKeyMarkdown = (questions) => {
    if (!questions || questions.length === 0) return 'No answer key generated.';
    let markdown = `### Answer Key\n\n`;
    questions.forEach((q) => {
        if (q.type === 'matching-type') {
            const firstQuestionNumber = q.questionNumber;
            const prompts = q.prompts || [];
            // Safe: check if options array exists
            const options = q.options || []; 
            prompts.forEach((prompt, index) => {
                const correctOptionId = q.correctPairs[prompt.id];
                const correctOption = options.find(opt => opt.id === correctOptionId);
                const correctOptionIndex = options.findIndex(opt => opt.id === correctOptionId);
                // Safe: check if correct option was found
                if(correctOption) {
                    markdown += `**Question ${firstQuestionNumber + index}:** ${String.fromCharCode(97 + correctOptionIndex)}. ${correctOption.text}\n`;
                } else {
                    markdown += `**Question ${firstQuestionNumber + index}:** Error: No matching answer found.\n`;
                }
            });
        } else if (q.correctAnswer) {
            markdown += `**Question ${q.questionNumber}:** ${q.correctAnswer}\n`;
        }
    });
    return markdown;
};

const generateExplanationsMarkdown = (questions) => {
    if (!questions || questions.length === 0) return 'No explanations generated.';
    let markdown = `### Explanations\n\n`;
    questions.forEach((q) => {
        if (q.explanation) {
            markdown += `**Question ${q.questionNumber}:**\n`;
            markdown += `* **Explanation:** ${q.explanation}\n\n`;
        }
        if (q.solution) {
            markdown += `**Question ${q.questionNumber}:**\n`;
            markdown += `* **Solution:** ${q.solution}\n\n`;
        }
    });
    return markdown;
};

const TOSPreviewTable = ({ tos }) => (
    <div className="overflow-x-auto text-sm">
        <div className="bg-slate-200/50 dark:bg-neumorphic-base-dark/50 p-4 rounded-xl mb-4 dark:shadow-neumorphic-inset-dark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 text-center">{tos?.header?.examTitle}</h3>
            <p className="text-center text-sm text-gray-600 dark:text-slate-400">{tos?.header?.subject}</p>
            <p className="text-center text-sm text-gray-600 dark:text-slate-400">{tos?.header?.gradeLevel}</p>
            <h4 className="font-medium text-gray-800 dark:text-slate-200 text-center mt-2">TABLE OF SPECIFICATIONS (TOS)</h4>
        </div>
        <table className="min-w-full">
            <thead className="border-b border-gray-200 dark:border-slate-700">
                <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Competencies</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Hours</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Weight</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Items</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Easy Nos.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Average Nos.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Difficult Nos.</th>
                </tr>
            </thead>
            <tbody>
                {tos?.competencyBreakdown?.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-slate-700">
                        <td className="px-3 py-4 whitespace-nowrap text-gray-800 dark:text-slate-200">{row.competency}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.noOfHours}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.weightPercentage}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.noOfItems}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.easyItems.itemNumbers}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.averageItems.itemNumbers}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.difficultItems.itemNumbers}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="font-bold">
                <tr>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900 dark:text-slate-100">TOTAL</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900 dark:text-slate-100 text-center">{tos?.totalRow?.hours}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900 dark:text-slate-100 text-center">{tos?.totalRow?.weightPercentage}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900 dark:text-slate-100 text-center">{tos?.totalRow?.noOfItems}</td>
                    <td colSpan="3"></td>
                </tr>
            </tfoot>
        </table>
    </div>
);

// --- END: ORIGINAL HELPER FUNCTIONS ---


// --- START: NEW ATOMIC GENERATION HELPERS (Adapted from GenerationScreen.jsx) ---

/**
 * --- Micro-Worker Sanitizer ---
 * A simpler sanitizer for the small, known JSON structures from micro-workers.
 */
const sanitizeJsonComponent = (aiResponse) => {
    try {
        const startIndex = aiResponse.indexOf('{');
        const endIndex = aiResponse.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error('No valid JSON object ({...}) found in AI response.');
        }
        const jsonString = aiResponse.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("sanitizeJsonComponent error:", error.message, "Preview:", aiResponse.substring(0, 300));
        throw new Error(`The AI component response was not valid JSON.`);
    }
};

/**
 * --- "Planner" Prompt Generator ---
 * This prompt generates *only* the Table of Specifications.
 */
const getTosPlannerPrompt = (guideData) => {
    const { 
        learningCompetencies, 
        language, 
        totalHours, 
        totalConfiguredItems, 
        formattedTestStructure,
        selectedCourse,
        selectedLessons
    } = guideData;

    const examTitle = `Periodical Exam for ${selectedCourse?.title || 'Subject'}`;
    const subject = selectedCourse?.title || 'Not Specified';
    const gradeLevel = selectedCourse?.gradeLevel || 'Not Specified';
    const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');

    return `
    You are an expert educational assessment planner. Your *only* task is to generate a detailed Table of Specifications (TOS) in JSON format. Do NOT generate exam questions.

    **PRIMARY DIRECTIVE: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT.**
    ---
    **OUTPUT JSON STRUCTURE (Strict):**
    {
        "examTitle": "${examTitle}",
        "tos": {
            "header": { "examTitle": "${examTitle}", "subject": "${subject}", "gradeLevel": "${gradeLevel}" },
            "competencyBreakdown": [
                { "competency": "...", "noOfHours": 0, "weightPercentage": "...", "noOfItems": 0, "easyItems": { "count": 0, "itemNumbers": "..." }, "averageItems": { "count": 0, "itemNumbers": "..." }, "difficultItems": { "count": 0, "itemNumbers": "..." } }
            ],
            "totalRow": { "hours": "...", "weightPercentage": "...", "noOfItems": 0 }
        }
    }
    ---
    **INPUT DATA**
    - **Lesson Titles:** "${combinedLessonTitles}"
    - **Learning Competencies:** \`\`\`${learningCompetencies}\`\`\`
    - **Language:** ${language}
    - **Total Hours for Topic:** ${totalHours || 'not specified'}
    - **Total Items:** ${totalConfiguredItems}
    - **Test Structure:** ${formattedTestStructure}

    **CRITICAL GENERATION RULES (NON-NEGOTIA BLE):**
    1.  **TOTAL ITEMS ADHERENCE:** The 'noOfItems' in the TOS 'totalRow' MUST equal ${totalConfiguredItems}.
    2.  **TOS COMPETENCIES:** You MUST use the exact learning competencies provided.
    3.  **ITEM CALCULATION:** Calculate 'noOfItems' using: \`(weightPercentage / 100) * ${totalConfiguredItems}\`, then adjust rounded numbers to sum to the 'Total Items' using the Largest Remainder Method.
    4.  **LANGUAGE:** All text MUST be in **${language}**.
    5.  **DIFFICULTY DISTRIBUTION:** Strictly adhere to Easy: 60%, Average: 30%, Difficult: 10%. Distribute items accordingly in the TOS columns.
    6.  **ESSAY in TOS:** Place an essay's entire item number range in the 'difficultItems' column.
    `;
};

/**
 * --- "Micro-Worker" Prompt Generator ---
 * This prompt generates *only* one component of the exam (e.g., "5 Multiple Choice").
 */
const getExamComponentPrompt = (guideData, generatedTos, testType) => {
    const { language, combinedContent } = guideData;
    const { type, numItems, range } = testType;
    
    // --- START: MODIFICATION ---
    // Check if the type is a single-prompt question (like Essay or Solving)
    const normalizedType = type.toLowerCase();
    const isSingleQuestionType = normalizedType.includes('essay') || normalizedType.includes('solving');
    // --- END: MODIFICATION ---

    // Provides the AI with the specific part of the TOS it should focus on
    const tosContext = JSON.stringify(generatedTos, null, 2);

    return `
    You are an expert exam question writer. Your task is to generate *only* the questions for a specific section of an exam.

    **PRIMARY DIRECTIVE: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT.**
    ---
    **OUTPUT JSON STRUCTURE (Strict):**
    {
        "questions": [
            { 
                "questionNumber": 1, // Start numbering from the 'range'
                "type": "...", // e.g., "multiple_choice"
                "instruction": "...", 
                "question": "...", 
                // ... other fields like options, correctAnswer, prompts, etc.
            }
        ]
    }
    ---
    **INPUT DATA**
    - **Lesson Content:** \`\`\`${combinedContent}\`\`\`
    - **Language:** ${language}
    - **Full Table of Specifications (TOS):** ${tosContext}
    
    **YOUR SPECIFIC TASK**
    - **Test Type:** Generate **${type}**
    
    // --- START: MODIFIED LOGIC ---
    - **Number of Items:** ${isSingleQuestionType ? `Generate EXACTLY **1** item.` : `Generate EXACTLY **${numItems}** items.`}
    - **Item Range:** ${isSingleQuestionType 
        ? `The "questionNumber" for this single item MUST be the START of the range (e.g., if range is "${range}", use "${range.split('-')[0].trim()}").` 
        : `The "questionNumber" field MUST correspond to the range **${range}**. (e.g., if range is "11-15", the first questionNumber is 11).`}
    ${isSingleQuestionType ? `\n    - **Point Value:** This single question is worth **${numItems}** points. Your generated rubric MUST reflect this total point value.` : ''}
    // --- END: MODIFIED LOGIC ---

    - **Context:** Base your questions *only* on the "Lesson Content".
    - **TOS Adherence:** Ensure the questions you generate for this range (${range}) match the competencies and difficulty levels specified for those item numbers in the provided "Full Table of Specifications".

    **CRITICAL GENERATION RULES (Follow these from the original prompt):**
    1.  **MULTIPLE CHOICE OPTIONS:** The 'options' array MUST contain the option text ONLY. DO NOT include prefixes like "a)".
    
    // --- START: MODIFIED RULE ---
    2.  **ESSAY / SOLVING:** If the **Test Type** is "Essay" or "Solving", you MUST generate **ONE prompt**. The "Item Range" (${range}) represents the item numbers this single question covers, and the "Number of Items" (${numItems}) represents the **total points** it is worth. You MUST create a scoring rubric that totals **${numItems}** points. The \`questionNumber\` in the JSON should be the first number in the range (e.g., for "46-50", use 46).
    // --- END: MODIFIED RULE ---
    
    3.  **IDENTIFICATION:** Group all items. Generate a single \`choicesBox\` with all answers plus ONE distractor.
    4.  **MATCHING TYPE (STRICT):** Use the \`"type": "matching-type"\` format with \`prompts\`, \`options\`, \`correctPairs\`, and one distractor in \`options\`. The entire test for this range must be a SINGLE object in the "questions" array.
    
    5.  **CONTENT ADHERENCE & TOPIC FIDELITY (ABSOLUTE RULE):**
        - All questions, options, and explanations MUST be derived STRICTLY and SOLELY from the provided **Lesson Content**.
        - DO NOT generate meta-questions (e.g., questions about Bloom's Taxonomy, or the process of assessment). The quiz must test the student on the lesson material, not on pedagogical concepts.
        - You are **STRICTLY FORBIDDEN** from using any phrases that refer back to the source material. It is forbidden to use text like "According to the lesson," "Based on the topic," "As mentioned in the content," or any similar citations. The questions must stand on their own, as if in a real exam.
    `;
};

/**
 * --- "Micro-Worker" Function with Retries & Throttling ---
 * This function generates one exam component and includes retries, delays, and abort checks.
 */
const generateExamComponent = async (guideData, generatedTos, testType, isGenerationRunningRef, maxRetries = 3) => {
    const prompt = getExamComponentPrompt(guideData, generatedTos, testType);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // --- ABORT CHECK ---
        if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

        try {
            const aiResponse = await callGeminiWithLimitCheck(prompt);

            // --- ABORT CHECK ---
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");
            
            const jsonData = sanitizeJsonComponent(aiResponse); // Use the simple sanitizer
            
            // --- "POLITE" THROTTLING (1.5s delay) ---
            await new Promise(res => setTimeout(res, 1500));
            
            // --- ABORT CHECK ---
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

            return jsonData; // Success

        } catch (error) {
            // --- ABORT CHECK ---
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

            console.warn(
                `Attempt ${attempt + 1} of ${maxRetries} failed for component: ${testType.type}`,
                error.message
            );
            if (attempt === maxRetries - 1) {
                throw new Error(`Failed to generate ${testType.type} after ${maxRetries} attempts.`);
            }

            // --- "RETRY" THROTTLING (5s delay) ---
            await new Promise(res => setTimeout(res, 5000));
        }
    }
};

// --- END: NEW ATOMIC GENERATION HELPERS ---


export default function CreateExamAndTosModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedLessons, setSelectedLessons] = useState([]);
    const [previewData, setPreviewData] = useState(null);
    const [language, setLanguage] = useState('English');
    const [learningCompetencies, setLearningCompetencies] = useState('');
    const [testTypes, setTestTypes] = useState([]);
    const [totalHours, setTotalHours] = useState('');
    const [isSaveOptionsOpen, setIsSaveOptionsOpen] = useState(false);

    // --- NEW: Abort controller ref ---
    const isGenerationRunning = useRef(false);

    // --- NEW: Abort on unmount ---
    useEffect(() => {
        // This cleanup function runs when the component unmounts
        return () => {
            isGenerationRunning.current = false;
        };
    }, []);

    // --- NEW: Abort on modal close ---
    const handleClose = useCallback(() => {
        isGenerationRunning.current = false; // Send abort signal
        onClose(); // Call the original onClose prop
    }, [onClose]);

    // --- Neumorphic style constants (Unchanged) ---
    const neumorphicInput = `${inputBaseStyles} block w-full px-4 py-2.5 sm:text-sm`;
    const neumorphicTextarea = `${inputBaseStyles} block w-full px-4 py-2.5 sm:text-sm`;
    const neumorphicSelect = `${inputBaseStyles} block w-full pl-4 pr-10 py-2.5 sm:text-sm appearance-none`;


    const handleTestTypeChange = (index, field, value) => {
        const updatedTestTypes = [...testTypes];
        updatedTestTypes[index][field] = value;
        if (field === 'range') {
            updatedTestTypes[index].numItems = calculateItemsForRange(value);
        }
        setTestTypes(updatedTestTypes);
    };

    const addTestType = () => {
        setTestTypes([...testTypes, { type: 'Multiple Choice', range: '', numItems: 0 }]);
    };

    const removeTestType = (index) => {
        setTestTypes(testTypes.filter((_, i) => i !== index));
    };

    const totalConfiguredItems = testTypes.reduce((sum, current) => sum + Number(current.numItems || 0), 0);
    const isValidForGeneration = totalConfiguredItems > 0 && selectedLessons.length > 0 && learningCompetencies.trim() !== '';
    const isValidPreview = previewData?.tos?.header && previewData?.examQuestions?.length > 0;

	// ---
    // --- REFACTORED: `handleGenerate` (Orchestrator)
    // ---
	const handleGenerate = async () => {
		    if (!selectedCourse || selectedLessons.length === 0 || learningCompetencies.trim() === '') {
		        showToast("Please select a source subject, at least one lesson, and provide learning competencies.", "error");
		        return;
		    }
		    setIsGenerating(true);
            isGenerationRunning.current = true; // --- NEW: Start abort signal
		    setPreviewData(null); // Clear previous results

		    const combinedContent = selectedLessons.flatMap(lesson => lesson.pages?.map(page => page.content) || []).join('\n\n');
		    const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');
		    const formattedTestStructure = testTypes.map(tt => `${tt.type}: ${tt.numItems} items (from range(s) ${tt.range})`).join('; ');

            // Create a single data object to pass to prompts
            const guideData = {
                learningCompetencies,
                language,
                totalHours,
                totalConfiguredItems,
                formattedTestStructure,
                selectedCourse,
                selectedLessons,
                combinedContent,
                combinedLessonTitles
            };

            let generatedTos = null;
            let allGeneratedQuestions = [];
            
		    try {
                // --- STEP 1: PLANNER ---
                // Generate *only* the Table of Specifications
                showToast("Generating Table of Specifications...", "info", 10000);
		        const tosPrompt = getTosPlannerPrompt(guideData);

                // --- ABORT CHECK ---
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
                const tosResponse = await callGeminiWithLimitCheck(tosPrompt);
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
                
                // Use the original, more robust parser for this first, larger JSON
                const parsedTosData = tryParseJson(extractJson(tosResponse)); 

                if (parsedTosData.tos && parsedTosData.tos.competencyBreakdown) {
                    // --- (This is your original rounding logic) ---
		            const roundedBreakdown = roundPercentagesToSum100(parsedTosData.tos.competencyBreakdown);
		            parsedTosData.tos.competencyBreakdown = roundedBreakdown;
		            const breakdown = parsedTosData.tos.competencyBreakdown;
		            const calculatedTotalHours = breakdown.reduce((sum, row) => sum + Number(row.noOfHours || 0), 0);
		            const calculatedTotalItems = breakdown.reduce((sum, row) => sum + Number(row.noOfItems || 0), 0);
		            parsedTosData.tos.totalRow = {
		                ...parsedTosData.tos.totalRow,
		                hours: String(calculatedTotalHours),
		                weightPercentage: "100%",
		                noOfItems: calculatedTotalItems, 
		            };
                    // --- (End rounding logic) ---
                    
                    generatedTos = parsedTosData.tos; // Save the final TOS
                    
                    // --- UX WIN: Show the TOS as soon as it's ready ---
                    setPreviewData({ 
                        examTitle: parsedTosData.examTitle, 
                        tos: generatedTos, 
                        examQuestions: [] // Start with empty questions
                    });

                    if (calculatedTotalItems !== totalConfiguredItems) {
		                showToast(`Warning: AI generated ${calculatedTotalItems} items, but ${totalConfiguredItems} were requested.`, "warning", 6000);
		            }
		        } else {
                    throw new Error("AI failed to return a valid TOS structure.");
                }

                // --- STEP 2: ORCHESTRATOR & MICRO-WORKERS ---
                // Loop through each test type and generate it atomically
                for (const testType of testTypes) {
                    // --- ABORT CHECK ---
                    if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
                    if (testType.numItems === 0) continue; // Skip empty test types

                    showToast(`Generating ${testType.type} (Items ${testType.range})...`, "info", 10000);
                    
                    const componentData = await generateExamComponent(
                        guideData, 
                        generatedTos, // Pass the generated TOS as context
                        testType,
                        isGenerationRunning // Pass the abort ref
                    );

                    if (componentData && componentData.questions) {
                        allGeneratedQuestions.push(...componentData.questions);
                        
                        // --- UX WIN: Update the preview incrementally ---
                        setPreviewData(prev => ({
                            ...prev,
                            examQuestions: [...allGeneratedQuestions] // Show questions as they arrive
                        }));
                    }
                }
                
                // --- ABORT CHECK ---
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
		        showToast("Exam and TOS generated successfully!", "success");

		    } catch (err) {
                // --- NEW: Handle aborts silently ---
                if (err.message && err.message.includes("aborted")) {
                    console.log("Generation loop aborted by user.");
                    showToast("Generation cancelled.", "warning");
                } else {
                    console.error("Generation error:", err);
                    showToast(`Generation failed: ${err.message}`, "error", 15000);
                    // We DON'T setPreviewData(null), so the user can see partial results
                }
		    } finally {
		        setIsGenerating(false);
                isGenerationRunning.current = false; // --- NEW: End abort signal
		    }
		};
    
    
    // --- (The rest of the component: saveAsLesson, saveAsQuiz, handleFinalSave) ---
    // --- (These functions are UNCHANGED from your original file) ---
    const saveAsLesson = async () => {
        const batch = writeBatch(db);
        const newLessonRef = doc(collection(db, 'lessons'));
        const tosMarkdown = generateTosMarkdown(previewData.tos);
        const examMarkdown = generateExamQuestionsMarkdown(previewData.examQuestions, language);
        const answerKeyMarkdown = generateAnswerKeyMarkdown(previewData.examQuestions);
        const explanationsMarkdown = generateExplanationsMarkdown(previewData.examQuestions);
        const newLessonData = {
            title: previewData.examTitle || `Generated Exam (${new Date().toLocaleDateString()})`,
            contentType: "studentLesson",
            subjectId: subjectId,
            unitId: unitId,
            createdAt: serverTimestamp(),
            pages: [
                { title: "Table of Specifications (TOS)", type: "text/markdown", content: tosMarkdown },
                { title: "Exam Questions", type: "text/markdown", content: examMarkdown },
                { title: "Answer Key", type: "text/markdown", content: answerKeyMarkdown },
                { title: "Explanations", type: "text/markdown", content: explanationsMarkdown }
            ],
        };
        batch.set(newLessonRef, newLessonData);
        await batch.commit();
    };

	const saveAsQuiz = async () => {
		    // De-duplicate the questions array to handle potential AI formatting errors.
		    const uniqueQuestions = [];
		    const seenGroupableTypes = new Set();
		    for (const q of previewData.examQuestions) {
		        const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');
		        const isGroupable = normalizedType === 'matching_type' || normalizedType === 'matching-type' || normalizedType === 'identification';
		        if (isGroupable) {
		            if (!seenGroupableTypes.has(normalizedType)) {
		                uniqueQuestions.push(q);
		                seenGroupableTypes.add(normalizedType);
		            }
		        } else {
		            uniqueQuestions.push(q);
		        }
		    }

		    // Map over the questions defensively, providing fallbacks for potentially missing AI data.
		    const quizQuestions = uniqueQuestions
		        .map(q => {
		            const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');
            
	                const questionText = (normalizedType === 'interpretive' && q.passage)
	                    ? `${q.passage}\n\n${q.question || ''}`
	                    : (q.question || 'Missing question text from AI.');

		            const baseQuestion = {
		                text: questionText, // Use the potentially modified text
		                difficulty: q.difficulty || 'easy',
		                explanation: q.explanation || '',
		            };

		            if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
		                const options = q.options || [];
		                const correctAnswerText = (q.correctAnswer || '').replace(/^[a-d]\.\s*/i, '').trim();
		                const correctIndex = options.findIndex(opt => opt === correctAnswerText);

		                if (options.length > 0 && correctIndex > -1) {
		                    return {
		                        ...baseQuestion,
		                        type: 'multiple-choice', // Standardize to 'multiple-choice' for the quiz component
		                        options: options.map(opt => ({ text: opt, isCorrect: opt === correctAnswerText })),
		                        correctAnswerIndex: correctIndex,
		                    };
		                }
		            }
		            if (normalizedType === 'alternative_response') {
		                if (typeof q.correctAnswer === 'string') {
		                    return {
		                        ...baseQuestion,
		                        type: 'true-false',
		                        correctAnswer: q.correctAnswer.toLowerCase() === 'true' || q.correctAnswer.toLowerCase() === 'tama',
		                    };
		                }
		            }
		            if (normalizedType === 'identification' || normalizedType === 'solving') {
		                if (q.correctAnswer) {
		                    return {
		                        ...baseQuestion,
		                        type: 'identification', // Standardize 'solving' to 'identification' for the quiz component
		                        correctAnswer: q.correctAnswer,
                                choicesBox: q.choicesBox || null,
		                    };
		                }
		            }
		            if (normalizedType === 'matching_type' || normalizedType === 'matching-type') {
		                const prompts = q.prompts || [];
		                const options = q.options || [];
		                const correctPairs = q.correctPairs || {};

		                if (prompts.length > 0 && options.length > 0 && Object.keys(correctPairs).length > 0) {
		                    return {
		                        ...baseQuestion,
		                        text: q.instruction || 'Match the following items.',
		                        type: 'matching-type',
		                        prompts: prompts,
		                        options: options,
		                        correctPairs: correctPairs,
		                    };
		                }
		            }
                    
                    {/* --- [START] MODIFICATION: Added block for Essay --- */}
                    if (normalizedType === 'essay') {
                        return {
                            ...baseQuestion,
                            type: 'essay',
                            rubric: q.rubric || [], // Save the rubric
                        };
                    }
                    {/* --- [END] MODIFICATION --- */}

		            return null;
		        })
		        .filter(Boolean);

		    if (quizQuestions.length === 0) {
		        throw new Error("No compatible, well-formed questions were generated to create an interactive quiz.");
		    }

		    const quizRef = doc(collection(db, 'quizzes'));
		    const quizData = {
		        title: `Quiz: ${previewData.examTitle || 'Generated Exam'}`,
		        language: language,
		        unitId: unitId,
		        subjectId: subjectId,
		        lessonId: null,
		        createdAt: serverTimestamp(),
		        createdBy: 'AI',
		        questions: quizQuestions,
		    };
		    await setDoc(quizRef, quizData);
		};

    const handleFinalSave = async (saveType) => {
        if (!previewData) {
            showToast("No exam data to save.", "error");
            return;
        }
        if (!unitId || !subjectId) {
            showToast("Save failed: Unit ID or Subject ID is missing.", "error");
            return;
        }
    
        setIsSaveOptionsOpen(false);
        setIsSaving(true);
        showToast("Saving...", "info");
    
        try {
            if (saveType === 'lesson') {
                await saveAsLesson();
                showToast("Exam saved as a viewable lesson!", "success");
            } else if (saveType === 'quiz') {
                await saveAsQuiz();
                showToast("Exam saved as an interactive quiz!", "success");
            } else if (saveType === 'both') {
                await saveAsLesson();
                try {
                    await saveAsQuiz();
                    showToast("Saved as both a lesson and a quiz!", "success");
                } catch (quizError) {
                    console.error("Quiz save error:", quizError);
                    showToast(`Lesson saved, but quiz failed: ${quizError.message}`, "warning", 8000);
                }
            }
            handleClose(); // Use the new wrapper to close
        } catch (err) {
            console.error("Save error:", err);
            showToast(`Failed to save: ${err.message}`, "error", 8000);
        } finally {
            setIsSaving(false);
        }
    };


    // ---
    // --- START: JSX (Unchanged, but now uses `handleClose` wrapper)
    // ---
    return (
        <Dialog open={isOpen} onClose={handleClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-lg dark:bg-black/80" />
            <Dialog.Panel
                className="relative bg-slate-200 dark:bg-neumorphic-base-dark shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] dark:shadow-lg border border-white/20 dark:border-slate-700/50 p-6 sm:p-8 rounded-3xl w-full max-w-5xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {(isGenerating || isSaving) && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-neumorphic-base-dark/80 backdrop-blur-md flex flex-col justify-center items-center z-50 rounded-3xl">
                        <InteractiveLoadingScreen
                            topic={selectedLessons.length > 0 ? selectedLessons.map(l => l.title).join(', ') : "new ideas"}
                            isSaving={isSaving}
                            lessonProgress={{ 
                                current: previewData ? (previewData.examQuestions ? previewData.examQuestions.length : 0) + 1 : 1, // +1 for TOS
                                total: testTypes.length + 1 // All test types + TOS
                            }}
                        />
                    </div>
                )}
                {isSaveOptionsOpen && (
                    <Dialog open={isSaveOptionsOpen} onClose={() => setIsSaveOptionsOpen(false)} className="relative z-[120]">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/80" aria-hidden="true" />
                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-sm rounded-3xl bg-slate-200 dark:bg-neumorphic-base-dark p-6 shadow-2xl dark:shadow-lg">
                                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
                                   <DocumentArrowDownIcon className="w-7 h-7 text-blue-600 dark:text-blue-400"/>
                                   Save Options
                                </Dialog.Title>
                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">How would you like to save the generated exam content?</p>
                                <div className="mt-5 space-y-3">
                                    <button onClick={() => handleFinalSave('lesson')} className="w-full flex items-center gap-4 text-left p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-neumorphic-base-dark/60 transition-colors">
                                        <DocumentTextIcon className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-slate-200">Viewable Lesson</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">Saves TOS, questions, and answers as markdown pages.</p>
                                        </div>
                                    </button>
                                     <button onClick={() => handleFinalSave('quiz')} className="w-full flex items-center gap-4 text-left p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-neumorphic-base-dark/60 transition-colors">
                                        <PuzzlePieceIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-slate-200">Interactive Quiz</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">Saves compatible questions as a playable quiz.</p>
                                        </div>
                                    </button>
                                     <button onClick={() => handleFinalSave('both')} className="w-full flex items-center gap-4 text-left p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-neumorphic-base-dark/60 transition-colors">
                                        <DocumentDuplicateIcon className="w-8 h-8 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-slate-200">Both Lesson and Quiz</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">Creates both a viewable lesson and an interactive quiz.</p>
                                        </div>
                                    </button>
                                </div>
                                <div className="mt-6 text-right">
                                     <button onClick={() => setIsSaveOptionsOpen(false)} className={`py-2 px-4 rounded-lg text-sm font-semibold ${btnExtruded} bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300`}>Cancel</button>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </Dialog>
                )}
                <div className="flex justify-between items-start pb-5 border-b border-gray-900/10 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 dark:bg-blue-700 p-2.5 rounded-2xl text-white shadow-lg flex-shrink-0">
                            <ClipboardDocumentListIcon className="h-7 w-7" />
                        </div>
                        <div>
                            <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Exam & TOS Generator</Dialog.Title>
                            <p className="text-sm text-gray-600 dark:text-slate-400">Create a comprehensive exam and its Table of Specifications.</p>
                        </div>
                    </div>
                    {/* --- MODIFIED: Use handleClose --- */}
                    <button onClick={handleClose} className={`h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-neumorphic-base-dark dark:text-slate-400 ${btnExtruded}`}>
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="py-6 space-y-6 flex-1 overflow-y-auto -mr-3 pr-3">
                    {!previewData ? (
                        // --- (This is the FORM view - Unchanged) ---
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="p-5 bg-slate-200 rounded-2xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Exam Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor="totalItemsDisplay" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Total Number of Items</label>
                                            <div id="totalItemsDisplay" className={`mt-1.5 ${neumorphicInput} py-2.5 font-medium`}>
                                                {totalConfiguredItems}
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label htmlFor="totalHours" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Total Hours Spent</label>
                                            <input id="totalHours" type="number" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} className={`mt-1.5 ${neumorphicInput}`} placeholder="e.g., 10" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label htmlFor="language" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Language</label>
                                            <select id="language" value={language} onChange={e => setLanguage(e.target.value)} className={`mt-1.5 ${neumorphicSelect}`}>
                                                <option>English</option>
                                                <option>Filipino</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-200 rounded-2xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Source Content Selection</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="learningCompetencies" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Learning Competencies</label>
                                            <textarea id="learningCompetencies" rows="4" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className={neumorphicTextarea} placeholder="Enter learning competencies, one per line." ></textarea>
                                        </div>
                                        <CourseSelector onCourseSelect={setSelectedCourse} />
                                        {selectedCourse && (
                                            <LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="p-5 bg-slate-200 rounded-2xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-lg h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Test Structure</h3>
                                            <p className="text-sm text-gray-500 dark:text-slate-400">Define the types of tests for the exam.</p>
                                        </div>
                                        <button onClick={addTestType} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                                            <PlusIcon className="w-5 h-5"/>
                                            <span>Add</span>
                                        </button>
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        {testTypes.map((test, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-neumorphic-base-dark/60">
                                                <div className="flex-1">
                                                    <select value={test.type} onChange={e => handleTestTypeChange(index, 'type', e.target.value)} className="w-full text-sm bg-transparent dark:bg-transparent dark:text-slate-100 border-none rounded-md focus:ring-0">
                                                        <option>Multiple Choice</option>
                                                        <option>Matching Type</option>
                                                        <option>Alternative Response</option>
                                                        <option>Identification</option>
                                                        <option>Solving</option>
                                                        <option>Essay</option>
                                                        <option>Analogy</option>
                                                        <option>Interpretive</option>
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <input id={`range-${index}`} type="text" value={test.range} onChange={e => handleTestTypeChange(index, 'range', e.target.value)} placeholder="Number Range (e.g., 1-10)" className={`w-full px-3 py-1.5 text-sm rounded-lg ${inputBaseStyles}`}/>
                                                </div>
                                                <button onClick={() => removeTestType(index)} className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-500 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {totalConfiguredItems === 0 && (
                                        <p className="text-red-600 dark:text-red-400 text-sm mt-3 font-medium">Warning: Total items is 0.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // --- (This is the PREVIEW view - Unchanged) ---
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Preview: {previewData?.examTitle || 'Generated Exam'}</h2>
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto border border-gray-900/10 dark:border-slate-700 rounded-2xl p-2 sm:p-5 bg-gray-100/50 dark:bg-neumorphic-base-dark/30 dark:shadow-neumorphic-inset-dark">
                                {/* --- MODIFICATION: Check for TOS first, as questions arrive later --- */}
                                {previewData.tos ? (
                                    <>
                                        <div className="bg-white dark:bg-neumorphic-base-dark p-5 rounded-2xl shadow-sm dark:shadow-lg">
                                            <h3 className="text-lg font-bold mb-3 dark:text-slate-100">Page 1: Table of Specifications (TOS)</h3>
                                            <TOSPreviewTable tos={previewData.tos} />
                                        </div>
                                        
                                        {/* --- Only show questions if they exist --- */}
                                        {previewData.examQuestions && previewData.examQuestions.length > 0 && (
                                            <>
                                                <div className="bg-white dark:bg-neumorphic-base-dark p-5 rounded-2xl shadow-sm dark:shadow-lg">
                                                    <h3 className="text-lg font-bold mb-2 dark:text-slate-100">Page 2: Exam Questions</h3>
                                                    {(() => {
                                                        // Group questions by type (e.g., all 'multiple_choice' together)
                                                        const groupedQuestions = previewData.examQuestions.reduce((acc, q) => {
                                                            const type = q.type || 'unknown';
                                                            if (!acc[type]) {
                                                                acc[type] = {
                                                                    instruction: q.instruction,
                                                                    passage: q.passage,
                                                                    choicesBox: q.choicesBox, // For Identification type
                                                                    questions: []
                                                                };
                                                            }
                                                            acc[type].questions.push(q);
                                                            return acc;
                                                        }, {});

                                                        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
                                                        const t = translations[language] || translations['English'];

                                                        return Object.entries(groupedQuestions).map(([type, data], typeIndex) => {
                                                            const typeHeader = t.test_types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                                            return (
                                                                <div key={type} className="mt-6 first:mt-0">
                                                                    <h4 className="text-md font-bold dark:text-slate-200">{romanNumerals[typeIndex]}. {typeHeader}</h4>
                                                                    {data.instruction && <p className="text-sm font-medium italic text-gray-600 dark:text-slate-400 my-2">{data.instruction}</p>}
                                                                    {data.passage && <p className="text-sm text-gray-800 dark:text-slate-200 my-2 p-3 bg-gray-100 dark:bg-neumorphic-base-dark/50 rounded-xl border border-gray-200 dark:border-slate-700">{data.passage}</p>}

                                                                    {/* Special box for Identification choices */}
                                                                    {type === 'identification' && data.choicesBox && (
                                                                        <div className="text-center p-3 my-4 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-neumorphic-base-dark/50">
                                                                            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                                                                                {data.choicesBox.join('   •   ')}
                                                                            </p>
                                                                        </div>
                                                                    )}
                    
                                                                    <div className="space-y-5 mt-4">
                                                                        {/* Special two-column layout for Matching Type */}
                                                                        {type === 'matching-type' ? (
                                                                            (() => {
                                                                                const q = data.questions[0]; // Matching type data is in a single question object
                                                                                if (!q || !q.prompts || !q.options) return null;

                                                                                return (
                                                                                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 pl-2">
                                                                                        {/* Column A: Prompts */}
                                                                                        <div className="flex-1">
                                                                                            <p className="font-semibold text-gray-800 dark:text-slate-100 mb-2">{t.columnA}</p>
                                                                                            <ul className="list-none space-y-2 text-sm text-gray-700 dark:text-slate-300">
                                                                                                {q.prompts.map((prompt, promptIndex) => (
                                                                                                    <li key={prompt.id} className="flex items-start">
                                                                                                        <span className="w-8 flex-shrink-0 font-medium">{q.questionNumber + promptIndex}.</span>
                                                                                                        <span>{prompt.text}</span>
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                        {/* Column B: Options */}
                                                                                        <div className="flex-1">
                                                                                            <p className="font-semibold text-gray-800 dark:text-slate-100 mb-2">{t.columnB}</p>
                                                                                            <ul className="list-none space-y-2 text-sm text-gray-700 dark:text-slate-300">
                                                                                                {q.options.map((option, optionIndex) => (
                                                                                                    <li key={option.id} className="flex items-start">
                                                                                                        <span className="w-8 flex-shrink-0 font-medium">{String.fromCharCode(97 + optionIndex)}.</span>
                                                                                                        <span>{option.text}</span>
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()
                                                                        ) : (
                                                                            /* Default rendering for all other question types */
                                                                            data.questions.map((q, index) => (
                                                                                <div key={index} className="pl-2">
                                                                                    <p className="font-medium text-gray-800 dark:text-slate-200">{q.questionNumber}. {q.question}</p>
                                    
                                                                                    {/* For Multiple Choice, Analogy, etc. */}
                                                                                    {q.options && Array.isArray(q.options) && (
                                                                                        <ul className="list-none mt-2 ml-8 text-sm space-y-1.5 text-gray-700 dark:text-slate-300">
                                                                                            {q.options.map((option, optIndex) => (
                                                                                                <li key={optIndex}>{String.fromCharCode(97 + optIndex)}. {option}</li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    )}

                                                                                    {/* For Identification */}
                                                                                    {type === 'identification' && (
                                                                                         <p className="mt-2 ml-5">Answer: <span className="font-mono">__________________</span></p>
                                                                                    )}
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>

                                                <div className="bg-white dark:bg-neumorphic-base-dark p-5 rounded-2xl shadow-sm dark:shadow-lg">
                                                    <h3 className="text-lg font-bold mb-3 dark:text-slate-100">Page 3: Answer Key</h3>
                                                    <ul className="list-none space-y-2">
                                                        {previewData.examQuestions.map((q, index) => (
                                                            <li key={index} className="text-sm">
                                                                <strong className="font-semibold text-gray-800 dark:text-slate-100">Question {q.questionNumber}:</strong> <span className="text-gray-700 dark:text-slate-300">{q.correctAnswer || (q.correctAnswers && Object.entries(q.correctAnswers).map(([key, val]) => `${key}-${val}`).join(', '))}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="bg-white dark:bg-neumorphic-base-dark p-5 rounded-2xl shadow-sm dark:shadow-lg">
                                                    <h3 className="text-lg font-bold mb-3 dark:text-slate-100">Page 4: Explanations</h3>
                                                    <ul className="list-none space-y-4">
                                                        {previewData.examQuestions.filter(q => q.explanation || q.solution).map((q, index) => (
                                                            <li key={index} className="text-sm">
                                                                <strong className="font-semibold text-gray-800 dark:text-slate-100">Question {q.questionNumber}:</strong>
                                                                {q.explanation && <p className="ml-4 text-gray-700 dark:text-slate-300">Explanation: {q.explanation}</p>}
                                                                {q.solution && <p className="ml-4 text-gray-700 dark:text-slate-300">Solution: {q.solution}</p>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : <p className="text-red-600 dark:text-red-400 font-medium p-4">Could not generate a valid preview.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-5 border-t border-gray-900/10 dark:border-slate-700 flex-shrink-0 flex justify-end gap-3">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} disabled={isSaving || isGenerating} className={`py-2.5 px-5 rounded-xl text-sm font-semibold ${btnExtruded} bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300 ${btnDisabled}`}>Back to Edit</button>
                            <button onClick={() => setIsSaveOptionsOpen(true)} disabled={!isValidPreview || isSaving || isGenerating} className={`inline-flex justify-center py-2.5 px-5 shadow-sm text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors`}>
                                {isSaving ? 'Saving...' : 'Accept & Save'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* --- MODIFIED: Use handleClose --- */}
                            <button type="button" className={`py-2.5 px-5 rounded-xl text-sm font-semibold ${btnExtruded} bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300`} onClick={handleClose}>
                                Cancel
                            </button>
                            <button type="button" className={`inline-flex justify-center py-2.5 px-5 shadow-sm text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors`} onClick={handleGenerate} disabled={!isValidForGeneration || isGenerating}>
                                {isGenerating ? 'Generating...' : 'Generate Exam & TOS'}
                            </button>
                        </>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}