import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from './Modal';

// This key will be used in localStorage
const PRIVACY_STORAGE_KEY = 'hasAcceptedPrivacyAgreement';
// We'll use a versioned key in case the policy changes
const POLICY_VERSION = '1.0'; 

const PrivacyAgreementModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const { userProfile, firestoreService, refreshUserProfile } = useAuth();

  useEffect(() => {
    if (!userProfile) {
      return; // Don't do anything if the user profile isn't loaded
    }

    // Check if they've accepted on this device
    const localAcceptance = localStorage.getItem(PRIVACY_STORAGE_KEY);

    // Check if they've *ever* accepted (from their profile)
    const profileAcceptance = userProfile?.privacyPolicyAcceptance;

    // Check if the accepted version is the current version
    const isLocalVersionCurrent = localAcceptance === POLICY_VERSION;
    const isProfileVersionCurrent = profileAcceptance?.version === POLICY_VERSION;

    // Only show the modal if they haven't accepted the CURRENT version,
    // either locally or in their profile.
    if (!isLocalVersionCurrent && !isProfileVersionCurrent) {
      setIsOpen(true);
    }
  }, [userProfile]); // Re-run when userProfile is loaded

  const handleAccept = async () => {
    // 1. Mark as accepted for this device
    // We use the "isAccepted" checkbox state, which acts as the "do not show again" toggle
    if (isAccepted) {
      localStorage.setItem(PRIVACY_STORAGE_KEY, POLICY_VERSION);
    }

    // 2. Update their profile in Firestore so they don't see it on other devices
    if (userProfile?.id && firestoreService) {
      try {
        const acceptanceData = {
            version: POLICY_VERSION,
            acceptedAt: new Date(),
        };

        await firestoreService.updateUserProfile(userProfile.id, {
          hasAcceptedPrivacy: true, // This maintains the old check, good for compatibility
          privacyPolicyAcceptance: acceptanceData,
        });
        
        // 3. Refresh the auth context to get the new `hasAcceptedPrivacy` flag
        await refreshUserProfile(); 
      } catch (err) {
        console.error("Failed to update privacy status:", err);
        // Don't block the user, but log the error
      }
    }

    // 4. Close the modal
    setIsOpen(false);
  };

  // If the modal isn't needed, render nothing
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Disallow closing by clicking the backdrop
      showCloseButton={false} // Disallow closing with the 'X' button
      title="Privacy & Data Agreement"
      size="2xl"
      containerClassName="z-[150]" // Ensure it's on top of other modals
    >
      <div className="flex flex-col space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          To continue using the SRCS Learning Portal (v{POLICY_VERSION}), please review and accept our data privacy agreement.
        </p>

        {/* Scrollable Privacy Text */}
        <div className="prose prose-sm dark:prose-invert max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800">
          <h4>1. Introduction</h4>
          <p>This Privacy Policy describes how the SRCS Learning Portal ("Service") collects, uses, and shares your personal and academic information. Your use of the Service constitutes your agreement to this policy.</p>

          <h4>2. Information We Collect</h4>
          <ul>
            <li><strong>Personal Information:</strong> Name, email address, and role (student, teacher) provided upon account creation.</li>
            <li><strong>Academic Information:</strong> Your progress in lessons, quiz scores, assignment submissions, grades, and teacher feedback.</li>
            <li><strong>User-Generated Content:</strong> Posts in the Student Lounge, profile bio, profile picture, and other content you voluntarily create.</li>
            <li><strong>Technical Data:</strong> Session information (to keep you logged in), device type, and browser, used for operational purposes and to improve the Service.</li>
          </ul>

          <h4>3. How We Use Your Information</h4>
          <p>Your information is used for the following purposes:</p>
          <ul>
            <li>To operate, maintain, and provide the features of the Service.</li>
            <li>To allow teachers and administrators to track academic progress and provide support.</li>
            <li>To facilitate communication between users (e.g., Lounge, announcements).</li>
            <li>To manage your account and profile.</li>
            <li>To personalize your experience, such as tracking your level and rewards.</li>
          </ul>

          <h4>4. How We Share Your Information</h4>
          <ul>
            <li><strong>With School Staff:</strong> Your academic information (grades, progress) is accessible to your assigned teachers and authorized school administrators for educational purposes.</li>
            <li><strong>With Other Students:</strong> Your public profile information (name, bio, photo) and Lounge posts may be visible to other students, subject to your privacy settings.</li>
            <li><strong>Service Providers:</strong> We use third-party services like Firebase (for database and authentication) and Google (for Google Slides generation) which process data on our behalf.</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law.</li>
          </ul>
          <p><strong>We do not sell your personal information to any third parties.</strong></p>

          <h4>5. Data Security</h4>
          <p>We implement reasonable security measures, such as encryption and access controls, to protect your information. However, no online service is 100% secure.</p>

          <h4>6. Your Consent</h4>
          <p>By clicking "Accept and Continue," you acknowledge that you have read, understood, and agree to the collection, use, and sharing of your information as described in this policy.</p>
        </div>

        {/* Toggle / Checkbox */}
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

        {/* Accept Button */}
        <button
          onClick={handleAccept}
          disabled={!isAccepted} // Button is disabled until they check the box
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-70 dark:disabled:bg-gray-600"
        >
          Accept and Continue
        </button>
      </div>
    </Modal>
  );
};

export default PrivacyAgreementModal;