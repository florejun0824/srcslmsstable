import React, { useState } from 'react';
// ✅ REMOVED: All firestore imports are gone as this component no longer handles DB logic.
import Modal from '../common/Modal';

// ✅ ADDED: Now accepts the 'onCreateUnit' function as a prop.
export default function AddUnitModal({ isOpen, onClose, subjectId, onCreateUnit }) {
    const [unitTitle, setUnitTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAddUnit = async () => {
        if (!unitTitle.trim()) {
            setError('Unit title cannot be empty.');
            return;
        }
        if (!subjectId) {
            setError('No subject selected. Cannot create unit.');
            return;
        }
        setLoading(true);
        setError('');

        // ✅ MODIFIED: Instead of writing to the DB, it calls the parent function.
        // The parent (TeacherDashboard) now handles the transaction and closing the modal.
        try {
            const unitData = {
                title: unitTitle,
                subjectId: subjectId,
                createdAt: new Date(), // Timestamp will be converted by the parent
            };
            await onCreateUnit(unitData);
        } catch (err) {
            // The parent function will show a toast, but we can log here too.
            console.error("Error callback in AddUnitModal:", err);
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };
  
    const handleClose = () => {
        setUnitTitle('');
        setError('');
        onClose();
    };

    const inputClasses = "w-full p-4 mt-2 bg-gray-500/10 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 placeholder:text-gray-400";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Add New Unit"
            description="Organize lessons within a new unit."
        >
            <form onSubmit={(e) => { e.preventDefault(); handleAddUnit(); }} className="space-y-6">
                <div>
                    <label htmlFor="unit-title" className="block text-sm font-semibold text-gray-600">Unit Title</label>
                    <input
                        id="unit-title"
                        value={unitTitle}
                        onChange={(e) => setUnitTitle(e.target.value)}
                        placeholder="e.g., Unit 1: The Cell"
                        className={inputClasses}
                        aria-invalid={!!error}
                        aria-describedby="unit-error"
                    />
                    {error && <p id="unit-error" className="text-sm text-red-600 mt-2">{error}</p>}
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} disabled={loading} className="px-5 py-3 text-base font-medium text-slate-700 bg-slate-200/70 rounded-xl hover:bg-slate-300 transition-all disabled:opacity-50">
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading || !unitTitle.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                    >
                        {loading ? 'Adding...' : 'Add Unit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}