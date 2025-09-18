import React, { useState, useEffect } from 'react';
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
// ✅ REMOVED: ViewLessonModal import is no longer needed here.

// --- UI Helper Components (iOS Style) ---

const EmptyState = ({ icon: Icon, text, subtext }) => (
    <div className="text-center py-24 px-6 animate-fadeIn">
        <Icon className="h-14 w-14 mb-4 text-slate-300 mx-auto" />
        <p className="text-lg font-semibold text-slate-600">{text}</p>
        <p className="mt-2 text-base text-slate-400">{subtext}</p>
    </div>
);

const IOSLessonListItem = ({ lesson, onClick }) => (
    <div
        onClick={onClick}
        className="group flex items-center space-x-4 p-4 bg-transparent hover:bg-black/5 transition-colors duration-200 cursor-pointer border-b border-slate-900/10 last:border-b-0"
    >
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
            <SparklesIcon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-slate-800 truncate">{lesson.title}</h3>
            {lesson.description && <p className="text-sm text-slate-500 mt-0.5 truncate">{lesson.description}</p>}
        </div>
        <div className="flex-shrink-0">
            <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-500 transition-colors" />
        </div>
    </div>
);

const UnitSectionHeader = ({ title, isCollapsed, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex justify-between items-center py-2 group"
    >
        <span className="bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
            {title}
        </span>
        {isCollapsed ? (
            <ChevronDownIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-transform" />
        ) : (
            <ChevronUpIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-transform" />
        )}
    </button>
);

/**
 * Displays lessons grouped by unit for a specific class, with an iOS-inspired UI.
 */
const LessonsByUnitView = ({ selectedClass, lessons, units, onBack, setLessonToView }) => {
    const [lessonsByUnit, setLessonsByUnit] = useState({});
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());
    // ✅ REMOVED: Local state for the modal is no longer needed.
    // const [viewLessonData, setViewLessonData] = useState(null);

    useEffect(() => {
        // ... (this useEffect logic remains the same)
        if (lessons.length > 0 && units.length > 0) {
            const unitsMap = new Map(units.map(unit => [unit.id, unit.title]));
            const grouped = lessons.reduce((acc, lesson) => {
                const unitTitle = unitsMap.get(lesson.unitId) || 'Uncategorized';
                if (!acc[unitTitle]) { acc[unitTitle] = []; }
                acc[unitTitle].push(lesson);
                return acc;
            }, {});
            Object.keys(grouped).forEach(unitTitle => {
                grouped[unitTitle].sort((a, b) => {
                    const orderA = a.order ?? Infinity;
                    const orderB = b.order ?? Infinity;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.title.localeCompare(b.title, 'en-US', { numeric: true });
                });
            });
            setLessonsByUnit(grouped);
            setCollapsedUnits(new Set(Object.keys(grouped)));
        } else if (lessons.length > 0 && units.length === 0) {
            const grouped = { 'Uncategorized': [...lessons] };
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
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) {
                newSet.delete(unitTitle);
            } else {
                newSet.add(unitTitle);
            }
            return newSet;
        });
    };

    // ✅ MODIFIED: The click handler now only calls the prop to trigger the global modal.
    const handleLessonClick = (lesson) => {
        setLessonToView(lesson);
    };

    // ✅ REMOVED: The closeLessonModal function is no longer needed.
    
    const sortedUnitTitles = Object.keys(lessonsByUnit).sort();

    return (
        <div className="min-h-full font-sans antialiased"> 
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-red-600 hover:text-red-700 transition-colors mb-6 text-lg group font-semibold"
                >
                    <ChevronLeftIcon className="h-6 w-6 mr-1 transition-transform group-hover:-translate-x-1" />
                    <span>All Classes</span>
                </button>

                <div className="mb-10">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-2">Lessons</h1>
                    <p className="text-xl sm:text-2xl text-slate-500">For {selectedClass.name}</p>
                </div>

                {sortedUnitTitles.length > 0 ? (
                    <div className="space-y-4">
                        {sortedUnitTitles.map(unitTitle => {
                            const isCollapsed = collapsedUnits.has(unitTitle);
                            return (
                                <div key={unitTitle} className="animate-fadeIn">
                                    <UnitSectionHeader
                                        title={unitTitle}
                                        isCollapsed={isCollapsed}
                                        onClick={() => toggleUnitCollapse(unitTitle)}
                                    />
                                    {!isCollapsed && (
                                        <div className="mt-1 bg-white/60 backdrop-blur-3xl rounded-2xl shadow-lg-floating-md border border-slate-200/50 overflow-hidden">
                                            {lessonsByUnit[unitTitle].map(lesson => (
                                                <IOSLessonListItem key={lesson.id} lesson={lesson} onClick={() => handleLessonClick(lesson)} />
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
                        text={`No Lessons Available`}
                        subtext="Your teacher hasn't shared any lessons for this class yet."
                    />
                )}
            </div>

            {/* ✅ REMOVED: The local instance of ViewLessonModal is gone. */}
        </div>
    );
};

export default LessonsByUnitView;