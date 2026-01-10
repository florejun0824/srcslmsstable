// src/pages/AdminDashboard.jsx

import React, { useState, useEffect, Fragment, memo, useCallback, lazy, Suspense, useRef } from 'react';
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
  Loader2 
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';

// --- CUSTOM AUTO-SIZER (Replaces react-virtualized-auto-sizer) ---
// This eliminates the import errors by using a native browser observer instead of an external library.
const SimpleAutoSizer = ({ children }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initial measurement
    const measure = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };
    measure();

    // Observer for changes
    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100px' }}>
      {dimensions.width > 0 && dimensions.height > 0 ? (
        children(dimensions)
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Loading layout...
        </div>
      )}
    </div>
  );
};

// --- LAZY FIXED SIZE LIST (Robust Import) ---
const LazyFixedSizeList = lazy(async () => {
  try {
    const mod = await import('react-window');
    // Handle both Named export and Default export patterns
    const Component = mod.FixedSizeList || mod.default?.FixedSizeList;
    if (Component) return { default: Component };
    throw new Error('FixedSizeList not found');
  } catch (error) {
    console.warn("Virtualization failed, falling back to standard list:", error);
    // Fallback: A component that renders a standard scrollable div (Non-virtualized)
    return {
      default: ({ children, itemCount, itemSize, height, width, itemData }) => (
        <div style={{ height, width, overflow: 'auto' }}>
          <div style={{ height: itemCount * itemSize, position: 'relative' }}>
            {Array.from({ length: itemCount }).map((_, index) => (
              children({
                index,
                style: {
                  position: 'absolute',
                  top: index * itemSize,
                  left: 0,
                  width: '100%',
                  height: itemSize,
                },
                data: itemData
              })
            ))}
          </div>
        </div>
      )
    };
  }
});

const FixedSizeListWrapper = (props) => (
  <Suspense fallback={<div className="w-full h-full bg-gray-50 dark:bg-[#252525] animate-pulse" />}>
    <LazyFixedSizeList {...props} />
  </Suspense>
);

// --- LAZY LOADED MODALS ---
const AddUserModal = lazy(() => import('../components/admin/AddUserModal'));
const GenerateUsersModal = lazy(() => import('../components/admin/GenerateUsersModal'));
const DownloadAccountsModal = lazy(() => import('../components/admin/DownloadAccountsModal'));
const EditUserModal = lazy(() => import('../components/admin/EditUserModal'));

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">The dashboard encountered an unexpected error.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- CUSTOM HOOK: MONET THEME ---
const useMonetTheme = () => {
  const { activeOverlay } = useTheme();

  return React.useMemo(() => {
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
        return null;
    }
  }, [activeOverlay]);
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

// --- MODAL LOADING SPINNER ---
const ModalLoader = () => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 dark:bg-black/50 backdrop-blur-sm">
    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-full shadow-xl">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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

// --- ROW COMPONENT FOR VIRTUALIZED LIST ---
const VirtualizedUserRow = ({ index, style, data }) => {
  const { 
    users, 
    selectedUserIds, 
    handleSelectUser, 
    isRestrictedTable, 
    handleSetRestriction, 
    monet, 
    localActionMenuOpenFor, 
    setLocalActionMenuOpenFor,
    handleShowPassword,
    handleEditUser,
    handleSingleDelete,
    checkboxClass 
  } = data;

  const user = users[index];
  const isSelected = selectedUserIds.has(user.id);

  return (
    <div style={style} className={`flex items-center border-b border-gray-100 dark:border-white/5 hover:bg-[#F2F2F7] dark:hover:bg-[#252525] transition-colors ${isSelected ? (monet ? monet.iconBg : 'bg-blue-50/60 dark:bg-blue-900/10') : ''}`}>
      {/* Checkbox Column */}
      <div className="w-16 flex justify-center flex-shrink-0">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            onChange={() => handleSelectUser(user.id)}
            checked={isSelected}
            className={`peer h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-transparent focus:ring-0 transition-all cursor-pointer appearance-none ${checkboxClass}`}
          />
          <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-all scale-50 peer-checked:scale-100" />
        </div>
      </div>

      {/* Name Column */}
      <div className="flex-1 px-4 min-w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">
        <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</span>
      </div>

      {/* Email Column */}
      <div className="flex-1 px-4 hidden sm:block whitespace-nowrap overflow-hidden text-ellipsis text-[14px] text-gray-500 dark:text-gray-400 font-medium">
        {user.email}
      </div>

      {/* Role Column */}
      <div className="w-32 px-4 hidden md:block">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 dark:bg-[#2C2C2E] dark:text-gray-300 uppercase tracking-wide">
          {user.role}
        </span>
      </div>

      {/* Actions Column */}
      <div className="w-24 px-6 text-right relative flex-shrink-0">
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
                className="absolute right-12 top-0 z-50 w-52 bg-white dark:bg-[#252525] rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/5 py-2 origin-top-right animate-in fade-in zoom-in-95 duration-200"
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
      </div>
    </div>
  );
};

// --- OPTIMIZED COLLAPSIBLE TABLE WITH VIRTUALIZATION ---
const CollapsibleUserTable = memo(({
  title,
  sectionKey,
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
  handleEditUser,
  handleSingleDelete,
  monet
}) => {
  
  const [localActionMenuOpenFor, setLocalActionMenuOpenFor] = useState(null);

  useEffect(() => {
    if (!localActionMenuOpenFor) return;
    const handleClickOutside = () => setLocalActionMenuOpenFor(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [localActionMenuOpenFor]);

  const userIdsInTable = users.map((u) => u.id);
  const allInTableSelected =
    userIdsInTable.length > 0 && userIdsInTable.every((id) => selectedUserIds.has(id));

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
    <div className={`${oneUiCard} mb-4 flex flex-col`}>
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors duration-200 group outline-none shrink-0"
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
      
      {isOpen && (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-px w-[calc(100%-40px)] bg-gray-100 dark:bg-white/5 mx-auto shrink-0" />
          
          {/* Header Row */}
          <div className="flex items-center bg-white dark:bg-[#1C1C1E] text-[11px] uppercase font-bold text-gray-400 tracking-wider h-12 border-b border-gray-100 dark:border-white/5 shrink-0">
            <div className="w-16 flex justify-center">
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
            </div>
            <div className="flex-1 px-4">Name</div>
            <div className="flex-1 px-4 hidden sm:block">Email</div>
            <div className="w-32 px-4 hidden md:block">Role</div>
            <div className="w-24 px-6 text-right">Actions</div>
          </div>

          {/* Virtualized Body */}
          <div className="w-full relative" style={{ height: '500px', maxHeight: '60vh' }}>
            {users.length > 0 ? (
              <SimpleAutoSizer>
                {({ height, width }) => (
                  <FixedSizeListWrapper
                    height={height}
                    itemCount={users.length}
                    itemSize={65} 
                    width={width}
                    itemData={{
                      users,
                      selectedUserIds,
                      handleSelectUser,
                      isRestrictedTable,
                      handleSetRestriction,
                      monet,
                      localActionMenuOpenFor,
                      setLocalActionMenuOpenFor,
                      handleShowPassword,
                      handleEditUser,
                      handleSingleDelete,
                      checkboxClass
                    }}
                  >
                    {VirtualizedUserRow}
                  </FixedSizeListWrapper>
                )}
              </SimpleAutoSizer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                No users found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const AdminDashboard = () => {
  const { firestoreService, userProfile } = useAuth();
  const { showToast } = useToast();
  
  // Use extracted theme hook
  const monet = useMonetTheme();

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

  // Dynamically import XLSX to reduce main bundle size
  const exportToXlsx = async (users, roleName) => {
    try {
      showToast("Preparing download...", "info");
      const XLSX = await import('xlsx');
      
      const tableData = users.map((user) => ({
        Name: `${user.firstName} ${user.lastName}`, Username: user.email, Password: user.password, Role: user.role, 'Grade Level': user.gradeLevel || 'N/A',
      }));
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'User Accounts');
      XLSX.writeFile(wb, `${roleName}-accounts-${new Date().toLocaleDateString()}.xlsx`);
      showToast("Download started!", "success");
    } catch (error) {
      console.error("Export failed", error);
      showToast("Failed to load export module.", "error");
    }
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
   <ErrorBoundary>
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

      {/* --- RENDER ALL MODALS WITH SUSPENSE --- */}
      <Suspense fallback={<ModalLoader />}>
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
      </Suspense>
      
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
   </ErrorBoundary>
  );
};

export default AdminDashboard;