import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    PencilSquareIcon, TrashIcon, SparklesIcon, PlusCircleIcon,
    EyeIcon, DocumentTextIcon, BeakerIcon, ArrowUpOnSquareIcon, ClipboardDocumentListIcon
} from '@heroicons/react/24/solid';

import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import Spinner from '../common/Spinner';

// (ContentItem and UnitCard components remain unchanged, but I've added dark mode styles for consistency)

const ContentItem = ({ item, onSelect, onGenerateQuiz, onInitiateDelete, variants }) => {
    const isLesson = item.type === 'lesson';
    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;
    const iconColor = isLesson ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400';
    
    return (
        <motion.li
            variants={variants}
            className="group flex items-center justify-between p-3 last:border-b-0 transition-shadow duration-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark rounded-lg"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={`p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-base truncate">{item.lessonTitle || item.title}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                <button onClick={() => onSelect(item, 'view')} className="p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="View"><EyeIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
                <button onClick={() => onSelect(item, 'edit')} className="p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="Edit"><PencilSquareIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
                {isLesson && <button onClick={() => onGenerateQuiz(item)} className="p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="AI Quiz"><SparklesIcon className="w-5 h-5 text-purple-500 dark:text-purple-400" /></button>}
                <button onClick={() => onInitiateDelete({ type: item.type, data: item })} className="p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="Delete"><TrashIcon className="w-5 h-5 text-red-500 dark:text-red-400" /></button>
            </div>
        </motion.li>
    );
};

const UnitCard = ({ unit, lessons, quizzes, onSelectContent, onSelectUnit, onGenerateQuiz, onInitiateDelete, variants }) => {
    const listVariants = {
        visible: { transition: { staggerChildren: 0.05 } },
        hidden: {}
    };
    const itemVariants = {
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 10 }
    };
    
    const combinedContent = [
        ...lessons.map(l => ({ ...l, type: 'lesson' })),
        ...quizzes.map(q => ({...q, type: 'quiz' })),
    ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return (
        <motion.div
            variants={variants}
            className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-lg p-6"
        >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neumorphic-shadow-dark/30 dark:border-slate-700">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{unit.title}</h3>
                <div className="flex items-center gap-1">
                    <button onClick={() => onSelectUnit(unit, 'addLesson')} className="p-2 text-blue-600 dark:text-blue-400 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="Add Lesson"><PlusCircleIcon className="w-6 h-6" /></button>
                    <button onClick={() => onSelectUnit(unit, 'edit')} className="p-2 text-slate-500 dark:text-slate-400 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="Edit Unit"><PencilSquareIcon className="w-6 h-6" /></button>
                    <button onClick={() => onInitiateDelete({ type: 'unit', data: unit })} className="p-2 text-red-500 dark:text-red-400 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="Delete Unit"><TrashIcon className="w-6 h-6" /></button>
                </div>
            </div>
            <div>
                <motion.ul initial="hidden" animate="visible" variants={listVariants}>
                    {combinedContent.length > 0 ? (
                        combinedContent.map(item => (
                            <ContentItem key={item.id} item={item} onSelect={onSelectContent} onGenerateQuiz={onGenerateQuiz} onInitiateDelete={onInitiateDelete} variants={itemVariants} />
                        ))
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-6">No content in this unit yet.</p>
                    )}
                </motion.ul>
            </div>
        </motion.div>
    );
};


const SubjectDetailView = (props) => {
    const { 
        subject,
        setIsAiGenerating,
        handleOpenEditSubject, handleOpenDeleteSubject, 
        setShareContentModalOpen, setAddUnitModalOpen, setIsAiHubOpen, 
        setSelectedUnit, setEditUnitModalOpen, setAddLessonModalOpen, 
        setSelectedLesson, setViewLessonModalOpen, setEditLessonModalOpen, 
        setSelectedQuiz, setViewQuizModalOpen, setEditQuizModalOpen,
        onInitiateDelete, onGenerateQuiz 
    } = props;

    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!subject?.id) return;
        setIsLoading(true); setError(null);
        const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subject.id), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(unitsQuery, (querySnapshot) => {
            setUnits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching units:", err);
            setError("Failed to load subject units.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [subject]);

    useEffect(() => {
        if (!subject?.id) return;
        const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
        const quizzesQuery = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
        
        const unsubLessons = onSnapshot(lessonsQuery, (snapshot) => {
            setAllLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        
        const unsubQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
            setAllQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubLessons();
            unsubQuizzes();
        };
    }, [subject]);

    const handleSelectUnit = (unit, action) => {
        setSelectedUnit(unit);
        if (action === 'edit') setEditUnitModalOpen(true);
        if (action === 'addLesson') {
            setIsAiGenerating(false);
            setAddLessonModalOpen(true);
        }
    };

    const handleSelectContent = (item, action) => {
        if (item.type === 'lesson') {
            setSelectedLesson(item);
            if (action === 'view') setViewLessonModalOpen(true);
            if (action === 'edit') setEditLessonModalOpen(true);
        } else {
            setSelectedQuiz(item);
            if (action === 'view') setViewQuizModalOpen(true);
            if (action === 'edit') setEditQuizModalOpen(true);
        }
    };

    const containerVariants = {
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {}
    };
    const itemVariants = {
        visible: { opacity: 1, y: 0, scale: 1 },
        hidden: { opacity: 0, y: 20, scale: 0.95 }
    };

    // --- START OF LAYOUT FIX ---
    return (
        // 1. Root div: Removed min-h-screen and py-12. Added flex layout.
        <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark font-sans flex-1 flex flex-col">
            {/* 2. Card div: Added flex layout and min-h-0 to allow internal scrolling */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col min-h-0 py-6">
                
                {/* 3. Header: This is the NON-SCROLLING header. */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{subject.title}</h1>
                        <div className="flex gap-1 mt-2">
                            <button onClick={() => handleOpenEditSubject(subject)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full" title="Edit Subject"><PencilSquareIcon className="w-5 h-5" /></button>
                            <button onClick={() => handleOpenDeleteSubject(subject)} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-full" title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap self-start sm:self-center">
                        <button onClick={() => setShareContentModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-lg transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
                            <ArrowUpOnSquareIcon className="w-5 h-5" /> Share
                        </button>
                        <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-800 rounded-full shadow-neumorphic dark:shadow-lg transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
                            <PlusCircleIcon className="w-5 h-5" /> Add Unit
                        </button>
                        <button onClick={() => setIsAiHubOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg transition-all transform hover:scale-105">
                            <SparklesIcon className="w-5 h-5" /> AI Tools
                        </button>
                    </div>
                </div>

                {/* 4. Content Area: Added flex-1, overflow-y-auto, and min-h-0. This will scroll. */}
                <motion.div 
                    initial="hidden" 
                    animate="visible" 
                    variants={containerVariants} 
                    className="space-y-8 flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2"
                >
                    {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
                    {!isLoading && error && <p className="text-center text-red-500 text-lg">{error}</p>}
                    {!isLoading && !error && units.length > 0 && (
                        units.map((unit) => (
                            <UnitCard 
                                key={unit.id} 
                                unit={unit} 
                                lessons={allLessons.filter(l => l.unitId === unit.id)}
                                quizzes={allQuizzes.filter(q => q.unitId === unit.id)}
                                onSelectContent={handleSelectContent} 
                                onSelectUnit={handleSelectUnit} 
                                onGenerateQuiz={onGenerateQuiz} 
                                onInitiateDelete={onInitiateDelete} 
                                variants={itemVariants} 
                            />
                        ))
                    )}
                    {!isLoading && !error && units.length === 0 && (
                         <div className="text-center py-16 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                            <BeakerIcon className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" />
                            <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">No units created yet.</h3>
                            <p className="mt-2 text-md text-slate-500 dark:text-slate-400">Get started by creating your first unit.</p>
                            <div className="mt-8">
                                <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center mx-auto gap-2 px-6 py-3 text-md font-bold text-blue-700 dark:text-blue-300 bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-800 rounded-full shadow-neumorphic dark:shadow-lg transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
                                    <PlusCircleIcon className="h-6 w-6" />
                                    Create New Unit
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* 5. Added custom scrollbar styles */}
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: rgba(156, 163, 175, 0.5); /* gray-400 */
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: rgba(107, 114, 128, 0.5); /* gray-500 */
              }
              .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: rgba(100, 116, 139, 0.5); /* slate-500 */
              }
              .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: rgba(148, 163, 184, 0.5); /* slate-400 */
              }
            `}</style>
        </div>
        // --- END OF LAYOUT FIX ---
    );
};

export default SubjectDetailView;