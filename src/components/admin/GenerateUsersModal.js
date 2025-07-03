// src/components/admin/GenerateUsersModal.js

import React, { useState } from 'react';
import { Users, X } from 'lucide-react';

const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const GenerateUsersModal = ({ onSubmit, onClose }) => {
    const [activeTab, setActiveTab] = useState('list'); 
    const [quantity, setQuantity] = useState(10);
    const [names, setNames] = useState('');
    const [role, setRole] = useState('student');
    // --- NEW --- State for selected grade level
    const [gradeLevel, setGradeLevel] = useState(gradeLevels[0]);
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

        // Pass data based on the active tab, include gradeLevel if role is student
        const submissionData = activeTab === 'list' 
            ? { names, role } 
            : { quantity: parseInt(quantity, 10), role };
        
        if (role === 'student') {
            submissionData.gradeLevel = gradeLevel;
        }
            
        onSubmit(submissionData);
    };

    const renderTabs = () => (
        <div className="flex border-b mb-4">
            <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`py-2 px-4 font-semibold ${activeTab === 'list' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
                Generate from Name List
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('quantity')}
                className={`py-2 px-4 font-semibold ${activeTab === 'quantity' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
                Generate by Quantity
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <Users className="mr-3 text-green-600" /> Generate Multiple Users
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                {renderTabs()}

                <form onSubmit={handleSubmit}>
                    {/* ... (textarea and quantity inputs remain the same) ... */}
                    {activeTab === 'list' && (
                        <div>
                            <label htmlFor="names" className="block text-sm font-medium text-gray-700 mb-1">
                                Paste Names (one per line)
                            </label>
                            <textarea
                                id="names"
                                value={names}
                                onChange={(e) => setNames(e.target.value)}
                                placeholder="Juan Dela Cruz&#10;Maria Clara"
                                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                    )}

                    {activeTab === 'quantity' && (
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                                Number of Accounts to Generate
                            </label>
                            <input
                                type="number"
                                id="quantity"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="1"
                                max="100"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                Assign Role
                            </label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        
                        {/* --- NEW: Conditional Grade Level Dropdown --- */}
                        {role === 'student' && (
                            <div>
                                <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-1">
                                    Grade Level
                                </label>
                                <select
                                    id="gradeLevel"
                                    value={gradeLevel}
                                    onChange={(e) => setGradeLevel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {gradeLevels.map(gl => <option key={gl} value={gl}>{gl}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Generate Accounts</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GenerateUsersModal;