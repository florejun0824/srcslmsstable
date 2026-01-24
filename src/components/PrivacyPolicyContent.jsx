import React from 'react';

export const POLICY_VERSION = '2.0';

const PrivacyPolicyContent = () => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
      <h4>1. Introduction</h4>
      <p>This Privacy Policy describes how the SRCS Digital Ecosystem ("Service") collects, uses, and shares your personal and academic information. Your use of the Service constitutes your agreement to this policy.</p>

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
      <p>By using the Service, you acknowledge that you have read, understood, and agree to the collection, use, and sharing of your information as described in this policy.</p>
    </div>
  );
};

export default PrivacyPolicyContent;