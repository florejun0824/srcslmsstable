import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    BookOpenIcon,
    RectangleStackIcon,
    QueueListIcon,
    ArrowUturnLeftIcon,
    ArrowsUpDownIcon,
    EllipsisVerticalIcon,
    CheckCircleIcon,
    CloudArrowUpIcon,
    ChevronDownIcon,
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
        const defaultStyles = `<style>.center-node { fill: #cce5ff; stroke: #007bff; stroke-width: 2; } .node { fill: #e7f5ff; stroke: #007bff; stroke-width: 1.5; } text, .label, .center-node text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; font-size: 14px; text-anchor: middle; fill: #333; } .arrow { stroke: #555; stroke-width: 2px; marker-end: url(#arrowhead); }</style>`;
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
            if (!width || !height) { width = fallbackWidth; height = 450; }
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
        img.onerror = () => reject(new Error("Failed to load the SVG string into an image. It might be malformed."));
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
            <div role="button" tabIndex={0} ref={iconRef} onClick={handleToggle} onPointerDown={(e) => e.stopPropagation()} className="p-2 text-gray-500 hover:text-gray-900 rounded-full cursor-pointer hover:bg-gray-200/60">
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>{children}</MenuPortal>}
        </>
    );
};

const MenuItem = ({ icon: Icon, text, onClick, disabled = false, loading = false }) => (
    <button onClick={onClick} disabled={disabled || loading} className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon className={`h-5 w-5 mr-3 ${loading ? 'animate-spin' : ''}`} />
        <span>{text}</span>
    </button>
);

const AddContentDropdown = ({ onAddLesson, onAddQuiz }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-center bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New
                <ChevronDownIcon className={`w-5 h-5 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border py-1">
                    <button onClick={() => { onAddLesson(); setIsOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"><DocumentTextIcon className="w-5 h-5 mr-3 text-blue-500" />Lesson</button>
                    <button onClick={() => { onAddQuiz(); setIsOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"><ClipboardDocumentListIcon className="w-5 h-5 mr-3 text-purple-500" />Quiz</button>
                </div>
            )}
        </div>
    );
};

/**
 * NEW: iOS 18 inspired "pill" component for lessons and quizzes.
 * Each item is a distinct, floating card with enhanced styling and interactivity.
 */
function SortableContentItem({ item, exportingLessonId, selectedLessons, onLessonSelect, isAiGenerating, ...props }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id,
        data: { type: item.type, unitId: item.unitId }
    });
    const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 250ms ease' };
    
    const isLesson = item.type === 'lesson';
    const isSelected = isLesson && selectedLessons.has(item.id);
    const isExporting = isLesson && exportingLessonId === item.id;
    const title = item.lessonTitle || item.title || 'Untitled';
    const isUlp = isLesson && title.includes('Unit Learning Plan');
    const isAtg = isLesson && title.includes('Adaptive Teaching Guide');

    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;
    const itemTypeLabel = isLesson ? "Lesson" : "Quiz";
    const iconGradient = isLesson 
        ? 'from-blue-500 to-cyan-400' 
        : 'from-purple-500 to-violet-500';
    const selectionRingColor = isLesson ? 'ring-blue-500' : 'ring-purple-500';

    const itemClasses = `
        w-full group flex items-center p-4 bg-white/60 backdrop-blur-sm
        rounded-2xl shadow-lg ring-1 ring-black/5
        transition-all duration-300 touch-none relative
        hover:scale-[1.02] active:scale-[0.98]
        ${isSelected ? `ring-2 ${selectionRingColor}` : 'shadow-md'}
    `;

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="mb-3"> {/* Added margin-bottom for separation */}
            <div className={itemClasses}>
                {/* Drag Handle */}
                <button {...listeners} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 cursor-grab flex-shrink-0" title="Drag to reorder">
                    <Bars3Icon className="w-5 h-5" />
                </button>

                {/* Gradient Icon */}
                <div className={`ml-3 mr-4 p-3 rounded-xl flex-shrink-0 bg-gradient-to-br text-white shadow-lg ${iconGradient} shadow-${isLesson ? 'cyan' : 'violet'}-500/30`}>
                    <Icon className="h-6 w-6" />
                </div>
                
                {/* Title and Type */}
                <div className="flex-grow">
                    <h4 className="font-semibold text-slate-800 leading-tight">{title}</h4>
                    <p className="text-sm text-slate-500">{itemTypeLabel}</p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {isLesson && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLessonSelect(item.id); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-full z-10 transition-all duration-200 ${isSelected ? `${selectionRingColor} bg-opacity-100 text-white` : 'bg-slate-200 text-slate-500 hover:bg-slate-300'} ${isSelected ? 'bg-blue-500' : ''}`}
                            title={isSelected ? "Deselect Lesson" : "Select Lesson"}
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                        </button>
                    )}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={props.onView} className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-100/70" title={isLesson ? "View Lesson" : "View Quiz"}>
                            <EyeIcon className="w-5 h-5" />
                        </button>
                        <ActionMenu>
                            <MenuItem icon={PencilIcon} text={isLesson ? "Edit Lesson" : "Edit Quiz"} onClick={props.onEdit} />
                            {isLesson && ( isUlp ? (
                                <MenuItem icon={isExporting ? CloudArrowUpIcon : DocumentTextIcon} text={isExporting ? "Exporting..." : "Export as PDF"} onClick={() => props.onExportUlpPdf(item)} loading={isExporting} />
                            ) : isAtg ? (
                                <MenuItem icon={isExporting ? CloudArrowUpIcon : DocumentTextIcon} text={isExporting ? "Exporting..." : "Export as PDF"} onClick={() => props.onExportAtgPdf(item)} loading={isExporting} />
                            ) : (
                                <MenuItem icon={isExporting ? CloudArrowUpIcon : DocumentTextIcon} text={isExporting ? "Exporting..." : "Export as .docx"} onClick={() => props.onExport(item)} loading={isExporting} />
                            ))}
                            {isLesson && <MenuItem icon={SparklesIcon} text="AI Generate Quiz" onClick={props.onGenerateQuiz} disabled={isAiGenerating} />}
                            <MenuItem icon={TrashIcon} text={isLesson ? "Delete Lesson" : "Delete Quiz"} onClick={props.onDelete} />
                        </ActionMenu>
                    </div>
                </div>
            </div>
        </div>
    );
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
                <button {...listeners} className="absolute top-3 left-3 p-1.5 text-white/50 hover:text-white cursor-grab opacity-50 group-hover:opacity-100 transition-opacity" title="Drag to reorder"><ArrowsUpDownIcon className="h-5 w-5" /></button>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onOpenAiHub(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white" title="AI Tools for this unit"><SparklesIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white" title="Edit Unit"><PencilIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white" title="Delete Unit"><TrashIcon className="w-5 h-5" /></button>
                </div>
                <div className="relative z-10">
                    <div className="mb-4 p-3 bg-white/20 rounded-lg inline-block"><Icon className="w-8 h-8 text-white" /></div>
                    <h2 className="text-lg font-bold text-white">{unit.title}</h2>
                </div>
                <p className="relative z-10 text-white/80 text-sm mt-2">Select to view content</p>
            </div>
        </div>
    );
}

const customSort = (a, b) => {
    const orderA = a.order;
    const orderB = b.order;
    if (orderA !== undefined && orderB !== undefined) {
        if (orderA !== orderB) return orderA - orderB;
    }
    if (orderA !== undefined && orderB === undefined) return -1;
    if (orderA === undefined && orderB !== undefined) return 1;
    const timeA = a.createdAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || 0;
    return timeA - timeB;
};

export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect }) {
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
        if (!subject?.id) { setUnits([]); return; }
        if (onSetActiveUnit) { onSetActiveUnit(null); }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUnits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedUnits.sort(customSort);
            setUnits(fetchedUnits);
        }, (error) => console.error("Error fetching units: ", error));
        return () => unsubscribe();
    }, [subject?.id, onSetActiveUnit]);

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
	    if (!over || active.id === over.id) return;
	    const activeType = active.data.current?.type;
	    const overType = over.data.current?.type;
	    if (activeType === 'unit' && overType === 'unit') {
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
        if ((activeType === 'lesson' || activeType === 'quiz') && (overType === 'lesson' || overType === 'quiz')) {
            const unitId = active.data.current.unitId;
            if (unitId !== over.data.current.unitId) {
                console.warn("Cross-unit dragging is not supported.");
                return;
            }
            const lessonsForUnit = (lessons[unitId] || []).map(item => ({...item, type: 'lesson'}));
            const quizzesForUnit = (quizzes[unitId] || []).map(item => ({...item, type: 'quiz'}));
            const unifiedContent = [...lessonsForUnit, ...quizzesForUnit].sort(customSort);
            const oldIndex = unifiedContent.findIndex(item => item.id === active.id);
            const newIndex = unifiedContent.findIndex(item => item.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedContent = arrayMove(unifiedContent, oldIndex, newIndex);
                setLessons(prev => ({ ...prev, [unitId]: reorderedContent.filter(i => i.type === 'lesson')}));
                setQuizzes(prev => ({ ...prev, [unitId]: reorderedContent.filter(i => i.type === 'quiz')}));
                const batch = writeBatch(db);
                reorderedContent.forEach((item, index) => {
                    const collectionName = item.type === 'lesson' ? 'lessons' : 'quizzes';
                    const itemRef = doc(db, collectionName, item.id);
                    batch.update(itemRef, { order: index });
                });
                await batch.commit();
            }
        }
	}

	const handleExportDocx = async (lesson) => {
	    if (isExportingRef.current) return;
	    isExportingRef.current = true;
	    setExportingLessonId(lesson.id);
	    showToast("Generating .docx file...", "info");
	    try {
	        let finalHtml = `<h1>${lesson.lessonTitle || lesson.title}</h1>`;
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
	        link.download = `${lesson.lessonTitle || lesson.title}.docx`;
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
	    const htmlContent = lesson.pages[0]?.content || '<h1>No Content</h1>';
	    const title = lesson.lessonTitle || lesson.title;
	    const printWindow = window.open('', '_blank');
	    if (!printWindow) {
	        showToast("Could not open a new window. Please disable your pop-up blocker.", "error");
	        setExportingLessonId(null);
	        return;
	    }
	    printWindow.document.write(`<html><head><title>${title}</title><style>@media print { @page { size: 8.5in 13in; margin: 1in; } body { margin: 0; font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; } table { width: 100%; border-collapse: collapse; page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } td, th { border: 1px solid #ccc; padding: 8px; text-align: left; } table table { margin-top: 5px; border: 1px solid #ccc; } }</style></head><body>${htmlContent}</body></html>`);
	    printWindow.document.close();
	    setTimeout(() => { printWindow.focus(); printWindow.print(); setExportingLessonId(null); }, 500);
	};
    
	const handleExportAtgPdf = (lesson) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lesson.id);
	    showToast("Preparing PDF for printing...", "info");
	    let finalHtml = `<h1>${lesson.lessonTitle || lesson.title}</h1>`;
	    for (const page of lesson.pages) {
	        const cleanTitle = page.title.replace(/^page\s*\d+\s*[:-]?\s*/i, '');
	        const rawHtml = marked.parse(page.content || '');
	        finalHtml += `<h2>${cleanTitle}</h2>` + rawHtml;
	    }
	    const printWindow = window.open('', '_blank');
	    if (!printWindow) {
	        showToast("Could not open a new window. Please disable your pop-up blocker.", "error");
	        setExportingLessonId(null);
	        return;
	    }
	    printWindow.document.write(`<html><head><title>${lesson.lessonTitle || lesson.title}</title><style>@media print { @page { size: 8.5in 13in; margin: 1in; } body { margin: 0; font-family: sans-serif; } h1, h2, h3 { page-break-after: avoid; } ul, p { page-break-inside: avoid; } table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #ccc; padding: 6px; } }</style></head><body>${finalHtml}</body></html>`);
	    printWindow.document.close();
	    setTimeout(() => { printWindow.focus(); printWindow.print(); setExportingLessonId(null); }, 500);
	};

    const unitVisuals = [
        { icon: RectangleStackIcon, color: 'from-blue-500 to-sky-500' },
        { icon: BookOpenIcon, color: 'from-green-500 to-emerald-500' },
        { icon: QueueListIcon, color: 'from-purple-500 to-violet-500' },
    ];
    
    const unifiedContent = useMemo(() => {
        if (!activeUnit) return [];
        const lessonsForUnit = (lessons[activeUnit.id] || []).map(item => ({ ...item, type: 'lesson' }));
        const quizzesForUnit = (quizzes[activeUnit.id] || []).map(item => ({ ...item, type: 'quiz' }));
        return [...lessonsForUnit, ...quizzesForUnit].sort(customSort);
    }, [activeUnit, lessons, quizzes]);

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    (() => {
                        const isLoading = !lessons[activeUnit.id] || !quizzes[activeUnit.id];
                        return (
                            <div>
                                <button onClick={() => onSetActiveUnit(null)} className="flex items-center gap-2 mb-6 font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                                    <ArrowUturnLeftIcon className="w-5 h-5" />
                                    <span>Back to All Units</span>
                                </button>
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{activeUnit.title}</h2>
                                        <p className="mt-1 text-md text-gray-600">Structure the learning path for this unit.</p>
                                    </div>
                                    <AddContentDropdown onAddLesson={() => handleOpenUnitModal(setAddLessonModalOpen, activeUnit)} onAddQuiz={() => handleOpenUnitModal(setAddQuizModalOpen, activeUnit)} />
                                </div>
                                {isLoading ? (
                                    <div className="w-full flex justify-center items-center p-20"><Spinner /></div>
                                ) : unifiedContent.length > 0 ? (
                                    // NEW: Textured background container for the pills
                                    <div className="bg-slate-100 p-4 rounded-2xl shadow-inner" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}>
                                        <SortableContext items={unifiedContent.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                            {unifiedContent.map(item => (
                                                <SortableContentItem
                                                    key={item.id} item={item}
                                                    onView={() => item.type === 'lesson' ? handleOpenLessonModal(setViewLessonModalOpen, item) : handleOpenQuizModal(setViewQuizModalOpen, item)}
                                                    onEdit={() => item.type === 'lesson' ? handleOpenLessonModal(setEditLessonModalOpen, item) : handleEditQuiz(item)}
                                                    onDelete={() => onInitiateDelete(item.type, item.id)}
                                                    onGenerateQuiz={() => handleOpenAiQuizModal(item)}
                                                    onExport={handleExportDocx} onExportUlpPdf={handleExportUlpAsPdf} onExportAtgPdf={handleExportAtgPdf}
                                                    exportingLessonId={exportingLessonId} selectedLessons={selectedLessons} onLessonSelect={onLessonSelect} isAiGenerating={isAiGenerating}
                                                />
                                            ))}
                                        </SortableContext>
                                    </div>
                                ) : (
                                    <div className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl border border-dashed ring-1 ring-black/5 shadow-lg">
                                        <RectangleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-lg font-semibold text-gray-800">This unit is empty</h3>
                                        <p className="mt-1 text-sm text-gray-500">Add a lesson or a quiz to get started.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()
                ) : (
                    units.length > 0 ? (
                        <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {units.map((unit, index) => (<SortableUnitCard key={unit.id} unit={unit} onSelect={onSetActiveUnit} onEdit={(unitToEdit) => handleOpenUnitModal(setEditUnitModalOpen, unitToEdit)} onDelete={(unitToDelete) => handleOpenUnitModal(setDeleteUnitModalOpen, unitToDelete)} onOpenAiHub={handleOpenAiHub} visuals={unitVisuals[index % unitVisuals.length]} />))}
                            </div>
                        </SortableContext>
                    ) : (<p className="text-center text-gray-500 py-10">No units in this subject yet. Add one to get started!</p>)
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