import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../services/firebase'; // Adjust path
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Adjust path
import { Title, Button } from '@tremor/react';
import {
  PlusCircleIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CodeBracketIcon,
  LinkIcon,
  QueueListIcon,
  PaintBrushIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';

import ContentRenderer from './ContentRenderer'; 
import 'katex/dist/katex.min.css'; 

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'identification', label: 'Identification' },
  { value: 'matching-type', label: 'Matching Type' },
  { value: 'essay', label: 'Essay' },
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

// --- Icons for Markdown Toolbar ---
const BoldIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} className="w-5 h-5">
      <path d="M7 5v14h7c2.21 0 4-1.79 4-4s-1.79-4-4-4h-4m4 0H7" />
    </svg>
);
const ItalicIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} className="w-5 h-5">
      <path d="M10 5l-4 14h3l4-14h-3z" />
    </svg>
);
const H1Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props} className="w-5 h-5">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold">H1</text>
    </svg>
);
const H2Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props} className="w-5 h-5">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold">H2</text>
    </svg>
);
const H3Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props} className="w-5 h-5">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold">H3</text>
    </svg>
);


// --- Upgraded MarkdownEditableField Component ---
const MarkdownEditableField = ({
    value,
    onChange,
    fieldId,
    editingField,
    setEditingField,
    isTextarea = false,
    placeholder = "Click to edit"
}) => {
    const isEditing = editingField === fieldId;
    
    const textareaRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const TEXT_COLORS = [
        { name: 'Blue', hex: '#3B82F6' },
        { name: 'Green', hex: '#22C55E' },
        { name: 'Orange', hex: '#F97316' },
        { name: 'Red', hex: '#EF4444' },
        { name: 'Slate', hex: '#475569' },
    ];

    const adjustHeight = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    };

    useEffect(() => {
        if (isEditing) {
            adjustHeight();
        }
    }, [isEditing, value]);

    const applyStyle = (startTag, endTag = '', isBlock = false) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);

        let newText;
        let cursorPos;
        if (isBlock) {
            newText = `${text.substring(0, start)}${startTag}${selectedText || 'Type here...'}${endTag}${text.substring(end)}`;
            cursorPos = start + startTag.length + (selectedText ? selectedText.length : 'Type here...'.length);
        } else {
            newText = `${text.substring(0, start)}${startTag}${selectedText}${endTag}${text.substring(end)}`;
            cursorPos = start + startTag.length + selectedText.length;
        }

        onChange && onChange({ target: { value: newText } });
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            if (isBlock && !selectedText) {
                ta.selectionStart = start + startTag.length;
                ta.selectionEnd = cursorPos;
            } else {
                ta.selectionStart = ta.selectionEnd = cursorPos;
            }
        }, 0);
    };
    
    const applyColor = (hex) => {
        applyStyle(`<span style="color: ${hex};">`, `</span>`);
        setShowColorPicker(false);
    };

    const applyBlockQuote = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        let selectedText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (!selectedText) selectedText = "Quoted text";
        const blockTextContent = selectedText.split('\n').map(line => `> ${line}`).join('\n');
        applyStyle(`\n${blockTextContent}\n`, '', true);
    };

    const applyMarkdown = (syntax) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);
        let newText, cursorPos;

        switch (syntax) {
            case 'bold':
                newText = `${text.substring(0, start)}<strong>${selectedText}</strong>${text.substring(end)}`;
                cursorPos = start + `<strong>`.length + selectedText.length;
                break;
            case 'italic':
                newText = `${text.substring(0, start)}<em>${selectedText}</em>${text.substring(end)}`;
                cursorPos = start + `<em>`.length + selectedText.length;
                break;
            case 'list':
                const lines = selectedText ? selectedText.split('\n').map(l => `- ${l}`) : ['- '];
                newText = `${text.substring(0, start)}${lines.join('\n')}${text.substring(end)}`;
                cursorPos = start + lines.join('\n').length;
                break;
            case 'code':
                newText = `${text.substring(0, start)}\`${selectedText}\`${text.substring(end)}`;
                cursorPos = start + 1 + selectedText.length + 1;
                break;
            case 'link':
                newText = `${text.substring(0, start)}[${selectedText}](url)${text.substring(end)}`;
                cursorPos = start + 1 + selectedText.length + 1 + 3;
                break;
            case 'h1':
                newText = `${text.substring(0, start)}# ${selectedText}${text.substring(end)}`;
                cursorPos = start + 2;
                break;
            case 'h2':
                newText = `${text.substring(0, start)}## ${selectedText}${text.substring(end)}`;
                cursorPos = start + 3;
                break;
            case 'h3':
                newText = `${text.substring(0, start)}### ${selectedText}${text.substring(end)}`;
                cursorPos = start + 4;
                break;
            default:
                return;
        }

        onChange && onChange({ target: { value: newText } });
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            ta.selectionStart = ta.selectionEnd = cursorPos;
        }, 0);
    };

    const ToolbarButton = ({ icon, syntax, tooltip, onClick, onMouseDown }) => (
        <Button 
            size="xs" 
            variant="light" 
            icon={icon} 
            onClick={onClick || (() => applyMarkdown(syntax))} 
            tooltip={tooltip} 
            className="p-2 rounded-lg"
            onMouseDown={onMouseDown}
        />
    );


    if (isEditing) {
        const InputComponent = isTextarea ? 'textarea' : 'input';
        return (
            <div className={`w-full ${inputBaseStyles} p-0 overflow-hidden`}>
                <div className="flex items-center flex-wrap gap-1 p-2 border-b border-slate-300/50 bg-slate-200/50">
                    <ToolbarButton icon={BoldIcon} syntax="bold" tooltip="Bold" onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton icon={ItalicIcon} syntax="italic" tooltip="Italic" onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton icon={QueueListIcon} syntax="list" tooltip="Bulleted List" onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton icon={CodeBracketIcon} syntax="code" tooltip="Inline Code" onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton icon={LinkIcon} syntax="link" tooltip="Link" onMouseDown={(e) => e.preventDefault()} />
                    <div className="w-px h-6 bg-slate-300/70 mx-1"></div>
                    <div className="relative">
                        <ToolbarButton icon={PaintBrushIcon} tooltip="Text Color" onClick={() => setShowColorPicker(s => !s)} onMouseDown={(e) => e.preventDefault()} />
                        {showColorPicker && (
                            <div 
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseLeave={() => setShowColorPicker(false)} 
                                className="absolute top-full mt-2 z-10 bg-slate-100 p-2 rounded-lg shadow-lg flex gap-2"
                            >
                                {TEXT_COLORS.map(color => (
                                    <button key={color.name} title={color.name} onClick={() => applyColor(color.hex)} className="w-6 h-6 rounded-full" style={{ backgroundColor: color.hex }} />
                                ))}
                            </div>
                        )}
                    </div>
                    <ToolbarButton icon={ChatBubbleLeftRightIcon} tooltip="Block Quote" onClick={applyBlockQuote} onMouseDown={(e) => e.preventDefault()} />
                    <div className="w-px h-6 bg-slate-300/70 mx-1"></div>
                    <ToolbarButton icon={H1Icon} syntax="h1" tooltip="Heading 1" onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton icon={H2Icon} syntax="h2" tooltip="Heading 2" onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton icon={H3Icon} syntax="h3" tooltip="Heading 3" onMouseDown={(e) => e.preventDefault()} />
                </div>
                <InputComponent
                    ref={textareaRef}
                    type="text"
                    value={value || ''}
                    onChange={onChange}
                    onBlur={() => setEditingField(null)} 
                    autoFocus 
                    className={`w-full ${isTextarea ? 'min-h-[80px]' : ''} p-3 text-sm bg-transparent border-none resize-none focus:outline-none focus:ring-0`}
                    rows={isTextarea ? 3 : undefined}
                    placeholder={placeholder}
                />
            </div>
        );
    }

    // --- MODIFICATION: Fixed the layout expansion bug ---
    // Added Tailwind arbitrary variants like [&_.prose_p]:my-0 to force-remove margins
    return (
        <div
            onClick={() => setEditingField(fieldId)}
            className={`w-full ${inputBaseStyles} ${isTextarea ? 'min-h-[80px] p-3' : 'min-h-[40px] py-2 px-3'} 
                      text-sm cursor-text 
                      [&_.prose_p]:my-0 [&_.prose_ul]:my-0 [&_.prose_ol]:my-0 
                      [&_.prose_h1]:my-0 [&_.prose_h2]:my-0 [&_.prose_h3]:my-0 
                      [&_.prose_blockquote]:my-0`}
        >
            <ContentRenderer text={value || <span className="text-slate-400">{placeholder}</span>} />
        </div>
    );
};
// --- END MODIFICATION ---


export default function ManualQuizCreator({
    onClose,
    onBack,
    unitId,
    subjectId,
    initialData = null
}) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hasInitialData = !!initialData;
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(-1);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title || '');
        const populatedQuestions = (initialData.questions || []).map(q => ({
            text: '', points: 1, explanation: '', options: [], prompts: [], correctPairs: {}, rubric: [],
            ...q 
        }));
        setQuestions(populatedQuestions);
        setError('AI-generated quiz loaded. Please review all questions, types, and answers for accuracy before saving.');
        setSelectedQuestionIndex(populatedQuestions.length > 0 ? 0 : -1);
        setEditingField(null);
    } else {
        setTitle('');
        setQuestions([]);
        setError('');
        setSelectedQuestionIndex(-1);
        setEditingField(null);
    }
  }, [initialData]);

  const handleAddQuestion = () => {
    const newQuestion = {
        text: '',
        type: 'multiple-choice',
        points: 1,
        // --- MODIFICATION: Default to 3 options ---
        options: ['', '', ''],
        correctAnswerIndex: 0,
        explanation: ''
    };
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    setSelectedQuestionIndex(newQuestions.length - 1);
    setEditingField('question-text');
  };

  const handleRemoveQuestion = (indexToRemove) => {
    const newQuestions = questions.filter((_, i) => i !== indexToRemove);
    setQuestions(newQuestions);

    if (newQuestions.length === 0) {
        setSelectedQuestionIndex(-1);
    } else if (selectedQuestionIndex === indexToRemove) {
        setSelectedQuestionIndex(Math.max(0, indexToRemove - 1));
    } else if (selectedQuestionIndex > indexToRemove) {
        setSelectedQuestionIndex(selectedQuestionIndex - 1);
    }
    setEditingField(null);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    const oldQuestion = newQuestions[index];
    let newQuestion = { ...oldQuestion, [field]: value };
    if (field === 'type') {
        const oldType = oldQuestion.type;
        if (value !== oldType) {
            delete newQuestion.options; delete newQuestion.correctAnswerIndex;
            delete newQuestion.correctAnswer; delete newQuestion.prompts;
            delete newQuestion.correctPairs; delete newQuestion.rubric; 
            switch (value) {
                case 'multiple-choice':
                    // --- MODIFICATION: Default to 3 options ---
                    newQuestion.options = ['', '', '']; 
                    newQuestion.correctAnswerIndex = 0; 
                    newQuestion.points = 1;
                    break;
                case 'true-false':
                    newQuestion.correctAnswer = true; newQuestion.points = 1;
                    break;
                case 'identification':
                    newQuestion.correctAnswer = ''; newQuestion.points = 1;
                    break;
                case 'matching-type':
                    newQuestion.prompts = [{ id: uniqueId(), text: '' }]; newQuestion.options = [{ id: uniqueId(), text: '' }, { id: uniqueId(), text: '' }];
                    newQuestion.correctPairs = {}; newQuestion.points = 1;
                    break;
                case 'essay':
                    newQuestion.rubric = [{ id: uniqueId(), criteria: 'Clarity', points: 5 }, { id: uniqueId(), criteria: 'Relevance', points: 5 }];
                    newQuestion.points = 10;
                    break;
                default: newQuestion.points = 1; break;
            }
        }
    }
    if (newQuestion.type === 'essay' && field !== 'points') {
        const rubricTotal = (newQuestion.rubric || []).reduce((sum, item) => sum + (Number(item.points) || 0), 0);
        if (newQuestion.points !== rubricTotal) { newQuestion.points = rubricTotal; }
    }
    newQuestions[index] = newQuestion;
    setQuestions(newQuestions);
  };
  
  // --- MODIFICATION: Renamed from handleOptionChange to handleOptionTextChange ---
  const handleOptionTextChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    let optionsArray = newQuestions[qIndex].options; 
    if (!optionsArray) { optionsArray = []; }
    const currentOption = optionsArray[oIndex];
    optionsArray = [...optionsArray];
    if (typeof currentOption === 'object' && currentOption !== null) { optionsArray[oIndex] = { ...currentOption, text: value }; }
    else { optionsArray[oIndex] = value; }
    newQuestions[qIndex].options = optionsArray;
    setQuestions(newQuestions);
  };

  // --- MODIFICATION: New handler to add an option ---
  const handleAddOption = (qIndex) => {
    const newQuestions = [...questions];
    const optionsArray = newQuestions[qIndex].options || [];
    optionsArray.push('');
    newQuestions[qIndex].options = optionsArray;
    setQuestions(newQuestions);
    // Focus the new option field
    setEditingField(`option-${optionsArray.length - 1}`);
  };

  // --- MODIFICATION: New handler to remove an option ---
  const handleRemoveOption = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    let optionsArray = newQuestions[qIndex].options || [];
    
    // Enforce minimum 3 options
    if (optionsArray.length <= 3) {
        return; 
    }
    
    optionsArray = optionsArray.filter((_, i) => i !== oIndex);
    
    // Check if the removed option was the correct one
    if (newQuestions[qIndex].correctAnswerIndex === oIndex) {
        newQuestions[qIndex].correctAnswerIndex = 0; // Reset to first option
    } else if (newQuestions[qIndex].correctAnswerIndex > oIndex) {
        newQuestions[qIndex].correctAnswerIndex -= 1; // Shift index down
    }
    
    newQuestions[qIndex].options = optionsArray;
    setQuestions(newQuestions);
  };

  const handleRubricChange = (qIndex, rIndex, field, value) => {
    const newQuestions = [...questions]; const question = newQuestions[qIndex];
    const updatedRubric = [...(question.rubric || [])];
    updatedRubric[rIndex] = { ...updatedRubric[rIndex], [field]: value };
    question.rubric = updatedRubric; 
    if (field === 'points') {
        const rubricTotal = question.rubric.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
        question.points = rubricTotal; 
    }
    setQuestions(newQuestions); 
  };
  const handleAddRubricItem = (qIndex) => {
    const newQuestions = [...questions]; const question = newQuestions[qIndex];
    const currentRubric = question.rubric || [];
    question.rubric = [...currentRubric, { id: uniqueId(), criteria: '', points: 0 }];
    setQuestions(newQuestions);
    setEditingField(`rubric-${currentRubric.length}`);
  };
  const handleRemoveRubricItem = (qIndex, rIndex) => {
    const newQuestions = [...questions]; const question = newQuestions[qIndex];
    question.rubric = (question.rubric || []).filter((_, i) => i !== rIndex);
    const rubricTotal = question.rubric.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
    question.points = rubricTotal;
    setQuestions(newQuestions);
  };
  const handleMatchingSubItemChange = (qIndex, itemType, itemIndex, newText) => {
    const newQuestions = [...questions]; const question = newQuestions[qIndex];
    const updatedItems = [...(question[itemType] || [])];
    if(updatedItems[itemIndex]) {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], text: newText };
        question[itemType] = updatedItems;
        setQuestions(newQuestions);
    }
  };
  const handleAddMatchingSubItem = (qIndex, itemType) => {
    const newQuestions = [...questions]; const question = newQuestions[qIndex];
    const currentItems = question[itemType] || [];
    question[itemType] = [...currentItems, { id: uniqueId(), text: '' }];
    if (itemType === 'prompts') { 
        question.points = question[itemType].length; 
        setEditingField(`prompt-${currentItems.length}`);
    } else {
        setEditingField(`match-option-${currentItems.length}`);
    }
    setQuestions(newQuestions);
  };
  const handleRemoveMatchingSubItem = (qIndex, itemType, itemIndex) => {
    const newQuestions = [...questions]; const question = newQuestions[qIndex];
    if (!question[itemType]) return; 
    const removedItem = question[itemType][itemIndex];
    question[itemType] = question[itemType].filter((_, i) => i !== itemIndex);
    if (itemType === 'prompts') {
        if(question.correctPairs) { delete question.correctPairs[removedItem.id]; }
        question.points = question[itemType].length; 
    } else {
        if(question.correctPairs){
            for (const promptId in question.correctPairs) {
                if (question.correctPairs[promptId] === removedItem.id) { question.correctPairs[promptId] = ''; }
            }
        }
    }
    setQuestions(newQuestions);
  };
  const handlePairChange = (qIndex, promptId, optionId) => {
    const newQuestions = [...questions]; const question = newQuestions[qIndex];
    const currentPairs = question.correctPairs || {};
    question.correctPairs = { ...currentPairs, [promptId]: optionId };
    setQuestions(newQuestions);
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) return setError('Quiz title cannot be empty.');
    if (questions.length === 0) return setError('Please add at least one question.');
    for (const [qIndex, q] of questions.entries()) {
      const points = Number(q.points) || 0;
      const startNum = questions.slice(0, qIndex).reduce((sum, prevQ) => sum + (Number(prevQ.points) || 1), 1);
      const endNum = startNum + points - 1;
      const qLabel = points <= 1 ? `Question ${startNum}` : `Questions ${startNum}-${endNum}`;
      if (!q.text.trim()) { return setError(`${qLabel}: must have text (or an instruction).`); }
      if (points <= 0 && q.type !== 'essay') { return setError(`${qLabel}: Points must be greater than 0.`); }
      if (q.type === 'multiple-choice') {
          // --- MODIFICATION: Check for minimum 3 options ---
          if (!q.options || q.options.length < 3) { 
              return setError(`${qLabel}: Must have at least 3 options.`); 
          }
          if (q.options.some(opt => { const optionText = (typeof opt === 'object' && opt !== null) ? opt.text : opt; return !String(optionText).trim(); })) { 
              return setError(`${qLabel}: All multiple choice options must be filled in.`); 
          }
          if (q.correctAnswerIndex === undefined || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) { 
              return setError(`${qLabel}: A correct multiple choice answer must be selected.`); 
          }
      } else if (q.type === 'identification') {
        if (typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) { return setError(`${qLabel}: (Identification) must have a correct answer.`); }
      } else if (q.type === 'matching-type') {
          if(!q.prompts || q.prompts.length === 0) return setError(`${qLabel}: (Matching) must have at least one prompt.`);
          if(!q.options || q.options.length === 0) return setError(`${qLabel}: (Matching) must have at least one option.`);
          if (q.points !== q.prompts.length) { return setError(`${qLabel}: (Matching) Number of points (${q.points}) must match the number of prompts (${q.prompts.length}). Add/remove prompts.`); }
          if (q.prompts.some(p => !p.text.trim())) { return setError(`${qLabel}: (Matching) All prompts must have text.`); }
          if (q.options.some(o => !o.text.trim())) { return setError(`${qLabel}: (Matching) All options must have text.`); }
          if (q.options.length <= q.prompts.length) { return setError(`${qLabel}: (Matching) must have at least one distractor (more options than prompts).`); }
          if (!q.correctPairs || Object.keys(q.correctPairs).length !== q.prompts.length || Object.values(q.correctPairs).some(val => !val)) { return setError(`${qLabel}: (Matching) All prompts must be paired with an answer.`); }
      } else if (q.type === 'essay') {
          if (!q.rubric || q.rubric.length === 0) { return setError(`${qLabel}: (Essay) must have at least one rubric criterion.`); }
          if (q.rubric.some(r => !r.criteria.trim() || (Number(r.points) || 0) <= 0)) { return setError(`${qLabel}: (Essay) All rubric items must have a criteria description and points greater than 0.`); }
          const rubricTotal = q.rubric.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
           if (rubricTotal === 0) { return setError(`${qLabel}: (Essay) Total points for the rubric cannot be 0.`); }
          if (rubricTotal !== q.points) { console.error("Rubric total mismatch validation:", q.points, rubricTotal); return setError(`${qLabel}: (Essay) Rubric total (${rubricTotal}) does not match question points (${q.points}). Please adjust rubric points.`); }
      }
    } 
    setLoading(true); setError('');
    try {
      await addDoc(collection(db, 'quizzes'), {
        title, unitId, subjectId, questions, createdAt: serverTimestamp(),
        createdBy: hasInitialData ? 'ai-assisted' : 'manual' 
      });
      onClose();
    } catch (err) {
      console.error("Error adding quiz:", err); setError("Failed to add quiz.");
    } finally { setLoading(false); }
  };
  
  const getQuestionLabel = (q, index) => {
    const startNumber = questions.slice(0, index).reduce((sum, currentQ) => sum + (Number(currentQ.points) || 1), 1);
    const points = Number(q.points) || 1; 
    const endNumber = startNumber + Math.max(0, points - 1); 
    return points <= 1 ? `Question ${startNumber}` : `Questions ${startNumber}-${endNumber}`;
  };

  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  }, [questions]);

  const currentQuestion = questions[selectedQuestionIndex];

  const handleAttemptNavigation = (actionCallback) => {
    if (title.trim() || questions.length > 0) {
      setPendingAction(() => actionCallback);
      setIsWarningModalOpen(true);
    } else {
      actionCallback();
    }
  };

  const handleConfirmLeave = () => {
    if (pendingAction) {
      pendingAction();
    }
    setIsWarningModalOpen(false);
    setPendingAction(null);
  };

  const handleCancelLeave = () => {
    setIsWarningModalOpen(false);
    setPendingAction(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-200">
      <button 
        onClick={() => handleAttemptNavigation(onBack)}
        className={`absolute top-4 left-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 ${btnExtruded}`}
      >
        <ArrowUturnLeftIcon className="h-6 w-6" />
      </button>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden pt-12">
        
        {/* Left Pane: Question List */}
        <div className="w-full md:w-1/3 lg:w-1/4 p-4 md:p-6 overflow-y-auto bg-slate-200/50 border-r border-slate-300/70 space-y-4">
            <Title className="text-xl font-bold text-slate-800 text-center">
                {hasInitialData ? 'Review Quiz' : 'Quiz Creator'}
            </Title>
            
            <div className="p-4 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff] space-y-2">
                <label className="block text-sm font-medium text-slate-700">Quiz Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Chapter 1 Review"
                    className={`w-full ${inputBaseStyles} py-2.5 px-3`}
                />
            </div>

            <div className="p-4 rounded-2xl bg-slate-200 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff]">
                <p className="text-sm font-medium text-slate-600">Total Points</p>
                <p className="text-3xl font-bold text-sky-600">{totalPoints}</p>
            </div>

            <div className="space-y-2">
                {questions.map((q, qIndex) => (
                    <button
                        key={qIndex} 
                        onClick={() => {
                            setSelectedQuestionIndex(qIndex);
                            setEditingField(null);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                            selectedQuestionIndex === qIndex
                            ? 'bg-slate-50 text-sky-600 shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] ring-2 ring-sky-500'
                            : `bg-slate-200 text-slate-700 ${btnExtruded}`
                        }`}
                    >
                        <span className="font-semibold">{getQuestionLabel(q, qIndex)}</span>
                        <span className="block text-xs opacity-70">{q.type} - {q.points || 0} pt(s)</span>
                    </button>
                ))}
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded} w-full mt-4`}
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Question
            </button>
        </div>

        {/* Right Pane: Question Editor */}
        <div className="flex-1 w-full md:w-2/3 lg:w-3/4 p-4 md:p-8 overflow-y-auto">
            {!currentQuestion ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                    <DocumentTextIcon className="w-16 h-16 opacity-50" />
                    <p className="mt-4 text-lg font-semibold">
                        {questions.length === 0 ? "No questions yet" : "Select a question"}
                    </p>
                    <p className="text-sm">
                        {questions.length === 0 ? "Click 'Add Question' in the left pane to get started." : "Select a question from the list on the left to edit it."}
                    </p>
                </div>
            ) : (
                <div className="p-5 rounded-2xl bg-slate-200 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] space-y-4 relative">
                    
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-800 text-lg">
                        {getQuestionLabel(currentQuestion, selectedQuestionIndex)}
                      </label>
                      <button onClick={() => handleRemoveQuestion(selectedQuestionIndex)} className={`h-9 w-9 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff]`}>
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <MarkdownEditableField
                        value={currentQuestion.text || ''}
                        onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'text', e.target.value)}
                        fieldId="question-text"
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isTextarea={true}
                        placeholder={
                           currentQuestion.type === 'essay' ? "Enter the essay prompt..." :
                           currentQuestion.type === 'matching-type' ? "Enter the instruction (e.g., Match Column A...)" :
                           "Enter the question text"
                        }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Question Type</label>
                        <select
                          value={currentQuestion.type || 'multiple-choice'} 
                          onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'type', e.target.value)}
                          className={`w-full ${inputBaseStyles} py-2.5 px-3 text-sm appearance-none`}
                        >
                          {questionTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Points</label>
                        <input
                          type="number"
                          value={currentQuestion.points || 1} 
                          disabled={currentQuestion.type === 'matching-type' || currentQuestion.type === 'essay'}
                          onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'points', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-full ${inputBaseStyles} py-2.5 px-3 text-sm ${currentQuestion.type === 'matching-type' || currentQuestion.type === 'essay' ? 'opacity-70 bg-slate-100 cursor-not-allowed' : ''}`}
                          min={1}
                        />
                         {(currentQuestion.type === 'matching-type' || currentQuestion.type === 'essay') && (
                            <p className="text-xs text-slate-500 mt-1">
                                Points auto-calculated based on {currentQuestion.type === 'matching-type' ? 'prompts' : 'rubric'}.
                            </p>
                         )}
                      </div>
                    </div>

                    <div className="pt-2 pl-4 border-l-2 border-slate-300 space-y-3">
                        
                      {currentQuestion.type === 'multiple-choice' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-700">Options (Select the correct one):</p>
                          {(currentQuestion.options || []).map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name={`correct-answer-${selectedQuestionIndex}`}
                                checked={currentQuestion.correctAnswerIndex === oIndex}
                                onChange={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswerIndex', oIndex)}
                                className="form-radio h-5 w-5 text-sky-500 bg-slate-200 border-none shadow-[inset_1px_1px_2px_#bdc1c6,inset_-1px_-1px_2px_#ffffff] focus:ring-sky-500 focus:ring-1"
                              />
                              <div className="flex-1"> {/* Wrapper to make field take up space */}
                                <MarkdownEditableField
                                  value={opt.text || opt || ''}
                                  onChange={(e) => handleOptionTextChange(selectedQuestionIndex, oIndex, e.target.value)}
                                  fieldId={`option-${oIndex}`}
                                  editingField={editingField}
                                  setEditingField={setEditingField}
                                  placeholder={`Option ${oIndex + 1}`}
                                />
                              </div>
                              {/* --- MODIFICATION: Remove Option Button --- */}
                              <button 
                                type="button"
                                onClick={() => handleRemoveOption(selectedQuestionIndex, oIndex)}
                                disabled={currentQuestion.options.length <= 3}
                                className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]`}
                                title="Remove option"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          {/* --- MODIFICATION: Add Option Button --- */}
                          <button 
                            type="button"
                            onClick={() => handleAddOption(selectedQuestionIndex)} 
                            className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}
                          >
                            <PlusCircleIcon className="h-4 w-4 mr-1" /> Add Option
                          </button>
                        </div>
                      )}

                      {currentQuestion.type === 'true-false' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Correct Answer:</p>
                          <div className={`flex space-x-1 p-1 rounded-xl ${inputBaseStyles} max-w-xs`}>
                            <button type="button" onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', true)} className={getSegmentedButtonClasses(currentQuestion.correctAnswer === true)}>True</button>
                            <button type="button" onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', false)} className={getSegmentedButtonClasses(currentQuestion.correctAnswer === false)}>False</button>
                          </div>
                        </div>
                      )}

                      {currentQuestion.type === 'identification' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Correct Answer:</p>
                          <MarkdownEditableField
                            value={currentQuestion.correctAnswer || ''}
                            onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', e.target.value)}
                            fieldId="identification-answer"
                            editingField={editingField}
                            setEditingField={setEditingField}
                            placeholder="Enter the exact answer"
                          />
                        </div>
                      )}

                       {currentQuestion.type === 'matching-type' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                             <p className="text-sm font-medium text-slate-700">Column A (Prompts) - {(currentQuestion.prompts || []).length} items</p>
                             {(currentQuestion.prompts || []).map((prompt, pIndex) => (
                              <div key={prompt.id || pIndex} className="flex items-center gap-2"> 
                                <span className="font-semibold text-slate-600 text-sm w-5 text-center">{pIndex + 1}.</span>
                                <MarkdownEditableField
                                    value={prompt.text || ''}
                                    onChange={(e) => handleMatchingSubItemChange(selectedQuestionIndex, 'prompts', pIndex, e.target.value)}
                                    fieldId={`prompt-${pIndex}`}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    placeholder={`Prompt ${pIndex + 1}`}
                                />
                                <select value={currentQuestion.correctPairs?.[prompt.id] || ''} onChange={(e) => handlePairChange(selectedQuestionIndex, prompt.id, e.target.value)} className={`w-40 ${inputBaseStyles} py-2 px-3 text-sm appearance-none`}>
                                  <option value="" disabled>Select Match</option>
                                  {(currentQuestion.options || []).map((opt, oIndex) => (<option key={opt.id || oIndex} value={opt.id}>Option {String.fromCharCode(97 + oIndex)}</option>))}
                                </select>
                                <button onClick={() => handleRemoveMatchingSubItem(selectedQuestionIndex, 'prompts', pIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}><TrashIcon className="h-4 w-4" /></button>
                              </div>
                            ))}
                            <button onClick={() => handleAddMatchingSubItem(selectedQuestionIndex, 'prompts')} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}><PlusCircleIcon className="h-4 w-4 mr-1" /> Add Prompt</button>
                          </div>
                          <div className="space-y-3">
                             <p className="text-sm font-medium text-slate-700">Column B (Options) - {(currentQuestion.options || []).length} items</p>
                             {(currentQuestion.options || []).map((option, oIndex) => (
                              <div key={option.id || oIndex} className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600 text-sm w-8 text-center">{String.fromCharCode(97 + oIndex)}.</span>
                                <MarkdownEditableField
                                    value={option.text || ''}
                                    onChange={(e) => handleMatchingSubItemChange(selectedQuestionIndex, 'options', oIndex, e.target.value)}
                                    fieldId={`match-option-${oIndex}`}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    placeholder={`Option ${String.fromCharCode(97 + oIndex)}`}
                                />
                                <button onClick={() => handleRemoveMatchingSubItem(selectedQuestionIndex, 'options', oIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}><TrashIcon className="h-4 w-4" /></button>
                              </div>
                            ))}
                            <button onClick={() => handleAddMatchingSubItem(selectedQuestionIndex, 'options')} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}><PlusCircleIcon className="h-4 w-4 mr-1" /> Add Option (Distractor)</button>
                          </div>
                        </div>
                      )}

                      {currentQuestion.type === 'essay' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-700">Rubric (Total Points: {currentQuestion.points || 0})</p>
                          <div className="space-y-2">
                            {(currentQuestion.rubric || []).map((item, rIndex) => (
                                <div key={item.id || rIndex} className="flex items-center gap-2"> 
                                    <MarkdownEditableField
                                        value={item.criteria || ''}
                                        onChange={(e) => handleRubricChange(selectedQuestionIndex, rIndex, 'criteria', e.target.value)}
                                        fieldId={`rubric-${rIndex}`}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        placeholder="Criteria Description (e.g., Clarity)"
                                    />
                                    <input
                                      type="number"
                                      value={item.points || 0} 
                                      onChange={(e) => handleRubricChange(selectedQuestionIndex, rIndex, 'points', e.target.value)}
                                      placeholder="Pts"
                                      className={`w-24 ${inputBaseStyles} py-2 px-3 text-sm`}
                                      min={0}
                                    />
                                    <button onClick={() => handleRemoveRubricItem(selectedQuestionIndex, rIndex)} className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded} text-xs`}>
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                          </div>
                          <button onClick={() => handleAddRubricItem(selectedQuestionIndex)} className={`${btnBase} ${btnExtruded} bg-slate-200 text-slate-700 text-xs py-2 w-auto`}>
                              <PlusCircleIcon className="h-4 w-4 mr-1" /> Add Criteria
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3">
                      <label className="text-sm font-medium text-slate-700">Rationale / Explanation (Optional)</label>
                      <MarkdownEditableField
                        value={currentQuestion.explanation || ''}
                        onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'explanation', e.target.value)}
                        fieldId="explanation"
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isTextarea={true}
                        placeholder="Explain why the answer is correct (for auto-graded items)..."
                      />
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-5 bg-slate-200/50 border-t border-slate-300/70">
        {error && <p className={`text-sm mb-4 text-center p-3 rounded-lg shadow-[inset_1px_1px_2px_#d1d9e8,inset_-1px_-1px_2px_#ffffff] ${hasInitialData ? 'text-blue-800 bg-blue-100' : 'text-red-800 bg-red-200'}`}>{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => handleAttemptNavigation(onClose)}
            disabled={loading}
            className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded} ${btnDisabled}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`${btnBase} ${hasInitialData ? 'bg-green-500 hover:bg-green-600' : 'bg-sky-500 hover:bg-sky-600'} text-white ${btnExtruded} ${btnDisabled}`}
          >
            {loading ? 'Saving...' : (hasInitialData ? 'Confirm & Save Quiz' : 'Add Quiz')}
          </button>
        </div>
      </div>

      {/* Warning Modal */}
      {isWarningModalOpen && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-150"
            onClick={handleCancelLeave}
          >
            <div 
              className="w-full max-w-md rounded-2xl bg-slate-200 p-6 shadow-[8px_8px_16px_#bdc1c6,-8px_-8px_16px_#ffffff] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 text-red-500 ${btnExtruded}`}>
                    <ExclamationTriangleIcon className="h-6 w-6" />
                </div>
                <Title className="text-xl font-semibold text-slate-800">Unsaved Changes</Title>
              </div>
              
              <p className="text-slate-600 sm:pl-[60px]">
                You have unsaved changes. Are you sure you want to leave? Your quiz will not be saved.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelLeave}
                  className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded} w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLeave}
                  className={`${btnBase} bg-red-500 hover:bg-red-600 text-white ${btnExtruded} w-auto`}
                >
                  Yes, Leave
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}