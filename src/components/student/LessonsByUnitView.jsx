// src/components/student/LessonsByUnitView.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import ViewLessonModal from './StudentViewLessonModal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

// ---------- Empty state (themed) ----------
const EmptyState = ({ icon: Icon, text, subtext }) => (
  // --- MODIFIED: Added dark mode classes ---
  <div className="text-center py-20 px-6 animate-fadeIn">
    <Icon className="h-14 w-14 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
    <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">{text}</p>
    <p className="mt-2 text-base text-slate-400 dark:text-slate-500">{subtext}</p>
  </div>
);

// ---------- Enhanced LessonListItem (themed) ----------
const LessonListItem = ({ lesson, onClick, completedLessons }) => {
  const isLessonCompleted =
    lesson.isCompleted || (completedLessons && completedLessons.includes(lesson.id));

  let progressText;
  let badgeClasses;

  if (isLessonCompleted) {
    progressText = 'Completed';
    // --- MODIFIED: Added dark mode classes ---
    badgeClasses = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  } else if (lesson.pagesRead && lesson.totalPages && lesson.pagesRead > 0) {
    progressText = `In Progress: Page ${lesson.pagesRead} of ${lesson.totalPages}`;
    // --- MODIFIED: Added dark mode classes ---
    badgeClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  } else {
    progressText = 'Not Started';
    // --- MODIFIED: Added dark mode classes ---
    badgeClasses = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      // --- MODIFIED: Themed main container, shadows, and hover ---
      className="group relative flex items-center gap-4 p-4 cursor-pointer rounded-2xl
                 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-all duration-200
                 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:scale-[0.98]"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {/* Lesson Icon */}
      <div className={`flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center
                       ${isLessonCompleted ? 'bg-green-500' : 'bg-red-500'}
                       shadow-inner`}>
        <SparklesIcon className="h-5 w-5 text-white" />
      </div>

      {/* Lesson Info */}
      <div className="flex-1 min-w-0">
        {/* --- MODIFIED: Themed text --- */}
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

// ---------- Unit header (themed) ----------
const UnitSectionHeader = ({ title, isCollapsed, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex justify-between items-center p-2 group"
  >
    {/* --- MODIFIED: Themed pill background, shadow, and text --- */}
    <span className="bg-neumorphic-base dark:bg-neumorphic-base-dark px-4 py-2 rounded-full shadow-neumorphic dark:shadow-neumorphic-dark text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 transition-transform group-hover:scale-105">
        {title}
    </span>
    <div className="p-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark group-hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow duration-200">
        {/* --- MODIFIED: Themed icons --- */}
        {isCollapsed ? (
            <ChevronDownIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        ) : (
            <ChevronUpIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        )}
    </div>
  </button>
);

// ---------- Main component ----------
const LessonsByUnitView = ({ selectedClass, lessons, units, onBack, onContentUpdate }) => {
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  const [collapsedUnits, setCollapsedUnits] = useState(new Set());
  const [lessonToView, setLessonToView] = useState(null);
  const [localProgressUpdates, setLocalProgressUpdates] = useState({});

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const pullDistance = useRef(0);
  const containerRef = useRef(null);

  const { userProfile, setUserProfile } = useAuth();
  const { showToast } = useToast();

  // Group lessons by unit (unchanged)
  useEffect(() => {
    if (lessons.length > 0 || units.length > 0) {
      const unitsMap = new Map(units.map((unit) => [unit.id, unit.title]));
      const grouped = lessons.reduce((acc, lesson) => {
        const unitTitle = unitsMap.get(lesson.unitId) || 'Uncategorized';
        if (!acc[unitTitle]) acc[unitTitle] = [];

        const lessonId = lesson.id;
        const localUpdate = localProgressUpdates[lessonId];
        const lessonWithProgress = localUpdate ? { ...lesson, ...localUpdate } : lesson;

        acc[unitTitle].push(lessonWithProgress);
        return acc;
      }, {});

      Object.keys(grouped).forEach((unitTitle) => {
        grouped[unitTitle].sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          return orderA !== orderB ? orderA - orderB : a.title.localeCompare(b.title);
        });
      });

      setLessonsByUnit(grouped);
      if (collapsedUnits.size === 0) setCollapsedUnits(new Set(Object.keys(grouped)));
    } else {
      setLessonsByUnit({});
      setCollapsedUnits(new Set());
    }
  }, [lessons, units, localProgressUpdates]);

  const sortedUnitTitles = useMemo(() => Object.keys(lessonsByUnit).sort(), [lessonsByUnit]);

  const toggleUnitCollapse = (unitTitle) => {
    setCollapsedUnits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(unitTitle)) newSet.delete(unitTitle);
      else newSet.add(unitTitle);
      return newSet;
    });
  };

  // Expand/Collapse All
  const handleExpandCollapseAll = () => {
    setCollapsedUnits((prev) => {
      const allCollapsed = sortedUnitTitles.every((title) => prev.has(title));
      return allCollapsed ? new Set() : new Set(sortedUnitTitles);
    });
  };

  // ---------- Haptic helper ----------
  const maybeHaptic = (pattern = 30) => {
    try {
      // Prefer navigator.vibrate (works on many devices). For Capacitor native, you can later swap to Haptics plugin.
      if (navigator?.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // ignore
    }
  };

  // ---------- Pull-to-refresh touch handlers ----------
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
    // optional visual feedback: set transform for container
    if (pullDistance.current > 0 && containerRef.current) {
      containerRef.current.style.transform = `translateY(${Math.min(pullDistance.current / 2, 80)}px)`;
    }
  };

  const handleTouchEnd = async () => {
    if (touchStartY.current == null) return;
    try {
      if (pullDistance.current >= pullThreshold) {
        // Trigger refresh
        setIsRefreshing(true);
        maybeHaptic(50);
        if (onContentUpdate) {
          try {
            await onContentUpdate(); // allow caller to refresh lessons/units
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
      // reset visuals
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

  // ---------- Lesson completion handler (same as before) ----------
  const handleLessonComplete = useCallback(
    async (progress) => {
      if (!progress.lessonId) return;

      const updatedLessonData = {
        pagesRead: progress.pagesRead,
        totalPages: progress.totalPages,
        isCompleted: progress.isFinished,
      };

      setLessonToView((prev) => (prev ? { ...prev, ...updatedLessonData } : null));
      setLocalProgressUpdates((prev) => ({
        ...prev,
        [progress.lessonId]: updatedLessonData,
      }));

      if (!progress.isFinished || !userProfile?.id) return;

      const XP_FOR_LESSON = 25;
      const completedLessons = userProfile.completedLessons || [];

      // Prevent duplicate completions
      if (completedLessons.includes(progress.lessonId)) return;

      // Optimistic local update
      const updatedUser = {
        ...userProfile,
        xp: (userProfile.xp || 0) + XP_FOR_LESSON,
        completedLessons: [...completedLessons, progress.lessonId],
      };
      setUserProfile(updatedUser);
      localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
      showToast(`🎉 Lesson finished! You earned ${XP_FOR_LESSON} XP!`, 'success');

      maybeHaptic(30);

      // Firestore sync in background
      try {
        const userRef = doc(db, 'users', userProfile.id);
        await updateDoc(userRef, {
          xp: increment(XP_FOR_LESSON),
          completedLessons: arrayUnion(progress.lessonId),
        });
      } catch (error) {
        console.warn('Firestore sync failed, will retry later:', error);
        // Store unsynced completions offline for later
        const pending = JSON.parse(localStorage.getItem('pendingCompletions') || '[]');
        pending.push(progress.lessonId);
        localStorage.setItem('pendingCompletions', JSON.stringify(pending));
      }
    },
    [userProfile, setUserProfile, showToast]
  );

  // Auto-sync pending completions when online (unchanged)
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6" ref={containerRef}>
        <button
          onClick={onBack}
          // --- MODIFIED: Themed back button ---
          className="flex items-center gap-2 px-4 py-2 mb-4 text-sm sm:text-base font-semibold text-red-600 dark:text-red-400
                     bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                     hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          All Classes
        </button>

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {/* --- MODIFIED: Themed text --- */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">Lessons</h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">For {selectedClass?.name}</p>
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExpandCollapseAll}
              // --- MODIFIED: Themed button ---
              className="flex items-center gap-2 px-3 py-2 text-sm sm:text-base font-semibold
                         text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark
                         hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark hover:text-red-600 dark:hover:text-red-400 active:scale-[0.97]
                         transition-all duration-200"
            >
              <ArrowsUpDownIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              {collapsedUnits.size === 0 ? 'Collapse All' : 'Expand All'}
            </button>

            {/* Manual refresh button */}
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
			      {/* --- MODIFIED: Themed spinner --- */}
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
          </div>
        </div>

        {sortedUnitTitles.length > 0 ? (
          // Container with pull-to-refresh touch handlers
          <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            className="space-y-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Pull-to-refresh text indicator (simplified for cleanliness) */}
            {isRefreshing && (
              <div className="text-center text-red-600 dark:text-red-400 text-sm font-semibold pt-2">
                <ArrowUturnLeftIcon className="h-4 w-4 inline mr-1 animate-spin" /> Fetching updates...
              </div>
            )}
            
            {sortedUnitTitles.map((unitTitle) => {
              const isCollapsed = collapsedUnits.has(unitTitle);
              return (
                <div key={unitTitle} className="animate-fadeIn space-y-2">
                  <UnitSectionHeader
                    title={unitTitle}
                    isCollapsed={isCollapsed}
                    onClick={() => toggleUnitCollapse(unitTitle)}
                  />
                  {!isCollapsed && (
                    // --- MODIFIED: Themed unit content container ---
                    <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark p-2 sm:p-3 space-y-2">
                      {lessonsByUnit[unitTitle].map((lesson) => (
                        <LessonListItem
                          key={lesson.id}
                          lesson={lesson}
                          completedLessons={userProfile?.completedLessons || []}
                          onClick={() => {
                            maybeHaptic(20);
                            setLessonToView(lesson);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpenIcon}
            text="No Lessons Available"
            subtext="Your teacher hasn't shared any lessons for this class yet."
          />
        )}
      </div>

      {lessonToView && (
        <ViewLessonModal
          isOpen={!!lessonToView}
          onClose={() => setLessonToView(null)}
          lesson={lessonToView}
          onComplete={handleLessonComplete}
        />
      )}
    </div>
  );
};

export default LessonsByUnitView;