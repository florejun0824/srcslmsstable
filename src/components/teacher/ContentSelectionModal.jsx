import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { CheckIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon } from '@heroicons/react/24/solid';

// --- DESIGN SYSTEM CONSTANTS ---
// Buttons made slightly taller for easier mobile tapping
const primaryBtn = "w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-xl font-bold text-base sm:text-sm text-white shadow-lg shadow-blue-500/30 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-blue-400/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtn = "w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-xl font-bold text-base sm:text-sm text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/20 dark:border-white/5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50";

// Updated Checkbox: Larger on mobile (w-6 h-6) for better visibility/touch
const GroupCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    
    return (
        <div className="relative w-6 h-6 sm:w-5 sm:h-5 flex-shrink-0">
            <input 
                type="checkbox" 
                ref={ref} 
                checked={checked} 
                {...props} 
                className="sr-only peer" 
                readOnly 
            />
            <span className={`w-full h-full rounded-md border flex items-center justify-center transition-all duration-200 ${
                checked || indeterminate
                ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30' 
                : 'bg-white/50 dark:bg-white/5 border-slate-300 dark:border-slate-600 hover:border-blue-400'
            }`}>
                <CheckIcon className={`w-4 h-4 sm:w-3.5 sm:h-3.5 text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
            </span>
        </div>
    );
});

const ItemCheckbox = React.memo(({ checked, ...props }) => {
     return (
        <div className="relative w-6 h-6 sm:w-5 sm:h-5 flex-shrink-0">
            <input 
                type="checkbox" 
                checked={checked} 
                {...props} 
                className="sr-only peer" 
                readOnly 
            />
            <span className={`w-full h-full rounded-md border flex items-center justify-center transition-all duration-200 ${
                checked 
                ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30' 
                : 'bg-white/50 dark:bg-white/5 border-slate-300 dark:border-slate-600 hover:border-blue-400'
            }`}>
                <CheckIcon className={`w-4 h-4 sm:w-3.5 sm:h-3.5 text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
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
            // On mobile, maybe we want them collapsed by default to save scrolling? 
            // Keeping current behavior (all collapsed) for now.
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
                <div key={groupName} className="bg-white/60 dark:bg-[#1a1d24]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-2xl shadow-sm mb-3 sm:mb-4 overflow-hidden transition-all">
                    <header 
                        className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-4 cursor-pointer transition-colors touch-manipulation ${isCollapsed ? 'hover:bg-white/40 dark:hover:bg-white/5' : 'bg-white/40 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5'}`}
                        onClick={() => handleToggleCollapse(groupName)}
                    >
                        {/* Increased tap area for the group checkbox */}
                        <div 
                            className="flex-shrink-0 cursor-pointer p-2 -m-2 active:scale-95 transition-transform" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                handleToggleGroup(groupOptions); 
                            }}
                        >
                            <GroupCheckbox
                                checked={isAllSelected}
                                indeterminate={isPartiallySelected}
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 flex-grow select-none min-w-0">
                            {isCollapsed ? (
                                <FolderIcon className="w-6 h-6 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                            ) : (
                                <FolderOpenIcon className="w-6 h-6 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                            )}
                            
                            {/* Larger text on mobile */}
                            <span className="font-bold text-base sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                                {groupName}
                            </span>
                            
                            <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 ml-auto sm:ml-0 flex-shrink-0">
                                {selectedInGroup.length}/{groupIds.length}
                            </span>
                        </div>

                        <ChevronDownIcon className={`w-6 h-6 sm:w-5 sm:h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} />
                    </header>
                    
                    <ul className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'} overflow-y-auto bg-white/30 dark:bg-black/20`}>
                        {groupOptions.map(({ value, label }, index) => {
                            const isSelected = tempSelection.has(value);
                            return (
                                <li
                                    key={value}
                                    onClick={() => handleToggleItem(value)}
                                    // Mobile Optimization: 
                                    // 1. p-4 for larger hit area
                                    // 2. active:bg-blue-100 for feedback
                                    // 3. min-h-[3.5rem] guarantees standard mobile touch height
                                    className={`
                                        flex items-center justify-between 
                                        p-4 sm:p-3 sm:pl-5 
                                        min-h-[3.5rem] sm:min-h-0
                                        cursor-pointer transition-all 
                                        border-t border-transparent 
                                        ${index > 0 ? 'border-slate-100/50 dark:border-white/5' : ''} 
                                        ${isSelected ? 'bg-blue-50/80 dark:bg-blue-900/20' : 'hover:bg-white/50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10'}
                                    `}
                                >
                                    <div className="flex items-center gap-4 w-full min-w-0">
                                        <ItemCheckbox
                                            checked={isSelected}
                                        />
                                        {/* Text is base on mobile (16px), sm on desktop */}
                                        <span className={`text-base sm:text-sm font-medium truncate select-none ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {label}
                                        </span>
                                    </div>
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
            description={`Select content (${tempSelection.size} selected)`}
            
            size="screen" 
            // On mobile, we remove some of the heavy rounding or margins if needed, 
            // but keeping the large rounding usually looks like a "sheet".
            roundedClass="rounded-t-[2rem] sm:rounded-[2.5rem] !bg-white/90 dark:!bg-[#18181b]/95 !backdrop-blur-3xl !border !border-white/20 dark:!border-white/5 !shadow-2xl"
            containerClassName="h-full w-full bg-slate-900/40 backdrop-blur-md p-0 sm:p-6" 
            contentClassName="!p-0 h-full"
        >
            {/* Main Container: h-full ensures it uses all space on mobile */}
            <div className="relative h-full flex flex-col bg-white/50 dark:bg-transparent sm:rounded-b-[2.5rem]">
                
                {/* Scrollable Area */}
                <main className="flex-grow p-4 sm:p-8 overflow-y-auto custom-scrollbar overscroll-contain">
                    {/* Simplified grid for mobile (1 col) */}
                    <div className="flex flex-col space-y-2 pb-4">
                        {modalContent}
                    </div>
                </main>
                
                {/* Footer: Sticky bottom feeling on mobile */}
                <footer className="flex-shrink-0 py-4 px-6 sm:pt-6 sm:pb-8 sm:px-8 border-t border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl sm:backdrop-blur-md sm:rounded-b-[2.5rem] z-10">
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
                        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
                        <button onClick={handleDone} className={primaryBtn}>
                            Confirm ({tempSelection.size})
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default ContentSelectionModal;