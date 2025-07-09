import React, { useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import QuizFormModal from './QuizFormModal';
import { useToast } from '../../contexts/ToastContext';

const EditQuizModal = ({ isOpen, onClose, quiz }) => {
    const { showToast } = useToast();

    // --- FIX: Create a deep copy of the quiz data for the form ---
    // This prevents the form from accidentally modifying the original app state.
    // useMemo ensures this only runs when the quiz prop changes.
    const quizDataForForm = useMemo(() => {
        if (!quiz) return null;
        // The simplest and safest way to deep-clone a JSON-serializable object.
        return JSON.parse(JSON.stringify(quiz));
    }, [quiz]);

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
            // Pass the safe, deep-copied data to the form
            initialQuizData={quizDataForForm}
            title="Edit Quiz"
        />
    );
};

export default EditQuizModal;