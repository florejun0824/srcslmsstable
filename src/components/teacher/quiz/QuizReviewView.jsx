import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer';
import { ClockIcon as ClockOutlineIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, PencilSquareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export default function QuizReviewView() {
    const {
        submissionToReview,
        setShowReview,
        setSubmissionToReview,
        quiz,
    } = useQuiz();

    const answersToReview = submissionToReview?.answers || [];

    // --- Material You Shared Components ---
    const MaterialContainer = ({ children, className = "" }) => (
        <div className={`relative overflow-hidden p-0 sm:p-8 rounded-none sm:rounded-[36px] 
            bg-[#F8F9FA] dark:bg-[#131314] 
            transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] flex flex-col max-h-[100dvh] h-[100dvh] sm:h-auto sm:max-h-[85vh] ${className}`}>
            {children}
        </div>
    );

    const MaterialTonalButton = ({ onClick, children }) => (
        <button onClick={onClick} className="group flex items-center justify-center gap-2 w-full px-5 py-4 rounded-[28px] 
            bg-[#E1E6EB] hover:bg-[#D1D8E0] dark:bg-[#3B3E42] dark:hover:bg-[#4A4E53]
            text-[#1A1C1E] dark:text-[#E3E2E6] font-bold text-[15px] sm:text-[16px] tracking-tight
            transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98]">
            <ArrowLeftIcon className="h-5 w-5 opacity-80 group-hover:-translate-x-1 transition-transform" />
            {children}
        </button>
    );

    if (answersToReview.length === 0 || !submissionToReview) {
         return (
            <MaterialContainer>
                <div className="flex flex-col items-center justify-center h-full sm:h-72 text-[#74777F] dark:text-[#8E9099]">
                    <ExclamationTriangleIcon className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium text-[15px]">No submission data available.</p>
                    <button onClick={() => setShowReview(false)} className="mt-6 px-6 py-2.5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#001C38] dark:text-[#D3E3FD] font-bold text-[14px]">Go Back</button>
                </div>
            </MaterialContainer>
         );
    }

    const reviewNumbering = (() => {
        let currentItemNumber = 1; const starts = []; let totalPoints = 0;
        answersToReview.forEach(answer => {
            starts.push(currentItemNumber);
            const pointsValue = Number(answer.points) || 1;
            currentItemNumber += pointsValue;
            totalPoints += pointsValue;
        });
        return { starts, totalPoints };
    })();

    const displayBoolean = (val) => {
        const strVal = String(val).toLowerCase();
        if (quiz.language === 'Filipino') return strVal === 'true' ? 'Tama' : (strVal === 'false' ? 'Mali' : strVal);
        return strVal === 'true' ? 'True' : (strVal === 'false' ? 'False' : strVal);
    };

    return (
        <MaterialContainer>
            {/* Header Section */}
            <div className="flex-shrink-0 pt-6 sm:pt-0 px-6 sm:px-0 mb-4 sm:mb-6 text-center border-b border-[#E1E6EB] dark:border-[#44474A] pb-5">
                <h3 className="text-[22px] sm:text-3xl font-bold text-[#1A1C1E] dark:text-[#E3E2E6] tracking-tight mb-1">
                    Attempt Review
                </h3>
                <p className="text-[12px] font-bold text-[#74777F] dark:text-[#8E9099] uppercase tracking-widest">
                    Attempt #{submissionToReview.attemptNumber}
                </p>
                
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0F4F8] dark:bg-[#1E1E1E]">
                    <span className="font-bold text-[15px] text-[#1A1C1E] dark:text-[#E3E2E6]">
                        {submissionToReview.score ?? 0} <span className="text-[#74777F] dark:text-[#8E9099] font-normal">/ {reviewNumbering.totalPoints}</span>
                    </span>
                    {submissionToReview.status === 'pending_ai_grading' && (
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#005AC1] dark:text-[#A8C7FA] ml-2">
                            <ClockOutlineIcon className="h-3.5 w-3.5"/> AI GRADING
                        </span>
                    )}
                    {submissionToReview.status === 'pending_review' && (
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#8C4A00] dark:text-[#FFB77A] ml-2">
                            <PencilSquareIcon className="h-3.5 w-3.5"/> IN REVIEW
                        </span>
                    )}
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-1 space-y-3 sm:space-y-4 custom-scrollbar pb-8">
                {answersToReview.map((answer, index) => {
                    const startNum = reviewNumbering.starts[index];
                    const pointsValue = Number(answer.points) || 1;
                    const endNum = startNum + pointsValue - 1;
                    const numLabel = pointsValue <= 1 ? `Item ${startNum}` : `Items ${startNum}-${endNum}`;
                    const itemScore = answer.score ?? 0;

                    // Material Tonal Mappings
                    let cardStyle = "bg-[#F0F4F8] dark:bg-[#1E1E1E] text-[#1A1C1E] dark:text-[#E3E2E6]"; 
                    let statusIcon = <InformationCircleIcon className="h-5 w-5 text-[#74777F] dark:text-[#8E9099]" />;
                    let statusColorText = "text-[#74777F] dark:text-[#8E9099]";
                    let innerTonalStyle = "bg-white/50 dark:bg-black/20"; // Used for inner cards to create subtle depth

                    if (answer.status === 'pending_ai_grading') {
                        cardStyle = "bg-[#D3E3FD] dark:bg-[#004A77] text-[#001C38] dark:text-[#D3E3FD]";
                        statusIcon = <ClockOutlineIcon className="h-5 w-5 opacity-80" />;
                        statusColorText = "text-[#001C38] dark:text-[#D3E3FD]";
                    } else if (answer.status === 'grading_failed' || answer.status === 'pending_review') {
                        cardStyle = "bg-[#FFDCC1] dark:bg-[#4D2700] text-[#2E1500] dark:text-[#FFB77A]";
                        statusIcon = <PencilSquareIcon className="h-5 w-5 opacity-80" />;
                        statusColorText = "text-[#2E1500] dark:text-[#FFB77A]";
                    } else if (answer.status === 'graded') {
                         if (itemScore === answer.points) { 
                             cardStyle = "bg-[#E8F5E9] dark:bg-[#0D3020] text-[#1B5E20] dark:text-[#A5D6A7]"; 
                             statusIcon = <CheckCircleIcon className="h-5 w-5 opacity-90" />; 
                             statusColorText = "text-[#1B5E20] dark:text-[#A5D6A7]";
                         }
                         else if (itemScore > 0) { 
                             cardStyle = "bg-[#FFF8E1] dark:bg-[#4D4000] text-[#5C4D00] dark:text-[#FFE082]"; 
                             statusIcon = <CheckCircleIcon className="h-5 w-5 opacity-90" />; 
                             statusColorText = "text-[#5C4D00] dark:text-[#FFE082]";
                         }
                         else { 
                             cardStyle = "bg-[#FFDAD6] dark:bg-[#410002] text-[#410002] dark:text-[#FFB4AB]"; 
                             statusIcon = <XCircleIcon className="h-5 w-5 opacity-90" />; 
                             statusColorText = "text-[#410002] dark:text-[#FFB4AB]";
                         }
                    }

                    return (
                        <div key={index} className={`p-4 sm:p-6 rounded-[28px] sm:rounded-[32px] transition-colors ${cardStyle}`}>
                            
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">
                                    {numLabel}
                                </span>
                                <span className={`text-[12px] font-bold opacity-90 ${statusColorText}`}>
                                    {answer.status === 'graded' || answer.status === 'pending_review' ? `${itemScore} / ` : ''}{answer.points} pts
                                </span>
                            </div>

                            <div className="flex gap-3 mb-4 sm:mb-5">
                                <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>
                                <div className="font-semibold text-[14px] sm:text-[16px] leading-relaxed opacity-90">
                                    <ContentRenderer text={answer.questionText || "Question text missing"} />
                                </div>
                            </div>

                            <div className="pl-0 sm:pl-8 space-y-3">
                                {answer.questionType === 'essay' ? (
                                    <>
                                        <div className={`p-4 rounded-[24px] ${innerTonalStyle} text-[14px] leading-relaxed opacity-90`}>
                                            <p className='font-bold text-[11px] uppercase tracking-widest opacity-70 mb-2'>Your Answer</p>
                                            <ContentRenderer text={answer.selectedAnswer || "(No answer provided)"} />
                                        </div>
                                        
                                        {answer.status === 'graded' && answer.aiGradingResult && (
                                            <div className={`mt-3 p-4 sm:p-5 rounded-[24px] ${innerTonalStyle} text-[14px]`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-bold opacity-90">AI Assessment</span>
                                                    <span className="text-[12px] font-bold bg-white/30 dark:bg-black/30 px-3 py-1.5 rounded-full">
                                                        {itemScore}/{answer.points} pts
                                                    </span>
                                                </div>
                                                {(answer.aiGradingResult.scores || []).map((crit, idx) => (
                                                     <div key={idx} className="mb-3 last:mb-0">
                                                        <p className="font-semibold text-[14px] opacity-90">{crit.criteria} <span className="font-normal opacity-70 text-[12px]">({crit.pointsAwarded}pts)</span></p>
                                                        <p className="text-[13px] opacity-80 mt-0.5 leading-snug">{crit.justification}</p>
                                                    </div>
                                                ))}
                                                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                                                    <p className="text-[14px] italic font-medium opacity-90">"{answer.aiGradingResult.overallFeedback}"</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : answer.questionType === 'matching-type' ? (
                                    <div className="space-y-2 mt-2">
                                        {(answer.prompts || []).map(p => {
                                            const isPairCorrect = p.userAnswerId === p.correctAnswerId;
                                            // Explicitly color the inner matching pairs using Tonal specs
                                            const pairBg = isPairCorrect 
                                                ? 'bg-[#C8E6C9]/60 dark:bg-[#1B5E20]/40 text-[#1B5E20] dark:text-[#A5D6A7]' 
                                                : 'bg-[#FFDAD6]/60 dark:bg-[#93000A]/40 text-[#410002] dark:text-[#FFB4AB]';
                                                
                                            return (
                                                <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-[20px] ${pairBg}`}>
                                                    <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                                                        {isPairCorrect ? <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 sm:mt-0 opacity-90"/> : <XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 sm:mt-0 opacity-90"/>}
                                                        <span className="text-[14px] font-medium opacity-90">{p.text}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:items-end pl-8 sm:pl-0 text-[13px] sm:text-[14px]">
                                                        <span className="font-bold">{p.userAnswerText || '(No answer)'}</span>
                                                        {!isPairCorrect && <span className="font-medium mt-1 opacity-80">Correct: {p.correctAnswerText}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className={`flex-1 p-4 rounded-[24px] ${innerTonalStyle}`}>
                                                <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest mb-1.5">Your Answer</p>
                                                <p className="font-semibold text-[14px] sm:text-[15px] opacity-90">{displayBoolean(String(answer.selectedAnswer ?? ''))}</p>
                                            </div>
                                            {(answer.status === 'graded' || answer.status === 'pending_review') && !answer.isCorrect && (
                                                <div className="flex-1 p-4 rounded-[24px] bg-[#E8F5E9]/80 dark:bg-[#0D3020]/80 text-[#1B5E20] dark:text-[#A5D6A7]">
                                                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5 opacity-80">Correct Answer</p>
                                                    <p className="font-semibold text-[14px] sm:text-[15px]">{displayBoolean(String(answer.correctAnswer ?? ''))}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(answer.status === 'graded' || answer.status === 'pending_review') && answer.explanation && (
                                    <div className={`mt-4 p-4 rounded-[24px] ${innerTonalStyle} flex flex-col sm:flex-row gap-3 text-[13px] sm:text-[14px] opacity-90`}>
                                        <div className="flex items-center gap-2 sm:hidden">
                                            <InformationCircleIcon className="h-5 w-5 opacity-80" />
                                            <span className="font-bold">Explanation</span>
                                        </div>
                                        <InformationCircleIcon className="hidden sm:block h-6 w-6 flex-shrink-0 opacity-80" />
                                        <div>
                                            <span className="hidden sm:block font-bold mb-1">Explanation</span>
                                            <ContentRenderer text={answer.explanation}/>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer with Mobile Safe Area Padding */}
            <div className="flex-shrink-0 p-4 sm:p-0 sm:pt-6 sm:mt-2 bg-[#F8F9FA] dark:bg-[#131314] z-10 w-full border-t border-[#E1E6EB] dark:border-[#44474A] sm:border-none">
                <MaterialTonalButton 
                    onClick={() => {
                        setShowReview(false);
                        setSubmissionToReview(null);
                    }} 
                >
                    Back to Results
                </MaterialTonalButton>
            </div>
        </MaterialContainer>
    );
}