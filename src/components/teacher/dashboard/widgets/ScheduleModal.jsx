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
                        className="relative bg-neumorphic-base rounded-3xl shadow-neumorphic p-6 md:p-8 w-full max-w-3xl mt-10 mb-8"
                    >
                        <div className="flex justify-between items-center pb-4 mb-6">
                            <h2 className="text-3xl font-bold text-slate-800 text-center flex-1">School Schedule</h2>
                            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">
                                <XMarkIcon className="w-6 h-6 text-slate-600" />
                            </button>
                        </div>

                        {isAdmin && (
                            <div className="w-full bg-neumorphic-base rounded-xl p-1 flex gap-1 mb-6 shadow-neumorphic-inset">
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
                                            <motion.div layoutId="active-pill" className="absolute inset-0 bg-gradient-to-br from-sky-200 to-blue-300 rounded-lg shadow-neumorphic" transition={{ type: 'spring', duration: 0.6 }}/>
                                        )}
                                        <span className={`relative z-10 transition-colors ${activeTab === tab.id ? 'text-blue-700' : 'text-slate-500'}`}>{tab.label}</span>
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
                                            <button type="button" onClick={handleCancelEdit} className="w-full sm:w-auto px-6 py-3 bg-neumorphic-base text-slate-700 font-semibold rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">Cancel</button>
                                            <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-gradient-to-br from-sky-200 to-blue-300 text-blue-700 font-semibold rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">{editingActivity ? 'Update Activity' : 'Add Activity'}</button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {activeTab === 'view' && (
                                <motion.div key="view-list" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                                    {sortedActivities.length > 0 ? (
                                        <ul className="space-y-2">
                                            {sortedActivities.map(activity => (
                                                <li key={activity.id} className="group flex items-start gap-4 p-4 rounded-xl transition-shadow hover:shadow-neumorphic-inset">
                                                    <div className="flex-shrink-0 mt-1 w-8 h-8 flex items-center justify-center bg-neumorphic-base rounded-full shadow-neumorphic-inset">
                                                        <CalendarDaysIcon className="w-5 h-5 text-sky-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-lg text-slate-800">{activity.title}</h4>
                                                        <p className="text-sm text-slate-600 mt-1">{activity.startDate} to {activity.endDate} {activity.time !== 'N/A' && ` at ${activity.time}`}</p>
                                                        <p className="text-sm text-slate-600">In-charge: <span className="font-medium text-slate-800">{activity.inCharge}</span></p>
                                                        {activity.description && <p className="text-sm text-slate-500 mt-2">{activity.description}</p>}
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditClick(activity)} className="p-2 rounded-full hover:shadow-neumorphic-inset" title="Edit"><PencilSquareIcon className="w-5 h-5 text-slate-500" /></button>
                                                            <button onClick={() => onDeleteActivity(activity.id)} className="p-2 rounded-full hover:shadow-neumorphic-inset" title="Delete"><TrashIcon className="w-5 h-5 text-rose-500" /></button>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center text-slate-500 py-16">
                                            <ListBulletIcon className="w-16 h-16 mx-auto text-slate-400 mb-3" />
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
        className: "w-full rounded-xl border-none bg-neumorphic-base py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-500 focus:ring-0 shadow-neumorphic-inset transition",
        required: required
    };
    const InputComponent = as;
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    {React.cloneElement(icon, { className: 'h-5 w-5 text-slate-400' })}
                </div>
                <InputComponent type={type} {...commonProps} />
            </div>
        </div>
    );
};

export default ScheduleModal;