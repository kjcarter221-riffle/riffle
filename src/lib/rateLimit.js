// Simple in-memory rate limiter for serverless
// Note: This resets on cold starts. For production scale, use Redis/Upstash.

const rateLimitMap = new Map();

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.timestamp > data.windowMs) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit check
 * @param {string} identifier - IP address or user ID
 * @param {object} options - { maxRequests, windowMs }
 * @returns {{ success: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(identifier, options = {}) {
  const { maxRequests = 100, windowMs = 60 * 60 * 1000 } = options; // Default: 100 req/hour

  const now = Date.now();
  const key = identifier;
  const data = rateLimitMap.get(key);

  if (!data || now - data.timestamp > windowMs) {
    // New window
    rateLimitMap.set(key, { count: 1, timestamp: now, windowMs });
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (data.count >= maxRequests) {
    const resetIn = windowMs - (now - data.timestamp);
    return { success: false, remaining: 0, resetIn };
  }

  data.count++;
  return { success: true, remaining: maxRequests - data.count, resetIn: windowMs - (now - data.timestamp) };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// Preset configurations
export const RATE_LIMITS = {
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },      // 10 req / 15 min
  chat: { maxRequests: 50, windowMs: 60 * 60 * 1000 },      // 50 req / hour
  api: { maxRequests: 100, windowMs: 60 * 60 * 1000 },      // 100 req / hour
  strict: { maxRequests: 5, windowMs: 60 * 1000 }           // 5 req / min
};
