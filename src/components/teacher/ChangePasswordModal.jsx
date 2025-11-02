import React, { useState } from 'react';
import { KeyIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ChangePasswordModal = ({ isOpen, onClose, onSubmit }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setLoading(true);
        await onSubmit(newPassword);
        setLoading(false);
    };

    return (
        // Modal Backdrop - Dark mode backdrop added
        <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-black dark:bg-opacity-80 flex justify-center items-center z-50">
            {/* Modal Content Card */}
            <div 
                // MODIFIED: Dark mode neumorphic background and shadow
                className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-lg p-6 w-full max-w-md m-4"
            >
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                    {/* MODIFIED: Dark mode text and icon color */}
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <KeyIcon className="w-7 h-7 mr-3 text-purple-600 dark:text-purple-400" />
                        Change Password
                    </h2>
                    {/* MODIFIED: Dark mode close button icon color */}
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        {/* New Password Field */}
                        <div>
                            {/* MODIFIED: Dark mode label text */}
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                // MODIFIED: Dark mode neumorphic inset input styles
                                className="w-full px-4 py-3 text-base rounded-xl shadow-neumorphic-inset 
                                bg-neumorphic-base text-slate-900 placeholder-slate-400 
                                dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-slate-100 dark:placeholder-slate-500 
                                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>
                        
                        {/* Confirm Password Field */}
                        <div>
                            {/* MODIFIED: Dark mode label text */}
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                // MODIFIED: Dark mode neumorphic inset input styles
                                className="w-full px-4 py-3 text-base rounded-xl shadow-neumorphic-inset 
                                bg-neumorphic-base text-slate-900 placeholder-slate-400 
                                dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-slate-100 dark:placeholder-slate-500 
                                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                        {/* Cancel Button */}
                        <button 
                            type="button" 
                            onClick={onClose} 
                            // MODIFIED: Dark mode neumorphic button styles
                            className="inline-flex justify-center rounded-xl py-3 px-6 text-base font-medium 
                            text-slate-700 bg-neumorphic-base shadow-neumorphic transition-shadow duration-300
                            dark:text-slate-300 dark:bg-neumorphic-base-dark dark:shadow-lg
                            hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                        >
                            Cancel
                        </button>
                        
                        {/* Update Button */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            // MODIFIED: Dark mode primary button styles
                            className="inline-flex justify-center rounded-xl py-3 px-6 text-base font-medium text-white 
                            bg-purple-600 shadow-lg hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed
                            dark:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;