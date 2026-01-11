import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

// --- HELPERS ---

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

const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

const getBase64ImageFromUrl = async (imageUrl) => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to load image for PDF", e);
        return null;
    }
};

/**
 * MAIN EXPORT FUNCTION - FIXED FOR MULTIPLE CHOICE ANSWER KEY
 */
export const handleExportPdf = async (quiz, showToast) => {
    if (!quiz?.questions || quiz.questions.length === 0) {
        showToast("No questions available to export.", "warning");
        return;
    }

    try {
        showToast("Generating PDF...", "info");
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        let yPos = 20;
        let qCounter = 1; 
        
        const drawHeader = (isFirstPage = false) => {
            if (isFirstPage) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text(quiz.title || "Quiz", pageWidth / 2, yPos, { align: 'center' });
                yPos += 10;

                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                const subText = quiz.subjectId ? `Subject Code: ${quiz.subjectId}` : "Assessment";
                doc.text(subText, pageWidth / 2, yPos, { align: 'center' });
                yPos += 20;

                doc.setFontSize(11);
                doc.text("Name: _________________________________", margin, yPos);
                doc.text("Date: ___________________", pageWidth - margin - 50, yPos);
                yPos += 12;
                doc.text("Grade/Section: _________________________", margin, yPos);
                doc.text("Score: ________ / " + quiz.questions.reduce((a, b) => a + (b.points || 1), 0), pageWidth - margin - 50, yPos);
                yPos += 20;

                doc.setLineWidth(0.5);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 10;
            }
        };

        const checkPageBreak = (heightNeeded = 15) => {
            if (yPos + heightNeeded > pageHeight - margin) {
                doc.addPage();
                yPos = margin; 
            }
        };

        drawHeader(true);
        const answerKeyData = [];

        // --- QUESTIONS LOOP ---
        for (let i = 0; i < quiz.questions.length; i++) {
            const q = quiz.questions[i];
            const qText = stripHtml(q.text || q.question || "Question Text Missing");
            const points = Number(q.points) || 1;
            
            const isMatching = q.type === 'matching-type';
            const isEssay = q.type === 'essay';
            
            let itemsConsumed = 1;
            if (isMatching) itemsConsumed = q.prompts?.length || 0;
            else if (isEssay) itemsConsumed = points;

            const start = qCounter;
            const end = qCounter + itemsConsumed - 1;
            const label = itemsConsumed > 1 ? `${start}-${end}.` : `${start}.`;

            checkPageBreak(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);

            if (isMatching) {
                const rangeLabel = itemsConsumed > 1 ? `For items ${start}-${end}:` : `Item ${start}:`;
                const splitTitle = doc.splitTextToSize(`${rangeLabel} ${qText}`, maxLineWidth);
                doc.text(splitTitle, margin, yPos);
                yPos += (splitTitle.length * 6) + 4;
            } else {
                const fullQuestionText = `${label} ${qText} (${points} pts)`;
                const splitTitle = doc.splitTextToSize(fullQuestionText, maxLineWidth);
                doc.text(splitTitle, margin, yPos);
                yPos += (splitTitle.length * 6) + 4;
            }
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);

            // --- 2. RENDER CONTENT & CORRECTED ANSWER KEY LOGIC ---
            if (q.type === 'multiple-choice') {
                (q.options || []).forEach((opt, idx) => {
                    checkPageBreak(8);
                    // Handle both string and object options
                    const optText = typeof opt === 'object' ? stripHtml(opt.text || '') : stripHtml(opt);
                    const letter = String.fromCharCode(65 + idx);
                    const splitOpt = doc.splitTextToSize(`${letter}. ${optText}`, maxLineWidth - 10);
                    
                    doc.text(splitOpt, margin + 8, yPos); 
                    yPos += (splitOpt.length * 6) + 2;
                });

                // --- ROBUST SEARCH FOR CORRECT ANSWER ---
                let correctOptIndex = -1;

                // Priority 1: Check correctAnswerIndex (Manual Creator / AiQuizGenerator)
                if (typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex > -1) {
                    correctOptIndex = q.correctAnswerIndex;
                } 
                // Priority 2: Check for isCorrect property inside options (AiQuizGenerator)
                else if (Array.isArray(q.options)) {
                    correctOptIndex = q.options.findIndex(o => o.isCorrect === true || o.correct === true);
                }
                // Priority 3: Check for "A", "B", "C" label in correctAnswer (AiQuizModal)
                if (correctOptIndex === -1 && typeof q.correctAnswer === 'string') {
                    const labelMatch = q.correctAnswer.trim().toUpperCase();
                    if (labelMatch.length === 1) {
                        correctOptIndex = labelMatch.charCodeAt(0) - 65;
                    }
                }

                const correctLetter = (correctOptIndex >= 0 && correctOptIndex < (q.options?.length || 4)) 
                    ? String.fromCharCode(65 + correctOptIndex) 
                    : 'N/A';
                
                answerKeyData.push([label, correctLetter]);

            } else if (q.type === 'true-false') {
                checkPageBreak(15);
                doc.text("A. True", margin + 8, yPos);
                yPos += 6;
                doc.text("B. False", margin + 8, yPos);
                yPos += 8;

                const ans = (q.correctAnswer === true || String(q.correctAnswer).toLowerCase() === 'true') ? 'True' : 'False';
                answerKeyData.push([label, ans]);

            } else if (q.type === 'matching-type') {
                checkPageBreak(40);
                const colA_X = margin + 5;
                const colB_X = (pageWidth / 2) + 10;
                const colWidth = (pageWidth / 2) - margin - 10;

                doc.setFont("helvetica", "bold");
                doc.text("Column A", colA_X, yPos);
                doc.text("Column B", colB_X, yPos);
                yPos += 8;
                doc.setFont("helvetica", "normal");

                const maxCount = Math.max((q.prompts || []).length, (q.options || []).length);
                
                for (let j = 0; j < maxCount; j++) {
                    if (yPos + 15 > pageHeight - margin) {
                        doc.addPage();
                        yPos = margin;
                        doc.setFont("helvetica", "bold");
                        doc.text("Column A (Cont.)", colA_X, yPos);
                        doc.text("Column B (Cont.)", colB_X, yPos);
                        yPos += 8;
                        doc.setFont("helvetica", "normal");
                    }

                    let heightA = 0;
                    let heightB = 0;

                    if (q.prompts?.[j]) {
                        const pText = stripHtml(q.prompts[j].text);
                        const currentNum = qCounter + j;
                        const lines = doc.splitTextToSize(`${currentNum}. ${pText}`, colWidth);
                        doc.text(lines, colA_X, yPos);
                        heightA = lines.length * 5;
                        
                        const correctId = q.correctPairs?.[q.prompts[j].id];
                        const optIdx = (q.options || []).findIndex(o => o.id === correctId);
                        const letter = optIdx > -1 ? String.fromCharCode(65 + optIdx) : '?';
                        answerKeyData.push([`${currentNum}.`, letter]);
                    }

                    if (q.options?.[j]) {
                        const oText = stripHtml(q.options[j].text);
                        const letter = String.fromCharCode(65 + j);
                        const lines = doc.splitTextToSize(`${letter}. ${oText}`, colWidth);
                        doc.text(lines, colB_X, yPos);
                        heightB = lines.length * 5;
                    }
                    yPos += Math.max(heightA, heightB) + 4;
                }

            } else if (q.type === 'essay') {
                checkPageBreak(40);
                for (let k = 0; k < 6; k++) {
                    doc.line(margin + 5, yPos + (k * 8), pageWidth - margin, yPos + (k * 8));
                }
                yPos += 50;
                answerKeyData.push([label, "Essay (See Rubric)"]);

            } else {
                checkPageBreak(15);
                doc.text("Answer: _________________________________________", margin + 8, yPos);
                yPos += 12;
                answerKeyData.push([label, stripHtml(q.correctAnswer || '')]);
            }

            yPos += 8; 
            qCounter += itemsConsumed;
        }

        // --- ANSWER KEY PAGE ---
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Answer Key", pageWidth / 2, 20, { align: 'center' });
        
        autoTable(doc, {
            head: [['Question No.', 'Correct Answer']],
            body: answerKeyData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [30, 30, 30], textColor: 255, halign: 'center' },
            columnStyles: { 0: { cellWidth: 30, halign: 'center' } }
        });

        // --- SAVE FILE ---
        const filename = `${(quiz.title || 'quiz').replace(/[\\/:"*?<>|]+/g, '_')}_Exam.pdf`;

        if (Capacitor.isNativePlatform()) {
            const base64Data = doc.output('datauristring').split(',')[1];
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents
            });
            await FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' });
        } else {
            doc.save(filename);
            showToast("Quiz exported successfully!", "success");
        }

    } catch (error) {
        console.error("Export failed:", error);
        showToast(`Export failed: ${error.message}`, "error");
    }
};