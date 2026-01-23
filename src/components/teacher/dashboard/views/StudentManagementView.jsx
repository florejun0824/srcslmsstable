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
  Loader2,
  MoreHorizontal,
  Filter,
  Users
} from 'lucide-react';
import { CheckCircleIcon } from '@heroicons/react/24/solid'; 
import { motion, AnimatePresence } from 'framer-motion';

import EditUserModal from '../../../admin/EditUserModal'; 
import ImportToClassModal from './ImportToClassModal'; 
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';

// --- THEME UTILITIES (Optimized for Dark Mode) ---
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas':
            return {
                accentBg: 'bg-red-600',
                accentGradient: 'from-red-600 to-green-700',
                accentText: 'text-red-500',
                selectionRing: 'ring-red-500',
                // Stronger glow for dark mode
                accentShadow: 'shadow-red-500/50', 
                checkbox: 'checked:bg-red-600 checked:border-red-600',
                chipActive: 'bg-red-600 text-white shadow-[0_0_15px_-3px_rgba(220,38,38,0.4)]',
                chipInactive: 'bg-white/5 text-red-200 hover:bg-white/10'
            };
        case 'valentines':
            return {
                accentBg: 'bg-pink-600',
                accentGradient: 'from-pink-500 to-rose-600',
                accentText: 'text-pink-500',
                selectionRing: 'ring-pink-500',
                accentShadow: 'shadow-pink-500/50',
                checkbox: 'checked:bg-pink-600 checked:border-pink-600',
                chipActive: 'bg-pink-600 text-white shadow-[0_0_15px_-3px_rgba(219,39,119,0.4)]',
                chipInactive: 'bg-white/5 text-pink-200 hover:bg-white/10'
            };
        case 'cyberpunk':
            return {
                accentBg: 'bg-fuchsia-600',
                accentGradient: 'from-purple-600 to-pink-600',
                accentText: 'text-fuchsia-400',
                selectionRing: 'ring-fuchsia-500',
                accentShadow: 'shadow-fuchsia-500/50',
                checkbox: 'checked:bg-fuchsia-500 checked:border-fuchsia-500',
                chipActive: 'bg-fuchsia-600 text-white shadow-[0_0_15px_-3px_rgba(192,38,211,0.4)]',
                chipInactive: 'bg-white/5 text-fuchsia-200 hover:bg-white/10'
            };
        default: // Indigo/Blue (Default)
            return {
                accentBg: 'bg-indigo-600',
                accentGradient: 'from-indigo-600 to-blue-600',
                accentText: 'text-indigo-400',
                selectionRing: 'ring-indigo-500',
                accentShadow: 'shadow-indigo-500/50',
                checkbox: 'checked:bg-indigo-600 checked:border-indigo-600',
                chipActive: 'bg-indigo-600 text-white shadow-[0_0_15px_-3px_rgba(79,70,229,0.4)]',
                chipInactive: 'bg-white/5 text-slate-300 hover:bg-white/10'
            };
    }
};

// --- SUB-COMPONENTS ---

const SmartClassBadges = memo(({ classes, limit = 2 }) => {
    if (!classes || classes.length === 0) {
        return <span className="text-xs text-slate-500 italic opacity-60">Not Enrolled</span>;
    }

    const visibleClasses = classes.slice(0, limit);
    const remainingCount = classes.length - limit;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {visibleClasses.map(cls => (
                <span key={cls} className="text-[10px] font-bold px-2 py-1 rounded-md border bg-white/5 text-slate-300 border-white/10 whitespace-nowrap">
                    {cls}
                </span>
            ))}
            {remainingCount > 0 && (
                <div className="group relative">
                    <span className="cursor-help text-[10px] font-bold px-1.5 py-1 rounded-md bg-white/10 text-slate-400 whitespace-nowrap">
                        +{remainingCount}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-max max-w-[200px]">
                        <div className="bg-[#1e1e1e] text-slate-200 border border-white/10 text-[10px] p-2 rounded-lg shadow-xl">
                            {classes.slice(limit).join(', ')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

const QuickFilterChips = memo(({ currentGrade, onSelectGrade, theme }) => {
    const grades = ['All', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {grades.map(grade => {
                const isActive = currentGrade === grade;
                return (
                    <button
                        key={grade}
                        onClick={() => onSelectGrade(grade)}
                        className={`
                            px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300
                            ${isActive ? theme.chipActive : theme.chipInactive}
                        `}
                    >
                        {grade === 'All' ? 'All Grades' : grade}
                    </button>
                );
            })}
        </div>
    );
});

const StudentMobileCard = memo(({ user, enrolledClasses, onEdit, onSelect, isSelected, theme }) => {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
                relative p-4 mb-3 rounded-3xl border transition-all duration-300
                ${isSelected 
                    ? `bg-[#1A1D24] border-transparent ring-1 ${theme.selectionRing} shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]` 
                    : 'bg-[#1e1e1e]/60 border-white/5 shadow-sm'
                }
            `}
            onClick={() => onSelect(user.id)}
        >
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 shadow-sm border border-white/5">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <UserInitialsAvatar user={user} size="full" className="w-full h-full text-sm font-bold" />
                        )}
                    </div>
                    {isSelected && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${theme.accentBg} flex items-center justify-center border-2 border-[#1A1D24]`}>
                            <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className={`font-bold text-base leading-tight ${isSelected ? theme.accentText : 'text-slate-100'}`}>
                                {user.lastName}, {user.firstName}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                {user.email}
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(user); }}
                            className="p-2 -mr-2 -mt-2 rounded-xl text-slate-400 hover:text-slate-200 active:bg-white/10 transition-colors"
                        >
                            <Cog size={18} />
                        </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-slate-300 border border-white/5">
                                 {user.gradeLevel || 'No Grade'}
                             </span>
                             <span className="text-[10px] font-medium text-slate-400">
                                 • {enrolledClasses.length} Classes
                             </span>
                         </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

const StudentDesktopRow = memo(({ user, enrolledClasses, onEdit, onSelect, isSelected, theme }) => {
    return (
        <tr 
            className={`
                group border-b border-white/5 last:border-none transition-colors cursor-pointer
                ${isSelected ? 'bg-indigo-900/10' : 'hover:bg-white/5'}
            `}
            onClick={() => onSelect(user.id)}
        >
            <td className="px-6 py-4 w-16 align-middle first:rounded-l-2xl">
                <div className="relative flex items-center justify-center w-5 h-5 mx-auto">
                    <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => onSelect(user.id)} 
                        className={`peer appearance-none w-5 h-5 rounded-lg border-2 transition-all cursor-pointer border-slate-600 ${theme.checkbox} bg-black/20`}
                    />
                    <CheckCircleIcon className="absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 text-white" />
                </div>
            </td>
            <td className="px-6 py-4 align-middle">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden relative shadow-sm flex-shrink-0 bg-slate-800 border border-white/5">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <UserInitialsAvatar user={user} size="full" className="w-full h-full text-xs font-bold" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-200 text-sm leading-tight">{user.lastName}, {user.firstName}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{user.email}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 align-middle">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-slate-400 border border-white/10 shadow-sm">
                    {user.gradeLevel || 'N/A'}
                </span>
            </td>
            <td className="px-6 py-4 align-middle max-w-xs">
                <SmartClassBadges classes={enrolledClasses} limit={2} />
            </td>
            <td className="px-6 py-4 text-right align-middle last:rounded-r-2xl">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(user); }}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 transition-all"
                >
                    <Cog size={18} />
                </button>
            </td>
        </tr>
    );
});

// --- FLOATING ACTION BAR ---
// FIXED: Dark Mode Optimized & Slimmer Profile
const FloatingActionBar = memo(({ count, onEnroll, onClear, theme }) => {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-auto max-w-[90vw]"
        >
            <div className={`
                flex items-center gap-1.5 p-1 rounded-full 
                bg-[#0F0F11]/90 backdrop-blur-3xl 
                ring-1 ${theme.selectionRing || 'ring-indigo-500'} 
                shadow-[0_0_30px_-10px] ${theme.accentShadow || 'shadow-indigo-500/50'}
                border border-white/10
            `}>
                
                {/* 1. Counter Badge (Themed) */}
                <div className={`
                    flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-full 
                    ${theme.accentBg} text-white font-bold text-xs shadow-md
                `}>
                    {count}
                </div>

                {/* 2. "Selected" Label (Desktop Only) */}
                <span className="text-xs font-bold text-slate-300 hidden sm:inline px-1">
                    Selected
                </span>

                {/* Vertical Divider (Desktop Only) */}
                <div className="hidden sm:block h-3 w-px bg-white/10 mx-1" />

                {/* 3. Enroll Button (Gradient Theme) */}
                <button
                    onClick={onEnroll}
                    className={`
                        flex items-center gap-1.5 px-4 h-8 rounded-full 
                        bg-gradient-to-r ${theme.accentGradient} 
                        text-white text-xs font-bold tracking-wide 
                        shadow-md active:scale-95 transition-transform hover:brightness-110
                    `}
                >
                    <GraduationCap size={14} strokeWidth={2.5} />
                    <span>Enroll</span>
                </button>

                {/* 4. Close Button */}
                <button
                    onClick={onClear}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </motion.div>
    );
});

// --- MAIN COMPONENT ---
const StudentManagementView = () => {
  const { firestoreService, userProfile } = useAuth();
  const { showToast } = useToast();
  const { themeSettings } = useTheme();
  
  const theme = useMemo(() => getThemeStyles(themeSettings?.overlay), [themeSettings?.overlay]);

  // STATE
  const [allStudents, setAllStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // UI STATE
  const [filters, setFilters] = useState({ name: '', grade: 'All', class: null });
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
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
        setHasMore(!(!result.lastDoc || result.users.length < 20));

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

  // DERIVED STATE
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

  const filteredStudents = useMemo(() => {
    const lowerName = filters.name.toLowerCase();
    return allStudents
      .filter(student => {
        if (filters.grade !== 'All' && (student.gradeLevel || 'N/A') !== filters.grade) return false;
        return `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowerName);
      })
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [allStudents, filters, enrolledClassesMap]);
  
  // HANDLERS
  const handleFilterChange = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value })), []);
  
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

  const handleUpdateUser = useCallback(async (arg1, arg2) => {
    let uid, data;
    if (typeof arg1 === 'string') { uid = arg1; data = arg2; } else { uid = selectedUser?.id; data = arg1; }

    try { 
        await firestoreService.updateUserDetails(uid, data); 
        showToast('Updated!', 'success'); 
        setIsEditUserModalOpen(false); 
        setAllStudents(prev => prev.map(s => s.id === uid ? { ...s, ...data } : s));
    } catch (e) { showToast(e.message, 'error'); }
  }, [firestoreService, showToast, selectedUser]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden font-sans space-y-4 relative z-10 p-2 lg:p-4">
        
        {/* --- UNIFIED CONTROL DECK --- */}
        <div className="flex-none flex flex-col gap-4 bg-[#1A1D24]/60 backdrop-blur-2xl border border-white/5 shadow-sm rounded-[2rem] p-4 lg:p-5 relative z-40 transition-all">
            
            {/* Top Row: Search & Stats */}
            <div className="flex items-center gap-3">
                <div className={`relative flex-1 group transition-all duration-300 ${isSearchFocused ? 'scale-[1.01]' : ''}`}>
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isSearchFocused ? theme.accentText : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={filters.name}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        onChange={(e) => handleFilterChange('name', e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/20 border-none text-sm font-semibold text-slate-200 placeholder:text-slate-500 focus:outline-none focus:bg-black/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                </div>
                
                {/* Desktop Stat Badge */}
                <div className="hidden md:flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-300">
                        {filteredStudents.length} <span className="text-slate-500 font-medium">Students</span>
                    </span>
                </div>
            </div>

            {/* Bottom Row: Quick Filter Chips */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-slate-400 flex-shrink-0">
                    <Filter size={14} />
                </div>
                <div className="flex-1 overflow-hidden">
                    <QuickFilterChips 
                        currentGrade={filters.grade} 
                        onSelectGrade={(g) => handleFilterChange('grade', g)} 
                        theme={theme}
                    />
                </div>
            </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 min-h-0 rounded-[2.5rem] bg-[#121212]/40 backdrop-blur-3xl border border-white/5 overflow-hidden flex flex-col relative">
            {loading && allStudents.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className={`w-8 h-8 animate-spin ${theme.accentText}`} />
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE */}
                    <div className="hidden md:block flex-1 overflow-y-auto custom-scrollbar p-2">
                        <table className="min-w-full text-sm border-separate border-spacing-y-2">
                            <thead className="sticky top-0 z-30">
                                <tr>
                                    <th className="px-6 py-3 w-16">
                                        <div className="relative flex items-center justify-center w-5 h-5 mx-auto">
                                            <input
                                                type="checkbox"
                                                checked={isAllPageSelected}
                                                onChange={handleSelectAll}
                                                className={`peer appearance-none w-5 h-5 rounded-lg border-2 transition-all cursor-pointer border-slate-600 ${theme.checkbox} bg-black/20`}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left font-bold text-slate-500 text-[10px] uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-3 text-left font-bold text-slate-500 text-[10px] uppercase tracking-widest">Grade</th>
                                    <th className="px-6 py-3 text-left font-bold text-slate-500 text-[10px] uppercase tracking-widest">Enrolled Classes</th>
                                    <th className="px-6 py-3 text-right font-bold text-slate-500 text-[10px] uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
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
                                    <tr><td colSpan="5" className="text-center py-20 text-slate-400 font-medium">No students found matching your filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                        
                        {hasMore && (
                            <div className="p-6 flex justify-center">
                                <button onClick={() => fetchStudents(true)} className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300 hover:bg-white/10 transition-all">
                                    {loading ? <Loader2 className="animate-spin h-3 w-3" /> : <ChevronDown size={14} />}
                                    Load More
                                </button>
                            </div>
                        )}
                    </div>

                    {/* MOBILE LIST */}
                    <div className="md:hidden flex-1 overflow-y-auto p-4 custom-scrollbar">
                         {filteredStudents.length > 0 && (
                            <div className="flex items-center justify-between mb-4 px-2">
                                <button onClick={handleSelectAll} className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAllPageSelected ? theme.accentBg + ' border-transparent' : 'border-slate-600'}`}>
                                        {isAllPageSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                    </div>
                                    Select All
                                </button>
                                <span className="text-xs font-bold text-slate-400">{filteredStudents.length} Results</span>
                            </div>
                        )}
                        
                        <div className="space-y-3 pb-24">
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
                        </div>
                        
                        {hasMore && (
                            <div className="pb-24 pt-4 flex justify-center">
                                <button onClick={() => fetchStudents(true)} className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300">
                                    {loading ? <Loader2 className="animate-spin h-3 w-3" /> : <ChevronDown size={14} />}
                                    Load More
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

        {/* --- FLOATING ACTION BAR (Mobile & Desktop) --- */}
        <AnimatePresence>
            {selectedStudentIds.size > 0 && (
                <FloatingActionBar 
                    count={selectedStudentIds.size}
                    onEnroll={() => setIsImportModalOpen(true)}
                    onClear={() => setSelectedStudentIds(new Set())}
                    theme={theme}
                />
            )}
        </AnimatePresence>

        {/* --- MODALS --- */}
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