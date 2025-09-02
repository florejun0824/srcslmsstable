import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import Modal from '../common/Modal'; // Using our custom Modal component
import { ChevronUpDownIcon, ShareIcon, CheckIcon } from '@heroicons/react/24/solid';
import PortalDatePicker from '../common/PortalDatePicker';

// ===================================================================================
// START: Custom Components (Restyled for iOS 18 Vibe)
// ===================================================================================

const GroupCheckbox = ({ checked, indeterminate, ...props }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    // A slightly larger, more modern checkbox
    return <input type="checkbox" ref={ref} checked={checked} {...props} className="h-5 w-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />;
};

function CustomMultiSelect({ title, options, selectedValues, onSelectionChange, onSelectGroup, isOpen, onToggle, disabled = false }) {
    const selectedCount = selectedValues.length;
    const isGrouped = !Array.isArray(options);

    const renderOptions = () => {
        if (!isGrouped) {
            return options.map(({ value, label }) => (
                <li key={value} onClick={() => onSelectionChange(value)} className="flex items-center justify-between p-3 hover:bg-indigo-100 cursor-pointer rounded-lg text-base transition-colors duration-150">
                    <span className="text-slate-700">{label}</span>
                    {selectedValues.includes(value) && <CheckIcon className="h-5 w-5 text-indigo-600" />}
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
                        <div className="flex items-center gap-3 p-2 my-1 bg-slate-100 rounded-lg sticky top-0 z-10">
                            <GroupCheckbox checked={isAllSelected} indeterminate={isPartiallySelected} onChange={() => onSelectGroup(groupName)} />
                            <label onClick={() => onSelectGroup(groupName)} className="font-bold text-slate-800 cursor-pointer select-none flex-grow text-sm">{groupName}</label>
                        </div>
                    )}
                    {groupOptions.map(({ value, label }) => (
                        <li key={value} onClick={() => onSelectionChange(value)} className="flex items-center justify-between p-3 pl-10 hover:bg-indigo-100 cursor-pointer rounded-lg text-base transition-colors duration-150">
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
            {/* Restyled MultiSelect Button */}
            <button type="button" onClick={onToggle} disabled={disabled} className="flex w-full items-center justify-between p-4 bg-gray-500/10 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 placeholder:text-gray-400 disabled:bg-slate-200/50 disabled:cursor-not-allowed">
                <span className="block truncate text-base">{selectedCount > 0 ? `${selectedCount} ${title} Selected` : `Select ${title}`}</span>
                <ChevronUpDownIcon className={`h-5 w-5 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl bg-white/80 backdrop-blur-xl py-2 text-base shadow-xl ring-1 ring-black/5 focus:outline-none p-2">
                    <ul className="space-y-1">{renderOptions()}</ul>
                </div>
            )}
        </div>
    );
}

const CustomDateTimePicker = ({ selectedDate, onDateChange, isClearable = false, placeholder = "Select date" }) => {
    const handleDateSelect = (date) => {
        if (!date && isClearable) {
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
    const inputClasses = "w-full p-4 bg-gray-500/10 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 placeholder:text-gray-400";
    
    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <PortalDatePicker className={`${inputClasses} w-full sm:w-2/3`} selected={selectedDate} onSelect={handleDateSelect} placeholder={placeholder} enableClear={isClearable} />
            <input type="time" value={timeValue} onChange={(e) => handleTimeSelect(e.target.value)} className={`${inputClasses} w-full sm:w-1/3`} />
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
            try {
                const classesRef = collection(db, 'classes');
                const q = query(classesRef, where('teacherId', '==', user.id));
                const querySnapshot = await getDocs(q);
                setClasses(querySnapshot.docs.map(doc => ({ value: doc.id, label: `${doc.data().name} (${doc.data().gradeLevel} - ${doc.data().section})` })));
            } catch (err) {
                console.error("Error fetching classes: ", err);
                setError("Failed to load classes.");
            }
            setContentLoading(true);
            try {
                const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subject.id));
                const unitsSnapshot = await getDocs(unitsQuery);
                const sortedUnits = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
                const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
                const lessonsSnapshot = await getDocs(lessonsQuery);
                const allFetchedLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title }));
                const groupedLessons = {};
                sortedUnits.forEach(unit => {
                    const lessonsForThisUnit = allFetchedLessons.filter(lesson => lesson.unitId === unit.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                    if (lessonsForThisUnit.length > 0) groupedLessons[unit.title] = lessonsForThisUnit;
                });
                const uncategorizedLessons = allFetchedLessons.filter(lesson => !lesson.unitId || !sortedUnits.some(u => u.id === lesson.unitId));
                if(uncategorizedLessons.length > 0) groupedLessons['Uncategorized'] = uncategorizedLessons;
                setAllLessons(groupedLessons);

                const quizzesQuery = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                const allFetchedQuizzes = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title }));
                const groupedQuizzes = {};
                sortedUnits.forEach(unit => {
                    const quizzesForThisUnit = allFetchedQuizzes.filter(quiz => quiz.unitId === unit.id);
                    if (quizzesForThisUnit.length > 0) groupedQuizzes[unit.title] = quizzesForThisUnit;
                });
                const uncategorizedQuizzes = allFetchedQuizzes.filter(quiz => !quiz.unitId || !sortedUnits.some(u => u.id === quiz.unitId));
                if(uncategorizedQuizzes.length > 0) groupedQuizzes['Uncategorized'] = uncategorizedQuizzes;
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
        if (selectedClasses.length === 0 || (selectedLessons.length === 0 && selectedQuizzes.length === 0)) {
            setError("Please select at least one class and one piece of content.");
            return;
        }
        setLoading(true); setError(''); setSuccess('');
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
                    lessonIds: selectedLessons,
                    quizIds: selectedQuizzes,
                };
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
        setAvailableFrom(new Date()); setAvailableUntil(null);
        setError(''); setSuccess(''); setAllLessons({}); setAllQuizzes({});
        setActiveDropdown(null);
        onClose();
    };

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;
    const primaryButtonStyles = "flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none";
    const secondaryButtonStyles = "px-5 py-3 text-base font-medium text-slate-700 bg-slate-200/70 rounded-xl hover:bg-slate-300 transition-all disabled:opacity-50";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Share Content"
            description={`Share from "${subject.title}"`}
            size="6xl"
        >
            <div className="relative max-h-[75vh] flex flex-col">
                <main className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* --- Left Column: Settings --- */}
                        <div className="space-y-6">
                            <div className="bg-white/60 p-6 rounded-2xl ring-1 ring-black/5">
                                <label className="text-lg font-bold text-slate-800 mb-3 block">1. Share With</label>
                                <CustomMultiSelect title="Classes" options={classes} selectedValues={selectedClasses} onSelectionChange={(id) => handleSelection(id, 'class')} disabled={contentLoading} isOpen={activeDropdown === 'classes'} onToggle={() => handleToggleDropdown('classes')} />
                            </div>
                            <div className="bg-white/60 p-6 rounded-2xl ring-1 ring-black/5">
                                <label className="text-lg font-bold text-slate-800 mb-3 block">2. Set Availability</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Available From</label>
                                        <CustomDateTimePicker selectedDate={availableFrom} onDateChange={setAvailableFrom} placeholder="Select start date and time" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Available Until <span className="font-normal text-gray-400">(Optional)</span></label>
                                        <CustomDateTimePicker selectedDate={availableUntil} onDateChange={setAvailableUntil} placeholder="No end date or time" isClearable={true} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* --- Right Column: Content --- */}
                        <div className="bg-white/60 p-6 rounded-2xl ring-1 ring-black/5">
                            <label className="text-lg font-bold text-slate-800 mb-3 block">3. Choose Content</label>
                            <div className="space-y-4">
                                <CustomMultiSelect title="Lessons" options={allLessons} selectedValues={selectedLessons} onSelectionChange={(id) => handleSelection(id, 'lesson')} onSelectGroup={(unitName) => handleSelectUnit(unitName, 'lesson')} disabled={contentLoading} isOpen={activeDropdown === 'lessons'} onToggle={() => handleToggleDropdown('lessons')} />
                                <CustomMultiSelect title="Quizzes" options={allQuizzes} selectedValues={selectedQuizzes} onSelectionChange={(id) => handleSelection(id, 'quiz')} onSelectGroup={(unitName) => handleSelectUnit(unitName, 'quiz')} disabled={contentLoading} isOpen={activeDropdown === 'quizzes'} onToggle={() => handleToggleDropdown('quizzes')} />
                            </div>
                        </div>
                    </div>
                </main>

                {/* --- FOOTER --- */}
                <footer className="flex-shrink-0 pt-6 mt-4 border-t border-gray-200/80">
                    {error && (<div className="text-center text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</div>)}
                    {success && (<div className="text-center text-green-600 text-sm mb-4 p-3 bg-green-50 rounded-lg">{success}</div>)}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" onClick={handleClose} disabled={loading} className={secondaryButtonStyles}>Cancel</button>
                        <button onClick={handleShare} disabled={loading || contentLoading || thingsToShareCount === 0 || selectedClasses.length === 0} className={primaryButtonStyles}>
                            {loading ? 'Sharing...' : `Share ${thingsToShareCount > 0 ? `${thingsToShareCount} Item(s)` : ''}`}
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
}