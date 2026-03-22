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

// --- MATERIAL YOU (M3) STYLES ---
const MAT_STYLES = {
    // Containers: Large rounded corners, tonal surface colors, soft squish physics
    cardUnit: "relative group overflow-hidden rounded-[28px] md:rounded-[32px] transition-all duration-300 active:scale-[0.98] border border-black/5 dark:border-white/10 hover:shadow-md",

    // Content Items: Mobile (List Tile), Desktop (Elevated Card)
    cardContent: "relative group overflow-hidden rounded-[24px] bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-black/[0.03] dark:border-white/10 transition-all duration-250 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-[0.98]",

    // Top App Bar: Frosted glass effect, seamless integration
    stickyHeader: "sticky top-0 z-40 pb-4 pt-2 md:pt-4 md:mb-4 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl transition-all duration-300 rounded-[24px] md:rounded-[32px] mt-0.5 border border-black/5 dark:border-white/10 shadow-sm",

    // Typography: Google Sans equivalent styling
    displayLarge: "text-2xl md:text-4xl font-normal text-slate-900 dark:text-white tracking-tight",
    titleMedium: "text-base md:text-lg font-medium text-slate-900 dark:text-white tracking-tight",
    bodySmall: "text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400",

    // Actions: Circular & Pill-shaped (Extended FAB)
    btnIcon: "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-all text-slate-700 dark:text-slate-300",
    btnFab: "flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-full font-medium text-sm transition-all duration-300 shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)] active:scale-[0.96]",

    // Menus: M3 Floating rounded menus
    menuContainer: "fixed z-[9999] bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_12px_32px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:ring-white/10 p-2 animate-in fade-in zoom-in-95 duration-200 min-w-[220px] flex flex-col gap-1",
    menuItem: "flex items-center w-full px-4 py-3.5 text-sm font-medium rounded-[16px] transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]",

    // Section Headers
    sectionHeader: "flex items-center gap-3 mb-4 md:mb-6 px-1 md:px-2",
};

// --- LAZY RETRY HELPER ---
const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false');
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
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[4/3] rounded-[28px] bg-black/5" />
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

const MenuContext = React.createContext(() => { });

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
            newStyle.bottom = `${screenHeight - rect.top + 8}px`;
            newStyle.transformOrigin = 'bottom right';
        } else {
            newStyle.top = `${rect.bottom + 8}px`;
            newStyle.transformOrigin = 'top right';
        }
        setMenuStyle(newStyle);
        setIsOpen(true);
    };

    const closeMenu = () => setIsOpen(false);

    return (
        <>
            <div ref={iconRef} onClick={handleToggle} className={`${triggerClass || MAT_STYLES.btnIcon} relative z-20 cursor-pointer`}>
                <EllipsisVerticalIcon className="h-5 w-5 md:h-6 md:w-6" />
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
        <button onClick={handleClick} disabled={disabled || loading} className={`${MAT_STYLES.menuItem} ${disabled ? 'opacity-40' : ''}`}>
            <Icon className={`h-5 w-5 mr-3 ${loading ? 'animate-spin text-emerald-600' : 'opacity-70 dark:text-slate-400'}`} />
            {text}
        </button>
    );
};

// --- ADD BUTTON (M3 Extended FAB) ---
const AddContentButton = ({ onAddLesson, onAddQuiz, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({ top: `${rect.bottom + 12}px`, right: `${window.innerWidth - rect.right}px` });
        setIsOpen(!isOpen);
    };

    const handleAddLesson = () => { onAddLesson(); setIsOpen(false); };
    const handleAddQuiz = () => { onAddQuiz(); setIsOpen(false); };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${MAT_STYLES.btnFab} bg-[#006A60] text-white hover:bg-[#00554D] ${className || ''}`}>
                <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                <span className="hidden md:inline font-semibold">Create</span>
            </button>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>
                    <MenuItem icon={DocumentTextIcon} text="New Module" onClick={handleAddLesson} />
                    <MenuItem icon={ClipboardDocumentListIcon} text="New Assessment" onClick={handleAddQuiz} />
                </MenuPortal>
            )}
        </>
    );
};

// --- MOBILE TOOLS MENU ---
const MobileToolsMenu = ({ onSortToggle, isReordering, renderPptButton, activeUnit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({ top: `${rect.bottom + 12}px`, right: `${window.innerWidth - rect.right}px` });
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${MAT_STYLES.btnFab} bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 !px-4 md:hidden border border-transparent dark:border-white/10`}>
                <WrenchScrewdriverIcon className="w-5 h-5" />
            </button>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)}>
                    <MenuItem
                        icon={ArrowsUpDownIcon}
                        text={isReordering ? 'Finish Sorting' : 'Reorder Items'}
                        onClick={() => onSortToggle(!isReordering)}
                    />
                    {renderPptButton && (
                        <div className="border-t border-black/5 dark:border-white/10 p-2 mt-1">
                            <div className="flex items-center gap-3 px-3 py-3 rounded-[16px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95">
                                <PresentationChartLineIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
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

// --- EXPORT TUTORIAL MODAL (M3 Dialog) ---
const ExportTutorialModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-xl rounded-[32px] shadow-[0_24px_48px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col bg-white dark:bg-slate-900 scale-in zoom-in-95 duration-300 border border-transparent dark:border-white/10`}>
                <div className="p-6 md:p-8 pb-4 flex justify-between items-center">
                    <h3 className={`text-xl md:text-2xl font-normal flex items-center gap-3 text-slate-900 dark:text-white`}>
                        <PlayCircleIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        Fixing Table Layouts
                    </h3>
                </div>
                <div className="px-6 md:px-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div className="relative w-full rounded-[24px] overflow-hidden bg-black aspect-video shadow-lg mb-6 border border-black/10 dark:border-white/10">
                        <video src="/table tutorial.mp4" className="w-full h-full object-contain" controls autoPlay muted loop />
                    </div>
                    <div className="p-5 rounded-[20px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 text-sm md:text-base leading-relaxed border border-emerald-200/50 dark:border-emerald-500/20">
                        <strong>M3 Tip:</strong> In Word, Select Table Row → Layout → Properties → Row → Check "Repeat as header row".
                    </div>
                </div>
                <div className="p-6 md:p-8 flex justify-end gap-3 mt-2">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all active:scale-95">Cancel</button>
                    <button onClick={onConfirm} className={`${MAT_STYLES.btnFab} bg-emerald-600 dark:bg-emerald-500 text-white`}>Acknowledge & Download</button>
                </div>
            </div>
        </div>, document.body
    );
};

// --- SORTABLE UNIT ITEM (M3 Card Container) ---
const SortableBookItem = memo(({ unit, onSelect, onAction, isReordering, index }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: unit.id, data: { type: 'unit' }, disabled: !isReordering });
    const style = { transform: CSS.Translate.toString(transform), transition, touchAction: isReordering ? 'none' : 'auto' };

    // Enhanced pastel tonal palettes
    const getTheme = (idx) => {
        const themes = [
            { bg: "bg-sky-50 dark:bg-sky-950/20", accent: "bg-sky-200 dark:bg-sky-500/20", iconBg: "bg-sky-100 dark:bg-sky-500/20", text: "text-sky-800 dark:text-sky-300", badge: "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400" },
            { bg: "bg-rose-50 dark:bg-rose-950/20", accent: "bg-rose-200 dark:bg-rose-500/20", iconBg: "bg-rose-100 dark:bg-rose-500/20", text: "text-rose-800 dark:text-rose-300", badge: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400" },
            { bg: "bg-sky-50/80 dark:bg-sky-950/20", accent: "bg-sky-200 dark:bg-sky-500/20", iconBg: "bg-sky-100 dark:bg-sky-500/20", text: "text-sky-800 dark:text-sky-300", badge: "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400" },
            { bg: "bg-emerald-50 dark:bg-emerald-950/20", accent: "bg-emerald-200 dark:bg-emerald-500/20", iconBg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-800 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
            { bg: "bg-amber-50 dark:bg-amber-950/20", accent: "bg-amber-200 dark:bg-amber-500/20", iconBg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-800 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" },
        ];
        return themes[idx % themes.length];
    };

    const theme = getTheme(index);
    const containerClass = isReordering ? "opacity-70 scale-[0.96] cursor-grab active:cursor-grabbing shadow-xl" : "cursor-pointer";

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
            <div
                onClick={() => !isReordering && onSelect(unit)}
                className={`${MAT_STYLES.cardUnit} ${theme.bg} aspect-auto md:aspect-[4/3] flex flex-row flex-wrap md:flex-col items-center md:items-start p-4 md:p-5 lg:p-6 min-h-[85px] md:min-h-0 ${containerClass}`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
            >
                {/* Decorative gradient accent (Hidden on mobile for cleaner list look) */}
                <div className={`hidden md:block absolute -top-12 -right-12 w-32 h-32 rounded-full ${theme.accent} opacity-30 blur-md`} />

                {/* Desktop Action Menu & Body Container */}
                <div className="hidden md:flex flex-col h-full w-full justify-between items-start">
                    {/* Header: Icon & Action Menu */}
                    <div className="flex justify-between items-start mb-auto relative w-full z-10">
                        <div className={`p-3 rounded-2xl ${theme.iconBg} shadow-sm`}>
                            <FolderSolid className={`w-6 h-6 md:w-7 md:h-7 ${theme.text}`} />
                        </div>
                        {!isReordering && (
                            <div onClick={(e) => e.stopPropagation()} className="-mr-2 -mt-2">
                                <ActionMenu triggerClass={`p-2 rounded-full hover:bg-black/10 transition-all active:scale-90 ${theme.text}`}>
                                    <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} />
                                    <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} />
                                </ActionMenu>
                            </div>
                        )}
                    </div>

                    {/* Body: Title */}
                    <div className="mb-1 md:mb-2 mt-auto relative z-10 bottom-0 w-full">
                        <span className={`inline-flex items-center gap-1 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] mb-2 md:mb-2.5 px-2.5 py-1 rounded-lg ${theme.badge}`}>Unit {index + 1}</span>
                        <h3 className={`text-lg md:text-xl font-[700] leading-tight line-clamp-2 text-slate-900 dark:text-white`}>{unit.title}</h3>
                    </div>
                </div>

                {/* Mobile View Structure */}
                <div className="flex md:hidden flex-row items-center w-full justify-between h-full relative z-10">
                    <div className="flex flex-row items-center">
                        {/* Leading Icon */}
                        <div className={`p-2.5 rounded-xl ${theme.iconBg} shadow-sm mr-4 flex-shrink-0`}>
                            <FolderSolid className={`w-6 h-6 ${theme.text}`} />
                        </div>
                        {/* Content Body */}
                        <div className="flex flex-col justify-center flex-1 min-w-0 pr-2">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] mb-1 px-2 py-0.5 rounded-md w-max ${theme.badge}`}>Unit {index + 1}</span>
                            <h3 className={`text-[15px] font-[700] leading-tight line-clamp-1 text-slate-900 dark:text-white`}>{unit.title}</h3>
                        </div>
                    </div>
                    {/* Trailing Actions */}
                    {!isReordering && (
                        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                            <ActionMenu triggerClass={`p-2 rounded-full hover:bg-black/10 transition-all active:scale-90 ${theme.text}`}>
                                <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} />
                                <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} />
                            </ActionMenu>
                        </div>
                    )}
                </div>

                {isReordering && (
                    <div className="absolute inset-0 z-20 bg-white/40 dark:bg-black/40 flex items-center justify-center rounded-[28px] md:rounded-[32px] backdrop-blur-[3px]">
                        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-4 border border-transparent dark:border-white/10">
                            <ArrowsUpDownIcon className="w-6 h-6 md:w-7 md:h-7 text-slate-600 dark:text-slate-300" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => prev.unit.id === next.unit.id && prev.unit.title === next.unit.title && prev.isReordering === next.isReordering && prev.index === next.index);

// --- SORTABLE CONTENT ITEM (M3 List Tile Mobile / Elevated Card Desktop) ---
const SortablePageItem = memo(({ item, isReordering, onAction, exportingLessonId, isAiGenerating, isPdfDisabled }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id, data: { type: item.type, unitId: item.unitId }, disabled: !isReordering,
    });

    const style = { transform: CSS.Translate.toString(transform), transition, touchAction: isReordering ? 'none' : 'auto' };
    const isLesson = item.type === 'lesson';

    // M3 Specific container tones for items
    const theme = isLesson
        ? { icon: DocumentTextSolid, iconBg: "bg-blue-100 dark:bg-blue-500/20", iconColor: "text-blue-900 dark:text-blue-400" }
        : { icon: DocumentCheckIcon, iconBg: "bg-rose-100 dark:bg-rose-500/20", iconColor: "text-rose-900 dark:text-rose-400" };

    const containerClass = isReordering ? "opacity-70 scale-[0.96] cursor-grab active:cursor-grabbing shadow-lg border-transparent" : "cursor-pointer";

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
            <div onClick={() => !isReordering && onAction('view', item)} className={`${MAT_STYLES.cardContent} p-4 h-full flex flex-row md:flex-col items-center md:items-start md:min-h-[160px] gap-4 md:gap-0 md:justify-between ${containerClass}`}>

                {/* Leading Icon */}
                <div className={`w-12 h-12 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center rounded-full ${theme.iconBg} ${theme.iconColor} md:mb-4`}>
                    <theme.icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>

                {/* Content Body */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className={`text-[15px] md:text-[17px] font-semibold leading-snug text-slate-900 dark:text-white line-clamp-2 md:line-clamp-3 mb-1`}>
                        {item.title || 'Untitled'}
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                        {isLesson ? (item.contentType === 'teacherGuide' ? 'Unit Plan' : 'Module') : 'Assessment'}
                    </span>
                </div>

                {/* Trailing Actions */}
                <div className="flex-shrink-0 md:absolute md:top-3 md:right-2" onClick={(e) => e.stopPropagation()}>
                    {!isReordering ? (
                        <ActionMenu>
                            <MenuItem icon={PencilIcon} text="Edit Content" onClick={() => onAction('edit', item)} />
                            {isLesson && (
                                <>
                                    {!isPdfDisabled && (
                                        <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export to PDF"} onClick={() => onAction('exportPdf', item)} loading={exportingLessonId === item.id} />
                                    )}
                                    <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export to Word"} onClick={() => onAction('exportDocx', item)} loading={exportingLessonId === item.id} />
                                </>
                            )}
                            {isLesson && <MenuItem icon={SparklesIcon} text="Generate AI Quiz" onClick={() => onAction('generateQuiz', item)} disabled={isAiGenerating} />}
                            <MenuItem icon={TrashIcon} text="Delete" onClick={() => onAction('delete', item)} />
                        </ActionMenu>
                    ) : (
                        <Bars3Icon className="w-6 h-6 text-slate-400" />
                    )}
                </div>
            </div>
        </div>
    );
}, (prev, next) => prev.item.id === next.item.id && prev.item.title === next.item.title && prev.isReordering === next.isReordering && prev.exportingLessonId === next.exportingLessonId);


// --- MAIN COMPONENT ---
export default function UnitAccordion({ subject, onAddUnit, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    const [loadingContent, setLoadingContent] = useState(true);

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
        const isTargetGrade = /\b(7|8|9|10)\b/.test(title) || (subject.gradeLevel && ['7', '8', '9', '10'].includes(String(subject.gradeLevel)));
        return isMath && isTargetGrade;
    }, [subject]);

    // Data Fetching
    useEffect(() => {
        if (!subject?.id) { setUnits([]); return; }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetched.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
            setUnits(fetched);
        });
        return () => unsubscribe();
    }, [subject?.id]);

    useEffect(() => {
        if (!subject?.id) { setAllLessons([]); setAllQuizzes([]); return; }
        setLoadingContent(true);
        const lq = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
        const qq = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
        
        let lessonsLoaded = false;
        let quizzesLoaded = false;
        const checkBothLoaded = () => { if (lessonsLoaded && quizzesLoaded) setLoadingContent(false); };

        const unL = onSnapshot(lq, s => {
            setAllLessons(s.docs.map(d => ({ id: d.id, ...d.data() })));
            lessonsLoaded = true; checkBothLoaded();
        });
        const unQ = onSnapshot(qq, s => {
            setAllQuizzes(s.docs.map(d => ({ id: d.id, ...d.data() })));
            quizzesLoaded = true; checkBothLoaded();
        });
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
        if (isExportingRef.current) return;
        isExportingRef.current = true;
        setExportingLessonId(lesson.id);

        try {
            const { generatePdf } = await import('../../services/exportService');
            await generatePdf(lesson, subject, showToast);
        } catch (e) {
            showToast("PDF Error: " + (e.message || e), "error");
        } finally {
            isExportingRef.current = false;
            setExportingLessonId(null);
        }
    };

    const handleConfirmExport = () => {
        setTutorialModalOpen(false);
        if (itemToExport) { handleExportDocx(itemToExport); setItemToExport(null); }
    };

    const handleAction = (type, item) => {
        switch (type) {
            case 'select': onSetActiveUnit(item); break;
            case 'edit':
                if (item.type === 'lesson') {
                    setSelectedLesson(item); setEditLessonModalOpen(true);
                } else if (item.type === 'quiz') {
                    setSelectedQuiz(item); setEditQuizModalOpen(true);
                } else {
                    setSelectedUnit(item); setEditUnitModalOpen(true);
                }
                break;
            case 'delete': if (item.type) onInitiateDelete(item.type, item.id, item.title, item.subjectId); else onInitiateDelete('unit', item.id, item.title, item.subjectId); break;
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
        const unitLessons = allLessons.filter(l => l.unitId === activeUnit.id).map(l => ({ ...l, type: 'lesson' })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const unitQuizzes = allQuizzes.filter(q => q.unitId === activeUnit.id).map(q => ({ ...q, type: 'quiz' })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
                    <div className="relative pb-24">
                        {/* M3 Sticky App Bar */}
                        <div className={MAT_STYLES.stickyHeader}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 md:px-2">

                                {/* Header Text Group */}
                                {/* ADDED: flex-1 min-w-0 to allow the parent flex box to shrink safely */}
                                <div className="flex-1 min-w-0 w-full flex justify-between items-start md:block">
                                    <div className="flex-1 min-w-0 mr-4 md:mr-6">
                                        <h2 className={`text-2xl md:text-3xl font-normal text-slate-900 dark:text-white tracking-tight leading-tight truncate`} title={activeUnit.title}>
                                            {activeUnit.title}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-transparent dark:border-white/10"><BookOpenIcon className="w-4 h-4" /> {lessons.length} Modules</span>
                                            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-transparent dark:border-white/10"><ClockIcon className="w-4 h-4" /> {quizzes.length} Quizzes</span>
                                        </div>
                                    </div>

                                    {/* Mobile Floating Action Row */}
                                    {/* ADDED: flex-shrink-0 to prevent buttons from shrinking */}
                                    <div className="flex md:hidden items-center gap-2 flex-shrink-0">
                                        <MobileToolsMenu
                                            onSortToggle={setIsReordering}
                                            isReordering={isReordering}
                                            renderPptButton={renderGeneratePptButton}
                                            activeUnit={activeUnit}
                                        />
                                        <AddContentButton
                                            className="!px-4"
                                            onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }}
                                            onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                        />
                                    </div>
                                </div>

                                {/* Desktop Actions Row */}
                                {/* ADDED: flex-shrink-0 to guarantee the buttons keep their width on desktop */}
                                <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                                    {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}

                                    <button onClick={() => setIsReordering(!isReordering)} className={`${MAT_STYLES.btnFab} ${isReordering ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-white/10'} transition-all duration-200`}>
                                        <ArrowsUpDownIcon className="w-5 h-5 stroke-2" />
                                        <span>{isReordering ? 'Done' : 'Reorder'}</span>
                                    </button>

                                    <AddContentButton
                                        onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }}
                                        onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* M3 Content Sections */}
                        <div className="max-w-7xl mx-auto px-2 md:px-0 mt-4">
                            {/* Modules Section */}
                            <div className="mb-10">
                                <div className={MAT_STYLES.sectionHeader}>
                                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200/50 dark:border-emerald-500/20">
                                        <BookOpenIcon className="w-5 h-5 text-emerald-900 dark:text-emerald-400" />
                                    </div>
                                    <h3 className={MAT_STYLES.titleMedium}>Study Modules</h3>
                                </div>
                                {loadingContent ? (
                                    <div className="flex flex-col items-center justify-center p-12 border border-black/5 dark:border-white/5 rounded-[32px] bg-slate-50/50 dark:bg-slate-900/50 animate-pulse">
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4">
                                            <BookOpenIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Loading your lessons...</p>
                                        <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="w-full h-full bg-emerald-400/50 rounded-full"></div>
                                        </div>
                                    </div>
                                ) : lessons.length > 0 ? (
                                    <SortableContext items={lessons.map(i => i.id)} strategy={rectSortingStrategy}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                                            {lessons.map(item => (
                                                <SortablePageItem
                                                    key={item.id} item={item} isReordering={isReordering} onAction={handleAction}
                                                    exportingLessonId={exportingLessonId} isAiGenerating={isAiGenerating} isPdfDisabled={isPdfRestricted}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-black/10 dark:border-white/10 rounded-[32px] bg-slate-50/50 dark:bg-white/5">
                                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">No modules yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Quizzes Section */}
                            <div>
                                <div className={MAT_STYLES.sectionHeader}>
                                    <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-500/20 border border-rose-200/50 dark:border-rose-500/20">
                                        <AcademicCapIcon className="w-5 h-5 text-rose-900 dark:text-rose-400" />
                                    </div>
                                    <h3 className={MAT_STYLES.titleMedium}>Assessments</h3>
                                </div>
                                {loadingContent ? (
                                    <div className="flex flex-col items-center justify-center p-12 border border-black/5 dark:border-white/5 rounded-[32px] bg-slate-50/50 dark:bg-slate-900/50 animate-pulse">
                                        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mb-4">
                                            <AcademicCapIcon className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Loading your assessments...</p>
                                        <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="w-full h-full bg-rose-400/50 rounded-full"></div>
                                        </div>
                                    </div>
                                ) : quizzes.length > 0 ? (
                                    <SortableContext items={quizzes.map(i => i.id)} strategy={rectSortingStrategy}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                                            {quizzes.map(item => (
                                                <SortablePageItem
                                                    key={item.id} item={item} isReordering={isReordering} onAction={handleAction}
                                                    exportingLessonId={exportingLessonId} isAiGenerating={isAiGenerating} isPdfDisabled={isPdfRestricted}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-black/10 dark:border-white/10 rounded-[32px] bg-slate-50/50 dark:bg-white/5">
                                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">No quizzes yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- UNIT LIST VIEW (M3 Tonal Cards) ---
                    <div className="max-w-7xl mx-auto pb-24 mt-4 px-2 md:px-0">
                        {units.length > 0 && (
                            <div className="flex justify-between md:justify-end gap-2 mb-6">
                                <button onClick={onAddUnit} className="md:hidden flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-sm">
                                    <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                                    Add Unit
                                </button>
                                <button onClick={() => setIsReordering(!isReordering)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${isReordering ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-400 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 bg-slate-100 dark:bg-white/5 md:bg-transparent'}`}>
                                    <ArrowsUpDownIcon className="w-4 h-4 stroke-2" />
                                    {isReordering ? 'Done' : 'Reorder'}
                                </button>
                            </div>
                        )}

                        {units.length > 0 ? (
                            <SortableContext items={units.map(u => u.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                    {units.map((unit, idx) => (
                                        <SortableBookItem key={unit.id} unit={unit} index={idx} onSelect={onSetActiveUnit} onAction={handleAction} isReordering={isReordering} />
                                    ))}
                                </div>
                            </SortableContext>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-60">
                                <div className="p-6 rounded-full bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/10 mb-6">
                                    <BookOpenIcon className="w-16 h-16 text-slate-400 dark:text-slate-600" />
                                </div>
                                <h3 className="text-2xl font-medium text-slate-500 dark:text-slate-400">No Units Created</h3>
                                <p className="text-base text-slate-400 dark:text-slate-500 mt-2">Add a unit to get started organizing your curriculum</p>
                                <button onClick={onAddUnit} className="md:hidden mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all">
                                    <PlusIcon className="w-4 h-4 stroke-[2.5]" /> Add Unit
                                </button>
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