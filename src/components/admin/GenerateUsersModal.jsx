// src/components/admin/GenerateUsersModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, X, ChevronDown, Building, FileText, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, SCHOOLS, DEFAULT_SCHOOL_ID } from '../../contexts/AuthContext';

const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const GenerateUsersModal = ({ onSubmit, onClose }) => {
    const { userProfile } = useAuth();
    const isSuperAdmin = userProfile?.schoolId === DEFAULT_SCHOOL_ID;

    const [activeTab, setActiveTab] = useState('list'); 
    const [quantity, setQuantity] = useState(10);
    const [names, setNames] = useState('');
    const [role, setRole] = useState('student');
    const [gradeLevel, setGradeLevel] = useState(gradeLevels[0]);
    const [schoolId, setSchoolId] = useState(userProfile?.schoolId || DEFAULT_SCHOOL_ID);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (activeTab === 'quantity' && (quantity < 1 || quantity > 100)) {
            setError('Please enter a number between 1 and 100.');
            return;
        }
        if (activeTab === 'list' && names.trim() === '') {
            setError('Please paste at least one name.');
            return;
        }
        
        const submissionData = activeTab === 'list' 
            ? { names, role, schoolId } 
            : { quantity: parseInt(quantity, 10), role, schoolId };
        
        if (role === 'student') {
            submissionData.gradeLevel = gradeLevel;
        }
        onSubmit(submissionData);
    };

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Optimized Animations
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.92, y: 30 },
        visible: { 
            opacity: 1, scale: 1, y: 0, 
            transition: { type: "spring", damping: 28, stiffness: 350, mass: 0.8 } 
        },
        exit: { 
            opacity: 0, scale: 0.95, y: 20, 
            transition: { duration: 0.2, ease: "easeIn" } 
        }
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 font-sans">
                
                {/* Optimized Backdrop */}
                <motion.div
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-md transform-gpu will-change-opacity"
                />

                {/* Modal Container */}
                <motion.div 
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative w-full max-w-[550px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] dark:shadow-black/50 border border-white/40 dark:border-white/10 overflow-hidden transform-gpu will-change-transform flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 dark:border-white/5 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                                <Users className="w-6 h-6 stroke-[2.5]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                    Generate Users
                                </h2>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">
                                    Bulk Creation Wizard
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 transition-all active:scale-90"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Segmented Control */}
                            <div className="p-1.5 bg-slate-100 dark:bg-black/20 rounded-[1.5rem] flex relative isolate">
                                <div 
                                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-[#636366] rounded-[1.1rem] shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-0 ${activeTab === 'list' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('list')}
                                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide text-center z-10 transition-colors ${activeTab === 'list' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                >
                                    From List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('quantity')}
                                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide text-center z-10 transition-colors ${activeTab === 'quantity' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                >
                                    By Quantity
                                </button>
                            </div>

                            {/* Content Switching Area */}
                            <div className="min-h-[160px]">
                                {activeTab === 'list' ? (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -20 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        transition={{ duration: 0.3 }}
                                        className="space-y-2.5"
                                    >
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Paste Names (One per line)</label>
                                        <div className="relative group">
                                            <FileText className="absolute left-4 top-4 w-5 h-5 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                                            <textarea
                                                value={names}
                                                onChange={(e) => setNames(e.target.value)}
                                                placeholder="Juan Dela Cruz&#10;Maria Clara"
                                                className="w-full pl-12 pr-4 py-4 h-40 rounded-[1.5rem] bg-slate-50 dark:bg-black/20 border-2 border-transparent focus:bg-white dark:focus:bg-black/40 focus:border-blue-500/30 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 resize-none outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        transition={{ duration: 0.3 }}
                                        className="space-y-2.5"
                                    >
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Number of Accounts</label>
                                        <div className="relative group">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                min="1"
                                                max="100"
                                                className="w-full pl-12 pr-4 py-3.5 rounded-[1.2rem] bg-slate-50 dark:bg-black/20 border-2 border-transparent focus:bg-white dark:focus:bg-black/40 focus:border-blue-500/30 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 px-1">Generates placeholder accounts (e.g., Student 1, Student 2).</p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Configuration Card */}
                            <div className="p-1 rounded-[1.8rem] bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                <div className="grid divide-y divide-black/5 dark:divide-white/5">
                                    
                                    {/* School Selector (Super Admin) */}
                                    {isSuperAdmin && (
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                                <Building className="w-5 h-5" />
                                                <span className="text-sm font-bold">Target School</span>
                                            </div>
                                            <div className="relative">
                                                <select 
                                                    value={schoolId} 
                                                    onChange={(e) => setSchoolId(e.target.value)} 
                                                    className="appearance-none bg-transparent text-right text-sm font-bold text-blue-600 dark:text-blue-400 pr-5 focus:outline-none cursor-pointer"
                                                >
                                                    {Object.values(SCHOOLS).map((school) => (
                                                        <option key={school.id} value={school.id}>{school.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Role Selector */}
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                            <Users className="w-5 h-5" />
                                            <span className="text-sm font-bold">Assign Role</span>
                                        </div>
                                        <div className="relative">
                                            <select 
                                                value={role} 
                                                onChange={(e) => setRole(e.target.value)} 
                                                className="appearance-none bg-transparent text-right text-sm font-bold text-slate-900 dark:text-white pr-5 focus:outline-none cursor-pointer"
                                            >
                                                <option value="student">Student</option>
                                                <option value="teacher">Teacher</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Grade Level (Conditional) */}
                                    <AnimatePresence>
                                        {role === 'student' && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between p-4">
                                                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                                        <span className="text-sm font-bold pl-8">Grade Level</span>
                                                    </div>
                                                    <div className="relative">
                                                        <select 
                                                            value={gradeLevel} 
                                                            onChange={(e) => setGradeLevel(e.target.value)} 
                                                            className="appearance-none bg-transparent text-right text-sm font-bold text-slate-900 dark:text-white pr-5 focus:outline-none cursor-pointer"
                                                        >
                                                            {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                                                        </select>
                                                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-3 text-center"
                                    >
                                        <p className="text-red-600 dark:text-red-400 text-xs font-bold">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                className="w-full py-4 rounded-[1.5rem] font-bold text-sm text-white bg-[#007AFF] hover:bg-[#0062cc] shadow-lg shadow-blue-500/30 active:scale-98 transition-all relative overflow-hidden group"
                            >
                                <span className="relative z-10">Generate Accounts</span>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default GenerateUsersModal;