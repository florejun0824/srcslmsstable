import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusCircleIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  CalculatorIcon,
  CheckIcon,
  ComputerDesktopIcon,
  EyeIcon,
  ListBulletIcon,
  QueueListIcon,
  ChatBubbleLeftRightIcon,
  PaintBrushIcon,
  ArrowPathIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CursorArrowRaysIcon
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
            className="p-1.5 min-w-[28px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-all active:scale-90 flex items-center justify-center"
        >
            {Icon ? <Icon className="w-4 h-4 stroke-[2.5]" /> : <span className="text-[10px] font-bold px-1">{text}</span>}
        </button>
    );

    return (
        <div className="flex flex-col w-full border border-black/5 dark:border-white/10 rounded-[12px] bg-white dark:bg-[#252525] overflow-visible focus-within:ring-2 focus-within:ring-[#007AFF]/50 transition-all">
            {/* Mini Toolbar */}
            <div className="flex items-center flex-wrap gap-1 p-1.5 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 rounded-t-[12px]">
                <ToolbarButton icon={BoldIcon} tooltip="Bold" onClick={() => applyStyle('**', '**')} />
                <ToolbarButton icon={ItalicIcon} tooltip="Italic" onClick={() => applyStyle('*', '*')} />
                <ToolbarButton icon={UnderlineIcon} tooltip="Underline" onClick={() => applyStyle('<u>', '</u>')} />
                
                <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-1"></div>
                
                <ToolbarButton text="½" tooltip="Fraction" onClick={() => insertText('$\\frac{a}{b}$', -1)} />
                <ToolbarButton text="x²" tooltip="Exponent" onClick={() => insertText('$x^{2}$', -1)} />
                
                <div className="relative">
                     <ToolbarButton icon={CalculatorIcon} tooltip="Symbols" onClick={() => setShowSymbolPicker(s => !s)} />
                     {showSymbolPicker && (
                        <div onMouseLeave={() => setShowSymbolPicker(false)} className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/10 p-2 rounded-[12px] shadow-xl grid grid-cols-6 gap-1 w-64">
                            {MATH_SYMBOLS.map(sym => (
                                <button key={sym} onClick={() => insertText(sym)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded text-sm font-mono text-slate-700 dark:text-slate-200">{sym}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <ToolbarButton icon={PaintBrushIcon} tooltip="Color" onClick={() => setShowColorPicker(s => !s)} />
                    {showColorPicker && (
                        <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/10 p-2 rounded-[12px] shadow-xl flex gap-2">
                            {TEXT_COLORS.map(color => (
                                <button key={color.name} onClick={() => applyColor(color.hex)} className="w-5 h-5 rounded-full border border-black/5" style={{ backgroundColor: color.hex }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <textarea
                ref={textareaRef}
                value={value || ''}
                onChange={(e) => onValueChange && onValueChange(e.target.value)}
                className="w-full p-3 text-[14px] leading-relaxed resize-none border-none focus:outline-none focus:ring-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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
        <div className="relative rounded-xl overflow-hidden border border-black/5 dark:border-white/10 bg-slate-100 group select-none">
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
                    className={`absolute w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-lg cursor-move hover:scale-110 transition-transform z-10 ${draggingId === p.id ? 'scale-110 z-20' : ''}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                    {p.number}
                </div>
            ))}
            <div className="absolute top-3 right-3 bg-black/70 text-white text-[11px] px-3 py-1.5 rounded-full backdrop-blur-md font-bold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <CursorArrowRaysIcon className="w-3 h-3" /> Click to label • Drag to move
            </div>
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
        <p className="text-sm text-slate-500 mb-6">Editing requires a larger screen.</p>
        <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm">Close Modal</button>
    </div>
);

// --- DISCARD CHANGES MODAL ---
const DiscardChangesModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] shadow-2xl p-6 max-w-sm w-full border border-black/5 dark:border-white/10 scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                        <ExclamationTriangleIcon className="w-7 h-7 stroke-[2]" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unsaved Changes</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">
                        Are you sure you want to discard your changes? The quiz will remain in its previous state.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 py-3 rounded-[14px] font-bold text-sm bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                            Keep Editing
                        </button>
                        <button onClick={onConfirm} className="flex-1 py-3 rounded-[14px] font-bold text-sm bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all">
                            Discard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PREVIEW CARD COMPONENT (Memoized) ---
const PreviewCard = memo(({ question, index }) => {
    if (!question) return <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10"><DocumentTextIcon className="w-10 h-10 mb-2 opacity-50" />Select a question to preview</div>;

    const inputClass = "w-full bg-slate-50 dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10 rounded-[12px] px-3 py-2.5 text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all shadow-sm";

    return (
        <div className="bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-[20px] shadow-sm p-6 space-y-6 h-full overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-black/5 dark:border-white/5 pb-4">
                <div className="flex-1 mr-4">
                    <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">Question {index + 1}</h4>
                    <div className="prose prose-sm dark:prose-invert leading-snug text-slate-900 dark:text-white">
                        <ContentRenderer text={question.text || 'Question Prompt...'} />
                    </div>
                </div>
                <span className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap">
                    {question.points} pts
                </span>
            </div>

            {/* Content Body - COMPACT MODE */}
            <div className="space-y-3">
                {/* 1. MCQ */}
                {question.type === 'multiple-choice' && (
                    <div className="space-y-2">
                        {question.options.map((opt, i) => (
                            <div key={i} className={`flex items-start gap-3 py-2 px-3 rounded-lg border transition-all ${question.correctAnswerIndex === i ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-black/5 dark:border-white/10 bg-slate-50 dark:bg-white/5'}`}>
                                <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${question.correctAnswerIndex === i ? 'border-green-500 bg-green-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {question.correctAnswerIndex === i && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-200 leading-tight"><ContentRenderer text={opt || `Option ${i + 1}`} /></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. T/F */}
                {question.type === 'true-false' && (
                    <div className="flex gap-2">
                        {['True', 'False'].map(val => (
                            <div key={val} className={`flex-1 py-2 text-center rounded-lg font-bold text-sm border ${question.correctAnswer === (val === 'True') ? 'bg-green-500 text-white border-green-500 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-500'}`}>
                                {val}
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. Identification */}
                {question.type === 'identification' && (
                    <div>
                        <input disabled placeholder="Student types answer here..." className={`${inputClass} text-sm py-2`} />
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/30 flex items-center gap-2">
                            <span className="text-[10px] text-green-700 dark:text-green-400 font-bold uppercase">Answer:</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{question.correctAnswer || 'Not set'}</span>
                        </div>
                    </div>
                )}

                {/* 4. Matching */}
                {question.type === 'matching-type' && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Column A</p>
                            {question.prompts.map((p, i) => (
                                <div key={i} className="p-2 bg-slate-50 dark:bg-white/5 rounded border border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-200 text-xs">
                                    <span className="font-bold mr-1.5">{i + 1}.</span><ContentRenderer text={p.text} />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Column B</p>
                            {question.options.map((o, i) => (
                                <div key={i} className="p-2 bg-slate-50 dark:bg-white/5 rounded border border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-200 text-xs">
                                    <span className="font-bold mr-1.5">{String.fromCharCode(65 + i)}.</span><ContentRenderer text={o.text} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. Essay */}
                {question.type === 'essay' && (
                    <div className="space-y-2">
                        <textarea disabled className={`${inputClass} min-h-[80px] resize-none bg-slate-50 text-sm`} placeholder="Student response area..." />
                        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-2 border border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Rubric</p>
                            <div className="space-y-1">
                                {question.rubric.map((r, idx) => (
                                    <div key={idx} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                                        <span className="truncate pr-2">• <ContentRenderer text={r.criteria} /></span>
                                        <span className="font-bold flex-shrink-0">{r.points} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Image Labeling */}
                {question.type === 'image-labeling' && (
                    <div className="space-y-2">
                        {question.image ? (
                            <div className="relative rounded-lg overflow-hidden border border-black/5 dark:border-white/10 bg-slate-100 dark:bg-black/20">
                                <img src={question.image} className="w-full h-auto" alt="Quiz" />
                                {question.parts.map((part) => (
                                    <div key={part.id} className="absolute w-5 h-5 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm" style={{ left: `${part.x}%`, top: `${part.y}%`, transform: 'translate(-50%, -50%)' }}>
                                        {part.number}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-24 bg-slate-50 rounded-lg flex items-center justify-center text-xs text-slate-400">No Image</div>
                        )}
                        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-2 border border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Keys</p>
                            <div className="flex flex-wrap gap-2">
                                {question.parts.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[11px] bg-white dark:bg-black/10 px-2 py-1 rounded border border-black/5">
                                        <span className="w-4 h-4 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-[9px]">{p.number}</span>
                                        <span className="text-slate-700 dark:text-slate-300 max-w-[100px] truncate">{p.correctAnswer || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Rationale */}
            {question.explanation && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <p className="text-[9px] font-bold uppercase text-blue-500 mb-1">Rationale</p>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        <ContentRenderer text={question.explanation} />
                    </div>
                </div>
            )}
        </div>
    );
});

// --- MAIN COMPONENT ---
const EditQuizModal = ({ isOpen, onClose, quiz }) => {
    const { showToast } = useToast();

    // --- STATE ---
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(-1);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Styling Constants
    const inputClass = "w-full bg-slate-50 dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10 rounded-[12px] px-3 py-2.5 text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all shadow-sm";

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen && quiz) {
            setTitle(quiz.title || '');
            
            // Deep copy and normalize questions to ensure all fields exist
            const populatedQuestions = (quiz.questions || []).map(q => {
                let cleanedOptions = q.options || ['', '', ''];
                if (q.type === 'multiple-choice' && Array.isArray(cleanedOptions)) {
                    cleanedOptions = cleanedOptions.map(opt => {
                        if (typeof opt === 'object' && opt !== null) {
                            return opt.text || ''; 
                        }
                        return String(opt);
                    });
                }

                return {
                    id: q.id || uniqueId(),
                    text: q.text || '',
                    type: q.type || 'multiple-choice',
                    points: q.points || 1,
                    explanation: q.explanation || '',
                    options: cleanedOptions, 
                    prompts: q.prompts || [],
                    correctPairs: q.correctPairs || {},
                    rubric: q.rubric || [],
                    image: q.image || null,
                    parts: q.parts || [],
                    correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : '',
                    correctAnswerIndex: q.correctAnswerIndex || 0,
                };
            });
            
            setQuestions(populatedQuestions);
            setSelectedQuestionIndex(populatedQuestions.length > 0 ? 0 : -1);
        }
    }, [isOpen, quiz]);

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
            if (field === 'type') {
                if (value !== oldQuestion.type) {
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

    // --- HANDLERS ---

    // 1. Image Labeling
    const handleImageUpload = async (qIndex, file) => {
        setUploadingImage(true);
        try {
            const imageUrl = await uploadImageToCloudinary(file);
            handleQuestionChange(qIndex, 'image', imageUrl);
        } catch (err) {
            setError("Failed to upload image. Please try again.");
            showToast("Failed to upload image.", "error");
        } finally {
            setUploadingImage(false);
        }
    };

    // 2. Matching Type
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
            if (type === 'prompts') newQ[qIndex].points = newQ[qIndex][type].length;
            return newQ;
        });
    };

    const handleRemoveMatchingItem = (qIndex, type, idx) => {
        setQuestions(prev => {
            const newQ = [...prev];
            if (type === 'prompts' && newQ[qIndex].correctPairs) {
                const promptId = newQ[qIndex][type][idx].id;
                delete newQ[qIndex].correctPairs[promptId];
            }
            newQ[qIndex][type].splice(idx, 1);
            if (type === 'prompts') newQ[qIndex].points = newQ[qIndex][type].length;
            return newQ;
        });
    };

    const handlePairChange = (qIndex, promptId, optId) => {
        setQuestions(prev => {
            const newQ = [...prev];
            if (!newQ[qIndex].correctPairs) newQ[qIndex].correctPairs = {};
            newQ[qIndex].correctPairs[promptId] = optId;
            return newQ;
        });
    };

    // 3. Rubric
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

    // --- SAVE LOGIC ---
    const handleUpdate = async () => {
        if (!quiz?.id) {
            showToast("Error: Missing Quiz ID.", "error");
            return;
        }
        if (!title.trim()) {
            setError('Quiz title cannot be empty.');
            return;
        }
        if (questions.length === 0) {
            setError('Please add at least one question.');
            return;
        }

        // Validation Loop
        for (const [i, q] of questions.entries()) {
            const label = `Question ${i + 1}`;
            if (!q.text.trim()) { setError(`${label}: Text is required.`); return; }
            if (q.type === 'image-labeling') {
                if (!q.image) { setError(`${label}: Image is required.`); return; }
                if (!q.parts || q.parts.length === 0) { setError(`${label}: Click on the image to label at least one part.`); return; }
                if (q.parts.some(p => !p.correctAnswer.trim())) { setError(`${label}: All labels must have an answer.`); return; }
            }
            if (q.type === 'matching-type') {
                if (!q.prompts.length || !q.options.length) { setError(`${label}: Needs prompts and options.`); return; }
                for (const p of q.prompts) {
                    if (!q.correctPairs?.[p.id]) { setError(`${label}: Map all prompts to an answer.`); return; }
                }
            }
            if (q.type === 'essay' && q.rubric.length === 0) { setError(`${label}: Needs rubric.`); return; }
        }

        setLoading(true);
        setError('');
        try {
            const quizRef = doc(db, 'quizzes', quiz.id);
            await updateDoc(quizRef, {
                title,
                questions,
                updatedAt: serverTimestamp()
            });
            showToast('Quiz updated successfully!', 'success');
            onClose();
        } catch (err) {
            console.error('Error updating quiz: ', err);
            setError("Failed to update quiz.");
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- DERIVED STATE ---
    const currentQuestion = questions[selectedQuestionIndex];
    const totalPoints = useMemo(() => questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0), [questions]);

    // Don't render if modal is closed
    if (!isOpen) return null;

    // Use a Portal to render the modal outside the main DOM hierarchy (avoids z-index trapping)
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] font-sans text-slate-900 dark:text-white">
            <MobileRestricted onClose={onClose} />

            <DiscardChangesModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={() => { setShowCancelModal(false); onClose(); }}
            />

            {/* HEADER */}
            <div className="hidden md:block flex-shrink-0 px-8 py-5 border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#1c1c1e] z-20 sticky top-0">
                <div className="flex items-center justify-between">
                    {/* Left Side: Back + Title Input */}
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => setShowCancelModal(true)} className="p-2.5 rounded-full bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 transition-all active:scale-95 group">
                            <ArrowUturnLeftIcon className="w-5 h-5 stroke-[2.5] text-slate-600 dark:text-white group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div className="flex flex-col w-full max-w-lg">
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter Quiz Title..."
                                className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-900 dark:text-white placeholder-slate-300"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Editing Mode</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[11px] font-bold bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-full">{totalPoints} Points Total</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Actions (Cancel + Update) */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowCancelModal(true)}
                            className="px-6 py-2.5 font-bold text-sm bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 rounded-[14px] hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="px-8 py-2.5 font-bold text-sm bg-gradient-to-r from-[#007AFF] to-[#0051A8] text-white rounded-[14px] shadow-lg shadow-blue-500/30 flex items-center gap-2 hover:shadow-blue-500/50 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5 stroke-[2.5]" />}
                            {loading ? 'Updating...' : 'Update Quiz'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ERROR BANNER */}
            {error && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm animate-in fade-in slide-in-from-top-5 flex items-center gap-2">
                    <XMarkIcon className="w-5 h-5 cursor-pointer" onClick={() => setError('')} />
                    {error}
                </div>
            )}

            {/* MAIN CONTENT GRID */}
            <div className="hidden md:flex flex-grow overflow-hidden p-6 gap-6">

                {/* LEFT: QUESTION LIST */}
                <div className="w-[250px] flex-shrink-0 flex flex-col bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-[20px] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-[#2c2c2e]/50"><h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Questions</h3></div>
                    <div className="flex-grow overflow-y-auto p-2 custom-scrollbar space-y-1.5">
                        {questions.map((q, i) => (
                            <div key={q.id} onClick={() => setSelectedQuestionIndex(i)} className={`group relative flex items-center justify-between p-3 rounded-[14px] cursor-pointer transition-all border ${selectedQuestionIndex === i ? 'bg-[#007AFF]/10 border-[#007AFF]/20' : 'bg-white dark:bg-[#2c2c2e] border-transparent hover:bg-slate-50 dark:hover:bg-[#3a3a3c]'}`}>
                                {selectedQuestionIndex === i && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#007AFF] rounded-r-full" />}
                                <div className="flex flex-col pl-2 overflow-hidden w-full">
                                    <div className="flex justify-between items-center w-full">
                                        <span className={`font-bold text-[13px] truncate ${selectedQuestionIndex === i ? 'text-[#007AFF]' : 'text-slate-700 dark:text-slate-200'}`}>{i + 1}. {q.text ? q.text.substring(0, 15) + '...' : 'New Question'}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{q.type.replace('-', ' ')}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(i); }} className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-black/5 dark:border-white/5">
                        <button onClick={handleAddQuestion} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-[14px] bg-slate-50 dark:bg-[#3a3a3c] hover:bg-slate-100 dark:hover:bg-[#48484a] text-[13px] font-bold text-[#007AFF] border border-black/5 transition-all"><PlusCircleIcon className="w-5 h-5" /> Add Question</button>
                    </div>
                </div>

                {/* CENTER: EDITOR */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-[20px] shadow-sm overflow-hidden min-w-0">
                    {currentQuestion ? (
                        <>
                            {/* Editor Toolbar */}
                            <div className="flex items-center gap-4 p-5 border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#1c1c1e]">
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Question Type</span>
                                    <div className="relative">
                                        <select value={currentQuestion.type} onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'type', e.target.value)} className={`${inputClass} py-2 pl-3 pr-8 text-sm appearance-none cursor-pointer bg-slate-100 dark:bg-[#2c2c2e]`}>
                                            {questionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="w-24">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Points</span>
                                    <input type="number" min="1" value={currentQuestion.points} onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'points', parseInt(e.target.value))} disabled={['matching-type', 'essay', 'image-labeling'].includes(currentQuestion.type)} className={`${inputClass} py-2 text-center bg-slate-100 dark:bg-[#2c2c2e] disabled:opacity-50`} />
                                </div>
                            </div>

                            <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#FAFAFA] dark:bg-[#151515] p-8">
                                {/* Prompt Editor */}
                                <div className="space-y-2 mb-8">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Question Prompt</label>
                                    <MarkdownEditor value={currentQuestion.text} onValueChange={(val) => handleQuestionChange(selectedQuestionIndex, 'text', val)} placeholder="Type your question prompt here..." minHeight="160px" />
                                </div>

                                <div className="h-px bg-black/5 dark:bg-white/5 w-full mb-8" />

                                {/* Dynamic Inputs Based on Type */}
                                <div className="space-y-6">

                                    {/* 1. Multiple Choice Options */}
                                    {currentQuestion.type === 'multiple-choice' && (
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Answer Options</label>
                                            {currentQuestion.options.map((opt, idx) => (
                                                <div key={idx} className="flex gap-3 items-start group">
                                                    <button
                                                        onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswerIndex', idx)}
                                                        className={`mt-2 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${currentQuestion.correctAnswerIndex === idx ? 'bg-green-500 border-green-500 text-white scale-110' : 'bg-white border-slate-300 hover:border-green-300'}`}
                                                        title="Mark as correct"
                                                    >
                                                        {currentQuestion.correctAnswerIndex === idx && <CheckIcon className="w-4 h-4 stroke-[3]" />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <MarkdownEditor value={opt} onValueChange={(val) => { const newOpts = [...currentQuestion.options]; newOpts[idx] = val; handleQuestionChange(selectedQuestionIndex, 'options', newOpts); }} placeholder={`Option ${idx + 1}`} minHeight="60px" />
                                                    </div>
                                                    <button onClick={() => { const newOpts = currentQuestion.options.filter((_, i) => i !== idx); handleQuestionChange(selectedQuestionIndex, 'options', newOpts); }} className="mt-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-2 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'options', [...currentQuestion.options, ''])} className="text-sm font-bold text-[#007AFF] hover:underline flex items-center gap-1 ml-9"><PlusCircleIcon className="w-4 h-4" /> Add Option</button>
                                        </div>
                                    )}

                                    {/* 2. Image Labeling (OPTIMIZED) */}
                                    {currentQuestion.type === 'image-labeling' && (
                                        <div className="p-6 bg-white dark:bg-[#1c1c1e] rounded-[20px] border border-black/5 shadow-sm">
                                            <div className="flex justify-between items-center mb-6">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Diagram Configuration</label>
                                                <label className={`cursor-pointer text-xs font-bold text-white bg-[#007AFF] px-4 py-2 rounded-[10px] hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2 ${uploadingImage ? 'opacity-50' : ''}`}>
                                                    {uploadingImage ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PhotoIcon className="w-4 h-4" />}
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
                                                <div className="h-48 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 gap-2">
                                                    <PhotoIcon className="w-8 h-8 opacity-50" />
                                                    <span className="text-sm font-bold">No Image Uploaded</span>
                                                </div>
                                            )}

                                            {/* Inputs for Labels */}
                                            <div className="mt-6 space-y-3">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Correct Answers</label>
                                                {currentQuestion.parts.map((p, idx) => (
                                                    <div key={p.id} className="flex items-center gap-3 animate-in slide-in-from-left-2">
                                                        <span className="w-8 h-8 rounded-full bg-[#007AFF] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-sm">{p.number}</span>
                                                        <input
                                                            value={p.correctAnswer}
                                                            onChange={(e) => { const newParts = [...currentQuestion.parts]; newParts[idx].correctAnswer = e.target.value; handleQuestionChange(selectedQuestionIndex, 'parts', newParts); }}
                                                            className={inputClass}
                                                            placeholder={`Correct Answer for Pin #${p.number}`}
                                                        />
                                                        <button onClick={() => { const newParts = currentQuestion.parts.filter((_, i) => i !== idx).map((pp, ii) => ({ ...pp, number: ii + 1 })); handleQuestionChange(selectedQuestionIndex, 'parts', newParts); }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                    </div>
                                                ))}
                                                {(!currentQuestion.parts || currentQuestion.parts.length === 0) && <p className="text-sm text-slate-400 italic">Click on the image above to add labels.</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Matching Type */}
                                    {currentQuestion.type === 'matching-type' && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                            {/* Prompts */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center"><label className="text-[11px] font-bold text-slate-400 uppercase">Column A (Prompts)</label></div>
                                                {currentQuestion.prompts.map((p, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start">
                                                        <span className="text-xs font-bold text-slate-400 w-6 pt-3 text-center">{idx + 1}.</span>
                                                        <div className="flex-1 flex flex-col gap-2">
                                                            <MarkdownEditor value={p.text} onValueChange={(val) => handleMatchingSubItemChange(selectedQuestionIndex, 'prompts', idx, val)} placeholder="Prompt text..." minHeight="60px" />
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Match:</span>
                                                                <select
                                                                    value={currentQuestion.correctPairs?.[p.id] || ''}
                                                                    onChange={(e) => handlePairChange(selectedQuestionIndex, p.id, e.target.value)}
                                                                    className="flex-1 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-lg text-xs py-1.5 font-bold"
                                                                >
                                                                    <option value="">Select Option...</option>
                                                                    {currentQuestion.options.map((o, oid) => <option key={o.id} value={o.id}>Option {String.fromCharCode(65 + oid)}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleRemoveMatchingItem(selectedQuestionIndex, 'prompts', idx)} className="text-slate-400 hover:text-red-500 pt-2"><TrashIcon className="w-5 h-5" /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => handleAddMatchingItem(selectedQuestionIndex, 'prompts')} className="w-full py-3 border border-dashed border-slate-300 rounded-[12px] text-xs font-bold text-slate-500 hover:bg-slate-50">Add Prompt</button>
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center"><label className="text-[11px] font-bold text-slate-400 uppercase">Column B (Options)</label></div>
                                                {currentQuestion.options.map((o, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start">
                                                        <span className="text-xs font-bold text-slate-400 w-6 pt-3 text-center">{String.fromCharCode(65 + idx)}.</span>
                                                        <div className="flex-1">
                                                            <MarkdownEditor value={o.text} onValueChange={(val) => handleMatchingSubItemChange(selectedQuestionIndex, 'options', idx, val)} placeholder="Option text..." minHeight="60px" />
                                                        </div>
                                                        <button onClick={() => handleRemoveMatchingItem(selectedQuestionIndex, 'options', idx)} className="text-slate-400 hover:text-red-500 pt-2"><TrashIcon className="w-5 h-5" /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => handleAddMatchingItem(selectedQuestionIndex, 'options')} className="w-full py-3 border border-dashed border-slate-300 rounded-[12px] text-xs font-bold text-slate-500 hover:bg-slate-50">Add Option</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. Essay Rubric */}
                                    {currentQuestion.type === 'essay' && (
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Grading Rubric</label>
                                            <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] border border-black/5 overflow-hidden">
                                                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 dark:bg-[#2c2c2e] border-b border-black/5 text-[10px] font-bold text-slate-500 uppercase">
                                                    <div className="col-span-8">Criteria</div>
                                                    <div className="col-span-3 text-center">Points</div>
                                                    <div className="col-span-1"></div>
                                                </div>
                                                {currentQuestion.rubric.map((r, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-black/5 items-start last:border-0">
                                                        <div className="col-span-8">
                                                            <MarkdownEditor value={r.criteria} onValueChange={(val) => handleRubricChange(selectedQuestionIndex, idx, 'criteria', val)} placeholder="Criteria Description" minHeight="60px" />
                                                        </div>
                                                        <div className="col-span-3">
                                                            <input type="number" value={r.points} onChange={(e) => handleRubricChange(selectedQuestionIndex, idx, 'points', e.target.value)} className={`${inputClass} text-center`} min="1" />
                                                        </div>
                                                        <div className="col-span-1 flex justify-center pt-2">
                                                            <button onClick={() => handleRemoveRubricItem(selectedQuestionIndex, idx)} className="text-slate-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => handleAddRubricItem(selectedQuestionIndex)} className="text-sm font-bold text-[#007AFF] hover:underline flex items-center gap-1"><PlusCircleIcon className="w-4 h-4" /> Add Criteria</button>
                                        </div>
                                    )}

                                    {/* 5. Identification */}
                                    {currentQuestion.type === 'identification' && (
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Correct Answer</label>
                                            <input value={currentQuestion.correctAnswer} onChange={(e) => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', e.target.value)} className={inputClass} placeholder="Exact match..." />
                                        </div>
                                    )}

                                    {/* 6. True/False */}
                                    {currentQuestion.type === 'true-false' && (
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Correct Answer</label>
                                            <div className="flex gap-4">
                                                <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', true)} className={`px-8 py-3 rounded-[12px] font-bold transition-all ${currentQuestion.correctAnswer === true ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-500'}`}>True</button>
                                                <button onClick={() => handleQuestionChange(selectedQuestionIndex, 'correctAnswer', false)} className={`px-8 py-3 rounded-[12px] font-bold transition-all ${currentQuestion.correctAnswer === false ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-500'}`}>False</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rationale (Common) */}
                                    <div className="pt-6 mt-6 border-t border-black/5 dark:border-white/5 space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Rationale / Explanation (Optional)</label>
                                        <MarkdownEditor value={currentQuestion.explanation} onValueChange={(val) => handleQuestionChange(selectedQuestionIndex, 'explanation', val)} placeholder="Explain why the answer is correct..." minHeight="100px" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : <div className="flex items-center justify-center h-full text-slate-400 font-medium">Select a question to edit</div>}
                </div>

                {/* RIGHT: LIVE PREVIEW (Wider) */}
                <div className="w-[420px] flex-shrink-0 flex flex-col bg-slate-100 dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[20px] shadow-inner overflow-hidden">
                    <div className="p-4 bg-white dark:bg-[#1c1c1e] border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                        <EyeIcon className="w-4 h-4 text-slate-500" />
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Student View</h3>
                    </div>
                    <div className="flex-grow overflow-hidden p-4">
                        <PreviewCard question={currentQuestion} index={selectedQuestionIndex} />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditQuizModal;