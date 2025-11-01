import React, { useState, useMemo } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import Spinner from '../../../common/Spinner'; // Adjust path as needed

const ImportToClassModal = ({
  isOpen,
  onClose,
  allClasses,
  allStudents,
  selectedStudentIds,
  firestoreService,
  showToast,
  onImportSuccess,
  userProfile // <-- RECEIVE THE USER PROFILE
}) => {
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    // --- THIS IS THE CORRECTED LOGIC ---
    // Filter to ONLY the classes handled by the current user (admin or teacher).
    let classesToShow = allClasses.filter(cls => cls.teacherId === userProfile.id);
    // --- END OF LOGIC ---

    return classesToShow.filter(cls => {
      // Must match search term
      const matchesSearch = cls.name.toLowerCase().includes(lowerSearch);
      
      // If validation is valid, must also match grade level
      if (validation.valid) {
        const classGrade = cls.gradeLevel || 'Unassigned';
        return matchesSearch && classGrade === validation.grade;
      }

      // This part is for the mixed-grade-level error, which is correct.
      return false;
    });
  }, [allClasses, classSearchTerm, validation, userProfile]); // Added userProfile

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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 font-sans">
      <div className="relative bg-neumorphic-base rounded-3xl shadow-neumorphic p-6 w-full max-w-lg flex flex-col" style={{ minHeight: '400px', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            Add to Class
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full shadow-neumorphic hover:shadow-neumorphic-inset transition-all"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search your classes..." // <-- Updated placeholder
            value={classSearchTerm}
            onChange={(e) => setClassSearchTerm(e.target.value)}
            className="w-full bg-neumorphic-base shadow-neumorphic-inset text-slate-800 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            autoFocus
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>

        {/* Content Area (Class List or Error) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {!validation.valid ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
              <h3 className="font-semibold text-slate-700">Import Blocked</h3>
              <p className="text-sm text-slate-500">{validation.error}</p>
            </div>
          ) : availableClasses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2 px-1">
                {/* Updated text to be more general */}
                Showing your classes matching grade: <span className="font-semibold">{validation.grade}</span>
              </p>
              {availableClasses.map(cls => (
                <label 
                  key={cls.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                    selectedClass?.id === cls.id 
                    ? 'bg-indigo-100 shadow-neumorphic-inset' 
                    : 'bg-neumorphic-base hover:shadow-neumorphic-inset'
                  }`}
                >
                  <input
                    type="radio"
                    name="class-selection"
                    checked={selectedClass?.id === cls.id}
                    onChange={() => setSelectedClass(cls)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />

                  <span className="ml-3 font-medium text-slate-700">{cls.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-slate-500">
                {/* Updated text to be more general */}
                No classes you handle were found matching your search or grade level (<span className="font-semibold">{validation.grade}</span>).
              </p>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-semibold text-slate-700 bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedClass || isSubmitting}
            className="px-5 py-2 rounded-xl font-semibold text-white bg-indigo-600 shadow-lg shadow-indigo-500/40 hover:bg-indigo-700 transition-all disabled:bg-slate-400 disabled:shadow-none"
          >
            {isSubmitting ? <Spinner size="sm" /> : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportToClassModal;

