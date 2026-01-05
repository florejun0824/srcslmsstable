// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Added useLocation
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

const MeshGradientBackground = ({ role }) => {
  const primary = role === 'student' ? 'bg-blue-500' : 'bg-teal-500';
  const secondary = role === 'student' ? 'bg-indigo-500' : 'bg-emerald-500';
  const tertiary = role === 'student' ? 'bg-violet-400' : 'bg-cyan-400';

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#f0f2f5] dark:bg-[#000000] transition-colors duration-1000 ease-in-out">
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
      <div className={`absolute top-[-10%] left-[-10%] w-[900px] h-[900px] rounded-full ${primary} mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] rounded-full ${secondary} mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000`}></div>
      <div className={`absolute top-[40%] left-[40%] w-[600px] h-[600px] rounded-full ${tertiary} mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-25 animate-blob animation-delay-4000`}></div>
    </div>
  );
};

const GlassInput = ({ icon: Icon, isPassword, togglePassword, showPassword, ...props }) => (
  <div className="relative group mb-4">
    <div className="absolute inset-0 bg-white/60 dark:bg-[#2c2c2e]/60 rounded-[1.8rem] border border-white/40 dark:border-white/5 shadow-sm transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-blue-500/10 group-focus-within:bg-white/80 dark:group-focus-within:bg-[#3a3a3c] group-focus-within:scale-[1.01] group-focus-within:shadow-md"></div>
    <div className="absolute top-1/2 -translate-y-1/2 left-5 text-gray-400 dark:text-gray-500 transition-colors duration-300 group-focus-within:text-blue-500 group-focus-within:scale-110 transform">
      <Icon className="w-5 h-5" />
    </div>
    <input
      {...props}
      type={isPassword && !showPassword ? 'password' : 'text'}
      className="relative w-full h-[60px] pl-14 pr-14 bg-transparent border-none rounded-[1.8rem] text-[16px] font-semibold text-gray-800 dark:text-gray-100 placeholder-gray-400/80 focus:outline-none focus:ring-0 transition-all tracking-wide"
    />
    {isPassword && (
      <button
        type="button"
        onClick={togglePassword}
        className="absolute top-1/2 -translate-y-1/2 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10 p-2 rounded-full hover:bg-gray-100/50 dark:hover:bg-white/10 active:scale-90"
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
  const location = useLocation(); // Added hook
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showBiometricButton, setShowBiometricButton] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  // 1. Restore state from navigation (if returning from Terms/Privacy)
  useEffect(() => {
    if (location.state?.formData) {
        const { email, password, role, hasAgreed } = location.state.formData;
        if (email) setEmail(email);
        if (password) setPassword(password);
        if (role) setSelectedRole(role);
        // We preserve the "hasAgreed" status too if they come back
        if (hasAgreed) setHasAgreed(hasAgreed);
    }
  }, [location.state]);

  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (!isAvailable) return;
        const { value } = await Preferences.get({ key: 'userCredentials' });
        if (value) setShowBiometricButton(true);
      } catch (error) {
        console.error('Error checking biometric support:', error);
      }
    };
    checkBiometricSupport();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasAgreed) {
        showToast("Please accept the User Agreement and Privacy Policy to continue.", 'error');
        return;
    }
    setError('');
    setIsLoading(true);
    try {
      const fullEmail = `${email}@srcs.edu`;
      await login(fullEmail, password, selectedRole);
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
      await BiometricAuth.authenticate({ reason: "Please authenticate", title: "SRCS Login" });
      const { value } = await Preferences.get({ key: 'userCredentials' });
      if (!value) throw new Error("No stored credentials.");
      const { email, password, role } = JSON.parse(value);
      setSelectedRole(role);
      await login(email, password, role);
    } catch (error) {
      if (error.code === BiometryErrorType.NoEnrollment) {
          setError("No biometrics enrolled.");
          setShowBiometricButton(false);
      } else {
          setError(error.message || "Authentication failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to package current state for links
  const currentFormData = {
      email,
      password,
      role: selectedRole,
      hasAgreed
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans antialiased selection:bg-blue-500/30 selection:text-blue-900">
      <MeshGradientBackground role={selectedRole} />

      <div className="relative z-20 w-full max-w-[420px] perspective-1000 animate-fade-in-up">
        
        <div className="
          relative overflow-hidden
          bg-white/70 dark:bg-[#121212]/70
          backdrop-blur-3xl backdrop-saturate-[1.8]
          rounded-[3rem] 
          border border-white/50 dark:border-white/10
          shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15),inset_0_0_0_1px_rgba(255,255,255,0.5)] 
          dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.05)]
          p-8 sm:p-10
          transition-all duration-700 ease-out
        ">
            {/* Logo Section */}
            <div className="flex flex-col items-center justify-center mb-10 relative">
                <div className="absolute -top-10 inset-x-0 h-32 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none blur-xl"></div>
                
                <div className="relative group cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-purple-400 blur-2xl opacity-20 dark:opacity-40 rounded-full group-hover:opacity-40 transition-opacity duration-500"></div>
                    <div className="relative w-28 h-28 rounded-[2rem] bg-white/80 dark:bg-[#1e1e1e] shadow-2xl shadow-blue-900/10 border border-white/60 dark:border-white/10 flex items-center justify-center p-5 backdrop-blur-md transition-transform duration-500 group-hover:scale-[1.02] group-hover:rotate-2">
                        <img
                            src="/logo.png"
                            alt="SRCS Logo"
                            className="w-full h-full object-contain drop-shadow-sm"
                        />
                    </div>
                </div>
                
                <div className="mt-8 text-center space-y-1">
                    <h2 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                      SRCS LEARNING PORTAL
                    </h2>
                    
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 max-w-[280px] mx-auto leading-relaxed">
                        A centralized learning management system enabling students and teachers to collaborate, track progress, and access educational resources efficiently.
                    </p>
                   
                    <p className="mt-4 text-[15px] font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 opacity-90">
                      Please Login to Continue
                    </p>
                </div>
            </div>

            {/* Role Switcher */}
            <div className="mb-8 p-1.5 bg-gray-100/80 dark:bg-[#252528] border border-white/40 dark:border-white/5 rounded-[2rem] flex items-center relative backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]">
                <div 
                    className={`absolute top-1.5 bottom-1.5 rounded-[1.6rem] bg-white dark:bg-[#3A3A3C] shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-black/5 dark:border-white/5 transition-all duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) w-[calc(50%-6px)] ${selectedRole === 'student' ? 'left-1.5' : 'left-[calc(50%)]'}`} 
                />
                
                <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`relative flex-1 py-3 text-[14px] font-bold tracking-wide flex items-center justify-center gap-2 transition-colors duration-300 z-10 rounded-[1.6rem] ${selectedRole === 'student' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    <AcademicCapIcon className={`w-4 h-4 transition-transform duration-300 ${selectedRole === 'student' ? 'scale-110 text-blue-500' : ''}`} />
                    Student
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    className={`relative flex-1 py-3 text-[14px] font-bold tracking-wide flex items-center justify-center gap-2 transition-colors duration-300 z-10 rounded-[1.6rem] ${selectedRole === 'teacher' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    <BriefcaseIcon className={`w-4 h-4 transition-transform duration-300 ${selectedRole === 'teacher' ? 'scale-110 text-teal-500' : ''}`} />
                    Teacher
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
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

                <div 
                  onClick={() => setHasAgreed(!hasAgreed)}
                  className={`
                    flex items-center space-x-3 p-4 mt-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] group touch-manipulation
                    ${hasAgreed 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                        : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0
                    ${hasAgreed 
                        ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
                        : 'bg-transparent border-slate-300 dark:border-slate-500 group-hover:border-blue-400'}
                  `}>
                    <CheckIcon className={`w-4 h-4 text-white transition-opacity duration-200 ${hasAgreed ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                  </div>
                  {/* UPDATE: Pass state in Link components */}
                  <label className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer pointer-events-none">
                    I agree to the <Link to="/terms" state={{ formData: currentFormData }} className="text-blue-600 dark:text-blue-400 hover:underline pointer-events-auto">Terms of Service</Link> and <Link to="/privacy" state={{ formData: currentFormData }} className="text-blue-600 dark:text-blue-400 hover:underline pointer-events-auto">Privacy Policy</Link>.
                  </label>
                </div>

                {error && (
                    <div className="bg-red-50/90 dark:bg-red-900/30 border border-red-100 dark:border-red-500/20 rounded-3xl p-4 text-center animate-in fade-in slide-in-from-top-2 duration-300 mb-2">
                        <p className="text-[13px] font-bold text-red-600 dark:text-red-300 tracking-wide">{error}</p>
                    </div>
                )}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading || !hasAgreed}
                        className="
                            group relative w-full h-[60px] rounded-[1.8rem] overflow-hidden 
                            bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500
                            active:scale-[0.98] transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1)
                            shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_28px_-8px_rgba(37,99,235,0.5)]
                            disabled:opacity-50 disabled:grayscale disabled:shadow-none disabled:cursor-not-allowed
                        "
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-100 pointer-events-none"></div>
                        
                        <span className="relative z-10 text-[16px] font-bold text-white flex items-center justify-center gap-2.5 tracking-wide">
                            {isLoading && !showBiometricButton ? (
                                <svg className="animate-spin h-5 w-5 text-white/90" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>Log In</>
                            )}
                        </span>
                    </button>
                </div>
            </form>

            {showBiometricButton && (
                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/5">
                    <button
                        type="button"
                        onClick={handleBiometricLogin}
                        disabled={isLoading}
                        className="
                            w-full h-[60px] rounded-[1.8rem] font-bold text-[15px]
                            flex items-center justify-center gap-3
                            text-gray-700 dark:text-gray-200 bg-white/40 dark:bg-white/5
                            border border-white/60 dark:border-white/10 
                            shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none
                            hover:bg-white/60 dark:hover:bg-white/10 hover:scale-[1.01]
                            active:scale-[0.98] transition-all duration-300
                            backdrop-blur-md tracking-wide
                        "
                    >
                        <div className="p-1.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-full text-blue-600 dark:text-blue-400">
                            <FingerPrintIcon className="w-5 h-5" />
                        </div>
                        <span>Unlock with Biometrics</span>
                    </button>
                </div>
            )}
        </div>

        <div className="mt-10 text-center animate-fade-in-up animation-delay-500">
             <div className="flex justify-center gap-6 mb-4">
                 {/* UPDATE: Pass state in Link components */}
                 <Link to="/privacy" state={{ formData: currentFormData }} className="text-[13px] font-medium text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                     Privacy Policy
                 </Link>
			     <Link to="/terms" state={{ formData: currentFormData }} className="text-[13px] font-medium text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
			         Terms of Service
			     </Link>
             </div>
            <p className="text-[12px] font-bold tracking-wider text-gray-400/80 dark:text-white/20 uppercase">
                © 2025 SRCS Learning Portal
            </p>
        </div>
      </div>
      
      <style>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(40px, -60px) scale(1.1); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 12s infinite cubic-bezier(0.44, 0, 0.56, 1);
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
      `}</style>
    </div>
  );
};

export default LoginPage;