import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import CustomDateTimePicker from './CustomDateTimePicker';
import {
    X, Buildings, GraduationCap, CaretRight, CheckCircle,
    Plus, Trash, CalendarBlank, Users, ListNumbers,
    TextAa, IdentificationCard, LockKey, Eye, Globe
} from '@phosphor-icons/react';

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", duration: 0.5, bounce: 0.3 }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const formSectionVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
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
            className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-none lg:rounded-2xl lg:border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative"
        >
            {/* === TOP APP BAR === */}
            <div className="flex-none flex items-center justify-between px-4 py-4 md:px-6 md:py-5 relative z-20 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X weight="bold" className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {editingId ? 'Edit Ballot' : 'New Election'}
                        </h2>
                        <div className="flex items-center gap-3 mt-1.5">
                            {/* Animated progress bar */}
                            <div className="flex gap-1.5 items-center">
                                <div className="relative w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="absolute left-0 top-0 h-full bg-indigo-600 rounded-full"
                                        initial={false}
                                        animate={{ width: formStep >= 1 ? (formStep >= 2 ? '100%' : '50%') : '0%' }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Step {formStep}/2
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === SCROLLABLE CONTENT === */}
            <div className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8 bg-slate-50/50 dark:bg-slate-950/50">
                <AnimatePresence mode="wait">
                    {formStep === 1 && (
                        <motion.div
                            key="step1"
                            variants={formSectionVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="space-y-8 max-w-3xl mx-auto pb-6"
                        >
                            {/* 1. TITLE & ORG */}
                            <div className="space-y-5">
                                <div className="group">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block pl-1">Election Title</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-600 transition-colors">
                                            <TextAa size={22} weight="duotone" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-4 py-4 text-xl md:text-2xl font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all"
                                            placeholder="e.g., Student Council 2025"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block pl-1">Organization</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-violet-500 transition-colors">
                                            <IdentificationCard size={22} weight="duotone" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-4 py-4 text-lg font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all"
                                            placeholder="Department / Organization"
                                            value={formData.organization}
                                            onChange={e => setFormData({ ...formData, organization: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. VISIBILITY TOGGLE */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Dashboard Visibility</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'private' })}
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-[0.98]
                                            ${formData.visibility === 'private'
                                                ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-500'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.visibility === 'private' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            <LockKey size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-semibold mb-0.5 ${formData.visibility === 'private' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Private</span>
                                            <span className="text-sm text-slate-400 font-medium">Only you and Admins.</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'public' })}
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-[0.98]
                                            ${formData.visibility === 'public'
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.visibility === 'public' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            <Eye size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-semibold mb-0.5 ${formData.visibility === 'public' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Public</span>
                                            <span className="text-sm text-slate-400 font-medium">Other teachers can see results.</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* 3. DATES */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Event Duration</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 group focus-within:border-emerald-500 transition-all">
                                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 group-focus-within:text-emerald-600 transition-colors uppercase tracking-wider">
                                            <CalendarBlank className="w-4 h-4 text-emerald-500" weight="fill" /> Starts
                                        </label>
                                        <CustomDateTimePicker
                                            value={formData.startDate}
                                            onChange={val => setFormData({ ...formData, startDate: val })}
                                        />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 group focus-within:border-rose-500 transition-all">
                                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 group-focus-within:text-rose-500 transition-colors uppercase tracking-wider">
                                            <CalendarBlank className="w-4 h-4 text-rose-500" weight="fill" /> Ends
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
                            className="space-y-6 max-w-3xl mx-auto pb-6"
                        >
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ballot Configuration</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Assign voters per position and add candidates.</p>
                            </div>

                            <LayoutGroup>
                                <AnimatePresence>
                                    {formData.positions.map((pos, pIdx) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                            key={pos.id}
                                            className="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-slate-700 relative group overflow-hidden"
                                        >
                                            {/* Position Header & Delete */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex-1 mr-4">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Position Title</label>
                                                    <input
                                                        type="text" placeholder="e.g., President"
                                                        className="text-xl md:text-2xl font-bold bg-transparent w-full outline-none text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-white/10"
                                                        value={pos.title}
                                                        onChange={e => updatePosition(pIdx, 'title', e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removePosition(pIdx)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                                >
                                                    <Trash weight="bold" size={18} />
                                                </button>
                                            </div>

                                            {/* --- POSITION AUDIENCE TARGETING --- */}
                                            <div className="mb-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block">Who can vote for this position?</label>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => updatePosition(pIdx, 'targetType', 'school')}
                                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
                                                            pos.targetType === 'school' || !pos.targetType 
                                                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                                        }`}
                                                    >
                                                        <Globe weight="fill" /> Entire School
                                                    </button>
                                                    <button
                                                        onClick={() => updatePosition(pIdx, 'targetType', 'grade')}
                                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
                                                            pos.targetType === 'grade' 
                                                            ? 'bg-violet-600 border-violet-600 text-white' 
                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                                        }`}
                                                    >
                                                        <GraduationCap weight="fill" /> Specific Grade
                                                    </button>
                                                    
                                                    {pos.targetType === 'grade' && (
                                                        <select
                                                            value={pos.targetGrade || 7}
                                                            onChange={e => updatePosition(pIdx, 'targetGrade', e.target.value)}
                                                            className="ml-auto bg-white dark:bg-slate-800 border border-violet-300 dark:border-violet-600/30 rounded-lg px-3 py-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 outline-none"
                                                        >
                                                            {[7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Candidates List */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block pl-1">Candidates</label>
                                                {pos.candidates.map((cand, cIdx) => (
                                                    <div key={cand.id} className="flex items-center gap-3 group/cand">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="text" placeholder={`Candidate name...`}
                                                                className="w-full pl-4 pr-10 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-slate-900 dark:text-white transition-all"
                                                                value={cand.name}
                                                                onChange={e => updateCandidate(pIdx, cIdx, e.target.value)}
                                                            />
                                                            <button
                                                                onClick={() => removeCandidate(pIdx, cIdx)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-rose-500 transition-colors"
                                                            >
                                                                <X weight="bold" size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => addCandidate(pIdx)}
                                                    className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                                                >
                                                    <Plus weight="bold" size={14} /> Add Candidate
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </LayoutGroup>

                            <button
                                onClick={handleAddPosition}
                                className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-2 group bg-white dark:bg-slate-800/50"
                            >
                                <ListNumbers weight="bold" size={28} />
                                <span className="font-bold text-sm">Add New Position</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* === FOOTER ACTIONS === */}
            <div className="flex-none p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 flex gap-3">
                {formStep > 1 && (
                    <button
                        onClick={() => setFormStep(1)}
                        className="px-8 py-4 rounded-full font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all"
                    >
                        Back
                    </button>
                )}
                <button
                    onClick={() => formStep === 1 ? (canProceed && setFormStep(2)) : onSubmit()}
                    disabled={formStep === 1 && !canProceed}
                    className={`flex-1 px-8 py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${formStep === 1 && !canProceed
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                        }`}
                >
                    {formStep === 1 ? (
                        <>Configure Ballot <CaretRight weight="bold" /></>
                    ) : (
                        editingId ? <>Save Changes <CheckCircle weight="fill" /></> : <>Launch Election <CheckCircle weight="fill" /></>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

export default CreateElectionForm;