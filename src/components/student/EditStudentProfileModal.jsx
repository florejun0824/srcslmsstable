import React, { useState } from 'react';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

import ReactQuill from 'react-quill';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],        
    ['link', 'image'],                      
    [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
    ['clean']                               
  ],
};

const EditStudentProfileModal = ({ user, canSetBio, onSubmit, onClose, isLoading, error, successMessage }) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [gender, setGender] = useState(user.gender || 'Not specified');
  const [customBio, setCustomBio] = useState(user.customBio || ''); 

  const handleSubmit = (e) => {
    // e.preventDefault(); // No longer needed, as this isn't a form-level event
    
    let bioToSave = customBio;
    if (customBio === '<p><br></p>' || customBio === '') {
      bioToSave = '';
    }

    const updates = { 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        photoURL: photoURL.trim(), 
        gender,
        customBio: bioToSave 
    };
    onSubmit(updates);
  };

  return (
    <>
      <Modal 
        isOpen={true} 
        onClose={onClose} 
        title="Edit Your Profile"
        contentClassName="p-0 h-full flex flex-col"
      >
        {/* --- MODIFIED: Removed onSubmit and onKeyDown from <form> --- */}
        <form className="flex flex-col h-full">
        
          {/* --- This is the SCROLLABLE part --- */}
          <div className="space-y-5 overflow-y-auto p-6">
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
                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
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
                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Profile Picture URL */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Profile Picture URL
              </label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
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
                  Custom Bio
                </label>
                <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <ReactQuill
                    theme="snow"
                    value={customBio}
                    onChange={setCustomBio} 
                    modules={quillModules}
                    placeholder="Write something about yourself... You can add image links!"
                  />
                </div>
              </div>
            )}
          </div>
          {/* --- END of scrollable part --- */}

          {/* --- This is the STICKY FOOTER part --- */}
          <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 dark:border-slate-700">
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
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-gray-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                {/* --- MODIFIED: Changed type to "button" and added onClick --- */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center justify-center min-w-[140px] px-5 py-2 rounded-xl bg-indigo-500 text-white shadow-md hover:bg-indigo-600 active:shadow-inner transition-all disabled:opacity-70 disabled:bg-indigo-400"
                >
                  {isLoading ? <Spinner size="sm" /> : 'Save Changes'}
                </button>
              </div>
          </div>
          {/* --- END of sticky footer --- */}
        </form>
      </Modal>
    </>
  );
};

export default EditStudentProfileModal;