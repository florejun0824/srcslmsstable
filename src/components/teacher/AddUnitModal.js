import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';

export default function AddUnitModal({ isOpen, onClose, subjectId }) {
  const [unitTitle, setUnitTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddUnit = async () => {
    if (!unitTitle.trim()) {
      setError('Unit title cannot be empty.');
      return;
    }
    if (!subjectId) {
      setError('No subject selected. Please go back and select a subject.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Corrected: The redundant 'lessons' and 'quizzes' arrays are removed.
      await addDoc(collection(db, 'units'), {
        title: unitTitle,
        subjectId: subjectId,
        createdAt: serverTimestamp(),
      });
      
      handleClose();

    } catch (err) {
      console.error("Error adding unit: ", err);
      setError("Failed to add unit. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setUnitTitle('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} static={true}>
      <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <Title className="mb-4">Add New Unit</Title>
        <p className="mb-4 text-sm text-gray-600">Create a new unit to organize lessons and quizzes for this subject.</p>
        
        <div className="mb-4">
          <label htmlFor="unit-title" className="block text-sm font-medium text-gray-700 mb-1">Unit Title</label>
          <TextInput
            id="unit-title"
            value={unitTitle}
            onValueChange={setUnitTitle}
            placeholder="e.g., Unit 1: Introduction to..."
            error={!!error}
            errorMessage={error}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleAddUnit} loading={loading} disabled={loading}>
            {loading ? 'Adding...' : 'Add Unit'}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}