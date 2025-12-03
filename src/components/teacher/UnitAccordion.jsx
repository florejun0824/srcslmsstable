// src/components/teacher/UnitAccordion.jsx
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    SparklesIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    Bars3Icon,
    RectangleStackIcon,
    QueueListIcon,
    ArrowsUpDownIcon,
    EllipsisVerticalIcon,
    CloudArrowUpIcon,
    ChevronRightIcon,
    FolderIcon
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
import { saveAs } from "file-saver";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts;

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

// --- STYLES ---
const performanceStyles = {
    touchAction: 'none',
    backfaceVisibility: 'hidden', 
};

// Base Candy Button
const candyBase = `
    relative overflow-hidden font-bold rounded-full transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 
    active:scale-95 tracking-wide shadow-lg hover:shadow-xl
    after:absolute after:inset-0 after:rounded-full after:pointer-events-none 
    after:shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]
`;

// Helper to get button/card classes based on monet presence
const getStyles = (monet) => {
    if (monet) {
        return {
            primaryButton: `${candyBase} ${monet.buttonPrimary}`,
            secondaryButton: `${candyBase} ${monet.buttonSecondary}`,
            iconButton: `${candyBase} p-2 rounded-full aspect-square ${monet.buttonSecondary}`,
            unitCard: `${monet.cardGradient} border border-white/20 text-white shadow-xl hover:-translate-y-1 hover:shadow-2xl`,
            contentItem: `${monet.buttonSecondary} !justify-start !rounded-[1.5rem] md:!rounded-[2rem] border-white/10 hover:border-white/30`
        };
    }
    // Default Candy Styles
    return {
        primaryButton: `${candyBase} bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-300 hover:to-blue-500 text-white shadow-blue-500/40 border-b-[2px] border-blue-700`,
        secondaryButton: `${candyBase} bg-gradient-to-b from-white/80 to-white/40 dark:from-slate-700/80 dark:to-slate-800/40 backdrop-blur-md text-slate-700 dark:text-white border border-white/40 dark:border-white/10 shadow-slate-200/50 dark:shadow-black/30 hover:bg-white/60 dark:hover:bg-slate-700/60`,
        iconButton: `${candyBase} p-2 rounded-full aspect-square bg-gradient-to-b from-white/90 to-slate-100/50 dark:from-slate-700 to-slate-800 text-slate-500 dark:text-slate-300 hover:text-blue-500 border border-white/50 dark:border-white/5`,
        unitCard: null, 
        contentItem: `bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-2xl border border-white/50 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/50 text-slate-800 dark:text-slate-100`
    };
};

// --- HELPER FUNCTIONS (Export Logic) ---
const isNativePlatform = () => Capacitor.isNativePlatform();

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const base64Data = reader.result.toString().split(',')[1];
      base64Data ? resolve(base64Data) : reject(new Error("Failed to convert blob."));
    };
    reader.readAsDataURL(blob);
  });
};

const nativeSave = async (blob, fileName, mimeType, showToast) => {
  if (!isNativePlatform()) return;
  try {
    const base64Data = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
      recursive: true
    });
    showToast(`Opening file...`, 'info');
    await FileOpener.open({ filePath: result.uri, contentType: mimeType });
  } catch (error) {
    showToast(`Error saving: ${error.message}`, 'error');
  }
};

async function loadFontToVfs(name, url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  pdfMake.vfs[name] = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
}

// --- UPDATED FONT REGISTRATION ---
let dejaVuLoaded = false;
async function registerDejaVuFonts() {
  if (dejaVuLoaded) return;
  try {
    // 1. Load the files into pdfMake's virtual file system (VFS)
    await loadFontToVfs("DejaVuSans.ttf", "/fonts/DejaVuSans.ttf");
    await loadFontToVfs("DejaVuSans-Bold.ttf", "/fonts/DejaVuSans-Bold.ttf");
    await loadFontToVfs("DejaVuSans-Oblique.ttf", "/fonts/DejaVuSans-Oblique.ttf");
    await loadFontToVfs("DejaVuSans-BoldOblique.ttf", "/fonts/DejaVuSans-BoldOblique.ttf");

    // 2. Create the configuration object
    const dejaVuConfig = { 
        normal: "DejaVuSans.ttf", 
        bold: "DejaVuSans-Bold.ttf", 
        italics: "DejaVuSans-Oblique.ttf", 
        bolditalics: "DejaVuSans-BoldOblique.ttf" 
    };

    // 3. Register the font under ALL potential names/aliases
    pdfMake.fonts = {
      // The main name you use in defaultStyle
      DejaVu: dejaVuConfig,
      
      // Aliases to catch HTML styles (fixes your specific error)
      "DejaVu Sans": dejaVuConfig,
      "DejavuSans": dejaVuConfig,
      "DejaVuSans": dejaVuConfig,
      
      // Fallbacks to prevent other errors if standard fonts are requested
      Roboto: dejaVuConfig,
      Arial: dejaVuConfig,
      Helvetica: dejaVuConfig
    };
    
    dejaVuLoaded = true;
  } catch (e) { console.error("Font load error", e); }
}
const processLatex = (text) => {
    if (!text) return '';
    return text
        .replace(/\\degree/g, '°')
        .replace(/\\angle/g, '∠')
        .replace(/\\vec\{(.*?)\}/g, (_, c) => c.split('').map(x => x + '\u20D7').join(''))
        .replace(/\$\$(.*?)\$\$/g, '$1')
        .replace(/\$(.*?)\$/g, '$1');
};

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

const convertSvgStringToPngDataUrl = (svgString) => {
    return new Promise((resolve, reject) => {
        const MAX_WIDTH = 550;
        let corrected = svgString.replace(/xmlns="\[http:\/\/www\.w3\.org\/2000\/svg\]\(http:\/\/www\.w3\.org\/2000\/svg\)"/g, 'xmlns="http://www.w3.org/2000/svg"');
        if (!corrected.includes('xmlns=')) corrected = corrected.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        
        const img = new Image();
        const src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(corrected)))}`;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const aspectRatio = img.height / img.width || 1;
            const width = MAX_WIDTH;
            const height = Math.round(width * aspectRatio);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
        };
        img.onerror = () => reject(new Error("SVG Load Failed"));
        img.src = src;
    });
}

// Lazy Imports
const AddLessonModal = lazy(() => import('./AddLessonModal'));
const AddQuizModal = lazy(() => import('./AddQuizModal'));
const EditLessonModal = lazy(() => import('./EditLessonModal'));
const ViewLessonModal = lazy(() => import('./ViewLessonModal'));
const EditUnitModal = lazy(() => import('./EditUnitModal'));
const EditQuizModal = lazy(() => import('./EditQuizModal.jsx'));
const ViewQuizModal = lazy(() => import('./ViewQuizModal'));
const AiQuizModal = lazy(() => import('./AiQuizModal'));
const AiGenerationHub = lazy(() => import('./AiGenerationHub'));

// Skeleton
const ContentListSkeleton = () => (
    <div className="flex flex-col gap-4 animate-pulse">
        {[1,2,3].map(i => (
            <div key={i} className="h-32 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
        ))}
    </div>
);

// Menus
const MenuPortal = ({ children, menuStyle, onClose, monet }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handler = (e) => { 
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose(); 
            }
        };
        window.addEventListener('mousedown', handler); 
        window.addEventListener('scroll', onClose, true);
        return () => {
            window.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [onClose]);
    
    const containerClass = monet 
        ? `fixed z-[9999] backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/10 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 bg-[#1E212B]/90 border border-white/10`
        : `fixed z-[9999] bg-white/90 dark:bg-[#1E212B]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 border border-white/20 dark:border-white/5`;

    return createPortal(
        <div ref={menuRef} style={menuStyle} className={containerClass}>
            {children}
        </div>, 
        document.body
    );
};
const MenuContext = React.createContext(() => {});
const ActionMenu = ({ children, monet, styles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const iconRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (isOpen) { setIsOpen(false); return; }
        const rect = iconRef.current.getBoundingClientRect();
        const screenHeight = window.innerHeight;
        const spaceBelow = screenHeight - rect.bottom;
        const shouldFlip = spaceBelow < 220; 
        let newStyle = { right: `${window.innerWidth - rect.right}px`, minWidth: '180px', position: 'fixed', zIndex: 9999 };
        if (shouldFlip) { newStyle.bottom = `${screenHeight - rect.top + 5}px`; newStyle.transformOrigin = 'bottom right'; } 
        else { newStyle.top = `${rect.bottom + 5}px`; newStyle.transformOrigin = 'top right'; }
        setMenuStyle(newStyle);
        setIsOpen(true);
    };
    const closeMenu = () => setIsOpen(false);
    return (
        <>
            <div ref={iconRef} onClick={handleToggle} className={`${styles.iconButton} relative z-20 cursor-pointer`}>
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={closeMenu} monet={monet}><MenuContext.Provider value={closeMenu}>{children}</MenuContext.Provider></MenuPortal>}
        </>
    );
};
const MenuItem = ({ icon: Icon, text, onClick, disabled, loading, monet }) => {
    const closeMenu = React.useContext(MenuContext);
    const handleClick = (e) => {
        if (disabled || loading) return;
        if (onClick) onClick(e);
        if (closeMenu) closeMenu();
    };
    return (
        <button onClick={handleClick} disabled={disabled || loading} className={`flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${monet ? 'hover:bg-white/10 text-white' : 'hover:bg-blue-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}>
            <Icon className={`h-4 w-4 mr-3 ${loading ? 'animate-spin text-blue-500' : (monet ? 'text-white/60' : 'text-slate-400')}`} />
            {text}
        </button>
    );
};

const AddContentButton = ({ onAddLesson, onAddQuiz, monet, styles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);
    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({ top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px`, minWidth: '180px' });
        setIsOpen(!isOpen);
    };
    
    const handleAddLesson = () => { onAddLesson(); setIsOpen(false); };
    const handleAddQuiz = () => { onAddQuiz(); setIsOpen(false); };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${styles.primaryButton} !px-3 !py-1.5 text-xs md:text-sm`}>
                <PlusIcon className="w-4 h-4" /> <span className="hidden md:inline">Add Content</span> <span className="md:hidden">Add</span>
            </button>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)} monet={monet}>
                <MenuItem icon={DocumentTextIcon} text="Add Lesson" onClick={handleAddLesson} monet={monet} />
                <MenuItem icon={ClipboardDocumentListIcon} text="Add Quiz" onClick={handleAddQuiz} monet={monet} />
            </MenuPortal>}
        </>
    );
};

// --- SORTABLE UNIT LIST ITEM ---
const SortableUnitListRow = memo(({ unit, onSelect, onAction, isReordering, index, monet, styles }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: unit.id, data: { type: 'unit' }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    
    const gradients = [
        "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600",
        "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500",
        "bg-gradient-to-br from-teal-400 via-emerald-500 to-green-600",
        "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500"
    ];

    const iconGradient = monet ? monet.cardGradient : gradients[index % gradients.length];
    
    const containerClasses = monet 
        ? `${monet.buttonSecondary} !justify-start !p-0 overflow-visible border-white/10 hover:border-white/30`
        : `bg-white dark:bg-[#15171B] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-lg dark:hover:shadow-black/40 hover:border-blue-400/30 dark:hover:border-white/10`;

    const rowClasses = isReordering 
        ? "opacity-70 bg-slate-50 border-2 border-dashed border-slate-300 dark:bg-slate-800 dark:border-slate-600"
        : `${containerClasses} rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 group`;

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="mb-4">
            <div 
                onClick={() => !isReordering && onSelect(unit)} 
                className={`relative w-full flex items-center p-3 md:p-4 ${rowClasses} ${!isReordering ? 'cursor-pointer active:scale-[0.99]' : ''}`}
            >
                {/* Reorder Handle */}
                {isReordering && (
                    <button {...listeners} className="p-2 mr-2 rounded-full bg-slate-100 dark:bg-slate-700 cursor-grab active:cursor-grabbing">
                        <ArrowsUpDownIcon className="h-5 w-5 text-slate-400" />
                    </button>
                )}

                {/* Icon Container (Gradient) */}
                <div className={`
                    h-14 w-14 md:h-16 md:w-16 flex-shrink-0 
                    rounded-[1rem] md:rounded-[1.3rem] 
                    flex items-center justify-center 
                    shadow-lg shadow-black/5
                    mr-4 md:mr-6
                    ${iconGradient}
                `}>
                    <FolderIcon className="h-7 w-7 md:h-8 md:w-8 text-white drop-shadow-md" />
                </div>

                {/* Text Content */}
                <div className="flex-grow min-w-0 pr-2">
                    <h3 className={`
                        text-lg md:text-xl font-bold tracking-tight leading-tight truncate
                        ${monet ? 'text-white' : 'text-slate-800 dark:text-slate-100'}
                    `}>
                        {unit.title}
                    </h3>
                    <p className={`
                        text-xs md:text-sm font-medium mt-1 truncate
                        ${monet ? 'text-white/50' : 'text-slate-500 dark:text-slate-400'}
                    `}>
                        Tap to view contents
                    </p>
                </div>

                {/* Actions */}
                {!isReordering && (
                    <div className="flex items-center gap-2 md:gap-4">
                        
                        {/* Menu */}
                        <div onClick={(e) => e.stopPropagation()}>
                            <ActionMenu monet={monet} styles={styles}>
                                <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} monet={monet} />
                                <MenuItem icon={ArrowsUpDownIcon} text="Reorder" onClick={(e) => { e.stopPropagation(); onAction('reorder', unit); }} monet={monet} />
                                <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} monet={monet} />
                            </ActionMenu>
                        </div>
                        
                        {/* Arrow */}
                        <div className={`
                            hidden md:flex h-10 w-10 rounded-full items-center justify-center 
                            transition-all duration-300
                            ${monet ? 'bg-white/10 group-hover:bg-white/20' : 'bg-slate-100 dark:bg-white/5 group-hover:bg-blue-50 dark:group-hover:bg-white/10'}
                        `}>
                            <ChevronRightIcon className={`w-5 h-5 ${monet ? 'text-white' : 'text-slate-400 group-hover:text-blue-500 dark:text-slate-400'}`} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => prev.unit.id === next.unit.id && prev.unit.title === next.unit.title && prev.isReordering === next.isReordering && prev.index === next.index && prev.monet === next.monet);


// --- SORTABLE CONTENT (LESSON) ROW ---
const SortableContentItem = memo(({ item, isReordering, onAction, exportingLessonId, isAiGenerating, monet, styles }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id, data: { type: item.type, unitId: item.unitId }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    const isLesson = item.type === 'lesson';
    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;

    const defaultTheme = isLesson 
        ? {
            iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-500/30',
            hoverBorder: 'hover:border-blue-400/30',
            activeRing: 'active:ring-blue-500/20',
            textTitle: 'group-hover:text-blue-600 dark:group-hover:text-blue-300'
          }
        : {
            iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-purple-500/30',
            hoverBorder: 'hover:border-purple-400/30',
            activeRing: 'active:ring-purple-500/20',
            textTitle: 'group-hover:text-purple-600 dark:group-hover:text-purple-300'
          };

    const monetIconBg = monet ? (isLesson ? monet.buttonPrimary : monet.buttonSecondary) : '';
    const monetHoverBorder = monet ? 'hover:border-white/30' : '';
    const monetTextTitle = monet ? 'text-white' : '';

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="mb-3 md:mb-4"> 
            <div 
                onClick={() => !isReordering && onAction('view', item)}
                className={`
                    relative group w-full flex items-center 
                    p-3 md:p-4 
                    rounded-[1.5rem] md:rounded-[2rem] 
                    transition-all duration-300 ease-out
                    md:hover:-translate-y-1 active:scale-[0.98]
                    ${styles.contentItem} 
                    ${monet ? monetHoverBorder : defaultTheme.hoverBorder} 
                    ${isReordering ? 'ring-2 ring-blue-500/50 bg-blue-50/50' : ''}
                `}
            >
                {isReordering && (
                    <button {...listeners} className="p-2 mr-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-grab active:cursor-grabbing">
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}

                <div className={`
                    h-12 w-12 md:h-16 md:w-16 flex-shrink-0 
                    rounded-[1rem] md:rounded-[1.2rem] 
                    flex items-center justify-center 
                    mr-3 md:mr-5 
                    shadow-lg ring-2 md:ring-4 ring-white/50 dark:ring-white/5
                    ${monet ? monetIconBg : defaultTheme.iconBg}
                `}>
                    <Icon className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow-md stroke-[2]" />
                </div>

                <div className="flex-grow min-w-0 pr-2 md:pr-4">
                    <h4 className={`
                        font-bold text-[16px] md:text-[19px] 
                        tracking-tight leading-snug
                        transition-colors duration-300 
                        ${monet ? monetTextTitle : 'text-slate-800 dark:text-slate-100'}
                        ${!isReordering && !monet ? `cursor-pointer ${defaultTheme.textTitle}` : ''}
                    `}>
                        {item.title || 'Untitled'}
                    </h4>
                    {item.subtitle && (
                        <p className={`text-[12px] md:text-[14px] font-medium mt-0.5 line-clamp-1 ${monet ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
                            {item.subtitle}
                        </p>
                    )}
                </div>

                <div className={`
                    flex items-center gap-1 transition-all duration-300
                    ${isReordering ? 'opacity-0' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:translate-x-4 md:group-hover:translate-x-0'}
                `}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu monet={monet} styles={styles}>
                            <MenuItem icon={PencilIcon} text="Edit" onClick={() => onAction('edit', item)} monet={monet} />
            
                            {isLesson && (
                                <>
                                    <MenuItem 
                                        icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} 
                                        text={
                                            exportingLessonId === item.id 
                                                ? "Exporting..." 
                                                : item.contentType === 'teacherGuide' ? "Export ULP (PDF)"
                                                : item.contentType === 'teacherAtg' ? "Export ATG (PDF)"
                                                : "Export as PDF"
                                        } 
                                        onClick={() => onAction('exportPdf', item)} 
                                        loading={exportingLessonId === item.id} 
                                        monet={monet} 
                                    />

                                    <MenuItem 
                                        icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} 
                                        text={
                                            exportingLessonId === item.id 
                                                ? "Exporting..." 
                                                : item.contentType === 'teacherGuide' ? "Export ULP (.docx)"
                                                : item.contentType === 'teacherAtg' ? "Export ATG (.docx)"
                                                : "Export as .docx"
                                        } 
                                        onClick={() => onAction('exportDocx', item)} 
                                        loading={exportingLessonId === item.id} 
                                        monet={monet} 
                                    />
                                </>
                            )}

                            {isLesson && <MenuItem icon={SparklesIcon} text="AI Quiz" onClick={() => onAction('generateQuiz', item)} disabled={isAiGenerating} monet={monet} /> }
                            <MenuItem icon={TrashIcon} text="Delete" onClick={() => onAction('delete', item)} monet={monet} />
                        </ActionMenu>
                    </div>
    
                    <div className={`hidden md:flex h-10 w-10 rounded-full items-center justify-center ml-2 ${monet ? 'bg-white/10 text-white/50 group-hover:text-white' : 'bg-slate-100/50 dark:bg-white/5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                        <ChevronRightIcon className="w-5 h-5 stroke-[2.5]" />
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => 
    prev.item.id === next.item.id && 
    prev.item.title === next.item.title &&
    prev.item.subtitle === next.item.subtitle &&
    prev.isReordering === next.isReordering && 
    prev.exportingLessonId === next.exportingLessonId && 
    prev.monet === next.monet
);

// --- HELPER: Render Table Buffer (Converts cleaned rows to HTML) ---
const renderTableBuffer = (rows) => {
    if (!rows || rows.length === 0) return '';
    
    // 1. Process Header
    const header = rows[0];
    // Remove outer pipes and split
    const headerCells = header.replace(/^\||\|$/g, '').split('|'); 
    
    let html = '<table border="1" style="width:100%; border-collapse: collapse; margin: 10px 0;"><thead><tr>';
    headerCells.forEach(c => {
        // Use marked.parseInline to handle bolding/italics within cells
        html += `<th style="border: 1px solid #666; padding: 6px; background-color: #e2e8f0; font-weight: bold; text-align: left;">${marked.parseInline(c.trim())}</th>`;
    });
    html += '</tr></thead><tbody>';

    // 2. Process Body
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.trim()) continue; // Skip empty rows

        // Remove outer pipes and split
        const cleanRow = row.replace(/^\||\|$/g, '');
        const cells = cleanRow.split('|');
        
        html += '<tr>';
        cells.forEach(c => {
            html += `<td style="border: 1px solid #666; padding: 6px;">${marked.parseInline(c.trim())}</td>`;
        });
        html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
};

// --- HELPER: Smart Markdown Table Parser (Robust) ---
const forceParseMarkdownTable = (text) => {
    if (!text) return text;

    // 1. Clean input: Replace non-breaking spaces, standardize newlines
    const cleanText = text
        .replace(/\u00A0/g, ' ') // Replace &nbsp;
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n</p>') 
        .replace(/<p>/gi, '\n<p>');

    const rawLines = cleanText.split('\n');
    
    // Regex to identify a separator line (e.g., |---| or |:---|)
    // Flexible: allows spaces, dashes, colons
    const isSeparator = (line) => {
        const collapsed = line.trim().replace(/\s/g, '');
        return /^\|?(:?-+:?\|)+:?-+:?\|?$/.test(collapsed);
    };

    let processedLines = [];
    let tableBuffer = [];
    let insideTable = false;

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        
        if (!line) {
            if (insideTable) {
                processedLines.push(renderTableBuffer(tableBuffer));
                tableBuffer = [];
                insideTable = false;
            }
            if (line === '') processedLines.push(''); 
            continue;
        }

        if (!insideTable) {
            // --- TABLE DETECTION & HEADER REPAIR ---
            // If line has a pipe, it MIGHT be a header. Check ahead.
            if (line.includes('|')) {
                let separatorIndex = -1;
                // Look ahead 1 line
                if (rawLines[i+1] && isSeparator(rawLines[i+1])) separatorIndex = i+1;
                // Look ahead 2 lines (Broken Header Case)
                else if (rawLines[i+2] && isSeparator(rawLines[i+2])) separatorIndex = i+2;

                if (separatorIndex > -1) {
                    insideTable = true;
                    
                    // MERGE HEADER: Combine lines from i to separatorIndex
                    let combinedHeader = line;
                    // If the header is split (separator is at i+2), merge the middle line
                    for(let k = i + 1; k < separatorIndex; k++) {
                        let nextPart = rawLines[k].trim();
                        // Clean up join
                        if (combinedHeader.endsWith('|')) combinedHeader = combinedHeader.slice(0, -1);
                        if (nextPart.startsWith('|')) nextPart = nextPart.substring(1);
                        combinedHeader += " " + nextPart;
                    }

                    tableBuffer.push(combinedHeader); // Add clean header
                    i = separatorIndex; // Advance loop to the separator line (skipping it)
                } else {
                    processedLines.push(line);
                }
            } else {
                processedLines.push(line);
            }
        } else {
            // --- INSIDE TABLE ---
            if (line.startsWith('|')) {
                tableBuffer.push(line);
            } else {
                // ROW REPAIR: Wrapped text belongs to previous cell
                if (tableBuffer.length > 0) {
                    let lastRow = tableBuffer[tableBuffer.length - 1];
                    let suffix = "";
                    if (lastRow.endsWith('|')) {
                        lastRow = lastRow.slice(0, -1);
                        suffix = "|";
                    }
                    tableBuffer[tableBuffer.length - 1] = lastRow + " " + line + suffix;
                }
            }
        }
    }

    if (tableBuffer.length > 0) {
        processedLines.push(renderTableBuffer(tableBuffer));
    }

    return processedLines.join('\n');
};

// --- HELPER: Pre-process HTML to Split Tables & Rescue Markdown ---
const preProcessHtmlForExport = (rawHtml, mode = 'pdf') => {

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

	// -------------------------
	// PHASE 1: GLOBAL MARKDOWN TABLE PARSER
	// -------------------------
	const textNodes = document.createTreeWalker(
	    tempDiv,
	    NodeFilter.SHOW_TEXT,
	    null,
	    false
	);

	let node;
	while ((node = textNodes.nextNode())) {
	    const value = node.nodeValue;

	    // Detect Markdown table blocks
	    if (value.includes('|') && value.includes('---')) {
	        try {
	            const htmlTable = forceParseMarkdownTable(value);

	            if (htmlTable.includes('<table')) {
	                const wrapper = document.createElement('div');
	                wrapper.innerHTML = htmlTable;

	                // Replace text node with converted HTML table
	                node.parentNode.replaceChild(wrapper, node);
	            }
	        } catch (e) {
	            console.warn("Markdown table conversion failed", e);
	        }
	    }
	}
    

    // -------------------------
    // PHASE 2: CLEAN INLINE WIDTHS
    // -------------------------
    tempDiv.querySelectorAll('[style]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const cleaned = style.replace(/(width|min-width|max-width):\s*[\d\.]+(px|%|pt|em|rem);?/gi, '');
        if (cleaned !== style) el.setAttribute('style', cleaned);
    });

    tempDiv.querySelectorAll('[width]').forEach(el => el.removeAttribute('width'));

    // Image cleanup
    tempDiv.querySelectorAll('img').forEach(img => {
        img.removeAttribute('width');
        img.removeAttribute('height');
        img.style.maxWidth = '450px';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px auto';
    });

    // -------------------------
    // PHASE 3: TABLE PROCESSING
    // -------------------------
    const tables = Array.from(tempDiv.querySelectorAll('table'));

    // ⭐⭐⭐ CRITICAL PATCH ⭐⭐⭐
    // APPLY INLINE STYLES TO .inner-table (Markdown nested tables)
    tables.forEach(table => {
        if (table.classList.contains("inner-table")) {
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            table.style.tableLayout = "auto";
            table.style.margin = "12px 0";
            table.style.border = "1px solid #666";

            table.querySelectorAll("th").forEach(th => {
                th.style.border = "1px solid #999";
                th.style.padding = "6px 8px";
                th.style.backgroundColor = "#f3f4f6";
                th.style.fontWeight = "bold";
                th.style.textAlign = "left";
                th.style.color = "#000";
            });

            table.querySelectorAll("td").forEach(td => {
                td.style.border = "1px solid #999";
                td.style.padding = "6px 8px";
                td.style.backgroundColor = "#fff";
                td.style.color = "#000";
                td.style.verticalAlign = "middle";
            });
        }
    });

    // -------------------------
    // APPLY DEFAULT TABLE CLEANUP
    // -------------------------
    tables.forEach(table => {
        table.style.width = '100%';
        table.removeAttribute('width');
        table.style.borderCollapse = 'collapse';
        table.setAttribute('border', '1');

        if (mode === 'ulp') {
            const rows = Array.from(table.rows || []);
            const parent = table.parentNode;

            const splitKeywords = [
                'PERFORMANCE TASK', 'SYNTHESIS', 'VALUES INTEGRATION',
                'DEEPEN', 'TRANSFER', 'MEANING-MAKING', 'APPLICATION',
                'FIRM-UP', 'EXPLORE'
            ];

            let currentTable = document.createElement('table');
            currentTable.style.width = '100%';
            currentTable.style.borderCollapse = 'collapse';
            currentTable.setAttribute('border', '1');
            parent.insertBefore(currentTable, table);

            let hasRowsInCurrent = false;

            rows.forEach(row => {
                const txt = (row.textContent || '').toUpperCase().trim();
                const isSectionHeader =
                    splitKeywords.some(keyword => txt.includes(keyword)) &&
                    txt.length < 150;

                if (isSectionHeader) {
                    const headerDiv = document.createElement('h3');
                    headerDiv.style.backgroundColor = '#e2e8f0';
                    headerDiv.style.padding = '10px';
                    headerDiv.style.marginTop = '20px';
                    headerDiv.style.marginBottom = '5px';
                    headerDiv.style.border = '1px solid #000';
                    headerDiv.style.fontWeight = 'bold';
                    headerDiv.style.fontFamily = 'DejaVu Sans, Arial, sans-serif';
                    headerDiv.textContent = row.textContent.trim();
                    parent.insertBefore(headerDiv, table);

                    // new table
                    currentTable = document.createElement('table');
                    currentTable.style.width = '100%';
                    currentTable.style.borderCollapse = 'collapse';
                    currentTable.setAttribute('border', '1');
                    parent.insertBefore(currentTable, table);

                    hasRowsInCurrent = false;
                } else {
                    Array.from(row.cells).forEach(cell => {
                        const cs = parseInt(cell.getAttribute('colspan'), 10);
                        if (!isNaN(cs) && cs > 5) {
                            cell.removeAttribute('colspan');
                        }
                        cell.style.border = '1px solid #000';
                        cell.style.padding = '5px';
                    });

                    currentTable.appendChild(row);
                    hasRowsInCurrent = true;
                }
            });

            if (!hasRowsInCurrent && currentTable.parentNode) {
                currentTable.remove();
            }

            table.remove();
        }
    });

    return tempDiv;
};

// --- HELPER: Sanitize PDF Structure (Ruthless Left-Column Shrink) ---
const cleanUpPdfContent = (content, inTable = false) => {
    if (!content) return;

    if (Array.isArray(content)) {
        content.forEach(item => cleanUpPdfContent(item, inTable));
        return;
    }

    if (typeof content === 'object') {

        if (content.content && Array.isArray(content.content)) {
            content.stack = content.content;
            delete content.content;
            cleanUpPdfContent(content.stack, inTable);
            return;
        }

        if (content.image) {
            const maxWidth = inTable ? 100 : 500; 
            content.fit = [maxWidth, 600];
            delete content.width; 
            delete content.height;
            content.alignment = 'center';
        }
        else {
            if (content.width !== undefined && content.width !== '*' && content.width !== 'auto') {
                delete content.width;
            }
            if (content.columns) {
                content.columns.forEach(col => {
                    col.width = '*'; 
                    cleanUpPdfContent(col, inTable);
                });
                delete content.columnGap;
            }
        }

        if (content.table) {
            delete content.width; 

            const body = content.table.body;
            if (body && Array.isArray(body) && body.length > 0) {
                const colCount = body[0].length;

                // --- WIDTH LOGIC ---
                if (colCount === 2) {
                    content.table.widths = ['25%', '75%'];
                } else {
                    const widths = [];
                    for(let k=0; k<colCount; k++) widths.push('*');
                    content.table.widths = widths;
                }
            
                content.layout = {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => '#444', 
                    vLineColor: () => '#444',
                    paddingLeft: () => 4, paddingRight: () => 4,
                    paddingTop: () => 4, paddingBottom: () => 4,
                };

                body.forEach(row => {
                    row.forEach(cell => {
                        if (typeof cell === 'object') {
                            delete cell.border; 
                            delete cell.borderColor; 
                            delete cell.width; 
                            cleanUpPdfContent(cell, true); 
                        }
                    });
                });
            }
        }

        if (content.stack) cleanUpPdfContent(content.stack, inTable);
        if (content.ul) cleanUpPdfContent(content.ul, inTable);
        if (content.ol) cleanUpPdfContent(content.ol, inTable);
    }
};

// --- MAIN COMPONENT ---
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole, monet }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    
    const styles = getStyles(monet);
    const { activeOverlay } = useTheme();
    const isExportingRef = useRef(false);

    // Modals
    const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
    const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
    const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
    const [viewLessonModalOpen, setViewLessonModalOpen] = useState(false);
    const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
    const [editQuizModalOpen, setEditQuizModalOpen] = useState(false);
    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);
    const [aiQuizModalOpen, setAiQuizModalOpen] = useState(false);
    const [isAiHubOpen, setIsAiHubOpen] = useState(false);

    // Context
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [unitForAi, setUnitForAi] = useState(null);
    const [lessonForAiQuiz, setLessonForAiQuiz] = useState(null);
    
    const { showToast } = useToast();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (!subject?.id) { setUnits([]); return; }
        if (onSetActiveUnit) { onSetActiveUnit(null); }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetched.sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
            setUnits(fetched);
        });
        return () => unsubscribe();
    }, [subject?.id, onSetActiveUnit]);

    useEffect(() => {
        if (!subject?.id) { setAllLessons([]); setAllQuizzes([]); return; }
        const lq = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
        const qq = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
        const unL = onSnapshot(lq, s => setAllLessons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unQ = onSnapshot(qq, s => setAllQuizzes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unL(); unQ(); };
    }, [subject?.id]);

    const handleExportDocx = async (lesson) => {
        if (isExportingRef.current) return;
        isExportingRef.current = true;
        setExportingLessonId(lesson.id);
    
        const isULP = lesson.contentType === 'teacherGuide';
        const isATG = lesson.contentType === 'teacherAtg';
        const isSpecialDoc = isULP || isATG;

        const docLabel = isULP ? "ULP" : (isATG ? "ATG" : "Lesson");
        const suffix = isULP ? "_ULP" : (isATG ? "_ATG" : "");
    
        const pageSize = isSpecialDoc 
            ? { width: 12240, height: 18720 } // Legal/Long
            : { width: 11906, height: 16838 }; // A4

        showToast(`Generating ${docLabel} .docx...`, "info");
    
        try {
            const lessonTitle = lesson.lessonTitle || lesson.title || 'document';
            const subjectTitle = subject?.title || "SRCS Learning Portal";
            const sanitizedFileName = (lessonTitle.replace(/[\\/:"*?<>|]+/g, '_') || 'document') + suffix + '.docx';
        
            const headerBase64 = await fetchImageAsBase64("/header-port.png").catch(()=>null);
            const footerBase64 = await fetchImageAsBase64("/Footer.png").catch(()=>null);

            const headerHtml = headerBase64 
                ? `<p align="center" style="text-align: center; margin-bottom: 0;">
                     <img src="${headerBase64}" width="650" style="width: 100%; max-width: 650px; height: auto;" />
                   </p>` 
                : '';

            const footerHtml = footerBase64 
                ? `<p align="center" style="text-align: center; margin-top: 0;">
                     <img src="${footerBase64}" width="650" style="width: 100%; max-width: 650px; height: auto;" />
                   </p>` 
                : '';

            let finalHtml = `
                <div style="font-family: 'DejaVu Sans', sans-serif; color: #333333;">
                    <div style="min-height: 900px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                         <div>
                            <h1 style="font-size: 32pt; font-weight: bold; margin-bottom: 20px; color: #000000;">${lessonTitle}</h1>
                            <p style="font-size: 18pt; font-style: italic; color: #666666;">${subjectTitle}</p>
                            <p style="font-size: 12pt; margin-top: 10px; color: #888;">${docLabel.toUpperCase()} DOCUMENT</p>
                         </div>
                    </div>
                    <div style="page-break-after: always;"></div>
                    `;

            const pages = Array.isArray(lesson.pages) && lesson.pages.length ? lesson.pages : [{ title: lesson.title || '', content: lesson.content || lesson.html || '' }];

            for (const page of pages) {
                const cleanTitle = (page.title || '').replace(/^page\s*\d+\s*[:-]?\s*/i, '');
            
                let rawHtml;
                if (isSpecialDoc) {
                    rawHtml = page.content || '';
                } else {
                    const processedContent = processLatex(page.content || '');
                    rawHtml = marked.parse(processedContent);
                }
            
                if (cleanTitle && !cleanTitle.includes('Unit Learning Plan') && !cleanTitle.includes('Adaptive Teaching Guide')) {
                     finalHtml += `<h2 style="color: #2563EB; font-size: 18pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; text-align: left;">${cleanTitle}</h2>`;
                }
                finalHtml += `<div style="font-size: 11pt; line-height: 1.5; text-align: justify;">${rawHtml}</div><br />`;
            }
            finalHtml += '</div>';

            const processedDiv = preProcessHtmlForExport(finalHtml, isULP ? 'ulp' : (isATG ? 'atg' : 'pdf'));

            const svgElements = processedDiv.querySelectorAll('svg');
            if (svgElements.length > 0) {
                await Promise.all(Array.from(svgElements).map(async (svg) => {
                    try {
                        const { dataUrl, width, height } = await convertSvgStringToPngDataUrl(svg.outerHTML);
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.setAttribute('width', width); 
                        img.setAttribute('height', height);
                        svg.parentNode.replaceChild(img, svg);
                    } catch (err) {
                        // ignore
                    }
                }));
            }

            const fileBlob = await htmlToDocx(
                processedDiv.innerHTML, 
                headerHtml, 
                {
                    table: { row: { cantSplit: false } }, 
                    header: true, 
                    footer: true,
                    pageNumber: true,
                    page: {
                        size: pageSize,
                        margin: { top: 2880, right: 1440, bottom: 1440, left: 1440 }
                    }
                },
                footerHtml
            );
        
            if (isNativePlatform()) {
                await nativeSave(fileBlob, sanitizedFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', showToast);
            } else {
                saveAs(fileBlob, sanitizedFileName);
            }
        } catch (error) {
            console.error("Export Error:", error);
            showToast("Failed to create Word document.", "error");
        } finally {
            isExportingRef.current = false;
            setExportingLessonId(null);
        }
    };

    // --- SMART EXPORT: PDF ---
    const handleExportLessonPdf = async (lesson) => {
        if (exportingLessonId) return;
        setExportingLessonId(lesson.id);

        const isULP = lesson.contentType === 'teacherGuide';
        const isATG = lesson.contentType === 'teacherAtg';
        const isSpecialDoc = isULP || isATG;
    
        const docLabel = isULP ? "ULP" : (isATG ? "ATG" : "Lesson");
        const suffix = isULP ? "_ULP" : (isATG ? "_ATG" : "");

        const pageSize = isSpecialDoc ? { width: 612, height: 936 } : 'A4';
        const pageMargins = isSpecialDoc ? [36, 80, 36, 60] : [40, 80, 40, 80];

        showToast(`Preparing ${docLabel} PDF...`, "info");
        try {
            await registerDejaVuFonts();
            const headerBase64 = await fetchImageAsBase64("/header-port.png").catch(()=>null);
            const footerBase64 = await fetchImageAsBase64("/Footer.png").catch(()=>null);
        
            const pages = Array.isArray(lesson.pages) && lesson.pages.length ? lesson.pages : [{ title: lesson.title || '', content: lesson.content || lesson.html || '' }];

            let lessonContent = [];

            for (const page of pages) {
                const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
            
                if (cleanTitle && !cleanTitle.includes('Unit Learning Plan') && !cleanTitle.includes('Adaptive Teaching Guide')) {
                    lessonContent.push({ text: cleanTitle, fontSize: 20, bold: true, color: '#005a9c', margin: [0, 20, 0, 8] });
                }
            
                let rawHtml;
                if (isSpecialDoc) {
                    rawHtml = page.content || '';
                } else {
                    rawHtml = marked.parse(processLatex(page.content || ''));
                }

                // Split tables, fix columns, remove fixed widths
                const processedDiv = preProcessHtmlForExport(rawHtml, isULP ? 'ulp' : (isATG ? 'atg' : 'pdf'));
            
                const svgs = processedDiv.querySelectorAll('svg');
                if (svgs.length) {
                    await Promise.all(Array.from(svgs).map(async (svg) => {
                        try {
                            const res = await convertSvgStringToPngDataUrl(svg.outerHTML);
                            const img = document.createElement('img');
                            img.src = res.dataUrl; img.width = res.width;
                            svg.parentNode.replaceChild(img, svg);
                        } catch (e) {
                            // ignore
                        }
                    }));
                }
            
                const finalHtml = processedDiv.innerHTML;
            
                let pdfBody = htmlToPdfmake(finalHtml, { 
                    defaultStyles: { 
                        fontSize: 6, 
                        lineHeight: 1.1, 
                        alignment: 'justify' 
                    },
                    tableAutoSize: true, 
                    imagesByReference: true
                });

                if (!Array.isArray(pdfBody)) {
                    if (pdfBody.content && Array.isArray(pdfBody.content)) {
                        pdfBody = pdfBody.content;
                    } else {
                        pdfBody = [pdfBody];
                    }
                }

                // Clean and sanitize pdfBody to enforce widths and prevent overflow
                cleanUpPdfContent(pdfBody, isULP ? 'ulp' : (isATG ? 'atg' : 'pdf'));

                if (pdfBody.length > 0) {
                    lessonContent.push(...pdfBody);
                }
            }

            const docDef = {
                pageSize: pageSize,
                pageMargins: pageMargins,
                header: headerBase64 ? { margin: [0, 20, 0, 0], stack: [{ image: "headerImg", width: 450, alignment: "center" }] } : undefined,
                footer: footerBase64 ? { margin: [0, 0, 0, 20], stack: [{ image: "footerImg", width: 450, alignment: "center" }] } : undefined,
                content: [
                    { text: lesson.title || '', fontSize: 28, bold: true, alignment: "center", margin: [0, 12, 0, 8] },
                    { text: subject?.title || "", fontSize: 14, italics: true, alignment: "center", color: '#555555', margin: [0, 0, 0, 10], pageBreak: "after" },
                    ...lessonContent
                ],
                images: {},
                defaultStyle: { font: 'DejaVu' }
            };

            if (headerBase64) docDef.images.headerImg = headerBase64;
            if (footerBase64) docDef.images.footerImg = footerBase64;

            const pdfDoc = pdfMake.createPdf(docDef);
            if (isNativePlatform()) {
                pdfDoc.getBlob(b => nativeSave(b, `${(lesson.title || 'export').replace(/[^a-z0-9]/gi, '_')}${suffix}.pdf`, 'application/pdf', showToast));
            } else {
                pdfDoc.download(`${(lesson.title || 'export').replace(/[^a-z0-9]/gi, '_')}${suffix}.pdf`);
            }
            
        } catch (e) { 
            console.error("PDF Export Error:", e);
            showToast("PDF Error: " + (e.message || e), "error"); 
        }
        setExportingLessonId(null);
    };

    const handleAction = useCallback((type, item) => {
        switch(type) {
            case 'select': onSetActiveUnit(item); break;
            case 'edit': if(item.type) { 
                item.type === 'lesson' ? (setSelectedLesson(item), setEditLessonModalOpen(true)) : (setSelectedQuiz(item), setEditQuizModalOpen(true));
            } else { setSelectedUnit(item); setEditUnitModalOpen(true); } break;
            case 'delete': if(item.type) onInitiateDelete(item.type, item.id, item.title, item.subjectId); 
                           else onInitiateDelete('unit', item.id, item.title, item.subjectId); break;
            case 'view': item.type === 'lesson' ? (setSelectedLesson(item), setViewLessonModalOpen(true)) : (setSelectedQuiz(item), setViewQuizModalOpen(true)); break;
            case 'ai': setUnitForAi(item); setIsAiHubOpen(true); break;
            case 'reorder': setIsReordering(true); break;
            case 'generateQuiz': setLessonForAiQuiz(item); setAiQuizModalOpen(true); break;
            case 'exportPdf': handleExportLessonPdf(item); break;
            case 'exportDocx': handleExportDocx(item); break;
        }
    }, [onSetActiveUnit, onInitiateDelete]);

    const unifiedContent = useMemo(() => {
        if (!activeUnit) return [];
        return [
            ...allLessons.filter(l => l.unitId === activeUnit.id).map(l => ({...l, type: 'lesson'})),
            ...allQuizzes.filter(q => q.unitId === activeUnit.id).map(q => ({...q, type: 'quiz'}))
        ].sort((a,b) => (a.order??0) - (b.order??0));
    }, [activeUnit, allLessons, allQuizzes]);

    const handleDragEnd = async (e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        if (active.data.current.type === 'unit') {
            const oldIdx = units.findIndex(u => u.id === active.id);
            const newIdx = units.findIndex(u => u.id === over.id);
            const reordered = arrayMove(units, oldIdx, newIdx);
            setUnits(reordered);
            const batch = writeBatch(db);
            reordered.forEach((u, i) => batch.update(doc(db, 'units', u.id), { order: i }));
            await batch.commit();
        } else {
            const oldIdx = unifiedContent.findIndex(i => i.id === active.id);
            const newIdx = unifiedContent.findIndex(i => i.id === over.id);
            const reordered = arrayMove(unifiedContent, oldIdx, newIdx);
            
            setAllLessons(prev => [...prev.filter(l => l.unitId !== activeUnit.id), ...reordered.filter(i => i.type === 'lesson')]);
            setAllQuizzes(prev => [...prev.filter(q => q.unitId !== activeUnit.id), ...reordered.filter(i => i.type === 'quiz')]);

            const batch = writeBatch(db);
            reordered.forEach((item, index) => {
                 batch.update(doc(db, item.type === 'lesson' ? 'lessons' : 'quizzes', item.id), { order: index });
            });
            await batch.commit();
        }
    };

    const getMonetHeaderBg = () => {
        switch (activeOverlay) {
            case 'christmas': return 'bg-[#0f172a]/95';
            case 'valentines': return 'bg-[#2c0b0e]/95';
            case 'graduation': return 'bg-[#1a1400]/95';
            case 'rainy': return 'bg-[#061816]/95';
            case 'cyberpunk': return 'bg-[#180a20]/95';
            case 'spring': return 'bg-[#1f0f15]/95';
            case 'space': return 'bg-[#020617]/95';
            default: return 'bg-[#1A1D24]/95';
        }
    };

    const headerBg = monet 
        ? `${getMonetHeaderBg()} backdrop-blur-xl border-b border-white/10 shadow-sm z-40`
        : 'bg-slate-50/90 dark:bg-[#0F1115]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/5 z-40';

    const headerText = monet
        ? 'text-white'
        : 'text-slate-800 dark:text-white';

    const headerSubText = monet
        ? 'text-white/60'
        : 'text-slate-500';

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    <div className="relative">
                        {/* --- MODIFIED HEADER LAYOUT: Single Row, Smaller Text, Truncated Title --- */}
                        <div className={`sticky top-0 -mx-4 px-4 md:px-6 pt-3 pb-3 mb-6 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 ${headerBg}`}>
                            <div className="min-w-0 flex-1">
                                <h2 className={`text-lg md:text-xl font-black tracking-tight leading-tight truncate ${headerText}`}>
                                    {activeUnit.title}
                                </h2>
                                <p className={`text-xs md:text-xs font-medium truncate ${headerSubText}`}>Manage Lessons & Quizzes</p>
                            </div>
                            
                            <div className="flex-shrink-0 flex items-center gap-2">
                                {/* AI Button REMOVED here */}

                                {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                
                                <button onClick={() => setIsReordering(!isReordering)} className={`${styles.secondaryButton} !px-3 !py-1.5 text-xs md:text-sm`}>
                                    {isReordering ? 'Done' : 'Reorder'}
                                </button>
                                
                                <AddContentButton 
                                    onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                    onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                    monet={monet}
                                    styles={styles}
                                    className="!px-3 !py-1.5 text-xs md:text-sm"
                                />
                            </div>
                        </div>

                        <div className="pb-20 px-1 md:px-2">
                            {unifiedContent.length > 0 ? (
                                <SortableContext items={unifiedContent.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    {unifiedContent.map(item => (
                                        <SortableContentItem key={item.id} item={item} isReordering={isReordering} onAction={handleAction} exportingLessonId={exportingLessonId} isAiGenerating={isAiGenerating} monet={monet} styles={styles} />
                                    ))}
                                </SortableContext>
                            ) : (
                                <div className={`flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[2.5rem] backdrop-blur-md mx-2 ${monet ? 'bg-black/20 border-white/10' : 'border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5'}`}>
                                    <div className={`h-24 w-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl ring-1 ring-black/5 ${monet ? 'bg-white/10' : 'bg-white dark:bg-white/10'}`}>
                                        <RectangleStackIcon className={`h-12 w-12 ${monet ? 'text-white/60' : 'text-slate-300 dark:text-slate-500'}`} />
                                    </div>
                                    <h3 className={`text-xl font-bold ${monet ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Empty Unit</h3>
                                    <p className={`mb-6 font-medium text-center px-4 ${monet ? 'text-white/60' : 'text-slate-500'}`}>Add your first lesson or quiz to get started.</p>
                                    <AddContentButton 
                                        onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                        onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                        monet={monet}
                                        styles={styles}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        {units.length > 0 && (
                            <div className="flex justify-end mb-4">
                                <button 
                                    onClick={() => setIsReordering(!isReordering)} 
                                    className={`${styles.secondaryButton} !px-4 !py-2 text-sm`}
                                >
                                    {isReordering ? (
                                        <>Done</>
                                    ) : (
                                        <>
                                            <ArrowsUpDownIcon className="w-4 h-4" /> 
                                            Reorder Units
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {isReordering && (
                            <div className={`sticky top-0 z-30 mb-6 p-4 backdrop-blur-xl rounded-2xl border flex justify-between items-center animate-in slide-in-from-top-2 ${monet ? 'bg-black/20 border-white/10' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                <span className={`font-bold flex items-center gap-2 text-sm md:text-base ${monet ? 'text-white' : 'text-blue-600 dark:text-blue-300'}`}>
                                    <ArrowsUpDownIcon className="w-5 h-5" /> Reordering Mode
                                </span>
                                <button onClick={() => setIsReordering(false)} className={`${styles.primaryButton} !py-1 !px-4 text-sm`}>Done</button>
                            </div>
                        )}

                        {units.length > 0 ? (
                            <div className="flex flex-col gap-3 md:gap-4 pb-20">
                                <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                                    {units.map((unit, idx) => (
                                        <SortableUnitListRow key={unit.id} unit={unit} index={idx} onSelect={onSetActiveUnit} onAction={handleAction} isReordering={isReordering} monet={monet} styles={styles} />
                                    ))}
                                </SortableContext>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-60">
                                <QueueListIcon className={`w-20 h-20 mb-4 ${monet ? 'text-white/30' : 'text-slate-300 dark:text-slate-600'}`} />
                                <h3 className={`text-2xl font-bold ${monet ? 'text-white/60' : 'text-slate-900 dark:text-white'}`}>No Units Yet</h3>
                            </div>
                        )}
                    </div>
                )}
            </DndContext>

            {/* Modals */}
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