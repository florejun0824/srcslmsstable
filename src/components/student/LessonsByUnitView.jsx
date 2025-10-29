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

// ---------- Empty state (unchanged) ----------
const EmptyState = ({ icon: Icon, text, subtext }) => (
  <div className="text-center py-20 px-6 animate-fadeIn">
    <Icon className="h-14 w-14 mb-4 text-slate-300 mx-auto" />
    <p className="text-lg font-semibold text-slate-600">{text}</p>
    <p className="mt-2 text-base text-slate-400">{subtext}</p>
  </div>
);

// ---------- Enhanced LessonListItem (mobile-friendly & neumorphic) ----------
const LessonListItem = ({ lesson, onClick, completedLessons }) => {
  const isLessonCompleted =
    lesson.isCompleted || (completedLessons && completedLessons.includes(lesson.id));

  let progressText;
  let badgeClasses;

  if (isLessonCompleted) {
    progressText = 'Completed';
    badgeClasses = 'bg-green-100 text-green-800';
  } else if (lesson.pagesRead && lesson.totalPages && lesson.pagesRead > 0) {
    progressText = `In Progress: Page ${lesson.pagesRead} of ${lesson.totalPages}`;
    badgeClasses = 'bg-yellow-100 text-yellow-800';
  } else {
    progressText = 'Not Started';
    badgeClasses = 'bg-slate-100 text-slate-600';
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="group relative flex items-center gap-4 p-4 cursor-pointer rounded-2xl
                 bg-neumorphic-base shadow-neumorphic transition-all duration-200
                 hover:shadow-neumorphic-inset active:scale-[0.98]"
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
        <h3 className="text-sm sm:text-base font-semibold text-slate-800 truncate">
          {lesson.title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{lesson.description || ''}</p>
      </div>

      {/* Progress Badge */}
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${badgeClasses}`}
      >
        {progressText}
      </span>

      {/* Right Arrow */}
      <ChevronRightIcon className="absolute right-3 h-4 w-4 text-slate-400 group-hover:text-red-600 transition-colors" />
    </div>
  );
};

// ---------- Unit header ----------
const UnitSectionHeader = ({ title, isCollapsed, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex justify-between items-center px-4 py-2 rounded-xl
               bg-neumorphic-base shadow-neumorphic text-left transition-all duration-200
               hover:shadow-neumorphic-inset"
  >
    <span className="text-sm font-semibold text-slate-700">{title}</span>
    {isCollapsed ? (
      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
    ) : (
      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
    )}
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 mb-4 text-sm sm:text-base font-semibold text-red-600
                     bg-neumorphic-base rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset
                     hover:text-red-700 transition-all duration-200"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          All Classes
        </button>

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1">Lessons</h1>
            <p className="text-sm sm:text-base text-slate-500">For {selectedClass?.name}</p>
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExpandCollapseAll}
              className="flex items-center gap-2 px-3 py-2 text-sm sm:text-base font-semibold
                         text-slate-700 bg-neumorphic-base rounded-xl shadow-neumorphic
                         hover:shadow-neumorphic-inset hover:text-red-600 active:scale-[0.97]
                         transition-all duration-200"
            >
              <ArrowsUpDownIcon className="h-4 w-4 text-slate-500" />
              {collapsedUnits.size === 0 ? 'Collapse All' : 'Expand All'}
            </button>

            {/* Manual refresh button (for platforms where pull-to-refresh may not be used) */}
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
              className="px-3 py-2 text-sm font-medium text-slate-600 bg-neumorphic-base rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset"
            >
			  {isRefreshing ? (
			    <div className="flex items-center gap-2">
			      <svg className="animate-spin h-4 w-4 text-red-600" viewBox="0 0 24 24">
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
            className="space-y-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
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
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic p-2 sm:p-3 space-y-2">
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
