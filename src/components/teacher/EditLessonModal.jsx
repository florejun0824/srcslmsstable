// src/components/teacher/EditLessonModal.js

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
    Dialog, DialogPanel, Title, Button, TextInput, TabGroup, TabList, Tab, TabPanels, TabPanel
} from '@tremor/react';
import {
    PlusCircleIcon, TrashIcon, BookOpenIcon, PhotoIcon, VideoCameraIcon, Bars3Icon,
    CodeBracketIcon, LinkIcon, QueueListIcon, PaintBrushIcon, ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import ContentRenderer from '../teacher/ContentRenderer';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// --- Custom Icons for Markdown Toolbar ---
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

// reorder helper
const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

// Page type icon
const PageTypeIcon = ({ type, isActive }) => {
    const iconClass = `h-5 w-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`;
    switch (type) {
        case 'diagram-data': return <PhotoIcon className={iconClass} />;
        case 'video': return <VideoCameraIcon className={iconClass} />;
        case 'text': default: return <BookOpenIcon className={iconClass} />;
    }
};

// Markdown editor using native textarea + autosize (no internal scrollbar)
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
        // also adjust on window resize (helps when modal size changes)
        window.addEventListener('resize', adjustHeight);
        return () => window.removeEventListener('resize', adjustHeight);
    }, []);

    useEffect(() => {
        // keep textarea height in sync when value changes from parent
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
        // set caret after the state updates (small timeout gives React time to apply)
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

        onValueChange && onValueChange(newText);
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            ta.selectionStart = ta.selectionEnd = cursorPos;
        }, 0);
    };

    const ToolbarButton = ({ icon, syntax, tooltip, onClick }) => (
        <Button size="xs" variant="light" icon={icon} onClick={onClick || (() => applyMarkdown(syntax))} tooltip={tooltip} className="p-2 rounded-lg" />
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
                <ToolbarButton icon={H1Icon} syntax="h1" tooltip="Heading 1" />
                <ToolbarButton icon={H2Icon} syntax="h2" tooltip="Heading 2" />
                <ToolbarButton icon={H3Icon} syntax="h3" tooltip="Heading 3" />
            </div>

            {/* autosizing native textarea — no internal scrollbar */}
            <div className="p-4 min-h-0">
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

    useEffect(() => {
        if (lesson) {
            setTitle(lesson.title || '');
            setStudyGuideUrl(lesson.studyGuideUrl || '');
            const formattedPages = lesson.pages?.map(page => ({
                ...page,
                id: `page-${Math.random()}`,
            })) || [];
            setPages(
                formattedPages.length > 0
                    ? formattedPages
                    : [{ id: `page-${Math.random()}`, title: '', content: '', type: 'text' }]
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
        const newPage = { id: `page-${Math.random()}`, title: `Page ${pages.length + 1}`, content: '', type: 'text' };
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
    const pageTypeIndex = ['text', 'diagram-data', 'video'].indexOf(activePage.type);

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="w-screen h-screen max-w-full max-h-screen rounded-none bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col overflow-hidden">
                {/* header (non-scrolling) */}
                <div className="flex-shrink-0 pb-4 border-b border-slate-900/10">
                    <div className="flex justify-between items-center mb-4">
                        <Title className="text-2xl font-bold text-slate-800">Edit Lesson</Title>
                        <Button variant="light" onClick={onClose} className="rounded-xl">Close</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput placeholder="Lesson Title" value={title} onValueChange={setTitle} className="rounded-xl" />
                        <TextInput placeholder="Study Guide URL (Optional)" value={studyGuideUrl} onValueChange={setStudyGuideUrl} className="rounded-xl" />
                    </div>
                </div>

                {/* content area: left pages column (own scroll), right editor+preview (single scroll) */}
                <div className="flex-grow min-h-0 grid grid-cols-12 gap-6 pt-4">
                    {/* left pages column */}
                    <div className="col-span-4 lg:col-span-3 flex flex-col min-h-0">
                        <h3 className="text-base font-semibold text-slate-700 mb-3 px-1">Pages</h3>
                        <div className="flex-grow overflow-y-auto pr-2 -mr-2 min-h-0">
                            <DragDropContext onDragEnd={handleOnDragEnd}>
                                <StrictModeDroppable droppableId="pages">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
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
                                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${isActive ? 'bg-white shadow-lg ring-2 ring-indigo-500/50' : 'bg-white/60 hover:bg-white/90 hover:shadow-md'} ${snapshot.isDragging ? 'shadow-2xl' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <Bars3Icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                                                    <PageTypeIcon type={page.type} isActive={isActive} />
                                                                    <span className="font-medium text-slate-800 truncate">{page.title || `Page ${index + 1}`}</span>
                                                                </div>
                                                                <Button icon={TrashIcon} variant="light" color="red" size="xs" onClick={(e) => { e.stopPropagation(); removePage(index); }} disabled={pages.length === 1} tooltip="Remove page" className="rounded-full" />
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
                        <div className="mt-4 flex-shrink-0 pr-2">
                            <Button icon={PlusCircleIcon} className="w-full justify-center bg-white/60 text-slate-700 border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={addPage}>Add New Page</Button>
                        </div>
                    </div>

                    {/* right editor + preview column — THIS is the single scroll container */}
                    <div className="col-span-8 lg:col-span-9 flex flex-col min-h-0 pl-6 border-l border-slate-900/10">
                        <h4 className="text-base font-semibold text-slate-700 mb-3">Editing: <span className="text-indigo-600">{activePage.title || `Page ${activePageIndex + 1}`}</span></h4>

                        {/* RIGHT-SIDE SCROLL WRAPPER: everything inside here scrolls together */}
                        <div className="flex-grow min-h-0 overflow-auto">
                            <div className="space-y-4 flex flex-col p-1 min-h-0">
                                <TextInput placeholder="Page Title" value={activePage.title} onValueChange={(val) => handlePageChange('title', val)} className="rounded-xl" />

                                <TabGroup index={pageTypeIndex > -1 ? pageTypeIndex : 0} onIndexChange={(index) => handlePageChange('type', ['text', 'diagram-data', 'video'][index])}>
                                    <TabList className="p-1 bg-slate-200/60 rounded-xl w-fit">
                                        <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Text</Tab>
                                        <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Image</Tab>
                                        <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Video</Tab>
                                    </TabList>

                                    <TabPanels className="pt-4 flex flex-col min-h-0">
                                        <TabPanel className="flex flex-col min-h-0">
                                            <div className="flex flex-col xl:flex-row gap-4 min-h-0">
                                                {/* Editor (left half) */}
                                                <div className="flex-1 min-h-0">
                                                    <MarkdownEditor value={typeof activePage.content === 'string' ? activePage.content : ''} onValueChange={(val) => handlePageChange('content', val)} />
                                                </div>

                                                {/* Preview (right half) */}
                                                <div className="flex-1 min-h-0">
                                                    <div className="w-full h-full border border-slate-300/80 rounded-xl bg-white/80 p-6 prose max-w-none prose-slate">
                                                        <ContentRenderer text={typeof activePage.content === 'string' ? activePage.content : ''} />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabPanel>

                                        <TabPanel className="min-h-0">
                                            <div className="space-y-4 p-4 bg-white/80 rounded-xl border border-slate-300/80">
                                                <div className="space-y-2">
                                                    {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <TextInput placeholder={`Image URL #${idx + 1}`} value={url} onValueChange={(val) => { const newUrls = [...activePage.content.imageUrls]; newUrls[idx] = val; handlePageChange('imageUrls', newUrls); }} className="flex-1 rounded-xl" />
                                                            <Button variant="light" color="red" icon={TrashIcon} onClick={() => { const newUrls = activePage.content.imageUrls.filter((_, i) => i !== idx); handlePageChange('imageUrls', newUrls); }} className="rounded-full" />
                                                        </div>
                                                    ))}
                                                    <Button icon={PlusCircleIcon} className="bg-white/60 text-slate-700 border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={() => handlePageChange('imageUrls', [...(activePage.content?.imageUrls || []), ''])}>Add Image URL</Button>
                                                </div>
                                                <TextInput placeholder="Labels (comma-separated)" value={Array.isArray(activePage.content?.labels) ? activePage.content.labels.join(', ') : ''} onValueChange={(val) => handlePageChange('diagram_labels', val)} className="rounded-xl" />
                                            </div>
                                        </TabPanel>

                                        <TabPanel className="min-h-0">
                                            <div className="p-4 bg-white/80 rounded-xl border border-slate-300/80">
                                                <TextInput placeholder="Video URL (YouTube, Vimeo, etc.)" value={typeof activePage.content === 'string' ? activePage.content : ''} onValueChange={(val) => handlePageChange('content', val)} className="rounded-xl" />
                                            </div>
                                        </TabPanel>
                                    </TabPanels>
                                </TabGroup>
                            </div>
                        </div>
                    </div>
                </div>

                {/* footer (non-scrolling) */}
                <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-slate-900/10">
                    {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                    <Button className="bg-white/60 text-slate-700 border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={onClose}>Cancel</Button>
                    <Button className="font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg hover:shadow-indigo-500/40 transition-shadow rounded-xl" onClick={handleUpdateLesson} loading={loading}>Save Changes</Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}
