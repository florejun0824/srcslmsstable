// src/pages/AdminSignup.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// This is a temporary component to create the first admin user securely.
const AdminSignup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signupAndCreateProfile } = useAuth();
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Use the new, secure function from AuthContext to create the user
            await signupAndCreateProfile(email, password, 'admin', firstName, lastName);
            alert('Admin user created successfully! You will now be redirected to the login page.');
            navigate('/login'); // or wherever your login page is
        } catch (err) {
            setError(`Failed to create admin user: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '50px', maxWidth: '400px', margin: 'auto' }}>
            <h1>Create First Admin User (Temporary)</h1>
            <p>Use this form ONCE to create your main administrator account. After successful creation, please remove this page from your application's routes.</p>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" required style={{ padding: '8px' }} />
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" required style={{ padding: '8px' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin Email" required style={{ padding: '8px' }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ padding: '8px' }} />
                <button type="submit" disabled={loading} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    {loading ? 'Creating...' : 'Create Admin Account'}
                </button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </div>
    );
};

export default AdminSignup;