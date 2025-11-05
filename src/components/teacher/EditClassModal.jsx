import React, { useState, useEffect } from 'react';
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
// --- MODIFICATION: Removed Firebase Functions imports ---
// import { functions } from '../../services/firebase';
// import { httpsCallable } from 'firebase/functions';
// import { useAuth } from '../../contexts/AuthContext'; 

// 2. Define the list of grade levels
const gradeLevels = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
];

// --- MODIFICATION: Removed function call ---
// const createClassMeetLink = httpsCallable(functions, 'createClassMeetLink');

const EditClassModal = ({ isOpen, onClose, classData, onUpdate, courses = [] }) => {
  // 4. All state definitions
  const [editedName, setEditedName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showToast } = useToast();
  
  // 5. Removed useAuth() as it's no longer needed
  // const { user } = useAuth(); 

  // When the modal opens, set the state with the current class data
  useEffect(() => {
    if (isOpen && classData) {
      setEditedName(classData.name || '');
      setSelectedSubjectId(classData.subjectId || '');
      setSelectedGradeLevel(classData.gradeLevel || '');
      setMeetLink(classData.meetLink || '');
      setIsSubmitting(false);
    }
  }, [isOpen, classData]);

  // 6. --- MODIFIED: handleSave no longer generates link ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    let finalMeetLink = meetLink.trim();

    try {
      // --- MODIFICATION: Check if link is missing ---
      if (!finalMeetLink) {
        showToast("A persistent Google Meet link is required.", "error");
        setIsSubmitting(false);
        return;
      }
      
      // Check if link is a valid Google Meet URL
      if (!finalMeetLink.startsWith("https://meet.google.com/")) {
        showToast("Please enter a valid Google Meet URL (e.g., https://meet.google.com/xxx-yyy-zzz)", "warning");
        setIsSubmitting(false);
        return;
      }
      
      // Await the update function from the parent
      await onUpdate(classData.id, {
        name: editedName,
        subjectId: selectedSubjectId,
        gradeLevel: selectedGradeLevel,
        meetLink: finalMeetLink, // Save the manually provided link
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
  // --- END MODIFICATION ---

  if (!isOpen || !classData) {
    return null;
  }

  // A simple inline spinner component
  const Spinner = () => (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25 text-gray-300"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 font-sans">
      <div className="relative bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <PencilSquareIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Edit "{classData.name}"
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* --- Class Name Input --- */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Class Name
            </label>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark 
                         text-slate-700 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 disabled:opacity-70"
            />
          </div>

          {/* --- Subject Selector Dropdown --- */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Assign Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark 
                         text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 
                         dark:focus:ring-indigo-500 disabled:opacity-70"
            >
              <option value="">No Subject Assigned</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* --- Grade Level Selector Dropdown --- */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Grade Level
            </label>
            <select
              value={selectedGradeLevel}
              onChange={(e) => setSelectedGradeLevel(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark 
                         text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 
                         dark:focus:ring-indigo-500 disabled:opacity-70"
            >
              <option value="">Select Grade Level</option>
              {gradeLevels.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* --- MODIFIED: Google Meet Link Input --- */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Google Meet Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark
                         text-slate-700 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 disabled:opacity-70"
              required // Added browser-level validation
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              A persistent Google Meet link is required.
            </p>
          </div>
          {/* --- END MODIFICATION --- */}


          {/* --- Buttons --- */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark 
                         shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark 
                         transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center px-5 py-2 rounded-xl font-semibold text-white bg-indigo-600 shadow-lg shadow-indigo-500/40 
                         hover:bg-indigo-700 transition-all disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClassModal;