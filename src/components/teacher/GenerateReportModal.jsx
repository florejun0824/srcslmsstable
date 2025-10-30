import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel } from '@tremor/react';
import { useToast } from '../../contexts/ToastContext';
import { motion } from 'framer-motion';
import {
    DocumentChartBarIcon,
    XMarkIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';

import * as XLSX from 'xlsx-js-style';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';


const dropIn = {
    hidden: { y: "-50px", opacity: 0, scale: 0.95 },
    visible: {
        y: "0",
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3, type: "spring", damping: 25, stiffness: 400 },
    },
    exit: { y: "50px", opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
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
    const [selectedQuizIds, setSelectedQuizIds] = useState([]);
    const [sortOption, setSortOption] = useState('gender-lastName');
    
    const [collapsedPosts, setCollapsedPosts] = useState(new Set());
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());

    const students = classData?.students || [];
    const quizzes = availableQuizzes || [];
    const scores = quizScores || [];
    const unitMap = units || {};
    const posts = sharedContentPosts || [];

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

    const handleQuizSelection = (quizId) => {
        setSelectedQuizIds(prev =>
            prev.includes(quizId)
                ? prev.filter(id => id !== quizId)
                : [...prev, quizId]
        );
    };

    const handleUnitSelectionToggle = (quizIdsInThisUnit) => {
        const allQuizzesSelected =
            quizIdsInThisUnit.length > 0 &&
            quizIdsInThisUnit.every(quizId => selectedQuizIds.includes(quizId));

        if (allQuizzesSelected) {
            setSelectedQuizIds(prev =>
                prev.filter(id => !quizIdsInThisUnit.includes(id))
            );
        } else {
            setSelectedQuizIds(prev =>
                [...new Set([...prev, ...quizIdsInThisUnit])]
            );
        }
    };


    // --- (All Excel cell styles remain unchanged) ---
    const commonBorderStyle = {
        top: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } },
    };
    const defaultCellStyle = {
        alignment: { vertical: 'center', horizontal: 'general', wrapText: false },
        font: { sz: 11, name: 'Arial' },
        border: commonBorderStyle
    };
    const topHeaderStyle = {
        font: { bold: true, sz: 16, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: commonBorderStyle
    };
    const subHeaderStyle = {
        font: { bold: true, sz: 14, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: commonBorderStyle
    };
    const sectionTitleStyle = {
        font: { bold: true, sz: 12, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center' },
        fill: { fgColor: { rgb: "FFFFCC" } },
        border: commonBorderStyle
    };
    const topicTableHeaderStyle = {
        font: { bold: true, sz: 11, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: "DDEBF7" } },
        border: commonBorderStyle
    };
    const studentTableHeaderStyle = {
        font: { bold: true, sz: 10, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: "E2EFDA" } },
        border: commonBorderStyle
    };
    const studentSubHeaderStyle = {
        font: { sz: 10, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: "DDEBF7" } },
        border: commonBorderStyle
    };
    const studentNameCellStyle = {
        alignment: { vertical: 'center', horizontal: 'left', wrapText: false },
        font: { sz: 11, name: 'Arial' },
        border: commonBorderStyle
    };
    const checkboxCellStyle = {
        alignment: { vertical: 'center', horizontal: 'center' },
        font: { sz: 11, name: 'Arial' },
        border: commonBorderStyle
    };
    const scoreCellStyle = {
        alignment: { vertical: 'center', horizontal: 'center' },
        font: { sz: 11, name: 'Arial' },
        border: commonBorderStyle
    };

    // --- (handleGenerate function remains unchanged) ---
    const handleGenerate = async () => {
        if (selectedQuizIds.length === 0) {
            return showToast("Please select at least one quiz to include in the report.", "error");
        }

        const selectedQuizzes = quizzes.filter(q =>
            selectedQuizIds.includes(q.id)
        );

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

        const workbook = XLSX.utils.book_new();

        let worksheet = XLSX.utils.aoa_to_sheet([[]]);
        worksheet['!ref'] = 'A1';
        let rowIndex = 0;
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
        const addRowData = (dataArray) => {
            const currentRow = rowIndex;
            dataArray.forEach((value, colIndex) => {
                addCell(currentRow, colIndex, value, {});
            });
            rowIndex++;
        };
        const addMergedCellStyled = (startRow, startCol, endRow, endCol, text, style) => {
            worksheet['!merges'] = worksheet['!merges'] || [];
            worksheet['!merges'].push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } });
            addCell(startRow, startCol, text, style);
        };
        rowIndex = 0;
        addRowData([]);
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, "San Ramon Catholic School, Inc.", topHeaderStyle);
        rowIndex++;
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, `${classData.name || 'N/A'}`, subHeaderStyle);
        rowIndex++;
        addRowData([]);
        rowIndex++;
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, "Basic Information", sectionTitleStyle);
        rowIndex++;
        addRowData([`Class: ${classData.name || 'N/A'}`]);
        addCell(rowIndex - 1, 0, `Class: ${classData.name || 'N/A'}`, defaultCellStyle);
        rowIndex++;
        let minDate = null;
        let maxDate = null;
        selectedQuizzes.forEach(quiz => {
            const quizPosts = posts.filter(post => (post.quizzes || []).some(q => q.id === quiz.id));
            quizPosts.forEach(post => {
                if (post.availableFrom && post.availableFrom.toDate) {
                    const fromDate = post.availableFrom.toDate();
                    if (!minDate || fromDate < minDate) minDate = fromDate;
                }
                if (post.availableUntil && post.availableUntil.toDate) {
                    const untilDate = post.availableUntil.toDate();
                    if (!maxDate || untilDate > maxDate) maxDate = untilDate;
                }
            });
        });
        let dateRangeString = 'No specific date range';
        if (minDate && maxDate) dateRangeString = `${minDate.toLocaleDateString()} – ${maxDate.toLocaleDateString()}`;
        else if (minDate) dateRangeString = `From ${minDate.toLocaleDateString()}`;
        else if (maxDate) dateRangeString = `Until ${maxDate.toLocaleDateString()}`;
        addRowData([dateRangeString]);
        addCell(rowIndex - 1, 0, dateRangeString, defaultCellStyle);
        rowIndex++;
        addRowData([]);
        rowIndex++;
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, "Topics", sectionTitleStyle);
        rowIndex++;
        const topicHeaders = ["Quiz Name", "Course", "Average First Attempt Score Percentage", "Average Highest Score Percentage", "Question Count", "Highest Possible Score", "Students Completed"];
        addRowData(topicHeaders);
        for(let i=0; i<topicHeaders.length; i++) addCell(rowIndex - 1, i, topicHeaders[i], topicTableHeaderStyle);
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
            const rowData = [quiz.title, quiz.courseName || 'N/A', avgFirstAttemptPercentage, avgHighestAttemptPercentage, quiz.questions.length, quiz.questions.length, studentsCompletedCount];
            addRowData(rowData);
            for(let i=0; i<rowData.length; i++) addCell(rowIndex - 1, i, rowData[i], defaultCellStyle);
        });
        addRowData([]);
        rowIndex+=2;
        let headerRow1_start = rowIndex;
        addMergedCellStyled(headerRow1_start, 0, headerRow1_start + 1, 0, "Learner's Name", studentTableHeaderStyle);
        addMergedCellStyled(headerRow1_start, 1, headerRow1_start + 1, 1, "Status", studentTableHeaderStyle);
        let currentHeaderCol = 2;
        selectedQuizzes.forEach(quiz => {
            addMergedCellStyled(headerRow1_start, currentHeaderCol, headerRow1_start, currentHeaderCol + 3, quiz.title, studentTableHeaderStyle);
            currentHeaderCol += 4;
        });
        addMergedCellStyled(headerRow1_start, currentHeaderCol, headerRow1_start + 1, currentHeaderCol, "Total First Attempt Raw Score", studentTableHeaderStyle);
        addMergedCellStyled(headerRow1_start, currentHeaderCol + 1, headerRow1_start + 1, currentHeaderCol + 1, "Total Highest Raw Score", studentTableHeaderStyle);
        rowIndex++;
        let subHeaderRowData = ["", ""];
        selectedQuizzes.forEach(() => subHeaderRowData.push("First Attempt Raw Score", "First Attempt Score Percentage", "Highest Raw Score", "Highest Score Percentage"));
        subHeaderRowData.push("", "");
        worksheet['!rows'] = worksheet['!rows'] || [];
        worksheet['!rows'][rowIndex - 1] = { hpt: 30 };
        addRowData(subHeaderRowData);
        for(let i=0; i<subHeaderRowData.length; i++) if (subHeaderRowData[i]) addCell(rowIndex - 1, i, subHeaderRowData[i], studentSubHeaderStyle);
        rowIndex++;
        let lastGender = null;
        sortedStudents.forEach(student => {
            if (sortOption.startsWith('gender') && (student.gender || 'Ungrouped') !== lastGender) {
                lastGender = student.gender || 'Ungrouped';
                addMergedCellStyled(rowIndex, 0, rowIndex, (2 + selectedQuizzes.length * 4 + 2) - 1, `Gender: ${lastGender}`, sectionTitleStyle);
                rowIndex++;
            }
            const hasCompletedAnySelectedQuiz = scores.some(s => s.studentId === student.id && selectedQuizIds.includes(s.quizId));
            let totalFirstAttemptRawScore = 0;
            let totalHighestRawScore = 0;
            const rowData = [`${student.lastName}, ${student.firstName}`, hasCompletedAnySelectedQuiz ? '✓' : 'x'];
            selectedQuizzes.forEach(quiz => {
                const studentQuizSubmissions = scores.filter(s => s.studentId === student.id && s.quizId === quiz.id);
                const firstAttempt = studentQuizSubmissions.find(s => s.attemptNumber === 1);
                const firstAttemptRawScore = firstAttempt ? firstAttempt.score : '—';
                const firstAttemptPercentage = firstAttempt ? `${((firstAttempt.score / firstAttempt.totalItems) * 100).toFixed(2)}%` : '—';
                let highestScoreSubmission = studentQuizSubmissions.reduce((highest, current) => (!highest || current.score > highest.score) ? current : highest, null);
                const highestRawScore = highestScoreSubmission ? highestScoreSubmission.score : '—';
                const highestPercentage = highestScoreSubmission ? `${((highestScoreSubmission.score / highestScoreSubmission.totalItems) * 100).toFixed(2)}%` : '—';
                rowData.push(firstAttemptRawScore, firstAttemptPercentage, highestRawScore, highestPercentage);
                if (typeof firstAttemptRawScore === 'number') totalFirstAttemptRawScore += firstAttemptRawScore;
                if (typeof highestRawScore === 'number') totalHighestRawScore += highestRawScore;
            });
            rowData.push(totalFirstAttemptRawScore, totalHighestRawScore);
            addRowData(rowData);
            for(let i=0; i<rowData.length; i++) {
                if (i === 0) addCell(rowIndex - 1, i, rowData[i], studentNameCellStyle);
                else if (i === 1) addCell(rowIndex - 1, i, rowData[i], checkboxCellStyle);
                else addCell(rowIndex - 1, i, rowData[i], scoreCellStyle);
            }
        });
        const studentCols = 2 + selectedQuizzes.length * 4 + 2;
        worksheet['!cols'] = [{ wch: 25 }, { wch: 10 }, ...Array(selectedQuizzes.length * 4).fill({ wch: 15 }), { wch: 15 }, { wch: 15 }];
        worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIndex - 1, c: studentCols - 1 } });
        XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Scores Report");
        
        const fileName = `${classData.name || 'Class'} - Quiz Report.xlsx`;

        try {
            if (Capacitor.isNativePlatform()) {
                let permStatus = await Filesystem.checkPermissions();
                if (permStatus.publicStorage !== 'granted') {
                    permStatus = await Filesystem.requestPermissions();
                }
                if (permStatus.publicStorage !== 'granted') {
                    showToast("Storage permission is required to save files.", "error");
                    console.error("Storage permission not granted.");
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
        }
    };

    const handleClose = () => {
        setSelectedQuizIds([]);
        setSortOption('gender-lastName');
        setCollapsedPosts(new Set());
        setCollapsedUnits(new Set());
        onClose();
    };

    // --- Data processing for new grouping ---
    const quizzesByPostAndUnit = posts.reduce((acc, post) => {
        const postQuizzes = (post.quizzes || []);
        if (postQuizzes.length === 0) return acc;

        if (!acc[post.id]) {
            acc[post.id] = {
                post: post,
                units: {} 
            };
        }

        postQuizzes.forEach(quizDetails => {
            const unitDisplayName = unitMap[quizDetails.unitId] || 'Uncategorized';
            if (!acc[post.id].units[unitDisplayName]) {
                acc[post.id].units[unitDisplayName] = [];
            }
            acc[post.id].units[unitDisplayName].push({ id: quizDetails.id, title: quizDetails.title });
        });
        return acc;
    }, {});

    // --- MODIFIED: Sort by date ascending (oldest first) ---
    const postEntries = Object.values(quizzesByPostAndUnit).sort((a, b) => 
        (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0)
    );
    // --- END MODIFICATION ---

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
    // --- END ---


    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className={className}>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                {/* --- MODIFIED: Changed size to max-w-7xl and h-[90vh] --- */}
                <DialogPanel as={motion.div}
                    variants={dropIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-7xl rounded-2xl bg-neumorphic-base flex flex-col overflow-hidden shadow-neumorphic"
                    style={{ height: '90vh' }}
                >
                {/* --- END MODIFICATION --- */}

                    <header className="flex items-center justify-between p-5 border-b border-neumorphic-shadow-dark/30 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <DocumentChartBarIcon className="h-6 w-6 text-sky-600" />
                            <h3 className="text-xl font-bold text-slate-900">
                                Generate Score Report
                            </h3>
                        </div>
                        <button onClick={handleClose} className="p-2 rounded-full text-slate-500 hover:shadow-neumorphic-inset transition-colors">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </header>

                    {/* --- MODIFIED: Main content area is now a 2-col grid, parent overflow-y-auto removed --- */}
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-0">
                        
                        {/* --- MODIFIED: COLUMN 1: Select Quizzes (with overflow-hidden) --- */}
                        <div className="bg-neumorphic-base p-5 rounded-xl shadow-neumorphic flex flex-col overflow-hidden">
                            <label className="flex items-center text-lg font-bold text-slate-800 mb-4 flex-shrink-0">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-200 to-blue-300 text-blue-700 text-sm font-bold flex items-center justify-center mr-3 shadow-neumorphic">1</span>
                                Select Quizzes
                            </label>
                            {quizzes.length === 0 ? (
                                <p className="text-slate-500 text-sm px-2 py-4 text-center">No quizzes have been shared with this class yet.</p>
                            ) : (
                                // --- MODIFIED: This div is now the scrolling container ---
                                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                                    {postEntries.map(({ post, units: unitsInPost }) => {
                                        const isPostCollapsed = collapsedPosts.has(post.id);
                                        const sortedUnitKeys = Object.keys(unitsInPost).sort(customUnitSort);
                                        
                                        // --- MODIFIED: Get date and all quiz IDs for this post ---
                                        const sentDate = post.createdAt?.toDate()
                                            ? post.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'Date not available';
                                        
                                        const allQuizIdsInPost = sortedUnitKeys.flatMap(unitKey =>
                                            unitsInPost[unitKey].map(q => q.id)
                                        );
                                        const allSelectedInPost = allQuizIdsInPost.length > 0 && allQuizIdsInPost.every(id => selectedQuizIds.includes(id));
                                        const someSelectedInPost = allQuizIdsInPost.some(id => selectedQuizIds.includes(id)) && !allSelectedInPost;

                                        return (
                                            <div key={post.id} className="bg-neumorphic-base rounded-lg shadow-neumorphic-inset">
                                                {/* --- MODIFIED: Selectable Post Header with Date --- */}
                                                <div className="flex items-center justify-between w-full p-3 font-semibold text-base text-slate-800 bg-slate-100/50 rounded-t-lg border-b border-neumorphic-shadow-dark/30">
                                                    <div className="flex items-center flex-1 min-w-0 gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelectedInPost}
                                                            ref={el => el && (el.indeterminate = someSelectedInPost)}
                                                            onChange={() => handleUnitSelectionToggle(allQuizIdsInPost)}
                                                            onClick={(e) => e.stopPropagation()} 
                                                            className="h-4 w-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 flex-shrink-0"
                                                        />
                                                        <button
                                                            className="text-left flex-1 group min-w-0"
                                                            onClick={() => togglePostCollapse(post.id)}
                                                        >
                                                            <span className="group-hover:text-sky-600 transition-colors truncate block">{post.title}</span>
                                                            <span className="text-xs text-slate-500 font-normal block mt-1">
                                                                Sent on: {sentDate}
                                                            </span>
                                                        </button>
                                                    </div>
                                                    <button onClick={() => togglePostCollapse(post.id)} className="p-1">
                                                        {isPostCollapsed ? <ChevronDownIcon className="h-5 w-5 text-slate-400" /> : <ChevronUpIcon className="h-5 w-5 text-slate-400" />}
                                                    </button>
                                                </div>
                                                
                                                {/* (Collapsible content remains the same) */}
                                                {!isPostCollapsed && (
                                                    <div className="p-2 space-y-2 border-t border-neumorphic-shadow-dark/30">
                                                        {sortedUnitKeys.map(unitDisplayName => {
                                                            const quizzesInUnit = unitsInPost[unitDisplayName] || [];
                                                            const quizIdsInUnit = quizzesInUnit.map(q => q.id);
                                                            const allSelected = quizIdsInUnit.length > 0 && quizIdsInUnit.every(id => selectedQuizIds.includes(id));
                                                            const someSelected = quizIdsInUnit.some(id => selectedQuizIds.includes(id)) && !allSelected;
                                                            
                                                            const unitKey = `${post.id}_${unitDisplayName}`;
                                                            const isUnitCollapsed = collapsedUnits.has(unitKey);

                                                            return (
                                                                <div key={unitKey} className="bg-neumorphic-base rounded-md shadow-neumorphic-inset">
                                                                    <button 
                                                                        className="flex items-center justify-between w-full p-3 font-semibold text-sm text-slate-700 hover:bg-slate-200/50 transition-colors" 
                                                                        onClick={() => toggleUnitCollapse(post.id, unitDisplayName)}
                                                                    >
                                                                        <div className="flex items-center flex-1 min-w-0">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={allSelected}
                                                                                ref={el => el && (el.indeterminate = someSelected)}
                                                                                onChange={() => handleUnitSelectionToggle(quizIdsInUnit)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="h-4 w-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 mr-3 flex-shrink-0"
                                                                            />
                                                                            <span className="truncate">{unitDisplayName}</span>
                                                                        </div>
                                                                        {isUnitCollapsed ? <ChevronDownIcon className="h-5 w-5 text-slate-400" /> : <ChevronUpIcon className="h-5 w-5 text-slate-400" />}
                                                                    </button>
                                                                    
                                                                    {!isUnitCollapsed && (
                                                                        <div className="pt-1 pb-2 px-2 border-t border-neumorphic-shadow-dark/30">
                                                                            {quizzesInUnit.sort((a,b) => a.title.localeCompare(b.title)).map(quiz => (
                                                                                <label key={quiz.id} className={`flex items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${selectedQuizIds.includes(quiz.id) ? 'bg-sky-100/60' : 'hover:bg-slate-200/50'}`}>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedQuizIds.includes(quiz.id)}
                                                                                        onChange={() => handleQuizSelection(quiz.id)}
                                                                                        className="h-4 w-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 mr-3"
                                                                                    />
                                                                                    <span className="text-slate-800">{quiz.title}</span>
                                                                                </label>
                                                                            ))}
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
                        
                        {/* --- COLUMN 2: Sort Options (No scrolling) --- */}
                        <div className="bg-neumorphic-base p-5 rounded-xl shadow-neumorphic">
                             <label className="flex items-center text-lg font-bold text-slate-800 mb-4">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-200 to-blue-300 text-blue-700 text-sm font-bold flex items-center justify-center mr-3 shadow-neumorphic">2</span>
                                Sort Students By
                            </label>
                            <div className="p-1 bg-neumorphic-base rounded-full flex gap-1 shadow-neumorphic-inset">
                                <label className={`relative w-full text-center cursor-pointer py-2 px-3 rounded-full font-semibold text-sm transition-all`}>
                                    <input type="radio" name="sortOption" value="gender-lastName" checked={sortOption === 'gender-lastName'} onChange={e => setSortOption(e.target.value)} className="sr-only" />
                                    {sortOption === 'gender-lastName' && <motion.div layoutId="sort-pill" className="absolute inset-0 bg-neumorphic-base shadow-neumorphic rounded-full" />}
                                    <span className={`relative transition-colors ${sortOption === 'gender-lastName' ? 'text-sky-700' : 'text-slate-500'}`}>Gender, then Last Name</span>
                                </label>
                                <label className={`relative w-full text-center cursor-pointer py-2 px-3 rounded-full font-semibold text-sm transition-all`}>
                                    <input type="radio" name="sortOption" value="gender-firstName" checked={sortOption === 'gender-firstName'} onChange={e => setSortOption(e.target.value)} className="sr-only" />
                                    {sortOption === 'gender-firstName' && <motion.div layoutId="sort-pill" className="absolute inset-0 bg-neumorphic-base shadow-neumorphic rounded-full" />}
                                    <span className={`relative transition-colors ${sortOption === 'gender-firstName' ? 'text-sky-700' : 'text-slate-500'}`}>Gender, then First Name</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    {/* --- END 2-COL GRID --- */}


                    <footer className="flex justify-end gap-3 p-4 bg-neumorphic-base border-t border-neumorphic-shadow-dark/30 flex-shrink-0">
                        <button onClick={handleClose} className="px-5 py-2.5 bg-neumorphic-base text-slate-800 rounded-lg font-semibold text-sm transition-shadow shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={selectedQuizIds.length === 0}
                            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all active:shadow-neumorphic-inset
                                ${selectedQuizIds.length === 0
                                    ? 'bg-neumorphic-base shadow-neumorphic-inset text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic hover:shadow-neumorphic-inset'}`}
                        >
                            Generate Report
                        </button>
                    </footer>
                </DialogPanel>
            </div>
        </Dialog>
    );
}