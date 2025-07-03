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
            await updateDoc(doc(db, "classes", classDoc.id), { students: arrayUnion(studentId) });
            showToast("Successfully joined class!");
            setClassCode('');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 border border-white/30 rounded-2xl bg-white/50 backdrop-blur-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Join a New Class</h3>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="Enter Class Code"
                    className="flex-grow p-3 border border-gray-300 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                    required
                />
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-blue-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-600 shadow hover:shadow-lg transition-all disabled:bg-gray-400"
                >
                    {isSubmitting ? 'Joining...' : 'Join'}
                </button>
            </form>
        </div>
    );
};

export default JoinClass;