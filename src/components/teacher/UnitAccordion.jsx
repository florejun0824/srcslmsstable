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
    FolderIcon,
    PresentationChartBarIcon
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
    rectSortingStrategy,
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
            // UPDATED: Content Item now adopts the 'secondary button' style of the theme for consistent coloring
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

let dejaVuLoaded = false;
async function registerDejaVuFonts() {
  if (dejaVuLoaded) return;
  try {
    await loadFontToVfs("DejaVuSans.ttf", "/fonts/DejaVuSans.ttf");
    await loadFontToVfs("DejaVuSans-Bold.ttf", "/fonts/DejaVuSans-Bold.ttf");
    await loadFontToVfs("DejaVuSans-Oblique.ttf", "/fonts/DejaVuSans-Oblique.ttf");
    await loadFontToVfs("DejaVuSans-BoldOblique.ttf", "/fonts/DejaVuSans-BoldOblique.ttf");
    pdfMake.fonts = {
      DejaVu: { normal: "DejaVuSans.ttf", bold: "DejaVuSans-Bold.ttf", italics: "DejaVuSans-Oblique.ttf", bolditalics: "DejaVuSans-BoldOblique.ttf" },
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
            const aspectRatio = img.height / img.width;
            const width = MAX_WIDTH;
            const height = width * aspectRatio;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
        };
        img.onerror = () => reject(new Error("SVG Load Failed"));
        img.src = src;
    });
};

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1,2,3].map(i => (
            <div key={i} className="h-48 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
        ))}
    </div>
);

// Menus
const MenuPortal = ({ children, menuStyle, onClose, monet }) => {
    const menuRef = useRef(null);
    
    useEffect(() => {
        const handler = (e) => { 
            // Close if clicking outside the menu
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose(); 
            }
        };
        // Add mousedown listener to window
        window.addEventListener('mousedown', handler); 
        // Also listen to scroll to close menu on scroll (optional but recommended for floating menus)
        window.addEventListener('scroll', onClose, true);
        
        return () => {
            window.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [onClose]);
    
    const containerClass = monet 
        ? `fixed backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/10 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 bg-[#1E212B]/90 border border-white/10`
        : `fixed bg-white/90 dark:bg-[#1E212B]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 border border-white/20 dark:border-white/5`;

    return createPortal(
        <div 
            ref={menuRef} 
            style={menuStyle} // This now contains top/bottom/right coordinates
            className={containerClass}
        >
            {children}
        </div>, 
        document.body
    );
};

const ActionMenu = ({ children, monet, styles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const iconRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();

        if (isOpen) {
            setIsOpen(false);
            return;
        }

        // --- FIX FOR OVERFLOW (Problem 2) ---
        const rect = iconRef.current.getBoundingClientRect();
        const screenHeight = window.innerHeight;
        const spaceBelow = screenHeight - rect.bottom;
        
        // Estimate menu height (approx 40px per item * 5 items = ~200px)
        // If space below is less than 220px, flip upwards
        const shouldFlip = spaceBelow < 220; 

        let newStyle = { 
            right: `${window.innerWidth - rect.right}px`, 
            minWidth: '180px',
            position: 'fixed',
            zIndex: 9999
        };

        if (shouldFlip) {
            // Position above the button
            newStyle.bottom = `${screenHeight - rect.top + 5}px`;
            newStyle.transformOrigin = 'bottom right';
        } else {
            // Position below the button
            newStyle.top = `${rect.bottom + 5}px`;
            newStyle.transformOrigin = 'top right';
        }

        setMenuStyle(newStyle);
        setIsOpen(true);
    };

    // Helper to close menu
    const closeMenu = () => setIsOpen(false);

    return (
        <>
            <div ref={iconRef} onClick={handleToggle} className={`${styles.iconButton} relative z-20 cursor-pointer`}>
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={closeMenu} monet={monet}>
                    {/* --- FIX FOR STICKY MENU (Problem 1) --- */}
                    {/* We map over the children (MenuItems) and inject the closeMenu function */}
                    {React.Children.map(children, (child) => {
                        if (React.isValidElement(child)) {
                            return React.cloneElement(child, {
                                onClick: (e) => {
                                    // Execute the original action
                                    if (child.props.onClick) child.props.onClick(e);
                                    // Close the menu immediately
                                    closeMenu();
                                }
                            });
                        }
                        return child;
                    })}
                </MenuPortal>
            )}
        </>
    );
};

const MenuItem = ({ icon: Icon, text, onClick, disabled, loading, monet }) => (
    <button 
        onClick={onClick} 
        disabled={disabled || loading} 
        className={`flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${monet ? 'hover:bg-white/10 text-white' : 'hover:bg-blue-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}
    >
        <Icon className={`h-4 w-4 mr-3 ${loading ? 'animate-spin text-blue-500' : (monet ? 'text-white/60' : 'text-slate-400')}`} />
        {text}
    </button>
);

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
    
    // FIX: Wrapper functions to close the menu immediately
    const handleAddLesson = () => { onAddLesson(); setIsOpen(false); };
    const handleAddQuiz = () => { onAddQuiz(); setIsOpen(false); };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${styles.primaryButton} !px-4 !py-2 text-sm md:text-base`}>
                <PlusIcon className="w-5 h-5" /> <span className="hidden md:inline">Add Content</span> <span className="md:hidden">Add</span>
            </button>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)} monet={monet}>
                <MenuItem icon={DocumentTextIcon} text="Add Lesson" onClick={handleAddLesson} monet={monet} />
                <MenuItem icon={ClipboardDocumentListIcon} text="Add Quiz" onClick={handleAddQuiz} monet={monet} />
            </MenuPortal>}
        </>
    );
};

// --- SORTABLE UNIT CARD ---
const SortableUnitCard = memo(({ unit, onSelect, onAction, isReordering, index, monet, styles }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: unit.id, data: { type: 'unit' }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    
    // Default Aurora Gradients (Fallback)
    const gradients = [
        "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 dark:from-cyan-900 dark:via-blue-900 dark:to-indigo-950",
        "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 dark:from-purple-900 dark:via-pink-900 dark:to-rose-950",
        "bg-gradient-to-br from-teal-400 via-emerald-500 to-green-600 dark:from-teal-900 dark:via-emerald-900 dark:to-green-950",
        "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 dark:from-amber-900 dark:via-orange-900 dark:to-red-950"
    ];

    const activeGradient = monet ? styles.unitCard : gradients[index % gradients.length];
    const glassOverlay = "after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/10 after:to-white/10 after:pointer-events-none";
    const cardClasses = isReordering 
        ? "bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 opacity-80"
        : `${activeGradient} ${glassOverlay} text-white shadow-xl shadow-slate-300/50 dark:shadow-black/50 hover:-translate-y-1 hover:shadow-2xl`;

    const iconContainerClass = monet 
        ? `h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner ${monet.iconBox || 'bg-white/20'}`
        : `h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/30`;

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="h-full group">
            <div onClick={() => !isReordering && onSelect(unit)} className={`relative flex flex-col h-full p-6 rounded-[2.5rem] transition-all duration-300 overflow-hidden cursor-pointer ${cardClasses}`}>
                {!isReordering && <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/20 to-transparent rotate-45 pointer-events-none" />}
                <div className="relative z-10 flex justify-between items-start w-full">
                    <div className={iconContainerClass}>
                        <FolderIcon className="h-7 w-7 text-white drop-shadow-md" />
                    </div>
                    {isReordering ? (
                        <button {...listeners} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 cursor-grab"><ArrowsUpDownIcon className="h-5 w-5 text-slate-500" /></button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onAction('ai', unit); }} className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-colors border border-white/20">
                                <SparklesIcon className="w-5 h-5 text-yellow-300 drop-shadow-sm" />
                            </button>
                            <ActionMenu monet={monet} styles={styles}>
                                <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} monet={monet} />
                                {/* [ADDED] Reorder Option in Menu */}
                                <MenuItem icon={ArrowsUpDownIcon} text="Reorder" onClick={(e) => { e.stopPropagation(); onAction('reorder', unit); }} monet={monet} />
                                <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} monet={monet} />
                            </ActionMenu>
                        </div>
                    )}
                </div>
                <div className="relative z-10 mt-auto pt-6">
                    <h3 className="text-2xl font-black leading-tight tracking-tight drop-shadow-md text-white">
                        {unit.title}
                    </h3>
                    {!isReordering && (
                        <div className="flex items-center justify-between mt-3 opacity-90">
                            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Open Unit</span>
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                                <ChevronRightIcon className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
    // UPDATED MEMO COMPARISON TO INCLUDE MONET
}, (prev, next) => prev.unit.id === next.unit.id && prev.unit.title === next.unit.title && prev.isReordering === next.isReordering && prev.index === next.index && prev.monet === next.monet);

// --- SORTABLE CONTENT (LESSON) ROW ---
const SortableContentItem = memo(({ item, isReordering, onAction, exportingLessonId, isAiGenerating, monet, styles }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id, data: { type: item.type, unitId: item.unitId }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    const isLesson = item.type === 'lesson';
    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;

    // Candy Styles based on type (Defaults)
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

    // Monet overrides
    // Uses the generic 'buttonSecondary' style which usually contains the main theme color (e.g., Red for Valentines)
    // but in a lighter/transparent way suitable for buttons/cards.
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
                {/* Drag Handle */}
                {isReordering && (
                    <button {...listeners} className="p-2 mr-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-grab active:cursor-grabbing">
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}

                {/* Juicy Icon */}
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

                {/* Content Info */}
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

                {/* Actions & Chevron */}
                <div className={`
                    flex items-center gap-1 transition-all duration-300
                    ${isReordering ? 'opacity-0' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:translate-x-4 md:group-hover:translate-x-0'}
                `}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu monet={monet} styles={styles}>
                          <MenuItem icon={PencilIcon} text="Edit" onClick={() => onAction('edit', item)} monet={monet} />
                          {isLesson && (
                            <>
                                <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as PDF"} onClick={() => onAction('exportPdf', item)} loading={exportingLessonId === item.id} monet={monet} />
                                <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as .docx"} onClick={() => onAction('exportDocx', item)} loading={exportingLessonId === item.id} monet={monet} />
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
    // UPDATED MEMO COMPARISON TO INCLUDE MONET
}, (prev, next) => 
    prev.item.id === next.item.id && 
    prev.item.title === next.item.title && // Check if title changed
    prev.item.subtitle === next.item.subtitle && // Check if subtitle changed
    prev.isReordering === next.isReordering && 
    prev.exportingLessonId === next.exportingLessonId && 
    prev.monet === next.monet
);


// --- MAIN COMPONENT ---
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole, monet }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    
    // Get styles based on monet prop
    const styles = getStyles(monet);
    const { activeOverlay } = useTheme();

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
    const isExportingRef = useRef(false);

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
        showToast("Generating .docx file...", "info");
        
        try {
            const lessonTitle = lesson.lessonTitle || lesson.title;
            const subjectTitle = subject?.title || "SRCS Learning Portal";
            const sanitizedFileName = (lessonTitle.replace(/[\\/:"*?<>|]+/g, '_') || 'lesson') + '.docx';
            
            const headerBase64 = await fetchImageAsBase64("/header-port.png");
            const footerBase64 = await fetchImageAsBase64("/Footer.png");
            const headerHtml = `<div style="text-align: center;"><img src="${headerBase64}" width="450" /></div>`;
            const footerHtml = `<div style="text-align: center;"><img src="${footerBase64}" width="450" /></div>`;

            let finalHtml = `
                <div style="font-family: 'DejaVu Sans', sans-serif; color: #333333;">
                    <div style="min-height: 900px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                         <div>
                            <h1 style="font-size: 32pt; font-weight: bold; margin-bottom: 20px; color: #000000;">${lessonTitle}</h1>
                            <p style="font-size: 18pt; font-style: italic; color: #666666;">${subjectTitle}</p>
                         </div>
                    </div>
                    <div style="page-break-after: always;"></div>
                    `;

            for (const page of lesson.pages) {
                const cleanTitle = (page.title || '').replace(/^page\s*\d+\s*[:-]?\s*/i, '');
                const contentString = typeof page.content === 'string' ? page.content : '';
                const processedContent = processLatex(contentString);
                const rawHtml = marked.parse(processedContent);
                
                finalHtml += `
                    <h2 style="color: #2563EB; font-size: 18pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; text-align: left;">${cleanTitle}</h2>
                    <div style="font-size: 11pt; line-height: 1.5; text-align: justify;">${rawHtml}</div>
                    <br />
                `;
            }
            finalHtml += '</div>';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = finalHtml;
            const svgElements = tempDiv.querySelectorAll('svg');
            if (svgElements.length > 0) {
                const conversionPromises = Array.from(svgElements).map(async (svg) => {
                    try {
                        const { dataUrl, width, height } = await convertSvgStringToPngDataUrl(svg.outerHTML);
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.setAttribute('width', width); 
                        img.setAttribute('height', height);
                        svg.parentNode.replaceChild(img, svg);
                    } catch (err) { console.error("SVG Conversion failed", err); }
                });
                await Promise.all(conversionPromises);
            }

            const fileBlob = await htmlToDocx(
                tempDiv.innerHTML, 
                headerHtml, 
                {
                    table: { row: { cantSplit: true } },
                    footer: true,
                    pageNumber: true,
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
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

    const handleExportLessonPdf = async (lesson) => {
        if (exportingLessonId) return;
        setExportingLessonId(lesson.id);
        showToast("Preparing PDF...", "info");
        try {
            await registerDejaVuFonts();
            const headerBase64 = await fetchImageAsBase64("/header-port.png");
            const footerBase64 = await fetchImageAsBase64("/Footer.png");
            
            let lessonContent = [];
            for (const page of lesson.pages) {
                const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
                if (cleanTitle) lessonContent.push({ text: cleanTitle, fontSize: 20, bold: true, color: '#005a9c', margin: [0, 20, 0, 8] });
                
                let html = marked.parse(processLatex(page.content || ''));
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const svgs = tempDiv.querySelectorAll('svg');
                if (svgs.length) {
                    await Promise.all(Array.from(svgs).map(async (svg) => {
                        try {
                            const res = await convertSvgStringToPngDataUrl(svg.outerHTML);
                            const img = document.createElement('img');
                            img.src = res.dataUrl; img.width = res.width;
                            svg.parentNode.replaceChild(img, svg);
                        } catch (e) {}
                    }));
                    html = tempDiv.innerHTML;
                }
                lessonContent.push(htmlToPdfmake(html, { defaultStyles: { fontSize: 11, lineHeight: 1.5, alignment: 'justify' } }));
            }

            const docDef = {
                pageSize: "A4", pageMargins: [72, 100, 72, 100],
                header: { margin: [0, 20, 0, 0], stack: [{ image: "headerImg", width: 450, alignment: "center" }] },
                footer: { margin: [0, 0, 0, 20], stack: [{ image: "footerImg", width: 450, alignment: "center" }] },
                content: [
                    { text: lesson.title, fontSize: 32, bold: true, alignment: "center", margin: [0, 200, 0, 0] },
                    { text: subject?.title || "", fontSize: 18, italics: true, alignment: "center", color: '#555555', pageBreak: "after" },
                    ...lessonContent
                ],
                images: { headerImg: headerBase64, footerImg: footerBase64 },
                defaultStyle: { font: 'DejaVu' }
            };
            
            const pdfDoc = pdfMake.createPdf(docDef);
            isNativePlatform() 
                ? pdfDoc.getBlob(b => nativeSave(b, `${lesson.title}.pdf`, 'application/pdf', showToast))
                : pdfDoc.download(`${lesson.title}.pdf`);
                
        } catch (e) { showToast("PDF Error", "error"); }
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

    // Header Background Logic (Solid for Monet)
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
                        <div className={`sticky top-0 -mx-4 px-4 md:px-6 pt-4 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in slide-in-from-top-2 ${headerBg}`}>
                            <div>
                                <h2 className={`text-2xl md:text-3xl font-black tracking-tight leading-tight ${headerText}`}>{activeUnit.title}</h2>
                                <p className={`text-sm md:text-base font-medium ${headerSubText}`}>Manage Lessons & Quizzes</p>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                <button onClick={() => setIsReordering(!isReordering)} className={`${styles.secondaryButton} flex-1 md:flex-none`}>
                                    {isReordering ? 'Done' : 'Reorder'}
                                </button>
                                <div className="flex-1 md:flex-none">
                                    <AddContentButton 
                                        onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                        onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                        monet={monet}
                                        styles={styles}
                                    />
                                </div>
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
                        {/* [ADDED] Global Unit Reorder Toolbar */}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                <SortableContext items={units.map(u => u.id)} strategy={rectSortingStrategy}>
                                    {units.map((unit, idx) => (
                                        <SortableUnitCard key={unit.id} unit={unit} index={idx} onSelect={onSetActiveUnit} onAction={handleAction} isReordering={isReordering} monet={monet} styles={styles} />
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