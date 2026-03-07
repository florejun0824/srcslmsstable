// src/components/student/OfflineLessonsView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    getOfflineLessons,
    removeOfflineLesson,
    clearAllOfflineContent,
    getOfflineStorageUsage,
} from '../../services/offlineContentService';
import { useToast } from '../../contexts/ToastContext';
import {
    CloudArrowDownIcon,
    TrashIcon,
    BookOpenIcon,
    FolderOpenIcon,
    ExclamationTriangleIcon,
    CircleStackIcon,
} from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';

const OfflineLessonsView = ({ onOpenLesson }) => {
    const { showToast } = useToast();
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [storageInfo, setStorageInfo] = useState(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const fetchLessons = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cachedLessons, usage] = await Promise.all([
                getOfflineLessons(),
                getOfflineStorageUsage(),
            ]);
            setLessons(cachedLessons);
            setStorageInfo(usage);
        } catch (err) {
            console.error('Error loading offline lessons:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLessons();
    }, [fetchLessons]);

    const handleRemove = async (lessonId, title) => {
        try {
            await removeOfflineLesson(lessonId);
            showToast(`"${title}" removed from offline storage.`, 'success');
            fetchLessons();
        } catch (err) {
            showToast('Failed to remove lesson.', 'error');
        }
    };

    const handleClearAll = async () => {
        try {
            await clearAllOfflineContent();
            showToast('All offline content cleared.', 'success');
            setShowClearConfirm(false);
            fetchLessons();
        } catch (err) {
            showToast('Failed to clear offline content.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-500">
                        <CloudArrowDownIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">Offline Lessons</h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} saved
                            {storageInfo && ` • ${storageInfo.sizeFormatted}`}
                        </p>
                    </div>
                </div>

                {lessons.length > 0 && (
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Clear All
                    </button>
                )}
            </div>

            {/* Clear Confirmation */}
            {showClearConfirm && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800 flex items-center gap-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-800 dark:text-red-200">Clear all offline content?</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">This action cannot be undone.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleClearAll} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">
                            Clear All
                        </button>
                    </div>
                </div>
            )}

            {/* Lessons List */}
            {lessons.length === 0 ? (
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-16 text-center border border-white/40 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
                        <FolderOpenIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Offline Lessons</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Save lessons for offline reading by tapping the download icon while viewing a lesson.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {lessons.map(lesson => (
                        <div
                            key={lesson.id}
                            className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-sm p-5 flex items-center gap-4 hover:bg-white/80 dark:hover:bg-white/10 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-500 flex-shrink-0">
                                <BookOpenIcon className="w-6 h-6" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">
                                    {lesson.title || 'Untitled Lesson'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {lesson.className && (
                                        <span className="text-[10px] text-slate-400 font-medium">{lesson.className}</span>
                                    )}
                                    {lesson.cachedAt && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                Saved {new Date(lesson.cachedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => onOpenLesson && onOpenLesson(lesson)}
                                    className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                                >
                                    Open
                                </button>
                                <button
                                    onClick={() => handleRemove(lesson.id, lesson.title)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Storage Info */}
            {storageInfo && storageInfo.count > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-100/50 dark:bg-white/5 rounded-2xl">
                    <CircleStackIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {storageInfo.count} lesson{storageInfo.count !== 1 ? 's' : ''} • Using {storageInfo.sizeFormatted} of offline storage
                    </span>
                </div>
            )}
        </div>
    );
};

export default OfflineLessonsView;
