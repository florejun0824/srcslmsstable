// src/components/teacher/StudentManagementView.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext'; 
import { useToast } from '../../../../contexts/ToastContext'; 
import {
  Cog,
  Search,
  UserPlus,
  X,
  Filter, 
  ChevronDown,
  ChevronsUpDown,
  CheckIcon,
  ListFilter,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import EditUserModal from '../../../admin/EditUserModal'; 
import ImportToClassModal from './ImportToClassModal'; 
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';

// --- SKELETAL LOADING COMPONENT (Optimized: Solid BG) ---
const StudentTableSkeleton = () => (
  <div className="flex-1 bg-white dark:bg-[#1A1D24] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col p-4 animate-pulse">
    <div className="hidden md:flex items-center gap-4 mb-4 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700"></div>
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      <div className="flex-1"></div>
      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
    </div>
    <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
           <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>
           <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="md:hidden h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
           </div>
           <div className="hidden md:block w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
           <div className="hidden md:block w-48 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
           <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>
        </div>
      ))}
    </div>
  </div>
);

// --- STUDENT ROW (Visuals Updated) ---
const StudentRow = ({ user, enrolledClasses, onEdit, onSelect, isSelected }) => {
  return (
    <>
      {/* MOBILE CARD VIEW */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`block md:hidden relative p-4 mb-3 rounded-[2rem] border shadow-sm overflow-hidden transition-all duration-300
            ${isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 ring-1 ring-indigo-500/20' 
                : 'bg-white dark:bg-[#1A1D24] border-slate-200 dark:border-slate-700'}`}
      >
        {/* Card Header */}
        <div className="flex items-start gap-3.5">
            <div className="pt-1">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    className="h-5 w-5 rounded-lg border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-offset-0 focus:ring-indigo-500 dark:bg-slate-800 cursor-pointer"
                />
            </div>

            <div className="flex-1 flex gap-3">
                {/* FIX: Wrapped Avatar in a ringed, overflow-hidden container to prevent bleed/glitch */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <UserInitialsAvatar 
                        user={user} 
                        size="full" 
                        className="w-full h-full text-sm"
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight truncate pr-2">
                                {user.firstName} {user.lastName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                                    {user.gradeLevel || 'N/A'}
                                </span>
                            </div>
                        </div>
                        
                        <button
                            onClick={onEdit}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                        >
                            <Cog size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-4 pl-9"> 
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {enrolledClasses.length > 0 ? (
                    enrolledClasses.map(className => (
                    <span 
                        key={className} 
                        className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30 whitespace-nowrap"
                    >
                        {className}
                    </span>
                    ))
                ) : (
                    <span className="text-xs text-slate-400 italic pl-1">No active classes</span>
                )}
            </div>
        </div>
      </motion.div>

      {/* DESKTOP TABLE ROW */}
      <motion.tr 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`hidden md:table-row transition-colors border-b border-slate-100 dark:border-slate-800 last:border-none group ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
      >
        <td className="px-6 py-4 text-center w-16">
          <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="h-5 w-5 rounded-md border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 cursor-pointer"
            />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-3">
                {/* FIX: Wrapped Avatar in a ringed, overflow-hidden container */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <UserInitialsAvatar user={user} size="full" className="w-full h-full text-xs font-bold" />
                </div>
                <span className="font-bold text-slate-800 dark:text-white">{user.firstName} {user.lastName}</span>
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                {user.gradeLevel || 'N/A'}
            </span>
        </td>
        <td className="px-6 py-4">
          {enrolledClasses.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
                {enrolledClasses.slice(0, 3).map(className => (
                    <span key={className} className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {className}
                    </span>
                ))}
                {enrolledClasses.length > 3 && (
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 self-center">+{enrolledClasses.length - 3} more</span>
                )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <button
            onClick={onEdit}
            className="p-2 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
          >
            <Cog size={18} />
          </button>
        </td>
      </motion.tr>
    </>
  );
};


// --- CUSTOM SELECT ---
const CustomSelect = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);
    const selectedLabel = options.find(opt => opt.value === value)?.label || options[0].label;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={selectRef}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl flex justify-between items-center text-left text-sm font-medium hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
                <span>{selectedLabel}</span>
                <ChevronsUpDown className="w-4 h-4 text-slate-400" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1"
                    >
                        {options.map(option => (
                            <li
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="flex items-center justify-between p-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            >
                                <span>{option.label}</span>
                                {value === option.value && (
                                    <CheckIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                )}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};


// --- FILTER POPUP (Solid Background) ---
const FilterPopup = ({
  allClasses,
  filters,
  onFilterChange,
  onClose, // Passed but logic moved to parent
  onClear
}) => {
  const [classSearch, setClassSearch] = useState('');
  const [isClassSearchOpen, setIsClassSearchOpen] = useState(false);
  
  // Note: We removed the internal click-outside logic here 
  // because the parent now controls closing when clicking outside the container.

  const availableClasses = useMemo(() => {
    const lowerSearch = classSearch.toLowerCase();
    return allClasses.filter(cls => {
      if (filters.grade !== 'All') {
        if (cls.gradeLevel !== filters.grade) return false;
      }
      return cls.name.toLowerCase().includes(lowerSearch);
    });
  }, [allClasses, classSearch, filters.grade]);

  const gradeLevelOptions = [
    { value: 'All', label: 'All Grades' },
    { value: 'Grade 7', label: 'Grade 7' },
    { value: 'Grade 8', label: 'Grade 8' },
    { value: 'Grade 9', label: 'Grade 9' },
    { value: 'Grade 10', label: 'Grade 10' },
    { value: 'Grade 11', label: 'Grade 11' },
    { value: 'Grade 12', label: 'Grade 12' },
    { value: 'N/A', label: 'N/A' },
  ];

  return (
    <>
        {/* Mobile Backdrop */}
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />

        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-24 left-4 right-4 z-50 md:absolute md:top-14 md:left-0 md:right-auto md:w-80 bg-white dark:bg-[#1A1D24] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700"
        >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Filters</h3>
                <button 
                    onClick={onClear}
                    className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"
                >
                    <Trash2 size={12} />
                    Clear
                </button>
            </div>
            <div className="p-4 space-y-4">
                {/* Grade Filter */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                        By Grade
                    </label>
                    <CustomSelect
                        value={filters.grade}
                        onChange={(value) => onFilterChange('grade', value)}
                        options={gradeLevelOptions}
                    />
                </div>

                {/* Class Filter */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                        By Class
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={filters.grade !== 'All' ? `Search ${filters.grade} classes...` : "Search classes..."}
                            value={filters.class ? filters.class.name : classSearch}
                            onFocus={() => setIsClassSearchOpen(true)}
                            onBlur={() => setTimeout(() => setIsClassSearchOpen(false), 150)}
                            onChange={(e) => {
                                setClassSearch(e.target.value);
                                onFilterChange('class', null);
                                setIsClassSearchOpen(true); 
                            }}
                            disabled={!!filters.class}
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all disabled:opacity-60"
                        />
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        {filters.class && (
                            <button 
                                onClick={() => onFilterChange('class', null)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                        
                        {isClassSearchOpen && !filters.class && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl max-h-40 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-700 p-1">
                                {availableClasses.length > 0 ? (
                                    availableClasses.map(cls => (
                                        <div 
                                            key={cls.id} 
                                            className="px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                                            onMouseDown={() => {
                                                onFilterChange('class', cls);
                                                setClassSearch('');
                                                setIsClassSearchOpen(false);
                                            }}
                                        >
                                            {cls.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-xs text-slate-500 italic text-center">No classes found.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2.5 font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition-all"
                >
                    Apply Filters
                </button>
            </div>
        </motion.div>
    </>
  );
};


// --- MAIN COMPONENT ---
const StudentManagementView = () => {
  const { firestoreService, userProfile } = useAuth();
  const { showToast } = useToast();

  // Ref for the Filter Button Container to detect outside clicks
  const filterContainerRef = useRef(null);

  const [allStudents, setAllStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: '',
    grade: 'All',
    class: null,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // --- FIX: Handle Outside Click for Filter ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If filter is open, and click is NOT inside the filter container
      if (isFilterOpen && filterContainerRef.current && !filterContainerRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [users, classes] = await Promise.all([
        firestoreService.getAllUsers(),
        firestoreService.getAllClasses()
      ]);
      setAllStudents(users.filter(u => u.role === 'student' && !u.isRestricted));
      setAllClasses(classes);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast('Failed to fetch data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const enrolledClassesMap = useMemo(() => {
    const map = new Map();
    for (const student of allStudents) {
      const classes = allClasses
        .filter(cls => Array.isArray(cls.studentIds) && cls.studentIds.includes(student.id))
        .map(cls => cls.name)
        .sort();
      map.set(student.id, classes);
    }
    return map;
  }, [allStudents, allClasses]);

  const filteredStudents = useMemo(() => {
    const lowerName = filters.name.toLowerCase();
    return allStudents
      .filter(student => {
        if (filters.class) {
          const enrolled = enrolledClassesMap.get(student.id) || [];
          if (!enrolled.includes(filters.class.name)) return false;
        }
        if (filters.grade !== 'All') {
          if ((student.gradeLevel || 'N/A') !== filters.grade) return false;
        }
        return `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowerName);
      })
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [allStudents, filters, enrolledClassesMap]);
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      if (key === 'grade') newFilters.class = null; 
      return newFilters;
    });
  };

  const handleClearFilters = () => {
      setFilters({
          name: filters.name, 
          grade: 'All',
          class: null
      });
      setIsFilterOpen(false);
      showToast('Filters cleared', 'success');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.grade !== 'All') count++;
    if (filters.class) count++;
    return count;
  }, [filters]);

  const handleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) newSet.delete(studentId);
      else newSet.add(studentId);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditUserModalOpen(false);
    setSelectedUser(null);
  };

  const handleUpdateUser = async (updates) => {
    try {
      await firestoreService.updateUserDetails(selectedUser.id, updates);
      showToast('Student updated successfully!', 'success');
      handleCloseModal();
      fetchData();
    } catch (error) {
      showToast(`Failed to update student: ${error.message}`, 'error');
    }
  };

  const handleUpdatePassword = async (userId, newPassword) => {
    try {
      await firestoreService.updateUserPassword(userId, newPassword);
      showToast('Password updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update password.', 'error');
    }
  };
  
  const handleImportSuccess = () => {
    fetchData();
    setSelectedStudentIds(new Set());
    setIsImportModalOpen(false);
  };
  
  const allVisibleSelected = filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length;

  return (
    <div className="flex flex-col h-full font-sans space-y-6 p-1 lg:p-0 relative z-10">
      
        {/* Header Section */}
        <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2"
        >
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Students
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Manage enrollment and student profiles.
              </p>
            </div>
        </motion.header>

        {/* Toolbar (Control Center Style - Solid) */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#1A1D24] p-2 rounded-[1.25rem] border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col md:flex-row gap-2 items-center justify-between relative z-50"
        >
            {/* Integrated Search & Filter Group */}
            <div className="flex flex-1 w-full gap-2">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search students by name..."
                        value={filters.name}
                        onChange={(e) => handleFilterChange('name', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all shadow-inner"
                    />
                </div>

                {/* Filter Toggle Button & Popup Wrapper */}
                {/* FIX: Added filterContainerRef here to capture clicks inside the button OR popup */}
                <div className="relative" ref={filterContainerRef}>
                    <button
                        onClick={() => setIsFilterOpen(prev => !prev)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all h-full font-bold text-xs
                            ${isFilterOpen || activeFilterCount > 0 
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <ListFilter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] font-bold shadow-sm">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {isFilterOpen && (
                            <FilterPopup
                                allClasses={allClasses}
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onClose={() => setIsFilterOpen(false)}
                                onClear={handleClearFilters} 
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Primary Action */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              disabled={selectedStudentIds.size === 0}
              className="w-full md:w-auto flex justify-center items-center gap-2.5 font-bold text-white px-6 py-3.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 ring-1 ring-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]"
            >
              <div className="bg-white/20 rounded-full p-1">
                <UserPlus size={16} />
              </div>
              <span className="whitespace-nowrap">Add {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''} to Class</span>
            </button>
        </motion.div>
        
        {/* Table / Content Area (Solid Background) */}
		<div className="flex-1 overflow-hidden flex flex-col min-h-0 relative z-0">
            {loading ? (
                <StudentTableSkeleton />
            ) : (
            <div className="flex-1 bg-white dark:bg-[#1A1D24] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar flex-1">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4 text-center w-16">
                        <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={handleSelectAll}
                            disabled={filteredStudents.length === 0}
                            className="h-5 w-5 rounded-md border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 cursor-pointer"
                        />
                        </th>
                        <th className="px-6 py-4 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Name</th>
                        <th className="px-6 py-4 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Grade</th>
                        <th className="px-6 py-4 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Classes</th>
                        <th className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Edit</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-transparent">
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map(user => (
                        <StudentRow 
                            key={user.id} 
                            user={user} 
                            enrolledClasses={enrolledClassesMap.get(user.id) || []}
                            onEdit={() => handleEditClick(user)} 
                            isSelected={selectedStudentIds.has(user.id)}
                            onSelect={() => handleSelectStudent(user.id)}
                        />
                        ))
                    ) : (
                        <tr>
                        <td colSpan="5" className="text-center text-slate-500 dark:text-slate-400 py-16 font-medium">
                            No students found matching your filters.
                        </td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>

                {/* Mobile List */}
                <div className="block md:hidden flex-1 overflow-y-auto p-4 custom-scrollbar">
                {filteredStudents.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 border border-slate-200 dark:border-slate-700">
                    <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAll}
                        className="h-5 w-5 rounded-md border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label 
                        className="font-bold text-slate-700 dark:text-slate-200 text-sm"
                        onClick={handleSelectAll}
                    >
                        Select All ({filteredStudents.length})
                    </label>
                    </div>
                )}
                
                {filteredStudents.length > 0 ? (
                    <div className="space-y-2">
                        {filteredStudents.map(user => (
                        <StudentRow 
                            key={user.id} 
                            user={user} 
                            enrolledClasses={enrolledClassesMap.get(user.id) || []}
                            onEdit={() => handleEditClick(user)} 
                            isSelected={selectedStudentIds.has(user.id)}
                            onSelect={() => handleSelectStudent(user.id)}
                        />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-12 font-medium">
                    No students found.
                    </div>
                )}
                </div>
            </div>
            )}
		</div>

      {/* Modals */}
      {isEditUserModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onSubmit={handleUpdateUser}
          onUpdatePassword={handleUpdatePassword}
          onClose={handleCloseModal}
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
          onImportSuccess={handleImportSuccess}
          userProfile={userProfile} 
        />
      )}
    </div>
  );
};

export default StudentManagementView;