import React from 'react';

// I incremented this to 2.2 so users are forced to see the update
export const POLICY_VERSION = '2.2';

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

      {/* --- NEW SECTIONS REQUIRED BY GOOGLE --- */}
      <h4>7. Data Retention</h4>
      <p>We only retain collected personal and academic information for as long as necessary to provide you with your requested service or as required by school policy. Data is stored securely and is strictly accessed for educational purposes.</p>

      <h4>8. Google User Data Handling (Limited Use)</h4>
      <p>Our application adheres to the Google API Services User Data Policy, including the Limited Use requirements. We access Google user data solely for the following purpose:</p>
      <ul>
        <li><strong>Google Slides Generation:</strong> Our app uses the Google Slides API to generate presentation slides based on lesson content you select.</li>
        <li><strong>Storage:</strong> We do <strong>not</strong> permanently store your Google Drive files or presentations on our servers. The files are created directly in your personal Google Drive.</li>
        <li><strong>Sharing:</strong> We do not share your Google user data with third-party tools (such as AI models) without your explicit action, and only for the specific purpose of content generation.</li>
        <li><strong>Deletion:</strong> You may request the full deletion of any account data associated with our service by contacting us at <strong>floresflorejun@gmail.com</strong>. Upon request, all associated data will be removed within 30 days.</li>
      </ul>
    </div>
  );
};

export default PrivacyPolicyContent;