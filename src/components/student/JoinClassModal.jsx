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
      // ✅ SECURITY UPDATE: Explicitly attach schoolId to ensure cross-school joining is blocked
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
    // --- OVERLAY: Darker, blurrier backdrop for focus ---
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4 font-sans">
      
      {/* --- MODAL CONTAINER: Glassmorphism style --- */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl w-full max-w-sm rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-700/50 p-6 transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-red-500 to-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
              <DocumentPlusIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Join Class</h3>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Enter Code</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleJoinSubmit} className="space-y-5">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="ABC-123"
                className="relative w-full bg-white dark:bg-slate-900 border-0 rounded-xl px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-inner uppercase"
                maxLength="6"
                autoFocus
              />
              <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">6-Digit Class Code</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-3 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] px-5 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-500 to-orange-600 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Joining...' : 'Join Class'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default JoinClassModal;