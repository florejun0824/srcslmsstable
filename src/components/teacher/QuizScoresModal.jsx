import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal'; // Adjust path if needed
import {
    AcademicCapIcon,
    ChartBarIcon,
    UsersIcon,
    LockClosedIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronDownIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    SparklesIcon, // Added
    PencilSquareIcon, // Added
    ClockIcon // Added
} from '@heroicons/react/24/solid';
import { ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline'; // Added
import { Button } from '@tremor/react'; // Assuming Tremor Button is used, adjust if not
// --- NEW IMPORTS ---
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore'; // Added writeBatch for potential future use, updateDoc primarily used
import { db } from '../../services/firebase'; // Adjust path if needed
import { gradeEssayWithAI } from '../../services/aiService'; // Adjust path if needed
import { useToast } from '../../contexts/ToastContext'; // Adjust path if needed
// --- END NEW IMPORTS ---


// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// StatCard Component - Renders dashboard statistics
const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className={`flex-1 bg-neumorphic-base p-4 rounded-xl shadow-neumorphic flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-neumorphic-base shadow-neumorphic-inset`}>
            {/* Dynamically applying text color class */}
            <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

// ScoreBadge Component - Renders score status in the table
const ScoreBadge = ({ score, totalItems, isLate = false, status }) => {
    let colorClasses = 'bg-gray-100 text-gray-700'; // Default: Not Started / Unknown
    let displayScore = '—';

    // Determine badge appearance based on submission status
    if (status === 'pending_ai_grading' || status === 'pending_review' || status === 'grading_failed') {
        colorClasses = 'bg-blue-100 text-blue-700'; // Blue for pending/needs review
        displayScore = 'Pending';
    } else if (score !== null && score !== undefined && totalItems > 0) { // Graded with valid score & total
        const percentage = (score / totalItems) * 100;
        // Color based on percentage
        if (percentage >= 90) colorClasses = 'bg-green-100 text-green-800'; // High score
        else if (percentage >= 70) colorClasses = 'bg-yellow-100 text-yellow-800'; // Medium score
        else colorClasses = 'bg-red-100 text-red-800'; // Low score
        displayScore = `${score}/${totalItems}`; // Display score fraction
    } else if (status === 'graded') {
         // Graded, but score might be 0 or totalItems invalid
         displayScore = `${score ?? 0}/${totalItems ?? 0}`;
          const percentage = (totalItems > 0) ? ((score ?? 0) / totalItems) * 100 : 0;
          // Apply color based on percentage even for 0 scores if graded
          if (percentage >= 90) colorClasses = 'bg-green-100 text-green-800';
          else if (percentage >= 70) colorClasses = 'bg-yellow-100 text-yellow-800';
          else colorClasses = 'bg-red-100 text-red-800';
    }
    // 'Not Started' status will use the default '—' display

    return (
        <div className="flex items-center justify-center gap-1 flex-col"> {/* Column layout for score + late */}
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${colorClasses}`}>
                {displayScore}
            </span>
            {/* Display 'LATE' badge if applicable */}
            {isLate && (
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">LATE</span>
            )}
        </div>
    );
};

// StatusPill Component - Renders status text with icon
const StatusPill = ({ status }) => {
    // Configuration for different statuses
    const statusConfig = {
        'graded': { icon: CheckCircleIcon, color: 'green', text: 'Completed' },
        'pending_ai_grading': { icon: ClockOutlineIcon, color: 'blue', text: 'Pending Grade' },
        'pending_review': { icon: PencilSquareIcon, color: 'orange', text: 'Needs Review' },
        'grading_failed': { icon: XCircleIcon, color: 'orange', text: 'AI Error' }, // Specific status for AI failure
        'Locked': { icon: LockClosedIcon, color: 'red', text: 'Locked' },
        'Not Started': { icon: XCircleIcon, color: 'gray', text: 'Not Started' },
    };
    // Get config or fallback to 'Not Started'
    const { icon: Icon, color, text } = statusConfig[status] || statusConfig['Not Started'];

    // Make sure color classes are fully formed for Tailwind JIT
    const colorClassMap = {
        green: 'text-green-700',
        blue: 'text-blue-700',
        orange: 'text-orange-700',
        red: 'text-red-700',
        gray: 'text-gray-700',
    };
    const iconColorClassMap = {
        green: 'text-green-500',
        blue: 'text-blue-500',
        orange: 'text-orange-500',
        red: 'text-red-500',
        gray: 'text-gray-500',
    };


    return (
        <div className={`flex items-center gap-2 text-sm font-semibold ${colorClassMap[color] || colorClassMap['gray']}`}>
            <Icon className={`w-5 h-5 ${iconColorClassMap[color] || iconColorClassMap['gray']}`} />
            <span>{text}</span>
        </div>
    );
};


// Main Modal Component
const QuizScoresModal = ({ isOpen, onClose, quiz, classData, quizScores, quizLocks, onUnlockQuiz }) => {
    const { showToast } = useToast();
    // State for table sorting configuration
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    // State for bulk grading process
    const [isBulkGrading, setIsBulkGrading] = useState(false);
    // State to track if pending essays exist for the *current* quiz
    const [hasPendingEssaysForThisQuiz, setHasPendingEssaysForThisQuiz] = useState(false);

    // Get max attempts from quiz settings, default to 3
    const maxAttempts = quiz?.settings?.maxAttempts ?? 3;


    // Check for pending essays specific to this quiz whenever scores update
    useEffect(() => {
        if (quiz?.id && quizScores) {
            // Check if *any* submission for *this quiz* is flagged or has a relevant pending status
            const pending = quizScores.some(score =>
                score.quizId === quiz.id &&
                (score.hasPendingEssays === true || score.status === 'pending_ai_grading')
            );
            console.log(`[QuizScoresModal useEffect] Pending check for quiz ${quiz.id}: ${pending}`); // Log pending status check
            setHasPendingEssaysForThisQuiz(pending);
        } else {
            // Reset if quiz/scores are not available
            setHasPendingEssaysForThisQuiz(false);
        }
    }, [quizScores, quiz?.id]); // Re-run when scores or quiz changes


    // Memoize processed student data for efficient sorting and display
    const processedStudentData = useMemo(() => {
        // Return empty array if essential data is missing
        if (!classData?.students || !quiz?.id) return [];

        const allStudents = classData.students.map(student => {
            // Find all attempts by this student for this specific quiz
            const studentAttempts = quizScores.filter(s => s.studentId === student.id && s.quizId === quiz.id)
                                          // Sort attempts chronologically (attempt 1 first)
                                          .sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

            // Check if this student is locked for this specific quiz
            const isLocked = quizLocks.some(l => l.studentId === student.id && l.quizId === quiz.id);

            // Determine overall status and find the attempt representing the highest score
            let status = 'Not Started';
            let highestScoreAttempt = null; // Store the entire attempt object with the highest score

            if (studentAttempts.length > 0) {
                 // Find the attempt with the highest score
                 // Use reduce, initializing with a dummy object with score -1
                highestScoreAttempt = studentAttempts.reduce((maxAttempt, currentAttempt) => {
                    // Treat potentially missing scores as -1 for comparison
                    const maxScore = maxAttempt?.score ?? -1;
                    const currentScore = currentAttempt?.score ?? -1;
                    // Return the attempt with the higher score
                    return (currentScore >= maxScore ? currentAttempt : maxAttempt); // Use >= to prefer later attempts on ties
                }, { score: -1 });

                 // If reduce didn't find a valid attempt (e.g., all scores were null/undefined),
                 // default to the latest attempt for status purposes.
                 if (!highestScoreAttempt || highestScoreAttempt.score === -1) {
                     highestScoreAttempt = studentAttempts[studentAttempts.length - 1];
                 }

                // The overall status reflects the *latest* attempt's status
                status = studentAttempts[studentAttempts.length - 1].status || 'graded'; // Default to graded if status missing
            } else if (isLocked) {
                // If no attempts but locked, set status to Locked
                status = 'Locked';
            }

            // Prepare an array representing attempt slots for table display (up to maxAttempts)
             const attemptsDisplay = Array(maxAttempts).fill(null); // Create array based on maxAttempts
             // Fill the slots with actual attempt data, preserving order
             studentAttempts.slice(0, maxAttempts).forEach((attempt, index) => {
                 attemptsDisplay[index] = attempt;
             });

            // Calculate total possible points, fallback to quiz data if attempt data missing
            const totalPossible = highestScoreAttempt?.totalItems ?? (quiz?.questions?.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 0);

            return {
                ...student, // Spread student info (id, name, etc.)
                status, // Overall status for display/sorting
                highestScore: highestScoreAttempt ? (highestScoreAttempt.score ?? -1) : -1, // Highest score achieved, -1 if none/pending
                totalItems: totalPossible, // Total possible points for this quiz
                attemptsDisplay: attemptsDisplay, // Array of attempts for table columns
                isLocked // Boolean indicating lock status
            };
        });

        // Sorting logic based on sortConfig state
        allStudents.sort((a, b) => {
            let aValue, bValue;
            const directionMultiplier = sortConfig.direction === 'ascending' ? 1 : -1;

            switch (sortConfig.key) {
                case 'score':
                    aValue = a.highestScore;
                    bValue = b.highestScore;
                    // Custom sorting: Not Started/Locked (-1) < Pending (treat as -0.5) < Scored (0+)
                    const scoreA = (a.status === 'pending_ai_grading' || a.status === 'pending_review' || a.status === 'grading_failed') ? -0.5 : aValue;
                    const scoreB = (b.status === 'pending_ai_grading' || b.status === 'pending_review' || b.status === 'grading_failed') ? -0.5 : bValue;
                    const isANotGraded = scoreA < 0; // Includes -1 and -0.5
                    const isBNotGraded = scoreB < 0;
                    if (isANotGraded && !isBNotGraded) return directionMultiplier * -1; // Non-graded first in ascending
                    if (!isANotGraded && isBNotGraded) return directionMultiplier * 1;  // Non-graded first in ascending
                    if (isANotGraded && isBNotGraded) { // Both non-graded, sort Pending > Locked/Not Started
                        const statusOrder = { 'Not Started': 0, 'Locked': 1, 'pending_ai_grading': 2, 'pending_review': 3, 'grading_failed': 3 };
                        return ((statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)) * directionMultiplier;
                    }
                    // Both have scores >= 0, sort normally
                    return (aValue - bValue) * directionMultiplier;
                case 'name':
                    // Sort by Last Name, then First Name, case-insensitive
                    aValue = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase().trim();
                    bValue = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase().trim();
                    return aValue.localeCompare(bValue) * directionMultiplier;
                case 'status':
                    // Define explicit order for statuses
                    const statusOrder = { 'Not Started': 0, 'Locked': 1, 'pending_ai_grading': 2, 'pending_review': 3, 'grading_failed': 3, 'graded': 4 };
                    aValue = statusOrder[a.status] ?? -1; // Use ?? for safety, fallback -1
                    bValue = statusOrder[b.status] ?? -1;
                    // Primary sort by status order
                    if (aValue !== bValue) return (aValue - bValue) * directionMultiplier;
                    // Secondary sort by name if statuses are the same
                    const nameA = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase().trim();
                    const nameB = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase().trim();
                    return nameA.localeCompare(nameB); // Ascending name within same status
                default:
                    return 0; // No sorting if key is unrecognized
            }
        });

        return allStudents; // Return the processed and sorted array
    }, [classData?.students, quizScores, quizLocks, quiz?.id, sortConfig, maxAttempts, quiz?.questions]); // Dependencies


    // Function to update sort configuration state
    const requestSort = (key) => {
        let direction = 'ascending';
        // If clicking the same key, toggle direction
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction }); // Update state
    };

    // Function to get the appropriate sort indicator icon
    const getSortIcon = (key) => {
        // Show down arrow dimmed on hover if not active sort key
        if (sortConfig.key !== key) return <ChevronDownIcon className="w-4 h-4 text-slate-400 invisible group-hover:visible ml-1" />;
        // Show up or down arrow if active sort key
        return sortConfig.direction === 'ascending'
            ? <ArrowUpIcon className="w-4 h-4 text-sky-600 ml-1" />
            : <ArrowDownIcon className="w-4 h-4 text-sky-600 ml-1" />;
    };


    // Calculate overall quiz statistics (memoized for performance)
    const { averageScorePercent, completedCount, highestScorePercent, totalStudents, totalPossiblePoints } = useMemo(() => {
        // Filter submissions relevant only to the current quiz
        const relevantSubmissions = quizScores.filter(s => s.quizId === quiz?.id);
        // Get unique student IDs who submitted at least once
        const uniqueStudentIds = [...new Set(relevantSubmissions.map(s => s.studentId))];
        // Calculate total possible points from the quiz structure
        const totalPoints = quiz?.questions?.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 0;

        // Get the highest final score achieved by each student who submitted
        const studentHighestScores = uniqueStudentIds.map(studentId => {
            const studentAttempts = relevantSubmissions.filter(s => s.studentId === studentId);
            // Use Math.max on the 'score' field (final score after grading)
            return Math.max(0, ...studentAttempts.map(a => a.score ?? 0)); // Default to 0 if score is missing
        });

        // Calculate average score across students who submitted
        const avgScore = studentHighestScores.length > 0
            ? studentHighestScores.reduce((acc, s) => acc + s, 0) / studentHighestScores.length
            : 0;
        // Calculate average percentage
        const avgPercent = totalPoints > 0 ? (avgScore / totalPoints) * 100 : 0;

        // Find the highest score achieved by any student
        const highestScore = studentHighestScores.length > 0 ? Math.max(...studentHighestScores) : 0;
        // Calculate highest score percentage
        const highestPercent = totalPoints > 0 ? (highestScore / totalPoints) * 100 : 0;

        // Total number of students enrolled in the class
        const enrolledStudents = classData?.students?.length || 0;

        return {
            averageScorePercent: avgPercent, // Average score as percentage
            completedCount: uniqueStudentIds.length, // Number of unique students who submitted
            highestScorePercent: highestPercent, // Highest score as percentage
            totalStudents: enrolledStudents, // Total students in the class
            totalPossiblePoints: totalPoints // Max points possible for the quiz
        };
    }, [quizScores, quiz?.id, quiz?.questions, classData?.students]); // Dependencies


    // --- Bulk AI Essay Grading Function (with detailed logging) ---
    const handleBulkGradeEssays = async () => {
        // Ensure necessary IDs are available
        if (!classData?.id || !quiz?.id) {
            showToast("Missing class or quiz information to start grading.", "error");
            console.error("[handleBulkGradeEssays] Missing classId or quizId.");
            return;
        }

        setIsBulkGrading(true); // Set loading state
        showToast("🚀 Starting bulk AI essay grading...", "info");
        console.log(`[handleBulkGradeEssays] Initiated for quizId: ${quiz.id}, classId: ${classData.id}`);
        let submissionsProcessedCount = 0;
        let essaysGradedCount = 0;
        let errorsEncounteredCount = 0;
        let limitReached = false;
        let pendingSubmissions = []; // To store fetched documents

        try {
            // 1. Query Firestore for pending submissions
            console.log(`[handleBulkGradeEssays] Querying submissions...`);
            const submissionsRef = collection(db, 'quizSubmissions');
            const q = query(submissionsRef,
                where('classId', '==', classData.id),
                where('quizId', '==', quiz.id),
                where('hasPendingEssays', '==', true) // Target only relevant submissions
            );
            const querySnapshot = await getDocs(q);
            pendingSubmissions = querySnapshot.docs; // Store the document snapshots

            // Handle case where no pending submissions are found
            if (pendingSubmissions.length === 0) {
                console.log("[handleBulkGradeEssays] No pending submissions found.");
                showToast("✅ No submissions found requiring AI grading.", "success");
                setHasPendingEssaysForThisQuiz(false); // Update UI state
                setIsBulkGrading(false);
                return;
            }

            console.log(`[handleBulkGradeEssays] Found ${pendingSubmissions.length} pending submissions.`);
            showToast(`Found ${pendingSubmissions.length} submissions. Grading essays sequentially... This may take time.`, "info", 5000);

            // 2. Process each submission sequentially to respect rate limits
            for (const docSnap of pendingSubmissions) {
                // Stop processing if AI limit was reached in a previous iteration
                if (limitReached) {
                    console.log("[handleBulkGradeEssays] AI limit reached previously, skipping remaining submissions.");
                    break;
                }

                const submissionId = docSnap.id;
                const submissionData = docSnap.data();
                // Deep copy the answers array to modify it safely
                let updatedAnswers = JSON.parse(JSON.stringify(submissionData.answers || []));
                let needsDocUpdate = false; // Flag to track if Firestore update is needed
                let submissionCompletedProcessing = true; // Assume success unless an error occurs

                console.log(`---> [handleBulkGradeEssays] Processing Submission ID: ${submissionId}`);
                showToast(`⏳ Processing submission ${submissionsProcessedCount + 1} of ${pendingSubmissions.length}...`, "loading", 6000);

                // 3. Process pending essays *within* the current submission
                let essayGradingPromises = []; // Store promises if parallelizing *within* submission (currently sequential)

                for (let i = 0; i < updatedAnswers.length; i++) {
                    // Check if it's an essay needing AI grading
                    if (updatedAnswers[i].questionType === 'essay' && updatedAnswers[i].status === 'pending_ai_grading') {
                        console.log(`   [${submissionId}] Attempting to grade essay index ${i}`);
                        // --- Wrap individual essay grading in an async IIFE ---
                        essayGradingPromises.push((async () => {
                             try {
                                // --- CRUCIAL DELAY ---
                                console.log(`   [${submissionId}] Waiting for delay before grading essay ${i}...`);
                                await delay(2500); // Wait 2.5 seconds (adjust based on Gemini limits)
                                console.log(`   [${submissionId}] Calling AI for essay index ${i}...`);

                                // Call the AI service function
                                const gradingResult = await gradeEssayWithAI(
                                    updatedAnswers[i].questionText,
                                    updatedAnswers[i].rubric,
                                    updatedAnswers[i].selectedAnswer
                                );
                                console.log(`   [${submissionId}] AI call SUCCESS for essay index ${i}. Result:`, gradingResult);

                                // --- Update the answer object in memory ---
                                updatedAnswers[i].aiGradingResult = gradingResult;
                                updatedAnswers[i].score = gradingResult.totalScore; // Assign AI score
                                updatedAnswers[i].status = 'graded'; // Mark as graded
                                essaysGradedCount++;
                                needsDocUpdate = true; // Mark submission for Firestore update
                                console.log(`   [${submissionId}] Essay index ${i} marked as graded. Score: ${gradingResult.totalScore}`);

                            } catch (aiError) {
                                console.error(`   [${submissionId}] AI call FAILED for essay index ${i}:`, aiError);
                                // --- Handle AI errors ---
                                updatedAnswers[i].status = 'grading_failed'; // Mark as failed
                                // Store error message, provide a default if needed
                                updatedAnswers[i].aiGradingResult = { error: aiError?.message || "Unknown AI grading error" };
                                needsDocUpdate = true;
                                errorsEncounteredCount++;
                                submissionCompletedProcessing = false; // Requires manual review

                                // Check specifically for rate limit error
                                if (aiError.message === "LIMIT_REACHED" || aiError.message.includes("limit")) {
                                    console.warn(`[${submissionId}] AI Limit Reached during essay ${i}. Stopping further AI calls for this submission batch.`);
                                    showToast("🛑 AI call limit reached. Stopping further grading for now.", "error", 7000);
                                    limitReached = true; // Set global flag to stop all processing
                                    // Re-throw to break Promise.all for this submission
                                    throw aiError;
                                } else {
                                     // Notify about other AI errors
                                     showToast(`⚠️ AI grading failed for an essay in submission ${submissionsProcessedCount + 1}.`, "warning");
                                     // Don't throw for other errors, let Promise.all handle them later
                                }
                            }
                        })()); // Immediately invoke the async function

                        // If limit was reached, stop queuing more AI calls for this submission
                        if (limitReached) break;

                    } else if (updatedAnswers[i].status !== 'graded') {
                         // If any non-essay item is somehow not graded, or an essay failed previously
                         submissionCompletedProcessing = false;
                         console.log(`   [${submissionId}] Found non-graded item at index ${i}, status: ${updatedAnswers[i].status}. Marking submission as not fully processed.`);
                    }
                } // End of essays loop for one submission

                // --- Wait for all AI calls *for the current submission* to settle ---
                try {
                     console.log(`   [${submissionId}] Waiting for ${essayGradingPromises.length} essay grading promises to settle...`);
                     await Promise.all(essayGradingPromises);
                     console.log(`   [${submissionId}] All essay promises settled.`);
                 } catch (batchError) {
                     // Catch errors (specifically the LIMIT_REACHED one re-thrown from inside)
                     if (limitReached) {
                         console.log(`   [${submissionId}] AI Limit reached while processing promises. Proceeding to update document with partial results.`);
                     } else {
                         // Log unexpected errors from Promise.all
                         console.error(`   [${submissionId}] Unexpected error during essay grading batch:`, batchError);
                     }
                     // Proceed to update Firestore even if some promises failed
                 }


                // 4. Update the Firestore submission document if changes were made
                if (needsDocUpdate) {
                    // Recalculate the final total score based on updated answer scores
                    const finalCalculatedScore = updatedAnswers.reduce((sum, ans) => sum + (Number(ans.score) || 0), 0);
                    // Determine the final status based on all answers
                    const hasFailures = updatedAnswers.some(a => a.status === 'grading_failed');
                    // Check if *any* essays are *still* pending (only if limit was hit)
                    const hasStillPending = updatedAnswers.some(a => a.status === 'pending_ai_grading');

                    let finalStatus = 'graded'; // Assume success
                    if (hasFailures) finalStatus = 'pending_review'; // Set if any AI call failed
                    else if (hasStillPending) finalStatus = 'pending_ai_grading'; // Set if interrupted by limit

                    const submissionRef = doc(db, 'quizSubmissions', submissionId);

                    // --- Log Data Before Update ---
                    console.log(`---> [${submissionId}] PREPARING FIRESTORE UPDATE:`);
                    console.log(`     New Score: ${Math.round(finalCalculatedScore)}`);
                    console.log(`     New Status: ${finalStatus}`);
                    console.log(`     New hasPendingEssays: ${hasStillPending}`);
                    // console.log("     Updated Answers Object:", JSON.stringify(updatedAnswers, null, 2)); // Uncomment for very detailed debug

                    try {
                         await updateDoc(submissionRef, {
                            answers: updatedAnswers, // Save the updated answers array
                            score: Math.round(finalCalculatedScore), // Save the new total score
                            status: finalStatus, // Update the overall status
                            hasPendingEssays: hasStillPending // Flag is true only if interrupted
                        });
                        console.log(`   [${submissionId}] Firestore update SUCCESS.`);
                    } catch (updateError) {
                        console.error(`   [${submissionId}] Firestore update FAILED:`, updateError);
                        errorsEncounteredCount++; // Count update errors too
                        showToast(`❌ Failed to save grades for submission ${submissionsProcessedCount + 1}. Error: ${updateError.message}`, "error");
                    }
                }
// [Inside handleBulkGradeEssays function]

                 // --- Safety Check: Correct flag if no AI calls were made (e.g., essays were already graded/failed) ---
                 else if (submissionData.hasPendingEssays === true && !limitReached) {
                     console.log(`[${submissionId}] No AI calls needed. Recalculating score and correcting flag...`); // Updated log
                     const submissionRef = doc(db, 'quizSubmissions', submissionId);
                     try {
                         // --- ADD THIS LINE ---
                         // Recalculate score from existing answers (auto-graded + previously failed/scored essays)
                         const finalCalculatedScore = updatedAnswers.reduce((sum, ans) => sum + (Number(ans.score) || 0), 0);
                         // --- END ADD ---

                         // Determine correct final status just in case
                         const finalStatusCheck = updatedAnswers.some(a => a.status === 'grading_failed' || a.status === 'pending_review') ? 'pending_review' : 'graded';
                         
                         await updateDoc(submissionRef, {
                             // --- ADD THIS LINE ---
                             score: Math.round(finalCalculatedScore), // Save the recalculated score
                             // --- END ADD ---
                             hasPendingEssays: false,
                             status: finalStatusCheck
                         });
                         console.log(`   [${submissionId}] Flag correction & score update SUCCESS. New score: ${finalCalculatedScore}`); // Updated log
                     } catch (flagError) {
                         console.error(`   [${submissionId}] Flag correction FAILED:`, flagError);
                     }
                 }


                submissionsProcessedCount++; // Increment after processing each submission
                console.log(`---> [handleBulkGradeEssays] Finished processing submission ${submissionId}`);

            } // End of submissions loop

            // 5. Final Feedback Toast after loop finishes or breaks
            console.log("[handleBulkGradeEssays] Bulk grading loop finished.");
            if (limitReached) {
                 showToast(`🛑 AI Limit Reached. Processed ${submissionsProcessedCount} submissions. ${essaysGradedCount} essays graded. Others remain pending.`, "warning", 8000);
                 // Keep button active as some might still be pending
                 setHasPendingEssaysForThisQuiz(true);
            } else {
                 const successMessage = `✅ Finished grading ${submissionsProcessedCount} submissions. ${essaysGradedCount} essays graded.`;
                 // Add error count if any occurred
                 const errorMessage = errorsEncounteredCount > 0 ? ` ${errorsEncounteredCount} errors occurred (require manual review).` : '';
                 showToast(successMessage + errorMessage, errorsEncounteredCount > 0 ? "warning" : "success", 6000);
                 // Set pending flag based on whether errors require review
                 setHasPendingEssaysForThisQuiz(errorsEncounteredCount > 0);
            }

        } catch (error) {
            // Catch errors from the initial query or unexpected loop issues
            console.error("[handleBulkGradeEssays] Error during setup or outer loop:", error);
            if (!limitReached) { // Avoid double toast if limit was the cause
                 showToast(`Bulk grading stopped unexpectedly: ${error.message}`, "error");
            }
        } finally {
            console.log("[handleBulkGradeEssays] Setting isBulkGrading to false.");
            setIsBulkGrading(false); // Reset loading state regardless of outcome
            // The onSnapshot listener in the parent component (ClassOverviewModal) should handle UI refresh automatically.
        }
    };
    // --- END NEW FUNCTION ---

    // --- Main JSX Render ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Scores for "${quiz?.title || 'Quiz'}"`} size="6xl">
            <div className="flex flex-col gap-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={UsersIcon} title="Completion Rate" value={`${completedCount} / ${totalStudents}`} color="blue" />
                    <StatCard icon={AcademicCapIcon} title="Average Score (%)" value={totalPossiblePoints > 0 ? `${averageScorePercent.toFixed(1)}%` : 'N/A'} color="teal" />
                    <StatCard icon={ChartBarIcon} title="Highest Score (%)" value={totalPossiblePoints > 0 ? `${highestScorePercent.toFixed(1)}%` : 'N/A'} color="purple" />
                </div>

				{/* --- Bulk Grade Button --- */}
								                 <div className="pt-2"> {/* Container for responsive width */}
								                     <Button
								                        onClick={handleBulkGradeEssays}
								                        disabled={!hasPendingEssaysForThisQuiz || isBulkGrading} // Disabled if no essays OR currently grading
								                        icon={SparklesIcon}
								                        // We control all styles via className
								                        className={`
								                            w-full sm:w-auto font-semibold transition-all rounded-xl border-none outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-neumorphic-base py-2 px-4
                            
								                            ${isBulkGrading 
								                                // --- LOADING STATE (Gradient) ---
								                                ? 'text-white bg-gradient-to-r from-blue-400 to-purple-500 shadow-lg opacity-70 cursor-wait animate-pulse' 
                                
								                                : hasPendingEssaysForThisQuiz
								                                    // --- ACTIVE STATE (Gradient) ---
								                                    ? 'text-white font-bold bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:from-blue-600 hover:to-purple-700 active:shadow-inner active:opacity-90'
                                    
								                                    // --- INACTIVE NEUMORPHIC STATE ---
								                                    // This is the "inset" or "off" look, matching other disabled UI
								                                    : 'text-slate-500 bg-neumorphic-base shadow-neumorphic-inset cursor-not-allowed'
								                            }
								                        `}
								                     >
								                        {isBulkGrading ? 'Grading Pending Essays...' : 'Grade Pending Essays'}
								                     </Button>
								                 </div>
								                 {/* --- END Bulk Grade Button --- */}


												 {/* Scores Table */}
												                 <div className="bg-neumorphic-base p-4 rounded-xl shadow-neumorphic overflow-x-auto">
												                     {/* Table Header */}
												                     <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b-2 border-slate-300/60 text-left text-xs sm:text-sm font-bold text-slate-600 rounded-t-xl sticky top-0 bg-neumorphic-base z-10 min-w-[700px]">
												                         {/* Sortable Column Headers */}
												                         <button onClick={() => requestSort('name')} className="col-span-4 group flex items-center gap-1 hover:text-sky-700 transition-colors"><span>Student Name</span> {getSortIcon('name')}</button>
												                         <button onClick={() => requestSort('status')} className="col-span-3 group flex items-center gap-1 hover:text-sky-700 transition-colors"><span>Status</span> {getSortIcon('status')}</button>
												                         {/* Attempt Columns Header */}
												                         <div className={`col-span-3 grid grid-cols-${maxAttempts} text-center`}>
												                             {[...Array(maxAttempts)].map((_, i) => (
												                                 <span key={i} className={`col-span-1 ${maxAttempts > 3 ? 'text-[10px]' : ''}`}>Attempt {i + 1}</span>
												                             ))}
												                         </div>
												                         <div className="col-span-2 text-right">Actions</div>
												                     </div>
												                     {/* Table Body (Scrollable) */}
												                     <div className="mt-1 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
												                         {processedStudentData.length > 0 ? (
												                             processedStudentData.map(student => (
												                                 <div key={student.id} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg transition-shadow hover:shadow-neumorphic-inset border-b border-slate-200/50 last:border-b-0 min-w-[700px]">
												                                     {/* Student Name */}
												                                     <div className="col-span-4 font-semibold text-slate-800 truncate" title={`${student.lastName}, ${student.firstName}`}>{student.lastName}, {student.firstName}</div>
												                                     {/* Status Pill */}
												                                     <div className="col-span-3"><StatusPill status={student.status} /></div>
												                                     {/* Attempts */}
												                                     <div className={`col-span-3 grid grid-cols-${maxAttempts} gap-1`}>
												                                         {student.attemptsDisplay.map((attempt, index) => (
												                                             <div key={index} className="col-span-1 flex justify-center">
												                                                 {attempt ? (
												                                                     <ScoreBadge
												                                                         score={attempt.score}
												                                                         totalItems={attempt.totalItems} // Use total from the specific attempt
												                                                         isLate={!!attempt.isLate} // Check if isLate flag exists
												                                                         status={attempt.status} // Pass status for correct badge display
												                                                     />
												                                                 ) : (
												                                                     <span className="text-slate-400 text-xs">—</span> // Placeholder if no attempt data
												                                                 )}
												                                             </div>
												                                         ))}
												                                     </div>
												                                     {/* Actions Column */}
												                                     <div className="col-span-2 flex justify-end">
												                                         {/* Unlock Button */}
												                                         {student.isLocked && onUnlockQuiz && ( // Show only if locked and handler provided
												                                             <button
												                                                 onClick={() => quiz?.id && student?.id && onUnlockQuiz(quiz.id, student.id)}
												                                                 className="px-3 py-1 text-xs font-semibold text-red-600 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
												                                                 title={`Unlock quiz for ${student.firstName}`}
												                                                 aria-label={`Unlock quiz for ${student.firstName} ${student.lastName}`}
												                                             >
												                                                 Unlock
												                                             </button>
												                                         )}
												                                         {/* Placeholder for future actions like "View Details" */}
												                                         {!student.isLocked && <div className="w-[58px]"></div> /* Keep alignment */}
												                                     </div>
												                                 </div>
												                             ))
												                         ) : (
												                             // Empty state message
												                             <div className="text-center py-8 text-slate-500">No students enrolled in this class yet or no submissions found.</div>
												                         )}
												                     </div>
												                 </div>
												             </div>
												         </Modal>
												     );
												 };

												 export default QuizScoresModal;