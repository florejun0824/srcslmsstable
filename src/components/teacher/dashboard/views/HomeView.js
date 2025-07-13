// src/components/views/HomeView.js
import React from 'react';
import { AcademicCapIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import CreateAnnouncement from '../widgets/CreateAnnouncement';
import GradientStatCard from '../widgets/GradientStatCard';
import InspirationCard from '../widgets/InspirationCard';
import ClockWidget from '../widgets/ClockWidget';

const HomeView = ({
    userProfile,
    activeClasses,
    teacherAnnouncements,
    handleCreateAnnouncement,
    editingAnnId,
    editingAnnText,
    setEditingAnnText,
    handleStartEditAnn,
    handleUpdateTeacherAnn,
    setEditingAnnId,
    handleDeleteTeacherAnn,
}) => {
    return (
        <div className="space-y-8">
            <div className="relative flex justify-between items-start pt-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Welcome back, {userProfile?.firstName}!</h1>
                    <p className="text-gray-500 mt-1">Here is your dashboard overview.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <GradientStatCard title="Active Classes" value={activeClasses.length} icon={<AcademicCapIcon />} gradient="from-blue-500 to-indigo-600" vectorIcon={<AcademicCapIcon />} />
                <InspirationCard />
                <ClockWidget />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Make an Announcement</h2>
                    <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Recent Teacher Announcements</h2>
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => {
                            const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                            return (
                                <div key={post.id} className="bg-slate-50 p-4 rounded-lg border group relative">
                                    {editingAnnId === post.id ? (
                                        <><textarea className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" rows="3" value={editingAnnText} onChange={(e) => setEditingAnnText(e.target.value)} /><div className="flex justify-end gap-2 mt-2"><button className="btn-secondary" onClick={() => setEditingAnnId(null)}>Cancel</button><button className="btn-primary" onClick={handleUpdateTeacherAnn}>Save</button></div></>
                                    ) : (
                                        <>{canModify && (<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleStartEditAnn(post)} className="p-1 hover:bg-gray-200 rounded-full" title="Edit"><PencilSquareIcon className="w-4 h-4 text-gray-600" /></button><button onClick={() => handleDeleteTeacherAnn(post.id)} className="p-1 hover:bg-gray-200 rounded-full" title="Delete"><TrashIcon className="w-4 h-4 text-red-500" /></button></div>)}<p className="text-gray-800 whitespace-pre-wrap pr-10">{post.content}</p><div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 flex justify-between"><span>From: {post.teacherName}</span><span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</span></div></>
                                    )}
                                </div>
                            );
                        }) : (<p className="text-center text-gray-500 py-8">No new announcements for teachers.</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeView;