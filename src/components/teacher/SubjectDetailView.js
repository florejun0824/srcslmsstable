import React, { useState, useEffect } from 'react';
import {
    PencilSquareIcon, TrashIcon, SparklesIcon, PlusCircleIcon,
    EyeIcon, DocumentTextIcon, BeakerIcon, ArrowUpOnSquareIcon
} from '@heroicons/react/24/solid';

import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import Spinner from '../common/Spinner';

const LessonItem = ({ lesson, onSelect, onGenerateQuiz, onInitiateDelete }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl shadow-sm hover:shadow-md hover:bg-white transition-all duration-200 group">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                </div>
                <span className="font-semibold text-gray-800 text-lg group-hover:text-blue-800 transition-colors">{lesson.lessonTitle || lesson.title}</span>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onSelect(lesson, 'view')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors duration-200" title="View Lesson"><EyeIcon className="w-5 h-5" /></button>
                <button onClick={() => onSelect(lesson, 'edit')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors duration-200" title="Edit Lesson"><PencilSquareIcon className="w-5 h-5" /></button>
                <button onClick={() => onGenerateQuiz(lesson)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded-full transition-colors duration-200" title="Generate AI Quiz"><SparklesIcon className="w-5 h-5" /></button>
                <button onClick={() => onInitiateDelete({ type: 'lesson', data: lesson })} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200" title="Delete Lesson"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

const UnitCard = ({ unit, index, onSelectLesson, onSelectUnit, onGenerateQuiz, onInitiateDelete }) => {
    const [lessons, setLessons] = useState([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(true);

    useEffect(() => {
        if (!unit.id) return;
        setIsLoadingLessons(true);
        const lessonsQuery = query(
            collection(db, 'lessons'),
            where('unitId', '==', unit.id),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
            const fetchedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLessons(fetchedLessons);
            setIsLoadingLessons(false);
        }, (error) => {
            console.error("Error fetching lessons for unit: ", unit.id, error);
            setIsLoadingLessons(false);
        });
        return () => unsubscribe();
    }, [unit.id]);

    const unitGradients = [
        'from-blue-500 to-indigo-600',
        'from-green-500 to-emerald-600',
        'from-purple-500 to-violet-600',
        'from-rose-500 to-pink-600',
        'from-orange-500 to-amber-600'
    ];
    const gradient = unitGradients[index % unitGradients.length];

    return (
        <div className={`bg-white rounded-3xl shadow-xl p-7 text-gray-800 transform transition-transform duration-300 hover:scale-[1.01] border border-gray-200`}>
            <div className="flex items-center justify-between pb-5 mb-5 border-b-2 border-gray-200">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{unit.title}</h3>
                <div className="flex items-center gap-1">
                    <button onClick={() => onSelectUnit(unit, 'addLesson')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors duration-200" title="Add Lesson"><PlusCircleIcon className="w-6 h-6" /></button>
                    <button onClick={() => onSelectUnit(unit, 'edit')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors duration-200" title="Edit Unit"><PencilSquareIcon className="w-6 h-6" /></button>
                    <button onClick={() => onInitiateDelete({ type: 'unit', data: unit })} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200" title="Delete Unit"><TrashIcon className="w-6 h-6" /></button>
                </div>
            </div>
            <div className="space-y-3 min-h-[5rem]">
                {isLoadingLessons ? (
                    <div className="flex justify-center items-center py-4">
                        <Spinner />
                    </div>
                ) : lessons.length > 0 ? (
                    lessons.map(lesson => (
                        <LessonItem
                            key={lesson.id}
                            lesson={lesson}
                            onSelect={onSelectLesson}
                            onGenerateQuiz={onGenerateQuiz}
                            onInitiateDelete={onInitiateDelete}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-6 font-light">No lessons in this unit yet.</p>
                )}
            </div>
        </div>
    );
};

const SubjectDetailView = (props) => {
    const {
        subject, handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, setSelectedUnit, setEditUnitModalOpen,
        setAddLessonModalOpen, setSelectedLesson, setViewLessonModalOpen, setEditLessonModalOpen,
        onInitiateDelete, onGenerateQuiz
    } = props;

    const [units, setUnits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!subject || !subject.id) return;
        setIsLoading(true);
        setError(null);
        const unitsQuery = query(
            collection(db, 'units'),
            where('subjectId', '==', subject.id),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(unitsQuery, (querySnapshot) => {
            const fetchedUnits = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setUnits(fetchedUnits);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching units: ", err);
            setError("Failed to load subject units. Please try again.");
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

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header and Actions */}
                <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 mb-10 border border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{subject.title}</h1>
                            <div className="flex gap-1">
                                <button onClick={() => handleOpenEditSubject(subject)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors duration-200" title="Edit Subject Name"><PencilSquareIcon className="w-6 h-6" /></button>
                                <button onClick={() => handleOpenDeleteSubject(subject)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200" title="Delete Subject"><TrashIcon className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={() => setShareContentModalOpen(true)} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-colors duration-200 shadow-md">
                                <ArrowUpOnSquareIcon className="w-5 h-5" /> Share
                            </button>
                            <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors duration-200 shadow-md">
                                <PlusCircleIcon className="w-5 h-5" /> Add Unit
                            </button>
                            <button onClick={() => setIsAiHubOpen(true)} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:shadow-lg transition-all duration-200 transform hover:scale-105 shadow-md">
                                <SparklesIcon className="w-5 h-5" /> AI Tools
                            </button>
                        </div>
                    </div>
                </div>

                {/* Units Section */}
                <div className="space-y-8">
                    {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
                    {!isLoading && error && <p className="text-center text-red-500 text-lg">{error}</p>}
                    {!isLoading && !error && units.length > 0 && (
                        units.map((unit, index) => (
                            <UnitCard
                                key={unit.id}
                                unit={unit}
                                index={index}
                                onSelectLesson={handleSelectLesson}
                                onSelectUnit={handleSelectUnit}
                                onGenerateQuiz={onGenerateQuiz}
                                onInitiateDelete={onInitiateDelete}
                            />
                        ))
                    )}
                    {!isLoading && !error && units.length === 0 && (
                         <div className="text-center py-16 bg-white rounded-3xl shadow-xl border border-gray-200">
                            <BeakerIcon className="mx-auto h-16 w-16 text-gray-400" />
                            <h3 className="mt-4 text-xl font-semibold text-gray-900">No units created yet.</h3>
                            <p className="mt-2 text-md text-gray-500">Get started by creating your first unit for this subject.</p>
                            <div className="mt-8">
                                <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center mx-auto gap-2 px-8 py-4 text-md font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-200 shadow-lg transform hover:scale-105">
                                    <PlusCircleIcon className="-ml-0.5 h-6 w-6" />
                                    Create New Unit
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubjectDetailView;