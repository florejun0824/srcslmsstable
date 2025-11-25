import React, { useState, useEffect, Fragment } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

/**
 * A selector component for courses with "Clean Sheet" UI and Alphanumeric sorting.
 */
export default function CourseSelector({ onCourseSelect, selectedCourseId }) {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // iPadOS Input Style
    const inputBaseStyles = "relative w-full cursor-default bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 transition-all text-sm font-medium text-gray-900 dark:text-white";

    useEffect(() => {
        const coursesQuery = query(collection(db, 'courses'));

        const unsubscribe = onSnapshot(
            coursesQuery,
            (snapshot) => {
                const coursesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // --- ALPHANUMERIC SORTING ---
                // This handles "Math 1, Math 2, Math 10" correctly
                coursesData.sort((a, b) => 
                    (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' })
                );

                setCourses(coursesData);
                setIsLoading(false);

                if (coursesData.length > 0) {
                    // If a selectedCourseId is passed (e.g., from edit mode), try to find it
                    const preselected = selectedCourseId 
                        ? coursesData.find(c => c.id === selectedCourseId) 
                        : coursesData[0];
                        
                    const finalSelection = preselected || coursesData[0];
                    
                    setSelectedCourse(finalSelection);
                    if (onCourseSelect) onCourseSelect(finalSelection);
                } else {
                    setSelectedCourse(null);
                    if (onCourseSelect) onCourseSelect(null);
                }
            },
            (err) => {
                console.error("Failed to fetch courses:", err);
                setError("Failed to load courses.");
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [onCourseSelect, selectedCourseId]);

    const handleSelectChange = (course) => {
        setSelectedCourse(course);
        if (onCourseSelect) {
            onCourseSelect(course);
        }
    };

    if (isLoading) {
        return <div className="animate-pulse h-12 bg-gray-200 dark:bg-white/5 rounded-xl w-full"></div>;
    }

    if (error) {
        return <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center font-medium">{error}</div>;
    }

    return (
        <div className="w-full space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                Subject
            </label>
            
            {courses.length > 0 ? (
                <Listbox value={selectedCourse} onChange={handleSelectChange}>
                    <div className="relative">
                        <Listbox.Button className={inputBaseStyles}>
                            <span className="block truncate">{selectedCourse?.title || "Select a subject"}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                        </Listbox.Button>
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 py-1 text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm custom-scrollbar">
                                {courses.map((course) => (
                                    <Listbox.Option
                                        key={course.id}
                                        className={({ active }) =>
                                            `relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors ${
                                                active ? 'bg-blue-50 dark:bg-white/10 text-blue-900 dark:text-white' : 'text-gray-900 dark:text-gray-300'
                                            }`
                                        }
                                        value={course}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span className={`block truncate ${selected ? 'font-bold text-[#007AFF]' : 'font-normal'}`}>
                                                    {course.title}
                                                </span>
                                                {selected ? (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#007AFF]">
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
            ) : (
                <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-center text-sm text-gray-500 dark:text-gray-400">
                    No subjects found.
                </div>
            )}
        </div>
    );
}