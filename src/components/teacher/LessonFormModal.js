import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import RichTextEditor from '../common/RichTextEditor';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const LessonFormModal = ({ isOpen, onClose, courseId, unitId, initialData, onFormSubmit, title }) => {
    const [lessonTitle, setLessonTitle] = useState('');
    const [studyGuideUrl, setStudyGuideUrl] = useState('');
    const [pages, setPages] = useState([{ id: `page_${Date.now()}`, title: '', content: '' }]);
    const { showToast } = useToast();

    useEffect(() => {
        if (initialData) {
            setLessonTitle(initialData.title);
            setStudyGuideUrl(initialData.studyGuideUrl || '');
            setPages(initialData.pages?.length > 0 ? initialData.pages.map(p => ({...p})) : [{ id: `page_${Date.now()}`, title: '', content: '' }]);
        } else {
            setLessonTitle('');
            setStudyGuideUrl('');
            setPages([{ id: `page_${Date.now()}`, title: '', content: '' }]);
        }
    }, [initialData, isOpen]);

    const handlePageChange = (index, field, value) => {
        const newPages = [...pages];
        newPages[index][field] = value;
        setPages(newPages);
    };

    const addPage = () => setPages([...pages, { id: `page_${Date.now()}`, title: '', content: '' }]);
    const removePage = (index) => {
        if (pages.length > 1) {
            setPages(pages.filter((_, i) => i !== index));
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const lessonData = { title: lessonTitle, studyGuideUrl, pages, quizzes: initialData?.quizzes || [] };

        try {
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            if (!courseSnap.exists()) throw new Error("Course not found");

            const courseData = courseSnap.data();
            let newUnits = [...courseData.units];
            const unitIndex = newUnits.findIndex(u => u.id === unitId);
            if (unitIndex === -1) throw new Error("Unit not found");

            if (initialData) { // Editing existing lesson
                const lessonIndex = newUnits[unitIndex].lessons.findIndex(l => l.id === initialData.id);
                if (lessonIndex > -1) {
                    newUnits[unitIndex].lessons[lessonIndex] = { ...newUnits[unitIndex].lessons[lessonIndex], ...lessonData };
                }
            } else { // Adding new lesson
                const newLesson = { id: `lesson_${Date.now()}`, ...lessonData };
                newUnits[unitIndex].lessons.push(newLesson);
            }

            await updateDoc(courseRef, { units: newUnits });
            showToast(`Lesson ${initialData ? 'updated' : 'added'} successfully!`);
            onFormSubmit();
            onClose();
        } catch (error) {
            showToast(`Failed to save lesson: ${error.message}`, 'error');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="4xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
                <input type="text" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Lesson Title" className="w-full p-3 border rounded-md" required />
                <input type="url" value={studyGuideUrl} onChange={e => setStudyGuideUrl(e.target.value)} placeholder="Study Guide URL (optional)" className="w-full p-3 border rounded-md" />
                
                <h4 className="font-semibold mt-4 text-gray-700">Lesson Pages</h4>
                {pages.map((page, index) => (
                    <div key={page.id || index} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative">
                        <button type="button" onClick={() => removePage(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                        <input type="text" value={page.title} onChange={e => handlePageChange(index, 'title', e.target.value)} placeholder={`Page ${index + 1} Title`} className="w-full p-3 border rounded-md" required />
                        <RichTextEditor value={page.content} onChange={(content) => handlePageChange(index, 'content', content)} />
                    </div>
                ))}
                <button type="button" onClick={addPage} className="w-full bg-gray-200 p-3 rounded-md hover:bg-gray-300">Add Page</button>
                <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600">Save Lesson</button>
            </form>
        </Modal>
    );
};

export default LessonFormModal;