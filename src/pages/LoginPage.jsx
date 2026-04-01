// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AtSign, Lock, Eye, EyeOff, Fingerprint, ArrowRight } from 'lucide-react';
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const FONT = '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

// --- UNIQUE SUPER-GLASS INPUT WITH MORPHING ICON ---
const PremiumInput = ({ icon: Icon, isPassword, togglePassword, showPassword, label, id, ...props }) => (
    <div className="relative group mb-8">
        {/* Floating Label (More unique positioning) */}
        <label
            htmlFor={id}
            className="absolute left-6 -top-3 px-2 py-0.5 bg-white/40 backdrop-blur-md rounded-md text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700 pointer-events-none transition-all duration-300 opacity-0 group-focus-within:opacity-100 group-focus-within:-translate-y-1 transform z-30"
        >
            {label}
        </label>

        <div className="relative flex items-center">
            {/* Morphing Icon Container */}
            <div className="absolute left-2 w-12 h-12 flex items-center justify-center transition-all duration-500 z-20">
                <div className="absolute inset-0 bg-indigo-50/50 rounded-2xl group-focus-within:bg-indigo-600 group-focus-within:rotate-12 transition-all duration-500 shadow-sm group-focus-within:shadow-indigo-200 group-focus-within:shadow-xl" />
                <Icon className="w-5 h-5 text-slate-400 group-focus-within:text-white transition-colors duration-500 relative z-10" strokeWidth={2} />
            </div>

            <input
                id={id}
                {...props}
                type={isPassword && !showPassword ? 'password' : 'text'}
                placeholder={label}
                className="w-full h-[64px] bg-white/40 hover:bg-white/60 backdrop-blur-xl border-2 border-white/80 rounded-[24px] pl-16 pr-12 text-[16px] text-slate-800 font-semibold placeholder:text-slate-400/60 focus:bg-white/80 focus:border-indigo-500/30 focus:ring-[8px] focus:ring-indigo-500/5 outline-none transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
                style={{ fontFamily: FONT }}
            />

            {isPassword && (
                <button
                    type="button"
                    onClick={togglePassword}
                    className="absolute right-5 p-2 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all focus:outline-none"
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            )}
        </div>
    </div>
);

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { showToast } = useToast();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showBiometricButton, setShowBiometricButton] = useState(false);
    const [hasAgreed, setHasAgreed] = useState(true);

    useEffect(() => {
        if (location.state?.formData) {
            const { email, password, hasAgreed } = location.state.formData;
            if (email) setEmail(email);
            if (password) setPassword(password);
            if (hasAgreed !== undefined) setHasAgreed(hasAgreed);
        }
    }, [location.state]);

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
            await login(fullEmail, password);
            try {
                const { isAvailable } = await BiometricAuth.checkBiometry();
                if (isAvailable) {
                    const { value } = await Preferences.get({ key: 'userCredentials' });
                    if (!value) {
                        const credentials = JSON.stringify({ email: fullEmail, password });
                        await Preferences.set({ key: 'tempUserCredentials', value: credentials });
                    }
                }
            } catch (e) { }
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
            const { email, password } = JSON.parse(value);
            await login(email, password);
        } catch (error) {
            if (error.code === BiometryErrorType.NoEnrollment) { setError("Biometrics not set up."); setShowBiometricButton(false); }
            else { setError(error.message || "Authentication failed"); }
        } finally { setIsLoading(false); }
    };

    const currentFormData = { email, password, hasAgreed };

    return (
        <div
            className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center bg-white"
            style={{ fontFamily: FONT }}
        >
            {/* --- GLOBAL IMMERSIVE BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 opacity-[0.45] scale-105 transition-transform duration-[20s] animate-pulse-slow"
                    style={{
                        backgroundImage: "url('/srcs.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                
                {/* Dynamic Surface Layer */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/80 via-white/40 to-transparent backdrop-blur-[1px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/60 via-transparent to-transparent" />
                
                {/* Decorative Elements */}
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[140px] animate-float" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-400/10 rounded-full blur-[140px] animate-float-delayed" />
            </div>

            {/* --- MAIN LOGIN VESSEL --- */}
            <div className="relative z-20 w-full max-w-[1100px] mx-4 lg:mx-8 flex flex-col lg:flex-row rounded-[40px] border border-white/60 bg-white/30 backdrop-blur-3xl shadow-[0_32px_120px_-20px_rgba(30,41,59,0.15)] overflow-hidden transition-all duration-700">

                {/* LEFT: Experience Side */}
                <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-16 overflow-hidden">
                    {/* Animated Background for Branding */}
                    <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-slate-900/10 transition-all duration-700" />
                    
                    <div className="relative z-10">
                        <div className="w-20 h-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-16 rotate-3 hover:rotate-0 transition-transform duration-500">
                            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                        </div>

                        <h1 className="text-[4rem] font-[1000] tracking-tighter leading-[0.9] text-slate-900 mb-8 animate-fade-in">
                            SRCS Digital<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Ecosystem</span>
                        </h1>
                        <p className="text-[18px] text-slate-600 font-bold leading-relaxed max-w-[320px] opacity-80">
                            Precision-engineered learning at your fingertips.
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex gap-2">
                            {['Adaptive', 'Fluid', 'Elite'].map(tag => (
                                <span key={tag} className="px-4 py-2 rounded-2xl bg-white/40 border border-white/60 text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Form Side */}
                <div className="w-full lg:w-[55%] p-10 sm:p-14 lg:p-20 bg-white/20 relative">
                    
                    {/* Floating Branding (Mobile) */}
                    <div className="lg:hidden flex flex-col items-center mb-12">
                        <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6">
                            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Login</h2>
                    </div>

                    {/* Desktop Subtitle */}
                    <div className="hidden lg:block mb-14">
                        <h2 className="text-[14px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Authentication</h2>
                        <h3 className="text-4xl font-[900] text-slate-900 tracking-tight">Welcome back</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col relative z-10">
                        <PremiumInput
                            id="email"
                            icon={AtSign}
                            label="Username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <PremiumInput
                            id="password"
                            icon={Lock}
                            label="Password"
                            isPassword={true}
                            showPassword={showPassword}
                            togglePassword={() => setShowPassword(!showPassword)}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {/* Error Message */}
                        <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-20 mb-6 opacity-100' : 'max-h-0 mb-0 opacity-0'}`}>
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-[13px] font-bold text-red-600">{error}</p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-[68px] mt-4 rounded-[28px] font-[900] text-white text-[17px] bg-slate-900 hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] disabled:opacity-50 flex items-center justify-center gap-4 group"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" /></>
                            )}
                        </button>

                        <div className="mt-10 text-center">
                            <p className="text-[14px] text-slate-500 font-bold">
                                New here? Check our{' '}
                                <Link to="/terms" state={{ formData: currentFormData }} className="text-indigo-600 hover:text-indigo-400 transition-colors underline decoration-2 underline-offset-4">Terms</Link>
                                {' '}&{' '}
                                <Link to="/privacy" state={{ formData: currentFormData }} className="text-indigo-600 hover:text-indigo-400 transition-colors underline decoration-2 underline-offset-4">Privacy</Link>
                            </p>
                        </div>
                    </form>

                    {showBiometricButton && (
                        <div className="mt-10 pt-10 border-t border-slate-900/5">
                            <button
                                onClick={handleBiometricLogin}
                                className="w-full h-[64px] flex items-center justify-center gap-4 rounded-[24px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all font-black uppercase text-[12px] tracking-widest"
                            >
                                <Fingerprint className="w-6 h-6" />
                                Quick Biometric Login
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-30px) scale(1.1); }
                }
                .animate-float { animation: float 10s ease-in-out infinite; }
                .animate-float-delayed { animation: float 12s ease-in-out infinite; animation-delay: 2s; }
                .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                
                input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0 50px white inset !important;
                    -webkit-text-fill-color: #0f172a !important;
                }
                
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
            `}</style>
        </div>
    );
};

export default LoginPage;