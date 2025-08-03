import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { Dialog, DialogPanel, Button } from '@tremor/react';
import { ChevronDownIcon, ShareIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import PortalDatePicker from '../common/PortalDatePicker';

// ===================================================================================
// START: Custom Components (Revised for UI Overhaul)
// ===================================================================================

const GroupCheckbox = ({ checked, indeterminate, ...props }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    return <input type="checkbox" ref={ref} checked={checked} {...props} />;
};

function CustomMultiSelect({ title, options, selectedValues, onSelectionChange, onSelectGroup, isOpen, onToggle, disabled = false }) {
    const selectedCount = selectedValues.length;
    const isGrouped = !Array.isArray(options);

    const renderOptions = () => {
        if (!isGrouped) {
            return options.map(({ value, label }) => (
                <li key={value} onClick={() => onSelectionChange(value)} className="flex items-center justify-between p-2 hover:bg-indigo-50/50 cursor-pointer rounded-lg text-base transition-colors duration-150 transform hover:translate-x-0.5">
                    <span className="text-slate-700">{label}</span>
                    {selectedValues.includes(value) && <CheckIcon className="h-5 w-5 text-indigo-700" />}
                </li>
            ));
        }
        return Object.entries(options).map(([groupName, groupOptions]) => {
            const groupIds = groupOptions.map(opt => opt.value);
            const selectedInGroup = groupIds.filter(id => selectedValues.includes(id));
            const isAllSelected = selectedInGroup.length === groupIds.length && groupIds.length > 0;
            const isPartiallySelected = selectedInGroup.length > 0 && !isAllSelected;

            return (
                <div key={groupName}>
                    {onSelectGroup && (
                        <div className="flex items-center gap-2 p-2 my-1 bg-slate-100 rounded-md sticky top-0 z-10">
                            <GroupCheckbox checked={isAllSelected} indeterminate={isPartiallySelected} onChange={() => onSelectGroup(groupName)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                            <label onClick={() => onSelectGroup(groupName)} className="font-bold text-slate-800 cursor-pointer select-none flex-grow text-sm md:text-base">{groupName}</label>
                        </div>
                    )}
                    {groupOptions.map(({ value, label }) => (
                        <li key={value} onClick={() => onSelectionChange(value)} className="flex items-center justify-between p-2 pl-8 hover:bg-indigo-50/50 cursor-pointer rounded-lg text-base transition-colors duration-150 transform hover:translate-x-0.5">
                            <span className="text-slate-700">{label}</span>
                            {selectedValues.includes(value) && <CheckIcon className="h-5 w-5 text-indigo-700" />}
                        </li>
                    ))}
                </div>
            );
        });
    };

    return (
        <div className="relative">
            <button type="button" onClick={onToggle} disabled={disabled} className="flex w-full items-center justify-between rounded-xl bg-white p-3 text-left text-slate-700 shadow-md border border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-50 disabled:cursor-not-allowed">
                <span className="block truncate text-base md:text-lg">{selectedCount > 0 ? `${selectedCount} ${title} Selected` : `Select ${title}`}</span>
                <ChevronDownIcon className={`h-6 w-6 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none p-2">
                    <ul className="space-y-1">{renderOptions()}</ul>
                </div>
            )}
        </div>
    );
}

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
        newDate.setHours(parseInt(hours, 10));
        newDate.setMinutes(parseInt(minutes, 10));
        onDateChange(newDate);
    };
    const timeValue = selectedDate ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}` : '';
    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <PortalDatePicker className="w-full sm:w-2/3 rounded-xl border-slate-300 shadow-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 text-base p-3 bg-white" selected={selectedDate} onSelect={handleDateSelect} placeholder={placeholder} enableClear={isClearable} />
            <input type="time" value={timeValue} onChange={(e) => handleTimeSelect(e.target.value)} className="w-full sm:w-1/3 rounded-xl border-slate-300 shadow-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 text-base p-3 bg-white" />
        </div>
    );
};
// ===================================================================================
// END: Custom Components
// ===================================================================================

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
        setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
    };

    useEffect(() => {
        const fetchPrerequisites = async () => {
            if (!isOpen || !user?.id || !subject?.id) return;
            
            // Fetch Classes
            try {
                const classesRef = collection(db, 'classes');
                const q = query(classesRef, where('teacherId', '==', user.id));
                const querySnapshot = await getDocs(q);
                setClasses(querySnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })));
            } catch (err) {
                console.error("Error fetching classes: ", err);
                setError("Failed to load classes.");
            }
            
            // Fetch Content (Lessons and Quizzes)
            setContentLoading(true);
            try {
                // Fetch and sort units
                const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subject.id));
                const unitsSnapshot = await getDocs(unitsQuery);
                const sortedUnits = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
                    const extractNumber = (title) => {
                        const match = title.match(/\d+/);
                        return match ? parseInt(match[0], 10) : Infinity;
                    };
                    return extractNumber(a.title) - extractNumber(b.title);
                });

                // Fetch lessons and group them by unit
                const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
                const lessonsSnapshot = await getDocs(lessonsQuery);
                const allFetchedLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title }));
                
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

                // Fetch quizzes and group them by unit
                const quizzesQuery = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                const allFetchedQuizzes = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title }));
                
                const groupedQuizzes = {};
                sortedUnits.forEach(unit => {
                    const lessonIdsInUnit = allFetchedLessons.filter(lesson => lesson.unitId === unit.id).map(lesson => lesson.id);
                    const quizzesForThisUnit = allFetchedQuizzes.filter(quiz => (quiz.unitId === unit.id) || (quiz.lessonId && lessonIdsInUnit.includes(quiz.lessonId)));
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

    const handleSelectUnit = (unitName, type) => {
        const sourceData = type === 'lesson' ? allLessons : allQuizzes;
        const setSelected = type === 'lesson' ? setSelectedLessons : setSelectedQuizzes;
        const currentSelected = type === 'lesson' ? selectedLessons : selectedQuizzes;

        const idsInUnit = sourceData[unitName]?.map(item => item.value) || [];
        if (idsInUnit.length === 0) return;

        const allSelectedInUnit = idsInUnit.every(id => currentSelected.includes(id));
        
        setSelected(prevSelected => {
            const selectedSet = new Set(prevSelected);
            if (allSelectedInUnit) {
                idsInUnit.forEach(id => selectedSet.delete(id));
            } else {
                idsInUnit.forEach(id => selectedSet.add(id));
            }
            return Array.from(selectedSet);
        });
    };

    const handleShare = async () => {
        if (selectedClasses.length === 0) {
            setError("Please select at least one class.");
            return;
        }
        if (selectedLessons.length === 0 && selectedQuizzes.length === 0) {
            setError("Please select at least one lesson or quiz.");
            return;
        }
        
        setLoading(true); 
        setError(''); 
        setSuccess('');

        // Log the state of the selected items right before we start the batch write
        console.log("State before batch write:");
        console.log("Selected Classes:", selectedClasses);
        console.log("Selected Lessons:", selectedLessons);
        console.log("Selected Quizzes:", selectedQuizzes);

        try {
            const batch = writeBatch(db);
            const contentParts = [];
            if (selectedLessons.length > 0) contentParts.push(`${selectedLessons.length} lesson(s)`);
            if (selectedQuizzes.length > 0) contentParts.push(`${selectedQuizzes.length} quiz(zes)`);

            for (const classId of selectedClasses) {
                const newPostRef = doc(collection(db, `classes/${classId}/posts`));
                
                const postData = {
                    title: `New materials shared for ${subject.title}`,
                    content: `The following materials are now available: ${contentParts.join(' and ')}.`,
                    author: user.displayName || 'Teacher',
                    createdAt: serverTimestamp(),
                    subjectId: subject.id,
                    availableFrom: Timestamp.fromDate(availableFrom),
                    availableUntil: availableUntil ? Timestamp.fromDate(availableUntil) : null,
                };
                
                // Explicitly adding lesson and quiz IDs as arrays, using a spread to ensure a new array is used.
                if (selectedLessons.length > 0) {
                    postData.lessonIds = [...selectedLessons];
                }
                
                if (selectedQuizzes.length > 0) {
                    postData.quizIds = [...selectedQuizzes];
                }
                
                console.log(`Sharing to class ${classId} with data:`, postData);
                
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
        setAvailableFrom(new Date());
        setAvailableUntil(null);
        setError(''); 
        setSuccess(''); 
        setAllLessons({}); 
        setAllQuizzes({});
        setActiveDropdown(null);
        onClose();
    };

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-[100]">
             <div className="fixed inset-0 bg-black/50 backdrop-blur-md" aria-hidden="true" />
             <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className="w-full flex flex-col transform rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 text-left align-middle shadow-2xl transition-all max-w-4xl h-full md:h-[90vh] md:max-h-[900px] border border-gray-200">
                    
                    {/* --- HEADER (Fixed) --- */}
                    <div className="flex-shrink-0 p-4 md:p-6 pb-4 border-b border-slate-200">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                                    <ShareIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-wide">Share Content</h2>
                                    <p className="text-sm md:text-base text-slate-600">Share from "<span className="font-semibold">{subject.title}</span>"</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all duration-300 transform hover:rotate-90">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* --- SCROLLABLE CONTENT AREA --- */}
                    <div className="flex-grow overflow-y-auto p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-6">
                            {/* --- Left Column --- */}
                            <div className="space-y-4 md:space-y-6">
                                <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
                                    <label className="text-lg font-bold text-slate-800 mb-3 block">1. Share With</label>
                                    <CustomMultiSelect title="Classes" options={classes} selectedValues={selectedClasses} onSelectionChange={(id) => handleSelection(id, 'class')} disabled={contentLoading} isOpen={activeDropdown === 'classes'} onToggle={() => handleToggleDropdown('classes')} />
                                </div>
                                <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
                                    <label className="text-lg font-bold text-slate-800 mb-3 block">2. Set Availability</label>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Available From</label>
                                            <CustomDateTimePicker selectedDate={availableFrom} onDateChange={setAvailableFrom} placeholder="Select start date and time" isClearable={false} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Available Until (Optional)</label>
                                            <CustomDateTimePicker selectedDate={availableUntil} onDateChange={setAvailableUntil} placeholder="No end date or time" isClearable={true} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* --- Right Column --- */}
                            <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
                                <label className="text-lg font-bold text-slate-800 mb-3 block">3. Choose Content</label>
                                <div className="space-y-3">
                                    <CustomMultiSelect title="Lessons" options={allLessons} selectedValues={selectedLessons} onSelectionChange={(id) => handleSelection(id, 'lesson')} onSelectGroup={(unitName) => handleSelectUnit(unitName, 'lesson')} disabled={contentLoading} isOpen={activeDropdown === 'lessons'} onToggle={() => handleToggleDropdown('lessons')} />
                                    <CustomMultiSelect title="Quizzes" options={allQuizzes} selectedValues={selectedQuizzes} onSelectionChange={(id) => handleSelection(id, 'quiz')} onSelectGroup={(unitName) => handleSelectUnit(unitName, 'quiz')} disabled={contentLoading} isOpen={activeDropdown === 'quizzes'} onToggle={() => handleToggleDropdown('quizzes')} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- FOOTER (Fixed) --- */}
                    <div className="flex-shrink-0 p-4 md:p-6 pt-4 border-t border-slate-200">
                        {error && (
                            <div className="bg-red-50/50 border border-red-200 text-red-700 text-base mb-4 p-3 rounded-lg text-center animate-pulse-once">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50/50 border border-green-200 text-green-700 text-base mb-4 p-3 rounded-lg text-center animate-fade-in">
                                {success}
                            </div>
                        )}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
                            <button onClick={handleShare} disabled={loading || contentLoading || thingsToShareCount === 0 || selectedClasses.length === 0} className="inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-700 to-purple-700 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.03] transform transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sharing...
                                    </>
                                ) : (
                                    <>
                                        <ShareIcon className="h-5 w-5"/>
                                        Share {thingsToShareCount} Item(s)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
