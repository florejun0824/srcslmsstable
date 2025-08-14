import React, { useState, useEffect } from 'react';
import { db } from '../../../../services/firebase'; // Adjust path as necessary
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TextInput, Button } from '@tremor/react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { PhotoIcon, ExclamationTriangleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'; // Updated icons for better fit
import { useToast } from '../../../../contexts/ToastContext'; // Adjust path as necessary

const AdminBannerEditModal = ({ isOpen, onClose, currentImageUrl, currentEndDate, onSaveSuccess }) => {
    const { showToast } = useToast();
    const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
    const [endDate, setEndDate] = useState(currentEndDate ? new Date(currentEndDate.seconds * 1000).toISOString().slice(0, 16) : ''); // Format for datetime-local
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setImageUrl(currentImageUrl || '');
        // Convert Firestore Timestamp to JS Date, then to YYYY-MM-DDTHH:MM format
        setEndDate(currentEndDate && currentEndDate.seconds ? new Date(currentEndDate.seconds * 1000).toISOString().slice(0, 16) : '');
    }, [currentImageUrl, currentEndDate, isOpen]); // Reset state when modal opens or props change

    const handleSave = async () => {
        setError('');
        setIsSaving(true);
        try {
            if (!imageUrl) {
                setError("Image URL cannot be empty.");
                showToast("Image URL cannot be empty.", "error");
                return;
            }

            const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
            let parsedEndDate = null;
            if (endDate) {
                const dateObj = new Date(endDate);
                if (isNaN(dateObj.getTime())) {
                    setError("Invalid end date and time. Please use a valid date format.");
                    showToast("Invalid end date and time.", "error");
                    return;
                }
                parsedEndDate = dateObj;
            }

            await setDoc(bannerDocRef, {
                imageUrl: imageUrl,
                endDate: parsedEndDate // Firestore will automatically convert Date objects to Timestamps
            }, { merge: true }); // Merge to update specific fields without overwriting others

            showToast("Banner settings saved successfully!", "success");
            onSaveSuccess(); // Callback to notify parent
            onClose();
        } catch (e) {
            console.error("Error saving banner settings:", e);
            setError("Failed to save banner settings. Please try again.");
            showToast("Failed to save banner settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Transition show={isOpen}>
            <Dialog as="div" className="relative z-50 font-sans" onClose={onClose}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md p-6 sm:p-8 border border-gray-200">
                                {/* Modal Header */}
                                <div className="flex items-center pb-4 border-b border-gray-200 mb-6">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 sm:mx-0 sm:h-10 sm:w-10 shadow-lg">
                                        <PhotoIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-grow">
                                        <DialogTitle as="h3" className="text-xl font-bold leading-6 text-gray-900">
                                            Edit Banner Settings
                                        </DialogTitle>
                                        <p className="text-sm text-gray-500 mt-1">Update the promotional banner for your dashboard.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Image URL Input */}
                                    <div>
                                        <label htmlFor="imageUrl" className="block text-sm font-medium leading-6 text-gray-800 mb-2 flex items-center">
                                            <PhotoIcon className="h-4 w-4 mr-1 text-gray-500" /> Image URL
                                        </label>
                                        <TextInput
                                            id="imageUrl"
                                            name="imageUrl"
                                            placeholder="e.g., https://example.com/banner.png"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                                        />
                                        {imageUrl && (
                                            <div className="mt-4 p-2 bg-gray-50 rounded-lg border border-gray-200 flex justify-center items-center h-24 overflow-hidden">
                                                <img 
                                                    src={imageUrl} 
                                                    alt="Banner Preview" 
                                                    className="max-h-full max-w-full object-contain rounded-md" 
                                                    onError={(e) => { 
                                                        e.target.onerror = null; 
                                                        e.target.src = 'https://placehold.co/100x50/F0F4F8/6B7280?text=Image+Load+Error';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* End Date Input */}
                                    <div>
                                        <label htmlFor="endDate" className="block text-sm font-medium leading-6 text-gray-800 mb-2 flex items-center">
                                            <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-500" /> Display Until (Optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            id="endDate"
                                            name="endDate"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="block w-full rounded-lg border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out sm:text-sm"
                                        />
                                        <p className="mt-2 text-xs text-gray-500">
                                            Leave blank for indefinite display. The banner will automatically hide after this date.
                                        </p>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2 shadow-sm">
                                            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                            <p className="text-sm font-medium">{error}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-8 flex flex-col sm:flex-row-reverse sm:justify-start gap-3">
                                    <Button
                                        type="button"
                                        onClick={handleSave}
                                        loading={isSaving}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:from-indigo-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
                                    >
                                        {isSaving ? 'Saving Changes...' : 'Save Changes'}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AdminBannerEditModal;
