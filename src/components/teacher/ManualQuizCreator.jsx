import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../services/firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
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
  ChatBubbleLeftRightIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  PhotoIcon,
  CalculatorIcon,
  XMarkIcon,
  ArrowPathIcon,
  CursorArrowRaysIcon // Icon for "Click to Label" hint
} from '@heroicons/react/24/outline';

import ContentRenderer from './ContentRenderer'; 
import 'katex/dist/katex.min.css'; 

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'identification', label: 'Identification' },
  { value: 'matching-type', label: 'Matching Type' },
  { value: 'image-labeling', label: 'Image Labeling' },
  { value: 'essay', label: 'Essay' },
];

const MATH_SYMBOLS = [
    'π', '∑', '√', '∞', '≈', '≠', '≤', '≥', '±', '×', '÷', '°', 'θ', 'Δ', 'Ω', 'μ', 'α', 'β', '→', '⇌', '↑', '↓'
];

const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

// --- IMAGE UTILS ---
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024; 
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error('Canvas is empty'));
                    }
                }, 'image/jpeg', 0.7);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

const uploadImageToCloudinary = async (file) => {
    // REPLACE WITH YOUR CLOUD NAME & PRESET
    const CLOUDINARY_CLOUD_NAME = "de2uhc6gl"; 
    const CLOUDINARY_UPLOAD_PRESET = "teacher_posts"; 

    const compressedFile = await compressImage(file);
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "quiz_images"); 

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, 
        { method: "POST", body: formData }
    );

    if (!response.ok) throw new Error("Image upload failed");
    const data = await response.json();
    return data.secure_url;
};

// --- CUSTOM ICONS ---
const BoldIcon = (props) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>);
const ItalicIcon = (props) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>);
const H1Icon = (props) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17 18V6l-4 2" /></svg>);
const H2Icon = (props) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" /></svg>);
const H3Icon = (props) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" /></svg>);

// --- LANDSCAPE WARNING ---
const LandscapeWarning = () => (
    <div className="fixed inset-0 z-[100] bg-[#f5f5f7]/95 dark:bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center lg:hidden portrait:flex">
        <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-white/10 shadow-2xl flex items-center justify-center mb-8 animate-bounce-slow ring-1 ring-black/5">
            <DevicePhoneMobileIcon className="w-12 h-12 text-[#007AFF] rotate-90 stroke-[1.5]" />
        </div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Rotate to Edit</h3>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium">
            The quiz creator requires landscape mode for the best experience.
        </p>
    </div>
);

// --- MARKDOWN EDITOR ---
const MarkdownEditableField = ({
    value, onChange, fieldId, editingField, setEditingField, isTextarea = false, placeholder = "Click to edit"
}) => {
    const isEditing = editingField === fieldId;
    const textareaRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSymbolPicker, setShowSymbolPicker] = useState(false);

    const TEXT_COLORS = [
        { name: 'Blue', hex: '#007AFF' }, { name: 'Green', hex: '#34C759' },
        { name: 'Orange', hex: '#FF9500' }, { name: 'Red', hex: '#FF3B30' },
        { name: 'Purple', hex: '#AF52DE' }, { name: 'Black', hex: '#1d1d1f' },
    ];

    const adjustHeight = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    };

    useEffect(() => { if (isEditing) adjustHeight(); }, [isEditing, value]);

    const insertText = (textToInsert, cursorOffset = 0) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        onChange({ target: { value: newText } });
        setTimeout(() => {
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + textToInsert.length + cursorOffset;
        }, 0);
        setShowSymbolPicker(false);
    };

    const applyStyle = (startTag, endTag = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);
        const newText = `${text.substring(0, start)}${startTag}${selectedText}${endTag}${text.substring(end)}`;
        onChange({ target: { value: newText } });
    };

    const applyColor = (hex) => { applyStyle(`<span style="color: ${hex};">`, `</span>`); setShowColorPicker(false); };
    
    const ToolbarButton = ({ icon: Icon, text, tooltip, onClick, onMouseDown }) => (
        <button onClick={onClick} title={tooltip} onMouseDown={onMouseDown} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-all active:scale-90 flex items-center justify-center">
            {Icon ? <Icon className="w-5 h-5 stroke-[2]" /> : <span className="text-xs font-bold px-1">{text}</span>}
        </button>
    );

    if (isEditing) {
        const InputComponent = isTextarea ? 'textarea' : 'input';
        return (
            <div className="w-full bg-white dark:bg-[#1e1e1e] border border-black/5 dark:border-white/10 rounded-[16px] shadow-lg shadow-blue-500/10 overflow-visible ring-2 ring-[#007AFF] relative z-20">
                <div className="flex items-center flex-wrap gap-1 p-2 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md rounded-t-[16px]">
                    <ToolbarButton icon={BoldIcon} tooltip="Bold" onClick={() => applyStyle('**', '**')} onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton icon={ItalicIcon} tooltip="Italic" onClick={() => applyStyle('*', '*')} onMouseDown={(e) => e.preventDefault()} />
                    
                    {/* Math Tools */}
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                    <ToolbarButton text="½" tooltip="Fraction" onClick={() => insertText('$\\frac{a}{b}$', -1)} onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton text="x²" tooltip="Exponent" onClick={() => insertText('$x^{2}$', -1)} onMouseDown={(e) => e.preventDefault()} />
                    <ToolbarButton text="°" tooltip="Degree" onClick={() => insertText('$\\degree$')} onMouseDown={(e) => e.preventDefault()} />
                    
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                    
                    <div className="relative">
                        <ToolbarButton icon={PaintBrushIcon} tooltip="Color" onClick={() => setShowColorPicker(s => !s)} onMouseDown={(e) => e.preventDefault()} />
                        {showColorPicker && (
                            <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/10 p-2 rounded-[12px] shadow-xl flex gap-2">
                                {TEXT_COLORS.map(color => (<button key={color.name} onClick={() => applyColor(color.hex)} className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: color.hex }} />))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <ToolbarButton icon={CalculatorIcon} tooltip="Symbols" onClick={() => setShowSymbolPicker(s => !s)} onMouseDown={(e) => e.preventDefault()} />
                        {showSymbolPicker && (
                            <div onMouseLeave={() => setShowSymbolPicker(false)} className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/10 p-2 rounded-[12px] shadow-xl grid grid-cols-6 gap-1 w-64">
                                {MATH_SYMBOLS.map(sym => (
                                    <button key={sym} onClick={() => insertText(sym)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded text-sm font-mono text-slate-700 dark:text-slate-200">{sym}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <InputComponent
                    ref={textareaRef}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                    className={`w-full ${isTextarea ? 'min-h-[120px]' : ''} p-4 text-sm bg-transparent border-none resize-none focus:outline-none focus:ring-0 dark:text-slate-100`}
                    rows={isTextarea ? 3 : undefined}
                    placeholder={placeholder}
                />
            </div>
        );
    }

    return (
        <div onClick={() => setEditingField(fieldId)} className={`w-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[16px] ${isTextarea ? 'min-h-[120px] p-4' : 'min-h-[48px] py-3 px-4'} text-sm cursor-text dark:prose-invert dark:text-slate-100 hover:bg-white/80 dark:hover:bg-white/10 transition-colors shadow-sm backdrop-blur-sm`}>
            <ContentRenderer text={value || <span className="text-slate-400 dark:text-slate-600 italic">{placeholder}</span>} />
        </div>
    );
};

export default function ManualQuizCreator({ onClose, onBack, unitId, subjectId, initialData = null }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false); 
  const hasInitialData = !!initialData;
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(-1);
  const [editingField, setEditingField] = useState(null);

  // --- DRAGGABLE PIN LOGIC ---
  const [draggedPin, setDraggedPin] = useState(null); // { partIndex: number }
  const imageRef = useRef(null);

  // UI CONSTANTS
  const inputClass = "w-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[12px] px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#007AFF]/50 outline-none transition-all shadow-sm";

  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title || '');
        const populatedQuestions = (initialData.questions || []).map(q => ({
            text: '', points: 1, explanation: '', options: [], prompts: [], correctPairs: {}, rubric: [], image: null, parts: [], ...q 
        }));
        setQuestions(populatedQuestions);
        setSelectedQuestionIndex(populatedQuestions.length > 0 ? 0 : -1);
    } else {
        setTitle('');
        setQuestions([]);
        setSelectedQuestionIndex(-1);
    }
  }, [initialData]);

  const handleAddQuestion = () => {
    const newQuestion = {
        text: '',
        type: 'multiple-choice',
        points: 1,
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
    if (newQuestions.length === 0) setSelectedQuestionIndex(-1);
    else if (selectedQuestionIndex >= indexToRemove) setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1));
    setEditingField(null);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    const oldQuestion = newQuestions[index];
    let newQuestion = { ...oldQuestion, [field]: value };
    
    if (field === 'type') {
        if (value !== oldQuestion.type) {
            newQuestion = { text: oldQuestion.text, type: value, explanation: oldQuestion.explanation };
            switch (value) {
                case 'multiple-choice': newQuestion.options = ['', '', '']; newQuestion.correctAnswerIndex = 0; newQuestion.points = 1; break;
                case 'true-false': newQuestion.correctAnswer = true; newQuestion.points = 1; break;
                case 'identification': newQuestion.correctAnswer = ''; newQuestion.points = 1; break;
                case 'matching-type': newQuestion.prompts = [{ id: uniqueId(), text: '' }]; newQuestion.options = [{ id: uniqueId(), text: '' }]; newQuestion.correctPairs = {}; newQuestion.points = 1; break;
                case 'image-labeling': newQuestion.image = null; newQuestion.parts = []; newQuestion.points = 0; break;
                case 'essay': newQuestion.rubric = [{ id: uniqueId(), criteria: 'Content', points: 10 }]; newQuestion.points = 10; break;
                default: newQuestion.points = 1; break;
            }
        }
    }
    // Auto-calc points
    if (newQuestion.type === 'essay' && field !== 'points') {
        newQuestion.points = (newQuestion.rubric || []).reduce((sum, r) => sum + (Number(r.points) || 0), 0);
    }
    if (newQuestion.type === 'image-labeling' && field !== 'points') {
        newQuestion.points = (newQuestion.parts || []).length; // 1 point per label
    }
    if (newQuestion.type === 'matching-type' && field !== 'points') {
        newQuestion.points = (newQuestion.prompts || []).length;
    }

    newQuestions[index] = newQuestion;
    setQuestions(newQuestions);
  };

  // --- IMAGE LABELING HANDLERS (INTERACTIVE) ---
  const handleImageUpload = async (qIndex, file) => {
      setUploadingImage(true);
      try {
          const imageUrl = await uploadImageToCloudinary(file);
          const newQuestions = [...questions];
          newQuestions[qIndex].image = imageUrl;
          setQuestions(newQuestions);
      } catch (err) {
          console.error("Image upload error:", err);
          setError("Failed to upload image. Please try again.");
      } finally {
          setUploadingImage(false);
      }
  };

  const handleImageClick = (e, qIndex) => {
      // Only add if not dragging
      if (draggedPin !== null) return;

      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newQuestions = [...questions];
      const parts = newQuestions[qIndex].parts || [];
      parts.push({ 
          id: uniqueId(), 
          number: parts.length + 1, 
          correctAnswer: '',
          x: Math.max(0, Math.min(100, x)), // Clamp 0-100
          y: Math.max(0, Math.min(100, y))
      });
      newQuestions[qIndex].parts = parts;
      newQuestions[qIndex].points = parts.length;
      setQuestions(newQuestions);
  };

  // --- DRAG LOGIC ---
  // We'll use basic mouse events for drag
  const handlePinMouseDown = (e, pIndex) => {
      e.stopPropagation(); // Prevent adding new pin
      setDraggedPin({ pIndex });
  };

  const handleMouseMove = (e) => {
      if (draggedPin === null || !imageRef.current) return;
      
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newQuestions = [...questions];
      const part = newQuestions[selectedQuestionIndex].parts[draggedPin.pIndex];
      part.x = Math.max(0, Math.min(100, x));
      part.y = Math.max(0, Math.min(100, y));
      
      setQuestions(newQuestions);
  };

  const handleMouseUp = () => {
      setDraggedPin(null);
  };

  // Global mouse listeners for drag (attached to window when dragging)
  useEffect(() => {
      if (draggedPin !== null) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [draggedPin, questions]); // Re-bind if questions state changes mid-drag (less optimal but functional)


  const handleLabelPartChange = (qIndex, pIndex, val) => {
      const newQuestions = [...questions];
      newQuestions[qIndex].parts[pIndex].correctAnswer = val;
      setQuestions(newQuestions);
  };

  const handleRemoveLabelPart = (qIndex, pIndex) => {
      const newQuestions = [...questions];
      let parts = newQuestions[qIndex].parts || [];
      parts = parts.filter((_, i) => i !== pIndex);
      parts = parts.map((p, i) => ({ ...p, number: i + 1 })); // Renumber
      newQuestions[qIndex].parts = parts;
      newQuestions[qIndex].points = parts.length;
      setQuestions(newQuestions);
  };

  // --- OTHER HANDLERS ---
  const handleMatchingSubItemChange = (qIndex, type, idx, val) => {
      const newQ = [...questions]; newQ[qIndex][type][idx].text = val; setQuestions(newQ);
  };
  const handleAddMatchingItem = (qIndex, type) => {
      const newQ = [...questions]; 
      newQ[qIndex][type].push({ id: uniqueId(), text: '' });
      if(type === 'prompts') newQ[qIndex].points = newQ[qIndex][type].length; 
      setQuestions(newQ);
  };
  const handleRemoveMatchingItem = (qIndex, type, idx) => {
      const newQ = [...questions];
      if(type === 'prompts' && newQ[qIndex].correctPairs) delete newQ[qIndex].correctPairs[newQ[qIndex][type][idx].id];
      newQ[qIndex][type].splice(idx, 1);
      if(type === 'prompts') newQ[qIndex].points = newQ[qIndex][type].length;
      setQuestions(newQ);
  };
  const handlePairChange = (qIndex, promptId, optId) => {
      const newQ = [...questions];
      if(!newQ[qIndex].correctPairs) newQ[qIndex].correctPairs = {};
      newQ[qIndex].correctPairs[promptId] = optId;
      setQuestions(newQ);
  };
  const handleRubricChange = (qIndex, rIndex, field, val) => {
      const newQ = [...questions];
      newQ[qIndex].rubric[rIndex][field] = val;
      newQ[qIndex].points = newQ[qIndex].rubric.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
      setQuestions(newQ);
  };
  const handleAddRubricItem = (qIndex) => {
      const newQ = [...questions];
      newQ[qIndex].rubric.push({ id: uniqueId(), criteria: '', points: 0 });
      setQuestions(newQ);
  };
  const handleRemoveRubricItem = (qIndex, rIndex) => {
      const newQ = [...questions];
      newQ[qIndex].rubric.splice(rIndex, 1);
      newQ[qIndex].points = newQ[qIndex].rubric.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
      setQuestions(newQ);
  };
  const handleOptionTextChange = (qIndex, oIndex, val) => {
      const newQ = [...questions]; newQ[qIndex].options[oIndex] = val; setQuestions(newQ);
  };
  const handleAddOption = (qIndex) => {
      const newQ = [...questions]; newQ[qIndex].options.push(''); setQuestions(newQ);
  };
  const handleRemoveOption = (qIndex, oIndex) => {
      const newQ = [...questions]; 
      if(newQ[qIndex].options.length <= 3) return;
      newQ[qIndex].options.splice(oIndex, 1);
      if(newQ[qIndex].correctAnswerIndex >= oIndex) newQ[qIndex].correctAnswerIndex = Math.max(0, newQ[qIndex].correctAnswerIndex - 1);
      setQuestions(newQ);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return setError('Quiz title cannot be empty.');
    if (questions.length === 0) return setError('Please add at least one question.');
    
    for (const [i, q] of questions.entries()) {
        const label = `Question ${i + 1}`;
        if (!q.text.trim()) return setError(`${label}: Text is required.`);
        
        if (q.type === 'image-labeling') {
            if (!q.image) return setError(`${label}: Image is required.`);
            if (!q.parts || q.parts.length === 0) return setError(`${label}: Click on the image to label at least one part.`);
            if (q.parts.some(p => !p.correctAnswer.trim())) return setError(`${label}: All labels must have an answer.`);
        }
        if (q.type === 'matching-type') {
            if (!q.prompts.length || !q.options.length) return setError(`${label}: Needs prompts and options.`);
            for(const p of q.prompts) {
                if(!q.correctPairs?.[p.id]) return setError(`${label}: Map all prompts to an answer.`);
            }
        }
        if (q.type === 'essay' && q.rubric.length === 0) return setError(`${label}: Needs rubric.`);
    }

    setLoading(true); setError('');
    try {
      await addDoc(collection(db, 'quizzes'), {
        title, unitId, subjectId, questions, createdAt: serverTimestamp(),
        createdBy: hasInitialData ? 'ai-assisted' : 'manual' 
      });
      onClose();
    } catch (err) {
      setError("Failed to save quiz.");
    } finally { setLoading(false); }
  };

  const totalPoints = useMemo(() => questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0), [questions]);
  const currentQuestion = questions[selectedQuestionIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f5f5f7] dark:bg-[#121212] font-sans text-slate-900 dark:text-white overflow-hidden">
      <LandscapeWarning />

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-xl z-20 sticky top-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 transition-all active:scale-95">
                  <ArrowUturnLeftIcon className="w-5 h-5 stroke-[2.5] text-slate-600 dark:text-white" />
              </button>
              <div>
                  <h3 className="text-lg font-bold tracking-tight leading-none">{hasInitialData ? 'Review Quiz' : 'Quiz Creator'}</h3>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Manual Editor</p>
              </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/10 border border-black/5 dark:border-white/5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Points</span>
              <span className="text-sm font-black text-[#007AFF]">{totalPoints}</span>
          </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden p-4 gap-4 relative z-0">
        
        {/* Left Pane: Sidebar */}
        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm overflow-hidden ring-1 ring-white/20 dark:ring-white/5">
            <div className="p-5 space-y-4 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Quiz Title"
                    className={`${inputClass} font-bold text-lg bg-white/80 dark:bg-white/10`}
                />
            </div>

            <div className="flex-grow overflow-y-auto p-3 custom-scrollbar space-y-2">
                {questions.map((q, qIndex) => (
                    <button
                        key={qIndex} 
                        onClick={() => { setSelectedQuestionIndex(qIndex); setEditingField(null); }}
                        className={`w-full text-left p-3.5 rounded-[16px] transition-all duration-200 flex flex-col gap-1
                            ${selectedQuestionIndex === qIndex
                            ? 'bg-white dark:bg-white/10 shadow-lg ring-1 ring-black/5 dark:ring-white/10 scale-[1.02] z-10'
                            : 'hover:bg-white/50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className={`font-bold text-sm ${selectedQuestionIndex === qIndex ? 'text-slate-900 dark:text-white' : ''}`}>Question {qIndex + 1}</span>
                            {selectedQuestionIndex === qIndex && <div className="h-2 w-2 rounded-full bg-[#007AFF] shadow-lg shadow-blue-500/50"></div>}
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-medium opacity-60 uppercase tracking-wide">{q.type.replace('-', ' ')}</span>
                            <span className="text-[10px] font-bold opacity-80 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">{q.points} pts</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/20 backdrop-blur-md">
              <button onClick={handleAddQuestion} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-[16px] bg-white/80 dark:bg-white/10 hover:bg-[#007AFF]/10 dark:hover:bg-white/20 shadow-sm border border-black/5 dark:border-white/5 text-sm font-bold text-[#007AFF] dark:text-white transition-all active:scale-95 group">
                <PlusCircleIcon className="h-5 w-5 stroke-[2.5] transition-transform group-hover:rotate-90" /> Add Question
              </button>
            </div>
        </div>

        {/* Right Pane: Editor */}
        <div className="flex-grow flex flex-col min-h-0 bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm overflow-hidden ring-1 ring-white/20 dark:ring-white/5">
            {!currentQuestion ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <div className="w-24 h-24 rounded-[28px] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6 shadow-inner border border-black/5 dark:border-white/5">
                        <DocumentTextIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">No Question Selected</p>
                </div>
            ) : (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                        <h3 className="text-lg font-bold tracking-tight">Question {selectedQuestionIndex + 1}</h3>
                        <button onClick={() => handleRemoveQuestion(selectedQuestionIndex)} className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="h-5 w-5 stroke-[2]" />
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-8">
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Prompt</label>
                                <MarkdownEditableField
                                    value={currentQuestion.text || ''}
                                    onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'text', e.target.value)}
                                    fieldId="question-text"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    isTextarea={true}
                                    placeholder="Type your question here..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Type</label>
                                    <div className="relative">
                                        <select
                                            value={currentQuestion.type || 'multiple-choice'} 
                                            onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'type', e.target.value)}
                                            className={`${inputClass} appearance-none`}
                                        >
                                            {questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Points</label>
                                    <input
                                        type="number"
                                        value={currentQuestion.points || 1} 
                                        disabled={['matching-type', 'essay', 'image-labeling'].includes(currentQuestion.type)}
                                        onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'points', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className={`${inputClass} ${['matching-type', 'essay', 'image-labeling'].includes(currentQuestion.type) ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/5' : ''}`}
                                        min={1}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-black/5 dark:bg-white/5 w-full" />

                            <div className="space-y-6">
                                {/* Multiple Choice */}
                                {currentQuestion.type === 'multiple-choice' && (
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Options</label>
                                        {(currentQuestion.options || []).map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center gap-3 group">
                                                <div onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswerIndex', oIndex)} className={`w-6 h-6 rounded-full flex items-center justify-center border cursor-pointer transition-all ${currentQuestion.correctAnswerIndex === oIndex ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-slate-600'}`}>
                                                    {currentQuestion.correctAnswerIndex === oIndex && <CheckIcon className="w-4 h-4 stroke-[3]" />}
                                                </div>
                                                <div className="flex-1"><MarkdownEditableField value={opt.text || opt || ''} onChange={(e) => handleOptionTextChange(selectedQuestionIndex, oIndex, e.target.value)} fieldId={`option-${oIndex}`} editingField={editingField} setEditingField={setEditingField} placeholder={`Option ${oIndex + 1}`} /></div>
                                                <button onClick={() => handleRemoveOption(selectedQuestionIndex, oIndex)} disabled={currentQuestion.options.length <= 3} className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-0"><TrashIcon className="w-5 h-5 stroke-[2]" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddOption(selectedQuestionIndex)} className="text-sm font-bold text-[#007AFF] hover:underline flex items-center gap-1 mt-2 ml-9"><PlusCircleIcon className="w-4 h-4 stroke-[2.5]" /> Add Option</button>
                                    </div>
                                )}

                                {/* Image Labeling - INTERACTIVE */}
                                {currentQuestion.type === 'image-labeling' && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-white/60 dark:bg-white/5 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Diagram Source</label>
                                                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 bg-[#007AFF] text-white text-xs font-bold rounded-[12px] hover:bg-[#0062CC] transition-all shadow-lg shadow-blue-500/30 ${uploadingImage ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                                    {uploadingImage ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PhotoIcon className="w-4 h-4" />} 
                                                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(e) => e.target.files[0] && handleImageUpload(selectedQuestionIndex, e.target.files[0])} />
                                                </label>
                                            </div>
                                            
                                            {currentQuestion.image ? (
                                                <div className="relative rounded-[16px] overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 group">
                                                    <img 
                                                        src={currentQuestion.image} 
                                                        alt="Diagram" 
                                                        className="w-full h-auto object-contain max-h-[500px] cursor-crosshair"
                                                        ref={imageRef}
                                                        onClick={(e) => handleImageClick(e, selectedQuestionIndex)}
                                                    />
                                                    
                                                    {/* Interactive Pins */}
                                                    {(currentQuestion.parts || []).map((part, pIndex) => (
                                                        <div
                                                            key={part.id}
                                                            onMouseDown={(e) => handlePinMouseDown(e, pIndex)}
                                                            className="absolute w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-lg cursor-move hover:scale-110 transition-transform z-10"
                                                            style={{ left: `${part.x}%`, top: `${part.y}%`, transform: 'translate(-50%, -50%)' }}
                                                        >
                                                            {part.number}
                                                        </div>
                                                    ))}

                                                    <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Click image to label
                                                    </div>
                                                    <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'image', null)} className="absolute bottom-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-transform hover:scale-110 opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="h-48 rounded-[16px] border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-white/5">
                                                    <PhotoIcon className="w-12 h-12 mb-2 opacity-50" />
                                                    <span className="text-sm font-medium">No image uploaded</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Correct Answers</label>
                                                <span className="text-xs font-bold text-[#007AFF] bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                                    <CursorArrowRaysIcon className="w-3 h-3" /> Click pins to drag
                                                </span>
                                            </div>
                                            {(currentQuestion.parts || []).map((part, pIndex) => (
                                                <div key={part.id} className="flex items-center gap-3 p-2 bg-white/40 dark:bg-white/5 rounded-[12px] border border-black/5 dark:border-white/5">
                                                    <div className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center font-bold text-sm text-white shadow-md shrink-0">{part.number}</div>
                                                    <div className="flex-1"><input type="text" value={part.correctAnswer} onChange={(e) => handleLabelPartChange(selectedQuestionIndex, pIndex, e.target.value)} placeholder={`Correct Answer for Part ${part.number}`} className={inputClass} /></div>
                                                    <button onClick={() => handleRemoveLabelPart(selectedQuestionIndex, pIndex)} className="p-2 text-slate-400 hover:text-red-500 bg-white dark:bg-white/10 rounded-full shadow-sm hover:shadow-md transition-all"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            {(!currentQuestion.parts || currentQuestion.parts.length === 0) && (
                                                <p className="text-center text-sm text-slate-400 italic py-2">Click on the image above to add labels.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Matching Type */}
                                {currentQuestion.type === 'matching-type' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between"><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prompts (Column A)</label></div>
                                            {(currentQuestion.prompts || []).map((p, idx) => (
                                                <div key={p.id} className="flex gap-2 items-center">
                                                    <div className="w-6 text-center font-bold text-slate-400 text-sm">{idx + 1}.</div>
                                                    <div className="flex-1"><MarkdownEditableField value={p.text} onChange={(e) => handleMatchingSubItemChange(selectedQuestionIndex, 'prompts', idx, e.target.value)} fieldId={`prompt-${idx}`} editingField={editingField} setEditingField={setEditingField} placeholder={`Prompt ${idx + 1}`} /></div>
                                                    <div className="w-24"><select value={currentQuestion.correctPairs?.[p.id] || ''} onChange={(e) => handlePairChange(selectedQuestionIndex, p.id, e.target.value)} className={inputClass}><option value="" disabled>Match</option>{(currentQuestion.options || []).map((o, oid) => <option key={o.id} value={o.id}>{String.fromCharCode(65 + oid)}</option>)}</select></div>
                                                    <button onClick={() => handleRemoveMatchingItem(selectedQuestionIndex, 'prompts', idx)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddMatchingItem(selectedQuestionIndex, 'prompts')} className="w-full py-2 border border-dashed border-slate-300 dark:border-white/10 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5">Add Prompt</button>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between"><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Options (Column B)</label></div>
                                            {(currentQuestion.options || []).map((o, idx) => (
                                                <div key={o.id} className="flex gap-2 items-center">
                                                    <div className="w-6 text-center font-bold text-slate-400 text-sm">{String.fromCharCode(65 + idx)}.</div>
                                                    <div className="flex-1"><MarkdownEditableField value={o.text} onChange={(e) => handleMatchingSubItemChange(selectedQuestionIndex, 'options', idx, e.target.value)} fieldId={`opt-${idx}`} editingField={editingField} setEditingField={setEditingField} placeholder={`Option ${String.fromCharCode(65 + idx)}`} /></div>
                                                    <button onClick={() => handleRemoveMatchingItem(selectedQuestionIndex, 'options', idx)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddMatchingItem(selectedQuestionIndex, 'options')} className="w-full py-2 border border-dashed border-slate-300 dark:border-white/10 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5">Add Option</button>
                                        </div>
                                    </div>
                                )}

                                {/* Essay */}
                                {currentQuestion.type === 'essay' && (
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Rubric</label>
                                        <div className="bg-white/60 dark:bg-white/5 rounded-[16px] border border-black/5 dark:border-white/5 overflow-hidden">
                                            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50/50 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-[10px] font-bold text-slate-500 uppercase">
                                                <div className="col-span-9">Criteria</div>
                                                <div className="col-span-2 text-center">Points</div>
                                            </div>
                                            {(currentQuestion.rubric || []).map((r, idx) => (
                                                <div key={r.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-black/5 dark:border-white/5 items-center last:border-0">
                                                    <div className="col-span-9"><MarkdownEditableField value={r.criteria} onChange={(e) => handleRubricChange(selectedQuestionIndex, idx, 'criteria', e.target.value)} fieldId={`rubric-${idx}`} editingField={editingField} setEditingField={setEditingField} placeholder="Criteria Description" /></div>
                                                    <div className="col-span-2"><input type="number" value={r.points} onChange={(e) => handleRubricChange(selectedQuestionIndex, idx, 'points', e.target.value)} className={`${inputClass} text-center`} min="1" /></div>
                                                    <div className="col-span-1 flex justify-end"><button onClick={() => handleRemoveRubricItem(selectedQuestionIndex, idx)} className="text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button></div>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => handleAddRubricItem(selectedQuestionIndex)} className="text-sm font-bold text-[#007AFF] hover:underline flex items-center gap-1"><PlusCircleIcon className="w-4 h-4" /> Add Criteria</button>
                                    </div>
                                )}

                                {/* Identification & True/False */}
                                {currentQuestion.type === 'identification' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Correct Answer</label>
                                        <input value={currentQuestion.correctAnswer || ''} onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', e.target.value)} className={inputClass} placeholder="Exact match answer..." />
                                    </div>
                                )}
                                {currentQuestion.type === 'true-false' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Correct Answer</label>
                                        <div className="flex p-1 bg-slate-100 dark:bg-black/20 rounded-[12px] w-fit">
                                            <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', true)} className={`px-6 py-2 rounded-[10px] text-sm font-bold transition-all ${currentQuestion.correctAnswer === true ? 'bg-white dark:bg-[#3A3A3C] text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500'}`}>True</button>
                                            <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', false)} className={`px-6 py-2 rounded-[10px] text-sm font-bold transition-all ${currentQuestion.correctAnswer === false ? 'bg-white dark:bg-[#3A3A3C] text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500'}`}>False</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Explanation */}
                            <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Rationale (Optional)</label>
                                <MarkdownEditableField
                                    value={currentQuestion.explanation || ''}
                                    onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'explanation', e.target.value)}
                                    fieldId="explanation"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    isTextarea={true}
                                    placeholder="Explain why the answer is correct..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-t border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-xl z-20">
        <p className="text-sm font-bold text-red-500 ml-2">{error}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-[16px] font-bold text-sm text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-black/5 dark:border-white/5 transition-all shadow-sm active:scale-95">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 font-bold text-sm bg-gradient-to-r from-[#007AFF] to-[#0051A8] hover:shadow-blue-500/40 text-white shadow-lg shadow-blue-500/30 transition-all rounded-[16px] disabled:bg-slate-400 disabled:shadow-none active:scale-95 flex items-center gap-2">
            {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <CheckIcon className="w-5 h-5 stroke-[2.5]"/>}
            {loading ? 'Saving...' : (hasInitialData ? 'Save Changes' : 'Create Quiz')}
          </button>
        </div>
      </div>
    </div>
  );
}