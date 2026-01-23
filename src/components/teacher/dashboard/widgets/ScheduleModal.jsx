// src/components/teacher/dashboard/widgets/ScheduleModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    X, 
    Calendar, 
    Clock, 
    User, 
    AlignLeft, 
    Plus, 
    Edit2, 
    Trash2, 
    CalendarDays
} from 'lucide-react';

// --- MAIN COMPONENT ---
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

    // Reset state when closing/opening
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                clearForm();
                setActiveTab('view');
            }, 300);
            return () => clearTimeout(timer);
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

    const tabs = [{ id: 'view', label: 'Events' }, { id: 'add', label: editingActivity ? 'Edit Event' : 'Add New' }];

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans">
                    
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`
                            relative w-full max-w-2xl flex flex-col overflow-hidden
                            bg-white dark:bg-[#121212]
                            rounded-[2rem] shadow-2xl 
                            border border-slate-200 dark:border-white/10
                            max-h-[85dvh] // Mobile viewport safe height
                        `}
                    >
                        {/* --- HEADER --- */}
                        <div className="flex-none px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-md z-20 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">School Calendar</h2>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Upcoming Activities</p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* --- SEGMENTED TABS (Admin Only) --- */}
                        {isAdmin && (
                            <div className="flex-none px-6 pt-4 pb-2">
                                <div className="p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl flex relative">
                                    {/* Sliding Background */}
                                    <motion.div 
                                        className="absolute top-1.5 bottom-1.5 bg-white dark:bg-slate-700 shadow-sm rounded-xl"
                                        initial={false}
                                        animate={{ 
                                            left: activeTab === 'view' ? '6px' : '50%', 
                                            width: 'calc(50% - 9px)'
                                        }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                    />
                                    
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                if (tab.id === 'view' && editingActivity) handleCancelEdit();
                                                else if (tab.id === 'add' && !editingActivity) clearForm();
                                            }}
                                            className={`relative z-10 flex-1 py-2 text-sm font-bold transition-colors ${activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* --- SCROLLABLE CONTENT --- */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 scroll-smooth min-h-0">
                            <AnimatePresence mode="wait">
                                {/* VIEW TAB */}
                                {activeTab === 'view' && (
                                    <motion.div 
                                        key="view"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {sortedActivities.length > 0 ? (
                                            <ul className="space-y-3">
                                                {sortedActivities.map(activity => (
                                                    <li key={activity.id} className="group relative flex gap-4 p-4 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all">
                                                        
                                                        {/* Date Tile */}
                                                        <div className="flex-shrink-0 w-16 h-16 bg-white dark:bg-white/10 rounded-2xl flex flex-col items-center justify-center shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                                                            <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-500/20 w-full text-center py-1">
                                                                {new Date(activity.startDate).toLocaleString('default', { month: 'short' })}
                                                            </span>
                                                            <span className="text-xl font-black text-slate-800 dark:text-white flex-1 flex items-center">
                                                                {new Date(activity.startDate).getDate()}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1 min-w-0 py-0.5">
                                                            <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">{activity.title}</h4>
                                                            
                                                            <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock size={12} className="text-blue-500" />
                                                                    {activity.time !== 'N/A' ? activity.time : 'All Day'}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <User size={12} className="text-purple-500" />
                                                                    {activity.inCharge}
                                                                </span>
                                                            </div>

                                                            {activity.description && (
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed opacity-80">
                                                                    {activity.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Admin Actions (Hover on Desktop, Always visible on mobile if needed) */}
                                                        {isAdmin && (
                                                            <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleEditClick(activity)} className="p-1.5 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 shadow-sm border border-slate-100 dark:border-white/10">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => onDeleteActivity(activity.id)} className="p-1.5 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 dark:border-white/10">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                                                <CalendarDays size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                                                <p className="text-base font-bold text-slate-700 dark:text-slate-300">No events scheduled</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Enjoy the free time!</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* FORM TAB */}
                                {isAdmin && activeTab === 'add' && (
                                    <motion.div 
                                        key="form"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <GlassInput icon={Edit2} label="Event Title" value={title} onChange={setTitle} required />
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <GlassInput type="date" icon={Calendar} label="Start Date" value={startDate} onChange={setStartDate} required />
                                                <GlassInput type="date" icon={Calendar} label="End Date" value={endDate} onChange={setEndDate} required />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <GlassInput type="time" icon={Clock} label="Time (Optional)" value={time} onChange={setTime} />
                                                <GlassInput icon={User} label="Person In-Charge" value={inCharge} onChange={setInCharge} required />
                                            </div>
                                            
                                            <GlassInput as="textarea" icon={AlignLeft} label="Description (Optional)" value={description} onChange={setDescription} />
                                            
                                            <div className="pt-4 flex gap-3">
                                                <button 
                                                    type="button" 
                                                    onClick={handleCancelEdit} 
                                                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    className="flex-[2] py-3.5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {editingActivity ? <Edit2 size={16} /> : <Plus size={16} />}
                                                    {editingActivity ? 'Save Changes' : 'Add Activity'}
                                                </button>
                                            </div>
                                        </form>
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

// --- NEO-GLASS INPUT COMPONENT ---
const GlassInput = ({ icon: Icon, label, value, onChange, type = 'text', as = 'input', required = false }) => {
    const Component = as;
    return (
        <div className="relative group">
            {/* Input Background */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 transition-all group-focus-within:border-blue-500/50 group-focus-within:ring-4 group-focus-within:ring-blue-500/10" />
            
            {/* Icon */}
            <div className="absolute top-[18px] left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                <Icon size={20} />
            </div>

            {/* Input Field */}
            <Component 
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                placeholder=" " // Needed for peer-placeholder-shown
                className={`
                    relative w-full bg-transparent border-none outline-none
                    pl-12 pr-4 pt-6 pb-2
                    text-base font-semibold text-slate-800 dark:text-slate-100
                    peer resize-none
                    ${as === 'textarea' ? 'h-28' : 'h-14'}
                `}
            />

            {/* Floating Label */}
            <label className={`
                absolute left-12 top-4 text-xs font-bold text-slate-400 uppercase tracking-wider pointer-events-none transition-all
                peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-base peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-placeholder-shown:text-slate-500
                peer-focus:top-4 peer-focus:text-xs peer-focus:font-bold peer-focus:uppercase peer-focus:text-blue-500
            `}>
                {label}
            </label>
        </div>
    );
};

export default ScheduleModal;