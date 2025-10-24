// Create this new file at:
// src/components/student/DownloadAppModal.jsx

import React, { useState } from 'react';
import Modal from '../common/Modal'; // Using your existing Modal component
import { FiSmartphone, FiX } from 'react-icons/fi';

const DownloadAppModal = ({ isOpen, onClose }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('lms_hide_download_modal', 'true');
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <div className="flex flex-col p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <FiSmartphone className="mr-3 text-indigo-600" />
                        Get the Mobile App
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="text-gray-700 space-y-4">
                    <p>
                        For a better experience on your phone, you can download our native
                        Android app.
                    </p>
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                        <p className="font-semibold text-indigo-800">
                            How to Download:
                        </p>
                        <p className="text-indigo-700">
                            Click the **LMS Logo** in the sidebar at any time to
                            download the app (`.apk`) file.
                        </p>
                    </div>
                    <p className="text-sm text-gray-500">
                        You may need to "allow installs from unknown sources" in
                        your Android settings to install the app.
                    </p>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
                    <div className="flex items-center mb-4 sm:mb-0">
                        <input
                            type="checkbox"
                            id="dontShowAgain"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label
                            htmlFor="dontShowAgain"
                            className="ml-2 block text-sm text-gray-900"
                        >
                            Don't show this message again
                        </label>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-md font-semibold shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DownloadAppModal;