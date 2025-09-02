import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, ListBulletIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';

const ScheduleModal = ({ isOpen, onClose, userRole, scheduleActivities, onAddActivity, onUpdateActivity, onDeleteActivity }) => {
    // ... (state declarations remain the same)
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [inCharge, setInCharge] = useState('');
    const [editingActivity, setEditingActivity] = useState(null);
    const [activeTab, setActiveTab] = useState('view');

    const isAdmin = userRole === 'admin';
    const inputStyle = "w-full p-3 border border-slate-200 bg-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition placeholder-gray-500";

    // ... (useEffect and handler functions remain the same)
    useEffect(() => {
        if (!isOpen) {
            setTitle(''); setStartDate(''); setEndDate(''); setTime('');
            setDescription(''); setInCharge(''); setEditingActivity(null);
            setActiveTab('view');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !startDate || !endDate || !inCharge) {
            alert('Please fill in all required fields: Title, Start Date, End Date, and In-charge.');
            return;
        }
        const activityData = { title, startDate, endDate, time: time || 'N/A', description, inCharge };
        if (editingActivity) onUpdateActivity({ ...editingActivity, ...activityData });
        else onAddActivity(activityData);
        setActiveTab('view');
        setTitle(''); setStartDate(''); setEndDate(''); setTime('');
        setDescription(''); setInCharge(''); setEditingActivity(null);
    };

    const handleEditClick = (activity) => {
        setEditingActivity(activity);
        setTitle(activity.title); setStartDate(activity.startDate); setEndDate(activity.endDate);
        setTime(activity.time === 'N/A' ? '' : activity.time);
        setDescription(activity.description); setInCharge(activity.inCharge);
        setActiveTab('add');
    };

    const handleCancelEdit = () => {
        setEditingActivity(null);
        setTitle(''); setStartDate(''); setEndDate(''); setTime('');
        setDescription(''); setInCharge(''); setActiveTab('view');
    };
    
    if (!isOpen) return null;

    const sortedActivities = [...scheduleActivities].sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || a.time.localeCompare(b.time));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-3xl transform transition-all duration-300 ease-out scale-95 opacity-0 animate-scale-in mt-10 mb-8">
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">School Schedule</h2>
                    {/* iOS style close button */}
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition">
                        <XMarkIcon className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                {/* iOS style Segmented Control (Tabs) */}
                {isAdmin && (
                    <div className="w-full bg-gray-200/70 rounded-xl p-1 flex gap-1 mb-6">
                        <button
                            className={`flex-1 py-2 px-4 text-center font-semibold text-sm rounded-lg transition-all duration-300 ${activeTab === 'view' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:bg-gray-300/50'}`}
                            onClick={() => setActiveTab('view')}
                        >
                            <ListBulletIcon className="w-5 h-5 inline-block mr-2 -mt-1" /> View Activities
                        </button>
                        <button
                            className={`flex-1 py-2 px-4 text-center font-semibold text-sm rounded-lg transition-all duration-300 ${activeTab === 'add' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:bg-gray-300/50'}`}
                            onClick={() => { setActiveTab('add'); if(editingActivity) handleCancelEdit(); }}
                        >
                           <DocumentPlusIcon className="w-5 h-5 inline-block mr-2 -mt-1" /> {editingActivity ? 'Edit Activity' : 'Add Activity'}
                        </button>
                    </div>
                )}

                {/* Add/Edit Form */}
                {isAdmin && activeTab === 'add' && (
                    <div className="mb-8 p-6 bg-slate-50 rounded-2xl">
                        <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center">
                            <PlusCircleIcon className="w-6 h-6 mr-2 text-blue-500" /> {editingActivity ? 'Edit Activity Details' : 'Add New Activity'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputStyle} placeholder="Activity Title" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputStyle} required />
                                <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputStyle} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputStyle} />
                                <input type="text" id="inCharge" value={inCharge} onChange={(e) => setInCharge(e.target.value)} className={inputStyle} placeholder="Person In-charge" required />
                            </div>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className={inputStyle} placeholder="Description (Optional)"></textarea>
                            <div className="flex justify-end gap-3 pt-2">
                                {editingActivity && <button type="button" onClick={handleCancelEdit} className="px-5 py-2 bg-gray-200 text-gray-700 font-bold rounded-full hover:bg-gray-300 transition">Cancel</button>}
                                <button type="submit" className="px-5 py-2 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition">{editingActivity ? 'Update Activity' : 'Add Activity'}</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* iOS style Table View List */}
                {activeTab === 'view' && (
                    <div>
                        {sortedActivities.length > 0 ? (
                            <div className="space-y-1 rounded-xl bg-slate-100 p-2 max-h-[50vh] overflow-y-auto">
                                {sortedActivities.map(activity => (
                                    <div key={activity.id} className="p-4 bg-white rounded-lg flex justify-between items-start group hover:bg-slate-50 transition-colors relative">
                                        <div>
                                            <h4 className="font-semibold text-lg text-gray-900">{activity.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{activity.startDate} to {activity.endDate} {activity.time !== 'N/A' && ` at ${activity.time}`}</p>
                                            <p className="text-sm text-gray-600">In-charge: <span className="font-medium">{activity.inCharge}</span></p>
                                            {activity.description && <p className="text-sm text-gray-500 mt-2">{activity.description}</p>}
                                        </div>
                                        {isAdmin && (
                                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditClick(activity)} className="p-2 rounded-full hover:bg-gray-200 transition" title="Edit"><PencilSquareIcon className="w-5 h-5 text-gray-500" /></button>
                                                <button onClick={() => onDeleteActivity(activity.id)} className="p-2 rounded-full hover:bg-gray-200 transition" title="Delete"><TrashIcon className="w-5 h-5 text-rose-500" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-12 bg-slate-50 rounded-2xl">
                                <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-lg font-semibold">No scheduled activities</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style jsx>{`
                @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ScheduleModal;