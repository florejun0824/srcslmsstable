import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import CustomDateTimePicker from './CustomDateTimePicker';
import {
    X, Buildings, GraduationCap, CaretRight, CaretLeft, CheckCircle,
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
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
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
            className="flex flex-col h-full md:h-[90vh] bg-[#FAFAFA] dark:bg-[#0A0A0A] rounded-none md:rounded-[32px] border-x-0 border-y-0 md:border md:border-slate-200 dark:md:border-slate-800 shadow-2xl overflow-hidden relative"
        >
            {/* Ambient Animated Orb Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px] z-0 hidden md:block">
                <motion.div 
                    animate={{ 
                        x: formStep === 1 ? '0%' : '-50%',
                        backgroundColor: formStep === 1 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(16, 185, 129, 0.08)'
                    }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
                />
            </div>

            {/* === ELEGANT APP BAR === */}
            <div className="flex-none flex items-center justify-between px-4 py-4 md:px-8 md:py-6 border-b border-slate-200 dark:border-slate-800 bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl relative z-20 pt-safe-top">
                <div className="flex items-center gap-3 md:gap-5 w-full">
                    <button
                        onClick={onCancel}
                        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl md:rounded-[14px] bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 outline-none"
                    >
                        <X weight="bold" className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    
                    <div className="flex-1">
                        <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 md:mb-1.5">
                            {editingId ? 'Edit Ballot' : 'New Election'}
                        </h2>
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex-1 max-w-[100px] md:max-w-[140px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-slate-900 dark:bg-white rounded-full"
                                    initial={false}
                                    animate={{ width: formStep === 1 ? '50%' : '100%' }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Step {formStep} of 2
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === SCROLLABLE CONTENT === */}
            <div className="flex-1 overflow-y-auto relative z-10 px-4 md:px-10 py-6 md:py-8 custom-scrollbar">
                <AnimatePresence mode="wait">
                    {formStep === 1 && (
                        <motion.div
                            key="step1"
                            variants={formSectionVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="space-y-6 md:space-y-8 max-w-2xl mx-auto"
                        >
                            {/* 1. TITLE & ORG */}
                            <div className="space-y-4 md:space-y-5">
                                <div>
                                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Election Title</label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 md:left-4 text-slate-400">
                                            <TextAa size={20} weight="bold" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-11 md:pl-12 pr-4 py-3.5 md:py-4 text-base md:text-lg font-bold bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl focus:border-slate-400 dark:focus:border-slate-600 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors shadow-sm"
                                            placeholder="e.g., Student Council 2026"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Organization Name</label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 md:left-4 text-slate-400">
                                            <IdentificationCard size={20} weight="bold" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-11 md:pl-12 pr-4 py-3 md:py-3.5 text-sm md:text-base font-semibold bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl focus:border-slate-400 dark:focus:border-slate-600 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors shadow-sm"
                                            placeholder="e.g., Electoral Board"
                                            value={formData.organization}
                                            onChange={e => setFormData({ ...formData, organization: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. DATES */}
                            <div className="pt-2">
                                <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                    <CalendarBlank weight="bold" className="w-3.5 h-3.5 md:w-4 md:h-4" /> Voting Period
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <CustomDateTimePicker
                                        label="Start Date & Time"
                                        value={formData.startDate}
                                        onChange={val => setFormData({ ...formData, startDate: val })}
                                    />
                                    <CustomDateTimePicker
                                        label="End Date & Time"
                                        value={formData.endDate}
                                        onChange={val => setFormData({ ...formData, endDate: val })}
                                        minDate={formData.startDate}
                                    />
                                </div>
                            </div>

                            {/* 3. VISIBILITY */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block mt-4 flex items-center gap-2">
                                    <Eye weight="bold" className="w-3.5 h-3.5 md:w-4 md:h-4" /> Visibility
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'private' })}
                                        className={`p-3.5 md:p-4 rounded-xl md:rounded-2xl border transition-all flex items-center gap-3 md:gap-4 text-left outline-none ${
                                            formData.visibility === 'private'
                                                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-md'
                                                : 'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${
                                            formData.visibility === 'private' ? 'bg-white/20 dark:bg-black/10 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                            <LockKey weight="duotone" size={24} />
                                        </div>
                                        <div>
                                            <div className={`text-sm md:text-base font-bold mb-0.5 ${formData.visibility === 'private' ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>Private</div>
                                            <div className={`text-[10px] md:text-xs font-medium ${formData.visibility === 'private' ? 'text-white/70 dark:text-slate-600' : 'text-slate-500'}`}>Only you and Admins.</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'public' })}
                                        className={`p-3.5 md:p-4 rounded-xl md:rounded-2xl border transition-all flex items-center gap-3 md:gap-4 text-left outline-none ${
                                            formData.visibility === 'public'
                                                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-md'
                                                : 'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${
                                            formData.visibility === 'public' ? 'bg-white/20 dark:bg-black/10 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                            <Globe weight="duotone" size={24} />
                                        </div>
                                        <div>
                                            <div className={`text-sm md:text-base font-bold mb-0.5 ${formData.visibility === 'public' ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>Public</div>
                                            <div className={`text-[10px] md:text-xs font-medium ${formData.visibility === 'public' ? 'text-white/70 dark:text-slate-600' : 'text-slate-500'}`}>Visible to students.</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {formStep === 2 && (
                        <motion.div
                            key="step2"
                            variants={formSectionVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="max-w-3xl mx-auto space-y-6 md:space-y-8"
                        >
                            <LayoutGroup>
                                {formData.positions.map((pos, pIdx) => (
                                    <motion.div 
                                        layout 
                                        key={pIdx}
                                        className="bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-[24px] p-4 md:p-6 shadow-sm relative group"
                                    >
                                        <div className="absolute top-4 md:top-6 right-4 md:right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => removePosition(pIdx)} className="p-1.5 md:p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors outline-none">
                                                <Trash weight="fill" size={18} />
                                            </button>
                                        </div>

                                        <div className="mb-5 md:mb-6 pr-10">
                                            <input
                                                type="text"
                                                placeholder="e.g., President"
                                                className="text-xl md:text-3xl font-black bg-transparent w-full outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 border-b border-slate-200 dark:border-slate-800 focus:border-slate-400 dark:focus:border-slate-600 pb-2 transition-colors"
                                                value={pos.title}
                                                onChange={e => updatePosition(pIdx, 'title', e.target.value)}
                                            />
                                        </div>

                                        {/* Target Audience Row */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 md:mb-8">
                                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit">
                                                <button
                                                    onClick={() => updatePosition(pIdx, 'targetType', 'school')}
                                                    className={`flex-1 sm:px-4 py-2 text-[11px] md:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 outline-none ${
                                                        pos.targetType === 'school' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                                                    }`}
                                                >
                                                    <Buildings weight="fill" size={14} /> School Wide
                                                </button>
                                                <button
                                                    onClick={() => updatePosition(pIdx, 'targetType', 'grade')}
                                                    className={`flex-1 sm:px-4 py-2 text-[11px] md:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 outline-none ${
                                                        pos.targetType === 'grade' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                                                    }`}
                                                >
                                                    <GraduationCap weight="fill" size={14} /> Specific Grade
                                                </button>
                                            </div>

                                            {pos.targetType === 'grade' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Grade</span>
                                                    <input
                                                        type="number"
                                                        className="w-16 md:w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm md:text-base font-bold text-center text-slate-900 dark:text-white outline-none focus:border-slate-400"
                                                        value={pos.targetGrade}
                                                        onChange={e => updatePosition(pIdx, 'targetGrade', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Candidates List */}
                                        <div className="space-y-2 md:space-y-3">
                                            <AnimatePresence initial={false}>
                                                {pos.candidates.map((cand, cIdx) => (
                                                    <motion.div
                                                        key={cand.id || cIdx}
                                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex items-center gap-2 md:gap-3"
                                                    >
                                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] md:text-xs font-black text-slate-400 shrink-0">
                                                            {cIdx + 1}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl px-4 py-3 md:py-3.5 text-sm md:text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
                                                            placeholder="Candidate Name"
                                                            value={cand.name}
                                                            onChange={e => updateCandidate(pIdx, cIdx, e.target.value)}
                                                        />
                                                        {pos.candidates.length > 1 && (
                                                            <button onClick={() => removeCandidate(pIdx, cIdx)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors outline-none shrink-0">
                                                                <X weight="bold" size={18} />
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            
                                            <button 
                                                onClick={() => addCandidate(pIdx)}
                                                className="mt-3 text-[11px] md:text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 w-full md:w-auto py-2 px-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors outline-none"
                                            >
                                                <Plus weight="bold" /> Add Candidate
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </LayoutGroup>

                            <motion.button
                                layout
                                onClick={handleAddPosition}
                                className="w-full py-4 md:py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-[24px] text-sm md:text-base font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-2 outline-none"
                            >
                                <Plus weight="bold" size={20} /> Add New Position
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* === BOTTOM ACTION BAR === */}
            <div className="flex-none px-4 py-4 md:px-8 md:py-6 border-t border-slate-200 dark:border-slate-800 bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl relative z-20 flex flex-col md:flex-row gap-3 md:gap-4 pb-safe-bottom">
                {formStep === 2 && (
                    <button
                        onClick={() => setFormStep(1)}
                        className="w-full md:w-auto px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 outline-none"
                    >
                        <CaretLeft weight="bold" /> Back
                    </button>
                )}
                <button
                    onClick={() => formStep === 1 ? (canProceed && setFormStep(2)) : onSubmit()}
                    disabled={formStep === 1 && !canProceed}
                    className={`flex-1 w-full px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-300 outline-none
                        ${formStep === 1 && !canProceed
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl active:scale-[0.98]'
                        }`}
                >
                    {formStep === 1 ? (
                        <>Continue to Ballot <CaretRight weight="bold" className="w-5 h-5" /></>
                    ) : (
                        editingId ? <>Save Changes <CheckCircle weight="fill" className="w-5 h-5" /></> : <>Create Election <CheckCircle weight="fill" className="w-5 h-5" /></>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default CreateElectionForm;