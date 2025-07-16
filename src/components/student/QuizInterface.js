import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button, Card, Title, TextInput, Text, Badge, Dialog, DialogPanel } from '@tremor/react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import ViewQuizModal from '../../pages/student/ViewQuizModal';
import { toast } from 'react-hot-toast';
import ContentRenderer from '../../pages/student/ContentRenderer';

const QuizForm = ({ onSave, onCancel, initialData }) => {
    // ... (No changes needed in this component)
};

const QuizInterface = ({ classId, userProfile }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [viewingQuiz, setViewingQuiz] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const fetchQuizzes = useCallback(async () => {
        setLoading(true);
        const q = query(collection(db, "quizzes"), where("classId", "==", classId));
        const querySnapshot = await getDocs(q);
        const quizzesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuizzes(quizzesData);
        setLoading(false);
    }, [classId]);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    const handleViewQuiz = async (quizId) => {
        const quizDoc = await getDoc(doc(db, "quizzes", quizId));
        if (quizDoc.exists()) {
            const quizData = quizDoc.data();

            // --- THIS IS THE CRITICAL FIX ---
            // We ensure that every field, INCLUDING the explanation, is fetched.
            // The '...' operator copies all fields from the document.
            const fullQuizData = {
                id: quizDoc.id,
                ...quizData,
                questions: quizData.questions.map(q => ({
                    ...q // This ensures 'explanation' and all other question fields are included
                }))
            };
            setViewingQuiz(fullQuizData);
            setShowViewModal(true);
        }
    };


    const handleSaveQuiz = async (quizData) => {
        try {
            if (editingQuiz) {
                const quizRef = doc(db, 'quizzes', editingQuiz.id);
                await updateDoc(quizRef, quizData);
                toast.success('Quiz updated successfully!');
            } else {
                await addDoc(collection(db, 'quizzes'), {
                    ...quizData,
                    classId: classId,
                    createdAt: serverTimestamp()
                });
                toast.success('Quiz created successfully!');
            }
            fetchQuizzes();
            setShowForm(false);
            setEditingQuiz(null);
        } catch (error) {
            console.error("Error saving quiz:", error);
            toast.error('Failed to save quiz.');
        }
    };

    const handleDeleteQuiz = async (quizId) => {
        if (window.confirm("Are you sure you want to delete this quiz?")) {
            try {
                await deleteDoc(doc(db, 'quizzes', quizId));
                toast.success('Quiz deleted successfully!');
                fetchQuizzes();
            } catch (error) {
                console.error("Error deleting quiz:", error);
                toast.error('Failed to delete quiz.');
            }
        }
    };

    if (loading) return <Spinner />;

    const isTeacher = userProfile?.role === 'teacher';

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <Title>Quizzes</Title>
                {isTeacher && (
                    <Button icon={PlusIcon} onClick={() => { setEditingQuiz(null); setShowForm(true); }}>
                        Create Quiz
                    </Button>
                )}
            </div>

            {quizzes.length === 0 ? (
                <Text>No quizzes found for this class.</Text>
            ) : (
                <div className="space-y-4">
                    {quizzes.map((quiz) => (
                        <Card key={quiz.id}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <Title>{quiz.title}</Title>
                                    <Text>{quiz.questions?.length || 0} questions</Text>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button icon={EyeIcon} variant="light" onClick={() => handleViewQuiz(quiz.id)}>
                                        View
                                    </Button>
                                    {isTeacher && (
                                        <>
                                            <Button icon={PencilIcon} variant="light" onClick={() => { setEditingQuiz(quiz); setShowForm(true); }} />
                                            <Button icon={TrashIcon} variant="light" color="red" onClick={() => handleDeleteQuiz(quiz.id)} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showForm} onClose={() => setShowForm(false)} static={true}>
                <DialogPanel>
                    <QuizForm
                        onSave={handleSaveQuiz}
                        onCancel={() => { setShowForm(false); setEditingQuiz(null); }}
                        initialData={editingQuiz}
                    />
                </DialogPanel>
            </Dialog>

            {viewingQuiz && (
                <ViewQuizModal
                    isOpen={showViewModal}
                    onClose={() => setShowViewModal(false)}
                    quiz={viewingQuiz}
                    userProfile={userProfile}
                    classId={classId}
                />
            )}
        </div>
    );
};

export default QuizInterface;