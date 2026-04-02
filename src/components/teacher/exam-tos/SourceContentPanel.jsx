import React from 'react';
import { BookOpenIcon, ClipboardDocumentListIcon, AcademicCapIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import CourseSelector from '../CourseSelector';
import LessonSelector from '../LessonSelector';

export default function SourceContentPanel({ learningCompetencies, setLearningCompetencies, selectedCourse, setSelectedCourse, setSelectedLessons, themeStyles }) {
    
    // Premium Input Styles (Chunky, touch-friendly, inner shadows)
    const inputClasses = `
        w-full px-4 py-3.5 md:py-4 
        bg-black/5 dark:bg-black/20 
        border border-slate-200/50 dark:border-white/5 
        rounded-[16px] md:rounded-[20px] 
        text-sm md:text-base font-medium leading-relaxed
        focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500 
        transition-all duration-300 shadow-inner custom-scrollbar
    `;

    return (
        <div 
            className="relative rounded-[24px] md:rounded-[32px] p-5 sm:p-6 md:p-8 transition-all duration-500 border shadow-sm group overflow-hidden"
            style={{ 
                borderColor: themeStyles?.outline || themeStyles?.borderColor || 'rgba(226, 232, 240, 0.8)', 
                backgroundColor: themeStyles?.innerPanelBg || 'rgba(255, 255, 255, 0.8)' 
            }}
        >
            {/* Ambient background decoration */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>

            <div className="relative z-10">
                <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 flex items-center gap-3 tracking-tight" style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>
                    <div 
                        className="p-2 rounded-[12px] shadow-inner flex items-center justify-center border border-current/20" 
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
                    >
                        <BookOpenIcon className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
                    </div>
                    Source Content
                </h3>
                
                <div className="space-y-6 md:space-y-8">
                    {/* Learning Competencies */}
                    <div>
                        <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold mb-2.5 tracking-widest uppercase opacity-80" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>
                            <ClipboardDocumentListIcon className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" /> Learning Competencies
                        </label>
                        <textarea 
                            rows="4" 
                            value={learningCompetencies} 
                            onChange={(e) => setLearningCompetencies(e.target.value)} 
                            className={inputClasses} 
                            style={{ color: themeStyles?.onSurface || themeStyles?.textColor }} 
                            placeholder="Enter learning competencies, one per line..." 
                        />
                    </div>

                    <div className="h-px w-full bg-black/5 dark:bg-white/5 rounded-full" />

                    {/* Course Selector */}
                    <div>
                        <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold mb-2.5 tracking-widest uppercase opacity-80" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>
                            <AcademicCapIcon className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" /> Select Target Course
                        </label>
                        <div style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>
                            <CourseSelector onCourseSelect={setSelectedCourse} />
                        </div>
                    </div>

                    {/* Lesson Selector (Conditional) */}
                    {selectedCourse && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold mb-2.5 tracking-widest uppercase opacity-80" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>
                                <DocumentTextIcon className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" /> Select Source Lessons
                            </label>
                            <div style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>
                                <LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}