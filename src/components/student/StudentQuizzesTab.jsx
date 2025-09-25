import React, { useState, useEffect } from 'react';
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

const StudentQuizzesTab = ({ quizzes, units, handleTakeQuizClick, isFetchingContent }) => {
    const [quizFilter, setQuizFilter] = useState('active');
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());
    const [allCollapsed, setAllCollapsed] = useState(true);

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
                            ? 'bg-neumorphic-base shadow-neumorphic-inset text-red-600' 
                            : 'text-slate-600 hover:text-red-600 hover:shadow-neumorphic-inset'}`}
        >
            {label}
        </button>
    );

    const EmptyState = ({ icon: Icon, text, subtext }) => (
        <div className="text-center py-20 px-4">
            <Icon className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
            <p className="text-lg font-semibold text-slate-700">{text}</p>
            <p className="mt-1 text-sm text-slate-500">{subtext}</p>
        </div>
    );

    useEffect(() => {
        const quizzesToDisplay = quizzes[quizFilter] || [];
        const groups = quizzesToDisplay.reduce((acc, quiz) => {
            const className = quiz.className || 'General';
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';
            acc.push(`${className}-${unitName}`);
            return acc;
        }, []);
        setCollapsedGroups(new Set(groups));
        setAllCollapsed(true);
    }, [quizzes, quizFilter, units]);

    const GroupedQuizList = ({ quizzesToDisplay, onQuizClick, emptyStateProps }) => {
        if (quizzesToDisplay.length === 0 && !isFetchingContent) {
            return <EmptyState {...emptyStateProps} />;
        }
        
        const quizzesByClassAndUnit = quizzesToDisplay.reduce((acc, quiz) => {
            const className = quiz.className || 'General';
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';

            if (!acc[className]) acc[className] = {};
            if (!acc[className][unitName]) acc[className][unitName] = [];
            
            acc[className][unitName].push(quiz);
            return acc;
        }, {});

        const sortedClassNames = Object.keys(quizzesByClassAndUnit).sort();

        return (
            <div className="space-y-6">
                {sortedClassNames.map(className => (
                    <div key={className}>
                        <h2 className="text-lg font-bold text-slate-800 mb-2 px-2">{className}</h2>
                        <div className="space-y-2">
                            {Object.keys(quizzesByClassAndUnit[className])
                                .sort((a, b) => {
                                    const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
                                    const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
                                    return numA - numB;
                                })
                                .map(unitName => {
                                    const groupKey = `${className}-${unitName}`;
                                    const isCollapsed = collapsedGroups.has(groupKey);
                                    return (
                                        <div
                                            key={groupKey}
                                            className="bg-neumorphic-base rounded-2xl shadow-neumorphic overflow-hidden"
                                        >
                                            <button
                                                className="w-full flex justify-between items-center p-2.5 text-slate-600 hover:text-red-600 transition-all"
                                                onClick={() => {
                                                    setCollapsedGroups(prev => {
                                                        const newSet = new Set(prev);
                                                        if (newSet.has(groupKey)) newSet.delete(groupKey);
                                                        else newSet.add(groupKey);
                                                        return newSet;
                                                    });
                                                }}
                                            >
                                                <h3 className="text-sm font-medium text-slate-700 text-left">{unitName}</h3>
                                                {isCollapsed ? (
                                                    <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                                                ) : (
                                                    <ChevronUpIcon className="h-5 w-5 text-slate-400" />
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
                                                        <div>
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

    const toggleAll = () => {
        if (allCollapsed) {
            setCollapsedGroups(new Set());
            setAllCollapsed(false);
        } else {
            const groups = quizzesToDisplay.map(quiz => {
                const className = quiz.className || 'General';
                const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';
                return `${className}-${unitName}`;
            });
            setCollapsedGroups(new Set(groups));
            setAllCollapsed(true);
        }
    };

    return (
        <div className="bg-neumorphic-base min-h-screen font-sans">
            <div className="p-4 space-y-6">
                <div className="px-2 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">My Quizzes</h1>
                        <p className="text-sm sm:text-base text-slate-500">
                            View your active, completed, and overdue quizzes.
                        </p>
                    </div>
                    {quizzesToDisplay.length > 0 && (
                        <button
                            onClick={toggleAll}
                            className="px-3 py-1.5 text-sm rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset text-red-600 font-semibold transition-all"
                        >
                            {allCollapsed ? 'Expand All' : 'Collapse All'}
                        </button>
                    )}
                </div>

                <div className="bg-neumorphic-base rounded-xl p-1 shadow-neumorphic-inset">
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
                                className="absolute inset-0 bg-neumorphic-base/80 flex justify-center items-center z-10 rounded-xl"
                            >
                                <Spinner />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <GroupedQuizList
                        quizzesToDisplay={quizzesToDisplay}
                        onQuizClick={onQuizClick}
                        emptyStateProps={emptyStateProps}
                    />
                </div>
            </div>
        </div>
    );
};

const QuizListItem = ({ quiz, onClick }) => {
    const maxAttempts = quiz.settings?.maxAttempts ?? 3;
    const hasAttemptsLeft =
        quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;

    const statusInfo = {
        active: { icon: AcademicCapIcon, color: 'text-blue-500', label: 'Take Quiz' },
        scheduled: { icon: ClockIcon, color: 'text-amber-500', label: 'View Details' },
        completed: { 
            icon: CheckCircleIcon, 
            color: hasAttemptsLeft ? 'text-blue-500' : 'text-slate-400', 
            label: hasAttemptsLeft ? 'Take Again' : 'No Attempts Left' 
        },
        overdue: { icon: ExclamationTriangleIcon, color: 'text-red-500', label: 'Submit Late' },
        pending_sync: { icon: CloudArrowUpIcon, color: 'text-slate-500', label: 'Syncing...' }
    };

    const { icon: Icon, color, label } = statusInfo[quiz.status];
    const isScheduled = quiz.status === 'scheduled';
    const availableDate = quiz.availableFrom?.toDate();

    return (
        <div
            onClick={onClick}
            className={`group p-3 sm:p-4 bg-neumorphic-base rounded-xl shadow-neumorphic transition-all duration-200 
                       flex items-center space-x-3 sm:space-x-4 mb-2
                       ${quiz.status !== 'pending_sync' && hasAttemptsLeft ? 'cursor-pointer hover:shadow-neumorphic-inset' : 'cursor-not-allowed opacity-60'}`}
        >
            <Icon className={`h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
                {/* MODIFICATION START: Added wrapper for title and badges */}
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                    <h2 className="text-sm sm:text-base font-semibold text-slate-800 truncate">{quiz.title}</h2>
                    
                    {/* New Status Badge */}
                    {quiz.status === 'active' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">ACTIVE</span>}
                    {quiz.status === 'scheduled' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full">SCHEDULED</span>}
                    {quiz.status === 'completed' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-slate-800 bg-slate-200 rounded-full">✓ COMPLETED</span>}
                    {quiz.status === 'overdue' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-red-800 bg-red-100 rounded-full">OVERDUE</span>}
                    
                    {/* Existing Exam/Quiz Badge */}
                    {quiz.isExam ? (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold text-red-100 bg-red-600 rounded-full">EXAM</span>
                    ) : (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-blue-100 bg-blue-600 rounded-full">QUIZ</span>
                    )}
                </div>
                {/* MODIFICATION END */}
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {isScheduled && availableDate
                        ? `Available on ${availableDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${availableDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : quiz.attemptsTaken === 'N/A'
                            ? 'Available Offline'
                            : `Attempt ${Math.min(quiz.attemptsTaken + 1, maxAttempts)} of ${maxAttempts}`}
                </p>
            </div>
            <div className="flex items-center gap-2 text-slate-400 group-hover:text-red-600 transition-colors">
                <span className="text-xs sm:text-sm font-semibold hidden sm:block">{label}</span>
                {quiz.status !== 'pending_sync' && hasAttemptsLeft && <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
        </div>
    );
};

export default StudentQuizzesTab;