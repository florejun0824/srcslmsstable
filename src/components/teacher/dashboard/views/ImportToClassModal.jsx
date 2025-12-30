// src/components/teacher/StudentManagementView/ImportToClassModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, AlertCircle, GraduationCap, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../../contexts/ThemeContext'; // Ensure this path is correct for your project structure

// Spinner Component
const Spinner = ({ size = "sm", colorClass = "border-white" }) => {
    const dims = size === "sm" ? "w-4 h-4" : "w-6 h-6";
    return <div className={`${dims} border-2 ${colorClass} border-t-transparent rounded-full animate-spin`}></div>
};

// --- ONE UI + MONET THEME HELPER ---
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas':
            return {
                accentBg: 'bg-red-600',
                accentGradient: 'from-red-600 to-green-700',
                accentText: 'text-red-600',
                lightBg: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-200 dark:border-red-800',
                ring: 'focus:ring-red-500',
                iconBg: 'bg-red-100 dark:bg-red-900/40',
                selectionBorder: 'border-red-500'
            };
        case 'valentines':
            return {
                accentBg: 'bg-pink-600',
                accentGradient: 'from-pink-500 to-rose-600',
                accentText: 'text-pink-600',
                lightBg: 'bg-pink-50 dark:bg-pink-900/20',
                border: 'border-pink-200 dark:border-pink-800',
                ring: 'focus:ring-pink-500',
                iconBg: 'bg-pink-100 dark:bg-pink-900/40',
                selectionBorder: 'border-pink-500'
            };
        case 'cyberpunk':
            return {
                accentBg: 'bg-fuchsia-600',
                accentGradient: 'from-purple-600 to-pink-600',
                accentText: 'text-fuchsia-400',
                lightBg: 'bg-fuchsia-900/20',
                border: 'border-fuchsia-500/50',
                ring: 'focus:ring-fuchsia-500',
                iconBg: 'bg-fuchsia-900/40',
                selectionBorder: 'border-fuchsia-400'
            };
        case 'ocean':
        case 'rainy':
            return {
                accentBg: 'bg-cyan-600',
                accentGradient: 'from-cyan-600 to-blue-700',
                accentText: 'text-cyan-600',
                lightBg: 'bg-cyan-50 dark:bg-cyan-900/20',
                border: 'border-cyan-200 dark:border-cyan-800',
                ring: 'focus:ring-cyan-500',
                iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
                selectionBorder: 'border-cyan-500'
            };
        default: // Default Blue/Indigo
            return {
                accentBg: 'bg-indigo-600',
                accentGradient: 'from-indigo-600 to-blue-600',
                accentText: 'text-indigo-600',
                lightBg: 'bg-indigo-50 dark:bg-indigo-900/20',
                border: 'border-indigo-200 dark:border-indigo-800',
                ring: 'focus:ring-indigo-500',
                iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
                selectionBorder: 'border-indigo-500'
            };
    }
};

const ImportToClassModal = ({
  isOpen,
  onClose,
  allClasses,
  allStudents,
  selectedStudentIds,
  firestoreService,
  showToast,
  onImportSuccess,
  userProfile 
}) => {
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { activeOverlay } = useTheme();
  const theme = getThemeStyles(activeOverlay);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (event) => {
        if (event.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 1. Determine the grade level of the selected students
  const validation = useMemo(() => {
    if (selectedStudentIds.length === 0) {
      return { valid: false, grade: null, error: 'No students selected.' };
    }

    const firstStudentId = selectedStudentIds[0];
    const firstStudent = allStudents.find(s => s.id === firstStudentId);
    if (!firstStudent) {
      return { valid: false, grade: null, error: 'Could not find student data.' };
    }

    const targetGrade = firstStudent.gradeLevel || 'Unassigned';

    for (let i = 1; i < selectedStudentIds.length; i++) {
      const student = allStudents.find(s => s.id === selectedStudentIds[i]);
      const studentGrade = student?.gradeLevel || 'Unassigned';
      if (studentGrade !== targetGrade) {
        return { 
          valid: false, 
          grade: null, 
          error: `Students must all be from the same grade level to import.` 
        };
      }
    }
    
    return { valid: true, grade: targetGrade, error: null };
  }, [selectedStudentIds, allStudents]);

  // 2. Filter the list of classes
  const availableClasses = useMemo(() => {
    const lowerSearch = classSearchTerm.toLowerCase();
    
    // Define the effective school ID for the user (default to srcs_main)
    const effectiveUserSchoolId = userProfile?.schoolId || 'srcs_main';

    // Filter classes
    let classesToShow = allClasses.filter(cls => {
        // A. Must be taught by this teacher
        if (cls.teacherId !== userProfile?.id) return false;

        // B. School ID Check with Fallback
        // If class has no schoolId, assume 'srcs_main'.
        const classSchoolId = cls.schoolId || 'srcs_main';
        
        return classSchoolId === effectiveUserSchoolId;
    });

    return classesToShow.filter(cls => {
      const matchesSearch = cls.name.toLowerCase().includes(lowerSearch);
      if (validation.valid) {
        const classGrade = cls.gradeLevel || 'Unassigned';
        return matchesSearch && classGrade === validation.grade;
      }
      return false;
    });
  }, [allClasses, classSearchTerm, validation, userProfile]);

  // 3. Handle the final import
  const handleImport = async () => {
    if (!selectedClass || !validation.valid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    const studentObjectsToImport = allStudents
      .filter(s => selectedStudentIds.includes(s.id))
      .map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName }));

    try {
      await firestoreService.addStudentsToClass(
        selectedClass.id,
        selectedStudentIds,
        studentObjectsToImport
      );
      
      showToast(`Successfully added ${studentObjectsToImport.length} student(s) to ${selectedClass.name}.`, "success");
      onImportSuccess();
    } catch (error) {
      console.error("Error importing students:", error);
      showToast(`Import failed: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-center z-[99999] p-4 font-sans" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className={`
                        relative w-full max-w-lg max-h-[85vh] flex flex-col
                        bg-white/80 dark:bg-[#121212]/80 
                        backdrop-blur-3xl backdrop-saturate-150
                        rounded-[2.5rem] 
                        border border-white/40 dark:border-white/10
                        shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2),inset_0_0_0_1px_rgba(255,255,255,0.4)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.05)]
                    `}
                >
                    {/* --- HEADER --- */}
                    <div className="flex-none p-8 pb-4">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-3.5 rounded-[1.2rem] shadow-sm ${theme.iconBg}`}>
                                    <GraduationCap className={`w-7 h-7 ${theme.accentText}`} strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                        Import Students
                                    </h2>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 opacity-80">
                                        Select a destination class
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90 text-slate-500 dark:text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Input (OneUI Fluid Style) */}
                        <div className="relative group">
                            <div className={`absolute inset-0 rounded-[1.5rem] opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none ring-2 ${theme.ring} ring-opacity-50`} />
                            <input
                                type="text"
                                placeholder="Search classes..."
                                value={classSearchTerm}
                                onChange={(e) => setClassSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-slate-100/70 dark:bg-black/20 border-none text-[15px] font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-black/40 transition-all shadow-inner"
                                autoFocus
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* --- SCROLLABLE CONTENT --- */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 min-h-[240px]">
                        {!validation.valid ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-70">
                                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="w-10 h-10 text-red-500" />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Import Unavailable</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">{validation.error}</p>
                            </div>
                        ) : availableClasses.length > 0 ? (
                            <div className="space-y-3 pb-4">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        Available Classes
                                    </p>
                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${theme.lightBg} ${theme.accentText}`}>
                                        {validation.grade}
                                    </span>
                                </div>
                                
                                {availableClasses.map(cls => (
                                    <div 
                                        key={cls.id}
                                        onClick={() => setSelectedClass(cls)}
                                        className={`
                                            group flex items-center justify-between p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300
                                            border active:scale-[0.98]
                                            ${selectedClass?.id === cls.id 
                                                ? `${theme.lightBg} ${theme.selectionBorder} shadow-lg ring-1 ${theme.ring.replace('focus:', '')}` 
                                                : 'bg-white/40 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/5'
                                            }
                                        `}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`text-[15px] font-bold transition-colors ${selectedClass?.id === cls.id ? theme.accentText : 'text-slate-700 dark:text-slate-200'}`}>
                                                {cls.name}
                                            </span>
                                            {cls.section && (
                                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                                    {cls.section}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className={`
                                            w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-300
                                            ${selectedClass?.id === cls.id
                                                ? `${theme.accentBg} border-transparent text-white scale-110 shadow-md`
                                                : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                                            }
                                        `}>
                                            {selectedClass?.id === cls.id && <CheckCircle size={14} fill="currentColor" className="text-white" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                <div className={`w-16 h-16 rounded-[1.5rem] ${theme.lightBg} flex items-center justify-center mb-4`}>
                                    <Search className={`w-8 h-8 ${theme.accentText} opacity-50`} />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-[200px]">
                                    No classes found for grade <span className={`font-bold ${theme.accentText}`}>{validation.grade}</span>.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="flex-none p-8 pt-4">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 rounded-[1.5rem] font-bold text-[15px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={!selectedClass || isSubmitting}
                                className={`
                                    flex-[2] py-4 rounded-[1.5rem] font-bold text-[15px] text-white 
                                    bg-gradient-to-r ${theme.accentGradient}
                                    shadow-xl shadow-black/5
                                    hover:shadow-2xl hover:scale-[1.02] active:scale-[0.97] 
                                    transition-all duration-300 
                                    disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400 disabled:scale-100
                                    flex items-center justify-center gap-2
                                `}
                            >
                                {isSubmitting ? <Spinner /> : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>,
    document.body
  );
};

export default ImportToClassModal;