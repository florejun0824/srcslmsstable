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
        className="w-full p-3 border-none ring-0 focus:ring-1 focus:ring-sky-400 rounded-lg bg-neumorphic-base text-slate-800 resize-none shadow-neumorphic placeholder:text-slate-500 text-base transition"
        rows="3"
        placeholder="Share a new announcement..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {audience === "teachers" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              id="photoURL"
              type="text"
              className="w-full p-2 border-none ring-0 focus:ring-1 focus:ring-sky-400 rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic placeholder:text-slate-500 text-sm transition"
              placeholder="Optional: Paste an image URL..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
            />
          </div>
          {photoURL && (
            <div className="relative group p-2 rounded-xl bg-neumorphic-base shadow-neumorphic">
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
                className="absolute top-3 right-3 bg-neumorphic-base text-slate-600 rounded-full p-1.5 shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                aria-label="Remove photo"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center pt-3 border-t border-neumorphic-shadow-dark/30">
        <div className="w-full">
          <label
            htmlFor="audience"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5"
          >
            <Users className="w-4 h-4 text-slate-500" /> Audience
          </label>
          <div className="relative w-full p-2 rounded-xl bg-neumorphic-base shadow-neumorphic focus-within:ring-1 focus-within:ring-sky-400 transition">
             <select
                id="audience"
                className="w-full bg-transparent border-none text-slate-800 focus:ring-0 appearance-none"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="teachers">All Teachers</option>
                <option value="students">Students in a Class</option>
              </select>
              <ChevronDown className="w-5 h-5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {audience === "students" && (
          <div className="w-full">
            <label
              htmlFor="class"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5"
            >
              <GraduationCap className="w-4 h-4 text-slate-500" /> Class
            </label>
             <div className="relative w-full p-2 rounded-xl bg-neumorphic-base shadow-neumorphic focus-within:ring-1 focus-within:ring-sky-400 transition">
                <select
                    id="class"
                    className="w-full bg-transparent border-none text-slate-800 focus:ring-0 appearance-none"
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
                <ChevronDown className="w-5 h-5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        // MODIFIED: Removed gradient and colored text for a uniform, monochromatic look.
        className="w-full py-3 px-4 rounded-xl font-semibold text-sky-600 bg-neumorphic-base shadow-neumorphic transition-all duration-200 hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:shadow-neumorphic-inset disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={!content.trim() && !photoURL.trim()}
      >
        Post Announcement
      </button>
    </form>
  );
};

export default CreateAnnouncement;