// src/components/admin/EditUserModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Shield, KeyRound, Check } from 'lucide-react'; // Added icons for visual context
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

  // Modal Animation Variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 font-sans">
        {/* Backdrop Click Handler */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div 
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative glass-panel bg-white/95 dark:bg-slate-900/95 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-white/40 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200/50 dark:border-white/5">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Edit Profile
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                {user.email}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Name Fields Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Account Role</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition-all appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l border-slate-300 dark:border-slate-600 pl-2">
                    <Check className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Password Section (Glass Card) */}
              <div className="pt-2">
                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Security</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Manage password & access</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center min-w-[140px] px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Spinner size="sm" /> : 'Save Changes'}
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