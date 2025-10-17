import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
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
    ChevronLeftIcon,
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
import htmlToDocx from 'html-to-docx-ts';
import Spinner from '../common/Spinner';
import htmlToPdfmake from 'html-to-pdfmake';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    PageOrientation,
    ImageRun,
    Numbering,
    Header,
    Footer,
} from "docx";
import { saveAs } from "file-saver";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts;


// Font Loading Functions
async function loadFontToVfs(name, url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
  pdfMake.vfs[name] = base64;
}

let dejaVuLoaded = false;
async function registerDejaVuFonts() {
  if (dejaVuLoaded) return;

  await loadFontToVfs("DejaVuSans.ttf", "/fonts/DejaVuSans.ttf");
  await loadFontToVfs("DejaVuSans-Bold.ttf", "/fonts/DejaVuSans-Bold.ttf");
  await loadFontToVfs("DejaVuSans-Oblique.ttf", "/fonts/DejaVuSans-Oblique.ttf");
  await loadFontToVfs("DejaVuSans-BoldOblique.ttf", "/fonts/DejaVuSans-BoldOblique.ttf");

  pdfMake.fonts = {
    DejaVu: {
      normal: "DejaVuSans.ttf",
      bold: "DejaVuSans-Bold.ttf",
      italics: "DejaVuSans-Oblique.ttf",
      bolditalics: "DejaVuSans-BoldOblique.ttf",
    },
  };

  dejaVuLoaded = true;
}

// ✅ CORRECTED: Helper function to process special text characters
const processLatex = (text) => {
    if (!text) return '';
    let processedText = text;

    // Replace custom LaTeX-like commands with unicode characters
    processedText = processedText.replace(/\\degree/g, '°');
    processedText = processedText.replace(/\\angle/g, '∠');

    // ✅ ADDED: Handle \vec{...} command for vectors
    // This finds \vec{...} and applies a combining arrow over each character inside.
    processedText = processedText.replace(/\\vec\{(.*?)\}/g, (match, content) => {
        return content.split('').map(char => char + '\u20D7').join('');
    });

    // Strip out LaTeX math delimiters.
    processedText = processedText.replace(/\$\$(.*?)\$\$/g, '$1');
    processedText = processedText.replace(/\$(.*?)\$/g, '$1');

    return processedText;
};


// Lazy load modals for better code splitting and initial load performance
const AddLessonModal = lazy(() => import('./AddLessonModal'));
const AddQuizModal = lazy(() => import('./AddQuizModal'));
const EditLessonModal = lazy(() => import('./EditLessonModal'));
const ViewLessonModal = lazy(() => import('./ViewLessonModal'));
const EditUnitModal = lazy(() => import('./EditUnitModal'));
const EditQuizModal = lazy(() => import('./EditQuizModal.jsx'));
const ViewQuizModal = lazy(() => import('./ViewQuizModal'));
const AiQuizModal = lazy(() => import('./AiQuizModal'));
const AiGenerationHub = lazy(() => import('./AiGenerationHub'));


// Helper Functions
async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchImage(url) {
    const response = await fetch(url);
    return await response.arrayBuffer();
}

function markdownToDocx(content) {
    const tokens = marked.lexer(content || "");
    let paragraphs = [];
    tokens.forEach(token => {
        if (token.type === "paragraph") {
            paragraphs.push(
                new Paragraph({
                    children: token.tokens.map(t => {
                        if (t.type === "strong") {
                            return new TextRun({ text: t.text, bold: true, size: 22, font: "Arial" });
                        } else if (t.type === "em") {
                            return new TextRun({ text: t.text, italics: true, size: 22, font: "Arial" });
                        } else {
                            return new TextRun({ text: t.text, size: 22, font: "Arial" });
                        }
                    }),
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { line: 360 }
                })
            );
        } else if (token.type === "list") {
            token.items.forEach(item => {
                paragraphs.push(
                    new Paragraph({
                        text: item.text,
                        bullet: token.ordered ? undefined : { level: 0 },
                        numbering: token.ordered
                            ? { reference: "numbered-list", level: 0 }
                            : undefined,
                        spacing: { line: 360 }
                    })
                );
            });
        } else if (token.type === "heading") {
            paragraphs.push(
                new Paragraph({
                    text: token.text,
                    heading: token.depth === 1 
                        ? HeadingLevel.HEADING_1 
                        : HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 200 }
                })
            );
        } else if (token.type === "blockquote") {
            paragraphs.push(
                new Paragraph({
                    text: token.text,
                    italics: true,
                    alignment: AlignmentType.LEFT,
                    spacing: { line: 360 }
                })
            );
        } else if (token.type === "code") {
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({ 
                            text: token.text, 
                            font: "Courier New", 
                            size: 20, 
                            color: "555555" 
                        })
                    ],
                    spacing: { line: 360 }
                })
            );
        }
    });
    return paragraphs;
}

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

// UI Components
const MenuPortal = ({ children, menuStyle, onClose }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    return createPortal(<div ref={menuRef} style={menuStyle} className="fixed bg-neumorphic-base rounded-md shadow-neumorphic z-[5000]"><div className="py-1" onClick={onClose}>{children}</div></div>, document.body);
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
            <div role="button" tabIndex={0} ref={iconRef} onClick={handleToggle} onPointerDown={(e) => e.stopPropagation()} className="p-2 text-slate-500 hover:text-slate-900 rounded-full cursor-pointer transition-shadow hover:shadow-neumorphic-inset">
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>{children}</MenuPortal>}
        </>
    );
};

const MenuItem = ({ icon: Icon, text, onClick, disabled = false, loading = false }) => (
    <button onClick={onClick} disabled={disabled || loading} className="flex items-center w-full px-4 py-2 text-sm text-left text-slate-700 rounded-lg hover:shadow-neumorphic-inset disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon className={`h-5 w-5 mr-3 ${loading ? 'animate-spin' : ''}`} />
        <span>{text}</span>
    </button>
);

const AddContentButton = ({ onAddLesson, onAddQuiz }) => {
    return (
        <button 
            onClick={onAddLesson}
            className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 py-2 px-4 rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
        >
            <PlusIcon className="w-5 h-5" />
            Add Lesson
        </button>
    );
};

function SortableContentItem({ item, isReordering, ...props }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id,
        data: { type: item.type, unitId: item.unitId },
        disabled: !isReordering,
    });
    const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 250ms ease' };
    
    const isLesson = item.type === 'lesson';
    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;
    const iconColor = isLesson ? 'text-blue-600' : 'text-purple-600';

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="mb-3 touch-none"> 
            <div className={`w-full flex items-center p-3 bg-neumorphic-base rounded-2xl shadow-neumorphic transition-all duration-200 ${isReordering ? 'ring-2 ring-sky-400' : 'hover:shadow-neumorphic-inset'}`}>
                {isReordering && (
                    <button {...listeners} className="p-2 rounded-full text-slate-500 hover:text-slate-700 cursor-grab flex-shrink-0" title="Drag to reorder">
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}
                
                <div className={`h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center bg-neumorphic-base shadow-neumorphic-inset mx-3`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
                
                <div className="flex-grow min-w-0">
                    <h4 
                        className={`font-semibold text-slate-800 leading-tight line-clamp-2 ${!isReordering ? 'cursor-pointer hover:text-sky-600' : 'cursor-default'}`}
                        onClick={() => !isReordering && props.onView()}
                    >
                        {item.title || 'Untitled'}
                    </h4>
                </div>
                
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                    <ActionMenu>
                      <MenuItem icon={PencilIcon} text={isLesson ? "Edit Lesson" : "Edit Quiz"} onClick={props.onEdit} />
                      {isLesson && (
                        <>
                            <MenuItem icon={props.exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={props.exportingLessonId === item.id ? "Exporting..." : "Export as PDF"} onClick={() => props.onExportPdf(item)} loading={props.exportingLessonId === item.id} />
                            <MenuItem icon={props.exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={props.exportingLessonId === item.id ? "Exporting..." : "Export as .docx"} onClick={() => props.onExport(item)} loading={props.exportingLessonId === item.id} />
                        </>
                      )}
                      {isLesson && <MenuItem icon={SparklesIcon} text="AI Generate Quiz" onClick={props.onGenerateQuiz} disabled={props.isAiGenerating} />}
                      <MenuItem icon={TrashIcon} text={isLesson ? "Delete Lesson" : "Delete Quiz"} onClick={props.onDelete} />
                    </ActionMenu>
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
    const { icon: Icon, gradient, iconColor } = visuals;
    return (
        <div ref={setNodeRef} style={style} {...attributes} className="touch-none">
            <div onClick={() => onSelect(unit)} className={`group relative p-6 rounded-2xl shadow-neumorphic transition-shadow duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full bg-gradient-to-br ${gradient} hover:shadow-neumorphic-inset`}>
                <button {...listeners} className="absolute top-3 left-3 p-1.5 text-slate-500 hover:text-slate-800 cursor-grab opacity-50 group-hover:opacity-100 transition-opacity" title="Drag to reorder"><ArrowsUpDownIcon className="h-5 w-5" /></button>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onOpenAiHub(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/50 text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset" title="AI Tools for this unit"><SparklesIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/50 text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset" title="Edit Unit"><PencilIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/50 text-red-600 shadow-neumorphic hover:shadow-neumorphic-inset" title="Delete Unit"><TrashIcon className="w-5 h-5" /></button>
                </div>
                <div className="relative z-10">
                    <div className="mb-4 p-3 bg-neumorphic-base rounded-lg inline-block shadow-neumorphic-inset"><Icon className={`w-8 h-8 ${iconColor}`} /></div>
                    <h2 className="text-lg font-bold text-slate-800">{unit.title}</h2>
                </div>
                <p className="relative z-10 text-slate-600 text-sm mt-2">Select to view content</p>
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

// Main Component
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
    const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
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
    const [isReordering, setIsReordering] = useState(false);

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
        if (!subject?.id) {
            setAllLessons([]);
            setAllQuizzes([]);
            return;
        }
        const lessonQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
        const unsubLessons = onSnapshot(lessonQuery, snapshot => {
            const fetchedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllLessons(fetchedLessons);
        });
        const quizQuery = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
        const unsubQuizzes = onSnapshot(quizQuery, snapshot => {
            const fetchedQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllQuizzes(fetchedQuizzes);
        });
        return () => {
            unsubLessons();
            unsubQuizzes();
        };
    }, [subject?.id]);

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
            
            const lessonsForUnit = allLessons.filter(item => item.unitId === unitId).map(item => ({...item, type: 'lesson'}));
            const quizzesForUnit = allQuizzes.filter(item => item.unitId === unitId).map(item => ({...item, type: 'quiz'}));
            const unifiedContent = [...lessonsForUnit, ...quizzesForUnit].sort(customSort);
            const oldIndex = unifiedContent.findIndex(item => item.id === active.id);
            const newIndex = unifiedContent.findIndex(item => item.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedContent = arrayMove(unifiedContent, oldIndex, newIndex);
                
                const newLessonsForUnit = reorderedContent.filter(i => i.type === 'lesson');
                const newQuizzesForUnit = reorderedContent.filter(i => i.type === 'quiz');
                setAllLessons(prev => [...prev.filter(l => l.unitId !== unitId), ...newLessonsForUnit]);
                setAllQuizzes(prev => [...prev.filter(q => q.unitId !== unitId), ...newQuizzesForUnit]);

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
		            const cleanTitle = (page.title || '').replace(/^page\s*\d+\s*[:-]?\s*/i, '');
	            
	                // ✅ FIXED: Process the content string before parsing
	                const contentString = typeof page.content === 'string' ? page.content : '';
	                const processedContent = processLatex(contentString);
	                const rawHtml = marked.parse(processedContent);
	            
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
    const handleExportUlpAsPdf = async (lesson) => {
        if (exportingLessonId) return;
        setExportingLessonId(lesson.id);
        showToast("Preparing PDF...", "info");

        try {
            await registerDejaVuFonts();

            const pdfStyles = {
                coverTitle: { fontSize: 32, bold: true, margin: [0, 0, 0, 15] },
                coverSub: { fontSize: 18, italics: true, color: '#555555' },
                pageTitle: { fontSize: 20, bold: true, color: '#005a9c', margin: [0, 20, 0, 8] },
                default: {
                    fontSize: 9,
                    lineHeight: 1.15,
                    color: '#333333',
                    alignment: 'justify'
                }
            };

            const lessonTitle = lesson.lessonTitle || lesson.title;
            const subjectTitle = subject?.title || "SRCS Learning Portal";

            let lessonContent = [];
            for (const page of lesson.pages) {
                const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");

                if (cleanTitle) {
                    lessonContent.push({ text: cleanTitle, style: 'pageTitle' });
                }
                
                const contentString = typeof page.content === 'string' ? page.content : '';
                const html = marked.parse(contentString);
                const convertedContent = htmlToPdfmake(html, { defaultStyles: pdfStyles.default });
        
                lessonContent.push(convertedContent);
            }

            const docDefinition = {
                pageSize: "Folio",
                pageMargins: [72, 100, 72, 100],
                header: {
                    margin: [0, 20, 0, 0],
                    stack: [{ image: "headerImg", width: 450, alignment: "center" }]
                },
                footer: {
                    margin: [0, 0, 0, 20],
                    stack: [{ image: "footerImg", width: 450, alignment: "center" }]
                },
                defaultStyle: {
                    font: 'DejaVu',
                    ...pdfStyles.default
                },
                styles: pdfStyles,
                content: [
                    {
                        stack: [
                            { text: lessonTitle, style: "coverTitle" },
                            { text: subjectTitle, style: "coverSub" }
                        ],
                        alignment: "center",
                        margin: [0, 200, 0, 0],
                        pageBreak: "after"
                    },
                    {
                        stack: lessonContent,
                        margin: [0, 0, 0, 0],
                        width: "auto",
                        alignment: "justify"
                    }
                ],
                images: {
                    headerImg: "https://i.ibb.co/xt5CY6GY/header-port.png",
                    footerImg: "https://i.ibb.co/kgrMBfDr/Footer.png"
                }
            };

            pdfMake.createPdf(docDefinition).download(`${lessonTitle}.pdf`, () => {
                setExportingLessonId(null);
            });

        } catch (error) {
            console.error("Failed to export PDF:", error);
            showToast("An error occurred while creating the PDF.", "error");
            setExportingLessonId(null);
        }
    };
    
    const handleExportUlpAsDocx = async (lesson) => {
      if (exportingLessonId) return;
      setExportingLessonId(lesson.id);
      showToast("Preparing Word Document...", "info");

      try {
        const lessonTitle = lesson.lessonTitle || lesson.title;
        const page = lesson.pages[0];
        let ulpHtmlContent = page?.content || "";

        ulpHtmlContent = ulpHtmlContent.replace(
          /<tr>(\s*<td[^>]*>Learning Focus<\/td>\s*<td[^>]*>Learning Process<\/td>\s*)<\/tr>/i,
          `<tr style="font-weight:bold; color:white;">
            <td bgcolor="#374151" style="padding:8px; width:108px;">Learning Focus</td>
            <td bgcolor="#374151" style="padding:8px;">Learning Process</td>
          </tr>`
        );
        ulpHtmlContent = ulpHtmlContent.replace(
          /<td/gi,
          (match, offset, full) =>
            offset < full.indexOf("Learning Focus")
              ? match
              : match.includes("width:")
                ? match
                : `${match} style="width:108px;"`
        );

        const headerBase64 = await fetchImageAsBase64("https://i.ibb.co/xt5CY6GY/header-port.png");
        const footerBase64 = await fetchImageAsBase64("https://i.ibb.co/kgrMBfDr/Footer.png");
        const fileBuffer = await htmlToDocx(ulpHtmlContent, null, {
          table: { row: { cantSplit: false } },
          page: {
            size: { width: 12240, height: 18720 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          },
          header: {
            default: `<div style="text-align:center;"><img src="${headerBase64}" style="width:450px;"/></div>`
          },
          footer: {
            default: `<div style="text-align:center;"><img src="${footerBase64}" style="width:450px;"/></div>`
          }
        });

        saveAs(fileBuffer, `${lessonTitle}.docx`);
        setExportingLessonId(null);

      } catch (error) {
        console.error("Failed to export DOCX:", error);
        showToast("An error occurred while creating the Word document.", "error");
        setExportingLessonId(null);
      }
    };
    
	const handleExportAtgPdf = (lesson) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lesson.id);
	    showToast("Preparing PDF for printing...", "info");
	    let finalHtml = `<h1>${lesson.lessonTitle || lesson.title}</h1>`;
	    for (const page of lesson.pages) {
	        const cleanTitle = (page.title || '').replace(/^page\s*\d+\s*[:-]?\s*/i, '');
	        const contentString = typeof page.content === 'string' ? page.content : '';
	        const rawHtml = marked.parse(contentString);
	        finalHtml += `<h2>${cleanTitle}</h2>` + rawHtml;
	    }
	    const printWindow = window.open('', '_blank');
	    if (!printWindow) {
	        showToast("Could not open a new window. Please disable your pop-up blocker.", "error");
	        setExportingLessonId(null);
	        return;
	    }
	    printWindow.document.write(`<html><head><title>${lesson.lessonTitle || lesson.title}</title><style>@media print { @page { size: 8.5in 13in; margin: 1in; } body { margin: 0; font-family: 'DejaVu Sans', sans-serif; } h1, h2, h3 { page-break-after: avoid; } ul, p { page-break-inside: avoid; } table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #ccc; padding: 6px; } }</style></head><body>${finalHtml}</body></html>`);
	    printWindow.document.close();
	    setTimeout(() => { printWindow.focus(); printWindow.print(); setExportingLessonId(null); }, 500);
	};

	const handleExportLessonPdf = async (lesson) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lesson.id);
	    showToast("Preparing PDF...", "info");

	    try {
            await registerDejaVuFonts();

	        const pdfStyles = {
	            coverTitle: { fontSize: 32, bold: true, margin: [0, 0, 0, 15] },
	            coverSub: { fontSize: 18, italics: true, color: '#555555' },
	            pageTitle: { fontSize: 20, bold: true, color: '#005a9c', margin: [0, 20, 0, 8] },
	            blockquote: { margin: [20, 5, 20, 5], italics: true, color: '#4a4a4a' },
	            default: {
	                fontSize: 11,
	                lineHeight: 1.5,
	                color: '#333333',
	                alignment: 'justify'
	            }
	        };
	        const lessonTitle = lesson.lessonTitle || lesson.title;
	        const subjectTitle = subject?.title || "SRCS Learning Portal";
	        let lessonContent = [];

	        for (const page of lesson.pages) {
	            const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
	            if (cleanTitle) {
	                lessonContent.push({ text: cleanTitle, style: 'pageTitle' });
	            }

	            let contentString = typeof page.content === 'string' ? page.content : '';
                
                // ✅ FIX 1: Process raw text before parsing markdown
                contentString = processLatex(contentString);

	            let html = marked.parse(contentString);

                // ✅ FIX 2: Clean up blockquote HTML for proper rendering
                html = html
                    .replace(/<blockquote>\s*<p>/g, '<blockquote>')
                    .replace(/<\/p>\s*<\/blockquote>/g, '</blockquote>');

	            const convertedContent = htmlToPdfmake(html, { defaultStyles: pdfStyles.default });
	            lessonContent.push(convertedContent);
	        }

	        const docDefinition = {
	            pageSize: "A4",
	            pageMargins: [72, 100, 72, 100],
	            header: {
	                margin: [0, 20, 0, 0],
	                stack: [{ image: "headerImg", width: 450, alignment: "center" }]
	            },
	            footer: {
	                margin: [0, 0, 0, 20],
	                stack: [{ image: "footerImg", width: 450, alignment: "center" }]
	            },
                defaultStyle: {
                    font: 'DejaVu',
                    ...pdfStyles.default,
                },
	            styles: pdfStyles,
	            content: [
	                {
	                    stack: [
	                        { text: lessonTitle, style: "coverTitle" },
	                        { text: subjectTitle, style: "coverSub" }
	                    ],
	                    alignment: "center",
	                    margin: [0, 200, 0, 0],
	                    pageBreak: "after"
	                },
	                ...lessonContent
	            ],
	            images: {
	 		        headerImg: "https://i.ibb.co/xt5CY6GY/header-port.png",
	 		        footerImg: "https://i.ibb.co/kgrMBfDr/Footer.png"
	            }
	        };
	        pdfMake.createPdf(docDefinition).download(`${lessonTitle}.pdf`, () => {
	            setExportingLessonId(null);
	        });
	    } catch (error) {
	        console.error("Failed to export PDF:", error);
	        showToast("An error occurred while creating the PDF.", "error");
	        setExportingLessonId(null);
	    }
	};
    
    const unitVisuals = useMemo(() => [
        { icon: RectangleStackIcon, gradient: 'from-white to-blue-50', iconColor: 'text-blue-500' },
        { icon: BookOpenIcon, gradient: 'from-white to-green-50', iconColor: 'text-green-500' },
        { icon: QueueListIcon, gradient: 'from-white to-purple-50', iconColor: 'text-purple-500' },
    ], []);
    
    const unifiedContent = useMemo(() => {
        if (!activeUnit) return [];
        const lessonsForUnit = allLessons.filter(item => item.unitId === activeUnit.id).map(item => ({ ...item, type: 'lesson' }));
        const quizzesForUnit = allQuizzes.filter(item => item.unitId === activeUnit.id).map(item => ({ ...item, type: 'quiz' }));
        return [...lessonsForUnit, ...quizzesForUnit].sort(customSort);
    }, [activeUnit, allLessons, allQuizzes]);

	return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    (() => {
                        const isLoading = !allLessons || !allQuizzes;
                        return (
                            <div>
                                <button
                                    onClick={() => { onSetActiveUnit(null); setIsReordering(false); }}
                                    className="flex items-center gap-1.5 mb-6 text-sm font-semibold text-slate-600 p-2 rounded-lg hover:shadow-neumorphic-inset"
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                    <span>Back to All Units</span>
                                </button>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                    <div className="min-w-0">
                                        <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">{activeUnit.title}</h2>
                                        <p className="mt-1 text-sm text-slate-600">Structure the learning path for this unit.</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                        {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                        <button 
                                            onClick={() => setIsReordering(prev => !prev)} 
                                            className={`font-semibold px-4 py-2 rounded-full transition-all text-sm shadow-neumorphic hover:shadow-neumorphic-inset ${
                                                isReordering ? 'bg-sky-600 text-white' : 'bg-neumorphic-base text-slate-700'
                                            }`}
                                        >
                                            {isReordering ? 'Done' : 'Reorder'}
                                        </button>
                                        <AddContentButton
                                            onAddLesson={() => handleOpenUnitModal(setAddLessonModalOpen, activeUnit)}
                                            onAddQuiz={() => handleOpenUnitModal(setAddQuizModalOpen, activeUnit)}
                                        />
                                    </div>
                                </div>
                                {isLoading ? (
                                    <div className="w-full flex justify-center items-center p-20"><Spinner /></div>
                                ) : unifiedContent.length > 0 ? (
                                    <div className={`p-1 sm:p-2 md:p-4 rounded-2xl transition-colors ${
                                        isReordering ? 'bg-sky-50' : 'bg-neumorphic-base shadow-neumorphic-inset'
                                    }`}>
                                        <SortableContext items={unifiedContent.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                            {unifiedContent.map(item => (
                                                <SortableContentItem
                                                    key={item.id} item={item} isReordering={isReordering}
                                                    onView={() => item.type === 'lesson' ? handleOpenLessonModal(setViewLessonModalOpen, item) : handleOpenQuizModal(setViewQuizModalOpen, item)}
                                                    onEdit={() => item.type === 'lesson' ? handleOpenLessonModal(setEditLessonModalOpen, item) : handleEditQuiz(item)}
                                                    onDelete={() => onInitiateDelete(item.type, item.id, item.title, item.subjectId)}
                                                    onGenerateQuiz={() => handleOpenAiQuizModal(item)}
                                                    onExport={handleExportDocx} onExportUlpPdf={handleExportUlpAsPdf} onExportAtgPdf={handleExportAtgPdf}
                                                    onExportUlpDocx={handleExportUlpAsDocx} onExportPdf={handleExportLessonPdf}
                                                    exportingLessonId={exportingLessonId} selectedLessons={selectedLessons}
                                                    onLessonSelect={onLessonSelect} isAiGenerating={isAiGenerating}
                                                />
                                            ))}
                                        </SortableContext>
                                    </div>
                                ) : (
                                    <div className="text-center py-16 bg-neumorphic-base rounded-2xl shadow-neumorphic-inset">
                                        <RectangleStackIcon className="mx-auto h-12 w-12 text-slate-400" />
                                        <h3 className="mt-2 text-lg font-semibold text-slate-800">This unit is empty</h3>
                                        <p className="mt-1 text-sm text-slate-500">Add a lesson or a quiz to get started.</p>
                                    </div>
                                )}
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
                                        onDelete={(unitToDelete) => onInitiateDelete('unit', unitToDelete.id, unitToDelete.title, unitToDelete.subjectId)}
                                        onOpenAiHub={handleOpenAiHub}
                                        visuals={unitVisuals[index % unitVisuals.length]}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    ) : (
                        <p className="text-center text-slate-500 py-10">
                            No units in this subject yet. Add one to get started!
                        </p>
                    )
                )}
            </DndContext>
            
            <Suspense fallback={<Spinner />}>
                {isAiHubOpen && <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} unitId={unitForAi?.id} subjectId={subject?.id} />}
                {editUnitModalOpen && <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />}
                {addLessonModalOpen && <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject?.id} setIsAiGenerating={setIsAiGenerating} />}
                {addQuizModalOpen && <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject?.id} />}
                {editLessonModalOpen && <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson} />}
                {viewLessonModalOpen && <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson} onUpdate={onUpdateLesson} userRole={currentUserRole} />}
                {editQuizModalOpen && selectedQuiz && (<EditQuizModal isOpen={editQuizModalOpen} onClose={() => setEditQuizModalOpen(false)} quiz={selectedQuiz} onEditQuiz={() => { setEditQuizModalOpen(false); }} />)}
                {viewQuizModalOpen && <ViewQuizModal isOpen={viewQuizModalOpen} onClose={() => setViewQuizModalOpen(false)} quiz={selectedQuiz} userProfile={userProfile} isTeacherView={true} />}
                {aiQuizModalOpen && <AiQuizModal isOpen={aiQuizModalOpen} onClose={() => setAiQuizModalOpen(false)} unitId={lessonForAiQuiz?.id} subjectId={lessonForAiQuiz?.subjectId} lesson={lessonForAiQuiz} />}
            </Suspense>
        </>
    );
}
