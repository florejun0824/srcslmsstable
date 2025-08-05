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

// A reusable input field component for this form
const FormInput = ({ label, id, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input id={id} {...props} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
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

const translations = {
    'English': {
        'multiple_choice': 'Instructions: Choose the letter of the best answer.',
        'alternative_response': 'Instructions: Read and understand each statement. Write "True" if the statement is correct and "False" if it is incorrect.',
        'matching_type_v2': 'Instructions: Match the items in Column A with the corresponding items in Column B. Write the letter of the correct answer in Column C.',
        'identification': 'Instructions: Provide the correct answer on the space provided.',
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
        'identification': 'Panuto: Ibigay ang tamang sagot sa nakalaang puwang.',
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

            if (type === 'matching_type_v2') {
                markdown += `|${t.columnA}|${t.columnB}|${t.columnC}|\n`;
                markdown += `|---|---|---|\n`;

                const allColumnA = questionsOfType.flatMap(q => q.columnA || []);
                const allColumnB = questionsOfType.flatMap(q => q.columnB || []);
                const firstQuestionNumber = questionsOfType[0].questionNumber;

                const maxRows = Math.max(allColumnA.length, allColumnB.length);
                for (let i = 0; i < maxRows; i++) {
                    const colAItem = allColumnA[i] ? `${firstQuestionNumber + i}. ${allColumnA[i]}` : '';
                    const colBItem = allColumnB[i] ? `${String.fromCharCode(97 + i)}. ${allColumnB[i]}` : '';
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
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h3 className="text-lg font-bold text-gray-800 text-center mb-1">{tos?.header?.examTitle}</h3>
            <p className="text-center text-gray-600">{tos?.header?.subject}</p>
            <p className="text-center text-gray-600">{tos?.header?.gradeLevel}</p>
            <h4 className="font-semibold text-gray-800 text-center text-xl mb-4">TABLE OF SPECIFICATIONS (TOS)</h4>
        </div>
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Objectives/Learning Competencies</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">No. of hours spent</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Weight percentage</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">No. of Items</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Easy<br/>(Knowledge) Nos.</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Average<br/>(Comprehension) Nos.</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Difficult<br/>(Application) Nos.</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {tos?.competencyBreakdown?.map((row, index) => (
                    <tr key={index}>
                        <td className="px-2 py-4 whitespace-nowrap text-gray-700 border-r border-gray-200">{row.competency}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-gray-700 border-r border-gray-200 text-center">{row.noOfHours}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-gray-700 border-r border-gray-200 text-center">{row.weightPercentage}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-gray-700 border-r border-gray-200 text-center">{row.noOfItems}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-gray-700 border-r border-gray-200 text-center">{row.easyItems.itemNumbers}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-gray-700 border-r border-gray-200 text-center">{row.averageItems.itemNumbers}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-gray-700 text-center">{row.difficultItems.itemNumbers}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
                <tr>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-800 border-r border-gray-200">TOTAL</td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-800 border-r border-gray-200 text-center">{tos?.totalRow?.hours}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-800 border-r border-gray-200 text-center">{tos?.totalRow?.weightPercentage}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-800 border-r border-gray-200 text-center">{tos?.totalRow?.noOfItems}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-800 border-r border-gray-200 text-center"></td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-800 border-r border-gray-200 text-center"></td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-800 text-center"></td>
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
            { "questionNumber": 11, "type": "analogy", "instruction": "...", "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "explanation": "...", "difficulty": "Easy", "bloomLevel": "Remembering" },
	        { "questionNumber": 11, "type": "matching_type_v2", "instruction": "...", "columnA": ["...", "..."], "columnB": ["...", "..."], "correctAnswers": {"A": "1", "B": "2"}, "difficulty": "Average", "bloomLevel": "Understanding" },
            { "questionNumber": 21, "type": "interpretive", "instruction": "...", "passage": "...", "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "explanation": "...", "difficulty": "Average", "bloomLevel": "Analyzing" },
	        { "questionNumber": 21, "type": "alternative_response", "instruction": "${alternativeResponseInstruction}", "question": "...", "correctAnswer": "True", "explanation": "...", "difficulty": "Easy", "bloomLevel": "Remembering" },
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
	
	1. **LANGUAGE:** ALL generated text (instructions, questions, options, rubrics, explanations, etc.) MUST be in the specified language: **${language}**. This includes translating test type concepts (e.g., 'Multiple Choice' becomes 'Maraming Pagpipilian' if language is Filipino).
	
	2. **DIFFICULTY DISTRIBUTION (STRICT):** You must strictly adhere to the following percentages for the total number of items:
	    - Easy: 60% of 'Total Items'.
	    - Average: 30% of 'Total Items'.
	    - Difficult: 10% of 'Total Items'.
	    
	    If the calculation results in a non-whole number, you must round down. Any remaining items must be added to the 'Easy' category to ensure the total number of items matches 'Total Items'.
	
	3. **MULTIPLE-CHOICE & ANALOGY OPTION ORDERING (MANDATORY):** For ALL 'multiple_choice' and 'analogy' questions, you MUST order the strings within the "options" array based on the following logic. This is a strict requirement.
	    * **Pyramid Style (Shortest to Longest):** If choices are sentences or phrases, you MUST order them from SHORTEST to LONGEST based on character count. This rule **overrides** all other ordering.
	    * **Alphabetical:** Apply ONLY if choices are single words.
	    * **Numerical:** Apply ONLY if choices are numbers.
	    * **Chronological:** Apply ONLY if choices are dates.
	    * **EXAMPLE (Pyramid Style - Filipino):**
	        For the question, if the options are ["Ang pamilya", "Ang Diyos", "Upang mas lalo nating maramdaman ang Kanyang pagmamahal", "Ang ating sarili"], the correct order in the JSON's "options" array is:
	        ["Ang Diyos", "Ang pamilya", "Ang ating sarili", "Upang mas lalo nating maramdaman ang Kanyang pagmamahal"].
	        This is because "Ang Diyos" (9 chars) is shorter than "Ang pamilya" (11 chars), which is shorter than "Ang ating sarili" (16 chars), etc.
	
	4. **ESSAY QUESTION GENERATION (ABSOLUTE RULE):** If the test structure includes "Essay", you MUST generate **EXACTLY ONE (1)** single miss universe style essay question. The number range provided (e.g., '31-35') corresponds to the **TOTAL POINTS** for that single question's rubric (i.e., 5 points). DO NOT create multiple essay questions. The 'questionNumber' should be the start of the range (e.g., 31).
	
	5. **MATCHING TYPE:** Group ALL items for a matching type into a SINGLE question object. 'columnA' should contain the questions, and 'columnB' should contain the answers plus ONE extra distractor.
	
	6. **TOS & NUMBERING:**
	    * For Matching Types, the 'itemNumbers' in the TOS must be a sequential list (e.g., "11, 12, 13, 14, 15").
	    * For the single Essay question, assign its entire point value and number range (e.g., '31-35') to the 'difficultItems' column for the single most relevant competency.
	
	7. **CONTENT ADHERENCE:** All questions must be strictly based on the provided **Lesson Content**. Do not use external knowledge. Avoid phrases like "According to the lesson...".
	
	**Final Check:** Review your generated JSON for syntax errors (commas, quotes, brackets) before outputting.
	`;
	        try {
	            const aiResponse = await callGeminiWithLimitCheck(prompt);
	            const jsonText = extractJson(aiResponse);
	            const parsedData = tryParseJson(jsonText);
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
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-start justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <Dialog.Panel
                className="relative bg-gray-50 mt-10 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {(isGenerating || isSaving) && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-2xl">
                        <InteractiveLoadingScreen
                            topic={selectedLessons.length > 0 ? selectedLessons.map(l => l.title).join(', ') : "new ideas"}
                            isSaving={isSaving}
                            lessonProgress={{ current: 1, total: 1 }}
                        />
                    </div>
                )}
                <div className="flex justify-between items-start pb-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl text-white shadow-lg flex-shrink-0">
                            <ClipboardDocumentListIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <Dialog.Title className="text-xl sm:text-2xl font-bold text-gray-800">Exam & TOS Generator</Dialog.Title>
                            <p className="text-sm text-gray-500">Create a comprehensive exam and its Table of Specifications.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="py-6 space-y-6 flex-1 overflow-y-auto">
                    {!previewData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="p-4 border border-gray-200 rounded-lg bg-white">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Exam Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor="totalItemsDisplay" className="block text-sm font-medium text-gray-700">Total Number of Items</label>
                                            <div id="totalItemsDisplay" className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 sm:text-sm">
                                                {totalConfiguredItems}
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label htmlFor="totalHours" className="block text-sm font-medium text-gray-700">Total Hours Spent</label>
                                            <input
                                                id="totalHours"
                                                type="number"
                                                value={totalHours}
                                                onChange={(e) => setTotalHours(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                placeholder="e.g., 10"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                                            <select id="language" value={language} onChange={e => setLanguage(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                                <option>English</option>
                                                <option>Filipino</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border border-gray-200 rounded-lg bg-white">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Source Content Selection</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="learningCompetencies" className="block text-sm font-medium text-gray-700 mb-1">Learning Competencies</label>
                                            <textarea
                                                id="learningCompetencies"
                                                rows="4"
                                                value={learningCompetencies}
                                                onChange={(e) => setLearningCompetencies(e.target.value)}
                                                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                placeholder="Enter learning competencies, one per line."
                                            ></textarea>
                                        </div>
                                        <CourseSelector onCourseSelect={setSelectedCourse} />
                                        {selectedCourse && (
                                            <LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="p-4 border border-gray-200 rounded-lg bg-white h-full">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800">Test Structure</h3>
                                            <p className="text-sm text-gray-500">Define the types of tests to include in the exam.</p>
                                        </div>
                                        <button onClick={addTestType} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                            <PlusIcon className="w-5 h-5"/>
                                            <span>Add Type</span>
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {testTypes.map((test, index) => {
                                            return (
                                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 border">
                                                    <div className="col-span-12 md:col-span-5">
                                                        <select value={test.type} onChange={e => handleTestTypeChange(index, 'type', e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
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
                                                    <div className="col-span-12 md:col-span-6">
                                                        <FormInput id={`range-${index}`} type="text" value={test.range} onChange={e => handleTestTypeChange(index, 'range', e.target.value)} placeholder="Number Range (e.g., 1-10)" />
                                                    </div>
                                                    <div className="col-span-12 md-col-span-1 flex justify-end">
                                                        <button onClick={() => removeTestType(index)} className="text-red-500 hover:text-red-700 p-1">
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {totalConfiguredItems === 0 && (
                                        <p className="text-red-600 text-sm mt-3">Warning: Total number of items is currently 0.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-700">Preview: {previewData?.examTitle || 'Generated Exam'}</h2>
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto border rounded-lg p-2 sm:p-4 bg-slate-100">
                                {isValidPreview ? (
                                    <>
                                        {/* Page 1 Preview */}
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <h3 className="text-lg font-bold mb-2">Page 1: Table of Specifications (TOS)</h3>
                                            <TOSPreviewTable tos={previewData.tos} />
                                        </div>

                                        {/* Page 2 Preview */}
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
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
                                                            {data.instruction && <p className="text-sm font-semibold italic text-gray-600 my-2">{data.instruction}</p>}
                                                            {data.passage && <p className="text-sm text-gray-800 italic my-2 p-3 bg-gray-100 rounded-md border border-gray-200">{data.passage}</p>}
                                                            <ol className="list-inside space-y-4">
                                                                {data.questions.map((q, index) => (
                                                                    <li key={index} className="pl-2">
                                                                        <p className="font-medium mt-1">{q.questionNumber}. {q.question}</p>
                                                                        {q.options && (
                                                                            <ul className="list-none mt-1 ml-8 text-sm space-y-1">
                                                                                {q.options.map((option, optIndex) => <li key={optIndex}>{String.fromCharCode(97 + optIndex)}. {option}</li>)}
                                                                            </ul>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>

                                        {/* Page 3 Preview */}
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <h3 className="text-lg font-bold mb-2">Page 3: Answer Key</h3>
                                            <ul className="list-none space-y-2">
                                                {previewData.examQuestions.map((q, index) => (
                                                    <li key={index} className="text-sm">
                                                        <strong>Question {q.questionNumber}:</strong> {q.correctAnswer || (q.correctAnswers && Object.entries(q.correctAnswers).map(([key, val]) => `${key}-${val}`).join(', '))}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Page 4 Preview */}
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <h3 className="text-lg font-bold mb-2">Page 4: Explanations</h3>
                                            <ul className="list-none space-y-4">
                                                {previewData.examQuestions.filter(q => q.explanation || q.solution).map((q, index) => (
                                                    <li key={index} className="text-sm">
                                                        <strong>Question {q.questionNumber}:</strong>
                                                        {q.explanation && <p className="ml-4 italic text-slate-600">Explanation: {q.explanation}</p>}
                                                        {q.solution && <p className="ml-4 italic text-slate-600">Solution: {q.solution}</p>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                ) : <p className="text-red-600">Could not generate a valid preview.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-5 border-t border-gray-200 flex-shrink-0 flex justify-end gap-3">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} disabled={isSaving} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Back to Edit</button>
                            <button onClick={handleSave} disabled={!isValidPreview || isSaving} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Accept & Save'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="button" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50" onClick={handleGenerate} disabled={!isValidForGeneration || isGenerating}>
                                {isGenerating ? 'Generating...' : 'Generate Exam & TOS'}
                            </button>
                        </>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}