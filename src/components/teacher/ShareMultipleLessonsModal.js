import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Button } from '@tremor/react';
import { ChevronDownIcon, ShareIcon, XMarkIcon, CheckIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';
import PortalDatePicker from '../common/PortalDatePicker';

// ===================================================================================
// START: CustomMultiSelect Component Integrated directly into this file
// ===================================================================================

// Helper component for the checkbox's indeterminate state
const GroupCheckbox = ({ checked, indeterminate, ...props }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    return <input type="checkbox" ref={ref} checked={checked} {...props} />;
};

// The full CustomMultiSelect component logic
function CustomMultiSelect({
    title,
    options,
    selectedValues,
    onSelectionChange,
    onSelectGroup, // Prop for handling group selection
    isOpen,
    onToggle,
    disabled = false
}) {
    const selectedCount = selectedValues.length;
    // Check if options are grouped (an object) or a simple array
    const isGrouped = !Array.isArray(options);

    const renderOptions = () => {
        // Renders non-grouped options (like for 'Classes')
        if (!isGrouped) {
            return options.map(({ value, label }) => (
                <li key={value} onClick={() => onSelectionChange(value)} className="flex items-center justify-between p-2 hover:bg-slate-100 cursor-pointer rounded-md">
                    <span className="text-slate-700">{label}</span>
                    {selectedValues.includes(value) && <CheckIcon className="h-5 w-5 text-indigo-600" />}
                </li>
            ));
        }

        // Renders grouped options with "Select All" functionality (for 'Lessons' and 'Quizzes')
        return Object.entries(options).map(([groupName, groupOptions]) => {
            const groupIds = groupOptions.map(opt => opt.value);
            const selectedInGroup = groupIds.filter(id => selectedValues.includes(id));
            
            const isAllSelected = selectedInGroup.length === groupIds.length && groupIds.length > 0;
            const isPartiallySelected = selectedInGroup.length > 0 && !isAllSelected;

            return (
                <div key={groupName}>
                    {/* The "Select All" header for each unit */}
                    {onSelectGroup && (
                         <div className="flex items-center gap-2 p-2 my-1 bg-slate-100 rounded-md sticky top-0">
                            <GroupCheckbox 
                                checked={isAllSelected}
                                indeterminate={isPartiallySelected}
                                onChange={() => onSelectGroup(groupName)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label onClick={() => onSelectGroup(groupName)} className="font-bold text-slate-800 cursor-pointer select-none flex-grow">
                                {groupName}
                            </label>
                         </div>
                    )}
                   
                    {/* Individual items */}
                    {groupOptions.map(({ value, label }) => (
                        <li key={value} onClick={() => onSelectionChange(value)} className="flex items-center justify-between p-2 pl-8 hover:bg-slate-100 cursor-pointer rounded-md">
                            <span className="text-slate-700">{label}</span>
                            {selectedValues.includes(value) && <CheckIcon className="h-5 w-5 text-indigo-600" />}
                        </li>
                    ))}
                </div>
            );
        });
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={onToggle}
                disabled={disabled}
                className="flex w-full items-center justify-between rounded-lg bg-white p-2.5 text-left text-slate-700 shadow-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
            >
                <span className="block truncate">
                    {selectedCount > 0 ? `${selectedCount} ${title} Selected` : `Select ${title}`}
                </span>
                <ChevronDownIcon className={`h-5 w-5 text-slate-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm p-2">
                    <ul className="space-y-1">
                        {renderOptions()}
                    </ul>
                </div>
            )}
        </div>
    );
}
// ===================================================================================
// END: CustomMultiSelect Component
// ===================================================================================


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
    const [allQuizzes, setAllQuizzes] = useState({});
    const [selectedQuizzes, setSelectedQuizzes] = useState([]);
    const [availableFrom, setAvailableFrom] = useState(new Date());
    const [availableUntil, setAvailableUntil] = useState(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

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
            } catch (err) {
                console.error("Error fetching classes: ", err);
                setError("Failed to load classes.");
            }
    
            setContentLoading(true);
            try {
                // Fetch and sort units (this logic is reused for both lessons and quizzes)
                const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subject.id));
                const unitsSnapshot = await getDocs(unitsQuery);
                const sortedUnits = unitsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => {
                        const extractNumber = (title) => {
                            const match = title.match(/\d+/);
                            return match ? parseInt(match[0], 10) : Infinity;
                        };
                        return extractNumber(a.title) - extractNumber(b.title);
                    });
    
                // --- Group Lessons (Existing Logic) ---
                const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
                const lessonsSnapshot = await getDocs(lessonsQuery);
                const allFetchedLessons = lessonsSnapshot.docs.map(doc => ({
                    id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title
                }));
    
                const groupedLessons = {};
                sortedUnits.forEach(unit => {
                    const lessonsForThisUnit = allFetchedLessons.filter(lesson => lesson.unitId === unit.id).sort((a, b) => a.order - b.order);
                    if (lessonsForThisUnit.length > 0) {
                        groupedLessons[unit.title] = lessonsForThisUnit;
                    }
                });
                const uncategorizedLessons = allFetchedLessons.filter(lesson => !lesson.unitId || !sortedUnits.some(u => u.id === lesson.unitId));
                if(uncategorizedLessons.length > 0) {
                    groupedLessons['Uncategorized'] = uncategorizedLessons;
                }
                setAllLessons(groupedLessons);
                
                // --- Logic to Group Quizzes ---
                const quizzesQuery = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                const allFetchedQuizzes = quizzesSnapshot.docs.map(doc => ({
                    id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title
                }));

                const groupedQuizzes = {};
                sortedUnits.forEach(unit => {
                    // Find quizzes linked to lessons within this unit
                    const lessonIdsInUnit = allFetchedLessons
                        .filter(lesson => lesson.unitId === unit.id)
                        .map(lesson => lesson.id);
                    
                    const quizzesForThisUnit = allFetchedQuizzes.filter(quiz => 
                        (quiz.unitId === unit.id) || (quiz.lessonId && lessonIdsInUnit.includes(quiz.lessonId))
                    );

                    if (quizzesForThisUnit.length > 0) {
                        groupedQuizzes[unit.title] = quizzesForThisUnit;
                    }
                });

                const categorizedQuizIds = Object.values(groupedQuizzes).flat().map(q => q.id);
                const uncategorizedQuizzes = allFetchedQuizzes.filter(quiz => !categorizedQuizIds.includes(quiz.id));

                if(uncategorizedQuizzes.length > 0) {
                    groupedQuizzes['Uncategorized'] = uncategorizedQuizzes;
                }
                
                setAllQuizzes(groupedQuizzes);
    
            } catch (e) {
                console.error("Error fetching content for sharing:", e);
                setError("Could not load content for this subject.");
            } finally {
                setContentLoading(false);
            }
        };
    
        fetchPrerequisites();
    }, [isOpen, user, subject]);


    const handleSelection = (id, type) => {
        const setters = { class: setSelectedClasses, lesson: setSelectedLessons, quiz: setSelectedQuizzes };
        setters[type](prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleSelectUnit = (unitName) => {
        const lessonIdsInUnit = allLessons[unitName]?.map(lesson => lesson.value) || [];
        if (lessonIdsInUnit.length === 0) return;

        const allSelected = lessonIdsInUnit.every(id => selectedLessons.includes(id));
        
        setSelectedLessons(currentSelected => {
            const selectedSet = new Set(currentSelected);
            if (allSelected) {
                lessonIdsInUnit.forEach(id => selectedSet.delete(id));
            } else {
                lessonIdsInUnit.forEach(id => selectedSet.add(id));
            }
            return Array.from(selectedSet);
        });
    };
    
    const handleSelectUnitForQuizzes = (unitName) => {
        const quizIdsInUnit = allQuizzes[unitName]?.map(quiz => quiz.value) || [];
        if (quizIdsInUnit.length === 0) return;

        const allSelected = quizIdsInUnit.every(id => selectedQuizzes.includes(id));
        
        setSelectedQuizzes(currentSelected => {
            const selectedSet = new Set(currentSelected);
            if (allSelected) {
                quizIdsInUnit.forEach(id => selectedSet.delete(id));
            } else {
                quizIdsInUnit.forEach(id => selectedSet.add(id));
            }
            return Array.from(selectedSet);
        });
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
        } catch (err) {
            console.error("Error sharing content: ", err);
            setError("An error occurred while sharing. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedClasses([]); setSelectedLessons([]); setSelectedQuizzes([]);
        setAvailableFrom(new Date());
        setAvailableUntil(null);
        setError(''); setSuccess(''); 
        setAllLessons({}); 
        setAllQuizzes({});
        setActiveDropdown(null);
        onClose();
    };

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
            <DialogPanel className="w-full transform overflow-hidden rounded-2xl bg-slate-100 p-6 text-left align-middle shadow-xl transition-all max-w-2xl md:max-w-[75vw] md:h-[75vh] md:mx-auto md:p-8">
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
                                isOpen={activeDropdown === 'classes'}
                                onToggle={() => handleToggleDropdown('classes')}
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
                                onSelectGroup={handleSelectUnit}
                                disabled={contentLoading}
                                isOpen={activeDropdown === 'lessons'}
                                onToggle={() => handleToggleDropdown('lessons')}
                            />
                            <CustomMultiSelect
                                title="Quizzes"
                                options={allQuizzes}
                                selectedValues={selectedQuizzes}
                                onSelectionChange={(id) => handleSelection(id, 'quiz')}
                                onSelectGroup={handleSelectUnitForQuizzes} 
                                disabled={contentLoading}
                                isOpen={activeDropdown === 'quizzes'}
                                onToggle={() => handleToggleDropdown('quizzes')}
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