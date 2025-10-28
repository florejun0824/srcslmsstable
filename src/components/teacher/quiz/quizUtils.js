import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * Helper function to shuffle an array
 * @param {Array} array The array to shuffle
 * @returns {Array} A new, shuffled array
 */
export const shuffleArray = (array) => {
    if (!array) return [];
    let currentIndex = array.length, randomIndex;
    const newArray = [...array];
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
};

/**
 * Handles the logic for exporting a quiz to PDF
 * @param {object} quiz The quiz object
 * @param {function} showToast Function from useToast context
 */
export const handleExportPdf = async (quiz, showToast) => {
    if (!quiz?.questions || quiz.questions.length === 0) {
        showToast("No questions available to export.", "warning");
        return;
    }
    try {
        const doc = new jsPDF();
        const quizBody = [];
        const answerKey = [];
        let itemCounter = 1; // Keep track of item numbers manually

        quiz.questions.forEach((q, qIndex) => {
            let questionContent = q.question || q.text || `Question ${qIndex + 1} Text Missing`;
            let correctAnswerText = '';
            const points = Number(q.points) || 1;
            const currentItemLabel = points > 1 ? `${itemCounter}-${itemCounter + points - 1}` : `${itemCounter}`;

            if (q.type === 'multiple-choice' && q.options) {
                const optionsText = q.options.map((opt, idx) => `  ${String.fromCharCode(97 + idx)}. ${opt.text || opt}`).join('\n');
                questionContent += `\n${optionsText}`;
                // Find correct answer (works for both formats)
                const correctOpt = q.options[q.correctAnswerIndex];
                correctAnswerText = correctOpt?.text || correctOpt || 'N/A';
            } else if (q.type === 'true-false') {
                 questionContent += quiz.language === 'Filipino' ? '\n  a. Tama\n  b. Mali' : '\n  a. True\n  b. False';
                 correctAnswerText = quiz.language === 'Filipino' ? (q.correctAnswer ? 'Tama' : 'Mali') : String(q.correctAnswer);
            } else if (q.type === 'matching-type') {
                 // Basic representation for PDF
                 questionContent += '\n(Match items in Column A with Column B)';
                 // Answer key needs expansion
                 correctAnswerText = (q.prompts || []).map((p, pIdx) => {
                     const correctOpt = (q.options || []).find(opt => q.correctPairs && opt.id === q.correctPairs[p.id]);
                     const optLetter = String.fromCharCode(97 + (q.options || []).findIndex(opt => opt.id === correctOpt?.id));
                     return `${itemCounter + pIdx}. ${optLetter}`;
                 }).join('; ');
            } else if (q.type === 'essay') {
                correctAnswerText = '(Essay - Manual/AI Grade)'; // Indicate no single key
                if(q.rubric && q.rubric.length > 0) {
                    questionContent += `\n\nRubric:\n${q.rubric.map(r => `  - ${r.criteria} (${r.points} pts)`).join('\n')}`;
                }
            }
             else { // Identification, ExactAnswer
                correctAnswerText = String(q.correctAnswer ?? 'N/A');
            }

            if (q.explanation && q.type !== 'essay') { // Don't typically add explanation to essay prompts in export
                questionContent += `\n\nExplanation: ${q.explanation}`;
            }

            quizBody.push([currentItemLabel, questionContent]); // Use calculated label

            // Add to answer key (handle matching expansion)
            if (q.type === 'matching-type') {
                 (q.prompts || []).forEach((p, pIdx) => {
                     const correctOpt = (q.options || []).find(opt => q.correctPairs && opt.id === q.correctPairs[p.id]);
                     const optLetter = String.fromCharCode(97 + (q.options || []).findIndex(opt => opt.id === correctOpt?.id));
                     const optText = correctOpt?.text || 'N/A';
                     answerKey.push([itemCounter + pIdx, `${optLetter}. ${optText}`]);
                 });
            } else {
                 answerKey.push([currentItemLabel, correctAnswerText]);
            }

            itemCounter += points; // Increment by points for next item number
        });

        // Generate PDF
        doc.setFontSize(18);
        doc.text(quiz.title || "Quiz Export", 14, 22);
        autoTable(doc, { head: [['#', 'Question / Prompt']], body: quizBody, startY: 30, theme: 'grid', headStyles: { fillColor: [41, 128, 185], textColor: 255 }, styles: { cellPadding: 2, fontSize: 10 } });
        doc.addPage();
        doc.setFontSize(18);
        doc.text('Answer Key', 14, 22);
        autoTable(doc, { head: [['#', 'Correct Answer / Match']], body: answerKey, startY: 30, theme: 'striped', headStyles: { fillColor: [22, 160, 133], textColor: 255 }, styles: { cellPadding: 2, fontSize: 10 } });

        // Save/Open PDF
        const quizTitleToExport = quiz.title || 'quiz';
        const sanitizedFileName = quizTitleToExport.replace(/[\\/:"*?<>|]+/g, '_') + '.pdf';
        if (Capacitor.isNativePlatform()) {
            // --- Native Save/Open Logic ---
            let permStatus = await Filesystem.checkPermissions();
            if (permStatus.publicStorage !== 'granted') { permStatus = await Filesystem.requestPermissions(); }
            if (permStatus.publicStorage !== 'granted') { showToast("Storage permission needed.", "error"); return; }
            const base64Data = doc.output('datauristring').split(',')[1];
            const directory = Directory.Documents;
            const filePath = sanitizedFileName;
            const result = await Filesystem.writeFile({ path: filePath, data: base64Data, directory: directory, recursive: true });
            showToast("Saved to Documents.", "info");
            await FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' });
            // --- End Native ---
        } else {
            // --- Web Save Logic ---
            doc.save(sanitizedFileName);
            showToast("Quiz exported as PDF.", "success");
            // --- End Web ---
        }

    } catch (error) {
        console.error("Error exporting PDF:", error);
        showToast(`Failed to export PDF: ${error.message}`, "error");
    }
};