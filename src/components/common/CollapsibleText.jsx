import React, { useState } from 'react';

const CollapsibleText = ({ text, maxLength = 200 }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text) {
        return null;
    }

    const toggleIsExpanded = (e) => {
        e.stopPropagation(); // Prevent clicks from affecting parent elements
        setIsExpanded(!isExpanded);
    };

    const isTruncatable = text.length > maxLength;
    const displayedText = isExpanded ? text : `${text.substring(0, maxLength)}${isTruncatable ? '...' : ''}`;

    return (
        <div className="text-gray-800 whitespace-pre-wrap">
            {displayedText}
            {isTruncatable && (
                <button 
                    onClick={toggleIsExpanded} 
                    className="text-blue-600 hover:underline font-semibold text-sm ml-2"
                >
                    {isExpanded ? 'Show Less' : 'Read More'}
                </button>
            )}
        </div>
    );
};

export default CollapsibleText;