import React, { useState } from "react";
import { 
  Image as ImageIcon, 
  X as XIcon, 
  Users, 
  GraduationCap, 
  ChevronDown, 
  Send 
} from "lucide-react";

// --- STYLING CONSTANTS ---
// Glassmorphic container style for inputs
const glassInputContainer = "relative group bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-white/10 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400/50 shadow-sm hover:bg-white/60 dark:hover:bg-white/5";

// Input/Select inner styles
const inputReset = "w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500";

// Specific style to fix APK Dropdowns (Removes default ugly arrow)
const selectReset = `
  ${inputReset} 
  appearance-none cursor-pointer py-3.5 pl-10 pr-10
`;

const CreateAnnouncement = ({ classes = [], onPost }) => {
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("teachers");
  const [classId, setClassId] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && !photoURL.trim()) {
      alert("Please add some content or a photo to your announcement.");
      return;
    }

    const selectedClass = classes?.find((c) => c.id === classId);
    const className = selectedClass ? selectedClass.name : "";

    onPost({ content, audience, classId, className, photoURL, caption: "" });

    setContent("");
    setPhotoURL("");
    setClassId("");
    setAudience("teachers");
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col gap-6">
      
      {/* --- 1. Main Text Editor --- */}
      <div className={`${glassInputContainer} flex-1 min-h-[180px] md:min-h-[250px] flex flex-col`}>
        <textarea
          className="w-full h-full p-5 md:p-6 bg-transparent border-none outline-none resize-none text-base md:text-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed custom-scrollbar rounded-2xl"
          placeholder="What's on your mind? Share an update..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* --- 2. Image Input & Preview --- */}
      <div className="space-y-4">
        {/* Input Field */}
        <div className={`${glassInputContainer} flex items-center gap-3 p-2`}>
            <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-xl shrink-0">
                <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <input
              type="url" // Changed to url for better mobile keyboard
              className={`${inputReset} text-sm md:text-base py-2`}
              placeholder="Paste an image link here (Optional)..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
            />
        </div>

        {/* Image Preview Card */}
        {photoURL && (
            <div className="relative group animate-in fade-in zoom-in-95 duration-300">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/20 shadow-lg bg-slate-100 dark:bg-black/40">
                  <img
                    src={photoURL}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      setPhotoURL("");
                    }}
                  />
                  {/* Glass overlay gradient for text legibility if needed */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              <button
                type="button"
                onClick={() => setPhotoURL("")}
                className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 border border-white/10"
                aria-label="Remove photo"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
        )}
      </div>

      {/* --- 3. Settings Grid (Audience & Class) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Audience Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">
            Target Audience
          </label>
          <div className={glassInputContainer}>
             <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             
             {/* Native Select with custom styling */}
             <select
                id="audience"
                className={selectReset}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="teachers" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Teachers</option>
                <option value="students" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Specific Class</option>
              </select>
              
              {/* Custom Chevron */}
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Class Dropdown (Conditional) */}
        {audience === "students" && (
          <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
            <label className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">
              Select Class
            </label>
             <div className={glassInputContainer}>
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                
                <select
                    id="class"
                    className={selectReset}
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    required
                >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">Choose a class...</option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            {c.name}
                        </option>
                    ))}
                </select>

                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* --- 4. Submit Button --- */}
      <div className="pt-2 mt-auto">
          <button
            type="submit"
            disabled={!content.trim() && !photoURL.trim()}
            className={`
                w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base 
                flex items-center justify-center gap-2.5 shadow-lg border-t border-white/20
                transition-all duration-300 transform active:scale-[0.98]
                ${!content.trim() && !photoURL.trim()
                ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none border-transparent'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30 hover:shadow-blue-500/40'}
            `}
          >
            <Send className="w-5 h-5" />
            Post Announcement
          </button>
      </div>
    </form>
  );
};

export default CreateAnnouncement;