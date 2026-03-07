import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import CustomDateTimePicker from './CustomDateTimePicker';
import {
    X, Buildings, GraduationCap, CaretRight, CheckCircle,
    Plus, Trash, CalendarBlank, Users, ListNumbers,
    TextAa, IdentificationCard, LockKey, Eye
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
            className="flex flex-col h-full bg-white dark:bg-[#1e1f23] rounded-none lg:rounded-[28px] lg:border border-slate-200/50 dark:border-white/[0.06] shadow-xl overflow-hidden relative"
        >
            {/* === M3 TOP APP BAR === */}
            <div className="flex-none flex items-center justify-between px-4 py-4 md:px-6 md:py-5 relative z-20 border-b border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#1e1f23]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X weight="bold" className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                            {editingId ? 'Edit Ballot' : 'New Election'}
                        </h2>
                        {/* M3 Step indicator */}
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex gap-1">
                                <div className={`h-1 rounded-full transition-all duration-500 ${formStep >= 1 ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-white/10'}`} />
                                <div className={`h-1 rounded-full transition-all duration-500 ${formStep >= 2 ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-white/10'}`} />
                            </div>
                            <span className="text-[10px] md:text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Step {formStep}/2
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === SCROLLABLE CONTENT === */}
            <div className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8">
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
                                    <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block pl-1">Election Title</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-blue-600 transition-colors">
                                            <TextAa size={22} weight="duotone" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-4 py-4 text-xl md:text-2xl font-semibold bg-slate-50 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06] rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all"
                                            placeholder="e.g., Student Council 2025"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block pl-1">Organization</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                                            <IdentificationCard size={22} weight="duotone" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-4 py-4 text-lg font-medium bg-slate-50 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06] rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all"
                                            placeholder="Department / Organization"
                                            value={formData.organization}
                                            onChange={e => setFormData({ ...formData, organization: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. TARGET AUDIENCE */}
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Voter Eligibility</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, targetType: 'school' })}
                                        className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-[0.98]
                                            ${formData.targetType === 'school'
                                                ? 'bg-blue-600/5 border-blue-600 dark:bg-blue-600/10'
                                                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.targetType === 'school' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-white/[0.06] text-slate-400'}`}>
                                            <Buildings size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-semibold mb-0.5 ${formData.targetType === 'school' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>School Wide</span>
                                            <span className="text-sm text-slate-400 font-medium">All students in the campus can vote.</span>
                                        </div>
                                        {formData.targetType === 'school' && <div className="absolute top-4 right-4 text-blue-600"><CheckCircle weight="fill" size={22} /></div>}
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, targetType: 'grade' })}
                                        className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-[0.98]
                                            ${formData.targetType === 'grade'
                                                ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500'
                                                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.targetType === 'grade' ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-white/[0.06] text-slate-400'}`}>
                                            <GraduationCap size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-semibold mb-0.5 ${formData.targetType === 'grade' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Specific Grade</span>
                                            <span className="text-sm text-slate-400 font-medium">Limit voting to a single grade level.</span>
                                        </div>
                                        {formData.targetType === 'grade' && <div className="absolute top-4 right-4 text-indigo-500"><CheckCircle weight="fill" size={22} /></div>}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {formData.targetType === 'grade' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-2">
                                                <select
                                                    value={formData.targetGrade}
                                                    onChange={e => setFormData({ ...formData, targetGrade: e.target.value })}
                                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06] font-semibold text-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition-all"
                                                >
                                                    {[7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                </select>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* 3. VISIBILITY TOGGLE (NEW) */}
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Dashboard Visibility</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'private' })}
                                        className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-[0.98]
                                            ${formData.visibility === 'private'
                                                ? 'bg-rose-500/5 border-rose-500 dark:bg-rose-500/10'
                                                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.visibility === 'private' ? 'bg-rose-500 text-white' : 'bg-white dark:bg-white/[0.06] text-slate-400'}`}>
                                            <LockKey size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-semibold mb-0.5 ${formData.visibility === 'private' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Private (Just Me)</span>
                                            <span className="text-sm text-slate-400 font-medium">Only you and Admins can see this.</span>
                                        </div>
                                        {formData.visibility === 'private' && <div className="absolute top-4 right-4 text-rose-500"><CheckCircle weight="fill" size={22} /></div>}
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, visibility: 'public' })}
                                        className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-[0.98]
                                            ${formData.visibility === 'public'
                                                ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500'
                                                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.visibility === 'public' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-white/[0.06] text-slate-400'}`}>
                                            <Eye size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-semibold mb-0.5 ${formData.visibility === 'public' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Public to Teachers</span>
                                            <span className="text-sm text-slate-400 font-medium">Allow other teachers to view results.</span>
                                        </div>
                                        {formData.visibility === 'public' && <div className="absolute top-4 right-4 text-emerald-500"><CheckCircle weight="fill" size={22} /></div>}
                                    </button>
                                </div>
                            </div>

                            {/* 4. DATES */}
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Event Duration</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-[20px] border border-slate-200/50 dark:border-white/[0.06] group focus-within:border-emerald-500 transition-all">
                                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 group-focus-within:text-emerald-500 transition-colors uppercase tracking-wider">
                                            <CalendarBlank className="w-4 h-4 text-emerald-500" weight="fill" /> Starts
                                        </label>
                                        <CustomDateTimePicker
                                            value={formData.startDate}
                                            onChange={val => setFormData({ ...formData, startDate: val })}
                                        />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-[20px] border border-slate-200/50 dark:border-white/[0.06] group focus-within:border-rose-500 transition-all">
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
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Ballot Configuration</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Define positions and add candidates.</p>
                            </div>

                            <LayoutGroup>
                                <AnimatePresence>
                                    {formData.positions.map((pos, pIdx) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                            key={pos.id}
                                            className="bg-white dark:bg-white/[0.03] rounded-[20px] p-5 md:p-6 border border-slate-200/50 dark:border-white/[0.06] relative group overflow-hidden"
                                        >
                                            {/* M3 Accent stripe */}
                                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 dark:bg-white/10 group-hover:bg-blue-600 transition-colors rounded-l-[20px]" />

                                            <div className="flex justify-between items-start mb-5 pl-3">
                                                <div className="flex-1 mr-4">
                                                    <label className="text-[10px] md:text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">Position Title</label>
                                                    <input
                                                        type="text" placeholder="e.g., President"
                                                        className="text-xl md:text-2xl font-semibold bg-transparent w-full outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                        value={pos.title}
                                                        onChange={e => updatePosition(pIdx, 'title', e.target.value)}
                                                        autoFocus={pIdx === formData.positions.length - 1}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removePosition(pIdx)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash weight="bold" size={18} />
                                                </button>
                                            </div>

                                            <div className="space-y-3 pl-3">
                                                {pos.candidates.map((cand, cIdx) => (
                                                    <motion.div
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                        key={cand.id}
                                                        className="flex items-center gap-3 group/cand"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-white/[0.06]">
                                                            {cand.name ? cand.name.charAt(0).toUpperCase() : <Users weight="fill" size={16} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <input
                                                                type="text" placeholder={`Candidate ${cIdx + 1}`}
                                                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06] focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none font-medium text-base text-slate-900 dark:text-white transition-all"
                                                                value={cand.name}
                                                                onChange={e => updateCandidate(pIdx, cIdx, e.target.value)}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => removeCandidate(pIdx, cIdx)}
                                                            className="p-2.5 text-slate-300 hover:text-rose-500 md:opacity-0 group-hover/cand:opacity-100 transition-all rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                        >
                                                            <X weight="bold" size={16} />
                                                        </button>
                                                    </motion.div>
                                                ))}

                                                <button
                                                    onClick={() => addCandidate(pIdx)}
                                                    className="mt-3 text-sm font-semibold text-blue-600 flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600/10 hover:bg-blue-600/20 transition-colors w-full md:w-auto justify-center md:justify-start active:scale-[0.98]"
                                                >
                                                    <Plus weight="bold" size={16} /> Add Candidate
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </LayoutGroup>

                            {/* Add Position */}
                            <motion.button
                                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                onClick={handleAddPosition}
                                className="w-full py-6 rounded-[20px] border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-400 hover:border-blue-600 hover:text-blue-600 font-semibold transition-all flex flex-col items-center justify-center gap-2 group bg-slate-50/30 dark:bg-white/[0.02]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-white/[0.06] border border-slate-200/50 dark:border-white/[0.06] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-transparent transition-colors">
                                    <ListNumbers weight="bold" size={24} />
                                </div>
                                <span className="text-sm">Add New Position</span>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* === M3 FOOTER ACTIONS === */}
            <div className="flex-none p-4 md:p-5 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#1e1f23] z-20 flex gap-3">
                {formStep > 1 && (
                    <button
                        onClick={() => setFormStep(1)}
                        className="px-6 py-3.5 rounded-full font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/50 dark:border-white/[0.06] transition-colors active:scale-[0.98]"
                    >
                        Back
                    </button>
                )}
                <button
                    onClick={() => formStep === 1 ? (canProceed && setFormStep(2)) : onSubmit()}
                    disabled={formStep === 1 && !canProceed}
                    className={`flex-1 px-6 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                        ${formStep === 1 && !canProceed
                            ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:shadow-lg text-white shadow-md'
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
    )
}

export default CreateElectionForm;