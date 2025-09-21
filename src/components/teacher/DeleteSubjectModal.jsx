// src/components/teacher/DeleteUnitModal.jsx
import React, { useState } from 'react';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function DeleteUnitModal({ isOpen, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      if (onConfirm) {
        await onConfirm();
      }
      onClose();
    } catch (err) {
      console.error("Error during delete confirmation: ", err);
      setError("Failed to delete. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Neumorphic Design Changes: Removed backdrop-blur.
    <Dialog open={isOpen} onClose={onClose} static={true} className="z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* Neumorphic Design Changes:
            - Applied neumorphic base background and main shadow.
            - Softened corners with 'rounded-3xl'.
        */}
        <DialogPanel className="w-full max-w-sm rounded-3xl bg-neumorphic-base shadow-neumorphic p-6 text-center">
          {/* Neumorphic Design Changes: Icon container is now "pressed in" with an inset shadow. */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-4">
            <TrashIcon className="h-7 w-7 text-red-600" aria-hidden="true" />
          </div>
          <Title className="text-2xl font-bold text-slate-800 mb-2">
            Delete Unit
          </Title>
          <p className="text-sm text-slate-600 mb-6">
            Are you sure? All associated lessons and content will be permanently removed. This action cannot be undone.
          </p>

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          
          {/* Neumorphic Design Changes: Buttons are extruded with a pressed effect on click. */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="py-3 text-base font-semibold bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-slate-900 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="py-3 text-base font-semibold bg-neumorphic-base text-red-600 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-red-700 disabled:opacity-60"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}