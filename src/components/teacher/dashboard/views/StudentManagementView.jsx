// src/components/teacher/StudentManagementView.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext'; // Check this path
import { useToast } from '../../../../contexts/ToastContext'; // Check this path
import {
  Cog,
  Search,
  UserPlus,
  X,
  Filter, 
  ChevronDown,
  ChevronsUpDown,
  CheckIcon,
} from 'lucide-react';
// --- NEW: Added framer-motion import ---
import { motion, AnimatePresence } from 'framer-motion';

import Spinner from '../../../common/Spinner';
import EditUserModal from '../../../admin/EditUserModal'; // Check this path
import ImportToClassModal from './ImportToClassModal'; // Make sure this path is correct

// ... (StudentRow component remains unchanged) ...
const StudentRow = ({ user, enrolledClasses, onEdit, onSelect, isSelected }) => {
  return (
    <>
      {/* ==================================
        MOBILE CARD VIEW (default)
        ================================== */}
      <div className="block md:hidden p-3 mb-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
        {/* Top: Name and Actions */}
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="mt-1 h-4 w-4 rounded border-gray-400 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
            />
            <div className="mb-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{user.gradeLevel || 'N/A'}</div>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
            title="Edit User"
          >
            <Cog size={18} />
          </button>
        </div>

        {/* Bottom: Enrolled Classes */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Enrolled Classes:</div>
          {enrolledClasses.length > 0 ? (
            enrolledClasses.map(className => (
              <div key={className} className="text-xs text-slate-500 dark:text-slate-400 truncate">{className}</div>
            ))
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500 italic">No classes</div>
          )}
        </div>
      </div>

      {/* ==================================
        DESKTOP TABLE ROW (md:table-row)
        ================================== */}
      <tr className={`hidden md:table-row ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
        <td className="px-4 py-3 text-center">
          <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="h-5 w-5 rounded border-gray-400 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
            />
        </td>
        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
          {user.firstName} {user.lastName}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 capitalize">
          {user.gradeLevel || 'N/A'}
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
          {enrolledClasses.length > 0 ? (
            enrolledClasses.map(className => (
              <div key={className} className="truncate">{className}</div>
            ))
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">No classes</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <button
            onClick={onEdit}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
            title="Edit User"
          >
            <Cog size={18} />
          </button>
        </td>
      </tr>
    </>
  );
};


// --- [NEW] Custom Select Component ---
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
                className="w-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl flex justify-between items-center text-left"
            >
                <span className="font-medium">{selectedLabel}</span>
                <ChevronsUpDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 top-full mt-2 w-full max-h-48 overflow-y-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2"
                    >
                        {options.map(option => (
                            <li
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="flex items-center justify-between p-2 rounded-lg text-slate-800 dark:text-slate-100 font-medium cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            >
                                <span>{option.label}</span>
                                {value === option.value && (
                                    <CheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                )}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};


// --- MODIFIED: Filter Popup Component ---
const FilterPopup = ({
  allClasses,
  filters,
  onFilterChange,
  onClose,
}) => {
  const [classSearch, setClassSearch] = useState('');
  const [isClassSearchOpen, setIsClassSearchOpen] = useState(false);
  const popupRef = useRef(null);

  // Close popup if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const availableClasses = useMemo(() => {
    const lowerSearch = classSearch.toLowerCase();
    
    return allClasses.filter(cls => {
      // 1. Grade Level Check
      if (filters.grade !== 'All') {
        if (cls.gradeLevel !== filters.grade) {
          return false;
        }
      }
      
      // 2. Search Text Check
      return cls.name.toLowerCase().includes(lowerSearch);
    });
    
  }, [allClasses, classSearch, filters.grade]);

  // --- NEW: Defined options for the CustomSelect ---
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
    <div 
      ref={popupRef} 
      className="absolute top-14 left-0 z-20 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-scale-in"
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Filters</h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Name Filter */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Filter by Name
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by student name..."
              value={filters.name}
              onChange={(e) => onFilterChange('name', e.target.value)}
              className="w-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-800 dark:text-slate-100 px-4 py-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500"
            />
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* --- MODIFIED: Replaced <select> with <CustomSelect> --- */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Filter by Grade
          </label>
          <CustomSelect
            value={filters.grade}
            onChange={(value) => onFilterChange('grade', value)}
            options={gradeLevelOptions}
          />
        </div>

        {/* Class Filter */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Filter by Class
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={filters.grade !== 'All' ? `Search ${filters.grade} classes...` : "Search all classes..."}
              value={filters.class ? filters.class.name : classSearch}
              onFocus={() => setIsClassSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsClassSearchOpen(false), 150)}
              onChange={(e) => {
                setClassSearch(e.target.value);
                onFilterChange('class', null);
                setIsClassSearchOpen(true); 
              }}
              disabled={!!filters.class}
              className="w-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-800 dark:text-slate-100 px-4 py-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500"
            />
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
            {filters.class && (
              <button 
                onClick={() => onFilterChange('class', null)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
              >
                <X size={18} />
              </button>
            )}
            
            {isClassSearchOpen && !filters.class && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-40 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-700">
                {availableClasses.length > 0 ? (
                  availableClasses.map(cls => (
                    <div 
                      key={cls.id} 
                      className="px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-800 dark:text-slate-100 cursor-pointer"
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
                  <div className="px-4 py-2 text-slate-500 dark:text-slate-400 italic">No classes found.</div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
      <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 font-semibold text-sm text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
        >
          Done
        </button>
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---
const StudentManagementView = () => {
  const { firestoreService, userProfile } = useAuth();
  const { showToast } = useToast();

  // Data State
  const [allStudents, setAllStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Selection State
  const [filters, setFilters] = useState({
    name: '',
    grade: 'All',
    class: null,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  
  // Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // --- 1. DATA FETCHING ---
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
  }, []); // Runs once on mount

  // --- 2. DATA PROCESSING & FILTERING ---

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
        // Filter by Class
        if (filters.class) {
          const enrolled = enrolledClassesMap.get(student.id) || [];
          if (!enrolled.includes(filters.class.name)) {
            return false;
          }
        }
        
        // Filter by Grade
        if (filters.grade !== 'All') {
          const studentGrade = student.gradeLevel || 'N/A';
          if (studentGrade !== filters.grade) {
            return false;
          }
        }

        // Filter by Name
        return `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowerName);
      })
      // Default Sort: Alphabetical by last name
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [allStudents, filters, enrolledClassesMap]);
  
  // --- 3. EVENT HANDLERS ---
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      if (key === 'grade') {
        newFilters.class = null; 
      }
      
      return newFilters;
    });
  };

  // Count active filters to show on the button
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.name) count++;
    if (filters.grade !== 'All') count++;
    if (filters.class) count++;
    return count;
  }, [filters]);

  const handleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
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
  
  // --- 4. RENDER ---
  const allVisibleSelected = filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length;

  return (
    <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Students
              </h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Manage all active student accounts.
              </p>
            </div>
          </div>
        </header>

        {/* --- MODIFIED: Simplified Filter Bar --- */}
        <div className="mb-6 p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Filter Button */}
            <div className="relative w-full md:w-auto">
              <button
                onClick={() => setIsFilterOpen(prev => !prev)}
                className="w-full md:w-auto flex items-center justify-center gap-2 font-semibold bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all"
              >
                <Filter size={18} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              
              {isFilterOpen && (
                <FilterPopup
                  allClasses={allClasses}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClose={() => setIsFilterOpen(false)}
                />
              )}
            </div>

            {/* Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              disabled={selectedStudentIds.size === 0}
              className="w-full md:w-auto flex justify-center items-center gap-2 font-semibold bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-5 py-3 rounded-xl shadow-lg hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              <UserPlus size={18} />
              Add ({selectedStudentIds.size}) Student(s) to Class...
            </button>
          </div>
        </div>
        
        {/* ... (Content Area, Table, Modals all remain unchanged) ... */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96">
            <Spinner />
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-semibold">Fetching student data...</p>
          </div>
        ) : (
          <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-slate-600 dark:text-slate-400">
                    <th className="px-4 py-3 text-center w-16">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAll}
                        disabled={filteredStudents.length === 0}
                        className="h-5 w-5 rounded border-gray-400 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
                        title="Select all visible students"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Student Name</th>
                    <th className="px-4 py-3 text-left">Grade</th>
                    <th className="px-4 py-3 text-left">Enrolled Classes</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                      <td colSpan="5" className="text-center text-slate-500 dark:text-slate-400 py-12">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="block md:hidden p-4">
              {filteredStudents.length > 0 && (
                <div className="flex items-center gap-3 px-2 py-3 border-b-2 border-slate-200 dark:border-slate-700 mb-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleSelectAll}
                    className="h-5 w-5 rounded border-gray-400 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
                  />
                  <label 
                    className="font-semibold text-slate-700 dark:text-slate-200"
                    onClick={handleSelectAll}
                  >
                    Select all ({filteredStudents.length})
                  </label>
                </div>
              )}
              
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
                <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                  No students found matching your criteria.
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

      {/* Animation Style */}
      <style>{`
        @keyframes scaleIn { 
          from { opacity: 0; transform: scale(0.95); } 
          to { opacity: 1; transform: scale(1); } 
        }
        .animate-scale-in { 
          animation: scaleIn 0.2s ease-out forwards; 
          transform-origin: top left; 
        }
      `}</style>
    </div>
  );
};

export default StudentManagementView;