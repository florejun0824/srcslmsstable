// src/pages/TermsPage.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation

const TermsPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to get incoming state
  const previousFormData = location.state?.formData; // Get the data

  const handleBack = () => {
    // Navigate back to login, passing the data we received back to it
    navigate('/login', { state: { formData: previousFormData } });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Last Updated: January 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none mb-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
           <h3>1. Acceptance of Terms</h3>
           <p>
             By accessing and using the SRCS Learning Portal ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
           </p>

           <h3>2. Educational Use Only</h3>
           <p>
             This platform is intended solely for educational purposes related to San Ramon Catholic School, Inc. (SRCS). Unauthorized commercial use or distribution of platform content is strictly prohibited.
           </p>

           <h3>3. User Accounts & Security</h3>
           <p>
             You are responsible for maintaining the confidentiality of your login credentials. You are fully responsible for all activities that occur under your account. You agree to immediately notify SRCS administration of any unauthorized use of your account.
           </p>

           <h3>4. User Conduct</h3>
           <p>
             You agree not to use the Service to:
           </p>
           <ul className="list-disc pl-5 space-y-1">
             <li>Upload or transmit any content that is unlawful, harmful, threatening, or abusive.</li>
             <li>Impersonate any person or entity.</li>
             <li>Submit false or misleading information.</li>
             <li>Attempt to gain unauthorized access to other user accounts or system data.</li>
           </ul>

           <h3>5. Intellectual Property</h3>
           <p>
             All learning materials, quizzes, and resources provided on this platform are the property of SRCS or their respective content creators and are protected by applicable copyright laws.
           </p>

           <h3>6. Data Privacy</h3>
           <p>
             Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the terms of the Privacy Policy.
           </p>

           <h3>7. Termination</h3>
           <p>
             We reserve the right to terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
           </p>

           <h3>8. Changes to Terms</h3>
           <p>
             We reserve the right, at our sole discretion, to modify or replace these Terms at any time. Continued use of the Service following the posting of any changes constitutes acceptance of those changes.
           </p>
        </div>

        {/* Footer / Back Button */}
        <div className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-6">
          <button
            onClick={handleBack} // Updated Handler
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;