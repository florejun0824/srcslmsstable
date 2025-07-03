import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';

export default function EditUnitModal({ isOpen, onClose, unit }) {
  const [unitTitle, setUnitTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // When the modal opens, pre-fill the input with the current unit's title
  useEffect(() => {
    if (unit) {
      setUnitTitle(unit.title);
    }
  }, [unit]);

  // Return null if no unit is selected to prevent errors
  if (!unit) return null;

  const handleUpdateUnit = async () => {
    if (!unitTitle.trim()) {
      setError('Unit title cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const unitRef = doc(db, 'units', unit.id);
      await updateDoc(unitRef, {
        title: unitTitle,
      });
      handleClose();

    } catch (err) {
      console.error("Error updating unit: ", err);
      setError("Failed to update unit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} static={true}>
      <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <Title className="mb-4">Edit Unit Title</Title>
        <div className="mb-4">
          <label htmlFor="unit-title" className="block text-sm font-medium text-gray-700 mb-1">Unit Title</label>
          <TextInput
            id="unit-title"
            value={unitTitle}
            onValueChange={setUnitTitle}
            error={!!error}
            errorMessage={error}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleUpdateUnit} loading={loading} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}