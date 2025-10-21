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
            className="w-full p-3 pr-10 rounded-xl bg-neumorphic-base shadow-neumorphic-inset text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-5 py-3 rounded-xl bg-neumorphic-base text-gray-800 font-medium shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset transition-all"
        >
          Update Password
        </button>
      </form>
    </Modal>
  );
};

export default EditPasswordModal;
