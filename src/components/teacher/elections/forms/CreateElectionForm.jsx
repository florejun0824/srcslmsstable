import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
    X, Buildings, GraduationCap, CaretRight, CheckCircle, 
    Plus, Trash, CalendarBlank, Users, ListNumbers,
    TextAa, IdentificationCard
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
    
    // Helper to check validity for step 1
    const canProceed = formData.title && formData.startDate && formData.endDate;

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden" animate="visible" exit="exit"
            // FIX: Added 'rounded-[1.5rem]' for mobile, kept 'md:rounded-[2.5rem]' for desktop
            className="flex flex-col h-full bg-white dark:bg-[#0f1012] rounded-[1.5rem] md:rounded-[2.5rem] md:border border-slate-200/50 dark:border-white/10 shadow-2xl overflow-hidden relative"
        >
            {/* --- DECORATIVE BACKGROUND --- */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-50/50 dark:from-blue-900/10 to-transparent pointer-events-none z-0" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* --- HEADER --- */}
            <div className="flex-none flex items-center justify-between px-5 py-5 md:px-6 md:py-6 relative z-20 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#0f1012]/80 backdrop-blur-xl">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        {editingId ? 'Edit Ballot' : 'New Election'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${formStep >= 1 ? 'w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${formStep >= 2 ? 'w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                        <span className="ml-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">
                            Step {formStep} of 2
                        </span>
                    </div>
                </div>
                <button 
                    onClick={onCancel} 
                    className="w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-red-500 transition-colors"
                >
                    <X weight="bold" className="w-5 h-5" />
                </button>
            </div>

            {/* --- SCROLLABLE CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-5 md:p-8">
                <AnimatePresence mode="wait">
                    {formStep === 1 && (
                        <motion.div 
                            key="step1"
                            variants={formSectionVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="space-y-8 max-w-3xl mx-auto pb-6"
                        >
                            {/* 1. TITLE & ORG (Headline Style - Larger Font on Mobile) */}
                            <div className="space-y-6">
                                <div className="group relative">
                                    <div className="absolute left-0 top-3 text-slate-300 dark:text-slate-600 group-focus-within:text-blue-500 transition-colors">
                                        <TextAa size={28} weight="duotone" />
                                    </div>
                                    <input 
                                        type="text" 
                                        // FIX: Increased font size for mobile text-3xl
                                        className="w-full pl-10 pb-2 text-3xl md:text-4xl font-black bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-700 transition-colors" 
                                        placeholder="Election Title" 
                                        value={formData.title} 
                                        onChange={e => setFormData({...formData, title: e.target.value})} 
                                        autoFocus
                                    />
                                </div>
                                <div className="group relative">
                                    <div className="absolute left-0 top-3 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                                        <IdentificationCard size={24} weight="duotone" />
                                    </div>
                                    <input 
                                        type="text" 
                                        // FIX: Increased font size for mobile text-xl
                                        className="w-full pl-10 pb-2 text-xl md:text-2xl font-bold bg-transparent border-b border-slate-100 dark:border-slate-800 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-200 dark:placeholder:text-slate-700 transition-colors" 
                                        placeholder="Organization / Department" 
                                        value={formData.organization} 
                                        onChange={e => setFormData({...formData, organization: e.target.value})} 
                                    />
                                </div>
                            </div>
                            
                            {/* 2. TARGET AUDIENCE (Visual Cards) */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Voter Eligibility</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setFormData({...formData, targetType: 'school'})} 
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-95
                                            ${formData.targetType === 'school' 
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500 shadow-lg shadow-blue-500/10' 
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.targetType === 'school' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>
                                            <Buildings size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-black mb-1 ${formData.targetType === 'school' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>School Wide</span>
                                            <span className="text-sm text-slate-400 font-medium">All students in the campus can vote.</span>
                                        </div>
                                        {formData.targetType === 'school' && <div className="absolute top-4 right-4 text-blue-500"><CheckCircle weight="fill" size={20} /></div>}
                                    </button>

                                    <button 
                                        onClick={() => setFormData({...formData, targetType: 'grade'})} 
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-start gap-4 overflow-hidden active:scale-95
                                            ${formData.targetType === 'grade' 
                                                ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-500 shadow-lg shadow-purple-500/10' 
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${formData.targetType === 'grade' ? 'bg-purple-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>
                                            <GraduationCap size={24} weight="duotone" />
                                        </div>
                                        <div>
                                            <span className={`block text-base font-black mb-1 ${formData.targetType === 'grade' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Specific Grade</span>
                                            <span className="text-sm text-slate-400 font-medium">Limit voting to a single grade level.</span>
                                        </div>
                                        {formData.targetType === 'grade' && <div className="absolute top-4 right-4 text-purple-500"><CheckCircle weight="fill" size={20} /></div>}
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
                                                    onChange={e => setFormData({...formData, targetGrade: e.target.value})} 
                                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer appearance-none"
                                                >
                                                    {[7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                </select>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* 3. DATES (Widgets) */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Event Duration</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-green-400/50 transition-colors group focus-within:border-green-500">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 group-focus-within:text-green-500 transition-colors">
                                            <CalendarBlank className="w-4 h-4 text-green-500" weight="fill" /> STARTS
                                        </label>
                                        <input 
                                            type="datetime-local" 
                                            // FIX: Larger font size for date input on mobile
                                            className="bg-transparent font-mono text-base md:text-sm font-bold w-full outline-none text-slate-900 dark:text-white"
                                            value={formData.startDate} 
                                            onChange={e => setFormData({...formData, startDate: e.target.value})} 
                                        />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-red-400/50 transition-colors group focus-within:border-red-500">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 group-focus-within:text-red-500 transition-colors">
                                            <CalendarBlank className="w-4 h-4 text-red-500" weight="fill" /> ENDS
                                        </label>
                                        <input 
                                            type="datetime-local" 
                                            // FIX: Larger font size for date input on mobile
                                            className="bg-transparent font-mono text-base md:text-sm font-bold w-full outline-none text-slate-900 dark:text-white"
                                            value={formData.endDate} 
                                            onChange={e => setFormData({...formData, endDate: e.target.value})} 
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
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Ballot Configuration</h3>
                                <p className="text-slate-500 text-sm">Define positions and add candidates.</p>
                            </div>

                            <LayoutGroup>
                                <AnimatePresence>
                                    {formData.positions.map((pos, pIdx) => (
                                        <motion.div 
                                            layout
                                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                            key={pos.id} 
                                            className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                                            
                                            <div className="flex justify-between items-start mb-6 pl-4">
                                                <div className="flex-1 mr-4">
                                                    <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Position Title</label>
                                                    <input 
                                                        type="text" placeholder="e.g., President" 
                                                        className="text-xl md:text-2xl font-black bg-transparent w-full outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700" 
                                                        value={pos.title} 
                                                        onChange={e => updatePosition(pIdx, 'title', e.target.value)} 
                                                        autoFocus={pIdx === formData.positions.length - 1}
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => removePosition(pIdx)} 
                                                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash weight="bold" size={18} />
                                                </button>
                                            </div>

                                            <div className="space-y-3 pl-4">
                                                {pos.candidates.map((cand, cIdx) => (
                                                    <motion.div 
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                        key={cand.id} 
                                                        className="flex items-center gap-3 group/cand"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shadow-inner">
                                                            {cand.name ? cand.name.charAt(0).toUpperCase() : <Users weight="fill" />}
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <input 
                                                                type="text" placeholder={`Candidate ${cIdx + 1}`} 
                                                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-black outline-none font-bold text-base text-slate-900 dark:text-white transition-all"
                                                                value={cand.name} 
                                                                onChange={e => updateCandidate(pIdx, cIdx, e.target.value)} 
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => removeCandidate(pIdx, cIdx)} 
                                                            className="p-3 text-slate-300 hover:text-red-500 md:opacity-0 group-hover/cand:opacity-100 transition-opacity"
                                                        >
                                                            <X weight="bold" size={16} />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                                
                                                <motion.button 
                                                    layout
                                                    onClick={() => addCandidate(pIdx)} 
                                                    className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 transition-colors w-full md:w-auto"
                                                >
                                                    <Plus weight="bold" /> Add Candidate
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </LayoutGroup>

                            <motion.button 
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={handleAddPosition} 
                                className="w-full py-6 rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-500 font-bold transition-all flex flex-col items-center justify-center gap-2 group bg-slate-50/50 dark:bg-slate-900/50"
                            >
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <ListNumbers weight="bold" size={24} />
                                </div>
                                <span className="text-sm">Add New Position</span>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- FOOTER ACTIONS --- */}
            <div className="flex-none p-5 md:p-6 border-t border-slate-100 dark:border-white/5 bg-white/90 dark:bg-[#0f1012]/90 backdrop-blur-md z-20 flex gap-4">
                {formStep > 1 && (
                    <button 
                        onClick={() => setFormStep(1)} 
                        className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Back
                    </button>
                )}
                <button 
                    onClick={() => formStep === 1 ? (canProceed && setFormStep(2)) : onSubmit()} 
                    disabled={formStep === 1 && !canProceed}
                    className={`flex-1 px-6 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95
                        ${formStep === 1 && !canProceed 
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                >
                    {formStep === 1 ? (
                        <>Configure Ballot <CaretRight weight="bold" /></>
                    ) : (
                        editingId ? <>Save Changes <CheckCircle weight="fill"/></> : <>Launch Election <CheckCircle weight="fill"/></>
                    )}
                </button>
            </div>
        </motion.div>
    )
}

export default CreateElectionForm;