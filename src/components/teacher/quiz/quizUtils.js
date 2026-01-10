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
 * MAIN EXPORT FUNCTION
 */
export const handleExportPdf = async (quiz, showToast) => {
    if (!quiz?.questions || quiz.questions.length === 0) {
        showToast("No questions available to export.", "warning");
        return;
    }

    try {
        showToast("Generating PDF...", "info");
        const doc = new jsPDF();
        
        // --- CONFIG ---
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        let yPos = 20;
        
        // Global Question Counter
        let qCounter = 1; 
        
        // --- HEADER ---
        const drawHeader = (isFirstPage = false) => {
            if (isFirstPage) {
                // Title
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text(quiz.title || "Quiz", pageWidth / 2, yPos, { align: 'center' });
                yPos += 10;

                // Subject / Subtitle
                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                const subText = quiz.subjectId ? `Subject Code: ${quiz.subjectId}` : "Assessment";
                doc.text(subText, pageWidth / 2, yPos, { align: 'center' });
                yPos += 20;

                // Student Info Fields
                doc.setFontSize(11);
                doc.text("Name: _________________________________", margin, yPos);
                doc.text("Date: ___________________", pageWidth - margin - 50, yPos);
                yPos += 12;
                doc.text("Grade/Section: _________________________", margin, yPos);
                doc.text("Score: ________ / " + quiz.questions.reduce((a, b) => a + (b.points || 1), 0), pageWidth - margin - 50, yPos);
                yPos += 20;

                // Divider
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
            
            // --- LOGIC UPDATE: Determine Range ---
            const isMatching = q.type === 'matching-type';
            const isEssay = q.type === 'essay';
            
            // Essay now consumes points as items (e.g. 10pts = 10 items)
            // Matching consumes based on number of prompts
            let itemsConsumed = 1;
            if (isMatching) itemsConsumed = q.prompts?.length || 0;
            else if (isEssay) itemsConsumed = points; // Corrected logic for Essay

            const start = qCounter;
            const end = qCounter + itemsConsumed - 1;
            
            // Generate Label: "7." or "7-12."
            const label = itemsConsumed > 1 ? `${start}-${end}.` : `${start}.`;

            checkPageBreak(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);

            // 1. RENDER HEADER
            if (isMatching) {
                // Header: "For items 2-6: Instructions..."
                const rangeLabel = itemsConsumed > 1 ? `For items ${start}-${end}:` : `Item ${start}:`;
                const splitTitle = doc.splitTextToSize(`${rangeLabel} ${qText}`, maxLineWidth);
                doc.text(splitTitle, margin, yPos);
                yPos += (splitTitle.length * 6) + 4;

            } else {
                // Standard Header: "7-10. Question Text... (4 pts)"
                const fullQuestionText = `${label} ${qText} (${points} pts)`;
                const splitTitle = doc.splitTextToSize(fullQuestionText, maxLineWidth);
                doc.text(splitTitle, margin, yPos);
                yPos += (splitTitle.length * 6) + 4;
            }
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);

            // 2. RENDER CONTENT & ANSWER KEY
            if (q.type === 'multiple-choice') {
                (q.options || []).forEach((opt, idx) => {
                    checkPageBreak(8);
                    const optText = stripHtml(opt.text || opt);
                    const letter = String.fromCharCode(65 + idx); // A, B, C
                    const splitOpt = doc.splitTextToSize(`${letter}. ${optText}`, maxLineWidth - 10);
                    
                    doc.text(splitOpt, margin + 8, yPos); 
                    yPos += (splitOpt.length * 6) + 2;
                });

                // Answer Key
                const correctOptIndex = typeof q.correctAnswerIndex === 'number' 
                    ? q.correctAnswerIndex 
                    : q.options.findIndex(o => o.isCorrect);
                const correctLetter = correctOptIndex > -1 ? String.fromCharCode(65 + correctOptIndex) : 'N/A';
                answerKeyData.push([label, correctLetter]);

            } else if (q.type === 'true-false') {
                checkPageBreak(15);
                doc.text("A. True", margin + 8, yPos);
                yPos += 6;
                doc.text("B. False", margin + 8, yPos);
                yPos += 8;

                const ans = q.correctAnswer === true || q.correctAnswer === 'true' ? 'True' : 'False';
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

                const maxCount = Math.max(q.prompts?.length || 0, q.options?.length || 0);
                
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

                    // Render A (Numbered with Global Counter)
                    if (q.prompts[j]) {
                        const pText = stripHtml(q.prompts[j].text);
                        // Individual numbering: 2. 3. 4.
                        const currentNum = qCounter + j;
                        const lines = doc.splitTextToSize(`${currentNum}. ${pText}`, colWidth);
                        doc.text(lines, colA_X, yPos);
                        heightA = lines.length * 5;
                        
                        // Add to Answer Key now
                        const correctId = q.correctPairs?.[q.prompts[j].id];
                        const optIdx = q.options.findIndex(o => o.id === correctId);
                        const letter = optIdx > -1 ? String.fromCharCode(65 + optIdx) : '?';
                        answerKeyData.push([`${currentNum}.`, letter]);
                    }

                    // Render B (Lettered A, B, C...)
                    if (q.options[j]) {
                        const oText = stripHtml(q.options[j].text);
                        const letter = String.fromCharCode(65 + j);
                        const lines = doc.splitTextToSize(`${letter}. ${oText}`, colWidth);
                        doc.text(lines, colB_X, yPos);
                        heightB = lines.length * 5;
                    }

                    yPos += Math.max(heightA, heightB) + 4;
                }

            } else if (q.type === 'image-labeling') {
                // ... Image Logic (Same as before) ...
                if (q.image) {
                    const imgData = await getBase64ImageFromUrl(q.image);
                    if (imgData) {
                        checkPageBreak(90);
                        try {
                            const imgWidth = 120;
                            const imgHeight = 80;
                            const xCentered = (pageWidth - imgWidth) / 2;
                            doc.addImage(imgData, 'JPEG', xCentered, yPos, imgWidth, imgHeight);
                            yPos += imgHeight + 10;
                        } catch (err) {
                            doc.text("[Image Placeholder]", margin + 10, yPos);
                            yPos += 15;
                        }
                    }
                }
                
                checkPageBreak(20);
                doc.text("Identify the parts labeled in the image:", margin + 8, yPos);
                yPos += 10;
                
                (q.parts || []).forEach((part) => {
                    checkPageBreak(10);
                    doc.text(`${part.number}. _____________________________`, margin + 15, yPos);
                    yPos += 10;
                    // Answer Key
                    answerKeyData.push([`${label} (#${part.number})`, stripHtml(part.correctAnswer)]);
                });

            } else if (q.type === 'essay') {
                checkPageBreak(40);
                // Draw lines for writing
                for (let k = 0; k < 6; k++) {
                    doc.line(margin + 5, yPos + (k * 8), pageWidth - margin, yPos + (k * 8));
                }
                yPos += 50;
                
                if (q.rubric && q.rubric.length > 0) {
                    checkPageBreak(20);
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(9);
                    doc.text("Grading Rubric:", margin + 5, yPos);
                    yPos += 5;
                    q.rubric.forEach(r => {
                        doc.text(`• ${stripHtml(r.criteria)} (${r.points} pts)`, margin + 10, yPos);
                        yPos += 5;
                    });
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(11);
                }
                
                // Answer Key - Show Range
                answerKeyData.push([label, "Essay (See Rubric)"]);

            } else {
                // Identification
                checkPageBreak(15);
                doc.text("Answer: _________________________________________", margin + 8, yPos);
                yPos += 12;
                answerKeyData.push([label, stripHtml(q.correctAnswer || '')]);
            }

            yPos += 8; 
            
            // Advance the global counter by the number of items this question block consumed
            qCounter += itemsConsumed;
        }

        // --- ANSWER KEY PAGE ---
        doc.addPage();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Answer Key", pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(quiz.title || "Quiz", pageWidth / 2, 28, { align: 'center' });
        
        autoTable(doc, {
            head: [['Question No.', 'Correct Answer']],
            body: answerKeyData,
            startY: 40,
            theme: 'grid',
            headStyles: { 
                fillColor: [30, 30, 30], 
                textColor: 255, 
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: { 
                fontSize: 10, 
                cellPadding: 3, 
                valign: 'middle' 
            },
            columnStyles: { 
                0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 'auto' }
            },
            margin: { left: margin, right: margin }
        });

        // --- SAVE FILE ---
        const quizTitleToExport = (quiz.title || 'quiz').replace(/[\\/:"*?<>|]+/g, '_');
        const filename = `${quizTitleToExport}_Exam.pdf`;

        if (Capacitor.isNativePlatform()) {
            let permStatus = await Filesystem.checkPermissions();
            if (permStatus.publicStorage !== 'granted') permStatus = await Filesystem.requestPermissions();
            
            if (permStatus.publicStorage === 'granted') {
                const base64Data = doc.output('datauristring').split(',')[1];
                const result = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true
                });
                showToast("Saved to Documents folder.", "success");
                await FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' });
            } else {
                showToast("Storage permission denied.", "error");
            }
        } else {
            doc.save(filename);
            showToast("Quiz exported successfully!", "success");
        }

    } catch (error) {
        console.error("Error exporting PDF:", error);
        showToast(`Export failed: ${error.message}`, "error");
    }
};