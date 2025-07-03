import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

// Custom Multi-Select Dropdown Component
const CustomMultiSelect = ({ title, options, selectedValues, onSelectionChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedCount = selectedValues.length;

    const getButtonLabel = () => {
        if (selectedCount === 0) return `Select ${title}`;
        if (selectedCount === 1) return `1 ${title.slice(0, -1)} selected`;
        return `${selectedCount} ${title} selected`;
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
            >
                <span className="block truncate">{getButtonLabel()}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {options.length > 0 ? options.map((option) => (
                        // --- THIS IS THE FIX ---
                        // The click handler is moved to the parent div and `e.preventDefault()` is added.
                        <div 
                            key={option.value} 
                            onClick={(e) => {
                                e.preventDefault();
                                onSelectionChange(option.value);
                            }}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                        >
                            <input
                                id={`multiselect-${option.value}`}
                                type="checkbox"
                                readOnly
                                checked={selectedValues.includes(option.value)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`multiselect-${option.value}`} className="flex-1 text-sm text-gray-800 cursor-pointer">{option.label}</label>
                        </div>
                    )) : <p className="p-2 text-sm text-gray-500">No options available.</p>}
                </div>
            )}
        </div>
    );
};


export default function ShareMultipleLessonsModal({ isOpen, onClose, subject }) {
    const { user } = useAuth();
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [allLessons, setAllLessons] = useState([]);
    const [selectedLessons, setSelectedLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [selectedQuizzes, setSelectedQuizzes] = useState([]);
    
    const [lessonDeadline, setLessonDeadline] = useState('');
    const [quizDeadline, setQuizDeadline] = useState('');
    const [contentLoading, setContentLoading] = useState(false);

    useEffect(() => {
        const fetchPrerequisites = async () => {
            if (!isOpen) return;
            if (user && user.id) {
                try {
                    const classesRef = collection(db, 'classes');
                    const q = query(classesRef, where('teacherId', '==', user.id));
                    const querySnapshot = await getDocs(q);
                    setClasses(querySnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })));
                } catch (err) {
                    console.error("Error fetching classes: ", err);
                    setError("Failed to load classes.");
                }
            }
            if (subject?.id) {
                setContentLoading(true);
                try {
                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    setAllLessons(lessonsSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().title })));
                    
                    const quizzesQuery = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
                    const quizzesSnapshot = await getDocs(quizzesQuery);
                    setAllQuizzes(quizzesSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().title })));
                } catch (e) {
                    console.error("Error fetching content for sharing:", e);
                    setError("Could not load content for this subject.");
                } finally {
                    setContentLoading(false);
                }
            }
        };
        
        fetchPrerequisites();
    }, [isOpen, user, subject]);

    if (!subject) return null;
    
    const handleSelection = (id, type) => {
        const setters = {
            class: setSelectedClasses,
            lesson: setSelectedLessons,
            quiz: setSelectedQuizzes,
        };
        const setter = setters[type];
        setter(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleShare = async () => {
        if (selectedClasses.length === 0) return setError("Please select at least one class.");
        if (selectedLessons.length === 0 && selectedQuizzes.length === 0) return setError("Please select at least one lesson or quiz.");

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const batch = writeBatch(db);
            const contentParts = [];
            if (selectedLessons.length > 0) contentParts.push(`${selectedLessons.length} lesson(s)`);
            if (selectedQuizzes.length > 0) contentParts.push(`${selectedQuizzes.length} quiz(zes)`);
            
            for (const classId of selectedClasses) {
                const postTitle = `New materials shared for ${subject.title}`;
                const postContent = `The following materials have been shared: ${contentParts.join(' and ')}. Please check your learning materials.`;
                const newPostRef = doc(collection(db, `classes/${classId}/posts`));
                
                let postData = {
                    title: postTitle,
                    content: postContent,
                    author: user.displayName || 'Teacher',
                    createdAt: serverTimestamp(),
                    subjectId: subject.id,
                };

                if (selectedLessons.length > 0) {
                    postData.lessonIds = selectedLessons;
                    postData.lessonDeadline = Timestamp.fromDate(new Date(lessonDeadline || Date.now()));
                }
                if (selectedQuizzes.length > 0) {
                    postData.quizIds = selectedQuizzes;
                    postData.quizDeadline = Timestamp.fromDate(new Date(quizDeadline || Date.now()));
                }
                batch.set(newPostRef, postData);
            }
            await batch.commit();
            setSuccess(`Successfully shared materials to ${selectedClasses.length} class(es).`);
            setTimeout(() => handleClose(), 2000);
        } catch (err) {
            console.error("Error sharing content: ", err);
            setError("An error occurred while sharing. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
      setSelectedClasses([]);
      setSelectedLessons([]);
      setSelectedQuizzes([]);
      setLessonDeadline('');
      setQuizDeadline('');
      setError('');
      setSuccess('');
      setAllLessons([]);
      setAllQuizzes([]);
      onClose();
    }

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <Title className="mb-4">Share Content from "{subject.title}"</Title>
                
                <div className='space-y-4'>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. Select Classes to Share With</label>
                        <CustomMultiSelect title="Classes" options={classes} selectedValues={selectedClasses} onSelectionChange={(id) => handleSelection(id, 'class')} disabled={contentLoading} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. Choose Lessons (Optional)</label>
                        <CustomMultiSelect title="Lessons" options={allLessons} selectedValues={selectedLessons} onSelectionChange={(id) => handleSelection(id, 'lesson')} disabled={contentLoading} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. Choose Quizzes (Optional)</label>
                        <CustomMultiSelect title="Quizzes" options={allQuizzes} selectedValues={selectedQuizzes} onSelectionChange={(id) => handleSelection(id, 'quiz')} disabled={contentLoading} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Deadline</label>
                            <input type="date" value={lessonDeadline} onChange={(e) => setLessonDeadline(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Deadline</label>
                            <input type="date" value={quizDeadline} onChange={(e) => setQuizDeadline(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white" />
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                {success && <p className="text-green-500 text-sm mt-4">{success}</p>}

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleShare} loading={loading || contentLoading} disabled={loading || contentLoading}>
                        {loading ? 'Sharing...' : `Share ${thingsToShareCount} Item(s)`}
                    </Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}