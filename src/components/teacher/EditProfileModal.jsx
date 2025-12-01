import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';
import { 
    IconX, 
    IconDeviceFloppy, 
    IconKey, 
    IconCamera, 
    IconUpload, 
    IconChevronDown, 
    IconCheck,
    IconLoader
} from '@tabler/icons-react';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

// --- MONET EFFECT HELPER ---
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas':
            return {
                modalBg: '#0f291e', 
                borderColor: 'rgba(34, 197, 94, 0.3)', 
                innerPanelBg: 'rgba(20, 83, 45, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#e2e8f0',
                accentText: '#86efac', 
            };
        case 'valentines':
            return {
                modalBg: '#2a0a12', 
                borderColor: 'rgba(244, 63, 94, 0.3)', 
                innerPanelBg: 'rgba(80, 7, 36, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#ffe4e6',
                accentText: '#fda4af', 
            };
        case 'graduation':
            return {
                modalBg: '#1a1600', 
                borderColor: 'rgba(234, 179, 8, 0.3)', 
                innerPanelBg: 'rgba(66, 32, 6, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#fefce8',
                accentText: '#fde047', 
            };
        case 'rainy':
            return {
                modalBg: '#0f172a', 
                borderColor: 'rgba(56, 189, 248, 0.3)', 
                innerPanelBg: 'rgba(30, 41, 59, 0.5)',
                inputBg: 'rgba(15, 23, 42, 0.5)',
                textColor: '#f1f5f9',
                accentText: '#7dd3fc', 
            };
        case 'cyberpunk':
            return {
                modalBg: '#180a2e', 
                borderColor: 'rgba(217, 70, 239, 0.4)', 
                innerPanelBg: 'rgba(46, 16, 101, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.4)',
                textColor: '#fae8ff',
                accentText: '#e879f9', 
            };
        case 'spring':
            return {
                modalBg: '#2a1a1f', 
                borderColor: 'rgba(244, 114, 182, 0.3)', 
                innerPanelBg: 'rgba(80, 20, 40, 0.3)',
                inputBg: 'rgba(0, 0, 0, 0.2)',
                textColor: '#fce7f3',
                accentText: '#f9a8d4', 
            };
        case 'space':
            return {
                modalBg: '#0b0f19', 
                borderColor: 'rgba(99, 102, 241, 0.3)', 
                innerPanelBg: 'rgba(17, 24, 39, 0.6)',
                inputBg: 'rgba(0, 0, 0, 0.5)',
                textColor: '#e0e7ff',
                accentText: '#a5b4fc', 
            };
        case 'none':
        default:
            return {
                modalBg: '#262a33', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                innerPanelBg: '#2b303b', 
                inputBg: '#20242c', 
                textColor: '#f1f5f9',
                accentText: '#cbd5e1', 
            };
    }
};

// --- CONSTANTS ---
const headingStyle = "font-display font-bold tracking-tight";

// --- Quill Toolbar Options ---
const quillModules = {
    toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['clean']
    ],
};

// --- Custom Select Component ---
const relationshipOptions = [
    { value: '', label: 'Select status...' },
    { value: 'Single', label: 'Single' },
    { value: 'In a Relationship', label: 'In a Relationship' },
    { value: 'Married', label: 'Married' },
    { value: 'Complicated', label: 'Complicated' },
    { value: 'Widowed', label: 'Widowed' },
];

const CustomSelect = ({ value, onChange, options, placeholder, themeStyles }) => {
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
                className={`w-full border rounded-xl px-4 py-2.5 flex justify-between items-center text-left cursor-pointer transition-all font-medium text-sm`}
                style={{ 
                    backgroundColor: themeStyles.inputBg, 
                    color: themeStyles.textColor,
                    borderColor: 'transparent'
                }}
            >
                <span className={value ? '' : 'opacity-50'}>
                    {selectedLabel}
                </span>
                <IconChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} opacity-50`} 
                    style={{ color: themeStyles.textColor }}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full mt-2 w-full max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-xl rounded-xl shadow-xl ring-1 ring-black/5 p-1.5 border"
                        style={{ 
                            backgroundColor: themeStyles.modalBg,
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        {options.map(option => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition-colors`}
                                style={{ 
                                    color: value === option.value ? themeStyles.accentText : themeStyles.textColor,
                                    backgroundColor: value === option.value ? themeStyles.innerPanelBg : 'transparent'
                                }}
                            >
                                <span>{option.label}</span>
                                {value === option.value && (
                                    <IconCheck size={16} />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const EditProfileModal = ({ 
    isOpen, 
    onClose, 
    userProfile, 
    onUpdate,
    setChangePasswordModalOpen
}) => {
    // --- Theme Hook ---
    const { activeOverlay } = useTheme();
    const themeStyles = getThemeStyles(activeOverlay);

    // --- Styles ---
    const labelStyle = `block text-xs font-bold mb-1.5 uppercase tracking-wide ml-1`;
    const glassInput = `w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm`;

    const baseButtonStyles = `relative font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`;
    const primaryButton = `${baseButtonStyles} px-6 py-3 text-sm text-white bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/30 border-t border-white/20 w-full`;
    const secondaryButton = `${baseButtonStyles} px-5 py-2.5 text-sm w-full`;
    const btnExtruded = `shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.02)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.02)]`;

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

    // --- Draggable Cover Photo State ---
    const [coverPhotoPosition, setCoverPhotoPosition] = useState('50% 50%');
    const [isDraggingCover, setIsDraggingCover] = useState(false);
    const coverPhotoRef = useRef(null);
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

    // --- Drag Logic ---
    const getInitialPosition = (posString) => {
        const parts = posString.match(/(\d+(\.\d+)?)%/g);
        return parts ? { x: parseFloat(parts[0]), y: parseFloat(parts[1]) } : { x: 50, y: 50 };
    };

    const handleCoverDragging = useCallback((e) => {
        if (!coverPhotoRef.current) return;
        const dx = e.clientX - startDragPos.current.x;
        const dy = e.clientY - startDragPos.current.y;
        const dragSensitivity = 0.2; 
        let newX = startDragPos.current.currentX + (dx * dragSensitivity);
        let newY = startDragPos.current.currentY + (dy * dragSensitivity);
        newX = Math.min(100, Math.max(0, newX));
        newY = Math.min(100, Math.max(0, newY));
        setCoverPhotoPosition(`${newX.toFixed(2)}% ${newY.toFixed(2)}%`);
    }, []);

    const handleCoverDragEnd = useCallback(() => {
        setIsDraggingCover(false);
        document.removeEventListener('mousemove', handleCoverDragging);
        document.removeEventListener('mouseup', handleCoverDragEnd);
    }, [handleCoverDragging]);

    const handleCoverDragStart = (e) => {
        if (!coverPhotoURL || isUploading || e.button !== 0) return;
        e.preventDefault();
        setIsDraggingCover(true);
        const { x: currentX, y: currentY } = getInitialPosition(coverPhotoPosition);
        startDragPos.current = { x: e.clientX, y: e.clientY, currentX, currentY };
        document.addEventListener('mousemove', handleCoverDragging);
        document.addEventListener('mouseup', handleCoverDragEnd);
    };

    // --- Upload Handlers ---
    const handleProfileFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploadingProfile(true);
        setProfileUploadProgress(0);
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true });
            const storage = getStorage();
            const storageRef = ref(storage, `profile_photos/${userProfile.id}/${Date.now()}_${compressedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, compressedFile);
            uploadTask.on('state_changed', 
                (snapshot) => setProfileUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => { console.error(error); alert("Upload failed."); setIsUploadingProfile(false); }, 
                () => getDownloadURL(uploadTask.snapshot.ref).then((url) => { setPhotoURL(url); setIsUploadingProfile(false); setProfileUploadProgress(100); })
            );
        } catch (error) { console.error(error); setIsUploadingProfile(false); }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        setUploadProgress(0);
        setCoverPhotoPosition('50% 50%');
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true });
            const storage = getStorage();
            const storageRef = ref(storage, `cover_photos/${userProfile.id}/${Date.now()}_${compressedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, compressedFile);
            uploadTask.on('state_changed', 
                (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => { console.error(error); alert("Upload failed."); setIsUploading(false); }, 
                () => getDownloadURL(uploadTask.snapshot.ref).then((url) => { setCoverPhotoURL(url); setIsUploading(false); setUploadProgress(100); })
            );
        } catch (error) { console.error(error); setIsUploading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) { alert("Names required."); return; }
        setLoading(true);
        try {
            await onUpdate({ 
                firstName, lastName, photoURL, coverPhotoURL, bio, work, education, 
                current_city, hometown, mobile_phone, relationship_status, 
                relationship_partner: (relationship_status === 'In a Relationship' || relationship_status === 'Married') ? relationship_partner : '',
                coverPhotoPosition
            });
        } catch (error) { console.error(error); alert("Failed to save."); }
        setLoading(false);
        onClose();
    };

    const handleChangePasswordClick = () => {
        onClose(); 
        setTimeout(() => setChangePasswordModalOpen(true), 100); 
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div 
                        key="modal-container"
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    >
                        {/* Backdrop - Reduced blur */}
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Modal Window */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="relative w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border"
                            style={{ 
                                backgroundColor: themeStyles.modalBg,
                                borderColor: themeStyles.borderColor
                            }}
                        >
                            {/* --- Header & Cover Photo --- */}
                            <div className="relative flex-shrink-0 group/cover">
                                {/* Close Button */}
                                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border border-white/20 shadow-sm transition-all">
                                    <IconX size={20} />
                                </button>

                                {/* Cover Photo Area */}
                                <div className="relative w-full h-40 bg-slate-800 overflow-hidden">
                                    <div 
                                        ref={coverPhotoRef}
                                        className={`w-full h-full relative ${coverPhotoURL && !isUploading ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                        onMouseDown={handleCoverDragStart}
                                    >
                                        {coverPhotoURL && !isUploading ? (
                                            <div
                                                className="w-full h-full transition-transform duration-300"
                                                style={{
                                                    backgroundImage: `url(${coverPhotoURL})`,
                                                    backgroundSize: 'cover',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: coverPhotoPosition,
                                                    pointerEvents: 'none', 
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                <IconCamera size={32} />
                                                <span className="text-xs font-bold uppercase tracking-wider mt-2 opacity-60">No Cover Photo</span>
                                            </div>
                                        )}

                                        {/* Uploading Overlay */}
                                        {isUploading && (
                                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                                <IconLoader className="animate-spin text-white mb-2" />
                                                <span className="text-white text-xs font-bold">{Math.round(uploadProgress)}%</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Drag Hint Overlay */}
                                    {coverPhotoURL && !isUploading && (
                                        <div className={`absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20 transition-opacity duration-300 ${isDraggingCover ? 'opacity-0' : 'opacity-0 group-hover/cover:opacity-100'}`}>
                                            <span className="text-white/80 text-xs font-bold uppercase tracking-widest drop-shadow-md">Drag to Reposition</span>
                                        </div>
                                    )}

                                    {/* Cover Upload Button */}
                                    <label className="absolute bottom-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white cursor-pointer transition-all border border-white/20 shadow-lg">
                                        <IconUpload size={16} />
                                        <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                                    </label>
                                </div>

                                {/* Profile Photo Area (Overlapping) */}
                                <div className="absolute -bottom-12 left-6">
                                    <div className="relative w-24 h-24 rounded-full p-1 bg-black/30 backdrop-blur-md ring-1 ring-white/20 shadow-2xl">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 relative">
                                            <UserInitialsAvatar user={{...userProfile, photoURL: photoURL}} size="full" className="w-full h-full text-3xl" effectsEnabled={false} />
                                            
                                            {/* Profile Upload Overlay */}
                                            <label className="absolute inset-0 bg-black/30 hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer group">
                                                <IconCamera className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all" />
                                                <input type="file" className="sr-only" accept="image/*" onChange={handleProfileFileChange} disabled={isUploadingProfile} />
                                            </label>

                                            {isUploadingProfile && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                                    <span className="text-white text-xs font-bold">{Math.round(profileUploadProgress)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Form Body --- */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar pt-14 px-6 pb-6">
                                <div className="space-y-6">
                                    <div>
                                        <h2 className={headingStyle + " text-2xl"} style={{ color: themeStyles.textColor }}>Edit Profile</h2>
                                        <p className="text-sm opacity-60" style={{ color: themeStyles.textColor }}>Update your personal details.</p>
                                    </div>

                                    {/* Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="firstName" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>First Name</label>
                                            <input 
                                                type="text" 
                                                id="firstName" 
                                                value={firstName} 
                                                onChange={(e) => setFirstName(e.target.value)} 
                                                className={glassInput}
                                                style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                                required 
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="lastName" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Last Name</label>
                                            <input 
                                                type="text" 
                                                id="lastName" 
                                                value={lastName} 
                                                onChange={(e) => setLastName(e.target.value)} 
                                                className={glassInput}
                                                style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Bio</label>
                                        <div 
                                            className="rounded-xl overflow-hidden border"
                                            style={{ backgroundColor: themeStyles.inputBg, borderColor: 'transparent', color: themeStyles.textColor }}
                                        >
                                            <ReactQuill theme="snow" value={bio} onChange={setBio} modules={quillModules} placeholder="Tell us about yourself..." />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="work" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Work</label>
                                            <input 
                                                type="text" 
                                                id="work" 
                                                value={work} 
                                                onChange={(e) => setWork(e.target.value)} 
                                                className={glassInput}
                                                style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                                placeholder="Where do you work?" 
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="education" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Education</label>
                                            <input 
                                                type="text" 
                                                id="education" 
                                                value={education} 
                                                onChange={(e) => setEducation(e.target.value)} 
                                                className={glassInput}
                                                style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                                placeholder="Where did you study?" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="current_city" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Current City</label>
                                                <input 
                                                    type="text" 
                                                    id="current_city" 
                                                    value={current_city} 
                                                    onChange={(e) => setCurrentCity(e.target.value)} 
                                                    className={glassInput}
                                                    style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="hometown" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Hometown</label>
                                                <input 
                                                    type="text" 
                                                    id="hometown" 
                                                    value={hometown} 
                                                    onChange={(e) => setHometown(e.target.value)} 
                                                    className={glassInput}
                                                    style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="mobile_phone" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Mobile Phone</label>
                                            <input 
                                                type="tel" 
                                                id="mobile_phone" 
                                                value={mobile_phone} 
                                                onChange={(e) => setMobilePhone(e.target.value)} 
                                                className={glassInput}
                                                style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Relationship Status</label>
                                                <CustomSelect value={relationship_status} onChange={setRelationshipStatus} options={relationshipOptions} placeholder="Select status..." themeStyles={themeStyles} />
                                            </div>
                                            {(relationship_status === 'In a Relationship' || relationship_status === 'Married') && (
                                                <div>
                                                    <label htmlFor="partner" className={labelStyle} style={{ color: themeStyles.textColor, opacity: 0.7 }}>Partner's Name</label>
                                                    <input 
                                                        type="text" 
                                                        id="partner" 
                                                        value={relationship_partner} 
                                                        onChange={(e) => setRelationshipPartner(e.target.value)} 
                                                        className={glassInput}
                                                        style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: 'transparent' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-8 space-y-3 pt-6 border-t" style={{ borderColor: themeStyles.borderColor }}>
                                    <button type="submit" disabled={loading || isUploading || isUploadingProfile} className={primaryButton}>
                                        {loading ? (
                                            <>
                                                <IconLoader className="animate-spin" size={18} />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <IconDeviceFloppy size={18} />
                                                <span>Save Changes</span>
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleChangePasswordClick} 
                                        className={`${secondaryButton} ${btnExtruded}`}
                                        style={{ backgroundColor: themeStyles.innerPanelBg, color: themeStyles.textColor }}
                                    >
                                        <IconKey size={16} />
                                        Change Password
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            {/* Global Styles for Quill Overrides */}
            <style>{`
                .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid rgba(200,200,200,0.2) !important; background: rgba(255,255,255,0.05); }
                .ql-container.ql-snow { border: none !important; font-family: inherit !important; }
                .ql-editor { min-height: 100px; font-size: 0.95rem; }
                .ql-stroke { stroke: currentColor !important; }
                .ql-fill { fill: currentColor !important; }
                .ql-picker { color: currentColor !important; }
                .ql-editor.ql-blank::before { color: rgba(150,150,150,0.5); font-style: normal; }
            `}</style>
        </>
    );
};

export default EditProfileModal;