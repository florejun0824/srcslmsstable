import React, { useState, Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function DeleteSubjectModal({ isOpen, onClose, onConfirm }) {
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

  // --- DESIGN CONSTANTS ---
  const primaryBtn = `
    w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-red-500/30 
    bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 
    border border-red-400/20 active:scale-[0.98] transition-all duration-200
    disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed
  `;

  const secondaryBtn = `
    w-full py-3.5 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 
    bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 
    active:scale-[0.98] transition-all duration-200
  `;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1000] font-sans" onClose={onClose}>
        {/* Backdrop */}
        <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-[1000] w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95 translate-y-4"
                    enterTo="opacity-100 scale-100 translate-y-0"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100 translate-y-0"
                    leaveTo="opacity-0 scale-95 translate-y-4"
                >
                    {/* Glass Panel */}
                    <DialogPanel className="w-full max-w-sm transform overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-[#18181b]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-8 text-center shadow-2xl transition-all">
                        
                        {/* Icon with Glow */}
                        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-500">
                            <div className="absolute inset-0 rounded-full bg-red-500 blur-xl opacity-20"></div>
                            <TrashIcon className="h-8 w-8 relative z-10" aria-hidden="true" strokeWidth={1.5} />
                        </div>

                        <DialogTitle as="h3" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                            Delete Subject?
                        </DialogTitle>

                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                            All associated lessons and content will be permanently removed. This cannot be undone.
                        </p>

                        {error && (
                            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                                <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className={secondaryBtn}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className={primaryBtn}
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </DialogPanel>
                </TransitionChild>
            </div>
        </div>
      </Dialog>
    </Transition>
  );
}