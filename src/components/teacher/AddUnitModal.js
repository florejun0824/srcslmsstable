import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { PlusIcon } from '@heroicons/react/24/solid'; // Assuming you have an icon for 'Add' action

export default function AddUnitModal({ isOpen, onClose, subjectId }) {
  const [unitTitle, setUnitTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddUnit = async () => {
    if (!unitTitle.trim()) {
      setError('Unit title cannot be empty.');
      return;
    }
    if (!subjectId) {
      setError('No subject selected. Please go back and select a subject.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create a query to find existing units for this subject
      const unitsRef = collection(db, 'units');
      const q = query(unitsRef, where('subjectId', '==', subjectId));
      
      // 2. Execute the query and get the count
      const querySnapshot = await getDocs(q);
      const newOrderValue = querySnapshot.size; // If 5 units exist (0-4), new one is 5

      // 3. Add the new unit with the calculated 'order' field
      await addDoc(collection(db, 'units'), {
        title: unitTitle,
        subjectId: subjectId,
        createdAt: serverTimestamp(),
        order: newOrderValue, // <-- The new order field is added here
      });
      
      handleClose();

    } catch (err) {
      console.error("Error adding unit: ", err);
      setError("Failed to add unit. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setUnitTitle('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
      {/* Enhanced Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md" aria-hidden="true" />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* Modal Panel */}
        <DialogPanel className="w-full max-w-md transform rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 text-left align-middle shadow-2xl transition-all border border-gray-200 p-6 md:p-8">
          
          {/* Header/Title Section */}
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg flex-shrink-0">
                <PlusIcon className="h-6 w-6 text-white" />
            </div>
            <div>
                <Title className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-wide mb-1">Add New Unit</Title>
                <p className="text-sm md:text-base text-slate-600">Create a new unit to organize lessons and quizzes for this subject.</p>
            </div>
          </div>
          
          {/* Input Section */}
          <div className="mb-6">
            <label htmlFor="unit-title" className="block text-sm font-medium text-slate-700 mb-2">Unit Title</label>
            <TextInput
              id="unit-title"
              value={unitTitle}
              onValueChange={setUnitTitle}
              placeholder="e.g., Unit 1: Introduction to Biology"
              className="rounded-xl border-slate-300 shadow-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 text-base p-3 bg-white"
              error={!!error}
              errorMessage={error}
            />
          </div>

          {/* Error Message */}
          {error && (
              <div className="bg-red-50/50 border border-red-200 text-red-700 text-base mb-6 p-3 rounded-lg text-center animate-pulse-once">
                  {error}
              </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={handleClose} disabled={loading} className="px-4 py-2 text-sm md:text-base rounded-lg">Cancel</Button>
            <Button 
                onClick={handleAddUnit} 
                loading={loading} 
                disabled={loading || !unitTitle.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-700 to-purple-700 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.03] transform transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? (
                  <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                  </>
              ) : (
                  <>
                      <PlusIcon className="h-5 w-5"/>
                      Add Unit
                  </>
              )}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}