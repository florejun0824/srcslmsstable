import React, { useState, useEffect } from 'react';
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import UserInitialsAvatar from '../common/UserInitialsAvatar'; // Assuming this path is correct

const EditProfileModal = ({ isOpen, onClose, userProfile, onUpdate }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setFirstName(userProfile.firstName || '');
            setLastName(userProfile.lastName || '');
            setPhotoURL(userProfile.photoURL || '');
        }
    }, [userProfile, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            // Basic validation to prevent empty names
            // You might want to use your useToast hook here if available
            alert("First and last names cannot be empty.");
            return;
        }
        setLoading(true);
        await onUpdate({ firstName, lastName, photoURL });
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white/90 border border-slate-300 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300">
                
                {/* --- Modal Header --- */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                        <PencilSquareIcon className="w-6 h-6 text-blue-600" />
                        Edit Your Profile
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* --- Modal Body --- */}
                <div className="p-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        {/* --- Larger Profile Avatar --- */}
                        <div className="relative w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-white">
                            {photoURL ? (
                                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <UserInitialsAvatar
                                    firstName={userProfile?.firstName}
                                    lastName={userProfile?.lastName}
                                    size="xl" // Using a larger size for the avatar
                                />
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* --- First Name Input --- */}
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-3 bg-white/80 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                required
                            />
                        </div>
                        {/* --- Last Name Input --- */}
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full p-3 bg-white/80 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                required
                            />
                        </div>
                         {/* --- Photo URL Input --- */}
                         <div>
                            <label htmlFor="photoURL" className="block text-sm font-medium text-slate-700 mb-1">Profile Picture URL (Optional)</label>
                            <input
                                type="url"
                                id="photoURL"
                                value={photoURL}
                                onChange={(e) => setPhotoURL(e.target.value)}
                                className="w-full p-3 bg-white/80 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                placeholder="https://example.com/your-image.jpg"
                            />
                        </div>
                        
                        {/* --- Action Buttons --- */}
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="w-full sm:w-auto px-6 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors shadow"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center" 
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;