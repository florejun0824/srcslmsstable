import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title } from '@tremor/react';
import { PlusCircleIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'identification', label: 'Identification' },
  { value: 'matching-type', label: 'Matching Type' },
  { value: 'essay', label: 'Essay' }, // --- NEW ---
];

// --- Neumorphic Style Helpers ---
const getSegmentedButtonClasses = (isActive) => {
    const baseClasses = "flex-1 rounded-lg py-2.5 px-3 text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 ring-offset-2 ring-offset-slate-200 ring-sky-500";
    if (isActive) {
        return `${baseClasses} bg-slate-200 text-sky-600 shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] scale-100`;
    }
    return `${baseClasses} bg-transparent text-slate-600 hover:bg-slate-200/50`;
};
const inputBaseStyles = "bg-slate-200 rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 border-none";
const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200";
const btnExtruded = `shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]`;
const btnDisabled = "disabled:opacity-60 disabled:text-slate-500 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]";
const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;
// ---------------------------------

export default function QuizFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialQuizData,
    modalTitle,
    submitText,
    loading // Receive loading state from parent
}) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');

  // --- Populate form state from initialQuizData ---
  useEffect(() => {
    if (isOpen) {
        if (initialQuizData) {
            // Editing: Populate state from the quiz data
            setTitle(initialQuizData.title || '');
            // Ensure all questions have default fields
            const populatedQuestions = (initialQuizData.questions || []).map(q => ({
                text: '',
                points: 1,
                explanation: '',
                options: [], // Default empty array for MC
                prompts: [], // Default empty array for Matching
                correctPairs: {}, // Default empty object for Matching
                rubric: [], // --- NEW: Add default rubric field ---
                ...q // Spread the existing quiz data over the defaults
            }));
            setQuestions(populatedQuestions);
        } else {
            // Adding: Reset to empty state
            setTitle('');
            setQuestions([]);
        }
        setError(''); // Clear error on open
    }
  }, [isOpen, initialQuizData]);

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

    if (field === 'type') {
        const oldType = oldQuestion.type;
        if (value !== oldType) {
            // Clear fields specific to the old type
            delete newQuestion.options;
            delete newQuestion.correctAnswerIndex;
            delete newQuestion.correctAnswer;
            delete newQuestion.prompts;
            delete newQuestion.correctPairs;
            delete newQuestion.rubric; // --- NEW ---

            // Initialize fields for the new type
            switch (value) {
                case 'multiple-choice':
                    newQuestion.options = ['', '', '', ''];
                    newQuestion.correctAnswerIndex = 0;
                    newQuestion.points = 1; // Reset points for non-calculated types
                    break;
                case 'true-false':
                    newQuestion.correctAnswer = true;
                    newQuestion.points = 1; // Reset points
                    break;
                case 'identification':
                    newQuestion.correctAnswer = '';
                    newQuestion.points = 1; // Reset points
                    break;
                case 'matching-type':
                    newQuestion.prompts = [{ id: uniqueId(), text: '' }];
                    newQuestion.options = [{ id: uniqueId(), text: '' }, { id: uniqueId(), text: '' }];
                    newQuestion.correctPairs = {};
                    newQuestion.points = 1; // Points auto-update based on prompts later
                    break;
                // --- NEW: Essay case ---
                case 'essay':
                    // Initialize with default rubric and calculate points
                    newQuestion.rubric = [{ id: uniqueId(), criteria: 'Clarity of Answer', points: 5 }, { id: uniqueId(), criteria: 'Relevance to Topic', points: 5 }];
                    newQuestion.points = 10; // Sum of default rubric points
                    break;
                // --- END NEW ---
                default:
                    newQuestion.points = 1; // Default points if type is unknown
                  break;
            }
        }
    }

    // --- NEW: Auto-update points for Essay based on rubric ---
    // Make sure this check happens *after* the type switch logic
    // We check the type *of the potentially updated question*
    if (newQuestion.type === 'essay' && field !== 'points') {
        const rubricTotal = (newQuestion.rubric || []).reduce((sum, item) => sum + (Number(item.points) || 0), 0);
        // Only update points if the rubric calculation resulted in a change
        if (newQuestion.points !== rubricTotal) {
           newQuestion.points = rubricTotal;
        }
    }

    newQuestions[index] = newQuestion;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    let optionsArray = newQuestions[qIndex].options; // Use let for potential reassignment

    if (!optionsArray) {
      optionsArray = ['', '', '', '']; // Safeguard initialization
    }

    const currentOption = optionsArray[oIndex];

    // Ensure optionsArray is mutable if it came directly from state/props
    optionsArray = [...optionsArray];

    if (typeof currentOption === 'object' && currentOption !== null) {
        // AI-style quiz option: { text: "...", ... }
        optionsArray[oIndex] = { ...currentOption, text: value };
    } else {
        // Manual-style quiz option: "..." or potentially undefined/null if array was short
        optionsArray[oIndex] = value;
    }

    newQuestions[qIndex].options = optionsArray;
    setQuestions(newQuestions);
  };

   // --- NEW: Rubric Handlers ---
  const handleRubricChange = (qIndex, rIndex, field, value) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];

    // Create a mutable copy of the rubric
    const updatedRubric = [...(question.rubric || [])];

    // Update the specific field
    updatedRubric[rIndex] = { ...updatedRubric[rIndex], [field]: value };

    question.rubric = updatedRubric; // Assign the updated array back

    // Auto-update total points when rubric points change
    if (field === 'points') {
        const rubricTotal = question.rubric.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
        question.points = rubricTotal; // Update the question's points directly
    }

    setQuestions(newQuestions); // Update the state
  };

  const handleAddRubricItem = (qIndex) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    // Ensure rubric exists before pushing
    const currentRubric = question.rubric || [];
    question.rubric = [...currentRubric, { id: uniqueId(), criteria: '', points: 0 }];
    // Points will auto-update via handleRubricChange if points are added later
    setQuestions(newQuestions);
  };

  const handleRemoveRubricItem = (qIndex, rIndex) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];

    // Filter out the item immutably
    question.rubric = (question.rubric || []).filter((_, i) => i !== rIndex);

    // Auto-update total points after removal
    const rubricTotal = question.rubric.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
    question.points = rubricTotal;

    setQuestions(newQuestions);
  };
  // --- END NEW ---

  const handleMatchingSubItemChange = (qIndex, itemType, itemIndex, newText) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
     // Ensure the array exists and create a mutable copy
    const updatedItems = [...(question[itemType] || [])];
    // Ensure the item exists
    if(updatedItems[itemIndex]) {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], text: newText };
        question[itemType] = updatedItems;
        setQuestions(newQuestions);
    }
  };

  const handleAddMatchingSubItem = (qIndex, itemType) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
     // Ensure the array exists before pushing
    const currentItems = question[itemType] || [];
    question[itemType] = [...currentItems, { id: uniqueId(), text: '' }];

    if (itemType === 'prompts') {
        // Auto-update points to match number of prompts
        question.points = question[itemType].length;
    }
    setQuestions(newQuestions);
  };

  const handleRemoveMatchingSubItem = (qIndex, itemType, itemIndex) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    if (!question[itemType]) return; // Guard if array doesn't exist

    const removedItem = question[itemType][itemIndex];
    question[itemType] = question[itemType].filter((_, i) => i !== itemIndex);

    if (itemType === 'prompts') {
        // Delete the corresponding pair and update points
        if(question.correctPairs) {
           delete question.correctPairs[removedItem.id];
        }
        question.points = question[itemType].length; // Update points
    } else {
         // If removing an option, clear any pairs pointing to it
        if(question.correctPairs){
            for (const promptId in question.correctPairs) {
                if (question.correctPairs[promptId] === removedItem.id) {
                    question.correctPairs[promptId] = ''; // Reset the pair
                }
            }
        }
    }
    setQuestions(newQuestions);
  };

  const handlePairChange = (qIndex, promptId, optionId) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    // Ensure correctPairs exists
    const currentPairs = question.correctPairs || {};
    question.correctPairs = { ...currentPairs, [promptId]: optionId };
    setQuestions(newQuestions);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) return setError('Quiz title cannot be empty.');
    if (questions.length === 0) return setError('Please add at least one question.');

    let currentQuestionNumber = 1;

    // --- Validation Loop ---
    for (const q of questions) {
      const points = Number(q.points) || 0; // Use 0 if points aren't set yet
      // Calculate start/end numbers based on previous questions' points
      const startNum = questions.slice(0, questions.indexOf(q)).reduce((sum, prevQ) => sum + (Number(prevQ.points) || 1), 1);
      const endNum = startNum + points - 1;
      const qLabel = points === 1 ? `Question ${startNum}` : `Questions ${startNum}-${endNum}`;


      if (!q.text.trim()) {
        return setError(`${qLabel}: must have text (or an instruction).`);
      }
      if (points <= 0 && q.type !== 'essay') { // Essays can have 0 points if rubric is empty initially
         return setError(`${qLabel}: Points must be greater than 0.`);
      }


      if (q.type === 'multiple-choice') {
        if (!q.options || q.options.length === 0 || q.options.some(opt => {
            const optionText = (typeof opt === 'object' && opt !== null) ? opt.text : opt;
            return !String(optionText).trim();
        })) {
          return setError(`${qLabel}: All multiple choice options must be filled in.`);
        }
        if (q.correctAnswerIndex === undefined || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
             return setError(`${qLabel}: A correct multiple choice answer must be selected.`);
        }
      } else if (q.type === 'identification') {
        if (typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) {
           return setError(`${qLabel}: (Identification) must have a correct answer.`);
        }
      } else if (q.type === 'matching-type') {
          if(!q.prompts || q.prompts.length === 0) return setError(`${qLabel}: (Matching) must have at least one prompt.`);
          if(!q.options || q.options.length === 0) return setError(`${qLabel}: (Matching) must have at least one option.`);

          if (q.points !== q.prompts.length) {
            return setError(`${qLabel}: (Matching) Number of points (${q.points}) must match the number of prompts (${q.prompts.length}). Add/remove prompts.`);
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
          if (!q.correctPairs || Object.keys(q.correctPairs).length !== q.prompts.length || Object.values(q.correctPairs).some(val => !val)) {
             return setError(`${qLabel}: (Matching) All prompts must be paired with an answer.`);
          }
      // --- NEW: Essay Validation ---
      } else if (q.type === 'essay') {
          if (!q.rubric || q.rubric.length === 0) {
            return setError(`${qLabel}: (Essay) must have at least one rubric criterion.`);
          }
          if (q.rubric.some(r => !r.criteria.trim() || (Number(r.points) || 0) <= 0)) {
            return setError(`${qLabel}: (Essay) All rubric items must have a criteria description and points greater than 0.`);
          }
          const rubricTotal = q.rubric.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
           if (rubricTotal === 0) {
                 return setError(`${qLabel}: (Essay) Total points for the rubric cannot be 0.`);
           }
          if (rubricTotal !== q.points) {
            // This indicates an internal state inconsistency, should ideally not happen
            console.error("Rubric total mismatch validation:", q.points, rubricTotal);
            return setError(`${qLabel}: (Essay) Rubric total (${rubricTotal}) does not match question points (${q.points}). Please adjust rubric points.`);
          }
      }
      // --- END NEW ---
      // Note: currentQuestionNumber logic was removed as startNum/endNum are calculated dynamically now.
    } // End validation loop

    setError('');
    // Pass the clean data up to the parent for submission
    onSubmit({ title, questions });
  };

  const handleClose = () => {
    setTitle('');
    setQuestions([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} static={true} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-7xl w-full bg-slate-200 rounded-3xl shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] flex flex-col max-h-[90vh] transition-all relative">

          {/* Close Button */}
          <button onClick={handleClose} className={`absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 ${btnExtruded}`}>
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 pt-12 space-y-6">

            <div className="text-center">
              <Title className="mt-4 text-2xl font-bold text-slate-800">{modalTitle}</Title>
            </div>

            {/* Quiz Title */}
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

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((q, qIndex) => {
                // Calculate dynamic question numbering
                 const startNumber = questions.slice(0, qIndex).reduce((sum, currentQ) => sum + (Number(currentQ.points) || 1), 1);
                const points = Number(q.points) || 1; // Default to 1 if points not set or 0
                const endNumber = startNumber + Math.max(0, points - 1); // Ensure endNumber >= startNumber
                const questionLabel = points <= 1 ? `Question ${startNumber}` : `Questions ${startNumber}-${endNumber}`;


                return (
                  <div key={qIndex} /* Using index temporarily, consider stable IDs if reordering happens */
                       className="p-5 rounded-2xl bg-slate-200 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] space-y-4 relative">

                    {/* Question Header */}
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-800 text-lg">{questionLabel}</label>
                      <button onClick={() => handleRemoveQuestion(qIndex)} className={`h-9 w-9 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff]`}>
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Question Text */}
                    <textarea
                      value={q.text || ''} // Ensure value is controlled
                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                       placeholder={
                           q.type === 'essay' ? "Enter the essay prompt..." :
                           q.type === 'matching-type' ? "Enter the instruction (e.g., Match Column A...)" :
                           "Enter the question text"
                       }
                      className={`w-full min-h-[80px] text-sm ${inputBaseStyles} p-3`}
                      rows={3}
                    />

                    {/* Question Config Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Type Select */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Question Type</label>
                        <select
                          value={q.type || 'multiple-choice'} // Ensure controlled value
                          onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                          className={`w-full ${inputBaseStyles} py-2.5 px-3 text-sm appearance-none`} // Added appearance-none for custom arrow styling if needed
                        >
                          {questionTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Points Input */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Points</label>
                        <input
                          type="number"
                          value={q.points || 1} // Ensure controlled value, default to 1
                          // Disable for types where points are auto-calculated
                          disabled={q.type === 'matching-type' || q.type === 'essay'}
                          onChange={(e) => handleQuestionChange(qIndex, 'points', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-full ${inputBaseStyles} py-2.5 px-3 text-sm ${q.type === 'matching-type' || q.type === 'essay' ? 'opacity-70 bg-slate-100 cursor-not-allowed' : ''}`} // Added cursor style
                          min={1}
                        />
                         {/* Display auto-calculated points for clarity */}
                         {(q.type === 'matching-type' || q.type === 'essay') && (
                            <p className="text-xs text-slate-500 mt-1">
                                Points auto-calculated based on {q.type === 'matching-type' ? 'prompts' : 'rubric'}.
                            </p>
                         )}
                      </div>
                    </div>

                    {/* Answer Section */}
                    <div className="pt-2 pl-4 border-l-2 border-slate-300 space-y-3">

                      {/* Multiple Choice */}
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
                                value={opt.text || opt || ''} // Handle both object/string, ensure controlled
                                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                placeholder={`Option ${oIndex + 1}`}
                                className={`w-full ${inputBaseStyles} py-2 px-3 text-sm`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* True/False */}
                      {q.type === 'true-false' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Correct Answer:</p>
                          <div className={`flex space-x-1 p-1 rounded-xl ${inputBaseStyles} max-w-xs`}>
                            <button type="button" onClick={() => handleQuestionChange(qIndex, 'correctAnswer', true)} className={getSegmentedButtonClasses(q.correctAnswer === true)}>True</button>
                            <button type="button" onClick={() => handleQuestionChange(qIndex, 'correctAnswer', false)} className={getSegmentedButtonClasses(q.correctAnswer === false)}>False</button>
                          </div>
                        </div>
                      )}

                      {/* Identification */}
                      {q.type === 'identification' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Correct Answer:</p>
                          <input type="text" value={q.correctAnswer || ''} onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)} placeholder="Enter the exact answer" className={`w-full ${inputBaseStyles} py-2.5 px-3`}/>
                        </div>
                      )}

                      {/* Matching Type */}
                       {q.type === 'matching-type' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Column A */}
                          <div className="space-y-3">
                             <p className="text-sm font-medium text-slate-700">Column A (Prompts) - {(q.prompts || []).length} items</p>
                             {(q.prompts || []).map((prompt, pIndex) => (
                              <div key={prompt.id || pIndex} className="flex items-center gap-2"> {/* Fallback key */}
                                <span className="font-semibold text-slate-600 text-sm w-5 text-center">{pIndex + 1}.</span>
                                <input type="text" value={prompt.text || ''} onChange={(e) => handleMatchingSubItemChange(qIndex, 'prompts', pIndex, e.target.value)} placeholder={`Prompt ${pIndex + 1}`} className={`w-full ${inputBaseStyles} py-2 px-3 text-sm`}/>
                                <select value={q.correctPairs?.[prompt.id] || ''} onChange={(e) => handlePairChange(qIndex, prompt.id, e.target.value)} className={`w-40 ${inputBaseStyles} py-2 px-3 text-sm appearance-none`}>
                                  <option value="" disabled>Select Match</option>
                                  {(q.options || []).map((opt, oIndex) => (<option key={opt.id || oIndex} value={opt.id}>Option {String.fromCharCode(97 + oIndex)}</option>))} {/* Fallback key */}
                                </select>
                                <button onClick={() => handleRemoveMatchingSubItem(qIndex, 'prompts', pIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}><TrashIcon className="h-4 w-4" /></button>
                              </div>
                            ))}
                            <button onClick={() => handleAddMatchingSubItem(qIndex, 'prompts')} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}><PlusCircleIcon className="h-4 w-4 mr-1" /> Add Prompt</button>
                          </div>
                           {/* Column B */}
                          <div className="space-y-3">
                             <p className="text-sm font-medium text-slate-700">Column B (Options) - {(q.options || []).length} items</p>
                             {(q.options || []).map((option, oIndex) => (
                              <div key={option.id || oIndex} className="flex items-center gap-2"> {/* Fallback key */}
                                <span className="font-semibold text-slate-600 text-sm w-8 text-center">{String.fromCharCode(97 + oIndex)}.</span>
                                <input type="text" value={option.text || ''} onChange={(e) => handleMatchingSubItemChange(qIndex, 'options', oIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(97 + oIndex)}`} className={`w-full ${inputBaseStyles} py-2 px-3 text-sm`}/>
                                <button onClick={() => handleRemoveMatchingSubItem(qIndex, 'options', oIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}><TrashIcon className="h-4 w-4" /></button>
                              </div>
                            ))}
                            <button onClick={() => handleAddMatchingSubItem(qIndex, 'options')} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}><PlusCircleIcon className="h-4 w-4 mr-1" /> Add Option (Distractor)</button>
                          </div>
                        </div>
                      )}


                      {/* --- NEW: Essay Rubric UI --- */}
                      {q.type === 'essay' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-700">Rubric (Total Points: {q.points || 0})</p>
                          <div className="space-y-2">
                            {(q.rubric || []).map((item, rIndex) => (
                                <div key={item.id || rIndex} className="flex items-center gap-2"> {/* Fallback key */}
                                    <input
                                      type="text"
                                      value={item.criteria || ''} // Ensure controlled
                                      onChange={(e) => handleRubricChange(qIndex, rIndex, 'criteria', e.target.value)}
                                      placeholder="Criteria Description (e.g., Clarity)"
                                      className={`w-full ${inputBaseStyles} py-2 px-3 text-sm`}
                                    />
                                    <input
                                      type="number"
                                      value={item.points || 0} // Ensure controlled
                                      onChange={(e) => handleRubricChange(qIndex, rIndex, 'points', e.target.value)}
                                      placeholder="Pts"
                                      className={`w-24 ${inputBaseStyles} py-2 px-3 text-sm`}
                                      min={0}
                                    />
                                    <button onClick={() => handleRemoveRubricItem(qIndex, rIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}>
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                          </div>
                          <button onClick={() => handleAddRubricItem(qIndex)} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}>
                              <PlusCircleIcon className="h-4 w-4 mr-1" /> Add Criteria
                          </button>
                        </div>
                      )}
                      {/* --- END NEW --- */}

                    </div>

                    {/* Explanation */}
                    <div className="pt-3">
                      <label className="text-sm font-medium text-slate-700">Rationale / Explanation (Optional)</label>
                      <textarea
                        value={q.explanation || ''} // Ensure controlled
                        onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                        placeholder="Explain why the answer is correct (for auto-graded items)..."
                        className={`w-full min-h-[60px] text-sm ${inputBaseStyles} p-3 mt-1.5`}
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Question Button */}
            <button
              type="button"
              onClick={handleAddQuestion}
              className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded} w-auto self-start mt-4`} // Added margin-top
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Question
            </button>
          </div>

          {/* Footer */}
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
                onClick={handleSubmit}
                disabled={loading}
                className={`${btnBase} bg-sky-500 hover:bg-sky-600 text-white ${btnExtruded} ${btnDisabled}`}
              >
                {loading ? 'Saving...' : (submitText || 'Submit')}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}