import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import Spinner from '../../common/Spinner'; // Adjust path if needed

// --- Import all the view components (we will create these next) ---
import QuizNotAvailable from './QuizNotAvailable';
import QuizTeacherPreview from './QuizTeacherPreview';
import QuizLockedView from './QuizLockedView';
import QuizNoAttemptsView from './QuizNoAttemptsView';
import QuizResultsView from './QuizResultsView';
import QuizReviewView from './QuizReviewView';
import QuizQuestion from './QuizQuestion';
import QuizQuestionFeedback from './QuizQuestionFeedback';

/**
 * This component acts as a "router" to display the correct
 * UI view based on the current quiz state.
 * It replaces the old renderContent() function.
 */
export default function QuizContent() {
    // Get all state and logic from the context
    const {
        loading,
        isAvailable,
        isTeacherView,
        isLocked,
        latestSubmission,
        attemptsTaken,
        maxAttempts,
        score,
        hasSubmitted, // Note: this is the .current value
        showReview,
        questionResult,
        matchingResult
    } = useQuiz();

    // 1. Loading State
    if (loading) {
        return <div className="flex justify-center items-center h-full p-8"><Spinner /></div>;
    }

    // 2. Not Available (Student only)
    if (!isAvailable && !isTeacherView) {
        return <QuizNotAvailable />;
    }

    // 3. Teacher Preview
    if (isTeacherView) {
        return <QuizTeacherPreview />;
    }

    // 4. Locked
    if (isLocked) {
        return <QuizLockedView />;
    }

    // --- Logic from original renderContent() ---
    const currentAttempts = attemptsTaken;
    const currentScoreState = score;

    // 5. No Attempts Left
    if (currentAttempts >= maxAttempts) {
        return showReview ? <QuizReviewView /> : <QuizNoAttemptsView />;
    }

    // 6. Submitted / Show Results
    if (hasSubmitted || currentScoreState !== null) {
         return showReview ? <QuizReviewView /> : <QuizResultsView />;
    }
    
    // 7. Show Immediate Feedback (for MC, TF, ID, Matching)
    if (questionResult || matchingResult) {
         return <QuizQuestionFeedback />;
    }

    // 8. Default: Show the current question for answering
    return <QuizQuestion />;
}