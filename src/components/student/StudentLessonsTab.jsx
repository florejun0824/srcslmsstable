import React, { useState, useEffect } from 'react';
import { BookOpenIcon, ArrowRightIcon, Squares2X2Icon, ArrowPathIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import LessonsByUnitView from './LessonsByUnitView';

const EmptyState = ({ icon: Icon, text, subtext }) => (
  <div className="text-center py-10 px-5 bg-neumorphic-base rounded-xl shadow-neumorphic">
    <Icon className="h-12 w-12 mb-2 text-slate-400 mx-auto" />
    <p className="text-base font-semibold text-slate-700">{text}</p>
    <p className="mt-1 text-xs text-slate-500">{subtext}</p>
  </div>
);

const StudentLessonsTab = ({
  lessons = [],
  units = [],
  isFetchingUnits,
  setLessonToView,
  isFetchingContent,
  onRefreshLessons
}) => {
  const [lessonsByClass, setLessonsByClass] = useState({});
  const [selectedClassForLessons, setSelectedClassForLessons] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Group lessons by class
  useEffect(() => {
    if (lessons.length > 0) {
      const groupedLessons = lessons.reduce((acc, lesson) => {
        const className = lesson.className || 'Uncategorized Class';
        if (!acc[className]) {
          acc[className] = { id: lesson.classId, name: className, lessons: [] };
        }
        acc[className].lessons.push(lesson);
        return acc;
      }, {});

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

  const handleClassCardClick = (classData) => setSelectedClassForLessons(classData);
  const handleBackToClassList = () => setSelectedClassForLessons(null);

  // Manual refresh handler
  const handleRefreshClick = async () => {
    if (!onRefreshLessons) return;
    setIsRefreshing(true);
    try {
      await onRefreshLessons();
    } catch (err) {
      console.error('Error refreshing lessons:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- When viewing a single class ---
  if (selectedClassForLessons) {
    const lessonsForSelectedClass = lessons.filter(
      (lesson) => lesson.classId === selectedClassForLessons.id
    );
    return (
      <LessonsByUnitView
        selectedClass={selectedClassForLessons}
        lessons={lessonsForSelectedClass}
        units={units}
        onBack={handleBackToClassList}
        setLessonToView={setLessonToView}
        onContentUpdate={onRefreshLessons}
      />
    );
  }

  const sortedClassNames = Object.keys(lessonsByClass).sort();

  return (
    <div className="min-h-[60vh] relative pb-24 sm:pb-10">
      {/* Header always visible */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Lessons</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            Select a class to view its lessons, organized by unit.
          </p>
        </div>

        {/* Desktop Refresh */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="hidden sm:inline-flex items-center gap-2 bg-neumorphic-base rounded-xl shadow-neumorphic
                     px-4 py-2 text-sm font-semibold text-slate-700 hover:shadow-neumorphic-inset 
                     hover:text-red-600 active:scale-[0.98] transition-all duration-200"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-red-600' : 'text-slate-500'}`}
          />
          {isRefreshing ? 'Checking...' : 'Check for New Lessons'}
        </button>
      </div>

      {/* Main content */}
      <div>
        {isFetchingContent || isFetchingUnits ? (
          <div className="flex justify-center items-center py-16">
            <Spinner />
          </div>
        ) : sortedClassNames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedClassNames.map((className) => {
              const classData = lessonsByClass[className];
              return (
                <div
                  key={classData.id || className}
                  className="group relative p-3 rounded-lg bg-neumorphic-base shadow-neumorphic 
                             hover:shadow-neumorphic-inset transition-all duration-300 cursor-pointer
                             flex flex-col"
                  onClick={() => handleClassCardClick(classData)}
                >
                  {/* Icon + Title */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-neumorphic-base shadow-neumorphic-inset">
                      <Squares2X2Icon className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 truncate flex-1 group-hover:text-red-700 transition-colors">
                      {classData.name}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neumorphic-base shadow-neumorphic-inset text-red-700">
                      {classData.lessons.length} Lessons
                    </span>
                  </div>

                  <div className="border-t border-slate-200/70 my-2"></div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-red-600 group-hover:text-red-700 font-medium text-xs">
                    <span>View Lessons</span>
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 transform group-hover:translate-x-1" />
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

      {/* Floating FAB (Always visible on mobile) */}
      <button
        onClick={handleRefreshClick}
        disabled={isRefreshing}
        className="sm:hidden fixed bottom-24 right-5 z-50 flex items-center justify-center rounded-full 
                   bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg 
                   w-14 h-14 active:scale-[0.95] transition-transform duration-200 ease-in-out"
      >
        <ArrowPathIcon className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export default StudentLessonsTab;
