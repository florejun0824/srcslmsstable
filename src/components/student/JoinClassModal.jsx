import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
      const result = await firestoreService.joinClassWithCode(
        classCode.toUpperCase(),
        userProfile
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
      
      {/* --- MODAL CONTAINER: Glass Panel with Ambient Light --- */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl ring-1 ring-black/5">
        
        {/* Decorative Background Mesh/Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-screen"></div>

        <div className="relative z-10 p-6 sm:p-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {/* Icon: Floating Gradient Gem */}
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/30 text-white">
                  <DocumentPlusIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">Join Class</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Enter your code below</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleJoinSubmit} className="space-y-6">
            <div className="space-y-2">
              {/* Input: Clean spatial field */}
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                className="w-full py-4 px-4 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-center font-mono text-3xl font-bold tracking-[0.3em] text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-inner uppercase"
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
                className="flex-[2] px-5 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-500 to-orange-600 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
              >
                {isSubmitting ? 'Verifying...' : 'Join Class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinClassModal;