import React, { useState, useEffect } from 'react';
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import { motion, AnimatePresence } from 'framer-motion';

const EditProfileModal = ({ isOpen, onClose, userProfile, onUpdate }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userProfile && isOpen) {
            setFirstName(userProfile.firstName || '');
            setLastName(userProfile.lastName || '');
            setPhotoURL(userProfile.photoURL || '');
        }
    }, [userProfile, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            // This should be handled by a toast in the parent, but keeping alert as a fallback.
            alert("First and last names cannot be empty.");
            return;
        }
        setLoading(true);
        await onUpdate({ firstName, lastName, photoURL });
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                        className="relative w-full max-w-md bg-neumorphic-base shadow-neumorphic rounded-3xl"
                    >
                        <button 
                            onClick={onClose} 
                            className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5 text-slate-600" />
                        </button>

                        <form onSubmit={handleSubmit}>
                            <div className="py-8 px-6 text-center border-b border-neumorphic-shadow-dark/20">
                                <div className="relative w-28 h-28 mx-auto mb-4 rounded-full p-1 bg-neumorphic-base shadow-neumorphic-inset">
                                    {photoURL ? (
                                        <img src={photoURL} alt="Profile Preview" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <UserInitialsAvatar
                                            firstName={firstName}
                                            lastName={lastName}
                                            size="full"
                                        />
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 leading-tight">Edit Profile</h2>
                                <p className="text-sm text-slate-600 mt-1">Update your personal information.</p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="bg-neumorphic-base rounded-xl shadow-neumorphic-inset divide-y divide-neumorphic-shadow-dark/20 p-1">
                                    <div className="flex divide-x divide-neumorphic-shadow-dark/20">
                                        <div className="flex-1 p-3.5">
                                            <label htmlFor="firstName" className="block text-xs font-medium text-slate-500 mb-1">First Name</label>
                                            <input
                                                type="text"
                                                id="firstName"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none"
                                                placeholder="e.g., John"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 p-3.5">
                                            <label htmlFor="lastName" className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
                                            <input
                                                type="text"
                                                id="lastName"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none"
                                                placeholder="e.g., Doe"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3.5">
                                        <label htmlFor="photoURL" className="block text-xs font-medium text-slate-500 mb-1">Profile Photo URL (Optional)</label>
                                        <input
                                            type="url"
                                            id="photoURL"
                                            value={photoURL}
                                            onChange={(e) => setPhotoURL(e.target.value)}
                                            className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none"
                                            placeholder="https://example.com/photo.jpg"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 pt-0">
                                <button 
                                    type="submit" 
                                    className="w-full px-6 py-3.5 font-semibold rounded-xl transition-shadow flex items-center justify-center gap-2 bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-60" 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Saving Changes...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PencilSquareIcon className="w-5 h-5" />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EditProfileModal;