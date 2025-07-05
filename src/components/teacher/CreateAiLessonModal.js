// CreateAiLessonModal.js — AI Lesson Generator with multi-lesson scaffolding
import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { MagnifyingGlassIcon as SearchIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

// A utility function to detect Filipino language based on common words.
const isFilipino = (text = '') => {
  // Regex to find common Filipino connector words. The \b ensures whole words are matched.
  // Checks for words like 'ng', 'mga', 'sa', 'at', 'ay', 'para', 'ang'.
  const filipinoRegex = /\b(ng|mga|sa|at|ay|para|ang|ito)\b/gi;
  const matches = text.match(filipinoRegex);
  
  // Considers it Filipino if it finds more than 5 common Filipino words.
  // This threshold prevents false positives on English text with occasional "at" or "sa".
  return matches && matches.length > 5;
};

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

export default function CreateAiLessonModal({ isOpen, onClose, unitId, subjectId }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    format: '5Es',
    generationTarget: 'studentLesson',
    instructionalDelivery: 'Offline'
  });

  // State for the new multi-lesson workflow
  const [content, setContent] = useState('');
  const [contentStandard, setContentStandard] = useState('');
  const [performanceStandard, setPerformanceStandard] = useState('');
  const [learningCompetencies, setLearningCompetencies] = useState('');
  const [lessonCount, setLessonCount] = useState(3);
  const [pagesPerLesson, setPagesPerLesson] = useState(3);

  // State for the teacher guide workflow
  const [searchKeyword, setSearchKeyword] = useState('');
  const [allSubjects, setAllSubjects] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [selectedStudentLesson, setSelectedStudentLesson] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [extraInstruction, setExtraInstruction] = useState('');
  
  const [expandedLessonIndex, setExpandedLessonIndex] = useState(null);

  // Fetch all subjects and lessons when the modal is set to generate a teacher guide
  useEffect(() => {
    if (isOpen && formData.generationTarget === 'teacherGuide') {
      const subjectsQuery = query(collection(db, 'subjects'));
      const unsubSubjects = onSnapshot(subjectsQuery, (snapshot) => {
        const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllSubjects(subjects);
      });

      const lessonsQuery = query(collection(db, 'lessons'));
      const unsubLessons = onSnapshot(lessonsQuery, (snapshot) => {
        const lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllLessons(lessons);
      });

      return () => {
        unsubSubjects();
        unsubLessons();
      };
    }
  }, [isOpen, formData.generationTarget]);

  // Filter lessons based on the searched subject name
  useEffect(() => {
    const subjectNameMap = allSubjects.reduce((map, subject) => {
        map[subject.id] = subject.name;
        return map;
    }, {});

    let lessonsToShow = [];

    if (searchKeyword.trim() === '') {
      lessonsToShow = allLessons.map(lesson => ({
          ...lesson,
          subjectName: subjectNameMap[lesson.subjectId] || 'Unknown Subject'
      }));
    } else {
      lessonsToShow = allLessons
        .map(lesson => ({
            ...lesson,
            subjectName: subjectNameMap[lesson.subjectId] || ''
        }))
        .filter(lesson => 
            lesson.subjectName.toLowerCase().includes(searchKeyword.toLowerCase())
        );
    }
    setFilteredLessons(lessonsToShow);
  }, [searchKeyword, allSubjects, allLessons]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generatePrompt = (extra = '') => {
    let baseInfo = '';
    let studentLessonContent = '';
    let teacherGuidePrompt = '';

    if (formData.generationTarget === 'teacherGuide' && selectedStudentLesson) {
        baseInfo = `\n**Lesson Title:**\n"${selectedStudentLesson.title}"\n`;
        studentLessonContent = selectedStudentLesson.pages.map(p => `Page Title: ${p.title}\nContent:\n${p.content}`).join('\n\n---\n\n');

        // 1. Detect the language of the source lesson content.
        const lessonIsFilipino = isFilipino(studentLessonContent);

        // 2. Prepare language-specific instructions for the AI.
        const languageInstruction = lessonIsFilipino
          ? `\n**Language for Generation:**\n"Filipino. The entire output, including all titles, headings, and content MUST be in Filipino."\n`
          : '';

        const phaseInstructions = lessonIsFilipino
          ? `**Mga Gawain ng Guro (Teacher Actions)**, **Mga Aktibidad ng Mag-aaral (Student Activities)**, **Mga Pangunahing Tanong (Key Questions)**, and **Tinatayang Oras (Estimated Time)**`
          : `**Teacher Actions**, **Student Activities**, **Key Questions**, and **Estimated Time**`;

        const guideTitlePrefix = lessonIsFilipino ? "Gabay ng Guro para sa:" : "Teacher Guide for:";

        // 3. Construct the final prompt using the dynamic, language-aware variables.
        teacherGuidePrompt = `You are an expert instructional coach creating a detailed lesson plan (Teacher's Guide). Your task is to generate this guide based on the provided student lesson content and a specified instructional delivery mode.
**Original Student Lesson Content:**
${studentLessonContent}
**Lesson Format to Follow for the Guide:**
"Follow the ${formData.format} model."
**Instructional Delivery Mode:**
"${formData.instructionalDelivery}"${languageInstruction}${extra ? `**Additional Teacher Instruction:**\n${extra}` : ''}
**Instructions for Teacher's Guide:**
1. Create a step-by-step guide for the teacher that is **strictly tailored** to the specified "Instructional Delivery Mode".
2. For each phase of the model, provide: ${phaseInstructions}. Use markdown for bolding.
3. The final output must be a single, valid JSON object with this exact structure: { "generated_lessons": [{ "lessonTitle": "${guideTitlePrefix} ${selectedStudentLesson?.title}", "pages": [{ "title": "string", "content": "string" }] }] }. Do not include any text outside the JSON.`;

    } else {
        baseInfo = `
**Main Content/Topic:**
"${content}"

**Content Standard:**
"${contentStandard}"

**Learning Competencies:**
"${learningCompetencies}"

**Performance Standard:**
"${performanceStandard}"
`;
    }

    const studentLessonPrompt = `You are an expert instructional designer and subject matter expert. Your task is to generate a series of scaffolded, student-facing lessons of exceptional quality.
${baseInfo}
**Number of Lessons to Create:** ${lessonCount}
**Pages Per Lesson:** ${pagesPerLesson}

**Lesson Format to Follow for each lesson:**
"Follow the ${formData.format} model."
${extra ? `**Additional Teacher Instruction:**\n${extra}` : ''}
**CRITICAL INSTRUCTIONS FOR GENERATING THE LESSON SERIES:**
1.  **Language Detection and Application:** You MUST detect the primary language used in the provided "Main Content/Topic", "Content Standard", and "Performance Standard". The entire generated output, including all lesson titles, objectives, content, and activities, MUST be in that same detected language.
2.  **Expert-Level Content Depth:** Act as a university-level subject matter expert. The content must be rich, detailed, comprehensive, and factually accurate. **Do not provide simple definitions.** Instead, provide in-depth discussions, full explanations of concepts, and use analogies, case studies, and real-world examples to ensure deep understanding. The information must be dense and valuable.
3.  **Scaffolding and Cohesion:** Logically divide the main "Content" into ${lessonCount} distinct lessons. Each lesson must sequentially build upon the knowledge and skills of the previous one, creating a cohesive learning arc.
4.  **Unique and Engaging Activities:** For each lesson, design unique, creative, and engaging activities. Do not use generic activities. Suggest specific, modern pedagogical techniques (e.g., "Think-Pair-Share," "Jigsaw," "Concept Mapping," "Gallery Walk"). All activities must directly prepare students to achieve the stated "Performance Standard".
5.  **AI-Generated Objectives:** For each of the ${lessonCount} lessons, you must generate specific, measurable, and appropriate learning objectives that are directly aligned with the provided **Learning Competencies**.
6.  **Valid Academic References:** The final page of **each generated lesson** must be titled "References" (or "Sanggunian" if in Filipino) and must list at least 3-5 **valid, real-world academic sources** used to create the content. These can be books (with authors and ISBNs if possible), academic journals, or highly reputable educational websites. Do not invent sources.
7.  **Structure and Formatting:** Each lesson must be divided into exactly ${pagesPerLesson} pages. Use the special marker "[---PAGE_BREAK---]" to separate pages within a single lesson.
8.  **Output:** The final output must be a single, valid JSON object. The root object should have one key: "generated_lessons", which is an array. Each element in the array is a complete lesson object.
9.  **JSON Key for Objectives:** If the detected language is Filipino, use the key "learningLayunin" for the objectives array. Otherwise, use the key "learningObjectives". The structure must be: { "lessonTitle": "string", "learningLayunin" or "learningObjectives": ["string"], "pages": [{ "title": "string", "content": "string" }] }. Do not include any text outside the JSON.`;

    return formData.generationTarget === 'studentLesson' ? studentLessonPrompt : teacherGuidePrompt;
  };

  const handleGenerate = async (regenerationNote = '') => {
    if (formData.generationTarget === 'studentLesson' && (!content || !contentStandard || !performanceStandard || !learningCompetencies)) {
        return showToast("Please complete all required fields.", "error");
    }
    if (formData.generationTarget === 'teacherGuide' && !selectedStudentLesson) {
        return showToast("Please select a student lesson to generate a guide for.", "error");
    }

    setIsGenerating(true);
    showToast("Generating content. This may take a moment...", "info");
    try {
      const prompt = generatePrompt(regenerationNote);
      const aiText = await callGeminiWithLimitCheck(prompt);
      const response = JSON.parse(aiText);
      setPreviewData(response);
    } catch (err) {
      console.error(err);
      showToast("AI generation failed. Check console for details.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!previewData || !previewData.generated_lessons) return;
    
    const batch = writeBatch(db);
    
    previewData.generated_lessons.forEach(lesson => {
        const newLessonRef = doc(collection(db, 'lessons'));
        batch.set(newLessonRef, {
            title: lesson.lessonTitle,
            pages: lesson.pages,
            // Coalesce objectives from either key into a single database field.
            objectives: lesson.learningObjectives || lesson.learningLayunin || [],
            unitId,
            subjectId,
            contentType: formData.generationTarget,
            basedOnLessonId: formData.generationTarget === 'teacherGuide' ? selectedStudentLesson.id : null,
            createdAt: serverTimestamp()
        });
    });

    try {
      await batch.commit();
      showToast(`${previewData.generated_lessons.length} lessons saved successfully!`, "success");
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save lessons.", "error");
    }
  };

  const resetState = () => {
    setPreviewData(null);
    setExtraInstruction('');
    setFormData({ format: '5Es', generationTarget: 'studentLesson', instructionalDelivery: 'Offline' });
    setContent('');
    setContentStandard('');
    setPerformanceStandard('');
    setLearningCompetencies('');
    setLessonCount(3);
    setPagesPerLesson(3);
    setSearchKeyword('');
    setFilteredLessons([]);
    setSelectedStudentLesson(null);
    setExpandedLessonIndex(null);
  };

  const handleSelectLesson = (lesson) => {
    setSelectedStudentLesson(lesson);
    setSearchKeyword('');
    setFilteredLessons([]);
  };

  const toggleLessonPreview = (index) => {
    setExpandedLessonIndex(expandedLessonIndex === index ? null : index);
  };

  return (
    <Dialog open={isOpen} onClose={() => { onClose(); resetState(); }} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30" />
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl z-10 max-h-[90vh] overflow-y-auto">
        <Dialog.Title className="text-xl font-bold mb-4">AI Lesson Planner</Dialog.Title>

        {!previewData ? (
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
                    <textarea placeholder="Main Content / Topic" value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border rounded" rows={4} />
                    <textarea placeholder="Content Standard" value={contentStandard} onChange={(e) => setContentStandard(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                    <textarea placeholder="Learning Competencies" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                    <textarea placeholder="Performance Standard" value={performanceStandard} onChange={(e) => setPerformanceStandard(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Lessons:</label>
                            <input type="number" min="1" max="10" value={lessonCount} onChange={(e) => setLessonCount(Number(e.target.value))} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pages per Lesson:</label>
                            <input type="number" min="1" max="20" value={pagesPerLesson} onChange={(e) => setPagesPerLesson(Number(e.target.value))} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                    <h3 className="font-semibold text-gray-800">Select a Lesson to Base Your Guide On</h3>
                    {!selectedStudentLesson ? (
                        <>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="text" placeholder="Search by subject name..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-full p-2 pl-10 border rounded" />
                            </div>
                            {filteredLessons.length > 0 ? (
                                <ul className="border rounded max-h-40 overflow-y-auto">
                                    {filteredLessons.map(lesson => (
                                        <li key={lesson.id} onClick={() => handleSelectLesson(lesson)} className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0">
                                            <p className="font-medium">{lesson.title}</p>
                                            <p className="text-xs text-gray-500">Subject: {lesson.subjectName}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 text-center p-4">No lessons found.</p>
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
            
            {formData.generationTarget === 'teacherGuide' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructional Delivery:</label>
                    <select name="instructionalDelivery" value={formData.instructionalDelivery} onChange={handleChange} className="w-full p-2 border rounded">
                        <option value="Offline">Offline (Face-to-Face)</option>
                        <option value="Online">Online</option>
                        <option value="Blended">Blended</option>
                    </select>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Format:</label>
                <select name="format" value={formData.format} onChange={handleChange} className="w-full p-2 border rounded">
                    <option value="5Es">5Es (Engage, Explore, Explain, Elaborate, Evaluate)</option>
                    <option value="4As">4As (Activity, Analysis, Abstraction, Application)</option>
                    <option value="3Is">3Is (Introduce, Interact, Integrate)</option>
                    <option value="AMT Model">AMT (Acquisition, Meaning-making, Transfer)</option>
                    <option value="Gradual Release">Gradual Release (I do, We do, You do)</option>
                    <option value="Lecture">Standard Lecture</option>
                </select>
            </div>
            
            <div className="flex justify-end">
              <button onClick={() => handleGenerate()} disabled={isGenerating} className="btn-primary">
                {isGenerating ? 'Generating...' : 'Generate Content'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Preview: {previewData.generated_lessons.length} Lessons Generated</h2>
            <div className="space-y-2">
                {previewData.generated_lessons.map((lesson, index) => (
                    <div key={index} className="border rounded">
                        <div
                            className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleLessonPreview(index)}
                        >
                            <h3 className="font-bold text-gray-800">{index + 1}. {lesson.lessonTitle}</h3>
                            {expandedLessonIndex === index ? <ChevronUpIcon className="h-5 w-5 text-gray-500"/> : <ChevronDownIcon className="h-5 w-5 text-gray-500"/>}
                        </div>
                        {expandedLessonIndex === index && (
                            <div className="p-4 border-t bg-white">
                                <div className="mb-4">
                                    {/* Conditionally render "Layunin" or "Objectives" */}
                                    <h4 className="font-semibold text-sm">{lesson.learningLayunin ? 'Mga Layunin:' : 'Objectives:'}</h4>
                                    <ul className="list-disc pl-5 text-sm text-gray-600">
                                        {(lesson.learningObjectives || lesson.learningLayunin)?.map((obj, i) => <li key={i}>{obj}</li>)}
                                    </ul>
                                </div>
                                {lesson.pages.map((page, pageIndex) => (
                                    <div key={pageIndex} className="mb-4 last:mb-0">
                                        <h4 className="font-semibold text-gray-700 mb-1">{page.title}</h4>
                                        <MarkdownRenderer text={page.content} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Optional: Add extra instruction to improve the content</label>
              <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="e.g., Add more visual examples or questions" className="w-full border p-2 rounded" rows={2} />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => handleGenerate(extraInstruction)} className="btn-secondary">Regenerate with Instruction</button>
              <button onClick={handleSave} className="btn-primary">Accept & Save All Lessons</button>
            </div>
          </div>
        )}
      </Dialog.Panel>
    </Dialog>
  );
}