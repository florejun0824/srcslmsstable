// src/components/admin/DownloadAccountsModal.js

import React, { useState } from 'react';
import { Download, X } from 'lucide-react';

const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const DownloadAccountsModal = ({ groupedUsers, onExport, onClose }) => {
    const [selectedRole, setSelectedRole] = useState('student');
    // --- NEW --- State for selected grade level filter
    const [selectedGrade, setSelectedGrade] = useState('all');

    const handleDownload = () => {
        let usersToExport = [];
        let roleName = selectedRole;

        if (selectedRole === 'all') {
            usersToExport = [...groupedUsers.students, ...groupedUsers.teachers, ...groupedUsers.admins];
            roleName = 'all-users';
        } else if (selectedRole === 'student') {
            // --- NEW: Filter students by grade level ---
            const students = groupedUsers.students || [];
            if (selectedGrade === 'all') {
                usersToExport = students;
                roleName = 'all-students';
            } else {
                usersToExport = students.filter(s => s.gradeLevel === selectedGrade);
                roleName = selectedGrade.toLowerCase().replace(' ', '-');
            }
        } else {
            usersToExport = groupedUsers[`${selectedRole}s`] || [];
        }

        if (usersToExport.length === 0) {
            alert(`There are no users to export with the selected criteria.`);
            return;
        }

        onExport(usersToExport, roleName);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm m-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center"><Download className="mr-3 text-blue-600" /> Export User Accounts</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                            Select Role to Download
                        </label>
                        <select
                            id="role" value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="student">Students</option>
                            <option value="teacher">Teachers</option>
                            <option value="admin">Administrators</option>
                            <option value="all">All Users</option>
                        </select>
                    </div>

                    {/* --- NEW: Conditional Grade Level Filter --- */}
                    {selectedRole === 'student' && (
                        <div>
                             <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-1">
                                Filter by Grade Level
                            </label>
                            <select
                                id="gradeLevel" value={selectedGrade}
                                onChange={(e) => setSelectedGrade(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Grade Levels</option>
                                {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="button" onClick={handleDownload} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Download size={18} className="mr-2" />Download CSV</button>
                </div>
            </div>
        </div>
    );
};

export default DownloadAccountsModal;