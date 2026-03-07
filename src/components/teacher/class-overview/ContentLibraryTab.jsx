import React, { memo, useMemo, useState, useCallback } from 'react';
import { 
    CalendarDaysIcon, 
    ClockIcon, 
    ChevronDownIcon, 
    Cog6ToothIcon, 
    CheckIcon, 
    TrashIcon, 
    PlayCircleIcon, 
    ClipboardDocumentListIcon 
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// --- VISUAL SUB-COMPONENTS ---

const SkeletonPostGroup = memo(() => (
    <div className="bg-zinc-100 dark:bg-zinc-800/60 rounded-[32px] overflow-hidden mb-6 animate-pulse p-2">
        <div className="bg-zinc-200/50 dark:bg-zinc-700/30 rounded-[28px] p-6 mb-2">
            <div className="h-6 bg-zinc-300 dark:bg-zinc-600/50 rounded-full w-1/3 mb-3"></div>
            <div className="h-4 bg-zinc-300 dark:bg-zinc-600/50 rounded-full w-1/4"></div>
        </div>
        <div className="px-4 py-2 space-y-3">
            <div className="h-14 bg-zinc-200/50 dark:bg-zinc-700/30 rounded-[24px] w-full"></div>
            <div className="h-14 bg-zinc-200/50 dark:bg-zinc-700/30 rounded-[24px] w-full"></div>
        </div>
    </div>
));

const EmptyState = memo(({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.4, type: "spring" }}
        className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center p-8 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-[32px]"
    >
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
            <Icon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{text}</h3>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">{subtext}</p>
    </motion.div>
));

const ListItem = memo(({ children, isChecked, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between gap-3 md:gap-4 py-3 md:py-4 px-4 md:px-5 transition-colors cursor-pointer ${
            isChecked 
                ? 'bg-indigo-50/50 dark:bg-indigo-900/10' 
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
        }`}
    >
        {children}
    </div>
));

// --- LOGIC SUB-COMPONENT: GROUP ITEM ---

const PostGroupItem = memo(({ 
    post, unitsInPost, expandedPosts, togglePostExpand, expandedUnits, toggleUnitExpand, 
    selectedSet, onToggleBatch, onToggleSingle, 
    handleEditDatesClick, handleDeleteContentFromPost, onViewContent, type 
}) => {
    
    const sortedUnitKeys = useMemo(() => {
        const customUnitSort = (a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b);
        };
        return Object.keys(unitsInPost).sort(customUnitSort);
    }, [unitsInPost]);

    const isPostExpanded = expandedPosts.has(post.id);

    return (
        <div className="bg-zinc-100 dark:bg-zinc-800/60 rounded-[32px] mb-4 md:mb-6 overflow-hidden transition-colors">
            {/* Header / Trigger - Surface Container Low */}
            <div 
                className="w-full text-left p-4 md:p-6 cursor-pointer select-none group flex justify-between items-start gap-4 bg-zinc-200/30 dark:bg-zinc-700/20 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40 transition-colors rounded-[32px]"
                onClick={() => togglePostExpand(post.id)}
            >
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg md:text-xl truncate tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {post.title}
                    </h3>
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-2 flex flex-wrap gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1.5 bg-zinc-200/80 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                            <CalendarDaysIcon className="h-4 w-4 text-zinc-500" />
                            From: {post.availableFrom?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        {post.availableUntil && (
                            <span className="flex items-center gap-1.5 bg-zinc-200/80 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                                <ClockIcon className="h-4 w-4 text-zinc-500" />
                                Until: {post.availableUntil.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1 md:gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                        className="p-3 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors active:scale-95"
                        title="Edit Availability"
                    >
                        <Cog6ToothIcon className="w-5 h-5" />
                    </button>
                    <div className={`p-3 rounded-full bg-zinc-200 dark:bg-zinc-800 transition-transform duration-300 ${isPostExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                    </div>
                </div>
            </div>
            
            {/* Expanded Content */}
            <AnimatePresence>
                {isPostExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-2 pb-2 pt-1 md:px-3 md:pb-3 space-y-2">
                            {sortedUnitKeys.map(unitDisplayName => {
                                const itemsInUnit = unitsInPost[unitDisplayName];
                                const unitKey = `${post.id}_${unitDisplayName}`;
                                const isUnitExpanded = expandedUnits.has(unitKey);
                                const itemIds = itemsInUnit.map(i => i.id);
                                
                                const isAllSelected = itemIds.length > 0 && itemIds.every(id => selectedSet.has(id));

                                return (
                                    <div key={unitKey} className="bg-white dark:bg-[#1A1D24] rounded-[24px] overflow-hidden shadow-sm">
                                        {/* Unit Header */}
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-4 py-3 md:px-5 md:py-4 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer select-none group"
                                             onClick={() => toggleUnitExpand(post.id, unitDisplayName)}>
                                            <div className="flex-1 flex items-center gap-3 min-w-0">
                                                <div className={`p-1.5 rounded-full transition-transform flex-shrink-0 ${isUnitExpanded ? 'rotate-180 bg-zinc-200 dark:bg-zinc-800' : 'bg-transparent'}`}>
                                                    <ChevronDownIcon className="h-5 w-5 text-zinc-500" />
                                                </div>
                                                <h4 className="font-semibold text-sm md:text-base text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {unitDisplayName}
                                                </h4>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-3 cursor-pointer pl-10 sm:pl-0 flex-shrink-0 z-10"
                                                onClick={(e) => { e.stopPropagation(); onToggleBatch(type, itemIds, isAllSelected); }}
                                            >
                                                <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                                                    Select All
                                                </span>
                                                <div className={`w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-200 ${
                                                    isAllSelected 
                                                        ? 'bg-indigo-600 border-indigo-600' 
                                                        : 'border-zinc-400 dark:border-zinc-500 hover:border-indigo-500'
                                                }`}>
                                                    <CheckIcon className={`w-3.5 h-3.5 text-white stroke-[3] transition-transform duration-200 ${isAllSelected ? 'scale-100' : 'scale-0'}`} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Unit Items */}
                                        <AnimatePresence>
                                            {isUnitExpanded && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 pb-2">
                                                        {itemsInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(itemDetails => {
                                                            const isChecked = selectedSet.has(itemDetails.id);
                                                            return (
                                                                <ListItem key={itemDetails.id} isChecked={isChecked} onClick={(e) => { e.stopPropagation(); onToggleSingle(type, itemDetails.id); }}>
                                                                    <div className="flex-shrink-0 p-1">
                                                                        <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-200 ${
                                                                            isChecked 
                                                                                ? 'bg-indigo-600 border-indigo-600 shadow-sm scale-105' 
                                                                                : 'border-zinc-400 dark:border-zinc-500 hover:border-indigo-400 bg-transparent'
                                                                        }`}>
                                                                            <CheckIcon className={`w-4 h-4 text-white stroke-[3] transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 pl-2 md:pl-3" onClick={(e) => { e.stopPropagation(); onViewContent(itemDetails, post); }}>
                                                                        <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm md:text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
                                                                            {itemDetails.title}
                                                                        </p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, itemDetails.id, type); }} 
                                                                        className="p-2.5 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors active:scale-95"
                                                                    >
                                                                        <TrashIcon className="w-5 h-5" />
                                                                    </button>
                                                                </ListItem>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

// --- MAIN COMPONENT ---

const ContentLibraryTab = ({ 
    type = 'lesson', 
    posts = [], 
    unitsMap = {}, 
    isLoading = false,
    selectedSet, 
    onToggleBatch, 
    onToggleSingle, 
    onViewContent,
    onDeleteContent,
    onEditDates
}) => {
    
    // --- Local UI State for Expansion ---
    const [expandedPosts, setExpandedPosts] = useState(new Set());
    const [expandedUnits, setExpandedUnits] = useState(new Set());

    const togglePostExpand = useCallback((id) => {
        setExpandedPosts(prev => { 
            const s = new Set(prev); 
            s.has(id) ? s.delete(id) : s.add(id); 
            return s; 
        });
    }, []);

    const toggleUnitExpand = useCallback((pid, uname) => { 
        const key = `${pid}_${uname}`; 
        setExpandedUnits(prev => { 
            const s = new Set(prev); 
            s.has(key) ? s.delete(key) : s.add(key); 
            return s; 
        }); 
    }, []);

    // --- Organize Data (Group by Post -> Unit) ---
    const organizedContent = useMemo(() => {
        if (!posts.length) return [];
        
        const dataKey = type === 'lesson' ? 'lessons' : 'quizzes';

        const grouped = posts.reduce((acc, post) => {
            const items = post[dataKey] || [];
            if (items.length === 0) return acc;
            
            const unitsInThisPost = {};
            
            items.forEach(item => {
                const uName = unitsMap[item.unitId] || 'Uncategorized';
                if (!unitsInThisPost[uName]) unitsInThisPost[uName] = [];
                unitsInThisPost[uName].push(item);
            });

            acc.push({
                post,
                units: unitsInThisPost
            });
            return acc;
        }, []);

        return grouped.sort((a,b) => (a.post.createdAt?.toDate() || 0) - (b.post.createdAt?.toDate() || 0));
    }, [posts, unitsMap, type]);


    // --- Render Logic ---

    if (isLoading) {
        return (
            <div className="space-y-4">
                <SkeletonPostGroup />
                <SkeletonPostGroup />
            </div>
        );
    }

    if (organizedContent.length === 0) {
        return (
            <EmptyState 
                icon={type === 'lesson' ? PlayCircleIcon : ClipboardDocumentListIcon} 
                text={`No ${type === 'lesson' ? 'Lessons' : 'Quizzes'} Shared`} 
                subtext={`Share ${type === 'lesson' ? 'lessons' : 'quizzes'} from the Library tab to see them here.`} 
            />
        );
    }

    return (
        <div className="animate-fadeIn pb-24">
            {organizedContent.map(({ post, units }) => (
                <PostGroupItem 
                    key={post.id}
                    post={post}
                    unitsInPost={units}
                    type={type}
                    expandedPosts={expandedPosts}
                    togglePostExpand={togglePostExpand}
                    expandedUnits={expandedUnits}
                    toggleUnitExpand={toggleUnitExpand}
                    selectedSet={selectedSet}
                    onToggleBatch={onToggleBatch}
                    onToggleSingle={onToggleSingle}
                    handleEditDatesClick={onEditDates}
                    handleDeleteContentFromPost={onDeleteContent}
                    onViewContent={onViewContent}
                />
            ))}
        </div>
    );
};

export default ContentLibraryTab;