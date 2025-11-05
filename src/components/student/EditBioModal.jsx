import React, { useState } from 'react';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

const EditBioModal = ({ currentBio, onSubmit, onClose, isLoading, error, successMessage }) => {
  const [bio, setBio] = useState(currentBio || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(bio.trim());
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Edit Custom Bio">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bio Textarea */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Your Bio (Max 100 chars)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              maxLength={100}
              rows={4}
              placeholder="Write something about yourself..."
              className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
            />
            <p className="text-right text-xs text-slate-500 dark:text-slate-400 mt-1">
              {bio.length} / 100
            </p>
          </div>

          {/* Error and Success Message Display */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border-l-4 border-red-400 flex items-center gap-3 dark:bg-red-900/20 dark:border-red-500">
                <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="p-4 rounded-xl bg-green-50 border-l-4 border-green-400 flex items-center gap-3 dark:bg-green-900/20 dark:border-green-500">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          )}
          {/* END: Messages */}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-gray-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center min-w-[120px] px-5 py-2 rounded-xl bg-indigo-500 text-white shadow-md hover:bg-indigo-600 active:shadow-inner transition-all disabled:opacity-70 disabled:bg-indigo-400"
            >
              {isLoading ? <Spinner size="sm" /> : 'Save Bio'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default EditBioModal;