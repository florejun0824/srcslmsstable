import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DocumentPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const JoinClassModal = ({ isOpen, onClose, onClassJoined }) => {
    const { firestoreService, userProfile } = useAuth();
    const { showToast } = useToast();
    const [classCode, setClassCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleJoinSubmit = async (e) => {
        e.preventDefault();
        if (!classCode.trim()) {
            showToast("Please enter a class code.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await firestoreService.joinClassWithCode(classCode.toUpperCase(), userProfile);
            showToast(`Successfully joined class: ${result.className}!`, 'success');
            onClose(); 
            if (onClassJoined) {
                onClassJoined();
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex justify-center items-center z-50 p-4 font-sans">
            <div className="relative bg-gray-200/60 backdrop-blur-xl rounded-2xl shadow-lg p-6 w-full max-w-md border border-white/20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <DocumentPlusIcon className="w-6 h-6 mr-3 text-red-600"/>
                        Join a New Class
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-500/10 hover:text-gray-800 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <input 
                        type="text"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        placeholder="Enter 6-Digit Class Code"
                        className="w-full p-3 bg-white/50 border border-gray-400/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-center font-mono text-lg tracking-widest"
                        maxLength="6"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-5 py-2.5 rounded-xl bg-gray-500/10 text-gray-800 font-semibold hover:bg-gray-500/20 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md shadow-red-600/30 transition-all disabled:bg-gray-400 disabled:shadow-none"
                        >
                            {isSubmitting ? 'Joining...' : 'Join Class'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JoinClassModal;