import React, { useState } from 'react';
import Modal from '../common/Modal';

const AddUserModal = ({ onSubmit, onClose }) => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'student' });
    
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Add validation here if needed
        onSubmit(formData);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New User">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required className="w-full p-2 border rounded" />
                <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" required className="w-full p-2 border rounded" />
                <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="admin">admin</option>
                </select>
                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Add User</button>
            </form>
        </Modal>
    );
};

export default AddUserModal;