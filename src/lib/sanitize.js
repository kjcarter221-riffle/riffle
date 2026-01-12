// Simple HTML sanitization to prevent XSS attacks
// For production, consider using DOMPurify on the client side as well

/**
 * Strip HTML tags and encode special characters
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeText(input) {
  if (!input || typeof input !== 'string') return input;

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Encode HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Remove null bytes
    .replace(/\0/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize object fields
 * @param {object} obj - Object with string fields to sanitize
 * @param {string[]} fields - Field names to sanitize
 * @returns {object} - Object with sanitized fields
 */
export function sanitizeFields(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = sanitizeText(result[field]);
    }
  }
  return result;
}

/**
 * Validate and sanitize latitude/longitude
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {{ lat: number|null, lon: number|null }}
 */
export function sanitizeCoordinates(lat, lon) {
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  return {
    lat: !isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90 ? parsedLat : null,
    lon: !isNaN(parsedLon) && parsedLon >= -180 && parsedLon <= 180 ? parsedLon : null
  };
}

/**
 * Validate and sanitize a positive integer
 * @param {any} value - Value to validate
 * @param {number} max - Maximum allowed value
 * @returns {number|null}
 */
export function sanitizePositiveInt(value, max = Number.MAX_SAFE_INTEGER) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > max) return null;
  return parsed;
}
