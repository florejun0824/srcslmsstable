import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    SparklesIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    EyeIcon,
    Bars3Icon,
    ArrowPathIcon,
    BookOpenIcon,
    RectangleStackIcon,
    QueueListIcon,
    ArrowUturnLeftIcon,
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
import { marked } from 'marked';
import { useToast } from '../../contexts/ToastContext';
import htmlToDocx from 'html-to-docx';

// --- Component Imports ---
import AddLessonModal from './AddLessonModal';
import AddQuizModal from './AddQuizModal';
import DeleteUnitModal from './DeleteUnitModal';
import EditLessonModal from './EditLessonModal';
import ViewLessonModal from './ViewLessonModal';
import EditUnitModal from './EditUnitModal';
import EditQuizModal from './EditQuizModal';
import ViewQuizModal from './ViewQuizModal';
import AiQuizModal from './AiQuizModal';
import AiGenerationHub from './AiGenerationHub';
import Spinner from '../common/Spinner';

// --- Helper Functions & Sub-components ---
const convertSvgStringToPngDataUrl = (svgString) => {
    return new Promise((resolve, reject) => {
        let correctedSvgString = svgString;

        if (!correctedSvgString.includes('xmlns=')) {
            correctedSvgString = correctedSvgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const defaultStyles = `
            <style>
                .center-node { fill: #cce5ff; stroke: #007bff; stroke-width: 2; }
                .node { fill: #e7f5ff; stroke: #007bff; stroke-width: 1.5; }
                text, .label, .center-node text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; font-size: 14px; text-anchor: middle; fill: #333; }
                .arrow { stroke: #555; stroke-width: 2px; marker-end: url(#arrowhead); }
            </style>
        `;
        if (correctedSvgString.includes('</defs>')) {
             correctedSvgString = correctedSvgString.replace('</defs>', `</defs>${defaultStyles}`);
        } else {
             correctedSvgString = correctedSvgString.replace('>', `>${defaultStyles}`);
        }
        
        const img = new Image();
        const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(correctedSvgString)}`;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const fallbackWidth = 600; 
            let { width, height } = img;

            if (!width || !height) {
                const viewBoxMatch = correctedSvgString.match(/viewBox="([0-9\s.,-]+)"/);
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
                height = 450;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            
            if (dataUrl === 'data:,') {
                 reject(new Error("Canvas generated an empty data URL, the SVG might be invalid."));
            } else {
                resolve({ dataUrl, width, height });
            }
        };

        img.onerror = () => {
            reject(new Error("Failed to load the SVG string into an image. It might be malformed."));
        };
        
        img.src = dataUri;
    });
};

const MenuPortal = ({ children, menuStyle, onClose }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    return createPortal(<div ref={menuRef} style={menuStyle} className="fixed bg-white rounded-md shadow-lg z-[5000] border"><div className="py-1" onClick={onClose}>{children}</div></div>, document.body);
};

const ActionMenu = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const iconRef = useRef(null);
    const handleToggle = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
        if (!isOpen) {
            const iconRect = iconRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - iconRect.bottom;
            const menuHeight = 200;
            const style = { right: `${window.innerWidth - iconRect.right}px`, width: '240px' };
            if (spaceBelow < menuHeight) { style.bottom = `${window.innerHeight - iconRect.top}px`; } else { style.top = `${iconRect.bottom}px`; }
            setMenuStyle(style);
        }
    };
    return (
        <>
            <div role="button" tabIndex={0} ref={iconRef} onClick={handleToggle} onPointerDown={(e) => e.stopPropagation()} className="p-1.5 text-gray-500 hover:text-gray-900 rounded-full cursor-pointer hover:bg-gray-100">
                <Bars3Icon className="h-5 w-5" />
            </div>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>{children}</MenuPortal>}
        </>
    );
};

const MenuItem = ({ icon: Icon, text, onClick, disabled = false }) => ( <button onClick={onClick} disabled={disabled} className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"> <Icon className={`h-5 w-5 mr-3 ${disabled ? 'text-gray-400 animate-spin' : ''}`} /> <span>{text}</span> </button> );
const ColumnHeader = ({ title, icon: Icon, onAdd }) => ( <div className="flex justify-between items-center mb-4"> <div className="flex items-center gap-2"> <Icon className="w-5 h-5 text-gray-500" /> <h3 className="font-semibold text-gray-800">{title}</h3> </div> <button onClick={onAdd} className="flex items-center justify-center w-7 h-7 bg-gray-200 text-gray-600 rounded-full hover:bg-blue-500 hover:text-white transition-all" title={`Add New ${title.slice(0, -1)}`}> <PlusIcon className="w-4 h-4" /> </button> </div> );

function SortableQuizItem({ quiz, unitId, onEdit, onDelete, onView }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: quiz.id,
        data: { type: 'quiz', unitId: unitId }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center group mb-2 touch-none">
            <div className="flex items-center gap-3">
                <button {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
                    <Bars3Icon className="h-5 w-5" />
                </button>
                <ClipboardDocumentListIcon className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <p className="text-sm text-gray-800 font-medium">{quiz.title}</p>
            </div>
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
}

function SortableLessonItem({ lesson, unitId, exportingLessonId, onExport, onExportUlpPdf, onExportAtgPdf, ...props }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id, data: { type: 'lesson', unitId: unitId } });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const isExporting = exportingLessonId === lesson.id;
    const isUlp = lesson.title.includes('Unit Learning Plan');
    const isAtg = lesson.title.includes('Adaptive Teaching Guide');
    return ( <div ref={setNodeRef} style={style} {...attributes} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center group mb-2 touch-none"> <div className="flex items-center gap-3"> <button {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600"><Bars3Icon className="h-5 w-5" /></button> <DocumentTextIcon className="w-5 h-5 text-blue-500 flex-shrink-0" /> <p className="text-sm text-gray-800 font-medium">{lesson.title}</p> </div> <div className="flex items-center gap-1"> <button onClick={props.onView} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full" title="View Lesson"><EyeIcon className="h-5 w-5" /></button> <ActionMenu> <MenuItem icon={PencilIcon} text="Edit Lesson" onClick={props.onEdit} /> {isUlp ? ( <MenuItem icon={isExporting ? ArrowPathIcon : DocumentTextIcon} text={isExporting ? "Exporting..." : "Export as PDF"} onClick={() => onExportUlpPdf(lesson)} disabled={isExporting} /> ) : isAtg ? ( <MenuItem icon={isExporting ? ArrowPathIcon : DocumentTextIcon} text={isExporting ? "Exporting..." : "Export as PDF"} onClick={() => onExportAtgPdf(lesson)} disabled={isExporting} /> ) : ( <MenuItem icon={isExporting ? ArrowPathIcon : DocumentTextIcon} text={isExporting ? "Exporting..." : "Export as .docx"} onClick={() => onExport(lesson)} disabled={isExporting} /> )} <MenuItem icon={SparklesIcon} text="AI Generate Quiz" onClick={props.onGenerateQuiz} disabled={props.isAiGenerating} /> <MenuItem icon={TrashIcon} text="Delete Lesson" onClick={props.onDelete} /> </ActionMenu> </div> </div> );
}

function SortableUnitCard(props) {
    const { unit, onSelect, onEdit, onDelete, onOpenAiHub, visuals } = props;
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: unit.id,
        data: { type: 'unit' }
    });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const { icon: Icon, color } = visuals;
    return (
        <div ref={setNodeRef} style={style} {...attributes} className="touch-none">
            <div onClick={() => onSelect(unit)} className={`group relative p-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full bg-gradient-to-br ${color}`}>
                <button {...listeners} className="absolute top-3 left-3 p-1.5 text-white/50 hover:text-white cursor-grab opacity-50 group-hover:opacity-100 transition-opacity" title="Drag to reorder"><Bars3Icon className="h-5 w-5" /></button>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onOpenAiHub(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white" title="AI Tools for this unit"><SparklesIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white" title="Edit Unit"><PencilIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white" title="Delete Unit"><TrashIcon className="w-5 h-5" /></button>
                </div>
                <div className="relative z-10">
                    <div className="mb-4 p-3 bg-white/20 rounded-lg inline-block"><Icon className="w-8 h-8 text-white" /></div>
                    <h2 className="text-xl font-bold text-white truncate">{unit.title}</h2>
                </div>
                <p className="relative z-10 text-white/80 text-sm mt-2">Select to view content</p>
            </div>
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

export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit }) {
    const [units, setUnits] = useState([]);
    const [lessons, setLessons] = useState({});
    const [quizzes, setQuizzes] = useState({});
    const [exportingLessonId, setExportingLessonId] = useState(null);
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
    const { showToast } = useToast();
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, }));
    const isExportingRef = useRef(false);

    useEffect(() => {
        if (!subject?.id) { 
            setUnits([]); 
            return; 
        }
        if (onSetActiveUnit) {
            onSetActiveUnit(null);
        }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUnits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedUnits.sort(customSort);
            setUnits(fetchedUnits);
        }, (error) => console.error("Error fetching units: ", error));
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
                const fetchedQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedQuizzes.sort(customSort);
                setQuizzes(prev => ({ ...prev, [unit.id]: fetchedQuizzes }));
            });
            unsubscribers.push(unsubQuizzes);
        });
        return () => unsubscribers.forEach(unsub => unsub());
    }, [units]);

    const handleOpenUnitModal = (modalSetter, unit) => { setSelectedUnit(unit); modalSetter(true); };
    const handleOpenLessonModal = (modalSetter, lesson) => { setSelectedLesson(lesson); modalSetter(true); };
    const handleOpenQuizModal = (modalSetter, quiz) => { setSelectedQuiz(quiz); modalSetter(true); };
    const handleEditQuiz = (quizToEdit) => { handleOpenQuizModal(setEditQuizModalOpen, quizToEdit); };
    const handleOpenAiQuizModal = (lesson) => { setLessonForAiQuiz(lesson); setAiQuizModalOpen(true); };
    const handleOpenAiHub = (unit) => { setUnitForAi(unit); setIsAiHubOpen(true); };

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
	        } else {
	            const sourceLessons = [...lessons[sourceUnitId]];
	            const destinationLessons = lessons[destinationUnitId] ? [...lessons[destinationUnitId]] : [];
	            const activeIndex = sourceLessons.findIndex(l => l.id === active.id);
	            const [movedLesson] = sourceLessons.splice(activeIndex, 1);
	            const overIndex = destinationLessons.findIndex(l => l.id === over.id);
	            const newIndexInDest = overIndex >= 0 ? overIndex : destinationLessons.length;
	            destinationLessons.splice(newIndexInDest, 0, movedLesson);
	            setLessons(prev => ({ ...prev, [sourceUnitId]: sourceLessons, [destinationUnitId]: destinationLessons }));
	            const batch = writeBatch(db);
	            const movedLessonRef = doc(db, 'lessons', active.id);
	            batch.update(movedLessonRef, { unitId: destinationUnitId, order: newIndexInDest });
	            destinationLessons.forEach((lesson, index) => {
	                if (lesson.order !== index) { const lessonRef = doc(db, "lessons", lesson.id); batch.update(lessonRef, { order: index }); }
	            });
	            sourceLessons.forEach((lesson, index) => {
	                if (lesson.order !== index) { const lessonRef = doc(db, "lessons", lesson.id); batch.update(lessonRef, { order: index }); }
	            });
	            await batch.commit();
	        }
	    }
        
        if (activeType === 'quiz') {
            const sourceUnitId = active.data.current.unitId;
            const destinationUnitId = over.data.current?.unitId;
            if (sourceUnitId === destinationUnitId) {
                const currentQuizzes = quizzes[sourceUnitId];
                const oldIndex = currentQuizzes.findIndex(q => q.id === active.id);
                const newIndex = currentQuizzes.findIndex(q => q.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const reorderedQuizzes = arrayMove(currentQuizzes, oldIndex, newIndex);
                    setQuizzes(prev => ({ ...prev, [sourceUnitId]: reorderedQuizzes }));
                    const batch = writeBatch(db);
                    reorderedQuizzes.forEach((quiz, index) => {
                        const quizRef = doc(db, 'quizzes', quiz.id);
                        batch.update(quizRef, { order: index });
                    });
                    await batch.commit();
                }
            }
        }
	}

	const handleExportDocx = async (lesson) => {
	    if (isExportingRef.current) return;
	    isExportingRef.current = true;
	    setExportingLessonId(lesson.id);
	    showToast("Generating .docx file...", "info");
	    try {
	        let finalHtml = `<h1>${lesson.title}</h1>`;
	        for (const page of lesson.pages) {
	            const cleanTitle = page.title.replace(/^page\s*\d+\s*[:-]?\s*/i, '');
	            const rawHtml = marked.parse(page.content || '');
	            finalHtml += `<h2>${cleanTitle}</h2>` + rawHtml;
	        }
	        const tempDiv = document.createElement('div');
	        tempDiv.innerHTML = finalHtml;
	        const svgElements = tempDiv.querySelectorAll('svg');
	        const conversionPromises = Array.from(svgElements).map(async (svg) => {
	            try {
	                const svgString = svg.outerHTML;
	                const result = await convertSvgStringToPngDataUrl(svgString);
	                const img = document.createElement('img');
	                img.src = result.dataUrl;
	                img.width = result.width;
	                img.height = result.height;
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
	        const fileBlob = await htmlToDocx(tempDiv.innerHTML, null, { table: { row: { cantSplit: true } }, footer: true, pageNumber: true });
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
	        showToast("An error occurred while creating the Word document.", "error");
	    } finally {
	        isExportingRef.current = false;
	        setExportingLessonId(null);
	    }
	};
    
	const handleExportUlpAsPdf = (lesson) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lesson.id);
	    showToast("Preparing PDF for printing...", "info");
	    let htmlContent = lesson.pages[0]?.content || '<h1>No Content</h1>';
	    htmlContent = htmlContent.replace(/<thead[\s\S]*?<\/thead>/i, '');
	    const tableFooter = "<tfoot><tr><td colspan='2' style='border-top: 1px solid #ccc; padding: 0 !important; height: 1px !important; line-height: 0 !important;'>&nbsp;</td></tr></tfoot>";
	    htmlContent = htmlContent.replace('</table>', tableFooter + '</table>');
	    const title = lesson.title;
	    const printWindow = window.open('', '_blank');
	    if (!printWindow) { showToast("Could not open a new window. Please disable your pop-up blocker.", "error"); setExportingLessonId(null); return; }
	    printWindow.document.write(`<html><head><title>${title}</title><style>@media print{@page{size: 8.5in 13in;margin: 1in;}body{margin:0;font-family:sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}table{width:100%;border-collapse:collapse;font-size:9pt;}td,th{border:1px solid #ccc;padding:6px;text-align:left;}tfoot{display:table-footer-group;}}</style></head><body>${htmlContent}</body></html>`);
	    printWindow.document.close();
	    setTimeout(() => { printWindow.focus(); printWindow.print(); setExportingLessonId(null); }, 500);
	};
    
	const handleExportAtgPdf = (lesson) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lesson.id);
	    showToast("Preparing PDF for printing...", "info");
	    let finalHtml = `<h1>${lesson.title}</h1>`;
	    for (const page of lesson.pages) {
	        const cleanTitle = page.title.replace(/^page\s*\d+\s*[:-]?\s*/i, '');
	        const rawHtml = marked.parse(page.content || '');
	        finalHtml += `<h2>${cleanTitle}</h2>` + rawHtml;
	    }
	    const printWindow = window.open('', '_blank');
	    if (!printWindow) { showToast("Could not open a new window. Please disable your pop-up blocker.", "error"); setExportingLessonId(null); return; }
	    printWindow.document.write(`<html><head><title>${lesson.title}</title><style>@media print{@page{size: 8.5in 13in;margin: 1in;}body{margin:0;font-family:sans-serif;}h1,h2,h3{page-break-after:avoid;}ul,p{page-break-inside:avoid;}}</style></head><body>${finalHtml}</body></html>`);
	    printWindow.document.close();
	    setTimeout(() => { printWindow.focus(); printWindow.print(); setExportingLessonId(null); }, 500);
	};

    const unitVisuals = [
        { icon: RectangleStackIcon, color: 'from-blue-500 to-sky-500' },
        { icon: BookOpenIcon, color: 'from-green-500 to-emerald-500' },
        { icon: QueueListIcon, color: 'from-purple-500 to-violet-500' },
    ];

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    (() => {
                        const lessonsForActiveUnit = lessons[activeUnit.id];
                        const quizzesForActiveUnit = quizzes[activeUnit.id];
                        if (!lessonsForActiveUnit || !quizzesForActiveUnit) {
                            return <div className="w-full flex justify-center items-center p-20"><Spinner /></div>;
                        }
                        return (
                            <div>
                                <button onClick={() => onSetActiveUnit(null)} className="flex items-center gap-2 mb-4 font-semibold text-gray-600 hover:text-gray-900">
                                    <ArrowUturnLeftIcon className="w-4 h-4" />Back to All Units
                                </button>
                                <div className="bg-slate-50 p-4 md:p-6 rounded-xl border">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                                            <ColumnHeader title="Lessons" icon={DocumentTextIcon} onAdd={() => handleOpenUnitModal(setAddLessonModalOpen, activeUnit)} />
                                            <SortableContext items={lessonsForActiveUnit.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                                {lessonsForActiveUnit.length > 0 ? (
                                                    lessonsForActiveUnit.map(lesson => 
                                                        <SortableLessonItem 
                                                            key={lesson.id} 
                                                            lesson={lesson} 
                                                            unitId={activeUnit.id} 
                                                            onView={() => handleOpenLessonModal(setViewLessonModalOpen, lesson)} 
                                                            onEdit={() => handleOpenLessonModal(setEditLessonModalOpen, lesson)} 
                                                            onDelete={() => onInitiateDelete('lesson', lesson.id)} 
                                                            onGenerateQuiz={() => handleOpenAiQuizModal(lesson)} 
                                                            isAiGenerating={isAiGenerating} 
                                                            onExport={handleExportDocx} 
                                                            onExportUlpPdf={handleExportUlpAsPdf} 
                                                            onExportAtgPdf={handleExportAtgPdf} 
                                                            exportingLessonId={exportingLessonId} 
                                                        />
                                                    )
                                                ) : (
                                                    <p className="text-sm text-center text-gray-500 p-4">No lessons yet.</p>
                                                )}
                                            </SortableContext>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                                            <ColumnHeader title="Quizzes" icon={ClipboardDocumentListIcon} onAdd={() => handleOpenUnitModal(setAddQuizModalOpen, activeUnit)} />
                                            <SortableContext items={quizzesForActiveUnit.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                                <div className="space-y-2">
                                                    {quizzesForActiveUnit.length > 0 ? (
                                                        quizzesForActiveUnit.map(quiz => 
                                                            <SortableQuizItem
                                                                key={quiz.id}
                                                                quiz={quiz}
                                                                unitId={activeUnit.id}
                                                                onEdit={() => handleEditQuiz(quiz)}
                                                                onDelete={() => onInitiateDelete('quiz', quiz.id, quiz.lessonId)}
                                                                onView={() => handleOpenQuizModal(setViewQuizModalOpen, quiz)}
                                                            />
                                                        )
                                                    ) : (
                                                        <p className="text-sm text-center text-gray-500 p-4">No quizzes yet.</p>
                                                    )}
                                                </div>
                                            </SortableContext>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    units.length > 0 ? (
                        <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {units.map((unit, index) => (
                                    <SortableUnitCard 
                                        key={unit.id} 
                                        unit={unit} 
                                        onSelect={onSetActiveUnit} 
                                        onEdit={(unitToEdit) => handleOpenUnitModal(setEditUnitModalOpen, unitToEdit)} 
                                        onDelete={(unitToDelete) => handleOpenUnitModal(setDeleteUnitModalOpen, unitToDelete)} 
                                        onOpenAiHub={handleOpenAiHub} 
                                        visuals={unitVisuals[index % unitVisuals.length]} 
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    ) : (
                        <p className="text-center text-gray-500 py-10">No units in this subject yet. Add one to get started!</p>
                    )
                )}
            </DndContext>

            <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} unitId={unitForAi?.id} subjectId={subject?.id} />
            <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />
            <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject?.id} setIsAiGenerating={setIsAiGenerating} />
            <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject?.id} />
            <DeleteUnitModal isOpen={deleteUnitModalOpen} onClose={() => setDeleteUnitModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject?.id} />
            <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson} />
            <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson} />
            {selectedQuiz && (<EditQuizModal isOpen={editQuizModalOpen} onClose={() => setEditQuizModalOpen(false)} quiz={selectedQuiz} onEditQuiz={() => { setEditQuizModalOpen(false); }} />)}
            <ViewQuizModal isOpen={viewQuizModalOpen} onClose={() => setViewQuizModalOpen(false)} quiz={selectedQuiz} userProfile={userProfile} />
            <AiQuizModal isOpen={aiQuizModalOpen} onClose={() => setAiQuizModalOpen(false)} unitId={lessonForAiQuiz?.unitId} subjectId={lessonForAiQuiz?.subjectId} lesson={lessonForAiQuiz} />
        </>
    );
}