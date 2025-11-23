// src/pages/StudentLessonsTab.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BookOpenIcon, 
  ArrowPathIcon, 
  SparklesIcon 
} from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import LessonsByUnitView from './LessonsByUnitView';

// --- COMPONENT: Glass Card (Touch Optimized) ---
const GlassCard = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`
      relative overflow-hidden
      bg-white/80 dark:bg-slate-900/60 
      backdrop-blur-md 
      border border-white/60 dark:border-slate-700/50
      shadow-sm hover:shadow-xl dark:shadow-black/40
      transition-all duration-300 ease-out
      active:scale-[0.97] touch-manipulation
      rounded-[2rem]
      ${className}
    `}
  >
    {children}
  </div>
);

// --- COMPONENT: Spatial Class Card ---
const ClassCard = ({ title, onClick, lessonCount, isNew }) => {
  // Toggle theme based on title length for visual variety
  const isBlueTheme = title.length % 2 === 0;
  
  return (
    <GlassCard 
      onClick={onClick}
      className="cursor-pointer min-h-[10rem] flex flex-col group"
    >
      {/* Gradient Blob (Ambient Light) */}
      <div className={`
        absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30 
        transition-opacity duration-500
        ${isBlueTheme ? 'bg-cyan-400' : 'bg-violet-400'}
      `} />
      
      <div className="relative z-10 p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          {/* Icon */}
          <div className={`
            h-11 w-11 rounded-2xl flex items-center justify-center shadow-inner
            ${isBlueTheme 
              ? 'bg-cyan-50 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400' 
              : 'bg-fuchsia-50 dark:bg-slate-800 text-fuchsia-600 dark:text-fuchsia-400'
            }
          `}>
            <BookOpenIcon className="h-5 w-5" />
          </div>

          {/* New Badge */}
          {isNew && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-md shadow-red-500/20">
              <SparklesIcon className="h-3 w-3 text-yellow-200" /> New
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[1.05rem] font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 mb-1">
          {title}
        </h3>

        {/* Footer */}
        <div className="mt-auto pt-3 flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mr-2" />
          {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
        </div>
      </div>
    </GlassCard>
  );
};

const EmptyState = ({ icon: Icon, text, subtext }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 opacity-70">
    <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-full mb-4">
      <Icon className="h-10 w-10 text-slate-400" />
    </div>
    <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{text}</p>
    <p className="text-sm text-slate-500 text-center max-w-xs">{subtext}</p>
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
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

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
          navigate('/student/lessons', { replace: true });
        }
      }
    } else {
      setSelectedClassData(null);
    }
  }, [location.pathname, lessonsByClass, navigate]);

  const handleClassCardClick = (classData) => {
    navigate(`/student/lessons/class/${classData.id}`);
  };
  
  const handleBackToClassList = () => {
    navigate('/student/lessons');
  };

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

  if (selectedClassData) {
    return (
      <LessonsByUnitView
        selectedClass={selectedClassData}
        lessons={lessons.filter(l => l.classId === selectedClassData.id)}
        units={units}
        onBack={handleBackToClassList} 
        setLessonToView={setLessonToView}
        onContentUpdate={onRefreshLessons}
      />
    );
  }

  const sortedClassNames = Object.keys(lessonsByClass).sort();

  return (
    <div className="min-h-[60vh] relative pb-24 sm:pb-10 max-w-7xl mx-auto px-2 sm:px-4">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 mt-4">
        
        {/* Title Area */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Classes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Select a module to continue learning
          </p>
        </div>

        {/* --- NEW: AESTHETIC TOP SYNC BUTTON --- */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className={`
            /* Layout: Full width on mobile, auto on desktop */
            w-full sm:w-auto
            
            /* Positioning & Flex */
            relative overflow-hidden
            flex items-center justify-center gap-3 
            px-6 py-3.5
            
            /* Aesthetic: Glassmorphism + Gradient Border */
            rounded-2xl
            bg-white/60 dark:bg-slate-800/60 
            backdrop-blur-md
            border border-white/60 dark:border-slate-700
            
            /* Typography */
            text-sm font-bold tracking-wide
            text-slate-700 dark:text-slate-200
            
            /* Interactions */
            shadow-sm hover:shadow-lg hover:bg-white dark:hover:bg-slate-700
            active:scale-[0.98] 
            transition-all duration-300 ease-out
            group
          `}
        >
          {/* Icon */}
          <ArrowPathIcon
            className={`h-5 w-5 text-blue-500 dark:text-blue-400 transition-transform duration-700 ${
              isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'
            }`}
          />
          
          {/* Text */}
          <span>{isRefreshing ? 'Syncing...' : 'Sync Lessons'}</span>
          
          {/* Subtle sheen effect overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </button>

      </div>
      {/* --- END HEADER --- */}


      {/* Content Grid */}
      <div>
        {isFetchingContent || isFetchingUnits ? (
          <div className="flex justify-center items-center py-32">
            <Spinner />
          </div>
        ) : sortedClassNames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {sortedClassNames.map((className) => {
              const classData = lessonsByClass[className];
              
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

              return (
                <ClassCard
                  key={classData.id || className}
                  title={classData.name}
                  lessonCount={classData.lessons.length}
                  isNew={hasNewLesson} 
                  onClick={() => handleClassCardClick(classData)} 
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpenIcon}
            text="No Classes Found"
            subtext="You haven't been enrolled in any classes yet."
          />
        )}
      </div>
    </div>
  );
};

export default StudentLessonsTab;