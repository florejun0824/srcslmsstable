// SubjectDetailView.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PencilSquareIcon, TrashIcon, SparklesIcon, PlusCircleIcon,
    EyeIcon, DocumentTextIcon, BeakerIcon, ArrowUpOnSquareIcon
} from '@heroicons/react/24/solid';

import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import Spinner from '../common/Spinner'; // Assumes the refactored Spinner

// --- Refactored LessonItem ---
const LessonItem = ({ lesson, onSelect, onGenerateQuiz, onInitiateDelete, variants }) => {
    return (
        <motion.li
            variants={variants}
            className="group flex items-center justify-between p-4 border-b border-black/5 dark:border-white/10 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10 flex-shrink-0">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-lg">{lesson.lessonTitle || lesson.title}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={() => onSelect(lesson, 'view')} className="p-2 text-gray-500 hover:text-blue-600 rounded-full" title="View"><EyeIcon className="w-5 h-5" /></button>
                <button onClick={() => onSelect(lesson, 'edit')} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full" title="Edit"><PencilSquareIcon className="w-5 h-5" /></button>
                <button onClick={() => onGenerateQuiz(lesson)} className="p-2 text-gray-500 hover:text-purple-600 rounded-full" title="AI Quiz"><SparklesIcon className="w-5 h-5" /></button>
                <button onClick={() => onInitiateDelete({ type: 'lesson', data: lesson })} className="p-2 text-gray-500 hover:text-red-600 rounded-full" title="Delete"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </motion.li>
    );
};

// --- Refactored UnitCard ---
const UnitCard = ({ unit, onSelectLesson, onSelectUnit, onGenerateQuiz, onInitiateDelete, variants }) => {
    const [lessons, setLessons] = useState([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(true);

    useEffect(() => {
        if (!unit.id) return;
        setIsLoadingLessons(true);
        const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unit.id), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
            setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoadingLessons(false);
        }, (error) => {
            console.error("Error fetching lessons:", error);
            setIsLoadingLessons(false);
        });
        return () => unsubscribe();
    }, [unit.id]);

    const listVariants = {
        visible: { transition: { staggerChildren: 0.05 } },
        hidden: {}
    };
    const itemVariants = {
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 20 }
    };

    return (
        <motion.div
            variants={variants}
            className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 rounded-3xl shadow-2xl p-7 text-gray-800 transform transition-transform duration-300 hover:scale-[1.02]"
        >
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-black/10 dark:border-white/10">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{unit.title}</h3>
                <div className="flex items-center gap-1">
                    <button onClick={() => onSelectUnit(unit, 'addLesson')} className="p-2 text-gray-500 hover:text-blue-600 rounded-full" title="Add Lesson"><PlusCircleIcon className="w-6 h-6" /></button>
                    <button onClick={() => onSelectUnit(unit, 'edit')} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full" title="Edit Unit"><PencilSquareIcon className="w-6 h-6" /></button>
                    <button onClick={() => onInitiateDelete({ type: 'unit', data: unit })} className="p-2 text-gray-500 hover:text-red-600 rounded-full" title="Delete Unit"><TrashIcon className="w-6 h-6" /></button>
                </div>
            </div>
            <div className="min-h-[5rem]">
                {isLoadingLessons ? (
                    <div className="flex justify-center items-center py-4"><Spinner /></div>
                ) : (
                    <motion.ul initial="hidden" animate="visible" variants={listVariants}>
                        {lessons.length > 0 ? (
                            lessons.map(lesson => (
                                <LessonItem key={lesson.id} lesson={lesson} onSelect={onSelectLesson} onGenerateQuiz={onGenerateQuiz} onInitiateDelete={onInitiateDelete} variants={itemVariants} />
                            ))
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-6">No lessons in this unit yet.</p>
                        )}
                    </motion.ul>
                )}
            </div>
        </motion.div>
    );
};

// --- Refactored SubjectDetailView ---
const SubjectDetailView = (props) => {
    const { subject, handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen, setAddUnitModalOpen, setIsAiHubOpen, setSelectedUnit, setEditUnitModalOpen, setAddLessonModalOpen, setSelectedLesson, setViewLessonModalOpen, setEditLessonModalOpen, onInitiateDelete, onGenerateQuiz } = props;
    const [units, setUnits] = useState([]);
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

    const handleSelectUnit = (unit, action) => {
        setSelectedUnit(unit);
        if (action === 'edit') setEditUnitModalOpen(true);
        if (action === 'addLesson') setAddLessonModalOpen(true);
    };
    const handleSelectLesson = (lesson, action) => {
        setSelectedLesson(lesson);
        if (action === 'view') setViewLessonModalOpen(true);
        if (action === 'edit') setEditLessonModalOpen(true);
    };

    const containerVariants = {
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {}
    };
    const itemVariants = {
        visible: { opacity: 1, y: 0, scale: 1 },
        hidden: { opacity: 0, y: 20, scale: 0.95 }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black py-12 font-sans">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Frameless Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
                    <div>
                        <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">{subject.title}</h1>
                        <div className="flex gap-1 mt-2">
                            <button onClick={() => handleOpenEditSubject(subject)} className="p-2 text-gray-400 hover:text-indigo-600 rounded-full" title="Edit Subject"><PencilSquareIcon className="w-6 h-6" /></button>
                            <button onClick={() => handleOpenDeleteSubject(subject)} className="p-2 text-gray-400 hover:text-red-600 rounded-full" title="Delete Subject"><TrashIcon className="w-6 h-6" /></button>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <button onClick={() => setShareContentModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-500/10 rounded-full hover:bg-indigo-500/20 transition-colors">
                            <ArrowUpOnSquareIcon className="w-5 h-5" /> Share
                        </button>
                        <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-600 bg-blue-500/10 rounded-full hover:bg-blue-500/20 transition-colors">
                            <PlusCircleIcon className="w-5 h-5" /> Add Unit
                        </button>
                        <button onClick={() => setIsAiHubOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:shadow-lg transition-all transform hover:scale-105">
                            <SparklesIcon className="w-5 h-5" /> AI Tools
                        </button>
                    </div>
                </div>

                {/* Units Section */}
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
                    {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
                    {!isLoading && error && <p className="text-center text-red-500 text-lg">{error}</p>}
                    {!isLoading && !error && units.length > 0 && (
                        units.map((unit) => (
                            <UnitCard key={unit.id} unit={unit} onSelectLesson={handleSelectLesson} onSelectUnit={handleSelectUnit} onGenerateQuiz={onGenerateQuiz} onInitiateDelete={onInitiateDelete} variants={itemVariants} />
                        ))
                    )}
                    {!isLoading && !error && units.length === 0 && (
                         <div className="text-center py-16 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 rounded-3xl shadow-2xl">
                            <BeakerIcon className="mx-auto h-16 w-16 text-gray-400" />
                            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">No units created yet.</h3>
                            <p className="mt-2 text-md text-gray-500 dark:text-gray-400">Get started by creating your first unit.</p>
                            <div className="mt-8">
                                <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center mx-auto gap-2 px-6 py-3 text-md font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-lg transform hover:scale-105">
                                    <PlusCircleIcon className="h-6 w-6" />
                                    Create New Unit
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default SubjectDetailView;