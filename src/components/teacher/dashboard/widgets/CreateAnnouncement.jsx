import React, { useState } from "react";
import { Image as ImageIcon, X as XIcon, Users, GraduationCap, ChevronDown } from "lucide-react";

const CreateAnnouncement = ({ classes, onPost }) => {
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

    const selectedClass = classes.find((c) => c.id === classId);
    const className = selectedClass ? selectedClass.name : "";

    onPost({ content, audience, classId, className, photoURL, caption: "" });

    // Clear form after posting
    setContent("");
    setPhotoURL("");
    setClassId("");
    setAudience("teachers");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        // --- MODIFIED: Added dark mode classes ---
        className="w-full p-3 border-none ring-0 focus:ring-1 focus:ring-sky-400 dark:focus:ring-sky-500 rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 resize-none shadow-neumorphic dark:shadow-neumorphic-dark placeholder:text-slate-500 dark:placeholder:text-slate-400 text-base transition"
        rows="3"
        placeholder="Share a new announcement..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {audience === "teachers" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* --- MODIFIED: Added dark mode classes --- */}
            <ImageIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <input
              id="photoURL"
              type="text"
              // --- MODIFIED: Added dark mode classes ---
              className="w-full p-2 border-none ring-0 focus:ring-1 focus:ring-sky-400 dark:focus:ring-sky-500 rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 shadow-neumorphic dark:shadow-neumorphic-dark placeholder:text-slate-500 dark:placeholder:text-slate-400 text-sm transition"
              placeholder="Optional: Paste an image URL..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
            />
          </div>
          {photoURL && (
            // --- MODIFIED: Added dark mode classes ---
            <div className="relative group p-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark">
              <img
                src={photoURL}
                alt="Preview"
                className="rounded-lg max-h-52 w-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                  setPhotoURL("");
                }}
              />
              <button
                type="button"
                onClick={() => setPhotoURL("")}
                // --- MODIFIED: Added dark mode classes ---
                className="absolute top-3 right-3 bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-600 dark:text-slate-300 rounded-full p-1.5 shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
                aria-label="Remove photo"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- MODIFIED: Added dark mode border color --- */}
      <div className="flex flex-col sm:flex-row gap-4 items-center pt-3 border-t border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30">
        <div className="w-full">
          <label
            htmlFor="audience"
            // --- MODIFIED: Added dark mode classes ---
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
          >
            {/* --- MODIFIED: Added dark mode classes --- */}
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Audience
          </label>
          {/* --- MODIFIED: Added dark mode classes --- */}
          <div className="relative w-full p-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark focus-within:ring-1 focus-within:ring-sky-400 dark:focus-within:ring-sky-500 transition">
             <select
                id="audience"
                // --- MODIFIED: Added dark mode classes ---
                className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="teachers">All Teachers</option>
                <option value="students">Students in a Class</option>
              </select>
              {/* --- MODIFIED: Added dark mode classes --- */}
              <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {audience === "students" && (
          <div className="w-full">
            <label
              htmlFor="class"
              // --- MODIFIED: Added dark mode classes ---
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              {/* --- MODIFIED: Added dark mode classes --- */}
              <GraduationCap className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Class
            </label>
             {/* --- MODIFIED: Added dark mode classes --- */}
             <div className="relative w-full p-2 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark focus-within:ring-1 focus-within:ring-sky-400 dark:focus-within:ring-sky-500 transition">
                <select
                    id="class"
                    // --- MODIFIED: Added dark mode classes ---
                    className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 focus:ring-0 appearance-none"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    required
                >
                    <option value="" disabled>
                        Select a class...
                    </option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                        {c.name}
                        </option>
                    ))}
                </select>
                {/* --- MODIFIED: Added dark mode classes --- */}
                <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        // --- MODIFIED: Added dark mode classes ---
        className="w-full py-3 px-4 rounded-xl font-semibold text-sky-600 dark:text-sky-400 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-all duration-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark disabled:shadow-neumorphic-inset dark:disabled:shadow-neumorphic-inset-dark disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={!content.trim() && !photoURL.trim()}
      >
        Post Announcement
      </button>
    </form>
  );
};

export default CreateAnnouncement;