// src/components/teacher/StudentManagementView.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext'; // Check this path
import { useToast } from '../../../../contexts/ToastContext'; // Check this path
import {
  Cog,
  Search,
  UserPlus,
  X,
} from 'lucide-react';

import Spinner from '../../../common/Spinner';
import EditUserModal from '../../../admin/EditUserModal'; // Check this path
import ImportToClassModal from './ImportToClassModal'; // Make sure this path is correct

// Helper component for the table row, makes it responsive
const StudentRow = ({ user, enrolledClasses, onEdit, onSelect, isSelected }) => {
  return (
    <>
      {/* ==================================
        MOBILE CARD VIEW (default)
        ================================== */}
      {/* --- MODIFIED: Added dark mode classes --- */}
      <div className="block md:hidden p-3 mb-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
        {/* Top: Name and Actions */}
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              // --- MODIFIED: Added dark mode classes ---
              className="mt-1 h-4 w-4 rounded border-gray-400 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
            />
            <div className="mb-1.5">
              {/* --- MODIFIED: Added dark mode classes --- */}
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{user.gradeLevel || 'N/A'}</div>
            </div>
          </div>
          <button
            onClick={onEdit}
            // --- MODIFIED: Added dark mode classes ---
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
            title="Edit User"
          >
            <Cog size={18} />
          </button>
        </div>

        {/* Bottom: Enrolled Classes */}
        {/* --- MODIFIED: Added dark mode classes --- */}
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
      {/* --- MODIFIED: Added dark mode classes --- */}
      <tr className={`hidden md:table-row ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
        <td className="px-4 py-3 text-center">
          <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              // --- MODIFIED: Added dark mode classes ---
              className="h-5 w-5 rounded border-gray-400 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
            />
        </td>
        {/* --- MODIFIED: Added dark mode classes --- */}
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
            // --- MODIFIED: Added dark mode classes ---
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

// --- MAIN COMPONENT ---
const StudentManagementView = () => {
  const { firestoreService, userProfile } = useAuth(); // Get userProfile
  const { showToast } = useToast();

  // Data State
  const [allStudents, setAllStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Selection State
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [classFilterSearch, setClassFilterSearch] = useState('');
  const [selectedFilterClass, setSelectedFilterClass] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [isClassFilterOpen, setIsClassFilterOpen] = useState(false); // <-- NEW STATE
  
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

  // --- MODIFICATION: Shows all classes, filters as user types ---
  const classFilterOptions = useMemo(() => {
    const lowerSearch = classFilterSearch.toLowerCase();
    // This searches ALL classes
    return allClasses.filter(cls => cls.name.toLowerCase().includes(lowerSearch));
  }, [allClasses, classFilterSearch]);
  
  const filteredStudents = useMemo(() => {
    const lowerStudentSearch = studentSearchTerm.toLowerCase();
    return allStudents
      .filter(student => {
        if (selectedFilterClass) {
          const enrolled = enrolledClassesMap.get(student.id) || [];
          if (!enrolled.includes(selectedFilterClass.name)) {
            return false;
          }
        }
        return `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowerStudentSearch);
      })
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [allStudents, studentSearchTerm, selectedFilterClass, enrolledClassesMap]);

  // --- 3. EVENT HANDLERS ---

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
    // --- MODIFIED: Added dark mode classes ---
    <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              {/* --- MODIFIED: Added dark mode classes --- */}
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Students
              </h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Manage all active student accounts.
              </p>
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        {/* --- MODIFIED: Added dark mode classes --- */}
        <div className="mb-6 p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Table Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Class Filter Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by any class..."
                value={selectedFilterClass ? selectedFilterClass.name : classFilterSearch}
                onFocus={() => setIsClassFilterOpen(true)}
                onBlur={() => setTimeout(() => setIsClassFilterOpen(false), 150)}
                onChange={(e) => {
                  setClassFilterSearch(e.target.value);
                  setSelectedFilterClass(null);
                  setIsClassFilterOpen(true);
                }}
                disabled={!!selectedFilterClass}
                // --- MODIFIED: Added dark mode classes ---
                className="w-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-800 dark:text-slate-100 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500"
              />
              {/* --- MODIFIED: Added dark mode classes --- */}
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
              {selectedFilterClass && (
                <button 
                  onClick={() => {
                    setSelectedFilterClass(null); 
                    setClassFilterSearch('');
                  }}
                  // --- MODIFIED: Added dark mode classes ---
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                >
                  <X size={18} />
                </button>
              )}
              
              {isClassFilterOpen && classFilterOptions.length > 0 && !selectedFilterClass && (
                // --- MODIFIED: Added dark mode classes ---
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg max-h-60 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-700">
                  {classFilterOptions.map(cls => (
                    <div 
                      key={cls.id} 
                      // --- MODIFIED: Added dark mode classes ---
                      className="px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-800 dark:text-slate-100 cursor-pointer"
                      onClick={() => {
                        setSelectedFilterClass(cls);
                        setClassFilterSearch('');
                        setIsClassFilterOpen(false);
                      }}
                    >
                      {cls.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by student name..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                // --- MODIFIED: Added dark mode classes ---
                className="w-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-800 dark:text-slate-100 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500"
              />
              {/* --- MODIFIED: Added dark mode classes --- */}
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* --- IMPORT BUTTON --- */}
          {/* --- MODIFIED: Added dark mode classes --- */}
          <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
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
        
        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96">
            <Spinner />
            {/* --- MODIFIED: Added dark mode classes --- */}
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-semibold">Fetching student data...</p>
          </div>
        ) : (
          // --- MODIFIED: Added dark mode classes ---
          <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  {/* --- MODIFIED: Added dark mode classes --- */}
                  <tr className="text-slate-600 dark:text-slate-400">
                    <th className="px-4 py-3 text-center w-16">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAll}
                        disabled={filteredStudents.length === 0}
                        // --- MODIFIED: Added dark mode classes ---
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
                {/* --- MODIFIED: Added dark mode classes --- */}
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
                      {/* --- MODIFIED: Added dark mode classes --- */}
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
                // --- MODIFIED: Added dark mode classes ---
                <div className="flex items-center gap-3 px-2 py-3 border-b-2 border-slate-200 dark:border-slate-700 mb-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleSelectAll}
                    // --- MODIFIED: Added dark mode classes ---
                    className="h-5 w-5 rounded border-gray-400 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-700"
                  />
                  <label 
                    // --- MODIFIED: Added dark mode classes ---
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
                // --- MODIFIED: Added dark mode classes ---
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

      {/* --- IMPORT MODAL --- */}
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
          userProfile={userProfile} // <-- Pass the user profile
        />
      )}
    </div>
  );
};

export default StudentManagementView;