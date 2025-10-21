import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';

const EditCoverPhotoModal = ({ isOpen, onClose }) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(userProfile?.coverPhotoUrl || null);
    const [isLoading, setIsLoading] = useState(false);

    // Effect to create a temporary URL for the image preview
    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(userProfile?.coverPhotoUrl || null);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        // Free memory when the component is unmounted or a new file is selected
        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile, userProfile?.coverPhotoUrl]);

    // Handle file selection
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    // Handle saving the new cover photo
    const handleSave = async () => {
        if (!selectedFile) {
            showToast("Please select a file to upload.", "info");
            return;
        }

        setIsLoading(true);
        try {
            const storage = getStorage();
            // Create a unique file path using the user's ID
            const storageRef = ref(storage, `users/${userProfile.uid}/cover_photo`);
            
            // Upload the file
            const snapshot = await uploadBytes(storageRef, selectedFile);
            
            // Get the public URL of the uploaded file
            const downloadUrl = await getDownloadURL(snapshot.ref);

            // Update the user's Firestore document with the new URL
            const userRef = doc(db, 'userProfiles', userProfile.uid);
            await updateDoc(userRef, {
                coverPhotoUrl: downloadUrl,
            });

            showToast("Cover photo updated successfully!", "success");
            onClose(); // Close the modal on success
        } catch (error) {
            console.error("Error updating cover photo:", error);
            showToast("Failed to update cover photo. Please try again.", "error");
        } finally {
            setIsLoading(false);
            setSelectedFile(null);
        }
    };

    const handleCloseModal = () => {
        setSelectedFile(null);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={handleCloseModal}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-70" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                    <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900 flex items-center gap-2">
                                        <PhotoIcon className="h-7 w-7 text-indigo-500" />
                                        Update Cover Photo
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                                        onClick={handleCloseModal}
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="mt-6 flex flex-col items-center">
                                    <div className="w-full h-48 bg-gray-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-gray-400">
                                        {previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt="Cover Photo Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-gray-500 flex flex-col items-center">
                                                <CameraIcon className="w-12 h-12 mb-2" />
                                                <span className="font-semibold">No image selected</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 w-full">
                                    <label htmlFor="file-upload" className="flex items-center justify-center py-3 px-6 w-full cursor-pointer bg-indigo-500 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-600 transition-colors duration-300">
                                        <PhotoIcon className="w-5 h-5 mr-2" />
                                        Choose New Photo
                                    </label>
                                    <input
                                        id="file-upload"
                                        name="file-upload"
                                        type="file"
                                        className="sr-only"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    {selectedFile && (
                                        <p className="mt-2 text-sm text-gray-500 text-center">
                                            Selected: <span className="font-medium text-gray-700">{selectedFile.name}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="py-2 px-6 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                                        onClick={handleCloseModal}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="py-2 px-6 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleSave}
                                        disabled={!selectedFile || isLoading}
                                    >
                                        {isLoading && <Spinner size="sm" color="text-white" />}
                                        Save Changes
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default EditCoverPhotoModal;
