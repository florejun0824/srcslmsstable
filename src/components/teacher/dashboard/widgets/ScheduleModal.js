import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, ListBulletIcon, DocumentPlusIcon } from '@heroicons/react/24/outline'; // Added ListBulletIcon, DocumentPlusIcon

const ScheduleModal = ({ isOpen, onClose, userRole, scheduleActivities, onAddActivity, onUpdateActivity, onDeleteActivity }) => {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [inCharge, setInCharge] = useState('');
    const [editingActivity, setEditingActivity] = useState(null);

    // New state for tab management
    const [activeTab, setActiveTab] = useState('view'); // 'view' or 'add'

    const isAdmin = userRole === 'admin';

    // Reset form and tab when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setStartDate('');
            setEndDate('');
            setTime('');
            setDescription('');
            setInCharge('');
            setEditingActivity(null);
            setActiveTab('view'); // Reset to view tab when modal closes
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !startDate || !endDate || !inCharge) {
            alert('Please fill in all required fields: Title, Start Date, End Date, and In-charge.');
            return;
        }

        const activityData = {
            title,
            startDate,
            endDate,
            time: time || 'N/A', // Store 'N/A' if time is not provided
            description,
            inCharge,
        };

        if (editingActivity) {
            onUpdateActivity({ ...editingActivity, ...activityData });
        } else {
            onAddActivity(activityData);
        }
        // After successful add/update, switch back to view tab and reset form
        setActiveTab('view');
        setTitle('');
        setStartDate('');
        setEndDate('');
        setTime('');
        setDescription('');
        setInCharge('');
        setEditingActivity(null);
    };

    const handleEditClick = (activity) => {
        setEditingActivity(activity);
        setTitle(activity.title);
        setStartDate(activity.startDate);
        setEndDate(activity.endDate);
        setTime(activity.time === 'N/A' ? '' : activity.time); // Convert 'N/A' back to empty string for input field
        setDescription(activity.description);
        setInCharge(activity.inCharge);
        setActiveTab('add'); // Switch to the add/edit tab when editing
    };

    const handleCancelEdit = () => {
        setEditingActivity(null);
        setTitle('');
        setStartDate('');
        setEndDate('');
        setTime('');
        setDescription('');
        setInCharge('');
        setActiveTab('view'); // Switch back to view tab after canceling edit
    };

    if (!isOpen) return null;

    // Create a copy of the array to sort, so we don't mutate the prop directly
    const sortedActivities = [...scheduleActivities].sort((a, b) => {
        // Sort by startDate first
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);

        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }

        // If start dates are the same, sort by time
        const timeA = a.time === 'N/A' || !a.time ? '00:00' : a.time; // Treat 'N/A' or empty as start of day
        const timeB = b.time === 'N/A' || !b.time ? '00:00' : b.time;

        // Use localeCompare for string comparison of times
        return timeA.localeCompare(timeB);
    });

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-3xl transform transition-all duration-300 ease-out scale-95 opacity-0 animate-scale-in mt-10 mb-8">
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">School Schedule</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
                        <XMarkIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>

                {/* Tab Navigation (Admin Only) */}
                {isAdmin && (
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            className={`flex-1 py-3 px-4 text-center font-medium text-lg rounded-t-lg transition-colors duration-200
                                ${activeTab === 'view' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                            onClick={() => setActiveTab('view')}
                        >
                            <ListBulletIcon className="w-6 h-6 inline-block mr-2 -mt-1" /> View Activities
                        </button>
                        <button
                            className={`flex-1 py-3 px-4 text-center font-medium text-lg rounded-t-lg transition-colors duration-200
                                ${activeTab === 'add' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                            onClick={() => setActiveTab('add')}
                        >
                            <DocumentPlusIcon className="w-6 h-6 inline-block mr-2 -mt-1" /> Add/Edit Activity
                        </button>
                    </div>
                )}

                {/* Conditional Content based on activeTab */}
                {/* Add/Edit Activity Form (Admin Only & 'add' tab) */}
                {isAdmin && activeTab === 'add' && (
                    <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-700 mb-5 flex items-center">
                            <PlusCircleIcon className="w-6 h-6 mr-2" /> {editingActivity ? 'Edit Activity' : 'Add New Activity'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
                                    <input
                                        type="time"
                                        id="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="inCharge" className="block text-sm font-medium text-gray-700 mb-1">In-charge</label>
                                    <input
                                        type="text"
                                        id="inCharge"
                                        value={inCharge}
                                        onChange={(e) => setInCharge(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows="3"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                {editingActivity && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="btn-secondary-light px-5 py-2"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                                <button type="submit" className="btn-primary-glow-light px-5 py-2">
                                    {editingActivity ? 'Update Activity' : 'Add Activity'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* List of Activities (Visible for all users, or on 'view' tab for admin) */}
                {activeTab === 'view' && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">All Activities</h3>
                        {sortedActivities.length > 0 ? (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {sortedActivities.map(activity => (
                                    <div key={activity.id} className="p-5 border border-gray-200 rounded-2xl bg-gray-50 flex justify-between items-start group hover:shadow-md transition-shadow relative">
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-800">{activity.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">From: {activity.startDate}</span> to <span className="font-medium">{activity.endDate}</span>
                                                {activity.time !== 'N/A' && ` at ${activity.time}`}
                                            </p>
                                            {activity.inCharge && <p className="text-sm text-gray-600 mt-1">In-charge: <span className="font-medium">{activity.inCharge}</span></p>}
                                            {activity.description && <p className="text-sm text-gray-500 mt-2">{activity.description}</p>}
                                        </div>
                                        {isAdmin && (
                                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditClick(activity)}
                                                    className="p-1 rounded-full hover:bg-gray-200/50 transition"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5 text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteActivity(activity.id)}
                                                    className="p-1 rounded-full hover:bg-gray-200/50 transition"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-5 h-5 text-rose-500" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                                <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-lg font-semibold">No scheduled activities yet.</p>
                                {isAdmin && activeTab === 'view' && <p className="text-sm mt-1">Switch to "Add/Edit Activity" tab to add new activities.</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Custom CSS for modal animations and scrollbar */}
            <style jsx>{`
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out forwards;
                }

                .btn-primary-glow-light {
                    background-color: #f43f5e;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    box-shadow: 0 0px 10px rgba(244, 63, 94, 0.3);
                }
                .btn-primary-glow-light:hover {
                    background-color: #e11d48;
                    box-shadow: 0 0px 15px rgba(244, 63, 94, 0.6);
                }

                .btn-secondary-light {
                    background-color: #e5e7eb;
                    color: #4b5563;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                .btn-secondary-light:hover {
                    background-color: #d1d5db;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #e5e7eb; /* Lighter gray for the track */
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #d1d5db; /* Slightly darker gray for the thumb */
                    border-radius: 10px;
                    border: 2px solid #e5e7eb;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #9ca3af;
                }
            `}</style>
        </div>
    );
};

export default ScheduleModal;