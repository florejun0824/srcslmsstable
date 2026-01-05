import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from './Modal';
import PrivacyPolicyContent, { POLICY_VERSION } from '../PrivacyPolicyContent';

// This key will be used in localStorage
const PRIVACY_STORAGE_KEY = 'hasAcceptedPrivacyAgreement';

const PrivacyAgreementModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { userProfile, firestoreService, refreshUserProfile } = useAuth();

  useEffect(() => {
    if (!userProfile) return;

    const localAcceptance = localStorage.getItem(PRIVACY_STORAGE_KEY);
    const profileAcceptance = userProfile?.privacyPolicyAcceptance;

    const isLocalVersionCurrent = localAcceptance === POLICY_VERSION;
    const isProfileVersionCurrent = profileAcceptance?.version === POLICY_VERSION;

    // Open if the version has changed or hasn't been accepted yet
    if (!isLocalVersionCurrent && !isProfileVersionCurrent) {
      setIsOpen(false);
    }
  }, [userProfile]);

  const handleAccept = async () => {
    // Save to local storage
    localStorage.setItem(PRIVACY_STORAGE_KEY, POLICY_VERSION);

    if (userProfile?.id && firestoreService) {
      try {
        const acceptanceData = {
            version: POLICY_VERSION,
            acceptedAt: new Date(),
        };

        // Update the user profile in Firestore
        await firestoreService.updateUserProfile(userProfile.id, {
          hasAcceptedPrivacy: true,
          privacyPolicyAcceptance: acceptanceData,
        });
        
        // Refresh the local user profile state
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
      containerClassName="z-[9999]" 
    >
      <div className="flex flex-col space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          We have updated our User Agreement and Privacy Policy (v{POLICY_VERSION}). Please review the changes below to continue using the Learning Management System.
        </p>

        {/* Scrollable Privacy Text */}
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800 shadow-inner">
           <PrivacyPolicyContent />
        </div>

        <div className="pt-2">
            <button
            onClick={handleAccept}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 text-base"
            >
            I Understand and Continue
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyAgreementModal;