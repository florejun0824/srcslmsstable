import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentRenderer from '../teacher/ContentRenderer'; // Adjust path if necessary

const StudentLessonDetailModal = ({ isOpen, onClose, lesson, onTakeQuiz, hasTakenQuiz, getAttemptsCount }) => {
    const [activeTab, setActiveTab] = useState('pages');
    const [activePage, setActivePage] = useState(0);

    useEffect(() => {
        setActivePage(0);
        if (lesson?.pages?.length > 0) {
            setActiveTab('pages');
        } else if (lesson?.quizzes?.length > 0) {
            setActiveTab('quizzes');
        }
    }, [isOpen, lesson]);

    const totalPages = lesson.pages?.length || 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lesson.title} size="4xl">
            <div className="flex justify-end space-x-2 mb-4">
                {lesson.studyGuideUrl && <a href={lesson.studyGuideUrl} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Download Study Guide</a>}
            </div>
            <div className="border-b border-gray-200 mb-4">
                <button onClick={() => setActiveTab('pages')} className={`py-2 px-4 rounded-t-lg ${activeTab === 'pages' ? 'border-b-2 border-blue-500 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Pages</button>
                <button onClick={() => setActiveTab('quizzes')} className={`py-2 px-4 rounded-t-lg ${activeTab === 'quizzes' ? 'border-b-2 border-blue-500 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Quizzes</button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-y-auto p-2">
                {activeTab === 'pages' && (
                    totalPages > 0 ? (
                        <div>
                            <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white min-h-[30vh]">
                                <h4 className="font-bold text-xl text-gray-800 mb-2">{lesson.pages[activePage].title}</h4>
<div className="mt-2 prose max-w-none">
    <ContentRenderer text={lesson.pages[activePage].content} />
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <button onClick={() => setActivePage(p => p - 1)} disabled={activePage === 0} className="flex items-center bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <ChevronLeft size={20} className="mr-1" /> Previous
                                </button>
                                <span className="text-gray-600 font-medium">Page {activePage + 1} of {totalPages}</span>
                                <button onClick={() => setActivePage(p => p + 1)} disabled={activePage >= totalPages - 1} className="flex items-center bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Next <ChevronRight size={20} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    ) : <p className="text-gray-500 text-center py-8">This lesson has no pages.</p>
                )}
                {activeTab === 'quizzes' && (
                    <div>
                        {lesson.quizzes?.length > 0 ? lesson.quizzes.map(quiz => (
                            <div key={quiz.id} className="p-4 border border-gray-200 rounded-lg mb-3 flex justify-between items-center bg-white">
                                <div>
                                    <p className="font-semibold text-gray-700">{quiz.title}</p>
                                    <p className="text-xs text-gray-500">Attempts: {getAttemptsCount(quiz.id)}/3</p>
                                </div>
                                <button onClick={() => onTakeQuiz(quiz)} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400" disabled={hasTakenQuiz(quiz.id)}>
                                    {hasTakenQuiz(quiz.id) ? 'Completed' : 'Take Quiz'}
                                </button>
                            </div>
                        )) : <p className="text-gray-500 text-center py-8">This lesson has no quizzes.</p>}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default StudentLessonDetailModal;