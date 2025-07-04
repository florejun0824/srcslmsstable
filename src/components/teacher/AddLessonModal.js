import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button, TextInput } from '@tremor/react';
import RichTextEditor from '../common/RichTextEditor';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';

export default function AddLessonModal({ isOpen, onClose, unitId, subjectId }) {
  const [lessonTitle, setLessonTitle] = useState('');
  const [studyGuideUrl, setStudyGuideUrl] = useState('');
  const [pages, setPages] = useState([{ title: '', content: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleAddLesson = async () => {
    if (!lessonTitle.trim()) {
      setError('Lesson title cannot be empty.');
      return;
    }
    if (!unitId || !subjectId) {
      setError('Cannot add a lesson without a selected unit and subject.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'lessons'), {
        title: lessonTitle,
        unitId: unitId,
        subjectId: subjectId,
        studyGuideUrl: studyGuideUrl,
        pages: pages,
        createdAt: serverTimestamp(),
      });
      
      handleClose();

    } catch (err) {
      console.error("Error adding lesson: ", err);
      setError("Failed to add lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setLessonTitle('');
    setStudyGuideUrl('');
    setPages([{ title: '', content: '' }]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} static={true}>
      <DialogPanel className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
        <Title className="mb-4">Add New Lesson</Title>
        
        <div className="space-y-4">
            <div>
              <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
              <TextInput
                id="lesson-title"
                value={lessonTitle}
                onValueChange={setLessonTitle}
                placeholder="e.g., Introduction to Photosynthesis"
              />
            </div>

            <div>
              <label htmlFor="study-guide-url" className="block text-sm font-medium text-gray-700 mb-1">Study Guide URL (Optional)</label>
              <TextInput
                id="study-guide-url"
                value={studyGuideUrl}
                onValueChange={setStudyGuideUrl}
                placeholder="https://example.com/study-guide.pdf"
              />
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
          <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleAddLesson} loading={loading} disabled={loading}>
            {loading ? 'Adding...' : 'Add Lesson'}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}