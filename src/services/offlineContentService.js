// src/services/offlineContentService.js
// Offline lesson caching service using localforage (IndexedDB)

import localforage from 'localforage';

// Create a separate localforage instance for offline lessons
// This avoids conflicts with the quiz submission outbox
const offlineStore = localforage.createInstance({
    name: 'LMSApp',
    storeName: 'offlineLessons',
});

/**
 * Save a lesson for offline access.
 * Stores lesson content, metadata, and cache timestamp.
 */
export const saveLessonOffline = async (lesson) => {
    try {
        if (!lesson || !lesson.id) {
            throw new Error('Invalid lesson: missing ID.');
        }

        const cacheEntry = {
            ...lesson,
            cachedAt: new Date().toISOString(),
        };

        await offlineStore.setItem(`lesson_${lesson.id}`, cacheEntry);
        console.log(`✅ Lesson "${lesson.title}" saved offline.`);
        return true;
    } catch (err) {
        console.error('❌ saveLessonOffline failed:', err);
        throw err;
    }
};

/**
 * Get all cached lessons.
 * Returns an array of lesson objects with cache metadata.
 */
export const getOfflineLessons = async () => {
    try {
        const lessons = [];
        await offlineStore.iterate((value, key) => {
            if (key.startsWith('lesson_')) {
                lessons.push(value);
            }
        });

        // Sort by cache date (newest first)
        lessons.sort((a, b) => new Date(b.cachedAt) - new Date(a.cachedAt));
        return lessons;
    } catch (err) {
        console.error('❌ getOfflineLessons failed:', err);
        return [];
    }
};

/**
 * Get a single cached lesson by ID.
 */
export const getOfflineLesson = async (lessonId) => {
    try {
        return await offlineStore.getItem(`lesson_${lessonId}`);
    } catch (err) {
        console.error(`❌ getOfflineLesson failed for id=${lessonId}:`, err);
        return null;
    }
};

/**
 * Remove a lesson from offline cache.
 */
export const removeOfflineLesson = async (lessonId) => {
    try {
        await offlineStore.removeItem(`lesson_${lessonId}`);
        console.log(`✅ Lesson ${lessonId} removed from offline cache.`);
        return true;
    } catch (err) {
        console.error(`❌ removeOfflineLesson failed for id=${lessonId}:`, err);
        throw err;
    }
};

/**
 * Check if a lesson is cached offline.
 */
export const isLessonCachedOffline = async (lessonId) => {
    try {
        const item = await offlineStore.getItem(`lesson_${lessonId}`);
        return item !== null;
    } catch (err) {
        console.error(`❌ isLessonCachedOffline failed for id=${lessonId}:`, err);
        return false;
    }
};

/**
 * Estimate storage usage for offline lessons.
 * Returns an object with count and approximate size in bytes.
 */
export const getOfflineStorageUsage = async () => {
    try {
        let totalSize = 0;
        let count = 0;

        await offlineStore.iterate((value, key) => {
            if (key.startsWith('lesson_')) {
                // Rough estimation: JSON stringify the value
                totalSize += new Blob([JSON.stringify(value)]).size;
                count++;
            }
        });

        return {
            count,
            sizeBytes: totalSize,
            sizeFormatted: formatBytes(totalSize),
        };
    } catch (err) {
        console.error('❌ getOfflineStorageUsage failed:', err);
        return { count: 0, sizeBytes: 0, sizeFormatted: '0 B' };
    }
};

/**
 * Clear all offline lessons.
 */
export const clearAllOfflineContent = async () => {
    try {
        await offlineStore.clear();
        console.log('✅ All offline content cleared.');
        return true;
    } catch (err) {
        console.error('❌ clearAllOfflineContent failed:', err);
        throw err;
    }
};

// Helper: format bytes to human-readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
