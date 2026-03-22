import { translations } from './examTosUtils';

// --- MARKDOWN GENERATORS ---

export const generateTosMarkdown = (tos) => {
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

export const generateExamQuestionsMarkdown = (questions, language) => {
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
                const firstQ = questionsOfType[0];
                const choices = firstQ?.choicesBox;

                if (choices) {
                    let cleanChoices = [];
                    if (Array.isArray(choices)) {
                        cleanChoices = choices.map(c => {
                            if (typeof c === 'object' && c !== null) {
                                return c.text || c.value || c.answer || JSON.stringify(c);
                            }
                            return String(c);
                        });
                    } else {
                        cleanChoices = [String(choices)];
                    }

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

export const generateAnswerKeyMarkdown = (questions) => {
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

export const generateExplanationsMarkdown = (questions) => {
    if (!questions || questions.length === 0) return 'No explanations generated.';
    let markdown = `### Explanations\n\n`;
    questions.forEach((q) => {
        if (q.explanation) markdown += `**Question ${q.questionNumber}:** ${q.explanation}\n\n`;
        if (q.solution) markdown += `**Question ${q.questionNumber}:** ${q.solution}\n\n`;
    });
    return markdown;
};
