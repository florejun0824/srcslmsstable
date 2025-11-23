// src/components/teacher/CreateCourseModal.jsx

import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import { ChevronUpDownIcon, BookOpenIcon } from '@heroicons/react/24/solid';

const CreateCourseModal = ({
  isOpen,
  onClose,
  teacherId,
  courseCategories = [],
  preselectedCategory = null
}) => {
  const [courseTitle, setCourseTitle] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (preselectedCategory) {
        setCategory(preselectedCategory);
      } else if (courseCategories.length > 0) {
        setCategory(courseCategories[0]?.name || '');
      } else {
        setCategory('');
      }
    }
  }, [isOpen, courseCategories, preselectedCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCategory = preselectedCategory || category;

    if (!courseTitle.trim() || !finalCategory) {
      showToast('Please provide a title and select a category.', 'error');
      return;
    }
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'courses'), {
        title: courseTitle,
        category: finalCategory,
        teacherId,
        createdAt: serverTimestamp(),
        units: [],
      });

      showToast(`Subject "${courseTitle}" created successfully!`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error creating course:', error);
      showToast('Failed to create subject.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCourseTitle('');
    setCategory('');
    setIsSubmitting(false);
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
          
          {/* Icon Header with Ambient Bloom (Violet Theme) */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
                {/* Bloom behind icon */}
                <div className="absolute inset-0 bg-violet-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                <div className="relative h-16 w-16 rounded-[1.2rem] bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30 ring-1 ring-white/20">
                    <BookOpenIcon className="h-8 w-8 text-white drop-shadow-sm" />
                </div>
            </div>
            <Dialog.Title as="h3" className="mt-5 text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-center">
              Create Subject
            </Dialog.Title>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
              Add a new subject to your curriculum.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject Title Input - Recessed Look */}
            <div>
              <label htmlFor="courseTitle" className="sr-only">Subject Title</label>
              <div className="relative group">
                  <input
                    type="text"
                    id="courseTitle"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g., Introduction to Algebra"
                    className="w-full px-5 py-4 rounded-2xl 
                               bg-slate-100/80 dark:bg-black/40 
                               border border-transparent focus:border-violet-500/50 
                               text-slate-900 dark:text-white text-lg font-semibold
                               placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal
                               focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-black/60
                               transition-all duration-300 shadow-inner group-hover:bg-slate-100 dark:group-hover:bg-black/50"
                    required
                  />
              </div>
            </div>

            {/* Category Selector - Custom Glass Select */}
            <div className="relative">
              <label htmlFor="category" className="sr-only">Category</label>
              <div className="relative group">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl appearance-none
                             bg-slate-100/80 dark:bg-black/40 
                             border border-transparent focus:border-violet-500/50 
                             text-slate-900 dark:text-white text-lg font-semibold
                             focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-black/60
                             transition-all duration-300 shadow-inner cursor-pointer
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                  disabled={preselectedCategory || courseCategories.length === 0}
                >
                  <option value="" disabled>
                    {courseCategories.length > 0 ? 'Select a category...' : 'No categories available'}
                  </option>
                  {courseCategories.map((cat) => (
                    <option key={cat.id} value={cat.name} className="bg-white dark:bg-slate-900">
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-slate-500 dark:text-slate-400">
                  <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Cancel: Frosted Glass */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
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

              {/* Create: Aurora Gem (Violet/Fuchsia) */}
              <button
                type="submit"
                disabled={isSubmitting || !courseTitle.trim() || !category}
                className="relative inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold 
                           text-white 
                           bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600
                           hover:from-violet-500 hover:via-fuchsia-500 hover:to-purple-500
                           shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 
                           border border-white/20 
                           transition-all duration-300 active:scale-[0.98] 
                           disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
              >
                {/* Shine effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 pointer-events-none"></div>
                
                {isSubmitting ? (
                    <span className="flex items-center gap-2 relative z-10">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                    </span>
                ) : (
                    <span className="relative z-10">Create Subject</span>
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateCourseModal;