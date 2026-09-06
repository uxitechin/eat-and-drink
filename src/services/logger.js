// Production-safe structured error logger for EAT & DRINK POS
export const APP_VERSION = '2026.09.1';

/**
 * Sanitizes an object or string to remove any sensitive credentials before logging.
 */
function sanitize(data) {
  if (!data) return data;
  if (typeof data === 'string') {
    return data.replace(/(eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/g, '[REDACTED_JWT]')
      .replace(/(apikey|secret|password|token)=([^&\s]+)/gi, '$1=[REDACTED]');
  }
  if (typeof data === 'object') {
    try {
      const sanitized = Array.isArray(data) ? [] : {};
      for (const [k, v] of Object.entries(data)) {
        if (/key|secret|password|auth|token/i.test(k)) {
          sanitized[k] = '[REDACTED]';
        } else if (typeof v === 'object' && v !== null) {
          sanitized[k] = sanitize(v);
        } else if (typeof v === 'string') {
          sanitized[k] = sanitize(v);
        } else {
          sanitized[k] = v;
        }
      }
      return sanitized;
    } catch {
      return '[Unserializable Data]';
    }
  }
  return data;
}

export const logger = {
  info: (context, message, details = null) => {
    console.log(`[EAT&DRINK ${APP_VERSION}] [INFO] [${context}] ${message}`, details ? sanitize(details) : '');
  },

  warn: (context, message, details = null) => {
    console.warn(`[EAT&DRINK ${APP_VERSION}] [WARN] [${context}] ${message}`, details ? sanitize(details) : '');
  },

  error: (context, message, error = null) => {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      context,
      message,
      errorMessage: error?.message || (typeof error === 'string' ? error : 'Unknown error'),
      stack: error?.stack || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
    console.error(`[EAT&DRINK ${APP_VERSION}] [ERROR] [${context}] ${message}`, sanitize(errorRecord));
  }
};
