import React, { useState, useMemo, useCallback, memo } from 'react';
import Spinner from '../common/Spinner';
import {
    AcademicCapIcon,
    CheckCircleIcon,
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    CloudArrowUpIcon,
    ClockIcon,
    BookOpenIcon,
    PuzzlePieceIcon,
    FolderIcon,
    CalendarIcon,
    PlayIcon,          
    ArrowPathIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================================
// 🎨 ONEUI 8.5 ANIMATION CONSTANTS
// =====================================================================
const pageVariants = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { type: "spring", stiffness: 350, damping: 25, mass: 0.8 }
    },
    exit: { 
        opacity: 0, 
        scale: 0.96, 
        y: -10,
        transition: { duration: 0.2, ease: "easeOut" } 
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.04, delayChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

// =====================================================================
// 🧱 ONEUI CARD COMPONENTS
// =====================================================================

const OneUICard = memo(({ children, className = "", onClick }) => {
    const handleKeyDown = (e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <motion.div 
            variants={itemVariants}
            onClick={onClick}
            onKeyDown={onClick ? handleKeyDown : undefined}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            whileHover={onClick ? { scale: 1.01 } : {}}
            whileTap={onClick ? { scale: 0.96 } : {}}
            className={`
                relative overflow-hidden
                bg-white dark:bg-slate-900 
                border border-slate-100 dark:border-slate-800
                shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] dark:shadow-none
                transition-all duration-300
                rounded-[1.8rem] sm:rounded-[2.2rem]
                focus:outline-none focus:ring-4 focus:ring-blue-500/20
                ${className}
                ${onClick ? 'cursor-pointer touch-manipulation' : ''}
            `}
        >
            {children}
        </motion.div>
    );
});
OneUICard.displayName = 'OneUICard';

const EmptyState = memo(({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
            <Icon className="h-10 w-10" />
        </div>
        <p className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{text}</p>
        <p className="mt-2 text-sm font-medium text-slate-400 max-w-xs leading-relaxed">
            {subtext}
        </p>
    </motion.div>
));
EmptyState.displayName = 'EmptyState';

// =====================================================================
// 🏷️ ONEUI LIST ITEM (Compact for Mobile)
// =====================================================================

const STYLE_CONFIG = {
    active: { 
        icon: AcademicCapIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', accent: 'bg-blue-500', label: 'Start', ActionIcon: PlayIcon
    },
    scheduled: { 
        icon: ClockIcon, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', accent: 'bg-orange-500', label: 'Wait', ActionIcon: ClockIcon
    },
    completed: { 
        icon: CheckCircleIcon, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', accent: 'bg-emerald-500', label: 'Done', ActionIcon: CheckCircleIcon
    },
    overdue: { 
        icon: ExclamationTriangleIcon, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', accent: 'bg-rose-500', label: 'Late', ActionIcon: ExclamationTriangleIcon
    },
    pending_sync: { 
        icon: CloudArrowUpIcon, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', accent: 'bg-slate-400', label: 'Syncing', ActionIcon: CloudArrowUpIcon
    }
};

const QuizListItem = memo(({ quiz, onClick }) => {
    const maxAttempts = quiz.settings?.maxAttempts ?? 3;
    const hasAttemptsLeft = quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;
    
    const dateDisplay = useMemo(() => {
        if (quiz.status === 'scheduled' && quiz.availableFrom) {
             const date = quiz.availableFrom.toDate ? quiz.availableFrom.toDate() : new Date(quiz.availableFrom);
             return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        return null;
    }, [quiz.status, quiz.availableFrom]);

    let config = STYLE_CONFIG[quiz.status] || STYLE_CONFIG.active;
    if (quiz.status === 'completed' && hasAttemptsLeft) {
        config = { ...config, label: 'Retake', ActionIcon: ArrowPathIcon };
    }

    const { icon: Icon, color, bg, label, ActionIcon } = config;
    const isInteractive = quiz.status !== 'pending_sync' && hasAttemptsLeft;

    const handleKeyDown = (e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <motion.div
            variants={itemVariants}
            onClick={isInteractive ? onClick : undefined}
            onKeyDown={isInteractive ? handleKeyDown : undefined}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            whileTap={isInteractive ? { scale: 0.97 } : {}}
            className={`
                group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 mb-2 sm:mb-3
                bg-white dark:bg-slate-900
                border border-slate-100 dark:border-slate-800
                rounded-[1.5rem] sm:rounded-[1.75rem]
                ${isInteractive ? 'cursor-pointer hover:border-blue-200 dark:hover:border-blue-800/50' : 'opacity-60 grayscale'}
                transition-all duration-200
            `}
        >
            {/* Leading Icon Bubble - Responsive Size */}
            <div className={`
                flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-[1rem] sm:rounded-[1.25rem] 
                flex items-center justify-center 
                ${bg} ${color}
            `}>
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                        {quiz.title}
                    </h3>
                    {quiz.isExam && (
                        <span className="px-2 py-0.5 text-[9px] font-black text-white bg-red-500 rounded-full uppercase tracking-wider shadow-sm shadow-red-500/30">
                            Exam
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {dateDisplay ? (
                        <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5" /> {dateDisplay}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" /> 
                            {quiz.attemptsTaken !== 'N/A' ? `${Math.min(quiz.attemptsTaken + 1, maxAttempts)}/${maxAttempts} Attempts` : 'Ready'}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Area */}
            {isInteractive && (
                <div className="flex-shrink-0">
                    <div className={`
                        h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center
                        bg-slate-50 dark:bg-slate-800 text-slate-400 
                        group-hover:bg-blue-500 group-hover:text-white
                        transition-colors duration-300
                    `}>
                        <ActionIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                </div>
            )}
        </motion.div>
    );
});
QuizListItem.displayName = 'QuizListItem';

// =====================================================================
// 📘 CARD VARIANTS (Responsive)
// =====================================================================

const QuizSubjectBook = memo(({ title, onClick, quizCount }) => (
    <OneUICard onClick={onClick} className="group min-h-[9.5rem] sm:min-h-[12rem] flex flex-col p-5 sm:p-6">
        <div className="flex justify-between items-start mb-auto">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-[1rem] sm:rounded-[1.25rem] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <BookOpenIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                 <ChevronRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
        </div>
        
        <div className="mt-3 sm:mt-4">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-2">{title}</h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{quizCount} Quizzes</p>
        </div>
    </OneUICard>
));
QuizSubjectBook.displayName = 'QuizSubjectBook';

const QuizPostBook = memo(({ title, onClick, quizCount, createdAt, status }) => {
    const dateString = useMemo(() => {
        return createdAt ? (createdAt.toDate ? createdAt.toDate() : new Date(createdAt)).toLocaleDateString([], { month: 'short', day: 'numeric' }) : null;
    }, [createdAt]);

    const dotColor = useMemo(() => {
        if(status === 'completed') return 'bg-emerald-500';
        if(status === 'overdue') return 'bg-rose-500';
        return 'bg-blue-500';
    }, [status]);

    return (
        <OneUICard onClick={onClick} className="group min-h-[9.5rem] sm:min-h-[11rem] flex flex-col p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="h-12 w-12 rounded-[1rem] bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <FolderIcon className="h-6 w-6" />
                </div>
                {status && (
                    <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${dotColor} shadow-sm ring-2 ring-white dark:ring-slate-900`} />
                )}
            </div>
            
            <h3 className="text-lg sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 mb-1">{title}</h3>
            
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400">{dateString || 'No Date'}</span>
                <span className="text-[10px] sm:text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2 py-0.5 rounded-md">
                    {quizCount}
                </span>
            </div>
        </OneUICard>
    );
});
QuizPostBook.displayName = 'QuizPostBook';

const QuizUnitCard = memo(({ title, onClick, quizCount }) => (
    <OneUICard onClick={onClick} className="group min-h-[9rem] sm:min-h-[10rem] flex flex-col p-5">
        <div className="mb-auto">
            <div className="h-12 w-12 rounded-[1rem] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <PuzzlePieceIcon className="h-6 w-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{title}</h3>
        </div>
        <div className="text-xs font-bold text-slate-400 mt-2">
            {quizCount} {quizCount === 1 ? 'Task' : 'Tasks'}
        </div>
    </OneUICard>
));
QuizUnitCard.displayName = 'QuizUnitCard';

// =====================================================================
// 🧭 NAVIGATION VIEWS
// =====================================================================

const BackButton = ({ onClick, label }) => (
    <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={onClick} 
        className="
            group flex items-center gap-2 sm:gap-3 pl-1 pr-6 py-2 mb-4 sm:mb-6 
            text-slate-500 dark:text-slate-400 
            hover:text-slate-900 dark:hover:text-white
            transition-colors focus:outline-none
        "
    >
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
            <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <span className="text-base sm:text-lg font-bold tracking-tight">{label}</span>
    </motion.button>
);

const SubjectGridView = memo(({ subjectsData, onSubjectSelect, emptyStateProps }) => {
    const sortedSubjectKeys = useMemo(() => {
        return Object.keys(subjectsData).sort((a, b) => subjectsData[a].className.localeCompare(subjectsData[b].className));
    }, [subjectsData]);

    if (sortedSubjectKeys.length === 0) return <EmptyState {...emptyStateProps} />;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {sortedSubjectKeys.map(classId => {
                const subject = subjectsData[classId];
                const quizCount = Object.values(subject.posts).reduce((acc, post) => acc + Object.values(post.units).flat().length, 0);
                return <QuizSubjectBook key={classId} title={subject.className} quizCount={quizCount} onClick={() => onSubjectSelect(classId)} />;
            })}
        </motion.div>
    );
});

const PostGridView = memo(({ postsData, onPostSelect, onBack, subjectName, quizFilter }) => {
    const sortedPostTitles = useMemo(() => {
        return Object.keys(postsData).sort((a, b) => {
            const timeA = postsData[a].postCreatedAt?.toDate ? postsData[a].postCreatedAt.toDate().getTime() : 0;
            const timeB = postsData[b].postCreatedAt?.toDate ? postsData[b].postCreatedAt.toDate().getTime() : 0;
            return timeA - timeB;
        });
    }, [postsData]);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <BackButton onClick={onBack} label="Back" />
            <div className="mb-6 sm:mb-8 px-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">{subjectName}</h2>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {sortedPostTitles.map(postTitle => {
                    const post = postsData[postTitle];
                    const quizCount = Object.values(post.units).flat().length;
                    return <QuizPostBook key={postTitle} title={postTitle} quizCount={quizCount} createdAt={post.postCreatedAt} status={quizFilter} onClick={() => onPostSelect(postTitle)} />;
                })}
            </motion.div>
        </motion.div>
    );
});

const UnitGridView = memo(({ unitsData, onUnitSelect, onBack, postName }) => {
    const sortedUnitNames = useMemo(() => {
        return Object.keys(unitsData).sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
            return numA - numB;
        });
    }, [unitsData]);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <BackButton onClick={onBack} label="Back" />
            <div className="mb-6 sm:mb-8 px-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Collection</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">{postName}</h2>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {sortedUnitNames.map(unitName => {
                    const quizzesInUnit = unitsData[unitName];
                    return <QuizUnitCard key={unitName} title={unitName} quizCount={quizzesInUnit.length} onClick={() => onUnitSelect(unitName)} />;
                })}
            </motion.div>
        </motion.div>
    );
});

const QuizListView = memo(({ quizzes, onQuizClick, onBack, unitName }) => (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <BackButton onClick={onBack} label="Back" />
        <div className="mb-6 sm:mb-8 px-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Unit</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">{unitName}</h2>
        </div>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-1">
            {quizzes.map(quiz => (
                <QuizListItem key={quiz.id} quiz={quiz} onClick={() => onQuizClick(quiz)} />
            ))}
        </motion.div>
    </motion.div>
));

// =====================================================================
// 🚀 MAIN COMPONENT
// =====================================================================

const StudentQuizzesTab = ({ 
    quizzes = [], 
    units = [], 
    handleTakeQuizClick, 
    isFetchingContent,
    onRefresh 
}) => {
    const [quizFilter, setQuizFilter] = useState('active');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [isManualSyncing, setIsManualSyncing] = useState(false);

    // --- HANDLERS ---
    
    const handleRefresh = useCallback(async () => {
        if (!onRefresh) return;
        setIsManualSyncing(true);
        // Minimum visual delay for "feel"
        await Promise.all([
            onRefresh(),
            new Promise(resolve => setTimeout(resolve, 800))
        ]);
        setIsManualSyncing(false);
    }, [onRefresh]);

    const onQuizClick = useCallback((quiz) => {
        const maxAttempts = quiz.settings?.maxAttempts ?? 3;
        const hasAttemptsLeft = quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;
        if (quiz.status === 'pending_sync' || !hasAttemptsLeft) return;
        handleTakeQuizClick(quiz);
    }, [handleTakeQuizClick]);

    const handleFilterChange = useCallback((filterName) => {
        setQuizFilter(filterName);
        setSelectedSubject(null);
        setSelectedPost(null);
        setSelectedUnit(null);
    }, []);

    // --- DATA TRANSFORMATION ---
    
    const allQuizzes = useMemo(() => {
        if (Array.isArray(quizzes)) return quizzes;
        if (typeof quizzes === 'object' && quizzes !== null) {
            return [...(quizzes.active||[]), ...(quizzes.completed||[]), ...(quizzes.overdue||[])];
        }
        return [];
    }, [quizzes]);

    const groupedData = useMemo(() => {
        const rawGrouping = {}; 
        (allQuizzes || []).forEach(quiz => {
            const classId = quiz.classId || 'general-class';
            const className = quiz.className || 'General';
            const postTitle = quiz.postTitle || 'General Posts';
            const postCreatedAt = quiz.postCreatedAt || null;
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';

            if (!rawGrouping[classId]) rawGrouping[classId] = { className: className, posts: {} };
            if (!rawGrouping[classId].posts[postTitle]) rawGrouping[classId].posts[postTitle] = { postCreatedAt: postCreatedAt, units: {} };
            if (!rawGrouping[classId].posts[postTitle].units[unitName]) rawGrouping[classId].posts[postTitle].units[unitName] = [];
            rawGrouping[classId].posts[postTitle].units[unitName].push(quiz);
        });

        const categorizedData = { active: {}, completed: {}, overdue: {} };
        Object.keys(rawGrouping).forEach(classId => {
            const subject = rawGrouping[classId];
            Object.keys(subject.posts).forEach(postTitle => {
                const post = subject.posts[postTitle];
                const allQuizzesInPost = Object.values(post.units).flat();
                
                const isCompleted = allQuizzesInPost.length > 0 && allQuizzesInPost.every(q => q.attemptsTaken > 0 || q.attemptsTaken === 'N/A');
                const isOverdue = !isCompleted && allQuizzesInPost.some(q => q.status === 'overdue');
                
                let category = 'active';
                if (isCompleted) category = 'completed';
                else if (isOverdue) category = 'overdue';

                if (!categorizedData[category][classId]) categorizedData[category][classId] = { className: subject.className, posts: {} };
                categorizedData[category][classId].posts[postTitle] = post;
            });
        });
        return categorizedData;
    }, [allQuizzes, units]);

    const emptyStateProps = {
        active: { icon: ClipboardDocumentCheckIcon, text: 'All Caught Up', subtext: 'No pending quizzes.' },
        completed: { icon: CheckCircleIcon, text: 'No History', subtext: 'Completed quizzes will appear here.' },
        overdue: { icon: ExclamationTriangleIcon, text: 'No Overdue Items', subtext: 'You are on track!' }
    }[quizFilter];

    const dataForFilter = groupedData[quizFilter] || {};
    const currentSubjectData = dataForFilter[selectedSubject] || null;
    const currentPostData = currentSubjectData?.posts[selectedPost] || null;
    const currentUnitsObject = currentPostData?.units || {};
    const currentUnitData = currentUnitsObject[selectedUnit] || [];

    const isLoading = isFetchingContent || isManualSyncing;

    return (
        <div className="min-h-screen font-sans pb-36">
            
            {/* 1. HEADER */}
            <div className="pt-6 pb-2 px-6 flex items-end justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Quizzes</h1>
                    <p className="text-xs sm:text-sm font-bold text-slate-400 mt-0.5">Assignments</p>
                </div>
                
                {/* 2. SYNC BUTTON */}
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className={`
                        h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center
                        bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                        hover:bg-blue-500 hover:text-white active:scale-90
                        transition-all duration-300
                    `}
                    aria-label="Sync Quizzes"
                >
                    <ArrowPathIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* 3. CLEAN TABS (No Black Container) */}
            <div className="sticky top-0 z-40 py-2 px-6 bg-slate-50/90 dark:bg-slate-900/70 rounded-full backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
                
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                    {['active', 'completed', 'overdue'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => handleFilterChange(filter)}
                            className={`
                                relative px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-extrabold capitalize tracking-wide transition-all duration-300
                                ${quizFilter === filter 
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-100' 
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 scale-95'}
                            `}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. MAIN CONTENT */}
            <div className="px-3 sm:px-4 mt-4 sm:mt-6 min-h-[500px]">
                <AnimatePresence mode="wait">
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex justify-center pt-32 pointer-events-none"
                        >
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl shadow-2xl">
                                <Spinner />
                            </div>
                        </motion.div>
                    )}

                    {!selectedSubject && (
                        <SubjectGridView
                            key="subjects"
                            subjectsData={dataForFilter}
                            onSubjectSelect={setSelectedSubject}
                            emptyStateProps={emptyStateProps}
                        />
                    )}

                    {selectedSubject && !selectedPost && (
                        <PostGridView
                            key="posts"
                            postsData={currentSubjectData?.posts || {}}
                            subjectName={currentSubjectData?.className || ''}
                            onPostSelect={setSelectedPost}
                            onBack={() => setSelectedSubject(null)}
                            quizFilter={quizFilter}
                        />
                    )}

                    {selectedSubject && selectedPost && !selectedUnit && (
                        <UnitGridView
                            key="units"
                            unitsData={currentUnitsObject}
                            postName={selectedPost}
                            onUnitSelect={setSelectedUnit}
                            onBack={() => setSelectedPost(null)}
                        />
                    )}

                    {selectedSubject && selectedPost && selectedUnit && (
                        <QuizListView
                            key="quizzes"
                            quizzes={currentUnitData}
                            unitName={selectedUnit}
                            onQuizClick={onQuizClick}
                            onBack={() => setSelectedUnit(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudentQuizzesTab;