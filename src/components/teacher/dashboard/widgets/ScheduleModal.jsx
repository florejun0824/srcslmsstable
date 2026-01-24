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
    Moon, // Replaced Sparkles
    CheckCircle2
} from 'lucide-react';

// --- MOONLIGHT OS: AESTHETIC ENGINE ---

// Modal: "The Monolith" - A deep, floating slice of the night sky
const modalBase = `
    relative w-full max-w-2xl flex flex-col overflow-hidden
    bg-[#0b1021] rounded-[40px] shadow-2xl 
    border border-white/10 ring-1 ring-white/5
    max-h-[85dvh]
`;

// Inputs: "Obsidian Void" - Deep, dark, and highly polished
const inputContainer = "relative group mb-6";
const inputStyle = `
    w-full bg-[#050810] border border-white/5 rounded-2xl
    pl-12 pr-4 pt-6 pb-2.5 text-white font-medium
    shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]
    focus:outline-none focus:border-indigo-500/40 focus:bg-[#080c1a] 
    focus:shadow-[inset_0_2px_20px_rgba(0,0,0,0.6),0_0_30px_rgba(99,102,241,0.1)]
    transition-all duration-500 ease-out text-[15px] tracking-wide
    peer resize-none placeholder-transparent
`;

// Labels: "Holographic Projections"
const labelStyle = `
    absolute left-12 top-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] pointer-events-none transition-all duration-300
    peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-600 peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal
    peer-focus:top-2 peer-focus:text-[9px] peer-focus:text-indigo-300 peer-focus:uppercase peer-focus:tracking-[0.25em] peer-focus:drop-shadow-[0_0_8px_rgba(165,180,252,0.6)]
`;

// Icons: "Starlight Nodes"
const iconStyle = `
    absolute top-[20px] left-4 text-slate-600 
    transition-all duration-500 
    group-focus-within:text-indigo-300 group-focus-within:scale-110 
    group-focus-within:drop-shadow-[0_0_12px_rgba(129,140,248,0.8)]
`;

// Buttons: "Photon Emitters"
const primaryButtonStyles = `
    flex-[2] py-4 rounded-2xl font-bold text-sm text-white uppercase tracking-[0.2em]
    bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 background-animate
    shadow-[0_0_30px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] 
    hover:shadow-[0_0_50px_rgba(124,58,237,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]
    border border-white/10 transition-all active:scale-[0.98]
    flex items-center justify-center gap-3 relative overflow-hidden group
`;

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

    // Initialization & Event Listeners
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans">
                    
                    {/* Backdrop: The Void */}
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-xl transition-opacity duration-500"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        className={modalBase}
                    >
                        {/* Atmospheric Glow */}
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/20 blur-[120px] pointer-events-none mix-blend-screen" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay pointer-events-none" />

                        {/* --- HEADER --- */}
                        <div className="relative flex-none px-8 py-7 border-b border-white/5 z-20 flex justify-between items-center bg-[#0b1021]/80 backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-2.5 mb-1.5">
                                    <div className="p-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                        <Moon size={14} className="text-indigo-300 drop-shadow-[0_0_5px_rgba(165,180,252,0.8)]" />
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-200/70 uppercase tracking-[0.25em]">School Schedules</span>
                                </div>
                                <h2 className="text-3xl font-medium text-white tracking-tight">
                                    Event <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-slate-400">Horizon</span>
                                </h2>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="group p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all active:scale-90"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* --- TABS (Beautiful Glass Pills) --- */}
                        {isAdmin && (
                            <div className="relative flex-none px-8 pt-8 pb-2 z-10">
                                <div className="p-1.5 bg-[#050810] border border-white/5 rounded-full flex relative shadow-inner">
                                    {/* Sliding Glow Pill */}
                                    <motion.div 
                                        className="absolute top-1.5 bottom-1.5 bg-[#1e293b] border border-white/10 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                        initial={false}
                                        animate={{ 
                                            left: activeTab === 'view' ? '6px' : '50%', 
                                            width: 'calc(50% - 9px)'
                                        }}
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent rounded-full opacity-50" />
                                    </motion.div>
                                    
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                if (tab.id === 'view' && editingActivity) handleCancelEdit();
                                                else if (tab.id === 'add' && !editingActivity) clearForm();
                                            }}
                                            className={`relative z-10 flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === tab.id ? 'text-white text-shadow-sm' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* --- CONTENT AREA --- */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 scroll-smooth min-h-0 relative z-10">
                            <AnimatePresence mode="wait">
                                {/* VIEW MODE */}
                                {activeTab === 'view' && (
                                    <motion.div 
                                        key="view"
                                        initial={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                    >
                                        {sortedActivities.length > 0 ? (
                                            <ul className="space-y-4">
                                                {sortedActivities.map((activity, idx) => (
                                                    <motion.li 
                                                        key={activity.id} 
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="group relative flex gap-6 p-6 rounded-[32px] bg-[#131b2e]/40 border border-white/5 hover:bg-[#1a233b]/60 hover:border-white/10 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300"
                                                    >
                                                        {/* Date Crystal */}
                                                        <div className="flex-shrink-0 w-16 h-16 rounded-[20px] flex flex-col items-center justify-center overflow-hidden border border-white/10 bg-[#0a1120] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative group-hover:border-indigo-500/30 transition-all duration-500 group-hover:scale-105">
                                                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                                                            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-0.5 relative z-10 drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]">
                                                                {new Date(activity.startDate).toLocaleString('default', { month: 'short' })}
                                                            </span>
                                                            <span className="text-2xl font-light text-white relative z-10">
                                                                {new Date(activity.startDate).getDate()}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1 min-w-0 py-1">
                                                            <h4 className="text-lg font-medium text-white leading-tight mb-2.5 group-hover:text-indigo-200 transition-colors">
                                                                {activity.title}
                                                            </h4>
                                                            
                                                            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400 mb-3">
                                                                <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                                                                    <Clock size={12} className="text-indigo-400" />
                                                                    {activity.time !== 'N/A' ? activity.time : 'All Day'}
                                                                </span>
                                                                <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                                                                    <User size={12} className="text-violet-400" />
                                                                    {activity.inCharge}
                                                                </span>
                                                            </div>

                                                            {activity.description && (
                                                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                                                    {activity.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        {isAdmin && (
                                                            <div className="flex flex-col gap-2 justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                                <button onClick={() => handleEditClick(activity)} className="p-2.5 bg-[#0a1120] hover:bg-indigo-500/20 rounded-xl text-slate-400 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 transition-all shadow-lg">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => onDeleteActivity(activity.id)} className="p-2.5 bg-[#0a1120] hover:bg-red-500/20 rounded-xl text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all shadow-lg">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-white/5 to-transparent flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                                                    <CalendarDays size={40} className="text-slate-500" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Time Void</p>
                                                <p className="text-xs text-slate-500 mt-2">No scheduled events detected in this sector.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* ADD/EDIT MODE */}
                                {isAdmin && activeTab === 'add' && (
                                    <motion.div 
                                        key="form"
                                        initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
                                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                    >
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <MoonlightInput icon={Edit2} label="Event Title" value={title} onChange={setTitle} required />
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <MoonlightInput type="date" icon={Calendar} label="Start Date" value={startDate} onChange={setStartDate} required />
                                                <MoonlightInput type="date" icon={Calendar} label="End Date" value={endDate} onChange={setEndDate} required />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <MoonlightInput type="time" icon={Clock} label="Time (Optional)" value={time} onChange={setTime} />
                                                <MoonlightInput icon={User} label="Person In-Charge" value={inCharge} onChange={setInCharge} required />
                                            </div>
                                            
                                            <MoonlightInput as="textarea" icon={AlignLeft} label="Details (Optional)" value={description} onChange={setDescription} />
                                            
                                            <div className="pt-6 flex gap-4">
                                                <button 
                                                    type="button" 
                                                    onClick={handleCancelEdit} 
                                                    className="flex-1 py-4 rounded-2xl font-bold text-xs text-slate-400 uppercase tracking-widest hover:bg-white/5 border border-transparent hover:border-white/10 transition-all hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                                <button type="submit" className={primaryButtonStyles}>
                                                    {editingActivity ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                                                    {editingActivity ? 'Update Signal' : 'Log Event'}
                                                    
                                                    {/* Photon Shine Animation */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
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
                className={`${inputStyle} ${as === 'textarea' ? 'h-36 pt-6' : 'h-[64px]'}`}
            />
            <div className={iconStyle}>
                <Icon size={18} />
            </div>
            <label className={labelStyle}>
                {label}
            </label>
        </div>
    );
};

export default ScheduleModal;