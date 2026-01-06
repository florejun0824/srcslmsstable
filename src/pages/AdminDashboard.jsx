// src/pages/AdminDashboard.jsx

import React, { useState, useEffect, Fragment, memo, useCallback } from 'react';
import { useAuth, DEFAULT_SCHOOL_ID } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
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
  Check, 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, Transition } from '@headlessui/react';

import AddUserModal from '../components/admin/AddUserModal';
import GenerateUsersModal from '../components/admin/GenerateUsersModal';
import DownloadAccountsModal from '../components/admin/DownloadAccountsModal';
import EditUserModal from '../components/admin/EditUserModal';

// --- MONET STYLE GENERATOR ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;

    switch (activeOverlay) {
        case 'christmas':
            return {
                iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
                btnPrimary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
                btnTonal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-200",
                tabActive: "bg-emerald-600 text-white",
                textAccent: "text-emerald-700 dark:text-emerald-400"
            };
        case 'valentines':
            return {
                iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
                btnPrimary: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
                btnTonal: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 hover:bg-rose-200",
                tabActive: "bg-rose-600 text-white",
                textAccent: "text-rose-700 dark:text-rose-400"
            };
        case 'cyberpunk':
            return {
                iconBg: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
                btnPrimary: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-fuchsia-500/20",
                btnTonal: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 hover:bg-fuchsia-200",
                tabActive: "bg-fuchsia-600 text-white",
                textAccent: "text-fuchsia-700 dark:text-fuchsia-400"
            };
        case 'space':
            return {
                iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
                btnPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20",
                btnTonal: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 hover:bg-indigo-200",
                tabActive: "bg-indigo-600 text-white",
                textAccent: "text-indigo-700 dark:text-indigo-400"
            };
        default:
            return null; // Fallback to default OneUI Blue
    }
};

// --- ONE UI DESIGN TOKENS ---
const oneUiCard = "bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md rounded-[26px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-white/20 dark:border-white/5 overflow-hidden transition-all duration-300";

// --- SKELETON COMPONENT ---
const TableSkeleton = () => (
  <div className={`${oneUiCard} mb-4 animate-pulse`}>
    <div className="p-5 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <div className="w-11 h-11 rounded-[18px] bg-gray-200 dark:bg-[#2C2C2E]"></div>
        <div className="space-y-2.5">
          <div className="h-5 w-40 bg-gray-200 dark:bg-[#2C2C2E] rounded-full"></div>
          <div className="h-3 w-24 bg-gray-200 dark:bg-[#2C2C2E] rounded-full"></div>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#2C2C2E]"></div>
    </div>
  </div>
);

// --- ALERT MODAL ---
export const AlertModal = memo(({ isOpen, onClose, title, message, monet }) => (
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
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-md" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-[cubic-bezier(0.19,1,0.22,1)] duration-400"
            enterFrom="opacity-0 scale-90 translate-y-8"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-90 translate-y-8"
          >
            <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] p-0 text-left align-middle shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all">
              <div className="p-6 pb-4">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-bold leading-6 text-gray-900 dark:text-white flex flex-col items-center gap-4 text-center"
                >
                  <div className={`p-3 rounded-full ${monet ? monet.iconBg : 'bg-blue-100 dark:bg-blue-500/20 text-[#007AFF]'}`}>
                      <Info className="w-8 h-8" />
                  </div>
                  {title}
                </Dialog.Title>
                <div className="mt-3 text-center">
                  <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-[#252525] border-t border-gray-200/50 dark:border-white/5 flex justify-center">
                <button
                  type="button"
                  className={`w-full rounded-[14px] px-5 py-3 text-[16px] font-semibold text-white focus:outline-none active:scale-[0.98] transition-transform ${monet ? monet.btnPrimary : 'bg-[#007AFF] hover:bg-[#0062CC]'}`}
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
));

// --- CONFIRM MODAL ---
export const ConfirmActionModal = memo(({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  variant = 'info',
  monet
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantMap = {
    danger: {
      icon: <AlertTriangle className="w-8 h-8 text-[#FF3B30]" />,
      iconBg: 'bg-red-100 dark:bg-red-500/20',
      buttonClass: 'bg-[#FF3B30] hover:bg-[#D73329] text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-8 h-8 text-[#FF9500]" />,
      iconBg: 'bg-orange-100 dark:bg-orange-500/20',
      buttonClass: 'bg-[#FF9500] hover:bg-[#D98308] text-white',
    },
    info: {
      icon: <Info className={`w-8 h-8 ${monet ? '' : 'text-[#007AFF]'}`} />,
      iconBg: monet ? monet.iconBg : 'bg-blue-100 dark:bg-blue-500/20',
      buttonClass: monet ? monet.btnPrimary : 'bg-[#007AFF] hover:bg-[#0062CC] text-white',
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
          <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-[cubic-bezier(0.19,1,0.22,1)] duration-400"
              enterFrom="opacity-0 scale-90 translate-y-8"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-90 translate-y-8"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] p-0 text-left align-middle shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all">
                <div className="p-6 pb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-gray-900 dark:text-white flex flex-col items-center gap-4 text-center"
                  >
                    <div className={`p-3 rounded-full ${iconBg}`}>
                      {icon}
                    </div>
                    {title}
                  </Dialog.Title>
                  <div className="mt-3 text-center">
                    <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-[#252525] border-t border-gray-200/50 dark:border-white/5 flex flex-row gap-3">
                  <button
                    type="button"
                    className="flex-1 justify-center rounded-[14px] bg-[#F2F2F7] dark:bg-[#3A3A3C] px-4 py-3 text-[16px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none"
                    onClick={onClose}
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 justify-center rounded-[14px] px-4 py-3 text-[16px] font-semibold focus:outline-none active:scale-[0.98] transition-all shadow-sm ${buttonClass}`}
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
});

// --- OPTIMIZED COLLAPSIBLE TABLE ---
const CollapsibleUserTable = memo(({
  title,
  sectionKey, // Unique key for this section (e.g., 'Grade 7')
  users,
  icon,
  onToggle, // Function expecting (sectionKey)
  isOpen,
  isRestrictedTable = false,
  handleSetRestriction,
  handleSelectUser,
  handleSelectAll,
  selectedUserIds,
  handleShowPassword,
  handleEditUser,
  handleSingleDelete,
  monet
}) => {
  
  const [localActionMenuOpenFor, setLocalActionMenuOpenFor] = useState(null);

  // Close action menu on outside click
  useEffect(() => {
    if (!localActionMenuOpenFor) return;
    const handleClickOutside = () => setLocalActionMenuOpenFor(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [localActionMenuOpenFor]);

  const userIdsInTable = users.map((u) => u.id);
  const allInTableSelected =
    userIdsInTable.length > 0 && userIdsInTable.every((id) => selectedUserIds.has(id));

  // Dynamic Styles
  const iconBoxClass = monet 
    ? monet.iconBg 
    : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#007AFF]";
    
  const toggleBtnClass = isOpen
    ? (monet ? `${monet.btnPrimary} text-white rotate-180` : "bg-[#007AFF] text-white rotate-180")
    : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-gray-400";
    
  const checkboxClass = monet 
    ? `checked:${monet.btnPrimary.split(' ')[0]} checked:border-transparent`
    : `checked:bg-[#007AFF] checked:border-[#007AFF]`;

  return (
    <div className={`${oneUiCard} mb-4`}>
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors duration-200 group outline-none"
      >
        <div className="flex items-center gap-5">
          <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${iconBoxClass}`}>
            {React.cloneElement(icon, { size: 24, strokeWidth: 2 })}
          </div>
          <div className="text-left">
            <h2 className={`text-[19px] font-bold tracking-tight ${monet ? monet.textAccent : 'text-gray-900 dark:text-white'}`}>{title}</h2>
            <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">{users.length} Accounts</span>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${toggleBtnClass}`}>
            <ChevronDown size={20} strokeWidth={2.5} />
        </div>
      </button>
      
      {/* Lag Fix: Removed 'transition-all' from height for large lists, using simple conditional rendering for huge lists or fast-rendering CSS */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-px w-full bg-gray-100 dark:bg-white/5 mx-auto w-[calc(100%-40px)]" />
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-white dark:bg-[#1C1C1E] text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        onChange={() => handleSelectAll(userIdsInTable)}
                        checked={allInTableSelected}
                        disabled={userIdsInTable.length === 0}
                        className={`peer h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-transparent focus:ring-0 transition-all cursor-pointer appearance-none ${checkboxClass}`}
                      />
                      <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-all scale-50 peer-checked:scale-100" />
                    </div>
                  </th>
                  <th className="px-4 py-4">Name</th>
                  <th className="px-4 py-4">Email</th>
                  <th className="px-4 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className={`group transition-colors ${selectedUserIds.has(user.id) ? (monet ? monet.iconBg : 'bg-blue-50/60 dark:bg-blue-900/10') : 'hover:bg-[#F2F2F7] dark:hover:bg-[#252525]'}`}
                    >
                      <td className="px-6 py-4 text-center">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            onChange={() => handleSelectUser(user.id)}
                            checked={selectedUserIds.has(user.id)}
                            className={`peer h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-transparent focus:ring-0 transition-all cursor-pointer appearance-none ${checkboxClass}`}
                          />
                          <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-all scale-50 peer-checked:scale-100" />
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-[14px] text-gray-500 dark:text-gray-400 font-medium">{user.email}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 dark:bg-[#2C2C2E] dark:text-gray-300 uppercase tracking-wide">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right relative">
                        {isRestrictedTable ? (
                          <button
                            onClick={() => handleSetRestriction(user.id, false, `${user.firstName} ${user.lastName}`)}
                            className="p-2.5 rounded-full text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-500/20 dark:hover:bg-green-500/30 transition-colors"
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
                              className={`p-2.5 rounded-full transition-all active:scale-95 ${monet ? `hover:${monet.iconBg}` : 'text-gray-400 hover:text-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-500/10'}`}
                              title="Actions"
                            >
                              <Settings size={20} strokeWidth={2} />
                            </button>

                            {localActionMenuOpenFor === user.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-12 top-6 z-30 w-52 bg-white dark:bg-[#252525] rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/5 py-2 origin-top-right animate-in fade-in zoom-in-95 duration-200"
                              >
                                <button
                                  onClick={() => {
                                    handleShowPassword(user.password);
                                    setLocalActionMenuOpenFor(null);
                                  }}
                                  className={`w-[calc(100%-12px)] mx-1.5 text-left px-4 py-2.5 text-[14px] font-medium rounded-[14px] flex items-center gap-3 transition-colors ${monet ? `hover:${monet.btnPrimary} hover:text-white text-gray-700 dark:text-gray-200` : 'text-gray-700 dark:text-gray-200 hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'}`}
                                >
                                  <Eye size={16} />
                                  Show Password
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditUser(user);
                                    setLocalActionMenuOpenFor(null);
                                  }}
                                  className={`w-[calc(100%-12px)] mx-1.5 text-left px-4 py-2.5 text-[14px] font-medium rounded-[14px] flex items-center gap-3 transition-colors ${monet ? `hover:${monet.btnPrimary} hover:text-white text-gray-700 dark:text-gray-200` : 'text-gray-700 dark:text-gray-200 hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'}`}
                                >
                                  <Edit size={16} />
                                  Edit User
                                </button>
                                <button
                                  onClick={() => {
                                    handleSetRestriction(user.id, true, `${user.firstName} ${user.lastName}`);
                                    setLocalActionMenuOpenFor(null);
                                  }}
                                  className="w-[calc(100%-12px)] mx-1.5 text-left px-4 py-2.5 text-[14px] font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-[14px] flex items-center gap-3 transition-colors"
                                >
                                  <UserX size={16} />
                                  Restrict Account
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-white/5 my-1.5 mx-3"></div>
                                <button
                                  onClick={() => {
                                    handleSingleDelete(user.id, `${user.firstName} ${user.lastName}`);
                                    setLocalActionMenuOpenFor(null);
                                  }}
                                  className="w-[calc(100%-12px)] mx-1.5 text-left px-4 py-2.5 text-[14px] font-medium text-[#FF3B30] hover:bg-red-50 dark:hover:bg-red-500/10 rounded-[14px] flex items-center gap-3 transition-colors"
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
                    <td colSpan="5" className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm font-medium">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

const AdminDashboard = () => {
  const { firestoreService, userProfile } = useAuth();
  const { showToast } = useToast();
  
  const { activeOverlay } = useTheme();
  const monet = getMonetStyles(activeOverlay);

  const [allUsers, setAllUsers] = useState([]);
  const [groupedUsers, setGroupedUsers] = useState({ admins: [], teachers: [], students: [] });
  const [restrictedGroupedUsers, setRestrictedGroupedUsers] = useState({ admins: [], teachers: [], students: [] });
  
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('active');
  const [activeRoleTab, setActiveRoleTab] = useState('admins'); 
  
  const [studentsByGrade, setStudentsByGrade] = useState({});
  const [restrictedStudentsByGrade, setRestrictedStudentsByGrade] = useState({});
  const [restrictedUsers, setRestrictedUsers] = useState([]);

  // --- COLLAPSED BY DEFAULT ---
  const [openSections, setOpenSections] = useState({
    admins: false,
    teachers: false,
    studentsContainer: false,
    restrictedStudentsContainer: false,
    'Grade 7': false,
    'Grade 8': false,
    'Grade 9': false,
    'Grade 10': false,
    'Grade 11': false,
    'Grade 12': false,
    Unassigned: false,
  });

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
  const [isDownloadModalOpen, setDownloadModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [alertModalState, setAlertModalState] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, confirmText: 'Confirm', variant: 'info' });

  // --- OPTIMIZED HANDLERS (useCallback) ---
  // Fixes lag by preventing re-creation on every render
  
  const toggleSection = useCallback((section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const closeAlertModal = useCallback(() => setAlertModalState(prev => ({ ...prev, isOpen: false })), []);
  const closeConfirmModal = useCallback(() => setConfirmModalState(prev => ({ ...prev, isOpen: false })), []);

  const handleSelectUser = useCallback((userId) => {
    setSelectedUserIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(userId)) newSelected.delete(userId);
      else newSelected.add(userId);
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback((userIds) => {
    setSelectedUserIds((prev) => {
      const allSelected = userIds.every((id) => prev.has(id));
      const newSelected = new Set(prev);
      if (allSelected) userIds.forEach((id) => newSelected.delete(id));
      else userIds.forEach((id) => newSelected.add(id));
      return newSelected;
    });
  }, []);

  const handleShowPassword = useCallback((password) => {
    setAlertModalState({
      isOpen: true,
      title: 'User Password',
      message: `WARNING: You are viewing a private password. The user's password is: ${password}`,
      monet
    });
  }, [monet]);

  const handleEditUser = useCallback((user) => {
      setSelectedUser(user);
      setIsEditUserModalOpen(true);
  }, []);

  const fetchAndGroupUsers = async () => {
    if (!userProfile?.schoolId) return;

    setLoading(true);
    try {
      const users = await firestoreService.getAllUsers(userProfile.schoolId);
      setAllUsers(users);

      const active = [];
      const restricted = [];
      users.forEach((user) => (user.isRestricted ? restricted.push(user) : active.push(user)));
      setRestrictedUsers(restricted);

      const groupUsers = (list) => {
          const groups = { admins: [], teachers: [], students: [] };
          list.forEach(u => {
              if (u.role === 'admin') groups.admins.push(u);
              else if (u.role === 'teacher') groups.teachers.push(u);
              else groups.students.push(u);
          });
          // Sort
          Object.keys(groups).forEach(key => groups[key].sort((a,b) => (a.lastName || '').localeCompare(b.lastName || '')));
          return groups;
      };

      const activeGroups = groupUsers(active);
      const restrictedGroups = groupUsers(restricted);

      const processGrades = (studentList) => {
          const gradeGroups = {};
          ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Unassigned'].forEach(lvl => gradeGroups[lvl] = []);
          studentList.forEach((student) => {
            const key = student.gradeLevel && gradeGroups[student.gradeLevel] ? student.gradeLevel : 'Unassigned';
            gradeGroups[key].push(student);
          });
          return gradeGroups;
      };

      setStudentsByGrade(processGrades(activeGroups.students));
      setRestrictedStudentsByGrade(processGrades(restrictedGroups.students));
      setGroupedUsers(activeGroups);
      setRestrictedGroupedUsers(restrictedGroups);

    } catch (error) {
      showToast('Failed to fetch users.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndGroupUsers();
  }, [userProfile?.schoolId]);

  const handleSetRestriction = useCallback(async (userId, shouldRestrict, userName) => {
    const action = shouldRestrict ? 'restrict' : 'unrestrict';
    
    setConfirmModalState({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Account?`,
      message: `Are you sure you want to ${action} the account for ${userName}?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      variant: shouldRestrict ? 'warning' : 'info',
      monet,
      onConfirm: async () => {
          try {
            await firestoreService.updateUserDetails(userId, { isRestricted: shouldRestrict });
            showToast(`User account ${action}ed successfully!`, 'success');
            fetchAndGroupUsers();
          } catch (error) {
            showToast(`Failed to ${action} account.`, 'error');
          }
      }
    });
  }, [firestoreService, showToast, monet]);

  const handleSingleDelete = useCallback((userId, userName) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Delete User?',
      message: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      monet,
      onConfirm: async () => {
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
    });
  }, [firestoreService, showToast, monet]);

  const handleDeleteSelected = useCallback(() => {
    const userIdsToDelete = Array.from(selectedUserIds);
    if (userIdsToDelete.length === 0) return showToast('No users selected.', 'warning');

    setConfirmModalState({
      isOpen: true,
      title: `Delete ${userIdsToDelete.length} Users?`,
      message: `Are you sure you want to delete these ${userIdsToDelete.length} selected user(s)? This action cannot be undone.`,
      confirmText: 'Delete All',
      variant: 'danger',
      monet,
      onConfirm: async () => {
          try {
            await firestoreService.deleteMultipleUsers(userIdsToDelete);
            showToast(`${userIdsToDelete.length} user(s) deleted successfully!`, 'success');
            setSelectedUserIds(new Set());
            fetchAndGroupUsers();
          } catch (error) {
            showToast('Failed to delete users.', 'error');
          }
      }
    });
  }, [selectedUserIds, firestoreService, showToast, monet]);

  const handleGenerateUsers = async (data) => {
    // ... (Generate Logic kept same, no callback needed as it's passed to modal once)
    let usersToCreate = [];
    const { names, quantity, role, gradeLevel, schoolId } = data;
    const generatePassword = () => Math.random().toString(36).slice(-8);
    const targetSchoolId = schoolId || userProfile?.schoolId || DEFAULT_SCHOOL_ID;

    try {
      if (names) {
        usersToCreate = names.split('\n').map(n => n.trim()).filter(n => n).map(fullName => {
            const parts = fullName.split(/\s+/);
            const firstName = parts[0] || 'User';
            const lastName = parts.slice(1).join(' ') || 'Name';
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@srcs.edu`;
            return { firstName, lastName, email, password: generatePassword(), role, schoolId: targetSchoolId, createdAt: new Date(), ...(role === 'student' && gradeLevel && { gradeLevel }) };
        });
      } else if (quantity) {
        for (let i = 1; i <= quantity; i++) {
          const num = i.toString().padStart(2, '0');
          let fName = role === 'student' ? 'Student' : role === 'teacher' ? 'Teacher' : 'Admin';
          usersToCreate.push({
            firstName: fName, lastName: num, email: `${fName.toLowerCase()}.${num}@srcs.edu`,
            password: generatePassword(), role, schoolId: targetSchoolId, createdAt: new Date(),
            ...(role === 'student' && gradeLevel && { gradeLevel })
          });
        }
      }

      if (usersToCreate.length === 0) return showToast('No valid users to create.', 'warning');

      await firestoreService.addMultipleUsers(usersToCreate);
      showToast(`${usersToCreate.length} users generated!`, 'success');
      setGenerateModalOpen(false);
      fetchAndGroupUsers();
    } catch (error) {
      showToast(`Failed: ${error.message}`, 'error');
    }
  };

  const handleUpdateUser = async (updates) => {
    setIsUpdatingUser(true);
    try {
      await firestoreService.updateUserDetails(selectedUser.id, updates);
      showToast('User updated!', 'success');
      setIsEditUserModalOpen(false);
      fetchAndGroupUsers();
    } catch (error) {
      showToast(`Failed: ${error.message}`, 'error');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleUpdatePassword = async (userId, newPassword) => {
    try {
      await firestoreService.updateUserPassword(userId, newPassword);
      showToast('Password updated!', 'success');
      fetchAndGroupUsers();
    } catch (error) {
      showToast('Failed to update password.', 'error');
    }
  };

  const exportToXlsx = (users, roleName) => {
    const tableData = users.map((user) => ({
      Name: `${user.firstName} ${user.lastName}`, Username: user.email, Password: user.password, Role: user.role, 'Grade Level': user.gradeLevel || 'N/A',
    }));
    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'User Accounts');
    XLSX.writeFile(wb, `${roleName}-accounts-${new Date().toLocaleDateString()}.xlsx`);
  };

  // Dynamic Button Classes
  const primaryBtnClass = monet 
    ? `${monet.btnPrimary} rounded-[24px] px-6 py-2.5 font-semibold text-[15px] shadow-lg active:scale-95 transition-all`
    : "bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-[24px] px-6 py-2.5 font-semibold text-[15px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all";

  const secondaryBtnClass = monet
    ? `${monet.btnTonal} rounded-[24px] px-6 py-2.5 font-semibold text-[15px] active:scale-95 transition-all border border-transparent`
    : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white rounded-[24px] px-6 py-2.5 font-semibold text-[15px] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] active:scale-95 transition-all border border-transparent";
  
  const destructiveBtnClass = "bg-[#FF3B30] hover:bg-[#D73329] text-white rounded-[24px] px-6 py-2.5 font-semibold text-[15px] shadow-lg shadow-red-500/20 active:scale-95 transition-all";

  // --- DERIVE CURRENT VIEW DATA ---
  const currentData = activeTab === 'active' ? groupedUsers : restrictedGroupedUsers;
  const currentStudentsByGrade = activeTab === 'active' ? studentsByGrade : restrictedStudentsByGrade;
  
  return (
   <div className="min-h-[calc(100vh-2rem)] m-4 rounded-[42px] bg-[#F2F2F2] dark:bg-black/75 font-sans pb-10 overflow-hidden shadow-2xl backdrop-blur-xl border border-white/10">
      <div className="p-6 sm:p-10 max-w-[1400px] mx-auto">
        
        <header className="mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className={`text-[42px] font-bold tracking-tight leading-[1.1] mb-2 ${monet ? monet.textAccent : 'text-black dark:text-white'}`}>
                Admin Console
              </h1>
              <p className="text-[17px] font-medium text-gray-500 dark:text-gray-400">
                Manage your organization's users and settings.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {selectedUserIds.size > 0 && (
                <button onClick={handleDeleteSelected} className={destructiveBtnClass}>
                  <div className="flex items-center"><Trash2 size={18} className="mr-2" strokeWidth={2.5} /> Delete ({selectedUserIds.size})</div>
                </button>
              )}
              <button onClick={() => setDownloadModalOpen(true)} className={secondaryBtnClass}>
                <div className="flex items-center"><Download size={18} className="mr-2" strokeWidth={2.5} /> Export</div>
              </button>
              <button onClick={() => setGenerateModalOpen(true)} className={primaryBtnClass}>
                 <div className="flex items-center"><Users size={18} className="mr-2" strokeWidth={2.5} /> New User</div>
              </button>
            </div>
          </div>
        </header>

        {/* ONE UI MAIN SEGMENTED CONTROL */}
        <div className="mb-8">
          <div className="inline-flex p-1.5 bg-[#E2E2E2]/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md rounded-full w-full sm:w-auto relative">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 sm:flex-none px-8 py-2.5 rounded-full text-[15px] font-bold transition-all duration-300 ${
                activeTab === 'active'
                  ? (monet ? `bg-white dark:bg-[#3A3A3C] shadow-sm scale-100 ${monet.textAccent}` : 'bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm scale-100')
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Active Accounts
            </button>
            <button
              onClick={() => setActiveTab('restricted')}
              className={`flex-1 sm:flex-none px-8 py-2.5 rounded-full text-[15px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'restricted'
                  ? (monet ? `bg-white dark:bg-[#3A3A3C] shadow-sm scale-100 ${monet.textAccent}` : 'bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm scale-100')
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Restricted
              {restrictedUsers.length > 0 && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'restricted' ? (monet ? monet.btnTonal : 'bg-gray-100 dark:bg-black/20 text-gray-600 dark:text-gray-300') : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {restrictedUsers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {loading ? (
           <div className="space-y-4 animate-in fade-in duration-500">
             <TableSkeleton />
             <TableSkeleton />
             <TableSkeleton />
           </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* --- SECONDARY TABS --- */}
            <div className="mb-6">
               <div className="inline-flex p-1 bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-full border border-white/20 dark:border-white/5 overflow-x-auto max-w-full">
                  {['admins', 'teachers', 'students'].map((role) => (
                     <button
                        key={role}
                        onClick={() => setActiveRoleTab(role)}
                        className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                           activeRoleTab === role
                           ? (monet ? `${monet.btnPrimary} shadow-md` : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md')
                           : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                     >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                        <span className="ml-2 opacity-60">
                           {currentData[role].length}
                        </span>
                     </button>
                  ))}
               </div>
            </div>

            {/* --- CONTENT --- */}
            
            {activeRoleTab === 'admins' && (
                <CollapsibleUserTable
                  title="Administrators"
                  sectionKey="admins"
                  users={currentData.admins}
                  icon={<Shield />}
                  isOpen={openSections.admins}
                  onToggle={toggleSection}
                  handleSetRestriction={handleSetRestriction}
                  handleSelectUser={handleSelectUser}
                  handleSelectAll={handleSelectAll}
                  selectedUserIds={selectedUserIds}
                  handleShowPassword={handleShowPassword}
                  handleEditUser={handleEditUser}
                  handleSingleDelete={handleSingleDelete}
                  isRestrictedTable={activeTab === 'restricted'}
                  monet={monet}
                />
            )}

            {activeRoleTab === 'teachers' && (
                <CollapsibleUserTable
                  title="Teachers"
                  sectionKey="teachers"
                  users={currentData.teachers}
                  icon={<GraduationCap />}
                  isOpen={openSections.teachers}
                  onToggle={toggleSection}
                  handleSetRestriction={handleSetRestriction}
                  handleSelectUser={handleSelectUser}
                  handleSelectAll={handleSelectAll}
                  selectedUserIds={selectedUserIds}
                  handleShowPassword={handleShowPassword}
                  handleEditUser={handleEditUser}
                  handleSingleDelete={handleSingleDelete}
                  isRestrictedTable={activeTab === 'restricted'}
                  monet={monet}
                />
            )}

            {activeRoleTab === 'students' && (
                <div className={`${oneUiCard} mb-6 overflow-hidden transition-all duration-300`}>
                  <button
                    onClick={() => toggleSection(activeTab === 'active' ? 'studentsContainer' : 'restrictedStudentsContainer')}
                    className="w-full flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors duration-200 group outline-none"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${monet ? monet.iconBg : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#007AFF]'}`}>
                        <User size={24} strokeWidth={2} />
                      </div>
                      <div className="text-left">
                        <h2 className={`text-[19px] font-bold tracking-tight ${monet ? monet.textAccent : 'text-gray-900 dark:text-white'}`}>Students</h2>
                        <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
                          {currentData.students.length} Accounts
                        </span>
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openSections[activeTab === 'active' ? 'studentsContainer' : 'restrictedStudentsContainer'] ? (monet ? `${monet.btnPrimary} text-white rotate-180` : 'bg-[#007AFF] text-white rotate-180') : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-gray-400'}`}>
                        <ChevronDown size={20} strokeWidth={2.5} />
                    </div>
                  </button>
                  
                  {/* LAG FIX: Removed height transition on container to avoid layout thrashing on massive lists */}
                  {openSections[activeTab === 'active' ? 'studentsContainer' : 'restrictedStudentsContainer'] && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="p-4 space-y-4 bg-[#F9F9F9]/50 dark:bg-[#151515]/50 border-t border-gray-100 dark:border-white/5">
                        {currentData.students.length > 0 ? (
                          Object.entries(currentStudentsByGrade).map(([grade, list]) => (
                            list.length > 0 && (
                                <CollapsibleUserTable
                                  key={grade}
                                  title={grade}
                                  sectionKey={grade}
                                  users={list}
                                  icon={<User />}
                                  isOpen={openSections[grade]}
                                  onToggle={toggleSection}
                                  handleSetRestriction={handleSetRestriction}
                                  handleSelectUser={handleSelectUser}
                                  handleSelectAll={handleSelectAll}
                                  selectedUserIds={selectedUserIds}
                                  handleShowPassword={handleShowPassword}
                                  handleEditUser={handleEditUser}
                                  handleSingleDelete={handleSingleDelete}
                                  isRestrictedTable={activeTab === 'restricted'}
                                  monet={monet}
                                />
                            )
                          ))
                        ) : (
                          <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">No student accounts found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
        monet={monet}
      />
      
      <ConfirmActionModal
        isOpen={confirmModalState.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        variant={confirmModalState.variant}
        monet={monet}
      />

    </div>
  );
};

export default AdminDashboard;