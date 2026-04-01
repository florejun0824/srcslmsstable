import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import CustomDateTimePicker from './CustomDateTimePicker';
import {
    X, Buildings, GraduationCap, CaretRight, CheckCircle,
    Plus, Trash, CalendarBlank, Users, ListNumbers,
    TextAa, IdentificationCard, LockKey, Eye, Globe
} from '@phosphor-icons/react';

// --- PREMIUM ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } }
};

const formSectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
};

const CreateElectionForm = ({
    formData, setFormData, formStep, setFormStep, editingId, onCancel, onSubmit,
    updatePosition, addCandidate, updateCandidate, removeCandidate, removePosition, handleAddPosition
}) => {

    const canProceed = formData.title && formData.startDate && formData.endDate;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden" animate="visible" exit="exit"
            className="flex flex-col h-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl rounded-[32px] md:rounded-[40px] border border-white/80 dark:border-slate-800/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden relative"
        >
            {/* Ambient Animated Orb Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px] md:rounded-[40px] z-0">
                <motion.div 
                    animate={{ 
                        x: formStep === 1 ? '0%' : '-50%',
                        backgroundColor: formStep === 1 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)'
                    }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
                />
            </div>

            {/* === ELEGANT APP BAR === */}
            <div className="flex-none flex items-center justify-between px-5 py-5 md:px-8 md:py-8 relative z-20">
                <div className="flex items-center gap-4 md:gap-5 w-full">
                    <button
                        onClick={onCancel}
                        className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-[18px] md:rounded-[20px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 border border-white/60 dark:border-slate-700 shadow-sm active:scale-95 transition-all duration-300 shrink-0"
                    >
                        <X weight="bold" className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    
                    <div className="flex-1">
                        <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 md:mb-2">
                            {editingId ? 'Edit Ballot' : 'New Election'}
                        </h2>
                        <div className="flex items-center gap-3">
                            {/* Animated Progress Bar */}
                            <div className="flex-1 max-w-[120px] md:max-w-[160px] h-1.5 md:h-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500 rounded-full"
                                    initial={false}
                                    animate={{ width: formStep === 1 ? '50%' : '100%' }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                />
                            </div>
                            <span className="text-[10px] md:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                Step {formStep} of 2
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === SCROLLABLE CONTENT === */}
            <div className="flex-1 overflow-y-auto relative z-10 px-5 md:px-10 pb-5 md:pb-10 custom-scrollbar">
                <AnimatePresence mode="wait">
                    {formStep === 1 && (
                        <motion.div
                            key="step1"
                            variants={formSectionVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="space-y-6 md:space-y-8 max-w-2xl mx-auto"
                        >
							{/* 1. TITLE & ORG */}
							                            <div className="space-y-4 md:space-y-6">
							                                <div className="group relative">
							                                    <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 md:mb-3 block pl-4">Election Title</label>
							                                    <div className="relative flex items-center">
							                                        <div className="absolute left-5 w-10 h-10 rounded-[14px] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-focus-within:text-indigo-500 group-focus-within:bg-indigo-50 dark:group-focus-within:bg-indigo-500/20 transition-all duration-300">
							                                            <TextAa size={20} weight="bold" />
							                                        </div>
							                                        <input
							                                            type="text"
							                                            /* CHANGED: pl-18 to pl-20 */
							                                            className="w-full pl-20 pr-6 py-4 md:py-5 text-lg md:text-xl font-bold bg-white/50 dark:bg-slate-900/40 border border-white/80 dark:border-slate-700/50 rounded-[24px] focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-900 dark:text-white placeholder:text-slate-400/70 transition-all duration-300 shadow-inner"
							                                            placeholder="e.g., Student Council 2026"
							                                            value={formData.title}
							                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
							                                            autoFocus
							                                        />
							                                    </div>
							                                </div>

							                                <div className="group relative">
							                                    <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 md:mb-3 block pl-4">Organization</label>
							                                    <div className="relative flex items-center">
							                                        <div className="absolute left-5 w-10 h-10 rounded-[14px] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-focus-within:text-indigo-500 group-focus-within:bg-indigo-50 dark:group-focus-within:bg-indigo-500/20 transition-all duration-300">
							                                            <IdentificationCard size={20} weight="bold" />
							                                        </div>
							                                        <input
							                                            type="text"
							                                            /* CHANGED: pl-18 to pl-20 */
							                                            className="w-full pl-20 pr-6 py-4 md:py-5 text-base md:text-lg font-bold bg-white/50 dark:bg-slate-900/40 border border-white/80 dark:border-slate-700/50 rounded-[24px] focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400/70 transition-all duration-300 shadow-inner"
							                                            placeholder="Department or Group"
							                                            value={formData.organization}
							                                            onChange={e => setFormData({ ...formData, organization: e.target.value })}
							                                        />
							                                    </div>
							                                </div>
							                            </div>

                            {/* 2. VISIBILITY TOGGLE */}
                            <div className="space-y-3 md:space-y-4 pt-2">
                                <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-4 block">Dashboard Visibility</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'private' })}
                                        className={`relative p-4 md:p-5 rounded-[24px] border transition-all duration-300 flex items-center gap-4 overflow-hidden outline-none text-left
                                            ${formData.visibility === 'private'
                                                ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-4 ring-indigo-500/10 shadow-[0_8px_20px_rgba(99,102,241,0.15)]'
                                                : 'bg-white/40 dark:bg-slate-900/30 border-white/60 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-[16px] transition-all duration-300 shadow-inner ${formData.visibility === 'private' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <LockKey weight="fill" className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className={`block text-sm md:text-base font-black mb-0.5 ${formData.visibility === 'private' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Private Event</span>
                                            <span className="block text-[10px] md:text-xs font-medium text-slate-400">Only you and Admins.</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'public' })}
                                        className={`relative p-4 md:p-5 rounded-[24px] border transition-all duration-300 flex items-center gap-4 overflow-hidden outline-none text-left
                                            ${formData.visibility === 'public'
                                                ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-4 ring-indigo-500/10 shadow-[0_8px_20px_rgba(99,102,241,0.15)]'
                                                : 'bg-white/40 dark:bg-slate-900/30 border-white/60 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-[16px] transition-all duration-300 shadow-inner ${formData.visibility === 'public' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <Eye weight="fill" className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className={`block text-sm md:text-base font-black mb-0.5 ${formData.visibility === 'public' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Public Event</span>
                                            <span className="block text-[10px] md:text-xs font-medium text-slate-400">Others can view results.</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* 3. DATES */}
                            <div className="space-y-3 md:space-y-4 pt-2">
                                <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-4 block">Event Duration</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="bg-white/60 dark:bg-slate-900/40 p-5 rounded-[24px] border border-white/80 dark:border-slate-700/50 shadow-inner group focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                        <label className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 mb-3 uppercase tracking-widest group-focus-within:text-indigo-500 transition-colors">
                                            <CalendarBlank weight="bold" className="w-4 h-4" /> Start Time
                                        </label>
                                        {/* Assuming CustomDateTimePicker has transparent/clean styles internally */}
                                        <CustomDateTimePicker
                                            value={formData.startDate}
                                            onChange={val => setFormData({ ...formData, startDate: val })}
                                        />
                                    </div>
                                    <div className="bg-white/60 dark:bg-slate-900/40 p-5 rounded-[24px] border border-white/80 dark:border-slate-700/50 shadow-inner group focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                        <label className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 mb-3 uppercase tracking-widest group-focus-within:text-indigo-500 transition-colors">
                                            <CalendarBlank weight="bold" className="w-4 h-4" /> End Time
                                        </label>
                                        <CustomDateTimePicker
                                            value={formData.endDate}
                                            onChange={val => setFormData({ ...formData, endDate: val })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {formStep === 2 && (
                        <motion.div
                            key="step2"
                            variants={formSectionVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="space-y-6 md:space-y-8 max-w-2xl mx-auto"
                        >
                            <div className="text-center mb-4 md:mb-8">
                                <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Configure Ballot</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium mt-2">Structure your election by adding positions and candidates.</p>
                            </div>

                            <LayoutGroup>
                                <AnimatePresence>
                                    {formData.positions.map((pos, pIdx) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                            key={pos.id}
                                            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[32px] p-5 md:p-8 border border-white/80 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group"
                                        >
                                            {/* Position Header & Delete */}
                                            <div className="flex justify-between items-start mb-6 md:mb-8">
                                                <div className="flex-1 mr-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 block pl-2">Position Title</label>
                                                    <input
                                                        type="text" placeholder="e.g., President"
                                                        className="text-2xl md:text-4xl font-black bg-transparent w-full outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-colors border-b-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 pb-2"
                                                        value={pos.title}
                                                        onChange={e => updatePosition(pIdx, 'title', e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removePosition(pIdx)}
                                                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-[18px] md:rounded-[20px] bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all duration-300"
                                                    title="Remove Position"
                                                >
                                                    <Trash weight="fill" className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* --- POSITION AUDIENCE TARGETING --- */}
                                            <div className="mb-6 md:mb-8 bg-slate-50/80 dark:bg-slate-950/50 p-4 md:p-5 rounded-[24px] border border-white dark:border-slate-800 shadow-inner">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3 pl-2">Eligible Voters</label>
                                                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                                                    <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 md:p-1.5 rounded-[20px] flex-1">
                                                        <button
                                                            onClick={() => updatePosition(pIdx, 'targetType', 'school')}
                                                            className={`flex-1 px-4 py-2.5 rounded-[16px] text-xs md:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                                                pos.targetType === 'school' || !pos.targetType 
                                                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                            }`}
                                                        >
                                                            <Globe weight="bold" className="w-4 h-4" /> Entire School
                                                        </button>
                                                        <button
                                                            onClick={() => updatePosition(pIdx, 'targetType', 'grade')}
                                                            className={`flex-1 px-4 py-2.5 rounded-[16px] text-xs md:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                                                pos.targetType === 'grade' 
                                                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                            }`}
                                                        >
                                                            <GraduationCap weight="bold" className="w-4 h-4" /> Specific Grade
                                                        </button>
                                                    </div>
                                                    
                                                    {pos.targetType === 'grade' && (
                                                        <div className="sm:w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[20px] px-4 py-2 flex items-center shadow-sm">
                                                            <select
                                                                value={pos.targetGrade || 7}
                                                                onChange={e => updatePosition(pIdx, 'targetGrade', e.target.value)}
                                                                className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none appearance-none"
                                                            >
                                                                {[7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Candidates List */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-2">Candidates</label>
                                                <AnimatePresence>
                                                    {pos.candidates.map((cand, cIdx) => (
                                                        <motion.div 
                                                            key={cand.id} 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="flex items-center gap-3 relative"
                                                        >
                                                            <input
                                                                type="text" placeholder="Enter candidate name"
                                                                className="w-full pl-5 pr-14 py-4 rounded-[20px] text-sm md:text-base font-bold bg-white/80 dark:bg-slate-900/80 border border-white dark:border-slate-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
                                                                value={cand.name}
                                                                onChange={e => updateCandidate(pIdx, cIdx, e.target.value)}
                                                            />
                                                            <button
                                                                onClick={() => removeCandidate(pIdx, cIdx)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-[14px] text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/20 transition-all"
                                                            >
                                                                <X weight="bold" size={16} />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                                
                                                <button
                                                    onClick={() => addCandidate(pIdx)}
                                                    className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 w-full md:w-auto px-6 py-4 rounded-[20px] border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-400 dark:hover:border-indigo-400 transition-all duration-300"
                                                >
                                                    <Plus weight="bold" size={16} /> Add Candidate
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </LayoutGroup>

                            <button
                                onClick={handleAddPosition}
                                className="w-full py-10 md:py-12 rounded-[32px] border-2 border-dashed border-slate-300/80 dark:border-slate-700 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 flex flex-col items-center justify-center gap-3 bg-white/30 hover:bg-white/60 dark:bg-slate-900/20 dark:hover:bg-slate-900/60 shadow-inner group active:scale-[0.99]"
                            >
                                <div className="p-4 rounded-[20px] bg-white dark:bg-slate-800 shadow-sm group-hover:scale-110 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-all duration-300">
                                    <ListNumbers weight="bold" className="w-6 h-6 md:w-8 md:h-8" />
                                </div>
                                <span className="font-bold text-sm md:text-base">Add Another Position</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* === ACTION FOOTER === */}
            <div className="flex-none px-5 py-5 md:px-8 md:py-6 border-t border-white/60 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/60 backdrop-blur-2xl z-20 flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                {formStep > 1 && (
                    <button
                        onClick={() => setFormStep(1)}
                        className="w-full sm:w-auto px-8 py-4 md:py-5 rounded-[24px] font-bold text-sm md:text-base text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow active:scale-95 transition-all duration-300"
                    >
                        Back
                    </button>
                )}
                <button
                    onClick={() => formStep === 1 ? (canProceed && setFormStep(2)) : onSubmit()}
                    disabled={formStep === 1 && !canProceed}
                    className={`flex-1 w-full px-8 py-4 md:py-5 rounded-[24px] font-bold text-sm md:text-base flex items-center justify-center gap-3 transition-all duration-300
                        ${formStep === 1 && !canProceed
                            ? 'bg-white/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200/50 dark:border-slate-700/50'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_20px_rgba(255,255,255,0.15)]'
                        }`}
                >
                    {formStep === 1 ? (
                        <>Continue to Ballot <CaretRight weight="bold" className="w-5 h-5" /></>
                    ) : (
                        editingId ? <>Save Changes <CheckCircle weight="fill" className="w-5 h-5" /></> : <>Launch Election <CheckCircle weight="fill" className="w-5 h-5" /></>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

export default CreateElectionForm;