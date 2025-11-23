import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { TrashIcon } from '@heroicons/react/24/outline';

const DeleteLessonModal = ({ isOpen, onClose, lesson, courseId, onLessonDeleted }) => {
    const [authCode, setAuthCode] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const { showToast } = useToast();

    const handleConfirm = async () => {
        if (authCode !== 'admin2025') {
            return showToast("Incorrect authentication code.", 'error');
        }
        if (!lesson) return;

        setIsDeleting(true);
        try {
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
                const courseData = courseSnap.data();
                const updatedUnits = courseData.units.map(unit => {
                    if (unit.id === lesson.unitId) {
                        const filteredLessons = unit.lessons.filter(l => l.id !== lesson.id);
                        return { ...unit, lessons: filteredLessons };
                    }
                    return unit;
                });
                await updateDoc(courseRef, { units: updatedUnits });
                showToast("Lesson deleted successfully!", "success");
                onLessonDeleted();
                onClose();
            }
        } catch (error) {
            showToast("Failed to delete lesson.", 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleConfirm();
    };

    // --- DESIGN SYSTEM CONSTANTS ---
    const glassInput = "w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-4 text-center text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-lg tracking-widest";
    
    const primaryBtn = `
        w-full py-4 rounded-xl font-bold text-sm text-white shadow-lg shadow-red-500/30 
        bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 
        border border-red-400/20 active:scale-[0.98] transition-all duration-200
        disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none
    `;

    const secondaryBtn = `
        w-full py-4 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 
        bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 
        active:scale-[0.98] transition-all duration-200
    `;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Confirm Deletion"
            size="md"
            // Override Modal styles for consistency with DeleteConfirmationModal
            roundedClass="rounded-[2.5rem] !bg-white/90 dark:!bg-[#18181b]/90 !backdrop-blur-2xl !border !border-white/20 dark:!border-white/5 !shadow-2xl"
            contentClassName="!p-0"
            showCloseButton={false}
        >
            <div className="p-8 text-center">
                
                {/* Icon with Glow Effect */}
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-500">
                    <div className="absolute inset-0 rounded-full bg-red-500 blur-2xl opacity-20"></div>
                    <TrashIcon className="h-10 w-10 relative z-10" aria-hidden="true" strokeWidth={1.5} />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                    Delete Lesson?
                </h3>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-8 px-2">
                    Are you sure you want to delete this lesson? <br/>
                    This action <span className="text-red-500 font-bold">cannot be undone</span>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Admin Authorization
                        </label>
                        <input 
                            type="password" 
                            value={authCode} 
                            onChange={(e) => setAuthCode(e.target.value)} 
                            placeholder="Enter Auth Code" 
                            className={glassInput}
                            required 
                            autoComplete="off"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isDeleting}
                            className={secondaryBtn}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isDeleting || !authCode}
                            className={primaryBtn}
                        >
                            {isDeleting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                </span>
                            ) : 'Confirm Delete'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default DeleteLessonModal;