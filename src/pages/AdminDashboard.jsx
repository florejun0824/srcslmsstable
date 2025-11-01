// src/pages/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
// --- ADD React.memo ---
import { memo } from 'react'; // <-- ADDED THIS LINE
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Trash2,
  Edit,
  Shield,
  GraduationCap,
  User,
  Eye,
  Users,
  Download,
  UserX,
  UserCheck,
  ChevronDown,
  Settings,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import Spinner from '../components/common/Spinner';
import AddUserModal from '../components/admin/AddUserModal';
import GenerateUsersModal from '../components/admin/GenerateUsersModal';
import DownloadAccountsModal from '../components/admin/DownloadAccountsModal';
import EditUserModal from '../components/admin/EditUserModal';

// --- H E R E   I S   T H E   C H A N G E ---
// 1. We define the table component *outside* AdminDashboard so we can wrap it.
// 2. We wrap the entire component in React.memo.
const CollapsibleUserTable = memo(({
  title,
  users,
  icon,
  onToggle,
  isOpen,
  isRestrictedTable = false,
  // We now must pass in the functions and state it needs from the parent
  handleSetRestriction,
  handleSelectUser,
  handleSelectAll,
  selectedUserIds,
  actionMenuOpenFor,
  setActionMenuOpenFor,
  handleShowPassword,
  setSelectedUser,
  setIsEditUserModalOpen,
  handleSingleDelete
}) => {
  
  // --- This is the fix for the scroll jump ---
  // We move the click handler logic *inside* this component.
  // Because the component is memoized, its children (the table)
  // won't re-render when the dropdown opens/closes, preserving the scroll.
  const [localActionMenuOpenFor, setLocalActionMenuOpenFor] = useState(null);

  useEffect(() => {
    if (!localActionMenuOpenFor) return;

    const handleClickOutside = () => {
      setLocalActionMenuOpenFor(null);
    };
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [localActionMenuOpenFor]);
  // --- End of new dropdown logic ---


  const userIdsInTable = users.map((u) => u.id);
  const allInTableSelected =
    userIdsInTable.length > 0 && userIdsInTable.every((id) => selectedUserIds.has(id));

  return (
    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic mb-6 transition-all duration-300 hover:shadow-neumorphic-inset">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 sm:p-5 cursor-pointer"
      >
        <div className="flex items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-slate-200 shadow-inner">
            {React.cloneElement(icon, { className: 'text-slate-700', size: 20 })}
          </div>
          <div className="ml-3 sm:ml-4 text-left">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <span className="text-xs font-medium text-slate-500">{users.length} Accounts</span>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-500 transform transition-transform duration-500 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>
      <div
        className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        style={{ overflow: 'hidden' }}
      >
        <div className="overflow-x-auto p-4"> {/* <-- This is the container that was scroll-jumping */}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-slate-600">
                <th className="px-2 py-2 sm:px-4 text-left">
                  <input
                    type="checkbox"
                    onChange={() => handleSelectAll(userIdsInTable)}
                    checked={allInTableSelected}
                    disabled={userIdsInTable.length === 0}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-2 py-2 sm:px-4 text-left">Name</th>
                <th className="px-2 py-2 sm:px-4 text-left">Email</th>
                <th className="px-2 py-2 sm:px-4 text-left">Role</th>
                <th className="px-2 py-2 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50 ${selectedUserIds.has(user.id) ? 'bg-indigo-50' : ''
                      }`}
                  >
                    <td className="px-2 py-2 sm:px-4">
                      <input
                        type="checkbox"
                        onChange={() => handleSelectUser(user.id)}
                        checked={selectedUserIds.has(user.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap font-medium text-slate-800">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap text-slate-600">{user.email}</td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowTcap text-slate-600 capitalize">
                      {user.role}
                    </td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap text-right space-x-3 relative">
                      {isRestrictedTable ? (
                        <button
                          onClick={() => handleSetRestriction(user.id, false)}
                          className="text-green-600 hover:text-green-800"
                          title="Unrestrict Account"
                        >
                          <UserCheck size={18} />
                        </button>
                      ) : (
                        <>
                          <button
                            onMouseDown={(e) => e.preventDefault()} // <-- This still helps
                            onClick={(e) => {
                              e.stopPropagation();
                              // --- Use local state ---
                              setLocalActionMenuOpenFor(user.id === localActionMenuOpenFor ? null : user.id);
                            }}
                            className="text-slate-500 hover:text-indigo-600 p-1 rounded-full hover:bg-slate-200"
                            title="Actions"
                          >
                            <Settings size={18} />
                          </button>

                          {/* Action Menu Dropdown */}
                          {localActionMenuOpenFor === user.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-10 z-20 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1"
                            >
                              <button
                                onClick={() => {
                                  handleShowPassword(user.password);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                              >
                                <Eye size={16} />
                                Show Password
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditUserModalOpen(true);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                              >
                                <Edit size={16} />
                                Edit User
                              </button>
                              <button
                                onClick={() => {
                                  handleSetRestriction(user.id, true);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3"
                              >
                                <UserX size={16} />
                                Restrict Account
                              </button>
                              <div className="border-t border-slate-100 my-1"></div>
                              <button
                                onClick={() => {
                                  handleSingleDelete(
                                    user.id,
                                    `${user.firstName} ${user.lastName}`
                                  );
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                              >
                                <Trash2 size={16} />
                                Delete User
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-slate-500 py-6">
                    No users in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
// --- E N D   O F   C H A N G E ---


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
    Unassigned: false,
    restricted: true,
  });

  // Modal states
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
  const [isDownloadModalOpen, setDownloadModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // --- REMOVED actionMenuOpenFor STATE ---
  // This state is now managed inside the memoized CollapsibleUserTable component

  const fetchAndGroupUsers = async () => {
    setLoading(true);
    try {
      const users = await firestoreService.getAllUsers();
      setAllUsers(users);

      const active = [];
      const restricted = [];
      users.forEach((user) => (user.isRestricted ? restricted.push(user) : active.push(user)));

      const groups = { admins: [], teachers: [], students: [] };
      active.forEach((user) => {
        if (user.role === 'admin') groups.admins.push(user);
        else if (user.role === 'teacher') groups.teachers.push(user);
        else groups.students.push(user);
      });

      const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
      const gradeGroups = {};
      gradeLevels.forEach((level) => {
        gradeGroups[level] = [];
      });
      gradeGroups['Unassigned'] = [];

      groups.students.forEach((student) => {
        if (student.gradeLevel && gradeGroups[student.gradeLevel]) {
          gradeGroups[student.gradeLevel].push(student);
        } else {
          gradeGroups['Unassigned'].push(student);
        }
      });
      setStudentsByGrade(gradeGroups);

      Object.keys(groups).forEach((key) => {
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

  // --- REMOVED useEffect for actionMenuOpenFor ---
  // This logic is now managed inside the memoized CollapsibleUserTable component

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectUser = (userId) => {
    setSelectedUserIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(userId)) newSelected.delete(userId);
      else newSelected.add(userId);
      return newSelected;
    });
  };

  const handleSelectAll = (userIds) => {
    const allSelected = userIds.every((id) => selectedUserIds.has(id));
    setSelectedUserIds((prev) => {
      const newSelected = new Set(prev);
      if (allSelected) userIds.forEach((id) => newSelected.delete(id));
      else userIds.forEach((id) => newSelected.add(id));
      return newSelected;
    });
  };

  const handleDeleteSelected = async () => {
    const userIdsToDelete = Array.from(selectedUserIds);
    if (userIdsToDelete.length === 0) return showToast('No users selected.', 'warning');
    if (
      window.confirm(
        `Are you sure you want to delete ${userIdsToDelete.length} selected user(s)? This action cannot be undone.`
      )
    ) {
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

  const handleSingleDelete = async (userId, userName) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${userName}? This action cannot be undone.`
      )
    ) {
      try {
        await firestoreService.deleteMultipleUsers([userId]);
        showToast(`User ${userName} deleted successfully!`, 'success');
        setSelectedUserIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        fetchAndGroupUsers();
      } catch (error) {
        showToast('Failed to delete user.', 'error');
      }
    }
  };

  const handleGenerateUsers = async (data) => {
    let usersToCreate = [];
    const { names, quantity, role, gradeLevel } = data;

    const generatePassword = () => {
      return Math.random().toString(36).slice(-8);
    };

    try {
      if (names) {
        usersToCreate = names
          .split('\n')
          .map((name) => name.trim())
          .filter((name) => name)
          .map((fullName) => {
            const nameParts = fullName.split(/\s+/);
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.slice(1).join(' ') || 'Name';
            const email = `${firstName.toLowerCase()}.${lastName
              .toLowerCase()
              .replace(/\s+/g, '')}@srcs.edu`;
            const newUser = {
              firstName,
              lastName,
              email,
              password: generatePassword(),
              role,
              createdAt: new Date(),
            };
            if (role === 'student' && gradeLevel) {
              newUser.gradeLevel = gradeLevel;
            }
            return newUser;
          });
      } else if (quantity) {
        for (let i = 1; i <= quantity; i++) {
          const num = i.toString().padStart(2, '0');
          let firstName = 'User';
          if (role === 'student') firstName = 'Student';
          if (role === 'teacher') firstName = 'Teacher';
          if (role === 'admin') firstName = 'Admin';
          const lastName = num;
          const email = `${firstName.toLowerCase()}.${lastName}@srcs.edu`;
          const newUser = {
            firstName,
            lastName,
            email,
            password: generatePassword(),
            role,
            createdAt: new Date(),
          };
          if (role === 'student' && gradeLevel) {
            newUser.gradeLevel = gradeLevel;
          }
          usersToCreate.push(newUser);
        }
      }

      if (usersToCreate.length === 0) {
        showToast('No valid users to create.', 'warning');
        return;
      }

      await firestoreService.addMultipleUsers(usersToCreate);

      showToast(`${usersToCreate.length} user(s) generated successfully!`, 'success');
      setGenerateModalOpen(false);
      fetchAndGroupUsers();
    } catch (error) {
      console.error('🔥 Failed to generate users:', error);
      showToast(`Failed to generate users: ${error.message}`, 'error');
    }
  };

  const handleUpdateUser = async (updates) => {
    try {
      await firestoreService.updateUserDetails(selectedUser.id, updates);
      showToast('User updated successfully!', 'success');
      setIsEditUserModalOpen(false);
      fetchAndGroupUsers();
    } catch (error) {
      console.error('🔥 Update user failed:', error);
      showToast(`Failed to update user: ${error.message}`, 'error');
    }
  };

  const handleUpdatePassword = async (userId, newPassword) => {
    try {
      await firestoreService.updateUserPassword(userId, newPassword);
      showToast('Password updated successfully!', 'success');
      fetchAndGroupUsers();
    } catch (error) {
      showToast('Failed to update password.', 'error');
    }
  };

  const handleSetRestriction = async (userId, shouldRestrict) => {
    const action = shouldRestrict ? 'restrict' : 'unrestrict';
    if (window.confirm(`Are you sure you want to ${action} this account?`)) {
      try {
        await firestoreService.updateUserDetails(userId, { isRestricted: shouldRestrict });
        showToast(`User account ${action}ed successfully!`, 'success');
        fetchAndGroupUsers();
      } catch (error) {
        console.error(`Failed to ${action} account:`, error);
        showToast(`Failed to ${action} account.`, 'error');
      }
    }
  };

  const handleShowPassword = (password) => {
    if (window.confirm("WARNING: You are about to view a user's private password. Proceed?")) {
      window.alert(`The user's password is: ${password}`);
    }
  };

  const exportToXlsx = (users, roleName) => {
    const tableData = users.map((user) => ({
      Name: `${user.firstName} ${user.lastName}`,
      Username: user.email,
      Password: user.password,
      Role: user.role,
      'Grade Level': user.gradeLevel || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'User Accounts');
    XLSX.writeFile(wb, `${roleName}-accounts-${new Date().toLocaleDateString()}.xlsx`);
  };

  // --- The CollapsibleUserTable component definition was here, but is now moved to the top ---

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Admin Console
              </h1>
              <p className="mt-2 text-slate-600">
                Central hub for user management and system settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 shrink-0">
              {selectedUserIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center font-semibold bg-red-100 text-red-700 px-4 py-2 rounded-xl shadow hover:bg-red-200 transition-all hover:scale-105"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete ({selectedUserIds.size})
                </button>
              )}
              <button
                onClick={() => setDownloadModalOpen(true)}
                className="flex items-center font-semibold bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl shadow hover:bg-slate-50 transition-all hover:scale-105"
              >
                <Download size={16} className="mr-2" />
                Download
              </button>
              <button
                onClick={() => setGenerateModalOpen(true)}
                className="flex items-center font-semibold bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-4 py-2 rounded-xl shadow hover:shadow-lg transition-all hover:scale-105"
              >
                <Users size={16} className="mr-2" />
                Generate Users
              </button>
            </div>
          </div>
        </header>

        <div className="mb-6">
          <nav className="flex space-x-2 border-b border-slate-200 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('active')}
              className={`-mb-0.5 py-3 px-3 sm:px-5 font-bold text-base transition-colors rounded-t-lg ${
                activeTab === 'active'
                  ? 'border-b-4 border-indigo-500 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active Accounts
            </button>
            <button
              onClick={() => setActiveTab('restricted')}
              className={`-mb-0.5 flex items-center py-3 px-3 sm:px-5 font-bold text-base transition-colors rounded-t-lg ${
                activeTab === 'restricted'
                  ? 'border-b-4 border-orange-500 text-orange-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Restricted
              <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {restrictedUsers.length}
              </span>
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
                <CollapsibleUserTable
                  title="Administrators"
                  users={groupedUsers.admins}
                  icon={<Shield />}
                  isOpen={openSections.admins}
                  onToggle={() => toggleSection('admins')}
                  // --- Pass down all props and handlers ---
                  handleSetRestriction={handleSetRestriction}
                  handleSelectUser={handleSelectUser}
                  handleSelectAll={handleSelectAll}
                  selectedUserIds={selectedUserIds}
                  handleShowPassword={handleShowPassword}
                  setSelectedUser={setSelectedUser}
                  setIsEditUserModalOpen={setIsEditUserModalOpen}
                  handleSingleDelete={handleSingleDelete}
                />
                <CollapsibleUserTable
                  title="Teachers"
                  users={groupedUsers.teachers}
                  icon={<GraduationCap />}
                  isOpen={openSections.teachers}
                  onToggle={() => toggleSection('teachers')}
                  // --- Pass down all props and handlers ---
                  handleSetRestriction={handleSetRestriction}
                  handleSelectUser={handleSelectUser}
                  handleSelectAll={handleSelectAll}
                  selectedUserIds={selectedUserIds}
                  handleShowPassword={handleShowPassword}
                  setSelectedUser={setSelectedUser}
                  setIsEditUserModalOpen={setIsEditUserModalOpen}
                  handleSingleDelete={handleSingleDelete}
                />
                <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic mb-6">
                  <button
                    onClick={() => toggleSection('studentsContainer')}
                    className="w-full flex justify-between items-center p-4 sm:p-5 cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-slate-200 shadow-inner">
                        <User size={20} className="text-slate-700" />
                      </div>
                      <div className="ml-3 sm:ml-4 text-left">
                        <h2 className="text-lg font-bold text-slate-800">Students</h2>
                        <span className="text-xs font-medium text-slate-500">
                          {groupedUsers.students.length} Accounts
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-slate-500 transform transition-transform duration-500 ${
                        openSections.studentsContainer ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`transition-all duration-500 ease-in-out ${
                      openSections.studentsContainer
                        ? 'max-h-[3000px] opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="p-4 space-y-2 bg-slate-50">
                      {groupedUsers.students.length > 0 ? (
                        Object.entries(studentsByGrade).map(([grade, list]) => (
                          <CollapsibleUserTable
                            key={grade}
                            title={grade}
                            users={list}
                            icon={<User />}
                            isOpen={openSections[grade]}
                            onToggle={() => toggleSection(grade)}
                            // --- Pass down all props and handlers ---
                            handleSetRestriction={handleSetRestriction}
                            handleSelectUser={handleSelectUser}
                            handleSelectAll={handleSelectAll}
                            selectedUserIds={selectedUserIds}
                            handleShowPassword={handleShowPassword}
                            setSelectedUser={setSelectedUser}
                            setIsEditUserModalOpen={setIsEditUserModalOpen}
                            handleSingleDelete={handleSingleDelete}
                          />
                        ))
                      ) : (
                        <p className="text-center text-slate-500 py-6">No student accounts found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <CollapsibleUserTable
                title="Restricted Accounts"
                users={restrictedUsers}
                icon={<UserX />}
                isOpen={openSections.restricted}
                onToggle={() => toggleSection('restricted')}
                isRestrictedTable
                // --- Pass down all props and handlers ---
                handleSetRestriction={handleSetRestriction}
                handleSelectUser={handleSelectUser}
                handleSelectAll={handleSelectAll}
                selectedUserIds={selectedUserIds}
                handleShowPassword={handleShowPassword}
                setSelectedUser={setSelectedUser}
                setIsEditUserModalOpen={setIsEditUserModalOpen}
                handleSingleDelete={handleSingleDelete}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddUserModal onSubmit={() => {}} onClose={() => setAddModalOpen(false)} />
      )}
      {isGenerateModalOpen && (
        <GenerateUsersModal onSubmit={handleGenerateUsers} onClose={() => setGenerateModalOpen(false)} />
      )}
      {isDownloadModalOpen && (
        <DownloadAccountsModal
          groupedUsers={{ ...groupedUsers, restricted: restrictedUsers }}
          onExport={exportToXlsx} // <-- Fixed typo here, was exportToXsX
          onClose={() => setDownloadModalOpen(false)}
        />
      )}
      {isEditUserModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onSubmit={handleUpdateUser}
          onUpdatePassword={handleUpdatePassword}
          onClose={() => setIsEditUserModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;