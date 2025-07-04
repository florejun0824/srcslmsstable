import React from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import QuizFormModal from './QuizFormModal';
import { useToast } from '../../contexts/ToastContext';

const EditQuizModal = ({ isOpen, onClose, quiz }) => {
    const { showToast } = useToast();

    const handleEditQuiz = async (updatedQuizData) => {
        if (!quiz?.id) {
            showToast("No quiz selected or quiz ID is missing.", "error");
            return;
        }

        try {
            const quizRef = doc(db, 'quizzes', quiz.id);
            await updateDoc(quizRef, updatedQuizData);
            showToast('Quiz updated successfully!', 'success');
            onClose(); // Close the modal on successful update
        } catch (error) {
            console.error('Error updating quiz: ', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    };

    return (
        <QuizFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleEditQuiz}
            initialQuizData={quiz}
            title="Edit Quiz"
        />
    );
};

export default EditQuizModal;