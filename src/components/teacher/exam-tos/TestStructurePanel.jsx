import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { 
    PlusIcon, 
    TrashIcon, 
    SquaresPlusIcon, 
    ChevronUpDownIcon, 
    CheckIcon,
    ExclamationCircleIcon,
    ListBulletIcon
} from '@heroicons/react/24/outline';

const TEST_OPTIONS = [
    "Multiple Choice", "Matching Type", "Alternative Response", 
    "Identification", "Solving", "Essay", "Analogy", "Interpretive"
];

export default function TestStructurePanel({ testTypes, onTestTypeChange, onAddTestType, onRemoveTestType, totalConfiguredItems, themeStyles }) {
    
    return (
        /* 1. REMOVED overflow-hidden from here to prevent clipping the dropdown */
        <div 
            className="relative rounded-[24px] md:rounded-[32px] p-5 md:p-8 transition-all duration-500 border shadow-sm group bg-white dark:bg-slate-900"
            style={{ 
                borderColor: themeStyles?.outline || themeStyles?.borderColor || 'rgba(226, 232, 240, 0.8)', 
                backgroundColor: themeStyles?.innerPanelBg || 'rgba(255, 255, 255, 0.8)' 
            }}
        >
            {/* 2. Dedicated Background Layer: Handles the glow and clipping without affecting the dropdown */}
            <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-sky-500/5 dark:bg-sky-500/10 blur-[40px] rounded-full group-hover:scale-125 transition-transform duration-700"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6 md:mb-8">
                    <div className="flex flex-col">
                        <h3 className="text-base md:text-xl font-black flex items-center gap-3 tracking-tight shrink-0" style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>
                            <div 
                                className="p-2 rounded-[12px] shadow-inner flex items-center justify-center border border-current/20 shrink-0" 
                                style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}
                            >
                                <ListBulletIcon className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
                            </div>
                            Test Structure
                        </h3>
                        <p className="text-[10px] md:text-xs mt-1.5 font-bold uppercase tracking-widest opacity-50 ml-1" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>
                            Define Exam Components
                        </p>
                    </div>

                    <button
                        onClick={onAddTestType}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 border-t border-white/20"
                        style={{ 
                            backgroundColor: themeStyles?.primary || '#2563eb', 
                            color: '#ffffff',
                            boxShadow: `0 8px 20px -4px ${themeStyles?.primary ? `${themeStyles.primary}40` : 'rgba(37, 99, 235, 0.4)'}`
                        }}
                    >
                        <PlusIcon className="w-4 h-4 stroke-[3]" />
                        <span>Add</span>
                    </button>
                </div>

                {/* Rows Container */}
                <div className="space-y-4 flex-1">
                    {testTypes.map((test, index) => (
                        <div 
                            key={index} 
                            className="flex flex-col sm:flex-row items-center gap-3 p-3 md:p-4 rounded-[20px] md:rounded-[24px] border transition-all animate-in fade-in slide-in-from-bottom-2" 
                            style={{ 
                                backgroundColor: themeStyles?.inputBg || 'rgba(0, 0, 0, 0.03)', 
                                borderColor: themeStyles?.outline || 'rgba(255, 255, 255, 0.1)' 
                            }}
                        >
                            {/* Custom Dropdown (Listbox) */}
                            <div className="w-full sm:flex-1 relative">
                                <Listbox value={test.type} onChange={val => onTestTypeChange(index, 'type', val)}>
                                    <div className="relative">
                                        <Listbox.Button 
                                            className="relative w-full cursor-pointer rounded-[14px] md:rounded-[16px] bg-white/60 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 py-3 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all active:scale-[0.99]"
                                            style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}
                                        >
                                            <span className="block truncate font-bold text-[13px] md:text-sm">{test.type}</span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <ChevronUpDownIcon className="h-4 h-4 opacity-50 stroke-[2.5]" aria-hidden="true" />
                                            </span>
                                        </Listbox.Button>
                                        
                                        {/* 3. TRANSITION FIX: Used absolute instead of fixed for better modal compatibility */}
                                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-[18px] bg-white dark:bg-slate-800 py-1 text-base shadow-[0_10px_40px_rgba(0,0,0,0.15)] ring-1 ring-black/5 focus:outline-none sm:text-sm z-[999] border border-slate-100 dark:border-slate-700">
                                                {TEST_OPTIONS.map((opt) => (
                                                    <Listbox.Option
                                                        key={opt}
                                                        className={({ active }) => `relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors ${active ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-900 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}
                                                        value={opt}
                                                    >
                                                        {({ selected }) => (
                                                            <>
                                                                <span className={`block truncate ${selected ? 'font-black text-sky-600' : 'font-semibold'}`}>{opt}</span>
                                                                {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sky-600"><CheckIcon className="h-4 h-4 stroke-[3]" /></span>}
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>
                            </div>

                            {/* Range Input */}
                            <div className="w-full sm:w-40 relative">
                                <input 
                                    type="text" 
                                    value={test.range} 
                                    onChange={e => onTestTypeChange(index, 'range', e.target.value)} 
                                    placeholder="Range (e.g., 1-10)" 
                                    className="w-full px-4 py-3 text-[13px] md:text-sm font-bold rounded-[14px] md:rounded-[16px] border bg-white/60 dark:bg-black/20 focus:ring-2 focus:outline-none transition-all shadow-inner" 
                                    style={{ 
                                        color: themeStyles?.primary || themeStyles?.accentText || '#0284c7', 
                                        borderColor: themeStyles?.outline || 'rgba(255, 255, 255, 0.1)',
                                        '--tw-ring-color': 'rgba(14, 165, 233, 0.2)'
                                    }} 
                                />
                            </div>

                            {/* Delete Button */}
                            <button 
                                onClick={() => onRemoveTestType(index)} 
                                className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white transition-all active:scale-90"
                            >
                                <TrashIcon className="w-5 h-5 stroke-[2.5]" />
                            </button>
                        </div>
                    ))}

                    {/* Empty State */}
                    {testTypes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 md:py-16 text-center bg-black/5 dark:bg-white/5 rounded-[24px] border border-dashed border-slate-200/50 dark:border-white/10">
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4">
                                <SquaresPlusIcon className="w-8 h-8 opacity-20" style={{ color: themeStyles?.onSurface || '#64748b' }} />
                            </div>
                            <p className="text-sm font-bold opacity-60" style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>No test types added yet</p>
                            <p className="text-[11px] mt-1 uppercase tracking-widest font-black opacity-30" style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>Tap "Add" to begin</p>
                        </div>
                    )}
                </div>

                {/* Footer Warning */}
                {totalConfiguredItems === 0 && testTypes.length > 0 && (
                    <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse">
                        <ExclamationCircleIcon className="w-5 h-5 shrink-0 stroke-[2.5]" />
                        <p className="text-[11px] md:text-xs font-black uppercase tracking-wider">
                            Configuration Warning: Total items is 0. Check your ranges.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}