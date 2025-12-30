import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import { ChevronUpDownIcon, BookOpenIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/solid';

const CreateCourseModal = ({
  isOpen,
  onClose,
  teacherId,
  courseCategories = [],
  preselectedCategory = null
}) => {
  const [courseTitle, setCourseTitle] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (preselectedCategory) {
        setSelectedCategoryName(preselectedCategory);
      } else if (courseCategories.length > 0) {
        setSelectedCategoryName(courseCategories[0]?.name || '');
      } else {
        setSelectedCategoryName('');
      }
    }
  }, [isOpen, courseCategories, preselectedCategory]);

  // ✅ HELPER: Find if the currently selected category is School Specific
  const getSelectedCategoryDetails = () => {
      return courseCategories.find(c => c.name === selectedCategoryName);
  };

  const selectedCategoryObj = getSelectedCategoryDetails();
  const isSchoolSpecific = selectedCategoryObj?.schoolId && selectedCategoryObj?.schoolId !== 'global';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim() || !selectedCategoryName) {
      showToast('Please provide a title and select a category.', 'error');
      return;
    }
    setIsSubmitting(true);

    try {
      // ✅ LOGIC: Inherit privacy from the category
      // If category has a schoolId, the course gets it too.
      // Otherwise, it defaults to 'global'.
      const targetSchoolId = selectedCategoryObj?.schoolId || 'global';

      await addDoc(collection(db, 'courses'), {
        title: courseTitle,
        category: selectedCategoryName,
        teacherId,
        createdAt: serverTimestamp(),
        units: [],
        schoolId: targetSchoolId, // <-- INHERITED PRIVACY
        isSchoolSpecific: targetSchoolId !== 'global'
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
    setSelectedCategoryName('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-[6000]">
      <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white/90 dark:bg-[#16181D]/90 backdrop-blur-3xl p-8 text-left align-middle shadow-2xl border border-white/60 dark:border-white/5 ring-1 ring-slate-900/5 transition-all">
          
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
                <div className="absolute inset-0 bg-violet-500 rounded-2xl blur-xl opacity-20"></div>
                <div className="relative h-16 w-16 rounded-[1.2rem] bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30 ring-1 ring-white/20">
                    <BookOpenIcon className="h-8 w-8 text-white" />
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
            <div>
              <div className="relative group">
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g., Introduction to Algebra"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-100/80 dark:bg-black/40 border border-transparent focus:border-violet-500/50 text-slate-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-black/60 transition-all"
                    required
                  />
              </div>
            </div>

            <div className="relative">
              <div className="relative group">
                <select
                  value={selectedCategoryName}
                  onChange={(e) => setSelectedCategoryName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl appearance-none bg-slate-100/80 dark:bg-black/40 border border-transparent focus:border-violet-500/50 text-slate-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-black/60 transition-all cursor-pointer"
                  required
                  disabled={preselectedCategory || courseCategories.length === 0}
                >
                  <option value="" disabled>Select a category...</option>
                  {courseCategories.map((cat) => (
                    <option key={cat.id} value={cat.name} className="bg-white dark:bg-slate-900">
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-slate-500 dark:text-slate-400">
                  <ChevronUpDownIcon className="h-5 w-5" />
                </div>
              </div>
              
              {/* ✅ VISUAL INDICATOR: Show if the selected category is Private or Global */}
              {selectedCategoryName && (
                  <div className={`mt-2 flex items-center gap-2 text-xs font-bold px-2 ${isSchoolSpecific ? 'text-indigo-500' : 'text-emerald-500'}`}>
                      {isSchoolSpecific ? (
                          <>
                            <LockClosedIcon className="w-3.5 h-3.5" />
                            <span>Restricted to School Only</span>
                          </>
                      ) : (
                          <>
                            <GlobeAltIcon className="w-3.5 h-3.5" />
                            <span>Shared with All Schools</span>
                          </>
                      )}
                  </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/5 hover:bg-white/80 border border-slate-200/60 dark:border-white/10"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !courseTitle.trim() || !selectedCategoryName}
                className="relative inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 hover:from-violet-500 hover:via-fuchsia-500 shadow-lg disabled:opacity-70"
              >
                {isSubmitting ? 'Creating...' : 'Create Subject'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateCourseModal;