// src/workers/dataProcessor.worker.js
// Offloads heavy data processing from the main thread for 120Hz WebView performance.
import * as Comlink from 'comlink';

// =============================================================================
// STUDENT-SIDE FUNCTIONS
// =============================================================================

/**
 * Groups lessons by className, sorts them, and marks "new" content.
 * Replaces the useMemo in StudentLessonsTab.jsx.
 */
function groupLessonsByClass(lessons) {
  if (!lessons || !lessons.length) return {};

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const grouped = {};
  for (const lesson of lessons) {
    const className = lesson.className || 'Uncategorized Class';
    if (!grouped[className]) {
      grouped[className] = {
        id: lesson.classId,
        name: className,
        lessons: [],
        hasNewContent: false,
      };
    }
    grouped[className].lessons.push(lesson);

    if (!grouped[className].hasNewContent && lesson.createdAt) {
      // Handle both Firestore Timestamp-like objects and plain dates
      const ts = typeof lesson.createdAt === 'number'
        ? lesson.createdAt
        : (lesson.createdAt.seconds ? lesson.createdAt.seconds * 1000 : new Date(lesson.createdAt).getTime());
      if (ts > sevenDaysAgo) {
        grouped[className].hasNewContent = true;
      }
    }
  }

  // Sort lessons within each class
  for (const className of Object.keys(grouped)) {
    grouped[className].lessons.sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title || '').localeCompare(b.title || '', 'en-US', { numeric: true });
    });
  }

  return grouped;
}

/**
 * Groups lessons by unit, sorts them.
 * Replaces the useMemo in LessonsByUnitView.jsx.
 */
function groupLessonsByUnit(lessons, units) {
  if ((!lessons || lessons.length === 0) && (!units || units.length === 0)) return {};

  const unitsMap = {};
  for (const unit of units) {
    unitsMap[unit.id] = unit;
  }

  const grouped = {};
  for (const lesson of lessons) {
    const unit = unitsMap[lesson.unitId];
    const unitTitle = unit ? unit.title : 'Uncategorized';
    const unitCreatedAt = unit ? unit.createdAt : null;

    if (!grouped[unitTitle]) {
      grouped[unitTitle] = { lessons: [], createdAt: unitCreatedAt };
    }
    grouped[unitTitle].lessons.push(lesson);
  }

  for (const unitTitle of Object.keys(grouped)) {
    grouped[unitTitle].lessons.sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      return orderA !== orderB ? orderA - orderB : (a.title || '').localeCompare(b.title || '');
    });
  }

  return grouped;
}

/**
 * Generic school-based filter.
 * Replaces inline filter() calls in useTeacherData.js.
 */
function filterBySchool(items, schoolId, fieldName = 'schoolId') {
  if (!items || !items.length) return [];
  const targetSchool = schoolId || 'srcs_main';
  return items.filter(item => {
    const itemSchool = item[fieldName] || 'srcs_main';
    return itemSchool === targetSchool || itemSchool === 'all_schools';
  });
}

// =============================================================================
// TEACHER-SIDE FUNCTIONS
// =============================================================================

/**
 * Filters and sorts lessons + quizzes for a specific unit.
 * Replaces the useMemo in UnitAccordion.jsx.
 */
function filterAndSortByUnit(allLessons, allQuizzes, unitId) {
  if (!unitId) return { lessons: [], quizzes: [] };

  const unitLessons = allLessons
    .filter(l => l.unitId === unitId)
    .map(l => ({ ...l, type: 'lesson' }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const unitQuizzes = allQuizzes
    .filter(q => q.unitId === unitId)
    .map(q => ({ ...q, type: 'quiz' }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return { lessons: unitLessons, quizzes: unitQuizzes };
}

/**
 * Aggregates quiz score statistics.
 * Replaces the quizStatsMap useMemo in ScoresTab.jsx.
 */
function computeQuizStats(quizScores) {
  const stats = {};
  if (!quizScores || quizScores.length === 0) return stats;

  for (const submission of quizScores) {
    const qId = submission.quizId;
    if (!stats[qId]) {
      stats[qId] = { count: 0, uniqueStudentIds: [], totalScore: 0 };
    }
    stats[qId].count += 1;
    if (!stats[qId].uniqueStudentIds.includes(submission.studentId)) {
      stats[qId].uniqueStudentIds.push(submission.studentId);
    }
    stats[qId].totalScore += (submission.score || 0);
  }

  return stats;
}

/**
 * Groups shared content posts by unit, sorts by timestamp.
 * Replaces the sortedPostEntries useMemo in ScoresTab.jsx.
 */
function groupPostsByUnit(sharedContentPosts, units) {
  if (!sharedContentPosts) return [];

  const grouped = [];
  for (const post of sharedContentPosts) {
    const postQuizzes = post.quizzes || [];
    if (postQuizzes.length === 0) continue;

    const unitsInPost = {};
    for (const quiz of postQuizzes) {
      const unitName = units[quiz.unitId] || 'Uncategorized';
      if (!unitsInPost[unitName]) unitsInPost[unitName] = [];
      unitsInPost[unitName].push(quiz);
    }

    grouped.push({
      post,
      units: unitsInPost,
      timestamp: post.createdAt?.seconds || Date.now(),
    });
  }

  return grouped.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Processes student scores for the QuizScoresModal.
 * Replaces the processedStudents useMemo in QuizScoresModal.jsx.
 */
function processStudentScores(students, fetchedScores, fetchedLocks, quizSettings, searchTerm) {
  if (!students || !students.length) {
    return { processedStudents: [], summaryStats: { attempted: 0, totalStudents: 0, avg: 0, high: 0 }, hasPendingEssays: false, hasFailedEssays: false };
  }

  let pending = false;
  let failed = false;

  const processed = students.map(student => {
    const myScores = fetchedScores
      .filter(s => s.studentId === student.id)
      .sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

    const lockRecord = fetchedLocks.find(l => l.studentId === student.id);
    const isLocked = !!lockRecord;

    let status = 'Not Started';
    let bestScore = null;

    if (myScores.length > 0) {
      const latest = myScores[myScores.length - 1];
      status = latest.status || 'graded';

      if (latest.status === 'pending_ai_grading' || latest.hasPendingEssays) pending = true;
      if (latest.answers?.some(a => a.status === 'grading_failed')) failed = true;

      const bestAttempt = myScores.reduce(
        (max, curr) => ((curr.score ?? -1) >= (max.score ?? -1) ? curr : max),
        { score: -1 }
      );
      bestScore = bestAttempt.score;
    } else if (isLocked) {
      status = 'Locked';
    }

    return {
      ...student,
      attempts: myScores,
      bestScore,
      status,
      isLocked,
      lockId: lockRecord?.id,
    };
  });

  const filtered = searchTerm
    ? processed.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : processed;

  const attemptedCount = processed.filter(s => s.attempts.length > 0).length;
  const validScores = processed.filter(s => s.bestScore !== null).map(s => s.bestScore);
  const avgScore = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
  const highestScore = validScores.length ? Math.max(...validScores) : 0;

  const totalPoints = quizSettings?.totalPoints || 1;

  return {
    processedStudents: filtered,
    hasPendingEssays: pending,
    hasFailedEssays: failed,
    summaryStats: {
      attempted: attemptedCount,
      totalStudents: processed.length,
      avg: (avgScore / totalPoints) * 100,
      high: (highestScore / totalPoints) * 100,
    },
  };
}

/**
 * Generic case-insensitive search/filter.
 */
function searchFilter(items, queryStr, fieldName) {
  if (!queryStr || !queryStr.trim()) return items;
  const lowerQuery = queryStr.toLowerCase();
  return items.filter(item => {
    const val = item[fieldName];
    return val && val.toLowerCase().includes(lowerQuery);
  });
}

/**
 * Sorts announcements.
 * Replaces useMemo in useAnnouncements.js.
 */
function sortAnnouncements(initialAnnouncements) {
    if (!Array.isArray(initialAnnouncements)) return [];
    return [...initialAnnouncements].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        const getMs = (dateObj) => {
            if (!dateObj) return 0;
            if (typeof dateObj === 'number') return dateObj;
            if (dateObj.toDate) return dateObj.toDate().getTime();
            if (dateObj.seconds) return dateObj.seconds * 1000;
            return new Date(dateObj).getTime() || 0;
        };
        
        const dateA = getMs(a.createdAt);
        const dateB = getMs(b.createdAt);
        return dateB - dateA;
    });
}

/**
 * Splits statements into pinned and timeline.
 * Replaces useMemo in ActivityFeed.jsx.
 */
function splitActivityFeed(sortedAnnouncements) {
    const pinnedPosts = [];
    const timelinePosts = [];
    if (sortedAnnouncements) {
        for (const post of sortedAnnouncements) {
            if (post.isPinned) pinnedPosts.push(post);
            else timelinePosts.push(post);
        }
    }
    return { pinnedPosts, timelinePosts };
}

/**
 * Filters lounge posts by school.
 * Replaces filter logic in LoungeView.jsx.
 */
function filterLoungePosts(sortedPosts, userSchoolId) {
    if (!sortedPosts || !Array.isArray(sortedPosts)) return [];
    const targetSchool = userSchoolId || 'srcs_main';
    
    return sortedPosts.filter(post => {
        if (post.type === 'system_countdown' || post.type === 'election_result') {
            return true;
        }
        const postSchoolId = post.schoolId || 'srcs_main'; 
        return postSchoolId === targetSchool;
    });
}

// Expose all functions via Comlink
Comlink.expose({
  groupLessonsByClass,
  groupLessonsByUnit,
  filterBySchool,
  filterAndSortByUnit,
  computeQuizStats,
  groupPostsByUnit,
  processStudentScores,
  searchFilter,
  sortAnnouncements,
  splitActivityFeed,
  filterLoungePosts,
});

