// src/pages/TermsPage.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DocumentTextIcon, ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/solid';

// --- SHARED BACKGROUND ---
const MeshGradientBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#f8f9fc] dark:bg-[#050505] transition-colors duration-1000">
    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-30 bg-teal-400 dark:bg-teal-900 animate-blob"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-30 bg-emerald-400 dark:bg-emerald-900 animate-blob animation-delay-2000"></div>
  </div>
);

const TermsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const previousFormData = location.state?.formData;

  const handleBack = () => {
    if (previousFormData) {
        navigate('/login', { state: { formData: previousFormData } });
    } else {
        navigate('/login');
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative font-sans bg-slate-50 dark:bg-black">
      
      <MeshGradientBackground />

      <div className="absolute inset-0 flex flex-col p-4 sm:p-6 md:p-8">
        
        {/* CARD CONTAINER */}
        <div className="
            relative flex flex-col w-full max-w-4xl mx-auto h-full
            bg-white/70 dark:bg-[#121212]/70
            backdrop-blur-2xl backdrop-saturate-[1.5]
            rounded-[2.5rem] 
            border border-white/60 dark:border-white/10
            shadow-2xl overflow-hidden
        ">
            
            {/* --- HEADER --- */}
            <div className="flex-none p-6 sm:p-8 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Terms of Service
                        </h1>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>Last Updated: January 2026</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className="text-teal-600 dark:text-teal-400">Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT (Scrollable) --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="p-6 sm:p-10 text-slate-600 dark:text-slate-300 space-y-8 leading-relaxed">
                    
                    <section>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            1. Acceptance of Terms
                        </h2>
                        <p>
                            By accessing or using the SRCS Learning Management System ("Platform"), you agree to be bound by these Terms of Service. 
                            If you do not agree to these terms, please do not use the Platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            2. User Responsibilities
                        </h2>
                        <ul className="list-disc pl-5 space-y-2 marker:text-teal-500">
                            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                            <li>You agree not to use the platform for any illegal or unauthorized purpose.</li>
                            <li>You must not transmit any worms, viruses, or any code of a destructive nature.</li>
                            <li>Academic integrity must be upheld at all times during quizzes and examinations.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            3. Data Usage & Privacy
                        </h2>
                        <p>
                            Your use of the Platform is also governed by our Privacy Policy. We collect and use personal data 
                            solely for educational purposes and platform improvement. We do not sell your data to third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            4. Intellectual Property
                        </h2>
                        <p>
                            The content, organization, graphics, design, and other matters related to the Platform are protected 
                            under applicable copyrights and intellectual property laws. The copying, redistribution, use, or publication 
                            by you of any such matters or any part of the Platform is strictly prohibited.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            5. Modifications
                        </h2>
                        <p>
                            We reserve the right to modify these terms at any time. Continued use of the Platform after any such changes 
                            shall constitute your consent to such changes.
                        </p>
                    </section>

                    <div className="p-6 rounded-2xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 text-center">
                        <p className="text-sm font-medium text-teal-800 dark:text-teal-200">
                            By clicking "Sign In" or using the app, you acknowledge that you have read and understood these terms.
                        </p>
                    </div>

                </div>
            </div>

            {/* --- FOOTER (Sticky Buttons) --- */}
            <div className="flex-none p-6 sm:p-8 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* BUTTON 1: Back to Main Page (Secondary/Ghost Style) */}
                    <button
                        onClick={handleHome}
                        className="
                            group w-full py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-[15px]
                            bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10
                            hover:bg-white dark:hover:bg-white/20 hover:scale-[1.01] active:scale-[0.98]
                            transition-all duration-300 flex items-center justify-center gap-2
                        "
                    >
                        <HomeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-teal-500 transition-colors" />
                        <span>Main Page</span>
                    </button>

                    {/* BUTTON 2: Back to Login (Primary Gradient Style) */}
                    <button
                        onClick={handleBack}
                        className="
                            group w-full py-4 rounded-2xl font-bold text-white text-[15px] shadow-lg
                            bg-gradient-to-r from-teal-600 to-emerald-600 
                            hover:shadow-teal-500/25 hover:scale-[1.01] active:scale-[0.98] 
                            transition-all duration-300 overflow-hidden flex items-center justify-center gap-2
                        "
                    >
                        <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
                        <span>Back to Login</span>
                    </button>

                </div>
            </div>

        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 15s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
};

export default TermsPage;