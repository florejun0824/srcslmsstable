// src/components/admin/EditRoleModal.js

import React, { useState, useEffect } from 'react';
// CORRECTED IMPORT PATH:
import { useToast } from '../../contexts/ToastContext';

const EditRoleModal = ({ user, onSubmit, onClose }) => {
    const [newRole, setNewRole] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (user) {
            setNewRole(user.role);
        }
    }, [user]);

    if (!user) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newRole === user.role) {
            return showToast('No change in role detected.', 'info');
        }
        onSubmit(user.id, newRole);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit User Role</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <p className="text-sm text-gray-500">
                            Editing role for: <span className="font-semibold text-gray-800">{user.firstName} {user.lastName}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                            Current Role: <span className="font-semibold text-gray-800 capitalize">{user.role}</span>
                        </p>
                    </div>
                    <div className="mb-6">
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">New Role</label>
                        <select
                            id="role"
                            name="role"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Update Role
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditRoleModal;
