import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import CourseSelector from './CourseSelector';
import LessonSelector from './LessonSelector';

// A reusable input field component for this form (iOS Style)
const FormInput = ({ label, id, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>}
        <input id={id} {...props} className="block w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
    </div>
);

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
    let match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) match = text.match(/```([\s\S]*?)```/);
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
        'matching_type_v2': 'Instructions: Match the items in Column A with the corresponding items in Column B. Write the letter of the correct answer in Column C.',
        'identification': 'Instructions: Identify the correct term for each statement from the choices in the box. Write your answer on the space provided.',
        'essay': 'Instructions: Answer the following question in a comprehensive essay.',
        'solving': 'Instructions: Solve the following problems. Show your complete solution.',
        'analogy': 'Instructions: Complete the following analogies by choosing the best answer.',
        'interpretive': 'Instructions: Read the passage below and answer the questions that follow.',
        'columnA': 'Column A',
        'columnB': 'Column B',
        'columnC': 'Column C',
        'rubric': 'Scoring Rubric',
        'test_types': {
            'multiple_choice': 'Multiple Choice',
            'alternative_response': 'Alternative Response',
            'matching_type_v2': 'Matching Type',
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
        'matching_type_v2': 'Panuto: Itugma ang mga aytem sa Hanay A sa katumbas na mga aytem sa Hanay B. Isulat ang titik ng tamang sagot sa Hanay C.',
        'identification': 'Panuto: Tukuyin ang tamang termino para sa bawat pahayag mula sa mga pagpipilian sa kahon. Isulat ang iyong sagot sa nakalaang espasyo.',
        'essay': 'Panuto: Sagutin ang sumusunod na tanong sa isang komprehensibong sanaysay.',
        'solving': 'Panuto: Lutasin ang mga sumusunod na suliranin. Ipakita ang iyong kumpletong solusyon.',
        'analogy': 'Panuto: Kumpletuhin ang mga sumusunod na analohiya sa pamamagitan ng pagpili ng pinakamahusay na sagot.',
        'interpretive': 'Panuto: Basahin ang talata sa ibaba at sagutin ang mga sumusunod na tanong.',
        'columnA': 'Hanay A',
        'columnB': 'Hanay B',
        'columnC': 'Hanay C',
        'rubric': 'Rubrik sa Pagmamarka',
        'test_types': {
            'multiple_choice': 'Maraming Pagpipilian',
            'alternative_response': 'Alternatibong Pagtugon',
            'matching_type_v2': 'Pagtutugma',
            'identification': 'Pagtukoy',
            'essay': 'Sanaysay',
            'solving': 'Paglutas ng Suliranin',
            'analogy': 'Analohiya',
            'interpretive': 'Interpretibong Pagbasa',
        }
    }
};

const generateTosMarkdown = (tos) => {
    if (!tos) return 'No Table of Specifications generated.';

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
            } else if (type === 'matching_type_v2') {
                markdown += `|${t.columnA}|${t.columnB}|${t.columnC}|\n`;
                markdown += `|---|---|---|\n`;

                const allColumnA = questionsOfType.flatMap(q => q.columnA || []);
                const allColumnB = questionsOfType.flatMap(q => q.columnB || []);
                const firstQuestionNumber = questionsOfType[0].questionNumber;

                const maxRows = Math.max(allColumnA.length, allColumnB.length);
                for (let i = 0; i < maxRows; i++) {
                    const itemA = (allColumnA[i] || '').replace(/^[a-zA-Z0-9]+\.\s*/, '');
                    const itemB = (allColumnB[i] || '').replace(/^[a-zA-Z0-9]+\.\s*/, '');

                    const colAItem = itemA ? `${firstQuestionNumber + i}. ${itemA}` : '';
                    const colBItem = itemB ? `${String.fromCharCode(97 + i)}. ${itemB}` : '';
                    
                    const colCItem = allColumnA[i] ? `${firstQuestionNumber + i}. ______` : '';
                    markdown += `| ${colAItem} | ${colBItem} | ${colCItem} |\n`;
                }
                markdown += '\n';
            } else {
                questionsOfType.forEach(q => {
                    markdown += `${q.questionNumber}. ${q.question}\n`;
                    if (q.options) {
                        q.options.forEach((option, index) => {
                            const optionText = option.trim();
                            if (/^[a-d]\.\s/.test(optionText)) {
                                 markdown += `   ${optionText}\n`;
                            } else {
                                 markdown += `   ${String.fromCharCode(97 + index)}. ${optionText}\n`;
                            }
                        });
                        markdown += `\n`;
                    } else if (q.type === 'essay' && q.rubric) {
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
        if (q.correctAnswer) {
            markdown += `**Question ${q.questionNumber}:** ${q.correctAnswer}\n`;
        } else if (q.correctAnswers) {
            const firstQuestionNumber = q.questionNumber;
            const items = Object.keys(q.correctAnswers).length;
            for(let i = 0; i < items; i++) {
                const currentNum = firstQuestionNumber + i;
                const answerKey = Object.keys(q.correctAnswers).find(key => q.correctAnswers[key] == (i + 1));
                markdown += `**Question ${currentNum}:** ${answerKey}\n`;
            }
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
        <div className="bg-gray-100 p-4 rounded-xl mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">{tos?.header?.examTitle}</h3>
            <p className="text-center text-sm text-gray-600">{tos?.header?.subject}</p>
            <p className="text-center text-sm text-gray-600">{tos?.header?.gradeLevel}</p>
            <h4 className="font-medium text-gray-800 text-center mt-2">TABLE OF SPECIFICATIONS (TOS)</h4>
        </div>
        <table className="min-w-full">
            <thead className="border-b border-gray-200">
                <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Competencies</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Easy Nos.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Nos.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Difficult Nos.</th>
                </tr>
            </thead>
            <tbody>
                {tos?.competencyBreakdown?.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200">
                        <td className="px-3 py-4 whitespace-nowrap text-gray-800">{row.competency}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 text-center">{row.noOfHours}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 text-center">{row.weightPercentage}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 text-center">{row.noOfItems}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 text-center">{row.easyItems.itemNumbers}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 text-center">{row.averageItems.itemNumbers}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 text-center">{row.difficultItems.itemNumbers}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="font-bold">
                <tr>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900">TOTAL</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900 text-center">{tos?.totalRow?.hours}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900 text-center">{tos?.totalRow?.weightPercentage}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-900 text-center">{tos?.totalRow?.noOfItems}</td>
                    <td colSpan="3"></td>
                </tr>
            </tfoot>
        </table>
    </div>
);


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

    const handleGenerate = async () => {
        if (!selectedCourse || selectedLessons.length === 0 || learningCompetencies.trim() === '') {
            showToast("Please select a source subject, at least one lesson, and provide learning competencies.", "error");
            return;
        }
        setIsGenerating(true);
        setPreviewData(null);
        showToast("Generating exam and TOS...", "info", 10000);

        const combinedContent = selectedLessons.flatMap(lesson => lesson.pages?.map(page => page.content) || []).join('\n\n');
        const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');
        const formattedTestStructure = testTypes.map(tt => `${tt.type}: ${tt.numItems} items (from range(s) ${tt.range})`).join('; ');
    
        const alternativeResponseInstruction = language === 'Filipino'
            ? 'Panuto: Basahin at unawain ang bawat pahayag. Isulat ang "Tama" kung ito ay totoo at "Mali" kung hindi.'
            : 'Instructions: Read and understand each statement. Write "True" if the statement is correct and "False" if it is incorrect.';

        const prompt = `You are an expert educational assessment creator. Your task is to generate a comprehensive exam and a detailed Table of Specifications (TOS) in a single JSON object based on the provided data.

	**PRIMARY DIRECTIVE: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT. NO OTHER TEXT SHOULD BE PRESENT.**
	---
	**OUTPUT JSON STRUCTURE (Strict):**
	{
	    "examTitle": "...",
	    "tos": {
	        "header": { "examTitle": "...", "subject": "...", "gradeLevel": "...", "preparedBy": "...", "checkedBy": "...", "attestedBy": "..." },
	        "competencyBreakdown": [
	            { "competency": "...", "noOfHours": 0, "weightPercentage": "...", "noOfItems": 0, "easyItems": { "count": 0, "itemNumbers": "..." }, "averageItems": { "count": 0, "itemNumbers": "..." }, "difficultItems": { "count": 0, "itemNumbers": "..." } }
	        ],
	        "totalRow": { "hours": "...", "weightPercentage": "...", "noOfItems": 0, "easyItems": 0, "averageItems": 0, "difficultItems": 0 }
	    },
	    "examQuestions": [
	        { "questionNumber": 1, "type": "multiple_choice", "instruction": "...", "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "explanation": "...", "difficulty": "Easy", "bloomLevel": "Remembering" },
            { "questionNumber": 11, "type": "matching_type_v2", "instruction": "...", "columnA": ["...", "..."], "columnB": ["...", "..."], "correctAnswers": {"A": "1", "B": "2"}, "difficulty": "Average", "bloomLevel": "Understanding" },
            { "questionNumber": 21, "type": "identification", "instruction": "...", "question": "The powerhouse of the cell.", "choicesBox": ["Mitochondria", "Nucleus", "Ribosome"], "correctAnswer": "Mitochondria", "difficulty": "Average", "bloomLevel": "Understanding" },
	        { "questionNumber": 31, "type": "essay", "instruction": "...", "question": "...", "rubric": [ {"criteria": "...", "points": 0} ], "difficulty": "Difficult", "bloomLevel": "Creating" }
	    ]
	}
	---
	**INPUT DATA**
	- **Lesson Titles:** "${combinedLessonTitles}"
	- **Learning Competencies:** \`\`\`${learningCompetencies}\`\`\`
	- **Lesson Content:** \`\`\`${combinedContent}\`\`\`
	- **Language:** ${language}
	- **Total Hours for Topic:** ${totalHours || 'not specified'}
	- **Total Items:** ${totalConfiguredItems}
	- **Test Structure:** ${formattedTestStructure}
	
	**CRITICAL GENERATION RULES (NON-NEGOTIABLE):**
	
	1.  **TOS COMPETENCIES (ABSOLUTE REQUIREMENT):** You MUST use the exact learning competencies provided in the "INPUT DATA" section for the \`competencyBreakdown\` in the TOS. Each competency from the input list MUST correspond to one row in the \`competencyBreakdown\` array. DO NOT invent, paraphrase, or create your own competencies.
    2.  **ITEM CALCULATION (STRICT FORMULA):** For each competency, the 'noOfItems' MUST be calculated with the formula: \`(weightPercentage / 100) * Total Items\`. You must then adjust the rounded numbers so their sum exactly equals the 'Total Items'. Use the Largest Remainder Method for this adjustment to ensure perfect accuracy.
	3.  **LANGUAGE:** ALL generated text (instructions, questions, options, etc.) MUST be in the specified language: **${language}**.
	4.  **DIFFICULTY DISTRIBUTION (STRICT):** You must strictly adhere to the following percentages for the total number of items: Easy: 60%, Average: 30%, Difficult: 10%. If the calculation results in a non-whole number, round down. Any remaining items must be added to the 'Easy' category.
	5.  **TOS VERTICAL DISTRIBUTION:** For EACH competency row, you MUST distribute its 'No. of Items' across the 'Easy', 'Average', and 'Difficult' columns, adhering as closely as possible to the 60-30-10 ratio.
	6.  **QUESTION CLARITY & CONCISENESS:** All questions and multiple-choice options should be clear, unambiguous, and as concise as possible. Avoid overly long sentences in options when a shorter phrasing would suffice.
	7.  **ESSAY QUESTION GENERATION (ABSOLUTE RULE):** If the test includes an "Essay", you MUST generate **EXACTLY ONE (1)** single "miss universe" style essay question. It must be a single, standalone prompt without follow-up questions or parts (e.g., no 'Part A, Part B'). The number range provided (e.g., '31-35') corresponds to the TOTAL POINTS for that single question's rubric.
	8.  **ESSAY PLACEMENT IN TOS (STRICT OVERRIDE):** If an Essay question exists, you MUST place its entire item number range (e.g., "31-35") in the 'difficultItems' column of the TOS. **This rule is an absolute override and must be followed even if it conflicts with the 60-30-10 vertical distribution rule.**
    9.  **IDENTIFICATION TYPE (STRICT):** If 'Identification' is included, group all items together. Generate a single \`choicesBox\` array for the group containing all correct answers plus ONE extra distractor. This array goes in the JSON for the *first* identification item only. Choices MUST NOT have prefixes. **Crucially, the "question" field for each item MUST be a descriptive statement or definition, NOT a question.** (e.g., "The powerhouse of the cell." NOT "What is the powerhouse of the cell?").
	10. **MATCHING TYPE:** Group ALL items for a matching type into a SINGLE question object. 'columnA' should contain the questions, and 'columnB' the answers plus ONE extra distractor.
	11. **TOS & NUMBERING:** For Matching Types, the 'itemNumbers' in the TOS must be a sequential list (e.g., "11-15").
	12. **CONTENT ADHERENCE AND PHRASING (ABSOLUTE RULE):** All questions MUST be strictly based on the provided **Lesson Content**. Do not use external knowledge. You are strictly forbidden from using phrases that refer to the source material, such as "According to the lesson," "Based on the text," or "In page 2...". Questions must be phrased generally.
    
    // ✅ REMOVED: The complex option ordering rule is removed from the prompt. It will be handled by the code instead for 100% accuracy.

	**Final Check:** Review your generated JSON for syntax errors before outputting.
	`;
        try {
            const aiResponse = await callGeminiWithLimitCheck(prompt);
            const jsonText = extractJson(aiResponse);
            const parsedData = tryParseJson(jsonText);

            // ✅ ADDED: Client-side sorting logic to guarantee correct option order.
            if (parsedData.examQuestions) {
                parsedData.examQuestions.forEach(question => {
                    if (question.type === 'multiple_choice' && Array.isArray(question.options)) {
                        // Sorts all text-based options by length (Pyramid Style).
                        // This is more robust than asking the AI to do it.
                        question.options.sort((a, b) => a.length - b.length);
                    }
                });
            }

            if (parsedData.tos && parsedData.tos.competencyBreakdown) {
                const roundedBreakdown = roundPercentagesToSum100(parsedData.tos.competencyBreakdown);
                parsedData.tos.competencyBreakdown = roundedBreakdown;

                const breakdown = parsedData.tos.competencyBreakdown;
                const calculatedTotalHours = breakdown.reduce((sum, row) => sum + Number(row.noOfHours || 0), 0);
                const calculatedTotalItems = breakdown.reduce((sum, row) => sum + Number(row.noOfItems || 0), 0);
                
                parsedData.tos.totalRow = {
                    ...parsedData.tos.totalRow,
                    hours: String(calculatedTotalHours),
                    weightPercentage: "100%",
                    noOfItems: calculatedTotalItems, 
                };

                if (calculatedTotalItems !== totalConfiguredItems) {
                    console.warn(`AI generated ${calculatedTotalItems} items, but user configured ${totalConfiguredItems}. The displayed total will reflect what was generated.`);
                }
            }

            setPreviewData(parsedData);
            showToast("Exam and TOS generated successfully!", "success");
        } catch (err) {
            console.error("Generation error:", err);
            showToast(`Failed to generate exam: ${err.message}`, "error", 15000);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!previewData) {
            showToast("No exam data to save.", "error");
            return;
        }
        
        if (!unitId || !subjectId) {
            showToast("Save failed: Destination Unit ID or Subject ID is missing.", "error", 8000);
            console.error("Save Error: The component was not invoked with a valid 'unitId' and 'subjectId' prop.");
            return;
        }

        setIsSaving(true);
        showToast("Saving Exam and TOS...", "info");

        try {
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
            showToast("Exam and TOS saved as a new lesson successfully!", "success");
            onClose();
        } catch (err) {
            console.error("Save error:", err);
            showToast(`Failed to save exam: ${err.message}`, "error", 8000);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-lg" />
            <Dialog.Panel
                className="relative bg-gray-50/80 backdrop-blur-xl border border-white/20 p-6 sm:p-8 rounded-3xl w-full max-w-5xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {(isGenerating || isSaving) && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col justify-center items-center z-50 rounded-3xl">
                        <InteractiveLoadingScreen
                            topic={selectedLessons.length > 0 ? selectedLessons.map(l => l.title).join(', ') : "new ideas"}
                            isSaving={isSaving}
                            lessonProgress={{ current: 1, total: 1 }}
                        />
                    </div>
                )}
                <div className="flex justify-between items-start pb-5 border-b border-gray-900/10 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg flex-shrink-0">
                            <ClipboardDocumentListIcon className="h-7 w-7" />
                        </div>
                        <div>
                            <Dialog.Title className="text-2xl font-semibold text-gray-900">Exam & TOS Generator</Dialog.Title>
                            <p className="text-sm text-gray-600">Create a comprehensive exam and its Table of Specifications.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 bg-gray-200/50 hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="py-6 space-y-6 flex-1 overflow-y-auto -mr-3 pr-3">
                    {!previewData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="p-5 bg-white/70 rounded-2xl">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Exam Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor="totalItemsDisplay" className="block text-sm font-medium text-gray-600">Total Number of Items</label>
                                            <div id="totalItemsDisplay" className="mt-1.5 block w-full px-4 py-2.5 bg-gray-100 border-gray-200 rounded-xl text-gray-800 font-medium sm:text-sm">
                                                {totalConfiguredItems}
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label htmlFor="totalHours" className="block text-sm font-medium text-gray-600">Total Hours Spent</label>
                                            <input id="totalHours" type="number" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} className="mt-1.5 block w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., 10" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label htmlFor="language" className="block text-sm font-medium text-gray-600">Language</label>
                                            <select id="language" value={language} onChange={e => setLanguage(e.target.value)} className="mt-1.5 block w-full pl-4 pr-10 py-2.5 text-base bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl">
                                                <option>English</option>
                                                <option>Filipino</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 bg-white/70 rounded-2xl">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Source Content Selection</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="learningCompetencies" className="block text-sm font-medium text-gray-600 mb-1.5">Learning Competencies</label>
                                            <textarea id="learningCompetencies" rows="4" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className="block w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Enter learning competencies, one per line." ></textarea>
                                        </div>
                                        <CourseSelector onCourseSelect={setSelectedCourse} />
                                        {selectedCourse && (
                                            <LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="p-5 bg-white/70 rounded-2xl h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800">Test Structure</h3>
                                            <p className="text-sm text-gray-500">Define the types of tests for the exam.</p>
                                        </div>
                                        <button onClick={addTestType} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                                            <PlusIcon className="w-5 h-5"/>
                                            <span>Add</span>
                                        </button>
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        {testTypes.map((test, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 rounded-xl bg-gray-100">
                                                <div className="flex-1">
                                                    <select value={test.type} onChange={e => handleTestTypeChange(index, 'type', e.target.value)} className="w-full text-sm bg-white/0 border-none rounded-md focus:ring-0">
                                                        <option>Multiple Choice</option>
                                                        <option>Simple Recall</option>
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
                                                    <input id={`range-${index}`} type="text" value={test.range} onChange={e => handleTestTypeChange(index, 'range', e.target.value)} placeholder="Number Range (e.g., 1-10)" className="w-full px-3 py-1.5 text-sm bg-white rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"/>
                                                </div>
                                                <button onClick={() => removeTestType(index)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {totalConfiguredItems === 0 && (
                                        <p className="text-red-600 text-sm mt-3 font-medium">Warning: Total items is 0.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold text-gray-800">Preview: {previewData?.examTitle || 'Generated Exam'}</h2>
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto border border-gray-900/10 rounded-2xl p-2 sm:p-5 bg-gray-100/50">
                                {isValidPreview ? (
                                    <>
                                        <div className="bg-white p-5 rounded-2xl shadow-sm">
                                            <h3 className="text-lg font-bold mb-3">Page 1: Table of Specifications (TOS)</h3>
                                            <TOSPreviewTable tos={previewData.tos} />
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl shadow-sm">
                                            <h3 className="text-lg font-bold mb-2">Page 2: Exam Questions</h3>
                                            {(() => {
                                                const groupedQuestions = {};
                                                previewData.examQuestions.forEach(q => {
                                                    if (!groupedQuestions[q.type]) {
                                                        groupedQuestions[q.type] = { instruction: q.instruction, passage: q.passage, questions: [] };
                                                    }
                                                    groupedQuestions[q.type].questions.push(q);
                                                });
                                                const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
                                                const t = translations[language] || translations['English'];

                                                return Object.entries(groupedQuestions).map(([type, data], typeIndex) => {
                                                    const typeHeader = t.test_types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                                    return (
                                                        <div key={type} className="mt-6">
                                                            <h4 className="text-md font-bold">{romanNumerals[typeIndex]}. {typeHeader}</h4>
                                                            {data.instruction && <p className="text-sm font-medium italic text-gray-600 my-2">{data.instruction}</p>}
                                                            {data.passage && <p className="text-sm text-gray-800 my-2 p-3 bg-gray-100 rounded-xl border border-gray-200">{data.passage}</p>}
                                                            <div className="space-y-5 mt-4">
                                                                {data.questions.map((q, index) => (
                                                                    <div key={index} className="pl-2">
                                                                        <p className="font-medium text-gray-800">{q.questionNumber}. {q.question}</p>
                                                                        {q.options && (
                                                                            <ul className="list-none mt-2 ml-8 text-sm space-y-1.5 text-gray-700">
                                                                                {q.options.map((option, optIndex) => <li key={optIndex}>{String.fromCharCode(97 + optIndex)}. {option}</li>)}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl shadow-sm">
                                            <h3 className="text-lg font-bold mb-3">Page 3: Answer Key</h3>
                                            <ul className="list-none space-y-2">
                                                {previewData.examQuestions.map((q, index) => (
                                                    <li key={index} className="text-sm">
                                                        <strong className="font-semibold text-gray-800">Question {q.questionNumber}:</strong> <span className="text-gray-700">{q.correctAnswer || (q.correctAnswers && Object.entries(q.correctAnswers).map(([key, val]) => `${key}-${val}`).join(', '))}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl shadow-sm">
                                            <h3 className="text-lg font-bold mb-3">Page 4: Explanations</h3>
                                            <ul className="list-none space-y-4">
                                                {previewData.examQuestions.filter(q => q.explanation || q.solution).map((q, index) => (
                                                    <li key={index} className="text-sm">
                                                        <strong className="font-semibold text-gray-800">Question {q.questionNumber}:</strong>
                                                        {q.explanation && <p className="ml-4 text-gray-700">Explanation: {q.explanation}</p>}
                                                        {q.solution && <p className="ml-4 text-gray-700">Solution: {q.solution}</p>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                ) : <p className="text-red-600 font-medium p-4">Could not generate a valid preview.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-5 border-t border-gray-900/10 flex-shrink-0 flex justify-end gap-3">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} disabled={isSaving} className="bg-gray-200 py-2.5 px-5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">Back to Edit</button>
                            <button onClick={handleSave} disabled={!isValidPreview || isSaving} className="inline-flex justify-center py-2.5 px-5 shadow-sm text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors">
                                {isSaving ? 'Saving...' : 'Accept & Save'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="bg-gray-200 py-2.5 px-5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="button" className="inline-flex justify-center py-2.5 px-5 shadow-sm text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors" onClick={handleGenerate} disabled={!isValidForGeneration || isGenerating}>
                                {isGenerating ? 'Generating...' : 'Generate Exam & TOS'}
                            </button>
                        </>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}