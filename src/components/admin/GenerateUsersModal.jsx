import React, { useState } from 'react';
import { Users, X, ChevronDown } from 'lucide-react'; // ChevronDown can be used for select dropdowns
import { CSSTransition, SwitchTransition } from 'react-transition-group';

const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const GenerateUsersModal = ({ onSubmit, onClose }) => {
    // All state and logic are preserved from the original component.
    const [activeTab, setActiveTab] = useState('list'); 
    const [quantity, setQuantity] = useState(10);
    const [names, setNames] = useState('');
    const [role, setRole] = useState('student');
    const [gradeLevel, setGradeLevel] = useState(gradeLevels[0]);
    const [error, setError] = useState('');

    // The handleSubmit logic is completely unchanged.
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
            ? { names, role } 
            : { quantity: parseInt(quantity, 10), role };
        if (role === 'student') {
            submissionData.gradeLevel = gradeLevel;
        }
        onSubmit(submissionData);
    };

    return (
        // Backdrop (no changes needed, blur and dark bg work for both)
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex justify-center items-center z-50 p-4 animate-modal-fade-in">
            
            {/* --- MODIFIED: Added dark mode classes for main panel --- */}
            <div className="bg-slate-50 dark:bg-slate-900 dark:border dark:border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-lg transform transition-all duration-300 animate-modal-pop-in">
                
                {/* --- MODIFIED: Header border and text --- */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Generate Users
                    </h2>
                    {/* --- MODIFIED: Close button hover/text --- */}
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        {/* --- MODIFIED: Segmented control background --- */}
                        <div className="p-1 bg-slate-200/70 dark:bg-slate-800 rounded-full flex items-center gap-1">
                            {/* --- MODIFIED: Active/Inactive tab colors --- */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('list')}
                                className={`flex-1 py-2 px-3 font-semibold text-sm rounded-full transition-all duration-300 ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                From Name List
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('quantity')}
                                className={`flex-1 py-2 px-3 font-semibold text-sm rounded-full transition-all duration-300 ${activeTab === 'quantity' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                By Quantity
                            </button>
                        </div>

                        {/* Animated container for the main input area */}
                        <SwitchTransition mode="out-in">
                            <CSSTransition key={activeTab} addEndListener={(node, done) => node.addEventListener("transitionend", done, false)} classNames="fade">
                                <div>
                                    {activeTab === 'list' ? (
                                        <div>
                                            {/* --- MODIFIED: Label text --- */}
                                            <label htmlFor="names" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Paste Names (one per line)</label>
                                            {/* --- MODIFIED: Textarea bg/border/placeholder --- */}
                                            <textarea
                                                id="names" value={names} onChange={(e) => setNames(e.target.value)}
                                                placeholder="Juan Dela Cruz&#10;Maria Clara"
                                                className="w-full h-36 p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:placeholder-slate-500"
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            {/* --- MODIFIED: Label text --- */}
                                            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Number of Accounts</label>
                                            {/* --- MODIFIED: Input bg/border --- */}
                                            <input
                                                type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                                                min="1" max="100"
                                                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            </CSSTransition>
                        </SwitchTransition>
                        
                        {/* Inset Grouped List for Options */}
                        <div className="space-y-1">
                            {/* --- MODIFIED: Label text --- */}
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 px-1">Options</label>
                            {/* --- MODIFIED: Group bg/border/divide --- */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                                <div className="flex justify-between items-center p-4">
                                    {/* --- MODIFIED: Label text --- */}
                                    <label htmlFor="role" className="font-semibold text-slate-800 dark:text-slate-100">Assign Role</label>
                                    {/* --- MODIFIED: Select bg/border/text --- */}
                                    <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                
                                {role === 'student' && (
                                    <div className="flex justify-between items-center p-4">
                                        {/* --- MODIFIED: Label text --- */}
                                        <label htmlFor="gradeLevel" className="font-semibold text-slate-800 dark:text-slate-100">Grade Level</label>
                                        {/* --- MODIFIED: Select bg/border/text --- */}
                                        <select id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                            {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- MODIFIED: Error text --- */}
                        {error && <p className="text-center text-red-600 dark:text-red-400 text-sm font-medium pt-2">{error}</p>}
                    </div>
                    
                    {/* --- MODIFIED: Footer bg/border --- */}
                    <div className="p-6 bg-slate-100/70 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-3xl">
                        {/* --- (Button color is fine for both modes) --- */}
                        <button type="submit" className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]">
                            Generate Accounts
                        </button>
                    </div>
                </form>
            </div>
            
            {/* --- (Styles are for animation, no dark mode needed) --- */}
            <style>{`
                .fade-enter { opacity: 0; transform: translateY(10px); }
                .fade-enter-active { opacity: 1; transform: translateY(0); transition: opacity 200ms, transform 200ms; }
                .fade-exit { opacity: 1; transform: translateY(0); }
                .fade-exit-active { opacity: 0; transform: translateY(-10px); transition: opacity 200ms, transform 200ms; }
                
                @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalPopIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-modal-fade-in { animation: modalFadeIn 0.3s ease-out forwards; }
                .animate-modal-pop-in { animation: modalPopIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default GenerateUsersModal;