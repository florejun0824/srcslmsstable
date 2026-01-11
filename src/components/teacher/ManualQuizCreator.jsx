import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { db } from '../../services/firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import {
  PlusCircleIcon, TrashIcon, ArrowUturnLeftIcon, DocumentTextIcon, PhotoIcon, CalculatorIcon, CheckIcon,
  ComputerDesktopIcon, EyeIcon, ListBulletIcon, QueueListIcon, ChatBubbleLeftRightIcon, PaintBrushIcon,
  CursorArrowRaysIcon, ArrowPathIcon, XMarkIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import ContentRenderer from './ContentRenderer'; 
import 'katex/dist/katex.min.css'; 

// --- CONSTANTS ---
const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: ListBulletIcon },
  { value: 'true-false', label: 'True/False', icon: CheckIcon },
  { value: 'identification', label: 'Identification', icon: DocumentTextIcon },
  { value: 'matching-type', label: 'Matching Type', icon: QueueListIcon },
  { value: 'image-labeling', label: 'Image Labeling', icon: PhotoIcon },
  { value: 'essay', label: 'Essay', icon: ChatBubbleLeftRightIcon },
];

const MATH_SYMBOLS = [
    'π', '∑', '√', '∞', '≈', '≠', '≤', '≥', '±', '×', '÷', '°', 'θ', 'Δ', 'Ω', 'μ', 'α', 'β', '→', '⇌', '↑', '↓'
];

const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

// --- VISUAL NUMBERING HELPER ---
const getQuestionDisplayLabel = (index, allQuestions) => {
    let count = 0;
    for (let i = 0; i < index; i++) {
        const q = allQuestions[i];
        if (q.type === 'matching-type' || q.type === 'essay') {
            count += (q.points || 1); 
        } else {
            count += 1;
        }
    }
    
    const currentQ = allQuestions[index];
    const currentLength = (currentQ.type === 'matching-type' || currentQ.type === 'essay') 
        ? (currentQ.points || 1) 
        : 1;
    
    const start = count + 1;
    const end = count + currentLength;
    
    if (currentLength > 1) return `Qs ${start}-${end - 1}`;
    return `Question ${start}`;
};

// --- CUSTOM ICONS ---
const BoldIcon = (props) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>);
const ItalicIcon = (props) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>);
const UnderlineIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>);

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

// --- MARKDOWN EDITOR COMPONENT (Memoized) ---
const MarkdownEditor = memo(({ value, onValueChange, placeholder = "Type content here...", minHeight = "120px" }) => {
    const textareaRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSymbolPicker, setShowSymbolPicker] = useState(false);

    const TEXT_COLORS = [
        { name: 'Blue', hex: '#007AFF' }, { name: 'Green', hex: '#34C759' },
        { name: 'Orange', hex: '#FF9500' }, { name: 'Red', hex: '#FF3B30' },
        { name: 'Purple', hex: '#AF52DE' }, { name: 'Black', hex: '#1d1d1f' },
    ];

    const adjustHeight = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    }, []);

    useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

    const insertText = useCallback((textToInsert, cursorOffset = 0) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        
        onValueChange && onValueChange(newText);
        
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + textToInsert.length + cursorOffset;
        }, 0);
        setShowSymbolPicker(false);
    }, [onValueChange, adjustHeight]);

    const applyStyle = useCallback((startTag, endTag = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);
        const newText = `${text.substring(0, start)}${startTag}${selectedText}${endTag}${text.substring(end)}`;
        onValueChange && onValueChange(newText);
    }, [onValueChange]);

    const applyColor = useCallback((hex) => {
        applyStyle(`<span style="color: ${hex};">`, `</span>`);
        setShowColorPicker(false);
    }, [applyStyle]);

    const ToolbarButton = ({ icon: Icon, text, tooltip, onClick }) => (
        <button
            onClick={onClick}
            title={tooltip}
            onMouseDown={(e) => e.preventDefault()}
            className="p-2 min-w-[32px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-all active:scale-90 flex items-center justify-center"
        >
            {Icon ? <Icon className="w-4 h-4 stroke-[2.5]" /> : <span className="text-[11px] font-bold px-1">{text}</span>}
        </button>
    );

    return (
        <div className="flex flex-col w-full border border-black/5 dark:border-white/10 rounded-[18px] bg-white dark:bg-[#252525] overflow-visible focus-within:ring-2 focus-within:ring-[#007AFF]/50 transition-all shadow-sm">
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 rounded-t-[18px]">
                <ToolbarButton icon={BoldIcon} tooltip="Bold" onClick={() => applyStyle('**', '**')} />
                <ToolbarButton icon={ItalicIcon} tooltip="Italic" onClick={() => applyStyle('*', '*')} />
                <ToolbarButton icon={UnderlineIcon} tooltip="Underline" onClick={() => applyStyle('<u>', '</u>')} />
                <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>
                <ToolbarButton text="½" tooltip="Fraction" onClick={() => insertText('$\\frac{a}{b}$', -1)} />
                <ToolbarButton text="x²" tooltip="Exponent" onClick={() => insertText('$x^{2}$', -1)} />
                
                <div className="relative">
                     <ToolbarButton icon={CalculatorIcon} tooltip="Symbols" onClick={() => setShowSymbolPicker(s => !s)} />
                     {showSymbolPicker && (
                        <div onMouseLeave={() => setShowSymbolPicker(false)} className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/10 p-2 rounded-[16px] shadow-xl grid grid-cols-6 gap-1 w-64 backdrop-blur-xl">
                            {MATH_SYMBOLS.map(sym => (
                                <button key={sym} onClick={() => insertText(sym)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-200 transition-colors">{sym}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <ToolbarButton icon={PaintBrushIcon} tooltip="Color" onClick={() => setShowColorPicker(s => !s)} />
                    {showColorPicker && (
                        <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/10 p-3 rounded-[16px] shadow-xl flex gap-2 backdrop-blur-xl">
                            {TEXT_COLORS.map(color => (
                                <button key={color.name} onClick={() => applyColor(color.hex)} className="w-6 h-6 rounded-full border border-black/5 shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: color.hex }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <textarea
                ref={textareaRef}
                value={value || ''}
                onChange={(e) => onValueChange && onValueChange(e.target.value)}
                className="w-full p-4 text-[15px] leading-relaxed resize-none border-none focus:outline-none focus:ring-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium"
                placeholder={placeholder}
                style={{ minHeight }}
                spellCheck="false"
            />
        </div>
    );
});

// --- IMAGE PIN CANVAS (OPTIMIZED DRAG STATE) ---
const ImagePinCanvas = memo(({ image, parts, onPartsChange }) => {
    const imageRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    // Local state to prevent global re-renders
    const [localParts, setLocalParts] = useState(parts);

    // Sync local state when prop changes, but NOT while dragging
    useEffect(() => {
        if (!draggingId) {
            setLocalParts(parts);
        }
    }, [parts, draggingId]);

    const handleMouseDown = (e, partId) => {
        e.stopPropagation();
        setDraggingId(partId);
    };

    const handleMouseMove = useCallback((e) => {
        if (!draggingId || !imageRef.current) return;
        
        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setLocalParts(prev => prev.map(p => 
            p.id === draggingId 
                ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } 
                : p
        ));
    }, [draggingId]);

    const handleMouseUp = useCallback(() => {
        if (draggingId) {
            // Commit changes to parent
            onPartsChange(localParts);
            setDraggingId(null);
        }
    }, [draggingId, localParts, onPartsChange]);

    const handleImageClick = (e) => {
        if (draggingId || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        const newPart = {
            id: uniqueId(),
            number: parts.length + 1,
            correctAnswer: '',
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
        };
        onPartsChange([...parts, newPart]);
    };

    useEffect(() => {
        if (draggingId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingId, handleMouseMove, handleMouseUp]);

    return (
        <div className="relative rounded-[20px] overflow-hidden border border-black/5 dark:border-white/10 bg-slate-100 group select-none shadow-inner">
            <img 
                ref={imageRef} 
                src={image} 
                className="w-full h-auto cursor-crosshair" 
                onClick={handleImageClick} 
                alt="diagram" 
            />
            {localParts.map((p) => (
                <div 
                    key={p.id} 
                    onMouseDown={(e) => handleMouseDown(e, p.id)} 
                    className={`absolute w-9 h-9 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-bold border-[3px] border-white shadow-xl cursor-move hover:scale-110 transition-transform z-10 ${draggingId === p.id ? 'scale-110 z-20' : ''}`} 
                    style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                    {p.number}
                </div>
            ))}
            <div className="absolute top-4 right-4 bg-black/60 text-white text-[11px] px-3 py-2 rounded-[12px] backdrop-blur-xl font-bold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shadow-lg">
                <CursorArrowRaysIcon className="w-3 h-3"/> Click to label • Drag to move
            </div>
        </div>
    );
});

// --- PREVIEW COMPONENT (Memoized) ---
const PreviewCard = memo(({ question, index, displayLabel }) => {
    if (!question) return <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10"><DocumentTextIcon className="w-12 h-12 mb-3 opacity-30"/><span className="font-bold text-sm">Select a question to preview</span></div>;

    const inputClass = "w-full bg-slate-50 dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10 rounded-[16px] px-4 py-3 text-[15px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all shadow-sm";

    return (
        <div className="bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-[28px] shadow-lg p-8 space-y-6 h-full overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-black/5 dark:border-white/5 pb-5">
                <div className="flex-1 mr-6">
                    <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-2.5">{displayLabel}</h4>
                    <div className="prose prose-sm dark:prose-invert leading-relaxed text-slate-900 dark:text-white font-medium text-[15px]">
                        <ContentRenderer text={question.text || 'Question Prompt...'} />
                    </div>
                </div>
                <span className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-[10px] whitespace-nowrap shadow-sm">
                    {question.points} pts
                </span>
            </div>

            {/* Content Body - COMPACT MODE */}
            <div className="space-y-4">
                {question.type === 'multiple-choice' && (
                    <div className="space-y-2.5">
                        {question.options.map((opt, i) => (
                            <div key={i} className={`flex items-start gap-3 py-3 px-4 rounded-[14px] border transition-all ${question.correctAnswerIndex === i ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-sm' : 'border-black/5 dark:border-white/10 bg-slate-50 dark:bg-white/5'}`}>
                                <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${question.correctAnswerIndex === i ? 'border-green-500 bg-green-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {question.correctAnswerIndex === i && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <div className="text-[14px] text-slate-700 dark:text-slate-200 leading-snug font-medium"><ContentRenderer text={opt || `Option ${i+1}`} /></div>
                            </div>
                        ))}
                    </div>
                )}
                
                {question.type === 'true-false' && (
                    <div className="flex gap-3">
                        {['True', 'False'].map(val => (
                            <div key={val} className={`flex-1 py-3 text-center rounded-[14px] font-bold text-[14px] border transition-all ${question.correctAnswer === (val === 'True') ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-500/20' : 'bg-slate-50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-500'}`}>
                                {val}
                            </div>
                        ))}
                    </div>
                )}

                {question.type === 'identification' && (
                    <div>
                        <input disabled placeholder="Student types answer here..." className={`${inputClass} text-sm py-3`} />
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-[14px] border border-green-200 dark:border-green-900/30 flex items-center gap-2">
                            <span className="text-[10px] text-green-700 dark:text-green-400 font-bold uppercase tracking-wide">Answer:</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{question.correctAnswer || 'Not set'}</span>
                        </div>
                    </div>
                )}

                {question.type === 'matching-type' && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                             <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Column A</p>
                             {question.prompts.map((p,i) => (
                                 <div key={i} className="p-3 bg-slate-50 dark:bg-white/5 rounded-[12px] border border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-200 text-xs shadow-sm flex gap-2">
                                     <span className="font-bold opacity-50">{i+1}.</span> <ContentRenderer text={p.text} />
                                 </div>
                             ))}
                        </div>
                        <div className="space-y-2">
                             <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Column B</p>
                             {question.options.map((o,i) => (
                                 <div key={i} className="p-3 bg-slate-50 dark:bg-white/5 rounded-[12px] border border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-200 text-xs shadow-sm flex gap-2">
                                     <span className="font-bold opacity-50">{String.fromCharCode(65+i)}.</span> <ContentRenderer text={o.text} />
                                 </div>
                             ))}
                        </div>
                    </div>
                )}

                {question.type === 'essay' && (
                    <div className="space-y-3">
                        <textarea disabled className={`${inputClass} min-h-[100px] resize-none bg-slate-50 text-sm`} placeholder="Student response area..." />
                        <div className="bg-slate-50 dark:bg-white/5 rounded-[14px] p-3 border border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wide">Grading Rubric</p>
                            <div className="space-y-1.5">
                                {question.rubric.map((r, idx) => (
                                    <div key={idx} className="flex justify-between text-[12px] text-slate-600 dark:text-slate-300 font-medium">
                                        <span className="truncate pr-2">• <ContentRenderer text={r.criteria} /></span>
                                        <span className="font-bold flex-shrink-0 bg-white dark:bg-black/20 px-1.5 py-0.5 rounded">{r.points} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {question.type === 'image-labeling' && (
                    <div className="space-y-3">
                        {question.image ? (
                            <div className="relative rounded-[16px] overflow-hidden border border-black/5 dark:border-white/10 bg-slate-100 dark:bg-black/20 shadow-sm">
                                <img src={question.image} className="w-full h-auto" alt="Quiz" />
                                {question.parts.map((part) => (
                                    <div key={part.id} className="absolute w-6 h-6 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md" style={{ left: `${part.x}%`, top: `${part.y}%`, transform: 'translate(-50%, -50%)' }}>
                                        {part.number}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-28 bg-slate-50 rounded-[16px] flex items-center justify-center text-xs text-slate-400 font-bold border-2 border-dashed border-slate-200">No Image Preview</div>
                        )}
                        <div className="bg-slate-50 dark:bg-white/5 rounded-[14px] p-3 border border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wide">Answer Key</p>
                            <div className="flex flex-wrap gap-2">
                                {question.parts.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-[11px] bg-white dark:bg-black/10 px-2.5 py-1.5 rounded-[10px] border border-black/5 shadow-sm">
                                        <span className="w-4 h-4 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-[9px]">{p.number}</span>
                                        <span className="text-slate-700 dark:text-slate-300 max-w-[120px] truncate font-bold">{p.correctAnswer || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {question.explanation && (
                <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-[16px] border border-blue-100 dark:border-blue-900/30 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase text-blue-500 mb-1.5 tracking-wide">Rationale</p>
                    <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        <ContentRenderer text={question.explanation} />
                    </div>
                </div>
            )}
        </div>
    );
});

// --- MOBILE RESTRICTION OVERLAY ---
const MobileRestricted = ({ onClose }) => (
    <div className="fixed inset-0 z-[300] bg-[#f5f5f7] dark:bg-[#000000] flex flex-col items-center justify-center p-8 text-center md:hidden animate-in fade-in duration-300">
        <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-[#1c1c1e] shadow-2xl flex items-center justify-center mb-8 border border-black/5 dark:border-white/10">
            <ComputerDesktopIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Desktop Required</h3>
        <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm">Go Back</button>
    </div>
);

// --- DISCARD CHANGES MODAL ---
const DiscardChangesModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] shadow-2xl p-6 max-w-sm w-full border border-black/5 dark:border-white/10 scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-5 text-red-500 shadow-lg shadow-red-500/20">
                        <ExclamationTriangleIcon className="w-8 h-8 stroke-[2]" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unsaved Changes</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                        Are you sure you want to leave? All progress on this quiz will be lost forever.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 py-3.5 rounded-[18px] font-bold text-sm bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                            Keep Editing
                        </button>
                        <button onClick={onConfirm} className="flex-1 py-3.5 rounded-[18px] font-bold text-sm bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all active:scale-95">
                            Discard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ManualQuizCreator({ onClose, onBack, unitId, subjectId, initialData = null }) {
  // --- STATE ---
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false); 
  const hasInitialData = !!initialData;
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(-1);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Styling Constants (OneUI)
  const inputClass = "w-full bg-slate-50 dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10 rounded-[16px] px-4 py-3 text-[15px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all shadow-sm";

  // --- INITIALIZATION ---
  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title || '');
        const populatedQuestions = (initialData.questions || []).map(q => ({
            id: q.id || uniqueId(),
            text: '', points: 1, explanation: '', options: [], prompts: [], correctPairs: {}, rubric: [], image: null, parts: [], 
            ...q 
        }));
        setQuestions(populatedQuestions);
        setSelectedQuestionIndex(populatedQuestions.length > 0 ? 0 : -1);
    } else {
        // Start with one question
        const initQ = {
            id: uniqueId(),
            text: '',
            type: 'multiple-choice',
            points: 1,
            options: ['', '', ''],
            correctAnswerIndex: 0,
            explanation: ''
        };
        setQuestions([initQ]);
        setSelectedQuestionIndex(0);
    }
  }, [initialData]);

  // --- QUESTION MANAGEMENT ---
  const handleAddQuestion = useCallback(() => {
    const newQuestion = {
        id: uniqueId(),
        text: '',
        type: 'multiple-choice',
        points: 1,
        options: ['', '', ''],
        correctAnswerIndex: 0,
        explanation: ''
    };
    setQuestions(prev => {
        const newQs = [...prev, newQuestion];
        setSelectedQuestionIndex(newQs.length - 1);
        return newQs;
    });
  }, []);

  const handleRemoveQuestion = useCallback((indexToRemove) => {
    setQuestions(prev => {
        const newQuestions = prev.filter((_, i) => i !== indexToRemove);
        if (newQuestions.length === 0) {
            setSelectedQuestionIndex(-1);
        } else if (selectedQuestionIndex >= indexToRemove) {
            setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1));
        }
        return newQuestions;
    });
  }, [selectedQuestionIndex]);

  const handleQuestionChange = useCallback((index, field, value) => {
    setQuestions(prev => {
        const newQuestions = [...prev];
        const oldQuestion = newQuestions[index];
        let newQuestion = { ...oldQuestion, [field]: value };
        
        // Type Switching Logic (Reset defaults)
        if (field === 'type' && value !== oldQuestion.type) {
            newQuestion = { 
                id: oldQuestion.id, 
                text: oldQuestion.text, 
                type: value, 
                explanation: oldQuestion.explanation 
            };
            switch (value) {
                case 'multiple-choice': newQuestion.options = ['', '', '']; newQuestion.correctAnswerIndex = 0; newQuestion.points = 1; break;
                case 'true-false': newQuestion.correctAnswer = true; newQuestion.points = 1; break;
                case 'identification': newQuestion.correctAnswer = ''; newQuestion.points = 1; break;
                case 'matching-type': 
                    newQuestion.prompts = [{ id: uniqueId(), text: '' }]; 
                    newQuestion.options = [{ id: uniqueId(), text: '' }]; 
                    newQuestion.correctPairs = {}; 
                    newQuestion.points = 1; 
                    break;
                case 'image-labeling': newQuestion.image = null; newQuestion.parts = []; newQuestion.points = 0; break;
                case 'essay': 
                    newQuestion.rubric = [{ id: uniqueId(), criteria: 'Content', points: 10 }]; 
                    newQuestion.points = 10; 
                    break;
                default: newQuestion.points = 1; break;
            }
        }

        // Auto-calc points based on sub-items
        if (newQuestion.type === 'essay' && field !== 'points') {
            newQuestion.points = (newQuestion.rubric || []).reduce((sum, r) => sum + (Number(r.points) || 0), 0);
        }
        if (newQuestion.type === 'image-labeling' && field !== 'points') {
            newQuestion.points = (newQuestion.parts || []).length;
        }
        if (newQuestion.type === 'matching-type' && field !== 'points') {
            newQuestion.points = (newQuestion.prompts || []).length;
        }

        newQuestions[index] = newQuestion;
        return newQuestions;
    });
  }, []);

  // --- HANDLERS (Full Logic) ---

  // 1. Image Labeling
  const handleImageUpload = async (qIndex, file) => {
      setUploadingImage(true);
      try {
          const imageUrl = await uploadImageToCloudinary(file);
          handleQuestionChange(qIndex, 'image', imageUrl);
      } catch (err) {
          setError("Failed to upload image. Please try again.");
      } finally {
          setUploadingImage(false);
      }
  };

  // 2. Matching Type Handlers
  const handleMatchingSubItemChange = useCallback((qIndex, type, idx, val) => {
      setQuestions(prev => {
          const newQ = [...prev]; 
          newQ[qIndex][type][idx].text = val; 
          return newQ;
      });
  }, []);
  
  const handleAddMatchingItem = (qIndex, type) => {
      setQuestions(prev => {
        const newQ = [...prev]; 
        newQ[qIndex][type].push({ id: uniqueId(), text: '' });
        if(type === 'prompts') newQ[qIndex].points = newQ[qIndex][type].length; 
        return newQ;
      });
  };

  const handleRemoveMatchingItem = (qIndex, type, idx) => {
      setQuestions(prev => {
        const newQ = [...prev];
        if(type === 'prompts' && newQ[qIndex].correctPairs) {
             const promptId = newQ[qIndex][type][idx].id;
             delete newQ[qIndex].correctPairs[promptId];
        }
        newQ[qIndex][type].splice(idx, 1);
        if(type === 'prompts') newQ[qIndex].points = newQ[qIndex][type].length;
        return newQ;
      });
  };

  const handlePairChange = (qIndex, promptId, optId) => {
      setQuestions(prev => {
        const newQ = [...prev];
        if(!newQ[qIndex].correctPairs) newQ[qIndex].correctPairs = {};
        newQ[qIndex].correctPairs[promptId] = optId;
        return newQ;
      });
  };

  // 3. Essay Rubric Handlers
  const handleRubricChange = (qIndex, rIndex, field, val) => {
      setQuestions(prev => {
        const newQ = [...prev];
        newQ[qIndex].rubric[rIndex][field] = val;
        newQ[qIndex].points = newQ[qIndex].rubric.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
        return newQ;
      });
  };

  const handleAddRubricItem = (qIndex) => {
      setQuestions(prev => {
        const newQ = [...prev];
        newQ[qIndex].rubric.push({ id: uniqueId(), criteria: '', points: 0 });
        return newQ;
      });
  };

  const handleRemoveRubricItem = (qIndex, rIndex) => {
      setQuestions(prev => {
        const newQ = [...prev];
        newQ[qIndex].rubric.splice(rIndex, 1);
        newQ[qIndex].points = newQ[qIndex].rubric.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
        return newQ;
      });
  };

  // 4. Submission
  const handleSubmit = async () => {
    if (!title.trim()) return setError('Quiz title cannot be empty.');
    if (questions.length === 0) return setError('Please add at least one question.');
    
    // Validation
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

    setLoading(true); 
    setError('');
    try {
      await addDoc(collection(db, 'quizzes'), {
        title, unitId, subjectId, questions, createdAt: serverTimestamp(),
        createdBy: hasInitialData ? 'ai-assisted' : 'manual' 
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save quiz.");
    } finally { 
      setLoading(false); 
    }
  };

  // --- DERIVED STATE ---
  const currentQuestion = questions[selectedQuestionIndex];
  const totalPoints = useMemo(() => questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0), [questions]);
  const displayLabel = useMemo(() => selectedQuestionIndex > -1 ? getQuestionDisplayLabel(selectedQuestionIndex, questions) : '', [selectedQuestionIndex, questions]);

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-50 flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] font-sans text-slate-900 dark:text-white">
      <MobileRestricted onClose={onClose} />
      
      {/* CONFIRMATION MODAL */}
      <DiscardChangesModal 
        isOpen={showCancelModal} 
        onClose={() => setShowCancelModal(false)} 
        onConfirm={() => { setShowCancelModal(false); onClose(); }} 
      />

      {/* HEADER */}
      <div className="hidden md:block flex-shrink-0 px-8 py-5 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl z-20 sticky top-0 transition-all">
          <div className="flex items-center justify-between">
              {/* Left Side: Back + Title Input */}
              <div className="flex items-center gap-5 flex-1">
                  <button onClick={() => setShowCancelModal(true)} className="p-3 rounded-full bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-all active:scale-95 group">
                      <ArrowUturnLeftIcon className="w-5 h-5 stroke-[2.5] text-slate-600 dark:text-white group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                  <div className="flex flex-col w-full max-w-lg">
                      <input 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="Enter Quiz Title..." 
                        className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-900 dark:text-white placeholder-slate-300 tracking-tight" 
                      />
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manual Editor</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className="text-[11px] font-bold bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-full">{totalPoints} Points Total</span>
                      </div>
                  </div>
              </div>

              {/* Right Side: Actions (Cancel + Save) */}
              <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCancelModal(true)} 
                    className="px-6 py-3 font-bold text-sm bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 rounded-[16px] hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={loading} 
                    className="px-8 py-3 font-bold text-sm bg-[#007AFF] text-white rounded-[16px] shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-[#0051A8] hover:shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                  >
                      {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5 stroke-[2.5]" />}
                      {loading ? 'Saving...' : 'Save Quiz'}
                  </button>
              </div>
          </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-top-5 flex items-center gap-3 border border-white/10">
            <ExclamationTriangleIcon className="w-5 h-5 stroke-[2]" />
            {error}
            <XMarkIcon className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100 ml-2" onClick={() => setError('')} />
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="hidden md:flex flex-grow overflow-hidden p-6 gap-6">
          
          {/* LEFT: QUESTION LIST (Slightly narrower for balance) */}
          <div className="w-[280px] flex-shrink-0 flex flex-col bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm overflow-hidden">
             <div className="p-5 border-b border-black/5 dark:border-white/5 bg-slate-50/80 dark:bg-[#2c2c2e]/50 backdrop-blur-sm"><h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Question List</h3></div>
             <div className="flex-grow overflow-y-auto p-3 custom-scrollbar space-y-2">
                 {questions.map((q, i) => (
                     <div key={q.id} onClick={() => setSelectedQuestionIndex(i)} className={`group relative flex items-center justify-between p-3.5 rounded-[16px] cursor-pointer transition-all border ${selectedQuestionIndex === i ? 'bg-[#007AFF] border-[#007AFF] shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-[#2c2c2e] border-transparent hover:bg-slate-50 dark:hover:bg-[#3a3a3c]'}`}>
                         <div className="flex flex-col pl-1 overflow-hidden w-full">
                             <div className="flex justify-between items-center w-full">
                                 {/* --- VISUAL NUMBERING APPLIED HERE --- */}
                                 <span className={`font-bold text-[13px] truncate ${selectedQuestionIndex === i ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                     {getQuestionDisplayLabel(i, questions).replace('Question', '').replace('Qs', '')}. {q.text ? q.text.substring(0, 15) + '...' : 'New Question'}
                                 </span>
                             </div>
                             <span className={`text-[10px] font-bold uppercase mt-1 ${selectedQuestionIndex === i ? 'text-white/70' : 'text-slate-400'}`}>{q.type.replace('-', ' ')}</span>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(i); }} className={`p-1.5 rounded-lg transition-colors ${selectedQuestionIndex === i ? 'text-white/60 hover:bg-white/20 hover:text-white' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'} opacity-0 group-hover:opacity-100`}><TrashIcon className="h-4 w-4" /></button>
                     </div>
                 ))}
             </div>
             <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#1c1c1e]">
                <button onClick={handleAddQuestion} className="w-full flex justify-center items-center gap-2 px-4 py-3.5 rounded-[16px] bg-slate-50 dark:bg-[#3a3a3c] hover:bg-slate-100 dark:hover:bg-[#48484a] text-[13px] font-bold text-[#007AFF] border border-black/5 transition-all shadow-sm active:scale-95"><PlusCircleIcon className="w-5 h-5" /> Add New Question</button>
             </div>
          </div>

          {/* CENTER: EDITOR */}
          <div className="flex-1 flex flex-col bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm overflow-hidden min-w-0">
             {currentQuestion ? (
                 <>
                    {/* Editor Toolbar */}
                    <div className="flex items-center gap-5 p-6 border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#1c1c1e]">
                         <div className="flex-1">
                             <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-2">Question Type</span>
                             <div className="relative">
                                <select value={currentQuestion.type} onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'type', e.target.value)} className={`${inputClass} py-2.5 pl-4 pr-10 text-sm appearance-none cursor-pointer bg-slate-50 dark:bg-[#2c2c2e] hover:bg-slate-100`}>
                                    {questionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                             </div>
                         </div>
                         <div className="w-28">
                             <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-2">Points</span>
                             <input type="number" min="1" value={currentQuestion.points} onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'points', parseInt(e.target.value))} disabled={['matching-type', 'essay', 'image-labeling'].includes(currentQuestion.type)} className={`${inputClass} py-2.5 text-center bg-slate-50 dark:bg-[#2c2c2e] disabled:opacity-50 font-bold`} />
                         </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#FAFAFA] dark:bg-[#151515] p-8">
                        {/* Prompt Editor */}
                        <div className="space-y-3 mb-10">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Question Prompt</label>
                            <MarkdownEditor value={currentQuestion.text} onValueChange={(val) => handleQuestionChange(selectedQuestionIndex, 'text', val)} placeholder="Type your question prompt here..." minHeight="160px" />
                        </div>

                        <div className="h-px bg-black/5 dark:bg-white/5 w-full mb-10" />

                        {/* Dynamic Inputs Based on Type */}
                        <div className="space-y-8">
                            
                            {/* 1. Multiple Choice Options */}
                            {currentQuestion.type === 'multiple-choice' && (
                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Answer Options</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {currentQuestion.options.map((opt, idx) => (
                                            <div key={idx} className="flex gap-3 items-start group animate-in slide-in-from-left-2">
                                                <button 
                                                    onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswerIndex', idx)} 
                                                    className={`mt-2 w-7 h-7 rounded-full border-[3px] flex-shrink-0 flex items-center justify-center transition-all ${currentQuestion.correctAnswerIndex === idx ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20 scale-105' : 'bg-white border-slate-300 hover:border-green-300'}`}
                                                    title="Mark as correct"
                                                >
                                                    {currentQuestion.correctAnswerIndex === idx && <CheckIcon className="w-4 h-4 stroke-[4]" />}
                                                </button>
                                                <div className="flex-1">
                                                    <MarkdownEditor value={opt} onValueChange={(val) => { const newOpts = [...currentQuestion.options]; newOpts[idx] = val; handleQuestionChange(selectedQuestionIndex, 'options', newOpts); }} placeholder={`Option ${idx + 1}`} minHeight="60px" />
                                                </div>
                                                <button onClick={() => { const newOpts = currentQuestion.options.filter((_, i) => i !== idx); handleQuestionChange(selectedQuestionIndex, 'options', newOpts); }} className="mt-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-[12px] transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'options', [...currentQuestion.options, ''])} className="text-sm font-bold text-[#007AFF] hover:bg-[#007AFF]/10 px-4 py-2 rounded-[12px] flex items-center gap-2 ml-9 transition-colors"><PlusCircleIcon className="w-5 h-5" /> Add Option</button>
                                </div>
                            )}

                            {/* 2. Image Labeling (OPTIMIZED with ImagePinCanvas) */}
                            {currentQuestion.type === 'image-labeling' && (
                                <div className="p-8 bg-white dark:bg-[#1c1c1e] rounded-[24px] border border-black/5 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Diagram Configuration</label>
                                        <label className={`cursor-pointer text-xs font-bold text-white bg-[#007AFF] px-5 py-2.5 rounded-[14px] hover:bg-[#0062cc] shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 ${uploadingImage ? 'opacity-50' : ''}`}>
                                            {uploadingImage ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <PhotoIcon className="w-4 h-4" />}
                                            {uploadingImage ? 'Uploading...' : 'Upload Image'} 
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files[0] && handleImageUpload(selectedQuestionIndex, e.target.files[0])} disabled={uploadingImage} />
                                        </label>
                                    </div>
                                    
                                    {/* Image Area */}
                                    {currentQuestion.image ? (
                                        <ImagePinCanvas 
                                            image={currentQuestion.image}
                                            parts={currentQuestion.parts}
                                            onPartsChange={(newParts) => handleQuestionChange(selectedQuestionIndex, 'parts', newParts)}
                                        />
                                    ) : (
                                        <div className="h-56 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[20px] text-slate-400 gap-3">
                                            <PhotoIcon className="w-10 h-10 opacity-50"/>
                                            <span className="text-sm font-bold">No Image Uploaded</span>
                                        </div>
                                    )}
                                    
                                    {/* Inputs for Labels */}
                                    <div className="mt-8 space-y-4">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block border-b border-black/5 pb-2">Label Keys</label>
                                        {currentQuestion.parts.map((p, idx) => (
                                            <div key={p.id} className="flex items-center gap-4 animate-in slide-in-from-left-2">
                                                <span className="w-8 h-8 rounded-full bg-[#007AFF] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">{p.number}</span>
                                                <input 
                                                    value={p.correctAnswer} 
                                                    onChange={(e) => { const newParts = [...currentQuestion.parts]; newParts[idx].correctAnswer = e.target.value; handleQuestionChange(selectedQuestionIndex, 'parts', newParts); }} 
                                                    className={inputClass} 
                                                    placeholder={`Correct Answer for Pin #${p.number}`} 
                                                />
                                                <button onClick={() => { const newParts = currentQuestion.parts.filter((_, i) => i !== idx).map((pp, ii) => ({ ...pp, number: ii + 1 })); handleQuestionChange(selectedQuestionIndex, 'parts', newParts); }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-[12px] transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        ))}
                                        {(!currentQuestion.parts || currentQuestion.parts.length === 0) && <p className="text-sm text-slate-400 italic text-center py-4">Tap on specific areas in the image above to create labels.</p>}
                                    </div>
                                </div>
                            )}
                            
                            {/* 3. Matching Type */}
                            {currentQuestion.type === 'matching-type' && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {/* Prompts */}
                                    <div className="space-y-4 p-5 bg-slate-50 dark:bg-white/5 rounded-[20px] border border-black/5 dark:border-white/5">
                                        <div className="flex justify-between items-center"><label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Column A (Premises)</label></div>
                                        {currentQuestion.prompts.map((p, idx) => (
                                            <div key={idx} className="flex gap-3 items-start group">
                                                <span className="text-xs font-bold text-slate-400 w-6 pt-4 text-center">{idx + 1}.</span>
                                                <div className="flex-1 flex flex-col gap-3">
                                                    <MarkdownEditor value={p.text} onValueChange={(val) => handleMatchingSubItemChange(selectedQuestionIndex, 'prompts', idx, val)} placeholder="Prompt text..." minHeight="60px" />
                                                    <div className="flex items-center gap-2 p-2 bg-white dark:bg-[#2c2c2e] rounded-[12px] border border-black/5">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Matches:</span>
                                                        <select 
                                                            value={currentQuestion.correctPairs?.[p.id] || ''} 
                                                            onChange={(e) => handlePairChange(selectedQuestionIndex, p.id, e.target.value)} 
                                                            className="flex-1 bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                                                        >
                                                            <option value="">Select Answer...</option>
                                                            {currentQuestion.options.map((o, oid) => <option key={o.id} value={o.id}>Option {String.fromCharCode(65 + oid)}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveMatchingItem(selectedQuestionIndex, 'prompts', idx)} className="text-slate-400 hover:text-red-500 pt-3 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddMatchingItem(selectedQuestionIndex, 'prompts')} className="w-full py-3.5 border border-dashed border-slate-300 rounded-[14px] text-xs font-bold text-slate-500 hover:bg-white hover:border-[#007AFF] hover:text-[#007AFF] transition-all">Add Premise</button>
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-4 p-5 bg-slate-50 dark:bg-white/5 rounded-[20px] border border-black/5 dark:border-white/5">
                                        <div className="flex justify-between items-center"><label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Column B (Responses)</label></div>
                                        {currentQuestion.options.map((o, idx) => (
                                            <div key={idx} className="flex gap-3 items-start group">
                                                <span className="text-xs font-bold text-slate-400 w-6 pt-4 text-center">{String.fromCharCode(65 + idx)}.</span>
                                                <div className="flex-1">
                                                    <MarkdownEditor value={o.text} onValueChange={(val) => handleMatchingSubItemChange(selectedQuestionIndex, 'options', idx, val)} placeholder="Option text..." minHeight="60px" />
                                                </div>
                                                <button onClick={() => handleRemoveMatchingItem(selectedQuestionIndex, 'options', idx)} className="text-slate-400 hover:text-red-500 pt-3 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddMatchingItem(selectedQuestionIndex, 'options')} className="w-full py-3.5 border border-dashed border-slate-300 rounded-[14px] text-xs font-bold text-slate-500 hover:bg-white hover:border-[#007AFF] hover:text-[#007AFF] transition-all">Add Response</button>
                                    </div>
                                </div>
                            )}

                            {/* 4. Essay Rubric */}
                            {currentQuestion.type === 'essay' && (
                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Grading Rubric</label>
                                    <div className="bg-white dark:bg-[#1c1c1e] rounded-[20px] border border-black/5 overflow-hidden shadow-sm">
                                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-[#2c2c2e] border-b border-black/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <div className="col-span-8">Criteria Description</div>
                                            <div className="col-span-3 text-center">Points</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                        {currentQuestion.rubric.map((r, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-black/5 items-start last:border-0 hover:bg-slate-50/50 transition-colors">
                                                <div className="col-span-8">
                                                    <MarkdownEditor value={r.criteria} onValueChange={(val) => handleRubricChange(selectedQuestionIndex, idx, 'criteria', val)} placeholder="e.g. Grammar and Syntax" minHeight="60px" />
                                                </div>
                                                <div className="col-span-3 flex items-start justify-center">
                                                    <input type="number" value={r.points} onChange={(e) => handleRubricChange(selectedQuestionIndex, idx, 'points', e.target.value)} className={`${inputClass} text-center w-20 font-bold`} min="1" />
                                                </div>
                                                <div className="col-span-1 flex justify-center pt-3">
                                                    <button onClick={() => handleRemoveRubricItem(selectedQuestionIndex, idx)} className="text-slate-300 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => handleAddRubricItem(selectedQuestionIndex)} className="text-sm font-bold text-[#007AFF] hover:bg-[#007AFF]/10 px-4 py-2.5 rounded-[12px] flex items-center gap-2 transition-all ml-1"><PlusCircleIcon className="w-5 h-5" /> Add Criteria</button>
                                </div>
                            )}

                            {/* 5. Identification */}
                            {currentQuestion.type === 'identification' && (
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Correct Answer</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <CheckIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 stroke-[3]" />
                                            <input value={currentQuestion.correctAnswer} onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', e.target.value)} className={`${inputClass} pl-12 border-green-500/30 focus:border-green-500 focus:ring-green-500/20`} placeholder="Exact text match..." />
                                        </div>
                                    </div>
                                </div>
                            )}

                             {/* 6. True/False */}
                             {currentQuestion.type === 'true-false' && (
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Correct Answer</label>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', true)} className={`flex-1 py-4 rounded-[16px] font-bold text-lg transition-all flex items-center justify-center gap-2 ${currentQuestion.correctAnswer === true ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-500 hover:bg-slate-200'}`}>
                                            {currentQuestion.correctAnswer === true && <CheckIcon className="w-6 h-6"/>} True
                                        </button>
                                        <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', false)} className={`flex-1 py-4 rounded-[16px] font-bold text-lg transition-all flex items-center justify-center gap-2 ${currentQuestion.correctAnswer === false ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-500 hover:bg-slate-200'}`}>
                                            {currentQuestion.correctAnswer === false && <CheckIcon className="w-6 h-6"/>} False
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Rationale (Common) */}
                            <div className="pt-8 mt-8 border-t border-black/5 dark:border-white/5 space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Rationale / Explanation (Optional)</label>
                                <MarkdownEditor value={currentQuestion.explanation} onValueChange={(val) => handleQuestionChange(selectedQuestionIndex, 'explanation', val)} placeholder="Explain why the answer is correct (shown to students after quiz)..." minHeight="100px" />
                            </div>
                        </div>
                    </div>
                 </>
             ) : <div className="flex flex-col items-center justify-center h-full text-slate-300 font-bold gap-4"><DocumentTextIcon className="w-16 h-16 opacity-20"/>Select a question from the left to edit</div>}
          </div>

          {/* RIGHT: LIVE PREVIEW (Wider) */}
          <div className="w-[440px] flex-shrink-0 flex flex-col bg-slate-100/50 dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[24px] shadow-inner overflow-hidden backdrop-blur-sm">
                <div className="p-5 bg-white/80 dark:bg-[#1c1c1e]/80 border-b border-black/5 dark:border-white/5 flex items-center gap-2.5 backdrop-blur-md sticky top-0 z-10">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><EyeIcon className="w-4 h-4 text-slate-500" /></div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Student Preview</h3>
                </div>
                <div className="flex-grow overflow-hidden p-6">
                    <PreviewCard question={currentQuestion} index={selectedQuestionIndex} displayLabel={displayLabel} />
                </div>
          </div>
      </div>
    </div>
  );
}