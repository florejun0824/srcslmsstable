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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 font-sans">
      <div className="relative bg-neumorphic-base rounded-3xl shadow-neumorphic p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <DocumentPlusIcon className="w-6 h-6 text-red-600" />
            Join a New Class
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full shadow-neumorphic hover:shadow-neumorphic-inset transition-all"
          >
            <XMarkIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleJoinSubmit} className="space-y-5">
          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-Digit Class Code"
            className="w-full p-3 bg-neumorphic-base rounded-xl shadow-neumorphic-inset text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
            maxLength="6"
            autoFocus
          />

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl font-semibold text-slate-700 bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl font-semibold text-white bg-red-600 shadow-lg shadow-red-500/40 hover:bg-red-700 transition-all disabled:bg-slate-400 disabled:shadow-none"
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
