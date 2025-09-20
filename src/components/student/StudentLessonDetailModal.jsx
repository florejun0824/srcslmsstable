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

    const totalPages = lesson?.pages?.length || 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lesson?.title} size="4xl">
            {/* Header Buttons */}
            <div className="flex justify-end space-x-2 mb-4">
                {lesson?.studyGuideUrl && (
                    <a
                        href={lesson.studyGuideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-500 text-white px-4 py-2 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all"
                    >
                        Download Study Guide
                    </a>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 mb-4">
                <button
                    onClick={() => setActiveTab('pages')}
                    className={`py-2 px-4 rounded-t-xl transition-all ${
                        activeTab === 'pages'
                            ? 'bg-neumorphic-base shadow-neumorphic-inset font-semibold text-blue-700'
                            : 'text-slate-600 hover:text-blue-600 hover:shadow-neumorphic-inset'
                    }`}
                >
                    Pages
                </button>
                <button
                    onClick={() => setActiveTab('quizzes')}
                    className={`py-2 px-4 rounded-t-xl transition-all ${
                        activeTab === 'quizzes'
                            ? 'bg-neumorphic-base shadow-neumorphic-inset font-semibold text-blue-700'
                            : 'text-slate-600 hover:text-blue-600 hover:shadow-neumorphic-inset'
                    }`}
                >
                    Quizzes
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-4 max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                {activeTab === 'pages' && (
                    totalPages > 0 ? (
                        <div className="p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic min-h-[30vh]">
                            <h4 className="font-bold text-xl text-slate-800 mb-2">
                                {lesson.pages[activePage].title}
                            </h4>
                            <div className="mt-2 prose max-w-none">
                                <ContentRenderer text={lesson.pages[activePage].content} />
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => setActivePage(p => p - 1)}
                                    disabled={activePage === 0}
                                    className="flex items-center px-4 py-2 rounded-xl bg-neumorphic-base shadow-neumorphic 
                                               hover:shadow-neumorphic-inset text-slate-700 transition-all
                                               disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} className="mr-1" /> Previous
                                </button>

                                <span className="text-slate-600 font-medium">
                                    Page {activePage + 1} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setActivePage(p => p + 1)}
                                    disabled={activePage >= totalPages - 1}
                                    className="flex items-center px-4 py-2 rounded-xl bg-neumorphic-base shadow-neumorphic 
                                               hover:shadow-neumorphic-inset text-slate-700 transition-all
                                               disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next <ChevronRight size={20} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">This lesson has no pages.</p>
                    )
                )}

                {activeTab === 'quizzes' && (
                    <div>
                        {lesson?.quizzes?.length > 0 ? (
                            lesson.quizzes.map(quiz => (
                                <div
                                    key={quiz.id}
                                    className="p-4 mb-3 rounded-2xl bg-neumorphic-base shadow-neumorphic 
                                               flex justify-between items-center"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-700">{quiz.title}</p>
                                        <p className="text-xs text-slate-500">
                                            Attempts: {getAttemptsCount(quiz.id)}/3
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onTakeQuiz(quiz)}
                                        className={`px-4 py-2 rounded-xl transition-all shadow-neumorphic 
                                                    ${hasTakenQuiz(quiz.id)
                                                        ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                                                        : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                        disabled={hasTakenQuiz(quiz.id)}
                                    >
                                        {hasTakenQuiz(quiz.id) ? 'Completed' : 'Take Quiz'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-center py-8">This lesson has no quizzes.</p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default StudentLessonDetailModal;
