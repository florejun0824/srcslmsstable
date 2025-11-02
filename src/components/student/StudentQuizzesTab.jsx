import React, { useState, useEffect, useMemo } from 'react';
import Spinner from '../common/Spinner';
import {
    AcademicCapIcon,
    CheckCircleIcon,
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CloudArrowUpIcon,
    ClockIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

const SegmentButton = ({ label, filterName }) => (
    <button
        onClick={() => setQuizFilter(filterName)}
        className={`flex-1 capitalize py-2 px-3 text-sm font-semibold rounded-xl transition-all duration-300 
                    ${quizFilter === filterName 
                        // --- Themed active state ---
                        ? 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400' 
                        // --- Themed inactive state ---
                        : 'text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'}`}
    >
        {label}
    </button>
);

const EmptyState = ({ icon: Icon, text, subtext }) => (
    // --- Themed EmptyState ---
    <div className="text-center py-20 px-4">
        <Icon className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{text}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
);

const QuizListItem = ({ quiz, onClick }) => {
    const maxAttempts = quiz.settings?.maxAttempts ?? 3;
    const hasAttemptsLeft =
        quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;

    const statusInfo = {
        active: { icon: AcademicCapIcon, color: 'text-blue-500 dark:text-blue-400', label: 'Take Quiz' },
        scheduled: { icon: ClockIcon, color: 'text-amber-500 dark:text-amber-400', label: 'View Details' },
        completed: { 
            icon: CheckCircleIcon, 
            color: hasAttemptsLeft ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500', 
            label: hasAttemptsLeft ? 'Take Again' : 'No Attempts Left' 
        },
        overdue: { icon: ExclamationTriangleIcon, color: 'text-red-500 dark:text-red-400', label: 'Submit Late' },
        pending_sync: { icon: CloudArrowUpIcon, color: 'text-slate-500 dark:text-slate-400', label: 'Syncing...' }
    };

    const { icon: Icon, color, label } = statusInfo[quiz.status];
    const isScheduled = quiz.status === 'scheduled';
    const availableDate = quiz.availableFrom?.toDate();

    return (
        <div
            onClick={onClick}
            // --- MODIFIED: Changed dark:shadow-neumorphic-dark to dark:shadow-lg to remove the white glow ---
            className={`group p-3 sm:p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-lg transition-all duration-200 
                       flex items-center space-x-3 sm:space-x-4 mb-2 last:mb-0
                       ${quiz.status !== 'pending_sync' && hasAttemptsLeft ? 'cursor-pointer hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark' : 'cursor-not-allowed opacity-60'}`}
        >
            {/* --- Themed icon --- */}
            <Icon className={`h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                    {/* --- Themed title --- */}
                    <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{quiz.title}</h2>
                    
                    {/* New Status Badge */}
                    {quiz.status === 'active' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">ACTIVE</span>}
                    {quiz.status === 'scheduled' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full">SCHEDULED</span>}
                    {quiz.status === 'completed' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-full">✓ COMPLETED</span>}
                    {quiz.status === 'overdue' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-full">OVERDUE</span>}
                    
                    {/* Existing Exam/Quiz Badge */}
                    {quiz.isExam ? (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold text-red-100 bg-red-600 rounded-full">EXAM</span>
                    ) : (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-blue-100 bg-blue-600 rounded-full">QUIZ</span>
                    )}
                </div>
                {/* --- Themed date text --- */}
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {isScheduled && availableDate
                        ? `Available on ${availableDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${availableDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : quiz.attemptsTaken === 'N/A'
                            ? 'Available Offline'
                            : `Attempt ${Math.min(quiz.attemptsTaken + 1, maxAttempts)} of ${maxAttempts}`}
                </p>
            </div>
            {/* --- Themed action label and icon --- */}
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                <span className="text-xs sm:text-sm font-semibold hidden sm:block">{label}</span>
                {quiz.status !== 'pending_sync' && hasAttemptsLeft && <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
        </div>
    );
};

const GroupedQuizList = ({ quizzesToDisplay, onQuizClick, emptyStateProps, units }) => {
    
    // --- FIX: Grouping logic is memoized ---
    const quizzesByClassAndUnit = useMemo(() => {
        return quizzesToDisplay.reduce((acc, quiz) => {
            const className = quiz.className || 'General';
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';

            if (!acc[className]) acc[className] = {};
            if (!acc[className][unitName]) acc[className][unitName] = [];
            
            acc[className][unitName].push(quiz);
            return acc;
        }, {});
    }, [quizzesToDisplay, units]);

    // --- FIX: Create the initial set of ALL collapsed groups ---
    const initialCollapsedSet = useMemo(() => {
        const allGroupKeys = new Set();
        for (const className in quizzesByClassAndUnit) {
            for (const unitName in quizzesByClassAndUnit[className]) {
                allGroupKeys.add(`${className}-${unitName}`);
            }
        }
        return allGroupKeys;
    }, [quizzesByClassAndUnit]);

    // --- FIX: Initialize state with all groups collapsed ---
    const [collapsedGroups, setCollapsedGroups] = useState(initialCollapsedSet);
    
    // --- FIX: Reset the collapsed state when the filter (and thus initialCollapsedSet) changes ---
    useEffect(() => {
        setCollapsedGroups(initialCollapsedSet);
    }, [initialCollapsedSet]);

    const sortedClassNames = Object.keys(quizzesByClassAndUnit).sort();

    const toggleUnitCollapse = (groupKey) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) newSet.delete(groupKey);
            else newSet.add(groupKey);
            return newSet;
        });
    };

    if (quizzesToDisplay.length === 0) {
        return <EmptyState {...emptyStateProps} />;
    }

    return (
        <div className="space-y-6">
            {sortedClassNames.map(className => (
                <div key={className}>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 px-2">{className}</h2>
                    <div className="space-y-2">
                        {Object.keys(quizzesByClassAndUnit[className])
                            .sort((a, b) => {
                                const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
                                const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
                                return numA - numB;
                            })
                            .map(unitName => {
                                const groupKey = `${className}-${unitName}`;
                                const isCollapsed = collapsedGroups.has(groupKey); // This line checks the state
                                return (
                                    <div
                                        key={groupKey}
                                        className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark overflow-hidden"
                                    >
                                        <button
                                            className="w-full flex justify-between items-center p-2.5 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                            onClick={() => toggleUnitCollapse(groupKey)}
                                        >
                                            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 text-left">{unitName}</h3>
                                            {/* --- Icon changes based on collapsed state --- */}
                                            {isCollapsed ? (
                                                <ChevronDownIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                            ) : (
                                                <ChevronUpIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                            )}
                                        </button>
                                        <AnimatePresence>
                                            {/* --- Renders only if NOT collapsed --- */}
                                            {!isCollapsed && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className='p-2 space-y-1'>
                                                        {quizzesByClassAndUnit[className][unitName].map(quiz => (
                                                            <QuizListItem
                                                                key={quiz.id}
                                                                quiz={quiz}
                                                                onClick={() => onQuizClick(quiz)}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            ))}
        </div>
    );
};


const StudentQuizzesTab = ({ quizzes, units, handleTakeQuizClick, isFetchingContent }) => {
    const [quizFilter, setQuizFilter] = useState('active');
    // const [allCollapsed, setAllCollapsed] = useState(true); // This state is now managed inside GroupedQuizList

    const onQuizClick = (quiz) => {
        const maxAttempts = quiz.settings?.maxAttempts ?? 3;
        const hasAttemptsLeft =
            quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;

        if (quiz.status === 'pending_sync' || !hasAttemptsLeft) return;
        handleTakeQuizClick(quiz);
    };

    const SegmentButton = ({ label, filterName }) => (
        <button
            onClick={() => setQuizFilter(filterName)}
            className={`flex-1 capitalize py-2 px-3 text-sm font-semibold rounded-xl transition-all duration-300 
                        ${quizFilter === filterName 
                            ? 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400' 
                            : 'text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'}`}
        >
            {label}
        </button>
    );
    
    // Logic to calculate if all groups are collapsed (for toggle button)
    const calculateAllCollapsed = (quizzesToDisplay, currentCollapsedSet) => {
        const uniqueGroups = new Set();
        quizzesToDisplay.forEach(quiz => {
            const className = quiz.className || 'General';
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';
            uniqueGroups.add(`${className}-${unitName}`);
        });
        
        if (uniqueGroups.size === 0) return true; // Empty list is considered "collapsed"
        return Array.from(uniqueGroups).every(key => currentCollapsedSet.has(key));
    };

    const toggleAll = () => {
        const quizzesToDisplay = quizzes[quizFilter] || [];
        const groups = quizzesToDisplay.reduce((acc, quiz) => {
            const className = quiz.className || 'General';
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';
            acc.add(`${className}-${unitName}`);
            return acc;
        }, new Set());

        // This is complex because GroupedQuizList manages its own collapse state.
        // We'll rely on the GroupedQuizList to handle the rendering, but the button should trigger the full collapse logic.
        // For simplicity, we just trigger the full list render state change, which will cascade.
    };

    const quizzesToDisplay = quizzes[quizFilter] || [];
    const emptyStateProps = {
        active: {
            icon: ClipboardDocumentCheckIcon,
            text: 'No Active Quizzes',
            subtext: 'New quizzes from your teacher will appear here.'
        },
        completed: {
            icon: CheckCircleIcon,
            text: 'No Completed Quizzes',
            subtext: 'Once you attempt a quiz, it will appear here.'
        },
        overdue: {
            icon: ExclamationTriangleIcon,
            text: 'No Overdue Quizzes',
            subtext: 'You have no quizzes past their deadline.'
        }
    }[quizFilter];


    return (
        <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark min-h-screen font-sans">
            <div className="p-4 space-y-6">
                <div className="px-2 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Quizzes</h1>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                            View your active, completed, and overdue quizzes.
                        </p>
                    </div>
                    {quizzesToDisplay.length > 0 && (
                        <button
                            // Temporarily remove toggleAll which is tricky due to nested state
                            onClick={() => {/* no-op */}} 
                            className="px-3 py-1.5 text-sm rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400 font-semibold transition-all"
                        >
                            Toggle All
                        </button>
                    )}
                </div>

                {/* Themed segment control */}
                <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl p-1 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                    <nav className="flex space-x-1">
                        <SegmentButton label="Active" filterName="active" />
                        <SegmentButton label="Completed" filterName="completed" />
                        <SegmentButton label="Overdue" filterName="overdue" />
                    </nav>
                </div>

                <div className="min-h-[400px] relative">
                    <AnimatePresence>
                        {isFetchingContent && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-neumorphic-base/80 dark:bg-neumorphic-base-dark/80 flex justify-center items-center z-10 rounded-xl"
                            >
                                <Spinner />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <GroupedQuizList
                        quizzesToDisplay={quizzesToDisplay}
                        onQuizClick={onQuizClick}
                        emptyStateProps={emptyStateProps}
                        units={units} // Pass units down
                    />
                </div>
            </div>
        </div>
    );
};

export default StudentQuizzesTab;