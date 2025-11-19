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

// --- Neumorphic Style Helpers ---
const inputBaseStyles = "block w-full text-sm bg-slate-200 dark:bg-neumorphic-base-dark rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:shadow-neumorphic-inset-dark focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-none dark:text-slate-100";
const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-neumorphic-base-dark";
const btnExtruded = `shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]
                   dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark`;
const btnDisabled = "disabled:opacity-60 disabled:text-slate-500 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:text-slate-600 dark:disabled:shadow-neumorphic-inset-dark";

// --- Helper Functions ---

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

const extractJson = (text) => {
    let match = text.match(/```json\s*([\sS]*?)\s*```/);
    if (!match) match = text.match(/```([\sS]*?)```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    throw new Error("AI response did not contain a valid JSON object.");
};

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
            console.error("Sanitization failed.", finalError);
            throw e;
        }
    }
};

const translations = {
    'English': {
        'multiple_choice': 'Instructions: Choose the letter of the correct answer.',
        'alternative_response': 'Instructions: Write "True" if the statement is correct and "False" if it is incorrect.',
        'matching-type': 'Instructions: Match the items in Column A with the corresponding items in Column B.',
        'identification': 'Instructions: Identify the correct term for each statement.',
        'essay': 'Instructions: Answer the following question comprehensively.',
        'solving': 'Instructions: Solve the following problem. Show your complete solution.',
        'analogy': 'Instructions: Complete the following analogies.',
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
            'solving': 'Problem Solving',
            'analogy': 'Analogy',
            'interpretive': 'Interpretive Analysis',
        }
    },
    'Filipino': {
        'multiple_choice': 'Panuto: Piliin ang titik ng tamang sagot.',
        'alternative_response': 'Panuto: Isulat ang "Tama" kung ang pahayag ay wasto at "Mali" kung ito ay di-wasto.',
        'matching-type': 'Panuto: Itugma ang mga aytem sa Hanay A sa mga aytem sa Hanay B.',
        'identification': 'Panuto: Tukuyin ang tamang termino para sa bawat pahayag.',
        'essay': 'Panuto: Sagutin ang sumusunod na tanong nang komprehensibo.',
        'solving': 'Panuto: Lutasin ang suliranin. Ipakita ang solusyon.',
        'analogy': 'Panuto: Kumpletuhin ang mga sumusunod na analohiya.',
        'interpretive': 'Panuto: Basahin ang talata at sagutin ang mga tanong.',
        'columnA': 'Hanay A',
        'columnB': 'Hanay B',
        'rubric': 'Rubrik',
        'test_types': {
            'multiple_choice': 'Pagsusulit na Pagpipilian',
            'alternative_response': 'Tama o Mali',
            'matching-type': 'Pagtutugma',
            'identification': 'Pagkilala',
            'essay': 'Sanaysay',
            'solving': 'Paglutas ng Suliranin',
            'analogy': 'Analohiya',
            'interpretive': 'Pagsusuring Interpretatibo',
        }
    }
};

const generateTosMarkdown = (tos) => {
    if (!tos || !Array.isArray(tos.competencyBreakdown)) return 'No Table of Specifications generated.';
    const header = tos.header;
    let markdown = `# ${header.examTitle}\n\n`;
    markdown += `**Subject:** ${header.subject}\n`;
    markdown += `**Grade Level:** ${header.gradeLevel}\n\n`;
    markdown += `### TABLE OF SPECIFICATIONS (TOS)\n\n`;
    const tableHeader = `| Objectives/Learning Competencies | No. of hours spent | Weight % | No. of Items | Easy (Rem/Und) 60% | Average (App/Ana) 30% | Difficult (Eva/Cre) 10% |\n`;
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
        if (!acc[type]) acc[type] = [];
        acc[type].push(q);
        return acc;
    }, {});

    let markdown = '';
    let typeCounter = 0;
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    for (const type in groupedQuestions) {
        if (groupedQuestions.hasOwnProperty(type)) {
            const questionsOfType = groupedQuestions[type];
            const typeHeader = t.test_types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
                    } else if (q.type === 'essay' && Array.isArray(q.rubric)) {
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
            const options = q.options || [];
            prompts.forEach((prompt, index) => {
                const correctOptionId = q.correctPairs[prompt.id];
                const correctOptionIndex = options.findIndex(opt => opt.id === correctOptionId);
                if (correctOptionIndex > -1) {
                    markdown += `**Question ${firstQuestionNumber + index}:** ${String.fromCharCode(97 + correctOptionIndex)}\n`;
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
        if (q.explanation) markdown += `**Question ${q.questionNumber}:** ${q.explanation}\n\n`;
        if (q.solution) markdown += `**Question ${q.questionNumber}:** ${q.solution}\n\n`;
    });
    return markdown;
};

// --- React Components ---

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
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-green-100/50 dark:bg-green-900/20 rounded-t-lg">Easy<br/><span className="text-[10px]">(Rem/Und)</span></th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-yellow-100/50 dark:bg-yellow-900/20 rounded-t-lg">Average<br/><span className="text-[10px]">(App/Ana)</span></th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-red-100/50 dark:bg-red-900/20 rounded-t-lg">Difficult<br/><span className="text-[10px]">(Eva/Cre)</span></th>
                </tr>
            </thead>
            <tbody>
                {tos?.competencyBreakdown?.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-slate-700">
                        <td className="px-3 py-4 whitespace-nowrap text-gray-800 dark:text-slate-200">{row.competency}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.noOfHours}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.weightPercentage}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center">{row.noOfItems}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center bg-green-50/50 dark:bg-green-900/10">{row.easyItems.itemNumbers}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center bg-yellow-50/50 dark:bg-yellow-900/10">{row.averageItems.itemNumbers}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 text-center bg-red-50/50 dark:bg-red-900/10">{row.difficultItems.itemNumbers}</td>
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

// --- ATOMIC GENERATION HELPERS (Upgraded for Academic Correctness) ---

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
        console.error("sanitizeJsonComponent error:", error.message);
        throw new Error(`The AI component response was not valid JSON.`);
    }
};

const getTosPlannerPrompt = (guideData) => {
    const { 
        learningCompetencies, language, totalHours, totalConfiguredItems, formattedTestStructure, selectedCourse, selectedLessons
    } = guideData;

    const examTitle = `Periodical Exam for ${selectedCourse?.title || 'Subject'}`;
    const subject = selectedCourse?.title || 'Not Specified';
    const gradeLevel = selectedCourse?.gradeLevel || 'Not Specified';
    const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');

    return `
    You are an expert Master Teacher and Curriculum Planner in the Philippines.
    Your task is to generate a **DepEd-compliant Table of Specifications (TOS)** in JSON format.
    
    **CONTEXT:**
    - **Subject:** ${subject} (${gradeLevel})
    - **Lessons Covered:** ${combinedLessonTitles}
    - **Competencies:** ${learningCompetencies}
    - **Total Items:** ${totalConfiguredItems}
    
    **CRITICAL INSTRUCTION (Revised Bloom's Taxonomy):**
    You MUST map the standard difficulty levels to Revised Bloom's Taxonomy (RBT) as follows:
    1.  **EASY (60%)**: Covers **Remembering** and **Understanding**.
    2.  **AVERAGE (30%)**: Covers **Applying** and **Analyzing**.
    3.  **DIFFICULT (10%)**: Covers **Evaluating** and **Creating**.

    **OUTPUT JSON STRUCTURE (Strict):**
    {
        "examTitle": "${examTitle}",
        "tos": {
            "header": { "examTitle": "${examTitle}", "subject": "${subject}", "gradeLevel": "${gradeLevel}" },
            "competencyBreakdown": [
                { "competency": "...", "noOfHours": 0, "weightPercentage": "...", "noOfItems": 0, "easyItems": { "count": 0, "itemNumbers": "..." }, "averageItems": { "count": 0, "itemNumbers": "..." }, "difficultItems": { "count": 0, "itemNumbers": "..." } }
            ],
            "totalRow": { "hours": "...", "weightPercentage": "100%", "noOfItems": ${totalConfiguredItems} }
        }
    }

    **RULES:**
    1.  **ITEM COUNT:** The total 'noOfItems' MUST equal ${totalConfiguredItems}. Use the Largest Remainder Method to handle rounding errors so the sum is exact.
    2.  **LANGUAGE:** ${language}.
    3.  **DISTRIBUTION:** Strictly adhere to the 60/30/10 distribution.
    4.  **ITEM PLACEMENT:** 'itemNumbers' strings should look like "1-5, 8" or "6-10". Ensure every number from 1 to ${totalConfiguredItems} appears exactly once across the table.
    `;
};

const getExamComponentPrompt = (guideData, generatedTos, testType) => {
    const { language, combinedContent } = guideData;
    const { type, numItems, range } = testType;
    const normalizedType = type.toLowerCase();
    const isSingleQuestionType = normalizedType.includes('essay') || normalizedType.includes('solving');
    const tosContext = JSON.stringify(generatedTos, null, 2);

    const styleGuide = `
    **ACADEMIC STYLE GUIDE (STRICT ADHERENCE REQUIRED):**
    1.  **NO "AI" TROPES:** Do not use phrases like "In the context of...", "Which of the following...", "As mentioned in the text...". Start the question directly.
    2.  **DISTRACTOR QUALITY:** For multiple choice, distractors must be **plausible**. They should represent common student misconceptions. Do NOT use obviously wrong or joke answers.
    3.  **GRAMMATICAL CONSISTENCY:** All options must logically and grammatically complete the stem.
    4.  **FORBIDDEN PHRASES:** Do NOT use "All of the above," "None of the above," or "A and B only".
    5.  **HOMOGENEITY (Matching Type):** If generating Matching Type, the lists must be homogeneous (e.g., all Inventors vs. Inventions). Do not mix concepts.
    `;

    return `
    You are a strict Academic Examiner. Generate exam questions for the section: **${type}**.

    **OUTPUT JSON (Strict):**
    {
        "questions": [
            { 
                "questionNumber": 1, // Match the range: ${range}
                "type": "...", 
                "instruction": "...", 
                "question": "...", 
                "options": ["A", "B", "C", "D"], // Only for MC. No prefixes like 'a.'.
                "correctAnswer": "...", // Full text of answer
                "explanation": "Academic explanation of why this is correct."
            }
        ]
    }

    **TASK:**
    - **Type:** ${type}
    - **Count:** ${numItems} item(s).
    - **Range:** Item numbers ${range}.
    - **Language:** ${language}.
    - **Source Material:** \`\`\`${combinedContent}\`\`\`

    ${styleGuide}

    **SPECIFIC INSTRUCTIONS:**
    1.  **CONTENT FIDELITY:** Questions must be answerable *solely* based on the Source Material, but should NOT explicitly reference the text (e.g., don't say "According to the paragraph"). Make them stand-alone academic questions.
    2.  **TOS ALIGNMENT:** Refer to the TOS below. If item #5 is marked as "Difficult (Evaluating)", question #5 MUST require evaluation/judgment, not just recall.
    
    **TOS CONTEXT:**
    ${tosContext}
    `;
};

const generateExamComponent = async (guideData, generatedTos, testType, isGenerationRunningRef, maxRetries = 3) => {
    const prompt = getExamComponentPrompt(guideData, generatedTos, testType);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

        try {
            const aiResponse = await callGeminiWithLimitCheck(prompt);
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");
            
            const jsonData = sanitizeJsonComponent(aiResponse);
            
            await new Promise(res => setTimeout(res, 1500)); // Throttling
            
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");
            return jsonData;

        } catch (error) {
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");
            console.warn(`Attempt ${attempt + 1} failed for ${testType.type}: ${error.message}`);
            if (attempt === maxRetries - 1) throw new Error(`Failed to generate ${testType.type}.`);
            await new Promise(res => setTimeout(res, 4000));
        }
    }
};

// --- Main Component ---

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

    const isGenerationRunning = useRef(false);

    useEffect(() => {
        return () => { isGenerationRunning.current = false; };
    }, []);

    const handleClose = useCallback(() => {
        isGenerationRunning.current = false;
        onClose();
    }, [onClose]);

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
        isGenerationRunning.current = true;
        setPreviewData(null);

        const combinedContent = selectedLessons.flatMap(lesson => lesson.pages?.map(page => page.content) || []).join('\n\n');
        const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');
        const formattedTestStructure = testTypes.map(tt => `${tt.type}: ${tt.numItems} items (Range: ${tt.range})`).join('; ');

        const guideData = {
            learningCompetencies, language, totalHours, totalConfiguredItems, formattedTestStructure,
            selectedCourse, selectedLessons, combinedContent, combinedLessonTitles
        };

        let generatedTos = null;
        let allGeneratedQuestions = [];

        try {
            // 1. TOS Planner
            showToast("Designing Table of Specifications...", "info", 8000);
            const tosPrompt = getTosPlannerPrompt(guideData);
            if (!isGenerationRunning.current) return;
            
            const tosResponse = await callGeminiWithLimitCheck(tosPrompt);
            if (!isGenerationRunning.current) return;
            
            const parsedTosData = tryParseJson(extractJson(tosResponse));
            
            if (parsedTosData.tos && parsedTosData.tos.competencyBreakdown) {
                 // Recalculate totals to ensure UI consistency
                 const breakdown = parsedTosData.tos.competencyBreakdown;
                 const calculatedTotalItems = breakdown.reduce((sum, row) => sum + Number(row.noOfItems || 0), 0);
                 parsedTosData.tos.totalRow.noOfItems = calculatedTotalItems;
                 
                 generatedTos = parsedTosData.tos;
                 setPreviewData({ examTitle: parsedTosData.examTitle, tos: generatedTos, examQuestions: [] });
            } else {
                throw new Error("Invalid TOS structure received.");
            }

            // 2. Micro-Workers
            for (const testType of testTypes) {
                if (!isGenerationRunning.current) return;
                if (testType.numItems === 0) continue;

                showToast(`Writing ${testType.type} questions...`, "info", 5000);
                const componentData = await generateExamComponent(guideData, generatedTos, testType, isGenerationRunning);
                
                if (componentData && componentData.questions) {
                    allGeneratedQuestions.push(...componentData.questions);
                    setPreviewData(prev => ({ ...prev, examQuestions: [...allGeneratedQuestions] }));
                }
            }

            showToast("Exam generated successfully!", "success");

        } catch (err) {
            if (err.message && err.message.includes("aborted")) {
                console.log("Aborted.");
            } else {
                console.error(err);
                showToast("Generation failed. Please try again.", "error");
            }
        } finally {
            setIsGenerating(false);
            isGenerationRunning.current = false;
        }
    };

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
        const uniqueQuestions = [];
        const seenGroupableTypes = new Set();
        for (const q of previewData.examQuestions) {
            const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');
            const isGroupable = normalizedType.includes('matching') || normalizedType.includes('identification');
            if (isGroupable) {
                if (!seenGroupableTypes.has(normalizedType)) {
                    uniqueQuestions.push(q);
                    seenGroupableTypes.add(normalizedType);
                }
            } else {
                uniqueQuestions.push(q);
            }
        }

        const quizQuestions = uniqueQuestions.map(q => {
            const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');
            const baseQuestion = {
                text: (normalizedType === 'interpretive' && q.passage) ? `${q.passage}\n\n${q.question}` : (q.question || 'Question text missing'),
                difficulty: 'average',
                explanation: q.explanation || ''
            };

            if (normalizedType.includes('multiple_choice') || normalizedType.includes('analogy')) {
                const options = q.options || [];
                const correctText = (q.correctAnswer || '').replace(/^[a-d]\.\s*/i, '').trim();
                const correctIndex = options.findIndex(opt => opt.trim() === correctText);
                if (options.length > 0 && correctIndex > -1) {
                    return { ...baseQuestion, type: 'multiple-choice', options: options.map(opt => ({ text: opt, isCorrect: opt.trim() === correctText })), correctAnswerIndex: correctIndex };
                }
            }
            if (normalizedType.includes('alternative')) {
                return { ...baseQuestion, type: 'true-false', correctAnswer: String(q.correctAnswer).toLowerCase().includes('true') || String(q.correctAnswer).toLowerCase().includes('tama') };
            }
            if (normalizedType.includes('identification') || normalizedType.includes('solving')) {
                return { ...baseQuestion, type: 'identification', correctAnswer: q.correctAnswer, choicesBox: q.choicesBox || null };
            }
            if (normalizedType.includes('matching')) {
                return { ...baseQuestion, type: 'matching-type', text: q.instruction || 'Match the items', prompts: q.prompts || [], options: q.options || [], correctPairs: q.correctPairs || {} };
            }
            if (normalizedType.includes('essay')) {
                return { ...baseQuestion, type: 'essay', rubric: q.rubric || [] };
            }
            return null;
        }).filter(Boolean);

        if (quizQuestions.length === 0) throw new Error("No compatible questions for interactive quiz.");

        const quizRef = doc(collection(db, 'quizzes'));
        await setDoc(quizRef, {
            title: `Quiz: ${previewData.examTitle}`,
            language, unitId, subjectId, lessonId: null,
            createdAt: serverTimestamp(), createdBy: 'AI', questions: quizQuestions
        });
    };

    const handleFinalSave = async (saveType) => {
        if (!previewData) return showToast("No exam data to save.", "error");
        setIsSaveOptionsOpen(false);
        setIsSaving(true);
        try {
            if (saveType === 'lesson') await saveAsLesson();
            else if (saveType === 'quiz') await saveAsQuiz();
            else if (saveType === 'both') { await saveAsLesson(); await saveAsQuiz(); }
            showToast("Saved successfully!", "success");
            handleClose();
        } catch (err) {
            console.error(err);
            showToast(`Save failed: ${err.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-lg dark:bg-black/80" />
            <Dialog.Panel className="relative bg-slate-200 dark:bg-neumorphic-base-dark shadow-2xl border border-white/20 dark:border-slate-700 p-6 sm:p-8 rounded-3xl w-full max-w-5xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                {(isGenerating || isSaving) && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-neumorphic-base-dark/80 backdrop-blur-md flex flex-col justify-center items-center z-50 rounded-3xl">
                        <InteractiveLoadingScreen topic={selectedLessons.length > 0 ? "Exam Content" : "New Exam"} isSaving={isSaving} lessonProgress={{ current: (previewData?.examQuestions?.length || 0), total: totalConfiguredItems }} />
                    </div>
                )}
                
                {/* Save Options Modal */}
                {isSaveOptionsOpen && (
                    <Dialog open={isSaveOptionsOpen} onClose={() => setIsSaveOptionsOpen(false)} className="relative z-[120]">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-sm rounded-3xl bg-slate-200 dark:bg-neumorphic-base-dark p-6 shadow-xl">
                                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-slate-100">Save Options</Dialog.Title>
                                <div className="mt-5 space-y-3">
                                    <button onClick={() => handleFinalSave('lesson')} className={`w-full text-left p-3 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors ${btnExtruded}`}>Viewable Lesson (Markdown)</button>
                                    <button onClick={() => handleFinalSave('quiz')} className={`w-full text-left p-3 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors ${btnExtruded}`}>Interactive Quiz</button>
                                    <button onClick={() => handleFinalSave('both')} className={`w-full text-left p-3 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors ${btnExtruded}`}>Save as Both</button>
                                </div>
                                <div className="mt-6 text-right">
                                     <button onClick={() => setIsSaveOptionsOpen(false)} className="text-sm font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900">Cancel</button>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </Dialog>
                )}

                <div className="flex justify-between items-start pb-5 border-b border-gray-900/10 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><ClipboardDocumentListIcon className="h-7 w-7" /></div>
                        <div>
                            <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Exam & TOS Generator</Dialog.Title>
                            <p className="text-sm text-gray-600 dark:text-slate-400">DepEd Compliant Assessment Builder</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className={`h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-neumorphic-base-dark ${btnExtruded}`}><XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
                </div>

                <div className="py-6 space-y-6 flex-1 overflow-y-auto -mr-3 pr-3">
                    {!previewData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="p-5 bg-slate-200 dark:bg-neumorphic-base-dark rounded-2xl shadow-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Total Items</label>
                                            <div className={`mt-1.5 ${inputBaseStyles} px-4 py-2.5 font-medium`}>{totalConfiguredItems}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Total Hours</label>
                                            <input type="number" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} className={`mt-1.5 ${inputBaseStyles} px-4 py-2.5`} placeholder="e.g., 40" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Language</label>
                                            <select value={language} onChange={e => setLanguage(e.target.value)} className={`mt-1.5 ${inputBaseStyles} px-4 py-2.5`}><option>English</option><option>Filipino</option></select>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-200 dark:bg-neumorphic-base-dark rounded-2xl shadow-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Content</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Competencies</label>
                                            <textarea rows="4" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className={`${inputBaseStyles} px-4 py-2.5`} placeholder="Enter competencies (e.g., 'analyzes the nature of...')" ></textarea>
                                        </div>
                                        <CourseSelector onCourseSelect={setSelectedCourse} />
                                        {selectedCourse && <LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} />}
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-slate-200 dark:bg-neumorphic-base-dark rounded-2xl shadow-lg flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Test Structure</h3>
                                    <button onClick={addTestType} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"><PlusIcon className="w-5 h-5"/> Add</button>
                                </div>
                                <div className="space-y-3 flex-1 overflow-y-auto">
                                    {testTypes.map((test, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-neumorphic-base-dark/50 border border-gray-200 dark:border-slate-700">
                                            <select value={test.type} onChange={e => handleTestTypeChange(index, 'type', e.target.value)} className="flex-1 text-sm bg-transparent border-none focus:ring-0 dark:text-slate-200">
                                                <option>Multiple Choice</option><option>Matching Type</option><option>Alternative Response</option><option>Identification</option><option>Solving</option><option>Essay</option><option>Analogy</option><option>Interpretive</option>
                                            </select>
                                            <input type="text" value={test.range} onChange={e => handleTestTypeChange(index, 'range', e.target.value)} placeholder="Range (e.g. 1-10)" className="flex-1 text-sm bg-transparent border-none focus:ring-0 dark:text-slate-200" />
                                            <button onClick={() => removeTestType(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // --- RICH VISUAL PREVIEW RESTORED ---
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Preview: {previewData?.examTitle || 'Generated Exam'}</h2>
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto border border-gray-900/10 dark:border-slate-700 rounded-2xl p-2 sm:p-5 bg-gray-100/50 dark:bg-neumorphic-base-dark/30 dark:shadow-neumorphic-inset-dark">
                                {previewData.tos ? (
                                    <>
                                        <div className="bg-white dark:bg-neumorphic-base-dark p-5 rounded-2xl shadow-sm dark:shadow-lg">
                                            <h3 className="text-lg font-bold mb-3 dark:text-slate-100">Page 1: Table of Specifications (TOS)</h3>
                                            <TOSPreviewTable tos={previewData.tos} />
                                        </div>
                                        
                                        {previewData.examQuestions && previewData.examQuestions.length > 0 && (
                                            <>
                                                <div className="bg-white dark:bg-neumorphic-base-dark p-5 rounded-2xl shadow-sm dark:shadow-lg">
                                                    <h3 className="text-lg font-bold mb-2 dark:text-slate-100">Page 2: Exam Questions</h3>
                                                    {(() => {
                                                        const groupedQuestions = previewData.examQuestions.reduce((acc, q) => {
                                                            const type = q.type || 'unknown';
                                                            if (!acc[type]) {
                                                                acc[type] = {
                                                                    instruction: q.instruction,
                                                                    passage: q.passage,
                                                                    choicesBox: q.choicesBox,
                                                                    questions: []
                                                                };
                                                            }
                                                            acc[type].questions.push(q);
                                                            return acc;
                                                        }, {});

                                                        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
                                                        const t = translations[language] || translations['English'];

                                                        return Object.entries(groupedQuestions).map(([type, data], typeIndex) => {
                                                            const typeHeader = t.test_types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                                            return (
                                                                <div key={type} className="mt-6 first:mt-0">
                                                                    <h4 className="text-md font-bold dark:text-slate-200">{romanNumerals[typeIndex]}. {typeHeader}</h4>
                                                                    {data.instruction && <p className="text-sm font-medium italic text-gray-600 dark:text-slate-400 my-2">{data.instruction}</p>}
                                                                    {data.passage && <p className="text-sm text-gray-800 dark:text-slate-200 my-2 p-3 bg-gray-100 dark:bg-neumorphic-base-dark/50 rounded-xl border border-gray-200 dark:border-slate-700">{data.passage}</p>}

                                                                    {type === 'identification' && data.choicesBox && (
                                                                        <div className="text-center p-3 my-4 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-neumorphic-base-dark/50">
                                                                            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                                                                                {data.choicesBox.join('   •   ')}
                                                                            </p>
                                                                        </div>
                                                                    )}
                    
                                                                    <div className="space-y-5 mt-4">
                                                                        {type === 'matching-type' ? (
                                                                            (() => {
                                                                                const q = data.questions[0]; 
                                                                                if (!q || !q.prompts || !q.options) return null;
                                                                                return (
                                                                                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 pl-2">
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
                                                                            data.questions.map((q, index) => (
                                                                                <div key={index} className="pl-2">
                                                                                    <p className="font-medium text-gray-800 dark:text-slate-200">{q.questionNumber}. {q.question}</p>
                                                                                    {q.options && Array.isArray(q.options) && (
                                                                                        <ul className="list-none mt-2 ml-8 text-sm space-y-1.5 text-gray-700 dark:text-slate-300">
                                                                                            {q.options.map((option, optIndex) => (
                                                                                                <li key={optIndex}>{String.fromCharCode(97 + optIndex)}. {option}</li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    )}
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
                            <button onClick={() => setPreviewData(null)} className={`py-2.5 px-5 rounded-xl text-sm font-semibold ${btnExtruded} bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300`}>Back to Edit</button>
                            <button onClick={() => setIsSaveOptionsOpen(true)} className="py-2.5 px-5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 shadow-lg">Accept & Save</button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleClose} className={`py-2.5 px-5 rounded-xl text-sm font-semibold ${btnExtruded} bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300`}>Cancel</button>
                            <button onClick={handleGenerate} disabled={!isValidForGeneration || isGenerating} className="py-2.5 px-5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-lg disabled:opacity-50">
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                        </>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}