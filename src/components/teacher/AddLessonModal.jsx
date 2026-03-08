// src/components/teacher/AddLessonModal.jsx
import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { Dialog, Transition, Portal } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SparklesIcon,
    DocumentPlusIcon,
    XMarkIcon,
    PencilSquareIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Lazy load panels
const AiLessonGenerator = lazy(() => import('./AiLessonGenerator'));
const ManualLessonCreator = lazy(() => import('./ManualLessonCreator'));

const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

const CreatorOptionCard = ({ title, description, icon: Icon, colorTheme, onClick, index }) => {
    const themes = {
        blue: {
            bgIcon: 'bg-blue-50',
            bgHover: 'bg-blue-50/50',
            textIcon: 'text-blue-500',
            textHover: 'group-hover:text-blue-600',
            borderHover: 'hover:border-blue-200',
        },
        teal: {
            bgIcon: 'bg-teal-50',
            bgHover: 'bg-teal-50/50',
            textIcon: 'text-teal-500',
            textHover: 'group-hover:text-teal-600',
            borderHover: 'hover:border-teal-200',
        }
    };

    const theme = themes[colorTheme] || themes.blue;

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: index * 0.1 + 0.2 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`group relative w-full flex flex-col items-start p-6 rounded-[28px] bg-white border border-slate-100 shadow-sm hover:shadow-xl ${theme.borderHover} transition-all overflow-hidden text-left`}
        >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${theme.bgHover}`} />

            <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${theme.bgIcon} transition-colors duration-500`}>
                <Icon className={`w-7 h-7 ${theme.textIcon} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`} strokeWidth={2} />
            </div>

            <h3 className={`relative z-10 text-[17px] font-bold text-slate-800 mb-1.5 ${theme.textHover} transition-colors`}>
                {title}
            </h3>
            <p className="relative z-10 text-[13px] font-medium text-slate-500 leading-relaxed mb-4">
                {description}
            </p>

            <div className="relative z-10 mt-auto w-full flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-widest text-slate-400 ${theme.textHover} transition-colors`}>
                    Select
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-white transition-colors`}>
                    <ChevronRightIcon className={`w-4 h-4 text-slate-400 ${theme.textHover} transition-colors`} strokeWidth={3} />
                </div>
            </div>
        </motion.button>
    );
};

const LoadingPanel = () => (
    <div className="flex h-full w-full items-center justify-center">
        <Spinner />
    </div>
);

export default function AddLessonModal({ isOpen, onClose, unitId, subjectId, setIsAiGenerating }) {
    const [creationMode, setCreationMode] = useState(null);
    const [targetSchoolId, setTargetSchoolId] = useState(null);

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

    if (!isOpen) return null;

    return (
        <Portal>
            <AnimatePresence>
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    {/* Immersive Blur Backdrop */}
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={SPRING}
                        className={`relative flex flex-col overflow-hidden bg-white/95 backdrop-blur-3xl shadow-2xl ring-1 ring-black/5 transform transition-all duration-500
                        ${creationMode ? 'w-full h-full max-w-none rounded-[32px]' : 'w-full max-w-2xl rounded-[32px] min-h-[500px]'}`}
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
                    >
                        {/* --- HEADER --- */}
                        <div className={`flex items-center justify-between px-6 py-4 z-50 transition-colors ${creationMode ? 'bg-white/80 border-b border-slate-100 backdrop-blur-md' : 'absolute top-0 right-0 w-full'}`}>
                            {creationMode ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <PencilSquareIcon className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 tracking-wide">
                                        {creationMode === 'ai' ? 'AI Lesson Generator' : 'Manual Editor'}
                                    </span>
                                </div>
                            ) : <div />}

                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all focus:outline-none"
                            >
                                <XMarkIcon className="w-6 h-6" strokeWidth={2} />
                            </button>
                        </div>

                        {/* --- BODY --- */}
                        <div className="flex-1 w-full relative overflow-y-auto custom-scrollbar">
                            <Suspense fallback={<LoadingPanel />}>
                                {creationMode === 'ai' && (
                                    <AiLessonGenerator
                                        onClose={handleClose}
                                        onBack={() => setCreationMode(null)}
                                        unitId={unitId}
                                        subjectId={subjectId}
                                        setIsAiGenerating={setIsAiGenerating}
                                        schoolId={targetSchoolId}
                                    />
                                )}

                                {creationMode === 'manual' && (
                                    <ManualLessonCreator
                                        onClose={handleClose}
                                        onBack={() => setCreationMode(null)}
                                        unitId={unitId}
                                        subjectId={subjectId}
                                        schoolId={targetSchoolId}
                                    />
                                )}

                                {!creationMode && (
                                    <div className="absolute inset-0 flex flex-col md:flex-row pt-14">
                                        {/* Left branding */}
                                        <div className="w-full md:w-[45%] p-8 md:p-12 flex flex-col items-start justify-center text-left bg-white border-r border-slate-100">
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, ...SPRING }}
                                                className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6"
                                            >
                                                <PencilSquareIcon className="w-8 h-8 text-blue-500" />
                                            </motion.div>
                                            <motion.h2
                                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                                                className="text-3xl font-bold text-slate-800 tracking-tight leading-tight mb-3"
                                            >
                                                New Module
                                            </motion.h2>
                                            <motion.p
                                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                                                className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm"
                                            >
                                                Choose how you want to create your curriculum content. Build from scratch or leverage advanced AI.
                                            </motion.p>
                                        </div>

                                        {/* Right options */}
                                        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center bg-slate-50/50">
                                            <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto w-full">
                                                <CreatorOptionCard
                                                    index={0}
                                                    title="AI Magic Creator"
                                                    description="Instantly generate structured lessons from standard topics, PDFs, or links."
                                                    icon={SparklesIcon}
                                                    colorTheme="blue"
                                                    onClick={() => setCreationMode('ai')}
                                                />
                                                <CreatorOptionCard
                                                    index={1}
                                                    title="Manual Blank Canvas"
                                                    description="Draft your own instructional guide with our powerful rich-text editor."
                                                    icon={DocumentPlusIcon}
                                                    colorTheme="teal"
                                                    onClick={() => setCreationMode('manual')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Suspense>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        </Portal>
    );
}