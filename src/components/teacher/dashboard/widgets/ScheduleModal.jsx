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
    CalendarDays,
    Moon, 
    CheckCircle2,
    Sparkles
} from 'lucide-react';

// --- MOONLIGHT OS: AESTHETIC ENGINE (OPTIMIZED) ---

const modalBase = `
    relative w-full max-w-2xl flex flex-col overflow-hidden
    bg-[#0f111a] rounded-[32px] shadow-2xl 
    border border-white/10 ring-1 ring-white/5
    max-h-[85dvh]
`;

const inputContainer = "relative group mb-5";
const inputStyle = `
    w-full bg-[#0a0c14] border border-white/5 rounded-xl
    pl-12 pr-4 pt-6 pb-2.5 text-white font-medium
    shadow-inner
    focus:outline-none focus:border-indigo-500/50 focus:bg-[#0f121e] 
    focus:shadow-[0_0_20px_rgba(99,102,241,0.1)]
    transition-all duration-300 ease-out text-[14px] tracking-wide
    peer resize-none placeholder-transparent
`;

const labelStyle = `
    absolute left-12 top-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] pointer-events-none transition-all duration-300
    peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-600 peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal
    peer-focus:top-2 peer-focus:text-[9px] peer-focus:text-indigo-400 peer-focus:uppercase peer-focus:tracking-[0.2em]
`;

const iconStyle = `
    absolute top-[20px] left-4 text-slate-600 
    transition-all duration-300 
    group-focus-within:text-indigo-400 group-focus-within:scale-110 
`;

const primaryButtonStyles = `
    flex-[2] py-3.5 rounded-xl font-bold text-xs text-white uppercase tracking-[0.15em]
    bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 background-animate
    shadow-lg hover:shadow-indigo-500/25
    border border-white/10 transition-all active:scale-[0.98]
    flex items-center justify-center gap-2 relative overflow-hidden group
`;

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
            const timer = setTimeout(() => { clearForm(); setActiveTab('view'); }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (event) => { if (event.key === 'Escape') onClose(); }
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

    const handleCancelEdit = () => { clearForm(); setActiveTab('view'); };
    
    const sortedActivities = [...scheduleActivities].sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || a.time.localeCompare(b.time));
    const tabs = [{ id: 'view', label: 'Timeline' }, { id: 'add', label: editingActivity ? 'Modify Event' : 'New Event' }];

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans">
                    
                    {/* OPTIMIZATION: Replaced backdrop-blur-xl with simple opacity. 
                        This removes the heavy GPU blur calculation during animation. */}
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#000]/80 transition-opacity duration-300"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={modalBase}
                        // OPTIMIZATION: Tell browser to promote this layer
                        style={{ willChange: 'transform, opacity' }} 
                    >
                        {/* Atmospheric Glow (Static, lighter weight) */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none rounded-full" />
                        
                        {/* --- HEADER --- */}
                        <div className="relative flex-none px-6 py-5 border-b border-white/5 z-20 flex justify-between items-center bg-[#0f111a]">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles size={12} className="text-indigo-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Events</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    Schedule <span className="text-indigo-400">Manager</span>
                                </h2>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* --- TABS --- */}
                        {isAdmin && (
                            <div className="relative flex-none px-6 pt-6 pb-2 z-10">
                                <div className="p-1 bg-[#0a0c14] border border-white/5 rounded-xl flex relative">
                                    <motion.div 
                                        className="absolute top-1 bottom-1 bg-[#1e2230] border border-white/5 rounded-[10px] shadow-sm"
                                        initial={false}
                                        animate={{ 
                                            left: activeTab === 'view' ? '4px' : '50%', 
                                            width: 'calc(50% - 6px)'
                                        }}
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                    
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                if (tab.id === 'view' && editingActivity) handleCancelEdit();
                                                else if (tab.id === 'add' && !editingActivity) clearForm();
                                            }}
                                            className={`relative z-10 flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* --- CONTENT AREA --- */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 scroll-smooth min-h-0 relative z-10">
                            {/* OPTIMIZATION: Removed 'filter' animation prop. Only animating opacity/x is much faster. */}
                            <AnimatePresence mode="wait">
                                {/* VIEW MODE */}
                                {activeTab === 'view' && (
                                    <motion.div 
                                        key="view"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {sortedActivities.length > 0 ? (
                                            <ul className="space-y-3">
                                                {sortedActivities.map((activity, idx) => (
                                                    <motion.li 
                                                        key={activity.id} 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.03 }}
                                                        className="group relative flex gap-5 p-4 rounded-2xl bg-[#151926] border border-white/5 hover:border-indigo-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
                                                    >
                                                        {/* Date Block */}
                                                        <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center bg-[#0a0c14] border border-white/5 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
                                                            <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
                                                                {new Date(activity.startDate).toLocaleString('default', { month: 'short' })}
                                                            </span>
                                                            <span className="text-xl font-bold text-white leading-none mt-0.5">
                                                                {new Date(activity.startDate).getDate()}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1 min-w-0 py-0.5">
                                                            <h4 className="text-sm font-bold text-white mb-1.5 truncate pr-2">
                                                                {activity.title}
                                                            </h4>
                                                            
                                                            <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                                                                <span className="flex items-center gap-1.5">
                                                                    <Clock size={12} className="text-indigo-400" />
                                                                    {activity.time !== 'N/A' ? activity.time : 'All Day'}
                                                                </span>
                                                                <div className="w-1 h-1 rounded-full bg-slate-600" />
                                                                <span className="flex items-center gap-1.5">
                                                                    <User size={12} className="text-violet-400" />
                                                                    {activity.inCharge}
                                                                </span>
                                                            </div>

                                                            {activity.description && (
                                                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                                                    {activity.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        {isAdmin && (
                                                            <div className="flex flex-col gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                <button onClick={() => handleEditClick(activity)} className="p-2 bg-[#0a0c14] hover:bg-indigo-500/20 rounded-lg text-slate-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 transition-all">
                                                                    <Edit2 size={13} />
                                                                </button>
                                                                <button onClick={() => onDeleteActivity(activity.id)} className="p-2 bg-[#0a0c14] hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-16 text-center opacity-50">
                                                <CalendarDays size={32} className="text-slate-600 mb-3" />
                                                <p className="text-xs font-medium text-slate-400">No scheduled events found</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* ADD/EDIT MODE */}
                                {isAdmin && activeTab === 'add' && (
                                    <motion.div 
                                        key="form"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <MoonlightInput icon={Edit2} label="Event Title" value={title} onChange={setTitle} required />
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <MoonlightInput type="date" icon={Calendar} label="Start Date" value={startDate} onChange={setStartDate} required />
                                                <MoonlightInput type="date" icon={Calendar} label="End Date" value={endDate} onChange={setEndDate} required />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <MoonlightInput type="time" icon={Clock} label="Time (Optional)" value={time} onChange={setTime} />
                                                <MoonlightInput icon={User} label="Person In-Charge" value={inCharge} onChange={setInCharge} required />
                                            </div>
                                            
                                            <MoonlightInput as="textarea" icon={AlignLeft} label="Details (Optional)" value={description} onChange={setDescription} />
                                            
                                            <div className="pt-4 flex gap-3">
                                                <button 
                                                    type="button" 
                                                    onClick={handleCancelEdit} 
                                                    className="flex-1 py-3.5 rounded-xl font-bold text-xs text-slate-400 uppercase tracking-widest hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button type="submit" className={primaryButtonStyles}>
                                                    {editingActivity ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                                                    {editingActivity ? 'Update' : 'Create Event'}
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

// --- MOONLIGHT INPUT COMPONENT (Refined) ---
const MoonlightInput = ({ icon: Icon, label, value, onChange, type = 'text', as = 'input', required = false }) => {
    const Component = as;
    return (
        <div className={inputContainer}>
            <Component 
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                placeholder=" " 
                className={`${inputStyle} ${as === 'textarea' ? 'h-32 pt-6' : 'h-[56px]'}`}
            />
            <div className={iconStyle}>
                <Icon size={16} />
            </div>
            <label className={labelStyle}>
                {label}
            </label>
        </div>
    );
};

export default ScheduleModal;