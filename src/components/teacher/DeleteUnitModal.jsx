import React, { useState } from 'react';
// ✅ REMOVED: Firestore imports are no longer needed.
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { TrashIcon } from '@heroicons/react/24/outline';

// ✅ ADDED: Now accepts 'onConfirm' to handle the deletion logic.
export default function DeleteUnitModal({ isOpen, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ MODIFIED: Calls the onConfirm function from the parent.
      // The parent (TeacherDashboard) now handles the transaction.
      if (onConfirm) {
        await onConfirm();
      }
      onClose(); // Close the modal on success
    } catch (err) {
      console.error("Error during delete confirmation: ", err);
      setError("Failed to delete. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} static={true} className="z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-2xl bg-zinc-50/95 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <Title className="text-xl font-bold text-gray-900 mb-2">
            Delete Unit
          </Title>
          <p className="text-sm text-zinc-600 mb-6">
            Are you sure you want to delete this unit? All of its contents (lessons, quizzes, etc.) will be permanently removed. This action cannot be undone.
          </p>

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          
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
              onClick={handleDelete}
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