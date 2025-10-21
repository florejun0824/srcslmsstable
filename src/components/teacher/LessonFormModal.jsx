// src/components/teacher/LessonFormModal.js

import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';
import { cleanTextInput } from '../../utils/textCleaning';
import RichTextEditor from '../common/RichTextEditor'; // ✨ Import the RichTextEditor

export default function LessonFormModal({ isOpen, onClose, onSubmit, initialLessonData, title: modalTitle }) {
    const [title, setTitle] = useState('');
    const [pages, setPages] = useState([{ title: '', content: '' }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialLessonData) {
            setTitle(initialLessonData.title || '');
            const formattedPages = initialLessonData.pages?.map(page =>
                typeof page === 'string' ? { title: '', content: page } : page
            ) || [];
            setPages(formattedPages.length > 0 ? formattedPages : [{ title: '', content: '' }]);
        }
    }, [initialLessonData]);

    const handlePageChange = (index, field, value) => {
        const newPages = [...pages];
        newPages[index][field] = value;
        setPages(newPages);
    };

    const addPage = () => {
        setPages([...pages, { title: '', content: '' }]);
    };

    const removePage = (index) => {
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Lesson title cannot be empty.');
            return;
        }
        setLoading(true);
        setError('');

        const cleanedPages = pages.map(page => ({
            title: cleanTextInput(page.title),
            content: page.content // Content now comes from the RichTextEditor
        }));

        const finalLessonData = {
            ...initialLessonData,
            title: cleanTextInput(title),
            pages: cleanedPages,
        };

        try {
            await onSubmit(finalLessonData);
        } catch (err) {
            setError("Failed to save changes. Please try again.");
            console.error("Submission Error:", err);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onClose={() => !loading && onClose()} static={true}>
            <DialogPanel className="w-full max-w-7xl rounded-lg bg-white p-6 shadow-xl flex flex-col h-[90vh]">
                <div className="flex-shrink-0 pb-4">
                    <Title className="mb-4">{modalTitle}</Title>
                    <div className="space-y-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
                            <TextInput value={title} onValueChange={setTitle} disabled={loading} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 border-t pt-4">Lesson Pages</h3>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    <div className="space-y-4">
                        {pages.map((page, index) => (
                            <div key={index} className="p-4 border rounded-md relative space-y-3">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium text-gray-700">Page {index + 1}</label>
                                    {pages.length > 1 && (
                                        <button
                                            onClick={() => removePage(index)}
                                            disabled={loading}
                                            className="p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 disabled:opacity-50"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <TextInput
                                    value={page.title}
                                    onValueChange={(value) => handlePageChange(index, 'title', value)}
                                    placeholder={`Title for Page ${index + 1}`}
                                    className="mb-3"
                                    disabled={loading}
                                />
                                
                                {/* ✨ MODIFICATION: Replaced the textarea and preview with the RichTextEditor */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">PAGE CONTENT</label>
                                    <RichTextEditor
                                        value={page.content}
                                        onChange={(content) => handlePageChange(index, 'content', content)}
                                    />
                                </div>
                            </div>
                        ))}
                        <Button icon={PlusCircleIcon} variant="light" onClick={addPage} disabled={loading}>
                            Add Another Page
                        </Button>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

                <div className="flex-shrink-0 flex justify-end gap-2 mt-6 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={loading} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}