// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  AcademicCapIcon,
  BriefcaseIcon,
  AtSymbolIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  FingerPrintIcon,
  CheckIcon
} from '@heroicons/react/24/solid';
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

// --- 1. BACKGROUND COMPONENT ---
const MeshGradientBackground = ({ role }) => {
  // Adjusted colors for a deeper, more premium gradient
  const isStudent = role === 'student';
  
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#f8f9fc] dark:bg-[#050505] transition-colors duration-1000 ease-in-out">
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
      
      {/* Animated Orbs */}
      <div className={`
        absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-40 animate-blob
        ${isStudent ? 'bg-blue-400 dark:bg-blue-900' : 'bg-teal-400 dark:bg-teal-900'}
        transition-colors duration-1000
      `}></div>
      
      <div className={`
        absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-2000
        ${isStudent ? 'bg-indigo-400 dark:bg-indigo-900' : 'bg-emerald-400 dark:bg-emerald-900'}
        transition-colors duration-1000
      `}></div>
      
      <div className={`
        absolute top-[40%] left-[50%] transform -translate-x-1/2 w-[60vw] h-[60vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000
        ${isStudent ? 'bg-violet-400 dark:bg-violet-900' : 'bg-cyan-400 dark:bg-cyan-900'}
        transition-colors duration-1000
      `}></div>
    </div>
  );
};

// --- 2. INPUT COMPONENT ---
const GlassInput = ({ icon: Icon, isPassword, togglePassword, showPassword, ...props }) => (
  <div className="relative group mb-5">
    {/* Input Background Layer */}
    <div className="absolute inset-0 bg-white/50 dark:bg-black/20 rounded-2xl border border-white/60 dark:border-white/5 shadow-sm transition-all duration-300 group-focus-within:bg-white dark:group-focus-within:bg-black/40 group-focus-within:ring-2 group-focus-within:ring-blue-500/20 group-focus-within:border-blue-500/30 group-focus-within:shadow-md"></div>
    
    {/* Icon */}
    <div className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400 transition-colors duration-300 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400">
      <Icon className="w-5 h-5" />
    </div>

    {/* Actual Input */}
    <input
      {...props}
      type={isPassword && !showPassword ? 'password' : 'text'}
      className="relative w-full h-14 pl-12 pr-12 bg-transparent border-none rounded-2xl text-[15px] font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all"
    />

    {/* Toggle Password Button */}
    {isPassword && (
      <button
        type="button"
        onClick={togglePassword}
        className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10 p-1.5 rounded-full hover:bg-slate-100/50 dark:hover:bg-white/10 active:scale-95"
      >
        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    )}
  </div>
);

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showBiometricButton, setShowBiometricButton] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  // Restore state logic
  useEffect(() => {
    if (location.state?.formData) {
        const { email, password, role, hasAgreed } = location.state.formData;
        if (email) setEmail(email);
        if (password) setPassword(password);
        if (role) setSelectedRole(role);
        if (hasAgreed) setHasAgreed(hasAgreed);
    }
  }, [location.state]);

  // Biometric Check
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (!isAvailable) return;
        const { value } = await Preferences.get({ key: 'userCredentials' });
        if (value) setShowBiometricButton(true);
      } catch (error) {
        console.error('Biometric check failed:', error);
      }
    };
    checkBiometricSupport();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasAgreed) {
        showToast("Please accept the terms to continue.", 'error');
        return;
    }
    setError('');
    setIsLoading(true);
    try {
      const fullEmail = `${email}@srcs.edu`;
      await login(fullEmail, password, selectedRole);
      
      // Save credentials for biometrics if successful
      try {
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (isAvailable) {
            const { value } = await Preferences.get({ key: 'userCredentials' });
            if (!value) {
                const credentials = JSON.stringify({ email: fullEmail, password, role: selectedRole });
                await Preferences.set({ key: 'tempUserCredentials', value: credentials });
            }
        }
      } catch (e) { console.error(e); }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await BiometricAuth.authenticate({ reason: "Verify identity", title: "Sign In" });
      const { value } = await Preferences.get({ key: 'userCredentials' });
      if (!value) throw new Error("No stored credentials.");
      const { email, password, role } = JSON.parse(value);
      setSelectedRole(role);
      await login(email, password, role);
    } catch (error) {
      if (error.code === BiometryErrorType.NoEnrollment) {
          setError("Biometrics not set up.");
          setShowBiometricButton(false);
      } else {
          setError(error.message || "Authentication failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentFormData = { email, password, role: selectedRole, hasAgreed };

  return (
    // Use dvh for mobile-friendly viewport height
    <div className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden font-sans bg-slate-50 dark:bg-black">
      
      <MeshGradientBackground role={selectedRole} />

      {/* Scrollable Container for small screens */}
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-4">
        
        <div className="relative z-20 w-full max-w-[440px] my-auto animate-in fade-in zoom-in-95 duration-500">
            
            {/* GLASS CARD */}
            <div className={`
              relative overflow-hidden
              bg-white/70 dark:bg-[#121212]/70
              backdrop-blur-2xl backdrop-saturate-[1.5]
              rounded-[2.5rem] 
              border border-white/60 dark:border-white/10
              shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]
              p-6 sm:p-8 md:p-10
              transition-all duration-500
            `}>
                
				{/* 1. Header Section */}
				<div className="text-center mb-8">
				    <div className="inline-block relative group mb-6">
				        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
				        <img src="/logo.png" alt="Logo" className="relative w-20 h-20 object-contain drop-shadow-lg" />
				    </div>
    
				    {/* CHANGE: App Name is now the Main Title (H1) */}
				    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
				        SRCS Digital Ecosystem
				    </h1>
				    {/* CHANGE: 'Welcome Back' is now the subtitle */}
				    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-[260px] mx-auto">
				        Welcome Back! Please sign in.
				    </p>
				</div>

                {/* 2. Role Switcher Pill */}
                <div className="relative p-1 bg-slate-200/50 dark:bg-white/5 rounded-2xl flex items-center mb-8 border border-white/20 dark:border-white/5">
                    {/* Sliding Indicator */}
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 shadow-sm rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${selectedRole === 'student' ? 'left-1' : 'left-[calc(50%)]'}`} 
                    />
                    
                    <button
                        type="button"
                        onClick={() => setSelectedRole('student')}
                        className={`relative flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors z-10 ${selectedRole === 'student' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        <AcademicCapIcon className={`w-4 h-4 ${selectedRole === 'student' ? 'text-blue-500' : ''}`} />
                        Student
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setSelectedRole('teacher')}
                        className={`relative flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors z-10 ${selectedRole === 'teacher' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        <BriefcaseIcon className={`w-4 h-4 ${selectedRole === 'teacher' ? 'text-teal-500' : ''}`} />
                        Teacher
                    </button>
                </div>

                {/* 3. Form */}
                <form onSubmit={handleSubmit}>
                    <GlassInput 
                        icon={AtSymbolIcon}
                        placeholder="Username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <GlassInput 
                        icon={LockClosedIcon}
                        isPassword={true}
                        showPassword={showPassword}
                        togglePassword={() => setShowPassword(!showPassword)}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {/* Terms Checkbox */}
                    <div 
                        onClick={() => setHasAgreed(!hasAgreed)}
                        className={`
                            flex items-start gap-3 p-3.5 mt-4 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.98]
                            ${hasAgreed 
                                ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30' 
                                : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}
                        `}
                    >
                        <div className={`mt-0.5 w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-colors ${hasAgreed ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            <CheckIcon className={`w-3.5 h-3.5 text-white transition-transform ${hasAgreed ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            I accept the <Link to="/terms" state={{ formData: currentFormData }} className="text-slate-800 dark:text-white underline decoration-slate-300 underline-offset-2">Terms</Link> and <Link to="/privacy" state={{ formData: currentFormData }} className="text-slate-800 dark:text-white underline decoration-slate-300 underline-offset-2">Privacy Policy</Link>.
                        </p>
                    </div>

                    {/* Error Toast Inline */}
                    {error && (
                        <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-center animate-in slide-in-from-top-2">
                            <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="mt-6">
                        <button
                            type="submit"
                            disabled={isLoading || !hasAgreed}
                            className="
                                relative w-full h-14 rounded-2xl font-bold text-white text-[15px] shadow-lg
                                bg-gradient-to-r from-blue-600 to-indigo-600 
                                hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] 
                                transition-all duration-300 overflow-hidden
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                            "
                        >
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-shimmer" />
                            
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading && !showBiometricButton ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : 'Sign In'}
                            </span>
                        </button>
                    </div>
                </form>

                {/* 4. Biometric Option */}
                {showBiometricButton && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/5 text-center">
                        <button
                            type="button"
                            onClick={handleBiometricLogin}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <FingerPrintIcon className="w-5 h-5 text-blue-500" />
                            <span>Quick Access</span>
                        </button>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="mt-8 text-center pb-4">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                    © 2026 SRCS Digital Ecosystem
                </p>
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
        .animation-delay-4000 { animation-delay: 4s; }
        
        @keyframes shimmer {
            100% { transform: translateX(100%); }
        }
        .hover\\:animate-shimmer:hover {
            animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;