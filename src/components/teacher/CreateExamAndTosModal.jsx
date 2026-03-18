import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import {
    XMarkIcon,
    PlusIcon,
    TrashIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    PuzzlePieceIcon,
    DocumentDuplicateIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { doc, collection, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import CourseSelector from './CourseSelector';
import LessonSelector from './LessonSelector';

// --- M3 Style Tokens ---
const inputBaseStyles = "block w-full text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[var(--monet-primary,#6366f1)] focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 transition-colors duration-200";
const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
const btnExtruded = `hover:shadow-md active:scale-[0.98]`;
const btnDisabled = "disabled:opacity-50 disabled:pointer-events-none";

// --- M3 THEME HELPER (Adapted for M3 surfaces) ---
const getThemeStyles = (overlay) => {
    const base = {
        modalBg: '', borderColor: '', innerPanelBg: '', inputBg: '', textColor: '', accentText: '',
        // M3 additions
        surfaceContainerLow: '', onSurface: '', onSurfaceVariant: '', outline: '', primary: '', primaryContainer: '', onPrimaryContainer: '',
    };
    switch (overlay) {
        case 'christmas':
            return { ...base, modalBg: '#0a1f15', borderColor: 'rgba(34,197,94,0.15)', innerPanelBg: 'rgba(20,83,45,0.25)', inputBg: 'rgba(0,0,0,0.2)', textColor: '#e2e8f0', accentText: '#86efac', surfaceContainerLow: '#0f291e', onSurface: '#e2e8f0', onSurfaceVariant: '#a7c4b8', outline: 'rgba(34,197,94,0.2)', primary: '#4ade80', primaryContainer: 'rgba(34,197,94,0.15)', onPrimaryContainer: '#86efac' };
        case 'valentines':
            return { ...base, modalBg: '#200810', borderColor: 'rgba(244,63,94,0.15)', innerPanelBg: 'rgba(80,7,36,0.25)', inputBg: 'rgba(0,0,0,0.2)', textColor: '#ffe4e6', accentText: '#fda4af', surfaceContainerLow: '#2a0a12', onSurface: '#ffe4e6', onSurfaceVariant: '#d4a0a8', outline: 'rgba(244,63,94,0.2)', primary: '#fb7185', primaryContainer: 'rgba(244,63,94,0.15)', onPrimaryContainer: '#fda4af' };
        case 'graduation':
            return { ...base, modalBg: '#151200', borderColor: 'rgba(234,179,8,0.15)', innerPanelBg: 'rgba(66,32,6,0.25)', inputBg: 'rgba(0,0,0,0.2)', textColor: '#fefce8', accentText: '#fde047', surfaceContainerLow: '#1a1600', onSurface: '#fefce8', onSurfaceVariant: '#d4c88a', outline: 'rgba(234,179,8,0.2)', primary: '#facc15', primaryContainer: 'rgba(234,179,8,0.15)', onPrimaryContainer: '#fde047' };
        case 'rainy':
            return { ...base, modalBg: '#0c1322', borderColor: 'rgba(56,189,248,0.15)', innerPanelBg: 'rgba(30,41,59,0.35)', inputBg: 'rgba(15,23,42,0.4)', textColor: '#f1f5f9', accentText: '#7dd3fc', surfaceContainerLow: '#0f172a', onSurface: '#f1f5f9', onSurfaceVariant: '#94a3b8', outline: 'rgba(56,189,248,0.2)', primary: '#38bdf8', primaryContainer: 'rgba(56,189,248,0.15)', onPrimaryContainer: '#7dd3fc' };
        case 'cyberpunk':
            return { ...base, modalBg: '#140828', borderColor: 'rgba(217,70,239,0.2)', innerPanelBg: 'rgba(46,16,101,0.25)', inputBg: 'rgba(0,0,0,0.3)', textColor: '#fae8ff', accentText: '#e879f9', surfaceContainerLow: '#180a2e', onSurface: '#fae8ff', onSurfaceVariant: '#c084b0', outline: 'rgba(217,70,239,0.25)', primary: '#d946ef', primaryContainer: 'rgba(217,70,239,0.15)', onPrimaryContainer: '#e879f9' };
        case 'spring':
            return { ...base, modalBg: '#22151a', borderColor: 'rgba(244,114,182,0.15)', innerPanelBg: 'rgba(80,20,40,0.2)', inputBg: 'rgba(0,0,0,0.15)', textColor: '#fce7f3', accentText: '#f9a8d4', surfaceContainerLow: '#2a1a1f', onSurface: '#fce7f3', onSurfaceVariant: '#c8a0b0', outline: 'rgba(244,114,182,0.2)', primary: '#f472b6', primaryContainer: 'rgba(244,114,182,0.15)', onPrimaryContainer: '#f9a8d4' };
        case 'space':
            return { ...base, modalBg: '#090d16', borderColor: 'rgba(99,102,241,0.15)', innerPanelBg: 'rgba(17,24,39,0.4)', inputBg: 'rgba(0,0,0,0.35)', textColor: '#e0e7ff', accentText: '#a5b4fc', surfaceContainerLow: '#0b0f19', onSurface: '#e0e7ff', onSurfaceVariant: '#94a0c8', outline: 'rgba(99,102,241,0.2)', primary: '#818cf8', primaryContainer: 'rgba(99,102,241,0.15)', onPrimaryContainer: '#a5b4fc' };
        case 'none':
        default:
            return { ...base, modalBg: '#ffffff', borderColor: 'rgba(0,0,0,0.06)', innerPanelBg: '#f8fafc', inputBg: '#ffffff', textColor: '#1e293b', accentText: '#64748b', surfaceContainerLow: '#f8fafc', onSurface: '#1e293b', onSurfaceVariant: '#475569', outline: 'rgba(0,0,0,0.08)', primary: '#6366f1', primaryContainer: 'rgba(99,102,241,0.1)', onPrimaryContainer: '#4338ca' };
    }
};

// --- UTILS & PARSERS ---

const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateItemsForRange = (rangeString) => {
    if (!rangeString) return 0;
    const ranges = rangeString.split(',').map(r => r.trim());
    let totalItems = 0;
    for (const range of ranges) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) totalItems += (end - start + 1);
        else if (!isNaN(start)) totalItems += 1;
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
    return text;
};

const tryParseJson = (jsonString) => {
    try {
        const sanitizedString = jsonString
            .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
            .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitizedString);
    } catch (e) {
        console.error("JSON Parse Error", e);
        throw new Error("Invalid JSON format from AI.");
    }
};

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

// --- MARKDOWN GENERATORS ---

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

            // --- FIX: Force Standard Instruction for Identification ---
            if (type === 'identification') {
                markdown += `${t['identification']}\n\n`;
            } else if (type === 'interpretive' && questionsOfType[0].passage) {
                markdown += `${questionsOfType[0].instruction || t[type]}\n\n`;
                markdown += `> ${questionsOfType[0].passage.replace(/\n/g, '\n> ')}\n\n`;
            } else {
                markdown += `${questionsOfType[0].instruction || t[type]}\n\n`;
            }

            if (type === 'identification') {
                // --- FIX: Handle [object Object] in Choices Box ---
                // We look at the first question to find the 'choicesBox' array
                const firstQ = questionsOfType[0];
                const choices = firstQ?.choicesBox;

                if (choices) {
                    let cleanChoices = [];
                    if (Array.isArray(choices)) {
                        // If it's an array of objects (e.g. {id: 1, text: "Answer"}), extract the text
                        cleanChoices = choices.map(c => {
                            if (typeof c === 'object' && c !== null) {
                                return c.text || c.value || c.answer || JSON.stringify(c);
                            }
                            return String(c);
                        });
                    } else {
                        // If it's a single string, wrap it
                        cleanChoices = [String(choices)];
                    }

                    // Render the box beautifully
                    const choicesMarkdown = cleanChoices.map(choice => `**${choice}**`).join(' &nbsp; &nbsp; • &nbsp; &nbsp; ');
                    markdown += `<div style="border: 1px solid #ccc; padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 15px; background-color: rgba(255,255,255,0.05);">\n${choicesMarkdown}\n</div>\n\n`;
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

// --- RESTORED: Detailed TOS Preview Table ---
const TOSPreviewTable = ({ tos, styles }) => (
    <div className="overflow-x-auto text-sm">
        <div className="p-5 rounded-[20px] mb-4 border" style={{ backgroundColor: styles.innerPanelBg, borderColor: styles.outline || styles.borderColor }}>
            <h3 className="text-lg font-semibold text-center" style={{ color: styles.onSurface || styles.textColor }}>{tos?.header?.examTitle}</h3>
            <p className="text-center text-sm mt-0.5" style={{ color: styles.onSurfaceVariant || styles.textColor, opacity: 0.8 }}>{tos?.header?.subject}</p>
            <p className="text-center text-sm" style={{ color: styles.onSurfaceVariant || styles.textColor, opacity: 0.8 }}>{tos?.header?.gradeLevel}</p>
            <h4 className="font-medium text-center mt-2 text-xs tracking-widest uppercase" style={{ color: styles.primary || styles.accentText }}>Table of Specifications</h4>
        </div>
        <div className="rounded-[16px] overflow-hidden border" style={{ borderColor: styles.outline || styles.borderColor }}>
            <table className="min-w-full">
                <thead>
                    <tr style={{ backgroundColor: styles.innerPanelBg }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Competencies</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Hours</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Weight</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Items</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-lg" style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: styles.onSurfaceVariant || styles.textColor }}>Easy<br /><span className="text-[10px] font-normal">(Rem/Und)</span></th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-lg" style={{ backgroundColor: 'rgba(234,179,8,0.08)', color: styles.onSurfaceVariant || styles.textColor }}>Average<br /><span className="text-[10px] font-normal">(App/Ana)</span></th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: styles.onSurfaceVariant || styles.textColor }}>Difficult<br /><span className="text-[10px] font-normal">(Eva/Cre)</span></th>
                    </tr>
                </thead>
                <tbody>
                    {tos?.competencyBreakdown?.map((row, index) => (
                        <tr key={index} className="border-t" style={{ borderColor: styles.outline || styles.borderColor, color: styles.onSurface || styles.textColor }}>
                            <td className="px-4 py-3.5 text-sm">{row.competency}</td>
                            <td className="px-3 py-3.5 text-center text-sm">{row.noOfHours}</td>
                            <td className="px-3 py-3.5 text-center text-sm">{row.weightPercentage}</td>
                            <td className="px-3 py-3.5 text-center text-sm font-medium">{row.noOfItems}</td>
                            <td className="px-3 py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.04)' }}>{row.easyItems.itemNumbers}</td>
                            <td className="px-3 py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(234,179,8,0.04)' }}>{row.averageItems.itemNumbers}</td>
                            <td className="px-3 py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.04)' }}>{row.difficultItems.itemNumbers}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2" style={{ borderColor: styles.outline || styles.borderColor, color: styles.primary || styles.accentText }}>
                        <td className="px-4 py-3 font-bold text-sm">TOTAL</td>
                        <td className="px-3 py-3 text-center font-bold text-sm">{tos?.totalRow?.hours}</td>
                        <td className="px-3 py-3 text-center font-bold text-sm">{tos?.totalRow?.weightPercentage}</td>
                        <td className="px-3 py-3 text-center font-bold text-sm">{tos?.totalRow?.noOfItems}</td>
                        <td colSpan="3"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
);

// --- ATOMIC GENERATION HELPERS ---

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

const getTosPlannerPrompt = (guideData) => {
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

const getExamComponentPrompt = (guideData, generatedTos, testType, previousQuestionsSummary) => {
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
// --- BATCHING HELPER: Generates a small chunk of questions to avoid 504 Timeouts ---
const generateSingleBatch = async (guideData, generatedTos, batchTestType, previousQuestionsSummary, isGenerationRunningRef, maxRetries) => {
    const prompt = getExamComponentPrompt(guideData, generatedTos, batchTestType, previousQuestionsSummary);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

        try {
            // FORCE LOGIC TIER FOR EXAM QUESTIONS
            const aiResponse = await callGeminiWithLimitCheck(prompt, { forceTier: 'logic' });

            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

            const jsonData = sanitizeJsonComponent(aiResponse);

            // Artificial delay to prevent hitting rate limits too hard between retries
            await new Promise(res => setTimeout(res, 1000));

            return jsonData;

        } catch (error) {
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

            console.warn(
                `Attempt ${attempt + 1} of ${maxRetries} failed for batch ${batchTestType.range}:`,
                error.message
            );
            if (attempt === maxRetries - 1) {
                throw error; // Re-throw to be caught by the parent
            }
            // Increase delay on failure
            await new Promise(res => setTimeout(res, 3000 * (attempt + 1)));
        }
    }
};

const generateExamComponent = async (guideData, generatedTos, testType, previousQuestionsSummary, isGenerationRunningRef, maxRetries = 3) => {
    // 1. Analyze the Request
    const { type, range } = testType;
    const normalizedType = type.toLowerCase();

    // Check if this is a "Single Item" type (Essay/Solving) where range implies points, not count.
    // We do NOT batch these because they are single prompts.
    const isSingleQuestionType = normalizedType.includes('essay') || normalizedType.includes('solving');

    if (isSingleQuestionType) {
        return await generateSingleBatch(guideData, generatedTos, testType, previousQuestionsSummary, isGenerationRunningRef, maxRetries);
    }

    // 2. Parse Range for splitting (e.g., "1-20")
    // Handles simple ranges "1-20" or single numbers "1"
    const rangeParts = range.split('-').map(s => parseInt(s.trim()));
    const startItem = rangeParts[0];
    const endItem = rangeParts.length > 1 ? rangeParts[1] : startItem;
    const totalItems = endItem - startItem + 1;

    // 3. Define Batch Size (Safe limit for Serverless Functions is usually ~5 items)
    const BATCH_SIZE = 5;

    // If request is small enough, just do it in one go.
    if (totalItems <= BATCH_SIZE) {
        return await generateSingleBatch(guideData, generatedTos, testType, previousQuestionsSummary, isGenerationRunningRef, maxRetries);
    }

    // 4. Batching Logic
    console.log(`Splitting ${type} (${range}) into batches of ${BATCH_SIZE}...`);
    let allQuestions = [];

    // Loop through the range in steps of BATCH_SIZE
    for (let i = startItem; i <= endItem; i += BATCH_SIZE) {
        if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

        const batchStart = i;
        const batchEnd = Math.min(i + BATCH_SIZE - 1, endItem);
        const batchRange = `${batchStart}-${batchEnd}`;
        const batchNumItems = batchEnd - batchStart + 1;

        // Create a temporary testType config for this specific batch
        const batchTestType = {
            ...testType,
            range: batchRange,
            numItems: batchNumItems
        };

        try {
            // Pass accumulated summary to avoid duplicates across batches
            // Note: We append the questions we've ALREADY generated in this loop to the summary
            const currentSummary = previousQuestionsSummary +
                (allQuestions.length > 0 ? "\n[Recently Generated]:\n" + allQuestions.map(q => q.question).join('\n') : "");

            const batchResult = await generateSingleBatch(
                guideData,
                generatedTos,
                batchTestType,
                currentSummary,
                isGenerationRunningRef,
                maxRetries
            );

            if (batchResult && batchResult.questions) {
                allQuestions = [...allQuestions, ...batchResult.questions];
            }
        } catch (err) {
            console.error(`Batch ${batchRange} failed:`, err);
            // Optional: We could choose to continue with partial results, but throwing ensures integrity.
            throw new Error(`Failed to generate items ${batchRange}: ${err.message}`);
        }
    }

    return { questions: allQuestions };
};

// --- MAIN COMPONENT ---

export default function CreateExamAndTosModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    // 1. Theme Hook
    const { activeOverlay } = useTheme();
    // 2. Generate styles based on overlay
    const themeStyles = getThemeStyles(activeOverlay);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedLessons, setSelectedLessons] = useState([]);
    const [previewData, setPreviewData] = useState(null);
    const [language, setLanguage] = useState('English');
    const [learningCompetencies, setLearningCompetencies] = useState('');
    const [testTypes, setTestTypes] = useState([]);
    const [totalHours, setTotalHours] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [isSaveOptionsOpen, setIsSaveOptionsOpen] = useState(false);

    const isGenerationRunning = useRef(false);

    const gradeLevels = [
        'Kinder',
        'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
        'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
        'Grade 11', 'Grade 12'
    ];

    useEffect(() => {
        return () => {
            isGenerationRunning.current = false;
        };
    }, []);

    // Effect to set grade level when course changes, but allow manual override
    useEffect(() => {
        if (selectedCourse?.gradeLevel) {
            // Check if the course grade level matches one of our options approx
            const found = gradeLevels.find(g => selectedCourse.gradeLevel.includes(g));
            if (found) {
                setGradeLevel(found);
            } else {
                setGradeLevel(selectedCourse.gradeLevel);
            }
        }
    }, [selectedCourse]);

    const handleClose = useCallback(() => {
        isGenerationRunning.current = false;
        onClose();
    }, [onClose]);

    // --- Neumorphic style constants (Dynamic) ---
    const neumorphicInput = `${inputBaseStyles} px-4 py-2.5 sm:text-sm`;
    const neumorphicTextarea = `${inputBaseStyles} px-4 py-2.5 sm:text-sm`;
    const neumorphicSelect = `${inputBaseStyles} pl-4 pr-10 py-2.5 sm:text-sm appearance-none bg-no-repeat bg-[right_0.5rem_center]`;

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
        const formattedTestStructure = testTypes.map(tt => `${tt.type}: ${tt.numItems} items (from range(s) ${tt.range})`).join('; ');

        const guideData = {
            learningCompetencies,
            language,
            totalHours,
            totalConfiguredItems,
            formattedTestStructure,
            selectedCourse,
            selectedLessons,
            combinedContent,
            combinedLessonTitles,
            gradeLevel
        };

        let generatedTos = null;
        let allGeneratedQuestions = [];

        try {
            // --- STEP 1: PLANNER ---
            showToast("Generating Table of Specifications...", "info", 10000);
            const tosPrompt = getTosPlannerPrompt(guideData);

            if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
            
            // FORCE LOGIC TIER FOR TOS PLANNER
            const tosResponse = await callGeminiWithLimitCheck(tosPrompt, { forceTier: 'logic' }); 
            
            if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");

            const parsedTosData = tryParseJson(extractJson(tosResponse));

            if (parsedTosData.tos && parsedTosData.tos.competencyBreakdown) {
                // Ensure rounded percentages sum to 100% using the restored helper function
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

                generatedTos = parsedTosData.tos;

                setPreviewData({
                    examTitle: parsedTosData.examTitle,
                    tos: generatedTos,
                    examQuestions: []
                });

                if (calculatedTotalItems !== totalConfiguredItems) {
                    showToast(`Warning: AI generated ${calculatedTotalItems} items, but ${totalConfiguredItems} were requested.`, "warning", 6000);
                }
            } else {
                throw new Error("AI failed to return a valid TOS structure.");
            }

            // --- STEP 2: MICRO-WORKERS ---
            for (const testType of testTypes) {
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
                if (testType.numItems === 0) continue;

                showToast(`Generating ${testType.type} (Items ${testType.range})...`, "info", 10000);

                // Get summary of questions generated so far to prevent redundancy
                const previousQuestionsSummary = allGeneratedQuestions
                    .map(q => `- ${q.question} (Type: ${q.type})`)
                    .join('\n');

                // generateExamComponent now handles batching internally to avoid 504 errors
                const componentData = await generateExamComponent(
                    guideData,
                    generatedTos,
                    testType,
                    previousQuestionsSummary,
                    isGenerationRunning
                );

                if (componentData && componentData.questions) {
                    allGeneratedQuestions.push(...componentData.questions);

                    setPreviewData(prev => ({
                        ...prev,
                        examQuestions: [...allGeneratedQuestions]
                    }));
                }
            }

            if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
            showToast("Exam and TOS generated successfully!", "success");

        } catch (err) {
            if (err.message && err.message.includes("aborted")) {
                console.log("Generation loop aborted by user.");
                showToast("Generation cancelled.", "warning");
            } else {
                console.error("Generation error:", err);
                showToast(`Generation failed: ${err.message}`, "error", 15000);
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

        // --- Extract Global Choices for Identification ---
        const identQuestions = previewData.examQuestions.filter(q => (q.type || '').toLowerCase().includes('identification'));
        let globalIdentChoices = null;

        const firstIdentWithChoices = identQuestions.find(q => q.choicesBox && (Array.isArray(q.choicesBox) || typeof q.choicesBox === 'string'));
        if (firstIdentWithChoices) {
            const rawBox = firstIdentWithChoices.choicesBox;
            if (Array.isArray(rawBox)) {
                globalIdentChoices = rawBox.map(c => (typeof c === 'object' ? c.text || c.value : c));
            } else {
                globalIdentChoices = [rawBox];
            }
        }

        for (const q of previewData.examQuestions) {
            const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');
            const isGroupable = normalizedType === 'matching_type' || normalizedType === 'matching-type';

            if (isGroupable) {
                if (!seenGroupableTypes.has(normalizedType)) {
                    uniqueQuestions.push(q);
                    seenGroupableTypes.add(normalizedType);
                }
            } else {
                uniqueQuestions.push(q);
            }
        }

        const quizQuestions = uniqueQuestions
            .map(q => {
                const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');

                const questionText = (normalizedType === 'interpretive' && q.passage)
                    ? `${q.passage}\n\n${q.question || ''}`
                    : (q.question || 'Missing question text from AI.');

                const baseQuestion = {
                    text: questionText,
                    difficulty: q.difficulty || 'easy',
                    explanation: q.explanation || q.solution || '',
                };

                // --- 1. Multiple Choice / Analogy ---
                if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
                    const options = q.options || [];
                    // Ensure options are strings
                    const stringOptions = options.map(String);

                    // CLEANUP: Remove "a. ", "b. " prefixes from the answer text for matching
                    const rawAnswer = q.correctAnswer || '';
                    const cleanAnswerText = rawAnswer.replace(/^[a-d][\.\)]\s*/i, '').trim();

                    // --- MATCHING LOGIC FIX ---

                    // Attempt 1: Exact Match (Best case)
                    let correctIndex = stringOptions.findIndex(opt => opt.trim() === cleanAnswerText);

                    // Attempt 2: Case-insensitive Match
                    if (correctIndex === -1) {
                        correctIndex = stringOptions.findIndex(opt => opt.trim().toLowerCase() === cleanAnswerText.toLowerCase());
                    }

                    // Attempt 3: Check if Answer is just a Letter (e.g. "A", "b")
                    if (correctIndex === -1) {
                        const letterMatch = rawAnswer.match(/^([a-d])[\.\)]?$/i); // Matches "A", "A.", "a"
                        if (letterMatch) {
                            const letterMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                            correctIndex = letterMap[letterMatch[1].toLowerCase()];
                        }
                    }

                    // Attempt 4: Fuzzy Match (Only if absolutely necessary)
                    // Be strict: only match if the option contains the answer OR answer contains the option
                    if (correctIndex === -1) {
                        correctIndex = stringOptions.findIndex(opt => {
                            const cleanOpt = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const cleanKey = cleanAnswerText.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (cleanOpt === cleanKey) return true;
                            // Only do inclusion check if strings are long enough to avoid false positives (like "a" inside "cat")
                            if (cleanOpt.length > 3 && cleanKey.length > 3) {
                                return cleanOpt.includes(cleanKey) || cleanKey.includes(cleanOpt);
                            }
                            return false;
                        });
                    }

                    // Validate index range
                    const finalIndex = (correctIndex > -1 && correctIndex < stringOptions.length) ? correctIndex : 0;

                    // WARNING: If we defaulted to 0 because match failed, log it.
                    if (correctIndex === -1 && stringOptions.length > 0) {
                        console.warn(`[AI-FIX] Could not match answer "${rawAnswer}" to options. Defaulting to first option. Options:`, stringOptions);
                    }

                    if (stringOptions.length > 0) {
                        return {
                            ...baseQuestion,
                            type: 'multiple-choice',
                            options: stringOptions.map((opt, idx) => ({
                                text: opt,
                                isCorrect: idx === finalIndex
                            })),
                            correctAnswerIndex: finalIndex,
                        };
                    }
                    return null;
                }

                // --- 2. True/False ---
                if (normalizedType === 'alternative_response') {
                    let isTrue = false;
                    if (typeof q.correctAnswer === 'string') {
                        isTrue = q.correctAnswer.toLowerCase() === 'true' || q.correctAnswer.toLowerCase() === 'tama';
                    } else if (typeof q.correctAnswer === 'boolean') {
                        isTrue = q.correctAnswer;
                    }

                    return {
                        ...baseQuestion,
                        type: 'true-false',
                        correctAnswer: isTrue,
                    };
                }

                // --- 3. Identification ---
                if (normalizedType === 'identification' || normalizedType === 'solving') {
                    const answer = q.correctAnswer || q.answer;
                    if (answer) {
                        return {
                            ...baseQuestion,
                            type: 'identification',
                            correctAnswer: String(answer), // Ensure string
                            choicesBox: globalIdentChoices,
                        };
                    }
                }

                // --- 4. Matching Type ---
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

                // --- 5. Essay ---
                if (normalizedType === 'essay') {
                    return {
                        ...baseQuestion,
                        type: 'essay',
                        rubric: q.rubric || [],
                    };
                }

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
            handleClose();
        } catch (err) {
            console.error("Save error:", err);
            showToast(`Failed to save: ${err.message}`, "error", 8000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[110]">
            {/* M3 Scrim */}
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

            {/* M3 Full-screen container */}
            <div className="fixed inset-0 lg:inset-4 flex flex-col z-[110]">
                <Dialog.Panel
                    className="relative flex flex-col h-full w-full overflow-hidden rounded-none lg:rounded-[28px] transition-colors duration-500"
                    onClick={(e) => e.stopPropagation()}
                    style={{ backgroundColor: themeStyles.modalBg }}
                >
                    {/* Loading Overlay */}
                    {(isGenerating || isSaving) && (
                        <div
                            className="absolute inset-0 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-none lg:rounded-[28px]"
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                        >
                            <InteractiveLoadingScreen
                                topic={selectedLessons.length > 0 ? selectedLessons.map(l => l.title).join(', ') : "new ideas"}
                                isSaving={isSaving}
                                lessonProgress={{
                                    current: previewData ? (previewData.examQuestions ? previewData.examQuestions.length : 0) + 1 : 1,
                                    total: testTypes.length + 1
                                }}
                            />
                        </div>
                    )}

                    {/* Save Options Dialog */}
                    {isSaveOptionsOpen && (
                        <Dialog open={isSaveOptionsOpen} onClose={() => setIsSaveOptionsOpen(false)} className="relative z-[120]">
                            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
                            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                                <Dialog.Panel
                                    className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] p-6 sm:p-7 border transition-all duration-300"
                                    style={{ backgroundColor: themeStyles.modalBg, borderColor: themeStyles.outline || themeStyles.borderColor }}
                                >
                                    {/* M3 Bottom sheet handle (mobile) */}
                                    <div className="flex justify-center mb-4 sm:hidden">
                                        <div className="w-8 h-1 rounded-full" style={{ backgroundColor: themeStyles.onSurfaceVariant || themeStyles.textColor, opacity: 0.3 }} />
                                    </div>
                                    <Dialog.Title className="text-xl font-semibold flex items-center gap-3" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)' }}>
                                            <DocumentArrowDownIcon className="w-5 h-5" style={{ color: themeStyles.primary || '#818cf8' }} />
                                        </div>
                                        Save Options
                                    </Dialog.Title>
                                    <p className="text-sm mt-2 ml-[52px]" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>How would you like to save the generated exam?</p>
                                    <div className="mt-5 space-y-1">
                                        <button onClick={() => handleFinalSave('lesson')} className="w-full flex items-center gap-4 text-left p-3.5 rounded-2xl hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                                                <DocumentTextIcon className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-[15px]">Viewable Lesson</p>
                                                <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Saves as markdown pages for reading.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => handleFinalSave('quiz')} className="w-full flex items-center gap-4 text-left p-3.5 rounded-2xl hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                                                <PuzzlePieceIcon className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-[15px]">Interactive Quiz</p>
                                                <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Creates a playable quiz experience.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => handleFinalSave('both')} className="w-full flex items-center gap-4 text-left p-3.5 rounded-2xl hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(56,189,248,0.12)' }}>
                                                <DocumentDuplicateIcon className="w-5 h-5 text-sky-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-[15px]">Both Lesson & Quiz</p>
                                                <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Creates both formats simultaneously.</p>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="mt-5 flex justify-end">
                                        <button onClick={() => setIsSaveOptionsOpen(false)} className={`py-2.5 px-5 rounded-full text-sm font-medium ${btnExtruded}`} style={{ backgroundColor: themeStyles.innerPanelBg, color: themeStyles.onSurface || themeStyles.textColor, border: `1px solid ${themeStyles.outline || themeStyles.borderColor}` }}>Cancel</button>
                                    </div>
                                </Dialog.Panel>
                            </div>
                        </Dialog>
                    )}

                    {/* === M3 TOP APP BAR === */}
                    <div className="flex items-center gap-3 px-4 lg:px-6 h-16 lg:h-[72px] flex-shrink-0 border-b" style={{ borderColor: themeStyles.outline || themeStyles.borderColor }}>
                        {/* Leading: Close button */}
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors flex-shrink-0"
                            style={{ color: themeStyles.onSurface || themeStyles.textColor }}
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>

                        {/* Center: Title */}
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)' }}>
                                <ClipboardDocumentListIcon className="h-5 w-5" style={{ color: themeStyles.primary || '#818cf8' }} />
                            </div>
                            <div className="min-w-0">
                                <Dialog.Title className="text-base lg:text-lg font-semibold truncate" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Exam & TOS Generator</Dialog.Title>
                                <p className="text-xs truncate hidden sm:block" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Create a comprehensive exam and its Table of Specifications.</p>
                            </div>
                        </div>

                        {/* Trailing: Item count chip */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}>
                                <span>{totalConfiguredItems}</span>
                                <span className="font-normal" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>items</span>
                            </div>
                        </div>
                    </div>

                    {/* === CONTENT AREA === */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                            {!previewData ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">

                                    {/* LEFT COLUMN */}
                                    <div className="space-y-5">
                                        {/* Exam Config Card */}
                                        <div className="rounded-[20px] border p-5 lg:p-6 transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeStyles.primary || '#818cf8' }} />
                                                Exam Configuration
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Total Number of Items</label>
                                                    <div className={`${neumorphicInput} font-semibold text-base`} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.primary || themeStyles.accentText }}>
                                                        {totalConfiguredItems}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Total Hours Spent</label>
                                                    <input type="number" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} className={neumorphicInput} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }} placeholder="e.g., 10" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Language</label>
                                                    <select value={language} onChange={e => setLanguage(e.target.value)} className={neumorphicSelect} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }}>
                                                        <option>English</option>
                                                        <option>Filipino</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content Selection Card */}
                                        <div className="rounded-[20px] border p-5 lg:p-6 transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                Source Content
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Learning Competencies</label>
                                                    <textarea rows="4" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className={neumorphicTextarea} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }} placeholder="Enter learning competencies, one per line." ></textarea>
                                                </div>
                                                <div style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                    <CourseSelector onCourseSelect={setSelectedCourse} />
                                                </div>
                                                {selectedCourse && (
                                                    <div style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                        <LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN */}
                                    <div className="space-y-5">
                                        {/* Grade Level Card */}
                                        <div className="rounded-[20px] border p-5 lg:p-6 transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                Target Level
                                            </h3>
                                            <div>
                                                <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Grade Level (Context)</label>
                                                <select
                                                    value={gradeLevel}
                                                    onChange={e => setGradeLevel(e.target.value)}
                                                    className={neumorphicSelect}
                                                    style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }}
                                                >
                                                    <option value="" disabled>Select Grade Level</option>
                                                    {gradeLevels.map((level) => (
                                                        <option key={level} value={level}>{level}</option>
                                                    ))}
                                                </select>
                                                <p className="text-xs mt-2" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor, opacity: 0.7 }}>
                                                    Sets the difficulty and vocabulary level for generated questions.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Test Structure Card */}
                                        <div className="rounded-[20px] border p-5 lg:p-6 flex flex-col transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                                                        Test Structure
                                                    </h3>
                                                    <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Define the types of tests for the exam.</p>
                                                </div>
                                                <button
                                                    onClick={addTestType}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                                                    style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                    <span>Add</span>
                                                </button>
                                            </div>
                                            <div className="space-y-2.5 flex-1">
                                                {testTypes.map((test, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2.5 rounded-2xl border transition-colors" style={{ backgroundColor: themeStyles.inputBg, borderColor: themeStyles.outline || themeStyles.borderColor }}>
                                                        <div className="flex-1">
                                                            <select value={test.type} onChange={e => handleTestTypeChange(index, 'type', e.target.value)} className="w-full text-sm bg-transparent border-none rounded-md focus:ring-0 font-medium" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Multiple Choice</option>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Matching Type</option>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Alternative Response</option>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Identification</option>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Solving</option>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Essay</option>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Analogy</option>
                                                                <option style={{ backgroundColor: themeStyles.modalBg }}>Interpretive</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex-1">
                                                            <input type="text" value={test.range} onChange={e => handleTestTypeChange(index, 'range', e.target.value)} placeholder="Range (e.g., 1-10)" className="w-full px-3 py-1.5 text-sm rounded-xl border focus:ring-1 bg-transparent" style={{ color: themeStyles.primary || themeStyles.accentText, borderColor: themeStyles.outline || themeStyles.borderColor, '--tw-ring-color': themeStyles.primary || '#818cf8' }} />
                                                        </div>
                                                        <button onClick={() => removeTestType(index)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-red-500/10 transition-colors" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>
                                                            <TrashIcon className="w-4.5 h-4.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {testTypes.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: themeStyles.inputBg }}>
                                                            <PlusIcon className="w-6 h-6" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }} />
                                                        </div>
                                                        <p className="text-sm font-medium" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>No test types added yet</p>
                                                        <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor, opacity: 0.6 }}>Tap "Add" to define your exam structure.</p>
                                                    </div>
                                                )}
                                            </div>
                                            {totalConfiguredItems === 0 && testTypes.length > 0 && (
                                                <p className="text-red-400 text-xs mt-3 font-medium flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                    Warning: Total items is 0. Add ranges to your test types.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* === PREVIEW MODE === */
                                <div className="space-y-5">
                                    {/* Preview header */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: themeStyles.primary || '#818cf8' }} />
                                        <h2 className="text-xl lg:text-2xl font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                            {previewData?.examTitle || 'Generated Exam'}
                                        </h2>
                                    </div>

                                    <div className="space-y-5">
                                        {previewData.tos ? (
                                            <>
                                                {/* TOS PAGE */}
                                                <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}>Page 1</span>
                                                        <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Table of Specifications</h3>
                                                    </div>
                                                    <TOSPreviewTable tos={previewData.tos} styles={themeStyles} />
                                                </div>

                                                {/* QUESTIONS PAGE */}
                                                {previewData.examQuestions && previewData.examQuestions.length > 0 && (
                                                    <>
                                                        <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}>Page 2</span>
                                                                <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Exam Questions</h3>
                                                            </div>
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

                                                                const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
                                                                const t = translations[language] || translations['English'];

                                                                return Object.entries(groupedQuestions).map(([type, data], typeIndex) => {
                                                                    const typeHeader = t.test_types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                                                    return (
                                                                        <div key={type} className="mt-6 first:mt-0">
                                                                            <h4 className="text-sm font-bold tracking-wide" style={{ color: themeStyles.primary || themeStyles.accentText }}>{romanNumerals[typeIndex]}. {typeHeader}</h4>
                                                                            {data.instruction && <p className="text-sm font-medium italic my-2" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>{data.instruction}</p>}
                                                                            {data.passage && <p className="text-sm my-2 p-4 rounded-2xl border" style={{ backgroundColor: themeStyles.inputBg, borderColor: themeStyles.outline || themeStyles.borderColor, color: themeStyles.onSurface || themeStyles.textColor }}>{data.passage}</p>}

                                                                            {type === 'identification' && data.choicesBox && (
                                                                                <div className="text-center p-3 my-4 border rounded-2xl" style={{ backgroundColor: themeStyles.inputBg, borderColor: themeStyles.outline || themeStyles.borderColor }}>
                                                                                    <p className="text-sm font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                                                                        {(() => {
                                                                                            const box = data.choicesBox;
                                                                                            if (Array.isArray(box)) {
                                                                                                return box.map(c => (typeof c === 'object' ? c.text || c.value : c)).join('   •   ');
                                                                                            }
                                                                                            return String(box);
                                                                                        })()}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            <div className="space-y-4 mt-4">
                                                                                {type === 'matching-type' ? (
                                                                                    (() => {
                                                                                        const q = data.questions[0];
                                                                                        if (!q || !q.prompts || !q.options) return null;

                                                                                        return (
                                                                                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 pl-2">
                                                                                                <div className="flex-1">
                                                                                                    <p className="font-semibold mb-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{t.columnA}</p>
                                                                                                    <ul className="list-none space-y-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>
                                                                                                        {q.prompts.map((prompt, promptIndex) => (
                                                                                                            <li key={prompt.id} className="flex items-start">
                                                                                                                <span className="w-8 flex-shrink-0 font-medium">{q.questionNumber + promptIndex}.</span>
                                                                                                                <span>{prompt.text}</span>
                                                                                                            </li>
                                                                                                        ))}
                                                                                                    </ul>
                                                                                                </div>
                                                                                                <div className="flex-1">
                                                                                                    <p className="font-semibold mb-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{t.columnB}</p>
                                                                                                    <ul className="list-none space-y-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>
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
                                                                                            <p className="font-medium text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{q.questionNumber}. {q.question}</p>

                                                                                            {q.options && Array.isArray(q.options) && (
                                                                                                <ul className="list-none mt-2 ml-8 text-sm space-y-1.5" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>
                                                                                                    {q.options.map((option, optIndex) => (
                                                                                                        <li key={optIndex}>{String.fromCharCode(97 + optIndex)}. {option}</li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            )}

                                                                                            {type === 'identification' && (
                                                                                                <p className="mt-2 ml-5 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Answer: <span className="font-mono">__________________</span></p>
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

                                                        {/* ANSWER KEY PAGE */}
                                                        <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>Page 3</span>
                                                                <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Answer Key</h3>
                                                            </div>
                                                            <ul className="list-none space-y-2">
                                                                {previewData.examQuestions.map((q, index) => (
                                                                    <li key={index} className="text-sm py-1.5 border-b last:border-b-0" style={{ borderColor: themeStyles.outline || themeStyles.borderColor }}>
                                                                        <strong className="font-semibold" style={{ color: themeStyles.primary || themeStyles.accentText }}>Q{q.questionNumber}:</strong>{' '}
                                                                        <span style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{q.correctAnswer || (q.correctAnswers && Object.entries(q.correctAnswers).map(([key, val]) => `${key}-${val}`).join(', '))}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* EXPLANATIONS PAGE */}
                                                        <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: '#fbbf24' }}>Page 4</span>
                                                                <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Explanations</h3>
                                                            </div>
                                                            <ul className="list-none space-y-4">
                                                                {previewData.examQuestions.filter(q => q.explanation || q.solution).map((q, index) => (
                                                                    <li key={index} className="text-sm">
                                                                        <strong className="font-semibold" style={{ color: themeStyles.primary || themeStyles.accentText }}>Q{q.questionNumber}:</strong>
                                                                        {q.explanation && <p className="ml-4 mt-0.5" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>{q.explanation}</p>}
                                                                        {q.solution && <p className="ml-4 mt-0.5 font-mono text-xs p-3 rounded-xl mt-1" style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }}>{q.solution}</p>}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        ) : <p className="text-red-400 font-medium p-4">Could not generate a valid preview.</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* === M3 BOTTOM ACTION BAR === */}
                    <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 border-t flex flex-col sm:flex-row sm:justify-end gap-3" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.modalBg }}>
                        {previewData ? (
                            <>
                                <button
                                    onClick={() => setPreviewData(null)}
                                    disabled={isSaving || isGenerating}
                                    className={`py-3 px-6 rounded-full text-sm font-medium border ${btnExtruded} ${btnDisabled} order-2 sm:order-1`}
                                    style={{ borderColor: themeStyles.outline || themeStyles.borderColor, color: themeStyles.onSurface || themeStyles.textColor, backgroundColor: 'transparent' }}
                                >
                                    Back to Edit
                                </button>
                                <button
                                    onClick={() => setIsSaveOptionsOpen(true)}
                                    disabled={!isValidPreview || isSaving || isGenerating}
                                    className={`py-3 px-6 rounded-full text-sm font-semibold text-white ${btnExtruded} ${btnDisabled} order-1 sm:order-2`}
                                    style={{ backgroundColor: themeStyles.primary || '#818cf8' }}
                                >
                                    {isSaving ? 'Saving...' : 'Accept & Save'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className={`py-3 px-6 rounded-full text-sm font-medium border ${btnExtruded} order-2 sm:order-1`}
                                    style={{ borderColor: themeStyles.outline || themeStyles.borderColor, color: themeStyles.onSurface || themeStyles.textColor, backgroundColor: 'transparent' }}
                                    onClick={handleClose}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`py-3 px-6 rounded-full text-sm font-semibold text-white ${btnExtruded} ${btnDisabled} order-1 sm:order-2`}
                                    style={{ backgroundColor: themeStyles.primary || '#818cf8' }}
                                    onClick={handleGenerate}
                                    disabled={!isValidForGeneration || isGenerating}
                                >
                                    {isGenerating ? 'Generating...' : 'Generate Exam & TOS'}
                                </button>
                            </>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}