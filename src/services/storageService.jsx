// src/services/storageService.js

import { storage } from './firebase'; // Import the initialized storage service from your firebase.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names

/**
 * Uploads an image blob (file data) to a 'diagrams' folder in your Firebase Storage.
 * @param {Blob} blob The image file data received from the AI service.
 * @returns {Promise<string>} The permanent, public download URL of the uploaded image.
 */
export const uploadImageBlob = async (blob) => {
    if (!blob) throw new Error("Image data cannot be empty.");

    // Create a unique file name using uuid to prevent files from being overwritten
    const fileName = `diagrams/${uuidv4()}.png`;
    const storageRef = ref(storage, fileName);

    // 'uploadBytes' uploads the data to the path specified
    const snapshot = await uploadBytes(storageRef, blob);

    // 'getDownloadURL' returns the public URL for the file
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
};

/**
 * Deletes an image from Firebase Storage using its full public URL.
 * @param {string} fileUrl The full https://firebasestorage.googleapis.com/... URL of the file.
 */
export const deleteImageByUrl = async (fileUrl) => {
    if (!fileUrl) return; // Don't do anything if the URL is empty

    try {
        // Create a reference directly from the URL
        const storageRef = ref(storage, fileUrl);
        // Delete the file
        await deleteObject(storageRef);
    } catch (error) {
        // A common error is that the file doesn't exist. We can safely ignore this
        // during cleanup tasks, but we log other errors.
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting image from storage:", error);
            throw error; // Re-throw other errors
        }
    }
};