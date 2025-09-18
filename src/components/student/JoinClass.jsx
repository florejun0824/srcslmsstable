import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';

const JoinClass = ({ studentId }) => {
    const [classCode, setClassCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!classCode.trim()) return;
        setIsSubmitting(true);
        try {
            const q = query(collection(db, "classes"), where("code", "==", classCode.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) { throw new Error("Invalid class code"); }
            const classDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, "classes", classDoc.id), { studentIds: arrayUnion(studentId) }); // Assuming the field is studentIds
            showToast("Successfully joined class!");
            setClassCode('');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 border border-white/30 rounded-2xl bg-white/60 backdrop-blur-2xl shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-slate-800">Join a New Class</h3>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder="Enter Class Code"
                    className="flex-grow p-3 border border-gray-400/50 rounded-xl bg-white/50 focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                    required
                    maxLength="6"
                />
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 shadow-md shadow-red-600/30 hover:shadow-lg transition-all disabled:bg-gray-400 disabled:shadow-none"
                >
                    {isSubmitting ? 'Joining...' : 'Join'}
                </button>
            </form>
        </div>
    );
};

export default JoinClass;