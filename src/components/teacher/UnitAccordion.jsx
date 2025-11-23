// UnitAccordion.jsx
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
    Bars3Icon,
    BookOpenIcon,
    RectangleStackIcon,
    QueueListIcon,
    ArrowsUpDownIcon,
    EllipsisVerticalIcon,
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
import htmlToDocx from 'html-to-docx-ts';
import htmlToPdfmake from 'html-to-pdfmake';
import { Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts;

// NATIVE FIX: Import Capacitor plugins for native functionality
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';


// NATIVE FIX: Helper to check if running in a native app (Capacitor)
const isNativePlatform = () => Capacitor.isNativePlatform();

// NATIVE FIX: Helper to convert a blob to base64 for native saving
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      // Return only the base64 part
      const dataUrl = reader.result.toString();
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) {
        reject(new Error("Failed to convert blob to base64."));
      } else {
        resolve(base64Data);
      }
    };
    reader.readAsDataURL(blob);
  });
};

// NATIVE FIX: Our new native save function
const nativeSave = async (blob, fileName, mimeType, showToast) => {
  if (!isNativePlatform()) {
    console.error("nativeSave called on web platform.");
    return;
  }
  
  // 1. Use the app's internal, private data directory.
  const directory = Directory.Data; 

  try {
    const base64Data = await blobToBase64(blob);
    
    // Write the file to the app's private data directory
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: directory,
      recursive: true
    });

    showToast(`Opening file...`, 'info');

    // Now, use FileOpener to open the file with the native OS
    await FileOpener.open({
      filePath: result.uri,
      contentType: mimeType,
    });
  } catch (error) {
    console.error('Unable to save or open file', error);
    showToast(`Error saving file: ${error.message || 'Unknown error'}`, 'error');
  }
};

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
  
  try {
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
  } catch (error) {
    console.error("Failed to load custom fonts:", error);
  }
}

// Helper function to process special text characters
const processLatex = (text) => {
    if (!text) return '';
    let processedText = text;

    // Replace custom LaTeX-like commands with unicode characters
    processedText = processedText.replace(/\\degree/g, '°');
    processedText = processedText.replace(/\\angle/g, '∠');

    // Handle \vec{...} command for vectors
    processedText = processedText.replace(/\\vec\{(.*?)\}/g, (match, content) => {
        return content.split('').map(char => char + '\u20D7').join('');
    });

    // Strip out LaTeX math delimiters.
    processedText = processedText.replace(/\$\$(.*?)\$\$/g, '$1');
    processedText = processedText.replace(/\$(.*?)\$/g, '$1');

    return processedText;
};


// Lazy load modals
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

// --- SVG Converter ---
const convertSvgStringToPngDataUrl = (svgString) => {
    return new Promise((resolve, reject) => {
        const MAX_WIDTH = 550;

        let correctedSvgString = svgString;
        
        correctedSvgString = correctedSvgString.replace(
            /xmlns="\[http:\/\/www\.w3\.org\/2000\/svg\]\(http:\/\/www\.w3\.org\/2000\/svg\)"/g,
            'xmlns="http://www.w3.org/2000/svg"'
        );

        if (!correctedSvgString.includes('xmlns=')) {
            correctedSvgString = correctedSvgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        const img = new Image();
        const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(correctedSvgString)))}`;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            
            let width, height;
            const viewBoxMatch = correctedSvgString.match(/viewBox="([0-9\s.,-]+)"/);
            
            let svgWidth = img.width;
            let svgHeight = img.height;

            if (viewBoxMatch && viewBoxMatch[1]) {
                const viewBox = viewBoxMatch[1].split(/[,\s]+/);
                if (viewBox.length >= 4) {
                    const vbWidth = parseFloat(viewBox[2]);
                    const vbHeight = parseFloat(viewBox[3]);
                    if (vbWidth > 0 && vbHeight > 0) {
                        svgWidth = vbWidth;
                        svgHeight = vbHeight;
                    }
                }
            }

            if (!svgWidth || !svgHeight || svgWidth === 0 || svgHeight === 0) {
                svgWidth = img.width;
                svgHeight = img.height;
            }

            if (!svgWidth || !svgHeight || svgWidth === 0 || svgHeight === 0) {
                width = MAX_WIDTH;
                height = 450;
            } else {
                const aspectRatio = svgHeight / svgWidth;
                width = MAX_WIDTH;
                height = MAX_WIDTH * aspectRatio;
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
        img.onerror = () => reject(new Error("Failed to load the SVG string into an image. It might be malformed."));
        img.src = dataUri;
    });
};

// --- DESIGN SYSTEM CONSTANTS (MacOS 26) ---
const baseButtonStyles = `font-semibold rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 tracking-wide`;
const secondaryButton = `${baseButtonStyles} px-4 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 shadow-sm backdrop-blur-md`;

// --- UI COMPONENTS ---

// Skeleton Component
const ContentListSkeleton = () => {
    return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-full flex items-center p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-slate-200/50 dark:bg-white/10 mx-3"></div>
                    <div className="flex-grow min-w-0 space-y-2">
                        <div className="h-4 w-1/3 bg-slate-200/50 dark:bg-white/10 rounded-full"></div>
                        <div className="h-3 w-1/4 bg-slate-200/30 dark:bg-white/5 rounded-full"></div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-white/10 ml-4"></div>
                </div>
            ))}
        </div>
    );
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
    
    return createPortal(
        <div ref={menuRef} style={menuStyle} className="fixed bg-white/90 dark:bg-[#1E212B]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 z-[5000] p-1.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-0.5" onClick={onClose}>{children}</div>
        </div>, 
        document.body
    );
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
            <div role="button" tabIndex={0} ref={iconRef} onClick={handleToggle} onPointerDown={(e) => e.stopPropagation()} className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full cursor-pointer transition-all duration-200">
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>{children}</MenuPortal>}
        </>
    );
};

const MenuItem = ({ icon: Icon, text, onClick, disabled = false, loading = false }) => (
    <button onClick={onClick} disabled={disabled || loading} className="flex items-center w-full px-3 py-2.5 text-sm text-left text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group">
        <Icon className={`h-4 w-4 mr-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors ${loading ? 'animate-spin text-blue-500' : ''}`} />
        <span className="font-medium tracking-wide">{text}</span>
    </button>
);

const AddContentButton = ({ onAddLesson, onAddQuiz }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!buttonRef.current) return;
        
        const btnRect = buttonRef.current.getBoundingClientRect();
        const style = { 
            right: `${window.innerWidth - btnRect.right}px`,
            top: `${btnRect.bottom + 8}px`,
            width: '180px' 
        };

        const spaceBelow = window.innerHeight - btnRect.bottom;
        if (spaceBelow < 120) {
             style.top = 'auto';
             style.bottom = `${window.innerHeight - btnRect.top + 8}px`;
        }
        
        setMenuStyle(style);
        setIsOpen(prev => !prev);
    };

    return (
        <>
            <button 
                ref={buttonRef}
                onClick={handleToggle}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${secondaryButton} !bg-blue-600 hover:!bg-blue-500 !text-white !border-transparent shadow-blue-500/30 hover:shadow-blue-500/50`}
            >
                <PlusIcon className="w-5 h-5" />
                Add Content
            </button>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>
                    <MenuItem icon={DocumentTextIcon} text="Add Lesson" onClick={onAddLesson} />
                    <MenuItem icon={ClipboardDocumentListIcon} text="Add Quiz" onClick={onAddQuiz} />
                </MenuPortal>
            )}
        </>
    );
};

function SortableContentItem({ item, isReordering, ...props }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id,
        data: { type: item.type, unitId: item.unitId },
        disabled: !isReordering,
    });
    const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1)' };
    
    const isLesson = item.type === 'lesson';
    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;
    const iconBg = isLesson ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="mb-3 touch-none group"> 
            <div className={`w-full flex items-center p-3 bg-white/60 dark:bg-[#1E212B]/60 backdrop-blur-sm rounded-2xl border border-white/60 dark:border-white/5 shadow-sm transition-all duration-300 ${isReordering ? 'ring-2 ring-blue-500/50 bg-blue-50/50' : 'hover:shadow-lg hover:shadow-blue-900/5 dark:hover:shadow-black/30 hover:bg-white/80 dark:hover:bg-[#1E212B]/80'}`}>
                {isReordering && (
                    <button {...listeners} className="p-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-grab flex-shrink-0 transition-colors" title="Drag to reorder">
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}
                
                <div className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center mx-3 ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-grow min-w-0">
                    <h4 
                        className={`font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 tracking-tight ${!isReordering ? 'cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' : 'cursor-default'}`}
                        onClick={() => !isReordering && props.onView()}
                    >
                        {item.title || 'Untitled'}
                    </h4>
                </div>
                
                <div className="flex items-center gap-1 ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
        <div ref={setNodeRef} style={style} {...attributes} className="touch-none h-full">
            <div 
                onClick={() => onSelect(unit)} 
                className={`group relative p-6 rounded-[2rem] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full border border-white/20 shadow-lg hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br ${gradient}`}
            >
                <button {...listeners} className="absolute top-4 left-4 p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-grab opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/40 dark:bg-black/20 rounded-full backdrop-blur-sm" title="Drag to reorder"><ArrowsUpDownIcon className="h-4 w-4" /></button>
                
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <button onClick={(e) => { e.stopPropagation(); onOpenAiHub(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/60 dark:bg-black/30 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-blue-600 dark:hover:text-blue-400 shadow-sm backdrop-blur-md transition-colors" title="AI Tools"><SparklesIcon className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/60 dark:bg-black/30 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-blue-600 dark:hover:text-blue-400 shadow-sm backdrop-blur-md transition-colors" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(unit); }} onPointerDown={(e) => e.stopPropagation()} className="p-2 rounded-full bg-white/60 dark:bg-black/30 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-red-600 dark:hover:text-red-400 shadow-sm backdrop-blur-md transition-colors" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                </div>
                
                <div className="relative z-10 mt-8">
                    <div className="mb-4 w-14 h-14 rounded-2xl flex items-center justify-center bg-white/60 dark:bg-white/10 shadow-sm ring-1 ring-white/50 dark:ring-white/10 backdrop-blur-md">
                        <Icon className={`w-7 h-7 ${iconColor}`} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight tracking-tight">{unit.title}</h2>
                </div>
                
                <div className="relative z-10 mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        View Contents <ChevronDownIcon className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
                    </p>
                </div>
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
	
	async function handleExportDocx(lesson) {
		    if (isExportingRef.current) return;
		    isExportingRef.current = true;
		    setExportingLessonId(lesson.id);
			showToast("Generating .docx file...", "info");
			            const lessonTitle = lesson.lessonTitle || lesson.title;
						const sanitizedFileName = (lessonTitle.replace(/[\\/:"*?<>|]+/g, '_') || 'lesson') + '.docx';
            
		    try {
		        let finalHtml = `<h1>${lessonTitle}</h1>`;
		        for (const page of lesson.pages) {
		            const cleanTitle = (page.title || '').replace(/^page\s*\d+\s*[:-]?\s*/i, '');
	            
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
		                img.style.width = `${result.width}px`;
		                img.style.height = `${result.height}px`;
		                img.style.maxWidth = '100%';
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
		        
                if (isNativePlatform()) {
					await nativeSave(
					    fileBlob,
					    sanitizedFileName,
					    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					    showToast
					);
                } else {
                    const blobUrl = URL.createObjectURL(fileBlob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = sanitizedFileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                }

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
				        const lessonTitle = lesson.lessonTitle || lesson.title;
						const sanitizedFileName = (lessonTitle.replace(/[\\/:"*?<>|]+/g, '_') || 'lesson') + '.pdf';

		        try {
		            await registerDejaVuFonts();

		            const headerBase64 = await fetchImageAsBase64("/header-port.png");
		            const footerBase64 = await fetchImageAsBase64("/Footer.png");

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
            
		            const subjectTitle = subject?.title || "SRCS Learning Portal";

		            let lessonContent = [];
		            for (const page of lesson.pages) {
		                const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");

		                if (cleanTitle) {
		                    lessonContent.push({ text: cleanTitle, style: 'pageTitle' });
		                }
                
		                const contentString = typeof page.content === 'string' ? page.content : '';
		                let html = marked.parse(contentString);

                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html;
                        const svgElements = tempDiv.querySelectorAll('svg');

                        if (svgElements.length > 0) {
                            const conversionPromises = Array.from(svgElements).map(async (svg) => {
                                try {
                                    const svgString = svg.outerHTML;
                                    const result = await convertSvgStringToPngDataUrl(svgString);
                                    
                                    const img = document.createElement('img');
                                    img.src = result.dataUrl;
                                    img.style.width = `${result.width}px`;
                                    img.style.height = `${result.height}px`;
                                    img.style.maxWidth = '100%';
                                    
                                    svg.parentNode.replaceChild(img, svg);
                                } catch (err) {
                                    console.error("Could not convert one of the SVGs for PDF:", err);
                                    const errorMsg = document.createElement('p');
                                    errorMsg.style.color = 'red';
                                    errorMsg.innerText = '[Failed to render diagram]';
                                    svg.parentNode.replaceChild(errorMsg, svg);
                                }
                            });
                            
                            await Promise.all(conversionPromises);
                            html = tempDiv.innerHTML;
                        }

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
		                    headerImg: headerBase64,
		                    footerImg: footerBase64
		                }
		            };

		            const pdfDoc = pdfMake.createPdf(docDefinition);
		            if (isNativePlatform()) {
		                pdfDoc.getBlob(async (blob) => {
		                   await nativeSave(blob, sanitizedFileName, 'application/pdf', showToast);
		                    setExportingLessonId(null);
		                });
		            } else {
		                pdfDoc.getBlob((blob) => {
		                    saveAs(blob, sanitizedFileName);
		                    setExportingLessonId(null);
		                });
		            }

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
	  const lessonTitle = lesson.lessonTitle || lesson.title;
	        const sanitizedFileName = (lessonTitle.replace(/[\\/:"*?<>|]+/g, '_') || 'lesson') + '.docx';

      try {
        const page = lesson.pages[0];
        let ulpHtmlContent = page?.content || "";

        ulpHtmlContent = ulpHtmlContent.replace(
          /<tr>(\s*<td[^>]*>Learning Focus<\/td>\s*<td[^>]*>Learning Process<\/td>\s*)<\/tr>/i,
          (match, offset, full) =>
            offset < full.indexOf("Learning Focus")
              ? match
              : `<tr style="font-weight:bold; color:white;">
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


        const headerBase64 = await fetchImageAsBase64("/header-port.png");
        const footerBase64 = await fetchImageAsBase64("/Footer.png");
        
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

        if (isNativePlatform()) {
			await nativeSave(
			    fileBuffer,
			    sanitizedFileName,
			    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			    showToast
			);
        } else {
            saveAs(fileBuffer, sanitizedFileName);
        }
        setExportingLessonId(null);

      } catch (error) {
        console.error("Failed to export DOCX:", error);
        showToast("An error occurred while creating the Word document.", "error");
        setExportingLessonId(null);
      }
    };
    
	const handleExportAtgPdf = (lesson) => {
        if (isNativePlatform()) {
            showToast("Preparing PDF...", "info");
            handleExportLessonPdf(lesson); 
            return;
        }

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
		        
		        const lessonTitleToExport = lesson.lessonTitle || lesson.title || 'Untitled Lesson';
	
		        let safeTitle = lessonTitleToExport.replace(/[^a-zA-Z0-9.-_]/g, '_');

		        if (safeTitle.length > 200) {
		            safeTitle = safeTitle.substring(0, 200);
		        }

		        const sanitizedFileName = (safeTitle || 'lesson') + '.pdf';

			    try {
		            await registerDejaVuFonts();

		            const headerBase64 = await fetchImageAsBase64("/header-port.png");
		            const footerBase64 = await fetchImageAsBase64("/Footer.png");

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
	        
			        const subjectTitle = subject?.title || "SRCS Learning Portal";
			        let lessonContent = [];

			        for (const page of lesson.pages) {
			            const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
			            if (cleanTitle) {
			                lessonContent.push({ text: cleanTitle, style: 'pageTitle' });
			            }

			            let contentString = typeof page.content === 'string' ? page.content : '';
                
		                contentString = processLatex(contentString);

			            let html = marked.parse(contentString);

                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html;
                        const svgElements = tempDiv.querySelectorAll('svg');

                        if (svgElements.length > 0) {
                            const conversionPromises = Array.from(svgElements).map(async (svg) => {
                                try {
                                    const svgString = svg.outerHTML;
                                    const result = await convertSvgStringToPngDataUrl(svgString); 
                                    
                                    const img = document.createElement('img');
                                    img.src = result.dataUrl;
                                    img.style.width = `${result.width}px`;
                                    img.style.height = `${result.height}px`;
                                    img.style.maxWidth = '100%';
                                    
                                    svg.parentNode.replaceChild(img, svg);
                                } catch (err) {
                                    console.error("Could not convert one of the SVGs for PDF:", err);
                                    const errorMsg = document.createElement('p');
                                    errorMsg.style.color = 'red';
                                    errorMsg.innerText = '[Failed to render diagram]';
                                    svg.parentNode.replaceChild(errorMsg, svg);
                                }
                            });
                            
                            await Promise.all(conversionPromises);
                            
                            html = tempDiv.innerHTML;
                        }

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
			                        { text: lessonTitleToExport, style: "coverTitle" }, 
			                        { text: subjectTitle, style: "coverSub" }
			                    ],
			                    alignment: "center",
			                    margin: [0, 200, 0, 0],
			                    pageBreak: "after"
			                },
			                ...lessonContent
			            ],
			            images: {
	                        headerImg: headerBase64,
	                        footerImg: footerBase64
			            }
			        };
            
			        const pdfDoc = pdfMake.createPdf(docDefinition);
		            if (isNativePlatform()) {
		                pdfDoc.getBlob(async (blob) => {
		                    await nativeSave(blob, sanitizedFileName, 'application/pdf', showToast);
		                    setExportingLessonId(null);
		                });
		            } else {
						pdfDoc.getBlob((blob) => {
						    saveAs(blob, sanitizedFileName);
						    setExportingLessonId(null);
						});
		            }

			    } catch (error) {
			        console.error("Failed to export PDF:", error);
			        showToast("An error occurred while creating the PDF.", "error");
			        setExportingLessonId(null);
			    }
			};
    
    const unitVisuals = useMemo(() => [
        { icon: RectangleStackIcon, gradient: 'from-blue-50 via-indigo-50 to-white dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-[#1E212B]', iconColor: 'text-blue-600 dark:text-blue-400' },
        { icon: BookOpenIcon, gradient: 'from-emerald-50 via-teal-50 to-white dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-[#1E212B]', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { icon: QueueListIcon, gradient: 'from-purple-50 via-fuchsia-50 to-white dark:from-purple-900/20 dark:via-fuchsia-900/10 dark:to-[#1E212B]', iconColor: 'text-purple-600 dark:text-purple-400' },
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
                            <div className="relative">
                                {/* STICKY HEADER WRAPPER - Removed Back Button, Smaller Title, Optimized Transitions */}
                                <div className="sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-slate-50/90 dark:bg-[#0F1115]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/5 transition-all duration-300 mb-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                                        <div className="max-w-3xl">
                                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{activeUnit.title}</h2>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-1">Organize and manage the learning materials for this unit.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                            {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                            
                                            <button 
                                                onClick={() => setIsReordering(prev => !prev)} 
                                                className={`${secondaryButton} ${isReordering ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800' : ''}`}
                                            >
                                                {isReordering ? 'Done' : 'Reorder'}
                                            </button>
                                            
                                            <AddContentButton
                                                onAddLesson={() => handleOpenUnitModal(setAddLessonModalOpen, activeUnit)}
                                                onAddQuiz={() => handleOpenUnitModal(setAddQuizModalOpen, activeUnit)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isLoading ? (
                                    // REPLACED SPINNER WITH SKELETON LOADER
                                    <div className="pb-20">
                                        <ContentListSkeleton />
                                    </div>
                                ) : unifiedContent.length > 0 ? (
                                    <div className="space-y-4 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
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
                                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-slate-50/50 dark:bg-white/5 animate-in zoom-in-95 fade-in duration-300">
                                        <div className="w-16 h-16 bg-white dark:bg-white/10 rounded-full flex items-center justify-center mb-6 shadow-sm ring-1 ring-slate-100 dark:ring-white/10">
                                            <RectangleStackIcon className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Start Building Content</h3>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">This unit is currently empty. Add lessons or quizzes to create a learning path.</p>
                                        <AddContentButton
                                            onAddLesson={() => handleOpenUnitModal(setAddLessonModalOpen, activeUnit)}
                                            onAddQuiz={() => handleOpenUnitModal(setAddQuizModalOpen, activeUnit)}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })()
                ) : (
                    units.length > 0 ? (
                        <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10 animate-in slide-in-from-bottom-4 fade-in duration-500">
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
                        <div className="flex flex-col items-center justify-center py-32 text-center opacity-60 animate-in fade-in duration-700">
                            <QueueListIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-xl font-medium text-slate-900 dark:text-white">No units yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Create a unit to organize your lessons.</p>
                        </div>
                    )
                )}
            </DndContext>
            
            <Suspense fallback={<ContentListSkeleton />}>
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