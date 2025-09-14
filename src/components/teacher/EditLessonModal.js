// src/components/teacher/EditLessonModal.js

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase'; // ✅ removed updateLesson
import { doc, updateDoc } from 'firebase/firestore';
import {
    Dialog, DialogPanel, Title, Button, TextInput, Textarea, TabGroup, TabList, Tab, TabPanels, TabPanel
} from '@tremor/react';
import {
    PlusCircleIcon, TrashIcon, BookOpenIcon, PhotoIcon, VideoCameraIcon, Bars3Icon,
    BoldIcon, ItalicIcon, ListBulletIcon, CodeBracketIcon, LinkIcon,
    H1Icon, H2Icon, H3Icon
} from '@heroicons/react/24/outline';
import { cleanTextInput } from '../../utils/textCleaning';
import ContentRenderer from '../teacher/ContentRenderer';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Helper to reorder the pages after drag-and-drop
const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

// Helper component to render the correct icon based on page type
const PageTypeIcon = ({ type, isActive }) => {
    const iconClass = `h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`;
    switch (type) {
        case 'diagram-data':
            return <PhotoIcon className={iconClass} />;
        case 'video':
            return <VideoCameraIcon className={iconClass} />;
        case 'text':
        default:
            return <BookOpenIcon className={iconClass} />;
    }
};

// Markdown Editor Component
const MarkdownEditor = ({ value, onValueChange }) => {
    const textareaRef = useRef(null);

    const applyMarkdown = (syntax) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        let newText;
        let newCursorPosition;

        switch (syntax) {
            case 'bold':
                newText = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
                newCursorPosition = end + 2;
                break;
            case 'italic':
                newText = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
                newCursorPosition = end + 1;
                break;
            case 'list':
                const selectedText = text.substring(start, end);
                const lines = selectedText.split('\n').map(line => `- ${line}`);
                newText = text.substring(0, start) + lines.join('\n') + text.substring(end);
                newCursorPosition = end + 2;
                break;
            case 'code':
                newText = text.substring(0, start) + '`' + text.substring(start, end) + '`' + text.substring(end);
                newCursorPosition = end + 1;
                break;
            case 'link':
                newText = text.substring(0, start) + '[' + text.substring(start, end) + '](url)' + text.substring(end);
                newCursorPosition = end + 3;
                break;
            case 'h1':
                newText = text.substring(0, start) + '# ' + text.substring(start, end) + text.substring(end);
                newCursorPosition = start + 2;
                break;
            case 'h2':
                newText = text.substring(0, start) + '## ' + text.substring(start, end) + text.substring(end);
                newCursorPosition = start + 3;
                break;
            case 'h3':
                newText = text.substring(0, start) + '### ' + text.substring(start, end) + text.substring(end);
                newCursorPosition = start + 4;
                break;
            default:
                return;
        }

        onValueChange(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
        }, 0);
    };

    const ToolbarButton = ({ icon: Icon, syntax, tooltip }) => (
        <Button
            size="xs"
            variant="light"
            icon={Icon}
            onClick={() => applyMarkdown(syntax)}
            tooltip={tooltip}
            className="px-3 py-1 rounded-md hover:bg-gray-200"
        />
    );

    return (
        <div className="border rounded-lg overflow-hidden flex flex-col h-full">
            <div className="flex items-center gap-1 p-2 border-b bg-gray-100 rounded-t-lg shadow-md">
                <ToolbarButton icon={BoldIcon} syntax="bold" tooltip="Bold" />
                <ToolbarButton icon={ItalicIcon} syntax="italic" tooltip="Italic" />
                <ToolbarButton icon={ListBulletIcon} syntax="list" tooltip="Bulleted List" />
                <ToolbarButton icon={CodeBracketIcon} syntax="code" tooltip="Inline Code" />
                <ToolbarButton icon={LinkIcon} syntax="link" tooltip="Link" />
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                <ToolbarButton icon={H1Icon} syntax="h1" tooltip="Heading 1" />
                <ToolbarButton icon={H2Icon} syntax="h2" tooltip="Heading 2" />
                <ToolbarButton icon={H3Icon} syntax="h3" tooltip="Heading 3" />
            </div>
            <Textarea
                ref={textareaRef}
                value={value}
                onValueChange={onValueChange}
                rows={10}
                className="w-full h-full p-4 font-mono text-sm resize-none border-none focus:ring-0 flex-grow rounded-b-lg"
            />
        </div>
    );
};

// Wrapper to solve react-beautiful-dnd issue in React 18 Strict Mode
const StrictModeDroppable = ({ children, ...props }) => {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setEnabled(true);
        }, 0);
        return () => clearTimeout(timeout);
    }, []);
    if (!enabled) {
        return null;
    }
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
                let pageType = page.type;
                let contentToUse = page.content;

                if (pageType !== 'diagram-data' && pageType !== 'video') {
                    pageType = 'text';
                }

                if (pageType === 'diagram-data') {
                    if (typeof page.content === 'string') {
                        try {
                            contentToUse = JSON.parse(page.content);
                        } catch (e) {
                            contentToUse = { labels: [], generatedImageUrl: page.content || '' };
                        }
                    } else if (typeof page.content === 'object' && page.content !== null) {
                        contentToUse = {
                            labels: Array.isArray(page.content.labels) ? page.content.labels : [],
                            generatedImageUrl: page.content.generatedImageUrl || '',
                        };
                    } else {
                        contentToUse = { labels: [], generatedImageUrl: '' };
                    }
                }

                return {
                    ...page,
                    content: contentToUse,
                    type: pageType,
                    id: `page-${Math.random()}`,
                };
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
            if (value === 'diagram-data') {
                pageData.content = { labels: [], generatedImageUrl: '' };
            } else {
                pageData.content = '';
            }
        } else if (pageData.type === 'diagram-data') {
            let newContent = { ...pageData.content };
            if (field === 'diagram_labels') {
                newContent.labels = value.split(',').map(label => label.trim()).filter(Boolean);
            } else if (field === 'generatedImageUrl') {
                newContent.generatedImageUrl = value;
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
        const newPages = [...pages, newPage];
        setPages(newPages);
        setActivePageIndex(newPages.length - 1);
    };

    const removePage = (index) => {
        if (pages.length <= 1) return;
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
        setActivePageIndex(prevIndex => prevIndex >= index ? Math.max(0, prevIndex - 1) : prevIndex);
    };

    const handleOnDragEnd = (result) => {
        if (!result.destination) return;
        const items = reorder(pages, result.source.index, result.destination.index);
        setPages(items);
        setActivePageIndex(result.destination.index);
    };

    const handleUpdateLesson = async () => {
        try {
            setLoading(true);

            const updatedPages = pages.map(page => {
                if (page.type === "diagram-data") {
                    return {
                        ...page,
                        content: {
                            labels: Array.isArray(page.content?.labels) ? page.content.labels : [],
                            generatedImageUrl: page.content?.generatedImageUrl || ""
                        }
                    };
                }
                return { ...page, content: page.content || '' };
            });

            const updatedLesson = {
                ...lesson,
                title,
                studyGuideUrl,
                pages: updatedPages
            };

            const lessonRef = doc(db, "lessons", lesson.id);
            await updateDoc(lessonRef, updatedLesson);

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
        <Dialog open={isOpen} onClose={onClose} static={true} >
            <DialogPanel className="w-screen h-screen max-w-full max-h-screen rounded-none bg-gray-50 p-6 flex flex-col">
                <div className="flex-shrink-0 pb-4 border-b border-gray-200">
                    <Title className="mb-4">Edit Lesson</Title>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput placeholder="Lesson Title" value={title} onValueChange={setTitle} />
                        <TextInput placeholder="Study Guide URL (Optional)" value={studyGuideUrl} onValueChange={setStudyGuideUrl} />
                    </div>
                </div>

                <div className="flex-grow grid grid-cols-12 gap-6 pt-4 overflow-hidden">
                    {/* Sidebar */}
                    <div className="col-span-4 lg:col-span-3 flex flex-col overflow-y-auto pr-2">
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Pages</h3>
                        <DragDropContext onDragEnd={handleOnDragEnd}>
                            <StrictModeDroppable droppableId="pages">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 flex-grow">
                                        {pages.map((page, index) => {
                                            const isActive = activePageIndex === index;
                                            return (
                                                <Draggable key={page.id} draggableId={page.id} index={index}>
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => setActivePageIndex(index)}
                                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${isActive ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-100'}`}
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <Bars3Icon className="h-5 w-5 text-slate-400 flex-shrink-0"/>
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
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </StrictModeDroppable>
                        </DragDropContext>
                        <div className="mt-4 flex-shrink-0">
                            <Button icon={PlusCircleIcon} variant="light" className="w-full" onClick={addPage}>Add New Page</Button>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="col-span-8 lg:col-span-9 flex flex-col overflow-y-auto pl-6 border-l border-gray-200">
                        <h4 className="text-lg font-bold text-slate-700 mb-4">Editing Page {activePageIndex + 1}</h4>
                        <div className="space-y-4">
                            <TextInput placeholder="Page Title" value={activePage.title} onValueChange={(val) => handlePageChange('title', val)} />
                           
                            <TabGroup index={pageTypeIndex} onIndexChange={(index) => handlePageChange('type', ['text', 'diagram-data', 'video'][index])}>
                                <TabList className="w-full justify-start space-x-2">
                                    <Tab className={`flex-1 w-auto max-w-[150px] transition-all duration-200 rounded-lg shadow-sm border border-gray-300 ${pageTypeIndex === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}>
                                        <BookOpenIcon className="h-5 w-5" />
                                        Text
                                    </Tab>
                                    <Tab className={`flex-1 w-auto max-w-[150px] transition-all duration-200 rounded-lg shadow-sm border border-gray-300 ${pageTypeIndex === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}>
                                        <PhotoIcon className="h-5 w-5" />
                                        Image
                                    </Tab>
                                    <Tab className={`flex-1 w-auto max-w-[150px] transition-all duration-200 rounded-lg shadow-sm border border-gray-300 ${pageTypeIndex === 2 ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}>
                                        <VideoCameraIcon className="h-5 w-5" />
                                        Video
                                    </Tab>
                                </TabList>
                                <TabPanels className="pt-4 flex-grow overflow-hidden">
                                    {/* Text tab */}
                                    <TabPanel className="h-full">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                                            <div className="flex flex-col h-full rounded-lg shadow-md overflow-hidden bg-gray-50">
                                                <label className="text-xs font-semibold text-gray-500 mb-2 p-4 block">MARKDOWN EDITOR</label>
                                                <MarkdownEditor
                                                    value={typeof activePage.content === 'string' ? activePage.content : ''}
                                                    onValueChange={(val) => handlePageChange('content', val)}
                                                />
                                            </div>
                                            <div className="flex flex-col h-full rounded-lg shadow-md overflow-hidden bg-gray-50">
                                                <label className="text-xs font-semibold text-gray-500 mb-2 p-4 block">LIVE PREVIEW</label>
                                                <div className="h-full p-4 prose max-w-none prose-slate overflow-y-auto">
                                                    <ContentRenderer text={typeof activePage.content === 'string' ? activePage.content : ''} />
                                                </div>
                                            </div>
                                        </div>
                                    </TabPanel>

                                    {/* Image tab */}
                                    <TabPanel className="h-full">
                                        <div className="space-y-4 h-full">
                                            <TextInput placeholder="Image URL e.g., https://path/to/image.png" value={activePage.content?.generatedImageUrl || ''} onValueChange={(val) => handlePageChange('generatedImageUrl', val)} />
                                            <TextInput placeholder="Labels (comma-separated) e.g., Cell Wall, Nucleus" value={Array.isArray(activePage.content?.labels) ? activePage.content.labels.join(', ') : ''} onValueChange={(val) => handlePageChange('diagram_labels', val)} />
                                            <p className="text-xs text-gray-500 mt-1">Labels can be positioned interactively in the lesson view.</p>
                                        </div>
                                    </TabPanel>
                                    <TabPanel className="h-full">
                                        <TextInput placeholder="Video URL e.g., https://youtube.com/watch?v=..." value={activePage.content || ''} onValueChange={(val) => handlePageChange('content', val)} />
                                    </TabPanel>
                                </TabPanels>
                           </TabGroup>
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

                <div className="flex-shrink-0 flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                    <Button
                        onClick={onClose}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800 rounded-lg shadow-md transition-all duration-200"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpdateLesson}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 rounded-lg shadow-md transition-all duration-200"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}