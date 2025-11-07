// src/components/student/LessonsByUnitView.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BookOpenIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import ViewLessonModal from './StudentViewLessonModal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

// ... (EmptyState, LessonListItem, and UnitBook components remain unchanged) ...
// ---------- Empty state (themed) ----------
const EmptyState = ({ icon: Icon, text, subtext }) => (
  <div className="text-center py-20 px-6 animate-fadeIn">
    <Icon className="h-14 w-14 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
    <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">{text}</p>
    <p className="mt-2 text-base text-slate-400 dark:text-slate-500">{subtext}</p>
  </div>
);

// ---------- ENHANCED: LessonListItem (themed) ----------
const LessonListItem = ({ lesson, onClick, completedLessons }) => {
  const isLessonCompleted =
    lesson.isCompleted || (completedLessons && completedLessons.includes(lesson.id));
  const isInProgress = lesson.pagesRead && lesson.totalPages && lesson.pagesRead > 0;

  let progressText;
  let badgeClasses;
  let iconBgClass;
  let borderColorClass;

  if (isLessonCompleted) {
    progressText = 'Completed';
    badgeClasses = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    iconBgClass = 'bg-green-500';
    borderColorClass = 'border-green-500';
  } else if (isInProgress) {
    progressText = `In Progress: Page ${lesson.pagesRead} of ${lesson.totalPages}`;
    badgeClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    iconBgClass = 'bg-yellow-500';
    borderColorClass = 'border-yellow-500';
  } else {
    progressText = 'Not Started';
    badgeClasses = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    iconBgClass = 'bg-red-500';
    borderColorClass = 'border-red-500';
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`group relative flex items-center gap-4 p-4 cursor-pointer rounded-2xl
                 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-all duration-200
                 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:scale-[0.98]
                 border-l-4 ${borderColorClass}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {/* Lesson Icon */}
      <div className={`flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center
                       ${iconBgClass} shadow-inner`}>
        <SparklesIcon className="h-5 w-5 text-white" />
      </div>

      {/* Lesson Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
          {lesson.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{lesson.description || ''}</p>
      </div>

      {/* Progress Badge */}
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${badgeClasses}`}
      >
        {progressText}
      </span>

      {/* Right Arrow */}
      <ChevronRightIcon className="absolute right-3 h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
    </div>
  );
};


// --- MODIFIED: UnitBook (New "Book" look + "NEW" Badge) ---
const UnitBook = ({ title, onClick, lessonCount, isNew }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      // --- Themed book container ---
      className={`relative p-4 cursor-pointer group transition-all duration-300
                 bg-neumorphic-base dark:bg-neumorphic-base-dark 
                 shadow-neumorphic dark:shadow-neumorphic-dark
                 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                 hover:-translate-y-0.5 active:scale-[0.97]
                 rounded-lg flex flex-col items-center justify-center min-h-[9rem] w-full
                 border-l-4 border-slate-300 dark:border-slate-600 overflow-hidden`} // UI: Book spine
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {/* --- NEW: "NEW" Badge --- */}
      {isNew && (
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-md">
          NEW
        </span>
      )}

      {/* --- NEW: Bookmark Ribbon --- */}
      <div className="absolute top-0 right-2 z-0 w-4 h-6 bg-red-500 dark:bg-red-600 shadow-md transform translate-y-[-1px]">
        <div 
          className="absolute bottom-0 left-0 w-full h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[6px] border-b-neumorphic-base dark:border-b-neumorphic-base-dark"
          style={{ content: '""' }}
        ></div>
      </div>
      
      {/* Spacer to push content down */}
      <div className="flex-1"></div>

      {/* Lesson Count (Above Title) */}
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neumorphic-base dark:bg-slate-700 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-700 dark:text-red-300">
        {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
      </span>
      
      {/* Unit Name (Below Count) */}
      <p className="mt-1.5 text-xs sm:text-sm font-semibold text-center text-slate-700 dark:text-slate-200 line-clamp-2">
        {title}
      </p>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
};

// ---------- Main component ----------
const LessonsByUnitView = ({
  selectedClass,
  lessons,
  units,
  onBack,
  onContentUpdate,
  setLessonToView, // <-- MODIFIED: Accept setLessonToView as a prop
  showBackButton = true, // <-- NEW PROP
  showRefreshButton = true, // <-- NEW PROP
}) => {
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  // --- MODIFIED: Removed local lessonToView state ---
  // const [lessonToView, setLessonToView] = useState(null); 
  const [localProgressUpdates, setLocalProgressUpdates] = useState({});
  
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const pullDistance = useRef(0);
  const containerRef = useRef(null);

  const { userProfile, setUserProfile } = useAuth();
  const { showToast } = useToast();

  // (useEffect for grouping lessons... remains unchanged)
  useEffect(() => {
    if (lessons.length > 0 || units.length > 0) {
      // Create a map of unit IDs to the full unit object
      const unitsMap = new Map(units.map((unit) => [unit.id, unit]));

      const grouped = lessons.reduce((acc, lesson) => {
        const unit = unitsMap.get(lesson.unitId);
        const unitTitle = unit ? unit.title : 'Uncategorized';
        
        // Get createdAt from the unit, if it exists
        const unitCreatedAt = unit ? unit.createdAt : null;

        if (!acc[unitTitle]) {
          acc[unitTitle] = { 
            lessons: [], 
            createdAt: unitCreatedAt // Store createdAt against the title
          };
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

  // (useMemo for sorting... remains unchanged)
  const sortedUnitTitles = useMemo(() => {
    return Object.keys(lessonsByUnit).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [lessonsByUnit]);
  
  // (Haptic helper, pull-to-refresh... remain unchanged)
  // ...
    // ---------- Haptic helper ----------
  const maybeHaptic = (pattern = 30) => {
    try {
      if (navigator?.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // ignore
    }
  };

  // ---------- Pull-to-refresh touch handlers (unchanged) ----------
  const pullThreshold = 70; // px to trigger refresh

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
      if (pullDistance.current >= pullThreshold) {
        setIsRefreshing(true);
        maybeHaptic(50);
        if (onContentUpdate) {
          try {
            await onContentUpdate();
            showToast('Refreshed.', 'success');
          } catch (err) {
            console.error('Refresh failed:', err);
            showToast('Refresh failed.', 'error');
          }
        } else {
          showToast('No refresh handler provided.', 'info');
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

  // --- MODIFIED: Lesson completion handler (Uses prop setLessonToView) ---
  const handleLessonComplete = useCallback(
    async (progress) => {
      if (!progress.lessonId) return;

      const updatedLessonData = {
        pagesRead: progress.pagesRead,
        totalPages: progress.totalPages,
        isCompleted: progress.isFinished,
      };

      // --- Use prop setter ---
      if (setLessonToView) {
        setLessonToView((prev) => (prev ? { ...prev, ...updatedLessonData } : null));
      }
      setLocalProgressUpdates((prev) => ({
        ...prev,
        [progress.lessonId]: updatedLessonData,
      }));

      if (!progress.isFinished || !userProfile?.id) return;

      // --- MODIFIED: Updated XP from 25 to 250 ---
      const XP_FOR_LESSON = 250; 
      const completedLessons = userProfile.completedLessons || [];

      if (completedLessons.includes(progress.lessonId)) return;

      const updatedUser = {
        ...userProfile,
        xp: (userProfile.xp || 0) + XP_FOR_LESSON,
        completedLessons: [...completedLessons, progress.lessonId],
      };
      setUserProfile(updatedUser);
      localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
      showToast(`🎉 Lesson finished! You earned ${XP_FOR_LESSON} XP!`, 'success');

      maybeHaptic(30);

      try {
        const userRef = doc(db, 'users', userProfile.id);
        await updateDoc(userRef, {
          xp: increment(XP_FOR_LESSON),
          completedLessons: arrayUnion(progress.lessonId),
        });
      } catch (error) {
        console.warn('Firestore sync failed, will retry later:', error);
        const pending = JSON.parse(localStorage.getItem('pendingCompletions') || '[]');
        pending.push(progress.lessonId);
        localStorage.setItem('pendingCompletions', JSON.stringify(pending));
      }
    },
    [userProfile, setUserProfile, showToast, setLessonToView] // --- Added setLessonToView
  );

  // (Auto-sync... remains unchanged)
  useEffect(() => {
    const syncPending = async () => {
      const pending = JSON.parse(localStorage.getItem('pendingCompletions') || '[]');
      if (!pending.length || !userProfile?.id) return;
      try {
        const userRef = doc(db, 'users', userProfile.id);
        await updateDoc(userRef, { completedLessons: arrayUnion(...pending) });
        localStorage.removeItem('pendingCompletions');
      } catch (e) {
        console.error('Pending sync failed:', e);
      }
    };
    window.addEventListener('online', syncPending);
    return () => window.removeEventListener('online', syncPending);
  }, [userProfile?.id]);

  // ---------- Render ----------
  return (
    <div className="min-h-full font-sans antialiased">
      {/* --- MODIFIED: Removed max-w-4xl and padding to let parent control it --- */}
      <div className=""> 
        {/* --- MODIFIED: Conditionally render Back Button --- */}
        {showBackButton && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 mb-4 text-sm sm:text-base font-semibold text-red-600 dark:text-red-400
                       bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            All Classes
          </button>
        )}

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">Lessons</h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">For {selectedClass?.name}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* --- MODIFIED: Conditionally render Refresh Button --- */}
            {showRefreshButton && (
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  maybeHaptic(30);
                  try {
                    if (onContentUpdate) await onContentUpdate();
                    showToast('Refreshed.', 'success');
                  } catch (err) {
                    console.error('Refresh failed:', err);
                    showToast('Refresh failed.', 'error');
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
              >
                {isRefreshing ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span>Refreshing...</span>
                  </div>
                ) : (
                  'Refresh'
                )}
              </button>
            )}
          </div>
        </div>

        {/* ----- Master-Detail Render Logic ----- */}
        {sortedUnitTitles.length > 0 ? (
          <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* ... (Rest of the render logic is unchanged) ... */}
            {isRefreshing && (
              <div className="text-center text-red-600 dark:text-red-400 text-sm font-semibold pt-2">
                Fetching updates...
              </div>
            )}
            {selectedUnit ? (
              <div className="animate-fadeIn">
                <button
                  onClick={() => setSelectedUnit(null)}
                  className="flex items-center gap-2 px-4 py-2 mb-4 text-sm sm:text-base font-semibold text-red-600 dark:text-red-400
                             bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                             hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  Back to Units
                </button>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 px-1">
                  {selectedUnit}
                </h2>
                <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark p-2 sm:p-3 space-y-2">
                  {(lessonsByUnit[selectedUnit]?.lessons || []).map((lesson) => (
                    <LessonListItem
                      key={lesson.id}
                      lesson={lesson}
                      completedLessons={userProfile?.completedLessons || []}
                      onClick={() => {
                        maybeHaptic(20);
                        if (setLessonToView) setLessonToView(lesson); // --- Use prop setter ---
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-2 animate-fadeIn">
                {sortedUnitTitles.map((unitTitle) => {
                  const unitData = lessonsByUnit[unitTitle];
                  const lessonsInUnit = unitData?.lessons || [];
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  let isNew = false;
                  if (unitData?.createdAt) {
                      const createdAtDate = unitData.createdAt.toDate ? 
                                            unitData.createdAt.toDate() : 
                                            new Date(unitData.createdAt);
                      if (createdAtDate > sevenDaysAgo) {
                          isNew = true;
                      }
                  }
                  return (
                    <UnitBook
                      key={unitTitle}
                      title={unitTitle}
                      lessonCount={lessonsInUnit.length}
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
          </div>
        ) : (
          <EmptyState
            icon={BookOpenIcon}
            text="No Lessons Available"
            subtext="Your teacher hasn't shared any lessons for this class yet."
          />
        )}
      </div>

      {/* --- MODIFIED: This component no longer manages its own modal --- */}
      {/* The parent component (StudentDashboard or StudentClassDetailView) will render it */}
      {/* {lessonToView && (
        <ViewLessonModal
          isOpen={!!lessonToView}
          onClose={() => setLessonToView(null)}
          lesson={lessonToView}
          onComplete={handleLessonComplete}
        />
      )}
      */}
    </div>
  );
};

export default LessonsByUnitView;