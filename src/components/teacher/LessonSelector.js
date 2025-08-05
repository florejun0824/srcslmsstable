import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

/**
 * A selector component for lessons, filtered by a subjectId and supporting multiple selections.
 * Lessons are now grouped by their unitId, with the unit name displayed for better organization.
 *
 * @param {object} props - The component props.
 * @param {string} props.subjectId - The ID of the selected subject to filter lessons by.
 * @param {function} props.onLessonsSelect - Callback function to be called with an array of selected lessons.
 */
export default function LessonSelector({ subjectId, onLessonsSelect }) {
    const [allLessons, setAllLessons] = useState([]);
    const [units, setUnits] = useState({}); // New state for storing unit names
    const [selectedLessonIds, setSelectedLessonIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!subjectId) {
            setAllLessons([]);
            setUnits({});
            setSelectedLessonIds([]);
            setIsLoading(false);
            if (onLessonsSelect) onLessonsSelect([]);
            return;
        }

        const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
        const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));

        // Start a real-time listener for units
        const unsubscribeUnits = onSnapshot(
            unitsQuery,
            (snapshot) => {
                const unitsData = {};
                snapshot.docs.forEach(doc => {
                    unitsData[doc.id] = doc.data().title; // Map unitId to its title
                });
                setUnits(unitsData);
            },
            (err) => {
                console.error("Failed to fetch units:", err);
                setError("Failed to load unit names. Please try again later.");
                setIsLoading(false);
            }
        );

        // Start a real-time listener for lessons
        const unsubscribeLessons = onSnapshot(
            lessonsQuery,
            (snapshot) => {
                const lessonsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort lessons by order number to ensure correct display within units
                lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0));

                setAllLessons(lessonsData);
                setIsLoading(false);

                // Reset selected lessons when a new subject is chosen
                setSelectedLessonIds([]);
                if (onLessonsSelect) onLessonsSelect([]);
            },
            (err) => {
                console.error("Failed to fetch lessons:", err);
                setError("Failed to load lessons. Please try again later.");
                setIsLoading(false);
            }
        );

        // Unsubscribe from both listeners when the component unmounts
        return () => {
            unsubscribeUnits();
            unsubscribeLessons();
        };
    }, [subjectId, onLessonsSelect]);

    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        let newSelectedIds;
        if (checked) {
            newSelectedIds = [...selectedLessonIds, value];
        } else {
            newSelectedIds = selectedLessonIds.filter(id => id !== value);
        }
        setSelectedLessonIds(newSelectedIds);

        const selectedLessons = allLessons.filter(lesson => newSelectedIds.includes(lesson.id));
        if (onLessonsSelect) {
            onLessonsSelect(selectedLessons);
        }
    };

    // Group lessons by unitId for display
    const groupedLessons = allLessons.reduce((groups, lesson) => {
        const unitId = lesson.unitId || 'no_unit'; // Use 'no_unit' for lessons without a unitId
        if (!groups[unitId]) {
            groups[unitId] = [];
        }
        groups[unitId].push(lesson);
        return groups;
    }, {});
    
    // Sort the units based on the numerical part of the title
    const sortedUnitIds = Object.keys(groupedLessons).sort((a, b) => {
        const titleA = units[a] || '';
        const titleB = units[b] || '';

        // Extract the first number found in the title
        const numA = parseInt(titleA.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(titleB.match(/\d+/)?.[0] || '0', 10);

        // If both titles have numbers, sort numerically
        if (numA !== 0 && numB !== 0) {
            return numA - numB;
        }

        // Fallback: if one or neither has a number, sort alphabetically by title
        return titleA.localeCompare(titleB);
    });

    if (isLoading) {
        return <div className="text-center p-4 text-slate-500">Loading lessons...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-600">{error}</div>;
    }

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg w-full">
            <h2 className="text-base font-bold text-slate-700 mb-4 border-b pb-2">Select Lessons</h2>
            {allLessons.length > 0 ? (
                <div className="space-y-4">
                    {sortedUnitIds.map((unitId) => (
                        <div key={unitId} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <h3 className="font-semibold text-sm text-indigo-700 mb-2">
                                {units[unitId] ? `Unit: ${units[unitId]}` : `Unit ID: ${unitId}`}
                            </h3>
                            <div className="space-y-2">
                                {groupedLessons[unitId].map((lesson) => (
                                    <label key={lesson.id} className="flex items-center space-x-3 text-sm text-slate-700 p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            value={lesson.id}
                                            checked={selectedLessonIds.includes(lesson.id)}
                                            onChange={handleCheckboxChange}
                                            className="form-checkbox h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <span>{lesson.title}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-500">No lessons are currently available for this subject.</p>
            )}
        </div>
    );
}

