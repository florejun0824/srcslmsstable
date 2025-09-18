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
      setSubjectName(subject.title);  // ✅ set initial value from 'title'
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

    // 🔧 Correct Firestore reference — collection 'courses', field 'title'
    const subjectRef = doc(db, 'courses', subject.id);

    try {
      await updateDoc(subjectRef, {
        title: subjectName,  // ✅ save to 'title', not 'name'
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
      <div className="fixed inset-0 bg-black bg-opacity-30" />
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md z-10">
        <Dialog.Title className="text-xl font-bold mb-4">Edit Subject</Dialog.Title>
        <p className="mb-4 text-sm text-gray-600">Enter the new name for the subject.</p>
        
        <input
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="Subject Name"
          className="w-full p-2 border rounded mb-4"
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}