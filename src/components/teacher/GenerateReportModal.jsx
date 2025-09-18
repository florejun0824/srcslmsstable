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

export default function GenerateReportModal({ isOpen, onClose, classData, availableQuizzes, quizScores, lessons, units, sharedContentPosts, className }) {
    const { showToast } = useToast();
    const [selectedQuizIds, setSelectedQuizIds] = useState([]);
    const [sortOption, setSortOption] = useState('gender-lastName');
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());

    // ✅ FIX: Safely access all array props by providing a default empty array `[]`.
    // This prevents the "Cannot read properties of undefined (reading 'length')" crash.
    const students = classData?.students || [];
    const quizzes = availableQuizzes || [];
    const scores = quizScores || [];
    const lessonContent = lessons || [];
    const unitMap = units || {};
    const posts = sharedContentPosts || [];

    useEffect(() => {
        if (isOpen) {
            const quizzesByUnit = {};
            quizzes.forEach(quizDetails => {
                let unitDisplayName = 'Uncategorized';
                if (quizDetails.unitId && unitMap[quizDetails.unitId]) {
                    unitDisplayName = unitMap[quizDetails.unitId];
                }
                if (!quizzesByUnit[unitDisplayName]) {
                    quizzesByUnit[unitDisplayName] = [];
                }
                quizzesByUnit[unitDisplayName].push(quizDetails);
            });
            const allDisplayedUnitKeys = Object.keys(quizzesByUnit);
            setCollapsedUnits(new Set(allDisplayedUnitKeys));
        }
    }, [isOpen, unitMap, quizzes]);

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

    const handleUnitSelectionToggle = (unitDisplayName, quizzesByUnit) => {
        const quizzesInThisUnit = quizzesByUnit[unitDisplayName] || [];
        const quizIdsInThisUnit = quizzesInThisUnit.map(quiz => quiz.id);

        const allQuizzesSelected = quizIdsInThisUnit.length > 0 && quizIdsInThisUnit.every(quizId => selectedQuizIds.includes(quizId));

        if (allQuizzesSelected) {
            setSelectedQuizIds(prev => prev.filter(id => !quizIdsInThisUnit.includes(id)));
        } else {
            setSelectedQuizIds(prev => [...new Set([...prev, ...quizIdsInThisUnit])]);
        }
    };

    // ... (All styling objects like commonBorderStyle, topHeaderStyle, etc. remain unchanged) ...
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

        const selectedQuizzes = quizzes.filter(q => selectedQuizIds.includes(q.id));

        // ✅ FIX: Use the safe 'students' constant.
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

        // ... (rest of the handleGenerate function is unchanged, but now uses safe variables like 'scores' and 'posts') ...
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
            const quizPosts = posts.filter(post => (post.quizIds || []).includes(quiz.id));
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
    quizzes.forEach(quizDetails => {
        let unitDisplayName = 'Uncategorized';
        if (quizDetails.unitId && unitMap[quizDetails.unitId]) {
            unitDisplayName = unitMap[quizDetails.unitId];
        }
        if (!quizzesByUnit[unitDisplayName]) quizzesByUnit[unitDisplayName] = [];
        quizzesByUnit[unitDisplayName].push(quizDetails);
    });

    const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className={className}>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel as={motion.div}
                    variants={dropIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-2xl rounded-2xl bg-slate-50/80 backdrop-blur-2xl flex flex-col overflow-hidden ring-1 ring-black/10 shadow-2xl"
                    style={{ maxHeight: '90vh' }}
                >
                    <header className="flex items-center justify-between p-5 border-b border-black/10 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <DocumentChartBarIcon className="h-6 w-6 text-indigo-600" />
                            <h3 className="text-xl font-bold text-gray-900">
                                Generate Score Report
                            </h3>
                        </div>
                        <button onClick={handleClose} className="p-1 rounded-full text-gray-500 hover:bg-black/10 transition-colors">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </header>

                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-black/10 shadow-sm">
                            <label className="flex items-center text-lg font-bold text-gray-800 mb-4">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mr-3">1</span>
                                Select Quizzes
                            </label>
                            {quizzes.length === 0 ? (
                                <p className="text-gray-500 text-sm px-2 py-4 text-center">No quizzes have been shared with this class yet.</p>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                                    {sortedUnitKeys.map(unitDisplayName => {
                                        const quizzesInThisUnit = quizzesByUnit[unitDisplayName] || [];
                                        const quizIdsInThisUnit = quizzesInThisUnit.map(q => q.id);
                                        const allSelected = quizIdsInThisUnit.length > 0 && quizIdsInThisUnit.every(id => selectedQuizIds.includes(id));
                                        const someSelected = quizIdsInThisUnit.some(id => selectedQuizIds.includes(id)) && !allSelected;

                                        return (
                                            <div key={unitDisplayName} className="bg-slate-50 rounded-lg border border-slate-200/80">
                                                <button className="flex items-center justify-between w-full p-3 font-semibold text-sm text-gray-700 hover:bg-slate-100 transition-colors" onClick={() => toggleUnitCollapse(unitDisplayName)}>
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelected}
                                                            onChange={() => handleUnitSelectionToggle(unitDisplayName, quizzesByUnit)}
                                                            ref={el => el && (el.indeterminate = someSelected)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-3"
                                                        />
                                                        {unitDisplayName}
                                                    </div>
                                                    {collapsedUnits.has(unitDisplayName) ? <ChevronDownIcon className="h-5 w-5 text-gray-400" /> : <ChevronUpIcon className="h-5 w-5 text-gray-400" />}
                                                </button>
                                                {!collapsedUnits.has(unitDisplayName) && (
                                                    <div className="p-2 border-t border-slate-200/80">
                                                        {quizzesInThisUnit.sort((a,b) => a.title.localeCompare(b.title)).map(quiz => (
                                                            <label key={quiz.id} className={`flex items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${selectedQuizIds.includes(quiz.id) ? 'bg-indigo-100/60' : 'hover:bg-slate-100/80'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedQuizIds.includes(quiz.id)}
                                                                    onChange={() => handleQuizSelection(quiz.id)}
                                                                    className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-3"
                                                                />
                                                                <span className="text-gray-800">{quiz.title}</span>
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
                        
                        <div className="bg-white p-5 rounded-xl border border-black/10 shadow-sm">
                             <label className="flex items-center text-lg font-bold text-gray-800 mb-4">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mr-3">2</span>
                                Sort Students By
                            </label>
                            <div className="p-1 bg-slate-100 rounded-full flex gap-1">
                                <label className={`w-full text-center cursor-pointer py-2 px-3 rounded-full font-semibold text-sm transition-all ${sortOption === 'gender-lastName' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}>
                                    <input type="radio" name="sortOption" value="gender-lastName" checked={sortOption === 'gender-lastName'} onChange={e => setSortOption(e.target.value)} className="hidden" />
                                    Gender, then Last Name
                                </label>
                                <label className={`w-full text-center cursor-pointer py-2 px-3 rounded-full font-semibold text-sm transition-all ${sortOption === 'gender-firstName' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}>
                                    <input type="radio" name="sortOption" value="gender-firstName" checked={sortOption === 'gender-firstName'} onChange={e => setSortOption(e.target.value)} className="hidden" />
                                    Gender, then First Name
                                </label>
                            </div>
                        </div>
                    </div>

                    <footer className="flex justify-end gap-3 p-4 bg-slate-50/50 border-t border-black/10 flex-shrink-0">
                        <button onClick={handleClose} className="px-5 py-2.5 bg-white text-gray-800 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors ring-1 ring-inset ring-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={selectedQuizIds.length === 0}
                            className={`px-5 py-2.5 text-white rounded-lg font-semibold text-sm transition-all shadow-md active:scale-95
                                ${selectedQuizIds.length === 0
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            Generate Report
                        </button>
                    </footer>
                </DialogPanel>
            </div>
        </Dialog>
    );
}