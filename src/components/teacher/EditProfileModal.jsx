import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from 'browser-image-compression';
import { PencilSquareIcon, XMarkIcon, KeyIcon, CameraIcon, ArrowUpTrayIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline'; // <-- Import ChevronUpDownIcon, CheckIcon
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import { motion, AnimatePresence } from 'framer-motion';

// --- Quill Toolbar Options (Unchanged) ---
const quillModules = {
    toolbar: [
        ['bold', 'italic', 'underline'],        // toggled buttons
        [{ 'color': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['clean']                                         // remove formatting
    ],
};

// --- [NEW] Custom Select Component ---
const relationshipOptions = [
    { value: '', label: 'Select status...' },
    { value: 'Single', label: 'Single' },
    { value: 'In a Relationship', label: 'In a Relationship' },
    { value: 'Married', label: 'Married' },
    { value: 'Complicated', label: 'Complicated' },
    { value: 'Widowed', label: 'Widowed' },
];

const CustomSelect = ({ value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);
    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={selectRef}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500 flex justify-between items-center"
            >
                <span className={value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
                    {selectedLabel}
                </span>
                <ChevronUpDownIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 bottom-full mb-2 w-full max-h-48 overflow-y-auto bg-neumorphic-base shadow-neumorphic rounded-xl p-2 dark:bg-neumorphic-base-dark dark:shadow-lg border border-slate-300/50 dark:border-slate-700"
                    >
                        {options.map(option => (
                            <li
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="flex items-center justify-between p-2 rounded-lg text-slate-800 dark:text-slate-100 font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                                <span>{option.label}</span>
                                {value === option.value && (
                                    <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                )}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};
// --- [END NEW] Custom Select Component ---


const EditProfileModal = ({ 
    isOpen, 
    onClose, 
    userProfile, 
    onUpdate,
    setChangePasswordModalOpen
}) => {
    // --- Profile Data State ---
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [coverPhotoURL, setCoverPhotoURL] = useState(''); 
    const [bio, setBio] = useState('');
    const [work, setWork] = useState('');
    const [education, setEducation] = useState('');
    const [current_city, setCurrentCity] = useState('');
    const [hometown, setHometown] = useState('');
    const [mobile_phone, setMobilePhone] = useState('');
    const [relationship_status, setRelationshipStatus] = useState('');
    const [relationship_partner, setRelationshipPartner] = useState('');
    
    // --- Upload/Loading State ---
    const [isUploading, setIsUploading] = useState(false); 
    const [uploadProgress, setUploadProgress] = useState(0); 
    const [isUploadingProfile, setIsUploadingProfile] = useState(false);
    const [profileUploadProgress, setProfileUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false); 

    // --- Draggable Cover Photo State & Refs ---
    const [coverPhotoPosition, setCoverPhotoPosition] = useState('50% 50%');
    const [isDraggingCover, setIsDraggingCover] = useState(false);
    const coverPhotoRef = useRef(null); // Ref for the preview container
    const startDragPos = useRef({ x: 0, y: 0, currentX: 50, currentY: 50 });

    useEffect(() => {
        if (userProfile && isOpen) {
            setFirstName(userProfile.firstName || '');
            setLastName(userProfile.lastName || '');
            setPhotoURL(userProfile.photoURL || '');
            setCoverPhotoURL(userProfile.coverPhotoURL || '');
            setBio(userProfile.bio || '');
            setWork(userProfile.work || '');
            setEducation(userProfile.education || '');
            setCurrentCity(userProfile.current_city || '');
            setHometown(userProfile.hometown || '');
            setMobilePhone(userProfile.mobile_phone || '');
            setRelationshipStatus(userProfile.relationship_status || '');
            setRelationshipPartner(userProfile.relationship_partner || '');
            setCoverPhotoPosition(userProfile.coverPhotoPosition || '50% 50%');
        }
    }, [userProfile, isOpen]);

    // --- Helper function to parse position string ---
    const getInitialPosition = (posString) => {
        const parts = posString.match(/(\d+(\.\d+)?)%/g);
        return parts ? { x: parseFloat(parts[0]), y: parseFloat(parts[1]) } : { x: 50, y: 50 };
    };

    // --- [FIX] Drag Handlers wrapped in useCallback ---
    
    // This handler is attached to the document, so it MUST be memoized
    const handleCoverDragging = useCallback((e) => {
        // We no longer check isDraggingCover here, as this function is only
        // attached when dragging is active.
        if (!coverPhotoRef.current) return;
        
        // Calculate difference in mouse position
        const dx = e.clientX - startDragPos.current.x;
        const dy = e.clientY - startDragPos.current.y;

        // Simplified dragging logic: sensitivity factor converts mouse pixels to % change
        const dragSensitivity = 0.2; 

        // Calculate new percentage position
        let newX = startDragPos.current.currentX + (dx * dragSensitivity);
        let newY = startDragPos.current.currentY + (dy * dragSensitivity);

        // Clamp values between 0 and 100
        newX = Math.min(100, Math.max(0, newX));
        newY = Math.min(100, Math.max(0, newY));

        // setCoverPhotoPosition is a stable dispatcher from useState, 
        // so it's safe to call inside useCallback.
        setCoverPhotoPosition(`${newX.toFixed(2)}% ${newY.toFixed(2)}%`);
    }, [coverPhotoRef]); // Dependency is the stable ref

    // This handler is also attached to the document and must be memoized
    const handleCoverDragEnd = useCallback(() => {
        setIsDraggingCover(false);
        document.removeEventListener('mousemove', handleCoverDragging);
        document.removeEventListener('mouseup', handleCoverDragEnd);
    }, [handleCoverDragging, setIsDraggingCover]); // Dependencies are stable

    // This is the initial event handler on the element, it's fine as a
    // regular function because it's not passed to document.addEventListener
    const handleCoverDragStart = (e) => {
        if (!coverPhotoURL || isUploading || e.button !== 0) return; // Only allow left click

        e.preventDefault();
        setIsDraggingCover(true);
        
        const { x: currentX, y: currentY } = getInitialPosition(coverPhotoPosition);

        startDragPos.current = {
            x: e.clientX,
            y: e.clientY,
            currentX,
            currentY,
        };

        // Attach the STABLE, memoized handlers to the document
        document.addEventListener('mousemove', handleCoverDragging);
        document.addEventListener('mouseup', handleCoverDragEnd);
    };
    // --- [END FIX] ---

    // --- Upload Handlers (Unchanged) ---
    const handleProfileFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploadingProfile(true);
        setProfileUploadProgress(0);

        const options = {
            maxSizeMB: 0.5, 
            maxWidthOrHeight: 800,
            useWebWorker: true,
        };

        try {
            const compressedFile = await imageCompression(file, options);
            const storage = getStorage();
            const storageRef = ref(storage, `profile_photos/${userProfile.id}/${Date.now()}_${compressedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, compressedFile);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProfileUploadProgress(progress);
                }, 
                (error) => {
                    console.error("Profile photo upload failed:", error);
                    alert("Upload failed. Please try again.");
                    setIsUploadingProfile(false);
                }, 
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        setPhotoURL(downloadURL);
                        setIsUploadingProfile(false);
                        setProfileUploadProgress(100);
                    });
                }
            );
        } catch (error) {
            console.error("Compression or upload error:", error);
            alert("An error occurred. Please try a different image.");
            setIsUploadingProfile(false);
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);
        setCoverPhotoPosition('50% 50%'); // Reset position on new upload

        const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        try {
            const compressedFile = await imageCompression(file, options);
            const storage = getStorage();
            const storageRef = ref(storage, `cover_photos/${userProfile.id}/${Date.now()}_${compressedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, compressedFile);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                }, 
                (error) => {
                    console.error("Upload failed:", error);
                    alert("Upload failed. Please try again.");
                    setIsUploading(false);
                }, 
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        setCoverPhotoURL(downloadURL); 
                        setIsUploading(false);
                        setUploadProgress(100);
                    });
                }
            );
        } catch (error) {
            console.error("Compression or upload error:", error);
            alert("An error occurred. Please try a different image.");
            setIsUploading(false);
        }
    };


    // --- handleSubmit (Unchanged) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            alert("First and last names cannot be empty.");
            return;
        }
        setLoading(true);

        const finalRelationshipPartner = (relationship_status === 'In a Relationship' || relationship_status === 'Married') 
            ? relationship_partner 
            : '';

        try {
            // 1. Save the new profile data
            await onUpdate({ 
                firstName, 
                lastName, 
                photoURL, 
                coverPhotoURL,
                bio,
                work,
                education,
                current_city,
                hometown,
                mobile_phone,
                relationship_status,
                relationship_partner: finalRelationshipPartner,
                coverPhotoPosition
            });

            const storage = getStorage();

            // 2. Cover photo deletion
            const oldCoverUrl = userProfile.coverPhotoURL;
            const newCoverUrl = coverPhotoURL;
            if (oldCoverUrl && oldCoverUrl !== newCoverUrl && oldCoverUrl.includes('firebasestorage.googleapis.com')) {
                const oldCoverRef = ref(storage, oldCoverUrl);
                deleteObject(oldCoverRef).catch((err) => console.error("Failed to delete old cover photo", err));
            }

            // 3. Profile photo deletion
            const oldPhotoUrl = userProfile.photoURL;
            const newPhotoUrl = photoURL;
            if (oldPhotoUrl && oldPhotoUrl !== newPhotoUrl && oldPhotoUrl.includes('firebasestorage.googleapis.com')) {
                const oldPhotoRef = ref(storage, oldPhotoUrl);
                deleteObject(oldPhotoRef).catch((err) => console.error("Failed to delete old profile photo", err));
            }

        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Failed to save profile. Please try again.");
            setLoading(false);
            return; 
        }
        
        setLoading(false);
        onClose();
    };


    const handleChangePasswordClick = () => {
        onClose(); 
        setTimeout(() => {
            setChangePasswordModalOpen(true); 
        }, 100); 
    };

    if (!isOpen) return null;

    return (
        <> {/* <-- Wrapper Fragment for Style block fix --> */}

            {/* --- Style block (Moved outside AnimatePresence) --- */}
            <style>{`
                .neumorphic-quill-editor .ql-toolbar {
                    background: transparent !important;
                    border: none !important;
                    border-bottom: 1px solid var(--tw-border-slate-300-50, rgba(203, 213, 225, 0.5)) !important;
                    padding: 8px !important;
                }
                .dark .neumorphic-quill-editor .ql-toolbar {
                    border-bottom: 1px solid var(--tw-border-slate-700, rgba(51, 65, 85, 1)) !important;
                }
                .neumorphic-quill-editor .ql-container {
                    background: transparent !important;
                    border: none !important;
                    font-family: inherit !important;
                }
                .neumorphic-quill-editor .ql-editor {
                    background: transparent !important;
                    min-height: 100px;
                    font-size: 1rem !important;
                    font-weight: 500 !important;
                    color: var(--tw-text-slate-800, rgba(30, 41, 59, 1)) !important;
                    padding: 12px 8px !important;
                }
                .dark .neumorphic-quill-editor .ql-editor {
                    color: var(--tw-text-slate-100, rgba(241, 245, 249, 1)) !important;
                }
                .neumorphic-quill-editor .ql-editor.ql-blank::before {
                    color: var(--tw-placeholder-slate-400, rgba(148, 163, 184, 1)) !important;
                    font-style: normal !important;
                    font-weight: 400 !important;
                    left: 8px !important;
                }
                .dark .neumorphic-quill-editor .ql-editor.ql-blank::before {
                    color: var(--tw-placeholder-slate-500, rgba(100, 116, 139, 1)) !important;
                }
                .neumorphic-quill-editor .ql-toolbar .ql-picker-label {
                    color: var(--tw-text-slate-800, rgba(30, 41, 59, 1)) !important;
                }
                .dark .neumorphic-quill-editor .ql-toolbar .ql-picker-label {
                    color: var(--tw-text-slate-100, rgba(241, 245, 249, 1)) !important;
                }
                .neumorphic-quill-editor .ql-toolbar .ql-stroke {
                    stroke: var(--tw-text-slate-800, rgba(30, 41, 59, 1)) !important;
                }
                .dark .neumorphic-quill-editor .ql-toolbar .ql-stroke {
                    stroke: var(--tw-text-slate-100, rgba(241, 245, 249, 1)) !important;
                }
            `}</style>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                            className="relative w-full max-w-lg bg-neumorphic-base shadow-neumorphic rounded-3xl dark:bg-neumorphic-base-dark dark:shadow-lg"
                        >
                            <button 
                                onClick={onClose} 
                                className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>

                            <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto custom-scrollbar">
                                {/* --- Header --- */}
                                <div className="pt-8 px-6 text-center border-b border-slate-300/50 dark:border-slate-700">
                                    <div className="flex items-center justify-start gap-4">
                                        
                                        {/* --- Profile Photo Upload Area (Unchanged) --- */}
                                        <div className="relative w-20 h-20 flex-shrink-0">
                                            {/* Profile Avatar */}
                                            <UserInitialsAvatar 
                                                user={{...userProfile, photoURL: photoURL}} 
                                                size="full" 
                                                className="w-20 h-20 text-3xl"
                                                effectsEnabled={false}
                                            />
                                            
                                            {/* Upload Button */}
                                            <label 
                                                htmlFor="profile-photo-upload"
                                                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-neumorphic-base shadow-neumorphic transition-all hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark cursor-pointer"
                                            >
                                                <CameraIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                                                <input 
                                                    id="profile-photo-upload" 
                                                    type="file" 
                                                    className="sr-only" 
                                                    accept="image/png, image/jpeg, image/webp"
                                                    onChange={handleProfileFileChange}
                                                    disabled={isUploadingProfile}
                                                />
                                            </label>
                                            
                                            {/* Uploading Overlay */}
                                            <AnimatePresence>
                                                {isUploadingProfile && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="absolute inset-0 z-10 w-full h-full bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm"
                                                    >
                                                        <div 
                                                            className="text-xs font-bold text-white"
                                                            style={{textShadow: '0 0 5px rgba(0,0,0,0.7)'}}
                                                        >
                                                            {Math.round(profileUploadProgress)}%
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="text-left">
                                            <h2 className="text-2xl font-bold text-slate-900 leading-tight dark:text-slate-100">Edit Profile</h2>
                                            <p className="text-sm text-slate-600 mt-1 dark:text-slate-300">Update your personal information.</p>
                                        </div>
                                    </div>
                                    
											{/* --- Cover Photo Preview & Upload (Draggable) --- */}
                                            <div className="mt-6">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-left mb-2">
                                                    Cover Photo
                                                    {coverPhotoURL && (
                                                        <span className={`text-xs ml-2 font-normal ${isDraggingCover ? 'text-blue-500' : 'text-slate-500'}`}>
                                                            ({isDraggingCover ? 'Dragging...' : 'Click and drag to reposition'})
                                                        </span>
                                                    )}
                                                </label>
                                                <div 
                                                    ref={coverPhotoRef}
                                                    className={`relative w-full h-32 rounded-xl bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark overflow-hidden transition-shadow ${coverPhotoURL && !isUploading ? 'cursor-grab' : ''} ${isDraggingCover ? 'cursor-grabbing' : ''}`}
                                  
                                                    onMouseDown={handleCoverDragStart}
                                                >
                                                    {coverPhotoURL && !isUploading && (
                                                        <div
                                                            className="w-full h-full"
                                                            style={{
                                                                backgroundImage: `url(${coverPhotoURL})`,
                                                                backgroundSize: 'cover',
                                                                backgroundRepeat: 'no-repeat',
                                                                backgroundPosition: coverPhotoPosition,
                                                                pointerEvents: 'none', 
                                                            }}
                                                        />
                                                    )}
                                                    {!coverPhotoURL && !isUploading && (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                                            <CameraIcon className="w-8 h-8" />
                                                            <span className="text-sm mt-1">No cover photo</span>
                                                        </div>
                                                    )}

                                                    {/* --- Dedicated Upload Button --- */}
                                                    <label 
                                                        htmlFor="cover-photo-upload" 
                                                        className="absolute z-10 bottom-2 right-2 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-all hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark cursor-pointer"
                                                        aria-label={coverPhotoURL ? 'Change cover photo' : 'Upload cover photo'}
                                                       
                                                        onMouseDown={(e) => e.stopPropagation()} 
                                                    >
                                                        <ArrowUpTrayIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                                        <input 
                                                            id="cover-photo-upload" 
                                                            type="file" 
                                                            className="sr-only" 
                                                            accept="image/png, image/jpeg, image/webp"
                                                            onChange={handleFileChange}
                                                            disabled={isUploading}
                                                        />
                                                    </label>


                                                    {isUploading && (
                                                        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                                                            <div className="w-full">
                                                                <p className="text-white text-sm text-center mb-2">Uploading...</p>
                                                                <div className="w-full bg-slate-500 rounded-full h-1.5">
                                                                    <div 
                                                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                                                                        style={{ width: `${uploadProgress}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                </div>

                                {/* --- Form Fields --- */}
                                <div className="p-6 space-y-4">
                                    <div className="bg-neumorphic-base rounded-xl shadow-neumorphic-inset divide-y divide-slate-300/50 p-1 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:divide-slate-700">
                                        
                                        {/* First/Last Name */}
                                        <div className="flex divide-x divide-slate-300/50 dark:divide-slate-700">
                                            <div className="p-3.5 flex-1">
                                                <label htmlFor="firstName" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">First Name</label>
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                    placeholder="First Name"
                                                    required
                                                />
                                            </div>
                                            <div className="p-3.5 flex-1">
                                                <label htmlFor="lastName" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Last Name</label>
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                    placeholder="Last Name"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Bio (Rich Text) */}
                                        <div className="p-3.5">
                                            <label htmlFor="bio" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Bio</label>
                                            <div className="neumorphic-quill-editor rounded-lg overflow-hidden border border-transparent dark:border-transparent">
                                                <ReactQuill
                                                    theme="snow"
                                                    value={bio}
                                                    onChange={setBio}
                                                    modules={quillModules}
                                                    placeholder="Tell everyone a little about yourself..."
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Work */}
                                        <div className="p-3.5">
                                            <label htmlFor="work" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Work</label>
                                            <input
                                                type="text"
                                                id="work"
                                                value={work}
                                                onChange={(e) => setWork(e.target.value)}
                                                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                placeholder="e.g., Works at San Ramon Catholic School"
                                            />
                                        </div>
                                        
                                        {/* Education */}
                                        <div className="p-3.5">
                                            <label htmlFor="education" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Education</label>
                                            <input
                                                type="text"
                                                id="education"
                                                value={education}
                                                onChange={(e) => setEducation(e.target.value)}
                                                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                placeholder="e.g., Studied at KCC"
                                            />
                                        </div>
                                        
                                        {/* Current City */}
                                        <div className="p-3.5">
                                            <label htmlFor="current_city" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Current City (Lives in)</label>
                                            <input
                                                type="text"
                                                id="current_city"
                                                value={current_city}
                                                onChange={(e) => setCurrentCity(e.target.value)}
                                                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                placeholder="e.g., Kabankalan, Negros Occidental"
                                            />
                                        </div>
                                        
                                        {/* Hometown */}
                                        <div className="p-3.5">
                                            <label htmlFor="hometown" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Hometown (From)</label>
                                            <input
                                                type="text"
                                                id="hometown"
                                                value={hometown}
                                                onChange={(e) => setHometown(e.target.value)}
                                                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                placeholder="e.g., Kabankalan, Negros Occidental"
                                            />
                                        </div>
                                        
                                        {/* Mobile Phone */}
                                        <div className="p-3.5">
                                            <label htmlFor="mobile_phone" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Mobile Phone</label>
                                            <input
                                                type="tel"
                                                id="mobile_phone"
                                                value={mobile_phone}
                                                onChange={(e) => setMobilePhone(e.target.value)}
                                                className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                placeholder="e.g., 0992 733 7145"
                                            />
                                        </div>
                                        
                                        {/* --- MODIFIED: Replaced <select> with <CustomSelect> --- */}
                                        <div className="p-3.5">
                                            <label htmlFor="relationship_status" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Relationship Status</label>
                                            <CustomSelect
                                                value={relationship_status}
                                                onChange={setRelationshipStatus}
                                                options={relationshipOptions}
                                                placeholder="Select status..."
                                            />
                                        </div>

                                        {/* Conditional Partner Field */}
                                        {(relationship_status === 'In a Relationship' || relationship_status === 'Married') && (
                                            <div className="p-3.5">
                                                <label htmlFor="relationship_partner" className="block text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Partner's Name</label>
                                                <input
                                                    type="text"
                                                    id="relationship_partner"
                                                    value={relationship_partner}
                                                    onChange={(e) => setRelationshipPartner(e.target.value)}
                                                    className="w-full bg-transparent text-slate-800 font-medium text-base placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
                                                    placeholder="e.g., Jane Doe"
                                                />
                                            </div>
                                        )}

                                    </div>
                                </div>
                                
                                {/* --- Button Section --- */}
                                <div className="p-6 pt-0 space-y-3">
                                    <button 
                                        type="submit" 
                                        className="w-full px-6 py-3.5 font-semibold rounded-xl transition-shadow flex items-center justify-center gap-2 bg-neumorphic-base text-blue-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-60 dark:bg-neumorphic-base-dark dark:text-blue-400 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark" 
                                        disabled={loading || isUploading || isUploadingProfile}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-blue-700 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                    <button 
                                        type="button" 
                                        onClick={handleChangePasswordClick}
                                        className="w-full px-6 py-2.5 font-medium text-sm rounded-xl transition-shadow flex items-center justify-center gap-2 bg-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" 
                                    >
                                        <KeyIcon className="w-5 h-5" />
                                        <span>Change Password</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </> // <-- Closing Fragment
    );
};

export default EditProfileModal;