import React from 'react';
import QuizFormModal from './QuizFormModal';

const EditQuizModal = ({ isOpen, onClose, onEditQuiz, quiz }) => (
    <QuizFormModal 
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={onEditQuiz}
        initialQuizData={quiz}
        title="Edit Quiz"
    />
);

export default EditQuizModal;