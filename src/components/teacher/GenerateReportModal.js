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

    // --- NEW: Debugging useEffect to log props ---
    useEffect(() => {
        if (isOpen) {
            console.log("GenerateReportModal: `availableQuizzes` prop:", availableQuizzes);
            console.log("GenerateReportModal: `lessons` prop:", lessons);
            console.log("GenerateReportModal: `units` prop:", units);
            
            // Only set collapsed units if the modal is open and units data is available
            if (units) {
                const allUnitKeys = Object.keys(units);
                setCollapsedUnits(new Set(allUnitKeys.concat('Uncategorized')));
            }
        }
    }, [isOpen, units, lessons, availableQuizzes]);

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
        // Step 1: Dynamically build the report headers based on selected quizzes
        // ====================================================================
        const baseHeader1 = ["Last Name", "First Name", "Gender"];
        const baseHeader2 = ["", "", ""];
        const mergeRanges = [];
        let colIndex = baseHeader1.length;

        selectedQuizzes.forEach(quiz => {
            baseHeader1.push(quiz.title, "", "");
            baseHeader2.push("Attempt 1", "Attempt 2", "Attempt 3");
            mergeRanges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 2 } });
            colIndex += 3;
        });

        const header1 = baseHeader1;
        const header2 = baseHeader2;

        const dataRows = [header1, header2];

        // ====================================================================
        // Step 2: Dynamically build the data rows for each student
        // ====================================================================
        sortedStudents.forEach(student => {
            const row = [student.lastName, student.firstName, student.gender || ''];

            selectedQuizzes.forEach(quiz => {
                const attempts = quizScores
                    .filter(s => s.studentId === student.id && s.quizId === quiz.id)
                    .sort((a, b) => a.attemptNumber - b.attemptNumber);

                for (let i = 1; i <= 3; i++) {
                    const attempt = attempts.find(a => a.attemptNumber === i);
                    row.push(attempt ? `${attempt.score}/${attempt.totalItems}` : '—');
                }
            });

            dataRows.push(row);
        });

        // ====================================================================
        // Step 3: Create and style the worksheet
        // ====================================================================
        const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

        // Apply merge ranges
        worksheet['!merges'] = worksheet['!merges'] || [];
        mergeRanges.forEach(merge => worksheet['!merges'].push(merge));

        // Style headers
        const styleHeader = {
            font: { bold: true, sz: 12 },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: "FFFFCC" } }
        };
        // Apply header styling to all header cells
        Object.keys(worksheet).forEach(cell => {
            const cellRef = XLSX.utils.decode_cell(cell);
            if (cellRef.r === 0 || cellRef.r === 1) {
                worksheet[cell].s = styleHeader;
            }
        });

        // ====================================================================
        // Step 4: Export the workbook
        // ====================================================================
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Scores");
        XLSX.writeFile(workbook, `${classData.name} - Class Report.xlsx`);

        onClose();
    };

    const handleClose = () => {
        setSelectedQuizIds([]);
        setGroupingOption('lastName');
        setCollapsedUnits(new Set());
        onClose();
    };

	const quizzesByUnit = {};

	    if (lessons && units && sharedContentPosts) {
	        sharedContentPosts.forEach(post => {
	            const quizIdsInPost = post.quizIds || [];
	            const lessonIdsInPost = post.lessonIds || [];
	            const postUnits = new Set();

	            // Determine the unit(s) for the post based on associated lessons
	            if (lessonIdsInPost.length > 0) {
	                lessonIdsInPost.forEach(lessonId => {
	                    const lesson = lessons.find(l => l.id === lessonId);
	                    if (lesson && lesson.unitId) {
	                        postUnits.add(units[lesson.unitId] || 'Uncategorized');
	                    }
	                });
	            }

	            // If no units were found but there are quizzes, default to 'Uncategorized' for those quizzes
	            if (postUnits.size === 0 && quizIdsInPost.length > 0) {
	                postUnits.add('Uncategorized');
	            }

	            // Assign each quiz in the post to its unit(s)
	            quizIdsInPost.forEach(quizId => {
	                const quizDetails = availableQuizzes.find(q => q.id === quizId);
	                if (quizDetails) {
	                    postUnits.forEach(unitName => {
	                        if (!quizzesByUnit[unitName]) {
	                            quizzesByUnit[unitName] = [];
	                        }
	                        // Avoid duplicates if a quiz is associated with multiple units through different lessons/posts
	                        if (!quizzesByUnit[unitName].some(q => q.id === quizDetails.id)) {
	                            quizzesByUnit[unitName].push(quizDetails);
	                        }
	                    });
	                }
	            });
	        });
	    }

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
                    <div className="flex items-center justify-between p-6 bg-gradient-to-br from-blue-600 to-purple-700 text-white shadow-md">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-white bg-opacity-20 mr-4">
                                <DocumentChartBarIcon className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-3xl font-extrabold text-white leading-tight">
                                Generate Score Report
                            </h3>
                        </div>
                        <button onClick={handleClose} className="text-white hover:text-gray-200 transition-colors">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-grow p-8 overflow-y-auto custom-scrollbar space-y-6">
                        {/* Quiz Selection Section - Grouped by unit */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-inner">
                            <label className="flex items-center text-lg font-bold text-gray-800 mb-4">
                                <ClipboardDocumentCheckIcon className="h-6 w-6 mr-2 text-blue-600" />
                                1. Select Quizzes to Include
                            </label>
                            {availableQuizzes.length === 0 ? (
                                <p className="text-gray-500 italic">
                                    No quizzes available to generate a report.
                                </p>
                            ) : (!lessons || !units) ? (
                                <p className="text-gray-500 italic">
                                    Loading quiz data...
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar">
                                    {sortedUnitKeys.map(unitDisplayName => (
                                        <div key={unitDisplayName} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                            <button
                                                className="flex items-center justify-between w-full p-3 font-bold text-base text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors border-b border-gray-100"
                                                onClick={() => toggleUnitCollapse(unitDisplayName)}
                                            >
                                                {unitDisplayName}
                                                {collapsedUnits.has(unitDisplayName) ? (
                                                    <ChevronDownIcon className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                                                ) : (
                                                    <ChevronUpIcon className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                                                )}
                                            </button>
                                            {!collapsedUnits.has(unitDisplayName) && (
                                                <div className="p-3 space-y-2">
                                                    {quizzesByUnit[unitDisplayName]
                                                        .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
                                                        .map(quiz => (
                                                            <div
                                                                key={quiz.id}
                                                                className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors
                                                                ${selectedQuizIds.includes(quiz.id) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                                                                onClick={() => handleQuizSelection(quiz.id)}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedQuizIds.includes(quiz.id)}
                                                                    onChange={() => handleQuizSelection(quiz.id)}
                                                                    className="h-5 w-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 mr-3"
                                                                />
                                                                <span className="font-medium text-gray-800">{quiz.title}</span>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Grouping Option Section */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-inner">
                            <label className="flex items-center text-lg font-bold text-gray-800 mb-4">
                                <UsersIcon className="h-6 w-6 mr-2 text-purple-600" />
                                2. Group Students By
                            </label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-3 rounded-full font-semibold transition-colors
                                    ${groupingOption === 'lastName' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
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
                                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-3 rounded-full font-semibold transition-colors
                                    ${groupingOption === 'gender' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
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
                    <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-white bg-opacity-70 flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 shadow-md"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={selectedQuizIds.length === 0}
                            className={`px-6 py-3 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 shadow-lg
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
