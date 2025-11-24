import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import {
    PlusCircleIcon, TrashIcon, BookOpenIcon, PhotoIcon, VideoCameraIcon, Bars3Icon,
    CodeBracketIcon, LinkIcon, QueueListIcon, PaintBrushIcon, ChatBubbleLeftRightIcon,
    ChevronRightIcon, ComputerDesktopIcon, CheckIcon, XMarkIcon, EyeIcon
} from '@heroicons/react/24/outline';
import ContentRenderer from '../teacher/ContentRenderer';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// --- HELPER: Video URL to Embed ---
const getEmbedUrl = (url) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    return url; 
};

// --- MOBILE RESTRICTION OVERLAY ---
// Updated to show only on small screens (< md), allowing Tablets (md) and Desktops (lg)
const MobileRestricted = ({ onClose }) => (
    <div className="fixed inset-0 z-[300] bg-[#f5f5f7] dark:bg-[#000000] flex flex-col items-center justify-center p-8 text-center md:hidden animate-in fade-in duration-300">
        <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-[#1c1c1e] shadow-2xl flex items-center justify-center mb-8 border border-black/5 dark:border-white/10">
            <ComputerDesktopIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Desktop Experience</h3>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium mb-8">
            This advanced editor is optimized for tablets and desktop computers. Please switch devices to continue.
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
            <a 
                href="https://srcslms.netlify.app"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-[18px] bg-[#007AFF] text-white font-bold text-[15px] shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                Open Desktop Version
            </a>
            <button 
                onClick={onClose}
                className="w-full py-3.5 rounded-[18px] bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white font-bold text-[15px] shadow-sm border border-black/5 dark:border-white/10 active:scale-95 transition-all"
            >
                Close
            </button>
        </div>
    </div>
);

// --- CUSTOM ICONS ---
const BoldIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
);
const ItalicIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
);
const H1Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17 18V6l-4 2" />
    </svg>
);
const H2Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
);
const H3Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" />
        <path d="M17 16h2c1.5 0 2-1 2-2s-1-2-2-2h-1" /><path d="M17 12h2c1.5 0 2-1 2-2s-1-2-2-2h-2" />
    </svg>
);

// reorder helper
const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

// Markdown editor
const MarkdownEditor = ({ value, onValueChange, placeholder = "Type content here..." }) => {
    const textareaRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const TEXT_COLORS = [
        { name: 'Blue', hex: '#007AFF' },
        { name: 'Green', hex: '#34C759' },
        { name: 'Orange', hex: '#FF9500' },
        { name: 'Red', hex: '#FF3B30' },
        { name: 'Purple', hex: '#AF52DE' },
        { name: 'Black', hex: '#1d1d1f' },
    ];

    const adjustHeight = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    };

    useEffect(() => {
        adjustHeight();
        window.addEventListener('resize', adjustHeight);
        return () => window.removeEventListener('resize', adjustHeight);
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [value]);

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

        onValueChange && onValueChange(newText);
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

    const applySpoiler = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);
        const content = selectedText || "Type hidden text here..."; 
        const spoilerText = `\n<details>\n  <summary>Click to reveal</summary>\n\n  ${content}\n\n</details>\n`;
        const newText = `${text.substring(0, start)}${spoilerText}${text.substring(end)}`;

        onValueChange && onValueChange(newText);
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            if (selectedText) {
                ta.selectionStart = ta.selectionEnd = start + spoilerText.length;
            } else {
                const contentStart = start + spoilerText.indexOf(content);
                ta.selectionStart = contentStart;
                ta.selectionEnd = contentStart + content.length;
            }
        }, 0);
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
                newText = `${text.substring(0, start)}**${selectedText}**${text.substring(end)}`;
                cursorPos = start + 2;
                break;
            case 'italic':
                newText = `${text.substring(0, start)}*${selectedText}*${text.substring(end)}`;
                cursorPos = start + 1;
                break;
            case 'list':
                const lines = selectedText ? selectedText.split('\n').map(l => `- ${l}`) : ['- '];
                newText = `${text.substring(0, start)}${lines.join('\n')}${text.substring(end)}`;
                cursorPos = start + lines.join('\n').length;
                break;
            case 'code':
                newText = `${text.substring(0, start)}\`${selectedText}\`${text.substring(end)}`;
                cursorPos = start + 1;
                break;
            case 'link':
                newText = `${text.substring(0, start)}[${selectedText}](url)${text.substring(end)}`;
                cursorPos = start + 1 + selectedText.length + 3;
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

        onValueChange && onValueChange(newText);
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            ta.selectionStart = ta.selectionEnd = cursorPos + selectedText.length;
        }, 0);
    };

    const ToolbarButton = ({ icon: Icon, syntax, tooltip, onClick }) => (
        <button
            onClick={onClick || (() => applyMarkdown(syntax))}
            title={tooltip}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-all active:scale-90"
        >
            <Icon className="w-5 h-5" />
        </button>
    );

    return (
        <div className="border border-white/20 dark:border-white/10 rounded-[28px] overflow-hidden flex flex-col h-full bg-white/40 dark:bg-[#1e1e1e]/40 shadow-xl backdrop-blur-xl min-h-0 ring-1 ring-white/20 dark:ring-white/5">
            {/* Floating Toolbar Pilled Design */}
            <div className="flex items-center justify-center p-4 sticky top-0 z-10">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl rounded-full shadow-lg border border-black/5 dark:border-white/5 ring-1 ring-black/5">
                    <ToolbarButton icon={BoldIcon} syntax="bold" tooltip="Bold" />
                    <ToolbarButton icon={ItalicIcon} syntax="italic" tooltip="Italic" />
                    
                    <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1.5"></div>
                    
                    <ToolbarButton icon={H1Icon} syntax="h1" tooltip="Heading 1" />
                    <ToolbarButton icon={H2Icon} syntax="h2" tooltip="Heading 2" />
                    <ToolbarButton icon={H3Icon} syntax="h3" tooltip="Heading 3" />
                    
                    <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1.5"></div>

                    <ToolbarButton icon={QueueListIcon} syntax="list" tooltip="Bulleted List" />
                    <ToolbarButton icon={CodeBracketIcon} syntax="code" tooltip="Code" />
                    <ToolbarButton icon={LinkIcon} syntax="link" tooltip="Link" />
                    
                    <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1.5"></div>
                    
                    <div className="relative group">
                        <ToolbarButton icon={PaintBrushIcon} tooltip="Text Color" onClick={() => setShowColorPicker(s => !s)} />
                        {showColorPicker && (
                            <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-20 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-xl p-3 rounded-[20px] shadow-2xl border border-black/5 dark:border-white/10 flex gap-2 animate-in fade-in zoom-in duration-200">
                                {TEXT_COLORS.map(color => (
                                    <button 
                                        key={color.name} 
                                        title={color.name} 
                                        onClick={() => applyColor(color.hex)} 
                                        className="w-8 h-8 rounded-full border border-black/5 shadow-md hover:scale-110 transition-transform" 
                                        style={{ backgroundColor: color.hex }} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <ToolbarButton icon={ChatBubbleLeftRightIcon} tooltip="Block Quote" onClick={applyBlockQuote} />
                    <ToolbarButton icon={ChevronRightIcon} tooltip="Spoiler/Reveal" onClick={applySpoiler} />
                </div>
            </div>

            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar bg-transparent">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onValueChange && onValueChange(e.target.value)}
                    className="w-full p-0 font-mono text-[16px] leading-loose resize-none border-none focus:outline-none focus:ring-0 bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder={placeholder}
                    spellCheck="false"
                />
            </div>
        </div>
    );
};

// StrictModeDroppable wrapper for react-beautiful-dnd
const StrictModeDroppable = ({ children, ...props }) => {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => cancelAnimationFrame(animation);
    }, []);
    if (!enabled) return null;
    return <Droppable {...props}>{children}</Droppable>;
};

export default function EditLessonModal({ isOpen, onClose, lesson }) {
    const [title, setTitle] = useState('');
    const [studyGuideUrl, setStudyGuideUrl] = useState('');
    const [pages, setPages] = useState([]);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // iPadOS Input Style
    const inputClass = "w-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[16px] px-4 py-3 text-[15px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF]/50 outline-none transition-all shadow-inner backdrop-blur-sm";

    useEffect(() => {
        if (lesson) {
            setTitle(lesson.title || '');
            setStudyGuideUrl(lesson.studyGuideUrl || '');
            
            const formattedPages = lesson.pages?.map(page => {
                let normalizedPage = { ...page, id: `page-${Math.random()}` };
                normalizedPage.type = normalizedPage.type || 'text';
                normalizedPage.caption = normalizedPage.caption || '';

                if (normalizedPage.type === 'diagram' || normalizedPage.type === 'diagram-data') {
                    normalizedPage.type = 'diagram-data';
                    const content = normalizedPage.content || {};
                    const imageUrls = Array.isArray(content.imageUrls) ? content.imageUrls : (content.generatedImageUrl ? [content.generatedImageUrl] : []);
                    normalizedPage.content = {
                        labels: content.labels || [],
                        imageUrls: imageUrls,
                    };
                }
                return normalizedPage;
            }) || [];

            setPages(
                formattedPages.length > 0
                    ? formattedPages
                    : [{ id: `page-${Math.random()}`, title: '', content: '', type: 'text', caption: '' }]
            );
            setActivePageIndex(0);
        }
    }, [lesson]);

    if (!lesson) return null;

    const handlePageChange = (field, value) => {
        const newPages = [...pages];
        let pageData = { ...newPages[activePageIndex] };

        if (field === 'type') {
            pageData.type = value;
            if (value === 'diagram-data') {
                pageData.content = { labels: [], imageUrls: [] };
            } else if (value === 'video') {
                pageData.content = ''; 
            } else {
                pageData.content = ''; // Text
            }
        } else if (pageData.type === 'diagram-data') {
            let newContent = { ...(pageData.content || { labels: [], imageUrls: [] }) };
            if (field === 'diagram_labels') {
                newContent.labels = value.split(',').map(label => label.trim());
            } else if (field === 'imageUrls') {
                newContent.imageUrls = value;
            } else if (field === 'caption') {
                pageData.caption = value;
            }
            if (field !== 'caption') pageData.content = newContent;

        } else if (pageData.type === 'video') {
             if (field === 'caption') {
                pageData.caption = value;
            } else {
                pageData.content = value; 
            }
        } else {
            pageData[field] = value;
        }
        newPages[activePageIndex] = pageData;
        setPages(newPages);
    };

    const addPage = () => {
        const newPage = { id: `page-${Math.random()}`, title: `Page ${pages.length + 1}`, content: '', type: 'text', caption: '' };
        setPages([...pages, newPage]);
        setActivePageIndex(pages.length);
    };

    const removePage = (index) => {
        if (pages.length <= 1) return;
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
        setActivePageIndex(prev => Math.max(0, Math.min(prev, newPages.length - 1)));
    };

    const handleOnDragEnd = (result) => {
        if (!result.destination) return;
        const items = reorder(pages, result.source.index, result.destination.index);
        setPages(items);
        setActivePageIndex(result.destination.index);
    };

    const handleUpdateLesson = async () => {
        if (!title.trim()) { setError('Lesson title cannot be empty.'); return; }
        setLoading(true);
        setError('');
        try {
            const pagesToSave = pages.map(({ id, ...page }) => {
                const cleanPage = { ...page };
                cleanPage.caption = cleanPage.caption || '';

                if (cleanPage.type === "diagram-data") {
                    cleanPage.content = {
                        labels: (cleanPage.content?.labels || []).filter(Boolean),
                        imageUrls: cleanPage.content?.imageUrls || []
                    };
                } else {
                    cleanPage.content = cleanPage.content || '';
                }
                return cleanPage;
            });

            const lessonRef = doc(db, "lessons", lesson.id);
            await updateDoc(lessonRef, {
                title,
				lessonTitle: title,
                studyGuideUrl,
                pages: pagesToSave,
            });

            onClose();
        } catch (error) {
            console.error("Error updating lesson:", error);
            setError("Failed to update lesson.");
        } finally {
            setLoading(false);
        }
    };

    const activePage = pages[activePageIndex] || { title: '', content: '', type: 'text' };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-[#e5e5e5]/40 dark:bg-black/60 backdrop-blur-xl" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                {/* Main Container 
                    - Shows MobileRestricted on < md
                    - Shows Dialog.Panel on >= md (Tablets and Desktops)
                */}
                
                {/* --- MOBILE RESTRICTION (Visible < md) --- */}
                <MobileRestricted onClose={onClose} />

                {/* --- MAIN EDITOR (Visible >= md) --- */}
                <Dialog.Panel className="hidden md:flex w-full h-[95vh] max-w-[1600px] transform overflow-hidden bg-[#f5f5f7]/80 dark:bg-[#000000]/80 backdrop-blur-2xl rounded-[32px] shadow-2xl ring-1 ring-white/20 dark:ring-white/10 flex-col transition-all border border-white/40 dark:border-white/5">
                    
                    {/* Header */}
                    <div className="flex-shrink-0 px-8 py-5 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-[#1e1e1e]/40 backdrop-blur-xl z-20">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button onClick={onClose} className="p-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95">
                                    <XMarkIcon className="w-5 h-5 stroke-[2.5] text-slate-600 dark:text-white" />
                                </button>
                                <div>
                                    <Dialog.Title className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">Edit Lesson</Dialog.Title>
                                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1">iPadOS Studio Mode</p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                <input 
                                    placeholder="Lesson Title" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    className={`${inputClass} font-bold w-full md:w-72`} 
                                />
                                <input 
                                    placeholder="Study Guide URL" 
                                    value={studyGuideUrl} 
                                    onChange={(e) => setStudyGuideUrl(e.target.value)} 
                                    className={`${inputClass} w-full md:w-72`} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow flex flex-col lg:flex-row overflow-hidden p-6 gap-6 relative z-0">
                        
                        {/* Sidebar */}
                        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[28px] shadow-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                            <div className="p-5 border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-white/5">
                                <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Structure</h3>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                                <DragDropContext onDragEnd={handleOnDragEnd}>
                                    <StrictModeDroppable droppableId="pages">
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                                {pages.map((page, index) => (
                                                    <Draggable key={page.id} draggableId={String(page.id)} index={index}>
                                                        {(provided, snapshot) => {
                                                            const isActive = activePageIndex === index;
                                                            return (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    onClick={() => setActivePageIndex(index)}
                                                                    className={`group relative flex items-center justify-between p-4 rounded-[20px] cursor-pointer transition-all duration-300 ease-out border
                                                                        ${isActive 
                                                                            ? 'bg-white/80 dark:bg-white/10 shadow-lg border-white/40 dark:border-white/10 scale-[1.02] z-10 ring-1 ring-black/5' 
                                                                            : 'border-transparent hover:bg-white/40 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                                                                        }`}
                                                                >
                                                                    {isActive && (
                                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1.5 bg-[#007AFF] rounded-r-full shadow-[0_0_12px_rgba(0,122,255,0.6)]" />
                                                                    )}
                                                                    <div className="flex items-center gap-4 overflow-hidden pl-2">
                                                                        <Bars3Icon className="h-5 w-5 stroke-[2.5] text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"/>
                                                                        <div className="flex flex-col">
                                                                            <span className={`font-bold text-[14px] truncate leading-tight ${isActive ? 'text-slate-900 dark:text-white' : ''}`}>
                                                                                {page.title || `Page ${index + 1}`}
                                                                            </span>
                                                                            <span className="text-[11px] text-slate-400 font-bold tracking-wide uppercase mt-0.5">
                                                                                {page.type === 'diagram-data' ? 'Image' : page.type}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); removePage(index); }}
                                                                        disabled={pages.length <= 1}
                                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 disabled:hidden active:scale-90"
                                                                    >
                                                                        <TrashIcon className="h-5 w-5 stroke-[2.5]"/>
                                                                    </button>
                                                                </div>
                                                            );
                                                        }}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </StrictModeDroppable>
                                </DragDropContext>
                            </div>
                            <div className="p-5 border-t border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md">
                                <button onClick={addPage} className="w-full flex justify-center items-center gap-2 px-4 py-4 rounded-[20px] bg-white/60 dark:bg-white/10 hover:bg-[#007AFF]/10 dark:hover:bg-white/20 shadow-sm border border-white/40 dark:border-white/5 text-[15px] font-bold text-[#007AFF] dark:text-white transition-all active:scale-95 group">
                                    <PlusCircleIcon className="w-6 h-6 stroke-[2.5] transition-transform group-hover:rotate-90"/>
                                    Add New Page
                                </button>
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="flex-grow flex flex-col min-h-0 bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[28px] shadow-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                             {/* Editor Toolbar */}
                            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-white/5 backdrop-blur-md">
                                <div className="flex items-center gap-4 flex-1">
                                    <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest">Editing</span>
                                    <input 
                                        placeholder="Page Title" 
                                        value={activePage.title} 
                                        onChange={(e) => handlePageChange('title', e.target.value)} 
                                        className="bg-transparent border-none p-0 text-xl font-bold text-slate-900 dark:text-white focus:ring-0 placeholder-slate-400 w-full tracking-tight"
                                    />
                                </div>
                                
                                {/* Pilled Tabs */}
                                <div className="flex p-1.5 bg-slate-200/50 dark:bg-black/40 rounded-[18px] backdrop-blur-md">
                                    {['Text', 'Image', 'Video'].map((type, idx) => {
                                        const value = ['text', 'diagram-data', 'video'][idx];
                                        const isSelected = activePage.type === value;
                                        const icons = [BookOpenIcon, PhotoIcon, VideoCameraIcon];
                                        const Icon = icons[idx];
                                        return (
                                            <button 
                                                key={type} 
                                                onClick={() => handlePageChange('type', value)}
                                                className={`flex items-center gap-2 rounded-[14px] py-2 px-5 text-[13px] font-bold transition-all duration-300 outline-none
                                                ${isSelected 
                                                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-md scale-[1.02]' 
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4 stroke-[2.5]" />
                                                <span className="hidden sm:inline">{type}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Content Render */}
                            <div className="flex-grow overflow-hidden p-6 sm:p-8">
                                {/* MODE: TEXT */}
                                {activePage.type === 'text' && (
                                    <div className="h-full flex flex-col lg:flex-row gap-8">
                                        <div className="flex-1 h-full min-h-0">
                                            <MarkdownEditor
                                                value={typeof activePage.content === 'string' ? activePage.content : ''}
                                                onValueChange={(val) => handlePageChange('content', val)}
                                            />
                                        </div>
                                        <div className="flex-1 h-full min-h-0 hidden lg:block">
                                            <div className="w-full h-full border border-white/20 dark:border-white/5 rounded-[28px] bg-white/40 dark:bg-black/20 p-8 overflow-y-auto custom-scrollbar prose prose-slate dark:prose-invert max-w-none shadow-inner ring-1 ring-black/5">
                                                <div className="mb-6 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <EyeIcon className="w-4 h-4" /> Live Preview
                                                </div>
                                                <ContentRenderer text={typeof activePage.content === 'string' ? activePage.content : ''} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MODE: IMAGE */}
                                {activePage.type === 'diagram-data' && (
                                    <div className="h-full flex flex-col lg:flex-row gap-8">
                                        {/* Left: Config & Caption */}
                                        <div className="flex-1 flex flex-col gap-6 h-full min-h-0 overflow-y-auto custom-scrollbar p-1">
                                            {/* Config */}
                                            <div className="w-full p-6 bg-white/40 dark:bg-white/5 rounded-[28px] border border-white/20 dark:border-white/5 shadow-sm">
                                                <div className="space-y-5">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="p-3 rounded-[16px] bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                                            <PhotoIcon className="w-7 h-7 stroke-[2]" />
                                                        </div>
                                                        <label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Image Configuration</label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                            <div key={idx} className="flex gap-2 items-center">
                                                                <input placeholder={`Paste Image URL #${idx + 1}`} value={url} onChange={(e) => { const newUrls = [...activePage.content.imageUrls]; newUrls[idx] = e.target.value; handlePageChange('imageUrls', newUrls); }} className={inputClass}/>
                                                                <button onClick={() => { const newUrls = activePage.content.imageUrls.filter((_, i) => i !== idx); handlePageChange('imageUrls', newUrls); }} className="p-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[16px] transition-colors border border-transparent hover:border-red-100">
                                                                    <TrashIcon className="w-5 h-5 stroke-[2.5]"/>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button onClick={() => handlePageChange('imageUrls', [...(activePage.content?.imageUrls || []), ''])} className="w-full flex justify-center items-center gap-2 px-4 py-3.5 bg-gradient-to-r from-[#007AFF] to-[#0051A8] text-white rounded-[18px] font-bold text-[15px] transition-all hover:shadow-lg shadow-blue-500/20 active:scale-[0.98]">
                                                        <PlusCircleIcon className="w-5 h-5 stroke-[2.5]"/>
                                                        Add Image Source
                                                    </button>
                                                    <div className="mt-4 pt-5 border-t border-black/5 dark:border-white/5">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block ml-1">Labels (Optional)</label>
                                                        <input placeholder="Comma-separated labels" value={Array.isArray(activePage.content?.labels) ? activePage.content.labels.join(', ') : ''} onChange={(e) => handlePageChange('diagram_labels', e.target.value)} className={inputClass}/>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Caption Editor */}
                                            <div className="flex-1 min-h-[300px] relative rounded-[28px] overflow-hidden shadow-sm border border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                                                <div className="absolute top-0 left-0 right-0 px-6 py-3 bg-white/60 dark:bg-[#2c2c2e]/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-10">
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Description / Caption</span>
                                                </div>
                                                <div className="pt-12 h-full">
                                                    <MarkdownEditor
                                                        value={activePage.caption || ''}
                                                        onValueChange={(val) => handlePageChange('caption', val)}
                                                        placeholder="Write a caption, introduction, or detailed explanation..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Right: Live Preview */}
                                        <div className="flex-1 h-full hidden lg:block min-h-0">
                                            <div className="w-full h-full border border-white/20 dark:border-white/5 rounded-[28px] bg-white/60 dark:bg-black/20 p-8 overflow-y-auto custom-scrollbar shadow-inner ring-1 ring-black/5">
                                                <div className="mb-6 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <EyeIcon className="w-4 h-4" /> Live Preview
                                                </div>
                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-1 gap-6">
                                                        {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                            url ? (
                                                                <div key={idx} className="rounded-[24px] overflow-hidden shadow-xl border border-black/5 dark:border-white/10">
                                                                    <img src={url} alt={`Preview ${idx}`} className="w-full h-auto object-cover" onError={(e) => e.target.style.display = 'none'} />
                                                                </div>
                                                            ) : (
                                                                <div key={idx} className="h-48 rounded-[24px] bg-slate-100 dark:bg-white/5 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-white/10">
                                                                    <p className="text-[15px] text-slate-400 font-medium">Image {idx + 1} Placeholder</p>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                    {activePage.caption && (
                                                        <div className="prose prose-sm max-w-none prose-slate dark:prose-invert p-6 bg-white/50 dark:bg-white/5 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
                                                            <ContentRenderer text={activePage.caption} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MODE: VIDEO */}
                                {activePage.type === 'video' && (
                                    <div className="h-full flex flex-col lg:flex-row gap-8">
                                        {/* Left: Config & Caption */}
                                        <div className="flex-1 flex flex-col gap-6 h-full min-h-0 overflow-y-auto custom-scrollbar p-1">
                                            <div className="w-full p-8 bg-white/40 dark:bg-white/5 rounded-[28px] border border-white/20 dark:border-white/5 shadow-sm text-center">
                                                <div className="flex flex-col items-center gap-5 max-w-lg mx-auto">
                                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-pink-500 to-rose-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-pink-500/30">
                                                        <VideoCameraIcon className="w-10 h-10 text-white stroke-[1.5]" />
                                                    </div>
                                                    <div className="w-full">
                                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Embed Video</h4>
                                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6 font-medium">Paste a YouTube or Vimeo link to embed content.</p>
                                                        <input 
                                                            placeholder="https://youtube.com/watch?v=..." 
                                                            value={typeof activePage.content === 'string' ? activePage.content : ''} 
                                                            onChange={(e) => handlePageChange('content', e.target.value)} 
                                                            className={`${inputClass} text-center font-medium shadow-sm`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Caption Editor */}
                                            <div className="flex-1 min-h-[300px] relative rounded-[28px] overflow-hidden shadow-sm border border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                                                <div className="absolute top-0 left-0 right-0 px-6 py-3 bg-white/60 dark:bg-[#2c2c2e]/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-10">
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Description / Caption</span>
                                                </div>
                                                <div className="pt-12 h-full">
                                                    <MarkdownEditor
                                                        value={activePage.caption || ''}
                                                        onValueChange={(val) => handlePageChange('caption', val)}
                                                        placeholder="Write a caption, introduction, or explanation..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Live Preview */}
                                        <div className="flex-1 h-full hidden lg:block min-h-0">
                                            <div className="w-full h-full border border-white/20 dark:border-white/5 rounded-[28px] bg-white/60 dark:bg-black/20 p-8 overflow-y-auto custom-scrollbar shadow-inner ring-1 ring-black/5">
                                                <div className="mb-6 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <EyeIcon className="w-4 h-4" /> Live Preview
                                                </div>
                                                <div className="space-y-8">
                                                    <div className="aspect-video rounded-[24px] overflow-hidden bg-black shadow-2xl">
                                                        {activePage.content ? (
                                                            <iframe
                                                                className="w-full h-full"
                                                                src={getEmbedUrl(activePage.content)}
                                                                title="Video Preview"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <p className="text-slate-500 text-[15px] font-medium">No Video URL Provided</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {activePage.caption && (
                                                        <div className="prose prose-sm max-w-none prose-slate dark:prose-invert p-6 bg-white/50 dark:bg-white/5 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
                                                            <ContentRenderer text={activePage.caption} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 flex justify-between items-center px-8 py-5 border-t border-black/5 dark:border-white/5 bg-white/40 dark:bg-[#1e1e1e]/40 backdrop-blur-xl z-20">
                         <p className="text-sm font-bold text-red-500 ml-2">{error}</p>
                        <div className="flex gap-4 ml-auto">
                            <button className="px-8 py-3 rounded-[18px] font-bold text-[15px] text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-white/20 dark:border-white/10 transition-all shadow-sm active:scale-95" onClick={onClose}>
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateLesson} 
                                disabled={loading} 
                                className="px-10 py-3 font-bold text-[15px] bg-gradient-to-r from-[#007AFF] to-[#0051A8] hover:shadow-blue-500/40 text-white shadow-lg shadow-blue-500/30 transition-all rounded-[18px] disabled:bg-slate-400 disabled:shadow-none active:scale-95 flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : (
                                    <>
                                        <CheckIcon className="w-5 h-5 stroke-[2.5]" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}