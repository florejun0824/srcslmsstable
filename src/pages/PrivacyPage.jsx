import React from 'react';
import { useNavigate } from 'react-router-dom';
import PrivacyPolicyContent, { POLICY_VERSION } from '../components/PrivacyPolicyContent';

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Privacy & Data Agreement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Version {POLICY_VERSION}
          </p>
        </div>

        {/* Content */}
        <div className="mb-8">
           <PrivacyPolicyContent />
        </div>

        {/* Footer / Back Button */}
        <div className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-6">
          <button
            onClick={() => navigate('/login')}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;