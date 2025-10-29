import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../../services/firebase';
import { doc, updateDoc, Timestamp, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { MagnifyingGlassIcon, CheckIcon, UserGroupIcon } from '@heroicons/react/24/solid';

// --- Reusable Neumorphic Checkbox (Unchanged) ---
const NeumorphicCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    
    return (
        <div className="relative w-5 h-5 flex-shrink-0">
            <input 
                type="checkbox" 
                ref={ref} 
                checked={checked} 
                {...props} 
                className="sr-only peer" 
            />
            <span className="w-full h-full bg-neumorphic-base rounded-md shadow-neumorphic-inset flex items-center justify-center transition-all peer-checked:bg-blue-500 peer-checked:shadow-neumorphic">
                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
        </div>
    );
});


// --- Component starts here ---

const EditAvailabilityModal = ({ isOpen, onClose, post, classId, onUpdate, classData }) => {
    const { showToast } = useToast();
    const [availableFrom, setAvailableFrom] = useState(new Date());
    const [availableUntil, setAvailableUntil] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [tempRecipientIds, setTempRecipientIds] = useState(new Set()); 
    const [originalRecipientIds, setOriginalRecipientIds] = useState(new Set());
    
    const [updateScope, setUpdateScope] = useState('single'); // 'single', 'unit', 'all'


    const allStudents = useMemo(() => {
        const students = classData?.students || []; 
        
        return students.map(s => {
            const displayName = `${s.lastName || ''}, ${s.firstName || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || s.id;
            const searchName = `${s.firstName || ''} ${s.lastName || ''} ${s.displayName || ''}`.toLowerCase();
            
            return {
                ...s,
                displayName: displayName,
                searchName: searchName,
            };
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [classData]);

    // --- MODIFIED: Get the unitId from the nested lesson/quiz ---
    const postUnitId = useMemo(() => {
        if (post?.lessons && post.lessons.length > 0) {
            return post.lessons[0].unitId;
        }
        if (post?.quizzes && post.quizzes.length > 0) {
            return post.quizzes[0].unitId; // Assuming quizzes can also have a unitId
        }
        // Fallback to the top-level 'post' object just in case
        return post?.unitId; 
    }, [post]);


    useEffect(() => {
        if (post) {
            setAvailableFrom(post.availableFrom?.toDate() || new Date());
            setAvailableUntil(post.availableUntil?.toDate() || new Date());
            
            const initialIds = new Set();
            const originalIds = new Set();
            const allCurrentStudentIds = new Set(allStudents.map(s => s.id));
            
            if (post.targetAudience === 'all') {
                allCurrentStudentIds.forEach(id => {
                    initialIds.add(id);
                    originalIds.add(id); // All are original recipients
                });
            } else if (post.targetAudience === 'specific' && post.targetStudentIds) {
                post.targetStudentIds.forEach(id => {
                    if (allCurrentStudentIds.has(id)) {
                         initialIds.add(id);
                         originalIds.add(id); // These are the explicit original recipients
                    }
                });
            } else {
                // Fallback: assume all were selected (safer than assuming none)
                 allCurrentStudentIds.forEach(id => {
                    initialIds.add(id);
                    originalIds.add(id);
                 });
            }
            
            setTempRecipientIds(initialIds);
            setOriginalRecipientIds(originalIds);
            
            setUpdateScope('single');
        }
    }, [post, allStudents]); 


    // Handlers for date/time (unchanged)
    const handleDateChange = (date, field) => {
        const setter = field === 'from' ? setAvailableFrom : setAvailableUntil;
        const currentDate = field === 'from' ? availableFrom : availableUntil;
        
        setter(prevDate => {
            const newDate = new Date(currentDate || new Date());
            newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
            return newDate;
        });
    };

    const handleTimeChange = (e, field) => {
        const setter = field === 'from' ? setAvailableFrom : setAvailableUntil;
        const [hours, minutes] = e.target.value.split(':');
        
        setter(prevDate => {
            const newDate = new Date(prevDate || new Date());
            newDate.setHours(parseInt(hours, 10));
            newDate.setMinutes(parseInt(minutes, 10));
            return newDate;
        });
    };

    // Recipient Toggle Logic (unchanged)
    const handleToggleStudent = useCallback((studentId) => {
        if (originalRecipientIds.has(studentId)) {
            showToast("A student who already received the post cannot be unselected.", "info");
            return;
        }

        setTempRecipientIds(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(studentId)) {
                newSet.delete(studentId);
            } else {
                newSet.add(studentId);
            }
            return newSet;
        });
    }, [originalRecipientIds, showToast]);

    // Recipient Toggle All Logic (unchanged)
    const handleToggleAllStudents = useCallback(() => {
        const allStudentIds = allStudents.map(s => s.id);
        const allSelected = tempRecipientIds.size === allStudentIds.length;
        
        setTempRecipientIds(prevSet => {
            const newSet = new Set(prevSet);
            if (allSelected) {
                allStudentIds.forEach(id => {
                    if (!originalRecipientIds.has(id)) {
                        newSet.delete(id);
                    }
                });
            } else {
                allStudentIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    }, [allStudents, tempRecipientIds.size, originalRecipientIds]);


    // --- MODIFIED: `handleUpdate` uses the `postUnitId` variable ---
    const handleUpdate = async () => {
        if (!post?.id || !classId) {
            showToast("Missing information to update dates.", "error");
            return;
        }

        const recipientIdsArray = Array.from(tempRecipientIds);
        if (recipientIdsArray.length === 0) {
            showToast("You must select at least one student or 'Select all students'.", "error");
            return;
        }
        
        const unselectedOriginals = Array.from(originalRecipientIds).filter(id => !tempRecipientIds.has(id));
        if (unselectedOriginals.length > 0) {
             showToast("Cannot save. You cannot unselect a student who already received the post.", "error");
             return;
        }


        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const classRef = doc(db, "classes", classId);
            
            const isAllStudentsSelected = recipientIdsArray.length === allStudents.length;
            const updatePayload = {
                availableFrom: Timestamp.fromDate(availableFrom),
                availableUntil: Timestamp.fromDate(availableUntil),
                targetAudience: isAllStudentsSelected ? 'all' : 'specific',
                targetStudentIds: isAllStudentsSelected ? [] : recipientIdsArray, 
            };
            
            const postsCollectionRef = collection(db, `classes/${classId}/posts`);

            if (updateScope === 'single') {
                const postRef = doc(db, `classes/${classId}/posts`, post.id);
                batch.update(postRef, updatePayload);

            } else {
                let postsToUpdateQuery;
                
                if (updateScope === 'unit') {
                    // --- MODIFIED: Use the postUnitId variable ---
                    if (!postUnitId) {
                        showToast("This post has no unit ID. Cannot update by unit.", "error");
                        setIsSubmitting(false);
                        return;
                    }
                    
                    // --- IMPORTANT ---
                    // This query assumes your *other* 'post' documents
                    // ALSO have a top-level 'unitId' field to query against.
                    // If 'unitId' is nested (e.g., 'lessons.0.unitId'),
                    // this query will not work.
                    // Your 'post' documents MUST be denormalized with a
                    // top-level 'unitId' for this query to function.
                    postsToUpdateQuery = query(postsCollectionRef, where('unitId', '==', postUnitId));

                } else if (updateScope === 'all') {
                    postsToUpdateQuery = query(postsCollectionRef);
                }

                const postsSnapshot = await getDocs(postsToUpdateQuery);
                
                if (postsSnapshot.empty) {
                     showToast("No other posts found for the selected scope.", "info");
                }
                
                postsSnapshot.forEach(postDoc => {
                    batch.update(postDoc.ref, updatePayload);
                });
            }


            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            
            await batch.commit();

            showToast("Activity settings updated successfully!", "success");

            if (updateScope === 'single') {
                onUpdate({
                    id: post.id,
                    availableFrom: Timestamp.fromDate(availableFrom),
                    availableUntil: Timestamp.fromDate(availableUntil),
                    ...updatePayload 
                });
            } else {
                // Tell parent to refetch all data
                onUpdate({ isMassUpdate: true });
            }
            
            onClose();
        } catch (error) {
            console.error("Error updating settings:", error);
            showToast("Failed to update activity settings.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        // ... (Delete logic is unchanged) ...
        if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
            return;
        }

        if (!post?.id || !classId) {
            showToast("Cannot delete. Missing required information.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, `classes/${classId}/posts`, post.id);
            const classRef = doc(db, "classes", classId);
            
            const quizIds = post.quizzes?.map(q => q.id) || [];
            
            if (quizIds.length > 0) {
                const locksQuery = query(collection(db, 'quizLocks'), where('quizId', 'in', quizIds));
                const locksSnapshot = await getDocs(locksQuery);
                locksSnapshot.forEach(lockDoc => {
                    batch.delete(lockDoc.ref);
                });
            }

            batch.delete(postRef);
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });

            await batch.commit();

            showToast("Post deleted successfully!", "success");
            
            onUpdate({ id: post.id, isDeleted: true });
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            showToast("Failed to delete the post.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return allStudents;
        const lowerSearch = searchTerm.toLowerCase();
        return allStudents.filter(s => 
            s.searchName.includes(lowerSearch)
        );
    }, [allStudents, searchTerm]);

    const isAllSelectedInClass = allStudents.length > 0 && tempRecipientIds.size === allStudents.length;
    const isPartiallySelected = tempRecipientIds.size > 0 && !isAllSelectedInClass;


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Activity Settings" size="4xl"> 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. General Settings (Left Column) */}
                <div className="space-y-6 flex flex-col">
                    <h2 className="text-xl font-bold text-slate-800">General Settings</h2>
                    
                    <div className="bg-neumorphic-base p-5 rounded-xl shadow-neumorphic space-y-4 flex-grow"> 
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            type="text"
                            readOnly
                            // This logic correctly finds the title inside the nested lesson/quiz
                            value={post?.lessons?.[0]?.title || post?.quizzes?.[0]?.title || 'Untitled Activity'}
                            className="w-full p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 disabled:opacity-80"
                            disabled
                        />
                         <label className="block text-sm font-medium text-slate-700 mb-1">Comments (Optional)</label>
                        <textarea
                            readOnly
                            value={post?.content || ''}
                            placeholder="No comments for this post."
                            rows={3}
                            className="w-full p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 disabled:opacity-80 resize-none"
                            disabled
                        />
                    </div>

                    {/* Available From/Until */}
                    <div className="bg-neumorphic-base p-5 rounded-xl shadow-neumorphic space-y-4 flex-shrink-0">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Period: Available From</label>
                        <div className="flex gap-2">
                            <DatePicker
                                selected={availableFrom}
                                onChange={(date) => handleDateChange(date, 'from')}
                                dateFormat="MMMM d, yyyy"
                                className="w-2/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                            />
                            <input
                                type="time"
                                value={formatTime(availableFrom)}
                                onChange={(e) => handleTimeChange(e, 'from')}
                                className="w-1/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                            />
                        </div>

                        <label className="block text-sm font-medium text-slate-700 mb-1">Available Until</label>
                        <div className="flex gap-2">
                            <DatePicker
                                selected={availableUntil}
                                onChange={(date) => handleDateChange(date, 'until')}
                                dateFormat="MMMM d, yyyy"
                                className="w-2/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                            />
                            <input
                                type="time"
                                value={formatTime(availableUntil)}
                                onChange={(e) => handleTimeChange(e, 'until')}
                                className="w-1/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Recipient Settings (Right Column) */}
                <div className="space-y-4 flex flex-col min-h-[500px]">
                    <h2 className="text-xl font-bold text-slate-800">Recipients ({classData?.name || 'Class Roster'})</h2>
                    
                    {/* Search Bar */}
                    <div className="relative flex-shrink-0">
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 bg-neumorphic-base shadow-neumorphic-inset rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
                        />
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Student List Container */}
                    <div className="flex-1 bg-neumorphic-base rounded-xl shadow-neumorphic overflow-hidden flex flex-col min-h-0">
                        
                        {/* Select All Header */}
                        <header 
                            onClick={handleToggleAllStudents}
                            className="flex items-center gap-3 p-4 border-b border-black/10 cursor-pointer hover:bg-black/5 flex-shrink-0"
                        >
                            <NeumorphicCheckbox
                                checked={isAllSelectedInClass}
                                indeterminate={isPartiallySelected}
                                onChange={handleToggleAllStudents}
                                aria-label="Select all students"
                            />
                            <label className="font-semibold text-slate-800 flex-grow cursor-pointer select-none">
                                Select all students
                            </label>
                            <span className="text-sm text-slate-500 font-normal">
                                ({tempRecipientIds.size}/{allStudents.length})
                            </span>
                        </header>

                        {/* Student List Scroll Area */}
                        <ul className="flex-1 overflow-y-auto">
                            {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                const studentName = student.displayName; 
                                const isSelected = tempRecipientIds.has(student.id);
                                const isDisabled = originalRecipientIds.has(student.id);

                                return (
                                    <li
                                        key={student.id}
                                        onClick={() => handleToggleStudent(student.id)}
                                        className={`flex items-center gap-3 p-4 transition-colors border-t border-black/5 first:border-t-0 ${
                                            isDisabled 
                                            ? 'bg-gray-100 cursor-default opacity-80' 
                                            : isSelected 
                                                ? 'bg-blue-500/10 cursor-pointer' 
                                                : 'hover:bg-black/5 cursor-pointer'
                                        }`}
                                    >
                                        <NeumorphicCheckbox checked={isSelected} readOnly disabled={isDisabled} />
                                        <span className="text-slate-800 flex-grow select-none">{studentName}</span>
                                        {isSelected && <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                                    </li>
                                );
                            }) : (
                                <li className="p-8 text-center text-slate-500">
                                    <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                    No students match your search.
                                </li>
                            )}
                        </ul>
                    </div>

                </div>
            </div>

            {/* --- MODIFIED FOOTER: Uses postUnitId to show/hide "This Unit" option --- */}
            <div className="flex justify-between items-center pt-4 border-t border-black/10 mt-6">
                
                {/* Delete Button (Left Side) */}
                <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-semibold text-red-600 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50"
                    disabled={isSubmitting}
                >
                    Delete Post
                </button>
                
                {/* Actions (Right Side) */}
                <div className="flex flex-col items-end gap-3">
                    
                    {/* Update Scope Options */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-700">Apply settings to:</label>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="updateScope"
                                    value="single"
                                    checked={updateScope === 'single'} 
                                    onChange={(e) => setUpdateScope(e.target.value)}
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                />
                                <span className="text-sm">This Post Only</span>
                            </label>
                            
                            {/* --- MODIFIED: Use postUnitId to show this option --- */}
                            {postUnitId && (
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="updateScope"
                                        value="unit"
                                        checked={updateScope === 'unit'} 
                                        onChange={(e) => setUpdateScope(e.target.value)}
                                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                    />
                                    <span className="text-sm">This Unit</span>
                                </label>
                            )}
                            
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="updateScope"
                                    value="all"
                                    checked={updateScope === 'all'} 
                                    onChange={(e) => setUpdateScope(e.target.value)}
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                />
                                <span className="text-sm">All Posts</span>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50" 
                            disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button 
                            onClick={handleUpdate} 
                            className="px-4 py-2 text-sm font-semibold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50" 
                            disabled={isSubmitting || tempRecipientIds.size === 0}>
                            {isSubmitting ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;