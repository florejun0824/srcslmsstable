// src/components/teacher/EditLessonModal.js

import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';
import { cleanTextInput } from '../../utils/textCleaning';
import ContentRenderer from '../teacher/ContentRenderer'; 
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function EditLessonModal({ isOpen, onClose, lesson }) {
  const [title, setTitle] = useState('');
  const [studyGuideUrl, setStudyGuideUrl] = useState('');
  const [pages, setPages] = useState([{ title: '', content: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeEditorTabs, setActiveEditorTabs] = useState({});

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setStudyGuideUrl(lesson.studyGuideUrl || '');
      const formattedPages = lesson.pages?.map(page =>
        typeof page === 'string' ? { title: '', content: page } : page
      ) || [];
      setPages(formattedPages.length > 0 ? formattedPages : [{ title: '', content: '' }]);
      setActiveEditorTabs(formattedPages.reduce((acc, _, index) => ({...acc, [index]: 'source'}), {}));
    }
  }, [lesson]);

  if (!lesson) return null;

  const handlePageChange = (index, field, value) => {
    const newPages = [...pages];
    newPages[index][field] = value;
    setPages(newPages);
  };

  const handleTabChange = (pageIndex, tabName) => {
    setActiveEditorTabs(prev => ({ ...prev, [pageIndex]: tabName }));
  };

  // --- MISSING FUNCTIONS ADDED BACK ---
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

      const cleanedPages = pages.map(page => ({
        title: cleanTextInput(page.title),
        content: page.content
      }));
      
      await updateDoc(lessonRef, {
        title: cleanTextInput(title),
        studyGuideUrl: cleanTextInput(studyGuideUrl),
        pages: cleanedPages,
      });
      onClose();

    } catch (err) {
      console.error("Error updating lesson: ", err);
      setError("Failed to update lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  // --- END OF MISSING FUNCTIONS ---

  return (
    <Dialog open={isOpen} onClose={onClose} static={true}>
      <DialogPanel className="w-full max-w-7xl rounded-lg bg-white p-6 shadow-xl">
        <Title className="mb-4">Edit Lesson</Title>

        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
            <TextInput value={title} onValueChange={setTitle} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Study Guide URL (Optional)</label>
            <TextInput value={studyGuideUrl} onValueChange={setStudyGuideUrl} />
          </div>

          <h3 className="text-lg font-medium text-gray-800 border-t pt-4">Lesson Pages</h3>
          {pages.map((page, index) => {
            const activeTab = activeEditorTabs[index] || 'source';
            return (
              <div key={index} className="p-4 border rounded-md relative space-y-3">
                <div className="flex justify-between items-center mb-3">
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
                  className="mb-3"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center border-b mb-2">
                      <TabButton
                        label="Rich Text"
                        isActive={activeTab === 'rich-text'}
                        onClick={() => handleTabChange(index, 'rich-text')}
                      />
                      <TabButton
                        label="Source (Markdown)"
                        isActive={activeTab === 'source'}
                        onClick={() => handleTabChange(index, 'source')}
                      />
                    </div>
                    {activeTab === 'rich-text' ? (
                      <ReactQuill
                        theme="snow"
                        value={page.content}
                        onChange={(content) => handlePageChange(index, 'content', content)}
                        className="bg-white"
                      />
                    ) : (
                      <textarea
                        value={page.content}
                        onChange={(e) => handlePageChange(index, 'content', e.target.value)}
                        rows={15}
                        className="w-full p-3 font-mono text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500">LIVE PREVIEW</label>
                    <div className="h-full border rounded-md p-4 prose max-w-none prose-slate overflow-y-auto">
                      <ContentRenderer text={page.content} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
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

const TabButton = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'border-b-2 border-indigo-500 text-indigo-600'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {label}
  </button>
);