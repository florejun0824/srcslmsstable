// src/components/common/BiometricPrompt.jsx
import React, { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { useToast } from '../../contexts/ToastContext'; // <-- Adjust this path if needed
import { FingerPrintIcon, XMarkIcon } from '@heroicons/react/24/solid';

// This is the same modal UI from your LoginPage
const BiometricPromptModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 animate-fade-in">
      <div className="relative w-full max-w-sm p-8 bg-gray-100 dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark animate-fade-in-up">
        
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Modal Content */}
        <div className="text-center">
          <FingerPrintIcon className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400" />
          <h3 className="mt-4 text-2xl font-bold text-gray-800 dark:text-slate-100">
            Enable Biometric Login?
          </h3>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Would you like to use your fingerprint or face to log in next time?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            onClick={onCancel}
            className="h-12 font-semibold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-500 transition-all"
          >
            No, Thanks
          </button>
          <button
            onClick={onConfirm}
            className="h-12 font-semibold text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-2xl shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          >
            Yes, Enable
          </button>
        </div>
      </div>
    </div>
  );
};

// This is the component you will add to your main authenticated page
const BiometricPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    // On component mount, check if there are temporary credentials
    // that the LoginPage saved.
    const checkTempCredentials = async () => {
      const { value } = await Preferences.get({ key: 'tempUserCredentials' });
      if (value) {
        setTempCredentials(value);
        setShowPrompt(true);
      }
    };

    checkTempCredentials();
  }, []);

  const handleConfirm = async () => {
    try {
      // Save the credentials to the *permanent* key
      await Preferences.set({
        key: 'userCredentials',
        value: tempCredentials
      });
      showToast("Biometric login enabled!", 'success');
    } catch (error) {
      console.error("Failed to save biometric credentials:", error);
      showToast("Could not enable biometric login.", 'error');
    } finally {
      // Whether it succeeded or failed, remove the temp key and close modal
      await Preferences.remove({ key: 'tempUserCredentials' });
      setShowPrompt(false);
    }
  };

  const handleCancel = async () => {
    // User said no, just delete the temp credentials and close
    await Preferences.remove({ key: 'tempUserCredentials' });
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null; // Don't render anything if not needed
  }

  return (
    <BiometricPromptModal
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
};

export default BiometricPrompt;