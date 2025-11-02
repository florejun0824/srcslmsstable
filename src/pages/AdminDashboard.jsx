// src/pages/AdminDashboard.jsx

import React, { useState, useEffect, Fragment } from 'react'; // <-- ADDED Fragment
import { memo } from 'react';
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
  AlertTriangle, // <-- ADDED
  Info, // <-- ADDED
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, Transition } from '@headlessui/react'; // <-- ADDED

import Spinner from '../components/common/Spinner';
import AddUserModal from '../components/admin/AddUserModal';
import GenerateUsersModal from '../components/admin/GenerateUsersModal';
import DownloadAccountsModal from '../components/admin/DownloadAccountsModal';
import EditUserModal from '../components/admin/EditUserModal';

// --- NEW COMPONENT: AlertModal ---
// --- MODIFIED: Added 'export' ---
export const AlertModal = ({ isOpen, onClose, title, message }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black/30" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 text-left align-middle shadow-neumorphic dark:shadow-neumorphic-dark transition-all">
              <Dialog.Title
                as="h3"
                className="text-lg font-bold leading-6 text-slate-900 dark:text-slate-100 flex items-center gap-2"
              >
                <Info className="w-6 h-6 text-blue-600" />
                {title}
              </Dialog.Title>
              <div className="mt-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 break-words">{message}</p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark px-5 py-2.5 text-sm font-semibold text-blue-800 dark:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
                  onClick={onClose}
                >
                  OK
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);

// --- NEW COMPONENT: ConfirmActionModal ---
// --- MODIFIED: Added 'export' ---
export const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  variant = 'info',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantMap = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      buttonClass: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-orange-600" />,
      buttonClass: 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-500',
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      buttonClass: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
    },
  };

  const { icon, buttonClass } = variantMap[variant] || variantMap.info;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 text-left align-middle shadow-neumorphic dark:shadow-neumorphic-dark transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-bold leading-6 text-slate-900 dark:text-slate-100 flex items-center gap-2"
                >
                  {icon}
                  {title}
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3 space-y-2 space-y-reverse sm:space-y-0">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
                    onClick={onClose}
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-xl border border-transparent px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${buttonClass}`}
                    onClick={handleConfirm}
                  >
                    {confirmText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};


const CollapsibleUserTable = memo(({
  title,
  users,
  icon,
  onToggle,
  isOpen,
  isRestrictedTable = false,
  handleSetRestriction,
  handleSelectUser,
  handleSelectAll,
  selectedUserIds,
  handleShowPassword,
  setSelectedUser,
  setIsEditUserModalOpen,
  handleSingleDelete
}) => {
  
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


  const userIdsInTable = users.map((u) => u.id);
  const allInTableSelected =
    userIdsInTable.length > 0 && userIdsInTable.every((id) => selectedUserIds.has(id));

  return (
    <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark mb-6 transition-all duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 sm:p-5 cursor-pointer"
      >
        <div className="flex items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 shadow-inner dark:shadow-none">
            {React.cloneElement(icon, { className: 'text-slate-700 dark:text-slate-200', size: 20 })}
          </div>
          <div className="ml-3 sm:ml-4 text-left">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{users.length} Accounts</span>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-500 dark:text-slate-400 transform transition-transform duration-500 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>
      <div
        className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        style={{ overflow: 'hidden' }}
      >
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-slate-600 dark:text-slate-400">
                <th className="px-2 py-2 sm:px-4 text-left">
                  <input
                    type="checkbox"
                    onChange={() => handleSelectAll(userIdsInTable)}
                    checked={allInTableSelected}
                    disabled={userIdsInTable.length === 0}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
                  />
                </th>
                <th className="px-2 py-2 sm:px-4 text-left">Name</th>
                <th className="px-2 py-2 sm:px-4 text-left">Email</th>
                <th className="px-2 py-2 sm:px-4 text-left">Role</th>
                <th className="px-2 py-2 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedUserIds.has(user.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                      }`}
                  >
                    <td className="px-2 py-2 sm:px-4">
                      <input
                        type="checkbox"
                        onChange={() => handleSelectUser(user.id)}
                        checked={selectedUserIds.has(user.id)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
                      />
                    </td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{user.email}</td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowTcap text-slate-600 dark:text-slate-300 capitalize">
                      {user.role}
                    </td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap text-right space-x-3 relative">
                      {isRestrictedTable ? (
                        <button
                          onClick={() => handleSetRestriction(user.id, false, `${user.firstName} ${user.lastName}`)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="Unrestrict Account"
                        >
                          <UserCheck size={18} />
                        </button>
                      ) : (
                        <>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocalActionMenuOpenFor(user.id === localActionMenuOpenFor ? null : user.id);
                            }}
                            className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                            title="Actions"
                          >
                            <Settings size={18} />
                          </button>

                          {localActionMenuOpenFor === user.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-10 z-20 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1"
                            >
                              <button
                                onClick={() => {
                                  handleShowPassword(user.password);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
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
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
                              >
                                <Edit size={16} />
                                Edit User
                              </button>
                              <button
                                onClick={() => {
                                  handleSetRestriction(user.id, true, `${user.firstName} ${user.lastName}`);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-3"
                              >
                                <UserX size={16} />
                                Restrict Account
                              </button>
                              <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                              <button
                                onClick={() => {
                                  handleSingleDelete(
                                    user.id,
                                    `${user.firstName} ${user.lastName}`
                                  );
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
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
                  <td colSpan="5" className="text-center text-slate-500 dark:text-slate-400 py-6">
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
  
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [alertModalState, setAlertModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
  });
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    variant: 'info',
  });

  const closeAlertModal = () => setAlertModalState({ ...alertModalState, isOpen: false });
  const closeConfirmModal = () => setConfirmModalState({ ...confirmModalState, isOpen: false });
  
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

    const asyncDeleteSelected = async () => {
      try {
        await firestoreService.deleteMultipleUsers(userIdsToDelete);
        showToast(`${userIdsToDelete.length} user(s) deleted successfully!`, 'success');
        setSelectedUserIds(new Set());
        fetchAndGroupUsers();
      } catch (error) {
        showToast('Failed to delete users.', 'error');
      }
    };

    setConfirmModalState({
      isOpen: true,
      title: `Delete ${userIdsToDelete.length} Users?`,
      message: `Are you sure you want to delete these ${userIdsToDelete.length} selected user(s)? This action cannot be undone.`,
      onConfirm: asyncDeleteSelected,
      confirmText: 'Delete All',
      variant: 'danger'
    });
  };

  const handleSingleDelete = async (userId, userName) => {
    const asyncSingleDelete = async () => {
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
    };

    setConfirmModalState({
      isOpen: true,
      title: 'Delete User?',
      message: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      onConfirm: asyncSingleDelete,
      confirmText: 'Delete',
      variant: 'danger'
    });
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
    setIsUpdatingUser(true);
    try {
      await firestoreService.updateUserDetails(selectedUser.id, updates);
      showToast('User updated successfully!', 'success');
      setIsEditUserModalOpen(false);
      fetchAndGroupUsers();
    } catch (error) {
      console.error('🔥 Update user failed:', error);
      showToast(`Failed to update user: ${error.message}`, 'error');
    } finally {
      setIsUpdatingUser(false);
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

  const handleSetRestriction = async (userId, shouldRestrict, userName) => {
    const action = shouldRestrict ? 'restrict' : 'unrestrict';
    const asyncSetRestriction = async () => {
      try {
        await firestoreService.updateUserDetails(userId, { isRestricted: shouldRestrict });
        showToast(`User account ${action}ed successfully!`, 'success');
        fetchAndGroupUsers();
      } catch (error) {
        console.error(`Failed to ${action} account:`, error);
        showToast(`Failed to ${action} account.`, 'error');
      }
    };

    setConfirmModalState({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Account?`,
      message: `Are you sure you want to ${action} the account for ${userName}?`,
      onConfirm: asyncSetRestriction,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      variant: shouldRestrict ? 'warning' : 'info'
    });
  };

  const handleShowPassword = (password) => {
    setAlertModalState({
      isOpen: true,
      title: 'User Password',
      message: `WARNING: You are viewing a private password. The user's password is: ${password}`,
    });
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

  return (
    <div className="bg-transparent">
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Admin Console
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
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
                className="flex items-center font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl shadow hover:bg-slate-50 dark:hover:bg-slate-600 transition-all hover:scale-105"
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
          <nav className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('active')}
              className={`-mb-0.5 py-3 px-3 sm:px-5 font-bold text-base transition-colors rounded-t-lg ${
                activeTab === 'active'
                  ? 'border-b-4 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              Active Accounts
            </button>
            <button
              onClick={() => setActiveTab('restricted')}
              className={`-mb-0.5 flex items-center py-3 px-3 sm:px-5 font-bold text-base transition-colors rounded-t-lg ${
                activeTab === 'restricted'
                  ? 'border-b-4 border-orange-500 dark:border-orange-400 text-orange-600 dark:text-orange-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              Restricted
              <span className="ml-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                {restrictedUsers.length}
              </span>
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-96">
            <Spinner />
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-semibold">Fetching user data...</p>
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
                  handleSetRestriction={handleSetRestriction}
                  handleSelectUser={handleSelectUser}
                  handleSelectAll={handleSelectAll}
                  selectedUserIds={selectedUserIds}
                  handleShowPassword={handleShowPassword}
                  setSelectedUser={setSelectedUser}
                  setIsEditUserModalOpen={setIsEditUserModalOpen}
                  handleSingleDelete={handleSingleDelete}
                />
                <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark mb-6">
                  <button
                    onClick={() => toggleSection('studentsContainer')}
                    className="w-full flex justify-between items-center p-4 sm:p-5 cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 shadow-inner dark:shadow-none">
                        <User size={20} className="text-slate-700 dark:text-slate-200" />
                      </div>
                      <div className="ml-3 sm:ml-4 text-left">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Students</h2>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {groupedUsers.students.length} Accounts
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-slate-500 dark:text-slate-400 transform transition-transform duration-500 ${
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
                    <div className="p-4 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                      {groupedUsers.students.length > 0 ? (
                        Object.entries(studentsByGrade).map(([grade, list]) => (
                          <CollapsibleUserTable
                            key={grade}
                            title={grade}
                            users={list}
                            icon={<User />}
                            isOpen={openSections[grade]}
                            onToggle={() => toggleSection(grade)}
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
                        <p className="text-center text-slate-500 dark:text-slate-400 py-6">No student accounts found.</p>
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

      {/* --- RENDER ALL MODALS --- */}
      {isAddModalOpen && (
        <AddUserModal onSubmit={() => {}} onClose={() => setAddModalOpen(false)} />
      )}
      {isGenerateModalOpen && (
        <GenerateUsersModal onSubmit={handleGenerateUsers} onClose={() => setGenerateModalOpen(false)} />
      )}
      {isDownloadModalOpen && (
        <DownloadAccountsModal
          groupedUsers={{ ...groupedUsers, restricted: restrictedUsers }}
          onExport={exportToXlsx}
          onClose={() => setDownloadModalOpen(false)}
        />
      )}
      {isEditUserModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onSubmit={handleUpdateUser}
          onUpdatePassword={handleUpdatePassword}
          onClose={() => setIsEditUserModalOpen(false)}
          isLoading={isUpdatingUser} // <-- PASS LOADING STATE
        />
      )}
      
      <AlertModal
        isOpen={alertModalState.isOpen}
        onClose={closeAlertModal}
        title={alertModalState.title}
        message={alertModalState.message}
      />
      
      <ConfirmActionModal
        isOpen={confirmModalState.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        variant={confirmModalState.variant}
      />

    </div>
  );
};

export default AdminDashboard;