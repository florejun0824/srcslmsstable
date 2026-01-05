// src/components/student/JoinClassModal.jsx
import React, { useState } from 'react';
// ✅ Import DEFAULT_SCHOOL_ID for safety fallback
import { useAuth, DEFAULT_SCHOOL_ID } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DocumentPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const JoinClassModal = ({ isOpen, onClose, onClassJoined }) => {
  const { firestoreService, userProfile } = useAuth();
  const { showToast } = useToast();
  const [classCode, setClassCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) {
      showToast("Please enter a class code.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ SECURITY UPDATE: Explicitly attach schoolId
      const studentProfileWithSchool = {
        ...userProfile,
        schoolId: userProfile?.schoolId || DEFAULT_SCHOOL_ID
      };

      const result = await firestoreService.joinClassWithCode(
        classCode.toUpperCase(),
        studentProfileWithSchool
      );
      
      showToast(`Successfully joined class: ${result.className}!`, 'success');
      onClose();
      if (onClassJoined) {
        onClassJoined();
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    // --- OVERLAY: Soft dimming ---
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-6 font-sans">
      
      {/* --- MODAL CONTAINER: One UI Surface --- */}
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800 p-8 transform transition-all scale-100 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">Join Class</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
               Enter the code provided by your teacher.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 -mt-2 rounded-full bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleJoinSubmit} className="space-y-8 relative z-10">
            {/* Input Container */}
            <div className="relative">
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="ABC-123"
                className="
                    w-full bg-white dark:bg-slate-800 
                    border border-slate-200 dark:border-slate-700
                    rounded-[2rem] px-6 py-6 
                    text-center font-mono text-3xl font-bold tracking-[0.2em] uppercase
                    text-slate-800 dark:text-white 
                    placeholder:text-slate-300 dark:placeholder:text-slate-600 
                    focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 
                    transition-all shadow-sm
                "
                maxLength="6"
                autoFocus
              />
              <div className="absolute -bottom-6 left-0 right-0 text-center">
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 px-2">
                    6-Digit Code
                 </span>
              </div>
            </div>

            {/* Buttons - Pill Shape */}
            <div className="grid grid-cols-1 gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                    w-full py-4 rounded-full font-bold text-[15px] text-white 
                    bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500
                    shadow-lg shadow-blue-600/20 active:scale-[0.98] 
                    transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2
                "
              >
                {isSubmitting ? (
                    <span className="animate-pulse">Joining...</span>
                ) : (
                    <>
                        <DocumentPlusIcon className="w-5 h-5" strokeWidth={2.5} />
                        Join Class
                    </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="
                    w-full py-3.5 rounded-full font-bold text-[14px] 
                    text-slate-600 dark:text-slate-300 
                    bg-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800
                    transition-colors
                "
              >
                Cancel
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default JoinClassModal;