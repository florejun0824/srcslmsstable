// src/pages/AdminDashboard.jsx

import React, { useState, useEffect, Fragment } from 'react';
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
  AlertTriangle,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, Transition } from '@headlessui/react';

import AddUserModal from '../components/admin/AddUserModal';
import GenerateUsersModal from '../components/admin/GenerateUsersModal';
import DownloadAccountsModal from '../components/admin/DownloadAccountsModal';
import EditUserModal from '../components/admin/EditUserModal';

// --- DESIGN TOKENS & UTILS ---
// Apple-style glass panel class
const glassPanel = "bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl shadow-black/5";
// Apple-style input/item hover
const listItemHover = "hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-200";

// --- SKELETON COMPONENT ---
const TableSkeleton = () => (
  <div className={`${glassPanel} rounded-2xl mb-5 overflow-hidden animate-pulse`}>
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Icon Placeholder */}
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10"></div>
        <div className="space-y-2">
          {/* Title Placeholder */}
          <div className="h-5 w-32 bg-gray-200 dark:bg-white/10 rounded-md"></div>
          {/* Subtitle Placeholder */}
          <div className="h-3 w-20 bg-gray-200 dark:bg-white/5 rounded-md"></div>
        </div>
      </div>
      {/* Chevron Placeholder */}
      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/5"></div>
    </div>
  </div>
);

// --- ALERT MODAL ---
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
        {/* Standard Apple dimming */}
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 blur-sm"
            enterTo="opacity-100 scale-100 blur-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 blur-0"
            leaveTo="opacity-0 scale-95 blur-sm"
          >
            {/* MacOS Dialog Style */}
            <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl p-6 text-left align-middle shadow-2xl ring-1 ring-black/5 transition-all">
              <Dialog.Title
                as="h3"
                className="text-lg font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-3"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-full">
                    <Info className="w-5 h-5 text-blue-500" />
                </div>
                {title}
              </Dialog.Title>
              <div className="mt-4">
                <p className="text-[15px] text-gray-500 dark:text-gray-300 break-words leading-relaxed">{message}</p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-lg bg-[#007AFF] px-5 py-2 text-[15px] font-medium text-white hover:bg-[#0062CC] focus:outline-none active:scale-95 transition-transform"
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

// --- CONFIRM MODAL ---
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
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      iconBg: 'bg-red-100 dark:bg-red-500/20',
      buttonClass: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
      iconBg: 'bg-orange-100 dark:bg-orange-500/20',
      buttonClass: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm',
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-500" />,
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      buttonClass: 'bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-sm',
    },
  };

  const { icon, iconBg, buttonClass } = variantMap[variant] || variantMap.info;

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
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 blur-sm"
              enterTo="opacity-100 scale-100 blur-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 blur-0"
              leaveTo="opacity-0 scale-95 blur-sm"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl p-6 text-left align-middle shadow-2xl ring-1 ring-black/5 transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-3"
                >
                  <div className={`p-2 rounded-full ${iconBg}`}>
                    {icon}
                  </div>
                  {title}
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-[15px] text-gray-500 dark:text-gray-300 leading-relaxed">{message}</p>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3 gap-2">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg px-4 py-2 text-[15px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                    onClick={onClose}
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-lg px-4 py-2 text-[15px] font-medium focus:outline-none active:scale-95 transition-all ${buttonClass}`}
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
    <div className={`${glassPanel} rounded-2xl mb-5 overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 transition-colors duration-200 group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            {React.cloneElement(icon, { className: 'text-gray-600 dark:text-gray-300', size: 20 })}
          </div>
          <div className="text-left">
            <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight group-hover:text-[#007AFF] transition-colors">{title}</h2>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{users.length} Accounts</span>
          </div>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 transition-all duration-300 ${isOpen ? 'bg-[#007AFF] text-white rotate-180' : 'text-gray-400'}`}>
            <ChevronDown size={16} strokeWidth={3} />
        </div>
      </button>
      <div
        className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        {/* Divider */}
        <div className="h-px w-full bg-gray-200/50 dark:bg-gray-700/50" />
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-black/20 text-xs uppercase font-semibold text-gray-400">
              <tr>
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    onChange={() => handleSelectAll(userIdsInTable)}
                    checked={allInTableSelected}
                    disabled={userIdsInTable.length === 0}
                    className="h-4 w-4 rounded-[4px] border-gray-300 dark:border-gray-600 text-[#007AFF] focus:ring-[#007AFF] dark:bg-gray-700 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 tracking-wider">Name</th>
                <th className="px-4 py-3 tracking-wider">Email</th>
                <th className="px-4 py-3 tracking-wider">Role</th>
                <th className="px-6 py-3 text-right tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`group transition-colors ${selectedUserIds.has(user.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-white/5'
                      }`}
                  >
                    <td className="px-6 py-3.5">
                      <input
                        type="checkbox"
                        onChange={() => handleSelectUser(user.id)}
                        checked={selectedUserIds.has(user.id)}
                        className="h-4 w-4 rounded-[4px] border-gray-300 dark:border-gray-600 text-[#007AFF] focus:ring-[#007AFF] dark:bg-gray-700 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400 font-light">{user.email}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right relative">
                      {isRestrictedTable ? (
                        <button
                          onClick={() => handleSetRestriction(user.id, false, `${user.firstName} ${user.lastName}`)}
                          className="p-2 rounded-full text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                          title="Unrestrict Account"
                        >
                          <UserCheck size={16} />
                        </button>
                      ) : (
                        <>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocalActionMenuOpenFor(user.id === localActionMenuOpenFor ? null : user.id);
                            }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                            title="Actions"
                          >
                            <Settings size={18} strokeWidth={2} />
                          </button>

                          {/* Action Menu - Popover Style */}
                          {localActionMenuOpenFor === user.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-8 top-8 z-30 w-48 bg-white/95 dark:bg-[#2c2c2e]/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 py-1.5 origin-top-right animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                onClick={() => {
                                  handleShowPassword(user.password);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-gray-700 dark:text-gray-200 hover:bg-[#007AFF] hover:text-white flex items-center gap-3 transition-colors mx-1 rounded-lg w-[calc(100%-8px)]"
                              >
                                <Eye size={14} />
                                Show Password
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditUserModalOpen(true);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-gray-700 dark:text-gray-200 hover:bg-[#007AFF] hover:text-white flex items-center gap-3 transition-colors mx-1 rounded-lg w-[calc(100%-8px)]"
                              >
                                <Edit size={14} />
                                Edit User
                              </button>
                              <button
                                onClick={() => {
                                  handleSetRestriction(user.id, true, `${user.firstName} ${user.lastName}`);
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white flex items-center gap-3 transition-colors mx-1 rounded-lg w-[calc(100%-8px)]"
                              >
                                <UserX size={14} />
                                Restrict Account
                              </button>
                              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2"></div>
                              <button
                                onClick={() => {
                                  handleSingleDelete(
                                    user.id,
                                    `${user.firstName} ${user.lastName}`
                                  );
                                  setLocalActionMenuOpenFor(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-3 transition-colors mx-1 rounded-lg w-[calc(100%-8px)]"
                              >
                                <Trash2 size={14} />
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
                  <td colSpan="5" className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
                    No users found.
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
    <div className="min-h-screen bg-transparent font-sans">
      {/* Subtle gradient backdrop if needed, otherwise transparent */}
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        
        <header className="mb-8 sm:mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-[32px] sm:text-[40px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                Admin Console
              </h1>
              <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">
                Manage your organization's users and settings.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {selectedUserIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex-1 md:flex-none flex items-center justify-center font-medium bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-95"
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete ({selectedUserIds.size})
                </button>
              )}
              <button
                onClick={() => setDownloadModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center font-medium bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                <Download size={18} className="mr-2" />
                Export
              </button>
              <button
                onClick={() => setGenerateModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center font-medium bg-[#007AFF] hover:bg-[#0062CC] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                <Users size={18} className="mr-2" />
                New User
              </button>
            </div>
          </div>
        </header>

        {/* iOS Segmented Control Style Tabs */}
        <div className="mb-8">
          <div className="inline-flex p-1.5 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl border border-black/5 dark:border-white/5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[14px] font-semibold transition-all duration-200 ease-out ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Active Accounts
            </button>
            <button
              onClick={() => setActiveTab('restricted')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[14px] font-semibold transition-all duration-200 ease-out flex items-center justify-center gap-2 ${
                activeTab === 'restricted'
                  ? 'bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Restricted
              {restrictedUsers.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'restricted' ? 'bg-gray-100 dark:bg-black/20 text-gray-600 dark:text-gray-300' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {restrictedUsers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {loading ? (
           <div className="space-y-4 animate-in fade-in duration-500">
             {/* Render skeletal table items */}
             <TableSkeleton />
             <TableSkeleton />
             <TableSkeleton />
           </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <div className={`${glassPanel} rounded-2xl mb-6 overflow-hidden transition-all duration-300`}>
                  <button
                    onClick={() => toggleSection('studentsContainer')}
                    className="w-full flex justify-between items-center p-4 cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 transition-colors duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                        <User size={20} className="text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight group-hover:text-[#007AFF] transition-colors">Students</h2>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {groupedUsers.students.length} Accounts
                        </span>
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 transition-all duration-300 ${openSections.studentsContainer ? 'bg-[#007AFF] text-white rotate-180' : 'text-gray-400'}`}>
                        <ChevronDown size={16} strokeWidth={3} />
                    </div>
                  </button>
                  <div
                    className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      openSections.studentsContainer
                        ? 'max-h-[3000px] opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-4 space-y-4 bg-gray-50/30 dark:bg-black/20 border-t border-gray-200/50 dark:border-white/5">
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
                        <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">No student accounts found.</p>
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
          isLoading={isUpdatingUser}
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