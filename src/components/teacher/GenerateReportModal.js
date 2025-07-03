import React, { useState } from 'react';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { useToast } from '../../contexts/ToastContext';

import * as XLSX from 'sheetjs-style';

export default function GenerateReportModal({ isOpen, onClose, classData, availableQuizzes, quizScores }) {
    const { showToast } = useToast();
    const [selectedQuizIds, setSelectedQuizIds] = useState([]);
    const [groupingOption, setGroupingOption] = useState('lastName'); // 'lastName' or 'gender'

    const handleQuizSelection = (quizId) => {
        setSelectedQuizIds(prev => 
            prev.includes(quizId) ? prev.filter(id => id !== quizId) : [...prev, quizId]
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

        // Build header with merged quiz titles (3 attempts each)
        const header1 = ["Last Name", "First Name", "Gender"];
        const header2 = ["", "", ""];
        selectedQuizzes.forEach(q => {
            header1.push(q.title, "", "");
            header2.push("Attempt 1", "Attempt 2", "Attempt 3");
        });

        // Build data rows
        const dataRows = [header1, header2];

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

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

        // Merge quiz headers across 3 columns
        let colIndex = 3;
        selectedQuizzes.forEach(() => {
            worksheet['!merges'] = worksheet['!merges'] || [];
            worksheet['!merges'].push({
                s: { r: 0, c: colIndex },
                e: { r: 0, c: colIndex + 2 }
            });
            colIndex += 3;
        });

        // Style headers
        const styleHeader = {
            font: { bold: true, sz: 12 },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: "FFFFCC" } }
        };
        Object.keys(worksheet).forEach(cell => {
            if (cell.startsWith('A1') || cell.startsWith('A2')) return;
            const cellRef = XLSX.utils.decode_cell(cell);
            if (cellRef.r === 0 || cellRef.r === 1) {
                worksheet[cell].s = styleHeader;
            }
        });

        // Export
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Scores");
        XLSX.writeFile(workbook, `${classData.name} - Score Report.xlsx`);

        onClose();
    };

    const handleClose = () => {
        setSelectedQuizIds([]);
        setGroupingOption('lastName');
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <Title className="mb-4">Generate Score Report</Title>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Quizzes to Include</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">
                            {availableQuizzes.map(quiz => (
                                <label key={quiz.id} className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedQuizIds.includes(quiz.id)}
                                        onChange={() => handleQuizSelection(quiz.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{quiz.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">2. Group Students By</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio"
                                    name="grouping"
                                    value="lastName"
                                    checked={groupingOption === 'lastName'}
                                    onChange={(e) => setGroupingOption(e.target.value)}
                                />
                                Last Name
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio"
                                    name="grouping"
                                    value="gender"
                                    checked={groupingOption === 'gender'}
                                    onChange={(e) => setGroupingOption(e.target.value)}
                                />
                                Gender
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleGenerate}>Generate Report</Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}
