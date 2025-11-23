// src/components/teacher/dashboard/widgets/ScheduleModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, ListBulletIcon, UserIcon, ClockIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';

// Glass Schedule Modal
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
        hidden: { opacity: 0, scale: 0.95, y: 20 },
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
                // --- MODIFIED: Darker backdrop (bg-slate-900/40) and stronger blur (backdrop-blur-md) ---
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-[99999] p-4 font-sans" onClick={(e) => e.target === e.currentTarget && onClose()}>
                    <motion.div 
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        // --- MODIFIED: Increased opacity to 95% (bg-white/95) to prevent background bleed-through ---
                        className="relative glass-panel bg-white/95 dark:bg-slate-900/95 rounded-[2.5rem] shadow-2xl p-8 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-white/40 dark:border-white/10"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200/50 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-sm">
                                    <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">School Calendar</h2>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Upcoming Events</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {isAdmin && (
                            <div className="w-full bg-slate-100/80 dark:bg-white/5 rounded-xl p-1 flex gap-1 mb-6 shadow-inner border border-slate-200/50 dark:border-white/5">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            if (tab.id === 'view' && editingActivity) handleCancelEdit();
                                            else if (tab.id === 'add' && !editingActivity) clearForm();
                                        }}
                                        className="relative flex-1 py-2 px-4 text-center text-xs font-bold rounded-lg transition-all focus:outline-none z-10"
                                    >
                                        {activeTab === tab.id && (
                                            <motion.div 
                                                layoutId="active-pill" 
                                                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200/50 dark:border-white/5" 
                                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className={`relative z-10 transition-colors ${activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {tab.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                            <AnimatePresence mode="wait">
                                {isAdmin && activeTab === 'add' && (
                                    <motion.div key="add-edit-form" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit">
                                        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
                                            <SmartInput icon={<PencilSquareIcon />} label="Activity Title" value={title} onChange={setTitle} required />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <SmartInput type="date" icon={<CalendarDaysIcon />} label="Start Date" value={startDate} onChange={setStartDate} required />
                                                <SmartInput type="date" icon={<CalendarDaysIcon />} label="End Date" value={endDate} onChange={setEndDate} required />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <SmartInput type="time" icon={<ClockIcon />} label="Time (Optional)" value={time} onChange={setTime} />
                                                <SmartInput icon={<UserIcon />} label="Person In-charge" value={inCharge} onChange={setInCharge} required />
                                            </div>
                                            <SmartInput as="textarea" icon={<Bars3BottomLeftIcon />} label="Description (Optional)" value={description} onChange={setDescription} />
                                            
                                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100/50 dark:border-white/5">
                                                <button 
                                                    type="button" 
                                                    onClick={handleCancelEdit} 
                                                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
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
                                            <ul className="space-y-3">
                                                {sortedActivities.map(activity => (
                                                    <motion.li 
                                                        key={activity.id} 
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="group relative flex items-start gap-4 p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg transition-all duration-300"
                                                    >
                                                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-xs flex-col leading-none shadow-sm">
                                                            <span>{new Date(activity.startDate).getDate()}</span>
                                                            <span className="text-[8px] uppercase mt-0.5 opacity-80">
                                                                {new Date(activity.startDate).toLocaleString('default', { month: 'short' })}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-tight mb-1">{activity.title}</h4>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                                                <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {activity.time !== 'N/A' ? activity.time : 'All Day'}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                <span className="truncate">In-charge: <span className="font-semibold text-slate-700 dark:text-slate-300">{activity.inCharge}</span></span>
                                                            </div>
                                                            {activity.description && <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{activity.description}</p>}
                                                        </div>

                                                        {isAdmin && (
                                                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={() => handleEditClick(activity)} 
                                                                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors shadow-sm" 
                                                                    title="Edit"
                                                                >
                                                                    <PencilSquareIcon className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => onDeleteActivity(activity.id)} 
                                                                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors shadow-sm" 
                                                                    title="Delete"
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
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                                    <ListBulletIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">No Scheduled Activities</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Your calendar is currently clear. Check back later for updates.</p>
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

// Glass Input Component
const SmartInput = ({ icon, label, value, onChange, type = 'text', as = 'input', required = false }) => {
    const commonProps = {
        value: value,
        onChange: (e) => onChange(e.target.value),
        // --- MODIFIED: Increased opacity of input backgrounds ---
        className: "w-full rounded-xl bg-slate-50/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all shadow-inner",
        required: required
    };
    
    if (type === 'date' || type === 'time') {
        commonProps.className += ' dark:[color-scheme:dark]';
    }
    const InputComponent = as;
    
    return (
        <div className="group">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 uppercase tracking-wide opacity-80 group-focus-within:opacity-100 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-all">
                {label}
            </label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors">
                    {React.cloneElement(icon, { className: 'h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400' })}
                </div>
                <InputComponent type={type} {...commonProps} />
            </div>
        </div>
    );
};

export default ScheduleModal;