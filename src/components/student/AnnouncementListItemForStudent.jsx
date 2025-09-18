// src/components/student/StudentClassDetailView.js (continued, or in a separate file)

// New Component: AnnouncementListItemForStudent
const AnnouncementListItemForStudent = ({ announcement, onClick }) => {
    // Safely format date, handling Firestore Timestamp objects
    const formattedDate = announcement.createdAt && typeof announcement.createdAt.toDate === 'function'
        ? announcement.createdAt.toDate().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
          })
        : (announcement.createdAt instanceof Date ? announcement.createdAt.toLocaleDateString() : 'N/A');

    return (
        <div
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl shadow-md border border-blue-200
                       hover:shadow-lg hover:scale-[1.005] transition-all duration-300 overflow-hidden cursor-pointer
                       flex items-center space-x-4" // Added space-x-4 for consistent spacing
            onClick={onClick} // This handles opening the full view modal
        >
            {/* Icon container with a background */}
            <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <MegaphoneIcon className="h-6 w-6 text-blue-600 group-hover:text-blue-700 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-800 transition-colors truncate">
                    {announcement.content} {/* Truncate for the list view */}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    Posted by {announcement.teacherName || 'Unknown'} on {formattedDate}
                </p>
            </div>
            {/* Optional: Indicator for "View" or "Details" */}
            <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};