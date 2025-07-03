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
            onClose(); // Close the modal
            if (onClassJoined) {
                onClassJoined(); // This can be used to trigger a data refresh
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <DocumentPlusIcon className="w-6 h-6 mr-3 text-blue-600"/>
                        Join a New Class
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <input 
                        type="text"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value)}
                        placeholder="Enter 6-Digit Class Code"
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength="6"
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? 'Joining...' : 'Join Class'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JoinClassModal;