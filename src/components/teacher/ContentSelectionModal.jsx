import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

const primaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500 transition-all duration-200 disabled:opacity-50 active:scale-95";
const secondaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-900 bg-neumorphic-base rounded-full shadow-neumorphic hover:text-blue-600 dark:bg-neumorphic-base-dark dark:text-slate-200 dark:shadow-lg dark:hover:text-blue-400 dark:active:shadow-neumorphic-inset-dark transition-all disabled:opacity-50 active:scale-95";

const GroupCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
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
            <span className="w-full h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-md shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark flex items-center justify-center transition-all peer-checked:bg-blue-500 peer-checked:dark:bg-blue-400 peer-checked:shadow-neumorphic peer-checked:dark:shadow-lg">
                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
        </div>
    );
});

const ItemCheckbox = React.memo(({ checked, ...props }) => {
     return (
        <div className="relative w-5 h-5 flex-shrink-0">
            <input 
                type="checkbox" 
                checked={checked} 
                {...props} 
                className="sr-only peer" 
            />
            <span className="w-full h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-md shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark flex items-center justify-center transition-all peer-checked:bg-blue-500 peer-checked:dark:bg-blue-400 peer-checked:shadow-neumorphic peer-checked:dark:shadow-lg">
                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
        </div>
    );
});

const ContentSelectionModal = ({ isOpen, onClose, onConfirm, title, options, currentSelection }) => {
    const [tempSelection, setTempSelection] = useState(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    useEffect(() => {
        if (isOpen) {
            setTempSelection(new Set(currentSelection));
            const allGroupNames = Object.keys(options);
            setCollapsedGroups(new Set(allGroupNames)); 
        }
    }, [isOpen, currentSelection, options]);

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

    const handleToggleGroup = (groupOptions) => {
        const groupIds = groupOptions.map(opt => opt.value);
        if (groupIds.length === 0) return;

        const allSelectedInGroup = groupIds.every(id => tempSelection.has(id));

        setTempSelection(prevSet => {
            const newSet = new Set(prevSet);
            if (allSelectedInGroup) {
                groupIds.forEach(id => newSet.delete(id));
            } else {
                groupIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };
    
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

    const handleDone = () => {
        onConfirm(Array.from(tempSelection));
        onClose();
    };

    const modalContent = useMemo(() => {
        const normalize = str => str.toLowerCase().trim();

        const sortedGroupNames = Object.keys(options).sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return normalize(a).localeCompare(normalize(b), undefined, { numeric: true });
        });

        return sortedGroupNames.map((groupName) => {
            const groupOptions = options[groupName];
            if (!groupOptions || groupOptions.length === 0) return null;

            const groupIds = groupOptions.map(opt => opt.value);
            const selectedInGroup = groupIds.filter(id => tempSelection.has(id));
            const isAllSelected = selectedInGroup.length === groupIds.length;
            const isPartiallySelected = selectedInGroup.length > 0 && !isAllSelected;
            const isCollapsed = collapsedGroups.has(groupName);

            return (
                <div key={groupName} className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-lg mb-4 overflow-hidden">
                    <header className="flex items-center gap-3 p-4 border-b border-black/10 dark:border-slate-700">
                        <GroupCheckbox
                            checked={isAllSelected}
                            indeterminate={isPartiallySelected}
                            onChange={() => handleToggleGroup(groupOptions)}
                            aria-label={`Select all in ${groupName}`}
                        />
                        <label
                            onClick={() => handleToggleGroup(groupOptions)}
                            className="font-semibold text-gray-900 dark:text-slate-100 cursor-pointer select-none flex-grow"
                        >
                            {groupName} 
                            <span className="text-gray-500 dark:text-slate-400 font-normal ml-2">
                                ({selectedInGroup.length}/{groupIds.length})
                            </span>
                        </label>
                        <button
                            onClick={() => handleToggleCollapse(groupName)}
                            className="p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow"
                            aria-label={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
                        >
                            <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-slate-400 transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                        </button>
                    </header>
                    
                    <ul className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'} overflow-y-auto`}>
                        {groupOptions.map(({ value, label }, index) => {
                            const isSelected = tempSelection.has(value);
                            return (
							<li
							    key={value}
							    onClick={() => handleToggleItem(value)}
							    className={`flex items-center justify-between p-4 pl-5 cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-blue-500/10 dark:bg-blue-500/20' : 'hover:bg-black/5 dark:hover:bg-white/5'} ${index > 0 ? 'border-t border-black/5 dark:border-slate-700/50' : ''}`}
							>
							    <div className="flex items-center gap-4 w-full">
							        <ItemCheckbox
							            checked={isSelected}
							            readOnly
							        />
							        <span className="text-gray-800 dark:text-slate-200 flex-grow mr-4 select-none">{label}</span>
							    </div>
							    {isSelected && <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
							</li>
                            );
                        })}
                    </ul>
                </div>
            );
        });
    }, [options, tempSelection, collapsedGroups]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={`Select the content you want to share. (${tempSelection.size} selected)`}
            size="3xl"
            contentClassName="bg-neumorphic-base dark:bg-neumorphic-base-dark"
        >
            <div className="flex flex-col h-[75vh]">
                <main className="flex-grow p-2 -m-2 overflow-y-auto rounded-2xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark">
                    <div className="p-2">
                        {modalContent}
                    </div>
                </main>
                <footer className="flex-shrink-0 pt-5 mt-5 border-t border-black/10 dark:border-slate-700">
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
