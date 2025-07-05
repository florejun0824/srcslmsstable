// Updated UnitAccordion.js with PDF export functionality
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Accordion, AccordionBody, AccordionHeader, AccordionList, Button, Card } from '@tremor/react';
import {
    PlusCircleIcon,
    TrashIcon,
    PencilIcon,
    SparklesIcon,
    DocumentTextIcon,
    EyeIcon
} from '@heroicons/react/24/solid';
// Note: PizZip and Docxtemplater are no longer needed for PDF export

import AddLessonModal from './AddLessonModal';
import AddQuizModal from './AddQuizModal';
import DeleteUnitModal from './DeleteUnitModal';
import EditLessonModal from './EditLessonModal';
import ViewLessonModal from './ViewLessonModal';
import EditUnitModal from './EditUnitModal';
import EditQuizModal from './EditQuizModal';
import ViewQuizModal from './ViewQuizModal';
import CreateAiLessonModal from './CreateAiLessonModal';
import AiQuizModal from './AiQuizModal';

// ✅ NEW FUNCTION: This now generates a valid PDF file.
const exportLessonToPdf = (lesson) => {
    // Dynamically load the required libraries
    const jspdfScript = document.createElement('script');
    jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.body.appendChild(jspdfScript);

    const html2canvasScript = document.createElement('script');
    html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.body.appendChild(html2canvasScript);

    jspdfScript.onload = () => {
        html2canvasScript.onload = () => {
            const { jsPDF } = window.jspdf;
            
            // 1. Create a hidden element to render the lesson content for PDF generation.
            const report = document.createElement('div');
            report.style.width = '210mm'; // A4 width
            report.style.padding = '20mm';
            report.style.position = 'absolute';
            report.style.left = '-9999px'; // Position off-screen
            report.style.fontFamily = 'Arial, sans-serif';
            
            let html = `<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${lesson.title}</h1>`;
            lesson.pages.forEach(page => {
                html += `<h2 style="font-size: 18px; font-weight: bold; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">${page.title}</h2>`;
                // Replace newlines with <br> tags for proper line breaks in HTML
                const contentWithBreaks = page.content.replace(/\n/g, '<br>');
                html += `<div style="font-size: 12px; line-height: 1.6;">${contentWithBreaks}</div>`;
            });
            report.innerHTML = html;
            document.body.appendChild(report);

            // 2. Use html2canvas to capture the content as an image
            window.html2canvas(report, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;
                const imgWidth = pdfWidth - 40; // A4 width with margins
                const imgHeight = imgWidth / ratio;
                
                let heightLeft = imgHeight;
                let position = 20; // Top margin

                pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 40);

                // Add new pages if content overflows
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                    heightLeft -= (pdfHeight - 40);
                }

                // 3. Save the PDF
                pdf.save(`${lesson.title}.pdf`);
                
                // 4. Clean up the temporary elements
                document.body.removeChild(report);
                document.body.removeChild(jspdfScript);
                document.body.removeChild(html2canvasScript);
            });
        };
    };
};


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

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            style={menuStyle}
            className="fixed bg-white rounded-md shadow-lg z-[5000] border"
        >
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
            const menuHeight = 120; 

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
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>
                    {children}
                </MenuPortal>
            )}
        </>
    );
};


const MenuItem = ({ icon: Icon, text, onClick, disabled = false }) => (
    <button onClick={onClick} disabled={disabled} className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon className={`h-5 w-5 mr-3 ${disabled ? 'text-gray-400' : ''}`} />
        <span>{text}</span>
    </button>
);

const LessonItem = ({ lesson, onEdit, onView, onDelete, onGenerateQuiz, isAiGenerating }) => (
    <div className="p-2 border-b border-gray-200 flex justify-between items-center last:border-b-0 group">
        <p className="text-sm text-gray-700">{lesson.title}</p>
        <div className="flex items-center gap-1">
            <button onClick={onView} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full" title="View Lesson">
                <EyeIcon className="h-5 w-5" />
            </button>
            <ActionMenu>
                <MenuItem icon={PencilIcon} text="Edit Lesson" onClick={onEdit} />
                {/* ✅ CORRECTION: Changed to call the PDF export function */}
                <MenuItem icon={DocumentTextIcon} text="Export as .pdf" onClick={() => exportLessonToPdf(lesson)} />
                <MenuItem icon={SparklesIcon} text="AI Generate Quiz" onClick={onGenerateQuiz} disabled={isAiGenerating} />
                <MenuItem icon={TrashIcon} text="Delete Lesson" onClick={onDelete} />
            </ActionMenu>
        </div>
    </div>
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

export default function UnitAccordion({ subject, onInitiateDelete, userProfile, onGenerateQuiz, isAiGenerating }) {
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
    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);
    const [createAiLessonModalOpen, setCreateAiLessonModalOpen] = useState(false);
    const [aiQuizModalOpen, setAiQuizModalOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    useEffect(() => {
        if (!subject?.id) { setUnits([]); return; }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => { console.error("Error fetching units: ", error); });
        return () => unsubscribe();
    }, [subject?.id]);

    useEffect(() => {
        if (units.length === 0) { setLessons({}); setQuizzes({}); return; }
        const unsubscribers = [];
        units.forEach(unit => {
            const lessonQuery = query(collection(db, 'lessons'), where('unitId', '==', unit.id), orderBy('createdAt', 'asc'));
            const unsubLessons = onSnapshot(lessonQuery, snapshot => {
                setLessons(prev => ({ ...prev, [unit.id]: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
            });
            unsubscribers.push(unsubLessons);
            const quizQuery = query(collection(db, 'quizzes'), where('unitId', '==', unit.id), orderBy('createdAt', 'asc'));
            const unsubQuizzes = onSnapshot(quizQuery, snapshot => {
                setQuizzes(prev => ({ ...prev, [unit.id]: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
            });
            unsubscribers.push(unsubQuizzes);
        });
        return () => unsubscribers.forEach(unsub => unsub());
    }, [units]);

    const handleOpenUnitModal = (modalSetter, unit) => { setSelectedUnit(unit); modalSetter(true); };
    const handleOpenLessonModal = (modalSetter, lesson) => { setSelectedLesson(lesson); modalSetter(true); };
    const handleOpenQuizModal = (modalSetter, quiz) => { setSelectedQuiz(quiz); modalSetter(true); };
    const handleEditQuiz = (quizToEdit) => { handleOpenQuizModal(setEditQuizModalOpen, quizToEdit); };

    return (
        <div>
            {units.length > 0 ? (
                <AccordionList>
                    {units.map((unit) => (
                        <Accordion key={unit.id}>
                            <AccordionHeader>
                                <div className="flex justify-between w-full items-center">
                                    <span className="font-semibold">{unit.title}</span>
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedUnit(unit);
                                            setCreateAiLessonModalOpen(true);
                                        }}
                                        className="flex items-center px-2 py-1 rounded-md text-sm text-purple-600 hover:bg-purple-100 cursor-pointer"
                                    >
                                        <SparklesIcon className="h-4 w-4 mr-1" />
                                        AI Lesson Planner
                                    </div>
                                </div>
                            </AccordionHeader>
                            <AccordionBody>
                                <div className="flex items-center gap-2 mb-4 p-2 border-b">
                                    <Button size="xs" icon={PlusCircleIcon} onClick={() => handleOpenUnitModal(setAddLessonModalOpen, unit)}>Add Lesson</Button>
                                    <Button size="xs" icon={PlusCircleIcon} onClick={() => handleOpenUnitModal(setAddQuizModalOpen, unit)}>Add Quiz</Button>
                                    <Button size="xs" icon={PencilIcon} variant="secondary" onClick={() => handleOpenUnitModal(setEditUnitModalOpen, unit)}>Edit Unit</Button>
                                    <Button size="xs" icon={TrashIcon} color="red" onClick={() => handleOpenUnitModal(setDeleteUnitModalOpen, unit)}>Delete Unit</Button>
                                </div>
                                <div className="border rounded-lg p-4 bg-white shadow-sm">
                                    <h3 className="font-semibold text-gray-700 mb-2">Lessons</h3>
                                    {(lessons[unit.id] || []).length > 0 ? (
                                        (lessons[unit.id] || []).map(lesson =>
                                            <LessonItem
                                                key={lesson.id}
                                                lesson={lesson}
                                                onView={() => handleOpenLessonModal(setViewLessonModalOpen, lesson)}
                                                onEdit={() => handleOpenLessonModal(setEditLessonModalOpen, lesson)}
                                                onDelete={() => onInitiateDelete('lesson', lesson.id, unit.id, subject.id)}
                                                onGenerateQuiz={() => {
                                                    setSelectedLesson(lesson);
                                                    setAiQuizModalOpen(true);
                                                }}
                                                isAiGenerating={isAiGenerating}
                                            />
                                        )
                                    ) : <p className="text-sm text-gray-500 p-2">No lessons in this unit yet.</p>}
                                </div>
                                <div className="border rounded-lg p-4 bg-white shadow-sm mt-4">
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
                                </div>
                            </AccordionBody>
                        </Accordion>
                    ))}
                </AccordionList>
            ) : <p className="text-center text-gray-500 py-10">No units in this subject yet. Add one to get started!</p>}

            <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />
            <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} />
            <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} />
            <DeleteUnitModal isOpen={deleteUnitModalOpen} onClose={() => setDeleteUnitModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id}/>
            <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson}/>
            <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson}/>
            {selectedQuiz && (<EditQuizModal isOpen={editQuizModalOpen} onClose={() => setEditQuizModalOpen(false)} quiz={selectedQuiz} onEditQuiz={() => {setEditQuizModalOpen(false);}}/>) }
            <ViewQuizModal isOpen={viewQuizModalOpen} onClose={() => setViewQuizModalOpen(false)} quiz={selectedQuiz} userProfile={userProfile}/>
            <CreateAiLessonModal isOpen={createAiLessonModalOpen} onClose={() => setCreateAiLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject.id} />
            <AiQuizModal 
                isOpen={aiQuizModalOpen} 
                onClose={() => setAiQuizModalOpen(false)} 
                unitId={selectedLesson?.unitId} 
                subjectId={subject.id} 
                lesson={selectedLesson} 
            />
        </div>
    );
}
