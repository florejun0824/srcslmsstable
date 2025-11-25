import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

/**
 * A selector component for lessons with "Clean Sheet" UI and Alphanumeric sorting.
 */
export default function LessonSelector({ subjectId, onLessonsSelect, preselectedIds = [] }) {
    const [allLessons, setAllLessons] = useState([]);
    const [units, setUnits] = useState({});
    const [selectedLessonIds, setSelectedLessonIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sync preselectedIds (e.g. for edit mode)
    useEffect(() => {
        if(preselectedIds.length > 0) {
            setSelectedLessonIds(preselectedIds);
        }
    }, [preselectedIds]);

    useEffect(() => {
        if (!subjectId) {
            setAllLessons([]);
            setUnits({});
            setSelectedLessonIds([]);
            setIsLoading(false);
            if (onLessonsSelect) onLessonsSelect([]);
            return;
        }

        setIsLoading(true);
        const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
        const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));

        const unsubscribeUnits = onSnapshot(unitsQuery, (snapshot) => {
            const unitsData = {};
            snapshot.docs.forEach(doc => {
                unitsData[doc.id] = doc.data().title;
            });
            setUnits(unitsData);
        }, (err) => setError("Failed to load units."));

        const unsubscribeLessons = onSnapshot(lessonsQuery, (snapshot) => {
            const lessonsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Sort lessons alphanumerically by title (Lesson 1, Lesson 2, Lesson 10)
            lessonsData.sort((a, b) => 
                (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' })
            );

            setAllLessons(lessonsData);
            setIsLoading(false);
        }, (err) => {
            setError("Failed to load lessons.");
            setIsLoading(false);
        });

        return () => {
            unsubscribeUnits();
            unsubscribeLessons();
        };
    }, [subjectId]);

    // Notify parent whenever selection changes
    useEffect(() => {
        if (!isLoading && onLessonsSelect) {
            const selectedObjects = allLessons.filter(l => selectedLessonIds.includes(l.id));
            onLessonsSelect(selectedObjects);
        }
    }, [selectedLessonIds, allLessons, isLoading]);

    const toggleLesson = (lessonId) => {
        setSelectedLessonIds(prev => {
            if (prev.includes(lessonId)) {
                return prev.filter(id => id !== lessonId);
            } else {
                return [...prev, lessonId];
            }
        });
    };

    const toggleUnit = (unitId, lessonIdsInUnit) => {
        const allSelected = lessonIdsInUnit.every(id => selectedLessonIds.includes(id));
        
        if (allSelected) {
            // Deselect all in unit
            setSelectedLessonIds(prev => prev.filter(id => !lessonIdsInUnit.includes(id)));
        } else {
            // Select all in unit
            const newIds = new Set([...selectedLessonIds, ...lessonIdsInUnit]);
            setSelectedLessonIds(Array.from(newIds));
        }
    };

    // Group lessons
    const groupedLessons = allLessons.reduce((groups, lesson) => {
        const unitId = lesson.unitId || 'no_unit';
        if (!groups[unitId]) groups[unitId] = [];
        groups[unitId].push(lesson);
        return groups;
    }, {});
    
    // Sort Unit IDs Alphanumerically based on Unit Title
    const sortedUnitIds = Object.keys(groupedLessons).sort((a, b) => {
        const titleA = units[a] || 'Untitled';
        const titleB = units[b] || 'Untitled';
        return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (isLoading) return <div className="animate-pulse h-32 bg-gray-200 dark:bg-white/5 rounded-xl w-full"></div>;
    if (error) return <div className="text-sm text-red-500 text-center py-4">{error}</div>;

    return (
        <div className="w-full flex flex-col h-full max-h-[400px]">
            <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Select Lessons
                </label>
                <span className="text-xs font-medium text-[#007AFF]">
                    {selectedLessonIds.length} selected
                </span>
            </div>

            {allLessons.length > 0 ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-6">
                    {sortedUnitIds.map((unitId) => {
                        const lessonsInUnit = groupedLessons[unitId];
                        const unitLessonIds = lessonsInUnit.map(l => l.id);
                        const isUnitAllSelected = unitLessonIds.every(id => selectedLessonIds.includes(id));
                        const isUnitIndeterminate = !isUnitAllSelected && unitLessonIds.some(id => selectedLessonIds.includes(id));

                        return (
                            <div key={unitId} className="space-y-2">
                                {/* Unit Header */}
                                <div className="flex items-center justify-between group cursor-pointer" onClick={() => toggleUnit(unitId, unitLessonIds)}>
                                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        {units[unitId] ? units[unitId] : 'Unassigned Lessons'}
                                    </h3>
                                    <div className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${isUnitAllSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                                        {isUnitAllSelected ? 'All Selected' : 'Select All'}
                                    </div>
                                </div>

                                {/* Lesson Rows */}
                                <div className="space-y-1">
                                    {lessonsInUnit.map((lesson) => {
                                        const isSelected = selectedLessonIds.includes(lesson.id);
                                        return (
                                            <div 
                                                key={lesson.id} 
                                                onClick={() => toggleLesson(lesson.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                                    isSelected 
                                                    ? 'bg-white dark:bg-[#2C2C2E] border-[#007AFF] dark:border-[#007AFF] shadow-sm ring-1 ring-[#007AFF]/20' 
                                                    : 'bg-white dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                                    isSelected 
                                                    ? 'bg-[#007AFF] border-[#007AFF]' 
                                                    : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                    )}
                                                </div>
                                                <span className={`text-sm font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                    {lesson.title}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-8 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-center flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No lessons available.</p>
                </div>
            )}
        </div>
    );
}