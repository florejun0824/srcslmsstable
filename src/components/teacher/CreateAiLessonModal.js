import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

// Helper function to extract JSON from a potentially conversational string
const extractJson = (text) => {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
        // If no JSON object is found, return the original text for error display
        return text;
    }
    return text.substring(firstBrace, lastBrace + 1);
};

export default function CreateAiLessonModal({ isOpen, onClose, unitId, subjectId, subjectName }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    generationTarget: 'studentLesson',
    format: '5Es',
    teacherGuideScope: 'byLesson',
    peacGenerationScope: 'byLesson'
  });
  const [content, setContent] = useState('');
  const [contentStandard, setContentStandard] = useState('');
  const [performanceStandard, setPerformanceStandard] = useState('');
  const [learningCompetencies, setLearningCompetencies] = useState('');
  const [lessonCount, setLessonCount] = useState(1);
  const [pagesPerLesson, setPagesPerLesson] = useState(5);
  const [planPageCount, setPlanPageCount] = useState(10); 

  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [unitsForSubject, setUnitsForSubject] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [lessonsForUnit, setLessonsForUnit] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [existingLessonCount, setExistingLessonCount] = useState(0);
  const [extraInstruction, setExtraInstruction] = useState('');


  useEffect(() => {
    if (isOpen && (formData.generationTarget === 'peacAtg' || formData.generationTarget === 'teacherGuide')) {
      const subjectsQuery = query(collection(db, 'courses'), orderBy('title'));
      const unsub = onSnapshot(subjectsQuery, (snapshot) => {
        setAllSubjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [isOpen, formData.generationTarget]);

  useEffect(() => {
    if (selectedSubjectId) {
      const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', selectedSubjectId));
      const unsub = onSnapshot(unitsQuery, (snapshot) => {
        const fetchedUnits = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedUnits.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setUnitsForSubject(fetchedUnits);
      });
      return () => unsub();
    } else {
        setUnitsForSubject([]);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedUnitId) {
      const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', selectedUnitId));
      const unsub = onSnapshot(lessonsQuery, (snapshot) => {
        const fetchedLessons = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedLessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setLessonsForUnit(fetchedLessons);
      });
      return () => unsub();
    } else {
        setLessonsForUnit([]);
    }
  }, [selectedUnitId]);

  useEffect(() => {
    if (isOpen && unitId) {
      const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
      const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
        setExistingLessonCount(snapshot.size);
      });
      return () => unsubscribe();
    }
  }, [isOpen, unitId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === `${formData.generationTarget}Scope`) {
        if (formData.generationTarget === 'peacAtg') {
            setFormData(prev => ({ ...prev, peacGenerationScope: value }));
        } else if (formData.generationTarget === 'teacherGuide') {
            setFormData(prev => ({ ...prev, teacherGuideScope: value }));
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const generateFinalPrompt = (sourceTitle, structuredContent, format) => {
      let prompt = `You are an expert instructional designer creating a teacher's guide.
      **Topic/Unit Title:** "${sourceTitle}"
      **Source Material (Student's Lesson) & Competencies:**
      ---
      ${structuredContent}
      ---
      
      **TASK:**
      Your primary goal is to create a detailed teacher's guide that is **perfectly aligned** with the provided source material and competencies. This guide is for teaching the content presented in the student's lesson. Generate a comprehensive plan following the **${format}** format, approximately ${planPageCount} pages/sections long.
      **For every activity you design, you MUST provide an "Online Alternative" to support blended learning.**
      `;

      if (format === 'AMT Model') {
          prompt += `
          **AMT Model Instructions:**
          This lesson plan must directly teach the concepts from the source material.
          Structure the plan into three stages: Acquisition, Meaning-making, and Transfer. For each stage, identify the specific competencies being addressed.

          1.  **Acquisition (A):**
              * **Covered Competencies:** List the specific competencies addressed here.
              * **Objective(s):** State what foundational knowledge from the source material students must acquire.
              * **Activities:** Design activities for gaining knowledge based on the source material.
              * **Online Alternative:** For each activity, describe a corresponding online version.

          2.  **Meaning-making (M):**
              * **Covered Competencies:** List the specific competencies addressed here.
              * **Objective(s):** State how students will demonstrate understanding of the source material's concepts.
              * **Activities:** Design activities for deeper understanding that use the source material.
              * **Online Alternative:** For each activity, describe a corresponding online version.

          3.  **Transfer (T):**
              * **Covered Competencies:** List the specific competencies addressed here.
              * **Objective(s):** State how students will apply learning from the source material in new contexts.
              * **Activities:** Design authentic assessment tasks that require application of the source material.
              * **Online Alternative:** For each activity, describe a corresponding online version.
          `;
      } else if (format === 'PEAC ATG') {
          prompt += `
          **PEAC Adaptive Teaching Guide (ATG) Instructions:**
          Generate a detailed guide for teaching the provided source material. Ensure every activity includes an "Online Alternative."

          **Formatting Rule for Titles:** For the "Experiential Learning" pages, format the page "title" as a simple, single line. Example: "Chunk 1: The Universe - Experiential Learning".

          **Guide Structure:**
          * **1. Prerequisite Content-Knowledge and Skills:** List what students must know to understand the source material.
          * **2. Prerequisites Assessment:** Design and provide the **full content** for a diagnostic tool (e.g., a 10-item 'Quick Check'). Include questions, options, and the answer key.
          * **3. Pre-Lesson Remediation Activities:**
              * **For Students with Insufficient Level:** Provide a simple, foundational activity.
              * **For Students with Fairly Sufficient Level:** Provide an activity that reinforces and extends knowledge.
          * **4. Introduction:**
              * **Time Frame:** Expected lesson duration.
              * **RUA (Real-life Understanding and Application):** State what students will learn.
              * **Context of Application:** Explain where students will use this learning.
              * **Overview of the Lesson:** Briefly describe how you will teach the topics from the source material.
          * **5. Student's Experiential Learning (Lesson Proper):**
              * **Chunking the Topic:** Break the source material into essential, manageable chunks.
              * **For Each Chunk:**
                  * **A. Covered Competencies:** Identify and list the specific learning competencies from the provided list that are addressed in this chunk.
                  * **B. Detailed Discussion Content:** Write out the core concepts and explanations the teacher should deliver for this chunk, based directly on the source material. This should be a detailed teaching script.
                  * **C. Formative Questions:** List questions to check for understanding of the discussion content.
                  * **D. Adaptive Teaching Strategies & Activities:** Detail activities, scaffolding, and materials to practice the concepts discussed. Include an **Online Alternative** for each strategy.
          * **6. Synthesis:** Describe an activity for students to consolidate their learning of the source material.
          * **7. RUA of a Student's Learning (Post-Lesson Assessment):** Define the performance task that demonstrates mastery of the source material.
          * **8. Post-Lesson Remediation Activity:** Provide a targeted activity for students who need more support.
          * **9. Post-Lesson Enrichment Activity:** Provide a challenging activity for students who have mastered the content.
          * **10. Final Unit Performance Task (GRASPS Format):** If applicable, create a culminating task in GRASPS format (Goal, Role, Audience, Situation, Product, Standards).
          `;
      } else { // 5Es, 4As, etc.
          prompt += `For the ${format} format, the guide must include sections for Values Inculcation, an Answer Key, and a References list. For every activity you design, you MUST provide an "Online Alternative" to support blended learning.`
      }

      prompt += `\n**CRITICAL JSON OUTPUT:** Your entire response MUST be a single, valid JSON object and nothing else. Do not add any text before or after the JSON object. 
      **IMPORTANT JSON RULE:** Within the JSON, all double quotes (") inside the 'title' and 'content' string values MUST be escaped with a backslash (\\"). For example: "This is a \\"quoted\\" word."
      The object must contain "lessonTitle" and "pages" keys, where "pages" is an array of objects, each with a "title" and "content" key. Adhere to all formatting rules.`;
      
      return prompt;
  };

  const handleGenerate = async (regenerationNote = '') => {
    const isRegeneration = !!regenerationNote && !!previewData;
    setIsGenerating(true);
    if (!isRegeneration) setPreviewData(null);
    showToast(isRegeneration ? "Regenerating content..." : "Generating content...", "info");

    try {
        let finalPrompt;

        if (isRegeneration) {
            const existingJsonString = JSON.stringify(previewData, null, 2);
            finalPrompt = `You are a highly precise JSON editing bot. Your task is to modify the provided JSON data based on this instruction: "${regenerationNote}". Return ONLY the complete, updated JSON object. Adhere to all original formatting and JSON rules.
            **EXISTING JSON DATA:** \`\`\`json\n${existingJsonString}\n\`\`\``;
        } else {
            let sourceContent = '';
            let sourceTitle = '';
            let scope = formData.generationTarget === 'peacAtg' ? formData.peacGenerationScope : formData.teacherGuideScope;
            let targetFormat = formData.generationTarget === 'peacAtg' ? 'PEAC ATG' : formData.format;

            if (formData.generationTarget === 'peacAtg' || formData.generationTarget === 'teacherGuide') {
                if (scope === 'byUnit') {
                    if (!selectedUnitId) { showToast("Please select a unit.", "error"); setIsGenerating(false); return; }
                    const unit = unitsForSubject.find(u => u.id === selectedUnitId);
                    sourceTitle = unit?.title || 'Consolidated Unit';
                    const lessonsInUnitQuery = query(collection(db, 'lessons'), where('unitId', '==', selectedUnitId));
                    const querySnapshot = await getDocs(lessonsInUnitQuery);
                    const lessonsData = querySnapshot.docs.map(d => d.data()).sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
                    sourceContent = lessonsData.map((lesson, index) => `Lesson ${index + 1} (${lesson.title}):\n${lesson.pages.map(p => p.content).join('\n')}`).join('\n\n');
                } else { // byLesson
                    if (!selectedLessonId) { showToast("Please select a lesson.", "error"); setIsGenerating(false); return; }
                    const lesson = lessonsForUnit.find(l => l.id === selectedLessonId);
                    sourceTitle = lesson?.title || 'Selected Lesson';
                    sourceContent = lesson.pages.map(p => p.content).join('\n\n');
                }
                
                showToast("Step 1/2: Analyzing source content...", "info");
                const analysisPrompt = `You are a research assistant. Read the provided source text and learning competencies. Your task is to create a structured summary of the key information for the purpose of building a teacher's guide.
                
                **Source Text (Student Lesson):**
                ---
                ${sourceContent}
                ---
                **Learning Competencies:**
                ---
                ${learningCompetencies}
                ---
                
                Output a structured summary that includes:
                1.  A list of the main topics and key concepts found in the student lesson text.
                2.  A list of the provided learning competencies, which will be used to map to lesson chunks later.`;
                
                const analysisText = await callGeminiWithLimitCheck(analysisPrompt);

                showToast("Step 2/2: Generating lesson plan...", "info");
                finalPrompt = generateFinalPrompt(sourceTitle, analysisText, targetFormat);

            } else { // studentLesson
                if (!content || !learningCompetencies) {
                    showToast("Please complete all required fields.", "error"); setIsGenerating(false); return;
                }
                const baseInfo = `**Topic:** "${content}"\n**Content Standard:** "${contentStandard}"\n**Learning Competencies:** "${learningCompetencies}"\n**Performance Standard:** "${performanceStandard}"`;
                finalPrompt = `You are an expert instructional designer creating student-friendly lessons for the subject: **${subjectName}**.
                ${baseInfo}
                **Number of Lessons:** ${lessonCount}
                **Pages Per Lesson:** ${pagesPerLesson}
                **Format:** "${formData.format}"
                **CRITICAL INSTRUCTIONS:**
                1. **Tone:** Write in a simple, engaging, and student-friendly manner.
                2. **Content & Page Titles:** Every page's "content" field MUST be detailed and substantive. The "title" for each page should be just the topic (e.g., "Benefits of Solar Energy"), NOT numbered (e.g., "Page 1: Benefits of Solar Energy").
                3. **Lesson Titles:** Each main lesson title (lessonTitle) MUST be catchy and start with "Lesson #:", numbering from ${existingLessonCount + 1}.
				4. **References Page:** At the end of EACH lesson's "pages" array, you MUST add ONE extra page. This page's "title" MUST be exactly "References". Its "content" must be a list of all the valid, citable, real-world sources you used to create the lesson content.
				5. **Learning Objectives:** At the beginning of each lesson, create a list of 3-5 clear, measurable learning objectives. These objectives should describe what the student will be able to do after completing the lesson. They must be directly related to the lesson's content.
                6. **JSON Output:** Your entire response MUST be a single valid JSON object: { "generated_lessons": [{"lessonTitle": "...", "pages": [{"title": "...", "content": "..."}] }] }.`;
            }
        }
      
      const aiText = await callGeminiWithLimitCheck(finalPrompt);
      const jsonText = extractJson(aiText);
      const sanitizedText = jsonText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

      const parsedResponse = JSON.parse(sanitizedText);
      
      let finalData;
      if (parsedResponse.generated_lessons) {
          finalData = parsedResponse;
      } else if (parsedResponse.lessonTitle && parsedResponse.pages) {
          finalData = { generated_lessons: [parsedResponse] };
      } else {
          throw new Error("Received an unknown JSON structure from the AI.");
      }
      setPreviewData(finalData);

    } catch (err) {
      console.error("Error during generation or parsing:", err);
      showToast("AI generation failed. The response may be invalid.", "error");
      setPreviewData({ error: true, message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };


  const handleSave = async () => {
    if (!previewData || !Array.isArray(previewData.generated_lessons)) {
      showToast("Cannot save: Invalid lesson data.", "error"); return;
    }
    const batch = writeBatch(db);
    previewData.generated_lessons.forEach((lesson, index) => {
      const newLessonRef = doc(collection(db, 'lessons'));
      
      if (!unitId || !subjectId) {
          showToast("Could not save: Destination unit or subject is missing.", "error"); 
          return;
      }

      batch.set(newLessonRef, {
        title: lesson.lessonTitle,
        pages: lesson.pages,
        objectives: lesson.learningObjectives || [],
        unitId: unitId,
        subjectId: subjectId,
        contentType: formData.generationTarget,
        createdAt: serverTimestamp(),
        order: existingLessonCount + index,
      });
    });
    try {
      await batch.commit();
      showToast(`${previewData.generated_lessons.length} item(s) saved successfully!`, "success");
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save lessons.", "error");
    }
  };

  const resetState = () => {
    setFormData({ generationTarget: 'studentLesson', peacGenerationScope: 'byLesson', teacherGuideScope: 'byLesson', format: '5Es' });
    setContent(''); setContentStandard(''); setPerformanceStandard(''); setLearningCompetencies('');
    setLessonCount(1); setPagesPerLesson(5); setPlanPageCount(10); setSelectedSubjectId(''); setUnitsForSubject([]);
    setSelectedUnitId(''); setLessonsForUnit([]); setSelectedLessonId(''); setPreviewData(null); setExistingLessonCount(0);
    setExtraInstruction('');
  };

  const SelectorGroup = ({ title, value, onChange, options, disabled = false, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{title}:</label>
        <select value={value} onChange={onChange} className="w-full p-2 border rounded-md" disabled={!options.length || disabled}>
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.title}</option>)}
        </select>
    </div>
  );

  const isValidPreview = previewData && !previewData.error && Array.isArray(previewData.generated_lessons);

  return (
    <Dialog open={isOpen} onClose={() => { onClose(); resetState(); }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-black bg-opacity-30 z-[99]" />
      <Dialog.Panel className="relative bg-white p-6 rounded-lg shadow-lg z-[101] overflow-y-auto sm:max-w-3xl sm:mx-auto sm:max-h-[90vh] w-full">
          {isGenerating && <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50"><Spinner /></div>}
        <button type="button" className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-200" onClick={() => { onClose(); resetState(); }}>
          <XMarkIcon className="h-6 w-6 text-gray-600" />
        </button>
        <Dialog.Title className="text-xl font-bold mb-4 pr-12">AI Lesson Planner</Dialog.Title>

        {!previewData ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Generate For:</label>
              <select name="generationTarget" value={formData.generationTarget} onChange={handleChange} className="w-full p-2 border rounded-md">
                <option value="studentLesson">Lesson for Students</option>
                <option value="teacherGuide">Lesson Plan for Teachers</option>
                <option value="peacAtg">Adaptive Teaching Guide (PEAC)</option>
              </select>
            </div>
            
            {(formData.generationTarget === 'studentLesson' || formData.generationTarget === 'teacherGuide') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lesson Format:</label>
                  <select name="format" value={formData.format} onChange={handleChange} className="w-full p-2 border rounded-md" disabled={formData.generationTarget === 'peacAtg'}>
                      <option value="5Es">5Es</option>
                      <option value="4As">4As</option>
                      <option value="3Is">3Is</option>
                      <option value="AMT Model">AMT</option>
                      <option value="Gradual Release">Gradual Release</option>
                      <option value="Lecture">Standard Lecture</option>
                  </select>
                </div>
            )}
            
            {(formData.generationTarget === 'teacherGuide' || formData.generationTarget === 'peacAtg') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan Length (Approx. Pages/Sections):</label>
                  <input type="number" min="5" max="25" value={planPageCount} onChange={(e) => setPlanPageCount(Number(e.target.value))} className="w-full p-2 border rounded" />
                </div>
            )}

            {(formData.generationTarget === 'peacAtg' || formData.generationTarget === 'teacherGuide') && (
              <div className={`p-4 border-l-4 ${formData.generationTarget === 'peacAtg' ? 'border-indigo-500 bg-indigo-50' : 'border-green-500 bg-green-50'} rounded-r-lg space-y-4`}>
                <p className="text-sm font-semibold">Select Source Content (Student Lesson)</p>
                <div role="radiogroup">
                  <label className="block text-sm font-medium text-gray-700">Generate From:</label>
                  <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2"><input type="radio" name={`${formData.generationTarget}Scope`} value="byLesson" checked={(formData.generationTarget === 'peacAtg' ? formData.peacGenerationScope : formData.teacherGuideScope) === 'byLesson'} onChange={handleChange} /> A Single Lesson</label>
                      <label className="flex items-center gap-2"><input type="radio" name={`${formData.generationTarget}Scope`} value="byUnit" checked={(formData.generationTarget === 'peacAtg' ? formData.peacGenerationScope : formData.teacherGuideScope) === 'byUnit'} onChange={handleChange} /> An Entire Unit</label>
                  </div>
                </div>
                <SelectorGroup title="Source Subject" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedUnitId(''); setSelectedLessonId(''); }} options={allSubjects} placeholder="Select a Source Subject" />
                <SelectorGroup title="Source Unit" value={selectedUnitId} onChange={(e) => { setSelectedUnitId(e.target.value); setSelectedLessonId(''); }} options={unitsForSubject} placeholder="Select a Source Unit" disabled={!selectedSubjectId} />
                {(formData.generationTarget === 'peacAtg' ? formData.peacGenerationScope : formData.teacherGuideScope) === 'byLesson' && (
                    <SelectorGroup title="Source Lesson" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} options={lessonsForUnit} placeholder="Select a Source Lesson" disabled={!selectedUnitId} />
                )}
                <textarea placeholder="Learning Competencies (Required for Teacher Guides & ATG)" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className="w-full p-2 border rounded" rows={3} />
              </div>
            )}

            {formData.generationTarget === 'studentLesson' && (
              <>
                <textarea placeholder="Main Content / Topic..." value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border rounded" rows={4} />
                <textarea placeholder="Content Standard" value={contentStandard} onChange={(e) => setContentStandard(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                 <textarea placeholder="Learning Competencies" value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                <textarea placeholder="Performance Standard" value={performanceStandard} onChange={(e) => setPerformanceStandard(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Number of Lessons:</label>
                    <input type="number" min="1" max="10" value={lessonCount} onChange={(e) => setLessonCount(Number(e.target.value))} className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pages per Lesson:</label>
                    <input type="number" min="1" max="20" value={pagesPerLesson} onChange={(e) => setPagesPerLesson(Number(e.target.value))} className="w-full p-2 border rounded" />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <button onClick={() => handleGenerate()} disabled={isGenerating} className="btn-primary">
                {isGenerating ? 'Generating...' : 'Generate Content'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {isValidPreview ? (
              <>
                <h2 className="text-lg font-semibold">Preview: Generated Content</h2>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto border rounded-lg p-4">
                    {previewData.generated_lessons.map((lesson, index) => (
                        <div key={index}>
                            <h3 className="font-bold text-lg sticky top-0 bg-white py-2" style={{ whiteSpace: 'pre-wrap' }}>{lesson.lessonTitle}</h3>
                            {Array.isArray(lesson.pages) && lesson.pages.map((page, pageIndex) => <LessonPage key={pageIndex} page={page} />)}
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
            
            {isValidPreview && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Request Changes (Optional)</label>
                  <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="e.g., Make the introduction shorter, add another activity..." className="w-full border p-2 rounded" rows={2} />
                </div>
            )}
            
            <div className="flex justify-between items-center pt-4">
              <button onClick={() => setPreviewData(null)} disabled={isGenerating} className="btn-secondary">
                Back to Edit
              </button>
              <div className="flex gap-3">
                {isValidPreview && (
                    <button onClick={() => handleGenerate(extraInstruction)} disabled={isGenerating} className="btn-secondary">
                        {isGenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                )}
                {isValidPreview && <button onClick={handleSave} className="btn-primary">Accept & Save</button>}
              </div>
            </div>
          </div>
        )}
      </Dialog.Panel>
    </Dialog>
  );
}