import React from 'react';
import { Edit } from 'lucide-react';

const CourseCategoryCard = ({ category, courseCount, onClick, onEdit }) => {
    // This will print the data the card receives to your browser's console.
    console.log("CourseCategoryCard received:", category);

    // This forces the text to be large and red to rule out styling issues.
    const debugTextStyle = {
        color: 'red',
        fontSize: '16px',
        fontWeight: 'bold',
    };

    return (
        <div 
            className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all duration-300 relative group border hover:-translate-y-0.5"
            onClick={() => onClick(category.name || category)} // Handles both object and string props
        >
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-blue-500 hover:text-white" 
                    title="Edit Category Name"
                >
                    <Edit size={16} />
                </button>
            </div>

            {/* We will try to render the category name with a fallback message */}
            <h3 style={debugTextStyle}>
                {category?.name || "CATEGORY NAME NOT FOUND"}
            </h3>

            <p className="text-sm text-gray-500 mt-4">{courseCount} subjects</p>
        </div>
    );
};

export default CourseCategoryCard;