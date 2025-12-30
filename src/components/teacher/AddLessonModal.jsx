import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import {
    XMarkIcon, SparklesIcon, DocumentPlusIcon, ChevronRightIcon, BookOpenIcon
} from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../services/firebase'; // ✅ Added db import
import { doc, getDoc } from 'firebase/firestore'; // ✅ Added firestore imports

// Lazy load the main panel components
const AiLessonGenerator = lazy(() => import('./AiLessonGenerator'));
const ManualLessonCreator = lazy(() => import('./ManualLessonCreator'));

// --- HELPER: MONET STYLES ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay) return null;

    const base = {
        // Modal Container (Selection Mode)
        container: "backdrop-blur-xl shadow-2xl border", 
        // Solid Background (Editor Mode - No Blur for performance)
        solidBg: "bg-[#0f172a]", 
        textTitle: "text-white",
        textSub: "text-white/60",
        card: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white shadow-lg",
        iconBox: "bg-white/10 ring-white/10 text-white",
        accentText: "text-white",
        closeBtn: "bg-white/10 hover:bg-white/20 text-white border-transparent"
    };

    switch (activeOverlay) {
        case 'christmas':
            return {
                ...base,
                container: `${base.container} bg-[#0f172a]/95 border-emerald-500/20 shadow-emerald-900/20`,
                solidBg: "bg-[#020617]", 
                accentIcon: "text-emerald-400",
            };
        case 'valentines':
            return {
                ...base,
                container: `${base.container} bg-[#2c0b0e]/95 border-rose-500/20 shadow-rose-900/20`,
                solidBg: "bg-[#1f0508]",
                accentIcon: "text-rose-400",
            };
        case 'graduation':
            return {
                ...base,
                container: `${base.container} bg-[#1a1400]/95 border-amber-500/20 shadow-amber-900/20`,
                solidBg: "bg-[#140f00]",
                accentIcon: "text-amber-400",
            };
        case 'rainy':
            return {
                ...base,
                container: `${base.container} bg-[#061816]/95 border-teal-500/20 shadow-teal-900/20`,
                solidBg: "bg-[#020909]",
                accentIcon: "text-teal-400",
            };
        case 'cyberpunk':
            return {
                ...base,
                container: `${base.container} bg-[#180a20]/95 border-fuchsia-500/20 shadow-fuchsia-900/20`,
                solidBg: "bg-[#0d0312]",
                accentIcon: "text-fuchsia-400",
            };
        case 'spring':
            return {
                ...base,
                container: `${base.container} bg-[#1f0f15]/95 border-pink-500/20 shadow-pink-900/20`,
                solidBg: "bg-[#120509]",
                accentIcon: "text-pink-400",
            };
        case 'space':
            return {
                ...base,
                container: `${base.container} bg-[#020617]/95 border-indigo-500/20 shadow-indigo-900/20`,
                solidBg: "bg-[#00020a]",
                accentIcon: "text-indigo-400",
            };
        default:
            return null;
    }
};

// Fallback component for Suspense
const LoadingPanel = () => (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Spinner />
    </div>
);

// Component for the initial mode selection
const ModeSelection = ({ onSelect, monet }) => {
    // Default Styles (Candy)
    const defaultCardClass = "bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl";
    const defaultTitle = "text-slate-900 dark:text-white";
    const defaultText = "text-slate-500 dark:text-slate-400";
    const defaultIconBox = "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/30 ring-1 ring-black/5 dark:ring-white/10";
    const defaultGreenIconBox = "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 ring-1 ring-black/5 dark:ring-white/10";

    return (
        <div className="p-6 sm:p-12 flex flex-col h-full justify-center">
            <div className="text-center mb-10">
                <div className={`w-16 h-16 mx-auto rounded-[22px] flex items-center justify-center shadow-lg mb-6 ring-4 ${monet ? `${monet.iconBox} shadow-none` : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/30 ring-white/20'}`}>
                    <BookOpenIcon className={`w-8 h-8 ${monet ? 'text-white' : 'text-white'}`} />
                </div>
                <Dialog.Title as="h3" className={`text-3xl font-bold mb-3 tracking-tight ${monet ? monet.textTitle : 'text-slate-900 dark:text-white'}`}>
                    Create New Lesson
                </Dialog.Title>
                <p className={`text-lg max-w-md mx-auto leading-relaxed ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>
                    Choose how you'd like to start building your lesson content today.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                {/* AI Option */}
                <button
                    onClick={() => onSelect('ai')}
                    className={`group relative flex flex-col items-start text-left p-6 h-auto
                           rounded-[24px] transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden
                           ${monet ? monet.card : defaultCardClass}`}
                >
                    {!monet && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
                    
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300 ${monet ? monet.iconBox : defaultIconBox}`}>
                        <SparklesIcon className={`w-6 h-6 ${monet ? monet.accentIcon : 'text-[#007AFF] dark:text-blue-400'}`} />
                    </div>
                    
                    <h4 className={`text-xl font-bold mb-2 tracking-tight ${monet ? monet.textTitle : defaultTitle}`}>
                        AI Assistant
                    </h4>
                    <p className={`text-sm leading-relaxed mb-6 ${monet ? monet.textSub : defaultText}`}>
                        Instantly generate comprehensive lessons from a topic, document, or video link.
                    </p>
                    
                    <div className={`mt-auto flex items-center text-sm font-bold group-hover:translate-x-1 transition-transform ${monet ? monet.accentText : 'text-[#007AFF] dark:text-blue-400'}`}>
                        Start with AI <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[3]" />
                    </div>
                </button>

                {/* Manual Option */}
                <button
                    onClick={() => onSelect('manual')}
                    className={`group relative flex flex-col items-start text-left p-6 h-auto
                           rounded-[24px] transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden
                           ${monet ? monet.card : defaultCardClass}`}
                >
                    {!monet && <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}

                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300 ${monet ? monet.iconBox : defaultGreenIconBox}`}>
                        <DocumentPlusIcon className={`w-6 h-6 ${monet ? monet.accentIcon : 'text-green-600 dark:text-green-400'}`} />
                    </div>
                    
                    <h4 className={`text-xl font-bold mb-2 tracking-tight ${monet ? monet.textTitle : defaultTitle}`}>
                        Manual Creation
                    </h4>
                    <p className={`text-sm leading-relaxed mb-6 ${monet ? monet.textSub : defaultText}`}>
                        Build your lesson from scratch, page by page, using our powerful rich text editor.
                    </p>

                    <div className={`mt-auto flex items-center text-sm font-bold group-hover:translate-x-1 transition-transform ${monet ? monet.accentText : 'text-green-600 dark:text-green-400'}`}>
                        Start Blank <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[3]" />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default function AddLessonModal({ isOpen, onClose, unitId, subjectId, setIsAiGenerating }) {
    const [creationMode, setCreationMode] = useState(null);
    const [targetSchoolId, setTargetSchoolId] = useState(null); // ✅ STATE: Holds inherited privacy
    
    // Theme Context
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    // ✅ EFFECT: Fetch the Course to check for schoolId
    useEffect(() => {
        const fetchCoursePrivacy = async () => {
            if (!subjectId) return;
            try {
                const courseRef = doc(db, 'courses', subjectId);
                const courseSnap = await getDoc(courseRef);
                if (courseSnap.exists()) {
                    const data = courseSnap.data();
                    // If the course has a schoolId, we use it. Otherwise default to 'global' (or null)
                    // You might use 'global' to denote public, or undefined for legacy.
                    setTargetSchoolId(data.schoolId || 'global');
                }
            } catch (err) {
                console.error("Failed to fetch course privacy settings:", err);
            }
        };

        if (isOpen) {
            fetchCoursePrivacy();
        }
    }, [isOpen, subjectId]);

    const handleClose = useCallback(() => {
        setTimeout(() => {
            setCreationMode(null);
        }, 300);
        onClose();
    }, [onClose]);

    const getPanelClassName = () => {
        const baseClasses = "relative flex flex-col transition-all duration-300 ease-out overflow-hidden shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:ring-white/5";
        
        // Background Logic: Use solid tinted color if Monet is active to avoid messiness, otherwise standard defaults
        const selectionBg = monet ? monet.container : 'bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800';
        const editorBg = monet ? `${monet.solidBg} border border-white/10 text-white` : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800';

        switch (creationMode) {
            case 'ai':
                return `${baseClasses} w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[32px] ${editorBg}`;
            case 'manual':
                return `${baseClasses} w-screen h-screen max-w-full max-h-screen rounded-none ${editorBg}`;
            default:
                return `${baseClasses} w-full max-w-3xl rounded-[32px] ${selectionBg}`;
        }
    };

    const renderContent = () => {
        switch (creationMode) {
            case 'ai':
                return (
                    <AiLessonGenerator 
                        onClose={handleClose} 
                        onBack={() => setCreationMode(null)} 
                        unitId={unitId} 
                        subjectId={subjectId} 
                        setIsAiGenerating={setIsAiGenerating}
                        schoolId={targetSchoolId} // ✅ PASS THE SCHOOL ID
                    />
                );
            case 'manual':
                return (
                    <ManualLessonCreator 
                        onClose={handleClose} 
                        onBack={() => setCreationMode(null)} 
                        unitId={unitId} 
                        subjectId={subjectId} 
                        schoolId={targetSchoolId} // ✅ PASS THE SCHOOL ID
                    />
                );
            default:
                return <ModeSelection onSelect={setCreationMode} monet={monet} />;
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            {/* Backdrop - Tinted if Monet */}
            <div className={`fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ${monet ? 'bg-black/60' : 'bg-black/20 dark:bg-black/60'}`} aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
                <Dialog.Panel className={getPanelClassName()}>
                    
                    {/* Floating Close Button */}
                    {!creationMode && (
                        <button
                            onClick={handleClose}
                            className={`absolute top-6 right-6 p-2.5 rounded-full transition-all duration-200 z-20 
                                ${monet ? monet.closeBtn : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400'}`}
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    )}

                    <Suspense fallback={<LoadingPanel />}>
                        {renderContent()}
                    </Suspense>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}