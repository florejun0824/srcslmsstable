import { doc, collection, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
    generateTosMarkdown,
    generateExamQuestionsMarkdown,
    generateAnswerKeyMarkdown,
    generateExplanationsMarkdown
} from './examTosMarkdown';

export const saveAsLesson = async (previewData, language, subjectId, unitId) => {
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

export const saveAsQuiz = async (previewData, language, subjectId, unitId) => {
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
                const stringOptions = options.map(String);

                const rawAnswer = q.correctAnswer || '';
                const cleanAnswerText = rawAnswer.replace(/^[a-d][\.\\)]\s*/i, '').trim();

                // --- MATCHING LOGIC FIX ---
                let correctIndex = stringOptions.findIndex(opt => opt.trim() === cleanAnswerText);

                if (correctIndex === -1) {
                    correctIndex = stringOptions.findIndex(opt => opt.trim().toLowerCase() === cleanAnswerText.toLowerCase());
                }

                if (correctIndex === -1) {
                    const letterMatch = rawAnswer.match(/^([a-d])[\.\\)]?$/i);
                    if (letterMatch) {
                        const letterMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                        correctIndex = letterMap[letterMatch[1].toLowerCase()];
                    }
                }

                if (correctIndex === -1) {
                    correctIndex = stringOptions.findIndex(opt => {
                        const cleanOpt = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const cleanKey = cleanAnswerText.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (cleanOpt === cleanKey) return true;
                        if (cleanOpt.length > 3 && cleanKey.length > 3) {
                            return cleanOpt.includes(cleanKey) || cleanKey.includes(cleanOpt);
                        }
                        return false;
                    });
                }

                const finalIndex = (correctIndex > -1 && correctIndex < stringOptions.length) ? correctIndex : 0;

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
                        correctAnswer: String(answer),
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
