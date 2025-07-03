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

const LessonItem = ({ lesson, onEdit, onView }) => (
  <div className="p-2 border-b border-gray-200 flex justify-between items-center last:border-b-0">
    <button onClick={onView} className="text-sm text-gray-700 hover:text-blue-600 text-left">
      {lesson.title}
    </button>
    <button onClick={onEdit} className="p-1 hover:bg-gray-200 rounded-full">
      <PencilIcon className="h-4 w-4 text-gray-500" />
    </button>
  </div>
);

const QuizItem = ({ quiz }) => (
  <div className="p-2 border-b border-gray-200 flex justify-between items-center last:border-b-0">
    <p className="text-sm text-gray-700">{quiz.title}</p>
    <button className="p-1 hover:bg-gray-200 rounded-full">
      <PencilIcon className="h-4 w-4 text-gray-500" />
    </button>
  </div>
);

export default function UnitAccordion({ subject }) {
  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState({});
  const [quizzes, setQuizzes] = useState({});
  
  const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
  const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
  const [deleteUnitModalOpen, setDeleteUnitModalOpen] = useState(false);
  const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
  const [viewLessonModalOpen, setViewLessonModalOpen] = useState(false);
  const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

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
      }, (error) => {
        console.error(`Error fetching lessons for unit ${unit.id}:`, error);
      });
      unsubscribers.push(unsubLessons);

      const quizQuery = query(collection(db, 'quizzes'), where('unitId', '==', unit.id), orderBy('createdAt', 'asc'));
      const unsubQuizzes = onSnapshot(quizQuery, snapshot => {
        const fetchedQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuizzes(prev => ({ ...prev, [unit.id]: fetchedQuizzes }));
      }, (error) => {
        console.error(`Error fetching quizzes for unit ${unit.id}:`, error);
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
                {/* --- FIXED: "Edit Unit" button is now here with the other action buttons --- */}
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
                      />
                    )
                  ) : <p className="text-sm text-gray-500 p-2">No lessons in this unit yet.</p>}
                </Card>
                <Card className="mt-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Quizzes</h3>
                  {(quizzes[unit.id] || []).length > 0 ? (
                    (quizzes[unit.id] || []).map(quiz => <QuizItem key={quiz.id} quiz={quiz} />)
                  ) : <p className="text-sm text-gray-500 p-2">No quizzes in this unit yet.</p>}
                </Card>
              </AccordionBody>
            </Accordion>
          ))}
        </AccordionList>
      ) : (
        <p className="text-center text-gray-500 py-10">No units in this subject yet. Add one to get started!</p>
      )}

      <EditUnitModal 
        isOpen={editUnitModalOpen} 
        onClose={() => setEditUnitModalOpen(false)} 
        unit={selectedUnit} 
      />
      <AddLessonModal 
        isOpen={addLessonModalOpen} 
        onClose={() => setAddLessonModalOpen(false)} 
        unitId={selectedUnit?.id} 
        subjectId={subject.id} 
      />
      <AddQuizModal 
        isOpen={addQuizModalOpen} 
        onClose={() => setAddQuizModalOpen(false)} 
        unitId={selectedUnit?.id} 
        subjectId={subject.id} 
      />
      <DeleteUnitModal 
        isOpen={deleteUnitModalOpen} 
        onClose={() => setDeleteUnitModalOpen(false)} 
        unitId={selectedUnit?.id} 
        subjectId={subject.id}
      />
      <EditLessonModal
        isOpen={editLessonModalOpen}
        onClose={() => setEditLessonModalOpen(false)}
        lesson={selectedLesson}
      />
      <ViewLessonModal
        isOpen={viewLessonModalOpen}
        onClose={() => setViewLessonModalOpen(false)}
        lesson={selectedLesson}
      />
    </div>
  );
}