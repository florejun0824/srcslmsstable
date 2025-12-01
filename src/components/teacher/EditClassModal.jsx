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
import { useTheme } from '../../contexts/ThemeContext';

// --- MONET EFFECT HELPER ---
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas':
            return {
                modalBg: '#0f291e', 
                borderColor: 'rgba(34, 197, 94, 0.3)', 
                innerPanelBg: 'rgba(20, 83, 45, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#e2e8f0',
                accentText: '#86efac', 
            };
        case 'valentines':
            return {
                modalBg: '#2a0a12', 
                borderColor: 'rgba(244, 63, 94, 0.3)', 
                innerPanelBg: 'rgba(80, 7, 36, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#ffe4e6',
                accentText: '#fda4af', 
            };
        case 'graduation':
            return {
                modalBg: '#1a1600', 
                borderColor: 'rgba(234, 179, 8, 0.3)', 
                innerPanelBg: 'rgba(66, 32, 6, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#fefce8',
                accentText: '#fde047', 
            };
        case 'rainy':
            return {
                modalBg: '#0f172a', 
                borderColor: 'rgba(56, 189, 248, 0.3)', 
                innerPanelBg: 'rgba(30, 41, 59, 0.5)',
                inputBg: 'rgba(15, 23, 42, 0.5)',
                textColor: '#f1f5f9',
                accentText: '#7dd3fc', 
            };
        case 'cyberpunk':
            return {
                modalBg: '#180a2e', 
                borderColor: 'rgba(217, 70, 239, 0.4)', 
                innerPanelBg: 'rgba(46, 16, 101, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.4)',
                textColor: '#fae8ff',
                accentText: '#e879f9', 
            };
        case 'spring':
            return {
                modalBg: '#2a1a1f', 
                borderColor: 'rgba(244, 114, 182, 0.3)', 
                innerPanelBg: 'rgba(80, 20, 40, 0.3)',
                inputBg: 'rgba(0, 0, 0, 0.2)',
                textColor: '#fce7f3',
                accentText: '#f9a8d4', 
            };
        case 'space':
            return {
                modalBg: '#0b0f19', 
                borderColor: 'rgba(99, 102, 241, 0.3)', 
                innerPanelBg: 'rgba(17, 24, 39, 0.6)',
                inputBg: 'rgba(0, 0, 0, 0.5)',
                textColor: '#e0e7ff',
                accentText: '#a5b4fc', 
            };
        case 'none':
        default:
            return {
                modalBg: '#262a33', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                innerPanelBg: '#2b303b', 
                inputBg: '#20242c', 
                textColor: '#f1f5f9',
                accentText: '#cbd5e1', 
            };
    }
};

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
  
  // --- THEME HOOK ---
  const { activeOverlay } = useTheme();
  const themeStyles = getThemeStyles(activeOverlay);

  // --- STYLES ---
  const inputWrapperStyle = "relative group";
  const inputBaseStyle = `
    w-full pl-12 pr-4 py-3.5 
    border 
    rounded-2xl text-sm font-medium 
    placeholder:opacity-50
    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent 
    transition-all duration-300
  `;
  
  // Extruded button style for Cancel
  const btnExtruded = `
    shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.02)] 
    hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] 
    active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.02)]
  `;

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
    // 1. BACKDROP: Reduced blur
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* 2. WINDOW: Themed container */}
      <div 
        className="relative w-full max-w-lg transform overflow-hidden rounded-[2rem] shadow-2xl flex flex-col transition-all duration-300 scale-100 opacity-100 border"
        style={{ 
            backgroundColor: themeStyles.modalBg, 
            borderColor: themeStyles.borderColor 
        }}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: themeStyles.borderColor }}>
          <div>
            <h2 className="text-xl font-display font-bold tracking-tight" style={{ color: themeStyles.textColor }}>
              Edit Class
            </h2>
            <p className="text-xs font-medium uppercase tracking-wider mt-1 opacity-70" style={{ color: themeStyles.textColor }}>
              {classData.name}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: themeStyles.textColor }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Class Name */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 ml-1 opacity-60" style={{ color: themeStyles.textColor }}>
                Class Name
              </label>
              <div className="relative">
                <PencilSquareIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors group-focus-within:text-blue-500" style={{ color: themeStyles.accentText }} />
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={isSubmitting}
                  className={inputBaseStyle}
                  style={{ 
                    backgroundColor: themeStyles.inputBg, 
                    color: themeStyles.textColor,
                    borderColor: 'transparent' // Neumorphic style relies on bg/shadow usually, or clear border
                  }}
                  placeholder="e.g. Science 101"
                />
              </div>
            </div>

            {/* Subject Dropdown */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 ml-1 opacity-60" style={{ color: themeStyles.textColor }}>
                Subject
              </label>
              <div className="relative">
                <BookOpenIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors group-focus-within:text-blue-500" style={{ color: themeStyles.accentText }} />
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={isSubmitting}
                  className={`${inputBaseStyle} appearance-none cursor-pointer`}
                  style={{ 
                    backgroundColor: themeStyles.inputBg, 
                    color: themeStyles.textColor,
                    borderColor: 'transparent'
                  }}
                >
                  <option value="" className="bg-gray-800">No Subject Assigned</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id} className="bg-gray-800">
                      {course.title}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" style={{ color: themeStyles.textColor }} />
              </div>
            </div>

            {/* Grade Level Dropdown */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 ml-1 opacity-60" style={{ color: themeStyles.textColor }}>
                Grade Level
              </label>
              <div className="relative">
                <AcademicCapIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors group-focus-within:text-blue-500" style={{ color: themeStyles.accentText }} />
                <select
                  value={selectedGradeLevel}
                  onChange={(e) => setSelectedGradeLevel(e.target.value)}
                  disabled={isSubmitting}
                  className={`${inputBaseStyle} appearance-none cursor-pointer`}
                  style={{ 
                    backgroundColor: themeStyles.inputBg, 
                    color: themeStyles.textColor,
                    borderColor: 'transparent'
                  }}
                >
                  <option value="" className="bg-gray-800">Select Grade Level</option>
                  {gradeLevels.map((grade) => (
                    <option key={grade} value={grade} className="bg-gray-800">
                      {grade}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" style={{ color: themeStyles.textColor }} />
              </div>
            </div>

            {/* Google Meet Link */}
            <div className={inputWrapperStyle}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 ml-1 flex justify-between opacity-60" style={{ color: themeStyles.textColor }}>
                <span>Google Meet Link</span>
                <span className="text-red-400 text-[10px] font-normal normal-case">* Required</span>
              </label>
              <div className="relative">
                <VideoCameraIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors group-focus-within:text-blue-500" style={{ color: themeStyles.accentText }} />
                <input
                  type="url"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  disabled={isSubmitting}
                  className={inputBaseStyle}
                  style={{ 
                    backgroundColor: themeStyles.inputBg, 
                    color: themeStyles.textColor,
                    borderColor: 'transparent'
                  }}
                  placeholder="https://meet.google.com/..."
                  required
                />
              </div>
              <p className="text-[11px] mt-2 ml-1 leading-relaxed opacity-50" style={{ color: themeStyles.textColor }}>
                Paste the permanent Meet link generated from your Google Calendar or Classroom.
              </p>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: themeStyles.borderColor }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${btnExtruded}`}
            style={{ 
                backgroundColor: themeStyles.innerPanelBg, 
                color: themeStyles.textColor 
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="relative px-8 py-2.5 rounded-xl text-sm font-semibold text-white 
                       bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600
                       shadow-lg shadow-blue-500/30
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