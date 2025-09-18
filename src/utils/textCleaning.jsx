// src/utils/textCleaning.js

/**
 * Cleans text by removing HTML tags and trimming whitespace.
 */
export const cleanTextInput = (text) => {
  if (typeof text !== 'string') {
    return '';
  }
  // This simple regex removes any HTML tags (e.g., <p>, <div>)
  const withoutHtml = text.replace(/<[^>]*>/g, '');

  return withoutHtml.trim();
};