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
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Neumorphic Design Changes: Using a simple, non-blurry backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      {/* Neumorphic Design Changes:
          - Applied neumorphic base background and main shadow.
          - Softened corners with 'rounded-3xl'.
          - Centered text for a modern feel.
      */}
      <Dialog.Panel className="bg-neumorphic-base p-6 rounded-3xl shadow-neumorphic w-full max-w-md z-10 text-center">
        <Dialog.Title className="text-2xl font-bold text-slate-800 mb-2">Edit Subject</Dialog.Title>
        <p className="mb-6 text-sm text-slate-600">Enter the new name for the subject.</p>
        
        {/* Neumorphic Design Changes: Input field now has an inset shadow to appear "pressed in". */}
        <input
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="Subject Name"
          className="w-full text-center rounded-lg border-none bg-neumorphic-base shadow-neumorphic-inset px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none mb-6"
        />

        {/* Neumorphic Design Changes: Buttons are now extruded with a pressed effect on click. */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onClose} 
            className="py-3 text-base font-semibold bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-slate-900 disabled:opacity-60"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="py-3 text-base font-semibold bg-neumorphic-base text-primary-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-primary-600 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}