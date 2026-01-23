// src/components/teacher/StudentManagementView/ImportToClassModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, AlertTriangle, GraduationCap, Check, Users, ArrowRight, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../../contexts/ThemeContext';

// --- SPINNER COMPONENT ---
const Spinner = ({ size = "sm" }) => {
    const dims = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    return (
        <svg className={`${dims} animate-spin text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
};

// --- THEME UTILITIES ---
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas':
            return {
                accentBg: 'bg-red-600',
                accentGradient: 'from-red-600 to-rose-700',
                accentText: 'text-red-600',
                lightBg: 'bg-red-50 dark:bg-red-900/10',
                border: 'border-red-200 dark:border-red-900',
                ring: 'focus:ring-red-500',
                activeBorder: 'border-red-500',
                badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
            };
        case 'valentines':
            return {
                accentBg: 'bg-pink-600',
                accentGradient: 'from-pink-500 to-rose-600',
                accentText: 'text-pink-600',
                lightBg: 'bg-pink-50 dark:bg-pink-900/10',
                border: 'border-pink-200 dark:border-pink-900',
                ring: 'focus:ring-pink-500',
                activeBorder: 'border-pink-500',
                badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200'
            };
        case 'cyberpunk':
            return {
                accentBg: 'bg-fuchsia-600',
                accentGradient: 'from-fuchsia-600 to-purple-700',
                accentText: 'text-fuchsia-500',
                lightBg: 'bg-fuchsia-50 dark:bg-fuchsia-900/10',
                border: 'border-fuchsia-200 dark:border-fuchsia-900',
                ring: 'focus:ring-fuchsia-500',
                activeBorder: 'border-fuchsia-500',
                badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200'
            };
        default: // Indigo
            return {
                accentBg: 'bg-indigo-600',
                accentGradient: 'from-indigo-600 to-blue-700',
                accentText: 'text-indigo-600',
                lightBg: 'bg-indigo-50 dark:bg-indigo-900/10',
                border: 'border-indigo-200 dark:border-indigo-900',
                ring: 'focus:ring-indigo-500',
                activeBorder: 'border-indigo-500',
                badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
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
  const theme = useMemo(() => getThemeStyles(activeOverlay), [activeOverlay]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (event) => {
        if (event.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 1. Validation Logic
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
          error: `Mixed grade levels detected. All selected students must belong to the same grade level to be imported together.` 
        };
      }
    }
    
    return { valid: true, grade: targetGrade, error: null };
  }, [selectedStudentIds, allStudents]);

  // 2. Filter Classes
  const availableClasses = useMemo(() => {
    const lowerSearch = classSearchTerm.toLowerCase();
    const effectiveUserSchoolId = userProfile?.schoolId || 'srcs_main';

    let classesToShow = allClasses.filter(cls => {
        if (cls.teacherId !== userProfile?.id) return false;
        const classSchoolId = cls.schoolId || 'srcs_main';
        return classSchoolId === effectiveUserSchoolId;
    });

    return classesToShow.filter(cls => {
      const matchesSearch = cls.name.toLowerCase().includes(lowerSearch);
      if (validation.valid) {
        // Strict grade matching
        const classGrade = cls.gradeLevel || 'Unassigned';
        return matchesSearch && classGrade === validation.grade;
      }
      return false;
    });
  }, [allClasses, classSearchTerm, validation, userProfile]);

  // 3. Import Action
  const handleImport = async () => {
    if (!selectedClass || !validation.valid || isSubmitting) return;

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
      
      showToast(`Successfully enrolled ${studentObjectsToImport.length} students in ${selectedClass.name}.`, "success");
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
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-end sm:items-center z-[99999] p-0 sm:p-4 font-sans" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className={`
                        relative w-full max-w-xl max-h-[90vh] flex flex-col
                        bg-white dark:bg-[#121212]
                        rounded-t-[2rem] sm:rounded-[2rem]
                        shadow-2xl overflow-hidden
                    `}
                >
                    {/* --- HEADER --- */}
                    <div className="flex-none p-6 pb-2 border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-md z-10">
                        <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                    Select Destination Class
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Where should these students be enrolled?
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* CONTEXT PILL (Summary of Selection) */}
                        <div className={`flex items-center gap-3 p-3 rounded-2xl ${validation.valid ? theme.lightBg : 'bg-red-50 dark:bg-red-900/10'} transition-colors`}>
                            {validation.valid ? (
                                <>
                                    <div className={`p-2 rounded-xl bg-white dark:bg-white/10 shadow-sm ${theme.accentText}`}>
                                        <Users size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Moving</span>
                                        <span className={`text-sm font-bold ${theme.accentText}`}>
                                            {selectedStudentIds.length} Students • {validation.grade}
                                        </span>
                                    </div>
                                    <div className="ml-auto">
                                        <ArrowRight size={16} className={theme.accentText} />
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 text-red-600 dark:text-red-400 w-full">
                                    <AlertTriangle size={18} />
                                    <span className="text-xs font-bold">{validation.error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- SEARCH --- */}
                    {validation.valid && (
                        <div className="flex-none px-6 py-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 dark:group-focus-within:text-slate-200 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search your classes..."
                                    value={classSearchTerm}
                                    onChange={(e) => setClassSearchTerm(e.target.value)}
                                    className={`
                                        w-full pl-10 pr-4 py-3 rounded-xl 
                                        bg-slate-50 dark:bg-black/20 
                                        border border-slate-200 dark:border-white/10
                                        text-sm font-semibold text-slate-800 dark:text-slate-100 
                                        placeholder:text-slate-400 
                                        focus:outline-none focus:bg-white dark:focus:bg-black/30 focus:ring-2 ${theme.ring} focus:border-transparent
                                        transition-all
                                    `}
                                />
                            </div>
                        </div>
                    )}

                    {/* --- CLASS LIST (Scrollable) --- */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 min-h-[200px] pb-4">
                        {!validation.valid ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                                <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-sm font-medium text-slate-400">Selection Error</p>
                            </div>
                        ) : availableClasses.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2.5">
                                {availableClasses.map(cls => {
                                    const isSelected = selectedClass?.id === cls.id;
                                    return (
                                        <div 
                                            key={cls.id}
                                            onClick={() => setSelectedClass(cls)}
                                            className={`
                                                relative flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200
                                                border-2
                                                ${isSelected 
                                                    ? `${theme.lightBg} ${theme.activeBorder} shadow-sm` 
                                                    : 'bg-white dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center 
                                                    ${isSelected ? 'bg-white dark:bg-white/10' : 'bg-slate-100 dark:bg-white/5'}
                                                    transition-colors
                                                `}>
                                                    <BookOpen size={18} className={isSelected ? theme.accentText : 'text-slate-400'} />
                                                </div>
                                                <div>
                                                    <h4 className={`text-sm font-bold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {cls.name}
                                                    </h4>
                                                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                                        {cls.section || 'No Section'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Radio Indicator */}
                                            <div className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                                ${isSelected ? `${theme.accentBg} border-transparent` : 'border-slate-300 dark:border-slate-600'}
                                            `}>
                                                {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                    No classes found for <span className={`font-bold ${theme.accentText}`}>{validation.grade}</span>.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER ACTION --- */}
                    <div className="flex-none p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#121212] z-20">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={!selectedClass || isSubmitting}
                                className={`
                                    flex-[2] py-3.5 rounded-xl font-bold text-sm text-white 
                                    bg-gradient-to-r ${theme.accentGradient}
                                    shadow-lg shadow-black/5
                                    hover:shadow-xl hover:brightness-105 active:scale-[0.98] 
                                    transition-all duration-200 
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                                    flex items-center justify-center gap-2
                                `}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Confirm Import</span>
                                        {selectedClass && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{selectedStudentIds.length}</span>}
                                    </>
                                )}
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