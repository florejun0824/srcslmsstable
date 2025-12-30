// src/components/teacher/EditSubjectModal.js

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext'; 

// --- ONE UI 8.0 MONET STYLES ---
const getOneUIStyle = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    
    // One UI uses solid colors or subtle tonal tints, not heavy gradients
    switch (activeOverlay) {
        case 'christmas': return { iconBg: 'bg-emerald-100 text-emerald-700', btnPrimary: 'bg-emerald-600 text-white', ring: 'focus:ring-emerald-500/50' }; 
        case 'valentines': return { iconBg: 'bg-rose-100 text-rose-700', btnPrimary: 'bg-rose-600 text-white', ring: 'focus:ring-rose-500/50' }; 
        case 'graduation': return { iconBg: 'bg-amber-100 text-amber-700', btnPrimary: 'bg-amber-600 text-white', ring: 'focus:ring-amber-500/50' }; 
        case 'rainy': return { iconBg: 'bg-teal-100 text-teal-700', btnPrimary: 'bg-teal-600 text-white', ring: 'focus:ring-teal-500/50' }; 
        case 'cyberpunk': return { iconBg: 'bg-fuchsia-100 text-fuchsia-700', btnPrimary: 'bg-fuchsia-600 text-white', ring: 'focus:ring-fuchsia-500/50' }; 
        case 'spring': return { iconBg: 'bg-pink-100 text-pink-700', btnPrimary: 'bg-pink-600 text-white', ring: 'focus:ring-pink-500/50' }; 
        case 'space': return { iconBg: 'bg-indigo-100 text-indigo-700', btnPrimary: 'bg-indigo-600 text-white', ring: 'focus:ring-indigo-500/50' };
        default: return null;
    }
};

export default function EditSubjectModal({ isOpen, onClose, subject }) {
  const [subjectName, setSubjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  
  const { activeOverlay } = useTheme();
  const oneUiTheme = getOneUIStyle(activeOverlay);

  useEffect(() => {
    if (subject?.title) {
      setSubjectName(subject.title);
    } else {
      setSubjectName('');
    }
  }, [subject]);
  
  const handleSave = async () => {
    if (!subjectName?.trim()) {
      showToast("Subject name cannot be empty.", "error");
      return;
    }

    if (!subject?.id) {
      showToast("Invalid subject ID.", "error");
      return;
    }

    setIsSaving(true);
    const subjectRef = doc(db, 'courses', subject.id);

    try {
      await updateDoc(subjectRef, {
        title: subjectName,
        updatedAt: serverTimestamp()
      });
      showToast("Subject updated successfully!", "success");
      onClose();
    } catch (error) {
      console.error("Error updating subject: ", error);
      showToast("Failed to update subject.", "error");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;

  // --- STYLES ---
  
  // Container: Solid surface, subtle shadow, large radius
  const containerClass = `w-full max-w-sm transform overflow-hidden rounded-[32px] bg-white dark:bg-[#1C1C1E] p-6 text-left align-middle shadow-2xl transition-all border border-transparent dark:border-[#2C2C2E]`;

  // Input: Tonal background, no border, centered text
  const inputClass = `w-full px-5 py-4 rounded-[22px] bg-[#F2F4F7] dark:bg-[#252527] border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-[#2C2C2E] transition-all text-center font-bold text-lg ${oneUiTheme ? oneUiTheme.ring : 'focus:ring-blue-500/20'}`;

  // Primary Button: Solid color pill
  const primaryBtnClass = oneUiTheme
      ? `w-full inline-flex justify-center items-center gap-2 rounded-[26px] px-6 py-3.5 text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${oneUiTheme.btnPrimary}`
      : `w-full inline-flex justify-center items-center gap-2 rounded-[26px] px-6 py-3.5 text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:scale-100`;

  // Cancel Button: Tonal pill
  const cancelBtnClass = `w-full inline-flex justify-center rounded-[26px] px-6 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-[#F2F4F7] dark:bg-[#2C2C2E] hover:bg-[#E5E7EB] dark:hover:bg-[#3A3A3C] transition-all active:scale-95`;

  // Icon Box: Squircle shape
  const iconBoxClass = oneUiTheme
      ? `mb-4 h-16 w-16 rounded-[22px] flex items-center justify-center ${oneUiTheme.iconBg}`
      : `mb-4 h-16 w-16 rounded-[22px] flex items-center justify-center bg-slate-100 dark:bg-[#2C2C2E] text-slate-900 dark:text-white`;

  return (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[6000]" onClose={onClose}>
            {/* Smooth Backdrop */}
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95 translate-y-8"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-95 translate-y-8"
                    >
                        <Dialog.Panel className={containerClass}>
                            
                            {/* Header Section */}
                            <div className="flex flex-col items-center relative mb-6">
                                <button 
                                    onClick={onClose}
                                    className="absolute -top-2 -right-2 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A3A3C] dark:text-slate-500 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                                </button>

                                {/* Floating Squircle Icon */}
                                <div className={iconBoxClass}>
                                    <PencilSquareIcon className="h-7 w-7 stroke-2" />
                                </div>

                                <Dialog.Title as="h3" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Rename Subject
                                </Dialog.Title>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Give your course a new title.
                                </p>
                            </div>

                            {/* Tonal Input Field */}
                            <div className="mb-8">
                                <input
                                    type="text"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    placeholder="Subject Name"
                                    className={inputClass}
                                    autoFocus
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={primaryBtnClass}
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className={cancelBtnClass}
                                >
                                    Cancel
                                </button>
                            </div>

                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
  );
}