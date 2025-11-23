// src/components/teacher/EditUnitModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import { RectangleStackIcon } from '@heroicons/react/24/solid';

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
    <Dialog 
      open={isOpen} 
      onClose={handleClose} 
      className="relative z-[6000]"
    >
      {/* Backdrop with deep blur */}
      <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* Modal Panel - Ultra-Glass Style */}
        <Dialog.Panel 
          className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] 
                     bg-white/90 dark:bg-[#16181D]/90 backdrop-blur-3xl 
                     p-8 text-left align-middle shadow-2xl shadow-slate-400/20 dark:shadow-black/60 
                     border border-white/60 dark:border-white/5 
                     ring-1 ring-slate-900/5 transition-all animate-in fade-in zoom-in-95 duration-300 scale-100"
        >
          
          {/* Icon Header with Ambient Bloom */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
                {/* Bloom behind icon */}
                <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                <div className="relative h-16 w-16 rounded-[1.2rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                    <RectangleStackIcon className="h-8 w-8 text-white drop-shadow-sm" />
                </div>
            </div>
            <Dialog.Title as="h3" className="mt-5 text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-center">
              Edit Unit
            </Dialog.Title>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
              Update the unit title below.
            </p>
          </div>

          {/* Input Field - Recessed "Deep Field" Look */}
          <div className="mb-8">
            <label htmlFor="unit-title" className="sr-only">Unit Title</label>
            <div className="relative group">
                <input
                  id="unit-title"
                  type="text"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  placeholder="Enter unit title..."
                  className="w-full px-5 py-4 rounded-2xl 
                            bg-slate-100/80 dark:bg-black/40 
                            border border-transparent focus:border-indigo-500/50 
                            text-slate-900 dark:text-white text-center font-semibold text-lg
                            placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal
                            focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-black/60
                            transition-all duration-300 shadow-inner group-hover:bg-slate-100 dark:group-hover:bg-black/50"
                />
            </div>
            {error && (
                <p className="mt-3 text-center text-sm font-medium text-red-500 animate-pulse">
                    {error}
                </p>
            )}
          </div>

          {/* Buttons - "Gem" & "Glass" Styles */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cancel: Frosted Glass */}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold 
                         text-slate-600 dark:text-slate-300 
                         bg-white/50 dark:bg-white/5 
                         hover:bg-white/80 dark:hover:bg-white/10 
                         border border-slate-200/60 dark:border-white/10 
                         shadow-sm hover:shadow-md backdrop-blur-sm
                         transition-all duration-200 active:scale-[0.98] 
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            {/* Save: Aurora Gem (Indigo/Violet variant) */}
            <button
              type="button"
              onClick={handleUpdateUnit}
              disabled={loading}
              className="relative inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold 
                         text-white 
                         bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600
                         hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500
                         shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 
                         border border-white/20 
                         transition-all duration-300 active:scale-[0.98] 
                         disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
            >
              {/* Shine effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 pointer-events-none"></div>
              
              {loading ? (
                <span className="flex items-center gap-2 relative z-10">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="relative z-10">Save Changes</span>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}