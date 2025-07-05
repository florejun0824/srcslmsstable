// src/components/teacher/DeleteSubjectModal.js

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { doc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function DeleteSubjectModal({ isOpen, onClose, subject }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    showToast("Deleting subject and all its content...", "info");

    try {
      const batch = writeBatch(db);

      // 1. Find all units within the subject
      const unitsQuery = query(collection(db, "units"), where("subjectId", "==", subject.id));
      const unitsSnapshot = await getDocs(unitsQuery);
      const unitIds = unitsSnapshot.docs.map(d => d.id);

      if (unitIds.length > 0) {
        // For each unit, find and delete its lessons and quizzes
        for (const unitId of unitIds) {
          // Delete lessons
          const lessonsQuery = query(collection(db, "lessons"), where("unitId", "==", unitId));
          const lessonsSnapshot = await getDocs(lessonsQuery);
          lessonsSnapshot.forEach(d => batch.delete(d.ref));

          // Delete quizzes
          const quizzesQuery = query(collection(db, "quizzes"), where("unitId", "==", unitId));
          const quizzesSnapshot = await getDocs(quizzesQuery);
          quizzesSnapshot.forEach(d => batch.delete(d.ref));
        }

        // Delete all the units
        unitsSnapshot.forEach(d => batch.delete(d.ref));
      }

      // 2. Finally, delete the subject itself
      const subjectRef = doc(db, 'subjects', subject.id);
      batch.delete(subjectRef);

      // 3. Commit the batch operation
      await batch.commit();
      
      showToast("Subject deleted successfully!", "success");
      onClose();
    } catch (error) {
      console.error("Error deleting subject: ", error);
      showToast("Failed to delete subject.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30" />
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md z-10">
        <div className="flex items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
              Delete Subject
            </Dialog.Title>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete the subject **"{subject?.name}"**? This will permanently delete all of its units, lessons, and quizzes. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}