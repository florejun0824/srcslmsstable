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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex justify-center items-center z-50 p-4 animate-modal-fade-in">
            <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-lg transform transition-all duration-300 animate-modal-pop-in">
                
                <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Generate Users
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        {/* iOS-style Segmented Control for tabs */}
                        <div className="p-1 bg-slate-200/70 rounded-full flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('list')}
                                className={`flex-1 py-2 px-3 font-semibold text-sm rounded-full transition-all duration-300 ${activeTab === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'}`}
                            >
                                From Name List
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('quantity')}
                                className={`flex-1 py-2 px-3 font-semibold text-sm rounded-full transition-all duration-300 ${activeTab === 'quantity' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'}`}
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
                                            <label htmlFor="names" className="block text-sm font-medium text-slate-700 mb-2">Paste Names (one per line)</label>
                                            <textarea
                                                id="names" value={names} onChange={(e) => setNames(e.target.value)}
                                                placeholder="Juan Dela Cruz&#10;Maria Clara"
                                                className="w-full h-36 p-4 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-2">Number of Accounts</label>
                                            <input
                                                type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                                                min="1" max="100"
                                                className="w-full p-4 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            </CSSTransition>
                        </SwitchTransition>
                        
                        {/* Inset Grouped List for Options */}
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700 mb-2 px-1">Options</label>
                            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
                                <div className="flex justify-between items-center p-4">
                                    <label htmlFor="role" className="font-semibold text-slate-800">Assign Role</label>
                                    <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="bg-slate-100 border border-slate-300 rounded-lg p-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                
                                {role === 'student' && (
                                    <div className="flex justify-between items-center p-4">
                                        <label htmlFor="gradeLevel" className="font-semibold text-slate-800">Grade Level</label>
                                        <select id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="bg-slate-100 border border-slate-300 rounded-lg p-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                            {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && <p className="text-center text-red-600 text-sm font-medium pt-2">{error}</p>}
                    </div>
                    
                    {/* Full-Width Action Button */}
                    <div className="p-6 bg-slate-100/70 border-t border-slate-200 rounded-b-3xl">
                        <button type="submit" className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]">
                            Generate Accounts
                        </button>
                    </div>
                </form>
            </div>
            
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