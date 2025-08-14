import React, { useState, useEffect } from 'react';
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';
import ViewLessonModal from './ViewLessonModal'; // Assuming correct path to ViewLessonModal

// Helper component for Empty State (can be reused from StudentLessonsTab if desired)
const EmptyState = ({ icon: Icon, text, subtext, color }) => (
    <div className={`text-center py-12 px-4 bg-${color}-50/50 rounded-xl shadow-inner border border-${color}-200`}>
        <Icon className={`h-16 w-16 mb-4 text-${color}-300 mx-auto`} />
        <p className={`text-xl font-semibold text-${color}-600`}>{text}</p>
        <p className={`mt-2 text-md text-${color}-400`}>{subtext}</p>
    </div>
);

// Helper component for Lesson List Item (reused from StudentClassDetailView)
const LessonListItemForStudent = ({ lesson, onClick }) => (
    <div className="group relative p-4 sm:p-5 rounded-2xl bg-white hover:bg-sky-50 shadow-md border border-sky-200 transition-all duration-300 cursor-pointer flex items-center space-x-4 sm:space-x-5 hover:shadow-lg hover:scale-[1.005]" onClick={onClick}>
        <div className="flex-shrink-0 p-2.5 sm:p-3 rounded-full bg-sky-100 group-hover:bg-sky-200 transition-colors">
            <SparklesIcon className="h-6 w-6 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2">{lesson.title}</h3> {/* MODIFIED: text-sm font-semibold */}
            {lesson.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{lesson.description}</p>}
        </div>
        <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors">
            <ArrowRightIcon className="h-5 w-5" />
        </div>
    </div>
);

/**
 * Displays lessons grouped by unit for a specific class.
 *
 * @param {object} props - The component props.
 * @param {object} props.selectedClass - The class object for which to display lessons.
 * @param {Array<object>} props.lessons - All lessons associated with the selectedClass.
 * @param {Array<object>} props.units - All global unit data from Firestore.
 * @param {function} props.onBack - Callback to return to the previous view (class list).
 * @param {function} props.setLessonToView - Function to set the lesson for the modal.
 */
const LessonsByUnitView = ({ selectedClass, lessons, units, onBack, setLessonToView }) => {
    const [lessonsByUnit, setLessonsByUnit] = useState({});
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());
    const [viewLessonData, setViewLessonData] = useState(null); // Local state for the modal

    useEffect(() => {
        console.log("LessonsByUnitView - selectedClass:", selectedClass);
        console.log("LessonsByUnitView - lessons for this class:", lessons);
        console.log("LessonsByUnitView - all units:", units);

        if (lessons.length > 0 && units.length > 0) {
            const unitsMap = new Map(units.map(unit => [unit.id, unit.title]));

            const grouped = lessons.reduce((acc, lesson) => {
                const unitTitle = unitsMap.get(lesson.unitId) || 'Uncategorized Unit';
                console.log(`Lesson: ${lesson.title}, unitId: ${lesson.unitId}, Found Unit Title: ${unitsMap.get(lesson.unitId)}, Grouped As: ${unitTitle}`);

                if (!acc[unitTitle]) {
                    acc[unitTitle] = [];
                }
                acc[unitTitle].push(lesson);
                return acc;
            }, {});

            // Sort lessons within each unit
            Object.keys(grouped).forEach(unitTitle => {
                grouped[unitTitle].sort((a, b) => {
                    const orderA = a.order ?? Infinity;
                    const orderB = b.order ?? Infinity;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.title.localeCompare(b.title, 'en-US', { numeric: true });
                });
            });

            setLessonsByUnit(grouped);
            // Collapse all units by default when data loads
            setCollapsedUnits(new Set(Object.keys(grouped)));

        } else if (lessons.length > 0 && units.length === 0) {
            console.warn("Lessons for selected class found, but no units loaded. Grouping all lessons as 'Uncategorized Unit'.");
            const grouped = { 'Uncategorized Unit': [...lessons] };
            grouped['Uncategorized Unit'].sort((a, b) => {
                const orderA = a.order ?? Infinity;
                const orderB = b.order ?? Infinity;
                if (orderA !== orderB) return orderA - orderB;
                return a.title.localeCompare(b.title, 'en-US', { numeric: true });
            });
            setLessonsByUnit(grouped);
            setCollapsedUnits(new Set(['Uncategorized Unit']));
        }
        else {
            setLessonsByUnit({});
            setCollapsedUnits(new Set());
        }
    }, [lessons, units]); // Dependencies on lessons (for the class) and all units

    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) {
                newSet.delete(unitTitle);
            } else {
                newSet.add(unitTitle);
            }
            return newSet;
        });
    };

    const handleLessonClick = (lesson) => {
        setViewLessonData(lesson); // Use local state for modal
        setLessonToView(lesson); // Also call the parent's handler if needed
    };

    const closeLessonModal = () => {
        setViewLessonData(null); // Clear local state to close modal
        setLessonToView(null); // Clear parent's state
    };

    const sortedUnitTitles = Object.keys(lessonsByUnit).sort();

    return (
        <div className="min-h-[60vh]">
            <button
                onClick={onBack}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6 font-semibold text-sm group"
            >
                <ArrowLeftIcon className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" /> Back to All Classes
            </button>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Lessons for {selectedClass.name}</h2>
            <p className="text-lg text-slate-600 mb-8">Organized by unit for this class.</p>

            {sortedUnitTitles.length > 0 ? (
                <div className="space-y-3"> {/* Reduced space-y from 6 to 3 for compactness */}
                    {sortedUnitTitles.map(unitTitle => (
                        <div key={unitTitle} className="bg-white rounded-xl shadow-md border border-gray-100 animate-slideInUp">
                            <button
                                className="flex items-center justify-between w-full p-3 font-semibold text-base text-slate-800 bg-gradient-to-r from-teal-50 to-white hover:from-teal-100 rounded-t-xl transition-colors"
                                onClick={() => toggleUnitCollapse(unitTitle)}
                            >
                                {unitTitle}
                                {collapsedUnits.has(unitTitle) ? (
                                    <ChevronDownIcon className="h-6 w-6 text-slate-500" />
                                ) : (
                                    <ChevronUpIcon className="h-6 w-6 text-slate-500" />
                                )}
                            </button>
                            {!collapsedUnits.has(unitTitle) && (
                                <div className="p-4 space-y-2 border-t border-slate-100"> {/* Reduced space-y from 4 to 2 */}
                                    {lessonsByUnit[unitTitle].map(lesson => (
                                        <LessonListItemForStudent key={lesson.id} lesson={lesson} onClick={() => handleLessonClick(lesson)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={BookOpenIcon}
                    text={`No lessons found for ${selectedClass.name}.`}
                    subtext="Lessons will appear here once your teacher shares them."
                    color="sky"
                />
            )}

            {/* View Lesson Modal */}
            <ViewLessonModal
                isOpen={!!viewLessonData}
                onClose={closeLessonModal}
                lesson={viewLessonData}
            />
        </div>
    );
};

export default LessonsByUnitView;