// src/components/teacher/EditUnitModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';

export default function EditUnitModal({ isOpen, onClose, unit }) {
  const [unitTitle, setUnitTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (unit) {
      setUnitTitle(unit.title);
    }
  }, [unit]);

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
      await updateDoc(unitRef, { title: unitTitle });
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
    // Neumorphic Design Changes: Removed backdrop-blur for a cleaner overlay.
    <Dialog open={isOpen} onClose={handleClose} static={true} className="z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* Neumorphic Design Changes:
            - Applied neumorphic base background and main shadow.
            - Softened corners with 'rounded-3xl'.
        */}
        <DialogPanel className="w-full max-w-md rounded-3xl bg-neumorphic-base shadow-neumorphic p-6 text-center">
          <Title className="text-2xl font-bold text-slate-800 mb-6">
            Edit Unit
          </Title>
          
          <div className="mb-6">
            <label htmlFor="unit-title" className="text-left block text-sm font-medium text-slate-600 mb-2">
              Unit Title
            </label>
            {/* Neumorphic Design Changes: Input field now has an inset shadow to appear "pressed in". */}
            <input
              id="unit-title"
              type="text"
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="Enter new unit title"
              className="w-full rounded-lg border-none bg-neumorphic-base shadow-neumorphic-inset px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none"
            />
            {error && <p className="mt-2 text-left text-sm text-red-500">{error}</p>}
          </div>

          {/* Neumorphic Design Changes: Buttons are now extruded with a pressed effect on click. */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleClose} 
              disabled={loading}
              className="py-3 text-base font-semibold bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-slate-900 disabled:opacity-60"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateUnit} 
              disabled={loading}
              className="py-3 text-base font-semibold bg-neumorphic-base text-primary-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-primary-600 disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}