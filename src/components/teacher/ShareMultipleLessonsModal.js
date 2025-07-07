import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Title, Button } from '@tremor/react';
import { ChevronDownIcon, ShareIcon, XMarkIcon, CheckIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';

import PortalDatePicker from '../common/PortalDatePicker'; 
// --- IMPORTANT: Update this import if you moved CustomMultiSelect to its own file ---
import CustomMultiSelect from '../common/CustomMultiSelect'; // Add this import

// --- CustomDateTimePicker component (No changes, assuming it's correctly placed or imported) ---
const CustomDateTimePicker = ({ selectedDate, onDateChange, isClearable = false, placeholder = "Select date" }) => {
    const handleDateSelect = (date) => {
        if (!date) {
            onDateChange(null);
            return;
        }
        const newDate = new Date(selectedDate || new Date()); 
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        onDateChange(newDate);
    };

    const handleTimeSelect = (timeValue) => {
        if (!timeValue) return;
        const [hours, minutes] = timeValue.split(':');
        const newDate = new Date(selectedDate || new Date());
        newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        newDate.setMinutes(parseInt(minutes, 10)); 
        onDateChange(newDate);
    };
    
    const timeValue = selectedDate 
        ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}` 
        : '';

    return (
        <div className="flex gap-2">
            <PortalDatePicker
                className="w-2/3" 
                selected={selectedDate} 
                onSelect={handleDateSelect} 
                placeholder={placeholder}
                enableClear={isClearable} 
            />
            <input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeSelect(e.target.value)}
                className="w-1/3 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white"
            />
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
    const [allLessons, setAllLessons] = useState({});
    const [selectedLessons, setSelectedLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [selectedQuizzes, setSelectedQuizzes] = useState([]);
    const [availableFrom, setAvailableFrom] = useState(new Date()); 
    const [availableUntil, setAvailableUntil] = useState(null);
    const [contentLoading, setContentLoading] = useState(false);

    // --- NEW STATE: To manage which dropdown is currently open ---
    const [activeDropdown, setActiveDropdown] = useState(null); // Can be 'classes', 'lessons', 'quizzes', or null

    // --- NEW FUNCTION: To toggle dropdowns exclusively ---
    const handleToggleDropdown = (dropdownName) => {
        setActiveDropdown(prevActiveDropdown => 
            prevActiveDropdown === dropdownName ? null : dropdownName
        );
    };

    useEffect(() => {
        const fetchPrerequisites = async () => {
            if (!isOpen || !user?.id || !subject?.id) return;
            try {
                const classesRef = collection(db, 'classes');
                const q = query(classesRef, where('teacherId', '==', user.id));
                const querySnapshot = await getDocs(q);
                setClasses(querySnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })));
            } catch (err) { console.error("Error fetching classes: ", err); setError("Failed to load classes."); }
            setContentLoading(true);
            try {
                const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subject.id));
                const unitsSnapshot = await getDocs(unitsQuery);
                const subjectUnits = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
                const lessonsSnapshot = await getDocs(lessonsQuery);
                const groupedLessons = lessonsSnapshot.docs.reduce((acc, doc) => {
                    const lessonData = doc.data();
                    const lesson = { value: doc.id, label: lessonData.title };
                    const unitInfo = subjectUnits.find(u => u.id === lessonData.unitId);
                    const unitName = unitInfo ? unitInfo.title : 'Uncategorized';
                    if (!acc[unitName]) acc[unitName] = [];
                    acc[unitName].push(lesson);
                    return acc;
                }, {});
                setAllLessons(groupedLessons);
                const quizzesQuery = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                setAllQuizzes(quizzesSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().title })));
            } catch (e) { console.error("Error fetching content for sharing:", e); setError("Could not load content for this subject.");
            } finally { setContentLoading(false); }
        };
        fetchPrerequisites();
    }, [isOpen, user, subject]);

    const handleSelection = (id, type) => {
        const setters = { class: setSelectedClasses, lesson: setSelectedLessons, quiz: setSelectedQuizzes };
        setters[type](prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleShare = async () => {
        if (selectedClasses.length === 0) return setError("Please select at least one class.");
        if (selectedLessons.length === 0 && selectedQuizzes.length === 0) return setError("Please select at least one lesson or quiz.");
        setLoading(true); setError(''); setSuccess('');
        try {
            const batch = writeBatch(db);
            const contentParts = [];
            if (selectedLessons.length > 0) contentParts.push(`${selectedLessons.length} lesson(s)`);
            if (selectedQuizzes.length > 0) contentParts.push(`${selectedQuizzes.length} quiz(zes)`);

            for (const classId of selectedClasses) {
                const postTitle = `New materials shared for ${subject.title}`;
                const postContent = `The following materials are now available: ${contentParts.join(' and ')}.`;
                const newPostRef = doc(collection(db, `classes/${classId}/posts`));

                let postData = {
                    title: postTitle, content: postContent, author: user.displayName || 'Teacher',
                    createdAt: serverTimestamp(), subjectId: subject.id,
                    availableFrom: Timestamp.fromDate(availableFrom),
                    availableUntil: availableUntil ? Timestamp.fromDate(availableUntil) : null,
                };
                if (selectedLessons.length > 0) postData.lessonIds = selectedLessons;
                if (selectedQuizzes.length > 0) postData.quizIds = selectedQuizzes;
                batch.set(newPostRef, postData);
            }
            await batch.commit();
            setSuccess(`Successfully shared materials to ${selectedClasses.length} class(es).`);
            setTimeout(() => handleClose(), 2000);
        } catch (err) { console.error("Error sharing content: ", err); setError("An error occurred while sharing. Please try again.");
        } finally { setLoading(false); }
    };

    const handleClose = () => {
        setSelectedClasses([]); setSelectedLessons([]); setSelectedQuizzes([]);
        setAvailableFrom(new Date()); 
        setAvailableUntil(null);
        setError(''); setSuccess(''); setAllLessons({}); setAllQuizzes([]);
        setActiveDropdown(null); // Ensure all dropdowns are closed on modal close
        onClose();
    };

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel 
                className="
                    w-full 
                    transform 
                    overflow-hidden 
                    rounded-2xl 
                    bg-slate-100 
                    p-6 
                    text-left 
                    align-middle 
                    shadow-xl 
                    transition-all
                    
                    max-w-2xl 
                    
                    md:max-w-[75vw] 
                    md:h-[75vh]    
                    md:mx-auto     
                    md:p-8         
                "
            >
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                            <ShareIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Share Content</h2>
                            <p className="text-sm text-slate-500">Share from "{subject.title}"</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-6">
                        <div className="p-4 bg-white rounded-xl shadow">
                            <label className="text-base font-semibold text-slate-800 mb-2 block">1. Share With</label>
                            <CustomMultiSelect 
                                title="Classes" 
                                options={classes} 
                                selectedValues={selectedClasses} 
                                onSelectionChange={(id) => handleSelection(id, 'class')} 
                                disabled={contentLoading} 
                                isOpen={activeDropdown === 'classes'} // Pass isOpen prop
                                onToggle={() => handleToggleDropdown('classes')} // Pass onToggle prop
                            />
                        </div>

                        <div className="p-4 bg-white rounded-xl shadow">
                            <label className="text-base font-semibold text-slate-800 mb-2 block">2. Set Availability</label>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Available From</label>
                                    <CustomDateTimePicker
                                        selectedDate={availableFrom}
                                        onDateChange={setAvailableFrom}
                                        placeholder="Select start date and time"
                                        isClearable={false}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Available Until (Optional)</label>
                                    <CustomDateTimePicker
                                        selectedDate={availableUntil}
                                        onDateChange={setAvailableUntil}
                                        placeholder="No end date or time"
                                        isClearable={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl shadow">
                        <label className="text-base font-semibold text-slate-800 mb-2 block">3. Choose Content</label>
                        <div className="space-y-3">
                           <CustomMultiSelect 
                                title="Lessons" 
                                options={allLessons} 
                                selectedValues={selectedLessons} 
                                onSelectionChange={(id) => handleSelection(id, 'lesson')} 
                                disabled={contentLoading} 
                                isOpen={activeDropdown === 'lessons'} // Pass isOpen prop
                                onToggle={() => handleToggleDropdown('lessons')} // Pass onToggle prop
                            />
                           <CustomMultiSelect 
                                title="Quizzes" 
                                options={allQuizzes} 
                                selectedValues={selectedQuizzes} 
                                onSelectionChange={(id) => handleSelection(id, 'quiz')} 
                                disabled={contentLoading} 
                                isOpen={activeDropdown === 'quizzes'} // Pass isOpen prop
                                onToggle={() => handleToggleDropdown('quizzes')} // Pass onToggle prop
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                {success && <p className="text-green-600 text-sm mt-4 text-center">{success}</p>}

                <div className="flex justify-end gap-3 mt-8">
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
                    <button onClick={handleShare} disabled={loading || contentLoading || thingsToShareCount === 0} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-md hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed">
                        <ShareIcon className="h-5 w-5"/>
                        {loading ? 'Sharing...' : `Share ${thingsToShareCount} Item(s)`}
                    </button>
                </div>

            </DialogPanel>
        </Dialog>
    );
}