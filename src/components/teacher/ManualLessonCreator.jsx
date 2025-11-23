import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { Dialog, Tab } from '@headlessui/react';
import {
    ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, Bars3Icon,
    CodeBracketIcon, LinkIcon, QueueListIcon, PaintBrushIcon, ChatBubbleLeftRightIcon,
    DocumentTextIcon, PhotoIcon, VideoCameraIcon, DevicePhoneMobileIcon,
    ListBulletIcon, CheckIcon, EyeIcon
} from '@heroicons/react/24/outline';
import ContentRenderer from './ContentRenderer';

// --- DND-KIT IMPORTS ---
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- CUSTOM ICONS ---
const BoldIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
);
const ItalicIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
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
        <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
);

// --- HELPER: Video URL to Embed ---
const getEmbedUrl = (url) => {
    if (!url) return '';
    // Simple Youtube conversion
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    return url; 
};

// --- SKELETON LOADING STATE ---
const LessonCreatorSkeleton = () => (
    <div className="flex flex-col h-full w-full animate-pulse bg-[#f5f5f7] dark:bg-[#121212]">
        {/* Header Skeleton */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-black/5 dark:border-white/5">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-md"></div>
                        <div className="h-2 w-24 bg-slate-200 dark:bg-white/10 rounded-md"></div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-32 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
                    <div className="h-10 w-32 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
                </div>
            </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-grow flex gap-6 p-6 overflow-hidden">
            {/* Sidebar */}
            <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">
                <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-md mb-2"></div>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-14 w-full bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
                ))}
                <div className="mt-auto h-14 w-full bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
            </div>
            
            {/* Editor Area */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="h-16 w-full bg-slate-200 dark:bg-white/10 rounded-2xl"></div>
                <div className="flex-1 bg-slate-200 dark:bg-white/10 rounded-3xl"></div>
            </div>
        </div>
    </div>
);

// --- LANDSCAPE WARNING OVERLAY ---
const LandscapeWarning = () => (
    <div className="fixed inset-0 z-[100] bg-[#f5f5f7]/95 dark:bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center lg:hidden portrait:flex">
        <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-white/10 shadow-2xl flex items-center justify-center mb-8 animate-bounce-slow ring-1 ring-black/5">
            <DevicePhoneMobileIcon className="w-12 h-12 text-[#007AFF] rotate-90 stroke-[1.5]" />
        </div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Rotate to Edit</h3>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium">
            The lesson studio requires landscape mode for the best experience.
        </p>
    </div>
);

// --- MARKDOWN EDITOR ---
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

    const ToolbarButton = ({ icon: Icon, text, syntax, tooltip, onClick }) => (
        <button
            onClick={onClick || (() => applyMarkdown(syntax))}
            title={tooltip}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-all active:scale-90"
        >
            {Icon ? <Icon className="w-5 h-5" /> : <span className="text-xs font-black px-1">{text}</span>}
        </button>
    );

    return (
        <div className="border border-black/5 dark:border-white/10 rounded-[24px] overflow-hidden flex flex-col h-full bg-white/40 dark:bg-[#1e1e1e]/40 shadow-sm backdrop-blur-md min-h-0 ring-1 ring-white/20 dark:ring-white/5">
            {/* Floating Toolbar Pilled Design */}
            <div className="flex items-center justify-center p-3 sticky top-0 z-10">
                <div className="flex items-center gap-1 px-2 py-1.5 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl rounded-full shadow-lg border border-black/5 dark:border-white/5 ring-1 ring-black/5">
                    <ToolbarButton icon={BoldIcon} syntax="bold" tooltip="Bold" />
                    <ToolbarButton icon={ItalicIcon} syntax="italic" tooltip="Italic" />
                    
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                    
                    <ToolbarButton icon={H1Icon} syntax="h1" tooltip="Heading 1" />
                    <ToolbarButton icon={H2Icon} syntax="h2" tooltip="Heading 2" />
                    
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>

                    <ToolbarButton icon={ListBulletIcon} syntax="list" tooltip="Bulleted List" />
                    <ToolbarButton icon={CodeBracketIcon} syntax="code" tooltip="Code" />
                    <ToolbarButton icon={LinkIcon} syntax="link" tooltip="Link" />
                    
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                    
                    <div className="relative group">
                        <ToolbarButton icon={PaintBrushIcon} tooltip="Text Color" onClick={() => setShowColorPicker(s => !s)} />
                        {showColorPicker && (
                            <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-20 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-xl p-3 rounded-[14px] shadow-2xl border border-black/5 dark:border-white/10 flex gap-2 animate-in fade-in zoom-in duration-200">
                                {TEXT_COLORS.map(color => (
                                    <button 
                                        key={color.name} 
                                        title={color.name} 
                                        onClick={() => applyColor(color.hex)} 
                                        className="w-6 h-6 rounded-full border border-black/5 shadow-sm hover:scale-110 transition-transform" 
                                        style={{ backgroundColor: color.hex }} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <ToolbarButton icon={ChatBubbleLeftRightIcon} tooltip="Block Quote" onClick={applyBlockQuote} />
                </div>
            </div>
            
            {/* Editor Area */}
            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar bg-transparent">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onValueChange && onValueChange(e.target.value)}
                    className="w-full p-0 font-mono text-[15px] leading-loose resize-none border-none focus:outline-none focus:ring-0 bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder={placeholder}
                    spellCheck="false"
                />
            </div>
        </div>
    );
};


// --- SORTABLE PAGE ITEM ---
function SortablePageItem({ id, page, index, activePageIndex, setActivePageIndex, removePage, isOnlyPage }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : 'auto' };
    const isActive = activePageIndex === index;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => setActivePageIndex(index)}
            className={`group relative flex items-center justify-between p-3.5 rounded-[16px] cursor-pointer transition-all duration-300 ease-out
                       ${isActive 
                           ? 'bg-white dark:bg-white/10 shadow-lg ring-1 ring-black/5 dark:ring-white/10 scale-[1.02] z-10' 
                           : 'hover:bg-white/50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:shadow-sm'
                       }`}
        >
            {/* Active Indicator */}
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-[#007AFF] rounded-r-full shadow-[0_0_10px_rgba(0,122,255,0.5)]" />
            )}
            
            <div className="flex items-center gap-3 overflow-hidden pl-3">
                <button {...listeners} {...attributes} className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none transition-colors">
                    <Bars3Icon className="h-5 w-5 stroke-[2.5]"/>
                </button>
                <div className="flex flex-col">
                    <span className={`font-bold text-[13px] truncate leading-tight ${isActive ? 'text-slate-900 dark:text-white' : ''}`}>
                        {page.title || `Page ${index + 1}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                        {page.type === 'diagram-data' ? 'Image' : page.type}
                    </span>
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); removePage(index); }}
                disabled={isOnlyPage}
                title="Remove page"
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 disabled:hidden active:scale-90"
            >
                <TrashIcon className="h-4 w-4 stroke-[2.5]"/>
            </button>
        </div>
    );
}

export default function ManualLessonCreator({ onClose, onBack, unitId, subjectId }) {
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [studyGuideUrl, setStudyGuideUrl] = useState('');
    const [pages, setPages] = useState([{ 
        id: `page-${Date.now()}`, 
        title: 'Page 1', 
        content: '', 
        type: 'text',
        caption: '' 
    }]);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    
    // Visual Styles
    const inputClass = "w-full bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[14px] px-4 py-2.5 text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF]/50 outline-none transition-all shadow-sm backdrop-blur-md";

    const handlePageChange = (field, value) => {
        const newPages = [...pages];
        let pageData = { ...newPages[activePageIndex] };

        if (field === 'type') {
            pageData.type = value;
            // Initialize correct content structure based on type
            if (value === 'diagram-data') {
                pageData.content = { labels: [], imageUrls: [] }; 
            } else if (value === 'video') {
                pageData.content = ''; // URL String
            } else {
                pageData.content = ''; // Text Body
            }
        } else if (pageData.type === 'diagram-data') {
            // Image Logic
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
            // Video Logic
            if (field === 'caption') {
                pageData.caption = value;
            } else if (field !== 'type') {
                pageData.content = value; // URL is the content
            }
        } else {
            // Text Logic
            pageData[field] = value;
        }
        newPages[activePageIndex] = pageData;
        setPages(newPages);
    };

    const addPage = () => {
        const newPage = { id: `page-${Date.now()}`, title: `Page ${pages.length + 1}`, content: '', type: 'text', caption: '' };
        setPages([...pages, newPage]);
        setActivePageIndex(pages.length);
    };

    const removePage = (index) => {
        if (pages.length <= 1) {
            showToast("You cannot delete the last page.", "warning");
            return;
        }
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
        setActivePageIndex(prev => Math.max(0, Math.min(prev, newPages.length - 1)));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setPages((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleAddLesson = async () => {
        if (!title.trim()) { setError('Lesson title cannot be empty.'); return; }
        setLoading(true);
        setError('');
        try {
            const pagesToSave = pages.map(({ id, ...page }) => {
                const cleanPage = { ...page };
                
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

            await addDoc(collection(db, 'lessons'), { title, unitId, subjectId, studyGuideUrl, pages: pagesToSave, createdAt: serverTimestamp() });
            showToast('Lesson saved successfully!', 'success');
            onClose();
        } catch (err) {
            console.error("Error adding lesson:", err);
            setError("Failed to save the lesson.");
        } finally {
            setLoading(false);
        }
    };

    const activePage = pages[activePageIndex] || { id: '', title: '', content: '', type: 'text' };
    const pageTypeIndex = ['text', 'diagram-data', 'video'].indexOf(activePage.type);

    if (loading) {
        return <LessonCreatorSkeleton />;
    }

    return (
        <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#121212] font-sans text-slate-900 dark:text-white">
            
            {/* --- MOBILE LANDSCAPE WARNING --- */}
            <LandscapeWarning />

            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-xl z-20 sticky top-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 transition-all active:scale-95">
                            <ArrowUturnLeftIcon className="w-5 h-5 stroke-[2.5] text-slate-600 dark:text-white" />
                        </button>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight leading-none">Lesson Studio</h3>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Manual Content Creator</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <input 
                            type="text" 
                            placeholder="Lesson Title (e.g. Intro to Biology)" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            className={`${inputClass} font-bold`} 
                        />
                        <input 
                            type="text" 
                            placeholder="Study Guide URL (Optional)" 
                            value={studyGuideUrl} 
                            onChange={(e) => setStudyGuideUrl(e.target.value)} 
                            className={inputClass} 
                        />
                    </div>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden p-4 gap-4 relative z-0">
                
                {/* Left Sidebar: Pages List */}
                <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm overflow-hidden ring-1 ring-white/20 dark:ring-white/5">
                    <div className="p-4 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5">
                        <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Structure</h3>
                    </div>
                    <div className="flex-grow overflow-y-auto p-3 custom-scrollbar">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                {pages.map((page, index) => (
                                    <SortablePageItem
                                        key={page.id}
                                        id={page.id}
                                        page={page}
                                        index={index}
                                        activePageIndex={activePageIndex}
                                        setActivePageIndex={setActivePageIndex}
                                        removePage={removePage}
                                        isOnlyPage={pages.length <= 1}
                                    />
                                ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                    <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/20 backdrop-blur-md">
                         <button onClick={addPage} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-[16px] bg-white/80 dark:bg-white/10 hover:bg-[#007AFF]/10 dark:hover:bg-white/20 shadow-sm border border-black/5 dark:border-white/5 text-sm font-bold text-[#007AFF] dark:text-white transition-all active:scale-95 group">
                            <PlusCircleIcon className="w-5 h-5 stroke-[2.5] transition-transform group-hover:rotate-90"/>
                            Add New Page
                        </button>
                    </div>
                </div>
                
                {/* Center: Editor */}
                <div className="flex-grow flex flex-col min-h-0 bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm overflow-hidden ring-1 ring-white/20 dark:ring-white/5">
                    
                    {/* Editor Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-3 flex-1">
                            <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Editing</span>
                            <input 
                                placeholder="Page Title" 
                                value={activePage.title} 
                                onChange={(e) => handlePageChange('title', e.target.value)} 
                                className="bg-transparent border-none p-0 text-lg font-bold text-slate-900 dark:text-white focus:ring-0 placeholder-slate-400 w-full tracking-tight"
                            />
                        </div>
                        
                        {/* Type Switcher (Segmented Control) */}
                        <Tab.Group selectedIndex={pageTypeIndex > -1 ? pageTypeIndex : 0} onChange={(index) => handlePageChange('type', ['text', 'diagram-data', 'video'][index])}>
                            <Tab.List className="flex p-1 bg-slate-200/60 dark:bg-black/40 rounded-xl backdrop-blur-md">
                                {['Text', 'Image', 'Video'].map((type, idx) => {
                                    const icons = [DocumentTextIcon, PhotoIcon, VideoCameraIcon];
                                    const Icon = icons[idx];
                                    return (
                                        <Tab key={type} className={({ selected }) =>
                                            `flex items-center gap-2 rounded-[10px] py-1.5 px-4 text-[13px] font-bold transition-all outline-none duration-200
                                            ${selected 
                                                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm scale-[1.02]' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`
                                        }>
                                            <Icon className="w-4 h-4 stroke-[2.5]" />
                                            <span className="hidden sm:inline">{type}</span>
                                        </Tab>
                                    );
                                })}
                            </Tab.List>
                        </Tab.Group>
                    </div>
                    
                    {/* Content Area */}
                    <div className="flex-grow overflow-hidden p-4 sm:p-6">
                        
                        {/* MODE: TEXT */}
                        {activePage.type === 'text' && (
                            <div className="h-full flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 h-full min-h-0 shadow-sm rounded-[24px]">
                                    <MarkdownEditor
                                        value={typeof activePage.content === 'string' ? activePage.content : ''}
                                        onValueChange={(val) => handlePageChange('content', val)}
                                    />
                                </div>
                                <div className="flex-1 h-full min-h-0 hidden lg:block">
                                    <div className="w-full h-full border border-black/5 dark:border-white/5 rounded-[24px] bg-white/60 dark:bg-black/20 p-8 overflow-y-auto custom-scrollbar prose prose-sm max-w-none prose-slate dark:prose-invert shadow-inner ring-1 ring-black/5">
                                        <div className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Preview</div>
                                        <ContentRenderer text={typeof activePage.content === 'string' ? activePage.content : ''} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODE: IMAGE */}
                        {activePage.type === 'diagram-data' && (
                            <div className="h-full flex flex-col lg:flex-row gap-6">
                                {/* Left: Config & Caption Editor */}
                                <div className="flex-1 flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar p-1">
                                    {/* Image Config */}
                                    <div className="w-full p-6 bg-white/60 dark:bg-white/5 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2.5 rounded-[12px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-inner">
                                                    <PhotoIcon className="w-6 h-6" />
                                                </div>
                                                <label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Image Configuration</label>
                                            </div>
                                            
                                            {/* URL List */}
                                            <div className="space-y-2">
                                                {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center group">
                                                        <input placeholder={`Paste Image URL #${idx + 1}`} value={url} onChange={(e) => { const newUrls = [...activePage.content.imageUrls]; newUrls[idx] = e.target.value; handlePageChange('imageUrls', newUrls); }} className={inputClass}/>
                                                        <button onClick={() => { const newUrls = activePage.content.imageUrls.filter((_, i) => i !== idx); handlePageChange('imageUrls', newUrls); }} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-100">
                                                            <TrashIcon className="w-5 h-5 stroke-[2]"/>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => handlePageChange('imageUrls', [...(activePage.content?.imageUrls || []), ''])} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#007AFF] to-[#0051A8] text-white rounded-[14px] font-bold text-sm transition-all hover:shadow-lg shadow-blue-500/20 active:scale-[0.98]">
                                                <PlusCircleIcon className="w-5 h-5 stroke-[2.5]"/>
                                                Add Image Source
                                            </button>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block ml-1">Interactive Labels (Optional)</label>
                                            <input placeholder="Comma-separated labels (e.g. Nucleus, Cytoplasm)" value={Array.isArray(activePage.content?.labels) ? activePage.content.labels.join(', ') : ''} onChange={(e) => handlePageChange('diagram_labels', e.target.value)} className={inputClass}/>
                                        </div>
                                    </div>

                                    {/* Caption Editor */}
                                    <div className="flex-1 min-h-[300px] relative rounded-[24px] overflow-hidden shadow-sm border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5">
                                        <div className="absolute top-0 left-0 right-0 px-4 py-2 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 z-10">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description / Caption</span>
                                        </div>
                                        <div className="pt-10 h-full">
                                            <MarkdownEditor
                                                value={activePage.caption || ''}
                                                onValueChange={(val) => handlePageChange('caption', val)}
                                                placeholder="Write a caption, introduction, or detailed explanation for these images..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Preview */}
                                <div className="flex-1 h-full hidden lg:block min-h-0">
                                    <div className="w-full h-full border border-black/5 dark:border-white/5 rounded-[24px] bg-white/60 dark:bg-black/20 p-6 overflow-y-auto custom-scrollbar shadow-inner ring-1 ring-black/5">
                                        <div className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <EyeIcon className="w-4 h-4" /> Live Preview
                                        </div>
                                        <div className="space-y-6">
                                            {/* Image Preview */}
                                            <div className="grid grid-cols-1 gap-4">
                                                {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                    url ? (
                                                        <div key={idx} className="rounded-xl overflow-hidden shadow-sm border border-black/5 dark:border-white/10">
                                                            <img src={url} alt={`Preview ${idx}`} className="w-full h-auto object-cover" onError={(e) => e.target.style.display = 'none'} />
                                                        </div>
                                                    ) : (
                                                        <div key={idx} className="h-40 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-dashed border-slate-300 dark:border-white/10">
                                                            <p className="text-sm text-slate-400 font-medium">Image {idx + 1} Placeholder</p>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                            {/* Rendered Caption */}
                                            {activePage.caption && (
                                                <div className="prose prose-sm max-w-none prose-slate dark:prose-invert p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
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
                            <div className="h-full flex flex-col lg:flex-row gap-6">
                                {/* Left: Config & Caption Editor */}
                                <div className="flex-1 flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar p-1">
                                    {/* Video Config */}
                                    <div className="w-full p-8 bg-white/60 dark:bg-white/5 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm text-center">
                                        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
                                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-rose-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-pink-500/30">
                                                <VideoCameraIcon className="w-8 h-8 text-white" />
                                            </div>
                                            <div className="w-full">
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Embed Video</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Paste a YouTube or Vimeo link.</p>
                                                <input 
                                                    placeholder="https://youtube.com/watch?v=..." 
                                                    value={typeof activePage.content === 'string' ? activePage.content : ''} 
                                                    onChange={(e) => handlePageChange('content', e.target.value)} 
                                                    className={`${inputClass} text-center font-medium`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Caption Editor */}
                                    <div className="flex-1 min-h-[300px] relative rounded-[24px] overflow-hidden shadow-sm border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5">
                                        <div className="absolute top-0 left-0 right-0 px-4 py-2 bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 z-10">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description / Caption</span>
                                        </div>
                                        <div className="pt-10 h-full">
                                            <MarkdownEditor
                                                value={activePage.caption || ''}
                                                onValueChange={(val) => handlePageChange('caption', val)}
                                                placeholder="Write a caption, introduction, or explanation for this video..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Preview */}
                                <div className="flex-1 h-full hidden lg:block min-h-0">
                                    <div className="w-full h-full border border-black/5 dark:border-white/5 rounded-[24px] bg-white/60 dark:bg-black/20 p-6 overflow-y-auto custom-scrollbar shadow-inner ring-1 ring-black/5">
                                        <div className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <EyeIcon className="w-4 h-4" /> Live Preview
                                        </div>
                                        <div className="space-y-6">
                                            {/* Video Embed Preview */}
                                            <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
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
                                                        <p className="text-slate-500 text-sm">No Video URL Provided</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Rendered Caption */}
                                            {activePage.caption && (
                                                <div className="prose prose-sm max-w-none prose-slate dark:prose-invert p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
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
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-t border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-xl z-20">
                <p className="text-sm font-bold text-red-500 ml-2">{error}</p>
                <div className="flex gap-3">
                    <button className="px-6 py-2.5 rounded-[16px] font-bold text-sm text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-black/5 dark:border-white/5 transition-all shadow-sm active:scale-95" onClick={onClose}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleAddLesson} 
                        disabled={loading} 
                        className="px-8 py-2.5 font-bold text-sm bg-gradient-to-r from-[#007AFF] to-[#0051A8] hover:shadow-blue-500/40 text-white shadow-lg shadow-blue-500/30 transition-all rounded-[16px] disabled:bg-slate-400 disabled:shadow-none active:scale-95 flex items-center gap-2"
                    >
                        {loading ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5 stroke-[2.5]" />
                                Save Lesson
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}