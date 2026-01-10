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
import { motion } from 'framer-motion';

// --- VISUAL SUB-COMPONENTS ---

const SkeletonPostGroup = memo(() => (
    <div className="bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-sm rounded-[24px] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden mb-6 animate-pulse">
        <div className="p-5 border-b border-white/10">
            <div className="h-6 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/3 mb-2"></div>
        </div>
        <div className="p-4 space-y-3">
            <div className="h-12 bg-slate-200/50 dark:bg-slate-700/30 rounded-xl w-full"></div>
            <div className="h-12 bg-slate-200/50 dark:bg-slate-700/30 rounded-xl w-full"></div>
        </div>
    </div>
));

const EmptyState = memo(({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 bg-white/40 dark:bg-[#1A1D24]/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700"
    >
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-sm">
            <Icon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{text}</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">{subtext}</p>
    </motion.div>
));

const ListItem = memo(({ children, isChecked, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${isChecked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
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
    
    // Sort units: Numbered units first, then alphabetical, "Uncategorized" last
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
        <div className="bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/5 shadow-sm overflow-hidden mb-4 sm:mb-6">
            {/* Header / Trigger */}
            <button 
                className="w-full text-left p-3 sm:p-5 group"
                onClick={() => togglePostExpand(post.id)}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-xl group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors truncate tracking-tight">{post.title}</h3>
                        <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1">
                                <CalendarDaysIcon className="h-3 w-3 text-slate-400" />
                                From: {post.availableFrom?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            {post.availableUntil && (
                                <span className="flex items-center gap-1">
                                    <ClockIcon className="h-3 w-3 text-slate-400" />
                                    Until: {post.availableUntil.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 sm:gap-3 pl-2 sm:pl-4">
                        <div 
                            onClick={(e) => { e.stopPropagation(); handleEditDatesClick(post); }} 
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
                            title="Edit Availability"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                        </div>
                        <div className={`p-1 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${isPostExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                        </div>
                    </div>
                </div>
            </button>
            
            {/* Expanded Content */}
            {isPostExpanded && (
                <div className="space-y-3 sm:space-y-4 px-3 sm:px-4 pb-3 sm:pb-5 animate-fadeIn">
                    {sortedUnitKeys.map(unitDisplayName => {
                        const itemsInUnit = unitsInPost[unitDisplayName];
                        const unitKey = `${post.id}_${unitDisplayName}`;
                        const isUnitExpanded = expandedUnits.has(unitKey);
                        const itemIds = itemsInUnit.map(i => i.id);
                        
                        // Check if all items in this specific unit are selected
                        const isAllSelected = itemIds.length > 0 && itemIds.every(id => selectedSet.has(id));

                        return (
                            <div key={unitKey} className="bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {/* Unit Header */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <button className="flex-1 flex items-center gap-2 group min-w-0" onClick={() => toggleUnitExpand(post.id, unitDisplayName)}>
                                        <h4 className="font-bold text-xs sm:text-base text-slate-800 dark:text-slate-200 group-hover:text-[#007AFF] transition-colors truncate">{unitDisplayName}</h4>
                                        <ChevronDownIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 transition-transform flex-shrink-0 ${isUnitExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    <div 
                                        className="flex items-center justify-end gap-2 cursor-pointer w-full sm:w-fit sm:pl-4 flex-shrink-0 select-none group"
                                        onClick={() => onToggleBatch(type, itemIds, isAllSelected)}
                                    >
                                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isAllSelected ? 'bg-[#007AFF] border-[#007AFF]' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-[#007AFF]'}`}>
                                            <CheckIcon className={`w-3 h-3 text-white stroke-[3] transition-transform duration-200 ${isAllSelected ? 'scale-100' : 'scale-0'}`} />
                                        </div>
                                        <span className="text-[11px] sm:text-[13px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Select All</span>
                                    </div>
                                </div>
                                
                                {/* Unit Items */}
                                {isUnitExpanded && (
                                    <div className="divide-y divide-slate-200 dark:divide-slate-700 animate-fadeIn">
                                        {itemsInUnit.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title)).map(itemDetails => {
                                            const isChecked = selectedSet.has(itemDetails.id);
                                            return (
                                                <ListItem key={itemDetails.id} isChecked={isChecked} onClick={(e) => { e.stopPropagation(); onToggleSingle(type, itemDetails.id); }}>
                                                    <div className="p-1 cursor-pointer">
                                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${isChecked ? 'bg-[#007AFF] border-[#007AFF] shadow-sm scale-105' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#007AFF] hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                            <CheckIcon className={`w-3.5 h-3.5 text-white stroke-[3] transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onViewContent(itemDetails, post); }}>
                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base cursor-pointer hover:text-[#007AFF] transition-colors truncate">{itemDetails.title}</p>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, itemDetails.id, type); }} className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                        <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                </ListItem>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

// --- MAIN COMPONENT ---

const ContentLibraryTab = ({ 
    type = 'lesson', // 'lesson' or 'quiz'
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
        
        // Key is 'lessons' or 'quizzes' based on type prop
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

        // Sort by Date
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
        <div className="animate-fadeIn pb-20">
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