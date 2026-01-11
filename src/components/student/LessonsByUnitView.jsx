import React, { useState, useRef, useMemo, useCallback, memo } from 'react';
import {
  BookOpenIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowPathIcon,
  FolderIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================================
// 🎨 ONEUI 8.5 PHYSICS CONSTANTS
// =====================================================================
const pageVariants = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { type: "spring", stiffness: 350, damping: 25, mass: 0.8 }
    },
    exit: { 
        opacity: 0, 
        scale: 0.96, 
        y: -10,
        transition: { duration: 0.2, ease: "easeOut" } 
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.04 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

// =====================================================================
// 🧱 ONEUI CARD CONTAINER
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
        rounded-[1.8rem] sm:rounded-[2.2rem]
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
// 📂 UNIT CARD (Optimized for Mobile)
// =====================================================================
const UnitCard = memo(({ title, onClick, lessonCount, isNew, index, progress }) => {
  const isCompleted = progress === 100;
  const isInProgress = progress > 0 && progress < 100;

  const bgColors = [
    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  ];
  const iconStyle = bgColors[index % bgColors.length];

  return (
    <OneUICard 
      onClick={onClick}
      className="min-h-[9.5rem] sm:min-h-[11rem] flex flex-col p-5 sm:p-6 group"
    >
      {/* Header: Icon & Badge */}
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className={`
            h-12 w-12 sm:h-14 sm:w-14 rounded-[1rem] sm:rounded-[1.25rem] 
            flex items-center justify-center transition-transform duration-300 group-hover:scale-110 
            ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : iconStyle}
        `}>
          {isCompleted ? (
            <CheckCircleIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          ) : (
            <FolderIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {isNew && !isCompleted && (
              <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm shadow-rose-500/30">
               New
              </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
        {title}
      </h3>

      {/* Footer: Progress or Count */}
      <div className="mt-auto pt-3 sm:pt-4">
         <div className="flex items-center justify-between mb-2">
             {isCompleted ? (
                 <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                     Completed
                 </span>
             ) : (
                 <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                     {lessonCount} {lessonCount === 1 ? 'Task' : 'Tasks'}
                 </span>
             )}
             
             {/* Hover Arrow (Desktop only visual) */}
             <div className="hidden sm:flex h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronRightIcon className="h-4 w-4 text-slate-400" />
             </div>
         </div>

         {isInProgress && (
             <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${progress}%` }}
                 />
             </div>
         )}
      </div>
    </OneUICard>
  );
});
UnitCard.displayName = 'UnitCard';

// =====================================================================
// 📄 LESSON LIST ITEM
// =====================================================================
const LessonListItem = memo(({ lesson, onClick, completedLessons }) => {
  const isCompleted = lesson.isCompleted || (completedLessons && completedLessons.includes(lesson.id));
  const progress = lesson.totalPages > 0 ? (lesson.pagesRead / lesson.totalPages) * 100 : 0;
  const isInProgress = !isCompleted && progress > 0;

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
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 mb-2 sm:mb-3
        bg-white dark:bg-slate-900 
        border border-slate-100 dark:border-slate-800
        rounded-[1.5rem] sm:rounded-[1.75rem]
        transition-all duration-200
        cursor-pointer touch-manipulation
      `}
    >
      <div className="flex-shrink-0">
        {isCompleted ? (
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[1rem] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
            <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        ) : isInProgress ? (
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[1rem] bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 dark:text-amber-400 relative">
            <svg className="absolute inset-0 h-full w-full -rotate-90 p-1" viewBox="0 0 36 36">
              <path className="text-amber-200 dark:text-amber-900/40" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              <path className="text-amber-500" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-[9px] font-black relative z-10">{Math.round(progress)}%</span>
          </div>
        ) : (
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[1rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-colors">
            <DocumentTextIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={`text-sm sm:text-base font-bold truncate ${isCompleted ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
          {lesson.title}
        </h4>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
          {isCompleted ? 'Completed' : isInProgress ? `Resume from page ${lesson.pagesRead}` : lesson.description || 'Tap to start reading'}
        </p>
      </div>

      <div className="flex-shrink-0">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 text-slate-300">
           {isCompleted ? <ArrowPathIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <PlayCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
        </div>
      </div>
    </motion.div>
  );
});
LessonListItem.displayName = 'LessonListItem';

// =====================================================================
// 🗑️ EMPTY STATE
// =====================================================================
const EmptyState = memo(({ icon: Icon, text, subtext }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }} 
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-24 px-6 text-center"
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
// 🚀 MAIN VIEW COMPONENT
// =====================================================================
const LessonsByUnitView = ({
  selectedClass,
  lessons = [],
  units = [],
  onBack,
  onContentUpdate,
  setLessonToView,
  showBackButton = true,
  showRefreshButton = true,
}) => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const pullDistance = useRef(0);
  const containerRef = useRef(null);

  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const lessonsByUnit = useMemo(() => {
    if (lessons.length === 0 && units.length === 0) return {};

    const unitsMap = new Map(units.map((unit) => [unit.id, unit]));
    const grouped = lessons.reduce((acc, lesson) => {
      const unit = unitsMap.get(lesson.unitId);
      const unitTitle = unit ? unit.title : 'Uncategorized';
      const unitCreatedAt = unit ? unit.createdAt : null;

      if (!acc[unitTitle]) {
        acc[unitTitle] = { lessons: [], createdAt: unitCreatedAt };
      }
      acc[unitTitle].lessons.push(lesson);
      return acc;
    }, {});

    Object.keys(grouped).forEach((unitTitle) => {
      grouped[unitTitle].lessons.sort((a, b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        return orderA !== orderB ? orderA - orderB : a.title.localeCompare(b.title);
      });
    });
    return grouped;
  }, [lessons, units]);

  const sortedUnitTitles = useMemo(() => {
    return Object.keys(lessonsByUnit).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [lessonsByUnit]);

  const handleSmartBack = useCallback(() => {
    if (selectedUnit) {
      setSelectedUnit(null);
    } else {
      onBack();
    }
  }, [selectedUnit, onBack]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (navigator?.vibrate) navigator.vibrate(30);
    try {
      if (onContentUpdate) await onContentUpdate();
      showToast('Refreshed.', 'success');
    } catch (err) {
      showToast('Refresh failed.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [onContentUpdate, showToast]);

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    touchStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
    pullDistance.current = 0;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current == null) return;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    pullDistance.current = Math.max(0, currentY - touchStartY.current);
    if (pullDistance.current > 0 && containerRef.current) {
      containerRef.current.style.transform = `translateY(${Math.min(pullDistance.current / 2, 80)}px)`;
    }
  };

  const handleTouchEnd = async () => {
    if (touchStartY.current == null) return;
    try {
      const pullThreshold = 70;
      if (pullDistance.current >= pullThreshold) {
        await handleManualRefresh();
      }
    } finally {
      if (containerRef.current) {
        containerRef.current.style.transition = 'transform 220ms ease';
        containerRef.current.style.transform = 'translateY(0px)';
        setTimeout(() => {
          if (containerRef.current) containerRef.current.style.transition = '';
        }, 230);
      }
      touchStartY.current = null;
      pullDistance.current = 0;
    }
  };

  return (
    <div className="min-h-full font-sans antialiased pb-32 px-2 sm:px-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 mb-6 mt-2">
        <div className="flex items-center justify-between">
          {showBackButton ? (
            <button
              onClick={handleSmartBack}
              className="group flex items-center gap-2 pl-2 pr-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-800"
            >
              <div className="bg-white dark:bg-slate-700 rounded-full p-1 shadow-sm">
                <ChevronLeftIcon className="h-4 w-4" />
              </div>
              <span>{selectedUnit ? "Modules" : "Classes"}</span>
            </button>
          ) : <div />}

          {showRefreshButton && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-all focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-800"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        <div className="px-2">
          <AnimatePresence mode="wait">
            {selectedUnit ? (
              <motion.div 
                key="header-unit"
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -5 }}
              >
                 <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                   Module
                 </p>
                 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight line-clamp-2">
                   {selectedUnit}
                 </h1>
              </motion.div>
            ) : (
              <motion.div 
                key="header-class"
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -5 }}
              >
                 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                   {selectedClass?.name || 'Class Lessons'}
                 </h1>
                 <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-1">
                   Select a module to view tasks
                 </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-[50vh]"
      >
        <div className={`flex justify-center transition-all duration-300 overflow-hidden ${isRefreshing ? 'h-10 opacity-100' : 'h-0 opacity-0'}`}>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Content...</span>
        </div>

        {sortedUnitTitles.length > 0 ? (
          <AnimatePresence mode="wait">
            {selectedUnit ? (
              <motion.div 
                key="lesson-list"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, x: 20 }}
                className="space-y-2"
              >
                {(lessonsByUnit[selectedUnit]?.lessons || []).map((lesson) => (
                  <LessonListItem
                    key={lesson.id}
                    lesson={lesson}
                    completedLessons={userProfile?.completedLessons || []}
                    onClick={() => {
                      if (navigator?.vibrate) navigator.vibrate(20);
                      if (setLessonToView) setLessonToView(lesson);
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="unit-grid"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
              >
                {sortedUnitTitles.map((unitTitle, index) => {
                  const unitData = lessonsByUnit[unitTitle];
                  const lessonsInUnit = unitData?.lessons || [];
                  const totalLessons = lessonsInUnit.length;
                  const completedCount = lessonsInUnit.filter(l => 
                    l.isCompleted || (userProfile?.completedLessons?.includes(l.id))
                  ).length;
                  const progressPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  let isNew = false;
                  if (unitData?.createdAt) {
                      const createdAtDate = unitData.createdAt.toDate ? 
                                            unitData.createdAt.toDate() : 
                                            new Date(unitData.createdAt);
                      if (createdAtDate > sevenDaysAgo) isNew = true;
                  }

                  return (
                    <UnitCard
                      key={unitTitle}
                      index={index}
                      title={unitTitle}
                      lessonCount={totalLessons}
                      progress={progressPercentage}
                      isNew={isNew}
                      onClick={() => {
                        if (navigator?.vibrate) navigator.vibrate(20);
                        setSelectedUnit(unitTitle);
                      }}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <EmptyState
            icon={BookOpenIcon}
            text="No Content Yet"
            subtext="Lessons for this class will appear here once your teacher publishes them."
          />
        )}
      </div>
    </div>
  );
};

export default LessonsByUnitView;