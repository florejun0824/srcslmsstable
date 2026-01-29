import React, { useState, useEffect, Fragment, useCallback, useRef, useMemo } from 'react';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import { 
    IconPencil, 
    IconMail, 
    IconLogout,
    IconBriefcase,
    IconSchool,
    IconMapPin,
    IconPhone,
    IconHeart,
    IconLock,
    IconWorld,
    IconX,
    IconEdit,
    IconFingerprint,
    IconPhoto,
    IconTrash,
    IconCamera // Added IconCamera
} from '@tabler/icons-react';
import { Switch, Dialog, Transition, RadioGroup } from '@headlessui/react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { useToast } from '../../../../contexts/ToastContext';
import { useTheme } from '../../../../contexts/ThemeContext'; 
import { motion, AnimatePresence } from 'framer-motion';

// Firebase Imports
import { db } from '../../../../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
  limit,
  doc,       // Added
  updateDoc  // Added
} from 'firebase/firestore';

// Post Components & Hook
import { useStudentPosts } from '../../../../hooks/useStudentPosts';
import StudentPostCard from '../../../student/StudentPostCard';
import StudentPostCommentsModal from '../../../student/StudentPostCommentsModal';
import ReactionsBreakdownModal from '../../../common/ReactionsBreakdownModal';
import Spinner from '../../../common/Spinner';

// Import the student's "About" modal
import AboutInfoModal from '../../../student/AboutInfoModal';

// --- MACOS 26 DESIGN SYSTEM CONSTANTS ---

const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

const cardSurface = "bg-white/40 dark:bg-[#1F2229]/40 backdrop-blur-xl rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden transition-colors duration-500";
const glassInput = "w-full bg-slate-50/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";

const baseButtonStyles = `
    relative font-semibold rounded-full transition-all duration-300 
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed
`;

const primaryButton = `
    ${baseButtonStyles} px-6 py-2.5 text-sm text-white 
    bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
    shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)]
    border border-blue-400/20
`;

const secondaryButton = `
    ${baseButtonStyles} px-5 py-2.5 text-sm text-slate-700 dark:text-slate-200 
    bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 
    backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md
`;

const iconButton = `
    ${baseButtonStyles} p-2 text-slate-500 dark:text-slate-400 
    hover:bg-slate-100 dark:hover:bg-white/10 rounded-full border border-transparent hover:border-white/20
`;

// --- Helper: Monet/Theme Color Extraction ---
const getThemeCardStyle = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': 
            return { backgroundColor: 'rgba(15, 23, 66, 0.6)', borderColor: 'rgba(100, 116, 139, 0.2)' };
        case 'valentines': 
            return { backgroundColor: 'rgba(60, 10, 20, 0.6)', borderColor: 'rgba(255, 100, 100, 0.15)' };
        case 'graduation': 
            return { backgroundColor: 'rgba(30, 25, 10, 0.6)', borderColor: 'rgba(255, 215, 0, 0.15)' };
        case 'rainy': 
            return { backgroundColor: 'rgba(20, 35, 20, 0.6)', borderColor: 'rgba(100, 150, 100, 0.2)' };
        case 'cyberpunk': 
            return { backgroundColor: 'rgba(35, 5, 45, 0.6)', borderColor: 'rgba(180, 0, 255, 0.2)' };
        case 'spring': 
            return { backgroundColor: 'rgba(50, 10, 20, 0.6)', borderColor: 'rgba(255, 150, 180, 0.2)' };
        case 'space': 
            return { backgroundColor: 'rgba(5, 5, 10, 0.6)', borderColor: 'rgba(100, 100, 255, 0.15)' };
        default: 
            return {}; 
    }
};

// Helper for class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// --- Helper: Compress Image using Canvas ---
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024; 
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error('Canvas is empty'));
                    }
                }, 'image/jpeg', 0.7); 
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

// --- Create Post Modal ---
const CreateTeacherPostModal = ({ isOpen, onClose, userProfile, onSubmit, isPosting }) => {
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('Public');
    const { activeOverlay } = useTheme();
    
    // Memoize modal style to prevent recalculation on every keypress
    const modalStyle = useMemo(() => {
        const baseStyle = getThemeCardStyle(activeOverlay);
        return activeOverlay !== 'none' 
            ? { ...baseStyle, backgroundColor: baseStyle.backgroundColor.replace('0.6', '0.85') } 
            : {};
    }, [activeOverlay]);

    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const audienceOptions = [
        { name: 'Public', description: 'Visible to everyone in school.', icon: IconWorld },
        { name: 'Private', description: 'Only visible to you.', icon: IconLock },
    ];

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 100);
        } else {
            setContent('');
            setAudience('Public');
            setSelectedImages([]);
            setImagePreviews([]);
        }
    }, [isOpen]);

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (selectedImages.length + files.length > 5) {
            alert("You can only upload a maximum of 5 photos per post.");
            return;
        }

        const newImages = [];
        const newPreviews = [];

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            try {
                const compressedFile = await compressImage(file);
                newImages.push(compressedFile);
                newPreviews.push(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error("Error compressing image:", error);
            }
        }

        setSelectedImages(prev => [...prev, ...newImages]);
        setImagePreviews(prev => [...prev, ...newPreviews]);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (indexToRemove) => {
        URL.revokeObjectURL(imagePreviews[indexToRemove]);
        setSelectedImages(prev => prev.filter((_, index) => index !== indexToRemove));
        setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!content.trim() && selectedImages.length === 0) || isPosting) return;
        onSubmit(content, audience, selectedImages);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[999]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel 
                                style={modalStyle} 
                                className="w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] p-6 text-left align-middle shadow-2xl ring-1 ring-white/40 dark:ring-white/5 transition-all"
                            >
                                <form onSubmit={handleSubmit}>
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                                        <Dialog.Title as="h3" className={headingStyle + " text-lg"}>
                                            Create Post
                                        </Dialog.Title>
                                        <button type="button" onClick={onClose} className={iconButton}>
                                            <IconX size={20} />
                                        </button>
                                    </div>
                                    
                                    <div className="mt-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 flex-shrink-0 rounded-full shadow-md overflow-hidden ring-2 ring-white dark:ring-white/10">
                                                <UserInitialsAvatar user={userProfile} size="full" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                    {userProfile?.firstName} {userProfile?.lastName}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Sharing to Lounge
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <textarea
                                            ref={textareaRef}
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder={`What's on your mind, ${userProfile?.firstName}?`}
                                            className={`${glassInput} h-24 resize-none mb-3`}
                                        />

                                        {imagePreviews.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                {imagePreviews.map((src, index) => (
                                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-black/5 group">
                                                        <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index)}
                                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                                                        >
                                                            <IconX size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            multiple 
                                            ref={fileInputRef} 
                                            onChange={handleImageChange} 
                                            className="hidden" 
                                        />
                                        
                                        {selectedImages.length < 5 && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-lg transition-colors w-fit"
                                            >
                                                <IconPhoto size={20} />
                                                <span>{selectedImages.length > 0 ? 'Add More Photos' : 'Add Photos'}</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <RadioGroup value={audience} onChange={setAudience}>
                                            <RadioGroup.Label className={subHeadingStyle + " mb-2 block"}>Audience</RadioGroup.Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {audienceOptions.map((option) => (
                                                <RadioGroup.Option
                                                    key={option.name}
                                                    value={option.name}
                                                    className={({ active, checked }) =>
                                                    `${checked
                                                        ? 'bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
                                                        : 'bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10'
                                                    } relative flex cursor-pointer rounded-xl p-3 border border-white/10 transition-all focus:outline-none`
                                                    }
                                                >
                                                    {({ checked }) => (
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-full ${checked ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                                                                <option.icon size={16} />
                                                            </div>
                                                            <div>
                                                                <RadioGroup.Label as="p" className={`font-bold text-sm ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                    {option.name}
                                                                </RadioGroup.Label>
                                                                <RadioGroup.Description as="span" className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {option.description}
                                                                </RadioGroup.Description>
                                                            </div>
                                                        </div>
                                                    )}
                                                </RadioGroup.Option>
                                                ))}
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-white/10">
                                        <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
                                        <button
                                            type="submit"
                                            disabled={(!content.trim() && selectedImages.length === 0) || isPosting}
                                            className={primaryButton}
                                        >
                                            {isPosting ? <Spinner size="sm" className="text-white" /> : 'Post'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// Optimization: Memoize this component to prevent unnecessary list re-renders
const InfoRowPreview = React.memo(({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
            <Icon size={18} stroke={2} />
        </div>
        <div className="flex-grow min-w-0">
            <p className="font-semibold text-slate-700 dark:text-slate-200 truncate text-sm">{value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">{label}</p>
        </div>
    </div>
));


const ProfileView = ({
    user,
    userProfile,
    setEditProfileModalOpen,
    logout
}) => {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme();
    
    // Optimization: Memoize expensive style calculation
    const dynamicCardStyle = useMemo(() => getThemeCardStyle(activeOverlay), [activeOverlay]);

    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isLoadingBiometrics, setIsLoadingBiometrics] = useState(true);
    
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const [myPosts, setMyPosts] = useState([]); 
    const [isPostsLoading, setIsPostsLoading] = useState(true);

    // --- Profile Photo Upload State & Refs ---
    const [isUploadingProfile, setIsUploadingProfile] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const profileInputRef = useRef(null);
    const coverInputRef = useRef(null);

    const {
            sortedPosts,
            editingPostId,
            editingPostText,
            setEditingPostText,
            expandedPosts,
            reactionsModalPost,
            isReactionsModalOpen,
            commentModalPost,
            isCommentModalOpen,
            handleStartEditPost,
            handleCancelEdit,
            handleUpdatePost,
            handleDeletePost,
            togglePostExpansion,
            handleToggleReaction,
            handleViewReactions,
            handleCloseReactions,
            handleViewComments,
            handleCloseComments,
        } = useStudentPosts(myPosts, setMyPosts, userProfile, showToast); 

    useEffect(() => {
        let mounted = true;
        const checkBiometricStatus = async () => {
            try {
                const { isAvailable } = await BiometricAuth.checkBiometry();
                if (mounted) {
                    setIsBiometricSupported(isAvailable);

                    if (isAvailable) {
                        const { value } = await Preferences.get({ key: 'userCredentials' });
                        setIsBiometricEnabled(!!value);
                    }
                }
            } catch (error) {
                console.error("Failed to check biometric status:", error);
                if (mounted) setIsBiometricSupported(false);
            } finally {
                if (mounted) setIsLoadingBiometrics(false);
            }
        };
        checkBiometricStatus();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!userProfile?.id) { 
            setIsPostsLoading(false);
            setMyPosts([]);
            return;
        }
        setIsPostsLoading(true);
        const postsQuery = query(
            collection(db, 'studentPosts'),
            where('authorId', '==', userProfile.id),
            orderBy('createdAt', 'desc'),
            limit(20) // Optimization: Limit initial fetch to 20 posts
        );
        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMyPosts(posts);
            setIsPostsLoading(false);
        }, (error) => {
            console.error("Error fetching student posts:", error);
            showToast("Could not load your posts.", "error");
            setIsPostsLoading(false);
        });
        return () => unsubscribe();
    }, [userProfile?.id, showToast]);

    const handleBiometricToggle = useCallback(async (enabled) => {
        if (enabled) {
            showToast("Please log out and log in with your password to enable biometrics.", "info");
        } else {
            try {
                await Preferences.remove({ key: 'userCredentials' });
                setIsBiometricEnabled(false);
                showToast("Biometric Login Disabled", "success");
            } catch (error) {
                console.error("Failed to disable biometrics:", error);
                showToast("Could not disable biometric login.", "error");
            }
        }
    }, [showToast]);

    // --- Handle Cloudinary Upload for Profile/Cover ---
    const handlePhotoUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input so same file can be selected again if needed
        e.target.value = null;

        const isProfile = type === 'profile';
        const setLoading = isProfile ? setIsUploadingProfile : setIsUploadingCover;
        const fieldName = isProfile ? 'photoURL' : 'coverPhotoURL';

        setLoading(true);

        try {
            // 1. Compress Image
            const compressedFile = await compressImage(file);

            // 2. Upload to Cloudinary
            const cloudName = "de2uhc6gl"; 
            const uploadPreset = "teacher_posts"; // Using the same preset/folder as requested
            const folder = "teacher_posts";

            const formData = new FormData();
            formData.append("file", compressedFile);
            formData.append("upload_preset", uploadPreset);
            formData.append("folder", folder);

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, 
                { method: "POST", body: formData }
            );

            if (!response.ok) throw new Error("Image upload failed");
            const data = await response.json();
            const imageUrl = data.secure_url;

            // 3. Update Firestore User Profile
            // NOTE: Assuming collection is 'users'. If your app uses 'teachers', change 'users' to 'teachers' below.
            const userRef = doc(db, 'users', userProfile.id);
            await updateDoc(userRef, {
                [fieldName]: imageUrl
            });

            showToast(`${isProfile ? 'Profile picture' : 'Cover photo'} updated!`, "success");

        } catch (error) {
            console.error("Upload failed:", error);
            showToast("Failed to upload image. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- Handle Create Post (Multiple Images to Cloudinary) ---
    const handleCreatePost = useCallback(async (content, audience, imageFiles) => {
        if (!content.trim() && (!imageFiles || imageFiles.length === 0)) { 
            showToast("Post cannot be empty.", "error");
            return; 
        }

        setIsCreatingPost(true);
        try {
            let uploadedImageUrls = [];

            if (imageFiles && imageFiles.length > 0) {
                const cloudName = "de2uhc6gl"; 
                const uploadPreset = "teacher_posts"; 
                
                const uploadPromises = imageFiles.map(async (file) => {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("upload_preset", uploadPreset);
                    formData.append("folder", "teacher_posts"); 

                    const response = await fetch(
                        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, 
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                    if (!response.ok) throw new Error("Image upload failed");
                    const data = await response.json();
                    return data.secure_url;
                });

                uploadedImageUrls = await Promise.all(uploadPromises);
            }

            await addDoc(collection(db, 'studentPosts'), {
                authorId: userProfile.id,
                authorName: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
                authorPhotoURL: userProfile.photoURL || '',
                
                schoolId: userProfile.schoolId || 'srcs_main', 

                content: content,
                images: uploadedImageUrls, 
                imageURL: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : '', 
                audience: audience,
                createdAt: serverTimestamp(),
                reactions: {},
                commentsCount: 0
            });
            
            showToast("Post created successfully!", "success");
            setIsCreatePostModalOpen(false);
        } catch (err) {
            console.error("Error creating post:", err);
            showToast(`Failed to create post: ${err.message}`, "error");
        } finally {
            setIsCreatingPost(false);
        }
    }, [userProfile, showToast]);

    // Optimization: Memoize the list calculation
    const aboutInfoPreviewList = useMemo(() => {
        return [
            { icon: IconBriefcase, label: "Work", value: userProfile?.work },
            { icon: IconSchool, label: "Education", value: userProfile?.education },
            { icon: IconMapPin, label: "Lives in", value: userProfile?.current_city },
        ].filter(item => item.value && item.value.trim() !== '');
    }, [userProfile?.work, userProfile?.education, userProfile?.current_city]);

    const aboutInfoPreview = aboutInfoPreviewList.slice(0, 3);
    
    // Handlers for modal states to avoid inline functions
    const openCreatePost = useCallback(() => setIsCreatePostModalOpen(true), []);
    const closeCreatePost = useCallback(() => setIsCreatePostModalOpen(false), []);
    const openAboutModal = useCallback(() => setIsAboutModalOpen(true), []);
    const closeAboutModal = useCallback(() => setIsAboutModalOpen(false), []);
    const openEditProfile = useCallback(() => setEditProfileModalOpen(true), []);

    // Helper trigger functions for file inputs
    const triggerProfileUpload = () => profileInputRef.current?.click();
    const triggerCoverUpload = () => coverInputRef.current?.click();

    return (
        <>
            {/* Hidden File Inputs */}
            <input 
                type="file" 
                ref={profileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handlePhotoUpload(e, 'profile')}
            />
            <input 
                type="file" 
                ref={coverInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handlePhotoUpload(e, 'cover')}
            />

            <div className="max-w-7xl mx-auto w-full space-y-8 py-8 px-4 sm:px-6 font-sans">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column (Profile Card) */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                        <div className={cardSurface} style={dynamicCardStyle}>
                            
                            {/* COVER PHOTO SECTION */}
                            <div className="relative h-48 w-full bg-slate-200 dark:bg-slate-700 group">
                                {isUploadingCover ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
                                        <Spinner size="md" className="text-white" />
                                    </div>
                                ) : (
                                    <button 
                                        onClick={triggerCoverUpload}
                                        className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-md"
                                        title="Change Cover Photo"
                                    >
                                        <IconCamera size={18} />
                                    </button>
                                )}
                                
                                {userProfile?.coverPhotoURL && (
                                    <div
                                        className="w-full h-full opacity-90 transition-transform duration-700"
                                        style={{
                                            backgroundImage: `url(${userProfile.coverPhotoURL})`,
                                            backgroundSize: 'cover',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: userProfile.coverPhotoPosition || '50% 50%',
                                        }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                            </div>

                            <div className="relative px-6 pb-6">
                                <div className="relative -mt-16 mb-3 flex justify-between items-end">
                                    
                                    {/* PROFILE PICTURE SECTION */}
                                    <div className="relative w-32 h-32 group cursor-pointer" onClick={triggerProfileUpload}>
                                        <div className="relative w-full h-full rounded-full p-1.5 bg-white/30 dark:bg-black/30 backdrop-blur-md shadow-2xl ring-1 ring-white/20">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-800 relative">
                                                {isUploadingProfile && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                                                        <Spinner size="sm" className="text-white" />
                                                    </div>
                                                )}
                                                
                                                {/* Overlay on Hover */}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <IconCamera className="text-white" size={24} />
                                                </div>

                                                {userProfile?.photoURL ? (
                                                    <img src={userProfile.photoURL} alt={userProfile?.firstName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} id={userProfile.id} size="full" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={openEditProfile} className="mb-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/20 hover:bg-white dark:hover:bg-white/20 transition-all flex items-center gap-2">
                                        <IconEdit size={14} /> Edit
                                    </button>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        {userProfile?.firstName} {userProfile?.lastName}
                                    </h2>
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mt-1">
                                        {userProfile?.role || "Teacher"}
                                    </p>
                                    {userProfile?.bio && <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4" dangerouslySetInnerHTML={{ __html: userProfile.bio }} />}
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-t border-white/10 space-y-4">
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400"><IconMail size={18} /></div>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate text-sm">{userProfile?.email}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Email</p>
                                    </div>
                                </div>
                                {aboutInfoPreview.map(item => (<InfoRowPreview key={item.label} icon={item.icon} label={item.label} value={item.value} />))}
                                <button onClick={openAboutModal} className="w-full py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-2">View Full Profile Details</button>
                            </div>
                        </div>

                        {/* Security Card */}
                        {isBiometricSupported && !isLoadingBiometrics && (
                            <div className={cardSurface + " p-6"} style={dynamicCardStyle}>
                                <div className="flex items-center gap-3 mb-4 text-slate-800 dark:text-white">
                                    <IconFingerprint size={20} className="text-emerald-500" />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">Security</h3>
                                </div>
                                <Switch.Group as="div" className="flex items-center justify-between">
                                    <span className="flex-grow flex flex-col">
                                        <Switch.Label as="span" className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Biometric Login</Switch.Label>
                                        <Switch.Description as="span" className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isBiometricEnabled ? "Enabled" : "Disabled"}</Switch.Description>
                                    </span>
                                    <Switch checked={isBiometricEnabled} onChange={handleBiometricToggle} className={classNames(isBiometricEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2')}>
                                        <span aria-hidden="true" className={classNames(isBiometricEnabled ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out')} />
                                    </Switch>
                                </Switch.Group>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Feed) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className={cardSurface + " p-4 sm:p-6"} style={dynamicCardStyle}>
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full ring-2 ring-white dark:ring-white/10 overflow-hidden shadow-sm">
                                    <UserInitialsAvatar user={userProfile} size="full" />
                                </div>
                                <button onClick={openCreatePost} className="flex-1 text-left h-12 px-6 rounded-full bg-slate-100 dark:bg-white/5 border border-transparent hover:border-blue-500/30 hover:bg-white dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all shadow-inner text-sm font-medium">
                                    What's on your mind, {userProfile?.firstName}?
                                </button>
                                <button onClick={openCreatePost} className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    <IconPhoto size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Activity Feed</h3>
                            </div>
                            {isPostsLoading ? (
                                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                            ) : myPosts.length === 0 ? (
                                <div className={`${cardSurface} p-12 text-center flex flex-col items-center justify-center`} style={dynamicCardStyle}>
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4"><IconPencil size={32} className="text-slate-400" /></div>
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No Posts Yet</h3>
                                    <button onClick={openCreatePost} className="mt-6 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Create your first post</button>
                                </div>
                            ) : (
                                sortedPosts.map(post => (
                                    <StudentPostCard
                                        key={post.id}
                                        post={post}
                                        author={userProfile}
                                        userProfile={userProfile}
                                        canReact={true}
                                        onStartEdit={handleStartEditPost}
                                        onDelete={handleDeletePost}
                                        onToggleReaction={handleToggleReaction}
                                        onViewComments={handleViewComments}
                                        onViewReactions={handleViewReactions}
                                        onToggleExpansion={togglePostExpansion}
                                        isEditing={editingPostId === post.id}
                                        editingPostText={editingPostId === post.id ? editingPostText : ''}
                                        onTextChange={setEditingPostText}
                                        onSave={handleUpdatePost}
                                        onCancelEdit={handleCancelEdit}
                                        isExpanded={!!expandedPosts[post.id]}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isAboutModalOpen && <AboutInfoModal isOpen={isAboutModalOpen} onClose={closeAboutModal} userProfile={userProfile} />}
            </AnimatePresence>
            
            <AnimatePresence>
                {isCreatePostModalOpen && (
                    <CreateTeacherPostModal
                        isOpen={isCreatePostModalOpen}
                        onClose={closeCreatePost}
                        onSubmit={handleCreatePost}
                        userProfile={userProfile}
                        isPosting={isCreatingPost}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCommentModalOpen && (
                    <StudentPostCommentsModal
                        isOpen={isCommentModalOpen}
                        onClose={handleCloseComments}
                        post={commentModalPost}
                        userProfile={userProfile}
                        onToggleReaction={handleToggleReaction} 
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isReactionsModalOpen && (
                    <ReactionsBreakdownModal
                        isOpen={isReactionsModalOpen}
                        onClose={handleCloseReactions}
                        reactionsData={reactionsModalPost?.reactions}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default ProfileView;