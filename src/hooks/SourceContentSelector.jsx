import React, { useState, useEffect, Fragment } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../services/firebase';
// --- MODIFIED: Added Headless UI and Heroicons ---
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

/**
 * A selector component for lessons, filtered by a subjectId and supporting multiple selections.
 * Lessons are now grouped by their unitId, with the unit name displayed for better organization.
 *
 * @param {object} props - The component props.
 * @param {string} props.subjectId - The ID of the selected subject to filter lessons by.
 * @param {function} props.onLessonsSelect - Callback function to be called with an array of selected lessons.
 */
export default function SourceContentSelector({
    selectedSubjectId,
    handleSubjectChange, // This will now be called by the Listbox
    allSubjects,
    selectedUnitIds,
    handleUnitSelectionChange,
    unitsForSubject,
    loading,
}) {
    // --- MODIFIED: Neumorphic input styles for the Listbox button ---
    const neuInput = "relative w-full cursor-default bg-slate-200 dark:bg-neumorphic-base-dark rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:shadow-neumorphic-inset-dark py-2.5 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm";
    
    // Find the currently selected subject object from the ID
    const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId) || null;

    // This function adapts the Listbox's object output to the parent's ID-based handler
    const handleListboxChange = (subjectObject) => {
        if (handleSubjectChange) {
            // Create a synthetic event object to match what <select> would have provided
            handleSubjectChange({ target: { value: subjectObject.id } });
        }
    };

    return (
        <div className="space-y-5">
            {/* --- MODIFIED: Replaced <Selector> with <Listbox> --- */}
            <div>
                <Listbox value={selectedSubject} onChange={handleListboxChange} disabled={loading}>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Source Subject</label>
                    <div className="relative mt-1">
                        <Listbox.Button id="course-select-button" className={neuInput}>
                            <span className="block truncate text-slate-800 dark:text-slate-100">
                                {selectedSubject ? selectedSubject.title : (loading ? "Loading subjects..." : "Select a Source Subject")}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon
                                    className="h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                            </span>
                        </Listbox.Button>
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-slate-200 dark:bg-neumorphic-base-dark py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                {allSubjects.map((subject) => (
                                    <Listbox.Option
                                        key={subject.id}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                active ? 'bg-sky-100 text-sky-900 dark:bg-sky-800 dark:text-sky-100' : 'text-gray-900 dark:text-slate-100'
                                            }`
                                        }
                                        value={subject}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span
                                                    className={`block truncate ${
                                                        selected ? 'font-medium' : 'font-normal'
                                                    }`}
                                                >
                                                    {subject.title}
                                                </span>
                                                {selected ? (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sky-600 dark:text-sky-400">
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
            {/* --- END OF REPLACEMENT --- */}

            <div>
                {/* --- MODIFIED: Added dark theme text --- */}
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Select Units</label>
                {/* --- MODIFIED: Styled checkbox container --- */}
                <div className="mt-2 space-y-2 rounded-lg bg-slate-100 dark:bg-neumorphic-base-dark/50 shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:shadow-neumorphic-inset-dark p-3 max-h-48 overflow-y-auto">
                    {unitsForSubject.length > 0 ? (
                        unitsForSubject.map(unit => (
                            <label
                                key={unit.id}
                                // --- MODIFIED: Dark theme hover ---
                                className="flex items-center gap-3 rounded-md p-2.5 hover:bg-slate-200/60 dark:hover:bg-neumorphic-base-dark cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedUnitIds.has(unit.id)}
                                    onChange={() => handleUnitSelectionChange(unit.id)}
                                    // --- MODIFIED: Dark theme checkbox ---
                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-600"
                                />
                                {/* --- MODIFIED: Dark theme text --- */}
                                <span className="text-sm text-slate-700 dark:text-slate-300">{unit.title}</span>
                            </label>
                        ))
                    ) : (
                        // --- MODIFIED: Dark theme text ---
                        <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            {selectedSubjectId ? 'No units found in this subject.' : 'Select a subject to see units.'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};