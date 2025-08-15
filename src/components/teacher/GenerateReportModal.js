// src/components/teacher/GenerateReportModal.js
import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel } from '@tremor/react';
import { useToast } from '../../contexts/ToastContext';
import { motion } from 'framer-motion';
import {
    DocumentChartBarIcon,
    UsersIcon,
    ClipboardDocumentCheckIcon,
    XMarkIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';

import * as XLSX from 'sheetjs-style';

// --- Animation variants for a smooth modal appearance ---
const dropIn = {
    hidden: {
        y: "-100vh",
        opacity: 0,
        scale: 0.9,
    },
    visible: {
        y: "0",
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.2,
            type: "spring",
            damping: 25,
            stiffness: 500,
        },
    },
    exit: {
        y: "100vh",
        opacity: 0,
        scale: 0.9,
        transition: {
            duration: 0.2,
        },
    },
};

export default function GenerateReportModal({ isOpen, onClose, classData, availableQuizzes, quizScores, lessons, units, sharedContentPosts }) {
    const { showToast } = useToast();
    const [selectedQuizIds, setSelectedQuizIds] = useState([]);
    const [sortOption, setSortOption] = useState('gender-lastName');
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());

    useEffect(() => {
        if (isOpen && Object.keys(units).length > 0 && availableQuizzes.length > 0) {
            const allUnitKeys = Object.keys(units);
            const initialCollapsed = new Set(allUnitKeys);
            if (availableQuizzes.some(q => !q.unitId || !units[q.unitId])) {
                 initialCollapsed.add('Uncategorized');
            }
            setCollapsedUnits(initialCollapsed);
        }
    }, [isOpen, units, availableQuizzes]);

    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) {
                newSet.delete(unitTitle);
            } else {
                newSet.add(unitTitle);
            }
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

    const handleUnitSelectionToggle = (unitDisplayName) => {
        const quizzesInThisUnit = quizzesByUnit[unitDisplayName] || [];
        const quizIdsInThisUnit = quizzesInThisUnit.map(quiz => quiz.id);

        const allQuizzesSelected = quizIdsInThisUnit.length > 0 && quizIdsInThisUnit.every(quizId => selectedQuizIds.includes(quizId));

        if (allQuizzesSelected) {
            setSelectedQuizIds(prev => prev.filter(id => !quizIdsInThisUnit.includes(id)));
        } else {
            setSelectedQuizIds(prev => [...new Set([...prev, ...quizIdsInThisUnit])]);
        }
    };

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

    const handleGenerate = () => {
        if (selectedQuizIds.length === 0) {
            return showToast("Please select at least one quiz to include in the report.", "error");
        }

        const selectedQuizzes = availableQuizzes.filter(q => selectedQuizIds.includes(q.id));

        let sortedStudents = [...classData.students];
        
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
        const worksheet = {};
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
            const quizPosts = sharedContentPosts.filter(post => (post.quizIds || []).includes(quiz.id));
            quizPosts.forEach(post => {
                if (post.availableFrom && post.availableFrom.toDate) {
                    const fromDate = post.availableFrom.toDate();
                    if (!minDate || fromDate < minDate) {
                        minDate = fromDate;
                    }
                }
                if (post.availableUntil && post.availableUntil.toDate) {
                    const untilDate = post.availableUntil.toDate();
                    if (!maxDate || untilDate > maxDate) {
                        maxDate = untilDate;
                    }
                }
            });
        });

        let dateRangeString = 'No specific date range';
        if (minDate && maxDate) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            dateRangeString = `${minDate.toLocaleDateString('en-US', options)} – ${maxDate.toLocaleDateString('en-US', options)}`;
        } else if (minDate) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            dateRangeString = `From ${minDate.toLocaleDateString('en-US', options)}`;
        } else if (maxDate) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            dateRangeString = `Until ${maxDate.toLocaleDateString('en-US', options)}`;
        }

        addRowData([dateRangeString]);
        addCell(rowIndex - 1, 0, dateRangeString, defaultCellStyle);
        rowIndex++;
        addRowData([]);
        rowIndex++;
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, "Topics", sectionTitleStyle);
        rowIndex++;
        const topicHeaders = ["Quiz Name", "Course", "Average First Attempt Score Percentage", "Average Highest Score Percentage", "Question Count", "Highest Possible Score", "Students Completed"];
        addRowData(topicHeaders);
        for(let i=0; i<topicHeaders.length; i++) {
            addCell(rowIndex - 1, i, topicHeaders[i], topicTableHeaderStyle);
        }

        selectedQuizzes.forEach(quiz => {
            const quizSubmissions = quizScores.filter(s => s.quizId === quiz.id);
            const firstAttempts = quizSubmissions.filter(s => s.attemptNumber === 1);
            const sumFirstAttemptScores = firstAttempts.reduce((sum, sub) => sum + sub.score, 0);
            const sumFirstAttemptTotalItems = firstAttempts.reduce((sum, sub) => sum + sub.totalItems, 0);
            const avgFirstAttemptPercentage = sumFirstAttemptTotalItems > 0 ? ((sumFirstAttemptScores / sumFirstAttemptTotalItems) * 100).toFixed(2) + '%' : '0.00%';

            const studentHighestScores = {};
            quizSubmissions.forEach(sub => {
                if (!studentHighestScores[sub.studentId] || sub.score > studentHighestScores[sub.studentId].score) {
                    studentHighestScores[sub.studentId] = sub;
                }
            });
            const sumHighestScores = Object.values(studentHighestScores).reduce((sum, sub) => sum + sub.score, 0);
            const sumHighestTotalItems = Object.values(studentHighestScores).reduce((sum, sub) => sum + sub.totalItems, 0);
            const avgHighestAttemptPercentage = sumHighestTotalItems > 0 ? ((sumHighestScores / sumHighestTotalItems) * 100).toFixed(2) + '%' : '0.00%';

            const studentsCompletedCount = new Set(quizSubmissions.map(s => s.studentId)).size;

            const rowData = [
                quiz.title,
                quiz.courseName || 'N/A',
                avgFirstAttemptPercentage,
                avgHighestAttemptPercentage,
                quiz.totalItems,
                quiz.totalItems,
                studentsCompletedCount
            ];
            addRowData(rowData);
            for(let i=0; i<rowData.length; i++) {
                addCell(rowIndex - 1, i, rowData[i], defaultCellStyle);
            }
        });

        addRowData([]);
        rowIndex++;
        addRowData([]);
        rowIndex++;
        
        let headerRow1_start = rowIndex;

        // Vertically merge Learner's Name and Status
        addMergedCellStyled(headerRow1_start, 0, headerRow1_start + 1, 0, "Learner's Name", studentTableHeaderStyle);
        addMergedCellStyled(headerRow1_start, 1, headerRow1_start + 1, 1, "Status", studentTableHeaderStyle);

        // Add quiz headers
        let currentHeaderCol = 2;
        selectedQuizzes.forEach(quiz => {
            addMergedCellStyled(headerRow1_start, currentHeaderCol, headerRow1_start, currentHeaderCol + 3, quiz.title, studentTableHeaderStyle);
            currentHeaderCol += 4;
        });

        // Vertically merge total score headers
        addMergedCellStyled(headerRow1_start, currentHeaderCol, headerRow1_start + 1, currentHeaderCol, "Total First Attempt Raw Score", studentTableHeaderStyle);
        addMergedCellStyled(headerRow1_start, currentHeaderCol + 1, headerRow1_start + 1, currentHeaderCol + 1, "Total Highest Raw Score", studentTableHeaderStyle);
        
        // This is the second header row for the sub-headers
        rowIndex++;
        let subHeaderRowData = ["", ""]; // Placeholders for the merged cells
        selectedQuizzes.forEach(() => {
            subHeaderRowData.push("First Attempt Raw Score", "First Attempt Score Percentage", "Highest Raw Score", "Highest Score Percentage");
        });
        subHeaderRowData.push("", ""); // Placeholders for the merged cells

        // Set the height of this row
        worksheet['!rows'] = worksheet['!rows'] || [];
        worksheet['!rows'][rowIndex - 1] = { hpt: 30 }; // Double the row height

        addRowData(subHeaderRowData);
        for(let i=0; i<subHeaderRowData.length; i++) {
            if (subHeaderRowData[i]) {
                addCell(rowIndex - 1, i, subHeaderRowData[i], studentSubHeaderStyle);
            }
        }
        
        rowIndex++;

        let lastGender = null;

        sortedStudents.forEach(student => {
            const studentGender = student.gender || 'Ungrouped';
            if (sortOption.startsWith('gender') && studentGender !== lastGender) {
                addMergedCellStyled(rowIndex, 0, rowIndex, (2 + selectedQuizzes.length * 4 + 2) - 1, `Gender: ${studentGender}`, sectionTitleStyle);
                rowIndex++;
                lastGender = studentGender;
            }

            const hasCompletedAnySelectedQuiz = quizScores.some(s => s.studentId === student.id && selectedQuizIds.includes(s.quizId));
            
            let totalFirstAttemptRawScore = 0;
            let totalHighestRawScore = 0;

            const rowData = [`${student.lastName}, ${student.firstName}`, hasCompletedAnySelectedQuiz ? '✓' : 'x'];

            selectedQuizzes.forEach(quiz => {
                const studentQuizSubmissions = quizScores.filter(s => s.studentId === student.id && s.quizId === quiz.id);
                const firstAttempt = studentQuizSubmissions.find(s => s.attemptNumber === 1);
                const firstAttemptRawScore = firstAttempt ? firstAttempt.score : '—';
                const firstAttemptPercentage = firstAttempt ? `${((firstAttempt.score / firstAttempt.totalItems) * 100).toFixed(2)}%` : '—';
                
                let highestScoreSubmission = null;
                studentQuizSubmissions.forEach(s => {
                    if (!highestScoreSubmission || s.score > highestScoreSubmission.score) {
                        highestScoreSubmission = s;
                    }
                });
                const highestRawScore = highestScoreSubmission ? highestScoreSubmission.score : '—';
                const highestPercentage = highestScoreSubmission ? `${((highestScoreSubmission.score / highestScoreSubmission.totalItems) * 100).toFixed(2)}%` : '—';
                
                rowData.push(firstAttemptRawScore, firstAttemptPercentage, highestRawScore, highestPercentage);

                if (firstAttemptRawScore !== '—') {
                    totalFirstAttemptRawScore += firstAttemptRawScore;
                }
                if (highestRawScore !== '—') {
                    totalHighestRawScore += highestRawScore;
                }
            });

            rowData.push(totalFirstAttemptRawScore, totalHighestRawScore);

            addRowData(rowData);
            for(let i=0; i<rowData.length; i++) {
                if (i === 0) {
                    addCell(rowIndex - 1, i, rowData[i], studentNameCellStyle);
                } else if (i === 1) {
                    addCell(rowIndex - 1, i, rowData[i], checkboxCellStyle);
                } else {
                    addCell(rowIndex - 1, i, rowData[i], scoreCellStyle);
                }
            }
        });
        
        const studentCols = 2 + selectedQuizzes.length * 4 + 2;
        const colWidths = [{ wch: 25 }, { wch: 10 }];
        selectedQuizzes.forEach(() => {
            colWidths.push({ wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 });
        });
        colWidths.push({ wch: 15 });
        colWidths.push({ wch: 15 });
        worksheet['!cols'] = colWidths;

        const finalRange = { s: { r: 0, c: 0 }, e: { r: rowIndex - 1, c: studentCols - 1 } };
        worksheet['!ref'] = XLSX.utils.encode_range(finalRange);

        XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Scores Report");
        XLSX.writeFile(workbook, `${classData.name || 'Class'} - Quiz Report.xlsx`);

        onClose();
    };

    const handleClose = () => {
        setSelectedQuizIds([]);
        setSortOption('gender-lastName');
        setCollapsedUnits(new Set());
        onClose();
    };

	const quizzesByUnit = {};
    if (availableQuizzes && units) { 
        availableQuizzes.forEach(quizDetails => {
            let unitDisplayName = 'Uncategorized';
            if (quizDetails.unitId && units[quizDetails.unitId]) {
                unitDisplayName = units[quizDetails.unitId];
            } else {
                const associatedPosts = sharedContentPosts.filter(post => 
                    (post.quizIds || []).includes(quizDetails.id)
                );
                const lessonUnitTitlesInAssociatedPosts = new Set();
                associatedPosts.forEach(post => {
                    (post.lessonIds || []).forEach(lessonId => {
                        const lesson = lessons.find(l => l.id === lessonId);
                        if (lesson && lesson.unitId && units[lesson.unitId]) {
                            lessonUnitTitlesInAssociatedPosts.add(units[lesson.unitId]);
                        }
                    });
                });
                if (lessonUnitTitlesInAssociatedPosts.size === 1) {
                    unitDisplayName = Array.from(lessonUnitTitlesInAssociatedPosts)[0];
                } else if (lessonUnitTitlesInAssociatedPosts.size > 1) {
                    unitDisplayName = 'Uncategorized';
                }
            }
            if (!quizzesByUnit[unitDisplayName]) {
                quizzesByUnit[unitDisplayName] = [];
            }
            if (!quizzesByUnit[unitDisplayName].some(q => q.id === quizDetails.id)) {
                quizzesByUnit[unitDisplayName].push(quizDetails);
            }
        });
    }

    const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel className="w-full max-w-4xl rounded-2xl bg-white p-0 shadow-2xl overflow-hidden transition-all transform backdrop-filter backdrop-blur-md bg-opacity-90 ring-1 ring-gray-200">
                <motion.div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-full flex flex-col"
                    variants={dropIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    <div className="flex items-center justify-between p-5 bg-gradient-to-br from-blue-600 to-purple-700 text-white shadow-md">
                        <div className="flex items-center">
                            <div className="p-2 rounded-full bg-white bg-opacity-20 mr-3">
                                <DocumentChartBarIcon className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-white leading-tight">
                                Generate Score Report
                            </h3>
                        </div>
                        <button onClick={handleClose} className="text-white hover:text-gray-200 transition-colors">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-5">
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-inner">
                            <label className="flex items-center text-base font-bold text-gray-800 mb-3">
                                <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
                                1. Select Quizzes to Include
                            </label>
                            {availableQuizzes.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">
                                    No quizzes available to generate a report.
                                </p>
                            ) : (!lessons && Object.keys(units).length === 0) ? (
                                <p className="text-gray-500 italic text-sm">
                                    Loading quiz data...
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                                    {sortedUnitKeys.map(unitDisplayName => {
                                        const quizzesInThisUnit = quizzesByUnit[unitDisplayName] || [];
                                        const quizIdsInThisUnit = quizzesInThisUnit.map(quiz => quiz.id);
                                        const allQuizzesSelected = quizIdsInThisUnit.length > 0 && quizIdsInThisUnit.every(quizId => selectedQuizIds.includes(quizId));
                                        const someQuizzesSelected = quizIdsInThisUnit.some(quizId => selectedQuizIds.includes(quizId)) && !allQuizzesSelected;

                                        return (
                                            <div key={unitDisplayName} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                                <button
                                                    className="flex items-center justify-between w-full p-2.5 font-bold text-sm text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors border-b border-gray-100"
                                                    onClick={() => toggleUnitCollapse(unitDisplayName)}
                                                >
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={allQuizzesSelected}
                                                            onChange={() => handleUnitSelectionToggle(unitDisplayName)}
                                                            ref={el => el && (el.indeterminate = someQuizzesSelected)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 mr-2"
                                                        />
                                                        {unitDisplayName}
                                                    </div>
                                                    {collapsedUnits.has(unitDisplayName) ? (
                                                        <ChevronDownIcon className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                                                    ) : (
                                                        <ChevronUpIcon className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                                                    )}
                                                </button>
                                                {!collapsedUnits.has(unitDisplayName) && (
                                                    <div className="p-2 space-y-1">
                                                        {quizzesInThisUnit
                                                            .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
                                                            .map(quiz => (
                                                                <div
                                                                    key={quiz.id}
                                                                    className={`flex items-center p-1.5 rounded-lg cursor-pointer transition-colors text-sm
                                                                    ${selectedQuizIds.includes(quiz.id) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                                                                    onClick={() => handleQuizSelection(quiz.id)}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedQuizIds.includes(quiz.id)}
                                                                        onChange={() => handleQuizSelection(quiz.id)}
                                                                        className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 mr-2"
                                                                    />
                                                                    <span className="font-normal text-gray-700">{quiz.title}</span>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-shrink-0 p-5 border-t border-gray-200 bg-white bg-opacity-70">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-inner mb-3">
                            <label className="flex items-center text-sm font-bold text-gray-800 mb-2">
                                <UsersIcon className="h-4 w-4 mr-1 text-purple-600" />
                                2. Sort Students By
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <label className={`flex-1 flex items-center justify-center gap-1 cursor-pointer p-1.5 rounded-full font-semibold text-xs transition-colors
                                    ${sortOption === 'gender-lastName' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="sortOption"
                                        value="gender-lastName"
                                        checked={sortOption === 'gender-lastName'}
                                        onChange={(e) => setSortOption(e.target.value)}
                                        className="hidden"
                                    />
                                    Gender then Last Name
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-1 cursor-pointer p-1.5 rounded-full font-semibold text-xs transition-colors
                                    ${sortOption === 'gender-firstName' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="sortOption"
                                        value="gender-firstName"
                                        checked={sortOption === 'gender-firstName'}
                                        onChange={(e) => setSortOption(e.target.value)}
                                        className="hidden"
                                    />
                                    Gender then First Name
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleClose}
                                className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 shadow-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={selectedQuizIds.length === 0}
                                className={`px-5 py-2.5 text-white rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 shadow-lg
                                    ${selectedQuizIds.length === 0
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-500'}`}
                            >
                                Generate Report
                            </button>
                        </div>
                    </div>
                </motion.div>
            </DialogPanel>
        </Dialog>
    );
}