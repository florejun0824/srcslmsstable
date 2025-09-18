import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, ListBulletIcon, DocumentPlusIcon, UserIcon, ClockIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';

// iOS Next Gen (iOS 26) UI Philosophy Refactor
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
            // Reset state with a slight delay to allow exit animation
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex justify-center items-start z-50 p-4 overflow-y-auto font-sans">
                    <motion.div 
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-3xl mt-10 mb-8"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center pb-4 mb-6">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center flex-1">School Schedule</h2>
                            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition">
                                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* ✨ Animated Segmented Control */}
                        {isAdmin && (
                            <div className="w-full bg-black/5 dark:bg-white/5 rounded-xl p-1 flex gap-1 mb-6">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            if (tab.id === 'add' && editingActivity) {
                                                // Don't cancel edit when clicking the 'Edit' tab
                                            } else if (tab.id === 'view' && editingActivity) {
                                                handleCancelEdit();
                                            } else {
                                                clearForm();
                                            }
                                        }}
                                        className="relative flex-1 py-2.5 px-4 text-center font-semibold text-sm rounded-lg transition-colors text-gray-800 dark:text-gray-200 focus:outline-none"
                                    >
                                        {activeTab === tab.id && (
                                            <motion.div layoutId="active-pill" className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-lg shadow-md" transition={{ type: 'spring', duration: 0.6 }}/>
                                        )}
                                        <span className="relative z-10">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <AnimatePresence mode="wait">
                            {/* ADD/EDIT FORM VIEW */}
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
                                            <button type="button" onClick={handleCancelEdit} className="w-full sm:w-auto px-6 py-3 bg-transparent text-gray-800 dark:text-zinc-200 font-semibold rounded-xl hover:bg-gray-500/10 active:scale-[0.98] transition">Cancel</button>
                                            <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 active:scale-[0.98] transition shadow-lg shadow-blue-500/20">{editingActivity ? 'Update Activity' : 'Add Activity'}</button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {/* SCHEDULE LIST VIEW */}
                            {activeTab === 'view' && (
                                <motion.div key="view-list" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                                    {sortedActivities.length > 0 ? (
                                        <ul className="space-y-1">
                                            {sortedActivities.map(activity => (
                                                <li key={activity.id} className="group flex items-start gap-4 p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <div className="flex-shrink-0 mt-1 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                                        <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{activity.title}</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.startDate} to {activity.endDate} {activity.time !== 'N/A' && ` at ${activity.time}`}</p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">In-charge: <span className="font-medium text-gray-800 dark:text-gray-200">{activity.inCharge}</span></p>
                                                        {activity.description && <p className="text-sm text-gray-500 dark:text-gray-400/80 mt-2">{activity.description}</p>}
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditClick(activity)} className="p-2 rounded-full hover:bg-gray-500/10" title="Edit"><PencilSquareIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" /></button>
                                                            <button onClick={() => onDeleteActivity(activity.id)} className="p-2 rounded-full hover:bg-gray-500/10" title="Delete"><TrashIcon className="w-5 h-5 text-rose-500" /></button>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center text-gray-400 dark:text-zinc-500 py-16">
                                            <ListBulletIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-zinc-600 mb-3" />
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

// Smart Context Input Component
const SmartInput = ({ icon, label, value, onChange, type = 'text', as = 'input', required = false }) => {
    const commonProps = {
        value: value,
        onChange: (e) => onChange(e.target.value),
        className: "w-full rounded-xl border-0 bg-gray-500/10 py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition",
        required: required
    };
    const InputComponent = as;
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">{label}</label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    {React.cloneElement(icon, { className: 'h-5 w-5 text-gray-400 dark:text-zinc-500' })}
                </div>
                <InputComponent type={type} {...commonProps} />
            </div>
        </div>
    );
};

export default ScheduleModal;