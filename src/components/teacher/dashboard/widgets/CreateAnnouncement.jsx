import React, { useState } from "react";
import { 
  Image as ImageIcon, 
  X as XIcon, 
  Users, 
  GraduationCap, 
  ChevronDown, 
  Send,
  Globe2,
  Eye,
  Edit3
} from "lucide-react";
import ReactMarkdown from 'react-markdown';

// --- UTILITY: FULL MARKDOWN RENDERER ---
const MarkdownRenderer = ({ content }) => {
    if (!content) return null;
    return (
        <ReactMarkdown
            components={{
                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline break-all transition-colors z-20 relative font-semibold" onClick={(e) => e.stopPropagation()} />,
                p: ({node, ...props}) => <p {...props} className="mb-3 last:mb-0 leading-relaxed" />,
                h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-black mt-5 mb-3 text-slate-900 dark:text-white tracking-tight" />,
                h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold mt-4 mb-3 text-slate-800 dark:text-slate-100" />,
                h3: ({node, ...props}) => <h3 {...props} className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100" />,
                ul: ({node, ...props}) => <ul {...props} className="list-disc pl-6 mb-3 space-y-1.5 marker:text-indigo-400" />,
                ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-6 mb-3 space-y-1.5 marker:text-indigo-400 font-medium" />,
                li: ({node, ...props}) => <li {...props} className="" />,
                strong: ({node, ...props}) => <strong {...props} className="font-extrabold text-slate-900 dark:text-white" />,
                em: ({node, ...props}) => <em {...props} className="italic text-slate-700 dark:text-slate-300" />,
                hr: ({node, ...props}) => <hr {...props} className="my-5 border-t-2 border-slate-200/60 dark:border-white/10" />,
                blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-indigo-300 dark:border-indigo-500/30 pl-4 py-1 italic my-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r-lg" />,
                code: ({node, inline, ...props}) => inline 
                    ? <code {...props} className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-pink-600 dark:text-pink-400" /> 
                    : <pre className="bg-slate-900 dark:bg-black/50 p-4 rounded-xl overflow-x-auto text-[13px] font-mono text-slate-300 my-4 shadow-inner ring-1 ring-white/10"><code {...props} /></pre>
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

export default function CreateAnnouncement({ classes = [], onPost, userProfile }) {
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("teachers");
  const [classId, setClassId] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [postGlobally, setPostGlobally] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // Check if user is admin of main school
  const canPostGlobally = userProfile?.schoolId === 'srcs_main' && userProfile?.role === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && !photoURL.trim()) {
      alert("Please add some content or a photo to your announcement.");
      return;
    }

    const selectedClass = classes?.find((c) => c.id === classId);
    const className = selectedClass ? selectedClass.name : "";

    // Include postGlobally in the payload
    onPost({ content, audience, classId, className, photoURL, caption: "", postGlobally });

    setContent("");
    setPhotoURL("");
    setClassId("");
    setAudience("teachers");
    setPostGlobally(false);
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col gap-5 sm:gap-7 font-sans pb-2">
      
      {/* --- Main Text Editor & Preview --- */}
      <div className="relative group bg-white/60 dark:bg-slate-800/40 rounded-[2rem] border border-white dark:border-white/10 focus-within:bg-white/90 dark:focus-within:bg-slate-800/80 focus-within:border-indigo-400/50 focus-within:ring-4 focus-within:ring-indigo-400/20 transition-all duration-300 flex-1 flex flex-col shadow-[inset_0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_2px_15px_rgba(0,0,0,0.2)] overflow-hidden">
        
        {/* Toggle Bar */}
        <div className="flex border-b border-slate-200/50 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 px-4 py-2">
            <button 
                type="button" 
                onClick={() => setIsPreview(false)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${!isPreview ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <Edit3 className="w-4 h-4" /> Edit
            </button>
            <button 
                type="button" 
                onClick={() => setIsPreview(true)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${isPreview ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <Eye className="w-4 h-4" /> Preview View
            </button>
        </div>

        <div className="flex-1 w-full flex min-h-[160px] md:min-h-[200px]">
            {isPreview ? (
                <div className="w-full h-full p-6 sm:p-7 overflow-y-auto max-h-[300px] bg-transparent text-[15px] sm:text-base text-slate-800 dark:text-slate-200 custom-scrollbar">
                    {content ? <MarkdownRenderer content={content} /> : <p className="text-slate-400 italic">Nothing to preview...</p>}
                </div>
            ) : (
                <textarea
                  className="w-full h-full flex-1 px-6 pt-6 pb-12 sm:px-7 sm:pt-7 sm:pb-14 bg-transparent border-none outline-none resize-none text-[17px] sm:text-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium leading-[1.6] rounded-b-[2rem] custom-scrollbar"
                  placeholder="What's on your mind? Share an update, announcement, or insight... Use Markdown (*italic*, **bold**, ### headers)!"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
            )}
        </div>
      </div>

      {/* --- Image Input & Preview --- */}
      <div className="space-y-4">
        {/* Input Field */}
        <div className="relative group bg-white/60 dark:bg-slate-800/40 rounded-3xl border border-white dark:border-white/10 focus-within:bg-white/90 dark:focus-within:bg-slate-800/80 focus-within:border-indigo-400/50 transition-all duration-300 flex items-center gap-4 p-2.5 pr-5 shadow-sm hover:shadow-md">
            <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-2xl shrink-0 text-indigo-600 dark:text-indigo-400 shadow-inner">
                <ImageIcon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <input
              type="url"
              className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-[15px] font-medium py-2"
              placeholder="Attach an image link (Optional)..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
            />
        </div>

        {/* Image Preview Card */}
        {photoURL && (
            <div className="relative group animate-in slide-in-from-bottom-2 fade-in zoom-in-95 duration-400 ease-out">
              <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] border-[3px] border-white dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900">
                  <img
                    src={photoURL}
                    alt="Preview"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      setPhotoURL("");
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>
              
              <button
                type="button"
                onClick={() => setPhotoURL("")}
                className="absolute top-5 right-5 p-3 bg-slate-900/80 hover:bg-rose-500 text-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-all hover:scale-110 active:scale-95 border border-white/20"
                aria-label="Remove photo"
              >
                <XIcon className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
        )}
      </div>

      {/* --- Settings Grid (Audience & Class) --- */}
      <div className="bg-slate-50/80 dark:bg-slate-800/80 rounded-[2.5rem] p-5 sm:p-6 border border-slate-200/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex flex-col gap-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center">
            {/* Audience Dropdown */}
            <div className="space-y-1.5 z-20">
              <label className="text-[10px] sm:text-[11px] font-bold text-slate-500/80 dark:text-slate-400 uppercase tracking-[0.2em] pl-2">
                Share With
              </label>
              <div className="relative group bg-white dark:bg-slate-900/90 rounded-[1.5rem] border border-slate-200 dark:border-white/10 shadow-sm transition-all focus-within:ring-4 focus-within:ring-indigo-500/20">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                    <Users className="w-5 h-5" />
                 </div>
                 
                 <select
                    className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 appearance-none cursor-pointer py-4 pl-12 pr-10 font-bold text-[15px]"
                    value={audience}
                    onChange={(e) => {
                        setAudience(e.target.value);
                        if (e.target.value === 'students') setPostGlobally(false); 
                    }}
                  >
                    <option value="teachers">All Teachers</option>
                    <option value="students">Specific Class</option>
                  </select>
                  
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                     <ChevronDown className="w-4 h-4" />
                  </div>
              </div>
            </div>

            {/* Class Dropdown (Conditional) */}
            {audience === "students" && (
              <div className="space-y-1.5 animate-in slide-in-from-right-4 fade-in duration-300 z-10 hidden md:block">
                <label className="text-[10px] sm:text-[11px] font-bold text-slate-500/80 dark:text-slate-400 uppercase tracking-[0.2em] pl-2">
                  Select Class
                </label>
                 <div className="relative group bg-white dark:bg-slate-900/80 rounded-[1.5rem] border border-indigo-200 dark:border-indigo-500/30 ring-2 ring-indigo-500/10 shadow-md transition-all text-indigo-700 dark:text-indigo-300">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    
                    <select
                        className="w-full bg-transparent border-none outline-none appearance-none cursor-pointer py-4 pl-12 pr-10 font-bold text-[15px]"
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        required
                    >
                        <option value="" disabled className="text-slate-400">Choose a class...</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id} className="text-slate-900 dark:text-slate-100">
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
              </div>
            )}

            {/* --- GLOBAL POSTING TOGGLE (Admin Only) --- */}
            {canPostGlobally && audience === "teachers" && (
                <div className="flex items-center justify-between animate-in fade-in slide-in-from-right-4 duration-500 md:mt-0 mt-4 pt-4 md:pt-0 border-t border-slate-200/50 dark:border-white/10 md:border-transparent md:dark:border-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 relative overflow-hidden shrink-0">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                            <Globe2 className="w-6 h-6 relative z-10" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-[13px] md:text-[14px] lg:text-[15px] font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-1">Globally Publish</h4>
                            <p className="text-[10px] md:text-[11px] lg:text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">Post to every school's feed.</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer transform scale-100 md:scale-110 mr-1 shrink-0">
                        <input 
                            type="checkbox" 
                            value="" 
                            className="sr-only peer" 
                            checked={postGlobally}
                            onChange={(e) => setPostGlobally(e.target.checked)}
                        />
                        <div className={`w-12 h-6 bg-slate-200/80 peer-focus:outline-none rounded-full peer dark:bg-slate-700/80 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 shadow-inner ${postGlobally ? 'bg-indigo-600 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500' : ''}`}></div>
                    </label>
                </div>
            )}
            {audience === "students" && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300 z-10 md:hidden block mt-2">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500/80 dark:text-slate-400 uppercase tracking-[0.2em] pl-2">
                    Select Class
                    </label>
                    <div className="relative group bg-white dark:bg-slate-900/80 rounded-[1.5rem] border border-indigo-200 dark:border-indigo-500/30 ring-2 ring-indigo-500/10 shadow-md transition-all text-indigo-700 dark:text-indigo-300">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        
                        <select
                            className="w-full bg-transparent border-none outline-none appearance-none cursor-pointer py-4 pl-12 pr-10 font-bold text-[15px]"
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                            required
                        >
                            <option value="" disabled className="text-slate-400">Choose a class...</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id} className="text-slate-900 dark:text-slate-100">
                                    {c.name}
                                </option>
                            ))}
                        </select>

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- 4. Submit Button --- */}
      <div className="pt-3 mt-auto relative z-20">
          <button
            type="submit"
            disabled={!content.trim() && !photoURL.trim()}
            className={`
                w-full py-4 sm:py-5 rounded-full font-black text-base sm:text-[17px] tracking-wide
                flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-[0.98]
                ${!content.trim() && !photoURL.trim()
                ? 'bg-slate-100/50 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed border-2 border-slate-200/50 dark:border-white/5'
                : `text-white shadow-2xl hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden ${postGlobally ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-500/40' : 'bg-slate-900 dark:bg-white dark:text-slate-900 shadow-slate-900/30 dark:shadow-white/30'}`}
            `}
          >
            {content.trim() || photoURL.trim() ? <div className="absolute inset-0 bg-white/20 dark:bg-black/10 opacity-0 hover:opacity-100 transition-opacity" /> : null}
            <Send className={`w-5 h-5 relative z-10 ${(!content.trim() && !photoURL.trim()) ? '' : 'animate-pulse'}`} strokeWidth={3} />
            <span className="relative z-10">{postGlobally ? 'Publish Global Alert' : 'Post Announcement'}</span>
          </button>
      </div>
    </form>
  );
};