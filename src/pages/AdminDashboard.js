// src/components/admin/AdminDashboard.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserPlus, Trash2, Edit, Shield, GraduationCap, User, Eye, Users, Download, UserX, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

import Spinner from '../components/common/Spinner';
import AddUserModal from '../components/admin/AddUserModal';
import EditPasswordModal from '../components/admin/EditPasswordModal';
import GenerateUsersModal from '../components/admin/GenerateUsersModal';
import DownloadAccountsModal from '../components/admin/DownloadAccountsModal';
import EditRoleModal from '../components/admin/EditRoleModal'; // <-- NEW: Import for editing roles

const AdminDashboard = () => {
    const { firestoreService } = useAuth();
    const { showToast } = useToast();
    const [allUsers, setAllUsers] = useState([]);
    const [groupedUsers, setGroupedUsers] = useState({ admins: [], teachers: [], students: [] });
    const [restrictedUsers, setRestrictedUsers] = useState([]); // <-- NEW: State for restricted accounts
    const [loading, setLoading] = useState(true);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [activeTab, setActiveTab] = useState('active'); // <-- NEW: State for active/restricted tabs

    // Modal states
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDownloadModalOpen, setDownloadModalOpen] = useState(false);
    const [isEditRoleModalOpen, setEditRoleModalOpen] = useState(false); // <-- NEW: State for edit role modal
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchAndGroupUsers = async () => {
        setLoading(true);
        try {
            const users = await firestoreService.getAllUsers();
            setAllUsers(users);

            // NEW: Separate users into active and restricted groups
            const active = [];
            const restricted = [];
            users.forEach(user => {
                if (user.isRestricted) {
                    restricted.push(user);
                } else {
                    active.push(user);
                }
            });

            const groups = { admins: [], teachers: [], students: [] };
            active.forEach(user => {
                if (user.role === 'admin') groups.admins.push(user);
                else if (user.role === 'teacher') groups.teachers.push(user);
                else groups.students.push(user);
            });

            Object.keys(groups).forEach(key => {
                groups[key].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
            });
            
            setGroupedUsers(groups);
            setRestrictedUsers(restricted.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')));

        } catch (error) {
            showToast('Failed to fetch users.', 'error');
            console.error("Fetch Users Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndGroupUsers();
    }, []);

    // --- SELECTION HANDLERS ---
    const handleSelectUser = (userId) => {
        setSelectedUserIds(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(userId)) newSelected.delete(userId);
            else newSelected.add(userId);
            return newSelected;
        });
    };

    const handleSelectAll = (userIds) => {
        const allSelected = userIds.every(id => selectedUserIds.has(id));
        setSelectedUserIds(prev => {
            const newSelected = new Set(prev);
            if (allSelected) userIds.forEach(id => newSelected.delete(id));
            else userIds.forEach(id => newSelected.add(id));
            return newSelected;
        });
    };

    // --- CRUD HANDLERS ---
    const handleDeleteSelected = async () => {
        const userIdsToDelete = Array.from(selectedUserIds);
        if (userIdsToDelete.length === 0) return showToast('No users selected.', 'warning');
        if (window.confirm(`Are you sure you want to delete ${userIdsToDelete.length} selected user(s)? This action cannot be undone.`)) {
            try {
                await firestoreService.deleteMultipleUsers(userIdsToDelete);
                showToast(`${userIdsToDelete.length} user(s) deleted successfully!`, 'success');
                setSelectedUserIds(new Set());
                fetchAndGroupUsers();
            } catch (error) {
                showToast('Failed to delete users.', 'error');
            }
        }
    };

    const handleGenerateUsers = async ({ quantity, names, role, gradeLevel, commonPassword }) => {
        try {
            // ... (The user generation logic now includes commonPassword)
            const baseCount = allUsers.length;
            const emailPrefix = `srcs${role === 'student' ? 'learn' : (role === 'teacher' ? 'teach' : 'admin')}`;
            const generateRandomPassword = () => (Math.random().toString(36).slice(-8));

            const newUsers = [];
            if (names) {
                const nameList = names.split('\n').filter(name => name.trim() !== '');
                nameList.forEach((fullName, index) => {
                    const nameParts = fullName.trim().split(' ');
                    const firstName = nameParts[0] || 'User';
                    const lastName = nameParts.slice(1).join(' ') || `Generated ${index + 1}`;
                    newUsers.push({
                        email: `${emailPrefix}${baseCount + index + 1}@srcs.edu`,
                        password: commonPassword || generateRandomPassword(),
                        role, firstName, lastName,
                        gradeLevel: role === 'student' ? gradeLevel : null,
                    });
                });
            } else {
                for (let i = 0; i < quantity; i++) {
                    newUsers.push({
                        email: `${emailPrefix}${baseCount + i + 1}@srcs.edu`,
                        password: commonPassword || generateRandomPassword(),
                        role,
                        firstName: "Generated",
                        lastName: `${role.charAt(0).toUpperCase() + role.slice(1)} ${baseCount + i + 1}`,
                        gradeLevel: role === 'student' ? gradeLevel : null,
                    });
                }
            }

            if (newUsers.length === 0) return showToast('No valid names to process.', 'warning');
            
            await firestoreService.addMultipleUsers(newUsers);
            showToast(`${newUsers.length} ${role}(s) generated successfully!`, 'success');
            setGenerateModalOpen(false);
            fetchAndGroupUsers();
        } catch (error) {
            showToast(`Failed to generate users: ${error.message}`, 'error');
        }
    };

    const handleUpdatePassword = async (newPassword) => {
        try {
            await firestoreService.updateUserPassword(selectedUser.id, newPassword);
            showToast('Password updated successfully!', 'success');
            setEditModalOpen(false);
        } catch (error) {
            showToast('Failed to update password.', 'error');
        }
    };

    // NEW: Handler for updating a user's role
    const handleUpdateRole = async (userId, newRole) => {
        try {
            await firestoreService.updateUserRole(userId, newRole);
            showToast("User role updated successfully!", 'success');
            setEditRoleModalOpen(false);
            fetchAndGroupUsers();
        } catch (error) {
            showToast(`Failed to update role: ${error.message}`, 'error');
            console.error("Update role error:", error);
        }
    };

    // NEW: Handler for restricting or un-restricting a user
    const handleSetRestriction = async (userId, shouldRestrict) => {
        const action = shouldRestrict ? 'restrict' : 'unrestrict';
        if (window.confirm(`Are you sure you want to ${action} this account?`)) {
            try {
                await firestoreService.setUserRestrictionStatus(userId, shouldRestrict);
                showToast(`User account ${action}ed successfully!`, 'success');
                fetchAndGroupUsers();
            } catch (error) {
                showToast(`Failed to ${action} account.`, 'error');
                console.error("Restriction error:", error);
            }
        }
    };

    const handleShowPassword = (password) => {
        if (window.confirm("WARNING: You are about to view a user's private password. Proceed?")) {
            window.alert(`The user's password is: ${password}`);
        }
    };
    
    const exportToXlsx = (usersToExport, roleName) => {
        const headerStyle = { font: { bold: true, sz: 14, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF800000" } }, alignment: { horizontal: "center", vertical: "center" } };
        const cellStyle = { alignment: { vertical: "center" } };
        const tableData = usersToExport.map(user => ({ "Name": `${user.firstName} ${user.lastName}`, "Username": user.email, "Password": user.password, "Role": user.role, "Grade Level": user.gradeLevel || 'N/A' }));
        const ws = XLSX.utils.json_to_sheet(tableData);
        ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        const headers = ['A1', 'B1', 'C1', 'D1', 'E1'];
        headers.forEach(cell => { if(ws[cell]) ws[cell].s = headerStyle; });
        for (let i = 0; i < tableData.length; i++) {
            headers.forEach((h, j) => {
                const cellRef = `${h.charAt(0)}${i + 2}`;
                if (ws[cellRef]) ws[cellRef].s = cellStyle;
            });
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "User Accounts");
        XLSX.writeFile(wb, `${roleName}-accounts-${new Date().toLocaleDateString()}.xlsx`);
    };

    // --- UI COMPONENTS ---
    const UserTable = ({ title, users, icon, isRestrictedTable = false }) => {
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
                                    <input type="checkbox" onChange={() => handleSelectAll(userIdsInTable)} checked={allInTableSelected} disabled={userIdsInTable.length === 0} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id} className={selectedUserIds.has(user.id) ? 'bg-indigo-50' : ''}>
                                    <td className="px-4 py-3"><input type="checkbox" onChange={() => handleSelectUser(user.id)} checked={selectedUserIds.has(user.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/></td>
                                    <td className="px-4 py-3 whitespace-nowrap">{user.firstName} {user.lastName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{user.email}</td>
                                    <td className="px-4 py-3 whitespace-nowrap capitalize">{user.role}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        {isRestrictedTable ? (
                                            <button onClick={() => handleSetRestriction(user.id, false)} className="text-green-600 hover:text-green-900" title="Unrestrict Account"><UserCheck size={18} /></button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleShowPassword(user.password)} className="text-gray-500 hover:text-blue-700 mr-3" title="Show Password"><Eye size={18} /></button>
                                                <button onClick={() => { setSelectedUser(user); setEditModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Change Password"><Edit size={18} /></button>
                                                <button onClick={() => { setSelectedUser(user); setEditRoleModalOpen(true); }} className="text-purple-600 hover:text-purple-900 mr-3" title="Edit Role"><Shield size={18} /></button>
                                                <button onClick={() => handleSetRestriction(user.id, true)} className="text-orange-600 hover:text-orange-900 mr-3" title="Restrict Account"><UserX size={18} /></button>
                                                <button onClick={() => handleDeleteSelected(new Set([user.id]))} className="text-red-600 hover:text-red-900" title="Delete User"><Trash2 size={18} /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && <p className="text-center text-gray-500 py-4">No users in this category.</p>}
                </div>
            </div>
        );
    };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Console: User Management</h1>
                <div className="flex items-center gap-2">
                    {selectedUserIds.size > 0 && <button onClick={handleDeleteSelected} className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"><Trash2 size={20} className="mr-2" />Delete ({selectedUserIds.size})</button>}
                    <button onClick={() => setDownloadModalOpen(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"><Download size={20} className="mr-2" />Download</button>
                    <button onClick={() => setGenerateModalOpen(true)} className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"><Users size={20} className="mr-2" />Generate</button>
                </div>
            </div>

            {/* NEW: Tabs for Active and Restricted users */}
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('active')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'active' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Active Accounts
                    </button>
                    <button onClick={() => setActiveTab('restricted')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'restricted' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Restricted Accounts ({restrictedUsers.length})
                    </button>
                </nav>
            </div>

            {activeTab === 'active' ? (
                <>
                    <UserTable title="Administrators" users={groupedUsers.admins} icon={<Shield size={24} className="text-red-600" />} />
                    <UserTable title="Teachers" users={groupedUsers.teachers} icon={<GraduationCap size={24} className="text-blue-600" />} />
                    <UserTable title="Students" users={groupedUsers.students} icon={<User size={24} className="text-green-600" />} />
                </>
            ) : (
                <UserTable title="Restricted Accounts" users={restrictedUsers} icon={<UserX size={24} className="text-orange-600" />} isRestrictedTable={true} />
            )}

            {/* Modals */}
            {isAddModalOpen && <AddUserModal onSubmit={() => { }} onClose={() => setAddModalOpen(false)} />}
            {isEditModalOpen && <EditPasswordModal user={selectedUser} onSubmit={handleUpdatePassword} onClose={() => setEditModalOpen(false)} />}
            {isGenerateModalOpen && <GenerateUsersModal onSubmit={handleGenerateUsers} onClose={() => setGenerateModalOpen(false)} />}
            {isDownloadModalOpen && <DownloadAccountsModal groupedUsers={{...groupedUsers, restricted: restrictedUsers}} onExport={exportToXlsx} onClose={() => setDownloadModalOpen(false)} />}
            {isEditRoleModalOpen && <EditRoleModal user={selectedUser} onSubmit={handleUpdateRole} onClose={() => setEditRoleModalOpen(false)} />}
        </div>
    );
};

export default AdminDashboard;
