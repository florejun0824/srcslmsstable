import React from 'react';
import { inputBaseStyles } from './examTosUtils';
import CourseSelector from '../CourseSelector';
import LessonSelector from '../LessonSelector';

export default function SourceContentPanel({ learningCompetencies, setLearningCompetencies, selectedCourse, setSelectedCourse, setSelectedLessons, themeStyles }) {
    const neumorphicTextarea = `${inputBaseStyles} px-4 py-2.5 sm:text-sm`;

    return (
        <div className="rounded-[20px] border p-5 lg:p-6 transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Source Content
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Learning Competencies</label>
                    <textarea rows="4" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className={neumorphicTextarea} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }} placeholder="Enter learning competencies, one per line." ></textarea>
                </div>
                <div style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                    <CourseSelector onCourseSelect={setSelectedCourse} />
                </div>
                {selectedCourse && (
                    <div style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                        <LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} />
                    </div>
                )}
            </div>
        </div>
    );
}
