import React, { useState } from 'react';
import { FaImage, FaTimes } from 'react-icons/fa';

const CreateAnnouncement = ({ classes, onPost }) => {
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('teachers');
    const [classId, setClassId] = useState('');
    const [photoURL, setPhotoURL] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim() && !photoURL.trim()) {
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

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-xl shadow-lg space-y-4">
            
            {/* Main content textarea */}
            <div>
                <textarea
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 resize-none transition placeholder-gray-400"
                    rows="4"
                    placeholder="Share a new announcement..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>

            {/* Photo URL Input & Preview - Conditionally rendered */}
            {audience === 'teachers' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600">
                        <FaImage className="text-lg text-blue-500" />
                        <label htmlFor="photoURL" className="font-semibold text-sm">Add a Photo</label>
                    </div>
                    <input
                        id="photoURL"
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm placeholder-gray-400"
                        placeholder="Paste image URL here..."
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                    />
                    {photoURL && (
                         <div className="relative mt-2">
                            <img src={photoURL} alt="Preview" className="rounded-lg max-h-48 w-full object-cover border border-gray-200" onError={(e) => e.target.style.display = 'none'}/>
                            <button type="button" onClick={() => setPhotoURL('')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition">
                                <FaTimes />
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            <hr className="border-gray-200" />

            {/* Audience and Class Selection */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-full sm:w-1/2">
                    <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                    <select
                        id="audience"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                    >
                        <option value="teachers">All Teachers</option>
                        <option value="students">Students</option>
                    </select>
                </div>

                {audience === 'students' && (
                    <div className="w-full sm:w-1/2">
                         <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <select
                            id="class"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                            required
                        >
                            <option value="">Select a class</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <button type="submit" className="w-full bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg shadow-md hover:bg-blue-600 transition">
                Post Announcement
            </button>
        </form>
    );
};

export default CreateAnnouncement;