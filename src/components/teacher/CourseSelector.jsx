import React, { useState, useEffect, Fragment } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
// --- MODIFIED: Added Headless UI and Heroicons ---
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

/**
 * A selector component for courses, fetching all courses from Firestore.
 *
 * @param {object} props - The component props.
 * @param {function} props.onCourseSelect - Callback function to be called when a course is selected.
 */
export default function CourseSelector({ onCourseSelect }) {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // --- MODIFIED: Store the full object, not just the ID. This works better with Listbox. ---
    const [selectedCourse, setSelectedCourse] = useState(null);

    // --- MODIFIED: Neumorphic input styles for the Listbox button ---
    const inputBaseStyles = "relative w-full cursor-default bg-slate-200 dark:bg-neumorphic-base-dark rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:shadow-neumorphic-inset-dark py-2.5 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm";

    useEffect(() => {
        const coursesQuery = query(collection(db, 'courses'));

        const unsubscribe = onSnapshot(
            coursesQuery,
            (snapshot) => {
                const coursesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                coursesData.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                setCourses(coursesData);
                setIsLoading(false);

                if (coursesData.length > 0) {
                    // --- MODIFIED: Set the full course object ---
                    const defaultCourse = coursesData[0];
                    setSelectedCourse(defaultCourse);
                    if (onCourseSelect) {
                        onCourseSelect(defaultCourse);
                    }
                } else {
                    setSelectedCourse(null);
                    if (onCourseSelect) {
                        onCourseSelect(null);
                    }
                }
            },
            (err) => {
                console.error("Failed to fetch courses:", err);
                setError("Failed to load courses. Please try again later.");
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [onCourseSelect]); // onCourseSelect is stable, this effect runs once.

    const handleSelectChange = (course) => {
        setSelectedCourse(course);
        if (onCourseSelect) {
            onCourseSelect(course);
        }
    };

    if (isLoading) {
        return <div className="text-center p-4 text-slate-500 dark:text-slate-400">Loading courses...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-600 dark:text-red-400">{error}</div>;
    }

    return (
        // --- MODIFIED: Added dark theme styles ---
        <div className="p-4 bg-slate-200 dark:bg-neumorphic-base-dark rounded-xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:shadow-lg w-full">
            {/* --- MODIFIED: Added dark theme text & border --- */}
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-100 mb-4 border-b pb-2 border-slate-300/70 dark:border-slate-700">Select a Subject</h2>
            {courses.length > 0 ? (
                <div>
                    {/* --- MODIFIED: Added dark theme text --- */}
                    <label htmlFor="course-select-button" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Choose a subject:
                    </label>
                    
                    {/* --- MODIFIED: Replaced <select> with <Listbox> --- */}
                    <Listbox value={selectedCourse} onChange={handleSelectChange}>
                        <div className="relative mt-1">
                            <Listbox.Button id="course-select-button" className={inputBaseStyles}>
                                <span className="block truncate text-slate-800 dark:text-slate-100">{selectedCourse?.title || "Select a subject"}</span>
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
                                    {courses.map((course) => (
                                        <Listbox.Option
                                            key={course.id}
                                            className={({ active }) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                    active ? 'bg-sky-100 text-sky-900 dark:bg-sky-800 dark:text-sky-100' : 'text-gray-900 dark:text-slate-100'
                                                }`
                                            }
                                            value={course}
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <span
                                                        className={`block truncate ${
                                                            selected ? 'font-medium' : 'font-normal'
                                                        }`}
                                                    >
                                                        {course.title}
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
                    {/* --- END OF REPLACEMENT --- */}

                </div>
            ) : (
                // --- MODIFIED: Added dark theme text ---
                <p className="text-sm text-slate-500 dark:text-slate-400">No subjects are currently available. Please create one first.</p>
            )}
        </div>
    );
}