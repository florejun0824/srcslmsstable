// src/components/student/LessonsByUnitView.js
import React, { useState, useEffect } from 'react';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import ViewLessonModal from '../teacher/ViewLessonModal';

// --- Empty State (Neumorphic) ---
const EmptyState = ({ icon: Icon, text, subtext }) => (
  <div className="text-center py-20 px-6 animate-fadeIn">
    <Icon className="h-14 w-14 mb-4 text-slate-300 mx-auto" />
    <p className="text-lg font-semibold text-slate-600">{text}</p>
    <p className="mt-2 text-base text-slate-400">{subtext}</p>
  </div>
);

// --- Lesson Item ---
const LessonListItem = ({ lesson, onClick }) => {
  const progressText =
    lesson.isCompleted
      ? 'Completed'
      : lesson.pagesRead && lesson.totalPages
        ? `Read Page ${lesson.pagesRead} of ${lesson.totalPages}`
        : 'Not started';

  return (
    <div
      onClick={onClick}
      className="group flex items-center space-x-4 p-3 cursor-pointer transition-all duration-200
                 bg-neumorphic-base rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset"
    >
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-red-500 flex items-center justify-center shadow-neumorphic-inset">
        <SparklesIcon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-800 truncate">{lesson.title}</h3>
        
      </div>
      <div className="flex-shrink-0 text-slate-400 group-hover:text-red-600 transition-colors">
        <ChevronRightIcon className="h-4 w-4" />
      </div>
    </div>
  );
};

// --- Unit Header (accordion style) ---
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

const LessonsByUnitView = ({ selectedClass, lessons, units, onBack }) => {
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  const [collapsedUnits, setCollapsedUnits] = useState(new Set());
  const [lessonToView, setLessonToView] = useState(null);

  useEffect(() => {
    if (lessons.length > 0 && units.length > 0) {
      const unitsMap = new Map(units.map((unit) => [unit.id, unit.title]));
      const grouped = lessons.reduce((acc, lesson) => {
        const unitTitle = unitsMap.get(lesson.unitId) || 'Uncategorized';
        if (!acc[unitTitle]) acc[unitTitle] = [];
        acc[unitTitle].push(lesson);
        return acc;
      }, {});
      Object.keys(grouped).forEach((unitTitle) => {
        grouped[unitTitle].sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          if (orderA !== orderB) return orderA - orderB;
          return a.title.localeCompare(b.title, 'en-US', { numeric: true });
        });
      });
      setLessonsByUnit(grouped);
      setCollapsedUnits(new Set(Object.keys(grouped))); // collapsed by default
    } else if (lessons.length > 0 && units.length === 0) {
      const grouped = { Uncategorized: [...lessons] };
      grouped['Uncategorized'].sort((a, b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title, 'en-US', { numeric: true });
      });
      setLessonsByUnit(grouped);
      setCollapsedUnits(new Set(Object.keys(grouped)));
    } else {
      setLessonsByUnit({});
      setCollapsedUnits(new Set());
    }
  }, [lessons, units]);

  const toggleUnitCollapse = (unitTitle) => {
    setCollapsedUnits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(unitTitle)) newSet.delete(unitTitle);
      else newSet.add(unitTitle);
      return newSet;
    });
  };

  const sortedUnitTitles = Object.keys(lessonsByUnit).sort();

  return (
    <div className="min-h-full font-sans antialiased">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-sm sm:text-base font-semibold text-red-600
                     bg-neumorphic-base rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset
                     hover:text-red-700 transition-all duration-200"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          All Classes
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1">
            Lessons
          </h1>
          <p className="text-sm sm:text-base text-slate-500">For {selectedClass.name}</p>
        </div>

        {/* Units + Lessons */}
        {sortedUnitTitles.length > 0 ? (
          <div className="space-y-4">
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
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic overflow-hidden divide-y divide-gray-200/60">
                      {lessonsByUnit[unitTitle].map((lesson) => (
                        <LessonListItem
                          key={lesson.id}
                          lesson={lesson}
                          onClick={() => setLessonToView(lesson)}
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

      {/* Lesson Viewer Modal */}
      {lessonToView && (
        <ViewLessonModal
          isOpen={!!lessonToView}
          onClose={() => setLessonToView(null)}
          lesson={lessonToView}
          onUpdate={(updatedLesson) => {
            // ✅ Update local lessons with completed/progress info
            setLessonsByUnit((prev) => {
              const newGrouped = { ...prev };
              Object.keys(newGrouped).forEach((unit) => {
                newGrouped[unit] = newGrouped[unit].map((l) =>
                  l.id === updatedLesson.id ? { ...l, ...updatedLesson } : l
                );
              });
              return newGrouped;
            });
            setLessonToView(updatedLesson);
          }}
        />
      )}
    </div>
  );
};

export default LessonsByUnitView;
