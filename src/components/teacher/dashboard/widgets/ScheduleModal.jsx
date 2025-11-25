// src/components/teacher/dashboard/widgets/ScheduleModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    XMarkIcon, 
    PencilSquareIcon, 
    TrashIcon, 
    CalendarDaysIcon, 
    ListBulletIcon, 
    UserIcon, 
    ClockIcon, 
    Bars3BottomLeftIcon 
} from '@heroicons/react/24/outline';

// --- MD3 Styled Schedule Modal ---
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

    // Close on Escape
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        }
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

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
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
    };

    const tabContentVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, x: 10, transition: { duration: 0.2, ease: "easeIn" } }
    };
    
    const tabs = [{ id: 'view', label: 'Schedule' }, { id: 'add', label: editingActivity ? 'Edit Activity' : 'Add Activity' }];

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    {/* Dark Scrim */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div 
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col font-sans z-10"
                    >
                        {/* --- Header Section --- */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <CalendarDaysIcon className="w-6 h-6" strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">School Calendar</h2>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Upcoming Events</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* --- Tabs (Admin Only) --- */}
                        {isAdmin && (
                            <div className="px-6 pt-6">
                                <div className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                if (tab.id === 'view' && editingActivity) handleCancelEdit();
                                                else if (tab.id === 'add' && !editingActivity) clearForm();
                                            }}
                                            className="relative flex-1 py-2.5 text-center text-sm font-bold rounded-xl transition-all z-10"
                                        >
                                            {activeTab === tab.id && (
                                                <motion.div 
                                                    layoutId="active-modal-tab" 
                                                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm" 
                                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <span className={`relative z-10 transition-colors ${activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {tab.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* --- Scrollable Content --- */}
                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                            <AnimatePresence mode="wait">
                                {isAdmin && activeTab === 'add' && (
                                    <motion.div key="add-edit-form" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit">
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <SmartInput icon={<PencilSquareIcon />} label="Activity Title" value={title} onChange={setTitle} required />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <SmartInput type="date" icon={<CalendarDaysIcon />} label="Start Date" value={startDate} onChange={setStartDate} required />
                                                <SmartInput type="date" icon={<CalendarDaysIcon />} label="End Date" value={endDate} onChange={setEndDate} required />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <SmartInput type="time" icon={<ClockIcon />} label="Time (Optional)" value={time} onChange={setTime} />
                                                <SmartInput icon={<UserIcon />} label="Person In-charge" value={inCharge} onChange={setInCharge} required />
                                            </div>
                                            <SmartInput as="textarea" icon={<Bars3BottomLeftIcon />} label="Description" value={description} onChange={setDescription} />
                                            
                                            <div className="flex items-center justify-end gap-3 pt-4">
                                                <button 
                                                    type="button" 
                                                    onClick={handleCancelEdit} 
                                                    className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    className="px-8 py-3 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
                                                >
                                                    {editingActivity ? 'Save Changes' : 'Add Activity'}
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}

                                {activeTab === 'view' && (
                                    <motion.div key="view-list" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit">
                                        {sortedActivities.length > 0 ? (
                                            <ul className="space-y-4">
                                                {sortedActivities.map(activity => (
                                                    <motion.li 
                                                        key={activity.id} 
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="group relative flex items-start gap-5 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300 hover:shadow-md"
                                                    >
                                                        {/* Visual Date Tile */}
                                                        <div className="flex-shrink-0 w-14 overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-center flex flex-col">
                                                            <div className="bg-red-500 text-white text-[9px] font-bold uppercase py-1">
                                                                {new Date(activity.startDate).toLocaleString('default', { month: 'short' })}
                                                            </div>
                                                            <div className="flex-1 flex items-center justify-center font-bold text-xl text-slate-800 dark:text-slate-200 py-1">
                                                                {new Date(activity.startDate).getDate()}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0 pt-0.5">
                                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-2">{activity.title}</h4>
                                                            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                                                <span className="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                                                                    <ClockIcon className="w-3.5 h-3.5 text-blue-500" /> 
                                                                    {activity.time !== 'N/A' ? activity.time : 'All Day'}
                                                                </span>
                                                                <span className="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                                                                    <UserIcon className="w-3.5 h-3.5 text-purple-500" />
                                                                    {activity.inCharge}
                                                                </span>
                                                            </div>
                                                            {activity.description && (
                                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                                                                    {activity.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {isAdmin && (
                                                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={() => handleEditClick(activity)} 
                                                                    className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-400 hover:text-blue-600 shadow-sm border border-slate-200 dark:border-slate-600 transition-colors" 
                                                                >
                                                                    <PencilSquareIcon className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => onDeleteActivity(activity.id)} 
                                                                    className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-400 hover:text-red-600 shadow-sm border border-slate-200 dark:border-slate-600 transition-colors" 
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                                    <ListBulletIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <p className="text-xl font-bold text-slate-900 dark:text-white">All Caught Up!</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                                                    No activities scheduled. Enjoy your free time or add a new event.
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// --- MD3 Filled Input Component ---
const SmartInput = ({ icon, label, value, onChange, type = 'text', as = 'input', required = false }) => {
    const commonProps = {
        value: value,
        onChange: (e) => onChange(e.target.value),
        className: "w-full rounded-t-lg border-b-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 pl-11 pr-4 text-base text-slate-900 dark:text-white placeholder-transparent focus:border-blue-600 dark:focus:border-blue-400 focus:bg-blue-50/50 dark:focus:bg-slate-700 outline-none transition-all peer",
        placeholder: label, // Required for peer-placeholder-shown trick
        required: required
    };
    
    if (type === 'date' || type === 'time') {
        commonProps.className += ' dark:[color-scheme:dark]';
    }
    const InputComponent = as;
    
    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                {React.cloneElement(icon, { 
                    className: 'h-5 w-5 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors' 
                })}
            </div>
            <InputComponent type={type} {...commonProps} />
            <label className="absolute left-11 top-3 text-xs font-bold text-slate-500 dark:text-slate-400 transition-all 
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400 
                peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 dark:peer-focus:text-blue-400
                -translate-y-full pointer-events-none uppercase tracking-wide">
                {label}
            </label>
        </div>
    );
};

export default ScheduleModal;