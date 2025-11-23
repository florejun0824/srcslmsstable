import React, { useState, useEffect } from 'react';
import { 
  PencilSquareIcon, 
  XMarkIcon, 
  VideoCameraIcon, 
  BookOpenIcon, 
  AcademicCapIcon, 
  ChevronDownIcon 
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';

// --- MACOS 26 DESIGN CONSTANTS ---
const inputWrapperStyle = "relative group";
const inputIconStyle = "absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5 transition-colors group-focus-within:text-blue-500";
const inputStyle = `
  w-full pl-12 pr-4 py-3.5 
  bg-slate-50/50 dark:bg-black/20 
  border border-slate-200/80 dark:border-white/10 
  rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 
  placeholder:text-slate-400 
  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent 
  transition-all duration-300
`;

// Dropdown specific style to handle the APK visual mess
const selectStyle = `
  ${inputStyle} 
  appearance-none cursor-pointer
`;

const gradeLevels = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
];

const EditClassModal = ({ isOpen, onClose, classData, onUpdate, courses = [] }) => {
  const [editedName, setEditedName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && classData) {
      setEditedName(classData.name || '');
      setSelectedSubjectId(classData.subjectId || '');
      setSelectedGradeLevel(classData.gradeLevel || '');
      setMeetLink(classData.meetLink || '');
      setIsSubmitting(false);
    }
  }, [isOpen, classData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    let finalMeetLink = meetLink.trim();

    try {
      if (!finalMeetLink) {
        showToast("A persistent Google Meet link is required.", "error");
        setIsSubmitting(false);
        return;
      }
      
      if (!finalMeetLink.startsWith("https://meet.google.com/")) {
        showToast("Please enter a valid Google Meet URL (https://meet.google.com/...)", "warning");
        setIsSubmitting(false);
        return;
      }
      
      await onUpdate(classData.id, {
        name: editedName,
        subjectId: selectedSubjectId,
        gradeLevel: selectedGradeLevel,
        meetLink: finalMeetLink,
      });
      
      showToast("Class updated successfully!", "success");
      onClose();
    } catch (error) {
      console.error("Failed to update class:", error);
      showToast(`Failed to update class: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !classData) return null;

  return (
    // 1. BACKDROP: Heavy blur and slight tint
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* 2. WINDOW: Glassmorphism container */}
      <div className="relative w-full max-w-lg transform overflow-hidden 
                      bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] 
                      rounded-[2rem] shadow-2xl shadow-black/20 dark:shadow-black/50 
                      ring-1 ring-white/40 dark:ring-white/5 
                      flex flex-col transition-all duration-300 scale-100 opacity-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5">
          <div>
            <h2 className="text-xl font-display font-bold tracking-tight text-slate-800 dark:text-white">
              Edit Class
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              {classData.name}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Class Name */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Class Name
              </label>
              <div className="relative">
                <PencilSquareIcon className={inputIconStyle} />
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={isSubmitting}
                  className={inputStyle}
                  placeholder="e.g. Science 101"
                />
              </div>
            </div>

            {/* Subject Dropdown - Fixed for Mobile/APK */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Subject
              </label>
              <div className="relative">
                <BookOpenIcon className={inputIconStyle} />
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={isSubmitting}
                  className={selectStyle}
                >
                  <option value="">No Subject Assigned</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {/* Custom Chevron to replace ugly native one */}
                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Grade Level Dropdown - Fixed for Mobile/APK */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Grade Level
              </label>
              <div className="relative">
                <AcademicCapIcon className={inputIconStyle} />
                <select
                  value={selectedGradeLevel}
                  onChange={(e) => setSelectedGradeLevel(e.target.value)}
                  disabled={isSubmitting}
                  className={selectStyle}
                >
                  <option value="">Select Grade Level</option>
                  {gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Google Meet Link */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1 flex justify-between">
                <span>Google Meet Link</span>
                <span className="text-red-500 text-[10px] font-normal normal-case">* Required</span>
              </label>
              <div className="relative">
                <VideoCameraIcon className={inputIconStyle} />
                <input
                  type="url"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  disabled={isSubmitting}
                  className={inputStyle}
                  placeholder="https://meet.google.com/..."
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 ml-1 leading-relaxed">
                Paste the permanent Meet link generated from your Google Calendar or Classroom.
              </p>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-full text-sm font-semibold text-slate-600 dark:text-slate-300 
                       bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10
                       hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="relative px-8 py-2.5 rounded-full text-sm font-semibold text-white 
                       bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
                       shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)]
                       border-t border-white/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditClassModal;