// src/utils/apiFetch.js
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

/**
 * A custom wrapper for the native fetch API that handles auth tokens
 * and automatically logs the user out on 401/403 errors.
 */
export const apiFetch = async (url, options = {}) => {
    // 1. Grab the current user's token securely
    const user = auth.currentUser;
    let token = '';
    
    if (user) {
        // getIdToken() automatically handles refreshing the token if it's close to expiring
        token = await user.getIdToken(); 
    }

    // 2. Automatically inject the Authorization header
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Allow overriding headers if needed
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    // 3. Make the actual network request
    const response = await fetch(url, { ...options, headers });

    // 4. THE MAGIC: Globally intercept 401 (Unauthorized) and 403 (Forbidden)
    if (response.status === 401 || response.status === 403) {
        console.warn("Session expired or invalid token detected. Forcing logout...");
        
        try {
            await signOut(auth); // Tell Firebase to kill the local session
        } catch (err) {
            console.error("Error signing out:", err);
        } finally {
            // Wipe the slate clean
            localStorage.clear();
            sessionStorage.clear();
            
            // Force a hard redirect back to the login screen
            window.location.href = '/login'; 
            
            // Throw an error so the calling function stops executing
            throw new Error("Session expired. Please log in again.");
        }
    }

    // If everything is fine, return the response as normal
    return response;
};