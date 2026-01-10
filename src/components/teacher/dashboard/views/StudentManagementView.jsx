// src/components/teacher/dashboard/views/StudentManagementView.jsx

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext'; 
import { useToast } from '../../../../contexts/ToastContext'; 
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  Cog,
  Search,
  UserPlus,
  X,
  ListFilter,
  Trash2,
  ChevronDown,
  ChevronsUpDown,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { CheckCircleIcon } from '@heroicons/react/24/solid'; 
import { motion, AnimatePresence } from 'framer-motion';

import EditUserModal from '../../../admin/EditUserModal'; 
import ImportToClassModal from './ImportToClassModal'; 
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';

// --- STATIC THEME CONFIGURATION ---
// Moved outside component to prevent recreation on every render
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas':
            return {
                accentBg: 'bg-red-600',
                accentGradient: 'from-red-600 to-green-700',
                accentText: 'text-red-600',
                lightBg: 'bg-red-50 dark:bg-red-900/20',
                glassBg: 'bg-red-50/60 dark:bg-red-900/10',
                border: 'border-red-200 dark:border-red-800',
                ring: 'focus:ring-red-500',
                checkbox: 'checked:bg-red-600 checked:border-red-600',
                iconBg: 'bg-red-100 dark:bg-red-900/40'
            };
        case 'valentines':
            return {
                accentBg: 'bg-pink-600',
                accentGradient: 'from-pink-500 to-rose-600',
                accentText: 'text-pink-600',
                lightBg: 'bg-pink-50 dark:bg-pink-900/20',
                glassBg: 'bg-pink-50/60 dark:bg-pink-900/10',
                border: 'border-pink-200 dark:border-pink-800',
                ring: 'focus:ring-pink-500',
                checkbox: 'checked:bg-pink-600 checked:border-pink-600',
                iconBg: 'bg-pink-100 dark:bg-pink-900/40'
            };
        case 'cyberpunk':
            return {
                accentBg: 'bg-fuchsia-600',
                accentGradient: 'from-purple-600 to-pink-600',
                accentText: 'text-fuchsia-400',
                lightBg: 'bg-fuchsia-900/20',
                glassBg: 'bg-fuchsia-900/10',
                border: 'border-fuchsia-500/50',
                ring: 'focus:ring-fuchsia-500',
                checkbox: 'checked:bg-fuchsia-500 checked:border-fuchsia-500',
                iconBg: 'bg-fuchsia-900/40'
            };
        default: // Default Blue/Indigo
            return {
                accentBg: 'bg-indigo-600',
                accentGradient: 'from-indigo-600 to-blue-600',
                accentText: 'text-indigo-600',
                lightBg: 'bg-indigo-50 dark:bg-indigo-900/20',
                glassBg: 'bg-indigo-50/60 dark:bg-indigo-900/10',
                border: 'border-indigo-200 dark:border-indigo-800',
                ring: 'focus:ring-indigo-500',
                checkbox: 'checked:bg-indigo-600 checked:border-indigo-600',
                iconBg: 'bg-indigo-100 dark:bg-indigo-900/40'
            };
    }
};

// --- SKELETAL LOADING (Memoized) ---
const StudentTableSkeleton = memo(() => (
  <div className="flex-1 flex flex-col animate-pulse h-full">
    <div className="space-y-3 overflow-hidden flex-1 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-[1.8rem] bg-white/40 dark:bg-white/5 border border-white/20">
           <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>
           <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
           </div>
           <div className="hidden md:block w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
));

// --- COMPONENT: Student Mobile Card (Memoized) ---
const StudentMobileCard = memo(({ user, enrolledClasses, onEdit, onSelect, isSelected, theme }) => {
  return (
    <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
            relative p-5 mb-3 rounded-[2rem] border transition-all duration-300 active:scale-[0.98]
            ${isSelected 
                ? `${theme.lightBg} ${theme.border} ring-1 ${theme.ring.replace('focus:', '')}` 
                : 'bg-white/60 dark:bg-[#1e1e1e]/60 border-white/40 dark:border-white/5 shadow-sm'
            }
        `}
    >
        <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
                <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => onSelect(user.id)} 
                    className={`peer appearance-none w-6 h-6 rounded-full border-2 transition-all cursor-pointer border-slate-300 dark:border-slate-600 ${theme.checkbox}`}
                />
                <CheckCircleIcon className="absolute w-6 h-6 pointer-events-none opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 text-white" />
            </div>

            <div className="flex-shrink-0 w-12 h-12 rounded-full ring-2 ring-white dark:ring-white/10 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                    <UserInitialsAvatar user={user} size="full" className="w-full h-full text-sm font-bold" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-[15px] truncate leading-tight">
                    {user.lastName}, {user.firstName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                   {user.gradeLevel || 'No Grade'} • {enrolledClasses.length} Classes
                </p>
            </div>
            
            <button
                onClick={() => onEdit(user)}
                className="p-2.5 rounded-2xl bg-white dark:bg-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-white shadow-sm border border-slate-100 dark:border-white/5 transition-colors"
            >
                <Cog size={20} />
            </button>
        </div>
    </motion.div>
  );
});

// --- COMPONENT: Student Desktop Row (Memoized) ---
const StudentDesktopRow = memo(({ user, enrolledClasses, onEdit, onSelect, isSelected, theme }) => {
  return (
    <tr 
        className={`
            group border-b border-slate-100 dark:border-white/5 last:border-none transition-colors 
            ${isSelected ? theme.lightBg : 'hover:bg-slate-50/50 dark:hover:bg-white/5'}
        `}
    >
        <td className="px-6 py-4 w-16 align-middle">
            <div className="relative flex items-center justify-center w-5 h-5 mx-auto z-0">
                <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => onSelect(user.id)} 
                    className={`peer appearance-none w-5 h-5 rounded-full border-2 transition-all cursor-pointer border-slate-300 dark:border-slate-600 ${theme.checkbox}`}
                />
                <CheckCircleIcon className="absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 text-white" />
            </div>
        </td>
        <td className="px-6 py-4 align-middle">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-white/10 overflow-hidden relative z-0 shadow-sm flex-shrink-0">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <UserInitialsAvatar user={user} size="full" className="w-full h-full text-xs font-bold" />
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{user.lastName}, {user.firstName}</span>
                    <span className="text-xs text-slate-400">{user.email}</span>
                </div>
            </div>
        </td>
        <td className="px-6 py-4 align-middle">
            <span className="inline-flex items-center px-3 py-1 rounded-[0.8rem] text-xs font-bold bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 shadow-sm">
                {user.gradeLevel || 'N/A'}
            </span>
        </td>
        <td className="px-6 py-4 align-middle max-w-md">
          {enrolledClasses.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
                {enrolledClasses.map(className => (
                    <span key={className} className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 shadow-sm whitespace-nowrap">
                        {className}
                    </span>
                ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic opacity-60">Unassigned</span>
          )}
        </td>
        <td className="px-6 py-4 text-right align-middle">
          <button
            onClick={() => onEdit(user)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-500 dark:hover:bg-indigo-600 transition-all active:scale-95"
          >
            <Cog size={18} />
          </button>
        </td>
    </tr>
  );
});

// --- FILTER POPUP (Memoized) ---
const FilterPopup = memo(({ allClasses, filters, onFilterChange, onClose, onClear, theme }) => {
  const [classSearch, setClassSearch] = useState('');
  const [isClassSearchOpen, setIsClassSearchOpen] = useState(false);

  const availableClasses = useMemo(() => {
    const lowerSearch = classSearch.toLowerCase();
    return allClasses.filter(cls => {
      if (filters.grade !== 'All' && cls.gradeLevel !== filters.grade) return false;
      return cls.name.toLowerCase().includes(lowerSearch);
    });
  }, [allClasses, classSearch, filters.grade]);

  return (
    <>
        <div className="fixed inset-0 bg-transparent z-40" onClick={onClose} />
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="absolute top-full right-0 mt-3 w-80 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-3xl border border-white/20 dark:border-white/5 z-50 ring-1 ring-black/5"
        >
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 rounded-t-[2rem]">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ListFilter size={16} className={theme.accentText} /> Filter Students
                </h3>
                <button onClick={onClear} className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors">
                    <Trash2 size={12} /> Clear
                </button>
            </div>
            
            <div className="p-5 space-y-5">
                {/* Grade Dropdown */}
                <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Grade Level</label>
                    <div className="relative group">
                        <select 
                            value={filters.grade}
                            onChange={(e) => onFilterChange('grade', e.target.value)}
                            className="w-full appearance-none bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[1.2rem] px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow"
                        >
                            {['All', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'N/A'].map(opt => (
                                <option key={opt} value={opt}>{opt === 'All' ? 'All Grades' : opt}</option>
                            ))}
                        </select>
                        <ChevronsUpDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Class Search */}
                <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Class Section</label>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search class..."
                            value={filters.class ? filters.class.name : classSearch}
                            onFocus={() => setIsClassSearchOpen(true)}
                            onChange={(e) => { setClassSearch(e.target.value); onFilterChange('class', null); setIsClassSearchOpen(true); }}
                            className="w-full bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[1.2rem] pl-4 pr-10 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow"
                        />
                        {filters.class ? (
                            <button onClick={() => onFilterChange('class', null)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors"><X size={12} /></button>
                        ) : (
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        )}
                        
                        {isClassSearchOpen && !filters.class && (
                            <div className="absolute z-20 w-full mt-2 bg-white dark:bg-[#252529] rounded-[1.5rem] shadow-xl max-h-80 overflow-y-auto border border-slate-100 dark:border-white/5 p-1.5 custom-scrollbar">
                                {availableClasses.length > 0 ? availableClasses.map(cls => (
                                    <div key={cls.id} className={`px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors ${theme.lightBg} hover:brightness-95 dark:hover:brightness-110 mb-1 last:mb-0`} 
                                        onClick={() => { onFilterChange('class', cls); setClassSearch(''); setIsClassSearchOpen(false); }}>
                                        {cls.name}
                                    </div>
                                )) : <div className="p-4 text-xs text-slate-400 text-center font-medium">No classes found</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    </>
  );
});

// --- MAIN COMPONENT ---
const StudentManagementView = () => {
  const { firestoreService, userProfile } = useAuth();
  const { showToast } = useToast();
  const { themeSettings } = useTheme();
  
  // Memoize theme to prevent deep object recreation
  const theme = useMemo(() => getThemeStyles(themeSettings?.overlay), [themeSettings?.overlay]);

  // STATE
  const [allStudents, setAllStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // UI STATE
  const [filters, setFilters] = useState({ name: '', grade: 'All', class: null });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  
  // MODAL STATE
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // FETCH DATA
  const fetchStudents = async (isLoadMore = false) => {
    if (!userProfile?.schoolId) return;
    if (loading) return;

    setLoading(true);
    try {
        const result = await firestoreService.getUsersPaginated(
            userProfile.schoolId,
            isLoadMore ? lastDoc : null
        );
        
        const newStudents = result.users.filter(u => u.role === 'student');

        if (isLoadMore) {
            setAllStudents(prev => [...prev, ...newStudents]);
        } else {
            setAllStudents(newStudents);
        }

        setLastDoc(result.lastDoc);
        
        if (!result.lastDoc || result.users.length < 20) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }

        if (!isLoadMore && allClasses.length === 0) {
            const classesData = await firestoreService.getAllClasses(userProfile.schoolId);
            setAllClasses(classesData);
        }

    } catch (error) {
        console.error("Error fetching data:", error);
        showToast('Failed to fetch data.', 'error');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { 
      fetchStudents(false); 
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.schoolId]);

  // MAP CLASSES TO STUDENTS
  const enrolledClassesMap = useMemo(() => {
    const map = new Map();
    for (const student of allStudents) {
      const classes = allClasses
        .filter(cls => Array.isArray(cls.studentIds) && cls.studentIds.includes(student.id))
        .map(cls => cls.name).sort();
      map.set(student.id, classes);
    }
    return map;
  }, [allStudents, allClasses]);

  // FILTER LOGIC
  const filteredStudents = useMemo(() => {
    const lowerName = filters.name.toLowerCase();
    return allStudents
      .filter(student => {
        if (filters.class && !(enrolledClassesMap.get(student.id) || []).includes(filters.class.name)) return false;
        if (filters.grade !== 'All' && (student.gradeLevel || 'N/A') !== filters.grade) return false;
        return `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowerName);
      })
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [allStudents, filters, enrolledClassesMap]);
  
  // HANDLERS (Optimized with useCallback)
  const handleFilterChange = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value, ...(key === 'grade' ? { class: null } : {}) })), []);
  
  const handleClearFilters = useCallback(() => { 
      setFilters({ name: '', grade: 'All', class: null }); // fixed to reset name too or keep as desired
      setIsFilterOpen(false); 
      showToast('Filters cleared', 'success'); 
  }, [showToast]);
  
  const handleSelectStudent = useCallback((id) => {
      setSelectedStudentIds(prev => { 
          const n = new Set(prev); 
          n.has(id) ? n.delete(id) : n.add(id); 
          return n; 
      });
  }, []);

  const handleEditClick = useCallback((user) => {
      setSelectedUser(user);
      setIsEditUserModalOpen(true);
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id));
    setSelectedStudentIds(prev => {
        const n = new Set(prev);
        filteredStudents.forEach(s => allSelected ? n.delete(s.id) : n.add(s.id));
        return n;
    });
  }, [filteredStudents, selectedStudentIds]);
  
  const isAllPageSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id));
  const activeFilterCount = (filters.grade !== 'All' ? 1 : 0) + (filters.class ? 1 : 0);

  // UPDATE USER HANDLER
  const handleUpdateUser = useCallback(async (arg1, arg2) => {
    let uid, data;
    if (typeof arg1 === 'string') {
        uid = arg1;
        data = arg2;
    } else {
        uid = selectedUser?.id;
        data = arg1;
    }

    try { 
        await firestoreService.updateUserDetails(uid, data); 
        showToast('Updated!', 'success'); 
        setIsEditUserModalOpen(false); 
        
        setAllStudents(prev => prev.map(s => s.id === uid ? { ...s, ...data } : s));
    } catch (e) { 
        showToast(e.message, 'error'); 
    }
  }, [firestoreService, showToast, selectedUser]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-visible font-sans space-y-5 relative z-10 p-1">
        
        {/* --- FIXED HEADER --- */}
        <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full md:w-auto">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                  <div className={`p-2 rounded-2xl ${theme.iconBg} ${theme.accentText}`}>
                      <GraduationCap size={28} />
                  </div>
                  Students
              </h1>
              
              <div className="flex items-center justify-between md:block mt-2 md:mt-1">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    Manage enrollment. <span className={`ml-2 px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300`}>{filteredStudents.length} Loaded</span>
                  </p>

                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    disabled={selectedStudentIds.size === 0}
                    className={`md:hidden flex items-center gap-2 font-bold text-white px-4 py-2 rounded-[1rem] shadow-lg bg-gradient-to-r ${theme.accentGradient} active:scale-95 transition-all text-xs ml-4 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <UserPlus size={16} strokeWidth={2.5} />
                    <span>Add {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}</span>
                  </button>
              </div>
            </div>
            
            <button
              onClick={() => setIsImportModalOpen(true)}
              disabled={selectedStudentIds.size === 0}
              className={`hidden md:flex items-center gap-2 font-bold text-white px-6 py-3 rounded-[1.5rem] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed bg-gradient-to-r ${theme.accentGradient}`}
            >
              <UserPlus size={18} strokeWidth={2.5} />
              <span>Add to Class {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}</span>
            </button>
        </div>

        {/* --- FIXED TOOLBAR (Glassmorphism) --- */}
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-none p-2 rounded-[1.8rem] bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm flex items-center justify-between gap-3 relative z-40"
        >
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search loaded students..."
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-[1.4rem] bg-slate-100/50 dark:bg-black/20 border-none text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-black/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
            </div>
            <div className="relative">
                <button
                    onClick={() => setIsFilterOpen(prev => !prev)}
                    className={`
                        flex items-center gap-2 px-4 py-3 rounded-[1.4rem] font-bold text-xs transition-all active:scale-95
                        ${isFilterOpen || activeFilterCount > 0 
                            ? `${theme.lightBg} ${theme.accentText} shadow-sm ring-1 ring-black/5` 
                            : 'bg-slate-100/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10'}
                    `}
                >
                    <ListFilter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filter</span>
                    {activeFilterCount > 0 && <span className={`w-5 h-5 flex items-center justify-center rounded-full ${theme.accentBg} text-white text-[9px]`}>{activeFilterCount}</span>}
                </button>
                {isFilterOpen && <FilterPopup allClasses={allClasses} filters={filters} onFilterChange={handleFilterChange} onClose={() => setIsFilterOpen(false)} onClear={handleClearFilters} theme={theme} />}
            </div>
        </motion.div>

        {/* --- SCROLLABLE CONTENT AREA --- */}
        <div className={`
            flex-1 min-h-0 rounded-[2.5rem] 
            bg-white/40 dark:bg-[#121212]/40 backdrop-blur-3xl backdrop-saturate-150
            border border-white/40 dark:border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] dark:shadow-none
            overflow-hidden flex flex-col relative
        `}>
            {loading && allStudents.length === 0 ? (
                <StudentTableSkeleton />
            ) : (
                <>
                    {/* DESKTOP TABLE Wrapper */}
                    <div className="hidden md:block flex-1 overflow-y-auto custom-scrollbar relative">
                        <table className="min-w-full text-sm border-separate border-spacing-0">
                            {/* STICKY TABLE HEADER */}
                            <thead className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-[#1A1D24]/90 shadow-sm supports-[backdrop-filter]:bg-white/60">
                                <tr>
                                    <th className="px-6 py-5 w-16 border-b border-slate-100 dark:border-white/5 first:rounded-tl-[2rem]">
                                        <div className="relative flex items-center justify-center w-5 h-5 mx-auto">
                                            <input
                                                type="checkbox"
                                                checked={isAllPageSelected}
                                                onChange={handleSelectAll}
                                                className={`peer appearance-none w-5 h-5 rounded-full border-2 transition-all cursor-pointer border-slate-300 dark:border-slate-600 ${theme.checkbox}`}
                                            />
                                            <CheckCircleIcon className="absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 text-white" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-5 text-left font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-white/5">STUDENT NAME</th>
                                    <th className="px-6 py-5 text-left font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-white/5">GRADE</th>
                                    <th className="px-6 py-5 text-left font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-white/5">CLASSES</th>
                                    <th className="px-6 py-5 text-right font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-white/5 last:rounded-tr-[2rem]">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map(user => (
                                        <StudentDesktopRow 
                                            key={user.id} 
                                            user={user} 
                                            enrolledClasses={enrolledClassesMap.get(user.id) || []}
                                            onEdit={handleEditClick} 
                                            isSelected={selectedStudentIds.has(user.id)}
                                            onSelect={handleSelectStudent}
                                            theme={theme}
                                        />
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="text-center py-32 text-slate-400 font-medium">No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                        
                        {/* LOAD MORE BUTTON (Desktop) */}
                        {hasMore && (
                            <div className="p-6 flex justify-center">
                                <button
                                    onClick={() => fetchStudents(true)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ChevronDown size={16} />}
                                    Load More Students
                                </button>
                            </div>
                        )}
                    </div>

                    {/* MOBILE LIST Wrapper */}
                    <div className="md:hidden flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                         {filteredStudents.length > 0 && (
                            <div className="flex items-center gap-3 px-5 py-4 bg-white/80 dark:bg-[#1e1e1e]/90 backdrop-blur-xl rounded-[1.5rem] mb-4 border border-white/20 dark:border-white/5 sticky top-0 z-20 shadow-sm">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <input
                                        type="checkbox"
                                        checked={isAllPageSelected}
                                        onChange={handleSelectAll}
                                        className={`peer appearance-none w-5 h-5 rounded-full border-2 transition-all cursor-pointer border-slate-300 dark:border-slate-600 ${theme.checkbox}`}
                                    />
                                    <CheckCircleIcon className="absolute w-5 h-5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100" />
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Select All ({filteredStudents.length})</span>
                            </div>
                        )}
                        {filteredStudents.map(user => (
                            <StudentMobileCard 
                                key={user.id} 
                                user={user} 
                                enrolledClasses={enrolledClassesMap.get(user.id) || []}
                                onEdit={handleEditClick} 
                                isSelected={selectedStudentIds.has(user.id)}
                                onSelect={handleSelectStudent}
                                theme={theme}
                            />
                        ))}
                        
                        {/* LOAD MORE BUTTON (Mobile) */}
                        {hasMore && (
                            <div className="py-6 flex justify-center">
                                <button
                                    onClick={() => fetchStudents(true)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ChevronDown size={16} />}
                                    Load More
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

      {/* Modals */}
      {isEditUserModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onSubmit={handleUpdateUser}
          onUpdatePassword={async (uid, pwd) => { await firestoreService.updateUserPassword(uid, pwd); showToast('Password updated', 'success'); }}
          onClose={() => { setIsEditUserModalOpen(false); setSelectedUser(null); }}
        />
      )}
      {isImportModalOpen && (
        <ImportToClassModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          allClasses={allClasses}
          allStudents={allStudents}
          selectedStudentIds={Array.from(selectedStudentIds)}
          firestoreService={firestoreService}
          showToast={showToast}
          onImportSuccess={() => { setSelectedStudentIds(new Set()); setIsImportModalOpen(false); fetchStudents(false); }}
          userProfile={userProfile} 
        />
      )}
    </div>
  );
};

export default StudentManagementView;