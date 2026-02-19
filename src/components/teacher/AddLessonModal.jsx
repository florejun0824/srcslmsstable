// src/components/lessons/AddLessonModal.jsx
import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import {
    SparklesIcon,
    DocumentPlusIcon,
    CpuChipIcon,
    PencilSquareIcon,
    ChevronRightIcon
} from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Lazy load panels
const AiLessonGenerator = lazy(() => import('./AiLessonGenerator'));
const ManualLessonCreator = lazy(() => import('./ManualLessonCreator'));

// --- MACOS UI COMPONENTS ---

const MacTrafficLights = ({ onClose }) => (
    <div className="flex gap-2 group px-4 z-50">
        <button 
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] flex items-center justify-center hover:brightness-90 transition-all shadow-sm"
        >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4c0b0b]">✕</span>
        </button>
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] flex items-center justify-center shadow-sm cursor-default">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4c3e0b]">-</span>
        </div>
        <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] flex items-center justify-center shadow-sm cursor-default">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#0b4c14]">＋</span>
        </div>
    </div>
);

// New "System Settings" / "Welcome" Style Option Row
const MacWelcomeRow = ({ title, description, icon: Icon, color, onClick, delay }) => (
    <button
        onClick={onClick}
        style={{ animationDelay: `${delay}ms` }}
        className="group w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200
                   bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm
                   hover:bg-blue-500 hover:border-blue-500 hover:shadow-md
                   active:scale-[0.99] animate-in slide-in-from-right-4 fade-in fill-mode-backwards"
    >
        {/* Icon Container */}
        <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm
            ${color} group-hover:bg-white/20 group-hover:text-white transition-colors
        `}>
            <Icon className="w-6 h-6" />
        </div>

        {/* Text Content */}
        <div className="flex-1 text-left">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-white transition-colors">
                {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-100 transition-colors line-clamp-1">
                {description}
            </p>
        </div>

        {/* Arrow */}
        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-white/80 transition-colors" />
    </button>
);

const ModeSelection = ({ onSelect }) => (
    <div className="flex flex-col md:flex-row h-full w-full">
        
        {/* LEFT SIDEBAR: Branding/Context (Frosted Glass) */}
        <div className="w-full md:w-[260px] flex-none bg-gray-50/80 dark:bg-black/20 backdrop-blur-md border-r border-gray-200/50 dark:border-white/5 p-6 md:p-8 flex flex-col justify-between">
            <div>
                <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-gray-800 to-black dark:from-white dark:to-gray-300 shadow-lg flex items-center justify-center mb-6">
                    <PencilSquareIcon className="w-7 h-7 text-white dark:text-black" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-2">
                    New <br /> Lesson
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Select a creation method to get started.
                </p>
            </div>
            
            <div className="hidden md:block">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Version 2.0</p>
            </div>
        </div>

        {/* RIGHT CONTENT: Action List */}
        <div className="flex-1 p-6 md:p-10 flex flex-col justify-center bg-white dark:bg-[#1e1e1e]">
            <div className="space-y-4 max-w-md mx-auto w-full">
                <MacWelcomeRow
                    title="AI Assistant"
                    description="Auto-generate from topics, files, or links."
                    icon={SparklesIcon}
                    color="bg-gradient-to-br from-blue-500 to-indigo-600"
                    onClick={() => onSelect('ai')}
                    delay={100}
                />
                
                <MacWelcomeRow
                    title="Manual Editor"
                    description="Start with a blank document canvas."
                    icon={DocumentPlusIcon}
                    color="bg-gradient-to-br from-emerald-500 to-teal-600"
                    onClick={() => onSelect('manual')}
                    delay={200}
                />
            </div>
        </div>
    </div>
);

// Fallback Loading
const LoadingPanel = () => (
    <div className="flex h-full w-full items-center justify-center">
        <Spinner />
    </div>
);

export default function AddLessonModal({ isOpen, onClose, unitId, subjectId, setIsAiGenerating }) {
    const [creationMode, setCreationMode] = useState(null);
    const [targetSchoolId, setTargetSchoolId] = useState(null);
    const { darkMode } = useTheme();

    useEffect(() => {
        const fetchCoursePrivacy = async () => {
            if (!subjectId) return;
            try {
                const courseRef = doc(db, 'courses', subjectId);
                const courseSnap = await getDoc(courseRef);
                if (courseSnap.exists()) {
                    setTargetSchoolId(courseSnap.data().schoolId || 'global');
                }
            } catch (err) {
                console.error("Failed to fetch course privacy settings:", err);
            }
        };
        if (isOpen) fetchCoursePrivacy();
    }, [isOpen, subjectId]);

    const handleClose = useCallback(() => {
        setTimeout(() => setCreationMode(null), 300);
        onClose();
    }, [onClose]);

    // --- DYNAMIC LAYOUT CLASSES ---

    const getWindowClasses = () => {
        const base = `
            relative flex flex-col overflow-hidden 
            transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
            bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-2xl
            shadow-2xl ring-1 ring-black/10 dark:ring-white/10
        `;

        if (creationMode) {
            // FULL SCREEN MODE:
            return `${base} w-screen h-[100dvh] rounded-none max-w-none`;
        }

        // SELECTION MODE (Compact):
        // Fixed max width/height, centered
        return `${base} w-full max-w-2xl rounded-xl h-[450px]`;
    };

    const wrapperClasses = `
        fixed inset-0 z-[100] flex items-center justify-center 
        transition-all duration-500
        ${creationMode ? 'p-0' : 'p-4 sm:p-6'} 
    `;

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[100]">
            
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] transition-opacity duration-300" 
                aria-hidden="true" 
            />
            
            <div className={wrapperClasses}>
                <Dialog.Panel className={getWindowClasses()}>
                    
                    {/* --- HEADER --- */}
                    {/* Fixed height header for traffic lights. Title is removed if in creationMode */}
                    <div className={`flex-none h-10 flex items-center justify-between z-50 select-none 
                        ${creationMode ? 'bg-white/50 dark:bg-black/20 border-b border-gray-200/50 dark:border-white/5' : 'absolute top-0 left-0 w-full'}`}>
                        
                        <MacTrafficLights onClose={handleClose} />
                        
                        {/* Only show title in Selection Mode, remove it in Full Screen mode so content has 100% focus */}
                        {!creationMode && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide opacity-80 uppercase">
                                    Creation Studio
                                </span>
                            </div>
                        )}
                        
                        <div className="w-16" /> 
                    </div>

                    {/* --- BODY (Scrollable) --- */}
                    <div className="flex-1 w-full relative overflow-hidden bg-white dark:bg-[#1e1e1e]">
                        <Suspense fallback={<LoadingPanel />}>
                            
                            {creationMode === 'ai' && (
                                <div className="w-full h-full overflow-y-auto custom-scrollbar">
                                    <AiLessonGenerator 
                                        onClose={handleClose} 
                                        onBack={() => setCreationMode(null)} 
                                        unitId={unitId} 
                                        subjectId={subjectId} 
                                        setIsAiGenerating={setIsAiGenerating}
                                        schoolId={targetSchoolId}
                                    />
                                </div>
                            )}
                            
                            {creationMode === 'manual' && (
                                <div className="w-full h-full overflow-y-auto custom-scrollbar">
                                    <ManualLessonCreator 
                                        onClose={handleClose} 
                                        onBack={() => setCreationMode(null)} 
                                        unitId={unitId} 
                                        subjectId={subjectId} 
                                        schoolId={targetSchoolId}
                                    />
                                </div>
                            )}

                            {!creationMode && (
                                <ModeSelection onSelect={setCreationMode} />
                            )}
                        </Suspense>
                    </div>
                    
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}