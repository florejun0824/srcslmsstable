// src/pages/StudentLessonsTab.jsx
import React, { useState, useEffect } from 'react';
// Import hooks for routing
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpenIcon, ArrowRightIcon, Squares2X2Icon, ArrowPathIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import LessonsByUnitView from './LessonsByUnitView';

const EmptyState = ({ icon: Icon, text, subtext }) => (
  // --- MODIFIED: Themed EmptyState ---
  <div className="text-center py-10 px-5 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark">
    <Icon className="h-12 w-12 mb-2 text-slate-400 dark:text-slate-600 mx-auto" />
    <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{text}</p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
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
  // This state will hold the class data derived from the URL
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get router location and navigation functions
  const location = useLocation();
  const navigate = useNavigate();

  // Group lessons by class (unchanged)
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

  // New useEffect to sync the URL with the selected class state
  useEffect(() => {
    // Parse URL: /student/lessons/class/class-123
    const pathParts = location.pathname.split('/');
    const classIdFromUrl = pathParts.length === 5 && pathParts[3] === 'class' ? pathParts[4] : null;

    if (classIdFromUrl) {
      // We must wait for lessonsByClass to be populated
      if (Object.keys(lessonsByClass).length > 0) {
        const matchingClass = Object.values(lessonsByClass).find(
          (cls) => cls.id === classIdFromUrl
        );

        if (matchingClass) {
          setSelectedClassData(matchingClass);
        } else {
          // Class ID in URL is invalid or not found, navigate back
          console.warn('Class ID from URL not found, navigating back.');
          navigate('/student/lessons', { replace: true });
        }
      }
      // If lessonsByClass isn't ready, this effect will re-run when it is.
    } else {
      // We are on the main /student/lessons page
      setSelectedClassData(null);
    }
  }, [location.pathname, lessonsByClass, navigate]);

  // Update click handlers to use navigate
  const handleClassCardClick = (classData) => {
    navigate(`/student/lessons/class/${classData.id}`);
  };
  const handleBackToClassList = () => {
    navigate('/student/lessons');
  };

  // Manual refresh handler (unchanged)
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

  // --- When viewing a single class (use selectedClassData) ---
  if (selectedClassData) {
    const lessonsForSelectedClass = lessons.filter(
      (lesson) => lesson.classId === selectedClassData.id
    );
    return (
      <LessonsByUnitView
        selectedClass={selectedClassData}
        lessons={lessonsForSelectedClass}
        units={units}
        onBack={handleBackToClassList} // This now uses navigate
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
          {/* --- MODIFIED: Themed header text --- */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Lessons</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Select a class to view its lessons, organized by unit.
          </p>
        </div>

        {/* Desktop Refresh */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          // --- MODIFIED: Themed button ---
          className="hidden sm:inline-flex items-center gap-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark
                     px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                     hover:text-red-600 dark:hover:text-red-400 active:scale-[0.98] transition-all duration-200"
        >
          {/* --- MODIFIED: Themed icon --- */}
          <ArrowPathIcon
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
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
                  // --- MODIFIED: Themed card container ---
                  className="group relative p-3 rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark
                             hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all duration-300 cursor-pointer
                             flex flex-col"
                  onClick={() => handleClassCardClick(classData)} // Use new handler
                >
                  {/* Icon + Title */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {/* --- MODIFIED: Themed icon container --- */}
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                      <Squares2X2Icon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    {/* --- MODIFIED: Themed text --- */}
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex-1 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                      {classData.name}
                    </h3>
                    {/* --- MODIFIED: Themed badge --- */}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neumorphic-base dark:bg-slate-700 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-700 dark:text-red-300">
                      {classData.lessons.length} Lessons
                    </span>
                  </div>

                  {/* --- MODIFIED: Themed divider --- */}
                  <div className="border-t border-slate-200/70 dark:border-slate-700/70 my-2"></div>

                  {/* Footer */}
                  {/* --- MODIFIED: Themed footer text --- */}
                  <div className="flex items-center justify-between text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 font-medium text-xs">
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

      {/* Floating FAB (unchanged) */}
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