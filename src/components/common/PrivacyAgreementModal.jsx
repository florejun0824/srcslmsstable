import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from './Modal';
import PrivacyPolicyContent, { POLICY_VERSION } from '../PrivacyPolicyContent';
// ✅ Import Check Icon
import { Check } from 'lucide-react';

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
      containerClassName="z-[9999]" 
    >
      <div className="flex flex-col space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          To continue using the SRCS Learning Portal (v{POLICY_VERSION}), please review and accept our data privacy agreement.
        </p>

        {/* Scrollable Privacy Text */}
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800 shadow-inner">
           <PrivacyPolicyContent />
        </div>

        {/* ✅ CUSTOM CIRCULAR CHECKBOX */}
        <div 
          onClick={() => setIsAccepted(!isAccepted)}
          className={`
            flex items-center space-x-4 p-4 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.98] group
            ${isAccepted 
                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}
          `}
        >
          <div className="relative flex items-center">
             {/* Circular Checkbox Container */}
             <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                ${isAccepted 
                    ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
                    : 'bg-transparent border-slate-300 dark:border-slate-500 group-hover:border-blue-400'}
            `}>
                <Check className={`w-4 h-4 text-white transition-opacity duration-200 ${isAccepted ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
            </div>
          </div>
          <label className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer pointer-events-none">
            I have read, understood, and accept the User Agreement and Privacy Policy.
          </label>
        </div>

        <div className="pt-2">
            <button
            onClick={handleAccept}
            disabled={!isAccepted} 
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700 disabled:opacity-70 text-base"
            >
            Accept and Continue
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyAgreementModal;