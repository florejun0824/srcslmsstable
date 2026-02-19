// src/components/teacher/UnitAccordion.jsx
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy, memo } from 'react';
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
    ArrowsUpDownIcon,
    EllipsisVerticalIcon,
    CloudArrowUpIcon,
    XMarkIcon,       
    PlayCircleIcon,
    AcademicCapIcon,
    BookOpenIcon,
    ArrowLeftIcon,
    ClockIcon,
    DocumentCheckIcon,
    WrenchScrewdriverIcon,
    PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import {
    FolderIcon as FolderSolid,
    DocumentTextIcon as DocumentTextSolid
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
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../../contexts/ToastContext';

// --- MATERIAL YOU STYLES ---
const MAT_STYLES = {
    // Containers
    cardUnit: "relative group overflow-hidden rounded-[24px] transition-all duration-300 hover:shadow-lg border border-transparent hover:border-black/5 dark:hover:border-white/10",
    
    // UPDATED: Card content now handles row-flex on mobile for compactness
    cardContent: "relative group overflow-hidden rounded-[16px] md:rounded-[20px] bg-[#F3F4EB] dark:bg-[#1E1E1E] border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-all duration-200 hover:shadow-md",
    
    // Header (Floating Island - Sticky Functionality Verified)
    stickyHeader: "sticky top-0 z-40 -mt-2 md:-mt-4 mb-2 md:mb-4 rounded-b-[20px] md:rounded-[24px] bg-[#F3F4EB]/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm transition-all duration-300",

    // Typography
    displayLarge: "text-lg md:text-2xl font-normal text-[#1B1C17] dark:text-[#E3E2E6]",
    titleMedium: "text-sm md:text-base font-medium text-[#1B1C17] dark:text-[#E3E2E6]",
    bodySmall: "text-xs font-medium text-[#444746] dark:text-[#C4C7C5]",
    
    // Actions (Slim Profile)
    btnIcon: "p-2 rounded-full hover:bg-[#1B1C17]/10 dark:hover:bg-[#E3E2E6]/10 active:scale-90 transition-all text-[#444746] dark:text-[#C4C7C5]",
    btnFab: "flex items-center justify-center gap-2 px-3 py-2 rounded-[14px] font-bold text-xs transition-all duration-200 shadow-sm hover:shadow-md active:scale-95",
    
    // Menus
    menuContainer: "fixed z-[9999] bg-[#F3F4EB] dark:bg-[#1E1E1E] rounded-[16px] shadow-xl ring-1 ring-black/5 p-1 animate-in fade-in zoom-in-95 duration-200 min-w-[200px] flex flex-col gap-0.5",
    menuItem: "flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-[12px] transition-colors text-[#1B1C17] dark:text-[#E3E2E6] hover:bg-[#1B1C17]/5 dark:hover:bg-[#E3E2E6]/10",

    // Section Headers
    sectionHeader: "flex items-center gap-2 md:gap-3 mb-2 md:mb-4 px-1",
};

// --- LAZY RETRY HELPER ---
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse( window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false');
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1,2,3,4].map(i => (
            <div key={i} className="aspect-[4/3] rounded-[22px] bg-black/5 dark:bg-white/5" />
        ))}
    </div>
);

const MenuPortal = ({ children, menuStyle, onClose }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        window.addEventListener('mousedown', handler);
        window.addEventListener('scroll', onClose, true);
        return () => {
            window.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [onClose]);

    return createPortal(
        <div ref={menuRef} style={menuStyle} className={MAT_STYLES.menuContainer}>
            {children}
        </div>,
        document.body
    );
};

const MenuContext = React.createContext(() => {});

const ActionMenu = ({ children, triggerClass }) => {
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
            <div ref={iconRef} onClick={handleToggle} className={`${triggerClass || MAT_STYLES.btnIcon} relative z-20 cursor-pointer`}>
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={closeMenu}>
                    <MenuContext.Provider value={closeMenu}>{children}</MenuContext.Provider>
                </MenuPortal>
            )}
        </>
    );
};

const MenuItem = ({ icon: Icon, text, onClick, disabled, loading }) => {
    const closeMenu = React.useContext(MenuContext);
    const handleClick = (e) => {
        if (disabled || loading) return;
        if (onClick) onClick(e);
        if (closeMenu) closeMenu();
    };

    return (
        <button onClick={handleClick} disabled={disabled || loading} className={`${MAT_STYLES.menuItem} ${disabled ? 'opacity-50' : ''}`}>
            <Icon className={`h-4 w-4 mr-3 ${loading ? 'animate-spin text-[#006A60]' : 'opacity-70'}`} />
            {text}
        </button>
    );
};

// --- ADD BUTTON (FAB Style) ---
const AddContentButton = ({ onAddLesson, onAddQuiz, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({ top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px` });
        setIsOpen(!isOpen);
    };

    const handleAddLesson = () => { onAddLesson(); setIsOpen(false); };
    const handleAddQuiz = () => { onAddQuiz(); setIsOpen(false); };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${MAT_STYLES.btnFab} bg-[#006A60] text-white hover:bg-[#005048] ${className || ''}`}>
                <PlusIcon className="w-5 h-5" />
                <span className="hidden md:inline">Add Content</span>
            </button>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>
                    <MenuItem icon={DocumentTextIcon} text="Add Module" onClick={handleAddLesson} />
                    <MenuItem icon={ClipboardDocumentListIcon} text="Add Quiz" onClick={handleAddQuiz} />
                </MenuPortal>
            )}
        </>
    );
};

// --- MOBILE TOOLS MENU (Merged PPT & Sort) ---
const MobileToolsMenu = ({ onSortToggle, isReordering, renderPptButton, activeUnit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({ top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px` });
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${MAT_STYLES.btnFab} bg-[#E2E2D9] dark:bg-[#444746] text-[#1B1C17] dark:text-[#E3E2E6] !px-3 md:hidden`}>
                <WrenchScrewdriverIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>
                    <MenuItem 
                        icon={ArrowsUpDownIcon} 
                        text={isReordering ? 'Finish Sorting' : 'Reorder Items'} 
                        onClick={() => onSortToggle(!isReordering)} 
                    />
                    {/* Render the Slide Picker Button inside the menu for compactness */}
                    {renderPptButton && (
                        <div className="border-t border-black/5 dark:border-white/5 p-2">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <PresentationChartLineIcon className="w-4 h-4 text-gray-500" />
                                <div className="flex-1" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                                    {renderPptButton(activeUnit)}
                                </div>
                            </div>
                        </div>
                    )}
                </MenuPortal>
            )}
        </>
    );
};


// --- EXPORT TUTORIAL MODAL ---
const ExportTutorialModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col bg-[#F3F4EB] dark:bg-[#1E1E1E]`}>
                <div className="p-6 flex justify-between items-center border-b border-black/5 dark:border-white/5">
                    <h3 className={`text-xl font-normal flex items-center gap-3 ${MAT_STYLES.titleMedium}`}>
                        <PlayCircleIcon className="w-6 h-6 text-[#006A60]" />
                        Fixing Table Layouts
                    </h3>
                    <button onClick={onClose} className={MAT_STYLES.btnIcon}>
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="relative w-full rounded-[20px] overflow-hidden bg-black aspect-video shadow-lg mb-6">
                        <video src="/table tutorial.mp4" className="w-full h-full object-contain" controls autoPlay muted loop />
                    </div>
                    <div className="p-4 rounded-[16px] bg-[#C3E7DD] dark:bg-[#334B4F] text-[#002022] dark:text-[#CCE8E0] text-sm">
                        <strong>Tip:</strong> In Word, Select Table Row → Layout → Properties → Row → Check "Repeat as header row".
                    </div>
                </div>
                <div className="p-5 flex justify-end gap-3 bg-[#E2E2D9]/30 dark:bg-[#444746]/30">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-[#444746] dark:text-[#C4C7C5] hover:bg-black/5 rounded-full">Cancel</button>
                    <button onClick={onConfirm} className={`${MAT_STYLES.btnFab} bg-[#006A60] text-white`}>I Understand, Download</button>
                </div>
            </div>
        </div>, document.body
    );
};

// --- SORTABLE UNIT ITEM (Card Style - Compact on Mobile) ---
const SortableBookItem = memo(({ unit, onSelect, onAction, isReordering, index }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: unit.id, data: { type: 'unit' }, disabled: !isReordering });
    const style = { transform: CSS.Translate.toString(transform), transition, touchAction: 'none' };
    
    // Dynamic Tonal Colors based on Index
    const getTheme = (idx) => {
        const themes = [
            { bg: "bg-[#D0E4FF] dark:bg-[#284777]", text: "text-[#001D36] dark:text-[#D0E4FF]" }, // Blue
            { bg: "bg-[#C3E7DD] dark:bg-[#334B4F]", text: "text-[#002022] dark:text-[#CCE8E0]" }, // Teal
            { bg: "bg-[#FFD8E4] dark:bg-[#633B48]", text: "text-[#31111D] dark:text-[#FFD8E4]" }, // Pink
            { bg: "bg-[#E8DEF8] dark:bg-[#4A4458]", text: "text-[#1D192B] dark:text-[#E8DEF8]" }, // Purple
            { bg: "bg-[#F2DDA5] dark:bg-[#58440C]", text: "text-[#261900] dark:text-[#F2DDA5]" }, // Yellow
        ];
        return themes[idx % themes.length];
    };
    
    const theme = getTheme(index);
    const containerClass = isReordering ? "opacity-60 scale-[0.98] cursor-grab active:cursor-grabbing" : "cursor-pointer";

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
            <div onClick={() => !isReordering && onSelect(unit)} className={`${MAT_STYLES.cardUnit} ${theme.bg} aspect-[4/3] flex flex-col p-3 md:p-5 ${containerClass}`}>
                
                {/* Header: Icon & Action */}
                <div className="flex justify-between items-start mb-auto">
                    <div className="p-1.5 md:p-2.5 rounded-[10px] md:rounded-[14px] bg-white/40 dark:bg-black/20 backdrop-blur-sm">
                        <FolderSolid className={`w-4 h-4 md:w-6 md:h-6 ${theme.text}`} />
                    </div>
                    {!isReordering && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <ActionMenu triggerClass={`p-1.5 md:p-2 rounded-full hover:bg-black/10 transition-colors ${theme.text}`}>
                                <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} />
                                <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} />
                            </ActionMenu>
                        </div>
                    )}
                </div>

                {/* Body: Title */}
                <div className="mb-2 md:mb-4">
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Unit {index + 1}</span>
                    <h3 className={`text-sm md:text-xl font-normal leading-tight line-clamp-2 mt-0.5 md:mt-1 ${theme.text}`}>{unit.title}</h3>
                </div>

                {/* Footer: Open Badge */}
                <div className="mt-auto hidden sm:block">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/30 dark:bg-black/10 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm">
                        <span>Open</span>
                        <ArrowLeftIcon className="w-3 h-3 rotate-180" />
                    </div>
                </div>

                {isReordering && (
                    <div className="absolute inset-0 z-20 bg-black/10 flex items-center justify-center rounded-[24px]">
                        <div className="bg-white rounded-full p-2 shadow-sm">
                            <ArrowsUpDownIcon className="w-6 h-6 text-black" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => prev.unit.id === next.unit.id && prev.unit.title === next.unit.title && prev.isReordering === next.isReordering && prev.index === next.index);

// --- SORTABLE CONTENT ITEM (Compact Row on Mobile, Card on Desktop) ---
const SortablePageItem = memo(({ item, isReordering, onAction, exportingLessonId, isAiGenerating, isPdfDisabled }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id, data: { type: item.type, unitId: item.unitId }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition, touchAction: 'none' };
    const isLesson = item.type === 'lesson';
    
    // Theme logic
    const theme = isLesson 
        ? { icon: DocumentTextSolid, iconBg: "bg-[#D0E4FF] dark:bg-[#284777]", iconColor: "text-[#001D36] dark:text-[#D0E4FF]" }
        : { icon: DocumentCheckIcon, iconBg: "bg-[#FFD8E4] dark:bg-[#633B48]", iconColor: "text-[#31111D] dark:text-[#FFD8E4]" };

    const containerClass = isReordering ? "opacity-60 scale-[0.98] cursor-grab active:cursor-grabbing" : "cursor-pointer";

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full"> 
            <div onClick={() => !isReordering && onAction('view', item)} className={`${MAT_STYLES.cardContent} p-3 md:p-4 h-full flex flex-row md:flex-col justify-between items-center md:items-start md:min-h-[140px] gap-3 md:gap-0 ${containerClass}`}>
                
                {/* Icon Container (Left on Mobile, Top on Desktop) */}
                <div className={`p-2.5 md:p-2 rounded-[12px] flex-shrink-0 ${theme.iconBg} ${theme.iconColor} md:mb-3`}>
                    <theme.icon className="w-5 h-5 md:w-5 md:h-5" />
                </div>

                {/* Content (Middle on Mobile, Bottom on Desktop) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className={`text-sm font-medium leading-snug ${MAT_STYLES.titleMedium} line-clamp-2 md:line-clamp-3 mb-0.5 md:mb-1`}>
                        {item.title || 'Untitled'}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate">
                        {isLesson ? (item.contentType === 'teacherGuide' ? 'Unit Plan' : 'Module') : 'Assessment'}
                    </span>
                </div>

                {/* Actions (Right on Mobile, Top Right on Desktop) */}
                <div className="md:absolute md:top-4 md:right-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isReordering ? (
                         <ActionMenu>
                            <MenuItem icon={PencilIcon} text="Edit" onClick={() => onAction('edit', item)} />
                            {isLesson && (
                                <>
                                    {!isPdfDisabled && (
                                        <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as PDF"} onClick={() => onAction('exportPdf', item)} loading={exportingLessonId === item.id} />
                                    )}
                                    <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as .docx"} onClick={() => onAction('exportDocx', item)} loading={exportingLessonId === item.id} />
                                </>
                            )}
                            {isLesson && <MenuItem icon={SparklesIcon} text="AI Quiz" onClick={() => onAction('generateQuiz', item)} disabled={isAiGenerating} /> }
                            <MenuItem icon={TrashIcon} text="Delete" onClick={() => onAction('delete', item)} />
                        </ActionMenu>
                    ) : (
                        <Bars3Icon className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>
        </div>
    );
}, (prev, next) => prev.item.id === next.item.id && prev.item.title === next.item.title && prev.isReordering === next.isReordering && prev.exportingLessonId === next.exportingLessonId);


// --- MAIN COMPONENT ---
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    
    const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
    const [itemToExport, setItemToExport] = useState(null);
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

    // Data Fetching
    useEffect(() => { 
        if (!subject?.id) { setUnits([]); return; } 
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id)); 
        const unsubscribe = onSnapshot(q, (snapshot) => { 
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            fetched.sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)); 
            setUnits(fetched); 
        }); 
        return () => unsubscribe(); 
    }, [subject?.id]);

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
            const { generateDocx } = await import('../../services/exportService');
            await generateDocx(lesson, subject, showToast);
        } catch (error) { showToast("Failed to create Word document.", "error"); } 
        finally { isExportingRef.current = false; setExportingLessonId(null); }
    };

	const handleExportLessonPdf = async (lesson) => {
	    // Check the ref to ensure exports don't overlap
	    if (isExportingRef.current) return;
	    isExportingRef.current = true;
	    setExportingLessonId(lesson.id);
    
	    try {
	        const { generatePdf } = await import('../../services/exportService');
	        await generatePdf(lesson, subject, showToast);
	    } catch (e) { 
	        showToast("PDF Error: " + (e.message || e), "error"); 
	    } finally {
	        // Ensure state ALWAYS resets, no matter what happens in try/catch
	        isExportingRef.current = false;
	        setExportingLessonId(null);
	    }
	};

    const handleConfirmExport = () => { 
        setTutorialModalOpen(false); 
        if (itemToExport) { handleExportDocx(itemToExport); setItemToExport(null); } 
    };

    // --- UPDATED: Removed useCallback wrapper and dependency array ---
    const handleAction = (type, item) => {
        switch(type) {
            case 'select': onSetActiveUnit(item); break;
            case 'edit': item.type === 'lesson' ? (setSelectedLesson(item), setEditLessonModalOpen(true)) : (setSelectedQuiz(item), setEditQuizModalOpen(true)); break;
            case 'delete': if(item.type) onInitiateDelete(item.type, item.id, item.title, item.subjectId); else onInitiateDelete('unit', item.id, item.title, item.subjectId); break;
            case 'view': item.type === 'lesson' ? (setSelectedLesson(item), setViewLessonModalOpen(true)) : (setSelectedQuiz(item), setViewQuizModalOpen(true)); break;
            case 'ai': setUnitForAi(item); setIsAiHubOpen(true); break;
            case 'reorder': setIsReordering(true); break;
            case 'generateQuiz': setLessonForAiQuiz(item); setAiQuizModalOpen(true); break;
            case 'exportPdf': handleExportLessonPdf(item); break;
            case 'exportDocx': 
                const isSpecialDoc = item.contentType === 'teacherGuide' || item.contentType === 'teacherAtg'; 
                if (isSpecialDoc) { setItemToExport(item); setTutorialModalOpen(true); } else { handleExportDocx(item); } 
                break;
        }
    };

    const { lessons, quizzes } = useMemo(() => {
        if (!activeUnit) return { lessons: [], quizzes: [] };
        const unitLessons = allLessons.filter(l => l.unitId === activeUnit.id).map(l => ({...l, type: 'lesson'})).sort((a,b) => (a.order??0) - (b.order??0));
        const unitQuizzes = allQuizzes.filter(q => q.unitId === activeUnit.id).map(q => ({...q, type: 'quiz'})).sort((a,b) => (a.order??0) - (b.order??0));
        return { lessons: unitLessons, quizzes: unitQuizzes };
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
            return;
        }
        if (active.data.current.type === 'lesson' || active.data.current.type === 'quiz') {
            const isLesson = active.data.current.type === 'lesson';
            const items = isLesson ? lessons : quizzes;
            const setItems = isLesson ? setAllLessons : setAllQuizzes;
            const collectionName = isLesson ? 'lessons' : 'quizzes';

            const oldIdx = items.findIndex(i => i.id === active.id);
            const newIdx = items.findIndex(i => i.id === over.id);
            const reordered = arrayMove(items, oldIdx, newIdx);

            setItems(prev => {
                const others = prev.filter(x => x.unitId !== activeUnit.id);
                return [...others, ...reordered];
            });
            const batch = writeBatch(db);
            reordered.forEach((item, index) => { batch.update(doc(db, collectionName, item.id), { order: index }); });
            await batch.commit();
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    // --- INSIDE A UNIT (CONTENT VIEW) ---
                    <div className="relative pb-20">
                        {/* UPDATED HEADER: Compact & Merged Buttons on Mobile */}
                        <div className={MAT_STYLES.stickyHeader}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 gap-2 md:gap-4">
                                
                                {/* Title & Stats Area (Compact on Mobile) */}
                                <div className="w-full flex justify-between items-start md:block">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <h2 className={`text-lg md:text-2xl font-normal ${MAT_STYLES.titleMedium} leading-tight truncate`}>{activeUnit.title}</h2>
                                        <div className="flex items-center gap-2 mt-0.5 md:mt-1 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1"><BookOpenIcon className="w-3.5 h-3.5" /> {lessons.length} Modules</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {quizzes.length} Quizzes</span>
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Only: Tools Menu & Add (Merged Row) */}
                                    <div className="flex md:hidden items-center gap-2">
                                        {/* Mobile Tools Menu (Groups Sort, Slides, & secondary actions) */}
                                        <MobileToolsMenu 
                                            onSortToggle={setIsReordering} 
                                            isReordering={isReordering}
                                            renderPptButton={renderGeneratePptButton}
                                            activeUnit={activeUnit}
                                        />
                                        
                                        {/* Mobile Add Button */}
                                        <AddContentButton 
                                            className="!px-2.5"
                                            onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                            onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                        />
                                    </div>
                                </div>

                                {/* Desktop Actions Row (Hidden on Mobile) */}
                                <div className="hidden md:flex items-center gap-2 self-end md:self-auto w-full md:w-auto justify-end">
                                    {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                    
                                    <button onClick={() => setIsReordering(!isReordering)} className={`${MAT_STYLES.btnFab} bg-[#E2E2D9] dark:bg-[#444746] text-[#1B1C17] dark:text-[#E3E2E6] !px-3`}>
                                        <ArrowsUpDownIcon className="w-4 h-4" />
                                        <span>{isReordering ? 'Done' : 'Sort'}</span>
                                    </button>

                                    <AddContentButton 
                                        onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                        onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="max-w-7xl mx-auto px-2 md:px-4">
                            {/* Modules Section */}
                            <div className="mb-6 md:mb-8">
                                <div className={MAT_STYLES.sectionHeader}>
                                    <BookOpenIcon className="w-5 h-5 text-[#006A60] dark:text-[#80DCCC]" />
                                    <h3 className={MAT_STYLES.titleMedium}>Study Modules</h3>
                                </div>
                                {lessons.length > 0 ? (
                                    <SortableContext items={lessons.map(i => i.id)} strategy={rectSortingStrategy}>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                                            {lessons.map(item => (
                                                <SortablePageItem 
                                                    key={item.id} item={item} isReordering={isReordering} onAction={handleAction} 
                                                    exportingLessonId={exportingLessonId} isAiGenerating={isAiGenerating} isPdfDisabled={isPdfRestricted}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 md:p-12 border border-dashed border-black/10 dark:border-white/10 rounded-[24px]">
                                        <p className="text-sm font-medium text-gray-400">No modules yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Quizzes Section */}
                            <div>
                                <div className={MAT_STYLES.sectionHeader}>
                                    <AcademicCapIcon className="w-5 h-5 text-[#984061] dark:text-[#FFD8E4]" />
                                    <h3 className={MAT_STYLES.titleMedium}>Assessments</h3>
                                </div>
                                {quizzes.length > 0 ? (
                                    <SortableContext items={quizzes.map(i => i.id)} strategy={rectSortingStrategy}>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                                            {quizzes.map(item => (
                                                <SortablePageItem 
                                                    key={item.id} item={item} isReordering={isReordering} onAction={handleAction} 
                                                    exportingLessonId={exportingLessonId} isAiGenerating={isAiGenerating} isPdfDisabled={isPdfRestricted}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 md:p-12 border border-dashed border-black/10 dark:border-white/10 rounded-[24px]">
                                        <p className="text-sm font-medium text-gray-400">No quizzes yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- UNIT LIST VIEW (Cards) ---
                    <div className="max-w-7xl mx-auto pb-20">
                        {units.length > 0 && (
                            <div className="flex justify-end mb-6">
                                <button onClick={() => setIsReordering(!isReordering)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${isReordering ? 'bg-[#C3E7DD] text-[#002022]' : 'text-[#444746] hover:bg-black/5'}`}>
                                    <ArrowsUpDownIcon className="w-4 h-4" />
                                    {isReordering ? 'Finish Sorting' : 'Sort Units'}
                                </button>
                            </div>
                        )}

                        {units.length > 0 ? (
                            <SortableContext items={units.map(u => u.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                                    {units.map((unit, idx) => (
                                        <SortableBookItem key={unit.id} unit={unit} index={idx} onSelect={onSetActiveUnit} onAction={handleAction} isReordering={isReordering} />
                                    ))}
                                </div>
                            </SortableContext>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-60">
                                <BookOpenIcon className="w-24 h-24 text-gray-300 mb-4" />
                                <h3 className="text-xl font-medium text-gray-400">No Units Yet</h3>
                                <p className="text-sm text-gray-400 mt-2">Add a unit to get started</p>
                            </div>
                        )}
                    </div>
                )}
            </DndContext>

            {/* --- MODALS --- */}
            <ExportTutorialModal 
                isOpen={tutorialModalOpen} 
                onClose={() => { setTutorialModalOpen(false); setItemToExport(null); }}
                onConfirm={handleConfirmExport}
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
        </div>
    );
}