import React, { useState, useEffect, useMemo } from 'react';
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
// ANIMATION CONSTANTS (Spring Physics)
// =====================================================================
const pageVariants = {
    initial: { opacity: 0, scale: 0.98, filter: 'blur(5px)' },
    animate: { 
        opacity: 1, 
        scale: 1, 
        filter: 'blur(0px)',
        transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: { 
        opacity: 0, 
        scale: 0.98, 
        filter: 'blur(5px)',
        transition: { duration: 0.2 } 
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" } }
};

// =====================================================================
// SHARED COMPONENTS (Glass & Spatial)
// =====================================================================

const GlassCard = ({ children, className = "", onClick }) => (
  <motion.div 
    variants={itemVariants}
    onClick={onClick}
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
    className={`
      relative overflow-hidden
      bg-white/70 dark:bg-slate-900/60 
      backdrop-blur-xl 
      border border-white/60 dark:border-slate-700/50
      shadow-sm hover:shadow-2xl dark:shadow-black/40 hover:shadow-blue-500/5
      transition-all duration-300 ease-out
      rounded-[1.5rem]
      ${className}
    `}
  >
    {children}
  </motion.div>
);

const EmptyState = ({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 px-6 opacity-80"
    >
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl mb-6 shadow-inner ring-1 ring-black/5">
            <Icon className="h-12 w-12 text-slate-400" />
        </div>
        <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{text}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs text-center leading-relaxed">
            {subtext}
        </p>
    </motion.div>
);

// =====================================================================
// ITEM COMPONENTS (The New "Gem" Look)
// =====================================================================

const QuizListItem = ({ quiz, onClick }) => {
    const maxAttempts = quiz.settings?.maxAttempts ?? 3;
    const hasAttemptsLeft = quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;
    const availableDate = quiz.availableFrom?.toDate();

    // Enhanced Visual Config
    const styleConfig = {
        active: { 
            icon: AcademicCapIcon, 
            gradient: 'from-blue-500 to-indigo-600', 
            shadow: 'shadow-blue-500/30',
            bg: 'bg-blue-50/50 dark:bg-blue-900/10',
            border: 'border-blue-100 dark:border-blue-800/30',
            actionLabel: 'Start',
            ActionIcon: PlayIcon
        },
        scheduled: { 
            icon: ClockIcon, 
            gradient: 'from-amber-400 to-orange-500', 
            shadow: 'shadow-amber-500/30',
            bg: 'bg-amber-50/50 dark:bg-amber-900/10',
            border: 'border-amber-100 dark:border-amber-800/30',
            actionLabel: 'Wait',
            ActionIcon: ClockIcon
        },
        completed: { 
            icon: CheckCircleIcon, 
            gradient: 'from-emerald-400 to-teal-500', 
            shadow: 'shadow-emerald-500/30',
            bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
            border: 'border-emerald-100 dark:border-emerald-800/30',
            actionLabel: hasAttemptsLeft ? 'Retake' : 'Review',
            ActionIcon: hasAttemptsLeft ? ArrowPathIcon : CheckCircleIcon
        },
        overdue: { 
            icon: ExclamationTriangleIcon, 
            gradient: 'from-rose-500 to-red-600', 
            shadow: 'shadow-rose-500/30',
            bg: 'bg-rose-50/50 dark:bg-rose-900/10',
            border: 'border-rose-100 dark:border-rose-800/30',
            actionLabel: 'Late',
            ActionIcon: ExclamationTriangleIcon
        },
        pending_sync: { 
            icon: CloudArrowUpIcon, 
            gradient: 'from-slate-400 to-slate-500', 
            shadow: 'shadow-slate-500/30',
            bg: 'bg-slate-50/50 dark:bg-slate-800/50',
            border: 'border-slate-200 dark:border-slate-700',
            actionLabel: 'Syncing',
            ActionIcon: CloudArrowUpIcon
        }
    };

    const { icon: Icon, gradient, shadow, bg, border, actionLabel, ActionIcon } = styleConfig[quiz.status] || styleConfig.active;
    const isInteractive = quiz.status !== 'pending_sync' && hasAttemptsLeft;

    return (
        <motion.div
            variants={itemVariants}
            onClick={isInteractive ? onClick : undefined}
            whileTap={isInteractive ? { scale: 0.98 } : {}}
            className={`
                group relative flex items-center gap-4 p-4 mb-3
                bg-white/80 dark:bg-slate-800/60 backdrop-blur-md
                border ${border}
                rounded-2xl shadow-sm 
                ${isInteractive ? 'cursor-pointer hover:bg-white dark:hover:bg-slate-700/80 hover:shadow-md' : 'opacity-70 cursor-not-allowed'}
                transition-all duration-300
            `}
        >
            {/* Gem Icon Box */}
            <div className={`
                flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center 
                bg-gradient-to-br ${gradient} ${shadow} text-white shadow-lg
                group-hover:scale-105 transition-transform duration-300
            `}>
                <Icon className="h-7 w-7" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[1.05rem] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                        {quiz.title}
                    </h3>
                    {quiz.isExam && (
                        <span className="px-2 py-0.5 text-[9px] font-extrabold text-red-600 bg-red-100 dark:bg-red-900/40 rounded-full uppercase tracking-wide border border-red-200">
                            Exam
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                     <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                        {quiz.status === 'scheduled' && availableDate ? (
                            <>
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {availableDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </>
                        ) : (
                            <>
                                <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
                                {quiz.attemptsTaken !== 'N/A' ? `Attempt ${Math.min(quiz.attemptsTaken + 1, maxAttempts)}/${maxAttempts}` : 'Offline'}
                            </>
                        )}
                     </span>
                </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
                {isInteractive ? (
                    <button className={`
                        hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wide
                        bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300
                        group-hover:bg-gradient-to-r group-hover:${gradient} group-hover:text-white group-hover:shadow-md
                        transition-all duration-300
                    `}>
                        <span>{actionLabel}</span>
                        <ActionIcon className="h-4 w-4" />
                    </button>
                ) : (
                    <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold uppercase">
                        {actionLabel}
                    </div>
                )}
                 {/* Mobile Chevron fallback */}
                 <div className="sm:hidden text-slate-300 group-hover:text-slate-500">
                    <ChevronRightIcon className="h-5 w-5" />
                 </div>
            </div>
        </motion.div>
    );
};

// =====================================================================
// CARD COMPONENTS (Enhanced Visuals)
// =====================================================================

const QuizSubjectBook = ({ title, onClick, quizCount }) => (
    <GlassCard onClick={onClick} className="cursor-pointer group min-h-[11rem] flex flex-col">
        {/* Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors duration-500" />
        
        <div className="relative z-10 p-5 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <BookOpenIcon className="h-6 w-6" />
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 mb-2">
                {title}
            </h3>

            <div className="mt-auto flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}
                </span>
                <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 group-hover:translate-x-1 transition-transform">
                     <ChevronRightIcon className="h-3 w-3" />
                </div>
            </div>
        </div>
    </GlassCard>
);

const QuizPostBook = ({ title, onClick, quizCount, createdAt, status }) => {
    const dateString = createdAt ? (createdAt.toDate ? createdAt.toDate() : new Date(createdAt)).toLocaleDateString([], { month: 'short', day: 'numeric' }) : null;
    const badgeColors = {
        active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    };

    return (
        <GlassCard onClick={onClick} className="cursor-pointer group min-h-[11rem] flex flex-col">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/20 rounded-full blur-3xl group-hover:bg-sky-500/30 transition-colors duration-500" />

            <div className="relative z-10 p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-600 shadow-lg shadow-sky-500/30 flex items-center justify-center text-white group-hover:rotate-3 transition-transform duration-300">
                        <FolderIcon className="h-6 w-6" />
                    </div>
                    {status && (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${badgeColors[status] || 'bg-slate-100 text-slate-600'}`}>
                            {status}
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 mb-1">
                    {title}
                </h3>

                {dateString && (
                    <p className="text-[11px] font-semibold text-slate-400 mb-4">
                        Posted {dateString}
                    </p>
                )}

                <div className="mt-auto flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                    {quizCount} Items
                </div>
            </div>
        </GlassCard>
    );
};

const QuizUnitCard = ({ title, onClick, quizCount }) => (
    <GlassCard onClick={onClick} className="cursor-pointer group min-h-[10rem] flex flex-col">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors duration-500" />

        <div className="relative z-10 p-5 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <PuzzlePieceIcon className="h-6 w-6" />
                </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
                {title}
            </h3>

            <div className="mt-auto pt-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {quizCount} {quizCount === 1 ? 'Task' : 'Tasks'}
            </div>
        </div>
    </GlassCard>
);

// =====================================================================
// VIEWS (With Animation Wrappers)
// =====================================================================

const BackButton = ({ onClick, label }) => (
    <motion.button 
        whileHover={{ scale: 1.02, x: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick} 
        className="group flex items-center gap-2 pl-2 pr-5 py-2.5 mb-6 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-white/40 shadow-sm transition-all"
    >
        <div className="bg-slate-100 dark:bg-slate-600 rounded-full p-1.5 shadow-inner group-hover:text-blue-600 transition-colors">
            <ChevronLeftIcon className="h-4 w-4" />
        </div>
        <span>{label}</span>
    </motion.button>
);

const SubjectGridView = ({ subjectsData, onSubjectSelect, emptyStateProps }) => {
    const sortedSubjectKeys = useMemo(() => {
        return Object.keys(subjectsData).sort((a, b) => {
            return subjectsData[a].className.localeCompare(subjectsData[b].className);
        });
    }, [subjectsData]);

    if (sortedSubjectKeys.length === 0) return <EmptyState {...emptyStateProps} />;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sortedSubjectKeys.map(classId => {
                const subject = subjectsData[classId];
                const quizCount = Object.values(subject.posts).reduce((acc, post) => 
                    acc + Object.values(post.units).flat().length, 0);
                return <QuizSubjectBook key={classId} title={subject.className} quizCount={quizCount} onClick={() => onSubjectSelect(classId)} />;
            })}
        </motion.div>
    );
};

const PostGridView = ({ postsData, onPostSelect, onBack, subjectName, quizFilter }) => {
    const sortedPostTitles = useMemo(() => {
        return Object.keys(postsData).sort((a, b) => {
            const timeA = postsData[a].postCreatedAt?.toDate ? postsData[a].postCreatedAt.toDate().getTime() : 0;
            const timeB = postsData[b].postCreatedAt?.toDate ? postsData[b].postCreatedAt.toDate().getTime() : 0;
            return timeA - timeB;
        });
    }, [postsData]);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <BackButton onClick={onBack} label="All Subjects" />
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="mb-6 px-1">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">{subjectName}</h2>
                <p className="text-base text-slate-500 dark:text-slate-400">Select a collection</p>
            </motion.div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sortedPostTitles.map(postTitle => {
                    const post = postsData[postTitle];
                    const quizCount = Object.values(post.units).flat().length;
                    return <QuizPostBook key={postTitle} title={postTitle} quizCount={quizCount} createdAt={post.postCreatedAt} status={quizFilter} onClick={() => onPostSelect(postTitle)} />;
                })}
            </motion.div>
        </motion.div>
    );
};

const UnitGridView = ({ unitsData, onUnitSelect, onBack, postName }) => {
    const sortedUnitNames = useMemo(() => {
        return Object.keys(unitsData).sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
            return numA - numB;
        });
    }, [unitsData]);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <BackButton onClick={onBack} label="Back to Posts" />
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="mb-6 px-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">{postName}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Select a unit</p>
            </motion.div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sortedUnitNames.map(unitName => {
                    const quizzesInUnit = unitsData[unitName];
                    return <QuizUnitCard key={unitName} title={unitName} quizCount={quizzesInUnit.length} onClick={() => onUnitSelect(unitName)} />;
                })}
            </motion.div>
        </motion.div>
    );
};

const QuizListView = ({ quizzes, onQuizClick, onBack, unitName }) => {
    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <BackButton onClick={onBack} label="Back to Units" />
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="mb-6 px-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{unitName}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Available Tasks</p>
            </motion.div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
                {quizzes.map(quiz => (
                    <QuizListItem key={quiz.id} quiz={quiz} onClick={() => onQuizClick(quiz)} />
                ))}
            </motion.div>
        </motion.div>
    );
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================

const StudentQuizzesTab = ({ 
    quizzes = [], 
    units = [], 
    handleTakeQuizClick, 
    isFetchingContent 
}) => {
    
    const [quizFilter, setQuizFilter] = useState('active');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);

    // Restored Logic: Handle array vs object input for quizzes
    const allQuizzes = useMemo(() => {
        if (Array.isArray(quizzes)) return quizzes;
        if (typeof quizzes === 'object' && quizzes !== null) {
            return [...(quizzes.active||[]), ...(quizzes.completed||[]), ...(quizzes.overdue||[])];
        }
        return [];
    }, [quizzes]);

    // Restored Logic: Click Handler checks attempts
    const onQuizClick = (quiz) => {
        const maxAttempts = quiz.settings?.maxAttempts ?? 3;
        const hasAttemptsLeft = quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;
        if (quiz.status === 'pending_sync' || !hasAttemptsLeft) return;
        handleTakeQuizClick(quiz);
    };

    // Restored Logic: Filter reset
    const handleFilterChange = (filterName) => {
        setQuizFilter(filterName);
        setSelectedSubject(null);
        setSelectedPost(null);
        setSelectedUnit(null);
    };

    // Restored Logic: Full Grouping Logic
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
        active: { icon: ClipboardDocumentCheckIcon, text: 'All Caught Up', subtext: 'New quizzes will appear here.' },
        completed: { icon: CheckCircleIcon, text: 'No History Yet', subtext: 'Finished quizzes move here.' },
        overdue: { icon: ExclamationTriangleIcon, text: 'No Overdue Items', subtext: 'Great job staying on track!' }
    }[quizFilter];

    const dataForFilter = groupedData[quizFilter] || {};
    const currentSubjectData = dataForFilter[selectedSubject] || null;
    const currentPostData = currentSubjectData?.posts[selectedPost] || null;
    const currentUnitData = currentPostData?.units[selectedUnit] || [];
    const currentUnitsObject = currentPostData?.units || {};

    return (
        <div className="min-h-screen font-sans pb-32 px-2 sm:px-4">
            
            {/* --- TITLE HEADER (SCROLLS AWAY) --- */}
            <div className="mt-4 mb-4">
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Quizzes</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mt-1">
                    Assignments & Exams
                </p>
            </div>

            {/* --- STICKY TAB BAR (FIXED ON TOP) --- */}
            {/* Added sticky, top-0, z-50, and backdrop-blur styling here */}
            <div className="sticky top-0 z-50 py-3 -mx-2 px-2 sm:-mx-4 sm:px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg transition-all duration-300 border-b border-transparent">
                <div className="bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur-xl p-1.5 rounded-2xl inline-flex w-full sm:w-auto shadow-inner ring-1 ring-black/5">
                    {['active', 'completed', 'overdue'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => handleFilterChange(filter)}
                            className={`
                                flex-1 sm:flex-none sm:px-8 py-3 rounded-xl text-sm font-bold capitalize transition-all duration-300
                                ${quizFilter === filter 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md scale-[1.02]' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                            `}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="relative min-h-[400px] mt-4">
                <AnimatePresence>
                    {isFetchingContent && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md flex justify-center items-start pt-32 z-50 rounded-3xl"
                        >
                            <Spinner />
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <AnimatePresence mode="wait">
                    
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