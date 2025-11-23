// src/components/teacher/dashboard/widgets/CreateAnnouncement.jsx
import React, { useState } from "react";
import { Image as ImageIcon, X as XIcon, Users, GraduationCap, ChevronDown, Send } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
      {/* --- Text Area --- */}
      <div className="relative group">
        <textarea
          // MODIFIED: Increased min-height on desktop (md:min-h-[250px])
          className="w-full p-4 md:p-6 rounded-3xl bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm md:text-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none resize-none shadow-inner transition-all leading-relaxed min-h-[150px] md:min-h-[250px]"
          rows="4"
          placeholder="What's on your mind? Share an update with your class..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* --- Image Input Section --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-white/40 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/50 dark:border-white/5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <ImageIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <input
              id="photoURL"
              type="text"
              className="w-full bg-transparent border-none text-sm md:text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0 p-0"
              placeholder="Optional: Paste an image link here..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
            />
        </div>

        {photoURL && (
            <div className="relative group p-2 rounded-2xl bg-slate-100/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-200 dark:bg-white/5">
                  <img
                    src={photoURL}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      setPhotoURL("");
                    }}
                  />
              </div>
              <button
                type="button"
                onClick={() => setPhotoURL("")}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all shadow-lg hover:scale-110 active:scale-95"
                aria-label="Remove photo"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
        )}
      </div>

      {/* --- Settings Row (Desktop: Grid / Mobile: Stack) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4">
        {/* Audience Select */}
        <div className="space-y-2">
          <label
            htmlFor="audience"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1"
          >
            <Users className="w-3.5 h-3.5" /> Audience
          </label>
          <div className="relative">
             <select
                id="audience"
                className="w-full p-3 md:p-4 pl-4 pr-10 rounded-2xl bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-sm md:text-base text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none transition-all hover:bg-white/80 dark:hover:bg-white/20 cursor-pointer"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="teachers" className="bg-white dark:bg-slate-800">All Teachers</option>
                <option value="students" className="bg-white dark:bg-slate-800">Specific Class</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Class Select (Conditional) */}
        {audience === "students" && (
          <div className="space-y-2 animate-fade-in-up">
            <label
              htmlFor="class"
              className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Class Target
            </label>
             <div className="relative">
                <select
                    id="class"
                    className="w-full p-3 md:p-4 pl-4 pr-10 rounded-2xl bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-sm md:text-base text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none transition-all hover:bg-white/80 dark:hover:bg-white/20 cursor-pointer"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    required
                >
                    <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400">Select a class...</option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800">
                            {c.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* --- Submit Button --- */}
      <div className="pt-6 mt-auto">
          <button
            type="submit"
            className={`w-full py-4 rounded-2xl font-bold text-sm md:text-lg shadow-xl transition-all flex items-center justify-center gap-2.5 ${
                !content.trim() && !photoURL.trim()
                ? 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30 hover:scale-[1.02] active:scale-95'
            }`}
            disabled={!content.trim() && !photoURL.trim()}
          >
            <Send className="w-5 h-5" />
            Post Announcement
          </button>
      </div>
    </form>
  );
};

export default CreateAnnouncement;