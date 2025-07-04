import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Accordion, AccordionBody, AccordionHeader, AccordionList, Button, Card } from '@tremor/react';
import { PlusCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';

import AddLessonModal from './AddLessonModal';
import AddQuizModal from './AddQuizModal';
import DeleteUnitModal from './DeleteUnitModal';
import EditLessonModal from './EditLessonModal';
import ViewLessonModal from './ViewLessonModal';
import EditUnitModal from './EditUnitModal';
import EditQuizModal from './EditQuizModal';
import ViewQuizModal from './ViewQuizModal'; // Import the quiz view modal

const LessonItem = ({ lesson, onEdit, onView, onDelete }) => (
    <div className="p-2 border-b border-gray-200 flex justify-between items-center last:border-b-0 group">
        <button onClick={onView} className="text-sm text-gray-700 hover:text-blue-600 text-left">
            {lesson.title}
        </button>
        <div className="flex items-center">
            <button onClick={onEdit} className="p-1 hover:bg-gray-200 rounded-full" title="Edit Lesson">
                <PencilIcon className="h-4 w-4 text-gray-500" />
            </button>
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 rounded-full" title="Delete Lesson">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);

// --- MODIFIED: QuizItem is now clickable ---
const QuizItem = ({ quiz, onEdit, onDelete, onView }) => (
    <div className="p-2 border-b border-gray-200 flex justify-between items-center last:border-b-0 group">
        <button onClick={onView} className="text-sm text-gray-700 hover:text-blue-600 text-left">
            {quiz.title}
        </button>
        <div className="flex items-center">
            <button onClick={() => onEdit(quiz)} className="p-1 hover:bg-gray-200 rounded-full" title="Edit Quiz">
                <PencilIcon className="h-4 w-4 text-gray-500" />
            </button>
             <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 rounded-full" title="Delete Quiz">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);

export default function UnitAccordion({ subject, onInitiateDelete, userProfile }) {
    const [units, setUnits] = useState([]);
    const [lessons, setLessons] = useState({});
    const [quizzes, setQuizzes] = useState({});
    
    const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
    const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
    const [deleteUnitModalOpen, setDeleteUnitModalOpen] = useState(false);
    const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
    const [viewLessonModalOpen, setViewLessonModalOpen] = useState(false);
    const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
    const [editQuizModalOpen, setEditQuizModalOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    
    // --- NEW: State for viewing a quiz ---
    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);

    useEffect(() => {
        if (!subject?.id) {
            setUnits([]);
            return;
        }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUnits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUnits(fetchedUnits);
        }, (error) => {
            console.error("Error fetching units: ", error);
        });
        return () => unsubscribe();
    }, [subject?.id]);

    useEffect(() => {
        if (units.length === 0) {
            setLessons({});
            setQuizzes({});
            return;
        }
    
        const unsubscribers = [];
    
        units.forEach(unit => {
            const lessonQuery = query(collection(db, 'lessons'), where('unitId', '==', unit.id), orderBy('createdAt', 'asc'));
            const unsubLessons = onSnapshot(lessonQuery, snapshot => {
                const fetchedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLessons(prev => ({ ...prev, [unit.id]: fetchedLessons }));
            });
            unsubscribers.push(unsubLessons);
    
            const quizQuery = query(collection(db, 'quizzes'), where('unitId', '==', unit.id), orderBy('createdAt', 'asc'));
            const unsubQuizzes = onSnapshot(quizQuery, snapshot => {
                const fetchedQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuizzes(prev => ({ ...prev, [unit.id]: fetchedQuizzes }));
            });
            unsubscribers.push(unsubQuizzes);
        });
    
        return () => unsubscribers.forEach(unsub => unsub());
    }, [units]);

    const handleOpenUnitModal = (modalSetter, unit) => {
        setSelectedUnit(unit);
        modalSetter(true);
    };

    const handleOpenLessonModal = (modalSetter, lesson) => {
        setSelectedLesson(lesson);
        modalSetter(true);
    };

    const handleOpenQuizModal = (modalSetter, quiz) => {
        setSelectedQuiz(quiz);
        modalSetter(true);
    };

    const handleEditQuiz = (quizToEdit) => {
        handleOpenQuizModal(setEditQuizModalOpen, quizToEdit);
    };

    return (
        <div>
            {units.length > 0 ? (
                <AccordionList>
                    {units.map((unit) => (
                        <Accordion key={unit.id}>
                            <AccordionHeader>
                                <div className="flex-1">
                                    <span className="font-semibold">{unit.title}</span>
                                </div>
                            </AccordionHeader>
                            <AccordionBody>
                                <div className="flex items-center gap-2 mb-4 p-2 border-b">
                                    <Button size="xs" icon={PlusCircleIcon} onClick={() => handleOpenUnitModal(setAddLessonModalOpen, unit)}>Add Lesson</Button>
                                    <Button size="xs" icon={PlusCircleIcon} onClick={() => handleOpenUnitModal(setAddQuizModalOpen, unit)}>Add Quiz</Button>
                                    <Button size="xs" icon={PencilIcon} variant="secondary" onClick={() => handleOpenUnitModal(setEditUnitModalOpen, unit)}>Edit Unit</Button>
                                    <Button size="xs" icon={TrashIcon} color="red" onClick={() => handleOpenUnitModal(setDeleteUnitModalOpen, unit)}>Delete Unit</Button>
                                </div>
                                <Card>
                                    <h3 className="font-semibold text-gray-700 mb-2">Lessons</h3>
                                    {(lessons[unit.id] || []).length > 0 ? (
                                        (lessons[unit.id] || []).map(lesson => 
                                            <LessonItem 
                                                key={lesson.id} 
                                                lesson={lesson} 
                                                onView={() => handleOpenLessonModal(setViewLessonModalOpen, lesson)}
                                                onEdit={() => handleOpenLessonModal(setEditLessonModalOpen, lesson)}
                                                onDelete={() => onInitiateDelete('lesson', lesson.id, unit.id, subject.id)}
                                            />
                                        )
                                    ) : <p className="text-sm text-gray-500 p-2">No lessons in this unit yet.</p>}
                                </Card>
                                <Card className="mt-4">
                                    <h3 className="font-semibold text-gray-700 mb-2">Quizzes</h3>
                                    {(quizzes[unit.id] || []).length > 0 ? (
                                        (quizzes[unit.id] || []).map(quiz => 
                                            <QuizItem 
                                                key={quiz.id} 
                                                quiz={quiz} 
                                                onEdit={handleEditQuiz} 
                                                onDelete={() => onInitiateDelete('quiz', quiz.id, unit.id, subject.id)}
                                                onView={() => handleOpenQuizModal(setViewQuizModalOpen, quiz)}
                                            />)
                                    ) : <p className="text-sm text-gray-500 p-2">No quizzes in this unit yet.</p>}
                                </Card>
                            </AccordionBody>
                        </Accordion>
                    ))}
                </AccordionList>
            ) : (
                <p className="text-center text-gray-500 py-10">No units in this subject yet. Add one to get started!</p>
            )}

            {/* --- All the existing modals --- */}
            <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />
            <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} />
            <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} />
            <DeleteUnitModal isOpen={deleteUnitModalOpen} onClose={() => setDeleteUnitModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id}/>
            <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson}/>
            <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson}/>
            {selectedQuiz && (<EditQuizModal isOpen={editQuizModalOpen} onClose={() => setEditQuizModalOpen(false)} quiz={selectedQuiz} onEditQuiz={() => {setEditQuizModalOpen(false);}}/>)}

            {/* --- NEW: Render the ViewQuizModal for previews --- */}
            <ViewQuizModal
                isOpen={viewQuizModalOpen}
                onClose={() => setViewQuizModalOpen(false)}
                quiz={selectedQuiz}
                userProfile={userProfile}
                // classId is intentionally omitted for teacher preview mode
            />
        </div>
    );
}