import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpenIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowPathIcon,
  FolderIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  StopIcon,
  ChartPieIcon // Added for in-progress visual
} from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// --- COMPONENT: Glass Base (Shared) ---
const GlassBase = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`
      relative overflow-hidden
      bg-white/70 dark:bg-slate-900/60 
      backdrop-blur-xl 
      border border-white/60 dark:border-slate-700/50
      shadow-sm hover:shadow-xl dark:shadow-black/40
      transition-all duration-300 ease-out
      ${className}
    `}
  >
    {children}
  </div>
);

// --- COMPONENT: Spatial Unit Card (Grid Item) ---
const UnitCard = ({ title, onClick, lessonCount, isNew, index, progress }) => {
  const gradients = [
    'from-blue-400/20 to-cyan-300/20',
    'from-purple-400/20 to-pink-300/20',
    'from-emerald-400/20 to-teal-300/20',
    'from-orange-400/20 to-amber-300/20',
  ];
  const bgGradient = gradients[index % gradients.length];
  
  const isCompleted = progress === 100;
  const isInProgress = progress > 0 && progress < 100;

  return (
    <GlassBase 
      onClick={onClick}
      className="cursor-pointer active:scale-[0.97] group min-h-[11rem] flex flex-col touch-manipulation rounded-[1.5rem]"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10 p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className={`h-11 w-11 rounded-2xl shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {isCompleted ? <CheckCircleIcon className="h-6 w-6" /> : <FolderIcon className="h-6 w-6" />}
          </div>
          
          {/* Badges */}
          <div className="flex flex-col items-end gap-1">
            {isNew && !isCompleted && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-md shadow-red-500/20 animate-pulse-slow">
                <SparklesIcon className="h-3 w-3 text-yellow-200" /> New
                </span>
            )}
            {isCompleted && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-md shadow-green-500/20">
                Done
                </span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>

        <div className="mt-auto pt-4">
           <div className="flex items-center justify-between mb-2">
               {isCompleted ? (
                   <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-1">
                       All Completed
                   </span>
               ) : (
                   <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                       {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
                   </span>
               )}
               
               <div className="h-8 w-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <ChevronRightIcon className="h-4 w-4 text-slate-400" />
               </div>
           </div>

           {/* Progress Bar (Visible if In Progress) */}
           {isInProgress && (
               <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                   />
               </div>
           )}
        </div>
      </div>
    </GlassBase>
  );
};

// --- COMPONENT: Enhanced Lesson List Item (Strip View) ---
const LessonListItem = ({ lesson, onClick, completedLessons }) => {
  const isCompleted = lesson.isCompleted || (completedLessons && completedLessons.includes(lesson.id));
  const progress = lesson.totalPages > 0 ? (lesson.pagesRead / lesson.totalPages) * 100 : 0;
  const isInProgress = !isCompleted && progress > 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`
        group relative flex items-center gap-4 p-4 mb-3
        bg-white/60 dark:bg-slate-800/50 
        backdrop-blur-md
        hover:bg-white dark:hover:bg-slate-800
        border border-white/50 dark:border-slate-700
        rounded-2xl
        shadow-sm hover:shadow-lg dark:shadow-black/20
        transition-all duration-200 ease-out
        active:scale-[0.98] cursor-pointer touch-manipulation
        overflow-hidden
      `}
    >
      {/* Progress Bar Background (Only if In Progress) */}
      {isInProgress && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-amber-400/50 dark:bg-amber-500/50 transition-all duration-500" 
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Status Icon Indicator */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
        ) : isInProgress ? (
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 relative">
            {/* Mini Circular Progress visual */}
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-amber-200 dark:text-amber-900" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              <path className="text-amber-500" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
            <span className="text-[9px] font-bold relative z-10">{Math.round(progress)}%</span>
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-slate-600 group-hover:text-blue-500 transition-colors">
            <PlayCircleIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0 py-1">
        <h4 className={`text-base font-bold truncate ${isCompleted ? 'text-slate-500 dark:text-slate-500 decoration-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
          {lesson.title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
          {isCompleted ? 'Completed' : isInProgress ? `Resume from page ${lesson.pagesRead}` : lesson.description || 'Ready to start'}
        </p>
      </div>

      {/* Action Chevron / Button */}
      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
           <ChevronRightIcon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, text, subtext }) => (
  <div className="flex flex-col items-center justify-center py-24 px-6 opacity-80">
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4 shadow-inner">
      <Icon className="h-10 w-10 text-slate-400" />
    </div>
    <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{text}</p>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs text-center leading-relaxed">
      {subtext}
    </p>
  </div>
);


// --- MAIN COMPONENT ---
const LessonsByUnitView = ({
  selectedClass,
  lessons,
  units,
  onBack, // This maps to "Back to Class List"
  onContentUpdate,
  setLessonToView,
  showBackButton = true,
  showRefreshButton = true,
}) => {
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  const [localProgressUpdates, setLocalProgressUpdates] = useState({});
  const [selectedUnit, setSelectedUnit] = useState(null); // Controls Grid vs List view
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const pullDistance = useRef(0);
  const containerRef = useRef(null);

  const { userProfile } = useAuth();
  const { showToast } = useToast();

  // --- Grouping Logic ---
  useEffect(() => {
    if (lessons.length > 0 || units.length > 0) {
      const unitsMap = new Map(units.map((unit) => [unit.id, unit]));
      const grouped = lessons.reduce((acc, lesson) => {
        const unit = unitsMap.get(lesson.unitId);
        const unitTitle = unit ? unit.title : 'Uncategorized';
        const unitCreatedAt = unit ? unit.createdAt : null;

        if (!acc[unitTitle]) {
          acc[unitTitle] = { lessons: [], createdAt: unitCreatedAt };
        }

        const lessonId = lesson.id;
        const localUpdate = localProgressUpdates[lessonId];
        const lessonWithProgress = localUpdate ? { ...lesson, ...localUpdate } : lesson;

        acc[unitTitle].lessons.push(lessonWithProgress);
        return acc;
      }, {});

      Object.keys(grouped).forEach((unitTitle) => {
        grouped[unitTitle].lessons.sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          return orderA !== orderB ? orderA - orderB : a.title.localeCompare(b.title);
        });
      });
      setLessonsByUnit(grouped);
    } else {
      setLessonsByUnit({});
    }
  }, [lessons, units, localProgressUpdates]);

  const sortedUnitTitles = useMemo(() => {
    return Object.keys(lessonsByUnit).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [lessonsByUnit]);

  // --- SMART BACK BUTTON LOGIC ---
  const handleSmartBack = () => {
    if (selectedUnit) {
      // If inside a unit, go back to Unit Grid
      setSelectedUnit(null);
    } else {
      // If at Unit Grid, go back to Class List (parent)
      onBack();
    }
  };

  // --- Interactions (Haptic/Touch) ---
  const maybeHaptic = (pattern = 20) => {
    if (navigator?.vibrate) navigator.vibrate(pattern);
  };

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
        setIsRefreshing(true);
        maybeHaptic(50);
        if (onContentUpdate) {
          try {
            await onContentUpdate();
            showToast('Refreshed.', 'success');
          } catch (err) {
            showToast('Refresh failed.', 'error');
          }
        }
        setIsRefreshing(false);
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

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    maybeHaptic(30);
    try {
      if (onContentUpdate) await onContentUpdate();
      showToast('Refreshed.', 'success');
    } catch (err) {
      showToast('Refresh failed.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-full font-sans antialiased pb-32 px-2 sm:px-4">
      
      {/* --- NAV HEADER --- */}
      <div className="flex flex-col gap-4 mb-6 mt-2">
        
        <div className="flex items-center justify-between">
          {/* SMART BACK BUTTON */}
          {showBackButton ? (
            <button
              onClick={handleSmartBack}
              className="group flex items-center gap-1 pl-2 pr-4 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-md text-sm font-bold text-slate-600 dark:text-slate-300 transition-all active:scale-95 shadow-sm border border-white/20"
            >
              <div className="bg-white dark:bg-slate-600 rounded-full p-1 shadow-sm">
                <ChevronLeftIcon className="h-4 w-4" />
              </div>
              {/* Dynamic Text based on context */}
              <span>{selectedUnit ? "All Units" : "All Classes"}</span>
            </button>
          ) : <div />}

          {showRefreshButton && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-md text-slate-600 dark:text-slate-300 shadow-sm active:scale-90 transition-all border border-white/20"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Title Block */}
        <div className="px-2">
          {selectedUnit ? (
            // Unit View Title
            <div className="animate-fadeIn">
               <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                 Module
               </p>
               <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight line-clamp-2">
                 {selectedUnit}
               </h1>
            </div>
          ) : (
            // Main Class Title
            <div className="animate-fadeIn">
               <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                 {selectedClass?.name || 'Class Lessons'}
               </h1>
               <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                 Select a unit to view lessons
               </p>
            </div>
          )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-[50vh]"
      >
        {/* Loading Spinner */}
        <div className={`flex justify-center transition-all duration-300 overflow-hidden ${isRefreshing ? 'h-10 opacity-100' : 'h-0 opacity-0'}`}>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Content...</span>
        </div>

        {sortedUnitTitles.length > 0 ? (
          <>
            {selectedUnit ? (
              /* --- VIEW 1: LESSON LIST (The Enhanced UI) --- */
              <div className="animate-slideInUp space-y-2">
                {(lessonsByUnit[selectedUnit]?.lessons || []).map((lesson) => (
                  <LessonListItem
                    key={lesson.id}
                    lesson={lesson}
                    completedLessons={userProfile?.completedLessons || []}
                    onClick={() => {
                      maybeHaptic(20);
                      if (setLessonToView) setLessonToView(lesson);
                    }}
                  />
                ))}
              </div>
            ) : (
              /* --- VIEW 2: UNITS GRID --- */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                {sortedUnitTitles.map((unitTitle, index) => {
                  const unitData = lessonsByUnit[unitTitle];
                  const lessonsInUnit = unitData?.lessons || [];
                  
                  // Calculate Progress
                  const totalLessons = lessonsInUnit.length;
                  const completedCount = lessonsInUnit.filter(l => 
                    l.isCompleted || (userProfile?.completedLessons?.includes(l.id))
                  ).length;
                  const progressPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

                  // Check "New" status
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
                        maybeHaptic(20);
                        setSelectedUnit(unitTitle);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
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