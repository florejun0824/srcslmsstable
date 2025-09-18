import React, { useState, useEffect } from 'react';
import { PencilSquareIcon, XMarkIcon, UserIcon, PhotoIcon } from '@heroicons/react/24/outline'; // Using outline for a clean, modern look
import UserInitialsAvatar from '../common/UserInitialsAvatar'; // Assuming this component exists

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
            alert("First and last names cannot be empty."); // Consider a more elegant error display
            return;
        }
        setLoading(true);
        await onUpdate({ firstName, lastName, photoURL });
        setLoading(false);
        // onClose(); // Decide if modal closes automatically or user clicks close
    };

    if (!isOpen) return null;

    return (
        // Backdrop with deeper blur and subtle gradient
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/70 backdrop-blur-xl flex justify-center items-center z-50 p-4 animate-modal-fade-in">
            {/* Modal Card - Floating, layered appearance with softer shadows */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-3xl ring-1 ring-white/10 w-full max-w-md transform transition-all duration-300 animate-modal-pop-in relative">
                
                {/* Close Button - More prominent and integrated */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/70 backdrop-blur-lg text-slate-600 hover:bg-white active:scale-95 transition-all shadow-md ring-1 ring-slate-200"
                    aria-label="Close"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <form onSubmit={handleSubmit}>
                    {/* Header with Title and Avatar Section */}
                    <div className="py-8 px-6 text-center border-b border-slate-200/50">
                        <div className="relative w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden shadow-lg border-4 border-white ring-1 ring-slate-200">
                            {photoURL ? (
                                <img src={photoURL} alt="Profile Preview" className="w-full h-full object-cover" />
                            ) : (
                                <UserInitialsAvatar
                                    firstName={firstName}
                                    lastName={lastName}
                                    size="2xl" // Custom size for better fit
                                />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">Edit Profile</h2>
                        <p className="text-sm text-slate-600 mt-1">Update your personal information.</p>
                    </div>

                    {/* Form Fields - Styled as a cohesive, layered block */}
                    <div className="p-6 space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
                            {/* First & Last Name Fields */}
                            <div className="flex divide-x divide-slate-100">
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
                            {/* Photo URL Field */}
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
                    
                    {/* Action Buttons - Distinct, floating, and responsive */}
                    <div className="p-6 pt-0">
                        <button 
                            type="submit" 
                            className="w-full px-6 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            </div>
            <style jsx>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalPopIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-modal-fade-in { animation: modalFadeIn 0.3s ease-out forwards; }
                .animate-modal-pop-in { animation: modalPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                /* Custom shadow for a more diffused, "floating" look */
                .shadow-3xl {
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2), 
                                0 10px 20px rgba(0, 0, 0, 0.15),
                                0 5px 10px rgba(0, 0, 0, 0.1);
                }
            `}</style>
        </div>
    );
};

export default EditProfileModal;