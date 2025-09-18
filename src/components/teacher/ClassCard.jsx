import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Edit, X } from 'lucide-react';

const ClassCard = ({ classData, onClick, onEdit }) => {
    const { showToast } = useToast();

    const handleDelete = async (e) => {
        e.stopPropagation(); // Prevents the main card's onClick from firing
        if (window.confirm(`Are you sure you want to delete the class "${classData.name}"?`)) {
            try {
                await deleteDoc(doc(db, "classes", classData.id));
                showToast("Class deleted successfully!");
            } catch (error) {
                showToast("Failed to delete class.", 'error');
                console.error("Error deleting class:", error);
            }
        }
    };
    
    const handleEdit = (e) => {
        e.stopPropagation(); // Prevents the main card's onClick from firing
        onEdit(classData);
    };

    return (
        // --- UPDATED STYLING: Solid white card to sit inside the main glass panel ---
        <div 
            className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all duration-300 relative group border hover:-translate-y-0.5" 
            onClick={() => onClick(classData)}
        >
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleEdit} className="p-1.5 rounded-full bg-slate-100 hover:bg-blue-500 hover:text-white" title="Edit Class Name">
                    <Edit size={16} />
                </button>
                <button onClick={handleDelete} className="p-1.5 rounded-full bg-slate-100 hover:bg-red-500 hover:text-white" title="Delete Class">
                    <X size={16} />
                </button>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2 pr-12 truncate">{classData.name}</h3>
            <p className="text-sm text-gray-600">Code: <span className="font-mono bg-slate-100 px-2 py-1 rounded-md text-blue-800">{classData.code}</span></p>
            <p className="text-sm text-gray-500 mt-1">Students: {classData.students.length}</p>
        </div>
    );
};

export default ClassCard;