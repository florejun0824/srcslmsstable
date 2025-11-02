// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react'; // --- ADDED: useEffect
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  AcademicCapIcon,
  BriefcaseIcon,
  AtSymbolIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/solid';
import RoleDock from '../components/common/RoleDock';

// --- ADDED: Import the two plugins ---
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

// (This component is unchanged)
const HeliosBackground = ({ accentColor }) => {
  const colorMap = {
    blue: {
      primary: 'bg-blue-200 dark:bg-blue-900',
      secondary: 'bg-purple-200 dark:bg-purple-900',
      tertiary: 'bg-indigo-200 dark:bg-indigo-900',
    },
    teal: {
      primary: 'bg-teal-200 dark:bg-teal-900',
      secondary: 'bg-emerald-200 dark:bg-emerald-900',
      tertiary: 'bg-cyan-200 dark:bg-cyan-900',
    },
  };
  const scheme = colorMap[accentColor] || colorMap.blue;
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100 dark:bg-slate-900 transition-colors duration-500">
      <div
        className={`absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full filter blur-3xl opacity-40 animate-blob ${scheme.primary}`}
      ></div>
      <div
        className={`absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-2000 ${scheme.secondary}`}
      ></div>
      <div
        className={`absolute bottom-[20%] left-[15%] w-80 h-80 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000 ${scheme.tertiary}`}
      ></div>
    </div>
  );
};

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // --- ADDED: State to show the biometric button ---
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  // --- ADDED: Check for biometric support on page load ---
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        // 1. Check if hardware is available
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (!isAvailable) {
          console.log('Biometrics not available on this device.');
          return;
        }

        // 2. Check if we have securely stored credentials from a previous login
        const { value } = await Preferences.get({ key: 'userCredentials' });
        if (value) {
          // If we have hardware AND stored credentials, show the button
          setShowBiometricButton(true);
        }
      } catch (error) {
        console.error('Error checking biometric support:', error);
      }
    };

    checkBiometricSupport();
  }, []);

  // --- MODIFIED: The original password login function ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const fullEmail = `${email}@srcs.edu`; //
      await login(fullEmail, password, selectedRole);

      // --- ADDED: Offer to save credentials on success ---
      try {
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (isAvailable) {
          // Check if they've *already* saved
          const { value } = await Preferences.get({ key: 'userCredentials' });
          if (!value) { // Only ask if not already saved
            if (window.confirm("Would you like to enable Biometric Login for next time?")) {
              const credentials = JSON.stringify({
                email: fullEmail,
                password: password,
                role: selectedRole
              });

              // Store credentials securely
              // This uses Keychain on iOS and Encrypted SharedPreferences on Android
              await Preferences.set({
                key: 'userCredentials',
                value: credentials
              });
              showToast("Biometric login enabled!", 'success');
            }
          }
        }
      } catch (saveError) {
        console.error("Failed to save biometric credentials:", saveError);
        showToast("Could not enable biometric login.", 'error');
      }
      // --- END ADDED SECTION ---

    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ADDED: New function to handle the biometric button click ---
  const handleBiometricLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      // 1. Authenticate the user (show fingerprint/face prompt)
      await BiometricAuth.authenticate({
        reason: "Please authenticate to log in to SRCS",
        title: "SRCS Login",
      });

      // 2. If successful, get the stored credentials
      const { value } = await Preferences.get({ key: 'userCredentials' });
      if (!value) {
        throw new Error("No stored credentials found. Please log in with your password first.");
      }

      const { email, password, role } = JSON.parse(value);
      
      // --- ADDED: Set the role dock to match the saved role ---
      setSelectedRole(role); 

      // 3. Log in with the retrieved credentials
      await login(email, password, role);

    } catch (error) {
      console.error("Biometric login error:", error);
      // Handle specific biometric errors
      if (error.code) {
        switch (error.code) {
          case BiometryErrorType.Canceled:
            // User cancelled. Don't show an error.
            setError('');
            break;
          case BiometryErrorType.NoEnrollment:
            setError("No biometrics enrolled. Please log in with your password.");
            setShowBiometricButton(false); // Hide button if no biometrics are set up
            break;
          default:
            setError("Authentication failed. Please use your password.");
        }
      } else {
        // Handle login errors
        setError(error.message);
        showToast(error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const accentColor = selectedRole === 'student' ? 'blue' : 'teal';
  const glowMap = {
    blue: 'from-blue-400 via-indigo-500 to-purple-500 dark:from-blue-500 dark:via-indigo-600 dark:to-purple-600',
    teal: 'from-teal-400 via-emerald-500 to-cyan-500 dark:from-teal-500 dark:via-emerald-600 dark:to-cyan-600',
  };
  const buttonGlow = glowMap[accentColor];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      <HeliosBackground accentColor={accentColor} />

      <div className="relative z-10 w-full max-w-sm space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center">
          <img
            src="https://i.ibb.co/XfJ8scGX/1.png"
            alt="SRCS Logo"
            className="w-24 h-24 mx-auto mb-4 rounded-full shadow-neumorphic dark:shadow-neumorphic-dark"
          />
          <h1 className="text-4xl font-bold text-gray-800 dark:text-slate-100 transition-colors duration-300">
            Welcome Back
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            Please sign in to continue.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-gray-100 dark:bg-neumorphic-base-dark p-8 rounded-3xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark space-y-6 transition-all duration-300">
          <div className="grid grid-cols-2 gap-4">
            <RoleDock
              role="student"
              title="Student"
              Icon={AcademicCapIcon}
              isSelected={selectedRole === 'student'}
              onSelect={setSelectedRole}
              accentColor="blue"
            />
            <RoleDock
              role="teacher"
              title="Teacher"
              Icon={BriefcaseIcon}
              isSelected={selectedRole === 'teacher'}
              onSelect={setSelectedRole}
              accentColor="teal"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="relative">
              <AtSymbolIcon className="absolute top-1/2 -translate-y-1/2 left-4 w-5 h-5 text-gray-400 dark:text-slate-400" />
              <input
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-gray-100 dark:bg-neumorphic-base-dark text-gray-800 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-500 shadow-neumorphic dark:shadow-neumorphic-dark focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 transition-all duration-300"
                id="username"
                type="text"
                placeholder="Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <LockClosedIcon className="absolute top-1/2 -translate-y-1/2 left-4 w-5 h-5 text-gray-400 dark:text-slate-400" />
              <input
                className="w-full h-14 pl-12 pr-12 rounded-2xl bg-gray-100 dark:bg-neumorphic-base-dark text-gray-800 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-500 shadow-neumorphic dark:shadow-neumorphic-dark focus:outline-none focus:ring-2 focus:ring-teal-300 dark:focus:ring-teal-500 transition-all duration-300"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </p>
            )}

            {/* Sign In Button with Gradient Glow */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                relative w-full h-14 font-bold text-lg rounded-2xl overflow-hidden
                text-gray-700 dark:text-slate-100 bg-gray-100 dark:bg-neumorphic-base-dark
                shadow-neumorphic dark:shadow-neumorphic-dark
                transition-all duration-500 ease-in-out
                hover:scale-[1.02] active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-${accentColor}-400 dark:focus:ring-${accentColor}-500
              `}
            >
              {/* Soft gradient background */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${buttonGlow} opacity-0 hover:opacity-80 active:opacity-100 transition-opacity duration-500`}
              ></div>
              <span className="relative z-10">
                {isLoading && !showBiometricButton ? 'Signing In...' : 'Sign In'}
              </span>
            </button>
          </form>

          {/* --- ADDED: Biometric Button and "Or" divider --- */}
          {showBiometricButton && (
            <>
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-300 dark:border-slate-600"></div>
                <span className="mx-4 text-gray-500 dark:text-slate-400 text-sm">Or</span>
                <div className="flex-grow border-t border-gray-300 dark:border-slate-600"></div>
              </div>

              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={isLoading}
                className={`
                  relative w-full h-14 font-bold text-lg rounded-2xl overflow-hidden
                  text-gray-700 dark:text-slate-100 bg-gray-100 dark:bg-neumorphic-base-dark
                  shadow-neumorphic dark:shadow-neumorphic-dark
                  transition-all duration-500 ease-in-out
                  flex items-center justify-center gap-3
                  hover:scale-[1.02] active:scale-[0.98]
                  focus:outline-none focus:ring-2 focus:ring-${accentColor}-400 dark:focus:ring-${accentColor}-500
                `}
              >
                {/* Soft gradient background */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${buttonGlow} opacity-0 hover:opacity-80 active:opacity-100 transition-opacity duration-500`}
                ></div>
                {/* Fingerprint Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 z-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 12c0 2.21-.84 4.24-2.243 5.864m-1.13-1.13A5.96 5.96 0 0 0 18 12c0-1.774-.77-3.374-2.006-4.473m-9.02 9.02A5.96 5.96 0 0 0 6 12c0-1.774.77-3.374 2.006-4.473m-1.13 1.13A7.5 7.5 0 0 1 4.5 12c0 2.21.84 4.24 2.243 5.864m0 0a1.5 1.5 0 1 1-2.122-2.122 1.5 1.5 0 0 1 2.122 2.122Zm1.131 1.131a1.5 1.5 0 1 1-2.122-2.122 1.5 1.5 0 0 1 2.122 2.122Zm-1.131-4.242a1.5 1.5 0 1 1-2.122-2.122 1.5 1.5 0 0 1 2.122 2.122Zm1.131 1.131a1.5 1.5 0 1 1-2.122-2.122 1.5 1.5 0 0 1 2.122 2.122Zm-4.243-1.131a1.5 1.5 0 1 1-2.122-2.122 1.5 1.5 0 0 1 2.122 2.122Zm1.131 1.131a1.5 1.5 0 1 1-2.122-2.122 1.5 1.5 0 0 1 2.122 2.122Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a.75.75 0 0 0 .75-.75V12a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 .75.75Z" />
                </svg>
                <span className="relative z-10">
                  {isLoading ? 'Checking...' : 'Login with Biometrics'}
                </span>
              </button>
            </>
          )}

        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400/80 mt-8 absolute bottom-5 z-10 transition-colors">
        SRCS Learning Portal &copy; 2025
      </p>
    </div>
  );
};

export default LoginPage;