// src/components/admin/AdminDashboard.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserPlus, Trash2, Edit, Shield, GraduationCap, User, Eye, Users, Download, UserX, UserCheck, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx'; // <-- CORRECTED LINE

import Spinner from '../components/common/Spinner';
import AddUserModal from '../components/admin/AddUserModal';
import EditPasswordModal from '../components/admin/EditPasswordModal';
import GenerateUsersModal from '../components/admin/GenerateUsersModal';
import DownloadAccountsModal from '../components/admin/DownloadAccountsModal';
import EditRoleModal from '../components/admin/EditRoleModal';

const AdminDashboard = () => {
    const { firestoreService } = useAuth();
    const { showToast } = useToast();
    const [allUsers, setAllUsers] = useState([]);
    const [groupedUsers, setGroupedUsers] = useState({ admins: [], teachers: [], students: [] });
    const [restrictedUsers, setRestrictedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [activeTab, setActiveTab] = useState('active');
    const [studentsByGrade, setStudentsByGrade] = useState({});

    const [openSections, setOpenSections] = useState({
        admins: true,
        teachers: false,
        studentsContainer: true,
        'Grade 7': false,
        'Grade 8': false,
        'Grade 9': false,
        'Grade 10': false,
        'Grade 11': false,
        'Grade 12': false,
        'Unassigned': false,
        restricted: true,
    });

    // Modal states
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDownloadModalOpen, setDownloadModalOpen] = useState(false);
    const [isEditRoleModalOpen, setEditRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchAndGroupUsers = async () => {
        setLoading(true);
        try {
            const users = await firestoreService.getAllUsers();
            setAllUsers(users);

            const active = [];
            const restricted = [];
            users.forEach(user => { user.isRestricted ? restricted.push(user) : active.push(user); });

            const groups = { admins: [], teachers: [], students: [] };
            active.forEach(user => {
                if (user.role === 'admin') groups.admins.push(user);
                else if (user.role === 'teacher') groups.teachers.push(user);
                else groups.students.push(user);
            });
            
            const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
            const gradeGroups = {};
            gradeLevels.forEach(level => { gradeGroups[level] = []; });
            gradeGroups['Unassigned'] = [];

            groups.students.forEach(student => {
                if (student.gradeLevel && gradeGroups[student.gradeLevel]) {
                    gradeGroups[student.gradeLevel].push(student);
                } else {
                    gradeGroups['Unassigned'].push(student);
                }
            });
            setStudentsByGrade(gradeGroups);

            Object.keys(groups).forEach(key => {
                groups[key].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
            });

            setGroupedUsers(groups);
            setRestrictedUsers(restricted.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')));

        } catch (error) {
            showToast('Failed to fetch users.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndGroupUsers();
    }, []);

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

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

    const CollapsibleUserTable = ({ title, users, icon, onToggle, isOpen, isRestrictedTable = false, accentColor = "gray" }) => {
        const userIdsInTable = users.map(u => u.id);
        const allInTableSelected = userIdsInTable.length > 0 && userIdsInTable.every(id => selectedUserIds.has(id));
        const colorVariants = {
            red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-500' },
            blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
            green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' },
            orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500' },
            gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-500' },
        };
        const colors = colorVariants[accentColor] || colorVariants.gray;

        return (
            <div className={`bg-white rounded-xl shadow-lg mb-5 transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1`}>
                <button onClick={onToggle} className="w-full flex justify-between items-center p-5 cursor-pointer">
                    <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.bg}`}>
                            {React.cloneElement(icon, { className: colors.text, size: 24 })}
                        </div>
                        <div className="ml-4 text-left">
                           <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                           <span className={`text-sm font-medium ${colors.text}`}>{users.length} Accounts</span>
                        </div>
                    </div>
                    <ChevronDown size={28} className={`text-gray-400 transform transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`transition-all duration-500 ease-in-out border-t border-gray-100 ${isOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ overflow: 'hidden' }}>
                    <div className="overflow-x-auto p-2">
                        <table className="min-w-full">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left"><input type="checkbox" onChange={() => handleSelectAll(userIdsInTable)} checked={allInTableSelected} disabled={userIdsInTable.length === 0} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/></th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.length > 0 ? users.map(user => (
                                    <tr key={user.id} className={`hover:bg-gray-50 ${selectedUserIds.has(user.id) ? 'bg-indigo-50' : ''}`}>
                                        <td className="px-6 py-4"><input type="checkbox" onChange={() => handleSelectUser(user.id)} checked={selectedUserIds.has(user.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                            {isRestrictedTable ? (
                                                <button onClick={() => handleSetRestriction(user.id, false)} className="text-green-600 hover:text-green-800 transition-colors" title="Unrestrict Account"><UserCheck size={20} /></button>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleShowPassword(user.password)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Show Password"><Eye size={20} /></button>
                                                    <button onClick={() => { setSelectedUser(user); setEditModalOpen(true); }} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Change Password"><Edit size={20} /></button>
                                                    <button onClick={() => { setSelectedUser(user); setEditRoleModalOpen(true); }} className="text-gray-400 hover:text-purple-600 transition-colors" title="Edit Role"><Shield size={20} /></button>
                                                    <button onClick={() => handleSetRestriction(user.id, true)} className="text-gray-400 hover:text-orange-600 transition-colors" title="Restrict Account"><UserX size={20} /></button>
                                                    <button onClick={() => handleDeleteSelected(new Set([user.id]))} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete User"><Trash2 size={20} /></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="text-center text-gray-500 py-10">No users in this category.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-100 min-h-screen">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <header className="mb-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Admin Console</h1>
                            <p className="mt-2 text-lg text-slate-600">Central hub for user management and system settings.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {selectedUserIds.size > 0 && <button onClick={handleDeleteSelected} className="flex items-center justify-center font-semibold bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow-sm hover:bg-red-200 transition-all transform hover:scale-105"><Trash2 size={16} className="mr-2" />Delete ({selectedUserIds.size})</button>}
                            <button onClick={() => setDownloadModalOpen(true)} className="flex items-center justify-center font-semibold bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-all transform hover:scale-105"><Download size={16} className="mr-2" />Download</button>
                            <button onClick={() => setGenerateModalOpen(true)} className="flex items-center justify-center font-semibold bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"><Users size={16} className="mr-2" />Generate Users</button>
                        </div>
                    </div>
                </header>

                <div className="mb-8">
                    <nav className="flex space-x-2 border-b-2 border-slate-200" aria-label="Tabs">
                        <button onClick={() => setActiveTab('active')} className={`-mb-0.5 whitespace-nowrap py-3 px-5 font-bold text-base transition-colors rounded-t-lg ${activeTab === 'active' ? 'border-b-4 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
                            Active Accounts
                        </button>
                        <button onClick={() => setActiveTab('restricted')} className={`-mb-0.5 flex items-center whitespace-nowrap py-3 px-5 font-bold text-base transition-colors rounded-t-lg ${activeTab === 'restricted' ? 'border-b-4 border-orange-500 text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>
                            Restricted
                            <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full">{restrictedUsers.length}</span>
                        </button>
                    </nav>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center h-96">
                        <Spinner />
                        <p className="mt-4 text-slate-500 font-semibold">Fetching user data...</p>
                    </div>
                ) : (
                    <div>
                        {activeTab === 'active' ? (
                            <>
                                <CollapsibleUserTable title="Administrators" users={groupedUsers.admins} icon={<Shield />} isOpen={openSections.admins} onToggle={() => toggleSection('admins')} accentColor="red" />
                                <CollapsibleUserTable title="Teachers" users={groupedUsers.teachers} icon={<GraduationCap />} isOpen={openSections.teachers} onToggle={() => toggleSection('teachers')} accentColor="blue" />
                                
                                <div className="bg-white rounded-xl shadow-lg mb-5 transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
                                    <button onClick={() => toggleSection('studentsContainer')} className="w-full flex justify-between items-center p-5 cursor-pointer">
                                        <div className="flex items-center">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                                                <User size={24} className="text-green-600" />
                                            </div>
                                            <div className="ml-4 text-left">
                                                <h2 className="text-xl font-bold text-gray-800">Students</h2>
                                                <span className="text-sm font-medium text-green-600">{groupedUsers.students.length} Total Accounts</span>
                                            </div>
                                        </div>
                                        <ChevronDown size={28} className={`text-gray-400 transform transition-transform duration-500 ${openSections.studentsContainer ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className={`transition-all duration-500 ease-in-out border-t border-gray-100 ${openSections.studentsContainer ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ overflow: 'hidden' }}>
                                        <div className="p-4 space-y-2 bg-slate-50">
                                            {groupedUsers.students.length > 0 ? Object.entries(studentsByGrade).map(([grade, studentList]) => (
                                                <CollapsibleUserTable
                                                    key={grade}
                                                    title={grade}
                                                    users={studentList}
                                                    icon={<User/>}
                                                    isOpen={openSections[grade]}
                                                    onToggle={() => toggleSection(grade)}
                                                    accentColor="green"
                                                />
                                            )) : <p className="text-center text-gray-500 py-6">No student accounts found.</p>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <CollapsibleUserTable title="Restricted Accounts" users={restrictedUsers} icon={<UserX />} isOpen={openSections.restricted} onToggle={() => toggleSection('restricted')} isRestrictedTable={true} accentColor="orange" />
                        )}
                    </div>
                )}
            </div>

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