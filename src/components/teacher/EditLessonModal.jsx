// src/components/teacher/EditLessonModal.js

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
    Dialog, DialogPanel, Title, Button, TextInput, TabGroup, TabList, Tab, TabPanels, TabPanel
} from '@tremor/react';
import {
    PlusCircleIcon, TrashIcon, BookOpenIcon, PhotoIcon, VideoCameraIcon, Bars3Icon,
    CodeBracketIcon, LinkIcon, QueueListIcon, PaintBrushIcon, ChatBubbleLeftRightIcon,
    ChevronRightIcon // --- ADDED: Icon for the spoiler button ---
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
    const iconClass = `h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-slate-500'}`;
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

    // --- ADDED: Function to insert the spoiler/details block ---
    const applySpoiler = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);

        const title = "Click to reveal"; // Default title
        const content = selectedText || "Type hidden text here..."; // Placeholder if nothing is selected
        
        // Add newlines to ensure it's a block element
        const spoilerText = `\n<details>\n  \n\n  ${content}\n\n</details>\n`;
        
        const newText = `${text.substring(0, start)}${spoilerText}${text.substring(end)}`;

        onValueChange && onValueChange(newText);
        
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            if (selectedText) {
                // If text was selected, place cursor after the new block
                ta.selectionStart = ta.selectionEnd = start + spoilerText.length;
            } else {
                // If no text was selected, select the placeholder "Type hidden text here..."
                const contentStart = start + spoilerText.indexOf(content);
                const contentEnd = contentStart + content.length;
                ta.selectionStart = contentStart;
                ta.selectionEnd = contentEnd;
            }
        }, 0);
    };
    // --- END ADDED ---

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
        <div className="rounded-xl flex flex-col h-full bg-neumorphic-base shadow-neumorphic-inset min-h-0">
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-neumorphic-shadow-dark/20 bg-neumorphic-base">
                <ToolbarButton icon={BoldIcon} syntax="bold" tooltip="Bold" />
                <ToolbarButton icon={ItalicIcon} syntax="italic" tooltip="Italic" />
                <ToolbarButton icon={QueueListIcon} syntax="list" tooltip="Bulleted List" />
                <ToolbarButton icon={CodeBracketIcon} syntax="code" tooltip="Inline Code" />
                <ToolbarButton icon={LinkIcon} syntax="link" tooltip="Link" />
                <div className="w-px h-6 bg-neumorphic-shadow-dark/30 mx-1"></div>
                <div className="relative">
                    <ToolbarButton icon={PaintBrushIcon} tooltip="Text Color" onClick={() => setShowColorPicker(s => !s)} />
                    {showColorPicker && (
                        <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full mt-2 z-10 bg-neumorphic-base p-2 rounded-lg shadow-neumorphic flex gap-2">
                            {TEXT_COLORS.map(color => (
                                <button key={color.name} title={color.name} onClick={() => applyColor(color.hex)} className="w-6 h-6 rounded-full" style={{ backgroundColor: color.hex }} />
                            ))}
                        </div>
                    )}
                </div>
                <ToolbarButton icon={ChatBubbleLeftRightIcon} tooltip="Block Quote" onClick={applyBlockQuote} />
                
                {/* --- ADDED: Spoiler Button --- */}
                <ToolbarButton icon={ChevronRightIcon} tooltip="Click to Reveal" onClick={applySpoiler} />
                {/* --- END ADDED --- */}

                <div className="w-px h-6 bg-neumorphic-shadow-dark/30 mx-1"></div>
                <ToolbarButton icon={H1Icon} syntax="h1" tooltip="Heading 1" />
                <ToolbarButton icon={H2Icon} syntax="h2" tooltip="Heading 2" />
                <ToolbarButton icon={H3Icon} syntax="h3" tooltip="Heading 3" />
            </div>

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
            
            const formattedPages = lesson.pages?.map(page => {
                let normalizedPage = { ...page, id: `page-${Math.random()}` };
                if (normalizedPage.type === 'diagram') {
                    normalizedPage.type = 'diagram-data';
                    const content = normalizedPage.content || {};
                    const imageUrls = content.imageUrls || (content.generatedImageUrl ? [content.generatedImageUrl] : []);
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
    const pageTypeIndex = ['text', 'diagram-data', 'video'].indexOf(activePage.type);

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="w-screen h-screen max-w-full max-h-screen rounded-none bg-neumorphic-base p-6 flex flex-col overflow-hidden">
                {/* Neumorphic Header */}
                <div className="flex-shrink-0 pb-4 mb-4 shadow-neumorphic-inset rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-4">
                        <Title className="text-2xl font-bold text-slate-800">Edit Lesson</Title>
                        <Button 
                            onClick={onClose} 
                            className="rounded-xl bg-neumorphic-base text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-flat-inset transition-shadow"
                        >
                            Close
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput 
                            placeholder="Lesson Title" 
                            value={title} 
                            onValueChange={setTitle} 
                            className="rounded-xl bg-neumorphic-base shadow-neumorphic-inset border-none focus:ring-2 focus:ring-primary-500" 
                        />
                        <TextInput 
                            placeholder="Study Guide URL (Optional)" 
                            value={studyGuideUrl} 
                            onValueChange={setStudyGuideUrl} 
                            className="rounded-xl bg-neumorphic-base shadow-neumorphic-inset border-none focus:ring-2 focus:ring-primary-500" 
                        />
                    </div>
                </div>

                {/* content area */}
                <div className="flex-grow min-h-0 grid grid-cols-12 gap-6">
                    {/* Left Pages Column */}
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
                                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-shadow duration-300 ${isActive ? 'shadow-neumorphic-inset' : 'shadow-neumorphic'} bg-neumorphic-base`}
                                                            >
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <Bars3Icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                                                    <PageTypeIcon type={page.type} isActive={isActive} />
                                                                    <span className="font-medium text-slate-800 truncate">{page.title || `Page ${index + 1}`}</span>
                                                                </div>
                                                                <Button 
                                                                    icon={TrashIcon} 
                                                                    variant="light" 
                                                                    color="red" 
                                                                    size="xs" 
                                                                    onClick={(e) => { e.stopPropagation(); removePage(index); }} 
                                                                    disabled={pages.length === 1} 
                                                                    tooltip="Remove page" 
                                                                    className="rounded-full !bg-neumorphic-base !shadow-neumorphic hover:!shadow-neumorphic-inset" 
                                                                />
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
                            <Button 
                                icon={PlusCircleIcon} 
                                className="w-full justify-center rounded-xl bg-neumorphic-base text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-flat-inset transition-shadow" 
                                onClick={addPage}
                            >
                                Add New Page
                            </Button>
                        </div>
                    </div>

                    {/* Right Editor + Preview Column */}
                    <div className="col-span-8 lg:col-span-9 flex flex-col min-h-0">
                        <h4 className="text-base font-semibold text-slate-700 mb-3">Editing: <span className="text-primary-600">{activePage.title || `Page ${activePageIndex + 1}`}</span></h4>
                        <div className="flex-grow min-h-0 overflow-y-auto">
                            <div className="space-y-4 flex flex-col p-1 min-h-0">
                                <TextInput 
                                    placeholder="Page Title" 
                                    value={activePage.title} 
                                    onValueChange={(val) => handlePageChange('title', val)} 
                                    className="rounded-xl bg-neumorphic-base shadow-neumorphic-inset border-none focus:ring-2 focus:ring-primary-500"
                                />

                                <TabGroup index={pageTypeIndex > -1 ? pageTypeIndex : 0} onIndexChange={(index) => handlePageChange('type', ['text', 'diagram-data', 'video'][index])}>
                                    <TabList className="p-1 bg-neumorphic-base shadow-neumorphic-flat-inset rounded-xl w-fit">
                                        <Tab className="ui-selected:bg-neumorphic-base ui-selected:text-primary-600 ui-selected:shadow-neumorphic text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none transition-all">Text</Tab>
                                        <Tab className="ui-selected:bg-neumorphic-base ui-selected:text-primary-600 ui-selected:shadow-neumorphic text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none transition-all">Image</Tab>
                                        <Tab className="ui-selected:bg-neumorphic-base ui-selected:text-primary-600 ui-selected:shadow-neumorphic text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none transition-all">Video</Tab>
                                    </TabList>

                                    <TabPanels className="pt-4 flex flex-col min-h-0">
                                        <TabPanel className="flex flex-col min-h-0">
                                            <div className="flex flex-col xl:flex-row gap-4 min-h-0">
                                                <div className="flex-1 min-h-0">
                                                    <MarkdownEditor value={typeof activePage.content === 'string' ? activePage.content : ''} onValueChange={(val) => handlePageChange('content', val)} />
                                                </div>
                                                <div className="flex-1 min-h-0">
                                                    <div className="w-full h-full rounded-xl bg-neumorphic-base shadow-neumorphic-inset p-6 prose max-w-none prose-slate">
                                                        <ContentRenderer text={typeof activePage.content === 'string' ? activePage.content : ''} />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabPanel>

                                        <TabPanel className="min-h-0">
                                            <div className="space-y-4 p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-xl">
                                                <div className="space-y-2">
                                                    {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <TextInput placeholder={`Image URL #${idx + 1}`} value={url} onValueChange={(val) => { const newUrls = [...activePage.content.imageUrls]; newUrls[idx] = val; handlePageChange('imageUrls', newUrls); }} className="flex-1 rounded-xl bg-neumorphic-base !shadow-neumorphic-inset border-none focus:ring-2 focus:ring-primary-500" />
                                                            <Button variant="light" color="red" icon={TrashIcon} onClick={() => { const newUrls = activePage.content.imageUrls.filter((_, i) => i !== idx); handlePageChange('imageUrls', newUrls); }} className="rounded-full !bg-neumorphic-base !shadow-neumorphic hover:!shadow-neumorphic-inset" />
                                                        </div>
                                                    ))}
                                                    <Button icon={PlusCircleIcon} className="rounded-xl bg-neumorphic-base text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-flat-inset transition-shadow" onClick={() => handlePageChange('imageUrls', [...(activePage.content?.imageUrls || []), ''])}>Add Image URL</Button>
                                                </div>
                                                <TextInput placeholder="Labels (comma-separated)" value={Array.isArray(activePage.content?.labels) ? activePage.content.labels.join(', ') : ''} onValueChange={(val) => handlePageChange('diagram_labels', val)} className="rounded-xl bg-neumorphic-base shadow-neumorphic-inset border-none focus:ring-2 focus:ring-primary-500" />
                                            </div>
                                        </TabPanel>

                                        <TabPanel className="min-h-0">
                                            <div className="p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-xl">
                                                <TextInput placeholder="Video URL (YouTube, etc.)" value={typeof activePage.content === 'string' ? activePage.content : ''} onValueChange={(val) => handlePageChange('content', val)} className="rounded-xl bg-neumorphic-base shadow-neumorphic-inset border-none focus:ring-2 focus:ring-primary-500" />
                                            </div>
                                        </TabPanel>
                                    </TabPanels>
                                </TabGroup>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Neumorphic Footer */}
                <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-4 mt-4 border-t-2 border-neumorphic-base shadow-neumorphic-inset rounded-2xl p-4">
                    {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                    <Button 
                        className="rounded-xl bg-neumorphic-base text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-flat-inset transition-shadow" 
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button 
                        className="font-semibold rounded-xl bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors" 
                        onClick={handleUpdateLesson} 
                        loading={loading}
                    >
                        Save Changes
                    </Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}