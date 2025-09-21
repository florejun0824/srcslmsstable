import React, { useState, useEffect } from 'react';
import { db } from '../../../../services/firebase'; // Adjust path as necessary
import { doc, setDoc } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoIcon, ExclamationTriangleIcon, CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../../contexts/ToastContext'; // Adjust path as necessary

const AdminBannerEditModal = ({ isOpen, onClose, currentImageUrl, currentStartDate, currentEndDate, onSaveSuccess }) => {
    const { showToast } = useToast();
    const [imageUrl, setImageUrl] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [imgLoadError, setImgLoadError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setImageUrl(currentImageUrl || '');
            setStartDate(currentStartDate?.seconds ? new Date(currentStartDate.seconds * 1000).toISOString().slice(0, 16) : '');
            setEndDate(currentEndDate?.seconds ? new Date(currentEndDate.seconds * 1000).toISOString().slice(0, 16) : '');
            setError('');
            setImgLoadError(false);
        }
    }, [isOpen, currentImageUrl, currentStartDate, currentEndDate]);

    const handleSave = async () => {
        setError('');
        if (!imageUrl) {
            setError("The Image URL cannot be empty.");
            return;
        }

        setIsSaving(true);
        try {
            const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
            const startDateObj = startDate ? new Date(startDate) : null;
            const endDateObj = endDate ? new Date(endDate) : null;

            if (startDate && isNaN(startDateObj.getTime())) {
                setError("The start date format is invalid.");
                setIsSaving(false);
                return;
            }
            if (endDate && isNaN(endDateObj.getTime())) {
                setError("The end date format is invalid.");
                setIsSaving(false);
                return;
            }
            if (startDateObj && endDateObj && startDateObj >= endDateObj) {
                setError("The start date must be before the end date.");
                setIsSaving(false);
                return;
            }

            await setDoc(bannerDocRef, {
                imageUrl,
                startDate: startDateObj,
                endDate: endDateObj,
            }, { merge: true });

            showToast("Banner updated successfully!", "success");
            onSaveSuccess();
            onClose();
        } catch (e) {
            console.error("Error saving banner settings:", e);
            setError("A server error occurred. Please try again.");
            showToast("Failed to save banner settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 20, stiffness: 250 } },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog static as="div" className="relative z-50 font-sans" open={isOpen} onClose={onClose}>
                    {/* Neumorphic Design Changes: Removed backdrop-blur for a clean overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50"
                    />

                    <div className="fixed inset-0 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            {/* Neumorphic Design Changes: Replaced glassmorphism with neumorphic styles */}
                            <motion.div
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                as={Dialog.Panel}
                                className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-neumorphic-base p-6 text-left align-middle shadow-neumorphic"
                            >
                                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-neumorphic-base text-slate-500 rounded-full shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                                
                                <Dialog.Title as="h3" className="text-2xl font-semibold text-center text-slate-800">
                                    Edit Banner
                                </Dialog.Title>
                                <p className="text-center text-sm text-slate-500 mt-1 mb-6">Update the primary promotional banner.</p>

                                <div className="space-y-4">
                                    {/* Neumorphic Design Changes: Image preview is now inset */}
                                    <div className="w-full aspect-video bg-neumorphic-base rounded-2xl flex items-center justify-center overflow-hidden shadow-neumorphic-inset">
                                        {imageUrl && !imgLoadError ? (
                                            <img
                                                src={imageUrl}
                                                alt="Banner Preview"
                                                className="w-full h-full object-cover"
                                                onError={() => setImgLoadError(true)}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400">
                                                <PhotoIcon className="h-10 w-10" />
                                                <span className="text-xs mt-2 font-medium">{imgLoadError ? "Image Failed to Load" : "Preview"}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Neumorphic Design Changes: Input fields are now inset */}
                                    <div>
                                        <label htmlFor="imageUrl" className="block text-sm font-medium text-slate-600 mb-1.5">
                                            Image URL
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                                <PhotoIcon className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                id="imageUrl"
                                                type="url"
                                                value={imageUrl}
                                                onChange={(e) => { setImageUrl(e.target.value); setImgLoadError(false); }}
                                                className="w-full rounded-xl border-none bg-neumorphic-base shadow-neumorphic-inset py-3 pl-10 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="startDate" className="block text-sm font-medium text-slate-600 mb-1.5">
                                                Display From
                                            </label>
                                            <input
                                                id="startDate"
                                                type="datetime-local"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full rounded-xl border-none bg-neumorphic-base shadow-neumorphic-inset py-3 px-4 text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="endDate" className="block text-sm font-medium text-slate-600 mb-1.5">
                                                Display Until
                                            </label>
                                            <input
                                                id="endDate"
                                                type="datetime-local"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full rounded-xl border-none bg-neumorphic-base shadow-neumorphic-inset py-3 px-4 text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    
                                    {error && (
                                        <div className="flex items-center space-x-2 text-red-600 bg-neumorphic-base p-3 rounded-xl shadow-neumorphic">
                                            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                                            <p className="text-sm font-medium">{error}</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Neumorphic Design Changes: Buttons are now extruded with a pressed effect */}
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <button
                                        onClick={onClose}
                                        className="w-full rounded-xl bg-neumorphic-base px-4 py-3 text-base font-semibold text-slate-700 shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-slate-900"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full rounded-xl bg-neumorphic-base px-4 py-3 text-base font-semibold text-primary-700 shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-primary-600 disabled:opacity-60"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </Dialog>
            )}
        </AnimatePresence>
    );
};

export default AdminBannerEditModal;