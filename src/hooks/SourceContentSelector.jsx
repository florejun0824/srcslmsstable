import React from 'react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';

// Reusable dropdown component for selecting the subject
const Selector = ({ label, value, onChange, options, disabled = false, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled || !options.length}
                className={`
                    block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 
                    py-2.5 pl-4 pr-10 text-slate-900
                    focus:border-purple-500 focus:ring-2 focus:ring-purple-200
                    disabled:cursor-not-allowed disabled:bg-slate-200/80 disabled:text-slate-500
                    transition-colors
                `}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt.id} value={opt.id}>{opt.title}</option>)}
            </select>
            <ChevronUpDownIcon 
                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" 
                aria-hidden="true" 
            />
        </div>
    </div>
);


// Main component simplified to only handle unit selection
const SourceContentSelector = ({
    selectedSubjectId,
    handleSubjectChange,
    allSubjects,
    selectedUnitIds,
    handleUnitSelectionChange,
    unitsForSubject,
    loading,
}) => {
    return (
        <div className="space-y-5">
            <Selector
                label="Source Subject"
                value={selectedSubjectId}
                onChange={handleSubjectChange}
                options={allSubjects}
                placeholder={loading ? "Loading subjects..." : "Select a Source Subject"}
                disabled={loading}
            />

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Select Units</label>
                <div className="mt-2 space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-3 max-h-48 overflow-y-auto">
                    {unitsForSubject.length > 0 ? (
                        unitsForSubject.map(unit => (
                            <label
                                key={unit.id}
                                className="flex items-center gap-3 rounded-md p-2.5 hover:bg-slate-200/60 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedUnitIds.has(unit.id)}
                                    onChange={() => handleUnitSelectionChange(unit.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-slate-700">{unit.title}</span>
                            </label>
                        ))
                    ) : (
                        <p className="py-4 text-center text-xs text-slate-500">
                            {selectedSubjectId ? 'No units found in this subject.' : 'Select a subject to see units.'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SourceContentSelector;