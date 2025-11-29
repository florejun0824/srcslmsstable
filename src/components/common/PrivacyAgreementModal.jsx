import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from './Modal';
import PrivacyPolicyContent, { POLICY_VERSION } from '../PrivacyPolicyContent'; // Import the shared content

// This key will be used in localStorage
const PRIVACY_STORAGE_KEY = 'hasAcceptedPrivacyAgreement';

const PrivacyAgreementModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const { userProfile, firestoreService, refreshUserProfile } = useAuth();

  useEffect(() => {
    if (!userProfile) return;

    const localAcceptance = localStorage.getItem(PRIVACY_STORAGE_KEY);
    const profileAcceptance = userProfile?.privacyPolicyAcceptance;

    const isLocalVersionCurrent = localAcceptance === POLICY_VERSION;
    const isProfileVersionCurrent = profileAcceptance?.version === POLICY_VERSION;

    if (!isLocalVersionCurrent && !isProfileVersionCurrent) {
      setIsOpen(true);
    }
  }, [userProfile]);

  const handleAccept = async () => {
    if (isAccepted) {
      localStorage.setItem(PRIVACY_STORAGE_KEY, POLICY_VERSION);
    }

    if (userProfile?.id && firestoreService) {
      try {
        const acceptanceData = {
            version: POLICY_VERSION,
            acceptedAt: new Date(),
        };

        await firestoreService.updateUserProfile(userProfile.id, {
          hasAcceptedPrivacy: true,
          privacyPolicyAcceptance: acceptanceData,
        });
        
        await refreshUserProfile(); 
      } catch (err) {
        console.error("Failed to update privacy status:", err);
      }
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} 
      showCloseButton={false} 
      title="Privacy & Data Agreement"
      size="2xl"
      containerClassName="z-[150]" 
    >
      <div className="flex flex-col space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          To continue using the SRCS Learning Portal (v{POLICY_VERSION}), please review and accept our data privacy agreement.
        </p>

        {/* Scrollable Privacy Text - Using the Component */}
        <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800">
           <PrivacyPolicyContent />
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="acceptPrivacyToggle"
            checked={isAccepted}
            onChange={(e) => setIsAccepted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 bg-slate-100 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-700"
          />
          <label htmlFor="acceptPrivacyToggle" className="text-sm text-slate-700 dark:text-slate-300">
            I have read, understood, and accept the agreement.
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={!isAccepted} 
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-70 dark:disabled:bg-gray-600"
        >
          Accept and Continue
        </button>
      </div>
    </Modal>
  );
};

export default PrivacyAgreementModal;