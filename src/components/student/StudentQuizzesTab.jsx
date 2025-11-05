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

// EmptyState Component
const EmptyState = ({ icon: Icon, text, subtext }) => (
    // --- Themed EmptyState ---
    <div className="text-center py-20 px-4">
        <Icon className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{text}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
);

// QuizListItem Component
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

// GroupedQuizList Component (Now receives state from parent)
const GroupedQuizList = ({
    onQuizClick,
    emptyStateProps,
    quizzesByPostAndUnit, // <-- NEW: Receives pre-grouped data
    collapsedGroups,      // <-- NEW: Receives collapse state
    toggleUnitCollapse    // <-- NEW: Receives toggle function
}) => {

    // --- MODIFIED: Sort by post creation time, just like the modal ---
    const sortedPostTitles = useMemo(() => {
        return Object.keys(quizzesByPostAndUnit).sort((a, b) => {
            const postA = quizzesByPostAndUnit[a];
            const postB = quizzesByPostAndUnit[b];
            const timeA = postA.postCreatedAt?.toDate ? postA.postCreatedAt.toDate().getTime() : 0;
            const timeB = postB.postCreatedAt?.toDate ? postB.postCreatedAt.toDate().getTime() : 0;
            return timeA - timeB; // Sort ascending
        });
    }, [quizzesByPostAndUnit]);
    // --- END MODIFICATION ---

    if (sortedPostTitles.length === 0) {
        return <EmptyState {...emptyStateProps} />;
    }

    return (
        <div className="space-y-6">
            {/* --- MODIFIED: Map over sortedPostTitles --- */}
            {sortedPostTitles.map(postTitle => {
                const postData = quizzesByPostAndUnit[postTitle];
                const unitsInPost = postData.units;
                return (
                    <div key={postTitle}>
                        {/* --- MODIFIED: Use postTitle for heading --- */}
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 px-2">{postTitle}</h2>
                        <div className="space-y-2">
                            {/* --- MODIFIED: Map over unitsInPost --- */}
                            {Object.keys(unitsInPost)
                                .sort((a, b) => {
                                    const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
                                    const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
                                    return numA - numB;
                                })
                                .map(unitName => {
                                    // --- MODIFIED: Use postTitle for groupKey ---
                                    const groupKey = `${postTitle}-${unitName}`;
                                    const isCollapsed = collapsedGroups.has(groupKey);
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
                                                {isCollapsed ? (
                                                    <ChevronDownIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                                ) : (
                                                    <ChevronUpIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                                )}
                                            </button>
                                            <AnimatePresence>
                                                {!isCollapsed && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className='p-2 space-y-1'>
                                                            {/* --- MODIFIED: Map quizzes from unitsInPost --- */}
                                                            {unitsInPost[unitName].map(quiz => (
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
                );
            })}
        </div>
    );
};

// Main Component
const StudentQuizzesTab = ({ quizzes, units, handleTakeQuizClick, isFetchingContent }) => {
    const [quizFilter, setQuizFilter] = useState('active');

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
    
    // --- MODIFIED: All grouping and collapse logic is lifted here ---
    const quizzesToDisplay = quizzes[quizFilter] || [];

    const quizzesByPostAndUnit = useMemo(() => {
        return (quizzesToDisplay || []).reduce((acc, quiz) => {
            const postTitle = quiz.postTitle || 'General Posts';
            const postCreatedAt = quiz.postCreatedAt || null;
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';
            
            if (!acc[postTitle]) {
                acc[postTitle] = { postCreatedAt: postCreatedAt, units: {} };
            }
            if (!acc[postTitle].units[unitName]) {
                acc[postTitle].units[unitName] = [];
            }
            
            acc[postTitle].units[unitName].push(quiz);
            return acc;
        }, {});
    }, [quizzesToDisplay, units]);

    const initialCollapsedSet = useMemo(() => {
        const allGroupKeys = new Set();
        for (const postTitle in quizzesByPostAndUnit) {
            for (const unitName in quizzesByPostAndUnit[postTitle].units) {
                allGroupKeys.add(`${postTitle}-${unitName}`);
            }
        }
        return allGroupKeys;
    }, [quizzesByPostAndUnit]);

    const [collapsedGroups, setCollapsedGroups] = useState(initialCollapsedSet);
    
    useEffect(() => {
        setCollapsedGroups(initialCollapsedSet);
    }, [initialCollapsedSet]);

    const toggleUnitCollapse = (groupKey) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) newSet.delete(groupKey);
            else newSet.add(groupKey);
            return newSet;
        });
    };
    
    const allAreCollapsed = initialCollapsedSet.size === 0 || 
                          (initialCollapsedSet.size === collapsedGroups.size && 
                           Array.from(initialCollapsedSet).every(key => collapsedGroups.has(key)));

    const toggleAll = () => {
        if (allAreCollapsed) {
            setCollapsedGroups(new Set()); // Expand all
        } else {
            setCollapsedGroups(initialCollapsedSet); // Collapse all
        }
    };
    // --- END OF LIFTED LOGIC ---


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
                            // --- MODIFIED: onClick and text are now functional ---
                            onClick={toggleAll} 
                            className="px-3 py-1.5 text-sm rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400 font-semibold transition-all"
                        >
                            {allAreCollapsed ? 'Expand All' : 'Collapse All'}
                        </button>
                        // --- END MODIFICATION ---
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

                    {/* --- MODIFIED: Pass new props to GroupedQuizList --- */}
                    <GroupedQuizList
                        onQuizClick={onQuizClick}
                        emptyStateProps={emptyStateProps}
                        quizzesByPostAndUnit={quizzesByPostAndUnit}
                        collapsedGroups={collapsedGroups}
                        toggleUnitCollapse={toggleUnitCollapse}
                    />
                    {/* --- END MODIFICATION --- */}
                </div>
            </div>
        </div>
    );
};

export default StudentQuizzesTab;