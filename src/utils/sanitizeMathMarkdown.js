// src/utils/sanitizeMathMarkdown.js

export const sanitizeMathMarkdown = (text) => {
  if (typeof text !== 'string') {
    return text;
  }

  // A safer function that primarily handles backslash escaping for LaTeX
  // without aggressively removing whitespace.
  return text.replace(/\\/g, '\\\\');
};