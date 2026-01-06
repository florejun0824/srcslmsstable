// src/components/admin/EditUserModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Shield, KeyRound, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EditPasswordModal from './EditPasswordModal';
import Spinner from '../common/Spinner';

const EditUserModal = ({ user, onSubmit, onClose, onUpdatePassword, isLoading }) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [role, setRole] = useState(user.role || 'student');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = { firstName: firstName.trim(), lastName: lastName.trim(), role };
    onSubmit(updates);
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Optimized Animations for Performance
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 30 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { type: "spring", damping: 28, stiffness: 350, mass: 0.8 } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20, 
      transition: { duration: 0.2, ease: "easeIn" } 
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 font-sans">
        
        {/* Optimized Backdrop */}
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-md transform-gpu will-change-opacity"
        />

        {/* Modal Container */}
        <motion.div 
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-[500px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] dark:shadow-black/50 border border-white/40 dark:border-white/10 overflow-hidden transform-gpu will-change-transform flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                Edit Profile
              </h2>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1.5">
                {user.email}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 transition-all active:scale-90"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Body */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">First Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-[1.2rem] bg-slate-100 dark:bg-black/20 border-transparent focus:bg-white dark:focus:bg-black/40 border-2 focus:border-blue-500/30 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                      placeholder="John"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Last Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-[1.2rem] bg-slate-100 dark:bg-black/20 border-transparent focus:bg-white dark:focus:bg-black/40 border-2 focus:border-blue-500/30 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide ml-1">Account Role</label>
                <div className="relative group">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 rounded-[1.2rem] bg-slate-100 dark:bg-black/20 border-2 border-transparent focus:bg-white dark:focus:bg-black/40 focus:border-blue-500/30 text-sm font-bold text-slate-900 dark:text-white appearance-none cursor-pointer outline-none transition-all"
                  >
                    <option value="student">Student Account</option>
                    <option value="teacher">Teacher Account</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Password Section (Glass Card) */}
              <div className="pt-2">
                <div className="p-1.5 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between pr-2">
                  <div className="flex items-center gap-4 pl-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 shadow-sm">
                      <KeyRound className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Security</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Manage Access</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-5 py-2.5 rounded-[1.2rem] text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-black/5 dark:border-white/5 shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-8 py-3.5 rounded-[1.2rem] font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center min-w-[140px] px-8 py-3.5 rounded-[1.2rem] font-bold text-sm text-white bg-[#007AFF] hover:bg-[#0062cc] shadow-lg shadow-blue-500/30 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Spinner size="sm" color="white" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Nested EditPasswordModal */}
        {isPasswordModalOpen && (
          <EditPasswordModal
            user={user}
            onSubmit={(newPassword) => {
              onUpdatePassword(user.id, newPassword);
              setIsPasswordModalOpen(false);
            }}
            onClose={() => setIsPasswordModalOpen(false)}
          />
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default EditUserModal;