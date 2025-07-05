// CreateAiLessonModal.js — AI Lesson Generator with improved content depth and grade level targeting
import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { addDoc, collection, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { MagnifyingGlassIcon as SearchIcon, XCircleIcon } from '@heroicons/react/24/solid';

// A simple component to render basic markdown (bolding)
const MarkdownRenderer = ({ text = '' }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <p className="text-sm whitespace-pre-line text-gray-700">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </p>
  );
};

// ✅ NEW: Helper object to manage grade levels
const gradeLevelsByEdLevel = {
  'Elementary': ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  'Junior High School': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'Senior High School': ['Grade 11', 'Grade 12'],
};

export default function CreateAiLessonModal({ isOpen, onClose, unitId, subjectId }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    format: '5Es',
    pageCount: 3,
    generationTarget: 'studentLesson',
    educationalLevel: 'Senior High School', // Renamed from gradeLevel
    gradeLevel: 'Grade 11' // New state for specific grade
  });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [allStudentLessons, setAllStudentLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [selectedStudentLesson, setSelectedStudentLesson] = useState(null);

  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonObjectives, setLessonObjectives] = useState('');
  const [lessonStandards, setLessonStandards] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPreview, setLessonPreview] = useState(null);
  const [extraInstruction, setExtraInstruction] = useState('');

  useEffect(() => {
    if (isOpen && subjectId && formData.generationTarget === 'teacherGuide') {
      const q = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllStudentLessons(lessons);
      });
      return () => unsubscribe();
    }
  }, [isOpen, subjectId, formData.generationTarget]);

  useEffect(() => {
    if (searchKeyword) {
      setFilteredLessons(
        allStudentLessons.filter(lesson =>
          lesson.title.toLowerCase().includes(searchKeyword.toLowerCase())
        )
      );
    } else {
      setFilteredLessons(allStudentLessons);
    }
  }, [searchKeyword, allStudentLessons]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };

    // If the educational level changed, reset the grade level to the first available option
    if (name === 'educationalLevel') {
      const availableGrades = gradeLevelsByEdLevel[value];
      newFormData.gradeLevel = availableGrades[0];
    }
    
    setFormData(newFormData);
  };

  const generatePrompt = (extra = '') => {
    let baseInfo = '';
    let studentLessonContent = '';

    if (formData.generationTarget === 'teacherGuide' && selectedStudentLesson) {
        baseInfo = `\n**Lesson Title:**\n"${selectedStudentLesson.title}"\n`;
        studentLessonContent = selectedStudentLesson.pages.map(p => `Page Title: ${p.title}\nContent:\n${p.content}`).join('\n\n---\n\n');
    } else {
        baseInfo = `
**Lesson Title:**
"${lessonTitle}"

**Learning Objectives:**
${lessonObjectives.split('\n').map(obj => `- ${obj}`).join('\n')}

**Curriculum Standards:**
"${lessonStandards}"
`;
    }

    const teacherGuidePrompt = `You are an expert instructional coach creating a detailed lesson plan (Teacher's Guide). Your task is to generate this guide based on the provided student lesson content.
**Original Student Lesson Content:**
${studentLessonContent}
**Lesson Format to Follow for the Guide:**
"Follow the ${formData.format} model."
${extra ? `**Additional Teacher Instruction:**\n${extra}` : ''}
**Instructions for Teacher's Guide:**
1. Create a step-by-step guide for the teacher.
2. For each phase of the model, provide: **Teacher Actions**, **Student Activities**, **Key Questions**, and **Estimated Time**. Use markdown for bolding.
3. The content must be practical and easy for a teacher to follow.
4. Divide the guide into exactly ${formData.pageCount} pages.
5. Include a final page titled "Materials and Preparation".
6. Separate each page with the special marker: "[---PAGE_BREAK---]".
7. The final output must be a single, valid JSON object with this exact structure: { "lessonTitle": "Teacher Guide for: ${selectedStudentLesson?.title}", "pages": [{ "title": "string", "content": "string" }] }. Do not include any text outside the JSON.`;

    // ✅ CORRECTION: The prompt now includes both educational and grade level.
    const studentLessonPrompt = `You are an expert instructional designer and subject matter expert. Your task is to generate a complete, student-facing lesson based on the following specifications.
${baseInfo}
**Target Audience:**
"${formData.educationalLevel} - ${formData.gradeLevel}"

**Lesson Format:**
"Follow the ${formData.format} model."
${extra ? `**Additional Teacher Instruction:**\n${extra}` : ''}
**Instructions for Student Lesson:**
1. **Content Depth:** Generate rich, detailed, and comprehensive lesson content suitable for the specified educational and grade level. Act as a subject matter expert. The content must be factually accurate, well-researched, and go beyond simple definitions. Explain concepts thoroughly with detailed elaborations, examples, and real-world applications to ensure deep understanding.
2. **Clarity and Engagement:** Write in a clear, engaging, and accessible tone. Activities must be clearly described for students to follow.
3. **Structure:** Divide the content into exactly ${formData.pageCount} pages.
4. **Citations:** Include a final page titled "References" listing all sources used.
5. **Formatting:** Separate each page with the special marker: "[---PAGE_BREAK---]". For each page, provide a short, descriptive title.
6. **Output:** The final output must be a single, valid JSON object with this exact structure: { "lessonTitle": "string", "pages": [{ "title": "string", "content": "string" }] }. Do not include any text outside the JSON.`;

    return formData.generationTarget === 'studentLesson' ? studentLessonPrompt : teacherGuidePrompt;
  };

  const handleGenerate = async (regenerationNote = '') => {
    if (formData.generationTarget === 'studentLesson' && (!lessonTitle || !lessonObjectives || !lessonStandards)) {
        return showToast("Please complete all required fields for the student lesson.", "error");
    }
    if (formData.generationTarget === 'teacherGuide' && !selectedStudentLesson) {
        return showToast("Please select a student lesson to generate a guide for.", "error");
    }

    setIsGenerating(true);
    showToast("Generating content. Please wait...", "info");
    try {
      const prompt = generatePrompt(regenerationNote);
      const aiText = await callGeminiWithLimitCheck(prompt);
      const lesson = JSON.parse(aiText);
      setLessonPreview(lesson);
    } catch (err) {
      console.error(err);
      showToast("AI generation failed. Check console for details.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!lessonPreview) return;
    try {
      await addDoc(collection(db, 'lessons'), {
        title: lessonPreview.lessonTitle,
        pages: lessonPreview.pages,
        unitId,
        subjectId,
        contentType: formData.generationTarget,
        basedOnLessonId: formData.generationTarget === 'teacherGuide' ? selectedStudentLesson.id : null,
        createdAt: serverTimestamp()
      });
      showToast("Content saved successfully!", "success");
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save content.", "error");
    }
  };

  const resetState = () => {
    setLessonPreview(null);
    setExtraInstruction('');
    setFormData({ format: '5Es', pageCount: 3, generationTarget: 'studentLesson', educationalLevel: 'Senior High School', gradeLevel: 'Grade 11' });
    setLessonTitle('');
    setLessonObjectives('');
    setLessonStandards('');
    setSearchKeyword('');
    setFilteredLessons([]);
    setSelectedStudentLesson(null);
  };

  const handleSelectLesson = (lesson) => {
    setSelectedStudentLesson(lesson);
    setSearchKeyword('');
    setFilteredLessons([]);
  };

  return (
    <Dialog open={isOpen} onClose={() => { onClose(); resetState(); }} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30" />
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl z-10 max-h-[90vh] overflow-y-auto">
        <Dialog.Title className="text-xl font-bold mb-4">AI Lesson Planner</Dialog.Title>

        {!lessonPreview ? (
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Generate For:</label>
                <select name="generationTarget" value={formData.generationTarget} onChange={handleChange} className="w-full p-2 border rounded">
                    <option value="studentLesson">Lesson for Students</option>
                    <option value="teacherGuide">Lesson Plan for Teacher</option>
                </select>
            </div>

            {formData.generationTarget === 'studentLesson' ? (
                <>
                    <input type="text" placeholder="Lesson Title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full p-2 border rounded" />
                    <textarea placeholder="Learning Objectives (one per line)" value={lessonObjectives} onChange={(e) => setLessonObjectives(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                    <textarea placeholder="Curriculum Standards / Competencies" value={lessonStandards} onChange={(e) => setLessonStandards(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                    {/* ✅ NEW: Updated Educational and Grade Level selectors */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Educational Level:</label>
                        <select name="educationalLevel" value={formData.educationalLevel} onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="Elementary">Elementary</option>
                            <option value="Junior High School">Junior High School</option>
                            <option value="Senior High School">Senior High School</option>
                        </select>
                    </div>
                    {formData.educationalLevel && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level:</label>
                            <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className="w-full p-2 border rounded">
                                {gradeLevelsByEdLevel[formData.educationalLevel].map(grade => (
                                    <option key={grade} value={grade}>{grade}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </>
            ) : (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                    <h3 className="font-semibold text-gray-800">Select a Lesson to Base Your Guide On</h3>
                    {!selectedStudentLesson ? (
                        <>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="text" placeholder="Search by subject name to find lessons..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-full p-2 pl-10 border rounded" />
                            </div>
                            {filteredLessons.length > 0 ? (
                                <ul className="border rounded max-h-40 overflow-y-auto">
                                    {filteredLessons.map(lesson => (
                                        <li key={lesson.id} onClick={() => handleSelectLesson(lesson)} className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0">
                                            {lesson.title}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 text-center p-4">No lessons found for this subject.</p>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="font-medium text-blue-800">{selectedStudentLesson.title}</span>
                            <button onClick={() => setSelectedStudentLesson(null)}><XCircleIcon className="h-5 w-5 text-blue-600 hover:text-blue-800"/></button>
                        </div>
                    )}
                </div>
            )}
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Format:</label>
                <select name="format" value={formData.format} onChange={handleChange} className="w-full p-2 border rounded">
                    <option value="5Es">5Es (Engage, Explore, Explain, Elaborate, Evaluate)</option>
                    <option value="4As">4As (Activity, Analysis, Abstraction, Application)</option>
                    <option value="3Is">3Is (Introduce, Interact, Integrate)</option>
                    <option value="Gradual Release">Gradual Release (I do, We do, You do)</option>
                    <option value="Lecture">Standard Lecture</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pages:</label>
                <input type="number" name="pageCount" min={1} max={20} value={formData.pageCount} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>

            <div className="flex justify-end">
              <button onClick={() => handleGenerate()} disabled={isGenerating} className="btn-primary">
                {isGenerating ? 'Generating...' : 'Generate Content'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Preview: {lessonPreview.lessonTitle}</h2>
            {lessonPreview.pages.map((page, index) => (
              <div key={index} className="border rounded p-4">
                <h3 className="font-semibold text-gray-800 mb-2">{index + 1}. {page.title}</h3>
                <MarkdownRenderer text={page.content} />
              </div>
            ))}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Optional: Add extra instruction to improve the content</label>
              <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="e.g., Add more visual examples or questions" className="w-full border p-2 rounded" rows={2} />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => handleGenerate(extraInstruction)} className="btn-secondary">Regenerate with Instruction</button>
              <button onClick={handleSave} className="btn-primary">Accept & Save</button>
            </div>
          </div>
        )}
      </Dialog.Panel>
    </Dialog>
  );
}
