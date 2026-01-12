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
    NumberedListIcon
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

    // Handle saving completion - UPDATED: Removed auto-close timeout
    useEffect(() => {
        if (prevIsSaving.current && !isSaving && isOpen) {
            setIsCreationComplete(true);
            // Auto-close removed to keep modal open until user clicks "Close"
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

        // Restore Focus & Cursor (setTimeout needed to allow React render cycle)
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
    };

    const handleTableChange = (slideIndex, rowIndex, colIndex, value) => {
        const updatedSlides = [...localSlides];
        const newRows = [...updatedSlides[slideIndex].tableData.rows];
        newRows[rowIndex][colIndex] = value;
        updatedSlides[slideIndex].tableData.rows = newRows;
        setLocalSlides(updatedSlides);
    };

    const handleDeleteSlide = (e, index) => {
        if(e) e.stopPropagation();
        
        // Use index if provided, otherwise delete current selection
        const targetIndex = index !== undefined ? index : selectedSlideIndex;

        if (localSlides.length <= 1) return;

        const updatedSlides = localSlides.filter((_, i) => i !== targetIndex);
        setLocalSlides(updatedSlides);
        
        if (selectedSlideIndex >= targetIndex && selectedSlideIndex > 0) {
            setSelectedSlideIndex(selectedSlideIndex - 1);
        } else if (selectedSlideIndex >= updatedSlides.length) {
            setSelectedSlideIndex(updatedSlides.length - 1);
        }
    };

    const handleAddSlide = () => {
        const newSlide = {
            title: "New Slide",
            body: "Click to add text content...",
            notes: "Add speaker notes here...",
            tableData: null
        };
        const nextSlides = [...localSlides];
        // Insert after current selection
        nextSlides.splice(selectedSlideIndex + 1, 0, newSlide);
        
        setLocalSlides(nextSlides);
        setSelectedSlideIndex(selectedSlideIndex + 1);
    };

    const handleConfirm = () => {
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
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
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
                            <Dialog.Panel className="w-full max-w-[95vw] h-[90vh] transform overflow-hidden rounded-xl bg-slate-100 dark:bg-[#1a1a1a] shadow-2xl ring-1 ring-black/5 flex flex-col">
                                
                                {/* --- 1. Top Bar: App Header --- */}
                                <div className="h-14 bg-[#202020] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0 text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-orange-600 p-1.5 rounded text-white">
                                            <PresentationChartLineIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold">Presentation Editor</h3>
                                            <p className="text-[10px] text-slate-400">{localSlides.length} Slides • Ready to Export</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={onClose} 
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* --- 2. Sticky Toolbar (Office Ribbon Style) --- */}
                                <div className="h-12 bg-white dark:bg-[#252525] border-b border-slate-200 dark:border-white/5 flex items-center px-4 gap-2 flex-shrink-0 overflow-x-auto">
                                    
                                    {/* Group 1: Slide Ops */}
                                    <div className="flex items-center gap-1 pr-3 border-r border-slate-300 dark:border-white/10">
                                        <button 
                                            onClick={handleAddSlide}
                                            disabled={isSaving || isCreationComplete}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors disabled:opacity-50"
                                            title="Add New Slide"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                            <span>New Slide</span>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteSlide(e)}
                                            disabled={isSaving || isCreationComplete}
                                            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                            title="Delete Current Slide"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Group 2: Text Formatting (Only enabled for text slides) */}
                                    <div className={`flex items-center gap-1 px-3 ${hasTableData || isSaving || isCreationComplete ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <button 
                                            onClick={() => insertAtCursor('', '**')}
                                            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded"
                                            title="Bold (Wraps in **)"
                                        >
                                            <BoldIcon className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => insertAtCursor('', '_')}
                                            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded"
                                            title="Italic (Wraps in _)"
                                        >
                                            <ItalicIcon className="h-4 w-4" />
                                        </button>
                                        <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1"></div>
                                        <button 
                                            onClick={() => insertAtCursor('• ')}
                                            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded"
                                            title="Insert Bullet Point"
                                        >
                                            <ListBulletIcon className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => insertAtCursor('1. ')}
                                            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded"
                                            title="Insert Number"
                                        >
                                            <NumberedListIcon className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1"></div>
                                    
                                    {/* Group 3: Status */}
                                    <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
                                        Slide {selectedSlideIndex + 1} of {localSlides.length}
                                    </span>
                                </div>

                                {/* --- 3. Main Workspace --- */}
                                <div className="flex flex-1 overflow-hidden">
                                    
                                    {/* Sidebar: Filmstrip */}
                                    <div className="w-[220px] bg-slate-200 dark:bg-[#1e1e1e] border-r border-slate-300 dark:border-white/10 overflow-y-auto custom-scrollbar flex flex-col p-4 gap-4 flex-shrink-0">
                                        {localSlides.map((slide, idx) => (
                                            <div 
                                                key={idx}
                                                draggable={!isSaving && !isCreationComplete}
                                                onDragStart={(e) => handleDragStart(e, idx)}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDrop={(e) => handleDrop(e, idx)}
                                                onClick={() => setSelectedSlideIndex(idx)}
                                                className={`
                                                    relative group cursor-pointer transition-all duration-200 flex gap-2 select-none
                                                    ${selectedSlideIndex === idx ? 'opacity-100' : 'opacity-70 hover:opacity-100'}
                                                    ${draggingIndex === idx ? 'opacity-50 scale-95 border-dashed border-2 border-orange-400' : ''}
                                                `}
                                            >
                                                <div className="flex flex-col items-center justify-between py-1 w-4">
                                                    <span className="text-[10px] font-bold text-slate-500">{idx + 1}</span>
                                                    <Bars2Icon className="h-4 w-4 text-slate-400 cursor-move opacity-0 group-hover:opacity-100" />
                                                </div>

                                                <div className={`flex-1 aspect-[16/9] bg-white dark:bg-[#333] rounded border-2 shadow-sm overflow-hidden p-1 relative
                                                    ${selectedSlideIndex === idx ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-transparent group-hover:border-slate-400'}`}>
                                                    
                                                    <div className="scale-[0.25] origin-top-left w-[400%] pointer-events-none">
                                                        <h1 className="font-bold text-slate-800 dark:text-slate-200 mb-2 truncate">{slide.title}</h1>
                                                        {slide.tableData ? (
                                                             <div className="text-slate-500 text-sm">Table Content...</div>
                                                        ) : (
                                                            <div className="text-slate-600 dark:text-slate-400 h-20 overflow-hidden text-sm">
                                                                {slide.body}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <button 
                                            onClick={handleAddSlide}
                                            disabled={isSaving || isCreationComplete}
                                            className="flex flex-col items-center justify-center gap-2 w-full aspect-[16/9] border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg text-slate-400 hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group ml-6 max-w-[calc(100%-1.5rem)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <PlusIcon className="h-6 w-6" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Add Slide</span>
                                        </button>
                                        <div className="h-8"></div>
                                    </div>

                                    {/* Canvas & Editor */}
                                    <div className="flex-1 bg-slate-100 dark:bg-[#1a1a1a] flex flex-col relative">
                                        
                                        {/* Slide Canvas */}
                                        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
                                            {selectedSlide ? (
                                                <div className="w-full max-w-4xl aspect-[16/9] bg-white dark:bg-[#2c2c2e] shadow-[0_0_20px_rgba(0,0,0,0.1)] rounded-sm flex flex-col p-8 md:p-12 relative group">
                                                    
                                                    {/* Title */}
                                                    <input
                                                        type="text"
                                                        value={selectedSlide.title}
                                                        onChange={(e) => handleSlideChange(selectedSlideIndex, 'title', e.target.value)}
                                                        className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-2 -mx-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors placeholder-slate-300 w-full"
                                                        placeholder="Click to add title"
                                                        disabled={isSaving || isCreationComplete}
                                                    />

                                                    {/* Content Body */}
                                                    <div className="flex-1 overflow-hidden relative">
                                                        {hasTableData ? (
                                                            <div className="w-full h-full overflow-auto custom-scrollbar">
                                                                <table className="min-w-full border-collapse text-left text-sm">
                                                                    <thead>
                                                                        <tr className="bg-slate-100 dark:bg-white/5 border-b-2 border-slate-300 dark:border-white/10">
                                                                            {selectedSlide.tableData.headers.map((header, i) => (
                                                                                <th key={i} className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                                                                                    {header}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                                                        {selectedSlide.tableData.rows.map((row, rIndex) => (
                                                                            <tr key={rIndex}>
                                                                                {row.map((cell, cIndex) => (
                                                                                    <td key={cIndex} className="p-0 border border-slate-100 dark:border-white/5">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={cell}
                                                                                            onChange={(e) => handleTableChange(selectedSlideIndex, rIndex, cIndex, e.target.value)}
                                                                                            className="w-full px-4 py-2 bg-transparent border-none outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 text-slate-600 dark:text-slate-400"
                                                                                            disabled={isSaving || isCreationComplete}
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
                                                                className="w-full h-full resize-none bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-2 -mx-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-lg text-slate-600 dark:text-slate-300 leading-relaxed custom-scrollbar font-sans"
                                                                placeholder="Click to add text"
                                                                disabled={isSaving || isCreationComplete}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-slate-400">
                                                    <Square2StackIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                    <p>Select a slide to edit</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Speaker Notes */}
                                        <div className="h-[140px] bg-white dark:bg-[#202020] border-t border-slate-300 dark:border-white/10 flex flex-col flex-shrink-0 z-10">
                                            <div className="px-4 py-1 bg-slate-50 dark:bg-[#252525] border-b border-slate-200 dark:border-white/5">
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Click to add speaker notes</span>
                                            </div>
                                            <textarea
                                                value={selectedSlide ? selectedSlide.notes : ''}
                                                onChange={(e) => selectedSlide && handleSlideChange(selectedSlideIndex, 'notes', e.target.value)}
                                                className="flex-1 w-full p-4 resize-none bg-transparent border-none outline-none focus:bg-yellow-50 dark:focus:bg-yellow-900/10 text-sm font-mono text-slate-600 dark:text-slate-400 custom-scrollbar"
                                                placeholder="Add speaker notes here..."
                                                disabled={!selectedSlide || isSaving || isCreationComplete}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* --- 4. Footer Actions --- */}
                                <div className="px-6 py-4 bg-white dark:bg-[#1e1e1e] border-t border-slate-200 dark:border-white/5 flex justify-end items-center gap-3 z-20">
                                    {isCreationComplete ? (
                                        // SUCCESS STATE
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center text-green-600 dark:text-green-400 font-bold px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                                Presentation Created Successfully!
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="px-6 py-2.5 rounded-[14px] text-[13px] font-bold text-white bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 transition-all shadow-md"
                                            >
                                                Close Editor
                                            </button>
                                        </div>
                                    ) : (
                                        // NORMAL STATE
                                        <>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                disabled={isSaving}
                                                className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold text-slate-700 dark:text-slate-300 
                                                         hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent disabled:opacity-50 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleConfirm}
                                                disabled={isSaving}
                                                className={`px-6 py-2.5 rounded-[14px] text-[13px] font-bold text-white shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-[0.98]
                                                    ${isSaving 
                                                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none' 
                                                        : 'bg-[#007AFF] hover:bg-[#0062CC]'
                                                    }`}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    "Export to Google Slides"
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}