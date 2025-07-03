// src/services/firestoreService.js

import { 
    db // This is imported from your firebase.js file
} from './firebase'; 

import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc,
    writeBatch // Import writeBatch for the new function
} from 'firebase/firestore';

// --- Placeholder for your existing functions ---

export const getAllUsers = async () => {
    const usersCollectionRef = collection(db, 'users');
    const snapshot = await getDocs(usersCollection_ref);
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return users;
};

export const addUser = async (userData) => {
    const usersCollectionRef = collection(db, 'users');
    await addDoc(usersCollectionRef, userData);
};

export const deleteUser = async (userId) => {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
};

export const updateUserPassword = async (userId, newPassword) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { password: newPassword });
};

// --- THIS IS THE NEW FUNCTION THAT FIXES THE ERROR ---

/**
 * Adds multiple user documents to Firestore in a single batch operation.
 * @param {Array<Object>} users - An array of user objects to be created.
 */
export const addMultipleUsers = async (users) => {
    // Get a new write batch
    const batch = writeBatch(db);
    
    // Get a reference to the 'users' collection
    const usersCollectionRef = collection(db, "users");

    users.forEach((user) => {
        // Create a reference for a new user document with a unique ID
        const newUserRef = doc(usersCollectionRef); 
        
        // Add the set operation to the batch
        batch.set(newUserRef, user);
    });

    // Commit the batch to the database
    await batch.commit();
};