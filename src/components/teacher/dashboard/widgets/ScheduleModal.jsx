import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, ListBulletIcon, UserIcon, ClockIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';

// Neumorphed Schedule Modal
const ScheduleModal = ({ isOpen, onClose, userRole, scheduleActivities, onAddActivity, onUpdateActivity, onDeleteActivity }) => {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [inCharge, setInCharge] = useState('');
    const [editingActivity, setEditingActivity] = useState(null);
    const [activeTab, setActiveTab] = useState('view');

    const isAdmin = userRole === 'admin';

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setTitle(''); setStartDate(''); setEndDate(''); setTime('');
                setDescription(''); setInCharge(''); setEditingActivity(null);
                setActiveTab('view');
            }, 300);
        }
    }, [isOpen]);

    const clearForm = () => {
        setTitle(''); setStartDate(''); setEndDate(''); setTime('');
        setDescription(''); setInCharge(''); setEditingActivity(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !startDate || !endDate || !inCharge) return;
        
        const activityData = { title, startDate, endDate, time: time || 'N/A', description, inCharge };
        if (editingActivity) {
            onUpdateActivity({ ...editingActivity, ...activityData });
        } else {
            onAddActivity(activityData);
        }
        clearForm();
        setActiveTab('view');
    };

    const handleEditClick = (activity) => {
        setEditingActivity(activity);
        setTitle(activity.title);
        setStartDate(activity.startDate);
        setEndDate(activity.endDate);
        setTime(activity.time === 'N/A' ? '' : activity.time);
        setDescription(activity.description || '');
        setInCharge(activity.inCharge);
        setActiveTab('add');
    };

    const handleCancelEdit = () => {
        clearForm();
        setActiveTab('view');
    };
    
    const sortedActivities = [...scheduleActivities].sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || a.time.localeCompare(b.time));

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
    };

    const tabContentVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
    };
    
    const tabs = [{ id: 'view', label: 'Schedule' }, { id: 'add', label: editingActivity ? 'Edit Activity' : 'Add Activity' }];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 overflow-y-auto font-sans">
                    <motion.div 
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        // --- MODIFIED: Added dark mode classes ---
                        className="relative bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark p-6 md:p-8 w-full max-w-3xl mt-10 mb-8"
                    >
                        {/* --- MODIFIED: Added dark mode classes --- */}
                        <div className="flex justify-between items-center pb-4 mb-6">
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 text-center flex-1">School Schedule</h2>
                            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark">
                                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>

                        {isAdmin && (
                            // --- MODIFIED: Added dark mode classes ---
                            <div className="w-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl p-1 flex gap-1 mb-6 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            if (tab.id === 'add' && editingActivity) {} 
                                            else if (tab.id === 'view' && editingActivity) { handleCancelEdit(); } 
                                            else { clearForm(); }
                                        }}
                                        className="relative flex-1 py-2.5 px-4 text-center font-semibold text-sm rounded-lg transition-colors focus:outline-none"
                                    >
                                        {activeTab === tab.id && (
                                            // --- MODIFIED: Added dark mode classes ---
                                            <motion.div layoutId="active-pill" className="absolute inset-0 bg-gradient-to-br from-sky-200 to-blue-300 dark:from-sky-700 dark:to-blue-800 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark" transition={{ type: 'spring', duration: 0.6 }}/>
                                        )}
                                        {/* --- MODIFIED: Added dark mode classes --- */}
                                        <span className={`relative z-10 transition-colors ${activeTab === tab.id ? 'text-blue-700 dark:text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <AnimatePresence mode="wait">
                            {isAdmin && activeTab === 'add' && (
                                <motion.div key="add-edit-form" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <SmartInput icon={<PencilSquareIcon />} label="Activity Title" value={title} onChange={setTitle} required />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SmartInput type="date" icon={<CalendarDaysIcon />} label="Start Date" value={startDate} onChange={setStartDate} required />
                                            <SmartInput type="date" icon={<CalendarDaysIcon />} label="End Date" value={endDate} onChange={setEndDate} required />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SmartInput type="time" icon={<ClockIcon />} label="Time (Optional)" value={time} onChange={setTime} />
                                            <SmartInput icon={<UserIcon />} label="Person In-charge" value={inCharge} onChange={setInCharge} required />
                                        </div>
                                        <SmartInput as="textarea" icon={<Bars3BottomLeftIcon />} label="Description (Optional)" value={description} onChange={setDescription} />
                                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                                            {/* --- MODIFIED: Added dark mode classes --- */}
                                            <button type="button" onClick={handleCancelEdit} className="w-full sm:w-auto px-6 py-3 bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-700 dark:text-slate-200 font-semibold rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark">Cancel</button>
                                            <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-gradient-to-br from-sky-200 to-blue-300 dark:from-sky-700 dark:to-blue-800 text-blue-700 dark:text-sky-100 font-semibold rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark">{editingActivity ? 'Update Activity' : 'Add Activity'}</button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {activeTab === 'view' && (
                                <motion.div key="view-list" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                                    {sortedActivities.length > 0 ? (
                                        <ul className="space-y-2">
                                            {sortedActivities.map(activity => (
                                                // --- MODIFIED: Added dark mode classes ---
                                                <li key={activity.id} className="group flex items-start gap-4 p-4 rounded-xl transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
                                                    {/* --- MODIFIED: Added dark mode classes --- */}
                                                    <div className="flex-shrink-0 mt-1 w-8 h-8 flex items-center justify-center bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                                                        <CalendarDaysIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                                    </div>
                                                    <div className="flex-1">
                                                        {/* --- MODIFIED: Added dark mode classes --- */}
                                                        <h4 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{activity.title}</h4>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{activity.startDate} to {activity.endDate} {activity.time !== 'N/A' && ` at ${activity.time}`}</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300">In-charge: <span className="font-medium text-slate-800 dark:text-slate-100">{activity.inCharge}</span></p>
                                                        {activity.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{activity.description}</p>}
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {/* --- MODIFIED: Added dark mode classes --- */}
                                                            <button onClick={() => handleEditClick(activity)} className="p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="Edit"><PencilSquareIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
                                                            <button onClick={() => onDeleteActivity(activity.id)} className="p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" title="Delete"><TrashIcon className="w-5 h-5 text-rose-500 dark:text-rose-400" /></button>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        // --- MODIFIED: Added dark mode classes ---
                                        <div className="text-center text-slate-500 dark:text-slate-400 py-16">
                                            <ListBulletIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                                            <p className="text-lg font-semibold">No Scheduled Activities</p>
                                            <p className="text-sm">Admins can add a new activity using the tab above.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Neumorphed Smart Input Component
const SmartInput = ({ icon, label, value, onChange, type = 'text', as = 'input', required = false }) => {
    const commonProps = {
        value: value,
        onChange: (e) => onChange(e.target.value),
        // --- MODIFIED: Added dark mode classes ---
        className: "w-full rounded-xl border-none bg-neumorphic-base dark:bg-neumorphic-base-dark py-3 pl-11 pr-4 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-0 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark transition",
        required: required
    };
    // --- MODIFIED: Added date/time picker specific styles for dark mode ---
    if (type === 'date' || type === 'time') {
        commonProps.className += ' dark:[color-scheme:dark]';
    }
    const InputComponent = as;
    return (
        <div>
            {/* --- MODIFIED: Added dark mode classes --- */}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{label}</label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    {/* --- MODIFIED: Added dark mode classes --- */}
                    {React.cloneElement(icon, { className: 'h-5 w-5 text-slate-400 dark:text-slate-500' })}
                </div>
                <InputComponent type={type} {...commonProps} />
            </div>
        </div>
    );
};

export default ScheduleModal;