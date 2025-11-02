// src/pages/LoginPage.js
import React, { useState } from 'react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(`${email}@srcs.edu`, password, selectedRole);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
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
                {isLoading ? 'Signing In...' : 'Sign In'}
              </span>
            </button>
          </form>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400/80 mt-8 absolute bottom-5 z-10 transition-colors">
        SRCS Learning Portal &copy; 2025
      </p>
    </div>
  );
};

export default LoginPage;
