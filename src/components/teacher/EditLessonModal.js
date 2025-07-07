// src/components/teacher/EditLessonModal.js

import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase'; // Adjust path if needed
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import RichTextEditor from '../common/RichTextEditor'; // Adjust path if needed
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';
import { cleanTextInput } from '../../utils/textCleaning'; // <--- IMPORT THE CLEANING FUNCTION

export default function EditLessonModal({ isOpen, onClose, lesson }) {
  const [title, setTitle] = useState('');
  const [studyGuideUrl, setStudyGuideUrl] = useState('');
  const [pages, setPages] = useState([{ title: '', content: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setStudyGuideUrl(lesson.studyGuideUrl || '');
      // Ensure pages is an array of objects with title and content
      const formattedPages = lesson.pages?.map(page =>
        typeof page === 'string' ? { title: '', content: page } : page
      ) || [];
      setPages(formattedPages.length > 0 ? formattedPages : [{ title: '', content: '' }]);
    }
  }, [lesson]);

  if (!lesson) return null; // Early return for no lesson prop

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

  const handleUpdateLesson = async () => {
    if (!title.trim()) {
      setError('Lesson title cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const lessonRef = doc(db, 'lessons', lesson.id);

      // --- APPLY CLEANING TO ALL TEXT FIELDS BEFORE SAVING ---
      const cleanedPages = pages.map(page => ({
        title: cleanTextInput(page.title),         // Clean page title
        content: cleanTextInput(page.content)       // Clean Quill's HTML content
      }));
      // -----------------------------------------------------

      await updateDoc(lessonRef, {
        title: cleanTextInput(title),               // Clean lesson title
        studyGuideUrl: cleanTextInput(studyGuideUrl), // Clean study guide URL
        pages: cleanedPages,                        // Save the CLEANED page data
      });
      onClose();

    } catch (err) {
      console.error("Error updating lesson: ", err);
      setError("Failed to update lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} static={true}>
      <DialogPanel className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
        <Title className="mb-4">Edit Lesson</Title>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
            <TextInput value={title} onValueChange={setTitle} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Study Guide URL (Optional)</label>
            <TextInput value={studyGuideUrl} onValueChange={setStudyGuideUrl} />
          </div>

          <h3 className="text-lg font-medium text-gray-800 border-t pt-4">Lesson Pages</h3>
          {pages.map((page, index) => (
            <div key={index} className="p-4 border rounded-md relative space-y-3">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Page {index + 1}</label>
                    {pages.length > 1 && (
                      <button
                        onClick={() => removePage(index)}
                        className="p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                </div>
                <TextInput
                    value={page.title}
                    onValueChange={(value) => handlePageChange(index, 'title', value)}
                    placeholder={`Title for Page ${index + 1}`}
                />
                <RichTextEditor
                    value={page.content}
                    onChange={(content) => handlePageChange(index, 'content', content)}
                />
            </div>
          ))}

          <Button icon={PlusCircleIcon} variant="light" onClick={addPage}>
            Add Another Page
          </Button>
        </div>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleUpdateLesson} loading={loading} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}