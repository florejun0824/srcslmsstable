import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { TrashIcon } from '@heroicons/react/24/outline'; // Using outline for a lighter feel

export default function DeleteUnitModal({ isOpen, onClose, unitId }) {
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
      // NOTE: This deletes the unit, but not sub-collections like lessons and quizzes.
      // A cloud function is recommended for cascading deletes.
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
    // The Dialog component now includes a backdrop blur for the frosted glass effect
    <Dialog open={isOpen} onClose={onClose} static={true} className="z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/*
          iOS Vibe Changes:
          - Styled as a centered alert with increased rounding ('rounded-2xl').
          - Content is centered to focus the user on the confirmation action.
          - Padding and background color adjusted for a modern, clean look.
        */}
        <DialogPanel className="w-full max-w-sm rounded-2xl bg-zinc-50/95 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <Title className="text-xl font-bold text-gray-900 mb-2">
            Delete Unit
          </Title>
          <p className="text-sm text-zinc-600 mb-6">
            Are you sure you want to delete this unit? All of its contents will be permanently removed. This action cannot be undone.
          </p>

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          
          {/*
            iOS Vibe Changes:
            - Buttons are pill-shaped ('rounded-full') and have a larger, more tappable feel.
            - Destructive action button is a bold, solid red to clearly communicate its function.
            - Secondary 'Cancel' button is neutral gray.
          */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="light"
              onClick={onClose}
              disabled={loading}
              className="rounded-full py-2.5 text-base font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteUnit}
              loading={loading}
              disabled={loading}
              className="rounded-full py-2.5 text-base font-semibold bg-red-500 text-white hover:bg-red-600"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}