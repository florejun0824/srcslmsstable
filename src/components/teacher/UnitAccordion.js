import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { Accordion, AccordionBody, AccordionHeader, AccordionList, Button } from '@tremor/react';
import {
    PlusCircleIcon,
    TrashIcon,
    PencilIcon,
    SparklesIcon,
    DocumentTextIcon,
    EyeIcon,
    Bars3Icon,
} from '@heroicons/react/24/solid';

// --- Imports for Drag-and-Drop ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// --- Other Component Imports ---
import AddLessonModal from './AddLessonModal';
import AddQuizModal from './AddQuizModal';
import DeleteUnitModal from './DeleteUnitModal';
import EditLessonModal from './EditLessonModal';
import ViewLessonModal from './ViewLessonModal';
import EditUnitModal from './EditUnitModal';
import EditQuizModal from './EditQuizModal';
import ViewQuizModal from './ViewQuizModal';
import AiQuizModal from './AiQuizModal';
import ContentRenderer from './ContentRenderer';
// ✅ 1. Import the new AiGenerationHub
import AiGenerationHub from './AiGenerationHub';


// --- PDF export function ---
const exportLessonToPdf = async (lesson) => {
    console.log('Preparing lesson for PDF export...');

    let lessonContentHtml = `<h1>${lesson.title}</h1>`;
    // We only need to check the first page's title for the special format
    if (lesson.pages.length > 0 && lesson.pages[0].title === 'PEAC Unit Learning Plan') {
        lessonContentHtml += lesson.pages[0].content; // Use the raw markdown table
    } else {
        for (const page of lesson.pages) {
            const cleanTitle = page.title.replace(/^page\s*\d+\s*[:-]?\s*/i, '');
            lessonContentHtml += `<h2>${cleanTitle}</h2>`;
            lessonContentHtml += `<div class="prose max-w-full">${page.content}</div>`;
        }
    }

    const printHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${lesson.title}</title>
            <style>
                body {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 12pt;
                }
                .prose img { max-width: 100%; }

                /* --- NEW: Styles to make Markdown tables render correctly in PDF --- */
                .prose table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 1em;
                    margin-bottom: 1em;
                }
                .prose th, .prose td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .prose th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .prose tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                /* End of new table styles */

                @media print {
                    @page {
                        size: 8.5in 13in;
                        margin: 1in;
                    }
                }
            </style>
        </head>
        <body>
            <div id="render-container"></div>
        </body>
        </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    iframe.contentDocument.write(printHtml);
    iframe.contentDocument.close();
    
    const renderContainer = iframe.contentDocument.getElementById('render-container');
    const root = createRoot(renderContainer);
    // Use ContentRenderer to process Markdown to HTML
    root.render(<React.StrictMode><ContentRenderer text={lessonContentHtml} /></React.StrictMode>);

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
    }, 1000);
};

// --- Menu Components ---
const MenuPortal = ({ children, menuStyle, onClose }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return createPortal(
        <div ref={menuRef} style={menuStyle} className="fixed bg-white rounded-md shadow-lg z-[5000] border">
            <div className="py-1" onClick={onClose}>{children}</div>
        </div>,
        document.body
    );
};

const ActionMenu = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const iconRef = useRef(null);
    const handleToggle = () => {
        if (isOpen) {
            setIsOpen(false);
        } else {
            const iconRect = iconRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - iconRect.bottom;
            const menuHeight = 150;
            const style = {
                right: `${window.innerWidth - iconRect.right}px`,
                width: '224px',
            };
            if (spaceBelow < menuHeight) {
                style.bottom = `${window.innerHeight - iconRect.top}px`;
            } else {
                style.top = `${iconRect.bottom}px`;
            }
            setMenuStyle(style);
            setIsOpen(true);
        }
    };
    return (
        <>
            <div ref={iconRef} onClick={handleToggle} className="p-1.5 text-purple-500 hover:bg-purple-100 rounded-full cursor-pointer">
                <SparklesIcon className="h-5 w-5" />
            </div>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>{children}</MenuPortal>}
        </>
    );
};

const MenuItem = ({ icon: Icon, text, onClick, disabled = false }) => (
    <button onClick={onClick} disabled={disabled} className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon className={`h-5 w-5 mr-3 ${disabled ? 'text-gray-400' : ''}`} />
        <span>{text}</span>
    </button>
);

// --- Content Item Components ---
const QuizItem = ({ quiz, onEdit, onDelete, onView }) => (
    <div className="p-2 border-b border-gray-200 flex justify-between items-center last:border-b-0 group">
        <p className="text-sm text-gray-700">{quiz.title}</p>
        <div className="flex items-center gap-1">
            <button onClick={onView} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full" title="View Quiz">
                <EyeIcon className="h-5 w-5" />
            </button>
            <ActionMenu>
                <MenuItem icon={PencilIcon} text="Edit Quiz" onClick={() => onEdit(quiz)} />
                <MenuItem icon={TrashIcon} text="Delete Quiz" onClick={onDelete} />
            </ActionMenu>
        </div>
    </div>
);

function SortableLessonItem({ lesson, unitId, ...props }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: lesson.id,
        data: {
            type: 'lesson',
            unitId: unitId,
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div className="p-2 border-b border-gray-200 flex justify-between items-center last:border-b-0 group">
                <div className="flex items-center gap-2">
                    <button {...listeners} className="cursor-grab">
                        <Bars3Icon className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                    </button>
                    <p className="text-sm text-gray-700">{lesson.title}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={props.onView} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full" title="View Lesson">
                        <EyeIcon className="h-5 w-5" />
                    </button>
                    <ActionMenu>
                        <MenuItem icon={PencilIcon} text="Edit Lesson" onClick={props.onEdit} />
                        <MenuItem icon={DocumentTextIcon} text="Export as .pdf" onClick={() => exportLessonToPdf(lesson)} />
                        <MenuItem icon={SparklesIcon} text="AI Generate Quiz" onClick={props.onGenerateQuiz} disabled={props.isAiGenerating} />
                        <MenuItem icon={TrashIcon} text="Delete Lesson" onClick={props.onDelete} />
                    </ActionMenu>
                </div>
            </div>
        </div>
    );
}

function SortableUnitItem(props) {
    const {
        unit,
        lessonsForUnit,
        quizzesForUnit,
        ...otherProps
    } = props;
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ 
        id: unit.id,
        data: {
            type: 'unit'
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Accordion>
                <AccordionHeader>
                    <div className="flex justify-between w-full items-center">
                        <div className="flex items-center gap-2">
                             <button {...listeners} {...attributes} className="cursor-grab">
                                <Bars3Icon className="h-5 w-5 text-gray-400" />
                            </button>
                            <span className="font-semibold">{unit.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* ✅ 2. The onClick handler now opens the AI Hub for this specific unit */}
                            <div
                                role="button"
                                onClick={(e) => { e.stopPropagation(); otherProps.onOpenAiHub(unit); }}
                                className="flex items-center px-2 py-1 rounded-md text-sm text-purple-600 hover:bg-purple-100 cursor-pointer"
                            >
                                <SparklesIcon className="h-4 w-4 mr-1" />
                                AI Tools
                            </div>
                        </div>
                    </div>
                </AccordionHeader>
                <AccordionBody>
                    <div className="flex items-center gap-2 mb-4 p-2 border-b">
                        <Button size="xs" icon={PlusCircleIcon} onClick={() => otherProps.handleOpenUnitModal(otherProps.setAddLessonModalOpen, unit)}>Add Lesson</Button>
                        <Button size="xs" icon={PlusCircleIcon} onClick={() => otherProps.handleOpenUnitModal(otherProps.setAddQuizModalOpen, unit)}>Add Quiz</Button>
                        <Button size="xs" icon={PencilIcon} variant="secondary" onClick={() => otherProps.handleOpenUnitModal(otherProps.setEditUnitModalOpen, unit)}>Edit Unit</Button>
                        <Button size="xs" icon={TrashIcon} color="red" onClick={() => otherProps.handleOpenUnitModal(otherProps.setDeleteUnitModalOpen, unit)}>Delete Unit</Button>
                    </div>
                    <div className="border rounded-lg p-4 bg-white shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-2">Lessons</h3>
                        <SortableContext items={lessonsForUnit.map(l => l.id)} strategy={verticalListSortingStrategy}>
                            {lessonsForUnit.length > 0 ? (
                                lessonsForUnit.map(lesson =>
                                    <SortableLessonItem
                                        key={lesson.id}
                                        lesson={lesson}
                                        unitId={unit.id}
                                        onView={() => otherProps.handleOpenLessonModal(otherProps.setViewLessonModalOpen, lesson)}
                                        onEdit={() => otherProps.handleOpenLessonModal(otherProps.setEditLessonModalOpen, lesson)}
                                        onDelete={() => otherProps.onInitiateDelete('lesson', lesson.id)}
                                        onGenerateQuiz={() => otherProps.onOpenAiQuizModal(lesson)}
                                        isAiGenerating={otherProps.isAiGenerating}
                                    />
                                )
                            ) : <p className="text-sm text-gray-500 p-2">No lessons in this unit yet.</p>}
                        </SortableContext>
                    </div>
                    <div className="border rounded-lg p-4 bg-white shadow-sm mt-4">
                        <h3 className="font-semibold text-gray-700 mb-2">Quizzes</h3>
                        {quizzesForUnit.length > 0 ? (
                            quizzesForUnit.map(quiz =>
                                <QuizItem
                                    key={quiz.id}
                                    quiz={quiz}
                                    onEdit={() => otherProps.handleEditQuiz(quiz)}
                                    onDelete={() => otherProps.onInitiateDelete('quiz', quiz.id, quiz.lessonId)}
                                    onView={() => otherProps.handleOpenQuizModal(otherProps.setViewQuizModalOpen, quiz)}
                                />)
                        ) : <p className="text-sm text-gray-500 p-2">No quizzes in this unit yet.</p>}
                    </div>
                </AccordionBody>
            </Accordion>
        </div>
    );
}

// --- Main Accordion Component ---
const customSort = (a, b) => {
    const orderA = a.order;
    const orderB = b.order;
    if (orderA !== undefined && orderB === undefined) return -1;
    if (orderA === undefined && orderB !== undefined) return 1;
    if (orderA !== undefined && orderB !== undefined) {
        if (orderA !== orderB) {
            return orderA - orderB;
        }
    }
    const timeA = a.createdAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || 0;
    return timeA - timeB;
};

export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating }) {
    const [units, setUnits] = useState([]);
    const [lessons, setLessons] = useState({});
    const [quizzes, setQuizzes] = useState({});
    
    // State for all modals
    const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
    const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
    const [deleteUnitModalOpen, setDeleteUnitModalOpen] = useState(false);
    const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
    const [viewLessonModalOpen, setViewLessonModalOpen] = useState(false);
    const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
    const [editQuizModalOpen, setEditQuizModalOpen] = useState(false);
    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);
    const [aiQuizModalOpen, setAiQuizModalOpen] = useState(false);
    
    // ✅ 3. Rename state to be generic for the AI Hub and add state for the selected unit
    const [isAiHubOpen, setIsAiHubOpen] = useState(false);
    const [unitForAi, setUnitForAi] = useState(null);

    // State for selected items
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [lessonForAiQuiz, setLessonForAiQuiz] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (!subject?.id) { setUnits([]); return; }
        const q = query(
            collection(db, 'units'), 
            where('subjectId', '==', subject.id)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUnits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedUnits.sort(customSort);
            setUnits(fetchedUnits);
        }, (error) => { console.error("Error fetching units: ", error); });
        return () => unsubscribe();
    }, [subject?.id]);

    useEffect(() => {
        if (units.length === 0) { setLessons({}); setQuizzes({}); return; }
        const unsubscribers = [];
        units.forEach(unit => {
            const lessonQuery = query(
                collection(db, 'lessons'), 
                where('unitId', '==', unit.id)
            );
            const unsubLessons = onSnapshot(lessonQuery, snapshot => {
                const fetchedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedLessons.sort(customSort);
                setLessons(prev => ({ ...prev, [unit.id]: fetchedLessons }));
            });
            unsubscribers.push(unsubLessons);
            
            const quizQuery = query(collection(db, 'quizzes'), where('unitId', '==', unit.id));
            const unsubQuizzes = onSnapshot(quizQuery, snapshot => {
                setQuizzes(prev => ({ ...prev, [unit.id]: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
            });
            unsubscribers.push(unsubQuizzes);
        });
        return () => unsubscribers.forEach(unsub => unsub());
    }, [units]);

    async function handleDragEnd(event) {
        const { active, over } = event;

        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;
        
        if (activeType === 'unit' && overType === 'unit' && active.id !== over.id) {
            const oldIndex = units.findIndex(u => u.id === active.id);
            const newIndex = units.findIndex(u => u.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedUnits = arrayMove(units, oldIndex, newIndex);
                setUnits(reorderedUnits); 
                const batch = writeBatch(db);
                reorderedUnits.forEach((unit, index) => {
                    const unitRef = doc(db, 'units', unit.id);
                    batch.update(unitRef, { order: index });
                });
                await batch.commit();
            }
            return;
        }

        if (activeType === 'lesson') {
            const sourceUnitId = active.data.current.unitId;
            let destinationUnitId = over.data.current?.unitId;

            if(overType === 'unit') {
                destinationUnitId = over.id;
            }

            if (!destinationUnitId) return;
            
            if (sourceUnitId === destinationUnitId) {
                const currentLessons = lessons[sourceUnitId];
                const oldIndex = currentLessons.findIndex(l => l.id === active.id);
                const newIndex = currentLessons.findIndex(l => l.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const reorderedLessons = arrayMove(currentLessons, oldIndex, newIndex);
                    setLessons(prev => ({ ...prev, [sourceUnitId]: reorderedLessons }));

                    const batch = writeBatch(db);
                    reorderedLessons.forEach((lesson, index) => {
                        const lessonRef = doc(db, 'lessons', lesson.id);
                        batch.update(lessonRef, { order: index });
                    });
                    await batch.commit();
                }
            } 
            else {
                const sourceLessons = [...lessons[sourceUnitId]];
                const destinationLessons = lessons[destinationUnitId] ? [...lessons[destinationUnitId]] : [];
                
                const activeIndex = sourceLessons.findIndex(l => l.id === active.id);
                const [movedLesson] = sourceLessons.splice(activeIndex, 1);
                
                const overIndex = destinationLessons.findIndex(l => l.id === over.id);
                const newIndexInDest = overIndex >= 0 ? overIndex : destinationLessons.length;
                destinationLessons.splice(newIndexInDest, 0, movedLesson);

                setLessons(prev => ({
                    ...prev,
                    [sourceUnitId]: sourceLessons,
                    [destinationUnitId]: destinationLessons,
                }));

                const batch = writeBatch(db);

                const movedLessonRef = doc(db, 'lessons', active.id);
                batch.update(movedLessonRef, {
                    unitId: destinationUnitId,
                    order: newIndexInDest
                });
                
                destinationLessons.forEach((lesson, index) => {
                    if(lesson.order !== index) {
                        const lessonRef = doc(db, "lessons", lesson.id);
                        batch.update(lessonRef, { order: index });
                    }
                });

                sourceLessons.forEach((lesson, index) => {
                    if(lesson.order !== index) {
                        const lessonRef = doc(db, "lessons", lesson.id);
                        batch.update(lessonRef, { order: index });
                    }
                });
                
                await batch.commit();
            }
        }
    }

    // --- Modal Handlers ---
    const handleOpenUnitModal = (modalSetter, unit) => { setSelectedUnit(unit); modalSetter(true); };
    const handleOpenLessonModal = (modalSetter, lesson) => { setSelectedLesson(lesson); modalSetter(true); };
    const handleOpenQuizModal = (modalSetter, quiz) => { setSelectedQuiz(quiz); modalSetter(true); };
    const handleEditQuiz = (quizToEdit) => { handleOpenQuizModal(setEditQuizModalOpen, quizToEdit); };
    const handleOpenAiQuizModal = (lesson) => {
        setLessonForAiQuiz(lesson);
        setAiQuizModalOpen(true);
    };
    
    // ✅ 4. Add handler to open the AI Hub and set the selected unit
    const handleOpenAiHub = (unit) => {
        setUnitForAi(unit);
        setIsAiHubOpen(true);
    };

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {units.length > 0 ? (
                    <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                        <AccordionList>
                            {units.map((unit) => (
                                <SortableUnitItem
                                    key={unit.id}
                                    unit={unit}
                                    lessonsForUnit={lessons[unit.id] || []}
                                    quizzesForUnit={quizzes[unit.id] || []}
                                    onOpenAiHub={handleOpenAiHub} // Pass the new handler
                                    handleOpenUnitModal={handleOpenUnitModal}
                                    handleOpenLessonModal={handleOpenLessonModal}
                                    handleOpenQuizModal={handleOpenQuizModal}
                                    handleEditQuiz={handleEditQuiz}
                                    setAddLessonModalOpen={setAddLessonModalOpen}
                                    setAddQuizModalOpen={setAddQuizModalOpen}
                                    setEditUnitModalOpen={setEditUnitModalOpen}
                                    setDeleteUnitModalOpen={setDeleteUnitModalOpen}
                                    setViewLessonModalOpen={setViewLessonModalOpen}
                                    setEditLessonModalOpen={setEditLessonModalOpen}
                                    setViewQuizModalOpen={setViewQuizModalOpen}
                                    onInitiateDelete={onInitiateDelete}
                                    onOpenAiQuizModal={handleOpenAiQuizModal}
                                    isAiGenerating={isAiGenerating}
                                    subject={subject}
                                />
                            ))}
                        </AccordionList>
                    </SortableContext>
                ) : <p className="text-center text-gray-500 py-10">No units in this subject yet. Add one to get started!</p>}
            </DndContext>

            {/* ✅ 5. Render the AiGenerationHub, passing the correct unitId */}
            {isAiHubOpen && (
                <AiGenerationHub
                    isOpen={isAiHubOpen}
                    onClose={() => setIsAiHubOpen(false)}
                    unitId={unitForAi?.id}
                    subjectId={subject?.id}
                />
            )}
            
            {/* All other modals remain unchanged */}
            <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />
            <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} setIsAiGenerating={setIsAiGenerating} />
            <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} />
            <DeleteUnitModal isOpen={deleteUnitModalOpen} onClose={() => setDeleteUnitModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} />
            <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson} />
            <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson} />
            {selectedQuiz && (<EditQuizModal isOpen={editQuizModalOpen} onClose={() => setEditQuizModalOpen(false)} quiz={selectedQuiz} onEditQuiz={() => { setEditQuizModalOpen(false); }} />)}
            <ViewQuizModal isOpen={viewQuizModalOpen} onClose={() => setViewQuizModalOpen(false)} quiz={selectedQuiz} userProfile={userProfile} />
            <AiQuizModal isOpen={aiQuizModalOpen} onClose={() => setAiQuizModalOpen(false)} unitId={lessonForAiQuiz?.unitId} subjectId={subject.id} lesson={lessonForAiQuiz} />
        </>
    );
}