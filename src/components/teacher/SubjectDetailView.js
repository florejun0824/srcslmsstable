// src/components/teacher/SubjectDetailView.js

import React, { useState, useEffect } from 'react';
import {
    PencilSquareIcon, TrashIcon, SparklesIcon, PlusCircleIcon,
    EyeIcon, DocumentTextIcon, BeakerIcon
} from '@heroicons/react/24/outline';

import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import Spinner from '../common/Spinner';

const LessonItem = ({ lesson, onSelect, onGenerateQuiz, onInitiateDelete }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors duration-200">
            <div className="flex items-center gap-3">
                <DocumentTextIcon className="w-5 h-5 text-white/80 flex-shrink-0" />
                <span className="font-medium text-white">{lesson.title}</span>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => onSelect(lesson, 'view')} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full" title="View Lesson"><EyeIcon className="w-5 h-5" /></button>
                <button onClick={() => onSelect(lesson, 'edit')} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full" title="Edit Lesson"><PencilSquareIcon className="w-5 h-5" /></button>
                <button onClick={() => onGenerateQuiz(lesson)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full" title="Generate AI Quiz"><SparklesIcon className="w-5 h-5" /></button>
                <button onClick={() => onInitiateDelete({ type: 'lesson', data: lesson })} className="p-1.5 text-red-400/80 hover:text-red-400 hover:bg-white/20 rounded-full" title="Delete Lesson"><TrashIcon className="w-5 h-5" /></button>
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

    const unitGradients = ['from-blue-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-purple-500 to-violet-600', 'from-rose-500 to-pink-600', 'from-orange-500 to-amber-600'];
    const gradient = unitGradients[index % unitGradients.length];

    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg p-6 text-white`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-4">
                <h3 className="text-xl font-bold">{unit.title}</h3>
                <div className="flex items-center gap-1">
                    <button onClick={() => onSelectUnit(unit, 'addLesson')} className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full" title="Add Lesson"><PlusCircleIcon className="w-5 h-5" /></button>
                    <button onClick={() => onSelectUnit(unit, 'edit')} className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full" title="Edit Unit"><PencilSquareIcon className="w-5 h-5" /></button>
                    <button onClick={() => onInitiateDelete({ type: 'unit', data: unit })} className="p-2 text-red-400/80 hover:text-red-400 hover:bg-white/20 rounded-full" title="Delete Unit"><TrashIcon className="w-5 h-5" /></button>
                </div>
            </div>
            <div className="space-y-2 min-h-[5rem]">
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
                    <p className="text-center text-white/70 py-4">No lessons in this unit yet.</p>
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
	
	console.log("SubjectDetailView props:", props); // ADD THIS LINE
	    console.log("SubjectDetailView setSelectedLesson:", setSelectedLesson); // ADD THIS LINE

    const handleSelectLesson = (lesson, action) => {
        setSelectedLesson(lesson);
        if (action === 'view') setViewLessonModalOpen(true);
        if (action === 'edit') setEditLessonModalOpen(true);
    };
    
    const wrapper = "bg-white/70 backdrop-blur-md border border-white/30 p-4 sm:p-6 rounded-xl shadow";

    return (
        <div className={wrapper}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-800">{subject.title}</h1>
                    <button onClick={() => handleOpenEditSubject(subject)} className="text-gray-400 hover:text-blue-600" title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenDeleteSubject(subject)} className="text-gray-400 hover:text-red-600" title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShareContentModalOpen(true)} className="btn-secondary">Share Content</button>
                    <button onClick={() => setAddUnitModalOpen(true)} className="btn-secondary">Add Unit</button>
                    <button onClick={() => setIsAiHubOpen(true)} className="btn-primary gap-2"><SparklesIcon className="w-5 h-5" />AI Tools</button>
                </div>
            </div>

            <div className="space-y-6">
                {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
                {!isLoading && error && <p className="text-center text-red-500">{error}</p>}
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
                     <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-xl">
                        <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No units created</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new unit.</p>
                        <div className="mt-6">
                            <button onClick={() => setAddUnitModalOpen(true)} className="btn-primary">
                                <PlusCircleIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                                New Unit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectDetailView;