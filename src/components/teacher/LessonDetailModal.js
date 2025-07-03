import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import AddQuizModal from './AddQuizModal';
import EditQuizModal from './EditQuizModal';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LessonDetailModal = ({ isOpen, onClose, lesson, onEditRequest, onCourseUpdated }) => {
    const [activeTab, setActiveTab] = useState('pages');
    const [isQuizModalOpen, setQuizModalOpen] = useState(false);
    const [isEditQuizModalOpen, setEditQuizModalOpen] = useState(false);
    const [quizToEdit, setQuizToEdit] = useState(null);
    const [activePage, setActivePage] = useState(0);
    const { showToast } = useToast();

    useEffect(() => {
        setActivePage(0);
        setActiveTab('pages');
    }, [isOpen, lesson]);

    const handleAddQuiz = async (quizData) => {
        const courseRef = doc(db, "courses", lesson.courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) return;

        const courseData = courseSnap.data();
        const unitIndex = courseData.units.findIndex(u => u.id === lesson.unitId);
        if (unitIndex === -1) return;

        const lessonIndex = courseData.units[unitIndex].lessons.findIndex(l => l.id === lesson.id);
        if (lessonIndex === -1) return;

        const newQuiz = { id: `quiz_${Date.now()}`, ...quizData };
        const newLessons = [...courseData.units[unitIndex].lessons];
        newLessons[lessonIndex].quizzes = newLessons[lessonIndex].quizzes || [];
        newLessons[lessonIndex].quizzes.push(newQuiz);

        const newUnits = [...courseData.units];
        newUnits[unitIndex].lessons = newLessons;

        await updateDoc(courseRef, { units: newUnits });
        showToast("Quiz added!");
        setQuizModalOpen(false);
        onCourseUpdated();
    };

    const handleEditQuiz = async (newQuizData) => {
        const courseRef = doc(db, "courses", lesson.courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) return;

        const courseData = courseSnap.data();
        const updatedUnits = courseData.units.map(unit => {
            if (unit.id === lesson.unitId) {
                const updatedLessons = unit.lessons.map(l => {
                    if (l.id === lesson.id) {
                        const updatedQuizzes = l.quizzes.map(q => q.id === quizToEdit.id ? { ...q, ...newQuizData } : q);
                        return { ...l, quizzes: updatedQuizzes };
                    }
                    return l;
                });
                return { ...unit, lessons: updatedLessons };
            }
            return unit;
        });

        await updateDoc(courseRef, { units: updatedUnits });
        showToast("Quiz updated!");
        setEditQuizModalOpen(false);
        onCourseUpdated();
    };

    const totalPages = lesson.pages?.length || 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lesson.title} size="4xl">
            <div className="flex justify-end space-x-2 mb-4">
                <button onClick={() => onEditRequest(lesson)} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Edit Lesson</button>
            </div>
            <div className="border-b border-gray-200 mb-4">
                <button onClick={() => setActiveTab('pages')} className={`py-2 px-4 rounded-t-lg ${activeTab === 'pages' ? 'border-b-2 border-blue-500 font-semibold text-blue-700' : 'text-gray-600'}`}>Pages</button>
                <button onClick={() => setActiveTab('quizzes')} className={`py-2 px-4 rounded-t-lg ${activeTab === 'quizzes' ? 'border-b-2 border-blue-500 font-semibold text-blue-700' : 'text-gray-600'}`}>Quizzes</button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-y-auto p-2">
                {activeTab === 'pages' && (totalPages > 0 ? (
                    <div>
                        <div className="p-4 border bg-white min-h-[30vh]">
                            <h4 className="font-bold text-xl mb-2">{lesson.pages[activePage].title}</h4>
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: lesson.pages[activePage].content }} />
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <button onClick={() => setActivePage(p => p - 1)} disabled={activePage === 0} className="flex items-center bg-gray-300 px-4 py-2 rounded-md disabled:opacity-50">
                                <ChevronLeft size={20} className="mr-1" /> Previous
                            </button>
                            <span>Page {activePage + 1} of {totalPages}</span>
                            <button onClick={() => setActivePage(p => p + 1)} disabled={activePage >= totalPages - 1} className="flex items-center bg-gray-300 px-4 py-2 rounded-md disabled:opacity-50">
                                Next <ChevronRight size={20} className="ml-1" />
                            </button>
                        </div>
                    </div>
                ) : <p className="text-center py-8">This lesson has no pages.</p>)}
                
                {activeTab === 'quizzes' && (
                    <div>
                        <button onClick={() => setQuizModalOpen(true)} className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 mb-4">Add Quiz</button>
                        {lesson.quizzes?.length > 0 ? lesson.quizzes.map(quiz => (
                            <div key={quiz.id} className="p-4 border rounded-lg mb-3 flex justify-between items-center bg-white">
                                <p className="font-semibold">{quiz.title}</p>
                                <button onClick={() => { setQuizToEdit(quiz); setEditQuizModalOpen(true); }} className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm">Edit</button>
                            </div>
                        )) : <p className="text-center py-8">This lesson has no quizzes.</p>}
                    </div>
                )}
            </div>
            <AddQuizModal isOpen={isQuizModalOpen} onClose={() => setQuizModalOpen(false)} onAddQuiz={handleAddQuiz} />
            {quizToEdit && <EditQuizModal isOpen={isEditQuizModalOpen} onClose={() => setEditQuizModalOpen(false)} onEditQuiz={handleEditQuiz} quiz={quizToEdit} />}
        </Modal>
    );
};

export default LessonDetailModal;