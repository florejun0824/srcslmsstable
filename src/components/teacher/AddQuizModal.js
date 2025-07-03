import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { PlusCircleIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import RichTextEditor from '../common/RichTextEditor';

const questionTypes = [
  { value: 'multipleChoice', label: 'Multiple Choice' },
  { value: 'exactAnswer', label: 'Exact Answer' },
];

// Custom Dropdown Component for Question Type
const QuestionTypeDropdown = ({ selectedType, onTypeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = questionTypes.find(t => t.value === selectedType)?.label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6"
      >
        <span className="block truncate">{selectedLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {questionTypes.map((type) => (
            <li
              key={type.value}
              className="text-gray-900 relative cursor-default select-none py-2 pl-10 pr-4 hover:bg-gray-100"
              onClick={() => {
                onTypeChange(type.value);
                setIsOpen(false);
              }}
            >
              {type.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


export default function AddQuizModal({ isOpen, onClose, unitId, subjectId }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { text: '', type: 'multipleChoice', options: ['', '', '', ''], correctAnswerIndex: 0 }
    ]);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    if (field === 'type') {
      if (value === 'multipleChoice') {
        newQuestions[index].correctAnswer = '';
      } else {
        newQuestions[index].correctAnswerIndex = 0;
      }
    }
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };
  
  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAddQuiz = async () => {
    if (!title.trim()) return setError('Quiz title cannot be empty.');
    if (questions.length === 0) return setError('Please add at least one question.');
    
    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'quizzes'), {
        title,
        unitId,
        subjectId,
        questions,
        createdAt: serverTimestamp(),
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
    <Dialog open={isOpen} onClose={handleClose} static={true}>
      <DialogPanel className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl flex flex-col h-[90vh]">
        <div className="flex-shrink-0">
          <Title className="mb-4">Add New Quiz</Title>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
            <TextInput value={title} onValueChange={setTitle} placeholder="e.g., Chapter 1 Review" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 border-t pt-4">Questions</h3>
        </div>
        
        <div className="flex-grow overflow-y-auto space-y-4 py-4 pr-2">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="p-4 border rounded-md space-y-3 relative">
              <div className="flex justify-between items-center">
                <label className="font-semibold">Question {qIndex + 1}</label>
                <button onClick={() => handleRemoveQuestion(qIndex)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
              <TextInput value={q.text} onValueChange={(val) => handleQuestionChange(qIndex, 'text', val)} placeholder="Enter the question text" />
              
              {/* --- FIXED: Using the custom dropdown component --- */}
              <QuestionTypeDropdown 
                selectedType={q.type}
                onTypeChange={(val) => handleQuestionChange(qIndex, 'type', val)}
              />
              
              {q.type === 'multipleChoice' && (
                <div className="space-y-2 pl-4 border-l-2">
                  <p className="text-sm font-medium">Options (Select the correct one):</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name={`correct-answer-${qIndex}`} 
                        checked={q.correctAnswerIndex === oIndex}
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)}
                      />
                      <TextInput value={opt} onValueChange={(val) => handleOptionChange(qIndex, oIndex, val)} placeholder={`Option ${oIndex + 1}`} />
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'exactAnswer' && (
                <div className="space-y-2 pl-4 border-l-2">
                   <p className="text-sm font-medium">Correct Answer:</p>
                   <TextInput value={q.correctAnswer || ''} onValueChange={(val) => handleQuestionChange(qIndex, 'correctAnswer', val)} placeholder="Enter the exact answer" />
                </div>
              )}
            </div>
          ))}
           <Button icon={PlusCircleIcon} variant="light" onClick={handleAddQuestion}>Add Question</Button>
        </div>

        <div className="flex-shrink-0 border-t pt-4">
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button onClick={handleAddQuiz} loading={loading} disabled={loading}>Add Quiz</Button>
            </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
}