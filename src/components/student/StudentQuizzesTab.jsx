// src/components/student/StudentQuizzesTab.js

import React, { useState } from 'react';
import Spinner from '../common/Spinner';
import {
    AcademicCapIcon,
    CheckCircleIcon,
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CloudArrowUpIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

const StudentQuizzesTab = ({ quizzes, units, handleTakeQuizClick, isFetchingContent, userProfile }) => {
    const [quizFilter, setQuizFilter] = useState('active');
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());
    
    const onQuizClick = (quiz) => {
        if (quiz.status === 'pending_sync' || quizFilter === 'completed') {
            return;
        }
        handleTakeQuizClick(quiz);
    };

    const SegmentButton = ({ label, filterName }) => (
        <button
            onClick={() => setQuizFilter(filterName)}
            className={`flex-1 capitalize py-2 px-3 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none ${quizFilter === filterName ? 'bg-white text-red-600 shadow-sm' : 'bg-transparent text-slate-600'}`}
        >
            {label}
        </button>
    );

    const EmptyState = ({ icon: Icon, text, subtext }) => (
        <div className="text-center py-20 px-4">
            <Icon className="h-16 w-16 mb-4 text-gray-300 mx-auto" />
            <p className="text-lg font-semibold text-gray-700">{text}</p>
            <p className="mt-1 text-sm text-gray-500">{subtext}</p>
        </div>
    );

    const GroupedQuizList = ({ quizzesToDisplay, onQuizClick, emptyStateProps }) => {
        // Show empty state only if not loading and the list is empty
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
                        <h2 className="text-xl font-bold text-gray-800 mb-2 px-2">{className}</h2>
                        <div className="space-y-2">
                            {Object.keys(quizzesByClassAndUnit[className]).sort((a, b) => {
                                const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
                                const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
                                return numA - numB;
                            }).map(unitName => {
                                const groupKey = `${className}-${unitName}`;
                                const isCollapsed = collapsedGroups.has(groupKey);
                                return (
                                    <div key={groupKey} className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
                                        <button
                                            className="w-full flex justify-between items-center p-2.5 hover:bg-gray-50 transition-colors"
                                            onClick={() => {
                                                setCollapsedGroups(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(groupKey)) newSet.delete(groupKey);
                                                    else newSet.add(groupKey);
                                                    return newSet;
                                                });
                                            }}
                                        >
                                            <h3 className="text-sm font-medium text-gray-600 text-left">{unitName}</h3>
                                            {isCollapsed ? <ChevronDownIcon className="h-5 w-5 text-gray-400" /> : <ChevronUpIcon className="h-5 w-5 text-gray-400" />}
                                        </button>
                                        <AnimatePresence>
                                            {!isCollapsed && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                                    <div>
                                                        {quizzesByClassAndUnit[className][unitName].map(quiz => (
                                                            <QuizListItem key={quiz.id} quiz={quiz} onClick={() => onQuizClick(quiz)} />
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
        active: { icon: ClipboardDocumentCheckIcon, text: "No Active Quizzes", subtext: "New quizzes from your teacher will appear here." },
        completed: { icon: CheckCircleIcon, text: "No Completed Quizzes", subtext: "Once you complete a quiz, it will appear here." },
        overdue: { icon: ExclamationTriangleIcon, text: "No Overdue Quizzes", subtext: "You have no quizzes past their deadline." }
    }[quizFilter];

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="p-4 space-y-6">
                <div className="px-2">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Quizzes</h1>
                    <p className="text-base text-gray-500">View your active, completed, and overdue quizzes.</p>
                </div>

                <div className="bg-gray-200/70 rounded-xl p-1">
                    <nav className="flex space-x-1">
                        <SegmentButton label="Active" filterName="active" />
                        <SegmentButton label="Completed" filterName="completed" />
                        <SegmentButton label="Overdue" filterName="overdue" />
                    </nav>
                </div>

                {/* --- UI GLITCH FIX --- */}
                {/* The 'relative' class is added to this container. */}
                <div className="min-h-[400px] relative">
                    {/* The loading indicator is now an overlay, preventing the list from disappearing during re-fetch. */}
                    <AnimatePresence>
                        {isFetchingContent && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-gray-50/70 backdrop-blur-sm flex justify-center items-center z-10 rounded-xl"
                            >
                                <Spinner />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* The list is always rendered, showing stale data until the new data is available. */}
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
    const statusInfo = {
        active: { icon: AcademicCapIcon, color: "text-blue-500", label: "Take Quiz" },
        completed: { icon: CheckCircleIcon, color: "text-green-500", label: "Review" },
        overdue: { icon: ExclamationTriangleIcon, color: "text-red-500", label: "Submit Late" },
        pending_sync: { icon: CloudArrowUpIcon, color: "text-slate-500", label: "Syncing..." }
    };
    const { icon: Icon, color, label } = statusInfo[quiz.status || 'active'];

    return (
        <div onClick={onClick} className="group p-4 bg-white hover:bg-gray-50 transition-colors duration-200 cursor-pointer flex items-center space-x-4 border-b border-gray-200/80 last:border-b-0">
            <Icon className={`h-8 w-8 flex-shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-800 truncate">{quiz.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    {quiz.attemptsTaken === 'N/A' 
                        ? 'Available Offline' 
                        : (quiz.attemptsTaken > 0 ? `Attempt ${quiz.attemptsTaken + 1} of 3` : `3 Attempts`)}
                </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400 group-hover:text-red-600 transition-colors">
                <span className="text-sm font-semibold hidden sm:block">{label}</span>
                <ChevronRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

export default StudentQuizzesTab;