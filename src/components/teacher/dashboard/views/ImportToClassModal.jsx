// src/components/teacher/StudentManagementView/ImportToClassModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, AlertCircle, GraduationCap, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Spinner Component (Inline for simplicity or import)
const Spinner = ({ size = "sm" }) => {
    const dims = size === "sm" ? "w-4 h-4" : "w-6 h-6";
    return <div className={`${dims} border-2 border-white border-t-transparent rounded-full animate-spin`}></div>
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
    
    // Filter to ONLY the classes handled by the current user
    let classesToShow = allClasses.filter(cls => cls.teacherId === userProfile.id);

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
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-[99999] p-4 font-sans" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative glass-panel bg-white/95 dark:bg-slate-900/95 rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg flex flex-col border border-white/40 dark:border-white/10 max-h-[80vh]"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200/50 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl shadow-sm">
                                <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Import Students
                                </h2>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    Select a Destination Class
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
                        >
                            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search your classes..."
                            value={classSearchTerm}
                            onChange={(e) => setClassSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition-all shadow-inner"
                            autoFocus
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1 min-h-[200px]">
                        {!validation.valid ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-80">
                                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Import Unavailable</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">{validation.error}</p>
                            </div>
                        ) : availableClasses.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
                                    Matching Grade: <span className="text-indigo-600 dark:text-indigo-400">{validation.grade}</span>
                                </p>
                                {availableClasses.map(cls => (
                                    <div 
                                        key={cls.id}
                                        onClick={() => setSelectedClass(cls)}
                                        className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                                            selectedClass?.id === cls.id 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30 shadow-md' 
                                            : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/5'
                                        }`}
                                    >
                                        <span className={`font-bold text-sm transition-colors ${selectedClass?.id === cls.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {cls.name}
                                        </span>
                                        
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedClass?.id === cls.id
                                            ? 'border-indigo-500 bg-indigo-500 text-white'
                                            : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                                        }`}>
                                            {selectedClass?.id === cls.id && <CheckCircle size={14} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                    No classes found for grade <span className="font-bold text-slate-700 dark:text-slate-300">{validation.grade}</span>.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/50 dark:border-white/5 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={!selectedClass || isSubmitting}
                            className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            {isSubmitting ? <Spinner /> : 'Confirm Import'}
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>,
    document.body
  );
};

export default ImportToClassModal;