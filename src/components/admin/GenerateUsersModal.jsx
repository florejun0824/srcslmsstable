// src/components/admin/GenerateUsersModal.jsx

import React, { useState } from 'react';
import { Users, X, ChevronDown, Building } from 'lucide-react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
// ✅ Import Auth & School Config
import { useAuth, SCHOOLS, DEFAULT_SCHOOL_ID } from '../../contexts/AuthContext';

const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

// --- VISUAL HELPERS ---
const glassInput = "w-full appearance-none px-4 py-3 bg-gray-50/50 dark:bg-black/20 border border-gray-200/60 dark:border-white/10 rounded-xl text-[15px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all";
const labelStyle = "block text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide ml-1";

const GenerateUsersModal = ({ onSubmit, onClose }) => {
    const { userProfile } = useAuth();
    
    // Check if the current admin is from the Main School
    const isSuperAdmin = userProfile?.schoolId === DEFAULT_SCHOOL_ID;

    const [activeTab, setActiveTab] = useState('list'); 
    const [quantity, setQuantity] = useState(10);
    const [names, setNames] = useState('');
    const [role, setRole] = useState('student');
    const [gradeLevel, setGradeLevel] = useState(gradeLevels[0]);
    // ✅ Add School State (Defaults to Admin's School)
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
            : { quantity: parseInt(quantity, 10), role, schoolId }; // ✅ Pass schoolId
        
        if (role === 'student') {
            submissionData.gradeLevel = gradeLevel;
        }
        onSubmit(submissionData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* --- 1. BACKGROUND & AURORA EFFECTS --- */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse delay-1000"></div>
            </div>
            
            {/* --- 2. MODAL CONTAINER --- */}
            <div className="relative w-full max-w-[420px] md:max-w-[640px] transform overflow-hidden rounded-[28px] bg-white/70 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl shadow-[0_40px_80px_-12px_rgba(0,0,0,0.3)] ring-1 ring-white/20 dark:ring-white/5 transition-all duration-300 ease-out animate-modal-pop-in">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-[42px] h-[42px] rounded-[12px] bg-gradient-to-b from-[#007AFF] to-[#0062CC] flex items-center justify-center shadow-lg shadow-blue-500/30 border-t border-white/20">
                            <Users className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-[19px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                Generate Users
                            </h2>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                                Create multiple accounts at once
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100/80 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-400 transition-colors backdrop-blur-sm"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 pb-6 space-y-6">
                        
                        {/* Segmented Control */}
                        <div className="p-1 bg-gray-200/60 dark:bg-black/30 rounded-xl flex items-center relative backdrop-blur-md">
                            <div 
                                className={`absolute top-1 bottom-1 rounded-[9px] bg-white dark:bg-[#636366] shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] w-[calc(50%-4px)] ${activeTab === 'list' ? 'left-1' : 'left-[calc(50%)]'}`} 
                            />
                            
                            <button
                                type="button"
                                onClick={() => setActiveTab('list')}
                                className={`relative flex-1 py-1.5 text-[13px] font-semibold tracking-wide text-center z-10 transition-colors duration-200 ${activeTab === 'list' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                From Name List
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('quantity')}
                                className={`relative flex-1 py-1.5 text-[13px] font-semibold tracking-wide text-center z-10 transition-colors duration-200 ${activeTab === 'quantity' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                By Quantity
                            </button>
                        </div>

                        {/* Content Switching Area */}
                        <SwitchTransition mode="out-in">
                            <CSSTransition key={activeTab} addEndListener={(node, done) => node.addEventListener("transitionend", done, false)} classNames="fade">
                                <div>
                                    {activeTab === 'list' ? (
                                        <div>
                                            <label htmlFor="names" className={labelStyle}>Paste Names (one per line)</label>
                                            <textarea
                                                id="names" value={names} onChange={(e) => setNames(e.target.value)}
                                                placeholder="Juan Dela Cruz&#10;Maria Clara"
                                                className={`${glassInput} h-36 resize-none leading-relaxed font-medium`}
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label htmlFor="quantity" className={labelStyle}>Number of Accounts</label>
                                            <input
                                                type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                                                min="1" max="100"
                                                className={`${glassInput} font-medium`}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            </CSSTransition>
                        </SwitchTransition>
                        
                        {/* Inset Grouped Options */}
                        <div>
                            <label className={labelStyle}>Options</label>
                            <div className="bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl overflow-hidden">
                                
                                {/* 🏫 SCHOOL SELECTOR (Only for Super Admin) */}
                                {isSuperAdmin && (
                                    <div className="flex justify-between items-center p-3 pr-4 border-b border-gray-100 dark:border-white/5 bg-blue-50/50 dark:bg-blue-900/10">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4 text-blue-500" />
                                            <label htmlFor="schoolId" className="text-[15px] text-gray-900 dark:text-white font-medium">
                                                Target School
                                            </label>
                                        </div>
                                        <div className="relative max-w-[200px]">
                                            <select 
                                                id="schoolId" 
                                                value={schoolId} 
                                                onChange={(e) => setSchoolId(e.target.value)} 
                                                className="appearance-none bg-transparent text-right text-[14px] text-blue-600 dark:text-blue-400 font-bold pr-6 focus:outline-none cursor-pointer w-full"
                                            >
                                                {Object.values(SCHOOLS).map((school) => (
                                                    <option key={school.id} value={school.id}>
                                                        {school.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                )}

                                {/* Role Row */}
                                <div className="flex justify-between items-center p-3 pr-4 border-b border-gray-100 dark:border-white/5">
                                    <label htmlFor="role" className="text-[15px] text-gray-900 dark:text-white font-medium pl-2">Assign Role</label>
                                    <div className="relative">
                                        <select 
                                            id="role" 
                                            value={role} 
                                            onChange={(e) => setRole(e.target.value)} 
                                            className="appearance-none bg-transparent text-right text-[15px] text-blue-600 dark:text-blue-400 font-medium pr-6 focus:outline-none cursor-pointer"
                                        >
                                            <option value="student">Student</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none" strokeWidth={2.5} />
                                    </div>
                                </div>
                                
                                {/* Grade Level Row (Conditional) */}
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${role === 'student' ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
                                     <div className="flex justify-between items-center p-3 pr-4">
                                        <label htmlFor="gradeLevel" className="text-[15px] text-gray-900 dark:text-white font-medium pl-2">Grade Level</label>
                                        <div className="relative">
                                            <select 
                                                id="gradeLevel" 
                                                value={gradeLevel} 
                                                onChange={(e) => setGradeLevel(e.target.value)} 
                                                className="appearance-none bg-transparent text-right text-[15px] text-blue-600 dark:text-blue-400 font-medium pr-6 focus:outline-none cursor-pointer"
                                            >
                                                {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg p-3 text-center">
                                <p className="text-red-600 dark:text-red-400 text-[13px] font-semibold">{error}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="p-6 pt-0 bg-transparent">
                        <button 
                            type="submit" 
                            className="
                                relative w-full overflow-hidden px-6 py-3.5 rounded-xl text-white text-[15px] font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200
                                bg-[#007AFF] hover:bg-[#0062CC] active:scale-[0.98]
                            "
                        >
                            <span className="relative z-10">Generate Accounts</span>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Styles for animations */}
            <style>{`
                .fade-enter { opacity: 0; transform: translateY(10px) scale(0.98); }
                .fade-enter-active { opacity: 1; transform: translateY(0) scale(1); transition: opacity 250ms cubic-bezier(0.32,0.72,0,1), transform 250ms cubic-bezier(0.32,0.72,0,1); }
                .fade-exit { opacity: 1; transform: translateY(0) scale(1); }
                .fade-exit-active { opacity: 0; transform: translateY(-10px) scale(0.98); transition: opacity 200ms ease-in, transform 200ms ease-in; }
                
                @keyframes modalPopIn { 
                    0% { opacity: 0; transform: scale(0.9) translateY(10px); } 
                    100% { opacity: 1; transform: scale(1) translateY(0); } 
                }
                .animate-modal-pop-in { animation: modalPopIn 0.35s cubic-bezier(0.32,0.72,0,1) forwards; }
            `}</style>
        </div>
    );
};

export default GenerateUsersModal;