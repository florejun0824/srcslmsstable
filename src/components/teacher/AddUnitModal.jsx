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

    const primaryButtonStyles =
        "flex items-center justify-center gap-2 px-5 py-2.5 text-base font-bold text-white bg-blue-600 rounded-xl shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500 transition-all duration-200 disabled:opacity-50 active:scale-95";
    const secondaryButtonStyles =
        "px-5 py-2.5 text-base font-semibold text-gray-900 bg-neumorphic-base rounded-xl shadow-neumorphic hover:text-blue-600 dark:bg-neumorphic-base-dark dark:text-slate-200 dark:shadow-lg dark:hover:text-blue-400 dark:active:shadow-neumorphic-inset-dark transition-all disabled:opacity-50 active:scale-95";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Add New Unit"
            description="Organize lessons within a new unit."
            contentClassName="bg-neumorphic-base dark:bg-neumorphic-base-dark"
        >
            <form 
                onSubmit={(e) => { 
                    e.preventDefault(); 
                    handleAddUnit(); 
                }} 
                className="space-y-6"
            >
                <div>
                    <label 
                        htmlFor="unit-title" 
                        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                        Unit Title
                    </label>
                    <input
                        id="unit-title"
                        value={unitTitle}
                        onChange={(e) => setUnitTitle(e.target.value)}
                        placeholder="e.g., Unit 1: The Cell"
                        className="w-full p-3 mt-2 border-none rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark focus:ring-0 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                        aria-invalid={!!error}
                        aria-describedby="unit-error"
                    />
                    {error && (
                        <p 
                            id="unit-error" 
                            className="text-sm text-red-600 dark:text-red-400 mt-2"
                        >
                            {error}
                        </p>
                    )}
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={handleClose} 
                        disabled={loading} 
                        className={secondaryButtonStyles}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading || !unitTitle.trim()}
                        className={primaryButtonStyles}
                    >
                        {loading ? 'Adding...' : 'Add Unit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
