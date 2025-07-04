import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import Spinner from '../common/Spinner';

export default function ViewQuizModal({ isOpen, onClose, quiz, userProfile, classId }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [attemptsTaken, setAttemptsTaken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [warnings, setWarnings] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const hasSubmitted = useRef(false);

  useEffect(() => {
    const handleFocusLoss = async () => {
      if (!isOpen || hasSubmitted.current || isLocked || !classId) {
        return;
      }
      const newWarningCount = warnings + 1;
      setWarnings(newWarningCount);
      if (newWarningCount >= 3) {
        alert("Warning 3: Your quiz has been locked due to multiple warnings. Please contact your teacher.");
        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
        await setDoc(lockRef, {
            quizId: quiz.id,
            studentId: userProfile.id,
            studentName: `${userProfile.firstName} ${userProfile.lastName}`,
            classId: classId,
            lockedAt: serverTimestamp(),
        });
        setIsLocked(true);
      } else {
        alert(`Warning ${newWarningCount}: Navigating away from the quiz is not allowed.`);
      }
    };
    window.addEventListener('blur', handleFocusLoss);
    return () => window.removeEventListener('blur', handleFocusLoss);
  }, [isOpen, warnings, isLocked, quiz, userProfile, classId]);

  const fetchQuizStatus = useCallback(async () => {
    if (!quiz?.id || !userProfile?.id) {
        setLoading(false);
        return;
    };
    if (classId) {
        setLoading(true);
        const lockRef = doc(db, 'quizLocks', `${quiz.id}_${userProfile.id}`);
        const lockSnap = await getDoc(lockRef);
        if (lockSnap.exists()) {
          setIsLocked(true);
        }
        const submissionsRef = collection(db, 'quizSubmissions');
        const q = query(
          submissionsRef,
          where("quizId", "==", quiz.id),
          where("studentId", "==", userProfile.id),
          where("classId", "==", classId)
        );
        const querySnapshot = await getDocs(q);
        const submissions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        submissions.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        setLatestSubmission(submissions[0] || null);
        setAttemptsTaken(submissions.length);
        setLoading(false);
    } else {
        // Teacher preview mode, no need to fetch submissions or locks
        setLoading(false);
    }
  }, [quiz, userProfile, classId]);

  useEffect(() => {
    if (isOpen) {
      setCurrentQ(0);
      setUserAnswers({});
      setScore(null);
      setWarnings(0);
      setIsLocked(false);
      hasSubmitted.current = false;
      fetchQuizStatus();
    }
  }, [isOpen, fetchQuizStatus]);

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const hasAttemptsLeft = classId ? attemptsTaken < 3 : true; 

  const handleSubmit = async () => {
    if (!classId) {
        alert("This is a preview only. Submissions are disabled.");
        return;
    }
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    if (!hasAttemptsLeft) {
      alert("You have already used all 3 attempts.");
      return;
    }
    let correctCount = 0;
    questions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (q.type === 'multipleChoice' && userAnswer === q.correctAnswerIndex) correctCount++;
      else if (q.type === 'exactAnswer') {
        const formattedUserAnswer = String(userAnswer || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        const formattedCorrectAnswer = String(q.correctAnswer || '').toLowerCase().trim();
        if (formattedUserAnswer === formattedCorrectAnswer) correctCount++;
      }
    });
    setScore(correctCount);
    const submissionTime = new Date();
    const wasSubmittedLate = quiz.deadline && submissionTime > new Date(quiz.deadline);
    try {
      const submissionRef = doc(collection(db, 'quizSubmissions'));
      await setDoc(submissionRef, {
        quizId: quiz.id, quizTitle: quiz.title, studentId: userProfile.id,
        studentName: `${userProfile.firstName} ${userProfile.lastName}`, classId: classId,
        score: correctCount, totalItems: totalQuestions, attemptNumber: attemptsTaken + 1,
        submittedAt: serverTimestamp(), isLate: wasSubmittedLate, status: 'completed',
      });
      await fetchQuizStatus();
    } catch (error) {
      console.error("Error saving submission:", error);
    }
  };
  
  const renderSystemLockedView = () => (
    <div className="text-center p-8">
        <LockClosedIcon className="h-16 w-16 text-gray-700 mx-auto mb-4" />
        <Title>Quiz Locked</Title>
        <p className="text-lg mt-2 text-gray-600">This quiz has been locked due to multiple warnings.</p>
        <p className="text-md mt-1 text-gray-600">Please contact your teacher to have it unlocked.</p>
    </div>
  );

  const renderQuestion = () => {
    const question = questions[currentQ];
    return (
      <div>
        {/* --- THIS IS THE FIX --- */}
        {/* It now reads 'question.text' instead of 'question.question' */}
        <p className="font-medium mb-4">{question.text}</p>
        
        {question.type === 'multipleChoice' ? (
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <div
                key={idx}
                onClick={() => setUserAnswers({ ...userAnswers, [currentQ]: idx })}
                className={`w-full p-4 rounded-lg border transition-all cursor-pointer ${userAnswers[currentQ] === idx ? 'bg-blue-100 border-blue-500 text-blue-900 font-semibold' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-800'}`}
              >
                {option}
              </div>
            ))}
          </div>
        ) : (
          <TextInput
            placeholder="Type your answer"
            value={userAnswers[currentQ] || ''}
            onChange={e => setUserAnswers({ ...userAnswers, [currentQ]: e.target.value })}
          />
        )}
      </div>
    );
  };

  const renderResults = () => {
    const attemptsLeft = 3 - (attemptsTaken);
    return (
      <div className="text-center p-6">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <Title className="text-2xl font-bold">Quiz Submitted!</Title>
        <p className="text-lg mt-2">You scored <strong>{score}</strong> out of <strong>{totalQuestions}</strong></p>
        {attemptsLeft > 0 ? (
          <p className="text-md mt-4 text-gray-700">You have <strong>{attemptsLeft}</strong> attempt(s) left.</p>
        ) : (
          <p className="text-md mt-4 text-red-600 font-semibold">You have used all 3 attempts.</p>
        )}
      </div>
    );
  };
  
  const renderNoAttemptsLeftView = () => (
     <div className="text-center p-8">
        <LockClosedIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <Title>No Attempts Remaining</Title>
        <p className="text-lg mt-2 text-gray-600">You have used all 3 of your attempts for this quiz.</p>
        <p className="text-2xl font-bold mt-4">Your last score was {latestSubmission?.score} out of {latestSubmission?.totalItems}</p>
      </div>
  );

  const renderContent = () => {
      if (loading) return <Spinner />;
      if (isLocked) return renderSystemLockedView();
      if (!hasAttemptsLeft && classId) return renderNoAttemptsLeftView();
      if (score !== null) return renderResults();
      return renderQuestion();
  }

  return (
    <Dialog open={isOpen} onClose={onClose} static={true} className="z-[100]">
      <DialogPanel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-between items-start">
            <Title className="mb-4">{quiz.title}</Title>
            {classId && !isLocked && hasAttemptsLeft && score === null && (
                 <div className="flex items-center gap-2 text-yellow-600 bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full">
                    <ShieldExclamationIcon className="w-5 h-5"/>
                    <span className="text-sm font-medium">Warnings: {warnings} / 3</span>
                </div>
            )}
        </div>
        <div className="min-h-[250px]">
          {renderContent()}
        </div>
        {hasAttemptsLeft && score === null && !isLocked && (
          <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t">
            <Button icon={ArrowLeftIcon} onClick={() => setCurrentQ(currentQ - 1)} disabled={currentQ === 0}>Previous</Button>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-600">{`Question ${currentQ + 1} of ${totalQuestions}`}</span>
              {classId && <span className="block text-xs text-gray-500">Attempt {attemptsTaken + 1} of 3</span>}
            </div>
            {currentQ < totalQuestions - 1 ? (
              <Button icon={ArrowRightIcon} iconPosition="right" onClick={() => setCurrentQ(currentQ + 1)}>Next</Button>
            ) : (
              <Button onClick={handleSubmit}>Submit Quiz</Button>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}