import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';

export default function EditUnitModal({ isOpen, onClose, unit }) {
  const [unitTitle, setUnitTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill the input with the current unit's title when the modal opens
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
    } catch (err) { // <-- FIX: Added curly braces here
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
    // The Dialog component now includes a backdrop blur for a frosted glass effect
    <Dialog open={isOpen} onClose={handleClose} static={true} className="z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-end justify-center p-4">
        {/*
          iOS Vibe Changes:
          - Increased rounding ('rounded-2xl') for a softer look.
          - Changed background to a slightly off-white ('bg-zinc-50').
          - Added a grabber handle at the top for an authentic bottom sheet feel.
          - Centered text and adjusted padding ('p-6', 'pb-4') for better hierarchy.
        */}
        <DialogPanel className="w-full max-w-md rounded-2xl bg-zinc-50 p-6 pb-4">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />
          <Title className="text-center text-xl font-bold text-gray-900 mb-6">
            Edit Unit
          </Title>
          
          {/*
            iOS Vibe Changes:
            - Replaced Tremor's TextInput with a styled native input for a more custom, iOS-like appearance.
            - Input has a light gray background, no border, and rounded corners.
          */}
          <div className="mb-6">
            <label htmlFor="unit-title" className="text-left block text-sm font-medium text-gray-600 mb-2">
              Unit Title
            </label>
            <input
              id="unit-title"
              type="text"
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="Enter new unit title"
              className="w-full rounded-lg border-none bg-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="mt-2 text-left text-sm text-red-500">{error}</p>}
          </div>

          {/*
            iOS Vibe Changes:
            - Buttons are now pill-shaped ('rounded-full').
            - Increased vertical padding ('py-2.5') and bold text for better legibility.
            - Clear visual distinction between the secondary ('Cancel') and primary ('Save Changes') actions.
          */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="light" 
              onClick={handleClose} 
              disabled={loading}
              className="rounded-full py-2.5 text-base font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUnit} 
              loading={loading} 
              disabled={loading}
              className="rounded-full py-2.5 text-base font-semibold bg-blue-500 text-white hover:bg-blue-600"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}