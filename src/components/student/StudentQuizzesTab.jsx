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
    ChevronDownIcon,
    ChevronUpIcon,
    BookOpenIcon, // For Subject
    PuzzlePieceIcon // For Unit
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================================
// Common Components (Unchanged)
// =====================================================================

// EmptyState Component
const EmptyState = ({ icon: Icon, text, subtext }) => (
    <div className="text-center py-20 px-4">
        <Icon className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{text}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
);

// QuizListItem Component (Unchanged)
const QuizListItem = ({ quiz, onClick }) => {
    // ... (component code is unchanged)
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
            className={`group p-3 sm:p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-lg transition-all duration-200 
                       flex items-center space-x-3 sm:space-x-4 mb-2 last:mb-0
                       ${quiz.status !== 'pending_sync' && hasAttemptsLeft ? 'cursor-pointer hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark' : 'cursor-not-allowed opacity-60'}`}
        >
            <Icon className={`h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                    <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{quiz.title}</h2>
                    
                    {quiz.status === 'active' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">ACTIVE</span>}
                    {quiz.status === 'scheduled' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full">SCHEDULED</span>}
                    {quiz.status === 'completed' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-full">✓ COMPLETED</span>}
                    {quiz.status === 'overdue' && <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-full">OVERDUE</span>}
                    
                    {quiz.isExam ? (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold text-red-100 bg-red-600 rounded-full">EXAM</span>
                    ) : (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-blue-100 bg-blue-600 rounded-full">QUIZ</span>
                    )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {isScheduled && availableDate
                        ? `Available on ${availableDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${availableDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : quiz.attemptsTaken === 'N/A'
                            ? 'Available Offline'
                            : `Attempt ${Math.min(quiz.attemptsTaken + 1, maxAttempts)} of ${maxAttempts}`}
                </p>
            </div>
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                <span className="text-xs sm:text-sm font-semibold hidden sm:block">{label}</span>
                {quiz.status !== 'pending_sync' && hasAttemptsLeft && <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
        </div>
    );
};


// =====================================================================
// "Book" & "Card" Components for Navigation
// =====================================================================

/**
 * QuizSubjectBook (Level 1 - Unchanged)
 */
const QuizSubjectBook = ({ title, onClick, quizCount, isNew }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`relative p-4 cursor-pointer group transition-all duration-300
                 bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50
                 shadow-neumorphic dark:shadow-neumorphic-dark
                 hover:shadow-neumorphic-lg dark:hover:shadow-lg hover:-translate-y-1
                 hover:shadow-indigo-500/30 dark:hover:shadow-indigo-400/20
                 active:scale-[0.98]
                 rounded-lg flex flex-col items-center justify-center min-h-[9rem] w-full
                 border-l-4 border-indigo-500 dark:border-indigo-400 overflow-hidden`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {isNew && (
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-md">
          NEW
        </span>
      )}
      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
        <BookOpenIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1"></div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neumorphic-base dark:bg-slate-700 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-700 dark:text-red-300">
        {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}
      </span>
      <p className="mt-1.5 text-xs sm:text-sm font-semibold text-center text-slate-700 dark:text-slate-200 line-clamp-2">
        {title}
      </p>
      <div className="flex-1"></div>
    </div>
  );
};


/**
 * MODIFIED: QuizPostBook (Level 2)
 * Badge colors swapped
 */
const QuizPostBook = ({ title, onClick, quizCount, isNew, createdAt, status }) => {
  
  // --- NEW: Format the date ---
  let dateString = null;
  if (createdAt) {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`relative p-4 cursor-pointer group transition-all duration-300
                 bg-gradient-to-br from-sky-50 to-cyan-100 dark:from-sky-900/50 dark:to-cyan-900/50
                 shadow-neumorphic dark:shadow-neumorphic-dark
                 hover:shadow-neumorphic-lg dark:hover:shadow-lg hover:-translate-y-1
                 hover:shadow-sky-500/30 dark:hover:shadow-sky-400/20
                 active:scale-[0.98]
                 rounded-lg flex flex-col items-center justify-center min-h-[9rem] w-full
                 border-l-4 border-sky-500 dark:border-sky-400 overflow-hidden`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {/* --- MODIFIED: Status Badge with swapped colors --- */}
      {status && (
          <span className={`absolute top-2 right-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md
              ${status === 'active' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}
              ${status === 'completed' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}
              ${status === 'overdue' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}
          `}>
              {status.toUpperCase()}
          </span>
      )}
      {/* --- END MODIFICATION --- */}

      {isNew && (
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-md">
          NEW
        </span>
      )}

      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
        <AcademicCapIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
      </div>

      <div className="flex-1"></div>

      {/* Quiz Count */}
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neumorphic-base dark:bg-slate-700 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-700 dark:text-red-300">
        {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}
      </span>
      
      {/* Subtle Date */}
      {dateString && (
          <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {dateString}
          </p>
      )}

      {/* Title */}
      <p className={`text-xs sm:text-sm font-semibold text-center text-slate-700 dark:text-slate-200 line-clamp-2 ${dateString ? 'mt-1' : 'mt-1.5'}`}>
        {title}
      </p>

      <div className="flex-1"></div>
    </div>
  );
};

/**
 * QuizUnitCard (Level 3 - Unchanged)
 */
const QuizUnitCard = ({ title, onClick, quizCount, isNew }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`relative p-4 cursor-pointer group transition-all duration-300
                 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50
                 shadow-neumorphic dark:shadow-neumorphic-dark
                 hover:shadow-neumorphic-lg dark:hover:shadow-lg hover:-translate-y-1
                 hover:shadow-emerald-500/30 dark:hover:shadow-emerald-400/20
                 active:scale-[0.98]
                 rounded-lg flex flex-col items-center justify-center min-h-[9rem] w-full
                 border-l-4 border-emerald-500 dark:border-emerald-400 overflow-hidden`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {isNew && (
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-md">
          NEW
        </span>
      )}
      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
        <PuzzlePieceIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1"></div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neumorphic-base dark:bg-slate-700 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-700 dark:text-red-300">
        {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}
      </span>
      <p className="mt-1.5 text-xs sm:text-sm font-semibold text-center text-slate-700 dark:text-slate-200 line-clamp-2">
        {title}
      </p>
      <div className="flex-1"></div>
    </div>
  );
};


// =====================================================================
// View Components (All Unchanged from last version)
// =====================================================================

/**
 * View 1: SubjectGridView (Unchanged)
 */
const SubjectGridView = ({ subjectsData, onSubjectSelect, emptyStateProps }) => {
    // ... (component code is unchanged)
    const sortedSubjectKeys = useMemo(() => {
        return Object.keys(subjectsData).sort((a, b) => {
            return subjectsData[a].className.localeCompare(subjectsData[b].className);
        });
    }, [subjectsData]);

    if (sortedSubjectKeys.length === 0) {
        return <EmptyState {...emptyStateProps} />;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        >
            {sortedSubjectKeys.map(classId => {
                const subject = subjectsData[classId];
                const quizCount = Object.values(subject.posts).reduce((acc, post) => 
                    acc + Object.values(post.units).flat().length, 0);

                return (
                    <QuizSubjectBook 
                        key={classId}
                        title={subject.className}
                        quizCount={quizCount}
                        isNew={false}
                        onClick={() => onSubjectSelect(classId)}
                    />
                );
            })}
        </motion.div>
    );
};

/**
 * View 2: PostGridView (Unchanged)
 * Passes `quizFilter`
 */
const PostGridView = ({ postsData, onPostSelect, onBack, subjectName, quizFilter }) => {
    // ... (component code is unchanged)
    const sortedPostTitles = useMemo(() => {
        return Object.keys(postsData).sort((a, b) => {
            const timeA = postsData[a].postCreatedAt?.toDate ? postsData[a].postCreatedAt.toDate().getTime() : 0;
            const timeB = postsData[b].postCreatedAt?.toDate ? postsData[b].postCreatedAt.toDate().getTime() : 0;
            return timeA - timeB; // Sort ascending
        });
    }, [postsData]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 px-4 py-2 mb-4 text-sm sm:text-base font-semibold text-red-600 dark:text-red-400
                       bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
            >
                <ChevronLeftIcon className="h-5 w-5" />
                All Subjects
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 px-1">{subjectName}</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {sortedPostTitles.map(postTitle => {
                    const post = postsData[postTitle];
                    const quizCount = Object.values(post.units).flat().length;
                    
                    return (
                        <QuizPostBook 
                            key={postTitle}
                            title={postTitle}
                            quizCount={quizCount}
                            isNew={false}
                            createdAt={post.postCreatedAt}
                            status={quizFilter}
                            onClick={() => onPostSelect(postTitle)}
                        />
                    );
                })}
            </div>
        </motion.div>
    );
};

/**
 * View 3: UnitGridView (Unchanged)
 */
const UnitGridView = ({ unitsData, onUnitSelect, onBack, postName }) => {
    // ... (component code is unchanged)
    const sortedUnitNames = useMemo(() => {
        return Object.keys(unitsData).sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
            return numA - numB;
        });
    }, [unitsData]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 px-4 py-2 mb-4 text-sm sm:text-base font-semibold text-red-600 dark:text-red-400
                       bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
            >
                <ChevronLeftIcon className="h-5 w-5" />
                All Posts
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 px-1">{postName}</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {sortedUnitNames.map(unitName => {
                    const quizzesInUnit = unitsData[unitName];
                    const quizCount = quizzesInUnit.length;
                    
                    return (
                        <QuizUnitCard
                            key={unitName}
                            title={unitName}
                            quizCount={quizCount}
                            isNew={false}
                            onClick={() => onUnitSelect(unitName)}
                        />
                    );
                })}
            </div>
        </motion.div>
    );
};

/**
 * View 4: QuizListView (Unchanged)
 */
const QuizListView = ({ quizzes, onQuizClick, onBack, unitName }) => {
    // ... (component code is unchanged)
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 px-4 py-2 mb-4 text-sm sm:text-base font-semibold text-red-600 dark:text-red-400
                       bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark
                       hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
            >
                <ChevronLeftIcon className="h-5 w-5" />
                Back to Units
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 px-1">{unitName}</h2>

            <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark p-2 sm:p-3 space-y-2">
                {quizzes.map(quiz => (
                    <QuizListItem
                        key={quiz.id}
                        quiz={quiz}
                        onClick={() => onQuizClick(quiz)}
                    />
                ))}
            </div>
        </motion.div>
    );
};


// =====================================================================
// Main Component (StudentQuizzesTab - Unchanged)
// =====================================================================
const StudentQuizzesTab = ({ 
    quizzes = [], 
    units = [], 
    handleTakeQuizClick, 
    isFetchingContent 
}) => {
    
    // ... (state, prop fix, handlers, and data logic are all unchanged) ...
    const [quizFilter, setQuizFilter] = useState('active');
    
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);

	const allQuizzes = useMemo(() => {
	    if (Array.isArray(quizzes)) {
	        return quizzes;
	    }
	    if (typeof quizzes === 'object' && quizzes !== null && !Array.isArray(quizzes)) {
	        const active = quizzes.active || [];
	        const completed = quizzes.completed || [];
	        const overdue = quizzes.overdue || [];
	        return [...active, ...completed, ...overdue];
	    }
	    return [];
	}, [quizzes]);

    const onQuizClick = (quiz) => {
        const maxAttempts = quiz.settings?.maxAttempts ?? 3;
        const hasAttemptsLeft =
            quiz.attemptsTaken === 'N/A' || quiz.attemptsTaken < maxAttempts;

        if (quiz.status === 'pending_sync' || !hasAttemptsLeft) return;
        handleTakeQuizClick(quiz);
    };

    const handleFilterChange = (filterName) => {
        setQuizFilter(filterName);
        setSelectedSubject(null);
        setSelectedPost(null);
        setSelectedUnit(null);
    };

    const SegmentButton = ({ label, filterName }) => (
        <button
            onClick={() => handleFilterChange(filterName)}
            className={`flex-1 capitalize py-2 px-3 text-sm font-semibold rounded-xl transition-all duration-300 
                        ${quizFilter === filterName 
                            ? 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400' 
                            : 'text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'}`}
        >
            {label}
        </button>
    );
    
    const groupedData = useMemo(() => {
        const rawGrouping = {}; 

        (allQuizzes || []).forEach(quiz => {
            const classId = quiz.classId || 'general-class';
            const className = quiz.className || 'General';
            const postTitle = quiz.postTitle || 'General Posts';
            const postCreatedAt = quiz.postCreatedAt || null;
            const unitName = (units.find(u => u.id === quiz.unitId)?.title) || 'Uncategorized';

            if (!rawGrouping[classId]) {
                rawGrouping[classId] = { className: className, posts: {} };
            }
            if (!rawGrouping[classId].posts[postTitle]) {
                rawGrouping[classId].posts[postTitle] = { postCreatedAt: postCreatedAt, units: {} };
            }
            if (!rawGrouping[classId].posts[postTitle].units[unitName]) {
                rawGrouping[classId].posts[postTitle].units[unitName] = [];
            }
            rawGrouping[classId].posts[postTitle].units[unitName].push(quiz);
        });

        const categorizedData = { active: {}, completed: {}, overdue: {} };

        Object.keys(rawGrouping).forEach(classId => {
            const subject = rawGrouping[classId];
            
            Object.keys(subject.posts).forEach(postTitle => {
                const post = subject.posts[postTitle];
                const allQuizzesInPost = Object.values(post.units).flat();
                
                const isCompleted = allQuizzesInPost.length > 0 && allQuizzesInPost.every(
                    q => q.attemptsTaken > 0 || q.attemptsTaken === 'N/A'
                );
                
                const isOverdue = !isCompleted && allQuizzesInPost.some(q => q.status === 'overdue');
                
                let category = 'active';
                if (isCompleted) category = 'completed';
                else if (isOverdue) category = 'overdue';

                if (!categorizedData[category][classId]) {
                    categorizedData[category][classId] = { className: subject.className, posts: {} };
                }
                
                categorizedData[category][classId].posts[postTitle] = post;
            });
        });

        return categorizedData;

    }, [allQuizzes, units]);


    const emptyStateProps = {
        active: {
            icon: ClipboardDocumentCheckIcon,
            text: 'No Active Quizzes',
            subtext: 'New quizzes from your teacher will appear here.'
        },
        completed: {
            icon: CheckCircleIcon,
            text: 'No Completed Quizzes',
            subtext: 'Once you attempt all quizzes in a post, the post will appear here.'
        },
        overdue: {
            icon: ExclamationTriangleIcon,
            text: 'No Overdue Quizzes',
            subtext: 'You have no quizzes past their deadline.'
        }
    }[quizFilter];

    const dataForFilter = groupedData[quizFilter] || {};
    const currentSubjectData = dataForFilter[selectedSubject] || null;
    const currentPostData = currentSubjectData?.posts[selectedPost] || null;
    const currentUnitData = currentPostData?.units[selectedUnit] || [];
    const currentUnitsObject = currentPostData?.units || {};


    return (
        <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark min-h-screen font-sans">
            <div className="p-4 space-y-6">
                <div className="px-2 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Quizzes</h1>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                            {!selectedSubject
                                ? 'Select a subject to view its quizzes.'
                                : !selectedPost
                                ? 'Select a post to view its units.'
                                : !selectedUnit
                                ? 'Select a unit to view its quizzes.'
                                : 'Select a quiz to begin.'}
                        </p>
                    </div>
                </div>

                {/* --- Themed segment control (Unchanged) --- */}
                <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl p-1 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                    <nav className="flex space-x-1">
                        <SegmentButton label="Active" filterName="active" />
                        <SegmentButton label="Completed" filterName="completed" />
                        <SegmentButton label="Overdue" filterName="overdue" />
                    </nav>
                </div>

                {/* --- Main Content Area --- */}
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
                    
                    {/* --- Main render logic (Unchanged) --- */}
                    <AnimatePresence mode="wait">
                        
                        {/* View 1: Show Subjects */}
                        {!selectedSubject && (
                            <SubjectGridView
                                key="subjects"
                                subjectsData={dataForFilter}
                                onSubjectSelect={(classId) => setSelectedSubject(classId)}
                                emptyStateProps={emptyStateProps}
                            />
                        )}

                        {/* View 2: Show Posts for a Subject */}
                        {selectedSubject && !selectedPost && (
                            <PostGridView
                                key="posts"
                                postsData={currentSubjectData?.posts || {}}
                                subjectName={currentSubjectData?.className || ''}
                                onPostSelect={(postTitle) => setSelectedPost(postTitle)}
                                onBack={() => setSelectedSubject(null)}
                                quizFilter={quizFilter}
                            />
                        )}

                        {/* View 3: Show Units for a Post */}
                        {selectedSubject && selectedPost && !selectedUnit && (
                            <UnitGridView
                                key="units"
                                unitsData={currentUnitsObject}
                                postName={selectedPost}
                                onUnitSelect={(unitName) => setSelectedUnit(unitName)}
                                onBack={() => setSelectedPost(null)}
                            />
                        )}

                        {/* View 4: Show Quizzes for a Unit */}
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
        </div>
    );
};

export default StudentQuizzesTab;