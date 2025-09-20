import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    PencilSquareIcon, TrashIcon, SparklesIcon, PlusCircleIcon,
    EyeIcon, DocumentTextIcon, BeakerIcon, ArrowUpOnSquareIcon, ClipboardDocumentListIcon
} from '@heroicons/react/24/solid';

import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import Spinner from '../common/Spinner';

const ContentItem = ({ item, onSelect, onGenerateQuiz, onInitiateDelete, variants }) => {
    const isLesson = item.type === 'lesson';
    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;
    const iconColor = isLesson ? 'text-blue-600' : 'text-purple-600';
    
    return (
        <motion.li
            variants={variants}
            className="group flex items-center justify-between p-3 last:border-b-0 transition-shadow duration-200 hover:shadow-neumorphic-inset rounded-lg"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={`p-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <span className="font-semibold text-slate-800 text-base truncate">{item.lessonTitle || item.title}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                <button onClick={() => onSelect(item, 'view')} className="p-2 rounded-full hover:shadow-neumorphic-inset" title="View"><EyeIcon className="w-5 h-5 text-slate-500" /></button>
                <button onClick={() => onSelect(item, 'edit')} className="p-2 rounded-full hover:shadow-neumorphic-inset" title="Edit"><PencilSquareIcon className="w-5 h-5 text-slate-500" /></button>
                {isLesson && <button onClick={() => onGenerateQuiz(item)} className="p-2 rounded-full hover:shadow-neumorphic-inset" title="AI Quiz"><SparklesIcon className="w-5 h-5 text-purple-500" /></button>}
                <button onClick={() => onInitiateDelete({ type: item.type, data: item })} className="p-2 rounded-full hover:shadow-neumorphic-inset" title="Delete"><TrashIcon className="w-5 h-5 text-red-500" /></button>
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
            className="bg-neumorphic-base rounded-3xl shadow-neumorphic p-6"
        >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neumorphic-shadow-dark/30">
                <h3 className="text-xl font-bold tracking-tight text-slate-900">{unit.title}</h3>
                <div className="flex items-center gap-1">
                    <button onClick={() => onSelectUnit(unit, 'addLesson')} className="p-2 text-blue-600 rounded-full hover:shadow-neumorphic-inset" title="Add Lesson"><PlusCircleIcon className="w-6 h-6" /></button>
                    <button onClick={() => onSelectUnit(unit, 'edit')} className="p-2 text-slate-500 rounded-full hover:shadow-neumorphic-inset" title="Edit Unit"><PencilSquareIcon className="w-6 h-6" /></button>
                    <button onClick={() => onInitiateDelete({ type: 'unit', data: unit })} className="p-2 text-red-500 rounded-full hover:shadow-neumorphic-inset" title="Delete Unit"><TrashIcon className="w-6 h-6" /></button>
                </div>
            </div>
            <div>
                <motion.ul initial="hidden" animate="visible" variants={listVariants}>
                    {combinedContent.length > 0 ? (
                        combinedContent.map(item => (
                            <ContentItem key={item.id} item={item} onSelect={onSelectContent} onGenerateQuiz={onGenerateQuiz} onInitiateDelete={onInitiateDelete} variants={itemVariants} />
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-6">No content in this unit yet.</p>
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

    return (
        <div className="min-h-screen bg-neumorphic-base py-12 font-sans">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">{subject.title}</h1>
                        <div className="flex gap-1 mt-2">
                            <button onClick={() => handleOpenEditSubject(subject)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full" title="Edit Subject"><PencilSquareIcon className="w-5 h-5" /></button>
                            <button onClick={() => handleOpenDeleteSubject(subject)} className="p-2 text-red-400 hover:text-red-600 rounded-full" title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap self-start sm:self-center">
                        <button onClick={() => setShareContentModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset">
                            <ArrowUpOnSquareIcon className="w-5 h-5" /> Share
                        </button>
                        <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset">
                            <PlusCircleIcon className="w-5 h-5" /> Add Unit
                        </button>
                        <button onClick={() => setIsAiHubOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg transition-all transform hover:scale-105">
                            <SparklesIcon className="w-5 h-5" /> AI Tools
                        </button>
                    </div>
                </div>

                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
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
                         <div className="text-center py-16 bg-neumorphic-base rounded-3xl shadow-neumorphic-inset">
                            <BeakerIcon className="mx-auto h-16 w-16 text-slate-400" />
                            <h3 className="mt-4 text-xl font-semibold text-slate-800">No units created yet.</h3>
                            <p className="mt-2 text-md text-slate-500">Get started by creating your first unit.</p>
                            <div className="mt-8">
                                <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center mx-auto gap-2 px-6 py-3 text-md font-bold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset">
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