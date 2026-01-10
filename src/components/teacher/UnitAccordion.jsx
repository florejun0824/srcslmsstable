// src/components/teacher/UnitAccordion.jsx
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
// Note: We removed heavy exports from here
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
    XMarkIcon,       
    PlayCircleIcon,
    AcademicCapIcon,
    BookOpenIcon,
    ClockIcon
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
import { useToast } from '../../contexts/ToastContext';

// --- STYLES ---
const performanceStyles = {
    touchAction: 'pan-y', 
    backfaceVisibility: 'hidden', 
};

// --- ONE UI 8.0 BUTTON STYLES ---
const oneUiBtnBase = `
    relative font-bold rounded-full transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 
    active:scale-95 tracking-wide text-xs
`;

const getStyles = (monet) => {
    if (monet) {
        const btnPrimaryClass = monet.btnPrimary || monet.buttonPrimary || 'bg-blue-600 text-white';
        const btnTonalClass = monet.btnTonal || monet.buttonSecondary || 'bg-slate-100 text-slate-900';
        
        return {
            primaryButton: `${oneUiBtnBase} ${btnPrimaryClass} px-4 py-2 shadow-sm border border-transparent`,
            secondaryButton: `${oneUiBtnBase} ${btnTonalClass} px-3 py-2 border border-transparent`, 
            iconButton: `p-2 rounded-full aspect-square ${btnTonalClass} bg-transparent hover:bg-black/5 dark:hover:bg-white/10 transition-colors`,
            contentItem: `bg-white dark:bg-[#1E212B] border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.02)]`, 
            iconBox: monet.iconBg
        };
    }
    return {
        primaryButton: `${oneUiBtnBase} bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2 shadow-sm`,
        secondaryButton: `${oneUiBtnBase} bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#3A3A3C] px-3 py-2`,
        iconButton: `p-2 rounded-full aspect-square text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors`,
        contentItem: `bg-white dark:bg-[#1E212B] border border-slate-100 dark:border-[#2C2C2E] shadow-sm`,
        iconBox: `bg-slate-100 text-slate-600 dark:bg-[#2C2C2E] dark:text-slate-300`
    };
};

// --- LAZY RETRY HELPER ---
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

// --- LAZY LOADED MODALS ---
const AddLessonModal = lazyWithRetry(() => import('./AddLessonModal'));
const AddQuizModal = lazyWithRetry(() => import('./AddQuizModal'));
const EditLessonModal = lazyWithRetry(() => import('./EditLessonModal'));
const ViewLessonModal = lazyWithRetry(() => import('./ViewLessonModal'));
const EditUnitModal = lazyWithRetry(() => import('./EditUnitModal'));
const EditQuizModal = lazyWithRetry(() => import('./EditQuizModal.jsx'));
const ViewQuizModal = lazyWithRetry(() => import('./ViewQuizModal'));
const AiQuizModal = lazyWithRetry(() => import('./AiQuizModal'));
const AiGenerationHub = lazyWithRetry(() => import('./AiGenerationHub'));

// --- COMPONENTS ---
const ContentListSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        {[1,2,3,4].map(i => (
            <div key={i} className="h-28 rounded-[22px] bg-slate-100 dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E]" />
        ))}
    </div>
);

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
        ? `fixed z-[9999] bg-white dark:bg-[#252525] rounded-[24px] shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 min-w-[200px]` 
        : `fixed z-[9999] bg-white dark:bg-[#252525] rounded-[24px] shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 min-w-[200px] border border-slate-100 dark:border-[#2C2C2E]`;

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
        if (isOpen) {
            setIsOpen(false);
            return;
        }
        const rect = iconRef.current.getBoundingClientRect();
        const screenHeight = window.innerHeight;
        const spaceBelow = screenHeight - rect.bottom;
        const shouldFlip = spaceBelow < 220;

        let newStyle = {
            right: `${window.innerWidth - rect.right}px`,
            position: 'fixed',
            zIndex: 9999
        };

        if (shouldFlip) {
            newStyle.bottom = `${screenHeight - rect.top + 5}px`;
            newStyle.transformOrigin = 'bottom right';
        } else {
            newStyle.top = `${rect.bottom + 5}px`;
            newStyle.transformOrigin = 'top right';
        }
        setMenuStyle(newStyle);
        setIsOpen(true);
    };

    const closeMenu = () => setIsOpen(false);

    return (
        <>
            <div ref={iconRef} onClick={handleToggle} className={`${styles.iconButton} relative z-20 cursor-pointer rounded-full`}>
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={closeMenu} monet={monet}>
                    <MenuContext.Provider value={closeMenu}>{children}</MenuContext.Provider>
                </MenuPortal>
            )}
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
    
    const activeClass = monet 
        ? `hover:${monet.btnTonal || 'bg-slate-100'}` 
        : `hover:bg-slate-100 dark:hover:bg-[#3A3A3C]`;

    return (
        <button 
            onClick={handleClick} 
            disabled={disabled || loading} 
            className={`flex items-center w-full px-4 py-3 text-sm font-bold rounded-[18px] transition-colors text-slate-700 dark:text-slate-200 ${activeClass}`}
        >
            <Icon className={`h-5 w-5 mr-3 ${loading ? 'animate-spin text-blue-500' : (monet ? '' : 'text-slate-400')}`} />
            {text}
        </button>
    );
};

const AddContentButton = ({ onAddLesson, onAddQuiz, monet, styles, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({
            top: `${rect.bottom + 8}px`,
            right: `${window.innerWidth - rect.right}px`
        });
        setIsOpen(!isOpen);
    };

    const handleAddLesson = () => { onAddLesson(); setIsOpen(false); };
    const handleAddQuiz = () => { onAddQuiz(); setIsOpen(false); };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${styles.primaryButton} ${className || ''}`}>
                <PlusIcon className="w-4 h-4" />
                <span className="hidden md:inline">Add Content</span>
                <span className="md:hidden">Add</span>
            </button>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)} monet={monet}>
                    <MenuItem icon={DocumentTextIcon} text="Add Lesson" onClick={handleAddLesson} monet={monet} />
                    <MenuItem icon={ClipboardDocumentListIcon} text="Add Quiz" onClick={handleAddQuiz} monet={monet} />
                </MenuPortal>
            )}
        </>
    );
};

const ExportTutorialModal = ({ isOpen, onClose, onConfirm, monet }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={` w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col ${monet ? 'bg-[#1E212B] border border-white/10' : 'bg-white dark:bg-[#1E212B]'} `}>
                <div className="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                    <h3 className={`text-xl font-black flex items-center gap-3 ${monet ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        <PlayCircleIcon className="w-7 h-7 text-blue-500" />
                        Fixing Table Layouts
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <XMarkIcon className={`w-6 h-6 ${monet ? 'text-white/60' : 'text-gray-500'}`} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="mb-4">
                        <p className={`text-sm mb-4 font-medium leading-relaxed ${monet ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'}`}>
                            Large tables in ULP/ATG documents may look cut off in Microsoft Word. <br/>
                            <strong>Please watch this quick fix (10s)</strong> to enable "Repeat Header Rows".
                        </p>
                        <div className="relative w-full rounded-[20px] overflow-hidden bg-black aspect-video shadow-lg mb-6 ring-1 ring-white/10">
                            <video src="/table tutorial.mp4" className="w-full h-full object-contain" controls autoPlay muted loop >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        <div className={`text-xs p-4 rounded-[18px] border ${monet ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'}`}>
                            <strong>Tip:</strong> In Word, Select Table Row → Layout → Properties → Row → Check "Repeat as header row at the top of each page".
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/5">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className={` px-6 py-3 text-sm font-bold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all ${monet ? monet.buttonPrimary : 'bg-blue-600 text-white hover:bg-blue-500'} `}>
                        I Understand, Download
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const SortableUnitListRow = memo(({ unit, onSelect, onAction, isReordering, index, monet, styles }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: unit.id, data: { type: 'unit' }, disabled: !isReordering });
    const style = { transform: CSS.Translate.toString(transform), transition };
    const rowClasses = isReordering ? "opacity-60 grayscale scale-[0.98] border-dashed border-2 border-slate-300 dark:border-slate-600 bg-transparent" : `bg-white dark:bg-[#1E212B] shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-transparent`;
    const iconBoxStyle = monet ? `${monet.iconBg} rounded-[18px]` : `bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[18px]`;

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="mb-2">
            <div onClick={() => !isReordering && onSelect(unit)} className={`relative w-full rounded-[22px] p-1.5 ${rowClasses} ${!isReordering ? 'cursor-pointer' : ''}`}>
                <div className="relative flex items-center p-2.5 gap-3.5">
                    {isReordering && ( <div {...listeners} className="p-2 cursor-grab active:cursor-grabbing hover:bg-black/5 rounded-lg touch-none"> <ArrowsUpDownIcon className="h-5 w-5 text-slate-400" /> </div> )}
                    <div className={`relative h-12 w-12 flex-shrink-0 flex items-center justify-center ${iconBoxStyle}`}>
                        <FolderIcon className="h-6 w-6" />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#2C2C2E] text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-slate-100 dark:border-[#3A3A3C] text-slate-600 dark:text-slate-300">#{index + 1}</div>
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5"> <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#2C2C2E] text-slate-500 dark:text-slate-400`}> Unit </span> </div>
                        <h3 className={`text-base font-bold tracking-tight leading-tight truncate text-slate-900 dark:text-white`}> {unit.title} </h3>
                    </div>
                    {!isReordering && ( <div className="flex items-center gap-1 z-10 pr-1"> <div onClick={(e) => e.stopPropagation()}> <ActionMenu monet={monet} styles={styles}> <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} monet={monet} /> <MenuItem icon={ArrowsUpDownIcon} text="Reorder" onClick={(e) => { e.stopPropagation(); onAction('reorder', unit); }} monet={monet} /> <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} monet={monet} /> </ActionMenu> </div> <div className="hidden md:flex h-8 w-8 rounded-full items-center justify-center hover:bg-slate-100 dark:hover:bg-[#2C2C2E] text-slate-400 transition-colors"> <ChevronRightIcon className="w-4 h-4 stroke-2" /> </div> </div> )}
                </div>
            </div>
        </div>
    );
}, (prev, next) => prev.unit.id === next.unit.id && prev.unit.title === next.unit.title && prev.isReordering === next.isReordering && prev.index === next.index && prev.monet === next.monet);

const SortableContentItem = memo(({ item, isReordering, onAction, exportingLessonId, isAiGenerating, monet, styles, isPdfDisabled }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id, data: { type: item.type, unitId: item.unitId }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    const isLesson = item.type === 'lesson';
    const isULP = item.contentType === 'teacherGuide';
    
    const Icon = isLesson ? BookOpenIcon : ClipboardDocumentListIcon;
    const typeLabel = isLesson ? (isULP ? "Unit Plan" : "Module") : "Assessment";
    
    // Aesthetic Logic: Left vs Right Specific styling
    let containerClass = `
        relative group w-full flex flex-row items-center p-4 
        bg-white dark:bg-[#1E212B] 
        rounded-[20px] overflow-hidden 
        border transition-all duration-300 ease-out
    `;
    
    if (!isReordering) {
        containerClass += ` border-gray-100 dark:border-[#2C2C2E] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 cursor-pointer dark:hover:bg-[#252836]`;
    } else {
        containerClass += ` opacity-80 scale-[0.98] border-dashed border-2 border-slate-300 dark:border-slate-600`;
    }

    // Icon Box Styling (Distinct colors for columns)
    let iconBoxClass = "";
    let badgeClass = "";
    let titleClass = "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400";
    
    if (monet) {
        iconBoxClass = `${monet.iconBg} text-white/90`;
        badgeClass = `${monet.iconBg} bg-opacity-10 text-current`;
    } else {
        if (isLesson) {
            // Blue/Indigo Theme for Lessons
            iconBoxClass = "bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-400";
            badgeClass = "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
        } else {
            // Purple/Pink Theme for Quizzes
            iconBoxClass = "bg-gradient-to-br from-fuchsia-50 to-purple-50 text-purple-600 dark:from-fuchsia-900/30 dark:to-purple-900/30 dark:text-purple-400";
            badgeClass = "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300";
            titleClass = "text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400";
        }
    }

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="h-full"> 
            <div onClick={() => !isReordering && onAction('view', item)} className={containerClass}>
				
				{isReordering && (
				    <button {...listeners} className="p-2 mr-2 rounded-xl text-slate-400 hover:bg-black/5 cursor-grab active:cursor-grabbing touch-none">
				        <Bars3Icon className="w-5 h-5" />
				    </button>
				)}

                <div className={`h-12 w-12 flex-shrink-0 rounded-[16px] flex items-center justify-center mr-4 shadow-sm ${iconBoxClass}`}>
                    <Icon className="h-6 w-6" />
                </div>

                <div className="flex-grow min-w-0 pr-2 flex flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${badgeClass}`}>
                            {typeLabel}
                        </span>
                        {/* Optional: Add item count or score indicator here */}
                    </div>
                    <h4 className={`font-bold text-[14px] leading-snug truncate transition-colors ${titleClass}`}>
                        {item.title || 'Untitled'}
                    </h4>
                </div>

                <div className={`flex-shrink-0 pl-2 transition-opacity duration-200 ${isReordering ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu monet={monet} styles={styles}>
                            <MenuItem icon={PencilIcon} text="Edit" onClick={() => onAction('edit', item)} monet={monet} />
                            {isLesson && (
                                <>
                                    {!isPdfDisabled && (
                                        <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as PDF"} onClick={() => onAction('exportPdf', item)} loading={exportingLessonId === item.id} monet={monet} />
                                    )}
                                    <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as .docx"} onClick={() => onAction('exportDocx', item)} loading={exportingLessonId === item.id} monet={monet} />
                                </>
                            )}
                            {isLesson && <MenuItem icon={SparklesIcon} text="AI Quiz" onClick={() => onAction('generateQuiz', item)} disabled={isAiGenerating} monet={monet} /> }
                            <MenuItem icon={TrashIcon} text="Delete" onClick={() => onAction('delete', item)} monet={monet} />
                        </ActionMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => prev.item.id === next.item.id && prev.item.title === next.item.title && prev.isReordering === next.isReordering && prev.exportingLessonId === next.exportingLessonId && prev.monet === next.monet);


// --- MAIN COMPONENT ---
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole, monet }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    
    const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
    const [itemToExport, setItemToExport] = useState(null);

    // Optimized Styles
    const styles = useMemo(() => getStyles(monet), [monet]);
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

    const isPdfRestricted = useMemo(() => {
        if (!subject?.title) return false;
        const title = subject.title.toLowerCase();
        const isMath = title.includes('math'); 
        const isTargetGrade = /\b(7|8|9|10)\b/.test(title) || (subject.gradeLevel && ['7','8','9','10'].includes(String(subject.gradeLevel)));
        return isMath && isTargetGrade;
    }, [subject]);

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

        try {
            // Lazy load the logic
            const { generateDocx } = await import('../../services/exportService');
            await generateDocx(lesson, subject, showToast);
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

        try {
            // Lazy load the logic
            const { generatePdf } = await import('../../services/exportService');
            await generatePdf(lesson, subject, showToast);
        } catch (e) {
            console.error("PDF Export Error:", e);
            showToast("PDF Error: " + (e.message || e), "error");
        }
        setExportingLessonId(null);
    };

    const handleConfirmExport = () => { 
        setTutorialModalOpen(false); 
        if (itemToExport) { 
            handleExportDocx(itemToExport); 
            setItemToExport(null); 
        } 
    };

    const handleAction = useCallback((type, item) => {
        switch(type) {
            case 'select': onSetActiveUnit(item); break;
            case 'edit': 
                if(item.type) { 
                    item.type === 'lesson' ? (setSelectedLesson(item), setEditLessonModalOpen(true)) : (setSelectedQuiz(item), setEditQuizModalOpen(true)); 
                } else { 
                    setSelectedUnit(item); 
                    setEditUnitModalOpen(true); 
                } 
                break;
            case 'delete': 
                if(item.type) onInitiateDelete(item.type, item.id, item.title, item.subjectId); 
                else onInitiateDelete('unit', item.id, item.title, item.subjectId); 
                break;
            case 'view': 
                item.type === 'lesson' ? (setSelectedLesson(item), setViewLessonModalOpen(true)) : (setSelectedQuiz(item), setViewQuizModalOpen(true)); 
                break;
            case 'ai': 
                setUnitForAi(item); 
                setIsAiHubOpen(true); 
                break;
            case 'reorder': 
                setIsReordering(true); 
                break;
            case 'generateQuiz': 
                setLessonForAiQuiz(item); 
                setAiQuizModalOpen(true); 
                break;
            case 'exportPdf': 
                handleExportLessonPdf(item); 
                break;
            case 'exportDocx': 
                const isSpecialDoc = item.contentType === 'teacherGuide' || item.contentType === 'teacherAtg'; 
                if (isSpecialDoc) { 
                    setItemToExport(item); 
                    setTutorialModalOpen(true); 
                } else { 
                    handleExportDocx(item); 
                } 
                break;
        }
    }, [onSetActiveUnit, onInitiateDelete]);

    const { lessons, quizzes } = useMemo(() => {
        if (!activeUnit) return { lessons: [], quizzes: [] };
        
        const unitLessons = allLessons
            .filter(l => l.unitId === activeUnit.id)
            .map(l => ({...l, type: 'lesson'}))
            .sort((a,b) => (a.order??0) - (b.order??0));
            
        const unitQuizzes = allQuizzes
            .filter(q => q.unitId === activeUnit.id)
            .map(q => ({...q, type: 'quiz'}))
            .sort((a,b) => (a.order??0) - (b.order??0));
            
        return { lessons: unitLessons, quizzes: unitQuizzes };
    }, [activeUnit, allLessons, allQuizzes]);

    const handleDragEnd = async (e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        // Case 1: Reordering Units
        if (active.data.current.type === 'unit') {
            const oldIdx = units.findIndex(u => u.id === active.id);
            const newIdx = units.findIndex(u => u.id === over.id);
            const reordered = arrayMove(units, oldIdx, newIdx);
            setUnits(reordered);
            const batch = writeBatch(db);
            reordered.forEach((u, i) => batch.update(doc(db, 'units', u.id), { order: i }));
            await batch.commit();
            return;
        }

        // Case 2: Reordering Lessons
        if (active.data.current.type === 'lesson' && over.data.current.type === 'lesson') {
            const oldIdx = lessons.findIndex(i => i.id === active.id);
            const newIdx = lessons.findIndex(i => i.id === over.id);
            const reordered = arrayMove(lessons, oldIdx, newIdx);
            
            // Optimistic Update
            setAllLessons(prev => {
                const others = prev.filter(l => l.unitId !== activeUnit.id);
                return [...others, ...reordered];
            });

            const batch = writeBatch(db);
            reordered.forEach((item, index) => {
                 batch.update(doc(db, 'lessons', item.id), { order: index });
            });
            await batch.commit();
            return;
        }
        
        // Case 3: Reordering Quizzes
        if (active.data.current.type === 'quiz' && over.data.current.type === 'quiz') {
            const oldIdx = quizzes.findIndex(i => i.id === active.id);
            const newIdx = quizzes.findIndex(i => i.id === over.id);
            const reordered = arrayMove(quizzes, oldIdx, newIdx);
            
            // Optimistic Update
            setAllQuizzes(prev => {
                const others = prev.filter(q => q.unitId !== activeUnit.id);
                return [...others, ...reordered];
            });

            const batch = writeBatch(db);
            reordered.forEach((item, index) => {
                 batch.update(doc(db, 'quizzes', item.id), { order: index });
            });
            await batch.commit();
            return;
        }
    };

    const getHeaderClasses = () => {
        if (monet) {
            return `${monet.cardBg || 'bg-white dark:bg-[#1C1C1E]'} border-b border-slate-100 dark:border-[#2C2C2E] z-40`;
        }
        return 'bg-white dark:bg-[#1C1C1E] border-b border-slate-200 dark:border-[#2C2C2E] z-40';
    };

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    <div className="relative min-h-[500px]">
                        <div className={`sticky top-0 -mx-4 px-4 md:px-6 py-4 mb-2 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 ${getHeaderClasses()}`}>
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <button onClick={() => onSetActiveUnit(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#3A3A3C]">
                                    <ChevronRightIcon className="w-5 h-5 rotate-180 text-slate-500" />
                                </button>
                                <div className="min-w-0">
                                    <h2 className={`text-xl font-black tracking-tight leading-none truncate text-slate-900 dark:text-white`}>
                                        {activeUnit.title}
                                    </h2>
                                    <p className={`text-xs font-bold truncate mt-1 text-slate-500 dark:text-slate-400`}>
                                        {lessons.length + quizzes.length} Items
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex-shrink-0 flex items-center gap-2">
                                {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                <button onClick={() => setIsReordering(!isReordering)} className={`${styles.secondaryButton} !px-4 !py-2 text-xs`}>
                                    <ArrowsUpDownIcon className="w-4 h-4" />
                                    <span className={isReordering ? "inline" : "hidden md:inline"}>{isReordering ? 'Done' : 'Sort'}</span>
                                </button>
                                <AddContentButton 
                                    onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                    onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                    monet={monet}
                                    styles={styles}
                                    className="!px-4 !py-2 text-xs"
                                />
                            </div>
                        </div>

                        {/* --- SPLIT LAYOUT: LESSONS LEFT | QUIZZES RIGHT --- */}
                        <div className="pb-20 w-full px-4 mx-auto pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* LEFT COLUMN: LESSONS */}
                                <div className="flex flex-col gap-4">
                                    <div className="sticky top-20 z-10 py-2 bg-slate-50/95 dark:bg-[#121212]/95 backdrop-blur-sm -mx-2 px-2 rounded-xl flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <BookOpenIcon className="w-4 h-4" />
                                            Learning Materials
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                            {lessons.length}
                                        </span>
                                    </div>

                                    {lessons.length > 0 ? (
                                        <SortableContext items={lessons.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            <div className="flex flex-col gap-3">
                                                {lessons.map(item => (
                                                    <SortableContentItem 
                                                        key={item.id} 
                                                        item={item} 
                                                        isReordering={isReordering} 
                                                        onAction={handleAction} 
                                                        exportingLessonId={exportingLessonId} 
                                                        isAiGenerating={isAiGenerating} 
                                                        monet={monet} 
                                                        styles={styles}
                                                        isPdfDisabled={isPdfRestricted}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    ) : (
                                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-70">
                                            <BookOpenIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                                            <p className="text-sm font-semibold text-slate-500">No Lessons Yet</p>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: QUIZZES */}
                                <div className="flex flex-col gap-4">
                                    <div className="sticky top-20 z-10 py-2 bg-slate-50/95 dark:bg-[#121212]/95 backdrop-blur-sm -mx-2 px-2 rounded-xl flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <ClipboardDocumentListIcon className="w-4 h-4" />
                                            Assessments
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400">
                                            {quizzes.length}
                                        </span>
                                    </div>

                                    {quizzes.length > 0 ? (
                                        <SortableContext items={quizzes.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            <div className="flex flex-col gap-3">
                                                {quizzes.map(item => (
                                                    <SortableContentItem 
                                                        key={item.id} 
                                                        item={item} 
                                                        isReordering={isReordering} 
                                                        onAction={handleAction} 
                                                        exportingLessonId={exportingLessonId} 
                                                        isAiGenerating={isAiGenerating} 
                                                        monet={monet} 
                                                        styles={styles}
                                                        isPdfDisabled={isPdfRestricted}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    ) : (
                                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-70">
                                            <ClipboardDocumentListIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                                            <p className="text-sm font-semibold text-slate-500">No Quizzes Yet</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative max-w-5xl mx-auto px-4">
                        {units.length > 0 && (
                            <div className="flex justify-end mb-4 px-2">
                                <button 
                                    onClick={() => setIsReordering(!isReordering)} 
                                    className={`${styles.secondaryButton} !px-5 !py-2.5 text-sm`}
                                >
                                    {isReordering ? (<span className="text-blue-600 font-bold">Done Sorting</span>) : (<><ArrowsUpDownIcon className="w-4 h-4" /> Reorder Units</>)}
                                </button>
                            </div>
                        )}

                        {units.length > 0 ? (
                            <div className="flex flex-col gap-4 pb-20">
                                <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                                    {units.map((unit, idx) => (
                                        <SortableUnitListRow key={unit.id} unit={unit} index={idx} onSelect={onSetActiveUnit} onAction={handleAction} isReordering={isReordering} monet={monet} styles={styles} />
                                    ))}
                                </SortableContext>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-60">
                                <QueueListIcon className={`w-24 h-24 mb-6 text-slate-200 dark:text-slate-700`} />
                                <h3 className={`text-2xl font-bold text-slate-400 dark:text-slate-500`}>No Units Created</h3>
                                <p className="text-sm text-slate-400 mt-2">Tap the + button to create your first unit.</p>
                            </div>
                        )}
                    </div>
                )}
            </DndContext>

            <ExportTutorialModal 
                isOpen={tutorialModalOpen} 
                onClose={() => { setTutorialModalOpen(false); setItemToExport(null); }}
                onConfirm={handleConfirmExport}
                monet={monet}
            />

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