// src/components/admin/DownloadAccountsModal.jsx

import React, { useState } from 'react';
import { Download, X, ChevronDown } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { useToast } from '../../contexts/ToastContext';

const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

// --- VISUAL HELPERS ---
const glassInput = "w-full appearance-none px-4 py-3 bg-gray-50/50 dark:bg-black/20 border border-gray-200/60 dark:border-white/10 rounded-xl text-[15px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all";
const labelStyle = "block text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide ml-1";

const DownloadAccountsModal = ({ groupedUsers, onClose }) => {
    const { showToast } = useToast();
    const [selectedRole, setSelectedRole] = useState('student');
    const [selectedGrade, setSelectedGrade] = useState('all');
    const [isExporting, setIsExporting] = useState(false);

    const handleDownload = async () => {
        let usersToExport = [];
        let roleName = selectedRole;

        // 1. Filter Users based on Role and Grade
        if (selectedRole === 'all') {
            usersToExport = [...groupedUsers.students, ...groupedUsers.teachers, ...groupedUsers.admins];
            roleName = 'all-users';
        } else if (selectedRole === 'student') {
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
            showToast(`There are no users to export with the selected criteria.`, "error");
            return;
        }

        setIsExporting(true);

        try {
            // 2. Lazy Load Excel Library (xlsx-js-style is required for styling)
            const XLSX = await import('xlsx-js-style');

            // 3. Map Data & Columns (Including Password)
            // WARNING: Exporting passwords is a security risk. Ensure this file is handled securely.
            const data = usersToExport.map(user => ({
                "Full Name": `${user.lastName}, ${user.firstName}`,
                "Role": user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Unknown",
                "Email / Username": user.email || "N/A",
                "Password": user.password || "N/A", // <--- PASSWORD INCLUDED HERE
                "Grade Level": user.gradeLevel || "N/A",
                "Section": user.section || "N/A",
                "Student ID": user.studentId || "N/A",
                "Account Created": user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : "N/A"
            }));

            // 4. Create Worksheet
            const worksheet = XLSX.utils.json_to_sheet(data);

            // 5. Apply Professional Styling
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            // Style Definitions
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
                fill: { fgColor: { rgb: "4472C4" } }, // Professional Blue Header
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };

            const cellStyle = {
                font: { name: "Arial", sz: 10 },
                alignment: { horizontal: "left", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "B2B2B2" } },
                    bottom: { style: "thin", color: { rgb: "B2B2B2" } },
                    left: { style: "thin", color: { rgb: "B2B2B2" } },
                    right: { style: "thin", color: { rgb: "B2B2B2" } }
                }
            };

            // Apply styles to all cells
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!worksheet[cellAddress]) continue;

                    if (R === 0) {
                        worksheet[cellAddress].s = headerStyle; // Header Styling
                    } else {
                        worksheet[cellAddress].s = cellStyle;   // Data Styling
                    }
                }
            }

            // 6. Set Column Widths
            worksheet['!cols'] = [
                { wch: 25 }, // Full Name
                { wch: 10 }, // Role
                { wch: 30 }, // Email
                { wch: 20 }, // Password
                { wch: 15 }, // Grade
                { wch: 15 }, // Section
                { wch: 15 }, // Student ID
                { wch: 15 }  // Created At
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts");

            const fileName = `Accounts_${roleName}_${new Date().getTime()}.xlsx`;

            // 7. Save File (Mobile vs Web Logic)
            if (Capacitor.isNativePlatform()) {
                let permStatus = await Filesystem.checkPermissions();
                if (permStatus.publicStorage !== 'granted') {
                    permStatus = await Filesystem.requestPermissions();
                }
                
                if (permStatus.publicStorage !== 'granted') {
                    showToast("Storage permission is required.", "error");
                    setIsExporting(false);
                    return;
                }

                const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true
                });
                
                showToast("File saved to Documents.", "success");
                await FileOpener.open({
                    filePath: result.uri,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });
            } else {
                // Web Export
                XLSX.writeFile(workbook, fileName);
                showToast("Export successful!", "success");
            }

            onClose();

        } catch (error) {
            console.error("Export failed:", error);
            showToast("Failed to export accounts. Please try again.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* --- 1. BACKGROUND & AURORA EFFECTS --- */}
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            {/* Aurora Blobs (Animated) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse delay-1000"></div>
            </div>

            {/* --- 2. MODAL CONTAINER --- */}
            <div className="relative w-full max-w-[380px] transform overflow-hidden rounded-[28px] bg-white/70 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl shadow-[0_40px_80px_-12px_rgba(0,0,0,0.3)] ring-1 ring-white/20 dark:ring-white/5 transition-all duration-300 ease-out scale-100 opacity-100">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-2">
                    <div className="flex items-center gap-4">
                        {/* Apple-style Squaricle Icon */}
                        <div className="w-[42px] h-[42px] rounded-[12px] bg-gradient-to-b from-[#007AFF] to-[#0062CC] flex items-center justify-center shadow-lg shadow-blue-500/30 border-t border-white/20">
                            <Download className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-[19px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                Export Data
                            </h2>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                                Select criteria to download
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100/80 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-400 transition-colors backdrop-blur-sm"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 pt-4 space-y-5">
                    {/* Role Selector */}
                    <div className="relative group">
                        <label htmlFor="role" className={labelStyle}>
                            Account Role
                        </label>
                        <div className="relative">
                            <select
                                id="role" 
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className={glassInput}
                            >
                                <option value="student">Students</option>
                                <option value="teacher">Teachers</option>
                                <option value="admin">Administrators</option>
                                <option value="all">All Users</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Grade Selector (Conditional) */}
                    <div className={`relative transition-all duration-300 ease-in-out ${selectedRole === 'student' ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                        <label htmlFor="gradeLevel" className={labelStyle}>
                            Grade Level
                        </label>
                        <div className="relative">
                            <select
                                id="gradeLevel" 
                                value={selectedGrade}
                                onChange={(e) => setSelectedGrade(e.target.value)}
                                className={glassInput}
                            >
                                <option value="all">All Grade Levels</option>
                                {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-5 py-2.5 text-[15px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleDownload} 
                        disabled={isExporting}
                        className={`
                            relative overflow-hidden px-6 py-2.5 rounded-xl text-white text-[15px] font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200
                            ${isExporting 
                                ? 'bg-blue-400 cursor-wait' 
                                : 'bg-[#007AFF] hover:bg-[#0062CC] active:scale-95'}
                        `}
                    >
                        <div className="flex items-center gap-2 relative z-10">
                            {isExporting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Exporting...
                                </span>
                            ) : (
                                <>
                                    Download
                                </>
                            )}
                        </div>
                        {/* Subtle sheen effect on button */}
                        {!isExporting && <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadAccountsModal;