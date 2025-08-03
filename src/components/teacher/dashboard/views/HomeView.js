import React from 'react';
import { AcademicCapIcon, PencilSquareIcon, TrashIcon, MegaphoneIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
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
        <div className="relative min-h-screen p-4 md:p-8 bg-gray-100 text-gray-800 font-sans overflow-hidden rounded-3xl">
            {/* Dynamic Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow"></div>
                <div className="absolute bottom-20 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow-reverse animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-spin-slow animation-delay-4000"></div>
            </div>

            {/* Main Content Container with a modern, clean feel */}
            <div className="relative z-10 space-y-12">
                {/* Header with a subtle animated gradient */}
                <div className="relative p-6 md:p-8 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-down">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-transparent to-indigo-600/10 opacity-50 animate-pulse-light"></div>
                    <div className="relative z-10">
                        <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-800 drop-shadow-sm leading-tight">
                            Hey there, {userProfile?.firstName}!
                        </h1>
                        <p className="text-lg text-gray-500 mt-2">SRCS LMS dashboard at a glance.</p>
                    </div>
                </div>

                {/* Main Stat & Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
                    <GradientStatCard
                        title="Active Classes"
                        value={activeClasses.length}
                        icon={<AcademicCapIcon />}
                        gradient="from-green-500 to-emerald-600"
                        className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in"
                    />
                    <InspirationCard className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-300" />
                    <ClockWidget className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-600" />
                    {/* Replaced Quick Announce with Upcoming Deadlines */}
                    <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center justify-center flex-col text-center transition transform hover:scale-105 duration-300 ease-in-out animate-fade-in animation-delay-900">
                        <CalendarDaysIcon className="h-10 w-10 text-rose-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-lg">Upcoming Deadlines</h3>
                        <p className="text-sm text-gray-500 mt-1">Check out what's due soon.</p>
                    </div>
                </div>

                {/* Announcements Section - Redesigned with a split layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Announcement Column */}
                    <div className="lg:col-span-1 p-6 bg-white rounded-3xl shadow-2xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">New Announcement</h2>
                        <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                    </div>

                    {/* Recent Announcements Column */}
                    <div className="lg:col-span-2 p-6 bg-white rounded-3xl shadow-2xl animate-fade-in-up animation-delay-300">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">Recent Announcements</h2>
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => {
                                const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                                return (
                                    <div key={post.id} className="relative p-6 rounded-3xl border border-gray-200 bg-white shadow-lg group transition-all duration-300 hover:shadow-2xl hover:border-blue-500 hover:bg-blue-50">
                                        {editingAnnId === post.id ? (
                                            <>
                                                <textarea
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800"
                                                    rows="3"
                                                    value={editingAnnText}
                                                    onChange={(e) => setEditingAnnText(e.target.value)}
                                                />
                                                <div className="flex justify-end gap-2 mt-3">
                                                    <button className="btn-secondary-light" onClick={() => setEditingAnnId(null)}>Cancel</button>
                                                    <button className="btn-primary-glow-light" onClick={handleUpdateTeacherAnn}>Save</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {canModify && (
                                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleStartEditAnn(post)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Edit">
                                                            <PencilSquareIcon className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                        <button onClick={() => handleDeleteTeacherAnn(post.id)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Delete">
                                                            <TrashIcon className="w-4 h-4 text-rose-500" />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-shrink-0 mt-1">
                                                        <MegaphoneIcon className="w-8 h-8 text-blue-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700 whitespace-pre-wrap pr-10 leading-relaxed">{post.content}</p>
                                                        <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                                            <span>From: <span className="font-semibold text-gray-500">{post.teacherName}</span></span>
                                                            <span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                                    <MegaphoneIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-lg font-semibold">No new announcements for teachers.</p>
                                    <p className="text-sm">Be the first to post an update!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom CSS for the light theme and animations */}
            <style jsx>{`
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

                .animate-fade-in {
                    animation: fadeIn 1s ease-out;
                }
                .animate-fade-in-down {
                    animation: fadeInDown 0.8s ease-out;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out;
                }
                .animation-delay-300 {
                    animation-delay: 0.3s;
                }
                .animation-delay-600 {
                    animation-delay: 0.6s;
                }
                .animation-delay-900 {
                    animation-delay: 0.9s;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-spin-slow {
                    animation: spin 30s linear infinite;
                }
                .animate-spin-slow-reverse {
                    animation: spin-reverse 30s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }

                .animate-pulse-light {
                    animation: pulseLight 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulseLight {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.5; }
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
            `}</style>
        </div>
    );
};

export default HomeView;