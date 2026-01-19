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

const fetchResourceAsBase64 = async (url) => {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onloadend = () => {
                const res = reader.result;
                const base64 = res.replace(/^data:.+;base64,/, '');
                resolve(base64);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Resource load failed:", e);
        return null;
    }
};

// --- FONT HANDLING ---
const registerCustomFonts = async (doc) => {
    const fontUrl = "/fonts/DejaVuSans.ttf"; 
    const fontName = "DejaVuSans";

    const fontBase64 = await fetchResourceAsBase64(fontUrl);

    if (fontBase64) {
        doc.addFileToVFS(`${fontName}.ttf`, fontBase64);
        doc.addFont(`${fontName}.ttf`, fontName, "normal");
        doc.addFont(`${fontName}.ttf`, fontName, "bold");
        return fontName;
    }
    
    console.warn("Custom font not found, falling back to Helvetica.");
    return "helvetica"; 
};

/**
 * MAIN EXPORT FUNCTION
 */
export const handleExportPdf = async (quiz, showToast) => {
    if (!quiz?.questions || quiz.questions.length === 0) {
        showToast("No questions available to export.", "warning");
        return;
    }

    try {
        showToast("Loading fonts & generating PDF...", "info");
        const doc = new jsPDF();
        
        // 1. Load Fonts
        const usedFont = await registerCustomFonts(doc);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        let yPos = 20;
        let qCounter = 1; 

        // Helper: Print Text with strict overflow protection
        const printWrappedText = (text, x, fontSize, isBold = false, indent = 0) => {
            doc.setFont(usedFont, isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            
            const availableWidth = maxLineWidth - indent;
            const lines = doc.splitTextToSize(text, availableWidth);
            const lineHeight = fontSize * 0.45; 

            lines.forEach(line => {
                if (yPos + lineHeight > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(line, x + indent, yPos);
                yPos += lineHeight + 1.5; 
            });
            yPos += 2; 
        };

        const drawHeader = (isFirstPage = false) => {
            if (isFirstPage) {
                doc.setFont(usedFont, "bold");
                doc.setFontSize(22);
                doc.text(quiz.title || "Quiz", pageWidth / 2, yPos, { align: 'center' });
                yPos += 12;

                doc.setFontSize(12);
                doc.setFont(usedFont, "normal");
                const subText = quiz.subjectId ? `Subject Code: ${quiz.subjectId}` : "Assessment";
                doc.text(subText, pageWidth / 2, yPos, { align: 'center' });
                yPos += 20;

                doc.setFontSize(11);
                doc.text("Name: _________________________________", margin, yPos);
                doc.text("Date: ___________________", pageWidth - margin - 50, yPos);
                yPos += 12;
                doc.text("Grade/Section: _________________________", margin, yPos);
                
                const totalPoints = quiz.questions.reduce((a, b) => a + (Number(b.points) || 1), 0);
                doc.text(`Score: ________ / ${totalPoints}`, pageWidth - margin - 50, yPos);
                yPos += 20;

                doc.setLineWidth(0.5);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 10;
            }
        };

        const checkSpace = (heightNeeded = 15) => {
            if (yPos + heightNeeded > pageHeight - margin) {
                doc.addPage();
                yPos = margin; 
            }
        };

        drawHeader(true);
        const answerKeyData = [];
        const explanationData = []; // Store explanations for later

        // --- QUESTIONS LOOP ---
        for (let i = 0; i < quiz.questions.length; i++) {
            const q = quiz.questions[i];
            const qText = stripHtml(q.text || q.question || "Question Text Missing");
            const points = Number(q.points) || 1;
            const explanation = stripHtml(q.explanation || q.solution || '');
            
            const isMatching = q.type === 'matching-type';
            const isEssay = q.type === 'essay';
            
            let itemsConsumed = 1;
            if (isMatching) itemsConsumed = q.prompts?.length || 0;
            else if (isEssay) itemsConsumed = points;

            const start = qCounter;
            const end = qCounter + itemsConsumed - 1;
            const label = itemsConsumed > 1 ? `${start}-${end}.` : `${start}.`;

            checkSpace(15); 

            // Render Question
            if (isMatching) {
                const rangeLabel = itemsConsumed > 1 ? `For items ${start}-${end}:` : `Item ${start}:`;
                printWrappedText(`${rangeLabel} ${qText}`, margin, 11, true);
            } else {
                const fullQuestionText = `${label} ${qText} (${points} pts)`;
                printWrappedText(fullQuestionText, margin, 11, true);
            }
            
            // Render Options & Collect Answer Key
            if (q.type === 'multiple-choice') {
                (q.options || []).forEach((opt, idx) => {
                    const optText = typeof opt === 'object' ? stripHtml(opt.text || '') : stripHtml(opt);
                    const letter = String.fromCharCode(65 + idx);
                    printWrappedText(`${letter}. ${optText}`, margin + 5, 11, false, 5);
                });
                yPos += 3; 

                // Answer Key Logic
                let correctOptIndex = -1;
                if (typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex > -1) {
                    correctOptIndex = q.correctAnswerIndex;
                } else if (Array.isArray(q.options)) {
                    correctOptIndex = q.options.findIndex(o => o.isCorrect === true || o.correct === true);
                }
                const correctLetter = (correctOptIndex >= 0) ? String.fromCharCode(65 + correctOptIndex) : 'N/A';
                answerKeyData.push([label, correctLetter]);
                
                // Store Explanation
                if (explanation) explanationData.push({ label, text: explanation });

            } else if (q.type === 'true-false') {
                printWrappedText("A. True", margin + 8, 11);
                printWrappedText("B. False", margin + 8, 11);
                yPos += 3;
                const ans = (q.correctAnswer === true || String(q.correctAnswer).toLowerCase() === 'true') ? 'True' : 'False';
                answerKeyData.push([label, ans]);
                if (explanation) explanationData.push({ label, text: explanation });

            } else if (q.type === 'matching-type') {
                checkSpace(20);
                // Simple matching rendering
                const colA_X = margin + 5;
                const colB_X = (pageWidth / 2) + 10;
                const colWidth = (pageWidth / 2) - margin - 10;

                doc.setFont(usedFont, "bold");
                doc.text("Column A", colA_X, yPos);
                doc.text("Column B", colB_X, yPos);
                yPos += 8;
                doc.setFont(usedFont, "normal");

                const maxCount = Math.max((q.prompts || []).length, (q.options || []).length);
                for (let j = 0; j < maxCount; j++) {
                     if (yPos + 20 > pageHeight - margin) {
                        doc.addPage();
                        yPos = margin;
                        doc.text("Column A (Cont.)", colA_X, yPos);
                        doc.text("Column B (Cont.)", colB_X, yPos);
                        yPos += 8;
                     }
                     // Render Columns...
                     let hA=0, hB=0;
                     if(q.prompts?.[j]) {
                         const lines = doc.splitTextToSize(`${qCounter + j}. ${stripHtml(q.prompts[j].text)}`, colWidth);
                         doc.text(lines, colA_X, yPos);
                         hA = lines.length * 5;
                         
                         // Matching Answer Key
                         const correctId = q.correctPairs?.[q.prompts[j].id];
                         const optIdx = (q.options || []).findIndex(o => o.id === correctId);
                         const letter = optIdx > -1 ? String.fromCharCode(65 + optIdx) : '?';
                         answerKeyData.push([`${qCounter+j}.`, letter]);
                     }
                     if(q.options?.[j]) {
                         const lines = doc.splitTextToSize(`${String.fromCharCode(65+j)}. ${stripHtml(q.options[j].text)}`, colWidth);
                         doc.text(lines, colB_X, yPos);
                         hB = lines.length * 5;
                     }
                     yPos += Math.max(hA, hB) + 4;
                }
                if (explanation) explanationData.push({ label: `Items ${start}-${end}`, text: explanation });

            } else {
                // Essay / Identification
                checkSpace(20);
                doc.text("Answer: _________________________________________", margin + 8, yPos);
                yPos += 15;
                const ans = isEssay ? "See Rubric" : stripHtml(q.correctAnswer || '');
                answerKeyData.push([label, ans]);
                if (explanation) explanationData.push({ label, text: explanation });
            }

            yPos += 5; 
            qCounter += itemsConsumed;
        }

        // --- PAGE: ANSWER KEY ---
        doc.addPage();
        doc.setFont(usedFont, "bold");
        doc.setFontSize(16);
        doc.text("Answer Key", pageWidth / 2, 20, { align: 'center' });
        
        autoTable(doc, {
            head: [['Question No.', 'Correct Answer']],
            body: answerKeyData,
            startY: 40,
            theme: 'grid',
            styles: { font: usedFont },
            headStyles: { fillColor: [30, 30, 30], textColor: 255, halign: 'center' },
            columnStyles: { 0: { cellWidth: 40, halign: 'center' } }
        });

        // --- PAGE: EXPLANATIONS (NEW) ---
        if (explanationData.length > 0) {
            doc.addPage();
            yPos = 20;
            doc.setFont(usedFont, "bold");
            doc.setFontSize(16);
            doc.text("Explanations / Rationalization", pageWidth / 2, yPos, { align: 'center' });
            yPos += 20;

            explanationData.forEach(item => {
                checkSpace(20);
                // Bold Question Number
                doc.setFont(usedFont, "bold");
                doc.setFontSize(11);
                doc.text(`Question ${item.label}`, margin, yPos);
                
                // Normal Text Explanation
                doc.setFont(usedFont, "normal");
                const splitExp = doc.splitTextToSize(item.text, maxLineWidth - 5);
                doc.text(splitExp, margin + 5, yPos + 6);
                
                yPos += (splitExp.length * 5) + 15; // Spacing between items
            });
        }

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