// src/components/student/StudentClassDetailView.js (continued, or in a separate file like QuizListItem.js)

// New Component: QuizListItemForStudent
const QuizListItemForStudent = ({ quiz, onClick }) => {
    return (
        <div
            className="group relative bg-gradient-to-br from-white to-purple-50 p-5 rounded-xl shadow-md border border-purple-200
                       hover:shadow-lg hover:scale-[1.005] transition-all duration-300 overflow-hidden cursor-pointer
                       flex items-center space-x-4"
            onClick={onClick}
        >
            {/* Icon container with a background */}
            <div className="flex-shrink-0 p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                <AcademicCapIcon className="h-6 w-6 text-purple-600 group-hover:text-purple-700 transition-colors" />
            </div>

            {/* Quiz details */}
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-800 transition-colors truncate">
                    {quiz.title}
                </h3>
                {quiz.description && ( // Only show description if it exists
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {quiz.description}
                    </p>
                )}
            </div>

            {/* Optional: Indicator for "View" or "Details" */}
            <div className="flex-shrink-0 text-gray-400 group-hover:text-purple-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" /> {/* Requires ArrowRightIcon import */}
            </div>
        </div>
    );
};