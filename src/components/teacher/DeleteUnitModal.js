import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { TrashIcon } from '@heroicons/react/24/solid';

export default function DeleteUnitModal({ isOpen, onClose, unitId, subjectId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteUnit = async () => {
    if (!unitId) {
      setError('No unit selected for deletion.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // NOTE: This will delete the unit, but not the lessons and quizzes inside it.
      // A more robust solution would use a cloud function to delete all sub-collections.
      const unitRef = doc(db, 'units', unitId);
      await deleteDoc(unitRef);
      
      onClose();

    } catch (err) {
      console.error("Error deleting unit: ", err);
      setError("Failed to delete unit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} static={true}>
      <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-3 rounded-full">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <Title className="text-center mb-2">Delete Unit</Title>
        <p className="text-center text-gray-600 mb-6">
          Are you sure you want to delete this unit? This action cannot be undone.
        </p>

        {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}
        
        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteUnit} loading={loading} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}