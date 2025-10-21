import React from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';

const DownloadReportModal = ({ isOpen, onClose, classData, analytics, studentsMap }) => {
    const { showToast } = useToast();

    const handleDownload = (groupBy) => {
        if (!window.XLSX) {
            showToast("Excel library is loading. Please try again in a moment.", "error");
            return;
        }

        const uniqueQuizzes = analytics.quizzes.reduce((acc, quiz) => {
            if (!acc.some(q => q.id === quiz.id)) {
                acc.push(quiz);
            }
            return acc;
        }, []);
        
        let studentData = Array.from(studentsMap.values());

        // Sort students based on the chosen criteria
        if (groupBy === 'lastName') {
            studentData.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
        } else if (groupBy === 'gender') {
            studentData.sort((a, b) => (a.gender || 'Z').localeCompare(b.gender || 'Z'));
        }

        const studentRows = studentData.map(student => {
            const row = {
                'Last Name': student.lastName,
                'First Name': student.firstName,
                'Gender': student.gender || 'Not specified'
            };
            uniqueQuizzes.forEach(quiz => {
                const studentSubmissions = analytics.allSubmissions.filter(sub => sub.studentId === student.id && sub.quizId === quiz.id);
                const highestScore = studentSubmissions.length > 0 ? Math.max(...studentSubmissions.map(s => s.score)) : 'N/A';
                row[quiz.title] = highestScore;
            });
            return row;
        });
        
        const ws = window.XLSX.utils.json_to_sheet(studentRows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Quiz Results");
        window.XLSX.writeFile(wb, `Quiz_Report_${classData.name.replace(/\s+/g, '_')}.xlsx`);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Download Quiz Report">
            <div className="space-y-4">
                <p>How would you like to group the student results in the report?</p>
                <button onClick={() => handleDownload('lastName')} className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors">
                    Group by Last Name
                </button>
                <button onClick={() => handleDownload('gender')} className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors">
                    Group by Gender
                </button>
            </div>
        </Modal>
    );
};

export default DownloadReportModal;