// src/components/teacher/EditSubjectModal.js

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';

export default function EditSubjectModal({ isOpen, onClose, subject }) {
  const [subjectName, setSubjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

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
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* ✅ Backdrop with dark mode */}
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm transition-colors duration-300" 
        aria-hidden="true" 
      />

      {/* ✅ Neumorphic Modal with Dark Theme Support */}
      <Dialog.Panel 
        className="bg-neumorphic-base dark:bg-neumorphic-base-dark 
                   text-slate-800 dark:text-slate-100 
                   p-6 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark 
                   w-full max-w-md z-10 text-center transition-colors duration-300"
      >
        <Dialog.Title className="text-2xl font-bold mb-2">
          Edit Subject
        </Dialog.Title>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Enter the new name for the subject.
        </p>
        
        {/* ✅ Input field with adaptive inset shadows */}
        <input
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="Subject Name"
          className="w-full text-center rounded-lg border-none 
                     bg-neumorphic-base dark:bg-neumorphic-base-dark 
                     shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark 
                     px-4 py-3 text-slate-900 dark:text-slate-100 
                     placeholder-slate-500 dark:placeholder-slate-400 
                     focus:outline-none mb-6 transition-colors duration-300"
        />

        {/* ✅ Buttons with neumorphic styling and dark mode feedback */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="py-3 text-base font-semibold 
                       bg-neumorphic-base dark:bg-neumorphic-base-dark 
                       text-slate-700 dark:text-slate-200 
                       rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark 
                       hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark 
                       active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark 
                       hover:text-slate-900 dark:hover:text-white 
                       transition-all duration-300 disabled:opacity-60"
          >
            Cancel
          </button>

          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="py-3 text-base font-semibold 
                       bg-neumorphic-base dark:bg-neumorphic-base-dark 
                       text-primary-700 dark:text-primary-400 
                       rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark 
                       hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark 
                       active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark 
                       hover:text-primary-800 dark:hover:text-primary-300 
                       transition-all duration-300 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
