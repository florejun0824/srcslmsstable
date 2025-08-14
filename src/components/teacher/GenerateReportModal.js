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
    const [groupingOption, setGroupingOption] = useState('lastName');
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());

    // Populate initial collapsed units when the modal opens and data is ready
    useEffect(() => {
        // Only set initial collapsed state if modal is open and data has arrived
        if (isOpen && Object.keys(units).length > 0 && availableQuizzes.length > 0) {
            const allUnitKeys = Object.keys(units);
            const initialCollapsed = new Set(allUnitKeys); // Start with all units collapsed
            // Also add 'Uncategorized' if it might contain quizzes
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

    // Function to handle selecting/deselecting all quizzes in a unit
    const handleUnitSelectionToggle = (unitDisplayName) => {
        const quizzesInThisUnit = quizzesByUnit[unitDisplayName] || [];
        const quizIdsInThisUnit = quizzesInThisUnit.map(quiz => quiz.id);

        const allQuizzesSelected = quizIdsInThisUnit.length > 0 && quizIdsInThisUnit.every(quizId => selectedQuizIds.includes(quizId));

        if (allQuizzesSelected) {
            // Deselect all quizzes in this unit
            setSelectedQuizIds(prev => prev.filter(id => !quizIdsInThisUnit.includes(id)));
        } else {
            // Select all quizzes in this unit (add only new ones)
            setSelectedQuizIds(prev => [...new Set([...prev, ...quizIdsInThisUnit])]);
        }
    };

    // Define base styles (MOVED OUTSIDE handleGenerate)
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
        fill: { fgColor: { rgb: "FFFFCC" } }, // Yellowish
        border: commonBorderStyle
    };

    const topicTableHeaderStyle = {
        font: { bold: true, sz: 11, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: "DDEBF7" } }, // Light blue
        border: commonBorderStyle
    };

    const studentTableHeaderStyle = {
        font: { bold: true, sz: 10, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: "E2EFDA" } }, // Light green
        border: commonBorderStyle
    };

    // MOVED THESE STYLES TO GLOBAL SCOPE
    const studentNameCellStyle = {
        alignment: { vertical: 'center', horizontal: 'left', wrapText: false },
        font: { sz: 11, name: 'Arial' },
        border: commonBorderStyle
    };

    const checkboxCellStyle = {
        alignment: { vertical: 'center', horizontal: 'center' },
        font: { sz: 11, name: 'Arial' }, // Ensure font consistency
        border: commonBorderStyle
    };

    const scoreCellStyle = {
        alignment: { vertical: 'center', horizontal: 'center' },
        font: { sz: 11, name: 'Arial' }, // Ensure font consistency
        border: commonBorderStyle
    };


    const handleGenerate = () => {
        if (selectedQuizIds.length === 0) {
            return showToast("Please select at least one quiz to include in the report.", "error");
        }

        const selectedQuizzes = availableQuizzes.filter(q => selectedQuizIds.includes(q.id));

        let sortedStudents = [...classData.students].sort((a, b) => {
            if (groupingOption === 'gender') {
                return (a.gender || '').localeCompare(b.gender || '');
            }
            return a.lastName.localeCompare(b.lastName);
        });

        // ====================================================================
        // Core Logic for Excel Generation - Matching Provided Format
        // ====================================================================

        const workbook = XLSX.utils.book_new();
        const worksheet = {}; // Start with an empty object for the worksheet
        worksheet['!ref'] = 'A1'; // Initialize ref for proper range calculation later

        let rowIndex = 0; // Current row index in the worksheet, 0-indexed for XLSX.utils

        // Helper to add a cell with value and style
        const addCell = (row, col, value, style) => {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            worksheet[cellAddress] = { v: value, s: style };
            // Ensure worksheet !ref covers this cell
            const currentRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            currentRange.s.r = Math.min(currentRange.s.r, row);
            currentRange.s.c = Math.min(currentRange.s.c, col);
            currentRange.e.r = Math.max(currentRange.e.r, row);
            currentRange.e.c = Math.max(currentRange.e.c, col);
            worksheet['!ref'] = XLSX.utils.encode_range(currentRange);
        };

        // Helper to add a row of data. Assumes styles will be applied after adding all cells.
        const addRowData = (dataArray) => {
            const currentRow = rowIndex;
            dataArray.forEach((value, colIndex) => {
                addCell(currentRow, colIndex, value, {}); // Add with empty style for now, apply later
            });
            rowIndex++;
        };

        // Helper to add a merged cell with text and style
        const addMergedCellStyled = (startRow, startCol, endRow, endCol, text, style) => {
            worksheet['!merges'] = worksheet['!merges'] || [];
            worksheet['!merges'].push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } });
            addCell(startRow, startCol, text, style); // Add cell with specific style
        };


        // --- Populate the worksheet ---

        // Row 0 (empty)
        rowIndex = 0; // Ensure start from row 0
        addRowData([]); // Add an empty row for A1 to be empty

        // Row 1: School Name
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, "San Ramon Catholic School, Inc.", topHeaderStyle);
        rowIndex++;

        // Row 2: Class Name (Dynamically from classData)
        // Note: The provided image has "G10_ST. CLARE OF ASSISI_CSL" which might be a specific class code or class name.
        // Assuming `classData.name` holds the full class name.
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, `${classData.name || 'N/A'}`, subHeaderStyle);
        rowIndex++;

        // Row 3: Empty
        addRowData([]);
        rowIndex++;

        // Row 4: Basic Information Title
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, "Basic Information", sectionTitleStyle);
        rowIndex++;

        // Row 5: Class Name (Dynamically from classData.name)
        addRowData([`Class: ${classData.name || 'N/A'}`]);
        addCell(rowIndex - 1, 0, `Class: ${classData.name || 'N/A'}`, defaultCellStyle);
        rowIndex++;

        // Row 6: Date Range (Dynamically from selected quizzes)
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

        // Row 7: Empty
        addRowData([]);
        rowIndex++;

        // Row 8: Topics Title
        addMergedCellStyled(rowIndex, 0, rowIndex, 10, "Topics", sectionTitleStyle);
        rowIndex++;

        // Row 9: Topics Header
        const topicHeaders = ["Topic Name", "Course", "Average First Attempt Score Percentage", "Average Highest Score Percentage", "Question Count", "Highest Possible Score", "Students Completed"];
        addRowData(topicHeaders);
        for(let i=0; i<topicHeaders.length; i++) {
            addCell(rowIndex - 1, i, topicHeaders[i], topicTableHeaderStyle);
        }

        // Topics Data
        selectedQuizzes.forEach(quiz => {
            const quizSubmissions = quizScores.filter(s => s.quizId === quiz.id);
            
            // Calculate Average First Attempt Score Percentage
            const firstAttempts = quizSubmissions.filter(s => s.attemptNumber === 1);
            const sumFirstAttemptScores = firstAttempts.reduce((sum, sub) => sum + sub.score, 0);
            const sumFirstAttemptTotalItems = firstAttempts.reduce((sum, sub) => sum + sub.totalItems, 0);
            const avgFirstAttemptPercentage = sumFirstAttemptTotalItems > 0 ? ((sumFirstAttemptScores / sumFirstAttemptTotalItems) * 100).toFixed(2) + '%' : '0.00%';

            // Calculate Average Highest Score Percentage
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
                quiz.courseName || 'N/A', // Dynamically use quiz's courseName, default to 'N/A'
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

        // Add 2 empty rows after topics data before student headers
        addRowData([]);
        rowIndex++;
        addRowData([]);
        rowIndex++;

        // Students Table Headers
        const studentBaseCols = 2; // Learner's Name, Completed
        const quizColsPerQuiz = 4; // First Raw, First %, Highest Raw, Highest %

        // First header row (quiz titles merged)
        let currentHeaderCol = studentBaseCols;
        selectedQuizzes.forEach(quiz => {
            addMergedCellStyled(rowIndex, currentHeaderCol, rowIndex, currentHeaderCol + quizColsPerQuiz - 1, quiz.title, studentTableHeaderStyle);
            currentHeaderCol += quizColsPerQuiz;
        });
        // Add empty cells for Learner's Name and Completed in the first header row, and style them
        addCell(rowIndex, 0, "Learner's Name", studentTableHeaderStyle);
        addCell(rowIndex, 1, "Completed", studentTableHeaderStyle);
        
        rowIndex++; // Move to next row for sub-headers

        // Second header row (sub-headers for each quiz)
        const subHeaderRowData = ["Learner's Name", "Completed"]; // Placeholder for the first two columns
        selectedQuizzes.forEach(() => {
            subHeaderRowData.push(...["First Attempt Raw Score", "First Attempt Score Percentage", "Highest Raw Score", "Highest Score Percentage"]);
        });
        addRowData(subHeaderRowData);
        for(let i=0; i<subHeaderRowData.length; i++) {
            addCell(rowIndex - 1, i, subHeaderRowData[i], studentTableHeaderStyle);
        }

        // Student Data Rows
        sortedStudents.forEach(student => {
            // Determine 'Completed' status based on if student has any submission for *any* selected quiz
            const hasCompletedAnySelectedQuiz = quizScores.some(s => s.studentId === student.id && selectedQuizIds.includes(s.quizId));
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
            });
            addRowData(rowData);
            for(let i=0; i<rowData.length; i++) {
                // Apply scoreCellStyle for score columns, studentNameCellStyle for name, checkboxCellStyle for completed status
                if (i === 0) { // Learner's Name
                    addCell(rowIndex - 1, i, rowData[i], studentNameCellStyle);
                } else if (i === 1) { // Completed
                    addCell(rowIndex - 1, i, rowData[i], checkboxCellStyle);
                } else { // Score data
                    addCell(rowIndex - 1, i, rowData[i], scoreCellStyle);
                }
            }
        });
        
        // Set column widths dynamically to match sample visual
        const colWidths = [
            { wch: 25 }, // Learner's Name
            { wch: 10 }, // Completed
        ];
        selectedQuizzes.forEach(() => {
            colWidths.push(
                { wch: 10 }, // First Attempt Raw Score
                { wch: 15 }, // First Attempt Score Percentage
                { wch: 10 }, // Highest Raw Score
                { wch: 15 }  // Highest Score Percentage
            );
        });
        worksheet['!cols'] = colWidths;

        // Finalize worksheet reference (ensures the entire range is covered)
        const finalRange = { s: { r: 0, c: 0 }, e: { r: rowIndex - 1, c: (studentBaseCols + selectedQuizzes.length * quizColsPerQuiz) - 1 } };
        worksheet['!ref'] = XLSX.utils.encode_range(finalRange);

        XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Scores Report");
        XLSX.writeFile(workbook, `${classData.name || 'Class'} - Quiz Report.xlsx`); // Dynamic filename

        onClose();
    };

    const handleClose = () => {
        setSelectedQuizIds([]);
        setGroupingOption('lastName');
        setCollapsedUnits(new Set()); // Ensure all units are collapsed on close
        onClose();
    };

    // Group quizzes by unit (memoized or placed outside render for efficiency if needed)
	const quizzesByUnit = {};
    if (availableQuizzes && units) { 
        availableQuizzes.forEach(quizDetails => {
            let unitDisplayName = 'Uncategorized'; // Default

            // PRIORITY 1: Use quiz's own unitId if available and mapped
            if (quizDetails.unitId && units[quizDetails.unitId]) {
                unitDisplayName = units[quizDetails.unitId];
            } else {
                // FALLBACK: If quiz doesn't have a unitId, or its unitId isn't found,
                // check if it's associated with any sharedContentPosts that have lessons with a unit.
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

    // Sort unit keys to ensure consistent order
    const sortedUnitKeys = Object.keys(quizzesByUnit).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel className="w-full max-w-2xl rounded-2xl bg-white p-0 shadow-2xl overflow-hidden transition-all transform backdrop-filter backdrop-blur-md bg-opacity-90 ring-1 ring-gray-200">
                <motion.div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-full flex flex-col"
                    variants={dropIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    {/* Header Section with Gradient */}
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

                    {/* Main Content Area */}
                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-5">
                        {/* Quiz Selection Section - Grouped by unit */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-inner">
                            <label className="flex items-center text-base font-bold text-gray-800 mb-3">
                                <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
                                1. Select Quizzes to Include
                            </label>
                            {availableQuizzes.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">
                                    No quizzes available to generate a report.
                                </p>
                            ) : (!lessons && Object.keys(units).length === 0) ? ( // Check if units are loaded, indicating data readiness
                                <p className="text-gray-500 italic text-sm">
                                    Loading quiz data...
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
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
                                                            onClick={(e) => e.stopPropagation()} // Prevent button click from toggling collapse
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

                        {/* Grouping Option Section */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-inner">
                            <label className="flex items-center text-base font-bold text-gray-800 mb-3">
                                <UsersIcon className="h-5 w-5 mr-2 text-purple-600" />
                                2. Group Students By
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2.5 rounded-full font-semibold text-sm transition-colors
                                    ${groupingOption === 'lastName' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="grouping"
                                        value="lastName"
                                        checked={groupingOption === 'lastName'}
                                        onChange={(e) => setGroupingOption(e.target.value)}
                                        className="hidden"
                                    />
                                    Last Name
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2.5 rounded-full font-semibold text-sm transition-colors
                                    ${groupingOption === 'gender' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="grouping"
                                        value="gender"
                                        checked={groupingOption === 'gender'}
                                        onChange={(e) => setGroupingOption(e.target.value)}
                                        className="hidden"
                                    />
                                    Gender
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footer and Action Buttons */}
                    <div className="flex-shrink-0 p-5 border-t border-gray-200 bg-white bg-opacity-70 flex justify-end gap-2">
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
                </motion.div>
            </DialogPanel>
        </Dialog>
    );
}
