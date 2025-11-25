// src/components/teacher/dashboard/widgets/CreateAnnouncement.jsx
import React, { useState } from "react";
import { 
  Image as ImageIcon, 
  X as XIcon, 
  Users, 
  GraduationCap, 
  ChevronDown, 
  Send 
} from "lucide-react";

// --- STYLING CONSTANTS (MD3 Enhanced) ---
// Solid, filled input style (Surface Container Highest)
const md3InputContainer = "relative group bg-slate-100 dark:bg-slate-800 rounded-2xl border border-transparent focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300";

const inputReset = "w-full bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400";

const selectReset = `
  ${inputReset} 
  appearance-none cursor-pointer py-3.5 pl-11 pr-10 font-medium text-sm
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
    <form onSubmit={handleSubmit} className="h-full flex flex-col gap-6 font-sans">
      
      {/* --- 1. Main Text Editor --- */}
      <div className={`${md3InputContainer} flex-1 min-h-[160px] md:min-h-[220px] flex flex-col shadow-inner`}>
        <textarea
          className="w-full h-full p-5 bg-transparent border-none outline-none resize-none text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-500 leading-relaxed rounded-2xl"
          placeholder="What's on your mind? Share an update..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* --- 2. Image Input & Preview --- */}
      <div className="space-y-4">
        {/* Input Field (Card Style) */}
        <div className={`${md3InputContainer} flex items-center gap-3 p-2 pr-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl shrink-0 text-blue-600 dark:text-blue-400">
                <ImageIcon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <input
              type="url"
              className={`${inputReset} text-sm font-medium py-2`}
              placeholder="Paste image link here (Optional)..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
            />
        </div>

        {/* Image Preview Card */}
        {photoURL && (
            <div className="relative group animate-in fade-in zoom-in-95 duration-300">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md bg-slate-50 dark:bg-slate-900">
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
                  {/* Subtle Gradient for Remove Button Visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
              </div>
              
              <button
                type="button"
                onClick={() => setPhotoURL("")}
                className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 border border-white/20"
                aria-label="Remove photo"
              >
                <XIcon className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
        )}
      </div>

      {/* --- 3. Settings Grid (Audience & Class) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Audience Dropdown */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
            Audience
          </label>
          <div className={`${md3InputContainer} shadow-sm`}>
             <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">
                <Users className="w-5 h-5" />
             </div>
             
             <select
                id="audience"
                className={selectReset}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="teachers" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Teachers</option>
                <option value="students" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Specific Class</option>
              </select>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                 <ChevronDown className="w-4 h-4" />
              </div>
          </div>
        </div>

        {/* Class Dropdown (Conditional) */}
        {audience === "students" && (
          <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
              Select Class
            </label>
             <div className={`${md3InputContainer} shadow-sm border-blue-500/20 ring-2 ring-blue-500/5`}>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
                    <GraduationCap className="w-5 h-5" />
                </div>
                
                <select
                    id="class"
                    className={selectReset}
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    required
                >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">Choose a class...</option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {c.name}
                        </option>
                    ))}
                </select>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
          </div>
        )}
      </div>

      {/* --- 4. Submit Button --- */}
      <div className="pt-4 mt-auto">
          <button
            type="submit"
            disabled={!content.trim() && !photoURL.trim()}
            className={`
                w-full py-4 rounded-2xl font-bold text-sm tracking-wide
                flex items-center justify-center gap-2.5 shadow-md
                transition-all duration-300 transform active:scale-[0.98]
                ${!content.trim() && !photoURL.trim()
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-blue-500/40'}
            `}
          >
            <Send className="w-5 h-5" strokeWidth={2.5} />
            Post Announcement
          </button>
      </div>
    </form>
  );
};

export default CreateAnnouncement;