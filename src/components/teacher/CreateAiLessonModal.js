import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { addDoc, collection, serverTimestamp, query, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { MagnifyingGlassIcon as SearchIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import LessonPage from './LessonPage';
import ContentRenderer from './ContentRenderer';

const isFilipino = (text = '') => {
  if (!text) return false;
  const filipinoRegex = /\b(ng|mga|sa|at|ay|para|ang|ito)\b/gi;
  const matches = text.match(filipinoRegex);
  return matches && matches.length > 5;
};

export default function CreateAiLessonModal({ isOpen, onClose, unitId, subjectId, subjectName }) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ format: '5Es', generationTarget: 'studentLesson', instructionalDelivery: 'Offline' });
  const [content, setContent] = useState('');
  const [contentStandard, setContentStandard] = useState('');
  const [performanceStandard, setPerformanceStandard] = useState('');
  const [learningCompetencies, setLearningCompetencies] = useState('');
  const [lessonCount, setLessonCount] = useState(3);
  const [pagesPerLesson, setPagesPerLesson] = useState(3);
  const [gradeLevel, setGradeLevel] = useState('Grade 4');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [allSubjects, setAllSubjects] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [selectedStudentLesson, setSelectedStudentLesson] = useState(null);
  const [teacherGuidePages, setTeacherGuidePages] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [extraInstruction, setExtraInstruction] = useState('');
  const [expandedLessonIndex, setExpandedLessonIndex] = useState(null);

  useEffect(() => {
    if (isOpen && formData.generationTarget === 'teacherGuide') {
      const subjectsQuery = query(collection(db, 'subjects'));
      const unsubSubjects = onSnapshot(subjectsQuery, (snapshot) => {
        setAllSubjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const lessonsQuery = query(collection(db, 'lessons'));
      const unsubLessons = onSnapshot(lessonsQuery, (snapshot) => {
        setAllLessons(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => {
        unsubSubjects();
        unsubLessons();
      };
    }
  }, [isOpen, formData.generationTarget]);

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
          lesson.subjectName && lesson.subjectName.toLowerCase().includes(searchKeyword.toLowerCase())
        );
    }
    setFilteredLessons(lessonsToShow);
  }, [searchKeyword, allSubjects, allLessons]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generatePrompt = (isRegeneration = false, regenerationNote = '', existingData = null, currentGradeLevel, currentSubjectName) => {
    if (isRegeneration && existingData) {
      const existingJsonString = JSON.stringify(existingData, null, 2);
      return `You are a highly precise JSON editing bot. Your ONLY task is to modify the provided JSON data based on the user's instruction and return the complete, updated JSON.
**CRITICAL RULES:**
1. You MUST return the **entire, complete JSON object**.
2. You MUST **preserve all existing data**. Do not delete fields like "content" or "title" unless specifically told to.
3. You must not add any commentary outside the final JSON block.
4. Ensure all backslashes are properly escaped.
**EXISTING JSON DATA:** \`\`\`json\n${existingJsonString}\n\`\`\`
**USER'S INSTRUCTION FOR REVISION:** "${regenerationNote}"`;
    }

	const advancedInstructions = `\n**Mathematical and Scientific Notations:** ALL mathematical content MUST be enclosed in LaTeX delimiters ($...$ or $$...$$). For example, write "the area is $x^2$" instead of "the area is x²". Do NOT use unicode superscript characters in math.
	**Geometrical Figures:** For any geometric shapes, you MUST generate them using SVG code. **CRITICAL SVG RULE:** Any text labels inside the SVG (e.g., for vertices, angles, or length) MUST be plain text. For example, use "<text>l</text>" NOT "<text>$l$</text>".
	**Tables:** For any tabular data, you MUST generate it using **Markdown table syntax** (using '|' and '-'). The table MUST have a header row.
	**CRITICAL JSON RULE:** You MUST ensure all backslashes (\\) in the JSON content are properly escaped (as \\\\).`;

    if (formData.generationTarget === 'teacherGuide' && selectedStudentLesson) {
      const studentLessonContent = selectedStudentLesson.pages.map(p => `Page Title: ${p.title}\nContent:\n${p.content}`).join('\n\n---\n\n');
      const lessonIsFilipino = isFilipino(studentLessonContent);
      const languageInstruction = lessonIsFilipino ? `\n**Language for Generation:**\n"Filipino."\n` : '';
      const phaseInstructions = lessonIsFilipino ? `**Mga Gawain ng Guro**, etc.` : `**Teacher Actions**, etc.`;
      const guideTitlePrefix = lessonIsFilipino ? "Gabay ng Guro para sa:" : "Teacher Guide for:";
      return `You are an expert instructional coach creating a lesson plan for the subject: **${currentSubjectName}**.
**Target Grade Level:** "${currentGradeLevel}".
**Original Student Lesson Content:** ${studentLessonContent}
**Lesson Format:** "${formData.format}"
**Instructions:**
1. The "content" field for each page is the most important part and must contain detailed, step-by-step text for the teacher.
2. Every page object MUST have a descriptive "title".
${advancedInstructions}
3. **JSON Output:** Return a single, valid JSON object: { "generated_lessons": [{ "lessonTitle": "${guideTitlePrefix} ${selectedStudentLesson?.title}", "pages": [ ... ] }] }.`;
    } else {
      const baseInfo = `**Topic:** "${content}"\n**Content Standard:** "${contentStandard}"\n**Learning Competencies:** "${learningCompetencies}"\n**Performance Standard:** "${performanceStandard}"`;
      return `You are an expert instructional designer creating a lesson for the subject: **${currentSubjectName}**.
**Target Grade Level:** "${currentGradeLevel}".
${baseInfo}
**Number of Lessons:** ${lessonCount}
**Pages Per Lesson:** ${pagesPerLesson}
**Format:** "${formData.format}"
**CRITICAL INSTRUCTIONS:**
1. **Core Task:** For every single page, you MUST write detailed, substantive educational text in the "content" field. The "content" field must never be empty.
2. **Language & Objectives:** Detect the language. For Filipino, use the "learningLayunin" key; for English, use "learningObjectives".
3. **References:** The final page of EACH lesson must be "References" with 3-5 real sources.
4. **Page Titles:** Every page object MUST have a relevant "title".
${advancedInstructions}
5. **No Metadata in Content:** Do not write keys like "learningObjectives" or "learningLayunin" inside the 'content' field. These keys belong at the main lesson level only.
6. **JSON Output:** Return a single valid JSON object: { "generated_lessons": [{"lessonTitle": "...", "pages": [{"title": "...", "content": "..."}] }] }.`;
    }
  };

  const handleGenerate = async (regenerationNote = '') => {
    const isRegeneration = !!regenerationNote && !!previewData;
    if (!isRegeneration) {
      if (formData.generationTarget === 'studentLesson' && (!content || !contentStandard || !performanceStandard || !learningCompetencies)) {
        return showToast("Please complete all required fields.", "error");
      }
      if (formData.generationTarget === 'teacherGuide' && !selectedStudentLesson) {
        return showToast("Please select a student lesson to generate a guide for.", "error");
      }
    }
    setIsGenerating(true);
    if (!isRegeneration) setPreviewData(null);
    showToast(isRegeneration ? "Regenerating content..." : "Generating content...", "info");
    try {
      const prompt = generatePrompt(isRegeneration, regenerationNote, previewData, gradeLevel, subjectName);
      const aiText = await callGeminiWithLimitCheck(prompt);
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiText);
      } catch (jsonError) {
        console.warn("Initial JSON parsing failed. Asking AI to fix its own response.", jsonError);
        showToast("AI response was malformed, attempting to self-correct...", "info");
        const fixJsonPrompt = `The following text is broken JSON. Fix syntax errors and return ONLY the corrected, valid JSON object.\n\nBROKEN JSON:\n\`\`\`\n${aiText}\n\`\`\``;
        const fixedAiText = await callGeminiWithLimitCheck(fixJsonPrompt);
        parsedResponse = JSON.parse(fixedAiText);
      }
      console.log("AI Response Received:", parsedResponse);
      let finalData;
      if (isRegeneration) {
        finalData = parsedResponse;
      } else {
        if (parsedResponse.generated_lessons) {
          finalData = parsedResponse;
        } else if (parsedResponse.lessonTitle && parsedResponse.pages) {
          finalData = { generated_lessons: [parsedResponse] };
        } else {
          throw new Error("Received an unknown JSON structure from the AI.");
        }
      }
      setPreviewData(finalData);
    } catch (err) {
      console.error("JSON Parsing or AI Error:", err);
      showToast("AI generation failed. The response may be invalid.", "error");
      setPreviewData({ error: true, message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!previewData || !Array.isArray(previewData.generated_lessons)) {
      showToast("Cannot save: Invalid lesson data.", "error");
      return;
    }
    const batch = writeBatch(db);
    previewData.generated_lessons.forEach(lesson => {
      const newLessonRef = doc(collection(db, 'lessons'));
      batch.set(newLessonRef, {
        title: lesson.lessonTitle,
        pages: lesson.pages,
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
    setTeacherGuidePages(1);
    setGradeLevel('Grade 4');
  };

  const handleSelectLesson = (lesson) => {
    setSelectedStudentLesson(lesson);
    setSearchKeyword('');
    setFilteredLessons([]);
  };

  const toggleLessonPreview = (index) => {
    setExpandedLessonIndex(expandedLessonIndex === index ? null : index);
  };

  const isValidPreview = previewData && Array.isArray(previewData.generated_lessons);

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level:</label>
              <select name="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full p-2 border rounded">
                <option>Kindergarten</option>
                <option>Grade 1</option>
                <option>Grade 2</option>
                <option>Grade 3</option>
                <option>Grade 4</option>
                <option>Grade 5</option>
                <option>Grade 6</option>
                <option>Grade 7</option>
                <option>Grade 8</option>
                <option>Grade 9</option>
                <option>Grade 10</option>
                <option>Grade 11</option>
                <option>Grade 12</option>
              </select>
            </div>
            {formData.generationTarget === 'studentLesson' ? (
              <>
                <textarea placeholder="Main Content / Topic (e.g., Explain the Pythagorean theorem with a diagram)" value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border rounded" rows={4} />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructional Delivery:</label>
                  <select name="instructionalDelivery" value={formData.instructionalDelivery} onChange={handleChange} className="w-full p-2 border rounded">
                    <option value="Offline">Offline (Face-to-Face)</option>
                    <option value="Online">Online</option>
                    <option value="Blended">Blended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pages for Guide:</label>
                  <input type="number" min="1" max="10" value={teacherGuidePages} onChange={(e) => setTeacherGuidePages(Number(e.target.value))} className="w-full p-2 border rounded" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Format:</label>
              <select name="format" value={formData.format} onChange={handleChange} className="w-full p-2 border rounded">
                <option value="5Es">5Es</option>
                <option value="4As">4As</option>
                <option value="3Is">3Is</option>
                <option value="AMT Model">AMT</option>
                <option value="Gradual Release">Gradual Release</option>
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
            {isValidPreview ? (
              <>
                <h2 className="text-lg font-semibold">Preview: {previewData.generated_lessons.length} Lessons Generated</h2>
                <div className="space-y-2">
                    {previewData.generated_lessons.map((lesson, index) => (
                        <div key={index} className="border rounded">
                            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleLessonPreview(index)}>
                                <h3 className="font-bold text-gray-800">{index + 1}. {lesson.lessonTitle}</h3>
                                {expandedLessonIndex === index ? <ChevronUpIcon className="h-5 w-5 text-gray-500"/> : <ChevronDownIcon className="h-5 w-5 text-gray-500"/>}
                            </div>
                            {expandedLessonIndex === index && (
                                <div className="p-4 border-t bg-white">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-sm">{ (lesson.learningLayunin || lesson.objectives) ? 'Mga Layunin:' : 'Objectives:'}</h4>
                                        <ul className="list-disc pl-5 text-sm text-gray-600">
                                            {/* --- START OF FIX --- */}
                                            {Array.isArray(lesson.learningObjectives || lesson.learningLayunin || lesson.objectives) && (lesson.learningObjectives || lesson.learningLayunin || lesson.objectives).map((obj, i) => (
                                                <li key={i}><ContentRenderer text={obj} /></li>
                                            ))}
                                            {/* --- END OF FIX --- */}
                                        </ul>
                                    </div>
                                    {Array.isArray(lesson.pages) && lesson.pages.map((page, pageIndex) => <LessonPage key={pageIndex} page={page} />)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="p-4 text-center bg-red-50 text-red-700 border border-red-200 rounded-lg">
                <h3 className="font-bold">Error Generating Content</h3>
                <p className="text-sm">The AI response was not in the expected format. Please try adjusting your inputs or generating again.</p>
                {previewData?.message && <p className="text-xs mt-2 italic">Details: {previewData.message}</p>}
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Optional: Add extra instruction to improve the content</label>
              <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="e.g., Make the triangle blue, or add labels for A, B, and C" className="w-full border p-2 rounded" rows={2} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => handleGenerate(extraInstruction)} disabled={isGenerating} className="btn-secondary">
                {isGenerating ? 'Regenerating...' : 'Regenerate with Instruction'}
              </button>
              {isValidPreview && <button onClick={handleSave} className="btn-primary">Accept & Save All Lessons</button>}
            </div>
          </div>
        )}
      </Dialog.Panel>
    </Dialog>
  );
}