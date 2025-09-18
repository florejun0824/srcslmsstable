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
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-md"
                    />

                    <div className="fixed inset-0 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <motion.div
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                as={Dialog.Panel}
                                className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white/70 p-6 text-left align-middle shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl transition-all dark:bg-zinc-800/70 dark:ring-white/10"
                            >
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 p-4">
                                    <div className="w-10 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-600" />
                                </div>
                                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                                
                                <Dialog.Title as="h3" className="pt-6 text-2xl font-semibold text-center text-gray-900 dark:text-white">
                                    Edit Banner
                                </Dialog.Title>
                                <p className="text-center text-sm text-gray-600 dark:text-zinc-400 mt-1 mb-6">Update the primary promotional banner.</p>

                                <div className="space-y-4">
                                    <div className="w-full aspect-video bg-gray-500/10 rounded-xl flex items-center justify-center overflow-hidden ring-1 ring-inset ring-black/5">
                                        {imageUrl && !imgLoadError ? (
                                            <img
                                                src={imageUrl}
                                                alt="Banner Preview"
                                                className="w-full h-full object-cover"
                                                onError={() => setImgLoadError(true)}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400 dark:text-zinc-500">
                                                <PhotoIcon className="h-10 w-10" />
                                                <span className="text-xs mt-2 font-medium">{imgLoadError ? "Image Failed to Load" : "Preview"}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                                            Image URL
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                                <PhotoIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                                            </div>
                                            <input
                                                id="imageUrl"
                                                type="url"
                                                value={imageUrl}
                                                onChange={(e) => { setImageUrl(e.target.value); setImgLoadError(false); }}
                                                className="w-full rounded-xl border-0 bg-gray-500/10 py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition"
                                            />
                                        </div>
                                    </div>

                                    {/* Date Inputs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                                                Display From (Optional)
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                                                </div>
                                                <input
                                                    id="startDate"
                                                    type="datetime-local"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full rounded-xl border-0 bg-gray-500/10 py-3 pl-10 pr-2 text-gray-900 dark:text-white dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                                                Display Until (Optional)
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                                                </div>
                                                <input
                                                    id="endDate"
                                                    type="datetime-local"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full rounded-xl border-0 bg-gray-500/10 py-3 pl-10 pr-2 text-gray-900 dark:text-white dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {error && (
                                        <div className="flex items-center space-x-2 text-red-500 dark:text-red-400 bg-red-500/10 p-3 rounded-xl ring-1 ring-inset ring-red-500/20">
                                            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                                            <p className="text-sm font-medium">{error}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 space-y-3">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white/80 dark:focus:ring-offset-zinc-800/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full rounded-xl bg-transparent px-4 py-3 text-base font-semibold text-gray-800 dark:text-zinc-200 hover:bg-gray-500/10 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white/80 dark:focus:ring-offset-zinc-800/80 transition-all duration-200 active:scale-[0.98]"
                                    >
                                        Cancel
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