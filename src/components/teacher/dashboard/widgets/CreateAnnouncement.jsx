import React, { useState } from "react";
import { 
  Image as ImageIcon, 
  X as XIcon, 
  Send,
  Globe2,
  Eye,
  Edit3,
  Megaphone
} from "lucide-react";
import ReactMarkdown from 'react-markdown';

// --- UTILITY: ULTRA-PREMIUM MARKDOWN RENDERER ---
const MarkdownRenderer = ({ content }) => {
    if (!content) return null;
    return (
        <ReactMarkdown
            components={{
                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline underline-offset-4 transition-all break-all" onClick={(e) => e.stopPropagation()} />,
                p: ({node, ...props}) => <p {...props} className="mb-3 sm:mb-4 last:mb-0 leading-relaxed text-slate-700 dark:text-slate-300" />,
                h1: ({node, ...props}) => <h1 {...props} className="text-xl sm:text-2xl font-bold mt-5 mb-3 text-slate-900 dark:text-white tracking-tight" />,
                h2: ({node, ...props}) => <h2 {...props} className="text-lg sm:text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-white tracking-tight" />,
                h3: ({node, ...props}) => <h3 {...props} className="text-base sm:text-lg font-semibold mt-3 mb-2 text-slate-900 dark:text-white" />,
                ul: ({node, ...props}) => <ul {...props} className="list-disc pl-5 mb-3 sm:mb-4 space-y-1 sm:space-y-2 marker:text-indigo-400/70" />,
                ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-5 mb-3 sm:mb-4 space-y-1 sm:space-y-2 marker:text-indigo-400/70" />,
                li: ({node, ...props}) => <li {...props} className="text-slate-700 dark:text-slate-300 pl-1" />,
                strong: ({node, ...props}) => <strong {...props} className="font-bold text-slate-900 dark:text-white" />,
                em: ({node, ...props}) => <em {...props} className="italic text-slate-600 dark:text-slate-400" />,
                hr: ({node, ...props}) => <hr {...props} className="my-5 border-t border-slate-200/60 dark:border-white/10" />,
                blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-4 py-1 italic my-3 sm:my-4 text-slate-600 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-r-xl" />,
                code: ({node, inline, ...props}) => inline 
                    ? <code {...props} className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[12px] sm:text-[13px] font-mono text-indigo-600 dark:text-indigo-300" /> 
                    : <pre className="bg-slate-900 dark:bg-black/40 p-3 sm:p-4 rounded-xl overflow-x-auto text-[12px] sm:text-[13px] font-mono text-slate-300 my-3 sm:my-4 shadow-inner ring-1 ring-white/10"><code {...props} /></pre>
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

export default function CreateAnnouncement({ onPost, userProfile }) {
  const [content, setContent] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [postGlobally, setPostGlobally] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // Check if user is admin of main school
  const canPostGlobally = userProfile?.schoolId === 'srcs_main' && userProfile?.role === 'admin';

  const handleSubmit = (e) => {
      e.preventDefault();
      if (!content.trim() && !photoURL.trim()) {
        return;
      }

      // Hardcoded to 'teachers' since we removed the audience selection
      // FIX: Added teacherId, authorName, and createdAt for instant UI rendering
      onPost({ 
          content, 
          audience: 'teachers', 
          classId: "", 
          className: "", 
          photoURL, 
          caption: "", 
          postGlobally,
          teacherId: userProfile?.id || "",
          authorName: userProfile?.displayName || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Instructor',
          createdAt: new Date() 
      });

      // Reset Form
      setContent("");
      setPhotoURL("");
      setPostGlobally(false);
      setIsPreview(false);
    };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col gap-3 sm:gap-4 font-sans pb-2 sm:pb-4">
      
      {/* --- Context Header (Mobile Compact) --- */}
      <div className="flex items-center gap-2.5 px-1 pt-1 pb-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Megaphone className="w-4 h-4" />
          </div>
          <div>
              <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-800 dark:text-white leading-none">Teacher Announcement</h2>
              <p className="text-[11px] sm:text-[12px] text-slate-500 font-medium leading-none mt-1">Broadcast to faculty</p>
          </div>
      </div>

      {/* --- Main Text Editor & Preview --- */}
      <div className="flex-1 flex flex-col bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all duration-300 relative z-0">
        
        {/* Toggle Bar - iOS Segmented Control Style */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-transparent">
            <div className="flex p-1 bg-slate-100/80 dark:bg-black/40 rounded-lg sm:rounded-xl w-full max-w-[240px] sm:max-w-[280px] mx-auto shadow-inner">
                <button 
                    type="button" 
                    onClick={() => setIsPreview(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[12px] sm:text-[13px] font-bold transition-all duration-300 ${!isPreview ? 'bg-white dark:bg-[#1e212b] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/5 transform scale-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transform scale-95 opacity-80'}`}
                >
                    <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Edit
                </button>
                <button 
                    type="button" 
                    onClick={() => setIsPreview(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[12px] sm:text-[13px] font-bold transition-all duration-300 ${isPreview ? 'bg-white dark:bg-[#1e212b] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/5 transform scale-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transform scale-95 opacity-80'}`}
                >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Preview
                </button>
            </div>
        </div>

        {/* Editor/Preview Area */}
        <div className="flex-1 w-full relative min-h-[160px] sm:min-h-[200px]">
            {isPreview ? (
                <div className="absolute inset-0 p-4 sm:p-6 overflow-y-auto text-[14px] sm:text-[16px] custom-scrollbar">
                    {content ? <MarkdownRenderer content={content} /> : <p className="text-slate-400 italic">Nothing to preview...</p>}
                </div>
            ) : (
                <textarea
                  // text-[16px] is critical to prevent iOS Safari auto-zoom on focus
                  className="w-full h-full absolute inset-0 p-4 sm:p-6 bg-transparent border-none outline-none resize-none text-[16px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 leading-relaxed custom-scrollbar"
                  placeholder="What's on your mind? Share an update, announcement, or insight..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
            )}
        </div>
      </div>

      {/* --- Image Attachment --- */}
      <div className="space-y-3">
        <div className="relative group bg-white/60 dark:bg-[#0f1117]/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-white/5 focus-within:bg-white dark:focus-within:bg-[#1e212b] focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all duration-300 flex items-center gap-2.5 sm:gap-3 p-2 shadow-sm h-12 sm:h-14">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20 rounded-lg sm:rounded-xl shrink-0 text-indigo-600 dark:text-indigo-400 shadow-inner">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="url"
              className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-[16px] font-medium pr-3"
              placeholder="Attach image link (Optional)"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
            />
        </div>

        {photoURL && (
            <div className="relative group animate-in slide-in-from-bottom-2 fade-in duration-400 ease-out transform-gpu">
              <div className="relative aspect-video max-h-[200px] sm:max-h-[300px] w-full overflow-hidden rounded-xl sm:rounded-[1.5rem] border-[2px] sm:border-[3px] border-white dark:border-[#1e212b] shadow-lg bg-slate-100 dark:bg-slate-900">
                  <img
                    src={photoURL}
                    alt="Attached Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      setPhotoURL("");
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => setPhotoURL("")}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-slate-900/80 hover:bg-rose-500 text-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95 border border-white/20"
              >
                <XIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </button>
            </div>
        )}
      </div>

      {/* --- Global Publish Card (Admin Only) --- */}
      {canPostGlobally && (
        <div className="flex items-center justify-between p-3 sm:p-4 bg-white/60 dark:bg-[#0f1117]/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 mix-blend-overlay opacity-50"></div>
                    <Globe2 className="w-5 h-5 sm:w-5 sm:h-5 relative z-10" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <h4 className="text-[14px] sm:text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-none">Global Publish</h4>
                    <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-none mt-1 sm:mt-1.5">Alert all school domains</p>
                </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 scale-[0.9] sm:scale-100">
                <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={postGlobally}
                    onChange={(e) => setPostGlobally(e.target.checked)}
                />
                <div className={`w-11 h-6 bg-slate-200/80 dark:bg-slate-700/80 rounded-full peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform dark:border-slate-600 shadow-inner transition-colors duration-300 ${postGlobally ? 'bg-indigo-600 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-violet-500' : ''}`}></div>
            </label>
        </div>
      )}

      {/* --- Submit Button --- */}
      <div className="mt-auto pt-2 sm:pt-4">
          <button
            type="submit"
            disabled={!content.trim() && !photoURL.trim()}
            className={`
                w-full h-12 sm:h-14 rounded-xl sm:rounded-full font-bold text-[15px] sm:text-[16px] tracking-wide
                flex items-center justify-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-[0.98] transform-gpu overflow-hidden relative
                ${!content.trim() && !photoURL.trim()
                ? 'bg-slate-100 dark:bg-[#0f1117] text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200/50 dark:border-white/5'
                : `text-white shadow-lg sm:shadow-xl hover:-translate-y-0.5 ${postGlobally ? 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/30' : 'bg-slate-900 dark:bg-white dark:text-slate-900 shadow-slate-900/20 dark:shadow-white/20'}`}
            `}
          >
            {content.trim() || photoURL.trim() ? <div className="absolute inset-0 bg-white/10 dark:bg-black/5 opacity-0 hover:opacity-100 transition-opacity" /> : null}
            <Send className={`w-4 h-4 sm:w-5 sm:h-5 relative z-10 ${(!content.trim() && !photoURL.trim()) ? '' : 'animate-pulse'}`} strokeWidth={2.5} />
            <span className="relative z-10">{postGlobally ? 'Publish Global Alert' : 'Post Announcement'}</span>
          </button>
      </div>
    </form>
  );
}