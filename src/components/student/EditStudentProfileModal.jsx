import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react'; // <-- MODIFIED: Added Fragment
import Spinner from '../common/Spinner';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

import { motion } from 'framer-motion';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';
// --- MODIFIED: Added CheckIcon and ChevronUpDownIcon ---
import { CameraIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
// --- MODIFIED: Added Listbox and Transition ---
import { Listbox, Transition } from '@headlessui/react';


const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],        
    ['link'], // Simplified for students
    [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
    ['clean']                               
  ],
};

// --- MODIFIED: Added responsive font size to Quill editor ---
const quillEditorStyles = `
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
        font-size: 0.875rem !important; /* text-sm */
        color: var(--tw-text-slate-800, rgba(30, 41, 59, 1)) !important;
        padding: 12px 8px !important;
    }
    .dark .neumorphic-quill-editor .ql-editor {
        color: var(--tw-text-slate-100, rgba(241, 245, 249, 1)) !important;
    }
    @media (min-width: 640px) {
      .neumorphic-quill-editor .ql-editor {
        font-size: 1rem !important; /* sm:text-base */
      }
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
`;

// --- NEW: Options for the custom dropdown ---
const relationshipOptions = [
  { value: '', name: 'Select status...' },
  { value: 'Single', name: 'Single' },
  { value: 'In a Relationship', name: 'In a Relationship' },
  { value: 'Married', name: 'Married' },
  { value: 'Complicated', name: 'Complicated' },
  { value: 'Widowed', name: 'Widowed' },
];


const EditStudentProfileModal = ({ 
    user, 
    canSetBio, 
    onSubmit, 
    onClose, 
    isLoading, 
    error, 
    successMessage 
}) => {
  // --- (All state and handlers remain exactly the same) ---
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [gender, setGender] = useState(user.gender || 'Not specified');
  const [customBio, setCustomBio] = useState(user.customBio || ''); 
  const [coverPhotoURL, setCoverPhotoURL] = useState(user.coverPhotoURL || '');
  const [coverPhotoPosition, setCoverPhotoPosition] = useState(user.coverPhotoPosition || '50% 50%');
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const coverPhotoRef = useRef(null);
  const startDragPos = useRef({ x: 0, y: 0, currentX: 50, currentY: 50 });
  const [work, setWork] = useState(user.work || '');
  const [education, setEducation] = useState(user.education || '');
  const [current_city, setCurrentCity] = useState(user.current_city || '');
  const [hometown, setHometown] = useState(user.hometown || '');
  const [mobile_phone, setMobilePhone] = useState(user.mobile_phone || '');
  const [relationship_status, setRelationshipStatus] = useState(user.relationship_status || '');
  const [relationship_partner, setRelationshipPartner] = useState(user.relationship_partner || '');
  const [isUploadingCover, setIsUploadingCover] = useState(false); 
  const [coverUploadProgress, setCoverUploadProgress] = useState(0); 
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
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
  }, [coverPhotoRef]);
  const handleCoverDragEnd = useCallback(() => {
      setIsDraggingCover(false);
      document.removeEventListener('mousemove', handleCoverDragging);
      document.removeEventListener('mouseup', handleCoverDragEnd);
  }, [handleCoverDragging]);
  const handleCoverDragStart = (e) => {
      if (!coverPhotoURL || isUploadingCover || e.button !== 0) return;
      e.preventDefault();
      setIsDraggingCover(true);
      const { x: currentX, y: currentY } = getInitialPosition(coverPhotoPosition);
      startDragPos.current = { x: e.clientX, y: e.clientY, currentX, currentY };
      document.addEventListener('mousemove', handleCoverDragging);
      document.addEventListener('mouseup', handleCoverDragEnd);
  };
  const handleProfileFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploadingProfile(true);
    setProfileUploadProgress(0);
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
    try {
        const compressedFile = await imageCompression(file, options);
        const storage = getStorage();
        const storageRef = ref(storage, `profile_photos/${user.id}/${Date.now()}_${compressedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);
        uploadTask.on('state_changed', 
            (snapshot) => setProfileUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => {
                console.error("Profile photo upload failed:", error);
                setIsUploadingProfile(false);
            }, 
            () => getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                setPhotoURL(downloadURL);
                setIsUploadingProfile(false);
                setProfileUploadProgress(100);
            })
        );
    } catch (error) {
        console.error("Compression or upload error:", error);
        setIsUploadingProfile(false);
    }
  };
  const handleCoverFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploadingCover(true);
    setCoverUploadProgress(0);
    setCoverPhotoPosition('50% 50%'); // Reset position
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
    try {
        const compressedFile = await imageCompression(file, options);
        const storage = getStorage();
        const storageRef = ref(storage, `cover_photos/${user.id}/${Date.now()}_${compressedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);
        uploadTask.on('state_changed', 
            (snapshot) => setCoverUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => {
                console.error("Cover photo upload failed:", error);
                setIsUploadingCover(false);
            }, 
            () => getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                setCoverPhotoURL(downloadURL); 
                setIsUploadingCover(false);
                setCoverUploadProgress(100);
            })
        );
    } catch (error) {
        console.error("Compression or upload error:", error);
        setIsUploadingCover(false);
    }
  };
  const handleSubmit = (e) => {
    let bioToSave = customBio;
    if (customBio === '<p><br></p>' || customBio === '') {
      bioToSave = '';
    }
    const finalRelationshipPartner = (relationship_status === 'In a Relationship' || relationship_status === 'Married') 
        ? relationship_partner 
        : '';
    const updates = { 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        photoURL: photoURL.trim(), 
        gender,
        customBio: bioToSave,
        coverPhotoURL,
        coverPhotoPosition,
        work: work.trim(),
        education: education.trim(),
        current_city: current_city.trim(),
        hometown: hometown.trim(),
        mobile_phone: mobile_phone.trim(),
        relationship_status,
        relationship_partner: finalRelationshipPartner,
    };
    onSubmit(updates);
  };
  const canUploadProfilePic = user.canUploadProfilePic || false;
  const canUploadCover = user.canUploadCover || false;
  const canUpdateInfo = user.canUpdateInfo || false;
  // --- (End of handlers) ---


  return (
    <>
      <style>{quillEditorStyles}</style>
      
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          className="relative w-full max-w-md sm:max-w-lg md:max-w-2xl bg-neumorphic-base shadow-neumorphic rounded-3xl dark:bg-neumorphic-base-dark dark:shadow-lg overflow-hidden max-h-[90vh] flex flex-col"
        >
          <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark z-20"
              aria-label="Close"
          >
              <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          
          <div className="pt-8 pb-4 px-6 text-center border-b border-slate-300/50 dark:border-slate-700 flex-shrink-0">
              <h2 id="modal-title" className="text-2xl font-bold text-slate-900 leading-tight dark:text-slate-100">
                Edit Profile
              </h2>
              <p className="text-sm text-slate-600 mt-1 dark:text-slate-300">
                Update your personal information.
              </p>
          </div>

          <form className="flex flex-col flex-grow overflow-hidden">
            <div className="space-y-5 p-6 flex-grow overflow-y-auto">
              
              {/* Profile Picture Upload (Conditional) */}
              {canUploadProfilePic && (
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                          Profile Picture (Lvl 5+)
                      </label>
                      <div className="flex items-center gap-4">
                          <div className="relative w-20 h-20 flex-shrink-0">
                              {photoURL ? (
                                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" />
                              ) : (
                                  <UserInitialsAvatar firstName={firstName} lastName={lastName} size="full" />
                              )}
                              {isUploadingProfile && (
                                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-full">
                                      <Spinner size="sm" />
                                  </div>
                              )}
                          </div>
                          <label 
                              htmlFor="profile-photo-upload" 
                              className="cursor-pointer px-4 py-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-gray-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all text-sm font-medium"
                          >
                              <span className="flex items-center gap-2"><ArrowUpTrayIcon className="w-4 h-4" /> Upload Photo</span>
                              <input 
                                  id="profile-photo-upload" 
                                  type="file" 
                                  className="sr-only" 
                                  accept="image/png, image/jpeg, image/webp"
                                  onChange={handleProfileFileChange}
                                  disabled={isUploadingProfile}
                              />
                          </label>
                      </div>
                      {isUploadingProfile && (
                          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 dark:bg-slate-700">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${profileUploadProgress}%` }}></div>
                          </div>
                      )}
                  </div>
              )}

              {/* Cover Photo Upload (Conditional) */}
              {canUploadCover && (
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                          Cover Photo (Lvl 10+)
                          {coverPhotoURL && (
                              <span className={`text-xs ml-2 font-normal ${isDraggingCover ? 'text-blue-500' : 'text-slate-500'}`}>
                                  ({isDraggingCover ? 'Dragging...' : 'Click and drag to reposition'})
                              </span>
                          )}
                      </label>
                      <div 
                          ref={coverPhotoRef}
                          className={`relative w-full h-32 rounded-xl bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark overflow-hidden transition-shadow ${coverPhotoURL && !isUploadingCover ? 'cursor-grab' : ''} ${isDraggingCover ? 'cursor-grabbing' : ''}`}
                          onMouseDown={handleCoverDragStart}
                      >
                          {coverPhotoURL && !isUploadingCover && (
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
                          {!coverPhotoURL && !isUploadingCover && (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                  <CameraIcon className="w-8 h-8" />
                                  <span className="text-sm mt-1">No cover photo</span>
                              </div>
                          )}
                          <label 
                              htmlFor="cover-photo-upload" 
                              className="absolute z-10 bottom-2 right-2 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-all hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark cursor-pointer"
                              onMouseDown={(e) => e.stopPropagation()} 
                          >
                              <ArrowUpTrayIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                              <input 
                                  id="cover-photo-upload" 
                                  type="file" 
                                  className="sr-only" 
                                  accept="image/png, image/jpeg, image/webp"
                                  onChange={handleCoverFileChange}
                                  disabled={isUploadingCover}
                              />
                          </label>
                          {isUploadingCover && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/70">
                                  <div className="w-full">
                                      <p className="text-white text-sm text-center mb-2">Uploading...</p>
                                      <div className="w-full bg-slate-500 rounded-full h-1.5">
                                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${coverUploadProgress}%` }}></div>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {/* Responsive grid for names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    // --- MODIFIED: Added responsive text size ---
                    className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    // --- MODIFIED: Added responsive text size ---
                    className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                  />
                </div>
              </div>


              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  // --- MODIFIED: Added responsive text size ---
                  className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                >
                  <option value="Not specified">Not specified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Custom Bio (Conditional) */}
              {canSetBio && (
                <div className="bio-editor-container">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Custom Bio (Lvl 15+)
                  </label>
                  <div className="neumorphic-quill-editor rounded-xl overflow-hidden shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark">
                    <ReactQuill
                      theme="snow"
                      value={customBio}
                      onChange={setCustomBio} 
                      modules={quillModules}
                      placeholder="Write something about yourself..."
                    />
                  </div>
                </div>
              )}

              {/* "About Me" Fields (Conditional) */}
              {canUpdateInfo && (
                  <div className="space-y-4 pt-4 border-t border-slate-300/50 dark:border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                          About Me (Lvl 20+)
                      </h3>
                      
                      {/* Responsive grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Work */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Work</label>
                            <input
                                type="text"
                                value={work}
                                onChange={(e) => setWork(e.target.value)}
                                placeholder="e.g., Works at SRCS"
                                // --- MODIFIED: Added responsive text size ---
                                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                        
                        {/* Education */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Education</label>
                            <input
                                type="text"
                                value={education}
                                onChange={(e) => setEducation(e.target.value)}
                                placeholder="e.g., Studied at..."
                                // --- MODIFIED: Added responsive text size ---
                                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                        
                        {/* Current City */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Current City</label>
                            <input
                                type="text"
                                value={current_city}
                                onChange={(e) => setCurrentCity(e.target.value)}
                                placeholder="e.g., Kabankalan"
                                // --- MODIFIED: Added responsive text size ---
                                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                        
                        {/* Hometown */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Hometown</label>
                            <input
                                type="text"
                                value={hometown}
                                onChange={(e) => setHometown(e.target.value)}
                                placeholder="e.g., Kabankalan"
                                // --- MODIFIED: Added responsive text size ---
                                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                        
                        {/* Mobile Phone */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Mobile Phone</label>
                            <input
                                type="tel"
                                value={mobile_phone}
                                onChange={(e) => setMobilePhone(e.target.value)}
                                placeholder="e.g., 0912 345 6789"
                                // --- MODIFIED: Added responsive text size ---
                                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                        
                        {/* --- REPLACED: Swapped <select> for <Listbox> --- */}
                        <div>
                            <Listbox value={relationship_status} onChange={setRelationshipStatus}>
                                <div className="relative">
                                    <Listbox.Label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                        Relationship Status
                                    </Listbox.Label>
                                    <Listbox.Button className="relative w-full cursor-default rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark p-3 pr-10 text-left text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base">
                                        <span className="block truncate">{relationship_status || 'Select status...'}</span>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon
                                                className="h-5 w-5 text-gray-400"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </Listbox.Button>
                                    <Transition
                                        as={Fragment}
                                        leave="transition ease-in duration-100"
                                        leaveFrom="opacity-100"
                                        leaveTo="opacity-0"
                                    >
                                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark py-1 text-base shadow-neumorphic dark:shadow-neumorphic-dark ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            {relationshipOptions.map((option, optionIdx) => (
                                                <Listbox.Option
                                                    key={optionIdx}
                                                    className={({ active }) =>
                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                        active ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-slate-100'
                                                        }`
                                                    }
                                                    value={option.value}
                                                >
                                                    {({ selected }) => (
                                                        <>
                                                            <span
                                                                className={`block truncate ${
                                                                selected ? 'font-medium' : 'font-normal'
                                                                }`}
                                                            >
                                                                {option.name}
                                                            </span>
                                                            {selected ? (
                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 dark:text-indigo-400">
                                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </Listbox.Option>
                                            ))}
                                        </Listbox.Options>
                                    </Transition>
                                </div>
                            </Listbox>
                        </div>
                        {/* --- END REPLACEMENT --- */}

                      </div>

                      {/* Conditional Partner Field (spans full width) */}
                      {(relationship_status === 'In a Relationship' || relationship_status === 'Married') && (
                          <div className="pt-2">
                              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Partner's Name</label>
                              <input
                                  type="text"
                                  value={relationship_partner}
                                  onChange={(e) => setRelationshipPartner(e.target.value)}
                                  placeholder="e.g., Jane Doe"
                                  // --- MODIFIED: Added responsive text size ---
                                  className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all text-sm sm:text-base"
                              />
                          </div>
                      )}

                  </div>
              )}

            </div>
            {/* --- END of scrollable part --- */}

            {/* --- MODIFIED: Added flex-shrink-0 --- */}
            <div className="p-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
                {/* Error and Success Message Display */}
                {error && (
                  <div className="mb-4 p-4 rounded-xl bg-red-50 border-l-4 border-red-400 flex items-center gap-3 dark:bg-red-900/20 dark:border-red-500">
                      <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="mb-4 p-4 rounded-xl bg-green-50 border-l-4 border-green-400 flex items-center gap-3 dark:bg-green-900/20 dark:border-green-500">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button" 
                    onClick={onClose}
                    disabled={isLoading || isUploadingCover || isUploadingProfile}
                    className="px-5 py-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-gray-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || isUploadingCover || isUploadingProfile}
                    className="flex items-center justify-center min-w-[140px] px-5 py-2 rounded-xl bg-indigo-500 text-white shadow-md hover:bg-indigo-600 active:shadow-inner transition-all disabled:opacity-70 disabled:bg-indigo-400"
                  >
                    {isLoading ? <Spinner size="sm" /> : 'Save Changes'}
                  </button>
                </div>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default EditStudentProfileModal;