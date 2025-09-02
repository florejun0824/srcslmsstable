import React, { useState } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/solid';

const CreateAnnouncement = ({ classes, onPost }) => {
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('teachers');
    const [classId, setClassId] = useState('');
    const [photoURL, setPhotoURL] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim() && !photoURL.trim()) {
            // Using a more modern alert or a toast notification would be ideal in a full app
            alert('Please add some content or a photo to your announcement.');
            return;
        }

        const selectedClass = classes.find(c => c.id === classId);
        const className = selectedClass ? selectedClass.name : '';

        onPost({ content, audience, classId, className, photoURL, caption: '' });
        
        // Clear form after posting
        setContent('');
        setPhotoURL('');
        setClassId('');
        setAudience('teachers');
    };

    // Refined input style for a clean, modern iOS feel
    const inputStyle = "w-full p-3 border border-zinc-200/90 bg-zinc-100/70 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-800 transition placeholder-zinc-500";

    return (
        // The form now has a transparent background to blend into its parent container from HomeView.js
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Main content textarea */}
            <textarea
                className={`${inputStyle} resize-none`}
                rows="5"
                placeholder="Share a new announcement..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />

            {/* Photo URL Input & Preview */}
            {audience === 'teachers' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                         <PhotoIcon className="w-6 h-6 text-zinc-400 flex-shrink-0" />
                        <input
                            id="photoURL"
                            type="text"
                            className={`${inputStyle} py-2 text-sm`}
                            placeholder="Optional: Paste an image URL..."
                            value={photoURL}
                            onChange={(e) => setPhotoURL(e.target.value)}
                        />
                    </div>
                    {photoURL && (
                         <div className="relative group">
                            <img 
                                src={photoURL} 
                                alt="Preview" 
                                className="rounded-xl max-h-52 w-full object-cover border border-zinc-200" 
                                // Enhanced error handling to clear the input if the URL is invalid
                                onError={(e) => { 
                                    e.target.onerror = null; 
                                    e.target.style.display='none'; 
                                    setPhotoURL(''); 
                                    // Optionally, show a toast message here
                                }}
                            />
                            {/* iOS-style remove button: semi-transparent circle */}
                            <button 
                                type="button" 
                                onClick={() => setPhotoURL('')} 
                                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 shadow-md hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label="Remove photo"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {/* Audience and Class Selection */}
            <div className="flex flex-col sm:flex-row gap-4 items-center pt-3 border-t border-zinc-200/80">
                <div className="w-full">
                    <label htmlFor="audience" className="block text-sm font-semibold text-zinc-700 mb-1.5">Audience</label>
                    <select id="audience" className={inputStyle} value={audience} onChange={(e) => setAudience(e.target.value)}>
                        <option value="teachers">All Teachers</option>
                        <option value="students">Students in a Class</option>
                    </select>
                </div>

                {audience === 'students' && (
                    <div className="w-full">
                         <label htmlFor="class" className="block text-sm font-semibold text-zinc-700 mb-1.5">Class</label>
                        <select id="class" className={inputStyle} value={classId} onChange={(e) => setClassId(e.target.value)} required>
                            <option value="" disabled>Select a class...</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Refined iOS-style primary submit button with a subtle glow effect */}
            <button 
                type="submit" 
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 active:scale-[0.98] transition-all duration-200 disabled:bg-blue-400 disabled:shadow-none"
                disabled={!content.trim() && !photoURL.trim()}
            >
                Post Announcement
            </button>
        </form>
    );
};

export default CreateAnnouncement;