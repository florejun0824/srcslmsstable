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
    // --- MODIFIED: Added dark theme to overlay and backdrop ---
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 font-sans dark:bg-black/70">
      {/* --- MODIFIED: Added dark theme to modal container --- */}
      <div className="relative bg-neumorphic-base rounded-3xl shadow-neumorphic p-6 w-full max-w-sm dark:bg-neumorphic-base-dark dark:shadow-lg">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* --- MODIFIED: Added dark theme to icon wrapper --- */}
            <div className="p-2 rounded-full bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                {/* --- MODIFIED: Added dark theme to icon --- */}
                <DocumentPlusIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            {/* --- MODIFIED: Added dark theme to title --- */}
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Join Class</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            // --- MODIFIED: Added dark theme to close button ---
            className="p-2 rounded-full bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition-all dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
          >
            {/* --- MODIFIED: Added dark theme to close icon --- */}
            <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleJoinSubmit} className="space-y-5">
          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-Digit Class Code"
            // --- MODIFIED: Added dark theme to input field ---
            className="w-full p-3 bg-neumorphic-base rounded-xl shadow-neumorphic-inset text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-slate-100 dark:focus:ring-red-400"
            maxLength="6"
            autoFocus
          />

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              // --- MODIFIED: Added dark theme to Cancel button ---
              className="px-5 py-2 rounded-xl font-semibold text-slate-700 bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition-all dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              // --- MODIFIED: Added dark theme to Join button ---
              className="px-5 py-2 rounded-xl font-semibold text-white bg-red-600 shadow-lg shadow-red-500/40 hover:bg-red-700 transition-all disabled:bg-slate-400 disabled:shadow-none dark:bg-red-700 dark:hover:bg-red-600 dark:shadow-red-700/60 dark:disabled:bg-slate-600"
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