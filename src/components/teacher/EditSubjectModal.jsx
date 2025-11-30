// src/components/teacher/EditSubjectModal.js

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { PencilSquareIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../../contexts/ThemeContext'; // [Added] Theme Context

// --- [ADDED] Helper: Monet/Theme Background Extraction ---
const getThemeModalStyle = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': 
            return { background: 'linear-gradient(to bottom, rgba(15, 23, 66, 0.95), rgba(15, 23, 66, 0.9))', borderColor: 'rgba(100, 116, 139, 0.2)' };
        case 'valentines': 
            return { background: 'linear-gradient(to bottom, rgba(60, 10, 20, 0.95), rgba(60, 10, 20, 0.9))', borderColor: 'rgba(255, 100, 100, 0.15)' };
        case 'graduation': 
            return { background: 'linear-gradient(to bottom, rgba(30, 25, 10, 0.95), rgba(30, 25, 10, 0.9))', borderColor: 'rgba(255, 215, 0, 0.15)' };
        case 'rainy': 
            return { background: 'linear-gradient(to bottom, rgba(20, 35, 20, 0.95), rgba(20, 35, 20, 0.9))', borderColor: 'rgba(100, 150, 100, 0.2)' };
        case 'cyberpunk': 
            return { background: 'linear-gradient(to bottom, rgba(35, 5, 45, 0.95), rgba(35, 5, 45, 0.9))', borderColor: 'rgba(180, 0, 255, 0.2)' };
        case 'spring': 
            return { background: 'linear-gradient(to bottom, rgba(50, 10, 20, 0.95), rgba(50, 10, 20, 0.9))', borderColor: 'rgba(255, 150, 180, 0.2)' };
        case 'space': 
            return { background: 'linear-gradient(to bottom, rgba(5, 5, 10, 0.95), rgba(5, 5, 10, 0.9))', borderColor: 'rgba(100, 100, 255, 0.15)' };
        default: 
            return {}; 
    }
};

export default function EditSubjectModal({ isOpen, onClose, subject }) {
  const [subjectName, setSubjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  
  // [Added] Theme Context
  const { activeOverlay } = useTheme();
  const dynamicThemeStyle = getThemeModalStyle(activeOverlay);

  useEffect(() => {
    if (subject?.title) {
      setSubjectName(subject.title);
    } else {
      setSubjectName('');
    }
  }, [subject]);
  
  const handleSave = async () => {
    if (!subjectName?.trim()) {
      showToast("Subject name cannot be empty.", "error");
      return;
    }

    if (!subject?.id) {
      showToast("Invalid subject ID.", "error");
      return;
    }

    setIsSaving(true);
    const subjectRef = doc(db, 'courses', subject.id);

    try {
      await updateDoc(subjectRef, {
        title: subjectName,
        updatedAt: serverTimestamp()
      });
      showToast("Subject updated successfully!", "success");
      onClose();
    } catch (error) {
      console.error("Error updating subject: ", error);
      showToast("Failed to update subject.", "error");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      className="relative z-[6000]"
    >
      {/* Backdrop with deep blur */}
      <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* Modal Panel - Ultra-Glass Style */}
        <Dialog.Panel 
          style={dynamicThemeStyle} // [Applied Theme]
          className={`w-full max-w-md transform overflow-hidden rounded-[2.5rem] 
                     backdrop-blur-3xl 
                     p-8 text-left align-middle shadow-2xl shadow-slate-400/20 dark:shadow-black/60 
                     border border-white/60 dark:border-white/5 
                     ring-1 ring-slate-900/5 transition-all animate-in fade-in zoom-in-95 duration-300 scale-100
                     ${activeOverlay === 'none' ? 'bg-white/90 dark:bg-[#16181D]/90' : ''}`}
        >
          
          {/* Icon Header with Ambient Bloom */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
                {/* Bloom behind icon */}
                <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                <div className="relative h-16 w-16 rounded-[1.2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                    <PencilSquareIcon className="h-8 w-8 text-white drop-shadow-sm" />
                </div>
            </div>
            <Dialog.Title as="h3" className="mt-5 text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-center">
              Edit Subject
            </Dialog.Title>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
              Update the course title below.
            </p>
          </div>

          {/* Input Field - Recessed "Deep Field" Look */}
          <div className="mb-8">
            <div className="relative group">
                <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Enter subject name..."
                className="w-full px-5 py-4 rounded-2xl 
                            bg-slate-100/80 dark:bg-black/40 
                            border border-transparent focus:border-blue-500/50 
                            text-slate-900 dark:text-white text-center font-semibold text-lg
                            placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal
                            focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-black/60
                            transition-all duration-300 shadow-inner group-hover:bg-slate-100 dark:group-hover:bg-black/50"
                />
            </div>
          </div>

          {/* Buttons - "Gem" & "Glass" Styles */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cancel: Frosted Glass */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold 
                         text-slate-600 dark:text-slate-300 
                         bg-white/50 dark:bg-white/5 
                         hover:bg-white/80 dark:hover:bg-white/10 
                         border border-slate-200/60 dark:border-white/10 
                         shadow-sm hover:shadow-md backdrop-blur-sm
                         transition-all duration-200 active:scale-[0.98] 
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            {/* Save: Aurora Gem */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="relative inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold 
                         text-white 
                         bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                         hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500
                         shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 
                         border border-white/20 
                         transition-all duration-300 active:scale-[0.98] 
                         disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
            >
              {/* Shine effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 pointer-events-none"></div>
              
              {isSaving ? (
                <span className="flex items-center gap-2 relative z-10">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="relative z-10">Save Changes</span>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}