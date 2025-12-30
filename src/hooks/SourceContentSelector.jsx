import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, Square2StackIcon } from '@heroicons/react/24/outline';

/**
 * One UI 8.5 Redesign of SourceContentSelector
 * - Updated: Circular checkboxes with animated fill and checkmark.
 */
export default function SourceContentSelector({
    selectedSubjectId,
    handleSubjectChange,
    allSubjects,
    selectedUnitIds,
    handleUnitSelectionChange,
    unitsForSubject,
    loading,
}) {
    // --- UI TOKENS ---
    const ui = {
        label: "block text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1",
        
        // Input Button
        inputBtn: `
            relative w-full cursor-pointer 
            bg-[#F7F9FC] dark:bg-[#2C2C2C] 
            hover:bg-[#EEF1F6] dark:hover:bg-[#343434]
            rounded-xl py-3 pl-4 pr-10 text-left 
            border border-transparent focus:border-blue-500/50
            focus:outline-none focus:ring-4 focus:ring-blue-500/10 
            transition-all duration-200
        `,
        inputText: "block truncate text-sm font-bold text-gray-900 dark:text-white",
        
        // Dropdown Panel
        dropdown: `
            absolute z-50 mt-2 max-h-60 w-full overflow-auto 
            rounded-2xl bg-white dark:bg-[#252525] 
            py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] 
            ring-1 ring-black/5 dark:ring-white/10 focus:outline-none
            custom-scrollbar
        `,
        
        // Unit Container
        unitWell: `
            mt-2 space-y-2 rounded-2xl 
            bg-[#F7F9FC] dark:bg-[#2C2C2C] 
            p-3 max-h-[280px] overflow-y-auto 
            custom-scrollbar border border-transparent
        `,
        
        // Checkbox Item Row
        unitItem: `
            group flex items-center gap-3 rounded-xl p-3 
            transition-all duration-200 cursor-pointer border border-transparent
            hover:bg-white hover:shadow-sm hover:border-gray-100
            dark:hover:bg-[#3A3A3A] dark:hover:border-white/5
        `,
        
        // CUSTOM CIRCULAR CHECKBOX
        checkbox: `
            appearance-none 
            h-6 w-6 rounded-full 
            border-2 border-gray-300 dark:border-gray-500 
            bg-white dark:bg-[#1E1E1E]
            checked:bg-blue-500 checked:border-blue-500 
            transition-all duration-200 ease-in-out cursor-pointer
        `,
        
        // Floating Checkmark Icon
        checkmarkIcon: `
            absolute pointer-events-none text-white 
            w-3.5 h-3.5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            transition-all duration-200 ease-[cubic-bezier(0.19,1,0.22,1)]
        `
    };

    const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId) || null;

    const handleListboxChange = (subjectObject) => {
        if (handleSubjectChange) {
            handleSubjectChange({ target: { value: subjectObject.id } });
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            
            {/* --- SUBJECT SELECTOR --- */}
            <div className="flex-none">
                <Listbox value={selectedSubject} onChange={handleListboxChange} disabled={loading}>
                    <div className="relative">
                        <Listbox.Label className={ui.label}>Source Subject</Listbox.Label>
                        <Listbox.Button className={ui.inputBtn}>
                            <span className={ui.inputText}>
                                {selectedSubject ? selectedSubject.title : (loading ? "Loading subjects..." : "Select Subject")}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                        </Listbox.Button>
                        
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-2"
                        >
                            <Listbox.Options className={ui.dropdown}>
                                {allSubjects.map((subject) => (
                                    <Listbox.Option
                                        key={subject.id}
                                        className={({ active }) =>
                                            `relative cursor-pointer select-none py-3 pl-10 pr-4 text-sm font-medium transition-colors ${
                                                active ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'
                                            }`
                                        }
                                        value={subject}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                                                    {subject.title}
                                                </span>
                                                {selected ? (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                                                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </div>

            {/* --- UNIT SELECTOR --- */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 px-1">
                    <label className={ui.label}>Select Units</label>
                    {selectedUnitIds.size > 0 && (
                        <span className="text-[0.65rem] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                            {selectedUnitIds.size} Selected
                        </span>
                    )}
                </div>
                
                <div className={ui.unitWell}>
                    {unitsForSubject.length > 0 ? (
                        unitsForSubject.map(unit => {
                            const isSelected = selectedUnitIds.has(unit.id);
                            return (
                                <label
                                    key={unit.id}
                                    className={`${ui.unitItem} ${isSelected ? 'bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#3A3A3A]' : ''}`}
                                >
                                    <div className="relative flex items-center justify-center">
                                        {/* Pure CSS Circular Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleUnitSelectionChange(unit.id)}
                                            className={ui.checkbox}
                                        />
                                        {/* Overlay Icon (Only visible when checked) */}
                                        <CheckIcon 
                                            strokeWidth={3}
                                            className={`${ui.checkmarkIcon} ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} 
                                        />
                                    </div>
                                    <span className={`text-sm select-none ${isSelected ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
                                        {unit.title}
                                    </span>
                                </label>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
                            <Square2StackIcon className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                {selectedSubjectId ? 'No units found' : 'Select a subject first'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};