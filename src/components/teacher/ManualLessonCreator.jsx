import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import {
    Dialog,
    Tab,
} from '@headlessui/react';
import {
    ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, Bars3Icon, CheckCircleIcon,
    CodeBracketIcon, LinkIcon, QueueListIcon, PaintBrushIcon, ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import ContentRenderer from './ContentRenderer';

// --- DND-KIT IMPORTS (Modern Replacement for react-beautiful-dnd) ---
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

// Custom Icon Components for Toolbar
const BoldIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H16.5" />
      <path d="M7 5v14h7c2.21 0 4-1.79 4-4s-1.79-4-4-4h-4m4 0H7" />
    </svg>
);
const ItalicIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 5l-4 14h3l4-14h-3z" />
    </svg>
);


// Markdown Editor Component
const MarkdownEditor = ({ value, onValueChange }) => {
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
            className="p-2 rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center"
        >
            {Icon ? <Icon className="w-5 h-5" /> : <span className="text-xs font-bold px-1">{text}</span>}
        </button>
    );

    return (
        <div className="border border-slate-300/80 rounded-xl overflow-hidden flex flex-col h-full bg-white/80 min-h-0">
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-slate-300/80 bg-slate-100/80">
                <ToolbarButton icon={BoldIcon} syntax="bold" tooltip="Bold" />
                <ToolbarButton icon={ItalicIcon} syntax="italic" tooltip="Italic" />
                <ToolbarButton icon={QueueListIcon} syntax="list" tooltip="Bulleted List" />
                <ToolbarButton icon={CodeBracketIcon} syntax="code" tooltip="Inline Code" />
                <ToolbarButton icon={LinkIcon} syntax="link" tooltip="Link" />
                <div className="w-px h-6 bg-slate-300/80 mx-1"></div>
                <div className="relative">
                    <ToolbarButton icon={PaintBrushIcon} tooltip="Text Color" onClick={() => setShowColorPicker(s => !s)} />
                    {showColorPicker && (
                        <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full mt-2 z-10 bg-white p-2 rounded-lg shadow-xl border border-slate-200 flex gap-2">
                            {TEXT_COLORS.map(color => (
                                <button key={color.name} title={color.name} onClick={() => applyColor(color.hex)} className="w-6 h-6 rounded-full" style={{ backgroundColor: color.hex }} />
                            ))}
                        </div>
                    )}
                </div>
                <ToolbarButton icon={ChatBubbleLeftRightIcon} tooltip="Block Quote" onClick={applyBlockQuote} />
                <div className="w-px h-6 bg-slate-300/80 mx-1"></div>
                <ToolbarButton text="H1" syntax="h1" tooltip="Heading 1" />
                <ToolbarButton text="H2" syntax="h2" tooltip="Heading 2" />
                <ToolbarButton text="H3" syntax="h3" tooltip="Heading 3" />
            </div>
            <div className="p-4 min-h-0 overflow-auto">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onValueChange && onValueChange(e.target.value)}
                    className="w-full p-2 font-mono text-sm resize-none border-none focus:outline-none focus:ring-0 bg-transparent overflow-hidden"
                    placeholder="Type your markdown content here..."
                    style={{ lineHeight: '1.5', whiteSpace: 'pre-wrap' }}
                />
            </div>
        </div>
    );
};


// Sortable Page Item Component using @dnd-kit
function SortablePageItem({ id, page, index, activePageIndex, setActivePageIndex, removePage, isOnlyPage }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    const isActive = activePageIndex === index;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => setActivePageIndex(index)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${isActive ? 'bg-white shadow-lg ring-2 ring-indigo-500/50' : 'bg-white/60 hover:bg-white/90 hover:shadow-md'} ${isDragging ? 'shadow-2xl' : ''}`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <button {...listeners} {...attributes} className="p-1 text-slate-400 cursor-grab touch-none">
                    <Bars3Icon className="h-5 w-5"/>
                </button>
                <span className="font-medium text-slate-800 truncate">{page.title || `Page ${index + 1}`}</span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); removePage(index); }}
                disabled={isOnlyPage}
                title="Remove page"
                className="p-1 text-red-400 hover:text-red-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <TrashIcon className="h-5 w-5"/>
            </button>
        </div>
    );
}

export default function ManualLessonCreator({ onClose, onBack, unitId, subjectId }) {
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [studyGuideUrl, setStudyGuideUrl] = useState('');
    const [pages, setPages] = useState([{ id: `page-${Date.now()}`, title: 'Page 1', content: '', type: 'text' }]);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handlePageChange = (field, value) => {
        const newPages = [...pages];
        let pageData = { ...newPages[activePageIndex] };

        if (field === 'type') {
            pageData.type = value;
            pageData.content = value === 'diagram-data' ? { labels: [], imageUrls: [] } : '';
        } else if (pageData.type === 'diagram-data') {
            let newContent = { ...(pageData.content || { labels: [], imageUrls: [] }) };
            if (field === 'diagram_labels') {
                newContent.labels = value.split(',').map(label => label.trim());
            } else if (field === 'imageUrls') {
                newContent.imageUrls = value;
            }
            pageData.content = newContent;
        } else {
            pageData[field] = value;
        }
        newPages[activePageIndex] = pageData;
        setPages(newPages);
    };

    const addPage = () => {
        const newPage = { id: `page-${Date.now()}`, title: `Page ${pages.length + 1}`, content: '', type: 'text' };
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

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 pb-4 border-b border-slate-900/10">
                <div className="flex justify-between items-center mb-4">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800">Create Lesson Manually</Dialog.Title>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Lesson Title, e.g., 'Introduction to Cells'" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl"/>
                    <input type="text" placeholder="Study Guide URL (Optional)" value={studyGuideUrl} onChange={(e) => setStudyGuideUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl"/>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-12 gap-6 pt-4 min-h-0">
                <div className="col-span-4 lg:col-span-3 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-700 mb-3 px-1">Pages</h3>
                    <div className="flex-grow overflow-y-auto pr-2 -mr-2">
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
                    <div className="mt-4 flex-shrink-0 pr-2">
                         <button onClick={addPage} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-white/60 text-slate-700 border border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl">
                            <PlusCircleIcon className="w-5 h-5"/>
                            Add New Page
                        </button>
                    </div>
                </div>

                <div className="col-span-8 lg:col-span-9 flex flex-col min-h-0 pl-6 border-l border-slate-900/10">
                    <h4 className="text-base font-semibold text-slate-700 mb-3">Editing: <span className="text-indigo-600">{activePage.title || `Page ${activePageIndex + 1}`}</span></h4>
                    
                    <div className="flex-grow min-h-0 overflow-auto">
                        <div className="space-y-4 flex flex-col p-1 min-h-0">
                            <input placeholder="Page Title" value={activePage.title} onChange={(e) => handlePageChange('title', e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl"/>
                            
                            <Tab.Group selectedIndex={pageTypeIndex > -1 ? pageTypeIndex : 0} onChange={(index) => handlePageChange('type', ['text', 'diagram-data', 'video'][index])}>
                                <Tab.List className="p-1 bg-slate-200/60 rounded-xl w-fit">
                                    <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Text</Tab>
                                    <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Image</Tab>
                                    <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Video</Tab>
                                </Tab.List>
                                <Tab.Panels className="pt-4 flex flex-col min-h-0">
                                    <Tab.Panel className="flex flex-col min-h-0">
                                        <div className="flex flex-col xl:flex-row gap-4 min-h-0">
                                            <div className="flex-1 min-h-0">
                                                <MarkdownEditor
                                                    value={typeof activePage.content === 'string' ? activePage.content : ''}
                                                    onValueChange={(val) => handlePageChange('content', val)}
                                                />
                                            </div>
                                            <div className="flex-1 min-h-0">
                                                <div className="w-full h-full border border-slate-300/80 rounded-xl bg-white/80 p-6 prose max-w-none prose-slate">
                                                    {/* --- BUG FIX IS HERE --- */}
                                                    <ContentRenderer text={typeof activePage.content === 'string' ? activePage.content : ''} />
                                                </div>
                                            </div>
                                        </div>
                                    </Tab.Panel>
                                    <Tab.Panel>
                                        <div className="space-y-4 p-4 bg-white/80 rounded-xl border border-slate-300/80">
                                            <div className="space-y-2">
                                                {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <input placeholder={`Image URL #${idx + 1}`} value={url} onChange={(e) => { const newUrls = [...activePage.content.imageUrls]; newUrls[idx] = e.target.value; handlePageChange('imageUrls', newUrls); }} className="flex-1 p-2 border border-gray-300 rounded-xl"/>
                                                        <button onClick={() => { const newUrls = activePage.content.imageUrls.filter((_, i) => i !== idx); handlePageChange('imageUrls', newUrls); }} className="p-2 text-red-500 hover:bg-red-100 rounded-full">
                                                            <TrashIcon className="w-5 h-5"/>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => handlePageChange('imageUrls', [...(activePage.content?.imageUrls || []), ''])} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-white/60 text-slate-700 border border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl">
                                                    <PlusCircleIcon className="w-5 h-5"/>
                                                    Add Image URL
                                                </button>
                                            </div>
                                            <input placeholder="Labels (comma-separated)" value={Array.isArray(activePage.content?.labels) ? activePage.content.labels.join(', ') : ''} onChange={(e) => handlePageChange('diagram_labels', e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl"/>
                                        </div>
                                    </Tab.Panel>
                                    <Tab.Panel>
                                        <div className="p-4 bg-white/80 rounded-xl border border-slate-300/80">
                                            <input placeholder="Video URL (YouTube, Vimeo, etc.)" value={typeof activePage.content === 'string' ? activePage.content : ''} onChange={(e) => handlePageChange('content', e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl"/>
                                        </div>
                                    </Tab.Panel>
                                </Tab.Panels>
                            </Tab.Group>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-slate-900/10">
                {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                <button className="px-4 py-2 bg-white/60 text-slate-700 border border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={onClose}>Cancel</button>
                <button onClick={handleAddLesson} disabled={loading} className="px-4 py-2 font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg hover:shadow-indigo-500/40 transition-shadow rounded-xl disabled:bg-slate-400 disabled:shadow-none">
                    {loading ? 'Saving...' : 'Save Lesson'}
                </button>
            </div>
        </div>
    );
}