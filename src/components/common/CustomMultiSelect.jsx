// src/components/common/CustomMultiSelect.js
import React from 'react'; // No useState needed here anymore

import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/solid';

const CustomMultiSelect = ({ title, options, selectedValues, onSelectionChange, disabled, isOpen, onToggle }) => {
    // No internal isOpen state needed anymore, it comes from props
    // const [isOpen, setIsOpen] = useState(false); // REMOVED

    const selectedCount = selectedValues.length;
    const getButtonLabel = () => {
        if (selectedCount === 0) return `Select ${title}`;
        if (selectedCount === 1) return `1 ${title.slice(0, -1)} selected`;
        return `${selectedCount} ${title} selected`;
    };
    const isGrouped = typeof options === 'object' && !Array.isArray(options) && options !== null;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={onToggle} // Call the onToggle prop here
                disabled={disabled}
                className="relative w-full cursor-pointer rounded-lg bg-white py-2.5 pl-4 pr-10 text-left shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
            >
                <span className="block truncate">{getButtonLabel()}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>
            {isOpen && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {isGrouped ? (
                        Object.entries(options).map(([unit, items]) => (
                            <div key={unit}>
                                <h3 className="sticky top-0 bg-indigo-100/80 px-2 py-1.5 text-xs font-bold text-indigo-800 backdrop-blur-sm">{unit}</h3>
                                {items.map((option) => (
                                     <div key={option.value} onClick={() => onSelectionChange(option.value)} className="flex items-center gap-3 p-2 text-slate-800 hover:bg-indigo-200/50 cursor-pointer">
                                         <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-400 ml-2">{selectedValues.includes(option.value) && <CheckIcon className="h-3 w-3 text-indigo-600" />}</div>
                                         <span className="flex-1 text-sm font-medium">{option.label}</span>
                                     </div>
                                ))}
                            </div>
                        ))
                    ) : (
                        options.length > 0 ? options.map((option) => (
                             <div key={option.value} onClick={() => onSelectionChange(option.value)} className="flex items-center gap-3 p-2 text-slate-800 hover:bg-indigo-200/50 cursor-pointer">
                                 <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-400">{selectedValues.includes(option.value) && <CheckIcon className="h-3 w-3 text-indigo-600" />}</div>
                                 <span className="flex-1 text-sm font-medium">{option.label}</span>
                             </div>
                        )) : <p className="p-2 text-sm text-slate-500">No options available.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomMultiSelect;