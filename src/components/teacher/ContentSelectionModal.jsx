import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

// Button styles (can be imported or defined here)
const primaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 disabled:opacity-50 active:scale-95";
const secondaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-900 bg-neumorphic-base rounded-full shadow-neumorphic hover:text-blue-600 transition-all disabled:opacity-50 active:scale-95";

// Checkbox component to handle indeterminate state
const GroupCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    
    // --- UI REFINEMENT ---
    // Styled to match the neumorphic aesthetic
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

// --- UI REFINEMENT ---
// Re-styled item checkbox
const ItemCheckbox = React.memo(({ checked, ...props }) => {
     return (
        <div className="relative w-5 h-5 flex-shrink-0">
            <input 
                type="checkbox" 
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


const ContentSelectionModal = ({ isOpen, onClose, onConfirm, title, options, currentSelection }) => {
    const [tempSelection, setTempSelection] = useState(new Set());
    // --- UI REFINEMENT ---
    // State to manage collapsed units
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    // Sync temp state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTempSelection(new Set(currentSelection));
            // --- MODIFICATION ---
            // Get all group names and set them as collapsed by default
            const allGroupNames = Object.keys(options);
            setCollapsedGroups(new Set(allGroupNames)); 
        }
    }, [isOpen, currentSelection, options]); // Add 'options' to dependency array

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

    // Handler to toggle an entire group (unit)
    const handleToggleGroup = (groupOptions) => {
        const groupIds = groupOptions.map(opt => opt.value);
        if (groupIds.length === 0) return;

        const allSelectedInGroup = groupIds.every(id => tempSelection.has(id));

        setTempSelection(prevSet => {
            const newSet = new Set(prevSet);
            if (allSelectedInGroup) {
                // Deselect all in this group
                groupIds.forEach(id => newSet.delete(id));
            } else {
                // Select all in this group
                groupIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };
    
    // --- UI REFINEMENT ---
    // Handler to collapse/expand a group
    const handleToggleCollapse = (groupName) => {
        setCollapsedGroups(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(groupName)) {
                newSet.delete(groupName);
            } else {
                newSet.add(groupName);
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
        // --- UI REFINEMENT ---
        // Sort groups to put "Uncategorized" last
        const sortedGroupNames = Object.keys(options).sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b, undefined, { numeric: true });
        });

        return sortedGroupNames.map((groupName) => {
            const groupOptions = options[groupName];
            if (!groupOptions || groupOptions.length === 0) return null; // Add guard for empty/undefined options

            const groupIds = groupOptions.map(opt => opt.value);
            const selectedInGroup = groupIds.filter(id => tempSelection.has(id));
            const isAllSelected = selectedInGroup.length === groupIds.length;
            const isPartiallySelected = selectedInGroup.length > 0 && !isAllSelected;
            const isCollapsed = collapsedGroups.has(groupName); // Check if collapsed

            return (
                // --- UI REFINEMENT ---
                // Use neumorphic styles for the group container
                <div key={groupName} className="bg-neumorphic-base rounded-2xl shadow-neumorphic mb-4 overflow-hidden">
                    {/* Group Header */}
                    <header className="flex items-center gap-3 p-4 border-b border-black/10">
                        <GroupCheckbox
                            checked={isAllSelected}
                            indeterminate={isPartiallySelected}
                            onChange={() => handleToggleGroup(groupOptions)}
                            aria-label={`Select all in ${groupName}`}
                        />
                        <label
                            onClick={() => handleToggleGroup(groupOptions)}
                            className="font-semibold text-gray-900 cursor-pointer select-none flex-grow"
                        >
                            {groupName} 
                            <span className="text-gray-500 font-normal ml-2">
                                ({selectedInGroup.length}/{groupIds.length})
                            </span>
                        </label>
                         {/* Collapse Button */}
                        <button
                            onClick={() => handleToggleCollapse(groupName)}
                            className="p-2 rounded-full hover:shadow-neumorphic-inset transition-shadow"
                            aria-label={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
                        >
                            <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                        </button>
                    </header>
                    
                    {/* Group Items: Use CSS for collapse/expand */}
                    <ul className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'} overflow-y-auto`}>
                        {groupOptions.map(({ value, label }, index) => {
                            const isSelected = tempSelection.has(value);
                            return (
                                <li
                                    key={value}
                                    onClick={() => handleToggleItem(value)}
                                    className={`flex items-center justify-between p-4 pl-5 cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-blue-500/10' : 'hover:bg-black/5'} ${index > 0 ? 'border-t border-black/5' : ''}`}
                                >
                                    <label htmlFor={`item-${value}`} className="flex items-center gap-4 cursor-pointer w-full">
                                        <ItemCheckbox
                                            id={`item-${value}`}
                                            checked={isSelected}
                                            readOnly
                                        />
                                        <span className="text-gray-800 flex-grow mr-4 select-none">{label}</span>
                                    </label>
                                    {isSelected && <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            );
        });
    }, [options, tempSelection, collapsedGroups]); // Re-compute when these change

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={`Select the content you want to share. (${tempSelection.size} selected)`}
            size="3xl" // This will be large on desktop, full-screen on mobile
            // --- UI REFINEMENT ---
            // Use neumorphic background for the modal content
            contentClassName="bg-neumorphic-base"
        >
            <div className="flex flex-col h-[75vh]"> {/* Fixed height for modal content area */}
                
                {/* Scrollable Content Area */}
                {/* --- UI REFINEMENT --- */}
                {/* Added padding and neumorphic inset shadow for the scroll area */}
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

export default ContentSelectionModal;