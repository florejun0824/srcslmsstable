import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { CheckIcon } from '@heroicons/react/24/solid';

// Button styles (matched to your other modals)
const primaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 disabled:opacity-50 active:scale-95";
const secondaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-900 bg-neumorphic-base rounded-full shadow-neumorphic hover:text-blue-600 transition-all disabled:opacity-50 active:scale-95";

// Reusable Neumorphic Checkbox
const NeumorphicCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    
    return (
        <div className="relative w-5 h-5 flex-shrink-0">
            <input 
                type="checkbox" 
                ref={ref} 
                checked={checked} 
                {...props} 
                className="sr-only peer" 
            />
            <span className="w-full h-full bg-neumorphic-base rounded-md shadow-neumorphic-inset flex items-center justify-center transition-all peer-checked:bg-blue-500 peer-checked:shadow-neumorphic">
                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
        </div>
    );
});


const ClassSelectionModal = ({ isOpen, onClose, onConfirm, allClasses, currentSelection }) => {
    const [tempSelection, setTempSelection] = useState(new Set());

    // Sync temp state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTempSelection(new Set(currentSelection));
        }
    }, [isOpen, currentSelection]);

    // Handler to toggle a single item
    const handleToggleItem = (itemId) => {
        setTempSelection(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Handler to toggle all classes
    const handleToggleAll = () => {
        const allClassIds = allClasses.map(c => c.value);
        const allSelected = allClassIds.length > 0 && allClassIds.every(id => tempSelection.has(id));

        setTempSelection(prevSet => {
            const newSet = new Set(prevSet);
            if (allSelected) {
                // Deselect all
                allClassIds.forEach(id => newSet.delete(id));
            } else {
                // Select all
                allClassIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    // Confirm selection and close
    const handleDone = () => {
        onConfirm(Array.from(tempSelection));
        onClose();
    };

    // Memoize the content to prevent re-renders on selection change
    const modalContent = useMemo(() => {
        const allClassIds = allClasses.map(c => c.value);
        const selectedCount = allClassIds.filter(id => tempSelection.has(id)).length;
        
        const isAllSelected = allClassIds.length > 0 && selectedCount === allClassIds.length;
        const isPartiallySelected = selectedCount > 0 && !isAllSelected;

        return (
            <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic mb-4 overflow-hidden">
                {/* Header with Select All */}
                <header className="flex items-center gap-3 p-4 border-b border-black/10">
                    <NeumorphicCheckbox
                        checked={isAllSelected}
                        indeterminate={isPartiallySelected}
                        onChange={handleToggleAll}
                        aria-label="Select all classes"
                    />
                    <label
                        onClick={handleToggleAll}
                        className="font-semibold text-gray-900 cursor-pointer select-none flex-grow"
                    >
                        Select All
                        <span className="text-gray-500 font-normal ml-2">
                            ({selectedCount}/{allClassIds.length})
                        </span>
                    </label>
                </header>
                
                {/* Class List */}
                <ul className="max-h-[500px] overflow-y-auto">
                    {allClasses.map(({ value, label }, index) => {
                        const isSelected = tempSelection.has(value);
                        return (
                            <li
                                key={value}
                                // CLICK BUG FIX: This onClick on the <li> is the main tap target
                                onClick={() => handleToggleItem(value)}
                                className={`flex items-center justify-between p-4 pl-5 cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-blue-500/10' : 'hover:bg-black/5'} ${index > 0 ? 'border-t border-black/5' : ''}`}
                            >
                                <div className="flex items-center gap-4 cursor-pointer w-full">
                                    <NeumorphicCheckbox
                                        id={`item-${value}`}
                                        checked={isSelected}
                                        readOnly
                                        // Make checkbox respond to parent click
                                        className="pointer-events-none" 
                                    />
                                    <label
                                        htmlFor={`item-${value}`}
                                        // Make label respond to parent click
                                        className="text-gray-800 flex-grow mr-4 select-none pointer-events-none"
                                    >
                                        {label}
                                    </label>
                                </div>
                                {isSelected && <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                            </li>
                        );
                    })}
                    {allClasses.length === 0 && (
                        <li className="p-8 text-center text-gray-500">
                            No classes found.
                        </li>
                    )}
                </ul>
            </div>
        );
    }, [allClasses, tempSelection]); // Re-compute when these change

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Classes"
            description={`Choose which classes to share with. (${tempSelection.size} selected)`}
            size="3xl"
            contentClassName="bg-neumorphic-base"
        >
            <div className="flex flex-col h-[75vh]">
                <main className="flex-grow p-2 -m-2 overflow-y-auto rounded-2xl shadow-neumorphic-inset bg-neumorphic-base">
                    <div className="p-2">
                        {modalContent}
                    </div>
                </main>

                {/* Footer with Buttons */}
                <footer className="flex-shrink-0 pt-5 mt-5 border-t border-black/10">
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
                        <button onClick={handleDone} className={primaryButtonStyles}>
                            Done
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default ClassSelectionModal;