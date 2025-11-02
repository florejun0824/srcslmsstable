import React, { useState } from 'react';
import Modal from '../common/Modal';
import EditPasswordModal from './EditPasswordModal';
import Spinner from '../common/Spinner'; // <-- 1. IMPORT SPINNER

const EditUserModal = ({ user, onSubmit, onClose, onUpdatePassword, isLoading }) => { // <-- 2. ACCEPT isLoading PROP
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [role, setRole] = useState(user.role || 'student');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = { firstName: firstName.trim(), lastName: lastName.trim(), role };
    onSubmit(updates);
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={`Edit User: ${user.email}`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-all"
            >
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>

          {/* Password Section */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Password
            </label>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-gray-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all"
            >
              Change Password
            </button>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading} // <-- 3. Disable when loading
              className="px-5 py-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-gray-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading} // <-- 4. Disable when loading
              // --- 5. MODIFIED: Added flex/center, min-width, and fixed shadow ---
              className="flex items-center justify-center min-w-[140px] px-5 py-2 rounded-xl bg-indigo-500 text-white shadow-md hover:bg-indigo-600 active:shadow-inner transition-all disabled:opacity-70 disabled:bg-indigo-400"
            >
              {/* --- 6. MODIFIED: Show Spinner or Text --- */}
              {isLoading ? <Spinner size="sm" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

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
    </>
  );
};

export default EditUserModal;