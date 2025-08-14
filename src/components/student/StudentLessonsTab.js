import React, { useState, useEffect, useCallback } from 'react';
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'; // Added ArrowLeftIcon
import Spinner from '../common/Spinner';
import ViewLessonModal from './ViewLessonModal'; // Assuming correct path to ViewLessonModal
import LessonsByUnitView from './LessonsByUnitView'; // NEW: Import the new LessonsByUnitView component

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
            <h3 className="text-base font-semibold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2">{lesson.title}</h3> {/* MODIFIED: text-base font-semibold */}
            {lesson.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{lesson.description}</p>} {/* MODIFIED: text-sm */}
            {lesson.className && <p className="text-xs text-slate-400 mt-1">Class: {lesson.className}</p>} {/* KEPT: Class info for main list view */}
        </div>
        <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors">
            <ArrowRightIcon className="h-5 w-5" />
        </div>
    </div>
);


// MODIFIED: Simplified props - removed 'courses' and 'isFetchingCourses'
const StudentLessonsTab = ({ lessons = [], units = [], isFetchingUnits, setLessonToView, isFetchingContent }) => {
    const [lessonsByClass, setLessonsByClass] = useState({});
    const [selectedClassForLessons, setSelectedClassForLessons] = useState(null); // NEW: State to store the selected class for detailed view

    useEffect(() => {
        console.log("Lessons received in StudentLessonsTab:", lessons);
        // This effect runs whenever 'lessons' changes, re-grouping them by class.
        if (lessons.length > 0) {
            const groupedLessons = lessons.reduce((acc, lesson) => {
                const className = lesson.className || 'Uncategorized Class'; // Group by className
                if (!acc[className]) {
                    acc[className] = {
                        id: lesson.classId, // Store classId for navigation
                        name: className,
                        lessons: []
                    };
                }
                acc[className].lessons.push(lesson);
                return acc;
            }, {});

            // Sort lessons within each class for consistent display
            Object.keys(groupedLessons).forEach(className => {
                groupedLessons[className].lessons.sort((a, b) => {
                    const orderA = a.order ?? Infinity;
                    const orderB = b.order ?? Infinity;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.title.localeCompare(b.title, 'en-US', { numeric: true });
                });
            });
            setLessonsByClass(groupedLessons);

        } else {
            setLessonsByClass({});
        }
    }, [lessons]); // Dependency on 'lessons' only

    const handleClassCardClick = (classData) => {
        setSelectedClassForLessons(classData);
    };

    const handleBackToClassList = () => {
        setSelectedClassForLessons(null);
    };


    if (isFetchingContent || isFetchingUnits) { // Show spinner if content or units are fetching
        return (
            <div className="flex justify-center items-center py-24">
                <Spinner />
            </div>
        );
    }

    if (selectedClassForLessons) {
        // Filter lessons for the selected class before passing them
        const lessonsForSelectedClass = lessons.filter(lesson => lesson.classId === selectedClassForLessons.id);
        return (
            <LessonsByUnitView
                selectedClass={selectedClassForLessons}
                lessons={lessonsForSelectedClass}
                units={units}
                onBack={handleBackToClassList}
                setLessonToView={setLessonToView}
            />
        );
    }

    const sortedClassNames = Object.keys(lessonsByClass).sort();

    return (
        <div className="min-h-[60vh]">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-6">All Lessons</h2>
            <p className="text-lg text-slate-600 mb-8">Select a class to view its lessons grouped by unit.</p>

            {sortedClassNames.length > 0 ? (
                <div className="space-y-4"> {/* Reduced space-y from 6 to 4 for compactness */}
                    {sortedClassNames.map(className => {
                        const classData = lessonsByClass[className];
                        return (
                            <div
                                key={classData.id || className} // Use classData.id if available, otherwise className
                                className="group relative p-4 rounded-2xl bg-white shadow-md border border-gray-100
                                           hover:bg-blue-50 hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer flex flex-col items-start"
                                onClick={() => handleClassCardClick(classData)} // Make the whole card clickable
                            >
                                <div className="flex items-center justify-between w-full mb-3">
                                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-700 transition-colors"> {/* MODIFIED: text-lg font-semibold */}
                                        {classData.name} ({classData.lessons.length} lessons)
                                    </h3>
                                    <ArrowRightIcon className="h-6 w-6 text-slate-400 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-1" />
                                </div>
                                <p className="text-sm text-slate-500">Click to see lessons in this class.</p> {/* MODIFIED: text-sm */}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon={BookOpenIcon}
                    text="No lessons found across your classes."
                    subtext="Lessons will appear here once your teachers share them."
                    color="sky"
                />
            )}
            {/* View Lesson Modal will be rendered by LessonsByUnitView */}
        </div>
    );
};

export default StudentLessonsTab;
