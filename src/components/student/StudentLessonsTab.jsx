// src/pages/StudentLessonsTab.jsx
import React, { useState, useEffect } from 'react';
// Import hooks for routing
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpenIcon, ArrowPathIcon, AcademicCapIcon } from '@heroicons/react/24/solid'; // <-- Changed icon
import Spinner from '../common/Spinner';
import LessonsByUnitView from './LessonsByUnitView';

const EmptyState = ({ icon: Icon, text, subtext }) => (
  // --- Themed EmptyState (Unchanged) ---
  <div className="text-center py-10 px-5 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark">
    <Icon className="h-12 w-12 mb-2 text-slate-400 dark:text-slate-600 mx-auto" />
    <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{text}</p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
  </div>
);

// --- MODIFIED: "Eye-Catchy" ClassBook Component ---
const ClassBook = ({ title, onClick, lessonCount, isNew }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      // --- MODIFIED: New eye-catchy classes ---
      className={`relative p-4 cursor-pointer group transition-all duration-300
                 bg-gradient-to-br from-sky-50 to-cyan-100 dark:from-sky-900/50 dark:to-cyan-900/50
                 shadow-neumorphic dark:shadow-neumorphic-dark
                 hover:shadow-neumorphic-lg dark:hover:shadow-lg hover:-translate-y-1
                 hover:shadow-sky-500/30 dark:hover:shadow-sky-400/20
                 active:scale-[0.98]
                 rounded-lg flex flex-col items-center justify-center min-h-[9rem] w-full
                 border-l-4 border-sky-500 dark:border-sky-400 overflow-hidden`} // UI: Vibrant Book spine
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {/* --- "NEW" Badge (Unchanged) --- */}
      {isNew && (
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-md">
          NEW
        </span>
      )}

      {/* --- MODIFIED: New Icon --- */}
      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
        <AcademicCapIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
      </div>
      
      {/* Spacer (Unchanged) */}
      <div className="flex-1"></div>

      {/* Lesson Count (Unchanged) - This will contrast nicely with the gradient */}
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neumorphic-base dark:bg-slate-700 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-700 dark:text-red-300">
        {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
      </span>
      
      {/* Title (Unchanged) - Will be readable on the new gradient */}
      <p className="mt-1.5 text-xs sm:text-sm font-semibold text-center text-slate-700 dark:text-slate-200 line-clamp-2">
        {title}
      </p>

      {/* Spacer (Unchanged) */}
      <div className="flex-1"></div>
    </div>
  );
};
// --- END MODIFIED COMPONENT ---


const StudentLessonsTab = ({
  lessons = [],
  units = [],
  isFetchingUnits,
  setLessonToView,
  isFetchingContent,
  onRefreshLessons
}) => {
  const [lessonsByClass, setLessonsByClass] = useState({});
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Sync URL with selected class state (unchanged)
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const classIdFromUrl = pathParts.length === 5 && pathParts[3] === 'class' ? pathParts[4] : null;

    if (classIdFromUrl) {
      if (Object.keys(lessonsByClass).length > 0) {
        const matchingClass = Object.values(lessonsByClass).find(
          (cls) => cls.id === classIdFromUrl
        );

        if (matchingClass) {
          setSelectedClassData(matchingClass);
        } else {
          console.warn('Class ID from URL not found, navigating back.');
          navigate('/student/lessons', { replace: true });
        }
      }
    } else {
      setSelectedClassData(null);
    }
  }, [location.pathname, lessonsByClass, navigate]);

  // Click handlers (unchanged)
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

  // --- When viewing a single class (use selectedClassData) --- (unchanged)
  if (selectedClassData) {
    const lessonsForSelectedClass = lessons.filter(
      (lesson) => lesson.classId === selectedClassData.id
    );
    return (
      <LessonsByUnitView
        selectedClass={selectedClassData}
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
      {/* Header (unchanged) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Lessons</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Select a class to view its lessons, organized by unit.
          </p>
        </div>

        {/* Desktop Refresh (unchanged) */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="hidden sm:inline-flex items-center gap-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark
                     px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                     hover:text-red-600 dark:hover:text-red-400 active:scale-[0.98] transition-all duration-200"
        >
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
          // --- Grid layout (unchanged) ---
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {sortedClassNames.map((className) => {
              const classData = lessonsByClass[className];
              
              // --- "New" logic (unchanged) ---
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              const hasNewLesson = (classData.lessons || []).some(lesson => {
                if (lesson?.createdAt) {
                  const createdAtDate = lesson.createdAt.toDate ? 
                                        lesson.createdAt.toDate() : 
                                        new Date(lesson.createdAt);
                  return createdAtDate > sevenDaysAgo;
                }
                return false;
              });

              // --- MODIFIED: Use the new ClassBook component ---
              return (
                <ClassBook
                  key={classData.id || className}
                  title={classData.name}
                  lessonCount={classData.lessons.length}
                  isNew={hasNewLesson} 
                  onClick={() => handleClassCardClick(classData)} 
                />
              );
              // --- END MODIFIED ---
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
    </div>
  );
};

export default StudentLessonsTab;