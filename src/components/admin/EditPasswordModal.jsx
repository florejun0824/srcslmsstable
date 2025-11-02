import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Eye, EyeOff } from 'lucide-react';

const EditPasswordModal = ({ user, onSubmit, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Change Password for ${user.email}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Password Input */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New Password"
            required
            // --- MODIFIED: Added dark mode classes ---
            className="w-full p-3 pr-10 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            // --- MODIFIED: Added dark mode classes ---
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          // --- MODIFIED: Added dark mode classes ---
          className="w-full px-5 py-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-gray-800 dark:text-slate-100 font-medium shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all"
        >
          Update Password
        </button>
      </form>
    </Modal>
  );
};

export default EditPasswordModal;