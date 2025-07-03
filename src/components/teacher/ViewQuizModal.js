import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import Spinner from '../common/Spinner';

export default function ViewQuizModal({ isOpen, onClose, quiz, userProfile, classId }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [attemptsTaken, setAttemptsTaken] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSubmission = useCallback(async () => {
    if (!quiz?.id || !userProfile?.id || !classId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const submissionsRef = collection(db, 'quizSubmissions');
    const q = query(
      submissionsRef,
      where("quizId", "==", quiz.id),
      where("studentId", "==", userProfile.id),
      where("classId", "==", classId)
    );

    const querySnapshot = await getDocs(q);
    const submissions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    submissions.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)); // newest first

    setLatestSubmission(submissions[0] || null);
    setAttemptsTaken(submissions.length);
    setLoading(false);
  }, [quiz, userProfile, classId]);

  useEffect(() => {
    if (isOpen) {
      setCurrentQ(0);
      setUserAnswers({});
      setScore(null);
      fetchSubmission();
    }
  }, [isOpen, fetchSubmission]);

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const hasAttemptsLeft = attemptsTaken < 3;

  const handleSubmit = async () => {
    if (!hasAttemptsLeft) {
      alert("You have already used all 3 attempts.");
      return;
    }

    let correctCount = 0;
    questions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (q.type === 'multipleChoice' && userAnswer === q.correctAnswerIndex) correctCount++;
      else if (q.type === 'exactAnswer') {
        const formattedUserAnswer = String(userAnswer || '')
          .toLowerCase()
          .trim()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        const formattedCorrectAnswer = String(q.correctAnswer || '')
          .toLowerCase()
          .trim();
        if (formattedUserAnswer === formattedCorrectAnswer) correctCount++;
      }
    });

    const newAttempt = attemptsTaken + 1;
    setScore(correctCount);

    try {
      const submissionRef = doc(collection(db, 'quizSubmissions'));
      await setDoc(submissionRef, {
        quizId: quiz.id,
        quizTitle: quiz.title,
        studentId: userProfile.id,
        studentName: `${userProfile.firstName} ${userProfile.lastName}`,
        classId: classId,
        score: correctCount,
        totalItems: totalQuestions,
        attemptNumber: newAttempt,
        submittedAt: serverTimestamp(),
      });

      await fetchSubmission();
    } catch (error) {
      console.error("Error saving submission:", error);
    }
  };

  const renderQuestion = () => {
    const question = questions[currentQ];
    return (
      <div>
        <p className="font-medium mb-4">{question.question}</p>
        {question.type === 'multipleChoice' ? (
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <div
                key={idx}
                onClick={() => setUserAnswers({ ...userAnswers, [currentQ]: idx })}
                className={`w-full p-4 rounded-lg border transition-all cursor-pointer
                  ${userAnswers[currentQ] === idx
                    ? 'bg-blue-100 border-blue-500 text-blue-900 font-semibold'
                    : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-800'}
                `}
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
    const attemptsLeft = 3 - attemptsTaken;
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

  const renderLockedView = () => {
    return (
      <div className="text-center p-8">
        <LockClosedIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <Title>No Attempts Remaining</Title>
        <p className="text-lg mt-2 text-gray-600">You have used all 3 of your attempts for this quiz.</p>
        <p className="text-2xl font-bold mt-4">Your last score was {latestSubmission?.score} out of {latestSubmission?.totalItems}</p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} static={true} className="z-[100]">
      <DialogPanel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <Title className="mb-4">{quiz.title}</Title>
        <div className="min-h-[250px]">
          {loading ? <Spinner /> : (
            !hasAttemptsLeft ? renderLockedView() :
              (score === null ? renderQuestion() : renderResults())
          )}
        </div>
        {hasAttemptsLeft && score === null && (
          <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t">
            <Button icon={ArrowLeftIcon} onClick={() => setCurrentQ(currentQ - 1)} disabled={currentQ === 0}>Previous</Button>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-600">{`Question ${currentQ + 1} of ${totalQuestions}`}</span>
              <span className="block text-xs text-gray-500">Attempt {attemptsTaken + 1} of 3</span>
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
