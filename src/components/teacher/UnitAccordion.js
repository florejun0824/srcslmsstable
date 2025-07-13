import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    ArrowPathIcon,
} from '@heroicons/react/24/solid';
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
import htmlToDocx from 'html-to-docx';
import { marked } from 'marked'; // ✨ NEW: Import a standard Markdown parser

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
import AiGenerationHub from './AiGenerationHub';


// --- SVG Conversion Helper (Unchanged) ---
const convertSvgStringToPngDataUrl = (svgString) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const fallbackWidth = 550;
            
            let width = img.width;
            let height = img.height;

            if (!width || !height) {
                const viewBoxMatch = svgString.match(/viewBox="([0-9\s.,-]+)"/);
                if (viewBoxMatch && viewBoxMatch[1]) {
                    const viewBox = viewBoxMatch[1].split(/[,\s]+/);
                    const viewBoxWidth = parseFloat(viewBox[2]);
                    const viewBoxHeight = parseFloat(viewBox[3]);
                    if (viewBoxWidth && viewBoxHeight) {
                        width = fallbackWidth;
                        height = (fallbackWidth * viewBoxHeight) / viewBoxWidth;
                    }
                }
            }
            
            if (!width || !height) {
                width = fallbackWidth;
                height = 400;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            
            if (dataUrl === 'data:,') {
                 reject(new Error("Canvas generated empty data URL."));
            } else {
                resolve({ dataUrl, width, height });
            }
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load SVG string into an image."));
        };
        img.src = url;
    });
};


// --- Menu, Content, and Draggable Components (All Unchanged) ---
const MenuPortal = ({ children, menuStyle, onClose }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
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
        <Icon className={`h-5 w-5 mr-3 ${disabled ? 'text-gray-400 animate-spin' : ''}`} />
        <span>{text}</span>
    </button>
);


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

function SortableLessonItem({ lesson, unitId, exportingLessonId, onExport, ...props }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: lesson.id,
        data: { type: 'lesson', unitId: unitId }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const isExporting = exportingLessonId === lesson.id;

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
                        <MenuItem 
                            icon={isExporting ? ArrowPathIcon : DocumentTextIcon} 
                            text={isExporting ? "Exporting..." : "Export as .docx"} 
                            onClick={() => onExport(lesson)}
                            disabled={isExporting} 
                        />
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
        data: { type: 'unit' }
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
                                        onExport={otherProps.onExport}
                                        exportingLessonId={otherProps.exportingLessonId}
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

const customSort = (a, b) => {
    const orderA = a.order;
    const orderB = b.order;
    if (orderA !== undefined && orderB === undefined) return -1;
    if (orderA === undefined && orderB !== undefined) return 1;
    if (orderA !== undefined && orderB !== undefined) {
        if (orderA !== orderB) return orderA - orderB;
    }
    const timeA = a.createdAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || 0;
    return timeA - timeB;
};


// --- Main Accordion Component ---
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating }) {
    // States are unchanged
    const [units, setUnits] = useState([]);
    const [lessons, setLessons] = useState({});
    const [quizzes, setQuizzes] = useState({});
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const isExportingRef = useRef(false);
    const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
    const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
    const [deleteUnitModalOpen, setDeleteUnitModalOpen] = useState(false);
    const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
    const [viewLessonModalOpen, setViewLessonModalOpen] = useState(false);
    const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
    const [editQuizModalOpen, setEditQuizModalOpen] = useState(false);
    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);
    const [aiQuizModalOpen, setAiQuizModalOpen] = useState(false);
    const [isAiHubOpen, setIsAiHubOpen] = useState(false);
    const [unitForAi, setUnitForAi] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [lessonForAiQuiz, setLessonForAiQuiz] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, })
    );

    // ✨ --- FINAL, ROBUST DOCX Export Handler with Editable Text & Correct Formatting ---
    const handleExportDocx = async (lesson) => {
        if (isExportingRef.current) return;
        
        isExportingRef.current = true;
        setExportingLessonId(lesson.id);

        try {
            let finalHtml = `<h1>${lesson.title}</h1>`;

            for (const page of lesson.pages) {
                const cleanTitle = page.title.replace(/^page\s*\d+\s*[:-]?\s*/i, '');
                
                // 1. Convert the page's Markdown content to structured HTML
                const rawHtml = marked.parse(page.content || '');
                
                finalHtml += `<h2>${cleanTitle}</h2>` + rawHtml;
            }

            // 2. Create a temporary DOM element to process the full HTML string
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = finalHtml;

            // 3. Find and replace all SVGs with Base64 PNGs
            const svgElements = tempDiv.querySelectorAll('svg');
            const conversionPromises = Array.from(svgElements).map(async (svg) => {
                try {
                    const svgString = svg.outerHTML;
                    const result = await convertSvgStringToPngDataUrl(svgString);
                    const img = document.createElement('img');
                    img.src = result.dataUrl;
                    img.width = result.width;
                    img.height = result.height;
                    // Apply styles for better Word rendering
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    
                    svg.parentNode.replaceChild(img, svg);
                } catch (err) {
                    console.error("Could not convert one of the SVGs:", err);
                    const errorMsg = document.createElement('p');
                    errorMsg.style.color = 'red';
                    errorMsg.innerText = '[Failed to render diagram]';
                    svg.parentNode.replaceChild(errorMsg, svg);
                }
            });

            await Promise.all(conversionPromises);

            // 4. Generate the DOCX from the final, cleaned-up HTML
            const fileBlob = await htmlToDocx(tempDiv.innerHTML, null, {
                table: { row: { cantSplit: true } },
                footer: true,
                pageNumber: true,
            });

            // 5. Trigger the download
            const blobUrl = URL.createObjectURL(fileBlob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${lesson.title}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);

        } catch (error) {
            console.error("Failed to export DOCX:", error);
            alert("An error occurred while creating the Word document.");
        } finally {
            isExportingRef.current = false; 
            setExportingLessonId(null); 
        }
    };

    // All other useEffect and handler hooks remain the same
    useEffect(() => {
        if (!subject?.id) { setUnits([]); return; }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id));
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
            const lessonQuery = query(collection(db, 'lessons'), where('unitId', '==', unit.id));
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
        // ... (drag and drop logic is unchanged)
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
            if(overType === 'unit') destinationUnitId = over.id;
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
            } else {
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
                batch.update(movedLessonRef, { unitId: destinationUnitId, order: newIndexInDest });
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

    // Modal handlers are unchanged
    const handleOpenUnitModal = (modalSetter, unit) => { setSelectedUnit(unit); modalSetter(true); };
    const handleOpenLessonModal = (modalSetter, lesson) => { setSelectedLesson(lesson); modalSetter(true); };
    const handleOpenQuizModal = (modalSetter, quiz) => { setSelectedQuiz(quiz); modalSetter(true); };
    const handleEditQuiz = (quizToEdit) => { handleOpenQuizModal(setEditQuizModalOpen, quizToEdit); };
    const handleOpenAiQuizModal = (lesson) => {
        setLessonForAiQuiz(lesson);
        setAiQuizModalOpen(true);
    };
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
                                    onOpenAiHub={handleOpenAiHub}
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
                                    onExport={handleExportDocx}
                                    exportingLessonId={exportingLessonId}
                                />
                            ))}
                        </AccordionList>
                    </SortableContext>
                ) : <p className="text-center text-gray-500 py-10">No units in this subject yet. Add one to get started!</p>}
            </DndContext>

            {isAiHubOpen && (
                <AiGenerationHub
                    isOpen={isAiHubOpen}
                    onClose={() => setIsAiHubOpen(false)}
                    unitId={unitForAi?.id}
                    subjectId={subject?.id}
                />
            )}
            
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