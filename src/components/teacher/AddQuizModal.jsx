import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Title } from '@tremor/react';
import { PlusCircleIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'identification', label: 'Identification' },
  { value: 'matching-type', label: 'Matching Type' },
];

// --- Neumorphic Style Helpers (from AiQuizModal) ---

// Styles for segmented controls (True/False buttons)
const getSegmentedButtonClasses = (isActive) => {
    const baseClasses = "flex-1 rounded-lg py-2.5 px-3 text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 ring-offset-2 ring-offset-slate-200 ring-sky-500";
    if (isActive) {
        return `${baseClasses} bg-slate-200 text-sky-600 shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] scale-100`;
    }
    return `${baseClasses} bg-transparent text-slate-600 hover:bg-slate-200/50`;
};

// Styles for inset inputs
const inputBaseStyles = "bg-slate-200 rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 border-none";

// Styles for extruded buttons
const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200";
const btnExtruded = `shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]`;
const btnDisabled = "disabled:opacity-60 disabled:text-slate-500 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]";

// Simple unique ID generator for matching type
const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

// --------------------------------------------------


export default function AddQuizModal({ isOpen, onClose, unitId, subjectId }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { 
        text: '', 
        type: 'multiple-choice', 
        points: 1,
        options: ['', '', '', ''], 
        correctAnswerIndex: 0,
        explanation: '' 
      }
    ]);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    const oldQuestion = newQuestions[index];
    
    let newQuestion = { ...oldQuestion, [field]: value };

    // If the type is changing, reset the answer fields
    if (field === 'type') {
        const oldType = oldQuestion.type;
        if (value !== oldType) {
            // Clear old answer fields
            delete newQuestion.options;
            delete newQuestion.correctAnswerIndex;
            delete newQuestion.correctAnswer;
            delete newQuestion.prompts;
            delete newQuestion.correctPairs;
            
            // Add new default answer fields
            switch (value) {
                case 'multiple-choice':
                    newQuestion.options = ['', '', '', ''];
                    newQuestion.correctAnswerIndex = 0;
                    break;
                case 'true-false':
                    newQuestion.correctAnswer = true;
                    break;
                case 'identification':
                    newQuestion.correctAnswer = '';
                    break;
                case 'matching-type':
                    newQuestion.prompts = [{ id: uniqueId(), text: '' }];
                    newQuestion.options = [{ id: uniqueId(), text: '' }, { id: uniqueId(), text: '' }];
                    newQuestion.correctPairs = {};
                    // Auto-set points to 1 to match new prompt
                    newQuestion.points = 1; 
                    break;
                default:
                  break;
            }
        }
    }
    
    newQuestions[index] = newQuestion;
    setQuestions(newQuestions);
  };

  // --- Handlers for Multiple Choice ---
  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    if (!newQuestions[qIndex].options) {
      newQuestions[qIndex].options = ['', '', '', ''];
    }
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  // --- Handlers for Matching Type ---
  const handleMatchingSubItemChange = (qIndex, itemType, itemIndex, newText) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    question[itemType][itemIndex].text = newText;
    setQuestions(newQuestions);
  };

  const handleAddMatchingSubItem = (qIndex, itemType) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    question[itemType].push({ id: uniqueId(), text: '' });
    
    // If adding a prompt, update points to match
    if (itemType === 'prompts') {
        question.points = question.prompts.length;
    }
    setQuestions(newQuestions);
  };

  const handleRemoveMatchingSubItem = (qIndex, itemType, itemIndex) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    const removedItem = question[itemType][itemIndex];
    question[itemType] = question[itemType].filter((_, i) => i !== itemIndex);
    
    if (itemType === 'prompts') {
        // If removing a prompt, remove its pair and update points
        delete question.correctPairs[removedItem.id];
        question.points = question.prompts.length;
    } else {
        // If removing an option, clear any pairs pointing to it
        for (const promptId in question.correctPairs) {
            if (question.correctPairs[promptId] === removedItem.id) {
                question.correctPairs[promptId] = ''; // Reset the pair
            }
        }
    }
    setQuestions(newQuestions);
  };

  const handlePairChange = (qIndex, promptId, optionId) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    question.correctPairs[promptId] = optionId;
    setQuestions(newQuestions);
  };
  // ---------------------------------
  
  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAddQuiz = async () => {
    if (!title.trim()) return setError('Quiz title cannot be empty.');
    if (questions.length === 0) return setError('Please add at least one question.');
    
    let currentQuestionNumber = 1;

    // Validate each question
    for (const q of questions) {
      const points = Number(q.points) || 1;
      const endNum = currentQuestionNumber + points - 1;
      const qLabel = points === 1 ? `Question ${currentQuestionNumber}` : `Questions ${currentQuestionNumber}-${endNum}`;

      if (!q.text.trim()) {
        return setError(`${qLabel}: must have text (or an instruction).`);
      }
      if (q.type === 'multiple-choice') {
        if (q.options.some(opt => !opt.trim())) {
          return setError(`${qLabel}: All multiple choice options must be filled in.`);
        }
      } else if (q.type === 'identification') {
        if (typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) {
           return setError(`${qLabel}: (Identification) must have a correct answer.`);
        }
      } else if (q.type === 'matching-type') {
          if (q.points !== q.prompts.length) {
            return setError(`${qLabel}: (Matching) Number of points (${q.points}) must match the number of prompts (${q.prompts.length}). Adjust points or add/remove prompts.`);
          }
          if (q.prompts.some(p => !p.text.trim())) {
             return setError(`${qLabel}: (Matching) All prompts must have text.`);
          }
          if (q.options.some(o => !o.text.trim())) {
             return setError(`${qLabel}: (Matching) All options must have text.`);
          }
          if (q.options.length <= q.prompts.length) {
             return setError(`${qLabel}: (Matching) must have at least one distractor (more options than prompts).`);
          }
          if (Object.keys(q.correctPairs).length !== q.prompts.length || Object.values(q.correctPairs).some(val => !val)) {
             return setError(`${qLabel}: (Matching) All prompts must be paired with an answer.`);
          }
      }
      currentQuestionNumber += points;
    }
    
    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'quizzes'), {
        title,
        unitId,
        subjectId,
        questions,
        createdAt: serverTimestamp(),
        createdBy: 'manual'
      });
      handleClose();
    } catch (err) {
      console.error("Error adding quiz:", err);
      setError("Failed to add quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setQuestions([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} static={true} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* MODIFICATION: Changed to max-w-7xl for near-full-screen width */}
        <DialogPanel className="max-w-7xl w-full bg-slate-200 rounded-3xl shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] flex flex-col max-h-[90vh] transition-all relative">
          
          <button onClick={handleClose} className={`absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 ${btnExtruded}`}>
            <XMarkIcon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 overflow-y-auto p-8 pt-12 space-y-6">
            
            <div className="text-center">
              <Title className="mt-4 text-2xl font-bold text-slate-800">Add New Quiz</Title>
            </div>

            <div className="p-5 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff] space-y-3">
              <label className="block text-sm font-medium text-slate-700">Quiz Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 1 Review"
                className={`w-full ${inputBaseStyles} py-2.5 px-3`}
              />
            </div>

            <h3 className="text-lg font-medium text-slate-800 border-t border-slate-300/70 pt-4">Questions</h3>
            
            <div className="space-y-4">
              {questions.map((q, qIndex) => {
                // --- NEW: Dynamic Question Numbering Logic ---
                const startNumber = questions.slice(0, qIndex).reduce((sum, currentQ) => sum + (Number(currentQ.points) || 1), 1);
                const points = Number(q.points) || 1;
                const endNumber = startNumber + points - 1;
                const questionLabel = points === 1 ? `Question ${startNumber}` : `Questions ${startNumber}-${endNumber}`;
                // ---------------------------------------------

                return (
                  <div key={qIndex} className="p-5 rounded-2xl bg-slate-200 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] space-y-4 relative">
                    
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-800 text-lg">{questionLabel}</label>
                      <button onClick={() => handleRemoveQuestion(qIndex)} className={`h-9 w-9 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff]`}>
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <textarea
                      value={q.text}
                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                      placeholder={q.type === 'matching-type' ? "Enter the instruction (e.g., Match Column A...)" : "Enter the question text"}
                      className={`w-full min-h-[80px] text-sm ${inputBaseStyles} p-3`}
                      rows={3}
                    />
                    
                    {/* --- NEW: Question Config Row (Type & Points) --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* --- MODIFIED: Question Type Dropdown --- */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Question Type</label>
                        <select
                          value={q.type}
                          onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                          className={`w-full ${inputBaseStyles} py-2.5 px-3 text-sm appearance-none`}
                        >
                          {questionTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* --- NEW: Points Input --- */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Points</label>
                        <input
                          type="number"
                          value={q.points}
                          // Disable points input for matching type as it's auto-calculated
                          disabled={q.type === 'matching-type'}
                          onChange={(e) => handleQuestionChange(qIndex, 'points', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-full ${inputBaseStyles} py-2.5 px-3 text-sm ${q.type === 'matching-type' ? 'opacity-70' : ''}`}
                          min={1}
                        />
                      </div>
                    </div>
                    
                    {/* --- Answer Inputs (Conditional) --- */}
                    <div className="pt-2 pl-4 border-l-2 border-slate-300 space-y-3">
                      
                      {q.type === 'multiple-choice' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-700">Options (Select the correct one):</p>
                          {(q.options || []).map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name={`correct-answer-${qIndex}`} 
                                checked={q.correctAnswerIndex === oIndex}
                                onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)}
                                className="form-radio h-5 w-5 text-sky-500 bg-slate-200 border-none shadow-[inset_1px_1px_2px_#bdc1c6,inset_-1px_-1px_2px_#ffffff] focus:ring-sky-500 focus:ring-1"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                placeholder={`Option ${oIndex + 1}`}
                                className={`w-full ${inputBaseStyles} py-2 px-3 text-sm`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'true-false' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Correct Answer:</p>
                          <div className={`flex space-x-1 p-1 rounded-xl ${inputBaseStyles} max-w-xs`}>
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(qIndex, 'correctAnswer', true)}
                              className={getSegmentedButtonClasses(q.correctAnswer === true)}
                            >
                              True
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(qIndex, 'correctAnswer', false)}
                              className={getSegmentedButtonClasses(q.correctAnswer === false)}
                            >
                              False
                            </button>
                          </div>
                        </div>
                      )}

                      {q.type === 'identification' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Correct Answer:</p>
                          <input
                            type="text"
                            value={q.correctAnswer || ''}
                            onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                            placeholder="Enter the exact answer"
                            className={`w-full ${inputBaseStyles} py-2.5 px-3`}
                          />
                        </div>
                      )}

                      {q.type === 'matching-type' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Column A: Prompts */}
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700">Column A (Prompts) - {q.prompts.length} items</p>
                            {q.prompts.map((prompt, pIndex) => (
                              <div key={prompt.id} className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600 text-sm w-5 text-center">{pIndex + 1}.</span>
                                <input
                                  type="text"
                                  value={prompt.text}
                                  onChange={(e) => handleMatchingSubItemChange(qIndex, 'prompts', pIndex, e.target.value)}
                                  placeholder={`Prompt ${pIndex + 1}`}
                                  className={`w-full ${inputBaseStyles} py-2 px-3 text-sm`}
                                />
                                <select
                                  value={q.correctPairs[prompt.id] || ''}
                                  onChange={(e) => handlePairChange(qIndex, prompt.id, e.target.value)}
                                  className={`w-40 ${inputBaseStyles} py-2 px-3 text-sm appearance-none`}
                                >
                                  <option value="" disabled>Select Match</option>
                                  {q.options.map((opt, oIndex) => (
                                    <option key={opt.id} value={opt.id}>Option {String.fromCharCode(97 + oIndex)}</option>
                                  ))}
                                </select>
                                <button onClick={() => handleRemoveMatchingSubItem(qIndex, 'prompts', pIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}>
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            <button onClick={() => handleAddMatchingSubItem(qIndex, 'prompts')} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}>
                              <PlusCircleIcon className="h-4 w-4 mr-1" /> Add Prompt
                            </button>
                          </div>

                          {/* Column B: Options */}
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700">Column B (Options) - {q.options.length} items</p>
                            {q.options.map((option, oIndex) => (
                              <div key={option.id} className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600 text-sm w-8 text-center">{String.fromCharCode(97 + oIndex)}.</span>
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => handleMatchingSubItemChange(qIndex, 'options', oIndex, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(97 + oIndex)}`}
                                  className={`w-full ${inputBaseStyles} py-2 px-3 text-sm`}
                                />
                                <button onClick={() => handleRemoveMatchingSubItem(qIndex, 'options', oIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}>
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            <button onClick={() => handleAddMatchingSubItem(qIndex, 'options')} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}>
                              <PlusCircleIcon className="h-4 w-4 mr-1" /> Add Option (Distractor)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3">
                      <label className="text-sm font-medium text-slate-700">Rationale / Explanation (Optional)</label>
                      <textarea
                        value={q.explanation || ''}
                        onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                        placeholder="Explain why the answer is correct..."
                        className={`w-full min-h-[60px] text-sm ${inputBaseStyles} p-3 mt-1.5`}
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded} w-auto self-start`}
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Question
            </button>
          </div>

          <div className="flex-shrink-0 px-6 py-5 bg-slate-200/50 border-t border-slate-300/70">
            {error && <p className="text-sm text-red-800 mb-4 text-center bg-red-200 p-3 rounded-lg shadow-[inset_1px_1px_2px_#d1d9e8,inset_-1px_-1px_2px_#ffffff]">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded} ${btnDisabled}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddQuiz}
                disabled={loading}
                className={`${btnBase} bg-sky-500 hover:bg-sky-600 text-white ${btnExtruded} ${btnDisabled}`}
              >
                {loading ? 'Adding Quiz...' : 'Add Quiz'}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}