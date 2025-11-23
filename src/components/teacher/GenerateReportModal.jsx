import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel } from '@tremor/react';
import { useToast } from '../../contexts/ToastContext';
import { motion } from 'framer-motion';
import {
    DocumentChartBarIcon,
    XMarkIcon,
    ChevronDownIcon,
    FunnelIcon,
    CheckIcon
} from '@heroicons/react/24/outline';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

const dropIn = {
    hidden: { y: 20, opacity: 0, scale: 0.98, filter: "blur(4px)" },
    visible: {
        y: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: 0.4, type: "spring", bounce: 0.3 },
    },
    exit: { y: 20, opacity: 0, scale: 0.98, filter: "blur(4px)", transition: { duration: 0.2 } },
};

export default function GenerateReportModal({
    isOpen,
    onClose,
    classData,
    availableQuizzes,
    quizScores,
    lessons,
    units,
    sharedContentPosts,
    className
}) {
    const { showToast } = useToast();
    
    const [selectedInstances, setSelectedInstances] = useState(new Set());
    const [sortOption, setSortOption] = useState('gender-lastName');
    
    const [collapsedPosts, setCollapsedPosts] = useState(new Set());
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());
    const [isGenerating, setIsGenerating] = useState(false);

    const students = classData?.students || [];
    const quizzes = availableQuizzes || [];
    const scores = quizScores || [];
    const unitMap = units || {};
    const posts = sharedContentPosts || [];

    const getInstanceKey = (postId, quizId) => `${postId}|${quizId}`;

    const handleInstanceSelection = (postId, quizId) => {
        const key = getInstanceKey(postId, quizId);
        setSelectedInstances(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    };

    const handleBulkSelection = (postId, quizIdsInGroup) => {
        const keys = quizIdsInGroup.map(qId => getInstanceKey(postId, qId));
        const allSelected = keys.every(key => selectedInstances.has(key));

        setSelectedInstances(prev => {
            const newSet = new Set(prev);
            if (allSelected) {
                keys.forEach(k => newSet.delete(k));
            } else {
                keys.forEach(k => newSet.add(k));
            }
            return newSet;
        });
    };

    useEffect(() => {
        if (isOpen) {
            const newCollapsedPosts = new Set();
            const newCollapsedUnits = new Set();
            
            posts.forEach(post => {
                const postQuizzes = (post.quizzes || []);
                if (postQuizzes.length > 0) {
                    newCollapsedPosts.add(post.id);
                    postQuizzes.forEach(quiz => {
                        const unitDisplayName = unitMap[quiz.unitId] || 'Uncategorized';
                        newCollapsedUnits.add(`${post.id}_${unitDisplayName}`);
                    });
                }
            });
            
            setCollapsedPosts(newCollapsedPosts);
            setCollapsedUnits(newCollapsedUnits);
        }
    }, [isOpen, posts, unitMap]);

    const togglePostCollapse = (postId) => {
        setCollapsedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });
    };

    const toggleUnitCollapse = (postId, unitDisplayName) => {
        const unitKey = `${postId}_${unitDisplayName}`;
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitKey)) newSet.delete(unitKey);
            else newSet.add(unitKey);
            return newSet;
        });
    };

    const handleGenerate = async () => {
        if (selectedInstances.size === 0) {
            return showToast("Please select at least one quiz to include in the report.", "error");
        }

        setIsGenerating(true);

        let XLSX;
        try {
            XLSX = await import('xlsx-js-style');
        } catch (error) {
            console.error("Failed to load Excel library:", error);
            showToast("Failed to load report generator.", "error");
            setIsGenerating(false);
            return;
        }

        try {
            const selectedKeys = Array.from(selectedInstances);
            const selectedPairs = selectedKeys.map(k => {
                const [pId, qId] = k.split('|');
                return { postId: pId, quizId: qId };
            });

            const uniqueQuizIds = [...new Set(selectedPairs.map(p => p.quizId))];

            const uniqueQuizMap = new Map();
            quizzes.forEach(q => {
                if (uniqueQuizIds.includes(q.id)) {
                    if (!uniqueQuizMap.has(q.id)) {
                        uniqueQuizMap.set(q.id, q);
                    }
                }
            });
            const selectedQuizzes = Array.from(uniqueQuizMap.values());

            const uniquePostIds = [...new Set(selectedPairs.map(p => p.postId))];
            const relevantPosts = posts.filter(p => uniquePostIds.includes(p.id));

            let sortedStudents = [...students];
            sortedStudents.sort((a, b) => {
                const aGender = a.gender || 'Ungrouped';
                const bGender = b.gender || 'Ungrouped';
                const genderOrder = { 'Male': 1, 'Female': 2, 'Ungrouped': 3 };

                if (genderOrder[aGender] !== genderOrder[bGender]) {
                    return genderOrder[aGender] - genderOrder[bGender];
                }
                if (sortOption === 'gender-firstName') {
                    return (a.firstName || '').localeCompare(b.firstName || '');
                }
                return (a.lastName || '').localeCompare(b.lastName || '');
            });

            const borderColor = { rgb: "B7B7B7" }; 
        
            const commonBorderStyle = {
                top: { style: "thin", color: borderColor },
                bottom: { style: "thin", color: borderColor },
                left: { style: "thin", color: borderColor },
                right: { style: "thin", color: borderColor },
            };

            const defaultCellStyle = {
                alignment: { vertical: 'center', horizontal: 'center', wrapText: false },
                font: { sz: 12, name: 'Calibri', color: { rgb: "333333" } },
                border: commonBorderStyle
            };
        
            const leftAlignStyle = {
                ...defaultCellStyle,
                alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
            };

            const topHeaderStyle = {
                font: { bold: true, sz: 24, name: 'Calibri', color: { rgb: "1F4E78" } }, 
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: "FFFFFF" } },
                border: {} 
            };

            const subHeaderStyle = {
                font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: "44546A" } }, 
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: "FFFFFF" } },
                border: { bottom: { style: "thick", color: { rgb: "1F4E78" } } } 
            };

            const sectionTitleStyle = {
                font: { bold: true, sz: 14, name: 'Calibri', color: { rgb: "FFFFFF" } },
                alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
                fill: { fgColor: { rgb: "44546A" } }, 
                border: commonBorderStyle
            };

            const tableHeaderStyle = {
                font: { bold: true, sz: 12, name: 'Calibri', color: { rgb: "FFFFFF" } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                fill: { fgColor: { rgb: "1F4E78" } }, 
                border: commonBorderStyle
            };

            const subTableHeaderStyle = {
                font: { sz: 10, name: 'Calibri', italic: true, color: { rgb: "000000" } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: "D9E1F2" } }, 
                border: commonBorderStyle
            };

            const grandTotalStyle = {
                font: { bold: true, sz: 12, name: 'Calibri', color: { rgb: "000000" } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: "E7E6E6" } }, 
                border: { 
                    top: { style: "thin", color: borderColor },
                    bottom: { style: "double", color: { rgb: "000000" } }, 
                    left: { style: "thin", color: borderColor },
                    right: { style: "thin", color: borderColor },
                }
            };

            const studentNameCellStyle = {
                alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
                font: { sz: 12, name: 'Calibri', bold: true, color: { rgb: "333333" } },
                border: commonBorderStyle,
                fill: { fgColor: { rgb: "F2F2F2" } }
            };

            const boldScoreCellStyle = {
                alignment: { vertical: 'center', horizontal: 'center' },
                font: { sz: 12, name: 'Calibri', bold: true },
                border: commonBorderStyle
            };

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([[]]);
            worksheet['!ref'] = 'A1';
            let rowIndex = 0;
        
            const rowHeights = [];

            const addCell = (row, col, value, style) => {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                worksheet[cellAddress] = { v: value, s: style };
                const currentRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                currentRange.s.r = Math.min(currentRange.s.r, row);
                currentRange.s.c = Math.min(currentRange.s.c, col);
                currentRange.e.r = Math.max(currentRange.e.r, row);
                currentRange.e.c = Math.max(currentRange.e.c, col);
                worksheet['!ref'] = XLSX.utils.encode_range(currentRange);
            };

            const addRowData = (dataArray, height = 25) => {
                const currentRow = rowIndex;
                rowHeights[currentRow] = { hpt: height }; 
                dataArray.forEach((value, colIndex) => {
                    addCell(currentRow, colIndex, value, defaultCellStyle);
                });
                rowIndex++;
            };

            const addMergedCellStyled = (startRow, startCol, endRow, endCol, text, style) => {
                worksheet['!merges'] = worksheet['!merges'] || [];
                worksheet['!merges'].push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } });
                addCell(startRow, startCol, text, style);
            };
        
            addRowData([], 15); 
            addMergedCellStyled(rowIndex, 0, rowIndex, 12, "San Ramon Catholic School, Inc.", topHeaderStyle);
            rowHeights[rowIndex] = { hpt: 40 }; 
            rowIndex++;
        
            addMergedCellStyled(rowIndex, 0, rowIndex, 12, `${classData.name || 'N/A'} - Quiz Report`, subHeaderStyle);
            rowHeights[rowIndex] = { hpt: 30 }; 
            rowIndex++;
        
            addRowData([], 15); 

            addMergedCellStyled(rowIndex, 0, rowIndex, 12, "Basic Information", sectionTitleStyle);
            rowHeights[rowIndex] = { hpt: 25 };
            rowIndex++;
        
            let minDate = null;
            let maxDate = null;
            relevantPosts.forEach(post => {
                if (post.availableFrom && post.availableFrom.toDate) {
                    const fromDate = post.availableFrom.toDate();
                    if (!minDate || fromDate < minDate) minDate = fromDate;
                }
                if (post.availableUntil && post.availableUntil.toDate) {
                    const untilDate = post.availableUntil.toDate();
                    if (!maxDate || untilDate > maxDate) maxDate = untilDate;
                }
            });
            let dateRangeString = 'No specific date range';
            if (minDate && maxDate) dateRangeString = `${minDate.toLocaleDateString()} – ${maxDate.toLocaleDateString()}`;
            else if (minDate) dateRangeString = `From ${minDate.toLocaleDateString()}`;
            else if (maxDate) dateRangeString = `Until ${maxDate.toLocaleDateString()}`;

            addRowData([`Class: ${classData.name || 'N/A'}`]);
            addCell(rowIndex - 1, 0, `Class: ${classData.name || 'N/A'}`, leftAlignStyle);
            worksheet['!merges'].push({ s: { r: rowIndex-1, c: 0 }, e: { r: rowIndex-1, c: 3 } });

            addRowData([`Reporting Period: ${dateRangeString}`]);
            addCell(rowIndex - 1, 0, `Reporting Period: ${dateRangeString}`, leftAlignStyle);
            worksheet['!merges'].push({ s: { r: rowIndex-1, c: 0 }, e: { r: rowIndex-1, c: 3 } });

            addRowData([], 20); 

            addMergedCellStyled(rowIndex, 0, rowIndex, 6, "Topic Statistics", sectionTitleStyle);
            rowIndex++;
        
            const topicHeaders = ["Quiz Name", "Course", "Avg First Attempt", "Avg Highest Score", "Questions", "Max Score", "Completed By"];
            addRowData(topicHeaders, 30);
            for(let i=0; i<topicHeaders.length; i++) addCell(rowIndex - 1, i, topicHeaders[i], tableHeaderStyle);
        
            let grandTotalQuestions = 0;

            selectedQuizzes.forEach(quiz => {
                const quizSubmissions = scores.filter(s => s.quizId === quiz.id);
                const firstAttempts = quizSubmissions.filter(s => s.attemptNumber === 1);
                const sumFirstAttemptScores = firstAttempts.reduce((sum, sub) => sum + sub.score, 0);
                const sumFirstAttemptTotalItems = firstAttempts.reduce((sum, sub) => sum + sub.totalItems, 0);
                const avgFirstAttemptPercentage = sumFirstAttemptTotalItems > 0 ? `${((sumFirstAttemptScores / sumFirstAttemptTotalItems) * 100).toFixed(2)}%` : '0.00%';
            
                const studentHighestScores = {};
                quizSubmissions.forEach(sub => {
                    if (!studentHighestScores[sub.studentId] || sub.score > studentHighestScores[sub.studentId].score) studentHighestScores[sub.studentId] = sub;
                });
                const sumHighestScores = Object.values(studentHighestScores).reduce((sum, sub) => sum + sub.score, 0);
                const sumHighestTotalItems = Object.values(studentHighestScores).reduce((sum, sub) => sum + sub.totalItems, 0);
                const avgHighestAttemptPercentage = sumHighestTotalItems > 0 ? `${((sumHighestScores / sumHighestTotalItems) * 100).toFixed(2)}%` : '0.00%';
                const studentsCompletedCount = new Set(quizSubmissions.map(s => s.studentId)).size;
            
                const questionCount = quiz.questions ? quiz.questions.length : 0;
                grandTotalQuestions += questionCount;

                const rowData = [quiz.title, quiz.courseName || 'N/A', avgFirstAttemptPercentage, avgHighestAttemptPercentage, questionCount, questionCount, studentsCompletedCount];
                addRowData(rowData);
                for(let i=0; i<rowData.length; i++) {
                    if(i === 0 || i === 1) addCell(rowIndex - 1, i, rowData[i], leftAlignStyle); 
                    else addCell(rowIndex - 1, i, rowData[i], defaultCellStyle); 
                }
            });

            const totalRowData = ["GRAND TOTAL", "", "", "", grandTotalQuestions, grandTotalQuestions, ""];
            addRowData(totalRowData, 30); 
            worksheet['!merges'].push({ s: { r: rowIndex-1, c: 0 }, e: { r: rowIndex-1, c: 3 } });
        
            addCell(rowIndex - 1, 0, "GRAND TOTAL", grandTotalStyle); 
            addCell(rowIndex - 1, 1, "", grandTotalStyle);
            addCell(rowIndex - 1, 2, "", grandTotalStyle);
            addCell(rowIndex - 1, 3, "", grandTotalStyle);
            addCell(rowIndex - 1, 4, grandTotalQuestions, grandTotalStyle);
            addCell(rowIndex - 1, 5, grandTotalQuestions, grandTotalStyle);
            addCell(rowIndex - 1, 6, "", grandTotalStyle);

            addRowData([], 25); 

            let headerRow1_start = rowIndex;
        
            addMergedCellStyled(headerRow1_start, 0, headerRow1_start + 1, 0, "Learner's Name", tableHeaderStyle);
            addMergedCellStyled(headerRow1_start, 1, headerRow1_start + 1, 1, "Status", tableHeaderStyle);
        
            let currentHeaderCol = 2;
            selectedQuizzes.forEach(quiz => {
                addMergedCellStyled(headerRow1_start, currentHeaderCol, headerRow1_start, currentHeaderCol + 3, quiz.title, tableHeaderStyle);
                currentHeaderCol += 4;
            });
        
            addMergedCellStyled(headerRow1_start, currentHeaderCol, headerRow1_start + 1, currentHeaderCol, "Total First Attempt", tableHeaderStyle);
            addMergedCellStyled(headerRow1_start, currentHeaderCol + 1, headerRow1_start + 1, currentHeaderCol + 1, "Total Highest", tableHeaderStyle);
        
            rowIndex++;
            let subHeaderRowData = ["", ""];
            selectedQuizzes.forEach(() => subHeaderRowData.push("First Attempt", "% Score", "Highest", "% Score"));
            subHeaderRowData.push("", ""); 
        
            rowIndex++; 
            rowHeights[rowIndex - 1] = { hpt: 30 }; 
        
            subHeaderRowData.forEach((val, col) => {
                    if(val) addCell(rowIndex - 1, col, val, subTableHeaderStyle);
            });
        
            let lastGender = null;
        
            sortedStudents.forEach(student => {
                if (sortOption.startsWith('gender') && (student.gender || 'Ungrouped') !== lastGender) {
                    lastGender = student.gender || 'Ungrouped';
                    addMergedCellStyled(rowIndex, 0, rowIndex, (2 + selectedQuizzes.length * 4 + 2) - 1, `Gender: ${lastGender}`, sectionTitleStyle);
                    rowHeights[rowIndex] = { hpt: 25 };
                    rowIndex++;
                }

                const hasCompletedAnySelectedQuiz = scores.some(s => s.studentId === student.id && uniqueQuizIds.includes(s.quizId));
                let totalFirstAttemptRawScore = 0;
                let totalHighestRawScore = 0;
            
                const rowData = [`${student.lastName}, ${student.firstName}`, hasCompletedAnySelectedQuiz ? '✓' : ''];
            
                selectedQuizzes.forEach(quiz => {
                    const studentQuizSubmissions = scores.filter(s => s.studentId === student.id && s.quizId === quiz.id);
                    const firstAttempt = studentQuizSubmissions.find(s => s.attemptNumber === 1);
                    const firstAttemptRawScore = firstAttempt ? firstAttempt.score : '-';
                    const firstAttemptPercentage = firstAttempt ? `${((firstAttempt.score / firstAttempt.totalItems) * 100).toFixed(2)}%` : '-';
                
                    let highestScoreSubmission = studentQuizSubmissions.reduce((highest, current) => (!highest || current.score > highest.score) ? current : highest, null);
                    const highestRawScore = highestScoreSubmission ? highestScoreSubmission.score : '-';
                    const highestPercentage = highestScoreSubmission ? `${((highestScoreSubmission.score / highestScoreSubmission.totalItems) * 100).toFixed(2)}%` : '-';
                
                    rowData.push(firstAttemptRawScore, firstAttemptPercentage, highestRawScore, highestPercentage);
                
                    if (typeof firstAttemptRawScore === 'number') totalFirstAttemptRawScore += firstAttemptRawScore;
                    if (typeof highestRawScore === 'number') totalHighestRawScore += highestRawScore;
                });
            
                rowData.push(totalFirstAttemptRawScore, totalHighestRawScore);
                addRowData(rowData, 25); 
            
                const totalFirstAttemptIndex = rowData.length - 2; 
            
                for(let i=0; i<rowData.length; i++) {
                    if (i === 0) addCell(rowIndex - 1, i, rowData[i], studentNameCellStyle);
                    else if (i === 1) addCell(rowIndex - 1, i, rowData[i], defaultCellStyle);
                    else if (i === totalFirstAttemptIndex) addCell(rowIndex - 1, i, rowData[i], boldScoreCellStyle); 
                    else addCell(rowIndex - 1, i, rowData[i], defaultCellStyle);
                }
            });

            worksheet['!rows'] = rowHeights;

            const studentCols = 2 + selectedQuizzes.length * 4 + 2;
            worksheet['!cols'] = [
                { wch: 35 }, 
                { wch: 8 },  
                ...Array(selectedQuizzes.length * 4).fill({ wch: 16 }), 
                { wch: 20 }, 
                { wch: 20 }  
            ];
        
            worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIndex - 1, c: studentCols - 1 } });
            XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Scores Report");
        
            const fileName = `${classData.name || 'Class'} - Quiz Report.xlsx`;

            if (Capacitor.isNativePlatform()) {
                let permStatus = await Filesystem.checkPermissions();
                if (permStatus.publicStorage !== 'granted') {
                    permStatus = await Filesystem.requestPermissions();
                }
                if (permStatus.publicStorage !== 'granted') {
                    showToast("Storage permission is required to save files.", "error");
                    setIsGenerating(false);
                    return; 
                }
                const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents, 
                    recursive: true
                });
                showToast("File saved to Documents folder.", "info");
                await FileOpener.open({
                    filePath: result.uri,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });
            } else {
                XLSX.writeFile(workbook, fileName);
                showToast("Report generated successfully.", "success");
            }
            onClose(); 
        } catch (error) {
            console.error("Error generating report:", error);
            showToast(`Failed to generate report: ${error.message}`, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        setSelectedInstances(new Set()); 
        setSortOption('gender-lastName');
        setCollapsedPosts(new Set());
        setCollapsedUnits(new Set());
        onClose();
    };

    const quizzesByPostAndUnit = posts.reduce((acc, post) => {
        const postQuizzes = (post.quizzes || []);
        if (postQuizzes.length === 0) return acc;
        if (!acc[post.id]) acc[post.id] = { post: post, units: {} };
        postQuizzes.forEach(quizDetails => {
            const unitDisplayName = unitMap[quizDetails.unitId] || 'Uncategorized';
            if (!acc[post.id].units[unitDisplayName]) acc[post.id].units[unitDisplayName] = [];
            acc[post.id].units[unitDisplayName].push({ id: quizDetails.id, title: quizDetails.title });
        });
        return acc;
    }, {});

    const postEntries = Object.values(quizzesByPostAndUnit).sort((a, b) => 
        (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0)
    );

    const customUnitSort = (a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        const numA = parseInt(a.match(/\d+/)?.[0], 10);
        const numB = parseInt(b.match(/\d+/)?.[0], 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.localeCompare(b);
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className={className}>
            {/* MOBILE SUPPORT:
                - Added `sm:p-6` padding, defaults to 0 padding on mobile for full screen feel.
                - Backdrop blur is heavier for that premium glass effect.
            */}
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md transition-opacity" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-end sm:items-center justify-center sm:p-4">
                <DialogPanel as={motion.div}
                    variants={dropIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full h-[100dvh] sm:h-[85vh] sm:max-w-5xl bg-[#fbfbfd] dark:bg-[#1c1c1e] sm:rounded-[28px] flex flex-col overflow-hidden shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:ring-white/10"
                >
                    {/* HEADER 
                       - Sticky styling, glass border
                    */}
                    <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-10 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
                                <DocumentChartBarIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">
                                    Generate Report
                                </h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-tight">Select data to export</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleClose} 
                            className="p-2 rounded-full bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 transition-all text-slate-500 dark:text-slate-400 active:scale-95"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </header>

                    {/* MAIN CONTENT BODY
                        - Mobile: Flex-col, single scroll container.
                        - Desktop: Grid layout, split pane feel.
                    */}
                    <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden p-4 sm:p-6 md:p-8">
                        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 h-full">
                            
                            {/* LEFT COLUMN: SELECTION LIST 
                                Mobile: flex-1 ensures it takes remaining vertical space.
                            */}
                            <div className="flex-1 lg:col-span-7 flex flex-col bg-white dark:bg-[#2c2c2e]/50 rounded-[20px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm overflow-hidden min-h-0">
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 backdrop-blur-sm z-10">
                                    <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                        Select Quizzes
                                    </label>
                                    <span className="px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-300">
                                        {quizzes.length} Available
                                    </span>
                                </div>
                                
                                {quizzes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                                            <DocumentChartBarIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No quizzes found</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                                        {postEntries.map(({ post, units: unitsInPost }) => {
                                            const isPostCollapsed = collapsedPosts.has(post.id);
                                            const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                                            const sentDate = post.createdAt?.toDate() ? post.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A';
                                            const allQuizIdsInPost = sortedUnitKeys.flatMap(unitKey => unitsInPost[unitKey].map(q => q.id));
                                            const allInstanceKeysInPost = allQuizIdsInPost.map(qId => getInstanceKey(post.id, qId));
                                            const allSelectedInPost = allInstanceKeysInPost.length > 0 && allInstanceKeysInPost.every(key => selectedInstances.has(key));
                                            const someSelectedInPost = allInstanceKeysInPost.some(key => selectedInstances.has(key)) && !allSelectedInPost;

                                            return (
                                                <div key={post.id} className="bg-white dark:bg-[#1c1c1e] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden transition-all">
                                                    {/* Post Row */}
                                                    <div 
                                                        className="flex items-center gap-3 p-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                                        onClick={() => togglePostCollapse(post.id)}
                                                    >
                                                        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center pl-1">
                                                             {/* Custom Checkbox Design */}
                                                             <div 
                                                                className={`w-5 h-5 rounded-[6px] flex items-center justify-center transition-all duration-200 border ${
                                                                    allSelectedInPost || someSelectedInPost 
                                                                    ? 'bg-[#007AFF] border-[#007AFF]' 
                                                                    : 'bg-white dark:bg-white/5 border-slate-300 dark:border-slate-600 group-hover:border-[#007AFF]/50'
                                                                }`}
                                                                onClick={() => handleBulkSelection(post.id, allQuizIdsInPost)}
                                                             >
                                                                {allSelectedInPost && <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                                                {someSelectedInPost && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                                             </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-[13px] text-slate-900 dark:text-white truncate leading-tight">{post.title}</h4>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{sentDate}</p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 transition-transform duration-300 ${isPostCollapsed ? '' : 'rotate-180'}`}>
                                                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Expanded Content */}
                                                    {!isPostCollapsed && (
                                                        <div className="pl-11 pr-3 pb-3 pt-0 space-y-2">
                                                            <div className="h-px w-full bg-slate-100 dark:bg-white/5 mb-2" />
                                                            {sortedUnitKeys.map(unitDisplayName => {
                                                                const quizzesInUnit = unitsInPost[unitDisplayName] || [];
                                                                const quizIdsInUnit = quizzesInUnit.map(q => q.id);
                                                                const unitInstanceKeys = quizIdsInUnit.map(qId => getInstanceKey(post.id, qId));
                                                                const allSelected = unitInstanceKeys.length > 0 && unitInstanceKeys.every(k => selectedInstances.has(k));
                                                                const someSelected = unitInstanceKeys.some(k => selectedInstances.has(k)) && !allSelected;
                                                                const unitKey = `${post.id}_${unitDisplayName}`;
                                                                const isUnitCollapsed = collapsedUnits.has(unitKey);

                                                                return (
                                                                    <div key={unitKey}>
                                                                        <div className="flex items-center gap-2 py-1 group/unit cursor-pointer" onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}>
                                                                             {/* Unit Bulk Select */}
                                                                             <div 
                                                                                className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-all duration-200 border ${
                                                                                    allSelected || someSelected
                                                                                    ? 'bg-[#007AFF] border-[#007AFF]' 
                                                                                    : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover/unit:border-[#007AFF]/50'
                                                                                }`}
                                                                                onClick={(e) => { e.stopPropagation(); handleBulkSelection(post.id, quizIdsInUnit); }}
                                                                             >
                                                                                {allSelected && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                                                                                {someSelected && <div className="w-2 h-0.5 bg-white rounded-full" />}
                                                                             </div>
                                                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate group-hover/unit:text-[#007AFF] transition-colors select-none">{unitDisplayName}</span>
                                                                        </div>
                                                                        
                                                                        {!isUnitCollapsed && (
                                                                            <div className="mt-1 space-y-1 pl-2 ml-2 border-l border-slate-200 dark:border-white/10">
                                                                                {quizzesInUnit.sort((a,b) => a.title.localeCompare(b.title)).map(quiz => {
                                                                                    const instanceKey = getInstanceKey(post.id, quiz.id);
                                                                                    const isSelected = selectedInstances.has(instanceKey);

                                                                                    return (
                                                                                        <div 
                                                                                            key={quiz.id} 
                                                                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 group/item ${isSelected ? 'bg-[#007AFF]/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                                                                            onClick={() => handleInstanceSelection(post.id, quiz.id)}
                                                                                        >
                                                                                            {/* Item Checkbox */}
                                                                                            <div className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-200 border ${
                                                                                                isSelected 
                                                                                                ? 'bg-[#007AFF] border-[#007AFF]' 
                                                                                                : 'bg-white dark:bg-white/5 border-slate-300 dark:border-slate-600 group-hover/item:border-[#007AFF]/50'
                                                                                            }`}>
                                                                                                {isSelected && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                                                                                            </div>
                                                                                            <span className={`text-[13px] font-medium truncate select-none ${isSelected ? 'text-[#007AFF]' : 'text-slate-700 dark:text-slate-300'}`}>{quiz.title}</span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            {/* RIGHT COLUMN: OPTIONS 
                                Mobile: Compacted and pushed to bottom.
                            */}
                            <div className="flex-shrink-0 lg:col-span-5 flex flex-col gap-4 lg:gap-6">
                                
                                {/* Sorting Card */}
                                <div className="bg-white dark:bg-[#2c2c2e]/50 rounded-[20px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm p-4 lg:p-5">
                                    <div className="flex items-center gap-2 mb-3 lg:mb-4">
                                        <FunnelIcon className="w-4 h-4 text-slate-400" />
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Sort Order</h4>
                                    </div>
                                    
                                    {/* Segmented Control */}
                                    <div className="bg-slate-100 dark:bg-black/40 p-1 rounded-xl flex relative z-0 ring-1 ring-black/5 dark:ring-white/5">
                                        <button 
                                            onClick={() => setSortOption('gender-lastName')}
                                            className="relative flex-1 py-2 text-[13px] font-semibold rounded-[10px] z-10 transition-colors duration-200 focus:outline-none text-center"
                                        >
                                            {sortOption === 'gender-lastName' && (
                                                <motion.div layoutId="segment" className="absolute inset-0 bg-white dark:bg-[#636366] shadow-sm rounded-[10px] -z-10 ring-1 ring-black/5" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                                            )}
                                            <span className={sortOption === 'gender-lastName' ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400'}>Gender, Last Name</span>
                                        </button>
                                        
                                        <button 
                                            onClick={() => setSortOption('gender-firstName')}
                                            className="relative flex-1 py-2 text-[13px] font-semibold rounded-[10px] z-10 transition-colors duration-200 focus:outline-none text-center"
                                        >
                                            {sortOption === 'gender-firstName' && (
                                                <motion.div layoutId="segment" className="absolute inset-0 bg-white dark:bg-[#636366] shadow-sm rounded-[10px] -z-10 ring-1 ring-black/5" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                                            )}
                                            <span className={sortOption === 'gender-firstName' ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400'}>Gender, First Name</span>
                                        </button>
                                    </div>
                                </div>

                                 {/* Selection Summary */}
                                 {/* DESKTOP VIEW (Large Card) */}
                                 <div className="hidden sm:flex flex-1 bg-gradient-to-b from-white to-slate-50 dark:from-[#2c2c2e]/50 dark:to-[#1c1c1e]/50 rounded-[20px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm p-6 flex-col justify-center items-center text-center min-h-[160px]">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 ring-4 ring-white dark:ring-[#2c2c2e]">
                                        <span className="text-2xl font-bold text-white tracking-tight font-mono">{selectedInstances.size}</span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Items Selected</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed max-w-[220px]">
                                        {selectedInstances.size > 0 ? 'Ready to generate comprehensive excel report.' : 'Select quizzes from the list to begin.'}
                                    </p>
                                </div>
                                
                                {/* MOBILE VIEW (Compact Strip) */}
                                <div className="flex sm:hidden items-center justify-between px-5 py-3 bg-white dark:bg-[#2c2c2e]/50 rounded-[16px] ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                                            <span className="text-xs font-bold text-white">{selectedInstances.size}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">Items Selected</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        {selectedInstances.size > 0 ? 'Ready' : 'Select'}
                                    </span>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* FOOTER 
                        - Fixed at bottom, distinct from content.
                    */}
                    <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-5 border-t border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl flex-shrink-0">
                         <div className="flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                             <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight">
                                Output: Excel (.xlsx)
                            </span>
                         </div>
                        
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button 
                                onClick={handleClose} 
                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-full font-semibold text-[13px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={selectedInstances.size === 0 || isGenerating}
                                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-full font-semibold text-[13px] text-white shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2
                                    ${selectedInstances.size === 0 || isGenerating
                                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none opacity-70'
                                        : 'bg-[#007AFF] hover:bg-[#0062CC] shadow-blue-500/30 hover:shadow-blue-500/40'}`}
                            >
                                {isGenerating && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {isGenerating ? 'Exporting...' : 'Generate Report'}
                            </button>
                        </div>
                    </footer>

                </DialogPanel>
            </div>
        </Dialog>
    );
}