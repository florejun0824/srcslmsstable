import React, { useState, useEffect } from 'react';
import { BookOpenIcon, ArrowRightIcon, Squares2X2Icon } from '@heroicons/react/24/solid'; // Updated to solid icons for consistency
import Spinner from '../common/Spinner';
import LessonsByUnitView from './LessonsByUnitView';

// --- iOS 26 Revamped Empty State ---
const EmptyState = ({ icon: Icon, text, subtext }) => (
    // iOS Vibe: Glassmorphism effect with a floating shadow
    <div className="text-center py-16 px-6 bg-white/50 backdrop-blur-2xl rounded-3xl shadow-lg-floating-sm border border-slate-200/80">
        <Icon className="h-16 w-16 mb-4 text-slate-400 mx-auto" />
        <p className="text-xl font-semibold text-slate-700">{text}</p>
        <p className="mt-2 text-md text-slate-500">{subtext}</p>
    </div>
);

// --- StudentLessonsTab Component ---
const StudentLessonsTab = ({ lessons = [], units = [], isFetchingUnits, setLessonToView, isFetchingContent }) => {
    const [lessonsByClass, setLessonsByClass] = useState({});
    const [selectedClassForLessons, setSelectedClassForLessons] = useState(null);

    useEffect(() => {
        // This effect runs whenever 'lessons' changes, re-grouping them by class.
        if (lessons.length > 0) {
            const groupedLessons = lessons.reduce((acc, lesson) => {
                const className = lesson.className || 'Uncategorized Class';
                if (!acc[className]) {
                    acc[className] = {
                        id: lesson.classId,
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
    }, [lessons]);

    const handleClassCardClick = (classData) => {
        setSelectedClassForLessons(classData);
    };

    const handleBackToClassList = () => {
        setSelectedClassForLessons(null);
    };


    if (isFetchingContent || isFetchingUnits) {
        return (
            <div className="flex justify-center items-center py-24">
                <Spinner />
            </div>
        );
    }

    // View for showing lessons grouped by unit for a selected class
    if (selectedClassForLessons) {
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

    // Main view showing list of classes that have lessons
    const sortedClassNames = Object.keys(lessonsByClass).sort();

    return (
        <div className="min-h-[60vh]">
            <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Lessons</h1>
            <p className="mt-3 text-lg text-slate-500 max-w-2xl mb-10">Select a class to view its lessons, neatly organized by unit.</p>

            {sortedClassNames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedClassNames.map(className => {
                        const classData = lessonsByClass[className];
                        return (
                             // --- iOS 26 Floating Class Card ---
                            <div
                                key={classData.id || className}
                                className="group relative p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-slate-200/50
                                           shadow-lg-floating-md hover:shadow-xl-floating-lg transition-all duration-300 cursor-pointer
                                           transform hover:-translate-y-1 flex flex-col items-start"
                                onClick={() => handleClassCardClick(classData)}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="p-3 bg-red-100 rounded-xl mb-4">
                                        <Squares2X2Icon className="h-7 w-7 text-red-600" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
                                            {classData.lessons.length} Lessons
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-red-700 transition-colors flex-grow">
                                    {classData.name}
                                </h3>

                                <div className="border-t border-slate-200/80 my-4 w-full"></div>

                                <div className="flex items-center justify-between w-full text-red-600 group-hover:text-red-700 font-semibold">
                                    <span>View Lessons</span>
                                    <ArrowRightIcon className="h-5 w-5 transition-transform duration-300 transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon={BookOpenIcon}
                    text="No Lessons Available Yet"
                    subtext="When your teacher assigns lessons, they will appear here."
                />
            )}
        </div>
    );
};

export default StudentLessonsTab;