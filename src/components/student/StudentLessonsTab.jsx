import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BookOpenIcon, 
  ArrowPathIcon, 
  SparklesIcon,
  AcademicCapIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import LessonsByUnitView from './LessonsByUnitView';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================================
// 🎨 ANIMATION CONSTANTS (OneUI Physics)
// =====================================================================
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        transition: { type: "spring", stiffness: 350, damping: 25 } 
    }
};

// =====================================================================
// 🧱 COMPONENT: OneUI Card
// =====================================================================
const OneUICard = memo(({ children, className = "", onClick }) => {
  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div 
      variants={itemVariants}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      whileHover={onClick ? { scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.96 } : {}}
      className={`
        relative overflow-hidden
        bg-white dark:bg-slate-900 
        border border-slate-100 dark:border-slate-800
        shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] dark:shadow-none
        transition-all duration-300
        rounded-[2.2rem]
        focus:outline-none focus:ring-4 focus:ring-blue-500/20
        ${className}
        ${onClick ? 'cursor-pointer touch-manipulation' : ''}
      `}
    >
      {children}
    </motion.div>
  );
});
OneUICard.displayName = 'OneUICard';

// =====================================================================
// 🏷️ COMPONENT: Class Card
// =====================================================================
const ClassCard = memo(({ title, onClick, lessonCount, isNew, index }) => {
  // Dynamic OneUI Color palettes based on index
  const themes = [
    { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: 'bg-blue-500 text-white' },
    { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', icon: 'bg-violet-500 text-white' },
    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', icon: 'bg-emerald-500 text-white' },
    { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', icon: 'bg-rose-500 text-white' },
  ];
  const theme = themes[index % themes.length];

  return (
    <OneUICard 
      onClick={onClick}
      className="min-h-[11rem] flex flex-col p-6 group"
    >
      {/* Header Row */}
      <div className="flex justify-between items-start mb-4">
        <div className={`h-14 w-14 rounded-[1.25rem] flex items-center justify-center shadow-sm ${theme.bg} ${theme.text} transition-transform duration-300 group-hover:scale-110`}>
          <AcademicCapIcon className="h-7 w-7" />
        </div>

        {isNew && (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm shadow-rose-500/30">
            <SparklesIcon className="h-3 w-3 text-yellow-300" /> New
          </span>
        )}
      </div>

      {/* Content */}
      <div className="mt-2">
        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
          {title}
        </h3>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 px-2.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
            </span>
        </div>
        
        {/* Subtle arrow interaction */}
        <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ChevronRightIcon className="h-4 w-4" />
        </div>
      </div>
    </OneUICard>
  );
});
ClassCard.displayName = 'ClassCard';

// =====================================================================
// 🗑️ COMPONENT: Empty State
// =====================================================================
const EmptyState = memo(({ icon: Icon, text, subtext }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }} 
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-32 px-6 text-center"
  >
    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
      <Icon className="h-10 w-10" />
    </div>
    <p className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{text}</p>
    <p className="mt-2 text-sm font-medium text-slate-400 max-w-xs leading-relaxed">
      {subtext}
    </p>
  </motion.div>
));
EmptyState.displayName = 'EmptyState';

// =====================================================================
// 🚀 MAIN COMPONENT
// =====================================================================
const StudentLessonsTab = ({
  lessons = [],
  units = [],
  isFetchingUnits,
  setLessonToView,
  isFetchingContent,
  onRefreshLessons
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // --- DERIVED STATE: Group Lessons ---
  const lessonsByClass = useMemo(() => {
    if (!lessons.length) return {};

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const grouped = lessons.reduce((acc, lesson) => {
      const className = lesson.className || 'Uncategorized Class';
      if (!acc[className]) {
        acc[className] = { 
            id: lesson.classId, 
            name: className, 
            lessons: [],
            hasNewContent: false
        };
      }
      
      acc[className].lessons.push(lesson);

      if (!acc[className].hasNewContent && lesson?.createdAt) {
          const createdAtDate = lesson.createdAt.toDate ? lesson.createdAt.toDate() : new Date(lesson.createdAt);
          if (createdAtDate > sevenDaysAgo) {
              acc[className].hasNewContent = true;
          }
      }

      return acc;
    }, {});

    Object.keys(grouped).forEach(className => {
      grouped[className].lessons.sort((a, b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title, 'en-US', { numeric: true });
      });
    });

    return grouped;
  }, [lessons]);

  // --- ROUTING LOGIC ---
  const selectedClassData = useMemo(() => {
    const pathParts = location.pathname.split('/');
    const classIdFromUrl = pathParts.length === 5 && pathParts[3] === 'class' ? pathParts[4] : null;

    if (classIdFromUrl && Object.keys(lessonsByClass).length > 0) {
       return Object.values(lessonsByClass).find(cls => cls.id === classIdFromUrl) || 'NOT_FOUND';
    }
    return null;
  }, [location.pathname, lessonsByClass]);

  useEffect(() => {
    if (selectedClassData === 'NOT_FOUND') {
        navigate('/student/lessons', { replace: true });
    }
  }, [selectedClassData, navigate]);

  // --- HANDLERS ---
  const handleClassCardClick = useCallback((classData) => {
    if (navigator?.vibrate) navigator.vibrate(20);
    navigate(`/student/lessons/class/${classData.id}`);
  }, [navigate]);
  
  const handleBackToClassList = useCallback(() => {
    navigate('/student/lessons');
  }, [navigate]);

  const handleRefreshClick = async () => {
    if (!onRefreshLessons) return;
    if (navigator?.vibrate) navigator.vibrate(30);
    setIsRefreshing(true);
    // Artificial delay to let the spinner animation play
    await Promise.all([
      onRefreshLessons(),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
    setIsRefreshing(false);
  };

  // --- VIEW: Drill Down (LessonsByUnit) ---
  if (selectedClassData && typeof selectedClassData === 'object') {
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
  const isLoading = isFetchingContent || isFetchingUnits;

  // --- VIEW: Class List (Main) ---
  return (
    <div className="min-h-screen font-sans pb-36 px-2 sm:px-4">
      
      {/* 1. ONEUI HEADER */}
      <div className="pt-6 pb-2 px-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Classes</h1>
          <p className="text-sm font-bold text-slate-400 mt-0.5">Select a subject</p>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className={`
            h-11 w-11 rounded-full flex items-center justify-center
            bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
            hover:bg-blue-500 hover:text-white active:scale-90
            transition-all duration-300
          `}
          aria-label="Sync Lessons"
        >
          <ArrowPathIcon
            className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* 2. MAIN GRID */}
      <div className="px-4 mt-6 min-h-[50vh]">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-32"
            >
              <Spinner />
            </motion.div>
          ) : sortedClassNames.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {sortedClassNames.map((className, idx) => {
                const classData = lessonsByClass[className];
                return (
                  <ClassCard
                    key={classData.id || className}
                    index={idx}
                    title={classData.name}
                    lessonCount={classData.lessons.length}
                    isNew={classData.hasNewContent} 
                    onClick={() => handleClassCardClick(classData)} 
                  />
                );
              })}
            </motion.div>
          ) : (
            <EmptyState
              icon={BookOpenIcon}
              text="No Classes Found"
              subtext="You haven't been enrolled in any classes yet."
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentLessonsTab;