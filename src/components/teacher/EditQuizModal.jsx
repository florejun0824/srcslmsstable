import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import QuizFormModal from './QuizFormModal'; // Make sure this path is correct
import { useToast } from '../../contexts/ToastContext';

const EditQuizModal = ({ isOpen, onClose, quiz }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    // This deep copy is perfect. It prevents the form from
    // changing the quiz data in your app's state before saving.
    const quizDataForForm = useMemo(() => {
        if (!quiz) return null;
        return JSON.parse(JSON.stringify(quiz));
    }, [quiz]);

    const handleEditQuiz = async (quizData) => {
        if (!quiz?.id) {
            showToast("No quiz selected or quiz ID is missing.", "error");
            return;
        }

        // The form passes back just the title and questions
        const { title, questions } = quizData;

        setLoading(true);
        try {
            const quizRef = doc(db, 'quizzes', quiz.id);
            // Only update the fields that can be changed by the form
            await updateDoc(quizRef, {
                title,
                questions
            });
            showToast('Quiz updated successfully!', 'success');
            onClose(); // Close the modal on successful update
        } catch (error) {
            console.error('Error updating quiz: ', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <QuizFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleEditQuiz}
            initialQuizData={quizDataForForm}
            modalTitle="Edit Quiz"
            submitText="Update Quiz"
            loading={loading}
        />
    );
};

export default EditQuizModal;