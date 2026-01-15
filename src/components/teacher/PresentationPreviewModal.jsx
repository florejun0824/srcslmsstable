// src/components/PresentationPreviewModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
    XMarkIcon, 
    CheckCircleIcon, 
    TrashIcon, 
    Square2StackIcon,
    ArrowPathIcon,
    PlusIcon,
    Bars2Icon,
    BoldIcon,
    ItalicIcon,
    ListBulletIcon,
    NumberedListIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { PresentationChartLineIcon } from '@heroicons/react/20/solid';

// Helper to flatten notes object to string for editing
const flattenNotes = (notes) => {
    if (typeof notes === 'string') return notes;
    if (!notes) return "";
    const { talkingPoints, interactiveElement, slideTiming } = notes;
    return `[TIMING: ${slideTiming || 'N/A'}]\n\n${talkingPoints || ''}\n\n[INTERACTION]\n${interactiveElement || ''}`;
};

export default function PresentationPreviewModal({ isOpen, onClose, previewData, onConfirm, isSaving }) {
    // Local state for WYSIWYG editing
    const [localSlides, setLocalSlides] = useState([]);
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    const [isCreationComplete, setIsCreationComplete] = useState(false);
    
    // Drag and Drop State
    const [draggingIndex, setDraggingIndex] = useState(null);

    // Refs for Text Manipulation
    const bodyInputRef = useRef(null);
    const prevIsSaving = useRef(isSaving);

    // Initialize local state when modal opens or data changes
    useEffect(() => {
        if (isOpen && previewData?.slides) {
            const editableSlides = previewData.slides.map(s => ({
                ...s,
                body: Array.isArray(s.body) ? s.body.join('\n') : s.body,
                notes: flattenNotes(s.notes)
            }));
            setLocalSlides(editableSlides);
            setSelectedSlideIndex(0);
            setIsCreationComplete(false);
        }
    }, [isOpen, previewData]);

    // Handle saving completion
    useEffect(() => {
        if (prevIsSaving.current && !isSaving && isOpen) {
            setIsCreationComplete(true);
        }
        prevIsSaving.current = isSaving;
    }, [isSaving, isOpen]);

    // --- TEXT MANIPULATION HELPERS ---

    const insertAtCursor = (textToInsert, wrapChar = '') => {
        const input = bodyInputRef.current;
        if (!input) return;

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        const selectedText = text.substring(start, end);

        let newText;
        let newCursorPos;

        if (wrapChar) {
            // Wrapping logic (Bold/Italic)
            newText = text.substring(0, start) + wrapChar + selectedText + wrapChar + text.substring(end);
            newCursorPos = end + (wrapChar.length * 2);
        } else {
            // Insertion logic (Bullets)
            newText = text.substring(0, start) + textToInsert + text.substring(end);
            newCursorPos = start + textToInsert.length;
        }

        // Update State
        handleSlideChange(selectedSlideIndex, 'body', newText);

        // Restore Focus & Cursor
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // --- ACTIONS ---

    const handleSlideChange = (index, field, value) => {
        const updatedSlides = [...localSlides];
        updatedSlides[index] = { ...updatedSlides[index], [field]: value };
        setLocalSlides(updatedSlides);
        if (isCreationComplete) setIsCreationComplete(false);
    };

    const handleTableChange = (slideIndex, rowIndex, colIndex, value) => {
        const updatedSlides = [...localSlides];
        const newRows = [...updatedSlides[slideIndex].tableData.rows];
        newRows[rowIndex][colIndex] = value;
        updatedSlides[slideIndex].tableData.rows = newRows;
        setLocalSlides(updatedSlides);
        if (isCreationComplete) setIsCreationComplete(false);
    };

    const handleDeleteSlide = (e, index) => {
        if(e) e.stopPropagation();
        const targetIndex = index !== undefined ? index : selectedSlideIndex;

        if (localSlides.length <= 1) return;

        const updatedSlides = localSlides.filter((_, i) => i !== targetIndex);
        setLocalSlides(updatedSlides);
        
        if (selectedSlideIndex >= targetIndex && selectedSlideIndex > 0) {
            setSelectedSlideIndex(selectedSlideIndex - 1);
        } else if (selectedSlideIndex >= updatedSlides.length) {
            setSelectedSlideIndex(updatedSlides.length - 1);
        }
        if (isCreationComplete) setIsCreationComplete(false);
    };

    const handleAddSlide = () => {
        const newSlide = {
            title: "New Slide",
            body: "Click to add text content...",
            notes: "Add speaker notes here...",
            tableData: null
        };
        const nextSlides = [...localSlides];
        nextSlides.splice(selectedSlideIndex + 1, 0, newSlide);
        
        setLocalSlides(nextSlides);
        setSelectedSlideIndex(selectedSlideIndex + 1);
        if (isCreationComplete) setIsCreationComplete(false);
    };

    const handleConfirm = () => {
        setIsCreationComplete(false);
        onConfirm(localSlides);
    };

    // --- DRAG AND DROP ---

    const handleDragStart = (e, index) => {
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
        
        if (sourceIndex === targetIndex || isNaN(sourceIndex)) {
            setDraggingIndex(null);
            return;
        }

        const newSlides = [...localSlides];
        const [movedSlide] = newSlides.splice(sourceIndex, 1);
        newSlides.splice(targetIndex, 0, movedSlide);

        setLocalSlides(newSlides);
        
        if (selectedSlideIndex === sourceIndex) {
            setSelectedSlideIndex(targetIndex);
        } else if (sourceIndex < selectedSlideIndex && targetIndex >= selectedSlideIndex) {
            setSelectedSlideIndex(selectedSlideIndex - 1);
        } else if (sourceIndex > selectedSlideIndex && targetIndex <= selectedSlideIndex) {
            setSelectedSlideIndex(selectedSlideIndex + 1);
        }

        setDraggingIndex(null);
    };


    const selectedSlide = localSlides[selectedSlideIndex];
    const hasTableData = selectedSlide?.tableData && 
                         Array.isArray(selectedSlide.tableData.headers) && 
                         selectedSlide.tableData.headers.length > 0;

    // Define common button class for formatting tools
    const formatBtnClass = "p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 rounded transition-colors";

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={isSaving ? () => {} : onClose}>
                {/* Backdrop */}
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-hidden">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-[95vw] h-[92vh] transform overflow-hidden rounded-2xl bg-white dark:bg-[#0f0f0f] shadow-2xl ring-1 ring-white/10 flex flex-col isolation-auto">
                                
                                {/* --- 1. Top Bar: App Header --- */}
                                <div className="relative z-30 flex-shrink-0 h-16 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg text-white shadow-lg shadow-orange-500/20">
                                            <PresentationChartLineIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">Presentation Editor</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                                    {localSlides.length} Slides
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={onClose} 
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* --- 2. Toolbar --- */}
                                <div className="relative z-20 flex-shrink-0 h-12 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-white/5 flex items-center px-4 gap-2 overflow-x-auto">
                                    <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-white/10">
                                        <button 
                                            onClick={handleAddSlide}
                                            disabled={isSaving}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                            <span>Add Slide</span>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteSlide(e)}
                                            disabled={isSaving}
                                            className="p-1.5 text-slate-400 dark:text-slate-200 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                                            title="Delete Current Slide"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className={`flex items-center gap-1 px-3 ${hasTableData || isSaving ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <button onClick={() => insertAtCursor('', '**')} className={formatBtnClass} title="Bold">
                                            <BoldIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => insertAtCursor('', '_')} className={formatBtnClass} title="Italic">
                                            <ItalicIcon className="h-4 w-4" />
                                        </button>
                                        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2"></div>
                                        <button onClick={() => insertAtCursor('• ')} className={formatBtnClass} title="Bullet List">
                                            <ListBulletIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => insertAtCursor('1. ')} className={formatBtnClass} title="Numbered List">
                                            <NumberedListIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* --- 3. Main Workspace --- */}
                                <div className="flex flex-1 overflow-hidden relative z-0">
                                    
                                    {/* Sidebar: Filmstrip */}
                                    <div className="w-[240px] bg-slate-50 dark:bg-[#151515] border-r border-slate-200 dark:border-white/5 overflow-y-auto custom-scrollbar flex flex-col p-4 gap-4 flex-shrink-0">
                                        {localSlides.map((slide, idx) => (
                                            <div 
                                                key={idx}
                                                draggable={!isSaving}
                                                onDragStart={(e) => handleDragStart(e, idx)}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDrop={(e) => handleDrop(e, idx)}
                                                onClick={() => setSelectedSlideIndex(idx)}
                                                className={`
                                                    relative group cursor-pointer transition-all duration-200 flex gap-3 select-none
                                                    ${selectedSlideIndex === idx ? 'opacity-100' : 'opacity-60 hover:opacity-100'}
                                                    ${draggingIndex === idx ? 'opacity-40 scale-95 border-dashed border-2 border-orange-400' : ''}
                                                `}
                                            >
                                                <div className="flex flex-col items-center pt-1 w-5">
                                                    <span className={`text-[11px] font-bold ${selectedSlideIndex === idx ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <Bars2Icon className="h-4 w-4 text-slate-300 mt-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>

                                                <div className={`flex-1 aspect-[16/9] bg-white dark:bg-[#2c2c2c] rounded-lg overflow-hidden relative shadow-sm transition-all
                                                    ${selectedSlideIndex === idx 
                                                        ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#151515] shadow-md' 
                                                        : 'ring-1 ring-slate-200 dark:ring-white/10 group-hover:ring-slate-400'
                                                    }`}>
                                                    <div className="absolute inset-0 p-2 overflow-hidden pointer-events-none">
                                                        <h1 className="text-[5px] font-bold text-slate-800 dark:text-slate-200 mb-1 truncate leading-tight">
                                                            {slide.title || "Untitled"}
                                                        </h1>
                                                        <div className="text-[4px] text-slate-500 dark:text-slate-400 leading-tight opacity-80">
                                                            {hasTableData && idx === selectedSlideIndex ? "Table Content" : slide.body}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <button 
                                            onClick={handleAddSlide}
                                            disabled={isSaving}
                                            className="flex flex-col items-center justify-center gap-2 w-full aspect-[16/9] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg text-slate-400 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group ml-8 max-w-[calc(100%-2rem)] disabled:opacity-50"
                                        >
                                            <PlusIcon className="h-5 w-5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Add Slide</span>
                                        </button>
                                        <div className="h-8"></div>
                                    </div>

                                    {/* Canvas Area */}
                                    <div className="flex-1 bg-slate-100 dark:bg-black flex flex-col relative">
                                        
                                        {/* Dot Pattern Background */}
                                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.08]"
                                             style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                                        </div>

                                        {/* Scrollable Container with forced Top Padding */}
                                        <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-12 flex flex-col items-center justify-start relative z-0">
                                            {selectedSlide ? (
                                                <div className="w-full max-w-5xl aspect-[16/9] bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/40 rounded-sm flex flex-col p-10 md:p-16 transition-all duration-300 shrink-0">
                                                    
                                                    {/* Title Input */}
                                                    <input
                                                        type="text"
                                                        value={selectedSlide.title}
                                                        onChange={(e) => handleSlideChange(selectedSlideIndex, 'title', e.target.value)}
                                                        className="text-4xl font-extrabold text-slate-900 dark:text-white mb-8 bg-transparent border-b-2 border-transparent focus:border-orange-500/50 outline-none pb-2 transition-colors placeholder-slate-300 dark:placeholder-slate-600 w-full"
                                                        placeholder="Add Title"
                                                        disabled={isSaving}
                                                    />

                                                    {/* Content Body */}
                                                    <div className="flex-1 overflow-hidden relative group">
                                                        {hasTableData ? (
                                                            <div className="w-full h-full overflow-auto custom-scrollbar border border-slate-100 dark:border-white/5 rounded-lg">
                                                                <table className="min-w-full border-collapse text-left text-sm">
                                                                    <thead>
                                                                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                                                            {selectedSlide.tableData.headers.map((header, i) => (
                                                                                <th key={i} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                                                                                    {header}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                                        {selectedSlide.tableData.rows.map((row, rIndex) => (
                                                                            <tr key={rIndex} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                                                {row.map((cell, cIndex) => (
                                                                                    <td key={cIndex} className="p-0 border-r border-slate-100 dark:border-white/5 last:border-0">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={cell}
                                                                                            onChange={(e) => handleTableChange(selectedSlideIndex, rIndex, cIndex, e.target.value)}
                                                                                            className="w-full px-4 py-3 bg-transparent border-none outline-none focus:bg-blue-50/50 dark:focus:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                                                                                            disabled={isSaving}
                                                                                        />
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <textarea
                                                                ref={bodyInputRef}
                                                                value={selectedSlide.body}
                                                                onChange={(e) => handleSlideChange(selectedSlideIndex, 'body', e.target.value)}
                                                                className="w-full h-full resize-none bg-transparent border-none outline-none focus:ring-0 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed custom-scrollbar font-sans placeholder-slate-300"
                                                                placeholder="Type your content here..."
                                                                disabled={isSaving}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-slate-400 mt-20">
                                                    <Square2StackIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                                    <p className="font-medium">No slide selected</p>
                                                </div>
                                            )}
                                            {/* Spacer at bottom for scrolling */}
                                            <div className="h-12 w-full shrink-0"></div>
                                        </div>

                                        {/* Speaker Notes */}
                                        <div className="h-[160px] bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/5 flex flex-col flex-shrink-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                                            <div className="px-6 py-2 bg-slate-50/50 dark:bg-[#202020] border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Speaker Notes</span>
                                                <span className="text-[10px] text-slate-400">Private to presenter</span>
                                            </div>
                                            <textarea
                                                value={selectedSlide ? selectedSlide.notes : ''}
                                                onChange={(e) => selectedSlide && handleSlideChange(selectedSlideIndex, 'notes', e.target.value)}
                                                className="flex-1 w-full px-6 py-4 resize-none bg-transparent border-none outline-none focus:bg-yellow-50/30 dark:focus:bg-yellow-900/5 text-sm font-mono text-slate-600 dark:text-slate-400 custom-scrollbar leading-relaxed"
                                                placeholder="Add your talking points here..."
                                                disabled={!selectedSlide || isSaving}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* --- 4. Footer Actions --- */}
                                <div className="px-6 py-4 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/5 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-4">
                                        {isCreationComplete && (
                                            <div className="flex items-center text-green-600 dark:text-green-400 text-sm font-semibold animate-in fade-in slide-in-from-left-2 duration-300 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800/30">
                                                <CheckCircleIcon className="h-4 w-4 mr-2" />
                                                Presentation Created!
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isSaving}
                                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                                        >
                                            {isCreationComplete ? "Close" : "Cancel"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirm}
                                            disabled={isSaving}
                                            className={`
                                                relative px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 
                                                flex items-center gap-2 transition-all active:scale-[0.98] overflow-hidden
                                                ${isSaving 
                                                    ? 'bg-slate-400 dark:bg-slate-700 cursor-wait pl-10' 
                                                    : isCreationComplete
                                                        ? 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500'
                                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
                                                }
                                            `}
                                        >
                                            {isSaving && (
                                                <ArrowPathIcon className="absolute left-3 h-4 w-4 animate-spin text-white/80" />
                                            )}
                                            {isSaving 
                                                ? "Generating..." 
                                                : isCreationComplete 
                                                    ? "Generate Again" 
                                                    : (
                                                        <>
                                                            <span>Export to Google Slides</span>
                                                            <SparklesIcon className="h-4 w-4 opacity-80" />
                                                        </>
                                                    )
                                            }
                                        </button>
                                    </div>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}