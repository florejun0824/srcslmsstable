import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, ClipboardDocumentListIcon, DocumentTextIcon, PuzzlePieceIcon, DocumentDuplicateIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { doc, collection, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
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
                            // MODIFICATION: Remove any prefixes like "a)" from the AI response before adding our own.
                            const optionText = option.trim().replace(/^[a-zA-Z][.)]\s*/, '');
                            markdown += `   ${String.fromCharCode(97 + index)}. ${optionText}\n`;
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

// ... (The rest of the helper functions: generateAnswerKeyMarkdown, generateExplanationsMarkdown, TOSPreviewTable, etc. remain unchanged)
const generateAnswerKeyMarkdown = (questions) => {
    if (!questions || questions.length === 0) return 'No answer key generated.';
    let markdown = `### Answer Key\n\n`;
    questions.forEach((q) => {
        if (q.type === 'matching-type') {
            const firstQuestionNumber = q.questionNumber;
            const prompts = q.prompts || [];
            prompts.forEach((prompt, index) => {
                const correctOptionId = q.correctPairs[prompt.id];
                const correctOption = q.options.find(opt => opt.id === correctOptionId);
                const correctOptionIndex = q.options.findIndex(opt => opt.id === correctOptionId);
                markdown += `**Question ${firstQuestionNumber + index}:** ${String.fromCharCode(97 + correctOptionIndex)}. ${correctOption.text}\n`;
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
    const [isSaveOptionsOpen, setIsSaveOptionsOpen] = useState(false);

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

		    // MODIFICATION: Added stronger rules to enforce item count and test structure.
		    const prompt = `You are an expert educational assessment creator. Your task is to generate a comprehensive exam and a detailed Table of Specifications (TOS) in a single JSON object based on the provided data.

		**PRIMARY DIRECTIVE: YOUR ENTRA RESPONSE MUST BE A SINGLE, VALID JSON OBJECT. NO OTHER TEXT SHOULD BE PRESENT.**
		---
		**OUTPUT JSON STRUCTURE (Strict):**
		{
		    "examTitle": "...",
		    "tos": {
		        "header": { "examTitle": "...", "subject": "...", "gradeLevel": "..." },
		        "competencyBreakdown": [
		            { "competency": "...", "noOfHours": 0, "weightPercentage": "...", "noOfItems": 0, "easyItems": { "count": 0, "itemNumbers": "..." }, "averageItems": { "count": 0, "itemNumbers": "..." }, "difficultItems": { "count": 0, "itemNumbers": "..." } }
		        ],
		        "totalRow": { "hours": "...", "weightPercentage": "...", "noOfItems": 0 }
		    },
		    "examQuestions": [
		        { 
		            "questionNumber": 1, 
		            "type": "multiple_choice", 
		            "instruction": "...", 
		            "question": "...", 
		            "options": ["..."], 
		            "correctAnswer": "...", 
		            "explanation": "...", 
		            "difficulty": "Easy", 
		            "bloomLevel": "Remembering"
		        },
		        // ... other structure examples
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
		1.  **TOTAL ITEMS ADHERENCE:** The total number of items generated MUST EXACTLY MATCH the 'Total Items' value provided in the INPUT DATA. The 'noOfItems' in the TOS 'totalRow' and the total count of questions in the 'examQuestions' array MUST equal this number. This is the highest priority rule.
		2.  **TEST STRUCTURE ADHERENCE:** You MUST generate the exact test types and the exact number of items for each type as specified in the 'Test Structure' input. DO NOT add, omit, or change the specified test types or their respective item counts.
		3.  **TOS COMPETENCIES:** You MUST use the exact learning competencies provided in the "INPUT DATA" for the \`competencyBreakdown\`.
		4.  **ITEM CALCULATION:** Calculate 'noOfItems' in the TOS using: \`(weightPercentage / 100) * Total Items\`, then adjust rounded numbers to sum to the 'Total Items' using the Largest Remainder Method.
		5.  **LANGUAGE:** ALL generated text MUST be in the specified language: **${language}**.
		6.  **DIFFICULTY DISTRIBUTION:** Strictly adhere to Easy: 60%, Average: 30%, Difficult: 10%.
		7.  **TOS VERTICAL DISTRIBUTION:** Distribute each competency's 'No. of Items' across 'Easy', 'Average', and 'Difficult' columns, following the 60-30-10 ratio.
		8.  **MULTIPLE CHOICE OPTIONS:** The 'options' array MUST contain the option text ONLY. DO NOT include prefixes like "a)", "b)", or bullet points.
		9.  **ESSAY:** If "Essay" is included, generate EXACTLY ONE single-prompt question. The number range corresponds to the total points for its rubric.
		10. **ESSAY in TOS:** Place the essay's entire item number range in the 'difficultItems' column.
		11. **IDENTIFICATION:** Group all items. Generate a single \`choicesBox\` with all answers plus ONE distractor. The "question" field MUST be a descriptive statement, not a question.
		12. **MATCHING TYPE (STRICT):** If 'Matching Type' is requested, you MUST use the \`"type": "matching-type"\` format.
		    - Create a \`prompts\` array for Column A and an \`options\` array for Column B. Each item in both arrays MUST be an object with a unique \`id\` and \`text\`.
		    - Add at least ONE extra distractor item to the \`options\` array.
		    - Create a \`correctPairs\` object that maps the prompt \`id\` to the correct option \`id\`.
		    - The entire matching test for a given number range must be a SINGLE JSON object in the \`examQuestions\` array.
		13. **TOS & NUMBERING:** For Matching Types, the 'itemNumbers' in the TOS must be a sequential list (e.g., "11-15").
		14. **CONTENT ADHERENCE & TOPIC FIDELITY:** All questions, options, and explanations MUST be derived STRICTLY and SOLELY from the provided **Lesson Content**. DO NOT generate meta-questions about educational theories, Bloom's Taxonomy, or the process of assessment itself. The quiz must test the student on the lesson material, not on pedagogical concepts. **YOU MUST NOT** use any phrases that refer back to the source material. It is forbidden to use text like "According to the lesson," "Based on the topic," "As mentioned in the content," or any similar citations. The questions must stand on their own, as if in a real exam.
		15. **BLOOM'S LEVEL FIELD:** The "bloomLevel" field is for classification purposes only. Use it to label the cognitive skill required to answer the question you generated (e.g., Remembering, Applying). DO NOT create questions that ask the student to identify a Bloom's Taxonomy level.
		`;
		    try {
		        const aiResponse = await callGeminiWithLimitCheck(prompt);
		        const jsonText = extractJson(aiResponse);
		        const parsedData = tryParseJson(jsonText);
        
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
		                // --- START: FIX ---
		                console.warn(`AI generated ${calculatedTotalItems} items, but user configured ${totalConfiguredItems}. The displayed total will reflect what was generated.`);
		                // You could optionally show a toast message here as well.
		                showToast(`Warning: AI generated ${calculatedTotalItems} items, but ${totalConfiguredItems} were requested.`, "warning", 6000);
		                // --- END: FIX ---
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
    
    // ... (The rest of the component: saveAsLesson, saveAsQuiz, handleFinalSave, and the return/JSX part, all remain unchanged)
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
            
	                // --- START: FIX ---
	                // Handle 'interpretive' type which may have a passage to prepend.
	                const questionText = (normalizedType === 'interpretive' && q.passage)
	                    ? `${q.passage}\n\n${q.question || ''}`
	                    : (q.question || 'Missing question text from AI.');
	                // --- END: FIX ---

		            const baseQuestion = {
		                text: questionText, // Use the potentially modified text
		                difficulty: q.difficulty || 'easy',
		                explanation: q.explanation || '',
		            };

	                // --- START: FIX ---
	                // Group multiple-choice, analogy, and interpretive types together as they share the same structure.
		            if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
	                // --- END: FIX ---
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
	                // --- START: FIX ---
	                // Group identification and solving types together as they require a typed answer.
		            if (normalizedType === 'identification' || normalizedType === 'solving') {
	                // --- END: FIX ---
		                if (q.correctAnswer) {
		                    return {
		                        ...baseQuestion,
		                        type: 'identification', // Standardize 'solving' to 'identification' for the quiz component
		                        correctAnswer: q.correctAnswer,
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
		            // Any unhandled types (like 'essay') will return null and be filtered out.
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
                // When saving both, wrap the quiz saving in its own try-catch
                // to allow the lesson to save even if the quiz fails.
                await saveAsLesson();
                try {
                    await saveAsQuiz();
                    showToast("Saved as both a lesson and a quiz!", "success");
                } catch (quizError) {
                    console.error("Quiz save error:", quizError);
                    showToast(`Lesson saved, but quiz failed: ${quizError.message}`, "warning", 8000);
                }
            }
            onClose();
        } catch (err) {
            console.error("Save error:", err);
            showToast(`Failed to save: ${err.message}`, "error", 8000);
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
                {isSaveOptionsOpen && (
                    <Dialog open={isSaveOptionsOpen} onClose={() => setIsSaveOptionsOpen(false)} className="relative z-[120]">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-sm rounded-3xl bg-white/90 backdrop-blur-xl p-6 shadow-2xl">
                                <Dialog.Title className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                   <DocumentArrowDownIcon className="w-7 h-7 text-blue-600"/>
                                   Save Options
                                </Dialog.Title>
                                <p className="text-sm text-gray-600 mt-2">How would you like to save the generated exam content?</p>
                                <div className="mt-5 space-y-3">
                                    <button onClick={() => handleFinalSave('lesson')} className="w-full flex items-center gap-4 text-left p-3 rounded-xl hover:bg-gray-200 transition-colors">
                                        <DocumentTextIcon className="w-8 h-8 text-green-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-800">Viewable Lesson</p>
                                            <p className="text-xs text-gray-500">Saves TOS, questions, and answers as markdown pages.</p>
                                        </div>
                                    </button>
                                     <button onClick={() => handleFinalSave('quiz')} className="w-full flex items-center gap-4 text-left p-3 rounded-xl hover:bg-gray-200 transition-colors">
                                        <PuzzlePieceIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-800">Interactive Quiz</p>
                                            <p className="text-xs text-gray-500">Saves compatible questions as a playable quiz.</p>
                                        </div>
                                    </button>
                                     <button onClick={() => handleFinalSave('both')} className="w-full flex items-center gap-4 text-left p-3 rounded-xl hover:bg-gray-200 transition-colors">
                                        <DocumentDuplicateIcon className="w-8 h-8 text-sky-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-800">Both Lesson and Quiz</p>
                                            <p className="text-xs text-gray-500">Creates both a viewable lesson and an interactive quiz.</p>
                                        </div>
                                    </button>
                                </div>
                                <div className="mt-6 text-right">
                                     <button onClick={() => setIsSaveOptionsOpen(false)} className="bg-gray-200 py-2 px-4 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-300">Cancel</button>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </Dialog>
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
								                    <h4 className="text-md font-bold">{romanNumerals[typeIndex]}. {typeHeader}</h4>
								                    {data.instruction && <p className="text-sm font-medium italic text-gray-600 my-2">{data.instruction}</p>}
								                    {data.passage && <p className="text-sm text-gray-800 my-2 p-3 bg-gray-100 rounded-xl border border-gray-200">{data.passage}</p>}

								                    {/* Special box for Identification choices */}
								                    {type === 'identification' && data.choicesBox && (
								                        <div className="text-center p-3 my-4 border border-gray-300 rounded-xl bg-gray-50/50">
								                            <p className="text-sm font-semibold text-gray-700">
								                                {data.choicesBox.join('   •   ')}
								                            </p>
								                        </div>
								                    )}
                    
								                    <div className="space-y-5 mt-4">
								                        {/* --- START: FIX --- */}
								                        {/* Special two-column layout for Matching Type */}
								                        {type === 'matching-type' ? (
								                            (() => {
								                                const q = data.questions[0]; // Matching type data is in a single question object
								                                if (!q || !q.prompts || !q.options) return null;

								                                return (
								                                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 pl-2">
								                                        {/* Column A: Prompts */}
								                                        <div className="flex-1">
								                                            <p className="font-semibold text-gray-800 mb-2">{t.columnA}</p>
								                                            <ul className="list-none space-y-2 text-sm text-gray-700">
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
								                                            <p className="font-semibold text-gray-800 mb-2">{t.columnB}</p>
								                                            <ul className="list-none space-y-2 text-sm text-gray-700">
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
								                                    <p className="font-medium text-gray-800">{q.questionNumber}. {q.question}</p>
                                    
								                                    {/* For Multiple Choice, Analogy, etc. */}
								                                    {q.options && Array.isArray(q.options) && (
								                                        <ul className="list-none mt-2 ml-8 text-sm space-y-1.5 text-gray-700">
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
								                        {/* --- END: FIX --- */}
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
                            <button onClick={() => setIsSaveOptionsOpen(true)} disabled={!isValidPreview || isSaving} className="inline-flex justify-center py-2.5 px-5 shadow-sm text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors">
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
