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
        <div className="space-y-10 p-4 md:p-8 rounded-lg animate-fade-in"> {/* Removed bg-gray-50 here to let the main layout's gradient show through */}
            <div className="relative flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">Welcome back, {userProfile?.firstName}!</h1>
                    <p className="text-lg text-gray-600 mt-2">Here is your dashboard overview.</p>
                </div>
            </div>
            {/* Adjusted grid for better responsiveness and increased gap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {/* Applied glassmorphism styling to cards */}
                <GradientStatCard 
                    title="Active Classes" 
                    value={activeClasses.length} 
                    icon={<AcademicCapIcon />} 
                    gradient="from-primary-500 to-primary-700"
                    vectorIcon={<AcademicCapIcon />}
                    // Glassmorphism classes applied here
                    className="rounded-2xl shadow-xl backdrop-blur-md bg-white/20 border border-white/30 transition transform hover:scale-103 duration-300 ease-in-out hover:shadow-2xl" 
                />
                <InspirationCard className="rounded-2xl shadow-xl backdrop-blur-md bg-white/20 border border-white/30 transition transform hover:scale-103 duration-300 ease-in-out hover:shadow-2xl" />
                <ClockWidget className="rounded-2xl shadow-xl backdrop-blur-md bg-white/20 border border-white/30 transition transform hover:scale-103 duration-300 ease-in-out hover:shadow-2xl" />
            </div>
            
            {/* Refined layout for announcements section with glassmorphism */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl shadow-xl backdrop-blur-md bg-white/20 border border-white/30"> {/* Glassmorphism styling */}
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Make an Announcement</h2>
                    <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                </div>
                <div className="p-6 rounded-2xl shadow-xl backdrop-blur-md bg-white/20 border border-white/30"> {/* Glassmorphism styling */}
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Recent Teacher Announcements</h2>
                    <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">
                        {teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => {
                            const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                            return (
                                <div key={post.id} className="bg-gray-50/50 p-4 rounded-lg border border-white/40 group relative transition-all duration-200 hover:shadow-md"> {/* Subtle glassmorphism for individual posts */}
                                    {editingAnnId === post.id ? (
                                        <>
                                            <textarea 
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 text-gray-800 bg-white/70" /* Added bg-white/70 */
                                                rows="3" 
                                                value={editingAnnText} 
                                                onChange={(e) => setEditingAnnText(e.target.value)} 
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button className="btn-secondary" onClick={() => setEditingAnnId(null)}>Cancel</button>
                                                <button className="btn-primary" onClick={handleUpdateTeacherAnn}>Save</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {canModify && (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleStartEditAnn(post)} className="p-1 hover:bg-white/50 rounded-full" title="Edit"> {/* Updated hover */}
                                                        <PencilSquareIcon className="w-4 h-4 text-gray-700" /> {/* Darker text */}
                                                    </button>
                                                    <button onClick={() => handleDeleteTeacherAnn(post.id)} className="p-1 hover:bg-white/50 rounded-full" title="Delete"> {/* Updated hover */}
                                                        <TrashIcon className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-gray-800 whitespace-pre-wrap pr-10">{post.content}</p>
                                            <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200 flex justify-between">
                                                <span>From: {post.teacherName}</span>
                                                <span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        }) : (
                            <p className="text-center text-gray-500 py-8">No new announcements for teachers.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeView;