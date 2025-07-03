// src/components/admin/AdminDashboard.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserPlus, Trash2, Edit, Shield, GraduationCap, User, Eye, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

import Spinner from '../components/common/Spinner';
import AddUserModal from '../components/admin/AddUserModal';
import EditPasswordModal from '../components/admin/EditPasswordModal';
import GenerateUsersModal from '../components/admin/GenerateUsersModal';
import DownloadAccountsModal from '../components/admin/DownloadAccountsModal';


const AdminDashboard = () => {
    const { firestoreService } = useAuth();
    const { showToast } = useToast();
    const [groupedUsers, setGroupedUsers] = useState({ admins: [], teachers: [], students: [] });
    const [loading, setLoading] = useState(true);
    // --- NEW: State to track selected user IDs for deletion ---
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    
    // ... (other state variables remain the same)
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDownloadModalOpen, setDownloadModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);


    // --- NEW: Handler for individual checkbox clicks ---
    const handleSelectUser = (userId) => {
        setSelectedUserIds(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(userId)) {
                newSelected.delete(userId);
            } else {
                newSelected.add(userId);
            }
            return newSelected;
        });
    };

    // --- NEW: Handler for "Select All" checkbox in a table ---
    const handleSelectAll = (userIds) => {
        // Check if all users in the current list are already selected
        const allSelected = userIds.every(id => selectedUserIds.has(id));

        setSelectedUserIds(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (allSelected) {
                // If all are selected, deselect them
                userIds.forEach(id => newSelected.delete(id));
            } else {
                // Otherwise, select them all
                userIds.forEach(id => newSelected.add(id));
            }
            return newSelected;
        });
    };

    // --- NEW: Handler for the "Delete Selected" button ---
    const handleDeleteSelected = async () => {
        const userIdsToDelete = Array.from(selectedUserIds);
        if (userIdsToDelete.length === 0) {
            showToast('No users selected.', 'warning');
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${userIdsToDelete.length} selected user(s)? This action cannot be undone.`)) {
            try {
                await firestoreService.deleteMultipleUsers(userIdsToDelete);
                showToast(`${userIdsToDelete.length} user(s) deleted successfully!`, 'success');
                setSelectedUserIds(new Set()); // Clear selection
                fetchAndGroupUsers(); // Refresh data
            } catch (error) {
                showToast('Failed to delete users.', 'error');
                console.error("Failed to delete users: ", error);
            }
        }
    };


    // --- MODIFIED: The UserTable component now includes checkboxes ---
    const UserTable = ({ title, users, icon }) => {
        const userIdsInTable = users.map(u => u.id);
        const allInTableSelected = userIdsInTable.length > 0 && userIdsInTable.every(id => selectedUserIds.has(id));

        return (
            <div className="mb-8">
                <div className="flex items-center mb-3">
                    {icon}
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-700 ml-2">{title}</h2>
                </div>
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        onChange={() => handleSelectAll(userIdsInTable)}
                                        checked={allInTableSelected}
                                        disabled={userIdsInTable.length === 0}
                                    />
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id} className={selectedUserIds.has(user.id) ? 'bg-indigo-50' : ''}>
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            onChange={() => handleSelectUser(user.id)}
                                            checked={selectedUserIds.has(user.id)}
                                        />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">{user.firstName} {user.lastName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{user.email}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleShowPassword(user.password)} className="text-gray-500 hover:text-blue-700 mr-3" title="Show Password"><Eye size={18} /></button>
                                        <button onClick={() => { setSelectedUser(user); setEditModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Change Password"><Edit size={18} /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900" title="Delete User"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No users in this category.</p>
                    )}
                </div>
            </div>
        )
    };
    
    // ... (The rest of the file remains unchanged, including handleGenerateUsers, exportToXlsx, etc.)
    const exportToXlsx = (usersToExport, roleName) => {
        // Define the styles
        const headerStyle = {
            font: {
                bold: true,
                sz: 16, // Set font size to 14
                color: { rgb: "FFFFFFFF" } // White font color
            },
            fill: {
                fgColor: { rgb: "FF800000" } // Maroon fill color (hex: 800000)
            },
            alignment: {
                horizontal: "center",
                vertical: "center"
            }
        };

        const cellStyle = {
            alignment: { vertical: "center" }
        };

        // 1. Format the data for the worksheet
        const tableData = usersToExport.map(user => ({
            "Name": `${user.firstName} ${user.lastName}`,
            "Username": user.email,
            "Password": user.password,
            "Role": user.role,
            "Grade Level": user.gradeLevel || 'N/A'
        }));

        // 2. Create a new worksheet from the formatted data
        const ws = XLSX.utils.json_to_sheet(tableData);

        // 3. Calculate column widths to achieve "autofit"
        const colWidths = [
            { wch: 30 }, // Name
            { wch: 30 }, // Username
            { wch: 15 }, // Password
            { wch: 15 }, // Role
            { wch: 15 } // Grade Level
        ];
        ws['!cols'] = colWidths;

        // 4. Apply styles to headers and cells
        // The 'A1', 'B1', etc., refer to the cells in the spreadsheet
        const headers = ['A1', 'B1', 'C1', 'D1', 'E1'];
        headers.forEach(cell => {
            ws[cell].s = headerStyle;
        });

        // Loop through all data rows to apply basic cell styling
        for (let i = 0; i < tableData.length; i++) {
            const rowNum = i + 2; // +2 because Excel rows are 1-based and we have a header
            headers.forEach((h, j) => {
                const cellRef = `${h.charAt(0)}${rowNum}`;
                if (ws[cellRef]) {
                    ws[cellRef].s = cellStyle;
                }
            });
        }

        // 5. Create a new workbook and append the worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "User Accounts");

        // 6. Write the workbook and trigger the download
        const filename = `${roleName}-accounts-${new Date().toLocaleDateString()}.xlsx`;
        XLSX.writeFile(wb, filename);
    };
    const handleGenerateUsers = async ({ quantity, names, role, gradeLevel }) => {
        try {
            const newUsers = [];
            const baseCount = groupedUsers[`${role}s`]?.length || 0;
            const emailPrefix = `srcs${role === 'student' ? 'learn' : (role === 'teacher' ? 'teach' : 'admin')}`;
            const generatePassword = () => {
                const length = 6;
                const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
                let password = "";
                for (let i = 0; i < length; ++i) {
                    password += charset.charAt(Math.floor(Math.random() * charset.length));
                }
                return password;
            };

            const createUserObject = (userNumber, firstName, lastName) => {
                const user = {
                    email: `${emailPrefix}${userNumber}@srcs.edu`,
                    password: generatePassword(),
                    role: role,
                    firstName: firstName,
                    lastName: lastName,
                    createdAt: new Date()
                };
                // Add gradeLevel if the role is student
                if (role === 'student') {
                    user.gradeLevel = gradeLevel;
                }
                return user;
            };

            if (names) {
                const nameList = names.split('\n').filter(name => name.trim() !== '');
                nameList.forEach((fullName, index) => {
                    const nameParts = fullName.trim().split(' ');
                    const firstName = nameParts[0] || 'User';
                    const lastName = nameParts.slice(1).join(' ') || `Generated ${index + 1}`;
                    newUsers.push(createUserObject(baseCount + index + 1, firstName, lastName));
                });
            } else {
                for (let i = 0; i < quantity; i++) {
                    const lastName = `${role.charAt(0).toUpperCase() + role.slice(1)} ${baseCount + i + 1}`;
                    newUsers.push(createUserObject(baseCount + i + 1, "Generated", lastName));
                }
            }

            if (newUsers.length === 0) {
                showToast('No valid names to process.', 'warning'); return;
            }

            await firestoreService.addMultipleUsers(newUsers);
            showToast(`${newUsers.length} ${role}(s) generated successfully!`, 'success');
            setGenerateModalOpen(false);
            fetchAndGroupUsers();

        } catch (error) {
            console.error("Generation Error: ", error);
            showToast(`Failed to generate users: ${error.message}`, 'error');
        }
    };
    const fetchAndGroupUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await firestoreService.getAllUsers();
            const groups = { admins: [], teachers: [], students: [] };
            allUsers.forEach(user => {
                if (user.role === 'admin') groups.admins.push(user);
                else if (user.role === 'teacher') groups.teachers.push(user);
                else groups.students.push(user);
            });
            Object.keys(groups).forEach(key => {
                groups[key].sort((a, b) => a.lastName.localeCompare(b.lastName));
            });
            setGroupedUsers(groups);
        } catch (error) {
            showToast('Failed to fetch users.', 'error');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchAndGroupUsers();
    }, []);

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await firestoreService.deleteUser(userId);
                showToast('User deleted successfully!', 'success');
                fetchAndGroupUsers();
            } catch (error) {
                showToast('Failed to delete user.', 'error');
            }
        }
    };
    const handleUpdatePassword = async (newPassword) => {
        try {
            await firestoreService.updateUserPassword(selectedUser.id, newPassword);
            showToast('Password updated successfully!', 'success');
            setEditModalOpen(false);
            setSelectedUser(null);
        } catch (error) {
            showToast('Failed to update password.', 'error');
        }
    };
    const handleShowPassword = (password) => {
        const proceed = window.confirm(
            "WARNING: You are about to view a user's private password. This is a significant security risk. Do you want to proceed?"
        );
        if (proceed) {
            window.alert(`The user's password is: ${password}`);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    Admin Console: User Management
                </h1>
                <div className="flex items-center gap-2">
                    {/* --- NEW: Conditional "Delete Selected" Button --- */}
                    {selectedUserIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                        >
                            <Trash2 size={20} className="mr-2" />
                            Delete ({selectedUserIds.size})
                        </button>
                    )}
                    <button onClick={() => setDownloadModalOpen(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"><Download size={20} className="mr-2" />Download Accounts</button>
                    <button onClick={() => setGenerateModalOpen(true)} className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"><Users size={20} className="mr-2" />Generate Users</button>
                </div>
            </div>

            <UserTable title="Administrators" users={groupedUsers.admins} icon={<Shield size={24} className="text-red-600" />} />
            <UserTable title="Teachers" users={groupedUsers.teachers} icon={<GraduationCap size={24} className="text-blue-600" />} />
            <UserTable title="Students" users={groupedUsers.students} icon={<User size={24} className="text-green-600" />} />

            {/* Modals */}
            {isAddModalOpen && <AddUserModal onSubmit={() => { }} onClose={() => setAddModalOpen(false)} />}
            {isEditModalOpen && <EditPasswordModal user={selectedUser} onSubmit={handleUpdatePassword} onClose={() => setEditModalOpen(false)} />}
            {isGenerateModalOpen && <GenerateUsersModal onSubmit={handleGenerateUsers} onClose={() => setGenerateModalOpen(false)} />}
            {isDownloadModalOpen && <DownloadAccountsModal groupedUsers={groupedUsers} onExport={exportToXlsx} onClose={() => setDownloadModalOpen(false)} />}
        </div>
    );
};

export default AdminDashboard;