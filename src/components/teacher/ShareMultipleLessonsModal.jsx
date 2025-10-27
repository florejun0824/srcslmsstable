import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import Modal from '../common/Modal';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';
// --- MODIFICATION START ---
// 1. Import the ContentSelectionModal
import ContentSelectionModal from './ContentSelectionModal';
// 2. Import the NEW ClassSelectionModal
import ClassSelectionModal from './ClassSelectionModal';
// --- MODIFICATION END ---


// --- MODIFICATION START ---
// 3. Moved button styles to top level to be shared
const primaryButtonStyles = "px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 disabled:opacity-50 active:scale-95";
const secondaryButtonStyles = "px-6 py-3 text-base font-semibold text-gray-900 bg-neumorphic-base rounded-full shadow-neumorphic hover:text-blue-600 transition-all disabled:opacity-50 active:scale-95";

// 4. REMOVED the inline ClassSelectionModal component
// --- MODIFICATION END ---


const CustomSingleSelect = React.memo(({ options, selectedValue, onSelectionChange, isOpen, onToggle, placeholder = "Select...", disabled = false }) => {
    
    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

    const renderOptions = () => {
        return options.map(({ value, label }) => (
            <li key={value} onClick={() => { onSelectionChange(value); onToggle(); }} className="flex items-center justify-between p-3 hover:bg-blue-500/10 cursor-pointer rounded-lg text-base transition-colors duration-150">
                <span className="text-gray-800">{label}</span>
                {selectedValue === value && <CheckIcon className="h-5 w-5 text-blue-600" />}
            </li>
        ));
    };

    return (
        <div className="relative">
            <button type="button" onClick={onToggle} disabled={disabled} className="flex w-full items-center justify-between p-4 bg-neumorphic-base rounded-xl shadow-neumorphic focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 disabled:bg-gray-200/50 disabled:cursor-not-allowed">
                <span className={`block truncate text-base ${selectedValue === null ? 'text-gray-500' : 'text-gray-900'}`}>{selectedLabel}</span>
                <ChevronUpDownIcon className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-20 mb-2 bottom-full max-h-60 w-full overflow-auto rounded-2xl bg-white/80 backdrop-blur-xl py-2 text-base shadow-xl ring-1 ring-black/5 focus:outline-none p-2">
                    <ul className="space-y-1">{renderOptions()}</ul>
                </div>
            )}
        </div>
    );
});


const CustomDateTimePicker = React.memo(({ selectedDate, onDateChange, isClearable = false, placeholder = "Select date" }) => {
    
    const handleDateChange = (e) => {
        const dateValue = e.target.value; // Format: "YYYY-MM-DD"
        
        if (!dateValue) {
            if (isClearable) {
                onDateChange(null);
            }
            return;
        }

        const [year, month, day] = dateValue.split('-').map(Number);
        const newDate = new Date(selectedDate || new Date());
        newDate.setFullYear(year, month - 1, day);
        if (!selectedDate) {
            newDate.setSeconds(0, 0);
        }
        onDateChange(newDate);
    };

    const handleTimeChange = (e) => {
        const timeValue = e.target.value; // Format: "HH:MM"
        
        if (!timeValue) return;

        const [hours, minutes] = timeValue.split(':').map(Number);
        const newDate = new Date(selectedDate || new Date());
        newDate.setHours(hours, minutes);
        newDate.setSeconds(0, 0);
        onDateChange(newDate);
    };
    
    const dateValue = selectedDate 
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : '';

    const timeValue = selectedDate 
        ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}` 
        : '';

    const inputClasses = "w-full p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 placeholder:text-gray-500";
    
    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <input 
                type="date"
                value={dateValue}
                onChange={handleDateChange}
                className={`${inputClasses} w-full sm:w-2/3`}
                placeholder={placeholder}
            />
            <input 
                type="time" 
                value={timeValue} 
                onChange={handleTimeChange} 
                className={`${inputClasses} w-full sm:w-1/3`} 
            />
        </div>
    );
});

const ToggleSwitch = ({ label, enabled, onChange, disabled = false }) => (
    <label className={`flex items-center justify-between ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <span className="font-medium text-gray-800">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={enabled} onChange={onChange} disabled={disabled} />
            <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'translate-x-6' : ''}`}></div>
        </div>
    </label>
);

const getInitialDateWithZeroSeconds = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
};

export default function ShareMultipleLessonsModal({ isOpen, onClose, subject }) {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [rawLessons, setRawLessons] = useState([]);
    const [rawQuizzes, setRawQuizzes] = useState([]);
    const [units, setUnits] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedLessons, setSelectedLessons] = useState([]);
    const [selectedQuizzes, setSelectedQuizzes] = useState([]);
    const [availableFrom, setAvailableFrom] = useState(getInitialDateWithZeroSeconds());
    const [availableUntil, setAvailableUntil] = useState(null);
    const [selectedQuarter, setSelectedQuarter] = useState(null);
    const [sendAsExam, setSendAsExam] = useState(false);
    
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    
    const [quizSettings, setQuizSettings] = useState({
        enabled: false,
        shuffleQuestions: true,
        lockOnLeave: true,
        preventScreenCapture: true,
        detectDevTools: true,
        warnOnPaste: true,
        preventBackNavigation: true,
    });

    const [loading, setLoading] = useState(false);
    const [contentLoading, setContentLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);

    const isExamPossible = selectedQuizzes.length > 0 && selectedLessons.length === 0;
    const isAssignment = selectedLessons.length > 0;

    useEffect(() => {
        if (!isExamPossible) {
            setSendAsExam(false);
        }
    }, [isExamPossible]);

    useEffect(() => {
        const fetchPrerequisites = async () => {
            if (!isOpen || !user?.id || !subject?.id) return;
            setContentLoading(true);
            setError('');
            try {
                const classesRef = collection(db, 'classes');
                const q = query(classesRef, where('teacherId', '==', user.id));
                const classesSnapshot = await getDocs(q);
                setClasses(classesSnapshot.docs.map(doc => ({ value: doc.id, label: `${doc.data().name} (${doc.data().gradeLevel} - ${doc.data().section})` })));

                const [unitsSnapshot, lessonsSnapshot, quizzesSnapshot] = await Promise.all([
                    getDocs(query(collection(db, 'units'), where('subjectId', '==', subject.id))),
                    getDocs(query(collection(db, 'lessons'), where('subjectId', '==', subject.id))),
                    getDocs(query(collection(db, 'quizzes'), where('subjectId', '==', subject.id)))
                ]);

                setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })));
                
                setRawLessons(lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title })));
                setRawQuizzes(quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), value: doc.id, label: doc.data().title })));

            } catch (err) {
                console.error("Error fetching prerequisites: ", err);
                setError("Failed to load required data.");
            } finally {
                setContentLoading(false);
            }
        };
        fetchPrerequisites();
    }, [isOpen, user, subject]);
    
    const allLessons = useMemo(() => {
        const grouped = {};
        units.forEach(unit => {
            const items = rawLessons.filter(lesson => lesson.unitId === unit.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            if (items.length > 0) grouped[unit.title] = items;
        });
        const uncategorized = rawLessons.filter(lesson => !lesson.unitId || !units.some(u => u.id === lesson.unitId));
        if (uncategorized.length > 0) grouped['Uncategorized'] = uncategorized;
        return grouped;
    }, [rawLessons, units]);

    const allQuizzes = useMemo(() => {
        const grouped = {};
        units.forEach(unit => {
            const items = rawQuizzes.filter(quiz => quiz.unitId === unit.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            if (items.length > 0) grouped[unit.title] = items;
        });
        const uncategorized = rawQuizzes.filter(quiz => !quiz.unitId || !units.some(u => u.id === quiz.unitId));
        if (uncategorized.length > 0) grouped['Uncategorized'] = uncategorized;
        return grouped;
    }, [rawQuizzes, units]);

    const quarterOptions = [
        { value: 1, label: 'Quarter 1' },
        { value: 2, label: 'Quarter 2' },
        { value: 3, label: 'Quarter 3' },
        { value: 4, label: 'Quarter 4' },
    ];

    const handleToggleDropdown = useCallback((dropdownName) => {
        setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
    }, []);

    const handleClassSelectionConfirm = (newSelection) => {
        setSelectedClasses(newSelection);
        setIsClassModalOpen(false);
    };
    
    const handleQuizSettingsChange = (field, value) => {
        setQuizSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleClose = useCallback(() => {
        setSelectedClasses([]); setSelectedLessons([]); setSelectedQuizzes([]);
        setAvailableFrom(getInitialDateWithZeroSeconds()); 
        setAvailableUntil(null); setSelectedQuarter(null);
        setError(''); setSuccess(''); setRawLessons([]); setRawQuizzes([]);
        setActiveDropdown(null);
        setSendAsExam(false);
        setIsClassModalOpen(false);
        setIsLessonModalOpen(false);
        setIsQuizModalOpen(false);
        
        setQuizSettings({ 
            enabled: false, 
            shuffleQuestions: true, 
            lockOnLeave: true, 
            preventScreenCapture: true, 
            detectDevTools: true,
            warnOnPaste: true,
            preventBackNavigation: true,
        });

        onClose();
    }, [onClose]);

    const handleShare = async () => {
        if (!selectedQuarter) {
            setError("Please select a quarter before sharing.");
            return;
        }
        if (selectedClasses.length === 0 || (selectedLessons.length === 0 && selectedQuizzes.length === 0)) {
            setError("Please select at least one class and one piece of content.");
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const batch = writeBatch(db);

            const lessonsToPost = rawLessons
                .filter(l => selectedLessons.includes(l.id))
                .map(l => ({ ...l, quarter: selectedQuarter }));

            const quizzesToPost = rawQuizzes
                .filter(q => selectedQuizzes.includes(q.id))
                .map(q => ({ ...q, quarter: selectedQuarter }));

            const contentParts = [];
            if (lessonsToPost.length > 0) contentParts.push(`${lessonsToPost.length} lesson(s)`);
            if (quizzesToPost.length > 0) contentParts.push(`${quizzesToPost.length} quiz(zes)`);

            const maxAttempts = (isExamPossible && sendAsExam) ? 1 : 3;
            
            let settingsToSave;
            if (quizSettings.enabled) {
                settingsToSave = { ...quizSettings, maxAttempts };
            } else {
                settingsToSave = {
                    enabled: false,
                    shuffleQuestions: false,
                    lockOnLeave: false,
                    preventScreenCapture: false,
                    detectDevTools: false,
                    warnOnPaste: false,
                    preventBackNavigation: false,
                    maxAttempts
                };
            }

            for (const classId of selectedClasses) {
                const newPostRef = doc(collection(db, `classes/${classId}/posts`));
                
                batch.set(newPostRef, {
                    title: `New materials for ${subject.title}`,
                    content: `The following are now available: ${contentParts.join(' and ')}.`,
                    author: user.displayName || 'Teacher',
                    createdAt: serverTimestamp(),
                    subjectId: subject.id,
                    availableFrom: Timestamp.fromDate(availableFrom),
                    availableUntil: availableUntil ? Timestamp.fromDate(availableUntil) : null,
                    quarter: selectedQuarter,
                    lessons: lessonsToPost,
                    quizzes: quizzesToPost,
                    quizSettings: settingsToSave,
                });

                const classRef = doc(db, "classes", classId);
                batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            }

            await batch.commit();
            setSuccess(`Successfully shared materials to ${selectedClasses.length} class(es).`);
            setTimeout(handleClose, 2000);
        } catch (err) {
            console.error("Error sharing content: ", err);
            setError("An error occurred while sharing. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const thingsToShareCount = selectedLessons.length + selectedQuizzes.length;
    
    const selectButtonStyle = "flex w-full items-center justify-between p-4 bg-neumorphic-base rounded-xl shadow-neumorphic focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 disabled:bg-gray-200/50 disabled:cursor-not-allowed";

    return (
        <React.Fragment>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title="Share Content"
                description={`Share materials from "${subject.title}" to your classes.`}
                size="5xl"
                contentClassName="bg-neumorphic-base"
            >
                <div className="relative max-h-[75vh] flex flex-col">
                    <main className="flex-grow overflow-y-auto pr-2 -mr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* --- Left Column: Settings --- */}
                            <div className="space-y-6">
                                <section className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Share With</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsClassModalOpen(true)}
                                        disabled={contentLoading}
                                        className={selectButtonStyle}
                                    >
                                        <span className="block truncate text-base">
                                            {selectedClasses.length > 0 ? `${selectedClasses.length} Classes Selected` : `Select Classes`}
                                        </span>
                                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                                    </button>
                                </section>

                                <section className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Set Post Type</h3>
                                    <div className='space-y-3'>
                                        {isAssignment && (
                                            <ToggleSwitch
                                                label="Send as Assignment"
                                                enabled={true}
                                                onChange={() => { }}
                                                disabled={true}
                                            />
                                        )}
                                        {isExamPossible && (
                                            <ToggleSwitch
                                                label="Send as Exam (1 Attempt)"
                                                enabled={sendAsExam}
                                                onChange={() => setSendAsExam(!sendAsExam)}
                                            />
                                        )}
                                        {!isAssignment && !isExamPossible && (
                                            <p className="text-sm text-center text-gray-500 pt-2">Select lessons or quizzes to see options.</p>
                                        )}
                                    </div>
                                </section>

                                <section className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Set Availability</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Available From</label>
                                            <CustomDateTimePicker selectedDate={availableFrom} onDateChange={setAvailableFrom} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Available Until <span className="font-normal text-gray-500">(Optional)</span></label>
                                            <CustomDateTimePicker selectedDate={availableUntil} onDateChange={setAvailableUntil} placeholder="No end date" isClearable={true} />
                                        </div>
                                    </div>
                                </section>
                                <section className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Select Quarter</h3>
                                    <CustomSingleSelect
                                        options={quarterOptions}
                                        selectedValue={selectedQuarter}
                                        onSelectionChange={setSelectedQuarter}
                                        isOpen={activeDropdown === 'quarter'}
                                        onToggle={() => handleToggleDropdown('quarter')}
                                        placeholder="-- Select Quarter --"
                                    />
                                </section>
                            </div>
                            {/* --- Right Column: Content --- */}
                            <div className="space-y-6">
                                <section className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Choose Content</h3>
                                    <div className="space-y-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsLessonModalOpen(true)}
                                            disabled={contentLoading}
                                            className={selectButtonStyle}
                                        >
                                            <span className="block truncate text-base">
                                                {selectedLessons.length > 0 ? `${selectedLessons.length} Lessons Selected` : `Select Lessons`}
                                            </span>
                                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsQuizModalOpen(true)}
                                            disabled={contentLoading}
                                            className={selectButtonStyle}
                                        >
                                            <span className="block truncate text-base">
                                                {selectedQuizzes.length > 0 ? `${selectedQuizzes.length} Quizzes Selected` : `Select Quizzes`}
                                            </span>
                                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                                        </button>
                                    </div>
                                </section>
                                <section className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Quiz Security</h3>
                                    <div className="space-y-4">
                                        <ToggleSwitch
                                            label="Enable Anti-Cheating Features"
                                            enabled={quizSettings.enabled}
                                            onChange={() => handleQuizSettingsChange('enabled', !quizSettings.enabled)}
                                        />
                                        {quizSettings.enabled && (
                                            <div className="pl-4 pt-4 mt-4 border-t border-gray-200/80 space-y-3">
                                                <ToggleSwitch
                                                    label="Shuffle Questions"
                                                    enabled={quizSettings.shuffleQuestions}
                                                    onChange={() => handleQuizSettingsChange('shuffleQuestions', !quizSettings.shuffleQuestions)}
                                                />

                                                <ToggleSwitch
                                                    label="Lock on Leaving Quiz Tab/App"
                                                    enabled={quizSettings.lockOnLeave}
                                                    onChange={() => handleQuizSettingsChange('lockOnLeave', !quizSettings.lockOnLeave)}
                                                />

                                                <ToggleSwitch
                                                    label="Prevent Screen Recording & Screenshots"
                                                    enabled={quizSettings.preventScreenCapture}
                                                    onChange={() => handleQuizSettingsChange('preventScreenCapture', !quizSettings.preventScreenCapture)}
                                                />
                                                <ToggleSwitch
                                                    label="Detect Developer Tools (Desktop Only)"
                                                    enabled={quizSettings.detectDevTools}
                                                    onChange={() => handleQuizSettingsChange('detectDevTools', !quizSettings.detectDevTools)}
                                                />
                                                <ToggleSwitch
                                                    label="Issue Warning on Paste"
                                                    enabled={quizSettings.warnOnPaste}
                                                    onChange={() => handleQuizSettingsChange('warnOnPaste', !quizSettings.warnOnPaste)}
                                                />
                                                <ToggleSwitch
                                                    label="Prevent Going Back to Questions"
                                                    enabled={quizSettings.preventBackNavigation}
                                                    onChange={() => handleQuizSettingsChange('preventBackNavigation', !quizSettings.preventBackNavigation)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </main>

                    {/* --- FOOTER --- */}
                    <footer className="flex-shrink-0 pt-5 mt-5 border-t border-black/10">
                        {error && (<div className="text-center text-red-600 text-sm mb-4 p-3 bg-red-100/70 rounded-xl">{error}</div>)}
                        {success && (<div className="text-center text-green-600 text-sm mb-4 p-3 bg-green-100/7V rounded-xl">{success}</div>)}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button type="button" onClick={handleClose} disabled={loading} className={secondaryButtonStyles}>Cancel</button>
                            <button onClick={handleShare} disabled={loading || contentLoading || thingsToShareCount === 0 || selectedClasses.length === 0} className={primaryButtonStyles}>
                                {loading ? 'Sharing...' : `Share ${thingsToShareCount > 0 ? `${thingsToShareCount} Item(s)` : ''}`}
                            </button>
                        </div>
                    </footer>
                </div>
            </Modal>
            
            {/* --- MODIFICATION --- */}
            {/* This now points to the new, external component */}
            <ClassSelectionModal
                isOpen={isClassModalOpen}
                onClose={() => setIsClassModalOpen(false)}
                onConfirm={handleClassSelectionConfirm}
                allClasses={classes}
                currentSelection={selectedClasses}
            />

            <ContentSelectionModal
                isOpen={isLessonModalOpen}
                onClose={() => setIsLessonModalOpen(false)}
                onConfirm={(selection) => {
                    setSelectedLessons(selection);
                }}
                title="Select Lessons"
                options={allLessons}
                currentSelection={selectedLessons}
            />
            <ContentSelectionModal
                isOpen={isQuizModalOpen}
                onClose={() => setIsQuizModalOpen(false)}
                onConfirm={(selection) => {
                    setSelectedQuizzes(selection);
                }}
                title="Select Quizzes"
                options={allQuizzes}
                currentSelection={selectedQuizzes}
            />
        </React.Fragment>
    );
}

