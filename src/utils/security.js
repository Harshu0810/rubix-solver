/**
 * Security & Sanitization Utilities
 * 
 * Protects against Cross-Site Scripting (XSS) and injection vulnerabilities
 * when rendering dynamic user data into the DOM.
 */

/**
 * Escapes unsafe HTML characters in a string to prevent DOM/XSS injection.
 * @param {string|any} str 
 * @returns {string} Sanitized string safe for template literals / innerHTML
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes and bounds user input text (stripping control characters and limiting length).
 * @param {string} input 
 * @param {number} maxLength 
 * @returns {string}
 */
export function sanitizeInputText(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';
  // Trim and clamp to maxLength
  const clamped = input.trim().slice(0, maxLength);
  // Remove dangerous control characters while preserving line breaks (\n)
  return clamped.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
