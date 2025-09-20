import React, { useState } from 'react';
import Modal from '../common/Modal';

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

        try {
            const unitData = {
                title: unitTitle,
                subjectId: subjectId,
                createdAt: new Date(),
            };
            await onCreateUnit(unitData);
        } catch (err) {
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

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Add New Unit"
            description="Organize lessons within a new unit."
        >
            <form onSubmit={(e) => { e.preventDefault(); handleAddUnit(); }} className="space-y-6">
                <div>
                    <label htmlFor="unit-title" className="block text-sm font-semibold text-slate-600">Unit Title</label>
                    <input
                        id="unit-title"
                        value={unitTitle}
                        onChange={(e) => setUnitTitle(e.target.value)}
                        placeholder="e.g., Unit 1: The Cell"
                        className="w-full p-3 mt-2 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 placeholder:text-slate-500"
                        aria-invalid={!!error}
                        aria-describedby="unit-error"
                    />
                    {error && <p id="unit-error" className="text-sm text-red-600 mt-2">{error}</p>}
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} disabled={loading} className="px-5 py-2.5 text-base font-semibold text-slate-700 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50">
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading || !unitTitle.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-base font-bold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50"
                    >
                        {loading ? 'Adding...' : 'Add Unit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}