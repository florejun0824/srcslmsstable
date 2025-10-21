// src/pages/LoginPage.js

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
    AcademicCapIcon, 
    BriefcaseIcon, 
    AtSymbolIcon, 
    LockClosedIcon,
    EyeIcon,          // <-- Added
    EyeSlashIcon      // <-- Added
} from '@heroicons/react/24/solid';
import RoleDock from '../components/common/RoleDock';

const HeliosBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
    <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-40 animate-blob"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-200 rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-[20%] left-[15%] w-80 h-80 bg-teal-200 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
  </div>
);

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // <-- State for password visibility
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <HeliosBackground />

      <div className="relative z-10 w-full max-w-sm space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center">
          <img
            src="https://i.ibb.co/XfJ8scGX/1.png"
            alt="SRCS Logo"
            className="w-24 h-24 mx-auto mb-4 rounded-full shadow-neumorphic"
          />
          <h1 className="text-4xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-500">Please sign in to continue.</p>
        </div>

        {/* Card Container */}
        <div className="bg-gray-100 p-8 rounded-3xl shadow-neumorphic-inset space-y-6">
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
              <AtSymbolIcon className="absolute top-1/2 -translate-y-1/2 left-4 w-5 h-5 text-gray-400" />
              <input
                className="w-full bg-gray-100 h-14 pl-12 pr-4 text-gray-800 placeholder:text-gray-500 rounded-2xl 
                           shadow-neumorphic focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-300"
                id="username"
                type="text"
                placeholder="Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password with View Icon */}
            <div className="relative">
              <LockClosedIcon className="absolute top-1/2 -translate-y-1/2 left-4 w-5 h-5 text-gray-400" />
              <input
                className="w-full bg-gray-100 h-14 pl-12 pr-12 text-gray-800 placeholder:text-gray-500 rounded-2xl 
                           shadow-neumorphic focus:outline-none focus:ring-2 focus:ring-teal-300 transition-all duration-300"
                id="password"
                type={showPassword ? 'text' : 'password'} // <-- Toggles input type
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)} // <-- Toggles state on click
                className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error */}
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            {/* Button */}
            <button
              className={`w-full h-14 bg-gray-100 text-gray-700 font-bold text-lg rounded-2xl 
                         shadow-neumorphic hover:shadow-neumorphic-strong active:shadow-neumorphic-inset 
                         transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-${accentColor}-300`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <p className="text-sm text-gray-500/80 mt-8 absolute bottom-5 z-10">
        SRCS Learning Portal &copy; 2025
      </p>
    </div>
  );
};

export default LoginPage;