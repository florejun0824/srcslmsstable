// src/components/teacher/sanitizeLessonText.js

export const sanitizeLessonsJson = (aiResponse, { lenient = true, debug = false } = {}) => {
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