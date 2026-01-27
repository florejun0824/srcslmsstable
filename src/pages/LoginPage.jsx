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
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

// --- CONFIG: THEME DEFINITIONS ---
const THEMES = {
    student: {
        primary: 'bg-blue-600',
        gradient: 'from-blue-600 to-indigo-600',
        shadow: 'shadow-blue-500/25',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        ring: 'focus-within:ring-blue-500/30',
        glow: 'bg-blue-500/20'
    },
    teacher: {
        primary: 'bg-emerald-600',
        gradient: 'from-emerald-600 to-teal-600',
        shadow: 'shadow-emerald-500/25',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        ring: 'focus-within:ring-emerald-500/30',
        glow: 'bg-emerald-500/20'
    }
};

// --- COMPONENT: MODERN INPUT FIELD ---
const ModernInput = ({ icon: Icon, isPassword, togglePassword, showPassword, theme, ...props }) => (
  <div className="relative group mb-5">
    {/* Animated Focus Border */}
    <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${theme.gradient} blur-sm`}></div>
    
    <div className="relative bg-[#0F172A] rounded-2xl border border-white/5 flex items-center shadow-sm transition-all duration-300">
        <div className={`pl-4 pr-3 text-slate-500 transition-colors duration-300 group-focus-within:text-white`}>
            <Icon className="w-5 h-5" />
        </div>
        <input
            {...props}
            type={isPassword && !showPassword ? 'password' : 'text'}
            className="w-full h-14 bg-transparent border-none text-[15px] font-medium text-white placeholder-slate-600 focus:ring-0 focus:outline-none autofill:bg-transparent z-10"
            style={{ colorScheme: 'dark' }}
        />
        {isPassword && (
            <button type="button" onClick={togglePassword} className="pr-4 pl-2 text-slate-600 hover:text-white transition-colors focus:outline-none z-10">
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
        )}
    </div>
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

  const theme = THEMES[selectedRole];

  // Logic: Restore State
  useEffect(() => {
    if (location.state?.formData) {
        const { email, password, role, hasAgreed } = location.state.formData;
        if (email) setEmail(email);
        if (password) setPassword(password);
        if (role) setSelectedRole(role);
        if (hasAgreed) setHasAgreed(hasAgreed);
    }
  }, [location.state]);

  // Logic: Biometrics
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (!isAvailable) return;
        const { value } = await Preferences.get({ key: 'userCredentials' });
        if (value) setShowBiometricButton(true);
      } catch (error) { console.error('Biometric check failed:', error); }
    };
    checkBiometricSupport();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasAgreed) { showToast("Please accept the terms to continue.", 'error'); return; }
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
      } catch (e) {}
    } catch (err) { setError(err.message); showToast(err.message, 'error'); } 
    finally { setIsLoading(false); }
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
      if (error.code === BiometryErrorType.NoEnrollment) { setError("Biometrics not set up."); setShowBiometricButton(false); } 
      else { setError(error.message || "Authentication failed"); }
    } finally { setIsLoading(false); }
  };

  const currentFormData = { email, password, role: selectedRole, hasAgreed };

  return (
    <div className="flex flex-col lg:flex-row min-h-[100dvh] w-full bg-[#020617] font-sans text-white overflow-hidden">
      
      {/* --- BACK BUTTON (FLOATING) --- */}
      <div className="fixed top-6 left-6 z-50 mix-blend-difference lg:mix-blend-normal">
        <Link 
            to="/" 
            className="group flex items-center justify-center lg:justify-start w-12 h-12 lg:w-auto lg:h-auto lg:px-5 lg:py-2.5 rounded-full bg-white/10 lg:bg-black/20 backdrop-blur-xl border border-white/10 transition-all hover:scale-105 active:scale-95"
        >
            <ArrowLeftIcon className="w-5 h-5 text-white lg:group-hover:-translate-x-1 transition-transform" />
            <span className="hidden lg:block ml-2 text-sm font-bold text-white uppercase tracking-wider">Home</span>
        </Link>
      </div>

      {/* --- LEFT PANEL: VISUALS (Desktop: 60%, Mobile: 35vh) --- */}
      <div className="relative w-full h-[35vh] lg:h-auto lg:w-[60%] flex-shrink-0 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 scale-105 transition-transform duration-[20s] ease-linear hover:scale-110"
          style={{
            backgroundImage: "url('/srcs.jpg')", 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
             <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-slate-900/60 via-slate-900/40 to-[#020617] lg:to-[#020617]"></div>
             <div className={`absolute inset-0 mix-blend-overlay opacity-60 bg-gradient-to-tr ${theme.gradient} transition-colors duration-700`}></div>
        </div>

        {/* Brand Content */}
        <div className="absolute inset-0 z-10 flex flex-col justify-center px-8 lg:px-20 pb-8 lg:pb-0">
            <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl mb-6 lg:mb-10 animate-in fade-in zoom-in duration-700">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 lg:w-14 lg:h-14 object-contain drop-shadow-lg" />
            </div>
            <h1 className="text-4xl lg:text-7xl font-black tracking-tighter text-white mb-2 lg:mb-4 drop-shadow-xl">
                SRCS <br/> <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient}`}>Digital Ecosystem</span>
            </h1>
            <p className="text-sm lg:text-xl text-slate-300 font-medium max-w-md leading-relaxed hidden lg:block">
                The next generation of learning management. Seamless, intuitive, and powered by AI.
            </p>
        </div>
      </div>

      {/* --- RIGHT PANEL: FORM (Desktop: 40%, Mobile: Flex fill) --- */}
      <div className="relative flex-1 flex flex-col justify-center bg-[#020617] lg:bg-[#020617] -mt-8 lg:mt-0 rounded-t-[2.5rem] lg:rounded-none z-20 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)] lg:shadow-none border-t border-white/10 lg:border-none">
        
        <div className="w-full max-w-[420px] mx-auto px-6 py-12 lg:p-12 animate-in slide-in-from-bottom-8 duration-700">
            
            {/* Header Text */}
            <div className="mb-10">
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-slate-400">Please authenticate to continue.</p>
            </div>

            {/* Role Toggles */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                    onClick={() => setSelectedRole('student')}
                    className={`
                        relative h-24 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 group
                        ${selectedRole === 'student' 
                            ? `bg-blue-600/10 border-blue-500/50` 
                            : 'bg-[#0F172A] border-white/5 hover:border-white/10'}
                    `}
                >
                    <div className={`p-2 rounded-full ${selectedRole === 'student' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' : 'bg-white/5 text-slate-500'} transition-all`}>
                        <AcademicCapIcon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${selectedRole === 'student' ? 'text-white' : 'text-slate-500'}`}>Student</span>
                    {selectedRole === 'student' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse"></div>}
                </button>

                <button
                    onClick={() => setSelectedRole('teacher')}
                    className={`
                        relative h-24 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 group
                        ${selectedRole === 'teacher' 
                            ? `bg-emerald-600/10 border-emerald-500/50` 
                            : 'bg-[#0F172A] border-white/5 hover:border-white/10'}
                    `}
                >
                    <div className={`p-2 rounded-full ${selectedRole === 'teacher' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'bg-white/5 text-slate-500'} transition-all`}>
                        <BriefcaseIcon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${selectedRole === 'teacher' ? 'text-white' : 'text-slate-500'}`}>Teacher</span>
                    {selectedRole === 'teacher' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></div>}
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <ModernInput 
                    theme={theme}
                    icon={AtSymbolIcon}
                    placeholder="Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                
                <ModernInput 
                    theme={theme}
                    icon={LockClosedIcon}
                    isPassword={true}
                    showPassword={showPassword}
                    togglePassword={() => setShowPassword(!showPassword)}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {/* Terms */}
                <div onClick={() => setHasAgreed(!hasAgreed)} className="flex items-center gap-3 cursor-pointer group select-none mt-2">
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${hasAgreed ? `${theme.primary} border-transparent` : 'bg-transparent border-slate-600 group-hover:border-slate-500'}`}>
                        <CheckIcon className={`w-4 h-4 text-white transition-transform ${hasAgreed ? 'scale-100' : 'scale-0'}`} />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                        I agree to the <span className={`underline decoration-dotted ${theme.text}`}>Terms</span> & <span className={`underline decoration-dotted ${theme.text}`}>Privacy Policy</span>
                    </span>
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center animate-in slide-in-from-top-2">
                        <p className="text-xs font-bold text-red-400">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || !hasAgreed}
                    className={`
                        w-full h-14 mt-8 rounded-2xl font-bold text-white text-[15px] shadow-lg
                        bg-gradient-to-r ${theme.gradient} ${theme.shadow}
                        hover:scale-[1.02] active:scale-[0.98] 
                        transition-all duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2
                    `}
                >
                    {isLoading && !showBiometricButton ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>Sign In <ArrowRightIcon className="w-4 h-4" /></>
                    )}
                </button>
            </form>

            {/* Biometric */}
            {showBiometricButton && (
                <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                    <button
                        onClick={handleBiometricLogin}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F172A] border border-white/5 hover:bg-[#1E293B] hover:border-white/10 transition-all text-slate-400 hover:text-white"
                    >
                        <FingerPrintIcon className={`w-5 h-5 ${theme.text}`} />
                        <span className="text-xs font-bold uppercase tracking-wide">Biometric Login</span>
                    </button>
                </div>
            )}
            
            <div className="mt-12 text-center">
                 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Secure • Private • Encrypted</p>
            </div>

        </div>
      </div>

      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px #0F172A inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;