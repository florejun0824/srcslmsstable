// AddLessonModal.js

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import {
    Dialog, DialogPanel, Title, Button, TextInput, Textarea, TabGroup, TabList, Tab, TabPanels, TabPanel
} from '@tremor/react';
import {
    DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, SparklesIcon,
    CheckCircleIcon, DocumentPlusIcon, ArrowUturnLeftIcon, PlusCircleIcon,
    TrashIcon, BookOpenIcon, PhotoIcon, VideoCameraIcon, Bars3Icon,
    CodeBracketIcon, LinkIcon, QueueListIcon, PaintBrushIcon, ChatBubbleLeftRightIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import mammoth from 'mammoth';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import LessonPage from './LessonPage';
import ContentRenderer from '../teacher/ContentRenderer';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set the worker source for pdfjs-dist in a Vite-compatible way
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;


const BoldIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} className="w-5 h-5">
      <path d="M7 5v14h7c2.21 0 4-1.79 4-4s-1.79-4-4-4h-4m4 0H7" />
    </svg>
);
const ItalicIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} className="w-5 h-5">
      <path d="M10 5l-4 14h3l4-14h-3z" />
    </svg>
);
const H1Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props} className="w-5 h-5">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold">H1</text>
    </svg>
);
const H2Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props} className="w-5 h-5">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold">H2</text>
    </svg>
);
const H3Icon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props} className="w-5 h-5">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold">H3</text>
    </svg>
);

const chunkText = (text, chunkSize = 8000) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
};

const sanitizeLessonsJson = (aiResponse, { lenient = true, debug = false } = {}) => {
  const dbg = (...args) => { if (debug) console.debug('[sanitizeLessonsJson]', ...args); };

  // Helpers
  const stripBom = (s) => s.replace(/^\uFEFF/, '');
  const stripMarkdownFences = (s) => s.replace(/```(?:json)?/gi, ''); // removes fences; we'll also remove remaining ticks later
  const normalizeSmartQuotes = (s) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const removeControlChars = (s) => s.replace(/[\u0000-\u001F]+/g, ' ');
  const removeComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n\r]*/g, '');
  const removeTrailingCommas = (s) => s.replace(/,\s*([}\]])/g, '$1');
  const fixBackslashes = (s) => s.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\'); // doubles invalid single backslashes

  // Find balanced JSON-like substrings (handles nested braces/brackets and quoted strings)
  function findBalancedCandidates(text) {
    const out = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch !== '{' && ch !== '[') continue;
      let stack = [ch];
      let inString = false;
      let quoteChar = null;

      for (let j = i + 1; j < text.length; j++) {
        const c = text[j];

        if (inString) {
          if (c === '\\') {
            j++; // skip escaped char
            continue;
          }
          if (c === quoteChar) {
            inString = false;
            quoteChar = null;
          }
          continue;
        } else {
          if (c === '"' || c === "'") {
            inString = true;
            quoteChar = c;
            continue;
          }
          if (c === '{' || c === '[') {
            stack.push(c);
            continue;
          }
          if (c === '}' || c === ']') {
            const top = stack.pop();
            if (!top) break; // mismatch
            if ((top === '{' && c !== '}') || (top === '[' && c !== ']')) break; // mismatch
            if (stack.length === 0) {
              out.push(text.slice(i, j + 1));
              i = j; // advance outer pointer to skip over this block
              break;
            }
          }
        }
      }
    }
    return out;
  }

  // Try JSON.parse with progressive repairs
  function tryParseWithRepairs(candidate) {
    // Attempt direct parse first
    try {
      return { parsed: JSON.parse(candidate), repaired: false, finalString: candidate };
    } catch (e) {
      dbg('direct parse failed, will attempt repairs');
    }

    // Repair passes (applied cumulatively)
    let s = candidate;
    const repairs = [];
    // 1: normalize smart quotes
    s = normalizeSmartQuotes(s);
    repairs.push('smart-quotes');
    // 2: remove Markdown triple-backticks just in case
    s = stripMarkdownFences(s);
    repairs.push('md-fences');
    // 3: remove C-style comments and // comments
    s = removeComments(s);
    repairs.push('comments-removed');
    // 4: fix invalid backslashes
    s = fixBackslashes(s);
    repairs.push('backslashes-fixed');
    // 5: remove trailing commas in objects/arrays
    s = removeTrailingCommas(s);
    repairs.push('trailing-commas-removed');
    // 6: remove control chars
    s = removeControlChars(s);
    repairs.push('control-chars-removed');

    // One more try
    try {
      return { parsed: JSON.parse(s), repaired: repairs, finalString: s };
    } catch (e2) {
      dbg('repairs failed to parse candidate:', repairs, e2);
      return { parsed: null, repaired: repairs, finalString: s, error: e2 };
    }
  }

  // Recursively search for a lessons array in an object
  function findLessonsRecursively(obj, seen = new Set()) {
    if (!obj || typeof obj !== 'object') return null;
    if (seen.has(obj)) return null;
    seen.add(obj);

    if (Array.isArray(obj.lessons) && obj.lessons.length > 0) return obj.lessons;
    // common alternate keys
    for (const altKey of ['data', 'items', 'content', 'results']) {
      if (Array.isArray(obj[altKey]) && obj[altKey].length > 0) {
        // heuristic: check if items look like lessons
        const sample = obj[altKey][0];
        if (sample && typeof sample === 'object' && (sample.title || sample.lessonTitle || sample.pages)) {
          return obj[altKey];
        }
      }
    }

    for (const k of Object.keys(obj)) {
      try {
        const v = obj[k];
        const found = findLessonsRecursively(v, seen);
        if (found) return found;
      } catch (err) {
        // ignore
      }
    }
    return null;
  }

  // Heuristic: find the first array of objects that looks like lessons (title/pages)
  function findLessonLikeArray(obj, seen = new Set()) {
    if (!obj || typeof obj !== 'object') return null;
    if (seen.has(obj)) return null;
    seen.add(obj);

    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
        // check if elements have lesson-like keys
        const sample = v[0];
        if (sample.title || sample.lessonTitle || sample.pages || sample.learningObjectives) return v;
      }
      if (typeof v === 'object') {
        const nested = findLessonLikeArray(v, seen);
        if (nested) return nested;
      }
    }
    return null;
  }

  // Normalize learningObjectives: accept string, array, or bullet list text
  function normalizeObjectives(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(x => (typeof x === 'string' ? x.trim() : (x && x.text ? String(x.text).trim() : null))).filter(Boolean);
    }
    if (typeof raw === 'string') {
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      // drop heading lines like "Learning Objectives:"
      const cleaned = lines.map(l => l.replace(/^[-*•\d\.\)\s]+/, '').trim()).filter(Boolean);
      return cleaned.length ? cleaned : [raw.trim()];
    }
    return [];
  }

  // Normalize a single page object
  function normalizePage(rawPage, pageIdx) {
    if (!rawPage) return { title: `Page ${pageIdx + 1}`, type: 'text', content: '' };

    // If page is a plain string, make it a text page
    if (typeof rawPage === 'string') {
      return { title: `Page ${pageIdx + 1}`, type: 'text', content: rawPage };
    }

    // Extract title-like fields
    const title = (rawPage.title || rawPage.heading || rawPage.pageTitle || rawPage.name || `Page ${pageIdx + 1}`);
    let type = rawPage.type || rawPage.kind || 'text';

    let content = rawPage.content ?? rawPage.body ?? rawPage.text ?? '';

    // If content looks like an object serialized into a string, try parse
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          content = JSON.parse(trimmed);
        } catch (e) {
          // attempt cleaned parse
          try {
            const repaired = removeComments(normalizeSmartQuotes(trimmed));
            const repaired2 = fixBackslashes(removeTrailingCommas(removeControlChars(repaired)));
            content = JSON.parse(repaired2);
          } catch (e2) {
            // leave content as string if still unparseable
            dbg('page.content string looks JSON but unable to parse; leaving raw string.');
          }
        }
      }
    }

    // If content is object with imageUrls or htmlContent, force diagram-data
    if (typeof content === 'object' && (content.imageUrls || content.htmlContent || content.labels)) {
      type = 'diagram-data';
    }

    // Normalize imageUrls if comma-separated string
    if (type === 'diagram-data' && typeof content === 'object') {
      if (typeof content.imageUrls === 'string') {
        content.imageUrls = content.imageUrls.split(',').map(u => u.trim()).filter(Boolean);
      } else if (!Array.isArray(content.imageUrls)) {
        content.imageUrls = [];
      }
      if (!Array.isArray(content.labels)) content.labels = [];
      // ensure htmlContent is a string or undefined
      if (content.htmlContent && typeof content.htmlContent !== 'string') {
        content.htmlContent = String(content.htmlContent);
      }
    }

    return { title: String(title), type: String(type), content: (content === undefined ? '' : content) };
  }

  // Normalize lesson object
  function normalizeLesson(rawLesson, idx) {
    // If a lesson is just a string, make it a single-page lesson
    if (typeof rawLesson === 'string') {
      return {
        lessonTitle: `Untitled Lesson ${idx + 1}`,
        learningObjectives: [],
        pages: [{ title: 'Content', type: 'text', content: rawLesson }],
      };
    }

    const lessonTitle = rawLesson.lessonTitle || rawLesson.title || rawLesson.name || `Untitled Lesson ${idx + 1}`;
    const learningObjectives = normalizeObjectives(rawLesson.learningObjectives ?? rawLesson.objectives ?? rawLesson.learningTargets ?? rawLesson.targets);

    // pages could be array, a single object, or text
    let pagesRaw = rawLesson.pages ?? rawLesson.contentPages ?? rawLesson.sections ?? null;

    if (!pagesRaw) {
      // maybe the lesson has a single "content" field
      if (rawLesson.content || rawLesson.body || rawLesson.text) {
        pagesRaw = [{ title: 'Content', content: rawLesson.content ?? rawLesson.body ?? rawLesson.text }];
      } else {
        pagesRaw = []; // will create defaults below
      }
    }

    if (!Array.isArray(pagesRaw) && pagesRaw && typeof pagesRaw === 'object') {
      // Sometimes AI returns an object of pages keyed by numbers - convert to array
      pagesRaw = Object.values(pagesRaw);
    }

    const pages = (Array.isArray(pagesRaw) ? pagesRaw : []).map((p, i) => normalizePage(p, i)).filter(Boolean);

    // If there are zero pages but the lesson has a 'content' string, add it
    if (pages.length === 0 && rawLesson.content && typeof rawLesson.content === 'string') {
      pages.push({ title: 'Content', type: 'text', content: rawLesson.content });
    }

    // If still no pages, create a placeholder page
    if (pages.length === 0) {
      pages.push({ title: 'Page 1', type: 'text', content: '' });
    }

    return {
      lessonTitle: String(lessonTitle),
      learningObjectives,
      pages,
    };
  }

  // Start of main routine
  if (!aiResponse || typeof aiResponse !== 'string') {
    throw new Error('sanitizeLessonsJson expects the AI response as a string.');
  }

  let raw = String(aiResponse);
  raw = stripBom(raw);
  raw = normalizeSmartQuotes(raw);
  raw = stripMarkdownFences(raw); // remove triple-backticks markers
  raw = raw.trim();

  dbg('initial raw preview:', raw.slice(0, 400));

  // Find candidate JSON substrings
  let candidates = findBalancedCandidates(raw);

  // If nothing found, fallback to the whole string (maybe it's pure JSON but with weird wrappers)
  if (!candidates || candidates.length === 0) {
    dbg('no balanced candidates found, attempting to treat full string as candidate');
    candidates = [raw];
  } else {
    dbg('found', candidates.length, 'candidates; using them to attempt parse');
  }

  const parseResults = [];

  for (const candidate of candidates) {
    // try direct and repaired parse
    const res = tryParseWithRepairs(candidate);
    if (res.parsed) {
      parseResults.push({ parsed: res.parsed, repaired: res.repaired, finalString: res.finalString });
    } else {
      dbg('candidate could not be parsed even with repairs');
    }
  }

  if (parseResults.length === 0) {
    // final attempt: try a last-ditch cleanup on the whole raw text and parse
    dbg('no successful parse yet; attempting last-ditch cleanup on full response');
    let last = raw;
    last = removeComments(last);
    last = fixBackslashes(last);
    last = removeTrailingCommas(last);
    last = removeControlChars(last);
    try {
      const parsed = JSON.parse(last);
      parseResults.push({ parsed, repaired: 'last-ditch', finalString: last });
    } catch (err) {
      dbg('last-ditch parse failed', err);
    }
  }

  if (parseResults.length === 0) {
    console.error('sanitizeLessonsJson: no parseable JSON found. preview:', raw.slice(0, 500));
    throw new Error('The AI returned no parseable JSON. Check console for a preview.');
  }

  // Choose the best parsed result by heuristic (prefer object with lessons array, then array, then others)
  let best = null;
  let bestScore = -Infinity;

  for (const r of parseResults) {
    const p = r.parsed;
    let score = 0;
    if (p && typeof p === 'object') {
      if (Array.isArray(p)) score += 900;
      if (p.lessons && Array.isArray(p.lessons)) score += 1000 + p.lessons.length;
      // nested search
      const nestedLessons = findLessonsRecursively(p);
      if (nestedLessons) score += 800 + nestedLessons.length;
      // check if object itself looks like an array-of-lessons wrapped as object
      const possibleArray = findLessonLikeArray(p);
      if (possibleArray) score += 700 + possibleArray.length;
      // minor boost if it has typical keys
      if (p.unit || p.unitOverview || p.learningTargets) score += 50;
    }
    if (score > bestScore) { bestScore = score; best = r; }
  }

  dbg('chosen parse result with score', bestScore, 'repaired:', best.repaired);

  let parsed = best.parsed;

  // If parsed is an array (root is lessons array), wrap it
  if (Array.isArray(parsed)) {
    dbg('root is array; wrapping as { lessons: parsed }');
    parsed = { lessons: parsed };
  }

  // If there is no lessons[], search recursively
  if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
    const nested = findLessonsRecursively(parsed);
    if (nested) {
      dbg('found nested lessons array');
      parsed = { lessons: nested };
    } else {
      // search for lesson-like array heuristically
      const heuristic = findLessonLikeArray(parsed);
      if (heuristic) {
        dbg('found heuristic lesson-like array, using it as lessons');
        parsed = { lessons: heuristic };
      }
    }
  }

  if (!parsed.lessons || !Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
    // If we get here still nothing, and lenient is true, attempt to find any object with pages -> transform to single lesson per object (best-effort)
    if (lenient) {
      dbg('no lessons array; trying lenient recovery by scanning for objects that look like lessons');
      const recovered = [];
      function scanForLessonObjects(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          for (const x of obj) scanForLessonObjects(x);
          return;
        }
        // object that has pages or a title or content
        if ((obj.pages && Array.isArray(obj.pages)) || obj.title || obj.lessonTitle || obj.content) {
          recovered.push(obj);
        } else {
          for (const k of Object.keys(obj)) {
            try { scanForLessonObjects(obj[k]); } catch (e) {}
          }
        }
      }
      scanForLessonObjects(best.parsed);
      if (recovered.length > 0) {
        parsed = { lessons: recovered };
      }
    }

    if (!parsed.lessons || !Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
      console.error('sanitizeLessonsJson: unable to locate lessons array after all recovery attempts. preview:', best.finalString.slice(0, 500));
      throw new Error('The AI returned JSON but no lesson-like array could be recovered.');
    }
  }

  // At this point we have parsed.lessons as an array (hopefully)
  const rawLessons = parsed.lessons;

  // Normalize each lesson; keep partially valid lessons (do not hard-fail) unless there are zero final lessons
  const sanitized = [];
  for (let i = 0; i < rawLessons.length; i++) {
    try {
      const normalized = normalizeLesson(rawLessons[i], i);
      // Drop trivial empty lessons (no pages & empty title) when lenient
      if (!normalized.lessonTitle && (!normalized.pages || normalized.pages.length === 0)) {
        if (!lenient) throw new Error('Empty lesson');
        continue;
      }
      sanitized.push(normalized);
    } catch (err) {
      dbg(`skipping malformed lesson at index ${i}:`, err);
      if (!lenient) throw err;
    }
  }

  if (!sanitized || sanitized.length === 0) {
    throw new Error('No usable lessons could be recovered from AI response.');
  }

  dbg('sanitization complete; returning', sanitized.length, 'lesson(s)');
  return sanitized;
};


const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

function ModeSelection({ onSelect }) {
  return (
    <>
      <Title className="text-2xl font-bold text-slate-800 text-center">
        How would you like to create a lesson?
      </Title>
      <p className="mt-2 text-center text-slate-500">
        Choose to generate lessons automatically with AI or build them from scratch.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('ai')}
          className="group flex flex-col items-center justify-center p-8 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200"
        >
          <SparklesIcon className="h-12 w-12 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <h3 className="mt-4 text-lg font-semibold text-slate-800">Generate with AI</h3>
          <p className="mt-1 text-sm text-slate-500 text-center">
            Upload a document (PDF, DOCX) and let AI structure it into lessons.
          </p>
        </button>
        <button
          onClick={() => onSelect('manual')}
          className="group flex flex-col items-center justify-center p-8 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all duration-200"
        >
          <DocumentPlusIcon className="h-12 w-12 text-slate-400 group-hover:text-teal-600 transition-colors" />
          <h3 className="mt-4 text-lg font-semibold text-slate-800">Create Manually</h3>
          <p className="mt-1 text-sm text-slate-500 text-center">
            Build your own lesson page by page with our editor.
          </p>
        </button>
      </div>
    </>
  );
}

function AiLessonGenerator({ onClose, onBack, unitId, subjectId }) {
    const [file, setFile] = useState(null);
    const [previewLessons, setPreviewLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);
    
    const [subjectContext, setSubjectContext] = useState(null);
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());
    const [existingLessonCount, setExistingLessonCount] = useState(0);

    useEffect(() => {
        if (subjectId) {
            const fetchFullSubjectContext = async () => {
                try {
                    const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    const unitsData = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    setSubjectContext({ units: unitsData, lessons: lessonsData });
                } catch (error) {
                    console.error("Error fetching subject context:", error);
                    setError("Could not scan existing subject content.");
                }
            };
            fetchFullSubjectContext();
        }
    }, [subjectId]);

    useEffect(() => {
        if (unitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [unitId]);

    const scaffoldInfo = useMemo(() => {
        if (scaffoldLessonIds.size === 0 || !subjectContext) return { summary: '' };
        const relevantScaffoldLessons = subjectContext.lessons.filter(lesson => scaffoldLessonIds.has(lesson.id));
        const summary = relevantScaffoldLessons.map(lesson => {
            const pageContentSample = lesson.pages.map(p => p.content).join(' ').substring(0, 200);
            return `- Lesson Title: "${lesson.title}"\n  - Key Concepts/Activities Summary: ${pageContentSample}...`;
        }).join('\n');
        return { summary };
    }, [scaffoldLessonIds, subjectContext]);

    const handleToggleUnitExpansion = (unitId) => {
        const newSet = new Set(expandedScaffoldUnits);
        if (newSet.has(unitId)) newSet.delete(unitId);
        else newSet.add(unitId);
        setExpandedScaffoldUnits(newSet);
    };

    const handleUnitCheckboxChange = (lessonsInUnit) => {
        const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
        const currentlySelectedInUnit = lessonIdsInUnit.filter(id => scaffoldLessonIds.has(id));
        const newSet = new Set(scaffoldLessonIds);
        if (currentlySelectedInUnit.length === lessonIdsInUnit.length) {
            lessonIdsInUnit.forEach(id => newSet.delete(id));
        } else {
            lessonIdsInUnit.forEach(id => newSet.add(id));
        }
        setScaffoldLessonIds(newSet);
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
            setPreviewLessons([]);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreviewLessons([]);
    };

    const extractTextFromFile = async (fileToProcess) => {
        if (fileToProcess.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item) => item.str).join(' ') + '\n';
            }
            return text;
        } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await fileToProcess.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } else if (fileToProcess.type === 'text/plain') {
            return await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }
    };

    const handleGenerateLesson = async () => {
        if (!file) {
            setError('Please upload a file first.');
            return;
        }
        setIsProcessing(true);
        setError('');
        setPreviewLessons([]);

        try {
            setProgressMessage('Step 1 of 3: Reading and extracting text...');
            const extractedText = await extractTextFromFile(file);

            setProgressMessage('Step 2 of 3: Processing document with AI...');
            const textChunks = chunkText(extractedText);
            const processingPromises = textChunks.map((chunk) => {
                const chunkPrompt = `Paraphrase and rewrite the following text to be clear, concise, and original, while preserving its educational meaning. Use Markdown for formatting. Do not add titles, just return the processed text. RAW TEXT: ${chunk}`;
                return callGeminiWithLimitCheck(chunkPrompt);
            });
            const processedChunks = await Promise.all(processingPromises);
            const combinedText = processedChunks.join('\n\n');
            
            setProgressMessage('Step 3 of 3: Structuring final lessons...');

            let existingSubjectContextString = "No other lessons exist yet.";
            if (subjectContext && subjectContext.lessons.length > 0) {
                existingSubjectContextString = subjectContext.units
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(unit => {
                        const lessonsInUnit = subjectContext.lessons
                            .filter(lesson => lesson.unitId === unit.id)
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map(lesson => `  - Lesson: ${lesson.title}`)
                            .join('\n');
                        return `Unit: ${unit.title}\n${lessonsInUnit}`;
                    }).join('\n\n');
            }

            const scaffoldingInstruction = `
            **PRIMARY ANALYSIS TASK (NON-NEGOTIABLE):** Before generating anything, you MUST act as a curriculum continuity expert. Your most critical task is to meticulously analyze all the provided context below to prevent any topical repetition.

            ---
            ### CONTEXT: PREVIOUSLY COVERED MATERIAL
            This section contains all topics from lessons that already exist. You are strictly forbidden from re-teaching these specific concepts.

            **1. User-Selected Prerequisite Lessons:**
            ${scaffoldInfo.summary || "No specific prerequisite lessons were selected."}

            **2. Other Lessons Existing in this Subject:**
            ${existingSubjectContextString}
            ---

            ### YOUR GENERATION RULES (ABSOLUTE)
            1.  **DO NOT REPEAT:** You are strictly forbidden from creating a lesson, activity, or assessment question that covers the same learning objectives or keywords mentioned in the context above.
            2.  **IDENTIFY THE GAP:** Your new lesson(s) must address a logical "next step" or a knowledge gap that is not covered by the existing material. The new lessons MUST start from Lesson number ${existingLessonCount + 1}.
            3.  **BUILD A BRIDGE:** If appropriate, your introduction should briefly reference a concept from a prerequisite lesson to create a smooth transition, but it must immediately move into new material.
            `;
            
	        const finalPrompt = `
	        You are an expert curriculum designer and bestselling textbook author. 
	        ${scaffoldingInstruction}

	        Take the processed text and structure it into a **unit with lessons**, following the NON-NEGOTIABLE textbook chapter sequence.

	        =============================
	        STRICT LESSON STRUCTURE
	        =============================
	        1. **Unit Overview** - ONLY contains:  
	             • Overview of the unit (short, 1–2 paragraphs).  
	             • Learning Targets (clear bullet points).  
	           - Nothing else.  
	           - IMPORTANT: The Unit Overview MUST NEVER be numbered. Do not call it Lesson 0 or Lesson 1. Always exactly "Unit Overview".
	        2. **Learning Objectives** - For every lesson, you MUST populate the \`learningObjectives\` array in the JSON with specific, measurable, and student-friendly objectives.  
	           - CRITICAL: You MUST NOT create a separate page titled "Learning Objectives"; the array is the only place they should appear.
	        3. **Engaging Introduction** - MUST NOT use "Engaging Introduction" as the page title.  
	           - Instead, give it a **thematic, captivating subheader title** (e.g., "Why Water Shapes Our World", "The Hidden Power of Atoms").  
	           - Content must hook attention with a story, real-world example, or surprising fact.  
	           - Tone: engaging, inspiring, but scholarly.  
	           - Always exactly one page.
	        4. **Introductory Activity ("Let's Get Started")** - A short warm-up activity.  
	           - Interactive but simple (e.g., quick brainstorm, matching, or short scenario).  
	           - The \`title\` MUST be exactly "Let's Get Started".
	        5. **Core Content Sections** - DO NOT limit to a single page.  
	           - Break into **multiple subpages**, each with its own unique \`title\` (a subheader).  
	           - Example subpage titles:  
	             • "The Early Stages of the Water Cycle"  
	             • "Evaporation and Condensation"  
	             • "Precipitation and Collection"  
	           - Each subpage must:  
	             • Have a clear, meaningful title.  
	             • Contain detail-rich explanations with examples, analogies, or visuals.  
	           - Flow must be logical across subpages.  
	           - This is the body of the textbook chapter.
	        6. **Check for Understanding ("Check for Understanding")** - One short formative activity with 3–4 concept questions or problems.  
	           - Reinforces key knowledge.  
	           - The \`title\` MUST be exactly "Check for Understanding".
	        7. **Summary ("Lesson Summary")** - Concise recap of the most important points.  
	           - Bullet points or short narrative.  
	           - The \`title\` MUST be exactly "Lesson Summary".
	        8. **Conclusion ("Wrap Up")** - Motivational, inspiring closure.  
	           - Ties lesson back to the big picture.  
	           - The \`title\` MUST be exactly "Wrap Up".
	        9. **Assessment ("End of Lesson Assessment")** - 8–10 questions total.  
	           - Mix of multiple-choice, short-answer, and application questions.  
	           - Questions must align with learning objectives.  
	           - The first page's \`title\` MUST be "End of Lesson Assessment".
	        10. **Answer Key ("Answer Key")** - Provide clear answers to all assessment questions.  
	            - Use the same numbering order as the assessment.  
	            - The \`title\` MUST be exactly "Answer Key".
	        11. **References ("References")** - The absolute last page.  
	            - Academic-style reference list.  
	            - Includes both the uploaded file (if applicable) and additional credible references.  
	            - The \`title\` MUST be exactly "References".
   
	        =============================
	        STYLE & OUTPUT RULES
	        =============================
	        - Lesson Titles: MUST NOT copy directly from the source file.  
	          • Always rephrase into **original, student-friendly, engaging titles**.  
	        - Table of Contents Handling:  
	          • If the source text includes a clear "Table of Contents", the lesson/page structure MUST follow the order of topics listed there.  
	          • If the source text does NOT include a TOC, generate exactly ONE lesson, following the full textbook structure above.
			
	        **CRITICAL QUOTE ESCAPING (NON-NEGOTIABLE):**
	        - Any double quotes (") used inside a string value (like in "content" or "title") MUST be escaped with a backslash (\\").
	        - **CORRECT EXAMPLE:** \`"content": "He said, \\"This is the correct way.\\""\`
	        - **INCORRECT EXAMPLE:** \`"content": "He said, "This is the incorrect way.""\`

	        **CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
	        - You MUST use LaTeX for all mathematical equations, variables, and chemical formulas.
	        - For INLINE formulas, use single dollar signs: $H_2O$.
	        - For BLOCK formulas, use double dollar signs: $$E = mc^2$$
	        - CRITICAL LATEX ESCAPING IN JSON: Every backslash \`\\\` in LaTeX MUST be escaped with a second backslash. So, \`\\\` becomes \`\\\\\`.
	        - For angle measurements, you MUST use the \`\\degree\` command, like so: $90\\\\degree$.

	        **5. Diagrams and Figures**
	        - If a diagram/figure is detected, you may recreate it as a clean SVG.
	        - **CRITICAL SVG ESCAPING:** Inside the \`htmlContent\` string for SVGs, all double quotes (\`"\`) MUST be escaped with a backslash (\`\\\\"\`).

	        - Persona: authoritative professor + bestselling author.  
	        - Writing style: detail-rich, interactive, narrative-driven.  
   
	        **CRITICAL STYLE RULE:** You MUST use **pure Markdown only**. You MUST NOT use any raw HTML tags like \`<div>\`, \`<span>\`, or \`<h3>\`. The renderer will handle all styling.
	          • For **headings**, use Markdown hashes (e.g., \`### Complementary Angles\`).
	          • For **key terms**, you MUST make them bold with asterisks (e.g., \`**complementary**\`).
	          • For **callouts, notes, or tips**, you MUST use Markdown blockquotes (\`>\`).
	          • For **inline code, technical terms, or short quoted phrases**, you MUST use Markdown's backticks (\`\`). Do NOT use double quotes for this purpose.
	             - **CORRECT:** The Latin phrase is \`per centum\`.
	             - **INCORRECT:** The Latin phrase is "per centum".
	          • **Example for a Tip:**
	            \`> **Tip:** To find the complement of any given angle, subtract its measure from $90\\degree$.\`
   
	        =============================
	        JSON OUTPUT FORMAT
	        =============================
	        {
	          "lessons": [
	            {
	              "lessonTitle": "Unit Overview",
	              "pages": [
	                { "title": "Overview", "content": "..." },
	                { "title": "Learning Targets", "content": "..." }
	              ]
	            },
	            {
	              "lessonTitle": "Lesson ${existingLessonCount + 1}: How Plants Turn Sunlight into Food",
	              "learningObjectives": [
	                "Explain how photosynthesis works",
	                "Identify the role of chlorophyll in the process"
	              ],
	              "pages": [
	                { "title": "Why Plants Are Nature's Solar Panels", "content": "Engaging intro..." },
	                { "title": "Let's Get Started", "content": "..." },
	                { "title": "Capturing Sunlight", "content": "..." },
	                { "title": "Making Glucose", "content": "..." },
	                { "title": "Check for Understanding", "content": "..." },
	                { "title": "Lesson Summary", "content": "..." },
	                { "title": "Wrap Up", "content": "..." },
	                { "title": "End of Lesson Assessment", "content": "..." },
	                { "title": "Answer Key", "content": "..." },
	                { "title": "References", "content": "..." }
	              ]
	            }
	          ]
	        }

	        =============================
	        TEXT TO PROCESS
	        =============================
	        ${combinedText}
	        `;

	        const aiResponse = await callGeminiWithLimitCheck(finalPrompt);
	        const lessonsArray = sanitizeLessonsJson(aiResponse);

	        let lessonCounter = existingLessonCount + 1;
	        const numberedLessons = lessonsArray.map((lesson) => {
	            if (lesson.lessonTitle.toLowerCase().includes('unit overview')) {
	                return { ...lesson, lessonTitle: 'Unit Overview' };
	            }
	            const baseTitle = lesson.lessonTitle.replace(/^Lesson\s*\d*:\s*/i, '');
                const newTitle = `Lesson ${lessonCounter}: ${baseTitle}`;
	            lessonCounter++;
	            return { ...lesson, lessonTitle: newTitle };
	        });

	        setPreviewLessons(numberedLessons);
	        setSelectedLessonIndex(0);
	        setSelectedPageIndex(0);

        } catch (err) {
            console.error('Lesson generation error:', err);
            setError(err.message.includes('overloaded')
                ? 'The AI service is currently busy. Please try again in a moment.'
                : 'The AI returned an invalid response. Please try regenerating.'
            );
        } finally {
            setIsProcessing(false);
            setProgressMessage('');
        }
    };
    
    const handleSaveLesson = async () => {
        if (previewLessons.length === 0 || !unitId || !subjectId) {
            setError('Cannot save without generated lessons and unit context.');
            return;
        }
        setSaving(true);
        try {
            const savePromises = previewLessons.map((lesson, index) =>
                addDoc(collection(db, 'lessons'), {
                    title: lesson.lessonTitle,
                    unitId,
                    subjectId,
                    pages: lesson.pages,
                    objectives: lesson.learningObjectives || [],
                    contentType: "studentLesson",
                    createdAt: serverTimestamp(),
                    order: existingLessonCount + index,
                })
            );
            await Promise.all(savePromises);
            onClose();
        } catch (err) {
            console.error('Error saving lessons: ', err);
            setError('Failed to save one or more lessons.');
        } finally {
            setSaving(false);
        }
    };

    const selectedLesson = previewLessons[selectedLessonIndex];
    const selectedPage = selectedLesson?.pages[selectedPageIndex];

    const objectivesAsMarkdown = useMemo(() => {
        if (!selectedLesson?.learningObjectives?.length) {
            return null;
        }
        return selectedLesson.learningObjectives.map(obj => `* ${obj}`).join('\n');
    }, [selectedLesson]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 pb-4 border-b border-slate-900/10">
                <div className="flex justify-between items-center mb-2">
                    <Title className="text-2xl font-bold text-slate-800">Generate with AI</Title>
                    <Button variant="light" icon={ArrowUturnLeftIcon} onClick={onBack} className="rounded-xl">Back</Button>
                </div>
                 <p className="text-slate-500">
                    Upload a document (PDF, DOCX, TXT) and AI will structure it into a full unit.
                </p>
            </div>

            <div className="flex-grow pt-4 overflow-hidden flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                    {isProcessing ? (
                        <div className="w-full flex-grow flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-200/50">
                            <p className="text-sm font-semibold text-slate-700">{progressMessage}</p>
                            <div className="mt-3 h-2 w-full bg-slate-300/50 rounded-full overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    ) : (
                        !file ? (
                            <label htmlFor="file-upload" className="relative flex-grow block w-full rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-indigo-400 cursor-pointer transition-colors duration-300 bg-slate-200/30">
                                <div className="flex flex-col items-center justify-center h-full">
                                    <DocumentArrowUpIcon className="mx-auto h-16 w-16 text-slate-400" />
                                    <span className="mt-4 block text-sm font-semibold text-slate-700">
                                        Click to upload or drag & drop
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500">
                                        PDF, DOCX, or TXT
                                    </span>
                                </div>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="relative w-full flex-grow rounded-2xl border border-slate-300/70 bg-white/60 p-4 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-4">
                                    <DocumentTextIcon className="h-12 w-12 text-indigo-600 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="truncate font-semibold text-slate-800">{file.name}</p>
                                        <p className="text-sm text-slate-500">{Math.round(file.size / 1024)} KB</p>
                                    </div>
                                </div>
                                <button onClick={removeFile} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-200/80 transition-colors">
                                    <XMarkIcon className="h-5 w-5 text-slate-500" />
                                </button>
                            </div>
                        )
                    )}

                    <div className="space-y-2">
                        <h3 className="text-base font-semibold text-slate-700">Scaffolding (Optional)</h3>
                        <div className="bg-white/60 p-3 rounded-xl max-h-[18rem] overflow-y-auto border border-slate-300/70">
                            <p className="text-xs text-slate-500 mb-3">Explicitly select lessons for the AI to build upon.</p>
                            {subjectContext && subjectContext.units.length > 0 ? (
                                subjectContext.units
                                    .slice()
                                    .sort((a, b) => {
                                        const getUnitNumber = (title) => {
                                            if (!title) return Infinity;
                                            const match = title.match(/\d+/);
                                            return match ? parseInt(match[0], 10) : Infinity;
                                        };
                                        const numA = getUnitNumber(a.title);
                                        const numB = getUnitNumber(b.title);
                                        if (numA === numB) {
                                            return a.title.localeCompare(b.title);
                                        }
                                        return numA - numB;
                                    })
                                    .map(unit => {
                                    const lessonsInUnit = subjectContext.lessons.filter(lesson => lesson.unitId === unit.id);
                                    if (lessonsInUnit.length === 0) return null;

                                    const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                    const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                    const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                    const isExpanded = expandedScaffoldUnits.has(unit.id);

                                    return (
                                        <div key={unit.id} className="pt-2 first:pt-0">
                                            <div className="flex items-center bg-slate-100 p-2 rounded-md">
                                                <button onClick={() => handleToggleUnitExpansion(unit.id)} className="p-1">
                                                    <ChevronRightIcon className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                                <input
                                                    type="checkbox"
                                                    id={`scaffold-unit-${unit.id}`}
                                                    checked={isAllSelected}
                                                    ref={el => { if(el) el.indeterminate = isPartiallySelected; }}
                                                    onChange={() => handleUnitCheckboxChange(lessonsInUnit)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                                                />
                                                <label htmlFor={`scaffold-unit-${unit.id}`} className="ml-2 flex-1 text-sm font-semibold text-slate-700 cursor-pointer">
                                                    {unit.title}
                                                </label>
                                            </div>

                                            {isExpanded && (
                                                <div className="pl-6 pt-2 space-y-2">
                                                    {lessonsInUnit.map(lesson => (
                                                        <div key={lesson.id} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={`scaffold-lesson-${lesson.id}`}
                                                                checked={scaffoldLessonIds.has(lesson.id)}
                                                                onChange={() => {
                                                                    const newSet = new Set(scaffoldLessonIds);
                                                                    if (newSet.has(lesson.id)) newSet.delete(lesson.id);
                                                                    else newSet.add(lesson.id);
                                                                    setScaffoldLessonIds(newSet);
                                                                }}
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-slate-800">
                                                                {lesson.title}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-slate-400">Scanning subject content...</p>
                            )}
                        </div>
                    </div>

                    <Button onClick={handleGenerateLesson} disabled={!file || isProcessing} size="lg" className="w-full justify-center font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg hover:shadow-indigo-500/40 transition-shadow rounded-xl mt-auto" icon={SparklesIcon}>
                        {previewLessons.length > 0 ? 'Regenerate Lessons' : 'Generate Lessons'}
                    </Button>
                </div>
                
                <div className="w-full md:w-2/3 flex flex-col bg-slate-200/50 rounded-2xl p-3 overflow-hidden">
                    {previewLessons.length > 0 ? (
                        <div className="flex-grow flex flex-col md:flex-row gap-3 overflow-hidden">
                            <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col">
                                <h4 className="p-2 text-sm font-semibold text-slate-600">Generated Lessons</h4>
                                <div className="flex-grow overflow-y-auto pr-1 space-y-1.5">
                                    {previewLessons.map((lesson, index) => (
                                        <button key={index} onClick={() => { setSelectedLessonIndex(index); setSelectedPageIndex(0); }} className={`w-full text-left p-3 rounded-xl transition-all duration-300 ${selectedLessonIndex === index ? 'bg-white shadow-lg ring-2 ring-indigo-500/50' : 'bg-white/60 hover:bg-white/90 hover:shadow-md'}`}>
                                            <span className="font-semibold text-slate-800">{lesson.lessonTitle}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
								  <div className="w-full md:w-2/3 flex-grow bg-white/80 rounded-xl flex flex-col overflow-hidden border border-white/50 min-h-0">
								    {selectedLesson && (
								      <>
								        {/* Header: lesson title + objectives + page tabs */}
								        <div className="flex-shrink-0 p-4 border-b border-slate-900/10">
								          <h3 className="text-lg font-bold text-slate-900 truncate">
								            {selectedLesson.lessonTitle}
								          </h3>

								          {objectivesAsMarkdown && (
								            <div className="my-2 p-3 bg-indigo-50 border-l-4 border-indigo-300 rounded-r-lg">
								              <p className="font-semibold mb-1 text-indigo-900">
								                Learning Objectives
								              </p>
								              <div className="prose prose-sm max-w-none prose-indigo text-indigo-800">
								                <ContentRenderer text={objectivesAsMarkdown} />
								              </div>
								            </div>
								          )}

								          <div className="flex space-x-2 mt-2 -mb-2 pb-2 overflow-x-auto">
								            {selectedLesson.pages.map((page, index) => (
								              <button
								                key={index}
								                onClick={() => setSelectedPageIndex(index)}
								                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
								                  selectedPageIndex === index
								                    ? "bg-indigo-600 text-white"
								                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
								                }`}
								              >
								                {page.title}
								              </button>
								            ))}
								          </div>
								        </div>

								        {/* Scrollable content area */}
								        <div className="flex-grow min-h-0 overflow-y-auto p-6">
								          <div className="prose max-w-none prose-slate">
								            {selectedPage ? (
								              <LessonPage page={selectedPage} isEditable={false} />
								            ) : (
								              <p>Select a page to view its content.</p>
								            )}
								          </div>
								        </div>
								      </>
								    )}
								  </div>
                       
                        </div>
                    ) : (
                        <div className="m-auto text-center">
                            <DocumentTextIcon className="mx-auto h-16 w-16 text-slate-300" />
                            <p className="mt-2 text-sm font-semibold text-slate-500">AI-Generated Preview</p>
                            <p className="mt-1 text-xs text-slate-400">Your unit lessons will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-slate-900/10">
                {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                <Button className="bg-white/60 text-slate-700 border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveLesson} loading={saving} disabled={saving || previewLessons.length === 0 || isProcessing} className="font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg hover:shadow-indigo-500/40 transition-shadow rounded-xl">
                    {saving ? 'Saving...' : `Save ${previewLessons.length} Lesson(s)`}
                </Button>
            </div>
        </div>
    );
}

const StrictModeDroppable = ({ children, ...props }) => {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => cancelAnimationFrame(animation);
    }, []);
    if (!enabled) return null;
    return <Droppable {...props}>{children}</Droppable>;
};

const PageTypeIcon = ({ type, isActive }) => {
    const iconClass = `h-5 w-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`;
    switch (type) {
        case 'diagram-data': return <PhotoIcon className={iconClass} />;
        case 'video': return <VideoCameraIcon className={iconClass} />;
        case 'text': default: return <BookOpenIcon className={iconClass} />;
    }
};

const MarkdownEditor = ({ value, onValueChange }) => {
    const textareaRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const TEXT_COLORS = [
        { name: 'Blue', hex: '#3B82F6' },
        { name: 'Green', hex: '#22C55E' },
        { name: 'Orange', hex: '#F97316' },
        { name: 'Red', hex: '#EF4444' },
        { name: 'Slate', hex: '#475569' },
    ];

    const adjustHeight = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    };

    useEffect(() => {
        adjustHeight();
        window.addEventListener('resize', adjustHeight);
        return () => window.removeEventListener('resize', adjustHeight);
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [value]);

    const applyStyle = (startTag, endTag = '', isBlock = false) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);

        let newText;
        let cursorPos;
        if (isBlock) {
            newText = `${text.substring(0, start)}${startTag}${selectedText || 'Type here...'}${endTag}${text.substring(end)}`;
            cursorPos = start + startTag.length + (selectedText ? selectedText.length : 'Type here...'.length);
        } else {
            newText = `${text.substring(0, start)}${startTag}${selectedText}${endTag}${text.substring(end)}`;
            cursorPos = start + startTag.length + selectedText.length;
        }

        onValueChange && onValueChange(newText);
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            if (isBlock && !selectedText) {
                ta.selectionStart = start + startTag.length;
                ta.selectionEnd = cursorPos;
            } else {
                ta.selectionStart = ta.selectionEnd = cursorPos;
            }
        }, 0);
    };

    const applyColor = (hex) => {
        applyStyle(`<span style="color: ${hex};">`, `</span>`);
        setShowColorPicker(false);
    };

    const applyBlockQuote = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        let selectedText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (!selectedText) selectedText = "Quoted text";
        const blockTextContent = selectedText.split('\n').map(line => `> ${line}`).join('\n');
        applyStyle(`\n${blockTextContent}\n`, '', true);
    };
    
    const applyMarkdown = (syntax) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selectedText = text.substring(start, end);
        let newText, cursorPos;

        switch (syntax) {
            case 'bold':
                newText = `${text.substring(0, start)}<strong>${selectedText}</strong>${text.substring(end)}`;
                cursorPos = start + `<strong>`.length + selectedText.length;
                break;
            case 'italic':
                newText = `${text.substring(0, start)}<em>${selectedText}</em>${text.substring(end)}`;
                cursorPos = start + `<em>`.length + selectedText.length;
                break;
            case 'list':
                const lines = selectedText ? selectedText.split('\n').map(l => `- ${l}`) : ['- '];
                newText = `${text.substring(0, start)}${lines.join('\n')}${text.substring(end)}`;
                cursorPos = start + lines.join('\n').length;
                break;
            case 'code':
                newText = `${text.substring(0, start)}\`${selectedText}\`${text.substring(end)}`;
                cursorPos = start + 1 + selectedText.length + 1;
                break;
            case 'link':
                newText = `${text.substring(0, start)}[${selectedText}](url)${text.substring(end)}`;
                cursorPos = start + 1 + selectedText.length + 1 + 3;
                break;
            case 'h1':
                newText = `${text.substring(0, start)}# ${selectedText}${text.substring(end)}`;
                cursorPos = start + 2;
                break;
            case 'h2':
                newText = `${text.substring(0, start)}## ${selectedText}${text.substring(end)}`;
                cursorPos = start + 3;
                break;
            case 'h3':
                newText = `${text.substring(0, start)}### ${selectedText}${text.substring(end)}`;
                cursorPos = start + 4;
                break;
            default:
                return;
        }

        onValueChange && onValueChange(newText);
        setTimeout(() => {
            adjustHeight();
            ta.focus();
            ta.selectionStart = ta.selectionEnd = cursorPos;
        }, 0);
    };

    const ToolbarButton = ({ icon, syntax, tooltip, onClick }) => (
        <Button size="xs" variant="light" icon={icon} onClick={onClick || (() => applyMarkdown(syntax))} tooltip={tooltip} className="p-2 rounded-lg" />
    );

    return (
        <div className="border border-slate-300/80 rounded-xl overflow-hidden flex flex-col h-full bg-white/80 min-h-0">
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-slate-300/80 bg-slate-100/80">
                <ToolbarButton icon={BoldIcon} syntax="bold" tooltip="Bold" />
                <ToolbarButton icon={ItalicIcon} syntax="italic" tooltip="Italic" />
                <ToolbarButton icon={QueueListIcon} syntax="list" tooltip="Bulleted List" />
                <ToolbarButton icon={CodeBracketIcon} syntax="code" tooltip="Inline Code" />
                <ToolbarButton icon={LinkIcon} syntax="link" tooltip="Link" />
                <div className="w-px h-6 bg-slate-300/80 mx-1"></div>
                <div className="relative">
                    <ToolbarButton icon={PaintBrushIcon} tooltip="Text Color" onClick={() => setShowColorPicker(s => !s)} />
                    {showColorPicker && (
                        <div onMouseLeave={() => setShowColorPicker(false)} className="absolute top-full mt-2 z-10 bg-white p-2 rounded-lg shadow-xl border border-slate-200 flex gap-2">
                            {TEXT_COLORS.map(color => (
                                <button key={color.name} title={color.name} onClick={() => applyColor(color.hex)} className="w-6 h-6 rounded-full" style={{ backgroundColor: color.hex }} />
                            ))}
                        </div>
                    )}
                </div>
                <ToolbarButton icon={ChatBubbleLeftRightIcon} tooltip="Block Quote" onClick={applyBlockQuote} />
                <div className="w-px h-6 bg-slate-300/80 mx-1"></div>
                <ToolbarButton icon={H1Icon} syntax="h1" tooltip="Heading 1" />
                <ToolbarButton icon={H2Icon} syntax="h2" tooltip="Heading 2" />
                <ToolbarButton icon={H3Icon} syntax="h3" tooltip="Heading 3" />
            </div>
            <div className="p-4 min-h-0">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onValueChange && onValueChange(e.target.value)}
                    className="w-full p-2 font-mono text-sm resize-none border-none focus:outline-none focus:ring-0 bg-transparent overflow-hidden"
                    placeholder="Type your markdown content here..."
                    style={{ lineHeight: '1.5', whiteSpace: 'pre-wrap' }}
                />
            </div>
        </div>
    );
};

function ManualLessonCreator({ onClose, onBack, unitId, subjectId }) {
    const [title, setTitle] = useState('');
    const [studyGuideUrl, setStudyGuideUrl] = useState('');
    const [pages, setPages] = useState([{ id: `page-${Date.now()}`, title: 'Page 1', content: '', type: 'text' }]);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePageChange = (field, value) => {
        const newPages = [...pages];
        let pageData = { ...newPages[activePageIndex] };

        if (field === 'type') {
            pageData.type = value;
            pageData.content = value === 'diagram-data' ? { labels: [], imageUrls: [] } : '';
        } else if (pageData.type === 'diagram-data') {
            let newContent = { ...(pageData.content || { labels: [], imageUrls: [] }) };
            if (field === 'diagram_labels') {
                newContent.labels = value.split(',').map(label => label.trim());
            } else if (field === 'imageUrls') {
                newContent.imageUrls = value;
            }
            pageData.content = newContent;
        } else {
            pageData[field] = value;
        }
        newPages[activePageIndex] = pageData;
        setPages(newPages);
    };

    const addPage = () => {
        const newPage = { id: `page-${Date.now()}`, title: `Page ${pages.length + 1}`, content: '', type: 'text' };
        setPages([...pages, newPage]);
        setActivePageIndex(pages.length);
    };

    const removePage = (index) => {
        if (pages.length <= 1) return;
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
        setActivePageIndex(prev => Math.max(0, Math.min(prev, newPages.length - 1)));
    };

    const handleOnDragEnd = (result) => {
        if (!result.destination) return;
        const items = reorder(pages, result.source.index, result.destination.index);
        setPages(items);
        setActivePageIndex(result.destination.index);
    };

    const handleAddLesson = async () => {
        if (!title.trim()) { setError('Lesson title cannot be empty.'); return; }
        setLoading(true);
        setError('');
        try {
            const pagesToSave = pages.map(({ id, ...page }) => {
                const cleanPage = { ...page };
                if (cleanPage.type === "diagram-data") {
                    cleanPage.content = {
                        labels: (cleanPage.content?.labels || []).filter(Boolean), 
                        imageUrls: cleanPage.content?.imageUrls || []
                    };
                } else {
                    cleanPage.content = cleanPage.content || '';
                }
                return cleanPage;
            });

            await addDoc(collection(db, 'lessons'), { title, unitId, subjectId, studyGuideUrl, pages: pagesToSave, createdAt: serverTimestamp() });
            onClose();
        } catch (err) {
            console.error("Error adding lesson:", err);
            setError("Failed to save the lesson.");
        } finally {
            setLoading(false);
        }
    };

    const activePage = pages[activePageIndex] || { id: '', title: '', content: '', type: 'text' };
    const pageTypeIndex = ['text', 'diagram-data', 'video'].indexOf(activePage.type);

    return (
        <>
            <div className="flex-shrink-0 pb-4 border-b border-slate-900/10">
                <div className="flex justify-between items-center mb-4">
                    <Title className="text-2xl font-bold text-slate-800">Create Lesson</Title>
                    <Button variant="light" icon={ArrowUturnLeftIcon} onClick={onBack} className="rounded-xl">Back</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput placeholder="Lesson Title, e.g., 'Introduction to Cells'" value={title} onValueChange={setTitle} className="rounded-xl"/>
                    <TextInput placeholder="Study Guide URL (Optional)" value={studyGuideUrl} onValueChange={setStudyGuideUrl} className="rounded-xl"/>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-12 gap-6 pt-4 min-h-0">
                <div className="col-span-4 lg:col-span-3 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-700 mb-3 px-1">Pages</h3>
                    <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                        <DragDropContext onDragEnd={handleOnDragEnd}>
                            <StrictModeDroppable droppableId="pages">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                        {pages.map((page, index) => (
                                            <Draggable key={page.id} draggableId={String(page.id)} index={index}>
                                                {(provided, snapshot) => {
                                                    const isActive = activePageIndex === index;
                                                    return (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setActivePageIndex(index)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${isActive ? 'bg-white shadow-lg ring-2 ring-indigo-500/50' : 'bg-white/60 hover:bg-white/90 hover:shadow-md'} ${snapshot.isDragging ? 'shadow-2xl' : ''}`}>
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <Bars3Icon className="h-5 w-5 text-slate-400 flex-shrink-0"/>
                                                                <PageTypeIcon type={page.type} isActive={isActive} />
                                                                <span className="font-medium text-slate-800 truncate">{page.title || `Page ${index + 1}`}</span>
                                                            </div>
                                                            <Button icon={TrashIcon} variant="light" color="red" size="xs" onClick={(e) => { e.stopPropagation(); removePage(index); }} disabled={pages.length === 1} tooltip="Remove page" className="rounded-full"/>
                                                        </div>
                                                    );
                                                }}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </StrictModeDroppable>
                        </DragDropContext>
                    </div>
                    <div className="mt-4 flex-shrink-0 pr-2">
                        <Button icon={PlusCircleIcon} className="w-full justify-center bg-white/60 text-slate-700 border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={addPage}>Add New Page</Button>
                    </div>
                </div>

                <div className="col-span-8 lg:col-span-9 flex flex-col min-h-0 pl-6 border-l border-slate-900/10">
                    <h4 className="text-base font-semibold text-slate-700 mb-3">Editing: <span className="text-indigo-600">{activePage.title || `Page ${activePageIndex + 1}`}</span></h4>
                    
                    <div className="flex-grow min-h-0 overflow-auto">
                        <div className="space-y-4 flex flex-col p-1 min-h-0">
                            <TextInput placeholder="Page Title" value={activePage.title} onValueChange={(val) => handlePageChange('title', val)} className="rounded-xl"/>
                            
                            <TabGroup index={pageTypeIndex > -1 ? pageTypeIndex : 0} onIndexChange={(index) => handlePageChange('type', ['text', 'diagram-data', 'video'][index])}>
                                <TabList className="p-1 bg-slate-200/60 rounded-xl w-fit">
                                    <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Text</Tab>
                                    <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Image</Tab>
                                    <Tab className="ui-selected:bg-white ui-selected:text-slate-800 ui-selected:shadow-md text-slate-600 rounded-lg px-4 py-1.5 text-sm font-semibold outline-none">Video</Tab>
                                </TabList>
                                <TabPanels className="pt-4 flex flex-col min-h-0">
                                    <TabPanel className="flex flex-col min-h-0">
                                        <div className="flex flex-col xl:flex-row gap-4 min-h-0">
                                            <div className="flex-1 min-h-0">
                                                <MarkdownEditor
                                                    value={typeof activePage.content === 'string' ? activePage.content : ''}
                                                    onValueChange={(val) => handlePageChange('content', val)}
                                                />
                                            </div>
                                            <div className="flex-1 min-h-0">
                                                <div className="w-full h-full border border-slate-300/80 rounded-xl bg-white/80 p-6 prose max-w-none prose-slate">
                                                    <ContentRenderer text={typeof activePage.content === 'string' ? activePage.content : ''} />
                                                </div>
                                            </div>
                                        </div>
                                    </TabPanel>
                                    <TabPanel>
                                        <div className="space-y-4 p-4 bg-white/80 rounded-xl border border-slate-300/80">
                                            <div className="space-y-2">
                                                {Array.isArray(activePage.content?.imageUrls) && activePage.content.imageUrls.map((url, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <TextInput placeholder={`Image URL #${idx + 1}`} value={url} onValueChange={(val) => { const newUrls = [...activePage.content.imageUrls]; newUrls[idx] = val; handlePageChange('imageUrls', newUrls); }} className="flex-1 rounded-xl"/>
                                                        <Button variant="light" color="red" icon={TrashIcon} onClick={() => { const newUrls = activePage.content.imageUrls.filter((_, i) => i !== idx); handlePageChange('imageUrls', newUrls); }} className="rounded-full"/>
                                                    </div>
                                                ))}
                                                <Button icon={PlusCircleIcon} className="bg-white/60 text-slate-700 border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={() => handlePageChange('imageUrls', [...(activePage.content?.imageUrls || []), ''])}>Add Image URL</Button>
                                            </div>
                                            <TextInput placeholder="Labels (comma-separated)" value={Array.isArray(activePage.content?.labels) ? activePage.content.labels.join(', ') : ''} onValueChange={(val) => handlePageChange('diagram_labels', val)} className="rounded-xl"/>
                                        </div>
                                    </TabPanel>
                                    <TabPanel>
                                        <div className="p-4 bg-white/80 rounded-xl border border-slate-300/80">
                                          <TextInput placeholder="Video URL (YouTube, Vimeo, etc.)" value={typeof activePage.content === 'string' ? activePage.content : ''} onValueChange={(val) => handlePageChange('content', val)} className="rounded-xl"/>
                                        </div>
                                    </TabPanel>
                                </TabPanels>
                            </TabGroup>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-slate-900/10">
                {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                <Button className="bg-white/60 text-slate-700 border-slate-300/70 hover:bg-white/90 hover:border-slate-400 rounded-xl" onClick={onClose}>Cancel</Button>
                <Button className="font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg hover:shadow-indigo-500/40 transition-shadow rounded-xl" onClick={handleAddLesson} loading={loading}>Save Lesson</Button>
            </div>
        </>
    );
}

export default function AddLessonModal({ isOpen, onClose, unitId, subjectId }) {
    const [creationMode, setCreationMode] = useState(null);

    const handleClose = useCallback(() => {
        setCreationMode(null);
        onClose();
    }, [onClose]);

    const getPanelClassName = () => {
        switch (creationMode) {
            case 'ai': return "w-screen h-screen max-w-full max-h-screen md:max-w-6xl md:max-h-[90vh] md:rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col";
            case 'manual': return "w-screen h-screen max-w-full max-h-screen rounded-none bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col";
            default: return "w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl";
        }
    };

    const renderContent = () => {
        switch (creationMode) {
            case 'ai': return <AiLessonGenerator onClose={handleClose} onBack={() => setCreationMode(null)} unitId={unitId} subjectId={subjectId} />;
            case 'manual': return <ManualLessonCreator onClose={handleClose} onBack={() => setCreationMode(null)} unitId={unitId} subjectId={subjectId} />;
            default: return <ModeSelection onSelect={setCreationMode} />;
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} static={true} className="z-50">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-0 md:p-4">
                <DialogPanel className={getPanelClassName()}>
                    {renderContent()}
                </DialogPanel>
            </div>
        </Dialog>
    );
}